import { computeNextRunAtMs } from "../../cron/schedule.js";
import { createAccountCronScheduledToolPolicy } from "../../cron/scheduled-tool-policy.js";
import { noteCronJobsStoreCommit, resolveCronJobsStorePath } from "../../cron/store.js";
import { cronStoreKey } from "../../cron/store/key.js";
import {
  deleteCronJobRowInDatabase,
  loadedCronStoreFromRows,
  loadCronRows,
  upsertCronJobRow,
} from "../../cron/store/row-codec.js";
import type { CronJob } from "../../cron/types.js";
import { generateSecureUuid } from "../../infra/secure-random.js";
import {
  DEFAULT_MEMORY_DREAMING_FREQUENCY,
  MANAGED_MEMORY_DREAMING_CRON_NAME,
  MEMORY_DREAMING_SYSTEM_EVENT_TEXT,
} from "../../memory-host-sdk/dreaming.js";
import type { OpenClawStateDatabase } from "../../state/openclaw-state-db-contract.js";
import { deferOpenClawStatePostCommitPublication } from "../../state/openclaw-state-db-post-commit.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { enterpriseCronOwnerSessionKey } from "./enterprise-cron-owner.js";

/** Account and its private maintenance jobs commit together, including CLI-created accounts. */
export function provisionEnterpriseDefaultAutomations(
  database: OpenClawStateDatabase,
  account: EnterpriseAccount,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const agentId = resolveEnterprisePersonalAgentId({}, account);
  const storeKey = cronStoreKey(resolveCronJobsStorePath(undefined, env));
  const now = account.createdAt;
  const common = {
    agentId,
    enabled: true,
    scheduledToolPolicy: createAccountCronScheduledToolPolicy({
      ownerAccountId: account.id,
      ownerSessionKey: enterpriseCronOwnerSessionKey(account.id),
    }),
    createdAtMs: now,
    updatedAtMs: now,
    owner: {
      accountId: account.id,
      agentId,
      sessionKey: enterpriseCronOwnerSessionKey(account.id),
    },
  };
  const jobs: CronJob[] = [
    {
      ...common,
      id: generateSecureUuid(),
      declarationKey: `heartbeat:${agentId}`,
      name: "heartbeat-main",
      schedule: { kind: "every", everyMs: 30 * 60_000, anchorMs: now },
      sessionTarget: "main",
      wakeMode: "next-heartbeat",
      payload: { kind: "heartbeat" },
      state: {},
    },
    {
      ...common,
      id: generateSecureUuid(),
      declarationKey: `enterprise:${account.id}:memory-dreaming`,
      name: MANAGED_MEMORY_DREAMING_CRON_NAME,
      schedule: { kind: "cron", expr: DEFAULT_MEMORY_DREAMING_FREQUENCY },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: {
        kind: "agentTurn",
        message: MEMORY_DREAMING_SYSTEM_EVENT_TEXT,
        lightContext: true,
      },
      delivery: { mode: "none" },
      state: {},
    },
  ];
  const sortOrder = loadCronRows(database.db, storeKey).reduce(
    (max, row) => Math.max(max, row.sort_order + 1),
    0,
  );
  for (const [index, job] of jobs.entries()) {
    job.state.nextRunAtMs = computeNextRunAtMs(job.schedule, now);
    upsertCronJobRow(database.db, storeKey, job, sortOrder + index);
  }
  deferOpenClawStatePostCommitPublication(database, () => noteCronJobsStoreCommit(storeKey));
}

/** Bootstrap rollback removes only the newly created account's scheduled state. */
export function removeEnterpriseDefaultAutomations(
  database: OpenClawStateDatabase,
  accountId: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const storeKey = cronStoreKey(resolveCronJobsStorePath(undefined, env));
  for (const job of loadedCronStoreFromRows(loadCronRows(database.db, storeKey)).store.jobs) {
    if (job.owner?.accountId === accountId) {
      deleteCronJobRowInDatabase(database.db, storeKey, job.id);
    }
  }
  deferOpenClawStatePostCommitPublication(database, () => noteCronJobsStoreCommit(storeKey));
}
