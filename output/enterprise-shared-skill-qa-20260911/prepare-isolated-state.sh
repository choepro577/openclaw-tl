#!/usr/bin/env bash
set -euo pipefail

# Build a private OpenClaw state for the shared-agent acceptance lane. This
# script never writes to the operator state directory. SQLite files are copied
# through SQLite's backup API so a live WAL is read consistently. Do not add
# credentials, .env files, or live logs to this fixture.

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
readonly REPO_ROOT_DEFAULT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"

source_state="${OPENCLAW_SOURCE_STATE_DIR:-${HOME}/.openclaw}"
repo_root="${OPENCLAW_QA_REPO:-$REPO_ROOT_DEFAULT}"
port="${OPENCLAW_QA_PORT:-18889}"
target_dir=""

usage() {
  cat >&2 <<'EOF'
Usage: prepare-isolated-state.sh [options]

Options:
  --source-state DIR  Read-only source OpenClaw state (default: ~/.openclaw)
  --repo DIR          OpenClaw repository containing dist/ (default: repo root)
  --port PORT         Private gateway port (default: 18889; 18789 is refused)
  --target DIR        Empty target directory instead of a temporary directory
  -h, --help          Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-state)
      source_state="${2:?missing value for --source-state}"
      shift 2
      ;;
    --repo)
      repo_root="${2:?missing value for --repo}"
      shift 2
      ;;
    --port)
      port="${2:?missing value for --port}"
      shift 2
      ;;
    --target)
      target_dir="${2:?missing value for --target}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

source_state="$(cd -- "$source_state" && pwd)"
repo_root="$(cd -- "$repo_root" && pwd)"

if [[ ! "$port" =~ ^[0-9]+$ ]] || (( port < 1024 || port > 65535 )); then
  echo "invalid private gateway port: $port" >&2
  exit 2
fi
if [[ "$port" == "18789" ]]; then
  echo "refusing the operator gateway port 18789" >&2
  exit 2
fi
if [[ "$source_state" == "$repo_root" || "$source_state" == "$SCRIPT_DIR"* ]]; then
  echo "source state must be outside the repository output directory" >&2
  exit 2
fi
if [[ ! -f "$source_state/openclaw.json" ]]; then
  echo "missing source config: $source_state/openclaw.json" >&2
  exit 1
fi
if [[ ! -f "$source_state/state/openclaw.sqlite" ]]; then
  echo "missing source state database: $source_state/state/openclaw.sqlite" >&2
  exit 1
fi
if [[ ! -f "$repo_root/dist/index.js" ]]; then
  echo "missing built runtime: $repo_root/dist/index.js" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
  echo "prepare-isolated-state.sh requires jq and python3" >&2
  exit 1
fi

if [[ -n "$target_dir" ]]; then
  target_dir="$(mkdir -p -- "$target_dir" && cd -- "$target_dir" && pwd)"
  if [[ -n "$(find "$target_dir" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    echo "target directory must be empty: $target_dir" >&2
    exit 2
  fi
else
  target_dir="$(mktemp -d "${TMPDIR:-/tmp}/openclaw-shared-skill-qa.XXXXXX")"
fi
chmod 700 "$target_dir"
mkdir -p "$target_dir/state" "$target_dir/agents" "$target_dir/extensions"

backup_sqlite() {
  local source_db="$1"
  local target_db="$2"
  mkdir -p -- "$(dirname -- "$target_db")"
  python3 - "$source_db" "$target_db" <<'PY'
import os
import sqlite3
import sys

source, target = sys.argv[1:]
source_uri = "file:" + os.path.abspath(source).replace("%", "%25").replace("?", "%3f").replace("#", "%23") + "?mode=ro"
src = sqlite3.connect(source_uri, uri=True, timeout=10)
dst = sqlite3.connect(target, timeout=10)
try:
    src.backup(dst, pages=256, sleep=0.05)
finally:
    dst.close()
    src.close()
PY
}

backup_sqlite "$source_state/state/openclaw.sqlite" "$target_dir/state/openclaw.sqlite"

agent_db_count=0
while IFS= read -r -d '' source_db; do
  relative="${source_db#"$source_state/"}"
  backup_sqlite "$source_db" "$target_dir/$relative"
  agent_db_count=$((agent_db_count + 1))
done < <(find "$source_state/agents" -type f -name openclaw-agent.sqlite -print0)

# Copy only runtime inputs needed by this lane. In particular, do not copy
# .env, credentials, cache, locks, logs, media, or the source workspaces.
for directory in enterprise skills plugin-skills; do
  if [[ -d "$source_state/$directory" ]]; then
    cp -a -- "$source_state/$directory" "$target_dir/$directory"
  fi
done
if [[ -d "$source_state/extensions/diffs" ]]; then
  mkdir -p "$target_dir/extensions"
  cp -a -- "$source_state/extensions/diffs" "$target_dir/extensions/diffs"
fi

# Rewrite absolute state paths literally, then force a loopback port. split +
# join is used instead of a regex replacement so dots in the home path cannot
# match unrelated strings.
jq --arg old "$source_state" --arg new "$target_dir" --argjson privatePort "$port" '
  walk(if type == "string" then (split($old) | join($new)) else . end)
  | .gateway = ((.gateway // {}) + {mode: "local", bind: "loopback", port: $privatePort})
  | .logging = ((.logging // {}) + {level: "debug"})
' "$source_state/openclaw.json" > "$target_dir/openclaw.json"
chmod 600 "$target_dir/openclaw.json"

git_sha="$(git -C "$repo_root" rev-parse HEAD 2>/dev/null || printf '%s' unknown)"
buildstamp_json='{}'
if [[ -f "$repo_root/dist/.buildstamp" ]]; then
  buildstamp_json="$(jq -c '.' "$repo_root/dist/.buildstamp" 2>/dev/null || printf '%s' '{}')"
fi
config_sha="$(shasum -a 256 "$target_dir/openclaw.json" | awk '{print $1}')"
created_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

jq -n \
  --arg createdAt "$created_at" \
  --arg sourceStateBasename "$(basename "$source_state")" \
  --arg targetState "$target_dir" \
  --arg repo "$repo_root" \
  --arg port "$port" \
  --arg gitSha "$git_sha" \
  --arg configSha "$config_sha" \
  --argjson buildstamp "$buildstamp_json" \
  --argjson agentDbCount "$agent_db_count" \
  '{createdAt:$createdAt,sourceStateBasename:$sourceStateBasename,targetState:$targetState,repo:$repo,port:($port|tonumber),gitSha:$gitSha,configSha256:$configSha,buildstamp:$buildstamp,agentDbCount:$agentDbCount,copied:{stateSqlite:true,agentSqlites:true,enterprise:true,skills:true,pluginSkills:true,diffsExtension:true},excluded:[".env","credentials","cache","locks","logs","media","workspaces"]}' \
  > "$target_dir/qa-manifest.json"
chmod 600 "$target_dir/qa-manifest.json"

cat > "$target_dir/qa-env.sh" <<EOF
# Generated by prepare-isolated-state.sh. Contains paths only; source secrets
# and source .env files are intentionally not copied.
export OPENCLAW_STATE_DIR=$(printf '%q' "$target_dir")
export OPENCLAW_CONFIG_PATH=$(printf '%q' "$target_dir/openclaw.json")
export OPENCLAW_QA_STATE=$(printf '%q' "$target_dir")
export OPENCLAW_QA_REPO=$(printf '%q' "$repo_root")
export OPENCLAW_QA_PORT=$(printf '%q' "$port")
export OPENCLAW_QA_GATEWAY_LOG=$(printf '%q' "$target_dir/gateway.log")
export OPENCLAW_QA_PID_FILE=$(printf '%q' "$target_dir/gateway.pid")
export OPENCLAW_QA_ARTIFACT_DIR=$(printf '%q' "$SCRIPT_DIR")
EOF
chmod 600 "$target_dir/qa-env.sh"

printf 'isolated_state=%s\n' "$target_dir"
printf 'env_file=%s\n' "$target_dir/qa-env.sh"
printf 'gateway_port=%s\n' "$port"
printf 'agent_sqlite_backups=%s\n' "$agent_db_count"
printf 'manifest=%s\n' "$target_dir/qa-manifest.json"
