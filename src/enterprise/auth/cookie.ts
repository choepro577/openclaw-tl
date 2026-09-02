import type { IncomingMessage } from "node:http";
import { ENTERPRISE_SESSION_TTL_MS } from "./session-store.js";
import type { EnterprisePortalAudience } from "./session-store.js";

export const ENTERPRISE_ADMIN_AUTH_COOKIE = "__Host-openclaw_admin_session";
export const ENTERPRISE_USER_AUTH_COOKIE = "__Host-openclaw_user_session";
/** Gateway compatibility alias. Gateway account auth must only read the user cookie. */
export const ENTERPRISE_AUTH_COOKIE = ENTERPRISE_USER_AUTH_COOKIE;

function cookieName(audience: EnterprisePortalAudience): string {
  return audience === "admin" ? ENTERPRISE_ADMIN_AUTH_COOKIE : ENTERPRISE_USER_AUTH_COOKIE;
}

export function readEnterpriseAuthCookie(
  req: IncomingMessage,
  audience: EnterprisePortalAudience = "user",
): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader || cookieHeader.length > 16_384) {
    return undefined;
  }
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }
    if (part.slice(0, separator).trim() === cookieName(audience)) {
      const value = part.slice(separator + 1).trim();
      return value.length <= 8192 ? value : undefined;
    }
  }
  return undefined;
}

export function createEnterpriseAuthCookie(
  token: string,
  audience: EnterprisePortalAudience = "user",
): string {
  return `${cookieName(audience)}=${token}; Path=/; Max-Age=${Math.floor(ENTERPRISE_SESSION_TTL_MS / 1000)}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearEnterpriseAuthCookie(audience: EnterprisePortalAudience = "user"): string {
  return `${cookieName(audience)}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
