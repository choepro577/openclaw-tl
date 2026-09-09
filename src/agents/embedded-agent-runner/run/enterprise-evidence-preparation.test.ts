import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EnterpriseDelegationDecision } from "../../../enterprise/delegation/delegation-router.js";
import type { EnterpriseKnowledgeAuthority } from "../../../enterprise/knowledge/authority.js";
import { markGatewayRequestScopedRuntimeConfig } from "../../../gateway/request-runtime-config.js";
import { isPrivateRunObservationScope } from "../../../infra/private-run-observations.js";
import { createEnterpriseKnowledgeTools } from "../../tools/enterprise-knowledge-tools.js";
import { prepareEnterpriseDelegationEvidence } from "./enterprise-evidence-preparation.js";
import type { EmbeddedRunAttemptParams } from "./types.js";

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  select: vi.fn(),
  prepare: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../../harness/selection.js", () => ({
  runAgentHarnessAttempt: mocks.run,
  selectPreparedAgentHarness: mocks.select,
}));
vi.mock("../../internal-session-effects.js", () => ({
  prepareInternalSessionEffectsSession: mocks.prepare,
  removeInternalSessionEffectsSession: mocks.remove,
}));

function fixture() {
  const sessionKey = "agent:personal:main";
  const packet = { zoneIds: ["zone"], assertCurrent: vi.fn(), resolve: vi.fn(), close: vi.fn() };
  const authority = {
    accountId: "account",
    sessionId: "enterprise-session",
    agentResourceKey: "agent:personal:account",
    hasPublishedKnowledge: () => true,
    search: vi
      .fn()
      .mockResolvedValue({ hits: [{ citationId: "verified-citation-reference-123" }] }),
    get: vi
      .fn()
      .mockResolvedValue({ evidence: "Only an exact relevant sentence belongs in the excerpt." }),
    createEvidenceTransfer: vi.fn().mockReturnValue(packet),
    evaluateGrounding: vi.fn(),
  } as unknown as EnterpriseKnowledgeAuthority;
  const createAuthority = vi.fn().mockReturnValue(authority);
  const config = markGatewayRequestScopedRuntimeConfig(
    {},
    { enterpriseKnowledge: { createAuthority } },
  );
  const params = {
    config,
    admittedRunContext: { operationalRunInstance: { runId: "parent", instanceId: "exact" } },
    runId: "parent",
    agentId: "personal",
    sessionKey,
    sessionId: "parent-session",
    workspaceDir: "/workspace",
    model: { id: "selected-model" },
    provider: "selected-provider",
    modelId: "selected-model",
    timeoutMs: 30_000,
    toolsAllow: [
      "enterprise_knowledge_search",
      "enterprise_knowledge_get",
      "read",
      "memory_search",
    ],
    onAgentEvent: vi.fn(),
    onAgentToolResult: vi.fn(),
    trajectoryRecorder: {},
    contextEngine: {},
    userTurnTranscriptRecorder: {
      resolveMessage: vi.fn().mockResolvedValue({ role: "user", content: "parent message" }),
    },
    transcriptPrompt: "parent transcript prompt",
    finalizePromptForResolvedTools: vi.fn(() => "parent finalized prompt"),
    currentInboundContext: { text: "parent inbound context" },
    onUserMessagePersisted: vi.fn(),
    onUserMessagePersistenceInvalidated: vi.fn(),
    onAssistantErrorMessagePersisted: vi.fn(),
    replyOperation: {},
  } as unknown as EmbeddedRunAttemptParams;
  const decision: EnterpriseDelegationDecision = {
    id: "fixture-decision",
    planId: "fixture-plan",
    planRevision: 1,
    handling: "hybrid",
    personalAgentId: "personal",
    accountId: "account",
    parentRunId: "parent",
    sessionKey,
    prompt: "Review our contract against company rules.",
    policyRevision: 1,
    accountPolicyRevision: 1,
    source: "ai",
    createdAt: 1,
    routes: [
      {
        assignmentId: "contract-assignment",
        agentId: "contracts",
        agentName: "Contracts",
        task: "Review penalty clause",
        knowledgeQueries: ["penalty rules"],
        requiredInputs: [],
        profileRevision: "1",
        overrideRevision: 1,
      },
    ],
  };
  const target = {
    agentId: "personal",
    sessionId: "hidden-session",
    sessionKey: "agent:personal:internal-session-effects:incognito-prep",
    sessionFile: "agent:personal:internal-session-effects:incognito-prep",
    storePath: "/tmp/incognito-openclaw-agent.sqlite",
    sessionEntry: { incognito: true },
  };
  mocks.prepare.mockResolvedValue(target);
  mocks.select.mockReturnValue({
    harness: { id: "codex", privatePreparationSupport: "host-observation-scope-v1" },
    builtIn: false,
    ownerPluginId: "codex",
  });
  mocks.run.mockResolvedValue({
    terminal: { kind: "ok" },
    assistantTexts: [
      JSON.stringify({
        assignments: [
          {
            assignmentId: "contract-assignment",
            selections: [
              {
                citationId: "verified-citation-reference-123",
                quote: "Only an exact relevant sentence",
              },
            ],
          },
        ],
      }),
    ],
  });
  return { params, decision, authority, createAuthority, target, packet };
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("parent Knowledge evidence preparation", () => {
  it("fails before retrieval when debug-proxy capture is enabled", async () => {
    const f = fixture();
    vi.stubEnv("OPENCLAW_DEBUG_PROXY_ENABLED", "1");
    const result = await prepareEnterpriseDelegationEvidence({
      params: f.params,
      decision: f.decision,
      assertActive: vi.fn(),
    });
    expect(result.outcomes.get("contract-assignment")).toMatchObject({
      errorCode: "EVIDENCE_PREPARATION_CAPTURE_UNAVAILABLE",
    });
    expect(mocks.run).not.toHaveBeenCalled();
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(f.authority.get).not.toHaveBeenCalled();
  });
  it("uses the selected parent model/harness and granted Knowledge tools privately, then validates exact selections", async () => {
    const f = fixture();
    const output = mocks.run.getMockImplementation()!;
    mocks.run.mockImplementation(async (attempt: EmbeddedRunAttemptParams) => {
      expect(isPrivateRunObservationScope()).toBe(true);
      expect(attempt.admittedRunContext).toBe(f.params.admittedRunContext);
      expect(attempt.config).toBe(f.params.config);
      expect(attempt.model).toBe(f.params.model);
      expect(attempt).toMatchObject({
        agentHarnessId: "codex",
        provider: "selected-provider",
        modelId: "selected-model",
        sessionTarget: f.target,
        toolsAllow: ["enterprise_knowledge_search", "enterprise_knowledge_get"],
        disableTrajectory: true,
        suppressLiveStreamOutput: true,
        skipPreparedUserTurnMessage: true,
      });
      expect(JSON.parse(attempt.prompt)).toMatchObject({
        authorizedRequest: f.decision.prompt,
        assignments: [
          { assignmentId: "contract-assignment", assignedTask: "Review penalty clause" },
        ],
      });
      for (const key of [
        "onAgentEvent",
        "onAgentToolResult",
        "trajectoryRecorder",
        "contextEngine",
        "userTurnTranscriptRecorder",
        "replyOperation",
        "transcriptPrompt",
        "finalizePromptForResolvedTools",
        "currentInboundContext",
        "onUserMessagePersisted",
        "onUserMessagePersistenceInvalidated",
        "onAssistantErrorMessagePersisted",
      ])
        expect(attempt[key as keyof EmbeddedRunAttemptParams]).toBeUndefined();
      const tools = createEnterpriseKnowledgeTools(f.authority);
      await tools[0]!.execute("search-call", { query: "penalty rules" });
      await tools[1]!.execute("get-call", { citationId: "verified-citation-reference-123" });
      return output();
    });
    const result = await prepareEnterpriseDelegationEvidence({
      params: f.params,
      decision: f.decision,
      assertActive: vi.fn(),
    });
    expect(f.createAuthority).toHaveBeenCalledWith("personal");
    expect(f.authority.search).toHaveBeenCalledWith({ query: "penalty rules" });
    expect(f.authority.get).toHaveBeenCalledWith("verified-citation-reference-123");
    expect(f.authority.createEvidenceTransfer).toHaveBeenCalledWith({
      assignmentId: "contract-assignment",
      targetAgentResourceKey: "agent:shared:contracts",
      selections: [
        { citationId: "verified-citation-reference-123", quote: "Only an exact relevant sentence" },
      ],
    });
    expect(result.outcomes.get("contract-assignment")).toBe(f.packet);
    expect(f.params.userTurnTranscriptRecorder?.resolveMessage).not.toHaveBeenCalled();
    expect(f.params.finalizePromptForResolvedTools).not.toHaveBeenCalled();
    expect(f.params.onUserMessagePersisted).not.toHaveBeenCalled();
    expect(f.params.onAssistantErrorMessagePersisted).not.toHaveBeenCalled();
    expect(result.usage).toBeUndefined();
    expect(result.modelIterations).toBeUndefined();
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(f.target);
    expect(mocks.prepare.mock.calls[0]![0].source).toBeUndefined();
  });

  it("closes created packets and reports only the fixed error when hidden-session cleanup fails", async () => {
    const f = fixture();
    mocks.remove.mockRejectedValueOnce(new Error("PRIVATE-CLEANUP-ERROR-MARKER"));
    await expect(
      prepareEnterpriseDelegationEvidence({
        params: f.params,
        decision: f.decision,
        assertActive: vi.fn(),
      }),
    ).rejects.toThrow(/^EVIDENCE_PREPARATION_CLEANUP_FAILED$/);
    expect(f.authority.createEvidenceTransfer).toHaveBeenCalledTimes(1);
    expect(f.packet.close).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(f.target);
  });

  it("does not replace denied retrieval with memory or files", async () => {
    const f = fixture();
    f.params.toolsAllow = ["memory_search", "read", "enterprise_knowledge_search"];
    const result = await prepareEnterpriseDelegationEvidence({
      params: f.params,
      decision: f.decision,
      assertActive: vi.fn(),
    });
    expect(result.outcomes.get("contract-assignment")).toMatchObject({
      errorCode: "EVIDENCE_PREPARATION_TOOLS_UNAVAILABLE",
    });
    expect(mocks.run).not.toHaveBeenCalled();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it("rejects an unrelated plugin without the private preparation contract before any retrieval", async () => {
    const f = fixture();
    mocks.select.mockReturnValue({
      harness: { id: "other-plugin" },
      builtIn: false,
      ownerPluginId: "other-plugin",
    });
    const result = await prepareEnterpriseDelegationEvidence({
      params: f.params,
      decision: f.decision,
      assertActive: vi.fn(),
    });
    expect(result.outcomes.get("contract-assignment")).toMatchObject({
      errorCode: "EVIDENCE_PREPARATION_UNSUPPORTED_HARNESS",
    });
    expect(mocks.run).not.toHaveBeenCalled();
    expect(f.authority.get).not.toHaveBeenCalled();
  });

  it.each([
    '{"assignments":[{"assignmentId":"wrong-assignment","selections":[]}]}',
    '{"assignments":[{"assignmentId":"contract-assignment","selections":[],"grant":true}]}',
    '```json\n{"assignments":[]}\n```',
  ])(
    "rejects malformed or cross-assignment selections without creating packets: %s",
    async (text) => {
      const f = fixture();
      mocks.run.mockResolvedValue({ terminal: { kind: "ok" }, assistantTexts: [text] });
      const result = await prepareEnterpriseDelegationEvidence({
        params: f.params,
        decision: f.decision,
        assertActive: vi.fn(),
      });
      expect(result.outcomes.get("contract-assignment")).toMatchObject({
        errorCode: "EVIDENCE_PREPARATION_INVALID_SELECTION",
      });
      expect(f.authority.createEvidenceTransfer).not.toHaveBeenCalled();
      expect(mocks.remove).toHaveBeenCalledWith(f.target);
    },
  );

  it.each(["ok", "error"])(
    "preserves reported numeric aggregate accounting for %s attempts without payload observations",
    async (kind) => {
      const f = fixture();
      mocks.run.mockResolvedValue({
        terminal: { kind },
        assistantTexts: ["PRIVATE-SELECTION-MARKER"],
        attemptUsage: {
          input: 17,
          output: 9,
          cacheRead: 4,
          cacheWrite: 2,
          reasoningTokens: 3,
          total: 32,
          contextUsage: { state: "available", promptTokens: 999, totalTokens: 1000 },
          rawPayload: "PRIVATE-SELECTION-MARKER",
        },
        modelIterations: 3,
        lastAssistant: { content: "PRIVATE-SELECTION-MARKER", usage: { input: 999 } },
      });
      const result = await prepareEnterpriseDelegationEvidence({
        params: f.params,
        decision: f.decision,
        assertActive: vi.fn(),
      });
      expect(result.usage).toEqual({
        input: 17,
        output: 9,
        cacheRead: 4,
        cacheWrite: 2,
        reasoningTokens: 3,
        total: 32,
      });
      expect(result.modelIterations).toBe(3);
      expect(result.outcomes.get("contract-assignment")).toEqual({
        errorCode:
          kind === "ok" ? "EVIDENCE_PREPARATION_INVALID_SELECTION" : "EVIDENCE_PREPARATION_FAILED",
      });
      expect(JSON.stringify(result)).not.toContain("PRIVATE-SELECTION-MARKER");
      expect(mocks.remove).toHaveBeenCalledWith(f.target);
    },
  );

  it("rechecks authority after the model await and always removes private preparation state", async () => {
    const f = fixture();
    let active = true;
    mocks.run.mockImplementation(async () => {
      active = false;
      return { terminal: { kind: "ok" }, assistantTexts: [] };
    });
    const assertActive = () => {
      if (!active) throw new Error("revoked");
    };
    await expect(
      prepareEnterpriseDelegationEvidence({ params: f.params, decision: f.decision, assertActive }),
    ).rejects.toThrow("revoked");
    expect(f.authority.createEvidenceTransfer).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledWith(f.target);
  });
});
