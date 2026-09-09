import { consume } from "@lit/context";
import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { applicationContext, type ApplicationContext } from "../../../../app/context.ts";
import { showNativeConfirm, showNativePrompt } from "../../../../branding/display-dialog.ts";
import { eu, euKnowledgeValue } from "../../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import {
  appendEnterpriseKnowledgeUploadChunk,
  beginEnterpriseKnowledgeUpload,
  cancelEnterpriseKnowledgeJob,
  cancelEnterpriseKnowledgeUpload,
  commitEnterpriseKnowledgeUpload,
  createEnterpriseKnowledgeNote,
  createEnterpriseKnowledgeUrl,
  listEnterpriseKnowledgeJobs,
  listEnterpriseKnowledgeMembers,
  listEnterpriseKnowledgePublications,
  listEnterpriseKnowledgeSources,
  listEnterpriseKnowledgeUploads,
  listEnterpriseKnowledgeZones,
  loadEnterpriseKnowledgeJob,
  loadEnterpriseKnowledgeZone,
  publishEnterpriseKnowledgeCandidate,
  retryEnterpriseKnowledgeJob,
  replaceEnterpriseKnowledgeMembers,
  rollbackEnterpriseKnowledgePublication,
  searchEnterpriseKnowledgeCandidate,
  type EnterpriseKnowledgeJob,
  type EnterpriseKnowledgeJobStep,
  type EnterpriseKnowledgePublication,
  type EnterpriseKnowledgeSource,
  type EnterpriseKnowledgeUpload,
  type EnterpriseKnowledgeZone,
  type EnterpriseKnowledgeZoneRole,
  type EnterpriseKnowledgeChangeEvent,
} from "../../../enterprise/services/enterprise-knowledge-api.ts";
import "../../../knowledge/knowledge-graph-view.ts";
import { startEnterpriseKnowledgeRealtime } from "../../../knowledge/knowledge-realtime.ts";
import "../../styles/knowledge.css";

type UploadState = {
  id: string;
  name: string;
  value: number;
  max: number;
  status: string;
  error?: string;
};

export class UserKnowledgePage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: true })
  private application?: ApplicationContext;
  @state() private zones: EnterpriseKnowledgeZone[] = [];
  @state() private selected?: EnterpriseKnowledgeZone;
  @state() private zoneRole: EnterpriseKnowledgeZoneRole = "viewer";
  @state() private sources: EnterpriseKnowledgeSource[] = [];
  @state() private jobs: EnterpriseKnowledgeJob[] = [];
  @state() private jobSteps: Record<string, EnterpriseKnowledgeJobStep[]> = {};
  @state() private publications: EnterpriseKnowledgePublication[] = [];
  @state() private members: Array<{ accountId: string; role: EnterpriseKnowledgeZoneRole }> = [];
  @state() private candidate?: { id: string; vectorStatus: string; lexicalStatus: string };
  @state() private hits: Array<Record<string, unknown>> = [];
  @state() private uploads: UploadState[] = [];
  @state() private loading = true;
  @state() private busy = false;
  @state() private error = "";
  @state() private view: "sources" | "graph" = "sources";
  private stopRealtime?: () => void;
  private detailRequest = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  override disconnectedCallback(): void {
    this.detailRequest++;
    this.stopRealtime?.();
    this.stopRealtime = undefined;
    super.disconnectedCallback();
  }

  protected override updated(): void {
    this.startRealtime();
  }

  private startRealtime(force = false): void {
    const gateway = this.application?.gateway;
    if (!gateway || (!force && this.stopRealtime)) {
      return;
    }
    this.stopRealtime?.();
    this.stopRealtime = startEnterpriseKnowledgeRealtime({
      gateway,
      audience: "user",
      zoneIds: () => (this.selected ? [this.selected.id] : []),
      hasActiveJobs: () =>
        this.jobs.some((job) => ["queued", "running", "retry_wait"].includes(job.status)),
      onEvents: (events) => this.mergeRealtimeEvents(events),
      onTerminal: (events) => {
        const selected = this.selected;
        if (
          selected &&
          (events.length === 0 || events.some((event) => event.zoneId === selected.id))
        ) {
          void this.open(selected, true);
        }
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
      this.jobs = this.jobs.map((job) =>
        job.id !== event.entityId
          ? job
          : {
              ...job,
              ...(event.stage ? { stage: event.stage } : {}),
              ...(event.entityType === "job" && event.status ? { status: event.status } : {}),
              ...(event.entityType === "job_step" && event.status === "running"
                ? { status: "running" }
                : {}),
              ...(event.progressCurrent === undefined
                ? {}
                : { progressCurrent: event.progressCurrent }),
              ...(event.progressTotal === undefined ? {} : { progressTotal: event.progressTotal }),
              ...(event.safeErrorCode ? { safeErrorCode: event.safeErrorCode } : {}),
              updatedAt: Date.parse(event.occurredAt),
            },
      );
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

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      this.zones = (await listEnterpriseKnowledgeZones("user")).items;
      if (!this.selected && this.zones[0]) {
        await this.open(this.zones[0]);
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("knowledgeLoadFailed");
    } finally {
      this.loading = false;
    }
  }

  private async open(zone: EnterpriseKnowledgeZone, preserveView = false): Promise<void> {
    const request = ++this.detailRequest;
    if (this.selected?.id !== zone.id) {
      this.hits = [];
      this.candidate = undefined;
      this.sources = [];
      this.jobs = [];
      this.jobSteps = {};
      this.members = [];
      this.publications = [];
      this.uploads = [];
      this.zoneRole = "viewer";
    }
    this.selected = zone;
    if (!preserveView) {
      this.view = "sources";
    }
    this.busy = true;
    this.error = "";
    try {
      const [detail, sources] = await Promise.all([
        loadEnterpriseKnowledgeZone("user", zone.id),
        listEnterpriseKnowledgeSources("user", zone.id),
      ]);
      const [jobs, uploads, members, publications] = await Promise.all([
        detail.role === "viewer" ? { items: [] } : listEnterpriseKnowledgeJobs("user", zone.id),
        detail.role === "viewer" ? { items: [] } : listEnterpriseKnowledgeUploads("user", zone.id),
        detail.role === "manager" ? listEnterpriseKnowledgeMembers("user", zone.id) : { items: [] },
        detail.role === "manager"
          ? listEnterpriseKnowledgePublications("user", zone.id)
          : { items: [] },
      ]);
      const jobDetails = await Promise.allSettled(
        jobs.items.slice(0, 20).map((job) => loadEnterpriseKnowledgeJob("user", zone.id, job.id)),
      );
      // A realtime refresh must not overwrite a newer zone selection or completed publication.
      if (request !== this.detailRequest) {
        return;
      }
      if (this.candidate?.id !== detail.candidate?.id) {
        this.hits = [];
      }
      this.selected = detail.zone;
      this.zones = this.zones.map((item) =>
        item.id === detail.zone.id ? { ...detail.zone, role: detail.role } : item,
      );
      this.zoneRole = detail.role;
      this.sources = sources.items;
      this.jobs = jobs.items;
      this.jobSteps = Object.fromEntries(
        jobDetails.flatMap((result) =>
          result.status === "fulfilled" ? [[result.value.job.id, result.value.steps]] : [],
        ),
      );
      this.uploads = uploads.items.map((upload) => this.uploadState(upload));
      this.candidate = detail.candidate ?? undefined;
      this.members = members.items;
      this.publications = publications.items;
    } catch (error) {
      if (request === this.detailRequest) {
        this.error = error instanceof Error ? error.message : eu("knowledgeOpenFailed");
      }
    } finally {
      if (request === this.detailRequest) {
        this.busy = false;
        this.startRealtime(true);
      }
    }
  }

  private async addNote(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected) {
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    this.busy = true;
    try {
      await createEnterpriseKnowledgeNote("user", this.selected.id, {
        title: String(data.get("title") ?? ""),
        content: String(data.get("content") ?? ""),
      });
      form.reset();
      await this.open(this.selected);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("knowledgeNoteAddFailed");
    } finally {
      this.busy = false;
    }
  }

  private async addUrl(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected) {
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    this.busy = true;
    try {
      await createEnterpriseKnowledgeUrl("user", this.selected.id, {
        title: String(data.get("title") ?? ""),
        url: String(data.get("url") ?? ""),
        crawlSameOrigin: data.get("crawlSameOrigin") === "on",
      });
      form.reset();
      await this.open(this.selected);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("knowledgeUrlAddFailed");
    } finally {
      this.busy = false;
    }
  }

  private uploadState(upload: EnterpriseKnowledgeUpload): UploadState {
    const labels: Record<EnterpriseKnowledgeUpload["state"], string> = {
      active: eu("knowledgeUploadActive"),
      committing: eu("knowledgeUploadCommitting"),
      committed: eu("knowledgeUploadCommitted"),
      cancelled: eu("knowledgeUploadCancelled"),
      expired: eu("knowledgeUploadExpired"),
      error: eu("knowledgeUploadError"),
    };
    return {
      id: upload.id,
      name: upload.originalName,
      value: upload.receivedSize,
      max: upload.expectedSize,
      status: labels[upload.state],
    };
  }

  private setUpload(id: string, patch: Partial<UploadState>): void {
    this.uploads = this.uploads.map((item) => (item.id === id ? { ...item, ...patch } : item));
  }

  private async upload(files: FileList | null): Promise<void> {
    if (!this.selected || !files?.length) {
      return;
    }
    if (files.length > 20) {
      this.error = eu("knowledgeFileLimit");
      return;
    }
    const zone = this.selected;
    const serverUploads = await listEnterpriseKnowledgeUploads("user", zone.id);
    const selectedFiles = [...files];
    this.uploads = selectedFiles.map((file, index) => ({
      id: `local:${index}:${file.name}`,
      name: file.name,
      value: 0,
      max: file.size,
      status: eu("knowledgeUploadWaiting"),
    }));
    for (const [index, file] of selectedFiles.entries()) {
      let progressId = `local:${index}:${file.name}`;
      try {
        if (!file.size || file.size > 50 * 1024 * 1024) {
          throw new Error(eu("knowledgeFileInvalid"));
        }
        const resumable = serverUploads.items.find(
          (item) =>
            item.state === "active" &&
            item.originalName === file.name &&
            item.expectedSize === file.size &&
            item.targetSourceId === null,
        );
        const upload =
          resumable ??
          (
            await beginEnterpriseKnowledgeUpload("user", zone.id, {
              title: file.name,
              originalName: file.name,
              mimeType: file.type || "application/octet-stream",
              size: file.size,
            })
          ).upload;
        this.setUpload(progressId, {
          id: upload.id,
          value: upload.receivedSize,
          status: resumable ? eu("knowledgeUploadResuming") : eu("knowledgeUploadUploading"),
        });
        progressId = upload.id;
        let offset = upload.receivedSize;
        while (offset < file.size) {
          const end = Math.min(file.size, offset + 4 * 1024 * 1024);
          await appendEnterpriseKnowledgeUploadChunk(
            "user",
            zone.id,
            upload.id,
            offset,
            file.slice(offset, end),
          );
          offset = end;
          this.setUpload(progressId, { value: offset, status: eu("knowledgeUploadUploading") });
        }
        this.setUpload(progressId, { status: eu("knowledgeUploadCommitting") });
        await commitEnterpriseKnowledgeUpload("user", zone.id, upload.id);
        this.setUpload(progressId, { status: eu("knowledgeUploadCommitted") });
      } catch (error) {
        this.setUpload(progressId, {
          status: eu("knowledgeUploadError"),
          error: error instanceof Error ? error.message : eu("knowledgeUploadFailed"),
        });
      }
    }
    await this.open(zone);
  }

  private async cancelUpload(uploadId: string): Promise<void> {
    if (!this.selected) {
      return;
    }
    try {
      await cancelEnterpriseKnowledgeUpload("user", this.selected.id, uploadId);
      this.setUpload(uploadId, { status: eu("knowledgeUploadCancelled") });
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("knowledgeUploadCancelFailed");
    }
  }

  private async search(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected || !this.candidate || this.zoneRole === "viewer") {
      return;
    }
    const query = String(new FormData(event.currentTarget as HTMLFormElement).get("query") ?? "");
    const zone = this.selected;
    const candidateId = this.candidate.id;
    this.hits = [];
    this.busy = true;
    this.error = "";
    try {
      const result = await searchEnterpriseKnowledgeCandidate("user", zone.id, query);
      if (this.selected?.id !== zone.id || this.candidate?.id !== candidateId) {
        return;
      }
      if (result.candidate.id !== candidateId) {
        await this.open(zone, true);
      }
      if (this.selected?.id === zone.id && this.candidate?.id === result.candidate.id) {
        this.hits = result.hits;
      }
    } catch (error) {
      if (this.selected?.id === zone.id && this.candidate?.id === candidateId) {
        this.error = error instanceof Error ? error.message : eu("knowledgeCandidateSearchFailed");
      }
    } finally {
      this.busy = false;
    }
  }

  private async publish(): Promise<void> {
    if (!this.selected || !this.candidate || this.zoneRole !== "manager") {
      return;
    }
    const reason =
      this.candidate.vectorStatus === "ready"
        ? undefined
        : showNativePrompt(eu("knowledgeCandidatePublishReason"))?.trim();
    if (this.candidate.vectorStatus !== "ready" && !reason) {
      return;
    }
    this.busy = true;
    try {
      await publishEnterpriseKnowledgeCandidate("user", this.selected.id, {
        baseRevision: this.selected.revision,
        generationId: this.candidate.id,
        degradedReason: reason,
      });
      await this.open(this.selected);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("knowledgeCandidatePublishFailed");
    } finally {
      this.busy = false;
    }
  }

  private async rollback(publication: EnterpriseKnowledgePublication): Promise<void> {
    if (
      !this.selected ||
      this.zoneRole !== "manager" ||
      publication.id === this.selected.activePublicationId
    ) {
      return;
    }
    if (
      !showNativeConfirm(
        eu("knowledgeRollbackConfirm", { number: String(publication.publicationNumber) }),
      )
    ) {
      return;
    }
    this.busy = true;
    try {
      await rollbackEnterpriseKnowledgePublication("user", this.selected.id, {
        baseRevision: this.selected.revision,
        publicationId: publication.id,
      });
      await this.open(this.selected);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("knowledgeRollbackFailed");
    } finally {
      this.busy = false;
    }
  }

  private async saveMembers(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selected || this.zoneRole !== "manager") {
      return;
    }
    const lines = String(new FormData(event.currentTarget as HTMLFormElement).get("members") ?? "");
    const members = lines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [accountId = "", role = "viewer"] = line.split(",").map((value) => value.trim());
        return { accountId, role: role as EnterpriseKnowledgeZoneRole };
      });
    this.busy = true;
    try {
      await replaceEnterpriseKnowledgeMembers(
        "user",
        this.selected.id,
        this.selected.revision,
        members,
      );
      await this.open(this.selected);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("knowledgeMembersSaveFailed");
    } finally {
      this.busy = false;
    }
  }

  private async runJobAction(job: EnterpriseKnowledgeJob, action: "cancel" | "retry") {
    if (!this.selected || this.zoneRole === "viewer") {
      return;
    }
    this.busy = true;
    try {
      if (action === "cancel") {
        await cancelEnterpriseKnowledgeJob("user", this.selected.id, job.id);
      } else {
        await retryEnterpriseKnowledgeJob("user", this.selected.id, job.id);
      }
      await this.open(this.selected);
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("knowledgeJobUpdateFailed");
    } finally {
      this.busy = false;
    }
  }

  private renderCurator() {
    if (this.zoneRole === "viewer") {
      return nothing;
    }
    return html`<section class="eu-knowledge-ingest">
      <form class="card eu-stack" @submit=${(event: SubmitEvent) => void this.addNote(event)}>
        <h3>${eu("knowledgeNote")}</h3>
        <label>${eu("knowledgeTitle")}<input class="input" name="title" required /></label
        ><label
          >${eu("knowledgeContent")}<textarea
            class="input"
            name="content"
            rows="5"
            required
          ></textarea></label
        ><button class="btn primary" ?disabled=${this.busy}>${eu("knowledgeAddNote")}</button>
      </form>
      <form class="card eu-stack" @submit=${(event: SubmitEvent) => void this.addUrl(event)}>
        <h3>${eu("knowledgeUrl")}</h3>
        <label>${eu("knowledgeTitle")}<input class="input" name="title" required /></label
        ><label>${eu("knowledgeUrl")}<input class="input" name="url" type="url" required /></label
        ><label
          ><input type="checkbox" name="crawlSameOrigin" /> ${eu("knowledgeCrawlSameOrigin")}</label
        ><button class="btn primary" ?disabled=${this.busy}>${eu("knowledgeAddUrl")}</button>
      </form>
      <section class="card eu-stack">
        <h3>${eu("knowledgeFile")}</h3>
        <p class="eu-muted">${eu("knowledgeFileLimits")}</p>
        <input
          type="file"
          multiple
          aria-label=${eu("knowledgeChooseFiles")}
          @change=${(event: Event) =>
            void this.upload((event.currentTarget as HTMLInputElement).files)}
        />${this.uploads.map(
          (item) =>
            html`<div class="eu-upload" aria-live="polite">
              <span>${item.name} · ${item.status}</span
              ><progress max=${item.max} value=${item.value}></progress>${!item.id.startsWith(
                "local:",
              ) &&
              ![
                eu("knowledgeUploadCommitted"),
                eu("knowledgeUploadCancelled"),
                eu("knowledgeUploadExpired"),
              ].includes(item.status)
                ? html`<button
                    class="btn"
                    type="button"
                    @click=${() => void this.cancelUpload(item.id)}
                  >
                    ${eu("knowledgeCancel")}
                  </button>`
                : nothing}${item.error
                ? html`<span class="callout danger">${item.error}</span>`
                : nothing}
            </div>`,
        )}
      </section>
    </section>`;
  }

  override render() {
    return html`<section class="eu-knowledge-page">
      <header class="eu-page-header">
        <div>
          <h1>${eu("knowledgeEnterprise")}</h1>
          <p>${eu("knowledgeDescription")}</p>
        </div>
      </header>
      ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
      ${this.loading
        ? html`<div class="loading-state" role="status">${eu("loading")}</div>`
        : html`<div class="eu-knowledge-layout">
            <aside class="card eu-zone-list" aria-label=${eu("knowledgeZoneLabel")}>
              ${this.zones.map(
                (zone) =>
                  html`<button
                    class=${this.selected?.id === zone.id ? "active" : ""}
                    @click=${() => void this.open(zone)}
                  >
                    <strong>${zone.name}</strong
                    ><span>${zone.slug} · ${euKnowledgeValue(zone.role) || eu("unknown")}</span>
                  </button>`,
              )}
            </aside>
            <main class="eu-stack">
              ${this.selected
                ? html`<section class="card eu-knowledge-summary">
                      <div>
                        <h2>${this.selected.name}</h2>
                        <p class="eu-muted">
                          ${this.selected.description || eu("knowledgeNoDescription")}
                        </p>
                      </div>
                      <span class="badge">${euKnowledgeValue(this.zoneRole)}</span
                      ><span class="badge"
                        >${this.selected.activePublicationId
                          ? eu("knowledgePublished")
                          : eu("knowledgeNotPublished")}</span
                      >
                    </section>
                    <nav class="eu-knowledge-tabs" aria-label=${eu("knowledgeContents")}>
                      <button
                        class=${this.view === "sources" ? "active" : ""}
                        type="button"
                        aria-current=${this.view === "sources" ? "page" : "false"}
                        @click=${() => (this.view = "sources")}
                      >
                        ${eu("knowledgeSources")}
                      </button>
                      <button
                        class=${this.view === "graph" ? "active" : ""}
                        type="button"
                        aria-current=${this.view === "graph" ? "page" : "false"}
                        @click=${() => (this.view = "graph")}
                      >
                        ${eu("knowledgeGraph")}
                      </button>
                    </nav>
                    ${this.view === "graph"
                      ? html`<openclaw-knowledge-graph-view
                          audience="user"
                          .zoneId=${this.selected.id}
                          .zoneName=${this.selected.name}
                          .role=${this.zoneRole}
                          .zoneRevision=${this.selected.revision}
                          .snapshotRevision=${this.selected.buildRevision}
                          .hasCandidate=${Boolean(this.candidate)}
                          .hasActivePublication=${Boolean(this.selected.activePublicationId)}
                          @knowledge-source-open=${() => (this.view = "sources")}
                        ></openclaw-knowledge-graph-view>`
                      : html`${this.renderCurator()}
                          <section class="card">
                            <h3>${eu("knowledgeSources")}</h3>
                            <div class="eu-source-list">
                              ${this.sources.map(
                                (source) =>
                                  html`<article>
                                    <strong>${source.title}</strong
                                    ><span
                                      >${euKnowledgeValue(source.kind)} · ${eu("knowledgeVersion")}
                                      ${source.currentVersionNumber} ·
                                      ${euKnowledgeValue(source.status)}</span
                                    >
                                  </article>`,
                              )}
                            </div>
                          </section>
                          ${this.zoneRole !== "viewer"
                            ? html`<section class="card eu-stack">
                                <div class="eu-actions">
                                  <h3>${eu("knowledgePreviewSearch")}</h3>
                                  ${this.zoneRole === "manager"
                                    ? html`<button
                                        class="btn"
                                        ?disabled=${!this.candidate || this.busy}
                                        @click=${() => void this.publish()}
                                      >
                                        ${eu("knowledgeCandidatePublish")}
                                      </button>`
                                    : nothing}
                                </div>
                                <form
                                  class="eu-actions"
                                  @submit=${(event: SubmitEvent) => void this.search(event)}
                                >
                                  <input
                                    class="input"
                                    name="query"
                                    placeholder=${eu("knowledgeSearchPlaceholder")}
                                    required
                                  /><button
                                    class="btn primary"
                                    ?disabled=${!this.candidate || this.busy}
                                  >
                                    ${eu("knowledgeSearch")}
                                  </button>
                                </form>
                                ${this.candidate
                                  ? html`<p class="eu-muted">
                                      ${eu("knowledgeFts")}
                                      ${euKnowledgeValue(this.candidate.lexicalStatus)} ·
                                      ${eu("knowledgeVector")}
                                      ${euKnowledgeValue(this.candidate.vectorStatus)}
                                    </p>`
                                  : html`<p class="eu-muted">
                                      ${eu("knowledgeCandidateNone")}
                                    </p>`}${this.hits.map(
                                  (hit) =>
                                    html`<article class="eu-hit">
                                      <strong
                                        >${String(
                                          (hit.citation as Record<string, unknown> | undefined)
                                            ?.sourceTitle ?? eu("knowledgeSourceFallback"),
                                        )}</strong
                                      >
                                      <p>${String(hit.excerpt ?? "")}</p>
                                    </article>`,
                                )}
                              </section>`
                            : nothing}${this.zoneRole === "manager"
                            ? html`<section class="card eu-stack">
                                <h3>${eu("knowledgePublicationHistory")}</h3>
                                ${this.publications.map(
                                  (publication) => html`<div class="eu-actions">
                                    <span>
                                      <strong>#${publication.publicationNumber}</strong> ·
                                      ${publication.sourceCount} ${eu("knowledgeSourcesCount")} ·
                                      ${eu("knowledgeVector")}
                                      ${euKnowledgeValue(publication.vectorStatus)}
                                    </span>
                                    <button
                                      class="btn"
                                      type="button"
                                      ?disabled=${this.busy ||
                                      publication.id === this.selected?.activePublicationId}
                                      @click=${() => void this.rollback(publication)}
                                    >
                                      ${publication.id === this.selected?.activePublicationId
                                        ? eu("knowledgePublished")
                                        : eu("knowledgeRollback")}
                                    </button>
                                  </div>`,
                                )}
                              </section>`
                            : nothing}${this.zoneRole === "manager"
                            ? html`<form
                                class="card eu-stack"
                                @submit=${(event: SubmitEvent) => void this.saveMembers(event)}
                              >
                                <h3>${eu("knowledgeViewerCurator")}</h3>
                                <p class="eu-muted">${eu("knowledgeMemberHelp")}</p>
                                <textarea
                                  class="input"
                                  name="members"
                                  rows="8"
                                  .value=${this.members
                                    .filter((item) => item.role !== "manager")
                                    .map((item) => `${item.accountId},${item.role}`)
                                    .join("\n")}
                                ></textarea
                                ><button class="btn primary" ?disabled=${this.busy}>
                                  ${eu("knowledgeMembersSave")}
                                </button>
                              </form>`
                            : nothing}
                          <section class="card">
                            <h3>${eu("knowledgeProgress")}</h3>
                            ${this.jobs
                              .slice(0, 20)
                              .map(
                                (job) =>
                                  html`<p class="eu-actions">
                                    <strong>${euKnowledgeValue(job.kind)}</strong> ·
                                    ${euKnowledgeValue(job.stage)} ·
                                    ${euKnowledgeValue(job.status)}${job.safeErrorCode
                                      ? ` · ${job.safeErrorCode}`
                                      : ""}
                                    ${["queued", "running", "retry_wait"].includes(job.status)
                                      ? html`<button
                                          class="btn"
                                          ?disabled=${this.busy}
                                          @click=${() => void this.runJobAction(job, "cancel")}
                                        >
                                          ${eu("knowledgeCancel")}
                                        </button>`
                                      : ["failed", "cancelled"].includes(job.status)
                                        ? html`<button
                                            class="btn"
                                            ?disabled=${this.busy}
                                            @click=${() => void this.runJobAction(job, "retry")}
                                          >
                                            ${eu("retry")}
                                          </button>`
                                        : nothing}
                                    ${this.jobSteps[job.id]?.length
                                      ? html`<span class="eu-knowledge-job-steps">
                                          ${this.jobSteps[job.id]!.map(
                                            (step) => html`<small>
                                              ${euKnowledgeValue(step.stage)}:
                                              ${euKnowledgeValue(step.status)}${step.progressTotal
                                                ? ` (${step.progressCurrent ?? 0}/${step.progressTotal})`
                                                : ""}${step.degradedReason
                                                ? ` · ${step.degradedReason}`
                                                : ""}
                                            </small>`,
                                          )}
                                        </span>`
                                      : nothing}
                                  </p>`,
                              )}
                          </section>`}`
                : html`<div class="empty-state">${eu("knowledgeSelectZone")}</div>`}
            </main>
          </div>`}
    </section>`;
  }
}

if (!customElements.get("openclaw-user-knowledge-page")) {
  customElements.define("openclaw-user-knowledge-page", UserKnowledgePage);
}
