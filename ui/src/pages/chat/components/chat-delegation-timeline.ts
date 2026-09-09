import { html } from "lit";
import { extractToolCardsCached } from "../../../lib/chat/tool-cards.ts";
import { taskTimestampMs } from "../../../lib/tasks/data.ts";
import type { TaskSummary } from "../../../lib/tasks/task-summary.ts";
import { rawMessageTimestamp } from "../chat-thread-items.ts";
import { agentRunFrameGroups, type coalesceAgentRunFrames } from "../chat-thread.ts";
import { delegationPresentation, renderDelegationTaskCard } from "./chat-delegation-card.ts";
import type { TranscriptRow } from "./chat-transcript-controller.ts";

type RenderItem = ReturnType<typeof coalesceAgentRunFrames>[number];

function itemEndTimestamp(item: RenderItem): number {
  if (item.kind === "agent-run-frame") {
    return Math.max(...item.parts.map(itemEndTimestamp));
  }
  if (item.kind === "work-group" || item.kind === "activity-run") {
    return Math.max(...item.groups.map(itemEndTimestamp));
  }
  if (item.kind === "stream-run") {
    return Math.max(...item.parts.map((part) => part.startedAt));
  }
  if (item.kind === "group") {
    return Math.max(
      ...item.messages.flatMap(({ message }) => {
        const timestamp = rawMessageTimestamp(message);
        return timestamp === null ? [] : [timestamp];
      }),
    );
  }
  return "timestamp" in item ? item.timestamp : "startedAt" in item ? item.startedAt : Infinity;
}

/** Insert task activity before the frame containing its creation, not after its
 * final answer. Grouping remains intact; task identity stays independent. */
export function projectDelegationTimeline(
  rows: TranscriptRow<RenderItem>[],
  sessionKey: string,
  tasks: readonly TaskSummary[],
  messages: readonly unknown[],
  onOpenSubagents?: () => void,
): TranscriptRow<RenderItem>[] {
  const firstMessageAt = Math.min(
    ...messages.flatMap((message) => {
      const timestamp = rawMessageTimestamp(message);
      return timestamp === null ? [] : [timestamp];
    }),
  );
  const representedRuns = new Set(
    rows.flatMap((row) => {
      if (row.kind !== "item") {
        return [];
      }
      const item = row.item;
      const groups =
        item.kind === "agent-run-frame"
          ? agentRunFrameGroups(item)
          : item.kind === "activity-run" || item.kind === "work-group"
            ? item.groups
            : item.kind === "group"
              ? [item]
              : [];
      return groups.flatMap((group) =>
        group.messages.flatMap(({ message, key }) =>
          extractToolCardsCached(message, key)
            .filter((card) => card.name === "enterprise_delegate")
            .flatMap((card) =>
              delegationPresentation(card, {
                sessionKey,
                delegationTasks: tasks,
              }).delegates.flatMap((delegate) =>
                delegate.runId && delegate.agentId
                  ? [JSON.stringify([delegate.agentId, delegate.runId])]
                  : [],
              ),
            ),
        ),
      );
    }),
  );
  const pending = [
    ...new Map(
      tasks
        .map((task) => ({ ...task, createdAt: taskTimestampMs(task.createdAt) }))
        .filter((task) =>
          Boolean(
            task.runtime === "subagent" &&
            task.sessionKey === sessionKey &&
            task.childSessionKey &&
            task.runId &&
            task.agentId &&
            !representedRuns.has(JSON.stringify([task.agentId, task.runId])) &&
            Number.isFinite(task.createdAt) &&
            task.createdAt > 0 &&
            task.createdAt >= firstMessageAt,
          ),
        )
        .map((task) => [task.id, task]),
    ).values(),
  ].toSorted((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const result: TranscriptRow<RenderItem>[] = [];
  let taskIndex = 0;
  const appendTasksBefore = (timestamp: number) => {
    let task = pending[taskIndex];
    while (task && task.createdAt < timestamp) {
      result.push({
        kind: "content",
        key: `delegation:${sessionKey}:${task.id}`,
        content: html`<div
          class="chat-group assistant chat-group--with-footer chat-group--delegation"
        >
          <div class="chat-avatar-slot" aria-hidden="true"></div>
          <div class="chat-group-messages">
            ${renderDelegationTaskCard([task], undefined, onOpenSubagents)}
          </div>
        </div>`,
      });
      task = pending[++taskIndex];
    }
  };
  for (const row of rows) {
    if (row.kind === "item") {
      appendTasksBefore(itemEndTimestamp(row.item));
    }
    result.push(row);
  }
  appendTasksBefore(Infinity);
  return result;
}
