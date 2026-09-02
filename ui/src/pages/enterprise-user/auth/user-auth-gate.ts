import { html } from "lit";
import { eu } from "../../../i18n/enterprise-user.ts";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import { loadEnterpriseStatus } from "../../enterprise/services/enterprise-api.ts";
import { setEnterpriseUiAccountRole } from "../../enterprise/state/enterprise-ui-access.ts";
import {
  EnterpriseApiError,
  loadEnterpriseUserMe,
  type EnterpriseUserAuthAccount,
} from "../services/user-enterprise-api.ts";
import { setEnterpriseUserSessionAccount } from "../state/user-auth-session.ts";
import "../styles/auth.css";
import "./user-change-password-page.ts";
import "./user-login-page.ts";

type State =
  | { phase: "checking" }
  | { phase: "login"; bootstrapped: boolean; error?: string }
  | { phase: "password"; account: EnterpriseUserAuthAccount }
  | { phase: "ready"; account: EnterpriseUserAuthAccount }
  | { phase: "disabled" }
  | { phase: "error"; message: string };

export class EnterpriseUserAuthGate extends OpenClawLightDomElement {
  private state: State = { phase: "checking" };

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private publish(state: State): void {
    this.state = state;
    setEnterpriseUiAccountRole(state.phase === "ready" ? state.account.role : undefined);
    this.synchronizePath();
    this.requestUpdate();
    if (state.phase === "ready" || state.phase === "disabled") {
      this.dispatchEvent(
        new CustomEvent("enterprise-auth-ready", {
          bubbles: true,
          composed: true,
          detail: state.phase === "ready" ? { account: state.account } : { disabled: true },
        }),
      );
    }
  }

  private synchronizePath(): void {
    const pathname = globalThis.location?.pathname ?? "/";
    const appIndex = pathname.indexOf("/app");
    if (appIndex < 0) {
      return;
    }
    const base = pathname.slice(0, appIndex);
    const target =
      this.state.phase === "login"
        ? `${base}/app/login`
        : this.state.phase === "password"
          ? `${base}/app/change-password`
          : null;
    if (target && pathname !== target) {
      globalThis.history.replaceState(globalThis.history.state, "", target);
    }
  }

  private async load(): Promise<void> {
    this.publish({ phase: "checking" });
    try {
      const status = await loadEnterpriseStatus();
      if (!status.enabled) {
        this.publish({ phase: "disabled" });
        return;
      }
      if (!status.bootstrapped) {
        this.publish({ phase: "login", bootstrapped: false });
        return;
      }
      try {
        this.accept((await loadEnterpriseUserMe()).account);
      } catch (error) {
        if (error instanceof EnterpriseApiError && error.status === 401) {
          this.publish({ phase: "login", bootstrapped: true });
          return;
        }
        throw error;
      }
    } catch (error) {
      this.publish({
        phase: "error",
        message: error instanceof Error ? error.message : eu("portalCheckFailed"),
      });
    }
  }

  private accept(account: EnterpriseUserAuthAccount): void {
    setEnterpriseUserSessionAccount(account);
    this.publish(
      account.mustChangePassword ? { phase: "password", account } : { phase: "ready", account },
    );
  }

  override render() {
    if (
      this.state.phase === "checking" ||
      this.state.phase === "disabled" ||
      this.state.phase === "ready"
    ) {
      return html`<main class="eu-auth-screen" role="status">${eu("loadingPortal")}</main>`;
    }
    if (this.state.phase === "error") {
      return html`<main class="eu-auth-screen">
        <section class="card eu-auth-card">
          <div class="callout danger" role="alert">${this.state.message}</div>
          <button class="btn" type="button" @click=${() => void this.load()}>${eu("retry")}</button>
        </section>
      </main>`;
    }
    if (this.state.phase === "password") {
      return html`<openclaw-enterprise-user-change-password-page
        .account=${this.state.account}
        .onChanged=${() => this.publish({ phase: "login", bootstrapped: true })}
      ></openclaw-enterprise-user-change-password-page>`;
    }
    return html`<openclaw-enterprise-user-login-page
      .bootstrapped=${this.state.bootstrapped}
      .onAuthenticated=${(account: EnterpriseUserAuthAccount) => this.accept(account)}
    ></openclaw-enterprise-user-login-page>`;
  }
}

if (!customElements.get("openclaw-enterprise-user-auth-gate")) {
  customElements.define("openclaw-enterprise-user-auth-gate", EnterpriseUserAuthGate);
}
