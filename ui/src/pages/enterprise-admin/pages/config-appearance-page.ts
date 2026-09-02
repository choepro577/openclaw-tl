import { html } from "lit";
import { state } from "lit/decorators.js";
import { TEXT_SCALE_STOPS, type TextScaleStop } from "../../../app/settings.ts";
import type { ThemeMode } from "../../../app/theme.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  ADMIN_APPEARANCE_EVENT,
  loadAdminAppearance,
  resetAdminAppearance,
  saveAdminAppearance,
  type AdminAppearance,
} from "../admin-appearance.ts";

const THEMES = [
  { id: "claw" as const, label: "Claw", description: "Giao diện OpenClaw nguyên bản" },
  { id: "knot" as const, label: "Knot", description: "Tông màu OpenKnot dịu hơn" },
  { id: "dash" as const, label: "Dash", description: "Tương phản cao cho dashboard" },
];

const ACCENTS = [
  { label: "Mặc định", value: undefined },
  { label: "Claw", value: "#ff5c5c" },
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
          <h1>UI & Appearance</h1>
          <p>Tuỳ chỉnh riêng cho portal Admin trên trình duyệt này.</p>
        </div>
        <button
          class="ea-button"
          type="button"
          @click=${() => (this.settings = resetAdminAppearance())}
        >
          Khôi phục mặc định
        </button>
      </header>
      <div class="ea-banner">
        Các lựa chọn dưới đây áp dụng tức thời trong Admin và không thay đổi giao diện
        <code>/app</code>.
      </div>
      <div class="ea-appearance-sections">
        <section class="ea-card ea-appearance-section">
          <h2>Theme</h2>
          <p class="ea-muted">Chọn bảng màu nền cho portal quản trị.</p>
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
                <small>${theme.description}</small>
              </button>`,
            )}
          </div>
        </section>
        <section class="ea-card ea-appearance-section">
          <h2>Color mode</h2>
          <p class="ea-muted">Theo hệ thống hoặc cố định sáng/tối.</p>
          <div class="ea-segmented" role="group" aria-label="Color mode">
            ${(["system", "light", "dark"] as ThemeMode[]).map(
              (mode) => html`<button
                class=${this.settings.mode === mode ? "is-active" : ""}
                type="button"
                aria-pressed=${this.settings.mode === mode ? "true" : "false"}
                @click=${() => this.saveSettings({ mode })}
              >
                ${mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"}
              </button>`,
            )}
          </div>
        </section>
        <section class="ea-card ea-appearance-section">
          <h2>Accent</h2>
          <p class="ea-muted">Màu nhấn cho nút, focus và trạng thái active.</p>
          <div class="ea-accent-grid">
            ${ACCENTS.map(
              (accent) => html`<button
                class="ea-accent ${this.settings.accent === accent.value ||
                (!this.settings.accent && accent.value === undefined)
                  ? "is-active"
                  : ""}"
                type="button"
                title=${accent.label}
                aria-label=${accent.label}
                aria-pressed=${this.settings.accent === accent.value ||
                (!this.settings.accent && accent.value === undefined)
                  ? "true"
                  : "false"}
                style=${accent.value ? `--ea-swatch: ${accent.value}` : ""}
                @click=${() => this.saveSettings({ accent: accent.value })}
              ></button>`,
            )}
            <label class="ea-custom-accent">
              <span>Tùy chọn</span>
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
          <h2>Text scale</h2>
          <p class="ea-muted">Điều chỉnh kích thước chữ trong portal Admin.</p>
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
