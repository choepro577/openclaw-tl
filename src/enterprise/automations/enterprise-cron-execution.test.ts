import { afterEach, describe, expect, it } from "vitest";
import { resolveAgentConfig } from "../../agents/agent-scope.js";
import { resolveSandboxConfigForAgent } from "../../agents/sandbox/config.js";
import { resolveSandboxRuntimeStatus } from "../../agents/sandbox/runtime-status.js";
import { isToolAllowed } from "../../agents/sandbox/tool-policy.js";
import { resolveEffectiveToolInventory } from "../../agents/tools-effective-inventory.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { CronJob } from "../../cron/types.js";
import { readGatewayRequestRuntimeMetadata } from "../../gateway/request-runtime-config.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount, updateEnterpriseAccount } from "../accounts/account-store.js";
import { writeEnterpriseAccountToolPolicy } from "../accounts/account-tool-policy-store.js";
import { hashEnterprisePassword } from "../auth/password.js";
import { replaceEnterpriseEntitlements } from "../entitlements/entitlement-store.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { resolveEnterpriseCronExecution } from "./enterprise-cron-execution.js";
import { enterpriseCronOwnerSessionKey } from "./enterprise-cron-owner.js";

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

function enterpriseJob(accountId: string, agentId: string): CronJob {
  return {
    id: "enterprise-job",
    name: "Enterprise job",
    enabled: true,
    createdAtMs: 1,
    updatedAtMs: 1,
    schedule: { kind: "every", everyMs: 60_000 },
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: { kind: "agentTurn", message: "run" },
    agentId,
    owner: {
      accountId,
      agentId,
      sessionKey: enterpriseCronOwnerSessionKey(accountId),
    },
    state: {},
  };
}

describe("Enterprise cron execution policy", () => {
  it("keeps an administrator personal agent available when its automation runs", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "administrator.automation",
        displayName: "Administrator Automation",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "administrator",
        mustChangePassword: false,
        personalAgentEnabled: true,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        gateway: { auth: { mode: "accounts" } },
        agents: {
          defaults: {
            sandbox: { mode: "off", backend: "ssh", docker: { network: "bridge" } },
          },
          entries: { main: { workspace: state.workspaceDir } },
        },
      };
      const personalAgentId = resolveEnterprisePersonalAgentId(config, account);
      const job = enterpriseJob(account.id, personalAgentId);
      writeEnterpriseAccountToolPolicy(account.id, 0, {
        profile: "full",
        alsoAllow: ["web_search"],
        deny: ["write"],
      });

      const execution = resolveEnterpriseCronExecution({
        job,
        agentId: personalAgentId,
        runtimeConfig: config,
      });
      expect(execution).toMatchObject({
        createdActor: {
          type: "human",
          id: account.profileId,
          label: "Administrator Automation",
        },
      });
      expect(readGatewayRequestRuntimeMetadata(execution.cfg)).toEqual({
        enterpriseUser: {
          accountId: account.id,
          username: account.username,
          displayName: "Administrator Automation",
          personalAgentId,
          personalAgentTemplateId: "main",
        },
      });
      const inventory = resolveEffectiveToolInventory({
        cfg: execution.cfg,
        agentId: personalAgentId,
        modelApi: null,
      });
      const effectiveToolIds = inventory.groups.flatMap((group) =>
        group.tools.map((tool) => tool.id),
      );
      expect(effectiveToolIds).toContain("web_search");
      expect(effectiveToolIds).not.toContain("write");
      expect(effectiveToolIds).not.toContain("gateway");
      expect(resolveAgentConfig(execution.cfg, personalAgentId)?.sandbox).toMatchObject({
        mode: "all",
        backend: "docker",
        scope: "session",
        workspaceAccess: "rw",
      });
      expect(resolveSandboxConfigForAgent(execution.cfg, personalAgentId).docker.network).toBe(
        "bridge",
      );
      const sandboxRuntime = resolveSandboxRuntimeStatus({
        cfg: execution.cfg,
        agentId: personalAgentId,
        sessionKey: `agent:${personalAgentId}:enterprise-cron`,
      });
      expect(sandboxRuntime.sandboxed).toBe(true);
      expect(isToolAllowed(sandboxRuntime.toolPolicy, "web_search")).toBe(true);
      expect(isToolAllowed(sandboxRuntime.toolPolicy, "web_fetch")).toBe(true);
      expect(isToolAllowed(sandboxRuntime.toolPolicy, "gateway")).toBe(false);
    });
  });

  it("reloads account status and current agent entitlement before each run", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "employee.automation",
        displayName: "Automation Owner",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
        personalAgentEnabled: false,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true },
        gateway: { auth: { mode: "accounts" } },
        agents: { entries: { shared: { workspace: state.workspaceDir } } },
      };
      replaceEnterpriseEntitlements(account.id, [
        { resourceType: "agent", resourceId: "agent:shared:shared", effect: "allow" },
      ]);
      const job = enterpriseJob(account.id, "shared");

      expect(
        resolveEnterpriseCronExecution({ job, agentId: "shared", runtimeConfig: config }),
      ).toMatchObject({
        createdActor: { type: "human", id: account.profileId, label: "Automation Owner" },
      });

      replaceEnterpriseEntitlements(account.id, []);
      expect(() =>
        resolveEnterpriseCronExecution({ job, agentId: "shared", runtimeConfig: config }),
      ).toThrow("agent entitlement was revoked");

      updateEnterpriseAccount(account.id, { enabled: false });
      expect(() =>
        resolveEnterpriseCronExecution({ job, agentId: "shared", runtimeConfig: config }),
      ).toThrow("owner is disabled or unavailable");
    });
  });
});
