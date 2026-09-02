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
      graphEnabled: data.get("graphEnabled") === "on",
      graphEnrichmentEnabled: data.get("graphEnrichmentEnabled") === "on",
      graphAutoApprovalThreshold: Number(
        data.get("graphAutoApprovalThreshold") ?? this.createDraft.graphAutoApprovalThreshold,
      ),
    };
    this.createDraft = draft;
    this.createErrors = validateKnowledgeZoneDraft(draft);
    if (Object.values(this.createErrors).some(Boolean)) {
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
      this.notice = "Đã tạo vùng tri thức và áp dụng quyền Agent ban đầu.";
    } catch (error) {
      if (created) {
        this.createOpen = false;
        await this.load();
        await this.openZone(created, "agents");
        this.error = `Zone đã được tạo nhưng chưa áp dụng đủ quyền Agent: ${errorMessage(error)}`;
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
      graphEnabled: data.get("graphEnabled") === "on",
      graphEnrichmentEnabled: data.get("graphEnrichmentEnabled") === "on",
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
      this.notice = "Đã cập nhật cấu hình vùng tri thức.";
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
      this.notice = "Đã nạp ghi chú và xếp hàng xử lý.";
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
      this.notice = "Đã nạp URL và xếp hàng xử lý.";
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
      this.error = targetSource
        ? "Chỉ chọn một file để tạo version thay thế."
        : "Mỗi lần chỉ được chọn tối đa 20 file.";
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
        state: "Đang chờ",
      }));
      for (const [index, file] of selectedFiles.entries()) {
        let progressId = `local:${index}:${file.name}`;
        try {
          if (file.size > 50 * 1024 * 1024) {
            throw new Error("File vượt giới hạn 50 MiB.");
          }
          this.updateUpload(progressId, { state: "Đang tải" });
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
            state: resumable ? "Đang tiếp tục" : "Đang tải",
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
          this.updateUpload(progressId, { state: "Đang xử lý" });
          await commitEnterpriseKnowledgeUpload("admin", selectedZone.id, upload.id);
          this.updateUpload(progressId, { state: "Đã nạp" });
        } catch (error) {
          this.updateUpload(progressId, { state: "Lỗi", error: errorMessage(error) });
        }
      }
      await this.openZone(selectedZone, "sources");
      this.notice = "Đã hoàn tất upload. OCR sẽ tự chạy với file scan hoặc ảnh khi cần.";
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
      this.updateUpload(uploadId, { state: "Đã hủy" });
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
      this.notice =
        "Đã xếp hàng Phân tích lại bằng AI Graph V3. Tiến độ sẽ tự cập nhật, không cần tải lại trang.";
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
      this.notice = "Đã tạo draft version mới.";
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
        source.status === "staged_remove"
          ? "Đã hoàn tác gỡ nguồn khỏi candidate."
          : "Đã đưa nguồn vào danh sách gỡ ở candidate kế tiếp.";
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
      this.notice = action === "cancel" ? "Đã yêu cầu hủy job." : "Đã xếp hàng chạy lại job.";
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
      this.notice = "Đã cập nhật vai trò thành viên.";
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
      this.notice = "Đã cập nhật Agent được phép truy cập vùng tri thức.";
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected async search(event: SubmitEvent): Promise<void> {
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
      this.searchHits = (
        await searchEnterpriseKnowledgeCandidate(
          "admin",
          this.selected.id,
          String(data.get("query") ?? ""),
        )
      ).hits;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected async buildCandidate(): Promise<void> {
    if (!this.selected) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await buildEnterpriseKnowledgeCandidate("admin", this.selected.id, this.selected.revision);
      await this.openZone(this.selected, "activity");
      this.notice = "Đã xếp hàng tạo candidate mới.";
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
    const degradedReason = this.degradedReason.trim();
    if (this.candidate.vectorStatus !== "ready" && !degradedReason) {
      this.error = "Nhập lý do phê duyệt khi publish ở chế độ FTS-only.";
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await publishEnterpriseKnowledgeCandidate("admin", this.selected.id, {
        baseRevision: this.selected.revision,
        generationId: this.candidate.id,
        degradedReason: degradedReason || undefined,
      });
      this.degradedReason = "";
      await this.openZone(this.selected, "search");
      this.notice = "Đã publish candidate thành công.";
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  protected async rollback(publication: EnterpriseKnowledgePublication): Promise<void> {
    if (!this.selected || publication.id === this.selected.activePublicationId) {
      return;
    }
    if (
      !globalThis.confirm(
        `Rollback ${this.selected.name} về publication #${publication.publicationNumber}?`,
      )
    ) {
      return;
    }
    this.busy = true;
    try {
      const result = await rollbackEnterpriseKnowledgePublication("admin", this.selected.id, {
        baseRevision: this.selected.revision,
        publicationId: publication.id,
      });
      await this.openZone(result.zone, "activity");
      this.notice = `Đã rollback về publication #${publication.publicationNumber}.`;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
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
    if (!globalThis.confirm(`${archived ? "Archive" : "Restore"} vùng ${this.selected.name}?`)) {
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
    if (!this.selected || this.selected.status !== "archived") {
      return;
    }
    this.busy = true;
    try {
      const { preview } = await previewEnterpriseKnowledgeZonePurge(this.selected.id);
      const summary = `${preview.sources} nguồn, ${preview.versions} version, ${preview.publications} publication và ${preview.generations} index generation`;
      if (preview.activeJobs || preview.activeUploads) {
        throw new Error("Phải hủy toàn bộ job và upload đang hoạt động trước khi purge.");
      }
      const confirmation = globalThis.prompt(
        `Purge sẽ xóa vĩnh viễn ${summary}. Nhập chính xác slug “${this.selected.slug}” để tiếp tục:`,
      );
      if (confirmation !== this.selected.slug) {
        return;
      }
      if (!globalThis.confirm(`Xác nhận xóa vĩnh viễn Zone ${this.selected.name}?`)) {
        return;
      }
      await purgeEnterpriseKnowledgeZone(this.selected.id, this.selected.revision, confirmation);
      this.closeZone();
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
