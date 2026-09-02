import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { normalizeToolPolicyName } from "../../../../../src/agents/tool-policy-shared.js";
import { renderHubTabs } from "../../../components/hub-tabs.ts";
import { renderSettingsStatus } from "../../../components/settings-ui.ts";
import { copyToClipboard } from "../../../lib/clipboard.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import "../../../styles/agents.css";
import "../../../styles/settings.css";
import {
  createAdminSharedAgent,
  deleteAdminSharedAgent,
  listAdminAgentCatalog,
  loadAdminAgentFile,
  loadAdminAgentPanel,
  loadAdminConfig,
  loadAdminSharedRelationshipFile,
  mutateAdminAgentCron,
  runAdminAgentMemoryAction,
  saveAdminAgentFile,
  saveAdminSharedRelationshipFile,
  updateAdminAgentSkills,
  updateAdminAgentTools,
  updateAdminSharedRelationship,
  updateAdminSharedAgent,
  type EnterpriseAgentFile,
  type EnterprisePersonalAgent,
  type EnterpriseSharedRelationshipItem,
  type EnterpriseSharedRelationshipProfile,
  type EnterpriseSharedAgent,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage } from "../utils.ts";
import "../components/admin-dialog.ts";
import "../components/access-dialog.ts";
import {
  renderAgentFilesPanel,
  renderAgentSkillsPanel,
  renderAgentToolsPanel,
} from "./agent-files-policy-views.ts";
import {
  renderAdminAgentCatalog,
  renderAdminAgentOverview,
  renderCreateSharedAgentDialog,
  type AdminSelectedAgent,
} from "./agent-overview-list-views.ts";
import { renderAgentRelationshipsPanel } from "./agent-relationship-views.ts";
import {
  renderAgentChannelsPanel,
  renderAgentCronEditor,
  renderAgentCronPanel,
  renderAgentMemoryPanel,
} from "./agent-runtime-views.ts";

type AgentTab = "shared" | "personal";
type DrawerTab =
  | "overview"
  | "relationships"
  | "files"
  | "tools"
  | "skills"
  | "channels"
  | "cron"
  | "memory";
type SelectedAgent = AdminSelectedAgent;

const drawerTabs: Array<{ id: DrawerTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "relationships", label: "Danh xưng" },
  { id: "files", label: "Files" },
  { id: "tools", label: "Tools" },
  { id: "skills", label: "Skills" },
  { id: "channels", label: "Channels" },
  { id: "cron", label: "Cron" },
  { id: "memory", label: "Memory" },
];

export class EnterpriseAdminAgentsPage extends OpenClawLightDomElement {
  @state() private tab: AgentTab = "shared";
  @state() private shared: EnterpriseSharedAgent[] = [];
  @state() private personal: EnterprisePersonalAgent[] = [];
  @state() private selected?: SelectedAgent;
  @state() private drawerTab: DrawerTab = "overview";
  @state() private loading = true;
  @state() private panelLoading = false;
  @state() private error = "";
  @state() private accessOpen = false;
  @state() private createOpen = false;
  @state() private creating = false;
  @state() private panelData?: Record<string, unknown>;
  @state() private panelSaving = false;
  @state() private panelError = "";
  @state() private query = "";
  @state() private activeFile?: EnterpriseAgentFile;
  @state() private fileDraft = "";
  @state() private fileBusy = false;
  @state() private toolProfile: "minimal" | "coding" | "messaging" | "full" | null = null;
  @state() private toolAlsoAllow: string[] = [];
  @state() private toolDeny: string[] = [];
  @state() private skillAllowlist: string[] | null = null;
  @state() private policyDirty = false;
  @state() private cronEditorOpen = false;
  @state() private cronEditing?: Record<string, unknown>;
  @state() private cronScheduleKind: "at" | "every" | "cron" = "every";
  @state() private memoryActionBusy = "";
  @state() private relationshipAccountId = "";
  @state() private relationshipProfile?: EnterpriseSharedRelationshipProfile;
  @state() private relationshipSource?: EnterpriseSharedRelationshipProfile;
  private panelEpoch = 0;
  private panelAbort?: AbortController;

  override connectedCallback(): void {
    super.connectedCallback();
    globalThis.addEventListener("popstate", this.restoreDrawer);
    void this.load();
  }

  override disconnectedCallback(): void {
    globalThis.removeEventListener("popstate", this.restoreDrawer);
    this.panelEpoch += 1;
    this.panelAbort?.abort();
    super.disconnectedCallback();
  }

  private readonly restoreDrawer = () => {
    const search = new URLSearchParams(globalThis.location.search);
    const agentId = search.get("agent");
    const type = search.get("type");
    const panel = search.get("panel");
    if (panel && drawerTabs.some((item) => item.id === panel)) {
      this.drawerTab = panel as DrawerTab;
    }
    if (!agentId) {
      this.selected = undefined;
      return;
    }
    if (type === "personal") {
      const value = this.personal.find(
        (item) => item.accountId === agentId || item.instanceId === agentId,
      );
      this.selected = value ? { kind: "personal", value } : undefined;
      if (this.drawerTab === "relationships") {
        this.drawerTab = "overview";
      }
    } else {
      const value = this.shared.find((item) => item.agentId === agentId);
      this.selected = value ? { kind: "shared", value } : undefined;
    }
    if (this.selected) {
      void this.loadPanel();
    }
  };

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      const result = await listAdminAgentCatalog();
      this.shared = result.shared;
      this.personal = result.personal;
      this.restoreDrawer();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private openAgent(selected: SelectedAgent): void {
    this.selected = selected;
    this.drawerTab = "overview";
    this.relationshipAccountId = "";
    this.relationshipProfile = undefined;
    this.relationshipSource = undefined;
    const search = new URLSearchParams(globalThis.location.search);
    search.set("type", selected.kind);
    search.set(
      "agent",
      selected.kind === "shared" ? selected.value.agentId : selected.value.accountId,
    );
    search.set("panel", "overview");
    globalThis.history.pushState(
      globalThis.history.state,
      "",
      `${globalThis.location.pathname}?${search.toString()}`,
    );
    void this.loadPanel();
  }

  private selectedTarget(): { scope: "shared" | "personal"; id: string } | undefined {
    if (!this.selected) {
      return undefined;
    }
    return {
      scope: this.selected.kind,
      id:
        this.selected.kind === "shared"
          ? this.selected.value.agentId
          : this.selected.value.accountId,
    };
  }

  private hasUnsavedPanelChanges(): boolean {
    return (
      this.policyDirty ||
      this.relationshipDirty() ||
      Boolean(this.activeFile && this.fileDraft !== this.activeFile.content)
    );
  }

  private relationshipDirty(): boolean {
    const draft = this.relationshipProfile;
    const source = this.relationshipSource;
    return Boolean(
      draft &&
      source &&
      (draft.agentAlias !== source.agentAlias ||
        draft.agentSelfReference !== source.agentSelfReference ||
        draft.userAddress !== source.userAddress ||
        draft.customInstructions !== source.customInstructions),
    );
  }

  private confirmDiscardChanges(): boolean {
    return (
      !this.hasUnsavedPanelChanges() ||
      globalThis.confirm("Bạn có thay đổi chưa lưu. Bỏ các thay đổi này?")
    );
  }

  private confirmDiscardFileChanges(): boolean {
    return (
      !this.activeFile ||
      this.fileDraft === this.activeFile.content ||
      globalThis.confirm("Bạn có thay đổi file chưa lưu. Bỏ các thay đổi này?")
    );
  }

  private closeAgent(discardConfirmed = false): void {
    if (!discardConfirmed && !this.confirmDiscardChanges()) {
      return;
    }
    this.panelEpoch += 1;
    this.panelAbort?.abort();
    this.selected = undefined;
    const search = new URLSearchParams(globalThis.location.search);
    search.delete("type");
    search.delete("agent");
    search.delete("panel");
    const suffix = search.toString();
    globalThis.history.pushState(
      globalThis.history.state,
      "",
      `${globalThis.location.pathname}${suffix ? `?${suffix}` : ""}`,
    );
  }

  private selectPanel(tab: DrawerTab): void {
    if (tab === this.drawerTab || !this.confirmDiscardChanges()) {
      return;
    }
    this.drawerTab = tab;
    const search = new URLSearchParams(globalThis.location.search);
    search.set("panel", tab);
    globalThis.history.pushState(
      globalThis.history.state,
      "",
      `${globalThis.location.pathname}?${search.toString()}`,
    );
    void this.loadPanel();
  }

  private async loadPanel(): Promise<void> {
    if (!this.selected) {
      return;
    }
    this.panelAbort?.abort();
    const controller = new AbortController();
    this.panelAbort = controller;
    const epoch = ++this.panelEpoch;
    this.panelLoading = true;
    this.panelError = "";
    this.panelData = undefined;
    this.activeFile = undefined;
    this.fileDraft = "";
    this.policyDirty = false;
    this.relationshipProfile = undefined;
    this.relationshipSource = undefined;
    try {
      const id =
        this.selected.kind === "shared"
          ? this.selected.value.agentId
          : this.selected.value.accountId;
      const data = await loadAdminAgentPanel(
        this.selected.kind,
        id,
        this.drawerTab,
        controller.signal,
      );
      if (epoch === this.panelEpoch && !controller.signal.aborted) {
        this.panelData = data;
        this.initializePanelDraft(data);
        if (this.drawerTab === "files") {
          await this.openFirstFile(data, epoch, controller.signal);
        } else if (this.drawerTab === "relationships") {
          await this.openFirstRelationshipFile(data, epoch, controller.signal);
        }
      }
    } catch (error) {
      if (!controller.signal.aborted && epoch === this.panelEpoch) {
        this.panelError = errorMessage(error);
      }
    } finally {
      if (epoch === this.panelEpoch) {
        this.panelLoading = false;
        this.fileBusy = false;
      }
    }
  }

  private initializePanelDraft(data: Record<string, unknown>): void {
    if (this.drawerTab === "tools") {
      const policy =
        data.policy && typeof data.policy === "object"
          ? (data.policy as Record<string, unknown>)
          : {};
      const profile = policy.profile;
      this.toolProfile =
        profile === "minimal" ||
        profile === "coding" ||
        profile === "messaging" ||
        profile === "full"
          ? profile
          : null;
      this.toolAlsoAllow = Array.isArray(policy.alsoAllow)
        ? policy.alsoAllow.filter((item): item is string => typeof item === "string")
        : [];
      this.toolDeny = Array.isArray(policy.deny)
        ? policy.deny.filter((item): item is string => typeof item === "string")
        : [];
    }
    if (this.drawerTab === "skills") {
      this.skillAllowlist = Array.isArray(data.binding)
        ? data.binding.filter((item): item is string => typeof item === "string")
        : null;
    }
    if (this.drawerTab === "relationships") {
      const items = this.relationshipItems(data);
      const selected =
        items.find((item) => item.accountId === this.relationshipAccountId) ?? items[0];
      this.setRelationshipDraft(selected);
    }
  }

  private relationshipItems(
    data: Record<string, unknown> | undefined = this.panelData,
  ): EnterpriseSharedRelationshipItem[] {
    const relationship =
      data?.relationship && typeof data.relationship === "object"
        ? (data.relationship as Record<string, unknown>)
        : undefined;
    return Array.isArray(relationship?.items)
      ? (relationship.items as EnterpriseSharedRelationshipItem[])
      : [];
  }

  private setRelationshipDraft(item: EnterpriseSharedRelationshipItem | undefined): void {
    this.relationshipAccountId = item?.accountId ?? "";
    this.relationshipProfile = item ? { ...item.profile } : undefined;
    this.relationshipSource = item ? { ...item.profile } : undefined;
  }

  private async openFirstRelationshipFile(
    data: Record<string, unknown>,
    epoch: number,
    signal: AbortSignal,
  ): Promise<void> {
    const selected = this.relationshipItems(data).find(
      (item) => item.accountId === this.relationshipAccountId,
    );
    const firstName = selected?.files[0]?.name;
    if (!selected || !firstName) {
      return;
    }
    await this.loadRelationshipFile(firstName, epoch, signal);
  }

  private async openFirstFile(
    data: Record<string, unknown>,
    epoch: number,
    signal: AbortSignal,
  ): Promise<void> {
    const target = this.selectedTarget();
    const files = Array.isArray(data.files) ? (data.files as Array<Record<string, unknown>>) : [];
    const firstName = files
      .map((file) => (typeof file.name === "string" ? file.name : ""))
      .find(Boolean);
    if (!target || !firstName) {
      return;
    }
    this.fileBusy = true;
    const result = await loadAdminAgentFile(target.scope, target.id, firstName);
    if (epoch === this.panelEpoch && !signal.aborted && this.drawerTab === "files") {
      this.activeFile = result.file;
      this.fileDraft = result.file.content;
    }
  }

  private async openFile(name: string): Promise<void> {
    const target = this.selectedTarget();
    if (!target || this.fileBusy || !this.confirmDiscardChanges()) {
      return;
    }
    this.fileBusy = true;
    this.panelError = "";
    try {
      const result = await loadAdminAgentFile(target.scope, target.id, name);
      this.activeFile = result.file;
      this.fileDraft = result.file.content;
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.fileBusy = false;
    }
  }

  private async saveFile(): Promise<void> {
    const target = this.selectedTarget();
    const file = this.activeFile;
    if (!target || !file || this.fileBusy || this.fileDraft === file.content) {
      return;
    }
    this.fileBusy = true;
    this.panelError = "";
    try {
      const result = await saveAdminAgentFile(target.scope, target.id, {
        name: file.name,
        content: this.fileDraft,
        baseRevision: file.contentRevision,
      });
      await this.loadPanel();
      this.activeFile = result.file;
      this.fileDraft = result.file.content;
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.fileBusy = false;
    }
  }

  private async loadRelationshipFile(
    name: string,
    epoch = this.panelEpoch,
    signal?: AbortSignal,
  ): Promise<void> {
    if (this.selected?.kind !== "shared" || !this.relationshipAccountId) {
      return;
    }
    this.fileBusy = true;
    const result = await loadAdminSharedRelationshipFile(
      this.selected.value.agentId,
      this.relationshipAccountId,
      name,
      signal,
    );
    if (epoch === this.panelEpoch && !signal?.aborted && this.drawerTab === "relationships") {
      this.activeFile = result.file;
      this.fileDraft = result.file.content;
    }
  }

  private selectRelationshipAccount(accountId: string): void {
    if (
      accountId === this.relationshipAccountId ||
      this.fileBusy ||
      !this.confirmDiscardChanges()
    ) {
      return;
    }
    const selected = this.relationshipItems().find((item) => item.accountId === accountId);
    this.setRelationshipDraft(selected);
    this.activeFile = undefined;
    this.fileDraft = "";
    const firstName = selected?.files[0]?.name;
    if (firstName) {
      void this.openRelationshipFile(firstName, false);
    }
  }

  private updateRelationshipProfile(patch: Partial<EnterpriseSharedRelationshipProfile>): void {
    if (this.relationshipProfile) {
      this.relationshipProfile = { ...this.relationshipProfile, ...patch };
    }
  }

  private async saveRelationshipProfile(): Promise<void> {
    if (
      this.selected?.kind !== "shared" ||
      !this.relationshipAccountId ||
      !this.relationshipProfile ||
      !this.relationshipDirty() ||
      this.panelSaving
    ) {
      return;
    }
    this.panelSaving = true;
    this.panelError = "";
    try {
      await updateAdminSharedRelationship(
        this.selected.value.agentId,
        this.relationshipAccountId,
        this.relationshipProfile,
      );
      await this.loadPanel();
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.panelSaving = false;
    }
  }

  private async openRelationshipFile(name: string, confirmDiscard = true): Promise<void> {
    if (
      this.fileBusy ||
      (confirmDiscard && !this.confirmDiscardFileChanges()) ||
      this.selected?.kind !== "shared" ||
      !this.relationshipAccountId
    ) {
      return;
    }
    this.panelError = "";
    try {
      await this.loadRelationshipFile(name);
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.fileBusy = false;
    }
  }

  private async saveRelationshipFile(): Promise<void> {
    const file = this.activeFile;
    if (
      this.selected?.kind !== "shared" ||
      !this.relationshipAccountId ||
      !file ||
      this.fileBusy ||
      this.fileDraft === file.content
    ) {
      return;
    }
    this.fileBusy = true;
    this.panelError = "";
    try {
      const result = await saveAdminSharedRelationshipFile(
        this.selected.value.agentId,
        this.relationshipAccountId,
        {
          name: file.name,
          content: this.fileDraft,
          baseRevision: file.contentRevision,
        },
      );
      const relationship =
        this.panelData?.relationship && typeof this.panelData.relationship === "object"
          ? (this.panelData.relationship as Record<string, unknown>)
          : undefined;
      if (relationship && Array.isArray(relationship.items)) {
        this.panelData = {
          ...this.panelData,
          relationship: {
            ...relationship,
            items: (relationship.items as EnterpriseSharedRelationshipItem[]).map((item) =>
              item.accountId === this.relationshipAccountId
                ? {
                    ...item,
                    files: item.files.map((summary) =>
                      summary.name === result.file.name
                        ? {
                            name: result.file.name,
                            missing: result.file.missing,
                            size: result.file.size,
                            updatedAt: result.file.updatedAt,
                            writable: result.file.writable,
                          }
                        : summary,
                    ),
                  }
                : item,
            ),
          },
        };
      }
      this.activeFile = result.file;
      this.fileDraft = result.file.content;
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.fileBusy = false;
    }
  }

  private toggleTool(toolId: string, enabled: boolean, baseAllowed = false): void {
    const allow = new Set(this.toolAlsoAllow.map(normalizeToolPolicyName).filter(Boolean));
    const deny = new Set(this.toolDeny.map(normalizeToolPolicyName).filter(Boolean));
    const normalized = normalizeToolPolicyName(toolId);
    if (enabled) {
      deny.delete(normalized);
      if (!baseAllowed) {
        allow.add(normalized);
      } else {
        allow.delete(normalized);
      }
    } else {
      allow.delete(normalized);
      deny.add(normalized);
    }
    this.toolAlsoAllow = [...allow];
    this.toolDeny = [...deny];
    this.policyDirty = true;
  }

  private async saveTools(): Promise<void> {
    const target = this.selectedTarget();
    const baseHash = String(this.panelData?.revision ?? "");
    const baseRevision = Number(this.panelData?.policyRevision);
    if (
      !target ||
      !this.policyDirty ||
      (target.scope === "shared" && !baseHash) ||
      (target.scope === "personal" && (!Number.isSafeInteger(baseRevision) || baseRevision < 0))
    ) {
      return;
    }
    this.panelSaving = true;
    this.panelError = "";
    try {
      await updateAdminAgentTools(target.scope, target.id, {
        profile: this.toolProfile,
        alsoAllow: this.toolAlsoAllow,
        deny: this.toolDeny,
        ...(target.scope === "personal" ? { baseRevision } : { baseHash }),
      });
      await this.loadPanel();
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.panelSaving = false;
    }
  }

  private toggleSkill(name: string, enabled: boolean, allNames: string[]): void {
    const selected = new Set(this.skillAllowlist ?? allNames);
    if (enabled) {
      selected.add(name);
    } else {
      selected.delete(name);
    }
    this.skillAllowlist = [...selected];
    this.policyDirty = true;
  }

  private async saveSkills(): Promise<void> {
    const target = this.selectedTarget();
    const baseHash = String(this.panelData?.revision ?? "");
    if (!target || !baseHash || !this.policyDirty) {
      return;
    }
    this.panelSaving = true;
    this.panelError = "";
    try {
      await updateAdminAgentSkills(target.scope, target.id, this.skillAllowlist, baseHash);
      await this.loadPanel();
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.panelSaving = false;
    }
  }

  private async saveSharedOverview(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (this.selected?.kind !== "shared") {
      return;
    }
    const revision = String(this.panelData?.revision ?? "");
    if (!revision) {
      this.panelError = "Không có config revision để lưu an toàn.";
      return;
    }
    const data = new FormData(event.currentTarget as HTMLFormElement);
    this.panelSaving = true;
    this.panelError = "";
    try {
      await updateAdminSharedAgent(this.selected.value.agentId, {
        name: String(data.get("name") ?? ""),
        model: String(data.get("model") ?? "").trim() || null,
        workspace: String(data.get("workspace") ?? "").trim() || null,
        baseHash: revision,
      });
      await this.load();
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.panelSaving = false;
    }
  }

  private async deleteShared(): Promise<void> {
    if (this.selected?.kind !== "shared") {
      return;
    }
    const revision = String(this.panelData?.revision ?? "");
    if (!revision || !globalThis.confirm(`Xóa shared agent ${this.selected.value.agentId}?`)) {
      return;
    }
    this.panelSaving = true;
    this.panelError = "";
    try {
      await deleteAdminSharedAgent(this.selected.value.agentId, revision);
      this.closeAgent();
      await this.load();
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.panelSaving = false;
    }
  }

  private async createAgent(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    this.creating = true;
    this.error = "";
    try {
      const config = await loadAdminConfig();
      await createAdminSharedAgent({
        id: String(data.get("id") ?? ""),
        name: String(data.get("name") ?? ""),
        model: String(data.get("model") ?? "").trim() || null,
        workspace: String(data.get("workspace") ?? "").trim() || null,
        baseHash: config.hash,
      });
      form.reset();
      this.createOpen = false;
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.creating = false;
    }
  }

  private filteredShared(): EnterpriseSharedAgent[] {
    const query = this.query.trim().toLowerCase();
    return this.shared.filter(
      (item) =>
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.agentId.toLowerCase().includes(query),
    );
  }

  private filteredPersonal(): EnterprisePersonalAgent[] {
    const query = this.query.trim().toLowerCase();
    return this.personal.filter(
      (item) =>
        !query ||
        item.ownerDisplayName.toLowerCase().includes(query) ||
        item.username.toLowerCase().includes(query),
    );
  }

  private renderOverview(selected: SelectedAgent) {
    return renderAdminAgentOverview({
      selected,
      data: this.panelData,
      error: this.panelError,
      saving: this.panelSaving,
      onSave: (event) => void this.saveSharedOverview(event),
      onDelete: () => void this.deleteShared(),
    });
  }

  private openCronEditor(job?: Record<string, unknown>): void {
    this.cronEditing = job;
    const schedule =
      job?.schedule && typeof job.schedule === "object"
        ? (job.schedule as Record<string, unknown>)
        : {};
    this.cronScheduleKind =
      schedule.kind === "at" || schedule.kind === "cron" ? schedule.kind : "every";
    this.cronEditorOpen = true;
  }

  private async submitCron(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const target = this.selectedTarget();
    if (!target) {
      return;
    }
    const values = new FormData(event.currentTarget as HTMLFormElement);
    const scheduleKind = String(values.get("scheduleKind"));
    const schedule =
      scheduleKind === "at"
        ? { kind: "at", at: new Date(String(values.get("scheduleAt"))).toISOString() }
        : scheduleKind === "cron"
          ? {
              kind: "cron",
              expr: String(values.get("cronExpr") ?? "").trim(),
              ...(String(values.get("cronTz") ?? "").trim()
                ? { tz: String(values.get("cronTz")).trim() }
                : {}),
            }
          : {
              kind: "every",
              everyMs:
                Number(values.get("everyAmount")) *
                (String(values.get("everyUnit")) === "hours" ? 3_600_000 : 60_000),
            };
    const payloadKind = String(values.get("payloadKind"));
    const payload =
      payloadKind === "systemEvent"
        ? { kind: "systemEvent", text: String(values.get("payloadText") ?? "").trim() }
        : {
            kind: "agentTurn",
            message: String(values.get("payloadText") ?? "").trim(),
            ...(String(values.get("model") ?? "").trim()
              ? { model: String(values.get("model")).trim() }
              : {}),
          };
    const job = {
      name: String(values.get("name") ?? "").trim(),
      description: String(values.get("description") ?? "").trim(),
      enabled: values.get("enabled") === "on",
      schedule,
      sessionTarget: String(values.get("sessionTarget") ?? "isolated"),
      wakeMode: String(values.get("wakeMode") ?? "now"),
      payload,
      delivery: {
        mode: String(values.get("deliveryMode") ?? "none"),
        ...(String(values.get("deliveryTo") ?? "").trim()
          ? { to: String(values.get("deliveryTo")).trim() }
          : {}),
      },
    };
    this.panelSaving = true;
    this.panelError = "";
    try {
      if (this.cronEditing) {
        await mutateAdminAgentCron(target.scope, target.id, {
          action: "update",
          jobId: String(this.cronEditing.id ?? ""),
          expectedUpdatedAt: Number(this.cronEditing.updatedAtMs ?? 0),
          patch: job,
        });
      } else {
        await mutateAdminAgentCron(target.scope, target.id, { action: "create", job });
      }
      this.cronEditorOpen = false;
      this.cronEditing = undefined;
      await this.loadPanel();
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.panelSaving = false;
    }
  }

  private async cronAction(action: "run" | "remove" | "update", job: Record<string, unknown>) {
    const target = this.selectedTarget();
    if (!target || this.panelSaving) {
      return;
    }
    if (action === "remove" && !globalThis.confirm(`Xóa cron job ${String(job.name ?? "")}?`)) {
      return;
    }
    this.panelSaving = true;
    this.panelError = "";
    try {
      await mutateAdminAgentCron(target.scope, target.id, {
        action,
        jobId: String(job.id ?? ""),
        ...(action === "update"
          ? {
              expectedUpdatedAt: Number(job.updatedAtMs ?? 0),
              patch: { enabled: job.enabled !== true },
            }
          : action === "remove"
            ? { expectedUpdatedAt: Number(job.updatedAtMs ?? 0) }
            : {}),
      });
      await this.loadPanel();
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.panelSaving = false;
    }
  }

  private async memoryAction(action: Parameters<typeof runAdminAgentMemoryAction>[2]) {
    const target = this.selectedTarget();
    if (!target || this.memoryActionBusy) {
      return;
    }
    const destructive = action === "resetDreamDiary" || action === "resetGroundedShortTerm";
    if (
      destructive &&
      !globalThis.confirm("Thao tác này sẽ xóa dữ liệu memory tương ứng. Tiếp tục?")
    ) {
      return;
    }
    this.memoryActionBusy = action;
    this.panelError = "";
    try {
      await runAdminAgentMemoryAction(target.scope, target.id, action);
      await this.loadPanel();
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.memoryActionBusy = "";
    }
  }

  private renderPanel(selected: SelectedAgent) {
    if (this.panelLoading) {
      return html`<div class="ea-loading">Đang tải ${this.drawerTab}…</div>`;
    }
    if (this.drawerTab === "overview") {
      return this.renderOverview(selected);
    }
    const data = this.panelData ?? {};
    if (this.drawerTab === "relationships") {
      const relationship =
        data.relationship && typeof data.relationship === "object"
          ? (data.relationship as Record<string, unknown>)
          : {};
      const structured = renderAgentRelationshipsPanel({
        canonicalName:
          typeof relationship.canonicalName === "string"
            ? relationship.canonicalName
            : selected.kind === "shared"
              ? selected.value.name
              : "Agent",
        items: this.relationshipItems(data),
        selectedAccountId: this.relationshipAccountId,
        profile: this.relationshipProfile,
        profileDirty: this.relationshipDirty(),
        saving: this.panelSaving,
        activeFile: this.activeFile,
        fileDraft: this.fileDraft,
        fileBusy: this.fileBusy,
        onSelectAccount: (accountId) => this.selectRelationshipAccount(accountId),
        onProfile: (patch) => this.updateRelationshipProfile(patch),
        onSaveProfile: () => void this.saveRelationshipProfile(),
        onOpenFile: (name) => void this.openRelationshipFile(name),
        onFileDraft: (value) => (this.fileDraft = value),
        onResetFile: () => (this.fileDraft = this.activeFile?.content ?? ""),
        onSaveFile: () => void this.saveRelationshipFile(),
      });
      return html`
        ${this.panelError
          ? html`<p class="ea-error enterprise-agent-panel__error">${this.panelError}</p>`
          : nothing}
        <div class="enterprise-agent-panel__content">${structured}</div>
      `;
    }
    const structured =
      this.drawerTab === "files"
        ? renderAgentFilesPanel({
            data,
            activeFile: this.activeFile,
            draft: this.fileDraft,
            busy: this.fileBusy,
            onOpen: (name) => void this.openFile(name),
            onDraft: (value) => (this.fileDraft = value),
            onReset: () => (this.fileDraft = this.activeFile?.content ?? ""),
            onSave: () => void this.saveFile(),
          })
        : this.drawerTab === "tools"
          ? renderAgentToolsPanel({
              data,
              profile: this.toolProfile,
              alsoAllow: this.toolAlsoAllow,
              deny: this.toolDeny,
              dirty: this.policyDirty,
              saving: this.panelSaving,
              onProfile: (value) => {
                this.toolProfile = value;
                this.policyDirty = true;
              },
              onToggle: (toolId, enabled, baseAllowed) =>
                this.toggleTool(toolId, enabled, baseAllowed),
              onSave: () => void this.saveTools(),
            })
          : this.drawerTab === "skills"
            ? renderAgentSkillsPanel({
                data,
                allowlist: this.skillAllowlist,
                dirty: this.policyDirty,
                saving: this.panelSaving,
                onToggle: (name, enabled, allNames) => this.toggleSkill(name, enabled, allNames),
                onInherit: () => {
                  this.skillAllowlist = null;
                  this.policyDirty = true;
                },
                onSave: () => void this.saveSkills(),
              })
            : this.drawerTab === "channels"
              ? renderAgentChannelsPanel(data)
              : this.drawerTab === "cron"
                ? renderAgentCronPanel({
                    data,
                    saving: this.panelSaving,
                    renderEditor: () =>
                      renderAgentCronEditor({
                        open: this.cronEditorOpen,
                        editing: this.cronEditing,
                        scheduleKind: this.cronScheduleKind,
                        saving: this.panelSaving,
                        error: this.panelError,
                        onClose: () => (this.cronEditorOpen = false),
                        onScheduleKind: (kind) => (this.cronScheduleKind = kind),
                        onSubmit: (event) => void this.submitCron(event),
                      }),
                    onRefresh: () => void this.loadPanel(),
                    onCreate: () => this.openCronEditor(),
                    onEdit: (job) => this.openCronEditor(job),
                    onAction: (action, job) => void this.cronAction(action, job),
                  })
                : renderAgentMemoryPanel({
                    data,
                    busyAction: this.memoryActionBusy,
                    onAction: (action) => void this.memoryAction(action),
                  });
    return html`
      ${this.panelError
        ? html`<p class="ea-error enterprise-agent-panel__error">${this.panelError}</p>`
        : nothing}
      <div class="enterprise-agent-panel__content">${structured}</div>
    `;
  }

  private renderDrawer() {
    if (!this.selected) {
      return nothing;
    }
    const selected = this.selected;
    const title =
      selected.kind === "shared" ? selected.value.name : selected.value.ownerDisplayName;
    const resourceKey = selected.value.resourceKey;
    return html`
      <openclaw-enterprise-admin-dialog
        .open=${true}
        .drawer=${true}
        .wide=${true}
        heading=${title}
        description=${selected.kind === "shared"
          ? selected.value.agentId
          : selected.value.instanceId}
        .canClose=${() => this.confirmDiscardChanges()}
        .onClose=${() => this.closeAgent(true)}
      >
        <div class="agents-layout">
          <section class="agents-toolbar">
            <div class="agents-toolbar-row">
              <div class="agents-toolbar-actions">
                <button
                  class="btn btn--sm btn--ghost"
                  type="button"
                  @click=${() =>
                    void copyToClipboard(
                      selected.kind === "shared"
                        ? selected.value.agentId
                        : selected.value.instanceId,
                    )}
                >
                  Copy ID
                </button>
                ${selected.kind === "shared"
                  ? html`<button
                      class="btn btn--sm btn--ghost"
                      type="button"
                      @click=${() => (this.accessOpen = true)}
                    >
                      Quản lý user
                    </button>`
                  : nothing}
                <button
                  class="btn btn--sm agents-refresh-btn"
                  type="button"
                  ?disabled=${this.panelLoading}
                  @click=${() => void this.loadPanel()}
                >
                  ${this.panelLoading ? "Đang tải…" : "Refresh"}
                </button>
                ${renderSettingsStatus({ kind: "ok", label: "Revision-safe" })}
              </div>
            </div>
          </section>
          <section class="agents-main">
            ${renderHubTabs({
              id: "enterprise-agent",
              active: this.drawerTab,
              tabs: drawerTabs
                .filter((tab) => selected.kind === "shared" || tab.id !== "relationships")
                .map((tab) => ({
                  value: tab.id,
                  label: tab.label,
                  count:
                    tab.id === "relationships" && selected.kind === "shared"
                      ? this.relationshipItems().length || selected.value.assignedUserCount
                      : tab.id === "tools"
                        ? selected.value.toolCount
                        : tab.id === "skills"
                          ? selected.value.skillCount
                          : null,
                })),
              ariaLabel: "Chi tiết agent",
              panelId: "enterprise-agent-panel",
              className: "enterprise-agent-hub-tabs",
              onSelect: (tab) => this.selectPanel(tab),
            })}
            <div
              id="enterprise-agent-panel"
              class="enterprise-agent-panel"
              role="tabpanel"
              aria-labelledby=${`enterprise-agent-tab-${this.drawerTab}`}
            >
              ${this.renderPanel(selected)}
            </div>
          </section>
        </div>
        ${this.accessOpen
          ? html`<openclaw-enterprise-access-dialog
              .open=${true}
              resourceType="agent"
              .resourceKey=${resourceKey}
              .resourceName=${title}
              .onClose=${() => (this.accessOpen = false)}
              .onSaved=${() => void this.load()}
            ></openclaw-enterprise-access-dialog>`
          : nothing}
      </openclaw-enterprise-admin-dialog>
    `;
  }

  override render() {
    const shared = this.filteredShared();
    const personal = this.filteredPersonal();
    return html`
      ${renderAdminAgentCatalog({
        tab: this.tab,
        allSharedCount: this.shared.length,
        allPersonalCount: this.personal.length,
        shared,
        personal,
        loading: this.loading,
        error: this.error,
        onTab: (tab) => (this.tab = tab),
        onQuery: (query) => (this.query = query),
        onCreate: () => (this.createOpen = true),
        onOpen: (selected) => this.openAgent(selected),
      })}
      ${this.renderDrawer()}
      ${renderCreateSharedAgentDialog({
        open: this.createOpen,
        creating: this.creating,
        error: this.error,
        onClose: () => (this.createOpen = false),
        onSubmit: (event) => void this.createAgent(event),
      })}
    `;
  }
}

if (!customElements.get("openclaw-enterprise-admin-agents-page")) {
  customElements.define("openclaw-enterprise-admin-agents-page", EnterpriseAdminAgentsPage);
}
