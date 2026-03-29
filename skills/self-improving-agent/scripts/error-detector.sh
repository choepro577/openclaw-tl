#!/bin/bash
# Error reminder hook for compatible external agent CLIs.
# Reads CLAUDE_TOOL_OUTPUT when the host provides it.

set -euo pipefail

output="${CLAUDE_TOOL_OUTPUT:-}"

error_patterns=(
  "error:"
  "Error:"
  "ERROR:"
  "failed"
  "FAILED"
  "command not found"
  "No such file"
  "Permission denied"
  "fatal:"
  "Exception"
  "Traceback"
  "npm ERR!"
  "ModuleNotFoundError"
  "SyntaxError"
  "TypeError"
  "exit code"
  "non-zero"
)

contains_error=false
for pattern in "${error_patterns[@]}"; do
  if [[ "$output" == *"$pattern"* ]]; then
    contains_error=true
    break
  fi
done

if [ "$contains_error" = true ]; then
  cat <<'EOF'
<error-detected>
A command error was detected. Consider logging this to .learnings/ERRORS.md if:
- the failure was unexpected or non-obvious
- it required investigation to resolve
- it may recur in similar contexts
- the resolution would help future sessions

Use the self-improving-agent error format: [ERR-YYYYMMDD-XXX]
</error-detected>
EOF
fi
