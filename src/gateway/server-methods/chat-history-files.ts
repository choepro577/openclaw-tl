import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
import { extractReplyFileReferences } from "../../auto-reply/reply/reply-file-references.js";
import {
  publishTranscriptUpdate,
  readActiveTranscriptEntryAnchor,
} from "../../config/sessions/session-accessor.js";
import { rewriteTranscriptMessageAtAnchor } from "../../config/sessions/session-accessor.sqlite-transcript-message-rewrite.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { TaskRecord } from "../../tasks/task-registry.types.js";
import { attachManagedOutgoingMediaToMessage } from "../managed-image-attachments.js";
import { readSessionMessageByIdAsync } from "../session-transcript-readers.js";
import { loadGatewaySessionEntryReadOnly } from "../session-utils.js";
import { sanitizeAssistantDisplayText } from "./chat-assistant-content.js";
import { readChatHistoryMessageId } from "./chat-history-pages.js";
import {
  deliverTaskResultFiles,
  backedBlocks,
  fileMappings,
  withPendingFiles,
  taskFileRowId,
  readOwnedTaskFileRow,
  resolveTaskFileSourceRun,
  type FileBlock,
} from "./chat-run-files.js";

function messageText(message: Record<string, unknown>): string {
  return typeof message.content === "string"
    ? message.content
    : Array.isArray(message.content)
      ? message.content
          .flatMap((block) => {
            const value = asOptionalRecord(block);
            return value?.type === "text" && typeof value.text === "string" ? [value.text] : [];
          })
          .join("\n")
      : "";
}

/** Repair only the authorized page, preserving the exact SQLite message identity. */
export async function enrichChatHistoryFiles(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
  agentId: string;
  sessionId?: string;
  storePath: string;
  messages: unknown[];
}): Promise<unknown[]> {
  if (!params.sessionId) {
    return params.messages;
  }
  const scope = { ...params, sessionId: params.sessionId };
  const result: unknown[] = [];
  for (const message of params.messages) {
    const record = asOptionalRecord(message);
    const id = readChatHistoryMessageId(message);
    if (
      !record ||
      record.role !== "assistant" ||
      !id ||
      !extractReplyFileReferences(messageText(record)).length
    ) {
      result.push(message);
      continue;
    }
    result.push(
      await withPendingFiles(`${params.storePath}:${params.sessionId}:${id}`, async () => {
        const anchor = readActiveTranscriptEntryAnchor({ ...scope, entryId: id });
        if (!anchor) {
          return message;
        }
        const current = await readSessionMessageByIdAsync(scope, id);
        const raw = asOptionalRecord(current.message);
        if (!raw || raw.role !== "assistant") {
          return current.message ?? message;
        }
        const knownBlocks = await backedBlocks(raw, params.sessionKey);
        const knownIds = new Set(knownBlocks.map((block) => block.artifactId));
        const referenced = new Set(
          extractReplyFileReferences(messageText(raw)).map((entry) => entry.source),
        );
        const represented = new Set(
          fileMappings(raw)
            .filter((entry) => knownIds.has(entry.artifactId) && referenced.has(entry.source))
            .map((entry) => entry.source),
        );
        if (!represented.size) {
          return message;
        }
        const sources = [...represented];
        const original = JSON.stringify(raw.content);
        const rewritten = await rewriteTranscriptMessageAtAnchor(anchor, (value) => {
          const source = asOptionalRecord(value);
          if (
            !source ||
            source.role !== "assistant" ||
            JSON.stringify(source.content) !== original
          ) {
            return undefined;
          }
          return {
            ...source,
            content: (Array.isArray(source.content)
              ? source.content
              : [{ type: "text", text: source.content }]
            ).map((block) => {
              const textBlock = asOptionalRecord(block);
              return textBlock?.type === "text" && typeof textBlock.text === "string"
                ? Object.assign({}, textBlock, {
                    text:
                      sanitizeAssistantDisplayText(textBlock.text, { mediaSources: sources }) ?? "",
                  })
                : block;
            }),
          };
        });
        if (!rewritten) {
          return message;
        }
        await publishTranscriptUpdate(anchor, { message: rewritten.message, messageId: id });
        return {
          ...record,
          content: (Array.isArray(record.content)
            ? record.content
            : [{ type: "text", text: record.content }]
          ).map((block) => {
            const textBlock = asOptionalRecord(block);
            return textBlock?.type === "text" && typeof textBlock.text === "string"
              ? Object.assign({}, textBlock, {
                  text:
                    sanitizeAssistantDisplayText(textBlock.text, { mediaSources: sources }) ?? "",
                })
              : block;
          }),
        };
      }),
    );
  }
  return result;
}

/** One artifact-only parent mirror per exact completed task; polling never stages it again. */
export async function readTaskResultFiles(
  task: TaskRecord,
  text: string | undefined,
  cfg: OpenClawConfig,
): Promise<FileBlock[]> {
  if (
    task.runtime !== "subagent" ||
    !["succeeded", "failed", "timed_out", "cancelled", "lost"].includes(task.status) ||
    !task.childSessionKey
  ) {
    return [];
  }
  const parent = loadGatewaySessionEntryReadOnly(task.requesterSessionKey, {
    cfg,
    agentId: task.requesterAgentId,
  });
  if (!parent.entry?.sessionId) {
    return [];
  }
  const scope = {
    sessionKey: parent.canonicalKey,
    sessionId: parent.entry.sessionId,
    storePath: parent.storePath,
    agentId: parent.agentId,
  };
  const sourceRunId = await resolveTaskFileSourceRun(task, cfg);
  if (!sourceRunId) {
    return [];
  }
  const id = taskFileRowId(task, sourceRunId);
  const withText = (blocks: FileBlock[]) => [
    ...(text
      ? [
          {
            type: "text",
            text:
              sanitizeAssistantDisplayText(text, {
                mediaSources: extractReplyFileReferences(text).map((reference) => reference.source),
              }) ?? "",
          },
        ]
      : []),
    ...blocks.slice(0, 19),
  ];
  return await withPendingFiles(`${parent.storePath}:${scope.sessionId}:${id}`, async () => {
    const existing = await readOwnedTaskFileRow(scope, task, sourceRunId);
    if (existing) {
      const blocks = await backedBlocks(existing.message, scope.sessionKey);
      attachManagedOutgoingMediaToMessage({ messageId: existing.messageId, blocks });
      return withText(blocks);
    }
    const delivered = await deliverTaskResultFiles(task, cfg, { sourceRunId });
    return delivered.blocks.length ? withText(delivered.blocks) : [];
  });
}
