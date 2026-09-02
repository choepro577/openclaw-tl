import { createHash } from "node:crypto";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { listEnterpriseAgentCatalog } from "../catalog/enterprise-catalog.js";
import { resolveEnterpriseResourceAccess } from "../entitlements/entitlement-store.js";
import type { AgentKey } from "./user-api-contracts.js";

export function enterpriseSharedAgentKey(resourceKey: string): AgentKey {
  const publicKey = createHash("sha256").update(resourceKey).digest("base64url").slice(0, 20);
  return `shared:${publicKey}`;
}

export function resolveEnterpriseSharedAgentKey(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  key: AgentKey,
): { agentId: string; resourceKey: string } | null {
  if (!key.startsWith("shared:")) {
    return null;
  }
  const match = listEnterpriseAgentCatalog(config).shared.find(
    (agent) =>
      enterpriseSharedAgentKey(agent.resourceKey) === key &&
      resolveEnterpriseResourceAccess(account, "agent", agent.resourceKey).allowed,
  );
  return match ? { agentId: match.agentId, resourceKey: match.resourceKey } : null;
}
