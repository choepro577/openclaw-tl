import { html, nothing, type TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { renderSettingsSection, renderSettingsStatus } from "../../../../components/settings-ui.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { i18n } from "../../../../i18n/index.ts";
import { copyToClipboard } from "../../../../lib/clipboard.ts";
import type {
  UserCodexCatalog,
  UserCodexCatalogItem,
  UserCodexPluginAppTemplate,
  UserCodexPluginAuthApp,
  UserCodexPluginConnectedAccount,
  UserCodexPluginDetail,
  UserCodexPluginGrant,
  UserCodexPluginHook,
  UserCodexPluginMcpServer,
  UserCodexPluginRequest,
  UserCodexPluginScheduledTask,
  UserCodexPluginSkill,
} from "../../contracts/user-extension.ts";
import { renderArtTile, renderMetaLine } from "./plugins-presentation.ts";

export type CodexCatalogViewProps = {
  busy: boolean;
  reviewingPluginId: string | null;
  requestingPluginId: string | null;
  detail: UserCodexPluginDetail | null;
  onOpen: (item: UserCodexCatalogItem) => void;
  onRequest: (item: UserCodexCatalogItem) => void;
  onCancelRequest: (item: UserCodexPluginRequest) => void;
  onToggle: (item: UserCodexPluginGrant) => void;
  onRemove: (item: UserCodexPluginGrant) => void;
  onRefresh: (item: UserCodexPluginGrant) => void;
  onConnect: (item: UserCodexPluginGrant, serverName: string) => void;
  onTryNow?: () => void;
  onUsePrompt?: (prompt: string) => void;
  onCopy?: (value: string) => void;
  copyFeedback?: "idle" | "copying" | "copied" | "error";
  onCloseDetail: () => void;
};

function samePlugin(
  left: { pluginName: string; marketplaceName: string },
  right: { pluginName: string; marketplaceName: string },
): boolean {
  return left.pluginName === right.pluginName && left.marketplaceName === right.marketplaceName;
}

function findGrant(
  catalog: UserCodexCatalog,
  item: Pick<UserCodexCatalogItem, "pluginName" | "marketplaceName">,
): UserCodexPluginGrant | undefined {
  return catalog.installed.find((grant) => samePlugin(grant, item));
}

function findRequest(
  catalog: UserCodexCatalog,
  item: Pick<UserCodexCatalogItem, "pluginName" | "marketplaceName">,
): UserCodexPluginRequest | undefined {
  return catalog.requests.find((request) => samePlugin(request, item));
}

function findCatalogItem(
  catalog: UserCodexCatalog,
  item: Pick<UserCodexCatalogItem, "pluginName" | "marketplaceName">,
): UserCodexCatalogItem | undefined {
  return catalog.items.find((candidate) => samePlugin(candidate, item));
}

function catalogDisplayName(
  catalog: UserCodexCatalog,
  item: Pick<UserCodexCatalogItem, "pluginName" | "marketplaceName">,
  fallback?: string,
): string {
  return findCatalogItem(catalog, item)?.name?.trim() || fallback?.trim() || item.pluginName;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function snapshotArray(snapshot: Record<string, unknown>, key: string): unknown[] {
  return Array.isArray(snapshot[key]) ? snapshot[key] : [];
}

function appFromUnknown(value: unknown): UserCodexPluginAuthApp | null {
  if (typeof value === "string") {
    return { id: value, name: value };
  }
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  const id = asString(row.id) ?? asString(row.appId) ?? asString(row.name);
  const name = asString(row.name) ?? id;
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    description: asString(row.description),
    logoUrl: asString(row.logoUrl),
    logoDarkUrl: asString(row.logoDarkUrl),
    accessible: typeof row.accessible === "boolean" ? row.accessible : undefined,
    enabled: typeof row.enabled === "boolean" ? row.enabled : undefined,
    callable: typeof row.callable === "boolean" ? row.callable : undefined,
    needsAuth: typeof row.needsAuth === "boolean" ? row.needsAuth : undefined,
    metadataAvailable:
      typeof row.metadataAvailable === "boolean" ? row.metadataAvailable : undefined,
    runtimeState: asString(row.runtimeState),
    installUrl: asString(row.installUrl),
    accounts: Array.isArray(row.accounts)
      ? row.accounts
          .map((account): UserCodexPluginConnectedAccount | null => {
            const accountRow = asRecord(account);
            const accountId = asString(accountRow?.id);
            return accountId
              ? ({
                  id: accountId,
                  name: asString(accountRow?.name),
                  email: asString(accountRow?.email),
                  avatarUrl: asString(accountRow?.avatarUrl),
                  authStatus: asString(accountRow?.authStatus),
                  authType: asString(accountRow?.authType),
                } satisfies UserCodexPluginConnectedAccount)
              : null;
          })
          .filter((account): account is UserCodexPluginConnectedAccount => account !== null)
      : undefined,
    accountsStatus:
      row.accountsStatus === "available" || row.accountsStatus === "unavailable"
        ? row.accountsStatus
        : undefined,
    addAccountUrl: asString(row.addAccountUrl),
  };
}

function detailApps(
  detail: UserCodexPluginDetail,
  snapshot: Record<string, unknown>,
): UserCodexPluginAuthApp[] {
  const source = detail.auth?.apps ?? detail.apps;
  if (source) {
    return source;
  }
  return snapshotArray(snapshot, "apps")
    .map(appFromUnknown)
    .filter((app): app is UserCodexPluginAuthApp => app !== null);
}

function detailSkills(
  detail: UserCodexPluginDetail,
  snapshot: Record<string, unknown>,
): UserCodexPluginSkill[] {
  if (detail.skills) {
    return detail.skills;
  }
  return snapshotArray(snapshot, "skills")
    .map((value): UserCodexPluginSkill | null => {
      const row = asRecord(value);
      if (typeof value === "string") {
        return { name: value } satisfies UserCodexPluginSkill;
      }
      const name = asString(row?.name) ?? asString(row?.id);
      return name
        ? {
            name,
            description: asString(row?.description),
            shortDescription: asString(row?.shortDescription),
            enabled: typeof row?.enabled === "boolean" ? row.enabled : undefined,
          }
        : null;
    })
    .filter((skill): skill is UserCodexPluginSkill => skill !== null);
}

function detailMcpServers(
  detail: UserCodexPluginDetail,
  snapshot: Record<string, unknown>,
): UserCodexPluginMcpServer[] {
  const source =
    detail.auth?.mcpServers ?? detail.mcpServers ?? snapshotArray(snapshot, "mcpServers");
  return source
    .map((value): UserCodexPluginMcpServer | null => {
      if (typeof value === "string") {
        return { name: value } satisfies UserCodexPluginMcpServer;
      }
      const row = asRecord(value);
      const name = asString(row?.name) ?? asString(row?.id) ?? asString(row?.server);
      return name
        ? {
            name,
            pluginId: asString(row?.pluginId),
            authStatus: asString(row?.authStatus),
            runtimeStatus: asString(row?.runtimeStatus),
            needsAuth: typeof row?.needsAuth === "boolean" ? row.needsAuth : undefined,
            ready: typeof row?.ready === "boolean" ? row.ready : undefined,
          }
        : null;
    })
    .filter((server): server is UserCodexPluginMcpServer => server !== null);
}

function detailAppsTemplates(
  detail: UserCodexPluginDetail,
  snapshot: Record<string, unknown>,
): UserCodexPluginAppTemplate[] {
  if (detail.appTemplates) {
    return detail.appTemplates;
  }
  return snapshotArray(snapshot, "appTemplates")
    .map((value): UserCodexPluginAppTemplate | null => {
      const row = asRecord(value);
      const templateId = asString(row?.templateId) ?? asString(row?.id);
      const name = asString(row?.name) ?? templateId;
      return templateId && name
        ? {
            templateId,
            name,
            description: asString(row?.description),
            category: asString(row?.category),
            canonicalConnectorId: asString(row?.canonicalConnectorId),
            logoUrl: asString(row?.logoUrl),
            logoDarkUrl: asString(row?.logoDarkUrl),
            materializedAppIds: Array.isArray(row?.materializedAppIds)
              ? row.materializedAppIds.filter((id): id is string => typeof id === "string")
              : undefined,
            reason: asString(row?.reason),
          }
        : null;
    })
    .filter((template): template is UserCodexPluginAppTemplate => template !== null);
}

function detailHooks(
  detail: UserCodexPluginDetail,
  snapshot: Record<string, unknown>,
): UserCodexPluginHook[] {
  if (detail.hooks) {
    return detail.hooks;
  }
  return snapshotArray(snapshot, "hooks")
    .map((value): UserCodexPluginHook | null => {
      const row = asRecord(value);
      const key = asString(row?.key) ?? asString(row?.name) ?? asString(value);
      return key ? { key, eventName: asString(row?.eventName) } : null;
    })
    .filter((hook): hook is UserCodexPluginHook => hook !== null);
}

function detailScheduledTasks(
  detail: UserCodexPluginDetail,
  snapshot: Record<string, unknown>,
): UserCodexPluginScheduledTask[] {
  if (detail.scheduledTasks) {
    return detail.scheduledTasks;
  }
  return snapshotArray(snapshot, "scheduledTasks")
    .map((value): UserCodexPluginScheduledTask | null => {
      const row = asRecord(value);
      const key = asString(row?.key) ?? asString(row?.id);
      const name = asString(row?.name) ?? key;
      return key && name
        ? { key, name, prompt: asString(row?.prompt), schedule: row?.schedule }
        : null;
    })
    .filter((task): task is UserCodexPluginScheduledTask => task !== null);
}

function stateStatus(item: UserCodexCatalogItem): TemplateResult {
  if (item.grantState === "active") {
    if (item.authRequired || item.ready === false) {
      return renderSettingsStatus({ kind: "warn", label: eu("pluginsStateNeedsSetup") });
    }
    return renderSettingsStatus({ kind: "ok", label: eu("pluginsGrantActive") });
  }
  if (item.grantState === "disabled") {
    return renderSettingsStatus({ kind: "muted", label: eu("pluginsStateDisabled") });
  }
  if (item.grantState === "unavailable") {
    return renderSettingsStatus({ kind: "warn", label: eu("pluginsGrantUnavailable") });
  }
  if (item.grantState === "revoked") {
    return renderSettingsStatus({ kind: "muted", label: eu("pluginsGrantRevoked") });
  }
  if (item.requestState === "pending") {
    return renderSettingsStatus({ kind: "warn", label: eu("pluginsStatePending") });
  }
  if (item.requestState === "approving") {
    return renderSettingsStatus({ kind: "warn", label: eu("pluginsStateApproving") });
  }
  if (item.requestState === "available") {
    return renderSettingsStatus({ kind: "ok", label: eu("pluginsStateAvailable") });
  }
  if (item.requestState === "rejected") {
    return renderSettingsStatus({ kind: "danger", label: eu("pluginsStateRejected") });
  }
  if (item.requestState === "install_failed") {
    return renderSettingsStatus({ kind: "danger", label: eu("pluginsStateInstallFailed") });
  }
  if (item.requestState === "cancelled") {
    return renderSettingsStatus({ kind: "muted", label: eu("pluginsStateCancelled") });
  }
  return renderSettingsStatus(
    item.available
      ? { kind: "ok", label: eu("pluginsCodexAvailable") }
      : { kind: "danger", label: eu("pluginsCodexUnavailable") },
  );
}

function firstSafeConnectUrl(grant: UserCodexPluginGrant): string | null {
  for (const candidate of [
    ...(grant.connectUrls ?? []),
    ...(grant.appsNeedingAuth ?? []).map((app) => app.installUrl),
  ]) {
    if (typeof candidate !== "string" || !candidate.trim()) {
      continue;
    }
    try {
      const url = new URL(candidate.trim());
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.toString();
      }
    } catch {
      // Ignore malformed runtime URLs; the API remains usable through refresh/remove.
    }
  }
  return null;
}

function renderGrantActions(grant: UserCodexPluginGrant, props: CodexCatalogViewProps) {
  if (grant.state === "revoked") {
    return nothing;
  }
  const connectUrl = firstSafeConnectUrl(grant);
  const needsConnection =
    grant.authRequired === true ||
    grant.ready === false ||
    (grant.appsNeedingAuth ?? []).some((app) => app.needsAuth === true);
  return html`
    ${connectUrl
      ? html`<a class="btn btn--sm" href=${connectUrl} target="_blank" rel="noopener noreferrer">
          ${needsConnection ? eu("pluginsCodexConnectAccount") : eu("pluginsCodexManageConnection")}
        </a>`
      : nothing}
    <button
      type="button"
      class="btn btn--sm"
      ?disabled=${props.busy || grant.state === "unavailable"}
      @click=${() => props.onToggle(grant)}
    >
      ${grant.state === "active" ? eu("pluginsDisable") : eu("pluginsEnable")}
    </button>
    <button
      type="button"
      class="btn btn--sm"
      ?disabled=${props.busy}
      @click=${() => props.onRefresh(grant)}
    >
      ${eu("pluginsCodexCheckConnection")}
    </button>
    <button
      type="button"
      class="btn btn--sm eu-plugin-remove"
      ?disabled=${props.busy}
      @click=${() => props.onRemove(grant)}
    >
      ${eu("pluginsCodexRemoveAccess")}
    </button>
  `;
}

function renderCatalogAction(
  item: UserCodexCatalogItem,
  catalog: UserCodexCatalog,
  props: CodexCatalogViewProps,
) {
  const grant = findGrant(catalog, item);
  if (grant && grant.state !== "revoked") {
    return renderGrantActions(grant, props);
  }
  const request = findRequest(catalog, item);
  if (request && request.state === "pending") {
    return html`<button
      type="button"
      class="btn btn--sm eu-plugin-remove"
      ?disabled=${props.busy}
      @click=${() => props.onCancelRequest(request)}
    >
      ${eu("pluginsCancelRequest")}
    </button>`;
  }
  if (item.requestState === "pending" || item.requestState === "approving") {
    return html`<span class="plugins-item__state-hint">${eu("pluginsCodexRequestPending")}</span>`;
  }
  if (item.requestState === "available") {
    return html`<span class="plugins-item__state-hint"
      >${eu("pluginsCodexRequestAvailable")}</span
    >`;
  }
  return html`<button
    type="button"
    class="btn btn--sm plugins-install"
    ?disabled=${props.busy || !item.available}
    aria-busy=${props.reviewingPluginId === item.id || props.requestingPluginId === item.id
      ? "true"
      : "false"}
    @click=${() => props.onRequest(item)}
  >
    ${props.requestingPluginId === item.id ? eu("pluginsRequestBusy") : eu("pluginsRequestAdmin")}
  </button>`;
}

function renderCatalogRow(
  item: UserCodexCatalogItem,
  catalog: UserCodexCatalog,
  props: CodexCatalogViewProps,
) {
  const grant = findGrant(catalog, item);
  const request = findRequest(catalog, item);
  const statusItem = {
    ...item,
    authRequired: item.authRequired || grant?.authRequired || request?.authRequired,
    appsNeedingAuth: item.appsNeedingAuth ?? grant?.appsNeedingAuth ?? request?.appsNeedingAuth,
    connectUrls: item.connectUrls ?? grant?.connectUrls ?? request?.connectUrls,
    ready: item.ready ?? grant?.ready,
  };
  return html`<article
    class="settings-row plugins-item plugins-item--clickable"
    data-codex-plugin-id=${item.id}
    data-codex-plugin-name=${item.pluginName}
    data-plugin-status=${item.grantState ??
    item.requestState ??
    (item.available ? "available" : "unavailable")}
    @click=${(event: Event) => {
      const interactive =
        event.target instanceof Element && event.target.closest("button, a, input");
      if (!interactive) {
        props.onOpen(item);
      }
    }}
  >
    ${renderArtTile(item.pluginName, item.name)}
    <div class="settings-row__text">
      <h3 class="settings-row__title">
        <button
          type="button"
          class="plugins-item__detail-button"
          @click=${() => props.onOpen(item)}
        >
          ${item.name}
        </button>
      </h3>
      <span class="settings-row__desc">${item.description || item.pluginName}</span>
      ${renderMetaLine([
        "Codex",
        item.marketplaceName,
        item.authPolicy ? `${eu("pluginsCodexAuthPolicy")}: ${item.authPolicy}` : nothing,
      ])}
    </div>
    <div class="settings-row__control">
      ${stateStatus(statusItem)} ${renderCatalogAction(item, catalog, props)}
    </div>
  </article>`;
}

function safeAuthLinks(
  detail: UserCodexPluginDetail,
  grant?: UserCodexPluginGrant,
  request?: UserCodexPluginRequest,
): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];
  const append = (label: string, raw: unknown) => {
    if (typeof raw !== "string" || !raw.trim()) {
      return;
    }
    try {
      const url = new URL(raw.trim());
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return;
      }
      const normalized = url.toString();
      if (!links.some((link) => link.url === normalized)) {
        links.push({ label, url: normalized });
      }
    } catch {
      // Auth URLs are supplied by the runtime; ignore malformed values at the UI boundary.
    }
  };
  for (const link of detail.authLinks ?? []) {
    append(link.label || eu("pluginsCodexConnectAccount"), link.url);
  }
  append(eu("pluginsCodexConnectAccount"), detail.installUrl);
  for (const app of [
    ...(detail.auth?.apps ?? []),
    ...(detail.appsNeedingAuth ?? []),
    ...(grant?.appsNeedingAuth ?? []),
    ...(request?.appsNeedingAuth ?? []),
  ]) {
    append(app.name || eu("pluginsCodexConnectAccount"), app.installUrl);
  }
  for (const url of [
    ...(detail.auth?.connectUrls ?? []),
    ...(detail.connectUrls ?? []),
    ...(grant?.connectUrls ?? []),
    ...(request?.connectUrls ?? []),
  ]) {
    append(eu("pluginsCodexConnectAccount"), url);
  }
  return links;
}

function renderExternalLink(label: string, rawUrl: unknown) {
  const url = safeHttpUrl(rawUrl);
  return url
    ? html`<a href=${url} target="_blank" rel="noopener noreferrer">${label}</a>`
    : nothing;
}

function copyText(value: string): void {
  void copyToClipboard(value);
}

function copyFeedbackLabel(state: CodexCatalogViewProps["copyFeedback"]): string {
  switch (state) {
    case "copying":
      return eu("pluginsCodexCopying");
    case "copied":
      return eu("pluginsCodexCopied");
    case "error":
      return eu("pluginsCodexCopyFailed");
    default:
      return "";
  }
}

function renderCodexLogo(key: string, name: string, rawUrl: unknown, className: string) {
  const url = safeHttpUrl(rawUrl);
  return url
    ? html`<span class=${className} aria-hidden="true"
        ><img src=${url} alt="" loading="lazy" decoding="async"
      /></span>`
    : renderArtTile(key, name, className);
}

function appIsReady(app: UserCodexPluginAuthApp): boolean {
  return (
    app.needsAuth === false &&
    app.accessible === true &&
    app.enabled === true &&
    app.callable === true &&
    app.metadataAvailable === true &&
    app.runtimeState === "available"
  );
}

function appStatusKnown(app: UserCodexPluginAuthApp): boolean {
  return (
    typeof app.needsAuth === "boolean" &&
    typeof app.accessible === "boolean" &&
    typeof app.enabled === "boolean" &&
    typeof app.callable === "boolean" &&
    typeof app.metadataAvailable === "boolean" &&
    typeof app.runtimeState === "string"
  );
}

function appStatus(app: UserCodexPluginAuthApp): TemplateResult {
  if (app.needsAuth === true) {
    return renderSettingsStatus({ kind: "warn", label: eu("pluginsCodexNeedsConnection") });
  }
  if (appStatusKnown(app) && !appIsReady(app)) {
    return renderSettingsStatus({ kind: "muted", label: eu("pluginsCodexNotCallable") });
  }
  if (!appStatusKnown(app)) {
    return renderSettingsStatus({ kind: "muted", label: eu("pluginsCodexStatusUnknown") });
  }
  return renderSettingsStatus({ kind: "ok", label: eu("pluginsCodexConnected") });
}

function connectedAccountStatus(account: UserCodexPluginConnectedAccount): TemplateResult {
  const status = account.authStatus?.trim().toLowerCase();
  if (
    status === "connected" ||
    status === "authenticated" ||
    status === "ready" ||
    status === "active"
  ) {
    return renderSettingsStatus({ kind: "ok", label: eu("pluginsCodexConnected") });
  }
  if (
    status === "notloggedin" ||
    status === "needs_auth" ||
    status === "needsauth" ||
    status === "reauth_required" ||
    status === "reauthrequired" ||
    status === "unauthenticated" ||
    status === "notauthenticated"
  ) {
    return renderSettingsStatus({ kind: "warn", label: eu("pluginsCodexNeedsConnection") });
  }
  return status
    ? renderSettingsStatus({
        kind: "muted",
        label: account.authStatus ?? eu("pluginsCodexStatusUnknown"),
      })
    : renderSettingsStatus({ kind: "muted", label: eu("pluginsCodexStatusUnknown") });
}

function connectedAccountDisplayName(account: UserCodexPluginConnectedAccount): string {
  return account.name?.trim() || account.email?.trim() || eu("pluginsCodexConnectedAccount");
}

function renderCodexConnectedAccounts(app: UserCodexPluginAuthApp) {
  const accounts = app.accounts ?? [];
  const addAccountUrl = safeHttpUrl(app.addAccountUrl);
  const hasAccountMetadata =
    app.accountsStatus !== undefined || accounts.length > 0 || addAccountUrl !== null;
  if (!hasAccountMetadata) {
    return nothing;
  }
  return html`<div
    class="eu-codex-connected-accounts"
    data-codex-account-status=${app.accountsStatus ?? "unknown"}
  >
    <div class="eu-codex-connected-accounts__header">
      <h5>${eu("pluginsCodexConnectedAccounts")}</h5>
      ${addAccountUrl
        ? html`<a
            class="btn btn--sm"
            href=${addAccountUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            ${accounts.length > 0
              ? eu("pluginsCodexConnectAnother")
              : eu("pluginsCodexConnectAccount")}
          </a>`
        : nothing}
    </div>
    ${app.accountsStatus === "unavailable"
      ? html`<p class="plugins-readonly eu-codex-connected-accounts__note">
          ${eu("pluginsCodexAccountsUnavailable")}
        </p>`
      : accounts.length > 0
        ? html`<ul class="eu-codex-account-list">
            ${accounts.map(
              (account) => html`<li class="eu-codex-account-row">
                ${renderCodexLogo(
                  account.id,
                  connectedAccountDisplayName(account),
                  account.avatarUrl,
                  "eu-codex-account-row__avatar",
                )}
                <span class="eu-codex-account-row__identity">
                  <strong>${connectedAccountDisplayName(account)}</strong>
                  ${account.email ? html`<span>${account.email}</span>` : nothing}
                  ${account.authType
                    ? html`<span class="plugins-meta">${account.authType}</span>`
                    : nothing}
                </span>
                ${connectedAccountStatus(account)}
              </li>`,
            )}
          </ul>`
        : html`<p class="plugins-readonly eu-codex-connected-accounts__note">
            ${eu("pluginsCodexNoConnectedAccounts")}
          </p>`}
  </div>`;
}

function mcpNeedsConnection(server: UserCodexPluginMcpServer): boolean {
  return server.needsAuth === true || server.ready === false;
}

function mcpStatus(server: UserCodexPluginMcpServer): TemplateResult {
  if (server.needsAuth === true || server.ready === false) {
    return renderSettingsStatus({ kind: "warn", label: eu("pluginsCodexNeedsConnection") });
  }
  if (typeof server.needsAuth !== "boolean" || typeof server.ready !== "boolean") {
    return renderSettingsStatus({ kind: "muted", label: eu("pluginsCodexStatusUnknown") });
  }
  if (server.runtimeStatus && server.runtimeStatus !== "available") {
    return renderSettingsStatus({ kind: "muted", label: eu("pluginsCodexNotCallable") });
  }
  return server.ready
    ? renderSettingsStatus({ kind: "ok", label: eu("pluginsCodexConnected") })
    : renderSettingsStatus({ kind: "muted", label: eu("pluginsCodexNotCallable") });
}

function renderCodexConnectionSection(
  apps: UserCodexPluginAuthApp[],
  mcpServers: UserCodexPluginMcpServer[],
  authLinks: Array<{ label: string; url: string }>,
  grant: UserCodexPluginGrant | undefined,
  detailNeedsConnection: boolean,
  props: CodexCatalogViewProps,
) {
  const needsConnection =
    detailNeedsConnection ||
    grant?.authRequired === true ||
    grant?.ready === false ||
    apps.some((app) => app.needsAuth === true) ||
    mcpServers.some(mcpNeedsConnection);
  if (apps.length === 0 && mcpServers.length === 0 && authLinks.length === 0 && !needsConnection) {
    return nothing;
  }
  return html`<section
    class="plugins-detail__capability eu-codex-detail-section eu-codex-connections"
  >
    <div class="eu-codex-detail-section__header">
      <div>
        <h3>${eu("pluginsCodexConnections")}</h3>
        <p class="plugins-readonly eu-codex-detail-section__hint">
          ${eu("pluginsCodexConnectionsDescription")}
        </p>
      </div>
    </div>
    ${apps.length > 0
      ? html`<div class="eu-codex-apps">
          <h4>${eu("pluginsCodexApps")}</h4>
          <div class="eu-codex-app-grid">
            ${apps.map(
              (app) => html`<article class="eu-codex-app-card" data-codex-app-id=${app.id}>
                ${renderCodexLogo(
                  app.id,
                  app.name,
                  app.logoUrl ?? app.logoDarkUrl,
                  "eu-codex-app-card__logo",
                )}
                <div class="eu-codex-app-card__body">
                  <div class="eu-codex-app-card__heading">
                    <strong>${app.name}</strong>
                    ${appStatus(app)}
                  </div>
                  ${app.description
                    ? html`<p class="eu-codex-app-card__description">${app.description}</p>`
                    : nothing}
                  ${app.metadataAvailable === false
                    ? html`<p class="plugins-readonly eu-codex-app-card__note">
                        ${eu("pluginsCodexMetadataUnavailable")}
                      </p>`
                    : nothing}
                  ${app.runtimeState
                    ? html`<span class="plugins-meta eu-codex-app-card__runtime"
                        >${app.runtimeState}</span
                      >`
                    : nothing}
                  ${renderCodexConnectedAccounts(app)}
                  <div class="eu-codex-app-card__actions">
                    ${renderExternalLink(
                      app.needsAuth === true
                        ? eu("pluginsCodexConnectAccount")
                        : eu("pluginsCodexManageConnection"),
                      app.installUrl,
                    )}
                  </div>
                </div>
              </article>`,
            )}
          </div>
        </div>`
      : nothing}
    ${mcpServers.length > 0
      ? html`<div class="eu-codex-mcp-list">
          <h4>${eu("pluginsCodexMcpServers")}</h4>
          ${mcpServers.map(
            (server) => html`<div class="eu-codex-mcp-row" data-codex-mcp-server=${server.name}>
              <span class="plugins-meta__mono">${server.name}</span>
              ${mcpStatus(server)}
              ${server.authStatus
                ? html`<span class="plugins-meta">${server.authStatus}</span>`
                : nothing}
              ${server.runtimeStatus
                ? html`<span class="plugins-meta">${server.runtimeStatus}</span>`
                : nothing}
              ${grant && mcpNeedsConnection(server)
                ? html`<button
                    type="button"
                    class="btn btn--sm"
                    ?disabled=${props.busy}
                    @click=${() => props.onConnect(grant, server.name)}
                  >
                    ${eu("pluginsCodexConnectAccount")}
                  </button>`
                : nothing}
            </div>`,
          )}
        </div>`
      : nothing}
    ${authLinks.length > 0
      ? html`<ul class="eu-codex-links">
          ${authLinks.map(
            (link) =>
              html`<li>
                <a href=${link.url} target="_blank" rel="noopener noreferrer"
                  >${needsConnection ? link.label : eu("pluginsCodexManageConnection")}</a
                >
              </li>`,
          )}
        </ul>`
      : nothing}
    ${needsConnection
      ? html`<p class="plugins-readonly eu-codex-account-note">
          ${eu("pluginsCodexAuthRequired")}
        </p>`
      : nothing}
  </section>`;
}

function renderCodexInterfaceInfo(detail: UserCodexPluginDetail, heroDescription: string) {
  const info = detail.interface;
  if (!info) {
    return nothing;
  }
  const infoDescription = [info.longDescription, info.shortDescription].find(
    (value) => value?.trim() && value.trim() !== heroDescription.trim(),
  );
  const links = [
    renderExternalLink(eu("pluginsCodexWebsite"), info.websiteUrl),
    renderExternalLink(eu("pluginsCodexPrivacyPolicy"), info.privacyPolicyUrl),
    renderExternalLink(eu("pluginsCodexTermsOfService"), info.termsOfServiceUrl),
    renderExternalLink(eu("pluginsCodexMarketplace"), detail.shareUrl),
  ].filter((entry) => entry !== nothing);
  const hasMetadata = Boolean(
    info.developerName ||
    info.category ||
    infoDescription ||
    info.capabilities?.length ||
    links.length,
  );
  if (!hasMetadata) {
    return nothing;
  }
  return html`<section
    class="plugins-detail__capability eu-codex-detail-section"
    data-codex-detail-section="information"
  >
    <h3>${eu("pluginsCodexInformation")}</h3>
    ${info.developerName || info.category
      ? html`<div class="plugins-detail__meta eu-codex-info-grid">
          ${info.developerName
            ? html`<div class="plugins-detail__meta-row">
                <span class="plugins-detail__meta-label">${eu("pluginsCodexDeveloper")}</span
                ><span class="plugins-detail__meta-value">${info.developerName}</span>
              </div>`
            : nothing}
          ${info.category
            ? html`<div class="plugins-detail__meta-row">
                <span class="plugins-detail__meta-label">${eu("pluginsCodexCategory")}</span
                ><span class="plugins-detail__meta-value">${info.category}</span>
              </div>`
            : nothing}
        </div>`
      : nothing}
    ${infoDescription ? html`<p class="eu-codex-long-description">${infoDescription}</p>` : nothing}
    ${info.capabilities && info.capabilities.length > 0
      ? html`<div class="eu-codex-tag-list">
          ${info.capabilities.map(
            (value) => html`<span class="plugins-meta__mono">${value}</span>`,
          )}
        </div>`
      : nothing}
    ${links.length > 0 ? html`<div class="eu-codex-links">${links}</div>` : nothing}
  </section>`;
}

function renderCodexMedia(detail: UserCodexPluginDetail, item: UserCodexCatalogItem) {
  const info = detail.interface;
  const screenshots = (info?.screenshotUrls ?? [])
    .map((url) => safeHttpUrl(url))
    .filter((url): url is string => Boolean(url));
  if (screenshots.length === 0) {
    return nothing;
  }
  return html`<section class="eu-codex-media" data-codex-detail-section="media">
    <div class="eu-codex-screenshots">
      <h3>${eu("pluginsCodexScreenshots")}</h3>
      <div class="eu-codex-screenshots__grid">
        ${screenshots.map(
          (url) => html`<a
            href=${url}
            target="_blank"
            rel="noopener noreferrer"
            class="eu-codex-screenshot-link"
          >
            <img
              class="eu-codex-screenshot"
              src=${url}
              alt=${item.name}
              loading="lazy"
              decoding="async"
            />
          </a>`,
        )}
      </div>
    </div>
  </section>`;
}

function renderCodexPrompts(
  detail: UserCodexPluginDetail,
  snapshot: Record<string, unknown>,
  props: CodexCatalogViewProps,
) {
  const prompts =
    detail.interface?.defaultPrompts ??
    snapshotArray(snapshot, "defaultPrompts").filter(
      (value): value is string => typeof value === "string" && Boolean(value.trim()),
    );
  if (prompts.length === 0) {
    return nothing;
  }
  return html`<section
    class="plugins-detail__capability eu-codex-detail-section"
    data-codex-detail-section="prompts"
  >
    <h3>${eu("pluginsCodexPrompts")}</h3>
    <p class="plugins-readonly eu-codex-detail-section__hint">
      ${eu("pluginsCodexPromptsDescription")}
    </p>
    <div class="eu-codex-prompts">
      ${prompts.map(
        (prompt) => html`<article class="eu-codex-prompt">
          <p>${prompt}</p>
          <div class="eu-codex-prompt__actions">
            ${props.onUsePrompt
              ? html`<button
                  type="button"
                  class="btn btn--sm primary"
                  @click=${() => props.onUsePrompt?.(prompt)}
                >
                  ${eu("pluginsCodexTryNow")}
                </button>`
              : nothing}
            <button
              type="button"
              class="btn btn--sm"
              @click=${() => (props.onCopy ? props.onCopy(prompt) : copyText(prompt))}
            >
              ${eu("pluginsCodexCopyPrompt")}
            </button>
          </div>
        </article>`,
      )}
    </div>
  </section>`;
}

function renderCodexAppTemplates(templates: UserCodexPluginAppTemplate[]) {
  if (templates.length === 0) {
    return nothing;
  }
  return html`<section
    class="plugins-detail__capability eu-codex-detail-section"
    data-codex-detail-section="app-templates"
  >
    <h3>
      ${eu("pluginsCodexAppTemplates")} <span class="plugins-version">${templates.length}</span>
    </h3>
    <div class="eu-codex-template-list">
      ${templates.map(
        (template) => html`<article class="eu-codex-template-card">
          ${renderCodexLogo(
            template.templateId,
            template.name,
            template.logoUrl ?? template.logoDarkUrl,
            "eu-codex-template-card__logo",
          )}
          <div>
            <strong>${template.name}</strong>
            ${template.category
              ? html`<span class="plugins-meta">${template.category}</span>`
              : nothing}
            ${template.description ? html`<p>${template.description}</p>` : nothing}
            ${template.canonicalConnectorId
              ? html`<span class="plugins-meta__mono">${template.canonicalConnectorId}</span>`
              : nothing}
          </div>
        </article>`,
      )}
    </div>
  </section>`;
}

function renderCodexHooksAndTasks(
  hooks: UserCodexPluginHook[],
  scheduledTasks: UserCodexPluginScheduledTask[],
) {
  if (hooks.length === 0 && scheduledTasks.length === 0) {
    return nothing;
  }
  return html`<section
    class="plugins-detail__capability eu-codex-detail-section"
    data-codex-detail-section="automation"
  >
    ${hooks.length > 0
      ? html`<div class="eu-codex-subsection">
          <h3>${eu("pluginsCodexHooks")} <span class="plugins-version">${hooks.length}</span></h3>
          <ul class="eu-codex-detail-list">
            ${hooks.map(
              (hook) =>
                html`<li>
                  <strong>${hook.key}</strong>${hook.eventName
                    ? html`<span>${hook.eventName}</span>`
                    : nothing}
                </li>`,
            )}
          </ul>
        </div>`
      : nothing}
    ${scheduledTasks.length > 0
      ? html`<div class="eu-codex-subsection">
          <h3>
            ${eu("pluginsCodexScheduledTasks")}
            <span class="plugins-version">${scheduledTasks.length}</span>
          </h3>
          <ul class="eu-codex-detail-list">
            ${scheduledTasks.map(
              (task) =>
                html`<li>
                  <strong>${task.name}</strong><span class="plugins-meta__mono">${task.key}</span>
                </li>`,
            )}
          </ul>
        </div>`
      : nothing}
  </section>`;
}

export function renderCodexDetailDialog(catalog: UserCodexCatalog, props: CodexCatalogViewProps) {
  const detail = props.detail;
  if (!detail) {
    return nothing;
  }
  const item = {
    ...detail.item,
    name: catalogDisplayName(
      catalog,
      detail.item,
      detail.interface?.displayName ?? detail.item.name,
    ),
    description:
      detail.item.description || detail.interface?.shortDescription || detail.item.pluginName,
  };
  const grant = findGrant(catalog, item);
  const request = findRequest(catalog, item);
  const capabilities = detail.capabilitySnapshot ?? {};
  const skills = detailSkills(detail, capabilities);
  const apps = detailApps(detail, capabilities);
  const mcpServers = detailMcpServers(detail, capabilities);
  const appTemplates = detailAppsTemplates(detail, capabilities);
  const hooks = detailHooks(detail, capabilities);
  const scheduledTasks = detailScheduledTasks(detail, capabilities);
  const statusItem = {
    ...item,
    authRequired:
      item.authRequired ||
      detail.auth?.authRequired ||
      detail.authRequired ||
      grant?.authRequired ||
      request?.authRequired ||
      apps.some((app) => app.needsAuth === true) ||
      mcpServers.some(mcpNeedsConnection),
    appsNeedingAuth:
      item.appsNeedingAuth ??
      detail.appsNeedingAuth ??
      grant?.appsNeedingAuth ??
      request?.appsNeedingAuth,
    connectUrls:
      item.connectUrls ?? detail.connectUrls ?? grant?.connectUrls ?? request?.connectUrls,
    ready: item.ready ?? detail.auth?.ready ?? grant?.ready,
  };
  const needsAuth =
    statusItem.authRequired === true ||
    statusItem.ready === false ||
    apps.some((app) => app.needsAuth === true) ||
    mcpServers.some((server) => server.needsAuth === true || server.ready === false);
  const showAuthPolicyGuidance = !needsAuth && !grant && Boolean(item.authPolicy);
  const authLinks = safeAuthLinks(detail, grant, request);
  const shareUrl = safeHttpUrl(detail.shareUrl);
  const canRequest =
    item.available &&
    (!grant || grant.state === "revoked") &&
    (!request || ["rejected", "cancelled", "install_failed"].includes(request.state));
  return html`<openclaw-modal-dialog
    .open=${true}
    .label=${item.name}
    style="--openclaw-modal-width: min(800px, calc(100vw - 32px));"
    @modal-cancel=${props.onCloseDetail}
  >
    <article
      class="plugins-detail eu-plugin-detail eu-codex-detail"
      data-codex-plugin-detail=${item.id}
    >
      <button
        type="button"
        class="btn btn--icon plugins-detail__close"
        aria-label=${eu("pluginsClose")}
        @click=${props.onCloseDetail}
      >
        ×
      </button>
      <div class="plugins-detail__body">
        <div class="eu-codex-detail-hero">
          ${renderCodexLogo(
            item.pluginName,
            item.name,
            detail.interface?.logoUrl ??
              detail.interface?.logoDarkUrl ??
              detail.interface?.composerIconUrl,
            "eu-codex-detail-hero__logo",
          )}
          <div class="eu-codex-detail-hero__content">
            <div class="plugins-detail__title">
              <h2>${item.name}</h2>
              <div class="eu-codex-title-actions">
                ${props.onTryNow
                  ? html`<button
                      type="button"
                      class="btn btn--sm primary"
                      ?disabled=${props.busy}
                      @click=${props.onTryNow}
                    >
                      ${eu("pluginsCodexTryNow")}
                    </button>`
                  : nothing}
                ${shareUrl
                  ? html`<button
                      type="button"
                      class="btn btn--sm"
                      @click=${() => (props.onCopy ? props.onCopy(shareUrl) : copyText(shareUrl))}
                    >
                      ${eu("pluginsCodexCopyLink")}
                    </button>`
                  : nothing}
              </div>
            </div>
            <p class="plugins-detail__description">${item.description || item.pluginName}</p>
            <p class="eu-codex-model-guidance" role="note">${eu("pluginsCodexModelGuidance")}</p>
            <span class="eu-codex-copy-feedback" role="status" aria-live="polite"
              >${copyFeedbackLabel(props.copyFeedback)}</span
            >
          </div>
        </div>
        <div class="eu-plugin-review-status">${stateStatus(statusItem)}</div>
        <div class="plugins-detail__meta">
          <div class="plugins-detail__meta-row">
            <span class="plugins-detail__meta-label">${eu("pluginsCodexMarketplace")}</span
            ><span class="plugins-detail__meta-value">${item.marketplaceName}</span>
          </div>
          ${detail.version || detail.localVersion
            ? html`<div class="plugins-detail__meta-row">
                <span class="plugins-detail__meta-label">${eu("pluginsCodexVersion")}</span
                ><span class="plugins-detail__meta-value"
                  >${detail.version ?? detail.localVersion}${detail.localVersion &&
                  detail.version &&
                  detail.localVersion !== detail.version
                    ? html` <span class="plugins-meta">(${detail.localVersion})</span>`
                    : nothing}</span
                >
              </div>`
            : nothing}
        </div>
        ${renderCodexPrompts(detail, capabilities, props)}
        ${skills.length > 0
          ? html`<section
              class="plugins-detail__capability eu-codex-detail-section"
              data-codex-detail-section="skills"
            >
              <h3>
                ${eu("pluginsCodexSkills")} <span class="plugins-version">${skills.length}</span>
              </h3>
              <ul class="eu-codex-detail-list">
                ${skills.map(
                  (skill) => html`<li>
                    <strong>${skill.name}</strong>
                    ${skill.shortDescription || skill.description
                      ? html`<span>${skill.shortDescription ?? skill.description}</span>`
                      : nothing}
                    ${skill.enabled === false
                      ? html`<span class="plugins-meta">${eu("pluginsStateDisabled")}</span>`
                      : nothing}
                  </li>`,
                )}
              </ul>
            </section>`
          : nothing}
        ${renderCodexConnectionSection(apps, mcpServers, authLinks, grant, needsAuth, props)}
        ${renderCodexMedia(detail, item)} ${renderCodexInterfaceInfo(detail, item.description)}
        ${renderCodexAppTemplates(appTemplates)} ${renderCodexHooksAndTasks(hooks, scheduledTasks)}
        ${needsAuth
          ? html`<div class="plugins-readonly eu-plugin-scope-note" role="note">
              ${eu("pluginsCodexAuthRequired")}
            </div>`
          : showAuthPolicyGuidance
            ? html`<div class="plugins-readonly eu-plugin-scope-note" role="note">
                ${eu("pluginsCodexAuthPolicyGuidance")}
              </div>`
            : nothing}
        ${request?.decisionReason || request?.safeErrorCode
          ? html`<p class="plugins-row-message plugins-row-message--error" role="alert">
              ${request.decisionReason ?? request.safeErrorCode}
            </p>`
          : nothing}
        <details class="eu-codex-advanced">
          <summary>${eu("pluginsCodexAdvancedDetails")}</summary>
          <div class="plugins-detail__meta">
            <div class="plugins-detail__meta-row">
              <span class="plugins-detail__meta-label">${eu("pluginsCodexPluginName")}</span
              ><span class="plugins-detail__meta-value plugins-meta__mono">${item.pluginName}</span>
            </div>
            <div class="plugins-detail__meta-row">
              <span class="plugins-detail__meta-label">${eu("pluginsCodexInstallPolicy")}</span
              ><span class="plugins-detail__meta-value">${item.installPolicy ?? "—"}</span>
            </div>
            <div class="plugins-detail__meta-row">
              <span class="plugins-detail__meta-label">${eu("pluginsCodexAuthPolicy")}</span
              ><span class="plugins-detail__meta-value">${item.authPolicy ?? "—"}</span>
            </div>
            ${detail.capabilityDigest
              ? html`<div class="plugins-detail__meta-row">
                  <span class="plugins-detail__meta-label">${eu("pluginsCodexDigest")}</span
                  ><span class="plugins-detail__meta-value plugins-meta__mono"
                    >${detail.capabilityDigest}</span
                  >
                </div>`
              : nothing}
          </div>
        </details>
        <div class="plugins-detail__actions">
          <button type="button" class="btn" @click=${props.onCloseDetail}>
            ${eu("pluginsClose")}
          </button>
          ${grant && grant.state !== "revoked" ? renderGrantActions(grant, props) : nothing}
          ${!grant && request?.state === "pending"
            ? html`<button
                type="button"
                class="btn eu-plugin-remove"
                ?disabled=${props.busy}
                @click=${() => props.onCancelRequest(request)}
              >
                ${eu("pluginsCancelRequest")}
              </button>`
            : nothing}
          ${canRequest
            ? html`<button
                type="button"
                class="btn primary plugins-install"
                ?disabled=${props.busy}
                @click=${() => props.onRequest(item)}
              >
                ${props.busy ? eu("pluginsRequestBusy") : eu("pluginsRequestAdmin")}
              </button>`
            : nothing}
        </div>
      </div>
    </article>
  </openclaw-modal-dialog>`;
}

export function renderCodexCatalog(
  catalog: UserCodexCatalog,
  loading: boolean,
  props: CodexCatalogViewProps,
) {
  if (loading && catalog.items.length === 0) {
    return html`<div class="plugins-search-state" role="status">${eu("pluginsLoadingCodex")}</div>`;
  }
  if (catalog.status === "unavailable") {
    return html`<p class="plugins-row-message" role="status">${eu("pluginsCodexUnavailable")}</p>`;
  }
  if (catalog.items.length === 0) {
    return nothing;
  }
  return renderSettingsSection(
    {
      title: eu("pluginsCatalogCodex"),
      description: eu("pluginsCodexDescription"),
      count: catalog.items.length,
    },
    repeat(
      catalog.items,
      (item) => item.id,
      (item) => renderCatalogRow(item, catalog, props),
    ),
  );
}

function grantCatalogItem(
  catalog: UserCodexCatalog,
  grant: UserCodexPluginGrant,
): UserCodexCatalogItem {
  const catalogItem = findCatalogItem(catalog, grant);
  return {
    id: grant.pluginId ?? `${grant.pluginName}@${grant.marketplaceName}`,
    pluginId: grant.pluginId ?? catalogItem?.pluginId,
    pluginName: grant.pluginName,
    marketplaceName: grant.marketplaceName,
    remotePluginId: grant.remotePluginId,
    name: catalogDisplayName(catalog, grant, grant.pluginName),
    description: catalogItem?.description ?? "",
    installed: true,
    enabled: grant.state === "active",
    authRequired: grant.authRequired,
    appsNeedingAuth: grant.appsNeedingAuth,
    connectUrls: grant.connectUrls,
    ready: grant.ready,
    available: grant.state !== "unavailable",
    installPolicy: null,
    authPolicy: null,
    requestState: null,
    grantState: grant.state,
  };
}

export function renderCodexInstalled(catalog: UserCodexCatalog, props: CodexCatalogViewProps) {
  if (catalog.installed.length === 0) {
    return nothing;
  }
  return renderSettingsSection(
    {
      title: eu("pluginsCodexInstalled"),
      description: html`${eu("pluginsCodexInstalledDescription")} ${eu("pluginsCodexModelGuidance")}`,
      count: catalog.installed.length,
    },
    repeat(
      catalog.installed,
      (item) => item.id,
      (grant) => {
        const item = grantCatalogItem(catalog, grant);
        return html`<article
          class="settings-row plugins-item plugins-item--clickable"
          data-codex-grant-id=${grant.id}
          data-plugin-status=${grant.state}
          @click=${(event: Event) => {
            const interactive =
              event.target instanceof Element && event.target.closest("button, a, input");
            if (!interactive) {
              props.onOpen(item);
            }
          }}
        >
          ${renderArtTile(grant.pluginName, item.name)}
          <div class="settings-row__text">
            <h3 class="settings-row__title">
              <button
                type="button"
                class="plugins-item__detail-button"
                @click=${() => props.onOpen(item)}
              >
                ${item.name}
              </button>
            </h3>
            <span class="settings-row__desc">${grant.marketplaceName}</span>
            ${renderMetaLine([
              "Codex",
              grant.state === "active" ? eu("pluginsGrantActive") : eu("pluginsStateDisabled"),
              html`<span class="plugins-meta__mono" title=${grant.capabilityDigest}
                >${grant.capabilityDigest}</span
              >`,
            ])}
          </div>
          <div class="settings-row__control">
            ${stateStatus(item)} ${renderGrantActions(grant, props)}
          </div>
        </article>`;
      },
    ),
  );
}

export function renderCodexRequests(catalog: UserCodexCatalog, props: CodexCatalogViewProps) {
  if (catalog.requests.length === 0) {
    return nothing;
  }
  return renderSettingsSection(
    {
      title: eu("pluginsCodexRequests"),
      description: eu("pluginsCodexRequestsDescription"),
      count: catalog.requests.length,
    },
    repeat(
      catalog.requests,
      (item) => item.id,
      (request) => {
        const catalogItem = findCatalogItem(catalog, request);
        const item: UserCodexCatalogItem = {
          id: request.pluginId ?? `${request.pluginName}@${request.marketplaceName}`,
          pluginId: request.pluginId ?? catalogItem?.pluginId,
          pluginName: request.pluginName,
          marketplaceName: request.marketplaceName,
          remotePluginId: request.remotePluginId,
          name: catalogDisplayName(catalog, request, request.pluginName),
          description: catalogItem?.description ?? "",
          installed: false,
          enabled: false,
          authRequired: request.authRequired,
          appsNeedingAuth: request.appsNeedingAuth,
          connectUrls: request.connectUrls,
          available: true,
          installPolicy: null,
          authPolicy: null,
          requestState: request.state,
          grantState: null,
        };
        return html`<article
          class="settings-row plugins-item plugins-item--clickable"
          data-codex-request-id=${request.id}
          data-plugin-status=${request.state}
          @click=${(event: Event) => {
            const interactive =
              event.target instanceof Element && event.target.closest("button, a, input");
            if (!interactive) {
              props.onOpen(item);
            }
          }}
        >
          ${renderArtTile(request.pluginName, item.name)}
          <div class="settings-row__text">
            <h3 class="settings-row__title">
              <button
                type="button"
                class="plugins-item__detail-button"
                @click=${() => props.onOpen(item)}
              >
                ${item.name}
              </button>
            </h3>
            <span class="settings-row__desc">${request.marketplaceName}</span>
            ${renderMetaLine([
              "Codex",
              eu("updatedAt", {
                time: new Date(request.updatedAt).toLocaleDateString(i18n.getLocale()),
              }),
            ])}
          </div>
          <div class="settings-row__control">
            ${stateStatus(item)}
            ${request.state === "pending"
              ? html`<button
                  type="button"
                  class="btn btn--sm eu-plugin-remove"
                  ?disabled=${props.busy}
                  @click=${() => props.onCancelRequest(request)}
                >
                  ${eu("pluginsCancelRequest")}
                </button>`
              : nothing}
          </div>
          ${request.decisionReason || request.safeErrorCode
            ? html`<div class="plugins-row-message plugins-row-message--error" role="alert">
                ${request.decisionReason ?? request.safeErrorCode}
              </div>`
            : nothing}
        </article>`;
      },
    ),
  );
}
