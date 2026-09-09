import { html } from "lit";
import { property, state } from "lit/decorators.js";
import { renderEnterpriseLanguagePicker } from "../../../i18n/enterprise-language-picker.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { changeEnterprisePassword, type EnterpriseAccount } from "../services/enterprise-api.ts";
import { readEnterpriseFormString } from "../services/form-data.ts";

export class EnterpriseChangePasswordPage extends OpenClawLightDomElement {
  @property({ attribute: false }) account?: EnterpriseAccount;
  @property({ attribute: false }) onChanged?: () => void;
  @state() private busy = false;
  @state() private error = "";

  private async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const next = readEnterpriseFormString(data, "newPassword");
    if (next !== readEnterpriseFormString(data, "confirmation")) {
      this.error = eu("passwordMismatch");
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await changeEnterprisePassword(readEnterpriseFormString(data, "currentPassword"), next);
      this.onChanged?.();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("passwordUpdateFailed");
    } finally {
      this.busy = false;
    }
  }

  override render() {
    return html`
      <main class="enterprise-auth-screen">
        <section class="enterprise-card">
          ${renderEnterpriseLanguagePicker("enterprise-select")}
          <h1 class="enterprise-title">${eu("changePasswordFirst")}</h1>
          <p class="enterprise-muted">
            ${eu("welcomePassword", { name: this.account?.displayName ?? "" })}
          </p>
          <form class="enterprise-form" @submit=${(event: SubmitEvent) => void this.submit(event)}>
            <label class="enterprise-field"
              >${eu("currentPassword")}<input
                class="enterprise-input"
                name="currentPassword"
                type="password"
                required
            /></label>
            <label class="enterprise-field"
              >${eu("newPassword")}<input
                class="enterprise-input"
                name="newPassword"
                type="password"
                minlength="10"
                required
            /></label>
            <label class="enterprise-field"
              >${eu("confirmNewPassword")}<input
                class="enterprise-input"
                name="confirmation"
                type="password"
                minlength="10"
                required
            /></label>
            <button class="enterprise-button" type="submit" ?disabled=${this.busy}>
              ${this.busy ? eu("saveBusy") : eu("changePassword")}
            </button>
            ${this.error ? html`<p class="enterprise-error" role="alert">${this.error}</p>` : ""}
          </form>
        </section>
      </main>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-change-password-page")) {
  customElements.define("openclaw-enterprise-change-password-page", EnterpriseChangePasswordPage);
}
