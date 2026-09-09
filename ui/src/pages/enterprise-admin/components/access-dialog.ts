import { html, nothing } from "lit";
import type { PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { ea } from "../../../i18n/enterprise-admin.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  applyAdminAccessChanges,
  listAdminAccounts,
  loadAdminResourceAccess,
  type EnterpriseAccount,
  type EnterpriseAccessPreset,
  type EnterpriseEntitlementEffect,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage } from "../utils.ts";
import "./admin-dialog.ts";

type AssignmentValue = EnterpriseEntitlementEffect | "none";

export class EnterpriseAccessDialog extends OpenClawLightDomElement {
  @property({ type: Boolean }) open = false;
  @property() resourceType: "skill" | "tool" | "agent" = "skill";
  @property() resourceKey = "";
  @property() resourceName = "";
  @property({ attribute: false }) onClose?: () => void;
  @property({ attribute: false }) onSaved?: () => void;
  @state() private accounts: EnterpriseAccount[] = [];
  @state() private query = "";
  @state() private accessPresets: EnterpriseAccessPreset[] = [];
  @state() private assignments = new Map<string, AssignmentValue>();
  @state() private original = new Map<string, AssignmentValue>();
  @state() private busy = false;
  @state() private loading = false;
  @state() private searching = false;
  @state() private error = "";
  private accountsById = new Map<string, EnterpriseAccount>();
  private accountReloadTimer?: ReturnType<typeof globalThis.setTimeout>;
  private accountRequestId = 0;

  protected override updated(changed: PropertyValues<this>): void {
    if (this.open && (changed.has("open") || changed.has("resourceKey")) && this.resourceKey) {
      void this.load();
    }
  }

  override disconnectedCallback(): void {
    if (this.accountReloadTimer) {
      globalThis.clearTimeout(this.accountReloadTimer);
    }
    super.disconnectedCallback();
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.searching = false;
    this.error = "";
    this.query = "";
    if (this.accountReloadTimer) {
      globalThis.clearTimeout(this.accountReloadTimer);
      this.accountReloadTimer = undefined;
    }
    this.accountsById.clear();
    const requestId = ++this.accountRequestId;
    try {
      const [accountsResult, access] = await Promise.all([
        listAdminAccounts({ role: "employee", limit: "100" }),
        loadAdminResourceAccess(this.resourceType, this.resourceKey),
      ]);
      if (requestId !== this.accountRequestId) {
        return;
      }
      this.accounts = accountsResult.accounts;
      for (const account of this.accounts) {
        this.accountsById.set(account.id, account);
      }
      this.accessPresets = accountsResult.accessPresets ?? [];
      const map = new Map<string, AssignmentValue>();
      for (const account of this.accounts) {
        map.set(account.id, "none");
      }
      for (const item of access.assignments) {
        if (item.accountId) {
          map.set(item.accountId, item.effect);
        }
      }
      this.assignments = map;
      this.original = new Map(map);
    } catch (error) {
      if (requestId === this.accountRequestId) {
        this.error = errorMessage(error);
      }
    } finally {
      if (requestId === this.accountRequestId) {
        this.loading = false;
      }
    }
  }

  private async loadAccountsForQuery(): Promise<void> {
    const requestId = ++this.accountRequestId;
    this.searching = true;
    this.error = "";
    try {
      const result = await listAdminAccounts({
        role: "employee",
        limit: "100",
        query: this.query.trim(),
      });
      if (requestId !== this.accountRequestId) {
        return;
      }
      this.accounts = result.accounts;
      this.accessPresets = result.accessPresets ?? this.accessPresets;
      const assignments = new Map(this.assignments);
      const original = new Map(this.original);
      for (const account of result.accounts) {
        this.accountsById.set(account.id, account);
        if (!assignments.has(account.id)) {
          assignments.set(account.id, "none");
        }
        if (!original.has(account.id)) {
          original.set(account.id, assignments.get(account.id) ?? "none");
        }
      }
      this.assignments = assignments;
      this.original = original;
    } catch (error) {
      if (requestId === this.accountRequestId) {
        this.error = errorMessage(error);
      }
    } finally {
      if (requestId === this.accountRequestId) {
        this.searching = false;
      }
    }
  }

  private scheduleAccountLoad(): void {
    if (this.accountReloadTimer) {
      globalThis.clearTimeout(this.accountReloadTimer);
    }
    this.accountRequestId += 1;
    this.accountReloadTimer = globalThis.setTimeout(() => void this.loadAccountsForQuery(), 250);
  }

  private setAssignment(accountId: string, value: AssignmentValue): void {
    this.assignments = new Map(this.assignments).set(accountId, value);
  }

  private async save(): Promise<void> {
    const changes = [...this.accountsById.values()]
      .filter((account) => this.assignments.get(account.id) !== this.original.get(account.id))
      .map((account) => ({
        accountId: account.id,
        resourceType: this.resourceType,
        resourceKey: this.resourceKey,
        effect:
          this.assignments.get(account.id) === "none"
            ? null
            : (this.assignments.get(account.id) as EnterpriseEntitlementEffect),
      }));
    if (changes.length === 0) {
      this.onClose?.();
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await applyAdminAccessChanges({
        changes,
        baseRevisions: Object.fromEntries(
          [...this.accountsById.values()]
            .filter((account) => changes.some((change) => change.accountId === account.id))
            .map((account) => [account.id, account.policyRevision]),
        ),
      });
      this.onSaved?.();
      this.onClose?.();
    } catch (error) {
      this.error = errorMessage(error);
      if ((error as { code?: string }).code === "POLICY_REVISION_CONFLICT") {
        await this.load();
      }
    } finally {
      this.busy = false;
    }
  }

  override render() {
    if (!this.open) {
      return nothing;
    }
    const visibleAccounts = this.accounts;
    return html`
      <openclaw-enterprise-admin-dialog
        .open=${this.open}
        .heading=${ea("Quản lý user")}
        .description=${`${this.resourceName} · ${ea("thay đổi có hiệu lực từ request kế tiếp")}`}
        .onClose=${this.onClose}
      >
        ${this.loading
          ? html`<div class="ea-loading">${ea("Đang tải quyền truy cập…")}</div>`
          : html`
              <div class="ea-stack">
                <label class="ea-field">
                  <span>${ea("Tìm tài khoản")}</span>
                  <input
                    class="ea-input"
                    type="search"
                    placeholder=${ea("Tìm tên hoặc username…")}
                    aria-label=${ea("Tìm tài khoản")}
                    aria-busy=${this.searching ? "true" : "false"}
                    .value=${this.query}
                    @input=${(event: Event) => {
                      this.query = (event.currentTarget as HTMLInputElement).value;
                      this.scheduleAccountLoad();
                    }}
                  />
                </label>
                <div class="ea-access-list">
                  ${visibleAccounts.map((account) => {
                    const current = this.assignments.get(account.id) ?? "none";
                    return html`
                      <div class="ea-access-row">
                        <div>
                          <strong>${account.displayName}</strong>
                          <div class="ea-muted">
                            @${account.username} ·
                            ${this.accessPresets.find(
                              (preset) => preset.key === account.accessPresetKey,
                            )?.label ?? account.accessPresetKey}
                          </div>
                        </div>
                        <div
                          class="ea-access-options"
                          role="radiogroup"
                          aria-label=${`${ea("Quyền của người dùng")}: ${account.username}`}
                        >
                          ${(["allow", "deny", "none"] as const).map(
                            (effect) => html`
                              <label>
                                <input
                                  type="radio"
                                  name="access-${account.id}"
                                  value=${effect}
                                  .checked=${current === effect}
                                  @change=${() => this.setAssignment(account.id, effect)}
                                />
                                <span
                                  >${effect === "allow"
                                    ? ea("Cho phép")
                                    : effect === "deny"
                                      ? ea("Từ chối")
                                      : ea("Theo preset")}</span
                                >
                              </label>
                            `,
                          )}
                        </div>
                      </div>
                    `;
                  })}
                  ${visibleAccounts.length === 0
                    ? html`<div class="ea-empty">
                        ${this.query.trim()
                          ? ea("Không có tài khoản phù hợp.")
                          : ea("Chưa có tài khoản employee.")}
                      </div>`
                    : ""}
                </div>
              </div>
              ${this.error ? html`<p class="ea-error" role="alert">${this.error}</p>` : ""}
              <div class="ea-form-actions">
                <button class="ea-button" type="button" @click=${this.onClose}>${ea("Hủy")}</button>
                <button
                  class="ea-button ea-button--primary"
                  type="button"
                  ?disabled=${this.busy}
                  @click=${() => void this.save()}
                >
                  ${this.busy ? ea("Đang lưu…") : ea("Lưu quyền")}
                </button>
              </div>
            `}
      </openclaw-enterprise-admin-dialog>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-access-dialog")) {
  customElements.define("openclaw-enterprise-access-dialog", EnterpriseAccessDialog);
}
