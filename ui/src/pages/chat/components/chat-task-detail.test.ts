import { html, render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GatewayBrowserClient } from "../../../api/gateway.ts";
import type { TaskSummary } from "../../../lib/tasks/task-summary.ts";
import type { ChatProps } from "../chat-view.ts";
import type { BackgroundTasksProps } from "./chat-background-tasks.types.ts";
import { deriveSubagentActivity } from "./chat-subagent-activity.ts";
import type { TaskDetailHost } from "./chat-task-detail-state.ts";
import { renderTaskDetailPanel } from "./chat-task-detail.ts";
import type { ChatTranscriptController } from "./chat-transcript-controller.ts";

function backgroundTasks(
  task: TaskSummary,
  overrides: Partial<BackgroundTasksProps> = {},
): BackgroundTasksProps {
  return {
    sessionKey: "agent:main:main",
    statusRowId: "chat-tasks-status-test",
    collapsed: false,
    narrowLayout: false,
    connected: true,
    canCancel: false,
    loading: false,
    error: null,
    tasks: [task],
    activeCount: task.status === "queued" || task.status === "running" ? 1 : 0,
    subagentActivity: deriveSubagentActivity({
      tasks: [],
      sessionKey: "agent:main:main",
      terminalObservedAtByTask: new Map(),
      canonicalizeSessionKey: (sessionKey) => sessionKey ?? "",
    }),
    taskDetails: new Map([[task.id, { ...task, prompt: "Inspect the current task." }]]),
    taskDetailErrors: new Map(),
    taskDetailLoadingIds: new Set(),
    cancellingTaskIds: new Set(),
    finishedCollapsed: false,
    onToggleCollapsed: () => undefined,
    onToggleFinished: () => undefined,
    onRefresh: () => undefined,
    onCancel: () => undefined,
    ...overrides,
  };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("task detail panel", () => {
  it("uses the inspector for the pane's canonical session and identifies the runtime", () => {
    const task: TaskSummary = {
      id: "task-cli",
      taskId: "task-cli",
      status: "completed",
      runtime: "cli",
      agentId: "main",
      title: "Current-session command",
      sessionKey: "agent:main:main",
      terminalSummary: "Command complete",
      createdAt: 1_000,
      updatedAt: 2_000,
    };
    const request = vi.fn();
    const host: TaskDetailHost = {
      sessionKey: "main",
      client: { request } as unknown as GatewayBrowserClient,
      connected: true,
      hello: null,
    };
    const container = document.createElement("div");
    document.body.append(container);

    render(
      html`${renderTaskDetailPanel({
        backgroundTasks: backgroundTasks(task),
        chat: { paneId: "pane-1" } as ChatProps,
        host,
        task,
        transcript: {} as ChatTranscriptController,
      })}`,
      container,
    );

    const panel = container.querySelector("[data-task-detail-panel]");
    expect(panel?.textContent).toContain("Current-session command");
    expect(panel?.textContent).toContain("CLI");
    expect(panel?.textContent).toContain("Inspect the current task.");
    expect(panel?.textContent).toContain("Command complete");
    expect(panel?.textContent).not.toContain("Loading task transcript");
    expect(request).not.toHaveBeenCalled();
  });

  it("never treats a subagent's requester session as its transcript", () => {
    const task: TaskSummary = {
      id: "task-queued-subagent",
      taskId: "task-queued-subagent",
      status: "queued",
      runtime: "subagent",
      agentId: "main",
      title: "Queued child work",
      // Requester is another conversation; no child session exists yet.
      sessionKey: "agent:main:other-session",
      createdAt: 1_000,
      updatedAt: 2_000,
    };
    const request = vi.fn();
    const host: TaskDetailHost = {
      sessionKey: "main",
      client: { request } as unknown as GatewayBrowserClient,
      connected: true,
      hello: null,
    };
    const container = document.createElement("div");
    document.body.append(container);

    render(
      html`${renderTaskDetailPanel({
        backgroundTasks: backgroundTasks(task),
        chat: { paneId: "pane-1" } as ChatProps,
        host,
        task,
        transcript: {} as ChatTranscriptController,
      })}`,
      container,
    );

    const panel = container.querySelector("[data-task-detail-panel]");
    expect(panel?.querySelector("[data-subagent-activity-feed]")).not.toBeNull();
    expect(panel?.textContent).toContain("No output yet.");
    expect(panel?.textContent).not.toContain("Inspect the current task.");
    expect(panel?.textContent).not.toContain("Loading task transcript");
    expect(request).not.toHaveBeenCalled();
  });

  it("renders requester-scoped Enterprise specialist work as an activity feed", () => {
    const task: TaskSummary = {
      id: "task-enterprise-specialist",
      taskId: "task-enterprise-specialist",
      status: "completed",
      runtime: "subagent",
      agentId: "finance-specialist",
      title: "Finance Specialist",
      sessionKey: "agent:personal:dashboard:requester",
      childSessionKey: "agent:finance-specialist:subagent:child",
      lastActivity: "Checking the payroll policy",
      lastToolName: "enterprise_knowledge_search",
      toolUseCount: 3,
      result: "Specialist result returned through the task ledger.",
      createdAt: 1_000,
      updatedAt: 2_000,
    };
    const request = vi.fn();
    const host: TaskDetailHost = {
      sessionKey: task.sessionKey ?? "",
      client: { request } as unknown as GatewayBrowserClient,
      connected: true,
      hello: null,
    };
    const container = document.createElement("div");
    document.body.append(container);

    render(
      html`${renderTaskDetailPanel({
        backgroundTasks: backgroundTasks(task, { subagentsOnly: true }),
        chat: { paneId: "pane-1", enterpriseUserPresentation: true } as ChatProps,
        host,
        task,
        transcript: {} as ChatTranscriptController,
      })}`,
      container,
    );

    const panel = container.querySelector("[data-task-detail-panel]");
    expect(panel?.querySelector("[data-subagent-activity-feed]")).not.toBeNull();
    expect(panel?.textContent).toContain("Checking the payroll policy");
    expect(panel?.textContent).toContain("Enterprise Knowledge Search");
    expect(panel?.textContent).toContain("Specialist result returned through the task ledger.");
    expect(panel?.textContent).not.toContain("Subagent");
    const tool = panel?.querySelector<HTMLDetailsElement>("[data-subagent-tool-disclosure]");
    expect(tool?.open).toBe(false);
    tool?.querySelector("summary")?.click();
    expect(tool?.open).toBe(true);
    expect(tool?.querySelector("[data-subagent-tool-detail]")?.textContent).toContain(
      "Checking the payroll policy",
    );
    expect(tool?.querySelector("[data-subagent-tool-detail]")?.textContent).toContain(
      "3 tool uses",
    );
    expect(panel?.textContent).not.toContain("Inspect the current task.");
    expect(request).not.toHaveBeenCalled();
  });

  it("renders every authorized child tool as its normal expandable row", () => {
    const task: TaskSummary = {
      id: "task-tools",
      status: "completed",
      runtime: "subagent",
      title: "HR Specialist",
      sessionKey: "agent:personal:dashboard:requester",
      childSessionKey: "agent:hr:subagent:child",
    };
    const toolMessages = [
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "read-1", name: "read", input: { path: "staff.csv" } }],
      },
      {
        role: "tool",
        name: "read",
        tool_call_id: "read-1",
        content: [{ type: "tool_result", id: "read-1", name: "read", text: "Nguyen Van A" }],
      },
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "search-1", name: "search", input: { query: "HRM" } }],
      },
      {
        role: "tool",
        name: "search",
        tool_call_id: "search-1",
        content: [{ type: "tool_result", id: "search-1", name: "search", text: "1 employee" }],
      },
    ];
    const expanded = new Set<string>();
    const host: TaskDetailHost = {
      sessionKey: task.sessionKey ?? "",
      client: null,
      connected: true,
      hello: null,
    };
    const container = document.body.appendChild(document.createElement("div"));
    const renderPanel = () =>
      render(
        html`${renderTaskDetailPanel({
          backgroundTasks: backgroundTasks(task, {
            taskToolMessages: new Map([[task.id, toolMessages]]),
            expandedTaskToolIds: expanded,
            onToggleTaskTool: (id) => expanded.add(id),
          }),
          chat: { paneId: "pane-tools", enterpriseUserPresentation: true } as ChatProps,
          host,
          task,
          transcript: {} as ChatTranscriptController,
        })}`,
        container,
      );

    renderPanel();
    const rows = container.querySelectorAll<HTMLButtonElement>(".chat-tool-row");
    expect(rows).toHaveLength(2);
    expect(container.textContent).toContain("staff.csv");
    expect(container.textContent).toContain("HRM");
    container.querySelector<HTMLButtonElement>(".chat-tool-row__toggle")?.click();
    renderPanel();

    expect(container.querySelectorAll(".chat-tool-msg-body")).toHaveLength(1);
    expect(container.textContent).toContain("Nguyen Van A");
  });

  it("shows a newly started tool before its transcript result arrives", () => {
    const task: TaskSummary = {
      id: "task-live-tool",
      status: "running",
      runtime: "subagent",
      title: "HR Specialist",
      sessionKey: "agent:personal:dashboard:requester",
      childSessionKey: "agent:hr:subagent:child",
      lastToolName: "search",
      toolUseCount: 2,
    };
    const completedToolMessages = [
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "read-1", name: "read", input: { path: "staff.csv" } }],
      },
      {
        role: "tool",
        name: "read",
        tool_call_id: "read-1",
        content: [{ type: "tool_result", id: "read-1", name: "read", text: "75 employees" }],
      },
    ];
    const container = document.body.appendChild(document.createElement("div"));

    render(
      html`${renderTaskDetailPanel({
        backgroundTasks: backgroundTasks(task, {
          taskToolMessages: new Map([[task.id, completedToolMessages]]),
        }),
        chat: { paneId: "pane-live-tool", enterpriseUserPresentation: true } as ChatProps,
        host: {
          sessionKey: task.sessionKey ?? "",
          client: null,
          connected: true,
          hello: null,
        },
        task,
        transcript: {} as ChatTranscriptController,
      })}`,
      container,
    );

    const rows = container.querySelectorAll(".chat-tool-row");
    expect(rows).toHaveLength(2);
    expect(rows[1]?.classList.contains("chat-tool-row--running")).toBe(true);
    expect(rows[1]?.textContent).toContain("Search");
  });

  it("renders every concurrently running tool as its own expandable row", () => {
    const task: TaskSummary = {
      id: "task-live-tools",
      status: "running",
      runtime: "subagent",
      title: "HR Specialist",
      sessionKey: "agent:personal:dashboard:requester",
      childSessionKey: "agent:hr:subagent:child",
      lastToolName: "search",
      toolUseCount: 2,
    };
    const toolMessages = [
      {
        role: "assistant",
        toolCallId: "read-live",
        content: [
          { type: "toolcall", id: "read-live", name: "read", arguments: { path: "staff.csv" } },
        ],
        __openclawToolStreamLive: true,
        __openclawToolStreamResultReceived: false,
      },
      {
        role: "assistant",
        toolCallId: "search-live",
        content: [
          { type: "toolcall", id: "search-live", name: "search", arguments: { query: "HRM" } },
        ],
        __openclawToolStreamLive: true,
        __openclawToolStreamResultReceived: false,
      },
    ];
    const expanded = new Set<string>();
    const container = document.body.appendChild(document.createElement("div"));
    const renderPanel = () =>
      render(
        html`${renderTaskDetailPanel({
          backgroundTasks: backgroundTasks(task, {
            taskToolMessages: new Map([[task.id, toolMessages]]),
            expandedTaskToolIds: expanded,
            onToggleTaskTool: (id) => expanded.add(id),
          }),
          chat: { paneId: "pane-live-tools", enterpriseUserPresentation: true } as ChatProps,
          host: { sessionKey: task.sessionKey ?? "", client: null, connected: true, hello: null },
          task,
          transcript: {} as ChatTranscriptController,
        })}`,
        container,
      );

    renderPanel();
    const rows = container.querySelectorAll<HTMLButtonElement>(".chat-tool-row");
    expect(rows).toHaveLength(2);
    expect(Array.from(rows).every((row) => row.classList.contains("chat-tool-row--running"))).toBe(
      true,
    );
    expect(container.textContent).toContain("staff.csv");
    expect(container.textContent).toContain("HRM");
    container.querySelector<HTMLButtonElement>(".chat-tool-row__toggle")?.click();
    renderPanel();
    expect(container.querySelectorAll(".chat-tool-msg-body")).toHaveLength(1);
  });
});
