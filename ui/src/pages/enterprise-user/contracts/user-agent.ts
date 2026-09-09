export type AgentKey = "personal" | `shared:${string}`;

export type EnterpriseUserAgentAccessRequestState =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

/** Public, account-scoped access request data. Internal ids are never exposed here. */
export type EnterpriseUserAgentAccessRequest = {
  id: string;
  agentKey: AgentKey;
  state: EnterpriseUserAgentAccessRequestState;
  decisionReason: string | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
};

export type EnterpriseUserAgentAccess = {
  allowed: boolean;
  reason: string | null;
  request: EnterpriseUserAgentAccessRequest | null;
};

export type SharedAgentRelationshipProfile = {
  revision: number;
  agentAlias: string;
  agentSelfReference: string;
  userAddress: string;
  customInstructions: string;
  updatedAt: number;
};

export type EnterpriseUserAgent = {
  key: AgentKey;
  kind: "personal" | "shared";
  name: string;
  canonicalName: string;
  description: string | null;
  avatar: string | null;
  availability: "ready" | "disabled" | "maintenance";
  capabilityLabels: string[];
  relationship: SharedAgentRelationshipProfile | null;
  /** Present for shared Agents; personal Agents do not need an access request. */
  access?: EnterpriseUserAgentAccess | null;
  actions: {
    canChat: boolean;
    canRequestAccess?: boolean;
    canSchedule: boolean;
    canEdit: boolean;
    canPersonalize: boolean;
  };
};

export function hasUserAgentAccess(agent: EnterpriseUserAgent): boolean {
  return agent.kind === "personal"
    ? agent.actions.canChat
    : (agent.access?.allowed ?? agent.actions.canChat);
}

export function canRequestUserAgentAccess(agent: EnterpriseUserAgent): boolean {
  return (
    agent.kind === "shared" &&
    !hasUserAgentAccess(agent) &&
    agent.actions.canRequestAccess === true &&
    agent.access?.request?.state !== "pending"
  );
}
