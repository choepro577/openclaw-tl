// Durable Thiên Lý authentication attempts and account identity bindings.
import type { DatabaseSync } from "node:sqlite";
import { isRecord } from "@openclaw/normalization-core/record-coerce";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";

export type ThienLyIdentity = {
  subject: string;
  company_id: number;
  user_id: number;
  staff_code: string;
  display_name: string;
};

export class ThienLyStoreError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
    this.name = "ThienLyStoreError";
  }
}

export type ThienLyAttemptPhase =
  | "waiting"
  | "verifying"
  | "account"
  | "link_required"
  | "agent"
  | "ready"
  | "completed"
  | "cancelled"
  | "failed"
  | "expired";

export type ThienLyAttemptEvent = {
  sequence: number;
  phase: ThienLyAttemptPhase;
  at: number;
};

export type ThienLyAttemptError = {
  code: string;
  message: string;
};

export type ThienLyAttemptAccount = {
  username: string;
  displayName: string;
};

/** Durable attempt record. Secret and account-binding fields are intentionally private to callers. */
export type ThienLyAttempt = {
  id: string;
  phase: ThienLyAttemptPhase;
  events: ThienLyAttemptEvent[];
  expiresAt: number;
  error?: ThienLyAttemptError;
  account?: ThienLyAttemptAccount;
  browserHash: string;
  stateHash: string;
  verifier: string;
  identity?: ThienLyIdentity;
  accountId?: string;
  sessionId?: string;
  sessionExpiresAt?: number;
  linkFailures: number;
  configFingerprint: string;
};

export type ThienLyAttemptPublic = Pick<ThienLyAttempt, "id" | "phase" | "events" | "expiresAt"> & {
  error?: ThienLyAttemptError;
  account?: ThienLyAttemptAccount;
};

export type ThienLyAttemptPatch = {
  phase?: ThienLyAttemptPhase;
  error?: ThienLyAttemptError | null;
  identity?: ThienLyIdentity | null;
  accountId?: string | null;
  sessionId?: string | null;
  sessionExpiresAt?: number | null;
  linkFailures?: number;
  account?: ThienLyAttemptAccount | null;
};

export type ThienLyBinding = {
  subject: string;
  accountId: string;
  staffCode: string;
  username: string;
};

const THIENLY_ATTEMPT_TTL_MS = 10 * 60 * 1_000;
const THIENLY_ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1_000;
const THIENLY_MAX_ACTIVE_ATTEMPTS_PER_BROWSER = 5;
const THIENLY_EXPIRATION_CLEANUP_BATCH = 200;
const TERMINAL_PHASES = ["completed", "cancelled", "failed", "expired"] as const;
const TERMINAL_PHASE_SET = new Set<ThienLyAttemptPhase>(TERMINAL_PHASES);

const THIENLY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS enterprise_thienly_attempts (
  id TEXT NOT NULL PRIMARY KEY,
  browser_hash TEXT NOT NULL,
  state_hash TEXT NOT NULL UNIQUE,
  verifier TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('waiting', 'verifying', 'account', 'link_required', 'agent', 'ready', 'completed', 'cancelled', 'failed', 'expired')),
  events_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,
  identity_json TEXT,
  account_id TEXT,
  session_id TEXT,
  session_expires_at INTEGER,
  link_failures INTEGER NOT NULL DEFAULT 0 CHECK (link_failures >= 0),
  config_fingerprint TEXT NOT NULL,
  account_username TEXT,
  account_display_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_thienly_attempts_browser
  ON enterprise_thienly_attempts(browser_hash, expires_at, created_at);

CREATE TABLE IF NOT EXISTS enterprise_thienly_bindings (
  subject TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  staff_code TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES enterprise_accounts(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_enterprise_thienly_bindings_account
  ON enterprise_thienly_bindings(account_id);
`;

type ThienLyAttemptRow = {
  id: string;
  browser_hash: string;
  state_hash: string;
  verifier: string;
  phase: string;
  events_json: string;
  expires_at: number;
  error_code: string | null;
  error_message: string | null;
  identity_json: string | null;
  account_id: string | null;
  session_id: string | null;
  session_expires_at: number | null;
  link_failures: number;
  config_fingerprint: string;
  account_username: string | null;
  account_display_name: string | null;
  created_at: number;
  updated_at: number;
};

type ThienLyBindingRow = {
  subject: string;
  account_id: string;
  staff_code: string;
  username: string;
};

const ensuredThienLyDatabases = new WeakSet<DatabaseSync>();

function hasThienLySchema(db: DatabaseSync): boolean {
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name IN ('enterprise_thienly_attempts', 'enterprise_thienly_bindings')`,
    )
    .all() as Array<{ name: string }>; // sqlite-allow-raw -- Feature-local schema presence check.
  return rows.length === 2;
}

function ensureThienLySchema(options: OpenClawStateDatabaseOptions = {}): void {
  ensureEnterpriseSchema(options);
  const database = openOpenClawStateDatabase(options);
  if (ensuredThienLyDatabases.has(database.db) && hasThienLySchema(database.db)) {
    return;
  }
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.exec(THIENLY_SCHEMA_SQL); // sqlite-allow-raw -- Feature-local additive DDL is fixed and idempotent.
    },
    { ...options, database },
    { operationLabel: "enterprise.thienly.schema.ensure" },
  );
  ensuredThienLyDatabases.add(database.db);
}

function requireText(value: string, code: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(code);
  }
  return value;
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function normalizeIdentity(identity: ThienLyIdentity): ThienLyIdentity {
  const subject = requireText(identity.subject, "THIENLY_SUBJECT_REQUIRED").trim();
  const staffCode = requireText(identity.staff_code, "THIENLY_STAFF_CODE_REQUIRED");
  const displayName = requireText(identity.display_name, "THIENLY_DISPLAY_NAME_REQUIRED").trim();
  if (
    !isSafeInteger(identity.company_id) ||
    identity.company_id <= 0 ||
    !isSafeInteger(identity.user_id) ||
    identity.user_id <= 0
  ) {
    throw new Error("THIENLY_IDENTITY_INVALID");
  }
  return {
    subject,
    company_id: identity.company_id,
    user_id: identity.user_id,
    staff_code: staffCode,
    display_name: displayName,
  };
}

function normalizeAttemptAccount(account: ThienLyAttemptAccount): ThienLyAttemptAccount {
  return {
    username: requireText(account.username, "THIENLY_ACCOUNT_USERNAME_REQUIRED").trim(),
    displayName: requireText(account.displayName, "THIENLY_ACCOUNT_DISPLAY_NAME_REQUIRED").trim(),
  };
}

function normalizeAttemptError(error: ThienLyAttemptError): ThienLyAttemptError {
  return {
    code: requireText(error.code, "THIENLY_ERROR_CODE_REQUIRED").trim().slice(0, 128),
    message: requireText(error.message, "THIENLY_ERROR_MESSAGE_REQUIRED").trim().slice(0, 1_000),
  };
}

function normalizeAttemptId(id: string): string {
  return requireText(id, "THIENLY_ATTEMPT_ID_REQUIRED").trim();
}

function normalizeStateHash(stateHash: string): string {
  return requireText(stateHash, "THIENLY_STATE_HASH_REQUIRED").trim();
}

function parsePhase(value: string): ThienLyAttemptPhase {
  if (
    value === "waiting" ||
    value === "verifying" ||
    value === "account" ||
    value === "link_required" ||
    value === "agent" ||
    value === "ready" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "failed" ||
    value === "expired"
  ) {
    return value;
  }
  throw new Error("THIENLY_ATTEMPT_PHASE_INVALID");
}

function parseEvents(value: string): ThienLyAttemptEvent[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error("THIENLY_ATTEMPT_EVENTS_INVALID");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("THIENLY_ATTEMPT_EVENTS_INVALID");
  }
  const events = parsed.map((event) => {
    if (
      !isRecord(event) ||
      !isSafeInteger(event.sequence) ||
      !isSafeInteger(event.at) ||
      typeof event.phase !== "string"
    ) {
      throw new Error("THIENLY_ATTEMPT_EVENTS_INVALID");
    }
    return {
      sequence: event.sequence,
      phase: parsePhase(event.phase),
      at: event.at,
    } satisfies ThienLyAttemptEvent;
  });
  if (
    events.length === 0 ||
    events.some((event, index) => event.sequence !== index + 1) ||
    events.some((event, index) => index > 0 && event.at < events[index - 1]!.at)
  ) {
    throw new Error("THIENLY_ATTEMPT_EVENTS_INVALID");
  }
  return events;
}

function parseIdentity(value: string | null): ThienLyIdentity | undefined {
  if (!value) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error("THIENLY_IDENTITY_INVALID");
  }
  if (
    !isRecord(parsed) ||
    typeof parsed.subject !== "string" ||
    !isSafeInteger(parsed.company_id) ||
    !isSafeInteger(parsed.user_id) ||
    typeof parsed.staff_code !== "string" ||
    typeof parsed.display_name !== "string"
  ) {
    throw new Error("THIENLY_IDENTITY_INVALID");
  }
  return normalizeIdentity({
    subject: parsed.subject,
    company_id: parsed.company_id,
    user_id: parsed.user_id,
    staff_code: parsed.staff_code,
    display_name: parsed.display_name,
  });
}

function toAttempt(row: ThienLyAttemptRow): ThienLyAttempt {
  const phase = parsePhase(row.phase);
  const events = parseEvents(row.events_json);
  const identity = parseIdentity(row.identity_json);
  const error =
    row.error_code !== null && row.error_message !== null
      ? { code: row.error_code, message: row.error_message }
      : undefined;
  const account =
    row.account_username !== null && row.account_display_name !== null
      ? { username: row.account_username, displayName: row.account_display_name }
      : undefined;
  return {
    id: row.id,
    phase,
    events,
    expiresAt: row.expires_at,
    ...(error ? { error } : {}),
    ...(account ? { account } : {}),
    browserHash: row.browser_hash,
    stateHash: row.state_hash,
    verifier: row.verifier,
    ...(identity ? { identity } : {}),
    ...(row.account_id ? { accountId: row.account_id } : {}),
    ...(row.session_id ? { sessionId: row.session_id } : {}),
    ...(row.session_expires_at !== null ? { sessionExpiresAt: row.session_expires_at } : {}),
    linkFailures: row.link_failures,
    configFingerprint: row.config_fingerprint,
  };
}

function readAttempt(db: DatabaseSync, id: string): ThienLyAttemptRow | undefined {
  return db.prepare("SELECT * FROM enterprise_thienly_attempts WHERE id = ? LIMIT 1").get(id) as
    | ThienLyAttemptRow
    | undefined; // sqlite-allow-raw -- Exact attempt lookup by opaque id.
}

function appendPhaseEvent(events: ThienLyAttemptEvent[], phase: ThienLyAttemptPhase, at: number) {
  return [...events, { sequence: events.length + 1, phase, at } satisfies ThienLyAttemptEvent];
}

function expireAttemptIfNeeded(
  id: string,
  options: OpenClawStateDatabaseOptions,
): ThienLyAttempt | undefined {
  const database = openOpenClawStateDatabase(options);
  const now = Date.now();
  const row = readAttempt(database.db, id);
  if (!row) {
    return undefined;
  }
  if (row.expires_at > now || TERMINAL_PHASE_SET.has(parsePhase(row.phase))) {
    return toAttempt(row);
  }
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      const current = readAttempt(db, id);
      if (
        !current ||
        current.expires_at > now ||
        TERMINAL_PHASE_SET.has(parsePhase(current.phase))
      ) {
        return;
      }
      const events = appendPhaseEvent(parseEvents(current.events_json), "expired", now);
      db.prepare(
        `UPDATE enterprise_thienly_attempts
         SET phase = 'expired', events_json = ?, error_code = ?, error_message = ?, updated_at = ?
         WHERE id = ? AND phase = ? AND expires_at <= ?`,
      ).run(
        JSON.stringify(events),
        "THIENLY_ATTEMPT_EXPIRED",
        "The Thiên Lý authentication attempt expired.",
        now,
        id,
        current.phase,
        now,
      ); // sqlite-allow-raw -- Expiry is an owner-scoped terminal transition.
    },
    { ...options, database },
    { operationLabel: "enterprise.thienly.attempt.expire" },
  );
  const expired = readAttempt(database.db, id);
  return expired ? toAttempt(expired) : undefined;
}

export function createThienLyAttempt(
  input: {
    browserHash: string;
    stateHash: string;
    verifier: string;
    configFingerprint: string;
  },
  options: OpenClawStateDatabaseOptions = {},
): ThienLyAttempt {
  ensureThienLySchema(options);
  const browserHash = requireText(input.browserHash, "THIENLY_BROWSER_HASH_REQUIRED");
  const stateHash = normalizeStateHash(input.stateHash);
  const verifier = requireText(input.verifier, "THIENLY_VERIFIER_REQUIRED");
  const configFingerprint = requireText(
    input.configFingerprint,
    "THIENLY_CONFIG_FINGERPRINT_REQUIRED",
  );
  const id = generateSecureUuid();
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const now = Date.now();
      const retentionCutoff = now - THIENLY_ATTEMPT_RETENTION_MS;
      db.prepare(
        `DELETE FROM enterprise_thienly_attempts
         WHERE id IN (
           SELECT id FROM enterprise_thienly_attempts
           WHERE expires_at <= ? ORDER BY expires_at ASC LIMIT ?
         )`,
      ).run(retentionCutoff, THIENLY_EXPIRATION_CLEANUP_BATCH); // sqlite-allow-raw -- Bounded expired-attempt retention cleanup.
      const active = db
        .prepare(
          `SELECT COUNT(*) AS count FROM enterprise_thienly_attempts
           WHERE browser_hash = ? AND expires_at > ?
             AND phase NOT IN ('completed', 'cancelled', 'failed', 'expired')`,
        )
        .get(browserHash, now) as { count: number }; // sqlite-allow-raw -- Browser-scoped active attempt cap.
      if (active.count >= THIENLY_MAX_ACTIVE_ATTEMPTS_PER_BROWSER) {
        throw new ThienLyStoreError("THIENLY_RATE_LIMITED", 429);
      }
      const expiresAt = now + THIENLY_ATTEMPT_TTL_MS;
      const events = [{ sequence: 1, phase: "waiting" as const, at: now }];
      db.prepare(
        `INSERT INTO enterprise_thienly_attempts
         (id, browser_hash, state_hash, verifier, phase, events_json, expires_at,
          error_code, error_message, identity_json, account_id, session_id, session_expires_at,
          link_failures, config_fingerprint, account_username, account_display_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'waiting', ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, 0, ?, NULL, NULL, ?, ?)`,
      ).run(
        id,
        browserHash,
        stateHash,
        verifier,
        JSON.stringify(events),
        expiresAt,
        configFingerprint,
        now,
        now,
      ); // sqlite-allow-raw -- Durable one-time Thiên Lý attempt creation.
      return toAttempt(readAttempt(db, id)!);
    },
    options,
    { operationLabel: "enterprise.thienly.attempt.create" },
  );
}

export function getThienLyAttempt(
  id: string,
  options: OpenClawStateDatabaseOptions = {},
): ThienLyAttempt | undefined {
  ensureThienLySchema(options);
  return expireAttemptIfNeeded(normalizeAttemptId(id), options);
}

export function findThienLyAttemptByState(
  stateHash: string,
  options: OpenClawStateDatabaseOptions = {},
): ThienLyAttempt | undefined {
  ensureThienLySchema(options);
  const normalized = normalizeStateHash(stateHash);
  const database = openOpenClawStateDatabase(options);
  const row = database.db
    .prepare("SELECT id FROM enterprise_thienly_attempts WHERE state_hash = ? LIMIT 1")
    .get(normalized) as { id: string } | undefined; // sqlite-allow-raw -- Exact state-hash lookup.
  return row ? expireAttemptIfNeeded(row.id, options) : undefined;
}

export function updateThienLyAttempt(
  id: string,
  expectedPhases: readonly ThienLyAttemptPhase[],
  patch: ThienLyAttemptPatch,
  options: OpenClawStateDatabaseOptions = {},
): ThienLyAttempt {
  ensureThienLySchema(options);
  const normalizedId = normalizeAttemptId(id);
  const expected = new Set(expectedPhases);
  if (expected.size === 0) {
    throw new ThienLyStoreError("THIENLY_ATTEMPT_STATE", 409);
  }
  if (patch.phase !== undefined) {
    parsePhase(patch.phase);
  }
  const identity =
    patch.identity === undefined ? undefined : patch.identity && normalizeIdentity(patch.identity);
  const account =
    patch.account === undefined
      ? undefined
      : patch.account && normalizeAttemptAccount(patch.account);
  const error =
    patch.error === undefined ? undefined : patch.error && normalizeAttemptError(patch.error);
  if (
    patch.linkFailures !== undefined &&
    (!Number.isSafeInteger(patch.linkFailures) || patch.linkFailures < 0)
  ) {
    throw new ThienLyStoreError("THIENLY_VERIFICATION_FAILED", 400);
  }
  for (const phase of expected) {
    parsePhase(phase);
  }
  const database = openOpenClawStateDatabase(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const current = readAttempt(db, normalizedId);
      if (!current) {
        throw new ThienLyStoreError("THIENLY_ATTEMPT_NOT_FOUND", 404);
      }
      const currentPhase = parsePhase(current.phase);
      if (!expected.has(currentPhase)) {
        throw new ThienLyStoreError("THIENLY_ATTEMPT_STATE", 409);
      }
      const now = Date.now();
      if (current.expires_at <= now && !TERMINAL_PHASE_SET.has(currentPhase)) {
        const events = appendPhaseEvent(parseEvents(current.events_json), "expired", now);
        db.prepare(
          `UPDATE enterprise_thienly_attempts
           SET phase = 'expired', events_json = ?, error_code = ?, error_message = ?, updated_at = ?
           WHERE id = ? AND phase = ? AND expires_at <= ?`,
        ).run(
          JSON.stringify(events),
          "THIENLY_ATTEMPT_EXPIRED",
          "The Thiên Lý authentication attempt expired.",
          now,
          normalizedId,
          current.phase,
          now,
        ); // sqlite-allow-raw -- CAS expiry fence prevents updates after TTL.
        throw new ThienLyStoreError("THIENLY_ATTEMPT_STATE", 409);
      }
      const nextPhase = patch.phase ?? currentPhase;
      const currentEvents = parseEvents(current.events_json);
      const events =
        nextPhase === currentPhase
          ? currentEvents
          : appendPhaseEvent(currentEvents, nextPhase, now);
      const nextError =
        patch.error === undefined
          ? { code: current.error_code, message: current.error_message }
          : error
            ? { code: error.code, message: error.message }
            : { code: null, message: null };
      const nextIdentity =
        patch.identity === undefined
          ? current.identity_json
          : identity
            ? JSON.stringify(identity)
            : null;
      const nextAccountId =
        patch.accountId === undefined ? current.account_id : patch.accountId?.trim() || null;
      const nextSessionId =
        patch.sessionId === undefined ? current.session_id : patch.sessionId?.trim() || null;
      const nextSessionExpiresAt =
        patch.sessionExpiresAt === undefined ? current.session_expires_at : patch.sessionExpiresAt;
      const nextLinkFailures = patch.linkFailures ?? current.link_failures;
      const nextAccountUsername =
        patch.account === undefined ? current.account_username : (account?.username ?? null);
      const nextAccountDisplayName =
        patch.account === undefined ? current.account_display_name : (account?.displayName ?? null);
      const result = db
        .prepare(
          `UPDATE enterprise_thienly_attempts SET
           phase = ?, events_json = ?, error_code = ?, error_message = ?, identity_json = ?,
           account_id = ?, session_id = ?, session_expires_at = ?, link_failures = ?,
           account_username = ?, account_display_name = ?, updated_at = ?
         WHERE id = ? AND phase = ? AND expires_at > ?`,
        )
        .run(
          nextPhase,
          JSON.stringify(events),
          nextError.code,
          nextError.message,
          nextIdentity,
          nextAccountId,
          nextSessionId,
          nextSessionExpiresAt,
          nextLinkFailures,
          nextAccountUsername,
          nextAccountDisplayName,
          now,
          normalizedId,
          current.phase,
          now,
        ); // sqlite-allow-raw -- Phase and expiry are the optimistic CAS fence.
      if (result.changes !== 1) {
        throw new ThienLyStoreError("THIENLY_ATTEMPT_STATE", 409);
      }
      return toAttempt(readAttempt(db, normalizedId)!);
    },
    { ...options, database },
    { operationLabel: "enterprise.thienly.attempt.update" },
  );
}

export function getThienLyBinding(
  subject: string,
  options: OpenClawStateDatabaseOptions = {},
): ThienLyBinding | undefined {
  ensureThienLySchema(options);
  const normalized = requireText(subject, "THIENLY_SUBJECT_REQUIRED").trim();
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      "SELECT subject, account_id, staff_code, username FROM enterprise_thienly_bindings WHERE subject = ? LIMIT 1",
    )
    .get(normalized) as ThienLyBindingRow | undefined; // sqlite-allow-raw -- Exact Thiên Lý subject lookup.
  return row
    ? {
        subject: row.subject,
        accountId: row.account_id,
        staffCode: row.staff_code,
        username: row.username,
      }
    : undefined;
}

export function getThienLyBindingForAccount(
  accountId: string,
  options: OpenClawStateDatabaseOptions = {},
): ThienLyBinding | undefined {
  ensureThienLySchema(options);
  const normalized = requireText(accountId, "THIENLY_ACCOUNT_ID_REQUIRED").trim();
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      "SELECT subject, account_id, staff_code, username FROM enterprise_thienly_bindings WHERE account_id = ? LIMIT 1",
    )
    .get(normalized) as ThienLyBindingRow | undefined; // sqlite-allow-raw -- Exact account binding lookup.
  return row
    ? {
        subject: row.subject,
        accountId: row.account_id,
        staffCode: row.staff_code,
        username: row.username,
      }
    : undefined;
}

export function bindThienLyIdentity(
  identity: ThienLyIdentity,
  accountId: string,
  username: string,
  options: OpenClawStateDatabaseOptions = {},
): ThienLyBinding {
  ensureThienLySchema(options);
  const normalizedIdentity = normalizeIdentity(identity);
  const normalizedAccountId = requireText(accountId, "THIENLY_ACCOUNT_ID_REQUIRED").trim();
  const normalizedUsername = requireText(username, "THIENLY_USERNAME_REQUIRED")
    .trim()
    .toLowerCase();
  const database = openOpenClawStateDatabase(options);
  return runOpenClawStateWriteTransaction(
    ({ db }) => {
      const bySubject = db
        .prepare(
          "SELECT subject, account_id, staff_code, username FROM enterprise_thienly_bindings WHERE subject = ? LIMIT 1",
        )
        .get(normalizedIdentity.subject) as ThienLyBindingRow | undefined; // sqlite-allow-raw -- Binding subject CAS lookup.
      const byAccount = db
        .prepare(
          "SELECT subject, account_id, staff_code, username FROM enterprise_thienly_bindings WHERE account_id = ? LIMIT 1",
        )
        .get(normalizedAccountId) as ThienLyBindingRow | undefined; // sqlite-allow-raw -- Binding account CAS lookup.
      if (bySubject || byAccount) {
        const same =
          bySubject &&
          byAccount &&
          bySubject.subject === byAccount.subject &&
          bySubject.account_id === normalizedAccountId &&
          bySubject.staff_code === normalizedIdentity.staff_code &&
          bySubject.username === normalizedUsername;
        if (same) {
          return {
            subject: bySubject.subject,
            accountId: bySubject.account_id,
            staffCode: bySubject.staff_code,
            username: bySubject.username,
          };
        }
        throw new ThienLyStoreError("THIENLY_IDENTITY_CONFLICT", 409);
      }
      const now = Date.now();
      db.prepare(
        `INSERT INTO enterprise_thienly_bindings
         (subject, account_id, staff_code, username, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        normalizedIdentity.subject,
        normalizedAccountId,
        normalizedIdentity.staff_code,
        normalizedUsername,
        now,
        now,
      ); // sqlite-allow-raw -- Unique subject/account binding is committed with the caller transaction.
      return {
        subject: normalizedIdentity.subject,
        accountId: normalizedAccountId,
        staffCode: normalizedIdentity.staff_code,
        username: normalizedUsername,
      };
    },
    { ...options, database },
    { operationLabel: "enterprise.thienly.binding.bind" },
  );
}

export function presentThienLyAttempt(attempt: ThienLyAttempt): ThienLyAttemptPublic {
  return {
    id: attempt.id,
    phase: attempt.phase,
    events: attempt.events.map((event) => ({ ...event })),
    expiresAt: attempt.expiresAt,
    ...(attempt.error ? { error: { ...attempt.error } } : {}),
    ...(attempt.account ? { account: { ...attempt.account } } : {}),
  };
}
