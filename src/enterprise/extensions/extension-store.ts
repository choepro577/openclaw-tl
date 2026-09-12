import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";
import type { AgentKey } from "../user/user-api-contracts.js";
import type {
  EnterpriseAccountPluginGrant,
  EnterprisePluginGrantState,
  EnterprisePluginRequest,
  EnterprisePluginRequestState,
  EnterpriseUserSkillInstall,
  EnterpriseUserSkillInstallState,
} from "./extension-types.js";
import { normalizeEnterpriseExtensionGrantTarget } from "./extension-types.js";

type Row = Record<string, unknown>;

function text(row: Row, key: string): string {
  return String(row[key] ?? "");
}

function nullableText(row: Row, key: string): string | null {
  return row[key] === null || row[key] === undefined ? null : String(row[key]);
}

function integer(row: Row, key: string): number {
  const value = Number(row[key]);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`EXTENSION_ROW_INVALID:${key}`);
  }
  return value;
}

function jsonObject(row: Row, key: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text(row, key)) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function stringArray(row: Row, key: string): string[] {
  try {
    const value = JSON.parse(text(row, key)) as unknown;
    return Array.isArray(value) && value.every((item) => typeof item === "string")
      ? [...new Set(value)].toSorted()
      : [];
  } catch {
    return [];
  }
}

function toSkillInstall(row: Row): EnterpriseUserSkillInstall {
  return {
    id: text(row, "id"),
    accountId: text(row, "account_id"),
    agentKey: text(row, "agent_key") as AgentKey,
    runtimeAgentId: text(row, "runtime_agent_id"),
    clawhubRef: text(row, "clawhub_ref"),
    skillName: text(row, "skill_name"),
    exactVersion: text(row, "exact_version"),
    integrity: text(row, "integrity"),
    relativePath: text(row, "relative_path"),
    treeHash: text(row, "tree_hash"),
    enabled: integer(row, "enabled") === 1,
    state: text(row, "state") as EnterpriseUserSkillInstallState,
    safeErrorCode: nullableText(row, "safe_error_code"),
    revision: integer(row, "revision"),
    createdAt: integer(row, "created_at"),
    updatedAt: integer(row, "updated_at"),
  };
}

function toPluginRequest(row: Row): EnterprisePluginRequest {
  const target = normalizeEnterpriseExtensionGrantTarget({
    scope: (nullableText(row, "scope") ?? "account") as EnterprisePluginRequest["scope"],
    agentKey: nullableText(row, "agent_key") as AgentKey | null,
    runtimeAgentId: nullableText(row, "runtime_agent_id"),
  });
  return {
    id: text(row, "id"),
    requesterAccountId: nullableText(row, "requester_account_id"),
    ...target,
    packageName: text(row, "package_name"),
    packageFamily: text(row, "package_family") as EnterprisePluginRequest["packageFamily"],
    exactVersion: text(row, "exact_version"),
    integrity: text(row, "integrity"),
    requestKind: text(row, "request_kind") as EnterprisePluginRequest["requestKind"],
    trustSnapshot: jsonObject(row, "trust_snapshot_json"),
    capabilitySnapshot: jsonObject(row, "capability_snapshot_json"),
    capabilityDigest: text(row, "capability_digest"),
    state: text(row, "state") as EnterprisePluginRequestState,
    installedPluginId: nullableText(row, "installed_plugin_id"),
    reviewerAccountId: nullableText(row, "reviewer_account_id"),
    decisionReason: nullableText(row, "decision_reason"),
    safeErrorCode: nullableText(row, "safe_error_code"),
    revision: integer(row, "revision"),
    createdAt: integer(row, "created_at"),
    updatedAt: integer(row, "updated_at"),
    decidedAt: row.decided_at === null ? null : integer(row, "decided_at"),
  };
}

function toPluginGrant(row: Row): EnterpriseAccountPluginGrant {
  const target = normalizeEnterpriseExtensionGrantTarget({
    scope: (nullableText(row, "scope") ?? "account") as EnterpriseAccountPluginGrant["scope"],
    agentKey: nullableText(row, "agent_key") as AgentKey | null,
    runtimeAgentId: nullableText(row, "runtime_agent_id"),
  });
  return {
    id: text(row, "id"),
    accountId: text(row, "account_id"),
    ...target,
    pluginId: text(row, "plugin_id"),
    exactVersion: text(row, "exact_version"),
    integrity: text(row, "integrity"),
    capabilityDigest: text(row, "capability_digest"),
    approvedTools: stringArray(row, "approved_tools_json"),
    sourceRequestId: text(row, "source_request_id"),
    approvedByAccountId: nullableText(row, "approved_by_account_id"),
    state: text(row, "state") as EnterprisePluginGrantState,
    revision: integer(row, "revision"),
    createdAt: integer(row, "created_at"),
    updatedAt: integer(row, "updated_at"),
  };
}

export function listEnterpriseUserSkillInstalls(
  accountId: string,
  agentKey: AgentKey,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseUserSkillInstall[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        `SELECT * FROM enterprise_user_skill_installs
         WHERE account_id = ? AND agent_key = ? ORDER BY updated_at DESC, id ASC`,
      )
      .all(accountId, agentKey) as Row[]
  ).map(toSkillInstall); // sqlite-allow-raw -- Feature-local account and AgentKey scoped inventory.
}

export function listActiveEnterpriseUserSkillInstallsForRuntimeAgent(
  accountId: string,
  runtimeAgentId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseUserSkillInstall[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        `SELECT * FROM enterprise_user_skill_installs WHERE account_id = ? AND runtime_agent_id = ?
         AND enabled = 1 AND state = 'ready' ORDER BY updated_at DESC`,
      )
      .all(accountId, runtimeAgentId) as Row[]
  ).map(toSkillInstall); // sqlite-allow-raw -- Runtime overlay is scoped to one account-agent pair.
}

export function getEnterpriseUserSkillInstall(
  accountId: string,
  id: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseUserSkillInstall | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_user_skill_installs WHERE id = ? AND account_id = ?")
    .get(id, accountId) as Row | undefined; // sqlite-allow-raw -- Account ownership lookup.
  return row ? toSkillInstall(row) : undefined;
}

export function writeEnterpriseUserSkillInstall(
  input: Omit<EnterpriseUserSkillInstall, "id" | "revision" | "createdAt" | "updatedAt"> & {
    id?: string;
    baseRevision?: number;
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseUserSkillInstall {
  ensureEnterpriseSchema(options);
  const portableRelativePath = input.relativePath.split("\\").join("/");
  if (!/^skills\/[a-z0-9][a-z0-9._-]*$/i.test(portableRelativePath)) {
    throw new Error("SKILL_RELATIVE_PATH_INVALID");
  }
  const id = input.id ?? generateSecureUuid();
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const current = db
        .prepare(
          "SELECT revision FROM enterprise_user_skill_installs WHERE id = ? AND account_id = ?",
        )
        .get(id, input.accountId) as { revision: number } | undefined; // sqlite-allow-raw -- CAS owner read.
      const currentRevision = current?.revision ?? 0;
      if ((input.baseRevision ?? currentRevision) !== currentRevision) {
        throw new Error(`EXTENSION_REVISION_CONFLICT:${currentRevision}`);
      }
      db.prepare(
        `INSERT INTO enterprise_user_skill_installs
          (id, account_id, agent_key, runtime_agent_id, clawhub_ref, skill_name, exact_version,
           integrity, relative_path, tree_hash, enabled, state, safe_error_code, revision,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           runtime_agent_id = excluded.runtime_agent_id,
           exact_version = excluded.exact_version,
           integrity = excluded.integrity,
           relative_path = excluded.relative_path,
           tree_hash = excluded.tree_hash,
           enabled = excluded.enabled,
           state = excluded.state,
           safe_error_code = excluded.safe_error_code,
           revision = enterprise_user_skill_installs.revision + 1,
           updated_at = excluded.updated_at`,
      ).run(
        id,
        input.accountId,
        input.agentKey,
        input.runtimeAgentId,
        input.clawhubRef,
        input.skillName,
        input.exactVersion,
        input.integrity,
        portableRelativePath,
        input.treeHash,
        input.enabled ? 1 : 0,
        input.state,
        input.safeErrorCode,
        now,
        now,
      ); // sqlite-allow-raw -- Transactional CAS inventory upsert.
    },
    options,
    { operationLabel: "enterprise.extension.skill.write" },
  );
  return getEnterpriseUserSkillInstall(input.accountId, id, options)!;
}

export function deleteEnterpriseUserSkillInstallRecord(
  accountId: string,
  id: string,
  baseRevision: number,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  const result = openOpenClawStateDatabase(options)
    .db.prepare(
      "DELETE FROM enterprise_user_skill_installs WHERE id = ? AND account_id = ? AND revision = ?",
    )
    .run(id, accountId, baseRevision); // sqlite-allow-raw -- CAS removal after filesystem commit.
  if (result.changes !== 1) {
    throw new Error("EXTENSION_REVISION_CONFLICT");
  }
}

export function createEnterprisePluginRequest(
  input: Omit<
    EnterprisePluginRequest,
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
    | "requesterAccountId"
    | "scope"
    | "agentKey"
    | "runtimeAgentId"
  > & { requesterAccountId: string } & Partial<
      Pick<EnterprisePluginRequest, "scope" | "agentKey" | "runtimeAgentId">
    >,
  options: OpenClawStateDatabaseOptions = {},
): EnterprisePluginRequest {
  ensureEnterpriseSchema(options);
  const target = normalizeEnterpriseExtensionGrantTarget(input);
  const id = generateSecureUuid();
  const now = Date.now();
  openOpenClawStateDatabase(options)
    .db.prepare(
      `INSERT INTO enterprise_plugin_requests
       (id, requester_account_id, scope, agent_key, runtime_agent_id,
        package_name, package_family, exact_version, integrity,
        request_kind, trust_snapshot_json, capability_snapshot_json, capability_digest, state,
        revision, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)`,
    )
    .run(
      id,
      input.requesterAccountId,
      target.scope,
      target.agentKey,
      target.runtimeAgentId,
      input.packageName,
      input.packageFamily,
      input.exactVersion,
      input.integrity,
      input.requestKind,
      JSON.stringify(input.trustSnapshot),
      JSON.stringify(input.capabilitySnapshot),
      input.capabilityDigest,
      now,
      now,
    ); // sqlite-allow-raw -- Exact immutable request snapshot creation.
  return getEnterprisePluginRequest(id, options)!;
}

export function getEnterprisePluginRequest(
  id: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterprisePluginRequest | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_plugin_requests WHERE id = ?")
    .get(id) as Row | undefined; // sqlite-allow-raw -- Primary key request lookup.
  return row ? toPluginRequest(row) : undefined;
}

export function listEnterprisePluginRequests(
  input: { accountId?: string; state?: EnterprisePluginRequestState } = {},
  options: OpenClawStateDatabaseOptions = {},
): EnterprisePluginRequest[] {
  ensureEnterpriseSchema(options);
  const clauses: string[] = [];
  const values: string[] = [];
  if (input.accountId) {
    clauses.push("requester_account_id = ?");
    values.push(input.accountId);
  }
  if (input.state) {
    clauses.push("state = ?");
    values.push(input.state);
  }
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT * FROM enterprise_plugin_requests
       ${clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""}
       ORDER BY created_at DESC, id ASC LIMIT 200`,
    )
    .all(...values) as Row[]; // sqlite-allow-raw -- Bounded admin or account request list.
  return rows.map(toPluginRequest);
}

export function transitionEnterprisePluginRequest(
  input: {
    id: string;
    baseRevision: number;
    from: EnterprisePluginRequestState[];
    to: EnterprisePluginRequestState;
    reviewerAccountId?: string | null;
    decisionReason?: string | null;
    installedPluginId?: string | null;
    safeErrorCode?: string | null;
    scope?: EnterprisePluginRequest["scope"];
    agentKey?: AgentKey | null;
    runtimeAgentId?: string | null;
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterprisePluginRequest {
  ensureEnterpriseSchema(options);
  const current = getEnterprisePluginRequest(input.id, options);
  if (!current) {
    throw new Error("PLUGIN_REQUEST_NOT_FOUND");
  }
  if (current.revision !== input.baseRevision || !input.from.includes(current.state)) {
    throw new Error(`EXTENSION_REVISION_CONFLICT:${current.revision}`);
  }
  const target = normalizeEnterpriseExtensionGrantTarget({
    scope: input.scope ?? current.scope,
    agentKey: input.agentKey ?? current.agentKey,
    runtimeAgentId: input.runtimeAgentId ?? current.runtimeAgentId,
  });
  const now = Date.now();
  const decided = input.to === "rejected" || input.to === "available" ? now : current.decidedAt;
  const result = openOpenClawStateDatabase(options)
    .db.prepare(
      `UPDATE enterprise_plugin_requests SET state = ?, scope = ?, agent_key = ?, runtime_agent_id = ?,
       reviewer_account_id = ?,
       decision_reason = ?, installed_plugin_id = ?, safe_error_code = ?, revision = revision + 1,
       updated_at = ?, decided_at = ? WHERE id = ? AND revision = ? AND state = ?`,
    )
    .run(
      input.to,
      target.scope,
      target.agentKey,
      target.runtimeAgentId,
      input.reviewerAccountId ?? current.reviewerAccountId,
      input.decisionReason ?? current.decisionReason,
      input.installedPluginId ?? current.installedPluginId,
      input.safeErrorCode === undefined ? current.safeErrorCode : input.safeErrorCode,
      now,
      decided,
      input.id,
      input.baseRevision,
      current.state,
    ); // sqlite-allow-raw -- CAS request decision transition.
  if (result.changes !== 1) {
    throw new Error("EXTENSION_REVISION_CONFLICT");
  }
  return getEnterprisePluginRequest(input.id, options)!;
}

export function upsertEnterprisePluginGrant(
  input: Omit<
    EnterpriseAccountPluginGrant,
    | "id"
    | "revision"
    | "createdAt"
    | "updatedAt"
    | "scope"
    | "agentKey"
    | "runtimeAgentId"
    | "approvedByAccountId"
  > &
    Partial<
      Pick<
        EnterpriseAccountPluginGrant,
        "scope" | "agentKey" | "runtimeAgentId" | "approvedByAccountId"
      >
    >,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccountPluginGrant {
  ensureEnterpriseSchema(options);
  const target = normalizeEnterpriseExtensionGrantTarget(input);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const existing = db
        .prepare(
          `SELECT * FROM enterprise_account_plugin_grants
           WHERE scope = ? AND plugin_id = ?
             AND ${target.scope === "account" ? "account_id = ?" : "runtime_agent_id = ?"}
           ORDER BY updated_at DESC, id ASC LIMIT 1`,
        )
        .get(
          target.scope,
          input.pluginId,
          target.scope === "account" ? input.accountId : target.runtimeAgentId,
        ) as Row | undefined; // sqlite-allow-raw -- Scope-aware grant owner lookup.
      const now = Date.now();
      const approvedTools = JSON.stringify([...new Set(input.approvedTools)].toSorted());
      if (existing) {
        const result = db
          .prepare(
            `UPDATE enterprise_account_plugin_grants SET
               account_id = ?, scope = ?, agent_key = ?, runtime_agent_id = ?,
               exact_version = ?, integrity = ?, capability_digest = ?, approved_tools_json = ?,
               source_request_id = ?, approved_by_account_id = ?, state = ?,
               revision = revision + 1, updated_at = ?
             WHERE id = ?`,
          )
          .run(
            input.accountId,
            target.scope,
            target.agentKey,
            target.runtimeAgentId,
            input.exactVersion,
            input.integrity,
            input.capabilityDigest,
            approvedTools,
            input.sourceRequestId,
            input.approvedByAccountId ?? null,
            input.state,
            now,
            String(existing.id),
          );
        if (result.changes !== 1) {
          throw new Error("EXTENSION_REVISION_CONFLICT");
        }
        const updated = db
          .prepare("SELECT * FROM enterprise_account_plugin_grants WHERE id = ?")
          .get(String(existing.id)) as Row | undefined;
        if (!updated) {
          throw new Error("EXTENSION_GRANT_NOT_FOUND");
        }
        return toPluginGrant(updated);
      }
      const id = generateSecureUuid();
      db.prepare(
        `INSERT INTO enterprise_account_plugin_grants
         (id, account_id, scope, agent_key, runtime_agent_id, plugin_id, exact_version, integrity,
          capability_digest, approved_tools_json, source_request_id, approved_by_account_id,
          state, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      ).run(
        id,
        input.accountId,
        target.scope,
        target.agentKey,
        target.runtimeAgentId,
        input.pluginId,
        input.exactVersion,
        input.integrity,
        input.capabilityDigest,
        approvedTools,
        input.sourceRequestId,
        input.approvedByAccountId ?? null,
        input.state,
        now,
        now,
      ); // sqlite-allow-raw -- Scope-aware account/agent grant snapshot upsert.
      const inserted = db
        .prepare("SELECT * FROM enterprise_account_plugin_grants WHERE id = ?")
        .get(id) as Row | undefined;
      if (!inserted) {
        throw new Error("EXTENSION_GRANT_CREATE_FAILED");
      }
      return toPluginGrant(inserted);
    },
    options,
    { operationLabel: "enterprise.extension.plugin.grant.upsert" },
  );
}

export function listEnterpriseAccountPluginGrants(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccountPluginGrant[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        "SELECT * FROM enterprise_account_plugin_grants WHERE account_id = ? ORDER BY updated_at DESC",
      )
      .all(accountId) as Row[]
  ).map(toPluginGrant); // sqlite-allow-raw -- Account-scoped grant compiler input.
}

/**
 * Returns the native grants that may participate in one runtime projection.
 * Account grants are private to the current account. Shared-agent grants are
 * selected solely by the canonical runtime agent id; the owner account is
 * retained for audit and does not become a runtime access boundary.
 */
export function listEnterpriseEffectivePluginGrants(
  accountId: string,
  runtimeAgentId: string,
  projection: { sharedAgentAllowed?: boolean } = {},
  databaseOptions: OpenClawStateDatabaseOptions = {},
): EnterpriseAccountPluginGrant[] {
  ensureEnterpriseSchema(databaseOptions);
  return (
    openOpenClawStateDatabase(databaseOptions)
      .db.prepare(
        `SELECT * FROM enterprise_account_plugin_grants
         WHERE (scope = 'account' AND account_id = ?)
            OR (? = 1 AND scope = 'shared_agent' AND runtime_agent_id = ?)
         ORDER BY updated_at DESC, id ASC`,
      )
      .all(accountId, projection.sharedAgentAllowed === true ? 1 : 0, runtimeAgentId) as Row[]
  ).map(toPluginGrant); // sqlite-allow-raw -- Explicit account/shared-agent runtime projection.
}

export function getEnterprisePluginGrant(
  id: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccountPluginGrant | undefined {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare("SELECT * FROM enterprise_account_plugin_grants WHERE id = ?")
    .get(id) as Row | undefined; // sqlite-allow-raw -- Primary key grant lookup for revoke flows.
  return row ? toPluginGrant(row) : undefined;
}

export function listEnterprisePluginGrantsForPlugin(
  pluginId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccountPluginGrant[] {
  ensureEnterpriseSchema(options);
  return (
    openOpenClawStateDatabase(options)
      .db.prepare(
        "SELECT * FROM enterprise_account_plugin_grants WHERE plugin_id = ? ORDER BY updated_at DESC",
      )
      .all(pluginId) as Row[]
  ).map(toPluginGrant); // sqlite-allow-raw -- Admin impact view for one global plugin.
}

export function transitionEnterprisePluginGrant(
  input: {
    accountId: string | null;
    id: string;
    baseRevision: number;
    state: EnterprisePluginGrantState;
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccountPluginGrant {
  ensureEnterpriseSchema(options);
  const result = openOpenClawStateDatabase(options)
    .db.prepare(
      `UPDATE enterprise_account_plugin_grants SET state = ?, revision = revision + 1,
       updated_at = ? WHERE id = ? AND revision = ?
       AND (account_id = ? OR (account_id IS NULL AND ? IS NULL))`,
    )
    .run(input.state, Date.now(), input.id, input.baseRevision, input.accountId, input.accountId); // sqlite-allow-raw -- Account/agent-owned CAS grant transition.
  if (result.changes !== 1) {
    throw new Error("EXTENSION_REVISION_CONFLICT");
  }
  return getEnterprisePluginGrant(input.id, options)!;
}
