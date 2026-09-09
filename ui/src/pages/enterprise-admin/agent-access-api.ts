import { requestEnterprisePortalJson } from "../enterprise/services/enterprise-api.ts";

export type EnterpriseAgentAccessRequestState = "pending" | "approved" | "rejected" | "cancelled";

export type EnterpriseAgentAccessRequest = {
  id: string;
  requesterAccountId: string;
  requester: { id: string; username: string; displayName: string } | null;
  agentKey: string;
  resourceKey: string;
  agentId: string;
  agent: {
    agentId: string;
    name: string;
    description: string | null;
    resourceKey: string;
  } | null;
  state: EnterpriseAgentAccessRequestState;
  revision: number;
  decisionReason: string | null;
  reviewerAccountId: string | null;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
};

export type EnterpriseAgentAccessRequestDetail = {
  request: EnterpriseAgentAccessRequest;
};

export async function listAdminAgentAccessRequests(): Promise<EnterpriseAgentAccessRequest[]> {
  const result = await requestEnterprisePortalJson<{
    items: EnterpriseAgentAccessRequest[];
  }>("/api/enterprise/admin/agent-access-requests", undefined, "admin");
  return result.items;
}

export function loadAdminAgentAccessRequest(
  id: string,
): Promise<EnterpriseAgentAccessRequestDetail> {
  return requestEnterprisePortalJson<EnterpriseAgentAccessRequestDetail>(
    `/api/enterprise/admin/agent-access-requests/${encodeURIComponent(id)}`,
    undefined,
    "admin",
  );
}

export function approveAdminAgentAccessRequest(
  request: Pick<EnterpriseAgentAccessRequest, "id" | "revision">,
): Promise<{ request: EnterpriseAgentAccessRequest }> {
  return requestEnterprisePortalJson<{ request: EnterpriseAgentAccessRequest }>(
    `/api/enterprise/admin/agent-access-requests/${encodeURIComponent(request.id)}/approve`,
    { method: "POST", body: JSON.stringify({ baseRevision: request.revision }) },
    "admin",
  );
}

export function rejectAdminAgentAccessRequest(
  request: Pick<EnterpriseAgentAccessRequest, "id" | "revision">,
  reason: string,
): Promise<{ request: EnterpriseAgentAccessRequest }> {
  return requestEnterprisePortalJson<{ request: EnterpriseAgentAccessRequest }>(
    `/api/enterprise/admin/agent-access-requests/${encodeURIComponent(request.id)}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ baseRevision: request.revision, reason }),
    },
    "admin",
  );
}
