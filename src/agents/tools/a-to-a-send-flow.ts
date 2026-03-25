import { callGateway } from "../../gateway/call.js";
import { formatErrorMessage } from "../../infra/errors.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import {
  INTERNAL_MESSAGE_CHANNEL,
  type GatewayMessageChannel,
} from "../../utils/message-channel.js";
import { AGENT_LANE_NESTED } from "../lanes.js";
import {
  buildAToACompletionContext,
  buildAToAReplyContext,
  isAToAReplySkip,
} from "./a-to-a-send-helpers.js";
import { readLatestAssistantReply, runAgentStep } from "./agent-step.js";

const log = createSubsystemLogger("agents/a-to-a-send");

export async function runAToASendFlow(params: {
  requesterAgentId: string;
  requesterSessionKey?: string;
  requesterChannel?: GatewayMessageChannel;
  targetAgentId: string;
  targetSessionKey: string;
  flowTimeoutMs: number;
  maxPingPongTurns: number;
  roundOneReply?: string;
  waitRunId?: string;
}) {
  try {
    let latestReply = params.roundOneReply;
    if (!latestReply && params.waitRunId) {
      const waitMs = Math.min(params.flowTimeoutMs, 60_000);
      const wait = await callGateway<{ status?: string }>({
        method: "agent.wait",
        params: {
          runId: params.waitRunId,
          timeoutMs: waitMs,
        },
        timeoutMs: waitMs + 2000,
      });
      if (wait?.status !== "ok") {
        return;
      }
      latestReply = await readLatestAssistantReply({
        sessionKey: params.targetSessionKey,
      });
    }
    if (!latestReply) {
      return;
    }
    if (!params.requesterSessionKey || params.requesterSessionKey === params.targetSessionKey) {
      return;
    }

    const requesterReply = await runAgentStep({
      sessionKey: params.requesterSessionKey,
      message: latestReply,
      extraSystemPrompt: buildAToACompletionContext({
        requesterAgentId: params.requesterAgentId,
        requesterSessionKey: params.requesterSessionKey,
        requesterChannel: params.requesterChannel,
        targetAgentId: params.targetAgentId,
        targetSessionKey: params.targetSessionKey,
      }),
      timeoutMs: params.flowTimeoutMs,
      lane: AGENT_LANE_NESTED,
      sourceSessionKey: params.targetSessionKey,
      sourceChannel: INTERNAL_MESSAGE_CHANNEL,
      sourceTool: "a_to_a_send",
    });
    if (!requesterReply || isAToAReplySkip(requesterReply) || params.maxPingPongTurns <= 0) {
      return;
    }

    let currentSessionKey = params.targetSessionKey;
    let nextSessionKey = params.requesterSessionKey;
    let incomingMessage = requesterReply;

    for (let turn = 1; turn <= params.maxPingPongTurns; turn += 1) {
      const currentRole = currentSessionKey === params.requesterSessionKey ? "requester" : "target";
      const replyPrompt = buildAToAReplyContext({
        requesterAgentId: params.requesterAgentId,
        requesterSessionKey: params.requesterSessionKey,
        requesterChannel: params.requesterChannel,
        targetAgentId: params.targetAgentId,
        targetSessionKey: params.targetSessionKey,
        currentRole,
        turn,
        maxTurns: params.maxPingPongTurns,
      });
      const replyText = await runAgentStep({
        sessionKey: currentSessionKey,
        message: incomingMessage,
        extraSystemPrompt: replyPrompt,
        timeoutMs: params.flowTimeoutMs,
        lane: AGENT_LANE_NESTED,
        sourceSessionKey: nextSessionKey,
        sourceChannel:
          nextSessionKey === params.requesterSessionKey
            ? params.requesterChannel
            : INTERNAL_MESSAGE_CHANNEL,
        sourceTool: "a_to_a_send",
      });
      if (!replyText || isAToAReplySkip(replyText)) {
        return;
      }
      incomingMessage = replyText;
      const swap = currentSessionKey;
      currentSessionKey = nextSessionKey;
      nextSessionKey = swap;
    }
  } catch (err) {
    log.warn("a_to_a_send flow failed", {
      runId: params.waitRunId ?? "unknown",
      error: formatErrorMessage(err),
    });
  }
}
