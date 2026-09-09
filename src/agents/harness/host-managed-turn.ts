import {
  loadExactSessionEntry,
  resolveSessionTranscriptDatabasePath,
} from "../../config/sessions/session-accessor.js";
import { withOwnedSessionTranscriptWrites } from "../../config/sessions/transcript-write-context.js";
import { appendExactAssistantMessageToSessionTranscript } from "../../config/sessions/transcript.js";
import { resolveAdmittedRunActiveAssertion } from "../admitted-run-context.js";
import type {
  EmbeddedRunAttemptParams,
  EmbeddedRunAttemptResult,
} from "../embedded-agent-runner/run/types.js";
import { resolveAgentRunSessionTarget } from "../run-session-target.js";
import { buildAssistantMessage, buildUsageWithNoCost } from "../stream-message-shared.js";
import { selectPreparedAgentHarness } from "./selection.js";
import { finishHarnessTranscriptTurn, prepareHarnessTranscriptTurn } from "./transcript-turn.js";

/** Runs an admitted host action with the same transcript lifecycle as a model turn. */
export async function runHostManagedTranscriptTurn(params: {
  attempt: EmbeddedRunAttemptParams;
  execute: (preparedAttempt: EmbeddedRunAttemptParams) => Promise<EmbeddedRunAttemptResult>;
  responseText: (result: EmbeddedRunAttemptResult) => string;
}): Promise<EmbeddedRunAttemptResult> {
  const { attempt } = params;
  const recorder = attempt.userTurnTranscriptRecorder;
  if (!recorder) {
    throw new Error("Host-managed turn requires canonical transcript admission");
  }
  const assertActive = resolveAdmittedRunActiveAssertion(
    attempt.admittedRunContext,
    attempt.abortSignal,
  );
  if (!assertActive) {
    throw new Error("Host-managed turn requires active admitted run authority");
  }
  assertActive();
  const expectedWriterRunId = attempt.sessionTarget?.expectedWriterRunId;
  if (expectedWriterRunId !== attempt.runId) {
    throw new Error("Host-managed turn requires its admitted session writer");
  }
  const target = await resolveAgentRunSessionTarget({
    ...attempt,
    missingSessionKey: "resolve-existing",
  });
  const ownedTarget = { ...attempt.sessionTarget, ...target, expectedWriterRunId };
  const assertWriter = () => {
    assertActive();
    const entry = loadExactSessionEntry(target)?.entry;
    if (
      entry?.sessionId !== attempt.sessionId ||
      entry.activeWriterRunId !== expectedWriterRunId ||
      (ownedTarget.expectedLifecycleRevision !== undefined &&
        entry.lifecycleRevision !== ownedTarget.expectedLifecycleRevision)
    ) {
      throw new Error("Host-managed turn session writer changed");
    }
  };
  assertWriter();
  const { harness } = selectPreparedAgentHarness(attempt);
  const prepared = await prepareHarnessTranscriptTurn(
    { ...attempt, sessionTarget: ownedTarget, agentHarnessId: harness.id },
    harness,
  );
  assertWriter();
  // Backend-owned turns do not enter a native attempt's write scope. Install the
  // canonical fence here so even the user recorder's queued writes remain owned.
  return await withOwnedSessionTranscriptWrites(
    {
      sessionKey: target.sessionKey,
      sessionTarget: ownedTarget,
      withTranscriptWrite: async (write) => {
        assertWriter();
        const result = await write();
        assertWriter();
        return result;
      },
    },
    async () => {
      await recorder.persistApproved({ expectedSessionId: attempt.sessionId });
      assertWriter();
      const admission = recorder.getAdmissionReceipt();
      if (
        !admission ||
        admission.agentId !== target.agentId ||
        admission.sessionId !== target.sessionId ||
        admission.sessionKey !== target.sessionKey ||
        admission.storePath !== resolveSessionTranscriptDatabasePath(target)
      ) {
        throw new Error("Host-managed turn requires matching canonical transcript admission");
      }
      // Delivery must observe the runtime owner before host work yields; otherwise
      // it treats the durable response as a non-agent reply and appends it again.
      prepared.onExecutionPhase?.({ phase: "turn_accepted" });
      assertWriter();
      const result = await params.execute(prepared);
      assertWriter();
      const text = params.responseText(result);
      if (!text.trim()) {
        throw new Error("Host-managed turn requires a visible response");
      }
      const appended = await appendExactAssistantMessageToSessionTranscript({
        ...target,
        expectedSessionId: target.sessionId,
        expectedLifecycleRevision: ownedTarget.expectedLifecycleRevision,
        expectedWriterRunId,
        runId: attempt.runId,
        idempotencyKey: `${attempt.runId}:host-response:${admission.entryId}`,
        config: attempt.config,
        message: buildAssistantMessage({
          // Host-authored ACKs are replayable conversation, not a model completion
          // or a filtered delivery mirror. Keep model accounting on the caller's result.
          model: { api: "openclaw-transcript", provider: "openclaw", id: "host-response" },
          content: [{ type: "text", text }],
          stopReason: "stop",
          usage: buildUsageWithNoCost({}),
        }),
        beforeMessageWrite: ({ message }) => {
          assertWriter();
          return message;
        },
      });
      assertWriter();
      if (!appended.ok || !appended.anchor) {
        throw new Error("Host-managed turn response could not be persisted");
      }
      prepared.onExecutionPhase?.({ phase: "assistant_output_started" });
      assertWriter();
      return finishHarnessTranscriptTurn(prepared, harness, {
        ...result,
        agentHarnessId: harness.id,
        contextEngineTerminalAnchor: appended.anchor,
      });
    },
  );
}
