import { html } from "lit";
import { property, state } from "lit/decorators.js";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { enterpriseCopy, enterpriseRoleLabel, enterpriseStatusLabel } from "../enterprise-copy.ts";
import {
  createEnterpriseAccount,
  listEnterpriseAccounts,
  type EnterpriseAccount,
  type EnterpriseAccountRole,
} from "../services/enterprise-api.ts";
import { readEnterpriseFormString } from "../services/form-data.ts";

export class EnterpriseAccountsPage extends OpenClawLightDomElement {
  @property({ attribute: false }) onSelect?: (account: EnterpriseAccount) => void;
  @state() private accounts: EnterpriseAccount[] = [];
  @state() private loading = true;
  @state() private error = "";

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      this.accounts = await listEnterpriseAccounts();
    } catch (error) {
      this.error = error instanceof Error ? error.message : enterpriseCopy("accountsLoadFailed");
    } finally {
      this.loading = false;
    }
  }

  private async create(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    try {
      const account = await createEnterpriseAccount({
        username: readEnterpriseFormString(data, "username"),
        displayName: readEnterpriseFormString(data, "displayName"),
        initialPassword: readEnterpriseFormString(data, "initialPassword"),
        role: (readEnterpriseFormString(data, "role") || "employee") as EnterpriseAccountRole,
      });
      form.reset();
      await this.load();
      this.onSelect?.(account);
    } catch (error) {
      this.error = error instanceof Error ? error.message : enterpriseCopy("accountsCreateFailed");
    }
  }

  override render() {
    return html`
      <div class="enterprise-grid">
        <section class="enterprise-panel enterprise-stack">
          <h2>${enterpriseCopy("accountList")}</h2>
          ${this.loading ? html`<p class="enterprise-muted">${eu("loading")}</p>` : ""}
          ${this.error ? html`<p class="enterprise-error">${this.error}</p>` : ""}
          <div class="enterprise-list">
            ${this.accounts.map(
              (account) => html`
                <button
                  class="enterprise-list-item enterprise-button--secondary"
                  @click=${() => this.onSelect?.(account)}
                >
                  <strong>${account.displayName}</strong><br />
                  <span class="enterprise-code">${account.username}</span> ·
                  ${enterpriseRoleLabel(account.role)} · ${enterpriseStatusLabel(account.enabled)}
                </button>
              `,
            )}
          </div>
        </section>
        <section class="enterprise-panel enterprise-stack">
          <h2>${enterpriseCopy("createAccount")}</h2>
          <form class="enterprise-form" @submit=${(event: SubmitEvent) => void this.create(event)}>
            <label class="enterprise-field"
              >${eu("username")}<input class="enterprise-input" name="username" required
            /></label>
            <label class="enterprise-field"
              >${eu("displayName")}<input class="enterprise-input" name="displayName" required
            /></label>
            <label class="enterprise-field"
              >${enterpriseCopy("initialPassword")}<input
                class="enterprise-input"
                name="initialPassword"
                type="password"
                minlength="10"
                required
            /></label>
            <label class="enterprise-field"
              >${eu("role")}<select class="enterprise-select" name="role">
                <option value="employee">${enterpriseCopy("employee")}</option>
                <option value="administrator">${enterpriseCopy("administrator")}</option>
              </select></label
            >
            <button class="enterprise-button" type="submit">
              ${enterpriseCopy("createAccount")}
            </button>
          </form>
        </section>
      </div>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-accounts-page")) {
  customElements.define("openclaw-enterprise-accounts-page", EnterpriseAccountsPage);
}
