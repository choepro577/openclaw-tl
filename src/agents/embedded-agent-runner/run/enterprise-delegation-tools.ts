import { isRecord } from "@openclaw/normalization-core/record-coerce";
import {
  loadExactSessionEntry,
  readRecentSessionTranscriptActiveEvents,
} from "../../../config/sessions/session-accessor.js";
import {
  enterpriseDelegationConversationInputs,
  enterpriseDelegationConversationResults,
} from "../../../enterprise/delegation/delegation-router-context.js";
import {
  consumeEnterpriseDelegationDecision,
  readEnterpriseDelegationDecisionRoutes,
  prepareEnterpriseDelegationTurn,
} from "../../../enterprise/delegation/delegation-router.js";
import { readEnterpriseDelegationPolicy } from "../../../enterprise/delegation/delegation-store.js";
import { readGatewayRequestRuntimeMetadata } from "../../../gateway/request-runtime-config.js";
import { resolveAdmittedRunActiveAssertion } from "../../admitted-run-context.js";
import type { AdmittedRunContext } from "../../admitted-run-context.js";
import { executeEnterpriseDelegationAssignments } from "../../enterprise-delegation-execution.js";
import {
  withEnterpriseDelegationRuntime,
  type EnterpriseDelegationAssignment,
} from "../../enterprise-delegation-runtime.js";
import { getSubagentRunsForChildSession } from "../../subagents/registry/subagent-registry-memory.js";
import { jsonResult } from "../../tools/common.js";
import { prepareEnterpriseDelegationEvidence } from "./enterprise-evidence-preparation.js";
import type { EmbeddedRunAttemptParams } from "./types.js";

type EnterpriseDelegationUserRequest = {
  prompt: string;
  idempotencyKey: string;
  conversationInputs: string[];
  conversationResults: string[];
};

type EnterpriseDelegationReplayState = {
  calls: Map<string, { signature: string; result: Promise<ReturnType<typeof jsonResult>> }>;
  signatures: Map<string, Promise<ReturnType<typeof jsonResult>>>;
  queued: Promise<unknown>;
  launched: number;
};

// The admitted run context is the stable owner across harness retries. Keep the
// accepted result with that owner so a replayed tool call cannot consume a new
// decision and launch a second child batch. WeakMap lifetime matches the run and
// adds no persisted state or public protocol fields.
const replayStates = new WeakMap<AdmittedRunContext, EnterpriseDelegationReplayState>();

/** Keep model-visible blocked responses on explicit, stable reason codes. */
function enterpriseDelegationResult<T extends Record<string, unknown>>(
  payload: T,
  reasonCode: string,
) {
  return jsonResult({ ...payload, reasonCode });
}

function replayStateFor(context: AdmittedRunContext): EnterpriseDelegationReplayState {
  const existing = replayStates.get(context);
  if (existing) {
    return existing;
  }
  const created: EnterpriseDelegationReplayState = {
    calls: new Map(),
    signatures: new Map(),
    queued: Promise.resolve(),
    launched: 0,
  };
  replayStates.set(context, created);
  return created;
}

function hasExactAgentSet(
  assignments: readonly EnterpriseDelegationAssignment[],
  approvedRoutes: readonly { agentId: string }[],
): boolean {
  if (assignments.length !== approvedRoutes.length) {
    return false;
  }
  const requested = new Set(assignments.map((item) => item.agentId));
  return (
    requested.size === assignments.length &&
    approvedRoutes.every((route) => requested.has(route.agentId))
  );
}

function readDelegationTranscript(params: EmbeddedRunAttemptParams) {
  return readRecentSessionTranscriptActiveEvents(
    {
      ...params.sessionTarget,
      agentId: params.agentId,
      sessionKey: params.sessionKey!,
      sessionId: params.sessionId,
      sessionFile: params.sessionFile,
    },
    128,
  );
}

function userRequest(
  params: EmbeddedRunAttemptParams,
): EnterpriseDelegationUserRequest | undefined {
  const transcriptEvents =
    !params.inputProvenance || params.inputProvenance.kind === "external_user"
      ? readDelegationTranscript(params)
      : undefined;
  if (!params.inputProvenance || params.inputProvenance.kind === "external_user") {
    return {
      prompt: params.transcriptPrompt ?? params.prompt,
      idempotencyKey: `${params.runId}:user`,
      conversationInputs: enterpriseDelegationConversationInputs(transcriptEvents ?? []),
      conversationResults: enterpriseDelegationConversationResults(transcriptEvents ?? []),
    };
  }
  // Completion payloads are evidence, never user consent. Read only external-user
  // messages from this exact active transcript, bounded across clarification turns.
  const source = params.inputProvenance.sourceSessionKey;
  if (params.inputProvenance.sourceTool !== "subagent_announce" || !source) {
    return undefined;
  }
  const parents = [...getSubagentRunsForChildSession(source)].filter(
    (entry) =>
      entry.requesterSessionKey === params.sessionKey &&
      entry.requesterAgentId === params.agentId &&
      entry.requesterUserTurnSessionId === params.sessionId &&
      entry.requesterUserTurnIdempotencyKey,
  );
  const anchors = new Set(parents.map((entry) => entry.requesterUserTurnIdempotencyKey!));
  if (anchors.size !== 1) {
    return undefined;
  }
  const [idempotencyKey] = anchors;
  let input: string | undefined;
  let parentFound = false;
  const sourceTranscript = readDelegationTranscript(params);
  for (const event of sourceTranscript) {
    if (!isRecord(event) || !isRecord(event.message)) {
      continue;
    }
    const message = event.message;
    if (
      message.role !== "user" ||
      (message.provenance !== undefined &&
        (!isRecord(message.provenance) || message.provenance.kind !== "external_user"))
    ) {
      continue;
    }
    if (parentFound) {
      return undefined;
    }
    if (message.idempotencyKey !== idempotencyKey) {
      continue;
    }
    parentFound = true;
    const text =
      typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? message.content
              .filter(
                (block) =>
                  isRecord(block) && block.type === "text" && typeof block.text === "string",
              )
              .map((block) => block.text)
              .join("\n")
          : "";
    if (text.trim()) {
      input = text;
    }
  }
  // Do not revive permissions or explicit specialist requests from older tasks.
  const prompt = parentFound ? (input ?? "") : "";
  return prompt && prompt.length <= 8000 && idempotencyKey
    ? {
        prompt,
        idempotencyKey,
        conversationInputs: enterpriseDelegationConversationInputs(sourceTranscript),
        conversationResults: enterpriseDelegationConversationResults(sourceTranscript),
      }
    : undefined;
}

/** Bind model-driven dispatch to the same live admission as its model tools. */
export function withEnterpriseDelegationTools<T>(
  params: EmbeddedRunAttemptParams,
  run: () => Promise<T>,
): Promise<T> {
  const config = params.config;
  const metadata = readGatewayRequestRuntimeMetadata(config)?.enterpriseDelegation;
  const assertActive = resolveAdmittedRunActiveAssertion(
    params.admittedRunContext,
    params.abortSignal,
  );
  if (
    !config ||
    !metadata ||
    !params.sessionKey ||
    !assertActive ||
    params.agentId !== metadata.personalAgentId
  ) {
    return run();
  }
  const agentId = metadata.personalAgentId;
  const sessionKey = params.sessionKey;
  let closed = false;
  const replayState = replayStateFor(params.admittedRunContext);
  const assertCurrent = () => {
    assertActive();
    if (closed) {
      throw new Error("Enterprise delegation attempt has ended");
    }
    if (params.sessionTarget?.expectedWriterRunId) {
      const entry = loadExactSessionEntry({ ...params.sessionTarget, sessionKey })?.entry;
      if (
        entry?.sessionId !== params.sessionId ||
        entry.activeWriterRunId !== params.runId ||
        (params.sessionTarget.expectedLifecycleRevision !== undefined &&
          entry.lifecycleRevision !== params.sessionTarget.expectedLifecycleRevision)
      ) {
        throw new Error("Enterprise delegation session owner changed");
      }
    }
  };
  const dispatch = async (assignments: EnterpriseDelegationAssignment[]) => {
    assertCurrent();
    const request = userRequest(params);
    if (!request) {
      return enterpriseDelegationResult(
        {
          status: "blocked",
          instruction: "Ask the user to restate the current task; no specialist was started.",
        },
        "delegation_request_unavailable",
      );
    }
    if (
      replayState.launched + new Set(assignments.map((item) => item.agentId)).size >
      readEnterpriseDelegationPolicy().maxDelegatesPerTurn
    ) {
      return enterpriseDelegationResult(
        {
          status: "blocked",
          instruction:
            "The current turn's specialist limit is reached. Wait for accepted results before planning more work.",
        },
        "delegate_limit_reached",
      );
    }
    let decisionId: string | undefined;
    const currentTurn = metadata.turn;
    if (currentTurn?.outcome === "delegate" && currentTurn.decisionId) {
      const approved = readEnterpriseDelegationDecisionRoutes({
        config,
        accountId: metadata.accountId,
        personalAgentId: agentId,
        sessionKey,
        parentRunId: params.runId,
        decisionId: currentTurn.decisionId,
      });
      if (approved.ok) {
        if (!hasExactAgentSet(assignments, approved.routes)) {
          return enterpriseDelegationResult(
            {
              status: "blocked",
              instruction:
                "The proposed specialist agentIds do not match the server-approved assignment set. Retry enterprise_delegate with the exact approved agentIds; no decision was consumed.",
            },
            "assignment_set_mismatch",
          );
        }
        decisionId = currentTurn.decisionId;
      } else if (approved.reasonCode !== "decision_replayed") {
        return enterpriseDelegationResult(
          {
            status: "blocked",
            instruction:
              "The request or specialist permissions changed. No specialist was started.",
          },
          approved.reasonCode,
        );
      }
    }
    if (!decisionId) {
      await prepareEnterpriseDelegationTurn({
        config,
        agentId,
        sessionKey,
        parentRunId: params.runId,
        prompt: request.prompt,
        conversationInputs: request.conversationInputs,
        conversationResults: request.conversationResults,
        proposedAssignments: assignments,
      });
      assertCurrent();
      const turn = metadata.turn;
      if (turn?.outcome !== "delegate" || !turn.decisionId) {
        return enterpriseDelegationResult(
          {
            status: turn?.outcome ?? "blocked",
            instruction: turn?.instruction ?? "No specialist was started.",
          },
          turn?.reasonCode ?? "delegation_not_started",
        );
      }
      const approved = readEnterpriseDelegationDecisionRoutes({
        config,
        accountId: metadata.accountId,
        personalAgentId: agentId,
        sessionKey,
        parentRunId: params.runId,
        decisionId: turn.decisionId,
      });
      if (!approved.ok) {
        return enterpriseDelegationResult(
          {
            status: "blocked",
            instruction:
              "The request or specialist permissions changed. No specialist was started.",
          },
          approved.reasonCode,
        );
      }
      if (!hasExactAgentSet(assignments, approved.routes)) {
        return enterpriseDelegationResult(
          {
            status: "blocked",
            instruction:
              "The proposed specialist agentIds do not match the server-approved assignment set. Retry enterprise_delegate with the exact approved agentIds; no decision was consumed.",
          },
          "assignment_set_mismatch",
        );
      }
      decisionId = turn.decisionId;
    }
    const consumed = consumeEnterpriseDelegationDecision({
      config,
      accountId: metadata.accountId,
      personalAgentId: agentId,
      sessionKey,
      parentRunId: params.runId,
      decisionId,
    });
    if (!consumed.ok) {
      return enterpriseDelegationResult(
        {
          status: "blocked",
          instruction: "The request or specialist permissions changed. No specialist was started.",
        },
        consumed.reasonCode,
      );
    }
    const decision = consumed.decision;
    let transferred = false;
    const evidence = await prepareEnterpriseDelegationEvidence({
      params,
      decision,
      assertActive: assertCurrent,
    });
    try {
      assertCurrent();
      const result = await executeEnterpriseDelegationAssignments({
        decision,
        assertActive: assertCurrent,
        evidence: evidence?.outcomes,
        options: {
          config,
          agentId,
          runSessionKey: sessionKey,
          runId: params.runId,
          approvalReviewerDeviceId: params.approvalReviewerDeviceId,
          requesterUserTurnIdempotencyKey: request.idempotencyKey,
          requesterUserTurnSessionId: params.sessionId,
          workspaceDir: params.workspaceDir,
          agentChannel: params.messageChannel ?? params.messageProvider,
          agentAccountId: params.agentAccountId,
          agentTo: params.messageTo,
          agentThreadId: params.messageThreadId,
          currentMessagingTarget: params.currentMessagingTarget,
          currentChannelId: params.currentChannelId,
          currentMessageId: params.currentMessageId,
        },
      });
      transferred = true;
      replayState.launched += result.acceptedSessionSpawns.length;
      return enterpriseDelegationResult(
        {
          status: result.acceptedSessionSpawns.length ? "accepted" : "blocked",
          acceptedSessionSpawns: result.acceptedSessionSpawns,
          assignments: result.assignments.map(
            ({
              assignmentId,
              agentId: assignmentAgentId,
              agentName,
              status,
              runId,
              failureCode,
              retryable,
            }) => {
              const assignment = {
                assignmentId,
                agentId: assignmentAgentId,
                agentName,
                status,
                runId,
              };
              return failureCode
                ? Object.assign(assignment, { failureCode, retryable: retryable === true })
                : assignment;
            },
          ),
          instruction: result.acceptedSessionSpawns.length
            ? "Accepted tasks are running in the background. Keep successful results if a sibling failed and continue independent work. Follow the authorized enterprise_delegate tool description when waiting for unresolved specialist results; do not poll or repeat accepted assignments."
            : "No specialist started. Tell the user the specialist portion is incomplete.",
        },
        result.reasonCode,
      );
    } finally {
      if (!transferred) {
        for (const packet of evidence?.outcomes.values() ?? []) {
          if ("close" in packet) {
            packet.close();
          }
        }
      }
    }
  };
  return withEnterpriseDelegationRuntime(
    {
      agentId,
      sessionKey,
      runId: params.runId,
      assertActive: assertCurrent,
      execute(callId, assignments) {
        assertCurrent();
        const signature = JSON.stringify(assignments);
        const previous = replayState.calls.get(callId);
        if (previous) {
          if (previous.signature !== signature) {
            return Promise.resolve(
              enterpriseDelegationResult(
                {
                  status: "blocked",
                  instruction: "A tool call cannot be replayed with different assignments.",
                },
                "replay_assignment_mismatch",
              ),
            );
          }
          return previous.result;
        }
        const result =
          replayState.signatures.get(signature) ??
          replayState.queued.then(() => dispatch(assignments));
        replayState.calls.set(callId, { signature, result });
        replayState.signatures.set(signature, result);
        // Serialize plan authority changes; children inside each batch launch concurrently.
        replayState.queued = result.catch(() => undefined);
        return result;
      },
    },
    run,
  ).finally(() => {
    closed = true;
  });
}
