import { asNullableRecord } from "@openclaw/normalization-core/record-coerce";
import { verifyAgentRuntimeIdentityToken } from "../../gateway/agent-runtime-identity-token.js";
import { APPROVALS_SCOPE } from "../../gateway/method-scopes.js";
import { dispatchGatewayRequestInProcess } from "../../gateway/server-in-process-dispatch.js";
import type { GatewayContextResolver } from "../../gateway/server-methods/types.js";
import { createSyntheticPluginRuntimeClient } from "../../gateway/server-plugin-runtime-client.js";

/** Request or await approval through the admitted run's owning Gateway. Never resolve it. */
export async function dispatchAgentApprovalInProcess<T>(
  method: string,
  params: unknown,
  options: {
    resolveContext: GatewayContextResolver;
    identityToken?: string;
    timeoutMs?: number;
    expectFinal?: boolean;
    signal?: AbortSignal;
  },
): Promise<T> {
  if (!/^(exec|plugin)\.approval\.(request|waitDecision)$/.test(method)) {
    throw new Error("agent approval transport only supports requesting and waiting for approval");
  }
  const context = options.resolveContext();
  const identity = await verifyAgentRuntimeIdentityToken(options.identityToken);
  if (!context || !identity) {
    throw new Error("active agent runtime approval authority required");
  }
  const assertAuthority = () => {
    if (
      options.resolveContext() !== context ||
      context.validateAgentRuntimeApprovalAuthority?.(identity) !== true
    ) {
      throw new Error("active agent runtime approval authority required");
    }
  };
  assertAuthority();
  const connId = `agent-runtime:${identity.operationalRunInstance.instanceId}`;
  const waiting = method.endsWith(".waitDecision");
  if (waiting) {
    const id = asNullableRecord(params)?.id;
    const manager = method.startsWith("plugin.")
      ? context.pluginApprovalManager
      : context.execApprovalManager;
    if (typeof id !== "string" || manager?.getSnapshot(id)?.requestedByConnId !== connId) {
      throw new Error("approval does not belong to this agent runtime");
    }
  }
  const client = createSyntheticPluginRuntimeClient({ scopes: [APPROVALS_SCOPE] });
  client.connId = connId;
  client.internal = {
    ...client.internal,
    agentRuntimeIdentity: identity,
    approvalRuntime: !waiting,
  };
  const result = await dispatchGatewayRequestInProcess<T>(method, params, {
    context,
    client,
    methodRegistry: context.getGatewayMethodRegistry?.(),
    timeoutMs: options.timeoutMs,
    expectFinal: options.expectFinal,
    signal: options.signal,
  });
  assertAuthority();
  return result;
}
