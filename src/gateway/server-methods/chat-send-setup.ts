import { performance } from "node:perf_hooks";
import { ErrorCodes, errorShape } from "../../../packages/gateway-protocol/src/index.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  emitCompletedDiagnosticsTimelineSpan,
  emitDiagnosticsTimelineEvent,
} from "../../infra/diagnostics-timeline.js";
import { admitChatSend } from "./chat-send-admission.js";
import { runChatSendPreAdmission } from "./chat-send-pre-admission.js";
import { normalizeChatSendRequest } from "./chat-send-request.js";
import { prepareChatSendSession } from "./chat-send-session.js";
import type { GatewayRequestHandlerOptions, GatewayRequestTiming } from "./types.js";

function emitChatSendCompletedStage(params: {
  name: string;
  runId: string;
  config: OpenClawConfig;
  startedAtMs?: number;
  durationMs?: number;
}) {
  if (
    params.startedAtMs === undefined ||
    params.durationMs === undefined ||
    !Number.isFinite(params.startedAtMs) ||
    !Number.isFinite(params.durationMs)
  ) {
    return;
  }
  emitCompletedDiagnosticsTimelineSpan(params.name, params.durationMs, {
    phase: "agent-turn",
    runId: params.runId,
    config: params.config,
    startedAtMs: params.startedAtMs,
    endedAtMs: params.startedAtMs + Math.max(0, params.durationMs),
    omitErrorMessage: true,
  });
}

function recordChatSendStage(
  timing: GatewayRequestTiming | undefined,
  startedAtField: keyof GatewayRequestTiming,
  durationField: keyof GatewayRequestTiming,
  startedAtMs: number,
  durationMs: number,
): void {
  if (!timing) {
    return;
  }
  const mutableTiming = timing as unknown as Record<string, number | undefined>;
  mutableTiming[startedAtField] = startedAtMs;
  mutableTiming[durationField] = Math.max(0, durationMs);
}

/** Normalize, prepare, and exclusively admit one new chat.send request. */
export async function prepareAndAdmitChatSend(
  {
    params,
    respond,
    context,
    client,
    requestTiming,
  }: Pick<
    GatewayRequestHandlerOptions,
    "params" | "respond" | "context" | "client" | "requestTiming"
  >,
  onAdmissionOwned?: () => Promise<boolean>,
  options?: { trustedSystemInput?: boolean },
) {
  const normalizedRequest = normalizeChatSendRequest({
    params,
    client,
    requestTiming,
    ...(options?.trustedSystemInput ? { trustedSystemInput: true } : {}),
  });
  if (!normalizedRequest.ok) {
    respond(
      false,
      undefined,
      errorShape(
        ErrorCodes.INVALID_REQUEST,
        normalizedRequest.error,
        normalizedRequest.reason ? { details: { reason: normalizedRequest.reason } } : undefined,
      ),
    );
    return undefined;
  }
  const sessionPreparationStartedAtMs = performance.now();
  const preparedSession = prepareChatSendSession({
    request: normalizedRequest.value,
    context,
    client,
  });
  if (!preparedSession.ok) {
    respond(
      false,
      undefined,
      typeof preparedSession.error === "string"
        ? errorShape(ErrorCodes.INVALID_REQUEST, preparedSession.error)
        : preparedSession.error,
    );
    return undefined;
  }
  const runId = normalizedRequest.value.p.idempotencyKey;
  const sessionPreparationMs = performance.now() - sessionPreparationStartedAtMs;
  emitDiagnosticsTimelineEvent(
    {
      type: "mark",
      name: "gateway.chat_send.received",
      phase: "agent-turn",
      runId,
      monotonicMs: normalizedRequest.value.chatSendReceivedAtMs,
      attributes: {
        receivedToNormalizeMs:
          normalizedRequest.value.chatSendNormalizeStartedAtMs -
          normalizedRequest.value.chatSendReceivedAtMs,
        normalizeMs: normalizedRequest.value.chatSendNormalizeMs,
        ...(requestTiming?.enterpriseProjectionMs !== undefined
          ? { enterpriseProjectionMs: requestTiming.enterpriseProjectionMs }
          : {}),
        ...(requestTiming?.authorizationMs !== undefined
          ? { authorizationMs: requestTiming.authorizationMs }
          : {}),
      },
    },
    { config: preparedSession.value.cfg },
  );
  emitChatSendCompletedStage({
    name: "gateway.chat_send.normalize",
    runId,
    config: preparedSession.value.cfg,
    startedAtMs: normalizedRequest.value.chatSendNormalizeStartedAtMs,
    durationMs: normalizedRequest.value.chatSendNormalizeMs,
  });
  emitChatSendCompletedStage({
    name: "gateway.chat_send.enterprise_projection",
    runId,
    config: preparedSession.value.cfg,
    startedAtMs: requestTiming?.enterpriseProjectionStartedAtMs,
    durationMs: requestTiming?.enterpriseProjectionMs,
  });
  emitChatSendCompletedStage({
    name: "gateway.chat_send.authorization",
    runId,
    config: preparedSession.value.cfg,
    startedAtMs: requestTiming?.authorizationStartedAtMs,
    durationMs: requestTiming?.authorizationMs,
  });
  emitChatSendCompletedStage({
    name: "gateway.chat_send.session_prepare",
    runId,
    config: preparedSession.value.cfg,
    startedAtMs: sessionPreparationStartedAtMs,
    durationMs: sessionPreparationMs,
  });
  const preAdmissionStartedAtMs = performance.now();
  let shouldAdmit = false;
  try {
    shouldAdmit = await runChatSendPreAdmission({
      request: normalizedRequest.value,
      session: preparedSession.value,
      respond,
      context,
      client,
    });
  } finally {
    emitChatSendCompletedStage({
      name: "gateway.chat_send.pre_admission",
      runId,
      config: preparedSession.value.cfg,
      startedAtMs: preAdmissionStartedAtMs,
      durationMs: performance.now() - preAdmissionStartedAtMs,
    });
  }
  if (!shouldAdmit) {
    return undefined;
  }
  const admissionStartedAtMs = performance.now();
  const admitted = await admitChatSend({
    request: normalizedRequest.value,
    session: preparedSession.value,
    respond,
    context,
    client,
    onAdmissionOwned,
    requestTiming,
  });
  const admissionMs = performance.now() - admissionStartedAtMs;
  recordChatSendStage(
    requestTiming,
    "admissionStartedAtMs",
    "admissionMs",
    admissionStartedAtMs,
    admissionMs,
  );
  emitChatSendCompletedStage({
    name: "gateway.chat_send.admission",
    runId,
    config: preparedSession.value.cfg,
    startedAtMs: admissionStartedAtMs,
    durationMs: admissionMs,
  });
  emitChatSendCompletedStage({
    name: "gateway.chat_send.queue_wait",
    runId,
    config: preparedSession.value.cfg,
    startedAtMs: requestTiming?.queueWaitStartedAtMs,
    durationMs: requestTiming?.queueWaitMs,
  });
  if (!admitted.ok) {
    return undefined;
  }
  return { normalizedRequest, preparedSession, admitted };
}
