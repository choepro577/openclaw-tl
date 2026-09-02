import { consume } from "@lit/context";
import { html } from "lit";
import type { RouteId } from "../../../app-route-paths.ts";
import { applicationContext, type ApplicationContext } from "../../../app/context.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";

export class UserNotFoundPage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: false })
  private context!: ApplicationContext<RouteId>;

  override render() {
    return html`<section class="empty-state" role="status">
      <h1>${eu("pageNotFound")}</h1>
      <p>${eu("pageNotFoundDescription")}</p>
      <button class="btn primary" type="button" @click=${() => this.context.navigate("enterprise")}>
        ${eu("agentLibraryBack")}
      </button>
    </section>`;
  }
}

if (!customElements.get("openclaw-user-not-found-page")) {
  customElements.define("openclaw-user-not-found-page", UserNotFoundPage);
}
