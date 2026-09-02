import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { RouteId } from "../../../app-route-paths.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import { icons } from "../../../components/icons.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomContentsElement } from "../../../lit/openclaw-element.ts";
import { openUserAgentConversation } from "../adapters/chat-route-adapter.ts";
import type { AgentKey, EnterpriseUserAgent } from "../contracts/user-agent.ts";
import { presentUserAgentAvatar } from "../services/user-agent-presenter.ts";
import { userAgentCatalogStore } from "../state/user-agent-catalog-store.ts";

export function filterUserAgents(
  agents: EnterpriseUserAgent[],
  query: string,
): EnterpriseUserAgent[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) {
    return agents;
  }
  return agents.filter((agent) =>
    [agent.name, agent.canonicalName, agent.description ?? "", ...agent.capabilityLabels].some(
      (value) => value.toLocaleLowerCase().includes(normalized),
    ),
  );
}

export class EnterpriseUserAgentSwitcher extends OpenClawLightDomContentsElement {
  @property({ attribute: false }) context?: ApplicationContext<RouteId>;
  @property({ attribute: false }) onNavigate?: () => void;
  @state() private query = "";
  @state() private switching = false;
  @state() private error = "";
  private unsubscribe?: () => void;
  private readonly closeOnOutsidePointer = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this)) {
      this.closeMenu();
    }
  };
  private readonly closeOnEscape = (event: KeyboardEvent): void => {
    const details = this.renderRoot.querySelector<HTMLDetailsElement>("details");
    if (event.key !== "Escape" || !details?.open) {
      return;
    }
    event.preventDefault();
    this.closeMenu();
    details.querySelector<HTMLElement>("summary")?.focus();
  };
  private readonly closeOnViewportChange = (event: Event): void => {
    if (event.type === "scroll" && event.target instanceof Node && this.contains(event.target)) {
      return;
    }
    this.closeMenu();
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = userAgentCatalogStore.subscribe(() => this.requestUpdate());
    document.addEventListener("pointerdown", this.closeOnOutsidePointer);
    document.addEventListener("keydown", this.closeOnEscape);
    document.addEventListener("scroll", this.closeOnViewportChange, true);
    window.addEventListener("resize", this.closeOnViewportChange);
    void userAgentCatalogStore.load();
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    document.removeEventListener("pointerdown", this.closeOnOutsidePointer);
    document.removeEventListener("keydown", this.closeOnEscape);
    document.removeEventListener("scroll", this.closeOnViewportChange, true);
    window.removeEventListener("resize", this.closeOnViewportChange);
    super.disconnectedCallback();
  }

  private closeMenu(): void {
    const details = this.renderRoot.querySelector<HTMLDetailsElement>("details");
    if (details) {
      details.open = false;
    }
  }

  private positionMenu(details: HTMLDetailsElement): void {
    if (!details.open) {
      return;
    }
    const summary = details.querySelector<HTMLElement>("summary");
    const menu = details.querySelector<HTMLElement>(".eu-agent-switcher__menu");
    if (!summary || !menu) {
      return;
    }
    const viewportEdge = 8;
    const menuGap = 4;
    const summaryRect = summary.getBoundingClientRect();
    const spaceBelow = window.innerHeight - summaryRect.bottom - menuGap - viewportEdge;
    const spaceAbove = summaryRect.top - menuGap - viewportEdge;
    const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableHeight = openAbove ? spaceAbove : spaceBelow;

    menu.style.left = `${Math.max(viewportEdge, summaryRect.left)}px`;
    menu.style.width = `${Math.min(summaryRect.width, window.innerWidth - viewportEdge * 2)}px`;
    menu.style.maxHeight = `${Math.min(360, Math.max(80, availableHeight))}px`;
    menu.style.top = openAbove ? "auto" : `${summaryRect.bottom + menuGap}px`;
    menu.style.bottom = openAbove ? `${window.innerHeight - summaryRect.top + menuGap}px` : "auto";
  }

  private async selectAgent(key: AgentKey): Promise<void> {
    const context = this.context;
    if (!context || this.switching) {
      return;
    }
    this.switching = true;
    this.error = "";
    try {
      await openUserAgentConversation(context, key, "resume-latest");
      this.closeMenu();
      this.onNavigate?.();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("switchAgentFailed");
    } finally {
      this.switching = false;
    }
  }

  private showPersonalAgent(): void {
    const context = this.context;
    if (!context) {
      return;
    }
    this.error = "";
    context.navigate("agents");
    this.closeMenu();
    this.onNavigate?.();
  }

  private renderGroup(label: string, agents: EnterpriseUserAgent[]) {
    if (agents.length === 0) {
      return nothing;
    }
    return html`
      <section class="eu-agent-switcher__group" aria-label=${label}>
        <span class="eu-agent-switcher__group-label">${label}</span>
        ${agents.map(
          (agent) => html`
            <div class="eu-agent-switcher__row">
              <button
                type="button"
                class="eu-agent-switcher__select"
                aria-current=${userAgentCatalogStore.activeKey === agent.key ? "true" : nothing}
                ?disabled=${this.switching || !agent.actions.canChat}
                @click=${() => void this.selectAgent(agent.key)}
              >
                <span class="eu-agent-switcher__menu-avatar" aria-hidden="true">
                  ${presentUserAgentAvatar(agent)}
                </span>
                <span class="eu-agent-switcher__copy">
                  <strong>${agent.name}</strong>
                  <small>${agent.description ?? eu("managedByCompany")}</small>
                </span>
                ${userAgentCatalogStore.activeKey === agent.key
                  ? html`<span class="eu-agent-switcher__active" aria-label=${eu("activeAgent")}
                      >${icons.check}</span
                    >`
                  : nothing}
              </button>
              ${agent.kind === "personal"
                ? html`<button
                    type="button"
                    class="btn btn--ghost eu-agent-switcher__action"
                    aria-label=${eu("edit")}
                    @click=${() => this.showPersonalAgent()}
                  >
                    ${icons.edit}
                  </button>`
                : nothing}
            </div>
          `,
        )}
      </section>
    `;
  }

  override render() {
    const agents = userAgentCatalogStore.agents;
    const activeAgent = userAgentCatalogStore.activeAgent;
    const filtered = filterUserAgents(agents, this.query);
    return html`
      <details
        class="eu-agent-switcher"
        @toggle=${(event: Event) => this.positionMenu(event.currentTarget as HTMLDetailsElement)}
      >
        <summary aria-label=${eu("changeActiveAgent")}>
          <span class="eu-agent-switcher__avatar" aria-hidden="true">
            ${activeAgent ? presentUserAgentAvatar(activeAgent) : "◌"}
          </span>
          <span class="eu-agent-switcher__identity">
            <small>${eu("activeAgent")}</small>
            <strong>${activeAgent?.name ?? eu("notAvailable")}</strong>
          </span>
          <span class="eu-agent-switcher__chevron" aria-hidden="true">${icons.chevronDown}</span>
        </summary>
        <div class="eu-agent-switcher__menu">
          ${agents.length > 6
            ? html`<label class="field eu-agent-switcher__search">
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
          ${this.renderGroup(
            eu("myAgents"),
            filtered.filter((agent) => agent.kind === "personal"),
          )}
          ${this.renderGroup(
            eu("company"),
            filtered.filter((agent) => agent.kind === "shared"),
          )}
          ${filtered.length === 0
            ? html`<div class="settings-empty">${eu("agentNone")}</div>`
            : nothing}
        </div>
      </details>
      ${this.error ? html`<p class="callout danger" role="alert">${this.error}</p>` : nothing}
    `;
  }
}

if (!customElements.get("openclaw-enterprise-user-agent-switcher")) {
  customElements.define("openclaw-enterprise-user-agent-switcher", EnterpriseUserAgentSwitcher);
}
