import { createHash } from "node:crypto";
import { listAgentEntries, resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { buildWorkspaceSkillStatus } from "../../skills/discovery/status.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { resolveEnterpriseResourceAccess } from "../entitlements/entitlement-store.js";
import { agentSkillResourceKey, sharedAgentResourceKey } from "../entitlements/resource-keys.js";
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

/** Reads only ready workspace capabilities while evaluating the current account policy. */
export function listEnterpriseUserCapabilityLabels(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  agentId: string,
): string[] {
  if (!listAgentEntries(config).some((entry) => entry.id === agentId)) {
    return [];
  }
  const { skills } = buildWorkspaceSkillStatus(resolveAgentWorkspaceDir(config, agentId), {
    config,
    agentId,
  });
  return skills
    .filter((skill) => {
      if (
        skill.disabled ||
        !skill.eligible ||
        skill.platformIncompatible ||
        (skill.source !== "openclaw-workspace" && skill.source !== "agents-skills-project")
      ) {
        return false;
      }
      return resolveEnterpriseResourceAccess(
        account,
        "skill",
        agentSkillResourceKey(agentId, skill.source, skill.skillKey),
        {},
        config,
      ).allowed;
    })
    .map((skill) => skill.name)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 6);
}
