import {
  ErrorCodes,
  errorShape,
  validateProgressCardGetParams,
  validateProgressCardPutParams,
} from "../../../packages/gateway-protocol/src/index.js";
import {
  normalizeProgressCardInput,
  PROGRESS_CARD_MAX_STEP_UTF8_BYTES,
  PROGRESS_CARD_MAX_STEPS,
  PROGRESS_CARD_MAX_UTF8_BYTES,
  ProgressCardInputError,
} from "../../session-cards/progress-card-input.js";
import {
  progressCardStore,
  type ProgressCardStore,
  putProgressCard,
  resolveProgressCardSessionKey,
} from "../progress-card-store.js";
import type { GatewayRequestHandlers } from "./types.js";
import { assertValidParams } from "./validation.js";

export { PROGRESS_CARD_MAX_STEP_UTF8_BYTES, PROGRESS_CARD_MAX_STEPS, PROGRESS_CARD_MAX_UTF8_BYTES };

function requireProgressCardSessionKey(
  sessionKey: string,
  context: Parameters<GatewayRequestHandlers[string]>[0]["context"],
  respond: Parameters<GatewayRequestHandlers[string]>[0]["respond"],
): string | undefined {
  const requested = resolveProgressCardSessionKey(context.getRuntimeConfig(), sessionKey);
  if (!requested.ok) {
    respond(false, undefined, requested.error);
    return undefined;
  }
  return requested.sessionKey;
}

export function createProgressCardHandlers(
  store: ProgressCardStore = progressCardStore,
): GatewayRequestHandlers {
  return {
    "progressCard.get": ({ params, respond, context }) => {
      if (!assertValidParams(params, validateProgressCardGetParams, "progressCard.get", respond)) {
        return;
      }
      const sessionKey = requireProgressCardSessionKey(params.sessionKey, context, respond);
      if (!sessionKey) {
        return;
      }
      try {
        respond(true, { card: store.get(sessionKey) }, undefined);
      } catch (error) {
        respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(error)));
      }
    },
    "progressCard.put": ({ params, respond, context }) => {
      if (!assertValidParams(params, validateProgressCardPutParams, "progressCard.put", respond)) {
        return;
      }
      let input;
      try {
        input = normalizeProgressCardInput({ markdown: params.markdown, plan: params.plan });
      } catch (error) {
        if (!(error instanceof ProgressCardInputError)) {
          throw error;
        }
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, error.message));
        return;
      }
      if (params.expectedRevision !== undefined && (input.markdown || input.steps?.length)) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            "expectedRevision is only valid when clearing a card",
          ),
        );
        return;
      }
      const sessionKey = requireProgressCardSessionKey(params.sessionKey, context, respond);
      if (!sessionKey) {
        return;
      }
      try {
        const result = putProgressCard(
          sessionKey,
          { ...input, expectedRevision: params.expectedRevision },
          context.broadcast,
          store,
        );
        respond(true, result, undefined);
      } catch (error) {
        respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(error)));
      }
    },
  };
}

export const progressCardHandlers = createProgressCardHandlers();
