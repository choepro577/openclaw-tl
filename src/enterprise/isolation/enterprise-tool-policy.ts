import { listAgentEntries } from "../../agents/agent-scope.js";
import { expandToolGroups, resolveToolProfilePolicy } from "../../agents/tool-policy-shared.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { AgentToolsConfig } from "../../config/types.tools.js";
import { loadInstalledPluginIndexInstallRecordsSync } from "../../plugins/installed-plugin-index-records.js";
import { getActivePluginRegistry } from "../../plugins/runtime.js";
import {
  readEnterpriseAccountToolPolicy,
  type EnterpriseAccountToolPolicy,
} from "../accounts/account-tool-policy-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { listEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import {
  accessPresetToolIds,
  ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
  enterpriseRuntimeResourceId,
  isEnterpriseNonDelegableToolId,
} from "../entitlements/resource-keys.js";
import {
  listEnterpriseAccountPluginGrants,
  transitionEnterprisePluginGrant,
} from "../extensions/extension-store.js";
import type {
  EnterpriseAccountPluginGrant,
  EnterprisePluginGrantState,
} from "../extensions/extension-types.js";
import { resolveEnterprisePersonalAgentTemplateId } from "../personal-agent/personal-agent-config.js";

function transitionGrantState(
  grant: EnterpriseAccountPluginGrant,
  state: EnterprisePluginGrantState,
): EnterpriseAccountPluginGrant | undefined {
  if (grant.state === state) {
    return grant;
  }
  try {
    return transitionEnterprisePluginGrant({
      accountId: grant.accountId,
      id: grant.id,
      baseRevision: grant.revision,
      state,
    });
  } catch {
    return undefined;
  }
}

function activeEnterprisePluginGrantTools(accountId: string): string[] {
  const registry = getActivePluginRegistry();
  let records: ReturnType<typeof loadInstalledPluginIndexInstallRecordsSync> = {};
  try {
    records = loadInstalledPluginIndexInstallRecordsSync();
  } catch {
    return [];
  }
  const tools = new Set<string>();
  for (const storedGrant of listEnterpriseAccountPluginGrants(accountId)) {
    if (
      storedGrant.state === "revoked" ||
      storedGrant.state === "suspended_version_mismatch" ||
      storedGrant.state === "orphaned"
    ) {
      continue;
    }
    const record = records[storedGrant.pluginId];
    if (!record) {
      transitionGrantState(storedGrant, "orphaned");
      continue;
    }
    const plugin = registry?.plugins.find(
      (entry) => entry.id === storedGrant.pluginId && entry.status === "loaded",
    );
    if (
      record.version !== storedGrant.exactVersion ||
      (record.integrity ?? record.npmIntegrity) !== storedGrant.integrity ||
      (plugin && (plugin.packageVersion ?? plugin.version) !== storedGrant.exactVersion)
    ) {
      transitionGrantState(storedGrant, "suspended_version_mismatch");
      continue;
    }
    if (!plugin || !registry) {
      transitionGrantState(storedGrant, "unavailable");
      continue;
    }
    const grant = transitionGrantState(storedGrant, "active");
    if (!grant) {
      continue;
    }
    const owned = new Set(
      registry.tools
        .filter((entry) => entry.pluginId === grant.pluginId)
        .flatMap((entry) => entry.names),
    );
    for (const toolId of grant.approvedTools) {
      if (owned.has(toolId) && !isEnterpriseNonDelegableToolId(toolId)) {
        tools.add(toolId);
      }
    }
  }
  return [...tools].toSorted();
}

/** Compiles account grants into the existing OpenClaw Agent tool-policy shape. */
export function compileEnterpriseToolPolicy(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  storedPolicy: EnterpriseAccountToolPolicy = readEnterpriseAccountToolPolicy(account.id),
): AgentToolsConfig {
  const pluginGrantTools = activeEnterprisePluginGrantTools(account.id);
  if (storedPolicy.configured) {
    const templateId = resolveEnterprisePersonalAgentTemplateId(config, account);
    const template = listAgentEntries(config).find((entry) => entry.id === templateId);
    const inheritedProfile = template?.tools?.profile ?? config.tools?.profile ?? "full";
    const profile = storedPolicy.profile ?? inheritedProfile;
    const profileAllow = resolveToolProfilePolicy(profile)?.allow ?? ["*"];
    const inheritedAlsoAllow =
      storedPolicy.profile === null
        ? (template?.tools?.alsoAllow ?? config.tools?.alsoAllow ?? [])
        : [];
    return {
      allow: [
        ...new Set(
          expandToolGroups([
            ...profileAllow,
            ...inheritedAlsoAllow,
            ...storedPolicy.alsoAllow,
            ...pluginGrantTools,
          ]),
        ),
      ].toSorted(),
      deny: [...new Set([...ENTERPRISE_NON_DELEGABLE_TOOL_IDS, ...storedPolicy.deny])].toSorted(),
    };
  }
  if (account.role === "administrator") {
    return pluginGrantTools.length > 0
      ? { allow: pluginGrantTools, deny: [...ENTERPRISE_NON_DELEGABLE_TOOL_IDS] }
      : {};
  }
  const entitlements = listEnterpriseEntitlements(account.id).filter(
    (item) => item.resourceType === "tool" && item.resourceState === "active",
  );
  const deny = new Set(ENTERPRISE_NON_DELEGABLE_TOOL_IDS);
  const allow = new Set(accessPresetToolIds(account.accessPresetKey));
  for (const entitlement of entitlements) {
    const runtimeId = enterpriseRuntimeResourceId("tool", entitlement.resourceId);
    if (isEnterpriseNonDelegableToolId(runtimeId)) {
      deny.add(runtimeId);
      allow.delete(runtimeId);
    } else if (entitlement.effect === "deny") {
      deny.add(runtimeId);
      allow.delete(runtimeId);
    } else if (!deny.has(runtimeId)) {
      allow.add(runtimeId);
    }
  }
  for (const toolId of pluginGrantTools) {
    if (!deny.has(toolId)) {
      allow.add(toolId);
    }
  }
  return { allow: [...allow].toSorted(), deny: [...deny].toSorted() };
}
