import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { inferControlUiPublicAssetPath } from "../../app/public-assets.ts";
import { renderSensitiveInput } from "../../components/sensitive-input.ts";
import { adminShellCopy } from "../../i18n/enterprise-admin-shell.ts";
import { renderEnterpriseLanguagePicker } from "../../i18n/enterprise-language-picker.ts";
import { OpenClawLightDomElement } from "../../lit/openclaw-element.ts";
import {
  changeEnterprisePortalPassword,
  EnterpriseApiError,
  loadEnterprisePortalMe,
  loginEnterprisePortal,
  logoutEnterprisePortal,
  type EnterpriseAccount,
} from "../enterprise/services/enterprise-api.ts";
import "./admin.css";
import { beginAdminAppearanceScope } from "./admin-appearance.ts";
import "./admin-shell.ts";
import { adminPathname, errorMessage, navigateAdmin, resolveAdminPage } from "./utils.ts";

type AdminAuthState =
  | { phase: "checking" }
  | { phase: "login" }
  | { phase: "change-password"; account: EnterpriseAccount }
  | { phase: "ready"; account: EnterpriseAccount }
  | { phase: "error"; error: unknown };

export class EnterpriseAdminRoot extends OpenClawLightDomElement {
  @state() private auth: AdminAuthState = { phase: "checking" };
  @state() private pathname = adminPathname();
  @state() private busy = false;
  @state() private loginPassword = "";
  @state() private showLoginPassword = false;
  @state() private formError:
    | { kind: "password-mismatch" }
    | { kind: "request"; error: unknown }
    | null = null;
  private endAppearanceScope?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.endAppearanceScope = beginAdminAppearanceScope();
    globalThis.addEventListener("popstate", this.handleLocation);
    this.normalizeConfigRoute();
    void this.restore();
  }

  override disconnectedCallback(): void {
    globalThis.removeEventListener("popstate", this.handleLocation);
    this.endAppearanceScope?.();
    this.endAppearanceScope = undefined;
    super.disconnectedCallback();
  }

  private normalizeConfigRoute(): boolean {
    if (this.pathname === "/admin/config" || this.pathname === "/admin/config/") {
      navigateAdmin("/config/tools", true);
      return true;
    }
    if (this.pathname.startsWith("/admin/tools-config")) {
      navigateAdmin("/config/tools", true);
      return true;
    }
    return false;
  }

  private readonly handleLocation = () => {
    this.pathname = adminPathname();
    if (this.normalizeConfigRoute()) {
      return;
    }
    if (this.pathname === "/admin") {
      navigateAdmin("/accounts", true);
    }
    if (this.auth.phase === "ready" && this.pathname === "/admin/change-password") {
      this.auth = { phase: "change-password", account: this.auth.account };
    } else if (
      this.auth.phase === "change-password" &&
      this.pathname !== "/admin/change-password"
    ) {
      this.auth = { phase: "ready", account: this.auth.account };
    }
  };

  private async restore(): Promise<void> {
    try {
      const { account } = await loadEnterprisePortalMe("admin");
      if (account.mustChangePassword || this.pathname === "/admin/change-password") {
        if (this.pathname !== "/admin/change-password") {
          navigateAdmin("/change-password", true);
        }
        this.auth = { phase: "change-password", account };
        return;
      }
      if (this.pathname === "/admin" || this.pathname === "/admin/login") {
        navigateAdmin("/accounts", true);
      }
      this.auth = { phase: "ready", account };
    } catch (error) {
      if (error instanceof EnterpriseApiError && error.status === 401) {
        if (this.pathname !== "/admin/login") {
          navigateAdmin("/login", true);
        }
        this.auth = { phase: "login" };
      } else {
        this.auth = { phase: "error", error };
      }
    }
  }

  private async login(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const data = new FormData(form);
    this.busy = true;
    this.formError = null;
    try {
      const { account } = await loginEnterprisePortal(
        "admin",
        String(data.get("username") ?? ""),
        String(data.get("password") ?? ""),
      );
      if (account.mustChangePassword) {
        navigateAdmin("/change-password", true);
        this.auth = { phase: "change-password", account };
      } else {
        navigateAdmin("/accounts", true);
        this.auth = { phase: "ready", account };
      }
      this.loginPassword = "";
      this.showLoginPassword = false;
      form.reset();
    } catch (error) {
      this.formError = { kind: "request", error };
    } finally {
      this.busy = false;
    }
  }

  private async changePassword(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const data = new FormData(form);
    const next = String(data.get("newPassword") ?? "");
    if (next !== String(data.get("confirmPassword") ?? "")) {
      this.formError = { kind: "password-mismatch" };
      return;
    }
    this.busy = true;
    this.formError = null;
    try {
      await changeEnterprisePortalPassword(
        "admin",
        String(data.get("currentPassword") ?? ""),
        next,
      );
      form.reset();
      navigateAdmin("/login", true);
      this.auth = { phase: "login" };
    } catch (error) {
      this.formError = { kind: "request", error };
    } finally {
      this.busy = false;
    }
  }

  private async logout(): Promise<void> {
    try {
      await logoutEnterprisePortal("admin");
    } finally {
      navigateAdmin("/login", true);
      this.auth = { phase: "login" };
    }
  }

  private renderBrand() {
    return html`
      <div class="ea-brand">
        <div class="ea-brand__mark" aria-hidden="true">
          <img src=${inferControlUiPublicAssetPath("favicon.svg")} alt="" />
        </div>
        <div><strong>MAAP</strong><span>MAAP Admin</span></div>
      </div>
    `;
  }

  private renderLogin() {
    return html`
      <main class="ea-auth">
        <section class="ea-auth__card ea-auth__card--login">
          <div class="ea-auth__visual">
            ${this.renderBrand()}
            <div class="ea-auth__visual-mark" aria-hidden="true">
              <img src=${inferControlUiPublicAssetPath("favicon.svg")} alt="" />
            </div>
          </div>
          <div class="ea-auth__panel">
            <div class="ea-auth__copy">
              <span class="ea-auth__eyebrow">MAAP ADMIN</span>
              <h1>${adminShellCopy("Đăng nhập quản trị")}</h1>
              <p class="ea-muted">
                ${adminShellCopy("Chỉ tài khoản administrator có thể truy cập portal này.")}
              </p>
            </div>
            <form class="ea-form" @submit=${(event: SubmitEvent) => void this.login(event)}>
              <label class="ea-field"
                >${adminShellCopy("Username")}
                <input
                  class="ea-input"
                  name="username"
                  autocomplete="username"
                  required
                  autofocus
                />
              </label>
              <div class="ea-field">
                <label for="ea-admin-password">${adminShellCopy("Mật khẩu")}</label>
                ${renderSensitiveInput({
                  id: "ea-admin-password",
                  name: "password",
                  value: this.loginPassword,
                  revealed: this.showLoginPassword,
                  revealLabel: adminShellCopy("Hiện mật khẩu"),
                  hideLabel: adminShellCopy("Ẩn mật khẩu"),
                  className: "ea-auth__password",
                  inputClassName: "ea-input",
                  autocomplete: "current-password",
                  required: true,
                  disabled: this.busy,
                  onInput: (value) => {
                    this.loginPassword = value;
                  },
                  onToggle: () => {
                    this.showLoginPassword = !this.showLoginPassword;
                  },
                })}
              </div>
              <button class="ea-button ea-button--primary" type="submit" ?disabled=${this.busy}>
                ${this.busy ? adminShellCopy("Đang đăng nhập…") : adminShellCopy("Đăng nhập Admin")}
              </button>
              ${this.formError
                ? html`<p class="ea-error" role="alert">
                    ${this.formError.kind === "password-mismatch"
                      ? adminShellCopy("Mật khẩu xác nhận không khớp.")
                      : errorMessage(this.formError.error)}
                  </p>`
                : nothing}
            </form>
            <footer class="ea-auth__language">
              ${renderEnterpriseLanguagePicker("ea-input ea-auth__language-select")}
            </footer>
          </div>
        </section>
      </main>
    `;
  }

  private renderPasswordChange(account: EnterpriseAccount) {
    return html`
      <main class="ea-auth">
        <section class="ea-auth__card">
          ${this.renderBrand()} ${renderEnterpriseLanguagePicker("ea-input")}
          <h1>${adminShellCopy("Đổi mật khẩu")}</h1>
          <p class="ea-muted">
            @${account.username} · ${adminShellCopy("sau khi đổi bạn cần đăng nhập lại.")}
          </p>
          <form class="ea-form" @submit=${(event: SubmitEvent) => void this.changePassword(event)}>
            <label class="ea-field"
              >${adminShellCopy("Mật khẩu hiện tại")}
              <input
                class="ea-input"
                name="currentPassword"
                type="password"
                autocomplete="current-password"
                required
              />
            </label>
            <label class="ea-field"
              >${adminShellCopy("Mật khẩu mới")}
              <input
                class="ea-input"
                name="newPassword"
                type="password"
                autocomplete="new-password"
                minlength="10"
                required
              />
            </label>
            <label class="ea-field"
              >${adminShellCopy("Xác nhận mật khẩu mới")}
              <input
                class="ea-input"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                minlength="10"
                required
              />
            </label>
            <button class="ea-button ea-button--primary" type="submit" ?disabled=${this.busy}>
              ${this.busy ? adminShellCopy("Đang cập nhật…") : adminShellCopy("Đổi mật khẩu")}
            </button>
            ${!account.mustChangePassword
              ? html`<button
                  class="ea-button"
                  type="button"
                  @click=${() => navigateAdmin("/accounts")}
                >
                  ${adminShellCopy("Quay lại dashboard")}
                </button>`
              : nothing}
            ${this.formError
              ? html`<p class="ea-error" role="alert">
                  ${this.formError.kind === "password-mismatch"
                    ? adminShellCopy("Mật khẩu xác nhận không khớp.")
                    : errorMessage(this.formError.error)}
                </p>`
              : nothing}
          </form>
        </section>
      </main>
    `;
  }

  override render() {
    if (this.auth.phase === "checking") {
      return html`<main class="ea-auth">
        <p class="ea-muted">${adminShellCopy("Đang kiểm tra phiên quản trị…")}</p>
      </main>`;
    }
    if (this.auth.phase === "error") {
      return html`<main class="ea-auth">
        <section class="ea-auth__card ea-stack">
          ${renderEnterpriseLanguagePicker("ea-input")}
          <p class="ea-error">${errorMessage(this.auth.error)}</p>
          <button class="ea-button" @click=${() => void this.restore()}>
            ${adminShellCopy("Thử lại")}
          </button>
        </section>
      </main>`;
    }
    if (this.auth.phase === "login") {
      return this.renderLogin();
    }
    if (this.auth.phase === "change-password") {
      return this.renderPasswordChange(this.auth.account);
    }
    return html`
      <openclaw-enterprise-admin-shell
        .account=${this.auth.account}
        .page=${resolveAdminPage(this.pathname)}
        .onLogout=${() => void this.logout()}
      ></openclaw-enterprise-admin-shell>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-admin-root")) {
  customElements.define("openclaw-enterprise-admin-root", EnterpriseAdminRoot);
}
