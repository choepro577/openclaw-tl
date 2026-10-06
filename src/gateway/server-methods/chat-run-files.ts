import { createHash } from "node:crypto";
import path from "node:path";
import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
import { resolveAllowedManagedMediaPath } from "../../agents/sandbox-paths.js";
import {
  getReplyPayloadMetadata,
  isReplyPayloadTerminalContent,
  type ReplyPayload,
  type ReplyMediaAttachment,
} from "../../auto-reply/reply-payload.js";
import { hasHostProducedReplyMediaSource } from "../../auto-reply/reply/reply-media-paths.runtime.js";
import { resolveStateDir } from "../../config/paths.js";
import { publishTranscriptUpdate } from "../../config/sessions/session-accessor.js";
import { appendAssistantMessageToSessionTranscript } from "../../config/sessions/transcript.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { isSubagentSessionKey } from "../../routing/session-key.js";
import { getTaskById } from "../../tasks/runtime-internal.js";
import type { TaskRecord } from "../../tasks/task-registry.types.js";
import {
  attachManagedOutgoingMediaToMessage,
  createManagedOutgoingMediaBlocks,
  copyManagedOutgoingMediaBlocks,
  resolveManagedOutgoingMediaArtifactSource,
  removeManagedOutgoingMediaBlocks,
} from "../managed-image-attachments.js";
import { readSessionMessageByIdAsync } from "../session-transcript-readers.js";
import { loadGatewaySessionEntryReadOnly } from "../session-utils.js";
import { readOwnedTaskFileRow, taskFileRowId } from "./chat-task-file-identity.js";
export { readOwnedTaskFileRow, taskFileRowId } from "./chat-task-file-identity.js";
export type FileBlock = Record<string, unknown>;
const pending = new Map<string, Promise<unknown>>();

export function withPendingFiles<T>(key: string, work: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) {
    // SAFETY: Each key is owned by one operation and its immutable session/message identity.
    return existing as Promise<T>;
  }
  const promise = work().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

export function managedBlocks(message: unknown): FileBlock[] {
  const content = asOptionalRecord(message)?.content;
  return Array.isArray(content)
    ? content.filter((block): block is FileBlock => {
        const value = asOptionalRecord(block);
        return (
          typeof value?.artifactId === "string" && value.artifactId.startsWith("artifact_managed_")
        );
      })
    : [];
}

export async function backedBlocks(message: unknown, sessionKey: string): Promise<FileBlock[]> {
  const blocks: FileBlock[] = [];
  for (const block of managedBlocks(message).slice(0, 19)) {
    if (
      await resolveManagedOutgoingMediaArtifactSource({
        sessionKey,
        artifactId: String(block.artifactId),
      })
    ) {
      blocks.push(block);
    }
  }
  return blocks;
}

export type FileArtifact = { source: string; artifactId: string };
export function fileMappings(message: unknown): FileArtifact[] {
  const entries = asOptionalRecord(asOptionalRecord(message)?.["__openclaw"])?.fileArtifacts;
  return Array.isArray(entries)
    ? entries
        .flatMap((entry) => {
          const value = asOptionalRecord(entry);
          return typeof value?.source === "string" && typeof value.artifactId === "string"
            ? [{ source: value.source, artifactId: value.artifactId }]
            : [];
        })
        .slice(0, 100)
    : [];
}
function fileRowId(runId: string): string {
  return `run-files-${createHash("sha256").update(runId).digest("hex")}`;
}

export async function resolveTaskFileSourceRun(
  task: TaskRecord,
  cfg?: OpenClawConfig,
): Promise<string | undefined> {
  if (!task.runId || !task.childSessionKey) {
    return undefined;
  }
  const { getLatestSubagentRunByChildSessionKey } =
    await import("../../agents/subagents/registry/subagent-registry-read.js");
  const source = getLatestSubagentRunByChildSessionKey(task.childSessionKey);
  if (
    source?.requesterSessionKey === task.requesterSessionKey &&
    (source.taskRunId ?? source.runId) === task.runId
  ) {
    return source.runId;
  }
  const parent = loadGatewaySessionEntryReadOnly(task.requesterSessionKey, {
    cfg,
    agentId: task.requesterAgentId,
  });
  if (parent.entry?.sessionId) {
    const row = await readOwnedTaskFileRow(
      {
        sessionKey: parent.canonicalKey,
        sessionId: parent.entry.sessionId,
        storePath: parent.storePath,
        agentId: parent.agentId,
      },
      task,
    );
    if (row) {
      return row.sourceRunId;
    }
  }
  return source ? undefined : task.runId;
}

export async function taskArtifacts(
  task: TaskRecord,
  cfg: OpenClawConfig,
  sourceRunId?: string,
): Promise<FileArtifact[]> {
  if (!task.runId || !task.childSessionKey) {
    return [];
  }
  const physicalRunId = sourceRunId ?? (await resolveTaskFileSourceRun(task, cfg));
  if (!physicalRunId) {
    return [];
  }
  const child = loadGatewaySessionEntryReadOnly(task.childSessionKey, {
    cfg,
    agentId: task.agentId,
  });
  if (!child.entry?.sessionId) {
    return [];
  }
  const row = await readSessionMessageByIdAsync(
    {
      agentId: child.agentId,
      sessionKey: child.canonicalKey,
      sessionId: child.entry.sessionId,
      storePath: child.storePath,
    },
    fileRowId(physicalRunId),
  );
  if (asOptionalRecord(asOptionalRecord(row.message)?.["__openclaw"])?.runId !== physicalRunId) {
    return [];
  }
  // A sealed mapping remains authoritative when its backing disappears.
  // Copy verifies backing ownership; unavailable bytes must not enable workspace substitution.
  return fileMappings(row.message);
}

/** Host producer sink: called only after workspace-authorized reply media normalization. */
export async function stageRunReplyFiles(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
  agentId: string;
  sessionId: string;
  runId: string;
  payloads: ReplyPayload[];
}): Promise<FileBlock[]> {
  if (!isSubagentSessionKey(params.sessionKey)) {
    return [];
  }
  const loaded = loadGatewaySessionEntryReadOnly(params.sessionKey, {
    cfg: params.cfg,
    agentId: params.agentId,
  });
  if (loaded.entry?.sessionId !== params.sessionId) {
    throw new Error("File delivery session changed before staging");
  }
  const scope = {
    sessionKey: loaded.canonicalKey,
    agentId: loaded.agentId,
    sessionId: params.sessionId,
    storePath: loaded.storePath,
  };
  const id = fileRowId(params.runId);
  return await withPendingFiles(`${loaded.storePath}:${params.sessionId}:${id}`, async () => {
    const existing = await readSessionMessageByIdAsync(scope, id);
    if (existing.found) {
      const blocks = await backedBlocks(existing.message, scope.sessionKey);
      attachManagedOutgoingMediaToMessage({ messageId: id, blocks });
      return blocks;
    }
    const blocks: FileBlock[] = [];
    const mappings: FileArtifact[] = [];
    const bySource = new Map<
      string,
      { attachment?: ReplyMediaAttachment; sources: Set<string>; hostProduced: boolean }
    >();
    for (const payload of params.payloads) {
      if (payload.sensitiveMedia || !isReplyPayloadTerminalContent(payload)) {
        continue;
      }
      const urls = [
        ...new Set([...(payload.mediaUrls ?? []), ...(payload.mediaUrl ? [payload.mediaUrl] : [])]),
      ];
      const provenance = getReplyPayloadMetadata(payload)?.stagedFileSources ?? [];
      for (const [index, source] of urls.entries()) {
        const entry = bySource.get(source) ?? {
          attachment:
            payload.attachments?.find((value) =>
              [value.path, value.url, value.mediaUrl, value.filePath].includes(source),
            ) ?? payload.attachments?.[index],
          sources: new Set<string>([source]),
          hostProduced: false,
        };
        entry.hostProduced ||= hasHostProducedReplyMediaSource(payload, source);
        for (const original of provenance
          .filter((value) => value.mediaUrl === source)
          .flatMap((value) => value.sources)) {
          entry.sources.add(original);
        }
        bySource.set(source, entry);
      }
    }
    let committedIds = new Set<string>();
    let didWrite = false;
    try {
      for (const [source, entry] of bySource) {
        const producedSource = entry.hostProduced
          ? await resolveAllowedManagedMediaPath(source)
          : undefined;
        const prepared = await createManagedOutgoingMediaBlocks({
          sessionKey: scope.sessionKey,
          agentId: scope.agentId,
          messageId: id,
          mediaUrls: [producedSource ?? source],
          attachments: entry.attachment ? [entry.attachment] : undefined,
          // Only private producer proof can admit a validated tool-owned media root.
          localRoots: [
            path.join(resolveStateDir(), "media", "outbound"),
            ...(producedSource ? [path.dirname(producedSource)] : []),
          ],
          allowLocalNonImage: true,
        });
        const accepted = managedBlocks({ content: prepared }).slice(0, 19 - blocks.length);
        blocks.push(...accepted);
        for (const block of accepted) {
          for (const original of entry.sources) {
            mappings.push({ source: original, artifactId: String(block.artifactId) });
          }
        }
        if (blocks.length >= 19) {
          break;
        }
      }
      if (!blocks.length) {
        return [];
      }
      const appended = await appendAssistantMessageToSessionTranscript({
        ...scope,
        expectedSessionId: params.sessionId,
        config: params.cfg,
        content: [{ type: "text", text: "" }],
        updateMode: "none",
        eventId: id,
        idempotencyKey: id,
        beforeMessageWrite: ({ message }) => {
          didWrite = true;
          return Object.assign({}, message, {
            content: blocks,
            __openclaw: { runId: params.runId, fileArtifacts: mappings },
          });
        },
      });
      if (!appended.ok) {
        throw new Error("Files could not be attached to their source transcript");
      }
      if (didWrite && appended.messageId === id) {
        committedIds = new Set(blocks.map((block) => String(block.artifactId)));
      }
      const committed = await readSessionMessageByIdAsync(scope, appended.messageId ?? id);
      for (const block of managedBlocks(committed.message)) {
        committedIds.add(String(block.artifactId));
      }
      const canonical = await backedBlocks(committed.message, scope.sessionKey);
      if (
        !attachManagedOutgoingMediaToMessage({
          messageId: appended.messageId ?? id,
          blocks: canonical,
        })
      ) {
        throw new Error("Files could not be attached to their source transcript");
      }
      return canonical;
    } finally {
      await removeManagedOutgoingMediaBlocks({
        blocks: blocks.filter((block) => !committedIds.has(String(block.artifactId))),
        messageId: id,
      });
    }
  });
}

/** Delivery owner calls this before parent synthesis; task reads reuse the same backed row. */
export async function deliverTaskResultFiles(
  task: TaskRecord,
  cfg: OpenClawConfig,
  options?: { isDeliveryAllowed?: () => boolean; sourceRunId?: string },
): Promise<{ blocks: FileBlock[] }> {
  const allowed = () => {
    const current = getTaskById(task.taskId);
    return (
      options?.isDeliveryAllowed?.() !== false &&
      current?.requesterSessionKey === task.requesterSessionKey &&
      current?.childSessionKey === task.childSessionKey &&
      current?.runId === task.runId &&
      current?.ownerKey === task.ownerKey
    );
  };
  if (!task.childSessionKey || !task.runId || !allowed()) {
    return { blocks: [] };
  }
  const parent = loadGatewaySessionEntryReadOnly(task.requesterSessionKey, {
    cfg,
    agentId: task.requesterAgentId,
  });
  if (!parent.entry?.sessionId) {
    return { blocks: [] };
  }
  const scope = {
    sessionKey: parent.canonicalKey,
    sessionId: parent.entry.sessionId,
    agentId: parent.agentId,
    storePath: parent.storePath,
  };
  const sourceRunId = options?.sourceRunId ?? (await resolveTaskFileSourceRun(task, cfg));
  if (!sourceRunId || !allowed()) {
    return { blocks: [] };
  }
  const id = taskFileRowId(task, sourceRunId);
  return await (async () => {
    const existing = await readOwnedTaskFileRow(scope, task, sourceRunId);
    if (!allowed()) {
      return { blocks: [] };
    }
    if (existing) {
      const blocks = await backedBlocks(existing.message, scope.sessionKey);
      return { blocks: allowed() ? blocks : [] };
    }
    const mappings = await taskArtifacts(task, cfg, sourceRunId);
    if (!allowed()) {
      return { blocks: [] };
    }
    const blocks = await copyManagedOutgoingMediaBlocks({
      sourceSessionKey: task.childSessionKey!,
      targetSessionKey: scope.sessionKey,
      targetAgentId: scope.agentId,
      targetMessageId: id,
      artifactIds: mappings.map((entry) => entry.artifactId),
    });
    if (!blocks.length) {
      return { blocks: [] };
    }
    let committedIds = new Set<string>();
    let didWrite = false;
    try {
      if (!allowed()) {
        return { blocks: [] };
      }
      const parentMappings = mappings.flatMap((entry) => {
        const block = blocks.find((value) => value.sourceArtifactId === entry.artifactId);
        return block ? [{ source: entry.source, artifactId: String(block.artifactId) }] : [];
      });
      const appended = await appendAssistantMessageToSessionTranscript({
        ...scope,
        expectedSessionId: scope.sessionId,
        config: cfg,
        content: [{ type: "text", text: "" }],
        eventId: id,
        idempotencyKey: id,
        updateMode: "none",
        beforeMessageWrite: ({ message }) => {
          if (!allowed()) {
            return null;
          }
          didWrite = true;
          return Object.assign({}, message, {
            content: blocks,
            __openclaw: {
              messageTaskId: task.taskId,
              taskRunId: task.runId,
              sourceRunId,
              fileArtifacts: parentMappings,
            },
          });
        },
      });
      if (!appended.ok) {
        return { blocks: [] };
      }
      if (didWrite && appended.messageId === id) {
        committedIds = new Set(blocks.map((block) => String(block.artifactId)));
      }
      const committed = await readSessionMessageByIdAsync(scope, appended.messageId ?? id);
      for (const block of managedBlocks(committed.message)) {
        committedIds.add(String(block.artifactId));
      }
      const canonical = await backedBlocks(committed.message, scope.sessionKey);
      attachManagedOutgoingMediaToMessage({
        messageId: appended.messageId ?? id,
        blocks: canonical,
      });
      if (!allowed()) {
        // The synchronous transaction fence admitted this row before revocation.
        // Retain its committed files while suppressing this owner's late publication.
        return { blocks: [] };
      }
      if (didWrite) {
        await publishTranscriptUpdate(scope, {
          message: committed.message,
          messageId: appended.messageId ?? id,
        });
      }
      return { blocks: canonical };
    } finally {
      await removeManagedOutgoingMediaBlocks({
        blocks: blocks.filter((block) => !committedIds.has(String(block.artifactId))),
        messageId: id,
      });
    }
  })();
}
