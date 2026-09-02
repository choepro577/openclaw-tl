import { property } from "lit/decorators.js";
import type { EnterpriseUserAuthAccount } from "./services/user-enterprise-api.ts";
import { renderEnterpriseUserShell } from "./shell/user-shell-view.ts";
import { EnterpriseUserShell } from "./shell/user-shell.ts";
import "./styles/semantic.css";
import "./styles/shell.css";
import "./styles/sidebar.css";

export class EnterpriseUserRoot extends EnterpriseUserShell {
  @property({ attribute: false }) account?: EnterpriseUserAuthAccount;

  override render() {
    return renderEnterpriseUserShell(this);
  }
}

if (!customElements.get("openclaw-enterprise-user-root")) {
  customElements.define("openclaw-enterprise-user-root", EnterpriseUserRoot);
}
