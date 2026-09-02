import { consume } from "@lit/context";
import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import type { RouteId } from "../../../../app-route-paths.ts";
import { applicationContext, type ApplicationContext } from "../../../../app/context.ts";
import { renderSettingsPage, renderSettingsSection } from "../../../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../../../components/settings-workspace.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import { openUserAgentConversation } from "../../adapters/chat-route-adapter.ts";
import type { AgentKey } from "../../contracts/user-agent.ts";
import { userAgentCatalogStore } from "../../state/user-agent-catalog-store.ts";

export function resolveNewConversationAgentKey(
  selectedKey: AgentKey | null,
  activeKey: AgentKey | null,
): AgentKey | null {
  return selectedKey ?? activeKey;
}

export class UserNewConversationPage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: false })
  private context!: ApplicationContext<RouteId>;
  @state() private selectedKey: AgentKey | null = null;
  @state() private busy = false;
  @state() private error = "";
  private unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.selectedKey = resolveNewConversationAgentKey(
      this.selectedKey,
      userAgentCatalogStore.activeKey,
    );
    this.unsubscribe = userAgentCatalogStore.subscribe(() => {
      this.selectedKey = resolveNewConversationAgentKey(
        this.selectedKey,
        userAgentCatalogStore.activeKey,
      );
      this.requestUpdate();
    });
    void userAgentCatalogStore.load().then(() => {
      this.selectedKey = resolveNewConversationAgentKey(
        this.selectedKey,
        userAgentCatalogStore.activeKey,
      );
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super.disconnectedCallback();
  }

  private async create(): Promise<void> {
    const selectedKey = resolveNewConversationAgentKey(
      this.selectedKey,
      userAgentCatalogStore.activeKey,
    );
    if (!selectedKey || this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await openUserAgentConversation(this.context, selectedKey, "new");
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("conversationCreateFailed");
    } finally {
      this.busy = false;
    }
  }

  override render() {
    const agents = userAgentCatalogStore.agents.filter((agent) => agent.actions.canChat);
    const selected = resolveNewConversationAgentKey(
      this.selectedKey,
      userAgentCatalogStore.activeKey,
    );
    const page = renderSettingsPage(html`
      <header class="eu-page-header">
        <div>
          <h1>${eu("newConversation")}</h1>
          <p>${eu("conversationNewDescription")}</p>
        </div>
      </header>
      ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
      ${renderSettingsSection(
        { title: eu("newConversationAgentTitle") },
        agents.length
          ? html`<div class="settings-row settings-row--stacked">
              <div class="settings-row__text">
                <span class="settings-row__title">${eu("agentSessionLabel")}</span>
                <span class="settings-row__desc"> ${eu("agentSessionFixed")} </span>
              </div>
              <div class="settings-row__control">
                <select
                  class="input"
                  .value=${selected ?? ""}
                  @change=${(event: Event) => {
                    this.selectedKey = (event.currentTarget as HTMLSelectElement).value as AgentKey;
                  }}
                >
                  ${agents.map(
                    (agent) => html`<option value=${agent.key}>
                      ${agent.kind === "personal" ? eu("myAgents") : eu("company")} · ${agent.name}
                    </option>`,
                  )}
                </select>
                <button
                  class="btn primary"
                  type="button"
                  ?disabled=${this.busy || !selected}
                  @click=${() => void this.create()}
                >
                  ${this.busy ? eu("conversationCreateBusy") : eu("conversationCreate")}
                </button>
              </div>
            </div>`
          : html`<div class="settings-empty">${eu("agentNone")}</div>`,
      )}
    `);
    return renderSettingsWorkspace(page);
  }
}

if (!customElements.get("openclaw-user-new-conversation-page")) {
  customElements.define("openclaw-user-new-conversation-page", UserNewConversationPage);
}
