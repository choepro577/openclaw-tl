import { createHash } from "node:crypto";
import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
import type { SessionTranscriptReadScope } from "../../config/sessions/session-accessor.js";
import type { TaskRecord } from "../../tasks/task-registry.types.js";
import {
  readSessionMessageByIdAsync,
  readSessionMessageByIdPrefixAsync,
} from "../session-transcript-readers.js";

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function taskFilePrefix(task: TaskRecord): string {
  return `task-files-${digest([task.taskId, task.runId, task.childSessionKey])}:`;
}
export function taskFileRowId(task: TaskRecord, sourceRunId = task.runId): string {
  return `${taskFilePrefix(task)}${digest(sourceRunId)}`;
}
export function legacyTaskFileRowId(task: TaskRecord, sourceRunId = task.runId): string {
  return `task-files-${digest([task.taskId, task.runId, task.childSessionKey, sourceRunId])}`;
}
export type OwnedTaskFileRow = { message: unknown; messageId: string; sourceRunId: string };
function ownedRow(
  task: TaskRecord,
  messageId: string,
  message: unknown,
  sourceRunId?: string,
): OwnedTaskFileRow | undefined {
  const record = asOptionalRecord(message);
  const metadata = asOptionalRecord(record?.["__openclaw"]);
  const source = metadata?.sourceRunId;
  return record?.role === "assistant" &&
    metadata?.messageTaskId === task.taskId &&
    metadata.taskRunId === task.runId &&
    typeof source === "string" &&
    source.length > 0 &&
    (!sourceRunId || source === sourceRunId) &&
    [taskFileRowId(task, source), legacyTaskFileRowId(task, source)].includes(messageId)
    ? { message, messageId, sourceRunId: source }
    : undefined;
}

/** Exact v1 probes preserve existing backing; v2 recovery uses an indexed active-row namespace. */
export async function readOwnedTaskFileRow(
  scope: SessionTranscriptReadScope,
  task: TaskRecord,
  sourceRunId?: string,
): Promise<OwnedTaskFileRow | undefined> {
  if (scope.sessionKey !== task.requesterSessionKey || !task.childSessionKey || !task.runId) {
    return undefined;
  }
  if (sourceRunId) {
    for (const id of [taskFileRowId(task, sourceRunId), legacyTaskFileRowId(task, sourceRunId)]) {
      const row = await readSessionMessageByIdAsync(scope, id);
      const owned = ownedRow(task, id, row.message, sourceRunId);
      if (owned) {
        return owned;
      }
    }
    return undefined;
  }
  const latest = await readSessionMessageByIdPrefixAsync(scope, taskFilePrefix(task));
  const owned = latest.messageId ? ownedRow(task, latest.messageId, latest.message) : undefined;
  if (owned) {
    return owned;
  }
  const id = legacyTaskFileRowId(task);
  const legacy = await readSessionMessageByIdAsync(scope, id);
  return ownedRow(task, id, legacy.message, task.runId);
}
