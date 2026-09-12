import {
  executeSqliteQuerySync,
  executeSqliteQueryTakeFirstSync,
  getNodeSqliteKysely,
} from "../../infra/kysely-sync.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import type { AgentKey } from "../user/user-api-contracts.js";
import { jsonObject } from "./codex-plugin-active-grants.js";
import type {
  EnterpriseCodexPluginAuthApp,
  EnterpriseCodexPluginGrant,
  EnterpriseCodexPluginGrantState,
  EnterpriseCodexPluginRequest,
  EnterpriseCodexPluginRequestKind,
  EnterpriseCodexPluginRequestState,
} from "./codex-plugin-types.js";
import {
  normalizeEnterpriseExtensionGrantTarget,
  type EnterpriseExtensionGrantScope,
} from "./extension-types.js";

export {
  CODEX_CONNECTOR_IDENTITY_REQUIRED,
  EnterpriseCodexConnectorIdentityRequiredError,
  classifyEnterpriseCodexPluginCapabilitySnapshot,
  listActiveEnterpriseCodexPluginGrants,
  listActiveEnterpriseSharedCodexPluginGrantFingerprints,
} from "./codex-plugin-active-grants.js";
export type {
  EnterpriseActiveCodexPluginGrantFingerprint,
  EnterpriseCodexCapabilitySurface,
} from "./codex-plugin-active-grants.js";

type Row = Record<string, unknown>;

/**
 * These tables are additive enterprise tables that are intentionally not part
 * of the generated shared-state Kysely schema yet. Keep their runtime shape
 * local until the next schema-codegen pass includes them.
 */
type CodexPluginRequestTable = {
  id: string;
  requester_account_id: string | null;
  scope: string;
  agent_key: string;
  runtime_agent_id: string;
  plugin_name: string;
  marketplace_name: string;
  remote_plugin_id: string | null;
  request_kind: string;
  catalog_snapshot_json: string;
  capability_snapshot_json: string;
  capability_digest: string;
  state: string;
  installed_plugin_id: string | null;
  auth_required: number;
  apps_needing_auth_json: string;
  connect_urls_json: string;
  reviewer_account_id: string | null;
  decision_reason: string | null;
  safe_error_code: string | null;
  revision: number;
  created_at: number;
  updated_at: number;
  decided_at: number | null;
};

type CodexPluginGrantTable = {
  id: string;
  account_id: string | null;
  scope: string;
  agent_key: string;
  runtime_agent_id: string;
  plugin_name: string;
  marketplace_name: string;
  remote_plugin_id: string | null;
  installed_plugin_id: string | null;
  capability_snapshot_json: string;
  capability_digest: string;
  source_request_id: string | null;
  approved_by_account_id: string | null;
  auth_required: number;
  apps_needing_auth_json: string;
  connect_urls_json: string;
  ready: number;
  state: string;
  revision: number;
  created_at: number;
  updated_at: number;
};

type EnterpriseAccountTable = {
  id: string;
  enabled: number;
};

export type CodexPluginDatabase = {
  enterprise_codex_plugin_requests: CodexPluginRequestTable;
  enterprise_codex_plugin_grants: CodexPluginGrantTable;
  enterprise_accounts: EnterpriseAccountTable;
};

/** Canonical marketplace used by the public OpenAI curated catalog. */
export const CODEX_CURATED_MARKETPLACE = "openai-curated";

const PLUGIN_SEGMENT = /^[A-Za-z0-9_-]{1,128}$/;

function text(row: Row, key: string): string {
  return String(row[key] ?? "");
}

function nullableText(row: Row, key: string): string | null {
  return row[key] === null || row[key] === undefined ? null : String(row[key]);
}

function integer(row: Row, key: string): number {
  const value = Number(row[key]);
  if (!Number.isSafeInteger(value)) {
    throw new Error("CODEX_PLUGIN_ROW_INVALID:" + key);
  }
  return value;
}

function jsonArray(row: Row, key: string): unknown[] {
  try {
    const value = JSON.parse(text(row, key)) as unknown;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function authApps(row: Row): EnterpriseCodexPluginAuthApp[] {
  return jsonArray(row, "apps_needing_auth_json").flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [];
    }
    const record = value as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.name !== "string") {
      return [];
    }
    return [
      {
        id: record.id.slice(0, 256),
        name: record.name.slice(0, 256),
        installUrl:
          typeof record.installUrl === "string" ? record.installUrl.slice(0, 2_048) : null,
      },
    ];
  });
}

function stringArray(row: Row, key: string): string[] {
  return [
    ...new Set(jsonArray(row, key).filter((value): value is string => typeof value === "string")),
  ]
    .map((value) => value.slice(0, 2_048))
    .toSorted();
}

function authState(
  row: Row,
): Pick<EnterpriseCodexPluginGrant, "authRequired" | "appsNeedingAuth" | "connectUrls" | "ready"> {
  return {
    authRequired: Number(row.auth_required) === 1,
    appsNeedingAuth: authApps(row),
    connectUrls: stringArray(row, "connect_urls_json"),
    ready: Number(row.ready) === 1,
  };
}

function toCodexRequest(row: Row): EnterpriseCodexPluginRequest {
  const target = normalizeEnterpriseExtensionGrantTarget({
    scope: (nullableText(row, "scope") ?? "account") as EnterpriseExtensionGrantScope,
    agentKey: text(row, "agent_key") as AgentKey,
    runtimeAgentId: text(row, "runtime_agent_id"),
  });
  return {
    id: text(row, "id"),
    requesterAccountId: nullableText(row, "requester_account_id"),
    scope: target.scope,
    agentKey: text(row, "agent_key") as AgentKey,
    runtimeAgentId: text(row, "runtime_agent_id"),
    pluginName: text(row, "plugin_name"),
    marketplaceName: text(row, "marketplace_name"),
    remotePluginId: nullableText(row, "remote_plugin_id"),
    requestKind: text(row, "request_kind") as EnterpriseCodexPluginRequestKind,
    catalogSnapshot: jsonObject(row, "catalog_snapshot_json"),
    capabilitySnapshot: jsonObject(row, "capability_snapshot_json"),
    capabilityDigest: text(row, "capability_digest"),
    state: text(row, "state") as EnterpriseCodexPluginRequestState,
    installedPluginId: nullableText(row, "installed_plugin_id"),
    reviewerAccountId: nullableText(row, "reviewer_account_id"),
    decisionReason: nullableText(row, "decision_reason"),
    safeErrorCode: nullableText(row, "safe_error_code"),
    authRequired: Number(row.auth_required) === 1,
    appsNeedingAuth: authApps(row),
    connectUrls: stringArray(row, "connect_urls_json"),
    revision: integer(row, "revision"),
    createdAt: integer(row, "created_at"),
    updatedAt: integer(row, "updated_at"),
    decidedAt: row.decided_at === null ? null : integer(row, "decided_at"),
  };
}

function toCodexGrant(row: Row): EnterpriseCodexPluginGrant {
  const target = normalizeEnterpriseExtensionGrantTarget({
    scope: (nullableText(row, "scope") ?? "account") as EnterpriseExtensionGrantScope,
    agentKey: text(row, "agent_key") as AgentKey,
    runtimeAgentId: text(row, "runtime_agent_id"),
  });
  return {
    id: text(row, "id"),
    accountId: nullableText(row, "account_id"),
    scope: target.scope,
    agentKey: text(row, "agent_key") as AgentKey,
    runtimeAgentId: text(row, "runtime_agent_id"),
    pluginName: text(row, "plugin_name"),
    marketplaceName: text(row, "marketplace_name"),
    remotePluginId: nullableText(row, "remote_plugin_id"),
    installedPluginId: nullableText(row, "installed_plugin_id"),
    capabilitySnapshot: jsonObject(row, "capability_snapshot_json"),
    capabilityDigest: text(row, "capability_digest"),
    sourceRequestId: nullableText(row, "source_request_id"),
    approvedByAccountId: nullableText(row, "approved_by_account_id"),
    state: text(row, "state") as EnterpriseCodexPluginGrantState,
    revision: integer(row, "revision"),
    createdAt: integer(row, "created_at"),
    updatedAt: integer(row, "updated_at"),
    ...authState(row),
  };
}

/** Validates and normalizes a Codex marketplace identity supplied by a portal. */
export function normalizeEnterpriseCodexPluginIdentity(input: {
  pluginName: string;
  marketplaceName?: string | null;
  remotePluginId?: string | null;
}): { pluginName: string; marketplaceName: string; remotePluginId: string | null } {
  const pluginName = input.pluginName.trim();
  const marketplaceName = (input.marketplaceName ?? CODEX_CURATED_MARKETPLACE).trim();
  const remotePluginId = input.remotePluginId?.trim() || null;
  if (!PLUGIN_SEGMENT.test(pluginName) || !PLUGIN_SEGMENT.test(marketplaceName)) {
    throw new Error("CODEX_PLUGIN_ID_INVALID");
  }
  if (remotePluginId && remotePluginId.length > 256) {
    throw new Error("CODEX_REMOTE_PLUGIN_ID_INVALID");
  }
  return { pluginName, marketplaceName, remotePluginId };
}

export function createEnterpriseCodexPluginRequest(
  input: Omit<
    EnterpriseCodexPluginRequest,
    | "id"
    | "state"
    | "installedPluginId"
    | "reviewerAccountId"
    | "decisionReason"
    | "safeErrorCode"
    | "revision"
    | "createdAt"
    | "updatedAt"
    | "decidedAt"
    | "authRequired"
    | "appsNeedingAuth"
    | "connectUrls"
    | "scope"
    | "requesterAccountId"
  > & { requesterAccountId: string } & Partial<
      Pick<
        EnterpriseCodexPluginRequest,
        "authRequired" | "appsNeedingAuth" | "connectUrls" | "scope"
      >
    >,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseCodexPluginRequest {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
      const target = normalizeEnterpriseExtensionGrantTarget({
        scope: input.scope,
        agentKey: input.agentKey,
        runtimeAgentId: input.runtimeAgentId,
      });
      const existing = executeSqliteQueryTakeFirstSync(
        db,
        query
          .selectFrom("enterprise_codex_plugin_requests")
          .selectAll()
          .where("requester_account_id", "=", input.requesterAccountId)
          .where("scope", "=", target.scope)
          .where("runtime_agent_id", "=", input.runtimeAgentId)
          .where("plugin_name", "=", input.pluginName)
          .where("marketplace_name", "=", input.marketplaceName)
          .where("state", "in", ["pending", "approving"])
          .orderBy("created_at", "desc")
          .orderBy("id", "asc")
          .limit(1),
      );
      if (existing) {
        return toCodexRequest(existing as Row);
      }

      const id = generateSecureUuid();
      const now = Date.now();
      executeSqliteQuerySync(
        db,
        query
          .insertInto("enterprise_codex_plugin_requests")
          .values({
            id,
            requester_account_id: input.requesterAccountId,
            scope: target.scope,
            agent_key: input.agentKey,
            runtime_agent_id: input.runtimeAgentId,
            plugin_name: input.pluginName,
            marketplace_name: input.marketplaceName,
            remote_plugin_id: input.remotePluginId ?? null,
            request_kind: input.requestKind,
            catalog_snapshot_json: JSON.stringify(input.catalogSnapshot),
            capability_snapshot_json: JSON.stringify(input.capabilitySnapshot),
            capability_digest: input.capabilityDigest,
            state: "pending",
            installed_plugin_id: null,
            auth_required: input.authRequired ? 1 : 0,
            apps_needing_auth_json: JSON.stringify(input.appsNeedingAuth ?? []),
            connect_urls_json: JSON.stringify(input.connectUrls ?? []),
            reviewer_account_id: null,
            decision_reason: null,
            safe_error_code: null,
            revision: 1,
            created_at: now,
            updated_at: now,
            decided_at: null,
          })
          .returningAll(),
      );
      const created = executeSqliteQueryTakeFirstSync(
        db,
        query.selectFrom("enterprise_codex_plugin_requests").selectAll().where("id", "=", id),
      );
      if (!created) {
        throw new Error("CODEX_PLUGIN_REQUEST_CREATE_FAILED");
      }
      return toCodexRequest(created as Row);
    },
    options,
    { operationLabel: "enterprise.codex-plugin.request.create" },
  );
}

export function getEnterpriseCodexPluginRequest(
  id: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseCodexPluginRequest | undefined {
  ensureEnterpriseSchema(options);
  const { db } = openOpenClawStateDatabase(options);
  const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
  const row = executeSqliteQueryTakeFirstSync(
    db,
    query.selectFrom("enterprise_codex_plugin_requests").selectAll().where("id", "=", id),
  );
  return row ? toCodexRequest(row as Row) : undefined;
}

export function listEnterpriseCodexPluginRequests(
  input: {
    accountId?: string;
    runtimeAgentId?: string;
    state?: EnterpriseCodexPluginRequestState;
  } = {},
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseCodexPluginRequest[] {
  ensureEnterpriseSchema(options);
  const { db } = openOpenClawStateDatabase(options);
  const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
  let requestQuery = query.selectFrom("enterprise_codex_plugin_requests").selectAll();
  if (input.accountId) {
    requestQuery = requestQuery.where("requester_account_id", "=", input.accountId);
  }
  if (input.runtimeAgentId) {
    requestQuery = requestQuery.where("runtime_agent_id", "=", input.runtimeAgentId);
  }
  if (input.state) {
    requestQuery = requestQuery.where("state", "=", input.state);
  }
  const rows = executeSqliteQuerySync(
    db,
    requestQuery.orderBy("created_at", "desc").orderBy("id", "asc").limit(200),
  ).rows;
  return rows.map((row) => toCodexRequest(row as Row));
}

export function transitionEnterpriseCodexPluginRequest(
  input: {
    id: string;
    baseRevision: number;
    from: EnterpriseCodexPluginRequestState[];
    to: EnterpriseCodexPluginRequestState;
    reviewerAccountId?: string | null;
    decisionReason?: string | null;
    installedPluginId?: string | null;
    safeErrorCode?: string | null;
    scope?: EnterpriseCodexPluginRequest["scope"];
    authRequired?: boolean;
    appsNeedingAuth?: EnterpriseCodexPluginAuthApp[];
    connectUrls?: string[];
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseCodexPluginRequest {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
      const existing = executeSqliteQueryTakeFirstSync(
        db,
        query.selectFrom("enterprise_codex_plugin_requests").selectAll().where("id", "=", input.id),
      );
      if (!existing) {
        throw new Error("CODEX_PLUGIN_REQUEST_NOT_FOUND");
      }
      const current = toCodexRequest(existing as Row);
      if (current.revision !== input.baseRevision || !input.from.includes(current.state)) {
        throw new Error("CODEX_PLUGIN_REVISION_CONFLICT:" + current.revision);
      }
      const decided =
        input.to === "rejected" || input.to === "available" ? Date.now() : current.decidedAt;
      const target = normalizeEnterpriseExtensionGrantTarget({
        scope: input.scope ?? current.scope,
        agentKey: current.agentKey,
        runtimeAgentId: current.runtimeAgentId,
      });
      const updated = executeSqliteQueryTakeFirstSync(
        db,
        query
          .updateTable("enterprise_codex_plugin_requests")
          .set({
            state: input.to,
            scope: target.scope,
            reviewer_account_id: input.reviewerAccountId ?? current.reviewerAccountId,
            decision_reason: input.decisionReason ?? current.decisionReason,
            installed_plugin_id: input.installedPluginId ?? current.installedPluginId,
            safe_error_code:
              input.safeErrorCode === undefined ? current.safeErrorCode : input.safeErrorCode,
            auth_required:
              input.authRequired === undefined
                ? current.authRequired
                  ? 1
                  : 0
                : input.authRequired
                  ? 1
                  : 0,
            apps_needing_auth_json: JSON.stringify(
              input.appsNeedingAuth ?? current.appsNeedingAuth,
            ),
            connect_urls_json: JSON.stringify(input.connectUrls ?? current.connectUrls),
            revision: current.revision + 1,
            updated_at: Date.now(),
            decided_at: decided,
          })
          .where("id", "=", input.id)
          .where("revision", "=", input.baseRevision)
          .where("state", "=", current.state)
          .returningAll(),
      );
      if (!updated) {
        throw new Error("CODEX_PLUGIN_REVISION_CONFLICT");
      }
      return toCodexRequest(updated as Row);
    },
    options,
    { operationLabel: "enterprise.codex-plugin.request.transition" },
  );
}

export function upsertEnterpriseCodexPluginGrant(
  input: {
    accountId: string;
    scope?: EnterpriseExtensionGrantScope;
    agentKey: AgentKey;
    runtimeAgentId: string;
    pluginName: string;
    marketplaceName: string;
    remotePluginId?: string | null;
    installedPluginId?: string | null;
    capabilitySnapshot: Record<string, unknown>;
    capabilityDigest: string;
    sourceRequestId: string;
    approvedByAccountId?: string | null;
    state: EnterpriseCodexPluginGrantState;
    authRequired?: boolean;
    appsNeedingAuth?: EnterpriseCodexPluginAuthApp[];
    connectUrls?: string[];
    ready?: boolean;
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseCodexPluginGrant {
  ensureEnterpriseSchema(options);
  const target = normalizeEnterpriseExtensionGrantTarget({
    scope: input.scope,
    agentKey: input.agentKey,
    runtimeAgentId: input.runtimeAgentId,
  });
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
      const existing = executeSqliteQueryTakeFirstSync(
        db,
        query
          .selectFrom("enterprise_codex_plugin_grants")
          .selectAll()
          .where("scope", "=", target.scope)
          .where("runtime_agent_id", "=", input.runtimeAgentId)
          .where("plugin_name", "=", input.pluginName)
          .where("marketplace_name", "=", input.marketplaceName)
          .$if(target.scope === "account", (builder) =>
            builder.where("account_id", "=", input.accountId),
          ),
      );
      const now = Date.now();
      const appsNeedingAuthJson = JSON.stringify(input.appsNeedingAuth ?? []);
      const connectUrlsJson = JSON.stringify(input.connectUrls ?? []);
      const common = {
        scope: target.scope,
        agent_key: input.agentKey,
        remote_plugin_id: input.remotePluginId ?? null,
        installed_plugin_id: input.installedPluginId ?? null,
        capability_snapshot_json: JSON.stringify(input.capabilitySnapshot),
        capability_digest: input.capabilityDigest,
        source_request_id: input.sourceRequestId,
        approved_by_account_id: input.approvedByAccountId ?? null,
        state: input.state,
        auth_required: input.authRequired ? 1 : 0,
        apps_needing_auth_json: appsNeedingAuthJson,
        connect_urls_json: connectUrlsJson,
        ready: input.ready ? 1 : 0,
        updated_at: now,
      };
      if (existing) {
        const updated = executeSqliteQueryTakeFirstSync(
          db,
          query
            .updateTable("enterprise_codex_plugin_grants")
            .set({
              ...common,
              revision: existing.revision + 1,
            })
            .where("id", "=", existing.id)
            .returningAll(),
        );
        if (!updated) {
          throw new Error("CODEX_PLUGIN_REVISION_CONFLICT");
        }
        return toCodexGrant(updated as Row);
      }

      const id = generateSecureUuid();
      const inserted = executeSqliteQueryTakeFirstSync(
        db,
        query
          .insertInto("enterprise_codex_plugin_grants")
          .values({
            id,
            account_id: input.accountId,
            scope: target.scope,
            agent_key: input.agentKey,
            runtime_agent_id: input.runtimeAgentId,
            plugin_name: input.pluginName,
            marketplace_name: input.marketplaceName,
            remote_plugin_id: input.remotePluginId ?? null,
            installed_plugin_id: input.installedPluginId ?? null,
            capability_snapshot_json: JSON.stringify(input.capabilitySnapshot),
            capability_digest: input.capabilityDigest,
            source_request_id: input.sourceRequestId,
            auth_required: input.authRequired ? 1 : 0,
            apps_needing_auth_json: appsNeedingAuthJson,
            connect_urls_json: connectUrlsJson,
            ready: input.ready ? 1 : 0,
            state: input.state,
            revision: 1,
            created_at: now,
            updated_at: now,
          })
          .returningAll(),
      );
      if (!inserted) {
        throw new Error("CODEX_PLUGIN_GRANT_CREATE_FAILED");
      }
      return toCodexGrant(inserted as Row);
    },
    options,
    { operationLabel: "enterprise.codex-plugin.grant.upsert" },
  );
}

export function listEnterpriseAccountCodexPluginGrants(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseCodexPluginGrant[] {
  ensureEnterpriseSchema(options);
  const { db } = openOpenClawStateDatabase(options);
  const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
  const rows = executeSqliteQuerySync(
    db,
    query
      .selectFrom("enterprise_codex_plugin_grants")
      .selectAll()
      .where("account_id", "=", accountId)
      .orderBy("updated_at", "desc")
      .orderBy("id", "asc"),
  ).rows;
  return rows.map((row) => toCodexGrant(row as Row));
}

export function getEnterpriseCodexPluginGrant(
  id: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseCodexPluginGrant | undefined {
  ensureEnterpriseSchema(options);
  const { db } = openOpenClawStateDatabase(options);
  const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
  const row = executeSqliteQueryTakeFirstSync(
    db,
    query.selectFrom("enterprise_codex_plugin_grants").selectAll().where("id", "=", id),
  );
  return row ? toCodexGrant(row as Row) : undefined;
}

export function getEnterpriseCodexPluginGrantBySourceRequestId(
  sourceRequestId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseCodexPluginGrant | undefined {
  ensureEnterpriseSchema(options);
  const { db } = openOpenClawStateDatabase(options);
  const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
  const row = executeSqliteQueryTakeFirstSync(
    db,
    query
      .selectFrom("enterprise_codex_plugin_grants")
      .selectAll()
      .where("source_request_id", "=", sourceRequestId)
      .orderBy("updated_at", "desc")
      .orderBy("id", "asc"),
  );
  return row ? toCodexGrant(row as Row) : undefined;
}

export function transitionEnterpriseCodexPluginGrant(
  input: {
    id: string;
    accountId: string;
    baseRevision: number;
    state: EnterpriseCodexPluginGrantState;
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseCodexPluginGrant {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
      const updated = executeSqliteQueryTakeFirstSync(
        db,
        query
          .updateTable("enterprise_codex_plugin_grants")
          .set({
            state: input.state,
            revision: input.baseRevision + 1,
            updated_at: Date.now(),
          })
          .where("id", "=", input.id)
          .where("account_id", "=", input.accountId)
          .where("revision", "=", input.baseRevision)
          .returningAll(),
      );
      if (!updated) {
        throw new Error("CODEX_PLUGIN_REVISION_CONFLICT");
      }
      return toCodexGrant(updated as Row);
    },
    options,
    { operationLabel: "enterprise.codex-plugin.grant.transition" },
  );
}

/**
 * Persist the current Codex connector readiness with a compare-and-swap fence.
 * Auth refreshes are independent of grant state transitions, but they must not
 * be allowed to resurrect a grant that was disabled or revoked concurrently.
 */
export function refreshEnterpriseCodexPluginGrantAuth(
  input: {
    id: string;
    accountId: string;
    runtimeAgentId: string;
    baseRevision: number;
    authRequired: boolean;
    appsNeedingAuth: EnterpriseCodexPluginAuthApp[];
    connectUrls: string[];
    ready: boolean;
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseCodexPluginGrant {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const query = getNodeSqliteKysely<CodexPluginDatabase>(db);
      const updated = executeSqliteQueryTakeFirstSync(
        db,
        query
          .updateTable("enterprise_codex_plugin_grants")
          .set({
            auth_required: input.authRequired ? 1 : 0,
            apps_needing_auth_json: JSON.stringify(input.appsNeedingAuth),
            connect_urls_json: JSON.stringify(input.connectUrls),
            ready: input.ready ? 1 : 0,
            revision: input.baseRevision + 1,
            updated_at: Date.now(),
          })
          .where("id", "=", input.id)
          .where("account_id", "=", input.accountId)
          .where("runtime_agent_id", "=", input.runtimeAgentId)
          .where("revision", "=", input.baseRevision)
          .where("state", "in", ["active", "disabled", "unavailable"])
          .returningAll(),
      );
      if (!updated) {
        throw new Error("CODEX_PLUGIN_REVISION_CONFLICT");
      }
      return toCodexGrant(updated as Row);
    },
    options,
    { operationLabel: "enterprise.codex-plugin.grant.auth-refresh" },
  );
}
