import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  changeEnterpriseUserPassword,
  type EnterpriseUserAuthAccount,
} from "../services/user-enterprise-api.ts";

export class EnterpriseUserChangePasswordPage extends OpenClawLightDomElement {
  @property({ attribute: false }) account?: EnterpriseUserAuthAccount;
  @property({ attribute: false }) onChanged?: () => void;
  @state() private busy = false;
  @state() private error = "";

  private async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (newPassword !== confirmation) {
      this.error = eu("passwordMismatch");
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await changeEnterpriseUserPassword(currentPassword, newPassword);
      this.onChanged?.();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("passwordUpdateFailed");
    } finally {
      this.busy = false;
    }
  }

  override render() {
    return html`<main class="eu-auth-screen">
      <section class="card eu-auth-card">
        <div>
          <h1>${eu("changePasswordFirst")}</h1>
          <p>${eu("welcomePassword", { name: this.account?.displayName ?? eu("account") })}</p>
        </div>
        <form class="stack" @submit=${(event: SubmitEvent) => void this.submit(event)}>
          <label class="field">
            <span>${eu("currentPassword")}</span>
            <input
              class="input"
              name="currentPassword"
              type="password"
              autocomplete="current-password"
              required
            />
          </label>
          <label class="field">
            <span>${eu("newPassword")}</span>
            <input
              class="input"
              name="newPassword"
              type="password"
              minlength="10"
              autocomplete="new-password"
              required
            />
          </label>
          <label class="field">
            <span>${eu("confirmNewPassword")}</span>
            <input
              class="input"
              name="confirmation"
              type="password"
              minlength="10"
              autocomplete="new-password"
              required
            />
          </label>
          <button class="btn primary" type="submit" ?disabled=${this.busy}>
            ${this.busy ? eu("saveBusy") : eu("changePassword")}
          </button>
          ${this.error
            ? html`<div class="callout danger" role="alert">${this.error}</div>`
            : nothing}
        </form>
      </section>
    </main>`;
  }
}

if (!customElements.get("openclaw-enterprise-user-change-password-page")) {
  customElements.define(
    "openclaw-enterprise-user-change-password-page",
    EnterpriseUserChangePasswordPage,
  );
}
