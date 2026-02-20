import type { GatewayClient } from "../server-methods/types.js";
import { resolveSessionAgentId } from "../../agents/agent-scope.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { ErrorCodes, errorShape, type ErrorShape } from "../protocol/index.js";

function normalizeBoundAgentId(client: GatewayClient | null | undefined): string | null {
  if (!client || client.authKind !== "enterprise-token") {
    return null;
  }
  const raw = typeof client.boundAgentId === "string" ? client.boundAgentId.trim() : "";
  if (!raw) {
    return null;
  }
  return normalizeAgentId(raw);
}

function scopeError(message: string): ErrorShape {
  return errorShape(ErrorCodes.INVALID_REQUEST, message);
}

export function resolveEnterpriseBoundAgentId(
  client: GatewayClient | null | undefined,
): string | null {
  return normalizeBoundAgentId(client);
}

export function assertAgentIdInScope(params: {
  client: GatewayClient | null | undefined;
  agentId: string | undefined | null;
}): { ok: true } | { ok: false; error: ErrorShape } {
  const boundAgentId = normalizeBoundAgentId(params.client);
  if (!boundAgentId || !params.agentId) {
    return { ok: true };
  }
  const requested = normalizeAgentId(params.agentId);
  if (requested !== boundAgentId) {
    return {
      ok: false,
      error: scopeError(
        `agent scope violation: requested agent "${requested}" is not allowed for this connection`,
      ),
    };
  }
  return { ok: true };
}

export function assertSessionKeyInScope(params: {
  client: GatewayClient | null | undefined;
  sessionKey: string | undefined | null;
  cfg?: import("../../config/config.js").OpenClawConfig;
}): { ok: true } | { ok: false; error: ErrorShape } {
  const boundAgentId = normalizeBoundAgentId(params.client);
  const sessionKey = params.sessionKey?.trim();
  if (!boundAgentId || !sessionKey) {
    return { ok: true };
  }
  const sessionAgentId = normalizeAgentId(
    resolveSessionAgentId({
      sessionKey,
      config: params.cfg,
    }),
  );
  if (sessionAgentId !== boundAgentId) {
    return {
      ok: false,
      error: scopeError(
        `agent scope violation: session "${sessionKey}" belongs to agent "${sessionAgentId}"`,
      ),
    };
  }
  return { ok: true };
}
