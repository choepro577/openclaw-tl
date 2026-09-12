#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/po-skill-wrapper-test.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

fake_bin="$tmp_dir/bin"
mkdir -p "$fake_bin"
cat >"$fake_bin/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' "$*" >"${PO_TEST_CURL_ARGS_FILE:?}"
if [[ " $* " == *" --data-binary @- "* ]]; then
  cat >"${PO_TEST_CURL_STDIN_FILE:?}"
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
    *) shift ;;
  esac
done

if [[ "$output_file" != "" ]]; then
  body="${PO_TEST_BODY:-}"
  if [[ "$body" == "" ]]; then
    body='{"success":true}'
  fi
  printf '%s' "$body" >"$output_file"
fi
printf '%s' "${PO_TEST_HTTP_STATUS:-200}"
exit "${PO_TEST_CURL_STATUS:-0}"
EOF
chmod +x "$fake_bin/curl"

export PATH="$fake_bin:$PATH"
export PO_TEST_CURL_ARGS_FILE="$tmp_dir/curl-args"
export PO_TEST_CURL_STDIN_FILE="$tmp_dir/curl-stdin"
export PO_MCP_BASE_URL="http://po.example.test"

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

export PO_TEST_CURL_STATUS=0
export PO_TEST_HTTP_STATUS=200
export PO_TEST_BODY='{"success":true,"result":{"data":[]}}'
assert_success '{"success":true,"result":{"data":[]}}' \
  bash -c 'printf %s '\''{"arguments":{"query":"drafts"}}'\'' | "$1" router_tool_search --payload-stdin' _ "$script_dir/po_call.sh"
grep -q -- '--connect-timeout 5 --max-time 30' "$PO_TEST_CURL_ARGS_FILE" || fail "call timeout flags missing"
grep -q -- 'http://po.example.test/tools/router_tool_search/execute' "$PO_TEST_CURL_ARGS_FILE" || fail "call endpoint missing"
[[ "$(<"$PO_TEST_CURL_STDIN_FILE")" == '{"arguments":{"query":"drafts"}}' ]] || fail "stdin payload was not forwarded"

export PO_TEST_CURL_STATUS=28
assert_failure CONNECT_TIMEOUT "$script_dir/po_call.sh" router_tool_search --args-json '{}'

export PO_TEST_CURL_STATUS=0
export PO_TEST_HTTP_STATUS=401
assert_failure AUTH_REQUIRED "$script_dir/po_call.sh" get_po_detail --args-json '{}'

export PO_TEST_HTTP_STATUS=503
assert_failure HTTP_ERROR "$script_dir/po_call.sh" router_tool_search --args-json '{}'

export PO_TEST_HTTP_STATUS=200
export PO_TEST_BODY='{"success":false,"error":"tool failed"}'
assert_failure TOOL_ERROR "$script_dir/po_call.sh" router_tool_search --args-json '{}'

export PO_TEST_BODY='{"status":"ok","service":"po-mcp-http-proxy"}'
assert_success '{"status":"ok","service":"po-mcp-http-proxy"}' "$script_dir/po_health.sh"
grep -q -- '--connect-timeout 5 --max-time 30' "$PO_TEST_CURL_ARGS_FILE" || fail "health timeout flags missing"
grep -q -- 'http://po.example.test/health' "$PO_TEST_CURL_ARGS_FILE" || fail "health endpoint missing"

export PO_TEST_CURL_STATUS=7
assert_failure UNREACHABLE "$script_dir/po_health.sh"

printf 'PO wrapper self-check: PASS\n'
