import { listAgentEntries } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { CronJob } from "../../cron/types.js";
import { markGatewayRequestScopedRuntimeConfig } from "../../gateway/request-runtime-config.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { getEnterpriseAccountById, listEnterpriseAccounts } from "../accounts/account-store.js";
import {
  projectEnterpriseRuntimeConfig,
  resolveEnterpriseAllowedAgentIds,
} from "../isolation/enterprise-gateway-policy.js";
import {
  resolveEnterprisePersonalAgentId,
  resolveEnterprisePersonalAgentTemplateId,
} from "../personal-agent/personal-agent-config.js";
import { enterpriseCronOwnerAccountId } from "./enterprise-cron-owner.js";

export type EnterpriseCronExecution = {
  cfg: OpenClawConfig;
  createdActor?: { type: "human"; id: string; label?: string };
};

/** Re-resolve the current account policy immediately before an Enterprise job runs. */
export function resolveEnterpriseCronExecution(params: {
  job: CronJob;
  agentId: string;
  runtimeConfig: OpenClawConfig;
}): EnterpriseCronExecution {
  const accountId = enterpriseCronOwnerAccountId(params.job);
  if (!accountId) {
    return { cfg: params.runtimeConfig };
  }
  const account = getEnterpriseAccountById(accountId);
  if (!account?.enabled || account.mustChangePassword) {
    throw new Error("Enterprise automation owner is disabled or unavailable");
  }
  // Enterprise automations execute on behalf of User Portal accounts, including administrators.
  // Keep scheduled runs inside the same Agent and tool-policy boundary as interactive sessions.
  const userAudienceOptions = { userAudience: true };
  const agentId = normalizeAgentId(params.agentId);
  if (
    !resolveEnterpriseAllowedAgentIds(params.runtimeConfig, account, userAudienceOptions).has(
      agentId,
    )
  ) {
    throw new Error(`Enterprise automation agent entitlement was revoked: ${agentId}`);
  }
  const cfg = markGatewayRequestScopedRuntimeConfig(
    projectEnterpriseRuntimeConfig(params.runtimeConfig, account, userAudienceOptions),
    {
      enterpriseUser: {
        accountId: account.id,
        displayName: account.displayName,
        personalAgentId: resolveEnterprisePersonalAgentId(params.runtimeConfig, account),
        personalAgentTemplateId: resolveEnterprisePersonalAgentTemplateId(
          params.runtimeConfig,
          account,
        ),
      },
    },
  );
  if (!listAgentEntries(cfg).some((entry) => normalizeAgentId(entry.id) === agentId)) {
    throw new Error(`Enterprise automation agent is unavailable: ${agentId}`);
  }
  return {
    cfg,
    createdActor: {
      type: "human",
      id: account.profileId,
      ...(account.displayName ? { label: account.displayName } : {}),
    },
  };
}

/** Personal agents are durable account projections rather than global roster entries. */
export function isEnterpriseCronAgentAvailable(config: OpenClawConfig, agentId: string): boolean {
  return (
    config.enterprise?.enabled === true &&
    listEnterpriseAccounts().some(
      (account) =>
        account.enabled &&
        account.personalAgentEnabled &&
        resolveEnterprisePersonalAgentId(config, account) === agentId,
    )
  );
}
