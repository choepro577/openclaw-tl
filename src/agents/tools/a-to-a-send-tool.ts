import crypto from "node:crypto";
import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { callGateway } from "../../gateway/call.js";
import { normalizeAgentId, resolveAgentIdFromSessionKey } from "../../routing/session-key.js";
import {
  type GatewayMessageChannel,
  INTERNAL_MESSAGE_CHANNEL,
} from "../../utils/message-channel.js";
import { listAgentIds } from "../agent-scope.js";
import { AGENT_LANE_NESTED } from "../lanes.js";
import { runAToASendFlow } from "./a-to-a-send-flow.js";
import {
  buildAToAMessageContext,
  buildAToAPairSessionLabel,
  buildAToATargetPairSessionKey,
  resolveAToAPingPongTurns,
} from "./a-to-a-send-helpers.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";
import {
  createAgentToAgentPolicy,
  createSessionVisibilityGuard,
  extractAssistantText,
  resolveEffectiveSessionToolsVisibility,
  resolveSessionToolContext,
  stripToolMessages,
} from "./sessions-helpers.js";

const AToASendToolSchema = Type.Object({
  agentId: Type.String({ minLength: 1, maxLength: 64 }),
  message: Type.String(),
  timeoutSeconds: Type.Optional(Type.Number({ minimum: 0 })),
});

async function startAgentRun(params: {
  runId: string;
  sendParams: Record<string, unknown>;
  sessionKey: string;
}): Promise<{ ok: true; runId: string } | { ok: false; result: ReturnType<typeof jsonResult> }> {
  try {
    const response = await callGateway<{ runId?: string }>({
      method: "agent",
      params: params.sendParams,
      timeoutMs: 10_000,
    });
    return {
      ok: true,
      runId: typeof response?.runId === "string" && response.runId ? response.runId : params.runId,
    };
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : typeof err === "string" ? err : "error";
    return {
      ok: false,
      result: jsonResult({
        runId: params.runId,
        status: "error",
        error: messageText,
        sessionKey: params.sessionKey,
      }),
    };
  }
}

export function createAToASendTool(opts?: {
  agentSessionKey?: string;
  agentChannel?: GatewayMessageChannel;
  sandboxed?: boolean;
  config?: OpenClawConfig;
}): AnyAgentTool {
  return {
    label: "A2A Send",
    name: "a_to_a_send",
    description:
      "Send a message to another agent using that agent's dedicated pair session for the current requester.",
    parameters: AToASendToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const message = readStringParam(params, "message", { required: true });
      const targetAgentId = normalizeAgentId(
        readStringParam(params, "agentId", { required: true }),
      );
      const { cfg, effectiveRequesterKey } = resolveSessionToolContext(opts);
      const requesterAgentId = resolveAgentIdFromSessionKey(effectiveRequesterKey);

      if (targetAgentId === requesterAgentId) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "error",
          error: "a_to_a_send does not allow self-targeting in v1.",
          agentId: targetAgentId,
        });
      }

      const knownAgentIds = new Set(listAgentIds(cfg).map((id) => normalizeAgentId(id)));
      if (!knownAgentIds.has(targetAgentId)) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "error",
          error: `Unknown agentId: ${targetAgentId}`,
          agentId: targetAgentId,
        });
      }

      const targetSessionKey = buildAToATargetPairSessionKey({
        requesterAgentId,
        targetAgentId,
      });
      const pairSessionLabel = buildAToAPairSessionLabel({ requesterAgentId });
      const a2aPolicy = createAgentToAgentPolicy(cfg);
      const sessionVisibility = resolveEffectiveSessionToolsVisibility({
        cfg,
        sandboxed: opts?.sandboxed === true,
      });
      const visibilityGuard = await createSessionVisibilityGuard({
        action: "send",
        requesterSessionKey: effectiveRequesterKey,
        visibility: sessionVisibility,
        a2aPolicy,
      });
      const access = visibilityGuard.check(targetSessionKey);
      if (!access.allowed) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: access.status,
          error: access.error,
          agentId: targetAgentId,
          sessionKey: targetSessionKey,
        });
      }

      const timeoutSeconds =
        typeof params.timeoutSeconds === "number" && Number.isFinite(params.timeoutSeconds)
          ? Math.max(0, Math.floor(params.timeoutSeconds))
          : 0;
      const timeoutMs = timeoutSeconds * 1000;
      const flowTimeoutMs = timeoutSeconds === 0 ? 30_000 : timeoutMs;
      const idempotencyKey = crypto.randomUUID();
      let runId: string = idempotencyKey;
      const maxPingPongTurns = resolveAToAPingPongTurns(cfg);
      const requesterSessionKey = opts?.agentSessionKey;
      const requesterChannel = opts?.agentChannel;
      const delivery = { status: "pending", mode: "ping-pong" as const };
      const sendParams = {
        message,
        sessionKey: targetSessionKey,
        label: pairSessionLabel,
        idempotencyKey,
        deliver: false,
        channel: INTERNAL_MESSAGE_CHANNEL,
        lane: AGENT_LANE_NESTED,
        extraSystemPrompt: buildAToAMessageContext({
          requesterAgentId,
          requesterSessionKey,
          requesterChannel,
          targetAgentId,
          targetSessionKey,
        }),
        inputProvenance: {
          kind: "inter_session",
          sourceSessionKey: requesterSessionKey,
          sourceChannel: requesterChannel,
          sourceTool: "a_to_a_send",
        },
      };
      const startFlow = (roundOneReply?: string, waitRunId?: string) => {
        void runAToASendFlow({
          requesterAgentId,
          requesterSessionKey,
          requesterChannel,
          targetAgentId,
          targetSessionKey,
          flowTimeoutMs,
          maxPingPongTurns,
          roundOneReply,
          waitRunId,
        });
      };

      if (timeoutSeconds === 0) {
        const start = await startAgentRun({
          runId,
          sendParams,
          sessionKey: targetSessionKey,
        });
        if (!start.ok) {
          return start.result;
        }
        runId = start.runId;
        startFlow(undefined, runId);
        return jsonResult({
          runId,
          status: "accepted",
          agentId: targetAgentId,
          sessionKey: targetSessionKey,
          label: pairSessionLabel,
          delivery,
        });
      }

      const start = await startAgentRun({
        runId,
        sendParams,
        sessionKey: targetSessionKey,
      });
      if (!start.ok) {
        return start.result;
      }
      runId = start.runId;

      let waitStatus: string | undefined;
      let waitError: string | undefined;
      try {
        const wait = await callGateway<{ status?: string; error?: string }>({
          method: "agent.wait",
          params: {
            runId,
            timeoutMs,
          },
          timeoutMs: timeoutMs + 2000,
        });
        waitStatus = typeof wait?.status === "string" ? wait.status : undefined;
        waitError = typeof wait?.error === "string" ? wait.error : undefined;
      } catch (err) {
        const messageText =
          err instanceof Error ? err.message : typeof err === "string" ? err : "error";
        if (messageText.includes("gateway timeout")) {
          startFlow(undefined, runId);
        }
        return jsonResult({
          runId,
          status: messageText.includes("gateway timeout") ? "timeout" : "error",
          error: messageText,
          agentId: targetAgentId,
          sessionKey: targetSessionKey,
        });
      }

      if (waitStatus === "timeout") {
        startFlow(undefined, runId);
        return jsonResult({
          runId,
          status: "timeout",
          error: waitError,
          agentId: targetAgentId,
          sessionKey: targetSessionKey,
        });
      }
      if (waitStatus === "error") {
        return jsonResult({
          runId,
          status: "error",
          error: waitError ?? "agent error",
          agentId: targetAgentId,
          sessionKey: targetSessionKey,
        });
      }

      const history = await callGateway<{ messages: Array<unknown> }>({
        method: "chat.history",
        params: { sessionKey: targetSessionKey, limit: 50 },
      });
      const filtered = stripToolMessages(Array.isArray(history?.messages) ? history.messages : []);
      const last = filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
      const reply = last ? extractAssistantText(last) : undefined;
      startFlow(reply ?? undefined);

      return jsonResult({
        runId,
        status: "ok",
        reply,
        agentId: targetAgentId,
        sessionKey: targetSessionKey,
        label: pairSessionLabel,
        delivery,
      });
    },
  };
}
