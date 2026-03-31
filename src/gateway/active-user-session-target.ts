import type { OpenClawConfig } from "../config/config.js";
import {
  loadSessionStore,
  resolveAgentMainSessionKey,
  type SessionEntry,
} from "../config/sessions.js";
import { normalizeAgentId, parseAgentSessionKey } from "../routing/session-key.js";
import { deliveryContextFromSession } from "../utils/delivery-context.js";
import { isInternalMessageChannel } from "../utils/message-channel.js";
import { createGatewaySession } from "./session-create.js";
import {
  loadCombinedSessionStoreForGateway,
  resolveGatewaySessionStoreTarget,
} from "./session-utils.js";

export const DEFAULT_ACTIVE_USER_SESSION_WINDOW_MINUTES = 24 * 60;

type ResolvedSessionTarget = {
  sessionKey: string;
  storePath: string;
  entry: SessionEntry;
};

export type ResolvedActiveUserSessionTarget =
  | ({
      ok: true;
      reason: "active" | "main";
    } & ResolvedSessionTarget)
  | {
      ok: false;
      error: string;
    };

function normalizeSessionKeySet(values?: string[]) {
  return new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean));
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
  reason: "main";
}): Promise<ResolvedActiveUserSessionTarget> {
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

function isTechnicalSessionKey(key: string): boolean {
  if (!key || key === "global" || key === "unknown") {
    return true;
  }
  const parsed = parseAgentSessionKey(key);
  const rest = (parsed?.rest ?? key).trim().toLowerCase();
  return (
    rest.startsWith("a2a:") ||
    rest.startsWith("cron:") ||
    rest.startsWith("hook:") ||
    rest.startsWith("node:") ||
    rest.startsWith("subagent:") ||
    rest.startsWith("acp:")
  );
}

function isDeliverableUserSessionEntry(entry?: SessionEntry): boolean {
  if (!entry?.sessionId) {
    return false;
  }
  const context = deliveryContextFromSession(entry);
  const channel = context?.channel ?? entry.lastChannel;
  if (!channel) {
    return false;
  }
  if (isInternalMessageChannel(channel)) {
    return true;
  }
  return Boolean(context?.to);
}

function resolveActiveWindowMs(activeWithinMinutes?: number) {
  if (typeof activeWithinMinutes !== "number" || !Number.isFinite(activeWithinMinutes)) {
    return DEFAULT_ACTIVE_USER_SESSION_WINDOW_MINUTES * 60_000;
  }
  const roundedMinutes = Math.max(0, Math.floor(activeWithinMinutes));
  return roundedMinutes * 60_000;
}

function findLatestActiveUserSession(params: {
  cfg: OpenClawConfig;
  agentId: string;
  excludeKeys?: string[];
  activeWithinMinutes?: number;
}): string | undefined {
  const normalizedAgentId = normalizeAgentId(params.agentId);
  const excluded = normalizeSessionKeySet(params.excludeKeys);
  const activeWindowMs = resolveActiveWindowMs(params.activeWithinMinutes);
  const cutoff = Date.now() - activeWindowMs;
  const { store } = loadCombinedSessionStoreForGateway(params.cfg);

  const matches = Object.entries(store)
    .filter(([key, entry]) => {
      if (excluded.has(key.trim().toLowerCase()) || isTechnicalSessionKey(key)) {
        return false;
      }
      if (!isDeliverableUserSessionEntry(entry)) {
        return false;
      }
      const parsed = parseAgentSessionKey(key);
      if (!parsed || normalizeAgentId(parsed.agentId) !== normalizedAgentId) {
        return false;
      }
      const updatedAt = typeof entry.updatedAt === "number" ? entry.updatedAt : 0;
      return updatedAt >= cutoff;
    })
    .map(([key, entry]) => ({
      key,
      updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : 0,
    }))
    .toSorted((a, b) => {
      if (b.updatedAt !== a.updatedAt) {
        return b.updatedAt - a.updatedAt;
      }
      return a.key.localeCompare(b.key);
    });

  return matches[0]?.key;
}

export async function resolveActiveUserSessionTarget(params: {
  cfg: OpenClawConfig;
  agentId: string;
  excludeKeys?: string[];
  activeWithinMinutes?: number;
}): Promise<ResolvedActiveUserSessionTarget> {
  const agentId = normalizeAgentId(params.agentId);
  const activeKey = findLatestActiveUserSession({
    cfg: params.cfg,
    agentId,
    excludeKeys: params.excludeKeys,
    activeWithinMinutes: params.activeWithinMinutes,
  });
  if (activeKey) {
    const lookup = loadSessionRecord({ cfg: params.cfg, sessionKey: activeKey });
    if (lookup.entry?.sessionId && lookup.storePath) {
      return {
        ok: true,
        sessionKey: lookup.canonicalKey,
        storePath: lookup.storePath,
        entry: lookup.entry,
        reason: "active",
      };
    }
  }

  return await ensureSessionTarget({
    cfg: params.cfg,
    sessionKey: resolveAgentMainSessionKey({
      cfg: params.cfg,
      agentId,
    }),
    reason: "main",
  });
}
