import { createHash } from "node:crypto";
import type { SessionEntry } from "../../config/sessions.js";
import { loadLatestCombinedSessionStoreForGatewayCore } from "../../config/sessions/combined-store-gateway.js";
import { resolveAgentMainSessionKey } from "../../config/sessions/main-session.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { resolveVisibleActiveSessionRunState } from "../../gateway/server-methods/session-active-runs.js";
import { sessionCreateHandlers } from "../../gateway/server-methods/sessions-create.js";
import { sessionReadHandlers } from "../../gateway/server-methods/sessions-read.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { tryResolveSessionCompatibilityOwnerAgentId } from "../../gateway/session-request-agent.js";
import { createSessionListEntryFilter } from "../../gateway/session-sharing.js";
import { readSessionMessageCountAsync } from "../../gateway/session-transcript-readers.js";
import {
  listSessionsFromStore,
  loadCombinedSessionStoreForGatewayCore,
} from "../../gateway/session-utils.js";
import type { SessionsListResult } from "../../gateway/session-utils.types.js";
import { buildProjectedAgentRunIndex } from "../../infra/agent-run-registry.js";
import { parseAgentSessionKey, resolveAgentIdFromSessionKey } from "../../routing/session-key.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { invokeEnterpriseGatewayHandler } from "../gateway/invoke-handler.js";
import { prepareEnterpriseGatewayRequest } from "../isolation/enterprise-gateway-policy.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import type { AgentKey } from "./user-api-contracts.js";
import {
  createEnterpriseUserGatewayClient,
  resolveEnterpriseUserRuntimeAgentId,
  resolveEnterpriseUserAgentKey,
} from "./user-gateway-client.js";

type EnterpriseConversationReuseCandidate = {
  hasActiveRun?: boolean;
  status?: "queued" | "running" | "done" | "failed" | "killed" | "timeout";
};

export function shouldReuseEmptyEnterpriseConversation(
  candidate: EnterpriseConversationReuseCandidate,
  messageCount: number,
): boolean {
  return (
    messageCount === 0 &&
    candidate.hasActiveRun !== true &&
    candidate.status !== "queued" &&
    candidate.status !== "running"
  );
}

export function enterpriseConversationCreateIdempotencyKey(input: {
  accountId: string;
  agentId: string;
  latestSessionIdentity?: string;
}): string {
  const slotIdentity = JSON.stringify([
    input.accountId,
    input.agentId,
    input.latestSessionIdentity ?? null,
  ]);
  return `enterprise-user-new:${createHash("sha256").update(slotIdentity).digest("hex")}`;
}

/** Starts session preparation after the open response has been decided. */
function scheduleEnterpriseConversationPrewarmInBackground(input: {
  accountId: string;
  /** Enterprise auth session checked by the prewarm owner. */
  enterpriseSessionId: string;
  sessionKey: string;
  agentId: string;
  context: GatewayRequestContext;
}): void {
  // Keep sandbox/prewarm code out of the synchronous portal-open module graph;
  // the first user response must not wait for Docker or provider-free metadata.
  void import("../prewarm/enterprise-prewarm.js")
    .then(({ scheduleEnterpriseSessionPrewarm }) =>
      scheduleEnterpriseSessionPrewarm({
        accountId: input.accountId,
        sessionId: input.enterpriseSessionId,
        sessionKey: input.sessionKey,
        agentId: input.agentId,
        getContext: () => input.context,
      }),
    )
    .catch(() => undefined);
}

/**
 * Reads only the latest visible row needed by the portal's open/new decision.
 *
 * Calling the public sessions.list handler here performs work that this flow
 * does not consume: it prepares the requested agent's model catalog, builds
 * rows for the full page, resolves sharing/membership in a second pass, and
 * then computes active-run flags for every row. The first probe reads a bounded
 * owner/key window from the canonical store. If any physical target is
 * truncated, it falls back to the full canonical merge so cross-store ordering
 * and legacy visibility behavior remain exact.
 */
function readLatestEnterpriseUserConversation(input: {
  config: OpenClawConfig;
  context: GatewayRequestContext;
  client: ReturnType<typeof createEnterpriseUserGatewayClient>;
  agentId: string;
  account: EnterpriseAccount;
}): SessionsListResult["sessions"][number] | undefined {
  const { config, context, client, agentId, account } = input;
  const exactSessionKeys =
    account.role === "administrator" ? [resolveAgentMainSessionKey({ cfg: config, agentId })] : [];
  const loaded = loadLatestCombinedSessionStoreForGatewayCore(config, {
    agentId,
    createdActorId: client.authenticatedUserProfile?.profileId,
    ...(exactSessionKeys.length > 0 ? { exactSessionKeys } : {}),
    candidateLimit: 32,
    strictConfiguredAgentStoresOnly: true,
    projection: "list",
  });
  const visibilityFilter = createSessionListEntryFilter({ cfg: config, client });
  const portalChatFilter = (key: string, entry: SessionEntry) =>
    (parseAgentSessionKey(key)?.rest?.startsWith("dashboard:") === true ||
      exactSessionKeys.includes(key)) &&
    (visibilityFilter?.(key, entry) ?? true);
  const listOptions = {
    cfg: config,
    durableStorePath: loaded.durableStorePath,
    entryFilter: portalChatFilter,
    storePath: loaded.storePath,
    store: loaded.store,
    lightweightListRows: true,
    opts: {
      agentId,
      limit: 1,
      sortBy: "updatedAt" as const,
      includeGlobal: true,
      includeUnknown: false,
      includeDerivedTitles: false,
      includeLastMessage: false,
    },
  };
  let listed = listSessionsFromStore(listOptions);
  if (!loaded.candidateScanComplete) {
    // A truncated physical target may still contain a visible row that would
    // outrank a candidate from another target. Re-run the canonical merge
    // whenever any target was truncated, so cross-store ordering cannot drift.
    const complete = loadCombinedSessionStoreForGatewayCore(config, {
      agentId,
      strictConfiguredAgentStoresOnly: true,
      projection: "list",
    });
    listed = listSessionsFromStore({
      ...listOptions,
      durableStorePath: complete.durableStorePath,
      storePath: complete.storePath,
      store: complete.store,
    });
  }
  const latest = listed.sessions[0];
  if (!latest) {
    return undefined;
  }
  const activeRunState = resolveVisibleActiveSessionRunState({
    context,
    requestedKey: latest.key,
    canonicalKey: latest.key,
    sessionId: latest.sessionId,
    agentId: latest.agentId ?? agentId,
    defaultAgentId: tryResolveSessionCompatibilityOwnerAgentId(config, latest.key),
    projectedAgentRunIndex: buildProjectedAgentRunIndex(),
  });
  return {
    ...latest,
    hasActiveRun: activeRunState.active,
    ...(activeRunState.active ? { status: activeRunState.status ?? "running" } : {}),
  };
}

export async function requireEnterpriseUserConversation(input: {
  context: GatewayRequestContext;
  account: EnterpriseAccount;
  sessionId: string;
  sessionKey: string;
}): Promise<void> {
  const client = createEnterpriseUserGatewayClient(input.account, input.sessionId);
  const requestParams = { key: input.sessionKey };
  const admission = prepareEnterpriseGatewayRequest({
    client,
    context: input.context,
    method: "sessions.describe",
    requestParams,
  });
  if (!admission.allowed) {
    throw new Error("GATEWAY_RUNTIME_UNAVAILABLE");
  }
  const described = (await invokeEnterpriseGatewayHandler(
    sessionReadHandlers["sessions.describe"],
    "sessions.describe",
    requestParams,
    admission.context,
    client,
  )) as { session?: { key?: unknown } | null };
  if (described.session?.key !== input.sessionKey) {
    throw new Error("CONVERSATION_NOT_FOUND");
  }
}

/**
 * Resolves the public portal Agent key for an existing conversation after the
 * account-scoped session ownership check. Runtime Agent ids never cross the
 * user API boundary; the mapping is kept on the server so Personal and Shared
 * deep links use the same current entitlement decision.
 */
export async function resolveEnterpriseUserConversationAgentKey(input: {
  config: OpenClawConfig;
  context: GatewayRequestContext;
  account: EnterpriseAccount;
  sessionId: string;
  sessionKey: string;
}): Promise<AgentKey> {
  await requireEnterpriseUserConversation(input);
  const runtimeAgentId = resolveAgentIdFromSessionKey(
    input.sessionKey,
    resolveEnterprisePersonalAgentId(input.config, input.account),
  );
  const agentKey = resolveEnterpriseUserAgentKey(input.config, input.account, runtimeAgentId);
  if (!agentKey) {
    throw new Error("AGENT_NOT_FOUND");
  }
  return agentKey;
}

export async function openEnterpriseUserConversation(input: {
  config: OpenClawConfig;
  context: GatewayRequestContext;
  account: EnterpriseAccount;
  sessionId: string;
  agentKey: AgentKey;
  mode: "resume-latest" | "new";
}): Promise<{ sessionKey: string; conversationId: string; resumed: boolean }> {
  const agentId = resolveEnterpriseUserRuntimeAgentId(input.config, input.account, input.agentKey);
  const client = createEnterpriseUserGatewayClient(input.account, input.sessionId);
  const admission = prepareEnterpriseGatewayRequest({
    client,
    context: input.context,
    method: "sessions.create",
    requestParams: { agentId },
  });
  if (!admission.allowed) {
    throw new Error(
      admission.reason === "ENTERPRISE_AGENT_DENIED"
        ? "AGENT_NOT_FOUND"
        : "GATEWAY_RUNTIME_UNAVAILABLE",
    );
  }
  const latest = readLatestEnterpriseUserConversation({
    config: admission.context.getRuntimeConfig(),
    context: admission.context,
    client,
    agentId,
    account: input.account,
  });
  if (latest?.key) {
    if (input.mode === "resume-latest") {
      scheduleEnterpriseConversationPrewarmInBackground({
        accountId: input.account.id,
        enterpriseSessionId: input.sessionId,
        sessionKey: latest.key,
        agentId,
        context: admission.context,
      });
      return {
        sessionKey: latest.key,
        conversationId: latest.sessionId ?? latest.key,
        resumed: true,
      };
    }
    if (latest.sessionId) {
      const messageCount = await readSessionMessageCountAsync({
        agentId,
        sessionId: latest.sessionId,
        sessionKey: latest.key,
      });
      if (shouldReuseEmptyEnterpriseConversation(latest, messageCount)) {
        scheduleEnterpriseConversationPrewarmInBackground({
          accountId: input.account.id,
          enterpriseSessionId: input.sessionId,
          sessionKey: latest.key,
          agentId,
          context: admission.context,
        });
        return {
          sessionKey: latest.key,
          conversationId: latest.sessionId,
          resumed: true,
        };
      }
    }
  }
  const created = (await invokeEnterpriseGatewayHandler(
    sessionCreateHandlers["sessions.create"],
    "sessions.create",
    {
      agentId,
      idempotencyKey: enterpriseConversationCreateIdempotencyKey({
        accountId: input.account.id,
        agentId,
        latestSessionIdentity: latest?.sessionId ?? latest?.key,
      }),
    },
    admission.context,
    client,
  )) as { key?: unknown; sessionId?: unknown };
  if (typeof created.key !== "string" || typeof created.sessionId !== "string") {
    throw new Error("GATEWAY_RUNTIME_UNAVAILABLE");
  }
  scheduleEnterpriseConversationPrewarmInBackground({
    accountId: input.account.id,
    enterpriseSessionId: input.sessionId,
    sessionKey: created.key,
    agentId,
    context: admission.context,
  });
  return { sessionKey: created.key, conversationId: created.sessionId, resumed: false };
}
