import { isDesktopPanelAvailable } from "../../app/app-shell-chrome.ts";
import type { TaskSummary } from "../../lib/tasks/task-summary.ts";
import type { ChatPageHost } from "./chat-state-host.ts";
import { createBackgroundTasksProps } from "./components/chat-background-tasks.ts";
import { openTaskDetailId } from "./components/chat-detail-slot.ts";
import { createSessionWorkspaceProps } from "./components/chat-session-workspace.ts";
import {
  SIDEBAR_NARROW_BREAKPOINT_PX,
  closeSlot,
  isSidebarSlotVisible,
  openSlot,
  type SidebarSlotId,
} from "./sidebar-layout.ts";

type ChatPaneSidebarLayout = Parameters<typeof isSidebarSlotVisible>[0];
type ChatPaneGatewaySnapshot = Parameters<typeof isDesktopPanelAvailable>[0];

/** Builds the two rail models and their shared sidebar slot controls. */
export function createChatPaneRails(params: {
  state: ChatPageHost;
  sidebarLayout: ChatPaneSidebarLayout;
  paneWidth: number;
  presentationId: string;
  presented: boolean;
  gatewaySnapshot: ChatPaneGatewaySnapshot;
  setObserverVisibility: (visible: boolean) => void;
  workspaceEnabled?: boolean;
  backgroundTasksEnabled?: boolean;
  subagentsOnly?: boolean;
  taskDetailsInTasksSlot?: boolean;
}) {
  const { state, sidebarLayout } = params;
  const hasPanelSlot = (slot: SidebarSlotId) =>
    sidebarLayout.columns[0]?.panels.some((panel) => panel.slot === slot) === true;
  const openPanelSlot = (slot: SidebarSlotId) => {
    state.updateSidebarLayout(openSlot(state.sidebarLayout, slot));
    if (slot === "companion") {
      params.setObserverVisibility(true);
    }
  };
  const closePanelSlot = (slot: SidebarSlotId) => {
    if (slot === "companion") {
      params.setObserverVisibility(false);
    }
    if (
      slot === "tasks" &&
      params.taskDetailsInTasksSlot &&
      state.sidebarContent?.kind === "task"
    ) {
      state.sidebarContent = null;
    }
    state.updateSidebarLayout(closeSlot(state.sidebarLayout, slot));
  };
  const togglePanelSlot = (slot: SidebarSlotId) =>
    hasPanelSlot(slot) ? closePanelSlot(slot) : openPanelSlot(slot);
  const sessionWorkspaceBase = createSessionWorkspaceProps(state, {
    draftScope: params.presentationId,
    expanded: hasPanelSlot("workspace"),
    narrowLayout: false,
    presented: params.presented && params.workspaceEnabled !== false,
  });
  const sessionWorkspace = {
    ...sessionWorkspaceBase,
    collapsed: !hasPanelSlot("workspace"),
    narrowLayout: false,
    onToggleCollapsed: () => togglePanelSlot("workspace"),
    onToggleTerminal: state.terminalAvailable ? () => togglePanelSlot("terminal") : undefined,
    onToggleBrowser: state.browserPanelAvailable ? () => togglePanelSlot("browser") : undefined,
    onToggleDesktop: isDesktopPanelAvailable(params.gatewaySnapshot)
      ? () => togglePanelSlot("desktop")
      : undefined,
  };
  const selectedTaskId = params.taskDetailsInTasksSlot
    ? state.sidebarContent?.kind === "task" && isSidebarSlotVisible(sidebarLayout, "tasks")
      ? state.sidebarContent.taskId
      : undefined
    : openTaskDetailId(state.sidebarContent, sidebarLayout);
  const onOpenTaskDetail = (task: TaskSummary) => {
    if (params.taskDetailsInTasksSlot) {
      state.sidebarContent = { kind: "task", taskId: task.id };
      state.updateSidebarLayout(openSlot(state.sidebarLayout, "tasks"));
      return;
    }
    state.handleOpenSidebar({ kind: "task", taskId: task.id });
  };
  const backgroundTasksBase = createBackgroundTasksProps(state, {
    narrowLayout: false,
    openTaskId: selectedTaskId,
    onOpenTaskDetail,
    presented: params.presented && params.backgroundTasksEnabled !== false,
    subagentsOnly: params.subagentsOnly,
  });
  // A retained pane can keep sidebarContent while a session switch or
  // reconnect replaces the task snapshot. Do not reopen a stale task detail
  // until this session's bounded list contains the selected id again.
  const openTaskId =
    params.taskDetailsInTasksSlot && selectedTaskId !== undefined
      ? backgroundTasksBase.tasks?.some((task) => task.id === selectedTaskId)
        ? selectedTaskId
        : undefined
      : selectedTaskId;
  const backgroundTasks = {
    ...backgroundTasksBase,
    collapsed: params.taskDetailsInTasksSlot
      ? !isSidebarSlotVisible(sidebarLayout, "tasks")
      : !hasPanelSlot("tasks"),
    narrowLayout: false,
    onToggleCollapsed: () => {
      if (params.taskDetailsInTasksSlot) {
        if (isSidebarSlotVisible(state.sidebarLayout, "tasks")) {
          closePanelSlot("tasks");
        } else {
          openPanelSlot("tasks");
        }
        return;
      }
      togglePanelSlot("tasks");
    },
    onOpenList:
      params.subagentsOnly === true
        ? () => {
            if (params.taskDetailsInTasksSlot && state.sidebarContent?.kind === "task") {
              state.sidebarContent = null;
            }
            openPanelSlot("tasks");
          }
        : undefined,
  };
  const progressCardInRail =
    params.paneWidth >= SIDEBAR_NARROW_BREAKPOINT_PX &&
    isSidebarSlotVisible(sidebarLayout, "companion");
  return {
    backgroundTasks,
    closePanelSlot,
    openPanelSlot,
    progressCardInRail,
    sessionWorkspace,
  };
}
