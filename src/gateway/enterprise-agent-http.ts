import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { authorizeGatewayConnect, type ResolvedGatewayAuth } from "./auth.js";
import { ensureAgentProvisioned } from "./enterprise-agent-service.js";
import { issueEnterpriseSocketToken } from "./enterprise-socket-auth.js";
import {
  ensureEnterpriseWorkspaceScaffold,
  type EnterpriseWorkspaceScaffoldResult,
} from "./enterprise-workspace-scaffold.js";
import {
  readJsonBodyOrError,
  sendInvalidRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
} from "./http-common.js";
import { getBearerToken, getHeader, resolveAgentIdFromHeader } from "./http-utils.js";

const ENTERPRISE_ENSURE_PATHS = new Set([
  "/v1/enterprise/agents/ensure",
  "/api/openclaw/bootstrap",
]);
const DEFAULT_BODY_BYTES = 256 * 1024;
const logEnterprise = createSubsystemLogger("gateway/enterprise");

type EnsureAgentBody = {
  employeeCode?: unknown;
  agentId?: unknown;
  displayName?: unknown;
  name?: unknown;
  forceRefreshSocketToken?: unknown;
};

function resolveEmployeeCode(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  return raw.trim();
}

function resolveDisplayName(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) {
    return undefined;
  }
  return raw.trim();
}

function resolveBootstrapEmployeeCode(req: IncomingMessage, body: EnsureAgentBody): string | null {
  const fromBody = resolveEmployeeCode(body.employeeCode) ?? resolveEmployeeCode(body.agentId);
  if (fromBody) {
    return fromBody;
  }

  const fromEmployeeHeader =
    resolveEmployeeCode(getHeader(req, "x-openclaw-employee-code")) ??
    resolveEmployeeCode(getHeader(req, "employee-code"));
  if (fromEmployeeHeader) {
    return fromEmployeeHeader;
  }

  return resolveAgentIdFromHeader(req) ?? null;
}

function resolveBootstrapDisplayName(
  req: IncomingMessage,
  body: EnsureAgentBody,
): string | undefined {
  return (
    resolveDisplayName(body.displayName) ??
    resolveDisplayName(body.name) ??
    resolveDisplayName(getHeader(req, "x-openclaw-display-name")) ??
    resolveDisplayName(getHeader(req, "display-name"))
  );
}

function sanitizeLogValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function handleEnterpriseAgentHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: { auth: ResolvedGatewayAuth; trustedProxies?: string[] },
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (!ENTERPRISE_ENSURE_PATHS.has(url.pathname)) {
    return false;
  }

  if (req.method !== "POST") {
    sendMethodNotAllowed(res, "POST");
    return true;
  }

  const cfg = loadConfig();
  const token = getBearerToken(req);
  const authResult = await authorizeGatewayConnect({
    auth: opts.auth,
    connectAuth: token ? { token, password: token } : null,
    req,
    trustedProxies: opts.trustedProxies ?? cfg.gateway?.trustedProxies,
  });
  if (!authResult.ok) {
    sendUnauthorized(res);
    return true;
  }

  const bodyUnknown = await readJsonBodyOrError(req, res, DEFAULT_BODY_BYTES);
  if (bodyUnknown === undefined) {
    return true;
  }
  const body = (bodyUnknown ?? {}) as EnsureAgentBody;
  const employeeCode = resolveBootstrapEmployeeCode(req, body);
  if (!employeeCode) {
    sendInvalidRequest(
      res,
      "employeeCode is required (or provide x-openclaw-agent-id / x-openclaw-employee-code)",
    );
    return true;
  }
  const forceRefreshSocketToken = body.forceRefreshSocketToken === true;
  const displayName = resolveBootstrapDisplayName(req, body) ?? employeeCode;
  const traceId = randomUUID();

  try {
    const ensured = await ensureAgentProvisioned({
      cfg,
      agentId: normalizeAgentId(employeeCode),
      name: displayName,
      failIfExists: false,
      ensureBootstrapFiles: false,
    });
    const workspaceScaffold: EnterpriseWorkspaceScaffoldResult =
      await ensureEnterpriseWorkspaceScaffold({
        workspaceDir: ensured.workspace,
        agentId: ensured.agentId,
        staffCode: employeeCode,
        displayName,
        createdAt: new Date(),
      });
    logEnterprise.info("enterprise ensure succeeded", {
      traceId,
      agentId: ensured.agentId,
      status: ensured.status,
      createdFilesCount: workspaceScaffold.createdFiles.length,
      existingFilesCount: workspaceScaffold.existingFiles.length,
    });
    const tokenIssued = issueEnterpriseSocketToken({
      agentId: ensured.agentId,
      forceRefresh: forceRefreshSocketToken,
    });

    sendJson(res, 200, {
      ok: true,
      status: ensured.status,
      agentId: ensured.agentId,
      workspace: ensured.workspace,
      socketToken: tokenIssued.token,
      expiresAtMs: tokenIssued.expiresAtMs,
      workspaceScaffold,
    });
  } catch (err) {
    logEnterprise.error("enterprise ensure failed", {
      traceId,
      employeeCode: sanitizeLogValue(employeeCode),
      error: err instanceof Error ? err.message : String(err),
    });
    sendJson(res, 500, {
      ok: false,
      error: {
        message: err instanceof Error ? err.message : String(err),
        type: "server_error",
      },
    });
  }
  return true;
}
