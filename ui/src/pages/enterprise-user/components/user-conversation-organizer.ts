import { html, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { GatewaySessionRow } from "../../../api/types.ts";
import type { RouteId } from "../../../app-route-paths.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import { showConfirmDialog } from "../../../components/confirm-dialog.ts";
import { icons } from "../../../components/icons.ts";
import { showInputDialog } from "../../../components/input-dialog.ts";
import { renderSessionRunSpinner } from "../../../components/session-attention-presentation.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import {
  startHoverMarqueeFromEvent,
  stopHoverMarqueeFromEvent,
} from "../../../lib/hover-marquee.ts";
import { isSessionRunActive } from "../../../lib/session-run-state.ts";
import type {
  SessionListScope,
  SessionListSnapshot,
} from "../../../lib/sessions/session-capability.ts";
import { OpenClawLightDomContentsElement } from "../../../lit/openclaw-element.ts";
import {
  navigateToUserConversationSession,
  openUserAgentConversation,
} from "../adapters/chat-route-adapter.ts";
import {
  assignEnterpriseConversationProject,
  createEnterpriseConversationProject,
  deleteEnterpriseConversationProject,
  listEnterpriseConversationProjects,
  renameEnterpriseConversationProject,
  type EnterpriseConversationProject,
} from "../services/user-enterprise-api.ts";
import { userAgentCatalogStore } from "../state/user-agent-catalog-store.ts";
import {
  enterpriseConversationTitle,
  EnterpriseUserConversationDragController,
  RECENT_SESSION_DROP_TARGET,
} from "./user-conversation-drag-controller.ts";
import { renderEnterpriseSessionRows } from "./user-conversation-drop-marker.ts";
import { organizeEnterpriseUserSessions } from "./user-conversation-organization.ts";

const SESSION_PAGE_SIZE = 5;

export class EnterpriseUserConversationOrganizer extends OpenClawLightDomContentsElement {
  @property({ attribute: false }) context?: ApplicationContext<RouteId>;
  @property({ attribute: false }) onNavigate?: () => void;
  @state() private sessions: GatewaySessionRow[] = [];
  @state() private projects: EnterpriseConversationProject[] = [];
  @state() private loading = true;
  @state() private showArchived = false;
  @state() private projectsExpanded = true;
  @state() private recentExpanded = true;
  @state() private openMenu = "";
  @state() private collapsedProjects = new Set<string>();
  @state() private visibleSessionCounts: Record<string, number> = {};
  @state() private busyKey = "";
  @state() private error = "";
  private loadGeneration = 0;
  private unsubscribeAgentCatalog?: () => void;
  private unsubscribeSessions?: () => void;
  private subscribedSessions?: ApplicationContext<RouteId>["sessions"];
  private subscribedArchived?: boolean;
  private readonly dragController = new EnterpriseUserConversationDragController({
    element: this,
    getSessions: () => this.sessions,
    getProjects: () => this.projects,
    getBusyKey: () => this.busyKey,
    getShowArchived: () => this.showArchived,
    getCollapsedProjects: () => this.collapsedProjects,
    setCollapsedProjects: (projects) => {
      this.collapsedProjects = projects;
    },
    closeMenu: () => {
      this.openMenu = "";
    },
    moveToProject: (row, projectId, beforeSessionKey) =>
      this.moveToProject(row, projectId, beforeSessionKey),
    requestUpdate: () => this.requestUpdate(),
  });

  override connectedCallback(): void {
    super.connectedCallback();
    globalThis.addEventListener("pointerdown", this.handleOutsidePointerDown);
    globalThis.addEventListener("keydown", this.handleGlobalKeydown);
    this.dragController.connect();
    this.unsubscribeAgentCatalog = userAgentCatalogStore.subscribe(() => this.requestUpdate());
    void userAgentCatalogStore.load();
  }

  override disconnectedCallback(): void {
    globalThis.removeEventListener("pointerdown", this.handleOutsidePointerDown);
    globalThis.removeEventListener("keydown", this.handleGlobalKeydown);
    this.dragController.disconnect();
    this.unsubscribeAgentCatalog?.();
    this.unsubscribeAgentCatalog = undefined;
    this.unsubscribeSessions?.();
    this.unsubscribeSessions = undefined;
    this.subscribedSessions = undefined;
    this.loadGeneration += 1;
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("context") && changed.size > 0) {
      void this.load();
    }
  }

  private readonly handleOutsidePointerDown = (event: PointerEvent) => {
    if (!this.openMenu) {
      return;
    }
    const clickedOrganizerMenu = event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          (target.classList.contains("eu-session-actions") ||
            target.classList.contains("eu-session-actions__trigger")),
      );
    if (!clickedOrganizerMenu) {
      this.openMenu = "";
    }
  };

  private readonly handleGlobalKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.openMenu) {
      this.openMenu = "";
    }
  };

  private async load(): Promise<void> {
    const context = this.context;
    if (!context) {
      return;
    }
    const generation = ++this.loadGeneration;
    this.loading = this.sessions.length === 0 && this.projects.length === 0;
    this.error = "";
    const scope = this.sessionListScope();
    this.subscribeSessionList(context, scope);
    try {
      const [, projects] = await Promise.all([
        context.sessions.refreshList({ ...scope, force: true }),
        listEnterpriseConversationProjects(),
      ]);
      if (generation !== this.loadGeneration) {
        return;
      }
      this.projects = projects;
    } catch (error) {
      if (generation === this.loadGeneration) {
        this.error = error instanceof Error ? error.message : eu("conversationLoadFailed");
      }
    } finally {
      if (generation === this.loadGeneration) {
        this.loading = false;
      }
    }
  }

  private sessionListScope(): SessionListScope {
    return {
      limit: 100,
      includeGlobal: true,
      includeUnknown: false,
      includeDerivedTitles: true,
      includeLastMessage: false,
      archivedFilter: this.showArchived ? "archived" : "active",
    };
  }

  private subscribeSessionList(
    context: ApplicationContext<RouteId>,
    scope: SessionListScope,
  ): void {
    if (
      this.subscribedSessions === context.sessions &&
      this.subscribedArchived === this.showArchived
    ) {
      return;
    }
    this.unsubscribeSessions?.();
    this.subscribedSessions = context.sessions;
    this.subscribedArchived = this.showArchived;
    const archived = this.showArchived;
    const apply = (snapshot: SessionListSnapshot) => {
      if (context !== this.context || archived !== this.showArchived) {
        return;
      }
      this.sessions = snapshot.result?.sessions ?? [];
      if (snapshot.error) {
        this.error = snapshot.error;
      }
    };
    this.unsubscribeSessions = context.sessions.subscribeList(scope, apply);
    apply(context.sessions.listSnapshot(scope));
  }

  private openConversation(row: GatewaySessionRow): void {
    if (this.dragController.consumeSuppressedConversationOpen()) {
      return;
    }
    if (!this.context) {
      return;
    }
    this.openMenu = "";
    navigateToUserConversationSession(this.context, row.key);
    this.onNavigate?.();
  }

  private toggleMenu(key: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.openMenu = this.openMenu === key ? "" : key;
  }

  private async runMutation(key: string, mutation: () => Promise<void>): Promise<void> {
    this.openMenu = "";
    this.busyKey = key;
    this.error = "";
    try {
      await mutation();
      await this.load();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("conversationUpdateFailed");
    } finally {
      this.busyKey = "";
    }
  }

  private async createProject(): Promise<void> {
    await showInputDialog({
      title: eu("projectCreate"),
      label: eu("projectName"),
      requireValue: true,
      submit: async (name) => {
        try {
          await createEnterpriseConversationProject(name);
          await this.load();
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : eu("projectSaveFailed");
        }
      },
    });
  }

  private async renameProject(project: EnterpriseConversationProject): Promise<void> {
    this.openMenu = "";
    await showInputDialog({
      title: eu("projectRename"),
      label: eu("projectName"),
      defaultValue: project.name,
      requireValue: true,
      requireChange: true,
      submit: async (name) => {
        try {
          await renameEnterpriseConversationProject(project.id, name);
          await this.load();
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : eu("projectSaveFailed");
        }
      },
    });
  }

  private async removeProject(project: EnterpriseConversationProject): Promise<void> {
    this.openMenu = "";
    const confirmed = await showConfirmDialog({
      title: eu("deleteNamed", { name: project.name }),
      message: eu("projectDeleteConfirm"),
      confirmLabel: eu("delete"),
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await this.runMutation(`project:${project.id}`, async () => {
      await deleteEnterpriseConversationProject(project.id);
    });
  }

  private async createProjectConversation(project: EnterpriseConversationProject): Promise<void> {
    const context = this.context;
    const agentKey = userAgentCatalogStore.activeKey;
    if (!context || !agentKey || this.busyKey) {
      return;
    }
    const busyKey = `project-create:${project.id}`;
    this.busyKey = busyKey;
    this.openMenu = "";
    this.error = "";
    try {
      await openUserAgentConversation(context, agentKey, "new", { projectId: project.id });
      await this.load();
      this.onNavigate?.();
    } catch (error) {
      this.error = error instanceof Error ? error.message : eu("conversationCreateFailed");
    } finally {
      this.busyKey = "";
    }
  }

  private async renameConversation(row: GatewaySessionRow): Promise<void> {
    this.openMenu = "";
    await showInputDialog({
      title: eu("conversationRename"),
      label: eu("conversationName"),
      defaultValue: row.displayName ?? row.label ?? "",
      requireValue: true,
      requireChange: true,
      submit: async (name) => {
        const result = await this.context?.sessions.patch(row.key, { label: name });
        if (!result) {
          return this.context?.sessions.state.error ?? eu("conversationRenameFailed");
        }
        await this.load();
        return null;
      },
    });
  }

  private togglePin(row: GatewaySessionRow): Promise<void> {
    return this.runMutation(`session:${row.key}`, async () => {
      const result = await this.context?.sessions.patch(row.key, { pinned: row.pinned !== true });
      if (!result) {
        throw new Error(this.context?.sessions.state.error ?? eu("conversationUpdateFailed"));
      }
    });
  }

  private toggleArchive(row: GatewaySessionRow): Promise<void> {
    return this.runMutation(`session:${row.key}`, async () => {
      if (!row.sessionId) {
        throw new Error(eu("conversationUpdateFailed"));
      }
      const result = await this.context?.sessions.patch(
        row.key,
        { archived: row.archived !== true },
        { expectedSessionId: row.sessionId },
      );
      if (!result) {
        throw new Error(this.context?.sessions.state.error ?? eu("conversationUpdateFailed"));
      }
    });
  }

  private async moveToProject(
    row: GatewaySessionRow,
    projectId: string | null,
    beforeSessionKey?: string | null,
  ): Promise<void> {
    const previousProjects = this.projects;
    this.openMenu = "";
    this.busyKey = `session:${row.key}`;
    this.error = "";
    this.projects = this.projects.map((project) => {
      const remaining = project.sessionKeys.filter((key) => key !== row.key);
      if (project.id !== projectId) {
        return { ...project, sessionKeys: remaining };
      }
      const insertionIndex =
        beforeSessionKey === undefined
          ? 0
          : beforeSessionKey === null
            ? remaining.length
            : remaining.indexOf(beforeSessionKey);
      const sessionKeys = [...remaining];
      sessionKeys.splice(Math.max(0, insertionIndex), 0, row.key);
      return { ...project, sessionKeys };
    });
    try {
      await assignEnterpriseConversationProject(row.key, projectId, beforeSessionKey);
      await this.load();
    } catch (error) {
      this.projects = previousProjects;
      this.error = error instanceof Error ? error.message : eu("conversationUpdateFailed");
    } finally {
      this.busyKey = "";
    }
  }

  private async removeConversation(row: GatewaySessionRow): Promise<void> {
    this.openMenu = "";
    const confirmed = await showConfirmDialog({
      title: eu("conversationDelete"),
      message: eu("conversationDeleteConfirm"),
      confirmLabel: eu("delete"),
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await this.runMutation(`session:${row.key}`, async () => {
      if (!row.sessionId) {
        throw new Error(eu("conversationUpdateFailed"));
      }
      const result = await this.context?.sessions.delete(row.key, {
        expectedSessionId: row.sessionId,
        deleteTranscript: true,
      });
      if (!result?.deleted) {
        throw new Error(this.context?.sessions.state.error ?? eu("conversationUpdateFailed"));
      }
      await assignEnterpriseConversationProject(row.key, null);
    });
  }

  private renderSessionActions(row: GatewaySessionRow, running: boolean) {
    const key = `session:${row.key}`;
    const archived = row.archived === true;
    return html`
      <div class="eu-session-actions">
        <button
          type="button"
          class="eu-session-actions__trigger"
          title=${eu("conversationActions")}
          aria-label=${eu("conversationActions")}
          aria-expanded=${String(this.openMenu === key)}
          ?disabled=${this.busyKey === key}
          @click=${(event: MouseEvent) => this.toggleMenu(key, event)}
        >
          ${icons.moreHorizontal}
        </button>
        ${running ? renderSessionRunSpinner(false) : nothing}
        ${this.openMenu === key
          ? html`<div class="eu-session-actions__menu" role="menu">
              ${archived
                ? nothing
                : this.actionButton(
                    row.pinned === true ? icons.pinOff : icons.pin,
                    row.pinned === true ? eu("unpin") : eu("pin"),
                    () => void this.togglePin(row),
                  )}
              ${this.actionButton(
                icons.pencil,
                eu("conversationRename"),
                () => void this.renameConversation(row),
              )}
              <div class="eu-session-actions__label">${eu("moveToProject")}</div>
              ${this.actionButton(
                icons.messageSquare,
                eu("noProject"),
                () => void this.moveToProject(row, null),
              )}
              ${this.projects.map((project) =>
                this.actionButton(
                  icons.folder,
                  project.name,
                  () => void this.moveToProject(row, project.id),
                ),
              )}
              <div class="eu-session-actions__separator" role="separator"></div>
              ${this.actionButton(
                archived ? icons.archiveRestore : icons.archive,
                archived ? eu("restore") : eu("archive"),
                () => void this.toggleArchive(row),
              )}
              ${this.actionButton(
                icons.trash,
                eu("delete"),
                () => void this.removeConversation(row),
                true,
              )}
            </div>`
          : nothing}
      </div>
    `;
  }

  private actionButton(icon: unknown, label: string, action: () => void, danger = false) {
    return html`<button
      type="button"
      role="menuitem"
      class="eu-session-actions__item ${danger ? "eu-session-actions__item--danger" : ""}"
      @click=${action}
    >
      <span aria-hidden="true">${icon}</span><span>${label}</span>
    </button>`;
  }

  private renderSession(row: GatewaySessionRow) {
    const title = enterpriseConversationTitle(row);
    const active = this.context?.gateway.snapshot.sessionKey === row.key;
    const running = row.archived !== true && isSessionRunActive(row);
    const menuOpen = this.openMenu === `session:${row.key}`;
    const draggable =
      row.archived !== true && row.pinned !== true && this.projects.length > 0 && !this.busyKey;
    return html`<div
      class="eu-session-row ${active ? "eu-session-row--active" : ""} ${row.archived
        ? "eu-session-row--archived"
        : ""} ${running ? "eu-session-row--running" : ""} ${menuOpen
        ? "eu-session-row--menu-open"
        : ""} ${draggable ? "eu-session-row--draggable" : ""} ${this.dragController
        .draggingSessionKey === row.key
        ? "eu-session-row--dragging"
        : ""}"
      data-session-key=${row.key}
      @mouseenter=${startHoverMarqueeFromEvent}
      @mouseleave=${stopHoverMarqueeFromEvent}
    >
      <button
        type="button"
        class="eu-session-row__open"
        title=${title}
        draggable=${draggable ? "true" : "false"}
        @pointerdown=${draggable
          ? (event: PointerEvent) => this.dragController.startPointerSessionDrag(event, row)
          : nothing}
        @dragstart=${draggable
          ? (event: DragEvent) => this.dragController.startSessionDrag(event, row)
          : nothing}
        @dragend=${draggable ? () => this.dragController.finishSessionDrag() : nothing}
        @click=${() => this.openConversation(row)}
      >
        <span class="eu-session-title-marquee hover-marquee" data-hover-marquee-mode="codex">
          <span class="eu-session-title-marquee__clip">
            <span class="eu-session-title-marquee__track">
              <span class="eu-session-title-marquee__content" data-hover-marquee-content dir="auto"
                >${title}</span
              >
            </span>
          </span>
        </span>
      </button>
      ${this.renderSessionActions(row, running)}
    </div>`;
  }

  private renderSessionRows(targetId: string, sessions: readonly GatewaySessionRow[]) {
    const key = `${this.showArchived ? "archived" : "active"}:${targetId}`;
    const visibleCount = this.visibleSessionCounts[key] ?? SESSION_PAGE_SIZE;
    return html`
      ${renderEnterpriseSessionRows(
        targetId,
        sessions.slice(0, visibleCount),
        this.dragController,
        (session) => this.renderSession(session),
      )}
      ${sessions.length > visibleCount
        ? html`<button
            type="button"
            class="eu-session-show-more"
            @click=${() => {
              this.visibleSessionCounts = {
                ...this.visibleSessionCounts,
                [key]: visibleCount + SESSION_PAGE_SIZE,
              };
            }}
          >
            ${eu("conversationShowMore")}
          </button>`
        : nothing}
    `;
  }

  private toggleProject(projectId: string): void {
    const collapsed = new Set(this.collapsedProjects);
    if (collapsed.has(projectId)) {
      collapsed.delete(projectId);
    } else {
      collapsed.add(projectId);
    }
    this.collapsedProjects = collapsed;
  }

  private renderProjectSection(
    project: EnterpriseConversationProject,
    sessions: readonly GatewaySessionRow[],
  ) {
    const menuKey = `project:${project.id}`;
    const collapsed = this.collapsedProjects.has(project.id);
    const dropTarget = this.dragController.sessionDropTarget === project.id;
    return html`<section
      class="eu-session-section eu-session-project ${dropTarget
        ? "eu-session-project--session-drop"
        : ""}"
      data-project-id=${project.id}
      @dragover=${(event: DragEvent) => this.dragController.handleProjectDragOver(event, project)}
      @dragleave=${(event: DragEvent) =>
        this.dragController.handleProjectDragLeave(event, project.id)}
      @drop=${(event: DragEvent) => this.dragController.handleProjectDrop(event, project)}
    >
      <div
        class="eu-session-section__header ${this.openMenu === menuKey
          ? "eu-session-section__header--menu-open"
          : ""}"
      >
        <button
          type="button"
          class="eu-session-section__toggle"
          aria-expanded=${String(!collapsed)}
          @click=${() => this.toggleProject(project.id)}
        >
          <span class="eu-session-section__folder-icon" aria-hidden="true"
            >${collapsed && !dropTarget ? icons.folder : icons.folderOpen}</span
          >
          <span class="eu-session-section__name">${project.name}</span>
        </button>
        <button
          type="button"
          class="eu-session-actions__trigger"
          title=${eu("projectConversationCreate", { name: project.name })}
          aria-label=${eu("projectConversationCreate", { name: project.name })}
          ?disabled=${Boolean(this.busyKey) || !userAgentCatalogStore.activeKey}
          @click=${(event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            void this.createProjectConversation(project);
          }}
        >
          ${icons.plus}
        </button>
        <div class="eu-session-actions">
          <button
            type="button"
            class="eu-session-actions__trigger"
            title=${eu("projectActions")}
            aria-label=${eu("projectActions")}
            aria-expanded=${String(this.openMenu === menuKey)}
            @click=${(event: MouseEvent) => this.toggleMenu(menuKey, event)}
          >
            ${icons.moreHorizontal}
          </button>
          ${this.openMenu === menuKey
            ? html`<div class="eu-session-actions__menu" role="menu">
                ${this.actionButton(
                  icons.pencil,
                  eu("projectRename"),
                  () => void this.renameProject(project),
                )}
                ${this.actionButton(
                  icons.trash,
                  eu("projectDelete"),
                  () => void this.removeProject(project),
                  true,
                )}
              </div>`
            : nothing}
        </div>
      </div>
      ${collapsed && !dropTarget ? nothing : this.renderSessionRows(project.id, sessions)}
    </section>`;
  }

  private renderNamedSection(label: string, sessions: readonly GatewaySessionRow[]) {
    if (!sessions.length) {
      return nothing;
    }
    return html`<section class="eu-session-section">
      <div class="eu-session-section__label">
        <span>${label}</span><span class="eu-session-section__count">${sessions.length}</span>
      </div>
      ${this.renderSessionRows("pinned", sessions)}
    </section>`;
  }

  private renderRecentSection(sessions: readonly GatewaySessionRow[]) {
    if (!sessions.length && !this.projects.length) {
      return nothing;
    }
    const dropTarget = this.dragController.recentDropActive();
    return html`<section
      class="eu-session-section eu-session-recent ${dropTarget
        ? "eu-session-recent--session-drop"
        : ""}"
      @dragover=${(event: DragEvent) => this.dragController.handleRecentDragOver(event)}
      @dragleave=${(event: DragEvent) => this.dragController.handleRecentDragLeave(event)}
      @drop=${(event: DragEvent) => this.dragController.handleRecentDrop(event)}
    >
      <button
        type="button"
        class="eu-session-section__label eu-session-heading-toggle"
        aria-expanded=${String(this.recentExpanded)}
        @click=${() => {
          this.recentExpanded = !this.recentExpanded;
        }}
      >
        <span class="eu-session-heading-toggle__label">
          ${this.showArchived ? eu("archived") : eu("recent")}
          ${this.recentExpanded
            ? nothing
            : html`<span aria-hidden="true">${icons.chevronRight}</span>`}
        </span>
        <span class="eu-session-section__count">${sessions.length}</span>
      </button>
      ${this.recentExpanded
        ? this.renderSessionRows(RECENT_SESSION_DROP_TARGET, sessions)
        : nothing}
    </section>`;
  }

  override render() {
    const organized = organizeEnterpriseUserSessions(this.sessions, this.projects);
    return html`<div class="eu-session-organizer" aria-label=${eu("conversationOrganizer")}>
      <div class="eu-session-organizer__toolbar">
        <button
          type="button"
          class="eu-session-heading-toggle"
          aria-expanded=${String(this.projectsExpanded)}
          @click=${() => {
            this.projectsExpanded = !this.projectsExpanded;
          }}
        >
          <span class="eu-session-heading-toggle__label">
            ${eu("projects")}
            ${this.projectsExpanded
              ? nothing
              : html`<span aria-hidden="true">${icons.chevronRight}</span>`}
          </span>
        </button>
        <div>
          <button
            type="button"
            title=${eu("projectCreate")}
            aria-label=${eu("projectCreate")}
            @click=${() => void this.createProject()}
          >
            ${icons.plus}
          </button>
        </div>
      </div>
      ${this.error
        ? html`<div class="eu-session-organizer__error" role="alert">${this.error}</div>`
        : nothing}
      ${this.loading
        ? html`<div class="eu-session-organizer__loading" role="status">${eu("loading")}</div>`
        : html`
            ${this.renderNamedSection(eu("pinned"), organized.pinned)}
            ${this.projectsExpanded
              ? organized.projects.map(({ project, sessions }) =>
                  this.renderProjectSection(project, sessions),
                )
              : nothing}
            ${this.renderRecentSection(organized.recent)}
            ${!organized.pinned.length && !organized.projects.length && !organized.recent.length
              ? html`<div class="eu-session-section__empty">${eu("conversationEmpty")}</div>`
              : nothing}
          `}
    </div>`;
  }
}

if (!customElements.get("openclaw-enterprise-user-conversation-organizer")) {
  customElements.define(
    "openclaw-enterprise-user-conversation-organizer",
    EnterpriseUserConversationOrganizer,
  );
}
