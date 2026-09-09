import { html, nothing, type TemplateResult } from "lit";
import { icons } from "../../../components/icons.ts";
import { kak } from "../../../i18n/enterprise-admin-knowledge.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import {
  enterpriseKnowledgeVersionDownloadUrl,
  type EnterpriseKnowledgeJob,
  type EnterpriseKnowledgeSource,
  type EnterpriseKnowledgeVersion,
} from "../../enterprise/services/enterprise-knowledge-api.ts";
import { formatDate, navigateAdmin } from "../utils.ts";
import { renderKnowledgeZoneEditorFields } from "./knowledge-access-views.ts";
import { EnterpriseAdminKnowledgeController } from "./knowledge-page-controller.ts";
import { draftFromKnowledgeZone } from "./knowledge-page-model.ts";
import {
  formatKnowledgeBytes,
  inputFromEvent,
  knowledgeCapabilityStatusLabel,
  knowledgeGraphStatusLabel,
  knowledgeIntegrityLabel,
  knowledgeProcessingLabel,
  knowledgeSourceKindLabel,
  knowledgeStatusClass,
  knowledgeUploadStateLabel,
} from "./knowledge-page-view-helpers.ts";

export class EnterpriseAdminKnowledgeContentPage extends EnterpriseAdminKnowledgeController {
  protected openModelSetup(): void {
    this.closeCreateDrawer();
    this.closeZone();
    navigateAdmin("/config/models/setup");
  }

  protected renderOverview(): TemplateResult | typeof nothing {
    if (!this.selected) {
      return nothing;
    }
    const activeJobs = this.jobs.filter((job) =>
      ["queued", "running", "retry_wait"].includes(job.status),
    ).length;
    const ocrBlocked =
      this.readiness?.ocr.transport === "remote" && this.selected.egressPolicy === "local_only";
    return html`
      <div class="ea-kpis knowledge-detail-kpis">
        <article class="ea-kpi">
          <span>${ea("Nguồn")}</span><strong>${this.sources.length}</strong
          ><small>${kak("overviewManaged")}</small>
        </article>
        <article class="ea-kpi">
          <span>${kak("overviewRunningJobs")}</span><strong>${activeJobs}</strong
          ><small>${kak("overviewRecentJobs", { count: String(this.jobs.length) })}</small>
        </article>
        <article class="ea-kpi">
          <span>${kak("overviewAgentAccess")}</span><strong>${this.bindings.length}</strong
          ><small
            >${kak("overviewAccessRevision", {
              revision: String(this.selected.accessRevision),
            })}</small
          >
        </article>
        <article class="ea-kpi">
          <span>${kak("overviewMembers")}</span><strong>${this.members.length}</strong
          ><small>${kak("overviewMemberRoles")}</small>
        </article>
      </div>
      <div class="knowledge-overview-grid">
        <section class="ea-card knowledge-panel">
          <div class="knowledge-section-heading">
            <div><h3>${kak("publicationStatus")}</h3></div>
            <p>${kak("publicationStatusDescription")}</p>
          </div>
          <div class="knowledge-lifecycle">
            <span class="is-complete">${ea("Nguồn")}</span
            ><span class=${this.candidate ? "is-complete" : ""}>${kak("candidate")}</span
            ><span class=${this.selected.activePublicationId ? "is-complete" : ""}
              >${ea("Đã publish")}</span
            >
          </div>
          <dl class="knowledge-facts">
            <div>
              <dt>${kak("sourceSetRevision")}</dt>
              <dd>${this.selected.sourceSetRevision}</dd>
            </div>
            <div>
              <dt>${kak("candidate")}</dt>
              <dd>
                ${this.candidate
                  ? `${knowledgeIntegrityLabel(this.candidate.integrityStatus)} · ${kak("graphLabel")} ${knowledgeGraphStatusLabel(this.candidate.graphStatus)}`
                  : kak("noCandidate")}
              </dd>
            </div>
            <div>
              <dt>${kak("aiEnrichment")}</dt>
              <dd>
                ${this.candidate
                  ? `${kak("artifactVersion", { version: String(this.candidate.artifactSchemaVersion) })} · ${
                      this.candidate.aiAnalysisStatus === "ready"
                        ? kak("analyzed")
                        : this.candidate.aiAnalysisStatus === "degraded"
                          ? `${kak("degraded")}${this.candidate.degradationReasons[0] ? ` · ${this.candidate.degradationReasons[0]}` : ""}`
                          : kak("notRun")
                    }`
                  : kak("noCandidateYet")}
              </dd>
            </div>
            <div>
              <dt>${kak("publication")}</dt>
              <dd>${this.selected.activePublicationId ? kak("active") : kak("overviewDraft")}</dd>
            </div>
          </dl>
          <div class="knowledge-card-actions">
            <button class="ea-button" type="button" @click=${() => (this.tab = "sources")}>
              ${kak("manageSources")}
            </button>
            <button class="ea-button" type="button" @click=${() => (this.tab = "graph")}>
              ${kak("openGraph")}
            </button>
            <button
              class="ea-button ea-button--primary"
              type="button"
              @click=${() => (this.tab = "search")}
            >
              ${kak("testAndPublish")}
            </button>
          </div>
        </section>
        <section class="ea-card knowledge-panel">
          <div class="knowledge-section-heading">
            <div><h3>${kak("processingCapability")}</h3></div>
            <p>${kak("readinessDescription")}</p>
          </div>
          <dl class="knowledge-readiness-list">
            <div>
              <dt>${kak("worker")}</dt>
              <dd>
                <span
                  class="ea-badge ${knowledgeStatusClass(
                    this.readiness?.worker.ready ? "ready" : "failed",
                  )}"
                  >${this.readiness?.worker.ready ? kak("ready") : kak("notReady")}</span
                >
              </dd>
            </div>
            <div>
              <dt>${kak("fullTextSearch")}</dt>
              <dd>
                <span
                  class="ea-badge ${knowledgeStatusClass(
                    this.readiness?.lexical.ready ? "ready" : "failed",
                  )}"
                  >${this.readiness?.lexical.backend ?? kak("providerNotConfigured")}</span
                >
              </dd>
            </div>
            <div>
              <dt>${kak("vector")}</dt>
              <dd>
                <span
                  class="ea-badge ${knowledgeStatusClass(
                    this.readiness?.vector.status ?? "unknown",
                  )}"
                  >${knowledgeCapabilityStatusLabel(
                    this.readiness?.vector.status ?? "unknown",
                  )}</span
                >
              </dd>
            </div>
            <div>
              <dt>${kak("automaticOcr")}</dt>
              <dd>
                <span
                  class="ea-badge ${ocrBlocked || !this.readiness?.ocr.ready
                    ? "ea-badge--warn"
                    : "ea-badge--good"}"
                  >${ocrBlocked
                    ? kak("policyBlocked")
                    : this.readiness?.ocr.ready
                      ? kak("ready")
                      : kak("providerNotConfigured")}</span
                >
              </dd>
            </div>
            <div>
              <dt>${kak("graphAiAnalysis")}</dt>
              <dd>
                <span
                  class="ea-badge ${this.readiness?.graph.enrichmentReady
                    ? "ea-badge--good"
                    : "ea-badge--warn"}"
                  >${this.readiness?.graph.aiAnalysis === "off"
                    ? kak("aiOff")
                    : this.readiness?.graph.enrichmentReady
                      ? kak("readyWithValue", { value: this.readiness.graph.aiAnalysis })
                      : kak("providerNotReady")}</span
                >
              </dd>
            </div>
          </dl>
          <p class="ea-muted">
            ${kak("ocrProvider", {
              provider: this.readiness?.ocr.provider ?? kak("providerNotConfigured"),
            })}
            ·
            ${kak("aiGraphProvider", {
              provider: this.readiness?.graph.enrichmentProvider ?? kak("providerNotConfigured"),
            })}
          </p>
          <div class="knowledge-card-actions">
            <button class="ea-button" type="button" @click=${() => (this.tab = "settings")}>
              ${kak("editPolicy")}
            </button>
            <button class="ea-button" type="button" @click=${() => this.openModelSetup()}>
              ${kak("configureOcr")}
            </button>
          </div>
        </section>
      </div>
    `;
  }

  protected renderSettings(): TemplateResult | typeof nothing {
    if (!this.selected) {
      return nothing;
    }
    const draft =
      this.settingsDraft.slug === this.selected.slug
        ? this.settingsDraft
        : draftFromKnowledgeZone(this.selected, this.graphSettings);
    return html`<form
      class="knowledge-zone-editor"
      @submit=${(event: SubmitEvent) => void this.saveZoneSettings(event)}
    >
      ${renderKnowledgeZoneEditorFields({
        draft,
        errors: this.settingsErrors,
        creating: false,
        readiness: this.readiness,
        disabled: this.busy,
        onName: (name) => this.updateSettingsDraft({ name }),
        onSlug: () => undefined,
        onDescription: (description) => this.updateSettingsDraft({ description }),
        onEgressPolicy: (egressPolicy) => this.updateSettingsDraft({ egressPolicy }),
        onGraphEnabled: (graphEnabled) => this.updateSettingsDraft({ graphEnabled }),
        onGraphEnrichmentEnabled: (graphEnrichmentEnabled) =>
          this.updateSettingsDraft({ graphEnrichmentEnabled }),
        onGraphAutoApprovalThreshold: (graphAutoApprovalThreshold) =>
          this.updateSettingsDraft({ graphAutoApprovalThreshold }),
        onOpenModelSetup: () => this.openModelSetup(),
      })}
      <div class="knowledge-form-footer">
        <span class="ea-muted"
          >${kak("revisionGuard", { revision: String(this.selected.revision) })}</span
        >
        <button class="ea-button ea-button--primary" ?disabled=${this.busy}>
          ${ea("Lưu thay đổi")}
        </button>
      </div>
      <section class="knowledge-danger-zone">
        <div>
          <strong>${kak("zoneLifecycle")}</strong>
          <p>
            ${this.selected.status === "archived"
              ? kak("archivedDescription")
              : kak("activeDescription")}
          </p>
        </div>
        <button
          class="ea-button ${this.selected.status === "archived" ? "" : "ea-button--danger"}"
          type="button"
          ?disabled=${this.busy}
          @click=${() => void this.toggleArchive()}
        >
          ${this.selected.status === "archived" ? kak("restoreZone") : kak("archiveZone")}
        </button>
        ${this.selected.status === "archived"
          ? html`<button
              class="ea-button ea-button--danger"
              type="button"
              ?disabled=${this.busy}
              @click=${() => void this.purgeZone()}
            >
              ${kak("purgePermanent")}
            </button>`
          : nothing}
      </section>
    </form>`;
  }

  protected renderOcrCallout(): TemplateResult {
    const ocr = this.readiness?.ocr;
    const blocked = ocr?.transport === "remote" && this.selected?.egressPolicy === "local_only";
    return html`<section class="ea-card knowledge-ocr-callout">
      <span class="knowledge-feature-icon">${icons.fileText}</span>
      <div>
        <h3>${kak("ocrCalloutTitle")}</h3>
        <p>${kak("ocrCalloutDescription")}</p>
      </div>
      <span class="ea-badge ${ocr?.ready && !blocked ? "ea-badge--good" : "ea-badge--warn"}"
        >${blocked
          ? kak("policyBlocked")
          : ocr?.ready
            ? kak("ready")
            : kak("providerNotConfigured")}</span
      >
      <button
        class="ea-button ea-button--small"
        type="button"
        @click=${() => this.openModelSetup()}
      >
        ${kak("setupOcr")}
      </button>
    </section>`;
  }

  protected renderUploadRows(): TemplateResult | typeof nothing {
    if (!this.uploads.length) {
      return nothing;
    }
    return html`<div class="knowledge-upload-list" aria-live="polite">
      ${this.uploads.map(
        (item) => html`<div class="knowledge-upload-row">
          <div>
            <strong>${item.name}</strong
            ><span
              >${knowledgeUploadStateLabel(item.state)} ·
              ${formatKnowledgeBytes(item.uploaded)}/${formatKnowledgeBytes(item.total)}</span
            >
          </div>
          <progress max=${Math.max(item.total, 1)} value=${item.uploaded}></progress>
          ${!item.id.startsWith("local:") &&
          !["committed", "cancelled", "expired"].includes(item.state)
            ? html`<button
                class="ea-button ea-button--small"
                type="button"
                @click=${() => void this.cancelUpload(item.id)}
              >
                Hủy
              </button>`
            : nothing}
          ${item.error ? html`<span class="ea-error">${item.error}</span>` : nothing}
        </div>`,
      )}
    </div>`;
  }

  protected latestJobFor(source: EnterpriseKnowledgeSource): EnterpriseKnowledgeJob | undefined {
    return this.jobs.find((job) => job.sourceId === source.id);
  }

  protected renderSourceList(): TemplateResult {
    if (!this.sources.length) {
      return html`<div class="ea-empty">${kak("noSources")}</div>`;
    }
    return html`<div class="ea-card ea-table-wrap knowledge-source-table">
      <table class="ea-table">
        <thead>
          <tr>
            <th>${ea("Nguồn")}</th>
            <th>${kak("sourceType")}</th>
            <th>${kak("latestProcessing")}</th>
            <th>${kak("candidate")}</th>
            <th>${kak("updated")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${this.sources.map((source) => {
            const job = this.latestJobFor(source);
            return html`<tr class=${this.selectedSource?.id === source.id ? "is-selected" : ""}>
              <td>
                <button
                  class="ea-link-button"
                  type="button"
                  @click=${() => void this.openSource(source)}
                >
                  <strong>${source.title}</strong>
                </button>
                <div class="ea-muted">v${source.currentVersionNumber}</div>
              </td>
              <td>${knowledgeSourceKindLabel(source.kind)}</td>
              <td>
                <span class="ea-badge ${knowledgeStatusClass(job?.status ?? "queued")}"
                  >${job ? knowledgeProcessingLabel(job.status) : kak("viewDetails")}</span
                >
              </td>
              <td>${source.status === "staged_remove" ? kak("willRemove") : kak("included")}</td>
              <td>${formatDate(source.updatedAt)}</td>
              <td>
                <button
                  class="ea-button ea-button--small"
                  type="button"
                  ?disabled=${this.busy}
                  @click=${() => void this.toggleSourceRemoval(source)}
                >
                  ${source.status === "staged_remove" ? kak("undoRemove") : kak("stageRemove")}
                </button>
              </td>
            </tr>`;
          })}
        </tbody>
      </table>
    </div>`;
  }

  protected renderVersionDetails(version: EnterpriseKnowledgeVersion): TemplateResult {
    const selected = version.id === this.selectedVersion?.id;
    return html`<button
      class="knowledge-version-item ${selected ? "is-selected" : ""}"
      type="button"
      @click=${() => void this.openVersion(version)}
    >
      <span
        ><strong>${kak("version", { number: String(version.versionNumber) })}</strong
        ><small>${formatDate(version.createdAt)}</small></span
      >
      <span class="ea-badge ${knowledgeStatusClass(version.processingStatus)}"
        >${knowledgeProcessingLabel(version.processingStatus)}</span
      >
    </button>`;
  }

  protected renderSourceDetails(): TemplateResult | typeof nothing {
    if (!this.selected || !this.selectedSource) {
      return nothing;
    }
    const source = this.selectedSource;
    const version = this.selectedVersion;
    return html`<section class="ea-card knowledge-source-detail">
      <div class="knowledge-section-heading">
        <div><h3>${source.title}</h3></div>
        <p>
          ${knowledgeSourceKindLabel(source.kind)} ·
          ${kak("draftRevision", { revision: String(source.draftRevision) })}
        </p>
      </div>
      <div class="knowledge-version-layout">
        <aside>
          <h4>${kak("versionHistory")}</h4>
          <div class="knowledge-version-list">
            ${this.versions.map((item) => this.renderVersionDetails(item))}
          </div>
        </aside>
        <div class="knowledge-version-preview">
          ${version
            ? html`<div class="knowledge-version-heading">
                  <div>
                    <strong>${kak("version", { number: String(version.versionNumber) })}</strong
                    ><span
                      >${version.mimeType} · ${formatKnowledgeBytes(version.byteSize)} ·
                      ${kak("segmentCount", { count: String(version.segmentCount ?? 0) })}</span
                    >
                  </div>
                  <div class="knowledge-version-actions">
                    <button
                      class="ea-button ea-button--small"
                      type="button"
                      ?disabled=${this.busy}
                      @click=${() => void this.reprocessVersionWithAiGraphV3()}
                    >
                      ${kak("reprocessAiGraph")}
                    </button>
                    <a
                      class="ea-button ea-button--small"
                      href=${enterpriseKnowledgeVersionDownloadUrl(
                        "admin",
                        this.selected.id,
                        version.id,
                      )}
                      download
                      >${kak("downloadOriginal")}</a
                    >
                  </div>
                </div>
                ${version.safeErrorCode
                  ? html`<div class="ea-banner ea-banner--error">${version.safeErrorCode}</div>`
                  : nothing}
                ${this.versionPreviewLoading
                  ? html`<div class="ea-loading">${kak("loadingPreview")}</div>`
                  : this.versionPreview
                    ? html`<div class="knowledge-provenance">
                          <span
                            class="ea-badge ${this.versionPreview.ocrProvenance
                              ? "ea-badge--good"
                              : ""}"
                            >${this.versionPreview.ocrProvenance
                              ? kak("ocrDone")
                              : version.mimeType.includes("wordprocessingml")
                                ? kak("docxParsed")
                                : kak("nativeParsed")}</span
                          >
                          <span class="ea-muted"
                            >${this.versionPreview.truncated
                              ? kak("previewTruncated")
                              : kak("fullSegments")}
                            · Artifact V${this.versionPreview.artifactSchemaVersion}
                            ${this.versionPreview.structuralBlocks
                              ? `· ${kak("structuralBlocks", { count: String(this.versionPreview.structuralBlocks.length) })}`
                              : ""}</span
                          >
                        </div>
                        <div class="knowledge-segments">
                          ${this.versionPreview.segments.map(
                            (segment) =>
                              html`<article>
                                <small
                                  >#${segment.ordinal} · ${JSON.stringify(segment.locator)}</small
                                >
                                <p>${segment.text}</p>
                              </article>`,
                          )}
                        </div>`
                    : html`<div class="ea-empty knowledge-empty-small">
                        ${kak("previewAfterProcessing")}
                      </div>`} `
            : html`<div class="ea-empty">${kak("selectVersion")}</div>`}
        </div>
      </div>
      ${source.kind === "file"
        ? html`<div class="knowledge-revision-form">
            <strong>${kak("replaceDocument")}</strong
            ><input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.docx,.xlsx,.pptx,.txt,.md,.html"
              aria-label=${kak("chooseNewFileVersion")}
              @change=${(event: Event) =>
                void this.uploadFiles(inputFromEvent(event)?.files ?? null, source)}
            />
          </div>`
        : html`<form
            class="knowledge-revision-form"
            @submit=${(event: SubmitEvent) => void this.createSourceVersion(event)}
          >
            <strong>${kak("createDraftVersion")}</strong>${source.kind === "note"
              ? html`<textarea
                  class="ea-textarea"
                  name="content"
                  rows="4"
                  required
                  placeholder=${kak("newContent")}
                ></textarea>`
              : html`<input
                    class="ea-input"
                    name="url"
                    type="url"
                    .value=${source.canonicalUrl ?? ""}
                    required
                  /><label class="ea-check"
                    ><input type="checkbox" name="crawlSameOrigin" /> ${kak(
                      "crawlSameOrigin",
                    )}</label
                  >`}<button class="ea-button" ?disabled=${this.busy}>
              ${kak("createVersion")}
            </button>
          </form>`}
    </section>`;
  }

  protected renderSources(): TemplateResult {
    return html`
      ${this.renderOcrCallout()}
      <div class="knowledge-ingest-grid">
        <form
          class="ea-card ea-form knowledge-form"
          @submit=${(event: SubmitEvent) => void this.createNote(event)}
        >
          <span class="knowledge-feature-icon">${icons.fileText}</span>
          <h3>${kak("internalNote")}</h3>
          <p>${kak("internalNoteDescription")}</p>
          <label class="ea-field"
            >${kak("title")}<input class="ea-input" name="title" required /></label
          ><label class="ea-field"
            >${kak("content")}<textarea
              class="ea-textarea"
              name="content"
              rows="5"
              required
            ></textarea></label
          ><button class="ea-button ea-button--primary" ?disabled=${this.busy}>
            ${kak("addNote")}
          </button>
        </form>
        <form
          class="ea-card ea-form knowledge-form"
          @submit=${(event: SubmitEvent) => void this.createUrl(event)}
        >
          <span class="knowledge-feature-icon">${icons.search}</span>
          <h3>${kak("websiteUrl")}</h3>
          <p>${kak("websiteDescription")}</p>
          <label class="ea-field"
            >${kak("title")}<input class="ea-input" name="title" required /></label
          ><label class="ea-field"
            >URL<input class="ea-input" name="url" type="url" required /></label
          ><label class="ea-check"
            ><input type="checkbox" name="crawlSameOrigin" /> ${kak("crawlSameOrigin")}</label
          ><button class="ea-button ea-button--primary" ?disabled=${this.busy}>
            ${kak("addUrl")}
          </button>
        </form>
        <section class="ea-card knowledge-form">
          <span class="knowledge-feature-icon">${icons.file}</span>
          <h3>${kak("documentsOcr")}</h3>
          <p>${kak("documentsDescription")}</p>
          <label class="knowledge-file-drop"
            ><input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.docx,.xlsx,.pptx,.txt,.md,.html"
              @change=${(event: Event) =>
                void this.uploadFiles(inputFromEvent(event)?.files ?? null)}
            /><strong>${kak("chooseDocuments")}</strong><span>${kak("orDropHere")}</span></label
          >${this.renderUploadRows()}
        </section>
      </div>
      ${this.renderSourceList()} ${this.renderSourceDetails()}
    `;
  }
}
