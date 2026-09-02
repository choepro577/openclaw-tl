// Redacted Enterprise administration audit trail.
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";

const SENSITIVE_KEY = /password|secret|token|credential|private.?key|authorization/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 200).map((item) => redact(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 200)
      .map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(item, depth + 1),
      ]),
  );
}

export type EnterpriseAuditEvent = {
  id: string;
  actorAccountId: string | null;
  actorSessionId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  requestId: string | null;
  before: unknown;
  after: unknown;
  outcome: "success" | "failure";
  createdAt: number;
};

export function appendEnterpriseAuditEvent(
  event: Omit<EnterpriseAuditEvent, "id" | "createdAt">,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAuditEvent {
  ensureEnterpriseSchema(options);
  const stored: EnterpriseAuditEvent = {
    ...event,
    id: generateSecureUuid(),
    before: redact(event.before),
    after: redact(event.after),
    createdAt: Date.now(),
  };
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        `INSERT INTO enterprise_audit_events
          (id, actor_account_id, actor_session_id, action, target_type, target_id, request_id,
           before_json, after_json, outcome, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        stored.id,
        stored.actorAccountId,
        stored.actorSessionId,
        stored.action.slice(0, 128),
        stored.targetType.slice(0, 64),
        stored.targetId.slice(0, 256),
        stored.requestId?.slice(0, 128) ?? null,
        stored.before === undefined ? null : JSON.stringify(stored.before),
        stored.after === undefined ? null : JSON.stringify(stored.after),
        stored.outcome,
        stored.createdAt,
      );
    },
    options,
    { operationLabel: "enterprise.audit.append" },
  );
  return stored;
}

export function listEnterpriseAuditEvents(
  limit = 100,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAuditEvent[] {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT id, actor_account_id, actor_session_id, action, target_type, target_id, request_id,
              before_json, after_json, outcome, created_at
       FROM enterprise_audit_events ORDER BY created_at DESC LIMIT ?`,
    )
    .all(Math.max(1, Math.min(limit, 500))) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    actorAccountId: typeof row.actor_account_id === "string" ? row.actor_account_id : null,
    actorSessionId: typeof row.actor_session_id === "string" ? row.actor_session_id : null,
    action: String(row.action),
    targetType: String(row.target_type),
    targetId: String(row.target_id),
    requestId: typeof row.request_id === "string" ? row.request_id : null,
    before: typeof row.before_json === "string" ? JSON.parse(row.before_json) : null,
    after: typeof row.after_json === "string" ? JSON.parse(row.after_json) : null,
    outcome: row.outcome === "failure" ? "failure" : "success",
    createdAt: Number(row.created_at),
  }));
}
