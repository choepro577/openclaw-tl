import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { upsertSessionEntryCore } from "../../config/sessions/session-accessor.js";
import { addSessionMember } from "../../config/sessions/session-sharing-store.js";
import type { GatewayOperatorRoleDefinition } from "../../config/types.gateway.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { ensureProfileForEmail } from "../../state/user-profiles.js";
import type { TaskRecord } from "../../tasks/task-registry.types.js";
import { resetTaskRegistryForTests } from "../../tasks/task-runtime.test-helpers.js";
import {
  createOpenClawTestState,
  type OpenClawTestState,
} from "../../test-utils/openclaw-test-state.js";
import { createTaskRecord, runTaskHandler } from "./tasks.test-helpers.js";
import type { GatewayClient } from "./types.js";

let state: OpenClawTestState;

beforeEach(async () => {
  state = await createOpenClawTestState({ label: "task-authorization", scenario: "minimal" });
  resetTaskRegistryForTests();
});

afterEach(async () => {
  resetTaskRegistryForTests();
  await state.cleanup();
});

function identifiedClient(scopes: string[], profileId = "viewer@example.com"): GatewayClient {
  return {
    connect: {
      minProtocol: 1,
      maxProtocol: 1,
      client: { id: "openclaw-control-ui", version: "test", platform: "test", mode: "webchat" },
      role: "operator",
      scopes,
    },
    authenticatedUserId: "viewer@example.com",
    authenticatedUserProfile: {
      profileId,
      displayName: null,
      hasAvatar: false,
      updatedAt: 1,
    },
  };
}

describe("task Gateway authorization", () => {
  it.each(["incognito", "none", "view"] as const)(
    "enforces %s session access on indirect task selectors",
    async (access) => {
      const profileId =
        access === "incognito"
          ? "viewer@example.com"
          : ensureProfileForEmail("viewer@example.com").id;
      const foreignKey = `agent:main:dashboard:${access === "incognito" ? "incognito-" : ""}foreign`;
      const ownKey = "agent:main:own-task";
      for (const [sessionKey, actorId] of [
        [foreignKey, "owner@example.com"],
        [ownKey, profileId],
      ] satisfies [string, string][]) {
        await upsertSessionEntryCore(
          { agentId: "main", sessionKey },
          {
            sessionId: `session-${sessionKey}`,
            updatedAt: 1,
            createdActor: { type: "human", id: actorId },
            visibility: "shared",
            ...(access === "incognito" && sessionKey === foreignKey ? { incognito: true } : {}),
          },
        );
      }
      const createTask = (sessionKey: string, lastEventAt: number) =>
        createTaskRecord({
          runtime: "cli",
          requesterSessionKey: sessionKey,
          requesterAgentId: "main",
          ownerKey: sessionKey,
          scopeKind: "session",
          task: sessionKey,
          status: "running",
          deliveryStatus: "pending",
          lastEventAt,
        });
      const foreign = createTask(foreignKey, 2_000);
      const own = createTask(ownKey, 1_000);
      const guest: GatewayOperatorRoleDefinition = {
        sessions: { others: access === "none" ? "none" : "view" },
        agents: "*",
        scopes: ["operator.read", "operator.write"],
      };
      const config: OpenClawConfig =
        access === "incognito"
          ? {}
          : { gateway: { roles: { default: "guest", definitions: { guest } } } };
      const viewer = identifiedClient(["operator.read", "operator.write"], profileId);
      const taskId = foreign.taskId;
      const selection = { taskIds: [taskId] };
      const list = await runTaskHandler("tasks.list", { limit: 1 }, config, viewer);
      const visibleForeign = access === "view";
      expect(list.payload?.tasks?.map((task) => task.taskId)).toEqual([
        visibleForeign ? taskId : own.taskId,
      ]);
      expect(list.payload?.nextCursor).toBe(visibleForeign ? "1" : undefined);
      const get = await runTaskHandler("tasks.get", { taskId }, config, viewer);
      if (visibleForeign) {
        expect(get.payload?.task?.taskId).toBe(taskId);
      } else {
        expect(get.calls[0]).toMatchObject([
          false,
          undefined,
          { message: `task not found: ${taskId}` },
        ]);
      }
      const cancel = await runTaskHandler("tasks.cancel", { taskId }, config, viewer);
      expect(cancel.payload).toMatchObject({ found: false, cancelled: false });
      for (const method of ["tasks.retry", "tasks.dismiss"] as const) {
        const result = await runTaskHandler(method, selection, config, viewer);
        expect(result.payload?.results).toEqual([{ taskId, ok: false, reason: "task not found" }]);
      }
      if (visibleForeign) {
        addSessionMember(
          { agentId: "main", sessionKey: foreignKey },
          {
            identityId: profileId,
            addedBy: "owner@example.com",
            expectedSessionId: `session-${foreignKey}`,
          },
        );
        const invited = await runTaskHandler("tasks.retry", selection, config, viewer);
        expect(invited.payload?.results?.[0]?.reason).not.toBe("task not found");
      }
      const admin = await runTaskHandler(
        "tasks.get",
        { taskId },
        config,
        identifiedClient(["operator.admin"], profileId),
      );
      expect(admin.calls[0]?.[0]).toBe(true);
      expect(admin.payload?.task?.taskId).toBe(taskId);
    },
  );

  it.each(["administrator", "employee"] as const)(
    "isolates Enterprise %s task reads and mutations by session creator",
    async (accountRole) => {
      const ownKey = "agent:main:dashboard:enterprise-own";
      const foreignKey = "agent:main:dashboard:enterprise-foreign";
      const created: TaskRecord[] = [];
      for (const [sessionKey, profileId] of [
        [ownKey, "profile-a"],
        [foreignKey, "profile-b"],
      ]) {
        await upsertSessionEntryCore(
          { agentId: "main", sessionKey },
          {
            sessionId: sessionKey,
            updatedAt: 1,
            createdActor: { type: "human", id: profileId },
            visibility: "shared",
          },
        );
        created.push(
          createTaskRecord({
            runtime: "subagent",
            requesterSessionKey: sessionKey,
            requesterAgentId: "main",
            ownerKey: sessionKey,
            scopeKind: "session",
            task: "Private work",
            status: "running",
            deliveryStatus: "pending",
          }),
        );
      }
      const global = createTaskRecord({
        runtime: "cli",
        ownerKey: "global",
        scopeKind: "session",
        task: "Global work",
        status: "running",
        deliveryStatus: "pending",
      });
      const portal: GatewayClient = {
        ...identifiedClient(["operator.admin"], "profile-a"),
        internal: {
          enterpriseSession: {
            sessionId: "enterprise-a",
            audience: "user",
            accountId: "a",
            accountRole,
          },
        },
      };
      const list = await runTaskHandler("tasks.list", { sessionKey: ownKey }, {}, portal);
      expect(list.payload?.tasks?.map((task) => task.taskId)).toEqual([created[0].taskId]);
      for (const task of [created[1], global]) {
        const get = await runTaskHandler("tasks.get", { taskId: task.taskId }, {}, portal);
        expect(get.calls[0]?.[0]).toBe(false);
        const cancel = await runTaskHandler("tasks.cancel", { taskId: task.taskId }, {}, portal);
        expect(cancel.payload).toMatchObject({ found: false, cancelled: false });
        for (const method of ["tasks.retry", "tasks.dismiss"] as const) {
          const recovery = await runTaskHandler(method, { taskIds: [task.taskId] }, {}, portal);
          expect(recovery.payload?.results).toEqual([
            { taskId: task.taskId, ok: false, reason: "task not found" },
          ]);
        }
      }
      const foreignList = await runTaskHandler(
        "tasks.list",
        { sessionKey: foreignKey },
        {},
        portal,
      );
      expect(foreignList.payload?.tasks ?? []).toEqual([]);
      const own = await runTaskHandler("tasks.get", { taskId: created[0].taskId }, {}, portal);
      expect(own.payload?.task?.taskId).toBe(created[0].taskId);
      for (const method of ["tasks.retry", "tasks.dismiss"] as const) {
        const recovery = await runTaskHandler(method, { taskIds: [created[0].taskId] }, {}, portal);
        expect(recovery.payload?.results?.[0]?.reason).not.toBe("task not found");
      }
    },
  );

  it("requires a durable owner before portal cancellation can reach an orphan runtime", async () => {
    const cancellationRuntime = await import("../../tasks/task-executor-cancel.runtime.js");
    const cancel = vi
      .spyOn(cancellationRuntime, "cancelDetachedTaskRunByIdCore")
      .mockResolvedValue({ found: true, cancelled: true });
    try {
      const portal: GatewayClient = {
        ...identifiedClient(["operator.admin"], "profile-a"),
        internal: {
          enterpriseSession: {
            sessionId: "enterprise-a",
            audience: "user",
            accountId: "a",
            accountRole: "employee",
          },
        },
      };
      for (const client of [portal, { ...portal, authenticatedUserProfile: undefined }]) {
        const result = await runTaskHandler("tasks.cancel", { taskId: "orphan" }, {}, client);
        expect(result.payload).toMatchObject({ found: false, cancelled: false });
        expect(cancel).not.toHaveBeenCalled();
      }
      const operator = await runTaskHandler("tasks.cancel", { taskId: "orphan" });
      expect(operator.payload).toMatchObject({ found: true, cancelled: true });
      expect(cancel).toHaveBeenCalledOnce();
    } finally {
      cancel.mockRestore();
    }
  });
});
