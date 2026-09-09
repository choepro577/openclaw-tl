import { html, nothing } from "lit";
import { eaa } from "../../../i18n/enterprise-admin-agents.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import type {
  EnterpriseAgentFile,
  EnterpriseSharedRelationshipItem,
  EnterpriseSharedRelationshipProfile,
} from "../../enterprise/services/enterprise-api.ts";
import { renderAgentFilesPanel } from "./agent-files-policy-views.ts";

export function renderAgentRelationshipsPanel(props: {
  canonicalName: string;
  items: EnterpriseSharedRelationshipItem[];
  selectedAccountId: string;
  profile?: EnterpriseSharedRelationshipProfile;
  profileDirty: boolean;
  saving: boolean;
  activeFile?: EnterpriseAgentFile;
  fileDraft: string;
  fileBusy: boolean;
  onSelectAccount: (accountId: string) => void;
  onProfile: (patch: Partial<EnterpriseSharedRelationshipProfile>) => void;
  onSaveProfile: () => void;
  onOpenFile: (name: string) => void;
  onFileDraft: (value: string) => void;
  onResetFile: () => void;
  onSaveFile: () => void;
}) {
  const selected = props.items.find((item) => item.accountId === props.selectedAccountId);
  if (props.items.length === 0) {
    return html`<div class="ea-card ea-empty">
      ${eaa("Chưa có user nào được cấp Agent này hoặc có hồ sơ danh xưng đã lưu.")}
    </div>`;
  }
  return html`
    <div class="ea-relationship-layout">
      <aside class="ea-card ea-relationship-users" aria-label=${eaa("User dùng shared Agent")}>
        <header>
          <h3>${eaa("User")}</h3>
          <p class="ea-muted">
            ${eaa("{count} hồ sơ theo tài khoản", { count: String(props.items.length) })}
          </p>
        </header>
        <div class="ea-relationship-users__list">
          ${props.items.map(
            (item) => html`<button
              class="ea-relationship-user ${item.accountId === props.selectedAccountId
                ? "is-active"
                : ""}"
              type="button"
              @click=${() => props.onSelectAccount(item.accountId)}
            >
              <span>
                <strong>${item.displayName}</strong>
                <small>@${item.username}</small>
              </span>
              <span
                class="ea-badge ${item.assigned && item.enabled
                  ? "ea-badge--good"
                  : "ea-badge--warn"}"
                >${item.assigned && item.enabled ? ea("Được cấp") : eaa("Không hoạt động")}</span
              >
            </button>`,
          )}
        </div>
      </aside>
      <div class="ea-relationship-detail">
        ${selected && props.profile
          ? html`
              <section class="ea-card ea-panel-editor">
                <div class="ea-toolbar">
                  <div>
                    <h3>${eaa("Danh xưng của {name}", { name: selected.displayName })}</h3>
                    <p class="ea-muted">
                      ${eaa("Agent gốc: {canonical} · Tên hiệu lực: {effective}", {
                        canonical: props.canonicalName,
                        effective: props.profile.agentAlias || props.canonicalName,
                      })}
                    </p>
                  </div>
                  <span class="ea-spacer"></span>
                  <button
                    class="ea-button ea-button--primary"
                    type="button"
                    ?disabled=${!props.profileDirty || props.saving}
                    @click=${props.onSaveProfile}
                  >
                    ${props.saving ? ea("Đang lưu…") : ea("Lưu danh xưng")}
                  </button>
                </div>
                <div class="ea-form-grid ea-relationship-form">
                  <label class="ea-field"
                    >${ea("Tên riêng user gọi Agent")}
                    <input
                      class="ea-input"
                      maxlength="64"
                      placeholder=${props.canonicalName}
                      .value=${props.profile.agentAlias}
                      @input=${(event: Event) =>
                        props.onProfile({
                          agentAlias: (event.currentTarget as HTMLInputElement).value,
                        })}
                    />
                  </label>
                  <label class="ea-field"
                    >${ea("Agent tự xưng là")}
                    <input
                      class="ea-input"
                      maxlength="64"
                      .value=${props.profile.agentSelfReference}
                      @input=${(event: Event) =>
                        props.onProfile({
                          agentSelfReference: (event.currentTarget as HTMLInputElement).value,
                        })}
                    />
                  </label>
                  <label class="ea-field"
                    >${ea("Agent gọi user là")}
                    <input
                      class="ea-input"
                      maxlength="128"
                      .value=${props.profile.userAddress}
                      @input=${(event: Event) =>
                        props.onProfile({
                          userAddress: (event.currentTarget as HTMLInputElement).value,
                        })}
                    />
                  </label>
                  <label class="ea-field ea-form-grid__full"
                    >${ea("Ghi chú tương tác")}
                    <textarea
                      class="ea-textarea"
                      maxlength="1200"
                      .value=${props.profile.customInstructions}
                      @input=${(event: Event) =>
                        props.onProfile({
                          customInstructions: (event.currentTarget as HTMLTextAreaElement).value,
                        })}
                    ></textarea>
                  </label>
                </div>
                <p class="ea-panel-note">
                  ${eaa(
                    "Hồ sơ dùng khóa account + Agent và có revision riêng. Biệt danh không tham gia định tuyến hoặc phân quyền.",
                  )}
                </p>
              </section>
              <section class="ea-relationship-files">
                <div class="ea-relationship-files__heading">
                  <div>
                    <h3>${ea("Files riêng của user")}</h3>
                    <p class="ea-muted" translate="no">${selected.workspace}</p>
                  </div>
                  <span class="ea-badge ea-badge--good">${eaa("Memory tách biệt")}</span>
                </div>
                ${renderAgentFilesPanel({
                  data: { files: selected.files },
                  activeFile: props.activeFile,
                  draft: props.fileDraft,
                  busy: props.fileBusy,
                  onOpen: props.onOpenFile,
                  onDraft: props.onFileDraft,
                  onReset: props.onResetFile,
                  onSave: props.onSaveFile,
                })}
              </section>
            `
          : nothing}
      </div>
    </div>
  `;
}
