const USER_PORTAL_BROWSER_METHODS = new Set([
  "agent.identity.get",
  "agent.wait",
  "agents.list",
  "artifacts.download",
  "artifacts.list",
  "chat.abort",
  "chat.history",
  "chat.message.get",
  "chat.metadata",
  "chat.send",
  "chat.startup",
  "chat.toolTitles",
  "enterprise.knowledge.subscribe",
  "enterprise.knowledge.unsubscribe",
  "models.list",
  "question.get",
  "question.list",
  "question.resolve",
  "sessions.abort",
  "sessions.branches.list",
  "sessions.branches.switch",
  "sessions.compact",
  "sessions.delete",
  "sessions.describe",
  "sessions.files.get",
  "sessions.files.list",
  "sessions.fork",
  "sessions.list",
  "sessions.messages.subscribe",
  "sessions.messages.unsubscribe",
  "sessions.observer.visibility",
  "sessions.patch",
  "sessions.resolve",
  "sessions.rewind",
  "sessions.subscribe",
]);

const USER_PORTAL_SYNTHETIC_METHODS = new Set([
  "cron.add",
  "cron.list",
  "cron.remove",
  "cron.run",
  "cron.update",
  "sessions.create",
]);

const USER_SESSION_PATCH_KEYS = new Set([
  "agentId",
  "archived",
  "expectedSessionId",
  "fastMode",
  "key",
  "label",
  "model",
  "contextWindow",
  "pinned",
  "thinkingLevel",
  "unread",
]);

const USER_MODELS_LIST_KEYS = new Set(["agentId", "preparedOnly", "refresh", "view"]);

const USER_CHAT_SEND_KEYS = new Set([
  "__controlUiReconnectResume",
  "agentId",
  "attachments",
  "deliver",
  "expectedLeafEntryId",
  "expectedSessionRoutingContract",
  "idempotencyKey",
  "message",
  "queueMode",
  "replyToId",
  "sessionId",
  "sessionKey",
  "suppressCommandInterpretation",
  "timeoutMs",
]);

function isManagedSkillsPath(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return value
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .some((segment) => segment.toLowerCase() === "skills");
}

export function enterpriseUserGatewayMethodAllowed(method: string, synthetic = false): boolean {
  return (
    USER_PORTAL_BROWSER_METHODS.has(method) ||
    (synthetic && USER_PORTAL_SYNTHETIC_METHODS.has(method))
  );
}

export function enterpriseUserGatewayParamsAllowed(method: string, params: unknown): boolean {
  if (method === "sessions.files.get" || method === "sessions.files.list") {
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return false;
    }
    if (isManagedSkillsPath((params as Record<string, unknown>).path)) {
      return false;
    }
  }
  if (method === "models.list") {
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return false;
    }
    const record = params as Record<string, unknown>;
    if (!Object.keys(record).every((key) => USER_MODELS_LIST_KEYS.has(key))) {
      return false;
    }
    if (record.view !== undefined && record.view !== "configured") {
      return false;
    }
    if (record.agentId !== undefined && typeof record.agentId !== "string") {
      return false;
    }
    if (record.preparedOnly !== undefined && typeof record.preparedOnly !== "boolean") {
      return false;
    }
    if (record.refresh !== undefined && typeof record.refresh !== "boolean") {
      return false;
    }
    if (record.preparedOnly === true && record.refresh === true) {
      return false;
    }
    // The canonical picker asks for a refreshed configured catalog when it opens. User Portal
    // requests must stay on the account-scoped prepared generation: live provider discovery is an
    // operator action and can monopolize the Gateway for synthetic Personal Agent owners.
    Object.assign(record, { preparedOnly: true });
    delete record.refresh;
    return true;
  }
  if (method === "sessions.patch") {
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return false;
    }
    return Object.keys(params).every((key) => USER_SESSION_PATCH_KEYS.has(key));
  }
  if (method === "chat.send") {
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return false;
    }
    if (!Object.keys(params).every((key) => USER_CHAT_SEND_KEYS.has(key))) {
      return false;
    }
    // User Portal never grants command interpretation. This server-owned override
    // keeps inline /model, /config, /debug and similar directives as ordinary text.
    Object.assign(params, { deliver: false, suppressCommandInterpretation: true });
  }
  return true;
}

export function projectEnterpriseUserGatewayMethods(methods: readonly string[]): string[] {
  return methods.filter((method) => USER_PORTAL_BROWSER_METHODS.has(method));
}

export const testing = {
  browserMethods: USER_PORTAL_BROWSER_METHODS,
  syntheticMethods: USER_PORTAL_SYNTHETIC_METHODS,
  sessionPatchKeys: USER_SESSION_PATCH_KEYS,
  modelsListKeys: USER_MODELS_LIST_KEYS,
  chatSendKeys: USER_CHAT_SEND_KEYS,
};
