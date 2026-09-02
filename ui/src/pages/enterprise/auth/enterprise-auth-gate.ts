import { html } from "lit";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import "../styles/enterprise.css";
import { shouldOpenEnterpriseLanding } from "../state/enterprise-auth-navigation.ts";
import { enterpriseAuthStore } from "../state/enterprise-auth-store.ts";
import "./change-password-page.ts";
import "./login-page.ts";

export class EnterpriseAuthGate extends OpenClawLightDomElement {
  private unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = enterpriseAuthStore.subscribe(() => {
      this.synchronizePortalPath();
      this.requestUpdate();
      this.publishReadyState();
    });
    void enterpriseAuthStore.load();
  }

  private synchronizePortalPath(): void {
    const state = enterpriseAuthStore.state;
    const pathname = globalThis.location?.pathname ?? "/";
    const appIndex = pathname.indexOf("/app");
    if (appIndex < 0) {
      return;
    }
    const base = pathname.slice(0, appIndex);
    const target =
      state.phase === "unauthenticated"
        ? `${base}/app/login`
        : state.phase === "password-change"
          ? `${base}/app/change-password`
          : null;
    if (target && pathname !== target) {
      globalThis.history.replaceState(globalThis.history.state, "", target);
    }
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super.disconnectedCallback();
  }

  private publishReadyState(): void {
    const state = enterpriseAuthStore.state;
    if (state.phase !== "disabled" && state.phase !== "authenticated") {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("enterprise-auth-ready", {
        bubbles: true,
        composed: true,
        detail:
          state.phase === "authenticated"
            ? {
                account: state.account,
                openEnterprise: shouldOpenEnterpriseLanding(
                  state.entryPoint,
                  globalThis.location?.pathname ?? "/",
                ),
              }
            : { disabled: true },
      }),
    );
  }

  override render() {
    const state = enterpriseAuthStore.state;
    if (
      state.phase === "checking" ||
      state.phase === "disabled" ||
      state.phase === "authenticated"
    ) {
      return html`<main class="enterprise-auth-screen">
        <p class="enterprise-muted">Đang khởi động OpenClaw…</p>
      </main>`;
    }
    if (state.phase === "error") {
      return html`<main class="enterprise-auth-screen">
        <section class="enterprise-card enterprise-stack">
          <p class="enterprise-error">${state.message}</p>
          <button class="enterprise-button" @click=${() => void enterpriseAuthStore.load()}>
            Thử lại
          </button>
        </section>
      </main>`;
    }
    if (state.phase === "password-change") {
      return html`<openclaw-enterprise-change-password-page
        .account=${state.account}
        .onChanged=${() =>
          enterpriseAuthStore.setState({ phase: "unauthenticated", bootstrapped: true })}
      ></openclaw-enterprise-change-password-page>`;
    }
    return html`<openclaw-enterprise-login-page
      .bootstrapped=${state.bootstrapped}
      .onAuthenticated=${(account: import("../services/enterprise-api.ts").EnterpriseAccount) =>
        enterpriseAuthStore.acceptAccount(account)}
    ></openclaw-enterprise-login-page>`;
  }
}

if (!customElements.get("openclaw-enterprise-auth-gate")) {
  customElements.define("openclaw-enterprise-auth-gate", EnterpriseAuthGate);
}
