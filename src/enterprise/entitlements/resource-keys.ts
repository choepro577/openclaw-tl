// Stable Enterprise resource identities and the versioned built-in access presets.
import type { EnterpriseResourceType } from "./resource-types.js";

export const ENTERPRISE_ACCESS_PRESET_BASIC = "basic@1";

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

export const BASIC_TOOL_IDS = [
  ...STANDARD_CODING_TOOL_IDS,
  "memory_search",
  "memory_get",
  "agents_wait",
  "ask_user",
  "automations",
  "progress_card",
  "suggest_task",
  "browser",
  "show_widget",
  "dashboard",
  "canvas",
  "conversations_list",
  "conversations_send",
  "conversations_turn",
  "session_status",
  "sessions",
  "sessions_history",
  "sessions_search",
  "sessions_send",
  "music_generate",
  "tts",
  "video_generate",
  "view_image",
  "web_search",
  "web_fetch",
  "x_search",
] as const;

export const ENTERPRISE_ACCESS_PRESETS = [
  {
    key: ENTERPRISE_ACCESS_PRESET_BASIC,
    label: "Quyền cơ bản",
    description: "Cấp 32 công cụ cơ bản, đồng bộ quyền sử dụng trong sandbox.",
    toolIds: [...BASIC_TOOL_IDS],
  },
  {
    key: ENTERPRISE_ACCESS_PRESET_STANDARD_CODING,
    label: "Lập trình tiêu chuẩn",
    description: "Đọc, ghi, sửa file và chạy lệnh trong sandbox.",
    toolIds: [...STANDARD_CODING_TOOL_IDS],
  },
  {
    key: ENTERPRISE_ACCESS_PRESET_NONE,
    label: "Không có preset",
    description: "Chỉ sử dụng các quyền được cấp riêng.",
    toolIds: [],
  },
];

export const ENTERPRISE_NON_DELEGABLE_TOOL_IDS = new Set([
  "elevated",
  "terminal",
  "portal",
  "gateway",
  "agents_list",
  "sessions_spawn",
  "subagents",
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

export const ENTERPRISE_DELEGATION_MANAGED_TOOL_IDS = [
  "enterprise_specialists_list",
  "enterprise_delegate",
  "sessions_yield",
] as const;

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
  return [...(ENTERPRISE_ACCESS_PRESETS.find((preset) => preset.key === presetKey)?.toolIds ?? [])];
}

export function normalizeEnterpriseAccessPresetKey(value: string): string {
  const normalized = value.trim();
  if (!ENTERPRISE_ACCESS_PRESETS.some((preset) => preset.key === normalized)) {
    throw new Error("ACCESS_PRESET_INVALID");
  }
  return normalized;
}
