import { normalizeToolPolicyName } from "../../agents/tool-policy-shared.js";
import type { ToolProfileId } from "../../config/types.tools.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";

export type EnterpriseAccountToolPolicy = {
  configured: boolean;
  revision: number;
  profile: ToolProfileId | null;
  alsoAllow: string[];
  deny: string[];
};

type ToolPolicyRow = {
  profile: string | null;
  also_allow_json: string;
  deny_json: string;
  revision: number;
};

function normalizeEntries(values: readonly string[]): string[] {
  return [...new Set(values.map(normalizeToolPolicyName).filter(Boolean))].toSorted();
}

function parseEntries(value: string): string[] | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")
      ? normalizeEntries(parsed)
      : null;
  } catch {
    return null;
  }
}

function parseProfile(value: string | null): ToolProfileId | null | undefined {
  return value === null ||
    value === "minimal" ||
    value === "coding" ||
    value === "messaging" ||
    value === "full"
    ? value
    : undefined;
}

function fromRow(row: ToolPolicyRow): EnterpriseAccountToolPolicy {
  const profile = parseProfile(row.profile);
  const alsoAllow = parseEntries(row.also_allow_json);
  const deny = parseEntries(row.deny_json);
  if (profile === undefined || !alsoAllow || !deny) {
    // A malformed persisted security policy must remove capability, never widen it.
    return { configured: true, revision: row.revision, profile: null, alsoAllow: [], deny: ["*"] };
  }
  return { configured: true, revision: row.revision, profile, alsoAllow, deny };
}

export function readEnterpriseAccountToolPolicy(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccountToolPolicy {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT profile, also_allow_json, deny_json, revision
       FROM enterprise_account_tool_policies WHERE account_id = ? LIMIT 1`,
    )
    .get(accountId) as ToolPolicyRow | undefined; // sqlite-allow-raw -- Account-owned policy lookup.
  return row
    ? fromRow(row)
    : { configured: false, revision: 0, profile: null, alsoAllow: [], deny: [] };
}

export function writeEnterpriseAccountToolPolicy(
  accountId: string,
  baseRevision: number,
  policy: Pick<EnterpriseAccountToolPolicy, "profile" | "alsoAllow" | "deny">,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccountToolPolicy {
  ensureEnterpriseSchema(options);
  const profile = parseProfile(policy.profile);
  if (profile === undefined || !Number.isSafeInteger(baseRevision) || baseRevision < 0) {
    throw new Error("ACCOUNT_TOOL_POLICY_INVALID");
  }
  const alsoAllow = normalizeEntries(policy.alsoAllow);
  const deny = normalizeEntries(policy.deny);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const account = db
        .prepare("SELECT id FROM enterprise_accounts WHERE id = ? LIMIT 1")
        .get(accountId) as { id: string } | undefined; // sqlite-allow-raw -- Foreign owner validation.
      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }
      const current = db
        .prepare(
          `SELECT profile, also_allow_json, deny_json, revision
           FROM enterprise_account_tool_policies WHERE account_id = ? LIMIT 1`,
        )
        .get(accountId) as ToolPolicyRow | undefined; // sqlite-allow-raw -- CAS read in owner transaction.
      const currentRevision = current?.revision ?? 0;
      if (currentRevision !== baseRevision) {
        throw new Error(`ACCOUNT_TOOL_POLICY_REVISION_CONFLICT:${currentRevision}`);
      }
      const now = Date.now();
      const revision = currentRevision + 1;
      db.prepare(
        `INSERT INTO enterprise_account_tool_policies
          (account_id, schema_version, profile, also_allow_json, deny_json, revision, created_at, updated_at)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET
           schema_version = excluded.schema_version,
           profile = excluded.profile,
           also_allow_json = excluded.also_allow_json,
           deny_json = excluded.deny_json,
           revision = excluded.revision,
           updated_at = excluded.updated_at`,
      ).run(
        accountId,
        profile,
        JSON.stringify(alsoAllow),
        JSON.stringify(deny),
        revision,
        now,
        now,
      ); // sqlite-allow-raw -- Atomic account-scoped policy upsert.
      db.prepare(
        `UPDATE enterprise_accounts
         SET policy_revision = policy_revision + 1, updated_at = ? WHERE id = ?`,
      ).run(now, accountId); // sqlite-allow-raw -- Runtime policy cache invalidation signal.
      return { configured: true, revision, profile, alsoAllow, deny };
    },
    options,
    { operationLabel: "enterprise.account-tool-policy.write" },
  );
}
