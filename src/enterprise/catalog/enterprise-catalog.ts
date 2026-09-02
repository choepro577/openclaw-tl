// Server-side Enterprise catalogs. Frontends must not infer effective access from raw config.
import { createHash } from "node:crypto";
import { listAgentEntries, resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { buildToolsCatalogResult } from "../../gateway/server-methods/tools-catalog.js";
import { buildWorkspaceSkillStatus } from "../../skills/discovery/status.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import { listEnterpriseAccounts } from "../accounts/account-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import {
  listEnterpriseEntitlements,
  listEnterpriseEntitlementsForResource,
  resolveEnterpriseResourceAccess,
} from "../entitlements/entitlement-store.js";
import {
  agentSkillResourceKey,
  coreToolResourceKey,
  globalSkillResourceKey,
  personalAgentResourceKey,
  parseEnterpriseResourceKey,
  pluginToolResourceKey,
  sharedAgentResourceKey,
  isEnterpriseNonDelegableToolId,
} from "../entitlements/resource-keys.js";
import {
  resolveEnterprisePersonalAgentId,
  resolveEnterprisePersonalAgentTemplateId,
} from "../personal-agent/personal-agent-config.js";

function catalogRevision(config: OpenClawConfig): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex").slice(0, 16);
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
  const resolved = resolveEnterpriseResourceAccess(account, resourceType, resourceKey);
  return {
    assignedEffect: assignment,
    effectiveAllowed: resolved.allowed && intrinsicStatus === "ready",
    intrinsicStatus,
    reasonCodes:
      intrinsicStatus === "ready" ? [resolved.reason] : [intrinsicStatus, resolved.reason],
    policyRevision: account.policyRevision,
    catalogRevision: revision,
  };
}

export function listEnterpriseAgentCatalog(config: OpenClawConfig) {
  const revision = catalogRevision(config);
  const shared = listAgentEntries(config)
    .filter((entry) => !isReservedSystemAgentId(entry.id))
    .map((entry) => {
      const resourceKey = sharedAgentResourceKey(entry.id);
      const skills = buildWorkspaceSkillStatus(resolveAgentWorkspaceDir(config, entry.id), {
        config,
        agentId: entry.id,
      }).skills;
      const tools = buildToolsCatalogResult({
        cfg: config,
        agentId: entry.id,
        includePlugins: true,
      }).groups.flatMap((group) => group.tools);
      return {
        kind: "shared" as const,
        scope: "shared" as const,
        resourceKey,
        agentId: entry.id,
        name: entry.identity?.name ?? entry.name ?? entry.id,
        model: modelLabel(entry.model ?? config.agents?.defaults?.model),
        runtime: entry.runtime?.type ?? "embedded",
        runtimeType: entry.runtime?.type ?? "embedded",
        workspace: resolveAgentWorkspaceDir(config, entry.id),
        assignedUserCount: assignedUserCount("agent", resourceKey),
        skillCount: skills.length,
        toolCount: tools.length,
        updatedAt: null,
      };
    });
  const personal = listEnterpriseAccounts().map((account) => {
    const runtimeAgentId = resolveEnterprisePersonalAgentId(config, account);
    const templateAgentId = resolveEnterprisePersonalAgentTemplateId(config, account);
    const template = listAgentEntries(config).find((entry) => entry.id === templateAgentId);
    const resourceKey = personalAgentResourceKey(account.id);
    const skills = templateAgentId
      ? buildWorkspaceSkillStatus(resolveAgentWorkspaceDir(config, templateAgentId), {
          config,
          agentId: templateAgentId,
        }).skills
      : [];
    const tools = templateAgentId
      ? buildToolsCatalogResult({
          cfg: config,
          agentId: templateAgentId,
          includePlugins: true,
        }).groups.flatMap((group) => group.tools)
      : [];
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
      skillCount: skills.length,
      toolCount: tools.length,
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

export function listEnterpriseSkillCatalog(
  config: OpenClawConfig,
  selectedAccount?: EnterpriseAccount,
) {
  const revision = catalogRevision(config);
  const items = listAgentEntries(config)
    .filter((entry) => !isReservedSystemAgentId(entry.id))
    .flatMap((entry) => {
      const workspace = resolveAgentWorkspaceDir(config, entry.id);
      const report = buildWorkspaceSkillStatus(workspace, { config, agentId: entry.id });
      return report.skills.map((skill) => {
        const category = skillSourceCategory(skill.source, skill.bundled === true);
        const resourceKey =
          category === "workspace"
            ? agentSkillResourceKey(entry.id, skill.source, skill.skillKey)
            : globalSkillResourceKey(skill.source, skill.skillKey);
        const intrinsicStatus = skill.disabled
          ? "disabled"
          : skill.eligible && !skill.platformIncompatible
            ? "ready"
            : "needs_setup";
        return {
          resourceKey,
          skillKey: skill.skillKey,
          name: skill.name,
          description: skill.description,
          source: skill.source,
          category,
          agentId: category === "workspace" ? entry.id : null,
          ownerAgentId: category === "workspace" ? entry.id : null,
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
          effective: effectiveAccess(
            selectedAccount,
            "skill",
            resourceKey,
            intrinsicStatus,
            revision,
          ),
          effectiveAccess: effectiveAccess(
            selectedAccount,
            "skill",
            resourceKey,
            intrinsicStatus,
            revision,
          ),
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

export function listEnterpriseToolCatalog(
  config: OpenClawConfig,
  selectedAccount?: EnterpriseAccount,
) {
  const revision = catalogRevision(config);
  const items = new Map<string, Record<string, unknown>>();
  for (const entry of listAgentEntries(config).filter(
    (agent) => !isReservedSystemAgentId(agent.id),
  )) {
    const catalog = buildToolsCatalogResult({
      cfg: config,
      agentId: entry.id,
      includePlugins: true,
    });
    for (const group of catalog.groups) {
      for (const tool of group.tools) {
        const resourceKey =
          tool.source === "plugin" && tool.pluginId
            ? pluginToolResourceKey(tool.pluginId, tool.id)
            : coreToolResourceKey(tool.id);
        const current = items.get(resourceKey);
        const agentIds = new Set<string>((current?.agentIds as string[] | undefined) ?? []);
        agentIds.add(entry.id);
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
          effective: effectiveAccess(selectedAccount, "tool", resourceKey, "ready", revision),
          effectiveAccess: effectiveAccess(selectedAccount, "tool", resourceKey, "ready", revision),
        });
      }
    }
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
        effective: undefined,
        effectiveAccess: undefined,
      });
    }
  }
  return { catalogRevision: revision, items: [...items.values()] };
}
