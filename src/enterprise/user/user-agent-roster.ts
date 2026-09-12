import { createHash } from "node:crypto";
import { listAgentEntries } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import { resolveEnterpriseSharedAgentCapabilities } from "../isolation/enterprise-agent-capabilities.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";

export type EnterpriseUserSharedAgent = {
  agentId: string;
  resourceKey: string;
  name: string;
  description: string;
};

export type EnterpriseUserSharedAgentRoster = {
  catalogRevision: string;
  shared: EnterpriseUserSharedAgent[];
};

function catalogRevision(config: OpenClawConfig): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex").slice(0, 16);
}

/** Returns only the configured fields needed by account-scoped user surfaces. */
export function listEnterpriseUserSharedAgentRoster(
  config: OpenClawConfig,
): EnterpriseUserSharedAgentRoster {
  const shared = listAgentEntries(config)
    .filter((entry) => !isReservedSystemAgentId(entry.id))
    .map((entry) => ({
      agentId: entry.id,
      resourceKey: sharedAgentResourceKey(entry.id),
      name: entry.identity?.name ?? entry.name ?? entry.id,
      description: entry.description ?? "",
    }));
  return { catalogRevision: catalogRevision(config), shared };
}

export function resolveEnterpriseUserPersonalRuntime(
  config: OpenClawConfig,
  account: EnterpriseAccount,
): { accountId: string; enabled: boolean; runtimeAgentId: string } {
  return {
    accountId: account.id,
    enabled: account.enabled && account.personalAgentEnabled,
    runtimeAgentId: resolveEnterprisePersonalAgentId(config, account),
  };
}

/** Reads the current Shared Agent snapshot; a separate skill grant is not required. */
export function listEnterpriseUserCapabilityLabels(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  agentId: string,
): string[] {
  const capabilities = resolveEnterpriseSharedAgentCapabilities({ config, account, agentId });
  if (!capabilities.allowed) {
    return [];
  }
  return capabilities.skillsSnapshot.skills
    .map((skill) => skill.name)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 6);
}
