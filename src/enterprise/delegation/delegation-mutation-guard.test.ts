import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount, getEnterpriseAccountById } from "../accounts/account-store.js";
import { applyEnterpriseAccessChanges } from "../entitlements/entitlement-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import { listEnterpriseDelegationCandidates } from "./delegation-candidates.js";
import {
  consumeEnterpriseDelegationMutationApproval,
  evaluateEnterpriseDelegationToolCall,
  invalidateEnterpriseDelegationMutationApprovals,
  isEnterpriseDelegationChildSession,
  registerEnterpriseDelegationChildAuthority,
  revokeEnterpriseDelegationChildAuthority,
} from "./delegation-mutation-guard.js";
import { writeEnterpriseDelegationPolicy } from "./delegation-store.js";

const tempDirectories: string[] = [];
const childSessionKeys: string[] = [];

function stateOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-mutation-guard-"));
  tempDirectories.push(directory);
  return { path: join(directory, "openclaw.sqlite") };
}

function specialistConfig(): OpenClawConfig {
  return {
    agents: {
      entries: {
        contracts: {
          name: "Agent Hợp đồng",
          description:
            "Chuyên kiểm tra điều khoản, rủi ro và nghĩa vụ trong hợp đồng doanh nghiệp.",
          delegationTarget: {
            status: "active",
            aliases: [],
            handlingMode: "auto_when_certain",
            useWhen: [
              "Kiểm tra điều khoản phạt trong hợp đồng",
              "Đánh giá rủi ro trước khi ký hợp đồng",
            ],
            avoidWhen: [],
            requiredInputs: [],
          },
        },
      },
    },
  };
}

function setupAuthority() {
  const options = stateOptions();
  const config = specialistConfig();
  const key = sharedAgentResourceKey("contracts");
  const account = createEnterpriseAccount(
    {
      username: `mutation.${tempDirectories.length}`,
      displayName: "Mutation Employee",
      passwordHash: "test-hash",
      role: "employee",
      initialEntitlements: [{ resourceType: "agent", resourceId: key, effect: "allow" }],
    },
    options,
  );
  const policy = writeEnterpriseDelegationPolicy(
    0,
    {
      rollout: "on",
      routerModel: "test/router-model",
      autoThreshold: 0.9,
      clarifyThreshold: 0.7,
      minimumMargin: 0.15,
      maxDelegatesPerTurn: 3,
      eventRetentionDays: 90,
    },
    options,
  );
  const candidate = listEnterpriseDelegationCandidates(config, account, options)[0]!;
  const childSessionKey = `child-session-${tempDirectories.length}`;
  const childRunId = `child-run-${tempDirectories.length}`;
  childSessionKeys.push(childSessionKey);
  registerEnterpriseDelegationChildAuthority({
    childSessionKey,
    childRunId,
    accountId: account.id,
    personalAgentId: `personal-${account.id}`,
    parentSessionKey: `parent-session-${account.id}`,
    parentRunId: `parent-${account.id}`,
    childAgentId: candidate.agentId,
    childAgentName: candidate.name,
    policyRevision: policy.revision,
    profileRevision: candidate.profileRevision,
    stateOptions: options,
  });
  return { account, candidate, childRunId, childSessionKey, config, key, options };
}

afterEach(() => {
  vi.useRealTimers();
  for (const key of childSessionKeys.splice(0)) {
    revokeEnterpriseDelegationChildAuthority(key);
  }
  closeOpenClawStateDatabaseForTest();
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("enterprise delegated-child mutation guard", () => {
  it("keeps authority for reordered profile keys but rejects a changed handling mode", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    const entry = config.agents!.entries!.contracts!;
    entry.delegationTarget = Object.fromEntries(
      Object.entries(entry.delegationTarget!).reverse(),
    ) as typeof entry.delegationTarget;
    const evaluate = () =>
      evaluateEnterpriseDelegationToolCall({
        config,
        childRunId,
        childSessionKey,
        childAgentId: "contracts",
        toolName: "sandbox_exec",
        toolCallId: "reordered-profile",
        toolParams: { command: "true" },
      });
    expect(evaluate()).toMatchObject({ kind: "require_approval" });
    entry.delegationTarget!.handlingMode = "confirm_before_handoff";
    expect(evaluate()).toEqual({ kind: "block", reason: "delegation_target_changed" });
  });

  it("leaves direct Shared Agent sessions unchanged and allows classified read-only tools", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    expect(
      evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey: "direct-shared-session",
        childRunId: "direct-shared-run",
        childAgentId: "contracts",
        toolName: "write",
        toolCallId: "direct-call",
        toolParams: { path: "/tmp/test" },
      }),
    ).toEqual({ kind: "not_delegated_child" });
    expect(
      evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "read",
        toolCallId: "read-call",
        toolParams: { path: "/workspace/contract.pdf" },
      }),
    ).toEqual({ kind: "allow_read_only" });
  });

  it("requires one-time approval for write, exec, send, delete, and unknown tools", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    for (const toolName of ["write", "exec", "message_send", "delete", "custom_unknown"]) {
      const decision = evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName,
        toolCallId: `call-${toolName}`,
        toolParams: { path: `/workspace/${toolName}.txt`, content: "changed" },
      });
      expect(decision).toMatchObject({
        kind: "require_approval",
        allowedDecisions: ["allow-once", "deny"],
        description: expect.stringContaining("Agent Hợp đồng"),
      });
    }
  });

  it("allows only direct scripts from the delegated run's granted skills", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    const skillBaseDir = "/workspace/.openclaw/sandbox-skills/skills/hr-skill";
    const skillsSnapshot = {
      prompt: "",
      skills: [{ name: "hr-skill" }],
      resolvedSkills: [
        {
          name: "hr-skill",
          description: "HRM lookup",
          filePath: `${skillBaseDir}/SKILL.md`,
          baseDir: skillBaseDir,
          sourceInfo: {
            path: `${skillBaseDir}/SKILL.md`,
            source: "test",
            scope: "temporary" as const,
            origin: "top-level" as const,
          },
          disableModelInvocation: false,
          source: "managed",
        },
      ],
    };
    const decide = (command: string) =>
      evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "sandbox_exec",
        toolCallId: command,
        toolParams: { command },
        skillsSnapshot,
      });

    expect(
      decide(`${skillBaseDir}/scripts/hr_call.sh router_tool_search --args-json '{}'`),
    ).toEqual({ kind: "allow_granted_skill_script" });
    for (const command of [
      `${skillBaseDir}/scripts/hr_call.sh ping; rm -rf /tmp/example`,
      `${skillBaseDir}/scripts/hr_call.sh "$(touch /tmp/example)"`,
      `${skillBaseDir}/other/hr_call.sh ping`,
      "/workspace/ungranted/scripts/hr_call.sh ping",
    ]) {
      expect(decide(command)).toMatchObject({ kind: "require_approval" });
    }
  });

  it("allows read-only process follow-up actions", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    for (const toolName of ["process", "sandbox_process"]) {
      expect(
        evaluateEnterpriseDelegationToolCall({
          config,
          childSessionKey,
          childRunId,
          childAgentId: "contracts",
          toolName,
          toolCallId: `${toolName}-poll`,
          toolParams: { action: "poll", sessionId: "skill-command" },
        }),
      ).toEqual({ kind: "allow_read_only" });
    }
  });

  it("does not treat another run in the same child session as delegated", () => {
    const { childSessionKey, config } = setupAuthority();
    expect(
      evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey,
        childRunId: "different-child-run",
        childAgentId: "contracts",
        toolName: "write",
        toolCallId: "wrong-run-write",
        toolParams: { path: "/workspace/a.txt" },
      }),
    ).toEqual({ kind: "not_delegated_child" });
  });

  it("binds approval to exact args and consumes it once", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    const first = evaluateEnterpriseDelegationToolCall({
      config,
      childSessionKey,
      childRunId,
      childAgentId: "contracts",
      toolName: "write",
      toolCallId: "write-1",
      toolParams: { path: "/workspace/a.txt", content: "A" },
    });
    expect(first.kind).toBe("require_approval");
    if (first.kind !== "require_approval") {
      throw new Error("approval expected");
    }
    expect(
      consumeEnterpriseDelegationMutationApproval({
        token: first.token,
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "write",
        toolCallId: "write-1",
        toolParams: { path: "/workspace/b.txt", content: "B" },
        resolution: "allow-once",
      }),
    ).toMatchObject({ ok: false, reason: "delegation_approval_scope_mismatch" });

    const second = evaluateEnterpriseDelegationToolCall({
      config,
      childSessionKey,
      childRunId,
      childAgentId: "contracts",
      toolName: "write",
      toolCallId: "write-2",
      toolParams: { path: "/workspace/a.txt", content: "A" },
    });
    if (second.kind !== "require_approval") {
      throw new Error("approval expected");
    }
    const approved = {
      token: second.token,
      config,
      childSessionKey,
      childRunId,
      childAgentId: "contracts",
      toolName: "write",
      toolCallId: "write-2",
      toolParams: { path: "/workspace/a.txt", content: "A" },
      resolution: "allow-once" as const,
    };
    expect(consumeEnterpriseDelegationMutationApproval(approved)).toEqual({ ok: true });
    expect(consumeEnterpriseDelegationMutationApproval(approved)).toMatchObject({
      ok: false,
      reason: "delegation_approval_not_found",
    });
  });

  it("denies approval from another child run and treats user denial as final", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    const decision = evaluateEnterpriseDelegationToolCall({
      config,
      childSessionKey,
      childRunId,
      childAgentId: "contracts",
      toolName: "write",
      toolCallId: "write-denied",
      toolParams: { path: "/workspace/a.txt", content: "A" },
    });
    if (decision.kind !== "require_approval") {
      throw new Error("approval expected");
    }

    expect(
      consumeEnterpriseDelegationMutationApproval({
        token: decision.token,
        config,
        childSessionKey,
        childRunId: "different-child-run",
        childAgentId: "contracts",
        toolName: "write",
        toolCallId: "write-denied",
        toolParams: { path: "/workspace/a.txt", content: "A" },
        resolution: "allow-once",
      }),
    ).toEqual({ ok: false, reason: "delegation_approval_not_found" });

    expect(
      consumeEnterpriseDelegationMutationApproval({
        token: decision.token,
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "write",
        toolCallId: "write-denied",
        toolParams: { path: "/workspace/a.txt", content: "A" },
        resolution: "deny",
      }),
    ).toEqual({ ok: false, reason: "delegation_approval_denied" });
    expect(
      consumeEnterpriseDelegationMutationApproval({
        token: decision.token,
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "write",
        toolCallId: "write-denied",
        toolParams: { path: "/workspace/a.txt", content: "A" },
        resolution: "allow-once",
      }),
    ).toEqual({ ok: false, reason: "delegation_approval_not_found" });
  });

  it("expires a mutation approval after two minutes without authorizing the tool", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-03T00:00:00.000Z"));
    const { childRunId, childSessionKey, config } = setupAuthority();
    const decision = evaluateEnterpriseDelegationToolCall({
      config,
      childSessionKey,
      childRunId,
      childAgentId: "contracts",
      toolName: "write",
      toolCallId: "write-expired",
      toolParams: { path: "/workspace/a.txt", content: "A" },
    });
    if (decision.kind !== "require_approval") {
      throw new Error("approval expected");
    }
    vi.setSystemTime(new Date("2026-09-03T00:02:00.001Z"));

    expect(
      consumeEnterpriseDelegationMutationApproval({
        token: decision.token,
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "write",
        toolCallId: "write-expired",
        toolParams: { path: "/workspace/a.txt", content: "A" },
        resolution: "allow-once",
      }),
    ).toEqual({ ok: false, reason: "delegation_approval_not_found" });
  });

  it("denies an already approved mutation when assignment is revoked before execution", () => {
    const { account, childRunId, childSessionKey, config, key, options } = setupAuthority();
    const decision = evaluateEnterpriseDelegationToolCall({
      config,
      childSessionKey,
      childRunId,
      childAgentId: "contracts",
      toolName: "write",
      toolCallId: "write-revoked",
      toolParams: { path: "/workspace/a.txt", content: "A" },
    });
    if (decision.kind !== "require_approval") {
      throw new Error("approval expected");
    }
    const current = getEnterpriseAccountById(account.id, options)!;
    applyEnterpriseAccessChanges(
      [
        {
          accountId: account.id,
          resourceType: "agent",
          resourceId: key,
          effect: null,
        },
      ],
      { [account.id]: current.policyRevision },
      options,
    );
    expect(
      consumeEnterpriseDelegationMutationApproval({
        token: decision.token,
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "write",
        toolCallId: "write-revoked",
        toolParams: { path: "/workspace/a.txt", content: "A" },
        resolution: "allow-once",
      }),
    ).toMatchObject({ ok: false, reason: "delegation_target_changed" });
  });

  it("invalidates pending approvals without dropping the child safety authority", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    const decision = evaluateEnterpriseDelegationToolCall({
      config,
      childSessionKey,
      childRunId,
      childAgentId: "contracts",
      toolName: "write",
      toolCallId: "write-emergency-off",
      toolParams: { path: "/workspace/a.txt", content: "A" },
    });
    if (decision.kind !== "require_approval") {
      throw new Error("approval expected");
    }

    expect(invalidateEnterpriseDelegationMutationApprovals()).toBeGreaterThan(0);
    expect(
      consumeEnterpriseDelegationMutationApproval({
        token: decision.token,
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "write",
        toolCallId: "write-emergency-off",
        toolParams: { path: "/workspace/a.txt", content: "A" },
        resolution: "allow-once",
      }),
    ).toEqual({ ok: false, reason: "delegation_approval_not_found" });
    expect(
      isEnterpriseDelegationChildSession({
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
      }),
    ).toBe(true);
  });
});
