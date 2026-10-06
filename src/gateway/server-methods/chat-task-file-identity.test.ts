import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { subagentRuns } from "../../agents/subagents/registry/subagent-registry-memory.js";
import { getLatestSubagentRunByChildSessionKey } from "../../agents/subagents/registry/subagent-registry-read.js";
import { clearSubagentRunsReadCacheForTest } from "../../agents/subagents/registry/subagent-registry-state.js";
import { createCanonicalSubagentRunFixture } from "../../agents/subagents/registry/subagent-registry.persistence.test-support.js";
import { saveSubagentRegistryToSqlite } from "../../agents/subagents/registry/subagent-registry.store.sqlite.js";
import type { SubagentRunRecord } from "../../agents/subagents/registry/subagent-registry.types.js";
import { createReplyMediaPathNormalizer } from "../../auto-reply/reply/reply-media-paths.runtime.js";
import { resolveSessionStorePathCore } from "../../config/sessions/paths.js";
import {
  upsertSessionEntryCore,
  deleteSessionEntryLifecycle,
} from "../../config/sessions/session-accessor.js";
import { appendAssistantMessageToSessionTranscript } from "../../config/sessions/transcript.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  createTaskRecord,
  getTaskById,
  markTaskTerminalById,
  reloadTaskRuntimeStateFromStore,
} from "../../tasks/runtime-internal.js";
import { resetTaskRegistryForTests } from "../../tasks/task-runtime.test-helpers.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import {
  copyManagedOutgoingMediaBlocks,
  resolveManagedOutgoingMediaArtifactSource,
} from "../managed-image-attachments.js";
import { listManagedImageRecordEntries } from "../managed-image-record-store.js";
import { readSessionMessagesAsync } from "../session-transcript-readers.js";
import { readTaskResultFiles } from "./chat-history-files.js";
import {
  deliverTaskResultFiles,
  stageRunReplyFiles,
  resolveTaskFileSourceRun,
} from "./chat-run-files.js";
import { legacyTaskFileRowId, readOwnedTaskFileRow } from "./chat-task-file-identity.js";

describe("durable task file identity", () => {
  it.each(["v2", "v1", "v1-logical"] as const)(
    "recovers %s physical-run files from canonical rows after durable registry pruning",
    async (version) => {
      const previousReadFlag = process.env.OPENCLAW_TEST_READ_SUBAGENT_RUNS_FROM_SQLITE;
      process.env.OPENCLAW_TEST_READ_SUBAGENT_RUNS_FROM_SQLITE = "1";
      resetTaskRegistryForTests();
      subagentRuns.clear();
      clearSubagentRunsReadCacheForTest();
      try {
        await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
          const root = state.path("run-recovery");
          await fs.mkdir(root, { recursive: true });
          await fs.writeFile(path.join(root, "report.csv"), "sealed physical run bytes");
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
            sessionKey: "agent:main:run-recovery",
            sessionId: "run-recovery-parent",
            storePath: resolveSessionStorePathCore(undefined, { agentId: "main" }),
          };
          const child = {
            agentId: "worker",
            sessionKey: "agent:worker:subagent:run-recovery",
            sessionId: "run-recovery-child",
            storePath: resolveSessionStorePathCore(undefined, { agentId: "worker" }),
          };
          for (const scope of [parent, child]) {
            await upsertSessionEntryCore(scope, {
              sessionId: scope.sessionId,
              updatedAt: 1,
              spawnedWorkspaceDir: root,
            });
          }
          const record = createTaskRecord({
            runtime: "subagent",
            requesterSessionKey: parent.sessionKey,
            requesterAgentId: parent.agentId,
            childSessionKey: child.sessionKey,
            agentId: child.agentId,
            runId: "logical-task-run",
            task: "Report",
            notifyPolicy: "silent",
          })!;
          markTaskTerminalById({ taskId: record.taskId, status: "succeeded", endedAt: Date.now() });
          const task = getTaskById(record.taskId)!;
          const physicalRunId = version === "v1-logical" ? task.runId! : "physical-producer-run";
          const source = createCanonicalSubagentRunFixture({
            runId: physicalRunId,
            taskRunId: task.runId,
            childSessionKey: child.sessionKey,
            requesterSessionKey: parent.sessionKey,
            requesterDisplayKey: parent.sessionKey,
            task: "Report",
            cleanup: "keep",
            createdAt: 1,
            generation: 1,
            execution: { status: "running" },
          });
          const persist = (runs: SubagentRunRecord[]) => {
            saveSubagentRegistryToSqlite(new Map(runs.map((run) => [run.runId, run])));
            subagentRuns.clear();
            clearSubagentRunsReadCacheForTest();
          };
          persist([source]);
          expect(await resolveTaskFileSourceRun(task, cfg)).toBe(physicalRunId);
          const normalize = createReplyMediaPathNormalizer({
            cfg,
            sessionKey: child.sessionKey,
            agentId: child.agentId,
            workspaceDir: root,
            sandboxRoot: root,
          });
          const sealed = await stageRunReplyFiles({
            cfg,
            ...child,
            runId: physicalRunId,
            payloads: [await normalize({ text: "[Report](/workspace/report.csv)" })],
          });
          expect(sealed).toHaveLength(1);
          if (version.startsWith("v1")) {
            const id = legacyTaskFileRowId(task, physicalRunId);
            const copied = await copyManagedOutgoingMediaBlocks({
              sourceSessionKey: child.sessionKey,
              targetSessionKey: parent.sessionKey,
              targetAgentId: parent.agentId,
              targetMessageId: id,
              artifactIds: sealed.map((block) => String(block.artifactId)),
            });
            await appendAssistantMessageToSessionTranscript({
              ...parent,
              config: cfg,
              expectedSessionId: parent.sessionId,
              content: [{ type: "text", text: "" }],
              eventId: id,
              idempotencyKey: id,
              beforeMessageWrite: ({ message }) =>
                Object.assign({}, message, {
                  content: copied,
                  __openclaw: {
                    messageTaskId: task.taskId,
                    taskRunId: task.runId,
                    sourceRunId: physicalRunId,
                  },
                }),
            });
          }
          const delivered = await deliverTaskResultFiles(task, cfg);
          expect(delivered.blocks).toHaveLength(1);
          const originalRow = await readOwnedTaskFileRow(parent, task, physicalRunId);
          expect(originalRow?.sourceRunId).toBe(physicalRunId);
          if (version.startsWith("v1")) {
            expect(originalRow?.messageId).toBe(legacyTaskFileRowId(task, physicalRunId));
          }
          for (let index = 0; index < 120; index++) {
            await appendAssistantMessageToSessionTranscript({
              ...parent,
              config: cfg,
              text: `Later message ${index}`,
            });
          }
          const count = listManagedImageRecordEntries({}).filter(
            (entry) => entry.record.sessionKey === parent.sessionKey,
          ).length;
          await fs.unlink(path.join(root, "report.csv"));
          if (version === "v2") {
            // Persisted prune plus task-registry reload exercises restart-readable owners.
            persist([]);
            reloadTaskRuntimeStateFromStore();
            expect(getLatestSubagentRunByChildSessionKey(child.sessionKey)).toBeNull();
            const restored = getTaskById(task.taskId)!;
            expect(await resolveTaskFileSourceRun(restored, cfg)).toBe(physicalRunId);
            const result = await readTaskResultFiles(restored, "Report", cfg);
            expect(result.slice(1)).toEqual(delivered.blocks);
            // A later unrelated child run must not hide the older committed task result.
            persist([
              Object.assign({}, source, {
                runId: "unrelated-physical",
                taskRunId: "unrelated-logical",
                generation: 2,
              }),
            ]);
            expect(await resolveTaskFileSourceRun(restored, cfg)).toBe(physicalRunId);
            expect((await readTaskResultFiles(restored, "Report", cfg)).slice(1)).toEqual(
              delivered.blocks,
            );
          } else {
            // Legacy v1 is recovered by exact known-physical probe, never a broad hash scan.
            expect((await readTaskResultFiles(task, "Report", cfg)).slice(1)).toEqual(
              delivered.blocks,
            );
            persist([]);
            expect(await readOwnedTaskFileRow(parent, task, physicalRunId)).toEqual(originalRow);
            if (version === "v1-logical") {
              expect(await resolveTaskFileSourceRun(task, cfg)).toBe(physicalRunId);
              expect((await readTaskResultFiles(task, "Report", cfg)).slice(1)).toEqual(
                delivered.blocks,
              );
            }
          }
          const artifact = await resolveManagedOutgoingMediaArtifactSource({
            sessionKey: parent.sessionKey,
            artifactId: String(delivered.blocks[0]?.artifactId),
          });
          expect(artifact).not.toBeNull();
          expect(await fs.readFile(artifact!.path, "utf8")).toBe("sealed physical run bytes");
          expect(await readOwnedTaskFileRow(child, task, physicalRunId)).toBeUndefined();
          if (version === "v1") {
            persist([source]);
          }
          expect(await readTaskResultFiles(task, undefined, cfg)).toEqual(delivered.blocks);
          await deleteSessionEntryLifecycle({
            archiveTranscript: false,
            storePath: child.storePath,
            target: { canonicalKey: child.sessionKey, storeKeys: [child.sessionKey] },
          });
          // Parent-owned bytes remain usable independently of the cleaned source node.
          expect(await readTaskResultFiles(task, undefined, cfg)).toEqual(delivered.blocks);
          expect(
            listManagedImageRecordEntries({}).filter(
              (entry) => entry.record.sessionKey === parent.sessionKey,
            ),
          ).toHaveLength(count);
          expect(await readSessionMessagesAsync(parent, { mode: "full" })).toHaveLength(121);
        });
      } finally {
        if (previousReadFlag === undefined) {
          delete process.env.OPENCLAW_TEST_READ_SUBAGENT_RUNS_FROM_SQLITE;
        } else {
          process.env.OPENCLAW_TEST_READ_SUBAGENT_RUNS_FROM_SQLITE = previousReadFlag;
        }
        resetTaskRegistryForTests();
        subagentRuns.clear();
        clearSubagentRunsReadCacheForTest();
      }
    },
  );
});
