import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubagentRunRecord } from "../registry/subagent-registry.types.js";
import { makeSettledChild } from "./subagent-announce.requester-settle-wake.fixture.js";

let child: SubagentRunRecord;
const { completionFilesMock, deliverSpy } = vi.hoisted(() => ({
  completionFilesMock: vi.fn(async (_params: { isDeliveryAllowed: () => boolean }) => false),
  deliverSpy: vi.fn(async (_params: Record<string, unknown>) => ({
    delivered: true,
    path: "direct",
  })),
}));
vi.mock("../completion/subagent-completion-files.js", () => ({
  deliverSubagentCompletionFiles: completionFilesMock,
}));
vi.mock("../registry/subagent-registry-read.js", () => ({
  hasDescendantRunAwaitingSettle: () => false,
  listSubagentRunsForRequester: () => [child],
  getLatestSubagentRunByChildSessionKey: () => child,
}));
vi.mock("./subagent-announce.js", () => ({
  hasUsableSessionEntry: (entry: { sessionId?: string } | undefined) => Boolean(entry?.sessionId),
}));
vi.mock("./subagent-announce.runtime.js", () => ({
  callGateway: vi.fn(async () => ({})),
  getRuntimeConfig: () => ({ session: { mainKey: "main", scope: "per-sender" } }),
  readRecentSessionTranscriptActiveEvents: () => [],
  readSessionMessagesAsync: vi.fn(async () => []),
  readSubagentSessionEntry: vi.fn(() => undefined),
  resolveAgentIdFromSessionKey: () => "main",
  resolveSessionStorePathCore: () => "/tmp/sessions.json",
}));
vi.mock("./subagent-announce-delivery.js", () => ({
  deliverSubagentAnnouncement: (params: Record<string, unknown>) => deliverSpy(params),
  loadRequesterSessionEntry: (sessionKey: string) => ({
    entry: { sessionId: "sess-main" },
    canonicalKey: sessionKey,
  }),
}));
vi.mock("../spawn/subagent-depth.js", () => ({
  getSubagentDepthFromSessionStore: () => 0,
}));

import {
  maybeWakeRequesterAfterAllChildrenSettled,
  type RequesterSettleWakeBatchState,
} from "./subagent-announce.requester-settle-wake.js";

beforeEach(() => {
  completionFilesMock.mockReset().mockResolvedValue(false);
  deliverSpy.mockReset().mockResolvedValue({ delivered: true, path: "direct" });
});

const transitionBatch = (_runIds: readonly string[], state: RequesterSettleWakeBatchState) => {
  child.requesterSettleWake = { ...state };
};

const wakeParams = (settledEntry: SubagentRunRecord) => ({
  requesterSessionKey: settledEntry.requesterSessionKey,
  settledEntry,
  transitionBatch,
  completeBatch: () => undefined,
});

describe("requester yield file delivery", () => {
  it.each([false, true])(
    "publishes files after yield admission and fences a replaced generation (replaced=%s)",
    async (replaceGeneration) => {
      const order: string[] = [];
      child = makeSettledChild({
        runId: "run-yield-files",
        requesterTurnYielded: true,
        requesterSettleWake: {
          status: "pending",
          attemptCount: 0,
          requesterYieldBatch: true,
          rearmGeneration: 1,
        },
        completion: { required: true, resultText: "Report.xlsx and chart.png are ready." },
      });
      completionFilesMock.mockImplementation(async (params) => {
        expect(child.requesterSettleWake?.status).toBe("dispatching");
        expect(params.isDeliveryAllowed()).toBe(true);
        if (replaceGeneration) {
          child.requesterSettleWake!.rearmGeneration = 2;
          expect(params.isDeliveryAllowed()).toBe(false);
          return false;
        }
        order.push("files-published");
        return true;
      });
      deliverSpy.mockImplementationOnce(async () => {
        order.push("parent-wake");
        return { delivered: true, path: "direct" };
      });
      const result = await maybeWakeRequesterAfterAllChildrenSettled(wakeParams(child));
      expect(result).toBe(!replaceGeneration);
      expect(order).toEqual(replaceGeneration ? [] : ["files-published", "parent-wake"]);
      if (!replaceGeneration) {
        expect(deliverSpy.mock.calls[0]?.[0]?.triggerMessage).toContain(
          "already been returned as attachments",
        );
      }
    },
  );
});
