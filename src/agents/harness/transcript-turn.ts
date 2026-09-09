import { isHeartbeatLifecycleRunKind } from "../bootstrap-mode.js";
import type {
  EmbeddedRunAttemptParams,
  EmbeddedRunAttemptResult,
} from "../embedded-agent-runner/run/types.js";
import { selectContextEngineForTranscriptHost } from "./context-engine-logical-turn.js";
import { drainPendingContextEngineTurnsBeforeRun } from "./context-engine-turn-attempt.js";
import type { AgentHarness } from "./types.js";

type TranscriptHost = Pick<AgentHarness, "id" | "contextEngineHostCapabilities">;

function hostSupport(harness: TranscriptHost) {
  return {
    id: `agent-harness:${harness.id}`,
    label: `agent harness "${harness.id}"`,
    capabilities: harness.contextEngineHostCapabilities ?? [],
  };
}

/** Both model and host-owned turns share the same logical-turn selection owner. */
export async function prepareHarnessTranscriptTurn<T extends EmbeddedRunAttemptParams>(
  params: T,
  harness: TranscriptHost,
): Promise<T> {
  const lease = params.contextEngineLogicalTurnLease;
  if (!lease) {
    return params;
  }
  selectContextEngineForTranscriptHost({
    lease,
    host: hostSupport(harness),
    operation: "agent-run",
    recorder: params.userTurnTranscriptRecorder,
  });
  await drainPendingContextEngineTurnsBeforeRun({
    admission: params.userTurnTranscriptRecorder?.getAdmissionReceipt(),
    isHeartbeat: isHeartbeatLifecycleRunKind(params.bootstrapContextRunKind),
    lease,
    recorder: params.userTurnTranscriptRecorder,
    sessionTarget: params.sessionTarget,
  });
  const effective = lease.begin();
  return {
    ...params,
    contextEngine: effective.engine.info.id === "legacy" ? undefined : effective.engine,
  };
}

/** Reporting a real anchor does not accept the turn; the outer terminal owner decides. */
export function finishHarnessTranscriptTurn(
  params: EmbeddedRunAttemptParams,
  harness: TranscriptHost,
  result: EmbeddedRunAttemptResult,
): EmbeddedRunAttemptResult {
  const admission = params.userTurnTranscriptRecorder?.getAdmissionReceipt();
  if (params.onContextEngineTurnCandidate && admission && result.contextEngineTerminalAnchor) {
    params.onContextEngineTurnCandidate({
      boundary: { admission, terminal: result.contextEngineTerminalAnchor },
      sessionIdUsed: result.sessionIdUsed,
      sessionKey: params.sessionKey,
      sessionTarget: params.sessionTarget,
      sessionFile: result.sessionFileUsed ?? params.sessionFile,
      promptError: result.terminal.kind === "failed",
      aborted:
        result.terminal.kind === "aborted" ||
        (result.terminal.kind === "timeout" &&
          "aborted" in result.terminal &&
          result.terminal.aborted === true),
      yieldAborted:
        result.terminal.kind === "aborted" && result.terminal.source === "yield_cleanup",
      isHeartbeat: isHeartbeatLifecycleRunKind(params.bootstrapContextRunKind),
      tokenBudget: params.contextTokenBudget,
      contextEngineHostSupport: hostSupport(harness),
      harnessId: harness.id,
      providerId: params.provider,
      requestedModelId: params.requestedModelId,
      modelId: params.modelId,
      fallbackReason: params.fallbackReason,
      degradedReason: params.degradedReason,
      config: params.config,
    });
  }
  const { contextEngineTerminalAnchor: _contextEngineTerminalAnchor, ...publicResult } = result;
  return publicResult;
}
