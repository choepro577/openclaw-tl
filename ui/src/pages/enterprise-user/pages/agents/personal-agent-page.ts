import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { showConfirmDialog } from "../../../../components/confirm-dialog.ts";
import { renderHubTabs } from "../../../../components/hub-tabs.ts";
import {
  renderSettingsEmpty,
  renderSettingsPage,
  renderSettingsRow,
  renderSettingsSection,
  renderSettingsSegmented,
} from "../../../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../../../components/settings-workspace.ts";
import { eu } from "../../../../i18n/enterprise-user.ts";
import { i18n } from "../../../../i18n/index.ts";
import { showToast } from "../../../../lib/toast.ts";
import { OpenClawLightDomElement } from "../../../../lit/openclaw-element.ts";
import type {
  PersonalAgentKnowledgeItem,
  PersonalAgentProfile,
} from "../../contracts/personal-agent.ts";
import {
  createPersonalAgentKnowledge,
  deletePersonalAgentKnowledge,
  updatePersonalAgentKnowledge,
} from "../../services/user-enterprise-api.ts";
import { personalAgentEditorStore } from "../../state/personal-agent-editor-store.ts";
import { userAgentCatalogStore } from "../../state/user-agent-catalog-store.ts";
import { userBootstrapStore } from "../../state/user-bootstrap-store.ts";
import "../../styles/personal-agent.css";

const AVATARS = [
  { value: "sparkles", label: "✨" },
  { value: "briefcase", label: "💼" },
  { value: "message-circle", label: "💬" },
  { value: "bot", label: "🤖" },
  { value: "user", label: "👤" },
] as const;

type AvatarPreset = (typeof AVATARS)[number]["value"];
type PersonalAgentPanel = "overview" | "instructions" | "knowledge" | "capabilities";

export class UserPersonalAgentPage extends OpenClawLightDomElement {
  @state() private activePanel: PersonalAgentPanel = "overview";
  @state() private knowledgeTitle = "";
  @state() private knowledgeContent = "";
  @state() private knowledgeBusy = false;
  @state() private editingKnowledgeId: string | null = null;
  private unsubscribers: Array<() => void> = [];

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribers = [
      personalAgentEditorStore.subscribe(() => this.requestUpdate()),
      userBootstrapStore.subscribe(() => this.requestUpdate()),
    ];
    void userAgentCatalogStore.load();
    void personalAgentEditorStore.load();
  }

  override disconnectedCallback(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    super.disconnectedCallback();
  }

  private editKnowledge(item: PersonalAgentKnowledgeItem): void {
    this.editingKnowledgeId = item.id;
    this.knowledgeTitle = item.title;
    this.knowledgeContent = item.content;
  }

  private clearKnowledgeDraft(): void {
    this.editingKnowledgeId = null;
    this.knowledgeTitle = "";
    this.knowledgeContent = "";
  }

  private async saveProfile(): Promise<void> {
    await personalAgentEditorStore.save();
    const editorState = personalAgentEditorStore.state;
    if (editorState.phase === "ready") {
      showToast({ message: editorState.error ?? eu("personalAgentSaveSucceeded") });
    }
  }

  private async saveKnowledge(): Promise<void> {
    const editorState = personalAgentEditorStore.state;
    if (
      editorState.phase !== "ready" ||
      this.knowledgeBusy ||
      !this.knowledgeTitle.trim() ||
      !this.knowledgeContent.trim()
    ) {
      return;
    }
    this.knowledgeBusy = true;
    try {
      const existing = editorState.knowledge.find((item) => item.id === this.editingKnowledgeId);
      if (existing) {
        await updatePersonalAgentKnowledge({
          ...existing,
          title: this.knowledgeTitle.trim(),
          content: this.knowledgeContent.trim(),
        });
      } else {
        await createPersonalAgentKnowledge({
          title: this.knowledgeTitle.trim(),
          kind: "note",
          sourceName: null,
          mimeType: null,
          content: this.knowledgeContent.trim(),
        });
      }
      this.clearKnowledgeDraft();
      await personalAgentEditorStore.refreshKnowledge();
    } catch (error) {
      personalAgentEditorStore.setError(
        error instanceof Error ? error.message : eu("knowledgeSaveFailed"),
      );
    } finally {
      this.knowledgeBusy = false;
    }
  }

  private async uploadKnowledge(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || this.knowledgeBusy) {
      return;
    }
    if (file.size > 64 * 1024 || !/\.(md|txt)$/i.test(file.name)) {
      personalAgentEditorStore.setError(eu("knowledgeFileInvalid"));
      return;
    }
    this.knowledgeBusy = true;
    try {
      const content = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const isMarkdown = /\.md$/i.test(file.name);
      await createPersonalAgentKnowledge({
        title: file.name.replace(/\.(md|txt)$/i, ""),
        kind: "upload",
        sourceName: file.name,
        mimeType: file.type || (isMarkdown ? "text/markdown" : "text/plain"),
        content,
      });
      await personalAgentEditorStore.refreshKnowledge();
    } catch (error) {
      personalAgentEditorStore.setError(
        error instanceof TypeError
          ? eu("knowledgeFileEncoding")
          : error instanceof Error
            ? error.message
            : eu("knowledgeLoadFailed"),
      );
    } finally {
      this.knowledgeBusy = false;
    }
  }

  private async removeKnowledge(item: PersonalAgentKnowledgeItem): Promise<void> {
    const confirmed = await showConfirmDialog({
      title: eu("knowledgeDelete"),
      message: eu("knowledgeDeleteConfirm", { name: item.title }),
      confirmLabel: eu("delete"),
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await deletePersonalAgentKnowledge(item.id);
      await personalAgentEditorStore.refreshKnowledge();
    } catch (error) {
      personalAgentEditorStore.setError(
        error instanceof Error ? error.message : eu("knowledgeDeleteFailed"),
      );
    }
  }

  private renderOverview(draft: PersonalAgentProfile) {
    const avatarPreset = AVATARS.some((avatar) => avatar.value === draft.avatarPreset)
      ? (draft.avatarPreset as AvatarPreset)
      : "sparkles";
    const avatar = AVATARS.find((option) => option.value === avatarPreset)?.label ?? "✨";
    return html`
      ${renderSettingsSection(
        { title: eu("identity"), description: eu("avatarPresetDescription") },
        html`
          ${renderSettingsRow({
            title: eu("automationName"),
            control: html`<input
              class="settings-input"
              aria-label=${eu("automationName")}
              maxlength="64"
              .value=${draft.name}
              @input=${(event: Event) =>
                personalAgentEditorStore.update({
                  name: (event.currentTarget as HTMLInputElement).value,
                })}
            />`,
          })}
          ${renderSettingsRow({
            title: eu("avatar"),
            control: renderSettingsSegmented({
              value: avatarPreset,
              options: AVATARS.map((option) => ({
                value: option.value,
                label: html`<span class="eu-personal-agent__avatar-option" aria-hidden="true"
                    >${option.label}</span
                  ><span class="settings-control__sr-label">${option.value}</span>`,
              })),
              ariaLabel: eu("avatar"),
              onChange: (value) => personalAgentEditorStore.update({ avatarPreset: value }),
            }),
          })}
          ${renderSettingsRow({
            title: eu("greeting"),
            control: html`<textarea
              class="settings-input eu-personal-agent__textarea eu-personal-agent__textarea--greeting"
              aria-label=${eu("greeting")}
              rows="3"
              maxlength="240"
              .value=${draft.greeting}
              @input=${(event: Event) =>
                personalAgentEditorStore.update({
                  greeting: (event.currentTarget as HTMLTextAreaElement).value,
                })}
            ></textarea>`,
            stacked: true,
          })}
          ${renderSettingsRow({
            title: eu("preview"),
            control: html`<div class="eu-personal-agent__preview">
              <span class="eu-personal-agent__preview-avatar" aria-hidden="true">${avatar}</span>
              <div>
                <strong>${draft.name || eu("personalAgent")}</strong>
                <p>${draft.greeting || eu("greetingPreview")}</p>
              </div>
            </div>`,
            stacked: true,
          })}
        `,
      )}
      ${renderSettingsSection(
        { title: eu("responseStyle") },
        html`
          ${renderSettingsRow({
            title: eu("tone"),
            control: renderSettingsSegmented({
              value: draft.tone,
              options: [
                { value: "professional", label: eu("professional") },
                { value: "friendly", label: eu("friendly") },
                { value: "concise", label: eu("concise") },
              ],
              ariaLabel: eu("tone"),
              onChange: (tone) => personalAgentEditorStore.update({ tone }),
            }),
          })}
          ${renderSettingsRow({
            title: eu("responseLength"),
            control: renderSettingsSegmented({
              value: draft.responseLength,
              options: [
                { value: "brief", label: eu("brief") },
                { value: "balanced", label: eu("balanced") },
                { value: "detailed", label: eu("detailed") },
              ],
              ariaLabel: eu("responseLength"),
              onChange: (responseLength) => personalAgentEditorStore.update({ responseLength }),
            }),
          })}
          ${renderSettingsRow({
            title: eu("language"),
            control: renderSettingsSegmented({
              value: draft.language,
              options: [
                { value: "auto", label: eu("auto") },
                { value: "vi", label: eu("languageVietnamese") },
                { value: "en", label: eu("languageEnglish") },
              ],
              ariaLabel: eu("language"),
              onChange: (language) => personalAgentEditorStore.update({ language }),
            }),
          })}
        `,
      )}
    `;
  }

  private renderInstructions(draft: PersonalAgentProfile) {
    return html`
      ${renderSettingsSection(
        { title: eu("instructions") },
        renderSettingsRow({
          title: eu("customInstructions"),
          description: eu("automationPromptCount", {
            count: String(draft.customInstructions.length),
          }),
          control: html`<textarea
            class="settings-input eu-personal-agent__textarea eu-personal-agent__textarea--instructions"
            aria-label=${eu("customInstructions")}
            rows="8"
            maxlength="4000"
            .value=${draft.customInstructions}
            @input=${(event: Event) =>
              personalAgentEditorStore.update({
                customInstructions: (event.currentTarget as HTMLTextAreaElement).value,
              })}
          ></textarea>`,
          stacked: true,
        }),
      )}
      ${renderSettingsSection(
        { title: eu("userContext") },
        html`
          ${renderSettingsRow({
            title: eu("preferredName"),
            control: html`<input
              class="settings-input"
              aria-label=${eu("preferredName")}
              maxlength="128"
              .value=${draft.preferredName}
              @input=${(event: Event) =>
                personalAgentEditorStore.update({
                  preferredName: (event.currentTarget as HTMLInputElement).value,
                })}
            />`,
          })}
          ${renderSettingsRow({
            title: eu("workContext"),
            control: html`<textarea
              class="settings-input eu-personal-agent__textarea"
              aria-label=${eu("workContext")}
              rows="5"
              maxlength="4000"
              .value=${draft.workContext}
              @input=${(event: Event) =>
                personalAgentEditorStore.update({
                  workContext: (event.currentTarget as HTMLTextAreaElement).value,
                })}
            ></textarea>`,
            stacked: true,
          })}
          ${renderSettingsRow({
            title: eu("preferences"),
            control: html`<textarea
              class="settings-input eu-personal-agent__textarea"
              aria-label=${eu("preferences")}
              rows="5"
              maxlength="4000"
              .value=${draft.preferences}
              @input=${(event: Event) =>
                personalAgentEditorStore.update({
                  preferences: (event.currentTarget as HTMLTextAreaElement).value,
                })}
            ></textarea>`,
            stacked: true,
          })}
        `,
      )}
    `;
  }

  private renderKnowledge(knowledge: PersonalAgentKnowledgeItem[]) {
    return renderSettingsSection(
      {
        title: eu("knowledgePersonal"),
        count: knowledge.length,
        description: eu("knowledgeDescription"),
        actions: html`<label class="btn btn--sm">
          ${eu("knowledgeUpload")}
          <input
            class="settings-control__sr-label"
            type="file"
            accept=".md,.txt,text/plain,text/markdown"
            @change=${(event: Event) => void this.uploadKnowledge(event)}
          />
        </label>`,
      },
      html`
        ${renderSettingsRow({
          title: this.editingKnowledgeId ? eu("knowledgeEdit") : eu("knowledgeCreate"),
          control: html`<div class="eu-personal-agent__knowledge-editor">
            <input
              class="settings-input"
              maxlength="128"
              placeholder=${eu("knowledgeTitle")}
              .value=${this.knowledgeTitle}
              @input=${(event: Event) => {
                this.knowledgeTitle = (event.currentTarget as HTMLInputElement).value;
              }}
            />
            <textarea
              class="settings-input eu-personal-agent__textarea"
              rows="6"
              maxlength="8000"
              placeholder=${eu("knowledgeContent")}
              .value=${this.knowledgeContent}
              @input=${(event: Event) => {
                this.knowledgeContent = (event.currentTarget as HTMLTextAreaElement).value;
              }}
            ></textarea>
            <div class="eu-actions">
              <button
                class="btn btn--sm primary"
                type="button"
                ?disabled=${this.knowledgeBusy ||
                !this.knowledgeTitle.trim() ||
                !this.knowledgeContent.trim()}
                @click=${() => void this.saveKnowledge()}
              >
                ${this.editingKnowledgeId ? eu("knowledgeSave") : eu("knowledgeAddNote")}
              </button>
              ${this.editingKnowledgeId
                ? html`<button
                    class="btn btn--sm"
                    type="button"
                    @click=${() => this.clearKnowledgeDraft()}
                  >
                    ${eu("cancel")}
                  </button>`
                : nothing}
            </div>
          </div>`,
          stacked: true,
        })}
        ${knowledge.length === 0 ? renderSettingsEmpty(eu("knowledgeEmpty")) : nothing}
        ${knowledge.map((item) =>
          renderSettingsRow({
            title: item.title,
            description: `${item.kind === "upload" ? item.sourceName : eu("note")} · ${eu(
              "updatedAt",
              { time: new Date(item.updatedAt).toLocaleString(i18n.getLocale()) },
            )}`,
            control: html`<div class="eu-actions">
              <button class="btn btn--sm" type="button" @click=${() => this.editKnowledge(item)}>
                ${eu("edit")}
              </button>
              <button
                class="btn btn--sm danger"
                type="button"
                @click=${() => void this.removeKnowledge(item)}
              >
                ${eu("delete")}
              </button>
            </div>`,
          }),
        )}
      `,
    );
  }

  private renderCapabilities(capabilityLabels: string[], busy: boolean) {
    return html`
      ${renderSettingsSection(
        {
          title: eu("managedCapabilities"),
          description: eu("managedCapabilitiesHelp"),
        },
        capabilityLabels.length
          ? capabilityLabels.map((label) => renderSettingsRow({ title: label }))
          : renderSettingsEmpty(eu("managedCapabilitiesNone")),
      )}
      ${renderSettingsSection(
        { title: eu("reset"), danger: true },
        renderSettingsRow({
          title: eu("resetToDefault"),
          description: eu("resetDescription"),
          control: html`<button
            class="btn btn--sm danger"
            type="button"
            ?disabled=${busy}
            @click=${async () => {
              const confirmed = await showConfirmDialog({
                title: eu("resetPersonal"),
                message: eu("resetPersonalConfirm"),
                confirmLabel: eu("reset"),
                danger: true,
              });
              if (confirmed) {
                await personalAgentEditorStore.reset();
              }
            }}
          >
            ${eu("reset")}
          </button>`,
        }),
      )}
    `;
  }

  override render() {
    const editorState = personalAgentEditorStore.state;
    if (editorState.phase === "idle" || editorState.phase === "loading") {
      return renderSettingsWorkspace(
        html`<div class="loading-state" role="status">${eu("loading")}</div>`,
      );
    }
    if (editorState.phase === "error") {
      return renderSettingsWorkspace(html`<div class="callout danger" role="alert">
        ${editorState.message}
        <button class="btn" type="button" @click=${() => void personalAgentEditorStore.load()}>
          ${eu("retry")}
        </button>
      </div>`);
    }
    const draft = editorState.draft;
    const bootstrap = userBootstrapStore.state;
    if (bootstrap.phase === "ready" && !bootstrap.data.features.personalAgent.editable) {
      return renderSettingsWorkspace(
        renderSettingsPage(
          html`
            <header class="eu-page-header">
              <div>
                <h1>${eu("personalAgent")}</h1>
                <p>${eu("personalAgentManaged")}</p>
              </div>
            </header>
            <div class="callout warn" role="status">${eu("personalAgentDisabled")}</div>
            ${renderSettingsSection(
              { title: eu("status") },
              renderSettingsRow({
                title: draft.name,
                description: eu("managedByCompany"),
              }),
            )}
          `,
          { wide: true },
        ),
      );
    }
    const capabilityLabels =
      userAgentCatalogStore.agents.find((agent) => agent.kind === "personal")?.capabilityLabels ??
      [];
    const dirty = JSON.stringify(editorState.source) !== JSON.stringify(draft);
    const tabs = [
      { value: "overview", label: eu("overview") },
      { value: "instructions", label: eu("instructions") },
      { value: "knowledge", label: eu("knowledge"), count: editorState.knowledge.length },
      { value: "capabilities", label: eu("capabilities"), count: capabilityLabels.length },
    ] as const;
    const panel =
      this.activePanel === "overview"
        ? this.renderOverview(draft)
        : this.activePanel === "instructions"
          ? this.renderInstructions(draft)
          : this.activePanel === "knowledge"
            ? this.renderKnowledge(editorState.knowledge)
            : this.renderCapabilities(capabilityLabels, editorState.busy);
    const content = renderSettingsPage(
      html`
        <header class="eu-page-header">
          <div>
            <h1>${eu("personalAgent")}</h1>
            <p>${eu("personalAgentDescription")}</p>
          </div>
          <button
            class="btn primary"
            type="button"
            ?disabled=${editorState.busy || !dirty || draft.name.trim().length === 0}
            @click=${() => void this.saveProfile()}
          >
            ${editorState.busy ? eu("saveBusy") : eu("saveChanges")}
          </button>
        </header>
        <div class="eu-personal-agent__editor">
          ${editorState.error
            ? html`<div class="callout danger" role="alert">${editorState.error}</div>`
            : nothing}
          ${editorState.conflictRevision !== null
            ? html`<div class="callout warn eu-personal-agent__conflict" role="alert">
                <span>${eu("conflictDescription")}</span>
                <div class="eu-actions">
                  <button
                    class="btn btn--sm"
                    type="button"
                    @click=${() => personalAgentEditorStore.reloadLatest()}
                  >
                    ${eu("conflictReload")}
                  </button>
                  <button
                    class="btn btn--sm"
                    type="button"
                    @click=${() => personalAgentEditorStore.rebaseDraft()}
                  >
                    ${eu("conflictRebase")}
                  </button>
                </div>
              </div>`
            : nothing}
          ${renderHubTabs({
            id: "personal-agent",
            active: this.activePanel,
            tabs,
            ariaLabel: eu("personalAgentSettings"),
            panelId: "personal-agent-panel",
            onSelect: (selectedPanel) => {
              this.activePanel = selectedPanel;
            },
          })}
          <div
            id="personal-agent-panel"
            class="settings-stack eu-personal-agent__panel"
            role="tabpanel"
            aria-labelledby=${`personal-agent-tab-${this.activePanel}`}
          >
            ${panel}
          </div>
        </div>
      `,
      { wide: true },
    );
    return renderSettingsWorkspace(content);
  }
}

if (!customElements.get("openclaw-user-personal-agent-page")) {
  customElements.define("openclaw-user-personal-agent-page", UserPersonalAgentPage);
}
