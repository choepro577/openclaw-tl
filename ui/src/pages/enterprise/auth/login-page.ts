import { html } from "lit";
import { property, state } from "lit/decorators.js";
import { renderEnterpriseLanguagePicker } from "../../../i18n/enterprise-language-picker.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { enterpriseCopy } from "../enterprise-copy.ts";
import { loginEnterprise, type EnterpriseAccount } from "../services/enterprise-api.ts";
import { readEnterpriseFormString } from "../services/form-data.ts";

export class EnterpriseLoginPage extends OpenClawLightDomElement {
  @property({ attribute: false }) onAuthenticated?: (account: EnterpriseAccount) => void;
  @property({ type: Boolean }) bootstrapped = true;
  @state() private busy = false;
  @state() private error = "";

  private async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    this.busy = true;
    this.error = "";
    try {
      const result = await loginEnterprise(
        readEnterpriseFormString(data, "username"),
        readEnterpriseFormString(data, "password"),
      );
      this.onAuthenticated?.(result.account);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("loginFailed");
    } finally {
      this.busy = false;
    }
  }

  override render() {
    return html`
      <main class="enterprise-auth-screen">
        <section class="enterprise-card">
          ${renderEnterpriseLanguagePicker("enterprise-select")}
          <h1 class="enterprise-title">${eu("productName")}</h1>
          <p class="enterprise-muted">${eu("loginDescription")}</p>
          ${this.bootstrapped
            ? html`
                <form
                  class="enterprise-form"
                  @submit=${(event: SubmitEvent) => void this.submit(event)}
                >
                  <label class="enterprise-field">
                    ${eu("username")}
                    <input
                      class="enterprise-input"
                      name="username"
                      autocomplete="username"
                      required
                      autofocus
                    />
                  </label>
                  <label class="enterprise-field">
                    ${eu("password")}
                    <input
                      class="enterprise-input"
                      name="password"
                      type="password"
                      autocomplete="current-password"
                      required
                    />
                  </label>
                  <button class="enterprise-button" type="submit" ?disabled=${this.busy}>
                    ${this.busy ? eu("loginBusy") : eu("login")}
                  </button>
                  ${this.error
                    ? html`<p class="enterprise-error" role="alert">${this.error}</p>`
                    : ""}
                </form>
              `
            : html`
                <p class="enterprise-error">${eu("noAdmin")}</p>
                <p class="enterprise-code">${enterpriseCopy("bootstrapCommand")}</p>
              `}
        </section>
      </main>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-login-page")) {
  customElements.define("openclaw-enterprise-login-page", EnterpriseLoginPage);
}
