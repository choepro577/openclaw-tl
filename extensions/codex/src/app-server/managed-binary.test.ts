// Codex tests cover managed binary plugin behavior.
import { chmod, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CodexAppServerStartOptions } from "./config.js";
import {
  resolveManagedCodexAppServerStartOptions,
  resolveManagedCodexNativeCommand,
  setManagedCodexPluginRoot,
} from "./managed-binary.js";
import { CODEX_APP_SERVER_VERSION } from "./version.js";

function startOptions(
  commandSource: CodexAppServerStartOptions["commandSource"],
  managedCommandOrder?: CodexAppServerStartOptions["managedCommandOrder"],
): CodexAppServerStartOptions {
  return {
    transport: "stdio",
    command: "codex",
    commandSource,
    ...(managedCommandOrder ? { managedCommandOrder } : {}),
    args: ["app-server", "--listen", "stdio://"],
    headers: {},
  };
}

function managedCommandPath(root: string, platform: NodeJS.Platform): string {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  return pathApi.join(root, "node_modules", ".bin", platform === "win32" ? "codex.cmd" : "codex");
}

const MACOS_DESKTOP_CODEX_APP_SERVER_COMMAND = "/Applications/Codex.app/Contents/Resources/codex";
const MACOS_DESKTOP_CHATGPT_APP_SERVER_COMMAND =
  "/Applications/ChatGPT.app/Contents/Resources/codex";

describe("managed Codex app-server binary", () => {
  afterEach(() => setManagedCodexPluginRoot(undefined));

  it("resolves the platform-native artifact behind the managed npm launcher", () => {
    const packageJsonPath =
      "/repo/extensions/codex/node_modules/@openai/codex-darwin-arm64/package.json";
    const expected =
      "/repo/extensions/codex/node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex";

    expect(
      resolveManagedCodexNativeCommand("/repo/extensions/codex/node_modules/.bin/codex", {
        platform: "darwin",
        arch: "arm64",
        resolvePackageJson: (packageName, root) =>
          packageName === "@openai/codex-darwin-arm64" &&
          root === "/repo/extensions/codex/node_modules/@openai/codex"
            ? packageJsonPath
            : undefined,
        pathExists: (candidate) => candidate === expected,
      }),
    ).toBe(expected);
  });

  it("reports the desktop bundle binary as its native artifact", () => {
    expect(
      resolveManagedCodexNativeCommand(MACOS_DESKTOP_CHATGPT_APP_SERVER_COMMAND, {
        platform: "darwin",
        arch: "arm64",
      }),
    ).toBe(MACOS_DESKTOP_CHATGPT_APP_SERVER_COMMAND);
  });

  it("leaves explicit command overrides unchanged without probing managed paths", async () => {
    const explicitOptions = startOptions("config");
    const pathExists = vi.fn(async () => false);

    await expect(
      resolveManagedCodexAppServerStartOptions(explicitOptions, {
        platform: "darwin",
        pathExists,
      }),
    ).resolves.toBe(explicitOptions);
    expect(pathExists).not.toHaveBeenCalled();
  });

  it("keeps the pinned package ahead of stale desktop bundles for ordinary turns", async () => {
    const pluginRoot = path.join("/tmp", "openclaw", "extensions", "codex");
    const pluginLocalCommand = managedCommandPath(pluginRoot, "darwin");
    const pathExists = vi.fn(
      async (filePath: string) =>
        filePath === MACOS_DESKTOP_CHATGPT_APP_SERVER_COMMAND ||
        filePath === MACOS_DESKTOP_CODEX_APP_SERVER_COMMAND ||
        filePath === pluginLocalCommand,
    );

    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed"), {
        platform: "darwin",
        pluginRoot,
        pathExists,
      }),
    ).resolves.toEqual({
      ...startOptions("managed"),
      command: pluginLocalCommand,
      commandSource: "resolved-managed",
      managedFallbackCommandPaths: [
        MACOS_DESKTOP_CHATGPT_APP_SERVER_COMMAND,
        MACOS_DESKTOP_CODEX_APP_SERVER_COMMAND,
      ],
    });
  });

  it("prefers the ChatGPT.app desktop bundle for Computer Use", async () => {
    const pluginRoot = path.join("/tmp", "openclaw", "extensions", "codex");
    const pluginLocalCommand = managedCommandPath(pluginRoot, "darwin");
    const pathExists = vi.fn(
      async (filePath: string) =>
        filePath === MACOS_DESKTOP_CHATGPT_APP_SERVER_COMMAND || filePath === pluginLocalCommand,
    );

    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed", "desktop-first"), {
        platform: "darwin",
        pluginRoot,
        pathExists,
      }),
    ).resolves.toEqual({
      ...startOptions("managed", "desktop-first"),
      command: MACOS_DESKTOP_CHATGPT_APP_SERVER_COMMAND,
      commandSource: "resolved-managed",
      managedFallbackCommandPaths: [pluginLocalCommand],
    });
  });

  it("falls back to the legacy Codex.app desktop bundle when ChatGPT.app is absent", async () => {
    const pluginRoot = path.join("/tmp", "openclaw", "extensions", "codex");
    const pluginLocalCommand = managedCommandPath(pluginRoot, "darwin");
    const pathExists = vi.fn(
      async (filePath: string) =>
        filePath === MACOS_DESKTOP_CODEX_APP_SERVER_COMMAND || filePath === pluginLocalCommand,
    );

    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed", "desktop-first"), {
        platform: "darwin",
        pluginRoot,
        pathExists,
      }),
    ).resolves.toEqual({
      ...startOptions("managed", "desktop-first"),
      command: MACOS_DESKTOP_CODEX_APP_SERVER_COMMAND,
      commandSource: "resolved-managed",
      managedFallbackCommandPaths: [pluginLocalCommand],
    });
  });

  it("falls back to the source plugin-local binary when neither desktop bundle exists", async () => {
    const pluginRoot = path.join("/tmp", "openclaw", "extensions", "codex");
    const pluginLocalCommand = managedCommandPath(pluginRoot, "darwin");
    const pathExists = vi.fn(async (filePath: string) => filePath === pluginLocalCommand);

    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed", "desktop-first"), {
        platform: "darwin",
        pluginRoot,
        pathExists,
      }),
    ).resolves.toEqual({
      ...startOptions("managed", "desktop-first"),
      command: pluginLocalCommand,
      commandSource: "resolved-managed",
    });
    expect(pathExists).toHaveBeenCalledWith(MACOS_DESKTOP_CHATGPT_APP_SERVER_COMMAND, "darwin");
    expect(pathExists).toHaveBeenCalledWith(MACOS_DESKTOP_CODEX_APP_SERVER_COMMAND, "darwin");
  });

  it("finds Codex in the package install root used by packaged plugins", async () => {
    const installRoot = path.join("/tmp", "openclaw-plugin-package", "codex");
    const pluginRoot = path.join(installRoot, "dist", "extensions", "codex");
    const installedCommand = managedCommandPath(installRoot, "linux");
    const pathExists = vi.fn(async (filePath: string) => filePath === installedCommand);

    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed"), {
        platform: "linux",
        pluginRoot,
        pathExists,
      }),
    ).resolves.toEqual({
      ...startOptions("managed"),
      command: installedCommand,
      commandSource: "resolved-managed",
    });
  });

  it("prefers the bundled plugin binary over a stale hoisted package binary", async () => {
    const installRoot = path.join("/tmp", "openclaw-package");
    const packageRoot = path.join(installRoot, "node_modules", "openclaw");
    const bundledPluginRoot = path.join(packageRoot, "dist", "extensions", "codex");
    const bundledCommand = managedCommandPath(bundledPluginRoot, "linux");
    const hoistedCommand = managedCommandPath(installRoot, "linux");
    const pathExists = vi.fn(
      async (filePath: string) => filePath === bundledCommand || filePath === hoistedCommand,
    );
    setManagedCodexPluginRoot(bundledPluginRoot);

    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed"), {
        platform: "linux",
        pathExists,
      }),
    ).resolves.toEqual({
      ...startOptions("managed"),
      command: bundledCommand,
      commandSource: "resolved-managed",
      managedFallbackCommandPaths: [hoistedCommand],
    });
  });

  it.each(
    ["dist", "dist-runtime"].flatMap((distRoot) =>
      ["shim", "package-bin", "missing"].map((sourceLayout) => ({ distRoot, sourceLayout })),
    ),
  )(
    "honors the source owner from $distRoot with $sourceLayout dependencies before stale ACP",
    async ({ distRoot, sourceLayout }) => {
      const repoRoot = await realpath(
        await mkdtemp(path.join(os.tmpdir(), "openclaw-codex-owner-")),
      );
      const sourcePluginRoot = path.join(repoRoot, "extensions", "codex");
      const builtPluginRoot = path.join(repoRoot, distRoot, "extensions", "codex");
      const writeCodexPackage = async (root: string, version: string) => {
        const packageRoot = path.join(root, "node_modules", "@openai", "codex");
        const packageBin = path.join(packageRoot, "bin", "codex.js");
        await mkdir(path.dirname(packageBin), { recursive: true });
        await writeFile(
          path.join(packageRoot, "package.json"),
          JSON.stringify({ name: "@openai/codex", version, bin: { codex: "bin/codex.js" } }),
        );
        await writeFile(
          packageBin,
          `#!/usr/bin/env node\nconsole.log(${JSON.stringify(version)});\n`,
        );
        await chmod(packageBin, 0o755);
        return packageBin;
      };
      const writeShim = async (root: string, version: string) => {
        const command = managedCommandPath(root, "linux");
        await mkdir(path.dirname(command), { recursive: true });
        await writeFile(command, `#!/bin/sh\nprintf '%s\\n' '${version}'\n`);
        await chmod(command, 0o755);
        return command;
      };

      try {
        // Production registers dist/extensions/codex, while pnpm installs the
        // plugin's exact pin beside source. Root ACP intentionally owns 0.148.
        await mkdir(builtPluginRoot, { recursive: true });
        await mkdir(sourcePluginRoot, { recursive: true });
        await writeFile(
          path.join(sourcePluginRoot, "package.json"),
          JSON.stringify({
            name: "@openclaw/codex",
            dependencies: { "@openai/codex": CODEX_APP_SERVER_VERSION },
          }),
        );
        const ownedCommand =
          sourceLayout === "missing"
            ? undefined
            : await writeCodexPackage(sourcePluginRoot, CODEX_APP_SERVER_VERSION);
        const preferredCommand =
          sourceLayout === "shim"
            ? await writeShim(sourcePluginRoot, CODEX_APP_SERVER_VERSION)
            : ownedCommand;
        await writeCodexPackage(repoRoot, "0.148.0");
        await writeShim(repoRoot, "0.148.0");
        setManagedCodexPluginRoot(builtPluginRoot);

        const resolving = resolveManagedCodexAppServerStartOptions(startOptions("managed"), {
          platform: "linux",
        });
        if (sourceLayout === "missing") {
          // A manifest-owned missing install must surface its repair error;
          // successfully launching another product's older dependency hides it.
          await expect(resolving).rejects.toThrow("Managed Codex app-server binary was not found");
          return;
        }
        const resolved = await resolving;

        expect(resolved.command).toBe(preferredCommand);
        expect(resolved.commandSource).toBe("resolved-managed");
        expect(
          (resolved.managedFallbackCommandPaths ?? []).some((command) =>
            command.startsWith(path.join(repoRoot, "node_modules")),
          ),
        ).toBe(false);
      } finally {
        await rm(repoRoot, { recursive: true, force: true });
      }
    },
  );

  it("falls back to the hoisted package when the bundled plugin binary is absent", async () => {
    const installRoot = path.join("/tmp", "openclaw-package");
    const packageRoot = path.join(installRoot, "node_modules", "openclaw");
    const bundledPluginRoot = path.join(packageRoot, "dist", "extensions", "codex");
    const hoistedCommand = managedCommandPath(installRoot, "linux");
    const pathExists = vi.fn(async (filePath: string) => filePath === hoistedCommand);
    setManagedCodexPluginRoot(bundledPluginRoot);

    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed"), {
        platform: "linux",
        pathExists,
      }),
    ).resolves.toEqual({
      ...startOptions("managed"),
      command: hoistedCommand,
      commandSource: "resolved-managed",
    });
  });

  it("finds Codex bins hoisted into an isolated npm project root", async () => {
    const projectRoot = path.join("/tmp", "state", "npm", "projects", "openclaw-codex-hash");
    const pluginRoot = path.join(projectRoot, "node_modules", "@openclaw", "codex");
    const installedCommand = managedCommandPath(projectRoot, "linux");
    const pathExists = vi.fn(async (filePath: string) => filePath === installedCommand);

    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed"), {
        platform: "linux",
        pluginRoot,
        pathExists,
      }),
    ).resolves.toEqual({
      ...startOptions("managed"),
      command: installedCommand,
      commandSource: "resolved-managed",
    });
  });

  it("finds a Windows codex.cmd shim in an isolated npm root using win32 paths", async () => {
    const projectRoot = path.win32.join(
      "C:\\",
      "Users",
      "test",
      ".openclaw",
      "npm",
      "projects",
      "openclaw-codex-hash",
    );
    const pluginRoot = path.win32.join(projectRoot, "node_modules", "@openclaw", "codex");
    const installedCommand = managedCommandPath(projectRoot, "win32");
    const pathExists = vi.fn(async (filePath: string) => filePath === installedCommand);

    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed"), {
        platform: "win32",
        pluginRoot,
        pathExists,
      }),
    ).resolves.toEqual({
      ...startOptions("managed"),
      command: installedCommand,
      commandSource: "resolved-managed",
    });
  });

  it("falls back to the resolved Codex package bin when no command shim exists", async () => {
    const installRoot = await mkdtemp(path.join(os.tmpdir(), "openclaw-codex-package-"));
    const pluginRoot = path.join(installRoot, "dist", "extensions", "codex");
    const packageRoot = path.join(installRoot, "node_modules", "@openai", "codex");
    const packageBin = path.join(packageRoot, "bin", "codex.js");
    await mkdir(path.dirname(packageBin), { recursive: true });
    await writeFile(
      path.join(packageRoot, "package.json"),
      JSON.stringify({
        name: "@openai/codex",
        bin: {
          codex: "bin/codex.js",
        },
      }),
    );
    await writeFile(packageBin, "#!/usr/bin/env node\n");
    const resolvedPackageBin = await realpath(packageBin);

    const pathExists = vi.fn(async (filePath: string) => filePath === resolvedPackageBin);

    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed"), {
        platform: "linux",
        pluginRoot,
        pathExists,
      }),
    ).resolves.toEqual({
      ...startOptions("managed"),
      command: resolvedPackageBin,
      commandSource: "resolved-managed",
    });
  });

  it("fails clearly when the managed Codex binary is missing", async () => {
    await expect(
      resolveManagedCodexAppServerStartOptions(startOptions("managed"), {
        platform: "darwin",
        pluginRoot: path.join("/tmp", "openclaw", "extensions", "codex"),
        pathExists: vi.fn(async () => false),
      }),
    ).rejects.toThrow("Managed Codex app-server binary was not found");
  });
});
