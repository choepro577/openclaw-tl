/**
 * Message normalization utilities for chat rendering.
 */

import { stripInboundMetadata } from "../../../../src/auto-reply/reply/strip-inbound-meta.js";
import type { NormalizedMessage, MessageContentItem } from "../types/chat-types.ts";

const INTER_SESSION_FALLBACK_LABEL = "Linked agent";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export function deriveInterSessionSenderLabel(sourceSessionKey: string | null): string {
  if (!sourceSessionKey) {
    return INTER_SESSION_FALLBACK_LABEL;
  }
  const parts = sourceSessionKey.split(":");
  if (parts[0] === "agent" && parts[1]) {
    return `Agent ${parts[1]}`;
  }
  return INTER_SESSION_FALLBACK_LABEL;
}

export function buildInterSessionDisplayText(senderLabel: string | null): string {
  return `${normalizeOptionalString(senderLabel) ?? INTER_SESSION_FALLBACK_LABEL} mới phản hồi lại`;
}

export function extractNormalizedTextContent(content: MessageContentItem[]): string {
  return content
    .map((item) => (item.type === "text" && typeof item.text === "string" ? item.text : null))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n");
}

/**
 * Normalize a raw message object into a consistent structure.
 */
export function normalizeMessage(message: unknown): NormalizedMessage {
  const m = message as Record<string, unknown>;
  let role = typeof m.role === "string" ? m.role : "unknown";

  // Detect tool messages by common gateway shapes.
  // Some tool events come through as assistant role with tool_* items in the content array.
  const hasToolId = typeof m.toolCallId === "string" || typeof m.tool_call_id === "string";

  const contentRaw = m.content;
  const contentItems = Array.isArray(contentRaw) ? contentRaw : null;
  const hasToolContent =
    Array.isArray(contentItems) &&
    contentItems.some((item) => {
      const x = item as Record<string, unknown>;
      const t = (typeof x.type === "string" ? x.type : "").toLowerCase();
      return t === "toolresult" || t === "tool_result";
    });

  const hasToolName = typeof m.toolName === "string" || typeof m.tool_name === "string";

  if (hasToolId || hasToolContent || hasToolName) {
    role = "toolResult";
  }

  // Extract content
  let content: MessageContentItem[] = [];

  if (typeof m.content === "string") {
    content = [{ type: "text", text: m.content }];
  } else if (Array.isArray(m.content)) {
    content = m.content.map((item: Record<string, unknown>) => ({
      type: (item.type as MessageContentItem["type"]) || "text",
      text: item.text as string | undefined,
      name: item.name as string | undefined,
      args: item.args || item.arguments,
    }));
  } else if (typeof m.text === "string") {
    content = [{ type: "text", text: m.text }];
  }

  const timestamp = typeof m.timestamp === "number" ? m.timestamp : Date.now();
  const id = typeof m.id === "string" ? m.id : undefined;
  let senderLabel =
    typeof m.senderLabel === "string" && m.senderLabel.trim() ? m.senderLabel.trim() : null;
  let interSessionNotice: string | null | undefined;
  const provenance =
    m.provenance && typeof m.provenance === "object"
      ? (m.provenance as Record<string, unknown>)
      : null;
  const isInterSession =
    (role === "user" || role === "User") && provenance?.kind === "inter_session";
  const sourceSessionKey = normalizeOptionalString(provenance?.sourceSessionKey);

  // Strip AI-injected metadata prefix blocks from user messages before display.
  if (role === "user" || role === "User") {
    content = content.map((item) => {
      if (item.type === "text" && typeof item.text === "string") {
        return { ...item, text: stripInboundMetadata(item.text) };
      }
      return item;
    });
  }

  if (isInterSession) {
    role = "inter_session";
    senderLabel = senderLabel ?? deriveInterSessionSenderLabel(sourceSessionKey);
    interSessionNotice = buildInterSessionDisplayText(senderLabel);
  }

  return { role, content, timestamp, id, senderLabel, interSessionNotice };
}

/**
 * Normalize role for grouping purposes.
 */
export function normalizeRoleForGrouping(role: string): string {
  const lower = role.toLowerCase();
  // Preserve original casing when it's already a core role.
  if (role === "user" || role === "User") {
    return role;
  }
  if (role === "assistant") {
    return "assistant";
  }
  if (lower === "inter_session" || lower === "intersession") {
    return "inter_session";
  }
  if (role === "system") {
    return "system";
  }
  // Keep tool-related roles distinct so the UI can style/toggle them.
  if (
    lower === "toolresult" ||
    lower === "tool_result" ||
    lower === "tool" ||
    lower === "function"
  ) {
    return "tool";
  }
  return role;
}

/**
 * Check if a message is a tool result message based on its role.
 */
export function isToolResultMessage(message: unknown): boolean {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role.toLowerCase() : "";
  return role === "toolresult" || role === "tool_result";
}
