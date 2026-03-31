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
import {
  buildCrossAgentNotifySystemPrompt,
  buildCrossAgentUserDeliveryRelay,
} from "../user-delivery-relay.js";
import { buildAToATargetPairSessionKey } from "./a-to-a-send-helpers.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";
import { createAgentToAgentPolicy, resolveSessionToolContext } from "./sessions-helpers.js";

const ACTIVE_USER_WINDOW_MINUTES = 24 * 60;

const UserNotifyToolSchema = Type.Object({
  agentId: Type.String({ minLength: 1, maxLength: 64 }),
  message: Type.String(),
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

export function createUserNotifyTool(opts?: {
  agentSessionKey?: string;
  agentChannel?: GatewayMessageChannel;
  sandboxed?: boolean;
  config?: OpenClawConfig;
}): AnyAgentTool {
  return {
    label: "User Notify",
    name: "user_notify",
    description:
      "Notify another agent's user right now. Pass the core content to convey; runtime adds cross-agent source attribution and natural final phrasing.",
    parameters: UserNotifyToolSchema,
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
          error: "user_notify does not allow self-targeting in v1.",
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

      const a2aPolicy = createAgentToAgentPolicy(cfg);
      if (!a2aPolicy.enabled) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "forbidden",
          error:
            "Agent-to-agent messaging is disabled. Set tools.agentToAgent.enabled=true to allow cross-agent delivery.",
          agentId: targetAgentId,
        });
      }
      if (!a2aPolicy.isAllowed(requesterAgentId, targetAgentId)) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "forbidden",
          error: "Agent-to-agent messaging denied by tools.agentToAgent.allow.",
          agentId: targetAgentId,
        });
      }

      let resolvedSessionKey = "";
      let resolvedReason: string | undefined;
      try {
        const resolved = await callGateway<{ key?: string; reason?: string }>({
          method: "sessions.resolve_active_user",
          params: {
            agentId: targetAgentId,
            excludeKeys: [
              buildAToATargetPairSessionKey({
                requesterAgentId,
                targetAgentId,
              }),
            ],
            activeWithinMinutes: ACTIVE_USER_WINDOW_MINUTES,
          },
          timeoutMs: 10_000,
        });
        resolvedSessionKey = typeof resolved?.key === "string" ? resolved.key.trim() : "";
        resolvedReason = typeof resolved?.reason === "string" ? resolved.reason.trim() : undefined;
      } catch (err) {
        const messageText =
          err instanceof Error ? err.message : typeof err === "string" ? err : "error";
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "error",
          error: messageText,
          agentId: targetAgentId,
        });
      }

      if (!resolvedSessionKey) {
        return jsonResult({
          runId: crypto.randomUUID(),
          status: "error",
          error: `No active user session found for agentId: ${targetAgentId}`,
          agentId: targetAgentId,
        });
      }

      const runId = crypto.randomUUID();
      const relay = buildCrossAgentUserDeliveryRelay({
        cfg,
        sourceAgentId: requesterAgentId,
        targetAgentId,
        deliveryKind: "notify",
      });
      const start = await startAgentRun({
        runId,
        sessionKey: resolvedSessionKey,
        sendParams: {
          message,
          sessionKey: resolvedSessionKey,
          idempotencyKey: runId,
          deliver: false,
          channel: INTERNAL_MESSAGE_CHANNEL,
          lane: AGENT_LANE_NESTED,
          extraSystemPrompt: buildCrossAgentNotifySystemPrompt({
            relay,
            requesterSessionKey: effectiveRequesterKey,
            requesterChannel: opts?.agentChannel,
            targetSessionKey: resolvedSessionKey,
            resolutionReason: resolvedReason,
          }),
          inputProvenance: {
            kind: "inter_session",
            sourceSessionKey: effectiveRequesterKey,
            sourceChannel: opts?.agentChannel,
            sourceTool: "user_notify",
          },
        },
      });
      if (!start.ok) {
        return start.result;
      }

      return jsonResult({
        runId: start.runId,
        status: "accepted",
        agentId: targetAgentId,
        sessionKey: resolvedSessionKey,
        resolutionReason: resolvedReason,
      });
    },
  };
}
