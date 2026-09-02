import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { renderExtensionCatalogCard } from "../../../components/extensions/extension-catalog-card.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  approveAdminPluginRequest,
  listAdminPluginRequests,
  loadAdminPluginRequest,
  rejectAdminPluginRequest,
  revokeAdminPluginGrant,
  type EnterprisePluginRequest,
  type EnterprisePluginRequestDetail,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage, formatDate } from "../utils.ts";
import "../components/admin-dialog.ts";

function stateLabel(state: EnterprisePluginRequest["state"]): string {
  return {
    pending: "Đang chờ duyệt",
    approving: "Chờ Gateway load",
    available: "Đã cấp quyền",
    rejected: "Đã từ chối",
    cancelled: "User đã hủy",
    install_failed: "Cài đặt thất bại",
  }[state];
}

export class EnterpriseAdminPluginsPage extends OpenClawLightDomElement {
  @state() private items: EnterprisePluginRequest[] = [];
  @state() private selected?: EnterprisePluginRequestDetail;
  @state() private loading = true;
  @state() private busy = false;
  @state() private error = "";
  @state() private rejectionReason = "";

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      this.items = await listAdminPluginRequests();
      if (this.selected) {
        this.selected = await loadAdminPluginRequest(this.selected.request.id);
      }
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private async open(request: EnterprisePluginRequest): Promise<void> {
    this.error = "";
    try {
      this.selected = await loadAdminPluginRequest(request.id);
      this.rejectionReason = "";
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  private async approve(): Promise<void> {
    if (!this.selected) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      const result = await approveAdminPluginRequest(this.selected.request);
      this.selected = await loadAdminPluginRequest(result.request.id);
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  private async reject(): Promise<void> {
    if (!this.selected || !this.rejectionReason.trim()) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await rejectAdminPluginRequest(this.selected.request, this.rejectionReason.trim());
      this.selected = undefined;
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  private async revoke(grant: EnterprisePluginRequestDetail["grants"][number]): Promise<void> {
    this.busy = true;
    try {
      await revokeAdminPluginGrant(grant);
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  private renderDetail() {
    const detail = this.selected;
    if (!detail) {
      return nothing;
    }
    const request = detail.request;
    const canApprove = ["pending", "approving", "install_failed"].includes(request.state);
    const canReject = request.state === "pending" || request.state === "install_failed";
    return html`<openclaw-enterprise-admin-dialog
      .open=${true}
      .wide=${true}
      .heading=${request.packageName}
      .description=${`${request.packageFamily} · ${request.exactVersion}`}
      .onClose=${() => {
        this.selected = undefined;
      }}
    >
      <div class="ea-stack ea-plugin-review">
        <div class="ea-alert ea-alert--warning">
          Plugin native là tiến trình global của Gateway. Phê duyệt chỉ cấp snapshot tool cho
          account; hooks, routes, services, providers và secrets vẫn có phạm vi toàn công ty.
        </div>
        ${renderExtensionCatalogCard(
          {
            key: request.packageName,
            name: request.packageName,
            description: null,
            kindLabel: request.packageFamily,
            publisher: null,
            version: request.exactVersion,
            integrity: request.integrity,
            trustLabel: String(request.trustSnapshot.disposition ?? "clean"),
            trustDetail: [request.trustSnapshot.scanStatus, request.trustSnapshot.checkedAt]
              .filter((value): value is string => typeof value === "string" && value.length > 0)
              .join(" · "),
            requirements: [],
            statusLabel: stateLabel(request.state),
            labels: {
              publisher: "Publisher",
              version: "Phiên bản",
              integrity: "Integrity",
              trust: "Scan",
              status: "Trạng thái",
            },
          },
          { actionLabel: "", hideAction: true, onAction: () => undefined },
        )}
        <section class="ea-card ea-plugin-review__grid">
          <dl>
            <dt>Account yêu cầu</dt>
            <dd>
              ${detail.account?.displayName ?? "Không còn tồn tại"}
              ${detail.account ? html`(@${detail.account.username})` : nothing}
            </dd>
            <dt>Trạng thái</dt>
            <dd>${stateLabel(request.state)}</dd>
            <dt>Phiên bản yêu cầu</dt>
            <dd>${request.exactVersion}</dd>
            <dt>Integrity yêu cầu</dt>
            <dd class="ea-mono">${request.integrity}</dd>
            <dt>Capability digest</dt>
            <dd class="ea-mono">${request.capabilityDigest}</dd>
            <dt>Phạm vi tác động</dt>
            <dd>${detail.globalImpact.scope} · ${detail.globalImpact.nativeSurfaces.join(", ")}</dd>
          </dl>
          <dl>
            <dt>Đã cài global</dt>
            <dd>${detail.globalStatus.installed ? "Có" : "Chưa"}</dd>
            <dt>Đã load</dt>
            <dd>${detail.globalStatus.loaded ? "Có" : "Chưa"}</dd>
            <dt>Plugin ID</dt>
            <dd>${detail.globalStatus.pluginId ?? "—"}</dd>
            <dt>Version global</dt>
            <dd>${detail.globalStatus.version ?? "—"}</dd>
            <dt>Integrity global</dt>
            <dd class="ea-mono">${detail.globalStatus.integrity ?? "—"}</dd>
            <dt>Tool ownership khớp</dt>
            <dd>${detail.globalStatus.toolOwnershipMatches ? "Có" : "Chưa"}</dd>
          </dl>
        </section>
        <section class="ea-card">
          <h3>Kết quả kiểm tra artifact thực tế</h3>
          <p>
            ${detail.artifactCheck.ok ? "Hợp lệ" : detail.artifactCheck.errorCode} ·
            ${formatDate(detail.artifactCheck.checkedAt)}
          </p>
          <pre class="ea-plugin-review__json">
${JSON.stringify(request.trustSnapshot, null, 2)}</pre>
        </section>
        <section class="ea-card">
          <h3>Capability đã review</h3>
          <pre class="ea-plugin-review__json">
${JSON.stringify(request.capabilitySnapshot, null, 2)}</pre>
          <h3>Tool do active registry xác nhận</h3>
          <p>
            ${detail.globalStatus.tools.length
              ? detail.globalStatus.tools.join(", ")
              : "Chưa có tool ownership khả dụng."}
          </p>
        </section>
        <section class="ea-card">
          <h3>Account đang bị ảnh hưởng</h3>
          <p>
            ${detail.globalImpact.affectedAccounts.length
              ? detail.globalImpact.affectedAccounts.join(", ")
              : "Chưa có account nào."}
          </p>
          ${detail.grants.map(
            (grant) =>
              html`<div class="ea-plugin-grant">
                <span>${grant.accountId} · ${grant.state}</span>${grant.state === "active"
                  ? html`<button
                      class="ea-button ea-button--danger"
                      type="button"
                      ?disabled=${this.busy}
                      @click=${() => void this.revoke(grant)}
                    >
                      Thu hồi quyền
                    </button>`
                  : nothing}
              </div>`,
          )}
        </section>
        ${request.decisionReason
          ? html`<div class="ea-alert">Lý do: ${request.decisionReason}</div>`
          : nothing}
        ${canReject
          ? html`<label class="ea-field"
              >Lý do từ chối<textarea
                class="ea-textarea ea-plugin-review__reason"
                .value=${this.rejectionReason}
                @input=${(event: Event) => {
                  this.rejectionReason = (event.currentTarget as HTMLTextAreaElement).value;
                }}
              ></textarea>
            </label>`
          : nothing}
        <div class="ea-actions">
          ${canApprove
            ? html`<button
                class="ea-button ea-button--primary"
                type="button"
                ?disabled=${this.busy}
                @click=${() => void this.approve()}
              >
                ${request.state === "approving" ? "Xác nhận Gateway đã load" : "Phê duyệt"}
              </button>`
            : nothing}
          ${canReject
            ? html`<button
                class="ea-button ea-button--danger"
                type="button"
                ?disabled=${this.busy || !this.rejectionReason.trim()}
                @click=${() => void this.reject()}
              >
                Từ chối
              </button>`
            : nothing}
        </div>
      </div>
    </openclaw-enterprise-admin-dialog>`;
  }

  override render() {
    return html`<section class="ea-page">
      <header class="ea-page-header">
        <div>
          <h1>Plugins</h1>
          <p>Yêu cầu từ User</p>
        </div>
        <button class="ea-button" type="button" @click=${() => void this.load()}>Làm mới</button>
      </header>
      <div class="ea-tabs">
        <button class="ea-tab ea-tab--active" type="button">
          Yêu cầu từ User <span>${this.items.length}</span>
        </button>
      </div>
      ${this.error ? html`<p class="ea-error" role="alert">${this.error}</p>` : nothing}
      <div class="ea-card ea-table-wrap">
        ${this.loading
          ? html`<div class="ea-loading">Đang tải yêu cầu…</div>`
          : html`<table class="ea-table">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Account</th>
                  <th>Release</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th class="ea-table__action">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                ${this.items.map(
                  (item) =>
                    html`<tr>
                      <td>
                        <strong>${item.packageName}</strong>
                        <div class="ea-muted">${item.packageFamily}</div>
                      </td>
                      <td>${item.requesterAccountId}</td>
                      <td>
                        ${item.exactVersion}
                        <div class="ea-muted ea-mono">${item.integrity}</div>
                      </td>
                      <td><span class="ea-badge">${stateLabel(item.state)}</span></td>
                      <td>${formatDate(item.createdAt)}</td>
                      <td class="ea-table__action">
                        <button
                          class="ea-button"
                          type="button"
                          @click=${() => void this.open(item)}
                        >
                          Xem & duyệt
                        </button>
                      </td>
                    </tr>`,
                )}
              </tbody>
            </table>`}
      </div>
      ${this.renderDetail()}
    </section>`;
  }
}

if (!customElements.get("openclaw-enterprise-admin-plugins-page")) {
  customElements.define("openclaw-enterprise-admin-plugins-page", EnterpriseAdminPluginsPage);
}
