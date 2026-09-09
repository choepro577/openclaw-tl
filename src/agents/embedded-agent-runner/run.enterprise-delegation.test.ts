import { describe, expect, it } from "vitest";
import { markGatewayRequestScopedRuntimeConfig } from "../../gateway/request-runtime-config.js";
import { makeAttemptResult } from "./run.overflow-compaction.fixture.js";
import {
  loadRunOverflowCompactionHarness,
  mockedRunEmbeddedAttempt,
  useOpenAIPlatformAuthFixture,
} from "./run.overflow-compaction.harness.js";

describe("delegation instructions at the actual attempt boundary", () => {
  it("refreshes the directive for each run in the same session", async () => {
    const { runEmbeddedAgent } = await loadRunOverflowCompactionHarness();
    useOpenAIPlatformAuthFixture();
    const sessionKey = "agent:worker:test-delegation";
    for (const runId of ["first-run", "second-run"]) {
      const config = markGatewayRequestScopedRuntimeConfig(
        { agents: { entries: { worker: {} } } },
        {
          enterpriseDelegation: {
            accountId: "account",
            personalAgentId: "worker",
            specialists: [],
            request: { sessionKey, parentRunId: runId },
            turn: {
              outcome: runId === "first-run" ? "clarify" : "local",
              source: "ai",
              agentNames: runId === "first-run" ? ["HR"] : [],
              instruction:
                runId === "first-run"
                  ? `request-${runId}: Ask whether the user wants the proposed HR review.`
                  : `request-${runId}: Answer the user's new local question. No specialist work is pending.`,
              reasonCode: runId === "first-run" ? "handoff_confirmation_required" : "router_local",
            },
          },
        },
      );
      mockedRunEmbeddedAttempt.mockResolvedValueOnce(makeAttemptResult({ assistantTexts: ["ok"] }));
      await runEmbeddedAgent({
        config,
        agentId: "worker",
        sessionId: "same-session",
        sessionKey,
        workspaceDir: "/tmp/workspace",
        prompt: runId === "first-run" ? "Review this leave request" : "What day is today?",
        runId,
        timeoutMs: 30000,
        provider: "openai",
        model: "gpt-5.4",
      });
      const attempt = mockedRunEmbeddedAttempt.mock.calls.at(-1)![0];
      expect(attempt.extraSystemPrompt).toContain(`request-${runId}`);
      expect(attempt.extraSystemPrompt).toContain("Current-turn Enterprise routing directive");
      if (runId === "second-run")
        expect(attempt.extraSystemPrompt).not.toContain("request-first-run");
    }
  });
});
