import type { AgentKey, EnterpriseUserAgentAccessRequest } from "../user/user-api-contracts.js";

export type EnterpriseAgentAccessRequestState = "pending" | "approved" | "rejected" | "cancelled";

export type EnterpriseAgentAccessRequest = {
  id: string;
  requesterAccountId: string;
  agentKey: AgentKey;
  resourceKey: string;
  agentId: string;
  state: EnterpriseAgentAccessRequestState;
  reviewerAccountId: string | null;
  decisionReason: string | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
};

export type EnterpriseAgentAccessRequestSummary = EnterpriseUserAgentAccessRequest;

export type EnterpriseAgentAccessRequestEntitlement = {
  accountId: string;
  resourceType: "agent";
  resourceId: string;
  resourceState: "active" | "legacy" | "orphaned";
  effect: "allow" | "deny";
};
