import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const { root } = await vi.hoisted(async () => {
  const tempFs = await import("node:fs/promises");
  const os = await import("node:os");
  const tempPath = await import("node:path");
  return {
    root: await tempFs.realpath(
      await tempFs.mkdtemp(tempPath.join(os.tmpdir(), "skill-folder-test-")),
    ),
  };
});
vi.mock("../../utils.js", async (original) => ({
  ...(await original<typeof import("../../utils.js")>()),
  CONFIG_DIR: root,
}));
vi.mock("../accounts/account-store.js", () => ({ listEnterpriseAccounts: () => [] }));
vi.mock("../entitlements/entitlement-store.js", () => ({
  listEnterpriseEntitlements: () => [],
  listEnterpriseEntitlementsForResource: () => [],
  resolveEnterpriseResourceAccess: () => ({ allowed: false }),
}));

const { importEnterpriseSkillFolder } = await import("./skill-folder-import.js");
const { buildWorkspaceSkillStatus } = await import("../../skills/discovery/status.js");
const { listEnterpriseSkillCatalog } = await import("./enterprise-catalog.js");
const workspace = path.join(root, "writer-workspace");
const otherWorkspace = path.join(root, "other-workspace");
const config = {
  agents: { entries: { writer: { workspace }, other: { workspace: otherWorkspace } } },
};
const file = (relativePath: string, content: string | Buffer) => ({
  path: relativePath,
  contentBase64: Buffer.from(content).toString("base64"),
});
const skillFiles = (name: string) => [
  file("SKILL.md", `---\nname: ${name}\ndescription: Imported skill\n---\nFollow the procedure.\n`),
  file("assets/data.bin", Buffer.from([0, 255, 128])),
];

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("admin folder skill installation", () => {
  it("persists global and agent-only folders, preserves bytes, and refuses overwrite", async () => {
    const global = await importEnterpriseSkillFolder({
      config,
      folderName: "global-example",
      files: skillFiles("global-example"),
    });
    expect(global).toMatchObject({ ok: true, targetDir: path.join(root, "skills/global-example") });
    const local = await importEnterpriseSkillFolder({
      config,
      agentId: "writer",
      folderName: "local-example",
      files: skillFiles("local-example"),
    });
    expect(local).toMatchObject({
      ok: true,
      targetDir: path.join(workspace, "skills/local-example"),
    });
    expect(await fs.readFile(path.join(workspace, "skills/local-example/assets/data.bin"))).toEqual(
      Buffer.from([0, 255, 128]),
    );
    const status = (dir: string) =>
      buildWorkspaceSkillStatus(dir, { config, managedSkillsDir: path.join(root, "skills") })
        .skills;
    expect(status(workspace)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "global-example", source: "openclaw-managed" }),
        expect.objectContaining({ name: "local-example", source: "openclaw-workspace" }),
      ]),
    );
    expect(status(otherWorkspace).some((skill) => skill.name === "local-example")).toBe(false);
    const duplicate = await importEnterpriseSkillFolder({
      config,
      folderName: "global-example",
      files: skillFiles("global-example"),
    });
    expect(duplicate).toMatchObject({
      ok: false,
      error: expect.stringContaining("already exists"),
    });
    expect(listEnterpriseSkillCatalog({}).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "global-example",
          category: "managed",
          ownerAgentId: null,
        }),
      ]),
    );
    await importEnterpriseSkillFolder({
      config,
      agentId: "writer",
      folderName: "global-example",
      files: skillFiles("global-example"),
    });
    const catalog = listEnterpriseSkillCatalog({
      agents: { entries: { writer: { workspace } } },
    }).items;
    expect(catalog.filter((item) => item.name === "global-example")).toHaveLength(2);
  });

  it.each([
    "../escape",
    "/tmp/escape",
    "scripts/../../escape",
    "scripts\\escape",
    ".clawhub/origin.json",
    "C:/escape",
  ])("rejects unsafe path %s before installing", async (badPath) => {
    await expect(
      importEnterpriseSkillFolder({
        config,
        folderName: "unsafe",
        files: [...skillFiles("unsafe"), file(badPath, "bad")],
      }),
    ).rejects.toThrow("FIELD_INVALID:files.path");
    await expect(fs.access(path.join(root, "skills/unsafe"))).rejects.toThrow();
  });

  it("rejects missing metadata, malformed content, duplicates and unknown agents", async () => {
    for (const files of [
      [file("readme.md", "missing")],
      [file("SKILL.md", "not a skill")],
      [...skillFiles("invalid"), file("skill.md", "duplicate")],
      [{ path: "SKILL.md", contentBase64: "%%%" }],
      Array.from({ length: 201 }, (_, i) => file(`${i}.txt`, "")),
    ]) {
      await expect(
        importEnterpriseSkillFolder({ config, folderName: "invalid", files }),
      ).rejects.toThrow("FIELD_INVALID");
    }
    await expect(
      importEnterpriseSkillFolder({
        config,
        agentId: "missing",
        folderName: "invalid",
        files: skillFiles("invalid"),
      }),
    ).rejects.toThrow("FIELD_INVALID:agentId");
    await expect(
      importEnterpriseSkillFolder({
        config,
        folderName: "large",
        files: [...skillFiles("large"), file("data", Buffer.alloc(10 * 1024 * 1024))],
      }),
    ).rejects.toThrow("BODY_TOO_LARGE");
  });
});
