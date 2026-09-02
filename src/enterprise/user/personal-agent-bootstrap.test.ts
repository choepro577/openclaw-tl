import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { markGatewayRequestScopedRuntimeConfig } from "../../gateway/request-runtime-config.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { hashEnterprisePassword } from "../auth/password.js";
import { appendEnterpriseUserAgentBootstrap } from "./personal-agent-bootstrap.js";
import { createPersonalAgentKnowledge } from "./personal-agent-knowledge-store.js";
import { writePersonalAgentProfile } from "./personal-agent-profile-store.js";
import { writeSharedAgentRelationship } from "./shared-agent-relationship-store.js";

afterEach(() => closeOpenClawStateDatabaseForTest());

describe("Enterprise Personal Agent bootstrap", () => {
  it("injects account personalization only into the synthetic Personal runtime", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const account = createEnterpriseAccount({
        username: "employee.personal-bootstrap",
        displayName: "Hieu",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      writePersonalAgentProfile(account.id, 0, {
        name: "My assistant",
        avatarPreset: "sparkles",
        greeting: "Hello",
        tone: "concise",
        responseLength: "brief",
        language: "vi",
        customInstructions: "Use actionable checklists.",
        preferredName: "Hieu",
        workContext: "Enterprise product delivery",
        preferences: "Lead with outcomes",
      });
      createPersonalAgentKnowledge(account.id, {
        title: "Team glossary",
        kind: "note",
        sourceName: null,
        content: "Falcon means the internal release train.",
      });
      const config = markGatewayRequestScopedRuntimeConfig(
        { enterprise: { enabled: true } } satisfies OpenClawConfig,
        {
          enterpriseUser: {
            accountId: account.id,
            displayName: account.displayName,
            personalAgentId: "personal-user-a",
          },
        },
      );

      const personal = appendEnterpriseUserAgentBootstrap({
        files: [],
        workspaceDir: state.workspaceDir,
        config,
        agentId: "personal-user-a",
      });
      const shared = appendEnterpriseUserAgentBootstrap({
        files: [],
        workspaceDir: state.workspaceDir,
        config,
        agentId: "shared-template",
      });

      expect(shared).toHaveLength(1);
      expect(shared[0]?.content).toContain("private to this account and this Agent");
      expect(shared[0]?.content).toContain("### How to address the user\nHieu");
      expect(personal).toHaveLength(1);
      expect(personal[0]?.name).toBe("USER.md");
      expect(personal[0]?.content).toContain("Use actionable checklists.");
      expect(personal[0]?.content).toContain("Falcon means the internal release train.");
      expect(personal[0]?.content).toContain("untrusted reference data");
      expect(personal[0]?.content).toContain("Organization policy");
    });
  });

  it("injects a different shared-Agent relationship for each account", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const first = createEnterpriseAccount({
        username: "relationship.first",
        displayName: "First User",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const second = createEnterpriseAccount({
        username: "relationship.second",
        displayName: "Second User",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      writeSharedAgentRelationship(first.id, "research", 0, {
        agentAlias: "Mây",
        agentSelfReference: "em",
        userAddress: "anh Minh",
        customInstructions: "Use a warm tone.",
      });
      writeSharedAgentRelationship(second.id, "research", 0, {
        agentAlias: "Atlas",
        agentSelfReference: "tôi",
        userAddress: "chị Lan",
        customInstructions: "Lead with evidence.",
      });
      const forAccount = (account: typeof first) =>
        appendEnterpriseUserAgentBootstrap({
          files: [],
          workspaceDir: state.workspaceDir,
          agentId: "research",
          config: markGatewayRequestScopedRuntimeConfig(
            { enterprise: { enabled: true } } satisfies OpenClawConfig,
            {
              enterpriseUser: {
                accountId: account.id,
                displayName: account.displayName,
                personalAgentId: `personal-${account.id}`,
              },
            },
          ),
        })[0]?.content;

      expect(forAccount(first)).toContain("Mây");
      expect(forAccount(first)).toContain("anh Minh");
      expect(forAccount(first)).not.toContain("Atlas");
      expect(forAccount(second)).toContain("Atlas");
      expect(forAccount(second)).toContain("chị Lan");
      expect(forAccount(second)).not.toContain("Mây");
    });
  });
});
