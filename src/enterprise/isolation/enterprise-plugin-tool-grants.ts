import path from "node:path";
import { loadInstalledPluginIndexInstallRecordsSync } from "../../plugins/installed-plugin-index-records.js";
import { getActivePluginRegistry } from "../../plugins/runtime.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import { isEnterpriseNonDelegableToolId } from "../entitlements/resource-keys.js";
import {
  listEnterpriseAccountPluginGrants,
  listEnterpriseEffectivePluginGrants,
  transitionEnterprisePluginGrant,
} from "../extensions/extension-store.js";
import type {
  EnterpriseAccountPluginGrant,
  EnterprisePluginGrantState,
} from "../extensions/extension-types.js";

function transitionGrantState(
  grant: EnterpriseAccountPluginGrant,
  state: EnterprisePluginGrantState,
  options: OpenClawStateDatabaseOptions = {},
): EnterpriseAccountPluginGrant | undefined {
  if (grant.state === state) {
    return grant;
  }
  try {
    return transitionEnterprisePluginGrant(
      {
        accountId: grant.accountId,
        id: grant.id,
        baseRevision: grant.revision,
        state,
      },
      options,
    );
  } catch {
    return undefined;
  }
}

/**
 * Returns only the approved tools from plugin grants whose installed artifact,
 * version, integrity, path, and loaded registry entry still agree.
 *
 * This is shared by the compiler and the authority resolver so a plugin tool
 * cannot appear granted in one path and unavailable in the other.
 */
export function listActiveEnterprisePluginGrantTools(
  accountId: string,
  runtimeAgentId?: string,
  options: {
    sharedAgentAllowed?: boolean;
    sharedAgentOnly?: boolean;
    databaseOptions?: OpenClawStateDatabaseOptions;
  } = {},
): string[] {
  const registry = getActivePluginRegistry();
  let records: ReturnType<typeof loadInstalledPluginIndexInstallRecordsSync>;
  try {
    records = loadInstalledPluginIndexInstallRecordsSync();
  } catch {
    return [];
  }
  const tools = new Set<string>();
  const grants =
    runtimeAgentId && options.sharedAgentAllowed === true
      ? listEnterpriseEffectivePluginGrants(
          accountId,
          runtimeAgentId,
          {
            sharedAgentAllowed: true,
          },
          options.databaseOptions,
        )
      : listEnterpriseAccountPluginGrants(accountId, options.databaseOptions);
  for (const storedGrant of grants) {
    if (options.sharedAgentOnly === true && storedGrant.scope !== "shared_agent") {
      continue;
    }
    if (
      storedGrant.state === "revoked" ||
      storedGrant.state === "suspended_version_mismatch" ||
      storedGrant.state === "orphaned"
    ) {
      continue;
    }
    const record = records[storedGrant.pluginId];
    if (!record) {
      transitionGrantState(storedGrant, "orphaned", options.databaseOptions);
      continue;
    }
    const plugin = registry?.plugins.find(
      (entry) => entry.id === storedGrant.pluginId && entry.status === "loaded",
    );
    if (
      (record.clawhubVersion ?? record.version) !== storedGrant.exactVersion ||
      (record.integrity ?? record.npmIntegrity) !== storedGrant.integrity ||
      (plugin && (plugin.packageVersion ?? plugin.version) !== record.version)
    ) {
      transitionGrantState(storedGrant, "suspended_version_mismatch", options.databaseOptions);
      continue;
    }
    if (
      !plugin ||
      !registry ||
      !record.installPath ||
      !plugin.rootDir ||
      path.resolve(record.installPath) !== path.resolve(plugin.rootDir)
    ) {
      transitionGrantState(storedGrant, "unavailable", options.databaseOptions);
      continue;
    }
    const grant = transitionGrantState(storedGrant, "active", options.databaseOptions);
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
