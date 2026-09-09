import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { parseAgentSessionKey } from "../routing/session-key.js";
import type { TaskRecord } from "../tasks/task-registry.types.js";
import { hasOperatorBoundary } from "./operator-role-policy.js";
import { enterpriseUserPortalIdentity } from "./server-methods/gateway-client-identity.js";
import type { GatewayClient } from "./server-methods/types.js";
import {
  authorizeIncognitoSessionTarget,
  authorizeSessionSharingTarget,
  createSessionListEntryFilter,
  isGatewayAdmin,
  resolveSessionSharingTarget,
} from "./session-sharing.js";

export function resolveTaskRequesterSessionTarget(
  task: Pick<TaskRecord, "ownerKey" | "requesterAgentId" | "requesterSessionKey">,
): { sessionKey: string; agentId?: string } | undefined {
  const sessionKey = normalizeOptionalString(task.requesterSessionKey);
  if (!sessionKey) {
    return undefined;
  }
  const agentId =
    normalizeOptionalString(task.requesterAgentId) ??
    parseAgentSessionKey(sessionKey)?.agentId ??
    parseAgentSessionKey(task.ownerKey)?.agentId;
  return { sessionKey, ...(agentId ? { agentId } : {}) };
}

export function canAccessTaskRequesterSession(params: {
  access?: "read" | "write";
  cfg: OpenClawConfig;
  client: GatewayClient | null;
  task: Pick<TaskRecord, "ownerKey" | "requesterAgentId" | "requesterSessionKey">;
}): boolean {
  const target = resolveTaskRequesterSessionTarget(params.task);
  const enterpriseIdentity = enterpriseUserPortalIdentity(params.client);
  if (params.client?.internal?.enterpriseSession?.audience === "user" && !enterpriseIdentity) {
    return false;
  }
  if (enterpriseIdentity) {
    // Operator scopes on a portal connection do not grant cross-account task access.
    if (!target) {
      return false;
    }
    const ownedTarget = resolveSessionSharingTarget({ cfg: params.cfg, ...target });
    return ownedTarget?.entry.createdActor?.id === enterpriseIdentity.profileId;
  }
  if (!target || isGatewayAdmin(params.client)) {
    return true;
  }
  const sharingTarget = resolveSessionSharingTarget({ cfg: params.cfg, ...target });
  if (
    authorizeIncognitoSessionTarget({
      client: params.client,
      sessionKey: target.sessionKey,
      target: sharingTarget,
    })
  ) {
    return false;
  }
  if (!hasOperatorBoundary(params.client, params.cfg)) {
    return true;
  }
  if (!sharingTarget) {
    return false;
  }
  if (params.access === "write") {
    return !authorizeSessionSharingTarget({
      cfg: params.cfg,
      client: params.client,
      target: sharingTarget,
    });
  }
  const visibilityFilter = createSessionListEntryFilter({
    cfg: params.cfg,
    client: params.client,
  });
  return visibilityFilter?.(sharingTarget.storeKey, sharingTarget.entry) ?? true;
}
