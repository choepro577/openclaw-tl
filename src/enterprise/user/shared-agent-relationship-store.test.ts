import { afterEach, describe, expect, it } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { hashEnterprisePassword } from "../auth/password.js";
import {
  readSharedAgentRelationship,
  writeSharedAgentRelationship,
} from "./shared-agent-relationship-store.js";

afterEach(() => closeOpenClawStateDatabaseForTest());

describe("Enterprise shared Agent relationships", () => {
  it("isolates aliases and address preferences by account and Agent id", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const first = createEnterpriseAccount({
        username: "relationship.store.first",
        displayName: "First User",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const second = createEnterpriseAccount({
        username: "relationship.store.second",
        displayName: "Second User",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });

      const firstSaved = writeSharedAgentRelationship(first.id, "research", 0, {
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

      expect(readSharedAgentRelationship(first.id, "research", first.displayName)).toMatchObject({
        agentAlias: "Mây",
        userAddress: "anh Minh",
        revision: 1,
      });
      expect(readSharedAgentRelationship(second.id, "research", second.displayName)).toMatchObject({
        agentAlias: "Atlas",
        userAddress: "chị Lan",
        revision: 1,
      });
      expect(readSharedAgentRelationship(first.id, "legal", first.displayName)).toMatchObject({
        agentAlias: "",
        userAddress: "First User",
        revision: 0,
      });
      expect(() =>
        writeSharedAgentRelationship(first.id, "research", 0, {
          agentAlias: "Stale",
          agentSelfReference: firstSaved.agentSelfReference,
          userAddress: firstSaved.userAddress,
          customInstructions: firstSaved.customInstructions,
        }),
      ).toThrow("SHARED_RELATIONSHIP_REVISION_CONFLICT:1");
    });
  });
});
