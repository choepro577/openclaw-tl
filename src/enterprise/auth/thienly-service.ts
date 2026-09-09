import { createHash } from "node:crypto";
import { z } from "zod";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { readResponseWithLimit } from "../../infra/http-body.js";
import { runOpenClawStateWriteTransaction } from "../../state/openclaw-state-db.js";
import {
  createEnterpriseAccount,
  getEnterpriseAccountById,
  getEnterpriseAccountByUsername,
} from "../accounts/account-store.js";
import { appendEnterpriseAuditEvent } from "../audit/audit-store.js";
import { projectEnterpriseRuntimeConfig } from "../isolation/enterprise-gateway-policy.js";
import { buildEnterpriseUserBootstrapV2 } from "../user/user-bootstrap-service.js";
import { verifyEnterprisePassword } from "./password.js";
import {
  bindThienLyIdentity,
  getThienLyAttempt,
  getThienLyBinding,
  getThienLyBindingForAccount,
  updateThienLyAttempt,
  type ThienLyAttempt,
} from "./thienly-store.js";

export class ThienLyAuthError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

export function hashThienLyValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function resolveThienLyConfig(config: OpenClawConfig) {
  const settings = config.enterprise?.thienly;
  if (!settings?.enabled) {
    throw new ThienLyAuthError("THIENLY_UNAVAILABLE", 503);
  }
  const secret = process.env[settings.clientSecretEnv]?.trim();
  if (!secret || secret.length > 255) {
    throw new ThienLyAuthError("THIENLY_UNAVAILABLE", 503);
  }
  for (const value of [settings.webBaseUrl, settings.apiBaseUrl, settings.callbackUrl]) {
    const url = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
    ) {
      throw new ThienLyAuthError("THIENLY_CONFIG_INVALID", 503);
    }
  }
  if (!new URL(settings.callbackUrl).pathname.endsWith("/api/auth/user/thienly/callback")) {
    throw new ThienLyAuthError("THIENLY_CONFIG_INVALID", 503);
  }
  return {
    ...settings,
    secret,
    fingerprint: hashThienLyValue(
      JSON.stringify([
        settings.apiBaseUrl,
        settings.webBaseUrl,
        settings.callbackUrl,
        settings.clientId,
        secret,
      ]),
    ),
  };
}

const identitySchema = z.object({
  subject: z.string().max(160),
  company_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  staff_code: z.string().max(256),
  display_name: z.string().trim().min(1).max(128),
});

export async function exchangeThienLyCode(
  attempt: ThienLyAttempt,
  code: string,
  config: OpenClawConfig,
): Promise<void> {
  const settings = resolveThienLyConfig(config);
  if (settings.fingerprint !== attempt.configFingerprint) {
    throw new ThienLyAuthError("THIENLY_CONFIG_CHANGED", 409);
  }
  const response = await fetch(`${settings.apiBaseUrl.replace(/\/$/, "")}/maap/connect/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: settings.clientId,
      client_secret: settings.secret,
      redirect_uri: settings.callbackUrl,
      code,
      code_verifier: attempt.verifier,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  // Only the configured backend's bounded, validated identity crosses this trust boundary.
  const raw = (await readResponseWithLimit(response, 16_384, { timeoutMs: 10_000 })).toString(
    "utf8",
  );
  const envelope = z
    .object({ success: z.boolean(), data: z.unknown(), msg_code: z.string().optional() })
    .safeParse(JSON.parse(raw));
  if (!response.ok || !envelope.success || !envelope.data.success) {
    const missingCode = envelope.success && envelope.data.msg_code === "EMPLOYEE_CODE_REQUIRED";
    throw new ThienLyAuthError(
      missingCode ? "EMPLOYEE_CODE_REQUIRED" : "THIENLY_VERIFICATION_FAILED",
      401,
    );
  }
  const payload = envelope.data.data;
  if (
    payload &&
    typeof payload === "object" &&
    (!("staff_code" in payload) ||
      payload.staff_code == null ||
      (typeof payload.staff_code === "string" && !payload.staff_code.trim()))
  ) {
    throw new ThienLyAuthError("EMPLOYEE_CODE_REQUIRED", 401);
  }
  const identity = identitySchema.safeParse(payload);
  if (!identity.success) {
    throw new ThienLyAuthError("THIENLY_IDENTITY_INVALID", 401);
  }
  const value = identity.data;
  if (
    value.subject !== `comnieu:${value.company_id}:${value.user_id}` ||
    !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(value.staff_code.trim().toLowerCase())
  ) {
    throw new ThienLyAuthError("EMPLOYEE_CODE_INVALID", 401);
  }
  updateThienLyAttempt(attempt.id, ["verifying"], { identity: value, phase: "account" });
}

function assertBoundAccount(attempt: ThienLyAttempt) {
  const identity = attempt.identity;
  if (!identity || !attempt.accountId) {
    throw new ThienLyAuthError("THIENLY_IDENTITY_INVALID", 409);
  }
  const binding = getThienLyBinding(identity.subject);
  const account = getEnterpriseAccountById(attempt.accountId);
  if (!binding || binding.accountId !== account?.id || !account.enabled) {
    throw new ThienLyAuthError("THIENLY_ACCOUNT_UNAVAILABLE", 403);
  }
  if (
    binding.staffCode !== identity.staff_code ||
    account.username !== identity.staff_code.trim().toLowerCase()
  ) {
    throw new ThienLyAuthError("EMPLOYEE_CODE_CHANGED", 409);
  }
  return account;
}

/** The account and external identity commit together; workspace preparation can safely resume. */
export function provisionThienLyAccount(id: string, config: OpenClawConfig): ThienLyAttempt {
  let attempt = getThienLyAttempt(id);
  if (!attempt) {
    throw new ThienLyAuthError("THIENLY_ATTEMPT_NOT_FOUND", 404);
  }
  if (attempt.phase === "account") {
    attempt = runOpenClawStateWriteTransaction(() => {
      const current = getThienLyAttempt(id)!;
      if (current.phase !== "account" || !current.identity) {
        throw new ThienLyAuthError("THIENLY_ATTEMPT_STATE", 409);
      }
      const identity = current.identity;
      const username = identity.staff_code.trim().toLowerCase();
      const binding = getThienLyBinding(identity.subject);
      let account = binding
        ? getEnterpriseAccountById(binding.accountId)
        : getEnterpriseAccountByUsername(username);
      if (
        binding &&
        (binding.staffCode !== identity.staff_code || account?.username !== username)
      ) {
        throw new ThienLyAuthError("EMPLOYEE_CODE_CHANGED", 409);
      }
      if (account && !account.enabled) {
        throw new ThienLyAuthError("THIENLY_ACCOUNT_UNAVAILABLE", 403);
      }
      if (!binding && account) {
        if (getThienLyBindingForAccount(account.id)) {
          throw new ThienLyAuthError("THIENLY_IDENTITY_CONFLICT", 409);
        }
        return updateThienLyAttempt(id, ["account"], {
          phase: "link_required",
          accountId: account.id,
          account: { username: account.username, displayName: account.displayName },
        });
      }
      if (!account) {
        account = createEnterpriseAccount({
          config,
          username,
          displayName: identity.display_name,
          // This non-hash cannot be verified by the password login path. There is no default password.
          passwordHash: "external:thienly",
          role: "employee",
          mustChangePassword: false,
          personalAgentEnabled: true,
          accessPresetKey: "basic@1",
          initialEntitlements: [],
        });
        bindThienLyIdentity(identity, account.id, username);
        appendEnterpriseAuditEvent({
          actorAccountId: account.id,
          actorSessionId: null,
          action: "account.thienly.create",
          targetType: "account",
          targetId: account.id,
          requestId: null,
          before: null,
          after: { username, accessPresetKey: "basic@1" },
          outcome: "success",
        });
      }
      return updateThienLyAttempt(id, ["account"], {
        phase: "agent",
        accountId: account.id,
        account: { username: account.username, displayName: account.displayName },
      });
    });
  }
  if (attempt.phase === "agent") {
    const account = assertBoundAccount(attempt);
    // The canonical projection creates private workspaces and enforces the account's existing grants.
    projectEnterpriseRuntimeConfig(config, account, { userAudience: true });
    const bootstrap = buildEnterpriseUserBootstrapV2(config, account);
    if (
      account.personalAgentEnabled &&
      !bootstrap.agents.some(
        (agent) =>
          agent.key === "personal" && agent.availability === "ready" && agent.actions.canChat,
      )
    ) {
      throw new ThienLyAuthError("THIENLY_AGENT_NOT_READY", 503);
    }
    attempt = updateThienLyAttempt(id, ["agent"], { phase: "ready" });
  }
  return attempt;
}

export async function linkThienLyAccount(id: string, password: string, config: OpenClawConfig) {
  const attempt = getThienLyAttempt(id);
  if (!attempt || attempt.phase !== "link_required" || !attempt.identity || !attempt.accountId) {
    throw new ThienLyAuthError("THIENLY_ATTEMPT_STATE", 409);
  }
  if (attempt.linkFailures >= 5) {
    throw new ThienLyAuthError("THIENLY_LINK_RATE_LIMITED", 429);
  }
  const account = getEnterpriseAccountByUsername(attempt.identity.staff_code.trim().toLowerCase());
  const valid =
    account?.id === attempt.accountId &&
    account.enabled &&
    (await verifyEnterprisePassword(password, account.passwordHash));
  if (!valid) {
    const current = getThienLyAttempt(id)!;
    updateThienLyAttempt(id, ["link_required"], { linkFailures: current.linkFailures + 1 });
    throw new ThienLyAuthError("INVALID_CREDENTIALS", 401);
  }
  // Recheck after scrypt: cancellation, expiry, password reset and account lock win the race.
  runOpenClawStateWriteTransaction(() => {
    const current = getThienLyAttempt(id)!;
    const latest = getEnterpriseAccountByUsername(account.username);
    if (
      current.phase !== "link_required" ||
      !current.identity ||
      !latest?.enabled ||
      latest.passwordHash !== account.passwordHash ||
      latest.id !== current.accountId
    ) {
      throw new ThienLyAuthError("THIENLY_ATTEMPT_STATE", 409);
    }
    bindThienLyIdentity(current.identity, latest.id, latest.username);
    updateThienLyAttempt(id, ["link_required"], { phase: "agent" });
    appendEnterpriseAuditEvent({
      actorAccountId: latest.id,
      actorSessionId: null,
      action: "account.thienly.link",
      targetType: "account",
      targetId: latest.id,
      requestId: null,
      before: null,
      after: { username: latest.username },
      outcome: "success",
    });
  });
  return provisionThienLyAccount(id, config);
}

export function thienLyCompletionAccount(attempt: ThienLyAttempt) {
  if (!["ready", "completed"].includes(attempt.phase)) {
    throw new ThienLyAuthError("THIENLY_ATTEMPT_STATE", 409);
  }
  return assertBoundAccount(attempt);
}
