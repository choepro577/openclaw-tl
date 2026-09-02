// Account-specific Agent, Skill, and Tool grants. Explicit deny always wins.
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import {
  accessPresetToolIds,
  ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
  enterpriseRuntimeResourceId,
  isEnterpriseNonDelegableToolId,
} from "./resource-keys.js";

export type EnterpriseResourceType = "agent" | "skill" | "tool";
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
): { allowed: boolean; reason: string } {
  if (!account.enabled) {
    return { allowed: false, reason: "account_disabled" };
  }
  if (account.role === "administrator") {
    return { allowed: true, reason: "administrator" };
  }
  const normalized = normalizeResourceId(resourceId);
  const runtimeId = enterpriseRuntimeResourceId(resourceType, normalized);
  if (resourceType === "tool" && isEnterpriseNonDelegableToolId(runtimeId)) {
    return { allowed: false, reason: "employee_tool_hard_deny" };
  }
  const matching = listEnterpriseEntitlements(account.id, options).filter(
    (item) =>
      item.resourceState === "active" &&
      item.resourceType === resourceType &&
      enterpriseRuntimeResourceId(item.resourceType, item.resourceId) === runtimeId,
  );
  if (matching.some((item) => item.effect === "deny")) {
    return { allowed: false, reason: "explicit_deny" };
  }
  if (matching.some((item) => item.effect === "allow")) {
    return { allowed: true, reason: "explicit_allow" };
  }
  if (resourceType === "tool" && accessPresetToolIds(account.accessPresetKey).includes(runtimeId)) {
    return { allowed: true, reason: "access_preset" };
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
    },
    options,
    { operationLabel: "enterprise.entitlements.change" },
  );
  return {
    entitlements: accountIds.flatMap((accountId) => listEnterpriseEntitlements(accountId, options)),
    policyRevisions,
  };
}
