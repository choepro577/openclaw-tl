// High-level login and cookie-session verification for Enterprise accounts.
import type { IncomingMessage } from "node:http";
import type { OpenClawStateDatabaseOptions } from "../../state/openclaw-state-db.js";
import {
  getEnterpriseAccountById,
  getEnterpriseAccountByUsername,
  markEnterpriseAccountLogin,
  updateEnterpriseAccount,
} from "../accounts/account-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { readEnterpriseAuthCookie } from "./cookie.js";
import { issueEnterpriseJwt, verifyEnterpriseJwt } from "./jwt.js";
import { hashEnterprisePassword, verifyEnterprisePassword } from "./password.js";
import {
  createEnterpriseSession,
  getActiveEnterpriseSession,
  revokeEnterpriseAccountSessions,
  revokeEnterpriseSession,
  touchEnterpriseSession,
  type EnterprisePortalAudience,
} from "./session-store.js";

export type EnterprisePrincipal = {
  account: EnterpriseAccount;
  sessionId: string;
  audience: EnterprisePortalAudience;
};

const DUMMY_PASSWORD_HASH = [
  "scrypt",
  "16384",
  "8",
  "1",
  Buffer.alloc(16).toString("base64url"),
  Buffer.alloc(64).toString("base64url"),
].join("$");

export async function loginEnterpriseAccount(
  username: string,
  password: string,
  options: OpenClawStateDatabaseOptions = {},
  audience: EnterprisePortalAudience = "user",
): Promise<{ token: string; principal: EnterprisePrincipal }> {
  const accountWithPassword = getEnterpriseAccountByUsername(username, options);
  const passwordOk = accountWithPassword
    ? await verifyEnterprisePassword(password, accountWithPassword.passwordHash)
    : await verifyEnterprisePassword(password, DUMMY_PASSWORD_HASH);
  const roleMatches =
    audience === "admin"
      ? accountWithPassword?.role === "administrator"
      : accountWithPassword?.role === "employee" || accountWithPassword?.role === "administrator";
  if (!accountWithPassword || !passwordOk || !accountWithPassword.enabled || !roleMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }
  const { passwordHash: _passwordHash, ...account } = accountWithPassword;
  const session = createEnterpriseSession(account.id, options, audience);
  markEnterpriseAccountLogin(account.id, options);
  return {
    token: issueEnterpriseJwt(
      {
        accountId: account.id,
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        audience,
      },
      options,
    ),
    principal: { account, sessionId: session.sessionId, audience },
  };
}

export function authenticateEnterpriseToken(
  token: string,
  options: OpenClawStateDatabaseOptions = {},
  audience: EnterprisePortalAudience = "user",
): EnterprisePrincipal | undefined {
  const claims = verifyEnterpriseJwt(token, options, audience);
  if (!claims) {
    return undefined;
  }
  const session = getActiveEnterpriseSession(claims.sid, options, audience);
  const account = getEnterpriseAccountById(claims.sub, options);
  if (!session || session.accountId !== claims.sub || !account?.enabled) {
    return undefined;
  }
  touchEnterpriseSession(claims.sid, options);
  return { account, sessionId: claims.sid, audience };
}

export function authenticateEnterpriseRequest(
  req: IncomingMessage,
  audience: EnterprisePortalAudience = "user",
  options: OpenClawStateDatabaseOptions = {},
): EnterprisePrincipal | undefined {
  const token = readEnterpriseAuthCookie(req, audience);
  return token ? authenticateEnterpriseToken(token, options, audience) : undefined;
}

export function logoutEnterprisePrincipal(
  principal: EnterprisePrincipal,
  options: OpenClawStateDatabaseOptions = {},
): void {
  revokeEnterpriseSession(principal.sessionId, "logout", options);
}

export async function changeEnterprisePassword(
  principal: EnterprisePrincipal,
  currentPassword: string,
  newPassword: string,
  options: OpenClawStateDatabaseOptions = {},
): Promise<EnterpriseAccount> {
  const current = getEnterpriseAccountByUsername(principal.account.username, options);
  if (!current || !(await verifyEnterprisePassword(currentPassword, current.passwordHash))) {
    throw new Error("INVALID_CURRENT_PASSWORD");
  }
  if (await verifyEnterprisePassword(newPassword, current.passwordHash)) {
    throw new Error("PASSWORD_REUSE");
  }
  const passwordHash = await hashEnterprisePassword(newPassword);
  const updated = updateEnterpriseAccount(
    current.id,
    { passwordHash, mustChangePassword: false },
    options,
  );
  revokeEnterpriseAccountSessions(current.id, "password_changed", options);
  return updated;
}
