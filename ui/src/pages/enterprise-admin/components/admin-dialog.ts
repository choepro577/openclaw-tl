import { css, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import "../../../components/modal-dialog.ts";
import { icons } from "../../../components/icons.ts";
import { ea } from "../../../i18n/enterprise-admin.ts";
import { OpenClawLitElement } from "../../../lit/openclaw-element.ts";

export class EnterpriseAdminDialog extends OpenClawLitElement {
  static override styles = css`
    :host {
      color: var(--ea-text);
    }

    openclaw-modal-dialog {
      --openclaw-modal-width: 620px;
      --openclaw-modal-max-width: calc(100vw - 32px);
      --openclaw-modal-max-height: calc(100dvh - 32px);
    }

    openclaw-modal-dialog.ea-dialog--wide {
      --openclaw-modal-width: 900px;
    }

    openclaw-modal-dialog.ea-drawer {
      --openclaw-modal-width: 880px;
    }

    openclaw-modal-dialog.ea-drawer.ea-dialog--wide {
      --openclaw-modal-width: 1180px;
    }

    .ea-dialog__surface {
      overflow: hidden;
      border: 1px solid var(--ea-border);
      border-radius: 18px;
      background: var(--ea-panel);
      box-shadow: 0 30px 100px rgb(0 0 0 / 55%);
    }

    openclaw-modal-dialog.ea-drawer .ea-dialog__surface {
      min-height: 100dvh;
      border-radius: 0;
    }

    .ea-dialog__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid var(--ea-border);
      padding: 20px 22px;
    }

    .ea-dialog__header h2,
    .ea-dialog__header p {
      margin: 0;
    }

    .ea-dialog__header p {
      margin-top: 5px;
      color: var(--ea-muted);
      font-size: 13px;
    }

    .ea-dialog__body {
      min-width: 0;
      max-height: calc(100dvh - 140px);
      overflow: auto;
      padding: 22px;
    }

    slot {
      display: block;
      min-width: 0;
      max-width: 100%;
    }

    ::slotted(*) {
      box-sizing: border-box;
      min-width: 0;
      max-width: 100%;
    }

    .ea-icon-button {
      display: inline-grid;
      width: 36px;
      height: 36px;
      place-items: center;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: var(--ea-text);
      cursor: var(--cursor-action);
    }

    .ea-icon-button:hover {
      background: var(--ea-panel-2);
    }

    @media (max-width: 768px) {
      openclaw-modal-dialog,
      openclaw-modal-dialog.ea-dialog--wide,
      openclaw-modal-dialog.ea-drawer {
        --openclaw-modal-width: 100vw;
        --openclaw-modal-max-width: 100vw;
        --openclaw-modal-max-height: 100dvh;
      }

      .ea-dialog__surface,
      openclaw-modal-dialog.ea-drawer .ea-dialog__surface {
        min-height: 100dvh;
        border-radius: 0;
      }

      .ea-dialog__body {
        max-height: calc(100dvh - 82px);
      }
    }
  `;

  @property({ type: Boolean, reflect: true }) open = false;
  @property() heading = "";
  @property() description = "";
  @property({ type: Boolean }) wide = false;
  @property({ type: Boolean }) drawer = false;
  @property({ attribute: false }) onClose?: () => void;
  @property({ attribute: false }) canClose?: () => boolean;

  private requestClose(event?: Event): void {
    if (this.canClose && !this.canClose()) {
      event?.preventDefault();
      return;
    }
    this.onClose?.();
  }

  override render() {
    if (!this.open) {
      return nothing;
    }
    const modalClass = [
      "ea-dialog",
      this.wide ? "ea-dialog--wide" : "",
      this.drawer ? "ea-drawer drawer mobile-edge-to-edge" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return html`
      <openclaw-modal-dialog
        class=${modalClass}
        .open=${true}
        .label=${this.heading}
        .description=${this.description}
        @modal-cancel=${(event: Event) => this.requestClose(event)}
      >
        <section class="ea-dialog__surface">
          <header class="ea-dialog__header">
            <div>
              <h2>${this.heading}</h2>
              ${this.description ? html`<p>${this.description}</p>` : nothing}
            </div>
            <button
              class="ea-icon-button"
              type="button"
              aria-label=${ea("Đóng")}
              @click=${() => this.requestClose()}
            >
              ${icons.x}
            </button>
          </header>
          <div class="ea-dialog__body"><slot></slot></div>
        </section>
      </openclaw-modal-dialog>
    `;
  }
}

if (!customElements.get("openclaw-enterprise-admin-dialog")) {
  customElements.define("openclaw-enterprise-admin-dialog", EnterpriseAdminDialog);
}
