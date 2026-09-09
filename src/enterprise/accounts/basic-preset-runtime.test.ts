import { afterEach, describe, expect, it } from "vitest";
import { resolveAgentConfig } from "../../agents/agent-scope.js";
import {
  isToolAllowed,
  resolveSandboxToolPolicyForAgent,
} from "../../agents/sandbox/tool-policy.js";
import { isToolAllowedByPolicyName } from "../../agents/tool-policy-match.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { listEnterpriseToolCatalog } from "../catalog/enterprise-catalog.js";
import { resolveEnterpriseResourceAccess } from "../entitlements/entitlement-store.js";
import { BASIC_TOOL_IDS } from "../entitlements/resource-keys.js";
import { projectEnterpriseRuntimeConfig } from "../isolation/enterprise-gateway-policy.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import {
  createEnterpriseAccount,
  getEnterpriseAccountById,
  updateEnterpriseAccount,
} from "./account-store.js";
import {
  readEnterpriseAccountToolPolicy,
  writeEnterpriseAccountToolPolicy,
} from "./account-tool-policy-store.js";

afterEach(() => closeOpenClawStateDatabaseForTest());

describe("basic preset end-to-end permission projection", () => {
  it("shows all preset permissions even without an active agent, separately from readiness", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "catalog.basic",
        displayName: "Catalog",
        passwordHash: "test-only",
        role: "employee",
      });
      const result = listEnterpriseToolCatalog(
        { browser: { enabled: false }, agents: { entries: {} } },
        account,
      );
      const ids = new Set(result.items.map((item) => item.toolId));
      for (const tool of BASIC_TOOL_IDS) expect(ids.has(tool), `${tool}: visible`).toBe(true);
      const browser = result.items.find((item) => item.toolId === "browser");
      expect(browser).toMatchObject({
        intrinsicStatus: "disabled",
        setupReason: "browser_disabled",
        effectiveAccess: { permissionAllowed: true, effectiveAllowed: true },
      });
      const swarm = result.items.find((item) => item.toolId === "agents_wait");
      expect(swarm).toMatchObject({
        intrinsicStatus: "disabled",
        setupReason: "swarm_disabled",
        effectiveAccess: { permissionAllowed: true },
      });
    });
  });

  it("passes all 32 through account, personal agent and sandbox, then revokes and reapplies", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "runtime.basic",
        displayName: "Basic",
        passwordHash: "test-only",
        role: "employee",
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        tools: {
          profile: "minimal",
          allow: ["read"],
          sandbox: { tools: { allow: ["read"], deny: ["*", "browser", "group:web"] } },
        },
        agents: {
          entries: {
            main: {
              tools: {
                profile: "minimal",
                allow: ["read"],
                sandbox: { tools: { allow: ["read"], deny: ["*"] } },
              },
            },
          },
        },
      };
      const original = structuredClone(config);
      const id = resolveEnterprisePersonalAgentId(config, account);
      const projected = projectEnterpriseRuntimeConfig(config, account, { userAudience: true });
      const personal = resolveAgentConfig(projected, id);
      const sandbox = resolveSandboxToolPolicyForAgent(projected, id);
      for (const tool of BASIC_TOOL_IDS) {
        expect(
          resolveEnterpriseResourceAccess(account, "tool", tool).allowed,
          `${tool}: authority`,
        ).toBe(true);
        expect(isToolAllowedByPolicyName(tool, projected.tools), `${tool}: global`).toBe(true);
        expect(isToolAllowedByPolicyName(tool, personal?.tools), `${tool}: agent`).toBe(true);
        expect(isToolAllowed(sandbox, tool), `${tool}: sandbox`).toBe(true);
      }
      for (const tool of ["gateway", "sessions_spawn", "sessions_list", "future_unknown_tool"]) {
        expect(isToolAllowedByPolicyName(tool, projected.tools), `${tool}: outside preset`).toBe(
          false,
        );
      }
      expect(config).toEqual(original);
      writeEnterpriseAccountToolPolicy(account.id, 0, {
        profile: null,
        alsoAllow: [],
        deny: ["browser"],
      });
      const revoked = projectEnterpriseRuntimeConfig(
        config,
        getEnterpriseAccountById(account.id)!,
        { userAudience: true },
      );
      expect(isToolAllowedByPolicyName("browser", revoked.tools)).toBe(false);
      expect(isToolAllowed(resolveSandboxToolPolicyForAgent(revoked, id), "browser")).toBe(false);
      updateEnterpriseAccount(account.id, { applyAccessPreset: true, config });
      expect(readEnterpriseAccountToolPolicy(account.id).deny).not.toContain("browser");
      const reapplied = projectEnterpriseRuntimeConfig(
        config,
        getEnterpriseAccountById(account.id)!,
        { userAudience: true },
      );
      expect(isToolAllowedByPolicyName("browser", reapplied.tools)).toBe(true);
      expect(isToolAllowed(resolveSandboxToolPolicyForAgent(reapplied, id), "browser")).toBe(true);
    });
  });
});
