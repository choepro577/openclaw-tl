/** Shared sandbox workspace and skill preparation helpers. */
import fs from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { measureDiagnosticsTimelineSpan } from "../../infra/diagnostics-timeline.js";
import { defaultRuntime } from "../../runtime.js";
import { createLazyRuntimeNamedExport } from "../../shared/lazy-runtime.js";
import type { SkillEligibilityContext, SkillSnapshot, SkillUsagePath } from "../../skills/types.js";
import type { ExecPolicyOverrides } from "../exec-defaults.js";
import { getSandboxBackendWorkdirResolver } from "./backend.js";
import { resolveSandboxConfigForAgent } from "./config.js";
import { acquireSandboxLifecycleLease } from "./lifecycle.js";
import { resolveSandboxWorkspaceLayoutPaths } from "./shared.js";
import { ensureSandboxSkillsDirectory } from "./workspace-mounts.js";
import { ensureSandboxWorkspace } from "./workspace.js";

const loadSyncWorkspaceSkills = createLazyRuntimeNamedExport(
  () => import("../../skills/loading/workspace-skill-sync.runtime.js"),
  "syncWorkspaceSkills",
);

export type SandboxWorkspaceLayout = ReturnType<typeof resolveSandboxWorkspaceLayoutPaths>;

export type SandboxSkillFacts = {
  eligibility?: SkillEligibilityContext;
  skillUsagePaths?: SkillUsagePath[];
};

export function resolveSandboxWorkspaceInfoWorkdir(params: {
  cfg: ReturnType<typeof resolveSandboxConfigForAgent>;
  rawSessionKey: string;
  scopeKey: string;
  workspaceDir: string;
  agentWorkspaceDir: string;
  skillsWorkspaceDir: string;
}): string | undefined {
  return getSandboxBackendWorkdirResolver(params.cfg.backend)?.({
    sessionKey: params.rawSessionKey,
    scopeKey: params.scopeKey,
    workspaceDir: params.workspaceDir,
    agentWorkspaceDir: params.agentWorkspaceDir,
    skillsWorkspaceDir: params.skillsWorkspaceDir,
    cfg: params.cfg,
  });
}

export function sandboxTimelineOptions(params: {
  config?: OpenClawConfig;
  cfg: ReturnType<typeof resolveSandboxConfigForAgent>;
  stage: string;
}) {
  return {
    phase: "agent.prepare",
    config: params.config,
    attributes: {
      stage: params.stage,
      backend: params.cfg.backend,
      scope: params.cfg.scope,
      workspaceAccess: params.cfg.workspaceAccess,
      browserEnabled: params.cfg.browser.enabled,
    },
  };
}

type SyncSandboxSkillsParams = {
  sourceWorkspaceDir: string;
  targetWorkspaceDir: string;
  config?: OpenClawConfig;
  agentId: string;
  rawSessionKey: string;
  execOverrides?: ExecPolicyOverrides;
  skillsSnapshot?: SkillSnapshot;
  assertCurrent?: () => void;
};

async function syncSandboxSkillsToWorkspace(
  params: SyncSandboxSkillsParams,
): Promise<SandboxSkillFacts> {
  params.assertCurrent?.();
  let syncWorkspaceSkills: Awaited<ReturnType<typeof loadSyncWorkspaceSkills>>;
  let getRemoteSkillEligibility: typeof import("../../skills/runtime/remote.js").getRemoteSkillEligibility;
  let resolveNodeExecEligibility: typeof import("../exec-defaults.js").resolveNodeExecEligibility;
  try {
    [syncWorkspaceSkills, { getRemoteSkillEligibility }, { resolveNodeExecEligibility }] =
      await Promise.all([
        loadSyncWorkspaceSkills(),
        import("../../skills/runtime/remote.js"),
        import("../exec-defaults.js"),
      ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    defaultRuntime.error?.(`Sandbox skill sync failed: ${message}`);
    return {};
  }
  // Lazy imports are an async boundary. A revoked prewarm subscriber may not
  // start a new skill policy write after the modules have loaded.
  params.assertCurrent?.();
  let eligibility: SkillEligibilityContext;
  try {
    const nodeSkills = resolveNodeExecEligibility({
      cfg: params.config,
      sessionKey: params.rawSessionKey,
      agentId: params.agentId,
      execOverrides: params.execOverrides,
    });
    eligibility = {
      nodeSkills,
      remote: getRemoteSkillEligibility({
        advertiseExecNode: nodeSkills.canExec,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    defaultRuntime.error?.(`Sandbox skill sync failed: ${message}`);
    return {};
  }
  params.assertCurrent?.();
  let skillUsagePaths: SkillUsagePath[];
  try {
    skillUsagePaths = await syncWorkspaceSkills({
      sourceWorkspaceDir: params.sourceWorkspaceDir,
      targetWorkspaceDir: params.targetWorkspaceDir,
      config: params.config,
      agentId: params.agentId,
      eligibility,
      skillsSnapshot: params.skillsSnapshot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    defaultRuntime.error?.(`Sandbox skill sync failed: ${message}`);
    return {};
  }
  params.assertCurrent?.();
  return { eligibility, skillUsagePaths };
}

export function resolveSandboxWorkspaceLayout(params: {
  cfg: ReturnType<typeof resolveSandboxConfigForAgent>;
  agentId: string;
  rawSessionKey: string;
  workspaceDir?: string;
}): SandboxWorkspaceLayout {
  return resolveSandboxWorkspaceLayoutPaths({
    cfg: params.cfg,
    rawSessionKey: params.rawSessionKey,
    agentId: params.agentId,
    workspaceDir: params.workspaceDir,
  });
}

export async function ensureSandboxWorkspaceBase(params: {
  cfg: ReturnType<typeof resolveSandboxConfigForAgent>;
  layout: SandboxWorkspaceLayout;
  config?: OpenClawConfig;
}): Promise<void> {
  const { cfg, layout } = params;
  if (cfg.workspaceAccess !== "rw") {
    await measureDiagnosticsTimelineSpan(
      "sandbox.workspace.seed",
      () =>
        ensureSandboxWorkspace(
          layout.sandboxWorkspaceDir,
          layout.agentWorkspaceDir,
          params.config?.agents?.defaults?.skipBootstrap,
          params.config?.agents?.defaults?.skipOptionalBootstrapFiles,
        ),
      sandboxTimelineOptions({ ...params, stage: "workspace-seed" }),
    );
  } else {
    await measureDiagnosticsTimelineSpan(
      "sandbox.workspace.mkdir",
      async () => {
        await fs.mkdir(layout.workspaceDir, { recursive: true });
        // Docker determines its read-only mounts before caller-specific skill sync.
        await ensureSandboxSkillsDirectory(path.join(layout.skillsWorkspaceDir, "skills"));
      },
      sandboxTimelineOptions({ ...params, stage: "workspace-mkdir" }),
    );
  }
}

export async function syncSandboxWorkspaceSkills(params: {
  cfg: ReturnType<typeof resolveSandboxConfigForAgent>;
  layout: SandboxWorkspaceLayout;
  config?: OpenClawConfig;
  agentId: string;
  rawSessionKey: string;
  execOverrides?: ExecPolicyOverrides;
  skillsSnapshot?: SkillSnapshot;
  assertCurrent?: () => void;
}): Promise<SandboxSkillFacts> {
  const targetWorkspaceDir =
    params.cfg.workspaceAccess === "rw"
      ? params.layout.skillsWorkspaceDir
      : params.layout.sandboxWorkspaceDir;
  return await measureDiagnosticsTimelineSpan(
    "sandbox.skills.sync",
    () =>
      syncSandboxSkillsToWorkspace({
        sourceWorkspaceDir: params.layout.agentWorkspaceDir,
        targetWorkspaceDir,
        config: params.config,
        agentId: params.agentId,
        rawSessionKey: params.rawSessionKey,
        execOverrides: params.execOverrides,
        skillsSnapshot: params.skillsSnapshot,
        assertCurrent: params.assertCurrent,
      }),
    sandboxTimelineOptions({ ...params, stage: "skills-sync" }),
  );
}

export async function ensureSandboxWorkspaceLayout(params: {
  cfg: ReturnType<typeof resolveSandboxConfigForAgent>;
  agentId: string;
  rawSessionKey: string;
  config?: OpenClawConfig;
  execOverrides?: ExecPolicyOverrides;
  skillsSnapshot?: SkillSnapshot;
  workspaceDir?: string;
}): Promise<
  SandboxWorkspaceLayout & {
    skillsEligibility?: SkillEligibilityContext;
    skillUsagePaths?: SkillUsagePath[];
  }
> {
  const layout = resolveSandboxWorkspaceLayout(params);
  const releaseSandboxLifecycle = await acquireSandboxLifecycleLease(layout.scopeKey);
  try {
    await ensureSandboxWorkspaceBase({ cfg: params.cfg, layout, config: params.config });
    const syncedSkills = await syncSandboxWorkspaceSkills({
      ...params,
      layout,
      assertCurrent: () => undefined,
    });
    return {
      ...layout,
      ...(syncedSkills.eligibility ? { skillsEligibility: syncedSkills.eligibility } : {}),
      ...(syncedSkills.skillUsagePaths ? { skillUsagePaths: syncedSkills.skillUsagePaths } : {}),
    };
  } finally {
    releaseSandboxLifecycle();
  }
}
