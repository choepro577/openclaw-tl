import fs from "node:fs";
import path from "node:path";
import {
  resolveAgentNotiToWebUI,
  resolveAgentConfig,
  resolveConfiguredAgentId,
  resolveSessionAgentIds,
  resolveSessionAgentId,
} from "../agents/agent-scope.js";
import type { OpenClawConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { stripInlineDirectiveTagsForDisplay } from "../utils/directive-tags.js";

const log = createSubsystemLogger("webui-notification");

const WEBUI_NOTIFICATION_ENDPOINT = "https://api.comnieuthienly.vn/api/api-tool/notifications/send";
const WEBUI_NOTIFICATION_COMPANY_ID = "1";
const WEBUI_NOTIFICATION_TIMEOUT_MS = 5_000;
const WEBUI_NOTIFICATION_TITLE_MAX_CHARS = 80;
const WEBUI_NOTIFICATION_BODY_MAX_CHARS = 160;
const DEFAULT_NOTIFICATION_TITLE = "Assistant";
const DEFAULT_NOTIFICATION_TEXT = "The assistant sent a new reply.";
const WORKSPACE_STAFF_CODE_FILES = ["USER.md", "AGENTS.md", "IDENTITY.md", "TOOLS.md"] as const;
const A_TO_A_SESSION_SEGMENT = ":a2a:from:";

const workspaceStaffCodeCache = new Map<string, string | null>();

type WarnLogger = {
  warn: (message: string, meta?: Record<string, unknown>) => void;
};

export type WebUiNotificationPayload = {
  user_codes: string[];
  title: string;
  body: string;
  data: Record<string, unknown>;
};

type WebUiNotificationParams = {
  cfg: OpenClawConfig;
  sessionKey?: string;
  agentId?: string;
  text?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  logger?: WarnLogger;
};

function resolveNotificationAgentId(params: {
  cfg: OpenClawConfig;
  sessionKey?: string;
  agentId?: string;
}): string {
  const explicitAgentId = params.agentId?.trim();
  if (explicitAgentId) {
    return resolveSessionAgentIds({
      sessionKey: params.sessionKey,
      config: params.cfg,
      agentId: explicitAgentId,
    }).sessionAgentId;
  }
  return resolveSessionAgentId({
    sessionKey: params.sessionKey,
    config: params.cfg,
  });
}

function collapseNotificationText(text?: string): string {
  if (!text) {
    return "";
  }
  return stripInlineDirectiveTagsForDisplay(text).text.replace(/\s+/g, " ").trim();
}

function truncateNotificationText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function extractWorkspaceStaffCode(text: string): string | undefined {
  const patterns = [
    /(?:^|\n)- \*\*Staff Code:\*\*\s*`?([A-Za-z0-9_-]+)`?/i,
    /(?:^|\n)- \*\*StaffCode:\*\*\s*`?([A-Za-z0-9_-]+)`?/i,
    /(?:^|\n)Employee:\s*`[^`]+`\s*\(`?([A-Za-z0-9_-]+)`?\)/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const staffCode = match?.[1]?.trim();
    if (staffCode) {
      return staffCode;
    }
  }
  return undefined;
}

function readWorkspaceStaffCode(workspace: string): string | undefined {
  const trimmedWorkspace = workspace.trim();
  if (!trimmedWorkspace) {
    return undefined;
  }
  if (workspaceStaffCodeCache.has(trimmedWorkspace)) {
    return workspaceStaffCodeCache.get(trimmedWorkspace) ?? undefined;
  }

  for (const filename of WORKSPACE_STAFF_CODE_FILES) {
    const filePath = path.join(trimmedWorkspace, filename);
    try {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const staffCode = extractWorkspaceStaffCode(fs.readFileSync(filePath, "utf8"));
      if (staffCode) {
        workspaceStaffCodeCache.set(trimmedWorkspace, staffCode);
        return staffCode;
      }
    } catch {
      // Best-effort lookup only. Fall through to the next metadata file.
    }
  }

  workspaceStaffCodeCache.set(trimmedWorkspace, null);
  return undefined;
}

async function readErrorBodySnippet(res: Response, maxChars = 200): Promise<string | undefined> {
  try {
    const text = await res.text();
    if (!text) {
      return undefined;
    }
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (!collapsed) {
      return undefined;
    }
    return collapsed.length <= maxChars ? collapsed : `${collapsed.slice(0, maxChars)}…`;
  } catch {
    return undefined;
  }
}

function isAgentToAgentPairSession(sessionKey?: string): boolean {
  return typeof sessionKey === "string" && sessionKey.includes(A_TO_A_SESSION_SEGMENT);
}

export function shouldNotifyWebUi(params: {
  cfg: OpenClawConfig;
  sessionKey?: string;
  agentId?: string;
}): boolean {
  if (isAgentToAgentPairSession(params.sessionKey)) {
    return false;
  }
  const resolvedAgentId = resolveNotificationAgentId(params);
  return resolveAgentNotiToWebUI(params.cfg, resolvedAgentId);
}

export function resolveWebUiUserCodes(params: {
  cfg: OpenClawConfig;
  sessionKey?: string;
  agentId?: string;
}): string[] {
  const resolvedAgentId = resolveNotificationAgentId(params);
  const workspace = resolveAgentConfig(params.cfg, resolvedAgentId)?.workspace?.trim();
  const workspaceStaffCode = workspace ? readWorkspaceStaffCode(workspace) : undefined;
  const fallbackAgentId = resolveConfiguredAgentId(params.cfg, resolvedAgentId).trim();
  const userCode = workspaceStaffCode ?? fallbackAgentId;
  return userCode ? [userCode] : [];
}

export function buildWebUiNotificationPayload(params: {
  userCodes: string[];
  sessionKey?: string;
  text?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}): WebUiNotificationPayload {
  const preview = collapseNotificationText(params.text);
  const fallbackText = preview || DEFAULT_NOTIFICATION_TEXT;
  const title = truncateNotificationText(
    params.title?.trim() || DEFAULT_NOTIFICATION_TITLE,
    WEBUI_NOTIFICATION_TITLE_MAX_CHARS,
  );
  const body = truncateNotificationText(
    params.body?.trim() || fallbackText,
    WEBUI_NOTIFICATION_BODY_MAX_CHARS,
  );

  return {
    user_codes: params.userCodes,
    title,
    body,
    data: {
      ...params.data,
      ...(params.sessionKey ? { sessionKey: params.sessionKey } : {}),
    },
  };
}

export async function sendWebUiNotification(params: WebUiNotificationParams): Promise<boolean> {
  if (!shouldNotifyWebUi(params)) {
    return false;
  }

  const userCodes = resolveWebUiUserCodes(params);
  if (userCodes.length === 0) {
    return false;
  }

  const payload = buildWebUiNotificationPayload({
    userCodes,
    sessionKey: params.sessionKey,
    text: params.text,
    title: params.title,
    body: params.body,
    data: params.data,
  });

  const fetchImpl = params.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    (params.logger ?? log).warn("Web UI notification skipped because fetch is unavailable.");
    return false;
  }

  try {
    const response = await fetchImpl(WEBUI_NOTIFICATION_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "company-id": WEBUI_NOTIFICATION_COMPANY_ID,
      },
      body: JSON.stringify(payload),
      signal:
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(params.timeoutMs ?? WEBUI_NOTIFICATION_TIMEOUT_MS)
          : undefined,
    });
    if (!response.ok) {
      const detail = await readErrorBodySnippet(response);
      const messageParts = [
        `status=${response.status}`,
        payload.user_codes.length > 0 ? `user_codes=${payload.user_codes.join(",")}` : undefined,
        params.sessionKey ? `sessionKey=${params.sessionKey}` : undefined,
        detail ? `detail=${detail}` : undefined,
      ].filter(Boolean);
      (params.logger ?? log).warn(
        `Web UI notification request failed${messageParts.length ? ` (${messageParts.join(", ")})` : ""}.`,
        {
          status: response.status,
          userCodes: payload.user_codes,
          ...(params.sessionKey ? { sessionKey: params.sessionKey } : {}),
          ...(detail ? { detail } : {}),
        },
      );
      return false;
    }
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const messageParts = [
      `error=${errorMessage}`,
      payload.user_codes.length > 0 ? `user_codes=${payload.user_codes.join(",")}` : undefined,
      params.sessionKey ? `sessionKey=${params.sessionKey}` : undefined,
    ].filter(Boolean);
    (params.logger ?? log).warn(
      `Web UI notification request failed${messageParts.length ? ` (${messageParts.join(", ")})` : ""}.`,
      {
        error: errorMessage,
        userCodes: payload.user_codes,
        ...(params.sessionKey ? { sessionKey: params.sessionKey } : {}),
      },
    );
    return false;
  }
}
