import { html, nothing, type TemplateResult } from "lit";
import { icons } from "../../../components/icons.ts";
import { formatDate } from "../utils.ts";
import "../components/admin-dialog.ts";
import {
  renderKnowledgeAgentChecklist,
  renderKnowledgeMemberAccess,
  renderKnowledgeZoneEditorFields,
} from "./knowledge-access-views.ts";
import { EnterpriseAdminKnowledgeContentPage } from "./knowledge-page-content-view.ts";
import "../../knowledge/knowledge-graph-view.ts";
import {
  formatKnowledgeBytes,
  inputFromEvent,
  knowledgeJobKindLabel,
  knowledgeJobStageLabel,
  knowledgeProcessingLabel,
  knowledgeStatusClass,
  knowledgeTabs,
  recordValue,
  renderKnowledgePublicationRows,
  sameKnowledgeBindings,
  textareaFromEvent,
} from "./knowledge-page-view-helpers.ts";

export class EnterpriseAdminKnowledgePage extends EnterpriseAdminKnowledgeContentPage {
  private renderAgents(): TemplateResult {
    const unchanged = sameKnowledgeBindings(this.bindings, this.bindingDraft);
    return html`<form
      class="knowledge-access-form"
      @submit=${(event: SubmitEvent) => void this.saveBindings(event)}
    >
      ${renderKnowledgeAgentChecklist({
        catalog: this.agentCatalog,
        selected: this.bindingDraft,
        query: this.agentQuery,
        loading: this.catalogsLoading,
        error: this.catalogError,
        disabled: this.busy,
        onQuery: (query) => (this.agentQuery = query),
        onToggle: (key, checked) => this.setAgentBinding(key, checked),
      })}
      <div class="knowledge-form-footer">
        <span class="ea-muted"
          >${unchanged
            ? "Không có thay đổi."
            : "Quyền truy cập Agent đã thay đổi nhưng chưa lưu."}</span
        ><button class="ea-button ea-button--primary" ?disabled=${this.busy || unchanged}>
          Lưu quyền Agent
        </button>
      </div>
    </form>`;
  }

  private renderMembers(): TemplateResult {
    return html`<form
      class="knowledge-access-form"
      @submit=${(event: SubmitEvent) => void this.saveMembers(event)}
    >
      ${renderKnowledgeMemberAccess({
        accounts: this.accounts,
        draft: this.memberDraft,
        query: this.memberQuery,
        loading: this.catalogsLoading,
        error: this.catalogError,
        disabled: this.busy,
        onQuery: (query) => (this.memberQuery = query),
        onRole: (id, role) => this.setMemberRole(id, role),
      })}
      <div class="knowledge-form-footer">
        <span class="ea-muted">Quyền thành viên không thay thế binding của Agent.</span
        ><button class="ea-button ea-button--primary" ?disabled=${this.busy}>Lưu thành viên</button>
      </div>
    </form>`;
  }

  private renderSearch(): TemplateResult {
    const needsOverride = Boolean(this.candidate && this.candidate.vectorStatus !== "ready");
    return html`
      <section class="ea-card knowledge-candidate-card">
        <div>
          <h3>Candidate index</h3>
          <p>Mỗi candidate khóa source-set revision để kiểm thử trước khi publish.</p>
        </div>
        ${this.candidate
          ? html`<dl class="knowledge-facts">
              <div>
                <dt>Generation</dt>
                <dd>${this.candidate.id}</dd>
              </div>
              <div>
                <dt>Integrity</dt>
                <dd>${this.candidate.integrityStatus}</dd>
              </div>
              <div>
                <dt>FTS</dt>
                <dd>${this.candidate.lexicalStatus}</dd>
              </div>
              <div>
                <dt>Vector</dt>
                <dd>${this.candidate.vectorStatus}</dd>
              </div>
              <div>
                <dt>Artifact / AI</dt>
                <dd>
                  V${this.candidate.artifactSchemaVersion} · ${this.candidate.aiAnalysisStatus}
                </dd>
              </div>
              ${this.candidate.degradationReasons.length
                ? html`<div>
                    <dt>Degraded</dt>
                    <dd>${this.candidate.degradationReasons.join(" · ")}</dd>
                  </div>`
                : nothing}
            </dl>`
          : html`<span class="ea-badge ea-badge--warn">Chưa có candidate</span>`}
        <button
          class="ea-button"
          type="button"
          ?disabled=${this.busy || !this.sources.length}
          @click=${() => void this.buildCandidate()}
        >
          Tạo candidate mới
        </button>
      </section>
      <form
        class="knowledge-search-form"
        @submit=${(event: SubmitEvent) => void this.search(event)}
      >
        <div>
          <h3>Kiểm thử truy xuất</h3>
          <p>Chạy truy vấn trên candidate, không ảnh hưởng publication đang phục vụ Agent.</p>
        </div>
        <div class="ea-toolbar">
          <input
            class="ea-input"
            name="query"
            placeholder="Nhập câu hỏi hoặc từ khóa…"
            required
          /><button class="ea-button ea-button--primary" ?disabled=${!this.candidate || this.busy}>
            Tìm thử
          </button>
        </div>
      </form>
      <div class="knowledge-hit-list" aria-live="polite">
        ${this.searchHits.map(
          (hit) =>
            html`<article class="ea-card knowledge-hit">
              <strong>${String(recordValue(hit.citation).sourceTitle ?? "Nguồn")}</strong>
              <p>${String(hit.excerpt ?? "")}</p>
              <span class="ea-muted"
                >${JSON.stringify(recordValue(hit.citation).locator ?? {})}</span
              >
            </article>`,
        )}
      </div>
      <section class="ea-card knowledge-publish-card">
        <div>
          <h3>Publish cho Agent</h3>
          <p>Khi publish, các Agent đã bind sẽ chuyển sang publication mới một cách nguyên tử.</p>
        </div>
        ${needsOverride
          ? html`<label class="ea-field"
              >Lý do phê duyệt FTS-only<textarea
                class="ea-textarea"
                rows="3"
                .value=${this.degradedReason}
                @input=${(event: Event) =>
                  (this.degradedReason = textareaFromEvent(event)?.value ?? "")}
              ></textarea>
            </label>`
          : nothing}<button
          class="ea-button ea-button--primary"
          type="button"
          ?disabled=${!this.candidate || this.busy}
          @click=${() => void this.publish()}
        >
          Publish candidate
        </button>
      </section>
    `;
  }

  private renderActivity(): TemplateResult {
    return html`
      <section class="knowledge-section-block">
        <div class="knowledge-section-heading">
          <div><h3>Tác vụ xử lý</h3></div>
          <p>Theo dõi tiến độ, hủy hoặc chạy lại tác vụ lỗi.</p>
        </div>
        ${this.renderJobTable()}
      </section>
      <section class="knowledge-section-block">
        <div class="knowledge-section-heading">
          <div><h3>Lịch sử publication</h3></div>
          <p>Rollback tạo một publication mới từ generation đã chọn.</p>
        </div>
        ${renderKnowledgePublicationRows(
          this.publications,
          this.selected?.activePublicationId,
          this.busy,
          (publication) => void this.rollback(publication),
        )}
      </section>
    `;
  }

  private renderGraph(): TemplateResult | typeof nothing {
    if (!this.selected) {
      return nothing;
    }
    return html`<openclaw-knowledge-graph-view
      audience="admin"
      .zoneId=${this.selected.id}
      .zoneName=${this.selected.name}
      .role=${this.selectedRole}
      .zoneRevision=${this.selected.revision}
      .snapshotRevision=${this.selected.buildRevision}
      .hasCandidate=${Boolean(this.candidate)}
      .hasActivePublication=${Boolean(this.selected.activePublicationId)}
      @knowledge-graph-changed=${() => void this.openZone(this.selected!, "graph")}
      @knowledge-source-open=${() => (this.tab = "sources")}
    ></openclaw-knowledge-graph-view>`;
  }

  private renderJobTable(): TemplateResult {
    if (!this.jobs.length) {
      return html`<div class="ea-empty knowledge-empty-small">Chưa có job xử lý.</div>`;
    }
    return html`<div class="ea-card ea-table-wrap">
      <table class="ea-table">
        <thead>
          <tr>
            <th>Tác vụ</th>
            <th>Giai đoạn</th>
            <th>Trạng thái</th>
            <th>Tiến độ</th>
            <th>Cập nhật</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${this.jobs.map(
            (job) =>
              html`<tr>
                <td>
                  ${knowledgeJobKindLabel(job.kind)}
                  <div class="ea-muted">Lần chạy ${job.attempt}</div>
                </td>
                <td>
                  ${knowledgeJobStageLabel(job.stage)}
                  ${this.jobSteps[job.id]?.length
                    ? html`<div class="knowledge-job-stepper" aria-label="Tiến độ pipeline">
                        ${this.jobSteps[job.id]!.map(
                          (step) => html`<span class="is-${step.status}">
                            <b>${knowledgeJobStageLabel(step.stage)}</b>
                            <small
                              >${knowledgeProcessingLabel(step.status)}${step.progressTotal
                                ? ` · ${step.progressCurrent ?? 0}/${step.progressTotal}`
                                : ""}${step.degradedReason
                                ? ` · ${step.degradedReason}`
                                : ""}</small
                            >
                          </span>`,
                        )}
                      </div>`
                    : nothing}
                </td>
                <td>
                  <span class="ea-badge ${knowledgeStatusClass(job.status)}"
                    >${knowledgeProcessingLabel(job.status)}</span
                  >${job.safeErrorCode
                    ? html`<div class="ea-error">${job.safeErrorCode}</div>`
                    : nothing}
                </td>
                <td>
                  ${job.progressTotal
                    ? html`<progress
                        max=${job.progressTotal}
                        value=${job.status === "succeeded"
                          ? job.progressTotal
                          : job.progressCurrent}
                      ></progress>`
                    : "—"}
                </td>
                <td>${formatDate(job.updatedAt)}</td>
                <td>
                  ${["queued", "running", "retry_wait"].includes(job.status)
                    ? html`<button
                        class="ea-button ea-button--small"
                        type="button"
                        ?disabled=${this.busy}
                        @click=${() => void this.runJobAction(job, "cancel")}
                      >
                        Hủy
                      </button>`
                    : ["failed", "cancelled"].includes(job.status)
                      ? html`<button
                          class="ea-button ea-button--small"
                          type="button"
                          ?disabled=${this.busy}
                          @click=${() => void this.runJobAction(job, "retry")}
                        >
                          Chạy lại
                        </button>`
                      : nothing}
                </td>
              </tr>`,
          )}
        </tbody>
      </table>
    </div>`;
  }

  private renderTab(): TemplateResult | typeof nothing {
    if (this.detailLoading) {
      return html`<div class="ea-loading">Đang tải vùng tri thức…</div>`;
    }
    switch (this.tab) {
      case "settings":
        return this.renderSettings();
      case "sources":
        return this.renderSources();
      case "graph":
        return this.renderGraph();
      case "agents":
        return this.renderAgents();
      case "members":
        return this.renderMembers();
      case "search":
        return this.renderSearch();
      case "activity":
        return this.renderActivity();
      default:
        return this.renderOverview();
    }
  }

  private renderCreateDrawer(): TemplateResult {
    return html`<openclaw-enterprise-admin-dialog
      id="knowledge-zone-create-drawer"
      .open=${this.createOpen}
      .drawer=${true}
      heading="Tạo vùng tri thức"
      description="Thiết lập ranh giới dữ liệu, OCR và Agent được phép truy cập ngay từ đầu."
      .canClose=${() => !this.busy}
      .onClose=${() => this.closeCreateDrawer()}
    >
      ${this.createOpen
        ? html`<form
            class="knowledge-zone-editor"
            @submit=${(event: SubmitEvent) => void this.createZone(event)}
          >
            ${this.createError
              ? html`<div class="ea-banner ea-banner--error" role="alert">${this.createError}</div>`
              : nothing}
            ${renderKnowledgeZoneEditorFields({
              draft: this.createDraft,
              errors: this.createErrors,
              creating: true,
              readiness: this.readiness,
              disabled: this.busy,
              onName: (name) => this.updateCreateName(name),
              onSlug: (slug) => this.setCreateSlug(slug),
              onDescription: (description) => this.updateCreateDraft({ description }),
              onEgressPolicy: (egressPolicy) => this.updateCreateDraft({ egressPolicy }),
              onGraphEnabled: (graphEnabled) => this.updateCreateDraft({ graphEnabled }),
              onGraphEnrichmentEnabled: (graphEnrichmentEnabled) =>
                this.updateCreateDraft({ graphEnrichmentEnabled }),
              onGraphAutoApprovalThreshold: (graphAutoApprovalThreshold) =>
                this.updateCreateDraft({ graphAutoApprovalThreshold }),
              onOpenModelSetup: () => this.openModelSetup(),
            })}
            ${renderKnowledgeAgentChecklist({
              catalog: this.agentCatalog,
              selected: this.createDraft.agentResourceKeys,
              query: this.agentQuery,
              loading: this.catalogsLoading,
              error: this.catalogError,
              disabled: this.busy,
              compact: true,
              onQuery: (query) => (this.agentQuery = query),
              onToggle: (key, checked) => this.setCreateAgent(key, checked),
            })}
            <div class="knowledge-form-footer knowledge-form-footer--sticky">
              <button
                class="ea-button"
                type="button"
                ?disabled=${this.busy}
                @click=${() => this.closeCreateDrawer()}
              >
                Hủy</button
              ><button class="ea-button ea-button--primary" ?disabled=${this.busy}>
                ${this.busy ? "Đang tạo…" : "Tạo vùng tri thức"}
              </button>
            </div>
          </form>`
        : nothing}
    </openclaw-enterprise-admin-dialog>`;
  }

  private renderDetailDrawer(): TemplateResult {
    return html`<openclaw-enterprise-admin-dialog
      .open=${Boolean(this.selected)}
      .wide=${true}
      .drawer=${true}
      heading=${this.selected?.name ?? "Vùng tri thức"}
      description=${this.selected
        ? `${this.selected.slug} · revision ${this.selected.revision} · ${this.selectedRole}`
        : ""}
      .canClose=${() => this.canCloseZone()}
      .onClose=${() => this.closeZone()}
    >
      ${this.error
        ? html`<div class="ea-banner ea-banner--error" role="alert">${this.error}</div>`
        : nothing}${this.notice
        ? html`<div class="ea-banner ea-banner--success" role="status">${this.notice}</div>`
        : nothing}
      <div class="knowledge-drawer-toolbar">
        <span class="ea-badge ${knowledgeStatusClass(this.selected?.status ?? "archived")}"
          >${this.selected?.status === "active" ? "Đang hoạt động" : "Đã archive"}</span
        ><span>${this.selected?.activePublicationId ? "Đã publish" : "Chưa publish"}</span
        ><span class="ea-spacer"></span
        ><button
          class="ea-button ea-button--small"
          type="button"
          @click=${() => (this.tab = "settings")}
        >
          ${icons.pencil} Sửa zone
        </button>
      </div>
      <nav class="ea-knowledgeTabs knowledge-tabs" aria-label="Chi tiết vùng tri thức">
        ${knowledgeTabs.map(
          (item) =>
            html`<button
              class="ea-tab ${this.tab === item.id ? "ea-tab--active" : ""}"
              type="button"
              aria-current=${this.tab === item.id ? "page" : "false"}
              @click=${() => (this.tab = item.id)}
            >
              ${item.label}
            </button>`,
        )}
      </nav>
      <div class="knowledge-tab-content">${this.renderTab()}</div>
    </openclaw-enterprise-admin-dialog>`;
  }

  private renderOperationsDrawer(): TemplateResult {
    const report = this.doctor;
    return html`<openclaw-enterprise-admin-dialog
      .open=${this.operationsOpen}
      .wide=${true}
      .drawer=${true}
      heading="Vận hành tri thức doanh nghiệp"
      description="Readiness, integrity, hàng đợi và audit trail trên toàn hệ thống."
      .onClose=${() => (this.operationsOpen = false)}
    >
      ${this.operationsLoading
        ? html`<div class="ea-loading">Đang chạy kiểm tra hệ thống…</div>`
        : report
          ? html`<div class="ea-kpis">
                <article class="ea-kpi">
                  <span>Tổng thể</span><strong>${report.ok ? "Tốt" : "Cần xử lý"}</strong
                  ><small>${formatDate(report.checkedAt)}</small>
                </article>
                <article class="ea-kpi">
                  <span>Artifact lỗi</span
                  ><strong>${report.artifacts.missing + report.artifacts.permissionErrors}</strong
                  ><small>${report.artifacts.checked} đã kiểm tra</small>
                </article>
                <article class="ea-kpi">
                  <span>Job lỗi 24h</span><strong>${report.jobs.failed24h}</strong
                  ><small>${Math.round(report.jobs.failureRate24h * 100)}% failure</small>
                </article>
                <article class="ea-kpi">
                  <span>Search p95</span
                  ><strong
                    >${report.search.p95Ms === null ? "—" : `${report.search.p95Ms} ms`}</strong
                  ><small>${report.search.count} truy vấn</small>
                </article>
              </div>
              <div class="knowledge-ops-grid">
                <section class="ea-card knowledge-panel">
                  <h3>Integrity issues</h3>
                  ${[...report.artifacts.issues, ...report.indexes.issues].length
                    ? html`<div class="knowledge-issue-list">
                        ${report.artifacts.issues.map(
                          (issue) =>
                            html`<p>
                              <strong>${issue.code}</strong
                              ><span>${issue.kind} · ${issue.identity}</span>
                            </p>`,
                        )}${report.indexes.issues.map(
                          (issue) =>
                            html`<p>
                              <strong>${issue.code}</strong
                              ><span>${issue.zoneId} · ${issue.generationId}</span>
                            </p>`,
                        )}
                      </div>`
                    : html`<div class="ea-empty knowledge-empty-small">
                        Không phát hiện vấn đề integrity.
                      </div>`}
                </section>
                <section class="ea-card knowledge-panel">
                  <h3>Hàng đợi & lưu trữ</h3>
                  <dl class="knowledge-facts">
                    <div>
                      <dt>Queued</dt>
                      <dd>${report.jobs.queued}</dd>
                    </div>
                    <div>
                      <dt>Running</dt>
                      <dd>${report.jobs.running}</dd>
                    </div>
                    <div>
                      <dt>Stuck &gt; 10m</dt>
                      <dd>${report.jobs.stuckOver10m}</dd>
                    </div>
                    <div>
                      <dt>Artifact storage</dt>
                      <dd>${formatKnowledgeBytes(report.storage.artifactBytes)}</dd>
                    </div>
                  </dl>
                </section>
                <section class="ea-card knowledge-panel">
                  <h3>Graph health</h3>
                  <dl class="knowledge-facts">
                    <div>
                      <dt>Generation v2 ready/degraded</dt>
                      <dd>${report.graph.ready}/${report.graph.degraded}</dd>
                    </div>
                    <div>
                      <dt>Pending / orphan</dt>
                      <dd>${report.graph.proposedEdges}/${report.graph.orphanNodes}</dd>
                    </div>
                    <div>
                      <dt>Build p95</dt>
                      <dd>
                        ${report.graph.buildP95Ms === null ? "—" : `${report.graph.buildP95Ms} ms`}
                      </dd>
                    </div>
                    <div>
                      <dt>Retrieval p95</dt>
                      <dd>
                        ${report.graph.retrievalP95Ms === null
                          ? "—"
                          : `${report.graph.retrievalP95Ms} ms`}
                      </dd>
                    </div>
                    <div>
                      <dt>Timeout / truncation</dt>
                      <dd>${report.graph.timeouts}/${report.graph.truncations}</dd>
                    </div>
                  </dl>
                </section>
                <section class="ea-card knowledge-panel">
                  <h3>Obsidian export</h3>
                  <dl class="knowledge-facts">
                    <div>
                      <dt>Running</dt>
                      <dd>${report.exports.running}</dd>
                    </div>
                    <div>
                      <dt>Complete 24h</dt>
                      <dd>${report.exports.complete}</dd>
                    </div>
                    <div>
                      <dt>Failed / expired</dt>
                      <dd>${report.exports.failed}/${report.exports.expired}</dd>
                    </div>
                    <div>
                      <dt>Private storage</dt>
                      <dd>${formatKnowledgeBytes(report.exports.storageBytes)}</dd>
                    </div>
                  </dl>
                </section>
              </div>`
          : nothing}
      <section class="knowledge-section-block">
        <div class="knowledge-section-heading">
          <div><h3>Audit trail</h3></div>
          <p>200 sự kiện tri thức gần nhất.</p>
        </div>
        ${this.auditEvents.length
          ? html`<div class="ea-card ea-table-wrap">
              <table class="ea-table">
                <thead>
                  <tr>
                    <th>Hành động</th>
                    <th>Đối tượng</th>
                    <th>Kết quả</th>
                    <th>Actor</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.auditEvents.map(
                    (event) =>
                      html`<tr>
                        <td>${event.action}</td>
                        <td>
                          ${event.targetType}
                          <div class="ea-muted">${event.targetId}</div>
                        </td>
                        <td>
                          <span class="ea-badge ${knowledgeStatusClass(event.outcome)}"
                            >${event.outcome}</span
                          >
                        </td>
                        <td>${event.actorAccountId ?? "System"}</td>
                        <td>${formatDate(event.createdAt)}</td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            </div>`
          : html`<div class="ea-empty">Chưa có sự kiện audit.</div>`}
      </section>
    </openclaw-enterprise-admin-dialog>`;
  }

  override render(): TemplateResult {
    const publishedZones = this.zones.filter((zone) => zone.activePublicationId).length;
    return html`<section class="ea-page knowledge-page">
      <header class="ea-page-header">
        <div>
          <h1>Tri thức doanh nghiệp</h1>
          <p>
            Quản lý nguồn, OCR, quyền Agent, phiên bản, kiểm thử và xuất bản theo từng vùng dữ liệu.
          </p>
        </div>
        <div class="ea-row-actions">
          <button class="ea-button" type="button" @click=${() => void this.openOperations()}>
            ${icons.activity} Kiểm tra hệ thống</button
          ><button
            class="ea-button ea-button--primary"
            type="button"
            @click=${() => this.openCreateDrawer()}
          >
            ${icons.plus} Tạo vùng tri thức
          </button>
        </div>
      </header>
      <div class="ea-kpis knowledge-main-kpis">
        <article class="ea-kpi">
          <span>Vùng tri thức</span><strong>${this.zones.length}</strong
          ><small>Đang hoạt động và đã lưu trữ</small>
        </article>
        <article class="ea-kpi">
          <span>Đã xuất bản</span><strong>${publishedZones}</strong
          ><small>${this.zones.length - publishedZones} vùng chưa xuất bản</small>
        </article>
        <article class="ea-kpi">
          <span>Chỉ mục</span
          ><strong>${this.readiness?.vector.ready ? "Kết hợp" : "Toàn văn"}</strong
          ><small
            >${this.readiness?.lexical.ready ? "Tìm kiếm toàn văn sẵn sàng" : "Cần kiểm tra"}</small
          >
        </article>
        <article class="ea-kpi">
          <span>OCR tự động</span
          ><strong>${this.readiness?.ocr.ready ? "Sẵn sàng" : "Cần cấu hình"}</strong
          ><small>${this.readiness?.ocr.provider ?? "Chưa có provider"}</small>
        </article>
        <article class="ea-kpi">
          <span>Bản đồ tri thức</span><strong>${this.graphOverview?.totals.nodes ?? 0}</strong
          ><small
            >${this.graphOverview?.totals.edges ?? 0} cạnh ·
            ${this.graphOverview?.totals.zones ?? 0} vùng có graph đã xuất bản</small
          >
        </article>
      </div>
      <div class="ea-toolbar knowledge-list-toolbar">
        <input
          class="ea-input"
          type="search"
          placeholder="Tìm theo tên hoặc slug…"
          .value=${this.query}
          @input=${(event: Event) => {
            this.query = inputFromEvent(event)?.value ?? "";
            this.scheduleLoad();
          }}
        /><span class="ea-spacer"></span
        ><button
          class="ea-button"
          type="button"
          @click=${() =>
            void Promise.all([this.load(), this.loadReadiness(), this.loadGraphOverview()])}
        >
          Làm mới
        </button>
      </div>
      ${this.error && !this.selected
        ? html`<div class="ea-banner ea-banner--error" role="alert">${this.error}</div>`
        : nothing}
      ${this.loading
        ? html`<div class="ea-loading">Đang tải vùng tri thức…</div>`
        : !this.zones.length
          ? html`<div class="ea-empty">
              <strong>Chưa có vùng tri thức</strong>
              <p>Tạo zone đầu tiên để nạp tài liệu, OCR và cấp quyền cho Agent.</p>
              <button
                class="ea-button ea-button--primary"
                type="button"
                @click=${() => this.openCreateDrawer()}
              >
                Tạo vùng tri thức
              </button>
            </div>`
          : html`<div class="ea-card ea-table-wrap knowledge-zone-table">
                <table class="ea-table">
                  <thead>
                    <tr>
                      <th>Vùng</th>
                      <th>Trạng thái</th>
                      <th>Xuất bản</th>
                      <th>Quyền Agent</th>
                      <th>Chính sách</th>
                      <th>Cập nhật</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.zones.map(
                      (zone) =>
                        html`<tr>
                          <td>
                            <button
                              class="ea-link-button"
                              type="button"
                              @click=${() => void this.openZone(zone)}
                            >
                              <strong>${zone.name}</strong>
                            </button>
                            <div class="ea-muted">${zone.slug}</div>
                          </td>
                          <td>
                            <span class="ea-badge ${knowledgeStatusClass(zone.status)}"
                              >${zone.status === "active" ? "Đang hoạt động" : "Đã lưu trữ"}</span
                            >
                          </td>
                          <td>${zone.activePublicationId ? "Đã xuất bản" : "Bản nháp"}</td>
                          <td>Phiên bản ${zone.accessRevision}</td>
                          <td>
                            ${zone.egressPolicy === "local_only"
                              ? "Chỉ nội bộ"
                              : "Cho phép bên ngoài"}
                          </td>
                          <td>${formatDate(zone.updatedAt)}</td>
                          <td>
                            <div class="ea-row-actions">
                              <button
                                class="ea-button ea-button--small"
                                type="button"
                                @click=${() => this.openZoneTab(zone, "graph")}
                              >
                                Bản đồ</button
                              ><button
                                class="ea-button ea-button--small"
                                type="button"
                                @click=${() => this.openZoneTab(zone, "agents")}
                              >
                                Agent</button
                              ><button
                                class="ea-button ea-button--small"
                                type="button"
                                aria-label=${`Sửa ${zone.name}`}
                                @click=${() => this.openZoneTab(zone, "settings")}
                              >
                                ${icons.pencil}
                              </button>
                            </div>
                          </td>
                        </tr>`,
                    )}
                  </tbody>
                </table>
              </div>
              <div class="knowledge-pagination">
                <button
                  class="ea-button ea-button--small"
                  type="button"
                  ?disabled=${!this.previousCursors.length}
                  @click=${() => this.previousPage()}
                >
                  Trang trước</button
                ><span class="ea-muted">Tối đa 50 zone mỗi trang</span
                ><button
                  class="ea-button ea-button--small"
                  type="button"
                  ?disabled=${!this.nextCursor}
                  @click=${() => this.nextPage()}
                >
                  Trang sau
                </button>
              </div>`}
      ${this.renderCreateDrawer()}${this.renderDetailDrawer()}${this.renderOperationsDrawer()}
    </section>`;
  }
}

if (!customElements.get("openclaw-enterprise-admin-knowledge-page")) {
  customElements.define("openclaw-enterprise-admin-knowledge-page", EnterpriseAdminKnowledgePage);
}
