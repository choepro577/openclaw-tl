import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
// Task gateway methods expose detached task list/get/cancel operations with
// bounded public summaries over the runtime task registry.
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import {
  ErrorCodes,
  errorShape,
  type TaskSummary,
  type TasksListParams,
  validateTasksCancelParams,
  validateTasksGetParams,
  validateTasksListParams,
  validateTasksRecoveryParams,
} from "../../../packages/gateway-protocol/src/index.js";
import {
  dismissSubagentCompletionDelivery,
  retrySubagentCompletionDelivery,
} from "../../agents/subagents/completion/subagent-completion-delivery.js";
import {
  isToolCallContentType,
  isToolResultContentType,
  resolveToolUseId,
} from "../../chat/tool-content.js";
import { canonicalizeMainSessionAlias } from "../../config/sessions.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { getTaskById, listTaskRecordPage } from "../../tasks/runtime-internal.js";
import { getTaskLiveToolActivitySnapshot } from "../../tasks/task-registry-activity.js";
import type { TaskLiveToolActivity } from "../../tasks/task-registry.process-state.js";
import type { TaskRecord, TaskStatus } from "../../tasks/task-registry.types.js";
import { resolveEffectiveChatHistoryMaxChars } from "../chat-display-projection.js";
import { getMaxChatHistoryMessagesBytes } from "../server-constants.js";
import { resolveRequestedSessionAgentId } from "../session-request-agent.js";
import { loadGatewaySessionEntryReadOnly, resolveSessionModelRef } from "../session-utils.js";
import { canAccessTaskRequesterSession } from "../task-session-access.js";
import { readChatHistoryPage } from "./chat-history-pages.js";
import { mapTaskSummary } from "./task-summary.js";
import type { GatewayRequestHandlers } from "./types.js";
import { assertValidParams } from "./validation.js";

const DEFAULT_TASKS_LIST_LIMIT = 100;
const MAX_TASKS_LIST_LIMIT = 500;
const TASK_TOOL_HISTORY_LIMIT = 200;

type TaskLedgerStatus = TaskSummary["status"];

const LEDGER_STATUS_TO_TASK_STATUSES: Record<TaskLedgerStatus, TaskStatus[]> = {
  queued: ["queued"],
  running: ["running"],
  completed: ["succeeded"],
  failed: ["failed", "lost"],
  timed_out: ["timed_out"],
  cancelled: ["cancelled"],
};

function normalizeTaskStatusFilter(status: TasksListParams["status"]): Set<TaskStatus> | null {
  if (!status) {
    return null;
  }
  const statuses = Array.isArray(status) ? status : [status];
  return new Set(statuses.flatMap((value) => LEDGER_STATUS_TO_TASK_STATUSES[value] ?? []));
}

// Cursor strings are offsets, not opaque tokens; reject malformed values so a
// client cannot silently restart pagination at the first page.
function parseCursor(cursor: string | undefined): number | null {
  if (!cursor) {
    return 0;
  }
  if (!/^\d+$/.test(cursor.trim())) {
    return null;
  }
  const parsed = Number(cursor);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isTaskToolMessage(message: unknown): boolean {
  const record = asOptionalRecord(message);
  const role = normalizeOptionalString(record?.role)?.toLowerCase();
  if (role === "tool" || role === "function" || Array.isArray(record?.tool_calls)) {
    return true;
  }
  return Array.isArray(record?.content)
    ? record.content.some((value) => {
        const block = asOptionalRecord(value);
        return (
          isToolCallContentType(block?.type) ||
          isToolResultContentType(block?.type) ||
          (typeof block?.name === "string" &&
            (block.arguments !== undefined ||
              block.args !== undefined ||
              block.input !== undefined))
        );
      })
    : false;
}

function withoutLiveToolCalls(message: unknown, liveIds: ReadonlySet<string>): unknown | null {
  const record = asOptionalRecord(message);
  if (!record) {
    return message;
  }
  const topLevelId = resolveToolUseId({ ...record, id: undefined });
  if (topLevelId && liveIds.has(topLevelId)) {
    return null;
  }
  if (!Array.isArray(record.content)) {
    return message;
  }
  const content = record.content.filter((value) => {
    const block = asOptionalRecord(value);
    if (!block || (!isToolCallContentType(block.type) && !isToolResultContentType(block.type))) {
      return true;
    }
    const id = resolveToolUseId(block) ?? topLevelId;
    return !id || !liveIds.has(id);
  });
  return content.length === record.content.length
    ? message
    : content.length > 0
      ? { ...record, content }
      : null;
}

function liveToolMessage(task: TaskRecord, tool: TaskLiveToolActivity): Record<string, unknown> {
  return {
    role: "assistant",
    runId: task.runId,
    toolCallId: tool.toolCallId,
    timestamp: tool.startedAt,
    content: [
      {
        type: "toolcall",
        id: tool.toolCallId,
        name: tool.name,
        arguments: tool.args ?? {},
      },
      ...(tool.resultReceived
        ? [
            {
              type: "toolresult",
              id: tool.toolCallId,
              name: tool.name,
              text: tool.output ?? "",
              ...(tool.isError === undefined ? {} : { isError: tool.isError }),
            },
          ]
        : []),
    ],
    __openclawToolStreamLive: true,
    __openclawToolStreamResultReceived: tool.resultReceived,
  };
}

async function readTaskToolMessages(task: TaskRecord, cfg: OpenClawConfig): Promise<unknown[]> {
  const childSessionKey = normalizeOptionalString(task.childSessionKey);
  if (task.runtime !== "subagent" || !childSessionKey) {
    return [];
  }
  const loaded = loadGatewaySessionEntryReadOnly(childSessionKey, {
    cfg,
    includeStoreChildEntries: true,
  });
  const model = resolveSessionModelRef(cfg, loaded.entry, loaded.agentId);
  const page = await readChatHistoryPage({
    entry: loaded.entry,
    provider: model.provider,
    sessionId: loaded.entry?.sessionId,
    storePath: loaded.storePath,
    sessionAgentId: loaded.agentId,
    canonicalKey: loaded.canonicalKey,
    max: TASK_TOOL_HISTORY_LIMIT,
    maxHistoryBytes: getMaxChatHistoryMessagesBytes(),
    effectiveMaxChars: resolveEffectiveChatHistoryMaxChars(cfg),
    offset: undefined,
    messageId: undefined,
  });
  const liveTools = getTaskLiveToolActivitySnapshot(task.taskId);
  const liveIds = new Set(liveTools.map((tool) => tool.toolCallId));
  return [
    ...page.messages
      .filter(isTaskToolMessage)
      .map((message) => withoutLiveToolCalls(message, liveIds))
      .filter((message): message is unknown => message !== null),
    ...liveTools.map((tool) => liveToolMessage(task, tool)),
  ].slice(-TASK_TOOL_HISTORY_LIMIT);
}

// Control UI task methods expose the stable gateway protocol shape; helpers
// above keep runtime registry details out of the wire result.
export const tasksHandlers: GatewayRequestHandlers = {
  "tasks.list": ({ params, respond, context, client }) => {
    if (!assertValidParams(params, validateTasksListParams, "tasks.list", respond)) {
      return;
    }
    const cursor = parseCursor(params.cursor);
    if (cursor === null) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "invalid tasks.list cursor"),
      );
      return;
    }
    const statusFilter = normalizeTaskStatusFilter(params.status);
    const limit = Math.min(params.limit ?? DEFAULT_TASKS_LIST_LIMIT, MAX_TASKS_LIST_LIMIT);
    const requestedSessionKey = normalizeOptionalString(params.sessionKey);
    const cfg = context.getRuntimeConfig();
    let sessionKey: string | undefined;
    let sessionAgentId: string | undefined;
    if (requestedSessionKey) {
      const sessionOwner = resolveRequestedSessionAgentId(
        cfg,
        requestedSessionKey,
        normalizeOptionalString(params.agentId),
      );
      if (!sessionOwner.ok) {
        respond(false, undefined, sessionOwner.error);
        return;
      }
      sessionAgentId = sessionOwner.agentId;
      sessionKey = canonicalizeMainSessionAlias({
        cfg,
        agentId: sessionOwner.agentId,
        sessionKey: requestedSessionKey,
      });
    }
    // The ledger pages by last activity so an old long-running task that just
    // finished still surfaces first. Selection stays inside the registry so
    // only the bounded wire page pays for defensive record cloning.
    const page = listTaskRecordPage({
      offset: cursor,
      limit,
      statuses: statusFilter ? [...statusFilter] : undefined,
      agentId: sessionKey ? undefined : params.agentId,
      sessionKey,
      sessionAgentId,
      cfg,
      filter: (task) => canAccessTaskRequesterSession({ cfg, client, task }),
    });
    const nextOffset = cursor + page.tasks.length;
    respond(true, {
      tasks: page.tasks.map((task) => mapTaskSummary(task)),
      ...(page.hasMore ? { nextCursor: String(nextOffset) } : {}),
    });
  },
  "tasks.get": async ({ params, respond, context, client }) => {
    if (!assertValidParams(params, validateTasksGetParams, "tasks.get", respond)) {
      return;
    }
    const taskId = params.taskId;
    const task = getTaskById(taskId);
    const cfg = context.getRuntimeConfig();
    if (!task || !canAccessTaskRequesterSession({ cfg, client, task })) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `task not found: ${taskId}`),
      );
      return;
    }
    // The potentially longer task input is lookup-only. List and event payloads
    // stay compact while detail views can show the operator what was requested.
    respond(true, {
      task: mapTaskSummary(task, { includePrompt: true }),
      toolMessages: await readTaskToolMessages(task, cfg),
    });
  },
  "tasks.cancel": async ({ params, respond, context, client }) => {
    if (!assertValidParams(params, validateTasksCancelParams, "tasks.cancel", respond)) {
      return;
    }
    const taskId = params.taskId;
    const reason = normalizeOptionalString(params.reason);
    const { cancelDetachedTaskRunByIdCore } =
      await import("../../tasks/task-executor-cancel.runtime.js");
    const cfg = context.getRuntimeConfig();
    const task = getTaskById(taskId);
    if (task && !canAccessTaskRequesterSession({ access: "write", cfg, client, task })) {
      respond(true, { found: false, cancelled: false });
      return;
    }
    const result = await cancelDetachedTaskRunByIdCore({
      cfg,
      taskId,
      ...(reason ? { reason } : {}),
    });
    respond(true, {
      found: result.found,
      cancelled: result.cancelled,
      ...(result.reason ? { reason: result.reason } : {}),
      ...(result.task ? { task: mapTaskSummary(result.task) } : {}),
    });
  },
  "tasks.retry": async ({ params, respond, context, client }) => {
    if (!assertValidParams(params, validateTasksRecoveryParams, "tasks.retry", respond)) {
      return;
    }
    const results = [];
    const cfg = context.getRuntimeConfig();
    for (const taskId of params.taskIds) {
      const task = getTaskById(taskId);
      if (task && !canAccessTaskRequesterSession({ access: "write", cfg, client, task })) {
        results.push({ taskId, ok: false, reason: "task not found" });
        continue;
      }
      const result = await retrySubagentCompletionDelivery(taskId);
      results.push({
        taskId,
        ok: result.ok,
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.duplicateRisk ? { duplicateRisk: true } : {}),
        ...(result.task ? { task: mapTaskSummary(result.task, { includePrompt: true }) } : {}),
      });
    }
    respond(true, { results });
  },
  "tasks.dismiss": async ({ params, respond, context, client }) => {
    if (!assertValidParams(params, validateTasksRecoveryParams, "tasks.dismiss", respond)) {
      return;
    }
    const { discardSubagentTerminalDelivery } =
      await import("../../agents/subagents/registry/subagent-registry.js");
    const results = [];
    const cfg = context.getRuntimeConfig();
    for (const taskId of params.taskIds) {
      const task = getTaskById(taskId);
      if (task && !canAccessTaskRequesterSession({ access: "write", cfg, client, task })) {
        results.push({ taskId, ok: false, reason: "task not found" });
        continue;
      }
      const result = await dismissSubagentCompletionDelivery(taskId, {
        discardTerminalDelivery: discardSubagentTerminalDelivery,
      });
      results.push({
        taskId,
        ok: result.ok,
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.task ? { task: mapTaskSummary(result.task, { includePrompt: true }) } : {}),
      });
    }
    respond(true, { results });
  },
};
