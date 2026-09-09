/* @vitest-environment jsdom */
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { MessageGroup, ToolCard } from "../../../lib/chat/chat-types.ts";
import type { TaskSummary } from "../../../lib/tasks/task-summary.ts";
import {
  delegationPresentation,
  delegationSummary,
  renderDelegationCard,
  renderDelegationTaskCard,
} from "./chat-delegation-card.ts";
import { renderActivityGroup } from "./chat-message-group.ts";
import { renderToolCard } from "./chat-tool-cards.ts";

const sessionKey = "agent:personal:dashboard:own";
function card(overrides: Partial<ToolCard> = {}): ToolCard {
  return {
    id: "call",
    name: "enterprise_delegate",
    completed: true,
    args: { decisionId: "PRIVATE-DECISION-TOKEN" },
    details: {
      outcome: "delegated",
      delegates: [
        { agent: { id: "hr", name: "HR Specialist" }, runId: "run-1", status: "accepted" },
      ],
    },
    ...overrides,
  };
}
function task(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "task",
    taskId: "task",
    runtime: "subagent",
    sessionKey,
    agentId: "hr",
    runId: "run-1",
    status: "running",
    ...overrides,
  };
}

describe("Enterprise delegation lifecycle card", () => {
  it("normalizes the canonical assignments envelope and hydrates its exact child task", () => {
    const native = card({
      details: undefined,
      outputText: JSON.stringify({
        status: "accepted",
        assignments: [{ agentName: "HR Specialist", status: "accepted", runId: "native-run" }],
        acceptedSessionSpawns: [
          {
            runId: "native-run",
            childSessionKey: "agent:hr:subagent:native-child",
          },
        ],
      }),
    });
    const nativeTask = task({
      runId: "native-run",
      childSessionKey: "agent:hr:subagent:native-child",
      status: "completed",
      deliveryStatus: "delivered",
    });
    const model = delegationPresentation(native, {
      sessionKey,
      delegationTasks: [nativeTask],
    });

    expect(model.delegates).toMatchObject([
      {
        name: "HR Specialist",
        agentId: "hr",
        runId: "native-run",
        childSessionKey: "agent:hr:subagent:native-child",
        state: "completed",
        task: nativeTask,
      },
    ]);
    expect(model.delegates).toHaveLength(1);
    expect(model.delegates[0]?.delivered).toBe(true);
  });

  it("uses the exact child session and does not invent completion without task data", () => {
    const native = card({
      details: undefined,
      outputText: JSON.stringify({
        status: "accepted",
        assignments: [{ agentName: "HR Specialist", status: "accepted", runId: "native-run" }],
        acceptedSessionSpawns: [
          { runId: "native-run", childSessionKey: "agent:hr:subagent:native-child" },
        ],
      }),
    });
    const foreignTask = task({
      runId: "native-run",
      childSessionKey: "agent:hr:subagent:foreign-child",
      status: "completed",
      deliveryStatus: "delivered",
    });

    const mismatched = delegationPresentation(native, {
      sessionKey,
      delegationTasks: [foreignTask],
    }).delegates[0];
    expect(mismatched).toMatchObject({
      agentId: undefined,
      childSessionKey: "agent:hr:subagent:native-child",
      state: "assigned",
    });
    expect(mismatched?.task).toBeUndefined();

    const withoutTasks = delegationPresentation(native).delegates[0];
    expect(withoutTasks).toMatchObject({
      agentId: undefined,
      runId: "native-run",
      childSessionKey: "agent:hr:subagent:native-child",
      state: "assigned",
    });
  });

  it("shows an internal correction without exposing the one-time token or pretending work started", () => {
    const container = document.createElement("div");
    render(
      renderDelegationCard(
        card({
          details: undefined,
          outputText: JSON.stringify({
            status: "retry_required",
            instruction: "Use PRIVATE-DECISION-TOKEN",
          }),
        }),
      ),
      container,
    );
    expect(container.textContent).toContain("Handoff refreshed for this message");
    expect(container.innerHTML).not.toContain("PRIVATE-DECISION-TOKEN");
    expect(container.textContent).not.toContain("Task handed to specialist");
  });

  it("shows a pending confirmation instead of an unavailable handoff", () => {
    const container = document.createElement("div");
    render(
      renderDelegationCard(
        card({
          details: { status: "clarify", instruction: "Ask the user for confirmation" },
          outputText: JSON.stringify({ status: "clarify" }),
        }),
      ),
      container,
    );

    expect(container.textContent).toContain("Waiting for your confirmation");
    expect(container.textContent).not.toContain("Handoff status is unavailable");
  });

  it("identifies local routing without presenting it as an unavailable handoff", () => {
    const local = card({
      details: { status: "local", instruction: "Handle the request locally" },
      outputText: undefined,
    });
    expect(delegationPresentation(local).local).toBe(true);
    expect(delegationPresentation(local).delegates).toHaveLength(0);

    const container = document.createElement("div");
    render(renderDelegationCard(local), container);
    expect(container.textContent).toContain("Handled locally; no specialist was assigned");
    expect(container.textContent).not.toContain("Handoff status is unavailable");
    expect(container.textContent).not.toContain("Handle the request locally");

    const historical = card({
      details: undefined,
      outputText: JSON.stringify({ status: "local" }),
    });
    expect(delegationSummary(historical)).toBe("Handled locally; no specialist was assigned");
  });

  it("does not mistake accepted handoff for completed child work", () => {
    expect(delegationPresentation(card()).delegates[0]?.state).toBe("assigned");
    const container = document.createElement("div");
    render(
      renderToolCard(card(), { expanded: true, onToggleExpanded: () => {}, sessionKey }),
      container,
    );
    expect(container.textContent).toContain("HR Specialist");
    expect(container.textContent).toContain("1 working");
    expect(container.textContent).not.toContain("Specialist completed");
    expect(container.innerHTML).not.toContain("PRIVATE-DECISION-TOKEN");
    expect(container.innerHTML).not.toContain("decisionId");
  });

  it("opens the Subagents list even before the delegated task hydrates", () => {
    const onOpenSubagents = vi.fn();
    const container = document.createElement("div");
    render(renderDelegationCard(card(), { onOpenSubagents }), container);

    const row = container.querySelector<HTMLButtonElement>("button.chat-delegation__row");
    expect(row?.getAttribute("aria-label")).toBe("Show subagents");
    row?.click();
    expect(onOpenSubagents).toHaveBeenCalledOnce();
  });

  it.each(["queued", "running", "completed", "failed", "cancelled", "timed_out"] as const)(
    "renders authoritative %s state",
    (status) => {
      const container = document.createElement("div");
      render(
        renderDelegationCard(card(), {
          sessionKey,
          delegationTasks: [task({ status, deliveryStatus: "delivered" })],
        }),
        container,
      );
      const expectedState =
        status === "completed"
          ? "reported"
          : ["failed", "cancelled", "timed_out"].includes(status)
            ? "failed"
            : "working";
      expect(container.querySelector(".chat-delegation__row")?.getAttribute("data-state")).toBe(
        expectedState,
      );
      expect(container.textContent?.includes("1 reported")).toBe(status === "completed");
    },
  );

  it("rejects task matches from another session, Agent, run, or runtime", () => {
    for (const override of [
      { sessionKey: "foreign" },
      { agentId: "foreign" },
      { runId: "other" },
      { runtime: "cron" },
    ]) {
      expect(
        delegationPresentation(card(), {
          sessionKey,
          delegationTasks: [task({ status: "completed", ...override })],
        }).delegates[0]?.state,
      ).toBe("assigned");
    }
  });

  it("shows partial success and delivery failure separately", () => {
    const mixed = card({
      details: {
        delegates: [
          { agent: { id: "hr", name: "HR Specialist" }, runId: "run-1", status: "accepted" },
          {
            agent: { id: "finance", name: "Finance Specialist" },
            status: "error",
            reason: "INTERNAL-SECRET",
          },
        ],
      },
    });
    const model = delegationPresentation(mixed, {
      sessionKey,
      delegationTasks: [task({ status: "completed", deliveryStatus: "failed" })],
    });
    expect(model.delegates.map((row) => row.state)).toEqual(["completed", "blocked"]);
    expect(model.delegates[0]?.deliveryFailed).toBe(true);
    const container = document.createElement("div");
    render(
      renderDelegationCard(mixed, {
        sessionKey,
        delegationTasks: [task({ status: "completed", deliveryStatus: "failed" })],
      }),
      container,
    );
    expect(container.textContent).toContain("2 failed");
    expect(container.textContent).not.toContain("INTERNAL-SECRET");
  });

  it("escapes metadata and uses bounded historical public envelopes without raw payload", () => {
    const container = document.createElement("div");
    const historical = card({
      details: undefined,
      outputText: JSON.stringify({
        delegates: [
          { agent: { id: "hr", name: "<img src=x onerror=alert(1)>" }, status: "accepted" },
        ],
      }),
    });
    render(renderDelegationCard(historical), container);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img");
    for (const outputText of ["bad json PRIVATE", "x".repeat(32_001)]) {
      render(renderDelegationCard(card({ details: undefined, outputText })), container);
      expect(container.textContent).toContain("completion is not confirmed");
      expect(container.textContent).not.toContain("PRIVATE");
    }
  });

  it("collapses managed activity by default and expands it on request", () => {
    const container = document.createElement("div");
    const messages = [
      {
        key: "delegate",
        message: {
          role: "toolResult",
          toolName: "enterprise_delegate",
          toolCallId: "call",
          details: card().details,
          content: [{ type: "text", text: JSON.stringify(card().details) }],
        },
      },
      {
        key: "yield",
        message: {
          role: "toolResult",
          toolName: "sessions_yield",
          toolCallId: "yield",
          content: [{ type: "text", text: "PRIVATE-YIELD" }],
        },
      },
    ];
    const group: MessageGroup = {
      key: "group",
      kind: "group",
      role: "tool",
      messages,
      timestamp: 0,
      isStreaming: false,
    };
    render(
      renderActivityGroup([group], {
        showReasoning: false,
        sessionKey,
        delegationTasks: [task({ status: "completed", deliveryStatus: "delivered" })],
        isToolMessageExpanded: () => true,
      }),
      container,
    );
    expect(container.querySelector("[aria-expanded]")?.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("HR Specialist");
    expect(container.textContent).toContain("1 reported");
    expect(container.textContent).not.toContain("sessions_yield");
    expect(container.textContent).not.toContain("PRIVATE-YIELD");
  });

  it("renders one bounded batch row with counts and no lifecycle checklist", () => {
    const tasks = Array.from({ length: 6 }, (_, index) =>
      task({
        id: `task-${index}`,
        taskId: `task-${index}`,
        agentId: `agent-${index}`,
        runId: `run-${index}`,
        title: `Specialist ${index}`,
        status: index < 2 ? "running" : index < 4 ? "completed" : "failed",
        deliveryStatus: index < 2 ? "pending" : index < 4 ? "delivered" : "not_applicable",
      }),
    );
    const container = document.createElement("div");
    render(renderDelegationTaskCard(tasks), container);

    expect(container.querySelectorAll(".chat-delegation")).toHaveLength(1);
    expect(container.querySelector(".chat-delegation__icons")?.children).toHaveLength(3);
    expect(container.querySelector(".chat-delegation__steps")).toBeNull();
    expect(container.querySelector("details")).toBeNull();
    expect(container.textContent).toContain("+1 agents");
    expect(container.textContent).toContain("2 working");
    expect(container.textContent).toContain("2 reported");
    expect(container.textContent).toContain("2 failed");
  });
});
