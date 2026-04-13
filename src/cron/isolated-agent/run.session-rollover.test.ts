import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSessionFilePath } from "../../config/sessions.js";
import {
  clearFastTestEnv,
  loadRunCronIsolatedAgentTurn,
  makeCronSession,
  makeCronSessionEntry,
  mockRunCronFallbackPassthrough,
  resolveCronSessionMock,
  resetRunCronIsolatedAgentTurnHarness,
  runEmbeddedPiAgentMock,
  updateSessionStoreMock,
  restoreFastTestEnv,
} from "./run.test-harness.js";

const runCronIsolatedAgentTurn = await loadRunCronIsolatedAgentTurn();

function makeParams(overrides?: Record<string, unknown>) {
  const sessionKey = "agent:default:webchat:session-a";
  return {
    cfg: {},
    deps: {} as never,
    job: {
      id: "rollover-job",
      name: "Rollover Job",
      schedule: { kind: "every", everyMs: 60_000 },
      sessionTarget: `session:${sessionKey}`,
      sessionKey,
      payload: { kind: "agentTurn", message: "send the reminder" },
      delivery: { mode: "none" },
    } as never,
    message: "send the reminder",
    sessionKey,
    ...overrides,
  };
}

describe("runCronIsolatedAgentTurn session rollover recovery", () => {
  let previousFastTestEnv: string | undefined;

  beforeEach(() => {
    previousFastTestEnv = clearFastTestEnv();
    resetRunCronIsolatedAgentTurnHarness();
  });

  afterEach(() => {
    restoreFastTestEnv(previousFastTestEnv);
  });

  it("re-injects the final reply into the latest internal session when the bound source session rolled over mid-run", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cron-rollover-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const sessionKey = "agent:default:webchat:session-a";
    try {
      await fs.writeFile(
        storePath,
        JSON.stringify(
          {
            [sessionKey]: {
              sessionId: "visible-session-new",
              updatedAt: Date.now(),
              lastChannel: "webchat",
            },
          },
          null,
          2,
        ),
        "utf-8",
      );

      resolveCronSessionMock.mockReturnValue(
        makeCronSession({
          storePath,
          sessionEntry: makeCronSessionEntry({
            sessionId: "run-session-old",
          }),
          isNewSession: false,
        }),
      );

      const internalSessionFallback = vi.fn().mockResolvedValue({
        handled: true,
        delivered: true,
        sessionKey,
      });

      const result = await runCronIsolatedAgentTurn(
        makeParams({
          cfg: {
            session: {
              store: storePath,
            },
          },
          internalSessionFallback,
        }),
      );

      expect(internalSessionFallback).toHaveBeenCalledTimes(1);
      expect(internalSessionFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: "default",
          runSessionId: "run-session-old",
          synthesizedText: "test output",
        }),
      );
      expect(result.status).toBe("ok");
      expect(result.delivered).toBe(true);
      expect(result.deliveryAttempted).toBe(true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("does not inject a fallback reply when the bound internal session still points at the active run", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-cron-rollover-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const sessionKey = "agent:default:webchat:session-a";
    try {
      await fs.writeFile(
        storePath,
        JSON.stringify(
          {
            [sessionKey]: {
              sessionId: "run-session-old",
              updatedAt: Date.now(),
              lastChannel: "webchat",
            },
          },
          null,
          2,
        ),
        "utf-8",
      );

      resolveCronSessionMock.mockReturnValue(
        makeCronSession({
          storePath,
          sessionEntry: makeCronSessionEntry({
            sessionId: "run-session-old",
          }),
          isNewSession: false,
        }),
      );

      const internalSessionFallback = vi.fn().mockResolvedValue({
        handled: true,
        delivered: true,
        sessionKey,
      });

      const result = await runCronIsolatedAgentTurn(
        makeParams({
          cfg: {
            session: {
              store: storePath,
            },
          },
          internalSessionFallback,
        }),
      );

      expect(internalSessionFallback).not.toHaveBeenCalled();
      expect(result.status).toBe("ok");
      expect(result.delivered).toBe(false);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("reuses the persisted sessionFile when a bound UI session already points at a branched transcript", async () => {
    const customSessionFile = resolveSessionFilePath(
      "visible-session-id",
      { sessionFile: "webchat-branched-session.jsonl" },
      { agentId: "default" },
    );
    const cronSession = makeCronSession({
      sessionEntry: makeCronSessionEntry({
        sessionId: "visible-session-id",
        sessionFile: customSessionFile,
      }),
      isNewSession: false,
    });
    resolveCronSessionMock.mockReturnValue(cronSession);
    mockRunCronFallbackPassthrough();

    await runCronIsolatedAgentTurn(makeParams());

    expect(runEmbeddedPiAgentMock).toHaveBeenCalledTimes(1);
    expect(runEmbeddedPiAgentMock.mock.calls[0]?.[0]).toMatchObject({
      sessionId: "visible-session-id",
      sessionFile: customSessionFile,
    });
  });

  it("persists the actual embedded run sessionId when the transcript behind the session has already rolled over", async () => {
    const customSessionFile = resolveSessionFilePath(
      "store-session-old",
      { sessionFile: "webchat-branched-session.jsonl" },
      { agentId: "default" },
    );
    const cronSession = makeCronSession({
      sessionEntry: makeCronSessionEntry({
        sessionId: "store-session-old",
        sessionFile: customSessionFile,
      }),
      isNewSession: false,
    });
    resolveCronSessionMock.mockReturnValue(cronSession);
    mockRunCronFallbackPassthrough();
    runEmbeddedPiAgentMock.mockResolvedValueOnce({
      payloads: [{ text: "test output" }],
      meta: {
        agentMeta: {
          sessionId: "transcript-session-new",
          usage: { input: 10, output: 20 },
        },
      },
    });
    updateSessionStoreMock.mockImplementation(async (_storePath, update) => {
      update({});
    });

    const result = await runCronIsolatedAgentTurn(makeParams());

    expect(result.status).toBe("ok");
    expect(result.sessionId).toBe("transcript-session-new");
    expect(cronSession.sessionEntry.sessionId).toBe("transcript-session-new");
    expect(cronSession.sessionEntry.sessionFile).toBe(customSessionFile);
    expect(cronSession.store["agent:default:webchat:session-a"]).toMatchObject({
      sessionId: "transcript-session-new",
      sessionFile: customSessionFile,
    });
  });
});
