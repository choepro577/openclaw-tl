import { html, nothing, type TemplateResult } from "lit";

export type ExtensionCatalogPresentation = {
  key: string;
  name: string;
  description: string | null;
  kindLabel: string;
  publisher: string | null;
  version: string | null;
  integrity: string | null;
  trustLabel: string;
  trustDetail?: string | null;
  requirements: string[];
  statusLabel?: string | null;
  labels: {
    publisher: string;
    version: string;
    integrity: string;
    trust: string;
    status: string;
  };
};

export function renderExtensionCatalogCard(
  item: ExtensionCatalogPresentation,
  options: {
    actionLabel: string;
    actionDisabled?: boolean;
    actionBusy?: boolean;
    hideAction?: boolean;
    onAction: () => void;
  },
): TemplateResult {
  return html`
    <article class="eu-extension-card" data-extension-key=${item.key}>
      <div class="eu-extension-card__heading">
        <div>
          <h2>${item.name}</h2>
          <p>${item.description ?? nothing}</p>
        </div>
        <span class="eu-extension-card__kind">${item.kindLabel}</span>
      </div>
      <dl class="eu-extension-card__meta">
        ${item.publisher
          ? html`<div>
              <dt>${item.labels.publisher}</dt>
              <dd>${item.publisher}</dd>
            </div>`
          : nothing}
        ${item.version
          ? html`<div>
              <dt>${item.labels.version}</dt>
              <dd>${item.version}</dd>
            </div>`
          : nothing}
        ${item.integrity
          ? html`<div>
              <dt>${item.labels.integrity}</dt>
              <dd class="eu-extension-mono">${item.integrity}</dd>
            </div>`
          : nothing}
        <div>
          <dt>${item.labels.trust}</dt>
          <dd>
            ${item.trustLabel}${item.trustDetail
              ? html`<small class="eu-extension-card__trust-detail">${item.trustDetail}</small>`
              : nothing}
          </dd>
        </div>
        ${item.statusLabel
          ? html`<div>
              <dt>${item.labels.status}</dt>
              <dd>${item.statusLabel}</dd>
            </div>`
          : nothing}
      </dl>
      ${item.requirements.length > 0
        ? html`<ul class="eu-extension-requirements">
            ${item.requirements.map((requirement) => html`<li>${requirement}</li>`)}
          </ul>`
        : nothing}
      ${options.hideAction
        ? nothing
        : html`<div class="eu-extension-card__actions">
            <button
              type="button"
              class="btn"
              ?disabled=${options.actionDisabled || options.actionBusy}
              aria-busy=${options.actionBusy ? "true" : "false"}
              @click=${options.onAction}
            >
              ${options.actionLabel}
            </button>
          </div>`}
    </article>
  `;
}
