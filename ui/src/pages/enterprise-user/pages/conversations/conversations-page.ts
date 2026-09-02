import { consume } from "@lit/context";
import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import type { GatewaySessionRow } from "../../../../api/types.ts";
import type { RouteId } from "../../../../app-route-paths.ts";
import { applicationContext, type ApplicationContext } from "../../../../app/context.ts";
import { showConfirmDialog } from "../../../../components/confirm-dialog.ts";
import { showInputDialog } from "../../../../components/input-dialog.ts";
import {
  renderSettingsPage,
  renderSettingsRow,
  renderSettingsSection,
} from "../../../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../../../components/settings-workspace.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import { navigateToUserConversationSession } from "../../adapters/chat-route-adapter.ts";

export class UserConversationsPage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: false })
  private context!: ApplicationContext<RouteId>;
  @state() private sessions: GatewaySessionRow[] = [];
  @state() private loading = false;
  @state() private query = "";
  @state() private showArchived = false;
  @state() private error = "";

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      const result = await this.context.sessions.list({
        limit: 100,
        includeGlobal: true,
        includeUnknown: false,
        includeDerivedTitles: true,
        includeLastMessage: true,
        archivedFilter: this.showArchived ? "archived" : "active",
      });
      this.sessions = result?.sessions ?? [];
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("conversationLoadFailed");
    } finally {
      this.loading = false;
    }
  }

  private open(row: GatewaySessionRow): void {
    navigateToUserConversationSession(this.context, row.key);
  }

  private async rename(row: GatewaySessionRow): Promise<void> {
    await showInputDialog({
      title: eu("conversationRename"),
      label: eu("conversationName"),
      defaultValue: row.displayName ?? row.label ?? "",
      requireValue: true,
      requireChange: true,
      submit: async (value) => {
        const result = await this.context.sessions.patch(row.key, { label: value });
        if (!result) {
          return this.context.sessions.state.error ?? eu("conversationRenameFailed");
        }
        await this.load();
        return null;
      },
    });
  }

  private async archive(row: GatewaySessionRow): Promise<void> {
    if (!row.sessionId) {
      return;
    }
    const result = await this.context.sessions.patch(
      row.key,
      { archived: !this.showArchived },
      { expectedSessionId: row.sessionId },
    );
    if (!result) {
      this.error = this.context.sessions.state.error ?? eu("conversationUpdateFailed");
      return;
    }
    await this.load();
  }

  private async removeConversation(row: GatewaySessionRow): Promise<void> {
    const confirmed = await showConfirmDialog({
      title: eu("conversationDelete"),
      message: eu("conversationDeleteConfirm"),
      confirmLabel: eu("delete"),
      danger: true,
    });
    if (!confirmed || !row.sessionId) {
      return;
    }
    await this.context.sessions.delete(row.key, {
      expectedSessionId: row.sessionId,
      deleteTranscript: true,
    });
    await this.load();
  }

  override render() {
    const query = this.query.trim().toLocaleLowerCase();
    const rows = this.sessions.filter((row) => {
      const name = row.displayName ?? row.label ?? row.subject ?? eu("conversation");
      return !query || name.toLocaleLowerCase().includes(query);
    });
    const page = renderSettingsPage(
      html`
        <header class="eu-page-header">
          <div>
            <h1>${eu("conversations")}</h1>
            <p>${eu("conversationDescription")}</p>
          </div>
          <button
            class="btn primary"
            type="button"
            @click=${() => this.context.navigate("new-session")}
          >
            ${eu("newConversation")}
          </button>
        </header>
        ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
        ${renderSettingsSection(
          {
            title: this.showArchived ? eu("archived") : eu("recent"),
            count: rows.length,
            actions: html`<button
              class="btn"
              type="button"
              @click=${() => {
                this.showArchived = !this.showArchived;
                void this.load();
              }}
            >
              ${this.showArchived ? eu("activeConversations") : eu("archivedConversations")}
            </button>`,
          },
          html`
            <div class="settings-row settings-row--stacked">
              <div class="settings-row__control">
                <input
                  class="input"
                  type="search"
                  placeholder=${eu("conversationSearch")}
                  .value=${this.query}
                  @input=${(event: Event) => {
                    this.query = (event.currentTarget as HTMLInputElement).value;
                  }}
                />
              </div>
            </div>
            ${this.loading
              ? html`<div class="settings-empty" role="status">${eu("loading")}</div>`
              : rows.length
                ? rows.map((row) => {
                    const title = row.displayName ?? row.label ?? row.subject ?? eu("conversation");
                    return renderSettingsRow({
                      title: html`<button
                        class="btn btn--ghost"
                        type="button"
                        @click=${() => this.open(row)}
                      >
                        ${title}
                      </button>`,
                      description: eu("updatedAt", {
                        time: new Date(row.updatedAt ?? Date.now()).toLocaleString(),
                      }),
                      control: html`<div>
                        <button class="btn" type="button" @click=${() => void this.rename(row)}>
                          ${eu("conversationRename")}
                        </button>
                        <button class="btn" type="button" @click=${() => void this.archive(row)}>
                          ${this.showArchived ? eu("restore") : eu("archive")}
                        </button>
                        <button
                          class="btn danger"
                          type="button"
                          @click=${() => void this.removeConversation(row)}
                        >
                          ${eu("delete")}
                        </button>
                      </div>`,
                    });
                  })
                : html`<div class="settings-empty">${eu("conversationEmpty")}</div>`}
          `,
        )}
      `,
      { wide: true },
    );
    return renderSettingsWorkspace(page);
  }
}

if (!customElements.get("openclaw-user-conversations-page")) {
  customElements.define("openclaw-user-conversations-page", UserConversationsPage);
}
