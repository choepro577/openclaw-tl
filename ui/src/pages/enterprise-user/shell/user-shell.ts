import type { PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { RouteId } from "../../../app-route-paths.ts";
import { selectShellRouteState, type ShellRouteState } from "../../../app/app-host-route-state.ts";
import type { ApplicationRuntime } from "../../../app/bootstrap.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import type { ThemeModeChangeDetail } from "../../../components/theme-mode-toggle.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";

export class EnterpriseUserShell extends OpenClawLightDomElement {
  @property({ attribute: false }) runtime: ApplicationRuntime | undefined;
  @state() navDrawerOpen = false;
  @state() routeState: ShellRouteState = {};

  private stopRouter?: () => void;
  private stopGateway?: () => void;
  private stopTheme?: () => void;
  private drawerTrigger: HTMLElement | null = null;

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
    this.routeState = selectShellRouteState(runtime.router.getState());
    this.stopRouter = runtime.router.subscribeSelector(selectShellRouteState, (routeState) => {
      this.routeState = routeState;
    });
    this.stopGateway = runtime.context.gateway.subscribe(() => this.requestUpdate());
    this.stopTheme = runtime.context.theme.subscribe(() => this.requestUpdate());
  }

  private unbindRuntime(): void {
    this.stopRouter?.();
    this.stopGateway?.();
    this.stopTheme?.();
    this.stopRouter = undefined;
    this.stopGateway = undefined;
    this.stopTheme = undefined;
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
