#!/usr/bin/env bash
set -euo pipefail

# Small dependency-free self-check for the two HRM transport wrappers.  It
# replaces curl with a deterministic shim, so it never contacts the real HRM
# endpoint and never needs credentials, VPN, or a running MCP server.

script_dir="$(cd "$(dirname "$0")" && pwd)"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/hr-skill-wrapper-test.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

fake_bin="$tmp_dir/bin"
mkdir -p "$fake_bin"
cat >"$fake_bin/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' "$*" >"${HR_TEST_CURL_ARGS_FILE:?}"
if [[ " $* " == *" --data-binary @- "* ]]; then
  cat >"${HR_TEST_CURL_STDIN_FILE:?}"
fi
output_file=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      output_file="${2:-}"
      shift 2
      ;;
    --write-out)
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [[ "$output_file" != "" ]]; then
  body="${HR_TEST_BODY:-}"
  if [[ "$body" == "" ]]; then
    body='{"success":true}'
  fi
  printf '%s' "$body" >"$output_file"
fi
printf '%s' "${HR_TEST_HTTP_STATUS:-200}"
exit "${HR_TEST_CURL_STATUS:-0}"
EOF
chmod +x "$fake_bin/curl"

export PATH="$fake_bin:$PATH"
export HR_TEST_CURL_ARGS_FILE="$tmp_dir/curl-args"
export HR_TEST_CURL_STDIN_FILE="$tmp_dir/curl-stdin"
export HR_MCP_BASE_URL="http://hrm.example.test"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_success() {
  local expected="$1"
  shift
  local output
  output="$("$@")" || fail "expected success: $*"
  [[ "$output" == "$expected" ]] || fail "unexpected output: $output"
}

assert_failure() {
  local expected="$1"
  shift
  local output_file="$tmp_dir/output"
  local error_file="$tmp_dir/error"
  if "$@" >"$output_file" 2>"$error_file"; then
    fail "expected failure: $*"
  fi
  [[ ! -s "$output_file" ]] || fail "failure wrote stdout"
  [[ "$(<"$error_file")" == "$expected" ]] || fail "unexpected classification: $(<"$error_file")"
}

export HR_TEST_CURL_STATUS=0
export HR_TEST_HTTP_STATUS=200
export HR_TEST_BODY='{"success":true,"result":{"data":[]}}'
assert_success '{"success":true,"result":{"data":[]}}' \
  bash -c 'printf %s '\''{"arguments":{"query":"staff"}}'\'' | "$1" router_tool_search --payload-stdin' _ "$script_dir/hr_call.sh"
grep -q -- '--connect-timeout 5 --max-time 30' "$HR_TEST_CURL_ARGS_FILE" || fail "call timeout flags missing"
grep -q -- 'http://hrm.example.test/tools/router_tool_search/execute' "$HR_TEST_CURL_ARGS_FILE" || fail "call endpoint missing"
[[ "$(<"$HR_TEST_CURL_STDIN_FILE")" == '{"arguments":{"query":"staff"}}' ]] || fail "stdin payload was not forwarded"

export HR_TEST_CURL_STATUS=28
assert_failure CONNECT_TIMEOUT \
  "$script_dir/hr_call.sh" router_tool_search --args-json '{}'

export HR_TEST_CURL_STATUS=0
export HR_TEST_HTTP_STATUS=503
assert_failure HTTP_ERROR \
  "$script_dir/hr_call.sh" router_tool_search --args-json '{}'

export HR_TEST_HTTP_STATUS=200
export HR_TEST_BODY='{"success":false,"error":"tool failed"}'
assert_failure TOOL_ERROR \
  "$script_dir/hr_call.sh" router_tool_search --args-json '{}'

export HR_TEST_BODY='{"status":"ok","service":"po-mcp-http-proxy"}'
assert_success '{"status":"ok","service":"po-mcp-http-proxy"}' \
  "$script_dir/hr_health.sh"
grep -q -- '--connect-timeout 5 --max-time 30' "$HR_TEST_CURL_ARGS_FILE" || fail "health timeout flags missing"
grep -q -- 'http://hrm.example.test/health' "$HR_TEST_CURL_ARGS_FILE" || fail "health endpoint missing"

export HR_TEST_CURL_STATUS=7
assert_failure UNREACHABLE "$script_dir/hr_health.sh"

printf 'HR wrapper self-check: PASS\n'
