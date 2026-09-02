import { html, nothing } from "lit";
import type {
  ProgressCard,
  SessionObserverDigest,
} from "../../../../packages/gateway-protocol/src/index.js";
import type { GatewaySessionRow } from "../../api/types.ts";
import { isDesktopPanelAvailable } from "../../app/app-shell-chrome.ts";
import { ChatPaneBrowserAnnotationRender } from "./chat-pane-browser-annotation-render.ts";
import {
  availableSidebarSlots,
  sidebarPanelActions,
  sidebarPanelDefinitions,
  sidebarPanelTemplates,
} from "./chat-pane-embedded-panels.ts";
import type { ResolvedBoardView } from "./chat-pane-shared.ts";
import { renderSidebarRegion, sidebarRegionCallbacks } from "./chat-pane-sidebar-layout.ts";
import type { ChatPageHost } from "./chat-state-host.ts";
import { renderChat, type ChatProps } from "./chat-view.ts";
import { renderBackgroundTasksRail } from "./components/chat-background-tasks-render.ts";
import type { BackgroundTasksProps } from "./components/chat-background-tasks.types.ts";
import { detailSlotOpen, renderChatDetailSlot } from "./components/chat-detail-slot.ts";
import { renderChatImageLightbox } from "./components/chat-image-lightbox.ts";
import {
  renderSessionWorkspaceRail,
  type SessionWorkspaceProps,
} from "./components/chat-session-workspace.ts";
import {
  SIDEBAR_NARROW_BREAKPOINT_PX,
  isSidebarSlotVisible,
  retainSidebarSlots,
  type SidebarLayout,
  type SidebarSlotId,
} from "./sidebar-layout.ts";

const ENTERPRISE_USER_SIDEBAR_SLOTS = [
  "detail",
  "workspace",
  "browser",
] as const satisfies readonly SidebarSlotId[];
const ENTERPRISE_USER_SIDEBAR_SLOT_SET: ReadonlySet<SidebarSlotId> = new Set(
  ENTERPRISE_USER_SIDEBAR_SLOTS,
);

type ChatPaneLayoutRenderParams = {
  state: ChatPageHost;
  selectedSession: GatewaySessionRow | undefined;
  currentAgentId: string;
  board: ResolvedBoardView;
  sidebarLayout: SidebarLayout;
  progressCardInRail: boolean;
  onDismissProgressCard?: (card: ProgressCard) => void;
  sessionWorkspace: SessionWorkspaceProps;
  backgroundTasks: BackgroundTasksProps;
  chatProps: ChatProps;
  observerDigest: SessionObserverDigest | null;
  observerRunId: string | null;
  catalog: boolean;
  agentWorkspace: string | undefined;
  workspaceGit: boolean;
  openPanelSlot: (slot: SidebarSlotId) => void;
  closePanelSlot: (slot: SidebarSlotId) => void;
};

export abstract class ChatPaneLayoutRender extends ChatPaneBrowserAnnotationRender {
  protected renderChatPaneLayout(params: ChatPaneLayoutRenderParams) {
    const {
      state,
      selectedSession,
      currentAgentId,
      board,
      sidebarLayout,
      progressCardInRail,
      onDismissProgressCard,
      sessionWorkspace,
      backgroundTasks,
      chatProps,
      observerDigest,
      observerRunId,
      catalog,
      agentWorkspace,
      workspaceGit,
      openPanelSlot,
      closePanelSlot,
    } = params;
    const enterpriseUserPresentation = this.context.presentation === "enterprise-user";
    const renderedSidebarLayout = enterpriseUserPresentation
      ? retainSidebarSlots(sidebarLayout, ENTERPRISE_USER_SIDEBAR_SLOTS)
      : sidebarLayout;
    const header = this.renderPaneHeader(
      sessionWorkspace,
      backgroundTasks,
      selectedSession,
      catalog,
      agentWorkspace,
      workspaceGit,
      renderedSidebarLayout,
    );
    const chat = renderChat({
      ...chatProps,
      header: board.face === "dashboard" ? nothing : header,
    });
    // Keep this root stable across board face changes so the guarded board runtime
    // remains connected while Chat is active.
    const primary = html`<div class="chat-pane-primary-column">
      ${board.face === "dashboard" ? header : nothing}${this.renderBoardPrimary(board, chat)}
    </div>`;
    const discussion = enterpriseUserPresentation
      ? null
      : this.buildSessionDiscussionPanel(state, state.sessionKey.trim());
    const desktopAvailable = isDesktopPanelAvailable(this.context.gateway.snapshot);
    const companionThread = this.sessionCompanionThreads.view(state.sessionKey, currentAgentId);
    const browserPresented =
      this.active && this.presented && isSidebarSlotVisible(renderedSidebarLayout, "browser");
    const desktopPresented =
      this.active && this.presented && isSidebarSlotVisible(renderedSidebarLayout, "desktop");
    const desktopRefreshOnPresentation = !this.pendingPanelToggleRequests.has("desktop");
    const unrestrictedPanelDefinitions = sidebarPanelDefinitions({
      state,
      themeMode: this.context.theme.resolvedMode,
      agentId: currentAgentId,
      browserPresented,
      desktopPresented,
      desktopRefreshOnPresentation,
      desktopAvailable,
      hasBoard: board.hasBoard,
      chat,
      workspace: renderSessionWorkspaceRail(sessionWorkspace, { embedded: true }),
      tasks: renderBackgroundTasksRail(backgroundTasks, { embedded: true }),
      detailOpen:
        this.presented &&
        renderedSidebarLayout.open === true &&
        detailSlotOpen(renderedSidebarLayout),
      renderDetail: (content) =>
        renderChatDetailSlot({
          backgroundTasks,
          chat: chatProps,
          content,
          host: state,
          layout: renderedSidebarLayout,
          transcript: this.taskSidebarTranscript,
        }),
      digest: observerDigest,
      activeRunId: observerRunId,
      startedAt: selectedSession?.startedAt ?? state.chatStreamStartedAt ?? undefined,
      lastReadAt: selectedSession?.lastReadAt,
      pullRequests: this.sessionPullRequests,
      progressCard: progressCardInRail ? this.progressCard.card : null,
      onDismissProgressCard,
      companion: companionThread,
      onCompanionSubmit: (question) => void this.submitSessionCompanionQuestion(question),
      onCompanionDraftChange: (draft) =>
        this.sessionCompanionThreads.setDraft(state.sessionKey, draft, currentAgentId),
      onCompanionVisibilityChange: this.setSessionObserverVisibility,
      connected: state.connected,
      pendingQuestion: companionThread.pendingQuestion,
      onClearCompanion: () => void this.clearSessionCompanion(),
      discussion,
      discussionOpenUrl: discussion?.openUrl ?? null,
      discussionSourceGeneration: this.connectionGeneration,
    });
    const panelDefinitions = enterpriseUserPresentation
      ? unrestrictedPanelDefinitions.filter((definition) =>
          ENTERPRISE_USER_SIDEBAR_SLOT_SET.has(definition.slot),
        )
      : unrestrictedPanelDefinitions;
    const availableSlots = availableSidebarSlots(panelDefinitions);
    const panelTemplates = sidebarPanelTemplates(panelDefinitions);
    const panelActions = sidebarPanelActions(panelDefinitions);
    const content = renderSidebarRegion({
      availableWidth: this.paneWidth,
      availableSlots,
      callbacks: sidebarRegionCallbacks({
        state,
        closePanelSlot,
        openPanelSlot,
        hideBoard: () => this.handleBoardDockChange("hidden"),
        forgetDiscussionUrl: () => this.sessionDiscussionOpenUrls.delete(state.sessionKey.trim()),
        resizePanel: (columnId, size) =>
          this.commitSidebarPanelResize(renderedSidebarLayout, columnId, size),
        setPanelOpen: (open) => this.setChatSidePanelOpen(open, renderedSidebarLayout),
      }),
      layout: renderedSidebarLayout,
      panelDefinitions,
      panelActions,
      narrow: this.paneWidth < SIDEBAR_NARROW_BREAKPOINT_PX,
      panelTemplates,
      primary,
      requestUpdate: state.requestUpdate!,
    });
    return html`${content}${renderChatImageLightbox(
      state.imageLightbox,
      state.handleCloseImage,
    )}${this.renderResetConfirmation()}`;
  }
}
