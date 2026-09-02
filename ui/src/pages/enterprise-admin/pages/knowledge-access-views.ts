import { html, nothing, type TemplateResult } from "lit";
import type { EnterpriseAccount } from "../../enterprise/services/enterprise-api.ts";
import type {
  EnterpriseKnowledgeAgentCatalog,
  EnterpriseKnowledgeReadiness,
  EnterpriseKnowledgeZoneRole,
} from "../../enterprise/services/enterprise-knowledge-api.ts";
import type { KnowledgeZoneDraft, KnowledgeZoneFormErrors } from "./knowledge-page-model.ts";

function inputFromEvent(event: Event): HTMLInputElement | undefined {
  return event.currentTarget instanceof HTMLInputElement ? event.currentTarget : undefined;
}

function textareaFromEvent(event: Event): HTMLTextAreaElement | undefined {
  return event.currentTarget instanceof HTMLTextAreaElement ? event.currentTarget : undefined;
}

function roleFromEvent(event: Event): EnterpriseKnowledgeZoneRole | "none" {
  if (!(event.currentTarget instanceof HTMLSelectElement)) {
    return "none";
  }
  const value = event.currentTarget.value;
  return value === "viewer" || value === "curator" || value === "manager" ? value : "none";
}

type ZoneEditorProps = {
  draft: KnowledgeZoneDraft;
  errors: KnowledgeZoneFormErrors;
  creating: boolean;
  readiness?: EnterpriseKnowledgeReadiness;
  disabled: boolean;
  onName: (value: string) => void;
  onSlug: (value: string) => void;
  onDescription: (value: string) => void;
  onEgressPolicy: (value: "local_only" | "external_allowed") => void;
  onGraphEnabled: (value: boolean) => void;
  onGraphEnrichmentEnabled: (value: boolean) => void;
  onGraphAutoApprovalThreshold: (value: number) => void;
  onOpenModelSetup: () => void;
};

function fieldError(field: string, message?: string): TemplateResult | typeof nothing {
  return message
    ? html`<span class="knowledge-field-error" data-field-error=${field}>${message}</span>`
    : nothing;
}

export function renderKnowledgeZoneEditorFields(props: ZoneEditorProps): TemplateResult {
  const ocr = props.readiness?.ocr;
  const ocrPermitted =
    Boolean(ocr?.ready) &&
    (ocr?.transport !== "remote" || props.draft.egressPolicy === "external_allowed");
  return html`
    <section class="knowledge-editor-section">
      <div class="knowledge-section-heading">
        <div>
          <span class="knowledge-step">01</span>
          <h3>Thông tin vùng tri thức</h3>
        </div>
        <p>Slug là định danh ổn định và không thể đổi sau khi tạo.</p>
      </div>
      <div class="ea-form-grid">
        <label class="ea-field ea-form-grid__full">
          Tên vùng tri thức
          <input
            class="ea-input"
            name="name"
            maxlength="160"
            .value=${props.draft.name}
            ?disabled=${props.disabled}
            aria-invalid=${props.errors.name ? "true" : "false"}
            @input=${(event: Event) => props.onName(inputFromEvent(event)?.value ?? "")}
          />
          ${fieldError("name", props.errors.name)}
        </label>
        <label class="ea-field ea-form-grid__full">
          Slug
          <input
            class="ea-input ea-code-input"
            name="slug"
            maxlength="64"
            .value=${props.draft.slug}
            ?readonly=${!props.creating}
            ?disabled=${props.disabled}
            aria-invalid=${props.errors.slug ? "true" : "false"}
            @input=${(event: Event) => props.onSlug(inputFromEvent(event)?.value ?? "")}
          />
          ${fieldError("slug", props.errors.slug)}
        </label>
        <label class="ea-field ea-form-grid__full">
          Mô tả
          <textarea
            class="ea-textarea"
            name="description"
            maxlength="4000"
            rows="4"
            .value=${props.draft.description}
            ?disabled=${props.disabled}
            aria-invalid=${props.errors.description ? "true" : "false"}
            @input=${(event: Event) => props.onDescription(textareaFromEvent(event)?.value ?? "")}
          ></textarea>
          <span class="knowledge-field-meta">${props.draft.description.length}/4.000</span>
          ${fieldError("description", props.errors.description)}
        </label>
      </div>
    </section>
    <section class="knowledge-editor-section">
      <div class="knowledge-section-heading">
        <div>
          <span class="knowledge-step">02</span>
          <h3>Xử lý dữ liệu & OCR</h3>
        </div>
        <p>OCR tự động chạy khi ảnh hoặc tài liệu scan không có đủ lớp text.</p>
      </div>
      <div class="knowledge-policy-options">
        <label class="knowledge-policy-option">
          <input
            type="radio"
            name="egressPolicy"
            value="local_only"
            .checked=${props.draft.egressPolicy === "local_only"}
            ?disabled=${props.disabled}
            @change=${() => props.onEgressPolicy("local_only")}
          />
          <span
            ><strong>Chỉ xử lý nội bộ</strong
            ><small>Không gửi nội dung ra provider ngoài.</small></span
          >
        </label>
        <label class="knowledge-policy-option">
          <input
            type="radio"
            name="egressPolicy"
            value="external_allowed"
            .checked=${props.draft.egressPolicy === "external_allowed"}
            ?disabled=${props.disabled}
            @change=${() => props.onEgressPolicy("external_allowed")}
          />
          <span
            ><strong>Cho phép provider ngoài</strong
            ><small>Dùng image model/OCR remote đã cấu hình khi cần.</small></span
          >
        </label>
      </div>
      <div class="knowledge-readiness-row">
        <span
          class="ea-badge ${ocrPermitted
            ? "ea-badge--good"
            : ocr?.ready
              ? "ea-badge--warn"
              : "ea-badge--bad"}"
          >${ocrPermitted
            ? "OCR sẵn sàng"
            : ocr?.ready
              ? "OCR bị policy chặn"
              : "OCR chưa cấu hình"}</span
        >
        <span class="ea-muted"
          >${ocr?.provider ?? "Chưa tìm thấy image model hoặc OCR provider"}</span
        >
        ${!ocr?.ready
          ? html`<button
              class="ea-button ea-button--small"
              type="button"
              @click=${props.onOpenModelSetup}
            >
              Cấu hình model OCR
            </button>`
          : nothing}
      </div>
      ${ocr?.transport === "remote" && props.draft.egressPolicy === "local_only"
        ? html`<div class="ea-banner">
            Provider OCR hiện tại là remote. Chọn “Cho phép provider ngoài” hoặc cấu hình provider
            OCR nội bộ để xử lý tài liệu scan trong zone này.
          </div>`
        : nothing}
    </section>
    <section class="knowledge-editor-section">
      <div class="knowledge-section-heading">
        <div>
          <span class="knowledge-step">03</span>
          <h3>Candidate Graph & enrichment</h3>
        </div>
        <p>Graph là derived index riêng của Zone; thay đổi cấu hình sẽ tạo generation mới.</p>
      </div>
      <div class="knowledge-policy-options">
        <label class="knowledge-policy-option">
          <input
            type="checkbox"
            name="graphEnabled"
            .checked=${props.draft.graphEnabled}
            ?disabled=${props.disabled || !props.readiness?.graph.enabled}
            @change=${(event: Event) =>
              props.onGraphEnabled(
                event.currentTarget instanceof HTMLInputElement && event.currentTarget.checked,
              )}
          />
          <span
            ><strong>Bật Knowledge Graph</strong
            ><small>Sinh node, backlink và quan hệ có evidence cho mỗi candidate.</small></span
          >
        </label>
        <label class="knowledge-policy-option">
          <input
            type="checkbox"
            name="graphEnrichmentEnabled"
            .checked=${props.draft.graphEnrichmentEnabled}
            ?disabled=${props.disabled || !props.draft.graphEnabled}
            @change=${(event: Event) =>
              props.onGraphEnrichmentEnabled(
                event.currentTarget instanceof HTMLInputElement && event.currentTarget.checked,
              )}
          />
          <span
            ><strong>AI enrichment có kiểm duyệt</strong
            ><small>Quan hệ nhạy cảm luôn ở proposed; không tự đi vào Agent traversal.</small></span
          >
        </label>
      </div>
      <div class="ea-form-grid knowledge-graph-settings-grid">
        <label class="ea-field">
          Ngưỡng tự duyệt quan hệ ít rủi ro
          <input
            class="ea-input"
            type="number"
            name="graphAutoApprovalThreshold"
            min="0.92"
            max="1"
            step="0.01"
            .value=${String(props.draft.graphAutoApprovalThreshold)}
            ?disabled=${props.disabled || !props.draft.graphEnabled}
            aria-invalid=${props.errors.graphAutoApprovalThreshold ? "true" : "false"}
            @input=${(event: Event) =>
              props.onGraphAutoApprovalThreshold(Number(inputFromEvent(event)?.value ?? 0))}
          />
          ${fieldError("graphAutoApprovalThreshold", props.errors.graphAutoApprovalThreshold)}
        </label>
        <div class="knowledge-readiness-row">
          <span
            class="ea-badge ${props.readiness?.graph.enrichmentReady
              ? "ea-badge--good"
              : "ea-badge--warn"}"
            >${props.readiness?.graph.enrichmentReady
              ? "Enrichment sẵn sàng"
              : "Deterministic-only"}</span
          >
          <span class="ea-muted"
            >${props.readiness?.graph.enrichmentProvider ??
            "Không có enrichment provider; graph vẫn build từ link và semantic."}</span
          >
        </div>
      </div>
      ${!props.readiness?.graph.enabled
        ? html`<div class="ea-banner">
            Global feature <code>enterprise.knowledge.graph.enabled</code> đang tắt. Cấu hình Zone
            được giữ nhưng sẽ không build graph cho đến khi Admin bật feature.
          </div>`
        : nothing}
      ${props.draft.graphEnrichmentEnabled &&
      props.readiness?.graph.enrichmentTransport === "remote" &&
      props.draft.egressPolicy === "local_only"
        ? html`<div class="ea-banner">
            Enrichment provider là remote nhưng Zone đang “Chỉ xử lý nội bộ”. Hệ thống sẽ không gửi
            dữ liệu ra ngoài và build graph ở trạng thái deterministic/semantic degraded.
          </div>`
        : nothing}
    </section>
  `;
}

type AgentChecklistProps = {
  catalog: EnterpriseKnowledgeAgentCatalog;
  selected: readonly string[];
  query: string;
  loading: boolean;
  error: string;
  disabled: boolean;
  compact?: boolean;
  onQuery: (value: string) => void;
  onToggle: (resourceKey: string, checked: boolean) => void;
};

export function renderKnowledgeAgentChecklist(props: AgentChecklistProps): TemplateResult {
  const knownKeys = new Set([
    ...props.catalog.shared.map((agent) => agent.resourceKey),
    ...props.catalog.personal.map((agent) => agent.resourceKey),
  ]);
  const query = props.query.trim().toLocaleLowerCase("vi");
  const rows = [
    ...props.catalog.shared.map((agent) => ({
      kind: "Shared",
      resourceKey: agent.resourceKey,
      name: agent.name,
      identity: agent.agentId,
      detail: agent.model ?? agent.runtimeType,
      available: true,
    })),
    ...props.catalog.personal.map((agent) => ({
      kind: "Personal",
      resourceKey: agent.resourceKey,
      name: agent.ownerDisplayName,
      identity: `@${agent.username}`,
      detail: agent.model ?? agent.workspaceStatus,
      available: agent.enabled,
    })),
    ...props.selected
      .filter((resourceKey) => !knownKeys.has(resourceKey))
      .map((resourceKey) => ({
        kind: "Orphaned",
        resourceKey,
        name: "Binding không còn trong catalog",
        identity: resourceKey,
        detail: "Bỏ chọn để thu hồi binding cũ.",
        available: false,
      })),
  ].filter((row) =>
    query
      ? `${row.name} ${row.identity} ${row.kind}`.toLocaleLowerCase("vi").includes(query)
      : true,
  );
  return html`
    <section class="knowledge-access-section ${props.compact ? "is-compact" : ""}">
      <div class="knowledge-section-heading">
        <div>
          <span class="knowledge-step">${props.compact ? "04" : "03"}</span>
          <h3>Agent được phép truy cập</h3>
        </div>
        <p>
          Binding này độc lập với quyền của người dùng và có hiệu lực sau khi zone được publish.
        </p>
      </div>
      ${props.error ? html`<div class="ea-banner ea-banner--error">${props.error}</div>` : nothing}
      <input
        class="ea-input"
        type="search"
        placeholder="Tìm theo tên, ID hoặc loại Agent…"
        .value=${props.query}
        ?disabled=${props.disabled}
        @input=${(event: Event) => props.onQuery(inputFromEvent(event)?.value ?? "")}
      />
      ${props.loading
        ? html`<div class="ea-loading">Đang tải danh sách Agent…</div>`
        : rows.length
          ? html`<div class="knowledge-access-list">
              ${rows.map((row) => {
                const checked = props.selected.includes(row.resourceKey);
                return html`<label class="knowledge-access-item">
                  <input
                    data-agent-binding=${row.resourceKey}
                    type="checkbox"
                    .checked=${checked}
                    ?disabled=${props.disabled || (!row.available && !checked)}
                    @change=${(event: Event) =>
                      props.onToggle(row.resourceKey, inputFromEvent(event)?.checked ?? false)}
                  />
                  <span class="knowledge-access-avatar" aria-hidden="true"
                    >${row.name.slice(0, 1).toUpperCase()}</span
                  >
                  <span class="knowledge-access-copy"
                    ><strong>${row.name}</strong
                    ><small>${row.identity} · ${row.detail}</small></span
                  >
                  <span class="ea-badge ${row.available ? "ea-badge--good" : "ea-badge--warn"}"
                    >${row.kind}</span
                  >
                </label>`;
              })}
            </div>`
          : html`<div class="ea-empty knowledge-empty-small">Không tìm thấy Agent phù hợp.</div>`}
      <p class="ea-muted">Đã chọn ${props.selected.length} Agent.</p>
    </section>
  `;
}

type MemberAccessProps = {
  accounts: EnterpriseAccount[];
  draft: Record<string, EnterpriseKnowledgeZoneRole | "none">;
  query: string;
  loading: boolean;
  error: string;
  disabled: boolean;
  onQuery: (value: string) => void;
  onRole: (accountId: string, role: EnterpriseKnowledgeZoneRole | "none") => void;
};

export function renderKnowledgeMemberAccess(props: MemberAccessProps): TemplateResult {
  const knownIds = new Set(props.accounts.map((account) => account.id));
  const query = props.query.trim().toLocaleLowerCase("vi");
  const rows = [
    ...props.accounts.map((account) => ({
      id: account.id,
      name: account.displayName,
      identity: `@${account.username}`,
      enabled: account.enabled,
    })),
    ...Object.keys(props.draft)
      .filter((accountId) => !knownIds.has(accountId))
      .map((accountId) => ({
        id: accountId,
        name: "Tài khoản không còn trong catalog",
        identity: accountId,
        enabled: false,
      })),
  ].filter((row) =>
    query ? `${row.name} ${row.identity}`.toLocaleLowerCase("vi").includes(query) : true,
  );
  return html`
    <section class="knowledge-access-section">
      <div class="knowledge-section-heading">
        <div><h3>Thành viên và vai trò</h3></div>
        <p>Viewer chỉ đọc; Curator nạp/kiểm thử; Manager được publish và quản lý thành viên.</p>
      </div>
      ${props.error ? html`<div class="ea-banner ea-banner--error">${props.error}</div>` : nothing}
      <input
        class="ea-input"
        type="search"
        placeholder="Tìm tài khoản…"
        .value=${props.query}
        ?disabled=${props.disabled}
        @input=${(event: Event) => props.onQuery(inputFromEvent(event)?.value ?? "")}
      />
      ${props.loading
        ? html`<div class="ea-loading">Đang tải tài khoản…</div>`
        : html`<div class="knowledge-member-list">
            ${rows.map(
              (row) => html`<div class="knowledge-member-item">
                <span class="knowledge-access-avatar" aria-hidden="true"
                  >${row.name.slice(0, 1).toUpperCase()}</span
                >
                <span class="knowledge-access-copy"
                  ><strong>${row.name}</strong
                  ><small
                    >${row.identity} · ${row.enabled ? "Đang hoạt động" : "Đã tắt"}</small
                  ></span
                >
                <select
                  class="ea-select"
                  aria-label=${`Vai trò của ${row.name}`}
                  .value=${props.draft[row.id] ?? "none"}
                  ?disabled=${props.disabled}
                  @change=${(event: Event) => props.onRole(row.id, roleFromEvent(event))}
                >
                  <option value="none">Không có quyền</option>
                  <option value="viewer">Viewer</option>
                  <option value="curator">Curator</option>
                  <option value="manager">Manager</option>
                </select>
              </div>`,
            )}
          </div>`}
    </section>
  `;
}
