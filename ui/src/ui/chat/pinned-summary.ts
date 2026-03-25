import { extractTextCached } from "./message-extract.ts";
import { normalizeMessage } from "./message-normalizer.ts";

export function getPinnedMessageSummary(message: unknown): string {
  const normalized = normalizeMessage(message);
  if (normalized.role === "inter_session") {
    return normalized.content
      .map((item) => (item.type === "text" && typeof item.text === "string" ? item.text : null))
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join("\n");
  }
  return extractTextCached(message) ?? "";
}
