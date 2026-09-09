import { listAgentEntries } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { AgentToolsConfig } from "../../config/types.tools.js";
import {
  readEnterpriseAccountToolPolicy,
  type EnterpriseAccountToolPolicy,
} from "../accounts/account-tool-policy-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { listEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import { enterpriseRuntimeResourceId } from "../entitlements/resource-keys.js";
import { resolveEnterprisePersonalAgentTemplateId } from "../personal-agent/personal-agent-config.js";
import { listActiveEnterprisePluginGrantTools } from "./enterprise-plugin-tool-grants.js";
import {
  compileEnterpriseAccountToolPolicy,
  expandEnterpriseToolPolicyEntries,
} from "./enterprise-tool-policy-common.js";

/** Compiles account grants into the existing OpenClaw Agent tool-policy shape. */
export function compileEnterpriseToolPolicy(
  _config: OpenClawConfig,
  account: EnterpriseAccount,
  storedPolicy: EnterpriseAccountToolPolicy = readEnterpriseAccountToolPolicy(account.id),
): AgentToolsConfig {
  const pluginGrantTools = listActiveEnterprisePluginGrantTools(account.id);
  const entitlements = listEnterpriseEntitlements(account.id).filter(
    (item) => item.resourceType === "tool" && item.resourceState === "active",
  );
  const entitlementAllows: string[] = [];
  const entitlementDenies: string[] = [];
  for (const entitlement of entitlements) {
    const runtimeId = enterpriseRuntimeResourceId("tool", entitlement.resourceId);
    const entries = expandEnterpriseToolPolicyEntries([runtimeId]);
    if (entitlement.effect === "deny") {
      entitlementDenies.push(...entries);
    } else {
      entitlementAllows.push(...entries);
    }
  }

  const templateId = resolveEnterprisePersonalAgentTemplateId(_config, account);
  const template = listAgentEntries(_config).find((entry) => entry.id === templateId);
  const inheritedProfile = template?.tools?.profile ?? _config.tools?.profile;

  return compileEnterpriseAccountToolPolicy({
    account,
    storedPolicy,
    entitlementAllows,
    entitlementDenies,
    pluginGrantTools,
    inheritedProfile,
  });
}
