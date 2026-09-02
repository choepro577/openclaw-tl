import { listAgentEntries } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { isReservedSystemAgentId } from "../../system-agent/agent-id.js";
import { getEnterpriseAccountById, listEnterpriseAccounts } from "../accounts/account-store.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { resolveEnterpriseResourceAccess } from "../entitlements/entitlement-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import { resolveEnterpriseWorkspacePath } from "../personal-agent/personal-workspace.js";
import {
  listSharedAgentRelationshipAccountIds,
  readSharedAgentRelationship,
  writeSharedAgentRelationship,
  type SharedAgentRelationshipDraft,
} from "../user/shared-agent-relationship-store.js";
import {
  listEnterpriseAgentCoreFiles,
  readEnterpriseAgentCoreFile,
  writeEnterpriseAgentCoreFile,
} from "./admin-agent-files.js";

function requireSharedAgent(config: OpenClawConfig, value: string) {
  const agentId = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(agentId) || isReservedSystemAgentId(agentId)) {
    throw new Error("AGENT_ID_INVALID");
  }
  const agent = listAgentEntries(config).find((entry) => entry.id === agentId);
  if (!agent) {
    throw new Error("AGENT_NOT_FOUND");
  }
  return agent;
}

function resolveSharedRelationshipWorkspace(
  config: OpenClawConfig,
  agentIdInput: string,
  accountId: string,
): { agentId: string; account: EnterpriseAccount; workspace: string } {
  const agentId = requireSharedAgent(config, agentIdInput).id;
  const account = getEnterpriseAccountById(accountId);
  if (!account) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }
  return {
    agentId,
    account,
    workspace: resolveEnterpriseWorkspacePath(account.profileId, agentId),
  };
}

export async function readEnterpriseSharedRelationshipsPanel(
  config: OpenClawConfig,
  agentIdInput: string,
) {
  const agent = requireSharedAgent(config, agentIdInput);
  const resourceKey = sharedAgentResourceKey(agent.id);
  const storedAccountIds = new Set(listSharedAgentRelationshipAccountIds(agent.id));
  const accounts = listEnterpriseAccounts().filter(
    (account) =>
      storedAccountIds.has(account.id) ||
      resolveEnterpriseResourceAccess(account, "agent", resourceKey).allowed,
  );
  const items = await Promise.all(
    accounts.map(async (account) => {
      const profile = readSharedAgentRelationship(account.id, agent.id, account.displayName);
      const workspace = resolveEnterpriseWorkspacePath(account.profileId, agent.id);
      return {
        accountId: account.id,
        username: account.username,
        displayName: account.displayName,
        role: account.role,
        enabled: account.enabled,
        assigned: resolveEnterpriseResourceAccess(account, "agent", resourceKey).allowed,
        effectiveName: profile.agentAlias || agent.identity?.name || agent.name || agent.id,
        profile,
        workspace,
        files: await listEnterpriseAgentCoreFiles(workspace),
      };
    }),
  );
  return {
    agentId: agent.id,
    canonicalName: agent.identity?.name ?? agent.name ?? agent.id,
    items,
  };
}

export async function readEnterpriseSharedRelationshipFile(
  config: OpenClawConfig,
  agentId: string,
  accountId: string,
  name: string,
) {
  const resolved = resolveSharedRelationshipWorkspace(config, agentId, accountId);
  return {
    agentId: resolved.agentId,
    accountId: resolved.account.id,
    file: await readEnterpriseAgentCoreFile(resolved.workspace, name),
  };
}

export async function writeEnterpriseSharedRelationshipFile(
  config: OpenClawConfig,
  agentId: string,
  accountId: string,
  input: { name: string; content: string; baseRevision: string | null },
) {
  const resolved = resolveSharedRelationshipWorkspace(config, agentId, accountId);
  return {
    agentId: resolved.agentId,
    accountId: resolved.account.id,
    file: await writeEnterpriseAgentCoreFile(resolved.workspace, input),
  };
}

export function updateEnterpriseSharedRelationship(
  config: OpenClawConfig,
  agentIdInput: string,
  accountId: string,
  baseRevision: number,
  profile: SharedAgentRelationshipDraft,
) {
  const { agentId, account } = resolveSharedRelationshipWorkspace(config, agentIdInput, accountId);
  const existing = readSharedAgentRelationship(account.id, agentId, account.displayName);
  const assigned = resolveEnterpriseResourceAccess(
    account,
    "agent",
    sharedAgentResourceKey(agentId),
  ).allowed;
  if (!assigned && existing.revision === 0) {
    throw new Error("AGENT_NOT_ASSIGNED");
  }
  return writeSharedAgentRelationship(account.id, agentId, baseRevision, profile);
}
