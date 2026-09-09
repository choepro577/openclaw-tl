export type AgentKey = "personal" | `shared:${string}`;

export type EnterpriseUserAgentAccessRequestState =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

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
  reason: string;
  request: EnterpriseUserAgentAccessRequest | null;
};

export type EnterpriseUserAuthAccount = {
  username: string;
  displayName: string;
  role: "administrator" | "employee";
  mustChangePassword: boolean;
  enabled: boolean;
  personalAgentEnabled: boolean;
};

export type EnterpriseUserAgentSummary = {
  key: AgentKey;
  kind: "personal" | "shared";
  name: string;
  canonicalName: string;
  description: string | null;
  avatar: string | null;
  availability: "ready" | "disabled" | "maintenance";
  capabilityLabels: string[];
  relationship: SharedAgentRelationshipProfile | null;
  access: EnterpriseUserAgentAccess | null;
  actions: {
    canChat: boolean;
    canSchedule: boolean;
    canEdit: boolean;
    canPersonalize: boolean;
    canRequestAccess: boolean;
  };
};

export type SharedAgentRelationshipProfile = {
  revision: number;
  agentAlias: string;
  agentSelfReference: string;
  userAddress: string;
  customInstructions: string;
  updatedAt: number;
};

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
  agents: EnterpriseUserAgentSummary[];
  defaultAgentKey: AgentKey | null;
  policyRevision: number;
  catalogRevision: string;
};

export type EnterpriseConversationProject = {
  id: string;
  name: string;
  position: number;
  sessionKeys: string[];
  createdAt: number;
  updatedAt: number;
};

export type PersonalAgentTone = "professional" | "friendly" | "concise";
export type PersonalAgentResponseLength = "brief" | "balanced" | "detailed";

export type PersonalAgentProfile = {
  revision: number;
  name: string;
  avatarPreset: string | null;
  greeting: string;
  tone: PersonalAgentTone;
  responseLength: PersonalAgentResponseLength;
  language: string;
  customInstructions: string;
  preferredName: string;
  workContext: string;
  preferences: string;
};

export type PersonalAgentKnowledgeItem = {
  id: string;
  title: string;
  kind: "note" | "upload";
  sourceName: string | null;
  content: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
};

export type UserAutomationSchedule =
  | { kind: "once"; at: string }
  | { kind: "interval"; everyMinutes: number }
  | { kind: "cron"; expr: string; tz?: string };

export type UserAutomation = {
  id: string;
  revision: string;
  name: string;
  enabled: boolean;
  agentKey: AgentKey | null;
  agentAccess: "ready" | "removed";
  /** System-owned schedules are visible for transparency but cannot be changed by users. */
  readOnly?: boolean;
  schedule: UserAutomationSchedule;
  prompt: string;
  nextRunAt: number | null;
  lastRunAt: number | null;
  lastResult: "ok" | "error" | "skipped" | null;
  lastError: string | null;
};

export type UserAutomationInput = {
  name: string;
  enabled: boolean;
  agentKey: AgentKey;
  schedule: UserAutomationSchedule;
  prompt: string;
};
