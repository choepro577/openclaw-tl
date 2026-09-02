import { html } from "lit";
import { property, state } from "lit/decorators.js";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
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
        <h2>Hồ sơ Enterprise</h2>
        <div class="enterprise-grid">
          <div>
            <span class="enterprise-muted">Tên</span><br /><strong
              >${this.account?.displayName}</strong
            >
          </div>
          <div>
            <span class="enterprise-muted">Username</span><br /><strong class="enterprise-code"
              >${this.account?.username}</strong
            >
          </div>
          <div>
            <span class="enterprise-muted">Role</span><br /><strong>${this.account?.role}</strong>
          </div>
        </div>
        <button
          class="enterprise-button enterprise-button--secondary"
          ?disabled=${this.busy}
          @click=${() => void this.logout()}
        >
          ${this.busy ? "Đang đăng xuất…" : "Đăng xuất"}
        </button>
      </section>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-profile-page")) {
  customElements.define("openclaw-enterprise-profile-page", EnterpriseProfilePage);
}
