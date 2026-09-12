import type { FastMode } from "../../../shared/fast-mode.js";
import type {
  SpawnSubagentContextMode,
  SpawnSubagentMode,
  SpawnSubagentSandboxMode,
} from "./subagent-spawn.types.js";

export type SpawnSubagentParams = {
  task: string;
  label?: string;
  agentId?: string;
  model?: string;
  taskName?: string;
  thinking?: string;
  fastMode?: FastMode;
  collect?: boolean;
  outputSchema?: Record<string, unknown>;
  groupId?: string;
  /** Host bridge identity used to recover a replay-safe collector launch. */
  swarmLaunchReplayKey?: string;
  /** Canonical request hash checked before reusing a host-reserved collector. */
  swarmLaunchRequestFingerprint?: string;
  cwd?: string;
  runTimeoutSeconds?: number;
  thread?: boolean;
  mode?: SpawnSubagentMode;
  cleanup?: "delete" | "keep";
  sandbox?: SpawnSubagentSandboxMode;
  context?: SpawnSubagentContextMode;
  lightContext?: boolean;
  expectsCompletionMessage?: boolean;
  attachments?: Array<{
    name: string;
    content: string;
    encoding?: "utf8" | "base64";
    mimeType?: string;
  }>;
  attachMountPath?: string;
};

export type SpawnSubagentContext = {
  /** Request-scoped runtime projection. Never reload host-global config when present. */
  config?: import("../../../config/types.openclaw.js").OpenClawConfig;
  /**
   * Require a host-attested parent-to-child launch identity even when optional
   * execution-identity collection is disabled. Core-managed delegation uses
   * this for authorization; it is never accepted from model-authored params.
   */
  requireTrustedLaunchIdentity?: true;
  /** Host-only durable requirement; a restart must not run without the private context lease. */
  requiresPrivateModelContext?: true;
  agentSessionKey?: string;
  requesterTurnRunId?: string;
  /** Host-only exact idempotency key for the originating user turn. */
  requesterUserTurnIdempotencyKey?: string;
  /** Host-only session id that owns requesterUserTurnIdempotencyKey. */
  requesterUserTurnSessionId?: string;
  /** Separate key used only for completion routing, not sandbox policy. */
  completionOwnerKey?: string;
  agentChannel?: string;
  agentAccountId?: string;
  agentTo?: string;
  agentThreadId?: string | number;
  currentMessagingTarget?: string;
  currentChannelId?: string;
  currentMessageId?: string | number;
  agentGroupId?: string | null;
  agentGroupChannel?: string | null;
  agentGroupSpace?: string | null;
  agentMemberRoleIds?: string[];
  requesterAgentIdOverride?: string;
  /** Explicit workspace directory for subagent to inherit (optional). */
  workspaceDir?: string;
  inheritedToolAllowlist?: string[];
  inheritedToolDenylist?: string[];
  requesterRunId?: string;
  /** Host-attested reviewer device inherited by child tool approvals. */
  approvalReviewerDeviceId?: string;
  /** Core-only hook used to bind security authority before a child can execute tools. */
  onBeforeChildDispatch?: (child: {
    childSessionKey: string;
    anticipatedRunId: string;
    targetAgentId: string;
  }) => void;
  /** Core-only hook called as soon as Gateway resolves the accepted run id. */
  onChildRunIdResolved?: (child: {
    childSessionKey: string;
    anticipatedRunId: string;
    actualRunId: string;
    targetAgentId: string;
  }) => void;
  /** Core-only cleanup hook when a prepared child never reaches a managed terminal run. */
  onChildDispatchAborted?: (child: {
    childSessionKey: string;
    anticipatedRunId: string;
    actualRunId?: string;
    targetAgentId: string;
  }) => void;
};

export type SpawnSubagentResult = {
  status: "accepted" | "forbidden" | "error";
  childSessionKey?: string;
  sessionKey?: string;
  runId?: string;
  mode?: SpawnSubagentMode;
  taskName?: string;
  note?: string;
  /** Fully resolved model ref applied to the spawned child session. */
  resolvedModel?: string;
  /** Provider prefix parsed from resolvedModel when the ref includes one. */
  resolvedProvider?: string;
  modelApplied?: boolean;
  error?: string;
  attachments?: {
    count: number;
    totalBytes: number;
    files: Array<{ name: string; bytes: number; sha256: string }>;
    relDir: string;
  };
};
