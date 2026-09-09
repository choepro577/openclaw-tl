import { consume } from "@lit/context";
import { html, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { RouteId } from "../../../../app-route-paths.ts";
import { applicationContext, type ApplicationContext } from "../../../../app/context.ts";
import {
  renderSettingsPage,
  renderSettingsRow,
  renderSettingsSection,
} from "../../../../components/settings-ui.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import { openUserAgentConversation } from "../../adapters/chat-route-adapter.ts";
import type {
  EnterpriseUserAgentAccessRequest,
  EnterpriseUserAgent,
  SharedAgentRelationshipProfile,
} from "../../contracts/user-agent.ts";
import { canRequestUserAgentAccess, hasUserAgentAccess } from "../../contracts/user-agent.ts";
import { presentUserAgentAccessStatus } from "../../services/user-agent-presenter.ts";
import {
  cancelEnterpriseUserAgentAccessRequest,
  loadSharedAgentRelationship,
  requestEnterpriseUserAgentAccess,
  saveSharedAgentRelationship,
} from "../../services/user-enterprise-api.ts";
import { userBootstrapStore } from "../../state/user-bootstrap-store.ts";
import "../../styles/personal-agent.css";

export class UserSharedAgentDetailPage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: false })
  private context!: ApplicationContext<RouteId>;
  @property({ attribute: false }) agent?: EnterpriseUserAgent;
  @state() private busy = false;
  @state() private error = "";
  @state() private relationship?: SharedAgentRelationshipProfile;
  @state() private relationshipSource?: SharedAgentRelationshipProfile;
  @state() private relationshipBusy = false;
  @state() private accessRequest: EnterpriseUserAgentAccessRequest | null = null;
  @state() private accessRequestBusy = false;
  private relationshipEpoch = 0;

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("agent")) {
      const previousAgent = changed.get("agent") as EnterpriseUserAgent | undefined;
      const agent = this.agent;
      const canRetainAuthorizedDraft = Boolean(
        previousAgent &&
        agent &&
        previousAgent.key === agent.key &&
        this.canLoadRelationship(previousAgent) &&
        this.canLoadRelationship(agent),
      );
      this.accessRequest = agent?.access?.request ?? null;
      this.error = "";
      if (canRetainAuthorizedDraft) {
        if (!this.relationship && !this.relationshipBusy) {
          void this.loadRelationship();
        }
        return;
      }
      ++this.relationshipEpoch;
      this.relationship = undefined;
      this.relationshipSource = undefined;
      this.relationshipBusy = false;
      this.accessRequestBusy = false;
      void this.loadRelationship();
    }
  }

  private canLoadRelationship(agent = this.agent): boolean {
    return Boolean(
      agent && agent.kind === "shared" && agent.actions.canChat && hasUserAgentAccess(agent),
    );
  }

  private async loadRelationship(): Promise<void> {
    const agent = this.agent;
    if (!agent || !this.canLoadRelationship(agent)) {
      return;
    }
    const epoch = ++this.relationshipEpoch;
    this.relationshipBusy = true;
    this.error = "";
    try {
      const profile = await loadSharedAgentRelationship(agent.key);
      if (epoch === this.relationshipEpoch) {
        this.relationship = profile;
        this.relationshipSource = profile;
      }
    } catch (error) {
      if (epoch === this.relationshipEpoch) {
        this.error = error instanceof Error ? error.message : eu("sharedRelationshipLoadFailed");
      }
    } finally {
      if (epoch === this.relationshipEpoch) {
        this.relationshipBusy = false;
      }
    }
  }

  private updateRelationship(
    patch: Partial<Omit<SharedAgentRelationshipProfile, "revision" | "updatedAt">>,
  ): void {
    if (this.relationship) {
      this.relationship = { ...this.relationship, ...patch };
    }
  }

  private relationshipDirty(): boolean {
    const draft = this.relationship;
    const source = this.relationshipSource;
    return Boolean(
      draft &&
      source &&
      (draft.agentAlias !== source.agentAlias ||
        draft.agentSelfReference !== source.agentSelfReference ||
        draft.userAddress !== source.userAddress ||
        draft.customInstructions !== source.customInstructions),
    );
  }

  private async saveRelationship(): Promise<void> {
    const agent = this.agent;
    const profile = this.relationship;
    if (!agent || !profile || this.relationshipBusy || !this.relationshipDirty()) {
      return;
    }
    this.relationshipBusy = true;
    this.error = "";
    try {
      const saved = await saveSharedAgentRelationship(agent.key, profile);
      this.relationship = saved;
      this.relationshipSource = saved;
      await userBootstrapStore.load(true);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("sharedRelationshipSaveFailed");
    } finally {
      this.relationshipBusy = false;
    }
  }

  private async start(): Promise<void> {
    if (!this.agent || !this.agent.actions.canChat || this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await openUserAgentConversation(this.context, this.agent.key, "resume-latest");
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("agentOpenFailed");
    } finally {
      this.busy = false;
    }
  }

  private async requestAccess(): Promise<void> {
    const agent = this.agent;
    if (!agent || !canRequestUserAgentAccess(agent) || this.accessRequestBusy) {
      return;
    }
    this.accessRequestBusy = true;
    this.error = "";
    try {
      const request = await requestEnterpriseUserAgentAccess(agent.key);
      this.accessRequest = request;
      userBootstrapStore.applyAgentAccessRequest(request);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("agentAccessRequestFailed");
    } finally {
      this.accessRequestBusy = false;
    }
  }

  private async cancelAccess(): Promise<void> {
    const agent = this.agent;
    const request = this.accessRequest ?? agent?.access?.request;
    if (!agent || !request || request.state !== "pending" || this.accessRequestBusy) {
      return;
    }
    this.accessRequestBusy = true;
    this.error = "";
    try {
      const cancelled = await cancelEnterpriseUserAgentAccessRequest(request);
      this.accessRequest = cancelled;
      userBootstrapStore.applyAgentAccessRequest(cancelled);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("agentAccessCancelFailed");
    } finally {
      this.accessRequestBusy = false;
    }
  }

  private backToLibrary(): void {
    this.context.navigate("enterprise");
    this.dispatchEvent(
      new CustomEvent("shared-agent-detail-close", { bubbles: true, composed: true }),
    );
  }

  override render() {
    const agent = this.agent;
    if (!agent) {
      return nothing;
    }
    const canLoadRelationship = this.canLoadRelationship(agent);
    const relationship = canLoadRelationship
      ? (this.relationship ?? agent.relationship ?? undefined)
      : undefined;
    const request = this.accessRequest ?? agent.access?.request ?? null;
    const canRequest = canRequestUserAgentAccess(agent);
    const effectiveName = relationship?.agentAlias || agent.canonicalName;
    return renderSettingsPage(
      html`
        <header class="eu-page-header">
          <div>
            <p class="eu-agent-card__kind">${eu("enterpriseAgent")} · ${eu("managedByCompany")}</p>
            <h1>${effectiveName}</h1>
            <p>${agent.description ?? eu("sharedAgentDescription")}</p>
          </div>
          ${agent.actions.canChat
            ? html`<button
                class="btn primary"
                type="button"
                ?disabled=${this.busy}
                @click=${() => void this.start()}
              >
                ${this.busy ? eu("agentOpenBusy") : eu("startChat")}
              </button>`
            : request?.state === "pending"
              ? html`<button
                  class="btn"
                  type="button"
                  ?disabled=${this.accessRequestBusy}
                  @click=${() => void this.cancelAccess()}
                >
                  ${this.accessRequestBusy
                    ? eu("agentAccessRequestBusy")
                    : eu("cancelAgentAccessRequest")}
                </button>`
              : canRequest
                ? html`<button
                    class="btn primary"
                    type="button"
                    ?disabled=${this.accessRequestBusy}
                    @click=${() => void this.requestAccess()}
                  >
                    ${this.accessRequestBusy
                      ? eu("agentAccessRequestBusy")
                      : request?.state === "rejected"
                        ? eu("agentAccessResubmit")
                        : eu("requestAgentAccess")}
                  </button>`
                : nothing}
        </header>
        ${!agent.actions.canChat
          ? html`<div class="callout warn" role="status">
              ${presentUserAgentAccessStatus(agent)}
              ${request?.decisionReason
                ? html`<br /><small>${request.decisionReason}</small>`
                : nothing}
            </div>`
          : nothing}
        ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
        ${canLoadRelationship
          ? renderSettingsSection(
              {
                title: eu("sharedRelationshipTitle"),
                description: eu("sharedRelationshipDescription"),
                actions: html`<button
                  class="btn primary"
                  type="button"
                  ?disabled=${this.relationshipBusy || !this.relationshipDirty()}
                  @click=${() => void this.saveRelationship()}
                >
                  ${this.relationshipBusy ? eu("saveBusy") : eu("saveChanges")}
                </button>`,
              },
              relationship
                ? html`
                    ${renderSettingsRow({
                      title: eu("sharedCanonicalName"),
                      description: eu("sharedCanonicalNameDescription"),
                      control: html`<strong>${agent.canonicalName}</strong>`,
                    })}
                    ${renderSettingsRow({
                      title: eu("sharedAgentAlias"),
                      description: eu("sharedAgentAliasDescription"),
                      control: html`<input
                        class="settings-input"
                        aria-label=${eu("sharedAgentAlias")}
                        maxlength="64"
                        placeholder=${agent.canonicalName}
                        .value=${relationship.agentAlias}
                        ?disabled=${this.relationshipBusy || !agent.actions.canPersonalize}
                        @input=${(event: Event) =>
                          this.updateRelationship({
                            agentAlias: (event.currentTarget as HTMLInputElement).value,
                          })}
                      />`,
                    })}
                    ${renderSettingsRow({
                      title: eu("sharedAgentSelfReference"),
                      description: eu("sharedAgentSelfReferenceDescription"),
                      control: html`<input
                        class="settings-input"
                        aria-label=${eu("sharedAgentSelfReference")}
                        maxlength="64"
                        .value=${relationship.agentSelfReference}
                        ?disabled=${this.relationshipBusy || !agent.actions.canPersonalize}
                        @input=${(event: Event) =>
                          this.updateRelationship({
                            agentSelfReference: (event.currentTarget as HTMLInputElement).value,
                          })}
                      />`,
                    })}
                    ${renderSettingsRow({
                      title: eu("sharedUserAddress"),
                      description: eu("sharedUserAddressDescription"),
                      control: html`<input
                        class="settings-input"
                        aria-label=${eu("sharedUserAddress")}
                        maxlength="128"
                        .value=${relationship.userAddress}
                        ?disabled=${this.relationshipBusy || !agent.actions.canPersonalize}
                        @input=${(event: Event) =>
                          this.updateRelationship({
                            userAddress: (event.currentTarget as HTMLInputElement).value,
                          })}
                      />`,
                    })}
                    ${renderSettingsRow({
                      title: eu("sharedRelationshipInstructions"),
                      description: eu("sharedRelationshipInstructionsDescription"),
                      stacked: true,
                      control: html`<textarea
                        class="settings-textarea eu-personal-agent__textarea"
                        aria-label=${eu("sharedRelationshipInstructions")}
                        maxlength="1200"
                        .value=${relationship.customInstructions}
                        ?disabled=${this.relationshipBusy || !agent.actions.canPersonalize}
                        @input=${(event: Event) =>
                          this.updateRelationship({
                            customInstructions: (event.currentTarget as HTMLTextAreaElement).value,
                          })}
                      ></textarea>`,
                    })}
                  `
                : renderSettingsRow({ title: eu("loading") }),
            )
          : nothing}
        ${canLoadRelationship
          ? renderSettingsSection(
              {
                title: eu("sharedPrivateMemory"),
                description: eu("sharedPrivateMemoryDescription"),
              },
              renderSettingsRow({
                title: eu("sharedMemoryScope"),
                description: eu("sharedMemoryScopeDescription"),
              }),
            )
          : nothing}
        ${renderSettingsSection(
          {
            title: eu("available"),
            description: eu("managedCapabilitiesDescription"),
          },
          agent.capabilityLabels.length
            ? agent.capabilityLabels.map((label) => renderSettingsRow({ title: label }))
            : renderSettingsRow({ title: eu("managedCapabilitiesEmpty") }),
        )}
        ${renderSettingsSection(
          { title: eu("managedByCompany") },
          renderSettingsRow({
            title: eu("managedByCompany"),
            description: eu("managedUseDescription"),
          }),
        )}
        <button class="btn" type="button" @click=${() => this.backToLibrary()}>
          ${eu("agentLibraryBack")}
        </button>
      `,
      { wide: true },
    );
  }
}

if (!customElements.get("openclaw-user-shared-agent-detail-page")) {
  customElements.define("openclaw-user-shared-agent-detail-page", UserSharedAgentDetailPage);
}
