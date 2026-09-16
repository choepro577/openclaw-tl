import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { listAgentEntries } from "../../agents/agent-scope.js";
import type { GatewayHttpResponsesConfig } from "../../config/types.gateway.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { ResponseResource } from "../../gateway/open-responses.schema.js";
import {
  handleOpenResponsesHttpRequest,
  type PreAuthorizedOpenResponsesRequest,
} from "../../gateway/openresponses-http.js";
import type { GatewayContextResolver } from "../../gateway/server-methods/types.js";
import { logWarn } from "../../logger.js";
import {
  authenticateDeveloperApiKey,
  claimDeveloperBackgroundResponse,
  completeDeveloperResponse,
  countRunningDeveloperResponses,
  createDeveloperSessionKey,
  deleteExpiredDeveloperData,
  deliverDueDeveloperWebhooks,
  findDeveloperResponseByIdempotencyKey,
  getDeveloperIntegration,
  getDeveloperResponse,
  hasRecoverableDeveloperWork,
  insertDeveloperResponse,
  isDeveloperConversationBusy,
  listQueuedDeveloperResponses,
  recoverInterruptedDeveloperResponses,
  type DeveloperIntegration,
  type DeveloperResponse,
} from "./developer-store.js";

const PUBLIC_PREFIX = "/api/enterprise/developer/v1/responses";
const HARD_BODY_BYTES = 30 * 1024 * 1024;
const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
const DOCUMENT_MIMES = [
  "text/plain",
  "text/markdown",
  "text/html",
  "text/csv",
  "application/json",
  "application/pdf",
] as const;

const Base64SourceSchema = z
  .object({
    type: z.literal("base64"),
    media_type: z.string().min(1),
    data: z.string().min(1),
    filename: z.string().max(255).optional(),
  })
  .strict();
const DeveloperContentPartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("input_text"), text: z.string().min(1) }).strict(),
  z
    .object({ type: z.literal("input_image"), source: Base64SourceSchema.omit({ filename: true }) })
    .strict(),
  z.object({ type: z.literal("input_file"), source: Base64SourceSchema }).strict(),
]);
const DeveloperMessageSchema = z
  .object({
    type: z.literal("message"),
    role: z.literal("user"),
    content: z.union([z.string().min(1), z.array(DeveloperContentPartSchema).min(1)]),
  })
  .strict();
const DeveloperResponseRequestSchema = z
  .object({
    model: z.string().min(1),
    input: z.union([z.string().min(1), z.array(DeveloperMessageSchema).min(1)]),
    stream: z.boolean().optional().default(false),
    background: z.boolean().optional().default(false),
    previous_response_id: z.string().max(128).optional(),
    metadata: z.record(z.string(), z.string()),
    max_output_tokens: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const conversationId = value.metadata.external_conversation_id;
    if (!conversationId || conversationId.length > 512) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metadata", "external_conversation_id"],
        message: "must be between 1 and 512 characters",
      });
    }
    if (value.metadata.external_user_id && value.metadata.external_user_id.length > 512) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metadata", "external_user_id"],
        message: "must be at most 512 characters",
      });
    }
    if (value.stream && value.background) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["background"],
        message: "cannot be enabled with stream",
      });
    }
  });

type DeveloperRequest = z.infer<typeof DeveloperResponseRequestSchema>;
type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();
let workerStarted = false;
let workerBusy = false;
let lastCleanupAt = 0;

function sendJson(res: ServerResponse, status: number, body: unknown): true {
  res.statusCode = status;
  res.setHeader("cache-control", "no-store");
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
  return true;
}

function sendApiError(res: ServerResponse, status: number, code: string, message: string): true {
  return sendJson(res, status, {
    error: {
      code,
      message,
      type: status === 401 ? "authentication_error" : "invalid_request_error",
    },
  });
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  if (req.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    throw new Error("CONTENT_TYPE_REQUIRED");
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > HARD_BODY_BYTES) {
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function bearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  const match = typeof header === "string" ? /^Bearer\s+(.+)$/i.exec(header) : null;
  return match?.[1]?.trim() ?? null;
}

function takeRateToken(integration: DeveloperIntegration): number | null {
  const now = Date.now();
  const current = buckets.get(integration.id) ?? { tokens: integration.burstLimit, updatedAt: now };
  current.tokens = Math.min(
    integration.burstLimit,
    current.tokens + ((now - current.updatedAt) / 60_000) * integration.rateLimitPerMinute,
  );
  current.updatedAt = now;
  if (current.tokens < 1) {
    buckets.set(integration.id, current);
    return Math.max(1, Math.ceil(((1 - current.tokens) * 60) / integration.rateLimitPerMinute));
  }
  current.tokens -= 1;
  buckets.set(integration.id, current);
  return null;
}

function decodedBytes(data: string): number {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 === 1) {
    throw new Error("ATTACHMENT_BASE64_INVALID");
  }
  return Buffer.from(data, "base64").byteLength;
}

function validateAttachments(payload: DeveloperRequest, integration: DeveloperIntegration): void {
  if (!Array.isArray(payload.input)) {
    return;
  }
  let totalBytes = 0;
  for (const item of payload.input) {
    if (typeof item.content === "string") {
      continue;
    }
    for (const part of item.content) {
      if (part.type === "input_text") {
        continue;
      }
      if (integration.uploadPolicy === "disabled") {
        throw new Error("UPLOAD_DISABLED");
      }
      const mime = part.source.media_type.toLowerCase().split(";", 1)[0]!;
      if (part.type === "input_image") {
        if (!IMAGE_MIMES.includes(mime as (typeof IMAGE_MIMES)[number])) {
          throw new Error("ATTACHMENT_MIME_INVALID");
        }
      } else if (
        integration.uploadPolicy !== "images_and_documents" ||
        !DOCUMENT_MIMES.includes(mime as (typeof DOCUMENT_MIMES)[number])
      ) {
        throw new Error("ATTACHMENT_MIME_INVALID");
      }
      totalBytes += decodedBytes(part.source.data);
      if (totalBytes > integration.maxUploadBytes) {
        throw new Error("ATTACHMENT_TOO_LARGE");
      }
    }
  }
}

function runtimeBody(payload: DeveloperRequest): Record<string, unknown> {
  const { background: _background, ...body } = payload;
  return body;
}

function responseBody(record: DeveloperResponse): unknown {
  return (
    record.response ?? {
      id: record.id,
      object: "response",
      status: record.status,
      model: record.agentId,
    }
  );
}

function failedResponseResource(response: DeveloperResponse, message: string): ResponseResource {
  return {
    id: response.id,
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    status: "failed",
    model: response.agentId,
    output: [],
    usage: {
      input_tokens: 0,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
      output_tokens: 0,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: 0,
    },
    error: { code: "background_runtime_error", message },
  };
}

function responseLimits(integration: DeveloperIntegration): GatewayHttpResponsesConfig {
  return {
    maxUrlParts: 0,
    images: {
      allowUrl: false,
      allowedMimes: [...IMAGE_MIMES],
      maxBytes: integration.maxUploadBytes,
    },
    files: {
      allowUrl: false,
      allowedMimes: [...DOCUMENT_MIMES],
      maxBytes: integration.maxUploadBytes,
    },
  };
}

async function runStoredResponse(params: {
  response: DeveloperResponse;
  integration: DeveloperIntegration;
  req: IncomingMessage;
  res: ServerResponse;
  resolveGatewayContext?: GatewayContextResolver;
  detached: boolean;
}): Promise<void> {
  let terminalSeen = false;
  const onTerminalResponse = (terminal: ResponseResource) => {
    terminalSeen = true;
    completeDeveloperResponse(params.response.id, terminal);
  };
  const preAuthorized: PreAuthorizedOpenResponsesRequest = {
    body: runtimeBody(params.response.request as DeveloperRequest),
    agentId: params.integration.agentId,
    sessionKey: params.response.sessionKey,
    authSubject: `integration:${params.integration.id}`,
    responseId: params.response.id,
    messageChannel: "webchat",
    senderIsOwner: false,
    suppressHttpResponse: params.detached,
    onTerminalResponse,
  };
  try {
    await handleOpenResponsesHttpRequest(params.req, params.res, {
      auth: { mode: "none", allowTailscale: false },
      config: responseLimits(params.integration),
      resolveGatewayContext: params.resolveGatewayContext,
      preAuthorized,
    });
    if (params.detached && !terminalSeen) {
      onTerminalResponse(failedResponseResource(params.response, "Background response failed."));
    }
  } catch (error) {
    if (!terminalSeen) {
      onTerminalResponse(failedResponseResource(params.response, "Background response failed."));
    }
    throw error;
  }
}

function ensureDeveloperWorker(
  config: OpenClawConfig,
  resolveGatewayContext?: GatewayContextResolver,
): void {
  if (workerStarted) {
    return;
  }
  workerStarted = true;
  recoverInterruptedDeveloperResponses();
  const tick = async () => {
    if (workerBusy) {
      return;
    }
    workerBusy = true;
    try {
      if (Date.now() - lastCleanupAt >= 60 * 60 * 1000) {
        lastCleanupAt = Date.now();
        await deleteExpiredDeveloperData({}, config);
      }
      const queuedResponses = listQueuedDeveloperResponses();
      const availableAgentIds = new Set(
        queuedResponses.length > 0 ? listAgentEntries(config).map((entry) => entry.id) : [],
      );
      for (const queued of queuedResponses) {
        const integration = getDeveloperIntegration(queued.integrationId);
        if (!integration) {
          continue;
        }
        if (!availableAgentIds.has(integration.agentId)) {
          completeDeveloperResponse(
            queued.id,
            failedResponseResource(queued, "The shared agent is no longer available."),
          );
          continue;
        }
        const claimed = claimDeveloperBackgroundResponse(queued.id);
        if (!claimed) {
          continue;
        }
        void runStoredResponse({
          response: claimed,
          integration,
          req: {} as IncomingMessage,
          res: {} as ServerResponse,
          resolveGatewayContext,
          detached: true,
        }).catch((error: unknown) => {
          logWarn(`enterprise developer background response failed: ${String(error)}`);
          completeDeveloperResponse(
            claimed.id,
            failedResponseResource(claimed, "Background response failed."),
          );
        });
      }
      await deliverDueDeveloperWebhooks();
    } catch (error) {
      logWarn(`enterprise developer worker failed: ${String(error)}`);
    } finally {
      workerBusy = false;
    }
  };
  void tick();
  setInterval(() => void tick(), 1_000).unref();
}

export function resumeEnterpriseDeveloperWorker(
  config: OpenClawConfig,
  resolveGatewayContext?: GatewayContextResolver,
): void {
  if (hasRecoverableDeveloperWork()) {
    ensureDeveloperWorker(config, resolveGatewayContext);
  }
}

export async function handleEnterpriseDeveloperPublicHttpRequest(params: {
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
  config: OpenClawConfig;
  resolveGatewayContext?: GatewayContextResolver;
}): Promise<boolean> {
  const { req, res, pathname, config, resolveGatewayContext } = params;
  const retrieveMatch = /^\/api\/enterprise\/developer\/v1\/responses\/(resp_[a-zA-Z0-9-]+)$/.exec(
    pathname,
  );
  if (pathname !== PUBLIC_PREFIX && !retrieveMatch) {
    return false;
  }
  const integration = authenticateDeveloperApiKey(bearerToken(req) ?? "");
  if (!integration) {
    return sendApiError(
      res,
      401,
      "invalid_api_key",
      "API key không hợp lệ, hết hạn hoặc đã bị thu hồi.",
    );
  }
  if (!listAgentEntries(config).some((entry) => entry.id === integration.agentId)) {
    return sendApiError(res, 403, "agent_not_available", "Shared agent đã gắn không còn tồn tại.");
  }
  if (retrieveMatch?.[1]) {
    if (req.method !== "GET") {
      return sendApiError(res, 405, "method_not_allowed", "Method không được hỗ trợ.");
    }
    const response = getDeveloperResponse(retrieveMatch[1], integration.id);
    return response
      ? sendJson(res, 200, responseBody(response))
      : sendApiError(
          res,
          404,
          "response_not_found",
          "Không tìm thấy response trong Integration này.",
        );
  }
  if (req.method !== "POST") {
    return sendApiError(res, 405, "method_not_allowed", "Method không được hỗ trợ.");
  }
  const retryAfter = takeRateToken(integration);
  if (retryAfter !== null) {
    res.setHeader("retry-after", String(retryAfter));
    return sendApiError(res, 429, "rate_limit_exceeded", "Integration đã vượt giới hạn request.");
  }
  let parsed: DeveloperRequest;
  try {
    const result = DeveloperResponseRequestSchema.safeParse(await readJson(req));
    if (!result.success) {
      const issue = result.error.issues[0];
      return sendApiError(
        res,
        400,
        "invalid_request",
        issue ? `${issue.path.join(".")}: ${issue.message}` : "Request không hợp lệ.",
      );
    }
    parsed = result.data;
    validateAttachments(parsed, integration);
  } catch (error) {
    const message = error instanceof Error ? error.message : "BODY_INVALID";
    const status =
      message === "BODY_TOO_LARGE" || message === "ATTACHMENT_TOO_LARGE"
        ? 413
        : message === "CONTENT_TYPE_REQUIRED"
          ? 415
          : 400;
    return sendApiError(
      res,
      status,
      message.toLowerCase(),
      "Request hoặc attachment không hợp lệ.",
    );
  }
  if (parsed.model !== integration.agentId) {
    return sendApiError(
      res,
      403,
      "model_not_allowed",
      "API key này chỉ được gọi shared agent đã gắn.",
    );
  }
  const idempotencyHeader = req.headers["idempotency-key"];
  const idempotencyKey = Array.isArray(idempotencyHeader)
    ? idempotencyHeader[0]
    : idempotencyHeader;
  if (parsed.background && (!idempotencyKey || idempotencyKey.length > 256)) {
    return sendApiError(
      res,
      400,
      "idempotency_key_required",
      "Background request bắt buộc có Idempotency-Key hợp lệ.",
    );
  }
  if (parsed.background && idempotencyKey) {
    const existing = findDeveloperResponseByIdempotencyKey(integration.id, idempotencyKey);
    if (existing) {
      return sendJson(
        res,
        existing.status === "queued" || existing.status === "in_progress" ? 202 : 200,
        responseBody(existing),
      );
    }
  }
  const conversationId = parsed.metadata.external_conversation_id!;
  if (isDeveloperConversationBusy(integration.id, conversationId)) {
    res.setHeader("retry-after", "1");
    return sendApiError(
      res,
      409,
      "conversation_busy",
      "Conversation đang có một request khác chạy.",
    );
  }
  const running = countRunningDeveloperResponses(integration.id, parsed.background);
  const concurrencyLimit = parsed.background
    ? integration.maxBackgroundConcurrency
    : integration.maxSseConcurrency;
  if (running >= concurrencyLimit) {
    res.setHeader("retry-after", "1");
    return sendApiError(
      res,
      429,
      "concurrency_limit_exceeded",
      "Integration đã đạt giới hạn request đồng thời.",
    );
  }
  const responseId = `resp_${randomUUID()}`;
  let response: DeveloperResponse;
  try {
    response = insertDeveloperResponse({
      id: responseId,
      integration,
      externalConversationId: conversationId,
      externalUserId: parsed.metadata.external_user_id,
      sessionKey: createDeveloperSessionKey(integration.id, integration.agentId, conversationId),
      previousResponseId: parsed.previous_response_id,
      idempotencyKey,
      background: parsed.background,
      request: parsed,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PREVIOUS_RESPONSE_NOT_FOUND") {
      return sendApiError(
        res,
        404,
        "previous_response_not_found",
        "previous_response_id không thuộc conversation này hoặc đã hết hạn.",
      );
    }
    const sqliteCode = (error as { code?: unknown })?.code;
    if (typeof sqliteCode === "string" && sqliteCode.startsWith("SQLITE_CONSTRAINT")) {
      const existing = idempotencyKey
        ? findDeveloperResponseByIdempotencyKey(integration.id, idempotencyKey)
        : null;
      if (existing) {
        return sendJson(
          res,
          existing.status === "queued" || existing.status === "in_progress" ? 202 : 200,
          responseBody(existing),
        );
      }
      res.setHeader("retry-after", "1");
      return sendApiError(
        res,
        409,
        "conversation_busy",
        "Conversation đang có một request khác chạy.",
      );
    }
    throw error;
  }
  if (parsed.background) {
    sendJson(res, 202, responseBody(response));
    ensureDeveloperWorker(config, resolveGatewayContext);
    return true;
  }
  await runStoredResponse({
    response,
    integration,
    req,
    res,
    resolveGatewayContext,
    detached: false,
  });
  return true;
}

export const developerHttpTesting = {
  reset() {
    buckets.clear();
  },
  validateAttachments,
  parseRequest(value: unknown) {
    return DeveloperResponseRequestSchema.safeParse(value);
  },
};
