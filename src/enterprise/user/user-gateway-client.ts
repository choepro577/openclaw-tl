import { randomUUID } from "node:crypto";
import { PROTOCOL_VERSION } from "../../../packages/gateway-protocol/src/index.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { GatewayClient } from "../../gateway/server-methods/types.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { listEnterpriseAgentCatalog } from "../catalog/enterprise-catalog.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { enterpriseSharedAgentKey, resolveEnterpriseSharedAgentKey } from "./user-agent-key.js";
import type { AgentKey } from "./user-api-contracts.js";

export function createEnterpriseUserGatewayClient(
  account: EnterpriseAccount,
  sessionId: string,
): GatewayClient {
  return {
    connect: {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: "gateway-client",
        version: "enterprise-user-v2",
        platform: process.platform,
        mode: "backend",
      },
      role: "operator",
      scopes: ["operator.read", "operator.write", "operator.questions"],
    },
    connId: `enterprise-user:${randomUUID()}`,
    authenticatedUserProfile: {
      profileId: account.profileId,
      displayName: account.displayName,
      hasAvatar: false,
      updatedAt: account.updatedAt,
    },
    internal: {
      syntheticClient: true,
      enterpriseSession: {
        sessionId,
        audience: "user",
        accountId: account.id,
        accountRole: account.role,
      },
    },
  } as GatewayClient;
}

export function resolveEnterpriseUserRuntimeAgentId(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  agentKey: AgentKey,
): string {
  if (agentKey === "personal") {
    if (!account.personalAgentEnabled) {
      throw new Error("AGENT_NOT_FOUND");
    }
    return resolveEnterprisePersonalAgentId(config, account);
  }
  const shared = resolveEnterpriseSharedAgentKey(config, account, agentKey);
  if (!shared) {
    throw new Error("AGENT_NOT_FOUND");
  }
  return shared.agentId;
}

export function resolveEnterpriseUserAgentKey(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  runtimeAgentId: string | undefined,
): AgentKey | null {
  if (!runtimeAgentId) {
    return null;
  }
  if (runtimeAgentId === resolveEnterprisePersonalAgentId(config, account)) {
    return account.personalAgentEnabled ? "personal" : null;
  }
  const shared = listEnterpriseAgentCatalog(config).shared.find(
    (agent) => agent.agentId === runtimeAgentId,
  );
  if (!shared) {
    return null;
  }
  return resolveEnterpriseSharedAgentKey(
    config,
    account,
    enterpriseSharedAgentKey(shared.resourceKey),
  )
    ? enterpriseSharedAgentKey(shared.resourceKey)
    : null;
}
