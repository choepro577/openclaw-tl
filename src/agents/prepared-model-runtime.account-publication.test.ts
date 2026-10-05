// Preserve module setup before modules that consume it.
// oxfmt-ignore
import {
  getPreparedModelRuntimeMocks,
  resetPreparedModelRuntimeHarness,
} from "./prepared-model-runtime.test-harness.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  markGatewayRequestScopedRuntimeConfig,
  readGatewayRequestRuntimeMetadata,
} from "../gateway/request-runtime-config.js";
import {
  acquireAgentRunPreparedModelRuntime,
  loadPreparedModelRuntimeSnapshot,
  markPreparedModelRuntimeSnapshotsStale,
  prepareModelRuntimeSnapshot,
  registerPreparedModelRuntimePublicationListener,
  refreshPreparedModelRuntimeSnapshots,
} from "./prepared-model-runtime.js";

const mocks = getPreparedModelRuntimeMocks();

describe("prepared model runtime account publication", () => {
  beforeEach(() => {
    resetPreparedModelRuntimeHarness();
  });

  it("keeps replacement readers waiting when committed ownership immediately refreshes auth", async () => {
    mocks.configuredAgentIds = ["default"];
    const initialConfig = {};
    const replacementConfig = { agents: { defaults: { model: "openai/gpt-5.5" } } };
    const input = {
      agentId: "default",
      agentDir: "/tmp/unused-agent",
      inheritedAuthDir: "/tmp/unused-agent",
      workspaceDir: "/tmp/unused-workspace",
    };
    await refreshPreparedModelRuntimeSnapshots(initialConfig, { gatewayLifecycle: true });
    let finishConfigRefresh: (() => void) | undefined;
    let finishAuthRefresh: (() => void) | undefined;
    mocks.ensureOpenClawModelsJson
      .mockImplementationOnce(
        async () =>
          await new Promise<{ agentDir: string; wrote: false }>((resolve) => {
            finishConfigRefresh = () => resolve({ agentDir: input.agentDir, wrote: false });
          }),
      )
      .mockImplementationOnce(
        async () =>
          await new Promise<{ agentDir: string; wrote: false }>((resolve) => {
            finishAuthRefresh = () => resolve({ agentDir: input.agentDir, wrote: false });
          }),
      );
    let authInvalidated = false;
    let finishAuthPublication!: () => void;
    const authPublication = new Promise<void>((resolve) => {
      finishAuthPublication = resolve;
    });
    const unregister = registerPreparedModelRuntimePublicationListener((event) => {
      if (event.phase !== "published") {
        return;
      }
      if (!authInvalidated) {
        authInvalidated = true;
        mocks.mutationListener?.({ agentDir: input.agentDir, affectsInheritedStores: false });
      } else {
        finishAuthPublication();
      }
    });
    const replacement = refreshPreparedModelRuntimeSnapshots(replacementConfig, {
      gatewayLifecycle: true,
    });
    const read = loadPreparedModelRuntimeSnapshot({ ...input, config: initialConfig });
    let readSettled = false;
    void read.then(
      () => {
        readSettled = true;
      },
      () => {
        readSettled = true;
      },
    );
    try {
      await vi.waitFor(() => expect(finishConfigRefresh).toBeDefined());
      finishConfigRefresh?.();
      await replacement;
      await vi.waitFor(() => expect(finishAuthRefresh).toBeDefined());
      expect(readSettled).toBe(false);
      finishAuthRefresh?.();
      await expect(read).resolves.toMatchObject({ config: replacementConfig });
    } finally {
      finishConfigRefresh?.();
      finishAuthRefresh?.();
      await Promise.allSettled([replacement, read]);
      await authPublication;
      unregister();
    }
  });

  it.each([
    { agentId: "main", duringReplacement: false },
    { agentId: "main", duringReplacement: true },
    { agentId: "enterprise-personal-account", duringReplacement: false },
    { agentId: "enterprise-personal-account", duringReplacement: true },
  ])(
    "preserves marked account ownership for $agentId with replacement=$duringReplacement",
    async ({ agentId, duringReplacement }) => {
      mocks.configuredAgentIds = ["main"];
      mocks.configuredAgentDirs.set("main", "/tmp/global-main-agent");
      mocks.configuredWorkspaces.set("main", "/tmp/global-main-workspace");
      const globalConfig = { messages: { responsePrefix: "global" } };
      await refreshPreparedModelRuntimeSnapshots(globalConfig, { gatewayLifecycle: true });

      const accountConfig = markGatewayRequestScopedRuntimeConfig(
        { messages: { responsePrefix: "account" } },
        {
          enterpriseDelegation: {
            accountId: "account",
            personalAgentId: agentId,
            specialists: [],
            request: { sessionKey: "enterprise-personal-account", parentRunId: "account-run" },
          },
        },
      );
      if (duringReplacement) {
        markPreparedModelRuntimeSnapshotsStale("account run arrives during replacement", {
          waitForReplacement: true,
        });
      }
      const pendingLease = acquireAgentRunPreparedModelRuntime({
        agentId,
        agentDir: "/tmp/global-main-agent",
        config: accountConfig,
        inheritedAuthDir: "/tmp/global-main-agent",
        workspaceDir: "/tmp/account-main-workspace",
      });
      const replacement = duringReplacement
        ? refreshPreparedModelRuntimeSnapshots(globalConfig, { gatewayLifecycle: true })
        : Promise.resolve();
      const [leaseResult, replacementResult] = await Promise.allSettled([
        pendingLease,
        replacement,
      ]);
      expect(replacementResult.status).toBe("fulfilled");
      if (leaseResult.status === "rejected") {
        throw leaseResult.reason;
      }
      const lease = leaseResult.value;
      try {
        expect(lease.snapshot).toMatchObject({
          agentId,
          agentDir: "/tmp/global-main-agent",
          config: accountConfig,
          workspaceDir: "/tmp/account-main-workspace",
        });
        expect(lease.snapshot.config).toBe(accountConfig);
        expect(
          readGatewayRequestRuntimeMetadata(lease.snapshot.config)?.enterpriseDelegation?.request
            ?.parentRunId,
        ).toBe("account-run");
      } finally {
        lease.release();
      }
      await expect(
        prepareModelRuntimeSnapshot({
          agentId: "main",
          agentDir: "/tmp/global-main-agent",
          config: globalConfig,
        }),
      ).resolves.toMatchObject({
        config: globalConfig,
        workspaceDir: "/tmp/global-main-workspace",
      });
    },
  );
});
