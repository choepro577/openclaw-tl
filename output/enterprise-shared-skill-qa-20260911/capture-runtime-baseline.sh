#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
env_file="${1:-}"
label="${2:-baseline-current-dist}"
agent="${3:-purchase-order-skill}"
if [[ -z "$env_file" || ! -f "$env_file" ]]; then
  echo "usage: capture-runtime-baseline.sh /tmp/.../qa-env.sh [label] [agent]" >&2
  exit 2
fi
# shellcheck disable=SC1090
source "$env_file"

mkdir -p "$OPENCLAW_QA_ARTIFACT_DIR/runtime-baseline"
export OPENCLAW_QA_LABEL="$label"
export OPENCLAW_QA_AGENT="$agent"
export OPENCLAW_QA_OUTPUT="$OPENCLAW_QA_ARTIFACT_DIR/runtime-baseline/${label}.json"

python3 - <<'PY'
import hashlib
import json
import os
import sqlite3
import subprocess
from datetime import datetime, timezone
from pathlib import Path

state = Path(os.path.normpath(os.environ["OPENCLAW_QA_STATE"]))
repo = Path(os.path.normpath(os.environ["OPENCLAW_QA_REPO"]))
config = Path(os.path.normpath(os.environ["OPENCLAW_CONFIG_PATH"]))
agent = os.environ["OPENCLAW_QA_AGENT"]
label = os.environ["OPENCLAW_QA_LABEL"]
output = Path(os.environ["OPENCLAW_QA_OUTPUT"])

def classify_text(text):
    lowered = text.lower()
    for marker, name in [
        ("unauthorized", "UNAUTHORIZED"),
        ("forbidden", "FORBIDDEN"),
        ("not found", "NOT_FOUND"),
        ("config", "CONFIG_ERROR"),
        ("sqlite", "SQLITE_ERROR"),
    ]:
        if marker in lowered:
            return name
    return "COMMAND_ERROR"

def run_cli(args):
    env = os.environ.copy()
    env["OPENCLAW_STATE_DIR"] = str(state)
    env["OPENCLAW_CONFIG_PATH"] = str(config)
    result = subprocess.run(
        ["node", str(repo / "dist/index.js"), *args],
        cwd=repo,
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        stderr = result.stderr.strip().splitlines()
        tail = stderr[-1] if stderr else ""
        return {"ok": False, "exit": result.returncode, "stderrClass": classify_text(tail)}
    try:
        return {"ok": True, "json": json.loads(result.stdout)}
    except Exception:
        return {"ok": False, "exit": 0, "stdoutClass": "NON_JSON"}

def summarize_agents(value):
    if not isinstance(value, dict):
        return {"type": type(value).__name__}
    rows = value.get("agents")
    if not isinstance(rows, list):
        return {"keys": sorted(value.keys())}
    return {
        "count": len(rows),
        "agents": [
            {
                key: row.get(key)
                for key in ("id", "name", "identityName", "configured")
                if isinstance(row, dict)
                and key in row
                and isinstance(row.get(key), (str, bool, int, type(None)))
            }
            for row in rows
            if isinstance(row, dict)
        ],
    }

def summarize_skills(value):
    rows = value.get("skills") if isinstance(value, dict) else value
    if not isinstance(rows, list):
        return {
            "type": type(value).__name__,
            "keys": sorted(value.keys()) if isinstance(value, dict) else [],
        }
    summary = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        safe = {}
        for key in (
            "name",
            "key",
            "eligible",
            "disabled",
            "blocked",
            "modelVisible",
            "commandVisible",
            "missingRequirements",
            "agentFiltered",
            "notInjected",
        ):
            if key in row and isinstance(
                row[key], (str, bool, int, float, type(None), list)
            ):
                safe[key] = row[key]
        summary.append(safe)
    return {"count": len(rows), "skills": summary}

def summarize_check(value):
    if not isinstance(value, dict):
        return {"type": type(value).__name__}
    safe = {}
    for key, item in value.items():
        key_lower = key.lower()
        if isinstance(item, (bool, int, float, str)) and not any(
            marker in key_lower
            for marker in ("path", "workspace", "directory", "source", "description")
        ):
            safe[key] = item
    for key in ("summary", "counts", "totals"):
        if isinstance(value.get(key), dict):
            safe[key] = {
                k: v
                for k, v in value[key].items()
                if isinstance(v, (bool, int, float, str))
            }
    return safe

def query_counts():
    db = state / "state" / "openclaw.sqlite"
    if not db.exists():
        return {"available": False}
    conn = sqlite3.connect(str(db), timeout=30)
    conn.execute("pragma busy_timeout = 30000")
    conn.execute("pragma query_only = on")
    errors = {}
    try:
        def scalar(sql):
            try:
                return conn.execute(sql).fetchone()[0]
            except sqlite3.Error as error:
                errors[sql.split()[3] if len(sql.split()) > 3 else "query"] = (
                    type(error).__name__ + ":" + str(error).split(":")[0]
                )
                return None
        counts = {
            "available": True,
            "enterpriseAccountPluginGrants": scalar(
                "select count(*) from enterprise_account_plugin_grants where state = 'active'"
            ),
            "enterpriseCodexPluginGrants": scalar(
                "select count(*) from enterprise_codex_plugin_grants where state = 'active'"
            ),
            "enterpriseEntitlements": scalar(
                "select count(*) from enterprise_entitlements where resource_state = 'active' and effect = 'allow'"
            ),
            "delegationTaskRuns": scalar("select count(*) from task_runs"),
            "subagentRuns": scalar("select count(*) from subagent_runs"),
        }
        if errors:
            counts["queryErrors"] = errors
        return counts
    finally:
        conn.close()

def file_sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()

with config.open(encoding="utf-8") as handle:
    config_json = json.load(handle)
entries = config_json.get("agents", {}).get("entries", {})
entry = entries.get(agent, {}) if isinstance(entries, dict) else {}
tools = entry.get("tools", {}) if isinstance(entry, dict) else {}

agents_result = run_cli(["agents", "list", "--json"])
skills_result = run_cli(["skills", "list", "--agent", agent, "--json"])
check_result = run_cli(["skills", "check", "--agent", agent, "--json"])

git_result = subprocess.run(
    ["git", "-C", str(repo), "rev-parse", "HEAD"],
    capture_output=True,
    text=True,
)
buildstamp_path = repo / "dist/.buildstamp"
buildstamp = None
if buildstamp_path.exists():
    try:
        buildstamp = json.loads(buildstamp_path.read_text(encoding="utf-8"))
    except Exception:
        buildstamp = {"parseError": True}

def package_version(path):
    try:
        value = json.loads(path.read_text(encoding="utf-8")).get("version")
        return value if isinstance(value, str) else None
    except Exception:
        return None

codex_cli_result = subprocess.run(
    ["codex", "--version"], capture_output=True, text=True
)
codex_cli_version = codex_cli_result.stdout.strip().splitlines()[0] if codex_cli_result.stdout.strip() else None
codex_pkg = package_version(repo / "node_modules/@openai/codex/package.json")
extension_pkg = None
try:
    extension_json = json.loads((repo / "extensions/codex/package.json").read_text(encoding="utf-8"))
    dependency = extension_json.get("dependencies", {}).get("@openai/codex")
    extension_pkg = dependency if isinstance(dependency, str) else None
except Exception:
    pass

payload = {
    "capturedAt": datetime.now(timezone.utc).isoformat(),
    "label": label,
    "gateway": {"port": int(os.environ["OPENCLAW_QA_PORT"]), "stateRoot": str(state)},
    "runtime": {
        "gitSha": git_result.stdout.strip(),
        "buildstamp": buildstamp,
        "node": subprocess.run(
            ["node", "--version"], capture_output=True, text=True
        ).stdout.strip(),
        "pnpm": subprocess.run(
            ["pnpm", "--version"], capture_output=True, text=True
        ).stdout.strip(),
        "codexCli": codex_cli_version,
        "bundledCodexPackage": codex_pkg,
        "codexExtensionDependency": extension_pkg,
        "configSha256": file_sha(config),
    },
    "agentProjection": {
        "agent": agent,
        "configuredSkills": entry.get("skills")
        if isinstance(entry.get("skills"), list)
        else [],
        "toolsProfile": tools.get("profile") if isinstance(tools, dict) else None,
        "allowCount": len(tools.get("allow", []))
        if isinstance(tools, dict) and isinstance(tools.get("allow"), list)
        else 0,
        "alsoAllow": tools.get("alsoAllow", [])
        if isinstance(tools, dict) and isinstance(tools.get("alsoAllow"), list)
        else [],
        "denyCount": len(tools.get("deny", []))
        if isinstance(tools, dict) and isinstance(tools.get("deny"), list)
        else 0,
    },
    "catalogCommands": {
        "agentsList": summarize_agents(agents_result.get("json"))
        if agents_result.get("ok")
        else agents_result,
        "skillsList": summarize_skills(skills_result.get("json"))
        if skills_result.get("ok")
        else skills_result,
        "skillsCheck": summarize_check(check_result.get("json"))
        if check_result.get("ok")
        else check_result,
    },
    "databaseCounts": query_counts(),
    "limitations": [
        "skills list/check is the configured CLI catalog, not proof that a freshly spawned model session received the runtime tool manifest",
        "fresh direct and delegated session evidence must record the actual materialized catalog and tool calls",
    ],
}
output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"artifact": str(output), "agent": agent, "label": label}, ensure_ascii=False))
PY
