import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearFastTestEnv,
  loadRunCronIsolatedAgentTurn,
  makeCronSession,
  makeCronSessionEntry,
  resolveCronSessionMock,
  resetRunCronIsolatedAgentTurnHarness,
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
});
