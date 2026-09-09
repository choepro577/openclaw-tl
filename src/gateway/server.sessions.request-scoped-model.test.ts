import { describe, expect, it, vi } from "vitest";
import { loadSessionEntry, upsertSessionEntryCore } from "../config/sessions/session-accessor.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { withOpenClawTestState } from "../test-utils/openclaw-test-state.js";
import { markGatewayRequestScopedRuntimeConfig } from "./request-runtime-config.js";
import { sessionMutationHandlers } from "./server-methods/sessions-mutations.js";
import { registerGatewayModelCatalogPrivateAccess } from "./server-model-catalog-auth.js";

describe("request-scoped session model catalogs", () => {
  it("uses the projected personal agent owner when patching its model", async () => {
    await withOpenClawTestState({ scenario: "minimal" }, async (state) => {
      const agentId = "enterprise-personal-test";
      const sessionKey = `agent:${agentId}:dashboard:test`;
      const cfg = markGatewayRequestScopedRuntimeConfig({
        agents: {
          defaults: {
            model: { primary: "openai/gpt-5.6-sol" },
            models: {
              "openai/gpt-5.6-sol": {},
              "openai/gpt-5.6-luna": {},
            },
          },
          entries: { [agentId]: { workspace: state.workspaceDir } },
        },
      });
      await upsertSessionEntryCore(
        { agentId, sessionKey },
        {
          sessionId: "personal-session",
          providerOverride: "openai",
          modelOverride: "gpt-5.6-sol",
          updatedAt: 1,
        },
      );

      const loadGatewayModelCatalog = vi.fn(async () => {
        throw new Error(`published model catalog owner did not identify ${agentId}`);
      });
      const loadGatewayModelCatalogSnapshot = vi.fn();
      const loadDeferred = vi.fn(async (params?: { agentId?: string; config?: OpenClawConfig }) => {
        expect(params?.agentId).toBe(agentId);
        expect(params?.config).toBe(cfg);
        return {
          agentId,
          agentDir: "/tmp/personal-agent",
          workspaceDir: state.workspaceDir,
          config: cfg,
          catalogComplete: true,
          entries: [
            { provider: "openai", id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
            { provider: "openai", id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
          ],
          routeVariants: [],
          authModes: {},
          authStore: { version: 1, profiles: {} },
          metadataSnapshot: {},
          authMaterializations: [],
        } as never;
      });
      registerGatewayModelCatalogPrivateAccess(loadGatewayModelCatalogSnapshot, {
        loadDeferred,
        readPrepared: vi.fn(),
      });

      const respond = vi.fn();
      await sessionMutationHandlers["sessions.patch"]!({
        params: { key: sessionKey, model: "openai/gpt-5.6-luna" },
        respond,
        context: {
          getRuntimeConfig: () => cfg,
          loadGatewayModelCatalog,
          loadGatewayModelCatalogSnapshot,
          broadcastToConnIds: vi.fn(),
          getSessionEventSubscriberConnIds: () => new Set(),
          chatAbortControllers: new Map(),
          chatQueuedTurns: new Map(),
          dedupe: new Map(),
        },
      } as never);

      expect(respond.mock.calls[0]?.[0]).toBe(true);
      expect(loadGatewayModelCatalog).not.toHaveBeenCalled();
      expect(loadDeferred).toHaveBeenCalledOnce();
      expect(loadSessionEntry({ agentId, sessionKey })).toMatchObject({
        providerOverride: "openai",
        modelOverride: "gpt-5.6-luna",
      });
    });
  });
});
