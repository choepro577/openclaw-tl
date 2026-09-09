import { enterpriseUserChatCardCopy } from "../../../i18n/enterprise-user-chat.ts";
import { t } from "../../../i18n/index.ts";
import { isActiveTask, taskStatusLabel } from "../../../lib/tasks/data.ts";
import type { TaskSummary } from "../../../lib/tasks/task-summary.ts";

export { newestTaskSnapshot } from "../../../lib/tasks/data.ts";

// Status tone drives the meta line's colored word and the running pulse dot;
// pill chips read too heavy at rail width, so tone is typographic only.
// Shared with the status row's hover preview.
export const STATUS_TONES = {
  queued: "warn",
  running: "warn",
  completed: "ok",
  failed: "danger",
  cancelled: "danger",
  timed_out: "danger",
} as const satisfies Record<TaskSummary["status"], string>;

export type BackgroundTaskStatusOptions = {
  subagentsOnly?: boolean;
};

type DelegationStatusKey =
  | "running"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "blocked"
  | "returned"
  | "returning"
  | "returnFailed";

function enterpriseSubagentStatusLabel(task: TaskSummary): string {
  if (task.status === "queued") {
    return enterpriseUserChatCardCopy("chat.toolCards.delegation.queued");
  }
  if (task.status === "running") {
    return enterpriseUserChatCardCopy("chat.toolCards.delegation.running");
  }
  if (task.terminalOutcome === "blocked") {
    return enterpriseUserChatCardCopy("chat.toolCards.delegation.blocked");
  }
  if (task.status === "completed") {
    if (task.deliveryStatus === "delivered") {
      return enterpriseUserChatCardCopy("chat.toolCards.delegation.returned");
    }
    if (
      task.deliveryStatus === "failed" ||
      task.deliveryStatus === "parent_missing" ||
      task.deliveryStatus === "dismissed"
    ) {
      return enterpriseUserChatCardCopy("chat.toolCards.delegation.returnFailed");
    }
    return enterpriseUserChatCardCopy("chat.toolCards.delegation.returning");
  }
  const key: DelegationStatusKey =
    task.status === "timed_out"
      ? "timed_out"
      : task.status === "cancelled"
        ? "cancelled"
        : "failed";
  return enterpriseUserChatCardCopy(`chat.toolCards.delegation.${key}`);
}

export function backgroundTaskStatusLabel(
  task: TaskSummary,
  options: BackgroundTaskStatusOptions = {},
): string {
  if (options.subagentsOnly && task.runtime === "subagent") {
    return enterpriseSubagentStatusLabel(task);
  }
  if (isActiveTask(task)) {
    return taskStatusLabel(task.status);
  }
  // Finished history intentionally has two outcomes: completed or failed.
  // Cancellation and timeout stay grouped as unsuccessful work.
  return task.status === "completed"
    ? t("tasksPage.status.completed")
    : t("tasksPage.status.failed");
}

export function backgroundTaskStatusTone(
  task: TaskSummary,
  options: BackgroundTaskStatusOptions = {},
): string {
  if (options.subagentsOnly && task.runtime === "subagent") {
    if (isActiveTask(task)) {
      return "warn";
    }
    if (task.status === "completed" && task.terminalOutcome !== "blocked") {
      if (task.deliveryStatus === "delivered") {
        return "ok";
      }
      if (
        task.deliveryStatus === "failed" ||
        task.deliveryStatus === "parent_missing" ||
        task.deliveryStatus === "dismissed"
      ) {
        return "danger";
      }
      return "warn";
    }
    return "danger";
  }
  return STATUS_TONES[task.status];
}
