export type AgentKey = "personal" | `shared:${string}`;

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
  actions: {
    canChat: boolean;
    canSchedule: boolean;
    canEdit: boolean;
    canPersonalize: boolean;
  };
};
