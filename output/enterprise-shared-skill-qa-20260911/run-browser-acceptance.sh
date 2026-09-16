#!/usr/bin/env bash
set -euo pipefail

# Prepare a headed Playwright CLI session, trace, video, and first snapshot for
# the natural shared-agent prompt. The copied ordinary employee account is
# logged in automatically when the private password file is supplied; the
# operator gateway and administrator account are never used.

readonly QA_ROOT="$(cd -- "$(dirname -- "$0")" && pwd)"
readonly PW_ROOT="$(cd -- "$QA_ROOT/../playwright/enterprise-shared-skill-qa-20260911" && pwd)"
readonly CODEX_HOME_DEFAULT="${CODEX_HOME:-$HOME/.codex}"
readonly PWCLI="$CODEX_HOME_DEFAULT/skills/playwright/scripts/playwright_cli.sh"

base_url="${1:-http://127.0.0.1:18889}"
label="${2:-shared-po-direct}"
env_file="${3:-${OPENCLAW_QA_ENV_FILE:-}}"
session_name="enterprise-shared-${label}"
run_dir="$PW_ROOT/runs/${label}"

if [[ -n "$env_file" ]]; then
  if [[ ! -f "$env_file" ]]; then
    echo "QA env file does not exist: $env_file" >&2
    exit 2
  fi
  # shellcheck disable=SC1090
  source "$env_file"
fi
browser_user="${QA_BROWSER_USER:-hieu}"
password_file="${QA_BROWSER_PASSWORD_FILE:-${OPENCLAW_QA_STATE:-}/$browser_user-password}"

if [[ ! -x "$PWCLI" ]]; then
  echo "missing Playwright wrapper: $PWCLI" >&2
  exit 1
fi
if [[ "$base_url" == *":18789"* ]]; then
  echo "refusing operator gateway URL 18789; pass the isolated gateway URL" >&2
  exit 2
fi
mkdir -p "$run_dir"
cd "$PW_ROOT"
export PLAYWRIGHT_CLI_SESSION="$session_name"

# Let the Playwright CLI own the secret value. The private dotenv file is
# referenced through its supported environment variable; subsequent `fill`
# calls use the secret name and the CLI redacts it from action/code output.
secret_env_file=""
has_private_password=false
if [[ -f "$password_file" ]]; then
  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 is required to load the private browser credentials" >&2
    exit 1
  fi
  secret_env_file="$(mktemp "${OPENCLAW_QA_STATE:-$run_dir}/playwright-secrets.XXXXXX")"
  chmod 600 "$secret_env_file"
  python3 - "$password_file" "$secret_env_file" <<'PY'
import json
import sys
from pathlib import Path

source = Path(sys.argv[1])
destination = Path(sys.argv[2])
value = source.read_text(encoding="utf-8").rstrip("\r\n")
if not value or "\n" in value or "\r" in value:
    raise SystemExit("private browser password file must contain one non-empty line")
destination.write_text("QA_PASSWORD=" + json.dumps(value) + "\n", encoding="utf-8")
PY
  has_private_password=true
fi
cleanup_secret_file() {
  if [[ -n "$secret_env_file" ]]; then
    rm -f "$secret_env_file"
  fi
}
trap cleanup_secret_file EXIT

open_args=("$base_url/app" "--headed")
if [[ -n "${QA_BROWSER_PROFILE:-}" ]]; then
  open_args+=("--persistent" "--profile" "$QA_BROWSER_PROFILE")
fi
if [[ "$has_private_password" == true ]]; then
  export PLAYWRIGHT_MCP_SECRETS_FILE="$secret_env_file"
fi
"$PWCLI" open "${open_args[@]}"
"$PWCLI" resize 1440 1000
"$PWCLI" snapshot --filename "$run_dir/00-initial.md"
"$PWCLI" screenshot --filename "$run_dir/00-initial.png"

authenticated=false
if [[ "$has_private_password" == true ]]; then
  # A fresh snapshot was captured immediately before this selector-based form
  # interaction. The password is loaded by the Playwright CLI secret store;
  # only its name is passed to the CLI, so neither the literal nor generated
  # action code can contain the credential.
  user_json="$(printf '%s' "$browser_user" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
  "$PWCLI" run-code "async page => { const userField = page.locator('input[name=\"username\"]'); await userField.waitFor({ state: 'visible', timeout: 30000 }); await userField.fill($user_json); }"
  "$PWCLI" fill '#eu-login-password' QA_PASSWORD
  "$PWCLI" run-code "async page => { await page.locator('form button[type=\"submit\"]').click(); await page.waitForFunction(() => !location.pathname.endsWith('/login'), null, { timeout: 30000 }); }"
  authenticated=true
  "$PWCLI" snapshot --filename "$run_dir/01-authenticated.md"
  "$PWCLI" screenshot --filename "$run_dir/01-authenticated.png"
else
  echo "private_password_file_missing=$password_file" >&2
  echo "The driver will leave the fresh login page open for the authorized QA operator." >&2
fi

if [[ "$authenticated" == true ]]; then
  # Start capture only after the credential-bearing login interaction has
  # completed. This keeps the password form and auth network exchange out of
  # the acceptance video, action recording, and trace.
  "$PWCLI" video-start "$run_dir/${label}.webm" --size 1440x1000
  "$PWCLI" recording-start
  "$PWCLI" tracing-start
else
  echo "capture_not_started=unauthenticated" >&2
fi

cat <<EOF
playwright_session=$session_name
artifact_dir=$run_dir
base_url=$base_url

Complete the natural flow from the latest snapshot. The driver already logged
in as the ordinary employee hieu when the private fixture password existed.
1. Create a genuinely fresh session and select the shared target agent.
3. Add video chapter: direct-shared-agent.
4. Ask exactly: Tra cứu đơn nhập hàng nháp hôm nay
5. Wait for the final answer, then save a fresh snapshot and screenshot.
6. Add video chapter: direct-shared-agent-complete.
7. Stop recording, tracing, and video; keep the returned artifact paths.

The browser refs are intentionally not hard-coded. Run snapshot after every
navigation, agent selection, modal change, and completed turn, then use the
refs from that snapshot.
EOF
