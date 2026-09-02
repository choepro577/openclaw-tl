import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { CronJob, CronJobCreate, CronJobPatch } from "../../cron/types.js";
import { cronHandlers } from "../../gateway/server-methods/cron.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import {
  EnterpriseGatewayMethodError,
  invokeEnterpriseGatewayHandler,
} from "../gateway/invoke-handler.js";
import { prepareEnterpriseGatewayRequest } from "../isolation/enterprise-gateway-policy.js";
import type {
  UserAutomation,
  UserAutomationInput,
  UserAutomationSchedule,
} from "./user-api-contracts.js";
import {
  createEnterpriseUserGatewayClient,
  resolveEnterpriseUserAgentKey,
  resolveEnterpriseUserRuntimeAgentId,
} from "./user-gateway-client.js";

type CronReadView = CronJob & {
  configRevision: string;
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  lastRunStatus?: "ok" | "error" | "skipped";
  lastRunError?: string;
};

type UserAutomationRuntime = {
  config: OpenClawConfig;
  context: GatewayRequestContext;
  account: EnterpriseAccount;
  sessionId: string;
};

export function parseUserAutomationInput(value: unknown): UserAutomationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("FIELD_INVALID:automation");
  }
  const source = value as Record<string, unknown>;
  if (
    Object.keys(source).some(
      (key) => !["name", "enabled", "agentKey", "schedule", "prompt"].includes(key),
    ) ||
    typeof source.name !== "string" ||
    typeof source.enabled !== "boolean" ||
    typeof source.agentKey !== "string" ||
    typeof source.prompt !== "string" ||
    !source.schedule ||
    typeof source.schedule !== "object" ||
    Array.isArray(source.schedule)
  ) {
    throw new Error("FIELD_INVALID:automation");
  }
  const schedule = source.schedule as Record<string, unknown>;
  const parsedSchedule: UserAutomationSchedule =
    schedule.kind === "once" && typeof schedule.at === "string"
      ? { kind: "once", at: schedule.at }
      : schedule.kind === "interval" && typeof schedule.everyMinutes === "number"
        ? { kind: "interval", everyMinutes: schedule.everyMinutes }
        : (() => {
            throw new Error("FIELD_INVALID:schedule");
          })();
  if (
    (source.agentKey !== "personal" && !source.agentKey.startsWith("shared:")) ||
    Object.keys(schedule).some((key) =>
      parsedSchedule.kind === "once"
        ? !["kind", "at"].includes(key)
        : !["kind", "everyMinutes"].includes(key),
    )
  ) {
    throw new Error("FIELD_INVALID:automation");
  }
  return validateInput({
    name: source.name,
    enabled: source.enabled,
    agentKey: source.agentKey as UserAutomationInput["agentKey"],
    schedule: parsedSchedule,
    prompt: source.prompt,
  });
}

function validateInput(input: UserAutomationInput): UserAutomationInput {
  const name = input.name.trim();
  const prompt = input.prompt.trim();
  if (!name || name.length > 128 || !prompt || prompt.length > 4_000) {
    throw new Error("FIELD_INVALID:automation");
  }
  if (input.schedule.kind === "once") {
    const timestamp = Date.parse(input.schedule.at);
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
      throw new Error("FIELD_INVALID:schedule");
    }
  } else if (
    input.schedule.kind !== "interval" ||
    !Number.isSafeInteger(input.schedule.everyMinutes) ||
    input.schedule.everyMinutes < 1 ||
    input.schedule.everyMinutes > 525_600
  ) {
    throw new Error("FIELD_INVALID:schedule");
  }
  return { ...input, name, prompt };
}

function toCronSchedule(schedule: UserAutomationSchedule): CronJob["schedule"] {
  return schedule.kind === "once"
    ? { kind: "at", at: new Date(schedule.at).toISOString() }
    : { kind: "every", everyMs: schedule.everyMinutes * 60_000 };
}

function fromCronSchedule(schedule: CronJob["schedule"]): UserAutomationSchedule | null {
  if (schedule.kind === "at") {
    return { kind: "once", at: schedule.at };
  }
  if (schedule.kind === "every") {
    return { kind: "interval", everyMinutes: Math.max(1, Math.round(schedule.everyMs / 60_000)) };
  }
  return null;
}

function toUserAutomation(
  runtime: UserAutomationRuntime,
  job: CronReadView,
): UserAutomation | null {
  const schedule = fromCronSchedule(job.schedule);
  if (job.payload.kind !== "agentTurn" || !schedule) {
    return null;
  }
  const agentKey = resolveEnterpriseUserAgentKey(runtime.config, runtime.account, job.agentId);
  return {
    id: job.id,
    revision: job.configRevision,
    name: job.name,
    enabled: job.enabled,
    agentKey,
    agentAccess: agentKey ? "ready" : "removed",
    schedule,
    prompt: job.payload.message,
    nextRunAt: job.nextRunAtMs ?? job.state.nextRunAtMs ?? null,
    lastRunAt: job.lastRunAtMs ?? job.state.lastRunAtMs ?? null,
    lastResult: job.lastRunStatus ?? job.state.lastRunStatus ?? job.state.lastStatus ?? null,
    lastError: job.lastRunError ?? job.state.lastError ?? null,
  };
}

async function invoke(
  runtime: UserAutomationRuntime,
  method: keyof typeof cronHandlers,
  params: Record<string, unknown>,
): Promise<unknown> {
  const client = createEnterpriseUserGatewayClient(runtime.account, runtime.sessionId);
  const admission = prepareEnterpriseGatewayRequest({
    client,
    context: runtime.context,
    method,
    requestParams: params,
  });
  if (!admission.allowed) {
    throw new Error("RUNTIME_UNAVAILABLE");
  }
  return invokeEnterpriseGatewayHandler(
    cronHandlers[method],
    method,
    params,
    admission.context,
    client,
  );
}

export async function listUserAutomations(
  runtime: UserAutomationRuntime,
): Promise<UserAutomation[]> {
  const result = (await invoke(runtime, "cron.list", {
    includeDisabled: true,
    includeDeliveryPreviews: false,
    limit: 200,
  })) as { jobs?: CronReadView[] };
  return (result.jobs ?? [])
    .map((job) => toUserAutomation(runtime, job))
    .filter((job): job is UserAutomation => job !== null);
}

export async function createUserAutomation(
  runtime: UserAutomationRuntime,
  rawInput: UserAutomationInput,
): Promise<UserAutomation> {
  const input = validateInput(rawInput);
  const agentId = resolveEnterpriseUserRuntimeAgentId(
    runtime.config,
    runtime.account,
    input.agentKey,
  );
  const job: CronJobCreate = {
    name: input.name,
    enabled: input.enabled,
    agentId,
    schedule: toCronSchedule(input.schedule),
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: { kind: "agentTurn", message: input.prompt },
    delivery: { mode: "none" },
    deleteAfterRun: input.schedule.kind === "once",
  };
  const result = (await invoke(runtime, "cron.add", job as unknown as Record<string, unknown>)) as
    | CronReadView
    | { job: CronReadView };
  const projected = toUserAutomation(runtime, "job" in result ? result.job : result);
  if (!projected) {
    throw new Error("RUNTIME_UNAVAILABLE");
  }
  return projected;
}

export async function updateUserAutomation(
  runtime: UserAutomationRuntime,
  id: string,
  revision: string,
  rawInput: UserAutomationInput,
): Promise<UserAutomation> {
  const input = validateInput(rawInput);
  const patch: CronJobPatch = {
    name: input.name,
    enabled: input.enabled,
    agentId: resolveEnterpriseUserRuntimeAgentId(runtime.config, runtime.account, input.agentKey),
    schedule: toCronSchedule(input.schedule),
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: { kind: "agentTurn", message: input.prompt },
    delivery: { mode: "none" },
    deleteAfterRun: input.schedule.kind === "once",
  };
  try {
    const result = (await invoke(runtime, "cron.update", {
      id,
      expectedConfigRevision: revision,
      patch,
    })) as CronReadView;
    const projected = toUserAutomation(runtime, result);
    if (!projected) {
      throw new Error("RUNTIME_UNAVAILABLE");
    }
    return projected;
  } catch (error) {
    if (
      error instanceof EnterpriseGatewayMethodError &&
      typeof error.gatewayError.details === "object" &&
      error.gatewayError.details !== null &&
      "code" in error.gatewayError.details &&
      error.gatewayError.details.code === "CRON_JOB_CHANGED"
    ) {
      throw new Error("AUTOMATION_REVISION_CONFLICT");
    }
    if (
      error instanceof EnterpriseGatewayMethodError &&
      error.gatewayError.message.includes("unknown cron job")
    ) {
      throw new Error("AUTOMATION_NOT_FOUND");
    }
    throw error;
  }
}

export async function deleteUserAutomation(
  runtime: UserAutomationRuntime,
  id: string,
): Promise<void> {
  try {
    await invoke(runtime, "cron.remove", { id });
  } catch (error) {
    if (error instanceof EnterpriseGatewayMethodError) {
      throw new Error("AUTOMATION_NOT_FOUND");
    }
    throw error;
  }
}

export async function runUserAutomation(runtime: UserAutomationRuntime, id: string): Promise<void> {
  try {
    await invoke(runtime, "cron.run", { id, mode: "force" });
  } catch (error) {
    if (error instanceof EnterpriseGatewayMethodError) {
      throw new Error("AUTOMATION_NOT_FOUND");
    }
    throw error;
  }
}
