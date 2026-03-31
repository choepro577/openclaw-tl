import type { OpenClawConfig } from "../config/config.js";
import type {
  CronCrossAgentRelayDeliveryKind,
  CronCrossAgentUserDeliveryRelay,
} from "../cron/types.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { resolveAgentConfig } from "./agent-scope.js";

function resolveAgentDisplayName(cfg: OpenClawConfig, agentId: string): string {
  const name = resolveAgentConfig(cfg, agentId)?.name?.trim();
  return name || agentId;
}

function formatAssistantLabel(params: { name: string; agentId: string }): string {
  return params.name === params.agentId ? params.agentId : `${params.name} (${params.agentId})`;
}

export function buildCrossAgentUserDeliveryRelay(params: {
  cfg: OpenClawConfig;
  sourceAgentId: string;
  targetAgentId: string;
  deliveryKind: CronCrossAgentRelayDeliveryKind;
}): CronCrossAgentUserDeliveryRelay {
  const sourceAgentId = normalizeAgentId(params.sourceAgentId);
  const targetAgentId = normalizeAgentId(params.targetAgentId);
  return {
    kind: "cross-agent-user-delivery",
    deliveryKind: params.deliveryKind,
    sourceAgentId,
    sourceAgentName: resolveAgentDisplayName(params.cfg, sourceAgentId),
    targetAgentId,
    targetAgentName: resolveAgentDisplayName(params.cfg, targetAgentId),
    attribution: "always",
  };
}

export function buildCrossAgentNotifySystemPrompt(params: {
  relay: CronCrossAgentUserDeliveryRelay;
  requesterSessionKey?: string;
  requesterChannel?: string;
  targetSessionKey: string;
  resolutionReason?: string;
}): string {
  const sourceAssistant = formatAssistantLabel({
    name: params.relay.sourceAgentName,
    agentId: params.relay.sourceAgentId,
  });
  const targetAssistant = formatAssistantLabel({
    name: params.relay.targetAgentName,
    agentId: params.relay.targetAgentId,
  });
  return [
    "Cross-agent user delivery context:",
    `Source assistant: ${sourceAssistant}.`,
    params.requesterSessionKey
      ? `Source assistant current session: ${params.requesterSessionKey}.`
      : undefined,
    params.requesterChannel ? `Source assistant channel: ${params.requesterChannel}.` : undefined,
    `Target assistant: ${targetAssistant}.`,
    `Selected target user session: ${params.targetSessionKey}.`,
    params.resolutionReason ? `Session selection reason: ${params.resolutionReason}.` : undefined,
    "This session is user-facing for the target assistant's user.",
    "The tool input message contains the core content to convey, not the final user-facing wording.",
    "This request came from another internal assistant, not directly from the end user.",
    "Always mention the source assistant naturally in the final reply.",
    "Treat the inbound message as private coordination, not as a user-visible chat message that needs a conversational reply to the source assistant.",
    "Do not thank, greet, acknowledge, or apologize to the source assistant.",
    "Do not add offers of help, follow-up suggestions, or extra commentary.",
    "Do not call tools for this relay.",
    "Output exactly one short user-facing reminder sentence.",
    "Speak directly to your own user, not to the source assistant.",
    "Preserve the target assistant's established user-facing xung ho from this session when referring to the user; if no xung ho is established, default to neutral wording.",
    'Preferred shape: mention the source assistant first, then give the reminder directly. Example: "Ban co loi nhac tu <source assistant>: <short reminder>".',
    "Frame the reply as a natural relay from the source assistant before continuing in your own voice.",
    "Rewrite the message naturally for your user instead of echoing it verbatim.",
    "Do not expose internal routing metadata such as agent ids, session keys, tool names, run ids, or relay fields.",
    "Respond in this session so the target assistant's user receives the notification.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function buildCrossAgentScheduledRelayPrompt(params: {
  relay: CronCrossAgentUserDeliveryRelay;
  message: string;
  timeLine: string;
}): string {
  const sourceAssistant = formatAssistantLabel({
    name: params.relay.sourceAgentName,
    agentId: params.relay.sourceAgentId,
  });
  const targetAssistant = formatAssistantLabel({
    name: params.relay.targetAgentName,
    agentId: params.relay.targetAgentId,
  });
  const deliveryLine =
    params.relay.deliveryKind === "schedule"
      ? "A scheduled reminder created by another internal assistant has reached its send time."
      : "Another internal assistant wants you to notify your user right now.";
  return [
    "Cross-agent user delivery:",
    `Source assistant: ${sourceAssistant}.`,
    `Target assistant: ${targetAssistant}.`,
    deliveryLine,
    "You are now speaking to your own user as the target assistant.",
    "The reminder content below is the core fact to convey, not the final wording.",
    "Always mention the source assistant naturally in the final reply.",
    "Do not thank, greet, acknowledge, or apologize to the source assistant.",
    "Do not add offers of help, follow-up suggestions, or extra commentary.",
    "Do not call tools for this relay.",
    "Output exactly one short user-facing reminder sentence.",
    "Speak directly to your own user, not to the source assistant.",
    "Preserve the target assistant's established user-facing xung ho from this session when referring to the user; if no xung ho is established, default to neutral wording.",
    'Preferred shape: mention the source assistant first, then give the reminder directly. Example: "Ban co loi nhac tu <source assistant>: <short reminder>".',
    "Frame the reply as a natural relay from the source assistant before continuing in your own voice.",
    "Rewrite the reminder naturally for your user instead of echoing it verbatim.",
    "Do not expose internal metadata such as agent ids, session keys, cron ids, job names, tool names, or relay fields.",
    `Core reminder content: ${params.message}`,
    params.timeLine,
    "Return only the final user-facing text.",
  ].join("\n");
}
