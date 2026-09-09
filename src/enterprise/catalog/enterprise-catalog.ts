// Server-side Enterprise catalogs. Frontends must not infer effective access from raw config.
import { createHash } from "node:crypto";
import { listAgentEntries, resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import { resolveSwarmConfig } from "../../agents/subagents/swarm/swarm-config.js";
import { listCoreToolSections } from "../../agents/tool-catalog.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { buildToolsCatalogResult } from "../../gateway/server-methods/tools-catalog.js";
import { registerPluginMetadataProcessMemoLifecycleClear } from "../../plugins/plugin-metadata-lifecycle.js";
import { getActivePluginRegistryVersion } from "../../plugins/runtime.js";
import { buildWorkspaceSkillStatus } from "../../skills/discovery/status.js";
import { loadWorkspaceSkills } from "../../skills/loading/workspace-skill-loader.js";
import { getSkillsSnapshotVersion } from "../../skills/runtime/refresh-state.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import { CONFIG_DIR } from "../../utils.js";
import { listEnterpriseAccounts } from "../accounts/account-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { enterpriseDelegationCountsForAgent } from "../delegation/delegation-candidates.js";
import {
  listEnterpriseEntitlements,
  listEnterpriseEntitlementsForResource,
  resolveEnterpriseResourceAccess,
} from "../entitlements/entitlement-store.js";
import {
  agentSkillResourceKey,
  accessPresetToolIds,
  coreToolResourceKey,
  ENTERPRISE_ACCESS_PRESET_BASIC,
  globalSkillResourceKey,
  personalAgentResourceKey,
  parseEnterpriseResourceKey,
  pluginToolResourceKey,
  sharedAgentResourceKey,
  isEnterpriseNonDelegableToolId,
} from "../entitlements/resource-keys.js";
import { isKnowledgeEvidenceTransferTarget } from "../knowledge/knowledge-evidence-transfer-policy.js";
import {
  resolveEnterprisePersonalAgentId,
  resolveEnterprisePersonalAgentTemplateId,
} from "../personal-agent/personal-agent-config.js";

function catalogRevision(config: OpenClawConfig): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex").slice(0, 16);
}

type AgentCapabilityCounts = {
  skillCount: number;
  toolCount: number;
};

function readAgentCapabilityCounts(config: OpenClawConfig, agentId: string): AgentCapabilityCounts {
  // ponytail: linear lookup is fine for admin-scale rosters; index by agentId at hundreds of agents.
  const skillReport = readEnterpriseSkillInventory(config).find((entry) => entry.id === agentId);
  const toolCatalog = readEnterpriseToolInventory(config).find(
    (entry) => entry.agentId === agentId,
  );
  return {
    skillCount: skillReport?.report.skills.length ?? 0,
    toolCount:
      toolCatalog?.catalog.groups.reduce((count, group) => count + group.tools.length, 0) ?? 0,
  };
}

function assignedUserCount(resourceType: "agent" | "skill" | "tool", resourceId: string): number {
  return new Set(
    listEnterpriseEntitlementsForResource(resourceType, resourceId)
      .filter((entry) => entry.effect === "allow")
      .map((entry) => entry.accountId),
  ).size;
}

function modelLabel(model: unknown): string | null {
  if (typeof model === "string") {
    return model;
  }
  if (model && typeof model === "object" && "primary" in model) {
    const primary = (model as { primary?: unknown }).primary;
    return typeof primary === "string" ? primary : null;
  }
  return null;
}

function effectiveAccess(
  config: OpenClawConfig,
  account: EnterpriseAccount | undefined,
  resourceType: "agent" | "skill" | "tool",
  resourceKey: string,
  intrinsicStatus: "ready" | "needs_setup" | "disabled",
  revision: string,
) {
  if (!account) {
    return undefined;
  }
  const assignment =
    listEnterpriseEntitlementsForResource(resourceType, resourceKey).find(
      (item) => item.accountId === account.id,
    )?.effect ?? "none";
  const resolved = resolveEnterpriseResourceAccess(account, resourceType, resourceKey, {}, config);
  return {
    assignedEffect: assignment,
    // Permission and runtime readiness are separate facts. A granted tool can
    // still require a provider, browser, device, or session capability.
    permissionAllowed: resolved.allowed,
    // For tools this is the policy answer. Runtime readiness is exposed as a
    // separate status so a granted browser/provider tool is not mislabeled as
    // a permission denial merely because this process cannot probe it yet.
    effectiveAllowed:
      resourceType === "tool" ? resolved.allowed : resolved.allowed && intrinsicStatus === "ready",
    intrinsicStatus,
    reasonCodes:
      intrinsicStatus === "ready" ? [resolved.reason] : [intrinsicStatus, resolved.reason],
    policyRevision: account.policyRevision,
    catalogRevision: revision,
  };
}

type ToolIntrinsicStatus = "ready" | "needs_setup" | "disabled";

const RUNTIME_CHECKED_TOOL_IDS = new Set([
  "memory_search",
  "memory_get",
  "ask_user",
  "automations",
  "progress_card",
  "suggest_task",
  "browser",
  "canvas",
  "dashboard",
  "show_widget",
  "music_generate",
  "tts",
  "video_generate",
  "view_image",
  "web_search",
  "web_fetch",
  "x_search",
  "conversations_list",
  "conversations_send",
  "conversations_turn",
  "session_status",
  "sessions",
  "sessions_history",
  "sessions_search",
  "sessions_send",
]);

function toolIntrinsicReadiness(
  config: OpenClawConfig,
  toolId: string,
): { intrinsicStatus: ToolIntrinsicStatus; setupReason: string | null } {
  if (toolId === "browser" && config.browser?.enabled === false) {
    return { intrinsicStatus: "disabled", setupReason: "browser_disabled" };
  }
  if (toolId === "agents_wait" && !resolveSwarmConfig(config).enabled) {
    return { intrinsicStatus: "disabled", setupReason: "swarm_disabled" };
  }
  if (RUNTIME_CHECKED_TOOL_IDS.has(toolId)) {
    return { intrinsicStatus: "needs_setup", setupReason: "runtime_check_required" };
  }
  return { intrinsicStatus: "ready", setupReason: null };
}

export function listEnterpriseAgentCatalog(config: OpenClawConfig) {
  const revision = catalogRevision(config);
  const accounts = listEnterpriseAccounts();
  const shared = listAgentEntries(config)
    .filter((entry) => !isReservedSystemAgentId(entry.id))
    .map((entry) => {
      const resourceKey = sharedAgentResourceKey(entry.id);
      const delegationCounts = enterpriseDelegationCountsForAgent(config, entry.id, accounts);
      const capabilityCounts = readAgentCapabilityCounts(config, entry.id);
      return {
        kind: "shared" as const,
        scope: "shared" as const,
        resourceKey,
        agentId: entry.id,
        evidenceTransferEligible: isKnowledgeEvidenceTransferTarget(config, resourceKey),
        name: entry.identity?.name ?? entry.name ?? entry.id,
        description: entry.description ?? "",
        delegationTarget: entry.delegationTarget ?? null,
        delegationReadiness:
          entry.delegationTarget?.status === "active"
            ? ("ready" as const)
            : entry.delegationTarget?.status === "disabled"
              ? ("disabled" as const)
              : ("needs_setup" as const),
        model: modelLabel(entry.model ?? config.agents?.defaults?.model),
        runtime: entry.runtime?.type ?? "embedded",
        runtimeType: entry.runtime?.type ?? "embedded",
        workspace: resolveAgentWorkspaceDir(config, entry.id),
        assignedUserCount: delegationCounts.assigned,
        effectiveUserCount: delegationCounts.effective,
        routableUserCount: delegationCounts.routable,
        skillCount: capabilityCounts.skillCount,
        toolCount: capabilityCounts.toolCount,
        updatedAt: null,
      };
    });
  const personal = accounts.map((account) => {
    const runtimeAgentId = resolveEnterprisePersonalAgentId(config, account);
    const templateAgentId = resolveEnterprisePersonalAgentTemplateId(config, account);
    const template = listAgentEntries(config).find((entry) => entry.id === templateAgentId);
    const resourceKey = personalAgentResourceKey(account.id);
    const capabilityCounts = templateAgentId
      ? readAgentCapabilityCounts(config, templateAgentId)
      : undefined;
    return {
      kind: "personal" as const,
      scope: "personal" as const,
      instanceId: `personal:${account.id}`,
      resourceKey,
      accountId: account.id,
      owner: account.displayName,
      ownerDisplayName: account.displayName,
      username: account.username,
      enabled: account.enabled && account.personalAgentEnabled,
      runtimeAgentId,
      templateAgentId,
      model: modelLabel(template?.model ?? config.agents?.defaults?.model),
      workspaceStatus:
        account.enabled && account.personalAgentEnabled && templateAgentId ? "ready" : "disabled",
      activeSessionCount: 0,
      skillCount: capabilityCounts?.skillCount ?? 0,
      toolCount: capabilityCounts?.toolCount ?? 0,
      updatedAt: account.updatedAt,
      policyRevision: account.policyRevision,
    };
  });
  return { catalogRevision: revision, shared, personal };
}

function skillSourceCategory(
  source: string,
  bundled: boolean,
): "workspace" | "built-in" | "managed" | "extra" | "other" {
  if (source === "openclaw-workspace" || source === "agents-skills-project") {
    return "workspace";
  }
  if (bundled || source === "openclaw-bundled" || source === "openclaw-custodian") {
    return "built-in";
  }
  if (source === "openclaw-managed") {
    return "managed";
  }
  if (source === "openclaw-extra") {
    return "extra";
  }
  return "other";
}

type EnterpriseSkillInventory = Array<{
  id: string;
  report: ReturnType<typeof buildWorkspaceSkillStatus>;
}>;

let enterpriseSkillInventoryCache: { key: string; reports: EnterpriseSkillInventory } | undefined;

function skillSnapshotCatalogSignature(config: OpenClawConfig): string {
  const workspaces = new Set<string>([CONFIG_DIR]);
  for (const entry of listAgentEntries(config)) {
    if (!isReservedSystemAgentId(entry.id)) {
      workspaces.add(resolveAgentWorkspaceDir(config, entry.id));
    }
  }
  return JSON.stringify(
    [...workspaces].toSorted().map((workspace) => [workspace, getSkillsSnapshotVersion(workspace)]),
  );
}

function readEnterpriseSkillInventory(config: OpenClawConfig): EnterpriseSkillInventory {
  const key = JSON.stringify([
    catalogRevision(config),
    getActivePluginRegistryVersion(),
    skillSnapshotCatalogSignature(config),
  ]);
  if (enterpriseSkillInventoryCache?.key === key) {
    return enterpriseSkillInventoryCache.reports;
  }
  // Inventory the managed root independently: it must remain visible without agents,
  // including when every workspace overrides a global skill with the same name.
  const managedEntries = loadWorkspaceSkills(CONFIG_DIR, {
    config,
    workspaceOnly: true,
    includeArchived: true,
  });
  for (const entry of managedEntries) {
    entry.skill.source = "openclaw-managed";
  }
  const reports = listAgentEntries(config)
    .filter((entry) => !isReservedSystemAgentId(entry.id))
    .map((entry) => ({
      id: entry.id,
      report: buildWorkspaceSkillStatus(resolveAgentWorkspaceDir(config, entry.id), {
        config,
        agentId: entry.id,
      }),
    }));
  reports.unshift({
    id: "",
    report: buildWorkspaceSkillStatus(CONFIG_DIR, { config, entries: managedEntries }),
  });
  enterpriseSkillInventoryCache = { key, reports };
  return reports;
}

function buildEnterpriseSkillCatalog(config: OpenClawConfig, selectedAccount?: EnterpriseAccount) {
  const revision = catalogRevision(config);
  const reports = readEnterpriseSkillInventory(config);
  const items = reports.flatMap(({ id, report }) => {
    return report.skills.map((skill) => {
      const category = skillSourceCategory(skill.source, skill.bundled);
      const resourceKey =
        category === "workspace"
          ? agentSkillResourceKey(id, skill.source, skill.skillKey)
          : globalSkillResourceKey(skill.source, skill.skillKey);
      const intrinsicStatus = skill.disabled
        ? "disabled"
        : skill.eligible && !skill.platformIncompatible
          ? "ready"
          : "needs_setup";
      const effective = effectiveAccess(
        config,
        selectedAccount,
        "skill",
        resourceKey,
        intrinsicStatus,
        revision,
      );
      return {
        resourceKey,
        skillKey: skill.skillKey,
        name: skill.name,
        description: skill.description,
        source: skill.source,
        category,
        agentId: category === "workspace" ? id : null,
        ownerAgentId: category === "workspace" ? id : null,
        intrinsicStatus,
        setupReason:
          intrinsicStatus === "needs_setup"
            ? [
                ...skill.missing.bins.map((value) => `binary:${value}`),
                ...skill.missing.env.map((value) => `env:${value}`),
                ...skill.missing.config.map((value) => `config:${value}`),
              ].join(", ") || "platform_incompatible"
            : null,
        eligible: skill.eligible,
        disabled: skill.disabled,
        missing: skill.missing,
        clawhub: skill.clawhub,
        assignedUserCount: assignedUserCount("skill", resourceKey),
        effective,
        effectiveAccess: effective,
      };
    });
  });
  const deduped = new Map<string, (typeof items)[number]>();
  for (const item of items) {
    if (!deduped.has(item.resourceKey)) {
      deduped.set(item.resourceKey, item);
    }
  }
  for (const account of listEnterpriseAccounts()) {
    for (const entitlement of listEnterpriseEntitlements(account.id)) {
      if (
        entitlement.resourceType !== "skill" ||
        parseEnterpriseResourceKey("skill", entitlement.resourceId).scope !== "legacy" ||
        deduped.has(entitlement.resourceId)
      ) {
        continue;
      }
      deduped.set(entitlement.resourceId, {
        resourceKey: entitlement.resourceId,
        skillKey: entitlement.resourceId,
        name: entitlement.resourceId,
        description: "Legacy entitlement chưa gắn với một skill occurrence ổn định.",
        source: "legacy",
        category: "other",
        agentId: null,
        ownerAgentId: null,
        intrinsicStatus: "needs_setup",
        setupReason: "legacy_unscoped_or_orphaned",
        eligible: false,
        disabled: false,
        missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
        clawhub: undefined,
        assignedUserCount: assignedUserCount("skill", entitlement.resourceId),
        effective: undefined,
        effectiveAccess: undefined,
      });
    }
  }
  return { catalogRevision: revision, items: [...deduped.values()] };
}

function buildEnterpriseToolCatalog(config: OpenClawConfig, selectedAccount?: EnterpriseAccount) {
  const revision = catalogRevision(config);
  const items = new Map<string, Record<string, unknown>>();
  for (const { agentId, catalog } of readEnterpriseToolInventory(config)) {
    for (const group of catalog.groups) {
      for (const tool of group.tools) {
        const resourceKey =
          tool.source === "plugin" && tool.pluginId
            ? pluginToolResourceKey(tool.pluginId, tool.id)
            : coreToolResourceKey(tool.id);
        const current = items.get(resourceKey);
        const agentIds = new Set<string>((current?.agentIds as string[] | undefined) ?? []);
        agentIds.add(agentId);
        const readiness = toolIntrinsicReadiness(config, tool.id);
        const effective = effectiveAccess(
          config,
          selectedAccount,
          "tool",
          resourceKey,
          readiness.intrinsicStatus,
          revision,
        );
        items.set(resourceKey, {
          resourceKey,
          toolId: tool.id,
          label: tool.label,
          description: tool.description,
          source: tool.source,
          pluginId: tool.pluginId ?? null,
          risk: tool.risk ?? "medium",
          tags: tool.tags ?? [],
          agentIds: [...agentIds].toSorted(),
          agentId: agentIds.size === 1 ? [...agentIds][0] : null,
          assignable: !isEnterpriseNonDelegableToolId(tool.id),
          nonDelegable: isEnterpriseNonDelegableToolId(tool.id),
          sessionDependent: tool.source === "plugin" && tool.id.includes("mcp"),
          assignedUserCount: assignedUserCount("tool", resourceKey),
          intrinsicStatus: readiness.intrinsicStatus,
          setupReason: readiness.setupReason,
          effective,
          effectiveAccess: effective,
        });
      }
    }
  }
  // The runtime catalog only contains tools materialized by a current agent
  // or plugin. Keep every built-in preset tool visible even when an agent has
  // not been started yet, so the admin can distinguish "granted" from
  // "runtime component needs setup" instead of seeing a false missing grant.
  const presetToolIds = new Set(accessPresetToolIds(ENTERPRISE_ACCESS_PRESET_BASIC));
  const staticToolMetadata = new Map(
    listCoreToolSections({ swarmEnabled: true })
      .flatMap((section) => section.tools)
      .map((tool) => [tool.id, tool] as const),
  );
  for (const toolId of presetToolIds) {
    const tool = staticToolMetadata.get(toolId);
    if (!tool) {
      continue;
    }
    const resourceKey = coreToolResourceKey(tool.id);
    if (items.has(resourceKey)) {
      continue;
    }
    const readiness = toolIntrinsicReadiness(config, tool.id);
    const effective = effectiveAccess(
      config,
      selectedAccount,
      "tool",
      resourceKey,
      readiness.intrinsicStatus,
      revision,
    );
    items.set(resourceKey, {
      resourceKey,
      toolId: tool.id,
      label: tool.label,
      description: tool.description,
      source: "core",
      pluginId: null,
      risk: "medium",
      tags: [],
      agentIds: [],
      agentId: null,
      assignable: !isEnterpriseNonDelegableToolId(tool.id),
      nonDelegable: isEnterpriseNonDelegableToolId(tool.id),
      sessionDependent: false,
      assignedUserCount: assignedUserCount("tool", resourceKey),
      intrinsicStatus: readiness.intrinsicStatus,
      setupReason: readiness.setupReason,
      effective,
      effectiveAccess: effective,
    });
  }
  for (const account of listEnterpriseAccounts()) {
    for (const entitlement of listEnterpriseEntitlements(account.id)) {
      if (
        entitlement.resourceType !== "tool" ||
        parseEnterpriseResourceKey("tool", entitlement.resourceId).scope !== "legacy" ||
        items.has(entitlement.resourceId)
      ) {
        continue;
      }
      items.set(entitlement.resourceId, {
        resourceKey: entitlement.resourceId,
        toolId: entitlement.resourceId,
        label: entitlement.resourceId,
        description: "Legacy entitlement chưa map được vào tool catalog hiện tại.",
        source: "legacy",
        pluginId: null,
        risk: "unknown",
        tags: [],
        agentIds: [],
        agentId: null,
        assignable: false,
        nonDelegable: false,
        sessionDependent: false,
        assignedUserCount: assignedUserCount("tool", entitlement.resourceId),
        intrinsicStatus: "needs_setup",
        setupReason: "legacy_unscoped_or_orphaned",
        effective: undefined,
        effectiveAccess: undefined,
      });
    }
  }
  return { catalogRevision: revision, items: [...items.values()] };
}

type EnterpriseToolInventory = Array<{
  agentId: string;
  catalog: ReturnType<typeof buildToolsCatalogResult>;
}>;

let enterpriseToolInventoryCache: { key: string; catalogs: EnterpriseToolInventory } | undefined;

function readEnterpriseToolInventory(config: OpenClawConfig): EnterpriseToolInventory {
  const key = JSON.stringify([catalogRevision(config), getActivePluginRegistryVersion()]);
  if (enterpriseToolInventoryCache?.key === key) {
    return enterpriseToolInventoryCache.catalogs;
  }
  const catalogs = listAgentEntries(config)
    .filter((agent) => !isReservedSystemAgentId(agent.id))
    .map((entry) => ({
      agentId: entry.id,
      catalog: buildToolsCatalogResult({
        cfg: config,
        agentId: entry.id,
        includePlugins: true,
      }),
    }));
  enterpriseToolInventoryCache = { key, catalogs };
  return catalogs;
}

/** Clear process-local intrinsic inventories after runtime/plugin/skill mutations. */
export function clearEnterpriseCatalogCaches(): void {
  enterpriseSkillInventoryCache = undefined;
  enterpriseToolInventoryCache = undefined;
}

registerPluginMetadataProcessMemoLifecycleClear(clearEnterpriseCatalogCaches);

export function listEnterpriseSkillCatalog(
  config: OpenClawConfig,
  selectedAccount?: EnterpriseAccount,
) {
  return buildEnterpriseSkillCatalog(config, selectedAccount);
}

export function listEnterpriseToolCatalog(
  config: OpenClawConfig,
  selectedAccount?: EnterpriseAccount,
) {
  return buildEnterpriseToolCatalog(config, selectedAccount);
}

/** Pay intrinsic filesystem/plugin discovery once before the Enterprise API becomes ready. */
export function prewarmEnterpriseCatalogs(config: OpenClawConfig): void {
  readEnterpriseSkillInventory(config);
  readEnterpriseToolInventory(config);
}
