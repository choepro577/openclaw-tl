import type { ProgressCard, ProgressCardStep } from "../../packages/gateway-protocol/src/index.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import {
  readSessionProgressCard,
  writeSessionProgressCard,
} from "../session-cards/progress-card-store.js";
import { withOpenClawAgentDatabaseReadOnly } from "../state/openclaw-agent-db-readonly.js";
import {
  openOpenClawAgentDatabase,
  runOpenClawAgentWriteTransaction,
} from "../state/openclaw-agent-db.js";
import { resolveGatewaySessionDatabase } from "./board-store.js";
import type { GatewayRequestContext } from "./server-methods/types.js";
import { sessionObserverScopeKey } from "./session-observer-model.js";
import { resolveRequestedSessionAgentId } from "./session-request-agent.js";
import { resolveSessionStoreKey } from "./session-store-key.js";

export type ProgressCardStore = {
  get(sessionKey: string): ProgressCard | null;
  put(
    sessionKey: string,
    input: { markdown?: string; steps?: ProgressCardStep[]; expectedRevision?: number },
  ): { card: ProgressCard | null };
};

export const progressCardStore: ProgressCardStore = {
  get(sessionKey) {
    const resolved = resolveGatewaySessionDatabase(sessionKey);
    const result = withOpenClawAgentDatabaseReadOnly(
      (database) => readSessionProgressCard(database.db, resolved.sessionKey),
      {
        agentId: resolved.agentId,
        ...(resolved.path ? { path: resolved.path } : {}),
      },
    );
    return result.found ? result.value : null;
  },
  put(sessionKey, input) {
    const resolved = resolveGatewaySessionDatabase(sessionKey);
    const database = openOpenClawAgentDatabase({
      agentId: resolved.agentId,
      ...(resolved.path ? { path: resolved.path } : {}),
    });
    const result = runOpenClawAgentWriteTransaction(
      (transactionDatabase) =>
        writeSessionProgressCard(transactionDatabase.db, resolved.sessionKey, input),
      { agentId: resolved.agentId, path: database.path },
      { operationLabel: "progress-card.put" },
    );
    return "card" in result ? result : { card: null };
  },
};

export function resolveProgressCardSessionKey(cfg: OpenClawConfig, sessionKey: string) {
  const requested = resolveRequestedSessionAgentId(cfg, sessionKey, undefined);
  if (!requested.ok) {
    return requested;
  }
  const canonicalKey = resolveSessionStoreKey({
    cfg,
    sessionKey,
    storeAgentId: requested.agentId,
  });
  return {
    ok: true as const,
    sessionKey: sessionObserverScopeKey(canonicalKey, requested.agentId),
  };
}

/** Shared native/RPC write owner; callers authorize the session before entering. */
export function putProgressCard(
  sessionKey: string,
  input: Parameters<ProgressCardStore["put"]>[1],
  broadcast: GatewayRequestContext["broadcast"],
  store: ProgressCardStore = progressCardStore,
) {
  const result = store.put(sessionKey, input);
  if (input.expectedRevision === undefined || result.card === null) {
    broadcast("progressCard.changed", {
      sessionKey,
      revision: result.card?.revision ?? null,
    });
  }
  return result;
}
