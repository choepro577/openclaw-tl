#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-}"
mode="${2:-background}"
if [[ -z "$env_file" || ! -f "$env_file" ]]; then
  echo "usage: start-isolated-gateway.sh /tmp/.../qa-env.sh [background|--foreground]" >&2
  exit 2
fi
# shellcheck disable=SC1090
source "$env_file"

# Optional: inherit the already-authorized runtime environment without copying
# secret values into the fixture or an artifact. The caller supplies this only
# when the provider requires a named source .env file.
if [[ -n "${OPENCLAW_QA_RUNTIME_ENV_FILE:-}" ]]; then
  if [[ ! -f "$OPENCLAW_QA_RUNTIME_ENV_FILE" ]]; then
    echo "runtime env file does not exist: $OPENCLAW_QA_RUNTIME_ENV_FILE" >&2
    exit 2
  fi
  set -a
  # shellcheck disable=SC1090
  source "$OPENCLAW_QA_RUNTIME_ENV_FILE"
  set +a
fi

if [[ "${OPENCLAW_QA_PORT:-}" == "18789" ]]; then
  echo "refusing the operator gateway port 18789" >&2
  exit 2
fi
if [[ ! "${OPENCLAW_QA_PORT:-}" =~ ^[0-9]+$ || ! -d "${OPENCLAW_QA_STATE:-}" ]]; then
  echo "invalid isolated gateway environment" >&2
  exit 2
fi
if [[ ! -f "$OPENCLAW_QA_REPO/dist/index.js" ]]; then
  echo "missing built runtime: $OPENCLAW_QA_REPO/dist/index.js" >&2
  exit 1
fi
if [[ -s "$OPENCLAW_QA_PID_FILE" ]]; then
  old_pid="$(cat "$OPENCLAW_QA_PID_FILE")"
  if [[ "$old_pid" =~ ^[0-9]+$ ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "isolated gateway already running: pid=$old_pid port=$OPENCLAW_QA_PORT"
    exit 0
  fi
fi
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$OPENCLAW_QA_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "private gateway port is already occupied: $OPENCLAW_QA_PORT" >&2
  exit 1
fi

cd "$OPENCLAW_QA_REPO"
if [[ "$mode" == "--foreground" || "$mode" == "foreground" ]]; then
  exec env \
    OPENCLAW_STATE_DIR="$OPENCLAW_QA_STATE" \
    OPENCLAW_CONFIG_PATH="$OPENCLAW_CONFIG_PATH" \
    node dist/index.js gateway --port "$OPENCLAW_QA_PORT" --bind loopback
fi
nohup env \
  OPENCLAW_STATE_DIR="$OPENCLAW_QA_STATE" \
  OPENCLAW_CONFIG_PATH="$OPENCLAW_CONFIG_PATH" \
  node dist/index.js gateway --port "$OPENCLAW_QA_PORT" --bind loopback \
  >"$OPENCLAW_QA_GATEWAY_LOG" 2>&1 < /dev/null &
gateway_pid=$!
disown "$gateway_pid" 2>/dev/null || true
printf '%s\n' "$gateway_pid" > "$OPENCLAW_QA_PID_FILE"
chmod 600 "$OPENCLAW_QA_PID_FILE" "$OPENCLAW_QA_GATEWAY_LOG"

node - "$OPENCLAW_QA_PORT" "$gateway_pid" <<'NODE'
const port = Number(process.argv[2]);
const pid = Number(process.argv[3]);
const deadline = Date.now() + 60_000;
while (Date.now() < deadline) {
  try {
    const response = await fetch('http://127.0.0.1:' + port + '/readyz', {
      signal: AbortSignal.timeout(1000),
    });
    if (response.ok) {
      const body = await response.json();
      if (body?.ready === true && (!Array.isArray(body.failing) || body.failing.length === 0)) {
        process.exit(0);
      }
    }
  } catch {}
  try {
    process.kill(pid, 0);
  } catch {
    process.exit(2);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
process.exit(3);
NODE
status=$?
if (( status != 0 )); then
  if kill -0 "$gateway_pid" 2>/dev/null; then
    kill "$gateway_pid" 2>/dev/null || true
  fi
  echo "isolated gateway did not become ready (status=$status); inspect $OPENCLAW_QA_GATEWAY_LOG" >&2
  exit 1
fi

printf 'isolated_gateway_pid=%s\n' "$gateway_pid"
printf 'isolated_gateway_url=http://127.0.0.1:%s\n' "$OPENCLAW_QA_PORT"
printf 'isolated_gateway_log=%s\n' "$OPENCLAW_QA_GATEWAY_LOG"
