// Deterministic per-profile, per-agent workspace roots for Enterprise sessions.
import fs from "node:fs";
import path from "node:path";
import { WORKSPACE_BOOTSTRAP_FILENAMES } from "../../agents/workspace.js";
import { resolveStateDir } from "../../config/paths.js";

function requireOpaqueId(value: string, label: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(normalized)) {
    throw new Error(`${label}_INVALID`);
  }
  return normalized;
}

/** Returns a workspace that can never overlap another profile or agent id. */
export function resolveEnterpriseWorkspacePath(
  profileId: string,
  agentId: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const safeProfileId = requireOpaqueId(profileId, "PROFILE_ID");
  const safeAgentId = requireOpaqueId(agentId, "AGENT_ID");
  const root = path.resolve(resolveStateDir(env), "enterprise", "accounts");
  const workspace = path.resolve(root, safeProfileId, "agents", safeAgentId, "workspace");
  if (!workspace.startsWith(`${root}${path.sep}`)) {
    throw new Error("WORKSPACE_ESCAPE");
  }
  return workspace;
}

export function ensureEnterpriseWorkspace(
  profileId: string,
  agentId: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const workspace = resolveEnterpriseWorkspacePath(profileId, agentId, env);
  fs.mkdirSync(workspace, { recursive: true, mode: 0o700 });
  fs.chmodSync(workspace, 0o700);
  const stat = fs.lstatSync(workspace);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("WORKSPACE_NOT_PRIVATE_DIRECTORY");
  }
  return workspace;
}

/** Seeds a private workspace once from the shared Agent definition without following links. */
export function ensureEnterpriseWorkspaceFromTemplate(
  profileId: string,
  agentId: string,
  templateWorkspace: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const workspace = ensureEnterpriseWorkspace(profileId, agentId, env);
  if (!templateWorkspace) {
    return workspace;
  }
  const sourceRoot = path.resolve(templateWorkspace);
  if (!fs.existsSync(sourceRoot) || !fs.lstatSync(sourceRoot).isDirectory()) {
    return workspace;
  }
  for (const name of WORKSPACE_BOOTSTRAP_FILENAMES) {
    const source = path.join(sourceRoot, name);
    const target = path.join(workspace, name);
    if (fs.existsSync(target) || !fs.existsSync(source)) {
      continue;
    }
    const stat = fs.lstatSync(source);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1 || stat.size > 1024 * 1024) {
      continue;
    }
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(target, 0o600);
  }
  return workspace;
}
