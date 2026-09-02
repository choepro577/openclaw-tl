import { consume } from "@lit/context";
import { html } from "lit";
import type { RouteId } from "../../../app-route-paths.ts";
import { applicationContext, type ApplicationContext } from "../../../app/context.ts";
import {
  renderSettingsPage,
  renderSettingsRow,
  renderSettingsSection,
} from "../../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../../components/settings-workspace.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";

export class UserHelpAboutPage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: false })
  private context!: ApplicationContext<RouteId>;

  override render() {
    const version = this.context.gateway.snapshot.hello?.server?.version?.trim() || eu("unknown");
    return renderSettingsWorkspace(
      renderSettingsPage(html`
        <header class="eu-page-header">
          <div>
            <h1>${eu("helpAbout")}</h1>
            <p>${eu("helpDescription")}</p>
          </div>
        </header>
        ${renderSettingsSection(
          { title: eu("help") },
          html`
            ${renderSettingsRow({
              title: eu("agentAccessTitle"),
              description: eu("agentAccessHelp"),
            })}
            ${renderSettingsRow({
              title: eu("dataPrivacy"),
              description: eu("dataPrivacyHelp"),
            })}
          `,
        )}
        ${renderSettingsSection(
          { title: eu("about") },
          html`
            ${renderSettingsRow({ title: eu("product"), description: eu("productName") })}
            ${renderSettingsRow({ title: eu("gatewayVersion"), description: version })}
          `,
        )}
      `),
    );
  }
}

if (!customElements.get("openclaw-user-help-about-page")) {
  customElements.define("openclaw-user-help-about-page", UserHelpAboutPage);
}
