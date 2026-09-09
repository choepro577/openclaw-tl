/* @vitest-environment jsdom */

import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TaskSummary } from "../../../lib/tasks/task-summary.ts";
import { createTestTranscript } from "../chat-view.test-helpers.ts";
import type { BackgroundTasksProps } from "./chat-background-tasks.types.ts";
import { deriveSubagentActivity } from "./chat-subagent-activity.ts";
import { renderChatThread } from "./chat-thread.ts";
import {
  flushDeferredRowPrune,
  installTranscriptDomMocks,
  resetTranscriptTestDom,
  threadProps,
} from "./chat-transcript.test-support.ts";

function makeSubagentTask(sessionKey: string): TaskSummary {
  const now = Date.now();
  return {
    id: "hr-task",
    taskId: "hr-task",
    runtime: "subagent",
    status: "running",
    title: "HR specialist",
    agentId: "hr",
    sessionKey,
    childSessionKey: "agent:hr:subagent:child",
    runId: "run-hr",
    createdAt: now - 1_000,
    startedAt: now - 500,
    updatedAt: now,
    lastActivity: "Checking the employee directory",
  };
}

function makeBackgroundTasks(sessionKey: string, task: TaskSummary): BackgroundTasksProps {
  return {
    sessionKey,
    statusRowId: "chat-tasks-status-enterprise-test",
    subagentsOnly: true,
    collapsed: true,
    narrowLayout: false,
    connected: true,
    canCancel: false,
    loading: false,
    error: null,
    tasks: [task],
    activeCount: 1,
    subagentActivity: deriveSubagentActivity({
      tasks: [task],
      sessionKey,
      terminalObservedAtByTask: new Map(),
      canonicalizeSessionKey: (key) => key ?? "",
    }),
    taskDetails: new Map(),
    taskDetailErrors: new Map(),
    taskDetailLoadingIds: new Set(),
    cancellingTaskIds: new Set(),
    finishedCollapsed: false,
    onToggleCollapsed: () => {},
    onToggleFinished: () => {},
    onRefresh: () => {},
    onCancel: () => {},
  };
}

describe("Enterprise transcript subagent activity", () => {
  beforeEach(installTranscriptDomMocks);
  afterEach(resetTranscriptTestDom);

  it("keeps specialist activity visible while the coordinator run is working", async () => {
    const sessionKey = "agent:personal:dashboard:delegation";
    const task = makeSubagentTask(sessionKey);
    const transcript = createTestTranscript();
    const container = document.body.appendChild(document.createElement("div"));
    const props = {
      ...threadProps("enterprise-activity-pane", sessionKey, [
        { role: "user", content: "Ask HR", timestamp: 1_000 },
      ]),
      enterpriseUserPresentation: true,
      runWorking: true,
      showToolCalls: true,
      backgroundTasks: makeBackgroundTasks(sessionKey, task),
    };

    render(renderChatThread(props, transcript), container);
    transcript.hostConnected();
    transcript.hostUpdated();
    await flushDeferredRowPrune();

    expect(container.querySelector(".chat-delegation")).not.toBeNull();
    expect(container.textContent).toContain("HR specialist");
    expect(container.textContent).toContain("Checking the employee directory");
    expect(container.querySelector('[data-virtual-row-key="background-tasks"]')).toBeNull();
    expect(container.querySelector(".chat-subagent-activity")).toBeNull();
    transcript.hostDisconnected();
  });
});
