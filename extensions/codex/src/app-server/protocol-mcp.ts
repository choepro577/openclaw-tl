import type { JsonObject, JsonValue } from "./protocol-json.js";

export type CodexMcpServerStatus = {
  name: string;
  /** Owning native Codex plugin when the server was loaded from a plugin. */
  pluginId?: string | null;
  runtimeStatus?:
    | "notStarted"
    | "starting"
    | "connected"
    | "authenticationRequired"
    | "failed"
    | "cancelled"
    | "disabled"
    | null;
  /** Present only after the configured server completed MCP initialization. */
  serverInfo?: {
    name: string;
    title?: string | null;
    version: string;
    description?: string | null;
    icons?: JsonValue[] | null;
    websiteUrl?: string | null;
  } | null;
  tools: JsonObject;
  resources?: JsonValue[];
  resourceTemplates?: JsonValue[];
  authStatus?: "unknown" | "unsupported" | "notLoggedIn" | "bearerToken" | "oAuth";
};

export type CodexListMcpServerStatusResponse = {
  data: CodexMcpServerStatus[];
  nextCursor?: string | null;
};

export type ResourceReadParams = {
  threadId?: string | null;
  server: string;
  uri: string;
};

export type McpServerOauthLoginParams = {
  name: string;
  threadId?: string | null;
  clientRegistration?: "auto" | "cimd" | "dcr" | null;
  scopes?: string[] | null;
  timeoutSecs?: number | null;
};

export type McpServerOauthLoginResponse = {
  authorizationUrl: string;
};

export type ToolCallParams = {
  threadId: string;
  server: string;
  tool: string;
  arguments?: JsonValue;
  _meta?: JsonValue;
};

export type ResourceReadResult = { contents: JsonValue[] };

export type ToolCallResult = {
  content: JsonValue[];
  structuredContent?: JsonValue;
  isError?: boolean;
  _meta?: JsonValue;
};
