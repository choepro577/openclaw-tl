import { listAgentEntries, resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import { resolveEffectiveToolPolicy } from "../../agents/agent-tools.policy.js";
import { resolveSandboxConfigForAgent } from "../../agents/sandbox/config.js";
import { resolveSandboxRuntimeStatus } from "../../agents/sandbox/runtime-status.js";
import { isToolAllowed } from "../../agents/sandbox/tool-policy.js";
import {
  isToolAllowedByPolicies,
  isToolAllowedByPolicyName,
} from "../../agents/tool-policy-match.js";
import {
  normalizeToolPolicyName,
  resolveToolProfilePolicy,
} from "../../agents/tool-policy-shared.js";
import { mergeAlsoAllowPolicy } from "../../agents/tool-policy.js";
import { resolveEffectiveToolInventory } from "../../agents/tools-effective-inventory.js";
import { readConfigFileSnapshot, writeConfigFile } from "../../config/io.js";
import { hashConfigRaw } from "../../config/io.read-helpers.js";
import { redactConfigObject } from "../../config/redact-snapshot.js";
import { buildConfigSchemaCore } from "../../config/schema.js";
import type { AgentDelegationTargetConfig, AgentEntryConfig } from "../../config/types.agents.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { ToolProfileId } from "../../config/types.tools.js";
import type { CronJobCreate, CronJobPatch } from "../../cron/types.js";
import { buildToolsCatalogResult } from "../../gateway/server-methods/tools-catalog.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import { getActiveRuntimeWebToolsMetadataFromState } from "../../secrets/runtime-web-tools-state.js";
import { buildWorkspaceSkillStatus } from "../../skills/discovery/status.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import { getEnterpriseAccountById, listEnterpriseAccounts } from "../accounts/account-store.js";
import {
  readEnterpriseAccountToolPolicy,
  writeEnterpriseAccountToolPolicy,
} from "../accounts/account-tool-policy-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { markEnterpriseAgentEntitlementsOrphaned } from "../entitlements/entitlement-store.js";
import {
  ENTERPRISE_DELEGATION_MANAGED_TOOL_IDS,
  ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
  isEnterpriseNonDelegableToolId,
  sharedAgentResourceKey,
} from "../entitlements/resource-keys.js";
import { invokeEnterpriseGatewayHandler } from "../gateway/invoke-handler.js";
import { projectEnterpriseRuntimeConfig } from "../isolation/enterprise-gateway-policy.js";
import { compileEnterpriseToolPolicy } from "../isolation/enterprise-tool-policy.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import {
  listEnterpriseAgentCoreFiles,
  readEnterpriseAgentCoreFile,
  writeEnterpriseAgentCoreFile,
} from "./admin-agent-files.js";
import { readEnterpriseSharedRelationshipsPanel } from "./admin-agent-relationship-service.js";
import { cancelPendingEnterpriseAgentAccessRequestsForResource } from "./agent-access-request-store.js";
import { withEnterpriseAgentLifecycleLocks } from "./enterprise-agent-lifecycle-lock.js";

export type EnterpriseAgentScope = "shared" | "personal";
export type EnterpriseAgentPanel =
  | "overview"
  | "files"
  | "tools"
  | "skills"
  | "channels"
  | "cron"
  | "memory"
  | "relationships";

export type EnterpriseAgentRuntimeServices = {
  gatewayContext?: GatewayRequestContext;
};

export type EnterpriseAgentSandboxToolStatus = "open" | "blocked" | "locked" | "setup_required";

export type EnterpriseAgentSandboxState = {
  enabled: boolean;
  tools: Array<{
    id: string;
    status: EnterpriseAgentSandboxToolStatus;
    reason?: string;
  }>;
};

type EnterpriseAgentToolPanelPolicy = {
  profile?: ToolProfileId | null;
  allow?: string[];
  alsoAllow?: string[];
  deny?: string[];
};

function panelPolicyAllowsTool(params: {
  toolId: string;
  policy: EnterpriseAgentToolPanelPolicy | null | undefined;
  inheritedProfile: ToolProfileId;
}): boolean {
  const profilePolicy = resolveToolProfilePolicy(params.policy?.profile ?? params.inheritedProfile);
  const allowedByProfile = isToolAllowedByPolicyName(params.toolId, profilePolicy);
  const allowedByOverride =
    (params.policy?.alsoAllow?.length ?? 0) > 0 &&
    isToolAllowedByPolicyName(params.toolId, { allow: params.policy?.alsoAllow });
  const allowedByExplicitAllow = Array.isArray(params.policy?.allow)
    ? params.policy.allow.length > 0 &&
      isToolAllowedByPolicyName(params.toolId, { allow: params.policy.allow })
    : true;
  return (
    allowedByExplicitAllow &&
    (allowedByProfile || allowedByOverride) &&
    isToolAllowedByPolicyName(params.toolId, { deny: params.policy?.deny })
  );
}

function requireAgentId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalized) || isReservedSystemAgentId(normalized)) {
    throw new Error("AGENT_ID_INVALID");
  }
  return normalized;
}

function resolveRuntimeAgentId(
  config: OpenClawConfig,
  scope: EnterpriseAgentScope,
  id: string,
): { agentId: string; account?: EnterpriseAccount } {
  if (scope === "shared") {
    const agentId = requireAgentId(id);
    if (!listAgentEntries(config).some((entry) => entry.id === agentId)) {
      throw new Error("AGENT_NOT_FOUND");
    }
    return { agentId };
  }
  const account = getEnterpriseAccountById(id);
  if (!account) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }
  return { agentId: resolveEnterprisePersonalAgentId(config, account), account };
}

function resolveAgentConfig(
  config: OpenClawConfig,
  resolved: ReturnType<typeof resolveRuntimeAgentId>,
): OpenClawConfig {
  return resolved.account
    ? projectEnterpriseRuntimeConfig(config, resolved.account, { userAudience: true })
    : config;
}

function redactedConfig(config: OpenClawConfig): OpenClawConfig {
  return redactConfigObject(config, buildConfigSchemaCore().uiHints) as OpenClawConfig;
}

export async function readEnterpriseAgentFile(
  config: OpenClawConfig,
  scope: EnterpriseAgentScope,
  id: string,
  name: string,
) {
  const resolved = resolveRuntimeAgentId(config, scope, id);
  const projectedConfig = resolveAgentConfig(config, resolved);
  const workspace = resolveAgentWorkspaceDir(projectedConfig, resolved.agentId);
  return {
    scope,
    id,
    agentId: resolved.agentId,
    accountId: resolved.account?.id ?? null,
    file: await readEnterpriseAgentCoreFile(workspace, name),
  };
}

export async function writeEnterpriseAgentFile(
  config: OpenClawConfig,
  scope: EnterpriseAgentScope,
  id: string,
  input: { name: string; content: string; baseRevision: string | null },
) {
  const resolved = resolveRuntimeAgentId(config, scope, id);
  const projectedConfig = resolveAgentConfig(config, resolved);
  const workspace = resolveAgentWorkspaceDir(projectedConfig, resolved.agentId);
  return {
    scope,
    id,
    agentId: resolved.agentId,
    accountId: resolved.account?.id ?? null,
    file: await writeEnterpriseAgentCoreFile(workspace, input),
  };
}

async function readCronPanel(agentId: string, runtime?: EnterpriseAgentRuntimeServices) {
  const cron = runtime?.gatewayContext?.cron;
  if (!cron) {
    return { available: false, status: null, jobs: [], reason: "GATEWAY_RUNTIME_UNAVAILABLE" };
  }
  const [status, allJobs] = await Promise.all([
    cron.status(),
    cron.list({ includeDisabled: true }),
  ]);
  const jobs = allJobs.filter((job) => (job.agentId ?? cron.getDefaultAgentId()) === agentId);
  const nextRunAtMs = jobs
    .map((job) => job.state.nextRunAtMs)
    .filter((value): value is number => typeof value === "number")
    .toSorted((left, right) => left - right)[0];
  return {
    available: true,
    status: {
      enabled: status.enabled,
      triggersEnabled: status.triggersEnabled,
      jobs: jobs.length,
      nextWakeAtMs: nextRunAtMs ?? null,
    },
    jobs,
  };
}

async function readChannelsPanel(runtime?: EnterpriseAgentRuntimeServices) {
  const context = runtime?.gatewayContext;
  if (!context) {
    return { available: false, channelAccounts: {}, reason: "GATEWAY_RUNTIME_UNAVAILABLE" };
  }
  const { channelsHandlers } = await import("../../gateway/server-methods/channels.js");
  return await invokeEnterpriseGatewayHandler(
    channelsHandlers["channels.status"],
    "channels.status",
    {
      probe: false,
      timeoutMs: 5_000,
    },
    context,
  );
}

async function readMemoryPanel(agentId: string, runtime?: EnterpriseAgentRuntimeServices) {
  const context = runtime?.gatewayContext;
  if (!context) {
    return { available: false, status: null, diary: null, reason: "GATEWAY_RUNTIME_UNAVAILABLE" };
  }
  const { createDoctorHandlers } = await import("../../gateway/server-methods/doctor.js");
  const handlers = createDoctorHandlers();
  const [status, diary] = await Promise.all([
    invokeEnterpriseGatewayHandler(
      handlers["doctor.memory.status"],
      "doctor.memory.status",
      {
        agentId,
        probe: false,
      },
      context,
    ),
    invokeEnterpriseGatewayHandler(
      handlers["doctor.memory.dreamDiary"],
      "doctor.memory.dreamDiary",
      {
        agentId,
      },
      context,
    ),
  ]);
  return { available: true, status, diary };
}

export async function readEnterpriseAgentPanel(
  config: OpenClawConfig,
  scope: EnterpriseAgentScope,
  id: string,
  panel: EnterpriseAgentPanel,
  runtime?: EnterpriseAgentRuntimeServices,
) {
  const resolved = resolveRuntimeAgentId(config, scope, id);
  const effectiveConfig = resolveAgentConfig(config, resolved);
  const agent = listAgentEntries(effectiveConfig).find((entry) => entry.id === resolved.agentId);
  if (!agent) {
    throw new Error("AGENT_NOT_FOUND");
  }
  const workspace = resolveAgentWorkspaceDir(effectiveConfig, agent.id);
  const safeConfig = redactedConfig(effectiveConfig);
  const safeAgent = listAgentEntries(safeConfig).find((entry) => entry.id === agent.id);
  const snapshot = await readConfigFileSnapshot({ observe: false });
  const revision = snapshot.hash ?? hashConfigRaw(snapshot.raw);
  const envelope = {
    scope,
    id,
    agentId: agent.id,
    accountId: resolved.account?.id ?? null,
    revision,
    panel,
  };
  switch (panel) {
    case "relationships":
      if (scope !== "shared") {
        throw new Error("RELATIONSHIP_SCOPE_UNAVAILABLE");
      }
      return {
        ...envelope,
        relationship: await readEnterpriseSharedRelationshipsPanel(config, agent.id),
      };
    case "files":
      return { ...envelope, workspace, files: await listEnterpriseAgentCoreFiles(workspace) };
    case "tools": {
      const catalog = buildToolsCatalogResult({
        cfg: safeConfig,
        agentId: agent.id,
        includePlugins: true,
      });
      const accountToolPolicy = resolved.account
        ? readEnterpriseAccountToolPolicy(resolved.account.id)
        : null;
      const projectedPolicy = safeAgent?.tools ?? safeConfig.tools ?? null;
      const inheritedProfile = projectedPolicy?.profile ?? "full";
      const catalogToolIds = catalog.groups.flatMap((group) =>
        group.tools.map((tool) => normalizeToolPolicyName(tool.id)),
      );
      const lockedToolIds = catalogToolIds.filter(isEnterpriseNonDelegableToolId).toSorted();
      const effectivePolicy = resolveEffectiveToolPolicy({
        config: effectiveConfig,
        agentId: agent.id,
      });
      const effectivePolicyLayers = [
        mergeAlsoAllowPolicy(
          resolveToolProfilePolicy(effectivePolicy.profile),
          effectivePolicy.profileAlsoAllow,
        ),
        mergeAlsoAllowPolicy(
          resolveToolProfilePolicy(effectivePolicy.providerProfile),
          effectivePolicy.providerProfileAlsoAllow,
        ),
        effectivePolicy.globalPolicy,
        effectivePolicy.globalProviderPolicy,
        effectivePolicy.agentPolicy,
        effectivePolicy.agentProviderPolicy,
      ];
      const accountCompiledPolicy = resolved.account
        ? mergeAlsoAllowPolicy(
            compileEnterpriseToolPolicy(config, resolved.account, accountToolPolicy ?? undefined),
            // Managed coordination grants are already authorized by the scoped runtime.
            // An unchanged Admin save must not turn their absence from the preset into a deny.
            ENTERPRISE_DELEGATION_MANAGED_TOOL_IDS.filter((toolId) =>
              isToolAllowedByPolicies(toolId, effectivePolicyLayers),
            ),
          )
        : null;
      const profile = projectedPolicy?.profile ?? null;
      const baseProfilePolicy = resolveToolProfilePolicy(profile ?? inheritedProfile);
      const derivedAccountPolicy =
        resolved.account && accountCompiledPolicy
          ? {
              profile,
              alsoAllow: catalogToolIds
                .filter(
                  (toolId) =>
                    (accountCompiledPolicy.allow?.length ?? 0) > 0 &&
                    isToolAllowedByPolicyName(toolId, accountCompiledPolicy) &&
                    !isToolAllowedByPolicyName(toolId, baseProfilePolicy),
                )
                .toSorted(),
              deny: catalogToolIds
                .filter(
                  (toolId) =>
                    isToolAllowedByPolicyName(toolId, baseProfilePolicy) &&
                    ((accountCompiledPolicy.allow?.length ?? 0) === 0 ||
                      !isToolAllowedByPolicyName(toolId, accountCompiledPolicy)),
                )
                .toSorted(),
            }
          : projectedPolicy;
      const configuredPanelPolicy: EnterpriseAgentToolPanelPolicy | null =
        accountToolPolicy?.configured === true
          ? {
              profile: accountToolPolicy.profile,
              alsoAllow: accountToolPolicy.alsoAllow,
              deny: accountToolPolicy.deny,
            }
          : derivedAccountPolicy;
      const policy: EnterpriseAgentToolPanelPolicy = {
        ...(configuredPanelPolicy ?? {}),
        deny: [...new Set([...(configuredPanelPolicy?.deny ?? []), ...lockedToolIds])].toSorted(),
      };
      const effectiveTools = resolveEffectiveToolInventory({
        cfg: effectiveConfig,
        agentId: agent.id,
        workspaceDir: workspace,
        modelApi: null,
      });
      const effectiveToolIds = new Set(
        effectiveTools.groups.flatMap((group) =>
          group.tools.map((tool) => normalizeToolPolicyName(tool.id)),
        ),
      );
      const sandboxRuntime = resolveSandboxRuntimeStatus({
        cfg: effectiveConfig,
        agentId: agent.id,
        sessionKey: `agent:${agent.id}:enterprise-admin-tools-preview`,
      });
      const sandboxConfig = resolveSandboxConfigForAgent(effectiveConfig, agent.id);
      const runtimeWebTools = getActiveRuntimeWebToolsMetadataFromState();
      const sandboxState: EnterpriseAgentSandboxState = {
        enabled: sandboxRuntime.mode !== "off",
        tools: catalogToolIds.map((toolId) => {
          if (lockedToolIds.includes(toolId)) {
            return {
              id: toolId,
              status: "locked",
              reason: "ENTERPRISE_NON_DELEGABLE",
            };
          }
          if (!panelPolicyAllowsTool({ toolId, policy, inheritedProfile })) {
            return { id: toolId, status: "blocked", reason: "ADMIN_POLICY_DENY" };
          }
          if (!isToolAllowedByPolicies(toolId, effectivePolicyLayers)) {
            return { id: toolId, status: "blocked", reason: "AGENT_POLICY_DENY" };
          }
          if (sandboxRuntime.sandboxed && !isToolAllowed(sandboxRuntime.toolPolicy, toolId)) {
            return { id: toolId, status: "blocked", reason: "SANDBOX_POLICY_DENY" };
          }
          if (toolId === "browser" && sandboxRuntime.sandboxed && !sandboxConfig.browser.enabled) {
            return {
              id: toolId,
              status: "setup_required",
              reason: "SANDBOX_BROWSER_DISABLED",
            };
          }
          if (toolId === "web_search" && runtimeWebTools?.search.providerSource === "none") {
            return {
              id: toolId,
              status: "setup_required",
              reason: "WEB_SEARCH_PROVIDER_UNAVAILABLE",
            };
          }
          if (
            toolId === "web_fetch" &&
            runtimeWebTools?.fetch.selectedProviderKeySource === "missing" &&
            !runtimeWebTools.fetch.selectedProvider
          ) {
            return {
              id: toolId,
              status: "setup_required",
              reason: "WEB_FETCH_PROVIDER_UNAVAILABLE",
            };
          }
          if (!effectiveToolIds.has(toolId)) {
            return { id: toolId, status: "setup_required", reason: "RUNTIME_UNAVAILABLE" };
          }
          return { id: toolId, status: "open" };
        }),
      };
      return {
        ...envelope,
        tools: catalog,
        effectiveTools,
        policy,
        policyRevision: accountToolPolicy?.revision ?? null,
        inheritedProfile,
        lockedToolIds,
        sandboxState,
        editable:
          scope === "shared" ||
          Boolean(resolved.account?.enabled && resolved.account.personalAgentEnabled),
      };
    }
    case "skills":
      return {
        ...envelope,
        skills: buildWorkspaceSkillStatus(workspace, { config: safeConfig, agentId: agent.id }),
        binding: safeAgent?.skills ?? safeConfig.agents?.defaults?.skills ?? null,
        editable: scope === "shared",
      };
    case "channels":
      return {
        ...envelope,
        channels:
          scope === "personal"
            ? {
                available: false,
                channelAccounts: {},
                reason: "PERSONAL_RUNTIME_SCOPE_UNAVAILABLE",
              }
            : await readChannelsPanel(runtime),
      };
    case "cron":
      return {
        ...envelope,
        cron:
          scope === "personal"
            ? {
                available: false,
                status: null,
                jobs: [],
                reason: "PERSONAL_RUNTIME_SCOPE_UNAVAILABLE",
              }
            : await readCronPanel(agent.id, runtime),
      };
    case "memory":
      return {
        ...envelope,
        memory:
          scope === "personal"
            ? {
                available: false,
                status: null,
                diary: null,
                reason: "PERSONAL_RUNTIME_SCOPE_UNAVAILABLE",
              }
            : await readMemoryPanel(agent.id, runtime),
      };
    default:
      return {
        ...envelope,
        agent: safeAgent,
        defaults: {
          model: safeConfig.agents?.defaults?.model ?? null,
          sandbox: safeConfig.agents?.defaults?.sandbox ?? null,
        },
        workspace,
      };
  }
}

async function writeAgentEntryPatch(
  scope: EnterpriseAgentScope,
  id: string,
  baseHash: string,
  patch: (entry: AgentEntryConfig) => AgentEntryConfig,
) {
  if (scope !== "shared") {
    throw new Error("PERSONAL_AGENT_POLICY_MANAGED_BY_ACCESS");
  }
  const current = await currentConfigForMutation(baseHash);
  const resolved = resolveRuntimeAgentId(current.config, scope, id);
  const existing = current.config.agents?.entries?.[resolved.agentId];
  if (!existing) {
    throw new Error("AGENT_NOT_FOUND");
  }
  const next: OpenClawConfig = {
    ...current.config,
    agents: {
      ...current.config.agents,
      entries: {
        ...(current.config.agents?.entries ?? {}),
        [resolved.agentId]: patch(existing),
      },
      list: undefined,
    },
  };
  const result = await writeConfigFile(next, {
    baseSnapshot: current.snapshot,
    allowDestructiveWrite: true,
    auditOrigin: "config-rpc",
  });
  return { agentId: resolved.agentId, hash: result.persistedHash };
}

export async function updateEnterpriseAgentTools(
  config: OpenClawConfig,
  scope: EnterpriseAgentScope,
  id: string,
  input: {
    profile?: "minimal" | "coding" | "messaging" | "full" | null;
    alsoAllow: string[];
    deny: string[];
    baseHash?: string;
    baseRevision?: number;
  },
) {
  const normalizedAlsoAllow = [
    ...new Set(input.alsoAllow.map(normalizeToolPolicyName).filter(Boolean)),
  ].toSorted();
  if (normalizedAlsoAllow.some(isEnterpriseNonDelegableToolId)) {
    throw new Error("FIELD_INVALID:alsoAllow");
  }
  if (scope === "personal") {
    const resolved = resolveRuntimeAgentId(config, scope, id);
    if (!resolved.account?.enabled || !resolved.account.personalAgentEnabled) {
      throw new Error("PERSONAL_AGENT_DISABLED");
    }
    if (!Number.isSafeInteger(input.baseRevision) || Number(input.baseRevision) < 0) {
      throw new Error("FIELD_INVALID:baseRevision");
    }
    const catalog = buildToolsCatalogResult({
      cfg: config,
      agentId: resolved.agentId,
      includePlugins: true,
    });
    const knownToolIds = new Set(
      catalog.groups.flatMap((group) =>
        group.tools.map((tool) => normalizeToolPolicyName(tool.id)),
      ),
    );
    const normalizeKnown = (values: string[], field: "alsoAllow" | "deny") => {
      const normalized = [...new Set(values.map(normalizeToolPolicyName).filter(Boolean))];
      if (normalized.some((toolId) => !knownToolIds.has(toolId))) {
        throw new Error(`FIELD_INVALID:${field}`);
      }
      return normalized.toSorted();
    };
    const alsoAllow = normalizeKnown(normalizedAlsoAllow, "alsoAllow");
    const deny = normalizeKnown(input.deny, "deny").filter(
      (toolId) => !isEnterpriseNonDelegableToolId(toolId),
    );
    const saved = writeEnterpriseAccountToolPolicy(
      resolved.account.id,
      Number(input.baseRevision),
      { profile: input.profile ?? null, alsoAllow, deny },
    );
    return {
      agentId: resolved.agentId,
      accountId: resolved.account.id,
      policyRevision: saved.revision,
    };
  }
  if (!input.baseHash) {
    throw new Error("FIELD_INVALID:baseHash");
  }
  return await writeAgentEntryPatch(scope, id, input.baseHash, (entry) => ({
    ...entry,
    tools: {
      ...entry.tools,
      ...(input.profile === null ? { profile: undefined } : { profile: input.profile }),
      allow: undefined,
      alsoAllow: normalizedAlsoAllow,
      deny: [
        ...new Set([
          ...input.deny.map(normalizeToolPolicyName).filter(Boolean),
          ...ENTERPRISE_NON_DELEGABLE_TOOL_IDS,
        ]),
      ].toSorted(),
    },
  }));
}

export async function updateEnterpriseAgentSkills(
  scope: EnterpriseAgentScope,
  id: string,
  skills: string[] | null,
  baseHash: string,
) {
  return await writeAgentEntryPatch(scope, id, baseHash, (entry) => ({
    ...entry,
    skills: skills ?? undefined,
  }));
}

export async function updateEnterpriseAgentDelegationProfile(
  agentId: string,
  input: {
    description: string;
    profile: Omit<AgentDelegationTargetConfig, "requiredInputs"> & {
      requiredInputs: Array<{ id?: string; label: string; question: string }>;
    };
    baseHash: string;
  },
) {
  const requiredInputs = input.profile.requiredInputs.map((item) => ({
    id:
      item.id && /^[a-z][a-z0-9_-]{0,63}$/.test(item.id)
        ? item.id
        : `input_${generateSecureUuid().replaceAll("-", "").slice(0, 12)}`,
    label: item.label.trim(),
    question: item.question.trim(),
  }));
  return await writeAgentEntryPatch("shared", agentId, input.baseHash, (entry) => ({
    ...entry,
    description: input.description.trim(),
    delegationTarget: {
      status: input.profile.status,
      aliases: [...new Set(input.profile.aliases.map((value) => value.trim()).filter(Boolean))],
      handlingMode: input.profile.handlingMode,
      useWhen: [...new Set(input.profile.useWhen.map((value) => value.trim()).filter(Boolean))],
      avoidWhen: [...new Set(input.profile.avoidWhen.map((value) => value.trim()).filter(Boolean))],
      requiredInputs,
    },
  }));
}

function requireCronRuntime(runtime?: EnterpriseAgentRuntimeServices) {
  const cron = runtime?.gatewayContext?.cron;
  if (!cron) {
    throw new Error("GATEWAY_RUNTIME_UNAVAILABLE");
  }
  return cron;
}

async function requireOwnedCronJob(
  agentId: string,
  jobId: string,
  runtime?: EnterpriseAgentRuntimeServices,
) {
  const cron = requireCronRuntime(runtime);
  const job = await cron.readJob(jobId);
  if (!job || (job.agentId ?? cron.getDefaultAgentId()) !== agentId) {
    throw new Error("CRON_JOB_NOT_FOUND");
  }
  return { cron, job };
}

export async function createEnterpriseAgentCronJob(
  config: OpenClawConfig,
  scope: EnterpriseAgentScope,
  id: string,
  input: CronJobCreate,
  runtime?: EnterpriseAgentRuntimeServices,
) {
  if (scope !== "shared") {
    throw new Error("PERSONAL_RUNTIME_SCOPE_UNAVAILABLE");
  }
  const resolved = resolveRuntimeAgentId(config, scope, id);
  const cron = requireCronRuntime(runtime);
  return await cron.add({ ...input, agentId: resolved.agentId });
}

export async function updateEnterpriseAgentCronJob(
  config: OpenClawConfig,
  scope: EnterpriseAgentScope,
  id: string,
  jobId: string,
  patch: CronJobPatch,
  expectedUpdatedAt: number,
  runtime?: EnterpriseAgentRuntimeServices,
) {
  if (scope !== "shared") {
    throw new Error("PERSONAL_RUNTIME_SCOPE_UNAVAILABLE");
  }
  const resolved = resolveRuntimeAgentId(config, scope, id);
  const { cron } = await requireOwnedCronJob(resolved.agentId, jobId, runtime);
  return await cron.updateWithPrecondition(
    jobId,
    { ...patch, agentId: resolved.agentId },
    (current) => {
      if (current.updatedAtMs !== expectedUpdatedAt) {
        throw new Error("CRON_JOB_REVISION_CONFLICT");
      }
    },
  );
}

export async function runEnterpriseAgentCronJob(
  config: OpenClawConfig,
  scope: EnterpriseAgentScope,
  id: string,
  jobId: string,
  runtime?: EnterpriseAgentRuntimeServices,
) {
  if (scope !== "shared") {
    throw new Error("PERSONAL_RUNTIME_SCOPE_UNAVAILABLE");
  }
  const resolved = resolveRuntimeAgentId(config, scope, id);
  const { cron } = await requireOwnedCronJob(resolved.agentId, jobId, runtime);
  return await cron.run(jobId, "force");
}

export async function removeEnterpriseAgentCronJob(
  config: OpenClawConfig,
  scope: EnterpriseAgentScope,
  id: string,
  jobId: string,
  expectedUpdatedAt: number,
  runtime?: EnterpriseAgentRuntimeServices,
) {
  if (scope !== "shared") {
    throw new Error("PERSONAL_RUNTIME_SCOPE_UNAVAILABLE");
  }
  const resolved = resolveRuntimeAgentId(config, scope, id);
  const { cron, job } = await requireOwnedCronJob(resolved.agentId, jobId, runtime);
  if (job.updatedAtMs !== expectedUpdatedAt) {
    throw new Error("CRON_JOB_REVISION_CONFLICT");
  }
  return await cron.remove(jobId);
}

export async function runEnterpriseMemoryAction(
  config: OpenClawConfig,
  scope: EnterpriseAgentScope,
  id: string,
  action:
    | "backfillDreamDiary"
    | "resetDreamDiary"
    | "resetGroundedShortTerm"
    | "repairDreamingArtifacts"
    | "dedupeDreamDiary",
  runtime?: EnterpriseAgentRuntimeServices,
) {
  if (scope !== "shared") {
    throw new Error("PERSONAL_RUNTIME_SCOPE_UNAVAILABLE");
  }
  const resolved = resolveRuntimeAgentId(config, scope, id);
  const context = runtime?.gatewayContext;
  if (!context) {
    throw new Error("GATEWAY_RUNTIME_UNAVAILABLE");
  }
  const { createDoctorHandlers } = await import("../../gateway/server-methods/doctor.js");
  const method = `doctor.memory.${action}`;
  return await invokeEnterpriseGatewayHandler(
    createDoctorHandlers()[method],
    method,
    {
      agentId: resolved.agentId,
    },
    context,
  );
}

async function currentConfigForMutation(baseHash: string) {
  const snapshot = await readConfigFileSnapshot({ observe: false });
  const currentHash = snapshot.hash ?? hashConfigRaw(snapshot.raw);
  if (currentHash !== baseHash) {
    throw new Error(`CONFIG_HASH_CONFLICT:${currentHash}`);
  }
  if (!snapshot.valid) {
    throw new Error("CONFIG_CURRENT_INVALID");
  }
  return { snapshot, config: snapshot.config, currentHash };
}

export async function createEnterpriseSharedAgent(input: {
  id: string;
  name: string;
  model?: string | null;
  workspace?: string | null;
  baseHash: string;
}) {
  const agentId = requireAgentId(input.id);
  return await withEnterpriseAgentLifecycleLocks([sharedAgentResourceKey(agentId)], async () => {
    const current = await currentConfigForMutation(input.baseHash);
    if (listAgentEntries(current.config).some((entry) => entry.id === agentId)) {
      throw new Error("AGENT_EXISTS");
    }
    const entry: AgentEntryConfig = {
      name: input.name.trim() || agentId,
      ...(input.model ? { model: input.model } : {}),
      ...(input.workspace ? { workspace: input.workspace } : {}),
    };
    const next: OpenClawConfig = {
      ...current.config,
      agents: {
        ...current.config.agents,
        entries: { ...(current.config.agents?.entries ?? {}), [agentId]: entry },
        list: undefined,
      },
    };
    const result = await writeConfigFile(next, {
      baseSnapshot: current.snapshot,
      allowDestructiveWrite: true,
      auditOrigin: "config-rpc",
    });
    return { agentId, hash: result.persistedHash };
  });
}

export async function updateEnterpriseSharedAgent(
  agentIdInput: string,
  patch: { name?: string; model?: string | null; workspace?: string | null },
  baseHash: string,
) {
  const agentId = requireAgentId(agentIdInput);
  const current = await currentConfigForMutation(baseHash);
  const existing = current.config.agents?.entries?.[agentId];
  if (!existing) {
    throw new Error("AGENT_NOT_FOUND");
  }
  const entry: AgentEntryConfig = {
    ...existing,
    ...(patch.name === undefined ? {} : { name: patch.name.trim() || agentId }),
    ...(patch.model === undefined ? {} : { model: patch.model || undefined }),
    ...(patch.workspace === undefined ? {} : { workspace: patch.workspace || undefined }),
  };
  const next: OpenClawConfig = {
    ...current.config,
    agents: {
      ...current.config.agents,
      entries: { ...(current.config.agents?.entries ?? {}), [agentId]: entry },
      list: undefined,
    },
  };
  const result = await writeConfigFile(next, {
    baseSnapshot: current.snapshot,
    allowDestructiveWrite: true,
    auditOrigin: "config-rpc",
  });
  return { agentId, hash: result.persistedHash };
}

export async function deleteEnterpriseSharedAgent(agentIdInput: string, baseHash: string) {
  const agentId = requireAgentId(agentIdInput);
  return await withEnterpriseAgentLifecycleLocks([sharedAgentResourceKey(agentId)], async () => {
    const current = await currentConfigForMutation(baseHash);
    const entry = current.config.agents?.entries?.[agentId];
    if (!entry) {
      throw new Error("AGENT_NOT_FOUND");
    }
    const usedAsDefault = listEnterpriseAccounts().some(
      (account) => account.defaultAgentId === agentId,
    );
    if (entry.default === true || usedAsDefault) {
      throw new Error("AGENT_IN_USE");
    }
    const entries = { ...(current.config.agents?.entries ?? {}) };
    delete entries[agentId];
    const next: OpenClawConfig = {
      ...current.config,
      agents: { ...current.config.agents, entries, list: undefined },
    };
    const result = await writeConfigFile(next, {
      baseSnapshot: current.snapshot,
      allowDestructiveWrite: true,
      auditOrigin: "config-rpc",
    });
    const orphanedAssignments = markEnterpriseAgentEntitlementsOrphaned(
      sharedAgentResourceKey(agentId),
    );
    cancelPendingEnterpriseAgentAccessRequestsForResource(
      sharedAgentResourceKey(agentId),
      "Agent removed",
    );
    return { agentId, hash: result.persistedHash, orphanedAssignments };
  });
}
