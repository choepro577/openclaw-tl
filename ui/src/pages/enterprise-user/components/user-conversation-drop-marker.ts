import { html, nothing, type TemplateResult } from "lit";
import type { GatewaySessionRow } from "../../../api/types.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import type { EnterpriseUserConversationDragController } from "./user-conversation-drag-controller.ts";

function renderDropIndicator() {
  return html`<div
    class="eu-session-drop-indicator"
    role="status"
    aria-label=${eu("conversationDragHint")}
  ></div>`;
}

export function renderEnterpriseSessionRows(
  targetId: string,
  sessions: readonly GatewaySessionRow[],
  dragController: EnterpriseUserConversationDragController,
  renderSession: (session: GatewaySessionRow) => TemplateResult,
) {
  return html`<div class="eu-session-section__rows">
    ${sessions.map(
      (session) =>
        html`${dragController.dropMarkerBefore(targetId, session.key)
          ? renderDropIndicator()
          : nothing}${renderSession(session)}`,
    )}
    ${dragController.dropMarkerAtEnd(targetId) ? renderDropIndicator() : nothing}
  </div>`;
}
