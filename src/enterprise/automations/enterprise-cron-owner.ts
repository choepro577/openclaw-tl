import type { CronJob } from "../../cron/types.js";

const ENTERPRISE_CRON_OWNER_PREFIX = "enterprise-account:";

export function enterpriseCronOwnerSessionKey(accountId: string): string {
  return `${ENTERPRISE_CRON_OWNER_PREFIX}${accountId}`;
}

export function enterpriseCronOwnerAccountId(job: Pick<CronJob, "owner">): string | undefined {
  const accountId = job.owner?.accountId?.trim();
  return accountId && job.owner?.sessionKey === enterpriseCronOwnerSessionKey(accountId)
    ? accountId
    : undefined;
}
