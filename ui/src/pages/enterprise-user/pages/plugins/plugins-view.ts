import { html, nothing, type TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type { AgentSelectOption } from "../../../../components/agent-select.ts";
import { renderHubTabs } from "../../../../components/hub-tabs.ts";
import "../../../../components/agent-select-registration.ts";
import { icons } from "../../../../components/icons.ts";
import {
  renderSettingsPage,
  renderSettingsSection,
  renderSettingsSegmented,
  renderSettingsStatus,
} from "../../../../components/settings-ui.ts";
import "../../../../components/modal-dialog.ts";
import { renderSettingsWorkspace } from "../../../../components/settings-workspace.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { i18n } from "../../../../i18n/index.ts";
import { ENTERPRISE_CODEX_PLUGINS_VISIBLE } from "../../../enterprise-plugin-visibility.ts";
import type { EnterpriseUserAgent } from "../../contracts/user-agent.ts";
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
  renderCodexCatalog,
  renderCodexDetailDialog,
  renderCodexInstalled,
  renderCodexRequests,
  type CodexCatalogViewProps,
} from "./plugins-codex-catalog.ts";
import {
  kindLabel,
  renderArtTile,
  renderEmpty,
  renderGrantStatus,
  renderMetaLine,
  renderRequestStateStatus,
  renderRequestStatus,
  renderSkillStatus,
} from "./plugins-presentation.ts";
import "../../../../styles/plugins.css";
import "../../styles/plugins.css";

export type UserPluginsTab = "installed" | "discover" | "requests";
export type UserInstalledFilter = "all" | "enabled" | "disabled" | "issues";

export type UserPluginsViewProps = {
  tab: UserPluginsTab;
  installedFilter: UserInstalledFilter;
  agents: readonly EnterpriseUserAgent[];
  agentKey: string;
  query: string;
  loading: boolean;
  searching: boolean;
  codexSearching: boolean;
  busy: boolean;
  reviewingCatalogKey: string | null;
  error: string;
  catalog: readonly UserExtensionCatalogItem[];
  codexCatalog: UserCodexCatalog;
  codexDetail: UserCodexPluginDetail | null;
  reviewingCodexPluginId: string | null;
  requestingCodexPluginId: string | null;
  installs: readonly UserSkillInstall[];
  grants: readonly UserPluginGrant[];
  requests: readonly UserPluginRequest[];
  review: UserExtensionReview | null;
  reviewVersion: string | null;
  onReviewVersionChange: (version: string) => void;
  onTabChange: (tab: UserPluginsTab) => void;
  onInstalledFilterChange: (filter: UserInstalledFilter) => void;
  onAgentChange: (agentKey: string) => void;
  onQueryChange: (query: string) => void;
  onRetry: () => void;
  onDismissError: () => void;
  onReview: (item: UserExtensionCatalogItem) => void;
  onCloseReview: () => void;
  onCommitReview: () => void;
  onToggleSkill: (item: UserSkillInstall) => void;
  onUpdateSkill: (item: UserSkillInstall) => void;
  onRemoveSkill: (item: UserSkillInstall) => void;
  onCancelRequest: (item: UserPluginRequest) => void;
  onRelinquishGrant: (item: UserPluginGrant) => void;
  onOpenCodex: (item: UserCodexCatalogItem) => void;
  onRequestCodex: (item: UserCodexCatalogItem) => void;
  onCancelCodexRequest: (item: UserCodexPluginRequest) => void;
  onToggleCodex: (item: UserCodexPluginGrant) => void;
  onRemoveCodex: (item: UserCodexPluginGrant) => void;
  onRefreshCodex: (item: UserCodexPluginGrant) => void;
  onConnectCodex: (item: UserCodexPluginGrant, serverName: string) => void;
  onTryCodex?: () => void;
  onUseCodexPrompt?: (prompt: string) => void;
  onCopyCodex?: (value: string) => void;
  copyFeedback?: CodexCatalogViewProps["copyFeedback"];
  onCloseCodexDetail: () => void;
};

const USER_PLUGINS_PANEL_ID = "enterprise-user-plugins-panel";
const MIN_SEARCH_LENGTH = 2;

function codexViewProps(props: UserPluginsViewProps): CodexCatalogViewProps {
  return {
    busy: props.busy,
    reviewingPluginId: props.reviewingCodexPluginId,
    requestingPluginId: props.requestingCodexPluginId,
    detail: props.codexDetail,
    onOpen: props.onOpenCodex,
    onRequest: props.onRequestCodex,
    onCancelRequest: props.onCancelCodexRequest,
    onToggle: props.onToggleCodex,
    onRemove: props.onRemoveCodex,
    onRefresh: props.onRefreshCodex,
    onConnect: props.onConnectCodex,
    onTryNow: props.onTryCodex,
    onUsePrompt: props.onUseCodexPrompt,
    onCopy: props.onCopyCodex,
    copyFeedback: props.copyFeedback,
    onCloseDetail: props.onCloseCodexDetail,
  };
}

function agentOptions(agents: readonly EnterpriseUserAgent[]): AgentSelectOption[] {
  return agents.map((agent) => ({
    value: agent.key,
    label: agent.name,
    description: agent.kind === "personal" ? eu("personalAgent") : eu("managedByCompany"),
  }));
}

function renderAgentField(props: UserPluginsViewProps) {
  return html`<div class="plugins-field eu-plugins-agent-field">
    <span>${eu("pluginsAgent")}</span>
    <openclaw-agent-select
      class="agent-select--settings"
      .options=${agentOptions(props.agents)}
      .value=${props.agentKey}
      .accessibleLabel=${eu("pluginsAgent")}
      .disabled=${props.loading || props.busy}
      .onSelect=${props.onAgentChange}
    ></openclaw-agent-select>
  </div>`;
}

function isIssue(item: UserSkillInstall): boolean {
  return item.state === "needs_setup" || item.state === "modified" || item.state === "error";
}

function isCodexIssue(item: UserCodexPluginGrant): boolean {
  return (
    item.state === "unavailable" ||
    (item.state === "active" && (item.authRequired === true || item.ready === false))
  );
}

function filteredInstalls(props: UserPluginsViewProps): UserSkillInstall[] {
  return props.installs.filter((item) => {
    if (props.installedFilter === "issues") {
      return isIssue(item);
    }
    if (props.installedFilter === "enabled") {
      return item.enabled && !isIssue(item);
    }
    if (props.installedFilter === "disabled") {
      return !item.enabled && !isIssue(item);
    }
    return true;
  });
}

function filteredCodexGrants(props: UserPluginsViewProps): UserCodexPluginGrant[] {
  return props.codexCatalog.installed.filter((item) => {
    if (props.installedFilter === "issues") {
      return isCodexIssue(item);
    }
    if (props.installedFilter === "enabled") {
      return item.state === "active" && !isCodexIssue(item);
    }
    if (props.installedFilter === "disabled") {
      return item.state === "disabled";
    }
    return true;
  });
}

function renderPluginVersion(version: string | null | undefined) {
  return version
    ? html`<span class="plugins-version">${eu("pluginsVersion")} ${version}</span>`
    : nothing;
}

function renderInstalledToolbar(props: UserPluginsViewProps) {
  const allInstalled = [...props.installs, ...props.codexCatalog.installed];
  const issues =
    props.installs.filter(isIssue).length +
    props.codexCatalog.installed.filter(isCodexIssue).length;
  const enabled =
    props.installs.filter((item) => item.enabled && !isIssue(item)).length +
    props.codexCatalog.installed.filter((item) => item.state === "active" && !isCodexIssue(item))
      .length;
  const counts: Record<UserInstalledFilter, number> = {
    all: allInstalled.length,
    enabled,
    disabled: allInstalled.length - enabled - issues,
    issues,
  };
  const labels: Record<UserInstalledFilter, string> = {
    all: eu("pluginsFilterAll"),
    enabled: eu("pluginsFilterEnabled"),
    disabled: eu("pluginsFilterDisabled"),
    issues: eu("pluginsFilterIssues"),
  };
  return html`<div class="plugins-toolbar plugins-toolbar--fields eu-plugins-toolbar">
    ${renderSettingsSegmented<UserInstalledFilter>({
      value: props.installedFilter,
      ariaLabel: eu("pluginsFilterLabel"),
      options: (["all", "enabled", "disabled", "issues"] as const).map((value) => ({
        value,
        label: html`${labels[value]} <span class="settings-count">${counts[value]}</span>`,
      })),
      onChange: props.onInstalledFilterChange,
    })}
    ${renderAgentField(props)}
    <span class="plugins-toolbar__hint">
      ${eu("pluginsShown", {
        count: String(filteredInstalls(props).length + filteredCodexGrants(props).length),
      })}
    </span>
  </div>`;
}

function renderDiscoverToolbar(props: UserPluginsViewProps) {
  return html`<div class="plugins-toolbar plugins-toolbar--fields eu-plugins-toolbar">
    ${renderAgentField(props)}
    <label class="plugins-field eu-plugins-search-field">
      <span>${eu("pluginsSearch")}</span>
      <input
        class="settings-input"
        type="search"
        name="user-plugin-search"
        autocomplete="off"
        .value=${props.query}
        placeholder=${eu("pluginsSearchPlaceholder")}
        @input=${(event: Event) => {
          if (event.currentTarget instanceof HTMLInputElement) {
            props.onQueryChange(event.currentTarget.value);
          }
        }}
      />
    </label>
    ${props.query.trim().length !== 1 && !(props.searching && props.codexSearching)
      ? html`<span class="plugins-toolbar__hint">
          ${eu("pluginsShown", {
            count: String(props.catalog.length + props.codexCatalog.items.length),
          })}
        </span>`
      : nothing}
  </div>`;
}

function renderSkillRow(item: UserSkillInstall, props: UserPluginsViewProps) {
  const locked = props.busy || item.state === "modified";
  return html`<article
    class="settings-row plugins-item"
    data-skill-install-id=${item.id}
    data-plugin-status=${item.state}
    aria-busy=${props.busy ? "true" : "false"}
  >
    ${renderArtTile(item.clawhubRef, item.skillName)}
    <div class="settings-row__text">
      <h3 class="settings-row__title">
        ${item.skillName}${renderPluginVersion(item.exactVersion)}
      </h3>
      <span class="settings-row__desc">${item.clawhubRef}</span>
      ${renderMetaLine([
        eu("pluginsKindSkill"),
        html`<span class="plugins-meta__mono" title=${item.integrity}>${item.integrity}</span>`,
      ])}
    </div>
    <div class="settings-row__control">
      ${renderSkillStatus(item)}
      <button
        type="button"
        class="btn btn--sm"
        ?disabled=${locked}
        @click=${() => props.onToggleSkill(item)}
      >
        ${item.enabled ? eu("pluginsDisable") : eu("pluginsEnable")}
      </button>
      <button
        type="button"
        class="btn btn--sm"
        ?disabled=${locked}
        @click=${() => props.onUpdateSkill(item)}
      >
        ${eu("pluginsUpdate")}
      </button>
      <button
        type="button"
        class="btn btn--sm eu-plugin-remove"
        ?disabled=${props.busy}
        @click=${() => props.onRemoveSkill(item)}
      >
        ${eu("pluginsRemove")}
      </button>
    </div>
    ${item.safeErrorCode
      ? html`<div class="plugins-row-message plugins-row-message--error" role="alert">
          ${item.safeErrorCode}
        </div>`
      : nothing}
  </article>`;
}

function renderGrantRow(item: UserPluginGrant, props: UserPluginsViewProps) {
  return html`<article
    class="settings-row plugins-item"
    data-plugin-grant-id=${item.id}
    data-plugin-status=${item.state}
  >
    ${renderArtTile(item.pluginId, item.pluginId)}
    <div class="settings-row__text">
      <h3 class="settings-row__title">${item.pluginId}${renderPluginVersion(item.exactVersion)}</h3>
      <span class="settings-row__desc">${eu("pluginsNativeGrantsDescription")}</span>
      ${renderMetaLine([
        eu("pluginsToolsCount", { count: String(item.approvedTools.length) }),
        html`<span class="plugins-meta__mono" title=${item.integrity}>${item.integrity}</span>`,
      ])}
    </div>
    <div class="settings-row__control">
      ${renderGrantStatus(item)}
      ${item.state !== "revoked"
        ? html`<button
            type="button"
            class="btn btn--sm eu-plugin-remove"
            ?disabled=${props.busy}
            @click=${() => props.onRelinquishGrant(item)}
          >
            ${eu("pluginsRelinquish")}
          </button>`
        : nothing}
    </div>
  </article>`;
}

function renderInstalled(props: UserPluginsViewProps) {
  const visible = filteredInstalls(props);
  const visibleCodex = filteredCodexGrants(props);
  const agentName =
    props.agents.find((agent) => agent.key === props.agentKey)?.name ?? props.agentKey;
  return html`
    ${visible.length > 0
      ? renderSettingsSection(
          { title: eu("pluginsSkillsForAgent", { name: agentName }), count: visible.length },
          repeat(
            visible,
            (item) => item.id,
            (item) => renderSkillRow(item, props),
          ),
        )
      : nothing}
    ${visibleCodex.length > 0
      ? renderCodexInstalled(
          { ...props.codexCatalog, installed: visibleCodex },
          codexViewProps(props),
        )
      : nothing}
    ${visible.length === 0 && visibleCodex.length === 0
      ? renderEmpty(
          props.installs.length > 0 || props.codexCatalog.installed.length > 0
            ? eu("pluginsNoInstalledMatchTitle")
            : eu("pluginsInventoryEmptyTitle"),
          props.installs.length > 0 || props.codexCatalog.installed.length > 0
            ? eu("pluginsNoMatchBody")
            : eu("pluginsInventoryEmpty"),
          props.installs.length > 0 || props.codexCatalog.installed.length > 0
            ? "curious"
            : "sleepy",
        )
      : nothing}
    ${props.grants.length > 0
      ? renderSettingsSection(
          {
            title: eu("pluginsNativeGrants"),
            description: eu("pluginsNativeGrantsDescription"),
            count: props.grants.length,
          },
          repeat(
            props.grants,
            (item) => item.id,
            (item) => renderGrantRow(item, props),
          ),
        )
      : nothing}
  `;
}

function hasOpenRequest(item: UserExtensionCatalogItem): boolean {
  return (
    item.requestState === "pending" ||
    item.requestState === "approving" ||
    item.requestState === "available"
  );
}

function renderCatalogStatus(item: UserExtensionCatalogItem) {
  if (item.requestState) {
    return renderRequestStateStatus(item.requestState);
  }
  if (
    item.allowedAction === "none" &&
    item.reasonCodes.includes("REVIEW_REQUIRED") &&
    !item.reasonCodes.includes("ALTERNATE_REGISTRY_DENIED")
  ) {
    return renderSettingsStatus({ kind: "muted", label: eu("pluginsReviewRequired") });
  }
  if (item.allowedAction === "install_skill") {
    return renderSettingsStatus({ kind: "ok", label: eu("pluginsClean") });
  }
  if (item.allowedAction === "request_admin") {
    return renderSettingsStatus({ kind: "warn", label: eu("pluginsReasonNativeAdmin") });
  }
  return renderSettingsStatus({ kind: "danger", label: eu("pluginsReasonTrust") });
}

export function canReviewExtension(item: UserExtensionCatalogItem): boolean {
  return (
    item.allowedAction !== "none" ||
    (item.reasonCodes.includes("REVIEW_REQUIRED") &&
      !item.reasonCodes.includes("ALTERNATE_REGISTRY_DENIED"))
  );
}

function canReview(item: UserExtensionCatalogItem, props: UserPluginsViewProps): boolean {
  return (
    canReviewExtension(item) && !hasOpenRequest(item) && !installedSkill(item, props) && !props.busy
  );
}

function installedSkill(
  item: UserExtensionCatalogItem,
  props: UserPluginsViewProps,
): UserSkillInstall | undefined {
  return item.kind === "skill"
    ? props.installs.find(
        (install) => install.agentKey === props.agentKey && install.clawhubRef === item.catalogKey,
      )
    : undefined;
}

function renderCatalogRow(item: UserExtensionCatalogItem, props: UserPluginsViewProps) {
  const reviewable = canReview(item, props);
  const installed = installedSkill(item, props);
  const reviewing = props.reviewingCatalogKey === item.catalogKey;
  return html`<article
    class="settings-row plugins-item ${reviewable ? "plugins-item--clickable" : ""}"
    data-extension-key=${item.catalogKey}
    data-extension-kind=${item.kind}
    aria-busy=${reviewing ? "true" : "false"}
    @click=${(event: Event) => {
      const interactive =
        event.target instanceof Element && event.target.closest("button, a, input");
      if (reviewable && !interactive) {
        props.onReview(item);
      }
    }}
  >
    ${renderArtTile(item.catalogKey, item.name)}
    <div class="settings-row__text">
      <h3 class="settings-row__title">
        ${reviewable
          ? html`<button
              type="button"
              class="plugins-item__detail-button"
              @click=${() => props.onReview(item)}
            >
              ${item.name}${renderPluginVersion(item.version)}
            </button>`
          : html`${item.name}${renderPluginVersion(item.version)}`}
      </h3>
      <span class="settings-row__desc">${item.description ?? item.catalogKey}</span>
      ${renderMetaLine([
        kindLabel(item.kind),
        item.publisher ?? nothing,
        item.requirements.length > 0
          ? eu("pluginsRequirementsCount", { count: String(item.requirements.length) })
          : nothing,
      ])}
    </div>
    <div class="settings-row__control">
      ${installed ? renderSkillStatus(installed) : renderCatalogStatus(item)}
      <button
        type="button"
        class="btn btn--sm plugins-install"
        ?disabled=${!reviewable}
        @click=${() => props.onReview(item)}
      >
        ${installed
          ? eu("pluginsInstalled")
          : reviewing
            ? eu("pluginsReviewBusy")
            : eu("pluginsReview")}
      </button>
    </div>
  </article>`;
}

function renderDiscover(props: UserPluginsViewProps) {
  const query = props.query.trim();
  if (query.length > 0 && query.length < MIN_SEARCH_LENGTH) {
    return renderEmpty(
      eu("pluginsDiscoverPromptTitle"),
      eu("pluginsDiscoverPromptBody"),
      "curious",
    );
  }
  if (
    !props.searching &&
    !props.codexSearching &&
    props.catalog.length === 0 &&
    props.codexCatalog.items.length === 0 &&
    props.codexCatalog.status === "available"
  ) {
    return renderEmpty(
      query ? eu("pluginsNoResultsTitle", { query }) : eu("pluginsSearchEmpty"),
      eu("pluginsNoResultsBody"),
      "curious",
    );
  }
  const skills = props.catalog.filter((item) => item.kind === "skill");
  const nativePlugins = props.catalog.filter((item) => item.kind !== "skill");
  return html`
    ${ENTERPRISE_CODEX_PLUGINS_VISIBLE
      ? renderCodexCatalog(props.codexCatalog, props.codexSearching, codexViewProps(props))
      : nothing}
    ${props.searching
      ? html`<div class="plugins-search-state" role="status">${eu("pluginsLoadingClawHub")}</div>`
      : nothing}
    ${skills.length > 0
      ? renderSettingsSection(
          { title: eu("pluginsCatalogSkills"), count: skills.length },
          repeat(
            skills,
            (item) => item.catalogKey,
            (item) => renderCatalogRow(item, props),
          ),
        )
      : nothing}
    ${nativePlugins.length > 0
      ? renderSettingsSection(
          {
            title: eu("pluginsCatalogNative"),
            description: eu("pluginsNativeCatalogDescription"),
            count: nativePlugins.length,
          },
          repeat(
            nativePlugins,
            (item) => item.catalogKey,
            (item) => renderCatalogRow(item, props),
          ),
        )
      : nothing}
  `;
}

function renderRequestRow(item: UserPluginRequest, props: UserPluginsViewProps) {
  return html`<article
    class="settings-row plugins-item"
    data-plugin-request-id=${item.id}
    data-plugin-status=${item.state}
  >
    ${renderArtTile(item.packageName, item.packageName)}
    <div class="settings-row__text">
      <h3 class="settings-row__title">
        ${item.packageName}${renderPluginVersion(item.exactVersion)}
      </h3>
      <span class="settings-row__desc">${eu("pluginsNativeCatalogDescription")}</span>
      ${renderMetaLine([
        item.packageFamily === "code_plugin" ? eu("pluginsKindCode") : eu("pluginsKindBundle"),
        eu("updatedAt", { time: new Date(item.updatedAt).toLocaleDateString(i18n.getLocale()) }),
      ])}
    </div>
    <div class="settings-row__control">
      ${renderRequestStatus(item)}
      ${item.state === "pending"
        ? html`<button
            type="button"
            class="btn btn--sm eu-plugin-remove"
            ?disabled=${props.busy}
            @click=${() => props.onCancelRequest(item)}
          >
            ${eu("pluginsCancelRequest")}
          </button>`
        : nothing}
    </div>
    ${item.decisionReason || item.safeErrorCode
      ? html`<div
          class="plugins-row-message eu-plugin-request-note ${item.state === "rejected" ||
          item.state === "install_failed"
            ? "plugins-row-message--error"
            : "plugins-row-message--warning"}"
          role=${item.state === "rejected" || item.state === "install_failed" ? "alert" : "status"}
        >
          ${item.decisionReason ??
          (item.safeErrorCode === "PLUGIN_INSTALL_FAILED"
            ? eu("pluginsInstallFailedHelp")
            : item.safeErrorCode)}
        </div>`
      : nothing}
  </article>`;
}

function renderRequests(props: UserPluginsViewProps) {
  if (props.requests.length === 0 && props.codexCatalog.requests.length === 0) {
    return renderEmpty(eu("pluginsRequestsEmptyTitle"), eu("pluginsRequestsEmpty"), "sleepy");
  }
  return html`
    ${props.requests.length > 0
      ? renderSettingsSection(
          {
            title: eu("pluginsRequestHistory"),
            description: eu("pluginsRequestHistoryDescription"),
            count: props.requests.length,
          },
          repeat(
            props.requests,
            (item) => item.id,
            (item) => renderRequestRow(item, props),
          ),
        )
      : nothing}
    ${ENTERPRISE_CODEX_PLUGINS_VISIBLE
      ? renderCodexRequests(props.codexCatalog, codexViewProps(props))
      : nothing}
  `;
}

function renderDetailMeta(label: string, value: unknown, mono = false) {
  return html`<div class="plugins-detail__meta-row">
    <span class="plugins-detail__meta-label">${label}</span>
    <span class="plugins-detail__meta-value ${mono ? "plugins-meta__mono" : ""}">${value}</span>
  </div>`;
}

function renderReviewDialog(props: UserPluginsViewProps) {
  const review = props.review;
  if (!review) {
    return nothing;
  }
  const item = review.item;
  const reviewVersion = props.reviewVersion ?? item.version ?? "";
  const versionChanged = reviewVersion.trim() !== (item.version ?? "");
  const native = item.allowedAction === "request_admin";
  const actionLabel = native
    ? props.busy
      ? eu("pluginsRequestBusy")
      : eu("pluginsRequestAdmin")
    : props.busy
      ? eu("pluginsInstallBusy")
      : eu("pluginsInstall");
  return html`<openclaw-modal-dialog
    .open=${true}
    .label=${item.name}
    @modal-cancel=${props.onCloseReview}
  >
    <article class="plugins-detail eu-plugin-detail">
      ${renderArtTile(item.catalogKey, item.name, "plugins-cover")}
      <button
        type="button"
        class="btn btn--icon plugins-detail__close"
        aria-label=${eu("pluginsClose")}
        @click=${props.onCloseReview}
      >
        ${icons.x}
      </button>
      <div class="plugins-detail__body">
        <div class="plugins-detail__title">
          <h2>${item.name}</h2>
          ${renderPluginVersion(item.version)}
        </div>
        <p class="plugins-detail__description">${item.description ?? item.catalogKey}</p>
        <div class="eu-plugin-review-status">${renderCatalogStatus(item)}</div>
        ${item.kind !== "skill"
          ? html`<div class="plugins-toolbar plugins-toolbar--fields">
              <label class="plugins-field">
                <span>${eu("pluginsVersion")}</span>
                <input
                  type="text"
                  .value=${reviewVersion}
                  maxlength="64"
                  autocomplete="off"
                  ?disabled=${props.busy}
                  @input=${(event: Event) =>
                    props.onReviewVersionChange((event.target as HTMLInputElement).value)}
                />
              </label>
              <button
                type="button"
                class="btn btn--sm"
                ?disabled=${props.busy || !reviewVersion.trim()}
                @click=${() => props.onReview({ ...item, version: reviewVersion.trim() })}
              >
                ${props.busy ? eu("pluginsReviewBusy") : eu("pluginsReview")}
              </button>
            </div>`
          : nothing}
        <div class="plugins-detail__meta">
          ${renderDetailMeta(eu("pluginsPublisher"), item.publisher ?? "—")}
          ${renderDetailMeta(eu("pluginsVersion"), item.version ?? "—")}
          ${renderDetailMeta(eu("pluginsTrust"), item.trust?.disposition ?? "—")}
          ${item.integrity
            ? renderDetailMeta(eu("pluginsIntegrity"), item.integrity, true)
            : nothing}
          ${item.requirements.length > 0
            ? renderDetailMeta(eu("pluginsRequirements"), item.requirements.join(", "))
            : nothing}
        </div>
        <div class="plugins-readonly eu-plugin-scope-note" role="note">
          <span aria-hidden="true">${native ? icons.shieldQuestion : icons.lock}</span>
          <span>${native ? eu("pluginsNativeScope") : eu("pluginsSkillScope")}</span>
        </div>
        ${props.error
          ? html`<p class="plugins-row-message plugins-row-message--error" role="alert">
              ${props.error}
            </p>`
          : nothing}
        <div class="plugins-detail__actions">
          <button type="button" class="btn" @click=${props.onCloseReview}>
            ${eu("pluginsClose")}
          </button>
          <button
            type="button"
            class="btn primary plugins-install"
            ?disabled=${props.busy || item.allowedAction === "none" || versionChanged}
            aria-busy=${props.busy ? "true" : "false"}
            @click=${props.onCommitReview}
          >
            ${actionLabel}
          </button>
        </div>
      </div>
    </article>
  </openclaw-modal-dialog>`;
}

function renderHeader(props: UserPluginsViewProps) {
  const activeRequests =
    props.requests.filter((item) => item.state === "pending" || item.state === "approving").length +
    props.codexCatalog.requests.filter(
      (item) => item.state === "pending" || item.state === "approving",
    ).length;
  return html`<section
    class="content-header content-header--page hub-page-header plugins-hub-header eu-plugins-header"
  >
    <div class="hub-page-header__title">
      <h1 class="page-title">${eu("plugins")}</h1>
      <div class="page-subtitle">${eu("pluginsDescription")}</div>
    </div>
    <div class="hub-page-header__tabs">
      ${renderHubTabs<UserPluginsTab>({
        id: "user-plugins",
        active: props.tab,
        ariaLabel: eu("plugins"),
        panelId: USER_PLUGINS_PANEL_ID,
        tabs: [
          {
            value: "installed",
            label: eu("pluginsInstalled"),
            count: props.installs.length + props.codexCatalog.installed.length,
          },
          { value: "discover", label: eu("pluginsDiscover") },
          {
            value: "requests",
            label: eu("pluginsRequests"),
            count: activeRequests > 0 ? activeRequests : null,
          },
        ],
        onSelect: props.onTabChange,
      })}
    </div>
    <div class="hub-page-header__actions"></div>
  </section>`;
}

export function renderUserPlugins(props: UserPluginsViewProps): TemplateResult {
  if (!ENTERPRISE_CODEX_PLUGINS_VISIBLE) {
    props = {
      ...props,
      codexSearching: false,
      codexDetail: null,
      codexCatalog: { status: "available", items: [], installed: [], requests: [] },
    };
  }
  const panel =
    props.tab === "installed"
      ? renderInstalled(props)
      : props.tab === "discover"
        ? renderDiscover(props)
        : renderRequests(props);
  return html`
    <div class="eu-plugins-page">
      ${renderHeader(props)}
      ${renderSettingsWorkspace(
        renderSettingsPage(
          html`
            ${props.tab === "installed"
              ? renderInstalledToolbar(props)
              : props.tab === "discover"
                ? renderDiscoverToolbar(props)
                : nothing}
            ${props.error && !props.review
              ? html`<div class="plugins-page-error" role="alert">
                  <span>${props.error}</span>
                  <span class="eu-plugin-error-actions">
                    <button type="button" class="btn btn--sm" @click=${props.onDismissError}>
                      ${eu("pluginsClose")}
                    </button>
                    <button type="button" class="btn btn--sm" @click=${props.onRetry}>
                      ${eu("retry")}
                    </button>
                  </span>
                </div>`
              : nothing}
            <wa-tab-panel
              id=${USER_PLUGINS_PANEL_ID}
              class="plugins-panel"
              name=${props.tab}
              active
              aria-labelledby=${`user-plugins-tab-${props.tab}`}
            >
              ${props.tab !== "discover" &&
              props.loading &&
              props.installs.length === 0 &&
              props.grants.length === 0 &&
              props.codexCatalog.installed.length === 0 &&
              props.codexCatalog.requests.length === 0
                ? html`<div class="plugins-search-state" role="status">${eu("loading")}</div>`
                : panel}
            </wa-tab-panel>
          `,
          { wide: true },
        ),
      )}
    </div>
    ${renderReviewDialog(props)}
    ${ENTERPRISE_CODEX_PLUGINS_VISIBLE
      ? renderCodexDetailDialog(props.codexCatalog, codexViewProps(props))
      : nothing}
  `;
}
