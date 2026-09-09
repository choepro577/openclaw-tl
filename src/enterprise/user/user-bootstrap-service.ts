import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { readEnterpriseUserAgentAccess } from "../agents/agent-access-request-service.js";
import { resolveEnterpriseResourceAccess } from "../entitlements/entitlement-store.js";
import { listKnowledgeZones } from "../knowledge/knowledge-store.js";
import { readPersonalAgentProfile } from "./personal-agent-profile-store.js";
import { readSharedAgentRelationship } from "./shared-agent-relationship-store.js";
import { enterpriseSharedAgentKey } from "./user-agent-key.js";
import {
  listEnterpriseUserCapabilityLabels,
  listEnterpriseUserSharedAgentRoster,
  resolveEnterpriseUserPersonalRuntime,
} from "./user-agent-roster.js";
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

export function buildEnterpriseUserBootstrapV2(
  config: OpenClawConfig,
  account: EnterpriseAccount,
): EnterpriseUserBootstrapV2 {
  const catalog = listEnterpriseUserSharedAgentRoster(config);
  const profile = readPersonalAgentProfile(account.id, account.displayName);
  const personalRuntime = resolveEnterpriseUserPersonalRuntime(config, account);
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
      ? listEnterpriseUserCapabilityLabels(config, account, personalRuntime.runtimeAgentId)
      : [],
    relationship: null,
    access: null,
    actions: {
      canChat: personalReady,
      canSchedule: personalReady,
      canEdit: account.enabled && account.personalAgentEnabled,
      canPersonalize: false,
      canRequestAccess: false,
    },
  };
  const shared: EnterpriseUserAgentSummary[] = catalog.shared.map((agent) => {
    const access = readEnterpriseUserAgentAccess(account, agent.resourceKey);
    const relationship = access.allowed
      ? readSharedAgentRelationship(account.id, agent.agentId, account.displayName)
      : null;
    return {
      key: enterpriseSharedAgentKey(agent.resourceKey),
      kind: "shared" as const,
      name: relationship?.agentAlias || agent.name,
      canonicalName: agent.name,
      description: agent.description || null,
      avatar: null,
      availability: "ready" as const,
      capabilityLabels: access.allowed
        ? listEnterpriseUserCapabilityLabels(config, account, agent.agentId)
        : [],
      relationship,
      access,
      actions: {
        canChat: access.allowed,
        canSchedule: access.allowed,
        canEdit: false,
        canPersonalize: account.enabled && access.allowed,
        canRequestAccess: account.enabled && !access.allowed && access.request?.state !== "pending",
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
      : (shared.find((agent) => agent.actions.canChat)?.key ?? null);
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
