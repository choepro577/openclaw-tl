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
  EnterpriseUserAgent,
  SharedAgentRelationshipProfile,
} from "../../contracts/user-agent.ts";
import {
  loadSharedAgentRelationship,
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
  private relationshipEpoch = 0;

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("agent")) {
      void this.loadRelationship();
    }
  }

  private async loadRelationship(): Promise<void> {
    const agent = this.agent;
    if (!agent || agent.kind !== "shared") {
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
    if (!this.agent || this.busy) {
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
    const relationship = this.relationship ?? agent.relationship ?? undefined;
    const effectiveName = relationship?.agentAlias || agent.canonicalName;
    return renderSettingsPage(
      html`
        <header class="eu-page-header">
          <div>
            <p class="eu-agent-card__kind">${eu("enterpriseAgent")} · ${eu("managedByCompany")}</p>
            <h1>${effectiveName}</h1>
            <p>${agent.description ?? eu("sharedAgentDescription")}</p>
          </div>
          <button
            class="btn primary"
            type="button"
            ?disabled=${this.busy || !agent.actions.canChat}
            @click=${() => void this.start()}
          >
            ${this.busy ? eu("agentOpenBusy") : eu("startChat")}
          </button>
        </header>
        ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
        ${renderSettingsSection(
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
        )}
        ${renderSettingsSection(
          {
            title: eu("sharedPrivateMemory"),
            description: eu("sharedPrivateMemoryDescription"),
          },
          renderSettingsRow({
            title: eu("sharedMemoryScope"),
            description: eu("sharedMemoryScopeDescription"),
          }),
        )}
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
