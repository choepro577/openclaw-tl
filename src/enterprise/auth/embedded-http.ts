import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { createAuthRateLimiter } from "../../gateway/auth-rate-limit.js";
import { readResponseWithLimit } from "../../infra/http-body.js";
import { runOpenClawStateWriteTransaction } from "../../state/openclaw-state-db.js";
import { markEnterpriseAccountLogin } from "../accounts/account-store.js";
import { readJson, sendJson } from "../knowledge/enterprise-knowledge-http-common.js";
import {
  buildEnterpriseUserBootstrapV2,
  presentEnterpriseUserAuthAccount,
} from "../user/user-bootstrap-service.js";
import { authenticateEnterpriseRequest, logoutEnterprisePrincipal } from "./auth-service.js";
import {
  clearEnterpriseEmbedAuthCookie,
  createEnterpriseEmbedAuthCookie,
  hasEnterpriseEmbedAuthCookie,
} from "./cookie.js";
import { issueEnterpriseCsrfToken, issueEnterpriseJwt } from "./jwt.js";
import { createEnterpriseSession } from "./session-store.js";
import {
  hashThienLyValue,
  linkThienLyAccount,
  provisionThienLyAccount,
  resolveThienLyConfig,
  thienLyCompletionAccount,
  ThienLyAuthError,
  validateThienLyIdentity,
} from "./thienly-service.js";
import {
  createThienLyAttempt,
  getThienLyAttempt,
  updateThienLyAttempt,
  ThienLyStoreError,
} from "./thienly-store.js";

const PREFIX = "/api/auth/user/embedded";
const BROWSER_COOKIE = "__Secure-openclaw_embed_browser";
const bootstrapLimiter = createAuthRateLimiter({
  maxAttempts: 20,
  windowMs: 600_000,
  exemptLoopback: false,
});
const linkLimiter = createAuthRateLimiter({
  maxAttempts: 5,
  windowMs: 900_000,
  lockoutMs: 900_000,
  exemptLoopback: false,
});

function randomValue(): string {
  return randomBytes(32).toString("base64url");
}

function ownAttempt(req: IncomingMessage, id: string, fingerprint: string) {
  const cookie = req.headers.cookie ?? "";
  const browser =
    cookie.length <= 16_384
      ? cookie
          .split(";")
          .map((part) => part.trim())
          .find((part) => part.startsWith(`${BROWSER_COOKIE}=`))
          ?.slice(BROWSER_COOKIE.length + 1)
      : undefined;
  const attempt =
    browser && /^[A-Za-z0-9_-]{43}$/.test(browser) ? getThienLyAttempt(id) : undefined;
  if (!attempt || attempt.browserHash !== hashThienLyValue(browser!)) {
    throw new ThienLyAuthError("THIENLY_ATTEMPT_NOT_FOUND", 404);
  }
  if (attempt.configFingerprint !== fingerprint) {
    throw new ThienLyAuthError("THIENLY_CONFIG_CHANGED", 409);
  }
  return attempt;
}

function sameOrigin(req: IncomingMessage): boolean {
  try {
    return Boolean(
      req.headers.origin &&
      req.headers.host &&
      new URL(req.headers.origin).host === req.headers.host &&
      req.headers["sec-fetch-site"] !== "cross-site",
    );
  } catch {
    return false;
  }
}

async function verifiedProfile(req: IncomingMessage, config: OpenClawConfig) {
  const token = req.headers.token;
  const companyId = req.headers["company-id"];
  if (
    typeof token !== "string" ||
    !token.trim() ||
    token.length > 8192 ||
    typeof companyId !== "string" ||
    !/^[1-9]\d*$/.test(companyId)
  ) {
    throw new ThienLyAuthError("THIENLY_VERIFICATION_FAILED", 401);
  }
  const settings = resolveThienLyConfig(config);
  const response = await fetch(`${settings.apiBaseUrl.replace(/\/$/, "")}/profile?is_full=true`, {
    method: "GET",
    headers: { token, "company-id": companyId, accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  const raw = (await readResponseWithLimit(response, 16_384, { timeoutMs: 10_000 })).toString(
    "utf8",
  );
  const envelope = z
    .object({ success: z.boolean(), data: z.record(z.string(), z.unknown()) })
    .safeParse(JSON.parse(raw));
  if (!response.ok || !envelope.success || !envelope.data.success) {
    throw new ThienLyAuthError("THIENLY_VERIFICATION_FAILED", 401);
  }
  const profile = envelope.data.data;
  const identity = validateThienLyIdentity({
    subject: `comnieu:${profile.company_id}:${profile.id}`,
    company_id: profile.company_id,
    user_id: profile.id,
    staff_code: profile.staff_code,
    display_name: profile.name ?? profile.full_name,
  });
  if (identity.company_id !== Number(companyId)) {
    throw new ThienLyAuthError("THIENLY_IDENTITY_INVALID", 401);
  }
  return { identity, fingerprint: settings.fingerprint };
}

function completeAttempt(res: ServerResponse, id: string, config: OpenClawConfig) {
  const completion = runOpenClawStateWriteTransaction(() => {
    const attempt = getThienLyAttempt(id);
    if (!attempt) {
      throw new ThienLyAuthError("THIENLY_ATTEMPT_NOT_FOUND", 404);
    }
    const account = thienLyCompletionAccount(attempt);
    const session = createEnterpriseSession(account.id, {}, "user");
    updateThienLyAttempt(id, ["ready"], {
      phase: "completed",
      sessionId: session.sessionId,
      sessionExpiresAt: session.expiresAt,
    });
    markEnterpriseAccountLogin(account.id);
    return { account, ...session };
  });
  const jwt = issueEnterpriseJwt({
    accountId: completion.account.id,
    sessionId: completion.sessionId,
    expiresAt: completion.expiresAt,
    audience: "user",
  });
  res.setHeader("Set-Cookie", createEnterpriseEmbedAuthCookie(jwt));
  return sendJson(res, 200, {
    account: presentEnterpriseUserAuthAccount(completion.account),
    csrfToken: issueEnterpriseCsrfToken(completion.sessionId, "user"),
    bootstrap: buildEnterpriseUserBootstrapV2(config, completion.account),
  });
}

/** The browser talks directly to OpenClaw through a transparent same-origin proxy. */
export async function handleEnterpriseEmbeddedHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: OpenClawConfig,
  pathname: string,
): Promise<boolean> {
  if (!pathname.startsWith(`${PREFIX}/`)) {
    return false;
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { code: "METHOD_NOT_ALLOWED" });
  }
  if (!sameOrigin(req)) {
    return sendJson(res, 403, { code: "ORIGIN_DENIED" });
  }
  try {
    const settings = resolveThienLyConfig(config);
    if (pathname === `${PREFIX}/bootstrap`) {
      const ip = req.socket.remoteAddress;
      if (!bootstrapLimiter.check(ip).allowed) {
        throw new ThienLyAuthError("THIENLY_RATE_LIMITED", 429);
      }
      bootstrapLimiter.recordFailure(ip);
      if (hasEnterpriseEmbedAuthCookie(req)) {
        const prior = authenticateEnterpriseRequest(req, "user");
        if (prior) {
          logoutEnterprisePrincipal(prior);
        }
        res.setHeader("Set-Cookie", clearEnterpriseEmbedAuthCookie());
      }
      const { identity, fingerprint } = await verifiedProfile(req, config);
      bootstrapLimiter.reset(ip);
      const browser = randomValue();
      res.setHeader("Set-Cookie", [
        clearEnterpriseEmbedAuthCookie(),
        `${BROWSER_COOKIE}=${browser}; Path=/assistant-openclaw; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
      ]);
      const attempt = createThienLyAttempt({
        browserHash: hashThienLyValue(browser),
        stateHash: hashThienLyValue(randomValue()),
        verifier: randomValue(),
        configFingerprint: fingerprint,
      });
      updateThienLyAttempt(attempt.id, ["waiting"], { identity, phase: "account" });
      const provisioned = provisionThienLyAccount(attempt.id, config);
      if (provisioned.phase === "link_required") {
        return sendJson(res, 409, {
          code: "LINK_REQUIRED",
          attemptId: provisioned.id,
          account: provisioned.account,
        });
      }
      return completeAttempt(res, attempt.id, config);
    }
    if (pathname === `${PREFIX}/link`) {
      const body = await readJson(req, 2048);
      if (
        typeof body.attemptId !== "string" ||
        typeof body.password !== "string" ||
        !body.password ||
        body.password.length > 512
      ) {
        throw new ThienLyAuthError("INVALID_CREDENTIALS", 401);
      }
      const attempt = ownAttempt(req, body.attemptId, settings.fingerprint);
      const key = `identity:${attempt.accountId ?? attempt.id}`;
      if (!linkLimiter.check(key).allowed) {
        throw new ThienLyAuthError("THIENLY_LINK_RATE_LIMITED", 429);
      }
      linkLimiter.recordFailure(key);
      await linkThienLyAccount(attempt.id, body.password, config);
      linkLimiter.reset(key);
      return completeAttempt(res, attempt.id, config);
    }
    return sendJson(res, 404, { code: "NOT_FOUND" });
  } catch (error) {
    const known = error instanceof ThienLyAuthError || error instanceof ThienLyStoreError;
    return sendJson(res, known ? error.status : 502, {
      code: known ? error.code : "THIENLY_VERIFICATION_FAILED",
    });
  }
}
