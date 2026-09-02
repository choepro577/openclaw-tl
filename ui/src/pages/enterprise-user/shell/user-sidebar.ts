import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import type { RouteId } from "../../../app-route-paths.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import { icons } from "../../../components/icons.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomContentsElement } from "../../../lit/openclaw-element.ts";
import { logoutEnterprisePortal } from "../../enterprise/services/enterprise-api.ts";
import { userBootstrapStore } from "../state/user-bootstrap-store.ts";
import "../components/user-agent-switcher.ts";
import "../components/user-conversation-organizer.ts";

export class EnterpriseUserSidebar extends OpenClawLightDomContentsElement {
  @property({ attribute: false }) context?: ApplicationContext<RouteId>;
  @property({ attribute: false }) activeRoute: RouteId = "enterprise";
  @property({ attribute: false }) onNavigate?: () => void;
  private unsubscribers: Array<() => void> = [];

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribers = [userBootstrapStore.subscribe(() => this.requestUpdate())];
    void userBootstrapStore.load();
  }

  override disconnectedCallback(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    super.disconnectedCallback();
  }

  private navigate(routeId: RouteId): void {
    this.context?.navigate(routeId);
    this.onNavigate?.();
  }

  private navItem(routeId: RouteId, label: string, icon?: unknown) {
    const active = this.activeRoute === routeId;
    return html`<button
      type="button"
      class="nav-item ${active ? "active" : ""}"
      aria-current=${active ? "page" : nothing}
      @click=${() => this.navigate(routeId)}
    >
      ${icon === undefined
        ? nothing
        : html`<span class="nav-item__icon" aria-hidden="true">${icon}</span>`}
      <span>${label}</span>
    </button>`;
  }

  override render() {
    const bootstrap = userBootstrapStore.state;
    const user = bootstrap.phase === "ready" ? bootstrap.data.user : null;
    return html`
      <aside class="sidebar" aria-label=${eu("enterpriseUserNavigation")}>
        <div class="sidebar-shell">
          <div class="sidebar-shell__content">
            <div class="sidebar-shell__body">
              <div class="eu-sidebar-brand">${eu("productName")}</div>
              <openclaw-enterprise-user-agent-switcher
                .context=${this.context}
                .onNavigate=${this.onNavigate}
              ></openclaw-enterprise-user-agent-switcher>
              <button
                type="button"
                class="btn primary eu-new-chat"
                ?disabled=${bootstrap.phase !== "ready" ||
                !bootstrap.data.agents.some((agent) => agent.actions.canChat)}
                @click=${() => this.navigate("new-session")}
              >
                ${icons.plus} <span>${eu("newConversation")}</span>
              </button>
              <nav class="sidebar-nav" aria-label=${eu("userPages")}>
                <openclaw-enterprise-user-conversation-organizer
                  .context=${this.context}
                  .refreshToken=${this.activeRoute}
                  .onNavigate=${this.onNavigate}
                ></openclaw-enterprise-user-conversation-organizer>
                ${this.navItem("sessions", eu("allConversations"))}
                ${this.navItem("enterprise", eu("agents"), icons.bot)}
                ${bootstrap.phase === "ready" && bootstrap.data.features.plugins.enabled
                  ? this.navItem("plugins", eu("plugins"), icons.box)
                  : nothing}
                ${bootstrap.phase === "ready" && bootstrap.data.features.knowledge.enabled
                  ? this.navItem("knowledge", "Tri thức doanh nghiệp", icons.book)
                  : nothing}
                ${bootstrap.phase === "ready" && bootstrap.data.features.automations
                  ? this.navItem("cron", eu("automations"), icons.clock)
                  : nothing}
              </nav>
            </div>
          </div>
          <div class="sidebar-shell__footer">
            <details class="eu-account-menu">
              <summary class="nav-item">
                <span class="eu-account-avatar" aria-hidden="true"
                  >${user?.displayName.charAt(0).toUpperCase() ?? "U"}</span
                >
                <span>${user?.displayName ?? eu("account")}</span>
              </summary>
              <div class="eu-account-menu__items">
                ${this.navItem("profile", eu("accountSecurity"), icons.users)}
                ${this.navItem("appearance", eu("appearance"), icons.sun)}
                ${bootstrap.phase === "ready" && bootstrap.data.features.notifications
                  ? this.navItem("notifications", eu("notifications"), icons.radio)
                  : nothing}
                ${this.navItem("about", eu("helpAbout"), icons.shieldQuestion)}
                <button
                  type="button"
                  class="nav-item"
                  @click=${async () => {
                    await logoutEnterprisePortal("user");
                    globalThis.location.reload();
                  }}
                >
                  <span class="nav-item__icon" aria-hidden="true">${icons.x}</span>
                  <span>${eu("logout")}</span>
                </button>
              </div>
            </details>
          </div>
        </div>
      </aside>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-user-sidebar")) {
  customElements.define("openclaw-enterprise-user-sidebar", EnterpriseUserSidebar);
}
