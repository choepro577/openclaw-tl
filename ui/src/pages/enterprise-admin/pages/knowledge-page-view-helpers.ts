import { html, nothing, type TemplateResult } from "lit";
import type { EnterpriseKnowledgePublication } from "../../enterprise/services/enterprise-knowledge-api.ts";
import { formatDate } from "../utils.ts";
import type { KnowledgeTab } from "./knowledge-page-model.ts";

export const knowledgeTabs: Array<{ id: KnowledgeTab; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "settings", label: "Cấu hình" },
  { id: "sources", label: "Nguồn & OCR" },
  { id: "graph", label: "Bản đồ tri thức" },
  { id: "agents", label: "Agent truy cập" },
  { id: "members", label: "Thành viên" },
  { id: "search", label: "Kiểm thử & publish" },
  { id: "activity", label: "Hoạt động" },
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
  return { note: "Ghi chú", url: "URL", file: "Tệp" }[kind] ?? kind;
}

export function knowledgeProcessingLabel(status: string): string {
  return (
    {
      queued: "Đang chờ",
      running: "Đang xử lý",
      retry_wait: "Chờ chạy lại",
      ready: "Sẵn sàng",
      degraded: "Giới hạn",
      succeeded: "Hoàn tất",
      failed: "Thất bại",
      cancelled: "Đã hủy",
      completed: "Hoàn tất",
      superseded: "Đã được thay thế",
    }[status] ?? status
  );
}

export function knowledgeJobKindLabel(kind: string): string {
  return (
    {
      source_ingest: "Nhập nguồn",
      zone_build: "Tạo Candidate",
      artifact_gc: "Dọn artifact",
      index_gc: "Dọn index",
    }[kind] ?? kind
  );
}

export function knowledgeJobStageLabel(stage: string): string {
  return (
    {
      validate: "Kiểm tra",
      checking: "Đang kiểm tra",
      extract: "Trích xuất",
      parsing: "Đang parse",
      ocr: "OCR",
      structure: "Dựng cấu trúc",
      normalize: "Chuẩn hóa",
      normalizing: "Chuẩn hóa artifact",
      zone_build: "Lập chỉ mục",
      structural_graph: "Dựng graph cấu trúc",
      ai_read: "AI đọc nội dung",
      ai_canonicalize: "AI chuẩn hóa khái niệm",
      ai_relations: "AI tạo quan hệ",
      embedding: "Tạo embedding",
      graph_build: "Dựng graph",
      validating: "Kiểm chứng evidence",
      candidate_ready: "Candidate sẵn sàng",
    }[stage] ?? stage
  );
}

export function knowledgeIntegrityLabel(status: string): string {
  return (
    {
      unknown: "Chưa kiểm tra",
      valid: "Hợp lệ",
      corrupt: "Hỏng dữ liệu",
      missing: "Thiếu dữ liệu",
    }[status] ?? status
  );
}

export function knowledgeGraphStatusLabel(status: string): string {
  return (
    {
      not_built: "Chưa tạo",
      ready: "Sẵn sàng",
      degraded: "Giới hạn",
      error: "Lỗi",
      corrupt: "Hỏng dữ liệu",
    }[status] ?? status
  );
}

export function knowledgeCapabilityStatusLabel(status: string): string {
  return (
    {
      not_configured: "Chưa cấu hình",
      pending: "Đang chờ",
      ready: "Sẵn sàng",
      unavailable: "Không khả dụng",
      degraded: "Giới hạn",
      error: "Lỗi",
      unknown: "Không xác định",
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
    return html`<div class="ea-empty knowledge-empty-small">Zone chưa có publication.</div>`;
  }
  return html`<div class="ea-table-wrap">
    <table class="ea-table">
      <thead>
        <tr>
          <th>Publication</th>
          <th>Nguồn</th>
          <th>Index</th>
          <th>Thời gian</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${publications.map(
          (publication) => html`<tr>
            <td>
              <strong>#${publication.publicationNumber}</strong>${publication.id ===
              activePublicationId
                ? " · Active"
                : ""}
            </td>
            <td>${publication.sourceCount}</td>
            <td>
              FTS ${publication.lexicalStatus} · Vector
              ${publication.vectorStatus}${publication.degradedOverride
                ? " · Degraded override"
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
                Rollback
              </button>
            </td>
          </tr>`,
        )}
      </tbody>
    </table>
  </div>`;
}
