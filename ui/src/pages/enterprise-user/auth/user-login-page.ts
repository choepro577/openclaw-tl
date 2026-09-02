import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  loginEnterpriseUser,
  type EnterpriseUserAuthAccount,
} from "../services/user-enterprise-api.ts";

export class EnterpriseUserLoginPage extends OpenClawLightDomElement {
  @property({ attribute: false }) onAuthenticated?: (account: EnterpriseUserAuthAccount) => void;
  @property({ type: Boolean }) bootstrapped = true;
  @state() private busy = false;
  @state() private error = "";

  private async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");
    this.busy = true;
    this.error = "";
    try {
      const result = await loginEnterpriseUser(username, password);
      this.onAuthenticated?.(result.account);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("loginFailed");
    } finally {
      this.busy = false;
    }
  }

  override render() {
    return html`<main class="eu-auth-screen">
      <section class="card eu-auth-card">
        <div>
          <h1>${eu("productName")}</h1>
          <p>${eu("loginDescription")}</p>
        </div>
        ${this.bootstrapped
          ? html`<form class="stack" @submit=${(event: SubmitEvent) => void this.submit(event)}>
              <label class="field">
                <span>${eu("username")}</span>
                <input class="input" name="username" autocomplete="username" required autofocus />
              </label>
              <label class="field">
                <span>${eu("password")}</span>
                <input
                  class="input"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                />
              </label>
              <button class="btn primary" type="submit" ?disabled=${this.busy}>
                ${this.busy ? eu("loginBusy") : eu("login")}
              </button>
              ${this.error
                ? html`<div class="callout danger" role="alert">${this.error}</div>`
                : nothing}
            </form>`
          : html`<div class="callout danger" role="alert">${eu("noAdmin")}</div>`}
      </section>
    </main>`;
  }
}

if (!customElements.get("openclaw-enterprise-user-login-page")) {
  customElements.define("openclaw-enterprise-user-login-page", EnterpriseUserLoginPage);
}
