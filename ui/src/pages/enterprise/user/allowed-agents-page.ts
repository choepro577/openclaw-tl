import { html } from "lit";
import { property } from "lit/decorators.js";
import { inferBasePathFromPathname } from "../../../app-route-paths.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { enterpriseCopy } from "../enterprise-copy.ts";
import type { EnterpriseEffectivePolicy } from "../services/enterprise-api.ts";

export class EnterpriseAllowedAgentsPage extends OpenClawLightDomElement {
  @property({ attribute: false }) policy?: EnterpriseEffectivePolicy;

  override render() {
    const grants = (this.policy?.entitlements ?? []).filter(
      (item) => item.resourceType === "agent" && item.effect === "allow",
    );
    const denies = new Set(
      (this.policy?.entitlements ?? [])
        .filter((item) => item.resourceType === "agent" && item.effect === "deny")
        .map((item) => item.resourceId),
    );
    const allowed = grants.filter((item) => !denies.has(item.resourceId));
    const basePath = inferBasePathFromPathname(globalThis.location?.pathname ?? "/");
    return html`
      <section class="enterprise-panel enterprise-stack">
        <div>
          <h2>${enterpriseCopy("agentListTitle")}</h2>
          <p class="enterprise-muted">${enterpriseCopy("agentListDescription")}</p>
        </div>
        ${this.policy?.role === "administrator"
          ? html`<p>${enterpriseCopy("administratorAllAgents")}</p>`
          : allowed.length === 0
            ? html`<p class="enterprise-muted">${enterpriseCopy("noAssignedAgents")}</p>`
            : html`
                <div class="enterprise-grid">
                  ${allowed.map(
                    (item) => html`
                      <article class="enterprise-list-item enterprise-stack">
                        <strong class="enterprise-code">${item.resourceId}</strong>
                        <a
                          class="enterprise-button"
                          href=${`${basePath}/new?agent=${encodeURIComponent(item.resourceId)}`}
                        >
                          ${enterpriseCopy("newSession")}
                        </a>
                      </article>
                    `,
                  )}
                </div>
              `}
      </section>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-allowed-agents-page")) {
  customElements.define("openclaw-enterprise-allowed-agents-page", EnterpriseAllowedAgentsPage);
}
