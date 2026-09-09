import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHarness,
  flushObserver,
  resetSessionObserverEventSequence,
  startAndAddToolNotes,
} from "./session-observer.test-utils.js";

const warnings = vi.hoisted(() => vi.fn());
vi.mock("../logging/subsystem.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../logging/subsystem.js")>();
  return {
    ...original,
    createSubsystemLogger: (subsystem: string) => {
      const logger = original.createSubsystemLogger(subsystem);
      return subsystem === "gateway/session-observer" ? { ...logger, warn: warnings } : logger;
    },
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetSessionObserverEventSequence();
});

describe("observer error diagnostics", () => {
  it("logs serializable failure details without credentials when model observation stops", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    warnings.mockClear();
    const completeModel = vi.fn(async () => {
      throw Object.assign(
        new Error("model unavailable Authorization: Bearer sk-test-secret-observer-1234567890"),
        { code: "ETIMEDOUT", request: { headers: { authorization: "private" } } },
      );
    });
    const { observer } = createHarness({ completeModel });
    try {
      startAndAddToolNotes(observer);
      await vi.advanceTimersByTimeAsync(24_000);
      await flushObserver();
      expect(completeModel).toHaveBeenCalledTimes(2);
      const warning = warnings.mock.calls.find(
        ([message]) => message === "session observer disabled after consecutive failures",
      );
      expect(warning).toBeDefined();
      const serialized = JSON.stringify(warning?.[1]);
      const logged = JSON.parse(serialized);
      expect(logged.error).toMatchObject({ name: "Error", code: "ETIMEDOUT" });
      expect(logged.error.message).toContain("model unavailable");
      expect(serialized).not.toContain("sk-test-secret-observer-1234567890");
      expect(logged.error).not.toHaveProperty("request");
    } finally {
      observer.dispose();
    }
  });
});
