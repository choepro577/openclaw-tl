import { html } from "lit";
import { property } from "lit/decorators.js";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  enterpriseCopy,
  enterpriseEffectLabel,
  enterpriseResourceTypeLabel,
  enterpriseRoleLabel,
} from "../enterprise-copy.ts";
import type { EnterpriseEffectivePolicy } from "../services/enterprise-api.ts";

export class EnterpriseEffectivePolicyPage extends OpenClawLightDomElement {
  @property({ attribute: false }) policy?: EnterpriseEffectivePolicy;

  override render() {
    if (!this.policy) {
      return html``;
    }
    return html`
      <section class="enterprise-panel enterprise-stack">
        <h3>${enterpriseCopy("effectivePolicy")}</h3>
        <p>${eu("role")}: <strong>${enterpriseRoleLabel(this.policy.role)}</strong></p>
        <p>
          ${eu("personalAgent")}:
          <strong
            >${enterpriseCopy(this.policy.personalAgentEnabled ? "enabled" : "disabled")}</strong
          >
        </p>
        <p>
          ${enterpriseCopy("defaultAgent")}:
          <span class="enterprise-code">${this.policy.defaultAgentId ?? "main"}</span>
        </p>
        <table class="enterprise-table">
          <thead>
            <tr>
              <th>${enterpriseCopy("resourceType")}</th>
              <th>ID</th>
              <th>${enterpriseCopy("effective")}</th>
            </tr>
          </thead>
          <tbody>
            ${this.policy.entitlements.map(
              (item) =>
                html`<tr>
                  <td>${enterpriseResourceTypeLabel(item.resourceType)}</td>
                  <td class="enterprise-code">${item.resourceId}</td>
                  <td>${enterpriseEffectLabel(item.effect)}</td>
                </tr>`,
            )}
          </tbody>
        </table>
        ${this.policy.employeeHardDeniedTools.length
          ? html`<p class="enterprise-muted">
              ${enterpriseCopy("employeeDeniedTools")}
              <span class="enterprise-code">${this.policy.employeeHardDeniedTools.join(", ")}</span>
            </p>`
          : ""}
      </section>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-effective-policy-page")) {
  customElements.define("openclaw-enterprise-effective-policy-page", EnterpriseEffectivePolicyPage);
}
