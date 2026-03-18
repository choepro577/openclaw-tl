import type { ChatType } from "../channels/chat-type.js";
import type { SessionEntry } from "../config/sessions.js";
import type {
  GatewayAgentRow as SharedGatewayAgentRow,
  SessionsListResultBase,
  SessionsPatchResultBase,
} from "../shared/session-types.js";
import type { DeliveryContext } from "../utils/delivery-context.js";

export type GatewaySessionsDefaults = {
  modelProvider: string | null;
  model: string | null;
  contextTokens: number | null;
};

export type GatewaySessionRow = {
  key: string;
  spawnedBy?: string;
  kind: "direct" | "group" | "global" | "unknown";
  name?: string;
  projectId?: string | null;
  title?: string;
  label?: string;
  displayName?: string;
  derivedTitle?: string;
  lastMessagePreview?: string;
  channel?: string;
  subject?: string;
  groupChannel?: string;
  space?: string;
  chatType?: ChatType;
  origin?: SessionEntry["origin"];
  updatedAt: number | null;
  sessionId?: string;
  systemSent?: boolean;
  abortedLastRun?: boolean;
  thinkingLevel?: string;
  fastMode?: boolean;
  verboseLevel?: string;
  reasoningLevel?: string;
  elevatedLevel?: string;
  sendPolicy?: "allow" | "deny";
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  totalTokensFresh?: boolean;
  responseUsage?: "on" | "off" | "tokens" | "full";
  modelProvider?: string;
  model?: string;
  contextTokens?: number;
  deliveryContext?: DeliveryContext;
  lastChannel?: SessionEntry["lastChannel"];
  lastTo?: string;
  lastAccountId?: string;
};

export type GatewayAgentRow = SharedGatewayAgentRow;

export type GatewayProjectRow = {
  projectId: string;
  name: string;
};

export type SessionPreviewItem = {
  role: "user" | "assistant" | "tool" | "system" | "other";
  text: string;
};

export type SessionsPreviewEntry = {
  key: string;
  status: "ok" | "empty" | "missing" | "error";
  items: SessionPreviewItem[];
};

export type SessionsPreviewResult = {
  ts: number;
  previews: SessionsPreviewEntry[];
};

export type SessionsListResult = SessionsListResultBase<GatewaySessionsDefaults, GatewaySessionRow>;

export type SessionsPatchResult = SessionsPatchResultBase<SessionEntry> & {
  entry: SessionEntry;
  resolved?: {
    modelProvider?: string;
    model?: string;
  };
};

export type SessionsRenameResult = {
  ok: true;
  path: string;
  key: string;
  entry: SessionEntry;
  session: GatewaySessionRow;
};

export type ProjectsListResult = {
  ts: number;
  path: string;
  count: number;
  projects: GatewayProjectRow[];
};

export type ProjectsCreateResult = {
  ok: true;
  created: boolean;
  path: string;
  project: GatewayProjectRow;
};

export type SessionsCreateResult = {
  ok: true;
  created: boolean;
  path: string;
  transcriptPath: string;
  sessionKey: string;
  sessionId: string;
  entry: SessionEntry;
  session: GatewaySessionRow;
  project?: GatewayProjectRow;
};
