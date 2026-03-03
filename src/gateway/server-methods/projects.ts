import { randomUUID } from "node:crypto";
import type { ProjectsCreateResult, ProjectsListResult } from "../session-utils.js";
import type { GatewayRequestHandlers } from "./types.js";
import { resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { loadConfig } from "../../config/config.js";
import {
  findProjectByNormalizedName,
  loadProjectStore,
  resolveProjectStorePathFromSessionStorePath,
  updateProjectStore,
} from "../../config/projects.js";
import { resolveStorePath } from "../../config/sessions.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateProjectsCreateParams,
  validateProjectsListParams,
  validateProjectsSessionsCreateParams,
} from "../protocol/index.js";
import {
  assertAgentIdInScope,
  assertSessionKeyInScope,
  resolveEnterpriseBoundAgentId,
} from "../server/agent-scope-guard.js";
import { createGatewaySession } from "../session-create.js";

function normalizeProjectNameForStore(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function resolveProjectStoreTarget(params: {
  cfg: ReturnType<typeof loadConfig>;
  requestedAgentId?: string;
  client: Parameters<GatewayRequestHandlers[string]>[0]["client"];
}): { agentId: string; projectStorePath: string } {
  const boundAgentId = resolveEnterpriseBoundAgentId(params.client);
  const agentId = normalizeAgentId(
    boundAgentId ?? params.requestedAgentId ?? resolveDefaultAgentId(params.cfg),
  );
  const sessionStorePath = resolveStorePath(params.cfg.session?.store, { agentId });
  return {
    agentId,
    projectStorePath: resolveProjectStorePathFromSessionStorePath(sessionStorePath),
  };
}

export const projectsHandlers: GatewayRequestHandlers = {
  "projects.list": ({ params, respond, client }) => {
    if (!validateProjectsListParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid projects.list params: ${formatValidationErrors(validateProjectsListParams.errors)}`,
        ),
      );
      return;
    }

    const cfg = loadConfig();
    const requestedAgentId = typeof params.agentId === "string" ? params.agentId : undefined;
    const scopeCheck = assertAgentIdInScope({
      client,
      agentId: requestedAgentId,
    });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    const { projectStorePath } = resolveProjectStoreTarget({
      cfg,
      requestedAgentId,
      client,
    });
    const store = loadProjectStore(projectStorePath);
    const projects = Object.values(store).toSorted((a, b) => a.name.localeCompare(b.name));
    const result: ProjectsListResult = {
      ts: Date.now(),
      path: projectStorePath,
      count: projects.length,
      projects: projects.map((project) => ({
        projectId: project.projectId,
        name: project.name,
      })),
    };
    respond(true, result, undefined);
  },
  "projects.create": async ({ params, respond, client }) => {
    if (!validateProjectsCreateParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid projects.create params: ${formatValidationErrors(validateProjectsCreateParams.errors)}`,
        ),
      );
      return;
    }

    const cfg = loadConfig();
    const requestedAgentId = typeof params.agentId === "string" ? params.agentId : undefined;
    const scopeCheck = assertAgentIdInScope({
      client,
      agentId: requestedAgentId,
    });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    const name = normalizeProjectNameForStore(String(params.name ?? ""));
    if (!name) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "name required"));
      return;
    }

    const { projectStorePath } = resolveProjectStoreTarget({
      cfg,
      requestedAgentId,
      client,
    });

    const created = await updateProjectStore(projectStorePath, (store) => {
      const existing = findProjectByNormalizedName(store, name);
      if (existing) {
        return {
          created: false,
          project: existing,
        };
      }
      const project = {
        projectId: randomUUID(),
        name,
      };
      store[project.projectId] = project;
      return {
        created: true,
        project,
      };
    });

    const result: ProjectsCreateResult = {
      ok: true,
      created: created.created,
      path: projectStorePath,
      project: {
        projectId: created.project.projectId,
        name: created.project.name,
      },
    };
    respond(true, result, undefined);
  },
  "projects.sessions.create": async ({ params, respond, client, isWebchatConnect }) => {
    if (!validateProjectsSessionsCreateParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid projects.sessions.create params: ${formatValidationErrors(
            validateProjectsSessionsCreateParams.errors,
          )}`,
        ),
      );
      return;
    }

    const cfg = loadConfig();
    const sessionKey = String(params.sessionKey ?? "").trim();
    const scopeCheck = assertSessionKeyInScope({
      client,
      sessionKey,
      cfg,
    });
    if (!scopeCheck.ok) {
      respond(false, undefined, scopeCheck.error);
      return;
    }

    const created = await createGatewaySession({
      cfg,
      sessionKey,
      name: typeof params.name === "string" ? params.name : undefined,
      projectId: String(params.projectId ?? ""),
      isWebchat: isWebchatConnect(client?.connect),
    });
    if (!created.ok) {
      respond(false, undefined, created.error);
      return;
    }
    respond(true, created.result, undefined);
  },
};
