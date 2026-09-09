import {
  EnterpriseApiError,
  requestEnterpriseUserJson,
} from "../../enterprise/services/enterprise-api.ts";
import type {
  PersonalAgentKnowledgeItem,
  PersonalAgentProfile,
} from "../contracts/personal-agent.ts";
import type {
  AgentKey,
  EnterpriseUserAgentAccessRequest,
  SharedAgentRelationshipProfile,
} from "../contracts/user-agent.ts";
import type { UserAutomation, UserAutomationInput } from "../contracts/user-automation.ts";
import type { EnterpriseUserBootstrapV2 } from "../contracts/user-bootstrap.ts";
import type {
  UserCodexCatalog,
  UserCodexCatalogItem,
  UserCodexPluginDetail,
  UserCodexPluginGrant,
  UserCodexPluginMutationResult,
  UserCodexPluginRequest,
  UserExtensionCatalogItem,
  UserExtensionKind,
  UserExtensionReview,
  UserPluginGrant,
  UserPluginRequest,
  UserSkillInstall,
} from "../contracts/user-extension.ts";

export { EnterpriseApiError };

export type EnterpriseUserAuthAccount = {
  username: string;
  displayName: string;
  role: "administrator" | "employee";
  mustChangePassword: boolean;
  enabled: boolean;
  personalAgentEnabled: boolean;
};

export type EnterpriseConversationProject = {
  id: string;
  name: string;
  position: number;
  sessionKeys: string[];
  createdAt: number;
  updatedAt: number;
};

export function loginEnterpriseUser(
  username: string,
  password: string,
): Promise<{ account: EnterpriseUserAuthAccount; csrfToken: string }> {
  return requestEnterpriseUserJson("/api/auth/user/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function loadEnterpriseUserMe(): Promise<{
  account: EnterpriseUserAuthAccount;
  csrfToken: string;
}> {
  return requestEnterpriseUserJson("/api/auth/user/me");
}

export function changeEnterpriseUserPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true; reloginRequired: boolean }> {
  return requestEnterpriseUserJson("/api/auth/user/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function updateEnterpriseUserAccount(
  displayName: string,
): Promise<{ account: EnterpriseUserAuthAccount }> {
  return requestEnterpriseUserJson("/api/enterprise/user/v2/account", {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  });
}

export function updateEnterpriseUserAvatar(input: {
  mime: "image/png" | "image/jpeg" | "image/webp";
  avatarBase64: string;
}): Promise<{ avatarRevision: string }> {
  return requestEnterpriseUserJson("/api/enterprise/user/v2/account/avatar", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function loadEnterpriseUserBootstrapV2(): Promise<EnterpriseUserBootstrapV2> {
  return requestEnterpriseUserJson("/api/enterprise/user/v2/bootstrap");
}

export async function listEnterpriseUserAgentAccessRequests(): Promise<
  EnterpriseUserAgentAccessRequest[]
> {
  const result = await requestEnterpriseUserJson<{
    items: EnterpriseUserAgentAccessRequest[];
  }>("/api/enterprise/user/v2/agent-access-requests");
  return result.items;
}

export async function requestEnterpriseUserAgentAccess(
  agentKey: AgentKey,
): Promise<EnterpriseUserAgentAccessRequest> {
  const result = await requestEnterpriseUserJson<{
    request: EnterpriseUserAgentAccessRequest;
  }>("/api/enterprise/user/v2/agent-access-requests", {
    method: "POST",
    ...idempotentJson({ agentKey }),
  });
  return result.request;
}

export async function cancelEnterpriseUserAgentAccessRequest(
  request: EnterpriseUserAgentAccessRequest,
): Promise<EnterpriseUserAgentAccessRequest> {
  const result = await requestEnterpriseUserJson<{
    request: EnterpriseUserAgentAccessRequest;
  }>(`/api/enterprise/user/v2/agent-access-requests/${encodeURIComponent(request.id)}/cancel`, {
    method: "POST",
    ...idempotentJson({ baseRevision: request.revision }),
  });
  return result.request;
}

export function openEnterpriseUserConversation(
  agentKey: AgentKey,
  mode: "resume-latest" | "new",
  options: { projectId?: string } = {},
): Promise<{ sessionKey: string; conversationId: string; resumed: boolean }> {
  return requestEnterpriseUserJson("/api/enterprise/user/v2/conversations/open", {
    method: "POST",
    body: JSON.stringify({
      agentKey,
      mode,
      clientRequestId: crypto.randomUUID(),
      ...(options.projectId ? { projectId: options.projectId } : {}),
    }),
  });
}

export async function listEnterpriseConversationProjects(): Promise<
  EnterpriseConversationProject[]
> {
  const result = await requestEnterpriseUserJson<{ items: EnterpriseConversationProject[] }>(
    "/api/enterprise/user/v2/conversation-projects",
  );
  return result.items;
}

export async function createEnterpriseConversationProject(
  name: string,
): Promise<EnterpriseConversationProject> {
  const result = await requestEnterpriseUserJson<{ project: EnterpriseConversationProject }>(
    "/api/enterprise/user/v2/conversation-projects",
    {
      method: "POST",
      body: JSON.stringify({ name, idempotencyKey: crypto.randomUUID() }),
    },
  );
  return result.project;
}

export async function renameEnterpriseConversationProject(
  projectId: string,
  name: string,
): Promise<EnterpriseConversationProject> {
  const result = await requestEnterpriseUserJson<{ project: EnterpriseConversationProject }>(
    `/api/enterprise/user/v2/conversation-projects/${encodeURIComponent(projectId)}`,
    { method: "PATCH", body: JSON.stringify({ name }) },
  );
  return result.project;
}

export async function deleteEnterpriseConversationProject(projectId: string): Promise<void> {
  await requestEnterpriseUserJson<{ ok: true }>(
    `/api/enterprise/user/v2/conversation-projects/${encodeURIComponent(projectId)}`,
    { method: "DELETE", body: "{}" },
  );
}

export async function assignEnterpriseConversationProject(
  sessionKey: string,
  projectId: string | null,
  beforeSessionKey?: string | null,
): Promise<void> {
  await requestEnterpriseUserJson<{ ok: true }>(
    "/api/enterprise/user/v2/conversation-projects/assignment",
    {
      method: "PATCH",
      body: JSON.stringify({
        sessionKey,
        projectId,
        ...(beforeSessionKey !== undefined ? { beforeSessionKey } : {}),
      }),
    },
  );
}

export async function loadPersonalAgentProfile(): Promise<PersonalAgentProfile> {
  const result = await requestEnterpriseUserJson<{ profile: PersonalAgentProfile }>(
    "/api/enterprise/user/v2/personal-agent",
  );
  return result.profile;
}

export async function savePersonalAgentProfile(
  profile: PersonalAgentProfile,
): Promise<PersonalAgentProfile> {
  const { revision: baseRevision, ...draft } = profile;
  const result = await requestEnterpriseUserJson<{ profile: PersonalAgentProfile }>(
    "/api/enterprise/user/v2/personal-agent",
    { method: "PATCH", body: JSON.stringify({ baseRevision, profile: draft }) },
  );
  return result.profile;
}

export async function resetPersonalAgentProfile(
  baseRevision: number,
): Promise<PersonalAgentProfile> {
  const result = await requestEnterpriseUserJson<{ profile: PersonalAgentProfile }>(
    "/api/enterprise/user/v2/personal-agent/reset",
    { method: "POST", body: JSON.stringify({ baseRevision }) },
  );
  return result.profile;
}

export async function loadSharedAgentRelationship(
  agentKey: AgentKey,
): Promise<SharedAgentRelationshipProfile> {
  const result = await requestEnterpriseUserJson<{
    profile: SharedAgentRelationshipProfile;
  }>(`/api/enterprise/user/v2/shared-agents/${encodeURIComponent(agentKey)}/relationship`);
  return result.profile;
}

export async function saveSharedAgentRelationship(
  agentKey: AgentKey,
  profile: SharedAgentRelationshipProfile,
): Promise<SharedAgentRelationshipProfile> {
  const { revision: baseRevision, updatedAt: _updatedAt, ...draft } = profile;
  const result = await requestEnterpriseUserJson<{
    profile: SharedAgentRelationshipProfile;
  }>(`/api/enterprise/user/v2/shared-agents/${encodeURIComponent(agentKey)}/relationship`, {
    method: "PATCH",
    body: JSON.stringify({ baseRevision, profile: draft }),
  });
  return result.profile;
}

export async function listPersonalAgentKnowledge(): Promise<PersonalAgentKnowledgeItem[]> {
  const result = await requestEnterpriseUserJson<{ items: PersonalAgentKnowledgeItem[] }>(
    "/api/enterprise/user/v2/personal-agent/knowledge",
  );
  return result.items;
}

export async function createPersonalAgentKnowledge(input: {
  title: string;
  kind: "note" | "upload";
  sourceName: string | null;
  mimeType: string | null;
  content: string;
}): Promise<PersonalAgentKnowledgeItem> {
  const result = await requestEnterpriseUserJson<{ item: PersonalAgentKnowledgeItem }>(
    "/api/enterprise/user/v2/personal-agent/knowledge",
    { method: "POST", body: JSON.stringify(input) },
  );
  return result.item;
}

export async function updatePersonalAgentKnowledge(
  item: PersonalAgentKnowledgeItem,
): Promise<PersonalAgentKnowledgeItem> {
  const result = await requestEnterpriseUserJson<{ item: PersonalAgentKnowledgeItem }>(
    `/api/enterprise/user/v2/personal-agent/knowledge/${encodeURIComponent(item.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        baseRevision: item.revision,
        title: item.title,
        content: item.content,
      }),
    },
  );
  return result.item;
}

export async function deletePersonalAgentKnowledge(id: string): Promise<void> {
  await requestEnterpriseUserJson<{ ok: true }>(
    `/api/enterprise/user/v2/personal-agent/knowledge/${encodeURIComponent(id)}`,
    { method: "DELETE", body: "{}" },
  );
}

export async function listUserAutomations(): Promise<UserAutomation[]> {
  const result = await requestEnterpriseUserJson<{ items: UserAutomation[] }>(
    "/api/enterprise/user/v2/automations",
  );
  return result.items;
}

export async function createUserAutomation(
  automation: UserAutomationInput,
): Promise<UserAutomation> {
  const result = await requestEnterpriseUserJson<{ item: UserAutomation }>(
    "/api/enterprise/user/v2/automations",
    { method: "POST", body: JSON.stringify(automation) },
  );
  return result.item;
}

export async function updateUserAutomation(
  id: string,
  revision: string,
  automation: UserAutomationInput,
): Promise<UserAutomation> {
  const result = await requestEnterpriseUserJson<{ item: UserAutomation }>(
    `/api/enterprise/user/v2/automations/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ revision, automation }) },
  );
  return result.item;
}

export async function deleteUserAutomation(id: string): Promise<void> {
  await requestEnterpriseUserJson<{ ok: true }>(
    `/api/enterprise/user/v2/automations/${encodeURIComponent(id)}`,
    { method: "DELETE", body: "{}" },
  );
}

export async function runUserAutomation(id: string): Promise<void> {
  await requestEnterpriseUserJson<{ ok: true }>(
    `/api/enterprise/user/v2/automations/${encodeURIComponent(id)}/run`,
    { method: "POST", body: "{}" },
  );
}

function idempotentJson(input: unknown): RequestInit {
  return {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(input),
  };
}

export async function searchUserExtensions(input: {
  agentKey: AgentKey;
  query: string;
  signal?: AbortSignal;
}): Promise<UserExtensionCatalogItem[]> {
  const query = new URLSearchParams({ agentKey: input.agentKey, query: input.query });
  const result = await requestEnterpriseUserJson<{ items: UserExtensionCatalogItem[] }>(
    `/api/enterprise/user/v2/extensions/catalog?${query.toString()}`,
    { signal: input.signal },
  );
  return result.items;
}

export async function searchUserCodexPlugins(input: {
  agentKey: AgentKey;
  query: string;
  signal?: AbortSignal;
}): Promise<UserCodexCatalog> {
  const query = new URLSearchParams({ agentKey: input.agentKey });
  if (input.query.trim()) {
    query.set("query", input.query.trim());
  }
  const result = await requestEnterpriseUserJson<{
    status?: UserCodexCatalog["status"];
    items: UserCodexCatalogItem[];
    installed: UserCodexPluginGrant[];
    requests: UserCodexPluginRequest[];
  }>(`/api/enterprise/user/v2/extensions/codex?${query.toString()}`, {
    signal: input.signal,
  });
  return {
    status: result.status ?? "available",
    items: result.items,
    installed: result.installed,
    requests: result.requests,
  };
}

export function loadUserCodexPluginDetail(input: {
  agentKey: AgentKey;
  pluginId: string;
  signal?: AbortSignal;
}): Promise<UserCodexPluginDetail> {
  const query = new URLSearchParams({ agentKey: input.agentKey, pluginId: input.pluginId });
  return requestEnterpriseUserJson<UserCodexPluginDetail>(
    `/api/enterprise/user/v2/extensions/codex/detail?${query.toString()}`,
    { signal: input.signal },
  );
}

export async function createUserCodexPluginRequest(input: {
  agentKey: AgentKey;
  pluginId: string;
}): Promise<UserCodexPluginRequest> {
  const result = await requestEnterpriseUserJson<{ request: UserCodexPluginRequest }>(
    "/api/enterprise/user/v2/extensions/codex/requests",
    { method: "POST", ...idempotentJson(input) },
  );
  return result.request;
}

export async function listUserCodexPluginRequests(input: {
  agentKey: AgentKey;
}): Promise<UserCodexPluginRequest[]> {
  const query = new URLSearchParams({ agentKey: input.agentKey });
  const result = await requestEnterpriseUserJson<{ items: UserCodexPluginRequest[] }>(
    `/api/enterprise/user/v2/extensions/codex/requests?${query.toString()}`,
  );
  return result.items;
}

export async function cancelUserCodexPluginRequest(
  item: UserCodexPluginRequest,
): Promise<UserCodexPluginRequest> {
  const result = await requestEnterpriseUserJson<{ request: UserCodexPluginRequest }>(
    `/api/enterprise/user/v2/extensions/codex/requests/${encodeURIComponent(item.id)}/cancel`,
    { method: "POST", ...idempotentJson({ baseRevision: item.revision }) },
  );
  return result.request;
}

async function mutateUserCodexGrant(
  item: UserCodexPluginGrant,
  action: "enable" | "disable" | "remove" | "refresh" | "connect",
  extra: Record<string, unknown> = {},
): Promise<UserCodexPluginMutationResult> {
  return requestEnterpriseUserJson<UserCodexPluginMutationResult>(
    `/api/enterprise/user/v2/extensions/codex/grants/${encodeURIComponent(item.id)}/${action}`,
    { method: "POST", ...idempotentJson({ baseRevision: item.revision, ...extra }) },
  );
}

export function setUserCodexPluginEnabled(
  item: UserCodexPluginGrant,
  enabled: boolean,
): Promise<UserCodexPluginMutationResult> {
  return mutateUserCodexGrant(item, enabled ? "enable" : "disable");
}

export function removeUserCodexPlugin(
  item: UserCodexPluginGrant,
): Promise<UserCodexPluginMutationResult> {
  return mutateUserCodexGrant(item, "remove");
}

export function refreshUserCodexPlugin(
  item: UserCodexPluginGrant,
): Promise<UserCodexPluginMutationResult> {
  return mutateUserCodexGrant(item, "refresh");
}

/** Ask the Codex runtime to start the provider-owned account connection flow. */
export function connectUserCodexPlugin(
  item: UserCodexPluginGrant,
  serverName: string,
): Promise<UserCodexPluginMutationResult> {
  return mutateUserCodexGrant(item, "connect", { serverName });
}

export function reviewUserExtension(input: {
  agentKey: AgentKey;
  kind: UserExtensionKind;
  catalogKey: string;
  version?: string;
}): Promise<UserExtensionReview> {
  const query = new URLSearchParams({
    agentKey: input.agentKey,
    kind: input.kind,
    catalogKey: input.catalogKey,
  });
  if (input.version) {
    query.set("version", input.version);
  }
  return requestEnterpriseUserJson(`/api/enterprise/user/v2/extensions/detail?${query.toString()}`);
}

export function loadUserExtensionInventory(agentKey: AgentKey): Promise<{
  items: UserSkillInstall[];
  grants: UserPluginGrant[];
}> {
  return requestEnterpriseUserJson(
    `/api/enterprise/user/v2/extensions/installed?agentKey=${encodeURIComponent(agentKey)}`,
  );
}

export async function installUserSkill(reviewToken: string): Promise<UserSkillInstall> {
  const result = await requestEnterpriseUserJson<{ install: UserSkillInstall }>(
    "/api/enterprise/user/v2/extensions/skills",
    { method: "POST", ...idempotentJson({ reviewToken }) },
  );
  return result.install;
}

export async function updateUserSkill(
  item: UserSkillInstall,
  reviewToken: string,
): Promise<UserSkillInstall> {
  const body = { baseRevision: item.revision, reviewToken };
  const result = await requestEnterpriseUserJson<{ install: UserSkillInstall }>(
    `/api/enterprise/user/v2/extensions/skills/${encodeURIComponent(item.id)}/update`,
    { method: "POST", ...idempotentJson(body) },
  );
  return result.install;
}

export async function setUserSkillEnabled(
  item: UserSkillInstall,
  enabled: boolean,
): Promise<UserSkillInstall> {
  const body = { baseRevision: item.revision, enabled };
  const result = await requestEnterpriseUserJson<{ install: UserSkillInstall }>(
    `/api/enterprise/user/v2/extensions/skills/${encodeURIComponent(item.id)}`,
    { method: "PATCH", ...idempotentJson(body) },
  );
  return result.install;
}

export async function removeUserSkill(item: UserSkillInstall): Promise<void> {
  const body = { baseRevision: item.revision };
  await requestEnterpriseUserJson<{ ok: true }>(
    `/api/enterprise/user/v2/extensions/skills/${encodeURIComponent(item.id)}`,
    { method: "DELETE", ...idempotentJson(body) },
  );
}

export async function listUserPluginRequests(): Promise<UserPluginRequest[]> {
  const result = await requestEnterpriseUserJson<{ items: UserPluginRequest[] }>(
    "/api/enterprise/user/v2/plugin-requests",
  );
  return result.items;
}

export async function createUserPluginRequest(reviewToken: string): Promise<UserPluginRequest> {
  const result = await requestEnterpriseUserJson<{ request: UserPluginRequest }>(
    "/api/enterprise/user/v2/plugin-requests",
    { method: "POST", ...idempotentJson({ reviewToken }) },
  );
  return result.request;
}

export async function cancelUserPluginRequest(item: UserPluginRequest): Promise<UserPluginRequest> {
  const body = { baseRevision: item.revision };
  const result = await requestEnterpriseUserJson<{ request: UserPluginRequest }>(
    `/api/enterprise/user/v2/plugin-requests/${encodeURIComponent(item.id)}/cancel`,
    { method: "POST", ...idempotentJson(body) },
  );
  return result.request;
}

export async function relinquishUserPluginGrant(item: UserPluginGrant): Promise<UserPluginGrant> {
  const body = { baseRevision: item.revision };
  const result = await requestEnterpriseUserJson<{ grant: UserPluginGrant }>(
    `/api/enterprise/user/v2/plugin-grants/${encodeURIComponent(item.id)}/relinquish`,
    { method: "POST", ...idempotentJson(body) },
  );
  return result.grant;
}
