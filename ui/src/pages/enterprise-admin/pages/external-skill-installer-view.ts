import { html, nothing } from "lit";
import { ea } from "../../../i18n/enterprise-admin.ts";
import { resolveSafeExternalUrl } from "../../../lib/open-external-url.ts";
import { clawHubSkillRef, type ClawHubSearchResult } from "../../../lib/skills/clawhub-search.ts";
import type { ClawHubSkillDetail } from "../../../lib/skills/index.ts";
import type { EnterpriseSharedAgent } from "../../enterprise/services/enterprise-api.ts";
import type { ExternalSkillFolderSelection } from "./external-skill-folder.ts";

export type ExternalInstallMessage = {
  kind: "success" | "error";
  text: string;
  acknowledgeRef?: string;
  acknowledgeVersion?: string;
};

export type ExternalSkillInstallerViewState = {
  agents: EnterpriseSharedAgent[];
  agentId: string;
  query: string;
  results: ClawHubSearchResult[] | null;
  searching: boolean;
  searchError: string;
  detailRef: string;
  detail: ClawHubSkillDetail | null;
  detailLoading: boolean;
  detailError: string;
  installingRef: string;
  importing: boolean;
  message: ExternalInstallMessage | null;
  installedRefs: ReadonlySet<string>;
  folderSelection: ExternalSkillFolderSelection | null;
};

export type ExternalSkillInstallerViewActions = {
  onCloseInstaller: () => void;
  onCloseDetail: () => void;
  onChangeAgent: (agentId: string) => void;
  onChangeQuery: (value: string) => void;
  onSelectFolder: (files: FileList | null) => void;
  onImportFolder: () => void | Promise<void>;
  onOpenDetail: (ref: string) => void | Promise<void>;
  onInstall: (
    ref: string,
    acknowledgeClawHubRisk?: boolean,
    version?: string,
  ) => void | Promise<void>;
};

type ExternalSkillInstallerViewProps = {
  state: ExternalSkillInstallerViewState;
  actions: ExternalSkillInstallerViewActions;
};

function clampSummary(value: string, maxLength = 140): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function renderExternalMessage(
  state: ExternalSkillInstallerViewState,
  actions: ExternalSkillInstallerViewActions,
) {
  if (!state.message) {
    return nothing;
  }
  return html`
    <div
      class="ea-banner ${state.message.kind === "error"
        ? "ea-banner--error"
        : "ea-banner--success"}"
      role=${state.message.kind === "error" ? "alert" : "status"}
    >
      <div class="ea-pre-wrap">${state.message.text}</div>
      ${state.message.acknowledgeRef
        ? html`<button
            class="ea-button ea-button--danger"
            type="button"
            ?disabled=${Boolean(state.installingRef) || state.importing}
            @click=${() =>
              void actions.onInstall(
                state.message?.acknowledgeRef ?? "",
                true,
                state.message?.acknowledgeVersion,
              )}
          >
            ${ea("Tôi hiểu rủi ro và vẫn cài")}
          </button>`
        : nothing}
    </div>
  `;
}

function renderExternalIcon(result: ClawHubSearchResult, icon: string | null) {
  return icon
    ? html`<img class="ea-marketplace-icon" src=${icon} alt="" loading="lazy" />`
    : html`<span class="ea-marketplace-icon ea-marketplace-icon--fallback"
        >${result.displayName.slice(0, 1).toUpperCase()}</span
      >`;
}

function renderExternalResults(
  state: ExternalSkillInstallerViewState,
  actions: ExternalSkillInstallerViewActions,
) {
  if (state.results === null) {
    return html`<div class="ea-marketplace-empty">
      ${ea("Nhập tên hoặc chức năng cần tìm trong ClawHub.")}
    </div>`;
  }
  if (state.results.length === 0) {
    return html`<div class="ea-marketplace-empty">${ea("Không tìm thấy skill phù hợp.")}</div>`;
  }
  return html`
    <div class="ea-marketplace-list">
      ${state.results.map((result) => {
        const ref = clawHubSkillRef(result);
        const icon = result.icon
          ? resolveSafeExternalUrl(result.icon, globalThis.location.href)
          : null;
        const installed = result.installOnly === true && state.installedRefs.has(ref);
        return html`
          <article class="ea-marketplace-item">
            ${result.installOnly
              ? html`<div class="ea-marketplace-item__identity">
                  ${renderExternalIcon(result, icon)}
                  <span>
                    <strong>${result.displayName}</strong>
                    <span class="ea-muted"
                      >${result.summary
                        ? `${clampSummary(result.summary)} · `
                        : ""}${ref}${result.trustState
                        ? ` · ${ea("Chưa được ClawHub quét")}`
                        : ""}</span
                    >
                  </span>
                </div>`
              : html`<button
                  class="ea-marketplace-item__identity ea-marketplace-item__detail"
                  type="button"
                  aria-label=${`${ea("Xem chi tiết")} ${result.displayName}`}
                  @click=${() => void actions.onOpenDetail(ref)}
                >
                  ${renderExternalIcon(result, icon)}
                  <span>
                    <strong>${result.displayName}</strong>
                    <span class="ea-muted"
                      >${result.summary ? `${clampSummary(result.summary)} · ` : ""}${ref}</span
                    >
                  </span>
                </button>`}
            <div class="ea-marketplace-item__actions">
              ${result.version ? html`<span class="ea-badge">v${result.version}</span>` : nothing}
              <button
                class="ea-button"
                type="button"
                ?disabled=${installed || Boolean(state.installingRef) || state.importing}
                @click=${() => void actions.onInstall(ref)}
              >
                ${installed
                  ? ea("Đã cài")
                  : state.installingRef === ref
                    ? ea("Đang cài…")
                    : ea("Cài đặt")}
              </button>
            </div>
          </article>
        `;
      })}
    </div>
  `;
}

function renderExternalFolderImporter(
  state: ExternalSkillInstallerViewState,
  actions: ExternalSkillInstallerViewActions,
) {
  const busy = Boolean(state.installingRef) || state.importing;
  return html`
    <section class="ea-card ea-stack ea-panel-editor">
      <div>
        <h3>${ea("Nhập folder skill")}</h3>
        <p class="ea-muted">${ea("Chọn một folder chứa SKILL.md và các file hỗ trợ.")}</p>
        <p class="ea-muted">${ea("Tối đa 200 file, tổng dung lượng 10 MiB.")}</p>
      </div>
      <label class="ea-field">
        ${ea("Chọn folder skill")}
        <input
          class="ea-input"
          type="file"
          webkitdirectory
          directory
          multiple
          aria-label=${ea("Chọn folder skill")}
          ?disabled=${busy}
          @change=${(event: Event) => {
            const target = event.currentTarget;
            if (target instanceof HTMLInputElement) {
              actions.onSelectFolder(target.files);
            }
          }}
        />
      </label>
      ${state.folderSelection
        ? html`<div class="ea-banner" role="status">
            ${ea("Folder đã chọn")}: <strong>${state.folderSelection.folderName}</strong> ·
            ${state.folderSelection.files.length} ${ea("tệp")}
          </div>`
        : nothing}
      <div>
        <button
          class="ea-button ea-button--primary"
          type="button"
          ?disabled=${!state.folderSelection || busy}
          @click=${() => void actions.onImportFolder()}
        >
          ${state.importing ? ea("Đang lưu") : ea("Lưu")}
        </button>
      </div>
    </section>
  `;
}

function renderExternalDetail(
  state: ExternalSkillInstallerViewState,
  actions: ExternalSkillInstallerViewActions,
) {
  const detail = state.detail;
  const image = detail?.skill?.icon ?? detail?.owner?.image;
  const safeImage = image ? resolveSafeExternalUrl(image, globalThis.location.href) : null;
  return html`
    <div class="ea-stack">
      <div>
        <button class="ea-button" type="button" @click=${actions.onCloseDetail}>
          ${ea("← Quay lại kết quả")}
        </button>
      </div>
      ${renderExternalMessage(state, actions)}
      ${state.detailLoading
        ? html`<div class="ea-loading">${ea("Đang tải thông tin skill…")}</div>`
        : state.detailError
          ? html`<div class="ea-banner ea-banner--error" role="alert">${state.detailError}</div>`
          : detail?.skill
            ? html`
                <div class="ea-marketplace-detail">
                  <div class="ea-marketplace-detail__heading">
                    ${safeImage
                      ? html`<img class="ea-marketplace-icon" src=${safeImage} alt="" />`
                      : nothing}
                    <div>
                      <h3>${detail.skill.displayName}</h3>
                      <p class="ea-muted">
                        ${detail.owner?.displayName ?? detail.owner?.handle ?? "ClawHub"}${detail
                          .owner?.handle
                          ? ` (@${detail.owner.handle})`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <p>${detail.skill.summary ?? ea("Không có mô tả.")}</p>
                  ${detail.latestVersion
                    ? html`<p class="ea-muted">
                        ${ea("Phiên bản mới nhất")}: ${detail.latestVersion.version}
                      </p>`
                    : nothing}
                  ${detail.latestVersion?.changelog
                    ? html`<div class="ea-code">${detail.latestVersion.changelog}</div>`
                    : nothing}
                  ${detail.metadata?.os?.length
                    ? html`<p class="ea-muted">
                        ${ea("Nền tảng:")} ${detail.metadata.os.join(", ")}
                      </p>`
                    : nothing}
                  <button
                    class="ea-button ea-button--primary"
                    type="button"
                    ?disabled=${Boolean(state.installingRef) || state.importing}
                    @click=${() => void actions.onInstall(state.detailRef)}
                  >
                    ${state.installingRef === state.detailRef
                      ? ea("Đang cài…")
                      : `${ea("Cài")} ${detail.skill.displayName}`}
                  </button>
                </div>
              `
            : html`<div class="ea-marketplace-empty">
                ${ea("Không tìm thấy thông tin skill.")}
              </div>`}
    </div>
  `;
}

export function renderExternalSkillInstallerView({
  state,
  actions,
}: ExternalSkillInstallerViewProps) {
  return html`
    <openclaw-enterprise-admin-dialog
      .open=${true}
      .wide=${true}
      heading=${state.detail?.skill?.displayName ?? ea("Cài skill bên ngoài")}
      description=${ea("Tìm trên ClawHub, xem nguồn và cài vào workspace hoặc phạm vi dùng chung.")}
      .canClose=${() => !state.installingRef && !state.importing}
      .onClose=${actions.onCloseInstaller}
    >
      ${state.detailRef
        ? renderExternalDetail(state, actions)
        : html`<div class="ea-stack">
            <label class="ea-field">
              ${ea("Cài vào agent")}
              <select
                class="ea-select"
                .value=${state.agentId}
                ?disabled=${Boolean(state.installingRef) || state.importing}
                @change=${(event: Event) => {
                  const target = event.currentTarget;
                  if (target instanceof HTMLSelectElement) {
                    actions.onChangeAgent(target.value);
                  }
                }}
              >
                <option value="">${ea("Global")}</option>
                ${state.agents.map(
                  (agent) => html`<option value=${agent.agentId}>
                    ${agent.name} (${agent.agentId})
                  </option>`,
                )}
              </select>
            </label>
            <p class="ea-muted">
              ${state.agentId
                ? ea("Skill sẽ chỉ nằm trong workspace của agent đã chọn.")
                : ea("Global: skill sẽ dùng chung và có thể cấp cho các agent sau.")}
            </p>
            ${renderExternalFolderImporter(state, actions)}
            <label class="ea-field">
              ${ea("Tìm trên ClawHub")}
              <div class="ea-marketplace-search">
                <input
                  class="ea-input"
                  type="search"
                  name="external-skill-search"
                  autocomplete="off"
                  placeholder=${ea("Ví dụ: email, github, calendar…")}
                  .value=${state.query}
                  @input=${(event: Event) => {
                    const target = event.currentTarget;
                    if (target instanceof HTMLInputElement) {
                      actions.onChangeQuery(target.value);
                    }
                  }}
                />
                ${state.searching
                  ? html`<span class="ea-muted">${ea("Đang tìm…")}</span>`
                  : nothing}
              </div>
            </label>
            ${state.searchError
              ? html`<div class="ea-banner ea-banner--error" role="alert">
                  ${state.searchError}
                </div>`
              : nothing}
            ${renderExternalMessage(state, actions)} ${renderExternalResults(state, actions)}
          </div>`}
    </openclaw-enterprise-admin-dialog>
  `;
}
