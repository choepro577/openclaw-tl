import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ensureEnterpriseWorkspace,
  ensureEnterpriseWorkspaceFromTemplate,
  resolveEnterpriseWorkspacePath,
} from "./personal-workspace.js";

const tempDirectories: string[] = [];

function stateEnv(): NodeJS.ProcessEnv {
  const stateDir = mkdtempSync(join(tmpdir(), "openclaw-enterprise-workspace-"));
  tempDirectories.push(stateDir);
  return { ...process.env, OPENCLAW_STATE_DIR: stateDir };
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("enterprise personal workspaces", () => {
  it("isolates users and agents under distinct durable roots", () => {
    const env = stateEnv();
    const userA = ensureEnterpriseWorkspace("profile-a", "personal", env);
    const userB = ensureEnterpriseWorkspace("profile-b", "personal", env);
    const sharedAgent = ensureEnterpriseWorkspace("profile-a", "research", env);

    expect(userA).not.toBe(userB);
    expect(userA).not.toBe(sharedAgent);
    expect(userA).toBe(resolveEnterpriseWorkspacePath("profile-a", "personal", env));
  });

  it("rejects traversal and absolute identifiers", () => {
    const env = stateEnv();
    expect(() => resolveEnterpriseWorkspacePath("../profile-b", "personal", env)).toThrow(
      "PROFILE_ID_INVALID",
    );
    expect(() => resolveEnterpriseWorkspacePath("profile-a", "/tmp/escape", env)).toThrow(
      "AGENT_ID_INVALID",
    );
  });

  it("seeds regular bootstrap files once and never follows template links", () => {
    const env = stateEnv();
    const template = mkdtempSync(join(tmpdir(), "openclaw-enterprise-template-"));
    tempDirectories.push(template);
    writeFileSync(join(template, "AGENTS.md"), "template v1");
    symlinkSync(join(template, "AGENTS.md"), join(template, "SOUL.md"));

    const workspace = ensureEnterpriseWorkspaceFromTemplate("profile-a", "personal", template, env);
    expect(readFileSync(join(workspace, "AGENTS.md"), "utf8")).toBe("template v1");
    expect(() => readFileSync(join(workspace, "SOUL.md"), "utf8")).toThrow();

    writeFileSync(join(template, "AGENTS.md"), "template v2");
    ensureEnterpriseWorkspaceFromTemplate("profile-a", "personal", template, env);
    expect(readFileSync(join(workspace, "AGENTS.md"), "utf8")).toBe("template v1");
  });
});
