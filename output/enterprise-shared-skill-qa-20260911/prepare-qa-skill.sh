#!/usr/bin/env bash
set -euo pipefail

# Install a harmless read-only marker skill in the copied state and assign it
# through the same per-agent `skills` config used by the business skills.

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
env_file="${1:-}"
action="${2:-add}"
agent_id="${3:-purchase-order-skill}"
skill_name="qa-shared-acceptance-skill"

if [[ -z "$env_file" || ! -f "$env_file" || ( "$action" != "add" && "$action" != "remove" ) ]]; then
  echo "usage: prepare-qa-skill.sh /tmp/.../qa-env.sh [add|remove] [agent-id]" >&2
  exit 2
fi
# shellcheck disable=SC1090
source "$env_file"

readonly state_root="${OPENCLAW_QA_STATE:-}"
readonly config_path="${OPENCLAW_CONFIG_PATH:-$state_root/openclaw.json}"
readonly artifact_root="${OPENCLAW_QA_ARTIFACT_DIR:-$SCRIPT_DIR}"
readonly skill_dir="$state_root/skills/$skill_name"
readonly report_path="$artifact_root/qa-skill-${action}-${agent_id}.json"

if [[ -z "$state_root" || ! -f "$config_path" || ! -d "$state_root" ]]; then
  echo "invalid isolated state/config" >&2
  exit 2
fi
if [[ "${OPENCLAW_QA_PORT:-}" == "18789" || "$state_root" == "$HOME/.openclaw" ]]; then
  echo "refusing live operator state or port 18789" >&2
  exit 2
fi
if ! jq -e --arg agent "$agent_id" '.agents.entries[$agent] != null' "$config_path" >/dev/null; then
  echo "unknown configured agent: $agent_id" >&2
  exit 2
fi

if [[ "$action" == "add" ]]; then
  mkdir -p "$skill_dir/scripts"
  cat > "$skill_dir/SKILL.md" <<'EOF'
---
name: qa-shared-acceptance-skill
description: Read-only acceptance marker for shared-agent capability projection.
metadata:
  openclaw:
    emoji: "🧪"
    requires:
      bins: ["node"]
    scriptRuntime:
      entrypoints:
        marker:
          path: scripts/qa_marker
          kind: fixed
          risk: read
          timeoutMs: 30000
---

# Shared capability acceptance marker

This skill is only for the isolated acceptance lane. Invoke the fixed `marker`
entrypoint with `skill_script`; it returns the stable marker
`QA_SHARED_SKILL_OK` and performs no network or business operation.
EOF
  cat > "$skill_dir/scripts/qa_marker" <<'EOF'
#!/usr/bin/env node
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  try {
    JSON.parse(input || "{}");
  } catch {
    process.stdout.write(JSON.stringify({ ok: false, marker: "QA_SHARED_SKILL_INVALID_INPUT" }));
    process.exitCode = 2;
    return;
  }
  process.stdout.write(JSON.stringify({ ok: true, marker: "QA_SHARED_SKILL_OK" }));
});
EOF
  chmod 700 "$skill_dir/scripts/qa_marker"
  chmod 700 "$skill_dir"
fi

tmp_config="${config_path}.qa.tmp.$$"
trap 'rm -f "$tmp_config"' EXIT
jq --arg agent "$agent_id" --arg skill "$skill_name" --arg action "$action" '
  .agents.entries[$agent].skills = (
    ((.agents.entries[$agent].skills // []) + (if $action == "add" then [$skill] else [] end))
    | unique
    | if $action == "remove" then map(select(. != $skill)) else . end
  )
' "$config_path" > "$tmp_config"
mv -f "$tmp_config" "$config_path"
chmod 600 "$config_path"

config_sha="$(shasum -a 256 "$config_path" | awk '{print $1}')"
skill_sha=""
skill_mode=""
if [[ -f "$skill_dir/SKILL.md" ]]; then
  skill_sha="$(shasum -a 256 "$skill_dir/SKILL.md" | awk '{print $1}')"
  skill_mode="$(stat -f '%Sp' "$skill_dir/scripts/qa_marker" 2>/dev/null || stat -c '%A' "$skill_dir/scripts/qa_marker")"
fi
jq -n \
  --arg action "$action" \
  --arg agent "$agent_id" \
  --arg skill "$skill_name" \
  --arg configSha256 "$config_sha" \
  --arg skillSha256 "$skill_sha" \
  --arg scriptMode "$skill_mode" \
  --argjson assigned "$(jq --arg agent "$agent_id" '.agents.entries[$agent].skills' "$config_path")" \
  '{capturedAt:(now|todateiso8601),action:$action,agentId:$agent,skill:$skill,configSha256:$configSha256,skillSha256:$skillSha256,scriptMode:$scriptMode,assignedSkills:$assigned}' \
  > "$report_path"
chmod 600 "$report_path"

printf 'qa_skill_action=%s\n' "$action"
printf 'qa_skill_agent=%s\n' "$agent_id"
printf 'qa_skill_name=%s\n' "$skill_name"
printf 'qa_skill_assigned=%s\n' "$(jq -c --arg agent "$agent_id" '.agents.entries[$agent].skills' "$config_path")"
printf 'qa_skill_report=%s\n' "$report_path"
