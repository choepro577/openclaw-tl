import { html } from "lit";
import { property } from "lit/decorators.js";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import type { EnterpriseEffectivePolicy } from "../services/enterprise-api.ts";

export class EnterpriseEffectivePolicyPage extends OpenClawLightDomElement {
  @property({ attribute: false }) policy?: EnterpriseEffectivePolicy;

  override render() {
    if (!this.policy) {
      return html``;
    }
    return html`
      <section class="enterprise-panel enterprise-stack">
        <h3>Quyền hiệu lực</h3>
        <p>Role: <strong>${this.policy.role}</strong></p>
        <p>Personal Agent: <strong>${this.policy.personalAgentEnabled ? "Bật" : "Tắt"}</strong></p>
        <p>
          Agent mặc định:
          <span class="enterprise-code">${this.policy.defaultAgentId ?? "main"}</span>
        </p>
        <table class="enterprise-table">
          <thead>
            <tr>
              <th>Loại</th>
              <th>ID</th>
              <th>Hiệu lực</th>
            </tr>
          </thead>
          <tbody>
            ${this.policy.entitlements.map(
              (item) =>
                html`<tr>
                  <td>${item.resourceType}</td>
                  <td class="enterprise-code">${item.resourceId}</td>
                  <td>${item.effect}</td>
                </tr>`,
            )}
          </tbody>
        </table>
        ${this.policy.employeeHardDeniedTools.length
          ? html`<p class="enterprise-muted">
              Tool luôn bị khóa với Employee:
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
