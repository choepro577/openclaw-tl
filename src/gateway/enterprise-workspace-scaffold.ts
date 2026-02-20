import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveOpenClawPackageRoot } from "../infra/openclaw-root.js";
import { pathExists } from "../utils.js";

export const ENTERPRISE_WORKSPACE_PROFILE = "enterprise-employee-v1" as const;
export const ENTERPRISE_WORKSPACE_FILE_NAMES = [
  "AGENTS.md",
  "SOUL.md",
  "TOOLS.md",
  "IDENTITY.md",
  "USER.md",
] as const;

type EnterpriseWorkspaceFileName = (typeof ENTERPRISE_WORKSPACE_FILE_NAMES)[number];

export type EnterpriseWorkspaceScaffoldResult = {
  profile: typeof ENTERPRISE_WORKSPACE_PROFILE;
  createdFiles: EnterpriseWorkspaceFileName[];
  existingFiles: EnterpriseWorkspaceFileName[];
};

const ENTERPRISE_TEMPLATE_SUBPATH = path.join(
  "docs",
  "reference",
  "templates-enterprise",
  "employee-v1",
);
const ENTERPRISE_TEMPLATE_FALLBACK = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/reference/templates-enterprise/employee-v1",
);

let cachedTemplateDir: string | undefined;
let templateDirResolution: Promise<string> | undefined;

async function resolveEnterpriseTemplateDir(): Promise<string> {
  if (cachedTemplateDir) {
    return cachedTemplateDir;
  }
  if (templateDirResolution) {
    return templateDirResolution;
  }

  templateDirResolution = (async () => {
    const packageRoot = await resolveOpenClawPackageRoot({
      moduleUrl: import.meta.url,
      argv1: process.argv[1],
      cwd: process.cwd(),
    });
    const candidates = [
      packageRoot ? path.join(packageRoot, ENTERPRISE_TEMPLATE_SUBPATH) : null,
      path.resolve(process.cwd(), ENTERPRISE_TEMPLATE_SUBPATH),
      ENTERPRISE_TEMPLATE_FALLBACK,
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        cachedTemplateDir = candidate;
        return candidate;
      }
    }

    cachedTemplateDir = candidates[0] ?? ENTERPRISE_TEMPLATE_FALLBACK;
    return cachedTemplateDir;
  })();

  try {
    return await templateDirResolution;
  } finally {
    templateDirResolution = undefined;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderTemplate(content: string, vars: Record<string, string>): string {
  let rendered = content;
  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.replace(new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "g"), value);
  }
  return rendered;
}

async function writeFileIfMissing(filePath: string, content: string): Promise<boolean> {
  try {
    await fs.writeFile(filePath, content, { encoding: "utf-8", flag: "wx" });
    return true;
  } catch (err) {
    const anyErr = err as { code?: string };
    if (anyErr.code === "EEXIST") {
      return false;
    }
    throw err;
  }
}

export async function ensureEnterpriseWorkspaceScaffold(params: {
  workspaceDir: string;
  agentId: string;
  staffCode: string;
  displayName: string;
  createdAt?: Date;
}): Promise<EnterpriseWorkspaceScaffoldResult> {
  await fs.mkdir(params.workspaceDir, { recursive: true });
  const templateDir = await resolveEnterpriseTemplateDir();
  const createdAtIso = (params.createdAt ?? new Date()).toISOString();

  const vars = {
    agentId: params.agentId,
    staffCode: params.staffCode,
    displayName: params.displayName,
    workspacePath: params.workspaceDir,
    createdAtIso,
  };

  const createdFiles: EnterpriseWorkspaceFileName[] = [];
  const existingFiles: EnterpriseWorkspaceFileName[] = [];

  for (const fileName of ENTERPRISE_WORKSPACE_FILE_NAMES) {
    const templatePath = path.join(templateDir, fileName);
    const content = await fs.readFile(templatePath, "utf-8");
    const rendered = renderTemplate(content, vars);
    const targetPath = path.join(params.workspaceDir, fileName);
    const created = await writeFileIfMissing(targetPath, rendered);
    if (created) {
      createdFiles.push(fileName);
    } else {
      existingFiles.push(fileName);
    }
  }

  return {
    profile: ENTERPRISE_WORKSPACE_PROFILE,
    createdFiles,
    existingFiles,
  };
}

export function resetEnterpriseWorkspaceTemplateCacheForTest(): void {
  cachedTemplateDir = undefined;
  templateDirResolution = undefined;
}
