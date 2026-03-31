import type { OpenClawConfig } from "../../config/config.js";
import { normalizeAgentId } from "../../routing/session-key.js";

const REPLY_SKIP_TOKEN = "REPLY_SKIP";
const DEFAULT_PING_PONG_TURNS = 5;
const MAX_PING_PONG_TURNS = 5;

function buildAgentSessionLines(params: {
  requesterAgentId: string;
  requesterSessionKey?: string;
  requesterChannel?: string;
  targetAgentId: string;
  targetSessionKey: string;
}): string[] {
  return [
    `Agent 1 (requester) id: ${params.requesterAgentId}.`,
    params.requesterSessionKey
      ? `Agent 1 (requester) current session: ${params.requesterSessionKey}.`
      : undefined,
    params.requesterChannel
      ? `Agent 1 (requester) channel: ${params.requesterChannel}.`
      : undefined,
    `Agent 2 (target) id: ${params.targetAgentId}.`,
    `Agent 2 (target) pair session: ${params.targetSessionKey}.`,
    "Agent 2 pair session is dedicated to Agent 1 for this relationship.",
    "This pair session is coordination-only, not a user-facing session.",
    "Do not treat the pair session as the target agent's active user conversation.",
    "If the task is to notify the target agent's user right now, use user_notify(agentId, message) and pass only the core content to convey.",
    "If the task is to schedule a future reminder or follow-up for the target agent's user, use user_schedule(...) and pass only the core reminder content.",
    "For cross-agent user delivery, the runtime will relay the message naturally and mention the source assistant automatically.",
    'Do not call raw cron.add with sessionTarget="current" in this pair session.',
  ].filter((line): line is string => Boolean(line));
}

export function buildAToATargetPairSessionKey(params: {
  requesterAgentId: string;
  targetAgentId: string;
}): string {
  const requesterAgentId = normalizeAgentId(params.requesterAgentId);
  const targetAgentId = normalizeAgentId(params.targetAgentId);
  return `agent:${targetAgentId}:a2a:from:${requesterAgentId}`;
}

export function buildAToAPairSessionLabel(params: { requesterAgentId: string }): string {
  return `A2A from ${normalizeAgentId(params.requesterAgentId)}`;
}

export function buildAToAMessageContext(params: {
  requesterAgentId: string;
  requesterSessionKey?: string;
  requesterChannel?: string;
  targetAgentId: string;
  targetSessionKey: string;
}): string {
  return ["Agent-to-agent pair session context:", ...buildAgentSessionLines(params)].join("\n");
}

export function buildAToAReplyContext(params: {
  requesterAgentId: string;
  requesterSessionKey?: string;
  requesterChannel?: string;
  targetAgentId: string;
  targetSessionKey: string;
  currentRole: "requester" | "target";
  turn: number;
  maxTurns: number;
}): string {
  const currentLabel =
    params.currentRole === "requester" ? "Agent 1 (requester)" : "Agent 2 (target)";
  return [
    "Agent-to-agent pair session reply step:",
    `Current agent: ${currentLabel}.`,
    `Turn ${params.turn} of ${params.maxTurns}.`,
    ...buildAgentSessionLines(params),
    `If you want to stop the ping-pong, reply exactly "${REPLY_SKIP_TOKEN}".`,
  ].join("\n");
}

export function buildAToACompletionContext(params: {
  requesterAgentId: string;
  requesterSessionKey?: string;
  requesterChannel?: string;
  targetAgentId: string;
  targetSessionKey: string;
}): string {
  return [
    "Agent-to-agent completion callback:",
    ...buildAgentSessionLines(params),
    "Agent 2 has completed its first reply in the pair session.",
    "Respond now in Agent 1's current session. This response may be user-visible in the current conversation.",
    `If you want to stay silent, reply exactly "${REPLY_SKIP_TOKEN}".`,
  ].join("\n");
}

export function isAToAReplySkip(text?: string): boolean {
  return (text ?? "").trim() === REPLY_SKIP_TOKEN;
}

export function resolveAToAPingPongTurns(cfg?: OpenClawConfig): number {
  const raw = cfg?.session?.agentToAgent?.maxPingPongTurns;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return DEFAULT_PING_PONG_TURNS;
  }
  const rounded = Math.floor(raw);
  return Math.max(0, Math.min(MAX_PING_PONG_TURNS, rounded));
}
