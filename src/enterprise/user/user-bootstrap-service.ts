import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import {
  listEnterpriseAgentCatalog,
  listEnterpriseSkillCatalog,
} from "../catalog/enterprise-catalog.js";
import { resolveEnterpriseResourceAccess } from "../entitlements/entitlement-store.js";
import { listKnowledgeZones } from "../knowledge/knowledge-store.js";
import { readPersonalAgentProfile } from "./personal-agent-profile-store.js";
import { readSharedAgentRelationship } from "./shared-agent-relationship-store.js";
import { enterpriseSharedAgentKey } from "./user-agent-key.js";
import type {
  AgentKey,
  EnterpriseUserAuthAccount,
  EnterpriseUserAgentSummary,
  EnterpriseUserBootstrapV2,
} from "./user-api-contracts.js";

export function presentEnterpriseUserAuthAccount(
  account: EnterpriseAccount,
): EnterpriseUserAuthAccount {
  return {
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    mustChangePassword: account.mustChangePassword,
    enabled: account.enabled,
    personalAgentEnabled: account.personalAgentEnabled,
  };
}

function capabilityLabels(config: OpenClawConfig, account: EnterpriseAccount, agentId: string) {
  return listEnterpriseSkillCatalog(config, account)
    .items.filter(
      (skill) =>
        skill.ownerAgentId === agentId &&
        skill.effectiveAccess?.effectiveAllowed === true &&
        skill.intrinsicStatus === "ready",
    )
    .map((skill) => skill.name)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 6);
}

export function buildEnterpriseUserBootstrapV2(
  config: OpenClawConfig,
  account: EnterpriseAccount,
): EnterpriseUserBootstrapV2 {
  const catalog = listEnterpriseAgentCatalog(config);
  const profile = readPersonalAgentProfile(account.id, account.displayName);
  const personalRuntime = catalog.personal.find((agent) => agent.accountId === account.id);
  const personalReady = Boolean(personalRuntime?.enabled && personalRuntime.runtimeAgentId);
  const personal: EnterpriseUserAgentSummary = {
    key: "personal",
    kind: "personal",
    name: profile.name,
    canonicalName: profile.name,
    description: profile.greeting || null,
    avatar: profile.avatarPreset,
    availability: personalReady ? "ready" : "disabled",
    capabilityLabels: personalRuntime?.runtimeAgentId
      ? capabilityLabels(config, account, personalRuntime.runtimeAgentId)
      : [],
    relationship: null,
    actions: {
      canChat: personalReady,
      canSchedule: personalReady,
      canEdit: account.enabled && account.personalAgentEnabled,
      canPersonalize: false,
    },
  };
  const shared: EnterpriseUserAgentSummary[] = catalog.shared
    .filter((agent) => resolveEnterpriseResourceAccess(account, "agent", agent.resourceKey).allowed)
    .map((agent) => {
      const relationship = readSharedAgentRelationship(
        account.id,
        agent.agentId,
        account.displayName,
      );
      return {
        key: enterpriseSharedAgentKey(agent.resourceKey),
        kind: "shared" as const,
        name: relationship.agentAlias || agent.name,
        canonicalName: agent.name,
        description: null,
        avatar: null,
        availability: "ready" as const,
        capabilityLabels: capabilityLabels(config, account, agent.agentId),
        relationship,
        actions: {
          canChat: true,
          canSchedule: true,
          canEdit: false,
          canPersonalize: account.enabled,
        },
      };
    });
  const matchingDefault = catalog.shared.find(
    (agent) =>
      agent.agentId === account.defaultAgentId &&
      resolveEnterpriseResourceAccess(account, "agent", agent.resourceKey).allowed,
  );
  const defaultAgentKey: AgentKey | null = personalReady
    ? "personal"
    : matchingDefault
      ? enterpriseSharedAgentKey(matchingDefault.resourceKey)
      : (shared[0]?.key ?? null);
  const knowledgeMemberships = listKnowledgeZones({ accountId: account.id, limit: 100 }).items
    .length;
  return {
    schemaVersion: 2,
    user: {
      username: account.username,
      displayName: account.displayName,
      avatarUrl: null,
    },
    features: {
      personalAgent: {
        enabled: account.personalAgentEnabled,
        editable: account.enabled && account.personalAgentEnabled,
      },
      automations: true,
      // Keep the page and navigation hidden until account-scoped notification
      // preferences have a real server capability behind them.
      notifications: false,
      knowledge: { enabled: knowledgeMemberships > 0, memberships: knowledgeMemberships },
      plugins: { enabled: config.enterprise?.userExtensions?.enabled === true },
    },
    agents: [personal, ...shared],
    defaultAgentKey,
    policyRevision: account.policyRevision,
    catalogRevision: catalog.catalogRevision,
  };
}
