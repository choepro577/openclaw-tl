import { describe, expect, it, vi } from "vitest";
import { runWithPrivateRunObservationScope } from "../infra/private-run-observations.js";
import { createHookRunner } from "./hooks.js";
import { createMockPluginRegistry, TEST_PLUGIN_AGENT_CTX } from "./hooks.test-fixtures.js";

describe("private preparation hook boundary", () => {
  it("does not expose evidence to observations or persistence/final-reply hooks, while preserving tool block and approval policy", async () => {
    const observer = vi.fn();
    const policy = vi.fn().mockResolvedValue({
      block: true,
      blockReason: "policy denied",
      requireApproval: { title: "Review", description: "Check request" },
    });
    const runner = createHookRunner(
      createMockPluginRegistry([
        ...[
          "llm_input",
          "llm_output",
          "agent_end",
          "after_tool_call",
          "before_message_write",
          "tool_result_persist",
          "before_agent_finalize",
        ].map((hookName) => ({ hookName, handler: observer })),
        { hookName: "before_tool_call", handler: policy },
      ]),
    );
    const message = { role: "user" as const, content: "PRIVATE-EVIDENCE-MARKER", timestamp: 0 };
    await runWithPrivateRunObservationScope(async () => {
      await runner.runAgentEnd({ messages: [message], success: true }, TEST_PLUGIN_AGENT_CTX);
      await runner.runLlmInput(
        {
          runId: "prep",
          sessionId: "private",
          provider: "test",
          model: "test",
          systemPrompt: "",
          prompt: message.content,
          historyMessages: [],
        },
        TEST_PLUGIN_AGENT_CTX,
      );
      await runner.runLlmOutput(
        {
          runId: "prep",
          sessionId: "private",
          provider: "test",
          model: "test",
          assistantTexts: [message.content],
        },
        TEST_PLUGIN_AGENT_CTX,
      );
      await runner.runAfterToolCall(
        { toolName: "enterprise_knowledge_get", params: {}, result: message.content },
        { toolName: "enterprise_knowledge_get" },
      );
      runner.runBeforeMessageWrite({ message }, TEST_PLUGIN_AGENT_CTX);
      runner.runToolResultPersist(
        { toolName: "enterprise_knowledge_get", message },
        TEST_PLUGIN_AGENT_CTX,
      );
      await runner.runBeforeAgentFinalize(
        {
          runId: "prep",
          sessionId: "private",
          stopHookActive: false,
          lastAssistantMessage: message.content,
        },
        TEST_PLUGIN_AGENT_CTX,
      );
      await expect(
        runner.runBeforeToolCall(
          { toolName: "enterprise_knowledge_get", params: { citationId: "citation" } },
          { toolName: "enterprise_knowledge_get" },
        ),
      ).resolves.toMatchObject({
        block: true,
        blockReason: "policy denied",
        requireApproval: { title: "Review" },
      });
    });
    expect(observer).not.toHaveBeenCalled();
    expect(policy).toHaveBeenCalledTimes(1);
    await runner.runAgentEnd({ messages: [message], success: true }, TEST_PLUGIN_AGENT_CTX);
    expect(observer).toHaveBeenCalledTimes(1);
  });
});
