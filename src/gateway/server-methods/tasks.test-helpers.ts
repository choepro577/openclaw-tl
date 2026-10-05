import { expectDefined } from "@openclaw/normalization-core";
import { createTaskRecord as createTaskRecordOrNull } from "../../tasks/runtime-internal.js";
import type { TaskRecord } from "../../tasks/task-registry.types.js";
import { tasksHandlers } from "./tasks.js";
import type { GatewayClient, RespondFn } from "./types.js";

type TaskResponsePayload = {
  tasks?: Array<Record<string, unknown>>;
  task?: Record<string, unknown>;
  toolMessages?: unknown[];
  found?: boolean;
  cancelled?: boolean;
  nextCursor?: string;
  results?: Array<{ taskId?: string; ok?: boolean; reason?: string }>;
};

export function createTaskRecord(params: Parameters<typeof createTaskRecordOrNull>[0]): TaskRecord {
  const task = createTaskRecordOrNull(params);
  if (!task) {
    throw new Error("expected task creation to succeed");
  }
  return task;
}

function captureRespond() {
  const calls: Parameters<RespondFn>[] = [];
  const respond: RespondFn = (...args) => {
    calls.push(args);
  };
  return { calls, respond };
}

function createContext(config: Record<string, unknown> = {}) {
  return {
    getRuntimeConfig: () => config,
  } as never;
}

export async function runTaskHandler(
  method: "tasks.list" | "tasks.get" | "tasks.cancel" | "tasks.retry" | "tasks.dismiss",
  params: Record<string, unknown>,
  config: Record<string, unknown> = {},
  client: GatewayClient | null = null,
) {
  const { calls, respond } = captureRespond();
  await expectDefined(
    tasksHandlers[method],
    "tasksHandlers[method] test invariant",
  )({
    req: { type: "req", id: `req-${method}`, method },
    params,
    respond,
    context: createContext(config),
    client,
    isWebchatConnect: () => false,
  });
  return {
    calls,
    payload: calls[0]?.[1] as TaskResponsePayload | undefined,
  };
}
