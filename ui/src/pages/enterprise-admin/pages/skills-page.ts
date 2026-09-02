import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import {
  ClawHubTrustErrorCodes,
  readClawHubTrustErrorDetails,
} from "../../../../../packages/gateway-protocol/src/clawhub-trust-error-details.js";
import { icons } from "../../../components/icons.ts";
import { formatUiExternalText } from "../../../lib/format-error.ts";
import { resolveSafeExternalUrl } from "../../../lib/open-external-url.ts";
import { clawHubSkillRef, type ClawHubSearchResult } from "../../../lib/skills/clawhub-search.ts";
import type { ClawHubSkillDetail } from "../../../lib/skills/index.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  EnterpriseApiError,
  installAdminExternalSkill,
  listAdminAccounts,
  listAdminAgentCatalog,
  listAdminSkillCatalog,
  loadAdminExternalSkillDetail,
  searchAdminExternalSkills,
  type EnterpriseAccount,
  type EnterpriseSharedAgent,
  type EnterpriseSkillCatalogItem,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage } from "../utils.ts";
import "../components/access-dialog.ts";
import "../components/admin-dialog.ts";

const sources = [
  ["all", "Tất cả"],
  ["workspace", "Workspace"],
  ["built-in", "Built-in"],
  ["managed", "Managed"],
  ["extra", "Extra"],
  ["other", "Other"],
] as const;

type ExternalInstallMessage = {
  kind: "success" | "error";
  text: string;
  acknowledgeRef?: string;
  acknowledgeVersion?: string;
};

function withWarning(message: string, warning?: string): string {
  return warning ? `${message}\n\n${warning}` : message;
}

function clampSummary(value: string, maxLength = 140): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export class EnterpriseAdminSkillsPage extends OpenClawLightDomElement {
  @state() private items: EnterpriseSkillCatalogItem[] = [];
  @state() private accounts: EnterpriseAccount[] = [];
  @state() private agents: EnterpriseSharedAgent[] = [];
  @state() private source = "all";
  @state() private status = "all";
  @state() private accountId = "";
  @state() private agentId = "";
  @state() private query = "";
  @state() private loading = true;
  @state() private error = "";
  @state() private accessItem?: EnterpriseSkillCatalogItem;
  @state() private detailItem?: EnterpriseSkillCatalogItem;
  @state() private externalOpen = false;
  @state() private externalAgentId = "";
  @state() private externalQuery = "";
  @state() private externalResults: ClawHubSearchResult[] | null = null;
  @state() private externalSearching = false;
  @state() private externalSearchError = "";
  @state() private externalDetailRef = "";
  @state() private externalDetail: ClawHubSkillDetail | null = null;
  @state() private externalDetailLoading = false;
  @state() private externalDetailError = "";
  @state() private externalInstallingRef = "";
  @state() private externalMessage: ExternalInstallMessage | null = null;
  @state() private externalInstalledRefs: ReadonlySet<string> = new Set();
  private reloadTimer?: ReturnType<typeof globalThis.setTimeout>;
  private externalSearchTimer?: ReturnType<typeof globalThis.setTimeout>;
  private externalSearchAbort?: AbortController;
  private externalDetailAbort?: AbortController;

  override connectedCallback(): void {
    super.connectedCallback();
    void Promise.all([this.loadAccounts(), this.loadAgents(), this.load()]);
  }

  override disconnectedCallback(): void {
    if (this.reloadTimer) {
      globalThis.clearTimeout(this.reloadTimer);
    }
    if (this.externalSearchTimer) {
      globalThis.clearTimeout(this.externalSearchTimer);
    }
    this.externalSearchAbort?.abort();
    this.externalDetailAbort?.abort();
    super.disconnectedCallback();
  }

  private async loadAccounts(): Promise<void> {
    try {
      this.accounts = (await listAdminAccounts({ role: "employee", limit: "100" })).accounts;
    } catch {
      this.accounts = [];
    }
  }

  private async loadAgents(): Promise<void> {
    try {
      this.agents = (await listAdminAgentCatalog()).shared;
      if (!this.agents.some((agent) => agent.agentId === this.externalAgentId)) {
        this.externalAgentId =
          this.agents.find((agent) => agent.agentId === "main")?.agentId ??
          this.agents[0]?.agentId ??
          "";
      }
      if (this.externalOpen) {
        void this.loadExternalInstalledRefs(this.externalAgentId);
      }
    } catch {
      this.agents = [];
      this.externalAgentId = "";
    }
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      const result = await listAdminSkillCatalog({
        query: this.query,
        category: this.source,
        status: this.status,
        accountId: this.accountId,
        agentId: this.agentId,
      });
      this.items = result.items;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private scheduleLoad(): void {
    if (this.reloadTimer) {
      globalThis.clearTimeout(this.reloadTimer);
    }
    this.reloadTimer = globalThis.setTimeout(() => void this.load(), 250);
  }

  private openExternalInstaller(): void {
    if (this.agents.some((agent) => agent.agentId === this.agentId)) {
      this.externalAgentId = this.agentId;
    }
    this.externalOpen = true;
    this.externalMessage = null;
    if (this.agents.length === 0) {
      void this.loadAgents();
    } else {
      void this.loadExternalInstalledRefs(this.externalAgentId);
    }
  }

  private async loadExternalInstalledRefs(agentId: string): Promise<void> {
    if (!agentId) {
      this.externalInstalledRefs = new Set();
      return;
    }
    try {
      const { items } = await listAdminSkillCatalog({ agentId });
      if (this.externalAgentId !== agentId) {
        return;
      }
      this.externalInstalledRefs = new Set(
        items.flatMap((item) =>
          item.clawhub?.valid === true && item.clawhub.requestedReference
            ? [item.clawhub.requestedReference]
            : [],
        ),
      );
    } catch {
      if (this.externalAgentId === agentId) {
        this.externalInstalledRefs = new Set();
      }
    }
  }

  private closeExternalInstaller(): void {
    if (this.externalInstallingRef) {
      return;
    }
    this.externalOpen = false;
    this.externalDetailRef = "";
    this.externalDetail = null;
    this.externalDetailError = "";
    this.externalDetailAbort?.abort();
  }

  private changeExternalQuery(value: string): void {
    this.externalQuery = value;
    this.externalMessage = null;
    this.externalSearchError = "";
    if (this.externalSearchTimer) {
      globalThis.clearTimeout(this.externalSearchTimer);
    }
    if (!value.trim()) {
      this.externalSearchAbort?.abort();
      this.externalResults = null;
      this.externalSearching = false;
      return;
    }
    this.externalSearchTimer = globalThis.setTimeout(() => void this.searchExternalSkills(), 300);
  }

  private async searchExternalSkills(): Promise<void> {
    const query = this.externalQuery.trim();
    if (!query) {
      return;
    }
    this.externalSearchAbort?.abort();
    const controller = new AbortController();
    this.externalSearchAbort = controller;
    this.externalSearching = true;
    this.externalSearchError = "";
    try {
      const result = await searchAdminExternalSkills(query, controller.signal);
      if (!controller.signal.aborted && query === this.externalQuery.trim()) {
        this.externalResults = result.results;
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        this.externalResults = null;
        this.externalSearchError = errorMessage(error);
      }
    } finally {
      if (this.externalSearchAbort === controller) {
        this.externalSearching = false;
      }
    }
  }

  private async openExternalDetail(ref: string): Promise<void> {
    this.externalDetailAbort?.abort();
    const controller = new AbortController();
    this.externalDetailAbort = controller;
    this.externalDetailRef = ref;
    this.externalDetail = null;
    this.externalDetailError = "";
    this.externalDetailLoading = true;
    try {
      const detail = await loadAdminExternalSkillDetail(ref, controller.signal);
      if (!controller.signal.aborted && this.externalDetailRef === ref) {
        this.externalDetail = detail;
      }
    } catch (error) {
      if (!controller.signal.aborted && this.externalDetailRef === ref) {
        this.externalDetailError = errorMessage(error);
      }
    } finally {
      if (this.externalDetailAbort === controller) {
        this.externalDetailLoading = false;
      }
    }
  }

  private closeExternalDetail(): void {
    this.externalDetailAbort?.abort();
    this.externalDetailRef = "";
    this.externalDetail = null;
    this.externalDetailError = "";
    this.externalDetailLoading = false;
  }

  private async installExternalSkill(
    ref: string,
    acknowledgeClawHubRisk = false,
    version?: string,
  ): Promise<void> {
    if (!this.externalAgentId || this.externalInstallingRef) {
      if (!this.externalAgentId) {
        this.externalMessage = {
          kind: "error",
          text: "Chưa có shared agent để nhận skill. Hãy tạo agent trước khi cài.",
        };
      }
      return;
    }
    this.externalInstallingRef = ref;
    this.externalMessage = null;
    try {
      const result = await installAdminExternalSkill({
        agentId: this.externalAgentId,
        ref,
        ...(version ? { version } : {}),
        ...(acknowledgeClawHubRisk ? { acknowledgeClawHubRisk: true } : {}),
      });
      this.externalMessage = {
        kind: "success",
        text: withWarning(
          formatUiExternalText(result.message, `Đã cài ${ref}`),
          result.warning ? formatUiExternalText(result.warning) : undefined,
        ),
      };
      this.externalInstalledRefs = new Set([...this.externalInstalledRefs, ref]);
      await Promise.all([this.load(), this.loadExternalInstalledRefs(this.externalAgentId)]);
    } catch (error) {
      const trustDetails =
        error instanceof EnterpriseApiError
          ? readClawHubTrustErrorDetails(error.payload?.details)
          : undefined;
      const needsAcknowledgement =
        trustDetails?.clawhubTrustCode === ClawHubTrustErrorCodes.RISK_ACKNOWLEDGEMENT_REQUIRED;
      this.externalMessage = {
        kind: "error",
        text: needsAcknowledgement
          ? withWarning(
              "Hãy xem cảnh báo bảo mật từ ClawHub trước khi cài skill này.",
              trustDetails.warning ? formatUiExternalText(trustDetails.warning) : undefined,
            )
          : withWarning(
              errorMessage(error),
              trustDetails?.warning ? formatUiExternalText(trustDetails.warning) : undefined,
            ),
        ...(needsAcknowledgement ? { acknowledgeRef: ref } : {}),
        ...(needsAcknowledgement && trustDetails.version
          ? { acknowledgeVersion: trustDetails.version }
          : {}),
      };
    } finally {
      this.externalInstallingRef = "";
    }
  }

  private isExternalInstalled(result: ClawHubSearchResult): boolean {
    if (result.installOnly !== true) {
      return false;
    }
    const ref = clawHubSkillRef(result);
    return this.externalInstalledRefs.has(ref);
  }

  private statusBadge(item: EnterpriseSkillCatalogItem): string {
    return item.intrinsicStatus === "ready"
      ? "ea-badge--good"
      : item.intrinsicStatus === "disabled"
        ? "ea-badge--bad"
        : "ea-badge--warn";
  }

  private renderExternalMessage() {
    if (!this.externalMessage) {
      return nothing;
    }
    return html`
      <div
        class="ea-banner ${this.externalMessage.kind === "error"
          ? "ea-banner--error"
          : "ea-banner--success"}"
        role=${this.externalMessage.kind === "error" ? "alert" : "status"}
      >
        <div class="ea-pre-wrap">${this.externalMessage.text}</div>
        ${this.externalMessage.acknowledgeRef
          ? html`<button
              class="ea-button ea-button--danger"
              type="button"
              ?disabled=${Boolean(this.externalInstallingRef)}
              @click=${() =>
                void this.installExternalSkill(
                  this.externalMessage?.acknowledgeRef ?? "",
                  true,
                  this.externalMessage?.acknowledgeVersion,
                )}
            >
              Tôi hiểu rủi ro và vẫn cài
            </button>`
          : nothing}
      </div>
    `;
  }

  private renderExternalResults() {
    if (this.externalResults === null) {
      return html`<div class="ea-marketplace-empty">
        Nhập tên hoặc chức năng cần tìm trong ClawHub.
      </div>`;
    }
    if (this.externalResults.length === 0) {
      return html`<div class="ea-marketplace-empty">Không tìm thấy skill phù hợp.</div>`;
    }
    return html`
      <div class="ea-marketplace-list">
        ${this.externalResults.map((result) => {
          const ref = clawHubSkillRef(result);
          const icon = result.icon
            ? resolveSafeExternalUrl(result.icon, globalThis.location.href)
            : null;
          const installed = this.isExternalInstalled(result);
          return html`
            <article class="ea-marketplace-item">
              ${result.installOnly
                ? html`<div class="ea-marketplace-item__identity">
                    ${this.renderExternalIcon(result, icon)}
                    <span>
                      <strong>${result.displayName}</strong>
                      <span class="ea-muted"
                        >${result.summary
                          ? `${clampSummary(result.summary)} · `
                          : ""}${ref}${result.trustState ? " · Chưa được ClawHub quét" : ""}</span
                      >
                    </span>
                  </div>`
                : html`<button
                    class="ea-marketplace-item__identity ea-marketplace-item__detail"
                    type="button"
                    aria-label=${`Xem chi tiết ${result.displayName}`}
                    @click=${() => void this.openExternalDetail(ref)}
                  >
                    ${this.renderExternalIcon(result, icon)}
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
                  ?disabled=${installed || Boolean(this.externalInstallingRef)}
                  @click=${() => void this.installExternalSkill(ref)}
                >
                  ${installed
                    ? "Đã cài"
                    : this.externalInstallingRef === ref
                      ? "Đang cài…"
                      : "Cài đặt"}
                </button>
              </div>
            </article>
          `;
        })}
      </div>
    `;
  }

  private renderExternalIcon(result: ClawHubSearchResult, icon: string | null) {
    return icon
      ? html`<img class="ea-marketplace-icon" src=${icon} alt="" loading="lazy" />`
      : html`<span class="ea-marketplace-icon ea-marketplace-icon--fallback"
          >${result.displayName.slice(0, 1).toUpperCase()}</span
        >`;
  }

  private renderExternalDetail() {
    const detail = this.externalDetail;
    const image = detail?.skill?.icon ?? detail?.owner?.image;
    const safeImage = image ? resolveSafeExternalUrl(image, globalThis.location.href) : null;
    return html`
      <div class="ea-stack">
        <div>
          <button class="ea-button" type="button" @click=${() => this.closeExternalDetail()}>
            ← Quay lại kết quả
          </button>
        </div>
        ${this.renderExternalMessage()}
        ${this.externalDetailLoading
          ? html`<div class="ea-loading">Đang tải thông tin skill…</div>`
          : this.externalDetailError
            ? html`<div class="ea-banner ea-banner--error" role="alert">
                ${this.externalDetailError}
              </div>`
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
                    <p>${detail.skill.summary ?? "Không có mô tả."}</p>
                    ${detail.latestVersion
                      ? html`<p class="ea-muted">
                          Phiên bản mới nhất: ${detail.latestVersion.version}
                        </p>`
                      : nothing}
                    ${detail.latestVersion?.changelog
                      ? html`<div class="ea-code">${detail.latestVersion.changelog}</div>`
                      : nothing}
                    ${detail.metadata?.os?.length
                      ? html`<p class="ea-muted">Nền tảng: ${detail.metadata.os.join(", ")}</p>`
                      : nothing}
                    <button
                      class="ea-button ea-button--primary"
                      type="button"
                      ?disabled=${Boolean(this.externalInstallingRef)}
                      @click=${() => void this.installExternalSkill(this.externalDetailRef)}
                    >
                      ${this.externalInstallingRef === this.externalDetailRef
                        ? "Đang cài…"
                        : `Cài ${detail.skill.displayName}`}
                    </button>
                  </div>
                `
              : html`<div class="ea-marketplace-empty">Không tìm thấy thông tin skill.</div>`}
      </div>
    `;
  }

  private renderExternalInstaller() {
    return html`
      <openclaw-enterprise-admin-dialog
        .open=${true}
        .wide=${true}
        heading=${this.externalDetail?.skill?.displayName ?? "Cài skill bên ngoài"}
        description="Tìm trên ClawHub, xem nguồn và cài vào workspace của shared agent."
        .canClose=${() => !this.externalInstallingRef}
        .onClose=${() => this.closeExternalInstaller()}
      >
        ${this.externalDetailRef
          ? this.renderExternalDetail()
          : html`<div class="ea-stack">
              <label class="ea-field">
                Cài vào agent
                <select
                  class="ea-select"
                  .value=${this.externalAgentId}
                  ?disabled=${Boolean(this.externalInstallingRef)}
                  @change=${(event: Event) => {
                    this.externalAgentId = (event.currentTarget as HTMLSelectElement).value;
                    this.externalMessage = null;
                    void this.loadExternalInstalledRefs(this.externalAgentId);
                  }}
                >
                  ${this.agents.length === 0
                    ? html`<option value="">Chưa có shared agent</option>`
                    : this.agents.map(
                        (agent) => html`<option value=${agent.agentId}>
                          ${agent.name} (${agent.agentId})
                        </option>`,
                      )}
                </select>
              </label>
              <label class="ea-field">
                Tìm trên ClawHub
                <div class="ea-marketplace-search">
                  <input
                    class="ea-input"
                    type="search"
                    name="external-skill-search"
                    autocomplete="off"
                    placeholder="Ví dụ: email, github, calendar…"
                    .value=${this.externalQuery}
                    @input=${(event: Event) =>
                      this.changeExternalQuery((event.currentTarget as HTMLInputElement).value)}
                  />
                  ${this.externalSearching
                    ? html`<span class="ea-muted">Đang tìm…</span>`
                    : nothing}
                </div>
              </label>
              ${this.externalSearchError
                ? html`<div class="ea-banner ea-banner--error" role="alert">
                    ${this.externalSearchError}
                  </div>`
                : nothing}
              ${this.renderExternalMessage()} ${this.renderExternalResults()}
            </div>`}
      </openclaw-enterprise-admin-dialog>
    `;
  }

  override render() {
    return html`
      <section class="ea-page">
        <header class="ea-page-header">
          <div>
            <h1>Quản lý skill</h1>
            <p>Catalog occurrence-aware, tách trạng thái kỹ thuật khỏi quyền user</p>
          </div>
          <div class="ea-row-actions">
            <span class="ea-badge">${this.items.length} occurrences</span>
            <button
              class="ea-button ea-button--primary"
              type="button"
              @click=${() => this.openExternalInstaller()}
            >
              ${icons.plus} Cài skill bên ngoài
            </button>
          </div>
        </header>
        <nav class="ea-tabs" aria-label="Nguồn skill">
          ${sources.map(
            ([id, label]) => html`
              <button
                class="ea-tab ${this.source === id ? "ea-tab--active" : ""}"
                type="button"
                @click=${() => {
                  this.source = id;
                  void this.load();
                }}
              >
                ${label}
              </button>
            `,
          )}
        </nav>
        <div class="ea-toolbar">
          <input
            class="ea-input"
            type="search"
            placeholder="Tìm skill…"
            aria-label="Tìm skill"
            @input=${(event: Event) => {
              this.query = (event.currentTarget as HTMLInputElement).value;
              this.scheduleLoad();
            }}
          />
          <select
            class="ea-select"
            aria-label="Lọc trạng thái"
            @change=${(event: Event) => {
              this.status = (event.currentTarget as HTMLSelectElement).value;
              void this.load();
            }}
          >
            <option value="all">All</option>
            <option value="ready">Ready</option>
            <option value="needs_setup">Needs setup</option>
            <option value="disabled">Disabled</option>
          </select>
          <input
            class="ea-input"
            placeholder="Lọc theo agent ID"
            aria-label="Lọc theo agent"
            @change=${(event: Event) => {
              this.agentId = (event.currentTarget as HTMLInputElement).value;
              void this.load();
            }}
          />
          <select
            class="ea-select"
            aria-label="Lọc theo user"
            @change=${(event: Event) => {
              this.accountId = (event.currentTarget as HTMLSelectElement).value;
              void this.load();
            }}
          >
            <option value="">Tất cả user</option>
            ${this.accounts.map(
              (account) =>
                html`<option value=${account.id}>
                  ${account.displayName} (@${account.username})
                </option>`,
            )}
          </select>
        </div>
        <div class="ea-card ea-table-wrap">
          ${this.loading
            ? html`<div class="ea-loading">Đang tổng hợp skill catalog…</div>`
            : this.error
              ? html`<div class="ea-empty"><p class="ea-error">${this.error}</p></div>`
              : html`
                  <table class="ea-table">
                    <thead>
                      <tr>
                        <th>Skill</th>
                        <th>Source / scope</th>
                        <th>Owner agent</th>
                        <th>Technical status</th>
                        <th>Setup reason</th>
                        <th>User được cấp</th>
                        <th>Effective</th>
                        <th class="ea-table__action">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.items.map(
                        (item) => html`
                          <tr @click=${() => (this.detailItem = item)}>
                            <td>
                              <strong>${item.name}</strong>
                              <div class="ea-muted">${item.skillKey}</div>
                            </td>
                            <td>
                              <span class="ea-badge">${item.category}</span>
                              <div class="ea-muted">${item.source}</div>
                            </td>
                            <td>${item.ownerAgentId ?? "Global"}</td>
                            <td>
                              <span class="ea-badge ${this.statusBadge(item)}"
                                >${item.intrinsicStatus.replace("_", " ")}</span
                              >
                            </td>
                            <td>${item.setupReason ?? "—"}</td>
                            <td>${item.assignedUserCount}</td>
                            <td>
                              ${this.accountId
                                ? html`<span
                                    class="ea-badge ${item.effectiveAccess?.effectiveAllowed
                                      ? "ea-badge--good"
                                      : "ea-badge--bad"}"
                                    >${item.effectiveAccess?.effectiveAllowed
                                      ? "Được dùng"
                                      : "Không được dùng"}</span
                                  >`
                                : "—"}
                            </td>
                            <td class="ea-table__action">
                              <button
                                class="ea-button"
                                type="button"
                                @click=${(event: Event) => {
                                  event.stopPropagation();
                                  this.accessItem = item;
                                }}
                              >
                                Quản lý user
                              </button>
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                  ${this.items.length === 0
                    ? html`<div class="ea-empty">Không có skill phù hợp bộ lọc.</div>`
                    : nothing}
                `}
        </div>
      </section>
      ${this.externalOpen ? this.renderExternalInstaller() : nothing}
      ${this.accessItem
        ? html`<openclaw-enterprise-access-dialog
            .open=${true}
            resourceType="skill"
            .resourceKey=${this.accessItem.resourceKey}
            .resourceName=${this.accessItem.name}
            .onClose=${() => (this.accessItem = undefined)}
            .onSaved=${() => void this.load()}
          ></openclaw-enterprise-access-dialog>`
        : nothing}
      ${this.detailItem
        ? html`<openclaw-enterprise-admin-dialog
            .open=${true}
            heading=${this.detailItem.name}
            description=${this.detailItem.resourceKey}
            .onClose=${() => (this.detailItem = undefined)}
          >
            <div class="ea-stack">
              <p>${this.detailItem.description || "Không có mô tả."}</p>
              <div class="ea-code">${JSON.stringify(this.detailItem, null, 2)}</div>
              <div class="ea-banner">
                Bật/tắt và setup chỉ khả dụng khi source hỗ trợ lifecycle ổn định. Quyền user không
                thay đổi trạng thái kỹ thuật.
              </div>
            </div>
          </openclaw-enterprise-admin-dialog>`
        : nothing}
    `;
  }
}

if (!customElements.get("openclaw-enterprise-admin-skills-page")) {
  customElements.define("openclaw-enterprise-admin-skills-page", EnterpriseAdminSkillsPage);
}
