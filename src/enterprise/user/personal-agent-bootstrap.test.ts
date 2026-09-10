import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { markGatewayRequestScopedRuntimeConfig } from "../../gateway/request-runtime-config.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { hashEnterprisePassword } from "../auth/password.js";
import {
  appendEnterpriseUserAgentBootstrap,
  buildEnterpriseDelegationTurnPrompt,
} from "./personal-agent-bootstrap.js";
import { createPersonalAgentKnowledge } from "./personal-agent-knowledge-store.js";
import { writePersonalAgentProfile } from "./personal-agent-profile-store.js";
import { writeSharedAgentRelationship } from "./shared-agent-relationship-store.js";

afterEach(() => closeOpenClawStateDatabaseForTest());

describe("Enterprise Personal Agent bootstrap", () => {
  it("binds routing instructions to the current turn, not the workspace or observer run", () => {
    const metadata = {
      enterpriseDelegation: {
        accountId: "a",
        personalAgentId: "personal-a",
        specialists: [],
        request: { sessionKey: "session-a", parentRunId: "turn-1" },
        turn: {
          outcome: "delegate" as const,
          source: "explicit" as const,
          agentNames: ["HR"],
          decisionId: "first-token",
          instruction: "Delegate using first-token",
          reasonCode: "ready",
        },
      },
    };
    const config = markGatewayRequestScopedRuntimeConfig({}, metadata);
    const context = { config, agentId: "personal-a", sessionKey: "session-a", runId: "turn-1" };
    const first = buildEnterpriseDelegationTurnPrompt(context);
    expect(first).toContain("first-token");
    expect(first).toContain("Follow the authorized enterprise_delegate tool description");
    expect(first).not.toContain("sessions_yield");
    expect(first).toContain("including unverified pagination");
    expect(first).toContain("do not relabel a grade as a job title");
    expect(first).toContain("A local routing outcome does not authorize an alternate source");
    expect(first).toContain("After cancellation, ambiguous assent must clarify the intended task");
    expect(first).not.toContain("host-owned execution");
    expect(first).not.toContain("enterprise_delegate accepts");
    expect(first).toContain(
      "sourced company rules, calculations, proposals, and points needing confirmation",
    );
    expect(first).toContain("warranty");
    expect(first).toContain("Do not invent an exception");
    for (const overrides of [
      { agentId: "shared" },
      { sessionKey: "session-b" },
      { runId: "observer" },
      { runId: undefined },
    ]) {
      expect(buildEnterpriseDelegationTurnPrompt({ ...context, ...overrides })).toBe("");
    }
    metadata.enterpriseDelegation.request.parentRunId = "turn-2";
    metadata.enterpriseDelegation.turn.instruction = "Ask which task to handle first";
    expect(buildEnterpriseDelegationTurnPrompt(context)).toBe("");
    const next = buildEnterpriseDelegationTurnPrompt({ ...context, runId: "turn-2" });
    expect(next).toContain("Ask which task");
    expect(next).not.toContain("first-token");
  });

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
            username: account.username,
            displayName: account.displayName,
            personalAgentId: "personal-user-a",
            personalAgentTemplateId: "main",
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
      expect(shared[0]?.content).toContain("Enterprise username: employee.personal-bootstrap");
      expect(shared[0]?.content).toContain("### How to address the user\nHieu");
      expect(personal).toHaveLength(1);
      expect(personal[0]?.name).toBe("USER.md");
      expect(personal[0]?.content).toContain("Use actionable checklists.");
      expect(personal[0]?.content).toContain("Enterprise username: employee.personal-bootstrap");
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
                username: account.username,
                displayName: account.displayName,
                personalAgentId: `personal-${account.id}`,
                personalAgentTemplateId: "main",
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
