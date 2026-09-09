import { html } from "lit";
import { property, state } from "lit/decorators.js";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { enterpriseCopy, enterpriseRoleLabel } from "../enterprise-copy.ts";
import { logoutEnterprise, type EnterpriseAccount } from "../services/enterprise-api.ts";

export class EnterpriseProfilePage extends OpenClawLightDomElement {
  @property({ attribute: false }) account?: EnterpriseAccount;
  @state() private busy = false;

  private async logout(): Promise<void> {
    this.busy = true;
    try {
      await logoutEnterprise();
    } finally {
      globalThis.location.reload();
    }
  }

  override render() {
    return html`
      <section class="enterprise-panel enterprise-stack">
        <h2>${enterpriseCopy("profileTitle")}</h2>
        <div class="enterprise-grid">
          <div>
            <span class="enterprise-muted">${enterpriseCopy("name")}</span><br /><strong
              >${this.account?.displayName}</strong
            >
          </div>
          <div>
            <span class="enterprise-muted">${eu("username")}</span><br /><strong
              class="enterprise-code"
              >${this.account?.username}</strong
            >
          </div>
          <div>
            <span class="enterprise-muted">${eu("role")}</span><br /><strong
              >${enterpriseRoleLabel(this.account?.role ?? "")}</strong
            >
          </div>
        </div>
        <button
          class="enterprise-button enterprise-button--secondary"
          ?disabled=${this.busy}
          @click=${() => void this.logout()}
        >
          ${this.busy ? enterpriseCopy("logoutBusy") : eu("logout")}
        </button>
      </section>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-profile-page")) {
  customElements.define("openclaw-enterprise-profile-page", EnterpriseProfilePage);
}
