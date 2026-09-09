import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import {
  ClawHubTrustErrorCodes,
  readClawHubTrustErrorDetails,
} from "../../../../../packages/gateway-protocol/src/clawhub-trust-error-details.js";
import { icons } from "../../../components/icons.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import { formatUiExternalText } from "../../../lib/format-error.ts";
import type { ClawHubSearchResult } from "../../../lib/skills/clawhub-search.ts";
import type { ClawHubSkillDetail } from "../../../lib/skills/index.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  EnterpriseApiError,
  importAdminSkillFolder,
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
import {
  encodeExternalSkillFolder,
  selectExternalSkillFolder,
  type ExternalSkillFolderSelection,
} from "./external-skill-folder.ts";
import {
  renderExternalSkillInstallerView,
  type ExternalInstallMessage,
} from "./external-skill-installer-view.ts";
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

function withWarning(message: string, warning?: string): string {
  return warning ? `${message}\n\n${warning}` : message;
}

function skillTechnicalStatusLabel(status: string): string {
  switch (status) {
    case "ready":
      return ea("Sẵn sàng");
    case "needs_setup":
      return ea("Cần thiết lập");
    case "disabled":
      return ea("Đã tắt");
    default:
      return status.replace("_", " ");
  }
}

function externalSkillFolderErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  switch (code) {
    case "empty folder":
      return ea("Folder skill trống.");
    case "too many files":
      return ea("Folder skill vượt quá 200 file.");
    case "folder too large":
      return ea("Folder skill vượt quá 10 MiB.");
    case "folder path unavailable":
      return ea("Không xác định được đường dẫn folder skill.");
    case "folder paths differ":
      return ea("Các file phải thuộc cùng một folder skill.");
    default:
      return errorMessage(error);
  }
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
  @state() private externalImporting = false;
  @state() private externalMessage: ExternalInstallMessage | null = null;
  @state() private externalInstalledRefs: ReadonlySet<string> = new Set();
  @state() private externalFolderSelection: ExternalSkillFolderSelection | null = null;
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
      if (
        this.externalAgentId &&
        !this.agents.some((agent) => agent.agentId === this.externalAgentId)
      ) {
        this.externalAgentId = "";
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
    this.externalAgentId = "";
    this.externalOpen = true;
    this.externalMessage = null;
    this.externalFolderSelection = null;
    if (this.agents.length === 0) {
      void this.loadAgents();
    }
    void this.loadExternalInstalledRefs(this.externalAgentId);
  }

  private async loadExternalInstalledRefs(agentId: string): Promise<void> {
    try {
      const { items } = await listAdminSkillCatalog(agentId ? { agentId } : {});
      if (this.externalAgentId !== agentId) {
        return;
      }
      this.externalInstalledRefs = new Set(
        items.flatMap((item) =>
          item.ownerAgentId === (agentId || null) &&
          item.clawhub?.valid === true &&
          item.clawhub.requestedReference
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
    if (this.externalInstallingRef || this.externalImporting) {
      return;
    }
    this.externalOpen = false;
    this.externalDetailRef = "";
    this.externalDetail = null;
    this.externalDetailError = "";
    this.externalFolderSelection = null;
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
    if (this.externalInstallingRef || this.externalImporting) {
      return;
    }
    this.externalInstallingRef = ref;
    this.externalMessage = null;
    try {
      const result = await installAdminExternalSkill({
        ...(this.externalAgentId ? { agentId: this.externalAgentId } : {}),
        ref,
        ...(version ? { version } : {}),
        ...(acknowledgeClawHubRisk ? { acknowledgeClawHubRisk: true } : {}),
      });
      this.externalMessage = {
        kind: "success",
        text: withWarning(
          formatUiExternalText(result.message, `${ea("Đã cài")} ${ref}`),
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
              ea("Hãy xem cảnh báo bảo mật từ ClawHub trước khi cài skill này."),
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

  private selectExternalFolder(files: FileList | null): void {
    if (!files?.length) {
      return;
    }
    try {
      this.externalFolderSelection = selectExternalSkillFolder(files);
      this.externalMessage = null;
    } catch (error) {
      this.externalFolderSelection = null;
      this.externalMessage = {
        kind: "error",
        text: externalSkillFolderErrorMessage(error),
      };
    }
  }

  private async importExternalFolder(): Promise<void> {
    const selection = this.externalFolderSelection;
    if (!selection || this.externalImporting || this.externalInstallingRef) {
      return;
    }
    this.externalImporting = true;
    this.externalMessage = null;
    try {
      const result = await importAdminSkillFolder({
        ...(this.externalAgentId ? { agentId: this.externalAgentId } : {}),
        ...(await encodeExternalSkillFolder(selection)),
      });
      this.externalMessage = {
        kind: "success",
        text: withWarning(
          `${ea("Đã lưu")} ${result.slug}`,
          result.warning ? formatUiExternalText(result.warning) : undefined,
        ),
      };
      this.externalFolderSelection = null;
      const folderInput = this.querySelector<HTMLInputElement>(
        'input[type="file"][webkitdirectory]',
      );
      if (folderInput) {
        folderInput.value = "";
      }
      await Promise.all([this.load(), this.loadExternalInstalledRefs(this.externalAgentId)]);
    } catch (error) {
      this.externalMessage = {
        kind: "error",
        text: errorMessage(error),
      };
    } finally {
      this.externalImporting = false;
    }
  }

  private statusBadge(item: EnterpriseSkillCatalogItem): string {
    return item.intrinsicStatus === "ready"
      ? "ea-badge--good"
      : item.intrinsicStatus === "disabled"
        ? "ea-badge--bad"
        : "ea-badge--warn";
  }

  private renderExternalInstaller() {
    return renderExternalSkillInstallerView({
      state: {
        agents: this.agents,
        agentId: this.externalAgentId,
        query: this.externalQuery,
        results: this.externalResults,
        searching: this.externalSearching,
        searchError: this.externalSearchError,
        detailRef: this.externalDetailRef,
        detail: this.externalDetail,
        detailLoading: this.externalDetailLoading,
        detailError: this.externalDetailError,
        installingRef: this.externalInstallingRef,
        importing: this.externalImporting,
        message: this.externalMessage,
        installedRefs: this.externalInstalledRefs,
        folderSelection: this.externalFolderSelection,
      },
      actions: {
        onCloseInstaller: () => this.closeExternalInstaller(),
        onCloseDetail: () => this.closeExternalDetail(),
        onChangeAgent: (agentId) => {
          this.externalAgentId = agentId;
          this.externalMessage = null;
          void this.loadExternalInstalledRefs(agentId);
        },
        onChangeQuery: (value) => this.changeExternalQuery(value),
        onSelectFolder: (files) => this.selectExternalFolder(files),
        onImportFolder: () => this.importExternalFolder(),
        onOpenDetail: (ref) => this.openExternalDetail(ref),
        onInstall: (ref, acknowledgeClawHubRisk, version) =>
          this.installExternalSkill(ref, acknowledgeClawHubRisk, version),
      },
    });
  }

  override render() {
    return html`
      <section class="ea-page">
        <header class="ea-page-header">
          <div>
            <h1>${ea("Quản lý skill")}</h1>
            <p>${ea("Catalog occurrence-aware, tách trạng thái kỹ thuật khỏi quyền user")}</p>
          </div>
          <div class="ea-row-actions">
            <span class="ea-badge">${this.items.length} ${ea("occurrences")}</span>
            <button
              class="ea-button ea-button--primary"
              type="button"
              @click=${() => this.openExternalInstaller()}
            >
              ${icons.plus} ${ea("Cài skill bên ngoài")}
            </button>
          </div>
        </header>
        <nav class="ea-tabs" aria-label=${ea("Nguồn skill")}>
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
                ${ea(label)}
              </button>
            `,
          )}
        </nav>
        <div class="ea-toolbar">
          <input
            class="ea-input"
            type="search"
            placeholder=${ea("Tìm skill…")}
            aria-label=${ea("Tìm skill")}
            @input=${(event: Event) => {
              this.query = (event.currentTarget as HTMLInputElement).value;
              this.scheduleLoad();
            }}
          />
          <select
            class="ea-select"
            aria-label=${ea("Lọc trạng thái")}
            @change=${(event: Event) => {
              this.status = (event.currentTarget as HTMLSelectElement).value;
              void this.load();
            }}
          >
            <option value="all">${ea("Tất cả")}</option>
            <option value="ready">${ea("Sẵn sàng")}</option>
            <option value="needs_setup">${ea("Cần thiết lập")}</option>
            <option value="disabled">${ea("Đã tắt")}</option>
          </select>
          <input
            class="ea-input"
            placeholder=${ea("Lọc theo agent ID")}
            aria-label=${ea("Lọc theo agent")}
            @change=${(event: Event) => {
              this.agentId = (event.currentTarget as HTMLInputElement).value;
              void this.load();
            }}
          />
          <select
            class="ea-select"
            aria-label=${ea("Lọc theo user")}
            @change=${(event: Event) => {
              this.accountId = (event.currentTarget as HTMLSelectElement).value;
              void this.load();
            }}
          >
            <option value="">${ea("Tất cả user")}</option>
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
            ? html`<div class="ea-loading">${ea("Đang tổng hợp skill catalog…")}</div>`
            : this.error
              ? html`<div class="ea-empty"><p class="ea-error">${this.error}</p></div>`
              : html`
                  <table class="ea-table">
                    <thead>
                      <tr>
                        <th>${ea("Skill")}</th>
                        <th>${ea("Source / scope")}</th>
                        <th>${ea("Owner agent")}</th>
                        <th>${ea("Technical status")}</th>
                        <th>${ea("Setup reason")}</th>
                        <th>${ea("User được cấp")}</th>
                        <th>${ea("Effective")}</th>
                        <th class="ea-table__action">${ea("Thao tác")}</th>
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
                            <td>${item.ownerAgentId ?? ea("Global")}</td>
                            <td>
                              <span class="ea-badge ${this.statusBadge(item)}"
                                >${skillTechnicalStatusLabel(item.intrinsicStatus)}</span
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
                                      ? ea("Được dùng")
                                      : ea("Không được dùng")}</span
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
                                ${ea("Quản lý user")}
                              </button>
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                  ${this.items.length === 0
                    ? html`<div class="ea-empty">${ea("Không có skill phù hợp bộ lọc.")}</div>`
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
              <p>${this.detailItem.description || ea("Không có mô tả.")}</p>
              <div class="ea-code">${JSON.stringify(this.detailItem, null, 2)}</div>
              <div class="ea-banner">
                ${ea(
                  "Bật/tắt và setup chỉ khả dụng khi source hỗ trợ lifecycle ổn định. Quyền user không thay đổi trạng thái kỹ thuật.",
                )}
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
