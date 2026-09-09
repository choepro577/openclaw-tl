import { randomUUID } from "node:crypto";
import JSON5 from "json5";
import type { ErrorShape } from "../../../packages/gateway-protocol/src/schema/frames.js";
import { listAgentEntries, tryResolveDefaultAgentId } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { configHandlers } from "../../gateway/server-methods/config.js";
import { readUsageStatusStaleWhileRevalidate } from "../../gateway/server-methods/models-auth-status-usage-cache.js";
import { modelsAuthStatusHandlers } from "../../gateway/server-methods/models-auth-status.js";
import { modelsProbeHandlers } from "../../gateway/server-methods/models-probe.js";
import { modelsHandlers } from "../../gateway/server-methods/models.js";
import { systemAgentHandlers } from "../../gateway/server-methods/system-agent.js";
import type {
  GatewayClient,
  GatewayRequestContext,
  GatewayRequestHandler,
  GatewayRequestHandlerOptions,
} from "../../gateway/server-methods/types.js";
import { usageHandlers } from "../../gateway/server-methods/usage.js";
import { wizardHandlers } from "../../gateway/server-methods/wizard.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import { validateEnterpriseAdminConfig } from "../config/admin-config-service.js";

export const ENTERPRISE_ADMIN_MODEL_METHODS = [
  "models.list",
  "models.authStatus",
  "models.authLogout",
  "models.probe",
  "usage.status",
  "sessions.usage",
  "config.get",
  "config.schema",
  "config.schema.lookup",
  "config.set",
  "config.patch",
  "openclaw.setup.detect",
  "openclaw.setup.verify",
  "openclaw.setup.auth.start",
  "openclaw.setup.prepare.start",
  "openclaw.setup.activate",
  "wizard.next",
  "wizard.cancel",
] as const;

export type EnterpriseAdminModelMethod = (typeof ENTERPRISE_ADMIN_MODEL_METHODS)[number];

const METHOD_SET = new Set<string>(ENTERPRISE_ADMIN_MODEL_METHODS);
const MUTATING_METHODS = new Set<EnterpriseAdminModelMethod>([
  "models.authLogout",
  "models.probe",
  "config.set",
  "config.patch",
  "openclaw.setup.verify",
  "openclaw.setup.auth.start",
  "openclaw.setup.prepare.start",
  "openclaw.setup.activate",
  "wizard.next",
  "wizard.cancel",
]);

const enterpriseAdminUsageStatusHandler: GatewayRequestHandler = ({ respond, context }) => {
  respond(
    true,
    readUsageStatusStaleWhileRevalidate({ config: context.getRuntimeConfig() }),
    undefined,
  );
};

const HANDLERS: Record<EnterpriseAdminModelMethod, GatewayRequestHandler | undefined> = {
  "models.list": modelsHandlers["models.list"],
  "models.authStatus": modelsAuthStatusHandlers["models.authStatus"],
  "models.authLogout": modelsAuthStatusHandlers["models.authLogout"],
  "models.probe": modelsProbeHandlers["models.probe"],
  "usage.status": enterpriseAdminUsageStatusHandler,
  "sessions.usage": usageHandlers["sessions.usage"],
  "config.get": configHandlers["config.get"],
  "config.schema": configHandlers["config.schema"],
  "config.schema.lookup": configHandlers["config.schema.lookup"],
  "config.set": configHandlers["config.set"],
  "config.patch": configHandlers["config.patch"],
  "openclaw.setup.detect": systemAgentHandlers["openclaw.setup.detect"],
  "openclaw.setup.verify": systemAgentHandlers["openclaw.setup.verify"],
  "openclaw.setup.auth.start": systemAgentHandlers["openclaw.setup.auth.start"],
  "openclaw.setup.prepare.start": systemAgentHandlers["openclaw.setup.prepare.start"],
  "openclaw.setup.activate": systemAgentHandlers["openclaw.setup.activate"],
  "wizard.next": wizardHandlers["wizard.next"],
  "wizard.cancel": wizardHandlers["wizard.cancel"],
};

const wizardOwners = new Map<string, string>();

export class EnterpriseAdminModelGatewayError extends Error {
  constructor(readonly shape: ErrorShape) {
    super(shape.message);
    this.name = "EnterpriseAdminModelGatewayError";
  }
}

function sharedAgents(config: OpenClawConfig) {
  const agents = listAgentEntries(config)
    .filter((entry) => !isReservedSystemAgentId(entry.id))
    .map((entry) => {
      const agent: { id: string; kind: "agent"; name?: string } = {
        id: entry.id,
        kind: "agent",
      };
      const name = entry.name ?? entry.identity?.name;
      if (name) {
        agent.name = name;
      }
      return agent;
    });
  if (agents.length > 0) {
    return agents;
  }
  const defaultId = tryResolveDefaultAgentId(config) ?? "main";
  return isReservedSystemAgentId(defaultId)
    ? []
    : [{ id: defaultId, kind: "agent" as const, name: defaultId }];
}

export function readEnterpriseAdminModelContext(config: OpenClawConfig) {
  const agents = sharedAgents(config);
  const authoredDefault = tryResolveDefaultAgentId(config);
  const defaultId =
    (authoredDefault && agents.some((agent) => agent.id === authoredDefault)
      ? authoredDefault
      : undefined) ??
    agents.find((agent) => agent.id === "main")?.id ??
    agents[0]?.id ??
    "main";
  return {
    agents: {
      defaultId,
      mainKey: config.session?.mainKey ?? "main",
      scope: config.session?.scope ?? "per-sender",
      agents,
    },
    methods: [...ENTERPRISE_ADMIN_MODEL_METHODS, "agents.list"],
  };
}

export function isEnterpriseAdminModelMethod(value: unknown): value is EnterpriseAdminModelMethod {
  return typeof value === "string" && METHOD_SET.has(value);
}

export function isEnterpriseAdminModelMutation(method: EnterpriseAdminModelMethod): boolean {
  return MUTATING_METHODS.has(method);
}

function requireSharedAgent(params: Record<string, unknown>, config: OpenClawConfig): void {
  const value = params.agentId;
  if (value === undefined) {
    return;
  }
  if (
    typeof value !== "string" ||
    !sharedAgents(config).some((agent) => agent.id === value.trim())
  ) {
    throw new Error("MODEL_AGENT_SCOPE_DENIED");
  }
}

function collectLeafPaths(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) {
      return entries.flatMap(([key, child]) =>
        collectLeafPaths(child, prefix ? `${prefix}.${key}` : key),
      );
    }
  }
  return [prefix || "<root>"];
}

function modelOwnedPath(path: string, sharedAgentIds: ReadonlySet<string>): boolean {
  if (path === "models" || path.startsWith("models.")) {
    return true;
  }
  if (
    /^(agents\.defaults\.(model|utilityModel|thinkingDefault|fastModeDefault))(\.|$)/.test(path)
  ) {
    return true;
  }
  const match =
    /^agents\.entries\.([^.]+)\.(model|utilityModel|thinkingDefault|fastModeDefault)(\.|$)/.exec(
      path,
    );
  return Boolean(match?.[1] && sharedAgentIds.has(match[1]));
}

async function assertModelConfigMutation(
  method: EnterpriseAdminModelMethod,
  params: Record<string, unknown>,
  config: OpenClawConfig,
): Promise<void> {
  if (method !== "config.set" && method !== "config.patch") {
    return;
  }
  const raw = params.raw;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("MODEL_CONFIG_SCOPE_DENIED");
  }
  const sharedAgentIds = new Set(sharedAgents(config).map((agent) => agent.id));
  let paths: string[];
  if (method === "config.set") {
    const baseHash = typeof params.baseHash === "string" ? params.baseHash : "";
    if (!baseHash) {
      throw new Error("MODEL_CONFIG_SCOPE_DENIED");
    }
    const validation = await validateEnterpriseAdminConfig(raw, baseHash);
    if (!validation.valid) {
      throw new Error("MODEL_CONFIG_SCOPE_DENIED");
    }
    paths = validation.changedPaths;
  } else {
    let parsed: unknown;
    try {
      parsed = JSON5.parse(raw);
    } catch {
      throw new Error("MODEL_CONFIG_SCOPE_DENIED");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("MODEL_CONFIG_SCOPE_DENIED");
    }
    paths = collectLeafPaths(parsed);
    const replacePaths = params.replacePaths;
    if (replacePaths !== undefined) {
      if (!Array.isArray(replacePaths) || replacePaths.some((path) => typeof path !== "string")) {
        throw new Error("MODEL_CONFIG_SCOPE_DENIED");
      }
      paths.push(...(replacePaths as string[]));
    }
  }
  if (paths.some((path) => !modelOwnedPath(path, sharedAgentIds))) {
    throw new Error("MODEL_CONFIG_SCOPE_DENIED");
  }
}

function wizardSessionId(params: Record<string, unknown>): string | null {
  return typeof params.sessionId === "string" && params.sessionId.trim()
    ? params.sessionId.trim()
    : null;
}

function assertWizardOwner(
  method: EnterpriseAdminModelMethod,
  params: Record<string, unknown>,
  adminSessionId: string,
): { sessionId: string | null; starting: boolean } {
  const sessionId = wizardSessionId(params);
  const starting =
    method === "openclaw.setup.auth.start" || method === "openclaw.setup.prepare.start";
  if (!starting && method !== "wizard.next" && method !== "wizard.cancel") {
    return { sessionId: null, starting: false };
  }
  if (!sessionId) {
    throw new Error("MODEL_WIZARD_SCOPE_DENIED");
  }
  if (starting) {
    const owner = wizardOwners.get(sessionId);
    if (owner && owner !== adminSessionId) {
      throw new Error("MODEL_WIZARD_SCOPE_DENIED");
    }
    wizardOwners.set(sessionId, adminSessionId);
  } else if (wizardOwners.get(sessionId) !== adminSessionId) {
    throw new Error("MODEL_WIZARD_SCOPE_DENIED");
  }
  return { sessionId, starting };
}

function syntheticAdminClient(): GatewayClient {
  return {
    connect: {
      minProtocol: 1,
      maxProtocol: 1,
      client: {
        id: "gateway-client",
        version: "enterprise-admin",
        platform: process.platform,
        mode: "backend",
      },
      role: "operator",
      scopes: ["operator.admin", "operator.read", "operator.write"],
    },
    connId: `enterprise-admin:${randomUUID()}`,
    internal: { syntheticClient: true, operatorRoleActor: { kind: "system" } },
  } as GatewayClient;
}

async function invokeGatewayHandler(
  method: EnterpriseAdminModelMethod,
  params: Record<string, unknown>,
  context: GatewayRequestContext,
): Promise<unknown> {
  const handler = HANDLERS[method];
  if (!handler) {
    throw new Error("MODEL_METHOD_UNSUPPORTED");
  }
  const req: GatewayRequestHandlerOptions["req"] = {
    type: "req",
    id: `enterprise-admin-model:${randomUUID()}`,
    method,
    params,
  };
  let response: { ok: boolean; payload?: unknown; error?: ErrorShape } | undefined;
  await handler({
    req,
    params,
    client: syntheticAdminClient(),
    isWebchatConnect: () => false,
    context,
    respond: (ok, payload, error) => {
      response = { ok, payload, error };
    },
  });
  if (!response?.ok) {
    throw new EnterpriseAdminModelGatewayError(
      response?.error ?? { code: "UNAVAILABLE", message: "Gateway model method failed." },
    );
  }
  return response.payload;
}

export async function invokeEnterpriseAdminModelAction(options: {
  method: EnterpriseAdminModelMethod;
  params: Record<string, unknown>;
  context: GatewayRequestContext;
  adminSessionId: string;
}): Promise<unknown> {
  const config = options.context.getRuntimeConfig();
  requireSharedAgent(options.params, config);
  await assertModelConfigMutation(options.method, options.params, config);
  const ownership = assertWizardOwner(options.method, options.params, options.adminSessionId);
  try {
    const result = await invokeGatewayHandler(options.method, options.params, options.context);
    const resultRecord =
      result && typeof result === "object" ? (result as Record<string, unknown>) : null;
    if (
      ownership.sessionId &&
      (options.method === "wizard.cancel" || resultRecord?.done === true)
    ) {
      wizardOwners.delete(ownership.sessionId);
    }
    return result;
  } catch (error) {
    if (ownership.sessionId) {
      wizardOwners.delete(ownership.sessionId);
    }
    throw error;
  }
}

export const testApi = { collectLeafPaths, modelOwnedPath, wizardOwners };
