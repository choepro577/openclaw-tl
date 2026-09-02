import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import "../../../../components/modal-dialog.ts";
import { showConfirmDialog } from "../../../../components/confirm-dialog.ts";
import {
  renderExtensionCatalogCard,
  type ExtensionCatalogPresentation,
} from "../../../../components/extensions/extension-catalog-card.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import type { AgentKey } from "../../contracts/user-agent.ts";
import type {
  UserExtensionCatalogItem,
  UserExtensionKind,
  UserExtensionReview,
  UserPluginGrant,
  UserPluginRequest,
  UserSkillInstall,
} from "../../contracts/user-extension.ts";
import {
  cancelUserPluginRequest,
  createUserPluginRequest,
  installUserSkill,
  listUserPluginRequests,
  loadUserExtensionInventory,
  relinquishUserPluginGrant,
  removeUserSkill,
  reviewUserExtension,
  searchUserExtensions,
  setUserSkillEnabled,
  updateUserSkill,
} from "../../services/user-enterprise-api.ts";
import { userBootstrapStore } from "../../state/user-bootstrap-store.ts";
import "../../styles/plugins.css";

type PluginsTab = "installed" | "discover" | "requests";

function kindLabel(kind: UserExtensionKind): string {
  return kind === "skill"
    ? eu("pluginsKindSkill")
    : kind === "code_plugin"
      ? eu("pluginsKindCode")
      : eu("pluginsKindBundle");
}

function requestStateLabel(state: UserPluginRequest["state"]): string {
  const labels: Record<UserPluginRequest["state"], ReturnType<typeof eu>> = {
    pending: eu("pluginsStatePending"),
    approving: eu("pluginsStateApproving"),
    available: eu("pluginsStateAvailable"),
    rejected: eu("pluginsStateRejected"),
    cancelled: eu("pluginsStateCancelled"),
    install_failed: eu("pluginsStateInstallFailed"),
  };
  return labels[state];
}

function skillStateLabel(state: UserSkillInstall["state"]): string {
  const labels: Record<UserSkillInstall["state"], ReturnType<typeof eu>> = {
    ready: eu("pluginsStateReady"),
    needs_setup: eu("pluginsStateNeedsSetup"),
    disabled: eu("pluginsStateDisabled"),
    modified: eu("pluginsStateModified"),
    error: eu("pluginsStateError"),
  };
  return labels[state];
}

function grantStateLabel(state: UserPluginGrant["state"]): string {
  const labels: Record<UserPluginGrant["state"], ReturnType<typeof eu>> = {
    active: eu("pluginsGrantActive"),
    suspended_version_mismatch: eu("pluginsGrantVersionMismatch"),
    unavailable: eu("pluginsGrantUnavailable"),
    orphaned: eu("pluginsGrantOrphaned"),
    revoked: eu("pluginsGrantRevoked"),
  };
  return labels[state];
}

function presentation(item: UserExtensionCatalogItem): ExtensionCatalogPresentation {
  return {
    key: item.catalogKey,
    name: item.name,
    description: item.description,
    kindLabel: kindLabel(item.kind),
    publisher: item.publisher,
    version: item.version,
    integrity: item.integrity,
    trustLabel: item.trust?.disposition === "clean" ? eu("pluginsClean") : eu("pluginsReasonTrust"),
    trustDetail: item.trust
      ? [item.trust.scanStatus, item.trust.checkedAt].filter(Boolean).join(" · ")
      : null,
    requirements: item.requirements,
    statusLabel: item.requestState ? requestStateLabel(item.requestState) : null,
    labels: {
      publisher: eu("pluginsPublisher"),
      version: eu("pluginsVersion"),
      integrity: eu("pluginsIntegrity"),
      trust: eu("pluginsTrust"),
      status: eu("status"),
    },
  };
}

export class UserPluginsPage extends OpenClawLightDomElement {
  @state() private tab: PluginsTab = "installed";
  @state() private agentKey: AgentKey = "personal";
  @state() private query = "";
  @state() private loading = false;
  @state() private searching = false;
  @state() private busy = false;
  @state() private error = "";
  @state() private catalog: UserExtensionCatalogItem[] = [];
  @state() private installs: UserSkillInstall[] = [];
  @state() private grants: UserPluginGrant[] = [];
  @state() private requests: UserPluginRequest[] = [];
  @state() private review: UserExtensionReview | null = null;
  private unsubscribe?: () => void;
  private searchTimer?: ReturnType<typeof globalThis.setTimeout>;
  private searchController?: AbortController;
  private bootstrappedAgentKey?: AgentKey;
  private inventoryRequestId = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = userBootstrapStore.subscribe(() => this.syncBootstrap());
    void userBootstrapStore.load();
    this.syncBootstrap();
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    globalThis.clearTimeout(this.searchTimer);
    this.searchController?.abort();
    super.disconnectedCallback();
  }

  private syncBootstrap(): void {
    const state = userBootstrapStore.state;
    if (state.phase !== "ready") {
      return;
    }
    if (!state.data.agents.some((agent) => agent.key === this.agentKey)) {
      this.agentKey = state.data.defaultAgentKey ?? state.data.agents[0]?.key ?? "personal";
    }
    if (this.bootstrappedAgentKey === this.agentKey) {
      return;
    }
    this.bootstrappedAgentKey = this.agentKey;
    void this.loadInventory();
  }

  private async loadInventory(): Promise<void> {
    const requestId = ++this.inventoryRequestId;
    this.loading = true;
    this.error = "";
    try {
      const [inventory, requests] = await Promise.all([
        loadUserExtensionInventory(this.agentKey),
        listUserPluginRequests(),
      ]);
      if (requestId === this.inventoryRequestId) {
        this.installs = inventory.items;
        this.grants = inventory.grants;
        this.requests = requests;
      }
    } catch (error) {
      if (requestId === this.inventoryRequestId) {
        this.error = error instanceof Error ? error.message : eu("pluginsLoadFailed");
      }
    } finally {
      if (requestId === this.inventoryRequestId) {
        this.loading = false;
      }
    }
  }

  private queueSearch(value: string): void {
    this.query = value;
    globalThis.clearTimeout(this.searchTimer);
    this.searchController?.abort();
    this.searchTimer = globalThis.setTimeout(() => void this.search(), 250);
  }

  private async search(): Promise<void> {
    this.searchController?.abort();
    const controller = new AbortController();
    this.searchController = controller;
    this.searching = true;
    this.error = "";
    try {
      const items = await searchUserExtensions({
        agentKey: this.agentKey,
        query: this.query,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        this.catalog = items;
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        this.error = error instanceof Error ? error.message : eu("pluginsLoadFailed");
      }
    } finally {
      if (this.searchController === controller) {
        this.searching = false;
      }
    }
  }

  private async openReview(item: UserExtensionCatalogItem): Promise<void> {
    this.busy = true;
    this.error = "";
    try {
      this.review = await reviewUserExtension({
        agentKey: this.agentKey,
        kind: item.kind,
        catalogKey: item.catalogKey,
        ...(item.version ? { version: item.version } : {}),
      });
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("pluginsDetailFailed");
    } finally {
      this.busy = false;
    }
  }

  private async commitReview(): Promise<void> {
    if (!this.review || this.busy) {
      return;
    }
    this.busy = true;
    try {
      if (this.review.item.allowedAction === "install_skill") {
        await installUserSkill(this.review.reviewToken);
      } else if (this.review.item.allowedAction === "request_admin") {
        await createUserPluginRequest(this.review.reviewToken);
      }
      this.review = null;
      await this.loadInventory();
      if (this.tab === "discover") {
        await this.search();
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("pluginsMutationFailed");
    } finally {
      this.busy = false;
    }
  }

  private async toggleSkill(item: UserSkillInstall): Promise<void> {
    this.busy = true;
    try {
      await setUserSkillEnabled(item, !item.enabled);
      await this.loadInventory();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("pluginsMutationFailed");
    } finally {
      this.busy = false;
    }
  }

  private async updateSkill(item: UserSkillInstall): Promise<void> {
    this.busy = true;
    try {
      const review = await reviewUserExtension({
        agentKey: item.agentKey,
        kind: "skill",
        catalogKey: item.clawhubRef,
      });
      await updateUserSkill(item, review.reviewToken);
      await this.loadInventory();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("pluginsMutationFailed");
    } finally {
      this.busy = false;
    }
  }

  private async removeSkill(item: UserSkillInstall): Promise<void> {
    if (
      !(await showConfirmDialog({
        title: eu("pluginsRemove"),
        message: eu("pluginsRemoveConfirm", { name: item.skillName }),
        confirmLabel: eu("pluginsRemove"),
        danger: true,
      }))
    ) {
      return;
    }
    this.busy = true;
    try {
      await removeUserSkill(item);
      await this.loadInventory();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("pluginsMutationFailed");
    } finally {
      this.busy = false;
    }
  }

  private async cancelRequest(item: UserPluginRequest): Promise<void> {
    this.busy = true;
    try {
      await cancelUserPluginRequest(item);
      await this.loadInventory();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("pluginsMutationFailed");
    } finally {
      this.busy = false;
    }
  }

  private async relinquishGrant(item: UserPluginGrant): Promise<void> {
    if (
      !(await showConfirmDialog({
        title: eu("pluginsRelinquish"),
        message: eu("pluginsRelinquishConfirm", { name: item.pluginId }),
        confirmLabel: eu("pluginsRelinquish"),
        danger: true,
      }))
    ) {
      return;
    }
    this.busy = true;
    try {
      await relinquishUserPluginGrant(item);
      await this.loadInventory();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("pluginsMutationFailed");
    } finally {
      this.busy = false;
    }
  }

  private renderInstalled() {
    return html`
      <div class="eu-extension-list">
        ${this.installs.length === 0 && !this.loading
          ? html`<div class="settings-empty">${eu("pluginsInventoryEmpty")}</div>`
          : this.installs.map(
              (item) => html`
                <article class="eu-extension-card">
                  <div class="eu-extension-card__heading">
                    <div>
                      <h2>${item.skillName}</h2>
                      <p>${item.clawhubRef}</p>
                    </div>
                    <span class="eu-extension-card__kind">${eu("pluginsKindSkill")}</span>
                  </div>
                  <div class="eu-extension-install-state">${skillStateLabel(item.state)}</div>
                  <div class="eu-extension-card__meta eu-extension-mono">
                    ${eu("pluginsVersion")}: ${item.exactVersion}<br />
                    ${eu("pluginsIntegrity")}: ${item.integrity}
                  </div>
                  <div class="eu-extension-card__actions">
                    <button
                      class="btn"
                      type="button"
                      ?disabled=${this.busy || item.state === "modified"}
                      @click=${() => void this.toggleSkill(item)}
                    >
                      ${item.enabled ? eu("pluginsDisable") : eu("pluginsEnable")}
                    </button>
                    <button
                      class="btn"
                      type="button"
                      ?disabled=${this.busy || item.state === "modified"}
                      @click=${() => void this.updateSkill(item)}
                    >
                      ${eu("pluginsUpdate")}
                    </button>
                    <button
                      class="btn danger"
                      type="button"
                      ?disabled=${this.busy}
                      @click=${() => void this.removeSkill(item)}
                    >
                      ${eu("pluginsRemove")}
                    </button>
                  </div>
                </article>
              `,
            )}
      </div>
      ${this.grants.length > 0
        ? html`<section class="eu-extension-grants">
            <h2>${eu("pluginsNativeGrants")}</h2>
            ${this.grants.map(
              (grant) => html`<article class="eu-extension-card">
                <div class="eu-extension-card__heading">
                  <div>
                    <h2>${grant.pluginId}</h2>
                    <p>${grant.exactVersion}</p>
                  </div>
                  <span class="eu-extension-card__kind">${grantStateLabel(grant.state)}</span>
                </div>
                <p>${eu("pluginsNativeScope")}</p>
                ${grant.state === "active"
                  ? html`<button
                      class="btn danger"
                      type="button"
                      ?disabled=${this.busy}
                      @click=${() => void this.relinquishGrant(grant)}
                    >
                      ${eu("pluginsRelinquish")}
                    </button>`
                  : nothing}
              </article>`,
            )}
          </section>`
        : nothing}
    `;
  }

  private renderDiscover() {
    return html`
      <label class="eu-extension-search">
        <span>${eu("pluginsSearch")}</span>
        <input
          type="search"
          placeholder=${eu("pluginsSearchPlaceholder")}
          .value=${this.query}
          @input=${(event: Event) =>
            this.queueSearch((event.currentTarget as HTMLInputElement).value)}
        />
      </label>
      ${this.searching
        ? html`<div class="settings-empty" role="status">${eu("loading")}</div>`
        : nothing}
      <div class="eu-extension-list">
        ${!this.searching && this.catalog.length === 0
          ? html`<div class="settings-empty">${eu("pluginsSearchEmpty")}</div>`
          : this.catalog.map((item) =>
              renderExtensionCatalogCard(presentation(item), {
                actionLabel: eu("pluginsReview"),
                actionDisabled: item.allowedAction === "none" || this.busy,
                actionBusy: this.busy,
                onAction: () => void this.openReview(item),
              }),
            )}
      </div>
    `;
  }

  private renderRequests() {
    return html`<div class="eu-extension-list">
      ${this.requests.length === 0
        ? html`<div class="settings-empty">${eu("pluginsRequestsEmpty")}</div>`
        : this.requests.map(
            (item) => html`<article class="eu-extension-card">
              <div class="eu-extension-card__heading">
                <div>
                  <h2>${item.packageName}</h2>
                  <p>${item.exactVersion}</p>
                </div>
                <span class="eu-extension-card__kind">${requestStateLabel(item.state)}</span>
              </div>
              <p>${eu("pluginsNativeScope")}</p>
              ${item.decisionReason
                ? html`<p class="callout warning">${item.decisionReason}</p>`
                : nothing}
              ${item.state === "pending"
                ? html`<button
                    class="btn danger"
                    type="button"
                    ?disabled=${this.busy}
                    @click=${() => void this.cancelRequest(item)}
                  >
                    ${eu("pluginsCancelRequest")}
                  </button>`
                : nothing}
            </article>`,
          )}
    </div>`;
  }

  private renderReviewModal() {
    const review = this.review;
    if (!review) {
      return nothing;
    }
    const native = review.item.allowedAction === "request_admin";
    return html`<openclaw-modal-dialog
      .open=${true}
      .label=${review.item.name}
      @modal-cancel=${() => {
        this.review = null;
      }}
    >
      <section class="eu-extension-modal">
        <header>
          <h2>${review.item.name}</h2>
          <button
            autofocus
            class="btn"
            type="button"
            @click=${() => {
              this.review = null;
            }}
          >
            ${eu("pluginsClose")}
          </button>
        </header>
        ${renderExtensionCatalogCard(presentation(review.item), {
          actionLabel: native ? eu("pluginsRequestAdmin") : eu("pluginsInstall"),
          actionDisabled: this.busy,
          actionBusy: this.busy,
          onAction: () => void this.commitReview(),
        })}
        <p class="callout warning">
          ${native ? eu("pluginsNativeScope") : eu("pluginsSkillScope")}
        </p>
      </section>
    </openclaw-modal-dialog>`;
  }

  override render() {
    const bootstrap = userBootstrapStore.state;
    const agents = bootstrap.phase === "ready" ? bootstrap.data.agents : [];
    return html`
      <main class="eu-plugins-page">
        <header class="eu-page-header">
          <div>
            <h1>${eu("plugins")}</h1>
            <p>${eu("pluginsDescription")}</p>
          </div>
          <label class="eu-extension-agent"
            ><span>${eu("pluginsAgent")}</span
            ><select
              .value=${this.agentKey}
              @change=${(event: Event) => {
                this.agentKey = (event.currentTarget as HTMLSelectElement).value as AgentKey;
                this.bootstrappedAgentKey = this.agentKey;
                void this.loadInventory();
                if (this.tab === "discover") void this.search();
              }}
            >
              ${agents.map((agent) => html`<option value=${agent.key}>${agent.name}</option>`)}
            </select></label
          >
        </header>
        <div class="eu-extension-tabs" role="tablist" aria-label=${eu("plugins")}>
          ${(["installed", "discover", "requests"] as const).map(
            (tab) =>
              html`<button
                type="button"
                role="tab"
                aria-selected=${this.tab === tab ? "true" : "false"}
                class=${this.tab === tab ? "active" : ""}
                @click=${() => {
                  this.tab = tab;
                  if (tab === "discover" && this.catalog.length === 0) void this.search();
                }}
              >
                ${tab === "installed"
                  ? eu("pluginsInstalled")
                  : tab === "discover"
                    ? eu("pluginsDiscover")
                    : eu("pluginsRequests")}
              </button>`,
          )}
        </div>
        ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
        ${this.loading
          ? html`<div class="settings-empty" role="status">${eu("loading")}</div>`
          : nothing}
        ${this.tab === "installed"
          ? this.renderInstalled()
          : this.tab === "discover"
            ? this.renderDiscover()
            : this.renderRequests()}
      </main>
      ${this.renderReviewModal()}
    `;
  }
}

if (!customElements.get("openclaw-user-plugins-page")) {
  customElements.define("openclaw-user-plugins-page", UserPluginsPage);
}
