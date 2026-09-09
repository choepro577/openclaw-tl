import { html } from "lit";
import { property, state } from "lit/decorators.js";
import { inferBasePathFromPathname } from "../../../app-route-paths.ts";
import { renderEnterpriseLanguagePicker } from "../../../i18n/enterprise-language-picker.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { enterpriseCopy } from "../enterprise-copy.ts";
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
          ${renderEnterpriseLanguagePicker("enterprise-select")}
          <h1 class="enterprise-title">${eu("productName")}</h1>
          <p class="enterprise-muted">
            ${enterpriseCopy("greeting", { name: this.account?.displayName ?? "" })}
          </p>
        </header>
        <nav class="enterprise-tabs" aria-label=${eu("enterpriseNavigation")}>
          ${this.tab("personal", eu("personalAgent"), activeTab)}
          ${this.tab("agents", enterpriseCopy("assignedAgents"), activeTab)}
          ${this.tab("profile", enterpriseCopy("profile"), activeTab)}
          ${isAdmin ? this.tab("accounts", enterpriseCopy("accounts"), activeTab) : ""}
          ${isAdmin ? this.tab("management", enterpriseCopy("management"), activeTab) : ""}
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
                        <h2>${enterpriseCopy("managementTitle")}</h2>
                        <p class="enterprise-muted">${enterpriseCopy("managementDescription")}</p>
                        <div class="enterprise-actions">
                          <a class="enterprise-button" href=${`${basePath}/settings/agents`}
                            >${enterpriseCopy("manageAgents")}</a
                          >
                          <a class="enterprise-button" href=${`${basePath}/skills`}
                            >${enterpriseCopy("manageSkills")}</a
                          >
                          <a class="enterprise-button" href=${`${basePath}/settings/general`}
                            >${enterpriseCopy("manageTools")}</a
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
