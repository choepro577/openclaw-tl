import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoCleanupTempDirTracker } from "../../../test/helpers/temp-dir.js";
import {
  loadExactSessionEntry,
  readClosedTranscriptTurn,
  upsertSessionEntryCore,
} from "../../config/sessions/session-accessor.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { registerContextEngineForOwner } from "../../context-engine/registry.js";
import { captureContextEngineRegistryStateForTests } from "../../context-engine/registry.test-support.js";
import type { ContextEngine } from "../../context-engine/types.js";
import { createUserTurnTranscriptRecorder } from "../../sessions/user-turn-transcript.js";
import { closeOpenClawAgentDatabasesForTest } from "../../state/openclaw-agent-db.js";
import {
  createOperationalRunInstanceRef,
  prepareAgentRunAdmission,
} from "../admitted-run-context.js";
import type {
  EmbeddedRunAttemptParams,
  EmbeddedRunAttemptResult,
} from "../embedded-agent-runner/run/types.js";
import { AuthStorage } from "../sessions/auth-storage.js";
import { ModelRegistry } from "../sessions/model-registry.js";
import { makeProviderModelFixture } from "../test-helpers/provider-model-fixture.js";
import { createContextEngineLogicalTurnLease } from "./context-engine-logical-turn.js";
import {
  discardContextEngineTurnAttemptIntent,
  finalizeAcceptedContextEngineTurn,
  type ContextEngineTurnAttemptFacts,
} from "./context-engine-turn-attempt.js";
import { runHostManagedTranscriptTurn } from "./host-managed-turn.js";

const tempDirs = useAutoCleanupTempDirTracker(afterEach);
const cleanup: Array<() => void | Promise<void>> = [];
let restoreRegistry = () => {};
beforeEach(() => {
  restoreRegistry = captureContextEngineRegistryStateForTests();
});
afterEach(async () => {
  for (const dispose of cleanup.splice(0).reverse()) await dispose();
  restoreRegistry();
  closeOpenClawAgentDatabasesForTest();
});

async function fixture() {
  const directory = tempDirs.make("openclaw-host-managed-turn-");
  const runId = `host-run-${path.basename(directory)}`;
  const target = {
    agentId: "main",
    sessionId: "parent-session",
    sessionKey: "agent:main:parent",
    storePath: path.join(directory, "sessions.json"),
    expectedLifecycleRevision: "parent-generation",
    expectedWriterRunId: runId,
  };
  await upsertSessionEntryCore(target, {
    sessionId: target.sessionId,
    updatedAt: 1,
    lifecycleRevision: target.expectedLifecycleRevision,
    activeWriterRunId: runId,
  });
  // A real engine persists the advancement key atomically, so assertions prove
  // the canonical outbox reached engine-owned storage, not a mocked callback.
  const proof = new DatabaseSync(path.join(directory, "engine-proof.sqlite"));
  proof.exec("CREATE TABLE commits (advancement_key TEXT PRIMARY KEY, messages TEXT NOT NULL)");
  cleanup.push(() => proof.close());
  const engineId = `host-engine-${path.basename(directory)}`;
  const engine: ContextEngine = {
    info: {
      id: engineId,
      name: "Host lifecycle proof",
      transcriptSemantics: {
        currentTurnFence: "before-current-turn-entry-v1",
        turnAdvancementIdempotency: "atomic-idempotent-v1",
      },
    },
    ingest: async () => ({ ingested: true }),
    assemble: async ({ messages }) => ({ messages, estimatedTokens: 0 }),
    compact: async () => ({ ok: true, compacted: false }),
    commitTurn: async ({ advancementKey, messages }) => {
      const result = proof
        .prepare("INSERT OR IGNORE INTO commits (advancement_key, messages) VALUES (?, ?)")
        .run(advancementKey, JSON.stringify(messages));
      return { status: result.changes === 0 ? "duplicate" : "committed" };
    },
  };
  registerContextEngineForOwner(engineId, () => engine, `test:${engineId}`);
  const config: OpenClawConfig = { plugins: { slots: { contextEngine: engineId } } };
  const lease = await createContextEngineLogicalTurnLease({ config });
  cleanup.push(() => lease.dispose());
  const admission = prepareAgentRunAdmission({
    cfg: config,
    operationalRunInstance: createOperationalRunInstanceRef(runId),
    facts: {
      runId,
      agentId: "main",
      ingress: { kind: "system", boundary: "test", state: "present" },
    },
  });
  cleanup.push(() => admission.close());
  const recorder = createUserTurnTranscriptRecorder({
    input: { text: "Đồng ý, nhờ bạn xử lý giúp.", idempotencyKey: `${runId}:user` },
    target: {
      ...target,
      expectedSessionId: target.sessionId,
      sessionEntry: loadExactSessionEntry(target)?.entry,
      config,
    },
    onPersistenceError: (error) => {
      throw error;
    },
  });
  const candidates: ContextEngineTurnAttemptFacts[] = [];
  const authStorage = AuthStorage.inMemory();
  const attempt: EmbeddedRunAttemptParams = {
    ...target,
    sessionTarget: target,
    sessionFile: target.sessionKey,
    runId,
    admittedRunContext: await admission.admit("embedded"),
    workspaceDir: directory,
    config,
    prompt: "Đồng ý, nhờ bạn xử lý giúp.",
    timeoutMs: 5_000,
    provider: "fixture-provider",
    modelId: "configured-parent-model",
    requestedModelId: "configured-parent-model",
    model: makeProviderModelFixture({
      id: "configured-parent-model",
      provider: "fixture-provider",
      api: "openai-responses",
      baseUrl: "https://fixture.invalid/v1",
    }),
    authStorage,
    authProfileStore: { version: 1, profiles: {} },
    modelRegistry: ModelRegistry.inMemory(authStorage),
    thinkLevel: "low",
    agentHarnessId: "openclaw",
    userTurnTranscriptRecorder: recorder,
    contextEngineLogicalTurnLease: lease,
    onContextEngineTurnCandidate: (candidate: ContextEngineTurnAttemptFacts) =>
      candidates.push(candidate),
  };
  const result = (yielded = false): EmbeddedRunAttemptResult => ({
    terminal: { kind: "ok" },
    sessionIdUsed: target.sessionId,
    agentHarnessId: attempt.agentHarnessId,
    messagesSnapshot: [],
    assistantTexts: yielded ? [] : ["Chưa thể hoàn tất phần chuyên gia."],
    toolMetas: [],
    lastAssistant: undefined,
    didSendViaMessagingTool: false,
    messagingToolSentTexts: [],
    messagingToolSentMediaUrls: [],
    messagingToolSentTargets: [],
    cloudCodeAssistFormatError: false,
    replayMetadata: { replaySafe: false, hadPotentialSideEffects: true },
    modelIterations: 0,
    itemLifecycle: { startedCount: 0, completedCount: 0, activeCount: 0 },
    ...(yielded
      ? { yieldDetected: true, yieldAcknowledgment: "Đã bàn giao, tôi đang chờ kết quả." }
      : {}),
  });
  const responseText = (value: EmbeddedRunAttemptResult) =>
    value.yieldAcknowledgment ?? value.assistantTexts.join("\n\n");
  const rows = () => proof.prepare("SELECT * FROM commits").all();
  return { attempt, candidates, lease, recorder, target, result, responseText, rows, admission };
}

describe("host-managed transcript turn", () => {
  it("persists a real parent answer and commits its exact closed range without model invocation", async () => {
    const f = await fixture();
    const execute = vi.fn(async (prepared: EmbeddedRunAttemptParams) => {
      expect(f.recorder.getAdmissionReceipt()).toBeDefined();
      expect(prepared.contextEngine).toBe(f.lease.engine);
      expect(() => f.lease.degradeBeforeStart("too late")).toThrow("already pinned");
      expect(prepared.modelId).toBe("configured-parent-model");
      expect(prepared.agentHarnessId).toBe("openclaw");
      return f.result();
    });
    const output = await runHostManagedTranscriptTurn({
      attempt: f.attempt,
      execute,
      responseText: f.responseText,
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(output.lastAssistant).toBeUndefined();
    expect(output.modelIterations).toBe(0);
    expect(output).not.toHaveProperty("contextEngineTerminalAnchor");
    expect(f.candidates).toHaveLength(1);
    const candidate = f.candidates[0]!;
    expect(candidate).toMatchObject({
      providerId: "fixture-provider",
      modelId: "configured-parent-model",
      harnessId: "openclaw",
    });
    const closed = readClosedTranscriptTurn({
      boundary: candidate.boundary,
      maxEvents: 10,
      maxBytes: 10_000,
    });
    expect(closed.kind).toBe("ok");
    if (closed.kind !== "ok") throw new Error("expected actual persisted turn");
    expect(closed.messages).toHaveLength(2);
    expect(closed.messages[1]).toMatchObject({
      role: "assistant",
      provider: "openclaw",
      model: "host-response",
      content: [{ type: "text", text: f.responseText(output) }],
    });
    await finalizeAcceptedContextEngineTurn({ facts: candidate, lease: f.lease });
    await finalizeAcceptedContextEngineTurn({ facts: candidate, lease: f.lease });
    expect(f.rows()).toHaveLength(1);
    expect(JSON.parse(String(f.rows()[0]?.messages))).toEqual(closed.messages);
  });

  it("keeps a yielded ACK durable while preserving the normal discard/no-advance policy", async () => {
    const f = await fixture();
    const phases: string[] = [];
    const onExecutionPhase: NonNullable<EmbeddedRunAttemptParams["onExecutionPhase"]> = (info) => {
      phases.push(info.phase);
    };
    const output = await runHostManagedTranscriptTurn({
      attempt: { ...f.attempt, onExecutionPhase },
      execute: async () => {
        // The gateway must know the runtime owns this turn before host work can yield.
        expect(phases).toEqual(["turn_accepted"]);
        return f.result(true);
      },
      responseText: f.responseText,
    });
    expect(phases).toEqual(["turn_accepted", "assistant_output_started"]);
    expect(output.yieldDetected).toBe(true);
    expect(f.candidates).toHaveLength(1);
    const closed = readClosedTranscriptTurn({
      boundary: f.candidates[0]!.boundary,
      maxEvents: 10,
      maxBytes: 10_000,
    });
    expect(closed.kind).toBe("ok");
    if (closed.kind !== "ok") throw new Error("expected persisted yielded turn");
    expect(closed.messages).toHaveLength(2);
    expect(closed.messages[1]).toMatchObject({
      role: "assistant",
      model: "host-response",
      content: [{ type: "text", text: output.yieldAcknowledgment }],
    });
    expect(closed.messages[1]).not.toHaveProperty("openclawDelivery");
    // run-entry owns terminal advancement and intentionally discards yielded turns.
    discardContextEngineTurnAttemptIntent({ facts: f.candidates[0]!, lease: f.lease });
    expect(f.rows()).toEqual([]);
  });

  it("reuses the exact persisted ACK anchor on an idempotent host retry", async () => {
    const f = await fixture();
    for (let index = 0; index < 2; index += 1) {
      await runHostManagedTranscriptTurn({
        attempt: f.attempt,
        execute: async () => f.result(true),
        responseText: f.responseText,
      });
    }
    expect(f.candidates).toHaveLength(2);
    expect(f.candidates[1]!.boundary).toEqual(f.candidates[0]!.boundary);
    const closed = readClosedTranscriptTurn({
      boundary: f.candidates[1]!.boundary,
      maxEvents: 10,
      maxBytes: 10_000,
    });
    expect(closed.kind).toBe("ok");
    if (closed.kind === "ok") expect(closed.messages).toHaveLength(2);
  });

  it("fails before host work when canonical user admission is unavailable", async () => {
    const f = await fixture();
    const execute = vi.fn(async () => f.result());
    const onExecutionPhase = vi.fn();
    await expect(
      runHostManagedTranscriptTurn({
        attempt: { ...f.attempt, userTurnTranscriptRecorder: undefined, onExecutionPhase },
        execute,
        responseText: f.responseText,
      }),
    ).rejects.toThrow("transcript admission");
    expect(execute).not.toHaveBeenCalled();
    expect(onExecutionPhase).not.toHaveBeenCalled();
    expect(f.candidates).toEqual([]);
  });

  it("rejects a replaced durable writer before host work", async () => {
    const f = await fixture();
    await upsertSessionEntryCore(f.target, {
      sessionId: f.target.sessionId,
      updatedAt: 2,
      lifecycleRevision: f.target.expectedLifecycleRevision,
      activeWriterRunId: "replacement",
    });
    const execute = vi.fn(async () => f.result());
    await expect(
      runHostManagedTranscriptTurn({ attempt: f.attempt, execute, responseText: f.responseText }),
    ).rejects.toThrow("writer");
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not persist or report an answer after admission closes during host work", async () => {
    const f = await fixture();
    const onExecutionPhase = vi.fn();
    await expect(
      runHostManagedTranscriptTurn({
        attempt: { ...f.attempt, onExecutionPhase },
        execute: async () => {
          f.admission.close();
          return f.result();
        },
        responseText: f.responseText,
      }),
    ).rejects.toThrow("no longer active");
    expect(f.candidates).toEqual([]);
    expect(f.rows()).toEqual([]);
    expect(onExecutionPhase.mock.calls).toEqual([[{ phase: "turn_accepted" }]]);
  });
});
