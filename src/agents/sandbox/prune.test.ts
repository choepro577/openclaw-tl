// Sandbox prune tests cover runtime removal ordering and registry cleanup
// behavior for stale sandbox entries.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SandboxConfig } from "./types.js";

let maybePruneSandboxes: typeof import("./prune.js").maybePruneSandboxes;
let scheduleSandboxIdlePrune: typeof import("./prune.js").scheduleSandboxIdlePrune;
let BROWSER_BRIDGES: typeof import("./browser-bridges.js").BROWSER_BRIDGES;
let acquireSandboxLifecycleLease: typeof import("./lifecycle.js").acquireSandboxLifecycleLease;

const configMocks = vi.hoisted(() => ({
  getRuntimeConfig: vi.fn(),
}));

const backendMocks = vi.hoisted(() => ({
  removeRuntime: vi.fn(),
}));

const registryMocks = vi.hoisted(() => ({
  readBrowserRegistry: vi.fn(),
  readRegistry: vi.fn(),
  removeBrowserRegistryEntry: vi.fn(),
  removeRegistryEntry: vi.fn(),
}));

const runtimeMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

const bridgeMocks = vi.hoisted(() => ({
  stopBrowserBridgeServer: vi.fn(),
}));

vi.mock("../../config/config.js", () => ({
  getRuntimeConfig: configMocks.getRuntimeConfig,
}));

vi.mock("../../runtime.js", () => ({
  defaultRuntime: runtimeMocks,
}));

vi.mock("./backend.js", () => ({
  getSandboxBackendManager: vi.fn(() => backendMocks),
}));

vi.mock("./docker-backend.js", () => ({
  dockerSandboxBackendManager: backendMocks,
}));

vi.mock("./registry.js", () => ({
  readBrowserRegistry: registryMocks.readBrowserRegistry,
  readRegistry: registryMocks.readRegistry,
  removeBrowserRegistryEntry: registryMocks.removeBrowserRegistryEntry,
  removeRegistryEntry: registryMocks.removeRegistryEntry,
}));

vi.mock("../../plugin-sdk/browser-bridge.js", () => ({
  stopBrowserBridgeServer: bridgeMocks.stopBrowserBridgeServer,
}));

function buildPruneConfig(): SandboxConfig {
  return {
    mode: "all",
    backend: "docker",
    scope: "session",
    workspaceAccess: "none",
    workspaceRoot: "/tmp/openclaw-sandboxes",
    dockerTmpfsSource: "configured",
    docker: {
      image: "openclaw-sandbox:bookworm-slim",
      containerPrefix: "openclaw-sbx-",
      workdir: "/workspace",
      readOnlyRoot: true,
      tmpfs: [],
      network: "none",
      capDrop: ["ALL"],
      env: {},
    },
    ssh: {
      command: "ssh",
      workspaceRoot: "/tmp/openclaw-sandboxes",
      strictHostKeyChecking: true,
      updateHostKeys: true,
    },
    browser: {
      enabled: true,
      maxRunningContainers: 0,
      image: "openclaw-sandbox-browser:bookworm-slim",
      containerPrefix: "openclaw-sbx-browser-",
      network: "none",
      cdpPort: 9222,
      vncPort: 5900,
      noVncPort: 6080,
      headless: true,
      noVncEnabled: false,
      allowHostControl: false,
      autoStart: true,
      autoStartTimeoutMs: 1_000,
    },
    tools: {
      allow: [],
      deny: [],
    },
    prune: {
      idleHours: 1,
      maxAgeDays: 0,
    },
  };
}

describe("maybePruneSandboxes", () => {
  beforeEach(async () => {
    vi.resetModules();
    configMocks.getRuntimeConfig.mockReset();
    backendMocks.removeRuntime.mockReset();
    registryMocks.readBrowserRegistry.mockReset();
    registryMocks.readRegistry.mockReset();
    registryMocks.removeBrowserRegistryEntry.mockReset();
    registryMocks.removeRegistryEntry.mockReset();
    runtimeMocks.error.mockReset();
    bridgeMocks.stopBrowserBridgeServer.mockReset().mockResolvedValue(undefined);

    configMocks.getRuntimeConfig.mockReturnValue({});
    registryMocks.readBrowserRegistry.mockResolvedValue({ entries: [] });
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "sandbox-1",
          backendId: "docker",
          createdAtMs: Date.now() - 4 * 60 * 60 * 1000,
          lastUsedAtMs: Date.now() - 2 * 60 * 60 * 1000,
          image: "openclaw-sandbox:bookworm-slim",
        },
      ],
    });
    backendMocks.removeRuntime.mockResolvedValue(undefined);
    ({ BROWSER_BRIDGES } = await import("./browser-bridges.js"));
    BROWSER_BRIDGES.clear();
    ({ maybePruneSandboxes, scheduleSandboxIdlePrune } = await import("./prune.js"));
    ({ acquireSandboxLifecycleLease } = await import("./lifecycle.js"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes the registry entry after runtime removal succeeds", async () => {
    await maybePruneSandboxes(buildPruneConfig());

    expect(backendMocks.removeRuntime).toHaveBeenCalledTimes(1);
    expect(registryMocks.removeRegistryEntry).toHaveBeenCalledWith("sandbox-1");
  });

  it("keeps the registry entry when runtime removal fails", async () => {
    // The registry is the retry source; keep it until the backend confirms the
    // runtime was removed.
    backendMocks.removeRuntime.mockRejectedValueOnce(new Error("docker rm failed"));

    await maybePruneSandboxes(buildPruneConfig());

    expect(registryMocks.removeRegistryEntry).not.toHaveBeenCalled();
    expect(runtimeMocks.error).toHaveBeenCalledWith(
      "Sandbox prune failed to remove sandbox-1: docker rm failed",
    );
  });

  it("skips a runtime while its foreground lifecycle lease is active", async () => {
    const release = await acquireSandboxLifecycleLease("scope:active");
    registryMocks.readBrowserRegistry.mockResolvedValue({ entries: [] });
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "sandbox-active",
          backendId: "docker",
          sessionKey: "scope:active",
          createdAtMs: Date.now() - 4 * 60 * 60 * 1000,
          lastUsedAtMs: Date.now() - 2 * 60 * 60 * 1000,
          image: "openclaw-sandbox:bookworm-slim",
        },
      ],
    });

    try {
      await maybePruneSandboxes(buildPruneConfig());

      expect(backendMocks.removeRuntime).not.toHaveBeenCalled();
      expect(registryMocks.removeRegistryEntry).not.toHaveBeenCalled();
    } finally {
      release();
    }
  });

  it("prunes entries with out-of-range registry timestamps", async () => {
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "sandbox-out-of-range",
          backendId: "docker",
          createdAtMs: Date.now(),
          lastUsedAtMs: Number.MAX_SAFE_INTEGER,
          image: "openclaw-sandbox:bookworm-slim",
        },
      ],
    });

    await maybePruneSandboxes(buildPruneConfig());

    expect(backendMocks.removeRuntime).toHaveBeenCalledTimes(1);
    expect(registryMocks.removeRegistryEntry).toHaveBeenCalledWith("sandbox-out-of-range");
  });

  it("keeps browser runtime and registry state until bridge cleanup can retry", async () => {
    const now = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    registryMocks.readRegistry.mockResolvedValue({ entries: [] });
    registryMocks.readBrowserRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "browser-1",
          sessionKey: "agent:coder:main",
          createdAtMs: now - 4 * 60 * 60 * 1000,
          lastUsedAtMs: now - 2 * 60 * 60 * 1000,
          image: "openclaw-sandbox-browser:bookworm-slim",
          cdpPort: 9222,
        },
      ],
    });
    const cached = { containerName: "browser-1", bridge: { server: {} } as never };
    BROWSER_BRIDGES.set("agent:coder:main", cached);
    bridgeMocks.stopBrowserBridgeServer.mockRejectedValueOnce(new Error("bridge cleanup failed"));

    await maybePruneSandboxes(buildPruneConfig());

    expect(BROWSER_BRIDGES.get("agent:coder:main")).toBe(cached);
    expect(backendMocks.removeRuntime).not.toHaveBeenCalled();
    expect(registryMocks.removeBrowserRegistryEntry).not.toHaveBeenCalled();
    expect(runtimeMocks.error).toHaveBeenCalledWith(
      "Sandbox prune failed to remove browser-1: bridge cleanup failed",
    );

    const order: string[] = [];
    bridgeMocks.stopBrowserBridgeServer.mockImplementationOnce(async () => {
      order.push("bridge");
    });
    backendMocks.removeRuntime.mockImplementationOnce(async () => {
      order.push("runtime");
    });
    registryMocks.removeBrowserRegistryEntry.mockImplementationOnce(async () => {
      order.push("registry");
    });
    nowSpy.mockReturnValue(now + 6 * 60 * 1000);

    await maybePruneSandboxes(buildPruneConfig());

    expect(order).toEqual(["bridge", "runtime", "registry"]);
    expect(BROWSER_BRIDGES.has("agent:coder:main")).toBe(false);
    nowSpy.mockRestore();
  });

  it("resets the 15-minute idle deadline when the same scope is used again", async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const cfg = buildPruneConfig();
    cfg.prune.idleHours = 0.25;
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "sandbox-reset",
          backendId: "docker",
          sessionKey: "scope:reset",
          createdAtMs: now,
          lastUsedAtMs: now,
          image: "openclaw-sandbox:bookworm-slim",
        },
      ],
    });

    scheduleSandboxIdlePrune(cfg, "scope:reset");
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    scheduleSandboxIdlePrune(cfg, "scope:reset");
    await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    expect(backendMocks.removeRuntime).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(9 * 60 * 1000 + 1001);
    expect(backendMocks.removeRuntime).toHaveBeenCalledTimes(1);
  });

  it("prunes workspace and browser registries after 15 minutes idle", async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const cfg = buildPruneConfig();
    cfg.prune.idleHours = 0.25;
    registryMocks.readRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "sandbox-idle",
          backendId: "docker",
          sessionKey: "scope:idle",
          createdAtMs: now,
          lastUsedAtMs: now,
          image: "openclaw-sandbox:bookworm-slim",
        },
      ],
    });
    registryMocks.readBrowserRegistry.mockResolvedValue({
      entries: [
        {
          containerName: "browser-idle",
          sessionKey: "scope:idle",
          createdAtMs: now,
          lastUsedAtMs: now,
          image: "openclaw-sandbox-browser:bookworm-slim",
          cdpPort: 49100,
        },
      ],
    });

    scheduleSandboxIdlePrune(cfg, "scope:idle");
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 1001);

    expect(registryMocks.removeRegistryEntry).toHaveBeenCalledWith("sandbox-idle");
    expect(registryMocks.removeBrowserRegistryEntry).toHaveBeenCalledWith("browser-idle");
  });

  it("retries an idle deadline when another prune used the throttle window", async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const cfg = buildPruneConfig();
    cfg.prune.idleHours = 0.0001;

    await maybePruneSandboxes(cfg);
    backendMocks.removeRuntime.mockClear();
    registryMocks.removeRegistryEntry.mockClear();
    scheduleSandboxIdlePrune(cfg, "scope:retry");
    await vi.advanceTimersByTimeAsync(2000);
    expect(backendMocks.removeRuntime).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(61 * 1000);
    expect(backendMocks.removeRuntime).toHaveBeenCalledTimes(1);
  });
});
