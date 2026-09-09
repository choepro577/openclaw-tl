import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { createAuthRateLimiter } from "../../gateway/auth-rate-limit.js";
import { runOpenClawStateWriteTransaction } from "../../state/openclaw-state-db.js";
import {
  countEnterpriseAdministrators,
  markEnterpriseAccountLogin,
} from "../accounts/account-store.js";
import { readJson, sendJson } from "../knowledge/enterprise-knowledge-http-common.js";
import { presentEnterpriseUserAuthAccount } from "../user/user-bootstrap-service.js";
import { createEnterpriseAuthCookie } from "./cookie.js";
import { issueEnterpriseCsrfToken, issueEnterpriseJwt } from "./jwt.js";
import { createEnterpriseSession, getActiveEnterpriseSession } from "./session-store.js";
import {
  exchangeThienLyCode,
  hashThienLyValue,
  linkThienLyAccount,
  provisionThienLyAccount,
  resolveThienLyConfig,
  ThienLyAuthError,
  thienLyCompletionAccount,
} from "./thienly-service.js";
import {
  createThienLyAttempt,
  findThienLyAttemptByState,
  getThienLyAttempt,
  presentThienLyAttempt,
  updateThienLyAttempt,
  type ThienLyAttempt,
  ThienLyStoreError,
} from "./thienly-store.js";

const PREFIX = "/api/auth/user/thienly";
const BROWSER_COOKIE = "__Host-maap_thienly_browser";
const startLimiter = createAuthRateLimiter({
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
const streams = new Map<string, number>();
const activeExchanges = new Set<string>();

function randomValue() {
  return randomBytes(32).toString("base64url");
}

function browserSecret(req: IncomingMessage): string | undefined {
  const cookies = req.headers.cookie ?? "";
  if (cookies.length > 16_384) {
    return undefined;
  }
  const value = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${BROWSER_COOKIE}=`))
    ?.slice(BROWSER_COOKIE.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}

function ownAttempt(req: IncomingMessage, id: string, fingerprint: string): ThienLyAttempt {
  const browser = browserSecret(req);
  const attempt = browser && getThienLyAttempt(id);
  if (!attempt || attempt.browserHash !== hashThienLyValue(browser!)) {
    throw new ThienLyAuthError("THIENLY_ATTEMPT_NOT_FOUND", 404);
  }
  if (attempt.configFingerprint !== fingerprint) {
    throw new ThienLyAuthError("THIENLY_CONFIG_CHANGED", 409);
  }
  if (attempt.expiresAt <= Date.now() && attempt.phase === "completed") {
    throw new ThienLyAuthError("THIENLY_ATTEMPT_EXPIRED", 410);
  }
  return attempt;
}

const messages: Record<string, string> = {
  EMPLOYEE_CODE_REQUIRED: "Xác thực không thành công: tài khoản Thiên Lý chưa có mã nhân viên.",
  EMPLOYEE_CODE_INVALID: "Mã nhân viên không hợp lệ để tạo username MAAP.",
  EMPLOYEE_CODE_CHANGED:
    "Mã nhân viên đã thay đổi. Vui lòng liên hệ quản trị để kiểm tra liên kết.",
  THIENLY_IDENTITY_CONFLICT: "Tài khoản MAAP đã được liên kết với một danh tính khác.",
  THIENLY_ACCOUNT_UNAVAILABLE: "Tài khoản MAAP không tồn tại hoặc đã bị khóa.",
  THIENLY_AGENT_NOT_READY: "Chưa thể chuẩn bị Personal Agent. Hãy thực hiện lại kết nối.",
  THIENLY_UNAVAILABLE: "Đăng nhập Thiên Lý chưa được cấu hình đầy đủ.",
  THIENLY_CONFIG_INVALID: "Cấu hình kết nối Thiên Lý chưa hợp lệ.",
  THIENLY_CONFIG_CHANGED: "Cấu hình kết nối đã thay đổi. Hãy bắt đầu kết nối mới.",
  THIENLY_VERIFICATION_FAILED: "Xác thực Thiên Lý không thành công. Hãy bắt đầu kết nối mới.",
  THIENLY_IDENTITY_INVALID: "Thiên Lý trả về thông tin nhân viên không hợp lệ.",
  THIENLY_ATTEMPT_NOT_FOUND: "Không tìm thấy phiên kết nối của trình duyệt này.",
  THIENLY_ATTEMPT_STATE: "Phiên kết nối đã kết thúc hoặc chưa sẵn sàng cho thao tác này.",
  THIENLY_ATTEMPT_EXPIRED: "Phiên kết nối đã hết hạn. Hãy bắt đầu kết nối mới.",
  THIENLY_INTERRUPTED: "Xác thực bị gián đoạn. Hãy bắt đầu kết nối mới.",
  THIENLY_LINK_RATE_LIMITED: "Nhập sai mật khẩu quá nhiều lần. Vui lòng chờ 15 phút.",
  THIENLY_RATE_LIMITED: "Có quá nhiều yêu cầu kết nối. Vui lòng chờ rồi kết nối lại.",
  INVALID_CREDENTIALS: "Mật khẩu MAAP không đúng.",
  ORIGIN_DENIED: "Origin không được phép.",
};

function safeError(error: unknown) {
  const code =
    error instanceof ThienLyAuthError || error instanceof ThienLyStoreError
      ? error.code
      : "THIENLY_VERIFICATION_FAILED";
  return {
    code,
    message: messages[code] ?? "Xác thực Thiên Lý không thành công. Hãy bắt đầu kết nối mới.",
  };
}

function failAttempt(id: string, error: unknown): void {
  const attempt = getThienLyAttempt(id);
  if (attempt && ["verifying", "account", "agent"].includes(attempt.phase)) {
    updateThienLyAttempt(id, [attempt.phase], { phase: "failed", error: safeError(error) });
  }
}

function recoverProgress(attempt: ThienLyAttempt, config: OpenClawConfig) {
  try {
    if (attempt.phase === "verifying" && !activeExchanges.has(attempt.id)) {
      throw new ThienLyAuthError("THIENLY_INTERRUPTED", 409);
    }
    if (attempt.phase === "account" || attempt.phase === "agent") {
      return provisionThienLyAccount(attempt.id, config);
    }
  } catch (error) {
    failAttempt(attempt.id, error);
    return getThienLyAttempt(attempt.id)!;
  }
  return attempt;
}

function finishPopup(res: ServerResponse, origin: string) {
  const nonce = randomValue();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`,
  );
  // The opener reads authenticated progress from MAAP; this message carries no credentials or identity.
  res.end(
    `<!doctype html><html lang="vi"><meta charset="utf-8"><title>MAAP</title><body><p>Bạn có thể đóng cửa sổ này và trở lại MAAP. You can return to MAAP.</p><script nonce="${nonce}">history.replaceState(null,'',location.pathname);if(window.opener){window.opener.postMessage({type:'maap-thienly-result'},${JSON.stringify(origin)});window.close();}</script></body></html>`,
  );
  return true;
}

function streamProgress(
  req: IncomingMessage,
  res: ServerResponse,
  initial: ThienLyAttempt,
  config: OpenClawConfig,
  fingerprint: string,
) {
  const key = initial.browserHash;
  if ((streams.get(key) ?? 0) >= 3) {
    throw new ThienLyAuthError("THIENLY_RATE_LIMITED", 429);
  }
  streams.set(key, (streams.get(key) ?? 0) + 1);
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
  });
  let last = "";
  const publish = () => {
    try {
      const attempt = recoverProgress(ownAttempt(req, initial.id, fingerprint), config);
      const snapshot = presentThienLyAttempt(attempt);
      const json = JSON.stringify({ attempt: snapshot });
      if (json !== last) {
        const sequence = snapshot.events.at(-1)?.sequence ?? 0;
        res.write(`id: ${sequence}\nevent: progress\ndata: ${json}\n\n`);
        last = json;
      }
      if (["completed", "failed", "cancelled", "expired"].includes(attempt.phase)) {
        res.end();
      }
    } catch {
      res.end();
    }
  };
  const poll = setInterval(publish, 350);
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15_000);
  const lifetime = setTimeout(() => res.end(), 60_000);
  res.once("close", () => {
    clearInterval(poll);
    clearInterval(heartbeat);
    clearTimeout(lifetime);
    const remaining = (streams.get(key) ?? 1) - 1;
    if (remaining) {
      streams.set(key, remaining);
    } else {
      streams.delete(key);
    }
  });
  publish();
  return true;
}

export async function handleThienLyHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: OpenClawConfig,
  pathname: string,
): Promise<boolean> {
  if (!pathname.startsWith(`${PREFIX}/`)) {
    return false;
  }
  if (pathname === `${PREFIX}/config` && req.method === "GET") {
    let enabled = false;
    try {
      resolveThienLyConfig(config);
      enabled = countEnterpriseAdministrators() > 0;
    } catch {
      /* Not configured: retain password login. */
    }
    return sendJson(res, 200, { enabled });
  }
  try {
    const settings = resolveThienLyConfig(config);
    const callback = new URL(settings.callbackUrl);
    // Pre-auth mutations need an exact origin even before a regular CSRF session exists.
    if (
      req.method !== "GET" &&
      (req.headers.origin !== callback.origin || req.headers["sec-fetch-site"] === "cross-site")
    ) {
      throw new ThienLyAuthError("ORIGIN_DENIED", 403);
    }
    const url = new URL(req.url ?? "/", callback.origin);
    if (pathname === `${PREFIX}/start` && req.method === "POST") {
      if (!countEnterpriseAdministrators()) {
        throw new ThienLyAuthError("THIENLY_UNAVAILABLE", 503);
      }
      const ip = req.socket.remoteAddress;
      if (!startLimiter.check(ip).allowed) {
        throw new ThienLyAuthError("THIENLY_RATE_LIMITED", 429);
      }
      startLimiter.recordFailure(ip);
      const browser = browserSecret(req) ?? randomValue();
      res.setHeader(
        "Set-Cookie",
        `${BROWSER_COOKIE}=${browser}; Path=/; Max-Age=1200; HttpOnly; Secure; SameSite=Lax`,
      );
      const state = randomValue();
      const verifier = randomValue();
      const attempt = createThienLyAttempt({
        browserHash: hashThienLyValue(browser),
        stateHash: hashThienLyValue(state),
        verifier,
        configFingerprint: settings.fingerprint,
      });
      const authorizationUrl = new URL(
        `${settings.webBaseUrl.replace(/\/$/, "")}/integrations/maap/connect`,
      );
      for (const [key, value] of Object.entries({
        client_id: settings.clientId,
        redirect_uri: settings.callbackUrl,
        state,
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256",
      })) {
        authorizationUrl.searchParams.set(key, value);
      }
      return sendJson(res, 201, {
        attempt: presentThienLyAttempt(attempt),
        authorizationUrl: authorizationUrl.href,
      });
    }
    if (pathname === `${PREFIX}/callback` && req.method === "GET") {
      const state = url.searchParams.get("state") ?? "";
      const found =
        /^[A-Za-z0-9_-]{43}$/.test(state) && findThienLyAttemptByState(hashThienLyValue(state));
      if (!found) {
        throw new ThienLyAuthError("THIENLY_ATTEMPT_NOT_FOUND", 404);
      }
      const attempt = ownAttempt(req, found.id, settings.fingerprint);
      if (attempt.phase !== "waiting") {
        return finishPopup(res, callback.origin);
      }
      if (url.searchParams.has("error")) {
        updateThienLyAttempt(attempt.id, ["waiting"], { phase: "cancelled" });
        return finishPopup(res, callback.origin);
      }
      const code = url.searchParams.get("code") ?? "";
      if (!/^[A-Za-z0-9_-]{32,256}$/.test(code)) {
        updateThienLyAttempt(attempt.id, ["waiting"], {
          phase: "failed",
          error: safeError(new ThienLyAuthError("THIENLY_VERIFICATION_FAILED", 401)),
        });
        return finishPopup(res, callback.origin);
      }
      updateThienLyAttempt(attempt.id, ["waiting"], { phase: "verifying" });
      activeExchanges.add(attempt.id);
      try {
        await exchangeThienLyCode(attempt, code, config);
        provisionThienLyAccount(attempt.id, config);
      } catch (error) {
        failAttempt(attempt.id, error);
      } finally {
        activeExchanges.delete(attempt.id);
      }
      return finishPopup(res, callback.origin);
    }
    const route =
      /^\/api\/auth\/user\/thienly\/attempts\/([a-zA-Z0-9_-]{16,64})(?:\/(events|link|complete|cancel))?$/.exec(
        pathname,
      );
    if (!route) {
      return sendJson(res, 404, { code: "NOT_FOUND" });
    }
    const attempt = ownAttempt(req, route[1]!, settings.fingerprint);
    const action = route[2];
    if (!action && req.method === "GET") {
      return sendJson(res, 200, {
        attempt: presentThienLyAttempt(recoverProgress(attempt, config)),
      });
    }
    if (action === "events" && req.method === "GET") {
      return streamProgress(req, res, attempt, config, settings.fingerprint);
    }
    if (action === "cancel" && req.method === "POST") {
      if (!["completed", "failed", "cancelled", "expired"].includes(attempt.phase)) {
        updateThienLyAttempt(attempt.id, [attempt.phase], { phase: "cancelled" });
      }
      return sendJson(res, 200, { attempt: presentThienLyAttempt(getThienLyAttempt(attempt.id)!) });
    }
    if (action === "link" && req.method === "POST") {
      const body = await readJson(req, 2048);
      if (typeof body.password !== "string" || !body.password || body.password.length > 512) {
        throw new ThienLyAuthError("INVALID_CREDENTIALS", 401);
      }
      const key = `identity:${attempt.accountId ?? attempt.id}`;
      if (!linkLimiter.check(key).allowed) {
        throw new ThienLyAuthError("THIENLY_LINK_RATE_LIMITED", 429);
      }
      // Reserve a try before awaiting scrypt, so concurrent submissions cannot bypass the limit.
      linkLimiter.recordFailure(key);
      const linked = await linkThienLyAccount(attempt.id, body.password, config);
      linkLimiter.reset(key);
      return sendJson(res, 200, { attempt: presentThienLyAttempt(linked) });
    }
    if (action === "complete" && req.method === "POST") {
      const completion = runOpenClawStateWriteTransaction(() => {
        const current = ownAttempt(req, attempt.id, settings.fingerprint);
        const account = thienLyCompletionAccount(current);
        if (current.phase === "completed") {
          const session =
            current.sessionId && getActiveEnterpriseSession(current.sessionId, {}, "user");
          if (!session || session.accountId !== account.id || !current.sessionExpiresAt) {
            throw new ThienLyAuthError("THIENLY_ATTEMPT_STATE", 409);
          }
          return { account, sessionId: current.sessionId!, expiresAt: current.sessionExpiresAt };
        }
        const session = createEnterpriseSession(account.id, {}, "user");
        updateThienLyAttempt(current.id, ["ready"], {
          phase: "completed",
          sessionId: session.sessionId,
          sessionExpiresAt: session.expiresAt,
        });
        markEnterpriseAccountLogin(account.id);
        return { account, ...session };
      });
      const token = issueEnterpriseJwt({
        accountId: completion.account.id,
        sessionId: completion.sessionId,
        expiresAt: completion.expiresAt,
        audience: "user",
      });
      res.setHeader("Set-Cookie", createEnterpriseAuthCookie(token, "user"));
      return sendJson(res, 200, {
        account: presentEnterpriseUserAuthAccount(completion.account),
        csrfToken: issueEnterpriseCsrfToken(completion.sessionId, "user"),
      });
    }
    return sendJson(res, 405, { code: "METHOD_NOT_ALLOWED" });
  } catch (error) {
    return sendJson(
      res,
      error instanceof ThienLyAuthError || error instanceof ThienLyStoreError ? error.status : 400,
      safeError(error),
    );
  }
}
