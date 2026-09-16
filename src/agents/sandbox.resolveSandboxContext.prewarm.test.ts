// Covers prewarm coalescing and lifecycle ownership at the context boundary.
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { registerSandboxBackend } from "./sandbox/backend.js";
import type { CreateSandboxBackendParams } from "./sandbox/backend.types.js";
import { prewarmSandboxForSession, resolveSandboxContext } from "./sandbox/context.js";
import { useSandboxFixtureDir } from "./sandbox/resolve-context.test-helpers.js";
import { resolveReadOnlyWorkspaceSkillMounts } from "./sandbox/workspace-mounts.js";

const updateRegistryMock = vi.hoisted(() => vi.fn());
const readRegisteredSandboxRuntimeIdsMock = vi.hoisted(() => vi.fn(async () => [] as string[]));
const syncSkillsToWorkspaceMock = vi.hoisted(() => vi.fn(async () => []));
const ensureSandboxBrowserMock = vi.hoisted(() => vi.fn(async () => null));
const resolveNodeExecEligibilityMock = vi.hoisted(() => vi.fn(() => ({ canExec: false })));
const browserControlAuthMock = vi.hoisted(() => ({
  ensureBrowserControlAuth: vi.fn(async () => ({ auth: { token: "test-browser-token" } })),
  resolveBrowserControlAuth: vi.fn(() => ({ token: "test-browser-token" })),
}));
const browserProfilesMock = vi.hoisted(() => ({
  DEFAULT_BROWSER_EVALUATE_ENABLED: true,
  resolveBrowserConfig: vi.fn(() => ({
    evaluateEnabled: true,
    ssrfPolicy: { dangerouslyAllowPrivateNetwork: true },
  })),
}));
const containerEngineMocks = vi.hoisted(() => ({
  resolvePodmanSandboxRuntimeInfo: vi.fn(),
}));

vi.mock("./sandbox/registry.js", () => ({
  readRegisteredSandboxRuntimeIds: readRegisteredSandboxRuntimeIdsMock,
  updateRegistry: updateRegistryMock,
}));

vi.mock("./sandbox/browser.js", () => ({
  ensureSandboxBrowser: ensureSandboxBrowserMock,
}));

vi.mock("../plugin-sdk/browser-control-auth.js", () => browserControlAuthMock);

vi.mock("../plugin-sdk/browser-profiles.js", () => browserProfilesMock);

vi.mock("./sandbox/docker.js", async () => {
  const actual = await vi.importActual<typeof import("./sandbox/docker.js")>("./sandbox/docker.js");
  return {
    ...actual,
    resolvePodmanSandboxRuntimeInfo: containerEngineMocks.resolvePodmanSandboxRuntimeInfo,
  };
});

vi.mock("./exec-defaults.js", () => ({
  resolveNodeExecEligibility: resolveNodeExecEligibilityMock,
}));

vi.mock("../skills/runtime/remote.js", () => ({
  getRemoteSkillEligibility: vi.fn(() => ({ note: "test-remote" })),
}));

vi.mock("../skills/loading/workspace-skill-sync.runtime.js", () => ({
  syncWorkspaceSkills: syncSkillsToWorkspaceMock,
}));

const createSandboxFixtureDir = useSandboxFixtureDir();

describe("sandbox context prewarm", () => {
  it("provisions the cold skill mount while coalescing same-session backend acquisition", async () => {
    updateRegistryMock.mockClear();
    syncSkillsToWorkspaceMock.mockClear();
    readRegisteredSandboxRuntimeIdsMock.mockResolvedValue([]);
    let releaseBackend = () => undefined;
    const backendReady = new Promise<void>((resolve) => {
      releaseBackend = resolve;
    });
    let signalBackendStarted!: () => void;
    const backendStarted = new Promise<void>((resolve) => {
      signalBackendStarted = resolve;
    });
    let provisionedMounts: ReturnType<typeof resolveReadOnlyWorkspaceSkillMounts> = [];
    const backendFactory = vi.fn(async (input: CreateSandboxBackendParams) => {
      provisionedMounts = resolveReadOnlyWorkspaceSkillMounts({
        ...input,
        workdir: "/workspace",
        workspaceAccess: input.cfg.workspaceAccess,
      });
      signalBackendStarted();
      await backendReady;
      return {
        id: "coalesced-backend",
        runtimeId: "coalesced-runtime",
        runtimeLabel: "Coalesced Runtime",
        workdir: "/workspace",
        buildExecSpec: async () => ({
          argv: ["coalesced-backend", "exec"],
          env: process.env,
          stdinMode: "pipe-closed" as const,
        }),
        runShellCommand: async () => ({
          stdout: Buffer.alloc(0),
          stderr: Buffer.alloc(0),
          code: 0,
        }),
      };
    });
    const restore = registerSandboxBackend("coalesced-backend", {
      factory: backendFactory,
      resolveWorkdir: () => "/workspace",
    });
    let prewarm: Promise<boolean> | undefined;
    let active: ReturnType<typeof resolveSandboxContext> | undefined;
    try {
      const cfg: OpenClawConfig = {
        agents: {
          defaults: {
            sandbox: {
              mode: "all",
              backend: "coalesced-backend",
              scope: "session",
              workspaceAccess: "rw",
              prune: { idleHours: 0, maxAgeDays: 0 },
            },
          },
        },
      };
      const params = {
        config: cfg,
        sessionKey: "agent:worker:coalesced",
        workspaceDir: await createSandboxFixtureDir("coalesced"),
      };
      prewarm = prewarmSandboxForSession(params);
      // The scheduler has no foreground skill snapshot. The actual turn does,
      // so the stable runtime promise must still be shared while the turn
      // refreshes its own skill facts.
      active = resolveSandboxContext({
        ...params,
        skillsSnapshot: { prompt: "active skills", skills: [], version: 7 },
      });

      await backendStarted;
      expect(backendFactory).toHaveBeenCalledOnce();
      expect(provisionedMounts).toContainEqual({
        hostPath: expect.stringMatching(/[\\/]skills$/),
        containerPath: "/workspace/.openclaw/sandbox-skills/skills",
      });
      releaseBackend();
      await Promise.all([prewarm, active]);
      const activeResult = await active;
      expect(activeResult?.runtimeId).toBe("coalesced-runtime");
      expect(updateRegistryMock).toHaveBeenCalledOnce();
      expect(syncSkillsToWorkspaceMock).toHaveBeenCalledOnce();
    } finally {
      releaseBackend();
      await Promise.allSettled([prewarm, active].filter((pending) => pending !== undefined));
      restore();
    }
  }, 15_000);

  it("hands a cold foreground preparation directly into its active-use lease", async () => {
    updateRegistryMock.mockClear();
    readRegisteredSandboxRuntimeIdsMock.mockResolvedValue([]);
    const backendFactory = vi.fn(async () => ({
      id: "cold-active-backend",
      runtimeId: "cold-active-runtime",
      runtimeLabel: "Cold Active Runtime",
      workdir: "/workspace",
      buildExecSpec: async () => ({
        argv: ["cold-active-backend", "exec"],
        env: process.env,
        stdinMode: "pipe-closed" as const,
      }),
      runShellCommand: async () => ({
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        code: 0,
      }),
    }));
    const restore = registerSandboxBackend("cold-active-backend", backendFactory);
    try {
      const result = await resolveSandboxContext({
        config: {
          agents: {
            defaults: {
              sandbox: {
                mode: "all",
                backend: "cold-active-backend",
                scope: "session",
                workspaceAccess: "rw",
                prune: { idleHours: 0, maxAgeDays: 0 },
              },
            },
          },
        },
        sessionKey: "agent:worker:cold-active",
        skillsSnapshot: { prompt: "active skills", skills: [], version: 9 },
        workspaceDir: await createSandboxFixtureDir("cold-active"),
        holdActiveLease: true,
      });

      expect(result?.runtimeId).toBe("cold-active-runtime");
      expect(result?.lifecycleActiveRelease).toEqual(expect.any(Function));
      result?.lifecycleActiveRelease?.();
    } finally {
      restore();
    }
  }, 15_000);

  it("does not let a cancelled prewarm abort a joined foreground resource preparation", async () => {
    updateRegistryMock.mockClear();
    readRegisteredSandboxRuntimeIdsMock.mockResolvedValue([]);
    let releaseBackend!: () => void;
    const backendReady = new Promise<void>((resolve) => {
      releaseBackend = resolve;
    });
    const backendFactory = vi.fn(async () => {
      await backendReady;
      return {
        id: "prewarm-cancel-backend",
        runtimeId: "prewarm-cancel-runtime",
        runtimeLabel: "Prewarm Cancel Runtime",
        workdir: "/workspace",
        buildExecSpec: async () => ({
          argv: ["prewarm-cancel-backend", "exec"],
          env: process.env,
          stdinMode: "pipe-closed" as const,
        }),
        runShellCommand: async () => ({
          stdout: Buffer.alloc(0),
          stderr: Buffer.alloc(0),
          code: 0,
        }),
      };
    });
    const restore = registerSandboxBackend("prewarm-cancel-backend", {
      factory: backendFactory,
      resolveWorkdir: () => "/workspace",
    });
    const pending: Promise<unknown>[] = [];
    try {
      const cfg: OpenClawConfig = {
        agents: {
          defaults: {
            sandbox: {
              mode: "all",
              backend: "prewarm-cancel-backend",
              scope: "session",
              workspaceAccess: "rw",
              prune: { idleHours: 0, maxAgeDays: 0 },
            },
          },
        },
      };
      const params = {
        config: cfg,
        sessionKey: "agent:worker:prewarm-cancel",
        workspaceDir: await createSandboxFixtureDir("prewarm-cancel"),
      };
      const controller = new AbortController();
      const prewarm = prewarmSandboxForSession({ ...params, signal: controller.signal });
      pending.push(prewarm);
      const active = resolveSandboxContext({
        ...params,
        skillsSnapshot: { prompt: "active skills", skills: [], version: 8 },
      });
      pending.push(active);

      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
      controller.abort(new Error("prewarm superseded"));
      releaseBackend();

      await prewarm;
      expect((await active)?.runtimeId).toBe("prewarm-cancel-runtime");
      expect(backendFactory).toHaveBeenCalledOnce();
    } finally {
      releaseBackend();
      await Promise.allSettled(pending);
      restore();
    }
  }, 15_000);

  it("does not repeat a registry write for a backend that owns acquisition metadata", async () => {
    updateRegistryMock.mockClear();
    const restore = registerSandboxBackend("registry-managed-backend", async () => ({
      id: "registry-managed-backend",
      runtimeId: "registry-managed-runtime",
      runtimeLabel: "Registry Managed Runtime",
      registryManaged: true,
      workdir: "/workspace",
      buildExecSpec: async () => ({
        argv: ["registry-managed-backend", "exec"],
        env: process.env,
        stdinMode: "pipe-closed" as const,
      }),
      runShellCommand: async () => ({
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        code: 0,
      }),
    }));
    try {
      const cfg: OpenClawConfig = {
        agents: {
          defaults: {
            sandbox: {
              mode: "all",
              backend: "registry-managed-backend",
              scope: "session",
              workspaceAccess: "rw",
              prune: { idleHours: 0, maxAgeDays: 0 },
            },
          },
        },
      };
      await resolveSandboxContext({
        config: cfg,
        sessionKey: "agent:worker:registry-managed",
        workspaceDir: await createSandboxFixtureDir("registry-managed"),
      });
      expect(updateRegistryMock).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  }, 15_000);
});
