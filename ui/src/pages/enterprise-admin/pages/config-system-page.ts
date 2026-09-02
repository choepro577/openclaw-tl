import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { OpenClawLightDomElement } from "../../../lit/openclaw-element.ts";
import {
  applyAdminConfig,
  loadAdminConfig,
  validateAdminConfig,
  type EnterpriseConfigSnapshot,
  type EnterpriseConfigValidation,
} from "../../enterprise/services/enterprise-api.ts";
import { errorMessage } from "../utils.ts";

type EditorMode = "structured" | "raw";
type ConfigLeaf = { path: string; value: unknown };

function collectLeaves(value: unknown, prefix = ""): ConfigLeaf[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) {
      return entries.flatMap(([key, child]) =>
        collectLeaves(child, prefix ? `${prefix}.${key}` : key),
      );
    }
  }
  return [{ path: prefix || "<root>", value }];
}

function setPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split(".");
  let cursor = root;
  for (const segment of segments.slice(0, -1)) {
    const child = cursor[segment];
    if (!child || typeof child !== "object" || Array.isArray(child)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
  const finalSegment = segments.at(-1);
  if (finalSegment) {
    cursor[finalSegment] = value;
  }
}

function parseStructuredValue(raw: string, previous: unknown): unknown {
  if (typeof previous === "number") {
    const value = Number(raw);
    return Number.isFinite(value) ? value : previous;
  }
  if (Array.isArray(previous) || (previous && typeof previous === "object")) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return previous;
    }
  }
  return raw;
}

export class EnterpriseAdminConfigSystemPage extends OpenClawLightDomElement {
  @state() private snapshot?: EnterpriseConfigSnapshot;
  @state() private validation?: EnterpriseConfigValidation;
  @state() private mode: EditorMode = "structured";
  @state() private raw = "";
  @state() private search = "";
  @state() private confirmation = "";
  @state() private loading = true;
  @state() private busy = false;
  @state() private error = "";
  @state() private notice = "";

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = "";
    try {
      this.snapshot = await loadAdminConfig();
      this.raw = this.snapshot.raw;
      this.validation = undefined;
      this.confirmation = "";
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private updateStructured(path: string, value: unknown): void {
    if (!this.snapshot?.config || typeof this.snapshot.config !== "object") {
      return;
    }
    const next = structuredClone(this.snapshot.config as Record<string, unknown>);
    setPath(next, path, value);
    this.snapshot = { ...this.snapshot, config: next };
    this.raw = JSON.stringify(next, null, 2);
    this.validation = undefined;
    this.confirmation = "";
    this.notice = "";
  }

  private async validate(): Promise<void> {
    if (!this.snapshot) {
      return;
    }
    this.busy = true;
    this.error = "";
    this.notice = "";
    try {
      this.validation = await validateAdminConfig(this.raw, this.snapshot.hash);
      this.confirmation = "";
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  private async apply(): Promise<void> {
    if (!this.snapshot || !this.validation?.valid || this.confirmation !== "APPLY") {
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      const result = await applyAdminConfig(this.raw, this.snapshot.hash);
      this.notice =
        result.impact === "restart"
          ? "Đã lưu config. Gateway cần restart để áp dụng toàn bộ thay đổi."
          : result.impact === "reload"
            ? "Đã lưu config. Gateway đang reload cấu hình."
            : "Config không có thay đổi.";
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  private renderStructured() {
    const config = this.snapshot?.config;
    const query = this.search.trim().toLowerCase();
    const leaves = collectLeaves(config)
      .filter((entry) => !query || entry.path.toLowerCase().includes(query))
      .slice(0, 200);
    return html`
      <div class="ea-stack">
        <input
          class="ea-input"
          type="search"
          placeholder="Tìm config path…"
          aria-label="Tìm config path"
          .value=${this.search}
          @input=${(event: Event) =>
            (this.search = (event.currentTarget as HTMLInputElement).value)}
        />
        <div class="ea-card ea-structured-config">
          ${leaves.map((entry) => {
            if (typeof entry.value === "boolean") {
              return html`<label class="ea-config-field">
                <span>${entry.path}</span>
                <select
                  class="ea-select"
                  .value=${String(entry.value)}
                  @change=${(event: Event) =>
                    this.updateStructured(
                      entry.path,
                      (event.currentTarget as HTMLSelectElement).value === "true",
                    )}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>`;
            }
            const serialized =
              entry.value && typeof entry.value === "object"
                ? JSON.stringify(entry.value)
                : String(entry.value ?? "");
            return html`<label class="ea-config-field">
              <span>${entry.path}</span>
              <input
                class="ea-input"
                type=${typeof entry.value === "number" ? "number" : "text"}
                .value=${serialized}
                @change=${(event: Event) =>
                  this.updateStructured(
                    entry.path,
                    parseStructuredValue(
                      (event.currentTarget as HTMLInputElement).value,
                      entry.value,
                    ),
                  )}
              />
            </label>`;
          })}
          ${leaves.length === 0
            ? html`<div class="ea-empty">Không tìm thấy config path phù hợp.</div>`
            : nothing}
        </div>
      </div>
    `;
  }

  override render() {
    return html`<section class="ea-page">
      <header class="ea-page-header">
        <div>
          <h1>System Config</h1>
          <p>Chỉnh sửa có cấu trúc hoặc Raw JSON, validate và áp dụng bằng CAS.</p>
        </div>
        <button
          class="ea-button"
          type="button"
          ?disabled=${this.busy}
          @click=${() => void this.load()}
        >
          Tải lại
        </button>
      </header>
      ${this.loading
        ? html`<div class="ea-loading">Đang tải config đã redacted…</div>`
        : html`
            <div class="ea-config-layout">
              <div class="ea-stack">
                <div class="ea-segmented" role="tablist" aria-label="Chế độ chỉnh sửa config">
                  <button
                    class=${this.mode === "structured" ? "is-active" : ""}
                    type="button"
                    @click=${() => (this.mode = "structured")}
                  >
                    Structured
                  </button>
                  <button
                    class=${this.mode === "raw" ? "is-active" : ""}
                    type="button"
                    @click=${() => (this.mode = "raw")}
                  >
                    Raw JSON
                  </button>
                </div>
                ${this.mode === "structured"
                  ? this.renderStructured()
                  : html`<label class="ea-field"
                      >Advanced Raw JSON
                      <textarea
                        class="ea-textarea ea-textarea--config"
                        .value=${this.raw}
                        @input=${(event: Event) => {
                          this.raw = (event.currentTarget as HTMLTextAreaElement).value;
                          this.validation = undefined;
                          this.confirmation = "";
                          this.notice = "";
                        }}
                      ></textarea>
                    </label>`}
              </div>
              <aside class="ea-stack">
                <div class="ea-card ea-config-summary">
                  <h3>Quy trình an toàn</h3>
                  <ol class="ea-muted">
                    <li>Sửa draft đã redacted</li>
                    <li>Validate schema/plugin/include</li>
                    <li>Review diff & impact</li>
                    <li>Xác nhận APPLY</li>
                  </ol>
                  <div class="ea-code">Config hash: ${this.snapshot?.hash ?? "—"}</div>
                </div>
                <button
                  class="ea-button"
                  type="button"
                  ?disabled=${this.busy}
                  @click=${() => void this.validate()}
                >
                  ${this.busy ? "Đang xử lý…" : "Validate draft"}
                </button>
                ${this.validation
                  ? html`<div class="ea-card ea-config-summary">
                      <h3>Review diff & impact</h3>
                      <span
                        class="ea-badge ${this.validation.valid
                          ? "ea-badge--good"
                          : "ea-badge--bad"}"
                      >
                        ${this.validation.valid ? "Valid" : "Invalid"}
                      </span>
                      ${this.validation.impact.restartRequired
                        ? html`<div class="ea-banner">
                            Thay đổi yêu cầu restart và có thể làm mất kết nối.
                          </div>`
                        : this.validation.impact.reloadRequired
                          ? html`<div class="ea-banner">Thay đổi yêu cầu reload cấu hình.</div>`
                          : nothing}
                      <div class="ea-code ea-code--review">
                        ${JSON.stringify(
                          {
                            changes: this.validation.sanitizedDiff,
                            warnings: this.validation.warnings,
                            impact: this.validation.impact,
                          },
                          null,
                          2,
                        )}
                      </div>
                      <label class="ea-field"
                        >Gõ APPLY để xác nhận
                        <input
                          class="ea-input"
                          autocomplete="off"
                          .value=${this.confirmation}
                          @input=${(event: Event) =>
                            (this.confirmation = (event.currentTarget as HTMLInputElement).value)}
                        />
                      </label>
                      <button
                        class="ea-button ea-button--primary"
                        type="button"
                        ?disabled=${!this.validation.valid ||
                        this.confirmation !== "APPLY" ||
                        this.busy}
                        @click=${() => void this.apply()}
                      >
                        Apply config với CAS
                      </button>
                    </div>`
                  : nothing}
              </aside>
            </div>
          `}
      ${this.error ? html`<p class="ea-error" role="alert">${this.error}</p>` : nothing}
      ${this.notice ? html`<p class="ea-success" role="status">${this.notice}</p>` : nothing}
    </section>`;
  }
}

if (!customElements.get("openclaw-enterprise-admin-config-system-page")) {
  customElements.define(
    "openclaw-enterprise-admin-config-system-page",
    EnterpriseAdminConfigSystemPage,
  );
}
