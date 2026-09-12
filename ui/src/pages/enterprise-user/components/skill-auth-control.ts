import { html, nothing, render } from "lit";
import { icons } from "../../../components/icons.ts";
import "../../../components/modal-dialog.ts";
import { renderSensitiveInput } from "../../../components/sensitive-input.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { formatUiError } from "../../../lib/format-error.ts";
import { isEnterpriseUiActive } from "../../enterprise/state/enterprise-ui-access.ts";
import {
  disconnectEnterpriseSkill,
  loginEnterpriseSkill,
} from "../services/user-enterprise-api.ts";

export type EnterpriseSkillAuthRequest = {
  requestId: string;
  parentSessionKey: string;
  taskId?: string;
  agentId: string;
  skillKey: string;
  fields: Array<{ id: string; label: string; type: "text" | "password" }>;
  expiresAt: string;
};

const prompted = new Set<string>();
let activeDialog: string | undefined;

function displayName(skillKey: string): string {
  return skillKey
    .replace(/-skill$/u, "")
    .split(/[-_]/u)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function showSkillLogin(
  request: EnterpriseSkillAuthRequest,
  requestUpdate: () => void,
  onResolved?: (request: EnterpriseSkillAuthRequest) => void,
): Promise<void> {
  if (activeDialog) {
    return Promise.resolve();
  }
  activeDialog = request.requestId;
  const host = document.createElement("div");
  document.body.append(host);
  return new Promise<void>((resolve) => {
    const values: Record<string, string> = {};
    const revealed = new Set<string>();
    let submitting = false;
    let failure: string | null = null;
    const remainingMs = Math.max(0, Date.parse(request.expiresAt) - Date.now());
    let expiryTimer = 0;
    const finish = () => {
      window.clearTimeout(expiryTimer);
      render(nothing, host);
      host.remove();
      onResolved?.(request);
      requestUpdate();
      resolve();
    };
    expiryTimer = window.setTimeout(finish, remainingMs);
    const blocked = () => request.fields.some((field) => !values[field.id]?.trim());
    const handleCancel = async (event?: Event) => {
      if (submitting) {
        event?.preventDefault();
        return;
      }
      submitting = true;
      paint();
      try {
        await disconnectEnterpriseSkill(
          request.parentSessionKey,
          request.skillKey,
          request.requestId,
        );
      } finally {
        finish();
      }
    };
    const handleSubmit = async (event: Event) => {
      event.preventDefault();
      if (submitting || blocked()) {
        return;
      }
      submitting = true;
      failure = null;
      paint();
      try {
        await loginEnterpriseSkill(
          request.parentSessionKey,
          request.skillKey,
          values,
          request.requestId,
        );
      } catch (error) {
        submitting = false;
        failure = formatUiError(error);
        paint();
        return;
      }
      finish();
    };
    const updateValue = (fieldId: string, value: string) => {
      const wasBlocked = blocked();
      values[fieldId] = value;
      if (wasBlocked !== blocked()) {
        paint();
      }
    };
    function paint() {
      const name = displayName(request.skillKey);
      render(
        html`
          <openclaw-modal-dialog
            label="${eu("login")} ${name}"
            description="Thông tin được gửi thẳng tới Gateway và không đi qua nội dung chat."
            @modal-cancel=${handleCancel}
          >
            <form class="exec-approval-card" autocomplete="off" @submit=${handleSubmit}>
              <div class="exec-approval-header">
                <div class="exec-approval-title">${eu("login")} ${name}</div>
              </div>
              ${request.fields.map(
                (field, index) => html`
                  <label class="field input-dialog__field">
                    <span>${field.label}</span>
                    ${field.type === "password"
                      ? renderSensitiveInput({
                          id: `skill-auth-${field.id}`,
                          name: field.id,
                          value: values[field.id] ?? "",
                          revealed: revealed.has(field.id),
                          revealLabel: eu("showPassword"),
                          hideLabel: eu("hidePassword"),
                          autocomplete: "current-password",
                          required: true,
                          disabled: submitting,
                          ariaInvalid: failure ? "true" : "false",
                          autofocus: index === 0,
                          onInput: (value) => updateValue(field.id, value),
                          onToggle: () => {
                            if (revealed.has(field.id)) {
                              revealed.delete(field.id);
                            } else {
                              revealed.add(field.id);
                            }
                            paint();
                          },
                        })
                      : html`<input
                          name=${field.id}
                          type="text"
                          spellcheck="false"
                          required
                          .value=${values[field.id] ?? ""}
                          ?disabled=${submitting}
                          aria-invalid=${failure ? "true" : nothing}
                          ?autofocus=${index === 0}
                          @input=${(event: Event) =>
                            updateValue(
                              field.id,
                              event.currentTarget instanceof HTMLInputElement
                                ? event.currentTarget.value
                                : "",
                            )}
                        />`}
                  </label>
                `,
              )}
              ${failure
                ? html`<div class="exec-approval-error" role="alert">${failure}</div>`
                : nothing}
              <div class="exec-approval-actions">
                <button type="submit" class="btn primary" ?disabled=${submitting || blocked()}>
                  ${eu("login")}
                </button>
                <button type="button" class="btn" ?disabled=${submitting} @click=${handleCancel}>
                  ${eu("cancel")}
                </button>
              </div>
            </form>
          </openclaw-modal-dialog>
        `,
        host,
      );
    }
    paint();
  }).finally(() => {
    activeDialog = undefined;
  });
}

export function renderSkillAuthControl(
  request: EnterpriseSkillAuthRequest | undefined,
  requestUpdate: () => void,
  onResolved?: (request: EnterpriseSkillAuthRequest) => void,
) {
  if (!isEnterpriseUiActive() || !request) {
    return nothing;
  }
  if (!prompted.has(request.requestId) && !activeDialog) {
    prompted.add(request.requestId);
    queueMicrotask(() => void showSkillLogin(request, requestUpdate, onResolved));
  }
  const name = displayName(request.skillKey);
  return html`
    <button
      type="button"
      class="agent-chat__input-btn"
      aria-label="${eu("login")} ${name}"
      title="${eu("login")} ${name}"
      @click=${() => void showSkillLogin(request, requestUpdate, onResolved)}
    >
      ${icons.key}<span>${name}</span>
    </button>
  `;
}
