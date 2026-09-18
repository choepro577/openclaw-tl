// Enterprise sandbox projection tests cover safe defaults and administrator overrides.
import { afterEach, describe, expect, it } from "vitest";
import { resolveSandboxConfigForAgent } from "../../agents/sandbox/config.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { hashEnterprisePassword } from "../auth/password.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { projectEnterpriseRuntimeConfig } from "./enterprise-gateway-policy.js";

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

describe("enterprise sandbox safety limits", () => {
  it("applies safe defaults while preserving global and per-agent overrides", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "administrator.sandbox-limits",
        displayName: "Sandbox limits",
        personalAgentEnabled: true,
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "administrator",
        mustChangePassword: false,
      });
      const defaultsConfig: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: { entries: { main: {} } },
      };
      const defaultsProjected = projectEnterpriseRuntimeConfig(defaultsConfig, account, {
        userAudience: true,
      });
      const personalAgentId = resolveEnterprisePersonalAgentId(defaultsConfig, account);

      expect(resolveSandboxConfigForAgent(defaultsProjected, personalAgentId)).toMatchObject({
        scope: "session",
        docker: { memory: "1g", memorySwap: "1g", pidsLimit: 256 },
        browser: { maxRunningContainers: 3 },
        prune: { idleHours: 0.25 },
      });

      const overrideConfig: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        agents: {
          defaults: {
            sandbox: {
              docker: { memory: "2g", memorySwap: "2g", pidsLimit: 384 },
              browser: { maxRunningContainers: 4 },
              prune: { idleHours: 0.5 },
            },
          },
          entries: {
            main: {
              sandbox: {
                docker: { memory: "3g" },
                browser: { maxRunningContainers: 5 },
                prune: { idleHours: 1 },
              },
            },
          },
        },
      };
      const overrideProjected = projectEnterpriseRuntimeConfig(overrideConfig, account, {
        userAudience: true,
      });
      const overridePersonalId = resolveEnterprisePersonalAgentId(overrideConfig, account);

      expect(resolveSandboxConfigForAgent(overrideProjected, overridePersonalId)).toMatchObject({
        scope: "session",
        docker: { memory: "3g", memorySwap: "2g", pidsLimit: 384 },
        browser: { maxRunningContainers: 5 },
        prune: { idleHours: 1 },
      });
    });
  });
});
