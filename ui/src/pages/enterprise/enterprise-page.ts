import { html } from "lit";
import { state } from "lit/decorators.js";
import { OpenClawLightDomElement } from "../../lit/openclaw-element.ts";
import "./components/enterprise-shell.ts";
import {
  loadEnterpriseMe,
  loadMyEnterprisePolicy,
  type EnterpriseAccount,
  type EnterpriseEffectivePolicy,
} from "./services/enterprise-api.ts";
import "./styles/enterprise.css";

export class EnterprisePage extends OpenClawLightDomElement {
  @state() private account?: EnterpriseAccount;
  @state() private policy?: EnterpriseEffectivePolicy;
  @state() private error = "";

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const [me, policy] = await Promise.all([loadEnterpriseMe(), loadMyEnterprisePolicy()]);
      this.account = me.account;
      this.policy = policy;
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Không thể tải Enterprise Portal.";
    }
  }

  override render() {
    if (this.error) {
      return html`<section class="enterprise-page">
        <div class="enterprise-panel"><p class="enterprise-error">${this.error}</p></div>
      </section>`;
    }
    if (!this.account || !this.policy) {
      return html`<section class="enterprise-page">
        <p class="enterprise-muted">Đang tải Enterprise Portal…</p>
      </section>`;
    }
    return html`<openclaw-enterprise-shell
      .account=${this.account}
      .policy=${this.policy}
    ></openclaw-enterprise-shell>`;
  }
}

if (!customElements.get("openclaw-enterprise-page")) {
  customElements.define("openclaw-enterprise-page", EnterprisePage);
}
