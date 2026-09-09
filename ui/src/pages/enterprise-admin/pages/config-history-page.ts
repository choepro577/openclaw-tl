import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { ea } from "../../../i18n/enterprise-admin.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  loadAdminAudit,
  loadAdminConfig,
  loadAdminConfigHistory,
  rollbackAdminConfig,
  type EnterpriseAuditEvent,
  type EnterpriseConfigSnapshot,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage, formatDate } from "../utils.ts";
import "../components/admin-dialog.ts";

type RollbackNotice = { slot: string; hash: string };

export class EnterpriseAdminConfigHistoryPage extends OpenClawLightDomElement {
  @state() private history: Array<Record<string, unknown>> = [];
  @state() private audit: EnterpriseAuditEvent[] = [];
  @state() private config?: EnterpriseConfigSnapshot;
  @state() private auditQuery = "";
  @state() private auditTarget = "";
  @state() private auditFrom = "";
  @state() private loading = true;
  @state() private busy = false;
  @state() private error = "";
  @state() private notice: RollbackNotice | null = null;
  @state() private rollbackSlot: number | null = null;
  @state() private rollbackConfirmation = "";

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      const [history, audit, config] = await Promise.all([
        loadAdminConfigHistory(),
        loadAdminAudit(),
        loadAdminConfig(),
      ]);
      this.history = history.backups;
      this.audit = audit.events;
      this.config = config;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private openRollback(slot: number): void {
    this.rollbackSlot = slot;
    this.rollbackConfirmation = "";
    this.error = "";
    this.notice = null;
  }

  private closeRollback(): void {
    if (!this.busy) {
      this.rollbackSlot = null;
      this.rollbackConfirmation = "";
    }
  }

  private async rollback(): Promise<void> {
    if (this.rollbackSlot === null || !this.config || this.rollbackConfirmation !== "ROLLBACK") {
      return;
    }
    const slot = this.rollbackSlot;
    this.busy = true;
    this.error = "";
    try {
      const result = await rollbackAdminConfig(slot, this.config.hash);
      this.rollbackSlot = null;
      this.rollbackConfirmation = "";
      this.notice = { slot: String(slot), hash: result.hash };
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  private filteredAudit(): EnterpriseAuditEvent[] {
    const from = this.auditFrom ? new Date(this.auditFrom).getTime() : 0;
    return this.audit.filter(
      (event) =>
        (!this.auditQuery ||
          event.action.toLowerCase().includes(this.auditQuery.toLowerCase()) ||
          (event.actorAccountId ?? "").toLowerCase().includes(this.auditQuery.toLowerCase())) &&
        (!this.auditTarget ||
          `${event.targetType}:${event.targetId ?? ""}`
            .toLowerCase()
            .includes(this.auditTarget.toLowerCase())) &&
        (!from ||
          (event.createdAt < 10_000_000_000 ? event.createdAt * 1000 : event.createdAt) >= from),
    );
  }

  override render() {
    const audit = this.filteredAudit();
    return html`<section class="ea-page">
        <header class="ea-page-header">
          <div>
            <h1>${ea("Lịch sử thay đổi & kiểm toán")}</h1>
            <p>${ea("Config backup, rollback có CAS và lịch sử thao tác quản trị.")}</p>
          </div>
          <button
            class="ea-button"
            type="button"
            ?disabled=${this.busy}
            @click=${() => void this.load()}
          >
            ${ea("Làm mới")}
          </button>
        </header>
        <div class="ea-toolbar">
          <input
            class="ea-input"
            placeholder=${ea("Lọc actor / action…")}
            aria-label=${ea("Lọc actor hoặc action")}
            @input=${(event: Event) =>
              (this.auditQuery = (event.currentTarget as HTMLInputElement).value)}
          />
          <input
            class="ea-input"
            placeholder=${ea("Lọc target…")}
            aria-label=${ea("Lọc target")}
            @input=${(event: Event) =>
              (this.auditTarget = (event.currentTarget as HTMLInputElement).value)}
          />
          <label class="ea-field ea-field--inline"
            >${ea("Từ ngày")}<input
              class="ea-input"
              type="date"
              @change=${(event: Event) =>
                (this.auditFrom = (event.currentTarget as HTMLInputElement).value)}
          /></label>
        </div>
        ${this.loading
          ? html`<div class="ea-loading">${ea("Đang tải lịch sử…")}</div>`
          : html`<div class="ea-two-column">
              <div class="ea-card ea-table-wrap">
                <table class="ea-table ea-table--history">
                  <thead>
                    <tr>
                      <th>${ea("Config revision/backup")}</th>
                      <th>${ea("Thời gian")}</th>
                      <th>${ea("Hash/size")}</th>
                      <th>${ea("Thao tác")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.history.map(
                      (item) => html`<tr>
                        <td>${ea("Backup")} ${String(item.slot ?? "—")}</td>
                        <td>${formatDate(Number(item.updatedAt ?? 0))}</td>
                        <td>${String(item.hash ?? item.size ?? "—")}</td>
                        <td>
                          <button
                            class="ea-button ea-button--danger"
                            type="button"
                            ?disabled=${this.busy}
                            @click=${() => this.openRollback(Number(item.slot))}
                          >
                            ${ea("Rollback")}
                          </button>
                        </td>
                      </tr>`,
                    )}
                  </tbody>
                </table>
                ${this.history.length === 0
                  ? html`<div class="ea-empty">${ea("Chưa có config backup.")}</div>`
                  : nothing}
              </div>
              <div class="ea-card ea-table-wrap">
                <table class="ea-table ea-table--audit">
                  <thead>
                    <tr>
                      <th>${ea("Audit action")}</th>
                      <th>${ea("Target")}</th>
                      <th>${ea("Actor")}</th>
                      <th>${ea("Thời gian")}</th>
                      <th>${ea("Kết quả")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${audit.map(
                      (event) => html`<tr>
                        <td>${event.action}</td>
                        <td>${event.targetType}:${event.targetId ?? "—"}</td>
                        <td>${event.actorAccountId ?? "system"}</td>
                        <td>${formatDate(event.createdAt)}</td>
                        <td>
                          <span
                            class="ea-badge ${event.outcome === "success"
                              ? "ea-badge--good"
                              : "ea-badge--bad"}"
                            >${event.outcome}</span
                          >
                        </td>
                      </tr>`,
                    )}
                  </tbody>
                </table>
                ${audit.length === 0
                  ? html`<div class="ea-empty">${ea("Không có audit event phù hợp.")}</div>`
                  : nothing}
              </div>
            </div>`}
        ${this.error ? html`<p class="ea-error" role="alert">${this.error}</p>` : nothing}
        ${this.notice
          ? html`<p class="ea-success" role="status">
              ${ea("Đã khôi phục backup {slot}. Config hash mới: {hash}.", this.notice)}
            </p>`
          : nothing}
      </section>
      ${this.rollbackSlot !== null
        ? html`<openclaw-enterprise-admin-dialog
            .open=${true}
            .heading=${ea("Xác nhận rollback config")}
            .description=${`${ea("Backup")} ${this.rollbackSlot} sẽ thay thế config hiện tại nếu CAS hash còn hợp lệ.`}
            .canClose=${() => !this.busy}
            .onClose=${() => this.closeRollback()}
          >
            <div class="ea-stack">
              <div class="ea-banner">
                ${ea("Thao tác có thể yêu cầu Gateway reload hoặc restart.")}
              </div>
              <label class="ea-field"
                >${ea("Gõ ROLLBACK để xác nhận")}
                <input
                  class="ea-input"
                  autocomplete="off"
                  .value=${this.rollbackConfirmation}
                  @input=${(event: Event) =>
                    (this.rollbackConfirmation = (event.currentTarget as HTMLInputElement).value)}
                />
              </label>
              ${this.error ? html`<p class="ea-error" role="alert">${this.error}</p>` : nothing}
              <div class="ea-form-actions">
                <button
                  class="ea-button"
                  type="button"
                  ?disabled=${this.busy}
                  @click=${() => this.closeRollback()}
                >
                  ${ea("Hủy")}
                </button>
                <button
                  class="ea-button ea-button--danger"
                  type="button"
                  ?disabled=${this.busy || this.rollbackConfirmation !== "ROLLBACK"}
                  @click=${() => void this.rollback()}
                >
                  ${this.busy ? ea("Đang rollback…") : ea("Rollback với CAS")}
                </button>
              </div>
            </div>
          </openclaw-enterprise-admin-dialog>`
        : nothing}`;
  }
}

if (!customElements.get("openclaw-enterprise-admin-config-history-page")) {
  customElements.define(
    "openclaw-enterprise-admin-config-history-page",
    EnterpriseAdminConfigHistoryPage,
  );
}
