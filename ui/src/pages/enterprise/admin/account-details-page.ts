import { html } from "lit";
import { property, state } from "lit/decorators.js";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  loadEnterpriseAccount,
  replaceEnterpriseEntitlements,
  resetEnterprisePassword,
  updateEnterpriseAccount,
  type EnterpriseAccount,
  type EnterpriseEffectivePolicy,
  type EnterpriseEntitlement,
} from "../services/enterprise-api.ts";
import { readEnterpriseFormString } from "../services/form-data.ts";
import "./effective-policy-page.ts";

export class EnterpriseAccountDetailsPage extends OpenClawLightDomElement {
  @property({ attribute: false }) account?: EnterpriseAccount;
  @state() private current?: EnterpriseAccount;
  @state() private entitlements: EnterpriseEntitlement[] = [];
  @state() private policy?: EnterpriseEffectivePolicy;
  @state() private error = "";
  @state() private success = "";

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("account") && this.account) {
      void this.load(this.account.id);
    }
  }

  private async load(accountId: string): Promise<void> {
    try {
      const detail = await loadEnterpriseAccount(accountId);
      this.current = detail.account;
      this.entitlements = detail.entitlements;
      this.policy = detail.effectivePolicy;
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Không thể tải chi tiết.";
    }
  }

  private async saveAccount(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.current) {
      return;
    }
    const data = new FormData(event.currentTarget as HTMLFormElement);
    try {
      this.current = await updateEnterpriseAccount(this.current.id, {
        displayName: readEnterpriseFormString(data, "displayName"),
        role: readEnterpriseFormString(data, "role") as EnterpriseAccount["role"],
        enabled: data.get("enabled") === "on",
        personalAgentEnabled: data.get("personalAgentEnabled") === "on",
        defaultAgentId: readEnterpriseFormString(data, "defaultAgentId").trim() || null,
      });
      await this.load(this.current.id);
      this.success = "Đã lưu tài khoản.";
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Không thể lưu.";
    }
  }

  private async addEntitlement(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.current) {
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const next = [
      ...this.entitlements.filter(
        (item) =>
          !(
            item.resourceType === readEnterpriseFormString(data, "resourceType") &&
            item.resourceId === readEnterpriseFormString(data, "resourceId")
          ),
      ),
      {
        resourceType: readEnterpriseFormString(
          data,
          "resourceType",
        ) as EnterpriseEntitlement["resourceType"],
        resourceId: readEnterpriseFormString(data, "resourceId"),
        effect: readEnterpriseFormString(data, "effect") as EnterpriseEntitlement["effect"],
      },
    ];
    try {
      this.entitlements = await replaceEnterpriseEntitlements(this.current.id, next);
      form.reset();
      await this.load(this.current.id);
      this.success = "Đã cập nhật quyền.";
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Không thể cập nhật quyền.";
    }
  }

  private async removeEntitlement(index: number): Promise<void> {
    if (!this.current) {
      return;
    }
    this.entitlements = await replaceEnterpriseEntitlements(
      this.current.id,
      this.entitlements.filter((_, currentIndex) => currentIndex !== index),
    );
    await this.load(this.current.id);
  }

  private async resetPassword(): Promise<void> {
    if (!this.current) {
      return;
    }
    const password = globalThis.prompt("Nhập mật khẩu tạm mới (ít nhất 10 ký tự):");
    if (!password) {
      return;
    }
    try {
      await resetEnterprisePassword(this.current.id, password);
      this.success = "Đã reset mật khẩu và thu hồi toàn bộ session.";
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Không thể reset mật khẩu.";
    }
  }

  override render() {
    if (!this.current) {
      return html`<section class="enterprise-panel">
        <p class="enterprise-muted">Chọn một tài khoản để quản lý.</p>
      </section>`;
    }
    return html`
      <section class="enterprise-panel enterprise-stack">
        <h2>${this.current.displayName}</h2>
        ${this.error ? html`<p class="enterprise-error">${this.error}</p>` : ""}
        ${this.success ? html`<p class="enterprise-success">${this.success}</p>` : ""}
        <form
          class="enterprise-form"
          @submit=${(event: SubmitEvent) => void this.saveAccount(event)}
        >
          <label class="enterprise-field"
            >Tên hiển thị<input
              class="enterprise-input"
              name="displayName"
              .value=${this.current.displayName}
              required
          /></label>
          <label class="enterprise-field"
            >Role<select class="enterprise-select" name="role">
              <option value="employee" ?selected=${this.current.role === "employee"}>
                Employee
              </option>
              <option value="administrator" ?selected=${this.current.role === "administrator"}>
                Administrator
              </option>
            </select></label
          >
          <label class="enterprise-field"
            >Agent mặc định<input
              class="enterprise-input"
              name="defaultAgentId"
              .value=${this.current.defaultAgentId ?? ""}
              placeholder="main"
          /></label>
          <label
            ><input name="enabled" type="checkbox" ?checked=${this.current.enabled} /> Tài khoản
            hoạt động</label
          >
          <label
            ><input
              name="personalAgentEnabled"
              type="checkbox"
              ?checked=${this.current.personalAgentEnabled}
            />
            Bật Personal Agent</label
          >
          <div class="enterprise-actions">
            <button class="enterprise-button" type="submit">Lưu tài khoản</button
            ><button
              class="enterprise-button enterprise-button--secondary"
              type="button"
              @click=${() => void this.resetPassword()}
            >
              Reset mật khẩu
            </button>
          </div>
        </form>
      </section>
      <section class="enterprise-panel enterprise-stack">
        <h3>Cấp Agent, Skill và Tool</h3>
        <form
          class="enterprise-row"
          @submit=${(event: SubmitEvent) => void this.addEntitlement(event)}
        >
          <select class="enterprise-select" name="resourceType">
            <option value="agent">Agent</option>
            <option value="skill">Skill</option>
            <option value="tool">Tool</option>
          </select>
          <input class="enterprise-input" name="resourceId" placeholder="Resource ID" required />
          <select class="enterprise-select" name="effect">
            <option value="allow">Allow</option>
            <option value="deny">Deny</option>
          </select>
          <button class="enterprise-button" type="submit">Thêm / thay thế</button>
        </form>
        <table class="enterprise-table">
          <thead>
            <tr>
              <th>Loại</th>
              <th>ID</th>
              <th>Quyền</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${this.entitlements.map(
              (item, index) =>
                html`<tr>
                  <td>${item.resourceType}</td>
                  <td class="enterprise-code">${item.resourceId}</td>
                  <td>${item.effect}</td>
                  <td>
                    <button
                      class="enterprise-button enterprise-button--secondary"
                      @click=${() => void this.removeEntitlement(index)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>`,
            )}
          </tbody>
        </table>
      </section>
      <openclaw-enterprise-effective-policy-page
        .policy=${this.policy}
      ></openclaw-enterprise-effective-policy-page>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-account-details-page")) {
  customElements.define("openclaw-enterprise-account-details-page", EnterpriseAccountDetailsPage);
}
