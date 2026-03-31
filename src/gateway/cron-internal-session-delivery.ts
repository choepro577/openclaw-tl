import type { OpenClawConfig } from "../config/config.js";
import {
  loadSessionStore,
  resolveAgentMainSessionKey,
  type SessionEntry,
} from "../config/sessions.js";
import { normalizeAgentId, parseAgentSessionKey } from "../routing/session-key.js";
import { isCronRunSessionKey } from "../sessions/session-key-utils.js";
import { deliveryContextFromSession } from "../utils/delivery-context.js";
import { isInternalMessageChannel } from "../utils/message-channel.js";
import { resolveActiveUserSessionTarget } from "./active-user-session-target.js";
import type { GatewayRequestContext } from "./server-methods/types.js";
import { appendAndBroadcastAssistantChatMessage } from "./session-chat-inject.js";
import { createGatewaySession } from "./session-create.js";
import {
  loadCombinedSessionStoreForGateway,
  resolveGatewaySessionStoreTarget,
} from "./session-utils.js";

type InternalFallbackReason = "job-session" | "latest-ui" | "main";

type ResolvedInternalFallbackTarget =
  | {
      ok: true;
      sessionKey: string;
      storePath: string;
      entry: SessionEntry;
      reason: InternalFallbackReason;
    }
  | {
      ok: false;
      error: string;
    };

function isWebchatSessionEntry(entry?: SessionEntry): boolean {
  const channel = deliveryContextFromSession(entry)?.channel ?? entry?.lastChannel;
  return isInternalMessageChannel(channel);
}

function isIgnoredFallbackSessionKey(key: string): boolean {
  if (!key || key === "global" || key === "unknown" || isCronRunSessionKey(key)) {
    return true;
  }
  const parsed = parseAgentSessionKey(key);
  const rest = (parsed?.rest ?? key).trim().toLowerCase();
  return rest.startsWith("cron:") || rest.startsWith("hook:") || rest.startsWith("node:");
}

function findLatestUiSessionKey(params: {
  cfg: OpenClawConfig;
  agentId: string;
}): string | undefined {
  const normalizedAgentId = normalizeAgentId(params.agentId);
  const { store } = loadCombinedSessionStoreForGateway(params.cfg);
  let best:
    | {
        key: string;
        updatedAt: number;
      }
    | undefined;

  for (const [key, entry] of Object.entries(store)) {
    if (!entry?.sessionId || !isWebchatSessionEntry(entry) || isIgnoredFallbackSessionKey(key)) {
      continue;
    }
    const parsed = parseAgentSessionKey(key);
    if (!parsed || normalizeAgentId(parsed.agentId) !== normalizedAgentId) {
      continue;
    }
    const updatedAt = typeof entry.updatedAt === "number" ? entry.updatedAt : 0;
    if (!best || updatedAt >= best.updatedAt) {
      best = { key, updatedAt };
    }
  }

  return best?.key;
}

function loadSessionRecord(params: { cfg: OpenClawConfig; sessionKey: string }) {
  const target = resolveGatewaySessionStoreTarget({
    cfg: params.cfg,
    key: params.sessionKey,
  });
  const store = loadSessionStore(target.storePath);
  const entry = target.storeKeys.map((key) => store[key]).find(Boolean);
  return {
    canonicalKey: target.canonicalKey,
    storePath: target.storePath,
    entry,
  };
}

async function ensureSessionTarget(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
  reason: InternalFallbackReason;
}): Promise<ResolvedInternalFallbackTarget> {
  let lookup = loadSessionRecord({ cfg: params.cfg, sessionKey: params.sessionKey });
  if (!lookup.entry?.sessionId) {
    const created = await createGatewaySession({
      cfg: params.cfg,
      sessionKey: params.sessionKey,
      isWebchat: false,
    });
    if (!created.ok) {
      return {
        ok: false,
        error: created.error.message ?? "failed to create fallback session",
      };
    }
    lookup = loadSessionRecord({ cfg: params.cfg, sessionKey: params.sessionKey });
  }
  if (!lookup.entry?.sessionId || !lookup.storePath) {
    return {
      ok: false,
      error: `session not found for fallback target: ${params.sessionKey}`,
    };
  }
  return {
    ok: true,
    sessionKey: lookup.canonicalKey,
    storePath: lookup.storePath,
    entry: lookup.entry,
    reason: params.reason,
  };
}

export async function resolveCronInternalFallbackTarget(params: {
  cfg: OpenClawConfig;
  agentId: string;
  jobSessionKey?: string;
}): Promise<ResolvedInternalFallbackTarget> {
  const normalizedAgentId = normalizeAgentId(params.agentId);
  const preferredKey = params.jobSessionKey?.trim();
  if (preferredKey) {
    const preferredLookup = loadSessionRecord({ cfg: params.cfg, sessionKey: preferredKey });
    if (preferredLookup.entry?.sessionId && isWebchatSessionEntry(preferredLookup.entry)) {
      return {
        ok: true,
        sessionKey: preferredLookup.canonicalKey,
        storePath: preferredLookup.storePath,
        entry: preferredLookup.entry,
        reason: "job-session",
      };
    }
  }

  const latestUiSessionKey = findLatestUiSessionKey({
    cfg: params.cfg,
    agentId: normalizedAgentId,
  });
  if (latestUiSessionKey) {
    const latestLookup = loadSessionRecord({ cfg: params.cfg, sessionKey: latestUiSessionKey });
    if (latestLookup.entry?.sessionId && latestLookup.storePath) {
      return {
        ok: true,
        sessionKey: latestLookup.canonicalKey,
        storePath: latestLookup.storePath,
        entry: latestLookup.entry,
        reason: "latest-ui",
      };
    }
  }

  return await ensureSessionTarget({
    cfg: params.cfg,
    sessionKey: resolveAgentMainSessionKey({
      cfg: params.cfg,
      agentId: normalizedAgentId,
    }),
    reason: "main",
  });
}

export async function deliverCronResultToInternalSession(params: {
  cfg: OpenClawConfig;
  agentId: string;
  jobSessionKey?: string;
  message: string;
  idempotencyKey: string;
  runId: string;
  context: Pick<GatewayRequestContext, "broadcast" | "nodeSendToSession">;
}): Promise<
  | {
      ok: true;
      delivered: true;
      sessionKey: string;
      reason: InternalFallbackReason;
      duplicate: boolean;
    }
  | { ok: false; error: string }
> {
  const target = await resolveCronInternalFallbackTarget({
    cfg: params.cfg,
    agentId: params.agentId,
    jobSessionKey: params.jobSessionKey,
  });
  if (!target.ok) {
    return target;
  }

  const appended = appendAndBroadcastAssistantChatMessage({
    context: params.context,
    sessionKey: target.sessionKey,
    message: params.message,
    sessionId: target.entry.sessionId,
    storePath: target.storePath,
    sessionFile: target.entry.sessionFile,
    agentId: normalizeAgentId(params.agentId),
    createIfMissing: true,
    idempotencyKey: params.idempotencyKey,
    runId: params.runId,
  });
  if (!appended.ok) {
    return {
      ok: false,
      error: appended.error ?? "failed to append internal fallback message",
    };
  }
  return {
    ok: true,
    delivered: true,
    sessionKey: target.sessionKey,
    reason: target.reason,
    duplicate: appended.duplicate === true,
  };
}

async function appendCronMessageToResolvedTarget(params: {
  target: {
    sessionKey: string;
    storePath: string;
    entry: SessionEntry;
    reason: "active" | "main";
  };
  agentId: string;
  message: string;
  idempotencyKey: string;
  runId: string;
  context: Pick<GatewayRequestContext, "broadcast" | "nodeSendToSession">;
}): Promise<
  | {
      ok: true;
      delivered: true;
      sessionKey: string;
      reason: "active" | "main";
      duplicate: boolean;
    }
  | { ok: false; error: string }
> {
  const appended = appendAndBroadcastAssistantChatMessage({
    context: params.context,
    sessionKey: params.target.sessionKey,
    message: params.message,
    sessionId: params.target.entry.sessionId,
    storePath: params.target.storePath,
    sessionFile: params.target.entry.sessionFile,
    agentId: normalizeAgentId(params.agentId),
    createIfMissing: true,
    idempotencyKey: params.idempotencyKey,
    runId: params.runId,
  });
  if (!appended.ok) {
    return {
      ok: false,
      error: appended.error ?? "failed to append internal fallback message",
    };
  }
  return {
    ok: true,
    delivered: true,
    sessionKey: params.target.sessionKey,
    reason: params.target.reason,
    duplicate: appended.duplicate === true,
  };
}

export async function deliverCronResultToActiveUserSession(params: {
  cfg: OpenClawConfig;
  agentId: string;
  message: string;
  idempotencyKey: string;
  runId: string;
  context: Pick<GatewayRequestContext, "broadcast" | "nodeSendToSession">;
}): Promise<
  | {
      ok: true;
      delivered: true;
      sessionKey: string;
      reason: "active" | "main";
      duplicate: boolean;
    }
  | { ok: false; error: string }
> {
  const target = await resolveActiveUserSessionTarget({
    cfg: params.cfg,
    agentId: params.agentId,
  });
  if (!target.ok) {
    return target;
  }
  const channel = deliveryContextFromSession(target.entry)?.channel ?? target.entry.lastChannel;
  if (!isInternalMessageChannel(channel)) {
    return {
      ok: false,
      error: `resolved active-user session is not internal: ${target.sessionKey}`,
    };
  }
  return await appendCronMessageToResolvedTarget({
    target,
    agentId: params.agentId,
    message: params.message,
    idempotencyKey: params.idempotencyKey,
    runId: params.runId,
    context: params.context,
  });
}
