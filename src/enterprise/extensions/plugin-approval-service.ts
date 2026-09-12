import path from "node:path";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { loadInstalledPluginIndexInstallRecordsSync } from "../../plugins/installed-plugin-index-records.js";
import { listManagedPlugins } from "../../plugins/management-service.js";
import type { PluginRegistry } from "../../plugins/registry-types.js";
import { getActivePluginRegistry } from "../../plugins/runtime.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import {
  EnterpriseExtensionError,
  revalidateEnterprisePluginRequestArtifact,
} from "./extension-service.js";
import {
  getEnterprisePluginGrant,
  getEnterprisePluginRequest,
  listEnterpriseAccountPluginGrants,
  listEnterprisePluginGrantsForPlugin,
  listEnterprisePluginRequests,
  transitionEnterprisePluginGrant,
  transitionEnterprisePluginRequest,
  upsertEnterprisePluginGrant,
} from "./extension-store.js";
import type { EnterpriseAccountPluginGrant, EnterprisePluginRequest } from "./extension-types.js";

type GatewayPluginInstallResult = {
  plugin?: { id?: string; packageName?: string; version?: string; state?: string };
  restartRequired?: boolean;
};

function installedRecord(packageName: string):
  | {
      pluginId: string;
      version: string | null;
      runtimeVersion: string | null;
      installPath: string | null;
      integrity: string | null;
    }
  | undefined {
  const records = loadInstalledPluginIndexInstallRecordsSync();
  for (const [pluginId, record] of Object.entries(records)) {
    if (record.source === "clawhub" && record.clawhubPackage === packageName) {
      return {
        pluginId,
        version: record.clawhubVersion ?? record.version ?? null,
        runtimeVersion: record.version ?? null,
        installPath: record.installPath ?? null,
        integrity: record.integrity ?? record.npmIntegrity ?? null,
      };
    }
  }
  return undefined;
}

function loadedPlugin(
  pluginId: string,
  packageName: string,
  registry: PluginRegistry | null = getActivePluginRegistry(),
) {
  return registry?.plugins.find(
    (plugin) =>
      plugin.status === "loaded" && (plugin.id === pluginId || plugin.packageName === packageName),
  );
}

function activateGrantIfLoaded(
  request: EnterprisePluginRequest,
  pluginId: string,
  registry: PluginRegistry | null = getActivePluginRegistry(),
): { request: EnterprisePluginRequest; grant: EnterpriseAccountPluginGrant | null } {
  const record = installedRecord(request.packageName);
  const plugin = loadedPlugin(pluginId, request.packageName, registry);
  if (!record || !plugin) {
    return { request, grant: null };
  }
  // A same-id bundled or config copy must not inherit the reviewed artifact's grant.
  if (
    !record.installPath ||
    !plugin.rootDir ||
    path.resolve(record.installPath) !== path.resolve(plugin.rootDir)
  ) {
    throw new EnterpriseExtensionError("GLOBAL_INSTALL_VERIFICATION_FAILED", 409);
  }
  const activeVersion = plugin.packageVersion ?? plugin.version ?? record.runtimeVersion;
  if (activeVersion !== record.runtimeVersion || record.version !== request.exactVersion) {
    throw new EnterpriseExtensionError("GLOBAL_VERSION_CONFLICT", 409);
  }
  if (record.integrity !== request.integrity) {
    throw new EnterpriseExtensionError("GLOBAL_INTEGRITY_CONFLICT", 409);
  }
  const approvedTools = [
    ...new Set(
      registry?.tools.filter((tool) => tool.pluginId === plugin.id).flatMap((tool) => tool.names) ??
        [],
    ),
  ].toSorted();
  const grant = upsertEnterprisePluginGrant({
    accountId: request.requesterAccountId,
    scope: request.scope,
    agentKey: request.agentKey,
    runtimeAgentId: request.runtimeAgentId,
    pluginId: plugin.id,
    exactVersion: request.exactVersion,
    integrity: request.integrity,
    capabilityDigest: request.capabilityDigest,
    approvedTools,
    sourceRequestId: request.id,
    approvedByAccountId: request.reviewerAccountId,
    state: "active",
  });
  const available = transitionEnterprisePluginRequest({
    id: request.id,
    baseRevision: request.revision,
    from: ["approving"],
    to: "available",
    reviewerAccountId: request.reviewerAccountId,
    installedPluginId: plugin.id,
  });
  return { request: available, grant };
}

export async function approveEnterprisePluginRequest(input: {
  config: OpenClawConfig;
  reviewer: EnterpriseAccount;
  requestId: string;
  baseRevision: number;
  scope?: EnterprisePluginRequest["scope"];
  install: (params: Record<string, unknown>) => Promise<unknown>;
}): Promise<{
  request: EnterprisePluginRequest;
  grant: EnterpriseAccountPluginGrant | null;
  restartRequired: boolean;
}> {
  const request = getEnterprisePluginRequest(input.requestId);
  if (!request) {
    throw new EnterpriseExtensionError("PLUGIN_REQUEST_NOT_FOUND", 404);
  }
  if (request.revision !== input.baseRevision) {
    throw new EnterpriseExtensionError("EXTENSION_REVISION_CONFLICT", 409);
  }
  await revalidateEnterprisePluginRequestArtifact(request);
  if (request.state === "approving") {
    if (!request.installedPluginId) {
      throw new EnterpriseExtensionError("PLUGIN_INSTALL_VERIFICATION_FAILED", 409);
    }
    const activated = activateGrantIfLoaded(request, request.installedPluginId);
    return { ...activated, restartRequired: activated.grant === null };
  }
  if (!["pending", "install_failed"].includes(request.state)) {
    throw new EnterpriseExtensionError("EXTENSION_REVISION_CONFLICT", 409);
  }
  const catalog = await listManagedPlugins({ config: input.config });
  // Catalog availability (including a disabled bundled copy) is not a prior
  // ClawHub install. An explicit approval must still download and verify it.
  const existing = catalog.plugins.find(
    (plugin) =>
      plugin.packageName === request.packageName &&
      plugin.installed &&
      !(plugin.origin === "bundled" && !plugin.enabled),
  );
  const recordBeforeDecision = installedRecord(request.packageName);
  if (
    existing?.version &&
    existing.version !== (recordBeforeDecision?.runtimeVersion ?? request.exactVersion)
  ) {
    throw new EnterpriseExtensionError("GLOBAL_VERSION_CONFLICT", 409);
  }
  if (
    recordBeforeDecision &&
    (recordBeforeDecision.version !== request.exactVersion ||
      recordBeforeDecision.integrity !== request.integrity)
  ) {
    throw new EnterpriseExtensionError("GLOBAL_VERSION_CONFLICT", 409);
  }
  if (existing && !recordBeforeDecision) {
    throw new EnterpriseExtensionError("GLOBAL_INSTALL_VERIFICATION_FAILED", 409);
  }
  let pluginId = existing?.id ?? recordBeforeDecision?.pluginId;
  let approving = transitionEnterprisePluginRequest({
    id: request.id,
    baseRevision: request.revision,
    from: [request.state],
    to: "approving",
    reviewerAccountId: input.reviewer.id,
    installedPluginId: pluginId ?? null,
    safeErrorCode: null,
    ...(input.scope ? { scope: input.scope } : {}),
  });
  let restartRequired = false;
  try {
    if (!recordBeforeDecision) {
      const result = (await input.install({
        source: "clawhub",
        packageName: request.packageName,
        version: request.exactVersion,
        acknowledgeInstallPolicyWarning: true,
      })) as GatewayPluginInstallResult;
      pluginId = result.plugin?.id;
      restartRequired = result.restartRequired === true;
      const committed = installedRecord(request.packageName);
      if (
        !pluginId ||
        !committed ||
        committed.version !== request.exactVersion ||
        committed.integrity !== request.integrity
      ) {
        throw new EnterpriseExtensionError("PLUGIN_INSTALL_VERIFICATION_FAILED", 500);
      }
      approving = transitionEnterprisePluginRequest({
        id: approving.id,
        baseRevision: approving.revision,
        from: ["approving"],
        to: "approving",
        reviewerAccountId: input.reviewer.id,
        installedPluginId: pluginId,
      });
    }
    const activated = activateGrantIfLoaded(approving, pluginId!);
    return { ...activated, restartRequired: restartRequired || activated.grant === null };
  } catch (error) {
    if (error instanceof EnterpriseExtensionError && error.code === "GLOBAL_VERSION_CONFLICT") {
      throw error;
    }
    transitionEnterprisePluginRequest({
      id: approving.id,
      baseRevision: approving.revision,
      from: ["approving"],
      to: "install_failed",
      reviewerAccountId: input.reviewer.id,
      installedPluginId: pluginId ?? null,
      safeErrorCode: "PLUGIN_INSTALL_FAILED",
    });
    throw error;
  }
}

export function reconcileEnterprisePluginRequest(
  requestId: string,
  registry: PluginRegistry | null = getActivePluginRegistry(),
): {
  request: EnterprisePluginRequest;
  grant: EnterpriseAccountPluginGrant | null;
} {
  const request = getEnterprisePluginRequest(requestId);
  if (!request) {
    throw new EnterpriseExtensionError("PLUGIN_REQUEST_NOT_FOUND", 404);
  }
  if (request.state !== "approving" || !request.installedPluginId) {
    const grant = request.requesterAccountId
      ? listEnterpriseAccountPluginGrants(request.requesterAccountId).find(
          (item) => item.sourceRequestId === request.id,
        )
      : undefined;
    return { request, grant: grant ?? null };
  }
  return activateGrantIfLoaded(request, request.installedPluginId, registry);
}

export function reconcileApprovingEnterprisePluginRequests(
  registry: PluginRegistry | null = getActivePluginRegistry(),
): { available: number; awaitingLoad: number; failed: number } {
  const outcome = { available: 0, awaitingLoad: 0, failed: 0 };
  for (const request of listEnterprisePluginRequests({ state: "approving" })) {
    try {
      const reconciled = reconcileEnterprisePluginRequest(request.id, registry);
      if (reconciled.request.state === "available") {
        outcome.available += 1;
      } else {
        outcome.awaitingLoad += 1;
      }
    } catch {
      // Keep the request in approving so an Admin can inspect and retry it safely.
      outcome.failed += 1;
    }
  }
  return outcome;
}

export function rejectEnterprisePluginRequest(input: {
  reviewerAccountId: string;
  requestId: string;
  baseRevision: number;
  reason: string;
}): EnterprisePluginRequest {
  const reason = input.reason.trim();
  if (!reason || reason.length > 2_000) {
    throw new EnterpriseExtensionError("REJECTION_REASON_REQUIRED", 422);
  }
  return transitionEnterprisePluginRequest({
    id: input.requestId,
    baseRevision: input.baseRevision,
    from: ["pending", "install_failed"],
    to: "rejected",
    reviewerAccountId: input.reviewerAccountId,
    decisionReason: reason,
  });
}

export function cancelEnterprisePluginRequest(input: {
  accountId: string;
  requestId: string;
  baseRevision: number;
}): EnterprisePluginRequest {
  const request = getEnterprisePluginRequest(input.requestId);
  if (!request || request.requesterAccountId !== input.accountId) {
    throw new EnterpriseExtensionError("PLUGIN_REQUEST_NOT_FOUND", 404);
  }
  return transitionEnterprisePluginRequest({
    id: request.id,
    baseRevision: input.baseRevision,
    from: ["pending"],
    to: "cancelled",
  });
}

export function relinquishEnterprisePluginGrant(input: {
  accountId: string;
  grantId: string;
  baseRevision: number;
}): EnterpriseAccountPluginGrant {
  const grant = getEnterprisePluginGrant(input.grantId);
  if (!grant || grant.accountId !== input.accountId) {
    throw new EnterpriseExtensionError("PLUGIN_GRANT_NOT_FOUND", 404);
  }
  return transitionEnterprisePluginGrant({
    accountId: input.accountId,
    id: input.grantId,
    baseRevision: input.baseRevision,
    state: "revoked",
  });
}

export function revokeEnterprisePluginGrant(input: {
  grantId: string;
  baseRevision: number;
}): EnterpriseAccountPluginGrant {
  const grant = getEnterprisePluginGrant(input.grantId);
  if (!grant) {
    throw new EnterpriseExtensionError("PLUGIN_GRANT_NOT_FOUND", 404);
  }
  return transitionEnterprisePluginGrant({
    accountId: grant.accountId,
    id: grant.id,
    baseRevision: input.baseRevision,
    state: "revoked",
  });
}

export function listEnterprisePluginGrantImpact(pluginId: string): EnterpriseAccountPluginGrant[] {
  return listEnterprisePluginGrantsForPlugin(pluginId);
}

export function readEnterprisePluginGlobalStatus(request: EnterprisePluginRequest): {
  installed: boolean;
  loaded: boolean;
  pluginId: string | null;
  version: string | null;
  integrity: string | null;
  toolOwnershipMatches: boolean;
  tools: string[];
} {
  const record = installedRecord(request.packageName);
  const pluginId = request.installedPluginId ?? record?.pluginId ?? null;
  const plugin = pluginId ? loadedPlugin(pluginId, request.packageName) : undefined;
  const tools = plugin
    ? [
        ...new Set(
          getActivePluginRegistry()
            ?.tools.filter((entry) => entry.pluginId === plugin.id)
            .flatMap((entry) => entry.names) ?? [],
        ),
      ].toSorted()
    : [];
  return {
    installed: Boolean(record),
    loaded: Boolean(plugin),
    pluginId,
    version: record?.version ?? null,
    integrity: record?.integrity ?? null,
    toolOwnershipMatches: plugin
      ? tools.every((toolId) =>
          getActivePluginRegistry()?.tools.some(
            (entry) => entry.pluginId === plugin.id && entry.names.includes(toolId),
          ),
        )
      : false,
    tools,
  };
}
