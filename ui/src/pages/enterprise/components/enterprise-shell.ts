import { html } from "lit";
import { property, state } from "lit/decorators.js";
import { inferBasePathFromPathname } from "../../../app-route-paths.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import type { EnterpriseAccount, EnterpriseEffectivePolicy } from "../services/enterprise-api.ts";
import { resolveEnterpriseTab, type EnterpriseTab } from "../state/enterprise-shell-state.ts";
import "../admin/account-details-page.ts";
import "../admin/accounts-page.ts";
import "../user/allowed-agents-page.ts";
import "../user/enterprise-profile-page.ts";
import "../user/personal-agent-page.ts";

export class EnterpriseShell extends OpenClawLightDomElement {
  @property({ attribute: false }) account?: EnterpriseAccount;
  @property({ attribute: false }) policy?: EnterpriseEffectivePolicy;
  @state() private activeTab?: EnterpriseTab;
  @state() private selectedAccount?: EnterpriseAccount;

  private tab(id: EnterpriseTab, label: string, activeTab: EnterpriseTab) {
    return html`<button
      class="enterprise-tab ${activeTab === id ? "enterprise-tab--active" : ""}"
      @click=${() => {
        this.activeTab = id;
      }}
    >
      ${label}
    </button>`;
  }

  override render() {
    const isAdmin = this.account?.role === "administrator";
    const activeTab = resolveEnterpriseTab(this.activeTab, this.account?.role);
    const basePath = inferBasePathFromPathname(globalThis.location?.pathname ?? "/");
    return html`
      <div class="enterprise-page">
        <header>
          <h1 class="enterprise-title">OpenClaw Enterprise</h1>
          <p class="enterprise-muted">Xin chào ${this.account?.displayName}.</p>
        </header>
        <nav class="enterprise-tabs" aria-label="Enterprise navigation">
          ${this.tab("personal", "Personal Agent", activeTab)}
          ${this.tab("agents", "Agent được cấp", activeTab)}
          ${this.tab("profile", "Hồ sơ", activeTab)}
          ${isAdmin ? this.tab("accounts", "Tài khoản", activeTab) : ""}
          ${isAdmin ? this.tab("management", "Agent, Skill & Tool", activeTab) : ""}
        </nav>
        ${activeTab === "personal"
          ? html`<openclaw-enterprise-personal-agent-page
              .account=${this.account}
              .policy=${this.policy}
            ></openclaw-enterprise-personal-agent-page>`
          : activeTab === "agents"
            ? html`<openclaw-enterprise-allowed-agents-page
                .policy=${this.policy}
              ></openclaw-enterprise-allowed-agents-page>`
            : activeTab === "profile"
              ? html`<openclaw-enterprise-profile-page
                  .account=${this.account}
                ></openclaw-enterprise-profile-page>`
              : activeTab === "accounts" && isAdmin
                ? html`
                    <openclaw-enterprise-accounts-page
                      .onSelect=${(account: EnterpriseAccount) => {
                        this.selectedAccount = account;
                      }}
                    ></openclaw-enterprise-accounts-page>
                    <openclaw-enterprise-account-details-page
                      .account=${this.selectedAccount}
                    ></openclaw-enterprise-account-details-page>
                  `
                : isAdmin
                  ? html`
                      <section class="enterprise-panel enterprise-stack">
                        <h2>Quản trị cấu hình OpenClaw</h2>
                        <p class="enterprise-muted">
                          Module Enterprise chỉ quản lý quyền tài khoản. Định nghĩa Agent, Skill và
                          Tool vẫn dùng trang OpenClaw gốc.
                        </p>
                        <div class="enterprise-actions">
                          <a class="enterprise-button" href=${`${basePath}/settings/agents`}
                            >Quản lý Agents</a
                          >
                          <a class="enterprise-button" href=${`${basePath}/skills`}
                            >Quản lý Skills</a
                          >
                          <a class="enterprise-button" href=${`${basePath}/settings/general`}
                            >Quản lý Tools & Config</a
                          >
                        </div>
                      </section>
                    `
                  : ""}
      </div>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-shell")) {
  customElements.define("openclaw-enterprise-shell", EnterpriseShell);
}
