import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomContentsElement } from "../../../lit/openclaw-element.ts";
import {
  canRequestUserAgentAccess,
  hasUserAgentAccess,
  type EnterpriseUserAgent,
} from "../contracts/user-agent.ts";
import {
  presentUserAgentAccessStatus,
  presentUserAgentAvatar,
} from "../services/user-agent-presenter.ts";

export class UserAgentCard extends OpenClawLightDomContentsElement {
  @property({ attribute: false }) agent?: EnterpriseUserAgent;
  @property({ attribute: false }) busy = false;
  @property({ attribute: false }) onStart?: (agent: EnterpriseUserAgent) => void;
  @property({ attribute: false }) onRequestAccess?: (agent: EnterpriseUserAgent) => void;
  @property({ attribute: false }) onCancelAccess?: (agent: EnterpriseUserAgent) => void;
  @property({ attribute: false }) onEdit?: (agent: EnterpriseUserAgent) => void;
  @property({ attribute: false }) onDetail?: (agent: EnterpriseUserAgent) => void;

  override render() {
    const agent = this.agent;
    if (!agent) {
      return nothing;
    }
    const request = agent.access?.request;
    const canRequest = canRequestUserAgentAccess(agent);
    const pending = request?.state === "pending";
    const hasAccess = hasUserAgentAccess(agent);
    const displayName = agent.kind === "shared" && !hasAccess ? agent.canonicalName : agent.name;
    const statusCopy = !hasAccess ? presentUserAgentAccessStatus(agent) : null;
    return html`<article class="card eu-agent-card">
      <div class="eu-agent-card__identity">
        <span class="eu-agent-card__avatar" aria-hidden="true"
          >${presentUserAgentAvatar(agent)}</span
        >
        <div class="eu-agent-card__copy">
          <div class="eu-agent-card__kind">
            ${agent.kind === "personal" ? eu("personalAgent") : eu("enterpriseAgent")}
          </div>
          <h2>${displayName}</h2>
          ${agent.kind === "shared" && hasAccess && agent.name !== agent.canonicalName
            ? html`<p class="eu-agent-card__canonical">
                ${eu("sharedCanonicalName")}: ${agent.canonicalName}
              </p>`
            : nothing}
        </div>
      </div>
      ${agent.description || agent.kind === "shared"
        ? html`<p class="eu-agent-card__description">
            ${agent.description || eu("managedByCompany")}
          </p>`
        : nothing}
      ${agent.capabilityLabels.length > 0
        ? html`<ul class="eu-capability-list" aria-label=${eu("available")}>
            ${agent.capabilityLabels.map((label) => html`<li>${label}</li>`)}
          </ul>`
        : nothing}
      <div class="eu-agent-card__footer">
        <div class="eu-agent-card__status" role="status">
          <span
            class="eu-agent-card__badge ${agent.actions.canChat
              ? "eu-agent-card__badge--ready"
              : ""}"
          >
            ${agent.actions.canChat ? eu("agentReadyToChat") : (statusCopy ?? eu("notAvailable"))}
          </span>
          ${!agent.actions.canChat && request?.decisionReason
            ? html`<p class="eu-agent-card__decision">${request.decisionReason}</p>`
            : nothing}
        </div>
        <div class="eu-actions eu-agent-card__actions">
          <button
            type="button"
            class="btn primary"
            ?disabled=${this.busy || (!agent.actions.canChat && !canRequest)}
            @click=${() =>
              agent.actions.canChat ? this.onStart?.(agent) : this.onRequestAccess?.(agent)}
          >
            ${this.busy
              ? agent.actions.canChat
                ? eu("agentOpenBusy")
                : eu("agentAccessRequestBusy")
              : agent.actions.canChat
                ? eu("startChat")
                : request?.state === "rejected"
                  ? eu("agentAccessResubmit")
                  : canRequest
                    ? eu("requestAgentAccess")
                    : (statusCopy ?? eu("notAvailable"))}
          </button>
          ${pending
            ? html`<button
                type="button"
                class="btn"
                ?disabled=${this.busy}
                @click=${() => this.onCancelAccess?.(agent)}
              >
                ${eu("cancelAgentAccessRequest")}
              </button>`
            : nothing}
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
      </div>
    </article>`;
  }
}

if (!customElements.get("openclaw-user-agent-card")) {
  customElements.define("openclaw-user-agent-card", UserAgentCard);
}
