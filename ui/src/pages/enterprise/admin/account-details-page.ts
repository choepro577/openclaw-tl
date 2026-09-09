import { html } from "lit";
import { property, state } from "lit/decorators.js";
import { showNativePrompt } from "../../../branding/display-dialog.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  enterpriseCopy,
  enterpriseEffectLabel,
  enterpriseResourceTypeLabel,
  enterpriseRoleLabel,
} from "../enterprise-copy.ts";
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
      this.error = error instanceof Error ? error.message : enterpriseCopy("accountLoadFailed");
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
      this.success = enterpriseCopy("accountSaveSuccess");
    } catch (error) {
      this.error = error instanceof Error ? error.message : enterpriseCopy("accountSaveFailed");
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
      this.success = enterpriseCopy("entitlementUpdateSuccess");
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : enterpriseCopy("entitlementUpdateFailed");
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
    const password = showNativePrompt(enterpriseCopy("resetPasswordPrompt"));
    if (!password) {
      return;
    }
    try {
      await resetEnterprisePassword(this.current.id, password);
      this.success = enterpriseCopy("resetPasswordSuccess");
    } catch (error) {
      this.error = error instanceof Error ? error.message : enterpriseCopy("resetPasswordFailed");
    }
  }

  override render() {
    if (!this.current) {
      return html`<section class="enterprise-panel">
        <p class="enterprise-muted">${enterpriseCopy("selectAccount")}</p>
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
            >${enterpriseCopy("displayName")}<input
              class="enterprise-input"
              name="displayName"
              .value=${this.current.displayName}
              required
          /></label>
          <label class="enterprise-field"
            >${eu("role")}<select class="enterprise-select" name="role">
              <option value="employee" ?selected=${this.current.role === "employee"}>
                ${enterpriseRoleLabel("employee")}
              </option>
              <option value="administrator" ?selected=${this.current.role === "administrator"}>
                ${enterpriseRoleLabel("administrator")}
              </option>
            </select></label
          >
          <label class="enterprise-field"
            >${enterpriseCopy("defaultAgent")}<input
              class="enterprise-input"
              name="defaultAgentId"
              .value=${this.current.defaultAgentId ?? ""}
              placeholder="main"
          /></label>
          <label
            ><input name="enabled" type="checkbox" ?checked=${this.current.enabled} />
            ${enterpriseCopy("accountEnabled")}</label
          >
          <label
            ><input
              name="personalAgentEnabled"
              type="checkbox"
              ?checked=${this.current.personalAgentEnabled}
            />
            ${enterpriseCopy("personalAgentEnabled")}</label
          >
          <div class="enterprise-actions">
            <button class="enterprise-button" type="submit">${enterpriseCopy("saveAccount")}</button
            ><button
              class="enterprise-button enterprise-button--secondary"
              type="button"
              @click=${() => void this.resetPassword()}
            >
              ${enterpriseCopy("resetPassword")}
            </button>
          </div>
        </form>
      </section>
      <section class="enterprise-panel enterprise-stack">
        <h3>${enterpriseCopy("entitlementsTitle")}</h3>
        <form
          class="enterprise-row"
          @submit=${(event: SubmitEvent) => void this.addEntitlement(event)}
        >
          <select class="enterprise-select" name="resourceType">
            <option value="agent">${enterpriseResourceTypeLabel("agent")}</option>
            <option value="skill">${enterpriseResourceTypeLabel("skill")}</option>
            <option value="tool">${enterpriseResourceTypeLabel("tool")}</option>
          </select>
          <input
            class="enterprise-input"
            name="resourceId"
            placeholder=${enterpriseCopy("resourceId")}
            required
          />
          <select class="enterprise-select" name="effect">
            <option value="allow">${enterpriseCopy("allow")}</option>
            <option value="deny">${enterpriseCopy("deny")}</option>
          </select>
          <button class="enterprise-button" type="submit">${enterpriseCopy("addOrReplace")}</button>
        </form>
        <table class="enterprise-table">
          <thead>
            <tr>
              <th>${enterpriseCopy("resourceType")}</th>
              <th>ID</th>
              <th>${enterpriseCopy("permission")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${this.entitlements.map(
              (item, index) =>
                html`<tr>
                  <td>${enterpriseResourceTypeLabel(item.resourceType)}</td>
                  <td class="enterprise-code">${item.resourceId}</td>
                  <td>${enterpriseEffectLabel(item.effect)}</td>
                  <td>
                    <button
                      class="enterprise-button enterprise-button--secondary"
                      @click=${() => void this.removeEntitlement(index)}
                    >
                      ${enterpriseCopy("remove")}
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
