import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
  confirmEnterpriseDelegationChildRun,
  evaluateEnterpriseDelegationToolCall,
  isEnterpriseDelegationChildSession,
  registerEnterpriseDelegationChildAuthority,
  revokeEnterpriseDelegationChildAuthority,
} from "./delegation-mutation-guard.js";
import { writeEnterpriseDelegationPolicy } from "./delegation-store.js";

const tempDirectories: string[] = [];
const childSessionKeys: string[] = [];

function stateOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-delegation-guard-"));
  tempDirectories.push(directory);
  return { path: join(directory, "openclaw.sqlite") };
}

function specialistConfig(workspaceDir: string): OpenClawConfig {
  return {
    agents: {
      entries: {
        contracts: {
          workspace: workspaceDir,
          description: "Agent hợp đồng",
          tools: { profile: "minimal", allow: ["read", "write", "skill_script"] },
          skills: ["contracts-skill"],
          delegationTarget: {
            status: "active",
            aliases: [],
            handlingMode: "auto_when_certain",
            useWhen: ["Kiểm tra hợp đồng"],
            avoidWhen: [],
            requiredInputs: [],
          },
        },
      },
    },
  };
}

function setupAuthority(provisionalRunId = false) {
  const options = stateOptions();
  const workspaceDir = mkdtempSync(join(tmpdir(), "openclaw-enterprise-delegation-workspace-"));
  tempDirectories.push(workspaceDir);
  const skillDir = join(workspaceDir, "skills", "contracts-skill");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---
name: contracts-skill
description: Contract operations.
metadata: ${JSON.stringify({
      openclaw: {
        scriptRuntime: {
          entrypoints: {
            lookup: {
              path: "scripts/lookup",
              kind: "operation",
              routerOperation: "router_tool_search",
              readOperations: ["router_tool_search", "get_data"],
              writeOperations: ["set_data"],
              unknownRisk: "approval",
            },
          },
        },
      },
    })}
---
`,
  );
  const config = specialistConfig(workspaceDir);
  const key = sharedAgentResourceKey("contracts");
  const account = createEnterpriseAccount(
    {
      username: `delegation.${tempDirectories.length}`,
      displayName: "Delegation Employee",
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
    provisionalRunId,
  });
  return { account, childRunId, childSessionKey, config, key, options };
}

afterEach(() => {
  for (const key of childSessionKeys.splice(0)) {
    revokeEnterpriseDelegationChildAuthority(key);
  }
  closeOpenClawStateDatabaseForTest();
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("enterprise delegated-child authority guard", () => {
  it("allows target tools and declared read operations without one-shot approval", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    for (const toolName of ["read", "write", "exec", "custom_unknown"]) {
      expect(
        evaluateEnterpriseDelegationToolCall({
          config,
          childSessionKey,
          childRunId,
          childAgentId: "contracts",
          toolName,
        }),
      ).toEqual({ kind: "allow" });
    }
    expect(
      evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "skill_script",
        toolParams: {
          skill: "contracts-skill",
          entrypoint: "lookup",
          operation: "get_data",
        },
      }),
    ).toEqual({ kind: "allow" });
  });

  it("routes write and unknown skill operations through common approval", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    for (const operation of ["set_data", "unclassified_operation"]) {
      expect(
        evaluateEnterpriseDelegationToolCall({
          config,
          childSessionKey,
          childRunId,
          childAgentId: "contracts",
          toolName: "skill_script",
          toolParams: {
            skill: "contracts-skill",
            entrypoint: "lookup",
            operation,
          },
        }),
      ).toMatchObject({
        kind: "require_approval",
        allowedDecisions: ["allow-once", "deny"],
      });
    }
  });

  it("keeps Personal/direct sessions separate until a Shared Agent capability is bound", () => {
    const { config } = setupAuthority();
    expect(
      evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey: "direct",
        childRunId: "direct-run",
        childAgentId: "contracts",
        toolName: "write",
      }),
    ).toEqual({ kind: "not_delegated_child" });
    expect(
      evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey: "direct",
        childRunId: "direct-run",
        childAgentId: "contracts",
        toolName: "skill_script",
      }),
    ).toEqual({ kind: "not_delegated_child" });
  });

  it("invalidates the child when target tools or skills change", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    config.agents!.entries!.contracts!.tools!.deny = ["write"];
    expect(
      evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "read",
      }),
    ).toEqual({ kind: "block", reason: "DELEGATION_CAPABILITY_CHANGED" });
  });

  it("revokes authority at the next call when the Shared Agent grant is removed", () => {
    const { account, childRunId, childSessionKey, config, key, options } = setupAuthority();
    const current = getEnterpriseAccountById(account.id, options)!;
    applyEnterpriseAccessChanges(
      [{ accountId: account.id, resourceType: "agent", resourceId: key, effect: null }],
      { [account.id]: current.policyRevision },
      options,
    );
    expect(
      evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
        toolName: "read",
      }),
    ).toEqual({ kind: "block", reason: "SHARED_AGENT_NOT_GRANTED" });
  });

  it("does not let another run reuse a child session authority", () => {
    const { childSessionKey, config } = setupAuthority();
    expect(
      evaluateEnterpriseDelegationToolCall({
        config,
        childSessionKey,
        childRunId: "another-run",
        childAgentId: "contracts",
        toolName: "write",
      }),
    ).toEqual({ kind: "not_delegated_child" });
    expect(
      isEnterpriseDelegationChildSession({
        childSessionKey,
        childRunId: "another-run",
        childAgentId: "contracts",
      }),
    ).toBe(false);
  });

  it("keeps an active child valid beyond ten minutes until terminal revocation", () => {
    const { childRunId, childSessionKey, config } = setupAuthority();
    const future = Date.now() + 10 * 60_000 + 1;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(future);
    try {
      expect(
        evaluateEnterpriseDelegationToolCall({
          config,
          childSessionKey,
          childRunId,
          childAgentId: "contracts",
          toolName: "read",
        }),
      ).toEqual({ kind: "allow" });

      revokeEnterpriseDelegationChildAuthority(childSessionKey, childRunId);
      expect(
        evaluateEnterpriseDelegationToolCall({
          config,
          childSessionKey,
          childRunId,
          childAgentId: "contracts",
          toolName: "read",
        }),
      ).toEqual({ kind: "not_delegated_child" });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("accepts the Gateway run during dispatch, then binds authority to that exact run", () => {
    const { childRunId, childSessionKey } = setupAuthority(true);
    expect(
      isEnterpriseDelegationChildSession({
        childSessionKey,
        childRunId: "gateway-run",
        childAgentId: "contracts",
      }),
    ).toBe(true);

    confirmEnterpriseDelegationChildRun({
      childSessionKey,
      anticipatedRunId: childRunId,
      actualRunId: "gateway-run",
    });

    expect(
      isEnterpriseDelegationChildSession({
        childSessionKey,
        childRunId: "gateway-run",
        childAgentId: "contracts",
      }),
    ).toBe(true);
    expect(
      isEnterpriseDelegationChildSession({
        childSessionKey,
        childRunId,
        childAgentId: "contracts",
      }),
    ).toBe(false);
  });
});
