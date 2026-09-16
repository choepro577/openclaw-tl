import { definePage } from "@openclaw/uirouter";
import { html } from "lit";
import { routePageSpec } from "../../app-route-paths.ts";
import type { ApplicationContext } from "../../app/context.ts";
import { normalizeAgentId } from "../../lib/sessions/session-key.ts";
import type { ModelProvidersData } from "./load.ts";

export type ModelProvidersRouteData = {
  /** Gateway source that owned the route preload. */
  gateway: ApplicationContext["gateway"];
  /** Exact Gateway snapshot captured before the preload began. */
  gatewaySnapshot: ApplicationContext["gateway"]["snapshot"];
  data: ModelProvidersData;
  /** Client the loader fetched from; null when it ran disconnected. */
  client: ApplicationContext["gateway"]["snapshot"]["client"];
  /** Concrete agent whose credential store populated the auth snapshot. */
  agentId: string | null;
};

async function loadModelProvidersRouteData(
  context: ApplicationContext,
): Promise<ModelProvidersRouteData> {
  const gateway = context.gateway;
  const gatewaySnapshot = gateway.snapshot;
  const { EMPTY_MODEL_PROVIDERS_DATA, loadModelProvidersData } = await import("./load.ts");
  const client = gatewaySnapshot.phase === "connected" ? gatewaySnapshot.client : null;
  const agents =
    context.agents.state.agentsList ?? (client ? await context.agents.ensureList() : null);
  const agentId = agents
    ? normalizeAgentId(agents.defaultId ?? agents.agents[0]?.id ?? "main")
    : null;
  if (!client || !agentId) {
    return { gateway, gatewaySnapshot, data: EMPTY_MODEL_PROVIDERS_DATA, client: null, agentId };
  }
  return {
    gateway,
    gatewaySnapshot,
    data: await loadModelProvidersData(client, { agentId }),
    client,
    agentId,
  };
}

export const page = definePage({
  ...routePageSpec("model-providers"),
  loader: loadModelProvidersRouteData,
  component: () =>
    import("./model-providers-page.ts").then(() => ({
      header: true,
      render: (data: ModelProvidersRouteData | undefined) =>
        html`<openclaw-model-providers-page .routeData=${data}></openclaw-model-providers-page>`,
    })),
});
