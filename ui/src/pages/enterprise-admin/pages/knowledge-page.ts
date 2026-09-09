import { html, nothing, type TemplateResult } from "lit";
import { icons } from "../../../components/icons.ts";
import { kak } from "../../../i18n/enterprise-admin-knowledge.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import { enterpriseDomainCopy } from "../../../i18n/enterprise-domain.ts";
import { t } from "../../../i18n/index.ts";
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
            >${unchanged ? ea("Không có thay đổi.") : kak("bindingsChanged")}</span
          ><button class="ea-button ea-button--primary" ?disabled=${this.busy || unchanged}>
            ${kak("saveAgentAccess")}
          </button>
        </div>
      </form>
      <form
        class="knowledge-access-form"
        data-evidence-transfers
        @submit=${(event: SubmitEvent) => void this.saveEvidenceTransfers(event)}
      >
        ${renderKnowledgeAgentChecklist({
          catalog: {
            shared: this.agentCatalog.shared.filter(
              (agent) => agent.evidenceTransferEligible === true,
            ),
            personal: [],
          },
          selected: this.evidenceTransferDraft,
          query: this.evidenceTransferQuery,
          loading: this.catalogsLoading,
          error: this.catalogError,
          disabled: this.busy,
          purpose: "evidence_transfer",
          onQuery: (query) => (this.evidenceTransferQuery = query),
          onToggle: (key, checked) => this.setEvidenceTransfer(key, checked),
        })}
        <div class="knowledge-form-footer">
          <span class="ea-muted"
            >${enterpriseDomainCopy("enterpriseKnowledge.evidenceTransferDefaultDeny")}</span
          >
          <button
            class="ea-button ea-button--primary"
            ?disabled=${this.busy ||
            sameKnowledgeBindings(this.evidenceTransfers, this.evidenceTransferDraft)}
          >
            ${enterpriseDomainCopy("enterpriseKnowledge.evidenceTransferSave")}
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
        <span class="ea-muted">${kak("memberAccessSeparate")}</span
        ><button class="ea-button ea-button--primary" ?disabled=${this.busy}>
          ${kak("saveMembers")}
        </button>
      </div>
    </form>`;
  }

  private renderSearch(): TemplateResult {
    const needsOverride = Boolean(this.candidate && this.candidate.vectorStatus !== "ready");
    return html`
      <section class="ea-card knowledge-candidate-card">
        <div>
          <h3>${kak("candidateIndex")}</h3>
          <p>${kak("candidateDescription")}</p>
        </div>
        ${this.candidate
          ? html`<dl class="knowledge-facts">
              <div>
                <dt>${kak("generation")}</dt>
                <dd>${this.candidate.id}</dd>
              </div>
              <div>
                <dt>${kak("integrity")}</dt>
                <dd>${this.candidate.integrityStatus}</dd>
              </div>
              <div>
                <dt>${kak("fts")}</dt>
                <dd>${this.candidate.lexicalStatus}</dd>
              </div>
              <div>
                <dt>${kak("vector")}</dt>
                <dd>${this.candidate.vectorStatus}</dd>
              </div>
              <div>
                <dt>${kak("artifactAiShort")}</dt>
                <dd>
                  V${this.candidate.artifactSchemaVersion} · ${this.candidate.aiAnalysisStatus}
                </dd>
              </div>
              ${this.candidate.degradationReasons.length
                ? html`<div>
                    <dt>${kak("degraded")}</dt>
                    <dd>${this.candidate.degradationReasons.join(" · ")}</dd>
                  </div>`
                : nothing}
            </dl>`
          : html`<span class="ea-badge ea-badge--warn">${kak("noCandidateYet")}</span>`}
        <button
          class="ea-button"
          type="button"
          ?disabled=${this.busy || !this.sources.length}
          @click=${() => void this.buildCandidate()}
        >
          ${kak("createCandidate")}
        </button>
      </section>
      <form
        class="knowledge-search-form"
        @submit=${(event: SubmitEvent) => void this.search(event)}
      >
        <div>
          <h3>${kak("retrievalTest")}</h3>
          <p>${kak("retrievalDescription")}</p>
        </div>
        <div class="ea-toolbar">
          <input
            class="ea-input"
            name="query"
            placeholder=${kak("queryPlaceholder")}
            required
          /><button class="ea-button ea-button--primary" ?disabled=${!this.candidate || this.busy}>
            ${kak("search")}
          </button>
        </div>
      </form>
      <div class="knowledge-hit-list" aria-live="polite">
        ${this.searchCompleted && this.candidate && !this.searchHits.length
          ? html`<div class="ea-empty knowledge-empty-small" role="status">
              ${enterpriseDomainCopy("enterpriseKnowledge.previewEmpty")}
            </div>`
          : nothing}
        ${this.searchHits.map(
          (hit) =>
            html`<article class="ea-card knowledge-hit">
              <strong>${String(recordValue(hit.citation).sourceTitle ?? ea("Nguồn"))}</strong>
              <p>${String(hit.excerpt ?? "")}</p>
              <span class="ea-muted"
                >${JSON.stringify(recordValue(hit.citation).locator ?? {})}</span
              >
            </article>`,
        )}
      </div>
      <section class="ea-card knowledge-publish-card">
        <div>
          <h3>${kak("publishForAgents")}</h3>
          <p>${kak("publishDescription")}</p>
        </div>
        ${needsOverride
          ? html`<label class="ea-field"
              >${kak("ftsOnlyReason")}<textarea
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
          ${kak("publishCandidate")}
        </button>
      </section>
    `;
  }

  private renderActivity(): TemplateResult {
    return html`
      <section class="knowledge-section-block">
        <div class="knowledge-section-heading">
          <div><h3>${kak("activityJobs")}</h3></div>
          <p>${kak("activityJobsDescription")}</p>
        </div>
        ${this.renderJobTable()}
      </section>
      <section class="knowledge-section-block">
        <div class="knowledge-section-heading">
          <div><h3>${ea("Lịch sử publication")}</h3></div>
          <p>${enterpriseDomainCopy("enterpriseKnowledge.publicationHistoryHint")}</p>
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
      return html`<div class="ea-empty knowledge-empty-small">${kak("jobEmpty")}</div>`;
    }
    return html`<div class="ea-card ea-table-wrap">
      <table class="ea-table">
        <thead>
          <tr>
            <th>${kak("job")}</th>
            <th>${kak("stage")}</th>
            <th>${ea("Trạng thái")}</th>
            <th>${kak("progress")}</th>
            <th>${kak("updated")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${this.jobs.map(
            (job) =>
              html`<tr>
                <td>
                  ${knowledgeJobKindLabel(job.kind)}
                  <div class="ea-muted">${kak("runNumber", { attempt: String(job.attempt) })}</div>
                </td>
                <td>
                  ${knowledgeJobStageLabel(job.stage)}
                  ${this.jobSteps[job.id]?.length
                    ? html`<div class="knowledge-job-stepper" aria-label=${kak("pipelineProgress")}>
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
                        ${ea("Hủy")}
                      </button>`
                    : ["failed", "cancelled"].includes(job.status)
                      ? html`<button
                          class="ea-button ea-button--small"
                          type="button"
                          ?disabled=${this.busy}
                          @click=${() => void this.runJobAction(job, "retry")}
                        >
                          ${kak("runAgain")}
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
      return html`<div class="ea-loading">${kak("loadingZones")}</div>`;
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
      heading=${kak("createZone")}
      description=${kak("zoneDrawerDescription")}
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
                ${ea("Hủy")}</button
              ><button class="ea-button ea-button--primary" ?disabled=${this.busy}>
                ${this.busy ? kak("creatingZone") : kak("createZone")}
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
      heading=${this.selected?.name ?? kak("zoneHeading")}
      description=${this.selected
        ? kak("zoneRevisionDescription", {
            slug: this.selected.slug,
            revision: String(this.selected.revision),
            role: this.selectedRole,
          })
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
          >${this.selected?.status === "active" ? kak("active") : kak("archived")}</span
        ><span>${this.selected?.activePublicationId ? ea("Đã publish") : ea("Chưa publish")}</span
        ><span class="ea-spacer"></span
        ><button
          class="ea-button ea-button--small"
          type="button"
          @click=${() => (this.tab = "settings")}
        >
          ${icons.pencil} ${kak("editZone")}
        </button>
      </div>
      <nav class="ea-knowledgeTabs knowledge-tabs" aria-label=${kak("zoneDetails")}>
        ${knowledgeTabs.map(
          (item) =>
            html`<button
              class="ea-tab ${this.tab === item.id ? "ea-tab--active" : ""}"
              type="button"
              aria-current=${this.tab === item.id ? "page" : "false"}
              @click=${() => (this.tab = item.id)}
            >
              ${kak(item.labelKey)}
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
      heading=${ea("Vận hành tri thức doanh nghiệp")}
      description=${kak("operationsDescription")}
      .onClose=${() => (this.operationsOpen = false)}
    >
      ${this.operationsLoading
        ? html`<div class="ea-loading">${kak("operationsLoading")}</div>`
        : report
          ? html`<div class="ea-kpis">
                <article class="ea-kpi">
                  <span>${kak("overall")}</span
                  ><strong>${report.ok ? kak("good") : kak("needsAction")}</strong
                  ><small>${formatDate(report.checkedAt)}</small>
                </article>
                <article class="ea-kpi">
                  <span>${kak("artifactErrors")}</span
                  ><strong>${report.artifacts.missing + report.artifacts.permissionErrors}</strong
                  ><small
                    >${kak("checkedCount", { count: String(report.artifacts.checked) })}</small
                  >
                </article>
                <article class="ea-kpi">
                  <span>${kak("failedJobs24h")}</span><strong>${report.jobs.failed24h}</strong
                  ><small
                    >${kak("failureRate", {
                      rate: String(Math.round(report.jobs.failureRate24h * 100)),
                    })}</small
                  >
                </article>
                <article class="ea-kpi">
                  <span>${kak("searchP95")}</span
                  ><strong
                    >${report.search.p95Ms === null ? "—" : `${report.search.p95Ms} ms`}</strong
                  ><small>${kak("queryCount", { count: String(report.search.count) })}</small>
                </article>
              </div>
              <div class="knowledge-ops-grid">
                <section class="ea-card knowledge-panel">
                  <h3>${kak("integrityIssues")}</h3>
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
                        ${kak("noIntegrityIssues")}
                      </div>`}
                </section>
                <section class="ea-card knowledge-panel">
                  <h3>${kak("queueStorage")}</h3>
                  <dl class="knowledge-facts">
                    <div>
                      <dt>${kak("queued")}</dt>
                      <dd>${report.jobs.queued}</dd>
                    </div>
                    <div>
                      <dt>${kak("running")}</dt>
                      <dd>${report.jobs.running}</dd>
                    </div>
                    <div>
                      <dt>${kak("stuckOver10m")}</dt>
                      <dd>${report.jobs.stuckOver10m}</dd>
                    </div>
                    <div>
                      <dt>${kak("artifactStorage")}</dt>
                      <dd>${formatKnowledgeBytes(report.storage.artifactBytes)}</dd>
                    </div>
                  </dl>
                </section>
                <section class="ea-card knowledge-panel">
                  <h3>${kak("graphHealth")}</h3>
                  <dl class="knowledge-facts">
                    <div>
                      <dt>${kak("generationReadyDegraded")}</dt>
                      <dd>${report.graph.ready}/${report.graph.degraded}</dd>
                    </div>
                    <div>
                      <dt>${kak("pendingOrphan")}</dt>
                      <dd>${report.graph.proposedEdges}/${report.graph.orphanNodes}</dd>
                    </div>
                    <div>
                      <dt>${kak("buildP95")}</dt>
                      <dd>
                        ${report.graph.buildP95Ms === null ? "—" : `${report.graph.buildP95Ms} ms`}
                      </dd>
                    </div>
                    <div>
                      <dt>${kak("retrievalP95")}</dt>
                      <dd>
                        ${report.graph.retrievalP95Ms === null
                          ? "—"
                          : `${report.graph.retrievalP95Ms} ms`}
                      </dd>
                    </div>
                    <div>
                      <dt>${kak("timeoutTruncation")}</dt>
                      <dd>${report.graph.timeouts}/${report.graph.truncations}</dd>
                    </div>
                  </dl>
                </section>
                <section class="ea-card knowledge-panel">
                  <h3>${kak("obsidianExport")}</h3>
                  <dl class="knowledge-facts">
                    <div>
                      <dt>${kak("running")}</dt>
                      <dd>${report.exports.running}</dd>
                    </div>
                    <div>
                      <dt>${kak("complete24h")}</dt>
                      <dd>${report.exports.complete}</dd>
                    </div>
                    <div>
                      <dt>${kak("failedExpired")}</dt>
                      <dd>${report.exports.failed}/${report.exports.expired}</dd>
                    </div>
                    <div>
                      <dt>${kak("privateStorage")}</dt>
                      <dd>${formatKnowledgeBytes(report.exports.storageBytes)}</dd>
                    </div>
                  </dl>
                </section>
              </div>`
          : nothing}
      <section class="knowledge-section-block">
        <div class="knowledge-section-heading">
          <div><h3>${kak("auditTrail")}</h3></div>
          <p>${kak("auditDescription")}</p>
        </div>
        ${this.auditEvents.length
          ? html`<div class="ea-card ea-table-wrap">
              <table class="ea-table">
                <thead>
                  <tr>
                    <th>${ea("Hành động")}</th>
                    <th>${ea("Đối tượng")}</th>
                    <th>${ea("Kết quả")}</th>
                    <th>${ea("Actor")}</th>
                    <th>${ea("Thời gian")}</th>
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
                        <td>${event.actorAccountId ?? kak("system")}</td>
                        <td>${formatDate(event.createdAt)}</td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            </div>`
          : html`<div class="ea-empty">${ea("Chưa có sự kiện audit.")}</div>`}
      </section>
    </openclaw-enterprise-admin-dialog>`;
  }

  private renderRollbackDialog(): TemplateResult | typeof nothing {
    const target = this.rollbackTarget;
    if (!target) {
      return nothing;
    }
    return html`<openclaw-enterprise-admin-dialog
      id="knowledge-rollback-dialog"
      .open=${true}
      heading=${enterpriseDomainCopy("enterpriseKnowledge.rollbackHeading")}
      description=${enterpriseDomainCopy("enterpriseKnowledge.rollbackDescription", {
        zone: target.zone.name,
        number: String(target.publication.publicationNumber),
      })}
      .canClose=${() => !this.busy}
      .onClose=${() => this.cancelRollback()}
    >
      <div aria-busy=${String(this.busy)}>
        <p>${enterpriseDomainCopy("enterpriseKnowledge.rollbackWarning")}</p>
        ${this.rollbackError
          ? html`<div class="ea-banner ea-banner--error" role="alert">${this.rollbackError}</div>`
          : nothing}
        <div class="knowledge-form-footer">
          <button
            class="ea-button"
            type="button"
            autofocus
            ?disabled=${this.busy}
            @click=${() => this.cancelRollback()}
          >
            ${t("common.cancel")}</button
          ><button
            class="ea-button ea-button--primary"
            type="button"
            data-rollback-confirm
            ?disabled=${this.busy}
            @click=${() => void this.confirmRollback()}
          >
            ${enterpriseDomainCopy(
              this.busy
                ? "enterpriseKnowledge.rollbackWorking"
                : "enterpriseKnowledge.rollbackConfirm",
            )}
          </button>
        </div>
      </div>
    </openclaw-enterprise-admin-dialog>`;
  }

  override render(): TemplateResult {
    const publishedZones = this.zones.filter((zone) => zone.activePublicationId).length;
    return html`<section class="ea-page knowledge-page">
      <header class="ea-page-header">
        <div>
          <h1>${ea("Tri thức doanh nghiệp")}</h1>
          <p>
            ${ea(
              "Quản lý nguồn, OCR, quyền Agent, phiên bản, kiểm thử và xuất bản theo từng vùng dữ liệu.",
            )}
          </p>
        </div>
        <div class="ea-row-actions">
          <button class="ea-button" type="button" @click=${() => void this.openOperations()}>
            ${icons.activity} ${kak("checkSystem")}</button
          ><button
            class="ea-button ea-button--primary"
            type="button"
            @click=${() => this.openCreateDrawer()}
          >
            ${icons.plus} ${kak("createZone")}
          </button>
        </div>
      </header>
      <div class="ea-kpis knowledge-main-kpis">
        <article class="ea-kpi">
          <span>${ea("Vùng tri thức")}</span><strong>${this.zones.length}</strong
          ><small>${kak("activeArchived")}</small>
        </article>
        <article class="ea-kpi">
          <span>${ea("Đã xuất bản")}</span><strong>${publishedZones}</strong
          ><small
            >${kak("unpublishedZones", {
              count: String(this.zones.length - publishedZones),
            })}</small
          >
        </article>
        <article class="ea-kpi">
          <span>${kak("index")}</span
          ><strong>${this.readiness?.vector.ready ? kak("combinedIndex") : kak("fullText")}</strong
          ><small
            >${this.readiness?.lexical.ready ? kak("fullTextReady") : kak("needsCheck")}</small
          >
        </article>
        <article class="ea-kpi">
          <span>${kak("automaticOcr")}</span
          ><strong>${this.readiness?.ocr.ready ? kak("ready") : ea("Cần cấu hình")}</strong
          ><small>${this.readiness?.ocr.provider ?? kak("noProvider")}</small>
        </article>
        <article class="ea-kpi">
          <span>${ea("Bản đồ tri thức")}</span
          ><strong>${this.graphOverview?.totals.nodes ?? 0}</strong
          ><small
            >${kak("graphTotals", {
              edges: String(this.graphOverview?.totals.edges ?? 0),
              zones: String(this.graphOverview?.totals.zones ?? 0),
            })}</small
          >
        </article>
      </div>
      <div class="ea-toolbar knowledge-list-toolbar">
        <input
          class="ea-input"
          type="search"
          placeholder=${kak("searchZonePlaceholder")}
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
          ${ea("Làm mới")}
        </button>
      </div>
      ${this.error && !this.selected
        ? html`<div class="ea-banner ea-banner--error" role="alert">${this.error}</div>`
        : nothing}
      ${this.loading
        ? html`<div class="ea-loading">${kak("loadingZones")}</div>`
        : !this.zones.length
          ? html`<div class="ea-empty">
              <strong>${ea("Chưa có vùng tri thức")}</strong>
              <p>${ea("Tạo zone đầu tiên để nạp tài liệu, OCR và cấp quyền cho Agent.")}</p>
              <button
                class="ea-button ea-button--primary"
                type="button"
                @click=${() => this.openCreateDrawer()}
              >
                ${kak("createZone")}
              </button>
            </div>`
          : html`<div class="ea-card ea-table-wrap knowledge-zone-table">
                <table class="ea-table">
                  <thead>
                    <tr>
                      <th>${ea("Vùng")}</th>
                      <th>${ea("Trạng thái")}</th>
                      <th>${ea("Xuất bản")}</th>
                      <th>${kak("agentAccess")}</th>
                      <th>${ea("Chính sách")}</th>
                      <th>${kak("updated")}</th>
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
                              >${zone.status === "active" ? kak("active") : kak("archived")}</span
                            >
                          </td>
                          <td>${zone.activePublicationId ? ea("Đã xuất bản") : kak("draft")}</td>
                          <td>
                            ${kak("accessRevision", { revision: String(zone.accessRevision) })}
                          </td>
                          <td>
                            ${zone.egressPolicy === "local_only"
                              ? kak("internalOnly")
                              : kak("externalAllowed")}
                          </td>
                          <td>${formatDate(zone.updatedAt)}</td>
                          <td>
                            <div class="ea-row-actions">
                              <button
                                class="ea-button ea-button--small"
                                type="button"
                                @click=${() => this.openZoneTab(zone, "graph")}
                              >
                                ${kak("graph")}</button
                              ><button
                                class="ea-button ea-button--small"
                                type="button"
                                @click=${() => this.openZoneTab(zone, "agents")}
                              >
                                ${kak("agent")}</button
                              ><button
                                class="ea-button ea-button--small"
                                type="button"
                                aria-label=${kak("editZoneAria", { name: zone.name })}
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
                  ${ea("Trang trước")}</button
                ><span class="ea-muted">${ea("Tối đa 50 zone mỗi trang")}</span
                ><button
                  class="ea-button ea-button--small"
                  type="button"
                  ?disabled=${!this.nextCursor}
                  @click=${() => this.nextPage()}
                >
                  ${ea("Sau")}
                </button>
              </div>`}
      ${this.renderCreateDrawer()}${this.renderDetailDrawer()}${this.renderOperationsDrawer()}
      ${this.renderRollbackDialog()}
    </section>`;
  }
}

if (!customElements.get("openclaw-enterprise-admin-knowledge-page")) {
  customElements.define("openclaw-enterprise-admin-knowledge-page", EnterpriseAdminKnowledgePage);
}
