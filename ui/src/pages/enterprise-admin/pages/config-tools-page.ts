import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  listAdminAccounts,
  listAdminToolCatalog,
  type EnterpriseAccount,
  type EnterpriseToolCatalogItem,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage } from "../utils.ts";
import "../components/access-dialog.ts";

export class EnterpriseAdminConfigToolsPage extends OpenClawLightDomElement {
  @state() private tools: EnterpriseToolCatalogItem[] = [];
  @state() private accounts: EnterpriseAccount[] = [];
  @state() private query = "";
  @state() private accountId = "";
  @state() private loading = true;
  @state() private error = "";
  @state() private selectedTool?: EnterpriseToolCatalogItem;
  private reloadTimer?: ReturnType<typeof globalThis.setTimeout>;

  override connectedCallback(): void {
    super.connectedCallback();
    void Promise.all([this.loadTools(), this.loadAccounts()]);
  }

  override disconnectedCallback(): void {
    if (this.reloadTimer) {
      globalThis.clearTimeout(this.reloadTimer);
    }
    super.disconnectedCallback();
  }

  private async loadAccounts(): Promise<void> {
    try {
      this.accounts = (await listAdminAccounts({ role: "employee", limit: "100" })).accounts;
    } catch {
      this.accounts = [];
    }
  }

  private async loadTools(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      this.tools = (
        await listAdminToolCatalog({ query: this.query, accountId: this.accountId })
      ).items;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private scheduleToolLoad(): void {
    if (this.reloadTimer) {
      globalThis.clearTimeout(this.reloadTimer);
    }
    this.reloadTimer = globalThis.setTimeout(() => void this.loadTools(), 250);
  }

  override render() {
    return html`
      <section class="ea-page">
        <header class="ea-page-header">
          <div>
            <h1>Tools</h1>
            <p>Catalog, quyền cấp phát và effective policy theo user.</p>
          </div>
          <button class="ea-button" type="button" @click=${() => void this.loadTools()}>
            Làm mới
          </button>
        </header>
        <div class="ea-toolbar">
          <input
            class="ea-input"
            type="search"
            placeholder="Tìm tool…"
            aria-label="Tìm tool"
            @input=${(event: Event) => {
              this.query = (event.currentTarget as HTMLInputElement).value;
              this.scheduleToolLoad();
            }}
          />
          <select
            class="ea-select"
            aria-label="Lọc theo user"
            @change=${(event: Event) => {
              this.accountId = (event.currentTarget as HTMLSelectElement).value;
              void this.loadTools();
            }}
          >
            <option value="">Tất cả user</option>
            ${this.accounts.map(
              (account) => html`<option value=${account.id}>
                ${account.displayName} (@${account.username})
              </option>`,
            )}
          </select>
          <span class="ea-spacer"></span>
          <span class="ea-badge">${this.tools.length} tools</span>
        </div>
        ${this.error ? html`<p class="ea-error" role="alert">${this.error}</p>` : nothing}
        <div class="ea-card ea-table-wrap">
          ${this.loading
            ? html`<div class="ea-loading">Đang tải tool catalog…</div>`
            : html`
                <table class="ea-table">
                  <thead>
                    <tr>
                      <th>Tool</th>
                      <th>Source</th>
                      <th>Risk</th>
                      <th>Agent scope</th>
                      <th>Gán quyền</th>
                      <th>User được cấp</th>
                      <th>Effective</th>
                      <th class="ea-table__action">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.tools.map(
                      (tool) => html`
                        <tr>
                          <td>
                            <strong>${tool.label ?? tool.toolId}</strong>
                            <div class="ea-muted">
                              ${tool.toolId}${tool.sessionDependent ? " · session-dependent" : ""}
                            </div>
                          </td>
                          <td><span class="ea-badge">${tool.source}</span></td>
                          <td>
                            <span
                              class="ea-badge ${tool.risk === "high"
                                ? "ea-badge--bad"
                                : tool.risk === "medium"
                                  ? "ea-badge--warn"
                                  : ""}"
                              >${tool.risk}</span
                            >
                          </td>
                          <td>${tool.agentId ?? "Nhiều agent"}</td>
                          <td>
                            ${tool.nonDelegable
                              ? html`<span class="ea-badge ea-badge--bad">Non-delegable</span>`
                              : tool.assignable
                                ? html`<span class="ea-badge ea-badge--good">Assignable</span>`
                                : html`<span class="ea-badge">Read-only</span>`}
                          </td>
                          <td>${tool.assignedUserCount}</td>
                          <td>
                            ${this.accountId
                              ? html`<span
                                  class="ea-badge ${tool.effectiveAccess?.effectiveAllowed
                                    ? "ea-badge--good"
                                    : "ea-badge--bad"}"
                                  >${tool.effectiveAccess?.effectiveAllowed
                                    ? "Được chạy"
                                    : "Bị chặn"}</span
                                >`
                              : "—"}
                          </td>
                          <td class="ea-table__action">
                            <button
                              class="ea-button"
                              type="button"
                              ?disabled=${!tool.assignable}
                              title=${tool.assignable
                                ? "Quản lý user"
                                : "Tool này không thể cấp cho user"}
                              @click=${() => (this.selectedTool = tool)}
                            >
                              Quản lý user
                            </button>
                          </td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
                ${this.tools.length === 0
                  ? html`<div class="ea-empty">Không có tool phù hợp.</div>`
                  : nothing}
              `}
        </div>
      </section>
      ${this.selectedTool
        ? html`<openclaw-enterprise-access-dialog
            .open=${true}
            resourceType="tool"
            .resourceKey=${this.selectedTool.resourceKey}
            .resourceName=${this.selectedTool.label ?? this.selectedTool.toolId}
            .onClose=${() => (this.selectedTool = undefined)}
            .onSaved=${() => void this.loadTools()}
          ></openclaw-enterprise-access-dialog>`
        : nothing}
    `;
  }
}

if (!customElements.get("openclaw-enterprise-admin-config-tools-page")) {
  customElements.define(
    "openclaw-enterprise-admin-config-tools-page",
    EnterpriseAdminConfigToolsPage,
  );
}
