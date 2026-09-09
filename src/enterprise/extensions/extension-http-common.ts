import type { IncomingMessage, ServerResponse } from "node:http";
import { appendEnterpriseAuditEvent } from "../audit/audit-store.js";
import type { EnterprisePrincipal } from "../auth/auth-service.js";
import {
  requestId,
  sendJson,
  type JsonObject,
} from "../knowledge/enterprise-knowledge-http-common.js";
import type { AgentKey } from "../user/user-api-contracts.js";
import {
  abandonEnterpriseExtensionIdempotency,
  claimEnterpriseExtensionIdempotency,
  completeEnterpriseExtensionIdempotency,
  hashEnterpriseExtensionRequest,
} from "./extension-idempotency-store.js";
import { EnterpriseExtensionError } from "./extension-service.js";

export function validAgentKey(value: string | null): AgentKey {
  if (value === "personal" || value?.startsWith("shared:")) {
    return value as AgentKey;
  }
  throw new EnterpriseExtensionError("AGENT_KEY_INVALID", 422);
}

export function stringField(body: JsonObject, key: string, max = 512): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new EnterpriseExtensionError(`FIELD_INVALID:${key}`, 422);
  }
  return value.trim();
}

export function revisionField(body: JsonObject): number {
  const revision = body.baseRevision;
  if (!Number.isSafeInteger(revision) || Number(revision) < 1) {
    throw new EnterpriseExtensionError("BASE_REVISION_INVALID", 422);
  }
  return Number(revision);
}

export function rejectUnknownFields(body: JsonObject, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(body).find((key) => !allowedSet.has(key));
  if (unknown) {
    throw new EnterpriseExtensionError(`FIELD_NOT_ALLOWED:${unknown}`, 422);
  }
}

export function audit(params: {
  principal: EnterprisePrincipal;
  req: IncomingMessage;
  action: string;
  targetType: string;
  targetId: string;
  outcome: "success" | "failure";
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
    outcome: params.outcome,
  });
}

export async function idempotentMutation<T>(params: {
  req: IncomingMessage;
  res: ServerResponse;
  principal: EnterprisePrincipal;
  audience: "admin" | "user";
  operation: string;
  body: JsonObject;
  status?: number;
  execute: () => Promise<T> | T;
}): Promise<true> {
  const rawKey = params.req.headers["idempotency-key"];
  const key = (Array.isArray(rawKey) ? rawKey[0] : rawKey)?.trim() ?? "";
  const requestHash = hashEnterpriseExtensionRequest(params.body);
  const fence = {
    audience: params.audience,
    actorAccountId: params.principal.account.id,
    operation: params.operation,
    key,
    requestHash,
  } as const;
  const claim = claimEnterpriseExtensionIdempotency(fence);
  if (claim.state === "replay") {
    params.res.setHeader("Idempotency-Replayed", "true");
    return sendJson(params.res, claim.status, claim.response);
  }
  try {
    const response = await params.execute();
    const status = params.status ?? 200;
    completeEnterpriseExtensionIdempotency({ ...fence, responseStatus: status, response });
    audit({
      principal: params.principal,
      req: params.req,
      action: `extension.${params.operation.split(":", 1)[0]}`,
      targetType: "enterprise_extension",
      targetId: params.operation.slice(-160),
      outcome: "success",
      after: { operation: params.operation, status },
    });
    return sendJson(params.res, status, response);
  } catch (error) {
    abandonEnterpriseExtensionIdempotency(fence);
    throw error;
  }
}
