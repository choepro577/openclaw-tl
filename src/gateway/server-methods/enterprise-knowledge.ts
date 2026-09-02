import { ErrorCodes, errorShape } from "../../../packages/gateway-protocol/src/index.js";
import {
  subscribeEnterpriseKnowledgeChanges,
  unsubscribeEnterpriseKnowledgeChanges,
} from "../enterprise-knowledge-subscriptions.js";
import type { GatewayRequestHandlers } from "./types.js";

function parseSubscribeParams(
  params: Record<string, unknown>,
): { zoneIds: string[]; overview: boolean; lastSequence: number } | undefined {
  const zoneIds = params.zoneIds ?? [];
  const lastSequence = params.lastSequence ?? 0;
  if (
    !Array.isArray(zoneIds) ||
    zoneIds.length > 100 ||
    !zoneIds.every(
      (value) => typeof value === "string" && value.length >= 8 && value.length <= 80,
    ) ||
    !Number.isSafeInteger(lastSequence) ||
    Number(lastSequence) < 0 ||
    (params.overview !== undefined && typeof params.overview !== "boolean")
  ) {
    return undefined;
  }
  return {
    zoneIds: [...new Set(zoneIds)],
    overview: params.overview === true,
    lastSequence: Number(lastSequence),
  };
}

export const enterpriseKnowledgeHandlers: GatewayRequestHandlers = {
  "enterprise.knowledge.subscribe": ({ params, client, context, respond }) => {
    const parsed = parseSubscribeParams(params);
    const connId = client?.connId;
    const enterprise = client?.internal?.enterpriseSession;
    if (!parsed) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "invalid subscription"));
      return;
    }
    if (!connId || !enterprise || !context.isConnectionActive) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, "knowledge subscriptions unavailable"),
      );
      return;
    }
    if (parsed.overview && enterprise.accountRole !== "administrator") {
      respond(false, undefined, errorShape(ErrorCodes.FORBIDDEN, "overview subscription denied"));
      return;
    }
    subscribeEnterpriseKnowledgeChanges({
      connId,
      sessionId: enterprise.sessionId,
      accountId: enterprise.accountId,
      accountRole: enterprise.accountRole,
      zoneIds: parsed.zoneIds,
      overview: parsed.overview,
      lastSequence: parsed.lastSequence,
      broadcastToConnIds: context.broadcastToConnIds,
      isConnectionActive: context.isConnectionActive,
    });
    respond(true, { subscribed: true, lastSequence: parsed.lastSequence }, undefined);
  },
  "enterprise.knowledge.unsubscribe": ({ client, respond }) => {
    if (client?.connId) {
      unsubscribeEnterpriseKnowledgeChanges(client.connId);
    }
    respond(true, { subscribed: false }, undefined);
  },
};
