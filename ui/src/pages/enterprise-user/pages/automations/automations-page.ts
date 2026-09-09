import { consume } from "@lit/context";
import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import type { RouteId } from "../../../../app-route-paths.ts";
import { applicationContext, type ApplicationContext } from "../../../../app/context.ts";
import { showConfirmDialog } from "../../../../components/confirm-dialog.ts";
import {
  renderSettingsPage,
  renderSettingsRow,
  renderSettingsSection,
} from "../../../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../../../components/settings-workspace.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { i18n } from "../../../../i18n/index.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import type { UserAutomation } from "../../contracts/user-automation.ts";
import {
  deleteUserAutomation,
  listUserAutomations,
  runUserAutomation,
  updateUserAutomation,
} from "../../services/user-enterprise-api.ts";
import { calendarScheduleLabel } from "./automation-schedule.ts";

function scheduleLabel(item: UserAutomation): string {
  if (item.schedule.kind === "once") {
    return eu("automationOnceAt", {
      time: new Date(item.schedule.at).toLocaleString(i18n.getLocale()),
    });
  }
  if (item.schedule.kind === "interval") {
    return eu("automationEvery", { minutes: String(item.schedule.everyMinutes) });
  }
  const label = calendarScheduleLabel(item.schedule);
  return item.schedule.tz ? `${label} · ${item.schedule.tz}` : label;
}

export class UserAutomationsPage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: false })
  private context!: ApplicationContext<RouteId>;
  @state() private items: UserAutomation[] = [];
  @state() private loading = false;
  @state() private busyId = "";
  @state() private error = "";

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      this.items = await listUserAutomations();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("automationLoadFailed");
    } finally {
      this.loading = false;
    }
  }

  private edit(id?: string): void {
    const pathname = `${this.context.basePath}/automations/${id ? encodeURIComponent(id) : "new"}`;
    this.context.navigate("automation", { pathname });
  }

  private async toggle(item: UserAutomation): Promise<void> {
    if (!item.agentKey) {
      this.edit(item.id);
      return;
    }
    this.busyId = item.id;
    try {
      await updateUserAutomation(item.id, item.revision, {
        name: item.name,
        enabled: !item.enabled,
        agentKey: item.agentKey,
        schedule: item.schedule,
        prompt: item.prompt,
      });
      await this.load();
    } finally {
      this.busyId = "";
    }
  }

  private async run(item: UserAutomation): Promise<void> {
    this.busyId = item.id;
    try {
      await runUserAutomation(item.id);
      await this.load();
    } finally {
      this.busyId = "";
    }
  }

  private async removeAutomation(item: UserAutomation): Promise<void> {
    if (
      !(await showConfirmDialog({
        title: eu("delete"),
        message: eu("deleteNamed", { name: item.name }),
        confirmLabel: eu("delete"),
        danger: true,
      }))
    ) {
      return;
    }
    this.busyId = item.id;
    try {
      await deleteUserAutomation(item.id);
      await this.load();
    } finally {
      this.busyId = "";
    }
  }

  override render() {
    const page = renderSettingsPage(
      html`
        <header class="eu-page-header">
          <div>
            <h1>${eu("automations")}</h1>
            <p>${eu("automationScheduledDescription")}</p>
          </div>
          <button class="btn primary" type="button" @click=${() => this.edit()}>
            ${eu("automationCreate")}
          </button>
        </header>
        ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
        ${renderSettingsSection(
          { title: eu("automationYours"), count: this.items.length },
          this.loading
            ? html`<div class="settings-empty" role="status">${eu("loading")}</div>`
            : this.items.length
              ? this.items.map((item) =>
                  renderSettingsRow({
                    title: item.name,
                    description: html`${scheduleLabel(item)} ·
                    ${item.readOnly
                      ? eu("automationReadOnly")
                      : item.agentAccess === "removed"
                        ? html`<strong>${eu("automationAgentRemoved")}</strong>`
                        : item.enabled
                          ? eu("automationEnabled")
                          : eu("automationDisabled")}
                    ${item.nextRunAt
                      ? html` ·
                        ${eu("automationNext", {
                          time: new Date(item.nextRunAt).toLocaleString(i18n.getLocale()),
                        })}`
                      : nothing}
                    ${item.lastResult
                      ? html` · ${eu("automationLast", { result: item.lastResult })}`
                      : nothing}`,
                    control: item.readOnly
                      ? nothing
                      : html`<div>
                          <button class="btn" type="button" @click=${() => this.edit(item.id)}>
                            ${eu("edit")}
                          </button>
                          <button
                            class="btn"
                            type="button"
                            ?disabled=${this.busyId === item.id || item.agentAccess === "removed"}
                            @click=${() => void this.toggle(item)}
                          >
                            ${item.enabled ? eu("disable") : eu("enable")}
                          </button>
                          <button
                            class="btn"
                            type="button"
                            ?disabled=${this.busyId === item.id || item.agentAccess === "removed"}
                            @click=${() => void this.run(item)}
                          >
                            ${eu("automationRunNow")}
                          </button>
                          <button
                            class="btn danger"
                            type="button"
                            ?disabled=${this.busyId === item.id}
                            @click=${() => void this.removeAutomation(item)}
                          >
                            ${eu("delete")}
                          </button>
                        </div>`,
                  }),
                )
              : html`<div class="settings-empty">${eu("automationEmpty")}</div>`,
        )}
      `,
      { wide: true },
    );
    return renderSettingsWorkspace(page);
  }
}

if (!customElements.get("openclaw-user-automations-page")) {
  customElements.define("openclaw-user-automations-page", UserAutomationsPage);
}
