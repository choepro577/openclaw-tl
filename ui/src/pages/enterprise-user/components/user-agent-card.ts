import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomContentsElement } from "../../../lit/openclaw-element.ts";
import type { EnterpriseUserAgent } from "../contracts/user-agent.ts";
import { presentUserAgentAvatar } from "../services/user-agent-presenter.ts";

export class UserAgentCard extends OpenClawLightDomContentsElement {
  @property({ attribute: false }) agent?: EnterpriseUserAgent;
  @property({ attribute: false }) busy = false;
  @property({ attribute: false }) onStart?: (agent: EnterpriseUserAgent) => void;
  @property({ attribute: false }) onEdit?: (agent: EnterpriseUserAgent) => void;
  @property({ attribute: false }) onDetail?: (agent: EnterpriseUserAgent) => void;

  override render() {
    const agent = this.agent;
    if (!agent) {
      return nothing;
    }
    return html`<article class="card eu-agent-card">
      <div class="eu-agent-card__identity">
        <span class="eu-agent-card__avatar" aria-hidden="true"
          >${presentUserAgentAvatar(agent)}</span
        >
        <div>
          <div class="eu-agent-card__kind">
            ${agent.kind === "personal" ? eu("personalAgent") : eu("enterpriseAgent")}
          </div>
          <h2>${agent.name}</h2>
          ${agent.kind === "shared" && agent.name !== agent.canonicalName
            ? html`<p>${eu("sharedCanonicalName")}: ${agent.canonicalName}</p>`
            : nothing}
          ${agent.description ? html`<p>${agent.description}</p>` : nothing}
        </div>
      </div>
      ${agent.capabilityLabels.length > 0
        ? html`<ul class="eu-capability-list" aria-label=${eu("available")}>
            ${agent.capabilityLabels.map((label) => html`<li>${label}</li>`)}
          </ul>`
        : nothing}
      ${agent.kind === "shared"
        ? html`<p class="eu-managed">${eu("managedByCompany")}</p>`
        : nothing}
      <div class="eu-actions">
        <button
          type="button"
          class="btn primary"
          ?disabled=${this.busy || !agent.actions.canChat}
          @click=${() => this.onStart?.(agent)}
        >
          ${agent.actions.canChat ? eu("startChat") : eu("notAvailable")}
        </button>
        ${agent.actions.canEdit
          ? html`<button type="button" class="btn" @click=${() => this.onEdit?.(agent)}>
              ${eu("edit")}
            </button>`
          : nothing}
        ${agent.kind === "shared"
          ? html`<button type="button" class="btn" @click=${() => this.onDetail?.(agent)}>
              ${eu("viewCapabilities")}
            </button>`
          : nothing}
      </div>
    </article>`;
  }
}

if (!customElements.get("openclaw-user-agent-card")) {
  customElements.define("openclaw-user-agent-card", UserAgentCard);
}
