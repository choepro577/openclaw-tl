import type { OpenClawConfig } from "../config/types.openclaw.js";

/** Resolve scheduled maintenance against its durable owner, never the global agent roster. */
export async function resolveMemoryDreamingRunConfig(
  config: OpenClawConfig,
  context: { jobId?: string; agentId?: string },
): Promise<OpenClawConfig> {
  if (!context.jobId || config.enterprise?.enabled !== true) {
    return config;
  }
  const { loadCronJobsStoreSync, resolveCronJobsStorePathFromConfig } =
    await import("../cron/store.js");
  const job = loadCronJobsStoreSync(resolveCronJobsStorePathFromConfig(config)).jobs.find(
    (candidate) => candidate.id === context.jobId,
  );
  if (!job) {
    throw new Error("Dreaming automation no longer exists");
  }
  if (!job.owner?.accountId) {
    return config;
  }
  if (!context.agentId || job.agentId !== context.agentId) {
    throw new Error("Dreaming automation agent does not match its owner");
  }
  const { resolveEnterpriseCronExecution } =
    await import("../enterprise/automations/enterprise-cron-execution.js");
  const { cfg } = resolveEnterpriseCronExecution({
    job,
    agentId: context.agentId,
    runtimeConfig: config,
  });
  const entry = cfg.agents?.entries?.[context.agentId];
  if (!entry) {
    throw new Error("Dreaming automation agent is unavailable");
  }
  cfg.agents = { ...cfg.agents, entries: { [context.agentId]: { ...entry, default: true } } };
  return cfg;
}
