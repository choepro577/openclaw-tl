export type EnterpriseAccountRole = "administrator" | "employee";

export type EnterpriseAccount = {
  id: string;
  profileId: string;
  username: string;
  displayName: string;
  role: EnterpriseAccountRole;
  mustChangePassword: boolean;
  enabled: boolean;
  personalAgentEnabled: boolean;
  defaultAgentId: string | null;
  accessPresetKey: string;
  policyRevision: number;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number | null;
};

export type EnterpriseAccountWithPassword = EnterpriseAccount & {
  passwordHash: string;
};
