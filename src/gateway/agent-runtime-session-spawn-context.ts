export type AgentRuntimeSessionSpawnContext = {
  completionOwnerSessionKey?: string;
  /** Host-attested reviewer device inherited by the child run's approvals. */
  approvalReviewerDeviceId?: string;
  inheritedToolPolicy: {
    version: 1;
    allow: string[];
    deny: string[];
  };
};
