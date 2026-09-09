import { asNullableRecord } from "@openclaw/normalization-core/record-coerce";
import { html, nothing } from "lit";
import { icons } from "../../../components/icons.ts";
import { enterpriseUserChatCardCopy } from "../../../i18n/enterprise-user-chat.ts";
import { t } from "../../../i18n/index.ts";
import type { ToolCard } from "../../../lib/chat/chat-types.ts";
import { taskTimestampMs, taskTitle } from "../../../lib/tasks/data.ts";
import type { TaskSummary } from "../../../lib/tasks/task-summary.ts";

export type DelegationCardContext = {
  sessionKey?: string;
  delegationTasks?: readonly TaskSummary[];
  runActive?: boolean;
  delegationExpanded?: boolean;
  onOpenTaskDetail?: (task: TaskSummary) => void;
  onOpenSubagents?: () => void;
};

type DelegateState =
  | "assigned"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "blocked";
type DelegateRow = {
  name: string;
  agentId?: string;
  runId?: string;
  childSessionKey?: string;
  createdAt?: number;
  state: DelegateState;
  delivered: boolean;
  deliveryFailed: boolean;
  task?: TaskSummary;
};

function boundedText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim().slice(0, 240) || undefined : undefined;
}

function readAcceptedSessionSpawns(envelope: Record<string, unknown> | null) {
  if (!Array.isArray(envelope?.acceptedSessionSpawns)) {
    return new Map<string, string>();
  }
  return new Map(
    envelope.acceptedSessionSpawns.flatMap((raw) => {
      const spawn = asNullableRecord(raw);
      const runId = boundedText(spawn?.runId);
      const childSessionKey = boundedText(spawn?.childSessionKey);
      return runId && childSessionKey ? [[runId, childSessionKey] as const] : [];
    }),
  );
}

function taskForDelegate(
  context: DelegationCardContext,
  runId: string | undefined,
  agentId: string | undefined,
  childSessionKey: string | undefined,
): { task?: TaskSummary; agentId?: string } {
  if (!context.sessionKey || !runId) {
    return {};
  }
  const candidates = (context.delegationTasks ?? []).filter(
    (candidate) =>
      candidate.runtime === "subagent" &&
      candidate.sessionKey === context.sessionKey &&
      candidate.runId === runId &&
      (!agentId || candidate.agentId === agentId) &&
      (!childSessionKey || candidate.childSessionKey === childSessionKey),
  );
  // A run/session pair is the authoritative identity. If the payload lacks an
  // agent id, only hydrate when that identity resolves to one task; silently
  // picking among ambiguous records would attach the wrong specialist card.
  if (candidates.length !== 1) {
    return {};
  }
  const task = candidates[0];
  if (!task) {
    return {};
  }
  return { task, agentId: agentId ?? task.agentId };
}

function delegateRow(
  raw: unknown,
  acceptedSpawns: ReadonlyMap<string, string>,
  context: DelegationCardContext,
): DelegateRow | undefined {
  const entry = asNullableRecord(raw);
  const agent = asNullableRecord(entry?.agent);
  const name = boundedText(entry?.agentName) ?? boundedText(agent?.name);
  if (!entry || !name) {
    return undefined;
  }
  const runId = boundedText(entry.runId);
  const childSessionKey = runId ? acceptedSpawns.get(runId) : undefined;
  const sourceAgentId = boundedText(agent?.id);
  const { task, agentId } = taskForDelegate(context, runId, sourceAgentId, childSessionKey);
  const state: DelegateState =
    entry.status !== "accepted"
      ? "blocked"
      : task?.terminalOutcome === "blocked"
        ? "blocked"
        : (task?.status ?? "assigned");
  return {
    name,
    agentId: agentId ?? sourceAgentId,
    runId,
    childSessionKey,
    createdAt: task?.createdAt === undefined ? undefined : taskTimestampMs(task.createdAt),
    state,
    delivered: state === "completed" && task?.deliveryStatus === "delivered",
    deliveryFailed:
      state === "completed" &&
      (task?.deliveryStatus === "failed" ||
        task?.deliveryStatus === "parent_missing" ||
        task?.deliveryStatus === "dismissed"),
    task,
  };
}

function resultEnvelope(card: ToolCard): Record<string, unknown> | null {
  const details = asNullableRecord(card.details);
  if (
    details &&
    (Array.isArray(details.delegates) ||
      Array.isArray(details.assignments) ||
      Array.isArray(details.acceptedSessionSpawns) ||
      details.status === "local" ||
      details.status === "clarify" ||
      details.status === "forbidden" ||
      details.status === "retry_required")
  ) {
    return details;
  }
  // Historical transcripts may preserve only the public result text. Never render
  // its raw JSON, args, decision token, internal errors, or child instructions.
  if (!card.outputText || card.outputText.length > 32_000) {
    return null;
  }
  try {
    return asNullableRecord(JSON.parse(card.outputText));
  } catch {
    return null;
  }
}

export function delegationPresentation(card: ToolCard, context: DelegationCardContext = {}) {
  const envelope = resultEnvelope(card);
  const delegates: DelegateRow[] = [];
  const acceptedSpawns = readAcceptedSessionSpawns(envelope);
  // Persisted older handoffs use delegates; current tool results use assignments.
  const entries = envelope?.assignments ?? envelope?.delegates;
  if (Array.isArray(entries)) {
    for (const raw of entries.slice(0, 3)) {
      const row = delegateRow(raw, acceptedSpawns, context);
      if (row) {
        delegates.push(row);
      }
    }
  }
  const blocked =
    envelope?.status === "forbidden" || envelope?.outcome === "blocked" || card.isError === true;
  const local = envelope?.status === "local";
  const pending = !envelope && !card.completed && card.live === true && context.runActive === true;
  const confirming = envelope?.status === "clarify";
  const retrying = envelope?.status === "retry_required";
  return { delegates, blocked, confirming, local, pending, retrying };
}

export function delegationSummary(card: ToolCard, context: DelegationCardContext = {}): string {
  const model = delegationPresentation(card, context);
  if (!model.delegates.length) {
    return enterpriseUserChatCardCopy(
      `chat.toolCards.delegation.${model.blocked ? "blocked" : model.retrying ? "refreshing" : model.confirming ? "confirming" : model.local ? "local" : model.pending ? "checking" : "unavailable"}`,
    );
  }
  const summary = compactDelegationSummary(model.delegates);
  return [summary.names, summary.status].filter(Boolean).join(" · ");
}

export function renderDelegationCard(card: ToolCard, context: DelegationCardContext = {}) {
  const model = delegationPresentation(card, context);
  return renderDelegationRows(
    model.delegates,
    delegationSummary(card, context),
    context.onOpenTaskDetail,
    context.delegationExpanded,
    context.onOpenSubagents,
  );
}

export function renderDelegationTaskCard(
  tasks: readonly TaskSummary[],
  onOpenTaskDetail?: (task: TaskSummary) => void,
  onOpenSubagents?: () => void,
) {
  return renderDelegationRows(
    tasks.map((task) => ({
      name:
        boundedText(task.title) ??
        boundedText(task.agentId) ??
        enterpriseUserChatCardCopy("chat.toolCards.delegation.title"),
      createdAt: taskTimestampMs(task.createdAt),
      state: task.terminalOutcome === "blocked" ? "blocked" : task.status,
      delivered: task.status === "completed" && task.deliveryStatus === "delivered",
      deliveryFailed:
        task.status === "completed" &&
        (task.deliveryStatus === "failed" ||
          task.deliveryStatus === "parent_missing" ||
          task.deliveryStatus === "dismissed"),
      task,
    })),
    undefined,
    onOpenTaskDetail,
    false,
    onOpenSubagents,
  );
}

function renderDelegationRows(
  delegates: readonly DelegateRow[],
  notice?: string,
  onOpenTaskDetail?: (task: TaskSummary) => void,
  expanded = false,
  onOpenSubagents?: () => void,
) {
  void expanded;
  const visibleDelegates = delegates.slice(0, 5);
  const primaryTask = delegates.find((row) => row.task)?.task;
  const summary = compactDelegationSummary(delegates);
  const activity = primaryTask
    ? boundedText(
        (isTerminalDelegateState(primaryTask.status) ? primaryTask.terminalSummary : undefined) ??
          primaryTask.lastActivity ??
          primaryTask.progressSummary ??
          primaryTask.lastToolName,
      )
    : undefined;
  const rowContent = html`
    <span class="chat-delegation__icons" aria-hidden="true">
      ${visibleDelegates
        .slice(0, 3)
        .map(
          (row) =>
            html`<span class="chat-delegation__icon"
              >${delegateBucket(row) === "failed" ? icons.x : icons.bot}</span
            >`,
        )}
    </span>
    <span class="chat-delegation__names">${summary.names}</span>
    <span class="chat-delegation__status">${summary.status}</span>
    ${onOpenSubagents || (primaryTask && onOpenTaskDetail)
      ? html`<span class="chat-delegation__chevron" aria-hidden="true">${icons.chevronRight}</span>`
      : nothing}
    ${activity ? html`<span class="chat-delegation__activity">${activity}</span>` : nothing}
  `;
  return html`<section
    class="chat-delegation"
    aria-label=${enterpriseUserChatCardCopy("chat.toolCards.delegation.title")}
  >
    ${delegates.length
      ? onOpenSubagents || (primaryTask && onOpenTaskDetail)
        ? html`<button
            class="chat-delegation__row"
            data-state=${delegationState(delegates)}
            data-agent-count=${delegates.length}
            data-subagent-task-id=${primaryTask?.id ?? nothing}
            type="button"
            aria-live="polite"
            aria-atomic="true"
            aria-label=${onOpenSubagents
              ? t("chat.backgroundTasks.subagentsShow")
              : t("chat.backgroundTasks.subagentActivity.openDetails", {
                  title: taskTitle(primaryTask!),
                })}
            @click=${() => (onOpenSubagents ? onOpenSubagents() : onOpenTaskDetail?.(primaryTask!))}
          >
            ${rowContent}
          </button>`
        : html`<div
            class="chat-delegation__row"
            data-state=${delegationState(delegates)}
            data-agent-count=${delegates.length}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            ${rowContent}
          </div>`
      : html`<p class="chat-delegation__notice">${notice}</p>`}
  </section>`;
}

function isTerminalDelegateState(status: TaskSummary["status"]): boolean {
  return status !== "queued" && status !== "running";
}

type CompactDelegationSummary = { names: string; status: string };

function delegateBucket(row: DelegateRow): "working" | "returning" | "reported" | "failed" {
  if (row.state === "completed" && row.delivered) {
    return "reported";
  }
  if (
    row.deliveryFailed ||
    row.state === "failed" ||
    row.state === "timed_out" ||
    row.state === "cancelled" ||
    row.state === "blocked"
  ) {
    return "failed";
  }
  if (row.state === "completed") {
    return "returning";
  }
  return "working";
}

function compactDelegationSummary(delegates: readonly DelegateRow[]): CompactDelegationSummary {
  const names = delegates.map((row) => row.name);
  const nameText =
    names.slice(0, 5).join(", ") +
    (names.length > 5
      ? ` ${enterpriseUserChatCardCopy("chat.toolCards.delegation.moreAgents", { count: String(names.length - 5) })}`
      : "");
  const counts = delegates.reduce(
    (result, row) => {
      result[delegateBucket(row)] += 1;
      return result;
    },
    { working: 0, returning: 0, reported: 0, failed: 0 },
  );
  const status = (["working", "returning", "reported", "failed"] as const)
    .filter((bucket) => counts[bucket] > 0)
    .map((bucket) =>
      enterpriseUserChatCardCopy(`chat.toolCards.delegation.${bucket}Count`, {
        count: String(counts[bucket]),
      }),
    )
    .join(" · ");
  return { names: nameText, status };
}

function delegationState(delegates: readonly DelegateRow[]): string {
  if (delegates.some((row) => delegateBucket(row) === "failed")) {
    return "failed";
  }
  if (delegates.every((row) => delegateBucket(row) === "reported")) {
    return "reported";
  }
  if (delegates.some((row) => delegateBucket(row) === "returning")) {
    return "returning";
  }
  return "working";
}
