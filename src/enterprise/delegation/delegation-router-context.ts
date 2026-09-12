/** Pure request-text matching and exact clarification-context composition. */
import { isRecord } from "@openclaw/normalization-core/record-coerce";
import { listSubagentRunsForRequester } from "../../agents/subagents/registry/subagent-registry-read.js";
import { resolveAgentIdFromSessionKey } from "../../routing/session-key.js";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import type { EnterpriseDelegationCandidate } from "./delegation-candidates.js";
import {
  enterpriseDelegationTextContainsName,
  normalizeEnterpriseDelegationText,
} from "./delegation-explicit-match.js";
import {
  listEnterpriseDelegationEvents,
  type EnterpriseDelegationEvent,
} from "./delegation-store.js";

function normalizedText(value: string): string {
  return normalizeEnterpriseDelegationText(value);
}

const MAX_CONVERSATION_RESULTS = 2;
const MAX_CONVERSATION_RESULT_CHARS = 4_000;
const RESULT_EXCERPT_MARKER = "\n…\n";
const MAX_PREVIOUS_DELEGATION_CONTEXT = 6;
const MAX_CHILD_TASK_CHARS = 16_000;
const MAX_ASSIGNED_TASK_CHARS = 4_000;
const MAX_AUTHORIZED_REQUEST_CHARS = 8_000;

export type EnterpriseDelegationAttemptStatus =
  | "queued"
  | "running"
  | "interrupted"
  | "ok"
  | "error"
  | "timeout"
  | "unknown";

/**
 * Bounded, host-derived context from the most recent specialist executions.
 * It is deliberately not a user fact or a consent record. `assignedTask` is
 * the exact task string written by the host before spawning the child; callers
 * must still re-check the current candidate and policy before reusing it.
 */
export type EnterpriseDelegationHistoryEntry = {
  eventId: string;
  childRunId: string;
  agentId: string;
  assignedTask: string;
  authorizedRequest?: string;
  status: EnterpriseDelegationAttemptStatus;
  decisionSource?: EnterpriseDelegationEvent["decisionSource"];
  eventOutcome: EnterpriseDelegationEvent["outcome"];
  eventReasonCode: string;
  confirmationState: EnterpriseDelegationEvent["confirmationState"];
  policyRevision: number;
  profileRevision?: string;
  createdAt: number;
};

export type EnterpriseFollowupIntent =
  | "retry"
  | "recheck"
  | "scope_expansion"
  | "summary"
  | "other";

function hasAnyPhrase(value: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => value.includes(phrase));
}

const RETRY_PHRASES = [
  "thử lại",
  "tra cứu lại",
  "kiểm tra lại",
  "gọi lại",
  "làm lại",
  "chạy lại",
  "tiếp tục",
  "làm tiếp",
  "đã đăng nhập",
  "đăng nhập rồi",
  "retry",
  "try again",
  "check again",
  "run again",
  "call again",
  "rerun",
] as const;

const RECHECK_PHRASES = [
  "bạn có chắc",
  "chắc không",
  "kiểm tra kỹ",
  "xem kỹ",
  "xác minh",
  "verify",
  "recheck",
  "are you sure",
  "i remember",
  "tôi nhớ",
  "không chính xác",
  "chưa chính xác",
] as const;

const SCOPE_EXPANSION_PHRASES = [
  "toàn hệ thống",
  "toàn bộ hệ thống",
  "tất cả hệ thống",
  "toàn bộ các hệ thống",
  "tất cả chi nhánh",
  "mọi chi nhánh",
  "toàn bộ chi nhánh",
  "toàn công ty",
  "tất cả các cơ sở",
  "mọi cơ sở",
  "đầy đủ hơn",
  "nhiều hơn",
  "all system",
  "all branches",
  "all locations",
  "across the system",
  "across all branches",
  "more than that",
  "complete list",
] as const;

const SUMMARY_PHRASES = [
  "tóm tắt",
  "tóm lại",
  "tổng hợp lại",
  "giải thích lại",
  "tính lại",
  "tính toán lại",
  "recalculate",
  "recompute",
  "summarize",
  "summary",
  "recap",
  "what was the result",
  "continue waiting",
  "đang chờ kết quả",
] as const;

const PURE_RETRY_REQUESTS = new Set([
  "thử lại",
  "thử lại cho tôi",
  "thử lại cho tôi nhé",
  "thử lại giúp tôi",
  "thử lại giúp mình",
  "tra cứu lại",
  "tra cứu lại cho tôi",
  "kiểm tra lại",
  "kiểm tra lại cho tôi",
  "gọi lại",
  "làm lại",
  "chạy lại",
  "tiếp tục",
  "tiếp tục cho tôi",
  "tiếp tục giúp tôi",
  "làm tiếp",
  "đã đăng nhập",
  "đăng nhập rồi",
  "retry",
  "retry it",
  "try again",
  "check again",
  "run again",
  "call again",
  "rerun",
]);

const PURE_RECHECK_REQUESTS = new Set([
  "bạn có chắc",
  "bạn có chắc không",
  "bạn có chắc k",
  "chắc không",
  "kiểm tra kỹ",
  "kiểm tra kỹ lại",
  "xem kỹ lại",
  "xác minh lại",
  "are you sure",
  "recheck",
  "verify again",
]);

function standaloneFollowupText(prompt: string): string {
  return normalizedText(prompt)
    .replace(/[.!?,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPureEnterpriseRetry(prompt: string): boolean {
  return PURE_RETRY_REQUESTS.has(standaloneFollowupText(prompt));
}

function isPureEnterpriseRecheck(prompt: string): boolean {
  return PURE_RECHECK_REQUESTS.has(standaloneFollowupText(prompt));
}

/** Classifies only explicit follow-up signals; ordinary prompts remain `other`. */
export function classifyEnterpriseFollowupIntent(prompt: string): EnterpriseFollowupIntent {
  const normalized = normalizedText(prompt);
  const retry = hasAnyPhrase(normalized, RETRY_PHRASES);
  const recheck = hasAnyPhrase(normalized, RECHECK_PHRASES);
  const expansion = hasAnyPhrase(normalized, SCOPE_EXPANSION_PHRASES);
  if (expansion && (retry || recheck)) {
    return "scope_expansion";
  }
  if (retry) {
    return "retry";
  }
  if (recheck) {
    return "recheck";
  }
  if (hasAnyPhrase(normalized, SUMMARY_PHRASES)) {
    return "summary";
  }
  return "other";
}

/** A local follow-up is safe only when it explicitly asks for summary/arithmetic. */
export function isContextualLocalFollowup(prompt: string): boolean {
  return classifyEnterpriseFollowupIntent(prompt) === "summary";
}

function parseChildTask(
  value: string,
): { assignedTask: string; authorizedRequest?: string } | undefined {
  if (!value || value.length > MAX_CHILD_TASK_CHARS) {
    return undefined;
  }
  const separator = value.lastIndexOf("\n\n");
  if (separator < 0) {
    return undefined;
  }
  const encoded = value.slice(separator + 2).trim();
  if (encoded.length > MAX_CHILD_TASK_CHARS || !encoded.startsWith("{")) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || typeof parsed.assignedTask !== "string") {
    return undefined;
  }
  if (
    parsed.assignedTask.length === 0 ||
    parsed.assignedTask.length > MAX_ASSIGNED_TASK_CHARS ||
    Object.keys(parsed).some((key) => key !== "assignedTask" && key !== "authorizedRequest")
  ) {
    return undefined;
  }
  if (parsed.authorizedRequest !== undefined) {
    if (
      typeof parsed.authorizedRequest !== "string" ||
      parsed.authorizedRequest.length > MAX_AUTHORIZED_REQUEST_CHARS
    ) {
      return undefined;
    }
    return { assignedTask: parsed.assignedTask, authorizedRequest: parsed.authorizedRequest };
  }
  return { assignedTask: parsed.assignedTask };
}

function subagentStatus(
  run: ReturnType<typeof listSubagentRunsForRequester>[number],
): EnterpriseDelegationAttemptStatus {
  const outcome = run.execution.outcome?.status;
  if (outcome === "ok" || outcome === "error" || outcome === "timeout" || outcome === "unknown") {
    return outcome;
  }
  if (run.execution.status === "queued") {
    return "queued";
  }
  if (run.execution.status === "running") {
    return "running";
  }
  if (run.execution.status === "interrupted") {
    return "interrupted";
  }
  return "unknown";
}

function childAgentId(childSessionKey: string): string | undefined {
  try {
    return resolveAgentIdFromSessionKey(childSessionKey);
  } catch {
    return undefined;
  }
}

/**
 * Reads a bounded view of prior specialist work without adding a second
 * persistence table. Events provide the authoritative child-run membership;
 * the native subagent registry provides the exact host-created task wrapper.
 * Any missing or ambiguous linkage is omitted so retry can fail closed.
 */
export function readPreviousEnterpriseDelegationContext(params: {
  accountId: string;
  personalAgentId: string;
  sessionKey: string;
  parentRunId?: string;
  candidates: readonly EnterpriseDelegationCandidate[];
  stateOptions?: OpenClawStateDatabaseOptions;
}): EnterpriseDelegationHistoryEntry[] {
  const runs = listSubagentRunsForRequester(params.sessionKey, {
    requesterAgentId: params.personalAgentId,
  }).filter((run) => run.requesterTurnRunId !== params.parentRunId);
  if (runs.length === 0) {
    return [];
  }
  const runsById = new Map(runs.map((run) => [run.runId, run]));
  const candidateIds = new Set(params.candidates.map((candidate) => candidate.agentId));
  const events = listEnterpriseDelegationEvents(
    { accountId: params.accountId, limit: 50 },
    params.stateOptions,
  ).events;
  const seenChildRuns = new Set<string>();
  const context: EnterpriseDelegationHistoryEntry[] = [];
  for (const event of events) {
    if (
      event.personalAgentId !== params.personalAgentId ||
      !event.reasonCode.startsWith("delegate_") ||
      event.childRunIds.length === 0
    ) {
      continue;
    }
    for (const childRunId of event.childRunIds) {
      if (seenChildRuns.has(childRunId)) {
        continue;
      }
      const run = runsById.get(childRunId);
      if (!run) {
        continue;
      }
      const agentId = childAgentId(run.childSessionKey);
      if (!agentId || !candidateIds.has(agentId) || !event.sharedAgentIds.includes(agentId)) {
        continue;
      }
      const task = parseChildTask(run.task);
      if (!task) {
        continue;
      }
      seenChildRuns.add(childRunId);
      context.push({
        eventId: event.id,
        childRunId,
        agentId,
        assignedTask: task.assignedTask,
        ...(task.authorizedRequest !== undefined
          ? { authorizedRequest: task.authorizedRequest }
          : {}),
        status: subagentStatus(run),
        decisionSource: event.decisionSource,
        eventOutcome: event.outcome,
        eventReasonCode: event.reasonCode,
        confirmationState: event.confirmationState,
        policyRevision: event.policyRevision,
        profileRevision: event.profileRevisions[agentId],
        createdAt: event.createdAt,
      });
      if (context.length >= MAX_PREVIOUS_DELEGATION_CONTEXT) {
        return context;
      }
    }
  }
  return context;
}

export type ExactEnterpriseRetryResolution =
  | {
      kind: "matched";
      eventId: string;
      routes: Array<{ agentId: string; task: string }>;
      consentedAgentIds: string[];
    }
  | { kind: "ambiguous" }
  | { kind: "none" };

/**
 * Selects only the newest linked specialist batch for a pure retry/recheck.
 * A changed scope, policy, profile, or ambiguous batch never reuses consent.
 */
export function resolveExactEnterpriseRetry(params: {
  prompt: string;
  previous: readonly EnterpriseDelegationHistoryEntry[];
  candidates: readonly EnterpriseDelegationCandidate[];
  policyRevision: number;
}): ExactEnterpriseRetryResolution {
  if (!isPureEnterpriseRetry(params.prompt) && !isPureEnterpriseRecheck(params.prompt)) {
    return { kind: "none" };
  }
  if (params.previous.length === 0) {
    return { kind: "none" };
  }
  const newestCreatedAt = Math.max(...params.previous.map((entry) => entry.createdAt));
  const newest = params.previous.filter((entry) => entry.createdAt === newestCreatedAt);
  const eventIds = [...new Set(newest.map((entry) => entry.eventId))];
  if (eventIds.length !== 1) {
    return { kind: "ambiguous" };
  }
  const eventId = eventIds[0]!;
  const batch = newest.filter((entry) => entry.eventId === eventId);
  // A single delegation event may contain several independent specialists.
  // "Try it again" does not identify which task to rerun, so never relaunch
  // the whole batch or guess one route.
  if (batch.length !== 1) {
    return { kind: "ambiguous" };
  }
  const candidateById = new Map(
    params.candidates.map((candidate) => [candidate.agentId, candidate]),
  );
  const routeIds = new Set<string>();
  const routes: Array<{ agentId: string; task: string }> = [];
  const consentedAgentIds: string[] = [];
  for (const entry of batch) {
    if (routeIds.has(entry.agentId)) {
      return { kind: "ambiguous" };
    }
    const candidate = candidateById.get(entry.agentId);
    if (
      !candidate ||
      !candidate.routable ||
      entry.policyRevision !== params.policyRevision ||
      (entry.profileRevision !== undefined && entry.profileRevision !== candidate.profileRevision)
    ) {
      return { kind: "none" };
    }
    routeIds.add(entry.agentId);
    routes.push({ agentId: entry.agentId, task: entry.assignedTask });
    if (
      entry.confirmationState === "approved" ||
      (entry.confirmationState === "not_required" && entry.decisionSource === "explicit")
    ) {
      consentedAgentIds.push(entry.agentId);
    }
  }
  return routes.length > 0
    ? { kind: "matched", eventId, routes, consentedAgentIds }
    : { kind: "none" };
}

function messageText(message: Record<string, unknown>): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  if (!Array.isArray(message.content)) {
    return "";
  }
  return message.content
    .filter((block) => isRecord(block) && block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");
}

/** Whole external-user messages only: history supplies facts, never fresh consent. */
export function enterpriseDelegationConversationInputs(events: readonly unknown[]): string[] {
  const inputs: string[] = [];
  let remaining = 3_000;
  for (const event of events.toReversed()) {
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
    const text = messageText(message);
    if (!text.trim()) {
      continue;
    }
    // Stop at the boundary rather than dropping a newer correction and reviving old facts.
    if (text.length > remaining || inputs.length === 8) {
      break;
    }
    inputs.unshift(text);
    remaining -= text.length;
  }
  return inputs;
}

function completedAssistantText(message: Record<string, unknown>): string | undefined {
  const completed =
    message.role === "assistant" &&
    (message.stopReason === "stop" ||
      (message.stopReason === undefined &&
        message.api === "openclaw-transcript" &&
        message.provider === "openclaw" &&
        message.model === "host-response"));
  if (!completed) {
    return undefined;
  }
  if (
    Array.isArray(message.content) &&
    message.content.some(
      (block) =>
        isRecord(block) &&
        ["toolCall", "tool_call", "tool_use", "function_call"].includes(String(block.type)),
    )
  ) {
    return undefined;
  }
  const text = messageText(message).trim();
  if (!text || text === "NO_REPLY") {
    return undefined;
  }
  if (message.stopReason === "stop") {
    return text;
  }
  // Legacy host-owned handoff status can omit stopReason, but its structured
  // host-response identity still marks the message as a completed transcript row.
  return text;
}

function excerptText(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }
  if (limit <= RESULT_EXCERPT_MARKER.length) {
    return text.slice(0, limit);
  }
  const available = Math.max(0, limit - RESULT_EXCERPT_MARKER.length);
  const startLength = Math.ceil(available / 2);
  const endLength = available - startLength;
  return `${text.slice(0, startLength)}${RESULT_EXCERPT_MARKER}${text.slice(-endLength)}`;
}

/** Bounded completed assistant answers, kept separate from user-supplied facts. */
export function enterpriseDelegationConversationResults(events: readonly unknown[]): string[] {
  const recent: string[] = [];
  for (const event of events.toReversed()) {
    if (!isRecord(event) || !isRecord(event.message)) {
      continue;
    }
    const text = completedAssistantText(event.message);
    if (!text) {
      continue;
    }
    recent.push(text);
    if (recent.length === MAX_CONVERSATION_RESULTS) {
      break;
    }
  }
  const results = recent.toReversed();
  if (!results.length) {
    return [];
  }
  const budgets = results.map((text) =>
    Math.min(text.length, Math.floor(MAX_CONVERSATION_RESULT_CHARS / results.length)),
  );
  let remaining = MAX_CONVERSATION_RESULT_CHARS - budgets.reduce((sum, budget) => sum + budget, 0);
  for (const [index, text] of results.entries()) {
    if (remaining === 0) {
      break;
    }
    const extra = Math.min(remaining, text.length - budgets[index]!);
    budgets[index]! += extra;
    remaining -= extra;
  }
  return results.map((text, index) => excerptText(text, budgets[index]!));
}

export function containsPhrase(prompt: string, phrase: string): boolean {
  const normalizedPhrase = normalizedText(phrase);
  return normalizedPhrase.length >= 5 && normalizedText(prompt).includes(normalizedPhrase);
}

export function explicitMatches(
  prompt: string,
  candidates: readonly EnterpriseDelegationCandidate[],
) {
  return candidates.filter((candidate) => {
    const names = [candidate.name, candidate.agentId, ...(candidate.profile?.aliases ?? [])];
    return names.some((name) => enterpriseDelegationTextContainsName(prompt, name));
  });
}

export function withAnswerContext(
  previous: string,
  oldContext: string,
  context: string,
  limit?: number,
): string {
  const original =
    oldContext && previous.endsWith(oldContext) ? previous.slice(0, -oldContext.length) : previous;
  return (limit === undefined ? original : original.slice(0, limit - context.length)) + context;
}

export function deterministicMatch(
  prompt: string,
  candidates: readonly EnterpriseDelegationCandidate[],
): EnterpriseDelegationCandidate | undefined {
  const matches = candidates.filter((candidate) => {
    if (candidate.effectiveMode === "explicit_only") {
      return false;
    }
    const profile = candidate.profile;
    if (!profile || profile.avoidWhen.some((example) => containsPhrase(prompt, example))) {
      return false;
    }
    return profile.useWhen.some((example) => containsPhrase(prompt, example));
  });
  return matches.length === 1 ? matches[0] : undefined;
}

/** Preserve the current request separately from historical reference facts in child context. */
export function withConversationInputs(
  prompt: string,
  conversationInputs: readonly string[],
): string {
  return conversationInputs.length
    ? JSON.stringify({ conversationInputs, currentRequest: prompt })
    : prompt;
}

export const ROUTER_MAX_PROMPT_CHARS = 8_000;

export function isDefinedCandidate(
  candidate: EnterpriseDelegationCandidate | undefined,
): candidate is EnterpriseDelegationCandidate {
  return candidate !== undefined;
}

/** Admission and transcript extraction share bounded reference-context contracts. */
export function withinRouterContextBudget(
  prompt: string,
  inputs: readonly string[],
  results: readonly string[],
): boolean {
  return (
    prompt.length <= ROUTER_MAX_PROMPT_CHARS &&
    inputs.length <= 8 &&
    inputs.reduce((sum, text) => sum + text.length, 0) <= 3_000 &&
    results.length <= 2 &&
    results.reduce((sum, text) => sum + text.length, 0) <= MAX_CONVERSATION_RESULT_CHARS
  );
}
