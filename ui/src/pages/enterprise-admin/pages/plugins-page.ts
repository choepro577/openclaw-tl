import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { renderExtensionCatalogCard } from "../../../components/extensions/extension-catalog-card.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { ENTERPRISE_CODEX_PLUGINS_VISIBLE } from "../../enterprise-plugin-visibility.ts";
import {
  approveAdminPluginRequest,
  approveAdminCodexPluginRequest,
  listAdminCodexPluginRequests,
  listAdminPluginRequests,
  loadAdminCodexPluginRequest,
  loadAdminPluginRequest,
  rejectAdminCodexPluginRequest,
  rejectAdminPluginRequest,
  revokeAdminPluginGrant,
  type EnterpriseCodexPluginRequest,
  type EnterpriseCodexPluginRequestDetail,
  type EnterprisePluginRequest,
  type EnterprisePluginRequestDetail,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage, formatDate } from "../utils.ts";
import "../components/admin-dialog.ts";

function stateLabel(requestState: EnterprisePluginRequest["state"]): string {
  return {
    pending: ea("Đang chờ duyệt"),
    approving: ea("Chờ Gateway load"),
    available: ea("Đã cấp quyền"),
    rejected: ea("Đã từ chối"),
    cancelled: ea("User đã hủy"),
    install_failed: ea("Cài đặt thất bại"),
  }[requestState];
}

function codexStateLabel(requestState: EnterpriseCodexPluginRequest["state"]): string {
  return {
    pending: ea("Đang chờ duyệt"),
    approving: ea("Chờ Codex kích hoạt"),
    available: ea("Đã cấp quyền"),
    rejected: ea("Đã từ chối"),
    cancelled: ea("User đã hủy"),
    install_failed: ea("Cài đặt thất bại"),
  }[requestState];
}

function pluginGrantStateLabel(
  grantState: EnterprisePluginRequestDetail["grants"][number]["state"],
): string {
  switch (grantState) {
    case "active":
      return ea("Đang hoạt động");
    case "suspended_version_mismatch":
      return ea("Lệch phiên bản");
    case "unavailable":
      return ea("Không được dùng");
    case "orphaned":
      return ea("Không còn liên kết");
    case "revoked":
      return ea("Đã thu hồi");
  }
}

function codexGrantStateLabel(
  grantState: NonNullable<EnterpriseCodexPluginRequestDetail["grant"]>["state"],
): string {
  switch (grantState) {
    case "active":
      return ea("Đang hoạt động");
    case "disabled":
      return ea("Đã tắt");
    case "unavailable":
      return ea("Không được dùng");
    case "revoked":
      return ea("Đã thu hồi");
  }
}

function codexCapabilityNames(snapshot: Record<string, unknown>): string[] {
  return Object.entries(snapshot)
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        const count = value.length;
        return [`${key} (${count})`];
      }
      if (value && typeof value === "object") {
        return [`${key} (${Object.keys(value).length})`];
      }
      return [key];
    })
    .slice(0, 32);
}

function codexAuthAppNames(
  apps: Array<{ id: string; name: string; installUrl?: string | null } | string> | undefined,
): string[] {
  return (apps ?? []).map((app) => (typeof app === "string" ? app : app.name));
}

type CodexMutationNotice = {
  authRequired: boolean;
  authApps: string[];
  connectUrls: string[];
  restartRequired: boolean;
};

type EnterpriseExtensionGrantScope = "account" | "shared_agent";

export class EnterpriseAdminPluginsPage extends OpenClawLightDomElement {
  @state() private items: EnterprisePluginRequest[] = [];
  @state() private codexItems: EnterpriseCodexPluginRequest[] = [];
  @state() private selected?: EnterprisePluginRequestDetail;
  @state() private selectedCodex?: EnterpriseCodexPluginRequestDetail;
  @state() private loading = true;
  @state() private busy = false;
  @state() private openingRequestId: string | null = null;
  @state() private openingCodexRequestId: string | null = null;
  @state() private error = "";
  @state() private rejectionReason = "";
  @state() private codexMutationNotice: CodexMutationNotice | null = null;
  @state() private approvalScope: EnterpriseExtensionGrantScope = "account";

  private canApproveForSharedAgent(request: { agentKey: string | null | undefined }): boolean {
    return request.agentKey?.startsWith("shared:") === true;
  }

  private renderApprovalScope(request: { agentKey: string | null | undefined }) {
    if (!this.canApproveForSharedAgent(request)) {
      return html`<p class="ea-muted">${ea("Phạm vi cấp quyền")}: ${ea("Account")}</p>`;
    }
    return html`<label class="ea-field">
      ${ea("Phạm vi cấp quyền")}
      <select
        class="ea-select"
        .value=${this.approvalScope}
        @change=${(event: Event) => {
          const value = (event.currentTarget as HTMLSelectElement).value;
          this.approvalScope = value === "shared_agent" ? "shared_agent" : "account";
        }}
      >
        <option value="account">${ea("Account")}</option>
        <option value="shared_agent">${ea("Shared Agent")}</option>
      </select>
      <span class="ea-field__hint">
        ${this.approvalScope === "shared_agent"
          ? ea("Grant thuộc Agent dùng chung và áp dụng cho user được cấp Agent.")
          : ea("Grant chỉ thuộc account yêu cầu.")}
      </span>
    </label>`;
  }

  private codexMutationNoticeText(): string {
    const notice = this.codexMutationNotice;
    if (!notice) {
      return "";
    }
    return [
      notice.authRequired ? ea("Plugin cần kết nối tài khoản.") : "",
      notice.authApps.length ? `${ea("App cần kết nối")}: ${notice.authApps.join(", ")}` : "",
      notice.connectUrls.length ? `${ea("Link kết nối")}: ${notice.connectUrls.join(", ")}` : "",
      notice.restartRequired ? ea("Cần khởi động lại phiên Agent.") : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      const [items, codexItems] = await Promise.all([
        listAdminPluginRequests(),
        ENTERPRISE_CODEX_PLUGINS_VISIBLE ? listAdminCodexPluginRequests() : Promise.resolve([]),
      ]);
      this.items = items;
      this.codexItems = codexItems;
      if (this.selected) {
        this.selected = await loadAdminPluginRequest(this.selected.request.id);
      }
      if (ENTERPRISE_CODEX_PLUGINS_VISIBLE && this.selectedCodex) {
        this.selectedCodex = await loadAdminCodexPluginRequest(this.selectedCodex.request.id);
      }
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private async open(request: EnterprisePluginRequest): Promise<void> {
    if (this.openingRequestId || this.busy || this.loading) {
      return;
    }
    this.openingRequestId = request.id;
    this.selectedCodex = undefined;
    this.codexMutationNotice = null;
    this.error = "";
    try {
      this.selected = await loadAdminPluginRequest(request.id);
      this.approvalScope =
        this.selected.request.scope === "shared_agent" ? "shared_agent" : "account";
      this.rejectionReason = "";
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.openingRequestId = null;
    }
  }

  private async openCodex(request: EnterpriseCodexPluginRequest): Promise<void> {
    if (this.openingCodexRequestId || this.busy || this.loading) {
      return;
    }
    this.openingCodexRequestId = request.id;
    this.selected = undefined;
    this.error = "";
    try {
      this.selectedCodex = await loadAdminCodexPluginRequest(request.id);
      this.approvalScope =
        this.selectedCodex.request.scope === "shared_agent" ? "shared_agent" : "account";
      this.rejectionReason = "";
      this.codexMutationNotice = null;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.openingCodexRequestId = null;
    }
  }

  private async approve(): Promise<void> {
    if (!this.selected || this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await approveAdminPluginRequest(this.selected.request, this.approvalScope);
      await this.load();
    } catch (error) {
      const failure = errorMessage(error);
      // Installation can persist a failed state/revision before returning an error.
      await this.load();
      this.error = failure;
    } finally {
      this.busy = false;
    }
  }

  private async reject(): Promise<void> {
    if (!this.selected || this.busy || !this.rejectionReason.trim()) {
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

  private async approveCodex(): Promise<void> {
    if (!this.selectedCodex || this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    this.codexMutationNotice = null;
    try {
      const result = await approveAdminCodexPluginRequest(
        this.selectedCodex.request,
        this.approvalScope,
      );
      const authApps = codexAuthAppNames(result.appsNeedingAuth);
      this.codexMutationNotice = {
        authRequired: result.authRequired === true,
        authApps,
        connectUrls: result.connectUrls ?? [],
        restartRequired: result.restartRequired === true,
      };
      await this.load();
    } catch (error) {
      const failure = errorMessage(error);
      await this.load();
      this.error = failure;
    } finally {
      this.busy = false;
    }
  }

  private async rejectCodex(): Promise<void> {
    if (!this.selectedCodex || this.busy || !this.rejectionReason.trim()) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await rejectAdminCodexPluginRequest(this.selectedCodex.request, this.rejectionReason.trim());
      this.selectedCodex = undefined;
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  private async revoke(grant: EnterprisePluginRequestDetail["grants"][number]): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
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
          ${ea(
            "Plugin native là tiến trình global của Gateway. Phê duyệt chỉ cấp snapshot tool cho account; hooks, routes, services, providers và secrets vẫn có phạm vi toàn công ty.",
          )}
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
            trustLabel:
              typeof request.trustSnapshot.disposition === "string"
                ? request.trustSnapshot.disposition
                : "—",
            trustDetail: [request.trustSnapshot.scanStatus, request.trustSnapshot.checkedAt]
              .filter((value): value is string => typeof value === "string" && value.length > 0)
              .join(" · "),
            requirements: [],
            statusLabel: stateLabel(request.state),
            labels: {
              publisher: ea("Publisher"),
              version: ea("Phiên bản"),
              integrity: ea("Integrity"),
              trust: ea("Scan"),
              status: ea("Trạng thái"),
            },
          },
          { actionLabel: "", hideAction: true, onAction: () => undefined },
        )}
        <section class="ea-card ea-plugin-review__grid">
          <dl>
            <dt>${ea("Account yêu cầu")}</dt>
            <dd>
              ${detail.account?.displayName ?? ea("Không còn tồn tại")}
              ${detail.account ? html`(@${detail.account.username})` : nothing}
            </dd>
            <dt>${ea("Trạng thái")}</dt>
            <dd>${stateLabel(request.state)}</dd>
            <dt>${ea("Phiên bản yêu cầu")}</dt>
            <dd>${request.exactVersion}</dd>
            <dt>${ea("Integrity yêu cầu")}</dt>
            <dd class="ea-mono">${request.integrity}</dd>
            <dt>${ea("Capability digest")}</dt>
            <dd class="ea-mono">${request.capabilityDigest}</dd>
            <dt>${ea("Phạm vi tác động")}</dt>
            <dd>${detail.globalImpact.scope} · ${detail.globalImpact.nativeSurfaces.join(", ")}</dd>
          </dl>
          <dl>
            <dt>${ea("Đã cài global")}</dt>
            <dd>${detail.globalStatus.installed ? ea("Có") : ea("Chưa")}</dd>
            <dt>${ea("Đã load")}</dt>
            <dd>${detail.globalStatus.loaded ? ea("Có") : ea("Chưa")}</dd>
            <dt>${ea("Plugin ID")}</dt>
            <dd>${detail.globalStatus.pluginId ?? "—"}</dd>
            <dt>${ea("Version global")}</dt>
            <dd>${detail.globalStatus.version ?? "—"}</dd>
            <dt>${ea("Integrity global")}</dt>
            <dd class="ea-mono">${detail.globalStatus.integrity ?? "—"}</dd>
            <dt>${ea("Tool ownership khớp")}</dt>
            <dd>${detail.globalStatus.toolOwnershipMatches ? ea("Có") : ea("Chưa")}</dd>
          </dl>
        </section>
        ${this.renderApprovalScope(request)}
        <section class="ea-card">
          <h3>${ea("Đối chiếu artifact và kết quả quét")}</h3>
          <p>
            ${detail.artifactCheck.ok ? ea("Khớp bản đã review") : detail.artifactCheck.errorCode} ·
            ${formatDate(detail.artifactCheck.checkedAt)}
          </p>
          <p>
            ${ea(
              "Đối chiếu này không xác nhận khả năng cài đặt hoặc tình trạng load. Xem trạng thái Gateway ở trên.",
            )}
          </p>
          <pre class="ea-plugin-review__json">
${JSON.stringify(request.trustSnapshot, null, 2)}</pre>
        </section>
        <section class="ea-card">
          <h3>${ea("Capability đã review")}</h3>
          <pre class="ea-plugin-review__json">
${JSON.stringify(request.capabilitySnapshot, null, 2)}</pre>
          <h3>${ea("Tool do active registry xác nhận")}</h3>
          <p>
            ${detail.globalStatus.tools.length
              ? detail.globalStatus.tools.join(", ")
              : ea("Chưa có tool ownership khả dụng.")}
          </p>
        </section>
        <section class="ea-card">
          <h3>${ea("Account đang bị ảnh hưởng")}</h3>
          <p>
            ${detail.globalImpact.affectedAccounts.length
              ? detail.globalImpact.affectedAccounts.join(", ")
              : ea("Chưa có account nào.")}
          </p>
          ${detail.grants.map(
            (grant) =>
              html`<div class="ea-plugin-grant">
                <span>${grant.accountId} · ${pluginGrantStateLabel(grant.state)}</span
                >${grant.state === "active"
                  ? html`<button
                      class="ea-button ea-button--danger"
                      type="button"
                      ?disabled=${this.busy}
                      @click=${() => void this.revoke(grant)}
                    >
                      ${ea("Thu hồi quyền")}
                    </button>`
                  : nothing}
              </div>`,
          )}
        </section>
        ${request.decisionReason
          ? html`<div class="ea-alert">${ea("Lý do")}: ${request.decisionReason}</div>`
          : nothing}
        ${canReject
          ? html`<label class="ea-field"
              >${ea("Lý do từ chối")}<textarea
                class="ea-textarea ea-plugin-review__reason"
                .value=${this.rejectionReason}
                @input=${(event: Event) => {
                  this.rejectionReason = (event.currentTarget as HTMLTextAreaElement).value;
                }}
              ></textarea>
            </label>`
          : nothing}
        ${this.error
          ? html`<div class="ea-error" role="alert">
              ${this.error}
              <button
                class="ea-button"
                type="button"
                ?disabled=${this.busy || this.loading}
                @click=${() => void this.load()}
              >
                ${ea("Làm mới")}
              </button>
            </div>`
          : nothing}
        <div class="ea-actions">
          ${canApprove
            ? html`<button
                class="ea-button ea-button--primary"
                type="button"
                ?disabled=${this.busy}
                @click=${() => void this.approve()}
              >
                ${request.state === "approving" ? ea("Xác nhận Gateway đã load") : ea("Phê duyệt")}
              </button>`
            : nothing}
          ${canReject
            ? html`<button
                class="ea-button ea-button--danger"
                type="button"
                ?disabled=${this.busy || !this.rejectionReason.trim()}
                @click=${() => void this.reject()}
              >
                ${ea("Từ chối")}
              </button>`
            : nothing}
        </div>
      </div>
    </openclaw-enterprise-admin-dialog>`;
  }

  private renderCodexDetail() {
    const detail = this.selectedCodex;
    if (!detail) {
      return nothing;
    }
    const request = detail.request;
    const canApprove =
      detail.detail?.unavailable !== true &&
      (request.state === "pending" || request.state === "install_failed");
    const canReject = request.state === "pending" || request.state === "install_failed";
    const detailSnapshot = detail.detail?.capabilitySnapshot;
    const capabilitySnapshot =
      request.capabilitySnapshot ??
      (detailSnapshot && typeof detailSnapshot === "object" && !Array.isArray(detailSnapshot)
        ? (detailSnapshot as Record<string, unknown>)
        : {});
    const capabilityNames = codexCapabilityNames(capabilitySnapshot);
    const capabilityDigest =
      request.capabilityDigest ||
      (typeof detail.detail?.capabilityDigest === "string" ? detail.detail.capabilityDigest : "");
    return html`<openclaw-enterprise-admin-dialog
      .open=${true}
      .wide=${true}
      .heading=${request.pluginName}
      .description=${`Codex · ${request.marketplaceName}`}
      .onClose=${() => {
        this.selectedCodex = undefined;
        this.codexMutationNotice = null;
      }}
    >
      <div class="ea-stack ea-plugin-review">
        <div class="ea-alert ea-alert--warning">
          ${ea(
            "Plugin Codex được cài trong phạm vi Agent của account. Quyền truy cập được cấp chính xác cho account–Agent này; kết nối provider có thể dùng chung theo policy enterprise.",
          )}
        </div>
        ${detail.detail?.unavailable === true
          ? html`<div class="ea-alert ea-alert--warning" role="status">
              ${ea(
                "Chưa thể kiểm tra plugin trong Agent hiện tại. Bạn vẫn có thể xem hoặc từ chối yêu cầu; mở lại chi tiết khi kết nối Codex hoạt động để duyệt cài đặt.",
              )}
            </div>`
          : nothing}
        <section class="ea-card ea-plugin-review__grid">
          <dl>
            <dt>${ea("Plugin Codex")}</dt>
            <dd>${request.pluginName}</dd>
            <dt>${ea("Marketplace")}</dt>
            <dd>${request.marketplaceName}</dd>
            <dt>${ea("Account yêu cầu")}</dt>
            <dd>
              ${detail.account?.displayName ?? ea("Không còn tồn tại")}
              ${detail.account ? html`(@${detail.account.username})` : nothing}
            </dd>
            <dt>${ea("Agent")}</dt>
            <dd>${request.agentKey}</dd>
          </dl>
          <dl>
            <dt>${ea("Trạng thái")}</dt>
            <dd><span class="ea-badge">${codexStateLabel(request.state)}</span></dd>
            <dt>${ea("Loại yêu cầu")}</dt>
            <dd>${request.requestKind}</dd>
            <dt>${ea("Revision")}</dt>
            <dd>${request.revision}</dd>
            <dt>${ea("Installed plugin")}</dt>
            <dd>${request.installedPluginId ?? "—"}</dd>
          </dl>
        </section>
        ${this.renderApprovalScope(request)}
        <section class="ea-card">
          <h3>${ea("Capability đã review")}</h3>
          <p>
            ${capabilityNames.length
              ? capabilityNames.join(" · ")
              : ea("Không có capability summary.")}
          </p>
          <p class="ea-muted ea-mono">${ea("Digest:")} ${capabilityDigest || "—"}</p>
        </section>
        ${detail.grant
          ? html`<section class="ea-card">
              <h3>${ea("Grant runtime")}</h3>
              <p>
                ${codexGrantStateLabel(detail.grant.state)} ·
                ${detail.grant.installedPluginId ?? ea("Chưa có installed id")}
              </p>
              <p class="ea-muted">${ea("Grant revision")} ${detail.grant.revision}</p>
            </section>`
          : nothing}
        ${request.decisionReason || request.safeErrorCode
          ? html`<div
              class="ea-alert"
              role=${request.state === "rejected" || request.state === "install_failed"
                ? "alert"
                : "status"}
            >
              ${request.decisionReason ?? request.safeErrorCode}
            </div>`
          : nothing}
        ${this.codexMutationNotice
          ? html`<div class="ea-alert" role="status">${this.codexMutationNoticeText()}</div>`
          : nothing}
        ${canReject
          ? html`<label class="ea-field"
              >${ea("Lý do từ chối")}<textarea
                class="ea-textarea ea-plugin-review__reason"
                .value=${this.rejectionReason}
                @input=${(event: Event) => {
                  this.rejectionReason = (event.currentTarget as HTMLTextAreaElement).value;
                }}
              ></textarea>
            </label>`
          : nothing}
        ${this.error ? html`<div class="ea-error" role="alert">${this.error}</div>` : nothing}
        <div class="ea-actions">
          ${canApprove
            ? html`<button
                class="ea-button ea-button--primary"
                type="button"
                ?disabled=${this.busy}
                @click=${() => void this.approveCodex()}
              >
                ${request.state === "install_failed"
                  ? ea("Thử cài lại")
                  : ea("Phê duyệt & cài Codex")}
              </button>`
            : nothing}
          ${canReject
            ? html`<button
                class="ea-button ea-button--danger"
                type="button"
                ?disabled=${this.busy || !this.rejectionReason.trim()}
                @click=${() => void this.rejectCodex()}
              >
                ${ea("Từ chối")}
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
          <h1>${ea("Plugins")}</h1>
          <p>${ea("Yêu cầu từ User")}</p>
        </div>
        <button
          class="ea-button"
          type="button"
          ?disabled=${this.loading ||
          this.busy ||
          Boolean(this.openingRequestId) ||
          Boolean(this.openingCodexRequestId)}
          @click=${() => void this.load()}
        >
          ${ea("Làm mới")}
        </button>
      </header>
      <div class="ea-tabs">
        <button class="ea-tab ea-tab--active" type="button">
          ${ea("Yêu cầu từ User")} <span>${this.items.length}</span>
        </button>
        ${ENTERPRISE_CODEX_PLUGINS_VISIBLE
          ? html`<button class="ea-tab" type="button">
              ${ea("Yêu cầu Codex")} <span>${this.codexItems.length}</span>
            </button>`
          : nothing}
      </div>
      ${this.error && !this.selected && !this.selectedCodex
        ? html`<p class="ea-error" role="alert">${this.error}</p>`
        : nothing}
      <div class="ea-card ea-table-wrap">
        ${this.loading
          ? html`<div class="ea-loading">${ea("Đang tải yêu cầu…")}</div>`
          : html`<table class="ea-table">
              <thead>
                <tr>
                  <th>${ea("Package")}</th>
                  <th>${ea("Account")}</th>
                  <th>${ea("Release")}</th>
                  <th>${ea("Trạng thái")}</th>
                  <th>${ea("Thời gian")}</th>
                  <th class="ea-table__action">${ea("Thao tác")}</th>
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
                      <td>${item.requesterAccountId ?? ea("Không còn tồn tại")}</td>
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
                          ?disabled=${this.busy || Boolean(this.openingRequestId)}
                          aria-busy=${this.openingRequestId === item.id ? "true" : "false"}
                          @click=${() => void this.open(item)}
                        >
                          ${this.openingRequestId === item.id
                            ? ea("Đang tải yêu cầu…")
                            : ea("Xem & duyệt")}
                        </button>
                      </td>
                    </tr>`,
                )}
              </tbody>
            </table>`}
      </div>
      ${ENTERPRISE_CODEX_PLUGINS_VISIBLE
        ? html`<section class="ea-card ea-table-wrap">
            <header class="ea-section-header">
              <div>
                <h2>${ea("Yêu cầu plugin Codex")}</h2>
                <p>
                  ${ea("Yêu cầu được cấp theo account và Agent, độc lập với queue plugin native.")}
                </p>
              </div>
              <span class="ea-badge">${this.codexItems.length}</span>
            </header>
            ${this.loading
              ? html`<div class="ea-loading">${ea("Đang tải yêu cầu Codex…")}</div>`
              : this.codexItems.length === 0
                ? html`<div class="ea-muted">${ea("Chưa có yêu cầu plugin Codex.")}</div>`
                : html`<table class="ea-table">
                    <thead>
                      <tr>
                        <th>${ea("Plugin Codex")}</th>
                        <th>${ea("Account / Agent")}</th>
                        <th>${ea("Marketplace")}</th>
                        <th>${ea("Trạng thái")}</th>
                        <th>${ea("Thời gian")}</th>
                        <th class="ea-table__action">${ea("Thao tác")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.codexItems.map(
                        (item) =>
                          html`<tr data-codex-request-id=${item.id}>
                            <td>
                              <strong>${item.pluginName}</strong>
                              <div class="ea-muted">${item.requestKind}</div>
                            </td>
                            <td>
                              ${item.requesterAccountId ?? ea("Không còn tồn tại")}
                              <div class="ea-muted">${ea("Agent: ")}${item.agentKey}</div>
                            </td>
                            <td>${item.marketplaceName}</td>
                            <td><span class="ea-badge">${codexStateLabel(item.state)}</span></td>
                            <td>${formatDate(item.createdAt)}</td>
                            <td class="ea-table__action">
                              <button
                                class="ea-button"
                                type="button"
                                ?disabled=${this.busy || Boolean(this.openingCodexRequestId)}
                                aria-busy=${this.openingCodexRequestId === item.id
                                  ? "true"
                                  : "false"}
                                @click=${() => void this.openCodex(item)}
                              >
                                ${this.openingCodexRequestId === item.id
                                  ? ea("Đang tải…")
                                  : ea("Xem & duyệt")}
                              </button>
                            </td>
                          </tr>`,
                      )}
                    </tbody>
                  </table>`}
          </section>`
        : nothing}
      ${this.renderDetail()}
      ${ENTERPRISE_CODEX_PLUGINS_VISIBLE ? this.renderCodexDetail() : nothing}
    </section>`;
  }
}

if (!customElements.get("openclaw-enterprise-admin-plugins-page")) {
  customElements.define("openclaw-enterprise-admin-plugins-page", EnterpriseAdminPluginsPage);
}
