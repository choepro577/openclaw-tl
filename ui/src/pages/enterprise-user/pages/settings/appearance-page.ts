import { consume } from "@lit/context";
import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import type { RouteId } from "../../../../app-route-paths.ts";
import { applicationContext, type ApplicationContext } from "../../../../app/context.ts";
import {
  loadSettings,
  patchSettings,
  TEXT_SCALE_STOPS,
  UI_APPEARANCE_DEFAULTS,
  type TextScaleStop,
} from "../../../../app/settings.ts";
import { startThemeTransition } from "../../../../app/theme-transition.ts";
import { resolveTheme, type ThemeMode, type ThemeName } from "../../../../app/theme.ts";
import { icons } from "../../../../components/icons.ts";
import {
  renderSettingsDefaultDescription,
  renderSettingsPage,
  renderSettingsRow,
  renderSettingsSection,
  renderSettingsSegmented,
} from "../../../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../../../components/settings-workspace.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { i18n, SUPPORTED_LOCALES, t, type Locale } from "../../../../i18n/index.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import "../../../../styles/appearance-controls.css";

const LOCALE_LABELS: Partial<Record<Locale, string>> = {
  en: "English",
  vi: "Tiếng Việt",
};

const THEME_OPTIONS: Array<{
  id: Exclude<ThemeName, "custom">;
  labelKey: string;
  descriptionKey: string;
}> = [
  {
    id: "claw",
    labelKey: "configView.themes.claw.label",
    descriptionKey: "configView.themes.claw.description",
  },
  {
    id: "knot",
    labelKey: "configView.themes.knot.label",
    descriptionKey: "configView.themes.knot.description",
  },
  {
    id: "dash",
    labelKey: "configView.themes.dash.label",
    descriptionKey: "configView.themes.dash.description",
  },
];

const ACCENT_PRESETS = [
  { id: "default", hex: undefined, labelKey: "configView.appearance.accents.default" },
  { id: "claw", hex: "#ff5c5c", labelKey: "configView.appearance.accents.claw" },
  { id: "coral", hex: "#ff8066", labelKey: "configView.appearance.accents.coral" },
  { id: "amber", hex: "#f5b942", labelKey: "configView.appearance.accents.amber" },
  { id: "mint", hex: "#52c99a", labelKey: "configView.appearance.accents.mint" },
  { id: "teal", hex: "#35b9b0", labelKey: "configView.appearance.accents.teal" },
  { id: "blue", hex: "#5b9cf6", labelKey: "configView.appearance.accents.blue" },
  { id: "violet", hex: "#a78bfa", labelKey: "configView.appearance.accents.violet" },
  { id: "pink", hex: "#f472b6", labelKey: "configView.appearance.accents.pink" },
  { id: "slate", hex: "#8795a8", labelKey: "configView.appearance.accents.slate" },
] as const;

const TEXT_SCALE_LABELS: Record<TextScaleStop, string> = {
  90: "configView.textSizes.small",
  100: "configView.textSizes.default",
  110: "configView.textSizes.large",
  125: "configView.textSizes.xl",
  140: "configView.textSizes.xxl",
};

function renderThemePalette() {
  return html`<span class="settings-theme-card__palette" aria-hidden="true">
    <span class="settings-theme-card__chip settings-theme-card__chip--accent"></span>
    <span class="settings-theme-card__chip settings-theme-card__chip--accent-2"></span>
    <span class="settings-theme-card__chip settings-theme-card__chip--bg"></span>
  </span>`;
}

export class UserAppearancePage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: false })
  private context!: ApplicationContext<RouteId>;
  @state() private theme: ThemeName = loadSettings().theme;
  @state() private mode: ThemeMode = loadSettings().themeMode;
  @state() private accent: string | undefined = loadSettings().accent;
  @state() private textScale: TextScaleStop = loadSettings().textScale ?? 100;
  @state() private locale: Locale = i18n.getLocale();
  private unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = this.context.theme.subscribe(() => this.syncAppearance());
    this.syncAppearance();
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super.disconnectedCallback();
  }

  private syncAppearance(): void {
    const settings = loadSettings();
    this.theme = settings.theme;
    this.mode = settings.themeMode;
    this.accent = settings.accent;
    this.textScale = settings.textScale ?? UI_APPEARANCE_DEFAULTS.textScale;
    this.requestUpdate();
  }

  private setTheme(theme: Exclude<ThemeName, "custom">, target: HTMLElement): void {
    const settings = loadSettings();
    startThemeTransition({
      currentTheme: resolveTheme(settings.theme, settings.themeMode),
      nextTheme: resolveTheme(theme, settings.themeMode),
      context: { element: target },
      applyTheme: () => {
        this.theme = theme;
        patchSettings({ theme });
        this.context.theme.refresh();
      },
    });
  }

  private setMode(mode: ThemeMode, target: HTMLElement): void {
    this.mode = mode;
    this.context.theme.setMode(mode, target);
  }

  private setAccent(accent: string | undefined): void {
    this.accent = accent;
    patchSettings({ accent });
    this.context.theme.refresh();
  }

  private setTextScale(textScale: TextScaleStop): void {
    this.textScale = textScale;
    patchSettings({
      textScale: textScale === UI_APPEARANCE_DEFAULTS.textScale ? undefined : textScale,
    });
    this.context.theme.refresh();
  }

  private async setLocale(locale: Locale): Promise<void> {
    this.locale = locale;
    patchSettings({ locale });
    await i18n.setLocale(locale);
  }

  override render() {
    const customAccentSelected = Boolean(
      this.accent && !ACCENT_PRESETS.some((preset) => preset.hex === this.accent),
    );
    const content = renderSettingsPage(html`
      <header class="eu-page-header">
        <div>
          <h1>${eu("appearance")}</h1>
          <p>${eu("appearanceDescription")}</p>
        </div>
      </header>
      ${renderSettingsSection(
        { title: eu("language") },
        renderSettingsRow({
          title: eu("displayLanguage"),
          control: html`<select
            class="settings-select"
            .value=${this.locale}
            @change=${(event: Event) =>
              void this.setLocale((event.currentTarget as HTMLSelectElement).value as Locale)}
          >
            ${SUPPORTED_LOCALES.map(
              (locale) => html`<option value=${locale}>${LOCALE_LABELS[locale] ?? locale}</option>`,
            )}
          </select>`,
        }),
      )}
      <section class="settings-section">
        <div class="settings-section__header">
          <h2 class="settings-section__heading">${t("configView.appearance.theme")}</h2>
        </div>
        <p class="settings-section__desc">${t("configView.appearance.chooseTheme")}</p>
        <div class="settings-group">
          <div class="settings-row settings-row--stacked">
            <div class="settings-theme-grid">
              ${THEME_OPTIONS.map((option) => {
                const selected = option.id === this.theme;
                return html`<button
                  type="button"
                  class="settings-theme-card settings-theme-card--${option.id} ${selected
                    ? "settings-theme-card--active"
                    : ""}"
                  title=${t(option.descriptionKey)}
                  aria-pressed=${String(selected)}
                  @click=${(event: Event) =>
                    this.setTheme(option.id, event.currentTarget as HTMLElement)}
                >
                  ${renderThemePalette()}
                  <span class="settings-theme-card__label">${t(option.labelKey)}</span>
                  ${selected
                    ? html`<span class="settings-theme-card__check" aria-hidden="true"
                        >${icons.check}</span
                      >`
                    : nothing}
                </button>`;
              })}
            </div>
          </div>
          ${renderSettingsRow({
            title: eu("colorMode"),
            description: eu("themeDescription"),
            stacked: true,
            control: renderSettingsSegmented({
              value: this.mode,
              options: [
                { value: "system", label: eu("themeSystem") },
                { value: "light", label: eu("light") },
                { value: "dark", label: eu("themeDark") },
              ],
              ariaLabel: eu("themeMode"),
              onChange: (mode, element) => this.setMode(mode, element),
            }),
          })}
        </div>
      </section>
      <section class="settings-section">
        <div class="settings-section__header">
          <h2 class="settings-section__heading">${t("configView.appearance.accent")}</h2>
        </div>
        <p class="settings-section__desc">${t("configView.appearance.accentHint")}</p>
        <div class="settings-group">
          <div class="settings-row settings-row--stacked">
            <div class="settings-accent-swatches">
              ${ACCENT_PRESETS.map((preset) => {
                const selected = preset.hex === this.accent;
                const label = t(preset.labelKey);
                const themeClass = preset.hex ? "" : ` settings-accent-theme--${this.theme}`;
                return html`<button
                  type="button"
                  class="settings-accent-swatch${themeClass} ${selected
                    ? "settings-accent-swatch--active"
                    : ""}"
                  style=${styleMap({
                    "--settings-accent-swatch":
                      preset.hex ?? "var(--theme-chip-accent, var(--accent))",
                  })}
                  data-accent-preset=${preset.id}
                  aria-label=${label}
                  aria-pressed=${String(selected)}
                  title=${label}
                  @click=${() => this.setAccent(preset.hex)}
                >
                  ${selected
                    ? html`<span class="settings-accent-swatch__check" aria-hidden="true"
                        >${icons.check}</span
                      >`
                    : nothing}
                </button>`;
              })}
              <input
                type="color"
                class="settings-accent-swatch settings-accent-swatch--custom ${customAccentSelected
                  ? "settings-accent-swatch--active"
                  : ""}"
                aria-label=${t("configView.appearance.customAccent")}
                title=${t("configView.appearance.customAccent")}
                .value=${this.accent ?? ACCENT_PRESETS[1].hex}
                @input=${(event: Event & { currentTarget: HTMLInputElement }) =>
                  this.setAccent(event.currentTarget.value)}
              />
            </div>
          </div>
        </div>
      </section>
      <section class="settings-section">
        <div class="settings-section__header">
          <h2 class="settings-section__heading">${t("configView.appearance.textSize")}</h2>
        </div>
        <p class="settings-section__desc">
          ${renderSettingsDefaultDescription(
            `${UI_APPEARANCE_DEFAULTS.textScale}%`,
            this.textScale !== UI_APPEARANCE_DEFAULTS.textScale,
          )}
          ${eu("textScaleDescription")}
        </p>
        <div class="settings-group">
          <div class="settings-row settings-row--stacked">
            <div class="settings-text-scale">
              <div class="settings-text-scale__options">
                ${TEXT_SCALE_STOPS.map(
                  (scale) => html`<button
                    type="button"
                    class="settings-text-scale__btn ${this.textScale === scale ? "active" : ""}"
                    aria-pressed=${String(this.textScale === scale)}
                    @click=${() => this.setTextScale(scale)}
                  >
                    <span class="settings-text-scale__sample">${t(TEXT_SCALE_LABELS[scale])}</span>
                    <span class="settings-text-scale__label">${scale}%</span>
                  </button>`,
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    `);
    return renderSettingsWorkspace(content);
  }
}

if (!customElements.get("openclaw-user-appearance-page")) {
  customElements.define("openclaw-user-appearance-page", UserAppearancePage);
}
