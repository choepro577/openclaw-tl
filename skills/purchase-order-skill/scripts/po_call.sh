#!/usr/bin/env bash
set -euo pipefail

readonly PO_CONNECT_TIMEOUT_SECONDS=5
readonly PO_MAX_TIME_SECONDS=30

classify_curl_failure() {
  local curl_status="$1"
  case "$curl_status" in
    28) printf '%s\n' "CONNECT_TIMEOUT" ;;
    5|6|7|52|55|56) printf '%s\n' "UNREACHABLE" ;;
    22) printf '%s\n' "HTTP_ERROR" ;;
    *) printf '%s\n' "TOOL_ERROR" ;;
  esac
}

fail_with_classification() {
  printf '%s\n' "$1" >&2
  exit 1
}

is_tool_error_body() {
  local response_file="$1"
  grep -Eq '"success"[[:space:]]*:[[:space:]]*false|"status"[[:space:]]*:[[:space:]]*"(error|index_unavailable)"|"error_type"[[:space:]]*:' "$response_file"
}

usage() {
  local code="${1:-2}"
  cat >&2 <<'EOF'
Usage:
  po_call.sh <tool-name> [--payload-stdin | --args-json JSON | --args-file PATH] [--raw] [--base-url URL]

Examples:
  po_call.sh router_tool_search --args-json '{"query":"lay danh sach de nghi mua hang dang mo cho chi nhanh S1","top_k":3,"min_score":0.35,"company-id":1}'
  po_call.sh get_po_draft_list --args-json '{"authorization":"...","sites":"S1,S2"}'
  po_call.sh confirm_po --args-file /tmp/confirm_po.json
EOF
  exit "$code"
}

if [[ "${1:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage 0
fi

tool_name="${1:-}"
shift || true

base_url="${PO_MCP_BASE_URL:-${COMNIEU_MCP_BASE_URL:-http://192.168.10.249:10003}}"
args_json="{}"
raw_mode=false
payload_stdin=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --payload-stdin)
      payload_stdin=true
      shift
      ;;
    --args-json)
      args_json="${2:-}"
      shift 2
      ;;
    --args-file)
      file_path="${2:-}"
      if [[ "$file_path" == "" || ! -f "$file_path" ]]; then
        echo "Args file not found: $file_path" >&2
        exit 1
      fi
      args_json="$(cat "$file_path")"
      shift 2
      ;;
    --raw)
      raw_mode=true
      shift
      ;;
    --base-url)
      base_url="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      ;;
  esac
done

if [[ "$payload_stdin" == true ]]; then
  payload="$(cat)"
elif [[ "$raw_mode" == true ]]; then
  payload="$args_json"
else
  payload="{\"arguments\":$args_json}"
fi

response_file="$(mktemp "${TMPDIR:-/tmp}/po-call.XXXXXX")" || fail_with_classification "TOOL_ERROR"
status_file="$(mktemp "${TMPDIR:-/tmp}/po-call-status.XXXXXX")" || {
  rm -f "$response_file"
  fail_with_classification "TOOL_ERROR"
}
trap 'rm -f "$response_file" "$status_file"' EXIT

set +e
printf '%s' "$payload" | curl --silent --show-error \
  --connect-timeout "$PO_CONNECT_TIMEOUT_SECONDS" \
  --max-time "$PO_MAX_TIME_SECONDS" \
  -X POST \
  "${base_url%/}/tools/${tool_name}/execute" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  --output "$response_file" \
  --write-out '%{http_code}' >"$status_file" 2>/dev/null
curl_status="${PIPESTATUS[1]}"
set -e

if [[ "$curl_status" -ne 0 ]]; then
  fail_with_classification "$(classify_curl_failure "$curl_status")"
fi

http_status="$(<"$status_file")"
if [[ ! "$http_status" =~ ^[0-9]{3}$ ]]; then
  fail_with_classification "TOOL_ERROR"
fi
if [[ "${http_status:0:1}" != "2" ]]; then
  if [[ "$http_status" == "401" || "$http_status" == "403" ]]; then
    fail_with_classification "AUTH_REQUIRED"
  fi
  fail_with_classification "HTTP_ERROR"
fi
if [[ ! -s "$response_file" ]] || is_tool_error_body "$response_file"; then
  fail_with_classification "TOOL_ERROR"
fi

cat "$response_file"
echo
