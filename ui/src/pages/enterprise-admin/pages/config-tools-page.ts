import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { ea } from "../../../i18n/enterprise-admin.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  listAdminAccounts,
  listAdminToolCatalog,
  type EnterpriseAccount,
  type EnterpriseToolCatalogItem,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage } from "../utils.ts";
import "../components/access-dialog.ts";

function runtimeReasonLabel(reason: string | null | undefined): string | undefined {
  switch (reason) {
    case "runtime_check_required":
      return ea("Cần kiểm tra điều kiện trong phiên chạy");
    case "browser_disabled":
      return ea("Trình duyệt đang tắt");
    case "swarm_disabled":
      return ea("Chế độ chạy nhóm agent chưa bật");
    case undefined:
    case null:
    case "":
      return undefined;
    default:
      return ea("Chưa xác minh điều kiện chạy");
  }
}

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
            <h1>${ea("Tools")}</h1>
            <p>${ea("Catalog, quyền cấp phát và effective policy theo user.")}</p>
          </div>
          <button class="ea-button" type="button" @click=${() => void this.loadTools()}>
            ${ea("Làm mới")}
          </button>
        </header>
        <div class="ea-toolbar">
          <input
            class="ea-input"
            type="search"
            placeholder=${ea("Tìm tool…")}
            aria-label=${ea("Tìm tool")}
            @input=${(event: Event) => {
              this.query = (event.currentTarget as HTMLInputElement).value;
              this.scheduleToolLoad();
            }}
          />
          <select
            class="ea-select"
            aria-label=${ea("Lọc theo user")}
            @change=${(event: Event) => {
              this.accountId = (event.currentTarget as HTMLSelectElement).value;
              void this.loadTools();
            }}
          >
            <option value="">${ea("Tất cả user")}</option>
            ${this.accounts.map(
              (account) => html`<option value=${account.id}>
                ${account.displayName} (@${account.username})
              </option>`,
            )}
          </select>
          <span class="ea-spacer"></span>
          <span class="ea-badge">${this.tools.length} ${ea("tools")}</span>
        </div>
        ${this.error ? html`<p class="ea-error" role="alert">${this.error}</p>` : nothing}
        <div class="ea-card ea-table-wrap">
          ${this.loading
            ? html`<div class="ea-loading">${ea("Đang tải tool catalog…")}</div>`
            : html`
                <table class="ea-table">
                  <thead>
                    <tr>
                      <th>${ea("Tool")}</th>
                      <th>${ea("Source")}</th>
                      <th>${ea("Risk")}</th>
                      <th>${ea("Agent scope")}</th>
                      <th>${ea("Gán quyền")}</th>
                      <th>${ea("User được cấp")}</th>
                      <th>${ea("Quyền sử dụng")}</th>
                      <th>${ea("Khả năng chạy")}</th>
                      <th class="ea-table__action">${ea("Thao tác")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.tools.map((tool) => {
                      const access = tool.effectiveAccess;
                      const permissionAllowed = access?.permissionAllowed;
                      const runtimeStatus = access?.intrinsicStatus ?? tool.intrinsicStatus;
                      const runtimeCheckRequired =
                        access?.reasonCodes.includes("runtime_check_required") ?? false;
                      const setupReason = runtimeReasonLabel(
                        tool.setupReason ?? access?.setupReason,
                      );
                      const runtimeState = !this.accountId
                        ? null
                        : runtimeCheckRequired
                          ? {
                              label: ea("Cần kiểm tra điều kiện chạy"),
                              className: "ea-badge--warn",
                            }
                          : runtimeStatus === "ready"
                            ? { label: ea("Sẵn sàng"), className: "ea-badge--good" }
                            : runtimeStatus === "needs_setup"
                              ? { label: ea("Thiếu thành phần"), className: "ea-badge--warn" }
                              : runtimeStatus === "disabled"
                                ? { label: ea("Đã tắt"), className: "ea-badge--bad" }
                                : { label: ea("Chưa có dữ liệu"), className: "" };
                      return html`
                        <tr>
                          <td>
                            <strong>${tool.label ?? tool.toolId}</strong>
                            <div class="ea-muted">
                              ${tool.toolId}${tool.sessionDependent
                                ? ` · ${ea("session-dependent")}`
                                : ""}
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
                          <td>${tool.agentId ?? ea("Nhiều agent")}</td>
                          <td>
                            ${tool.nonDelegable
                              ? html`<span class="ea-badge ea-badge--bad"
                                  >${ea("Non-delegable")}</span
                                >`
                              : tool.assignable
                                ? html`<span class="ea-badge ea-badge--good"
                                    >${ea("Assignable")}</span
                                  >`
                                : html`<span class="ea-badge">${ea("Read-only")}</span>`}
                          </td>
                          <td>${tool.assignedUserCount}</td>
                          <td>
                            ${!this.accountId
                              ? "—"
                              : permissionAllowed === true
                                ? html`<span class="ea-badge ea-badge--good"
                                    >${ea("Đã cấp quyền")}</span
                                  >`
                                : permissionAllowed === false
                                  ? html`<span class="ea-badge ea-badge--bad"
                                      >${ea("Bị admin chặn")}</span
                                    >`
                                  : html`<span class="ea-badge">${ea("Chưa có dữ liệu")}</span>`}
                          </td>
                          <td>
                            ${runtimeState
                              ? html`<span class="ea-badge ${runtimeState.className}">
                                    ${runtimeState.label}
                                  </span>
                                  ${setupReason
                                    ? html`<div class="ea-muted">${setupReason}</div>`
                                    : nothing}`
                              : "—"}
                          </td>
                          <td class="ea-table__action">
                            <button
                              class="ea-button"
                              type="button"
                              ?disabled=${!tool.assignable}
                              title=${tool.assignable
                                ? ea("Quản lý user")
                                : ea("Tool này không thể cấp cho user")}
                              @click=${() => (this.selectedTool = tool)}
                            >
                              ${ea("Quản lý user")}
                            </button>
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
                ${this.tools.length === 0
                  ? html`<div class="ea-empty">${ea("Không có tool phù hợp.")}</div>`
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
