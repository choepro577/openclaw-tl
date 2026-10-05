import { describe, expect, it, vi } from "vitest";
import { upsertSessionEntryCore } from "../../../config/sessions/session-accessor.js";
import { WRITE_SCOPE } from "../../../gateway/method-scopes.js";
import { createGatewayMethodRegistry } from "../../../gateway/methods/registry.js";
import type {
  GatewayRequestContext,
  GatewayRequestHandlers,
} from "../../../gateway/server-methods/types.js";
import { dispatchGatewayMethodInProcessRaw } from "../../../gateway/server-plugin-in-process-dispatch.js";
import { createSyntheticPluginRuntimeClient } from "../../../gateway/server-plugin-runtime-client.js";
import {
  bindGatewayContextResolver,
  withPluginRuntimeGatewayContextResolver,
  withPluginRuntimeGatewayRequestScope,
} from "../../../plugins/runtime/gateway-request-scope.js";
import { withOpenClawTestState } from "../../../test-utils/openclaw-test-state.js";
import { createSubagentRunRecord } from "../../subagent-test-fixtures.test-helpers.js";
import { runDetachedCleanupAttempt } from "../registry/subagent-registry-lifecycle-cleanup.js";
import type { SubagentLifecycleCleanupContext } from "../registry/subagent-registry-lifecycle-context.js";
import { dispatchSubagentAnnounceAgent } from "./subagent-announce-delivery.runtime.js";

function createContext(handlers: GatewayRequestHandlers): GatewayRequestContext {
  return {
    deps: {},
    getRuntimeConfig: () => ({}),
    getGatewayMethodRegistry: () => createRegistry(handlers),
    logGateway: {
      warn: vi.fn(),
      error: vi.fn(),
    },
    chatAbortControllers: new Map(),
    chatQueuedTurns: new Map(),
    dedupe: new Map(),
  } as unknown as GatewayRequestContext;
}

function createRegistry(handlers: GatewayRequestHandlers) {
  return createGatewayMethodRegistry(
    Object.entries(handlers).map(([name, handler]) => ({
      name,
      handler,
      owner: { kind: "core" as const, area: "test" },
      scope: WRITE_SCOPE,
    })),
  );
}

describe("subagent announce Gateway instance dispatch", () => {
  it("authorizes detached completion to its human-owned parent under a closed session ceiling", async () => {
    await withOpenClawTestState({ scenario: "minimal" }, async () => {
      const requesterSessionKey = "agent:main:dashboard:parent";
      await upsertSessionEntryCore(
        { agentId: "main", sessionKey: requesterSessionKey },
        {
          sessionId: "parent-session",
          updatedAt: 1,
          createdActor: { type: "human", id: "parent-human" },
        },
      );
      const handler = vi.fn<GatewayRequestHandlers["agent"]>(({ respond }) =>
        respond(true, { status: "ok" }),
      );
      const context = createContext({ agent: handler });
      context.getRuntimeConfig = () => ({
        gateway: {
          roles: {
            default: "closed",
            definitions: {
              closed: { agents: ["main"], scopes: [WRITE_SCOPE], sessions: { others: "none" } },
            },
          },
        },
      });
      const entry = createSubagentRunRecord({
        runId: "completed-child",
        requesterSessionKey,
        endedAt: 4_000,
      });
      bindGatewayContextResolver(entry, () => context);
      const clearCleanupFailureCount = vi.fn();
      const lifecycle = {
        options: { runs: new Map([[entry.runId, entry]]) },
        clearCleanupFailureCount,
      } as unknown as SubagentLifecycleCleanupContext;
      let response: Awaited<ReturnType<typeof dispatchGatewayMethodInProcessRaw>> | undefined;
      withPluginRuntimeGatewayRequestScope(
        {
          context,
          client: createSyntheticPluginRuntimeClient({ scopes: [WRITE_SCOPE] }),
          isWebchatConnect: () => false,
        },
        () =>
          runDetachedCleanupAttempt(lifecycle, {
            runId: entry.runId,
            entry,
            cleanupGeneration: 1,
            run: async () => {
              response = await dispatchGatewayMethodInProcessRaw(
                "agent",
                {
                  sessionKey: requesterSessionKey,
                  message: "child result",
                  idempotencyKey: entry.runId,
                },
                { forceSyntheticClient: true, operatorRoleActor: { kind: "system" } },
              );
            },
          }),
      );
      await vi.waitFor(() => expect(clearCleanupFailureCount).toHaveBeenCalledOnce());
      expect(response).toMatchObject({ ok: true, payload: { status: "ok" } });
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  it("delivers a detached announce through its explicit instance resolver", async () => {
    const context = createContext({
      agent: ({ respond }) => respond(true, { raw: true }),
    });
    const idempotencyKey = "detached-subagent-announce";
    context.dedupe.set(`agent:${idempotencyKey}`, {
      ts: Date.now(),
      ok: true,
      payload: { runId: "announce-run", status: "ok", summary: "delivered" },
    });

    await expect(
      dispatchSubagentAnnounceAgent(
        {
          message: "Process one completed child result.",
          idempotencyKey,
        },
        {
          expectFinal: true,
          forceSyntheticClient: true,
          resolveGatewayContext: () => context,
        },
      ),
    ).resolves.toEqual({ runId: "announce-run", status: "ok", summary: "delivered" });
  });

  it("delivers through a lifecycle-fenced instance resolver scope", async () => {
    const context = createContext({
      agent: ({ respond }) => respond(true, { raw: true }),
    });
    const idempotencyKey = "scoped-subagent-announce";
    context.dedupe.set(`agent:${idempotencyKey}`, {
      ts: Date.now(),
      ok: true,
      payload: { runId: "scoped-announce-run", status: "ok", summary: "delivered" },
    });

    await expect(
      withPluginRuntimeGatewayContextResolver(
        () => context,
        () =>
          dispatchSubagentAnnounceAgent(
            {
              message: "Process one completed child result.",
              idempotencyKey,
            },
            {
              expectFinal: true,
              forceSyntheticClient: true,
            },
          ),
      ),
    ).resolves.toEqual({
      runId: "scoped-announce-run",
      status: "ok",
      summary: "delivered",
    });
  });
});
