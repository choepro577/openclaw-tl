import { listAgentEntries } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { AgentEntrySchema } from "../../config/zod-schema.agent-runtime.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import {
  parseEnterpriseResourceKey,
  sharedAgentResourceKey,
} from "../entitlements/resource-keys.js";

/** Transfer grants name an exact configured specialist, never a personal or inherited Agent. */
export function isKnowledgeEvidenceTransferTarget(
  config: OpenClawConfig,
  resourceKey: string,
): boolean {
  const parsed = parseEnterpriseResourceKey("agent", resourceKey);
  if (
    parsed.scope !== "shared" ||
    sharedAgentResourceKey(parsed.runtimeId) !== resourceKey ||
    isReservedSystemAgentId(parsed.runtimeId)
  ) {
    return false;
  }
  return listAgentEntries(config).some(
    (entry) =>
      entry.id === parsed.runtimeId &&
      entry.delegationTarget?.status === "active" &&
      AgentEntrySchema.safeParse(entry).success,
  );
}
