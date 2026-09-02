import { html, nothing } from "lit";
import type { PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  applyAdminAccessChanges,
  listAdminAccounts,
  loadAdminResourceAccess,
  type EnterpriseAccount,
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
  @state() private assignments = new Map<string, AssignmentValue>();
  @state() private original = new Map<string, AssignmentValue>();
  @state() private busy = false;
  @state() private loading = false;
  @state() private error = "";

  protected override updated(changed: PropertyValues<this>): void {
    if (this.open && (changed.has("open") || changed.has("resourceKey")) && this.resourceKey) {
      void this.load();
    }
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      const [accountsResult, access] = await Promise.all([
        listAdminAccounts({ role: "employee", limit: "100" }),
        loadAdminResourceAccess(this.resourceType, this.resourceKey),
      ]);
      this.accounts = accountsResult.accounts;
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
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private setAssignment(accountId: string, value: AssignmentValue): void {
    this.assignments = new Map(this.assignments).set(accountId, value);
  }

  private async save(): Promise<void> {
    const changes = this.accounts
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
          this.accounts
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
    return html`
      <openclaw-enterprise-admin-dialog
        .open=${this.open}
        heading="Quản lý user"
        description="${this.resourceName} · thay đổi có hiệu lực từ request kế tiếp"
        .onClose=${this.onClose}
      >
        ${this.loading
          ? html`<div class="ea-loading">Đang tải quyền truy cập…</div>`
          : html`
              <div class="ea-access-list">
                ${this.accounts.map((account) => {
                  const current = this.assignments.get(account.id) ?? "none";
                  return html`
                    <div class="ea-access-row">
                      <div>
                        <strong>${account.displayName}</strong>
                        <div class="ea-muted">
                          @${account.username} · ${account.accessPresetKey}
                        </div>
                      </div>
                      <div
                        class="ea-access-options"
                        role="radiogroup"
                        aria-label="Quyền của ${account.username}"
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
                                  ? "Cho phép"
                                  : effect === "deny"
                                    ? "Từ chối"
                                    : "Theo preset"}</span
                              >
                            </label>
                          `,
                        )}
                      </div>
                    </div>
                  `;
                })}
                ${this.accounts.length === 0
                  ? html`<div class="ea-empty">Chưa có tài khoản employee.</div>`
                  : ""}
              </div>
              ${this.error ? html`<p class="ea-error" role="alert">${this.error}</p>` : ""}
              <div class="ea-form-actions">
                <button class="ea-button" type="button" @click=${this.onClose}>Hủy</button>
                <button
                  class="ea-button ea-button--primary"
                  type="button"
                  ?disabled=${this.busy}
                  @click=${() => void this.save()}
                >
                  ${this.busy ? "Đang lưu…" : "Lưu quyền"}
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
