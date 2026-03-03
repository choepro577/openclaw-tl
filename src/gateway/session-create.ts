import { randomUUID } from "node:crypto";
import type { OpenClawConfig } from "../config/config.js";
import {
  findProjectById,
  loadProjectStore,
  resolveProjectStorePathFromSessionStorePath,
  type ProjectEntry,
} from "../config/projects.js";
import {
  ensureSessionTranscriptHeader,
  resolveSessionFilePath,
  type SessionEntry,
  updateSessionStore,
} from "../config/sessions.js";
import { ErrorCodes, errorShape, type ErrorShape } from "./protocol/index.js";
import {
  buildGatewaySessionRow,
  resolveGatewaySessionStoreTarget,
  type SessionsCreateResult,
} from "./session-utils.js";

function normalizeOptionalName(name?: string): string | undefined {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed || undefined;
}

function conflictError(message: string): ErrorShape {
  return errorShape(ErrorCodes.INVALID_REQUEST, message);
}

type CreateGatewaySessionParams = {
  cfg: OpenClawConfig;
  sessionKey: string;
  name?: string;
  projectId?: string | null;
  isWebchat: boolean;
};

export async function createGatewaySession(
  params: CreateGatewaySessionParams,
): Promise<{ ok: true; result: SessionsCreateResult } | { ok: false; error: ErrorShape }> {
  const target = resolveGatewaySessionStoreTarget({
    cfg: params.cfg,
    key: params.sessionKey,
  });
  const primaryKey = target.storeKeys[0] ?? target.canonicalKey;
  const requestedName = normalizeOptionalName(params.name);
  const requestedProjectId =
    typeof params.projectId === "string" && params.projectId.trim()
      ? params.projectId.trim()
      : null;

  const projectStorePath = resolveProjectStorePathFromSessionStorePath(target.storePath);
  let project: ProjectEntry | undefined;
  if (requestedProjectId) {
    const projectStore = loadProjectStore(projectStorePath);
    project = findProjectById(projectStore, requestedProjectId);
    if (!project) {
      return {
        ok: false,
        error: errorShape(ErrorCodes.INVALID_REQUEST, `unknown projectId: ${requestedProjectId}`),
      };
    }
  }

  const created = await updateSessionStore(
    target.storePath,
    (store) => {
      const existingKey = target.storeKeys.find((candidate) => store[candidate]);
      if (existingKey && existingKey !== primaryKey && !store[primaryKey]) {
        store[primaryKey] = store[existingKey];
        delete store[existingKey];
      }

      const existing = store[primaryKey];
      const existingProjectId = existing?.projectId ?? null;
      if (existing) {
        if (requestedProjectId === null && existingProjectId !== null) {
          return {
            ok: false as const,
            error: conflictError(
              `session "${target.canonicalKey}" already belongs to project "${existingProjectId}"`,
            ),
          };
        }
        if (requestedProjectId !== null && existingProjectId !== requestedProjectId) {
          const currentScope =
            existingProjectId === null ? "standalone session" : `project "${existingProjectId}"`;
          return {
            ok: false as const,
            error: conflictError(
              `session "${target.canonicalKey}" already belongs to ${currentScope}`,
            ),
          };
        }
        return {
          ok: true as const,
          created: false,
          entry: existing,
        };
      }

      const sessionId = randomUUID();
      const entry: SessionEntry = {
        sessionId,
        updatedAt: Date.now(),
        projectId: requestedProjectId,
        ...(requestedName ? { name: requestedName } : {}),
        ...(params.isWebchat
          ? {
              deliveryContext: { channel: "webchat" },
              lastChannel: "webchat" as const,
            }
          : {}),
      };
      store[primaryKey] = entry;

      return {
        ok: true as const,
        created: true,
        entry,
      };
    },
    { activeSessionKey: primaryKey },
  );

  if (!created.ok) {
    return { ok: false, error: created.error };
  }

  const entry = created.entry;
  const transcriptPath = resolveSessionFilePath(entry.sessionId, entry, {
    agentId: target.agentId,
  });
  await ensureSessionTranscriptHeader({
    sessionFile: transcriptPath,
    sessionId: entry.sessionId,
  });

  const result: SessionsCreateResult = {
    ok: true,
    created: created.created,
    path: target.storePath,
    transcriptPath,
    sessionKey: target.canonicalKey,
    sessionId: entry.sessionId,
    entry,
    session: buildGatewaySessionRow({
      cfg: params.cfg,
      storePath: target.storePath,
      key: target.canonicalKey,
      entry,
    }),
    ...(project ? { project: { projectId: project.projectId, name: project.name } } : {}),
  };
  return { ok: true, result };
}
