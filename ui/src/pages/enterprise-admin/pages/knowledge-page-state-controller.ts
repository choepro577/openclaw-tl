import { consume } from "@lit/context";
import { state } from "lit/decorators.js";
import { applicationContext, type ApplicationContext } from "../../../app/context.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  listAdminAccounts,
  listAdminAgentCatalog,
  type EnterpriseAccount,
} from "../../enterprise/services/enterprise-api.ts";
import {
  listEnterpriseKnowledgeAgentBindings,
  listEnterpriseKnowledgeJobs,
  listEnterpriseKnowledgeMembers,
  listEnterpriseKnowledgePublications,
  listEnterpriseKnowledgeSources,
  listEnterpriseKnowledgeUploads,
  listEnterpriseKnowledgeZones,
  loadEnterpriseKnowledgeGraphOverview,
  loadEnterpriseKnowledgeJob,
  loadEnterpriseKnowledgeReadiness,
  loadEnterpriseKnowledgeZone,
  type EnterpriseKnowledgeAgentCatalog,
  type EnterpriseKnowledgeAuditEvent,
  type EnterpriseKnowledgeDoctorReport,
  type EnterpriseKnowledgeJob,
  type EnterpriseKnowledgeJobStep,
  type EnterpriseKnowledgeGraphSettings,
  type EnterpriseKnowledgeGraphOverview,
  type EnterpriseKnowledgePublication,
  type EnterpriseKnowledgeSource,
  type EnterpriseKnowledgeUpload,
  type EnterpriseKnowledgeVersion,
  type EnterpriseKnowledgeVersionPreview,
  type EnterpriseKnowledgeChangeEvent,
  type EnterpriseKnowledgeZone,
  type EnterpriseKnowledgeZoneRole,
} from "../../enterprise/services/enterprise-knowledge-api.ts";
import { startEnterpriseKnowledgeRealtime } from "../../knowledge/knowledge-realtime.ts";
import { errorMessage } from "../utils.ts";
import {
  draftFromKnowledgeZone,
  emptyKnowledgeZoneDraft,
  memberRoleDraft,
  sameMemberRoles,
  sameStringSet,
  type KnowledgeTab,
  type KnowledgeZoneDraft,
  type KnowledgeZoneFormErrors,
  type UploadProgress,
} from "./knowledge-page-model.ts";

const EMPTY_AGENT_CATALOG: EnterpriseKnowledgeAgentCatalog = { shared: [], personal: [] };

export class EnterpriseAdminKnowledgeStateController extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: true })
  private application?: ApplicationContext;
  @state() protected zones: EnterpriseKnowledgeZone[] = [];
  @state() protected nextCursor: string | null = null;
  @state() protected selected?: EnterpriseKnowledgeZone;
  @state() protected selectedRole: EnterpriseKnowledgeZoneRole = "manager";
  @state() protected tab: KnowledgeTab = "overview";
  @state() protected sources: EnterpriseKnowledgeSource[] = [];
  @state() protected versions: EnterpriseKnowledgeVersion[] = [];
  @state() protected selectedSource?: EnterpriseKnowledgeSource;
  @state() protected selectedVersion?: EnterpriseKnowledgeVersion;
  @state() protected versionPreview?: EnterpriseKnowledgeVersionPreview;
  @state() protected versionPreviewLoading = false;
  @state() protected jobs: EnterpriseKnowledgeJob[] = [];
  @state() protected jobSteps: Record<string, EnterpriseKnowledgeJobStep[]> = {};
  @state() protected publications: EnterpriseKnowledgePublication[] = [];
  @state() protected members: Array<{ accountId: string; role: EnterpriseKnowledgeZoneRole }> = [];
  @state() protected memberDraft: Record<string, EnterpriseKnowledgeZoneRole | "none"> = {};
  @state() protected memberQuery = "";
  @state() protected bindings: string[] = [];
  @state() protected bindingDraft: string[] = [];
  @state() protected agentQuery = "";
  @state() protected agentCatalog: EnterpriseKnowledgeAgentCatalog = EMPTY_AGENT_CATALOG;
  @state() protected accounts: EnterpriseAccount[] = [];
  @state() protected catalogsLoading = false;
  @state() protected catalogError = "";
  @state() protected candidate?: {
    id: string;
    sourceSetRevision: number;
    buildRevision: number;
    lexicalStatus: string;
    vectorStatus: string;
    integrityStatus: string;
    graphStatus: "not_built" | "ready" | "degraded" | "error";
    graphSchemaVersion: number;
    graphNodeCount: number;
    graphEdgeCount: number;
    graphProposedCount: number;
    graphOrphanCount: number;
    snapshotRevision: number;
    artifactSchemaVersion: 1 | 2 | 3;
    aiAnalysisStatus: "off" | "ready" | "degraded";
    degradationReasons: string[];
    createdAt: number;
  };
  @state() protected graphSettings?: EnterpriseKnowledgeGraphSettings;
  @state() protected graphOverview?: EnterpriseKnowledgeGraphOverview;
  @state() protected readiness?: Awaited<ReturnType<typeof loadEnterpriseKnowledgeReadiness>>;
  @state() protected searchHits: Array<Record<string, unknown>> = [];
  @state() protected degradedReason = "";
  @state() protected uploads: UploadProgress[] = [];
  @state() protected loading = true;
  @state() protected detailLoading = false;
  @state() protected createOpen = false;
  @state() protected createDraft: KnowledgeZoneDraft = emptyKnowledgeZoneDraft();
  @state() protected createErrors: KnowledgeZoneFormErrors = {};
  @state() protected createError = "";
  @state() protected settingsDraft: KnowledgeZoneDraft = emptyKnowledgeZoneDraft();
  @state() protected settingsErrors: KnowledgeZoneFormErrors = {};
  @state() protected operationsOpen = false;
  @state() protected operationsLoading = false;
  @state() protected doctor?: EnterpriseKnowledgeDoctorReport;
  @state() protected auditEvents: EnterpriseKnowledgeAuditEvent[] = [];
  @state() protected busy = false;
  @state() protected error = "";
  @state() protected notice = "";
  protected query = "";
  protected cursor = "";
  protected previousCursors: string[] = [];
  private slugEdited = false;
  private reloadTimer?: ReturnType<typeof globalThis.setTimeout>;
  private stopRealtime?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    void Promise.all([
      this.load(),
      this.loadReadiness(),
      this.loadGraphOverview(),
      this.loadCatalogs(),
    ]);
    globalThis.queueMicrotask(() => this.startRealtime());
  }

  override disconnectedCallback(): void {
    if (this.reloadTimer) {
      globalThis.clearTimeout(this.reloadTimer);
    }
    this.stopRealtime?.();
    this.stopRealtime = undefined;
    super.disconnectedCallback();
  }

  protected override updated(): void {
    this.startRealtime();
  }

  private startRealtime(): void {
    const gateway = this.application?.gateway;
    if (!gateway || this.stopRealtime) {
      return;
    }
    this.stopRealtime = startEnterpriseKnowledgeRealtime({
      gateway,
      audience: "admin",
      overview: true,
      zoneIds: () => (this.selected ? [this.selected.id] : []),
      hasActiveJobs: () =>
        this.jobs.some((job) => ["queued", "running", "retry_wait"].includes(job.status)),
      onEvents: (events) => this.mergeRealtimeEvents(events),
      onTerminal: (events) => {
        void this.refreshFromTerminalEvents(events);
      },
    });
  }

  private mergeRealtimeEvents(events: EnterpriseKnowledgeChangeEvent[]): void {
    for (const event of events) {
      if (event.zoneId !== this.selected?.id || !event.entityId) {
        continue;
      }
      if (event.entityType !== "job" && event.entityType !== "job_step") {
        continue;
      }
      if (event.entityType === "job" && !this.jobs.some((job) => job.id === event.entityId)) {
        const occurredAt = Date.parse(event.occurredAt);
        this.jobs = [
          {
            id: event.entityId,
            zoneId: event.zoneId,
            sourceId: null,
            kind: event.stage === "zone_build" ? "zone_build" : "source_ingest",
            stage: event.stage ?? "checking",
            status: event.status ?? "queued",
            attempt: 0,
            progressCurrent: event.progressCurrent ?? 0,
            progressTotal: event.progressTotal ?? 0,
            safeErrorCode: event.safeErrorCode ?? null,
            updatedAt: occurredAt,
          },
          ...this.jobs,
        ];
      }
      this.jobs = this.jobs.map((job) => {
        if (job.id !== event.entityId) {
          return job;
        }
        const isStep = event.entityType === "job_step";
        return {
          ...job,
          ...(event.stage ? { stage: event.stage } : {}),
          ...(!isStep && event.status ? { status: event.status } : {}),
          ...(isStep && event.status === "running" ? { status: "running" } : {}),
          ...(event.progressCurrent === undefined
            ? {}
            : { progressCurrent: event.progressCurrent }),
          ...(event.progressTotal === undefined ? {} : { progressTotal: event.progressTotal }),
          ...(event.safeErrorCode ? { safeErrorCode: event.safeErrorCode } : {}),
          updatedAt: Date.parse(event.occurredAt),
        };
      });
      if (event.entityType === "job_step") {
        const steps = this.jobSteps[event.entityId] ?? [];
        const existing = steps.find((step) => step.stage === event.stage);
        const next: EnterpriseKnowledgeJobStep = {
          jobId: event.entityId,
          stepId: existing?.stepId ?? event.stage ?? "unknown",
          stage: event.stage ?? existing?.stage ?? "unknown",
          status: (event.status ??
            existing?.status ??
            "running") as EnterpriseKnowledgeJobStep["status"],
          progressCurrent: event.progressCurrent ?? existing?.progressCurrent ?? null,
          progressTotal: event.progressTotal ?? existing?.progressTotal ?? null,
          checkpointRef: existing?.checkpointRef ?? null,
          attempt: existing?.attempt ?? 0,
          startedAt: existing?.startedAt ?? null,
          updatedAt: Date.parse(event.occurredAt),
          completedAt: existing?.completedAt ?? null,
          safeErrorCode: event.safeErrorCode ?? existing?.safeErrorCode ?? null,
          degradedReason: existing?.degradedReason ?? null,
        };
        this.jobSteps = {
          ...this.jobSteps,
          [event.entityId]: existing
            ? steps.map((step) => (step.stepId === existing.stepId ? next : step))
            : [...steps, next],
        };
      }
    }
  }

  private async refreshFromTerminalEvents(events: EnterpriseKnowledgeChangeEvent[]): Promise<void> {
    const selected = this.selected;
    if (!selected) {
      await Promise.all([this.load(), this.loadGraphOverview()]);
      return;
    }
    if (events.length > 0 && !events.some((event) => event.zoneId === selected.id)) {
      await Promise.all([this.load(), this.loadGraphOverview()]);
      return;
    }
    await Promise.all([this.load(), this.loadGraphOverview(), this.openZone(selected, this.tab)]);
  }

  protected async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      const result = await listEnterpriseKnowledgeZones("admin", {
        query: this.query,
        cursor: this.cursor,
        limit: "50",
        includeArchived: "true",
      });
      this.zones = result.items;
      this.nextCursor = result.nextCursor;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  protected scheduleLoad(): void {
    if (this.reloadTimer) {
      globalThis.clearTimeout(this.reloadTimer);
    }
    this.cursor = "";
    this.previousCursors = [];
    this.reloadTimer = globalThis.setTimeout(() => void this.load(), 250);
  }

  protected nextPage(): void {
    if (!this.nextCursor) {
      return;
    }
    this.previousCursors.push(this.cursor);
    this.cursor = this.nextCursor;
    void this.load();
  }

  protected previousPage(): void {
    const previous = this.previousCursors.pop();
    if (previous === undefined) {
      return;
    }
    this.cursor = previous;
    void this.load();
  }

  protected async loadReadiness(): Promise<void> {
    try {
      this.readiness = await loadEnterpriseKnowledgeReadiness("admin");
    } catch {
      this.readiness = undefined;
    }
  }

  protected async loadGraphOverview(): Promise<void> {
    try {
      this.graphOverview = await loadEnterpriseKnowledgeGraphOverview("admin");
    } catch {
      this.graphOverview = undefined;
    }
  }

  protected async loadCatalogs(): Promise<void> {
    if (this.catalogsLoading) {
      return;
    }
    this.catalogsLoading = true;
    this.catalogError = "";
    try {
      const [catalog, accounts] = await Promise.all([
        listAdminAgentCatalog(),
        this.loadAllAccounts(),
      ]);
      this.agentCatalog = { shared: catalog.shared, personal: catalog.personal };
      this.accounts = accounts;
    } catch (error) {
      this.catalogError = errorMessage(error);
    } finally {
      this.catalogsLoading = false;
    }
  }

  private async loadAllAccounts(): Promise<EnterpriseAccount[]> {
    const accounts: EnterpriseAccount[] = [];
    let cursor = "";
    const seen = new Set<string>();
    do {
      const result = await listAdminAccounts({ cursor, limit: "100", sort: "username" });
      accounts.push(...result.accounts);
      const next = result.pageInfo.nextCursor ?? "";
      if (!next || seen.has(next)) {
        break;
      }
      seen.add(next);
      cursor = next;
    } while (accounts.length < 5_000);
    return accounts;
  }

  protected openCreateDrawer(): void {
    this.createDraft = {
      ...emptyKnowledgeZoneDraft(),
      graphEnabled: this.readiness?.graph.enabled ?? false,
    };
    this.createErrors = {};
    this.createError = "";
    this.slugEdited = false;
    this.createOpen = true;
    if (!this.agentCatalog.shared.length && !this.agentCatalog.personal.length) {
      void this.loadCatalogs();
    }
  }

  protected closeCreateDrawer(): void {
    if (this.busy && !globalThis.confirm("Zone đang được tạo. Đóng drawer?")) {
      return;
    }
    this.createOpen = false;
    this.createErrors = {};
    this.createError = "";
  }

  protected updateCreateDraft(patch: Partial<KnowledgeZoneDraft>): void {
    this.createDraft = { ...this.createDraft, ...patch };
    this.createErrors = {
      ...this.createErrors,
      ...Object.fromEntries(Object.keys(patch).map((key) => [key, undefined])),
    };
  }

  protected updateCreateName(name: string): void {
    const patch: Partial<KnowledgeZoneDraft> = { name };
    if (!this.slugEdited) {
      patch.slug = name
        .normalize("NFD")
        .replaceAll(/[\u0300-\u036f]/g, "")
        .replaceAll(/[đĐ]/g, "d")
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "")
        .slice(0, 64);
    }
    this.updateCreateDraft(patch);
  }

  protected setCreateSlug(slug: string): void {
    this.slugEdited = true;
    this.updateCreateDraft({ slug: slug.toLowerCase() });
  }

  protected setCreateAgent(resourceKey: string, checked: boolean): void {
    const selected = new Set(this.createDraft.agentResourceKeys);
    if (checked) {
      selected.add(resourceKey);
    } else {
      selected.delete(resourceKey);
    }
    this.updateCreateDraft({ agentResourceKeys: [...selected] });
  }

  protected uploadProgress(upload: EnterpriseKnowledgeUpload): UploadProgress {
    const labels: Record<EnterpriseKnowledgeUpload["state"], string> = {
      active: "Chờ tiếp tục",
      committing: "Đang xử lý",
      committed: "Đã nạp",
      cancelled: "Đã hủy",
      expired: "Đã hết hạn",
      error: "Lỗi",
    };
    return {
      id: upload.id,
      name: upload.originalName,
      uploaded: upload.receivedSize,
      total: upload.expectedSize,
      state: labels[upload.state],
    };
  }

  protected async openZone(
    zone: EnterpriseKnowledgeZone,
    initialTab: KnowledgeTab = "overview",
  ): Promise<void> {
    this.selected = zone;
    this.tab = initialTab;
    this.detailLoading = true;
    this.error = "";
    this.notice = "";
    this.selectedSource = undefined;
    this.selectedVersion = undefined;
    this.versionPreview = undefined;
    this.versions = [];
    try {
      const [detail, sources, jobs, members, bindings, publications, uploads] = await Promise.all([
        loadEnterpriseKnowledgeZone("admin", zone.id),
        listEnterpriseKnowledgeSources("admin", zone.id),
        listEnterpriseKnowledgeJobs("admin", zone.id),
        listEnterpriseKnowledgeMembers("admin", zone.id),
        listEnterpriseKnowledgeAgentBindings(zone.id),
        listEnterpriseKnowledgePublications("admin", zone.id),
        listEnterpriseKnowledgeUploads("admin", zone.id),
      ]);
      this.selected = detail.zone;
      this.selectedRole = detail.role;
      this.candidate = detail.candidate ?? undefined;
      this.graphSettings = detail.graphSettings;
      this.sources = sources.items;
      this.jobs = jobs.items;
      const jobDetails = (
        await Promise.allSettled(
          jobs.items
            .slice(0, 20)
            .map((job) => loadEnterpriseKnowledgeJob("admin", zone.id, job.id)),
        )
      ).flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      this.jobSteps = Object.fromEntries(jobDetails.map((detail) => [detail.job.id, detail.steps]));
      this.members = members.items;
      this.memberDraft = memberRoleDraft(members.items);
      this.bindings = bindings.items;
      this.bindingDraft = [...bindings.items];
      this.publications = publications.items;
      this.uploads = uploads.items.map((upload) => this.uploadProgress(upload));
      this.settingsDraft = draftFromKnowledgeZone(detail.zone, detail.graphSettings);
      this.settingsErrors = {};
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.detailLoading = false;
    }
  }

  protected openZoneTab(zone: EnterpriseKnowledgeZone, tab: KnowledgeTab): void {
    void this.openZone(zone, tab);
  }

  protected detailsDirty(): boolean {
    if (!this.selected) {
      return false;
    }
    const original = draftFromKnowledgeZone(this.selected, this.graphSettings);
    const settingsDirty =
      original.name !== this.settingsDraft.name ||
      original.description !== this.settingsDraft.description ||
      original.egressPolicy !== this.settingsDraft.egressPolicy;
    const graphDirty =
      original.graphEnabled !== this.settingsDraft.graphEnabled ||
      original.graphEnrichmentEnabled !== this.settingsDraft.graphEnrichmentEnabled ||
      original.graphAutoApprovalThreshold !== this.settingsDraft.graphAutoApprovalThreshold;
    return (
      settingsDirty ||
      graphDirty ||
      !sameStringSet(this.bindings, this.bindingDraft) ||
      !sameMemberRoles(this.members, this.memberDraft)
    );
  }

  protected canCloseZone(): boolean {
    if (!this.busy && !this.detailsDirty()) {
      return true;
    }
    return globalThis.confirm(
      this.busy ? "Tác vụ đang chạy. Đóng drawer?" : "Bỏ các thay đổi chưa lưu?",
    );
  }

  protected closeZone(): void {
    this.selected = undefined;
    this.versions = [];
    this.selectedSource = undefined;
    this.selectedVersion = undefined;
    this.versionPreview = undefined;
    this.graphSettings = undefined;
    this.jobSteps = {};
    this.searchHits = [];
    this.error = "";
    this.notice = "";
  }
}
