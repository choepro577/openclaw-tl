import { listAgentEntries } from "../../agents/agent-scope.js";
import { isToolAllowedByPolicyName } from "../../agents/tool-policy-match.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
// Account-specific Agent, Skill, and Tool grants. Explicit deny always wins.
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { readEnterpriseAccountToolPolicy } from "../accounts/account-tool-policy-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import { listActiveEnterprisePluginGrantTools } from "../isolation/enterprise-plugin-tool-grants.js";
import {
  compileEnterpriseAccountToolPolicy,
  expandEnterpriseToolPolicyEntries,
} from "../isolation/enterprise-tool-policy-common.js";
import { resolveEnterprisePersonalAgentTemplateId } from "../personal-agent/personal-agent-config.js";
import {
  accessPresetToolIds,
  ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
  enterpriseRuntimeResourceId,
  isEnterpriseNonDelegableToolId,
  parseEnterpriseResourceKey,
} from "./resource-keys.js";
import type { EnterpriseResourceType } from "./resource-types.js";

export type { EnterpriseResourceType } from "./resource-types.js";
export type EnterpriseEntitlementEffect = "allow" | "deny";
export type EnterpriseEntitlement = {
  accountId: string;
  resourceType: EnterpriseResourceType;
  resourceId: string;
  resourceState: "active" | "legacy" | "orphaned";
  effect: EnterpriseEntitlementEffect;
};

type EntitlementRow = {
  account_id: string;
  resource_type: EnterpriseResourceType;
  resource_id: string;
  resource_state: EnterpriseEntitlement["resourceState"];
  effect: EnterpriseEntitlementEffect;
};

function normalizeResourceId(resourceId: string): string {
  const normalized = resourceId.trim();
  if (!normalized || normalized.length > 256 || /[\0\r\n]/.test(normalized)) {
    throw new Error("RESOURCE_ID_INVALID");
  }
  return normalized;
}

function toEntitlement(row: EntitlementRow): EnterpriseEntitlement {
  return {
    accountId: row.account_id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    resourceState: row.resource_state,
    effect: row.effect,
  };
}

export function listEnterpriseEntitlements(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseEntitlement[] {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT account_id, resource_type, resource_id, resource_state, effect
       FROM enterprise_entitlements WHERE account_id = ?
       ORDER BY resource_type ASC, resource_id ASC`,
    )
    .all(accountId) as EntitlementRow[]; // sqlite-allow-raw -- Fixed feature-local query.
  return rows.map(toEntitlement);
}

export function replaceEnterpriseEntitlements(
  accountId: string,
  entitlements: Array<Omit<EnterpriseEntitlement, "accountId" | "resourceState">>,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseEntitlement[] {
  ensureEnterpriseSchema(options);
  if (entitlements.length > 2000) {
    throw new Error("ENTITLEMENT_LIMIT_EXCEEDED");
  }
  const normalized = new Map<string, Omit<EnterpriseEntitlement, "accountId" | "resourceState">>();
  for (const item of entitlements) {
    if (!(["agent", "skill", "tool"] as const).includes(item.resourceType)) {
      throw new Error("RESOURCE_TYPE_INVALID");
    }
    if (!(["allow", "deny"] as const).includes(item.effect)) {
      throw new Error("ENTITLEMENT_EFFECT_INVALID");
    }
    const resourceId = normalizeResourceId(item.resourceId);
    const key = `${item.resourceType}\0${resourceId}`;
    const existing = normalized.get(key);
    normalized.set(key, {
      resourceType: item.resourceType,
      resourceId,
      effect: existing?.effect === "deny" || item.effect === "deny" ? "deny" : "allow",
    });
  }
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const account = db
        .prepare("SELECT id FROM enterprise_accounts WHERE id = ? LIMIT 1")
        .get(accountId); // sqlite-allow-raw -- Fixed feature-local lookup.
      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }
      db.prepare("DELETE FROM enterprise_entitlements WHERE account_id = ?").run(accountId); // sqlite-allow-raw -- Replace semantics in one transaction.
      const insert = db.prepare(
        `INSERT INTO enterprise_entitlements
          (account_id, resource_type, resource_id, resource_state, effect, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      const now = Date.now();
      for (const item of normalized.values()) {
        insert.run(
          accountId,
          item.resourceType,
          item.resourceId,
          item.resourceId.startsWith(`${item.resourceType}:`) ? "active" : "legacy",
          item.effect,
          now,
          now,
        );
      }
      db.prepare(
        "UPDATE enterprise_accounts SET policy_revision = policy_revision + 1, updated_at = ? WHERE id = ?",
      ).run(now, accountId); // sqlite-allow-raw -- Replacement invalidates compiled policy.
    },
    options,
    { operationLabel: "enterprise.entitlements.replace" },
  );
  return listEnterpriseEntitlements(accountId, options);
}

export function resolveEnterpriseResourceAccess(
  account: EnterpriseAccount,
  resourceType: EnterpriseResourceType,
  resourceId: string,
  options: OpenClawStateDatabaseOptions = {},
  config?: OpenClawConfig,
): { allowed: boolean; reason: string } {
  if (!account.enabled) {
    return { allowed: false, reason: "account_disabled" };
  }
  const agentKey =
    resourceType === "agent" ? parseEnterpriseResourceKey("agent", resourceId) : undefined;
  if (agentKey?.scope === "personal") {
    // Personal access belongs to its enabled owner, not to a transferable grant.
    // Check before administrator access so a user-portal run cannot borrow another owner.
    if (agentKey.accountId !== account.id) {
      return { allowed: false, reason: "personal_agent_owner_mismatch" };
    }
    if (!account.personalAgentEnabled) {
      return { allowed: false, reason: "personal_agent_disabled" };
    }
    const denied = listEnterpriseEntitlements(account.id, options).some((item) => {
      const key = parseEnterpriseResourceKey(item.resourceType, item.resourceId);
      return (
        item.resourceState === "active" &&
        item.resourceType === "agent" &&
        item.effect === "deny" &&
        key.scope === "personal" &&
        key.accountId === account.id
      );
    });
    return denied
      ? { allowed: false, reason: "explicit_deny" }
      : { allowed: true, reason: "personal_agent_owner" };
  }
  // Administrators retain the catalog-level authority they had before tool
  // presets were introduced. User-runtime projections still apply the
  // compiled account policy before tools are exposed; this resolver answers
  // the control-plane resource assignment question.
  if (account.role === "administrator") {
    return { allowed: true, reason: "administrator" };
  }
  const normalized = normalizeResourceId(resourceId);
  const runtimeId = enterpriseRuntimeResourceId(resourceType, normalized);
  if (resourceType === "tool") {
    const matching = listEnterpriseEntitlements(account.id, options).filter(
      (item) =>
        item.resourceState === "active" &&
        item.resourceType === "tool" &&
        isToolAllowedByPolicyName(runtimeId, {
          allow: [enterpriseRuntimeResourceId(item.resourceType, item.resourceId)],
        }),
    );
    const entitlementAllows = matching
      .filter((item) => item.effect === "allow")
      .flatMap((item) =>
        expandEnterpriseToolPolicyEntries([
          enterpriseRuntimeResourceId(item.resourceType, item.resourceId),
        ]),
      );
    const entitlementDenies = matching
      .filter((item) => item.effect === "deny")
      .flatMap((item) =>
        expandEnterpriseToolPolicyEntries([
          enterpriseRuntimeResourceId(item.resourceType, item.resourceId),
        ]),
      );
    const storedPolicy = readEnterpriseAccountToolPolicy(account.id, options);
    const templateId = config
      ? resolveEnterprisePersonalAgentTemplateId(config, account)
      : undefined;
    const template =
      config && templateId
        ? listAgentEntries(config).find((entry) => entry.id === templateId)
        : undefined;
    const compiled = compileEnterpriseAccountToolPolicy({
      account,
      storedPolicy,
      entitlementAllows,
      entitlementDenies,
      pluginGrantTools: listActiveEnterprisePluginGrantTools(account.id),
      // A legacy configured policy with profile=null inherits only the
      // runtime profile that the caller supplied. If an authority check has
      // no runtime config, leave the inherited profile unresolved and fail
      // closed instead of assuming the host's full profile. basic@1 never
      // inherits a host profile in the first place.
      inheritedProfile: template?.tools?.profile ?? config?.tools?.profile,
    });
    const allowed =
      (compiled.allow?.length ?? 0) > 0 &&
      isToolAllowedByPolicyName(runtimeId, {
        allow: compiled.allow,
        deny: compiled.deny,
      });
    if (!allowed) {
      if (isEnterpriseNonDelegableToolId(runtimeId)) {
        return { allowed: false, reason: "employee_tool_hard_deny" };
      }
      if (matching.some((item) => item.effect === "deny")) {
        return { allowed: false, reason: "explicit_deny" };
      }
      if (
        storedPolicy.configured &&
        !isToolAllowedByPolicyName(runtimeId, { deny: storedPolicy.deny })
      ) {
        return { allowed: false, reason: "explicit_deny" };
      }
      return { allowed: false, reason: "not_granted" };
    }
    if (matching.some((item) => item.effect === "allow")) {
      return { allowed: true, reason: "explicit_allow" };
    }
    if (accessPresetToolIds(account.accessPresetKey).includes(runtimeId)) {
      return { allowed: true, reason: "access_preset" };
    }
    return { allowed: true, reason: "explicit_allow" };
  }
  const matching = listEnterpriseEntitlements(account.id, options).filter(
    (item) =>
      item.resourceState === "active" &&
      item.resourceType === resourceType &&
      // A Shared Agent id may equal an account id without sharing its Personal grants.
      (resourceType !== "agent" ||
        parseEnterpriseResourceKey("agent", item.resourceId).scope !== "personal") &&
      enterpriseRuntimeResourceId(item.resourceType, item.resourceId) === runtimeId,
  );
  if (matching.some((item) => item.effect === "deny")) {
    return { allowed: false, reason: "explicit_deny" };
  }
  if (matching.some((item) => item.effect === "allow")) {
    return { allowed: true, reason: "explicit_allow" };
  }
  return { allowed: false, reason: "not_granted" };
}

export function resolveEnterpriseEffectivePolicy(
  account: EnterpriseAccount,
  options: OpenClawStateDatabaseOptions = {},
): {
  accountId: string;
  role: EnterpriseAccount["role"];
  personalAgentEnabled: boolean;
  defaultAgentId: string | null;
  entitlements: EnterpriseEntitlement[];
  employeeHardDeniedTools: string[];
} {
  return {
    accountId: account.id,
    role: account.role,
    personalAgentEnabled: account.personalAgentEnabled,
    defaultAgentId: account.defaultAgentId,
    entitlements: listEnterpriseEntitlements(account.id, options),
    employeeHardDeniedTools:
      account.role === "employee" ? [...ENTERPRISE_NON_DELEGABLE_TOOL_IDS].toSorted() : [],
  };
}

export type EnterpriseAccessChange = {
  accountId: string;
  resourceType: EnterpriseResourceType;
  resourceId: string;
  effect: EnterpriseEntitlementEffect | null;
};

export function listEnterpriseEntitlementsForResource(
  resourceType: EnterpriseResourceType,
  resourceId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseEntitlement[] {
  ensureEnterpriseSchema(options);
  const normalized = normalizeResourceId(resourceId);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT account_id, resource_type, resource_id, resource_state, effect FROM enterprise_entitlements
       WHERE resource_type = ? AND resource_id = ? ORDER BY account_id ASC`,
    )
    .all(resourceType, normalized) as EntitlementRow[]; // sqlite-allow-raw -- Reverse resource lookup.
  return rows.map(toEntitlement);
}

export function applyEnterpriseAccessChanges(
  changes: EnterpriseAccessChange[],
  baseRevisions: Record<string, number>,
  options: OpenClawStateDatabaseOptions = {},
  audit?: {
    actorAccountId: string;
    actorSessionId: string;
    requestId: string | null;
  },
): { entitlements: EnterpriseEntitlement[]; policyRevisions: Record<string, number> } {
  ensureEnterpriseSchema(options);
  if (changes.length === 0 || changes.length > 2_000) {
    throw new Error("ENTITLEMENT_LIMIT_EXCEEDED");
  }
  const normalized = changes.map((change) => {
    if (
      !(
        change.resourceType === "agent" ||
        change.resourceType === "skill" ||
        change.resourceType === "tool"
      )
    ) {
      throw new Error("RESOURCE_TYPE_INVALID");
    }
    if (change.effect !== null && change.effect !== "allow" && change.effect !== "deny") {
      throw new Error("ENTITLEMENT_EFFECT_INVALID");
    }
    return { ...change, resourceId: normalizeResourceId(change.resourceId) };
  });
  const accountIds = [...new Set(normalized.map((change) => change.accountId))].toSorted();
  const policyRevisions: Record<string, number> = {};
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      for (const accountId of accountIds) {
        const row = db
          .prepare("SELECT policy_revision FROM enterprise_accounts WHERE id = ? LIMIT 1")
          .get(accountId) as { policy_revision: number } | undefined; // sqlite-allow-raw -- Optimistic policy revision lookup.
        if (!row) {
          throw new Error("ACCOUNT_NOT_FOUND");
        }
        if (baseRevisions[accountId] !== row.policy_revision) {
          throw new Error(`POLICY_REVISION_CONFLICT:${accountId}:${row.policy_revision}`);
        }
      }
      const upsert = db.prepare(
        `INSERT INTO enterprise_entitlements
          (account_id, resource_type, resource_id, resource_state, effect, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id, resource_type, resource_id) DO UPDATE SET
           resource_state = excluded.resource_state, effect = excluded.effect,
           updated_at = excluded.updated_at`,
      );
      const remove = db.prepare(
        "DELETE FROM enterprise_entitlements WHERE account_id = ? AND resource_type = ? AND resource_id = ?",
      );
      const now = Date.now();
      for (const change of normalized) {
        if (change.effect === null) {
          remove.run(change.accountId, change.resourceType, change.resourceId);
        } else {
          upsert.run(
            change.accountId,
            change.resourceType,
            change.resourceId,
            change.resourceId.startsWith(`${change.resourceType}:`) ? "active" : "legacy",
            change.effect,
            now,
            now,
          );
        }
      }
      for (const accountId of accountIds) {
        db.prepare(
          "UPDATE enterprise_accounts SET policy_revision = policy_revision + 1, updated_at = ? WHERE id = ?",
        ).run(now, accountId); // sqlite-allow-raw -- One revision bump per affected account.
        const row = db
          .prepare("SELECT policy_revision FROM enterprise_accounts WHERE id = ? LIMIT 1")
          .get(accountId) as { policy_revision: number }; // sqlite-allow-raw -- Return committed revision.
        policyRevisions[accountId] = row.policy_revision;
      }
      if (audit) {
        db.prepare(
          `INSERT INTO enterprise_audit_events
            (id, actor_account_id, actor_session_id, action, target_type, target_id, request_id,
             before_json, after_json, outcome, created_at)
           VALUES (?, ?, ?, 'access.change', 'entitlement', ?, ?, NULL, ?, 'success', ?)`,
        ).run(
          generateSecureUuid(),
          audit.actorAccountId,
          audit.actorSessionId,
          accountIds.join(",").slice(0, 256),
          audit.requestId,
          JSON.stringify({ changes: normalized, policyRevisions }),
          now,
        ); // sqlite-allow-raw -- Entitlement mutation and audit are atomic.
      }
    },
    options,
    { operationLabel: "enterprise.entitlements.change" },
  );
  return {
    entitlements: accountIds.flatMap((accountId) => listEnterpriseEntitlements(accountId, options)),
    policyRevisions,
  };
}

export function markEnterpriseAgentEntitlementsOrphaned(
  resourceId: string,
  options: OpenClawStateDatabaseOptions = {},
): number {
  ensureEnterpriseSchema(options);
  const normalized = normalizeResourceId(resourceId);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const accountIds = (
        db
          .prepare(
            `SELECT account_id FROM enterprise_entitlements
             WHERE resource_type = 'agent' AND resource_id = ? AND resource_state = 'active'`,
          )
          .all(normalized) as Array<{ account_id: string }>
      ).map((row) => row.account_id); // sqlite-allow-raw -- Exact deleted-Agent entitlement lookup.
      if (accountIds.length === 0) {
        return 0;
      }
      const now = Date.now();
      const changed = Number(
        db
          .prepare(
            `UPDATE enterprise_entitlements SET resource_state = 'orphaned', updated_at = ?
             WHERE resource_type = 'agent' AND resource_id = ? AND resource_state = 'active'`,
          )
          .run(now, normalized).changes,
      ); // sqlite-allow-raw -- Deleted Agent grants stay dormant until a new explicit assignment.
      const bump = db.prepare(
        "UPDATE enterprise_accounts SET policy_revision = policy_revision + 1, updated_at = ? WHERE id = ?",
      );
      for (const accountId of new Set(accountIds)) {
        bump.run(now, accountId); // sqlite-allow-raw -- Invalidate outstanding routing decisions.
      }
      return changed;
    },
    options,
    { operationLabel: "enterprise.entitlements.orphan-agent" },
  );
}
