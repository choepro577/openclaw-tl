import { createHash } from "node:crypto";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { resolveEnterpriseResourceAccess } from "../entitlements/entitlement-store.js";
import { listEnterpriseUserSharedAgentRoster } from "./user-agent-roster.js";
import type { AgentKey } from "./user-api-contracts.js";

export function enterpriseSharedAgentKey(resourceKey: string): AgentKey {
  const publicKey = createHash("sha256").update(resourceKey).digest("base64url").slice(0, 20);
  return `shared:${publicKey}`;
}

export function resolveEnterpriseSharedAgentCatalogKey(
  config: OpenClawConfig,
  key: AgentKey,
): { agentId: string; resourceKey: string } | null {
  if (!key.startsWith("shared:")) {
    return null;
  }
  const match = listEnterpriseUserSharedAgentRoster(config).shared.find(
    (agent) => enterpriseSharedAgentKey(agent.resourceKey) === key,
  );
  return match ? { agentId: match.agentId, resourceKey: match.resourceKey } : null;
}

export function resolveEnterpriseSharedAgentKey(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  key: AgentKey,
): { agentId: string; resourceKey: string } | null {
  const match = resolveEnterpriseSharedAgentCatalogKey(config, key);
  return match && resolveEnterpriseResourceAccess(account, "agent", match.resourceKey).allowed
    ? match
    : null;
}
