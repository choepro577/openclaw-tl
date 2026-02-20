import fs from "node:fs/promises";
import path from "node:path";
import { listAgentIds, resolveAgentDir, resolveAgentWorkspaceDir } from "../agents/agent-scope.js";
import { DEFAULT_IDENTITY_FILENAME, ensureAgentWorkspace } from "../agents/workspace.js";
import {
  applyAgentConfig,
  findAgentEntryIndex,
  listAgentEntries,
} from "../commands/agents.config.js";
import { writeConfigFile, type OpenClawConfig } from "../config/config.js";
import { resolveSessionTranscriptsDirForAgent } from "../config/sessions/paths.js";
import { DEFAULT_AGENT_ID, normalizeAgentId } from "../routing/session-key.js";

export type EnsureAgentProvisionResult = {
  status: "created" | "existing";
  agentId: string;
  workspace: string;
  config: OpenClawConfig;
};

function sanitizeIdentityLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function resolveOptionalIdentityField(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? sanitizeIdentityLine(trimmed) : undefined;
}

async function ensureAgentRuntimeDirs(params: {
  cfg: OpenClawConfig;
  agentId: string;
  workspace: string;
  ensureBootstrapFiles?: boolean;
}) {
  const ensureBootstrapFiles =
    typeof params.ensureBootstrapFiles === "boolean"
      ? params.ensureBootstrapFiles
      : !params.cfg.agents?.defaults?.skipBootstrap;
  await ensureAgentWorkspace({
    dir: params.workspace,
    ensureBootstrapFiles,
  });
  await fs.mkdir(resolveSessionTranscriptsDirForAgent(params.agentId), { recursive: true });
}

export async function ensureAgentProvisioned(params: {
  cfg: OpenClawConfig;
  agentId: string;
  name?: string;
  workspace?: string;
  model?: string;
  failIfExists?: boolean;
  ensureBootstrapFiles?: boolean;
  identity?: {
    name?: string;
    emoji?: string;
    avatar?: string;
  };
}): Promise<EnsureAgentProvisionResult> {
  const cfg = params.cfg;
  const agentId = normalizeAgentId(params.agentId);
  const explicitExists = findAgentEntryIndex(listAgentEntries(cfg), agentId) >= 0;
  const implicitDefaultExists =
    !explicitExists && agentId === DEFAULT_AGENT_ID && listAgentIds(cfg).includes(DEFAULT_AGENT_ID);
  const exists = explicitExists || implicitDefaultExists;

  if (exists) {
    if (params.failIfExists) {
      throw new Error(`agent "${agentId}" already exists`);
    }
    const workspace = resolveAgentWorkspaceDir(cfg, agentId);
    await ensureAgentRuntimeDirs({
      cfg,
      agentId,
      workspace,
      ensureBootstrapFiles: params.ensureBootstrapFiles,
    });
    return {
      status: "existing",
      agentId,
      workspace,
      config: cfg,
    };
  }

  const workspaceDir = params.workspace?.trim()
    ? params.workspace.trim()
    : resolveAgentWorkspaceDir(cfg, agentId);
  const rawName = params.name?.trim() || agentId;

  let nextConfig = applyAgentConfig(cfg, {
    agentId,
    name: rawName,
    workspace: workspaceDir,
    ...(params.model?.trim() ? { model: params.model.trim() } : {}),
  });
  const agentDir = resolveAgentDir(nextConfig, agentId);
  nextConfig = applyAgentConfig(nextConfig, { agentId, agentDir });

  await ensureAgentRuntimeDirs({
    cfg: nextConfig,
    agentId,
    workspace: workspaceDir,
    ensureBootstrapFiles: params.ensureBootstrapFiles,
  });
  await writeConfigFile(nextConfig);

  const identityName = resolveOptionalIdentityField(params.identity?.name);
  const identityEmoji = resolveOptionalIdentityField(params.identity?.emoji);
  const identityAvatar = resolveOptionalIdentityField(params.identity?.avatar);
  if (identityName || identityEmoji || identityAvatar) {
    const identityPath = path.join(workspaceDir, DEFAULT_IDENTITY_FILENAME);
    const lines = [
      "",
      ...(identityName ? [`- Name: ${identityName}`] : []),
      ...(identityEmoji ? [`- Emoji: ${identityEmoji}`] : []),
      ...(identityAvatar ? [`- Avatar: ${identityAvatar}`] : []),
      "",
    ];
    await fs.appendFile(identityPath, lines.join("\n"), "utf-8");
  }

  return {
    status: "created",
    agentId,
    workspace: workspaceDir,
    config: nextConfig,
  };
}
