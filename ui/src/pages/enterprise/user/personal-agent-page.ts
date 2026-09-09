import { html } from "lit";
import { property } from "lit/decorators.js";
import { inferBasePathFromPathname } from "../../../app-route-paths.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { enterpriseCopy } from "../enterprise-copy.ts";
import type { EnterpriseAccount, EnterpriseEffectivePolicy } from "../services/enterprise-api.ts";

export class EnterprisePersonalAgentPage extends OpenClawLightDomElement {
  @property({ attribute: false }) account?: EnterpriseAccount;
  @property({ attribute: false }) policy?: EnterpriseEffectivePolicy;

  override render() {
    const agentId = this.policy?.defaultAgentId ?? this.account?.defaultAgentId;
    const enabled = this.policy?.personalAgentEnabled ?? this.account?.personalAgentEnabled;
    const basePath = inferBasePathFromPathname(globalThis.location?.pathname ?? "/");
    return html`
      <section class="enterprise-panel enterprise-stack">
        <div>
          <h2>${eu("personalAgent")}</h2>
          <p class="enterprise-muted">
            ${enterpriseCopy("personalAgentDescription", {
              username: this.account?.username ?? "",
            })}
          </p>
        </div>
        ${enabled
          ? html`
              <p>
                ${enterpriseCopy("defaultAgentValue")}<strong class="enterprise-code"
                  >${agentId ?? "main"}</strong
                >
              </p>
              <a
                class="enterprise-button"
                href=${`${basePath}/new?agent=${encodeURIComponent(agentId ?? "main")}`}
              >
                ${enterpriseCopy("startPersonalAgent")}
              </a>
            `
          : html`<p class="enterprise-error">${enterpriseCopy("personalAgentDisabled")}</p>`}
      </section>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-personal-agent-page")) {
  customElements.define("openclaw-enterprise-personal-agent-page", EnterprisePersonalAgentPage);
}
