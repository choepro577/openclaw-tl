import { html, nothing, type TemplateResult } from "lit";
import { icons } from "../../../components/icons.ts";
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
          <span>Nguồn</span><strong>${this.sources.length}</strong><small>Đang quản lý</small>
        </article>
        <article class="ea-kpi">
          <span>Job đang chạy</span><strong>${activeJobs}</strong
          ><small>${this.jobs.length} job gần đây</small>
        </article>
        <article class="ea-kpi">
          <span>Agent truy cập</span><strong>${this.bindings.length}</strong
          ><small>Access rev. ${this.selected.accessRevision}</small>
        </article>
        <article class="ea-kpi">
          <span>Thành viên</span><strong>${this.members.length}</strong
          ><small>Quản lý / Biên tập / Chỉ xem</small>
        </article>
      </div>
      <div class="knowledge-overview-grid">
        <section class="ea-card knowledge-panel">
          <div class="knowledge-section-heading">
            <div><h3>Trạng thái xuất bản</h3></div>
            <p>Agent chỉ truy xuất publication đang active.</p>
          </div>
          <div class="knowledge-lifecycle">
            <span class="is-complete">Nguồn</span
            ><span class=${this.candidate ? "is-complete" : ""}>Candidate</span
            ><span class=${this.selected.activePublicationId ? "is-complete" : ""}>Đã publish</span>
          </div>
          <dl class="knowledge-facts">
            <div>
              <dt>Phiên bản tập nguồn</dt>
              <dd>${this.selected.sourceSetRevision}</dd>
            </div>
            <div>
              <dt>Candidate</dt>
              <dd>
                ${this.candidate
                  ? `${knowledgeIntegrityLabel(this.candidate.integrityStatus)} · Graph ${knowledgeGraphStatusLabel(this.candidate.graphStatus)}`
                  : "Chưa tạo"}
              </dd>
            </div>
            <div>
              <dt>AI Graph</dt>
              <dd>
                ${this.candidate
                  ? `Artifact V${this.candidate.artifactSchemaVersion} · ${
                      this.candidate.aiAnalysisStatus === "ready"
                        ? "Đã phân tích"
                        : this.candidate.aiAnalysisStatus === "degraded"
                          ? `Degraded${this.candidate.degradationReasons[0] ? ` · ${this.candidate.degradationReasons[0]}` : ""}`
                          : "Chưa chạy"
                    }`
                  : "Chưa có candidate"}
              </dd>
            </div>
            <div>
              <dt>Publication</dt>
              <dd>${this.selected.activePublicationId ? "Đang hoạt động" : "Bản nháp"}</dd>
            </div>
          </dl>
          <div class="knowledge-card-actions">
            <button class="ea-button" type="button" @click=${() => (this.tab = "sources")}>
              Quản lý nguồn
            </button>
            <button class="ea-button" type="button" @click=${() => (this.tab = "graph")}>
              Mở bản đồ
            </button>
            <button
              class="ea-button ea-button--primary"
              type="button"
              @click=${() => (this.tab = "search")}
            >
              Kiểm thử & publish
            </button>
          </div>
        </section>
        <section class="ea-card knowledge-panel">
          <div class="knowledge-section-heading">
            <div><h3>Khả năng xử lý</h3></div>
            <p>Readiness thực tế của worker và index.</p>
          </div>
          <dl class="knowledge-readiness-list">
            <div>
              <dt>Worker</dt>
              <dd>
                <span
                  class="ea-badge ${knowledgeStatusClass(
                    this.readiness?.worker.ready ? "ready" : "failed",
                  )}"
                  >${this.readiness?.worker.ready ? "Sẵn sàng" : "Chưa sẵn sàng"}</span
                >
              </dd>
            </div>
            <div>
              <dt>Tìm kiếm toàn văn</dt>
              <dd>
                <span
                  class="ea-badge ${knowledgeStatusClass(
                    this.readiness?.lexical.ready ? "ready" : "failed",
                  )}"
                  >${this.readiness?.lexical.backend ?? "Chưa cấu hình"}</span
                >
              </dd>
            </div>
            <div>
              <dt>Vector</dt>
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
              <dt>OCR tự động</dt>
              <dd>
                <span
                  class="ea-badge ${ocrBlocked || !this.readiness?.ocr.ready
                    ? "ea-badge--warn"
                    : "ea-badge--good"}"
                  >${ocrBlocked
                    ? "Bị policy chặn"
                    : this.readiness?.ocr.ready
                      ? "Sẵn sàng"
                      : "Chưa cấu hình"}</span
                >
              </dd>
            </div>
            <div>
              <dt>AI phân tích graph</dt>
              <dd>
                <span
                  class="ea-badge ${this.readiness?.graph.enrichmentReady
                    ? "ea-badge--good"
                    : "ea-badge--warn"}"
                  >${this.readiness?.graph.aiAnalysis === "off"
                    ? "Đang tắt"
                    : this.readiness?.graph.enrichmentReady
                      ? `Sẵn sàng · ${this.readiness.graph.aiAnalysis}`
                      : "Provider chưa sẵn sàng"}</span
                >
              </dd>
            </div>
          </dl>
          <p class="ea-muted">
            OCR: ${this.readiness?.ocr.provider ?? "chưa cấu hình"} · AI Graph:
            ${this.readiness?.graph.enrichmentProvider ?? "chưa cấu hình"}
          </p>
          <div class="knowledge-card-actions">
            <button class="ea-button" type="button" @click=${() => (this.tab = "settings")}>
              Sửa policy
            </button>
            <button class="ea-button" type="button" @click=${() => this.openModelSetup()}>
              Cấu hình OCR
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
          >Revision ${this.selected.revision}; hệ thống từ chối ghi đè nếu dữ liệu đã đổi.</span
        >
        <button class="ea-button ea-button--primary" ?disabled=${this.busy}>Lưu thay đổi</button>
      </div>
      <section class="knowledge-danger-zone">
        <div>
          <strong>Vòng đời zone</strong>
          <p>
            ${this.selected.status === "archived"
              ? "Zone đã archive; có thể restore hoặc purge vĩnh viễn."
              : "Archive sẽ ngừng cho phép cập nhật và xuất bản mới."}
          </p>
        </div>
        <button
          class="ea-button ${this.selected.status === "archived" ? "" : "ea-button--danger"}"
          type="button"
          ?disabled=${this.busy}
          @click=${() => void this.toggleArchive()}
        >
          ${this.selected.status === "archived" ? "Restore zone" : "Archive zone"}
        </button>
        ${this.selected.status === "archived"
          ? html`<button
              class="ea-button ea-button--danger"
              type="button"
              ?disabled=${this.busy}
              @click=${() => void this.purgeZone()}
            >
              Purge vĩnh viễn
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
        <h3>OCR tài liệu tự động</h3>
        <p>
          PDF scan và ảnh sẽ được nhận dạng, chia segment và lưu provenance để quản trị viên kiểm
          tra trước khi publish.
        </p>
      </div>
      <span class="ea-badge ${ocr?.ready && !blocked ? "ea-badge--good" : "ea-badge--warn"}"
        >${blocked ? "Bị policy chặn" : ocr?.ready ? "Sẵn sàng" : "Chưa cấu hình"}</span
      >
      <button
        class="ea-button ea-button--small"
        type="button"
        @click=${() => this.openModelSetup()}
      >
        Thiết lập OCR
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
              >${item.state} ·
              ${formatKnowledgeBytes(item.uploaded)}/${formatKnowledgeBytes(item.total)}</span
            >
          </div>
          <progress max=${Math.max(item.total, 1)} value=${item.uploaded}></progress>
          ${!item.id.startsWith("local:") &&
          !["Đã nạp", "Đã hủy", "Đã hết hạn"].includes(item.state)
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
      return html`<div class="ea-empty">
        Chưa có nguồn. Nạp ghi chú, URL hoặc tài liệu để bắt đầu.
      </div>`;
    }
    return html`<div class="ea-card ea-table-wrap knowledge-source-table">
      <table class="ea-table">
        <thead>
          <tr>
            <th>Nguồn</th>
            <th>Loại</th>
            <th>Xử lý gần nhất</th>
            <th>Candidate</th>
            <th>Cập nhật</th>
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
                  >${job ? knowledgeProcessingLabel(job.status) : "Xem chi tiết"}</span
                >
              </td>
              <td>${source.status === "staged_remove" ? "Sẽ gỡ" : "Bao gồm"}</td>
              <td>${formatDate(source.updatedAt)}</td>
              <td>
                <button
                  class="ea-button ea-button--small"
                  type="button"
                  ?disabled=${this.busy}
                  @click=${() => void this.toggleSourceRemoval(source)}
                >
                  ${source.status === "staged_remove" ? "Hoàn tác gỡ" : "Stage remove"}
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
        ><strong>Version ${version.versionNumber}</strong
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
        <p>${knowledgeSourceKindLabel(source.kind)} · draft revision ${source.draftRevision}</p>
      </div>
      <div class="knowledge-version-layout">
        <aside>
          <h4>Lịch sử version</h4>
          <div class="knowledge-version-list">
            ${this.versions.map((item) => this.renderVersionDetails(item))}
          </div>
        </aside>
        <div class="knowledge-version-preview">
          ${version
            ? html`<div class="knowledge-version-heading">
                  <div>
                    <strong>Version ${version.versionNumber}</strong
                    ><span
                      >${version.mimeType} · ${formatKnowledgeBytes(version.byteSize)} ·
                      ${version.segmentCount ?? 0} segment</span
                    >
                  </div>
                  <div class="knowledge-version-actions">
                    <button
                      class="ea-button ea-button--small"
                      type="button"
                      ?disabled=${this.busy}
                      @click=${() => void this.reprocessVersionWithAiGraphV3()}
                    >
                      Phân tích lại bằng AI Graph V3
                    </button>
                    <a
                      class="ea-button ea-button--small"
                      href=${enterpriseKnowledgeVersionDownloadUrl(
                        "admin",
                        this.selected.id,
                        version.id,
                      )}
                      download
                      >Tải bản gốc</a
                    >
                  </div>
                </div>
                ${version.safeErrorCode
                  ? html`<div class="ea-banner ea-banner--error">${version.safeErrorCode}</div>`
                  : nothing}
                ${this.versionPreviewLoading
                  ? html`<div class="ea-loading">Đang tải bản xem trước…</div>`
                  : this.versionPreview
                    ? html`<div class="knowledge-provenance">
                          <span
                            class="ea-badge ${this.versionPreview.ocrProvenance
                              ? "ea-badge--good"
                              : ""}"
                            >${this.versionPreview.ocrProvenance
                              ? "Đã OCR"
                              : version.mimeType.includes("wordprocessingml")
                                ? "Đã phân tích DOCX – không cần OCR"
                                : "Đã parse nội dung native – không cần OCR"}</span
                          >
                          <span class="ea-muted"
                            >${this.versionPreview.truncated
                              ? "Bản xem trước đã rút gọn"
                              : "Đủ segment"}
                            · Artifact V${this.versionPreview.artifactSchemaVersion}
                            ${this.versionPreview.structuralBlocks
                              ? `· ${this.versionPreview.structuralBlocks.length} block cấu trúc`
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
                        Bản xem trước có sau khi xử lý hoàn tất.
                      </div>`} `
            : html`<div class="ea-empty">Chọn một version để xem provenance và nội dung OCR.</div>`}
        </div>
      </div>
      ${source.kind === "file"
        ? html`<div class="knowledge-revision-form">
            <strong>Thay tài liệu bằng version mới</strong
            ><input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.docx,.xlsx,.pptx,.txt,.md,.html"
              aria-label="Chọn version file mới"
              @change=${(event: Event) =>
                void this.uploadFiles(inputFromEvent(event)?.files ?? null, source)}
            />
          </div>`
        : html`<form
            class="knowledge-revision-form"
            @submit=${(event: SubmitEvent) => void this.createSourceVersion(event)}
          >
            <strong>Tạo draft version mới</strong>${source.kind === "note"
              ? html`<textarea
                  class="ea-textarea"
                  name="content"
                  rows="4"
                  required
                  placeholder="Nội dung mới…"
                ></textarea>`
              : html`<input
                    class="ea-input"
                    name="url"
                    type="url"
                    .value=${source.canonicalUrl ?? ""}
                    required
                  /><label class="ea-check"
                    ><input type="checkbox" name="crawlSameOrigin" /> Crawl cùng origin</label
                  >`}<button class="ea-button" ?disabled=${this.busy}>Tạo version</button>
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
          <h3>Ghi chú nội bộ</h3>
          <p>Nhập trực tiếp quy trình, chính sách hoặc hướng dẫn.</p>
          <label class="ea-field">Tiêu đề<input class="ea-input" name="title" required /></label
          ><label class="ea-field"
            >Nội dung<textarea
              class="ea-textarea"
              name="content"
              rows="5"
              required
            ></textarea></label
          ><button class="ea-button ea-button--primary" ?disabled=${this.busy}>Nạp ghi chú</button>
        </form>
        <form
          class="ea-card ea-form knowledge-form"
          @submit=${(event: SubmitEvent) => void this.createUrl(event)}
        >
          <span class="knowledge-feature-icon">${icons.search}</span>
          <h3>Website / URL</h3>
          <p>Thu thập một trang hoặc tối đa 50 trang cùng origin.</p>
          <label class="ea-field">Tiêu đề<input class="ea-input" name="title" required /></label
          ><label class="ea-field"
            >URL<input class="ea-input" name="url" type="url" required /></label
          ><label class="ea-check"
            ><input type="checkbox" name="crawlSameOrigin" /> Crawl cùng origin</label
          ><button class="ea-button ea-button--primary" ?disabled=${this.busy}>Nạp URL</button>
        </form>
        <section class="ea-card knowledge-form">
          <span class="knowledge-feature-icon">${icons.file}</span>
          <h3>Tài liệu & ảnh OCR</h3>
          <p>PDF, Office, ảnh; tối đa 20 file/lần và 50 MiB/file.</p>
          <label class="knowledge-file-drop"
            ><input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.docx,.xlsx,.pptx,.txt,.md,.html"
              @change=${(event: Event) =>
                void this.uploadFiles(inputFromEvent(event)?.files ?? null)}
            /><strong>Chọn tài liệu</strong><span>hoặc kéo thả vào đây</span></label
          >${this.renderUploadRows()}
        </section>
      </div>
      ${this.renderSourceList()} ${this.renderSourceDetails()}
    `;
  }
}
