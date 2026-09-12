import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EnterpriseDelegationDecision } from "../enterprise/delegation/delegation-router.js";
import type { EnterpriseEvidenceTransfer } from "../enterprise/knowledge/evidence-transfer.js";
import { prepareSystemAgentRunAdmission } from "./admitted-run-context.js";
import type { EmbeddedRunAttemptParams } from "./embedded-agent-runner/run/types.js";
import {
  confirmEnterpriseDelegationEvidenceRun,
  registerEnterpriseDelegationEvidence,
  revokeEnterpriseDelegationEvidence,
  withEnterpriseDelegationEvidence,
} from "./enterprise-delegation-evidence.js";
import { AuthStorage } from "./sessions/auth-storage.js";
import { ModelRegistry } from "./sessions/model-registry.js";
import { makeProviderModelFixture } from "./test-helpers/provider-model-fixture.js";

const mocks = vi.hoisted(() => ({
  validate: vi.fn(),
  load: vi.fn(),
  target: vi.fn(),
  subscribe: vi.fn(),
}));
vi.mock("../enterprise/delegation/delegation-router.js", () => ({
  validateEnterpriseDelegationDecisionForDispatch: mocks.validate,
}));
vi.mock("../enterprise/knowledge/knowledge-access-changes.js", () => ({
  subscribeKnowledgeAccessChanges: mocks.subscribe,
}));
vi.mock("../config/sessions/session-accessor.js", () => ({ loadExactSessionEntry: mocks.load }));
vi.mock("./run-session-target.js", () => ({ resolveAgentRunSessionTarget: mocks.target }));

const childKey = "agent:finance:subagent:evidence-test";
const config = { agents: { entries: { finance: {} } } };
const decision: EnterpriseDelegationDecision = {
  id: "decision",
  planId: "plan",
  planRevision: 1,
  handling: "hybrid",
  accountId: "account",
  personalAgentId: "personal",
  sessionKey: "agent:personal:main",
  parentRunId: "parent",
  prompt: "Analyze the allowance",
  policyRevision: 1,
  accountPolicyRevision: 1,
  source: "ai",
  routes: [],
  createdAt: Date.now(),
  consumedAt: Date.now(),
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.validate.mockReturnValue({ ok: true });
  mocks.subscribe.mockReturnValue(vi.fn());
  mocks.target.mockResolvedValue({
    agentId: "finance",
    sessionId: "session",
    sessionKey: childKey,
  });
});
afterEach(() => {
  revokeEnterpriseDelegationEvidence(childKey, "child");
  revokeEnterpriseDelegationEvidence(childKey, "gateway-child");
});

async function fixture(provisionalRunId = false) {
  const admission = prepareSystemAgentRunAdmission(config, "child", "finance", "test");
  const admittedRunContext = await admission.admit("embedded");
  const packet: EnterpriseEvidenceTransfer = {
    zoneIds: ["zone"],
    assertCurrent: vi.fn(),
    assertAssignment: vi.fn(),
    resolve: vi.fn(() => "private evidence marker"),
    close: vi.fn(),
  };
  registerEnterpriseDelegationEvidence({
    childSessionKey: childKey,
    childRunId: "child",
    childAgentId: "finance",
    packet,
    decision,
    config,
    provisionalRunId,
  });
  const authStorage = AuthStorage.inMemory();
  const params: EmbeddedRunAttemptParams = {
    config,
    agentId: "finance",
    sessionId: "session",
    sessionKey: childKey,
    runId: "child",
    admittedRunContext,
    prompt: "Assigned task",
    extraSystemPrompt: "Rules",
    sessionFile: childKey,
    workspaceDir: "/tmp/enterprise-evidence-test",
    timeoutMs: 30_000,
    provider: "provider",
    modelId: "model",
    model: makeProviderModelFixture({
      provider: "provider",
      id: "model",
      api: "openai-responses",
      baseUrl: "https://provider.test/v1",
    }),
    authStorage,
    authProfileStore: { version: 1, profiles: {} },
    modelRegistry: ModelRegistry.inMemory(authStorage),
    thinkLevel: "low",
  };
  return { params, packet, close: admission.close };
}
const destination = {
  provider: "provider",
  model: "model",
  api: "openai-responses",
  requestUrl: "https://provider.test/responses",
  transport: "http" as const,
};

describe("exact-child Enterprise evidence leases", () => {
  it("binds a provisional launch lease to the Gateway run id", async () => {
    const { params, close } = await fixture(true);
    try {
      await expect(
        withEnterpriseDelegationEvidence({ ...params, runId: "gateway-child" }),
      ).resolves.toBeDefined();
      confirmEnterpriseDelegationEvidenceRun({
        childSessionKey: childKey,
        anticipatedRunId: "child",
        actualRunId: "gateway-child",
      });
      await expect(
        withEnterpriseDelegationEvidence({ ...params, runId: "gateway-child" }),
      ).resolves.toBeDefined();
      await expect(withEnterpriseDelegationEvidence(params)).rejects.toThrow(
        "EVIDENCE_CHILD_IDENTITY_MISMATCH",
      );
    } finally {
      close();
    }
  });

  it("keeps the packet out of prompts and checks exact child identity before model access", async () => {
    const { params, packet, close } = await fixture();
    try {
      const prepared = await withEnterpriseDelegationEvidence(params);
      expect(prepared.prompt).toBe("Assigned task");
      expect(prepared.extraSystemPrompt).toBe("Rules");
      expect(JSON.stringify(prepared)).not.toContain("private evidence marker");
      await expect(prepared.resolvePrivateModelContext?.(destination)).resolves.toBe(
        "private evidence marker",
      );
      expect(packet.resolve).toHaveBeenCalledWith({ transport: "unknown" });
      await expect(
        withEnterpriseDelegationEvidence({ ...params, runId: "other-run" }),
      ).rejects.toThrow("EVIDENCE_CHILD_IDENTITY_MISMATCH");
      await expect(
        withEnterpriseDelegationEvidence({ ...params, agentId: "contracts" }),
      ).rejects.toThrow("EVIDENCE_CHILD_IDENTITY_MISMATCH");
      close();
      await expect(prepared.resolvePrivateModelContext?.(destination)).rejects.toThrow();
    } finally {
      close();
    }
  });

  it("aborts the exact live child on committed zone revocation and rejects the next model use", async () => {
    const { params, packet, close } = await fixture();
    try {
      const prepared = await withEnterpriseDelegationEvidence(params);
      vi.mocked(packet.assertCurrent).mockImplementation(() => {
        throw new Error("revoked");
      });
      const listener = mocks.subscribe.mock.calls[0]![0] as (zoneId: string) => void;
      listener("unrelated-zone");
      expect(prepared.abortSignal?.aborted).toBe(false);
      listener("zone");
      expect(prepared.abortSignal?.aborted).toBe(true);
      await expect(prepared.resolvePrivateModelContext?.(destination)).rejects.toThrow();
      expect(packet.resolve).not.toHaveBeenCalled();
    } finally {
      close();
    }
  });

  it("does not reconstruct a lease from a persistent requirement after restart or terminal cleanup", async () => {
    const { params, packet, close } = await fixture();
    try {
      revokeEnterpriseDelegationEvidence(childKey, "different-run");
      expect(packet.close).not.toHaveBeenCalled();
      revokeEnterpriseDelegationEvidence(childKey, "child");
      expect(packet.close).toHaveBeenCalledOnce();
      mocks.load.mockReturnValue({ entry: { requiresPrivateModelContext: true } });
      await expect(withEnterpriseDelegationEvidence(params)).rejects.toThrow(
        "EVIDENCE_LEASE_UNAVAILABLE",
      );
      expect(packet.resolve).not.toHaveBeenCalled();
    } finally {
      close();
    }
  });
});
