import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnterpriseDelegationDecision } from "../enterprise/delegation/delegation-router.js";
import {
  buildEnterpriseDelegationChildDenylist,
  classifyEnterpriseDelegationFailure,
  executeEnterpriseDelegationAssignments,
} from "./enterprise-delegation-execution.js";
import type {
  SpawnSubagentContext,
  SpawnSubagentParams,
} from "./subagents/spawn/subagent-spawn-contract.js";

const mocks = vi.hoisted(() => ({
  recordSpawn: vi.fn(),
  spawn: vi.fn(),
  validateDispatch: vi.fn(),
  registerAuthority: vi.fn(),
  revokeAuthority: vi.fn(),
  registerTerminal: vi.fn(),
  discardTerminal: vi.fn(),
}));
vi.mock("../enterprise/delegation/delegation-router.js", () => ({
  recordEnterpriseDelegationSpawn: mocks.recordSpawn,
  validateEnterpriseDelegationDecisionForDispatch: mocks.validateDispatch,
}));
vi.mock("../enterprise/delegation/delegation-mutation-guard.js", () => ({
  registerEnterpriseDelegationChildAuthority: mocks.registerAuthority,
  revokeEnterpriseDelegationChildAuthority: mocks.revokeAuthority,
}));
vi.mock("./subagents/subagent-terminal-callbacks.js", () => ({
  registerSubagentTerminalCallback: mocks.registerTerminal,
  discardSubagentTerminalCallback: mocks.discardTerminal,
}));
vi.mock("./subagents/spawn/subagent-spawn.js", () => ({ spawnSubagentDirect: mocks.spawn }));

function decision(
  overrides: Partial<EnterpriseDelegationDecision> = {},
): EnterpriseDelegationDecision {
  return {
    id: "decision-123456789",
    planId: "plan-contract",
    planRevision: 1,
    handling: "specialist",
    accountId: "account-a",
    personalAgentId: "personal",
    sessionKey: "parent-session",
    parentRunId: "parent-run",
    prompt: "Review the contract",
    policyRevision: 7,
    accountPolicyRevision: 3,
    source: "rule",
    confirmationState: "approved",
    routes: [
      {
        assignmentId: "assignment-contract",
        agentId: "contracts",
        agentName: "Contract Agent",
        task: "Review penalty clauses",
        requiredInputs: [],
        knowledgeQueries: [],
        profileRevision: "profile-7",
        overrideRevision: 2,
      },
    ],
    createdAt: Date.now(),
    consumedAt: Date.now(),
    ...overrides,
  };
}
function options() {
  return {
    config: {},
    agentId: "personal",
    runSessionKey: "parent-session",
    runId: "parent-run",
    workspaceDir: "/workspace/personal",
    inheritedToolDenylist: ["gateway"],
  };
}
beforeEach(() => {
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
  mocks.validateDispatch.mockReturnValue({ ok: true });
});

describe("canonical Enterprise delegation execution", () => {
  it.each([
    [
      "docker daemon unavailable",
      new Error("Cannot connect to the Docker daemon at unix:///private/secret/docker.sock"),
      "docker_unavailable",
    ],
    [
      "sandbox image unavailable",
      new Error("Sandbox image not found: /private/secret/openclaw-sandbox:latest"),
      "image_unavailable",
    ],
    [
      "sandbox provisioning unavailable",
      new Error("Sandbox backend is unavailable at /private/secret/runtime"),
      "sandbox_unavailable",
    ],
  ] as const)("classifies %s without returning raw error details", (_label, error, failureCode) => {
    const result = classifyEnterpriseDelegationFailure(error);

    expect(result).toEqual({ failureCode, retryable: true });
    expect(JSON.stringify(result)).not.toContain("/private/secret");
  });

  it("uses a non-retryable generic code for opaque spawn errors", () => {
    const error = new Error("provider token=super-secret path=/private/secret/runtime");

    expect(classifyEnterpriseDelegationFailure(error)).toEqual({
      failureCode: "spawn_failed",
      retryable: false,
    });
    expect(JSON.stringify(classifyEnterpriseDelegationFailure(error))).not.toContain(
      "super-secret",
    );
  });

  it.each([
    [
      "docker daemon",
      "Cannot connect to the Docker daemon at unix:///private/secret/docker.sock",
      "docker_unavailable",
    ],
    [
      "sandbox image",
      "Sandbox image not found: /private/secret/openclaw-sandbox:latest",
      "image_unavailable",
    ],
    [
      "sandbox runtime",
      "Sandbox runtime unavailable at /private/secret/runtime",
      "sandbox_unavailable",
    ],
  ] as const)(
    "returns safe assignment metadata for %s failures",
    async (_label, error, failureCode) => {
      mocks.spawn.mockResolvedValue({ status: "error", error });

      const result = await executeEnterpriseDelegationAssignments({
        options: options(),
        decision: decision(),
        assertActive: vi.fn(),
      });

      expect(result.assignments).toEqual([
        expect.objectContaining({
          status: "error",
          failureCode,
          retryable: true,
        }),
      ]);
      expect(JSON.stringify(result)).not.toContain("/private/secret");
      expect(JSON.stringify(result)).not.toContain("docker.sock");
    },
  );

  it("always strips recursive delegation capabilities from child runs", () => {
    expect(buildEnterpriseDelegationChildDenylist(["gateway", "sessions_spawn"])).toEqual([
      "agents_list",
      "enterprise_delegate",
      "enterprise_specialists_list",
      "gateway",
      "sessions_create",
      "sessions_history",
      "sessions_list",
      "sessions_search",
      "sessions_send",
      "sessions_spawn",
      "sessions_yield",
      "subagents",
    ]);
  });

  it("spawns only the approved assignment with isolated sandboxed trusted-launch settings", async () => {
    mocks.spawn.mockResolvedValue({
      status: "accepted",
      childSessionKey: "child-session",
      runId: "child-run",
    });
    const approved = decision();
    const executionOptions = options();
    const result = await executeEnterpriseDelegationAssignments({
      options: executionOptions,
      decision: approved,
      assertActive: vi.fn(),
    });
    expect(mocks.spawn).toHaveBeenCalledExactlyOnceWith(
      {
        task: expect.stringContaining("Review penalty clauses"),
        label: "Contract Agent",
        agentId: "contracts",
        mode: "run",
        context: "isolated",
        cleanup: "keep",
        sandbox: "require",
        runTimeoutSeconds: 300,
        expectsCompletionMessage: true,
      },
      expect.objectContaining({
        config: executionOptions.config,
        requireTrustedLaunchIdentity: true,
        agentSessionKey: "parent-session",
        requesterTurnRunId: "parent-run",
        requesterAgentIdOverride: "personal",
        workspaceDir: "/workspace/personal",
        inheritedToolDenylist: expect.arrayContaining([
          "gateway",
          "enterprise_delegate",
          "sessions_spawn",
          "sessions_yield",
          "subagents",
        ]),
      }),
    );
    expect(result).toMatchObject({
      reasonCode: "delegate_started",
      acceptedSessionSpawns: [{ runId: "child-run", childSessionKey: "child-session" }],
      assignments: [
        {
          assignmentId: "assignment-contract",
          agentId: "contracts",
          runId: "child-run",
          status: "accepted",
        },
      ],
    });
    expect(mocks.recordSpawn).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: approved,
        childRunIds: ["child-run"],
        outcome: "delegated",
        reasonCode: "delegate_started",
      }),
    );
  });

  it("preserves the complete authorized source and independent assignment identity through partial failure", async () => {
    const source =
      "Vốn 600 triệu; sửa sang 300 triệu; cọc 60 triệu; thuê 20 triệu; lương 60 triệu; chi phí khác 20 triệu; nguyên liệu 40% doanh thu; doanh thu 130 triệu/tháng. Tính hòa vốn và tiền sau 3 tháng. Hợp đồng tăng thuê bất kỳ lúc nào, thu hồi sau 7 ngày, mất toàn bộ cọc. Chỉ phân tích, chưa ký hay gửi gì.\n\nUser answer: MIX-QA-910 nhé.";
    const approved = decision({ prompt: source });
    approved.routes.push({
      ...approved.routes[0]!,
      assignmentId: "assignment-finance",
      agentId: "finance",
      agentName: "Finance Agent",
      task: "Review budget",
    });
    mocks.spawn
      .mockResolvedValueOnce({
        status: "accepted",
        runId: "contract-run",
        childSessionKey: "contract-child",
      })
      .mockResolvedValueOnce({ status: "error", error: "finance unavailable" });
    const result = await executeEnterpriseDelegationAssignments({
      options: options(),
      decision: approved,
      assertActive: vi.fn(),
    });
    expect(mocks.spawn).toHaveBeenCalledTimes(2);
    for (const [spawn] of mocks.spawn.mock.calls as [SpawnSubagentParams][]) {
      const envelope = JSON.parse(spawn.task.slice(spawn.task.indexOf("{")));
      expect(envelope.authorizedRequest).toBe(source);
      expect(envelope.assignedTask).toBe(
        spawn.agentId === "contracts" ? "Review penalty clauses" : "Review budget",
      );
      expect(spawn.context).toBe("isolated");
      expect(spawn.task).toContain("Complete only the assignedTask");
      expect(spawn.task).toContain("not permission for additional actions");
    }
    expect(result).toMatchObject({
      reasonCode: "delegate_partial_failure",
      acceptedSessionSpawns: [{ runId: "contract-run", childSessionKey: "contract-child" }],
      assignments: [
        {
          assignmentId: "assignment-contract",
          agentId: "contracts",
          runId: "contract-run",
          status: "accepted",
        },
        {
          assignmentId: "assignment-finance",
          agentId: "finance",
          status: "error",
          failureCode: "spawn_failed",
          retryable: false,
        },
      ],
    });
    expect(mocks.recordSpawn).toHaveBeenCalledWith(
      expect.objectContaining({
        childRunIds: ["contract-run"],
        outcome: "failed",
        reasonCode: "delegate_partial_failure",
      }),
    );
  });

  it("does not attempt spawn or record acceptance after admitted authority has closed", async () => {
    const assertActive = () => {
      throw new Error("run_closed");
    };
    await expect(
      executeEnterpriseDelegationAssignments({
        options: options(),
        decision: decision(),
        assertActive,
      }),
    ).rejects.toThrow("run_closed");
    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.recordSpawn).not.toHaveBeenCalled();
  });

  it.each(["none", "policy", "admission"] as const)(
    "revalidates after asynchronous preparation before dispatch (%s revoked)",
    async (revoked) => {
      const approved = decision();
      const executionOptions = options();
      const assertActive = vi.fn();
      let finishPreparation!: () => void;
      const preparation = new Promise<void>((resolve) => {
        finishPreparation = resolve;
      });
      const dispatch = vi.fn();
      const child = {
        childSessionKey: "prepared-child",
        anticipatedRunId: "prepared-child-run",
        targetAgentId: "contracts",
      };
      mocks.spawn.mockImplementation(
        async (_params: SpawnSubagentParams, context: SpawnSubagentContext) => {
          await preparation;
          try {
            context.onBeforeChildDispatch?.(child);
            dispatch();
            return {
              status: "accepted",
              childSessionKey: child.childSessionKey,
              runId: child.anticipatedRunId,
            };
          } catch (error) {
            context.onChildDispatchAborted?.(child);
            return {
              status: "forbidden",
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      );
      const execution = executeEnterpriseDelegationAssignments({
        options: executionOptions,
        decision: approved,
        assertActive,
      });
      expect(mocks.spawn).toHaveBeenCalledTimes(1);
      expect(dispatch).not.toHaveBeenCalled();
      const checksBeforeAwait = mocks.validateDispatch.mock.calls.length;
      if (revoked === "policy") {
        mocks.validateDispatch.mockReturnValue({
          ok: false,
          reasonCode: "decision_policy_changed",
        });
      }
      if (revoked === "admission") {
        assertActive.mockImplementation(() => {
          throw new Error("run_closed");
        });
      }
      finishPreparation();
      const result = await execution;
      expect(dispatch).toHaveBeenCalledTimes(revoked === "none" ? 1 : 0);
      if (revoked !== "admission") {
        expect(mocks.validateDispatch.mock.calls.length).toBeGreaterThan(checksBeforeAwait);
        expect(mocks.validateDispatch).toHaveBeenLastCalledWith({
          decision: approved,
          config: executionOptions.config,
        });
      }
      expect(mocks.registerAuthority).toHaveBeenCalledTimes(revoked === "none" ? 1 : 0);
      expect(mocks.registerTerminal).toHaveBeenCalledTimes(revoked === "none" ? 1 : 0);
      if (revoked !== "none") {
        expect(mocks.discardTerminal).toHaveBeenCalledExactlyOnceWith(child.anticipatedRunId);
        expect(mocks.revokeAuthority).toHaveBeenCalledExactlyOnceWith(
          child.childSessionKey,
          child.anticipatedRunId,
        );
        expect(result).toMatchObject({
          reasonCode: "delegate_spawn_failed",
          acceptedSessionSpawns: [],
          assignments: [
            {
              status: "forbidden",
              failureCode: "spawn_failed",
              retryable: false,
            },
          ],
        });
      } else {
        expect(result.acceptedSessionSpawns).toEqual([
          { runId: child.anticipatedRunId, childSessionKey: child.childSessionKey },
        ]);
        expect(mocks.revokeAuthority).not.toHaveBeenCalled();
        mocks.registerTerminal.mock.calls[0]![0].onTerminal();
        expect(mocks.revokeAuthority).toHaveBeenCalledExactlyOnceWith(
          child.childSessionKey,
          child.anticipatedRunId,
        );
      }
    },
  );
});
