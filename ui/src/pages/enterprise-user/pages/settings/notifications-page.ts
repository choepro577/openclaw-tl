import { html } from "lit";
import {
  renderSettingsPage,
  renderSettingsRow,
  renderSettingsSection,
} from "../../../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../../../components/settings-workspace.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";

export class UserNotificationsPage extends OpenClawLightDomElement {
  override render() {
    return renderSettingsWorkspace(
      renderSettingsPage(html`
        <header class="eu-page-header">
          <div>
            <h1>${eu("notifications")}</h1>
            <p>${eu("notificationsDescription")}</p>
          </div>
        </header>
        ${renderSettingsSection(
          { title: eu("status") },
          renderSettingsRow({
            title: eu("notificationsEmpty"),
            description: eu("notificationsEmptyDescription"),
          }),
        )}
      `),
    );
  }
}

if (!customElements.get("openclaw-user-notifications-page")) {
  customElements.define("openclaw-user-notifications-page", UserNotificationsPage);
}
