import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { icons } from "../../../components/icons.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  createAdminAccount,
  listAdminAccounts,
  loadAdminAccount,
  resetAdminAccountPassword,
  revokeAdminAccountSession,
  updateAdminAccount,
  type EnterpriseAccount,
  type EnterprisePageInfo,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage, formatDate } from "../utils.ts";
import "../components/admin-dialog.ts";

type AccountDetail = Awaited<ReturnType<typeof loadAdminAccount>>;

export class EnterpriseAdminAccountsPage extends OpenClawLightDomElement {
  @state() private accounts: EnterpriseAccount[] = [];
  @state() private pageInfo: EnterprisePageInfo = { total: 0, nextCursor: null };
  @state() private loading = true;
  @state() private error = "";
  @state() private createOpen = false;
  @state() private createStep: 1 | 2 = 1;
  @state() private createRole: "administrator" | "employee" = "employee";
  @state() private creating = false;
  @state() private selected?: AccountDetail;
  @state() private detailLoading = false;
  @state() private saving = false;
  @state() private drawerDirty = false;
  private query = "";
  private roleFilter = "";
  private status = "";
  private preset = "";
  private personalAgent = "";
  private sort = "username";
  private cursor = "";
  private previousCursors: string[] = [];
  private reloadTimer?: ReturnType<typeof globalThis.setTimeout>;

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  override disconnectedCallback(): void {
    if (this.reloadTimer) {
      globalThis.clearTimeout(this.reloadTimer);
    }
    super.disconnectedCallback();
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      const result = await listAdminAccounts({
        query: this.query,
        role: this.roleFilter,
        status: this.status,
        preset: this.preset,
        personalAgent: this.personalAgent,
        sort: this.sort,
        cursor: this.cursor,
        limit: "25",
      });
      this.accounts = result.accounts;
      this.pageInfo = result.pageInfo;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private scheduleLoad(): void {
    if (this.reloadTimer) {
      globalThis.clearTimeout(this.reloadTimer);
    }
    this.cursor = "";
    this.previousCursors = [];
    this.reloadTimer = globalThis.setTimeout(() => void this.load(), 250);
  }

  private resetAndLoad(): void {
    this.cursor = "";
    this.previousCursors = [];
    void this.load();
  }

  private nextPage(): void {
    if (!this.pageInfo.nextCursor) {
      return;
    }
    this.previousCursors.push(this.cursor);
    this.cursor = this.pageInfo.nextCursor;
    void this.load();
  }

  private previousPage(): void {
    const previous = this.previousCursors.pop();
    if (previous === undefined) {
      return;
    }
    this.cursor = previous;
    void this.load();
  }

  private async create(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (this.createStep === 1) {
      const data = new FormData(form);
      if (data.get("initialPassword") !== data.get("confirmPassword")) {
        this.error = "Mật khẩu xác nhận không khớp.";
        return;
      }
      this.error = "";
      this.createStep = 2;
      return;
    }
    const data = new FormData(form);
    this.creating = true;
    this.error = "";
    try {
      await createAdminAccount({
        username: String(data.get("username") ?? ""),
        displayName: String(data.get("displayName") ?? ""),
        initialPassword: String(data.get("initialPassword") ?? ""),
        role: String(data.get("role")) as "administrator" | "employee",
        enabled: data.get("enabled") === "on",
        personalAgentEnabled: data.get("personalAgentEnabled") === "on",
        defaultAgentId: String(data.get("defaultAgentId") ?? "").trim() || null,
        accessPresetKey: String(data.get("accessPresetKey") ?? "none"),
        skillGrants: String(data.get("skillGrants") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      });
      form.reset();
      this.createOpen = false;
      this.createStep = 1;
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.creating = false;
    }
  }

  private async openDetail(account: EnterpriseAccount): Promise<void> {
    this.detailLoading = true;
    this.drawerDirty = false;
    this.selected = {
      account,
      entitlements: [],
      effectivePolicy: {
        accountId: account.id,
        role: account.role,
        personalAgentEnabled: account.personalAgentEnabled,
        defaultAgentId: account.defaultAgentId,
        entitlements: [],
        employeeHardDeniedTools: [],
      },
      sessions: [],
    };
    try {
      this.selected = await loadAdminAccount(account.id);
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.detailLoading = false;
    }
  }

  private closeDetail(): void {
    if (this.drawerDirty && !globalThis.confirm("Bỏ các thay đổi chưa lưu?")) {
      return;
    }
    this.selected = undefined;
    this.drawerDirty = false;
  }

  private async saveDetail(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected) {
      return;
    }
    const data = new FormData(event.currentTarget as HTMLFormElement);
    this.saving = true;
    this.error = "";
    try {
      const result = await updateAdminAccount(this.selected.account.id, {
        displayName: String(data.get("displayName") ?? ""),
        role: String(data.get("role")) as "administrator" | "employee",
        enabled: data.get("enabled") === "on",
        personalAgentEnabled: data.get("personalAgentEnabled") === "on",
        defaultAgentId: String(data.get("defaultAgentId") ?? "").trim() || null,
        accessPresetKey: String(data.get("accessPresetKey") ?? "none"),
      });
      this.selected = { ...this.selected, account: result.account };
      this.drawerDirty = false;
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  private async resetPassword(): Promise<void> {
    if (!this.selected) {
      return;
    }
    const password = globalThis.prompt("Nhập mật khẩu tạm mới (tối thiểu 10 ký tự):");
    if (!password) {
      return;
    }
    try {
      await resetAdminAccountPassword(this.selected.account.id, password);
      this.selected = await loadAdminAccount(this.selected.account.id);
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  private async revokeSession(sessionId: string): Promise<void> {
    if (!this.selected) {
      return;
    }
    try {
      await revokeAdminAccountSession(this.selected.account.id, sessionId);
      this.selected = await loadAdminAccount(this.selected.account.id);
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  private renderCreateDialog() {
    return html`
      <openclaw-enterprise-admin-dialog
        .open=${true}
        heading="Tạo tài khoản"
        description="Bước ${this
          .createStep}/2 · tài khoản mới bắt buộc đổi mật khẩu khi đăng nhập lần đầu"
        .onClose=${() => {
          this.createOpen = false;
          this.createStep = 1;
        }}
      >
        <form class="ea-form-grid" @submit=${(event: SubmitEvent) => void this.create(event)}>
          <label class="ea-field">
            Username
            <input
              class="ea-input"
              name="username"
              required
              maxlength="64"
              ?readonly=${this.createStep === 2}
            />
          </label>
          <label class="ea-field">
            Tên hiển thị
            <input
              class="ea-input"
              name="displayName"
              required
              maxlength="128"
              ?readonly=${this.createStep === 2}
            />
          </label>
          <label class="ea-field">
            Role
            <select
              class="ea-select"
              name="role"
              .value=${this.createRole}
              ?disabled=${this.createStep === 2}
              @change=${(event: Event) => {
                this.createRole = (event.currentTarget as HTMLSelectElement).value as
                  | "administrator"
                  | "employee";
              }}
            >
              <option value="employee">Employee</option>
              <option value="administrator">Administrator</option>
            </select>
            ${this.createStep === 2
              ? html`<input type="hidden" name="role" value=${this.createRole} />`
              : nothing}
          </label>
          <label class="ea-switch-row">
            <span>Kích hoạt ngay</span>
            <input name="enabled" type="checkbox" checked />
          </label>
          <label class="ea-field">
            Mật khẩu tạm
            <input
              class="ea-input"
              name="initialPassword"
              type="password"
              minlength="10"
              required
              ?readonly=${this.createStep === 2}
            />
          </label>
          <label class="ea-field">
            Xác nhận mật khẩu
            <input
              class="ea-input"
              name="confirmPassword"
              type="password"
              minlength="10"
              required
              ?readonly=${this.createStep === 2}
            />
          </label>
          ${this.createStep === 2
            ? html`
                <label class="ea-switch-row ea-form-grid__full">
                  <span>
                    <strong>Personal agent</strong>
                    <span class="ea-muted">Workspace riêng, quyền filesystem 0700</span>
                  </span>
                  <input
                    name="personalAgentEnabled"
                    type="checkbox"
                    .checked=${this.createRole === "employee"}
                  />
                </label>
                <label class="ea-field">
                  Access preset
                  <select class="ea-select" name="accessPresetKey">
                    <option value="standard-coding@1" ?selected=${this.createRole === "employee"}>
                      Standard Coding v1
                    </option>
                    <option value="none" ?selected=${this.createRole === "administrator"}>
                      Không cấp preset
                    </option>
                  </select>
                </label>
                <label class="ea-field">
                  Shared/default agent
                  <input
                    class="ea-input"
                    name="defaultAgentId"
                    placeholder="Để trống để dùng personal agent"
                  />
                </label>
                <label class="ea-field ea-form-grid__full">
                  Skill ban đầu
                  <input
                    class="ea-input"
                    name="skillGrants"
                    placeholder="skill:global:source:key, … (không bắt buộc)"
                  />
                </label>
              `
            : nothing}
          ${this.error
            ? html`<p class="ea-error ea-form-grid__full" role="alert">${this.error}</p>`
            : nothing}
          <div class="ea-form-actions ea-form-grid__full">
            ${this.createStep === 2
              ? html`<button class="ea-button" type="button" @click=${() => (this.createStep = 1)}>
                  Quay lại
                </button>`
              : nothing}
            <button class="ea-button ea-button--primary" type="submit" ?disabled=${this.creating}>
              ${this.createStep === 1 ? "Tiếp tục" : this.creating ? "Đang tạo…" : "Tạo tài khoản"}
            </button>
          </div>
        </form>
      </openclaw-enterprise-admin-dialog>
    `;
  }

  private renderDetailDrawer() {
    const detail = this.selected;
    if (!detail) {
      return nothing;
    }
    const account = detail.account;
    return html`
      <openclaw-enterprise-admin-dialog
        .open=${true}
        .drawer=${true}
        heading=${account.displayName}
        description="@${account.username} · username không thể thay đổi"
        .onClose=${() => this.closeDetail()}
      >
        ${this.detailLoading
          ? html`<div class="ea-loading">Đang tải tài khoản…</div>`
          : html`
              <form
                class="ea-form-grid"
                @input=${() => (this.drawerDirty = true)}
                @change=${() => (this.drawerDirty = true)}
                @submit=${(event: SubmitEvent) => void this.saveDetail(event)}
              >
                <label class="ea-field ea-form-grid__full">
                  Tên hiển thị
                  <input
                    class="ea-input"
                    name="displayName"
                    .value=${account.displayName}
                    required
                  />
                </label>
                <label class="ea-field">
                  Role
                  <select class="ea-select" name="role" .value=${account.role}>
                    <option value="employee">Employee</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </label>
                <label class="ea-field">
                  Access preset
                  <select
                    class="ea-select"
                    name="accessPresetKey"
                    .value=${account.accessPresetKey}
                  >
                    <option value="standard-coding@1">Standard Coding v1</option>
                    <option value="none">Không cấp preset</option>
                  </select>
                </label>
                <label class="ea-switch-row">
                  <span>Đang hoạt động</span>
                  <input name="enabled" type="checkbox" .checked=${account.enabled} />
                </label>
                <label class="ea-switch-row">
                  <span>Personal agent</span>
                  <input
                    name="personalAgentEnabled"
                    type="checkbox"
                    .checked=${account.personalAgentEnabled}
                  />
                </label>
                <label class="ea-field ea-form-grid__full">
                  Default agent
                  <input
                    class="ea-input"
                    name="defaultAgentId"
                    .value=${account.defaultAgentId ?? ""}
                  />
                </label>
                <div class="ea-form-grid__full ea-stack">
                  <div class="ea-banner">
                    Policy revision ${account.policyRevision}. Role, trạng thái và reset mật khẩu sẽ
                    thu hồi session phù hợp.
                  </div>
                  <strong>Quyền effective</strong>
                  <div class="ea-code">${JSON.stringify(detail.effectivePolicy, null, 2)}</div>
                  <strong>Phiên đăng nhập (${detail.sessions.length})</strong>
                  <div class="ea-access-list">
                    ${detail.sessions.map(
                      (session) => html`
                        <div class="ea-access-row">
                          <div>
                            <strong>${String(session.audience ?? "legacy")}</strong>
                            <div class="ea-muted">
                              ${formatDate(Number(session.lastSeenAt ?? 0))} ·
                              ${session.revokedAt ? "đã thu hồi" : "đang hoạt động"}
                            </div>
                          </div>
                          <button
                            class="ea-button ea-button--danger"
                            type="button"
                            ?disabled=${Boolean(session.revokedAt)}
                            @click=${() => void this.revokeSession(String(session.id ?? ""))}
                          >
                            Thu hồi
                          </button>
                        </div>
                      `,
                    )}
                    ${detail.sessions.length === 0
                      ? html`<span class="ea-muted">Không có phiên đăng nhập.</span>`
                      : nothing}
                  </div>
                </div>
                ${this.error
                  ? html`<p class="ea-error ea-form-grid__full">${this.error}</p>`
                  : nothing}
                <div class="ea-form-actions ea-form-grid__full">
                  <button
                    class="ea-button ea-button--danger"
                    type="button"
                    @click=${() => void this.resetPassword()}
                  >
                    Reset mật khẩu
                  </button>
                  <button
                    class="ea-button ea-button--primary"
                    type="submit"
                    ?disabled=${this.saving}
                  >
                    ${this.saving ? "Đang lưu…" : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            `}
      </openclaw-enterprise-admin-dialog>
    `;
  }

  override render() {
    return html`
      <section class="ea-page">
        <header class="ea-page-header">
          <div>
            <h1>Quản lý tài khoản</h1>
            <p>${this.pageInfo.total} tài khoản · quyền truy cập và phiên đăng nhập Enterprise</p>
          </div>
          <button
            class="ea-button ea-button--primary"
            type="button"
            @click=${() => {
              this.error = "";
              this.createOpen = true;
            }}
          >
            ${icons.plus} Tạo tài khoản
          </button>
        </header>
        <div class="ea-toolbar">
          <input
            class="ea-input"
            type="search"
            placeholder="Tìm tên hoặc username…"
            aria-label="Tìm tài khoản"
            @input=${(event: Event) => {
              this.query = (event.currentTarget as HTMLInputElement).value;
              this.scheduleLoad();
            }}
          />
          <select
            class="ea-select"
            aria-label="Lọc role"
            @change=${(event: Event) => {
              this.roleFilter = (event.currentTarget as HTMLSelectElement).value;
              this.resetAndLoad();
            }}
          >
            <option value="">Tất cả role</option>
            <option value="administrator">Administrator</option>
            <option value="employee">Employee</option>
          </select>
          <select
            class="ea-select"
            aria-label="Lọc trạng thái"
            @change=${(event: Event) => {
              this.status = (event.currentTarget as HTMLSelectElement).value;
              this.resetAndLoad();
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="enabled">Đang hoạt động</option>
            <option value="disabled">Đã khóa</option>
          </select>
          <select
            class="ea-select"
            aria-label="Lọc preset"
            @change=${(event: Event) => {
              this.preset = (event.currentTarget as HTMLSelectElement).value;
              this.resetAndLoad();
            }}
          >
            <option value="">Tất cả preset</option>
            <option value="standard-coding@1">Standard Coding v1</option>
            <option value="none">Không có preset</option>
          </select>
          <select
            class="ea-select"
            aria-label="Lọc personal agent"
            @change=${(event: Event) => {
              this.personalAgent = (event.currentTarget as HTMLSelectElement).value;
              this.resetAndLoad();
            }}
          >
            <option value="">Tất cả personal agent</option>
            <option value="enabled">Đã bật personal agent</option>
            <option value="disabled">Không có personal agent</option>
          </select>
          <span class="ea-spacer"></span>
          <select
            class="ea-select"
            aria-label="Sắp xếp"
            @change=${(event: Event) => {
              this.sort = (event.currentTarget as HTMLSelectElement).value;
              this.resetAndLoad();
            }}
          >
            <option value="username">Username A–Z</option>
            <option value="-updatedAt">Mới cập nhật</option>
            <option value="-lastLoginAt">Đăng nhập gần nhất</option>
          </select>
        </div>
        <div class="ea-card ea-table-wrap">
          ${this.loading
            ? html`<div class="ea-loading">Đang tải danh sách tài khoản…</div>`
            : this.error
              ? html`<div class="ea-empty">
                  <p class="ea-error">${this.error}</p>
                  <button class="ea-button" @click=${() => void this.load()}>Thử lại</button>
                </div>`
              : html`
                  <table class="ea-table">
                    <thead>
                      <tr>
                        <th><input type="checkbox" aria-label="Chọn tất cả" /></th>
                        <th>Tài khoản</th>
                        <th>Role</th>
                        <th>Trạng thái</th>
                        <th>Agent</th>
                        <th>Access preset</th>
                        <th>Đăng nhập cuối</th>
                        <th>Cập nhật</th>
                        <th class="ea-table__action">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.accounts.map(
                        (account) => html`
                          <tr @click=${() => void this.openDetail(account)}>
                            <td @click=${(event: Event) => event.stopPropagation()}>
                              <input type="checkbox" aria-label="Chọn ${account.username}" />
                            </td>
                            <td>
                              <strong>${account.displayName}</strong>
                              <div class="ea-muted">@${account.username}</div>
                            </td>
                            <td>${account.role}</td>
                            <td>
                              <span
                                class="ea-badge ${account.enabled
                                  ? "ea-badge--good"
                                  : "ea-badge--bad"}"
                                >${account.enabled ? "Hoạt động" : "Đã khóa"}</span
                              >
                            </td>
                            <td>
                              ${account.personalAgentEnabled
                                ? "Personal"
                                : (account.defaultAgentId ?? "—")}
                            </td>
                            <td><span class="ea-badge">${account.accessPresetKey}</span></td>
                            <td>${formatDate(account.lastLoginAt)}</td>
                            <td>${formatDate(account.updatedAt)}</td>
                            <td class="ea-table__action">
                              <button class="ea-button" type="button">Xem</button>
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                  ${this.accounts.length === 0
                    ? html`<div class="ea-empty">Không có tài khoản phù hợp.</div>`
                    : nothing}
                `}
        </div>
        <div class="ea-toolbar" style="justify-content: flex-end; margin-top: 14px">
          <span class="ea-muted">Trang ${this.previousCursors.length + 1}</span>
          <button
            class="ea-button"
            type="button"
            ?disabled=${this.previousCursors.length === 0}
            @click=${() => this.previousPage()}
          >
            Trước
          </button>
          <button
            class="ea-button"
            type="button"
            ?disabled=${!this.pageInfo.nextCursor}
            @click=${() => this.nextPage()}
          >
            Sau
          </button>
        </div>
      </section>
      ${this.createOpen ? this.renderCreateDialog() : nothing} ${this.renderDetailDrawer()}
    `;
  }
}

if (!customElements.get("openclaw-enterprise-admin-accounts-page")) {
  customElements.define("openclaw-enterprise-admin-accounts-page", EnterpriseAdminAccountsPage);
}
