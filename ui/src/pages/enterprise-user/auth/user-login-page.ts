import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { inferControlUiPublicAssetPath } from "../../../app/public-assets.ts";
import { renderSensitiveInput } from "../../../components/sensitive-input.ts";
import { enterpriseErrorMessage } from "../../../i18n/enterprise-errors.ts";
import { renderEnterpriseLanguagePicker } from "../../../i18n/enterprise-language-picker.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  loginEnterpriseUser,
  type EnterpriseUserAuthAccount,
} from "../services/user-enterprise-api.ts";
import { clearThienlyPendingState, loadThienlyAuthConfig } from "../services/user-thienly-auth.ts";

export class EnterpriseUserLoginPage extends OpenClawLightDomElement {
  @property({ attribute: false }) onAuthenticated?: (account: EnterpriseUserAuthAccount) => void;
  @property({ type: Boolean }) bootstrapped = true;
  @state() private busy = false;
  @state() private error: unknown = "";
  @state() private password = "";
  @state() private showPassword = false;
  @state() private thienlyEnabled = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.bootstrapped) {
      void this.loadThienlyConfig();
    }
  }

  private async loadThienlyConfig(): Promise<void> {
    try {
      const { enabled } = await loadThienlyAuthConfig();
      if (enabled) {
        await import("./thienly-login-flow.ts");
      }
      this.thienlyEnabled = enabled;
    } catch {
      // The normal username/password login remains available when the optional
      // Thiên Lý integration is disabled or not configured on this server.
      this.thienlyEnabled = false;
    }
  }

  private async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");
    this.busy = true;
    this.error = "";
    try {
      const result = await loginEnterpriseUser(username, password);
      clearThienlyPendingState();
      this.password = "";
      this.showPassword = false;
      this.onAuthenticated?.(result.account);
    } catch (error) {
      this.error = error;
    } finally {
      this.busy = false;
    }
  }

  override render() {
    return html`<main class="eu-auth-screen">
      <section class="card eu-auth-card eu-auth-card--login">
        <div class="eu-auth-visual">
          <div class="eu-auth-brand">
            <span class="eu-auth-brand__mark" aria-hidden="true">
              <img src=${inferControlUiPublicAssetPath("favicon.svg")} alt="" />
            </span>
            <span><strong>MAAP</strong><small>${eu("productName")}</small></span>
          </div>
          <div class="eu-auth-visual__mark" aria-hidden="true">
            <img src=${inferControlUiPublicAssetPath("favicon.svg")} alt="" />
          </div>
        </div>
        <div class="eu-auth-panel">
          <div class="eu-auth-copy">
            <span class="eu-auth-eyebrow">MAAP USER</span>
            <h1>${eu("login")}</h1>
            <p>${eu("loginDescription")}</p>
          </div>
          ${this.bootstrapped
            ? html`<form class="stack" @submit=${(event: SubmitEvent) => void this.submit(event)}>
                <label class="field">
                  <span>${eu("username")}</span>
                  <input class="input" name="username" autocomplete="username" required autofocus />
                </label>
                <div class="field">
                  <label for="eu-login-password">${eu("password")}</label>
                  ${renderSensitiveInput({
                    id: "eu-login-password",
                    name: "password",
                    value: this.password,
                    revealed: this.showPassword,
                    revealLabel: eu("showPassword"),
                    hideLabel: eu("hidePassword"),
                    className: "eu-auth-password",
                    inputClassName: "input",
                    autocomplete: "current-password",
                    required: true,
                    disabled: this.busy,
                    onInput: (value) => {
                      this.password = value;
                    },
                    onToggle: () => {
                      this.showPassword = !this.showPassword;
                    },
                  })}
                </div>
                <button class="btn primary" type="submit" ?disabled=${this.busy}>
                  ${this.busy ? eu("loginBusy") : eu("login")}
                </button>
                ${this.error
                  ? html`<div class="callout danger" role="alert">
                      ${enterpriseErrorMessage(this.error, eu("loginFailed"))}
                    </div>`
                  : nothing}
              </form>`
            : html`<div class="callout danger" role="alert">${eu("noAdmin")}</div>`}
          ${this.bootstrapped && this.thienlyEnabled
            ? html`<openclaw-enterprise-user-thienly-login-flow
                .onAuthenticated=${(account: EnterpriseUserAuthAccount) =>
                  this.onAuthenticated?.(account)}
              ></openclaw-enterprise-user-thienly-login-flow>`
            : nothing}
          <footer class="eu-auth-language">
            ${renderEnterpriseLanguagePicker("input eu-auth-language__select")}
          </footer>
        </div>
      </section>
    </main>`;
  }
}

if (!customElements.get("openclaw-enterprise-user-login-page")) {
  customElements.define("openclaw-enterprise-user-login-page", EnterpriseUserLoginPage);
}
