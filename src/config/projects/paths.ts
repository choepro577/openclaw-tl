import os from "node:os";
import path from "node:path";
import { resolveRequiredHomeDir } from "../../infra/home-dir.js";
import { DEFAULT_AGENT_ID, normalizeAgentId } from "../../routing/session-key.js";
import { resolveStateDir } from "../paths.js";

function resolveAgentProjectsDir(
  agentId?: string,
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = () => resolveRequiredHomeDir(env, os.homedir),
): string {
  const root = resolveStateDir(env, homedir);
  const id = normalizeAgentId(agentId ?? DEFAULT_AGENT_ID);
  return path.join(root, "agents", id, "projects");
}

export function resolveDefaultProjectStorePath(agentId?: string): string {
  return path.join(resolveAgentProjectsDir(agentId), "projects.json");
}

export function resolveProjectStorePathFromSessionStorePath(sessionStorePath: string): string {
  const sessionsDir = path.dirname(path.resolve(sessionStorePath));
  const agentDir = path.dirname(sessionsDir);
  return path.join(agentDir, "projects", "projects.json");
}
