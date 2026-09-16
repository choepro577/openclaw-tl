#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-}"
agent_id="${2:-purchase-order-skill}"
session_id="${3:-}"
label="${4:-session-evidence}"
if [[ -z "$env_file" || ! -f "$env_file" || -z "$session_id" ]]; then
  echo "usage: capture-session-evidence.sh /tmp/.../qa-env.sh AGENT_ID SESSION_ID [label]" >&2
  exit 2
fi
# shellcheck disable=SC1090
source "$env_file"

mkdir -p "$OPENCLAW_QA_ARTIFACT_DIR/session-evidence"
export OPENCLAW_QA_SESSION_STATE="$OPENCLAW_QA_STATE"
export OPENCLAW_QA_SESSION_AGENT="$agent_id"
export OPENCLAW_QA_SESSION_ID="$session_id"
export OPENCLAW_QA_SESSION_LABEL="$label"
export OPENCLAW_QA_SESSION_OUTPUT="$OPENCLAW_QA_ARTIFACT_DIR/session-evidence/${label}.json"

python3 - <<'PY'
import json
import os
import re
import sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

state = Path(os.path.normpath(os.environ["OPENCLAW_QA_SESSION_STATE"]))
agent = os.environ["OPENCLAW_QA_SESSION_AGENT"]
session_id = os.environ["OPENCLAW_QA_SESSION_ID"]
label = os.environ["OPENCLAW_QA_SESSION_LABEL"]
output = Path(os.environ["OPENCLAW_QA_SESSION_OUTPUT"])
db = state / "agents" / agent / "agent" / "openclaw-agent.sqlite"
if not db.exists():
    raise SystemExit("agent SQLite is missing in the isolated state")

SAFE_NAME = re.compile(r"^[A-Za-z0-9_.:-]{1,160}$")
SAFE_CODE = re.compile(r"^[A-Z][A-Z0-9_:-]{2,96}$")

def safe_name(value):
    return value if isinstance(value, str) and SAFE_NAME.fullmatch(value) else None

def json_mapping(value):
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and len(value) <= 20000:
        text = value.strip()
        if text.startswith("{"):
            try:
                decoded = json.loads(text)
            except Exception:
                return None
            return decoded if isinstance(decoded, dict) else None
    return None

def collect_skill_operations(value, operations):
    """Keep only skill/entrypoint/operation; never serialize tool arguments."""
    if isinstance(value, dict):
        tool_name = safe_name(value.get("toolName") or value.get("name"))
        if tool_name == "skill_script":
            params = json_mapping(value.get("arguments"))
            if params is None:
                params = json_mapping(value.get("input"))
            if params is not None:
                skill = safe_name(params.get("skill"))
                entrypoint = safe_name(params.get("entrypoint"))
                operation = safe_name(params.get("operation"))
                if skill and entrypoint and operation:
                    operations.append({
                        "skill": skill,
                        "entrypoint": entrypoint,
                        "operation": operation,
                    })
        for child in value.values():
            collect_skill_operations(child, operations)
    elif isinstance(value, list):
        for child in value[:80]:
            collect_skill_operations(child, operations)

def collect_tool_parts(value, calls, results, errors, codes):
    if isinstance(value, dict):
        part_type = value.get("type")
        if part_type == "toolCall":
            name = safe_name(value.get("name"))
            if name:
                calls.append(name)
        elif part_type == "toolResult":
            name = safe_name(value.get("toolName") or value.get("name"))
            if name:
                results.append(name)
            if value.get("isError") is True:
                errors.append(name or "unknown")
            for field in ("details", "result", "content", "text"):
                if field in value:
                    collect_codes(value[field], codes)
        for key, child in value.items():
            if key in ("arguments", "input", "content", "details", "result", "data", "message"):
                collect_tool_parts(child, calls, results, errors, codes)
    elif isinstance(value, list):
        for child in value[:80]:
            collect_tool_parts(child, calls, results, errors, codes)

def collect_codes(value, codes):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in ("code", "errorCode") and isinstance(child, str) and SAFE_CODE.fullmatch(child):
                codes.append(child)
            elif key in ("details", "result", "content", "text", "data"):
                collect_codes(child, codes)
    elif isinstance(value, list):
        for child in value[:80]:
            collect_codes(child, codes)
    elif isinstance(value, str) and len(value) <= 20000:
        text = value.strip()
        if text.startswith("{") or text.startswith("["):
            try:
                collect_codes(json.loads(text), codes)
            except Exception:
                pass

def summary_counter(counter):
    return dict(sorted(counter.items()))

def extract_catalog(value):
    if not isinstance(value, dict):
        return {}
    data = value.get("data")
    if not isinstance(data, dict):
        return {}
    names = []
    raw_tools = data.get("tools")
    if isinstance(raw_tools, list):
        for tool in raw_tools:
            if isinstance(tool, dict):
                name = safe_name(tool.get("name"))
                if name:
                    names.append(name)
    return {
        "toolCount": data.get("toolCount") if isinstance(data.get("toolCount"), int) else len(names),
        "toolNames": sorted(set(names)),
        "modelId": data.get("modelId") if isinstance(data.get("modelId"), str) else None,
    }

conn = sqlite3.connect(str(db), timeout=30)
conn.execute("pragma busy_timeout = 30000")
conn.execute("pragma query_only = on")
try:
    transcript_rows = conn.execute(
        "select seq,event_json from transcript_events where session_id=? order by seq",
        (session_id,),
    ).fetchall()
    trajectory_rows = conn.execute(
        "select seq,run_id,event_json from trajectory_runtime_events where session_id=? order by seq",
        (session_id,),
    ).fetchall()
    run_ids = sorted({row[1] for row in trajectory_rows if isinstance(row[1], str) and row[1]})
finally:
    conn.close()

transcript_types = Counter()
tool_calls = []
tool_results = []
tool_errors = []
codes = []
transcript_skill_operations = []
for _, raw in transcript_rows:
    try:
        event = json.loads(raw)
    except Exception:
        continue
    if isinstance(event, dict):
        transcript_types[str(event.get("type"))] += 1
    collect_tool_parts(event, tool_calls, tool_results, tool_errors, codes)
    collect_skill_operations(event, transcript_skill_operations)

trajectory_types = Counter()
trajectory_tool_calls = []
trajectory_tool_results = []
trajectory_success = []
catalog = {}
runtime_codes = []
trajectory_skill_operations = []
session_key = None
model_id = None
for _, _, raw in trajectory_rows:
    try:
        event = json.loads(raw)
    except Exception:
        continue
    if not isinstance(event, dict):
        continue
    event_type = event.get("type")
    if isinstance(event_type, str):
        trajectory_types[event_type] += 1
    if isinstance(event.get("sessionKey"), str):
        session_key = event["sessionKey"]
    if event_type in ("session.started", "context.compiled"):
        candidate = extract_catalog(event)
        if candidate.get("toolNames"):
            catalog["toolNames"] = sorted(set(catalog.get("toolNames", []) + candidate["toolNames"]))
        if isinstance(candidate.get("toolCount"), int):
            catalog["toolCount"] = max(catalog.get("toolCount", 0), candidate["toolCount"])
        if candidate.get("modelId"):
            catalog["modelId"] = candidate["modelId"]
        model_id = catalog.get("modelId")
    collect_skill_operations(event, trajectory_skill_operations)
    data = event.get("data")
    if not isinstance(data, dict):
        continue
    name = safe_name(data.get("name"))
    if event_type == "tool.call" and name:
        trajectory_tool_calls.append(name)
    if event_type == "tool.result":
        if name:
            trajectory_tool_results.append(name)
        if isinstance(data.get("success"), bool):
            trajectory_success.append(data["success"])
        collect_codes(data, runtime_codes)

skill_operations = transcript_skill_operations or trajectory_skill_operations
task_summary = []
if run_ids:
    conn = sqlite3.connect(str(state / "state" / "openclaw.sqlite"), timeout=30)
    conn.execute("pragma busy_timeout = 30000")
    conn.execute("pragma query_only = on")
    try:
        placeholders = ",".join("?" for _ in run_ids)
        try:
            rows = conn.execute(
                f"select run_id,status,delivery_status,tool_use_count,last_tool_name,error from task_runs where run_id in ({placeholders})",
                run_ids,
            ).fetchall()
            for run_id, status, delivery, count, last_tool, error in rows:
                error_class = None
                if isinstance(error, str) and error:
                    error_class = "AUTHORIZATION" if any(
                        marker in error.lower()
                        for marker in ("forbidden", "unauthorized", "not allowed", "permission")
                    ) else "ERROR"
                task_summary.append({
                    "runId": run_id,
                    "status": status,
                    "deliveryStatus": delivery,
                    "toolUseCount": count,
                    "lastToolName": safe_name(last_tool),
                    "errorClass": error_class,
                })
        except sqlite3.Error:
            pass
    finally:
        conn.close()

payload = {
    "capturedAt": datetime.now(timezone.utc).isoformat(),
    "label": label,
    "agentId": agent,
    "sessionId": session_id,
    "sessionKey": session_key,
    "runIds": run_ids,
    "modelId": model_id,
    "materializedCatalog": catalog,
    "transcript": {
        "eventCount": len(transcript_rows),
        "eventTypes": summary_counter(transcript_types),
        "toolCalls": sorted(tool_calls),
        "toolResults": sorted(tool_results),
        "toolErrorCount": len(tool_errors),
        "codes": sorted(set(codes)),
    },
    "trajectory": {
        "eventCount": len(trajectory_rows),
        "eventTypes": summary_counter(trajectory_types),
        "toolCalls": sorted(trajectory_tool_calls),
        "toolResults": sorted(trajectory_tool_results),
        "toolResultSuccess": trajectory_success,
        "codes": sorted(set(runtime_codes)),
    },
    "taskRuns": task_summary,
    "skillOperations": skill_operations,
    "acceptanceSignals": {
        "hasMaterializedToolCatalog": bool(catalog.get("toolCount") or catalog.get("toolNames")),
        "hasToolCall": bool(trajectory_tool_calls or tool_calls),
        "hasSkillScriptCall": "skill_script" in trajectory_tool_calls or "skill_script" in tool_calls,
        "hasRouterCall": any(
            item.get("operation") == "router_tool_search"
            for item in skill_operations
        ) or "router_tool_search" in trajectory_tool_calls or "router_tool_search" in tool_calls,
        "hasAuthorizationError": any(code in {"SKILL_NOT_GRANTED", "SKILL_CAPABILITY_CHANGED", "SKILL_RUN_NOT_ADMITTED", "AUTH_REQUIRED"} for code in set(codes + runtime_codes)),
    },
}
output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"artifact": str(output), "sessionId": session_id, "toolCallCount": len(trajectory_tool_calls or tool_calls)}, ensure_ascii=False))
PY
