import { html } from "lit";
import { property, state } from "lit/decorators.js";
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
      this.error = "Xác nhận mật khẩu không khớp.";
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await changeEnterprisePassword(readEnterpriseFormString(data, "currentPassword"), next);
      this.onChanged?.();
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Không thể đổi mật khẩu.";
    } finally {
      this.busy = false;
    }
  }

  override render() {
    return html`
      <main class="enterprise-auth-screen">
        <section class="enterprise-card">
          <h1 class="enterprise-title">Đổi mật khẩu lần đầu</h1>
          <p class="enterprise-muted">
            Xin chào ${this.account?.displayName ?? "bạn"}. Mật khẩu mới cần ít nhất 10 ký tự.
          </p>
          <form class="enterprise-form" @submit=${(event: SubmitEvent) => void this.submit(event)}>
            <label class="enterprise-field"
              >Mật khẩu hiện tại<input
                class="enterprise-input"
                name="currentPassword"
                type="password"
                required
            /></label>
            <label class="enterprise-field"
              >Mật khẩu mới<input
                class="enterprise-input"
                name="newPassword"
                type="password"
                minlength="10"
                required
            /></label>
            <label class="enterprise-field"
              >Nhập lại mật khẩu mới<input
                class="enterprise-input"
                name="confirmation"
                type="password"
                minlength="10"
                required
            /></label>
            <button class="enterprise-button" type="submit" ?disabled=${this.busy}>
              ${this.busy ? "Đang lưu…" : "Đổi mật khẩu"}
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
