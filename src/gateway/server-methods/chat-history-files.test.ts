import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createSolidPngBuffer } from "../../../test/helpers/image-fixtures.js";
import { createReplyMediaPathNormalizer } from "../../auto-reply/reply/reply-media-paths.runtime.js";
import { resolveSessionStorePathCore } from "../../config/sessions/paths.js";
import { upsertSessionEntryCore } from "../../config/sessions/session-accessor.js";
import { appendAssistantMessageToSessionTranscript } from "../../config/sessions/transcript.js";
import * as transcriptOwner from "../../config/sessions/transcript.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { saveMediaBuffer } from "../../media/store.js";
import {
  createTaskRecord,
  getTaskById,
  markTaskTerminalById,
  listTaskRecordPage,
  deleteTaskRecordById,
} from "../../tasks/runtime-internal.js";
import { resetTaskRegistryForTests } from "../../tasks/task-runtime.test-helpers.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { resolveManagedOutgoingMediaArtifactDownload } from "../managed-image-attachments.js";
import * as managedMedia from "../managed-image-attachments.js";
import { listManagedImageRecordEntries } from "../managed-image-record-store.js";
import { readSessionMessagesAsync } from "../session-transcript-readers.js";
import * as transcriptReaders from "../session-transcript-readers.js";
import { enrichChatHistoryFiles, readTaskResultFiles } from "./chat-history-files.js";
import { stageRunReplyFiles, taskFileRowId } from "./chat-run-files.js";

describe("legacy assistant files", () => {
  it("does not turn mutable workspace history into downloads, including traversal and symlinks", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const root = state.path("workspace");
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(path.join(root, "báo cáo.csv"), "staff,total\n13,77\n");
      const secret = state.path("secret.txt");
      await fs.writeFile(secret, "secret");
      await fs.symlink(secret, path.join(root, "escape.csv"));
      const cfg: OpenClawConfig = {
        agents: { list: [{ id: "main", default: true, workspace: root }] },
      };
      const scope = {
        sessionKey: "agent:main:legacy-files",
        sessionId: "legacy-files",
        agentId: "main",
        storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
      };
      await upsertSessionEntryCore(scope, {
        sessionId: scope.sessionId,
        updatedAt: 1,
        spawnedWorkspaceDir: root,
      });
      await appendAssistantMessageToSessionTranscript({
        ...scope,
        config: cfg,
        text: "[Tải Excel](</workspace/báo cáo.csv>)",
      });
      const original = await readSessionMessagesAsync(scope, { mode: "full" });
      expect(await enrichChatHistoryFiles({ ...scope, cfg, messages: original })).toEqual(original);
      await fs.writeFile(path.join(root, "báo cáo.csv"), "bytes from a later unrelated run");
      expect(await enrichChatHistoryFiles({ ...scope, cfg, messages: original })).toEqual(original);
      expect(listManagedImageRecordEntries({})).toHaveLength(0);
      for (const text of ["[bad](/workspace/../secret.txt)", "[bad](/workspace/escape.csv)"]) {
        await appendAssistantMessageToSessionTranscript({ ...scope, config: cfg, text });
      }
      const all = await readSessionMessagesAsync(scope, { mode: "full" });
      const repaired = await enrichChatHistoryFiles({ ...scope, cfg, messages: all });
      expect(repaired.slice(1)).toEqual(all.slice(1));
    });
  });

  it("stages only the exact task child into one persistent parent file mirror", async () => {
    resetTaskRegistryForTests();
    try {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
        const root = state.path("child");
        const parentRoot = state.path("parent");
        await fs.mkdir(root, { recursive: true });
        await fs.mkdir(parentRoot, { recursive: true });
        await fs.writeFile(path.join(root, "report.csv"), "source,child\n");
        await fs.writeFile(
          path.join(root, "preview.png"),
          createSolidPngBuffer(2, 2, { r: 24, g: 64, b: 128 }),
        );
        await fs.writeFile(path.join(parentRoot, "report.csv"), "wrong,parent\n");
        const cfg: OpenClawConfig = {
          agents: {
            list: [
              { id: "main", default: true, workspace: parentRoot },
              { id: "worker", workspace: root },
            ],
          },
        };
        const parent = {
          sessionKey: "agent:main:parent-files",
          sessionId: "parent-files",
          agentId: "main",
          storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
        };
        const child = {
          sessionKey: "agent:worker:subagent:child-files",
          sessionId: "child-files",
          agentId: "worker",
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
        let task = createTaskRecord({
          runtime: "subagent",
          requesterSessionKey: parent.sessionKey,
          requesterAgentId: "main",
          childSessionKey: child.sessionKey,
          agentId: "worker",
          runId: "file-run",
          task: "Create report",
          notifyPolicy: "done_only",
        });
        expect(task).not.toBeNull();
        const text = "[Download](/workspace/report.csv)";
        expect(await readTaskResultFiles(task!, text, cfg)).toEqual([]);
        expect(await readSessionMessagesAsync(parent, { mode: "full" })).toHaveLength(0);
        const normalize = createReplyMediaPathNormalizer({
          cfg,
          sessionKey: child.sessionKey,
          agentId: child.agentId,
          workspaceDir: root,
          sandboxRoot: root,
        });
        await stageRunReplyFiles({
          cfg,
          ...child,
          runId: task!.runId!,
          payloads: [await normalize({ text })],
        });
        markTaskTerminalById({ taskId: task!.taskId, status: "succeeded", endedAt: Date.now() });
        task = getTaskById(task!.taskId);
        const blocks = await readTaskResultFiles(task!, text, cfg);
        expect(blocks).toHaveLength(2);
        expect(blocks[0]).toEqual({ type: "text", text: "Download" });
        const download = await resolveManagedOutgoingMediaArtifactDownload({
          sessionKey: parent.sessionKey,
          artifactId: String(blocks[1]?.artifactId),
        });
        expect(download).not.toBeNull();
        const messages = await readSessionMessagesAsync(parent, { mode: "full" });
        expect(messages).toHaveLength(1);
        await fs.unlink(path.join(root, "report.csv"));
        expect(await readTaskResultFiles(task!, text, cfg)).toEqual(blocks);
        expect(await readSessionMessagesAsync(parent, { mode: "full" })).toHaveLength(1);
        expect(
          await resolveManagedOutgoingMediaArtifactDownload({
            sessionKey: child.sessionKey,
            artifactId: String(blocks[1]?.artifactId),
          }),
        ).toBeNull();

        const staged = await saveMediaBuffer(
          Buffer.from("owned staged file"),
          "text/plain",
          "outbound",
          undefined,
          "staged.txt",
        );
        let next = createTaskRecord({
          runtime: "subagent",
          requesterSessionKey: parent.sessionKey,
          requesterAgentId: "main",
          childSessionKey: child.sessionKey,
          agentId: "worker",
          runId: "staged-run",
          task: "Create staged report",
          notifyPolicy: "done_only",
        });
        markTaskTerminalById({ taskId: next!.taskId, status: "succeeded", endedAt: Date.now() });
        next = getTaskById(next!.taskId);
        expect(await readTaskResultFiles(next!, `[Staged result](${staged.path})`, cfg)).toEqual(
          [],
        );
        await appendAssistantMessageToSessionTranscript({
          ...child,
          config: cfg,
          text: `[Staged result](${staged.path})`,
        });
        expect(await readTaskResultFiles(next!, `[Staged result](${staged.path})`, cfg)).toEqual(
          [],
        );
        await fs.writeFile(path.join(root, "staged.txt"), "owned source bytes");
        const normalized = await normalize({
          text: "[Staged result](/workspace/staged.txt) ![Preview](/workspace/preview.png)",
        });
        await stageRunReplyFiles({ cfg, ...child, runId: "staged-run", payloads: [normalized] });
        const stagedText = `[Staged result](${normalized.mediaUrls![0]}) ![Preview](/workspace/preview.png)`;
        for (let index = 0; index < 501; index++) {
          createTaskRecord({
            runtime: "subagent",
            requesterSessionKey: parent.sessionKey,
            requesterAgentId: "main",
            childSessionKey: child.sessionKey,
            agentId: "worker",
            runId: `newer-${index}`,
            task: "Newer task",
            notifyPolicy: "silent",
          });
        }
        expect(
          listTaskRecordPage({
            sessionKey: parent.sessionKey,
            sessionAgentId: "main",
            cfg,
            offset: 0,
            limit: 500,
          }).tasks.some((value) => value.taskId === next!.taskId),
        ).toBe(false);
        for (const runId of [
          `announce:v1:agent:worker:subagent:wrong:staged-run`,
          `announce:v1:${child.sessionKey}:wrong-run`,
        ]) {
          await appendAssistantMessageToSessionTranscript({
            ...parent,
            config: cfg,
            text: `Wrong owner ${runId}: [Wrong parent bytes](/workspace/report.csv) ${stagedText}`,
            idempotencyKey: `codex-app-server:${runId}:assistant`,
            beforeMessageWrite: ({ message }) =>
              Object.assign({}, message, { __openclaw: { runId } }),
          });
        }
        const unmatched = await readSessionMessagesAsync(parent, { mode: "full" });
        expect(
          (await enrichChatHistoryFiles({ ...parent, cfg, messages: unmatched })).slice(-2),
        ).toEqual(unmatched.slice(-2));
        await appendAssistantMessageToSessionTranscript({
          ...parent,
          config: cfg,
          text: stagedText,
          idempotencyKey: "codex-app-server:fixture:assistant",
          beforeMessageWrite: ({ message }) =>
            Object.assign({}, message, {
              __openclaw: { runId: `announce:v1:${child.sessionKey}:staged-run` },
            }),
        });
        expect((await readSessionMessagesAsync(parent, { mode: "full" })).at(-1)).toMatchObject({
          __openclaw: { runId: `announce:v1:${child.sessionKey}:staged-run` },
        });
        const legacyHistory = await readSessionMessagesAsync(parent, { mode: "full" });
        expect(await enrichChatHistoryFiles({ ...parent, cfg, messages: legacyHistory })).toEqual(
          legacyHistory,
        );
        const recovered = await readTaskResultFiles(next!, stagedText, cfg);
        expect(recovered).toHaveLength(3);
        expect(await readSessionMessagesAsync(parent, { mode: "full" })).toHaveLength(5);
        const parentRecordCount = listManagedImageRecordEntries({}).filter(
          (entry) => entry.record.sessionKey === parent.sessionKey,
        ).length;

        const sealedTask = createTaskRecord({
          runtime: "subagent",
          requesterSessionKey: parent.sessionKey,
          requesterAgentId: "main",
          childSessionKey: child.sessionKey,
          agentId: "worker",
          runId: "sealed-missing-run",
          task: "Seal an immutable report",
          notifyPolicy: "silent",
        })!;
        const sealed = await stageRunReplyFiles({
          cfg,
          ...child,
          runId: sealedTask.runId!,
          payloads: [await normalize({ text: "[Sealed report](/workspace/staged.txt)" })],
        });
        expect(sealed).toHaveLength(1);
        const sealedRecord = listManagedImageRecordEntries({}).find((entry) =>
          String(sealed[0]?.artifactId).endsWith(entry.record.attachmentId),
        );
        expect(sealedRecord?.record.messageId).toBeDefined();
        await managedMedia.removeManagedOutgoingMediaBlocks({
          blocks: sealed,
          messageId: sealedRecord!.record.messageId!,
        });
        await fs.writeFile(path.join(root, "staged.txt"), "new unrelated workspace bytes");
        markTaskTerminalById({
          taskId: sealedTask.taskId,
          status: "succeeded",
          endedAt: Date.now(),
        });
        const sealedText = "[Sealed report](/workspace/staged.txt)";
        await appendAssistantMessageToSessionTranscript({
          ...parent,
          config: cfg,
          text: sealedText,
          beforeMessageWrite: ({ message }) =>
            Object.assign({}, message, {
              __openclaw: {
                messageTaskId: sealedTask.taskId,
                taskRunId: sealedTask.runId,
                sourceRunId: sealedTask.runId,
              },
            }),
        });
        const sealedHistory = await readSessionMessagesAsync(parent, { mode: "full" });
        expect(
          (await enrichChatHistoryFiles({ ...parent, cfg, messages: sealedHistory })).at(-1),
        ).toEqual(sealedHistory.at(-1));
        expect(await readTaskResultFiles(getTaskById(sealedTask.taskId)!, sealedText, cfg)).toEqual(
          [],
        );
        expect(
          listManagedImageRecordEntries({}).filter(
            (entry) => entry.record.sessionKey === parent.sessionKey,
          ),
        ).toHaveLength(parentRecordCount);
      });
    } finally {
      resetTaskRegistryForTests();
    }
  });

  it("task detail reuses canonical delivery cleanup, idempotent readback, and post-commit durability", async () => {
    resetTaskRegistryForTests();
    try {
      await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
        const root = state.path("legacy-race");
        await fs.mkdir(root, { recursive: true });
        await fs.writeFile(path.join(root, "report.csv"), "legacy candidate bytes");
        await fs.writeFile(path.join(root, "winner.csv"), "committed winner bytes");
        const cfg: OpenClawConfig = {
          agents: {
            list: [
              { id: "main", default: true, workspace: root },
              { id: "worker", workspace: root },
            ],
          },
        };
        const parent = {
          agentId: "main",
          sessionKey: "agent:main:legacy-race",
          sessionId: "legacy-race",
          storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
        };
        const child = {
          agentId: "worker",
          sessionKey: "agent:worker:subagent:legacy-race",
          sessionId: "legacy-race-child",
          storePath: resolveSessionStorePathCore(undefined, { agentId: "worker" }),
        };
        for (const scope of [parent, child]) {
          await upsertSessionEntryCore(scope, {
            sessionId: scope.sessionId,
            updatedAt: 1,
            spawnedWorkspaceDir: root,
          });
        }
        const originalAppend = transcriptOwner.appendAssistantMessageToSessionTranscript;
        const originalRead = transcriptReaders.readSessionMessageByIdAsync;
        for (const mode of ["fence", "race", "readfail"] as const) {
          const record = createTaskRecord({
            runtime: "subagent",
            requesterSessionKey: parent.sessionKey,
            requesterAgentId: parent.agentId,
            childSessionKey: child.sessionKey,
            agentId: child.agentId,
            runId: `legacy-${mode}`,
            task: "Legacy report",
            notifyPolicy: "silent",
          })!;
          const normalize = createReplyMediaPathNormalizer({
            cfg,
            sessionKey: child.sessionKey,
            agentId: child.agentId,
            workspaceDir: root,
            sandboxRoot: root,
          });
          await stageRunReplyFiles({
            cfg,
            ...child,
            runId: record.runId!,
            payloads: [await normalize({ text: "[Report](/workspace/report.csv)" })],
          });
          markTaskTerminalById({ taskId: record.taskId, status: "succeeded", endedAt: Date.now() });
          const task = getTaskById(record.taskId)!;
          const id = taskFileRowId(task);
          let winner: Record<string, unknown>[] = [];
          const appendSpy = vi
            .spyOn(transcriptOwner, "appendAssistantMessageToSessionTranscript")
            .mockImplementation(async (params) => {
              if (params.eventId === id && mode === "fence") {
                deleteTaskRecordById(task.taskId);
              }
              if (params.eventId === id && mode === "race") {
                winner = await managedMedia.createManagedOutgoingMediaBlocks({
                  sessionKey: parent.sessionKey,
                  agentId: parent.agentId,
                  messageId: id,
                  mediaUrls: [path.join(root, "winner.csv")],
                  localRoots: [root],
                  allowLocalNonImage: true,
                });
                await originalAppend({
                  ...parent,
                  config: cfg,
                  expectedSessionId: parent.sessionId,
                  content: [{ type: "text", text: "" }],
                  eventId: id,
                  idempotencyKey: id,
                  beforeMessageWrite: ({ message }) =>
                    Object.assign({}, message, {
                      content: winner,
                      __openclaw: {
                        messageTaskId: task.taskId,
                        taskRunId: task.runId,
                        sourceRunId: task.runId,
                      },
                    }),
                });
              }
              return await originalAppend(params);
            });
          let failRead = mode === "readfail";
          const readSpy = vi
            .spyOn(transcriptReaders, "readSessionMessageByIdAsync")
            .mockImplementation(async (...args) => {
              const result = await originalRead(...args);
              if (failRead && args[1] === id && result.found) {
                failRead = false;
                throw new Error("legacy post-commit read unavailable");
              }
              return result;
            });
          try {
            const pending = readTaskResultFiles(task, "[Report](/workspace/report.csv)", cfg);
            if (mode === "readfail") {
              await expect(pending).rejects.toThrow("legacy post-commit read unavailable");
            } else {
              const result = await pending;
              expect(result).toEqual(
                mode === "fence" ? [] : [{ type: "text", text: "Report" }, ...winner],
              );
            }
          } finally {
            appendSpy.mockRestore();
            readSpy.mockRestore();
          }
          const entries = listManagedImageRecordEntries({}).filter(
            (entry) => entry.record.messageId === id,
          );
          expect(entries).toHaveLength(mode === "fence" ? 0 : 1);
          if (mode !== "fence") {
            const result = await readTaskResultFiles(task, "[Report](/workspace/report.csv)", cfg);
            const source = await managedMedia.resolveManagedOutgoingMediaArtifactSource({
              sessionKey: parent.sessionKey,
              artifactId: String(result[1]?.artifactId),
            });
            expect(source).not.toBeNull();
            expect(await fs.readFile(source!.path, "utf8")).toBe(
              mode === "race" ? "committed winner bytes" : "legacy candidate bytes",
            );
          }
        }
        expect(await readSessionMessagesAsync(parent, { mode: "full" })).toHaveLength(2);
      });
    } finally {
      resetTaskRegistryForTests();
    }
  });
});
