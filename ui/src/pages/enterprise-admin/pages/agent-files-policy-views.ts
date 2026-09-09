import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { normalizeToolPolicyName } from "../../../../../src/agents/tool-policy-shared.js";
import { renderHubTabs } from "../../../components/hub-tabs.ts";
import { icons } from "../../../components/icons.ts";
import { toSanitizedMarkdownHtml } from "../../../components/markdown.ts";
import type { OpenClawModalDialog } from "../../../components/modal-dialog.ts";
import { eaa } from "../../../i18n/enterprise-admin-agents.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import "../../../components/modal-dialog.ts";
import { i18n } from "../../../i18n/index.ts";
import { isAllowedByPolicy, matchesList, resolveToolProfile } from "../../../lib/agents/display.ts";
import type { EnterpriseAgentFile } from "../../enterprise/services/enterprise-api.ts";
import { formatDate } from "../utils.ts";

type RecordValue = Record<string, unknown>;

export function renderAgentFilesPanel(props: {
  data: RecordValue;
  activeFile?: EnterpriseAgentFile;
  draft: string;
  busy: boolean;
  onOpen: (name: string) => void;
  onDraft: (value: string) => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const files = Array.isArray(props.data.files) ? (props.data.files as Array<RecordValue>) : [];
  const dirty = Boolean(props.activeFile && props.draft !== props.activeFile.content);
  const activeName = props.activeFile?.name ?? null;
  const previewHtml = props.activeFile
    ? toSanitizedMarkdownHtml(props.draft, { codeBlockChrome: "none", mode: "document" })
    : "";
  return html`
    <section class="ea-card ea-file-panel">
      <div class="ea-agent-file-tabs">
        ${renderHubTabs({
          id: "enterprise-agent-files",
          active: activeName,
          tabs: files.map((file) => ({
            value: String(file.name ?? ""),
            label: String(file.name ?? "").replace(/\.md$/iu, ""),
            badge: file.missing ? eaa("missing") : undefined,
            disabled: props.busy,
          })),
          ariaLabel: eaa("Core files"),
          panelId: "enterprise-agent-file-panel",
          variant: "sub",
          onSelect: props.onOpen,
        })}
      </div>
      <div
        id="enterprise-agent-file-panel"
        class="ea-file-panel__content"
        role="tabpanel"
        aria-labelledby=${activeName ? `enterprise-agent-files-tab-${activeName}` : nothing}
      >
        ${props.activeFile
          ? html`
              <header class="ea-file-panel__header">
                <div class="ea-file-panel__path ea-muted" translate="no">
                  ${props.activeFile.path}
                </div>
                <div class="ea-file-panel__actions">
                  <button
                    class="ea-button"
                    type="button"
                    @click=${(event: Event) =>
                      (event.currentTarget as HTMLElement)
                        .closest(".ea-file-panel")
                        ?.querySelector<OpenClawModalDialog>("openclaw-modal-dialog")
                        ?.show()}
                  >
                    ${icons.eye} ${eaa("Preview")}
                  </button>
                  <button
                    class="ea-button"
                    type="button"
                    ?disabled=${!props.activeFile.writable || !dirty || props.busy}
                    @click=${props.onReset}
                  >
                    ${ea("Hoàn tác")}
                  </button>
                  <button
                    class="ea-button ea-button--primary"
                    type="button"
                    ?disabled=${!props.activeFile.writable || !dirty || props.busy}
                    @click=${props.onSave}
                  >
                    ${props.busy ? ea("Đang lưu…") : ea("Lưu file")}
                  </button>
                </div>
              </header>
              ${props.activeFile.missing
                ? html`<div class="ea-banner">
                    ${ea("File chưa tồn tại và sẽ được tạo khi lưu.")}
                  </div>`
                : nothing}
              <label class="ea-field ea-file-panel__editor">
                ${ea("Nội dung")}
                <textarea
                  class="ea-textarea ea-file-editor"
                  .value=${props.draft}
                  ?disabled=${props.busy || !props.activeFile.writable}
                  @input=${(event: Event) =>
                    props.onDraft((event.currentTarget as HTMLTextAreaElement).value)}
                ></textarea>
              </label>
              <openclaw-modal-dialog
                manual
                label=${props.activeFile.name}
                style="--openclaw-modal-width: min(1040px, calc(100vw - 32px));"
              >
                <div class="md-preview-dialog__panel">
                  <div class="md-preview-dialog__header">
                    <div class="md-preview-dialog__header-main">
                      <div class="md-preview-dialog__eyebrow">
                        ${icons.scrollText}<span>${eaa("Markdown Preview")}</span>
                      </div>
                      <div class="md-preview-dialog__title-wrap">
                        <div class="md-preview-dialog__title" translate="no">
                          ${props.activeFile.name}
                        </div>
                        <div class="md-preview-dialog__path mono" translate="no">
                          ${props.activeFile.path}
                        </div>
                      </div>
                    </div>
                    <div class="md-preview-dialog__actions">
                      <button
                        type="button"
                        class="btn btn--sm md-preview-icon-btn"
                        aria-label=${ea("Đóng preview")}
                        @click=${(event: Event) =>
                          (event.currentTarget as HTMLElement)
                            .closest<OpenClawModalDialog>("openclaw-modal-dialog")
                            ?.hide()}
                      >
                        <span aria-hidden="true">${icons.x}</span>
                      </button>
                    </div>
                  </div>
                  <div class="md-preview-dialog__meta">
                    <div
                      class="md-preview-dialog__chip ${props.activeFile.missing
                        ? "is-missing"
                        : dirty
                          ? "is-dirty"
                          : "is-synced"}"
                    >
                      <strong
                        >${props.activeFile.missing
                          ? ea("Sẽ tạo khi lưu")
                          : dirty
                            ? ea("Preview bản nháp")
                            : ea("Bản đã đồng bộ")}</strong
                      >
                    </div>
                    <div class="md-preview-dialog__chip">
                      <strong
                        >${new Intl.NumberFormat(i18n.getLocale()).format(
                          new TextEncoder().encode(props.draft).length,
                        )}
                        B</strong
                      >
                      <span
                        >${props.activeFile.updatedAt
                          ? formatDate(props.activeFile.updatedAt)
                          : ea("Chưa có thời gian cập nhật")}</span
                      >
                    </div>
                  </div>
                  <div class="md-preview-dialog__body">
                    <article class="md-preview-dialog__reader sidebar-markdown">
                      ${unsafeHTML(previewHtml)}
                    </article>
                  </div>
                </div>
              </openclaw-modal-dialog>
            `
          : html`<div class="ea-empty">${eaa("Chọn một core file để xem và chỉnh sửa.")}</div>`}
      </div>
      <p class="ea-panel-note">
        ${eaa(
          "File được kiểm tra revision trước khi lưu. Audit chỉ ghi tên, kích thước và hành động; không ghi nội dung file.",
        )}
      </p>
    </section>
  `;
}

export function renderAgentToolsPanel(props: {
  data: RecordValue;
  profile: "minimal" | "coding" | "messaging" | "full" | null;
  alsoAllow: string[];
  deny: string[];
  dirty: boolean;
  saving: boolean;
  onProfile: (value: "minimal" | "coding" | "messaging" | "full" | null) => void;
  onToggle: (toolId: string, enabled: boolean, baseAllowed: boolean) => void;
  onSave: () => void;
}) {
  const catalog = (props.data.tools ?? {}) as RecordValue;
  const groups = Array.isArray(catalog.groups) ? (catalog.groups as Array<RecordValue>) : [];
  const tools: Array<RecordValue> = groups.flatMap((group) =>
    (Array.isArray(group.tools) ? group.tools : []).map((tool) => ({
      ...(tool as RecordValue),
      groupLabel: group.label,
      groupSource: group.source,
    })),
  );
  const editable = props.data.editable !== false;
  const accountScoped = typeof props.data.accountId === "string";
  const lockedToolIds = new Set(
    (Array.isArray(props.data.lockedToolIds) ? props.data.lockedToolIds : [])
      .map((toolId) => normalizeToolPolicyName(String(toolId)))
      .filter(Boolean),
  );
  const inheritedProfile =
    props.data.inheritedProfile === "minimal" ||
    props.data.inheritedProfile === "coding" ||
    props.data.inheritedProfile === "messaging" ||
    props.data.inheritedProfile === "full"
      ? props.data.inheritedProfile
      : "full";
  const basePolicy = resolveToolProfile(props.profile ?? inheritedProfile);
  const effectiveInventory = (props.data.effectiveTools ?? {}) as RecordValue;
  const effectiveGroups = Array.isArray(effectiveInventory.groups)
    ? (effectiveInventory.groups as Array<RecordValue>)
    : [];
  const effectiveToolIds = new Set(
    effectiveGroups.flatMap((group) =>
      (Array.isArray(group.tools) ? group.tools : [])
        .map((tool) => normalizeToolPolicyName(String((tool as RecordValue).id ?? "")))
        .filter(Boolean),
    ),
  );
  const hasEffectiveInventory = Array.isArray(effectiveInventory.groups);
  const sandboxState = (props.data.sandboxState ?? {}) as RecordValue;
  const sandboxEnabled = sandboxState.enabled === true;
  const sandboxToolStates = new Map(
    (Array.isArray(sandboxState.tools) ? sandboxState.tools : []).map((tool) => {
      const state = tool as RecordValue;
      return [normalizeToolPolicyName(String(state.id ?? "")), state] as const;
    }),
  );
  return html`
    <div class="ea-card ea-panel-editor">
      <div class="ea-toolbar">
        <label class="ea-field ea-inline-field"
          >${eaa("Profile")}
          <select
            class="ea-select"
            .value=${props.profile ?? "inherit"}
            ?disabled=${!editable}
            @change=${(event: Event) => {
              const value = (event.currentTarget as HTMLSelectElement).value;
              props.onProfile(
                value === "minimal" ||
                  value === "coding" ||
                  value === "messaging" ||
                  value === "full"
                  ? value
                  : null,
              );
            }}
          >
            <option value="inherit">${ea("Kế thừa")}</option>
            <option value="minimal">${eaa("Minimal")}</option>
            <option value="coding">${eaa("Coding")}</option>
            <option value="messaging">${eaa("Messaging")}</option>
            <option value="full">${eaa("Full")}</option>
          </select></label
        >
        <span class="ea-spacer"></span>
        <button
          class="ea-button ea-button--primary"
          type="button"
          ?disabled=${!editable || !props.dirty || props.saving}
          @click=${props.onSave}
        >
          ${props.saving ? ea("Đang lưu…") : ea("Lưu tool policy")}
        </button>
      </div>
      <p class="ea-muted">
        ${editable
          ? accountScoped
            ? eaa(
                "Policy được lưu riêng theo tài khoản này và áp dụng cho các phiên của tài khoản; không sửa shared template hoặc global config.",
              )
            : eaa("Profile tạo quyền nền; override bật/tắt từng tool được lưu theo agent.")
          : hasEffectiveInventory
            ? eaa("Tool có hiệu lực theo quyền của tài khoản: {enabled}/{total}", {
                enabled: String(effectiveToolIds.size),
                total: String(tools.length),
              })
            : eaa("Policy hiệu lực được quản lý theo quyền của tài khoản.")}
      </p>
    </div>
    <div class="ea-card ea-table-wrap" style="margin-top: 14px">
      <table class="ea-table" style="min-width: 680px">
        <thead>
          <tr>
            <th>${ea("Tool")}</th>
            <th>${ea("Mô tả")}</th>
            <th>${ea("Nguồn")}</th>
            <th>${ea("Quyền")}</th>
            <th>${eaa("Sandbox")}</th>
          </tr>
        </thead>
        <tbody>
          ${tools.map((tool) => {
            const id = String(tool.id ?? "");
            const normalizedId = normalizeToolPolicyName(id);
            const locked = lockedToolIds.has(normalizedId);
            const baseAllowed = isAllowedByPolicy(id, basePolicy);
            const enabled =
              !locked &&
              (!editable && hasEffectiveInventory
                ? effectiveToolIds.has(normalizedId)
                : (baseAllowed || matchesList(id, props.alsoAllow)) &&
                  !matchesList(id, props.deny));
            const sandboxToolState = sandboxToolStates.get(normalizedId);
            const sandboxStatus = String(sandboxToolState?.status ?? "");
            const sandboxLabel =
              sandboxStatus === "open"
                ? sandboxEnabled
                  ? ea("Sandbox đã mở")
                  : ea("Sandbox chưa bật")
                : sandboxStatus === "blocked"
                  ? ea("Sandbox đang chặn")
                  : sandboxStatus === "locked"
                    ? ea("Bị khóa")
                    : sandboxStatus === "setup_required"
                      ? ea("Được cấp, cần cấu hình")
                      : "—";
            return html`<tr>
              <td><strong>${String(tool.name ?? tool.id ?? "—")}</strong></td>
              <td>${String(tool.description ?? "—")}</td>
              <td>${String(tool.groupLabel ?? tool.groupSource ?? tool.source ?? "—")}</td>
              <td>
                <label class="ea-toggle-label">
                  <input
                    type="checkbox"
                    .checked=${enabled}
                    ?disabled=${!editable || locked}
                    @change=${(event: Event) =>
                      props.onToggle(
                        id,
                        (event.currentTarget as HTMLInputElement).checked,
                        baseAllowed,
                      )}
                  />
                  <span>${locked ? ea("Bị khóa") : enabled ? ea("Được cấp") : ea("Đã chặn")}</span>
                </label>
              </td>
              <td>
                <span
                  class="ea-badge ea-sandbox-state ${sandboxStatus === "open" && sandboxEnabled
                    ? "ea-badge--good"
                    : sandboxStatus
                      ? "ea-badge--warn"
                      : ""}"
                  title=${String(sandboxToolState?.reason ?? "")}
                  >${sandboxLabel}</span
                >
              </td>
            </tr>`;
          })}
        </tbody>
      </table>
    </div>
  `;
}

export function renderAgentSkillsPanel(props: {
  data: RecordValue;
  allowlist: string[] | null;
  dirty: boolean;
  saving: boolean;
  onToggle: (name: string, enabled: boolean, allNames: string[]) => void;
  onInherit: () => void;
  onSave: () => void;
}) {
  const status = (props.data.skills ?? {}) as RecordValue;
  const skills = Array.isArray(status.skills) ? (status.skills as Array<RecordValue>) : [];
  const allNames = skills.map((skill) => String(skill.name ?? "")).filter(Boolean);
  const editable = props.data.editable !== false;
  return html`
    <div class="ea-card ea-panel-editor">
      <div class="ea-toolbar">
        <div>
          <h3>${ea("Skill binding")}</h3>
          <p class="ea-muted">
            ${props.allowlist === null
              ? ea("Đang kế thừa: tất cả skill phù hợp được phép.")
              : eaa("Skill có hiệu lực theo quyền của tài khoản: {enabled}/{total}", {
                  enabled: String(props.allowlist.length),
                  total: String(skills.length),
                })}
          </p>
        </div>
        <span class="ea-spacer"></span>
        <button class="ea-button" type="button" ?disabled=${!editable} @click=${props.onInherit}>
          ${ea("Đặt lại kế thừa")}
        </button>
        <button
          class="ea-button ea-button--primary"
          type="button"
          ?disabled=${!editable || !props.dirty || props.saving}
          @click=${props.onSave}
        >
          ${props.saving ? ea("Đang lưu…") : ea("Lưu skill binding")}
        </button>
      </div>
    </div>
    <div class="ea-card ea-table-wrap" style="margin-top: 14px">
      <table class="ea-table" style="min-width: 680px">
        <thead>
          <tr>
            <th>${ea("Skill")}</th>
            <th>${ea("Trạng thái")}</th>
            <th>${ea("Lý do setup")}</th>
            <th>${ea("Được dùng")}</th>
          </tr>
        </thead>
        <tbody>
          ${skills.map((skill) => {
            const name = String(skill.name ?? "");
            const enabled = props.allowlist === null || props.allowlist.includes(name);
            const missing = skill.missing as RecordValue | undefined;
            const missingItems = missing
              ? Object.entries(missing)
                  .filter(([, value]) => Array.isArray(value) && value.length > 0)
                  .flatMap(([key, value]) => (value as unknown[]).map((item) => `${key}: ${item}`))
              : [];
            return html`<tr>
              <td><strong>${String(skill.name ?? skill.key ?? "—")}</strong></td>
              <td>
                <span class="ea-badge ${skill.eligible ? "ea-badge--good" : "ea-badge--warn"}"
                  >${skill.disabled
                    ? ea("Disabled")
                    : skill.eligible
                      ? eaa("ReadyStatus")
                      : eaa("NeedsSetup")}</span
                >
              </td>
              <td>${missingItems.join(" · ") || "—"}</td>
              <td>
                <label class="ea-toggle-label">
                  <input
                    type="checkbox"
                    .checked=${enabled}
                    ?disabled=${!editable}
                    @change=${(event: Event) =>
                      props.onToggle(
                        name,
                        (event.currentTarget as HTMLInputElement).checked,
                        allNames,
                      )}
                  />
                  <span>${enabled ? ea("Bật") : ea("Tắt")}</span>
                </label>
              </td>
            </tr>`;
          })}
        </tbody>
      </table>
    </div>
  `;
}
