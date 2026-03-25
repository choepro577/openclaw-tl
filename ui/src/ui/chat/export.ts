import { extractTextCached } from "./message-extract.ts";
import { normalizeMessage } from "./message-normalizer.ts";

/**
 * Export chat history as markdown file.
 */
export function exportChatMarkdown(messages: unknown[], assistantName: string): void {
  const markdown = buildChatMarkdown(messages, assistantName);
  if (!markdown) {
    return;
  }
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chat-${assistantName}-${Date.now()}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildChatMarkdown(messages: unknown[], assistantName: string): string | null {
  const history = Array.isArray(messages) ? messages : [];
  if (history.length === 0) {
    return null;
  }
  const lines: string[] = [`# Chat with ${assistantName}`, ""];
  for (const msg of history) {
    const normalized = normalizeMessage(msg);
    const role =
      normalized.role === "user"
        ? "You"
        : normalized.role === "inter_session"
          ? (normalized.senderLabel ?? "Linked agent")
          : normalized.role === "assistant"
            ? assistantName
            : "Tool";
    const content =
      normalized.role === "inter_session"
        ? normalized.content
            .map((item) =>
              item.type === "text" && typeof item.text === "string" ? item.text : null,
            )
            .filter(
              (value): value is string => typeof value === "string" && value.trim().length > 0,
            )
            .join("\n")
        : (extractTextCached(msg) ?? "");
    const ts =
      typeof normalized.timestamp === "number" ? new Date(normalized.timestamp).toISOString() : "";
    lines.push(`## ${role}${ts ? ` (${ts})` : ""}`, "", content, "");
  }
  return lines.join("\n");
}
