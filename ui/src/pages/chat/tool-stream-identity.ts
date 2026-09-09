import { asNullableRecord as asToolRecord } from "@openclaw/normalization-core/record-coerce";
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import {
  isToolCallContentType,
  isToolResultContentType,
  resolveToolUseId,
} from "../../../../src/chat/tool-content.js";
import { normalizeRoleForGrouping } from "../../lib/chat/message-normalizer.ts";

type ToolMessageRef = {
  id: string;
  runId?: string;
};

type LiveToolStreamRef = ToolMessageRef & {
  identity: string;
};

type LiveToolStreamHost = {
  chatStream?: string | null;
  chatStreamStartedAt?: number | null;
  toolStreamById?: Map<string, unknown>;
  toolStreamOrder?: unknown[];
};

const TOOL_NAME_FIELDS = ["toolName", "tool_name"] as const;

/** Tool call ids belong to one run; sibling runs may legitimately reuse them. */
export function buildToolStreamIdentity(runId: string, toolCallId: string): string {
  return JSON.stringify([runId, toolCallId]);
}

function addToolMessageRef(
  refs: ToolMessageRef[],
  seen: Set<string>,
  id: string | undefined,
  runId?: string,
) {
  if (!id) {
    return;
  }
  const identity = runId ? buildToolStreamIdentity(runId, id) : id;
  if (seen.has(identity)) {
    return;
  }
  seen.add(identity);
  refs.push({ id, ...(runId ? { runId } : {}) });
}

function isToolMessageContentBlock(block: Record<string, unknown>): boolean {
  return isToolCallContentType(block.type) || isToolResultContentType(block.type);
}

/** Reads invocation ids without confusing row ids or inventing a missing run owner. */
export function extractToolMessageRefs(message: unknown): ToolMessageRef[] {
  const record = asToolRecord(message);
  if (!record) {
    return [];
  }

  const refs: ToolMessageRef[] = [];
  const seen = new Set<string>();
  const blocks = Array.isArray(record.content)
    ? record.content.filter(
        (block): block is Record<string, unknown> => Boolean(block) && typeof block === "object",
      )
    : [];
  const topLevelToolId = resolveToolUseId({ ...record, id: undefined });
  const topLevelRunId = normalizeOptionalString(record.runId);
  const role = record.role;
  const messageHasToolShape =
    (typeof role === "string" && normalizeRoleForGrouping(role).toLowerCase() === "tool") ||
    TOOL_NAME_FIELDS.some((field) => Boolean(normalizeOptionalString(record[field]))) ||
    blocks.some(isToolMessageContentBlock);

  if (messageHasToolShape) {
    addToolMessageRef(refs, seen, topLevelToolId, topLevelRunId);
  }

  for (const block of blocks) {
    if (!isToolMessageContentBlock(block)) {
      continue;
    }
    addToolMessageRef(
      refs,
      seen,
      resolveToolUseId(block) ?? topLevelToolId,
      normalizeOptionalString(block.runId) ?? topLevelRunId,
    );
  }

  return refs;
}

/** Resolves canonical live entries while preserving existing bare-id fixtures. */
export function resolveLiveToolStreamRefs(state: LiveToolStreamHost): LiveToolStreamRef[] {
  if (!Array.isArray(state.toolStreamOrder)) {
    return [];
  }
  return state.toolStreamOrder
    .filter(
      (identity): identity is string => typeof identity === "string" && Boolean(identity.trim()),
    )
    .map((identity) => {
      const entry = asToolRecord(state.toolStreamById?.get(identity));
      const message = asToolRecord(entry?.message);
      const id =
        normalizeOptionalString(entry?.toolCallId) ??
        (message ? resolveToolUseId(message) : undefined) ??
        identity;
      const runId =
        normalizeOptionalString(entry?.runId) ?? normalizeOptionalString(message?.runId);
      return runId ? { identity, id, runId } : { identity, id };
    });
}

/** Unscoped history cannot prove which sibling owns a reused tool call id. */
export function resolveMatchingLiveToolIdentity(
  ref: ToolMessageRef,
  liveToolRefs: LiveToolStreamRef[],
): string | undefined {
  const matches = liveToolRefs.filter(
    (liveRef) =>
      liveRef.id === ref.id && (!ref.runId || !liveRef.runId || liveRef.runId === ref.runId),
  );
  return matches.length === 1 ? matches[0]?.identity : undefined;
}

export function buildLiveRenderedToolRefs(toolMessages: unknown[]): LiveToolStreamRef[] {
  const refs: LiveToolStreamRef[] = [];
  const seen = new Set<string>();
  for (const [index, message] of toolMessages.entries()) {
    for (const ref of extractToolMessageRefs(message)) {
      const key = JSON.stringify([ref.runId ?? null, ref.id]);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      refs.push({ ...ref, identity: `live:${index}:${key}` });
    }
  }
  return refs;
}

/** A durable result can replace only one unambiguous live invocation, never a same-name tool. */
export function resolveMatchingLiveToolMessageIndex(
  resultMessage: unknown,
  toolMessages: readonly unknown[],
): number | undefined {
  const record = asToolRecord(resultMessage);
  if (!record) {
    return undefined;
  }
  const blocks = Array.isArray(record.content) ? record.content.map(asToolRecord) : [];
  if (
    blocks.some((block) => isToolCallContentType(block?.type)) ||
    !(
      (typeof record.role === "string" && normalizeRoleForGrouping(record.role) === "tool") ||
      blocks.some((block) => isToolResultContentType(block?.type))
    )
  ) {
    return undefined;
  }
  const resultRefs = extractToolMessageRefs(resultMessage);
  const resultRef = resultRefs.length === 1 ? resultRefs[0] : undefined;
  if (!resultRef) {
    return undefined;
  }
  const matches = toolMessages.flatMap((message, index) =>
    extractToolMessageRefs(message).some(
      (ref) =>
        ref.id === resultRef.id &&
        (!ref.runId || !resultRef.runId || ref.runId === resultRef.runId),
    )
      ? [index]
      : [],
  );
  return matches.length === 1 ? matches[0] : undefined;
}

/** Prepare a matched invocation for the existing result merger without mutating live state. */
export function prepareLiveToolMessageForPersistedResult(
  liveMessage: unknown,
  resultMessage: unknown,
): unknown {
  const live = asToolRecord(liveMessage);
  const result = asToolRecord(resultMessage);
  if (!live || !result || !Array.isArray(live.content)) {
    return liveMessage;
  }
  const resultIds = new Set(extractToolMessageRefs(resultMessage).map((ref) => ref.id));
  const topLevelToolId = resolveToolUseId({ ...live, id: undefined });
  const content = live.content.filter((block) => {
    const record = asToolRecord(block);
    return (
      !record ||
      !isToolResultContentType(record.type) ||
      !resultIds.has(resolveToolUseId(record) ?? topLevelToolId ?? "")
    );
  });
  // Hydration owns completion even when the live result event is late. Keep
  // live arguments; the merger will attach the durable result, details and media.
  return {
    ...live,
    content,
    __openclawToolStreamResultReceived: true,
    ...(result["__openclaw"] !== undefined ? { __openclaw: result["__openclaw"] } : {}),
  };
}

export function removeLiveToolBlocksFromHistory(
  message: unknown,
  liveToolRefs: LiveToolStreamRef[],
): unknown {
  const record = asToolRecord(message);
  if (!record || !Array.isArray(record.content) || liveToolRefs.length === 0) {
    return message;
  }
  const topLevelToolId = resolveToolUseId({ ...record, id: undefined });
  const topLevelRunId = normalizeOptionalString(record.runId);
  const content = record.content.filter((block) => {
    const entry = asToolRecord(block);
    if (!entry || !isToolMessageContentBlock(entry)) {
      return true;
    }
    const id = resolveToolUseId(entry) ?? topLevelToolId;
    if (!id) {
      return true;
    }
    const runId = normalizeOptionalString(entry.runId) ?? topLevelRunId;
    return !resolveMatchingLiveToolIdentity({ id, ...(runId ? { runId } : {}) }, liveToolRefs);
  });
  return content.length === record.content.length ? message : { ...record, content };
}

export function persistedCurrentToolStreamIds(
  messages: unknown[],
  state: LiveToolStreamHost,
): Set<string> {
  const liveToolRefs = resolveLiveToolStreamRefs(state);
  const matchedToolIds = new Set<string>();
  if (liveToolRefs.length === 0) {
    return matchedToolIds;
  }
  const lastUserIndex = messages.findLastIndex((message) => {
    const role = asToolRecord(message)?.role;
    return typeof role === "string" && normalizeRoleForGrouping(role).toLowerCase() === "user";
  });
  for (const message of messages.slice(lastUserIndex + 1)) {
    for (const ref of extractToolMessageRefs(message)) {
      const identity = resolveMatchingLiveToolIdentity(ref, liveToolRefs);
      if (identity) {
        matchedToolIds.add(identity);
      }
    }
  }
  return matchedToolIds;
}
