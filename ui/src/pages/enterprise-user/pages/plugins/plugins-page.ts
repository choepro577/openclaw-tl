import { consume } from "@lit/context";
import { state } from "lit/decorators.js";
import type { RouteId } from "../../../../app-route-paths.ts";
import { applicationContext, type ApplicationContext } from "../../../../app/context.ts";
import { showConfirmDialog } from "../../../../components/confirm-dialog.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { copyToClipboard } from "../../../../lib/clipboard.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import { ENTERPRISE_CODEX_PLUGINS_VISIBLE } from "../../../enterprise-plugin-visibility.ts";
import { openUserAgentConversation } from "../../adapters/chat-route-adapter.ts";
import type { AgentKey } from "../../contracts/user-agent.ts";
import type {
  UserCodexCatalog,
  UserCodexCatalogItem,
  UserCodexPluginDetail,
  UserCodexPluginGrant,
  UserCodexPluginRequest,
  UserExtensionCatalogItem,
  UserExtensionReview,
  UserPluginGrant,
  UserPluginRequest,
  UserSkillInstall,
} from "../../contracts/user-extension.ts";
import {
  cancelUserPluginRequest,
  cancelUserCodexPluginRequest,
  connectUserCodexPlugin,
  createUserPluginRequest,
  createUserCodexPluginRequest,
  EnterpriseApiError,
  installUserSkill,
  loadUserCodexPluginDetail,
  listUserPluginRequests,
  loadUserExtensionInventory,
  relinquishUserPluginGrant,
  refreshUserCodexPlugin,
  removeUserCodexPlugin,
  removeUserSkill,
  reviewUserExtension,
  searchUserExtensions,
  searchUserCodexPlugins,
  setUserCodexPluginEnabled,
  setUserSkillEnabled,
  updateUserSkill,
} from "../../services/user-enterprise-api.ts";
import { userBootstrapStore } from "../../state/user-bootstrap-store.ts";
import {
  renderUserPlugins,
  canReviewExtension,
  type UserInstalledFilter,
  type UserPluginsTab,
} from "./plugins-view.ts";

const MIN_SEARCH_LENGTH = 2;
const CODEX_CATALOG_TTL_MS = 10 * 60_000;

function userPluginErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof EnterpriseApiError && error.code === "REVIEW_TOKEN_INVALID") {
    return eu("pluginsReviewExpired");
  }
  if (error instanceof EnterpriseApiError && error.code === "SKILL_COLLISION") {
    return eu("pluginsSkillCollision");
  }
  if (error instanceof EnterpriseApiError && error.message === error.code) {
    return fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export class UserPluginsPage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: false })
  private context!: ApplicationContext<RouteId>;
  @state() private tab: UserPluginsTab = "installed";
  @state() private installedFilter: UserInstalledFilter = "all";
  @state() private agentKey: AgentKey = "personal";
  @state() private query = "";
  @state() private loading = false;
  @state() private searching = false;
  @state() private codexSearching = false;
  @state() private busy = false;
  @state() private reviewingCatalogKey: string | null = null;
  @state() private error = "";
  @state() private catalog: UserExtensionCatalogItem[] = [];
  @state() private codexCatalog: UserCodexCatalog = {
    status: "available",
    items: [],
    installed: [],
    requests: [],
  };
  @state() private codexDetail: UserCodexPluginDetail | null = null;
  @state() private reviewingCodexPluginId: string | null = null;
  @state() private requestingCodexPluginId: string | null = null;
  @state() private codexCopyFeedback: "idle" | "copying" | "copied" | "error" = "idle";
  @state() private installs: UserSkillInstall[] = [];
  @state() private grants: UserPluginGrant[] = [];
  @state() private requests: UserPluginRequest[] = [];
  @state() private review: UserExtensionReview | null = null;
  @state() private reviewVersion: string | null = null;
  private unsubscribe?: () => void;
  private searchTimer?: ReturnType<typeof globalThis.setTimeout>;
  private searchController?: AbortController;
  private codexCopyResetTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private bootstrappedAgentKey?: AgentKey;
  private inventoryRequestId = 0;
  private codexCache?: { agentKey: AgentKey; catalog: UserCodexCatalog; expiresAt: number };

  private cachedCodexCatalog(query: string): UserCodexCatalog | null {
    if (
      !this.codexCache ||
      this.codexCache.agentKey !== this.agentKey ||
      this.codexCache.expiresAt <= Date.now()
    ) {
      return null;
    }
    return this.filterCodexCatalog(this.codexCache.catalog, query);
  }

  private filterCodexCatalog(catalog: UserCodexCatalog, query: string): UserCodexCatalog {
    const filter = query.trim().toLowerCase();
    return {
      ...catalog,
      items: catalog.items.filter((item) =>
        [
          item.id,
          item.pluginName,
          item.marketplaceName,
          item.name,
          item.description,
          item.installPolicy,
          item.authPolicy,
        ].some((value) => (value ?? "").toLowerCase().includes(filter)),
      ),
    };
  }

  private emptyCodexCatalog(): UserCodexCatalog {
    return {
      status: "available",
      items: [],
      installed: this.codexCatalog.installed,
      requests: this.codexCatalog.requests,
    };
  }

  private async loadCodexCatalog(controller: AbortController, query: string): Promise<void> {
    if (!ENTERPRISE_CODEX_PLUGINS_VISIBLE) return;
    const cached = this.cachedCodexCatalog(query);
    if (cached) {
      this.codexCatalog = cached;
      this.codexSearching = false;
      return;
    }
    const agentKey = this.agentKey;
    this.codexSearching = true;
    try {
      const result = await searchUserCodexPlugins({
        agentKey,
        query,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        // Only cache the unfiltered catalog. A query response is a subset and
        // must not become the source for a later cleared search.
        if (!query.trim()) {
          this.codexCache = {
            agentKey,
            catalog: result,
            expiresAt: Date.now() + CODEX_CATALOG_TTL_MS,
          };
        }
        this.codexCatalog = this.filterCodexCatalog(result, query);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        this.codexCatalog = { ...this.emptyCodexCatalog(), status: "unavailable" };
        this.error = userPluginErrorMessage(error, eu("pluginsLoadFailed"));
      }
    } finally {
      if (this.searchController === controller) {
        this.codexSearching = false;
      }
    }
  }

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
    this.resetCodexCopyFeedback();
    this.codexCache = undefined;
    super.disconnectedCallback();
  }

  private syncBootstrap(): void {
    const bootstrapState = userBootstrapStore.state;
    if (bootstrapState.phase !== "ready") {
      return;
    }
    const agents = bootstrapState.data.agents.filter(
      (agent) => agent.kind === "personal" || agent.actions.canChat,
    );
    if (!agents.some((agent) => agent.key === this.agentKey)) {
      this.agentKey = bootstrapState.data.defaultAgentKey ?? agents[0]?.key ?? "personal";
    }
    if (this.bootstrappedAgentKey === this.agentKey) {
      return;
    }
    this.bootstrappedAgentKey = this.agentKey;
    globalThis.clearTimeout(this.searchTimer);
    this.searchController?.abort();
    this.searchController = undefined;
    this.searching = false;
    this.codexSearching = false;
    this.installs = [];
    this.grants = [];
    this.catalog = [];
    this.codexDetail = null;
    this.reviewingCodexPluginId = null;
    this.requestingCodexPluginId = null;
    this.codexCatalog = {
      status: "available",
      items: [],
      installed: [],
      requests: [],
    };
    void this.loadInventory();
    if (this.tab === "discover") {
      void this.search();
    }
  }

  private async loadInventory(): Promise<void> {
    const requestId = ++this.inventoryRequestId;
    this.loading = true;
    this.error = "";
    try {
      const [inventory, requests, codex] = await Promise.all([
        loadUserExtensionInventory(this.agentKey),
        listUserPluginRequests(),
        ENTERPRISE_CODEX_PLUGINS_VISIBLE
          ? searchUserCodexPlugins({ agentKey: this.agentKey, query: "" })
          : Promise.resolve<UserCodexCatalog>({
              status: "available",
              items: [],
              installed: [],
              requests: [],
            }),
      ]);
      if (requestId === this.inventoryRequestId) {
        this.installs = inventory.items;
        this.grants = inventory.grants;
        this.requests = requests;
        this.codexCatalog = codex;
        this.codexCache = {
          agentKey: this.agentKey,
          catalog: codex,
          expiresAt: Date.now() + CODEX_CATALOG_TTL_MS,
        };
      }
    } catch (error) {
      if (requestId === this.inventoryRequestId) {
        this.error = userPluginErrorMessage(error, eu("pluginsLoadFailed"));
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
    this.searchController = undefined;
    this.catalog = [];
    this.codexDetail = null;
    this.codexCatalog = this.emptyCodexCatalog();
    this.error = "";
    this.searching = value.trim().length === 0 || value.trim().length >= MIN_SEARCH_LENGTH;
    const cached = this.searching ? this.cachedCodexCatalog(value) : null;
    this.codexSearching = this.searching && !cached;
    if (cached) {
      this.codexCatalog = cached;
    }
    if (!this.searching) {
      return;
    }
    this.searchTimer = globalThis.setTimeout(() => void this.search(), 250);
  }

  private async search(): Promise<void> {
    const query = this.query.trim();
    if (query.length > 0 && query.length < MIN_SEARCH_LENGTH) {
      this.catalog = [];
      this.codexCatalog = this.emptyCodexCatalog();
      this.searching = false;
      this.codexSearching = false;
      return;
    }
    this.searchController?.abort();
    const controller = new AbortController();
    this.searchController = controller;
    this.searching = true;
    this.catalog = [];
    this.error = "";
    // Commit each source as soon as it finishes; slow ClawHub must not hide ready Codex cards.
    const codex = this.loadCodexCatalog(controller, query);
    try {
      const items = await searchUserExtensions({
        agentKey: this.agentKey,
        query,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        this.catalog = items;
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        this.catalog = [];
        this.error = userPluginErrorMessage(error, eu("pluginsLoadFailed"));
      }
    } finally {
      if (this.searchController === controller) {
        this.searching = false;
      }
    }
    await codex;
  }

  private changeTab(tab: UserPluginsTab): void {
    this.tab = tab;
    if (tab !== "discover") {
      globalThis.clearTimeout(this.searchTimer);
      this.searchController?.abort();
      this.searchController = undefined;
      this.searching = false;
      this.codexSearching = false;
      void this.loadInventory();
      return;
    }
    void this.search();
  }

  private changeAgent(agentKey: string): void {
    const bootstrap = userBootstrapStore.state;
    const agent =
      bootstrap.phase === "ready"
        ? bootstrap.data.agents.find(
            (candidate) =>
              candidate.key === agentKey &&
              (candidate.kind === "personal" || candidate.actions.canChat),
          )
        : undefined;
    if (!agent) {
      return;
    }
    this.agentKey = agent.key;
    this.bootstrappedAgentKey = this.agentKey;
    this.installedFilter = "all";
    this.installs = [];
    this.grants = [];
    this.catalog = [];
    this.codexDetail = null;
    this.reviewingCodexPluginId = null;
    this.requestingCodexPluginId = null;
    this.codexCatalog = {
      status: "available",
      items: [],
      installed: [],
      requests: [],
    };
    void this.loadInventory();
    if (this.tab === "discover") {
      void this.search();
    }
  }

  private retry(): void {
    this.error = "";
    if (this.tab === "discover") {
      void this.search();
      return;
    }
    void this.loadInventory();
  }

  private async openReview(item: UserExtensionCatalogItem): Promise<void> {
    if (!canReviewExtension(item) || this.busy) {
      return;
    }
    this.busy = true;
    this.reviewingCatalogKey = item.catalogKey;
    this.error = "";
    try {
      this.review = await reviewUserExtension({
        agentKey: this.agentKey,
        kind: item.kind,
        catalogKey: item.catalogKey,
        ...(item.version ? { version: item.version } : {}),
      });
      this.reviewVersion = this.review.item.version;
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsDetailFailed"));
    } finally {
      this.reviewingCatalogKey = null;
      this.busy = false;
    }
  }

  private async openCodex(item: UserCodexCatalogItem): Promise<void> {
    if (this.busy) {
      return;
    }
    this.resetCodexCopyFeedback();
    this.busy = true;
    this.reviewingCodexPluginId = item.id;
    this.error = "";
    try {
      this.codexDetail = await loadUserCodexPluginDetail({
        agentKey: this.agentKey,
        pluginId: item.id,
      });
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsDetailFailed"));
    } finally {
      this.reviewingCodexPluginId = null;
      this.busy = false;
    }
  }

  private async requestCodex(item: UserCodexCatalogItem): Promise<void> {
    if (this.busy || !item.available || item.requestState === "pending" || item.grantState) {
      return;
    }
    this.busy = true;
    this.requestingCodexPluginId = item.id;
    this.error = "";
    try {
      await createUserCodexPluginRequest({ agentKey: this.agentKey, pluginId: item.id });
      this.codexDetail = null;
      this.tab = "requests";
      this.query = "";
      await this.loadInventory();
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsCodexRequestFailed"));
    } finally {
      this.requestingCodexPluginId = null;
      this.busy = false;
    }
  }

  private async cancelCodexRequest(item: UserCodexPluginRequest): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await cancelUserCodexPluginRequest(item);
      this.codexDetail = null;
      await this.loadInventory();
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
    } finally {
      this.busy = false;
    }
  }

  private async toggleCodex(item: UserCodexPluginGrant): Promise<void> {
    if (this.busy || item.state === "unavailable" || item.state === "revoked") {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await setUserCodexPluginEnabled(item, item.state !== "active");
      await this.loadInventory();
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
    } finally {
      this.busy = false;
    }
  }

  private async removeCodex(item: UserCodexPluginGrant): Promise<void> {
    if (
      this.busy ||
      !(await showConfirmDialog({
        title: eu("pluginsCodexRemoveAccess"),
        message: eu("pluginsCodexRemoveAccessConfirm", { name: item.pluginName }),
        confirmLabel: eu("pluginsCodexRemoveAccess"),
        danger: true,
      }))
    ) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await removeUserCodexPlugin(item);
      this.codexDetail = null;
      await this.loadInventory();
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
    } finally {
      this.busy = false;
    }
  }

  private async refreshCodex(item: UserCodexPluginGrant): Promise<void> {
    if (this.busy) {
      return;
    }
    // Keep the currently open detail tied to the same Agent/plugin while the
    // runtime refreshes. A refresh may update connector accounts and readiness
    // without changing the user's selected page or detail dialog.
    const selectedDetail = this.codexDetail;
    const selectedAgentKey = this.agentKey;
    const selectedPluginId = selectedDetail?.item.id;
    this.busy = true;
    this.error = "";
    try {
      await refreshUserCodexPlugin(item);
      await this.loadInventory();
      if (
        selectedDetail &&
        selectedPluginId &&
        this.agentKey === selectedAgentKey &&
        this.codexDetail === selectedDetail
      ) {
        try {
          const refreshedDetail = await loadUserCodexPluginDetail({
            agentKey: selectedAgentKey,
            pluginId: selectedPluginId,
          });
          if (this.agentKey === selectedAgentKey && this.codexDetail === selectedDetail) {
            this.codexDetail = refreshedDetail;
          }
        } catch (error) {
          if (this.agentKey === selectedAgentKey && this.codexDetail === selectedDetail) {
            this.error = userPluginErrorMessage(error, eu("pluginsDetailFailed"));
          }
        }
      }
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
    } finally {
      this.busy = false;
    }
  }

  private async connectCodex(item: UserCodexPluginGrant, serverName: string): Promise<void> {
    if (this.busy || item.state === "revoked" || item.state === "unavailable") {
      return;
    }
    // Reserve a tab while the click still has a user gesture; some browsers
    // block a popup opened only after the gateway returns the OAuth URL.
    const popup = globalThis.open?.("about:blank", "_blank", "noopener,noreferrer");
    this.busy = true;
    this.error = "";
    try {
      const result = await connectUserCodexPlugin(item, serverName);
      const authorizationUrl = safeHttpUrl(
        result.authorizationUrl ?? result.connectUrls?.find((url) => safeHttpUrl(url)),
      );
      if (authorizationUrl) {
        if (popup && !popup.closed) {
          popup.location.href = authorizationUrl;
        } else {
          globalThis.open?.(authorizationUrl, "_blank", "noopener,noreferrer");
        }
      } else if (popup && !popup.closed) {
        popup.close();
      }
      await this.loadInventory();
    } catch (error) {
      if (popup && !popup.closed) {
        popup.close();
      }
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
    } finally {
      this.busy = false;
    }
  }

  private async useCodexPrompt(prompt: string): Promise<void> {
    const draft = prompt.trim();
    if (!draft || this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await openUserAgentConversation(this.context, this.agentKey, "new", { draft });
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("conversationCreateFailed"));
    } finally {
      this.busy = false;
    }
  }

  private async tryCodexNow(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await openUserAgentConversation(this.context, this.agentKey, "new");
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("conversationCreateFailed"));
    } finally {
      this.busy = false;
    }
  }

  private async copyCodex(value: string): Promise<void> {
    if (!value.trim() || this.codexCopyFeedback === "copying") {
      return;
    }
    this.codexCopyFeedback = "copying";
    const copied = await copyToClipboard(value);
    if (!this.isConnected) {
      return;
    }
    this.codexCopyFeedback = copied ? "copied" : "error";
    if (this.codexCopyResetTimer !== null) {
      globalThis.clearTimeout(this.codexCopyResetTimer);
    }
    this.codexCopyResetTimer = globalThis.setTimeout(
      () => {
        this.codexCopyResetTimer = null;
        this.codexCopyFeedback = "idle";
      },
      copied ? 1800 : 2400,
    );
  }

  private resetCodexCopyFeedback(): void {
    if (this.codexCopyResetTimer !== null) {
      globalThis.clearTimeout(this.codexCopyResetTimer);
      this.codexCopyResetTimer = null;
    }
    this.codexCopyFeedback = "idle";
  }

  private async commitReview(): Promise<void> {
    if (
      !this.review ||
      this.busy ||
      this.review.item.allowedAction === "none" ||
      (this.reviewVersion !== null && this.reviewVersion.trim() !== this.review.item.version)
    ) {
      return;
    }
    this.busy = true;
    this.error = "";
    const action = this.review.item.allowedAction;
    try {
      if (action === "install_skill") {
        await installUserSkill(this.review.reviewToken);
      } else {
        await createUserPluginRequest(this.review.reviewToken);
      }
      this.review = null;
      this.tab = action === "install_skill" ? "installed" : "requests";
      this.installedFilter = "all";
      this.catalog = [];
      this.codexCatalog = this.emptyCodexCatalog();
      this.searchController?.abort();
      globalThis.clearTimeout(this.searchTimer);
      await this.loadInventory();
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
    } finally {
      this.busy = false;
    }
  }

  private async toggleSkill(item: UserSkillInstall): Promise<void> {
    this.busy = true;
    this.error = "";
    try {
      await setUserSkillEnabled(item, !item.enabled);
      await this.loadInventory();
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
    } finally {
      this.busy = false;
    }
  }

  private async updateSkill(item: UserSkillInstall): Promise<void> {
    this.busy = true;
    this.error = "";
    try {
      const review = await reviewUserExtension({
        agentKey: item.agentKey,
        kind: "skill",
        catalogKey: item.clawhubRef,
      });
      await updateUserSkill(item, review.reviewToken);
      await this.loadInventory();
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
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
    this.error = "";
    try {
      await removeUserSkill(item);
      await this.loadInventory();
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
    } finally {
      this.busy = false;
    }
  }

  private async cancelRequest(item: UserPluginRequest): Promise<void> {
    this.busy = true;
    this.error = "";
    try {
      await cancelUserPluginRequest(item);
      this.catalog = [];
      this.codexCatalog = this.emptyCodexCatalog();
      await this.loadInventory();
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
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
    this.error = "";
    try {
      await relinquishUserPluginGrant(item);
      await this.loadInventory();
    } catch (error) {
      this.error = userPluginErrorMessage(error, eu("pluginsMutationFailed"));
    } finally {
      this.busy = false;
    }
  }

  override render() {
    const bootstrap = userBootstrapStore.state;
    const agents =
      bootstrap.phase === "ready"
        ? bootstrap.data.agents.filter(
            (agent) => agent.kind === "personal" || agent.actions.canChat,
          )
        : [];
    return renderUserPlugins({
      tab: this.tab,
      installedFilter: this.installedFilter,
      agents,
      agentKey: this.agentKey,
      query: this.query,
      loading: this.loading,
      searching: this.searching,
      codexSearching: this.codexSearching,
      busy: this.busy,
      reviewingCatalogKey: this.reviewingCatalogKey,
      error: this.error,
      catalog: this.catalog,
      codexCatalog: this.codexCatalog,
      codexDetail: this.codexDetail,
      reviewingCodexPluginId: this.reviewingCodexPluginId,
      requestingCodexPluginId: this.requestingCodexPluginId,
      installs: this.installs,
      grants: this.grants,
      requests: this.requests,
      review: this.review,
      reviewVersion: this.reviewVersion,
      onReviewVersionChange: (version) => {
        this.reviewVersion = version;
      },
      onTabChange: (tab) => this.changeTab(tab),
      onInstalledFilterChange: (filter) => {
        this.installedFilter = filter;
      },
      onAgentChange: (agentKey) => this.changeAgent(agentKey),
      onQueryChange: (query) => this.queueSearch(query),
      onRetry: () => this.retry(),
      onDismissError: () => {
        this.error = "";
      },
      onReview: (item) => void this.openReview(item),
      onCloseReview: () => {
        this.review = null;
        this.reviewVersion = null;
      },
      onCommitReview: () => void this.commitReview(),
      onToggleSkill: (item) => void this.toggleSkill(item),
      onUpdateSkill: (item) => void this.updateSkill(item),
      onRemoveSkill: (item) => void this.removeSkill(item),
      onCancelRequest: (item) => void this.cancelRequest(item),
      onRelinquishGrant: (item) => void this.relinquishGrant(item),
      onOpenCodex: (item) => void this.openCodex(item),
      onRequestCodex: (item) => void this.requestCodex(item),
      onCancelCodexRequest: (item) => void this.cancelCodexRequest(item),
      onToggleCodex: (item) => void this.toggleCodex(item),
      onRemoveCodex: (item) => void this.removeCodex(item),
      onRefreshCodex: (item) => void this.refreshCodex(item),
      onConnectCodex: (item, serverName) => void this.connectCodex(item, serverName),
      onTryCodex: () => void this.tryCodexNow(),
      onUseCodexPrompt: (prompt) => void this.useCodexPrompt(prompt),
      onCopyCodex: (value) => void this.copyCodex(value),
      copyFeedback: this.codexCopyFeedback,
      onCloseCodexDetail: () => {
        this.codexDetail = null;
        this.resetCodexCopyFeedback();
      },
    });
  }
}

if (!customElements.get("openclaw-user-plugins-page")) {
  customElements.define("openclaw-user-plugins-page", UserPluginsPage);
}
