// Same-origin HTTP API for Enterprise login, accounts, and entitlements.
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ClawHubTrustErrorCodes,
  ErrorCodes,
  readClawHubTrustErrorDetails,
  validateCronAddParams,
  validateCronUpdateParams,
} from "../../../packages/gateway-protocol/src/index.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { CronJobCreate, CronJobPatch } from "../../cron/types.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { getUserProfileDisplay, setAvatar } from "../../state/user-profiles.js";
import {
  countEnterpriseAdministrators,
  createEnterpriseAccount,
  getEnterpriseAccountById,
  listEnterpriseAccounts,
  updateEnterpriseAccount,
} from "../accounts/account-store.js";
import type { EnterpriseAccount, EnterpriseAccountRole } from "../accounts/account-types.js";
import {
  readEnterpriseSharedRelationshipFile,
  updateEnterpriseSharedRelationship,
  writeEnterpriseSharedRelationshipFile,
} from "../agents/admin-agent-relationship-service.js";
import {
  createEnterpriseAgentCronJob,
  createEnterpriseSharedAgent,
  deleteEnterpriseSharedAgent,
  readEnterpriseAgentFile,
  readEnterpriseAgentPanel,
  removeEnterpriseAgentCronJob,
  runEnterpriseAgentCronJob,
  runEnterpriseMemoryAction,
  updateEnterpriseAgentCronJob,
  updateEnterpriseAgentSkills,
  updateEnterpriseAgentTools,
  updateEnterpriseSharedAgent,
  writeEnterpriseAgentFile,
  type EnterpriseAgentPanel,
  type EnterpriseAgentScope,
} from "../agents/admin-agent-service.js";
import { appendEnterpriseAuditEvent, listEnterpriseAuditEvents } from "../audit/audit-store.js";
import {
  authenticateEnterpriseRequest,
  changeEnterprisePassword,
  loginEnterpriseAccount,
  logoutEnterprisePrincipal,
} from "../auth/auth-service.js";
import { clearEnterpriseAuthCookie, createEnterpriseAuthCookie } from "../auth/cookie.js";
import { issueEnterpriseCsrfToken, verifyEnterpriseCsrfToken } from "../auth/jwt.js";
import { hashEnterprisePassword } from "../auth/password.js";
import {
  listEnterpriseAccountSessions,
  revokeEnterpriseAccountSessions,
  revokeEnterpriseStoredSession,
  type EnterprisePortalAudience,
} from "../auth/session-store.js";
import {
  listEnterpriseAgentCatalog,
  listEnterpriseSkillCatalog,
  listEnterpriseToolCatalog,
} from "../catalog/enterprise-catalog.js";
import {
  applyEnterpriseAdminConfig,
  listEnterpriseConfigBackups,
  readEnterpriseAdminConfig,
  rollbackEnterpriseAdminConfig,
  validateEnterpriseAdminConfig,
} from "../config/admin-config-service.js";
import { isEnterpriseEnabled } from "../enterprise-config.js";
import {
  listEnterpriseEntitlements,
  listEnterpriseEntitlementsForResource,
  replaceEnterpriseEntitlements,
  resolveEnterpriseEffectivePolicy,
  resolveEnterpriseResourceAccess,
  applyEnterpriseAccessChanges,
  type EnterpriseEntitlement,
  type EnterpriseResourceType,
} from "../entitlements/entitlement-store.js";
import { handleEnterpriseExtensionHttpRequest } from "../extensions/enterprise-extension-http.js";
import {
  EnterpriseGatewayMethodError,
  invokeEnterpriseGatewayHandler,
} from "../gateway/invoke-handler.js";
import { handleEnterpriseKnowledgeHttpRequest } from "../knowledge/enterprise-knowledge-http.js";
import {
  EnterpriseAdminModelGatewayError,
  invokeEnterpriseAdminModelAction,
  isEnterpriseAdminModelMethod,
  isEnterpriseAdminModelMutation,
  readEnterpriseAdminModelContext,
} from "../models/admin-model-service.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import {
  clearPersonalAgentKnowledge,
  createPersonalAgentKnowledge,
  deletePersonalAgentKnowledge,
  listPersonalAgentKnowledge,
  updatePersonalAgentKnowledge,
} from "../user/personal-agent-knowledge-store.js";
import {
  parseKnowledgeCreate,
  parseKnowledgePatch,
  parsePersonalAgentProfilePatch,
  parsePersonalAgentProfileReset,
} from "../user/personal-agent-profile-service.js";
import {
  readPersonalAgentProfile,
  resetPersonalAgentProfile,
  writePersonalAgentProfile,
} from "../user/personal-agent-profile-store.js";
import { parseSharedAgentRelationshipPatch } from "../user/shared-agent-relationship-service.js";
import {
  readSharedAgentRelationship,
  writeSharedAgentRelationship,
} from "../user/shared-agent-relationship-store.js";
import type { AgentKey } from "../user/user-api-contracts.js";
import {
  createUserAutomation,
  deleteUserAutomation,
  listUserAutomations,
  parseUserAutomationInput,
  runUserAutomation,
  updateUserAutomation,
} from "../user/user-automation-service.js";
import {
  buildEnterpriseUserBootstrapV2,
  presentEnterpriseUserAuthAccount,
} from "../user/user-bootstrap-service.js";
import {
  assignEnterpriseConversationProject,
  createEnterpriseConversationProject,
  deleteEnterpriseConversationProject,
  listEnterpriseConversationProjects,
  readEnterpriseConversationProject,
  renameEnterpriseConversationProject,
} from "../user/user-conversation-project-store.js";
import {
  openEnterpriseUserConversation,
  requireEnterpriseUserConversation,
} from "../user/user-conversation-service.js";
import { resolveEnterpriseUserRuntimeAgentId } from "../user/user-gateway-client.js";

const API_PREFIXES = ["/api/auth/", "/api/enterprise/"] as const;
const MAX_JSON_BODY_BYTES = 64 * 1024;
const MAX_AGENT_FILE_CONTENT_BYTES = 262_144;
const MAX_AGENT_FILE_BODY_BYTES = MAX_AGENT_FILE_CONTENT_BYTES + 16 * 1024;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

const loginFailures = new Map<string, { count: number; windowStartedAt: number }>();

type JsonRecord = Record<string, unknown>;

function sendJson(res: ServerResponse, status: number, body: unknown): true {
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
  return true;
}

function sendError(res: ServerResponse, status: number, code: string, message: string): true {
  return sendJson(res, status, { code, message });
}

function normalizePath(req: IncomingMessage, config: OpenClawConfig): string | undefined {
  try {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    const basePath = config.gateway?.controlUi?.basePath?.replace(/\/$/, "") ?? "";
    return basePath && pathname.startsWith(`${basePath}/api/`)
      ? pathname.slice(basePath.length)
      : pathname;
  } catch {
    return undefined;
  }
}

function isClaimedEnterprisePath(pathname: string): boolean {
  return API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function readJson(req: IncomingMessage, maxBytes = MAX_JSON_BODY_BYTES): Promise<JsonRecord> {
  const contentType = req.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new Error("CONTENT_TYPE_REQUIRED");
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) {
    return {};
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("BODY_INVALID");
  }
  return parsed as JsonRecord;
}

function requireString(body: JsonRecord, key: string, maxLength = 512): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`FIELD_INVALID:${key}`);
  }
  return value;
}

function requireFileContent(body: JsonRecord): string {
  const content = body.content;
  if (
    typeof content !== "string" ||
    Buffer.byteLength(content, "utf8") > MAX_AGENT_FILE_CONTENT_BYTES
  ) {
    throw new Error("FIELD_INVALID:content");
  }
  return content;
}

function optionalString(body: JsonRecord, key: string, maxLength = 256): string | null | undefined {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`FIELD_INVALID:${key}`);
  }
  return value.trim() || null;
}

function optionalBoolean(body: JsonRecord, key: string): boolean | undefined {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`FIELD_INVALID:${key}`);
  }
  return value;
}

function requireInteger(body: JsonRecord, key: string): number {
  const value = body[key];
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`FIELD_INVALID:${key}`);
  }
  return Number(value);
}

function requireStringArray(body: JsonRecord, key: string): string[] {
  const value = body[key];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new Error(`FIELD_INVALID:${key}`);
  }
  return [...new Set(value.map((entry) => entry.trim()).filter(Boolean))];
}

function optionalToolProfile(
  body: JsonRecord,
): "minimal" | "coding" | "messaging" | "full" | null | undefined {
  if (body.profile === null || body.profile === undefined) {
    return body.profile;
  }
  const profile = requireString(body, "profile", 32);
  if (
    profile !== "minimal" &&
    profile !== "coding" &&
    profile !== "messaging" &&
    profile !== "full"
  ) {
    throw new Error("FIELD_INVALID:profile");
  }
  return profile;
}

function requireRecord(body: JsonRecord, key: string): JsonRecord {
  const value = body[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`FIELD_INVALID:${key}`);
  }
  return value as JsonRecord;
}

function parseCronCreate(body: JsonRecord): CronJobCreate {
  const job = requireRecord(body, "job");
  if (!validateCronAddParams(job)) {
    throw new Error("CRON_JOB_INVALID");
  }
  return job as CronJobCreate;
}

function parseCronPatch(body: JsonRecord, jobId: string): CronJobPatch {
  const patch = requireRecord(body, "patch");
  if (!validateCronUpdateParams({ id: jobId, patch })) {
    throw new Error("CRON_JOB_INVALID");
  }
  return patch as CronJobPatch;
}

function requireSameOriginMutation(req: IncomingMessage, config: OpenClawConfig): boolean {
  if (req.method === "GET" || req.method === "HEAD") {
    return true;
  }
  if (req.headers["sec-fetch-site"] === "cross-site") {
    return false;
  }
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }
  const allowed = new Set(config.gateway?.controlUi?.allowedOrigins ?? []);
  const host = req.headers.host;
  try {
    const parsed = new URL(origin);
    return (host !== undefined && parsed.host === host) || allowed.has(parsed.origin);
  } catch {
    return false;
  }
}

function loginRateLimitKey(req: IncomingMessage, username: string): string {
  return `${req.socket.remoteAddress ?? "unknown"}\0${username.trim().toLowerCase()}`;
}

function isLoginRateLimited(key: string): boolean {
  const failure = loginFailures.get(key);
  if (!failure) {
    return false;
  }
  if (Date.now() - failure.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginFailures.delete(key);
    return false;
  }
  return failure.count >= LOGIN_MAX_FAILURES;
}

function recordLoginFailure(key: string): void {
  const now = Date.now();
  const existing = loginFailures.get(key);
  if (!existing || now - existing.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginFailures.set(key, { count: 1, windowStartedAt: now });
    return;
  }
  existing.count += 1;
  if (loginFailures.size > 5_000) {
    const oldest = loginFailures.keys().next().value;
    if (oldest) {
      loginFailures.delete(oldest);
    }
  }
}

function requireAdmin(req: IncomingMessage, res: ServerResponse) {
  const principal = authenticateEnterpriseRequest(req, "admin");
  if (!principal) {
    sendError(res, 401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
    return undefined;
  }
  if (principal.account.mustChangePassword) {
    sendError(res, 428, "PASSWORD_CHANGE_REQUIRED", "Bạn cần đổi mật khẩu trước.");
    return undefined;
  }
  if (principal.account.role !== "administrator") {
    sendError(res, 403, "FORBIDDEN", "Bạn không có quyền quản trị.");
    return undefined;
  }
  return principal;
}

function requireUser(req: IncomingMessage, res: ServerResponse) {
  const principal = authenticateEnterpriseRequest(req, "user");
  if (!principal) {
    sendError(res, 401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
    return undefined;
  }
  if (principal.account.mustChangePassword) {
    sendError(res, 428, "PASSWORD_CHANGE_REQUIRED", "Bạn cần đổi mật khẩu trước.");
    return undefined;
  }
  return principal;
}

function requirePortalCsrf(
  req: IncomingMessage,
  res: ServerResponse,
  principal: ReturnType<typeof authenticateEnterpriseRequest>,
  audience: EnterprisePortalAudience,
): boolean {
  if (!principal) {
    sendError(res, 401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
    return false;
  }
  const origin = req.headers.origin;
  const host = req.headers.host;
  const fetchSite = req.headers["sec-fetch-site"];
  const sameOrigin = (() => {
    try {
      return Boolean(origin && host && new URL(origin).host === host);
    } catch {
      return false;
    }
  })();
  if (!sameOrigin || (fetchSite !== undefined && fetchSite !== "same-origin")) {
    sendError(res, 403, "ORIGIN_DENIED", "Origin không được phép.");
    return false;
  }
  const token = Array.isArray(req.headers["x-csrf-token"])
    ? req.headers["x-csrf-token"][0]
    : req.headers["x-csrf-token"];
  if (!verifyEnterpriseCsrfToken(token, principal.sessionId, audience)) {
    sendError(res, 403, "CSRF_INVALID", "CSRF token không hợp lệ.");
    return false;
  }
  return true;
}

function portalPath(
  pathname: string,
): { audience: EnterprisePortalAudience; action: string } | null {
  const match = /^\/api\/auth\/(admin|user)\/(login|me|logout|change-password)$/.exec(pathname);
  return match?.[1] && match[2]
    ? { audience: match[1] as EnterprisePortalAudience, action: match[2] }
    : null;
}

function adminAccountPath(pathname: string): { accountId: string; tail: string } | undefined {
  const match = /^\/api\/enterprise\/admin\/accounts\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!match?.[1]) {
    return undefined;
  }
  return { accountId: decodeURIComponent(match[1]), tail: match[2] ?? "" };
}

function adminAgentPath(
  pathname: string,
): { scope: EnterpriseAgentScope; id: string; panel?: EnterpriseAgentPanel } | undefined {
  const match =
    /^\/api\/enterprise\/admin\/agents\/(shared|personal)\/([^/]+)(?:\/(overview|files|tools|skills|channels|cron|memory|relationships))?$/.exec(
      pathname,
    );
  if (!match?.[1] || !match[2]) {
    return undefined;
  }
  return {
    scope: match[1] as EnterpriseAgentScope,
    id: decodeURIComponent(match[2]),
    panel: match[3] as EnterpriseAgentPanel | undefined,
  };
}

function adminSharedRelationshipPath(pathname: string):
  | {
      agentId: string;
      accountId: string;
      files: boolean;
    }
  | undefined {
  const match =
    /^\/api\/enterprise\/admin\/agents\/shared\/([^/]+)\/relationships\/([^/]+)(\/files)?$/.exec(
      pathname,
    );
  if (!match?.[1] || !match[2]) {
    return undefined;
  }
  return {
    agentId: decodeURIComponent(match[1]),
    accountId: decodeURIComponent(match[2]),
    files: match[3] === "/files",
  };
}

function userSharedRelationshipPath(pathname: string): AgentKey | undefined {
  const match = /^\/api\/enterprise\/user\/v2\/shared-agents\/([^/]+)\/relationship$/.exec(
    pathname,
  );
  if (!match?.[1]) {
    return undefined;
  }
  const agentKey = decodeURIComponent(match[1]);
  return agentKey.startsWith("shared:") ? (agentKey as AgentKey) : undefined;
}

function accountPathMatch(pathname: string): { accountId: string; tail: string } | undefined {
  const match = /^\/api\/enterprise\/accounts\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!match?.[1]) {
    return undefined;
  }
  return { accountId: decodeURIComponent(match[1]), tail: match[2] ?? "" };
}

function userKnowledgePath(pathname: string): string | null | undefined {
  const match = /^\/api\/enterprise\/user\/v2\/personal-agent\/knowledge(?:\/([^/]+))?$/.exec(
    pathname,
  );
  if (!match) {
    return undefined;
  }
  return match[1] ? decodeURIComponent(match[1]) : null;
}

function userAutomationPath(pathname: string): string | null | undefined {
  const match = /^\/api\/enterprise\/user\/v2\/automations(?:\/([^/]+))?$/.exec(pathname);
  if (!match) {
    return undefined;
  }
  return match[1] ? decodeURIComponent(match[1]) : null;
}

function userAutomationRunPath(pathname: string): string | undefined {
  const match = /^\/api\/enterprise\/user\/v2\/automations\/([^/]+)\/run$/.exec(pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function userConversationProjectPath(pathname: string): string | null | undefined {
  const match = /^\/api\/enterprise\/user\/v2\/conversation-projects(?:\/([^/]+))?$/.exec(pathname);
  if (!match) {
    return undefined;
  }
  return match[1] ? decodeURIComponent(match[1]) : null;
}

function parseEntitlements(
  body: JsonRecord,
): Array<Omit<EnterpriseEntitlement, "accountId" | "resourceState">> {
  if (!Array.isArray(body.entitlements)) {
    throw new Error("FIELD_INVALID:entitlements");
  }
  return body.entitlements.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("ENTITLEMENT_INVALID");
    }
    const item = raw as JsonRecord;
    const resourceType = requireString(item, "resourceType", 16);
    const resourceId = requireString(item, "resourceId", 256);
    const effect = requireString(item, "effect", 8);
    if (!(["agent", "skill", "tool"] as string[]).includes(resourceType)) {
      throw new Error("ENTITLEMENT_INVALID");
    }
    if (!(["allow", "deny"] as string[]).includes(effect)) {
      throw new Error("ENTITLEMENT_INVALID");
    }
    return {
      resourceType: resourceType as "agent" | "skill" | "tool",
      resourceId,
      effect: effect as "allow" | "deny",
    };
  });
}

function parseAccessChanges(body: JsonRecord) {
  if (
    !Array.isArray(body.changes) ||
    !body.baseRevisions ||
    typeof body.baseRevisions !== "object"
  ) {
    throw new Error("FIELD_INVALID:changes");
  }
  const baseRevisions = Object.fromEntries(
    Object.entries(body.baseRevisions as Record<string, unknown>).map(([accountId, value]) => {
      if (!Number.isInteger(value) || Number(value) < 1) {
        throw new Error("FIELD_INVALID:baseRevisions");
      }
      return [accountId, Number(value)];
    }),
  );
  const changes = body.changes.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("FIELD_INVALID:changes");
    }
    const item = raw as JsonRecord;
    const resourceType = requireString(item, "resourceType", 16);
    const effect = item.effect;
    if (!(resourceType === "agent" || resourceType === "skill" || resourceType === "tool")) {
      throw new Error("RESOURCE_TYPE_INVALID");
    }
    if (effect !== null && effect !== "allow" && effect !== "deny") {
      throw new Error("ENTITLEMENT_EFFECT_INVALID");
    }
    return {
      accountId: requireString(item, "accountId", 128),
      resourceType: resourceType as EnterpriseResourceType,
      resourceId: requireString(item, "resourceKey", 256),
      effect: effect as "allow" | "deny" | null,
    };
  });
  return { changes, baseRevisions };
}

function requestId(req: IncomingMessage): string | null {
  const value = req.headers["x-request-id"];
  return (Array.isArray(value) ? value[0] : value)?.slice(0, 128) ?? null;
}

function effectivePolicy(config: OpenClawConfig, account: EnterpriseAccount) {
  return {
    ...resolveEnterpriseEffectivePolicy(account),
    defaultAgentId: resolveEnterprisePersonalAgentId(config, account),
  };
}

function catalogItemIsEffectivelyAllowed(item: { effectiveAccess?: unknown }): boolean {
  return (
    Boolean(item.effectiveAccess) &&
    typeof item.effectiveAccess === "object" &&
    (item.effectiveAccess as { effectiveAllowed?: unknown }).effectiveAllowed === true
  );
}

/** Claims only Enterprise API paths while the feature flag is enabled. */
export async function handleEnterpriseHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: OpenClawConfig,
  hooks: {
    disconnectClientsForProfile?: (profileId: string) => void;
    getGatewayContext?: () => GatewayRequestContext | undefined;
  } = {},
): Promise<boolean> {
  const pathname = normalizePath(req, config);
  if (!pathname || !isClaimedEnterprisePath(pathname) || !isEnterpriseEnabled(config)) {
    return false;
  }
  if (!requireSameOriginMutation(req, config)) {
    return sendError(res, 403, "ORIGIN_DENIED", "Origin không được phép.");
  }
  const searchParams = new URL(req.url ?? "/", "http://localhost").searchParams;

  try {
    if (
      await handleEnterpriseExtensionHttpRequest({
        req,
        res,
        config,
        pathname,
        getGatewayContext: hooks.getGatewayContext,
      })
    ) {
      return true;
    }
    if (
      await handleEnterpriseKnowledgeHttpRequest({
        req,
        res,
        config,
        pathname,
      })
    ) {
      return true;
    }
    if (pathname === "/api/enterprise/status" && req.method === "GET") {
      return sendJson(res, 200, {
        enabled: true,
        authMode: config.gateway?.auth?.mode,
        bootstrapped: countEnterpriseAdministrators() > 0,
        userPortalVersion: config.enterprise?.userPortal?.version ?? "legacy",
      });
    }

    const portal = portalPath(pathname);
    if (portal?.action === "login" && req.method === "POST") {
      if (countEnterpriseAdministrators() === 0) {
        return sendError(
          res,
          503,
          "BOOTSTRAP_ADMIN_REQUIRED",
          "Hãy chạy openclaw auth bootstrap-admin trước.",
        );
      }
      const body = await readJson(req);
      const username = requireString(body, "username", 64);
      const password = requireString(body, "password", 512);
      const rateLimitKey = `${portal.audience}\0${loginRateLimitKey(req, username)}`;
      if (isLoginRateLimited(rateLimitKey)) {
        res.setHeader("Retry-After", Math.ceil(LOGIN_WINDOW_MS / 1000));
        return sendError(res, 429, "LOGIN_RATE_LIMITED", "Đăng nhập bị tạm khóa trong 15 phút.");
      }
      try {
        const result = await loginEnterpriseAccount(username, password, {}, portal.audience);
        loginFailures.delete(rateLimitKey);
        res.setHeader("Set-Cookie", createEnterpriseAuthCookie(result.token, portal.audience));
        return sendJson(res, 200, {
          account:
            portal.audience === "user"
              ? presentEnterpriseUserAuthAccount(result.principal.account)
              : result.principal.account,
          csrfToken: issueEnterpriseCsrfToken(
            result.principal.sessionId,
            result.principal.audience,
          ),
        });
      } catch {
        recordLoginFailure(rateLimitKey);
        return sendError(res, 401, "INVALID_CREDENTIALS", "Username hoặc mật khẩu không đúng.");
      }
    }

    if (portal?.action === "me" && req.method === "GET") {
      const principal = authenticateEnterpriseRequest(req, portal.audience);
      return principal
        ? sendJson(res, 200, {
            account:
              portal.audience === "user"
                ? presentEnterpriseUserAuthAccount(principal.account)
                : principal.account,
            csrfToken: issueEnterpriseCsrfToken(principal.sessionId, portal.audience),
          })
        : sendError(res, 401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
    }

    if (portal?.action === "logout" && req.method === "POST") {
      const principal = authenticateEnterpriseRequest(req, portal.audience);
      if (principal && !requirePortalCsrf(req, res, principal, portal.audience)) {
        return true;
      }
      if (principal) {
        logoutEnterprisePrincipal(principal);
        hooks.disconnectClientsForProfile?.(principal.account.profileId);
      }
      res.setHeader("Set-Cookie", clearEnterpriseAuthCookie(portal.audience));
      return sendJson(res, 200, { ok: true });
    }

    if (portal?.action === "change-password" && req.method === "POST") {
      const principal = authenticateEnterpriseRequest(req, portal.audience);
      if (!principal) {
        return sendError(res, 401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
      }
      if (!requirePortalCsrf(req, res, principal, portal.audience)) {
        return true;
      }
      const body = await readJson(req);
      await changeEnterprisePassword(
        principal,
        requireString(body, "currentPassword", 512),
        requireString(body, "newPassword", 512),
      );
      hooks.disconnectClientsForProfile?.(principal.account.profileId);
      res.setHeader("Set-Cookie", clearEnterpriseAuthCookie(portal.audience));
      return sendJson(res, 200, { ok: true, reloginRequired: true });
    }

    if (pathname === "/api/auth/login" && req.method === "POST") {
      if (countEnterpriseAdministrators() === 0) {
        return sendError(
          res,
          503,
          "BOOTSTRAP_ADMIN_REQUIRED",
          "Hãy chạy openclaw auth bootstrap-admin trước.",
        );
      }
      const body = await readJson(req);
      const username = requireString(body, "username", 64);
      const password = requireString(body, "password", 512);
      const rateLimitKey = loginRateLimitKey(req, username);
      if (isLoginRateLimited(rateLimitKey)) {
        return sendError(res, 429, "LOGIN_RATE_LIMITED", "Đăng nhập bị tạm khóa trong 15 phút.");
      }
      try {
        let result;
        try {
          result = await loginEnterpriseAccount(username, password, {}, "admin");
        } catch {
          result = await loginEnterpriseAccount(username, password, {}, "user");
        }
        loginFailures.delete(rateLimitKey);
        res.setHeader(
          "Set-Cookie",
          createEnterpriseAuthCookie(result.token, result.principal.audience),
        );
        return sendJson(res, 200, {
          account:
            result.principal.audience === "user"
              ? presentEnterpriseUserAuthAccount(result.principal.account)
              : result.principal.account,
        });
      } catch {
        recordLoginFailure(rateLimitKey);
        return sendError(res, 401, "INVALID_CREDENTIALS", "Username hoặc mật khẩu không đúng.");
      }
    }

    if (pathname === "/api/auth/me" && req.method === "GET") {
      const principal =
        authenticateEnterpriseRequest(req, "admin") ?? authenticateEnterpriseRequest(req, "user");
      return principal
        ? sendJson(res, 200, {
            account:
              principal.audience === "user"
                ? presentEnterpriseUserAuthAccount(principal.account)
                : principal.account,
          })
        : sendError(res, 401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
    }

    if (pathname === "/api/auth/logout" && req.method === "POST") {
      const principal =
        authenticateEnterpriseRequest(req, "admin") ?? authenticateEnterpriseRequest(req, "user");
      if (principal) {
        logoutEnterprisePrincipal(principal);
        hooks.disconnectClientsForProfile?.(principal.account.profileId);
      }
      res.setHeader("Set-Cookie", [
        clearEnterpriseAuthCookie("admin"),
        clearEnterpriseAuthCookie("user"),
      ]);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/auth/change-password" && req.method === "POST") {
      const principal =
        authenticateEnterpriseRequest(req, "admin") ?? authenticateEnterpriseRequest(req, "user");
      if (!principal) {
        return sendError(res, 401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
      }
      const body = await readJson(req);
      await changeEnterprisePassword(
        principal,
        requireString(body, "currentPassword", 512),
        requireString(body, "newPassword", 512),
      );
      hooks.disconnectClientsForProfile?.(principal.account.profileId);
      res.setHeader("Set-Cookie", clearEnterpriseAuthCookie(principal.audience));
      return sendJson(res, 200, { ok: true, reloginRequired: true });
    }

    if (pathname === "/api/enterprise/me/policy" && req.method === "GET") {
      const principal =
        authenticateEnterpriseRequest(req, "user") ?? authenticateEnterpriseRequest(req, "admin");
      if (!principal) {
        return sendError(res, 401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
      }
      if (principal.account.mustChangePassword) {
        return sendError(res, 428, "PASSWORD_CHANGE_REQUIRED", "Bạn cần đổi mật khẩu trước.");
      }
      return sendJson(res, 200, effectivePolicy(config, principal.account));
    }

    if (pathname === "/api/enterprise/user/me/capabilities" && req.method === "GET") {
      const principal = requireUser(req, res);
      if (!principal) {
        return true;
      }
      const agents = listEnterpriseAgentCatalog(config);
      const shared = agents.shared.filter(
        (agent) =>
          resolveEnterpriseResourceAccess(principal.account, "agent", agent.resourceKey).allowed,
      );
      const skills = listEnterpriseSkillCatalog(config, principal.account).items.filter(
        catalogItemIsEffectivelyAllowed,
      );
      const tools = listEnterpriseToolCatalog(config, principal.account).items.filter(
        catalogItemIsEffectivelyAllowed,
      );
      return sendJson(res, 200, {
        account: principal.account,
        personal: agents.personal.find((agent) => agent.accountId === principal.account.id) ?? null,
        sharedAgents: shared,
        defaultAgentId: resolveEnterprisePersonalAgentId(config, principal.account),
        skills,
        tools,
        policyRevision: principal.account.policyRevision,
        catalogRevision: agents.catalogRevision,
        actions: {
          canCreateSession: principal.account.enabled,
          canUsePersonalAgent: principal.account.personalAgentEnabled,
          canInstallSkills: false,
          canManageConfig: false,
          canUseHostTerminal: false,
        },
      });
    }

    if (pathname === "/api/enterprise/user/v2/bootstrap" && req.method === "GET") {
      const principal = requireUser(req, res);
      return principal
        ? sendJson(res, 200, buildEnterpriseUserBootstrapV2(config, principal.account))
        : true;
    }

    const userRelationshipKey = userSharedRelationshipPath(pathname);
    if (userRelationshipKey && req.method === "GET") {
      const principal = requireUser(req, res);
      if (!principal) {
        return true;
      }
      const agentId = resolveEnterpriseUserRuntimeAgentId(
        config,
        principal.account,
        userRelationshipKey,
      );
      return sendJson(res, 200, {
        agentKey: userRelationshipKey,
        profile: readSharedAgentRelationship(
          principal.account.id,
          agentId,
          principal.account.displayName,
        ),
      });
    }

    if (userRelationshipKey && req.method === "PATCH") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const agentId = resolveEnterpriseUserRuntimeAgentId(
        config,
        principal.account,
        userRelationshipKey,
      );
      const input = parseSharedAgentRelationshipPatch(await readJson(req));
      const profile = writeSharedAgentRelationship(
        principal.account.id,
        agentId,
        input.baseRevision,
        input.profile,
      );
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "agent.shared.relationship.update",
        targetType: "agent-relationship",
        targetId: agentId,
        requestId: requestId(req),
        before: null,
        after: {
          revision: profile.revision,
          fields: Object.keys(input.profile).toSorted(),
        },
        outcome: "success",
      });
      return sendJson(res, 200, { agentKey: userRelationshipKey, profile });
    }

    if (pathname === "/api/enterprise/user/v2/account" && req.method === "PATCH") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const body = await readJson(req);
      const displayName = requireString(body, "displayName", 128);
      const account = updateEnterpriseAccount(principal.account.id, { displayName });
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "account.self.update",
        targetType: "account",
        targetId: principal.account.id,
        requestId: requestId(req),
        before: null,
        after: { fields: ["displayName"] },
        outcome: "success",
      });
      return sendJson(res, 200, { account: presentEnterpriseUserAuthAccount(account) });
    }

    if (pathname === "/api/enterprise/user/v2/account/avatar" && req.method === "PATCH") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const body = await readJson(req);
      if (Object.keys(body).some((key) => !["mime", "avatarBase64"].includes(key))) {
        throw new Error("FIELD_INVALID:avatar");
      }
      const mime = requireString(body, "mime", 64);
      const encoded = requireString(body, "avatarBase64", 700_000);
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(mime) ||
        encoded.length % 4 !== 0 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)
      ) {
        throw new Error("FIELD_INVALID:avatar");
      }
      const result = setAvatar(principal.account.profileId, Buffer.from(encoded, "base64"), mime);
      if (!result.ok) {
        return sendError(res, 400, result.error.code, "Ảnh đại diện không hợp lệ.");
      }
      const display = getUserProfileDisplay(result.value.id);
      hooks.getGatewayContext?.()?.refreshConnectedUserProfile?.({
        ...display,
        updatedAt: result.value.updatedAt,
      });
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "account.self.avatar.update",
        targetType: "account",
        targetId: principal.account.id,
        requestId: requestId(req),
        before: null,
        after: { fields: ["avatar"] },
        outcome: "success",
      });
      return sendJson(res, 200, { avatarRevision: display.avatarRevision });
    }

    if (
      pathname === "/api/enterprise/user/v2/conversation-projects/assignment" &&
      req.method === "PATCH"
    ) {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const body = await readJson(req);
      if (
        Object.keys(body).some(
          (key) => !["sessionKey", "projectId", "beforeSessionKey"].includes(key),
        )
      ) {
        throw new Error("FIELD_INVALID:conversationProjectAssignment");
      }
      const sessionKey = requireString(body, "sessionKey", 512);
      const projectId = optionalString(body, "projectId", 128);
      const beforeSessionKey = optionalString(body, "beforeSessionKey", 512);
      if (projectId === undefined) {
        throw new Error("FIELD_INVALID:projectId");
      }
      if (projectId === null && beforeSessionKey !== undefined) {
        throw new Error("FIELD_INVALID:beforeSessionKey");
      }
      if (projectId !== null) {
        const context = hooks.getGatewayContext?.();
        if (!context) {
          return sendError(res, 503, "RUNTIME_UNAVAILABLE", "Gateway runtime chưa sẵn sàng.");
        }
        await requireEnterpriseUserConversation({
          context,
          account: principal.account,
          sessionId: principal.sessionId,
          sessionKey,
        });
      }
      assignEnterpriseConversationProject(
        principal.account.id,
        sessionKey,
        projectId,
        beforeSessionKey,
      );
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "conversation.project.assign",
        targetType: "conversation",
        targetId: sessionKey,
        requestId: requestId(req),
        before: null,
        after: {
          projectId,
          ...(beforeSessionKey !== undefined ? { beforeSessionKey } : {}),
          fields:
            beforeSessionKey !== undefined ? ["projectId", "beforeSessionKey"] : ["projectId"],
        },
        outcome: "success",
      });
      return sendJson(res, 200, { ok: true });
    }

    const conversationProjectId = userConversationProjectPath(pathname);
    if (conversationProjectId === null && req.method === "GET") {
      const principal = requireUser(req, res);
      return principal
        ? sendJson(res, 200, {
            items: listEnterpriseConversationProjects(principal.account.id),
          })
        : true;
    }

    if (conversationProjectId === null && req.method === "POST") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const body = await readJson(req);
      if (Object.keys(body).some((key) => !["name", "idempotencyKey"].includes(key))) {
        throw new Error("FIELD_INVALID:conversationProject");
      }
      const project = createEnterpriseConversationProject(principal.account.id, {
        name: requireString(body, "name", 80),
        idempotencyKey: requireString(body, "idempotencyKey", 128),
      });
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "conversation.project.create",
        targetType: "conversation-project",
        targetId: project.id,
        requestId: requestId(req),
        before: null,
        after: { fields: ["name"] },
        outcome: "success",
      });
      return sendJson(res, 201, { project });
    }

    if (typeof conversationProjectId === "string" && req.method === "PATCH") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const body = await readJson(req);
      if (Object.keys(body).some((key) => key !== "name")) {
        throw new Error("FIELD_INVALID:conversationProject");
      }
      const project = renameEnterpriseConversationProject(
        principal.account.id,
        conversationProjectId,
        requireString(body, "name", 80),
      );
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "conversation.project.rename",
        targetType: "conversation-project",
        targetId: project.id,
        requestId: requestId(req),
        before: null,
        after: { fields: ["name"] },
        outcome: "success",
      });
      return sendJson(res, 200, { project });
    }

    if (typeof conversationProjectId === "string" && req.method === "DELETE") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      deleteEnterpriseConversationProject(principal.account.id, conversationProjectId);
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "conversation.project.delete",
        targetType: "conversation-project",
        targetId: conversationProjectId,
        requestId: requestId(req),
        before: null,
        after: { fields: ["deleted", "assignmentsCleared"] },
        outcome: "success",
      });
      return sendJson(res, 200, { ok: true });
    }

    const automationRunId = userAutomationRunPath(pathname);
    if (automationRunId && req.method === "POST") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const context = hooks.getGatewayContext?.();
      if (!context) {
        return sendError(res, 503, "RUNTIME_UNAVAILABLE", "Gateway runtime chưa sẵn sàng.");
      }
      await runUserAutomation(
        { config, context, account: principal.account, sessionId: principal.sessionId },
        automationRunId,
      );
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "automation.run",
        targetType: "automation",
        targetId: automationRunId,
        requestId: requestId(req),
        before: null,
        after: { fields: ["run"] },
        outcome: "success",
      });
      return sendJson(res, 202, { ok: true });
    }

    const userAutomationId = userAutomationPath(pathname);
    if (userAutomationId === null && req.method === "GET") {
      const principal = requireUser(req, res);
      if (!principal) {
        return true;
      }
      const context = hooks.getGatewayContext?.();
      return context
        ? sendJson(res, 200, {
            items: await listUserAutomations({
              config,
              context,
              account: principal.account,
              sessionId: principal.sessionId,
            }),
          })
        : sendError(res, 503, "RUNTIME_UNAVAILABLE", "Gateway runtime chưa sẵn sàng.");
    }

    if (userAutomationId === null && req.method === "POST") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const context = hooks.getGatewayContext?.();
      if (!context) {
        return sendError(res, 503, "RUNTIME_UNAVAILABLE", "Gateway runtime chưa sẵn sàng.");
      }
      const item = await createUserAutomation(
        { config, context, account: principal.account, sessionId: principal.sessionId },
        parseUserAutomationInput(await readJson(req)),
      );
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "automation.create",
        targetType: "automation",
        targetId: item.id,
        requestId: requestId(req),
        before: null,
        after: {
          revision: item.revision,
          fields: ["name", "enabled", "agentKey", "schedule", "prompt"],
        },
        outcome: "success",
      });
      return sendJson(res, 201, { item });
    }

    if (typeof userAutomationId === "string" && req.method === "PATCH") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const context = hooks.getGatewayContext?.();
      if (!context) {
        return sendError(res, 503, "RUNTIME_UNAVAILABLE", "Gateway runtime chưa sẵn sàng.");
      }
      const body = await readJson(req);
      if (Object.keys(body).some((key) => !["revision", "automation"].includes(key))) {
        throw new Error("FIELD_INVALID:automation");
      }
      const item = await updateUserAutomation(
        { config, context, account: principal.account, sessionId: principal.sessionId },
        userAutomationId,
        requireString(body, "revision", 256),
        parseUserAutomationInput(body.automation),
      );
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "automation.update",
        targetType: "automation",
        targetId: item.id,
        requestId: requestId(req),
        before: null,
        after: {
          revision: item.revision,
          fields: ["name", "enabled", "agentKey", "schedule", "prompt"],
        },
        outcome: "success",
      });
      return sendJson(res, 200, { item });
    }

    if (typeof userAutomationId === "string" && req.method === "DELETE") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const context = hooks.getGatewayContext?.();
      if (!context) {
        return sendError(res, 503, "RUNTIME_UNAVAILABLE", "Gateway runtime chưa sẵn sàng.");
      }
      await deleteUserAutomation(
        { config, context, account: principal.account, sessionId: principal.sessionId },
        userAutomationId,
      );
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "automation.delete",
        targetType: "automation",
        targetId: userAutomationId,
        requestId: requestId(req),
        before: null,
        after: { fields: ["deleted"] },
        outcome: "success",
      });
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/enterprise/user/v2/personal-agent" && req.method === "GET") {
      const principal = requireUser(req, res);
      return principal
        ? sendJson(res, 200, {
            profile: readPersonalAgentProfile(principal.account.id, principal.account.displayName),
          })
        : true;
    }

    if (pathname === "/api/enterprise/user/v2/conversations/open" && req.method === "POST") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const body = await readJson(req);
      if (
        Object.keys(body).some(
          (key) => !["agentKey", "mode", "clientRequestId", "projectId"].includes(key),
        )
      ) {
        throw new Error("FIELD_INVALID:conversation");
      }
      const agentKey = requireString(body, "agentKey", 128) as AgentKey;
      const mode = requireString(body, "mode", 32);
      requireString(body, "clientRequestId", 128);
      const projectId = optionalString(body, "projectId", 128);
      if (
        (agentKey !== "personal" && !agentKey.startsWith("shared:")) ||
        (mode !== "resume-latest" && mode !== "new") ||
        projectId === null
      ) {
        throw new Error("FIELD_INVALID:conversation");
      }
      if (projectId && !readEnterpriseConversationProject(principal.account.id, projectId)) {
        throw new Error("CONVERSATION_PROJECT_NOT_FOUND");
      }
      const context = hooks.getGatewayContext?.();
      if (!context) {
        return sendError(res, 503, "RUNTIME_UNAVAILABLE", "Gateway runtime chưa sẵn sàng.");
      }
      const result = await openEnterpriseUserConversation({
        config,
        context,
        account: principal.account,
        sessionId: principal.sessionId,
        agentKey,
        mode,
      });
      if (projectId) {
        assignEnterpriseConversationProject(principal.account.id, result.sessionKey, projectId);
      }
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: result.resumed ? "conversation.resume" : "conversation.create",
        targetType: "conversation",
        targetId: result.conversationId,
        requestId: requestId(req),
        before: null,
        after: {
          agentKey,
          ...(projectId ? { projectId } : {}),
          fields: projectId ? ["agentKey", "mode", "projectId"] : ["agentKey", "mode"],
        },
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/enterprise/user/v2/personal-agent" && req.method === "PATCH") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      if (!principal.account.personalAgentEnabled) {
        return sendError(
          res,
          403,
          "PERSONAL_AGENT_DISABLED",
          "Personal Agent đã bị doanh nghiệp tắt.",
        );
      }
      const input = parsePersonalAgentProfilePatch(await readJson(req));
      const profile = writePersonalAgentProfile(
        principal.account.id,
        input.baseRevision,
        input.profile,
      );
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "personal-agent.profile.update",
        targetType: "personal-agent",
        targetId: principal.account.id,
        requestId: requestId(req),
        before: null,
        after: { revision: profile.revision, fields: Object.keys(input.profile).toSorted() },
        outcome: "success",
      });
      return sendJson(res, 200, { profile });
    }

    if (pathname === "/api/enterprise/user/v2/personal-agent/reset" && req.method === "POST") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      if (!principal.account.personalAgentEnabled) {
        return sendError(
          res,
          403,
          "PERSONAL_AGENT_DISABLED",
          "Personal Agent đã bị doanh nghiệp tắt.",
        );
      }
      const profile = resetPersonalAgentProfile(
        principal.account.id,
        principal.account.displayName,
        parsePersonalAgentProfileReset(await readJson(req)),
      );
      clearPersonalAgentKnowledge(principal.account.id);
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "personal-agent.profile.reset",
        targetType: "personal-agent",
        targetId: principal.account.id,
        requestId: requestId(req),
        before: null,
        after: { revision: profile.revision, fields: ["profile", "knowledge"] },
        outcome: "success",
      });
      return sendJson(res, 200, { profile });
    }

    const userKnowledgeRoute = userKnowledgePath(pathname);
    if (userKnowledgeRoute === null && req.method === "GET") {
      const principal = requireUser(req, res);
      return principal
        ? sendJson(res, 200, {
            items: listPersonalAgentKnowledge(principal.account.id),
          })
        : true;
    }

    if (userKnowledgeRoute === null && req.method === "POST") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      if (!principal.account.personalAgentEnabled) {
        return sendError(
          res,
          403,
          "PERSONAL_AGENT_DISABLED",
          "Personal Agent đã bị doanh nghiệp tắt.",
        );
      }
      const item = createPersonalAgentKnowledge(
        principal.account.id,
        parseKnowledgeCreate(await readJson(req)),
      );
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "personal-agent.knowledge.create",
        targetType: "personal-knowledge",
        targetId: item.id,
        requestId: requestId(req),
        before: null,
        after: { revision: item.revision, fields: ["title", "kind", "sourceName", "content"] },
        outcome: "success",
      });
      return sendJson(res, 201, { item });
    }

    if (typeof userKnowledgeRoute === "string" && req.method === "PATCH") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      const input = parseKnowledgePatch(await readJson(req));
      const item = updatePersonalAgentKnowledge(
        principal.account.id,
        userKnowledgeRoute,
        input.baseRevision,
        { title: input.title, content: input.content },
      );
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "personal-agent.knowledge.update",
        targetType: "personal-knowledge",
        targetId: item.id,
        requestId: requestId(req),
        before: null,
        after: { revision: item.revision, fields: ["title", "content"] },
        outcome: "success",
      });
      return sendJson(res, 200, { item });
    }

    if (typeof userKnowledgeRoute === "string" && req.method === "DELETE") {
      const principal = requireUser(req, res);
      if (!principal || !requirePortalCsrf(req, res, principal, "user")) {
        return true;
      }
      deletePersonalAgentKnowledge(principal.account.id, userKnowledgeRoute);
      appendEnterpriseAuditEvent({
        actorAccountId: principal.account.id,
        actorSessionId: principal.sessionId,
        action: "personal-agent.knowledge.delete",
        targetType: "personal-knowledge",
        targetId: userKnowledgeRoute,
        requestId: requestId(req),
        before: null,
        after: { fields: ["deleted"] },
        outcome: "success",
      });
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/enterprise/admin/accounts" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const query = (searchParams.get("query") ?? "").trim().toLowerCase();
      const role = searchParams.get("role");
      const status = searchParams.get("status");
      const preset = searchParams.get("preset");
      const personalAgent = searchParams.get("personalAgent");
      const limit = Math.max(1, Math.min(Number(searchParams.get("limit")) || 25, 100));
      const offset = Math.max(0, Number(searchParams.get("cursor")) || 0);
      const sort = searchParams.get("sort") ?? "username";
      let accounts = listEnterpriseAccounts().filter(
        (account) =>
          (!query ||
            account.username.toLowerCase().includes(query) ||
            account.displayName.toLowerCase().includes(query)) &&
          (!role || account.role === role) &&
          (!status || (status === "enabled" ? account.enabled : !account.enabled)) &&
          (!preset || account.accessPresetKey === preset) &&
          (!personalAgent || account.personalAgentEnabled === (personalAgent === "enabled")),
      );
      accounts = accounts.toSorted((left, right) => {
        if (sort === "-updatedAt") {
          return right.updatedAt - left.updatedAt;
        }
        if (sort === "-lastLoginAt") {
          return (right.lastLoginAt ?? 0) - (left.lastLoginAt ?? 0);
        }
        return left.username.localeCompare(right.username);
      });
      return sendJson(res, 200, {
        accounts: accounts.slice(offset, offset + limit),
        pageInfo: {
          total: accounts.length,
          nextCursor: offset + limit < accounts.length ? String(offset + limit) : null,
        },
      });
    }

    if (pathname === "/api/enterprise/admin/accounts" && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      const role = requireString(body, "role", 32);
      if (role !== "administrator" && role !== "employee") {
        return sendError(res, 400, "ROLE_INVALID", "Role không hợp lệ.");
      }
      const skillGrants = body.skillGrants ?? [];
      if (
        !Array.isArray(skillGrants) ||
        skillGrants.length > 200 ||
        skillGrants.some(
          (value) => typeof value !== "string" || !value.startsWith("skill:") || value.length > 256,
        )
      ) {
        throw new Error("FIELD_INVALID:skillGrants");
      }
      let account = createEnterpriseAccount({
        username: requireString(body, "username", 64),
        displayName: requireString(body, "displayName", 128),
        passwordHash: await hashEnterprisePassword(requireString(body, "initialPassword", 512)),
        role,
        mustChangePassword: true,
        enabled: optionalBoolean(body, "enabled"),
        personalAgentEnabled: optionalBoolean(body, "personalAgentEnabled"),
        defaultAgentId: optionalString(body, "defaultAgentId", 128),
        accessPresetKey: optionalString(body, "accessPresetKey", 64) ?? undefined,
      });
      if (skillGrants.length > 0) {
        applyEnterpriseAccessChanges(
          skillGrants.map((resourceId) => ({
            accountId: account.id,
            resourceType: "skill" as const,
            resourceId,
            effect: "allow" as const,
          })),
          { [account.id]: account.policyRevision },
        );
        account = getEnterpriseAccountById(account.id) ?? account;
      }
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "account.create",
        targetType: "account",
        targetId: account.id,
        requestId: requestId(req),
        before: null,
        after: account,
        outcome: "success",
      });
      return sendJson(res, 201, { account });
    }

    const adminAccountRoute = adminAccountPath(pathname);
    if (adminAccountRoute && adminAccountRoute.tail === "" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const account = getEnterpriseAccountById(adminAccountRoute.accountId);
      return account
        ? sendJson(res, 200, {
            account,
            entitlements: listEnterpriseEntitlements(account.id),
            effectivePolicy: effectivePolicy(config, account),
            sessions: listEnterpriseAccountSessions(account.id),
          })
        : sendError(res, 404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
    }

    if (adminAccountRoute && adminAccountRoute.tail === "" && req.method === "PATCH") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const before = getEnterpriseAccountById(adminAccountRoute.accountId);
      if (!before) {
        return sendError(res, 404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
      }
      const body = await readJson(req);
      const role = optionalString(body, "role", 32);
      if (role !== undefined && role !== "administrator" && role !== "employee") {
        return sendError(res, 400, "ROLE_INVALID", "Role không hợp lệ.");
      }
      const account = updateEnterpriseAccount(before.id, {
        ...(body.displayName === undefined
          ? {}
          : { displayName: requireString(body, "displayName", 128) }),
        ...(role === undefined ? {} : { role }),
        ...(optionalBoolean(body, "enabled") === undefined
          ? {}
          : { enabled: optionalBoolean(body, "enabled") }),
        ...(optionalBoolean(body, "personalAgentEnabled") === undefined
          ? {}
          : { personalAgentEnabled: optionalBoolean(body, "personalAgentEnabled") }),
        ...(body.defaultAgentId === undefined
          ? {}
          : { defaultAgentId: optionalString(body, "defaultAgentId", 128) }),
        ...(body.accessPresetKey === undefined
          ? {}
          : { accessPresetKey: requireString(body, "accessPresetKey", 64) }),
      });
      if (account.enabled !== before.enabled || account.role !== before.role) {
        hooks.disconnectClientsForProfile?.(account.profileId);
      }
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "account.update",
        targetType: "account",
        targetId: account.id,
        requestId: requestId(req),
        before,
        after: account,
        outcome: "success",
      });
      return sendJson(res, 200, { account });
    }

    if (
      adminAccountRoute &&
      adminAccountRoute.tail === "/reset-password" &&
      req.method === "POST"
    ) {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const account = getEnterpriseAccountById(adminAccountRoute.accountId);
      if (!account) {
        return sendError(res, 404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
      }
      const body = await readJson(req);
      const updated = updateEnterpriseAccount(account.id, {
        passwordHash: await hashEnterprisePassword(requireString(body, "newPassword", 512)),
        mustChangePassword: true,
      });
      revokeEnterpriseAccountSessions(account.id, "password_reset");
      hooks.disconnectClientsForProfile?.(account.profileId);
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "account.password_reset",
        targetType: "account",
        targetId: account.id,
        requestId: requestId(req),
        before: null,
        after: { mustChangePassword: true },
        outcome: "success",
      });
      return sendJson(res, 200, { account: updated });
    }

    if (adminAccountRoute?.tail === "/sessions" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      return sendJson(res, 200, {
        sessions: listEnterpriseAccountSessions(adminAccountRoute.accountId),
      });
    }

    const revokeSessionMatch = adminAccountRoute?.tail.match(/^\/sessions\/([^/]+)\/revoke$/);
    if (adminAccountRoute && revokeSessionMatch?.[1] && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      revokeEnterpriseStoredSession(
        adminAccountRoute.accountId,
        decodeURIComponent(revokeSessionMatch[1]),
        "admin_revoked",
      );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "account.session_revoke",
        targetType: "account",
        targetId: adminAccountRoute.accountId,
        requestId: requestId(req),
        before: null,
        after: { sessionRevoked: true },
        outcome: "success",
      });
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/enterprise/admin/agents" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      return sendJson(res, 200, listEnterpriseAgentCatalog(config));
    }

    if (pathname === "/api/enterprise/admin/agents/shared" && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      const result = await createEnterpriseSharedAgent({
        id: requireString(body, "id", 64),
        name: requireString(body, "name", 128),
        model: optionalString(body, "model", 256),
        workspace: optionalString(body, "workspace", 1024),
        baseHash: requireString(body, "baseHash", 256),
      });
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "agent.shared.create",
        targetType: "agent",
        targetId: result.agentId,
        requestId: requestId(req),
        before: null,
        after: { agentId: result.agentId, hash: result.hash },
        outcome: "success",
      });
      return sendJson(res, 201, result);
    }

    const adminRelationshipRoute = adminSharedRelationshipPath(pathname);
    if (adminRelationshipRoute?.files && req.method === "GET") {
      const admin = requireAdmin(req, res);
      if (!admin) {
        return true;
      }
      const name = searchParams.get("name");
      if (!name) {
        throw new Error("FIELD_INVALID:name");
      }
      const result = await readEnterpriseSharedRelationshipFile(
        config,
        adminRelationshipRoute.agentId,
        adminRelationshipRoute.accountId,
        name,
      );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "agent.shared.relationship.file.read",
        targetType: "agent-relationship",
        targetId: `${result.agentId}:${result.accountId}`,
        requestId: requestId(req),
        before: null,
        after: { name: result.file.name },
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (adminRelationshipRoute?.files && req.method === "PUT") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req, MAX_AGENT_FILE_BODY_BYTES);
      const baseRevision = body.baseRevision;
      if (baseRevision !== null && typeof baseRevision !== "string") {
        throw new Error("FIELD_INVALID:baseRevision");
      }
      const result = await writeEnterpriseSharedRelationshipFile(
        config,
        adminRelationshipRoute.agentId,
        adminRelationshipRoute.accountId,
        {
          name: requireString(body, "name", 128),
          content: requireFileContent(body),
          baseRevision,
        },
      );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "agent.shared.relationship.file.write",
        targetType: "agent-relationship",
        targetId: `${result.agentId}:${result.accountId}`,
        requestId: requestId(req),
        before: null,
        after: { name: result.file.name, size: result.file.size },
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (adminRelationshipRoute && !adminRelationshipRoute.files && req.method === "PATCH") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const input = parseSharedAgentRelationshipPatch(await readJson(req));
      const profile = updateEnterpriseSharedRelationship(
        config,
        adminRelationshipRoute.agentId,
        adminRelationshipRoute.accountId,
        input.baseRevision,
        input.profile,
      );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "agent.shared.relationship.admin-update",
        targetType: "agent-relationship",
        targetId: `${adminRelationshipRoute.agentId}:${adminRelationshipRoute.accountId}`,
        requestId: requestId(req),
        before: null,
        after: {
          revision: profile.revision,
          fields: Object.keys(input.profile).toSorted(),
        },
        outcome: "success",
      });
      return sendJson(res, 200, { profile });
    }

    const adminAgentRoute = adminAgentPath(pathname);
    if (adminAgentRoute?.panel && req.method === "GET") {
      const admin = requireAdmin(req, res);
      if (!admin) {
        return true;
      }
      const runtime = { gatewayContext: hooks.getGatewayContext?.() };
      const requestedFile = searchParams.get("name");
      const result =
        adminAgentRoute.panel === "files" && requestedFile
          ? await readEnterpriseAgentFile(
              config,
              adminAgentRoute.scope,
              adminAgentRoute.id,
              requestedFile,
            )
          : await readEnterpriseAgentPanel(
              config,
              adminAgentRoute.scope,
              adminAgentRoute.id,
              adminAgentRoute.panel,
              runtime,
            );
      if (adminAgentRoute.scope === "personal" || adminAgentRoute.panel === "relationships") {
        appendEnterpriseAuditEvent({
          actorAccountId: admin.account.id,
          actorSessionId: admin.sessionId,
          action:
            adminAgentRoute.scope === "personal"
              ? `agent.personal.${adminAgentRoute.panel}.read`
              : "agent.shared.relationships.read",
          targetType:
            adminAgentRoute.scope === "personal" ? "personal-agent" : "agent-relationship",
          targetId: adminAgentRoute.id,
          requestId: requestId(req),
          before: null,
          after: {
            panel: adminAgentRoute.panel,
            ...(requestedFile ? { name: requestedFile } : {}),
          },
          outcome: "success",
        });
      }
      return sendJson(res, 200, result);
    }

    if (adminAgentRoute?.panel === "files" && req.method === "PUT") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req, MAX_AGENT_FILE_BODY_BYTES);
      const baseRevision = body.baseRevision;
      if (baseRevision !== null && typeof baseRevision !== "string") {
        throw new Error("FIELD_INVALID:baseRevision");
      }
      const result = await writeEnterpriseAgentFile(
        config,
        adminAgentRoute.scope,
        adminAgentRoute.id,
        {
          name: requireString(body, "name", 128),
          content: requireFileContent(body),
          baseRevision,
        },
      );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: `agent.${adminAgentRoute.scope}.file.write`,
        targetType: adminAgentRoute.scope === "personal" ? "personal-agent" : "agent",
        targetId: adminAgentRoute.id,
        requestId: requestId(req),
        before: null,
        after: { name: result.file.name, size: result.file.size },
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (
      adminAgentRoute?.panel &&
      (adminAgentRoute.panel === "tools" || adminAgentRoute.panel === "skills") &&
      req.method === "PATCH"
    ) {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      const result =
        adminAgentRoute.panel === "tools"
          ? await updateEnterpriseAgentTools(config, adminAgentRoute.scope, adminAgentRoute.id, {
              profile: optionalToolProfile(body),
              alsoAllow: requireStringArray(body, "alsoAllow"),
              deny: requireStringArray(body, "deny"),
              ...(adminAgentRoute.scope === "personal"
                ? { baseRevision: requireInteger(body, "baseRevision") }
                : { baseHash: requireString(body, "baseHash", 256) }),
            })
          : await updateEnterpriseAgentSkills(
              adminAgentRoute.scope,
              adminAgentRoute.id,
              body.skills === null ? null : requireStringArray(body, "skills"),
              requireString(body, "baseHash", 256),
            );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: `agent.${adminAgentRoute.scope}.${adminAgentRoute.panel}.update`,
        targetType: adminAgentRoute.scope === "personal" ? "personal-agent" : "agent",
        targetId: adminAgentRoute.id,
        requestId: requestId(req),
        before: null,
        after: result,
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (adminAgentRoute?.panel === "cron" && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      const action = requireString(body, "action", 16);
      const runtime = { gatewayContext: hooks.getGatewayContext?.() };
      const result =
        action === "create"
          ? await createEnterpriseAgentCronJob(
              config,
              adminAgentRoute.scope,
              adminAgentRoute.id,
              parseCronCreate(body),
              runtime,
            )
          : action === "update"
            ? await updateEnterpriseAgentCronJob(
                config,
                adminAgentRoute.scope,
                adminAgentRoute.id,
                requireString(body, "jobId", 128),
                parseCronPatch(body, requireString(body, "jobId", 128)),
                requireInteger(body, "expectedUpdatedAt"),
                runtime,
              )
            : action === "run"
              ? await runEnterpriseAgentCronJob(
                  config,
                  adminAgentRoute.scope,
                  adminAgentRoute.id,
                  requireString(body, "jobId", 128),
                  runtime,
                )
              : action === "remove"
                ? await removeEnterpriseAgentCronJob(
                    config,
                    adminAgentRoute.scope,
                    adminAgentRoute.id,
                    requireString(body, "jobId", 128),
                    requireInteger(body, "expectedUpdatedAt"),
                    runtime,
                  )
                : (() => {
                    throw new Error("FIELD_INVALID:action");
                  })();
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: `agent.${adminAgentRoute.scope}.cron.${action}`,
        targetType: adminAgentRoute.scope === "personal" ? "personal-agent" : "agent",
        targetId: adminAgentRoute.id,
        requestId: requestId(req),
        before: null,
        after: { jobId: typeof body.jobId === "string" ? body.jobId : null },
        outcome: "success",
      });
      return sendJson(res, action === "create" ? 201 : 200, result);
    }

    if (adminAgentRoute?.panel === "memory" && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      const action = requireString(body, "action", 64);
      if (
        ![
          "backfillDreamDiary",
          "resetDreamDiary",
          "resetGroundedShortTerm",
          "repairDreamingArtifacts",
          "dedupeDreamDiary",
        ].includes(action)
      ) {
        throw new Error("FIELD_INVALID:action");
      }
      const result = await runEnterpriseMemoryAction(
        config,
        adminAgentRoute.scope,
        adminAgentRoute.id,
        action as
          | "backfillDreamDiary"
          | "resetDreamDiary"
          | "resetGroundedShortTerm"
          | "repairDreamingArtifacts"
          | "dedupeDreamDiary",
        { gatewayContext: hooks.getGatewayContext?.() },
      );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: `agent.${adminAgentRoute.scope}.memory.${action}`,
        targetType: adminAgentRoute.scope === "personal" ? "personal-agent" : "agent",
        targetId: adminAgentRoute.id,
        requestId: requestId(req),
        before: null,
        after: { action },
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (
      adminAgentRoute?.scope === "shared" &&
      adminAgentRoute.panel === "overview" &&
      req.method === "PATCH"
    ) {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      const result = await updateEnterpriseSharedAgent(
        adminAgentRoute.id,
        {
          name: optionalString(body, "name", 128) ?? undefined,
          model: optionalString(body, "model", 256),
          workspace: optionalString(body, "workspace", 1024),
        },
        requireString(body, "baseHash", 256),
      );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "agent.shared.update",
        targetType: "agent",
        targetId: result.agentId,
        requestId: requestId(req),
        before: null,
        after: { hash: result.hash },
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (
      adminAgentRoute?.scope === "shared" &&
      adminAgentRoute.panel === undefined &&
      req.method === "DELETE"
    ) {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      const result = await deleteEnterpriseSharedAgent(
        adminAgentRoute.id,
        requireString(body, "baseHash", 256),
      );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "agent.shared.delete",
        targetType: "agent",
        targetId: result.agentId,
        requestId: requestId(req),
        before: null,
        after: { deleted: true, hash: result.hash },
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/enterprise/admin/skills" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const selected = searchParams.get("accountId");
      const account = selected ? getEnterpriseAccountById(selected) : undefined;
      const catalog = listEnterpriseSkillCatalog(config, account);
      const query = (searchParams.get("query") ?? "").toLowerCase();
      const category = searchParams.get("category");
      const status = searchParams.get("status");
      const agentId = searchParams.get("agentId");
      return sendJson(res, 200, {
        ...catalog,
        items: catalog.items.filter(
          (item) =>
            (!query ||
              item.name.toLowerCase().includes(query) ||
              item.skillKey.toLowerCase().includes(query)) &&
            (!category || category === "all" || item.category === category) &&
            (!status || status === "all" || item.intrinsicStatus === status) &&
            (!agentId || item.ownerAgentId === agentId) &&
            (!account || catalogItemIsEffectivelyAllowed(item)),
        ),
      });
    }

    if (pathname === "/api/enterprise/admin/skills/search" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const context = hooks.getGatewayContext?.();
      if (!context) {
        throw new Error("GATEWAY_RUNTIME_UNAVAILABLE");
      }
      const { skillsHandlers } = await import("../../gateway/server-methods/skills.js");
      const result = await invokeEnterpriseGatewayHandler(
        skillsHandlers["skills.search"],
        "skills.search",
        { query: searchParams.get("query") ?? "", limit: 20 },
        context,
      );
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/enterprise/admin/skills/detail" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const context = hooks.getGatewayContext?.();
      if (!context) {
        throw new Error("GATEWAY_RUNTIME_UNAVAILABLE");
      }
      const { skillsHandlers } = await import("../../gateway/server-methods/skills.js");
      const result = await invokeEnterpriseGatewayHandler(
        skillsHandlers["skills.detail"],
        "skills.detail",
        { slug: searchParams.get("ref") ?? "" },
        context,
      );
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/enterprise/admin/skills/install" && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const context = hooks.getGatewayContext?.();
      if (!context) {
        throw new Error("GATEWAY_RUNTIME_UNAVAILABLE");
      }
      const body = await readJson(req);
      const ref = requireString(body, "ref", 512);
      const agentId = requireString(body, "agentId", 64);
      const version = optionalString(body, "version", 128);
      const acknowledgeClawHubRisk = optionalBoolean(body, "acknowledgeClawHubRisk") === true;
      const { skillsHandlers } = await import("../../gateway/server-methods/skills.js");
      try {
        const result = await invokeEnterpriseGatewayHandler(
          skillsHandlers["skills.install"],
          "skills.install",
          {
            source: "clawhub",
            slug: ref,
            agentId,
            ...(version ? { version } : {}),
            ...(acknowledgeClawHubRisk ? { acknowledgeClawHubRisk: true } : {}),
          },
          context,
        );
        appendEnterpriseAuditEvent({
          actorAccountId: admin.account.id,
          actorSessionId: admin.sessionId,
          action: "skill.external.install",
          targetType: "skill",
          targetId: ref,
          requestId: requestId(req),
          before: null,
          after: { agentId, ref, version, acknowledgeClawHubRisk, result },
          outcome: "success",
        });
        return sendJson(res, 200, result);
      } catch (error) {
        appendEnterpriseAuditEvent({
          actorAccountId: admin.account.id,
          actorSessionId: admin.sessionId,
          action: "skill.external.install",
          targetType: "skill",
          targetId: ref,
          requestId: requestId(req),
          before: null,
          after: {
            agentId,
            ref,
            version,
            acknowledgeClawHubRisk,
            error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
          },
          outcome: "failure",
        });
        throw error;
      }
    }

    if (pathname === "/api/enterprise/admin/tools" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const selected = searchParams.get("accountId");
      const account = selected ? getEnterpriseAccountById(selected) : undefined;
      const catalog = listEnterpriseToolCatalog(config, account);
      const query = (searchParams.get("query") ?? "").toLowerCase();
      const source = searchParams.get("source");
      const risk = searchParams.get("risk");
      const agentId = searchParams.get("agentId");
      return sendJson(res, 200, {
        ...catalog,
        items: catalog.items.filter((item) => {
          const label = String(item.label ?? "").toLowerCase();
          const toolId = String(item.toolId ?? "").toLowerCase();
          return (
            (!query || label.includes(query) || toolId.includes(query)) &&
            (!source || item.source === source) &&
            (!risk || item.risk === risk) &&
            (!agentId ||
              (Array.isArray(item.agentIds) && item.agentIds.some((value) => value === agentId))) &&
            (!account || catalogItemIsEffectivelyAllowed(item))
          );
        }),
      });
    }

    if (pathname === "/api/enterprise/admin/models/context" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const gatewayContext = hooks.getGatewayContext?.();
      if (!gatewayContext) {
        throw new Error("GATEWAY_RUNTIME_UNAVAILABLE");
      }
      return sendJson(res, 200, readEnterpriseAdminModelContext(gatewayContext.getRuntimeConfig()));
    }

    if (pathname === "/api/enterprise/admin/models/action" && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const gatewayContext = hooks.getGatewayContext?.();
      if (!gatewayContext) {
        throw new Error("GATEWAY_RUNTIME_UNAVAILABLE");
      }
      const body = await readJson(req);
      if (!isEnterpriseAdminModelMethod(body.method)) {
        return sendError(res, 400, "MODEL_METHOD_UNSUPPORTED", "Model action không được phép.");
      }
      const params = body.params;
      if (!params || typeof params !== "object" || Array.isArray(params)) {
        return sendError(res, 400, "VALIDATION_ERROR", "Model action params không hợp lệ.");
      }
      const method = body.method;
      const safeParams = params as Record<string, unknown>;
      const target =
        typeof safeParams.agentId === "string"
          ? safeParams.agentId
          : typeof safeParams.provider === "string"
            ? safeParams.provider
            : null;
      try {
        const result = await invokeEnterpriseAdminModelAction({
          method,
          params: safeParams,
          context: gatewayContext,
          adminSessionId: admin.sessionId,
        });
        if (isEnterpriseAdminModelMutation(method)) {
          appendEnterpriseAuditEvent({
            actorAccountId: admin.account.id,
            actorSessionId: admin.sessionId,
            action: `models.${method}`,
            targetType: "model",
            targetId: target ?? method,
            requestId: requestId(req),
            before: null,
            after: { method, target, outcome: "success" },
            outcome: "success",
          });
        }
        return sendJson(res, 200, result ?? null);
      } catch (error) {
        if (isEnterpriseAdminModelMutation(method)) {
          appendEnterpriseAuditEvent({
            actorAccountId: admin.account.id,
            actorSessionId: admin.sessionId,
            action: `models.${method}`,
            targetType: "model",
            targetId: target ?? method,
            requestId: requestId(req),
            before: null,
            after: { method, target, outcome: "failure" },
            outcome: "failure",
          });
        }
        throw error;
      }
    }

    if (pathname === "/api/enterprise/admin/access" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const accountId = searchParams.get("accountId");
      const resourceKey = searchParams.get("resourceKey");
      const resourceType = searchParams.get("resourceType") as EnterpriseResourceType | null;
      if (accountId) {
        const account = getEnterpriseAccountById(accountId);
        return account
          ? sendJson(res, 200, {
              account,
              entitlements: listEnterpriseEntitlements(accountId),
              effectivePolicy: effectivePolicy(config, account),
            })
          : sendError(res, 404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
      }
      if (
        resourceKey &&
        (resourceType === "agent" || resourceType === "skill" || resourceType === "tool")
      ) {
        return sendJson(res, 200, {
          resourceKey,
          assignments: listEnterpriseEntitlementsForResource(resourceType, resourceKey),
        });
      }
      return sendError(res, 400, "VALIDATION_ERROR", "Thiếu accountId hoặc resourceKey.");
    }

    if (pathname === "/api/enterprise/admin/access/changes" && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      const parsed = parseAccessChanges(body);
      const result = applyEnterpriseAccessChanges(parsed.changes, parsed.baseRevisions);
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "access.change",
        targetType: "entitlement",
        targetId: parsed.changes.map((change) => change.accountId).join(","),
        requestId: requestId(req),
        before: null,
        after: parsed.changes,
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/enterprise/admin/config" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      return sendJson(res, 200, await readEnterpriseAdminConfig());
    }

    if (pathname === "/api/enterprise/admin/config/validate" && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      return sendJson(
        res,
        200,
        await validateEnterpriseAdminConfig(
          requireString(body, "raw", MAX_JSON_BODY_BYTES),
          requireString(body, "baseHash", 256),
        ),
      );
    }

    if (pathname === "/api/enterprise/admin/config/apply" && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      if (body.confirm !== "APPLY") {
        return sendError(res, 400, "CONFIRMATION_REQUIRED", "Cần xác nhận APPLY.");
      }
      const result = await applyEnterpriseAdminConfig(
        requireString(body, "raw", MAX_JSON_BODY_BYTES),
        requireString(body, "baseHash", 256),
      );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "config.apply",
        targetType: "config",
        targetId: result.hash,
        requestId: requestId(req),
        before: null,
        after: result,
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/enterprise/admin/config/history" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      return sendJson(res, 200, { backups: await listEnterpriseConfigBackups() });
    }

    const rollbackMatch = /^\/api\/enterprise\/admin\/config\/history\/(\d+)\/rollback$/.exec(
      pathname,
    );
    if (rollbackMatch?.[1] && req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin || !requirePortalCsrf(req, res, admin, "admin")) {
        return true;
      }
      const body = await readJson(req);
      if (body.confirm !== "ROLLBACK") {
        return sendError(res, 400, "CONFIRMATION_REQUIRED", "Cần xác nhận ROLLBACK.");
      }
      const result = await rollbackEnterpriseAdminConfig(
        Number(rollbackMatch[1]),
        requireString(body, "baseHash", 256),
      );
      appendEnterpriseAuditEvent({
        actorAccountId: admin.account.id,
        actorSessionId: admin.sessionId,
        action: "config.rollback",
        targetType: "config",
        targetId: result.hash,
        requestId: requestId(req),
        before: null,
        after: { slot: Number(rollbackMatch[1]), ...result },
        outcome: "success",
      });
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/enterprise/admin/audit" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      return sendJson(res, 200, {
        events: listEnterpriseAuditEvents(Number(searchParams.get("limit")) || 100),
      });
    }

    if (pathname === "/api/enterprise/accounts" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      return sendJson(res, 200, { accounts: listEnterpriseAccounts() });
    }

    if (pathname === "/api/enterprise/accounts" && req.method === "POST") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const body = await readJson(req);
      const role = requireString(body, "role", 32);
      if (role !== "administrator" && role !== "employee") {
        return sendError(res, 400, "ROLE_INVALID", "Role không hợp lệ.");
      }
      const account = createEnterpriseAccount({
        username: requireString(body, "username", 64),
        displayName: requireString(body, "displayName", 128),
        passwordHash: await hashEnterprisePassword(requireString(body, "initialPassword", 512)),
        role: role as EnterpriseAccountRole,
        mustChangePassword: true,
      });
      return sendJson(res, 201, { account });
    }

    const accountRoute = accountPathMatch(pathname);
    if (accountRoute && accountRoute.tail === "" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const account = getEnterpriseAccountById(accountRoute.accountId);
      return account
        ? sendJson(res, 200, {
            account,
            entitlements: listEnterpriseEntitlements(account.id),
            effectivePolicy: effectivePolicy(config, account),
          })
        : sendError(res, 404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
    }

    if (accountRoute && accountRoute.tail === "" && req.method === "PATCH") {
      const admin = requireAdmin(req, res);
      if (!admin) {
        return true;
      }
      const current = getEnterpriseAccountById(accountRoute.accountId);
      if (!current) {
        return sendError(res, 404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
      }
      const body = await readJson(req);
      const roleRaw = optionalString(body, "role", 32);
      if (roleRaw !== undefined && roleRaw !== "administrator" && roleRaw !== "employee") {
        return sendError(res, 400, "ROLE_INVALID", "Role không hợp lệ.");
      }
      const enabled = optionalBoolean(body, "enabled");
      if (
        current.role === "administrator" &&
        (roleRaw === "employee" || enabled === false) &&
        countEnterpriseAdministrators() <= 1
      ) {
        return sendError(
          res,
          409,
          "LAST_ADMIN_REQUIRED",
          "Không thể khóa hoặc hạ role admin cuối cùng.",
        );
      }
      const account = updateEnterpriseAccount(current.id, {
        ...(body.displayName === undefined
          ? {}
          : { displayName: requireString(body, "displayName", 128) }),
        ...(roleRaw === undefined ? {} : { role: roleRaw as EnterpriseAccountRole }),
        ...(enabled === undefined ? {} : { enabled }),
        ...(optionalBoolean(body, "personalAgentEnabled") === undefined
          ? {}
          : { personalAgentEnabled: optionalBoolean(body, "personalAgentEnabled") }),
        ...(body.defaultAgentId === undefined
          ? {}
          : { defaultAgentId: optionalString(body, "defaultAgentId", 128) }),
      });
      if (account.enabled !== current.enabled || account.role !== current.role) {
        hooks.disconnectClientsForProfile?.(account.profileId);
      }
      return sendJson(res, 200, { account });
    }

    if (accountRoute && accountRoute.tail === "/reset-password" && req.method === "POST") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const account = getEnterpriseAccountById(accountRoute.accountId);
      if (!account) {
        return sendError(res, 404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
      }
      const body = await readJson(req);
      const updated = updateEnterpriseAccount(account.id, {
        passwordHash: await hashEnterprisePassword(requireString(body, "newPassword", 512)),
        mustChangePassword: true,
      });
      revokeEnterpriseAccountSessions(account.id, "password_reset");
      hooks.disconnectClientsForProfile?.(account.profileId);
      return sendJson(res, 200, { account: updated });
    }

    if (accountRoute && accountRoute.tail === "/entitlements" && req.method === "PUT") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const body = await readJson(req);
      const entitlements = replaceEnterpriseEntitlements(
        accountRoute.accountId,
        parseEntitlements(body),
      );
      return sendJson(res, 200, { entitlements });
    }

    if (accountRoute && accountRoute.tail === "/effective-policy" && req.method === "GET") {
      if (!requireAdmin(req, res)) {
        return true;
      }
      const account = getEnterpriseAccountById(accountRoute.accountId);
      return account
        ? sendJson(res, 200, effectivePolicy(config, account))
        : sendError(res, 404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
    }

    return sendError(res, 404, "NOT_FOUND", "Không tìm thấy Enterprise API.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (error instanceof EnterpriseGatewayMethodError) {
      const details = error.gatewayError.details;
      const trust = readClawHubTrustErrorDetails(details);
      const status =
        trust?.clawhubTrustCode === ClawHubTrustErrorCodes.RISK_ACKNOWLEDGEMENT_REQUIRED
          ? 409
          : error.gatewayError.code === ErrorCodes.INVALID_REQUEST
            ? 400
            : 503;
      return sendJson(res, status, {
        code: error.gatewayError.code,
        message: error.gatewayError.message,
        ...(details === undefined ? {} : { details }),
      });
    }
    if (error instanceof EnterpriseAdminModelGatewayError) {
      const code = String(error.shape.code);
      const status = code === "FORBIDDEN" ? 403 : code === "UNAVAILABLE" ? 503 : 400;
      return sendJson(res, status, error.shape);
    }
    if (error instanceof SyntaxError || message === "BODY_INVALID") {
      return sendError(res, 400, "BODY_INVALID", "JSON body không hợp lệ.");
    }
    if (message === "CONTENT_TYPE_REQUIRED") {
      return sendError(res, 415, message, "Content-Type phải là application/json.");
    }
    if (message === "BODY_TOO_LARGE") {
      return sendError(res, 413, message, "Request body vượt quá giới hạn.");
    }
    if (message === "LAST_ADMIN_REQUIRED") {
      return sendError(res, 409, message, "Không thể khóa hoặc hạ role admin cuối cùng.");
    }
    if (message.startsWith("POLICY_REVISION_CONFLICT:")) {
      const [, accountId, currentRevision] = message.split(":");
      return sendJson(res, 409, {
        code: "POLICY_REVISION_CONFLICT",
        message: "Policy đã được thay đổi bởi một quản trị viên khác.",
        accountId,
        currentRevision: Number(currentRevision),
      });
    }
    if (message.startsWith("CONFIG_HASH_CONFLICT:")) {
      return sendJson(res, 409, {
        code: "CONFIG_HASH_CONFLICT",
        message: "Config đã thay đổi; hãy tải lại trước khi áp dụng.",
        currentHash: message.slice("CONFIG_HASH_CONFLICT:".length),
      });
    }
    if (message.startsWith("AGENT_FILE_REVISION_CONFLICT:")) {
      return sendJson(res, 409, {
        code: "AGENT_FILE_REVISION_CONFLICT",
        message: "File đã thay đổi; hãy tải lại trước khi lưu.",
        currentRevision: message.slice("AGENT_FILE_REVISION_CONFLICT:".length),
      });
    }
    if (message.startsWith("PERSONAL_PROFILE_REVISION_CONFLICT:")) {
      return sendJson(res, 409, {
        code: "REVISION_CONFLICT",
        message: "Personal Agent đã được thay đổi ở nơi khác.",
        currentRevision: Number(message.slice("PERSONAL_PROFILE_REVISION_CONFLICT:".length)),
      });
    }
    if (message.startsWith("SHARED_RELATIONSHIP_REVISION_CONFLICT:")) {
      return sendJson(res, 409, {
        code: "REVISION_CONFLICT",
        message: "Hồ sơ danh xưng đã được thay đổi ở nơi khác.",
        currentRevision: Number(message.slice("SHARED_RELATIONSHIP_REVISION_CONFLICT:".length)),
      });
    }
    if (message.startsWith("KNOWLEDGE_REVISION_CONFLICT:")) {
      return sendJson(res, 409, {
        code: "REVISION_CONFLICT",
        message: "Knowledge item đã được thay đổi ở nơi khác.",
        currentRevision: Number(message.slice("KNOWLEDGE_REVISION_CONFLICT:".length)),
      });
    }
    if (message.startsWith("ACCOUNT_TOOL_POLICY_REVISION_CONFLICT:")) {
      return sendJson(res, 409, {
        code: "ACCOUNT_TOOL_POLICY_REVISION_CONFLICT",
        message: "Tool policy đã được thay đổi ở nơi khác; hãy tải lại trước khi lưu.",
        currentRevision: Number(message.slice("ACCOUNT_TOOL_POLICY_REVISION_CONFLICT:".length)),
      });
    }
    if (message === "CRON_JOB_REVISION_CONFLICT") {
      return sendError(res, 409, message, "Cron job đã thay đổi; hãy tải lại trước khi lưu.");
    }
    if (message === "AUTOMATION_REVISION_CONFLICT") {
      return sendError(res, 409, message, "Automation đã thay đổi; hãy tải lại trước khi lưu.");
    }
    if (message.startsWith("FIELD_INVALID") || message.endsWith("_INVALID")) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        message === "PASSWORD_INVALID"
          ? "Mật khẩu phải có từ 10 đến 512 ký tự."
          : "Dữ liệu gửi lên không hợp lệ.",
      );
    }
    if (message === "PASSWORD_REUSE") {
      return sendError(res, 409, message, "Mật khẩu mới không được trùng mật khẩu hiện tại.");
    }
    if (message === "INVALID_CURRENT_PASSWORD") {
      return sendError(res, 401, message, "Mật khẩu hiện tại không đúng.");
    }
    if (message === "ACCOUNT_NOT_FOUND") {
      return sendError(res, 404, message, "Không tìm thấy tài khoản.");
    }
    if (message === "KNOWLEDGE_NOT_FOUND") {
      return sendError(res, 404, message, "Không tìm thấy Knowledge item.");
    }
    if (message === "CONVERSATION_NOT_FOUND") {
      return sendError(res, 404, message, "Không tìm thấy hội thoại thuộc tài khoản này.");
    }
    if (message === "CONVERSATION_PROJECT_NOT_FOUND") {
      return sendError(res, 404, message, "Không tìm thấy Project hội thoại.");
    }
    if (message === "AUTOMATION_NOT_FOUND") {
      return sendError(res, 404, message, "Không tìm thấy Automation.");
    }
    if (message === "KNOWLEDGE_ITEM_LIMIT" || message === "KNOWLEDGE_TOTAL_LIMIT") {
      return sendError(
        res,
        413,
        message,
        message === "KNOWLEDGE_ITEM_LIMIT"
          ? "Bạn đã đạt giới hạn 20 Knowledge items."
          : "Tổng Knowledge đang hoạt động vượt quá 16.000 ký tự.",
      );
    }
    if (message === "KNOWLEDGE_FILE_TOO_LARGE") {
      return sendError(res, 413, message, "File Knowledge vượt quá giới hạn 64 KB.");
    }
    if (message === "KNOWLEDGE_FILE_INVALID") {
      return sendError(res, 400, message, "Chỉ hỗ trợ file UTF-8 .md hoặc .txt.");
    }
    if (message === "KNOWLEDGE_TITLE_DUPLICATE") {
      return sendError(res, 409, message, "Tên Knowledge item đã tồn tại.");
    }
    if (message === "CONVERSATION_PROJECT_NAME_DUPLICATE") {
      return sendError(res, 409, message, "Tên Project đã tồn tại.");
    }
    if (message === "AGENT_NOT_FOUND") {
      return sendError(res, 404, message, "Không tìm thấy agent.");
    }
    if (message === "AGENT_NOT_ASSIGNED") {
      return sendError(res, 409, message, "Agent chưa được cấp cho tài khoản này.");
    }
    if (message === "CRON_JOB_NOT_FOUND") {
      return sendError(res, 404, message, "Không tìm thấy cron job thuộc agent này.");
    }
    if (message === "GATEWAY_RUNTIME_UNAVAILABLE" || message === "RUNTIME_UNAVAILABLE") {
      return sendError(res, 503, message, "Gateway runtime chưa sẵn sàng.");
    }
    if (message === "MODEL_METHOD_UNSUPPORTED") {
      return sendError(res, 400, message, "Model action không được phép.");
    }
    if (
      message === "MODEL_AGENT_SCOPE_DENIED" ||
      message === "MODEL_CONFIG_SCOPE_DENIED" ||
      message === "MODEL_WIZARD_SCOPE_DENIED"
    ) {
      return sendError(res, 403, message, "Model action vượt ngoài phạm vi Admin được phép.");
    }
    if (
      message === "PERSONAL_RUNTIME_SCOPE_UNAVAILABLE" ||
      message === "PERSONAL_AGENT_POLICY_MANAGED_BY_ACCESS" ||
      message === "RELATIONSHIP_SCOPE_UNAVAILABLE"
    ) {
      return sendError(
        res,
        409,
        message,
        message === "PERSONAL_AGENT_POLICY_MANAGED_BY_ACCESS"
          ? "Quyền Tools/Skills của personal agent được quản lý theo tài khoản."
          : "Runtime chưa có khóa ownership riêng cho personal agent này.",
      );
    }
    if (message === "AGENT_IN_USE") {
      return sendError(
        res,
        409,
        message,
        "Agent đang là default/template hoặc còn được cấp cho user.",
      );
    }
    if (message === "AGENT_EXISTS") {
      return sendError(res, 409, message, "Agent ID đã tồn tại.");
    }
    if (message.includes("enterprise_personal_agent_knowledge.account_id")) {
      return sendError(res, 409, "KNOWLEDGE_TITLE_EXISTS", "Tên Knowledge item đã tồn tại.");
    }
    if (message.includes("UNIQUE constraint failed")) {
      return sendError(res, 409, "USERNAME_EXISTS", "Username đã tồn tại.");
    }
    return sendError(res, 500, "ENTERPRISE_INTERNAL_ERROR", "Enterprise API gặp lỗi.");
  }
}
