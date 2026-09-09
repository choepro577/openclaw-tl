import { readConfigFileSnapshot } from "../../config/io.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { getEnterpriseAccountById, listEnterpriseAccounts } from "../accounts/account-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { resolveEnterpriseResourceAccess } from "../entitlements/entitlement-store.js";
import { resolveEnterpriseSharedAgentCatalogKey } from "../user/user-agent-key.js";
import { listEnterpriseUserSharedAgentRoster } from "../user/user-agent-roster.js";
import type { AgentKey } from "../user/user-api-contracts.js";
import {
  approveEnterpriseAgentAccessRequest,
  cancelEnterpriseAgentAccessRequest,
  createEnterpriseAgentAccessRequest,
  findEnterpriseAgentAccessRequest,
  getEnterpriseAgentAccessRequest,
  listEnterpriseAgentAccessRequests,
  rejectEnterpriseAgentAccessRequest,
} from "./agent-access-request-store.js";
import type {
  EnterpriseAgentAccessRequest,
  EnterpriseAgentAccessRequestEntitlement,
  EnterpriseAgentAccessRequestSummary,
} from "./agent-access-request-types.js";
import { withEnterpriseAgentLifecycleLocks } from "./enterprise-agent-lifecycle-lock.js";

export type EnterpriseAgentAccessRequestAccount = {
  id: string;
  username: string;
  displayName: string;
};

export type EnterpriseAgentAccessRequestAgent = {
  agentId: string;
  name: string;
  description: string;
  resourceKey: string;
};

export type EnterpriseAdminAgentAccessRequest = EnterpriseAgentAccessRequest & {
  requester: EnterpriseAgentAccessRequestAccount | null;
  agent: EnterpriseAgentAccessRequestAgent | null;
};

export type EnterpriseUserAgentAccess = {
  allowed: boolean;
  reason: string;
  request: EnterpriseAgentAccessRequestSummary | null;
};

function summarizeRequest(
  request: EnterpriseAgentAccessRequest | undefined,
): EnterpriseAgentAccessRequestSummary | null {
  if (!request) {
    return null;
  }
  return {
    id: request.id,
    agentKey: request.agentKey,
    state: request.state,
    decisionReason: request.decisionReason,
    revision: request.revision,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    decidedAt: request.decidedAt,
  };
}

function presentRequestWithContext(
  request: EnterpriseAgentAccessRequest,
  catalog: ReturnType<typeof listEnterpriseUserSharedAgentRoster>,
  accounts: ReadonlyMap<string, EnterpriseAccount | undefined>,
): EnterpriseAdminAgentAccessRequest {
  const requester = accounts.get(request.requesterAccountId);
  const agent = catalog.shared.find((candidate) => candidate.resourceKey === request.resourceKey);
  return {
    ...request,
    requester: requester
      ? {
          id: requester.id,
          username: requester.username,
          displayName: requester.displayName,
        }
      : null,
    agent: agent
      ? {
          agentId: agent.agentId,
          name: agent.name,
          description: agent.description,
          resourceKey: agent.resourceKey,
        }
      : null,
  };
}

export function presentEnterpriseAgentAccessRequest(
  request: EnterpriseAgentAccessRequest,
  config: OpenClawConfig,
): EnterpriseAdminAgentAccessRequest {
  return presentRequestWithContext(
    request,
    listEnterpriseUserSharedAgentRoster(config),
    new Map([[request.requesterAccountId, getEnterpriseAccountById(request.requesterAccountId)]]),
  );
}

export function presentEnterpriseAgentAccessRequestSummary(
  request: EnterpriseAgentAccessRequest | undefined,
): EnterpriseAgentAccessRequestSummary | null {
  return summarizeRequest(request);
}

export function readEnterpriseUserAgentAccess(
  account: EnterpriseAccount,
  resourceKey: string,
): EnterpriseUserAgentAccess {
  const access = resolveEnterpriseResourceAccess(account, "agent", resourceKey);
  return {
    allowed: access.allowed,
    reason: access.reason,
    request: summarizeRequest(findEnterpriseAgentAccessRequest(account.id, resourceKey)),
  };
}

export function listEnterpriseUserAgentAccessRequests(
  accountId: string,
): EnterpriseAgentAccessRequestSummary[] {
  return listEnterpriseAgentAccessRequests({ requesterAccountId: accountId }).map((request) =>
    summarizeRequest(request)!,
  );
}

export function listEnterpriseAdminAgentAccessRequests(
  config: OpenClawConfig,
): EnterpriseAdminAgentAccessRequest[] {
  const catalog = listEnterpriseUserSharedAgentRoster(config);
  const accounts = new Map(listEnterpriseAccounts().map((account) => [account.id, account]));
  return listEnterpriseAgentAccessRequests().map((request) =>
    presentRequestWithContext(request, catalog, accounts),
  );
}

export function getEnterpriseAdminAgentAccessRequest(
  config: OpenClawConfig,
  requestId: string,
): EnterpriseAdminAgentAccessRequest | undefined {
  const request = getEnterpriseAgentAccessRequest(requestId);
  return request ? presentEnterpriseAgentAccessRequest(request, config) : undefined;
}

function requireCatalogAgent(config: OpenClawConfig, agentKey: AgentKey) {
  const resolved = resolveEnterpriseSharedAgentCatalogKey(config, agentKey);
  if (!resolved) {
    throw new Error("AGENT_NOT_FOUND");
  }
  return resolved;
}

export async function requestEnterpriseAgentAccess(
  config: OpenClawConfig,
  account: EnterpriseAccount,
  agentKey: AgentKey,
): Promise<EnterpriseAgentAccessRequest> {
  const requested = requireCatalogAgent(config, agentKey);
  return await withEnterpriseAgentLifecycleLocks([requested.resourceKey], async () => {
    const snapshot = await readConfigFileSnapshot({
      observe: false,
      pluginValidation: "core-only",
    });
    if (!snapshot.valid) {
      throw new Error("CONFIG_CURRENT_INVALID");
    }
    const resolved = requireCatalogAgent(snapshot.config ?? config, agentKey);
    if (resolved.resourceKey !== requested.resourceKey) {
      throw new Error("AGENT_NOT_FOUND");
    }
    if (resolveEnterpriseResourceAccess(account, "agent", resolved.resourceKey).allowed) {
      throw new Error("AGENT_ACCESS_ALREADY_GRANTED");
    }
    return createEnterpriseAgentAccessRequest({
      requesterAccountId: account.id,
      agentId: resolved.agentId,
      resourceKey: resolved.resourceKey,
    });
  });
}

export function cancelUserEnterpriseAgentAccessRequest(input: {
  requestId: string;
  accountId: string;
  baseRevision: number;
}): EnterpriseAgentAccessRequestSummary {
  return summarizeRequest(
    cancelEnterpriseAgentAccessRequest({
      requestId: input.requestId,
      requesterAccountId: input.accountId,
      baseRevision: input.baseRevision,
    }),
  )!;
}

export function rejectEnterpriseAdminAgentAccessRequest(input: {
  requestId: string;
  reviewerAccountId: string;
  baseRevision: number;
  reason: string;
}): EnterpriseAgentAccessRequest {
  return rejectEnterpriseAgentAccessRequest(input);
}

export async function approveEnterpriseAdminAgentAccessRequest(
  config: OpenClawConfig,
  input: { requestId: string; reviewerAccountId: string; baseRevision: number },
): Promise<{
  request: EnterpriseAgentAccessRequest;
  entitlement: EnterpriseAgentAccessRequestEntitlement;
}> {
  const current = getEnterpriseAgentAccessRequest(input.requestId);
  if (!current) {
    throw new Error("AGENT_ACCESS_REQUEST_NOT_FOUND");
  }
  return await withEnterpriseAgentLifecycleLocks([current.resourceKey], async () => {
    const snapshot = await readConfigFileSnapshot({
      observe: false,
      pluginValidation: "core-only",
    });
    if (!snapshot.valid) {
      throw new Error("CONFIG_CURRENT_INVALID");
    }
    const resolved = resolveEnterpriseSharedAgentCatalogKey(
      snapshot.config ?? config,
      current.agentKey,
    );
    if (!resolved || resolved.resourceKey !== current.resourceKey) {
      throw new Error("AGENT_NOT_FOUND");
    }
    return approveEnterpriseAgentAccessRequest(input);
  });
}
