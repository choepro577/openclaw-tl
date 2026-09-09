import { html } from "lit";
import { state } from "lit/decorators.js";
import { TEXT_SCALE_STOPS, type TextScaleStop } from "../../../app/settings.ts";
import type { ThemeMode } from "../../../app/theme.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import { renderEnterpriseLanguagePicker } from "../../../i18n/enterprise-language-picker.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  ADMIN_APPEARANCE_EVENT,
  loadAdminAppearance,
  resetAdminAppearance,
  saveAdminAppearance,
  type AdminAppearance,
} from "../admin-appearance.ts";

const THEMES = [
  { id: "claw" as const, label: "MAAP", description: "Giao diện MAAP nguyên bản" },
  { id: "knot" as const, label: "Knot", description: "Tông màu OpenKnot dịu hơn" },
  { id: "dash" as const, label: "Dash", description: "Tương phản cao cho dashboard" },
] as const;

const ACCENTS = [
  { label: "Mặc định", value: undefined },
  { label: "MAAP", value: "#ff5c5c" },
  { label: "Amber", value: "#f5b942" },
  { label: "Mint", value: "#52c99a" },
  { label: "Blue", value: "#5b9cf6" },
  { label: "Violet", value: "#a78bfa" },
  { label: "Pink", value: "#f472b6" },
] as const;

export class EnterpriseAdminConfigAppearancePage extends OpenClawLightDomElement {
  @state() private settings = loadAdminAppearance();

  override connectedCallback(): void {
    super.connectedCallback();
    globalThis.addEventListener(ADMIN_APPEARANCE_EVENT, this.onAppearanceChange);
  }

  override disconnectedCallback(): void {
    globalThis.removeEventListener(ADMIN_APPEARANCE_EVENT, this.onAppearanceChange);
    super.disconnectedCallback();
  }

  private readonly onAppearanceChange = (event: Event) => {
    const detail = (event as CustomEvent<AdminAppearance>).detail;
    if (detail) {
      this.settings = detail;
    }
  };

  private saveSettings(patch: Partial<AdminAppearance>): void {
    this.settings = saveAdminAppearance({ ...this.settings, ...patch });
  }

  override render() {
    return html`<section class="ea-page">
      <header class="ea-page-header">
        <div>
          <h1>${ea("UI & Appearance")}</h1>
          <p>${ea("Tuỳ chỉnh riêng cho portal Admin trên trình duyệt này.")}</p>
        </div>
        <button
          class="ea-button"
          type="button"
          @click=${() => (this.settings = resetAdminAppearance())}
        >
          ${ea("Khôi phục mặc định")}
        </button>
        ${renderEnterpriseLanguagePicker("ea-input")}
      </header>
      <div class="ea-banner">
        ${ea(
          "Các lựa chọn dưới đây áp dụng tức thời trong Admin; màu sắc và cỡ chữ chỉ áp dụng riêng cho portal Admin, còn ngôn ngữ dùng chung trong trình duyệt.",
        )}
      </div>
      <div class="ea-appearance-sections">
        <section class="ea-card ea-appearance-section">
          <h2>${ea("Theme")}</h2>
          <p class="ea-muted">${ea("Chọn bảng màu nền cho portal quản trị.")}</p>
          <div class="ea-theme-grid">
            ${THEMES.map(
              (theme) => html`<button
                class="ea-theme-card ${this.settings.theme === theme.id ? "is-active" : ""}"
                type="button"
                aria-pressed=${this.settings.theme === theme.id ? "true" : "false"}
                @click=${() => this.saveSettings({ theme: theme.id })}
              >
                <span class="ea-theme-preview ea-theme-preview--${theme.id}">
                  <i></i><i></i><i></i>
                </span>
                <strong>${theme.label}</strong>
                <small>${ea(theme.description)}</small>
              </button>`,
            )}
          </div>
        </section>
        <section class="ea-card ea-appearance-section">
          <h2>${ea("Color mode")}</h2>
          <p class="ea-muted">${ea("Theo hệ thống hoặc cố định sáng/tối.")}</p>
          <div class="ea-segmented" role="group" aria-label=${ea("Color mode")}>
            ${(["system", "light", "dark"] as ThemeMode[]).map(
              (mode) => html`<button
                class=${this.settings.mode === mode ? "is-active" : ""}
                type="button"
                aria-pressed=${this.settings.mode === mode ? "true" : "false"}
                @click=${() => this.saveSettings({ mode })}
              >
                ${mode === "system" ? ea("System") : mode === "light" ? ea("Light") : ea("Dark")}
              </button>`,
            )}
          </div>
        </section>
        <section class="ea-card ea-appearance-section">
          <h2>${ea("Accent")}</h2>
          <p class="ea-muted">${ea("Màu nhấn cho nút, focus và trạng thái active.")}</p>
          <div class="ea-accent-grid">
            ${ACCENTS.map(
              (accent) => html`<button
                class="ea-accent ${this.settings.accent === accent.value ||
                (!this.settings.accent && accent.value === undefined)
                  ? "is-active"
                  : ""}"
                type="button"
                title=${ea(accent.label)}
                aria-label=${ea(accent.label)}
                aria-pressed=${this.settings.accent === accent.value ||
                (!this.settings.accent && accent.value === undefined)
                  ? "true"
                  : "false"}
                style=${accent.value ? `--ea-swatch: ${accent.value}` : ""}
                @click=${() => this.saveSettings({ accent: accent.value })}
              ></button>`,
            )}
            <label class="ea-custom-accent">
              <span>${ea("Tùy chọn")}</span>
              <input
                type="color"
                .value=${this.settings.accent ?? "#ff5c5c"}
                @input=${(event: Event) =>
                  this.saveSettings({ accent: (event.currentTarget as HTMLInputElement).value })}
              />
            </label>
          </div>
        </section>
        <section class="ea-card ea-appearance-section">
          <h2>${ea("Text scale")}</h2>
          <p class="ea-muted">${ea("Điều chỉnh kích thước chữ trong portal Admin.")}</p>
          <div class="ea-text-scale-options">
            ${TEXT_SCALE_STOPS.map(
              (stop) => html`<button
                class="ea-text-scale ${this.settings.textScale === stop ? "is-active" : ""}"
                type="button"
                aria-pressed=${this.settings.textScale === stop ? "true" : "false"}
                @click=${() => this.saveSettings({ textScale: stop as TextScaleStop })}
              >
                <span style=${`font-size:${stop / 100}em`}>Aa</span><small>${stop}%</small>
              </button>`,
            )}
          </div>
        </section>
      </div>
    </section>`;
  }
}

if (!customElements.get("openclaw-enterprise-admin-config-appearance-page")) {
  customElements.define(
    "openclaw-enterprise-admin-config-appearance-page",
    EnterpriseAdminConfigAppearancePage,
  );
}
