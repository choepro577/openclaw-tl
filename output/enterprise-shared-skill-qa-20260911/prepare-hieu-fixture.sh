#!/usr/bin/env bash
set -euo pipefail

# Prepare only the copied QA state. This calls the existing Enterprise account
# services for the password and entitlement changes; it never edits the live
# operator state or a raw password hash.

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
readonly REPO_ROOT_DEFAULT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
env_file="${1:-}"
username="${2:-hieu}"

if [[ -z "$env_file" || ! -f "$env_file" ]]; then
  echo "usage: prepare-hieu-fixture.sh /tmp/.../qa-env.sh [username]" >&2
  exit 2
fi
# shellcheck disable=SC1090
source "$env_file"

readonly repo_root="${OPENCLAW_QA_REPO:-$REPO_ROOT_DEFAULT}"
readonly state_root="${OPENCLAW_QA_STATE:-}"
readonly artifact_root="${OPENCLAW_QA_ARTIFACT_DIR:-$SCRIPT_DIR}"
readonly password_file="${OPENCLAW_QA_PASSWORD_FILE:-$state_root/${username}-password}"
readonly fixture_report="$artifact_root/fixture-${username}-state.json"

if [[ -z "$state_root" || ! -f "$state_root/state/openclaw.sqlite" ]]; then
  echo "invalid isolated state: $state_root" >&2
  exit 2
fi
if [[ "${OPENCLAW_QA_PORT:-}" == "18789" || "$state_root" == "$HOME/.openclaw" ]]; then
  echo "refusing live operator state or port 18789" >&2
  exit 2
fi
if [[ "$password_file" == "$artifact_root"/* ]]; then
  echo "password file must remain outside repository artifacts" >&2
  exit 2
fi
if [[ ! -f "$repo_root/src/enterprise/auth/auth-service.ts" ]]; then
  echo "missing Enterprise account service source under $repo_root" >&2
  exit 1
fi

mkdir -p -- "$(dirname -- "$password_file")"
chmod 700 "$(dirname -- "$password_file")"
umask 077
password_tmp="${password_file}.tmp.$$"
trap 'rm -f -- "$password_tmp"' EXIT
python3 - "$password_tmp" <<'PY'
import secrets
import sys
from pathlib import Path

target = Path(sys.argv[1])
target.write_text(secrets.token_urlsafe(32) + "\n", encoding="utf-8")
target.chmod(0o600)
PY
mv -f -- "$password_tmp" "$password_file"
chmod 600 "$password_file"

export OPENCLAW_QA_FIXTURE_REPORT="$fixture_report"
export OPENCLAW_QA_PASSWORD_FILE="$password_file"
export OPENCLAW_QA_FIXTURE_STATE="$state_root"
export OPENCLAW_QA_FIXTURE_USERNAME="$username"
export OPENCLAW_QA_REPO_ROOT="$repo_root"

cd -- "$repo_root"
node --import tsx --input-type=module - <<'NODE'
import fs from "node:fs";
import { getEnterpriseAccountByUsername } from "./src/enterprise/accounts/account-store.ts";
import {
  recoverEnterpriseAccountPassword,
  loginEnterpriseAccount,
} from "./src/enterprise/auth/auth-service.ts";
import { listEnterpriseEntitlements, replaceEnterpriseEntitlements } from "./src/enterprise/entitlements/entitlement-store.ts";
import { openOpenClawStateDatabase } from "./src/state/openclaw-state-db.ts";

const stateRoot = process.env.OPENCLAW_QA_FIXTURE_STATE;
const username = process.env.OPENCLAW_QA_FIXTURE_USERNAME;
const passwordFile = process.env.OPENCLAW_QA_PASSWORD_FILE;
const reportPath = process.env.OPENCLAW_QA_FIXTURE_REPORT;
if (!stateRoot || !username || !passwordFile || !reportPath) {
  throw new Error("QA fixture environment is incomplete");
}
const env = { ...process.env, OPENCLAW_STATE_DIR: stateRoot };
const options = { env };
const account = getEnterpriseAccountByUsername(username, options);
if (!account || account.role !== "employee" || !account.enabled) {
  throw new Error(`ordinary enabled employee not found: ${username}`);
}

const before = listEnterpriseEntitlements(account.id, options);
const removableSkills = before.filter((item) => item.resourceType === "skill");
const kept = before.map(({ resourceType, resourceId, effect }) => ({ resourceType, resourceId, effect }))
  .filter((item) => item.resourceType !== "skill");
const after = replaceEnterpriseEntitlements(account.id, kept, options);
const password = fs.readFileSync(passwordFile, "utf8").trim();
if (password.length < 20) {
  throw new Error("generated QA password is unexpectedly short");
}
await recoverEnterpriseAccountPassword(account.id, password, options);
const login = await loginEnterpriseAccount(username, password, options, "user");

const db = openOpenClawStateDatabase(options).db;
const tokenRows = db.prepare(
  `SELECT skill_key, schema_version, expires_at, created_at, updated_at
   FROM enterprise_skill_tokens WHERE account_id = ? ORDER BY skill_key`,
).all(account.id);
const bindingRows = db.prepare(
  "SELECT COUNT(*) AS count FROM enterprise_thienly_bindings WHERE account_id = ?",
).get(account.id);
const nativePluginRows = db.prepare(
  "SELECT scope, agent_key, runtime_agent_id, plugin_id, state, revision FROM enterprise_account_plugin_grants WHERE account_id = ? ORDER BY plugin_id",
).all(account.id);
const codexPluginRows = db.prepare(
  "SELECT agent_key, runtime_agent_id, plugin_name, marketplace_name, auth_required, ready, state, revision FROM enterprise_codex_plugin_grants WHERE account_id = ? ORDER BY plugin_name",
).all(account.id);

const counts = (items) => Object.fromEntries(
  ["agent", "skill", "tool"].map((type) => [type, items.filter((item) => item.resourceType === type).length]),
);
const refreshed = getEnterpriseAccountByUsername(username, options);
const report = {
  capturedAt: new Date().toISOString(),
  username,
  accountId: account.id,
  passwordFileMode: (fs.statSync(passwordFile).mode & 0o777).toString(8),
  passwordLength: password.length,
  loginVerified: login.principal.account.id === account.id && login.principal.audience === "user",
  entitlementBefore: { counts: counts(before), skillResourceIds: removableSkills.map((item) => item.resourceId) },
  entitlementAfter: { counts: counts(after), skillResourceIds: after.filter((item) => item.resourceType === "skill").map((item) => item.resourceId) },
  policyRevisionBefore: account.policyRevision,
  policyRevisionAfter: refreshed?.policyRevision ?? null,
  businessIdentity: {
    thienlyBindingCount: Number(bindingRows?.count ?? 0),
    enterpriseSkillTokenCount: tokenRows.length,
    enterpriseSkillTokenMetadata: tokenRows.map((row) => ({
      skillKey: row.skill_key,
      schemaVersion: row.schema_version,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    nativePluginGrants: nativePluginRows,
    codexPluginGrants: codexPluginRows,
  },
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(`fixture_user=${username}`);
console.log(`fixture_account_id=${account.id}`);
console.log(`password_file=${passwordFile}`);
console.log(`password_file_mode=${report.passwordFileMode}`);
console.log(`user_login_verified=${report.loginVerified}`);
console.log(`skill_grants_removed=${removableSkills.length}`);
console.log(`entitlement_counts_after=${JSON.stringify(report.entitlementAfter.counts)}`);
console.log(`business_thienly_binding_count=${report.businessIdentity.thienlyBindingCount}`);
console.log(`business_skill_token_count=${report.businessIdentity.enterpriseSkillTokenCount}`);
console.log(`fixture_report=${reportPath}`);
NODE

chmod 600 "$fixture_report"
