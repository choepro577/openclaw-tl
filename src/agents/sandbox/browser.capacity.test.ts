// Browser capacity tests cover global admission, LRU eviction, and active-turn protection.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SANDBOX_BROWSER_IMAGE_CONTRACT_EPOCH } from "./constants.js";
import { acquireSandboxActiveLease } from "./lifecycle.js";
import type { SandboxBrowserRegistryEntry } from "./registry.js";
import { buildSandboxContainerName, slugifySessionKey } from "./shared.js";
import { findDockerArgsCall } from "./test-args.js";
import type { SandboxConfig } from "./types.js";

let ensureSandboxBrowser: typeof import("./browser.js").ensureSandboxBrowser;
let BROWSER_BRIDGES: typeof import("./browser-bridges.js").BROWSER_BRIDGES;

const dockerMocks = vi.hoisted(() => ({
  dockerContainerState: vi.fn(),
  execDocker: vi.fn(),
  readDockerContainerEnvVar: vi.fn(),
  readDockerContainerLabel: vi.fn(),
  readDockerPort: vi.fn(),
}));
const registryMocks = vi.hoisted(() => ({
  readBrowserRegistry: vi.fn(),
  removeBrowserRegistryEntry: vi.fn(),
  updateBrowserRegistry: vi.fn(),
}));
const bridgeMocks = vi.hoisted(() => ({
  startBrowserBridgeServer: vi.fn(),
  stopBrowserBridgeServer: vi.fn(),
}));

vi.mock("./docker.js", async () => {
  const actual = await vi.importActual<typeof import("./docker.js")>("./docker.js");
  return { ...actual, ...dockerMocks };
});
vi.mock("./registry.js", () => registryMocks);
vi.mock("../../plugin-sdk/browser-bridge.js", () => bridgeMocks);
vi.mock("../../runtime.js", () => ({ defaultRuntime: { log: vi.fn(), error: vi.fn() } }));
vi.mock("../../plugin-sdk/browser-profiles.js", () => ({
  DEFAULT_BROWSER_ACTION_TIMEOUT_MS: 60_000,
  DEFAULT_BROWSER_EVALUATE_ENABLED: true,
  DEFAULT_OPENCLAW_BROWSER_COLOR: "#FF4500",
  DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME: "openclaw",
  resolveProfile: () => null,
}));

function buildConfig(): SandboxConfig {
  return {
    mode: "all",
    backend: "docker",
    scope: "session",
    workspaceAccess: "none",
    workspaceRoot: "/tmp/openclaw-sandboxes",
    dockerTmpfsSource: "default",
    docker: {
      image: "openclaw-sandbox:bookworm-slim",
      containerPrefix: "openclaw-sbx-",
      workdir: "/workspace",
      readOnlyRoot: true,
      tmpfs: ["/tmp", "/var/tmp", "/run"],
      network: "none",
      capDrop: ["ALL"],
      env: { LANG: "C.UTF-8" },
    },
    ssh: {
      command: "ssh",
      workspaceRoot: "/tmp/openclaw-sandboxes",
      strictHostKeyChecking: true,
      updateHostKeys: true,
    },
    browser: {
      enabled: true,
      maxRunningContainers: 3,
      image: "openclaw-sandbox-browser:bookworm-slim",
      containerPrefix: "openclaw-sbx-browser-",
      network: "openclaw-sandbox-browser",
      cdpPort: 9222,
      vncPort: 5900,
      noVncPort: 6080,
      headless: true,
      noVncEnabled: false,
      allowHostControl: false,
      autoStart: true,
      autoStartTimeoutMs: 1000,
    },
    tools: { allow: ["browser"], deny: [] },
    prune: { idleHours: 0.25, maxAgeDays: 7 },
  };
}

function registryEntry(
  name: string,
  index: number,
  cfg: SandboxConfig,
): SandboxBrowserRegistryEntry {
  return {
    containerName: `browser-${name}`,
    sessionKey: `session:${name}`,
    createdAtMs: index,
    lastUsedAtMs: index,
    image: cfg.browser.image,
    cdpPort: 49100 + index,
  };
}

function requiredArg(args: string[], index: number): string {
  const value = args[index];
  if (!value) {
    throw new Error(`missing Docker argument at ${index}`);
  }
  return value;
}

async function ensure(scopeKey: string, cfg: SandboxConfig) {
  return await ensureSandboxBrowser({
    scopeKey,
    workspaceDir: `/tmp/${scopeKey}`,
    agentWorkspaceDir: `/tmp/${scopeKey}`,
    cfg,
    bridgeAuth: { token: "test-bridge-token" },
  });
}

describe("sandbox browser capacity", () => {
  beforeAll(async () => {
    ({ BROWSER_BRIDGES } = await import("./browser-bridges.js"));
    ({ ensureSandboxBrowser } = await import("./browser.js"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    BROWSER_BRIDGES.clear();
    dockerMocks.dockerContainerState.mockResolvedValue({ exists: false, running: false });
    dockerMocks.execDocker.mockImplementation(async (args: string[]) => {
      if (args[0] === "image" && args[1] === "inspect") {
        return { stdout: `${SANDBOX_BROWSER_IMAGE_CONTRACT_EPOCH}\n`, stderr: "", code: 0 };
      }
      return { stdout: "", stderr: "", code: 0 };
    });
    dockerMocks.readDockerContainerEnvVar.mockResolvedValue(null);
    dockerMocks.readDockerContainerLabel.mockResolvedValue(null);
    dockerMocks.readDockerPort.mockResolvedValue(49100);
    registryMocks.readBrowserRegistry.mockResolvedValue({ entries: [] });
    registryMocks.removeBrowserRegistryEntry.mockResolvedValue(undefined);
    registryMocks.updateBrowserRegistry.mockResolvedValue(undefined);
    bridgeMocks.startBrowserBridgeServer.mockResolvedValue({
      server: { listening: true },
      port: 19000,
      baseUrl: "http://127.0.0.1:19000",
      state: { resolved: { profiles: {} } },
    });
    bridgeMocks.stopBrowserBridgeServer.mockResolvedValue(undefined);
  });

  it("evicts the least-recently-used inactive registered browser for a fourth slot", async () => {
    const cfg = buildConfig();
    const targetContainerName = buildSandboxContainerName(
      cfg.browser.containerPrefix,
      slugifySessionKey("session:four"),
    );
    const entries = ["old", "mid", "new"].map((name, index) => registryEntry(name, index + 1, cfg));
    registryMocks.readBrowserRegistry.mockResolvedValue({ entries });
    dockerMocks.dockerContainerState.mockImplementation(async (name: string) => ({
      exists: name !== targetContainerName,
      running: name !== targetContainerName,
    }));
    dockerMocks.execDocker.mockImplementation(async (args: string[]) => {
      if (args[0] === "ps") {
        return {
          stdout: entries.map((entry) => entry.containerName).join("\n"),
          stderr: "",
          code: 0,
        };
      }
      if (args[0] === "image" && args[1] === "inspect") {
        return { stdout: `${SANDBOX_BROWSER_IMAGE_CONTRACT_EPOCH}\n`, stderr: "", code: 0 };
      }
      return { stdout: "", stderr: "", code: 0 };
    });

    await ensure("session:four", cfg);

    expect(dockerMocks.execDocker).toHaveBeenCalledWith(["rm", "-f", "browser-old"]);
    expect(registryMocks.removeBrowserRegistryEntry).toHaveBeenCalledWith("browser-old");
    expect(findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create")).toContain(
      targetContainerName,
    );
  });

  it("returns a retryable capacity error without killing active browsers", async () => {
    const cfg = buildConfig();
    const entries = ["one", "two", "three"].map((name, index) => registryEntry(name, index, cfg));
    registryMocks.readBrowserRegistry.mockResolvedValue({ entries });
    dockerMocks.execDocker.mockImplementation(async (args: string[]) => ({
      stdout: args[0] === "ps" ? entries.map((entry) => entry.containerName).join("\n") : "",
      stderr: "",
      code: 0,
    }));
    const releases = await Promise.all(
      entries.map((entry) => acquireSandboxActiveLease(entry.sessionKey)),
    );

    try {
      await expect(ensure("session:four", cfg)).rejects.toMatchObject({
        name: "SandboxBrowserCapacityError",
        code: "sandbox_browser_capacity",
        retryable: true,
      });
      expect(findDockerArgsCall(dockerMocks.execDocker.mock.calls, "rm")).toBeUndefined();
      expect(findDockerArgsCall(dockerMocks.execDocker.mock.calls, "create")).toBeUndefined();
    } finally {
      for (const release of releases) {
        release();
      }
    }
  });

  it("counts unregistered labeled browsers but never deletes them", async () => {
    const cfg = buildConfig();
    dockerMocks.execDocker.mockImplementation(async (args: string[]) => ({
      stdout: args[0] === "ps" ? "orphan-one\norphan-two\norphan-three\n" : "",
      stderr: "",
      code: 0,
    }));

    await expect(ensure("session:four", cfg)).rejects.toMatchObject({ retryable: true });
    expect(findDockerArgsCall(dockerMocks.execDocker.mock.calls, "rm")).toBeUndefined();
  });

  it("serializes concurrent creation so the running count never exceeds three", async () => {
    const cfg = buildConfig();
    const running = new Set<string>();
    const existing = new Set<string>();
    const entries: SandboxBrowserRegistryEntry[] = [];
    let maxObserved = 0;

    dockerMocks.dockerContainerState.mockImplementation(async (name: string) => ({
      exists: existing.has(name),
      running: running.has(name),
    }));
    dockerMocks.execDocker.mockImplementation(async (args: string[]) => {
      if (args[0] === "ps") {
        return { stdout: [...running].join("\n"), stderr: "", code: 0 };
      }
      if (args[0] === "image" && args[1] === "inspect") {
        return { stdout: `${SANDBOX_BROWSER_IMAGE_CONTRACT_EPOCH}\n`, stderr: "", code: 0 };
      }
      if (args[0] === "create") {
        existing.add(requiredArg(args, args.indexOf("--name") + 1));
      } else if (args[0] === "start") {
        running.add(requiredArg(args, 1));
        maxObserved = Math.max(maxObserved, running.size);
      } else if (args[0] === "rm") {
        const name = requiredArg(args, 2);
        existing.delete(name);
        running.delete(name);
      }
      return { stdout: "", stderr: "", code: 0 };
    });
    registryMocks.readBrowserRegistry.mockImplementation(async () => ({ entries: [...entries] }));
    registryMocks.updateBrowserRegistry.mockImplementation(
      async (entry: SandboxBrowserRegistryEntry) => {
        const index = entries.findIndex(
          (candidate) => candidate.containerName === entry.containerName,
        );
        if (index >= 0) {
          entries[index] = entry;
        } else {
          entries.push(entry);
        }
      },
    );
    registryMocks.removeBrowserRegistryEntry.mockImplementation(async (containerName: string) => {
      const index = entries.findIndex((entry) => entry.containerName === containerName);
      if (index >= 0) {
        entries.splice(index, 1);
      }
    });

    await Promise.all(
      ["one", "two", "three", "four"].map((name) => ensure(`session:${name}`, cfg)),
    );

    expect(maxObserved).toBe(3);
    expect(running.size).toBe(3);
  });
});
