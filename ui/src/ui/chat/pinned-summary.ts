import { extractTextCached } from "./message-extract.ts";
import { extractNormalizedTextContent, normalizeMessage } from "./message-normalizer.ts";

export function getPinnedMessageSummary(message: unknown): string {
  const normalized = normalizeMessage(message);
  if (normalized.role === "inter_session") {
    return extractNormalizedTextContent(normalized.content) || normalized.interSessionNotice || "";
  }
  return extractTextCached(message) ?? "";
}
