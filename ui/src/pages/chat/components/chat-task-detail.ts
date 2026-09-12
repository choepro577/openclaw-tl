import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import { truncateUtf16Safe } from "@openclaw/normalization-core/utf16-slice";
import { html, nothing, type TemplateResult } from "lit";
import "../../../components/elapsed-time.ts";
import { icons } from "../../../components/icons.ts";
import { t } from "../../../i18n/index.ts";
import type { ChatItem, ToolCard } from "../../../lib/chat/chat-types.ts";
import { extractToolCardsCached } from "../../../lib/chat/tool-cards.ts";
import { resolveToolDisplay } from "../../../lib/chat/tool-display.ts";
import { canonicalUiSessionKeyForPersistence } from "../../../lib/sessions/session-key.ts";
import {
  isActiveTask,
  taskDetail,
  taskRuntimeLabel,
  taskTimestampMs,
  taskTitle,
} from "../../../lib/tasks/data.ts";
import type { TaskSummary } from "../../../lib/tasks/task-summary.ts";
import { coalesceToolActivityMessages } from "../chat-thread-grouping.ts";
import type { ChatProps } from "../chat-view.ts";
import {
  backgroundTaskStatusLabel,
  backgroundTaskStatusTone,
  newestTaskSnapshot,
} from "./chat-background-tasks-shared.ts";
import type { BackgroundTasksProps } from "./chat-background-tasks.types.ts";
import { renderDiffStatChips } from "./chat-diff-render.ts";
import { renderReadOnlyTranscript } from "./chat-read-only-transcript.ts";
import {
  readTaskTranscript,
  resetTaskDetail,
  type TaskDetailHost,
} from "./chat-task-detail-state.ts";
import { renderToolCard } from "./chat-tool-cards.ts";
import type { ChatTranscriptController } from "./chat-transcript-controller.ts";

const SUBAGENT_ACTIVITY_MAX_CHARS = 240;

function boundedSubagentActivity(value: unknown): string | undefined {
  const normalized = normalizeOptionalString(value);
  return normalized ? truncateUtf16Safe(normalized, SUBAGENT_ACTIVITY_MAX_CHARS) : undefined;
}

export function taskToolCards(taskId: string, messages: readonly unknown[]): ToolCard[] {
  const items: ChatItem[] = messages.map((message, index) => ({
    kind: "message",
    key: `${taskId}:tool:${index}`,
    message,
  }));
  return coalesceToolActivityMessages(items).flatMap((item) =>
    item.kind === "message" ? extractToolCardsCached(item.message, item.key) : [],
  );
}

export function renderTaskDetailPanel(params: {
  backgroundTasks: BackgroundTasksProps;
  chat: ChatProps;
  host: TaskDetailHost;
  task: TaskSummary | undefined;
  transcript: ChatTranscriptController;
  onBack?: () => void;
}): TemplateResult {
  const { backgroundTasks, task } = params;
  if (!task) {
    resetTaskDetail(params.host);
    return html`
      <div class="sidebar-panel chat-task-detail" data-task-detail-panel>
        ${renderTaskHeader(
          t("chat.backgroundTasks.taskDetailTitle"),
          undefined,
          undefined,
          params.onBack,
        )}
        <div class="sidebar-content chat-task-detail__state">
          ${t("chat.backgroundTasks.taskUnavailable")}
        </div>
      </div>
    `;
  }
  const detailedTask = backgroundTasks.taskDetails.get(task.id);
  const currentTask = newestTaskSnapshot(task, detailedTask);
  // A subagent's sessionKey is its requester's conversation, never its own
  // work; only the child session is that task's transcript.
  const transcriptSessionKey = normalizeOptionalString(
    currentTask.runtime === "subagent"
      ? currentTask.childSessionKey
      : (currentTask.childSessionKey ?? currentTask.sessionKey),
  );
  const canonicalTranscriptKey = canonicalUiSessionKeyForPersistence(
    params.host,
    transcriptSessionKey,
  );
  const canonicalPaneKey = canonicalUiSessionKeyForPersistence(params.host, params.host.sessionKey);
  // Enterprise users own the requester-scoped task record, not the specialist's
  // child session. Its bounded tasks.get prompt/result is the authorized detail.
  // Other tasks pointing at this pane use the same inspector so the sidebar does
  // not mirror the current conversation into itself.
  const useTaskInspector =
    params.chat.enterpriseUserPresentation === true ||
    !transcriptSessionKey ||
    canonicalTranscriptKey === canonicalPaneKey;
  const content =
    !useTaskInspector && transcriptSessionKey
      ? renderTaskTranscript({ ...params, task: currentTask, sessionKey: transcriptSessionKey })
      : renderTaskFallback(currentTask, backgroundTasks, params.host);
  return html`
    <div class="sidebar-panel chat-task-detail" data-task-detail-panel>
      ${renderTaskHeader(taskTitle(currentTask), currentTask, backgroundTasks, params.onBack)}
      ${content}
    </div>
  `;
}

// No close button here on purpose: the sidebar region header owns the
// "Close Details" control for every detail-slot panel (the classic panel is
// embedded with its own header hidden); a second X 40px away duplicated it.
function renderTaskHeader(
  title: string,
  task?: TaskSummary,
  backgroundTasks?: BackgroundTasksProps,
  onBack?: () => void,
): TemplateResult {
  const active = task ? isActiveTask(task) : false;
  const startedMs = task ? taskTimestampMs(task.startedAt ?? task.createdAt) : 0;
  const cancelling = task ? backgroundTasks?.cancellingTaskIds.has(task.id) === true : false;
  return html`
    <div class="sidebar-header chat-task-detail__header">
      ${onBack
        ? html`<button
            class="btn btn--ghost btn--icon chat-task-detail__back"
            type="button"
            aria-label=${t("chat.backgroundTasks.backToSubagents")}
            @click=${onBack}
          >
            ${icons.arrowLeft}
          </button>`
        : nothing}
      <div class="chat-task-detail__heading">
        <div class="sidebar-title" title=${title}>${title}</div>
        ${task
          ? html`<div class="chat-task-detail__meta">
              ${task.status === "running"
                ? html`<span class="chat-tasks-rail__task-pulse" aria-hidden="true"></span>`
                : nothing}
              <span
                class="chat-tasks-rail__task-status chat-tasks-rail__task-status--${backgroundTaskStatusTone(
                  task,
                  { subagentsOnly: backgroundTasks?.subagentsOnly },
                )}"
                >${backgroundTaskStatusLabel(task, {
                  subagentsOnly: backgroundTasks?.subagentsOnly,
                })}</span
              >
              ${backgroundTasks?.subagentsOnly
                ? nothing
                : html`<span aria-hidden="true">·</span> <span>${taskRuntimeLabel(task)}</span>`}
              ${active && startedMs > 0
                ? html`<span aria-hidden="true">·</span>
                    <openclaw-elapsed-time .startMs=${startedMs}></openclaw-elapsed-time>`
                : nothing}
              ${task.lastToolName
                ? html`<span aria-hidden="true">·</span>
                    <span class="chat-task-detail__tool">${task.lastToolName}</span>`
                : nothing}
              ${task.diffStat ? renderDiffStatChips(task.diffStat) : nothing}
            </div>`
          : nothing}
      </div>
      ${task && active && backgroundTasks?.canCancel
        ? html`<div class="sidebar-header__actions">
            <button
              class="btn btn--ghost btn--sm"
              type="button"
              aria-label=${t("chat.backgroundTasks.stopTask", { title })}
              ?disabled=${cancelling || !backgroundTasks.connected}
              @click=${() => backgroundTasks.onCancel(task.id)}
            >
              ${cancelling ? icons.loader : icons.stop} ${t("chat.runControls.stop")}
            </button>
          </div>`
        : nothing}
    </div>
  `;
}

function renderTaskTranscript(params: {
  chat: ChatProps;
  host: TaskDetailHost;
  sessionKey: string;
  task: TaskSummary;
  transcript: ChatTranscriptController;
}): TemplateResult {
  const load = readTaskTranscript(params.host, {
    taskId: params.task.id,
    sessionKey: params.sessionKey,
  });
  if (load.status === "loading") {
    return html`<div class="sidebar-content chat-task-detail__state">
      ${t("chat.backgroundTasks.transcriptLoading")}
    </div>`;
  }
  if (load.status === "error") {
    return html`<div class="sidebar-content chat-task-detail__state chat-task-detail__state--error">
      ${t("chat.backgroundTasks.transcriptFailed")}
    </div>`;
  }
  if (load.messages.length === 0) {
    return html`<div class="sidebar-content chat-task-detail__state">
      ${t("chat.backgroundTasks.transcriptEmpty")}
    </div>`;
  }
  return html`<div class="sidebar-content chat-task-detail__content">
    <div class="chat-task-detail__transcript">
      ${renderReadOnlyTranscript({
        chat: params.chat,
        messages: load.messages,
        paneId: `${params.chat.paneId}:task-sidebar`,
        sessionKey: params.sessionKey,
        transcript: params.transcript,
      })}
    </div>
  </div>`;
}

function renderTaskFallback(
  task: TaskSummary,
  backgroundTasks: BackgroundTasksProps,
  host: TaskDetailHost,
): TemplateResult {
  resetTaskDetail(host);
  if (
    !backgroundTasks.taskDetails.has(task.id) &&
    !backgroundTasks.taskDetailErrors.has(task.id) &&
    !backgroundTasks.taskDetailLoadingIds.has(task.id)
  ) {
    backgroundTasks.onLoadDetail?.(task);
  }
  return html`<div class="sidebar-content chat-task-detail__fallback">
    ${renderTaskInspector(task, backgroundTasks)}
  </div>`;
}

function renderTaskInspector(task: TaskSummary, props: BackgroundTasksProps): TemplateResult {
  const detailedTask = props.taskDetails.get(task.id);
  const newest = newestTaskSnapshot(task, detailedTask);
  const output = detailedTask?.result ?? taskDetail(newest);
  const detailLoading = props.taskDetailLoadingIds.has(task.id);
  const detailError = props.taskDetailErrors.get(task.id);
  return html`
    ${detailError
      ? html`<div
          class="chat-tasks-rail__task-inspector-state chat-tasks-rail__task-inspector-state--error"
        >
          ${detailError}
          <!-- The render-driven load skips errored tasks to avoid a per-paint
               retry loop, so without this the panel dead-ends whenever the task
               row that could re-open it is not on screen. -->
          <button
            class="chat-tasks-rail__task-inspector-retry"
            type="button"
            ?disabled=${detailLoading}
            @click=${() => props.onLoadDetail?.(task)}
          >
            ${t("chat.backgroundTasks.detailRetry")}
          </button>
        </div>`
      : nothing}
    ${newest.runtime === "subagent"
      ? renderSubagentActivity(newest, output, detailLoading, props)
      : html`<div class="chat-tasks-rail__detail-blocks">
          <section class="chat-tasks-rail__task-inspector-block">
            <div class="chat-tasks-rail__task-inspector-label">
              ${t("chat.backgroundTasks.prompt")}
            </div>
            <pre>
${detailLoading
                ? t("chat.backgroundTasks.detailLoading")
                : (detailedTask?.prompt ?? t("chat.backgroundTasks.promptUnavailable"))}</pre>
          </section>
          <section class="chat-tasks-rail__task-inspector-block">
            <div class="chat-tasks-rail__task-inspector-label">
              ${t("chat.backgroundTasks.output")}
            </div>
            <pre>${output ?? t("chat.backgroundTasks.outputPending")}</pre>
          </section>
        </div>`}
  `;
}

function renderSubagentActivity(
  task: TaskSummary,
  output: string | null,
  detailLoading: boolean,
  props: BackgroundTasksProps,
): TemplateResult {
  const subagentsOnly = props.subagentsOnly ?? false;
  const active = isActiveTask(task);
  const startedMs = taskTimestampMs(task.startedAt ?? task.createdAt);
  const rawActivity =
    normalizeOptionalString(task.lastActivity) ?? normalizeOptionalString(task.progressSummary);
  const activity = boundedSubagentActivity(rawActivity);
  const result = active ? null : output;
  const toolName = boundedSubagentActivity(task.lastToolName);
  const tool = toolName ? resolveToolDisplay({ name: toolName }).label : null;
  const toolUseCount = Math.max(0, task.toolUseCount ?? 0);
  const toolUseLabel =
    toolUseCount === 1
      ? t("chat.backgroundTasks.toolUseOne")
      : t("chat.backgroundTasks.toolUseMany", { count: String(toolUseCount) });
  const toolCards = taskToolCards(task.id, props.taskToolMessages?.get(task.id) ?? []);
  const lastToolCard = toolCards.at(-1);
  const visibleToolCards =
    active && toolName && toolUseCount === toolCards.length + 1
      ? [
          ...toolCards,
          {
            id: `${task.id}:live-tool:${toolUseCount}`,
            name: toolName,
            live: true,
            completed: false,
          } satisfies ToolCard,
        ]
      : active &&
          toolName &&
          toolUseCount === toolCards.length &&
          lastToolCard?.name === toolName &&
          lastToolCard.completed !== true &&
          !lastToolCard.outputText
        ? toolCards.with(toolCards.length - 1, { ...lastToolCard, live: true })
        : toolCards;
  return html`<div class="chat-task-detail__activity" data-subagent-activity-feed>
    <div class="chat-task-detail__activity-timing">
      ${backgroundTaskStatusLabel(task, { subagentsOnly })}
      ${active && startedMs > 0
        ? html`<span aria-hidden="true">·</span>
            <openclaw-elapsed-time .startMs=${startedMs}></openclaw-elapsed-time>`
        : nothing}
    </div>
    ${visibleToolCards.length > 0
      ? html`<div class="chat-task-detail__activity-tools" data-subagent-tool-list>
          ${visibleToolCards.map((card) =>
            renderToolCard(card, {
              expanded: props.expandedTaskToolIds?.has(card.id) === true,
              onToggleExpanded: props.onToggleTaskTool ?? (() => undefined),
              runActive: active,
              sessionKey: task.childSessionKey ?? task.sessionKey,
              showApprovalReviews: false,
            }),
          )}
        </div>`
      : tool
        ? html`<details class="chat-task-detail__activity-tool" data-subagent-tool-disclosure>
            <summary class="chat-task-detail__activity-tool-summary">
              <span aria-hidden="true">${icons.activity}</span>
              <span>${tool}</span>
              <span class="chat-task-detail__activity-tool-chevron" aria-hidden="true"
                >${icons.chevronRight}</span
              >
            </summary>
            <div class="chat-task-detail__activity-tool-body" data-subagent-tool-detail>
              ${activity
                ? html`<p class="chat-task-detail__activity-message">${activity}</p>`
                : nothing}
              ${toolUseCount > 0
                ? html`<span class="chat-task-detail__activity-tool-count">${toolUseLabel}</span>`
                : nothing}
            </div>
          </details>`
        : activity
          ? html`<p class="chat-task-detail__activity-message">${activity}</p>`
          : nothing}
    ${result && result !== rawActivity
      ? html`<div class="chat-task-detail__activity-result">
          <span
            class="chat-task-detail__activity-result-icon chat-task-detail__activity-result-icon--${task.status ===
            "completed"
              ? "ok"
              : "danger"}"
            aria-hidden="true"
            >${task.status === "completed" ? icons.check : icons.alertTriangle}</span
          >
          <p>${result}</p>
        </div>`
      : nothing}
    ${!activity && !result
      ? html`<div class="chat-task-detail__activity-empty">
          ${detailLoading
            ? t("chat.backgroundTasks.detailLoading")
            : t("chat.backgroundTasks.outputPending")}
        </div>`
      : nothing}
  </div>`;
}
