import { isRecord } from "@openclaw/normalization-core/record-coerce";
import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { normalizeToolPolicyName } from "../../../../../src/agents/tool-policy-shared.js";
import { showNativeConfirm } from "../../../branding/display-dialog.ts";
import { renderHubTabs } from "../../../components/hub-tabs.ts";
import { renderSettingsStatus } from "../../../components/settings-ui.ts";
import { eaa } from "../../../i18n/enterprise-admin-agents.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import {
  enterpriseDomainCopy,
  type EnterpriseDelegationKey,
} from "../../../i18n/enterprise-domain.ts";
import { copyToClipboard } from "../../../lib/clipboard.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import "../../../styles/agents.css";
import "../../../styles/settings.css";
import {
  createAdminSharedAgent,
  activateAdminDelegation,
  deleteAdminSharedAgent,
  draftAdminAgentDelegationProfile,
  listAdminAccounts,
  listAdminDelegationEvents,
  listAdminAgentCatalog,
  loadAdminAgentFile,
  loadAdminAgentPanel,
  loadAdminAgentDelegationProfile,
  loadAdminDelegationOverview,
  loadAdminDelegationSettings,
  loadAdminConfig,
  loadAdminSharedRelationshipFile,
  mutateAdminAgentCron,
  previewAdminDelegationActivation,
  runAdminAgentMemoryAction,
  saveAdminAgentFile,
  saveAdminAgentDelegationProfile,
  saveAdminDelegationSettings,
  simulateAdminAgentDelegation,
  saveAdminSharedRelationshipFile,
  updateAdminAgentSkills,
  updateAdminAgentTools,
  updateAdminSharedRelationship,
  updateAdminSharedAgent,
  type EnterpriseAgentFile,
  type EnterpriseAccount,
  type EnterpriseDelegationEvent,
  type EnterpriseDelegationPolicy,
  type EnterpriseDelegationProfile,
  type EnterprisePersonalAgent,
  type EnterpriseSharedRelationshipItem,
  type EnterpriseSharedRelationshipProfile,
  type EnterpriseSharedAgent,
  EnterpriseApiError,
} from "../../enterprise/services/enterprise-api.ts";
import {
  approveAdminAgentAccessRequest,
  listAdminAgentAccessRequests,
  loadAdminAgentAccessRequest,
  rejectAdminAgentAccessRequest,
  type EnterpriseAgentAccessRequest,
  type EnterpriseAgentAccessRequestDetail,
} from "../agent-access-api.ts";
import "../components/admin-dialog.ts";
import "../components/access-dialog.ts";
import { errorMessage, formatDate } from "../utils.ts";
import {
  agentAccessRequestStateLabel,
  renderAgentAccessRequestList,
  type AgentAccessRequestListFilter,
} from "./agent-access-request-views.ts";
import {
  renderDelegationDashboard,
  renderDelegationProfileEditor,
  type DelegationEventFilterDraft,
} from "./agent-delegation-views.ts";
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

type AgentTab = "shared" | "personal" | "delegation" | "access-requests";
type DrawerTab =
  | "overview"
  | "relationships"
  | "files"
  | "tools"
  | "skills"
  | "channels"
  | "cron"
  | "memory"
  | "delegation";
type SelectedAgent = AdminSelectedAgent;
type DelegationOverview = Awaited<ReturnType<typeof loadAdminDelegationOverview>>;
type DelegationPreview = Awaited<ReturnType<typeof previewAdminDelegationActivation>>;
type DelegationProfileEnvelope = Awaited<ReturnType<typeof loadAdminAgentDelegationProfile>>;

const d = (key: EnterpriseDelegationKey, params?: Record<string, string>) =>
  enterpriseDomainCopy(`enterpriseDelegation.${key}`, params);

function isDelegationProfileEnvelope(
  value: Record<string, unknown>,
): value is Record<string, unknown> & DelegationProfileEnvelope {
  return (
    typeof value.agentId === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.profile === "object" &&
    value.profile !== null &&
    typeof value.canActivate === "boolean" &&
    typeof value.policyRevision === "number" &&
    typeof value.configHash === "string"
  );
}

function isRelationshipProfile(value: unknown): value is EnterpriseSharedRelationshipProfile {
  return (
    isRecord(value) &&
    typeof value.revision === "number" &&
    typeof value.agentAlias === "string" &&
    typeof value.agentSelfReference === "string" &&
    typeof value.userAddress === "string" &&
    typeof value.customInstructions === "string" &&
    typeof value.updatedAt === "number"
  );
}

function isRelationshipItem(value: unknown): value is EnterpriseSharedRelationshipItem {
  return (
    isRecord(value) &&
    typeof value.accountId === "string" &&
    typeof value.username === "string" &&
    typeof value.displayName === "string" &&
    (value.role === "administrator" || value.role === "employee") &&
    typeof value.enabled === "boolean" &&
    typeof value.assigned === "boolean" &&
    typeof value.effectiveName === "string" &&
    isRelationshipProfile(value.profile) &&
    typeof value.workspace === "string" &&
    Array.isArray(value.files) &&
    value.files.every(
      (file) =>
        isRecord(file) &&
        typeof file.name === "string" &&
        typeof file.missing === "boolean" &&
        typeof file.size === "number" &&
        (file.updatedAt === null || typeof file.updatedAt === "number") &&
        typeof file.writable === "boolean",
    )
  );
}

function drawerTabs(): Array<{ id: DrawerTab; label: string }> {
  return [
    { id: "overview", label: ea("Overview") },
    { id: "delegation", label: d("profileTab") },
    { id: "relationships", label: eaa("Danh xưng") },
    { id: "files", label: eaa("Files") },
    { id: "tools", label: eaa("Tools") },
    { id: "skills", label: ea("Skills") },
    { id: "channels", label: eaa("Channels") },
    { id: "cron", label: eaa("Cron") },
    { id: "memory", label: eaa("Memory") },
  ];
}

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
  @state() private delegationLoading = false;
  @state() private delegationBusy = false;
  @state() private delegationOverview?: DelegationOverview;
  @state() private delegationPolicy?: EnterpriseDelegationPolicy;
  @state() private delegationAvailableModels: string[] = [];
  @state() private delegationRouterModelAvailable = false;
  @state() private delegationEvents: EnterpriseDelegationEvent[] = [];
  @state() private delegationEventTotal = 0;
  @state() private delegationEventNextCursor: string | null = null;
  @state() private delegationEventFilters: DelegationEventFilterDraft = {
    accountId: "",
    agentId: "",
    outcome: "",
    reasonCode: "",
    createdFrom: "",
    createdTo: "",
  };
  @state() private delegationPreview?: DelegationPreview;
  @state() private delegationPreviewExclusions = new Set<string>();
  @state() private delegationPreviewQuery = "";
  @state() private delegationPreviewPage = 0;
  @state() private delegationAccounts: EnterpriseAccount[] = [];
  @state() private profileEnvelope?: DelegationProfileEnvelope;
  @state() private profileDescription = "";
  @state() private profileDraft?: EnterpriseDelegationProfile;
  @state() private profileSource?: { description: string; profile: EnterpriseDelegationProfile };
  @state() private profileConflict?: DelegationProfileEnvelope;
  @state() private profileAiSuggested = false;
  @state() private simulationAccountQuery = "";
  @state() private simulationAccountId = "";
  @state() private simulationPrompt = "";
  @state() private simulationResult?: Awaited<ReturnType<typeof simulateAdminAgentDelegation>>;
  @state() private accessRequests: EnterpriseAgentAccessRequest[] = [];
  @state() private accessRequestsLoading = false;
  @state() private accessRequestsError = "";
  @state() private accessRequestsBusyId = "";
  @state() private accessRequestsFilter: AgentAccessRequestListFilter = "pending";
  @state() private accessRequestDetail?: EnterpriseAgentAccessRequestDetail;
  @state() private accessRequestRejectReason = "";
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
    const matchedPanel = drawerTabs().find((item) => item.id === panel);
    if (matchedPanel) {
      this.drawerTab = matchedPanel.id;
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
      const [result, accounts] = await Promise.all([
        listAdminAgentCatalog(),
        listAdminAccounts({ limit: "100" }),
        this.loadAccessRequests(),
      ]);
      this.shared = result.shared;
      this.personal = result.personal;
      this.delegationAccounts = accounts.accounts;
      this.restoreDrawer();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private selectTopTab(tab: AgentTab): void {
    this.tab = tab;
    if (tab === "delegation") {
      void this.loadDelegationDashboard();
    }
    if (tab === "access-requests") {
      void this.loadAccessRequests();
    }
  }

  private async loadAccessRequests(): Promise<void> {
    if (this.accessRequestsLoading) {
      return;
    }
    this.accessRequestsLoading = true;
    this.accessRequestsError = "";
    try {
      this.accessRequests = await listAdminAgentAccessRequests();
    } catch (error) {
      this.accessRequestsError = errorMessage(error);
    } finally {
      this.accessRequestsLoading = false;
    }
  }

  private async refreshAgentCatalog(): Promise<void> {
    try {
      const result = await listAdminAgentCatalog();
      this.shared = result.shared;
      this.personal = result.personal;
      this.restoreDrawer();
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  private async refreshAccessRequestDetail(id: string): Promise<void> {
    try {
      const detail = await loadAdminAgentAccessRequest(id);
      if (!detail?.request) {
        return;
      }
      const current = this.accessRequestDetail?.request;
      if (!current || detail.request.revision > current.revision) {
        this.accessRequestDetail = detail;
      }
    } catch {
      // Keep the mutation result visible if a detail refresh is temporarily unavailable.
    }
  }

  private async openAccessRequest(request: EnterpriseAgentAccessRequest): Promise<void> {
    if (this.accessRequestsBusyId) {
      return;
    }
    this.accessRequestsBusyId = request.id;
    this.accessRequestsError = "";
    try {
      this.accessRequestDetail = await loadAdminAgentAccessRequest(request.id);
      this.accessRequestRejectReason = "";
    } catch (error) {
      this.accessRequestsError = errorMessage(error);
    } finally {
      this.accessRequestsBusyId = "";
    }
  }

  private async approveAccessRequest(): Promise<void> {
    const request = this.accessRequestDetail?.request;
    if (!request || request.state !== "pending" || this.accessRequestsBusyId) {
      return;
    }
    this.accessRequestsBusyId = request.id;
    this.accessRequestsError = "";
    try {
      const result = await approveAdminAgentAccessRequest(request);
      this.accessRequestDetail = { request: result.request };
      this.accessRequests = this.accessRequests.map((item) =>
        item.id === result.request.id ? result.request : item,
      );
      void this.refreshAgentCatalog();
    } catch (error) {
      const failure = errorMessage(error);
      await this.loadAccessRequests();
      await this.refreshAccessRequestDetail(request.id);
      this.accessRequestsError = failure;
    } finally {
      this.accessRequestsBusyId = "";
    }
  }

  private async rejectAccessRequest(): Promise<void> {
    const request = this.accessRequestDetail?.request;
    const reason = this.accessRequestRejectReason.trim();
    if (!request || request.state !== "pending" || !reason || this.accessRequestsBusyId) {
      return;
    }
    this.accessRequestsBusyId = request.id;
    this.accessRequestsError = "";
    try {
      const result = await rejectAdminAgentAccessRequest(request, reason);
      this.accessRequestDetail = { request: result.request };
      this.accessRequests = this.accessRequests.map((item) =>
        item.id === result.request.id ? result.request : item,
      );
    } catch (error) {
      const failure = errorMessage(error);
      await this.loadAccessRequests();
      await this.refreshAccessRequestDetail(request.id);
      this.accessRequestsError = failure;
    } finally {
      this.accessRequestsBusyId = "";
    }
  }

  private async loadDelegationDashboard(): Promise<void> {
    this.delegationLoading = true;
    this.error = "";
    try {
      const eventFilters = this.delegationEventApiFilters();
      const [overview, settings, events, accounts] = await Promise.all([
        loadAdminDelegationOverview(eventFilters),
        loadAdminDelegationSettings(),
        listAdminDelegationEvents({ ...eventFilters, limit: "50" }),
        listAdminAccounts({ limit: "100" }),
      ]);
      this.delegationOverview = overview;
      this.delegationPolicy = settings.policy;
      this.delegationAvailableModels = settings.availableModels;
      this.delegationRouterModelAvailable = settings.routerModelAvailable;
      this.delegationEvents = events.events;
      this.delegationEventTotal = events.total;
      this.delegationEventNextCursor = events.nextCursor;
      this.delegationAccounts = accounts.accounts;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.delegationLoading = false;
    }
  }

  private delegationEventApiFilters(): Record<string, string> {
    const filters: Record<string, string> = {};
    for (const key of ["accountId", "agentId", "outcome", "reasonCode"] as const) {
      const value = this.delegationEventFilters[key].trim();
      if (value) {
        filters[key] = value;
      }
    }
    for (const key of ["createdFrom", "createdTo"] as const) {
      const raw = this.delegationEventFilters[key];
      if (raw) {
        const timestamp = Date.parse(raw);
        if (Number.isFinite(timestamp)) {
          filters[key] = String(timestamp);
        }
      }
    }
    return filters;
  }

  private async loadMoreDelegationEvents(): Promise<void> {
    if (!this.delegationEventNextCursor || this.delegationBusy) {
      return;
    }
    this.delegationBusy = true;
    try {
      const page = await listAdminDelegationEvents({
        ...this.delegationEventApiFilters(),
        limit: "50",
        cursor: this.delegationEventNextCursor,
      });
      const known = new Set(this.delegationEvents.map((event) => event.id));
      this.delegationEvents = [
        ...this.delegationEvents,
        ...page.events.filter((event) => !known.has(event.id)),
      ];
      this.delegationEventNextCursor = page.nextCursor;
      this.delegationEventTotal = page.total;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.delegationBusy = false;
    }
  }

  private async saveDelegationPolicy(): Promise<void> {
    if (!this.delegationPolicy || this.delegationBusy) {
      return;
    }
    this.delegationBusy = true;
    this.error = "";
    try {
      const result = await saveAdminDelegationSettings(this.delegationPolicy);
      this.delegationPolicy = result.policy;
      await this.loadDelegationDashboard();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.delegationBusy = false;
    }
  }

  private async previewDelegation(): Promise<void> {
    this.delegationBusy = true;
    this.error = "";
    try {
      this.delegationPreview = await previewAdminDelegationActivation();
      this.delegationPreviewExclusions = new Set();
      this.delegationPreviewQuery = "";
      this.delegationPreviewPage = 0;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.delegationBusy = false;
    }
  }

  private async activateDelegation(): Promise<void> {
    if (!this.delegationPreview || this.delegationBusy) {
      return;
    }
    if (
      !showNativeConfirm(
        d("confirmActivation", {
          count: String(
            Math.max(
              0,
              this.delegationPreview.summary.eligible - this.delegationPreviewExclusions.size,
            ),
          ),
        }),
      )
    ) {
      return;
    }
    this.delegationBusy = true;
    try {
      const exclusions = [...this.delegationPreviewExclusions].map((key) => {
        const separator = key.indexOf("\u0000");
        return {
          accountId: key.slice(0, separator),
          agentResourceKey: key.slice(separator + 1),
        };
      });
      await activateAdminDelegation(this.delegationPreview.previewToken, exclusions);
      this.delegationPreview = undefined;
      this.delegationPreviewExclusions = new Set();
      await this.loadDelegationDashboard();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.delegationBusy = false;
    }
  }

  private async emergencyDisableDelegation(): Promise<void> {
    if (!this.delegationPolicy || this.delegationBusy) {
      return;
    }
    if (!showNativeConfirm(d("confirmEmergencyOff"))) {
      return;
    }
    this.delegationPolicy = { ...this.delegationPolicy, rollout: "off" };
    await this.saveDelegationPolicy();
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
      this.profileDirty() ||
      this.relationshipDirty() ||
      Boolean(this.activeFile && this.fileDraft !== this.activeFile.content)
    );
  }

  private profileDirty(): boolean {
    return Boolean(
      this.profileDraft &&
      this.profileSource &&
      (this.profileDescription !== this.profileSource.description ||
        JSON.stringify(this.profileDraft) !== JSON.stringify(this.profileSource.profile)),
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
    return !this.hasUnsavedPanelChanges() || showNativeConfirm(d("confirmDiscard"));
  }

  private confirmDiscardFileChanges(): boolean {
    return (
      !this.activeFile ||
      this.fileDraft === this.activeFile.content ||
      showNativeConfirm(eaa("Bạn có thay đổi file chưa lưu. Bỏ các thay đổi này?"))
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
    this.profileEnvelope = undefined;
    this.profileDraft = undefined;
    this.profileSource = undefined;
    this.profileConflict = undefined;
    this.profileAiSuggested = false;
    this.simulationResult = undefined;
    try {
      const id =
        this.selected.kind === "shared"
          ? this.selected.value.agentId
          : this.selected.value.accountId;
      const data =
        this.drawerTab === "delegation" && this.selected.kind === "shared"
          ? await loadAdminAgentDelegationProfile(id, controller.signal)
          : await loadAdminAgentPanel(
              this.selected.kind,
              id,
              this.drawerTab === "delegation" ? "overview" : this.drawerTab,
              controller.signal,
            );
      if (epoch === this.panelEpoch && !controller.signal.aborted) {
        if (!isRecord(data)) {
          throw new Error("AGENT_PANEL_RESPONSE_INVALID");
        }
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
    if (this.drawerTab === "delegation") {
      if (!isDelegationProfileEnvelope(data)) {
        throw new Error("DELEGATION_PROFILE_RESPONSE_INVALID");
      }
      const envelope = data;
      this.profileEnvelope = envelope;
      this.profileDescription = envelope.description;
      this.profileDraft = structuredClone(envelope.profile);
      this.profileSource = {
        description: envelope.description,
        profile: structuredClone(envelope.profile),
      };
    }
    if (this.drawerTab === "tools") {
      const policy = isRecord(data.policy) ? data.policy : {};
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
    const relationship = isRecord(data?.relationship) ? data.relationship : undefined;
    return Array.isArray(relationship?.items) ? relationship.items.filter(isRelationshipItem) : [];
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
    const files = Array.isArray(data.files) ? data.files.filter(isRecord) : [];
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
      const relationship = isRecord(this.panelData?.relationship)
        ? this.panelData.relationship
        : undefined;
      if (relationship && Array.isArray(relationship.items)) {
        const relationshipItems = relationship.items.filter(isRelationshipItem);
        this.panelData = {
          ...this.panelData,
          relationship: {
            ...relationship,
            items: relationshipItems.map((item) =>
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
      this.panelError = eaa("Không có config revision để lưu an toàn.");
      return;
    }
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const data = new FormData(form);
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
    if (
      !revision ||
      !showNativeConfirm(eaa("Xóa shared agent {agent}?", { agent: this.selected.value.agentId }))
    ) {
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
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
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
    const schedule = isRecord(job?.schedule) ? job.schedule : {};
    this.cronScheduleKind =
      schedule.kind === "at" || schedule.kind === "cron" ? schedule.kind : "every";
    this.cronEditorOpen = true;
  }

  private async submitCron(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const target = this.selectedTarget();
    const form = event.currentTarget;
    if (!target || !(form instanceof HTMLFormElement)) {
      return;
    }
    const values = new FormData(form);
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
    if (
      action === "remove" &&
      !showNativeConfirm(eaa("Xóa cron job {name}?", { name: String(job.name ?? "") }))
    ) {
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
      !showNativeConfirm(eaa("Thao tác này sẽ xóa dữ liệu memory tương ứng. Tiếp tục?"))
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

  private updateProfile(patch: Partial<EnterpriseDelegationProfile>): void {
    if (this.profileDraft) {
      this.profileDraft = { ...this.profileDraft, ...patch };
    }
  }

  private delegationProfileChecklist(): Record<string, boolean> {
    const profile = this.profileDraft;
    if (!profile) {
      return {};
    }
    const unique = (values: readonly string[]) =>
      new Set(values.map((value) => value.trim().toLocaleLowerCase())).size === values.length;
    return {
      description:
        this.profileDescription.trim().length >= 20 && this.profileDescription.trim().length <= 500,
      aliases:
        profile.aliases.length <= 20 &&
        profile.aliases.every((value) => value.trim().length >= 1 && value.trim().length <= 64) &&
        unique(profile.aliases),
      useWhen:
        profile.useWhen.length >= 2 &&
        profile.useWhen.length <= 20 &&
        profile.useWhen.every((value) => value.trim().length >= 5 && value.trim().length <= 240) &&
        unique(profile.useWhen),
      avoidWhen:
        profile.avoidWhen.length <= 20 &&
        profile.avoidWhen.every((value) => value.trim().length >= 5 && value.trim().length <= 240),
      requiredInputs:
        profile.requiredInputs.length <= 20 &&
        profile.requiredInputs.every(
          (item) =>
            item.label.trim().length >= 1 &&
            item.label.trim().length <= 80 &&
            item.question.trim().length >= 5 &&
            item.question.trim().length <= 240,
        ),
      routerModel: this.profileEnvelope?.checklist.routerModel === true,
      agentExists: true,
    };
  }

  private async suggestDelegationProfile(): Promise<void> {
    if (this.selected?.kind !== "shared" || this.panelSaving) {
      return;
    }
    this.panelSaving = true;
    this.panelError = "";
    try {
      const result = await draftAdminAgentDelegationProfile(this.selected.value.agentId);
      this.profileDescription = result.description;
      this.profileDraft = {
        ...result.draft,
        requiredInputs: result.draft.requiredInputs.map((item) => ({ ...item })),
      };
      this.profileAiSuggested = true;
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.panelSaving = false;
    }
  }

  private async searchSimulationAccounts(): Promise<void> {
    if (this.panelSaving) {
      return;
    }
    this.panelSaving = true;
    this.panelError = "";
    try {
      const result = await listAdminAccounts({
        query: this.simulationAccountQuery.trim(),
        limit: "50",
      });
      this.delegationAccounts = result.accounts;
      if (
        this.simulationAccountId &&
        !result.accounts.some((account) => account.id === this.simulationAccountId)
      ) {
        this.simulationAccountId = "";
      }
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.panelSaving = false;
    }
  }

  private async saveDelegationProfile(activate: boolean): Promise<void> {
    if (
      this.selected?.kind !== "shared" ||
      !this.profileEnvelope ||
      !this.profileDraft ||
      this.panelSaving
    ) {
      return;
    }
    if (activate && !Object.values(this.delegationProfileChecklist()).every(Boolean)) {
      this.panelError = d("fixChecklistBeforeActivation");
      await this.updateComplete;
      this.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    this.panelSaving = true;
    this.panelError = "";
    try {
      await saveAdminAgentDelegationProfile({
        agentId: this.selected.value.agentId,
        description: this.profileDescription,
        profile: { ...this.profileDraft, status: activate ? "active" : "draft" },
        baseHash: this.profileEnvelope.configHash,
      });
      this.profileConflict = undefined;
      await this.load();
      await this.loadPanel();
    } catch (error) {
      if (error instanceof EnterpriseApiError && error.status === 409 && this.selected) {
        try {
          this.profileConflict = await loadAdminAgentDelegationProfile(this.selected.value.agentId);
          this.panelError = d("conflictDraftPreserved");
        } catch (refreshError) {
          this.panelError = `${errorMessage(error)} ${errorMessage(refreshError)}`;
        }
      } else {
        this.panelError = errorMessage(error);
      }
    } finally {
      this.panelSaving = false;
    }
  }

  private useCurrentDelegationProfile(): void {
    if (!this.profileConflict || !showNativeConfirm(d("confirmReplaceWithCurrent"))) {
      return;
    }
    const current = this.profileConflict;
    this.profileEnvelope = current;
    this.profileDescription = current.description;
    this.profileDraft = structuredClone(current.profile);
    this.profileSource = {
      description: current.description,
      profile: structuredClone(current.profile),
    };
    this.profileConflict = undefined;
    this.profileAiSuggested = false;
    this.panelError = "";
  }

  private async simulateDelegationProfile(): Promise<void> {
    if (
      this.selected?.kind !== "shared" ||
      !this.simulationAccountId ||
      !this.simulationPrompt.trim() ||
      this.panelSaving
    ) {
      return;
    }
    this.panelSaving = true;
    this.panelError = "";
    try {
      this.simulationResult = await simulateAdminAgentDelegation(
        this.selected.value.agentId,
        this.simulationAccountId,
        this.simulationPrompt,
      );
    } catch (error) {
      this.panelError = errorMessage(error);
    } finally {
      this.panelSaving = false;
    }
  }

  private renderPanel(selected: SelectedAgent) {
    if (this.panelLoading) {
      const panel = drawerTabs().find((tab) => tab.id === this.drawerTab)?.label ?? ea("Agent");
      return html`<div class="ea-loading">${eaa("Đang tải {panel}…", { panel })}</div>`;
    }
    if (this.drawerTab === "overview") {
      return this.renderOverview(selected);
    }
    if (
      this.drawerTab === "delegation" &&
      selected.kind === "shared" &&
      this.profileEnvelope &&
      this.profileDraft
    ) {
      const checklist = this.delegationProfileChecklist();
      return renderDelegationProfileEditor({
        name: this.profileEnvelope.name,
        description: this.profileDescription,
        profile: this.profileDraft,
        checklist,
        canActivate: Object.values(checklist).every(Boolean),
        dirty: this.profileDirty(),
        busy: this.panelSaving,
        error: this.panelError,
        accounts: this.delegationAccounts,
        accountQuery: this.simulationAccountQuery,
        aiSuggested: this.profileAiSuggested,
        source: this.profileSource,
        conflict: this.profileConflict,
        simulationAccountId: this.simulationAccountId,
        simulationPrompt: this.simulationPrompt,
        simulationResult: this.simulationResult,
        onDescription: (value) => (this.profileDescription = value),
        onProfile: (patch) => this.updateProfile(patch),
        onRequiredInputs: (value) => this.updateProfile({ requiredInputs: value }),
        onDraft: () => void this.suggestDelegationProfile(),
        onSave: (activate) => void this.saveDelegationProfile(activate),
        onUseCurrentVersion: () => this.useCurrentDelegationProfile(),
        onAccountQuery: (value) => (this.simulationAccountQuery = value),
        onSearchAccounts: () => void this.searchSimulationAccounts(),
        onSimulationAccount: (value) => (this.simulationAccountId = value),
        onSimulationPrompt: (value) => (this.simulationPrompt = value),
        onSimulate: () => void this.simulateDelegationProfile(),
      });
    }
    const data = this.panelData ?? {};
    if (this.drawerTab === "relationships") {
      const relationship = isRecord(data.relationship) ? data.relationship : {};
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
                  ${eaa("Copy ID")}
                </button>
                ${selected.kind === "shared"
                  ? html`<button
                      class="btn btn--sm btn--ghost"
                      type="button"
                      @click=${() => (this.accessOpen = true)}
                    >
                      ${ea("Quản lý user")}
                    </button>`
                  : nothing}
                <button
                  class="btn btn--sm agents-refresh-btn"
                  type="button"
                  ?disabled=${this.panelLoading}
                  @click=${() => void this.loadPanel()}
                >
                  ${this.panelLoading ? ea("Đang tải…") : ea("Làm mới")}
                </button>
                ${renderSettingsStatus({ kind: "ok", label: eaa("Revision-safe") })}
              </div>
            </div>
          </section>
          <section class="agents-main">
            ${renderHubTabs({
              id: "enterprise-agent",
              active: this.drawerTab,
              tabs: drawerTabs()
                .filter(
                  (tab) =>
                    selected.kind === "shared" ||
                    (tab.id !== "relationships" && tab.id !== "delegation"),
                )
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
              ariaLabel: eaa("Chi tiết agent"),
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

  private renderDelegationDashboard() {
    return renderDelegationDashboard({
      loading: this.delegationLoading,
      busy: this.delegationBusy,
      error: this.error,
      overview: this.delegationOverview,
      policy: this.delegationPolicy,
      availableModels: this.delegationAvailableModels,
      routerModelAvailable: this.delegationRouterModelAvailable,
      events: this.delegationEvents,
      eventTotal: this.delegationEventTotal,
      eventNextCursor: this.delegationEventNextCursor,
      eventFilters: this.delegationEventFilters,
      preview: this.delegationPreview,
      previewExclusions: this.delegationPreviewExclusions,
      previewQuery: this.delegationPreviewQuery,
      previewPage: this.delegationPreviewPage,
      onPolicy: (patch) => {
        if (this.delegationPolicy) {
          this.delegationPolicy = { ...this.delegationPolicy, ...patch };
          if (typeof patch.routerModel === "string") {
            this.delegationRouterModelAvailable =
              patch.routerModel.length > 0 &&
              this.delegationAvailableModels.includes(patch.routerModel);
          }
        }
      },
      onEventFilter: (patch) => {
        this.delegationEventFilters = { ...this.delegationEventFilters, ...patch };
      },
      onApplyEventFilters: () => void this.loadDelegationDashboard(),
      onLoadMoreEvents: () => void this.loadMoreDelegationEvents(),
      onSavePolicy: () => void this.saveDelegationPolicy(),
      onPreview: () => void this.previewDelegation(),
      onPreviewQuery: (value) => {
        this.delegationPreviewQuery = value;
        this.delegationPreviewPage = 0;
      },
      onPreviewPage: (page) => (this.delegationPreviewPage = Math.max(0, page)),
      onPreviewExclusion: (key, excluded) => {
        const next = new Set(this.delegationPreviewExclusions);
        if (excluded) {
          next.add(key);
        } else {
          next.delete(key);
        }
        this.delegationPreviewExclusions = next;
      },
      onActivate: () => void this.activateDelegation(),
      onEmergencyOff: () => void this.emergencyDisableDelegation(),
    });
  }

  private renderAccessRequestDetail() {
    const detail = this.accessRequestDetail;
    if (!detail) {
      return nothing;
    }
    const request = detail.request;
    const pending = request.state === "pending";
    const busy = this.accessRequestsBusyId === request.id;
    return html`<openclaw-enterprise-admin-dialog
      .open=${true}
      .wide=${true}
      .heading=${request.agent?.name ?? request.agentId}
      .description=${request.requester
        ? `${request.requester.displayName} (@${request.requester.username})`
        : request.requesterAccountId}
      .onClose=${() => {
        if (!busy) {
          this.accessRequestDetail = undefined;
          this.accessRequestRejectReason = "";
        }
      }}
    >
      <div class="ea-stack ea-agent-access-review">
        <section class="ea-card ea-plugin-review__grid">
          <dl>
            <dt>${ea("Agent")}</dt>
            <dd>${request.agent?.name ?? request.agentId}</dd>
            <dt>${eaa("Gửi lúc")}</dt>
            <dd>${formatDate(request.createdAt)}</dd>
          </dl>
          <dl>
            <dt>${eaa("Người yêu cầu")}</dt>
            <dd>
              ${request.requester?.displayName ?? request.requesterAccountId}
              ${request.requester ? html`(@${request.requester.username})` : nothing}
            </dd>
            <dt>${ea("Trạng thái")}</dt>
            <dd><span class="ea-badge">${agentAccessRequestStateLabel(request.state)}</span></dd>
            ${request.decidedAt
              ? html`<dt>${eaa("Xử lý lúc")}</dt>
                  <dd>${formatDate(request.decidedAt)}</dd>`
              : nothing}
          </dl>
        </section>
        ${request.agent?.description
          ? html`<section class="ea-card">
              <h3>${eaa("Mô tả Agent")}</h3>
              <p>${request.agent.description}</p>
            </section>`
          : nothing}
        ${request.decisionReason
          ? html`<div class="ea-alert" role=${request.state === "rejected" ? "alert" : "status"}>
              ${eaa("Lý do xử lý: {reason}", { reason: request.decisionReason })}
            </div>`
          : nothing}
        ${this.accessRequestsError
          ? html`<div class="ea-error" role="alert">${this.accessRequestsError}</div>`
          : nothing}
        ${pending
          ? html`<label class="ea-field"
              >${eaa("Lý do từ chối")}<textarea
                class="ea-textarea"
                maxlength="2000"
                .value=${this.accessRequestRejectReason}
                ?disabled=${busy}
                @input=${(event: Event) => {
                  this.accessRequestRejectReason = (
                    event.currentTarget as HTMLTextAreaElement
                  ).value;
                }}
              ></textarea>
            </label>`
          : nothing}
        <div class="ea-actions">
          ${pending
            ? html`<button
                  class="ea-button ea-button--primary"
                  type="button"
                  ?disabled=${busy}
                  @click=${() => void this.approveAccessRequest()}
                >
                  ${busy ? ea("Đang xử lý…") : eaa("Phê duyệt & cấp quyền")}
                </button>
                <button
                  class="ea-button ea-button--danger"
                  type="button"
                  ?disabled=${busy || !this.accessRequestRejectReason.trim()}
                  @click=${() => void this.rejectAccessRequest()}
                >
                  ${ea("Từ chối")}
                </button>`
            : nothing}
        </div>
      </div>
    </openclaw-enterprise-admin-dialog>`;
  }

  private renderAccessRequests() {
    return renderAgentAccessRequestList({
      items: this.accessRequests,
      filter: this.accessRequestsFilter,
      loading: this.accessRequestsLoading,
      error: this.accessRequestsError,
      busyId: this.accessRequestsBusyId,
      onFilter: (filter) => (this.accessRequestsFilter = filter),
      onRefresh: () => void this.loadAccessRequests(),
      onOpen: (request) => void this.openAccessRequest(request),
    });
  }

  override render() {
    const shared = this.filteredShared();
    const personal = this.filteredPersonal();
    return html`
      ${renderAdminAgentCatalog({
        tab: this.tab,
        allSharedCount: this.shared.length,
        allPersonalCount: this.personal.length,
        accessRequestsCount: this.accessRequests.filter((item) => item.state === "pending").length,
        shared,
        personal,
        loading: this.loading,
        error: this.error,
        accessRequestsContent: this.renderAccessRequests(),
        delegationContent: this.renderDelegationDashboard(),
        onTab: (tab) => this.selectTopTab(tab),
        onQuery: (query) => (this.query = query),
        onCreate: () => (this.createOpen = true),
        onOpen: (selected) => this.openAgent(selected),
      })}
      ${this.renderDrawer()} ${this.renderAccessRequestDetail()}
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
