import type { GatewayWsClient } from "./server/ws-types.js";
import { resolveSessionAgentId } from "../agents/agent-scope.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { MAX_BUFFERED_BYTES } from "./server-constants.js";
import { logWs, summarizeAgentEventForWsLog } from "./ws-log.js";

const ADMIN_SCOPE = "operator.admin";
const APPROVALS_SCOPE = "operator.approvals";
const PAIRING_SCOPE = "operator.pairing";

const EVENT_SCOPE_GUARDS: Record<string, string[]> = {
  "exec.approval.requested": [APPROVALS_SCOPE],
  "exec.approval.resolved": [APPROVALS_SCOPE],
  "device.pair.requested": [PAIRING_SCOPE],
  "device.pair.resolved": [PAIRING_SCOPE],
  "node.pair.requested": [PAIRING_SCOPE],
  "node.pair.resolved": [PAIRING_SCOPE],
};

function hasEventScope(client: GatewayWsClient, event: string): boolean {
  const required = EVENT_SCOPE_GUARDS[event];
  if (!required) {
    return true;
  }
  const role = client.connect.role ?? "operator";
  if (role !== "operator") {
    return false;
  }
  const scopes = Array.isArray(client.connect.scopes) ? client.connect.scopes : [];
  if (scopes.includes(ADMIN_SCOPE)) {
    return true;
  }
  return required.some((scope) => scopes.includes(scope));
}

function resolveScopedEventAgentId(event: string, payload: unknown): string | null {
  if (event !== "chat" && event !== "agent") {
    return null;
  }
  const sessionKey =
    payload &&
    typeof payload === "object" &&
    typeof (payload as { sessionKey?: unknown }).sessionKey === "string"
      ? (payload as { sessionKey: string }).sessionKey.trim()
      : "";
  if (!sessionKey) {
    return null;
  }
  return normalizeAgentId(resolveSessionAgentId({ sessionKey }));
}

function hasAgentScope(client: GatewayWsClient, eventAgentId: string | null): boolean {
  if (client.authKind !== "enterprise-token") {
    return true;
  }
  const boundAgentId =
    typeof client.boundAgentId === "string" ? normalizeAgentId(client.boundAgentId) : "";
  if (!boundAgentId || !eventAgentId) {
    return false;
  }
  return boundAgentId === eventAgentId;
}

export function createGatewayBroadcaster(params: { clients: Set<GatewayWsClient> }) {
  let seq = 0;

  const broadcastInternal = (
    event: string,
    payload: unknown,
    opts?: {
      dropIfSlow?: boolean;
      stateVersion?: { presence?: number; health?: number };
    },
    targetConnIds?: ReadonlySet<string>,
  ) => {
    const isTargeted = Boolean(targetConnIds);
    const eventSeq = isTargeted ? undefined : ++seq;
    const eventAgentId = resolveScopedEventAgentId(event, payload);
    const frame = JSON.stringify({
      type: "event",
      event,
      payload,
      seq: eventSeq,
      stateVersion: opts?.stateVersion,
    });
    const logMeta: Record<string, unknown> = {
      event,
      seq: eventSeq ?? "targeted",
      clients: params.clients.size,
      targets: targetConnIds ? targetConnIds.size : undefined,
      dropIfSlow: opts?.dropIfSlow,
      presenceVersion: opts?.stateVersion?.presence,
      healthVersion: opts?.stateVersion?.health,
    };
    if (event === "agent") {
      Object.assign(logMeta, summarizeAgentEventForWsLog(payload));
    }
    logWs("out", "event", logMeta);
    for (const c of params.clients) {
      if (targetConnIds && !targetConnIds.has(c.connId)) {
        continue;
      }
      if (!hasEventScope(c, event)) {
        continue;
      }
      if (!hasAgentScope(c, eventAgentId)) {
        continue;
      }
      const slow = c.socket.bufferedAmount > MAX_BUFFERED_BYTES;
      if (slow && opts?.dropIfSlow) {
        continue;
      }
      if (slow) {
        try {
          c.socket.close(1008, "slow consumer");
        } catch {
          /* ignore */
        }
        continue;
      }
      try {
        c.socket.send(frame);
      } catch {
        /* ignore */
      }
    }
  };

  const broadcast = (
    event: string,
    payload: unknown,
    opts?: {
      dropIfSlow?: boolean;
      stateVersion?: { presence?: number; health?: number };
    },
  ) => broadcastInternal(event, payload, opts);

  const broadcastToConnIds = (
    event: string,
    payload: unknown,
    connIds: ReadonlySet<string>,
    opts?: {
      dropIfSlow?: boolean;
      stateVersion?: { presence?: number; health?: number };
    },
  ) => {
    if (connIds.size === 0) {
      return;
    }
    broadcastInternal(event, payload, opts, connIds);
  };

  return { broadcast, broadcastToConnIds };
}
