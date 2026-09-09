// Memory Core plugin module implements tools.shared behavior.
import { createLazyRuntimeModule } from "openclaw/plugin-sdk/lazy-runtime";
import type {
  AnyAgentTool,
  OpenClawConfig,
} from "openclaw/plugin-sdk/memory-core-host-runtime-core";
import {
  resolveMemoryToolContext,
  type MemoryToolContract,
  type MemoryToolOptions,
} from "./memory-tool-contract.js";
import type { MemoryCoreAcquireLocalService } from "./memory/embedding-local-service.js";
type MemorySearchManagerResult = Awaited<
  ReturnType<(typeof import("./memory/index.js"))["getMemorySearchManager"]>
>;
export const loadMemoryToolRuntime = createLazyRuntimeModule(() => import("./tools.runtime.js"));

export async function getMemoryManagerContextWithPurpose(params: {
  cfg: OpenClawConfig;
  agentId: string;
  purpose?: "default" | "status" | "cli";
  acquireLocalService?: MemoryCoreAcquireLocalService;
}): Promise<
  | {
      manager: NonNullable<MemorySearchManagerResult["manager"]>;
      debug?: NonNullable<MemorySearchManagerResult["debug"]>;
    }
  | {
      error: string | undefined;
    }
> {
  const { getMemorySearchManager } = await loadMemoryToolRuntime();
  const startedAt = Date.now();
  const { manager, debug, error } = await getMemorySearchManager({
    cfg: params.cfg,
    agentId: params.agentId,
    purpose: params.purpose,
    ...(params.acquireLocalService ? { acquireLocalService: params.acquireLocalService } : {}),
  });
  return manager
    ? {
        manager,
        debug: {
          backend: debug?.backend ?? "builtin",
          purpose: debug?.purpose ?? params.purpose ?? "default",
          managerMs: debug?.managerMs ?? Math.max(0, Date.now() - startedAt),
        },
      }
    : { error };
}

export function createMemoryTool(params: {
  options: MemoryToolOptions;
  contract: MemoryToolContract;
  execute: (ctx: { cfg: OpenClawConfig; agentId: string }) => AnyAgentTool["execute"];
}): AnyAgentTool | null {
  const ctx = resolveMemoryToolContext(params.options);
  if (!ctx) {
    return null;
  }
  return {
    label: params.contract.label,
    name: params.contract.name,
    description: params.contract.describe(ctx.sources),
    parameters: params.contract.parameters,
    execute: async (toolCallId, toolParams, signal, onUpdate) => {
      const latestCtx = params.options.getConfig ? resolveMemoryToolContext(params.options) : ctx;
      // A live getter makes missing or disabled current config a revocation.
      // The captured context is valid only for fixed-snapshot callers.
      if (!latestCtx) {
        throw new Error(
          "Memory is disabled for this agent. Enable memory search for this agent, then retry.",
        );
      }
      return await params.execute(latestCtx)(toolCallId, toolParams, signal, onUpdate);
    },
  };
}

export const MEMORY_RECALL_RECOVERY_GUIDANCE =
  "Continue with information confirmed in the current conversation. Ask for any missing facts, and suggest contacting the administrator if earlier information is still needed.";

export function buildMemorySearchUnavailableResult() {
  // Tool results are model context, including debug fields. Detailed diagnostics
  // remain in manager status and operator CLI output, not business answers.
  return {
    results: [],
    disabled: true,
    unavailable: true,
    error: "memory_recall_unavailable",
    warning: "Memory recall is temporarily unavailable; earlier information could not be checked.",
    action: MEMORY_RECALL_RECOVERY_GUIDANCE,
  };
}
