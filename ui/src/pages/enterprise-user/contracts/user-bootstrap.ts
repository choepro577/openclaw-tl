import type { AgentKey, EnterpriseUserAgent } from "./user-agent.ts";

export type EnterpriseUserBootstrapV2 = {
  schemaVersion: 2;
  user: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  features: {
    personalAgent: { enabled: boolean; editable: boolean };
    automations: boolean;
    notifications: boolean;
    knowledge: { enabled: boolean; memberships: number };
    plugins: { enabled: boolean };
  };
  agents: EnterpriseUserAgent[];
  defaultAgentKey: AgentKey | null;
  policyRevision: number;
  catalogRevision: string;
};
