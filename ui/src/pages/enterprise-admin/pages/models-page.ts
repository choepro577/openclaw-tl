import { ContextProvider } from "@lit/context";
import { html, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { GatewayRequestError, type GatewayBrowserClient } from "../../../api/gateway.ts";
import { createAgentSelectionCapability } from "../../../app/agent-selection.ts";
import { applicationContext, type ApplicationContext } from "../../../app/context.ts";
import type { ApplicationGateway } from "../../../app/gateway.ts";
import type { ApplicationOverlays } from "../../../app/overlays-types.ts";
import { createAgentCapability } from "../../../lib/agents/index.ts";
import { createRuntimeConfigCapability } from "../../../lib/config/runtime-config-capability.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import "../../../pages/model-providers/model-providers-page.ts";
import "../../../pages/model-setup/model-setup-page.ts";
import {
  EnterpriseApiError,
  loadAdminModelContext,
  requestAdminModelAction,
  type EnterpriseAdminModelContext,
  type EnterpriseAdminModelMethod,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage, navigateAdmin } from "../utils.ts";

type RequestOptions = { signal?: AbortSignal; timeoutMs?: number | null };

function requestSignal(options?: RequestOptions): AbortSignal | undefined {
  const timeoutSignal =
    typeof options?.timeoutMs === "number" ? AbortSignal.timeout(options.timeoutMs) : undefined;
  return options?.signal && timeoutSignal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : (options?.signal ?? timeoutSignal);
}

export const testApi = { requestSignal };

class EnterpriseAdminModelClient {
  async request<T = unknown>(
    method: string,
    params?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const signal = requestSignal(options);
    try {
      if (method === "agents.list") {
        const result = await loadAdminModelContext(signal);
        return result.agents as T;
      }
      return await requestAdminModelAction<T>(
        method as EnterpriseAdminModelMethod,
        params && typeof params === "object" && !Array.isArray(params)
          ? (params as Record<string, unknown>)
          : {},
        signal,
      );
    } catch (error) {
      if (error instanceof EnterpriseApiError) {
        throw new GatewayRequestError({
          code: error.code,
          message: error.message,
          ...(error.payload?.details !== undefined ? { details: error.payload.details } : {}),
          ...(typeof error.payload?.retryable === "boolean"
            ? { retryable: error.payload.retryable }
            : {}),
          ...(typeof error.payload?.retryAfterMs === "number"
            ? { retryAfterMs: error.payload.retryAfterMs }
            : {}),
        });
      }
      throw error;
    }
  }
}

function createGateway(
  client: EnterpriseAdminModelClient,
  modelContext: EnterpriseAdminModelContext,
): ApplicationGateway {
  const snapshot: ApplicationGateway["snapshot"] = {
    // SAFETY: the Enterprise REST adapter implements the browser client's request contract.
    client: client as GatewayBrowserClient,
    phase: "connected",
    offlineStable: false,
    hello: {
      type: "hello-ok",
      protocol: 1,
      auth: {
        role: "operator",
        scopes: ["operator.admin", "operator.read", "operator.write"],
      },
      features: { methods: modelContext.methods, events: [] },
    },
    canvasPluginSurfaceUrl: null,
    assistantAgentId: modelContext.agents.defaultId,
    sessionKey: modelContext.agents.mainKey,
    lastError: null,
    lastErrorCode: null,
  };
  return {
    snapshot,
    connection: {
      gatewayUrl: globalThis.location?.origin ?? "",
      token: "",
      bootstrapToken: "",
      password: "",
    },
    eventLog: [],
    connect: () => undefined,
    setSessionKey: () => undefined,
    start: () => undefined,
    stop: () => undefined,
    subscribe: () => () => undefined,
    subscribeEventLog: () => () => undefined,
    subscribeEvents: () => () => undefined,
  };
}

function createOverlays(): ApplicationOverlays {
  return {
    snapshot: {
      updateAvailable: null,
      updateSchedule: null,
      heldUpdateCampaignId: null,
      updateRunning: false,
      updateStatusRefreshing: false,
      updateCampaignStatusHydrated: true,
      updateReconciliationPending: false,
      updateStatusBanner: null,
      recordedUpdateAttempt: null,
      controlUiRefreshRequired: false,
      approvalQueue: [],
      approvalBusy: false,
      approvalCanGrant: false,
      approvalErrors: new Map(),
      devicePairSetupOpen: false,
      devicePairSetupLifecycle: { phase: "selection", access: "full" },
      devicePairPendingCount: 0,
    },
    subscribe: () => () => undefined,
    refreshUpdateStatus: async () => undefined,
    runUpdate: async () => undefined,
    holdUpdate: async () => false,
    decideApproval: async () => undefined,
    openDevicePairSetup: async () => false,
    refreshDevicePairSetup: async () => undefined,
    setDevicePairSetupAccess: async () => undefined,
    closeDevicePairSetup: () => undefined,
    dispose: () => undefined,
  };
}

export class EnterpriseAdminModelsPage extends OpenClawLightDomElement {
  @property({ type: Boolean }) setup = false;
  @state() private loading = true;
  @state() private loadError = "";
  private readonly provider = new ContextProvider(this, { context: applicationContext });
  private initializedSetup: boolean | undefined;
  private initializeGeneration = 0;
  private runtime?: {
    context: ApplicationContext;
    stop: () => void;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    void this.initialize();
  }

  override disconnectedCallback(): void {
    this.initializeGeneration += 1;
    this.runtime?.stop();
    this.runtime = undefined;
    super.disconnectedCallback();
  }

  override updated(changed: PropertyValues<this>): void {
    if (changed.has("setup") && this.initializedSetup !== this.setup) {
      void this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    const generation = ++this.initializeGeneration;
    this.initializedSetup = this.setup;
    this.loading = true;
    this.loadError = "";
    try {
      const modelContext = await loadAdminModelContext();
      if (generation !== this.initializeGeneration) {
        return;
      }
      const client = new EnterpriseAdminModelClient();
      const gateway = createGateway(client, modelContext);
      const runtimeConfig = createRuntimeConfigCapability(gateway);
      const agents = createAgentCapability(gateway);
      const agentSelection = createAgentSelectionCapability(gateway, agents);
      const basePath = globalThis.location?.pathname.split("/admin", 1)[0] ?? "";
      const context = {
        basePath: `${basePath}/app`,
        resourceBasePath: basePath,
        gateway,
        runtimeConfig,
        agents,
        agentSelection,
        overlays: createOverlays(),
        navigate: (routeId: string) => {
          navigateAdmin(routeId === "model-setup" ? "/config/models/setup" : "/config/models");
        },
        navigateAndWait: async (routeId: string) => {
          navigateAdmin(routeId === "model-setup" ? "/config/models/setup" : "/config/models");
        },
        replace: (routeId: string) => {
          navigateAdmin(
            routeId === "model-setup" ? "/config/models/setup" : "/config/models",
            true,
          );
        },
        revalidate: async () => undefined,
        preload: async () => undefined,
      } as ApplicationContext;
      this.runtime?.stop();
      this.runtime = {
        context,
        stop: () => {
          runtimeConfig.dispose();
          agents.dispose();
          context.overlays.dispose();
        },
      };
      this.provider.setValue(context);
      // The canonical pages own their request state. Mount them as soon as the
      // authenticated REST transport exists so setup detection can run in
      // parallel with the shared-agent and runtime-config warmup.
      void agents.ensureList();
      void runtimeConfig.ensureLoaded();
    } catch (error) {
      if (generation === this.initializeGeneration) {
        this.loadError = errorMessage(error);
      }
    } finally {
      if (generation === this.initializeGeneration) {
        this.loading = false;
      }
    }
  }

  override render() {
    return html`
      <section class="ea-page ea-models-page">
        ${this.setup
          ? html`<button
              class="ea-button ea-models-back"
              type="button"
              @click=${() => navigateAdmin("/config/models")}
            >
              ← Quay lại Models
            </button>`
          : nothing}
        ${this.loading
          ? html`<div class="ea-loading" role="status">Đang tải cấu hình Models…</div>`
          : this.loadError
            ? html`<div class="ea-card ea-load-error">
                <p class="ea-error" role="alert">${this.loadError}</p>
                <button class="ea-button" type="button" @click=${() => void this.initialize()}>
                  Thử lại
                </button>
              </div>`
            : this.setup
              ? html`<openclaw-model-setup-page></openclaw-model-setup-page>`
              : html`<openclaw-model-providers-page></openclaw-model-providers-page>`}
      </section>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-admin-models-page")) {
  customElements.define("openclaw-enterprise-admin-models-page", EnterpriseAdminModelsPage);
}
