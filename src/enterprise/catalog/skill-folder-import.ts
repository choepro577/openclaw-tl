import fs from "node:fs/promises";
import path from "node:path";
import { listAgentEntries, resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { withInstallWorkspace } from "../../infra/install-source-utils.js";
import { validateRequestedSkillSlug } from "../../skills/lifecycle/archive-install.js";
import { installSkillFromSource } from "../../skills/lifecycle/source-install.js";
import { parseSkillFrontmatter } from "../../skills/loading/frontmatter.js";
import { resolveSkillDiscoveryLimits } from "../../skills/loading/skill-root-discovery.js";
import { bumpSkillsSnapshotVersion } from "../../skills/runtime/refresh-state.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import { CONFIG_DIR } from "../../utils.js";

export const MAX_SKILL_FOLDER_BODY_BYTES = 15 * 1024 * 1024;
const MAX_SKILL_FOLDER_BYTES = 10 * 1024 * 1024;
const MAX_SKILL_FOLDER_FILES = 200;

export function resolveEnterpriseSkillInstallWorkspace(
  config: OpenClawConfig,
  agentId?: string | null,
): string {
  if (!agentId) {
    return CONFIG_DIR;
  }
  if (
    isReservedSystemAgentId(agentId) ||
    !listAgentEntries(config).some((entry) => entry.id === agentId)
  ) {
    throw new Error("FIELD_INVALID:agentId");
  }
  return resolveAgentWorkspaceDir(config, agentId);
}

export async function importEnterpriseSkillFolder(input: {
  config: OpenClawConfig;
  agentId?: string | null;
  folderName: string;
  files: unknown;
}) {
  const workspaceDir = resolveEnterpriseSkillInstallWorkspace(input.config, input.agentId);
  if (
    !input.folderName ||
    input.folderName.length > 128 ||
    /[/\\:\p{Cc}]/u.test(input.folderName) ||
    [".", ".."].includes(input.folderName)
  ) {
    throw new Error("FIELD_INVALID:folderName");
  }
  if (
    !Array.isArray(input.files) ||
    !input.files.length ||
    input.files.length > MAX_SKILL_FOLDER_FILES
  ) {
    throw new Error("FIELD_INVALID:files");
  }
  let total = 0;
  const files = new Map<string, Buffer>();
  const seen = new Set<string>();
  for (const file of input.files) {
    if (
      !file ||
      typeof file !== "object" ||
      typeof file.path !== "string" ||
      typeof file.contentBase64 !== "string"
    ) {
      throw new Error("FIELD_INVALID:files");
    }
    const parts = file.path.split("/");
    // Upload paths are relative file names, never server paths or install provenance.
    if (
      file.path.length > 1024 ||
      /[\\:\p{Cc}]/u.test(file.path) ||
      parts.some(
        (part: string) =>
          !part ||
          [".", "..", ".git", ".openclaw", ".clawhub", ".clawdhub"].includes(part.toLowerCase()),
      ) ||
      seen.has(file.path.toLowerCase())
    ) {
      throw new Error("FIELD_INVALID:files.path");
    }
    if (file.contentBase64.length > Math.ceil(MAX_SKILL_FOLDER_BYTES / 3) * 4) {
      throw new Error("FIELD_INVALID:files.contentBase64");
    }
    const content = Buffer.from(file.contentBase64, "base64");
    if (content.toString("base64") !== file.contentBase64) {
      throw new Error("FIELD_INVALID:files.contentBase64");
    }
    total += content.length;
    if (total > MAX_SKILL_FOLDER_BYTES) {
      throw new Error("BODY_TOO_LARGE");
    }
    seen.add(file.path.toLowerCase());
    files.set(file.path, content);
  }
  for (const relativePath of files.keys()) {
    const parts = relativePath.toLowerCase().split("/");
    if (parts.slice(1).some((_, index) => seen.has(parts.slice(0, index + 1).join("/")))) {
      throw new Error("FIELD_INVALID:files.path");
    }
  }
  let slug: string;
  try {
    const skill = files.get("SKILL.md");
    if (skill && skill.length > resolveSkillDiscoveryLimits(input.config).maxSkillFileBytes) {
      throw new Error("skill metadata too large");
    }
    const frontmatter = skill ? parseSkillFrontmatter(skill.toString("utf8")) : {};
    if (!frontmatter.name?.trim() || !frontmatter.description?.trim()) {
      throw new Error("missing metadata");
    }
    try {
      slug = validateRequestedSkillSlug(frontmatter.name);
    } catch {
      slug = validateRequestedSkillSlug(input.folderName);
    }
  } catch {
    throw new Error("FIELD_INVALID:SKILL.md (name, description)");
  }
  return await withInstallWorkspace("enterprise-skill-folder-", async (tempDir) => {
    const sourceDir = path.join(tempDir, input.folderName);
    for (const [relativePath, content] of files) {
      const target = path.join(sourceDir, relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, { flag: "wx" });
    }
    const warnings: string[] = [];
    const result = await installSkillFromSource({
      config: input.config,
      workspaceDir,
      spec: sourceDir,
      slug,
      logger: { warn: (warning) => warnings.push(warning) },
    });
    if (!result.ok) {
      return result;
    }
    bumpSkillsSnapshotVersion({ workspaceDir, reason: "manual" });
    return {
      ...result,
      message: `Installed ${result.slug}`,
      ...(warnings.length ? { warning: warnings.join("\n") } : {}),
    };
  });
}
