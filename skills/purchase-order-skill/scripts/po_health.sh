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
  po_health.sh [--payload-stdin] [--base-url URL]
EOF
  exit "$code"
}

base_url="${PO_MCP_BASE_URL:-${COMNIEU_MCP_BASE_URL:-http://192.168.10.249:10003}}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --payload-stdin)
      cat >/dev/null
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

response_file="$(mktemp "${TMPDIR:-/tmp}/po-health.XXXXXX")" || fail_with_classification "TOOL_ERROR"
status_file="$(mktemp "${TMPDIR:-/tmp}/po-health-status.XXXXXX")" || {
  rm -f "$response_file"
  fail_with_classification "TOOL_ERROR"
}
trap 'rm -f "$response_file" "$status_file"' EXIT

set +e
curl --silent --show-error \
  --connect-timeout "$PO_CONNECT_TIMEOUT_SECONDS" \
  --max-time "$PO_MAX_TIME_SECONDS" \
  "${base_url%/}/health" \
  --output "$response_file" \
  --write-out '%{http_code}' >"$status_file" 2>/dev/null
curl_status=$?
set -e

if [[ "$curl_status" -ne 0 ]]; then
  fail_with_classification "$(classify_curl_failure "$curl_status")"
fi

http_status="$(<"$status_file")"
if [[ ! "$http_status" =~ ^[0-9]{3}$ ]]; then
  fail_with_classification "TOOL_ERROR"
fi
if [[ "${http_status:0:1}" != "2" ]]; then
  fail_with_classification "HTTP_ERROR"
fi
if [[ ! -s "$response_file" ]] || is_tool_error_body "$response_file"; then
  fail_with_classification "TOOL_ERROR"
fi

cat "$response_file"
echo
