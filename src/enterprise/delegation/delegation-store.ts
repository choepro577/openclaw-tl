// Durable Enterprise delegation policy, per-account overrides, and redacted decision events.
import { createHash } from "node:crypto";
import { isRecord } from "@openclaw/normalization-core/record-coerce";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";

export type EnterpriseDelegationRollout = "off" | "shadow" | "on";
export type EnterpriseDelegationHandlingMode =
  | "auto_when_certain"
  | "confirm_before_handoff"
  | "explicit_only"
  | "disabled";
export type EnterpriseDelegationOverrideMode =
  | "inherit"
  | "confirm_before_handoff"
  | "explicit_only"
  | "disabled";

export type EnterpriseDelegationPolicy = {
  rollout: EnterpriseDelegationRollout;
  routerModel: string;
  autoThreshold: number;
  clarifyThreshold: number;
  minimumMargin: number;
  maxDelegatesPerTurn: number;
  eventRetentionDays: number;
  revision: number;
  updatedAt: number;
};

export type EnterpriseDelegationOverride = {
  accountId: string;
  agentResourceKey: string;
  mode: EnterpriseDelegationOverrideMode;
  revision: number;
  updatedAt: number;
};

export type EnterpriseDelegationEvent = {
  id: string;
  accountId: string;
  personalAgentId: string;
  sharedAgentIds: string[];
  childRunIds: string[];
  promptHash: string;
  decisionSource: "explicit" | "rule" | "ai" | "system";
  outcome: "delegated" | "clarified" | "local" | "blocked" | "failed" | "cancelled" | "shadow";
  confidenceBand: "clear" | "ambiguous" | "low" | null;
  reasonCode: string;
  policyRevision: number;
  profileRevisions: Record<string, string>;
  confirmationState: "not_required" | "pending" | "approved" | "denied" | "expired";
  latencyMs: number | null;
  createdAt: number;
};

export type EnterpriseDelegationEventFilters = {
  accountId?: string;
  agentId?: string;
  outcome?: EnterpriseDelegationEvent["outcome"];
  source?: EnterpriseDelegationEvent["decisionSource"];
  reasonCode?: string;
  createdFrom?: number;
  createdTo?: number;
};

const DEFAULT_POLICY: EnterpriseDelegationPolicy = {
  rollout: "off",
  routerModel: "",
  autoThreshold: 0.9,
  clarifyThreshold: 0.7,
  minimumMargin: 0.15,
  maxDelegatesPerTurn: 3,
  eventRetentionDays: 90,
  revision: 0,
  updatedAt: 0,
};

type PolicyRow = {
  rollout: EnterpriseDelegationRollout;
  router_model: string;
  auto_threshold: number;
  clarify_threshold: number;
  minimum_margin: number;
  max_delegates_per_turn: number;
  event_retention_days: number;
  revision: number;
  updated_at: number;
};

type OverrideRow = {
  account_id: string;
  agent_resource_key: string;
  mode: EnterpriseDelegationOverrideMode;
  revision: number;
  updated_at: number;
};

type RevisionCreatedRow = { revision: number; created_at: number };

function isDelegationRollout(value: unknown): value is EnterpriseDelegationRollout {
  return value === "off" || value === "shadow" || value === "on";
}

function isDelegationOverrideMode(value: unknown): value is EnterpriseDelegationOverrideMode {
  return (
    value === "inherit" ||
    value === "confirm_before_handoff" ||
    value === "explicit_only" ||
    value === "disabled"
  );
}

function revisionCreatedRowFromUnknown(value: unknown): RevisionCreatedRow | undefined {
  return isRecord(value) &&
    typeof value.revision === "number" &&
    typeof value.created_at === "number"
    ? { revision: value.revision, created_at: value.created_at }
    : undefined;
}

function accountRevisionFromUnknown(value: unknown): number | undefined {
  return isRecord(value) && typeof value.policy_revision === "number"
    ? value.policy_revision
    : undefined;
}

function policyRowFromUnknown(value: unknown): PolicyRow | undefined {
  if (
    !isRecord(value) ||
    !isDelegationRollout(value.rollout) ||
    typeof value.router_model !== "string" ||
    typeof value.auto_threshold !== "number" ||
    typeof value.clarify_threshold !== "number" ||
    typeof value.minimum_margin !== "number" ||
    typeof value.max_delegates_per_turn !== "number" ||
    typeof value.event_retention_days !== "number" ||
    typeof value.revision !== "number" ||
    typeof value.updated_at !== "number"
  ) {
    return undefined;
  }
  return {
    rollout: value.rollout,
    router_model: value.router_model,
    auto_threshold: value.auto_threshold,
    clarify_threshold: value.clarify_threshold,
    minimum_margin: value.minimum_margin,
    max_delegates_per_turn: value.max_delegates_per_turn,
    event_retention_days: value.event_retention_days,
    revision: value.revision,
    updated_at: value.updated_at,
  };
}

function overrideRowFromUnknown(value: unknown): OverrideRow | undefined {
  if (
    !isRecord(value) ||
    typeof value.account_id !== "string" ||
    typeof value.agent_resource_key !== "string" ||
    !isDelegationOverrideMode(value.mode) ||
    typeof value.revision !== "number" ||
    typeof value.updated_at !== "number"
  ) {
    return undefined;
  }
  return {
    account_id: value.account_id,
    agent_resource_key: value.agent_resource_key,
    mode: value.mode,
    revision: value.revision,
    updated_at: value.updated_at,
  };
}

function policyFromRow(row: PolicyRow): EnterpriseDelegationPolicy {
  return {
    rollout: row.rollout,
    routerModel: row.router_model,
    autoThreshold: row.auto_threshold,
    clarifyThreshold: row.clarify_threshold,
    minimumMargin: row.minimum_margin,
    maxDelegatesPerTurn: row.max_delegates_per_turn,
    eventRetentionDays: row.event_retention_days,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

function overrideFromRow(row: OverrideRow): EnterpriseDelegationOverride {
  return {
    accountId: row.account_id,
    agentResourceKey: row.agent_resource_key,
    mode: row.mode,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

function validRatio(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function validatePolicy(input: Omit<EnterpriseDelegationPolicy, "revision" | "updatedAt">): void {
  if (!(["off", "shadow", "on"] as const).includes(input.rollout)) {
    throw new Error("DELEGATION_ROLLOUT_INVALID");
  }
  if (input.routerModel.length > 256 || /[\0\r\n]/.test(input.routerModel)) {
    throw new Error("DELEGATION_ROUTER_MODEL_INVALID");
  }
  if (
    !validRatio(input.autoThreshold) ||
    !validRatio(input.clarifyThreshold) ||
    !validRatio(input.minimumMargin) ||
    input.clarifyThreshold > input.autoThreshold
  ) {
    throw new Error("DELEGATION_THRESHOLD_INVALID");
  }
  if (
    !Number.isInteger(input.maxDelegatesPerTurn) ||
    input.maxDelegatesPerTurn < 1 ||
    input.maxDelegatesPerTurn > 3
  ) {
    throw new Error("DELEGATION_MAX_AGENTS_INVALID");
  }
  if (
    !Number.isInteger(input.eventRetentionDays) ||
    input.eventRetentionDays < 1 ||
    input.eventRetentionDays > 3650
  ) {
    throw new Error("DELEGATION_RETENTION_INVALID");
  }
  if (input.rollout !== "off" && !input.routerModel.trim()) {
    throw new Error("DELEGATION_ROUTER_MODEL_REQUIRED");
  }
}

export function hashEnterpriseDelegationValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function readEnterpriseDelegationPolicy(
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseDelegationPolicy {
  ensureEnterpriseSchema(options);
  const row = policyRowFromUnknown(
    openOpenClawStateDatabase(options)
      .db.prepare(
        `SELECT rollout, router_model, auto_threshold, clarify_threshold, minimum_margin,
                max_delegates_per_turn, event_retention_days, revision, updated_at
         FROM enterprise_delegation_policy WHERE singleton_id = 1 LIMIT 1`,
      )
      .get(),
  );
  return row ? policyFromRow(row) : { ...DEFAULT_POLICY };
}

export function writeEnterpriseDelegationPolicy(
  baseRevision: number,
  input: Omit<EnterpriseDelegationPolicy, "revision" | "updatedAt">,
  options: OpenClawStateDatabaseOptions = {},
  audit?: {
    actorAccountId: string;
    actorSessionId: string;
    requestId: string | null;
  },
): EnterpriseDelegationPolicy {
  ensureEnterpriseSchema(options);
  validatePolicy(input);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const current = revisionCreatedRowFromUnknown(
        db
          .prepare(
            "SELECT revision, created_at FROM enterprise_delegation_policy WHERE singleton_id = 1",
          )
          .get(),
      );
      const currentRevision = current?.revision ?? 0;
      if (baseRevision !== currentRevision) {
        throw new Error(`DELEGATION_POLICY_REVISION_CONFLICT:${currentRevision}`);
      }
      const now = Date.now();
      const revision = currentRevision + 1;
      db.prepare(
        `INSERT INTO enterprise_delegation_policy
          (singleton_id, rollout, router_model, auto_threshold, clarify_threshold, minimum_margin,
           max_delegates_per_turn, event_retention_days, revision, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(singleton_id) DO UPDATE SET
           rollout = excluded.rollout,
           router_model = excluded.router_model,
           auto_threshold = excluded.auto_threshold,
           clarify_threshold = excluded.clarify_threshold,
           minimum_margin = excluded.minimum_margin,
           max_delegates_per_turn = excluded.max_delegates_per_turn,
           event_retention_days = excluded.event_retention_days,
           revision = excluded.revision,
           updated_at = excluded.updated_at`,
      ).run(
        input.rollout,
        input.routerModel.trim(),
        input.autoThreshold,
        input.clarifyThreshold,
        input.minimumMargin,
        input.maxDelegatesPerTurn,
        input.eventRetentionDays,
        revision,
        current?.created_at ?? now,
        now,
      ); // sqlite-allow-raw -- Typed singleton policy upsert.
      if (audit) {
        db.prepare(
          `INSERT INTO enterprise_audit_events
            (id, actor_account_id, actor_session_id, action, target_type, target_id, request_id,
             before_json, after_json, outcome, created_at)
           VALUES (?, ?, ?, 'delegation.settings.update', 'delegation-policy', 'enterprise', ?, ?, ?, 'success', ?)`,
        ).run(
          generateSecureUuid(),
          audit.actorAccountId,
          audit.actorSessionId,
          audit.requestId,
          JSON.stringify(current ? { revision: currentRevision } : null),
          JSON.stringify({ ...input, revision }),
          now,
        ); // sqlite-allow-raw -- Policy mutation and audit share one transaction.
      }
      return { ...input, routerModel: input.routerModel.trim(), revision, updatedAt: now };
    },
    options,
    { operationLabel: "enterprise.delegation-policy.write" },
  );
}

export function listEnterpriseDelegationOverrides(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseDelegationOverride[] {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT account_id, agent_resource_key, mode, revision, updated_at
       FROM enterprise_delegation_overrides WHERE account_id = ?
       ORDER BY agent_resource_key ASC`,
    )
    .all(accountId)
    .flatMap((row) => {
      const parsed = overrideRowFromUnknown(row);
      return parsed ? [parsed] : [];
    });
  return rows.map(overrideFromRow);
}

export function writeEnterpriseDelegationOverride(
  input: {
    accountId: string;
    agentResourceKey: string;
    mode: EnterpriseDelegationOverrideMode;
    baseRevision: number;
    baseAccountPolicyRevision: number;
  },
  options: OpenClawStateDatabaseOptions = {},
  audit?: {
    actorAccountId: string;
    actorSessionId: string;
    requestId: string | null;
  },
): { override: EnterpriseDelegationOverride; accountPolicyRevision: number } {
  ensureEnterpriseSchema(options);
  if (
    !(["inherit", "confirm_before_handoff", "explicit_only", "disabled"] as const).includes(
      input.mode,
    )
  ) {
    throw new Error("DELEGATION_OVERRIDE_MODE_INVALID");
  }
  if (!input.agentResourceKey.startsWith("agent:shared:") || input.agentResourceKey.length > 256) {
    throw new Error("DELEGATION_OVERRIDE_AGENT_INVALID");
  }
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const accountRevision = accountRevisionFromUnknown(
        db
          .prepare("SELECT policy_revision FROM enterprise_accounts WHERE id = ? LIMIT 1")
          .get(input.accountId),
      );
      if (accountRevision === undefined) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }
      if (accountRevision !== input.baseAccountPolicyRevision) {
        throw new Error(`POLICY_REVISION_CONFLICT:${input.accountId}:${accountRevision}`);
      }
      const current = revisionCreatedRowFromUnknown(
        db
          .prepare(
            `SELECT revision, created_at FROM enterprise_delegation_overrides
             WHERE account_id = ? AND agent_resource_key = ? LIMIT 1`,
          )
          .get(input.accountId, input.agentResourceKey),
      );
      const currentRevision = current?.revision ?? 0;
      if (currentRevision !== input.baseRevision) {
        throw new Error(`DELEGATION_OVERRIDE_REVISION_CONFLICT:${currentRevision}`);
      }
      const now = Date.now();
      const revision = currentRevision + 1;
      db.prepare(
        `INSERT INTO enterprise_delegation_overrides
          (account_id, agent_resource_key, mode, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id, agent_resource_key) DO UPDATE SET
           mode = excluded.mode, revision = excluded.revision, updated_at = excluded.updated_at`,
      ).run(
        input.accountId,
        input.agentResourceKey,
        input.mode,
        revision,
        current?.created_at ?? now,
        now,
      ); // sqlite-allow-raw -- Account-Agent override upsert.
      db.prepare(
        "UPDATE enterprise_accounts SET policy_revision = policy_revision + 1, updated_at = ? WHERE id = ?",
      ).run(now, input.accountId); // sqlite-allow-raw -- Invalidate live routing decisions.
      if (audit) {
        db.prepare(
          `INSERT INTO enterprise_audit_events
            (id, actor_account_id, actor_session_id, action, target_type, target_id, request_id,
             before_json, after_json, outcome, created_at)
           VALUES (?, ?, ?, 'delegation.override.update', 'delegation-override', ?, ?, ?, ?, 'success', ?)`,
        ).run(
          generateSecureUuid(),
          audit.actorAccountId,
          audit.actorSessionId,
          `${input.accountId}:${input.agentResourceKey}`,
          audit.requestId,
          JSON.stringify(current ? { revision: currentRevision } : null),
          JSON.stringify({ mode: input.mode, revision }),
          now,
        ); // sqlite-allow-raw -- Override and audit are atomic.
      }
      return {
        override: {
          accountId: input.accountId,
          agentResourceKey: input.agentResourceKey,
          mode: input.mode,
          revision,
          updatedAt: now,
        },
        accountPolicyRevision: accountRevision + 1,
      };
    },
    options,
    { operationLabel: "enterprise.delegation-override.write" },
  );
}

function safeJsonArray(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function safeJsonRecord(value: unknown): Record<string, string> {
  if (typeof value !== "string") {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

function parseEventDecisionSource(value: unknown): EnterpriseDelegationEvent["decisionSource"] {
  switch (value) {
    case "explicit":
    case "rule":
    case "ai":
    case "system":
      return value;
    default:
      return "system";
  }
}

function parseEventOutcome(value: unknown): EnterpriseDelegationEvent["outcome"] {
  switch (value) {
    case "delegated":
    case "clarified":
    case "local":
    case "blocked":
    case "failed":
    case "cancelled":
    case "shadow":
      return value;
    default:
      return "failed";
  }
}

function parseEventConfirmationState(
  value: unknown,
): EnterpriseDelegationEvent["confirmationState"] {
  switch (value) {
    case "not_required":
    case "pending":
    case "approved":
    case "denied":
    case "expired":
      return value;
    default:
      return "not_required";
  }
}

export function appendEnterpriseDelegationEvent(
  input: Omit<EnterpriseDelegationEvent, "id" | "createdAt" | "promptHash"> & {
    prompt: string;
    parentSessionKey?: string;
    parentRunId?: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseDelegationEvent {
  ensureEnterpriseSchema(options);
  const stored: EnterpriseDelegationEvent = {
    ...input,
    id: generateSecureUuid(),
    promptHash: hashEnterpriseDelegationValue(input.prompt),
    createdAt: Date.now(),
  };
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        `INSERT INTO enterprise_delegation_events
          (id, account_id, personal_agent_id, shared_agent_ids_json, parent_session_key_hash,
           parent_run_id_hash, child_run_ids_json, prompt_hash, decision_source, outcome,
           confidence_band, reason_code, policy_revision, profile_revisions_json,
           confirmation_state, latency_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        stored.id,
        stored.accountId,
        stored.personalAgentId,
        JSON.stringify(stored.sharedAgentIds),
        input.parentSessionKey ? hashEnterpriseDelegationValue(input.parentSessionKey) : null,
        input.parentRunId ? hashEnterpriseDelegationValue(input.parentRunId) : null,
        JSON.stringify(stored.childRunIds),
        stored.promptHash,
        stored.decisionSource,
        stored.outcome,
        stored.confidenceBand,
        stored.reasonCode.slice(0, 128),
        stored.policyRevision,
        JSON.stringify(stored.profileRevisions),
        stored.confirmationState,
        stored.latencyMs,
        stored.createdAt,
      ); // sqlite-allow-raw -- Redacted delegation telemetry insert.
    },
    options,
    { operationLabel: "enterprise.delegation-event.append" },
  );
  return stored;
}

function delegationEventFilterSql(filters: EnterpriseDelegationEventFilters): {
  where: string;
  args: Array<string | number>;
} {
  const clauses: string[] = [];
  const args: Array<string | number> = [];
  if (filters.accountId) {
    clauses.push("account_id = ?");
    args.push(filters.accountId);
  }
  if (filters.outcome) {
    clauses.push("outcome = ?");
    args.push(filters.outcome);
  }
  if (filters.source) {
    clauses.push("decision_source = ?");
    args.push(filters.source);
  }
  if (filters.reasonCode) {
    clauses.push("reason_code = ?");
    args.push(filters.reasonCode);
  }
  if (filters.createdFrom !== undefined) {
    clauses.push("created_at >= ?");
    args.push(filters.createdFrom);
  }
  if (filters.createdTo !== undefined) {
    clauses.push("created_at <= ?");
    args.push(filters.createdTo);
  }
  if (filters.agentId) {
    clauses.push("shared_agent_ids_json LIKE ? ESCAPE '\\'");
    const escaped = filters.agentId
      .replaceAll("\\", "\\\\")
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_");
    args.push(`%\"${escaped}\"%`);
  }
  return { where: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "", args };
}

export function listEnterpriseDelegationEvents(
  filters: EnterpriseDelegationEventFilters & { limit?: number; offset?: number } = {},
  options: OpenClawStateDatabaseOptions = {},
): { events: EnterpriseDelegationEvent[]; total: number; nextCursor: string | null } {
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  const { where, args } = delegationEventFilterSql(filters);
  const limit = Math.max(1, Math.min(filters.limit ?? 50, 200));
  const offset = Math.max(0, filters.offset ?? 0);
  const countRow = db
    .prepare(`SELECT COUNT(*) AS count FROM enterprise_delegation_events ${where}`)
    .get(...args); // sqlite-allow-raw -- Dynamic clauses come only from closed server-owned fragments.
  const total = isRecord(countRow) ? Number(countRow.count ?? 0) : 0;
  const rows = db
    .prepare(
      `SELECT id, account_id, personal_agent_id, shared_agent_ids_json, child_run_ids_json,
              prompt_hash, decision_source, outcome, confidence_band, reason_code,
              policy_revision, profile_revisions_json, confirmation_state, latency_ms, created_at
       FROM enterprise_delegation_events ${where}
       ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset)
    .filter(isRecord); // sqlite-allow-raw -- Closed filter query with bound values.
  const events: EnterpriseDelegationEvent[] = rows.map((row) => ({
    id: String(row.id),
    accountId: String(row.account_id),
    personalAgentId: String(row.personal_agent_id),
    sharedAgentIds: safeJsonArray(row.shared_agent_ids_json),
    childRunIds: safeJsonArray(row.child_run_ids_json),
    promptHash: String(row.prompt_hash),
    decisionSource: parseEventDecisionSource(row.decision_source),
    outcome: parseEventOutcome(row.outcome),
    confidenceBand:
      row.confidence_band === "clear" ||
      row.confidence_band === "ambiguous" ||
      row.confidence_band === "low"
        ? row.confidence_band
        : null,
    reasonCode: String(row.reason_code),
    policyRevision: Number(row.policy_revision),
    profileRevisions: safeJsonRecord(row.profile_revisions_json),
    confirmationState: parseEventConfirmationState(row.confirmation_state),
    latencyMs: typeof row.latency_ms === "number" ? row.latency_ms : null,
    createdAt: Number(row.created_at),
  }));
  return {
    events,
    total,
    nextCursor: offset + limit < total ? String(offset + limit) : null,
  };
}

export function readEnterpriseDelegationOverview(
  options: OpenClawStateDatabaseOptions = {},
  filters: EnterpriseDelegationEventFilters = {},
): {
  totalEvents: number;
  delegated: number;
  clarified: number;
  blocked: number;
  failed: number;
  averageLatencyMs: number | null;
} {
  ensureEnterpriseSchema(options);
  const { where, args } = delegationEventFilterSql(filters);
  const rawRow = openOpenClawStateDatabase(options)
    .db.prepare(
      `WITH filtered_events AS (
         SELECT outcome, reason_code, child_run_ids_json, latency_ms
         FROM enterprise_delegation_events ${where}
       )
       SELECT COUNT(*) AS total_events,
              (SELECT COUNT(DISTINCT child.value)
               FROM filtered_events AS accepted, json_each(accepted.child_run_ids_json) AS child
               WHERE accepted.reason_code IN
                 ('delegate_started', 'delegate_partial_failure', 'delegate_completed')
                 AND child.type = 'text' AND length(trim(child.value)) > 0) AS delegated,
              SUM(CASE WHEN outcome = 'clarified' THEN 1 ELSE 0 END) AS clarified,
              SUM(CASE WHEN outcome = 'blocked' THEN 1 ELSE 0 END) AS blocked,
              SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END) AS failed,
              AVG(latency_ms) AS average_latency_ms
       FROM filtered_events`,
    )
    .get(...args); // sqlite-allow-raw -- Closed filters with bound values.
  const row = isRecord(rawRow) ? rawRow : {};
  return {
    totalEvents: Number(row.total_events ?? 0),
    delegated: Number(row.delegated ?? 0),
    clarified: Number(row.clarified ?? 0),
    blocked: Number(row.blocked ?? 0),
    failed: Number(row.failed ?? 0),
    averageLatencyMs: row.average_latency_ms === null ? null : Number(row.average_latency_ms),
  };
}

export function pruneEnterpriseDelegationEvents(
  retentionDays: number,
  options: OpenClawStateDatabaseOptions = {},
): number {
  ensureEnterpriseSchema(options);
  const cutoff = Date.now() - Math.max(1, retentionDays) * 86_400_000;
  return runOpenClawStateWriteTransaction(
    ({ db }) =>
      Number(
        db.prepare("DELETE FROM enterprise_delegation_events WHERE created_at < ?").run(cutoff)
          .changes,
      ), // sqlite-allow-raw -- Policy-bounded retention cleanup.
    options,
    { operationLabel: "enterprise.delegation-event.prune" },
  );
}

export function activateEnterpriseDelegation(
  input: {
    baseRevision: number;
    expectedAccountRevisions: Record<string, number>;
    exclusions: Array<{ accountId: string; agentResourceKey: string }>;
    audit: {
      actorAccountId: string;
      actorSessionId: string;
      requestId: string | null;
      previewId: string;
    };
  },
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseDelegationPolicy {
  ensureEnterpriseSchema(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const rawCurrentRow = db
        .prepare(
          `SELECT rollout, router_model, auto_threshold, clarify_threshold, minimum_margin,
                  max_delegates_per_turn, event_retention_days, revision, updated_at, created_at
           FROM enterprise_delegation_policy WHERE singleton_id = 1 LIMIT 1`,
        )
        .get(); // sqlite-allow-raw -- Activation CAS read.
      const currentRow = policyRowFromUnknown(rawCurrentRow);
      const currentCreatedAt =
        isRecord(rawCurrentRow) && typeof rawCurrentRow.created_at === "number"
          ? rawCurrentRow.created_at
          : undefined;
      const current = currentRow ? policyFromRow(currentRow) : { ...DEFAULT_POLICY };
      if (current.revision !== input.baseRevision) {
        throw new Error(`DELEGATION_POLICY_REVISION_CONFLICT:${current.revision}`);
      }
      validatePolicy({
        ...current,
        rollout: "on",
      });
      const affectedAccountIds = [...new Set(input.exclusions.map((item) => item.accountId))];
      for (const accountId of affectedAccountIds) {
        const accountRevision = accountRevisionFromUnknown(
          db
            .prepare("SELECT policy_revision FROM enterprise_accounts WHERE id = ? LIMIT 1")
            .get(accountId),
        );
        if (accountRevision === undefined) {
          throw new Error("ACCOUNT_NOT_FOUND");
        }
        if (input.expectedAccountRevisions[accountId] !== accountRevision) {
          throw new Error(`POLICY_REVISION_CONFLICT:${accountId}:${accountRevision}`);
        }
      }
      const now = Date.now();
      for (const exclusion of input.exclusions) {
        if (!exclusion.agentResourceKey.startsWith("agent:shared:")) {
          throw new Error("DELEGATION_OVERRIDE_AGENT_INVALID");
        }
        const currentOverride = revisionCreatedRowFromUnknown(
          db
            .prepare(
              `SELECT revision, created_at FROM enterprise_delegation_overrides
               WHERE account_id = ? AND agent_resource_key = ? LIMIT 1`,
            )
            .get(exclusion.accountId, exclusion.agentResourceKey),
        ); // sqlite-allow-raw -- Activation override revision read.
        db.prepare(
          `INSERT INTO enterprise_delegation_overrides
            (account_id, agent_resource_key, mode, revision, created_at, updated_at)
           VALUES (?, ?, 'disabled', ?, ?, ?)
           ON CONFLICT(account_id, agent_resource_key) DO UPDATE SET
             mode = 'disabled', revision = excluded.revision, updated_at = excluded.updated_at`,
        ).run(
          exclusion.accountId,
          exclusion.agentResourceKey,
          (currentOverride?.revision ?? 0) + 1,
          currentOverride?.created_at ?? now,
          now,
        ); // sqlite-allow-raw -- Snapshot-approved exclusion upsert.
      }
      for (const accountId of affectedAccountIds) {
        db.prepare(
          "UPDATE enterprise_accounts SET policy_revision = policy_revision + 1, updated_at = ? WHERE id = ?",
        ).run(now, accountId); // sqlite-allow-raw -- Invalidate outstanding decisions after exclusion.
      }
      const next = {
        ...current,
        rollout: "on" as const,
        revision: current.revision + 1,
        updatedAt: now,
      };
      db.prepare(
        `INSERT INTO enterprise_delegation_policy
          (singleton_id, rollout, router_model, auto_threshold, clarify_threshold, minimum_margin,
           max_delegates_per_turn, event_retention_days, revision, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(singleton_id) DO UPDATE SET
           rollout = excluded.rollout, router_model = excluded.router_model,
           auto_threshold = excluded.auto_threshold, clarify_threshold = excluded.clarify_threshold,
           minimum_margin = excluded.minimum_margin,
           max_delegates_per_turn = excluded.max_delegates_per_turn,
           event_retention_days = excluded.event_retention_days,
           revision = excluded.revision, updated_at = excluded.updated_at`,
      ).run(
        next.rollout,
        next.routerModel,
        next.autoThreshold,
        next.clarifyThreshold,
        next.minimumMargin,
        next.maxDelegatesPerTurn,
        next.eventRetentionDays,
        next.revision,
        currentCreatedAt ?? now,
        now,
      ); // sqlite-allow-raw -- Atomic activation policy update.
      db.prepare(
        `INSERT INTO enterprise_audit_events
          (id, actor_account_id, actor_session_id, action, target_type, target_id, request_id,
           before_json, after_json, outcome, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'success', ?)`,
      ).run(
        generateSecureUuid(),
        input.audit.actorAccountId,
        input.audit.actorSessionId,
        "delegation.activate",
        "delegation-policy",
        "enterprise",
        input.audit.requestId,
        JSON.stringify({ rollout: current.rollout, revision: current.revision }),
        JSON.stringify({
          rollout: next.rollout,
          revision: next.revision,
          previewId: input.audit.previewId,
          exclusions: input.exclusions,
        }),
        now,
      ); // sqlite-allow-raw -- Audit is committed atomically with activation.
      return next;
    },
    options,
    { operationLabel: "enterprise.delegation.activate" },
  );
}
