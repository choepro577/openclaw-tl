#!/usr/bin/env bash
set -euo pipefail

usage() {
  local code="${1:-2}"
  cat >&2 <<'EOF'
Usage:
  hr_health.sh [--base-url URL]
EOF
  exit "$code"
}

base_url="${HR_MCP_BASE_URL:-${COMNIEU_MCP_BASE_URL:-http://192.168.10.249:10000}}"

while [[ $# -gt 0 ]]; do
  case "$1" in
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

curl -fsS "${base_url%/}/health"
echo
