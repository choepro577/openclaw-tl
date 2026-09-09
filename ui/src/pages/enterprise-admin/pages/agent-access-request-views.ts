import { html, nothing } from "lit";
import { eaa } from "../../../i18n/enterprise-admin-agents.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import type { EnterpriseAgentAccessRequest } from "../agent-access-api.ts";
import { formatDate } from "../utils.ts";

export type AgentAccessRequestListFilter = "pending" | "history";

export function agentAccessRequestStateLabel(state: EnterpriseAgentAccessRequest["state"]): string {
  return {
    pending: ea("Đang chờ duyệt"),
    approved: ea("Đã cấp quyền"),
    rejected: ea("Đã từ chối"),
    cancelled: eaa("Đã hủy"),
  }[state];
}

export function renderAgentAccessRequestList(props: {
  items: EnterpriseAgentAccessRequest[];
  filter: AgentAccessRequestListFilter;
  loading: boolean;
  error: string;
  busyId: string;
  onFilter: (filter: AgentAccessRequestListFilter) => void;
  onRefresh: () => void;
  onOpen: (item: EnterpriseAgentAccessRequest) => void;
}) {
  const items = props.items.filter((item) =>
    props.filter === "pending" ? item.state === "pending" : item.state !== "pending",
  );
  return html`<section
    class="ea-stack ea-agent-access-requests"
    aria-label=${eaa("Yêu cầu truy cập Agent")}
  >
    <div class="ea-tabs" role="tablist" aria-label=${eaa("Trạng thái yêu cầu truy cập")}>
      <button
        class="ea-tab ${props.filter === "pending" ? "ea-tab--active" : ""}"
        type="button"
        role="tab"
        aria-selected=${props.filter === "pending" ? "true" : "false"}
        @click=${() => props.onFilter("pending")}
      >
        ${eaa("Chờ duyệt")} (${props.items.filter((item) => item.state === "pending").length})
      </button>
      <button
        class="ea-tab ${props.filter === "history" ? "ea-tab--active" : ""}"
        type="button"
        role="tab"
        aria-selected=${props.filter === "history" ? "true" : "false"}
        @click=${() => props.onFilter("history")}
      >
        ${eaa("Lịch sử")} (${props.items.filter((item) => item.state !== "pending").length})
      </button>
      <span class="ea-spacer"></span>
      <button
        class="ea-button"
        type="button"
        ?disabled=${props.loading || Boolean(props.busyId)}
        @click=${props.onRefresh}
      >
        ${props.loading ? ea("Đang tải…") : ea("Làm mới")}
      </button>
    </div>
    ${props.error
      ? html`<div class="ea-error" role="alert">
          ${props.error}
          <button class="ea-button" type="button" @click=${props.onRefresh}>
            ${ea("Thử lại")}
          </button>
        </div>`
      : nothing}
    <div class="ea-card ea-table-wrap">
      ${props.loading
        ? html`<div class="ea-loading" role="status">${eaa("Đang tải yêu cầu truy cập…")}</div>`
        : html`<table class="ea-table">
            <thead>
              <tr>
                <th>${ea("Agent")}</th>
                <th>${eaa("Người yêu cầu")}</th>
                <th>${ea("Trạng thái")}</th>
                <th>${ea("Thời gian")}</th>
                <th class="ea-table__action">${ea("Thao tác")}</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(
                (item) => html`<tr>
                  <td>
                    <strong>${item.agent?.name ?? item.agentId}</strong>
                    <div class="ea-muted">${item.agentId}</div>
                  </td>
                  <td>
                    ${item.requester?.displayName ?? item.requesterAccountId}
                    ${item.requester
                      ? html`<div class="ea-muted">@${item.requester.username}</div>`
                      : nothing}
                  </td>
                  <td>
                    <span class="ea-badge">${agentAccessRequestStateLabel(item.state)}</span>
                    ${item.decisionReason
                      ? html`<div class="ea-muted">${item.decisionReason}</div>`
                      : nothing}
                  </td>
                  <td>${formatDate(item.createdAt)}</td>
                  <td class="ea-table__action">
                    <button
                      class="ea-button"
                      type="button"
                      ?disabled=${props.busyId !== ""}
                      aria-busy=${props.busyId === item.id ? "true" : "false"}
                      @click=${() => props.onOpen(item)}
                    >
                      ${props.busyId === item.id ? ea("Đang tải…") : eaa("Xem & duyệt")}
                    </button>
                  </td>
                </tr>`,
              )}
            </tbody>
          </table>`}
      ${!props.loading && items.length === 0
        ? html`<div class="ea-empty">
            ${props.filter === "pending"
              ? eaa("Không có yêu cầu đang chờ.")
              : eaa("Chưa có lịch sử yêu cầu.")}
          </div>`
        : nothing}
    </div>
  </section>`;
}
