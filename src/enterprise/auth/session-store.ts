// Revocable Enterprise login sessions persisted in OpenClaw shared state.
import { createHash } from "node:crypto";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";

export const ENTERPRISE_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const ENTERPRISE_SESSION_IDLE_TTL_MS = 2 * 60 * 60 * 1000;
export type EnterprisePortalAudience = "admin" | "user";

type SessionRow = {
  id: string;
  account_id: string;
  expires_at: number;
  created_at: number;
  last_seen_at: number;
  audience: EnterprisePortalAudience | "legacy";
  revoked_at: number | null;
  revoke_reason: string | null;
};

export type EnterpriseSession = {
  id: string;
  accountId: string;
  expiresAt: number;
  createdAt: number;
  lastSeenAt: number;
  audience: EnterprisePortalAudience | "legacy";
  revokedAt: number | null;
  revokeReason: string | null;
};

function sessionStorageId(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

function toSession(row: SessionRow): EnterpriseSession {
  return {
    id: row.id,
    accountId: row.account_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    audience: row.audience,
    revokedAt: row.revoked_at,
    revokeReason: row.revoke_reason,
  };
}

export function createEnterpriseSession(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
  audience: EnterprisePortalAudience = "user",
): { sessionId: string; expiresAt: number } {
  ensureEnterpriseSchema(options);
  const sessionId = generateSecureUuid();
  const now = Date.now();
  const expiresAt = now + ENTERPRISE_SESSION_TTL_MS;
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        `INSERT INTO enterprise_auth_sessions
          (id, account_id, expires_at, created_at, last_seen_at, audience, revoked_at, revoke_reason)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
      ).run(sessionStorageId(sessionId), accountId, expiresAt, now, now, audience); // sqlite-allow-raw -- Fixed feature-local insert.
    },
    options,
    { operationLabel: "enterprise.sessions.create" },
  );
  return { sessionId, expiresAt };
}

export function getActiveEnterpriseSession(
  sessionId: string,
  options: OpenClawStateDatabaseOptions = {},
  audience: EnterprisePortalAudience = "user",
): EnterpriseSession | undefined {
  ensureEnterpriseSchema(options);
  const now = Date.now();
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT * FROM enterprise_auth_sessions
       WHERE id = ? AND audience = ? AND revoked_at IS NULL AND expires_at > ?
         AND last_seen_at > ? LIMIT 1`,
    )
    .get(sessionStorageId(sessionId), audience, now, now - ENTERPRISE_SESSION_IDLE_TTL_MS) as
    | SessionRow
    | undefined; // sqlite-allow-raw -- Fixed feature-local lookup.
  return row ? toSession(row) : undefined;
}

export function touchEnterpriseSession(
  sessionId: string,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        "UPDATE enterprise_auth_sessions SET last_seen_at = ? WHERE id = ? AND revoked_at IS NULL AND expires_at > ?",
      ).run(now, sessionStorageId(sessionId), now); // sqlite-allow-raw -- Fixed feature-local update.
    },
    options,
    { operationLabel: "enterprise.sessions.touch" },
  );
}

export function revokeEnterpriseSession(
  sessionId: string,
  reason: string,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        "UPDATE enterprise_auth_sessions SET revoked_at = ?, revoke_reason = ? WHERE id = ? AND revoked_at IS NULL",
      ).run(now, reason.slice(0, 128), sessionStorageId(sessionId)); // sqlite-allow-raw -- Fixed feature-local update.
    },
    options,
    { operationLabel: "enterprise.sessions.revoke" },
  );
}

export function revokeEnterpriseAccountSessions(
  accountId: string,
  reason: string,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        "UPDATE enterprise_auth_sessions SET revoked_at = ?, revoke_reason = ? WHERE account_id = ? AND revoked_at IS NULL",
      ).run(now, reason.slice(0, 128), accountId); // sqlite-allow-raw -- Fixed feature-local update.
    },
    options,
    { operationLabel: "enterprise.sessions.revoke-account" },
  );
}

export function revokeEnterpriseStoredSession(
  accountId: string,
  storedSessionId: string,
  reason: string,
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        `UPDATE enterprise_auth_sessions SET revoked_at = ?, revoke_reason = ?
         WHERE id = ? AND account_id = ? AND revoked_at IS NULL`,
      ).run(now, reason.slice(0, 128), storedSessionId, accountId); // sqlite-allow-raw -- Admin revokes one account-bound stored session id.
    },
    options,
    { operationLabel: "enterprise.sessions.revoke-stored" },
  );
}

export function listEnterpriseAccountSessions(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseSession[] {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT * FROM enterprise_auth_sessions WHERE account_id = ?
       ORDER BY created_at DESC LIMIT 200`,
    )
    .all(accountId) as SessionRow[]; // sqlite-allow-raw -- Fixed account session inventory.
  return rows.map(toSession);
}
