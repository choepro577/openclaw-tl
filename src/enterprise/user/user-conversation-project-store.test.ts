import { afterEach, describe, expect, it } from "vitest";
import {
  loadSessionEntry,
  upsertSessionEntryCore,
} from "../../config/sessions/session-accessor.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import {
  assignEnterpriseConversationProject,
  createEnterpriseConversationProject,
  deleteEnterpriseConversationProject,
  listEnterpriseConversationProjects,
  renameEnterpriseConversationProject,
} from "./user-conversation-project-store.js";

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

describe("Enterprise conversation Project store", () => {
  it("keeps projects and assignments account-scoped", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const owner = createEnterpriseAccount({
        username: "project.owner",
        displayName: "Project Owner",
        passwordHash: "hash",
        role: "employee",
        mustChangePassword: false,
      });
      const foreign = createEnterpriseAccount({
        username: "project.foreign",
        displayName: "Project Foreign",
        passwordHash: "hash",
        role: "employee",
        mustChangePassword: false,
      });

      const project = createEnterpriseConversationProject(owner.id, {
        name: "Launch",
        idempotencyKey: "create-launch",
      });
      assignEnterpriseConversationProject(owner.id, "agent:main:launch-chat", project.id);

      expect(listEnterpriseConversationProjects(owner.id)).toEqual([
        {
          ...project,
          sessionKeys: ["agent:main:launch-chat"],
        },
      ]);
      expect(listEnterpriseConversationProjects(foreign.id)).toEqual([]);
      expect(() =>
        assignEnterpriseConversationProject(foreign.id, "agent:main:foreign-chat", project.id),
      ).toThrow("CONVERSATION_PROJECT_NOT_FOUND");
    });
  });

  it("replays creates and removes only the Project assignment on delete", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "project.lifecycle",
        displayName: "Project Lifecycle",
        passwordHash: "hash",
        role: "employee",
        mustChangePassword: false,
      });

      const created = createEnterpriseConversationProject(account.id, {
        name: "Research",
        idempotencyKey: "project-request-1",
      });
      const replayed = createEnterpriseConversationProject(account.id, {
        name: "Ignored replay name",
        idempotencyKey: "project-request-1",
      });
      expect(replayed).toEqual(created);

      const sessionKey = "agent:main:research-chat";
      await upsertSessionEntryCore(
        { agentId: "main", sessionKey },
        { sessionId: "research-session", updatedAt: 1 },
      );
      assignEnterpriseConversationProject(account.id, sessionKey, created.id);
      const renamed = renameEnterpriseConversationProject(account.id, created.id, "Discovery");
      expect(renamed).toMatchObject({
        id: created.id,
        name: "Discovery",
        sessionKeys: ["agent:main:research-chat"],
      });

      deleteEnterpriseConversationProject(account.id, created.id);
      expect(listEnterpriseConversationProjects(account.id)).toEqual([]);
      expect(loadSessionEntry({ agentId: "main", sessionKey })).toMatchObject({
        sessionId: "research-session",
      });
      expect(() => deleteEnterpriseConversationProject(account.id, created.id)).toThrow(
        "CONVERSATION_PROJECT_NOT_FOUND",
      );

      const replacement = createEnterpriseConversationProject(account.id, {
        name: "Replacement",
        idempotencyKey: "project-request-2",
      });
      expect(replacement.position).toBe(0);
      expect(replacement.sessionKeys).toEqual([]);
    });
  });

  it("persists Codex-style before-session ordering within a Project", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "project.order",
        displayName: "Project Order",
        passwordHash: "hash",
        role: "employee",
        mustChangePassword: false,
      });
      const planning = createEnterpriseConversationProject(account.id, {
        name: "Planning",
        idempotencyKey: "project-order",
      });

      assignEnterpriseConversationProject(account.id, "chat-a", planning.id);
      assignEnterpriseConversationProject(account.id, "chat-b", planning.id, null);
      assignEnterpriseConversationProject(account.id, "chat-c", planning.id, "chat-b");
      expect(listEnterpriseConversationProjects(account.id)[0]?.sessionKeys).toEqual([
        "chat-a",
        "chat-c",
        "chat-b",
      ]);

      assignEnterpriseConversationProject(account.id, "chat-b", planning.id, "chat-a");
      expect(listEnterpriseConversationProjects(account.id)[0]?.sessionKeys).toEqual([
        "chat-b",
        "chat-a",
        "chat-c",
      ]);
      expect(() =>
        assignEnterpriseConversationProject(account.id, "chat-a", planning.id, "missing-chat"),
      ).toThrow("CONVERSATION_PROJECT_PLACEMENT_INVALID");
    });
  });

  it("rejects duplicate names per account while allowing the same name for another account", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const first = createEnterpriseAccount({
        username: "project.first",
        displayName: "Project First",
        passwordHash: "hash",
        role: "employee",
        mustChangePassword: false,
      });
      const second = createEnterpriseAccount({
        username: "project.second",
        displayName: "Project Second",
        passwordHash: "hash",
        role: "employee",
        mustChangePassword: false,
      });
      createEnterpriseConversationProject(first.id, {
        name: "Operations",
        idempotencyKey: "first-operations",
      });

      expect(() =>
        createEnterpriseConversationProject(first.id, {
          name: "operations",
          idempotencyKey: "first-duplicate",
        }),
      ).toThrow("CONVERSATION_PROJECT_NAME_DUPLICATE");
      expect(
        createEnterpriseConversationProject(second.id, {
          name: "Operations",
          idempotencyKey: "second-operations",
        }).name,
      ).toBe("Operations");
    });
  });
});
