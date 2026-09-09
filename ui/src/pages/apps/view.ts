import { html, nothing } from "lit";
import type { RouteId } from "../../app-route-paths.ts";
import { t } from "../../i18n/index.ts";
import "../../styles/apps.css";

type AppsProps = {
  onNavigate: (routeId: RouteId) => void;
  onPairDevice?: () => void;
};

/** Retain local app actions without advertising upstream companion products. */
export function renderApps(props: AppsProps) {
  return html`
    <div class="apps-page">
      <header class="apps-hero">
        <h1 class="apps-hero__title">${t("tabs.apps")}</h1>
      </header>
      <div class="apps-grid">
        <section class="apps-card">
          <div class="apps-card__body">
            <h2>${t("appsPage.cards.plugins.title")}</h2>
            <p>${t("appsPage.cards.plugins.desc")}</p>
            <button
              type="button"
              class="apps-card__cta apps-card__cta--primary"
              @click=${() => props.onNavigate("plugins")}
            >
              ${t("appsPage.ctaOpenPlugins")}
            </button>
          </div>
        </section>
        ${props.onPairDevice
          ? html`<section class="apps-card">
              <div class="apps-card__body">
                <h2>${t("appsPage.pairDevice")}</h2>
                <button type="button" class="apps-card__cta" @click=${props.onPairDevice}>
                  ${t("appsPage.pairDevice")}
                </button>
              </div>
            </section>`
          : nothing}
      </div>
    </div>
  `;
}
