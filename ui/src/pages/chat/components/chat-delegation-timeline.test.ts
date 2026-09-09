/* @vitest-environment jsdom */
import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskSummary } from "../../../lib/tasks/task-summary.ts";
import { createTestTranscript } from "../chat-view.test-helpers.ts";
import { renderChatThread } from "./chat-thread.ts";
import {
  flushDeferredRowPrune,
  installTranscriptDomMocks,
  resetTranscriptTestDom,
  threadProps,
} from "./chat-transcript.test-support.ts";

const sessionKey = "agent:personal:dashboard:handoffs";
const messages = [
  { role: "user", content: "Please check the budget.", timestamp: 1_000 },
  {
    role: "assistant",
    content: "The work has been handed over.",
    timestamp: 2_000,
    provider: "openclaw",
    api: "openclaw-transcript",
    model: "host-response",
    __openclaw: { runId: "parent-one" },
  },
  { role: "user", content: "And the contract?", timestamp: 3_000 },
  {
    role: "assistant",
    content: "I will return with the results.",
    timestamp: 4_000,
    provider: "openclaw",
    api: "openclaw-transcript",
    model: "host-response",
    __openclaw: { runId: "parent-two" },
  },
];
function task(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "finance-task",
    taskId: overrides.id ?? "finance-task",
    runtime: "subagent",
    sessionKey,
    agentId: "finance",
    childSessionKey: "agent:finance:subagent:one",
    runId: "child-one",
    title: "Finance Specialist",
    createdAt: 1_900,
    status: "running",
    ...overrides,
  };
}

describe("Enterprise task timeline without model tool calls", () => {
  beforeEach(installTranscriptDomMocks);
  afterEach(resetTranscriptTestDom);

  async function mount(
    tasks: TaskSummary[],
    history: unknown[] = messages,
    onOpenSubagents = vi.fn(),
  ) {
    const transcript = createTestTranscript();
    const container = document.body.appendChild(document.createElement("div"));
    const props = {
      ...threadProps("handoff-timeline", sessionKey, history),
      enterpriseUserPresentation: true,
      showToolCalls: true,
      delegationTasks: tasks,
      backgroundTasks: { onOpenList: onOpenSubagents } as never,
    };
    const update = (delegationTasks: TaskSummary[]) => {
      render(renderChatThread({ ...props, delegationTasks }, transcript), container);
      transcript.hostUpdated();
    };
    update(tasks);
    transcript.hostConnected();
    await flushDeferredRowPrune();
    return { container, onOpenSubagents, update, transcript };
  }

  it("restores cards at recorded task chronology and updates delivery without changing messages", async () => {
    const finance = task();
    const contract = task({
      id: "contract-task",
      agentId: "contract",
      runId: "child-two",
      childSessionKey: "agent:contract:subagent:two",
      title: "Contract Specialist",
      createdAt: new Date(3_900).toISOString(),
    });
    const { container, update, transcript } = await mount([contract, finance]);
    expect(container.querySelectorAll(".chat-delegation")).toHaveLength(2);
    expect(container.textContent).toMatch(
      /check the budget[\s\S]*Finance Specialist[\s\S]*And the contract[\s\S]*Contract Specialist/,
    );
    expect(container.textContent).toContain("1 working");
    expect(container.querySelector(".chat-delegation__steps")).toBeNull();
    update([{ ...finance, status: "completed" }, contract]);
    expect(container.textContent).toContain("1 reporting");
    expect(container.textContent).not.toContain("1 reported");
    update([{ ...finance, status: "completed", deliveryStatus: "delivered" }, contract]);
    expect(container.textContent).toContain("1 reported");
    expect(container.querySelectorAll(".chat-delegation")).toHaveLength(2);
    expect(container.querySelector('[data-virtual-row-key="background-tasks"]')).toBeNull();
    transcript.hostDisconnected();
  });

  it("places a collapsed specialist before the answer when it started inside the parent frame", async () => {
    const history = [
      messages[0],
      {
        role: "assistant",
        content: "Reviewing the request.",
        timestamp: 1_500,
        stopReason: "toolUse",
        __openclaw: { runId: "parent-one" },
      },
      {
        role: "assistant",
        content: "Here is the final analysis.",
        timestamp: 2_500,
        stopReason: "stop",
        __openclaw: { runId: "parent-one" },
      },
    ];
    const { container, transcript } = await mount(
      [task({ status: "completed", deliveryStatus: "delivered" })],
      history,
    );
    expect(container.textContent).toMatch(
      /check the budget[\s\S]*Finance Specialist[\s\S]*Here is the final analysis/,
    );
    expect(container.querySelector(".chat-delegation__row")?.getAttribute("data-state")).toBe(
      "reported",
    );
    expect(container.querySelectorAll(".chat-delegation")).toHaveLength(1);
    transcript.hostDisconnected();
  });

  it("opens the Subagents list from every visible lifecycle step", async () => {
    const finance = task({ status: "completed", deliveryStatus: "delivered" });
    const contract = task({
      id: "contract-task",
      agentId: "contract",
      runId: "child-two",
      childSessionKey: "agent:contract:subagent:two",
      title: "Contract Specialist",
      createdAt: 3_900,
      status: "completed",
      deliveryStatus: "delivered",
    });
    const { container, onOpenSubagents, transcript } = await mount([finance, contract]);
    const financeRows = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        'button[aria-label="Show subagents"][data-subagent-task-id="finance-task"]',
      ),
    );
    expect(financeRows).toHaveLength(1);
    financeRows[0]?.click();
    expect(onOpenSubagents).toHaveBeenCalledTimes(1);
    transcript.hostDisconnected();
  });

  it("does not manufacture handoffs from narration or misattribute unrelated task records", async () => {
    const { container, transcript } = await mount([
      task({ sessionKey: "foreign" }),
      task({ runtime: "cron" }),
      task({ createdAt: undefined }),
      task({ createdAt: 500 }),
      task({ childSessionKey: undefined }),
    ]);
    expect(container.querySelector(".chat-delegation")).toBeNull();
    expect(container.textContent).toContain("The work has been handed over");
    transcript.hostDisconnected();
  });

  it("shows one verified native handoff before its answer and expands only on request", async () => {
    const nativeResult = {
      status: "accepted",
      assignments: [{ agentName: "Finance Specialist", status: "accepted", runId: "child-one" }],
      acceptedSessionSpawns: [
        { runId: "child-one", childSessionKey: "agent:finance:subagent:one" },
      ],
    };
    const history = [
      messages[0],
      {
        role: "assistant",
        timestamp: 1_500,
        stopReason: "toolUse",
        __openclaw: { runId: "parent-one" },
        content: [
          {
            type: "toolCall",
            id: "native",
            name: "enterprise_delegate",
            arguments: { assignments: [] },
          },
        ],
      },
      {
        role: "toolResult",
        timestamp: 2_000,
        toolName: "enterprise_delegate",
        toolCallId: "native",
        __openclaw: { runId: "parent-one" },
        content: [{ type: "text", text: JSON.stringify(nativeResult) }],
      },
      {
        role: "assistant",
        timestamp: 2_500,
        stopReason: "stop",
        __openclaw: { runId: "parent-one" },
        content: "Here is the final analysis.",
      },
    ];
    const completedTask = task({ status: "completed", deliveryStatus: "delivered" });
    const { container, transcript, update } = await mount([completedTask], history);
    expect(container.textContent).not.toContain("Handoff status is unavailable");
    expect(container.querySelectorAll(".chat-group--delegation")).toHaveLength(0);
    const summary = container.querySelector<HTMLButtonElement>(".chat-activity-group__summary");
    expect(summary?.textContent).toContain("Finance Specialist");
    expect(summary?.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).toMatch(/Finance Specialist[\s\S]*Here is the final analysis/);
    summary?.click();
    update([completedTask]);
    await flushDeferredRowPrune();
    expect(container.querySelectorAll(".chat-delegation__row")).toHaveLength(1);
    expect(container.textContent).toContain("1 reported");
    transcript.hostDisconnected();
  });

  it("keeps a single legacy tool card when its child also appears in tasks", async () => {
    const legacy = {
      role: "toolResult",
      content: [
        {
          type: "text",
          text: JSON.stringify({
            delegates: [
              {
                agent: { id: "finance", name: "Finance Specialist" },
                runId: "child-one",
                status: "accepted",
              },
            ],
          }),
        },
      ],
      timestamp: 2_000,
      toolName: "enterprise_delegate",
      toolCallId: "legacy",
    };
    const { container, transcript } = await mount([task()], [messages[0], legacy]);
    expect(container.querySelectorAll(".chat-delegation")).toHaveLength(1);
    expect(container.textContent).toContain("1 working");
    transcript.hostDisconnected();
  });
});
