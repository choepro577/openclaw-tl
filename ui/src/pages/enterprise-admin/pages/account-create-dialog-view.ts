import { html, nothing } from "lit";
import {
  eaa,
  enterpriseAdminPresetDescription,
  enterpriseAdminPresetLabel,
} from "../../../i18n/enterprise-admin-accounts.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import {
  enterpriseDomainCopy,
  type EnterpriseDelegationKey,
} from "../../../i18n/enterprise-domain.ts";
import type {
  EnterpriseAccountRole,
  EnterpriseAccessPreset,
  EnterpriseSharedAgent,
  EnterpriseSkillCatalogItem,
} from "../../enterprise/services/enterprise-api.ts";
import "../components/admin-dialog.ts";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/u;
const d = (key: EnterpriseDelegationKey, params?: Record<string, string>) =>
  enterpriseDomainCopy(`enterpriseDelegation.${key}`, params);

function selectValue(event: Event): string {
  return event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : "";
}

function inputValue(event: Event): string {
  return event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : "";
}

function inputChecked(event: Event): boolean {
  return event.currentTarget instanceof HTMLInputElement && event.currentTarget.checked;
}

function validateUsername(event: Event): void {
  if (!(event.currentTarget instanceof HTMLInputElement)) {
    return;
  }
  const input = event.currentTarget;
  input.value = input.value.toLowerCase();
  input.setCustomValidity(
    input.value.length === 0 || USERNAME_PATTERN.test(input.value) ? "" : eaa("usernameInvalid"),
  );
}

function skillStatus(item: EnterpriseSkillCatalogItem): {
  label: string;
  badge: string;
} {
  if (item.intrinsicStatus === "ready") {
    return { label: ea("Sẵn sàng"), badge: "ea-badge--good" };
  }
  if (item.intrinsicStatus === "disabled") {
    return { label: ea("Đã tắt"), badge: "ea-badge--bad" };
  }
  return { label: ea("Cần cấu hình"), badge: "ea-badge--warn" };
}

export type AccountCreateDialogProps = {
  step: 1 | 2;
  role: EnterpriseAccountRole;
  personalAgentEnabled: boolean;
  accessPresetKey: string;
  defaultAgentId: string;
  selectedAgentKeys: readonly string[];
  agentQuery: string;
  selectedSkillKeys: readonly string[];
  skillQuery: string;
  catalogLoading: boolean;
  catalogError: string;
  accessPresets: readonly EnterpriseAccessPreset[];
  sharedAgents: readonly EnterpriseSharedAgent[];
  skills: readonly EnterpriseSkillCatalogItem[];
  error: string;
  creating: boolean;
  onClose: () => void;
  onSubmit: (event: SubmitEvent) => void;
  onBack: () => void;
  onRoleChange: (role: EnterpriseAccountRole) => void;
  onPersonalAgentChange: (enabled: boolean) => void;
  onAccessPresetChange: (presetKey: string) => void;
  onDefaultAgentChange: (agentId: string) => void;
  onAgentQueryChange: (query: string) => void;
  onAgentToggle: (resourceKey: string, selected: boolean) => void;
  onConfigureAgent: (agentId: string) => void;
  onSkillQueryChange: (query: string) => void;
  onSkillToggle: (resourceKey: string, selected: boolean) => void;
  onRetryCatalog: () => void;
};

export function renderAccountCreateDialog(props: AccountCreateDialogProps) {
  const selectedAgent = props.sharedAgents.find((agent) => agent.agentId === props.defaultAgentId);
  const normalizedQuery = props.skillQuery.trim().toLowerCase();
  const normalizedAgentQuery = props.agentQuery.trim().toLowerCase();
  const visibleAgents = props.sharedAgents.filter(
    (agent) =>
      !normalizedAgentQuery ||
      [agent.name, agent.description ?? "", agent.agentId].some((value) =>
        value.toLowerCase().includes(normalizedAgentQuery),
      ),
  );
  const globalSkills = props.skills
    .filter((skill) => skill.ownerAgentId === null)
    .toSorted((left, right) => {
      const readinessOrder =
        Number(right.intrinsicStatus === "ready") - Number(left.intrinsicStatus === "ready");
      return readinessOrder || left.name.localeCompare(right.name);
    });
  const visibleSkills = normalizedQuery
    ? globalSkills.filter((skill) =>
        [skill.name, skill.description, skill.skillKey, skill.source].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        ),
      )
    : globalSkills;
  const selectedSkillCount = props.selectedSkillKeys.length;
  const selectedAgentCount = props.selectedAgentKeys.length;
  const readySkillCount = globalSkills.filter((skill) => skill.intrinsicStatus === "ready").length;
  const selectedPreset = props.accessPresets.find((preset) => preset.key === props.accessPresetKey);
  const presetToolIds = selectedPreset?.toolIds ?? [];
  const presetLabel = enterpriseAdminPresetLabel(
    props.accessPresetKey,
    selectedPreset?.label ?? props.accessPresetKey,
  );
  const sharedAgentRequired = props.role === "employee" && !props.personalAgentEnabled;
  const submitDisabled =
    props.creating || props.catalogLoading || (sharedAgentRequired && !props.defaultAgentId);

  return html`
    <openclaw-enterprise-admin-dialog
      .open=${true}
      .wide=${props.step === 2}
      heading=${ea("Tạo tài khoản")}
      description=${eaa("createDialogDescription", { step: String(props.step) })}
      .onClose=${props.onClose}
    >
      <form class="ea-form-grid" @submit=${props.onSubmit}>
        <label class="ea-field">
          ${ea("Username")}
          <input
            class="ea-input"
            name="username"
            aria-describedby="create-account-username-help"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            required
            minlength="3"
            maxlength="64"
            pattern="[a-z0-9][a-z0-9._\\-]{2,63}"
            title=${eaa("usernameInvalid")}
            ?readonly=${props.step === 2}
            @input=${validateUsername}
          />
          <span id="create-account-username-help" class="ea-muted">
            ${ea("Bắt buộc không dấu, tối thiểu 3 ký tự. Ví dụ: hieu.nguyen")}
          </span>
        </label>
        <label class="ea-field">
          ${ea("Tên hiển thị")}
          <input
            class="ea-input"
            name="displayName"
            required
            maxlength="128"
            ?readonly=${props.step === 2}
          />
        </label>
        <label class="ea-field">
          ${ea("Role")}
          <select
            class="ea-select"
            name="role"
            .value=${props.role}
            ?disabled=${props.step === 2}
            @change=${(event: Event) => {
              const role = selectValue(event);
              props.onRoleChange(role === "administrator" ? "administrator" : "employee");
            }}
          >
            <option value="employee">${ea("Employee")}</option>
            <option value="administrator">${ea("Administrator")}</option>
          </select>
          ${props.step === 2
            ? html`<input type="hidden" name="role" value=${props.role} />`
            : nothing}
        </label>
        <label class="ea-switch-row">
          <span>${ea("Kích hoạt ngay")}</span>
          <input name="enabled" type="checkbox" checked />
        </label>
        <label class="ea-field">
          ${ea("Mật khẩu tạm")}
          <input
            class="ea-input"
            name="initialPassword"
            type="password"
            minlength="10"
            required
            ?readonly=${props.step === 2}
          />
        </label>
        <label class="ea-field">
          ${ea("Xác nhận mật khẩu")}
          <input
            class="ea-input"
            name="confirmPassword"
            type="password"
            minlength="10"
            required
            ?readonly=${props.step === 2}
          />
        </label>

        ${props.step === 2
          ? html`
              ${props.catalogLoading
                ? html`<div class="ea-banner ea-form-grid__full" role="status">
                    ${ea("Đang tải danh mục Agent và Skill…")}
                  </div>`
                : nothing}
              ${props.catalogError
                ? html`<div class="ea-banner ea-banner--error ea-form-grid__full" role="alert">
                    ${props.catalogError}
                    <button class="ea-button" type="button" @click=${props.onRetryCatalog}>
                      ${ea("Tải lại danh mục")}
                    </button>
                  </div>`
                : nothing}

              <label class="ea-switch-row ea-form-grid__full">
                <span>
                  <strong>${ea("Personal agent riêng")}</strong>
                  <span class="ea-muted">
                    ${ea("Dùng làm agent mặc định với workspace riêng, quyền filesystem 0700.")}
                  </span>
                </span>
                <input
                  name="personalAgentEnabled"
                  type="checkbox"
                  .checked=${props.personalAgentEnabled}
                  @change=${(event: Event) => props.onPersonalAgentChange(inputChecked(event))}
                />
              </label>

              <section class="ea-account-access-section">
                <div class="ea-account-access-heading">
                  <div>
                    <h3>${ea("Quyền công cụ")}</h3>
                    <p>${ea("Chọn nhóm thao tác tài khoản được phép sử dụng.")}</p>
                  </div>
                  <span class="ea-badge">${presetToolIds.length} ${ea("công cụ")}</span>
                </div>
                ${props.role === "administrator"
                  ? html`
                      <input type="hidden" name="accessPresetKey" value="none" />
                      <div class="ea-account-selection-card">
                        <strong>${ea("Quản lý riêng theo Administrator")}</strong>
                        <span>
                          ${ea(
                            "Access preset dành cho Employee; quyền của Administrator không lấy từ preset này.",
                          )}
                        </span>
                      </div>
                    `
                  : html`
                      <label class="ea-field">
                        ${ea("Access preset")}
                        <select
                          class="ea-select"
                          name="accessPresetKey"
                          .value=${props.accessPresetKey}
                          @change=${(event: Event) =>
                            props.onAccessPresetChange(selectValue(event))}
                        >
                          ${props.accessPresets.map(
                            (preset) => html`<option
                              value=${preset.key}
                              ?selected=${props.accessPresetKey === preset.key}
                            >
                              ${enterpriseAdminPresetLabel(preset.key, preset.label)}
                            </option>`,
                          )}
                        </select>
                      </label>
                      <div class="ea-account-selection-card">
                        <strong>${presetLabel}</strong>
                        <span>
                          ${selectedPreset
                            ? enterpriseAdminPresetDescription(
                                selectedPreset.key,
                                selectedPreset.description,
                              )
                            : ea("Danh mục preset chưa tải được; hãy tải lại trang quản trị.")}
                        </span>
                        <span class="ea-muted"> ${eaa("presetRuntimeNote")} </span>
                        ${presetToolIds.length > 0
                          ? html`<div class="ea-account-tool-list">
                              ${presetToolIds.map(
                                (toolId) => html`<span class="ea-badge">${toolId}</span>`,
                              )}
                            </div>`
                          : nothing}
                      </div>
                    `}
              </section>

              <section class="ea-account-access-section">
                <div class="ea-account-access-heading">
                  <div>
                    <h3>${ea("Agent mặc định")}</h3>
                    <p>${ea("Agent được mở đầu tiên khi người dùng bắt đầu làm việc.")}</p>
                  </div>
                  <span class="ea-badge ${props.personalAgentEnabled ? "ea-badge--good" : ""}">
                    ${props.personalAgentEnabled ? ea("Personal") : ea("Shared")}
                  </span>
                </div>
                ${props.personalAgentEnabled
                  ? html`
                      <input type="hidden" name="defaultAgentId" value="" />
                      <div class="ea-account-selection-card ea-account-selection-card--active">
                        <strong>${eaa("personalAgentAccount")}</strong>
                        <span>${eaa("personalAgentProvisioning")}</span>
                      </div>
                    `
                  : html`
                      <label class="ea-field">
                        ${ea("Shared")}
                        <select
                          class="ea-select"
                          name="defaultAgentId"
                          .value=${props.defaultAgentId}
                          ?required=${sharedAgentRequired}
                          ?disabled=${props.catalogLoading || props.sharedAgents.length === 0}
                          @change=${(event: Event) =>
                            props.onDefaultAgentChange(selectValue(event))}
                        >
                          <option value="" ?selected=${!props.defaultAgentId}>
                            ${props.role === "employee"
                              ? ea("Chọn shared agent…")
                              : ea("Tự dùng shared agent đầu tiên")}
                          </option>
                          ${props.sharedAgents.map(
                            (agent) =>
                              html`<option
                                value=${agent.agentId}
                                ?selected=${agent.agentId === props.defaultAgentId}
                              >
                                ${agent.name} (${agent.agentId})
                              </option>`,
                          )}
                        </select>
                      </label>
                      ${selectedAgent
                        ? html`<div
                            class="ea-account-selection-card ea-account-selection-card--active"
                          >
                            <strong>${selectedAgent.name}</strong>
                            <span>
                              ID ${selectedAgent.agentId} · ${selectedAgent.toolCount}
                              ${ea("công cụ")} · ${selectedAgent.skillCount}
                              ${ea("skill")}${selectedAgent.model
                                ? ` · ${selectedAgent.model}`
                                : ""}
                            </span>
                            ${props.role === "employee"
                              ? html`<span> ${eaa("accountAgentGrant")} </span>`
                              : nothing}
                          </div>`
                        : props.sharedAgents.length === 0 && !props.catalogLoading
                          ? html`<div class="ea-account-selection-card">
                              <strong>${ea("Chưa có shared agent")}</strong>
                              <span>${ea("Hãy tạo shared agent hoặc bật Personal agent.")}</span>
                            </div>`
                          : nothing}
                    `}
              </section>

              <section class="ea-account-access-section ea-form-grid__full">
                <div class="ea-account-access-heading">
                  <div>
                    <h3>${d("specialists")}</h3>
                    <p>${d("specialistGrantHelp")}</p>
                  </div>
                  <span class="ea-badge"
                    >${d("selectedCount", { count: String(selectedAgentCount) })}</span
                  >
                </div>
                <input
                  class="ea-input"
                  type="search"
                  placeholder=${d("searchSpecialists")}
                  aria-label=${d("specialists")}
                  .value=${props.agentQuery}
                  @input=${(event: Event) => props.onAgentQueryChange(inputValue(event))}
                />
                <div class="ea-account-option-list" role="group" aria-label=${d("specialists")}>
                  ${visibleAgents.map((agent) => {
                    const ready = agent.delegationReadiness === "ready";
                    const selected = props.selectedAgentKeys.includes(agent.resourceKey);
                    return html`
                      <div class="ea-account-option ${selected ? "is-selected" : ""}">
                        <label>
                          <input
                            name="agentGrants"
                            type="checkbox"
                            value=${agent.resourceKey}
                            .checked=${selected}
                            ?disabled=${!ready}
                            @change=${(event: Event) =>
                              props.onAgentToggle(agent.resourceKey, inputChecked(event))}
                          />
                          <span>
                            <strong>${agent.name}</strong>
                            <span>${agent.description || d("noDescription")}</span>
                          </span>
                        </label>
                        <span class="ea-badge ${ready ? "ea-badge--good" : "ea-badge--warn"}">
                          ${ready ? d("ready") : d("notConfigured")}
                        </span>
                        ${ready
                          ? nothing
                          : html`<button
                              class="ea-button"
                              type="button"
                              @click=${() => props.onConfigureAgent(agent.agentId)}
                            >
                              ${d("configureSpecialty")}
                            </button>`}
                      </div>
                    `;
                  })}
                  ${visibleAgents.length === 0 && !props.catalogLoading
                    ? html`<div class="ea-empty">${d("noMatchingAgents")}</div>`
                    : nothing}
                </div>
                <div class="ea-account-selection-card ea-account-selection-card--active">
                  <strong>${d("creationSummary")}</strong>
                  <span>
                    ${props.personalAgentEnabled ? d("onePersonalAgent") : d("noPersonalAgent")} ·
                    ${d("specialistCount", { count: String(selectedAgentCount) })} ·
                    ${d("skillCount", { count: String(selectedSkillCount) })}
                  </span>
                  ${props.personalAgentEnabled
                    ? html`<span>${d("delegationAfterRollout")}</span>`
                    : html`<span>${d("directSharedOnly")}</span>`}
                </div>
              </section>

              <section class="ea-account-access-section ea-form-grid__full">
                <div class="ea-account-access-heading">
                  <div>
                    <h3>${ea("Skill ban đầu")}</h3>
                    <p>
                      ${ea(
                        "Chọn skill dùng chung đã có trong hệ thống; không cần nhập resource key.",
                      )}
                    </p>
                  </div>
                  <span class="ea-badge">
                    ${eaa("selectedSkillsSummary", {
                      selected: String(selectedSkillCount),
                      ready: String(readySkillCount),
                    })}
                  </span>
                </div>
                <input
                  class="ea-input"
                  type="search"
                  aria-label=${ea("Tìm skill ban đầu")}
                  placeholder=${ea("Tìm theo tên hoặc mô tả…")}
                  .value=${props.skillQuery}
                  @input=${(event: Event) => props.onSkillQueryChange(inputValue(event))}
                />
                <div class="ea-account-skill-list">
                  ${visibleSkills.length > 0
                    ? visibleSkills.map((skill) => {
                        const status = skillStatus(skill);
                        const disabled = skill.intrinsicStatus !== "ready";
                        return html`
                          <label class="ea-account-skill-option">
                            <input
                              name="skillGrants"
                              type="checkbox"
                              value=${skill.resourceKey}
                              .checked=${props.selectedSkillKeys.includes(skill.resourceKey)}
                              ?disabled=${disabled}
                              @change=${(event: Event) =>
                                props.onSkillToggle(skill.resourceKey, inputChecked(event))}
                            />
                            <span class="ea-account-skill-copy">
                              <span class="ea-account-skill-title">
                                <strong>${skill.name}</strong>
                                <span class="ea-badge ${status.badge}">${status.label}</span>
                              </span>
                              <span class="ea-account-skill-description">
                                ${skill.description || skill.skillKey}
                              </span>
                              ${skill.setupReason
                                ? html`<span class="ea-muted">${skill.setupReason}</span>`
                                : nothing}
                            </span>
                          </label>
                        `;
                      })
                    : html`<div class="ea-account-skill-empty">
                        ${normalizedQuery
                          ? ea("Không tìm thấy skill phù hợp.")
                          : ea("Chưa có skill dùng chung trong hệ thống.")}
                      </div>`}
                </div>
                <p class="ea-account-access-note">${eaa("workspaceSkillNote")}</p>
              </section>

              <div class="ea-account-create-summary ea-form-grid__full">
                <span>
                  <strong>${ea("Agent")}</strong>
                  ${props.personalAgentEnabled
                    ? ea("Personal Agent")
                    : (selectedAgent?.name ?? eaa("accountCreateSummaryUnselected"))}
                </span>
                <span>
                  <strong>${ea("Tools")}</strong>
                  ${props.role === "administrator"
                    ? ea("Theo quyền Administrator")
                    : enterpriseAdminPresetLabel(
                        props.accessPresetKey,
                        selectedPreset
                          ? enterpriseAdminPresetLabel(selectedPreset.key, selectedPreset.label)
                          : ea("Chưa cấp"),
                      )}
                </span>
                <span><strong>${ea("Skills")}</strong>${selectedSkillCount} ${ea("skill")}</span>
              </div>
            `
          : nothing}
        ${props.error
          ? html`<p class="ea-error ea-form-grid__full" role="alert">${props.error}</p>`
          : nothing}
        <div class="ea-form-actions ea-form-grid__full">
          ${props.step === 2
            ? html`<button class="ea-button" type="button" @click=${props.onBack}>
                ${ea("Quay lại")}
              </button>`
            : nothing}
          <button class="ea-button ea-button--primary" type="submit" ?disabled=${submitDisabled}>
            ${props.step === 1
              ? ea("Tiếp tục")
              : props.creating
                ? ea("Đang tạo…")
                : ea("Tạo tài khoản")}
          </button>
        </div>
      </form>
    </openclaw-enterprise-admin-dialog>
  `;
}
