import { isRecord } from "@openclaw/normalization-core/record-coerce";
import { html, nothing } from "lit";
import { icons } from "../../../components/icons.ts";
import {
  renderSettingsRow,
  renderSettingsSection,
  renderSettingsStatus,
  renderSettingsValue,
} from "../../../components/settings-ui.ts";
import { eaa } from "../../../i18n/enterprise-admin-agents.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import type {
  EnterprisePersonalAgent,
  EnterpriseSharedAgent,
} from "../../enterprise/services/enterprise-api.ts";
import { formatDate } from "../utils.ts";

export type AdminSelectedAgent =
  | { kind: "shared"; value: EnterpriseSharedAgent }
  | { kind: "personal"; value: EnterprisePersonalAgent };

export function renderAdminAgentOverview(props: {
  selected: AdminSelectedAgent;
  data?: Record<string, unknown>;
  error: string;
  saving: boolean;
  onSave: (event: SubmitEvent) => void;
  onDelete: () => void;
}) {
  const value = props.selected.value;
  const shared = props.selected.kind === "shared" ? props.selected.value : undefined;
  const personal = props.selected.kind === "personal" ? props.selected.value : undefined;
  const agent = isRecord(props.data?.agent) ? props.data.agent : {};
  const defaults = isRecord(props.data?.defaults) ? props.data.defaults : undefined;
  const displayName = String(
    agent.name ?? shared?.name ?? personal?.ownerDisplayName ?? ea("Agent"),
  );
  const workspace = String(
    props.data?.workspace ?? agent.workspace ?? shared?.workspace ?? "default",
  );
  const model =
    (typeof agent.model === "string" ? agent.model : null) ??
    value.model ??
    String(defaults?.model ?? ea("Mặc định"));
  const thinkingDefault = typeof agent.thinkingDefault === "string" ? agent.thinkingDefault : "—";
  const selectedSkills = Array.isArray(agent.skills) ? agent.skills.length : null;
  const skillsFilter = personal
    ? `${ea("Tất cả")} ${ea("Skills")} (${personal.skillCount})`
    : selectedSkills === null
      ? `${ea("Tất cả")} ${ea("Skills")}`
      : eaa("{count} skills selected", { count: String(selectedSkills) });
  const statusReady = personal ? personal.enabled : true;
  const identity = html`
    <div class="settings-row settings-row--stacked">
      <div class="agent-identity-editor">
        <span class="agent-identity-editor__avatar" aria-hidden="true">
          <span class="agent-identity-editor__avatar-text"
            >${displayName.trim().slice(0, 1).toUpperCase() || "A"}</span
          >
        </span>
        <div class="agent-identity-editor__fields">
          <label class="field">
            <span>${ea("Tên hiển thị")}</span>
            <input
              type="text"
              name=${shared ? "name" : nothing}
              maxlength="128"
              .value=${displayName}
              ?readonly=${!shared}
              required
            />
          </label>
          <label class="field agent-identity-editor__emoji">
            <span>${shared ? ea("Agent ID") : ea("Username")}</span>
            <input
              type="text"
              .value=${shared ? shared.agentId : `@${personal?.username ?? "—"}`}
              readonly
            />
          </label>
        </div>
      </div>
      ${shared
        ? html`<div class="agent-identity-editor__actions">
            <button class="btn btn--sm primary" type="submit" ?disabled=${props.saving}>
              ${props.saving ? ea("Đang lưu…") : ea("Lưu")}
            </button>
          </div>`
        : nothing}
      <div class="settings-row__desc agent-identity-editor__hint">
        ${personal
          ? ea("Dữ liệu cá nhân; mọi thao tác đọc/sửa của quản trị viên đều được audit.")
          : ea("Tên hiển thị được lưu bằng config hash CAS để tránh ghi đè revision mới hơn.")}
      </div>
    </div>
  `;
  const overview = html`
    <dl class="settings-kv">
      <dt>${ea("Workspace")}</dt>
      <dd><code>${workspace}</code></dd>
      <dt>${eaa("Primary Model")}</dt>
      <dd><code>${model}</code></dd>
      <dt>${eaa("Runtime")}</dt>
      <dd><code>${shared?.runtimeType ?? personal?.runtimeAgentId ?? "openclaw"}</code></dd>
      <dt>${eaa("Thinking Default")}</dt>
      <dd><code>${thinkingDefault}</code></dd>
      <dt>${eaa("Skills Filter")}</dt>
      <dd>${skillsFilter}</dd>
      <dt>${eaa("Loại")}</dt>
      <dd>${shared ? ea("Shared") : ea("Personal")}</dd>
      <dt>${ea("Trạng thái")}</dt>
      <dd>
        ${renderSettingsStatus({
          kind: statusReady ? "ok" : "muted",
          label: statusReady ? eaa("Ready") : eaa("Off"),
        })}
      </dd>
    </dl>
  `;

  if (personal) {
    return html`
      <div class="settings-stack">
        ${renderSettingsSection(
          {
            title: ea("Identity"),
            description: ea("Tên và định danh hiển thị của personal agent."),
          },
          identity,
        )}
        ${renderSettingsSection(
          { title: ea("Overview"), description: ea("Workspace và cấu hình hiệu lực của agent.") },
          overview,
        )}
        ${renderSettingsSection(
          {
            title: ea("Model selection"),
            description: ea("Personal agent kế thừa model và chính sách từ template tài khoản."),
          },
          html`
            ${renderSettingsRow({
              title: eaa("Template agent"),
              control: renderSettingsValue(personal.runtimeAgentId ?? "—", { mono: true }),
            })}
            ${renderSettingsRow({
              title: ea("Model hiệu lực"),
              control: renderSettingsValue(model, { mono: true }),
            })}
            ${renderSettingsRow({
              title: ea("Quyền quản trị"),
              description: eaa(
                "Files dùng workspace riêng; Tools và Skills được resolve từ preset/entitlement.",
              ),
              control: renderSettingsValue(eaa("Managed")),
            })}
          `,
        )}
      </div>
    `;
  }

  return html`
    <form class="settings-stack" @submit=${props.onSave}>
      ${props.error ? html`<div class="callout danger" role="alert">${props.error}</div>` : nothing}
      ${renderSettingsSection(
        { title: ea("Identity"), description: ea("Tên và định danh hiển thị của shared agent.") },
        identity,
      )}
      ${renderSettingsSection(
        { title: ea("Overview"), description: ea("Workspace và cấu hình hiệu lực của agent.") },
        overview,
      )}
      ${renderSettingsSection(
        {
          title: ea("Model selection"),
          description: ea("Để trống để kế thừa cấu hình mặc định của hệ thống."),
          actions: html`<button class="btn btn--sm primary" type="submit" ?disabled=${props.saving}>
            ${props.saving ? ea("Đang lưu…") : ea("Lưu")}
          </button>`,
        },
        html`
          ${renderSettingsRow({
            title: eaa("Primary Model"),
            control: html`<input
              class="settings-input"
              name="model"
              aria-label=${eaa("Primary Model")}
              .value=${typeof agent.model === "string" ? agent.model : (shared?.model ?? "")}
              placeholder=${ea("Kế thừa model mặc định")}
            />`,
          })}
          ${renderSettingsRow({
            title: ea("Workspace"),
            control: html`<input
              class="settings-input"
              name="workspace"
              aria-label=${ea("Workspace")}
              .value=${String(agent.workspace ?? shared?.workspace ?? "")}
              placeholder=${ea("Kế thừa workspace mặc định")}
            />`,
          })}
          ${renderSettingsRow({
            title: eaa("Revision-safe"),
            description: eaa(
              "Nếu config đổi ở nơi khác, thao tác sẽ dừng để tải revision mới thay vì ghi đè.",
            ),
            control: renderSettingsStatus({ kind: "ok", label: eaa("CAS") }),
          })}
        `,
      )}
      ${renderSettingsSection(
        { title: eaa("Danger zone"), danger: true },
        renderSettingsRow({
          title: ea("Xóa shared agent"),
          description: ea("Không thể hoàn tác sau khi agent đã bị xóa."),
          control: html`<button
            class="btn btn--sm danger"
            type="button"
            ?disabled=${props.saving}
            @click=${props.onDelete}
          >
            ${ea("Xóa agent")}
          </button>`,
        }),
      )}
    </form>
  `;
}

export function renderAdminAgentCatalog(props: {
  tab: "shared" | "personal" | "delegation" | "access-requests";
  allSharedCount: number;
  allPersonalCount: number;
  accessRequestsCount: number;
  shared: EnterpriseSharedAgent[];
  personal: EnterprisePersonalAgent[];
  loading: boolean;
  error: string;
  onTab: (tab: "shared" | "personal" | "delegation" | "access-requests") => void;
  accessRequestsContent?: ReturnType<typeof html>;
  delegationContent?: ReturnType<typeof html>;
  onQuery: (query: string) => void;
  onCreate: () => void;
  onOpen: (selected: AdminSelectedAgent) => void;
}) {
  return html`<section class="ea-page">
    <header class="ea-page-header">
      <div>
        <h1>${ea("Quản lý agent")}</h1>
        <p>${eaa("Shared agent nghiệp vụ và personal agent theo từng tài khoản")}</p>
      </div>
      ${props.tab === "delegation" || props.tab === "access-requests"
        ? nothing
        : html`<button class="ea-button ea-button--primary" type="button" @click=${props.onCreate}>
            ${icons.plus} ${ea("Tạo shared agent")}
          </button>`}
    </header>
    <nav class="ea-tabs" aria-label=${eaa("Loại agent")}>
      <button
        class="ea-tab ${props.tab === "shared" ? "ea-tab--active" : ""}"
        @click=${() => props.onTab("shared")}
      >
        ${eaa("Shared Agents")} (${props.allSharedCount})
      </button>
      <button
        class="ea-tab ${props.tab === "personal" ? "ea-tab--active" : ""}"
        @click=${() => props.onTab("personal")}
      >
        ${eaa("Personal Agents")} (${props.allPersonalCount})
      </button>
      <button
        class="ea-tab ${props.tab === "delegation" ? "ea-tab--active" : ""}"
        @click=${() => props.onTab("delegation")}
      >
        ${eaa("Điều phối Agent")}
      </button>
      <button
        class="ea-tab ${props.tab === "access-requests" ? "ea-tab--active" : ""}"
        type="button"
        @click=${() => props.onTab("access-requests")}
      >
        ${eaa("Yêu cầu truy cập")} (${props.accessRequestsCount})
      </button>
    </nav>
    ${props.tab === "delegation"
      ? (props.delegationContent ?? nothing)
      : props.tab === "access-requests"
        ? (props.accessRequestsContent ?? nothing)
        : html`<div class="ea-toolbar">
              <input
                class="ea-input"
                type="search"
                placeholder=${eaa("Tìm agent…")}
                aria-label=${eaa("Tìm agent")}
                @input=${(event: Event) => {
                  if (event.currentTarget instanceof HTMLInputElement) {
                    props.onQuery(event.currentTarget.value);
                  }
                }}
              />
              <span class="ea-spacer"></span
              ><span class="ea-badge">${eaa("Reserved internal agents đã được ẩn")}</span>
            </div>
            <div class="ea-card ea-table-wrap">
              ${props.loading
                ? html`<div class="ea-loading">${ea("Đang tải catalog agent…")}</div>`
                : props.error
                  ? html`<div class="ea-empty"><p class="ea-error">${props.error}</p></div>`
                  : props.tab === "shared"
                    ? renderSharedTable(props.shared, props.onOpen)
                    : renderPersonalTable(props.personal, props.onOpen)}
            </div>`}
  </section>`;
}

function renderSharedTable(
  agents: EnterpriseSharedAgent[],
  onOpen: (selected: AdminSelectedAgent) => void,
) {
  return html`<table class="ea-table">
      <thead>
        <tr>
          <th>${ea("Agent")}</th>
          <th class="ea-table__model">${eaa("Primary Model")}</th>
          <th>${eaa("Runtime")}</th>
          <th>${ea("Workspace")}</th>
          <th>${eaa("User")}</th>
          <th>${eaa("Skill/Tool")}</th>
          <th>${ea("Cập nhật")}</th>
          <th class="ea-table__action">${ea("Thao tác")}</th>
        </tr>
      </thead>
      <tbody>
        ${agents.map(
          (agent) => html`<tr @click=${() => onOpen({ kind: "shared", value: agent })}>
            <td>
              <strong>${agent.name}</strong>
              <div class="ea-muted">${agent.agentId}</div>
            </td>
            <td class="ea-table__model">
              <span class="ea-table__model-value" title=${agent.model ?? ea("Mặc định")}
                >${agent.model ?? ea("Mặc định")}</span
              >
            </td>
            <td><span class="ea-badge ea-badge--good">${agent.runtimeType}</span></td>
            <td>${agent.workspace ?? "—"}</td>
            <td>${agent.assignedUserCount}</td>
            <td>${agent.skillCount ?? 0} / ${agent.toolCount ?? 0}</td>
            <td>${formatDate(agent.updatedAt)}</td>
            <td class="ea-table__action"><button class="ea-button">${ea("Xem")}</button></td>
          </tr>`,
        )}
      </tbody>
    </table>
    ${agents.length === 0
      ? html`<div class="ea-empty">${eaa("Không có shared agent phù hợp.")}</div>`
      : nothing}`;
}

function renderPersonalTable(
  agents: EnterprisePersonalAgent[],
  onOpen: (selected: AdminSelectedAgent) => void,
) {
  return html`<table class="ea-table">
      <thead>
        <tr>
          <th>${eaa("Owner")}</th>
          <th>${eaa("Runtime agent")}</th>
          <th>${ea("Workspace")}</th>
          <th class="ea-table__model">${eaa("Primary Model")}</th>
          <th>${eaa("Sessions")}</th>
          <th>${eaa("Skill/Tool")}</th>
          <th>${ea("Cập nhật")}</th>
          <th class="ea-table__action">${ea("Thao tác")}</th>
        </tr>
      </thead>
      <tbody>
        ${agents.map(
          (agent) => html`<tr @click=${() => onOpen({ kind: "personal", value: agent })}>
            <td>
              <strong>${agent.ownerDisplayName}</strong>
              <div class="ea-muted">@${agent.username}</div>
            </td>
            <td>${agent.runtimeAgentId ?? "—"}</td>
            <td>
              <span class="ea-badge ${agent.enabled ? "ea-badge--good" : "ea-badge--bad"}"
                >${agent.workspaceStatus}</span
              >
            </td>
            <td class="ea-table__model">
              <span class="ea-table__model-value" title=${agent.model ?? ea("Mặc định")}
                >${agent.model ?? ea("Mặc định")}</span
              >
            </td>
            <td>${agent.activeSessionCount ?? 0}</td>
            <td>${agent.skillCount ?? 0} / ${agent.toolCount ?? 0}</td>
            <td>${formatDate(agent.updatedAt)}</td>
            <td class="ea-table__action"><button class="ea-button">${ea("Xem")}</button></td>
          </tr>`,
        )}
      </tbody>
    </table>
    ${agents.length === 0
      ? html`<div class="ea-empty">${eaa("Không có personal agent phù hợp.")}</div>`
      : nothing}`;
}

export function renderCreateSharedAgentDialog(props: {
  open: boolean;
  creating: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: SubmitEvent) => void;
}) {
  if (!props.open) {
    return nothing;
  }
  return html`<openclaw-enterprise-admin-dialog
    .open=${true}
    .heading=${ea("Tạo shared agent")}
    .description=${eaa("Ghi config bằng CAS; reserved internal ID bị từ chối")}
    .onClose=${props.onClose}
  >
    <form class="ea-form-grid" @submit=${props.onSubmit}>
      <label class="ea-field"
        >${ea("Agent ID")}<input
          class="ea-input"
          name="id"
          pattern="[a-z0-9][a-z0-9_\\-]{0,63}"
          required
      /></label>
      <label class="ea-field"
        >${ea("Tên hiển thị")}<input class="ea-input" name="name" required
      /></label>
      <label class="ea-field"
        >${eaa("Model")}<input
          class="ea-input"
          name="model"
          placeholder=${eaa("provider/model hoặc để trống")}
      /></label>
      <label class="ea-field"
        >${ea("Workspace")}<input
          class="ea-input"
          name="workspace"
          placeholder=${ea("Để trống dùng mặc định")}
      /></label>
      ${props.error ? html`<p class="ea-error ea-form-grid__full">${props.error}</p>` : nothing}
      <div class="ea-form-actions ea-form-grid__full">
        <button class="ea-button" type="button" @click=${props.onClose}>${ea("Hủy")}</button
        ><button class="ea-button ea-button--primary" type="submit" ?disabled=${props.creating}>
          ${props.creating ? ea("Đang tạo…") : ea("Tạo shared agent")}
        </button>
      </div>
    </form>
  </openclaw-enterprise-admin-dialog>`;
}
