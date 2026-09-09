import type { TaskSummary } from "../../../lib/tasks/task-summary.ts";
import type { SubagentActivityPresentation } from "./chat-subagent-activity.ts";

export type BackgroundTasksProps = {
  sessionKey: string;
  statusRowId: string;
  /** Enterprise uses the shared task ledger as a read-only Subagents panel. */
  subagentsOnly?: boolean;
  collapsed: boolean;
  /** Narrow panes move the rail to a bottom strip. */
  narrowLayout: boolean;
  connected: boolean;
  canCancel: boolean;
  loading: boolean;
  error: string | null;
  tasks: TaskSummary[] | null;
  activeCount: number;
  subagentActivity: SubagentActivityPresentation;
  openTaskId?: string;
  taskDetails: ReadonlyMap<string, TaskSummary>;
  taskToolMessages?: ReadonlyMap<string, unknown[]>;
  taskDetailErrors: ReadonlyMap<string, string>;
  taskDetailLoadingIds: ReadonlySet<string>;
  expandedTaskToolIds?: ReadonlySet<string>;
  cancellingTaskIds: ReadonlySet<string>;
  finishedCollapsed: boolean;
  onToggleCollapsed: () => void;
  /** Opens the Subagents list without selecting a child task. */
  onOpenList?: () => void;
  onToggleFinished: () => void;
  onRefresh: () => void;
  onCancel: (taskId: string) => void;
  onLoadDetail?: (task: TaskSummary) => void;
  onOpenTaskDetail?: (task: TaskSummary) => void;
  onToggleTaskTool?: (id: string) => void;
};
