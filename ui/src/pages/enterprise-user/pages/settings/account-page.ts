import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import {
  renderSettingsPage,
  renderSettingsRow,
  renderSettingsSection,
} from "../../../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../../../components/settings-workspace.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import { processProfileAvatar } from "../../../profile/avatar-processing.ts";
import {
  changeEnterpriseUserPassword,
  updateEnterpriseUserAccount,
  updateEnterpriseUserAvatar,
} from "../../services/user-enterprise-api.ts";
import {
  enterpriseUserSessionAccount,
  setEnterpriseUserSessionAccount,
} from "../../state/user-auth-session.ts";
import { userBootstrapStore } from "../../state/user-bootstrap-store.ts";

export class UserAccountPage extends OpenClawLightDomElement {
  @state() private displayName = "";
  @state() private busy = false;
  @state() private error = "";
  @state() private saved = "";
  private unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = userBootstrapStore.subscribe(() => this.requestUpdate());
    const account = enterpriseUserSessionAccount();
    this.displayName = account?.displayName ?? "";
    void userBootstrapStore.load();
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super.disconnectedCallback();
  }

  private async saveDisplayName(): Promise<void> {
    if (this.busy || !this.displayName.trim()) {
      return;
    }
    this.busy = true;
    this.error = "";
    this.saved = "";
    try {
      const result = await updateEnterpriseUserAccount(this.displayName.trim());
      setEnterpriseUserSessionAccount(result.account);
      this.displayName = result.account.displayName;
      await userBootstrapStore.load(true);
      this.saved = eu("displayNameSaved");
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("profileSaveFailed");
    } finally {
      this.busy = false;
    }
  }

  private async saveAvatar(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      const avatar = await processProfileAvatar(file);
      await updateEnterpriseUserAvatar({
        mime: avatar.mime,
        avatarBase64: avatar.avatarBase64,
      });
      this.saved = eu("avatarSaved");
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("avatarSaveFailed");
    } finally {
      this.busy = false;
    }
  }

  private async changePassword(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (this.busy) {
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (newPassword !== confirmation) {
      this.error = eu("passwordMismatch");
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await changeEnterpriseUserPassword(currentPassword, newPassword);
      globalThis.location.reload();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("passwordUpdateFailed");
      this.busy = false;
    }
  }

  override render() {
    const account = enterpriseUserSessionAccount();
    const bootstrap = userBootstrapStore.state;
    const username = bootstrap.phase === "ready" ? bootstrap.data.user.username : account?.username;
    const content = renderSettingsPage(html`
      <header class="eu-page-header">
        <div>
          <h1>${eu("accountSecurity")}</h1>
          <p>${eu("profileDescription")}</p>
        </div>
      </header>
      ${this.error ? html`<div class="callout danger" role="alert">${this.error}</div>` : nothing}
      ${this.saved ? html`<div class="callout success" role="status">${this.saved}</div>` : nothing}
      ${renderSettingsSection(
        { title: eu("account") },
        html`
          ${renderSettingsRow({
            title: eu("displayName"),
            control: html`<div>
              <input
                class="input"
                maxlength="128"
                .value=${this.displayName}
                @input=${(event: Event) => {
                  this.displayName = (event.currentTarget as HTMLInputElement).value;
                }}
              />
              <button
                class="btn primary"
                type="button"
                ?disabled=${this.busy || !this.displayName.trim()}
                @click=${() => void this.saveDisplayName()}
              >
                ${eu("save")}
              </button>
            </div>`,
            stacked: true,
          })}
          ${renderSettingsRow({
            title: eu("avatar"),
            description: eu("avatarDescription"),
            control: html`<label class="btn">
              ${eu("chooseImage")}
              <input
                class="settings-control__sr-label"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                @change=${(event: Event) => void this.saveAvatar(event)}
              />
            </label>`,
          })}
          ${renderSettingsRow({
            title: eu("username"),
            control: html`<span>${username ?? "—"}</span>`,
          })}
          ${renderSettingsRow({
            title: eu("role"),
            description: eu("roleDescription"),
            control: html`<span>${account?.role ?? "employee"}</span>`,
          })}
        `,
      )}
      ${renderSettingsSection(
        { title: eu("changePassword") },
        html`<form
          class="settings-row settings-row--stacked"
          @submit=${(event: SubmitEvent) => void this.changePassword(event)}
        >
          <div class="settings-row__control stack">
            <input
              class="input"
              name="currentPassword"
              type="password"
              autocomplete="current-password"
              placeholder=${eu("currentPassword")}
              required
            />
            <input
              class="input"
              name="newPassword"
              type="password"
              minlength="10"
              autocomplete="new-password"
              placeholder=${eu("newPassword")}
              required
            />
            <input
              class="input"
              name="confirmation"
              type="password"
              minlength="10"
              autocomplete="new-password"
              placeholder=${eu("confirmNewPassword")}
              required
            />
            <button class="btn primary" type="submit" ?disabled=${this.busy}>
              ${eu("changePassword")}
            </button>
          </div>
        </form>`,
      )}
    `);
    return renderSettingsWorkspace(content);
  }
}

if (!customElements.get("openclaw-user-account-page")) {
  customElements.define("openclaw-user-account-page", UserAccountPage);
}
