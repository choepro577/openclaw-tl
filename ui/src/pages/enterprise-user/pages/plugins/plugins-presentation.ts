import { html, nothing, type TemplateResult } from "lit";
import { icons } from "../../../../components/icons.ts";
import "../../../../components/openclaw-mascot.ts";
import { renderSettingsStatus } from "../../../../components/settings-ui.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import {
  pluginArtPath,
  pluginFallbackGradient,
  pluginMonogram,
} from "../../../plugins/presentation.ts";
import type {
  UserExtensionKind,
  UserPluginGrant,
  UserPluginRequest,
  UserSkillInstall,
} from "../../contracts/user-extension.ts";

export function kindLabel(kind: UserExtensionKind): string {
  return kind === "skill"
    ? eu("pluginsKindSkill")
    : kind === "code_plugin"
      ? eu("pluginsKindCode")
      : eu("pluginsKindBundle");
}

function requestStateLabel(state: UserPluginRequest["state"]): string {
  const labels: Record<UserPluginRequest["state"], string> = {
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
  const labels: Record<UserSkillInstall["state"], string> = {
    ready: eu("pluginsStateReady"),
    needs_setup: eu("pluginsStateNeedsSetup"),
    disabled: eu("pluginsStateDisabled"),
    modified: eu("pluginsStateModified"),
    error: eu("pluginsStateError"),
  };
  return labels[state];
}

function grantStateLabel(state: UserPluginGrant["state"]): string {
  const labels: Record<UserPluginGrant["state"], string> = {
    active: eu("pluginsGrantActive"),
    suspended_version_mismatch: eu("pluginsGrantVersionMismatch"),
    unavailable: eu("pluginsGrantUnavailable"),
    orphaned: eu("pluginsGrantOrphaned"),
    revoked: eu("pluginsGrantRevoked"),
  };
  return labels[state];
}

export function renderSkillStatus(item: UserSkillInstall): TemplateResult {
  const kind =
    item.state === "ready"
      ? item.enabled
        ? "ok"
        : "muted"
      : item.state === "needs_setup"
        ? "warn"
        : item.state === "disabled"
          ? "muted"
          : "danger";
  return renderSettingsStatus({ kind, label: skillStateLabel(item.state) });
}

export function renderGrantStatus(item: UserPluginGrant): TemplateResult {
  const kind =
    item.state === "active"
      ? "ok"
      : item.state === "revoked"
        ? "muted"
        : item.state === "orphaned"
          ? "danger"
          : "warn";
  return renderSettingsStatus({ kind, label: grantStateLabel(item.state) });
}

export function renderRequestStateStatus(state: UserPluginRequest["state"]): TemplateResult {
  const kind =
    state === "available"
      ? "ok"
      : state === "pending" || state === "approving"
        ? "warn"
        : state === "rejected" || state === "install_failed"
          ? "danger"
          : "muted";
  return renderSettingsStatus({ kind, label: requestStateLabel(state) });
}

export function renderRequestStatus(item: UserPluginRequest): TemplateResult {
  return renderRequestStateStatus(item.state);
}

function artSlug(key: string): string {
  const packageName = key.split("/").at(-1) ?? key;
  return packageName.split("@")[0] || packageName;
}

export function renderArtTile(
  key: string,
  name: string,
  className = "plugins-tile",
): TemplateResult {
  const slug = artSlug(key);
  const art = pluginArtPath(slug);
  if (art) {
    return html`<span class=${className} aria-hidden="true">
      <img src=${art} alt="" loading="lazy" decoding="async" />
    </span>`;
  }
  const [from, to] = pluginFallbackGradient(slug);
  const monogram = pluginMonogram(name);
  return html`<span
    class=${`${className} ${className}--fallback`}
    style=${`--plugins-art-a:${from};--plugins-art-b:${to}`}
    aria-hidden="true"
  >
    ${monogram ? html`<span>${monogram}</span>` : icons.puzzle}
  </span>`;
}

export function renderMetaLine(parts: ReadonlyArray<TemplateResult | string | typeof nothing>) {
  const visible = parts.filter((part) => part !== nothing && part !== "");
  if (visible.length === 0) {
    return nothing;
  }
  return html`<span class="settings-row__desc plugins-meta">
    ${visible.map(
      (part, index) =>
        html`${index > 0 ? html`<span aria-hidden="true"> · </span>` : nothing}${part}`,
    )}
  </span>`;
}

export function renderEmpty(title: string, body: string, mood: "sleepy" | "curious") {
  return html`<div class="plugins-empty">
    <openclaw-mascot class="plugins-empty__mascot" .mood=${mood} .size=${84}></openclaw-mascot>
    <h2>${title}</h2>
    <p>${body}</p>
  </div>`;
}
