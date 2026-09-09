import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { showNativeConfirm, showNativePrompt } from "../../../branding/display-dialog.ts";
import { icons } from "../../../components/icons.ts";
import {
  eaa,
  enterpriseAdminPresetDescription,
  enterpriseAdminPresetLabel,
  type EnterpriseAdminAccountsCopyKey,
} from "../../../i18n/enterprise-admin-accounts.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import {
  enterpriseDomainCopy,
  type EnterpriseDelegationKey,
} from "../../../i18n/enterprise-domain.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  createAdminAccount,
  applyAdminAccessChanges,
  listAdminAccounts,
  listAdminAgentCatalog,
  listAdminSkillCatalog,
  loadAdminAccount,
  loadAdminAccountDelegation,
  resetAdminAccountPassword,
  revokeAdminAccountSession,
  saveAdminAccountDelegationOverride,
  updateAdminAccount,
  type EnterpriseAccount,
  type EnterpriseAccessPreset,
  type EnterprisePageInfo,
  type EnterpriseSharedAgent,
  type EnterpriseSkillCatalogItem,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage, formatDate } from "../utils.ts";
import "../components/admin-dialog.ts";
import { renderAccountCreateDialog } from "./account-create-dialog-view.ts";

type AccountDetail = Awaited<ReturnType<typeof loadAdminAccount>>;
type AccountDelegation = Awaited<ReturnType<typeof loadAdminAccountDelegation>>;
type AccountDetailTab = "info" | "agents" | "sessions" | "advanced";
type OverrideMode = "inherit" | "confirm_before_handoff" | "explicit_only" | "disabled";
const d = (key: EnterpriseDelegationKey, params?: Record<string, string>) =>
  enterpriseDomainCopy(`enterpriseDelegation.${key}`, params);

function eventValue(event: Event): string {
  const target = event.currentTarget;
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement
    ? target.value
    : "";
}

function eventChecked(event: Event): boolean {
  return event.currentTarget instanceof HTMLInputElement && event.currentTarget.checked;
}

function accountRole(value: FormDataEntryValue | null): "administrator" | "employee" {
  return value === "administrator" ? "administrator" : "employee";
}

function overrideMode(value: string): OverrideMode {
  return value === "confirm_before_handoff" || value === "explicit_only" || value === "disabled"
    ? value
    : "inherit";
}

function accessPresetLabel(presetKey: string, presets: readonly EnterpriseAccessPreset[]): string {
  const preset = presets.find((item) => item.key === presetKey);
  return enterpriseAdminPresetLabel(presetKey, preset?.label ?? presetKey);
}

export class EnterpriseAdminAccountsPage extends OpenClawLightDomElement {
  @state() private accounts: EnterpriseAccount[] = [];
  @state() private pageInfo: EnterprisePageInfo = { total: 0, nextCursor: null };
  @state() private loading = true;
  @state() private error = "";
  @state() private accessPresets: EnterpriseAccessPreset[] = [];
  @state() private createOpen = false;
  @state() private createStep: 1 | 2 = 1;
  @state() private createRole: "administrator" | "employee" = "employee";
  @state() private creating = false;
  @state() private createPersonalAgentEnabled = true;
  @state() private createAccessPresetKey = "basic@1";
  @state() private createDefaultAgentId = "";
  @state() private createSelectedAgentKeys: string[] = [];
  @state() private createAgentQuery = "";
  @state() private createSelectedSkillKeys: string[] = [];
  @state() private createSkillQuery = "";
  @state() private createCatalogLoading = false;
  @state() private createCatalogError = "";
  @state() private createCatalogErrorKeys: EnterpriseAdminAccountsCopyKey[] = [];
  @state() private createPasswordMismatch = false;
  @state() private createSharedAgents: EnterpriseSharedAgent[] = [];
  @state() private createSkills: EnterpriseSkillCatalogItem[] = [];
  @state() private selected?: AccountDetail;
  @state() private accountDelegation?: AccountDelegation;
  @state() private detailTab: AccountDetailTab = "info";
  @state() private detailAgentQuery = "";
  @state() private assignmentDraft = new Map<string, boolean>();
  @state() private assignmentSource = new Map<string, boolean>();
  @state() private overrideDraft = new Map<string, OverrideMode>();
  @state() private overrideSource = new Map<string, OverrideMode>();
  @state() private detailLoading = false;
  @state() private saving = false;
  @state() private detailAccessPresetKey = "";
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
      this.accessPresets = result.accessPresets ?? [];
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

  private openCreateDialog(): void {
    this.error = "";
    this.createOpen = true;
    this.createStep = 1;
    this.createRole = "employee";
    this.createPersonalAgentEnabled = true;
    this.createAccessPresetKey = "basic@1";
    this.createDefaultAgentId = "";
    this.createSelectedAgentKeys = [];
    this.createAgentQuery = "";
    this.createSelectedSkillKeys = [];
    this.createSkillQuery = "";
    this.createCatalogErrorKeys = [];
    this.createPasswordMismatch = false;
    void this.loadCreateCatalog();
  }

  private closeCreateDialog(): void {
    this.createOpen = false;
    this.createStep = 1;
  }

  private async loadCreateCatalog(): Promise<void> {
    this.createCatalogLoading = true;
    this.createCatalogError = "";
    this.createCatalogErrorKeys = [];
    const [agentResult, skillResult] = await Promise.allSettled([
      listAdminAgentCatalog(),
      listAdminSkillCatalog(),
    ]);
    const errors: EnterpriseAdminAccountsCopyKey[] = [];
    if (agentResult.status === "fulfilled") {
      this.createSharedAgents = agentResult.value.shared;
    } else {
      this.createSharedAgents = [];
      errors.push("sharedAgentCatalogUnavailable");
    }
    if (skillResult.status === "fulfilled") {
      this.createSkills = skillResult.value.items;
    } else {
      this.createSkills = [];
      errors.push("skillCatalogUnavailable");
    }
    this.createCatalogErrorKeys = errors;
    this.createCatalogError = errors.map((key) => eaa(key)).join(" ");
    this.createCatalogLoading = false;
  }

  private toggleCreateSkill(resourceKey: string, selected: boolean): void {
    this.createSelectedSkillKeys = selected
      ? [...new Set([...this.createSelectedSkillKeys, resourceKey])]
      : this.createSelectedSkillKeys.filter((value) => value !== resourceKey);
  }

  private toggleCreateAgent(resourceKey: string, selected: boolean): void {
    this.createSelectedAgentKeys = selected
      ? [...new Set([...this.createSelectedAgentKeys, resourceKey])]
      : this.createSelectedAgentKeys.filter((value) => value !== resourceKey);
  }

  private async create(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    if (this.createStep === 1) {
      const data = new FormData(form);
      if (data.get("initialPassword") !== data.get("confirmPassword")) {
        this.createPasswordMismatch = true;
        this.error = ea("Mật khẩu xác nhận không khớp.");
        return;
      }
      this.createPasswordMismatch = false;
      this.error = "";
      this.createPersonalAgentEnabled = this.createRole === "employee";
      this.createAccessPresetKey = this.createRole === "employee" ? "basic@1" : "none";
      this.createDefaultAgentId = "";
      this.createSelectedAgentKeys = [];
      this.createAgentQuery = "";
      this.createSelectedSkillKeys = [];
      this.createSkillQuery = "";
      this.createStep = 2;
      return;
    }
    const data = new FormData(form);
    this.creating = true;
    this.createPasswordMismatch = false;
    this.error = "";
    try {
      await createAdminAccount({
        username: String(data.get("username") ?? ""),
        displayName: String(data.get("displayName") ?? ""),
        initialPassword: String(data.get("initialPassword") ?? ""),
        role: accountRole(data.get("role")),
        enabled: data.get("enabled") === "on",
        personalAgentEnabled: data.get("personalAgentEnabled") === "on",
        defaultAgentId: String(data.get("defaultAgentId") ?? "").trim() || null,
        accessPresetKey: String(data.get("accessPresetKey") ?? "none"),
        skillGrants: data.getAll("skillGrants").map(String),
        agentGrants: data.getAll("agentGrants").map(String),
      });
      form.reset();
      this.closeCreateDialog();
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
    this.detailAccessPresetKey = account.accessPresetKey;
    this.detailTab = "info";
    this.detailAgentQuery = "";
    this.accountDelegation = undefined;
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
      const [detail, delegation, catalog] = await Promise.all([
        loadAdminAccount(account.id),
        loadAdminAccountDelegation(account.id),
        this.createSharedAgents.length > 0 ? Promise.resolve(null) : listAdminAgentCatalog(),
      ]);
      this.selected = detail;
      this.detailAccessPresetKey = detail.account.accessPresetKey;
      this.accountDelegation = delegation;
      if (catalog) {
        this.createSharedAgents = catalog.shared;
      }
      this.initializeDelegationDrafts(detail, delegation);
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.detailLoading = false;
    }
  }

  private closeDetail(): void {
    if (this.drawerDirty && !showNativeConfirm(d("confirmDiscard"))) {
      return;
    }
    this.selected = undefined;
    this.accountDelegation = undefined;
    this.drawerDirty = false;
  }

  private initializeDelegationDrafts(detail: AccountDetail, delegation: AccountDelegation): void {
    const assignments = new Map<string, boolean>();
    for (const agent of this.createSharedAgents) {
      const entitlement = detail.entitlements.find(
        (item) => item.resourceType === "agent" && item.resourceId === agent.resourceKey,
      );
      assignments.set(
        agent.resourceKey,
        entitlement?.effect === "allow" && entitlement.resourceState === "active",
      );
    }
    const overrides = new Map<string, OverrideMode>(
      delegation.overrides.map((item) => [item.agentResourceKey, item.mode]),
    );
    this.assignmentDraft = assignments;
    this.assignmentSource = new Map(assignments);
    this.overrideDraft = overrides;
    this.overrideSource = new Map(overrides);
  }

  private setAssignment(resourceKey: string, enabled: boolean): void {
    this.assignmentDraft = new Map(this.assignmentDraft).set(resourceKey, enabled);
    this.drawerDirty = true;
  }

  private setOverride(resourceKey: string, mode: OverrideMode): void {
    this.overrideDraft = new Map(this.overrideDraft).set(resourceKey, mode);
    this.drawerDirty = true;
  }

  private async saveDelegation(): Promise<void> {
    if (!this.selected || !this.accountDelegation || this.saving) {
      return;
    }
    this.saving = true;
    this.error = "";
    try {
      const accountId = this.selected.account.id;
      const assignmentChanges = this.createSharedAgents
        .filter(
          (agent) =>
            this.assignmentDraft.get(agent.resourceKey) !==
            this.assignmentSource.get(agent.resourceKey),
        )
        .map((agent) => ({
          accountId,
          resourceType: "agent" as const,
          resourceKey: agent.resourceKey,
          effect: this.assignmentDraft.get(agent.resourceKey) ? ("allow" as const) : null,
        }));
      let accountRevision = this.selected.account.policyRevision;
      if (assignmentChanges.length > 0) {
        const result = await applyAdminAccessChanges({
          changes: assignmentChanges,
          baseRevisions: { [accountId]: accountRevision },
        });
        accountRevision = result.policyRevisions[accountId] ?? accountRevision;
      }
      for (const [resourceKey, mode] of this.overrideDraft) {
        if (mode === (this.overrideSource.get(resourceKey) ?? "inherit")) {
          continue;
        }
        const current = this.accountDelegation.overrides.find(
          (item) => item.agentResourceKey === resourceKey,
        );
        const result = await saveAdminAccountDelegationOverride({
          accountId,
          agentResourceKey: resourceKey,
          mode,
          baseRevision: current?.revision ?? 0,
          baseAccountPolicyRevision: accountRevision,
        });
        accountRevision = result.accountPolicyRevision;
      }
      const [detail, delegation] = await Promise.all([
        loadAdminAccount(accountId),
        loadAdminAccountDelegation(accountId),
      ]);
      this.selected = detail;
      this.accountDelegation = delegation;
      this.initializeDelegationDrafts(detail, delegation);
      this.drawerDirty = false;
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  private async saveDetail(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    if (!this.selected || !(form instanceof HTMLFormElement)) {
      return;
    }
    await this.persistDetail(form, false);
  }

  private async persistDetail(form: HTMLFormElement, forceApplyPreset: boolean): Promise<void> {
    if (!this.selected) {
      return;
    }
    const data = new FormData(form);
    const accessPresetKey = String(data.get("accessPresetKey") ?? "none");
    this.saving = true;
    this.error = "";
    try {
      const result = await updateAdminAccount(this.selected.account.id, {
        displayName: String(data.get("displayName") ?? ""),
        role: accountRole(data.get("role")),
        enabled: data.get("enabled") === "on",
        personalAgentEnabled: data.get("personalAgentEnabled") === "on",
        defaultAgentId: String(data.get("defaultAgentId") ?? "").trim() || null,
        accessPresetKey,
        ...(forceApplyPreset || accessPresetKey !== this.selected.account.accessPresetKey
          ? { applyAccessPreset: true }
          : {}),
      });
      this.selected = await loadAdminAccount(result.account.id);
      this.detailAccessPresetKey = this.selected.account.accessPresetKey;
      this.drawerDirty = false;
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  private async applyAccessPreset(event: Event): Promise<void> {
    const trigger = event.currentTarget;
    const form = trigger instanceof HTMLElement ? trigger.closest("form") : null;
    if (!form || this.saving || !this.detailAccessPresetKey) {
      return;
    }
    await this.persistDetail(form, true);
  }

  private async resetPassword(): Promise<void> {
    if (!this.selected) {
      return;
    }
    const password = showNativePrompt(eaa("resetPasswordPrompt"));
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
    return renderAccountCreateDialog({
      step: this.createStep,
      role: this.createRole,
      personalAgentEnabled: this.createPersonalAgentEnabled,
      accessPresetKey: this.createAccessPresetKey,
      defaultAgentId: this.createDefaultAgentId,
      selectedAgentKeys: this.createSelectedAgentKeys,
      agentQuery: this.createAgentQuery,
      selectedSkillKeys: this.createSelectedSkillKeys,
      skillQuery: this.createSkillQuery,
      accessPresets: this.accessPresets,
      catalogLoading: this.createCatalogLoading,
      catalogError: this.createCatalogErrorKeys.length
        ? this.createCatalogErrorKeys.map((key) => eaa(key)).join(" ")
        : this.createCatalogError,
      sharedAgents: this.createSharedAgents,
      skills: this.createSkills,
      error: this.createPasswordMismatch ? ea("Mật khẩu xác nhận không khớp.") : this.error,
      creating: this.creating,
      onClose: () => this.closeCreateDialog(),
      onSubmit: (event) => void this.create(event),
      onBack: () => (this.createStep = 1),
      onRoleChange: (role) => (this.createRole = role),
      onPersonalAgentChange: (enabled) => {
        this.createPersonalAgentEnabled = enabled;
        if (enabled) {
          this.createDefaultAgentId = "";
        }
      },
      onAccessPresetChange: (presetKey) => (this.createAccessPresetKey = presetKey),
      onDefaultAgentChange: (agentId) => (this.createDefaultAgentId = agentId),
      onAgentQueryChange: (query) => (this.createAgentQuery = query),
      onAgentToggle: (resourceKey, selected) => this.toggleCreateAgent(resourceKey, selected),
      onConfigureAgent: (agentId) => {
        this.closeCreateDialog();
        globalThis.location.href = `${globalThis.location.pathname.replace(/\/accounts$/, "/agents")}?type=shared&agent=${encodeURIComponent(agentId)}&panel=delegation`;
      },
      onSkillQueryChange: (query) => (this.createSkillQuery = query),
      onSkillToggle: (resourceKey, selected) => this.toggleCreateSkill(resourceKey, selected),
      onRetryCatalog: () => void this.loadCreateCatalog(),
    });
  }

  private renderDetailDrawer() {
    const detail = this.selected;
    if (!detail) {
      return nothing;
    }
    const account = detail.account;
    const selectedPreset = this.accessPresets.find(
      (preset) => preset.key === this.detailAccessPresetKey,
    );
    const renderInfo = () => html`
      <form
        class="ea-form-grid"
        @input=${() => (this.drawerDirty = true)}
        @change=${() => (this.drawerDirty = true)}
        @submit=${(event: SubmitEvent) => void this.saveDetail(event)}
      >
        <label class="ea-field ea-form-grid__full">
          ${ea("Tên hiển thị")}
          <input class="ea-input" name="displayName" .value=${account.displayName} required />
        </label>
        <label class="ea-field">
          ${ea("Role")}
          <select class="ea-select" name="role" .value=${account.role}>
            <option value="employee">${ea("Employee")}</option>
            <option value="administrator">${ea("Administrator")}</option>
          </select>
        </label>
        <label class="ea-field">
          ${ea("Access preset")}
          <select
            class="ea-select"
            name="accessPresetKey"
            .value=${this.detailAccessPresetKey || account.accessPresetKey}
            @change=${(event: Event) => {
              const accessPresetKey = eventValue(event);
              this.detailAccessPresetKey = accessPresetKey;
              this.drawerDirty = true;
            }}
          >
            ${this.accessPresets.map(
              (preset) => html`<option
                value=${preset.key}
                ?selected=${this.detailAccessPresetKey === preset.key}
              >
                ${enterpriseAdminPresetLabel(preset.key, preset.label)}
              </option>`,
            )}
          </select>
        </label>
        <div class="ea-account-selection-card">
          <strong
            >${selectedPreset
              ? enterpriseAdminPresetLabel(selectedPreset.key, selectedPreset.label)
              : enterpriseAdminPresetLabel(
                  this.detailAccessPresetKey || account.accessPresetKey,
                  this.detailAccessPresetKey || account.accessPresetKey,
                )}</strong
          >
          <span>
            ${selectedPreset
              ? enterpriseAdminPresetDescription(selectedPreset.key, selectedPreset.description)
              : ea("Danh mục preset chưa tải được; hãy tải lại trang quản trị.")}
          </span>
          <span class="ea-muted"> ${eaa("presetApplyNote")} </span>
          <span class="ea-muted"> ${eaa("presetSessionNote")} </span>
          ${selectedPreset?.toolIds.length
            ? html`<div class="ea-account-tool-list">
                ${selectedPreset.toolIds.map(
                  (toolId) => html`<span class="ea-badge">${toolId}</span>`,
                )}
              </div>`
            : nothing}
          <button
            class="ea-button"
            type="button"
            ?disabled=${this.saving || !selectedPreset}
            @click=${(event: Event) => void this.applyAccessPreset(event)}
          >
            ${eaa("applyPresetAgain")}
          </button>
        </div>
        <label class="ea-switch-row">
          <span>${ea("Đang hoạt động")}</span>
          <input name="enabled" type="checkbox" .checked=${account.enabled} />
        </label>
        <label class="ea-switch-row">
          <span>${ea("Personal Agent")}</span>
          <input
            name="personalAgentEnabled"
            type="checkbox"
            .checked=${account.personalAgentEnabled}
          />
        </label>
        <label class="ea-field ea-form-grid__full">
          ${ea("Agent mặc định")}
          <input class="ea-input" name="defaultAgentId" .value=${account.defaultAgentId ?? ""} />
        </label>
        <div class="ea-banner ea-form-grid__full">
          ${eaa("statusChangeNote", { revision: String(account.policyRevision) })}
        </div>
        ${this.error
          ? html`<p class="ea-error ea-form-grid__full" role="alert">${this.error}</p>`
          : nothing}
        <div class="ea-form-actions ea-form-grid__full ea-sticky-actions">
          <button
            class="ea-button ea-button--danger"
            type="button"
            @click=${() => void this.resetPassword()}
          >
            ${eaa("resetPasswordAction")}
          </button>
          <button class="ea-button ea-button--primary" type="submit" ?disabled=${this.saving}>
            ${this.saving ? ea("Đang lưu…") : ea("Lưu thay đổi")}
          </button>
        </div>
      </form>
    `;
    const candidateMap = new Map(
      (this.accountDelegation?.specialists ?? []).map((item) => [item.resourceKey, item]),
    );
    const query = this.detailAgentQuery.trim().toLowerCase();
    const visibleAgents = this.createSharedAgents.filter(
      (agent) =>
        !query ||
        [agent.name, agent.description ?? "", agent.agentId].some((value) =>
          value.toLowerCase().includes(query),
        ),
    );
    const changedAssignments = this.createSharedAgents.filter(
      (agent) =>
        this.assignmentDraft.get(agent.resourceKey) !==
        this.assignmentSource.get(agent.resourceKey),
    );
    const changedOverrides = [...this.overrideDraft].filter(
      ([key, value]) => value !== (this.overrideSource.get(key) ?? "inherit"),
    );
    const renderAgents = () => html`
      <section class="ea-stack">
        <div class="ea-delegation-summary">
          <div>
            <span>${d("personalAgent")}</span
            ><strong>${account.personalAgentEnabled ? d("enabled") : d("disabled")}</strong>
          </div>
          <div>
            <span>${d("automaticDelegation")}</span
            ><strong
              >${this.accountDelegation?.policy.rollout === "on"
                ? d("stateOn")
                : d("notActivated")}</strong
            >
          </div>
          <div>
            <span>${d("assigned")}</span
            ><strong>${[...this.assignmentDraft.values()].filter(Boolean).length}</strong>
          </div>
          <div>
            <span>${d("eligible")}</span
            ><strong
              >${(this.accountDelegation?.specialists ?? []).filter((item) => item.routable)
                .length}</strong
            >
          </div>
        </div>
        <input
          class="ea-input"
          type="search"
          placeholder=${d("searchSpecialistsShort")}
          aria-label=${d("specialists")}
          .value=${this.detailAgentQuery}
          @input=${(event: Event) => (this.detailAgentQuery = eventValue(event))}
        />
        <div class="ea-specialist-grid">
          ${visibleAgents.map((agent) => {
            const candidate = candidateMap.get(agent.resourceKey);
            const assigned = this.assignmentDraft.get(agent.resourceKey) === true;
            const storedOverride = this.accountDelegation?.overrides.find(
              (item) => item.agentResourceKey === agent.resourceKey,
            );
            const mode = this.overrideDraft.get(agent.resourceKey) ?? "inherit";
            const readiness =
              agent.delegationReadiness !== "ready"
                ? { label: d("notConfigured"), good: false }
                : candidate?.reasonCodes.includes("explicit_deny")
                  ? { label: d("accessBlocked"), good: false }
                  : candidate?.effectiveMode === "disabled"
                    ? { label: d("disabled"), good: false }
                    : { label: d("ready"), good: true };
            const baseMode = agent.delegationTarget?.handlingMode ?? "explicit_only";
            const rank: Record<
              "auto_when_certain" | "confirm_before_handoff" | "explicit_only" | "disabled",
              number
            > = {
              auto_when_certain: 0,
              confirm_before_handoff: 1,
              explicit_only: 2,
              disabled: 3,
            };
            return html`
              <article class="ea-specialist-card ${assigned ? "is-assigned" : ""}">
                <div class="ea-specialist-card__heading">
                  <div>
                    <strong>${agent.name}</strong>
                    <p>${agent.description || d("noDescription")}</p>
                  </div>
                  <span class="ea-badge ${readiness.good ? "ea-badge--good" : "ea-badge--warn"}"
                    >${readiness.label}</span
                  >
                </div>
                <label class="ea-switch-row">
                  <span>${assigned ? d("assignedToUser") : d("notAssigned")}</span>
                  <input
                    type="checkbox"
                    .checked=${assigned}
                    ?disabled=${agent.delegationReadiness !== "ready"}
                    @change=${(event: Event) =>
                      this.setAssignment(agent.resourceKey, eventChecked(event))}
                  />
                </label>
                ${!assigned && storedOverride && storedOverride.mode !== "inherit"
                  ? html`<div class="ea-banner">
                      ${d("restorePrevious", {
                        mode:
                          storedOverride.mode === "explicit_only"
                            ? d("explicitOnly")
                            : storedOverride.mode === "disabled"
                              ? d("noAutomaticDelegation")
                              : d("confirmBeforeHandoff"),
                      })}
                    </div>`
                  : nothing}
                <label class="ea-field">
                  ${d("userSpecificMode")}
                  <select
                    class="ea-select"
                    .value=${mode}
                    ?disabled=${!assigned}
                    @change=${(event: Event) =>
                      this.setOverride(agent.resourceKey, overrideMode(eventValue(event)))}
                  >
                    <option value="inherit">${d("inheritAgentMode")}</option>
                    <option
                      value="confirm_before_handoff"
                      ?disabled=${rank.confirm_before_handoff < rank[baseMode]}
                    >
                      ${d("confirmBeforeHandoff")}
                    </option>
                    <option value="explicit_only" ?disabled=${rank.explicit_only < rank[baseMode]}>
                      ${d("explicitOnly")}
                    </option>
                    <option value="disabled">${d("noAutomaticDelegation")}</option>
                  </select>
                </label>
              </article>
            `;
          })}
        </div>
        ${this.error ? html`<p class="ea-error" role="alert">${this.error}</p>` : nothing}
        <footer class="ea-sticky-actions ea-specialist-footer">
          <span
            >${d("changesSummary", {
              added: String(
                changedAssignments.filter((agent) => this.assignmentDraft.get(agent.resourceKey))
                  .length,
              ),
              removed: String(
                changedAssignments.filter((agent) => !this.assignmentDraft.get(agent.resourceKey))
                  .length,
              ),
              overrides: changedOverrides.length
                ? d("overrideChanges", { count: String(changedOverrides.length) })
                : "",
            })}</span
          >
          <div class="ea-row-actions">
            <button
              class="ea-button"
              type="button"
              @click=${() => this.initializeDelegationDrafts(detail, this.accountDelegation!)}
            >
              ${d("cancel")}
            </button>
            <button
              class="ea-button ea-button--primary"
              type="button"
              ?disabled=${this.saving || (!changedAssignments.length && !changedOverrides.length)}
              @click=${() => void this.saveDelegation()}
            >
              ${this.saving ? d("saving") : d("saveChanges")}
            </button>
          </div>
        </footer>
      </section>
    `;
    const renderSessions = () => html`
      <section class="ea-stack">
        <div class="ea-access-list">
          ${detail.sessions.map(
            (session) => html`
              <div class="ea-access-row">
                <div>
                  <strong>${String(session.audience ?? "legacy")}</strong>
                  <div class="ea-muted">
                    ${formatDate(Number(session.lastSeenAt ?? 0))} ·
                    ${session.revokedAt ? eaa("sessionRevoked") : ea("Đang hoạt động")}
                  </div>
                </div>
                <button
                  class="ea-button ea-button--danger"
                  type="button"
                  ?disabled=${Boolean(session.revokedAt)}
                  @click=${() => void this.revokeSession(String(session.id ?? ""))}
                >
                  ${ea("Thu hồi")}
                </button>
              </div>
            `,
          )}
          ${detail.sessions.length === 0
            ? html`<div class="ea-empty">${ea("Không có phiên đăng nhập.")}</div>`
            : nothing}
        </div>
      </section>
    `;
    const renderAdvanced = () => html`
      <section class="ea-stack">
        <div class="ea-banner">${eaa("advancedDataNote")}</div>
        <strong>${eaa("effectivePermissions")}</strong>
        <pre class="ea-code">${JSON.stringify(detail.effectivePolicy, null, 2)}</pre>
        <strong>${eaa("entitlements")}</strong>
        <pre class="ea-code">${JSON.stringify(detail.entitlements, null, 2)}</pre>
      </section>
    `;
    return html`
      <openclaw-enterprise-admin-dialog
        .open=${true}
        .drawer=${true}
        heading=${account.displayName}
        description=${eaa("accountDrawerDescription", { username: account.username })}
        .onClose=${() => this.closeDetail()}
      >
        <nav class="ea-tabs" aria-label=${ea("Chi tiết tài khoản")}>
          ${(
            [
              ["info", ea("Thông tin")],
              ["agents", ea("Agent & chuyên gia")],
              ["sessions", ea("Phiên đăng nhập")],
              ["advanced", ea("Quyền nâng cao")],
            ] as const
          ).map(
            ([id, label]) => html`<button
              class="ea-tab ${this.detailTab === id ? "ea-tab--active" : ""}"
              type="button"
              @click=${() => (this.detailTab = id)}
            >
              ${label}
            </button>`,
          )}
        </nav>
        ${this.detailLoading
          ? html`<div class="ea-loading">${ea("Đang tải tài khoản…")}</div>`
          : this.detailTab === "info"
            ? renderInfo()
            : this.detailTab === "agents"
              ? renderAgents()
              : this.detailTab === "sessions"
                ? renderSessions()
                : renderAdvanced()}
      </openclaw-enterprise-admin-dialog>
    `;
  }

  override render() {
    return html`
      <section class="ea-page">
        <header class="ea-page-header">
          <div>
            <h1>${ea("Quản lý tài khoản")}</h1>
            <p>${eaa("accountListSummary", { count: String(this.pageInfo.total) })}</p>
          </div>
          <button
            class="ea-button ea-button--primary"
            type="button"
            @click=${() => this.openCreateDialog()}
          >
            ${icons.plus} ${ea("Tạo tài khoản")}
          </button>
        </header>
        <div class="ea-toolbar">
          <input
            class="ea-input"
            type="search"
            placeholder=${ea("Tìm tên hoặc username…")}
            aria-label=${ea("Tìm tài khoản")}
            @input=${(event: Event) => {
              this.query = eventValue(event);
              this.scheduleLoad();
            }}
          />
          <select
            class="ea-select"
            aria-label=${ea("Lọc role")}
            @change=${(event: Event) => {
              this.roleFilter = eventValue(event);
              this.resetAndLoad();
            }}
          >
            <option value="">${ea("Tất cả role")}</option>
            <option value="administrator">${ea("Administrator")}</option>
            <option value="employee">${ea("Employee")}</option>
          </select>
          <select
            class="ea-select"
            aria-label=${ea("Lọc trạng thái")}
            @change=${(event: Event) => {
              this.status = eventValue(event);
              this.resetAndLoad();
            }}
          >
            <option value="">${ea("Tất cả trạng thái")}</option>
            <option value="enabled">${ea("Đang hoạt động")}</option>
            <option value="disabled">${ea("Đã khóa")}</option>
          </select>
          <select
            class="ea-select"
            aria-label=${ea("Lọc preset")}
            @change=${(event: Event) => {
              this.preset = eventValue(event);
              this.resetAndLoad();
            }}
          >
            <option value="">${ea("Tất cả preset")}</option>
            ${this.accessPresets.map(
              (preset) =>
                html`<option value=${preset.key}>
                  ${enterpriseAdminPresetLabel(preset.key, preset.label)}
                </option>`,
            )}
          </select>
          <select
            class="ea-select"
            aria-label=${ea("Lọc personal agent")}
            @change=${(event: Event) => {
              this.personalAgent = eventValue(event);
              this.resetAndLoad();
            }}
          >
            <option value="">${ea("Tất cả personal agent")}</option>
            <option value="enabled">${ea("Đã bật personal agent")}</option>
            <option value="disabled">${ea("Không có personal agent")}</option>
          </select>
          <span class="ea-spacer"></span>
          <select
            class="ea-select"
            aria-label=${ea("Sắp xếp")}
            @change=${(event: Event) => {
              this.sort = eventValue(event);
              this.resetAndLoad();
            }}
          >
            <option value="username">${ea("Username A–Z")}</option>
            <option value="-updatedAt">${ea("Mới cập nhật")}</option>
            <option value="-lastLoginAt">${ea("Đăng nhập gần nhất")}</option>
          </select>
        </div>
        <div class="ea-card ea-table-wrap">
          ${this.loading
            ? html`<div class="ea-loading">${ea("Đang tải danh sách tài khoản…")}</div>`
            : this.error
              ? html`<div class="ea-empty">
                  <p class="ea-error">${this.error}</p>
                  <button class="ea-button" @click=${() => void this.load()}>
                    ${ea("Thử lại")}
                  </button>
                </div>`
              : html`
                  <table class="ea-table">
                    <thead>
                      <tr>
                        <th><input type="checkbox" aria-label=${ea("Chọn tất cả")} /></th>
                        <th>${ea("Tài khoản")}</th>
                        <th>${ea("Role")}</th>
                        <th>${ea("Trạng thái")}</th>
                        <th>${ea("Agent")}</th>
                        <th>${ea("Access preset")}</th>
                        <th>${ea("Đăng nhập cuối")}</th>
                        <th>${ea("Cập nhật")}</th>
                        <th class="ea-table__action">${ea("Thao tác")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.accounts.map(
                        (account) => html`
                          <tr @click=${() => void this.openDetail(account)}>
                            <td @click=${(event: Event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                aria-label="${eaa("selectAccount")} ${account.username}"
                              />
                            </td>
                            <td>
                              <strong>${account.displayName}</strong>
                              <div class="ea-muted">@${account.username}</div>
                            </td>
                            <td>
                              ${account.role === "administrator"
                                ? ea("Administrator")
                                : ea("Employee")}
                            </td>
                            <td>
                              <span
                                class="ea-badge ${account.enabled
                                  ? "ea-badge--good"
                                  : "ea-badge--bad"}"
                                >${account.enabled ? ea("Hoạt động") : ea("Đã khóa")}</span
                              >
                            </td>
                            <td>
                              ${account.personalAgentEnabled
                                ? ea("Personal")
                                : (account.defaultAgentId ?? "—")}
                            </td>
                            <td>
                              <span class="ea-badge">
                                ${accessPresetLabel(account.accessPresetKey, this.accessPresets)}
                              </span>
                            </td>
                            <td>${formatDate(account.lastLoginAt)}</td>
                            <td>${formatDate(account.updatedAt)}</td>
                            <td class="ea-table__action">
                              <button class="ea-button" type="button">${ea("Xem")}</button>
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                  ${this.accounts.length === 0
                    ? html`<div class="ea-empty">${ea("Không có tài khoản phù hợp.")}</div>`
                    : nothing}
                `}
        </div>
        <div class="ea-toolbar" style="justify-content: flex-end; margin-top: 14px">
          <span class="ea-muted">${ea("Trang")} ${this.previousCursors.length + 1}</span>
          <button
            class="ea-button"
            type="button"
            ?disabled=${this.previousCursors.length === 0}
            @click=${() => this.previousPage()}
          >
            ${ea("Trước")}
          </button>
          <button
            class="ea-button"
            type="button"
            ?disabled=${!this.pageInfo.nextCursor}
            @click=${() => this.nextPage()}
          >
            ${ea("Sau")}
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
