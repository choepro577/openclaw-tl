import type { GatewaySessionRow } from "../../../api/types.ts";
import { resolveSessionDisplayName } from "../../../lib/session-display.ts";
import {
  readSessionDragData,
  sessionDragActive,
  writeSessionDragData,
} from "../../../lib/sessions/drag.ts";
import type { EnterpriseConversationProject } from "../services/user-enterprise-api.ts";

type EnterpriseUserConversationDragHost = {
  element: HTMLElement;
  getSessions(): readonly GatewaySessionRow[];
  getProjects(): readonly EnterpriseConversationProject[];
  getBusyKey(): string;
  getShowArchived(): boolean;
  getCollapsedProjects(): ReadonlySet<string>;
  setCollapsedProjects(projects: Set<string>): void;
  closeMenu(): void;
  moveToProject(
    row: GatewaySessionRow,
    projectId: string | null,
    beforeSessionKey?: string | null,
  ): Promise<void>;
  requestUpdate(): void;
};

export const RECENT_SESSION_DROP_TARGET = "recent";
// Hover expansion waits for intent so a collapsed target does not jump under a passing pointer.
const PROJECT_EXPANSION_DELAY_MS = 420;

export function enterpriseConversationTitle(row: GatewaySessionRow): string {
  return resolveSessionDisplayName(row.key, row);
}

/** Native OpenClaw session drag behavior plus a pointer fallback for buttons and touch input. */
export class EnterpriseUserConversationDragController {
  draggingSessionKey: string | null = null;
  sessionDropTarget: string | null = null;
  sessionDropBeforeKey: string | null = null;
  private pointerDrag:
    | {
        pointerId: number;
        sessionKey: string;
        startX: number;
        startY: number;
        active: boolean;
      }
    | undefined;
  private pointerDragPreview?: HTMLElement;
  private suppressNextConversationOpen = false;
  private pendingProjectExpansion?: {
    projectId: string;
    timeoutId: ReturnType<typeof globalThis.setTimeout>;
  };

  constructor(private readonly host: EnterpriseUserConversationDragHost) {}

  connect(): void {
    globalThis.addEventListener("pointermove", this.handleSessionPointerMove, { passive: false });
    globalThis.addEventListener("pointerup", this.handleSessionPointerUp);
    globalThis.addEventListener("pointercancel", this.handleSessionPointerCancel);
  }

  disconnect(): void {
    globalThis.removeEventListener("pointermove", this.handleSessionPointerMove);
    globalThis.removeEventListener("pointerup", this.handleSessionPointerUp);
    globalThis.removeEventListener("pointercancel", this.handleSessionPointerCancel);
    this.clearPointerSessionDrag();
    this.clearPendingProjectExpansion();
    document.body.classList.remove("eu-session-drag-active");
  }

  consumeSuppressedConversationOpen(): boolean {
    if (!this.suppressNextConversationOpen) {
      return false;
    }
    this.suppressNextConversationOpen = false;
    return true;
  }

  startSessionDrag(event: DragEvent, row: GatewaySessionRow): void {
    // If the pointer fallback already crossed its movement threshold, keep that single drag
    // lifecycle. Letting native HTML drag take over here would cancel its pending pointer drop.
    if (this.pointerDrag?.active) {
      event.preventDefault();
      return;
    }
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) {
      return;
    }
    this.clearPointerSessionDrag();
    writeSessionDragData(dataTransfer, row.key);
    this.setDraggingSessionKey(row.key);
    this.clearSessionDropTarget();
    this.host.closeMenu();
    document.body.classList.add("eu-session-drag-active");
    const preview = this.createSessionDragPreview(row, event.currentTarget as HTMLElement);
    dataTransfer.setDragImage(preview, 18, 20);
    globalThis.setTimeout(() => preview.remove(), 0);
  }

  startPointerSessionDrag(event: PointerEvent, row: GatewaySessionRow): void {
    const handle = event.currentTarget as HTMLElement;
    const touchOutsideHandle =
      event.pointerType !== "mouse" && !handle.classList.contains("eu-session-row__drag-handle");
    if (
      event.button !== 0 ||
      touchOutsideHandle ||
      this.host.getBusyKey() ||
      row.archived === true ||
      row.pinned === true
    ) {
      return;
    }
    this.pointerDrag = {
      pointerId: event.pointerId,
      sessionKey: row.key,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  }

  finishSessionDrag(): void {
    this.clearPointerSessionDrag();
    this.clearPendingProjectExpansion();
    document.body.classList.remove("eu-session-drag-active");
    this.setDraggingSessionKey(null);
    this.clearSessionDropTarget();
  }

  handleProjectDragOver(event: DragEvent, project: EnterpriseConversationProject): void {
    const sessionKey = this.draggingSessionKey;
    const beforeSessionKey = sessionKey
      ? this.beforeSessionKeyAtPoint(event.currentTarget as HTMLElement, event.clientY, sessionKey)
      : null;
    if (
      !sessionDragActive(event.dataTransfer) ||
      !sessionKey ||
      !this.projectAcceptsSession(project.id, beforeSessionKey)
    ) {
      if (this.sessionDropTarget === project.id) {
        this.clearSessionDropTarget();
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    this.activateProjectTarget(project.id, beforeSessionKey);
  }

  handleProjectDragLeave(event: DragEvent, projectId: string): void {
    const current = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && current.contains(event.relatedTarget)) {
      return;
    }
    if (this.sessionDropTarget === projectId) {
      this.clearSessionDropTarget();
    }
  }

  handleProjectDrop(event: DragEvent, project: EnterpriseConversationProject): void {
    const sessionKey = readSessionDragData(event.dataTransfer) ?? this.draggingSessionKey;
    const row = sessionKey
      ? this.host.getSessions().find((session) => session.key === sessionKey)
      : undefined;
    const beforeSessionKey = this.sessionDropBeforeKey;
    if (!row || !this.projectAcceptsSession(project.id, beforeSessionKey)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.finishSessionDrag();
    void this.host.moveToProject(row, project.id, beforeSessionKey);
  }

  handleRecentDragOver(event: DragEvent): void {
    if (!sessionDragActive(event.dataTransfer) || !this.recentAcceptsSession()) {
      if (this.sessionDropTarget === RECENT_SESSION_DROP_TARGET) {
        this.clearSessionDropTarget();
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    this.setSessionDropTarget(
      RECENT_SESSION_DROP_TARGET,
      this.predictedRecentBeforeSessionKey(this.draggingSessionKey),
    );
  }

  handleRecentDragLeave(event: DragEvent): void {
    const current = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && current.contains(event.relatedTarget)) {
      return;
    }
    if (this.sessionDropTarget === RECENT_SESSION_DROP_TARGET) {
      this.clearSessionDropTarget();
    }
  }

  handleRecentDrop(event: DragEvent): void {
    const sessionKey = readSessionDragData(event.dataTransfer) ?? this.draggingSessionKey;
    const row = sessionKey
      ? this.host.getSessions().find((session) => session.key === sessionKey)
      : undefined;
    if (!row || this.projectIdForSession(row.key) === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.finishSessionDrag();
    void this.host.moveToProject(row, null);
  }

  recentDropActive(): boolean {
    return this.sessionDropTarget === RECENT_SESSION_DROP_TARGET;
  }

  dropMarkerBefore(targetId: string, sessionKey: string): boolean {
    return this.sessionDropTarget === targetId && this.sessionDropBeforeKey === sessionKey;
  }

  dropMarkerAtEnd(targetId: string): boolean {
    return this.sessionDropTarget === targetId && this.sessionDropBeforeKey === null;
  }

  private createSessionDragPreview(row: GatewaySessionRow, source: HTMLElement): HTMLElement {
    const preview = document.createElement("div");
    preview.className = "eu-session-drag-preview";
    preview.setAttribute("aria-hidden", "true");
    preview.style.width = `${Math.min(Math.max(source.getBoundingClientRect().width, 190), 320)}px`;

    const icon = document.createElement("span");
    icon.className = "eu-session-drag-preview__icon";
    const label = document.createElement("span");
    label.className = "eu-session-drag-preview__label";
    label.textContent = enterpriseConversationTitle(row);
    preview.append(icon, label);
    document.body.append(preview);
    return preview;
  }

  private readonly handleSessionPointerMove = (event: PointerEvent) => {
    const pointerDrag = this.pointerDrag;
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) {
      return;
    }
    if (!pointerDrag.active && !this.activatePointerDrag(event, pointerDrag)) {
      return;
    }
    event.preventDefault();
    this.pointerDragPreview?.style.setProperty(
      "transform",
      `translate3d(${event.clientX + 12}px, ${event.clientY + 12}px, 0)`,
    );
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>(".eu-session-project, .eu-session-recent");
    const projectId = target?.dataset.projectId;
    if (target?.classList.contains("eu-session-recent") && this.recentAcceptsSession()) {
      this.setSessionDropTarget(
        RECENT_SESSION_DROP_TARGET,
        this.predictedRecentBeforeSessionKey(pointerDrag.sessionKey),
      );
    } else if (projectId) {
      const beforeSessionKey = this.beforeSessionKeyAtPoint(
        target,
        event.clientY,
        pointerDrag.sessionKey,
      );
      if (this.projectAcceptsSession(projectId, beforeSessionKey)) {
        this.activateProjectTarget(projectId, beforeSessionKey);
      } else {
        this.clearSessionDropTarget();
      }
    } else {
      this.clearSessionDropTarget();
    }
  };

  private activatePointerDrag(
    event: PointerEvent,
    pointerDrag: NonNullable<EnterpriseUserConversationDragController["pointerDrag"]>,
  ): boolean {
    const distance = Math.hypot(
      event.clientX - pointerDrag.startX,
      event.clientY - pointerDrag.startY,
    );
    if (distance < 6) {
      return false;
    }
    const row = this.host.getSessions().find((session) => session.key === pointerDrag.sessionKey);
    const source = this.host.element.querySelector<HTMLElement>(
      `.eu-session-row[data-session-key="${CSS.escape(pointerDrag.sessionKey)}"] .eu-session-row__open`,
    );
    if (!row || !source) {
      this.clearPointerSessionDrag();
      return false;
    }
    pointerDrag.active = true;
    this.setDraggingSessionKey(pointerDrag.sessionKey);
    this.host.closeMenu();
    document.body.classList.add("eu-session-drag-active");
    this.pointerDragPreview = this.createSessionDragPreview(row, source);
    this.pointerDragPreview.classList.add("eu-session-drag-preview--pointer");
    return true;
  }

  private readonly handleSessionPointerUp = (event: PointerEvent) => {
    const pointerDrag = this.pointerDrag;
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) {
      return;
    }
    const active = pointerDrag.active;
    const sessionKey = pointerDrag.sessionKey;
    const projectId = this.sessionDropTarget;
    const beforeSessionKey = this.sessionDropBeforeKey;
    const destinationProjectId = projectId === RECENT_SESSION_DROP_TARGET ? null : projectId;
    const shouldMove = Boolean(
      projectId &&
      (destinationProjectId === null ||
        this.placementChangesOrder(sessionKey, destinationProjectId, beforeSessionKey)),
    );
    if (active) {
      event.preventDefault();
      this.suppressNextConversationOpen = true;
      globalThis.setTimeout(() => {
        this.suppressNextConversationOpen = false;
      }, 0);
    }
    this.finishSessionDrag();
    if (!active || !projectId) {
      return;
    }
    const row = this.host.getSessions().find((session) => session.key === sessionKey);
    if (row && shouldMove) {
      void this.host.moveToProject(
        row,
        destinationProjectId,
        destinationProjectId === null ? undefined : beforeSessionKey,
      );
    }
  };

  private readonly handleSessionPointerCancel = (event: PointerEvent) => {
    if (this.pointerDrag?.pointerId === event.pointerId) {
      this.finishSessionDrag();
    }
  };

  private activateProjectTarget(projectId: string, beforeSessionKey: string | null): void {
    this.setSessionDropTarget(projectId, beforeSessionKey);
    if (!this.host.getCollapsedProjects().has(projectId)) {
      this.clearPendingProjectExpansion();
      return;
    }
    if (this.pendingProjectExpansion?.projectId === projectId) {
      return;
    }
    this.clearPendingProjectExpansion();
    const timeoutId = globalThis.setTimeout(() => {
      this.pendingProjectExpansion = undefined;
      if (this.sessionDropTarget !== projectId) {
        return;
      }
      const collapsed = new Set(this.host.getCollapsedProjects());
      collapsed.delete(projectId);
      this.host.setCollapsedProjects(collapsed);
    }, PROJECT_EXPANSION_DELAY_MS);
    this.pendingProjectExpansion = { projectId, timeoutId };
  }

  private projectAcceptsSession(projectId: string, beforeSessionKey: string | null): boolean {
    const sessionKey = this.draggingSessionKey;
    return Boolean(
      sessionKey &&
      !this.host.getShowArchived() &&
      !this.host.getBusyKey() &&
      this.placementChangesOrder(sessionKey, projectId, beforeSessionKey),
    );
  }

  private recentAcceptsSession(): boolean {
    const sessionKey = this.draggingSessionKey;
    return Boolean(
      sessionKey &&
      !this.host.getShowArchived() &&
      !this.host.getBusyKey() &&
      this.projectIdForSession(sessionKey) !== null,
    );
  }

  private beforeSessionKeyAtPoint(
    section: HTMLElement,
    clientY: number,
    draggingSessionKey: string,
  ): string | null {
    const rows = Array.from(section.querySelectorAll<HTMLElement>(".eu-session-row")).filter(
      (row) => row.dataset.sessionKey !== draggingSessionKey,
    );
    for (const row of rows) {
      const bounds = row.getBoundingClientRect();
      if (clientY < bounds.top + bounds.height / 2) {
        return row.dataset.sessionKey ?? null;
      }
    }
    return null;
  }

  private placementChangesOrder(
    sessionKey: string,
    projectId: string,
    beforeSessionKey: string | null,
  ): boolean {
    const project = this.host.getProjects().find((candidate) => candidate.id === projectId);
    if (!project) {
      return false;
    }
    const remaining = project.sessionKeys.filter((key) => key !== sessionKey);
    const insertionIndex =
      beforeSessionKey === null ? remaining.length : remaining.indexOf(beforeSessionKey);
    if (insertionIndex < 0) {
      return false;
    }
    const reordered = [...remaining];
    reordered.splice(insertionIndex, 0, sessionKey);
    return (
      reordered.length !== project.sessionKeys.length ||
      reordered.some((key, index) => key !== project.sessionKeys[index])
    );
  }

  private predictedRecentBeforeSessionKey(sessionKey: string | null): string | null {
    if (!sessionKey) {
      return null;
    }
    const assigned = new Set(this.host.getProjects().flatMap((project) => project.sessionKeys));
    assigned.delete(sessionKey);
    const projectedRecent = this.host
      .getSessions()
      .filter((session) => session.archived === true || session.pinned !== true)
      .filter((session) => !assigned.has(session.key));
    const index = projectedRecent.findIndex((session) => session.key === sessionKey);
    return index >= 0 ? (projectedRecent[index + 1]?.key ?? null) : null;
  }

  private projectIdForSession(sessionKey: string): string | null {
    return (
      this.host.getProjects().find((project) => project.sessionKeys.includes(sessionKey))?.id ??
      null
    );
  }

  private setDraggingSessionKey(sessionKey: string | null): void {
    if (this.draggingSessionKey === sessionKey) {
      return;
    }
    this.draggingSessionKey = sessionKey;
    this.host.requestUpdate();
  }

  private setSessionDropTarget(projectId: string, beforeSessionKey: string | null): void {
    if (this.sessionDropTarget === projectId && this.sessionDropBeforeKey === beforeSessionKey) {
      return;
    }
    if (this.pendingProjectExpansion?.projectId !== projectId) {
      this.clearPendingProjectExpansion();
    }
    this.sessionDropTarget = projectId;
    this.sessionDropBeforeKey = beforeSessionKey;
    this.host.requestUpdate();
  }

  private clearSessionDropTarget(): void {
    if (this.sessionDropTarget === null) {
      return;
    }
    this.clearPendingProjectExpansion();
    this.sessionDropTarget = null;
    this.sessionDropBeforeKey = null;
    this.host.requestUpdate();
  }

  private clearPendingProjectExpansion(): void {
    if (!this.pendingProjectExpansion) {
      return;
    }
    globalThis.clearTimeout(this.pendingProjectExpansion.timeoutId);
    this.pendingProjectExpansion = undefined;
  }

  private clearPointerSessionDrag(): void {
    this.pointerDrag = undefined;
    this.pointerDragPreview?.remove();
    this.pointerDragPreview = undefined;
  }
}
