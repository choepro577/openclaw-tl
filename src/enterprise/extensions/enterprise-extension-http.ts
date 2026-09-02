import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
import { appendEnterpriseAuditEvent } from "../audit/audit-store.js";
import type { EnterprisePrincipal } from "../auth/auth-service.js";
import { invokeEnterpriseGatewayHandler } from "../gateway/invoke-handler.js";
import {
  readJson,
  requestId,
  requireMutationCsrf,
  requirePrincipal,
  sendError,
  sendJson,
  type JsonObject,
} from "../knowledge/enterprise-knowledge-http-common.js";
import { EnterpriseKnowledgeError } from "../knowledge/knowledge-types.js";
import type { AgentKey } from "../user/user-api-contracts.js";
import {
  abandonEnterpriseExtensionIdempotency,
  claimEnterpriseExtensionIdempotency,
  completeEnterpriseExtensionIdempotency,
  hashEnterpriseExtensionRequest,
} from "./extension-idempotency-store.js";
import {
  EnterpriseExtensionError,
  installEnterpriseUserSkill,
  removeEnterpriseUserSkill,
  requestEnterpriseNativePlugin,
  revalidateEnterprisePluginRequestArtifact,
  reviewEnterpriseExtension,
  searchEnterpriseExtensions,
  setEnterpriseUserSkillEnabled,
  updateEnterpriseUserSkill,
} from "./extension-service.js";
import {
  getEnterprisePluginRequest,
  listEnterpriseAccountPluginGrants,
  listEnterprisePluginRequests,
  listEnterpriseUserSkillInstalls,
} from "./extension-store.js";
import type {
  EnterpriseAccountPluginGrant,
  EnterpriseExtensionKind,
  EnterprisePluginRequest,
  EnterpriseUserSkillInstall,
} from "./extension-types.js";
import {
  approveEnterprisePluginRequest,
  cancelEnterprisePluginRequest,
  listEnterprisePluginGrantImpact,
  rejectEnterprisePluginRequest,
  readEnterprisePluginGlobalStatus,
  relinquishEnterprisePluginGrant,
  revokeEnterprisePluginGrant,
} from "./plugin-approval-service.js";

const USER_EXTENSIONS_PREFIX = "/api/enterprise/user/v2/extensions";
const USER_REQUESTS_PREFIX = "/api/enterprise/user/v2/plugin-requests";
const USER_GRANTS_PREFIX = "/api/enterprise/user/v2/plugin-grants";
const ADMIN_REQUESTS_PREFIX = "/api/enterprise/admin/plugin-requests";
const ADMIN_GRANTS_PREFIX = "/api/enterprise/admin/plugin-grants";

function validAgentKey(value: string | null): AgentKey {
  if (value === "personal" || value?.startsWith("shared:")) {
    return value as AgentKey;
  }
  throw new EnterpriseExtensionError("AGENT_KEY_INVALID", 422);
}

function stringField(body: JsonObject, key: string, max = 512): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new EnterpriseExtensionError(`FIELD_INVALID:${key}`, 422);
  }
  return value.trim();
}

function revisionField(body: JsonObject): number {
  const revision = body.baseRevision;
  if (!Number.isSafeInteger(revision) || Number(revision) < 1) {
    throw new EnterpriseExtensionError("BASE_REVISION_INVALID", 422);
  }
  return Number(revision);
}

function rejectUnknownFields(body: JsonObject, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(body).find((key) => !allowedSet.has(key));
  if (unknown) {
    throw new EnterpriseExtensionError(`FIELD_NOT_ALLOWED:${unknown}`, 422);
  }
}

function extensionKind(value: string | null): EnterpriseExtensionKind {
  if (value === "skill" || value === "code_plugin" || value === "bundle_plugin") {
    return value;
  }
  throw new EnterpriseExtensionError("EXTENSION_KIND_INVALID", 422);
}

function suffix(pathname: string, prefix: string): string[] {
  return pathname.slice(prefix.length).split("/").filter(Boolean).map(decodeURIComponent);
}

function audit(params: {
  principal: EnterprisePrincipal;
  req: IncomingMessage;
  action: string;
  targetType: string;
  targetId: string;
  outcome: "success" | "failure";
  after: unknown;
}): void {
  appendEnterpriseAuditEvent({
    actorAccountId: params.principal.account.id,
    actorSessionId: params.principal.sessionId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    requestId: requestId(params.req),
    before: null,
    after: params.after,
    outcome: params.outcome,
  });
}

async function idempotentMutation<T>(params: {
  req: IncomingMessage;
  res: ServerResponse;
  principal: EnterprisePrincipal;
  audience: "admin" | "user";
  operation: string;
  body: JsonObject;
  status?: number;
  execute: () => Promise<T> | T;
}): Promise<true> {
  const rawKey = params.req.headers["idempotency-key"];
  const key = (Array.isArray(rawKey) ? rawKey[0] : rawKey)?.trim() ?? "";
  const requestHash = hashEnterpriseExtensionRequest(params.body);
  const fence = {
    audience: params.audience,
    actorAccountId: params.principal.account.id,
    operation: params.operation,
    key,
    requestHash,
  } as const;
  const claim = claimEnterpriseExtensionIdempotency(fence);
  if (claim.state === "replay") {
    params.res.setHeader("Idempotency-Replayed", "true");
    return sendJson(params.res, claim.status, claim.response);
  }
  try {
    const response = await params.execute();
    const status = params.status ?? 200;
    completeEnterpriseExtensionIdempotency({ ...fence, responseStatus: status, response });
    audit({
      principal: params.principal,
      req: params.req,
      action: `extension.${params.operation.split(":", 1)[0]}`,
      targetType: "enterprise_extension",
      targetId: params.operation.slice(-160),
      outcome: "success",
      after: { operation: params.operation, status },
    });
    return sendJson(params.res, status, response);
  } catch (error) {
    abandonEnterpriseExtensionIdempotency(fence);
    throw error;
  }
}

function presentUserSkillInstall(install: EnterpriseUserSkillInstall) {
  return {
    id: install.id,
    agentKey: install.agentKey,
    clawhubRef: install.clawhubRef,
    skillName: install.skillName,
    exactVersion: install.exactVersion,
    integrity: install.integrity,
    enabled: install.enabled,
    state: install.state,
    safeErrorCode: install.safeErrorCode,
    revision: install.revision,
    createdAt: install.createdAt,
    updatedAt: install.updatedAt,
  };
}

function presentUserPluginRequest(request: EnterprisePluginRequest) {
  return {
    id: request.id,
    packageName: request.packageName,
    packageFamily: request.packageFamily,
    exactVersion: request.exactVersion,
    integrity: request.integrity,
    requestKind: request.requestKind,
    state: request.state,
    decisionReason: request.decisionReason,
    safeErrorCode: request.safeErrorCode,
    revision: request.revision,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function presentUserPluginGrant(grant: EnterpriseAccountPluginGrant) {
  return {
    id: grant.id,
    pluginId: grant.pluginId,
    exactVersion: grant.exactVersion,
    integrity: grant.integrity,
    approvedTools: grant.approvedTools,
    state: grant.state,
    revision: grant.revision,
    createdAt: grant.createdAt,
    updatedAt: grant.updatedAt,
  };
}

function claimedPath(pathname: string): boolean {
  return [
    USER_EXTENSIONS_PREFIX,
    USER_REQUESTS_PREFIX,
    USER_GRANTS_PREFIX,
    ADMIN_REQUESTS_PREFIX,
    ADMIN_GRANTS_PREFIX,
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function handleEnterpriseExtensionHttpRequest(params: {
  req: IncomingMessage;
  res: ServerResponse;
  config: OpenClawConfig;
  pathname: string;
  getGatewayContext?: () => GatewayRequestContext | undefined;
}): Promise<boolean> {
  const { req, res, config, pathname } = params;
  if (!claimedPath(pathname)) {
    return false;
  }
  if (config.enterprise?.userExtensions?.enabled !== true) {
    return sendError(req, res, 404, "USER_EXTENSIONS_DISABLED", "Extensions are not enabled.");
  }
  const audience = pathname.startsWith("/api/enterprise/admin/") ? "admin" : "user";
  let principal: EnterprisePrincipal | undefined;
  let action = "extension.unknown";
  try {
    principal = requirePrincipal(req, audience);
    requireMutationCsrf(req, principal, audience);
    const query = new URL(req.url ?? "/", "http://localhost").searchParams;
    if (
      audience === "user" &&
      [
        "accountId",
        "runtimeAgentId",
        "workspace",
        "path",
        "force",
        "upload",
        "registry",
        "acknowledgeClawHubRisk",
      ].some((key) => query.has(key))
    ) {
      throw new EnterpriseExtensionError("FIELD_NOT_ALLOWED", 422);
    }

    if (pathname === `${USER_EXTENSIONS_PREFIX}/catalog` && req.method === "GET") {
      return sendJson(
        res,
        200,
        await searchEnterpriseExtensions({
          config,
          account: principal.account,
          agentKey: validAgentKey(query.get("agentKey")),
          query: query.get("query") ?? "",
        }),
      );
    }
    if (pathname === `${USER_EXTENSIONS_PREFIX}/detail` && req.method === "GET") {
      const kind = extensionKind(query.get("kind"));
      return sendJson(
        res,
        200,
        await reviewEnterpriseExtension({
          config,
          account: principal.account,
          kind,
          catalogKey: query.get("catalogKey") ?? "",
          ...(kind === "skill" ? { agentKey: validAgentKey(query.get("agentKey")) } : {}),
          ...(query.get("version") ? { version: query.get("version")! } : {}),
        }),
      );
    }
    if (pathname === `${USER_EXTENSIONS_PREFIX}/installed` && req.method === "GET") {
      const agentKey = validAgentKey(query.get("agentKey"));
      // Resolve access even when inventory is empty; callers cannot probe another AgentKey.
      await reviewAgentAccess(config, principal, agentKey);
      return sendJson(res, 200, {
        items: listEnterpriseUserSkillInstalls(principal.account.id, agentKey).map(
          presentUserSkillInstall,
        ),
        grants: listEnterpriseAccountPluginGrants(principal.account.id).map(presentUserPluginGrant),
      });
    }
    if (pathname === `${USER_EXTENSIONS_PREFIX}/skills` && req.method === "POST") {
      action = "extension.skill.install";
      const body = await readJson(req);
      rejectUnknownFields(body, ["reviewToken"]);
      return await idempotentMutation({
        req,
        res,
        principal,
        audience: "user",
        operation: "skill.install",
        body,
        status: 201,
        execute: async () => {
          const install = await installEnterpriseUserSkill({
            config,
            account: principal!.account,
            reviewToken: stringField(body, "reviewToken", 128),
          });
          return { install: presentUserSkillInstall(install) };
        },
      });
    }
    const skillParts = suffix(pathname, `${USER_EXTENSIONS_PREFIX}/skills`);
    if (skillParts.length === 2 && skillParts[1] === "update" && req.method === "POST") {
      action = "extension.skill.update";
      const body = await readJson(req);
      rejectUnknownFields(body, ["baseRevision", "reviewToken"]);
      return await idempotentMutation({
        req,
        res,
        principal,
        audience: "user",
        operation: `skill.update:${skillParts[0]}`,
        body,
        execute: async () => ({
          install: presentUserSkillInstall(
            await updateEnterpriseUserSkill({
              config,
              account: principal!.account,
              id: skillParts[0]!,
              baseRevision: revisionField(body),
              reviewToken: stringField(body, "reviewToken", 128),
            }),
          ),
        }),
      });
    }
    if (skillParts.length === 1 && req.method === "PATCH") {
      action = "extension.skill.toggle";
      const body = await readJson(req);
      rejectUnknownFields(body, ["baseRevision", "enabled"]);
      if (typeof body.enabled !== "boolean") {
        throw new EnterpriseExtensionError("FIELD_INVALID:enabled", 422);
      }
      return await idempotentMutation({
        req,
        res,
        principal,
        audience: "user",
        operation: `skill.toggle:${skillParts[0]}`,
        body,
        execute: async () => ({
          install: presentUserSkillInstall(
            await setEnterpriseUserSkillEnabled({
              config,
              account: principal!.account,
              id: skillParts[0]!,
              baseRevision: revisionField(body),
              enabled: body.enabled as boolean,
            }),
          ),
        }),
      });
    }
    if (skillParts.length === 1 && req.method === "DELETE") {
      action = "extension.skill.remove";
      const body = await readJson(req);
      rejectUnknownFields(body, ["baseRevision"]);
      return await idempotentMutation({
        req,
        res,
        principal,
        audience: "user",
        operation: `skill.remove:${skillParts[0]}`,
        body,
        execute: async () => {
          await removeEnterpriseUserSkill({
            config,
            account: principal!.account,
            id: skillParts[0]!,
            baseRevision: revisionField(body),
          });
          return { ok: true };
        },
      });
    }
    if (pathname === USER_REQUESTS_PREFIX && req.method === "GET") {
      return sendJson(res, 200, {
        items: listEnterprisePluginRequests({ accountId: principal.account.id }).map(
          presentUserPluginRequest,
        ),
      });
    }
    if (pathname === USER_REQUESTS_PREFIX && req.method === "POST") {
      action = "extension.plugin.request";
      const body = await readJson(req);
      rejectUnknownFields(body, ["reviewToken"]);
      return await idempotentMutation({
        req,
        res,
        principal,
        audience: "user",
        operation: "plugin.request",
        body,
        status: 201,
        execute: async () => ({
          request: presentUserPluginRequest(
            await requestEnterpriseNativePlugin({
              config,
              account: principal!.account,
              reviewToken: stringField(body, "reviewToken", 128),
            }),
          ),
        }),
      });
    }
    const userRequestParts = suffix(pathname, USER_REQUESTS_PREFIX);
    if (
      userRequestParts.length === 2 &&
      userRequestParts[1] === "cancel" &&
      req.method === "POST"
    ) {
      action = "extension.plugin.request.cancel";
      const body = await readJson(req);
      rejectUnknownFields(body, ["baseRevision"]);
      return await idempotentMutation({
        req,
        res,
        principal,
        audience: "user",
        operation: `plugin.request.cancel:${userRequestParts[0]}`,
        body,
        execute: () => ({
          request: presentUserPluginRequest(
            cancelEnterprisePluginRequest({
              accountId: principal!.account.id,
              requestId: userRequestParts[0]!,
              baseRevision: revisionField(body),
            }),
          ),
        }),
      });
    }
    const userGrantParts = suffix(pathname, USER_GRANTS_PREFIX);
    if (
      userGrantParts.length === 2 &&
      userGrantParts[1] === "relinquish" &&
      req.method === "POST"
    ) {
      action = "extension.plugin.grant.relinquish";
      const body = await readJson(req);
      rejectUnknownFields(body, ["baseRevision"]);
      return await idempotentMutation({
        req,
        res,
        principal,
        audience: "user",
        operation: `plugin.grant.relinquish:${userGrantParts[0]}`,
        body,
        execute: () => ({
          grant: presentUserPluginGrant(
            relinquishEnterprisePluginGrant({
              accountId: principal!.account.id,
              grantId: userGrantParts[0]!,
              baseRevision: revisionField(body),
            }),
          ),
        }),
      });
    }
    if (pathname === ADMIN_REQUESTS_PREFIX && req.method === "GET") {
      return sendJson(res, 200, { items: listEnterprisePluginRequests() });
    }
    const adminRequestParts = suffix(pathname, ADMIN_REQUESTS_PREFIX);
    if (adminRequestParts.length === 1 && req.method === "GET") {
      const request = getEnterprisePluginRequest(adminRequestParts[0]!);
      if (!request) {
        throw new EnterpriseExtensionError("PLUGIN_REQUEST_NOT_FOUND", 404);
      }
      const account = getEnterpriseAccountById(request.requesterAccountId);
      const globalStatus = readEnterprisePluginGlobalStatus(request);
      const grants = globalStatus.pluginId
        ? listEnterprisePluginGrantImpact(globalStatus.pluginId)
        : [];
      let artifactCheck:
        | { ok: true; checkedAt: number }
        | {
            ok: false;
            checkedAt: number;
            errorCode: string;
          };
      try {
        await revalidateEnterprisePluginRequestArtifact(request);
        artifactCheck = { ok: true, checkedAt: Date.now() };
      } catch (error) {
        artifactCheck = {
          ok: false,
          checkedAt: Date.now(),
          errorCode:
            error instanceof EnterpriseExtensionError ? error.code : "ARTIFACT_REVALIDATION_FAILED",
        };
      }
      return sendJson(res, 200, {
        request,
        account: account
          ? { id: account.id, username: account.username, displayName: account.displayName }
          : null,
        globalImpact: {
          scope: "gateway",
          nativeSurfaces: ["tools", "hooks", "routes", "services", "providers", "secrets"],
          affectedAccounts: grants.map((grant) => grant.accountId),
        },
        artifactCheck,
        globalStatus,
        grants,
      });
    }
    if (
      adminRequestParts.length === 2 &&
      adminRequestParts[1] === "approve" &&
      req.method === "POST"
    ) {
      action = "extension.plugin.request.approve";
      const body = await readJson(req);
      rejectUnknownFields(body, ["baseRevision"]);
      const context = params.getGatewayContext?.();
      if (!context) {
        throw new EnterpriseExtensionError("GATEWAY_RUNTIME_UNAVAILABLE", 503);
      }
      const { pluginsHandlers } = await import("../../gateway/server-methods/plugins.js");
      return await idempotentMutation({
        req,
        res,
        principal,
        audience: "admin",
        operation: `plugin.request.approve:${adminRequestParts[0]}`,
        body,
        execute: async () =>
          await approveEnterprisePluginRequest({
            config,
            reviewer: principal!.account,
            requestId: adminRequestParts[0]!,
            baseRevision: revisionField(body),
            install: async (installParams) =>
              await invokeEnterpriseGatewayHandler(
                pluginsHandlers["plugins.install"],
                "plugins.install",
                installParams,
                context,
              ),
          }),
      });
    }
    if (
      adminRequestParts.length === 2 &&
      adminRequestParts[1] === "reject" &&
      req.method === "POST"
    ) {
      action = "extension.plugin.request.reject";
      const body = await readJson(req);
      rejectUnknownFields(body, ["baseRevision", "reason"]);
      return await idempotentMutation({
        req,
        res,
        principal,
        audience: "admin",
        operation: `plugin.request.reject:${adminRequestParts[0]}`,
        body,
        execute: () => ({
          request: rejectEnterprisePluginRequest({
            reviewerAccountId: principal!.account.id,
            requestId: adminRequestParts[0]!,
            baseRevision: revisionField(body),
            reason: stringField(body, "reason", 2_000),
          }),
        }),
      });
    }
    const adminGrantParts = suffix(pathname, ADMIN_GRANTS_PREFIX);
    if (adminGrantParts.length === 2 && adminGrantParts[1] === "revoke" && req.method === "POST") {
      action = "extension.plugin.grant.revoke";
      const body = await readJson(req);
      rejectUnknownFields(body, ["baseRevision"]);
      return await idempotentMutation({
        req,
        res,
        principal,
        audience: "admin",
        operation: `plugin.grant.revoke:${adminGrantParts[0]}`,
        body,
        execute: () => ({
          grant: revokeEnterprisePluginGrant({
            grantId: adminGrantParts[0]!,
            baseRevision: revisionField(body),
          }),
        }),
      });
    }
    return sendError(req, res, 404, "EXTENSION_ROUTE_NOT_FOUND", "Extension route not found.");
  } catch (error) {
    if (principal && req.method !== "GET" && req.method !== "HEAD") {
      const code =
        error instanceof EnterpriseExtensionError || error instanceof EnterpriseKnowledgeError
          ? error.code
          : "ENTERPRISE_EXTENSION_INTERNAL_ERROR";
      audit({
        principal,
        req,
        action,
        targetType: "enterprise_extension",
        targetId: pathname.slice(-160),
        outcome: "failure",
        after: { code },
      });
    }
    if (error instanceof EnterpriseExtensionError || error instanceof EnterpriseKnowledgeError) {
      return sendError(req, res, error.status, error.code, error.message);
    }
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("EXTENSION_REVISION_CONFLICT")) {
      return sendError(req, res, 409, "EXTENSION_REVISION_CONFLICT", "Revision conflict.");
    }
    if (message.includes("UNIQUE constraint failed")) {
      return sendError(req, res, 409, "EXTENSION_ALREADY_EXISTS", "Extension already exists.");
    }
    return sendError(
      req,
      res,
      500,
      "ENTERPRISE_EXTENSION_INTERNAL_ERROR",
      "Extension request failed.",
    );
  }
}

async function reviewAgentAccess(
  config: OpenClawConfig,
  principal: EnterprisePrincipal,
  agentKey: AgentKey,
): Promise<void> {
  const { resolveEnterpriseUserRuntimeAgentId } = await import("../user/user-gateway-client.js");
  try {
    resolveEnterpriseUserRuntimeAgentId(config, principal.account, agentKey);
  } catch {
    throw new EnterpriseExtensionError("AGENT_NOT_FOUND", 404);
  }
}

export const enterpriseExtensionHttpTestHooks = {
  presentUserSkillInstall,
  presentUserPluginRequest,
  presentUserPluginGrant,
};
