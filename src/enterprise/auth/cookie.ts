import type { IncomingMessage } from "node:http";
import { ENTERPRISE_SESSION_TTL_MS } from "./session-store.js";
import type { EnterprisePortalAudience } from "./session-store.js";

export const ENTERPRISE_ADMIN_AUTH_COOKIE = "__Host-openclaw_admin_session";
export const ENTERPRISE_USER_AUTH_COOKIE = "__Host-openclaw_user_session";
export const ENTERPRISE_EMBED_AUTH_COOKIE = "__Secure-openclaw_embed_session";
const ENTERPRISE_EMBED_AUTH_PATH = "/assistant-openclaw";
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
  const parts = cookieHeader.split(";");
  const names =
    audience === "user"
      ? [ENTERPRISE_EMBED_AUTH_COOKIE, cookieName(audience)]
      : [cookieName(audience)];
  for (const name of names) {
    for (const part of parts) {
      const separator = part.indexOf("=");
      if (separator < 0) {
        continue;
      }
      if (part.slice(0, separator).trim() === name) {
        const value = part.slice(separator + 1).trim();
        return value.length <= 8192 ? value : undefined;
      }
    }
  }
  return undefined;
}

export function hasEnterpriseEmbedAuthCookie(req: IncomingMessage): boolean {
  return Boolean(
    req.headers.cookie
      ?.split(";")
      .some((part) => part.trim().startsWith(`${ENTERPRISE_EMBED_AUTH_COOKIE}=`)),
  );
}

export function clearRequestUserAuthCookie(req: IncomingMessage): string {
  return hasEnterpriseEmbedAuthCookie(req)
    ? clearEnterpriseEmbedAuthCookie()
    : clearEnterpriseAuthCookie("user");
}

export function createEnterpriseEmbedAuthCookie(token: string): string {
  return `${ENTERPRISE_EMBED_AUTH_COOKIE}=${token}; Path=${ENTERPRISE_EMBED_AUTH_PATH}; Max-Age=${Math.floor(ENTERPRISE_SESSION_TTL_MS / 1000)}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearEnterpriseEmbedAuthCookie(): string {
  return `${ENTERPRISE_EMBED_AUTH_COOKIE}=; Path=${ENTERPRISE_EMBED_AUTH_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
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
