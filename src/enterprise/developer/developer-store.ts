import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { deleteSessionEntryLifecycle } from "../../config/sessions/session-accessor.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { ResponseResource } from "../../gateway/open-responses.schema.js";
import { readRecentSessionMessagesWithStatsAsync } from "../../gateway/session-transcript-readers.js";
import {
  resolveCanonicalSessionEntryFromStoreKeys,
  resolveGatewaySessionStoreTargetWithStore,
} from "../../gateway/session-utils.js";
import { fetchWithSsrFGuard } from "../../infra/net/fetch-guard.js";
import { resolvePinnedHostnameWithPolicy } from "../../infra/net/ssrf.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  openOpenClawStateDatabase,
  runOpenClawStateWriteTransaction,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { ensureEnterpriseSchema } from "../database/enterprise-schema.js";

export const DEVELOPER_RESPONSE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const DEVELOPER_UPLOAD_MIN_BYTES = 1024 * 1024;
export const DEVELOPER_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const SECRET_KEY_ENV = "OPENCLAW_ENTERPRISE_SKILL_TOKEN_KEY";
const WEBHOOK_RETRY_DELAYS_MS = [0, 5_000, 30_000, 120_000, 600_000, 1_800_000] as const;

export type DeveloperUploadPolicy = "disabled" | "images" | "images_and_documents";
export type DeveloperIntegrationStatus = "active" | "disabled" | "revoked";

type IntegrationRow = {
  id: string;
  agent_id: string;
  name: string;
  status: DeveloperIntegrationStatus;
  key_prefix: string;
  key_hash: string;
  previous_key_prefix: string | null;
  previous_key_hash: string | null;
  previous_key_expires_at: number | null;
  webhook_url: string | null;
  webhook_secret_iv: string;
  webhook_secret_auth_tag: string;
  webhook_secret_ciphertext: string;
  upload_policy: DeveloperUploadPolicy;
  max_upload_bytes: number;
  rate_limit_per_minute: number;
  burst_limit: number;
  max_sse_concurrency: number;
  max_background_concurrency: number;
  request_count: number;
  error_count: number;
  running_count: number;
  last_used_at: number | null;
  last_webhook_at: number | null;
  last_webhook_status: string | null;
  created_at: number;
  updated_at: number;
  revoked_at: number | null;
};

type ResponseRow = {
  id: string;
  integration_id: string;
  agent_id: string;
  external_conversation_id: string;
  external_user_id: string | null;
  session_key: string;
  previous_response_id: string | null;
  idempotency_key: string | null;
  background: number;
  status: "queued" | "in_progress" | "completed" | "failed" | "incomplete";
  request_json: string;
  response_json: string | null;
  usage_json: string | null;
  error_json: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number;
};

type DeliveryRow = {
  event_id: string;
  response_id: string;
  integration_id: string;
  event_type: "response.completed" | "response.failed" | "response.incomplete";
  payload_json: string;
  attempt_count: number;
  webhook_url: string;
  webhook_secret_iv: string;
  webhook_secret_auth_tag: string;
  webhook_secret_ciphertext: string;
};

export type DeveloperIntegration = {
  id: string;
  agentId: string;
  name: string;
  status: DeveloperIntegrationStatus;
  keyPrefix: string;
  previousKeyExpiresAt: number | null;
  webhookUrl: string | null;
  uploadPolicy: DeveloperUploadPolicy;
  maxUploadBytes: number;
  rateLimitPerMinute: number;
  burstLimit: number;
  maxSseConcurrency: number;
  maxBackgroundConcurrency: number;
  requestCount: number;
  errorCount: number;
  runningCount: number;
  lastUsedAt: number | null;
  lastWebhookAt: number | null;
  lastWebhookStatus: string | null;
  createdAt: number;
  updatedAt: number;
};

export type DeveloperResponse = {
  id: string;
  integrationId: string;
  agentId: string;
  externalConversationId: string;
  externalUserId: string | null;
  sessionKey: string;
  previousResponseId: string | null;
  idempotencyKey: string | null;
  background: boolean;
  status: ResponseRow["status"];
  request: Record<string, unknown>;
  response: ResponseResource | null;
  usage: unknown;
  error: unknown;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

function secretKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const encoded = env[SECRET_KEY_ENV]?.trim();
  const key = encoded ? Buffer.from(encoded, "base64") : Buffer.alloc(0);
  if (key.length !== 32) {
    throw new Error("DEVELOPER_SECRET_KEY_UNAVAILABLE");
  }
  return key;
}

function encryptSecret(secret: string, aad: string, env?: NodeJS.ProcessEnv) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(env), iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decryptSecret(row: IntegrationRow | DeliveryRow, env?: NodeJS.ProcessEnv): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    secretKey(env),
    Buffer.from(row.webhook_secret_iv, "base64"),
  );
  decipher.setAAD(Buffer.from("id" in row ? row.id : row.integration_id));
  decipher.setAuthTag(Buffer.from(row.webhook_secret_auth_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.webhook_secret_ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseJson(value: string | null): unknown {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function presentIntegration(row: IntegrationRow): DeveloperIntegration {
  return {
    id: row.id,
    agentId: row.agent_id,
    name: row.name,
    status: row.status,
    keyPrefix: row.key_prefix,
    previousKeyExpiresAt: row.previous_key_expires_at,
    webhookUrl: row.webhook_url,
    uploadPolicy: row.upload_policy,
    maxUploadBytes: row.max_upload_bytes,
    rateLimitPerMinute: row.rate_limit_per_minute,
    burstLimit: row.burst_limit,
    maxSseConcurrency: row.max_sse_concurrency,
    maxBackgroundConcurrency: row.max_background_concurrency,
    requestCount: row.request_count,
    errorCount: row.error_count,
    runningCount: row.running_count,
    lastUsedAt: row.last_used_at,
    lastWebhookAt: row.last_webhook_at,
    lastWebhookStatus: row.last_webhook_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function presentResponse(row: ResponseRow): DeveloperResponse {
  return {
    id: row.id,
    integrationId: row.integration_id,
    agentId: row.agent_id,
    externalConversationId: row.external_conversation_id,
    externalUserId: row.external_user_id,
    sessionKey: row.session_key,
    previousResponseId: row.previous_response_id,
    idempotencyKey: row.idempotency_key,
    background: row.background === 1,
    status: row.status,
    request: (parseJson(row.request_json) ?? {}) as Record<string, unknown>,
    response: parseJson(row.response_json) as ResponseResource | null,
    usage: parseJson(row.usage_json),
    error: parseJson(row.error_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

function integrationById(db: DatabaseSync, integrationId: string): IntegrationRow | undefined {
  return db
    .prepare("SELECT * FROM enterprise_agent_integrations WHERE id = ? LIMIT 1")
    .get(integrationId) as IntegrationRow | undefined; // sqlite-allow-raw -- Fixed integration lookup.
}

function normalizeName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 128) {
    throw new Error("FIELD_INVALID:name");
  }
  return name;
}

export async function validateDeveloperWebhookUrl(
  value: string | null | undefined,
): Promise<string | null> {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("WEBHOOK_URL_INVALID");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("WEBHOOK_URL_INVALID");
  }
  try {
    await resolvePinnedHostnameWithPolicy(parsed.hostname);
  } catch {
    throw new Error("WEBHOOK_URL_INVALID");
  }
  return parsed.toString();
}

export function createDeveloperWebhookSignature(
  secret: string,
  timestamp: string,
  eventId: string,
  rawBody: string,
): string {
  return `v1=${createHmac("sha256", secret)
    .update(timestamp)
    .update(".")
    .update(eventId)
    .update(".")
    .update(rawBody)
    .digest("hex")}`;
}

function validateUploadPolicy(value: string): DeveloperUploadPolicy {
  if (value === "disabled" || value === "images" || value === "images_and_documents") {
    return value;
  }
  throw new Error("FIELD_INVALID:uploadPolicy");
}

function validateMaxUploadBytes(value: number): number {
  if (
    !Number.isInteger(value) ||
    value < DEVELOPER_UPLOAD_MIN_BYTES ||
    value > DEVELOPER_UPLOAD_MAX_BYTES
  ) {
    throw new Error("FIELD_INVALID:maxUploadBytes");
  }
  return value;
}

function createApiKey() {
  const prefix = randomBytes(6).toString("hex");
  return { prefix, token: `ocdev_${prefix}_${randomBytes(32).toString("base64url")}` };
}

export async function createDeveloperIntegration(
  input: {
    agentId: string;
    name: string;
    webhookUrl?: string | null;
    uploadPolicy?: string;
    maxUploadBytes?: number;
  },
  options: OpenClawStateDatabaseOptions = {},
): Promise<{ integration: DeveloperIntegration; apiKey: string; webhookSecret: string }> {
  ensureEnterpriseSchema(options);
  const id = generateSecureUuid();
  const apiKey = createApiKey();
  const webhookSecret = `whsec_${randomBytes(32).toString("base64url")}`;
  const encrypted = encryptSecret(webhookSecret, id, options.env);
  const webhookUrl = await validateDeveloperWebhookUrl(input.webhookUrl);
  const now = Date.now();
  const uploadPolicy = validateUploadPolicy(input.uploadPolicy ?? "disabled");
  const maxUploadBytes = validateMaxUploadBytes(input.maxUploadBytes ?? 10 * 1024 * 1024);
  runOpenClawStateWriteTransaction(
    ({ db }) => {
      db.prepare(
        `INSERT INTO enterprise_agent_integrations (
           id, agent_id, name, key_prefix, key_hash,
           webhook_url, webhook_secret_iv, webhook_secret_auth_tag, webhook_secret_ciphertext,
           upload_policy, max_upload_bytes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.agentId,
        normalizeName(input.name),
        apiKey.prefix,
        tokenHash(apiKey.token),
        webhookUrl,
        encrypted.iv,
        encrypted.authTag,
        encrypted.ciphertext,
        uploadPolicy,
        maxUploadBytes,
        now,
        now,
      ); // sqlite-allow-raw -- Fixed feature-local insert.
    },
    options,
    { operationLabel: "enterprise.developer.integration.create" },
  );
  const row = integrationById(openOpenClawStateDatabase(options).db, id);
  if (!row) {
    throw new Error("INTEGRATION_NOT_FOUND");
  }
  return { integration: presentIntegration(row), apiKey: apiKey.token, webhookSecret };
}

export function listDeveloperIntegrations(
  agentId: string,
  options: OpenClawStateDatabaseOptions = {},
): DeveloperIntegration[] {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      "SELECT * FROM enterprise_agent_integrations WHERE agent_id = ? ORDER BY created_at DESC",
    )
    .all(agentId) as IntegrationRow[]; // sqlite-allow-raw -- Fixed agent-scoped listing.
  return rows.map(presentIntegration);
}

export function getDeveloperIntegration(
  integrationId: string,
  options: OpenClawStateDatabaseOptions = {},
): DeveloperIntegration | null {
  ensureEnterpriseSchema(options);
  const row = integrationById(openOpenClawStateDatabase(options).db, integrationId);
  return row ? presentIntegration(row) : null;
}

export async function updateDeveloperIntegration(
  integrationId: string,
  input: {
    name?: string;
    webhookUrl?: string | null;
    uploadPolicy?: string;
    maxUploadBytes?: number;
    status?: string;
    revokePreviousKey?: boolean;
  },
  options: OpenClawStateDatabaseOptions = {},
): Promise<DeveloperIntegration> {
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  const current = integrationById(db, integrationId);
  if (!current) {
    throw new Error("INTEGRATION_NOT_FOUND");
  }
  if (current.status === "revoked") {
    throw new Error("INTEGRATION_REVOKED");
  }
  const status = input.status ?? current.status;
  if (status !== "active" && status !== "disabled" && status !== "revoked") {
    throw new Error("FIELD_INVALID:status");
  }
  const webhookUrl =
    input.webhookUrl === undefined
      ? current.webhook_url
      : await validateDeveloperWebhookUrl(input.webhookUrl);
  const now = Date.now();
  db.prepare(
    `UPDATE enterprise_agent_integrations SET
       name = ?, webhook_url = ?, upload_policy = ?, max_upload_bytes = ?, status = ?,
       previous_key_prefix = CASE WHEN ? THEN NULL ELSE previous_key_prefix END,
       previous_key_hash = CASE WHEN ? THEN NULL ELSE previous_key_hash END,
       previous_key_expires_at = CASE WHEN ? THEN NULL ELSE previous_key_expires_at END,
       revoked_at = CASE WHEN ? = 'revoked' THEN ? ELSE revoked_at END, updated_at = ?
     WHERE id = ?`,
  ).run(
    input.name === undefined ? current.name : normalizeName(input.name),
    webhookUrl,
    validateUploadPolicy(input.uploadPolicy ?? current.upload_policy),
    validateMaxUploadBytes(input.maxUploadBytes ?? current.max_upload_bytes),
    status,
    input.revokePreviousKey === true ? 1 : 0,
    input.revokePreviousKey === true ? 1 : 0,
    input.revokePreviousKey === true ? 1 : 0,
    status,
    now,
    now,
    integrationId,
  ); // sqlite-allow-raw -- Fixed feature-local update.
  return presentIntegration(integrationById(db, integrationId)!);
}

export function rotateDeveloperApiKey(
  integrationId: string,
  overlapHours = 24,
  options: OpenClawStateDatabaseOptions = {},
): { integration: DeveloperIntegration; apiKey: string } {
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  const current = integrationById(db, integrationId);
  if (!current) {
    throw new Error("INTEGRATION_NOT_FOUND");
  }
  if (current.status === "revoked") {
    throw new Error("INTEGRATION_REVOKED");
  }
  const next = createApiKey();
  const now = Date.now();
  const expiresAt =
    overlapHours === 0 ? now : now + Math.min(24, Math.max(0, overlapHours)) * 3_600_000;
  db.prepare(
    `UPDATE enterprise_agent_integrations SET
       previous_key_prefix = key_prefix, previous_key_hash = key_hash, previous_key_expires_at = ?,
       key_prefix = ?, key_hash = ?, updated_at = ? WHERE id = ?`,
  ).run(expiresAt, next.prefix, tokenHash(next.token), now, integrationId); // sqlite-allow-raw -- Fixed key rotation.
  return {
    integration: presentIntegration(integrationById(db, integrationId)!),
    apiKey: next.token,
  };
}

export function authenticateDeveloperApiKey(
  token: string,
  options: OpenClawStateDatabaseOptions = {},
): DeveloperIntegration | null {
  ensureEnterpriseSchema(options);
  const match = /^ocdev_([a-f0-9]{12})_[A-Za-z0-9_-]{43}$/.exec(token);
  if (!match?.[1]) {
    return null;
  }
  const now = Date.now();
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT * FROM enterprise_agent_integrations
       WHERE status = 'active' AND (key_prefix = ? OR (previous_key_prefix = ? AND previous_key_expires_at > ?))
       LIMIT 1`,
    )
    .get(match[1], match[1], now) as IntegrationRow | undefined; // sqlite-allow-raw -- Prefix narrows constant-time hash verification.
  if (!row) {
    return null;
  }
  const actual = Buffer.from(tokenHash(token), "hex");
  const expectedHash = row.key_prefix === match[1] ? row.key_hash : row.previous_key_hash;
  if (!expectedHash || !timingSafeEqual(actual, Buffer.from(expectedHash, "hex"))) {
    return null;
  }
  return presentIntegration(row);
}

export function createDeveloperSessionKey(
  integrationId: string,
  agentId: string,
  externalConversationId: string,
  env?: NodeJS.ProcessEnv,
): string {
  const digest = createHmac("sha256", secretKey(env))
    .update(integrationId)
    .update("\0")
    .update(externalConversationId)
    .digest("hex");
  return `agent:${agentId}:developer:${digest}`;
}

function responseRowById(db: DatabaseSync, responseId: string): ResponseRow | undefined {
  return db
    .prepare("SELECT * FROM enterprise_developer_responses WHERE id = ? LIMIT 1")
    .get(responseId) as ResponseRow | undefined; // sqlite-allow-raw -- Fixed response lookup.
}

export function getDeveloperResponse(
  responseId: string,
  integrationId?: string,
  options: OpenClawStateDatabaseOptions = {},
): DeveloperResponse | null {
  ensureEnterpriseSchema(options);
  const row = responseRowById(openOpenClawStateDatabase(options).db, responseId);
  if (
    !row ||
    row.expires_at <= Date.now() ||
    (integrationId && row.integration_id !== integrationId)
  ) {
    return null;
  }
  return presentResponse(row);
}

export async function readDeveloperResponseTranscript(
  config: OpenClawConfig,
  response: DeveloperResponse,
): Promise<{ messages: unknown[]; events: unknown[]; totalMessages: number }> {
  const target = resolveGatewaySessionStoreTargetWithStore({
    cfg: config,
    key: response.sessionKey,
    agentId: response.agentId,
    readOnly: true,
  });
  const entry = resolveCanonicalSessionEntryFromStoreKeys(target.store, target.storeKeys);
  if (!entry?.sessionId) {
    return { messages: [], events: [], totalMessages: 0 };
  }
  const result = await readRecentSessionMessagesWithStatsAsync(
    {
      agentId: target.agentId,
      sessionEntry: entry,
      sessionId: entry.sessionId,
      sessionKey: target.canonicalKey,
      storePath: target.storePath,
    },
    { maxMessages: 500, maxLines: 10_000, maxBytes: 8 * 1024 * 1024 },
  );
  return {
    messages: result.messages,
    events: result.transcriptEvents ?? [],
    totalMessages: result.totalMessages,
  };
}

export function findDeveloperResponseByIdempotencyKey(
  integrationId: string,
  idempotencyKey: string,
  options: OpenClawStateDatabaseOptions = {},
): DeveloperResponse | null {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      "SELECT * FROM enterprise_developer_responses WHERE integration_id = ? AND idempotency_key = ? AND expires_at > ? LIMIT 1",
    )
    .get(integrationId, idempotencyKey, Date.now()) as ResponseRow | undefined; // sqlite-allow-raw -- Fixed idempotency lookup.
  return row ? presentResponse(row) : null;
}

export function insertDeveloperResponse(
  input: {
    id: string;
    integration: DeveloperIntegration;
    externalConversationId: string;
    externalUserId?: string;
    sessionKey: string;
    previousResponseId?: string;
    idempotencyKey?: string;
    background: boolean;
    request: Record<string, unknown>;
  },
  options: OpenClawStateDatabaseOptions = {},
): DeveloperResponse {
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  if (input.previousResponseId) {
    const previous = responseRowById(db, input.previousResponseId);
    if (
      !previous ||
      previous.expires_at <= Date.now() ||
      previous.integration_id !== input.integration.id ||
      previous.agent_id !== input.integration.agentId ||
      previous.external_conversation_id !== input.externalConversationId
    ) {
      throw new Error("PREVIOUS_RESPONSE_NOT_FOUND");
    }
  }
  const now = Date.now();
  db.prepare(
    `INSERT INTO enterprise_developer_responses (
       id, integration_id, agent_id, external_conversation_id, external_user_id, session_key,
       previous_response_id, idempotency_key, background, status, request_json, created_at, updated_at, expires_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.integration.id,
    input.integration.agentId,
    input.externalConversationId,
    input.externalUserId ?? null,
    input.sessionKey,
    input.previousResponseId ?? null,
    input.idempotencyKey ?? null,
    input.background ? 1 : 0,
    input.background ? "queued" : "in_progress",
    JSON.stringify(input.request),
    now,
    now,
    now + DEVELOPER_RESPONSE_RETENTION_MS,
  ); // sqlite-allow-raw -- Fixed durable response insert.
  db.prepare(
    `UPDATE enterprise_agent_integrations SET
       request_count = request_count + 1, running_count = running_count + 1,
       last_used_at = ?, updated_at = ? WHERE id = ?`,
  ).run(now, now, input.integration.id); // sqlite-allow-raw -- Fixed integration counters.
  return presentResponse(responseRowById(db, input.id)!);
}

export function claimDeveloperBackgroundResponse(
  responseId: string,
  options: OpenClawStateDatabaseOptions = {},
): DeveloperResponse | null {
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  const result = db
    .prepare(
      "UPDATE enterprise_developer_responses SET status = 'in_progress', updated_at = ? WHERE id = ? AND status = 'queued'",
    )
    .run(Date.now(), responseId); // sqlite-allow-raw -- Atomic durable job claim.
  return result.changes === 1 ? presentResponse(responseRowById(db, responseId)!) : null;
}

export function listQueuedDeveloperResponses(
  limit = 20,
  options: OpenClawStateDatabaseOptions = {},
): DeveloperResponse[] {
  ensureEnterpriseSchema(options);
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      "SELECT * FROM enterprise_developer_responses WHERE background = 1 AND status = 'queued' AND expires_at > ? ORDER BY created_at ASC LIMIT ?",
    )
    .all(Date.now(), Math.max(1, Math.min(100, limit))) as ResponseRow[]; // sqlite-allow-raw -- Bounded durable queue read.
  return rows.map(presentResponse);
}

export function hasRecoverableDeveloperWork(options: OpenClawStateDatabaseOptions = {}): boolean {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT 1 AS found
       WHERE EXISTS (
         SELECT 1 FROM enterprise_developer_responses
         WHERE background = 1 AND status IN ('queued', 'in_progress') AND expires_at > ?
       ) OR EXISTS (
         SELECT 1 FROM enterprise_developer_webhook_deliveries WHERE status = 'pending'
       )`,
    )
    .get(Date.now()) as { found: number } | undefined; // sqlite-allow-raw -- Startup work-presence probe.
  return row?.found === 1;
}

export function countRunningDeveloperResponses(
  integrationId: string,
  background: boolean,
  options: OpenClawStateDatabaseOptions = {},
): number {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      "SELECT COUNT(*) AS count FROM enterprise_developer_responses WHERE integration_id = ? AND background = ? AND status IN ('queued', 'in_progress') AND expires_at > ?",
    )
    .get(integrationId, background ? 1 : 0, Date.now()) as { count: number }; // sqlite-allow-raw -- Fixed concurrency count.
  return row.count;
}

export function isDeveloperConversationBusy(
  integrationId: string,
  externalConversationId: string,
  options: OpenClawStateDatabaseOptions = {},
): boolean {
  ensureEnterpriseSchema(options);
  const row = openOpenClawStateDatabase(options)
    .db.prepare(
      "SELECT 1 AS found FROM enterprise_developer_responses WHERE integration_id = ? AND external_conversation_id = ? AND status IN ('queued', 'in_progress') AND expires_at > ? LIMIT 1",
    )
    .get(integrationId, externalConversationId, Date.now()) as { found: number } | undefined; // sqlite-allow-raw -- Fixed conversation lease lookup.
  return row?.found === 1;
}

export function recoverInterruptedDeveloperResponses(
  options: OpenClawStateDatabaseOptions = {},
): void {
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  const now = Date.now();
  db.prepare(
    "UPDATE enterprise_developer_responses SET status = 'queued', updated_at = ? WHERE background = 1 AND status = 'in_progress' AND expires_at > ?",
  ).run(now, now); // sqlite-allow-raw -- Background jobs are replayable from their durable request.
  const interrupted = db
    .prepare(
      "SELECT id FROM enterprise_developer_responses WHERE background = 0 AND status = 'in_progress'",
    )
    .all() as Array<{ id: string }>; // sqlite-allow-raw -- Recover interrupted foreground streams.
  for (const row of interrupted) {
    completeDeveloperResponse(
      row.id,
      {
        id: row.id,
        object: "response",
        created_at: Math.floor(now / 1000),
        status: "incomplete",
        model: "unknown",
        output: [],
        usage: {
          input_tokens: 0,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
          output_tokens: 0,
          output_tokens_details: { reasoning_tokens: 0 },
          total_tokens: 0,
        },
        error: { code: "runtime_restarted", message: "The runtime restarted before completion." },
      },
      options,
    );
  }
}

export function completeDeveloperResponse(
  responseId: string,
  response: ResponseResource,
  options: OpenClawStateDatabaseOptions = {},
): DeveloperResponse | null {
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  const row = responseRowById(db, responseId);
  if (!row || ["completed", "failed", "incomplete"].includes(row.status)) {
    return row ? presentResponse(row) : null;
  }
  const status =
    response.status === "completed"
      ? "completed"
      : response.status === "incomplete"
        ? "incomplete"
        : "failed";
  const now = Date.now();
  runOpenClawStateWriteTransaction(
    ({ db: writeDb }) => {
      writeDb
        .prepare(
          `UPDATE enterprise_developer_responses SET
           status = ?, response_json = ?, usage_json = ?, error_json = ?, updated_at = ? WHERE id = ?`,
        )
        .run(
          status,
          JSON.stringify(response),
          JSON.stringify(response.usage),
          response.error ? JSON.stringify(response.error) : null,
          now,
          responseId,
        ); // sqlite-allow-raw -- Fixed terminal response update.
      writeDb
        .prepare(
          `UPDATE enterprise_agent_integrations SET
           running_count = MAX(0, running_count - 1),
           error_count = error_count + CASE WHEN ? = 'completed' THEN 0 ELSE 1 END,
           updated_at = ? WHERE id = ?`,
        )
        .run(status, now, row.integration_id); // sqlite-allow-raw -- Fixed terminal counters.
      const integration = integrationById(writeDb, row.integration_id);
      if (row.background === 1 && integration?.webhook_url) {
        const eventId = `evt_${generateSecureUuid()}`;
        const eventType = `response.${status}` as DeliveryRow["event_type"];
        const payload = {
          id: eventId,
          object: "event",
          created_at: Math.floor(now / 1000),
          type: eventType,
          data: { id: responseId },
        };
        writeDb
          .prepare(
            `INSERT INTO enterprise_developer_webhook_deliveries (
             event_id, response_id, integration_id, event_type, payload_json,
             status, attempt_count, next_attempt_at, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
          )
          .run(
            eventId,
            responseId,
            row.integration_id,
            eventType,
            JSON.stringify(payload),
            now,
            now,
            now,
          ); // sqlite-allow-raw -- Fixed webhook enqueue.
      }
    },
    options,
    { operationLabel: "enterprise.developer.response.complete" },
  );
  return presentResponse(responseRowById(db, responseId)!);
}

export function listDeveloperResponses(
  agentId: string,
  filters: {
    integrationId?: string;
    externalConversationId?: string;
    externalUserId?: string;
    status?: string;
    before?: number;
    after?: number;
    limit?: number;
  },
  options: OpenClawStateDatabaseOptions = {},
): DeveloperResponse[] {
  ensureEnterpriseSchema(options);
  const clauses = ["agent_id = ?", "expires_at > ?"];
  const params: Array<string | number> = [agentId, Date.now()];
  for (const [column, value] of [
    ["integration_id", filters.integrationId],
    ["external_conversation_id", filters.externalConversationId],
    ["external_user_id", filters.externalUserId],
    ["status", filters.status],
  ] as const) {
    if (value) {
      clauses.push(`${column} = ?`);
      params.push(value);
    }
  }
  if (filters.before) {
    clauses.push("created_at < ?");
    params.push(filters.before);
  }
  if (filters.after) {
    clauses.push("created_at >= ?");
    params.push(filters.after);
  }
  params.push(Math.max(1, Math.min(100, filters.limit ?? 50)));
  const rows = openOpenClawStateDatabase(options)
    .db.prepare(
      `SELECT * FROM enterprise_developer_responses WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC LIMIT ?`,
    )
    .all(...params) as ResponseRow[]; // sqlite-allow-raw -- Columns are a closed internal list; values remain bound.
  return rows.map(presentResponse);
}

export async function deleteExpiredDeveloperData(
  options: OpenClawStateDatabaseOptions = {},
  config?: OpenClawConfig,
): Promise<number> {
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  const now = Date.now();
  if (config) {
    const expiredSessions = db
      .prepare(
        `SELECT expired.session_key, expired.agent_id
         FROM enterprise_developer_responses expired
         WHERE expired.expires_at <= ?
           AND NOT EXISTS (
             SELECT 1 FROM enterprise_developer_responses current
             WHERE current.session_key = expired.session_key AND current.expires_at > ?
           )
         GROUP BY expired.session_key, expired.agent_id`,
      )
      .all(now, now) as Array<{ session_key: string; agent_id: string }>; // sqlite-allow-raw -- Fixed expired-session cleanup candidates.
    for (const row of expiredSessions) {
      const target = resolveGatewaySessionStoreTargetWithStore({
        cfg: config,
        key: row.session_key,
        agentId: row.agent_id,
        readOnly: true,
      });
      const entry = resolveCanonicalSessionEntryFromStoreKeys(target.store, target.storeKeys);
      if (!entry) {
        continue;
      }
      const result = await deleteSessionEntryLifecycle({
        agentId: target.agentId,
        archiveTranscript: false,
        deleteTranscriptWithoutArchive: true,
        deleteDeliveryArtifacts: true,
        expectedSessionId: entry.sessionId,
        expectedUpdatedAt: entry.updatedAt,
        requireWriteSuccess: true,
        storePath: target.storePath,
        target: { canonicalKey: target.canonicalKey, storeKeys: target.storeKeys },
      });
      if (!result.deleted) {
        throw new Error(`DEVELOPER_TRANSCRIPT_DELETE_RACE:${row.session_key}`);
      }
    }
  }
  return Number(
    db.prepare("DELETE FROM enterprise_developer_responses WHERE expires_at <= ?").run(now).changes,
  ); // sqlite-allow-raw -- Fixed retention cleanup after transcript removal.
}

export async function deliverDueDeveloperWebhooks(
  options: OpenClawStateDatabaseOptions = {},
): Promise<number> {
  ensureEnterpriseSchema(options);
  const db = openOpenClawStateDatabase(options).db;
  const rows = db
    .prepare(
      `SELECT d.*, i.webhook_url, i.webhook_secret_iv, i.webhook_secret_auth_tag, i.webhook_secret_ciphertext
       FROM enterprise_developer_webhook_deliveries d
       JOIN enterprise_agent_integrations i ON i.id = d.integration_id
       WHERE d.status = 'pending' AND d.next_attempt_at <= ? AND i.webhook_url IS NOT NULL
       ORDER BY d.next_attempt_at ASC LIMIT 20`,
    )
    .all(Date.now()) as DeliveryRow[]; // sqlite-allow-raw -- Bounded due-delivery listing.
  for (const row of rows) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createDeveloperWebhookSignature(
      decryptSecret(row, options.env),
      timestamp,
      row.event_id,
      row.payload_json,
    );
    let retryable = true;
    let error = "network_error";
    try {
      const guarded = await fetchWithSsrFGuard({
        url: row.webhook_url,
        requireHttps: true,
        maxRedirects: 0,
        timeoutMs: 10_000,
        auditContext: "enterprise-developer-webhook",
        init: {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "webhook-id": row.event_id,
            "webhook-timestamp": timestamp,
            "webhook-signature": signature,
          },
          body: row.payload_json,
        },
      });
      const status = guarded.response.status;
      await guarded.response.body?.cancel();
      await guarded.release();
      if (status >= 200 && status < 300) {
        const now = Date.now();
        db.prepare(
          "UPDATE enterprise_developer_webhook_deliveries SET status = 'delivered', attempt_count = attempt_count + 1, delivered_at = ?, updated_at = ?, last_error = NULL WHERE event_id = ?",
        ).run(now, now, row.event_id); // sqlite-allow-raw -- Fixed delivery success update.
        db.prepare(
          "UPDATE enterprise_agent_integrations SET last_webhook_at = ?, last_webhook_status = 'delivered', updated_at = ? WHERE id = ?",
        ).run(now, now, row.integration_id); // sqlite-allow-raw -- Fixed webhook status update.
        continue;
      }
      retryable = status === 429 || status >= 500;
      error = `HTTP ${status}`;
    } catch (cause) {
      error = cause instanceof Error ? cause.message.slice(0, 512) : "network_error";
    }
    const attemptCount = row.attempt_count + 1;
    const permanent = !retryable || attemptCount >= WEBHOOK_RETRY_DELAYS_MS.length;
    const now = Date.now();
    const nextAttemptAt = permanent ? now : now + WEBHOOK_RETRY_DELAYS_MS[attemptCount]!;
    db.prepare(
      `UPDATE enterprise_developer_webhook_deliveries SET
         status = ?, attempt_count = ?, next_attempt_at = ?, last_error = ?, updated_at = ? WHERE event_id = ?`,
    ).run(
      permanent ? "permanent_failure" : "pending",
      attemptCount,
      nextAttemptAt,
      error,
      now,
      row.event_id,
    ); // sqlite-allow-raw -- Fixed retry state update.
    db.prepare(
      "UPDATE enterprise_agent_integrations SET last_webhook_at = ?, last_webhook_status = ?, updated_at = ? WHERE id = ?",
    ).run(now, permanent ? "permanent_failure" : "retrying", now, row.integration_id); // sqlite-allow-raw -- Fixed webhook status update.
  }
  return rows.length;
}

export async function testDeveloperWebhook(
  integrationId: string,
  options: OpenClawStateDatabaseOptions = {},
): Promise<{ ok: boolean; status: number }> {
  ensureEnterpriseSchema(options);
  const row = integrationById(openOpenClawStateDatabase(options).db, integrationId);
  if (!row?.webhook_url) {
    throw new Error("WEBHOOK_URL_REQUIRED");
  }
  const now = Date.now();
  const eventId = `evt_${generateSecureUuid()}`;
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    created_at: Math.floor(now / 1000),
    type: "endpoint.test",
    data: { integration_id: integrationId },
  });
  const timestamp = Math.floor(now / 1000).toString();
  const signature = createDeveloperWebhookSignature(
    decryptSecret(row, options.env),
    timestamp,
    eventId,
    payload,
  );
  const guarded = await fetchWithSsrFGuard({
    url: row.webhook_url,
    requireHttps: true,
    maxRedirects: 0,
    timeoutMs: 10_000,
    auditContext: "enterprise-developer-webhook-test",
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": eventId,
        "webhook-timestamp": timestamp,
        "webhook-signature": signature,
      },
      body: payload,
    },
  });
  const status = guarded.response.status;
  await guarded.response.body?.cancel();
  await guarded.release();
  const completedAt = Date.now();
  openOpenClawStateDatabase(options)
    .db.prepare(
      "UPDATE enterprise_agent_integrations SET last_webhook_at = ?, last_webhook_status = ?, updated_at = ? WHERE id = ?",
    )
    .run(
      completedAt,
      status >= 200 && status < 300 ? "test_delivered" : `test_http_${status}`,
      completedAt,
      integrationId,
    ); // sqlite-allow-raw -- Fixed webhook test status update.
  return { ok: status >= 200 && status < 300, status };
}
