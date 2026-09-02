import type { ErrorShape } from "../../../packages/gateway-protocol/src/schema/frames.js";
import type {
  GatewayClient,
  GatewayRequestContext,
  GatewayRequestHandler,
  GatewayRequestHandlerOptions,
} from "../../gateway/server-methods/types.js";

export class EnterpriseGatewayMethodError extends Error {
  constructor(readonly gatewayError: ErrorShape) {
    super(gatewayError.message);
  }
}

/** Invoke one existing Gateway method after the Enterprise HTTP boundary has authorized it. */
export async function invokeEnterpriseGatewayHandler(
  handler: GatewayRequestHandler | undefined,
  method: string,
  params: Record<string, unknown>,
  context: GatewayRequestContext,
  client: GatewayClient | null = null,
): Promise<unknown> {
  if (!handler) {
    throw new Error("GATEWAY_METHOD_UNAVAILABLE");
  }
  const req: GatewayRequestHandlerOptions["req"] = {
    type: "req",
    id: `enterprise-admin:${method}`,
    method,
    params,
  };
  let result: { ok: boolean; payload?: unknown; error?: ErrorShape } | undefined;
  await handler({
    req,
    params,
    client,
    isWebchatConnect: () => false,
    context,
    respond: (ok, payload, error) => {
      result = { ok, payload, error };
    },
  });
  if (!result?.ok) {
    if (result?.error) {
      throw new EnterpriseGatewayMethodError(result.error);
    }
    throw new Error("GATEWAY_METHOD_FAILED");
  }
  return result.payload;
}
