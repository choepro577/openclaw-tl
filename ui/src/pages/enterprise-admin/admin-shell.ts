import { html, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { inferControlUiPublicAssetPath } from "../../app/public-assets.ts";
import { icons } from "../../components/icons.ts";
import { adminShellCopy } from "../../i18n/enterprise-admin-shell.ts";
import { renderEnterpriseLanguagePicker } from "../../i18n/enterprise-language-picker.ts";
import { OpenClawLightDomElement } from "../../lit/openclaw-element.ts";
import type { EnterpriseAccount } from "../enterprise/services/enterprise-api.ts";
import { isAdminConfigPage, navigateAdmin, type AdminPage } from "./utils.ts";
import "./pages/accounts-page.ts";
import "./pages/agents-page.ts";
import "./pages/config-appearance-page.ts";
import "./pages/config-history-page.ts";
import "./pages/config-system-page.ts";
import "./pages/config-tools-page.ts";
import "./pages/knowledge-page.ts";
import "./pages/models-page.ts";
import "./pages/plugins-page.ts";
import "./pages/skills-page.ts";

const navigation: Array<{
  page: Extract<AdminPage, "accounts" | "agents" | "knowledge" | "skills" | "plugins">;
  labelKey: Parameters<typeof adminShellCopy>[0];
  path: string;
  icon: unknown;
}> = [
  { page: "accounts", labelKey: "Quản lý tài khoản", path: "/accounts", icon: icons.users },
  { page: "agents", labelKey: "Quản lý agent", path: "/agents", icon: icons.bot },
  { page: "knowledge", labelKey: "Tri thức doanh nghiệp", path: "/knowledge", icon: icons.book },
  { page: "skills", labelKey: "Quản lý skill", path: "/skills", icon: icons.wandSparkles },
  { page: "plugins", labelKey: "Plugins", path: "/plugins", icon: icons.box },
];

const configNavigation: Array<{
  page: AdminPage;
  labelKey: Parameters<typeof adminShellCopy>[0];
  path: string;
}> = [
  { page: "config-tools", labelKey: "Tools", path: "/config/tools" },
  { page: "config-models", labelKey: "Models", path: "/config/models" },
  { page: "config-system", labelKey: "System Config", path: "/config/system" },
  { page: "config-appearance", labelKey: "UI & Appearance", path: "/config/appearance" },
  { page: "config-history", labelKey: "Change History & Audit", path: "/config/history" },
];

export class EnterpriseAdminShell extends OpenClawLightDomElement {
  @property({ attribute: false }) account?: EnterpriseAccount;
  @property() page: AdminPage = "accounts";
  @property({ attribute: false }) onLogout?: () => void;
  @state() private drawerOpen = false;

  private navigate(path: string): void {
    this.drawerOpen = false;
    navigateAdmin(path);
  }

  private renderPage() {
    switch (this.page) {
      case "agents":
        return html`<openclaw-enterprise-admin-agents-page></openclaw-enterprise-admin-agents-page>`;
      case "skills":
        return html`<openclaw-enterprise-admin-skills-page></openclaw-enterprise-admin-skills-page>`;
      case "plugins":
        return html`<openclaw-enterprise-admin-plugins-page></openclaw-enterprise-admin-plugins-page>`;
      case "knowledge":
        return html`<openclaw-enterprise-admin-knowledge-page></openclaw-enterprise-admin-knowledge-page>`;
      case "config-tools":
        return html`<openclaw-enterprise-admin-config-tools-page></openclaw-enterprise-admin-config-tools-page>`;
      case "config-models":
        return html`<openclaw-enterprise-admin-models-page></openclaw-enterprise-admin-models-page>`;
      case "config-model-setup":
        return html`<openclaw-enterprise-admin-models-page
          .setup=${true}
        ></openclaw-enterprise-admin-models-page>`;
      case "config-system":
        return html`<openclaw-enterprise-admin-config-system-page></openclaw-enterprise-admin-config-system-page>`;
      case "config-appearance":
        return html`<openclaw-enterprise-admin-config-appearance-page></openclaw-enterprise-admin-config-appearance-page>`;
      case "config-history":
        return html`<openclaw-enterprise-admin-config-history-page></openclaw-enterprise-admin-config-history-page>`;
      default:
        return html`<openclaw-enterprise-admin-accounts-page></openclaw-enterprise-admin-accounts-page>`;
    }
  }

  private renderSidebar() {
    const configActive = isAdminConfigPage(this.page);
    return html`
      <aside class="ea-sidebar ${this.drawerOpen ? "ea-sidebar--open" : ""}">
        <div class="ea-brand">
          <div class="ea-brand__mark" aria-hidden="true">
            <img src=${inferControlUiPublicAssetPath("favicon.svg")} alt="" />
          </div>
          <div><strong>MAAP</strong><span>MAAP Admin</span></div>
        </div>
        <nav class="ea-nav" aria-label=${adminShellCopy("Quản trị Enterprise")}>
          ${navigation.map(
            (item) => html`
              <button
                class="ea-nav__item ${this.page === item.page ? "ea-nav__item--active" : ""}"
                type="button"
                aria-current=${this.page === item.page ? "page" : "false"}
                @click=${() => this.navigate(item.path)}
              >
                <span aria-hidden="true">${item.icon}</span>
                <span>${adminShellCopy(item.labelKey)}</span>
              </button>
            `,
          )}
          <button
            class="ea-nav__item ${configActive ? "ea-nav__item--active" : ""}"
            type="button"
            aria-expanded=${configActive ? "true" : "false"}
            @click=${() => this.navigate("/config/tools")}
          >
            <span aria-hidden="true">${icons.settings}</span>
            <span>${adminShellCopy("Config")}</span>
          </button>
          ${configActive
            ? html`<div class="ea-nav__submenu" aria-label=${adminShellCopy("Config")}>
                ${configNavigation.map((item) => {
                  const active =
                    this.page === item.page ||
                    (item.page === "config-models" && this.page === "config-model-setup");
                  return html`<button
                    class="ea-nav__subitem ${active ? "ea-nav__subitem--active" : ""}"
                    type="button"
                    aria-current=${active ? "page" : "false"}
                    @click=${() => this.navigate(item.path)}
                  >
                    ${adminShellCopy(item.labelKey)}
                  </button>`;
                })}
              </div>`
            : null}
        </nav>
        <footer class="ea-sidebar__footer">
          ${renderEnterpriseLanguagePicker("ea-input")}
          <div class="ea-admin-identity">
            <span class="ea-avatar" aria-hidden="true"
              >${this.account?.displayName.slice(0, 1).toUpperCase() ?? "A"}</span
            >
            <span class="ea-admin-identity__copy">
              <strong title=${this.account?.displayName ?? adminShellCopy("Administrator")}
                >${this.account?.displayName ?? adminShellCopy("Administrator")}</strong
              >
              <span title=${`@${this.account?.username ?? "admin"}`}
                >@${this.account?.username ?? "admin"}</span
              >
            </span>
          </div>
          <div class="ea-sidebar__account-actions">
            <button
              class="ea-nav__item"
              type="button"
              @click=${() => this.navigate("/change-password")}
            >
              <span aria-hidden="true">${icons.key}</span
              ><span>${adminShellCopy("Đổi mật khẩu")}</span>
            </button>
            <button class="ea-nav__item" type="button" @click=${this.onLogout}>
              <span aria-hidden="true">${icons.logOut}</span
              ><span>${adminShellCopy("Đăng xuất")}</span>
            </button>
          </div>
        </footer>
      </aside>
    `;
  }

  override updated(changed: PropertyValues<this>): void {
    if (!changed.has("page")) {
      return;
    }
    const content = this.querySelector<HTMLElement>(".ea-content");
    if (content) {
      content.scrollTop = 0;
      content.scrollLeft = 0;
    }
  }

  override render() {
    const current =
      navigation.find((item) => item.page === this.page) ??
      configNavigation.find(
        (item) =>
          item.page === this.page ||
          (item.page === "config-models" && this.page === "config-model-setup"),
      );
    return html`
      <main class="ea-root ea-shell">
        ${this.renderSidebar()}
        <section class="ea-content">
          <header class="ea-mobile-bar">
            <button
              class="ea-icon-button"
              type="button"
              aria-label=${adminShellCopy("Mở menu")}
              @click=${() => (this.drawerOpen = !this.drawerOpen)}
            >
              ${this.drawerOpen ? icons.x : icons.menu}
            </button>
            <strong>${current ? adminShellCopy(current.labelKey) : "MAAP Admin"}</strong>
          </header>
          ${this.renderPage()}
        </section>
      </main>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-admin-shell")) {
  customElements.define("openclaw-enterprise-admin-shell", EnterpriseAdminShell);
}
