import { isToolAllowedByPolicyName } from "../../agents/tool-policy-match.js";
import {
  expandToolGroups,
  normalizeToolPolicyName,
  resolveToolProfilePolicy,
} from "../../agents/tool-policy-shared.js";
import type { AgentToolsConfig, ToolProfileId } from "../../config/types.tools.js";
import type { EnterpriseAccountToolPolicy } from "../accounts/account-tool-policy-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import {
  accessPresetToolIds,
  ENTERPRISE_ACCESS_PRESET_BASIC,
  ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
  isEnterpriseNonDelegableToolId,
} from "../entitlements/resource-keys.js";

/**
 * Enterprise policy prefixes are account boundaries, rather than ordinary
 * operator-configurable denials. Keep the exact names as well as the prefix
 * patterns so both the runtime matcher and the catalog can explain a denial.
 */
const ENTERPRISE_NON_DELEGABLE_TOOL_PREFIXES = [
  "gateway.",
  "config.",
  "node.",
  "device.",
  "plugin.",
  "plugins.",
  "skill.",
  "skills.",
  "terminal.",
] as const;

export const ENTERPRISE_HARD_DENY_TOOL_PATTERNS = [
  ...ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
  ...ENTERPRISE_NON_DELEGABLE_TOOL_PREFIXES.map((prefix) => `${prefix}*`),
].toSorted();

function normalizedEntries(values: readonly string[]): string[] {
  return [...new Set(values.map(normalizeToolPolicyName).filter(Boolean))];
}

function expandedEntries(values: readonly string[]): string[] {
  return expandToolGroups(normalizedEntries(values));
}

/**
 * Compiles the account-owned part of the Enterprise tool policy.
 *
 * This module deliberately has no entitlement-store import. The compiler and
 * the authority resolver both pass their active entitlement snapshot here,
 * which keeps the policy decision independent from persistence and avoids a
 * compiler/entitlement circular dependency.
 */
export function compileEnterpriseAccountToolPolicy(params: {
  account: EnterpriseAccount;
  storedPolicy: EnterpriseAccountToolPolicy;
  entitlementAllows?: readonly string[];
  entitlementDenies?: readonly string[];
  pluginGrantTools?: readonly string[];
  /** Legacy configured policies with profile=null inherit the template profile. */
  inheritedProfile?: ToolProfileId;
  /** Administrators use an empty default surface until a policy is configured. */
  includeAccessPreset?: boolean;
}): AgentToolsConfig {
  const { account, storedPolicy } = params;
  const includeAccessPreset =
    params.includeAccessPreset ?? (account.role !== "administrator" || storedPolicy.configured);
  const allow = new Set<string>();

  if (includeAccessPreset) {
    for (const toolId of accessPresetToolIds(account.accessPresetKey)) {
      allow.add(normalizeToolPolicyName(toolId));
    }
  }

  if (storedPolicy.configured) {
    const profile =
      storedPolicy.profile ??
      (account.accessPresetKey === ENTERPRISE_ACCESS_PRESET_BASIC
        ? undefined
        : params.inheritedProfile);
    if (profile) {
      for (const toolId of resolveToolProfilePolicy(profile)?.allow ?? []) {
        allow.add(normalizeToolPolicyName(toolId));
      }
    }
    for (const toolId of expandedEntries(storedPolicy.alsoAllow)) {
      allow.add(toolId);
    }
  }

  for (const toolId of expandedEntries(params.entitlementAllows ?? [])) {
    allow.add(toolId);
  }
  for (const toolId of expandedEntries(params.pluginGrantTools ?? [])) {
    allow.add(toolId);
  }

  const deny = new Set<string>(ENTERPRISE_HARD_DENY_TOOL_PATTERNS);
  if (storedPolicy.configured) {
    for (const toolId of normalizedEntries(storedPolicy.deny)) {
      deny.add(toolId);
    }
  }
  for (const toolId of expandedEntries(params.entitlementDenies ?? [])) {
    deny.add(toolId);
  }

  const denyPolicy = { deny: [...deny] };
  const filteredAllow = [...allow].filter(
    (toolId) =>
      !isEnterpriseNonDelegableToolId(toolId) && isToolAllowedByPolicyName(toolId, denyPolicy),
  );

  return {
    allow: filteredAllow.toSorted(),
    deny: [...deny].toSorted(),
  };
}

/** Resolve a resource-key runtime id into the same policy entries as config. */
export function expandEnterpriseToolPolicyEntries(values: readonly string[]): string[] {
  return expandedEntries(values);
}
