#!/bin/bash
# Self-Improving Agent activator hook for compatible external agent CLIs.
# Emits a lightweight reminder after each prompt.

set -euo pipefail

cat <<'EOF'
<self-improvement-reminder>
After completing this task, evaluate whether durable knowledge emerged:
- Did a non-obvious solution require investigation?
- Did you learn a project-specific pattern or convention?
- Did you find a workaround for unexpected behavior?
- Did an error require meaningful debugging to resolve?

If yes, log it to .learnings/ using the self-improving-agent format.
If it is recurring and broadly reusable, consider extracting a skill.
</self-improvement-reminder>
EOF
