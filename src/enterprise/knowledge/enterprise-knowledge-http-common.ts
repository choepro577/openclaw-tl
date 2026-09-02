import type { IncomingMessage, ServerResponse } from "node:http";
import { generateSecureUuid } from "../../infra/secure-random.js";
import { appendEnterpriseAuditEvent } from "../audit/audit-store.js";
import { authenticateEnterpriseRequest, type EnterprisePrincipal } from "../auth/auth-service.js";
import { verifyEnterpriseCsrfToken } from "../auth/jwt.js";
import { putKnowledgeBlob } from "./artifact-store.js";
import { KNOWLEDGE_NOTE_MAX_BYTES } from "./knowledge-limits.js";
import {
  abandonKnowledgeIdempotency,
  claimKnowledgeIdempotency,
  completeKnowledgeIdempotency,
  createKnowledgeSourceWithVersion,
  getKnowledgeZone,
  getKnowledgeZoneRole,
  hashKnowledgeIdempotencyRequest,
} from "./knowledge-store.js";
import { EnterpriseKnowledgeError, type KnowledgeZoneRole } from "./knowledge-types.js";

export type JsonObject = Record<string, unknown>;
export type KnowledgeAudience = "admin" | "user";
export const requestIds = new WeakMap<IncomingMessage, string>();

export function sendJson(res: ServerResponse, status: number, body: unknown): true {
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
  return true;
}

export function requestId(req: IncomingMessage): string {
  const existing = requestIds.get(req);
  if (existing) {
    return existing;
  }
  const header = req.headers["x-request-id"];
  const value = (Array.isArray(header) ? header[0] : header)?.trim();
  const resolved = value?.slice(0, 128) || generateSecureUuid();
  requestIds.set(req, resolved);
  return resolved;
}

export async function sendIdempotentMutation<T>(params: {
  req: IncomingMessage;
  res: ServerResponse;
  audience: KnowledgeAudience;
  principal: EnterprisePrincipal;
  operation: string;
  request: unknown;
  execute: () => Promise<{ status: number; response: T }> | { status: number; response: T };
}): Promise<true> {
  const rawKey = params.req.headers["idempotency-key"];
  const key = (Array.isArray(rawKey) ? rawKey[0] : rawKey)?.trim() ?? "";
  const requestHash = hashKnowledgeIdempotencyRequest(params.request);
  const claim = claimKnowledgeIdempotency({
    audience: params.audience,
    actorAccountId: params.principal.account.id,
    operation: params.operation,
    key,
    requestHash,
  });
  if (claim.state === "replay") {
    params.res.setHeader("Idempotency-Replayed", "true");
    return sendJson(params.res, claim.status, claim.response);
  }
  let result: { status: number; response: T };
  try {
    result = await params.execute();
  } catch (error) {
    abandonKnowledgeIdempotency({
      audience: params.audience,
      actorAccountId: params.principal.account.id,
      operation: params.operation,
      key,
      requestHash,
    });
    throw error;
  }
  completeKnowledgeIdempotency({
    audience: params.audience,
    actorAccountId: params.principal.account.id,
    operation: params.operation,
    key,
    requestHash,
    responseStatus: result.status,
    response: result.response,
  });
  return sendJson(params.res, result.status, result.response);
}

export function sendError(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): true {
  return sendJson(res, status, {
    code,
    message,
    requestId: requestId(req),
    ...(details ? { details } : {}),
  });
}

export async function readBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const raw of req) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    total += chunk.length;
    if (total > maxBytes) {
      throw new EnterpriseKnowledgeError("BODY_TOO_LARGE", 413, "Request body is too large.");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}

export async function readJson(req: IncomingMessage, maxBytes = 1024 * 1024): Promise<JsonObject> {
  if (req.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    throw new EnterpriseKnowledgeError(
      "CONTENT_TYPE_REQUIRED",
      415,
      "Content-Type must be application/json.",
    );
  }
  const body = await readBody(req, maxBytes);
  if (body.length === 0) {
    return {};
  }
  const value = JSON.parse(body.toString("utf8")) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EnterpriseKnowledgeError("BODY_INVALID", 422, "Request body must be an object.");
  }
  return value as JsonObject;
}

export function stringField(body: JsonObject, key: string, max = 512): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, `${key} is invalid.`);
  }
  return value.trim();
}

export function integerField(body: JsonObject, key: string): number {
  const value = body[key];
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new EnterpriseKnowledgeError("INVALID_INPUT", 422, `${key} is invalid.`);
  }
  return Number(value);
}

export function requirePrincipal(
  req: IncomingMessage,
  audience: KnowledgeAudience,
): EnterprisePrincipal {
  const principal = authenticateEnterpriseRequest(req, audience);
  if (!principal || principal.account.mustChangePassword) {
    throw new EnterpriseKnowledgeError(
      "UNAUTHENTICATED",
      401,
      "The Enterprise session is invalid.",
    );
  }
  if (audience === "admin" && principal.account.role !== "administrator") {
    throw new EnterpriseKnowledgeError("FORBIDDEN", 403, "Administrator access is required.");
  }
  return principal;
}

export function requireMutationCsrf(
  req: IncomingMessage,
  principal: EnterprisePrincipal,
  audience: KnowledgeAudience,
): void {
  if (req.method === "GET" || req.method === "HEAD") {
    return;
  }
  const origin = req.headers.origin;
  const host = req.headers.host;
  const fetchSite = req.headers["sec-fetch-site"];
  let sameOrigin: boolean;
  try {
    sameOrigin = Boolean(origin && host && new URL(origin).host === host);
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin || (fetchSite !== undefined && fetchSite !== "same-origin")) {
    throw new EnterpriseKnowledgeError("ORIGIN_DENIED", 403, "Request origin is not allowed.");
  }
  const raw = req.headers["x-csrf-token"];
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (!verifyEnterpriseCsrfToken(token, principal.sessionId, audience)) {
    throw new EnterpriseKnowledgeError("CSRF_INVALID", 403, "CSRF token is invalid.");
  }
}

export const ROLE_LEVEL: Record<KnowledgeZoneRole, number> = { viewer: 1, curator: 2, manager: 3 };

export function requireZoneAccess(
  zoneId: string,
  principal: EnterprisePrincipal,
  audience: KnowledgeAudience,
  minimum: KnowledgeZoneRole,
): KnowledgeZoneRole {
  const zone = getKnowledgeZone(zoneId);
  if (!zone) {
    throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
  }
  if (audience === "admin") {
    return "manager";
  }
  const role = getKnowledgeZoneRole(zone.id, principal.account.id);
  if (!role || ROLE_LEVEL[role] < ROLE_LEVEL[minimum]) {
    throw new EnterpriseKnowledgeError("ZONE_NOT_FOUND", 404, "Knowledge zone not found.");
  }
  return role;
}

export function canonicalizeUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new EnterpriseKnowledgeError("URL_INVALID", 422, "URL is invalid.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new EnterpriseKnowledgeError(
      "URL_SCHEME_DENIED",
      422,
      "Only HTTP and HTTPS URLs are supported.",
    );
  }
  if (url.username || url.password) {
    throw new EnterpriseKnowledgeError(
      "URL_CREDENTIALS_DENIED",
      422,
      "URL credentials are not allowed.",
    );
  }
  url.hash = "";
  return url.toString();
}

export function auditMutation(params: {
  principal: EnterprisePrincipal;
  action: string;
  targetType: string;
  targetId: string;
  req: IncomingMessage;
  after: unknown;
}): void {
  appendEnterpriseAuditEvent({
    actorAccountId: params.principal.account.id,
    actorSessionId: params.principal.sessionId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    requestId: requestId(params.req),
    before: null,
    after: params.after,
    outcome: "success",
  });
}

export function routeParts(pathname: string, prefix: string): string[] {
  return pathname
    .slice(prefix.length)
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
}

export async function createNoteOrUrl(params: {
  body: JsonObject;
  zoneId: string;
  kind: "note" | "url";
  principal: EnterprisePrincipal;
}): Promise<ReturnType<typeof createKnowledgeSourceWithVersion>> {
  if (params.kind === "note") {
    const content = stringField(params.body, "content", KNOWLEDGE_NOTE_MAX_BYTES);
    const buffer = Buffer.from(content, "utf8");
    if (buffer.length > KNOWLEDGE_NOTE_MAX_BYTES) {
      throw new EnterpriseKnowledgeError("NOTE_TOO_LARGE", 413, "Note exceeds the 256 KiB limit.");
    }
    const blob = await putKnowledgeBlob(buffer);
    return createKnowledgeSourceWithVersion(
      {
        zoneId: params.zoneId,
        kind: "note",
        title: stringField(params.body, "title", 300),
        mimeType: "text/markdown",
        contentHash: blob.hash,
        blobHash: blob.hash,
        byteSize: blob.byteSize,
      },
      params.principal.account.id,
    );
  }
  const canonicalUrl = canonicalizeUrl(stringField(params.body, "url", 4_096));
  const buffer = Buffer.from(
    JSON.stringify({ url: canonicalUrl, crawlSameOrigin: params.body.crawlSameOrigin === true }),
    "utf8",
  );
  const blob = await putKnowledgeBlob(buffer);
  return createKnowledgeSourceWithVersion(
    {
      zoneId: params.zoneId,
      kind: "url",
      title: stringField(params.body, "title", 300),
      canonicalUrl,
      mimeType: "text/uri-list",
      originalName: new URL(canonicalUrl).hostname,
      contentHash: blob.hash,
      blobHash: blob.hash,
      byteSize: blob.byteSize,
    },
    params.principal.account.id,
  );
}
