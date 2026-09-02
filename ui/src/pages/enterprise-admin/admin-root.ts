import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { icons } from "../../components/icons.ts";
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
  | { phase: "error"; message: string };

export class EnterpriseAdminRoot extends OpenClawLightDomElement {
  @state() private auth: AdminAuthState = { phase: "checking" };
  @state() private pathname = adminPathname();
  @state() private busy = false;
  @state() private formError = "";
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
        this.auth = { phase: "error", message: errorMessage(error) };
      }
    }
  }

  private async login(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    this.busy = true;
    this.formError = "";
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
      (event.currentTarget as HTMLFormElement).reset();
    } catch (error) {
      this.formError = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  private async changePassword(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const next = String(data.get("newPassword") ?? "");
    if (next !== String(data.get("confirmPassword") ?? "")) {
      this.formError = "Mật khẩu xác nhận không khớp.";
      return;
    }
    this.busy = true;
    this.formError = "";
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
      this.formError = errorMessage(error);
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
        <div class="ea-brand__mark" aria-hidden="true">${icons.lobster}</div>
        <div><strong>OpenClaw</strong><span>Enterprise Admin</span></div>
      </div>
    `;
  }

  private renderLogin() {
    return html`
      <main class="ea-auth">
        <section class="ea-auth__card">
          ${this.renderBrand()}
          <h1>Đăng nhập quản trị</h1>
          <p class="ea-muted">Chỉ tài khoản administrator có thể truy cập portal này.</p>
          <form class="ea-form" @submit=${(event: SubmitEvent) => void this.login(event)}>
            <label class="ea-field"
              >Username
              <input class="ea-input" name="username" autocomplete="username" required autofocus />
            </label>
            <label class="ea-field"
              >Mật khẩu
              <input
                class="ea-input"
                name="password"
                type="password"
                autocomplete="current-password"
                required
              />
            </label>
            <button class="ea-button ea-button--primary" type="submit" ?disabled=${this.busy}>
              ${this.busy ? "Đang đăng nhập…" : "Đăng nhập Admin"}
            </button>
            ${this.formError
              ? html`<p class="ea-error" role="alert">${this.formError}</p>`
              : nothing}
          </form>
        </section>
      </main>
    `;
  }

  private renderPasswordChange(account: EnterpriseAccount) {
    return html`
      <main class="ea-auth">
        <section class="ea-auth__card">
          ${this.renderBrand()}
          <h1>Đổi mật khẩu</h1>
          <p class="ea-muted">@${account.username} · sau khi đổi bạn cần đăng nhập lại.</p>
          <form class="ea-form" @submit=${(event: SubmitEvent) => void this.changePassword(event)}>
            <label class="ea-field"
              >Mật khẩu hiện tại
              <input
                class="ea-input"
                name="currentPassword"
                type="password"
                autocomplete="current-password"
                required
              />
            </label>
            <label class="ea-field"
              >Mật khẩu mới
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
              >Xác nhận mật khẩu mới
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
              ${this.busy ? "Đang cập nhật…" : "Đổi mật khẩu"}
            </button>
            ${!account.mustChangePassword
              ? html`<button
                  class="ea-button"
                  type="button"
                  @click=${() => navigateAdmin("/accounts")}
                >
                  Quay lại dashboard
                </button>`
              : nothing}
            ${this.formError
              ? html`<p class="ea-error" role="alert">${this.formError}</p>`
              : nothing}
          </form>
        </section>
      </main>
    `;
  }

  override render() {
    if (this.auth.phase === "checking") {
      return html`<main class="ea-auth">
        <p class="ea-muted">Đang kiểm tra phiên quản trị…</p>
      </main>`;
    }
    if (this.auth.phase === "error") {
      return html`<main class="ea-auth">
        <section class="ea-auth__card ea-stack">
          <p class="ea-error">${this.auth.message}</p>
          <button class="ea-button" @click=${() => void this.restore()}>Thử lại</button>
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
