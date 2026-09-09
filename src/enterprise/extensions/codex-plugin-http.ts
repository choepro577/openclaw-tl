import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { getEnterpriseAccountById } from "../accounts/account-store.js";
import type { EnterprisePrincipal } from "../auth/auth-service.js";
import { readJson, sendError, sendJson } from "../knowledge/enterprise-knowledge-http-common.js";
import { resolveEnterpriseUserRuntimeAgentId } from "../user/user-gateway-client.js";
import {
  approveEnterpriseCodexPluginRequest,
  cancelEnterpriseCodexPluginRequest,
  connectEnterpriseCodexGrant,
  EnterpriseCodexPluginError,
  listEnterpriseCodexPlugins,
  presentEnterpriseCodexPluginDetail,
  presentEnterpriseCodexPluginGrant,
  presentEnterpriseCodexPluginRequest,
  refreshEnterpriseCodexGrant,
  rejectEnterpriseCodexPluginRequest,
  requestEnterpriseCodexPlugin,
  reviewEnterpriseCodexPlugin,
  transitionEnterpriseCodexGrantState,
} from "./codex-plugin-service.js";
import {
  getEnterpriseCodexPluginGrant,
  getEnterpriseCodexPluginRequest,
  listEnterpriseAccountCodexPluginGrants,
  listEnterpriseCodexPluginRequests,
} from "./codex-plugin-store.js";
import {
  idempotentMutation,
  rejectUnknownFields,
  revisionField,
  stringField,
  validAgentKey,
} from "./extension-http-common.js";

const USER_PREFIX = "/api/enterprise/user/v2/extensions/codex";
const ADMIN_PREFIX = "/api/enterprise/admin/codex-plugin-requests";

export function isEnterpriseCodexPluginPath(pathname: string): boolean {
  return [USER_PREFIX, ADMIN_PREFIX].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Called only after the shared extension handler verifies audience, session and CSRF. */
export async function handleEnterpriseCodexPluginRoute(params: {
  req: IncomingMessage;
  res: ServerResponse;
  config: OpenClawConfig;
  pathname: string;
  principal: EnterprisePrincipal;
  query: URLSearchParams;
}): Promise<true> {
  const { req, res, config, pathname, principal, query } = params;
  const account = principal.account;
  const admin = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
  const prefix = admin ? ADMIN_PREFIX : USER_PREFIX;
  const parts = pathname.slice(prefix.length).split("/").filter(Boolean).map(decodeURIComponent);
  if (!admin && req.method === "GET") {
    const agentKey = validAgentKey(query.get("agentKey"));
    const context = { config, account, agentKey };
    if (parts.length === 0) {
      const result = await listEnterpriseCodexPlugins({
        ...context,
        query: query.get("query") ?? "",
      });
      return sendJson(res, 200, {
        ...result,
        status: result.warnings?.includes("CODEX_RUNTIME_UNAVAILABLE")
          ? "unavailable"
          : "available",
        installed: result.installed.map(presentEnterpriseCodexPluginGrant),
        requests: result.requests.map((request) => presentEnterpriseCodexPluginRequest(request)),
      });
    }
    if (parts.length === 1 && parts[0] === "detail") {
      return sendJson(
        res,
        200,
        presentEnterpriseCodexPluginDetail(
          await reviewEnterpriseCodexPlugin({
            ...context,
            pluginId: query.get("pluginId") ?? "",
            requireRuntime: true,
          }),
        ),
      );
    }
    if (parts.length === 1 && parts[0] === "requests") {
      let runtimeAgentId: string;
      try {
        runtimeAgentId = resolveEnterpriseUserRuntimeAgentId(config, account, agentKey);
      } catch {
        throw new EnterpriseCodexPluginError("AGENT_NOT_FOUND", 404);
      }
      return sendJson(res, 200, {
        items: listEnterpriseCodexPluginRequests({ accountId: account.id, runtimeAgentId }).map(
          (request) => presentEnterpriseCodexPluginRequest(request),
        ),
      });
    }
  }
  if (admin && req.method === "GET") {
    if (parts.length === 0) {
      return sendJson(res, 200, {
        items: listEnterpriseCodexPluginRequests().map((request) =>
          presentEnterpriseCodexPluginRequest(request, true),
        ),
      });
    }
    if (parts.length === 1) {
      const request = getEnterpriseCodexPluginRequest(parts[0]!);
      if (!request) throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REQUEST_NOT_FOUND", 404);
      const requester = getEnterpriseAccountById(request.requesterAccountId);
      const grant = listEnterpriseAccountCodexPluginGrants(request.requesterAccountId).find(
        (candidate) => candidate.sourceRequestId === request.id,
      );
      let detail: Record<string, unknown> = { unavailable: true };
      if (requester?.enabled) {
        try {
          detail = presentEnterpriseCodexPluginDetail(
            await reviewEnterpriseCodexPlugin({
              config,
              account: requester,
              agentKey: request.agentKey,
              pluginId: `${request.pluginName}@${request.marketplaceName}`,
              requireRuntime: true,
            }),
          );
        } catch {
          // Keep persisted decisions reviewable when the provider is offline.
          // Approval independently revalidates the live reviewed capabilities.
          detail = { unavailable: true };
        }
      }
      return sendJson(res, 200, {
        request: presentEnterpriseCodexPluginRequest(request, true),
        account: requester
          ? { id: requester.id, username: requester.username, displayName: requester.displayName }
          : null,
        detail,
        grant: grant ? presentEnterpriseCodexPluginGrant(grant) : null,
      });
    }
  }
  if (req.method !== "POST") {
    return sendError(req, res, 404, "EXTENSION_ROUTE_NOT_FOUND", "Extension route not found.");
  }
  const body = await readJson(req);
  if (!admin && parts.length === 1 && parts[0] === "requests") {
    rejectUnknownFields(body, ["agentKey", "pluginId"]);
    const agentKey = validAgentKey(stringField(body, "agentKey"));
    const pluginId = stringField(body, "pluginId", 256);
    return await idempotentMutation({
      req,
      res,
      principal,
      audience: "user",
      operation: "codex.request",
      body,
      status: 201,
      execute: async () => ({
        request: presentEnterpriseCodexPluginRequest(
          await requestEnterpriseCodexPlugin({ config, account, agentKey, pluginId }),
        ),
      }),
    });
  }
  if (!admin && parts.length === 3 && parts[0] === "requests" && parts[2] === "cancel") {
    rejectUnknownFields(body, ["baseRevision"]);
    const baseRevision = revisionField(body);
    const request = getEnterpriseCodexPluginRequest(parts[1]!);
    if (!request || request.requesterAccountId !== account.id) {
      throw new EnterpriseCodexPluginError("CODEX_PLUGIN_REQUEST_NOT_FOUND", 404);
    }
    return await idempotentMutation({
      req,
      res,
      principal,
      audience: "user",
      operation: `codex.cancel:${request.id}`,
      body,
      execute: () => ({
        request: presentEnterpriseCodexPluginRequest(
          cancelEnterpriseCodexPluginRequest({
            config,
            account,
            agentKey: request.agentKey,
            requestId: request.id,
            baseRevision,
          }),
        ),
      }),
    });
  }
  if (!admin && parts.length === 3 && parts[0] === "grants" && parts[2] === "connect") {
    rejectUnknownFields(body, ["baseRevision", "serverName"]);
    const baseRevision = revisionField(body);
    const serverName = stringField(body, "serverName", 256);
    const grant = getEnterpriseCodexPluginGrant(parts[1]!);
    if (!grant || grant.accountId !== account.id) {
      throw new EnterpriseCodexPluginError("CODEX_PLUGIN_GRANT_NOT_FOUND", 404);
    }
    const context = { config, account, agentKey: grant.agentKey };
    return await idempotentMutation({
      req,
      res,
      principal,
      audience: "user",
      operation: `codex.connect:${grant.id}`,
      body,
      execute: async () =>
        await connectEnterpriseCodexGrant({
          ...context,
          grantId: grant.id,
          baseRevision,
          serverName,
        }),
    });
  }
  if (
    !admin &&
    parts.length === 3 &&
    parts[0] === "grants" &&
    ["enable", "disable", "remove", "refresh"].includes(parts[2]!)
  ) {
    rejectUnknownFields(body, ["baseRevision"]);
    const baseRevision = revisionField(body);
    const grant = getEnterpriseCodexPluginGrant(parts[1]!);
    if (!grant || grant.accountId !== account.id) {
      throw new EnterpriseCodexPluginError("CODEX_PLUGIN_GRANT_NOT_FOUND", 404);
    }
    const action = parts[2]!;
    const context = { config, account, agentKey: grant.agentKey };
    return await idempotentMutation({
      req,
      res,
      principal,
      audience: "user",
      operation: `codex.${action}:${grant.id}`,
      body,
      execute: async () => ({
        grant: presentEnterpriseCodexPluginGrant(
          action === "refresh"
            ? await refreshEnterpriseCodexGrant({ ...context, grantId: grant.id, baseRevision })
            : transitionEnterpriseCodexGrantState({
                context,
                grantId: grant.id,
                baseRevision,
                state:
                  action === "enable" ? "active" : action === "disable" ? "disabled" : "revoked",
              }),
        ),
      }),
    });
  }
  if (admin && parts.length === 2 && ["approve", "reject"].includes(parts[1]!)) {
    const approve = parts[1] === "approve";
    rejectUnknownFields(body, approve ? ["baseRevision"] : ["baseRevision", "reason"]);
    const baseRevision = revisionField(body);
    const reason = approve ? "" : stringField(body, "reason", 2_000);
    const requestId = parts[0]!;
    return await idempotentMutation({
      req,
      res,
      principal,
      audience: "admin",
      operation: `codex.${parts[1]}:${requestId}`,
      body,
      execute: async () => {
        if (!approve) {
          return {
            request: presentEnterpriseCodexPluginRequest(
              rejectEnterpriseCodexPluginRequest({
                config,
                reviewer: account,
                requestId,
                baseRevision,
                reason,
              }),
              true,
            ),
          };
        }
        const result = await approveEnterpriseCodexPluginRequest({
          config,
          reviewer: account,
          requestId,
          baseRevision,
        });
        return {
          ...result,
          request: presentEnterpriseCodexPluginRequest(result.request, true),
          grant: presentEnterpriseCodexPluginGrant(result.grant),
        };
      },
    });
  }
  return sendError(req, res, 404, "EXTENSION_ROUTE_NOT_FOUND", "Extension route not found.");
}
