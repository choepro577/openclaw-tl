import { html, nothing } from "lit";
import { icons } from "../../../components/icons.ts";
import {
  renderSettingsRow,
  renderSettingsSection,
  renderSettingsStatus,
  renderSettingsValue,
} from "../../../components/settings-ui.ts";
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
  const agent = (props.data?.agent ?? {}) as Record<string, unknown>;
  const displayName = String(agent.name ?? shared?.name ?? personal?.ownerDisplayName ?? "Agent");
  const workspace = String(
    props.data?.workspace ?? agent.workspace ?? shared?.workspace ?? "default",
  );
  const model =
    (typeof agent.model === "string" ? agent.model : null) ??
    value.model ??
    String((props.data?.defaults as Record<string, unknown> | undefined)?.model ?? "Mặc định");
  const thinkingDefault = typeof agent.thinkingDefault === "string" ? agent.thinkingDefault : "—";
  const selectedSkills = Array.isArray(agent.skills) ? agent.skills.length : null;
  const skillsFilter = personal
    ? `Tất cả skills (${personal.skillCount})`
    : selectedSkills === null
      ? "Tất cả skills"
      : `${selectedSkills} skills đã chọn`;
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
            <span>Tên hiển thị</span>
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
            <span>${shared ? "Agent ID" : "Username"}</span>
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
              ${props.saving ? "Đang lưu…" : "Lưu"}
            </button>
          </div>`
        : nothing}
      <div class="settings-row__desc agent-identity-editor__hint">
        ${personal
          ? "Dữ liệu cá nhân; mọi thao tác đọc/sửa của quản trị viên đều được audit."
          : "Tên hiển thị được lưu bằng config hash CAS để tránh ghi đè revision mới hơn."}
      </div>
    </div>
  `;
  const overview = html`
    <dl class="settings-kv">
      <dt>Workspace</dt>
      <dd><code>${workspace}</code></dd>
      <dt>Primary Model</dt>
      <dd><code>${model}</code></dd>
      <dt>Runtime</dt>
      <dd><code>${shared?.runtimeType ?? personal?.runtimeAgentId ?? "openclaw"}</code></dd>
      <dt>Thinking Default</dt>
      <dd><code>${thinkingDefault}</code></dd>
      <dt>Skills Filter</dt>
      <dd>${skillsFilter}</dd>
      <dt>Loại</dt>
      <dd>${shared ? "Shared" : "Personal"}</dd>
      <dt>Trạng thái</dt>
      <dd>
        ${renderSettingsStatus({
          kind: statusReady ? "ok" : "muted",
          label: statusReady ? "Ready" : "Off",
        })}
      </dd>
    </dl>
  `;

  if (personal) {
    return html`
      <div class="settings-stack">
        ${renderSettingsSection(
          { title: "Identity", description: "Tên và định danh hiển thị của personal agent." },
          identity,
        )}
        ${renderSettingsSection(
          { title: "Overview", description: "Workspace và cấu hình hiệu lực của agent." },
          overview,
        )}
        ${renderSettingsSection(
          {
            title: "Model selection",
            description: "Personal agent kế thừa model và chính sách từ template tài khoản.",
          },
          html`
            ${renderSettingsRow({
              title: "Template agent",
              control: renderSettingsValue(personal.runtimeAgentId ?? "—", { mono: true }),
            })}
            ${renderSettingsRow({
              title: "Model hiệu lực",
              control: renderSettingsValue(model, { mono: true }),
            })}
            ${renderSettingsRow({
              title: "Quyền quản trị",
              description:
                "Files dùng workspace riêng; Tools và Skills được resolve từ preset/entitlement.",
              control: renderSettingsValue("Managed"),
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
        { title: "Identity", description: "Tên và định danh hiển thị của shared agent." },
        identity,
      )}
      ${renderSettingsSection(
        { title: "Overview", description: "Workspace và cấu hình hiệu lực của agent." },
        overview,
      )}
      ${renderSettingsSection(
        {
          title: "Model selection",
          description: "Để trống để kế thừa cấu hình mặc định của hệ thống.",
          actions: html`<button class="btn btn--sm primary" type="submit" ?disabled=${props.saving}>
            ${props.saving ? "Đang lưu…" : "Lưu"}
          </button>`,
        },
        html`
          ${renderSettingsRow({
            title: "Primary Model",
            control: html`<input
              class="settings-input"
              name="model"
              aria-label="Primary Model"
              .value=${typeof agent.model === "string" ? agent.model : (shared?.model ?? "")}
              placeholder="Kế thừa model mặc định"
            />`,
          })}
          ${renderSettingsRow({
            title: "Workspace",
            control: html`<input
              class="settings-input"
              name="workspace"
              aria-label="Workspace"
              .value=${String(agent.workspace ?? shared?.workspace ?? "")}
              placeholder="Kế thừa workspace mặc định"
            />`,
          })}
          ${renderSettingsRow({
            title: "Revision-safe",
            description:
              "Nếu config đổi ở nơi khác, thao tác sẽ dừng để tải revision mới thay vì ghi đè.",
            control: renderSettingsStatus({ kind: "ok", label: "CAS" }),
          })}
        `,
      )}
      ${renderSettingsSection(
        { title: "Danger zone", danger: true },
        renderSettingsRow({
          title: "Xóa shared agent",
          description: "Không thể hoàn tác sau khi agent đã bị xóa.",
          control: html`<button
            class="btn btn--sm danger"
            type="button"
            ?disabled=${props.saving}
            @click=${props.onDelete}
          >
            Xóa agent
          </button>`,
        }),
      )}
    </form>
  `;
}

export function renderAdminAgentCatalog(props: {
  tab: "shared" | "personal";
  allSharedCount: number;
  allPersonalCount: number;
  shared: EnterpriseSharedAgent[];
  personal: EnterprisePersonalAgent[];
  loading: boolean;
  error: string;
  onTab: (tab: "shared" | "personal") => void;
  onQuery: (query: string) => void;
  onCreate: () => void;
  onOpen: (selected: AdminSelectedAgent) => void;
}) {
  return html`<section class="ea-page">
    <header class="ea-page-header">
      <div>
        <h1>Quản lý agent</h1>
        <p>Shared agent nghiệp vụ và personal agent theo từng tài khoản</p>
      </div>
      <button class="ea-button ea-button--primary" type="button" @click=${props.onCreate}>
        ${icons.plus} Tạo shared agent
      </button>
    </header>
    <nav class="ea-tabs" aria-label="Loại agent">
      <button
        class="ea-tab ${props.tab === "shared" ? "ea-tab--active" : ""}"
        @click=${() => props.onTab("shared")}
      >
        Shared Agents (${props.allSharedCount})
      </button>
      <button
        class="ea-tab ${props.tab === "personal" ? "ea-tab--active" : ""}"
        @click=${() => props.onTab("personal")}
      >
        Personal Agents (${props.allPersonalCount})
      </button>
    </nav>
    <div class="ea-toolbar">
      <input
        class="ea-input"
        type="search"
        placeholder="Tìm agent…"
        aria-label="Tìm agent"
        @input=${(event: Event) => props.onQuery((event.currentTarget as HTMLInputElement).value)}
      />
      <span class="ea-spacer"></span
      ><span class="ea-badge">Reserved internal agents đã được ẩn</span>
    </div>
    <div class="ea-card ea-table-wrap">
      ${props.loading
        ? html`<div class="ea-loading">Đang tải catalog agent…</div>`
        : props.error
          ? html`<div class="ea-empty"><p class="ea-error">${props.error}</p></div>`
          : props.tab === "shared"
            ? renderSharedTable(props.shared, props.onOpen)
            : renderPersonalTable(props.personal, props.onOpen)}
    </div>
  </section>`;
}

function renderSharedTable(
  agents: EnterpriseSharedAgent[],
  onOpen: (selected: AdminSelectedAgent) => void,
) {
  return html`<table class="ea-table">
      <thead>
        <tr>
          <th>Agent</th>
          <th>Model</th>
          <th>Runtime</th>
          <th>Workspace</th>
          <th>User</th>
          <th>Skill/Tool</th>
          <th>Cập nhật</th>
          <th class="ea-table__action">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        ${agents.map(
          (agent) => html`<tr @click=${() => onOpen({ kind: "shared", value: agent })}>
            <td>
              <strong>${agent.name}</strong>
              <div class="ea-muted">${agent.agentId}</div>
            </td>
            <td>${agent.model ?? "Mặc định"}</td>
            <td><span class="ea-badge ea-badge--good">${agent.runtimeType}</span></td>
            <td>${agent.workspace ?? "—"}</td>
            <td>${agent.assignedUserCount}</td>
            <td>${agent.skillCount ?? 0} / ${agent.toolCount ?? 0}</td>
            <td>${formatDate(agent.updatedAt)}</td>
            <td class="ea-table__action"><button class="ea-button">Xem</button></td>
          </tr>`,
        )}
      </tbody>
    </table>
    ${agents.length === 0
      ? html`<div class="ea-empty">Không có shared agent phù hợp.</div>`
      : nothing}`;
}

function renderPersonalTable(
  agents: EnterprisePersonalAgent[],
  onOpen: (selected: AdminSelectedAgent) => void,
) {
  return html`<table class="ea-table">
      <thead>
        <tr>
          <th>Owner</th>
          <th>Runtime agent</th>
          <th>Workspace</th>
          <th>Model</th>
          <th>Sessions</th>
          <th>Skill/Tool</th>
          <th>Cập nhật</th>
          <th class="ea-table__action">Thao tác</th>
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
            <td>${agent.model ?? "Mặc định"}</td>
            <td>${agent.activeSessionCount ?? 0}</td>
            <td>${agent.skillCount ?? 0} / ${agent.toolCount ?? 0}</td>
            <td>${formatDate(agent.updatedAt)}</td>
            <td class="ea-table__action"><button class="ea-button">Xem</button></td>
          </tr>`,
        )}
      </tbody>
    </table>
    ${agents.length === 0
      ? html`<div class="ea-empty">Không có personal agent phù hợp.</div>`
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
    heading="Tạo shared agent"
    description="Ghi config bằng CAS; reserved internal ID bị từ chối"
    .onClose=${props.onClose}
  >
    <form class="ea-form-grid" @submit=${props.onSubmit}>
      <label class="ea-field"
        >Agent ID<input class="ea-input" name="id" pattern="[a-z0-9][a-z0-9_-]{0,63}" required
      /></label>
      <label class="ea-field">Tên hiển thị<input class="ea-input" name="name" required /></label>
      <label class="ea-field"
        >Model<input class="ea-input" name="model" placeholder="provider/model hoặc để trống"
      /></label>
      <label class="ea-field"
        >Workspace<input class="ea-input" name="workspace" placeholder="Để trống dùng mặc định"
      /></label>
      ${props.error ? html`<p class="ea-error ea-form-grid__full">${props.error}</p>` : nothing}
      <div class="ea-form-actions ea-form-grid__full">
        <button class="ea-button" type="button" @click=${props.onClose}>Hủy</button
        ><button class="ea-button ea-button--primary" type="submit" ?disabled=${props.creating}>
          ${props.creating ? "Đang tạo…" : "Tạo shared agent"}
        </button>
      </div>
    </form>
  </openclaw-enterprise-admin-dialog>`;
}
