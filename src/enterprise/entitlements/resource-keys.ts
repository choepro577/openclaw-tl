// Stable Enterprise resource identities and the versioned built-in access presets.
import type { EnterpriseResourceType } from "./entitlement-store.js";

export const ENTERPRISE_ACCESS_PRESET_NONE = "none";
export const ENTERPRISE_ACCESS_PRESET_STANDARD_CODING = "standard-coding@1";

export const STANDARD_CODING_TOOL_IDS = [
  "read",
  "write",
  "edit",
  "apply_patch",
  "exec",
  "process",
] as const;

export const ENTERPRISE_NON_DELEGABLE_TOOL_IDS = new Set([
  "elevated",
  "terminal",
  "portal",
  "gateway",
  "agents_list",
  "nodes",
  "computer",
  "screen",
  "mobile_ui",
  "node_inference",
  "codex_plugins",
  "skill_workshop",
  "dir_fetch",
  "dir_list",
  "file_fetch",
  "file_write",
  "skills.install",
  "skills.update",
  "plugins.install",
  "plugins.update",
  "node",
  "device",
]);

export function isEnterpriseNonDelegableToolId(toolId: string): boolean {
  const normalized = toolId.trim().toLowerCase();
  return (
    ENTERPRISE_NON_DELEGABLE_TOOL_IDS.has(normalized) ||
    [
      "gateway.",
      "config.",
      "node.",
      "device.",
      "plugin.",
      "plugins.",
      "skill.",
      "skills.",
      "terminal.",
    ].some((prefix) => normalized.startsWith(prefix))
  );
}

function encodePart(value: string): string {
  return encodeURIComponent(value.trim());
}

function decodePart(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function sharedAgentResourceKey(agentId: string): string {
  return `agent:shared:${encodePart(agentId)}`;
}

export function personalAgentResourceKey(accountId: string): string {
  return `agent:personal:${encodePart(accountId)}`;
}

export function globalSkillResourceKey(source: string, skillKey: string): string {
  return `skill:global:${encodePart(source)}:${encodePart(skillKey)}`;
}

export function agentSkillResourceKey(agentId: string, source: string, skillKey: string): string {
  return `skill:agent:${encodePart(agentId)}:${encodePart(source)}:${encodePart(skillKey)}`;
}

export function coreToolResourceKey(toolId: string): string {
  return `tool:core:${encodePart(toolId)}`;
}

export function pluginToolResourceKey(pluginId: string, toolId: string): string {
  return `tool:plugin:${encodePart(pluginId)}:${encodePart(toolId)}`;
}

export type ParsedEnterpriseResourceKey = {
  resourceType: EnterpriseResourceType;
  runtimeId: string;
  scope: "legacy" | "global" | "shared" | "personal" | "agent" | "core" | "plugin";
  agentId?: string;
  accountId?: string;
  source?: string;
  pluginId?: string;
};

export function parseEnterpriseResourceKey(
  resourceType: EnterpriseResourceType,
  resourceKey: string,
): ParsedEnterpriseResourceKey {
  const raw = resourceKey.trim();
  const parts = raw.split(":");
  if (resourceType === "agent" && parts[0] === "agent" && parts[1] === "shared") {
    const runtimeId = decodePart(parts.slice(2).join(":"));
    if (runtimeId) {
      return { resourceType, runtimeId, scope: "shared" };
    }
  }
  if (resourceType === "agent" && parts[0] === "agent" && parts[1] === "personal") {
    const accountId = decodePart(parts.slice(2).join(":"));
    if (accountId) {
      return { resourceType, runtimeId: accountId, accountId, scope: "personal" };
    }
  }
  if (resourceType === "skill" && parts[0] === "skill" && parts[1] === "global") {
    const source = decodePart(parts[2] ?? "");
    const runtimeId = decodePart(parts.slice(3).join(":"));
    if (source && runtimeId) {
      return { resourceType, runtimeId, source, scope: "global" };
    }
  }
  if (resourceType === "skill" && parts[0] === "skill" && parts[1] === "agent") {
    const agentId = decodePart(parts[2] ?? "");
    const source = decodePart(parts[3] ?? "");
    const runtimeId = decodePart(parts.slice(4).join(":"));
    if (agentId && source && runtimeId) {
      return { resourceType, runtimeId, agentId, source, scope: "agent" };
    }
  }
  if (resourceType === "tool" && parts[0] === "tool" && parts[1] === "core") {
    const runtimeId = decodePart(parts.slice(2).join(":"));
    if (runtimeId) {
      return { resourceType, runtimeId, scope: "core" };
    }
  }
  if (resourceType === "tool" && parts[0] === "tool" && parts[1] === "plugin") {
    const pluginId = decodePart(parts[2] ?? "");
    const runtimeId = decodePart(parts.slice(3).join(":"));
    if (pluginId && runtimeId) {
      return { resourceType, runtimeId, pluginId, scope: "plugin" };
    }
  }
  return { resourceType, runtimeId: raw, scope: "legacy" };
}

export function enterpriseRuntimeResourceId(
  resourceType: EnterpriseResourceType,
  resourceKey: string,
): string {
  return parseEnterpriseResourceKey(resourceType, resourceKey).runtimeId;
}

export function accessPresetToolIds(presetKey: string): string[] {
  return presetKey === ENTERPRISE_ACCESS_PRESET_STANDARD_CODING
    ? [...STANDARD_CODING_TOOL_IDS]
    : [];
}

export function normalizeEnterpriseAccessPresetKey(value: string): string {
  const normalized = value.trim();
  if (
    normalized !== ENTERPRISE_ACCESS_PRESET_NONE &&
    normalized !== ENTERPRISE_ACCESS_PRESET_STANDARD_CODING
  ) {
    throw new Error("ACCESS_PRESET_INVALID");
  }
  return normalized;
}
