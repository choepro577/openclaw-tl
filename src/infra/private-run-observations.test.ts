import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appendRawStream } from "../agents/embedded-agent-subscribe.raw-stream.js";
import { getQueuedFileWriter } from "../agents/queued-file-writer.js";
import { setLoggerOverride } from "../logging/logger.js";
import { loggingState } from "../logging/state.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { emitAgentEvent, onAgentEvent } from "./agent-events.js";
import {
  emitTrustedDiagnosticEventWithPrivateData,
  onDiagnosticEvent,
  onTrustedInternalDiagnosticEvent,
  setDiagnosticsEnabledForProcess,
  waitForDiagnosticEventsDrained,
} from "./diagnostic-events.js";
import {
  bindPrivateRunObservationScope,
  isPrivateRunObservationScope,
  runWithPrivateRunObservationScope,
} from "./private-run-observations.js";

const marker = "PRIVATE-EVIDENCE-MARKER-DO-NOT-PERSIST";
afterEach(() => {
  setLoggerOverride(null);
  loggingState.rawConsole = null;
  vi.unstubAllEnvs();
});

describe("request-private preparation observations", () => {
  it("captures restriction for late callbacks without changing concurrent ordinary work", async () => {
    let callback = () => false;
    await runWithPrivateRunObservationScope(async () => {
      expect(isPrivateRunObservationScope()).toBe(true);
      callback = bindPrivateRunObservationScope(() => isPrivateRunObservationScope());
      await Promise.resolve();
      expect(isPrivateRunObservationScope()).toBe(true);
    });
    expect(isPrivateRunObservationScope()).toBe(false);
    expect(callback()).toBe(true);
    expect(isPrivateRunObservationScope()).toBe(false);
  });

  it("does not publish private model/tool payloads to agent events, diagnostics or subsystem logs", async () => {
    const observed: unknown[] = [];
    const stopAgent = onAgentEvent((event) => observed.push(event));
    const stopDiagnostic = onDiagnosticEvent((event) => observed.push(event));
    const stopInternal = onTrustedInternalDiagnosticEvent((event, metadata, privateData) =>
      observed.push({ event, metadata, privateData }),
    );
    const sink = vi.fn((...args: unknown[]) => observed.push(args));
    loggingState.rawConsole = { log: sink, info: sink, warn: sink, error: sink };
    setLoggerOverride({ level: "silent", consoleLevel: "trace" });
    setDiagnosticsEnabledForProcess(true);
    const logger = createSubsystemLogger("private-preparation-test");
    const emit = (value: string) => {
      emitAgentEvent({ runId: "prep-run", stream: "tool", data: { result: value } });
      emitTrustedDiagnosticEventWithPrivateData(
        { type: "model.call.completed", runId: "prep-run" },
        { modelContent: { outputMessages: [value] } },
      );
      logger.warn(value, { error: value });
      logger.raw(value);
    };
    try {
      await runWithPrivateRunObservationScope(async () => {
        emit(marker);
        await Promise.resolve();
      });
      await waitForDiagnosticEventsDrained();
      expect(JSON.stringify(observed)).not.toContain(marker);
      emit("ordinary-visible-result");
      await waitForDiagnosticEventsDrained();
      expect(JSON.stringify(observed)).toContain("ordinary-visible-result");
    } finally {
      stopAgent();
      stopDiagnostic();
      stopInternal();
    }
  });

  it("drops raw and queued diagnostic writes even when enabled, but preserves ordinary writes", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-private-observation-"));
    const queuedPath = path.join(temp, "queue.jsonl");
    const rawPath = path.join(temp, "raw.jsonl");
    vi.stubEnv("OPENCLAW_RAW_STREAM", "true");
    vi.stubEnv("OPENCLAW_RAW_STREAM_PATH", rawPath);
    const writer = getQueuedFileWriter(new Map(), queuedPath);
    try {
      runWithPrivateRunObservationScope(() => {
        writer.write(marker);
        appendRawStream({ marker });
      });
      await writer.flush();
      expect(await fs.readFile(queuedPath, "utf8").catch(() => "")).not.toContain(marker);
      expect(await fs.readFile(rawPath, "utf8").catch(() => "")).not.toContain(marker);
      writer.write("ordinary-queued\n");
      appendRawStream({ ordinary: true });
      await writer.flush();
      await vi.waitFor(async () =>
        expect(await fs.readFile(rawPath, "utf8")).toContain("ordinary"),
      );
      expect(await fs.readFile(queuedPath, "utf8")).toBe("ordinary-queued\n");
    } finally {
      await fs.rm(temp, { recursive: true, force: true });
    }
  });
});
