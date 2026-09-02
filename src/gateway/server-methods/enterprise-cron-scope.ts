import { listAgentEntries } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { CronJob, CronJobCreate } from "../../cron/types.js";
import { getEnterpriseAccountById } from "../../enterprise/accounts/account-store.js";
import {
  enterpriseCronOwnerAccountId,
  enterpriseCronOwnerSessionKey,
} from "../../enterprise/automations/enterprise-cron-owner.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { enterpriseUserPortalIdentity } from "./gateway-client-identity.js";
import type { GatewayClient } from "./types.js";

export type EnterpriseCronCallerScope = {
  kind: "enterpriseUser";
  accountId: string;
  profileId: string;
  accountRole: "administrator" | "employee";
  active: boolean;
};

export function readEnterpriseCronCallerScope(
  client: GatewayClient | null | undefined,
): EnterpriseCronCallerScope | undefined {
  const identity = enterpriseUserPortalIdentity(client);
  if (!identity) {
    return undefined;
  }
  const account = getEnterpriseAccountById(identity.accountId);
  const active = Boolean(
    account?.enabled &&
    !account.mustChangePassword &&
    account.profileId === identity.profileId &&
    account.role === identity.accountRole,
  );
  return { kind: "enterpriseUser", ...identity, active };
}

export function cronJobMatchesEnterpriseScope(
  job: Pick<CronJob, "owner">,
  scope: EnterpriseCronCallerScope | undefined,
): boolean {
  return !scope || (scope.active && enterpriseCronOwnerAccountId(job) === scope.accountId);
}

/** Client-provided owner fields are never authoritative for Enterprise jobs. */
export function stampEnterpriseCronOwner(
  job: CronJobCreate,
  scope: EnterpriseCronCallerScope | undefined,
): CronJobCreate {
  if (!scope) {
    return job;
  }
  if (!scope.active) {
    throw new TypeError("Enterprise automation authority is no longer active");
  }
  const agentId = job.agentId?.trim() ? normalizeAgentId(job.agentId) : undefined;
  if (!agentId) {
    throw new TypeError("Enterprise automations require an explicit agentId");
  }
  return {
    ...job,
    agentId,
    owner: {
      accountId: scope.accountId,
      agentId,
      sessionKey: enterpriseCronOwnerSessionKey(scope.accountId),
    },
  };
}

export function assertEnterpriseCronSpec(params: {
  job: Pick<
    CronJob,
    "agentId" | "payload" | "schedule" | "sessionKey" | "sessionTarget" | "trigger"
  >;
  cfg: OpenClawConfig;
  scope: EnterpriseCronCallerScope | undefined;
  requireAgentEntitlement?: boolean;
}): void {
  if (!params.scope) {
    return;
  }
  if (!params.scope.active) {
    throw new TypeError("Enterprise automation authority is no longer active");
  }
  if (params.job.payload.kind !== "agentTurn") {
    throw new TypeError("Enterprise automations support agentTurn payloads only");
  }
  if (!["at", "every", "cron"].includes(params.job.schedule.kind)) {
    throw new TypeError("Enterprise automations require a time schedule");
  }
  if (params.job.trigger) {
    throw new TypeError("Enterprise automations do not support trigger scripts");
  }
  if (params.job.sessionTarget !== "isolated" || params.job.sessionKey?.trim()) {
    throw new TypeError("Enterprise automations must run in an isolated session");
  }
  if (params.requireAgentEntitlement === false) {
    return;
  }
  const agentId = params.job.agentId?.trim() ? normalizeAgentId(params.job.agentId) : undefined;
  const allowed = new Set(listAgentEntries(params.cfg).map((entry) => normalizeAgentId(entry.id)));
  if (!agentId || !allowed.has(agentId)) {
    throw new TypeError("Enterprise automation agentId is outside current entitlement");
  }
}
