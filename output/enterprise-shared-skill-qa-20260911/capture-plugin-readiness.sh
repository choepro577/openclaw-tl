#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-}"
if [[ -z "$env_file" || ! -f "$env_file" ]]; then
  echo "usage: capture-plugin-readiness.sh /tmp/.../qa-env.sh" >&2
  exit 2
fi
# shellcheck disable=SC1090
source "$env_file"
if [[ "${OPENCLAW_QA_PORT:-}" == "18789" || "${OPENCLAW_QA_STATE:-}" == "$HOME/.openclaw" ]]; then
  echo "refusing live operator state or port 18789" >&2
  exit 2
fi

export OPENCLAW_QA_PLUGIN_REPORT="${OPENCLAW_QA_ARTIFACT_DIR:-$(dirname -- "$0")}/plugin-readiness.json"
export OPENCLAW_QA_PLUGIN_DB="$OPENCLAW_QA_STATE/state/openclaw.sqlite"
mkdir -p "$(dirname -- "$OPENCLAW_QA_PLUGIN_REPORT")"
node - "$OPENCLAW_QA_PLUGIN_DB" "$OPENCLAW_QA_PLUGIN_REPORT" <<'NODE'
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const [dbPath, reportPath] = process.argv.slice(2);
const db = new DatabaseSync(dbPath, { readOnly: true });
const accountRows = db.prepare(
  "select id, username from enterprise_accounts where role='employee' and enabled=1 order by username",
).all();
const accountById = new Map(accountRows.map((row) => [row.id, row.username]));
const native = db.prepare(
  "select id, account_id, scope, agent_key, runtime_agent_id, plugin_id, exact_version, state, revision from enterprise_account_plugin_grants where state='active' order by plugin_id, id",
).all().map((row) => ({
  id: row.id,
  account: accountById.get(row.account_id) ?? null,
  scope: row.scope,
  agentKey: row.agent_key,
  runtimeAgentId: row.runtime_agent_id,
  pluginId: row.plugin_id,
  exactVersion: row.exact_version,
  state: row.state,
  revision: row.revision,
}));
const codex = db.prepare(
  "select id, account_id, scope, agent_key, runtime_agent_id, plugin_name, marketplace_name, auth_required, ready, state, revision from enterprise_codex_plugin_grants where state='active' order by plugin_name, id",
).all().map((row) => ({
  id: row.id,
  account: accountById.get(row.account_id) ?? null,
  scope: row.scope,
  agentKey: row.agent_key,
  runtimeAgentId: row.runtime_agent_id,
  pluginName: row.plugin_name,
  marketplaceName: row.marketplace_name,
  authRequired: row.auth_required,
  ready: row.ready,
  state: row.state,
  revision: row.revision,
}));
const sharedAgentUsers = db.prepare(
  `select resource_id, count(distinct account_id) as users
   from enterprise_entitlements
   where resource_type='agent' and resource_state='active' and effect='allow'
     and resource_id in ('agent:shared:purchase-order-skill','agent:shared:hrm')
   group by resource_id order by resource_id`,
).all();
const report = {
  capturedAt: new Date().toISOString(),
  activeNativePluginGrants: native,
  activeCodexPluginGrants: codex,
  activeSharedPluginGrantCounts: {
    native: native.filter((row) => row.scope === "shared_agent").length,
    codex: codex.filter((row) => row.scope === "shared_agent").length,
  },
  sharedAgentUserCounts: sharedAgentUsers,
  acceptancePlan: [
    {
      case: "same-shared-agent-two-users",
      users: ["hieu", "tl00275"],
      agent: "agent:shared:purchase-order-skill",
      expected: "same shared-agent skill/tool surface; no private plugin promotion",
    },
    {
      case: "private-native-plugin-exclusion",
      account: "hieu",
      plugin: "diffs",
      scope: "account",
      expected: "visible only through its account scope; absent from shared purchase-order projection",
    },
    {
      case: "private-codex-plugin-exclusion",
      account: "hieu",
      plugin: "gmail",
      scope: "account",
      agentKey: "personal",
      expected: "visible only to hieu personal runtime; absent from shared purchase-order projection",
    },
    {
      case: "explicit-shared-plugin-grant",
      expected: "admin approval creates scope=shared_agent row and a capability revision before shared sessions expose it",
    },
  ],
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(`active_native_plugin_grants=${native.length}`);
console.log(`active_codex_plugin_grants=${codex.length}`);
console.log(`active_shared_plugin_grants=${report.activeSharedPluginGrantCounts.native + report.activeSharedPluginGrantCounts.codex}`);
console.log(`shared_agent_user_counts=${JSON.stringify(sharedAgentUsers)}`);
console.log(`plugin_report=${reportPath}`);
NODE
chmod 600 "$OPENCLAW_QA_PLUGIN_REPORT"
