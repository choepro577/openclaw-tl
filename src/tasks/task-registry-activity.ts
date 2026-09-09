import { asOptionalObjectRecord } from "@openclaw/normalization-core/record-coerce";
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import { sliceUtf16Safe, truncateUtf16Safe } from "@openclaw/normalization-core/utf16-slice";
import { readCompletedFileMutationDelta } from "../agents/file-mutation-args.js";
import { resolveFileMutationToolName } from "../agents/tool-mutation-names.js";
import type { AgentEventPayload } from "../infra/agent-events.js";
import { isTerminalTaskStatus } from "./task-executor-policy.js";
import { cloneTaskRecord } from "./task-registry-records.js";
import {
  emitTaskRegistryObserverEvent,
  taskActivityByTaskId,
  tasks,
} from "./task-registry-state.js";
import type {
  TaskActivityOverlayState,
  TaskLiveToolActivity,
} from "./task-registry.process-state.js";
import type { TaskRecord } from "./task-registry.types.js";
import { sanitizeTaskStatusText } from "./task-status.js";

const MAX_ACTIVITY_CHARS = 200;
const STREAM_TEXT_BUFFER_CHARS = 4_000;
const ACTIVITY_FLUSH_MS = 1_000;
const MAX_PENDING_DIFFS = 64;
const MAX_LIVE_TOOLS = 50;
const MAX_LIVE_TOOL_PAYLOAD_CHARS = 8_000;

type TaskActivitySnapshot = {
  lastActivity?: string;
  diffStat?: { files: number; added: number; removed: number };
};

function activityFor(task: TaskRecord): TaskActivityOverlayState {
  const runId = task.runId ?? "";
  const existing = taskActivityByTaskId.get(task.taskId);
  if (existing?.runId === runId) {
    existing.liveToolsByCallId ??= new Map();
    return existing;
  }
  if (existing?.flushTimer) {
    clearTimeout(existing.flushTimer);
  }
  const created: TaskActivityOverlayState = {
    runId,
    assistantText: "",
    thinkingText: "",
    hasAssistantActivity: false,
    files: new Set(),
    added: 0,
    removed: 0,
    pendingDiffByToolCallId: new Map(),
    liveToolsByCallId: new Map(),
    dirty: false,
  };
  taskActivityByTaskId.set(task.taskId, created);
  return created;
}

function boundedToolArgs(value: unknown): unknown {
  const text = sanitizeTaskStatusText(value, { maxChars: MAX_LIVE_TOOL_PAYLOAD_CHARS });
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function recordLiveTool(
  task: TaskRecord,
  event: AgentEventPayload,
): { activity: TaskActivityOverlayState; changed: boolean } | undefined {
  const phase = event.data.phase;
  if (phase !== "start" && phase !== "result") {
    return undefined;
  }
  const toolCallId = normalizeOptionalString(event.data.toolCallId);
  const name = normalizeOptionalString(event.data.name);
  if (!toolCallId || !name) {
    return undefined;
  }
  const activity = activityFor(task);
  const existing = activity.liveToolsByCallId.get(toolCallId);
  if (phase === "start") {
    if (!existing && activity.liveToolsByCallId.size >= MAX_LIVE_TOOLS) {
      const oldest = activity.liveToolsByCallId.keys().next().value as string | undefined;
      if (oldest) {
        activity.liveToolsByCallId.delete(oldest);
      }
    }
    activity.liveToolsByCallId.set(toolCallId, {
      toolCallId,
      name,
      ...(event.data.args === undefined ? {} : { args: boundedToolArgs(event.data.args) }),
      resultReceived: false,
      startedAt: event.ts || Date.now(),
    });
    return { activity, changed: true };
  }
  const output = sanitizeTaskStatusText(event.data.result, {
    errorContext: event.data.isError === true,
    maxChars: MAX_LIVE_TOOL_PAYLOAD_CHARS,
  });
  activity.liveToolsByCallId.set(toolCallId, {
    toolCallId,
    name,
    ...(existing?.args === undefined ? {} : { args: existing.args }),
    ...(output ? { output } : {}),
    ...(event.data.isError === undefined ? {} : { isError: event.data.isError === true }),
    resultReceived: true,
    startedAt: existing?.startedAt ?? event.ts ?? Date.now(),
  });
  return { activity, changed: true };
}

function lastLineSnippet(text: string): string | undefined {
  const lines = text.split(/\r\n|\r|\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]?.replace(/\s+/g, " ").trim();
    if (line) {
      return truncateUtf16Safe(line, MAX_ACTIVITY_CHARS);
    }
  }
  return undefined;
}

function updateStreamText(
  activity: TaskActivityOverlayState,
  stream: "assistant" | "thinking",
  data: Record<string, unknown>,
): string | undefined {
  const key = stream === "assistant" ? "assistantText" : "thinkingText";
  let cumulative: string;
  if (typeof data.text === "string") {
    cumulative = data.text;
  } else if (typeof data.delta === "string") {
    cumulative = activity[key] + data.delta;
  } else {
    return undefined;
  }
  // Retain only a suffix for delta-only producers; full snapshots remain authoritative.
  activity[key] = sliceUtf16Safe(cumulative, -STREAM_TEXT_BUFFER_CHARS);
  return lastLineSnippet(cumulative);
}

function scheduleFlush(taskId: string, activity: TaskActivityOverlayState): void {
  if (activity.flushTimer) {
    return;
  }
  const elapsed = activity.lastFlushedAt === undefined ? 0 : Date.now() - activity.lastFlushedAt;
  const delay = Math.max(0, ACTIVITY_FLUSH_MS - elapsed);
  activity.flushTimer = setTimeout(() => {
    activity.flushTimer = undefined;
    flushTaskActivity(taskId);
  }, delay);
  activity.flushTimer.unref?.();
}

function markChanged(taskId: string, activity: TaskActivityOverlayState): void {
  activity.dirty = true;
  scheduleFlush(taskId, activity);
}

/** Folds streaming-only fields and returns true when durable task mutation should be skipped. */
export function recordTaskActivityEvent(task: TaskRecord, event: AgentEventPayload): boolean {
  const textStream =
    event.stream === "assistant"
      ? "assistant"
      : event.stream === "thinking"
        ? "thinking"
        : undefined;
  if (textStream) {
    const activity = activityFor(task);
    const snippet = updateStreamText(activity, textStream, event.data);
    if (!snippet) {
      return true;
    }
    if (textStream === "assistant") {
      activity.hasAssistantActivity = true;
    } else if (activity.hasAssistantActivity) {
      return true;
    }
    if (activity.lastActivity !== snippet) {
      activity.lastActivity = snippet;
      markChanged(task.taskId, activity);
    }
    return true;
  }

  if (event.stream !== "tool") {
    return false;
  }
  const liveTool = recordLiveTool(task, event);
  const toolName = typeof event.data.name === "string" ? event.data.name : "";
  const kind = resolveFileMutationToolName(toolName);
  if (!kind) {
    return false;
  }
  const toolCallId = normalizeOptionalString(event.data.toolCallId);
  if (event.data.phase === "start") {
    const args = asOptionalObjectRecord(event.data.args);
    const delta = args ? readCompletedFileMutationDelta(kind, args) : undefined;
    if (!toolCallId || !delta) {
      return false;
    }
    const activity = activityFor(task);
    if (
      !activity.pendingDiffByToolCallId.has(toolCallId) &&
      activity.pendingDiffByToolCallId.size >= MAX_PENDING_DIFFS
    ) {
      return false;
    }
    activity.pendingDiffByToolCallId.set(toolCallId, delta);
    return false;
  }
  if (event.data.phase !== "result") {
    return false;
  }
  const activity = taskActivityByTaskId.get(task.taskId);
  const delta = toolCallId ? activity?.pendingDiffByToolCallId.get(toolCallId) : undefined;
  if (toolCallId) {
    activity?.pendingDiffByToolCallId.delete(toolCallId);
  }
  if (event.data.isError === true || !delta || !activity) {
    if (liveTool?.changed && event.data.isError !== true) {
      markChanged(task.taskId, liveTool.activity);
    }
    return event.data.isError !== true;
  }
  let changed = delta.added > 0 || delta.removed > 0;
  for (const file of delta.files) {
    const size = activity.files.size;
    activity.files.add(file);
    changed ||= activity.files.size !== size;
  }
  if (changed) {
    activity.added += delta.added;
    activity.removed += delta.removed;
  }
  if (changed || liveTool?.changed) {
    markChanged(task.taskId, activity);
  }
  return true;
}

export function getTaskLiveToolActivitySnapshot(taskId: string): TaskLiveToolActivity[] {
  return [...(taskActivityByTaskId.get(taskId)?.liveToolsByCallId.values() ?? [])].map((tool) => ({
    ...tool,
  }));
}

export function getTaskActivitySnapshot(taskId: string): TaskActivitySnapshot | undefined {
  const activity = taskActivityByTaskId.get(taskId);
  return activity
    ? {
        ...(activity.lastActivity ? { lastActivity: activity.lastActivity } : {}),
        ...(activity.files.size > 0
          ? {
              diffStat: {
                files: activity.files.size,
                added: activity.added,
                removed: activity.removed,
              },
            }
          : {}),
      }
    : undefined;
}

export function flushTaskActivity(taskId: string): void {
  const activity = taskActivityByTaskId.get(taskId);
  if (!activity?.dirty) {
    return;
  }
  if (activity.flushTimer) {
    clearTimeout(activity.flushTimer);
    activity.flushTimer = undefined;
  }
  const task = tasks.get(taskId);
  if (!task || isTerminalTaskStatus(task.status)) {
    clearTaskActivity(taskId);
    return;
  }
  activity.dirty = false;
  activity.lastFlushedAt = Date.now();
  emitTaskRegistryObserverEvent(() => ({ kind: "upserted", task: cloneTaskRecord(task) }));
}

export function clearTaskActivity(taskId: string): void {
  const activity = taskActivityByTaskId.get(taskId);
  if (activity?.flushTimer) {
    clearTimeout(activity.flushTimer);
  }
  taskActivityByTaskId.delete(taskId);
}
