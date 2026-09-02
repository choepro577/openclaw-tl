import { createHash } from "node:crypto";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { sessionCreateHandlers } from "../../gateway/server-methods/sessions-create.js";
import { sessionReadHandlers } from "../../gateway/server-methods/sessions-read.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { readSessionMessageCountAsync } from "../../gateway/session-transcript-readers.js";
import type { SessionsListResult } from "../../gateway/session-utils.types.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { invokeEnterpriseGatewayHandler } from "../gateway/invoke-handler.js";
import { prepareEnterpriseGatewayRequest } from "../isolation/enterprise-gateway-policy.js";
import type { AgentKey } from "./user-api-contracts.js";
import {
  createEnterpriseUserGatewayClient,
  resolveEnterpriseUserRuntimeAgentId,
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
  const listed = (await invokeEnterpriseGatewayHandler(
    sessionReadHandlers["sessions.list"],
    "sessions.list",
    {
      agentId,
      limit: 1,
      sortBy: "updatedAt",
      includeGlobal: true,
      includeUnknown: false,
      includeDerivedTitles: false,
      includeLastMessage: false,
    },
    admission.context,
    client,
  )) as SessionsListResult;
  const latest = listed.sessions[0];
  if (latest?.key) {
    if (input.mode === "resume-latest") {
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
  return { sessionKey: created.key, conversationId: created.sessionId, resumed: false };
}
