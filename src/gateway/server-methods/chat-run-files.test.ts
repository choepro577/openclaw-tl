import fs from "node:fs/promises";
import path from "node:path";
import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
import { describe, expect, it, vi } from "vitest";
import { createSolidPngBuffer } from "../../../test/helpers/image-fixtures.js";
import { mergeAttemptToolMediaPayloads } from "../../agents/embedded-agent-runner/run/tool-media-payloads.js";
import {
  createReplyMediaPathNormalizer,
  normalizeAgentRunReplyMedia,
} from "../../auto-reply/reply/reply-media-paths.runtime.js";
import { resolveSessionStorePathCore } from "../../config/sessions/paths.js";
import {
  upsertSessionEntryCore,
  readActiveTranscriptEntryAnchor,
} from "../../config/sessions/session-accessor.js";
import { rewriteTranscriptMessageAtAnchor } from "../../config/sessions/session-accessor.sqlite-transcript-message-rewrite.js";
import { appendAssistantMessageToSessionTranscript } from "../../config/sessions/transcript.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  createTaskRecord,
  getTaskById,
  markTaskTerminalById,
} from "../../tasks/runtime-internal.js";
import { resetTaskRegistryForTests } from "../../tasks/task-runtime.test-helpers.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import * as managedMedia from "../managed-image-attachments.js";
import { listManagedImageRecordEntries } from "../managed-image-record-store.js";
import { readSessionMessagesAsync } from "../session-transcript-readers.js";
import * as transcriptReaders from "../session-transcript-readers.js";
import { enrichChatHistoryFiles, readTaskResultFiles } from "./chat-history-files.js";
import { deliverTaskResultFiles, stageRunReplyFiles } from "./chat-run-files.js";

describe("canonical run files", () => {
  it("hands off producer-proven tool images and removes partial candidates when unproven media is rejected", async () => {
    resetTaskRegistryForTests();
    try {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
        const root = state.path("tool-workspace");
        const mediaDir = state.statePath("media", "tool-image-generation");
        await fs.mkdir(root, { recursive: true });
        await fs.mkdir(mediaDir, { recursive: true });
        const image = createSolidPngBuffer(2, 2, { r: 4, g: 40, b: 120 });
        const source = path.join(mediaDir, "generated.png");
        const unproven = path.join(mediaDir, "unproven.png");
        await fs.writeFile(source, image);
        await fs.writeFile(unproven, image);
        const cfg: OpenClawConfig = {
          agents: {
            list: [
              { id: "main", default: true, workspace: root },
              { id: "worker", workspace: root },
            ],
          },
        };
        const child = {
          agentId: "worker",
          sessionKey: "agent:worker:subagent:tool-image",
          sessionId: "tool-child",
          storePath: resolveSessionStorePathCore(undefined, { agentId: "worker" }),
        };
        const parent = {
          agentId: "main",
          sessionKey: "agent:main:tool-parent",
          sessionId: "tool-parent",
          storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
        };
        for (const scope of [child, parent]) {
          await upsertSessionEntryCore(scope, {
            sessionId: scope.sessionId,
            updatedAt: 1,
            spawnedWorkspaceDir: root,
          });
        }
        const payload = mergeAttemptToolMediaPayloads({
          toolMediaUrls: [source],
          hostOwnedToolMediaUrls: [source],
        })![0]!;
        const forged = Object.assign(
          { mediaUrl: unproven, trustedLocalMedia: true },
          {
            hostProducedMediaSources: [unproven],
          },
        );
        await expect(
          stageRunReplyFiles({
            cfg,
            ...child,
            runId: "rejected-run",
            payloads: [payload, forged],
          }),
        ).rejects.toThrow();
        expect(listManagedImageRecordEntries({})).toHaveLength(0);
        expect(await readSessionMessagesAsync(child, { mode: "full" })).toHaveLength(0);

        const runId = "tool-run";
        const reply = await normalizeAgentRunReplyMedia({
          cfg,
          ...child,
          runId,
          workspaceDir: root,
          sandboxRoot: root,
          payloads: [payload],
          terminalReply: { disposition: "visible", text: "Chart created." },
        });
        expect(reply.terminalReply).toEqual({ disposition: "visible", text: "Chart created." });
        const task = createTaskRecord({
          runtime: "subagent",
          agentId: child.agentId,
          requesterAgentId: parent.agentId,
          requesterSessionKey: parent.sessionKey,
          childSessionKey: child.sessionKey,
          runId,
          task: "Create a chart",
          notifyPolicy: "done_only",
        })!;
        const delivered = await deliverTaskResultFiles(task, cfg);
        expect(delivered.blocks).toHaveLength(1);
        expect(delivered.blocks[0]?.type).toBe("image");
        const backing = await managedMedia.resolveManagedOutgoingMediaArtifactSource({
          sessionKey: parent.sessionKey,
          artifactId: String(delivered.blocks[0]?.artifactId),
        });
        expect(backing).not.toBeNull();
        expect(await fs.readFile(backing!.path)).toEqual(image);
        expect(await readSessionMessagesAsync(child, { mode: "full" })).toHaveLength(1);
        expect(await readSessionMessagesAsync(parent, { mode: "full" })).toHaveLength(1);
        expect(listManagedImageRecordEntries({})).toHaveLength(2);
      });
    } finally {
      resetTaskRegistryForTests();
    }
  });

  it("retains committed files after read failure or revocation following the transaction fence", async () => {
    resetTaskRegistryForTests();
    try {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
        const root = state.path("committed-files");
        await fs.mkdir(root, { recursive: true });
        await fs.writeFile(path.join(root, "report.csv"), "staff,total\nQA_01,2\n");
        const cfg: OpenClawConfig = {
          agents: {
            list: [
              { id: "main", default: true, workspace: root },
              { id: "worker", workspace: root },
            ],
          },
        };
        const child = {
          agentId: "worker",
          sessionKey: "agent:worker:subagent:committed",
          sessionId: "committed-child",
          storePath: resolveSessionStorePathCore(undefined, { agentId: "worker" }),
        };
        const parent = {
          agentId: "main",
          sessionKey: "agent:main:committed-parent",
          sessionId: "committed-parent",
          storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
        };
        const lateParent = Object.assign({}, parent, {
          sessionKey: "agent:main:late-revocation",
          sessionId: "late-revocation",
        });
        for (const scope of [child, parent, lateParent]) {
          await upsertSessionEntryCore(scope, {
            sessionId: scope.sessionId,
            updatedAt: 1,
            spawnedWorkspaceDir: root,
          });
        }
        const normalize = createReplyMediaPathNormalizer({
          cfg,
          sessionKey: child.sessionKey,
          agentId: child.agentId,
          workspaceDir: root,
          sandboxRoot: root,
        });
        const payload = await normalize({ text: "[Report](/workspace/report.csv)" });
        let failSession: string | undefined = child.sessionKey;
        let lateAllowed = true;
        const originalRead = transcriptReaders.readSessionMessageByIdAsync;
        const spy = vi
          .spyOn(transcriptReaders, "readSessionMessageByIdAsync")
          .mockImplementation(async (...args) => {
            const result = await originalRead(...args);
            if (result.found && args[0].sessionKey === failSession) {
              failSession = undefined;
              throw new Error("post-commit read unavailable");
            }
            if (result.found && args[0].sessionKey === lateParent.sessionKey) {
              lateAllowed = false;
            }
            return result;
          });
        try {
          const producer = { cfg, ...child, runId: "committed-run", payloads: [payload] };
          await expect(stageRunReplyFiles(producer)).rejects.toThrow(
            "post-commit read unavailable",
          );
          const childBlocks = await stageRunReplyFiles(producer);
          expect(childBlocks).toHaveLength(1);
          const makeTask = (requesterSessionKey: string) =>
            createTaskRecord({
              runtime: "subagent",
              agentId: child.agentId,
              requesterAgentId: parent.agentId,
              requesterSessionKey,
              childSessionKey: child.sessionKey,
              runId: producer.runId,
              task: "Report",
              notifyPolicy: "done_only",
            })!;
          const task = makeTask(parent.sessionKey);
          failSession = parent.sessionKey;
          await expect(deliverTaskResultFiles(task, cfg)).rejects.toThrow(
            "post-commit read unavailable",
          );
          const parentBlocks = (await deliverTaskResultFiles(task, cfg)).blocks;
          expect(parentBlocks).toHaveLength(1);
          const lateTask = makeTask(lateParent.sessionKey);
          expect(
            (await deliverTaskResultFiles(lateTask, cfg, { isDeliveryAllowed: () => lateAllowed }))
              .blocks,
          ).toEqual([]);
          spy.mockRestore();
          const retained = (await deliverTaskResultFiles(lateTask, cfg)).blocks;
          expect(retained).toHaveLength(1);
          for (const [scope, blocks] of [
            [child, childBlocks],
            [parent, parentBlocks],
            [lateParent, retained],
          ] as const) {
            expect(await readSessionMessagesAsync(scope, { mode: "full" })).toHaveLength(1);
            const source = await managedMedia.resolveManagedOutgoingMediaArtifactSource({
              sessionKey: scope.sessionKey,
              artifactId: String(blocks[0]?.artifactId),
            });
            expect(source).not.toBeNull();
            expect(await fs.readFile(source!.path, "utf8")).toBe("staff,total\nQA_01,2\n");
          }
          expect(listManagedImageRecordEntries({})).toHaveLength(3);
        } finally {
          spy.mockRestore();
        }
      });
    } finally {
      resetTaskRegistryForTests();
    }
  });

  it("seals child sources once, fences late ownership loss, and hands off to another live owner", async () => {
    resetTaskRegistryForTests();
    try {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
        const root = state.path("child");
        const parentRoot = state.path("parent");
        await fs.mkdir(root, { recursive: true });
        await fs.mkdir(parentRoot, { recursive: true });
        await fs.writeFile(path.join(root, "report.csv"), "staff,total\nQA_01,2\n");
        const cfg: OpenClawConfig = {
          agents: {
            list: [
              { id: "main", default: true, workspace: parentRoot },
              { id: "worker", workspace: root },
            ],
          },
        };
        const parent = {
          agentId: "main",
          sessionKey: "agent:main:parent-owned",
          sessionId: "parent-owned",
          storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
        };
        const child = {
          agentId: "worker",
          sessionKey: "agent:worker:subagent:owned",
          sessionId: "child-owned",
          storePath: resolveSessionStorePathCore(undefined, { agentId: "worker" }),
        };
        await upsertSessionEntryCore(parent, {
          sessionId: parent.sessionId,
          updatedAt: 1,
          spawnedWorkspaceDir: parentRoot,
        });
        await upsertSessionEntryCore(child, {
          sessionId: child.sessionId,
          updatedAt: 1,
          spawnedWorkspaceDir: root,
        });
        const task = createTaskRecord({
          runtime: "subagent",
          agentId: "worker",
          requesterAgentId: "main",
          requesterSessionKey: parent.sessionKey,
          childSessionKey: child.sessionKey,
          runId: "owned-run",
          task: "Report",
          notifyPolicy: "done_only",
        })!;
        const normalize = createReplyMediaPathNormalizer({
          cfg,
          sessionKey: child.sessionKey,
          agentId: "worker",
          workspaceDir: root,
          sandboxRoot: root,
        });
        const payload = await normalize({ text: "[Report](/workspace/report.csv)" });
        const childBlocks = await stageRunReplyFiles({
          cfg,
          ...child,
          runId: task.runId!,
          payloads: [
            payload,
            payload,
            { ...payload, isReasoning: true },
            { ...payload, sensitiveMedia: true },
          ],
        });
        expect(childBlocks).toHaveLength(1);
        expect(
          await stageRunReplyFiles({ cfg, ...child, runId: task.runId!, payloads: [payload] }),
        ).toEqual(childBlocks);
        const artifactId = String(childBlocks[0]?.artifactId);
        expect(
          await managedMedia.resolveManagedOutgoingMediaArtifactSource({
            sessionKey: parent.sessionKey,
            artifactId,
          }),
        ).toBeNull();
        expect(
          await managedMedia.resolveManagedOutgoingMediaArtifactSource({
            sessionKey: child.sessionKey,
            artifactId: artifactId.replace("_media_", "_image_"),
          }),
        ).toBeNull();
        expect(
          await managedMedia.copyManagedOutgoingMediaBlocks({
            sourceSessionKey: parent.sessionKey,
            targetSessionKey: child.sessionKey,
            artifactIds: [artifactId],
          }),
        ).toEqual([]);
        await fs.unlink(path.join(root, "report.csv"));
        let firstAllowed = true;
        let releaseFirst!: () => void;
        const holdFirst = new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
        let firstCopied!: () => void;
        const copied = new Promise<void>((resolve) => {
          firstCopied = resolve;
        });
        const originalCopy = managedMedia.copyManagedOutgoingMediaBlocks;
        let calls = 0;
        const spy = vi
          .spyOn(managedMedia, "copyManagedOutgoingMediaBlocks")
          .mockImplementation(async (params) => {
            const result = await originalCopy(params);
            if (++calls === 1) {
              firstAllowed = false;
              firstCopied();
              await holdFirst;
            }
            return result;
          });
        try {
          const revoked = deliverTaskResultFiles(task, cfg, {
            isDeliveryAllowed: () => firstAllowed,
          });
          await copied;
          const live = await deliverTaskResultFiles(task, cfg, { isDeliveryAllowed: () => true });
          releaseFirst();
          expect((await revoked).blocks).toEqual([]);
          expect(live.blocks).toHaveLength(1);
          expect(await readSessionMessagesAsync(parent, { mode: "full" })).toHaveLength(1);
          expect(
            listManagedImageRecordEntries({}).filter(
              (entry) => entry.record.sessionKey === parent.sessionKey,
            ),
          ).toHaveLength(1);
          const legacyRow = asOptionalRecord(
            (await readSessionMessagesAsync(parent, { mode: "full" }))[0],
          );
          const entryId = asOptionalRecord(legacyRow?.["__openclaw"])?.id;
          expect(typeof entryId).toBe("string");
          const anchor = readActiveTranscriptEntryAnchor({ ...parent, entryId: String(entryId) });
          expect(anchor).toBeDefined();
          await rewriteTranscriptMessageAtAnchor(anchor!, (message) => {
            const record = asOptionalRecord(message);
            const { fileArtifacts: _oldMapping, ...metadata } =
              asOptionalRecord(record?.["__openclaw"]) ?? {};
            return record ? Object.assign({}, record, { __openclaw: metadata }) : undefined;
          });
          markTaskTerminalById({ taskId: task.taskId, status: "succeeded", endedAt: Date.now() });
          const result = await readTaskResultFiles(
            getTaskById(task.taskId)!,
            "Created [Report](/workspace/report.csv).",
            cfg,
          );
          expect(result[0]).toEqual({ type: "text", text: "Created Report." });
          expect(result).toHaveLength(2);
        } finally {
          releaseFirst();
          spy.mockRestore();
        }
      });
    } finally {
      resetTaskRegistryForTests();
    }
  });

  it("preserves a managed image without treating mutable adjacent file references as sealed outputs", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const root = state.path("mixed");
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(path.join(root, "report.csv"), "report\n");
      await fs.writeFile(
        path.join(root, "preview.png"),
        createSolidPngBuffer(2, 2, { r: 4, g: 40, b: 120 }),
      );
      const cfg: OpenClawConfig = {
        agents: { list: [{ id: "main", default: true, workspace: root }] },
      };
      const scope = {
        agentId: "main",
        sessionKey: "agent:main:mixed",
        sessionId: "mixed",
        storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
      };
      await upsertSessionEntryCore(scope, {
        sessionId: scope.sessionId,
        updatedAt: 1,
        spawnedWorkspaceDir: root,
      });
      const blocks = await managedMedia.createManagedOutgoingMediaBlocks({
        sessionKey: scope.sessionKey,
        agentId: "main",
        messageId: "mixed-row",
        mediaUrls: [path.join(root, "preview.png")],
        localRoots: [root],
      });
      await appendAssistantMessageToSessionTranscript({
        ...scope,
        config: cfg,
        content: [{ type: "text", text: "" }],
        eventId: "mixed-row",
        idempotencyKey: "mixed-row",
        beforeMessageWrite: ({ message }) =>
          Object.assign({}, message, {
            content: [
              {
                type: "text",
                text: "![Preview](/workspace/preview.png) [CSV](/workspace/report.csv)",
              },
              ...blocks,
            ],
            __openclaw: {
              fileArtifacts: [
                { source: "/workspace/preview.png", artifactId: blocks[0]!.artifactId },
              ],
            },
          }),
      });
      const original = await readSessionMessagesAsync(scope, { mode: "full" });
      const repaired = await enrichChatHistoryFiles({ ...scope, cfg, messages: original });
      const content = (repaired[0] as { content: Record<string, unknown>[] }).content;
      expect(content.filter((block) => block.type === "image")).toEqual(blocks);
      expect(content.filter((block) => block.type === "file")).toHaveLength(0);
      expect(content[0]).toEqual({
        type: "text",
        text: "Preview [CSV](/workspace/report.csv)",
      });
      const persisted = await readSessionMessagesAsync(scope, { mode: "full" });
      const entryId = String(asOptionalRecord(asOptionalRecord(persisted[0])?.["__openclaw"])?.id);
      const before = readActiveTranscriptEntryAnchor({ ...scope, entryId });
      expect(before).toBeDefined();
      expect(await enrichChatHistoryFiles({ ...scope, cfg, messages: persisted })).toEqual(
        persisted,
      );
      expect(readActiveTranscriptEntryAnchor({ ...scope, entryId })?.generation).toBe(
        before?.generation,
      );
    });
  });
});
