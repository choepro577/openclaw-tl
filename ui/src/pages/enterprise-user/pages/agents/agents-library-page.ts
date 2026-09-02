import { consume } from "@lit/context";
import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { applicationContext, type ApplicationContext } from "../../../../app/context.ts";
import { renderSettingsPage } from "../../../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../../../components/settings-workspace.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import { openUserAgentConversation } from "../../adapters/chat-route-adapter.ts";
import "../../components/user-agent-card.ts";
import "./shared-agent-detail-page.ts";
import type { EnterpriseUserAgent } from "../../contracts/user-agent.ts";
import { userAgentCatalogStore } from "../../state/user-agent-catalog-store.ts";
import { userBootstrapStore } from "../../state/user-bootstrap-store.ts";
import "../../styles/agents-library.css";

export class UserAgentsLibraryPage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: false })
  private context!: ApplicationContext;
  @state() private query = "";
  @state() private busyKey = "";
  @state() private error = "";
  private unsubscribers: Array<() => void> = [];

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribers = [
      userBootstrapStore.subscribe(() => this.requestUpdate()),
      userAgentCatalogStore.subscribe(() => this.requestUpdate()),
    ];
    void userAgentCatalogStore.load();
  }

  override disconnectedCallback(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    super.disconnectedCallback();
  }

  private async start(agent: EnterpriseUserAgent): Promise<void> {
    this.busyKey = agent.key;
    this.error = "";
    try {
      await openUserAgentConversation(this.context, agent.key, "resume-latest");
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("agentOpenFailed");
    } finally {
      this.busyKey = "";
    }
  }

  private sharedAgentKeyFromPath(): string | null {
    const queryKey = new URLSearchParams(globalThis.location?.search ?? "").get("agent");
    if (queryKey) {
      return queryKey;
    }
    const match = /\/agents\/shared\/([^/]+)\/?$/i.exec(globalThis.location?.pathname ?? "");
    if (!match?.[1]) {
      return null;
    }
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }

  private showDetail(agent: EnterpriseUserAgent): void {
    const basePath = this.context.basePath.replace(/\/$/u, "");
    this.context.navigate("enterprise", {
      pathname: `${basePath}/agents/shared/${encodeURIComponent(agent.key)}`,
    });
    // The detail URL and library share one router route, so the page instance is retained.
    this.requestUpdate();
  }

  override render() {
    const bootstrapState = userBootstrapStore.state;
    const body =
      bootstrapState.phase === "loading" || bootstrapState.phase === "idle"
        ? html`<div class="loading-state" role="status">${eu("agentLibraryLoading")}</div>`
        : bootstrapState.phase === "error"
          ? html`<div class="callout danger" role="alert">
              ${bootstrapState.message}
              <button
                class="btn"
                type="button"
                @click=${() => void userAgentCatalogStore.load(true)}
              >
                ${eu("retry")}
              </button>
            </div>`
          : bootstrapState.phase === "ready"
            ? (() => {
                const selectedKey = this.sharedAgentKeyFromPath();
                if (selectedKey) {
                  const selected = bootstrapState.data.agents.find(
                    (agent) => agent.kind === "shared" && agent.key === selectedKey,
                  );
                  return selected
                    ? html`<openclaw-user-shared-agent-detail-page
                        .agent=${selected}
                        @shared-agent-detail-close=${() => this.requestUpdate()}
                      ></openclaw-user-shared-agent-detail-page>`
                    : html`<div class="callout warn" role="status">
                        ${eu("agentNoAccess")}
                        <button
                          class="btn"
                          type="button"
                          @click=${() => this.context.navigate("enterprise")}
                        >
                          ${eu("agentLibraryBack")}
                        </button>
                      </div>`;
                }
                const query = this.query.trim().toLowerCase();
                const agents = bootstrapState.data.agents.filter(
                  (agent) =>
                    !query ||
                    agent.name.toLowerCase().includes(query) ||
                    agent.canonicalName.toLowerCase().includes(query) ||
                    agent.description?.toLowerCase().includes(query),
                );
                const sharedCount = bootstrapState.data.agents.filter(
                  (agent) => agent.kind === "shared",
                ).length;
                return renderSettingsPage(
                  html`
                    <header class="eu-page-header">
                      <div>
                        <h1>${eu("agentLibrary")}</h1>
                        <p>${eu("agentLibraryDescription")}</p>
                      </div>
                    </header>
                    ${bootstrapState.data.agents.length > 6
                      ? html`<label class="field eu-agent-search">
                          <span>${eu("agentSearch")}</span>
                          <input
                            class="input"
                            type="search"
                            .value=${this.query}
                            @input=${(event: Event) => {
                              this.query = (event.currentTarget as HTMLInputElement).value;
                            }}
                          />
                        </label>`
                      : nothing}
                    ${this.error
                      ? html`<div class="callout danger" role="alert">${this.error}</div>`
                      : nothing}
                    <div class="eu-agent-grid">
                      ${agents.map(
                        (agent) => html`<openclaw-user-agent-card
                          .agent=${agent}
                          .busy=${this.busyKey === agent.key}
                          .onStart=${(selected: EnterpriseUserAgent) => void this.start(selected)}
                          .onEdit=${() => this.context.navigate("agents")}
                          .onDetail=${(selected: EnterpriseUserAgent) => this.showDetail(selected)}
                        ></openclaw-user-agent-card>`,
                      )}
                    </div>
                    ${sharedCount === 0
                      ? html`<div class="settings-empty">${eu("agentNoCompany")}</div>`
                      : nothing}
                  `,
                  { wide: true },
                );
              })()
            : nothing;
    return renderSettingsWorkspace(body);
  }
}

if (!customElements.get("openclaw-user-agents-library-page")) {
  customElements.define("openclaw-user-agents-library-page", UserAgentsLibraryPage);
}
