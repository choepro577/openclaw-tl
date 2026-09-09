import { html, nothing } from "lit";
import { isSessionRouteId } from "../../../app-route-paths.ts";
import type { RouteId } from "../../../app-route-paths.ts";
import type { ShellRouteState } from "../../../app/app-host-route-state.ts";
import type { ApplicationRuntime } from "../../../app/bootstrap.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import { isMobileNavLayout } from "../../../app/mobile-nav-layout.ts";
import type { ThemeModeChangeDetail } from "../../../components/theme-mode-toggle.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { t } from "../../../i18n/index.ts";
import "../../../app/router-outlet.ts";
import "../../../components/modal-dialog.ts";
import "../../../lib/toast.ts";
import "./user-sidebar.ts";
import "./user-topbar.ts";

export type EnterpriseUserShellHost = {
  readonly context: ApplicationContext<RouteId> | undefined;
  readonly runtime: ApplicationRuntime | undefined;
  readonly routeState: ShellRouteState;
  readonly navDrawerOpen: boolean;
  closeNavDrawer(options?: { restoreFocus?: boolean }): void;
  handleThemeChange(event: CustomEvent<ThemeModeChangeDetail>): void;
  toggleNavigationSurface(trigger?: HTMLElement): void;
};

export function renderEnterpriseUserShell(host: EnterpriseUserShellHost) {
  const context = host.context;
  const runtime = host.runtime;
  if (!context || !runtime || host.routeState.routeId === undefined) {
    return html`<main class="connect-splash" role="status" aria-label=${t("common.loading")}>
      <openclaw-mascot mood="thinking" .size=${120}></openclaw-mascot>
    </main>`;
  }
  const activeRoute = host.routeState.routeId;
  const chatRoute = isSessionRouteId(activeRoute);
  const mobile = isMobileNavLayout();
  const drawerOpen = host.navDrawerOpen && mobile;
  const navigation = html`<openclaw-enterprise-user-sidebar
    .context=${context}
    .activeRoute=${activeRoute}
    .onNavigate=${() => host.closeNavDrawer({ restoreFocus: true })}
  ></openclaw-enterprise-user-sidebar>`;
  const disconnected =
    context.gateway.snapshot.phase !== "connected" &&
    activeRoute !== "chat" &&
    activeRoute !== "appearance";

  return html`
    <div
      class="shell eu-shell ${chatRoute ? "shell--chat" : ""} ${mobile
        ? "shell--mobile-nav"
        : ""} ${drawerOpen ? "shell--nav-drawer-open" : ""}"
      @theme-change=${(event: CustomEvent<ThemeModeChangeDetail>) => host.handleThemeChange(event)}
    >
      <a class="shell-skip-link" href="#enterprise-user-main"> ${t("common.skipToMainContent")} </a>
      <openclaw-enterprise-user-topbar
        .drawerOpen=${drawerOpen}
        .onToggleDrawer=${(trigger: HTMLElement) => host.toggleNavigationSurface(trigger)}
      ></openclaw-enterprise-user-topbar>
      <div class="shell-nav">
        ${mobile
          ? html`<openclaw-modal-dialog
              class="drawer nav-drawer"
              .open=${drawerOpen}
              .label=${eu("enterpriseNavigation")}
              @modal-cancel=${() => host.closeNavDrawer({ restoreFocus: true })}
            >
              <div class="shell-nav-modal__content" tabindex="-1" autofocus>${navigation}</div>
            </openclaw-modal-dialog>`
          : navigation}
      </div>
      <main
        id="enterprise-user-main"
        class="content ${chatRoute ? "content--chat" : ""}"
        .tabIndex=${-1}
      >
        ${disconnected
          ? html`<div class="connection-action-block" role="status" aria-live="polite">
              ${t("connection.actionsUnavailable")}
            </div>`
          : nothing}
        <openclaw-router-outlet
          ?inert=${disconnected}
          aria-disabled=${disconnected ? "true" : nothing}
          .router=${runtime.router}
          .retryContext=${context}
        ></openclaw-router-outlet>
      </main>
      <openclaw-toast-host></openclaw-toast-host>
    </div>
  `;
}
