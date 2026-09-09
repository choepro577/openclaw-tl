import type { DatabaseSync } from "node:sqlite";
import {
  executeSqliteQuerySync,
  executeSqliteQueryTakeFirstSync,
  getNodeSqliteKysely,
} from "../../infra/kysely-sync.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import type { DB as OpenClawStateKyselyDatabase } from "../../state/openclaw-state-db.generated.js";
import {
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
  openOpenClawStateDatabase,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import {
  parseEnterpriseResourceKey,
  sharedAgentResourceKey,
} from "../entitlements/resource-keys.js";
import { enterpriseSharedAgentKey } from "../user/user-agent-key.js";
import type {
  EnterpriseAgentAccessRequest,
  EnterpriseAgentAccessRequestEntitlement,
  EnterpriseAgentAccessRequestState,
} from "./agent-access-request-types.js";

type AgentAccessRequestRow = {
  id: string;
  requester_account_id: string;
  agent_resource_key: string;
  agent_id: string;
  state: EnterpriseAgentAccessRequestState;
  reviewer_account_id: string | null;
  decision_reason: string | null;
  revision: number;
  created_at: number;
  updated_at: number;
  decided_at: number | null;
};

/**
 * Enterprise account tables are additive feature-local schema and are not in
 * the generated state contract yet; access requests are in that contract.
 * Keep the local table shapes here while every runtime query still compiles
 * through the shared synchronous Kysely adapter.
 */
type EnterpriseAccountTable = {
  id: string;
  enabled: number;
  policy_revision: number;
  updated_at: number;
};

type EnterpriseEntitlementTable = {
  account_id: string;
  resource_type: "agent" | "skill" | "tool";
  resource_id: string;
  resource_state: EnterpriseAgentAccessRequestEntitlement["resourceState"];
  effect: EnterpriseAgentAccessRequestEntitlement["effect"];
  created_at: number;
  updated_at: number;
};

type EnterpriseAgentAccessRequestTable = Omit<
  OpenClawStateKyselyDatabase["enterprise_agent_access_requests"],
  "state"
> & {
  state: EnterpriseAgentAccessRequestState;
};

type EnterpriseAgentAccessRequestDatabase = {
  enterprise_agent_access_requests: EnterpriseAgentAccessRequestTable;
  enterprise_accounts: EnterpriseAccountTable;
  enterprise_entitlements: EnterpriseEntitlementTable;
};

type EntitlementRow = {
  account_id: string;
  resource_type: "agent";
  resource_id: string;
  resource_state: EnterpriseAgentAccessRequestEntitlement["resourceState"];
  effect: EnterpriseAgentAccessRequestEntitlement["effect"];
};

function normalizeResourceKey(resourceKey: string, agentId: string): string {
  const normalizedAgentId = agentId.trim();
  const parsed = parseEnterpriseResourceKey("agent", resourceKey);
  const expected = sharedAgentResourceKey(normalizedAgentId);
  if (
    !normalizedAgentId ||
    parsed.scope !== "shared" ||
    parsed.runtimeId !== normalizedAgentId ||
    resourceKey.trim() !== expected
  ) {
    throw new Error("AGENT_RESOURCE_INVALID");
  }
  return expected;
}

function toRequest(row: AgentAccessRequestRow): EnterpriseAgentAccessRequest {
  return {
    id: row.id,
    requesterAccountId: row.requester_account_id,
    agentKey: enterpriseSharedAgentKey(row.agent_resource_key),
    resourceKey: row.agent_resource_key,
    agentId: row.agent_id,
    state: row.state,
    reviewerAccountId: row.reviewer_account_id,
    decisionReason: row.decision_reason,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decidedAt: row.decided_at,
  };
}

function toEntitlement(
  row: EntitlementRow | undefined,
): EnterpriseAgentAccessRequestEntitlement | null {
  return row
    ? {
        accountId: row.account_id,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        resourceState: row.resource_state,
        effect: row.effect,
      }
    : null;
}

function accessRequestDb(database: DatabaseSync) {
  return getNodeSqliteKysely<EnterpriseAgentAccessRequestDatabase>(database);
}

export function getEnterpriseAgentAccessRequest(
  requestId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAgentAccessRequest | undefined {
  ensureEnterpriseSchema(options);
  const database = openOpenClawStateDatabase(options);
  const row = executeSqliteQueryTakeFirstSync(
    database.db,
    accessRequestDb(database.db)
      .selectFrom("enterprise_agent_access_requests")
      .selectAll()
      .where("id", "=", requestId),
  ) as AgentAccessRequestRow | undefined;
  return row ? toRequest(row) : undefined;
}

export function listEnterpriseAgentAccessRequests(
  input: {
    requesterAccountId?: string;
    state?: EnterpriseAgentAccessRequestState;
  } = {},
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAgentAccessRequest[] {
  ensureEnterpriseSchema(options);
  const database = openOpenClawStateDatabase(options);
  const kysely = accessRequestDb(database.db);
  let query = kysely.selectFrom("enterprise_agent_access_requests").selectAll();
  if (input.requesterAccountId) {
    query = query.where("requester_account_id", "=", input.requesterAccountId);
  }
  if (input.state) {
    query = query.where("state", "=", input.state);
  }
  query = input.requesterAccountId
    ? query.orderBy("updated_at", "desc").orderBy("id", "desc")
    : query
        .orderBy((eb) => eb.case().when("state", "=", "pending").then(0).else(1).end())
        .orderBy("created_at", "asc")
        .orderBy("id", "asc");
  const rows = executeSqliteQuerySync(database.db, query).rows as AgentAccessRequestRow[];
  return rows.map(toRequest);
}

export function findEnterpriseAgentAccessRequest(
  requesterAccountId: string,
  resourceKey: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAgentAccessRequest | undefined {
  ensureEnterpriseSchema(options);
  const database = openOpenClawStateDatabase(options);
  const row = executeSqliteQueryTakeFirstSync(
    database.db,
    accessRequestDb(database.db)
      .selectFrom("enterprise_agent_access_requests")
      .selectAll()
      .where("requester_account_id", "=", requesterAccountId)
      .where("agent_resource_key", "=", resourceKey)
      .orderBy((eb) => eb.case().when("state", "=", "pending").then(0).else(1).end())
      .orderBy("updated_at", "desc")
      .orderBy("id", "desc"),
  ) as AgentAccessRequestRow | undefined;
  return row ? toRequest(row) : undefined;
}

export function createEnterpriseAgentAccessRequest(
  input: { requesterAccountId: string; agentId: string; resourceKey: string },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAgentAccessRequest {
  ensureEnterpriseSchema(options);
  const agentId = normalizeAgentId(input.agentId);
  const resourceKey = normalizeResourceKey(input.resourceKey, agentId);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const kysely = accessRequestDb(db);
      const account = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .selectFrom("enterprise_accounts")
          .select("enabled")
          .where("id", "=", input.requesterAccountId),
      );
      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }
      if (account.enabled !== 1) {
        throw new Error("ACCOUNT_DISABLED");
      }
      const existing = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .selectFrom("enterprise_agent_access_requests")
          .selectAll()
          .where("requester_account_id", "=", input.requesterAccountId)
          .where("agent_resource_key", "=", resourceKey)
          .where("state", "=", "pending"),
      ) as AgentAccessRequestRow | undefined;
      if (existing) {
        return toRequest(existing);
      }
      const now = Date.now();
      const id = generateSecureUuid();
      const inserted = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .insertInto("enterprise_agent_access_requests")
          .values({
            id,
            requester_account_id: input.requesterAccountId,
            agent_resource_key: resourceKey,
            agent_id: agentId,
            state: "pending",
            reviewer_account_id: null,
            decision_reason: null,
            revision: 1,
            created_at: now,
            updated_at: now,
            decided_at: null,
          })
          .returningAll(),
      ) as AgentAccessRequestRow | undefined;
      if (!inserted) {
        throw new Error("AGENT_ACCESS_REQUEST_CREATE_FAILED");
      }
      return toRequest(inserted);
    },
    options,
    { operationLabel: "enterprise.agent-access-request.create" },
  );
}

export function cancelEnterpriseAgentAccessRequest(
  input: { requestId: string; requesterAccountId: string; baseRevision: number },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAgentAccessRequest {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const kysely = accessRequestDb(db);
      const current = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .selectFrom("enterprise_agent_access_requests")
          .selectAll()
          .where("id", "=", input.requestId),
      ) as AgentAccessRequestRow | undefined;
      if (!current || current.requester_account_id !== input.requesterAccountId) {
        throw new Error("AGENT_ACCESS_REQUEST_NOT_FOUND");
      }
      if (current.revision !== input.baseRevision) {
        throw new Error(`AGENT_ACCESS_REQUEST_REVISION_CONFLICT:${current.revision}`);
      }
      if (current.state !== "pending") {
        throw new Error(`AGENT_ACCESS_REQUEST_STATE_CONFLICT:${current.state}`);
      }
      const now = Date.now();
      const updated = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .updateTable("enterprise_agent_access_requests")
          .set({
            state: "cancelled",
            revision: input.baseRevision + 1,
            updated_at: now,
            decided_at: now,
          })
          .where("id", "=", input.requestId)
          .where("revision", "=", input.baseRevision)
          .where("state", "=", "pending")
          .returningAll(),
      ) as AgentAccessRequestRow | undefined;
      if (!updated) {
        throw new Error(`AGENT_ACCESS_REQUEST_REVISION_CONFLICT:${current.revision}`);
      }
      return toRequest(updated);
    },
    options,
    { operationLabel: "enterprise.agent-access-request.cancel" },
  );
}

export function cancelPendingEnterpriseAgentAccessRequestsForResource(
  resourceKey: string,
  reason: string,
  options: OpenClawStateDatabaseOptions = {},
): number {
  ensureEnterpriseSchema(options);
  const normalizedReason = reason.trim();
  if (!normalizedReason || normalizedReason.length > 2_000) {
    throw new Error("ACCESS_REQUEST_REASON_INVALID");
  }
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const now = Date.now();
      const result = executeSqliteQuerySync(
        db,
        accessRequestDb(db)
          .updateTable("enterprise_agent_access_requests")
          .set((eb) => ({
            state: "cancelled",
            decision_reason: normalizedReason,
            revision: eb("revision", "+", 1),
            updated_at: now,
            decided_at: now,
          }))
          .where("agent_resource_key", "=", resourceKey)
          .where("state", "=", "pending"),
      );
      return Number(result.numAffectedRows);
    },
    options,
    { operationLabel: "enterprise.agent-access-request.cancel-resource" },
  );
}

export function rejectEnterpriseAgentAccessRequest(
  input: {
    requestId: string;
    reviewerAccountId: string;
    baseRevision: number;
    reason: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAgentAccessRequest {
  ensureEnterpriseSchema(options);
  const reason = input.reason.trim();
  if (!reason || reason.length > 2_000) {
    throw new Error("ACCESS_REQUEST_REASON_INVALID");
  }
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const kysely = accessRequestDb(db);
      const current = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .selectFrom("enterprise_agent_access_requests")
          .selectAll()
          .where("id", "=", input.requestId),
      ) as AgentAccessRequestRow | undefined;
      if (!current) {
        throw new Error("AGENT_ACCESS_REQUEST_NOT_FOUND");
      }
      if (current.revision !== input.baseRevision) {
        throw new Error(`AGENT_ACCESS_REQUEST_REVISION_CONFLICT:${current.revision}`);
      }
      if (current.state !== "pending") {
        throw new Error(`AGENT_ACCESS_REQUEST_STATE_CONFLICT:${current.state}`);
      }
      const now = Date.now();
      const updated = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .updateTable("enterprise_agent_access_requests")
          .set({
            state: "rejected",
            reviewer_account_id: input.reviewerAccountId,
            decision_reason: reason,
            revision: input.baseRevision + 1,
            updated_at: now,
            decided_at: now,
          })
          .where("id", "=", input.requestId)
          .where("revision", "=", input.baseRevision)
          .where("state", "=", "pending")
          .returningAll(),
      ) as AgentAccessRequestRow | undefined;
      if (!updated) {
        throw new Error(`AGENT_ACCESS_REQUEST_REVISION_CONFLICT:${current.revision}`);
      }
      return toRequest(updated);
    },
    options,
    { operationLabel: "enterprise.agent-access-request.reject" },
  );
}

export function approveEnterpriseAgentAccessRequest(
  input: { requestId: string; reviewerAccountId: string; baseRevision: number },
  options: OpenClawStateDatabaseOptions = {},
): { request: EnterpriseAgentAccessRequest; entitlement: EnterpriseAgentAccessRequestEntitlement } {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const kysely = accessRequestDb(db);
      const current = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .selectFrom("enterprise_agent_access_requests")
          .selectAll()
          .where("id", "=", input.requestId),
      ) as AgentAccessRequestRow | undefined;
      if (!current) {
        throw new Error("AGENT_ACCESS_REQUEST_NOT_FOUND");
      }
      if (current.revision !== input.baseRevision) {
        throw new Error(`AGENT_ACCESS_REQUEST_REVISION_CONFLICT:${current.revision}`);
      }
      if (current.state !== "pending") {
        throw new Error(`AGENT_ACCESS_REQUEST_STATE_CONFLICT:${current.state}`);
      }
      const account = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .selectFrom("enterprise_accounts")
          .select("enabled")
          .where("id", "=", current.requester_account_id),
      );
      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }
      if (account.enabled !== 1) {
        throw new Error("ACCOUNT_DISABLED");
      }
      const existing = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .selectFrom("enterprise_entitlements")
          .select(["account_id", "resource_type", "resource_id", "resource_state", "effect"])
          .where("account_id", "=", current.requester_account_id)
          .where("resource_type", "=", "agent")
          .where("resource_id", "=", current.agent_resource_key),
      ) as EntitlementRow | undefined;
      const now = Date.now();
      if (!existing || existing.resource_state !== "active" || existing.effect !== "allow") {
        executeSqliteQuerySync(
          db,
          kysely
            .insertInto("enterprise_entitlements")
            .values({
              account_id: current.requester_account_id,
              resource_type: "agent",
              resource_id: current.agent_resource_key,
              resource_state: "active",
              effect: "allow",
              created_at: now,
              updated_at: now,
            })
            .onConflict((conflict) =>
              conflict.columns(["account_id", "resource_type", "resource_id"]).doUpdateSet({
                resource_state: "active",
                effect: "allow",
                updated_at: now,
              }),
            ),
        );
        executeSqliteQuerySync(
          db,
          kysely
            .updateTable("enterprise_accounts")
            .set((eb) => ({
              policy_revision: eb("policy_revision", "+", 1),
              updated_at: now,
            }))
            .where("id", "=", current.requester_account_id),
        );
      }
      const request = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .updateTable("enterprise_agent_access_requests")
          .set({
            state: "approved",
            reviewer_account_id: input.reviewerAccountId,
            decision_reason: null,
            revision: input.baseRevision + 1,
            updated_at: now,
            decided_at: now,
          })
          .where("id", "=", input.requestId)
          .where("revision", "=", input.baseRevision)
          .where("state", "=", "pending")
          .returningAll(),
      ) as AgentAccessRequestRow | undefined;
      if (!request) {
        throw new Error(`AGENT_ACCESS_REQUEST_REVISION_CONFLICT:${current.revision}`);
      }
      const entitlement = executeSqliteQueryTakeFirstSync(
        db,
        kysely
          .selectFrom("enterprise_entitlements")
          .select(["account_id", "resource_type", "resource_id", "resource_state", "effect"])
          .where("account_id", "=", current.requester_account_id)
          .where("resource_type", "=", "agent")
          .where("resource_id", "=", current.agent_resource_key),
      ) as EntitlementRow | undefined;
      if (!entitlement) {
        throw new Error("AGENT_ACCESS_ENTITLEMENT_NOT_FOUND");
      }
      return { request: toRequest(request), entitlement: toEntitlement(entitlement)! };
    },
    options,
    { operationLabel: "enterprise.agent-access-request.approve" },
  );
}
