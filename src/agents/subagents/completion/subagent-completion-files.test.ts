import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskRecord } from "../../../tasks/task-registry.types.js";
import { makeSettledChild } from "../announce/subagent-announce.requester-settle-wake.fixture.js";
import type { SubagentRunRecord } from "../registry/subagent-registry.types.js";

let source: SubagentRunRecord;
let task: TaskRecord;
const { publishFiles } = vi.hoisted(() => ({
  publishFiles: vi.fn(
    async (
      _task: TaskRecord,
      _cfg: unknown,
      _options: { sourceRunId: string; isDeliveryAllowed: () => boolean },
    ) => ({ blocks: [{ type: "file", fileName: "report.xlsx", artifactId: "parent-owned-file" }] }),
  ),
}));
vi.mock("../../../tasks/runtime-internal.js", () => ({
  findTaskByRunId: (runId: string) => (task.runId === runId ? task : undefined),
}));
vi.mock("../registry/subagent-registry-read.js", () => ({
  getLatestSubagentRunByChildSessionKey: () => source,
}));
vi.mock("../../../gateway/server-methods/chat-history-files.runtime.js", () => ({
  deliverTaskResultFiles: publishFiles,
}));

import { deliverSubagentCompletionFiles } from "./subagent-completion-files.js";

const params = {
  cfg: {},
  childSessionKey: "agent:worker:subagent:child",
  childRunId: "actual-run",
  requesterSessionKey: "agent:personal:main",
  isDeliveryAllowed: () => true,
};

beforeEach(() => {
  source = makeSettledChild({
    runId: params.childRunId,
    taskRunId: "durable-task-run",
    childSessionKey: params.childSessionKey,
    requesterSessionKey: params.requesterSessionKey,
    generation: 1,
  });
  task = {
    taskId: "task-files",
    runtime: "subagent",
    requesterSessionKey: params.requesterSessionKey,
    childSessionKey: params.childSessionKey,
    runId: source.taskRunId,
    ownerKey: params.requesterSessionKey,
    scopeKind: "session",
    task: "Export report",
    status: "succeeded",
    deliveryStatus: "pending",
    notifyPolicy: "done_only",
    createdAt: 1_000,
  };
  publishFiles.mockClear();
});

describe("subagent completion file delivery", () => {
  it("copies the actual child run through its exact durable task binding", async () => {
    expect(await deliverSubagentCompletionFiles(params)).toBe(true);
    expect(publishFiles).toHaveBeenCalledWith(
      task,
      {},
      expect.objectContaining({
        sourceRunId: params.childRunId,
        isDeliveryAllowed: expect.any(Function),
      }),
    );
  });

  it.each(["child run", "task child", "task requester", "owner"])(
    "does not publish when the %s binding is invalid",
    async (invalid) => {
      if (invalid === "child run") {
        source.runId = "replacement-run";
      }
      if (invalid === "task child") {
        task.childSessionKey = "agent:worker:subagent:sibling";
      }
      if (invalid === "task requester") {
        task.requesterSessionKey = "agent:other:main";
      }
      expect(
        await deliverSubagentCompletionFiles({
          ...params,
          isDeliveryAllowed: () => invalid !== "owner",
        }),
      ).toBe(false);
      expect(publishFiles).not.toHaveBeenCalled();
    },
  );

  it("passes the live owner predicate into the append and rejects a replacement after awaited copying", async () => {
    publishFiles.mockImplementationOnce(async (_task, _cfg, options) => {
      expect(options.isDeliveryAllowed()).toBe(true);
      source = { ...source, generation: 2 };
      expect(options.isDeliveryAllowed()).toBe(false);
      return {
        blocks: [{ type: "file", fileName: "report.xlsx", artifactId: "parent-owned-file" }],
      };
    });
    expect(await deliverSubagentCompletionFiles(params)).toBe(false);
  });
});
