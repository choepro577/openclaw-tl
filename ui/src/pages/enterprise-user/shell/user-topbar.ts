import { html } from "lit";
import { property } from "lit/decorators.js";
import { icons } from "../../../components/icons.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomContentsElement } from "../../../lit/openclaw-element.ts";
import { presentUserAgentAvatar } from "../services/user-agent-presenter.ts";
import { userAgentCatalogStore } from "../state/user-agent-catalog-store.ts";

export class EnterpriseUserTopbar extends OpenClawLightDomContentsElement {
  @property({ attribute: false }) drawerOpen = false;
  @property({ attribute: false }) onToggleDrawer?: (trigger: HTMLElement) => void;
  private unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = userAgentCatalogStore.subscribe(() => this.requestUpdate());
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super.disconnectedCallback();
  }

  override render() {
    const activeAgent = userAgentCatalogStore.activeAgent;
    return html`<header class="topbar eu-topbar">
      <button
        type="button"
        class="topbar-icon-btn topbar-nav-toggle"
        aria-label=${eu("enterpriseNavigation")}
        aria-expanded=${this.drawerOpen}
        @click=${(event: Event) => this.onToggleDrawer?.(event.currentTarget as HTMLButtonElement)}
      >
        ${icons.menu}
      </button>
      <button
        type="button"
        class="btn btn--ghost eu-topbar__agent"
        aria-label=${eu("changeActiveAgent")}
        @click=${(event: Event) => this.onToggleDrawer?.(event.currentTarget as HTMLButtonElement)}
      >
        <span aria-hidden="true">${activeAgent ? presentUserAgentAvatar(activeAgent) : "◌"}</span>
        <span class="eu-topbar__agent-label">
          <small>${eu("activeAgent")}</small>
          <strong>${activeAgent?.name ?? "MAAP"}</strong>
        </span>
      </button>
    </header>`;
  }
}

if (!customElements.get("openclaw-enterprise-user-topbar")) {
  customElements.define("openclaw-enterprise-user-topbar", EnterpriseUserTopbar);
}
