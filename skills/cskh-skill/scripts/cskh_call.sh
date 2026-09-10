#!/usr/bin/env bash
set -euo pipefail

usage() {
  local code="${1:-2}"
  cat >&2 <<'USAGE'
Usage:
  cskh_call.sh <tool-name> [--args-json JSON | --args-file PATH] [--raw] [--base-url URL]

Examples:
  cskh_call.sh router_tool_search --args-json '{"query":"find customer information for Nguyen Van A","top_k":3,"min_score":0.35}'
  cskh_call.sh hos_get_product_list --args-json '{"partnerCode":"C0001","siteId":"S001","keyword":"coffee"}'
  cskh_call.sh hos_add_order_product --args-json '{"code":"O0001","partnerCode":"C0001","siteId":"S001","proCode":"CF001","qty":1}'
USAGE
  exit "$code"
}

if [[ "${1:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage 0
fi

tool_name="${1:-}"
shift || true

base_url="${CSKH_MCP_BASE_URL:-${HOS_MCP_BASE_URL:-http://192.168.10.249:10001}}"
args_json="{}"
raw_mode=false

while [[ $# -gt 0 ]]; do
  case "$1" in
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

if [[ "$raw_mode" == true ]]; then
  payload="$args_json"
else
  payload="{\"arguments\":$args_json}"
fi

curl -fsS \
  -X POST \
  "${base_url%/}/tools/${tool_name}/execute" \
  -H "Content-Type: application/json" \
  --data-binary "$payload"
echo
