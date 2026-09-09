import { html, nothing, type TemplateResult } from "lit";
import {
  kak,
  type EnterpriseAdminKnowledgeCopyKey,
} from "../../../i18n/enterprise-admin-knowledge.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import type { EnterpriseKnowledgePublication } from "../../enterprise/services/enterprise-knowledge-api.ts";
import { formatDate } from "../utils.ts";
import type { KnowledgeTab } from "./knowledge-page-model.ts";

export const knowledgeTabs: Array<{ id: KnowledgeTab; labelKey: EnterpriseAdminKnowledgeCopyKey }> =
  [
    { id: "overview", labelKey: "tabOverview" },
    { id: "settings", labelKey: "tabSettings" },
    { id: "sources", labelKey: "tabSources" },
    { id: "graph", labelKey: "tabGraph" },
    { id: "agents", labelKey: "tabAgents" },
    { id: "members", labelKey: "tabMembers" },
    { id: "search", labelKey: "tabSearch" },
    { id: "activity", labelKey: "tabActivity" },
  ];

export function inputFromEvent(event: Event): HTMLInputElement | undefined {
  return event.currentTarget instanceof HTMLInputElement ? event.currentTarget : undefined;
}

export function textareaFromEvent(event: Event): HTMLTextAreaElement | undefined {
  return event.currentTarget instanceof HTMLTextAreaElement ? event.currentTarget : undefined;
}

export function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? Object.fromEntries(Object.entries(value)) : {};
}

export function knowledgeStatusClass(status: string): string {
  if (["ready", "succeeded", "published", "active", "success"].includes(status)) {
    return "ea-badge--good";
  }
  if (["failed", "error", "cancelled", "archived", "failure"].includes(status)) {
    return "ea-badge--bad";
  }
  return "ea-badge--warn";
}

export function knowledgeSourceKindLabel(kind: string): string {
  return { note: kak("sourceNote"), url: "URL", file: kak("sourceFile") }[kind] ?? kind;
}

export function knowledgeProcessingLabel(status: string): string {
  return (
    {
      queued: kak("statusQueued"),
      running: kak("statusRunning"),
      retry_wait: kak("statusRetryWait"),
      ready: kak("statusReady"),
      degraded: kak("statusDegraded"),
      succeeded: kak("statusSucceeded"),
      failed: kak("statusFailed"),
      cancelled: kak("statusCancelled"),
      completed: kak("statusCompleted"),
      superseded: kak("statusSuperseded"),
    }[status] ?? status
  );
}

export function knowledgeUploadStateLabel(state: string): string {
  return (
    {
      active: kak("uploadWaiting"),
      committing: kak("uploadProcessing"),
      committed: kak("uploadCommitted"),
      cancelled: kak("uploadCancelled"),
      expired: kak("uploadExpired"),
      error: kak("uploadError"),
      resuming: kak("uploadResuming"),
      uploading: kak("uploadUploading"),
      processing: kak("uploadProcessing"),
    }[state] ?? state
  );
}

export function knowledgeJobKindLabel(kind: string): string {
  return (
    {
      source_ingest: kak("jobSourceIngest"),
      zone_build: kak("jobZoneBuild"),
      artifact_gc: kak("jobArtifactGc"),
      index_gc: kak("jobIndexGc"),
    }[kind] ?? kind
  );
}

export function knowledgeJobStageLabel(stage: string): string {
  return (
    {
      validate: kak("stageValidate"),
      checking: kak("stageChecking"),
      extract: kak("stageExtract"),
      parsing: kak("stageParsing"),
      ocr: kak("stageOcr"),
      structure: kak("stageStructure"),
      normalize: kak("stageNormalize"),
      normalizing: kak("stageNormalizing"),
      zone_build: kak("stageZoneBuild"),
      structural_graph: kak("stageStructuralGraph"),
      ai_read: kak("stageAiRead"),
      ai_canonicalize: kak("stageAiCanonicalize"),
      ai_relations: kak("stageAiRelations"),
      embedding: kak("stageEmbedding"),
      graph_build: kak("stageGraphBuild"),
      validating: kak("stageValidating"),
      candidate_ready: kak("stageCandidateReady"),
    }[stage] ?? stage
  );
}

export function knowledgeIntegrityLabel(status: string): string {
  return (
    {
      unknown: kak("integrityUnknown"),
      valid: kak("integrityValid"),
      corrupt: kak("integrityCorrupt"),
      missing: kak("integrityMissing"),
    }[status] ?? status
  );
}

export function knowledgeGraphStatusLabel(status: string): string {
  return (
    {
      not_built: kak("graphNotBuilt"),
      ready: kak("graphReady"),
      degraded: kak("graphDegraded"),
      error: kak("graphError"),
      corrupt: kak("graphCorrupt"),
    }[status] ?? status
  );
}

export function knowledgeCapabilityStatusLabel(status: string): string {
  return (
    {
      not_configured: kak("capabilityNotConfigured"),
      pending: kak("capabilityPending"),
      ready: kak("capabilityReady"),
      unavailable: kak("capabilityUnavailable"),
      degraded: kak("capabilityDegraded"),
      error: kak("capabilityError"),
      unknown: kak("capabilityUnknown"),
    }[status] ?? status
  );
}

export function formatKnowledgeBytes(value: number): string {
  if (!value) {
    return "0 B";
  }
  const units = ["B", "KiB", "MiB", "GiB"];
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

export function sameKnowledgeBindings(left: readonly string[], right: readonly string[]): boolean {
  const sortedRight = right.toSorted();
  return (
    left.length === right.length &&
    left.toSorted().every((value, index) => value === sortedRight[index])
  );
}

export function renderKnowledgePublicationRows(
  publications: EnterpriseKnowledgePublication[],
  activePublicationId: string | null | undefined,
  busy: boolean,
  rollback: (publication: EnterpriseKnowledgePublication) => void,
): TemplateResult {
  if (!publications.length) {
    return html`<div class="ea-empty knowledge-empty-small">${kak("publicationEmpty")}</div>`;
  }
  return html`<div class="ea-table-wrap">
    <table class="ea-table">
      <thead>
        <tr>
          <th>${kak("publication")}</th>
          <th>${ea("Nguồn")}</th>
          <th>${kak("index")}</th>
          <th>${ea("Thời gian")}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${publications.map(
          (publication) => html`<tr>
            <td>
              <strong>#${publication.publicationNumber}</strong>${publication.id ===
              activePublicationId
                ? kak("activePublication")
                : ""}
            </td>
            <td>${publication.sourceCount}</td>
            <td>
              FTS ${publication.lexicalStatus} · Vector
              ${publication.vectorStatus}${publication.degradedOverride
                ? kak("degradedOverride")
                : ""}${publication.degradedReason
                ? html`<div class="ea-muted">${publication.degradedReason}</div>`
                : nothing}
            </td>
            <td>${formatDate(publication.publishedAt)}</td>
            <td>
              <button
                class="ea-button ea-button--small"
                type="button"
                ?disabled=${busy || publication.id === activePublicationId}
                @click=${() => rollback(publication)}
              >
                ${kak("rollback")}
              </button>
            </td>
          </tr>`,
        )}
      </tbody>
    </table>
  </div>`;
}
