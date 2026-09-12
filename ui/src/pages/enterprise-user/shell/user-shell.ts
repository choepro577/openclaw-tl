import type { PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { RouteId } from "../../../app-route-paths.ts";
import { selectApplicationSession } from "../../../app/agent-selection.ts";
import { selectShellRouteState, type ShellRouteState } from "../../../app/app-host-route-state.ts";
import type { ApplicationRuntime } from "../../../app/bootstrap.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import type { ThemeModeChangeDetail } from "../../../components/theme-mode-toggle.ts";
import { parseAgentSessionKey } from "../../../lib/sessions/session-key.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { userAgentCatalogStore } from "../state/user-agent-catalog-store.ts";

export function syncEnterpriseUserSessionOwner(
  context: ApplicationContext<RouteId>,
  routeState: ShellRouteState,
  isCurrent?: () => boolean,
): Promise<void> | undefined {
  if (routeState.committedRouteId !== "chat") {
    return undefined;
  }
  const sessionKey = routeState.committedSessionKey?.trim();
  const agentId = parseAgentSessionKey(sessionKey)?.agentId;
  if (!sessionKey || !agentId) {
    return undefined;
  }

  // Commit application ownership and the Gateway session before the async
  // catalog bootstrap can publish its default Personal Agent.
  selectApplicationSession({
    selection: context.agentSelection,
    gateway: context.gateway,
    sessionKey,
    agentId,
  });
  return userAgentCatalogStore.bindSessionOwner(agentId, sessionKey, { isCurrent });
}

export class EnterpriseUserShell extends OpenClawLightDomElement {
  @property({ attribute: false }) runtime: ApplicationRuntime | undefined;
  @state() navDrawerOpen = false;
  @state() routeState: ShellRouteState = {};

  private stopRouter?: () => void;
  private stopGateway?: () => void;
  private stopTheme?: () => void;
  private drawerTrigger: HTMLElement | null = null;
  private routeOwnerEpoch = 0;

  get context(): ApplicationContext<RouteId> | undefined {
    return this.runtime?.context;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("runtime")) {
      this.bindRuntime();
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    globalThis.addEventListener("resize", this.handleViewportChange);
    this.bindRuntime();
  }

  override disconnectedCallback(): void {
    globalThis.removeEventListener("resize", this.handleViewportChange);
    this.unbindRuntime();
    super.disconnectedCallback();
  }

  private bindRuntime(): void {
    this.unbindRuntime();
    const runtime = this.runtime;
    if (!runtime) {
      this.routeState = {};
      return;
    }
    const initialRouteState = selectShellRouteState(runtime.router.getState());
    this.routeState = initialRouteState;
    this.bindRouteOwner(runtime, initialRouteState);
    this.stopRouter = runtime.router.subscribeSelector(selectShellRouteState, (routeState) => {
      this.routeState = routeState;
      this.bindRouteOwner(runtime, routeState);
    });
    this.stopGateway = runtime.context.gateway.subscribe(() => this.requestUpdate());
    this.stopTheme = runtime.context.theme.subscribe(() => this.requestUpdate());
  }

  private unbindRuntime(): void {
    ++this.routeOwnerEpoch;
    this.stopRouter?.();
    this.stopGateway?.();
    this.stopTheme?.();
    this.stopRouter = undefined;
    this.stopGateway = undefined;
    this.stopTheme = undefined;
  }

  private bindRouteOwner(runtime: ApplicationRuntime, routeState: ShellRouteState): void {
    const epoch = ++this.routeOwnerEpoch;
    const binding = syncEnterpriseUserSessionOwner(
      runtime.context,
      routeState,
      () =>
        this.isConnected &&
        this.runtime === runtime &&
        this.routeOwnerEpoch === epoch &&
        this.routeState === routeState,
    );
    if (!binding) {
      return;
    }
    void binding.catch((error: unknown) => {
      if (this.isConnected && this.runtime === runtime && this.routeOwnerEpoch === epoch) {
        console.error("[openclaw] Enterprise session owner binding failed", error);
      }
    });
  }

  private readonly handleViewportChange = () => {
    this.requestUpdate();
  };

  readonly handleThemeChange = (event: CustomEvent<ThemeModeChangeDetail>): void => {
    this.context?.theme.setMode(event.detail.mode, event.detail.element);
  };

  toggleNavigationSurface(trigger?: HTMLElement): void {
    if (this.navDrawerOpen) {
      this.closeNavDrawer({ restoreFocus: true });
      return;
    }
    this.drawerTrigger = trigger ?? null;
    this.navDrawerOpen = true;
  }

  closeNavDrawer(options: { restoreFocus?: boolean } = {}): void {
    if (!this.navDrawerOpen) {
      return;
    }
    this.navDrawerOpen = false;
    const trigger = this.drawerTrigger;
    this.drawerTrigger = null;
    if (options.restoreFocus && trigger) {
      globalThis.requestAnimationFrame(() => trigger.focus());
    }
  }
}
