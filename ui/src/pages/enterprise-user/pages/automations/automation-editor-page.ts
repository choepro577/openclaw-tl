import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import {
  renderSettingsPage,
  renderSettingsRow,
  renderSettingsSection,
} from "../../../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../../../components/settings-workspace.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import type { AgentKey } from "../../contracts/user-agent.ts";
import type { UserAutomation, UserAutomationInput } from "../../contracts/user-automation.ts";
import {
  createUserAutomation,
  listUserAutomations,
  updateUserAutomation,
} from "../../services/user-enterprise-api.ts";
import { userAgentCatalogStore } from "../../state/user-agent-catalog-store.ts";

export function routeAutomationId(): string | null {
  const queryId = new URLSearchParams(globalThis.location?.search ?? "").get("id");
  if (queryId) {
    return queryId === "new" ? null : queryId;
  }
  const match = /\/automations\/([^/?#]+)$/.exec(globalThis.location?.pathname ?? "");
  return match?.[1] && !["new", "editor"].includes(match[1]) ? decodeURIComponent(match[1]) : null;
}

function defaultAt(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export class UserAutomationEditorPage extends OpenClawLightDomElement {
  @state() private source: UserAutomation | null = null;
  @state() private draft: UserAutomationInput = {
    name: "",
    enabled: true,
    agentKey: "personal",
    schedule: { kind: "interval", everyMinutes: 60 },
    prompt: "",
  };
  @state() private loading = false;
  @state() private busy = false;
  @state() private error = "";
  private unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = userAgentCatalogStore.subscribe(() => this.requestUpdate());
    void Promise.all([userAgentCatalogStore.load(), this.load()]);
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super.disconnectedCallback();
  }

  private async load(): Promise<void> {
    const id = routeAutomationId();
    if (!id) {
      this.draft = {
        ...this.draft,
        agentKey: userAgentCatalogStore.activeKey ?? "personal",
      };
      return;
    }
    this.loading = true;
    try {
      const item = (await listUserAutomations()).find((candidate) => candidate.id === id);
      if (!item) {
        this.error = eu("automationNotFound");
        return;
      }
      this.source = item;
      this.draft = {
        name: item.name,
        enabled: item.enabled,
        agentKey: item.agentKey ?? userAgentCatalogStore.activeKey ?? "personal",
        schedule: item.schedule,
        prompt: item.prompt,
      };
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("automationLoadFailed");
    } finally {
      this.loading = false;
    }
  }

  private updateDraft(patch: Partial<UserAutomationInput>): void {
    this.draft = { ...this.draft, ...patch };
  }

  private async save(): Promise<void> {
    if (this.busy || !this.draft.name.trim() || !this.draft.prompt.trim()) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      this.source = this.source
        ? await updateUserAutomation(this.source.id, this.source.revision, this.draft)
        : await createUserAutomation(this.draft);
      this.draft = {
        name: this.source.name,
        enabled: this.source.enabled,
        agentKey: this.source.agentKey ?? this.draft.agentKey,
        schedule: this.source.schedule,
        prompt: this.source.prompt,
      };
      globalThis.history.replaceState(
        globalThis.history.state,
        "",
        `${globalThis.location.pathname.replace(/\/new$/, "")}/${encodeURIComponent(this.source.id)}`,
      );
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("automationSaveFailed");
    } finally {
      this.busy = false;
    }
  }

  override render() {
    if (this.loading) {
      return renderSettingsWorkspace(
        html`<div class="loading-state" role="status">${eu("loading")}</div>`,
      );
    }
    const agents = userAgentCatalogStore.agents.filter((agent) => agent.actions.canSchedule);
    const schedule = this.draft.schedule;
    return renderSettingsWorkspace(
      renderSettingsPage(html`
        <header class="eu-page-header">
          <div>
            <h1>${this.source ? eu("automationEdit") : eu("automationCreate")}</h1>
            <p>${eu("automationAgentTurn")}</p>
          </div>
          <button
            class="btn primary"
            type="button"
            ?disabled=${this.busy || !this.draft.name.trim() || !this.draft.prompt.trim()}
            @click=${() => void this.save()}
          >
            ${this.busy ? eu("saveBusy") : eu("automationSave")}
          </button>
        </header>
        ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
        ${renderSettingsSection(
          { title: eu("configuration") },
          html`
            ${renderSettingsRow({
              title: eu("automationName"),
              control: html`<input
                class="input"
                maxlength="128"
                .value=${this.draft.name}
                @input=${(event: Event) =>
                  this.updateDraft({ name: (event.currentTarget as HTMLInputElement).value })}
              />`,
              stacked: true,
            })}
            ${renderSettingsRow({
              title: eu("newConversationAgentTitle"),
              description:
                this.source?.agentAccess === "removed"
                  ? eu("automationAgentRemoved")
                  : eu("automationAgentAccess"),
              control: html`<select
                class="input"
                .value=${this.draft.agentKey}
                @change=${(event: Event) =>
                  this.updateDraft({
                    agentKey: (event.currentTarget as HTMLSelectElement).value as AgentKey,
                  })}
              >
                ${agents.map((agent) => html`<option value=${agent.key}>${agent.name}</option>`)}
              </select>`,
            })}
            ${renderSettingsRow({
              title: eu("automationPrompt"),
              description: eu("automationPromptCount", {
                count: String(this.draft.prompt.length),
              }),
              control: html`<textarea
                class="input"
                rows="7"
                maxlength="4000"
                .value=${this.draft.prompt}
                @input=${(event: Event) =>
                  this.updateDraft({ prompt: (event.currentTarget as HTMLTextAreaElement).value })}
              ></textarea>`,
              stacked: true,
            })}
          `,
        )}
        ${renderSettingsSection(
          { title: eu("automationSchedule") },
          html`
            ${renderSettingsRow({
              title: eu("automationScheduleType"),
              control: html`<select
                class="input"
                .value=${schedule.kind}
                @change=${(event: Event) => {
                  const kind = (event.currentTarget as HTMLSelectElement).value;
                  this.updateDraft({
                    schedule:
                      kind === "once"
                        ? { kind: "once", at: defaultAt() }
                        : { kind: "interval", everyMinutes: 60 },
                  });
                }}
              >
                <option value="once">${eu("automationOnce")}</option>
                <option value="interval">${eu("automationInterval")}</option>
              </select>`,
            })}
            ${schedule.kind === "once"
              ? renderSettingsRow({
                  title: eu("automationTime"),
                  control: html`<input
                    class="input"
                    type="datetime-local"
                    .value=${schedule.at.slice(0, 16)}
                    @input=${(event: Event) =>
                      this.updateDraft({
                        schedule: {
                          kind: "once",
                          at: (event.currentTarget as HTMLInputElement).value,
                        },
                      })}
                  />`,
                })
              : renderSettingsRow({
                  title: eu("automationEveryMinutes"),
                  control: html`<input
                    class="input"
                    type="number"
                    min="1"
                    max="525600"
                    .value=${String(schedule.everyMinutes)}
                    @input=${(event: Event) =>
                      this.updateDraft({
                        schedule: {
                          kind: "interval",
                          everyMinutes: Number((event.currentTarget as HTMLInputElement).value),
                        },
                      })}
                  />`,
                })}
            ${renderSettingsRow({
              title: eu("status"),
              control: html`<label class="field checkbox"
                ><input
                  type="checkbox"
                  .checked=${this.draft.enabled}
                  @change=${(event: Event) =>
                    this.updateDraft({
                      enabled: (event.currentTarget as HTMLInputElement).checked,
                    })}
                />
                <span>${eu("automationEnable")}</span></label
              >`,
            })}
          `,
        )}
      `),
    );
  }
}

if (!customElements.get("openclaw-user-automation-editor-page")) {
  customElements.define("openclaw-user-automation-editor-page", UserAutomationEditorPage);
}
