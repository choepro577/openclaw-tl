import { getSafeSessionStorage } from "../../../local-storage.ts";
import {
  enterpriseApiPath,
  requestEnterpriseUserJson,
} from "../../enterprise/services/enterprise-api.ts";
import type { EnterpriseUserAuthAccount } from "./user-enterprise-api.ts";

export const THIENLY_ATTEMPT_STORAGE_KEY = "openclaw.enterprise-user.thienly-attempt.v1";
export const THIENLY_SUCCESS_DEADLINE_STORAGE_KEY =
  "openclaw.enterprise-user.thienly-success-deadline.v1";

export const THIENLY_PHASES = [
  "waiting",
  "verifying",
  "account",
  "link_required",
  "agent",
  "ready",
  "completed",
  "cancelled",
  "failed",
  "expired",
] as const;

export type ThienlyPhase = (typeof THIENLY_PHASES)[number];

export type ThienlyAttemptEvent = {
  sequence: number;
  phase: ThienlyPhase;
  at: number | string;
};

export type ThienlyAttemptAccount = {
  username: string;
  displayName: string;
};

export type ThienlyAttemptError = {
  code: string;
  message: string;
};

export type ThienlyAttempt = {
  id: string;
  phase: ThienlyPhase;
  events: ThienlyAttemptEvent[];
  expiresAt: number | string;
  error?: ThienlyAttemptError;
  account?: ThienlyAttemptAccount;
};

export type ThienlyAuthConfig = {
  enabled: boolean;
};

export type ThienlyStartResult = {
  attempt: ThienlyAttempt;
  authorizationUrl: string;
};

export type ThienlyCompleteResult = {
  account: EnterpriseUserAuthAccount;
  csrfToken: string;
};

export function storedThienlyAttemptId(): string | null {
  try {
    return getSafeSessionStorage()?.getItem(THIENLY_ATTEMPT_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function storedThienlySuccessDeadline(): number | null {
  try {
    const value = Number(getSafeSessionStorage()?.getItem(THIENLY_SUCCESS_DEADLINE_STORAGE_KEY));
    return Number.isFinite(value) && value > Date.now() ? value : null;
  } catch {
    return null;
  }
}

export function clearThienlyPendingState(): void {
  try {
    const storage = getSafeSessionStorage();
    storage?.removeItem(THIENLY_ATTEMPT_STORAGE_KEY);
    storage?.removeItem(THIENLY_SUCCESS_DEADLINE_STORAGE_KEY);
  } catch {
    // Private browsing and blocked storage do not prevent normal sign-in.
  }
}

export function loadThienlyAuthConfig(): Promise<ThienlyAuthConfig> {
  return requestEnterpriseUserJson<ThienlyAuthConfig>("/api/auth/user/thienly/config");
}

export function startThienlyLogin(): Promise<ThienlyStartResult> {
  return requestEnterpriseUserJson<ThienlyStartResult>("/api/auth/user/thienly/start", {
    method: "POST",
    body: "{}",
  });
}

export function loadThienlyAttempt(attemptId: string): Promise<{ attempt: ThienlyAttempt }> {
  return requestEnterpriseUserJson<{ attempt: ThienlyAttempt }>(
    `/api/auth/user/thienly/attempts/${encodeURIComponent(attemptId)}`,
  );
}

export function linkThienlyAttempt(
  attemptId: string,
  password: string,
): Promise<{ attempt: ThienlyAttempt }> {
  return requestEnterpriseUserJson<{ attempt: ThienlyAttempt }>(
    `/api/auth/user/thienly/attempts/${encodeURIComponent(attemptId)}/link`,
    { method: "POST", body: JSON.stringify({ password }) },
  );
}

export function completeThienlyAttempt(attemptId: string): Promise<ThienlyCompleteResult> {
  return requestEnterpriseUserJson<ThienlyCompleteResult>(
    `/api/auth/user/thienly/attempts/${encodeURIComponent(attemptId)}/complete`,
    { method: "POST", body: "{}" },
  );
}

export function cancelThienlyAttempt(attemptId: string): Promise<{ attempt: ThienlyAttempt }> {
  return requestEnterpriseUserJson<{ attempt: ThienlyAttempt }>(
    `/api/auth/user/thienly/attempts/${encodeURIComponent(attemptId)}/cancel`,
    { method: "POST", body: "{}" },
  );
}

export function thienlyAttemptEventsUrl(attemptId: string): string {
  return enterpriseApiPath(
    `/api/auth/user/thienly/attempts/${encodeURIComponent(attemptId)}/events`,
  );
}

export function isThienlyTerminalPhase(phase: ThienlyPhase): boolean {
  return (
    phase === "completed" || phase === "cancelled" || phase === "failed" || phase === "expired"
  );
}
