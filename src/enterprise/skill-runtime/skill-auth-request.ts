import { generateSecureUuid } from "../../infra/secure-random.js";
import { resolveGlobalSingleton } from "../../shared/global-singleton.js";

const DEFAULT_AUTH_WAIT_MS = 5 * 60_000;

export type EnterpriseSkillAuthField = {
  id: string;
  label: string;
  type: "text" | "password";
};

export type EnterpriseSkillAuthRequired = {
  requestId: string;
  parentSessionKey: string;
  taskId?: string;
  agentId: string;
  skillKey: string;
  fields: EnterpriseSkillAuthField[];
  expiresAt: string;
};

type PendingAuth = EnterpriseSkillAuthRequired & {
  accountId: string;
  childSessionKey: string;
  childRunId: string;
  delegatedChild: boolean;
  assertActive?: () => void;
  resolving: boolean;
  resolve: () => void;
  reject: (error: EnterpriseSkillAuthRequestError) => void;
  timer: ReturnType<typeof setTimeout>;
  abort?: () => void;
};

export class EnterpriseSkillAuthRequestError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "EnterpriseSkillAuthRequestError";
  }
}

const pending = resolveGlobalSingleton<Map<string, PendingAuth>>(
  Symbol.for("openclaw.enterprise.pendingSkillAuth"),
  () => new Map(),
);
const listeners = resolveGlobalSingleton<
  Set<(event: EnterpriseSkillAuthRequired & { accountId: string }) => void>
>(Symbol.for("openclaw.enterprise.skillAuthListeners"), () => new Set());

function publicRequest(item: PendingAuth): EnterpriseSkillAuthRequired {
  return {
    requestId: item.requestId,
    parentSessionKey: item.parentSessionKey,
    ...(item.taskId ? { taskId: item.taskId } : {}),
    agentId: item.agentId,
    skillKey: item.skillKey,
    fields: item.fields,
    expiresAt: item.expiresAt,
  };
}

function remove(item: PendingAuth): void {
  pending.delete(item.requestId);
  clearTimeout(item.timer);
  item.abort?.();
}

function reject(item: PendingAuth, code: string): void {
  remove(item);
  item.reject(new EnterpriseSkillAuthRequestError(code));
}

export function onEnterpriseSkillAuthRequired(
  listener: (event: EnterpriseSkillAuthRequired & { accountId: string }) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function waitForEnterpriseSkillAuth(params: {
  accountId: string;
  parentSessionKey: string;
  childSessionKey: string;
  childRunId: string;
  delegatedChild?: boolean;
  assertActive?: () => void;
  taskId?: string;
  agentId: string;
  skillKey: string;
  fields: EnterpriseSkillAuthField[];
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<void> {
  if (params.signal?.aborted) {
    return Promise.reject(new EnterpriseSkillAuthRequestError("SKILL_AUTH_CANCELLED"));
  }
  params.assertActive?.();
  return new Promise<void>((resolve, rejectPromise) => {
    const requestId = generateSecureUuid();
    const expiresAtMs = Date.now() + (params.timeoutMs ?? DEFAULT_AUTH_WAIT_MS);
    const item = {
      requestId,
      parentSessionKey: params.parentSessionKey,
      ...(params.taskId ? { taskId: params.taskId } : {}),
      agentId: params.agentId,
      skillKey: params.skillKey,
      fields: params.fields.map((field) => ({ ...field })),
      expiresAt: new Date(expiresAtMs).toISOString(),
      accountId: params.accountId,
      childSessionKey: params.childSessionKey,
      childRunId: params.childRunId,
      delegatedChild: params.delegatedChild ?? true,
      assertActive: params.assertActive,
      resolving: false,
      resolve,
      reject: rejectPromise,
      timer: undefined as unknown as ReturnType<typeof setTimeout>,
      abort: undefined as (() => void) | undefined,
    } satisfies PendingAuth;
    item.timer = setTimeout(() => reject(item, "SKILL_AUTH_TIMEOUT"), expiresAtMs - Date.now());
    if (params.signal) {
      const onAbort = () => reject(item, "SKILL_AUTH_CANCELLED");
      params.signal.addEventListener("abort", onAbort, { once: true });
      item.abort = () => params.signal?.removeEventListener("abort", onAbort);
    }
    pending.set(requestId, item);
    const event = { ...publicRequest(item), accountId: item.accountId };
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // One observer cannot strand the waiting child or block other observers.
      }
    }
  });
}

export function readEnterpriseSkillAuthRequest(requestId: string):
  | (EnterpriseSkillAuthRequired & {
      accountId: string;
      childSessionKey: string;
      childRunId: string;
      delegatedChild: boolean;
      resolving: boolean;
    })
  | undefined {
  const item = pending.get(requestId);
  return item
    ? {
        ...publicRequest(item),
        accountId: item.accountId,
        childSessionKey: item.childSessionKey,
        childRunId: item.childRunId,
        delegatedChild: item.delegatedChild,
        resolving: item.resolving,
      }
    : undefined;
}

export function claimEnterpriseSkillAuthRequest(params: {
  requestId: string;
  accountId: string;
  parentSessionKey: string;
  skillKey: string;
}):
  | { ok: true; request: NonNullable<ReturnType<typeof readEnterpriseSkillAuthRequest>> }
  | { ok: false; code: string } {
  const item = pending.get(params.requestId);
  if (!item) {
    return { ok: false, code: "SKILL_AUTH_REQUEST_NOT_FOUND" };
  }
  if (
    item.accountId !== params.accountId ||
    item.parentSessionKey !== params.parentSessionKey ||
    item.skillKey !== params.skillKey
  ) {
    return { ok: false, code: "SKILL_AUTH_REQUEST_MISMATCH" };
  }
  if (item.resolving) {
    return { ok: false, code: "SKILL_AUTH_REQUEST_BUSY" };
  }
  try {
    item.assertActive?.();
  } catch {
    reject(item, "SKILL_AUTH_REVOKED");
    return { ok: false, code: "SKILL_AUTH_REVOKED" };
  }
  item.resolving = true;
  return { ok: true, request: readEnterpriseSkillAuthRequest(params.requestId)! };
}

export function releaseEnterpriseSkillAuthRequest(requestId: string): void {
  const item = pending.get(requestId);
  if (item) {
    item.resolving = false;
  }
}

export function resolveEnterpriseSkillAuthRequest(requestId: string): boolean {
  const item = pending.get(requestId);
  if (!item) {
    return false;
  }
  try {
    item.assertActive?.();
  } catch {
    reject(item, "SKILL_AUTH_REVOKED");
    return false;
  }
  remove(item);
  item.resolve();
  return true;
}

export function cancelEnterpriseSkillAuthRequest(params: {
  requestId: string;
  accountId: string;
  parentSessionKey: string;
  skillKey: string;
}): boolean {
  const item = pending.get(params.requestId);
  if (
    !item ||
    item.accountId !== params.accountId ||
    item.parentSessionKey !== params.parentSessionKey ||
    item.skillKey !== params.skillKey
  ) {
    return false;
  }
  reject(item, "SKILL_AUTH_CANCELLED");
  return true;
}

export function cancelEnterpriseSkillAuthForChild(
  childSessionKey: string,
  childRunId?: string,
): number {
  const matches = [...pending.values()].filter(
    (item) =>
      item.childSessionKey === childSessionKey && (!childRunId || item.childRunId === childRunId),
  );
  matches.forEach((item) => reject(item, "SKILL_AUTH_REVOKED"));
  return matches.length;
}

export function cancelEnterpriseSkillAuthForAccountSkill(
  accountId: string,
  skillKey?: string,
): number {
  const matches = [...pending.values()].filter(
    (item) => item.accountId === accountId && (!skillKey || item.skillKey === skillKey),
  );
  matches.forEach((item) => reject(item, "SKILL_AUTH_REVOKED"));
  return matches.length;
}

export function resetEnterpriseSkillAuthRequestsForTest(): void {
  for (const item of pending.values()) {
    reject(item, "SKILL_AUTH_CANCELLED");
  }
  listeners.clear();
}
