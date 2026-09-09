import { showNativeConfirm } from "../../../branding/display-dialog.ts";
import { showInputDialog } from "../../../components/input-dialog.ts";
import { kak } from "../../../i18n/enterprise-admin-knowledge.ts";
import { enterpriseDomainCopy } from "../../../i18n/enterprise-domain.ts";
import {
  appendEnterpriseKnowledgeUploadChunk,
  beginEnterpriseKnowledgeUpload,
  buildEnterpriseKnowledgeCandidate,
  cancelEnterpriseKnowledgeJob,
  cancelEnterpriseKnowledgeUpload,
  commitEnterpriseKnowledgeUpload,
  createEnterpriseKnowledgeNote,
  createEnterpriseKnowledgeSourceVersion,
  createEnterpriseKnowledgeUrl,
  createEnterpriseKnowledgeZone,
  listEnterpriseKnowledgeActivity,
  listEnterpriseKnowledgeUploads,
  loadEnterpriseKnowledgeDoctor,
  loadEnterpriseKnowledgeSource,
  loadEnterpriseKnowledgeVersionPreview,
  previewEnterpriseKnowledgeZonePurge,
  publishEnterpriseKnowledgeCandidate,
  purgeEnterpriseKnowledgeZone,
  reprocessEnterpriseKnowledgeVersionV3,
  replaceEnterpriseKnowledgeAgentBindings,
  replaceEnterpriseKnowledgeEvidenceTransfers,
  replaceEnterpriseKnowledgeMembers,
  retryEnterpriseKnowledgeJob,
  rollbackEnterpriseKnowledgePublication,
  searchEnterpriseKnowledgeCandidate,
  setEnterpriseKnowledgeSourceStagedRemove,
  setEnterpriseKnowledgeZoneArchived,
  updateEnterpriseKnowledgeZone,
  updateEnterpriseKnowledgeGraphSettings,
  type EnterpriseKnowledgeJob,
  type EnterpriseKnowledgePublication,
  type EnterpriseKnowledgeSource,
  type EnterpriseKnowledgeVersion,
  type EnterpriseKnowledgeZone,
  type EnterpriseKnowledgeZoneRole,
} from "../../enterprise/services/enterprise-knowledge-api.ts";
import { errorMessage } from "../utils.ts";
import {
  emptyKnowledgeZoneDraft,
  validateKnowledgeZoneDraft,
  type KnowledgeTab,
  type KnowledgeZoneDraft,
  type UploadProgress,
} from "./knowledge-page-model.ts";
import { EnterpriseAdminKnowledgeStateController } from "./knowledge-page-state-controller.ts";

export type { KnowledgeTab, UploadProgress } from "./knowledge-page-model.ts";

function formFromEvent(event: SubmitEvent): HTMLFormElement | undefined {
  return event.currentTarget instanceof HTMLFormElement ? event.currentTarget : undefined;
}

export class EnterpriseAdminKnowledgeController extends EnterpriseAdminKnowledgeStateController {
  protected async createZone(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = formFromEvent(event);
    if (!form) {
      return;
    }
    const data = new FormData(form);
    const draft: KnowledgeZoneDraft = {
      ...this.createDraft,
      name: String(data.get("name") ?? this.createDraft.name),
      slug: String(data.get("slug") ?? this.createDraft.slug)
        .trim()
        .toLowerCase(),
      description: String(data.get("description") ?? this.createDraft.description),
      egressPolicy:
        data.get("egressPolicy") === "external_allowed" ? "external_allowed" : "local_only",
      graphAutoApprovalThreshold: Number(
        data.get("graphAutoApprovalThreshold") ?? this.createDraft.graphAutoApprovalThreshold,
      ),
    };
    this.createDraft = draft;
    this.createErrors = validateKnowledgeZoneDraft(draft);
    if (Object.values(this.createErrors).some(Boolean)) {
      await this.updateComplete;
      if (form.isConnected) {
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }
      return;
    }
    this.busy = true;
    this.createError = "";
    let created: EnterpriseKnowledgeZone | undefined;
    try {
      created = (
        await createEnterpriseKnowledgeZone({
          slug: draft.slug,
          name: draft.name.trim(),
          description: draft.description,
          egressPolicy: draft.egressPolicy,
          graph: {
            enabled: draft.graphEnabled,
            enrichmentEnabled: draft.graphEnrichmentEnabled,
            autoApprovalThreshold: draft.graphAutoApprovalThreshold,
          },
        })
      ).zone;
      if (draft.agentResourceKeys.length) {
        created = (
          await replaceEnterpriseKnowledgeAgentBindings(
            created.id,
            created.revision,
            draft.agentResourceKeys,
          )
        ).zone;
      }
      this.createOpen = false;
      this.createDraft = emptyKnowledgeZoneDraft();
      await this.load();
      await this.openZone(created);
      this.notice = kak("createSuccess");
    } catch (error) {
      if (created) {
        this.createOpen = false;
        await this.load();
        await this.openZone(created, "agents");
        this.error = kak("createPartial", { error: errorMessage(error) });
      } else {
        this.createError = errorMessage(error);
      }
    } finally {
      this.busy = false;
    }
  }

  protected updateSettingsDraft(patch: Partial<KnowledgeZoneDraft>): void {
    this.settingsDraft = { ...this.settingsDraft, ...patch };
    this.settingsErrors = {
      ...this.settingsErrors,
      ...Object.fromEntries(Object.keys(patch).map((key) => [key, undefined])),
    };
  }

  protected async saveZoneSettings(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected) {
      return;
    }
    const form = formFromEvent(event);
    if (!form) {
      return;
    }
    const data = new FormData(form);
    const draft: KnowledgeZoneDraft = {
      ...this.settingsDraft,
      name: String(data.get("name") ?? this.settingsDraft.name),
      description: String(data.get("description") ?? this.settingsDraft.description),
      egressPolicy:
        data.get("egressPolicy") === "external_allowed" ? "external_allowed" : "local_only",
      graphAutoApprovalThreshold: Number(
        data.get("graphAutoApprovalThreshold") ?? this.settingsDraft.graphAutoApprovalThreshold,
      ),
    };
    this.settingsDraft = draft;
    this.settingsErrors = validateKnowledgeZoneDraft(draft);
    if (Object.values(this.settingsErrors).some(Boolean)) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      const original = this.selected;
      let zone = original;
      if (
        original.name !== draft.name.trim() ||
        original.description !== draft.description ||
        original.egressPolicy !== draft.egressPolicy
      ) {
        zone = (
          await updateEnterpriseKnowledgeZone(original.id, {
            baseRevision: zone.revision,
            name: draft.name.trim(),
            description: draft.description,
            egressPolicy: draft.egressPolicy,
          })
        ).zone;
      }
      if (
        this.graphSettings?.enabled !== draft.graphEnabled ||
        this.graphSettings?.enrichmentEnabled !== draft.graphEnrichmentEnabled ||
        this.graphSettings?.autoApprovalThreshold !== draft.graphAutoApprovalThreshold
      ) {
        zone = (
          await updateEnterpriseKnowledgeGraphSettings(zone.id, {
            baseRevision: zone.revision,
            enabled: draft.graphEnabled,
            enrichmentEnabled: draft.graphEnrichmentEnabled,
            autoApprovalThreshold: draft.graphAutoApprovalThreshold,
          })
        ).zone;
      }
      await this.load();
      await this.openZone(zone, "settings");
      this.notice = kak("settingsSaved");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected async createNote(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected) {
      return;
    }
    const form = formFromEvent(event);
    if (!form) {
      return;
    }
    const data = new FormData(form);
    this.busy = true;
    this.error = "";
    try {
      await createEnterpriseKnowledgeNote("admin", this.selected.id, {
        title: String(data.get("title") ?? ""),
        content: String(data.get("content") ?? ""),
      });
      form.reset();
      await this.openZone(this.selected, "sources");
      this.notice = kak("noteAdded");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected async createUrl(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected) {
      return;
    }
    const form = formFromEvent(event);
    if (!form) {
      return;
    }
    const data = new FormData(form);
    this.busy = true;
    this.error = "";
    try {
      await createEnterpriseKnowledgeUrl("admin", this.selected.id, {
        title: String(data.get("title") ?? ""),
        url: String(data.get("url") ?? ""),
        crawlSameOrigin: data.get("crawlSameOrigin") === "on",
      });
      form.reset();
      await this.openZone(this.selected, "sources");
      this.notice = kak("urlAdded");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected updateUpload(id: string, patch: Partial<UploadProgress>): void {
    this.uploads = this.uploads.map((item) => (item.id === id ? { ...item, ...patch } : item));
  }

  protected async uploadFiles(
    files: FileList | null,
    targetSource?: EnterpriseKnowledgeSource,
  ): Promise<void> {
    if (!this.selected || !files?.length) {
      return;
    }
    if (files.length > 20 || (targetSource && files.length !== 1)) {
      this.error = targetSource ? kak("oneFileOnly") : kak("maxFiles");
      return;
    }
    const selectedZone = this.selected;
    this.busy = true;
    this.error = "";
    try {
      const serverUploads = await listEnterpriseKnowledgeUploads("admin", selectedZone.id);
      const selectedFiles = [...files];
      this.uploads = selectedFiles.map((file, index) => ({
        id: `local:${index}:${file.name}`,
        name: file.name,
        uploaded: 0,
        total: file.size,
        state: "active",
      }));
      for (const [index, file] of selectedFiles.entries()) {
        let progressId = `local:${index}:${file.name}`;
        try {
          if (file.size > 50 * 1024 * 1024) {
            throw new Error(kak("fileTooLarge"));
          }
          this.updateUpload(progressId, { state: "uploading" });
          const resumable = serverUploads.items.find(
            (item) =>
              item.state === "active" &&
              item.originalName === file.name &&
              item.expectedSize === file.size &&
              item.targetSourceId === (targetSource?.id ?? null),
          );
          const upload =
            resumable ??
            (
              await beginEnterpriseKnowledgeUpload("admin", selectedZone.id, {
                title: file.name,
                originalName: file.name,
                mimeType: file.type || "application/octet-stream",
                size: file.size,
                targetSourceId: targetSource?.id,
              })
            ).upload;
          this.updateUpload(progressId, {
            id: upload.id,
            uploaded: upload.receivedSize,
            state: resumable ? "resuming" : "uploading",
          });
          progressId = upload.id;
          let offset = upload.receivedSize;
          while (offset < file.size) {
            const next = Math.min(offset + 4 * 1024 * 1024, file.size);
            await appendEnterpriseKnowledgeUploadChunk(
              "admin",
              selectedZone.id,
              upload.id,
              offset,
              file.slice(offset, next),
            );
            offset = next;
            this.updateUpload(progressId, { uploaded: offset });
          }
          this.updateUpload(progressId, { state: "processing" });
          await commitEnterpriseKnowledgeUpload("admin", selectedZone.id, upload.id);
          this.updateUpload(progressId, { state: "committed" });
        } catch (error) {
          this.updateUpload(progressId, { state: "error", error: errorMessage(error) });
        }
      }
      await this.openZone(selectedZone, "sources");
      this.notice = kak("uploadSuccess");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected async cancelUpload(uploadId: string): Promise<void> {
    if (!this.selected) {
      return;
    }
    try {
      await cancelEnterpriseKnowledgeUpload("admin", this.selected.id, uploadId);
      this.updateUpload(uploadId, { state: "cancelled" });
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  protected async openSource(source: EnterpriseKnowledgeSource): Promise<void> {
    if (!this.selected) {
      return;
    }
    this.error = "";
    try {
      const detail = await loadEnterpriseKnowledgeSource("admin", this.selected.id, source.id);
      this.selectedSource = detail.source;
      this.versions = detail.versions;
      const latest = detail.versions[0];
      if (latest) {
        await this.openVersion(latest);
      } else {
        this.selectedVersion = undefined;
        this.versionPreview = undefined;
      }
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  protected async openVersion(version: EnterpriseKnowledgeVersion): Promise<void> {
    if (!this.selected) {
      return;
    }
    this.selectedVersion = version;
    this.versionPreview = undefined;
    if (!["ready", "degraded"].includes(version.processingStatus)) {
      return;
    }
    this.versionPreviewLoading = true;
    try {
      this.versionPreview = await loadEnterpriseKnowledgeVersionPreview(
        "admin",
        this.selected.id,
        version.id,
      );
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.versionPreviewLoading = false;
    }
  }

  protected async reprocessVersionWithAiGraphV3(): Promise<void> {
    if (!this.selected || !this.selectedSource || !this.selectedVersion) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await reprocessEnterpriseKnowledgeVersionV3(
        "admin",
        this.selected.id,
        this.selectedSource.id,
        this.selectedVersion.id,
        this.selected.buildRevision,
      );
      await this.openZone(this.selected, "activity");
      this.notice = kak("reprocessQueued");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected async createSourceVersion(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected || !this.selectedSource) {
      return;
    }
    const form = formFromEvent(event);
    if (!form) {
      return;
    }
    const data = new FormData(form);
    this.busy = true;
    this.error = "";
    try {
      await createEnterpriseKnowledgeSourceVersion(
        "admin",
        this.selected.id,
        this.selectedSource.id,
        this.selectedSource.kind === "note"
          ? { content: String(data.get("content") ?? "") }
          : {
              url: String(data.get("url") ?? this.selectedSource.canonicalUrl ?? ""),
              crawlSameOrigin: data.get("crawlSameOrigin") === "on",
            },
      );
      form.reset();
      await this.openZone(this.selected, "sources");
      this.notice = kak("versionCreated");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected async toggleSourceRemoval(source: EnterpriseKnowledgeSource): Promise<void> {
    if (!this.selected) {
      return;
    }
    try {
      await setEnterpriseKnowledgeSourceStagedRemove(
        "admin",
        this.selected.id,
        source.id,
        source.status !== "staged_remove",
      );
      await this.openZone(this.selected, "sources");
      this.notice =
        source.status === "staged_remove" ? kak("undoSourceRemoval") : kak("stageSourceRemoval");
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  protected async runJobAction(job: EnterpriseKnowledgeJob, action: "cancel" | "retry") {
    if (!this.selected) {
      return;
    }
    this.busy = true;
    try {
      if (action === "cancel") {
        await cancelEnterpriseKnowledgeJob("admin", this.selected.id, job.id);
      } else {
        await retryEnterpriseKnowledgeJob("admin", this.selected.id, job.id);
      }
      await this.openZone(this.selected, "activity");
      this.notice = action === "cancel" ? kak("cancelJobRequested") : kak("retryJobQueued");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected setMemberRole(accountId: string, role: EnterpriseKnowledgeZoneRole | "none"): void {
    this.memberDraft = { ...this.memberDraft, [accountId]: role };
  }

  protected async saveMembers(event?: SubmitEvent): Promise<void> {
    event?.preventDefault();
    if (!this.selected) {
      return;
    }
    const members = Object.entries(this.memberDraft)
      .filter((entry): entry is [string, EnterpriseKnowledgeZoneRole] => entry[1] !== "none")
      .map(([accountId, role]) => ({ accountId, role }));
    this.busy = true;
    this.error = "";
    try {
      const result = await replaceEnterpriseKnowledgeMembers(
        "admin",
        this.selected.id,
        this.selected.revision,
        members,
      );
      await this.openZone(result.zone, "members");
      this.notice = kak("membersSaved");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected setAgentBinding(resourceKey: string, checked: boolean): void {
    const selected = new Set(this.bindingDraft);
    if (checked) {
      selected.add(resourceKey);
    } else {
      selected.delete(resourceKey);
    }
    this.bindingDraft = [...selected];
  }

  protected async saveBindings(event?: SubmitEvent): Promise<void> {
    event?.preventDefault();
    if (!this.selected) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      const result = await replaceEnterpriseKnowledgeAgentBindings(
        this.selected.id,
        this.selected.revision,
        this.bindingDraft.toSorted(),
      );
      await this.openZone(result.zone, "agents");
      this.notice = kak("agentBindingsSaved");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected setEvidenceTransfer(resourceKey: string, checked: boolean): void {
    const selected = new Set(this.evidenceTransferDraft);
    if (checked) {
      selected.add(resourceKey);
    } else {
      selected.delete(resourceKey);
    }
    this.evidenceTransferDraft = [...selected];
  }

  protected async saveEvidenceTransfers(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected || this.busy) {
      return;
    }
    const zone = this.selected;
    const request = this.detailRequest;
    this.busy = true;
    this.error = "";
    try {
      const result = await replaceEnterpriseKnowledgeEvidenceTransfers(
        zone.id,
        zone.revision,
        this.evidenceTransferDraft.toSorted(),
      );
      this.zones = this.zones.map((item) => (item.id === result.zone.id ? result.zone : item));
      // A late save must not reopen a closed drawer or overwrite another Zone's draft.
      if (this.selected?.id === zone.id && this.detailRequest === request) {
        const refreshRequest = request + 1;
        await this.openZone(result.zone, "agents");
        if (this.selected?.id === zone.id && this.detailRequest === refreshRequest) {
          this.notice = enterpriseDomainCopy("enterpriseKnowledge.evidenceTransferSaved");
        }
      }
    } catch (error) {
      if (this.selected?.id === zone.id && this.detailRequest === request) {
        this.error = errorMessage(error);
      }
    } finally {
      this.busy = false;
    }
  }

  protected async search(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected || !this.candidate) {
      return;
    }
    const form = formFromEvent(event);
    if (!form) {
      return;
    }
    const data = new FormData(form);
    const zone = this.selected;
    const candidateId = this.candidate.id;
    this.searchHits = [];
    this.searchCompleted = false;
    this.busy = true;
    this.error = "";
    try {
      const result = await searchEnterpriseKnowledgeCandidate(
        "admin",
        zone.id,
        String(data.get("query") ?? ""),
      );
      if (this.selected?.id !== zone.id || this.candidate?.id !== candidateId) {
        return;
      }
      if (result.candidate.id !== candidateId) {
        await this.openZone(zone, "search");
      }
      if (this.selected?.id === zone.id && this.candidate?.id === result.candidate.id) {
        this.searchHits = result.hits;
        this.searchCompleted = true;
      }
    } catch (error) {
      if (this.selected?.id === zone.id && this.candidate?.id === candidateId) {
        this.error = errorMessage(error);
      }
    } finally {
      this.busy = false;
    }
  }

  protected async buildCandidate(): Promise<void> {
    if (!this.selected) {
      return;
    }
    const zone = this.selected;
    this.busy = true;
    this.error = "";
    try {
      await buildEnterpriseKnowledgeCandidate("admin", zone.id, zone.revision);
      await this.refreshAfterPublicationMutation(zone, "activity");
      if (this.selected?.id === zone.id) {
        this.notice = kak("candidateQueued");
      }
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected async publish(): Promise<void> {
    if (!this.selected || !this.candidate) {
      return;
    }
    const zone = this.selected;
    const candidate = this.candidate;
    const degradedReason = this.degradedReason.trim();
    if (candidate.vectorStatus !== "ready" && !degradedReason) {
      this.error = kak("ftsReasonRequired");
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await publishEnterpriseKnowledgeCandidate("admin", zone.id, {
        baseRevision: zone.revision,
        generationId: candidate.id,
        degradedReason: degradedReason || undefined,
      });
      if (this.selected?.id === zone.id) {
        this.degradedReason = "";
      }
      await this.refreshAfterPublicationMutation(zone, "search");
      if (this.selected?.id === zone.id) {
        this.notice = kak("candidatePublished");
      }
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected rollback(publication: EnterpriseKnowledgePublication): void {
    if (
      !this.selected ||
      this.busy ||
      publication.zoneId !== this.selected.id ||
      publication.id === this.selected.activePublicationId
    ) {
      return;
    }
    this.rollbackTarget = { zone: { ...this.selected }, publication: { ...publication } };
    this.rollbackError = "";
  }

  protected cancelRollback(): void {
    if (!this.busy) {
      this.rollbackTarget = undefined;
      this.rollbackError = "";
    }
  }

  protected async confirmRollback(): Promise<void> {
    const target = this.rollbackTarget;
    if (!target || this.busy) {
      return;
    }
    const { zone, publication } = target;
    // Confirmation authorizes this exact snapshot, not a newer revision loaded
    // by realtime updates while the administrator is reading the dialog.
    if (
      this.selected?.id !== zone.id ||
      this.selected.revision !== zone.revision ||
      this.selected.activePublicationId === publication.id
    ) {
      this.rollbackError = enterpriseDomainCopy("enterpriseKnowledge.rollbackStale");
      return;
    }
    this.busy = true;
    this.rollbackError = "";
    try {
      const result = await rollbackEnterpriseKnowledgePublication("admin", zone.id, {
        baseRevision: zone.revision,
        publicationId: publication.id,
      });
      await this.refreshAfterPublicationMutation(result.zone, "activity");
      if (this.rollbackTarget === target) {
        this.rollbackTarget = undefined;
      }
      if (this.selected?.id === zone.id) {
        this.notice = enterpriseDomainCopy("enterpriseKnowledge.rollbackSuccess", {
          number: String(publication.publicationNumber),
        });
      }
    } catch (error) {
      if (this.rollbackTarget === target) {
        this.rollbackError = errorMessage(error);
      }
    } finally {
      this.busy = false;
    }
  }

  private async refreshAfterPublicationMutation(
    zone: EnterpriseKnowledgeZone,
    tab: KnowledgeTab,
  ): Promise<void> {
    // Mutations outlive their drawer. Refresh the list even if the operator closes
    // or changes the drawer during either the mutation or its detail refresh.
    await Promise.all([
      this.load(),
      this.loadGraphOverview(),
      this.selected?.id === zone.id ? this.openZone(zone, tab) : undefined,
    ]);
  }

  protected async openOperations(): Promise<void> {
    this.operationsOpen = true;
    this.operationsLoading = true;
    this.error = "";
    try {
      const [doctor, activity] = await Promise.all([
        loadEnterpriseKnowledgeDoctor(),
        listEnterpriseKnowledgeActivity(200),
      ]);
      this.doctor = doctor.report;
      this.auditEvents = activity.items.filter(
        (item) => item.action.startsWith("knowledge.") || item.targetType.startsWith("knowledge_"),
      );
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.operationsLoading = false;
    }
  }

  protected async toggleArchive(): Promise<void> {
    if (!this.selected) {
      return;
    }
    const archived = this.selected.status !== "archived";
    if (
      !showNativeConfirm(
        kak("archiveConfirm", {
          action: archived ? kak("archive") : kak("restore"),
          name: this.selected.name,
        }),
      )
    ) {
      return;
    }
    this.busy = true;
    try {
      await setEnterpriseKnowledgeZoneArchived(this.selected.id, archived, this.selected.revision);
      this.closeZone();
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected async purgeZone(): Promise<void> {
    const target = this.selected;
    if (!target || target.status !== "archived") {
      return;
    }
    this.busy = true;
    try {
      const { preview } = await previewEnterpriseKnowledgeZonePurge(target.id);
      const summary = kak("purgeSummary", {
        sources: String(preview.sources),
        versions: String(preview.versions),
        publications: String(preview.publications),
        generations: String(preview.generations),
      });
      if (preview.activeJobs || preview.activeUploads) {
        throw new Error(kak("blockedPurge"));
      }
      const confirmation = await showInputDialog({
        title: kak("purgeTitle"),
        label: kak("purgePrompt", { summary }),
        submitLabel: "Purge",
        cancelLabel: kak("cancel"),
        // Keep the source slug out of rendered copy. The dedicated copy
        // affordance exposes the exact API token without weakening the
        // requirement that the operator manually submits it.
        copyValue: target.slug,
        copyLabel: kak("copySlug"),
      });
      if (confirmation !== target.slug) {
        return;
      }
      if (!showNativeConfirm(kak("purgeConfirm", { name: target.name }))) {
        return;
      }
      await purgeEnterpriseKnowledgeZone(target.id, target.revision, confirmation);
      this.closeZone();
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
