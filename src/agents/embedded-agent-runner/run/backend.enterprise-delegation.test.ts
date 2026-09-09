import { beforeEach, describe, expect, it, vi } from "vitest";
import { markGatewayRequestScopedRuntimeConfig } from "../../../gateway/request-runtime-config.js";
import { prepareSystemAgentRunAdmission } from "../../admitted-run-context.js";
import { AuthStorage } from "../../sessions/auth-storage.js";
import { ModelRegistry } from "../../sessions/model-registry.js";
import { makeProviderModelFixture } from "../../test-helpers/provider-model-fixture.js";
import { makeAttemptResult } from "../run.overflow-compaction.fixture.js";
import { runEmbeddedAttemptWithBackend } from "./backend.js";
import type { EmbeddedRunAttemptParams } from "./types.js";

const mocks = vi.hoisted(() => ({
  harness: vi.fn(),
}));
vi.mock("../../harness/selection.js", () => ({
  runAgentHarnessAttempt: mocks.harness,
  runAgentHarnessSettledTurnFinalization: vi.fn(),
}));

async function fixture() {
  const config = markGatewayRequestScopedRuntimeConfig(
    { agents: { entries: { personal: {}, finance: {}, contracts: {} } } },
    {
      enterpriseDelegation: {
        accountId: "account",
        personalAgentId: "personal",
        specialists: [],
        request: { sessionKey: "agent:personal:main", parentRunId: "parent" },
        turn: {
          decisionId: "approved-decision",
          outcome: "delegate",
          source: "ai",
          agentNames: ["Finance"],
          instruction: "Already approved specialist assignment",
          reasonCode: "route_ready",
        },
      },
    },
  );
  const admission = prepareSystemAgentRunAdmission(config, "parent", "personal", "test");
  const admittedRunContext = await admission.admit("embedded");
  const decision = {
    id: "approved-decision",
    accountId: "account",
    personalAgentId: "personal",
    sessionKey: "agent:personal:main",
    parentRunId: "parent",
    prompt:
      "We have 370 in cash, 80 in monthly costs. Review the cash runway. Yes, please proceed.",
    policyRevision: 1,
    accountPolicyRevision: 1,
    source: "ai",
    createdAt: Date.now(),
    confirmationState: "approved",
    routes: [
      {
        assignmentId: "finance-assignment",
        agentId: "finance",
        agentName: "Finance",
        task: "Review cash runway",
        profileRevision: "finance-v1",
        overrideRevision: 0,
        knowledgeQueries: [],
      },
    ],
    handling: "specialist",
    planId: "cash-review",
    planRevision: 1,
  };
  const authStorage = AuthStorage.inMemory();
  const params: EmbeddedRunAttemptParams = {
    config,
    admittedRunContext,
    agentId: "personal",
    sessionId: "parent-session",
    sessionKey: decision.sessionKey,
    runId: "parent",
    prompt: "Yes, please proceed.",
    workspaceDir: "/tmp/enterprise-delegation-test",
    agentHarnessId: "openclaw",
    timeoutMs: 30_000,
    sessionFile: decision.sessionKey,
    provider: "fixture-provider",
    modelId: "configured-parent-model",
    model: makeProviderModelFixture({
      provider: "fixture-provider",
      id: "configured-parent-model",
      api: "openai-responses",
      baseUrl: "https://fixture.invalid/v1",
    }),
    authStorage,
    authProfileStore: { version: 1, profiles: {} },
    modelRegistry: ModelRegistry.inMemory(authStorage),
    thinkLevel: "low",
  };
  return { params, decision, close: admission.close };
}

describe("admitted Enterprise delegation execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The model deliberately never invokes enterprise_delegate.
    mocks.harness.mockResolvedValue(
      makeAttemptResult({ assistantTexts: ["I calculated it myself."] }),
    );
  });

  it("keeps the coordinator harness in control instead of auto-dispatching and yielding", async () => {
    const { params, close } = await fixture();
    try {
      const result = await runEmbeddedAttemptWithBackend(params);
      expect(mocks.harness).toHaveBeenCalledOnce();
      expect(result.assistantTexts).toContain("I calculated it myself.");
      expect(result.yieldDetected).not.toBe(true);
    } finally {
      close();
    }
  });

  it("does not dispatch a ready plan during a coordinator retry unless the model calls the tool", async () => {
    const { params, close } = await fixture();
    try {
      await runEmbeddedAttemptWithBackend(params);
      await runEmbeddedAttemptWithBackend(params);
      expect(mocks.harness).toHaveBeenCalledTimes(2);
    } finally {
      close();
    }
  });
});
