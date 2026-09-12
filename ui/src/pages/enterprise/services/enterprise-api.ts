import { inferBasePathFromPathname } from "../../../app-route-paths.ts";
import type { ClawHubSearchResult } from "../../../lib/skills/clawhub-search.ts";
import type { ClawHubSkillDetail } from "../../../lib/skills/index.ts";
import type {
  EnterpriseAccount,
  EnterpriseAccountRole,
  EnterpriseAccessPreset,
  EnterpriseAdminModelContext,
  EnterpriseAdminModelMethod,
  EnterpriseAuditEvent,
  EnterpriseConfigSnapshot,
  EnterpriseConfigValidation,
  EnterpriseCodexPluginGrant,
  EnterpriseCodexPluginRequest,
  EnterpriseCodexPluginRequestDetail,
  EnterpriseEffectivePolicy,
  EnterpriseEntitlement,
  EnterpriseEntitlementEffect,
  EnterpriseDelegationEvent,
  EnterpriseDelegationPolicy,
  EnterpriseDelegationProfile,
  EnterpriseDelegationSpecialist,
  EnterprisePageInfo,
  EnterprisePluginGrant,
  EnterprisePluginRequest,
  EnterprisePluginRequestDetail,
  EnterprisePersonalAgent,
  EnterprisePortalAudience,
  EnterpriseSharedAgent,
  EnterpriseSkillCatalogItem,
  EnterpriseStatus,
  EnterpriseToolCatalogItem,
  EnterpriseUserCapabilities,
} from "./enterprise-api-types.ts";

type EnterpriseExtensionGrantScope = "account" | "shared_agent";

export type * from "./enterprise-api-types.ts";

const csrfTokens: Partial<Record<EnterprisePortalAudience, string>> = {};

export class EnterpriseApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly payload?: Record<string, unknown>,
  ) {
    super(message);
  }
}

function controlUiBasePath(): string {
  const pathname = globalThis.location?.pathname ?? "/";
  const portalIndex = ["/admin", "/app", "/enterprise"]
    .map((segment) => pathname.indexOf(segment))
    .filter((index) => index >= 0)
    .toSorted((left, right) => left - right)[0];
  return portalIndex === undefined
    ? inferBasePathFromPathname(pathname)
    : pathname.slice(0, portalIndex);
}

export function enterpriseApiPath(path: string): string {
  return `${controlUiBasePath()}${path}`;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  audience?: EnterprisePortalAudience,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (audience && init?.method && !["GET", "HEAD"].includes(init.method.toUpperCase())) {
    const csrf = csrfTokens[audience];
    if (csrf) {
      headers.set("X-CSRF-Token", csrf);
    }
  }
  const response = await fetch(enterpriseApiPath(path), {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await response.json()) as Record<string, unknown>)
    : undefined;
  if (!response.ok) {
    throw new EnterpriseApiError(
      response.status,
      typeof body?.code === "string" ? body.code : "HTTP_ERROR",
      typeof body?.message === "string" ? body.message : `HTTP ${response.status}`,
      body,
    );
  }
  if (!body) {
    throw new EnterpriseApiError(response.status, "INVALID_RESPONSE", "Phản hồi không hợp lệ.");
  }
  if (audience && typeof body.csrfToken === "string") {
    csrfTokens[audience] = body.csrfToken;
  }
  return body as T;
}

/** Shared authenticated transport for the isolated Enterprise User source tree. */
export function requestEnterpriseUserJson<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, init, "user");
}

/** Shared authenticated transport for audience-scoped Enterprise feature clients. */
export function requestEnterprisePortalJson<T>(
  path: string,
  init: RequestInit | undefined,
  audience: EnterprisePortalAudience,
): Promise<T> {
  return requestJson<T>(path, init, audience);
}

/** Returns the in-memory anti-CSRF token acquired for an authenticated audience. */
export function getEnterprisePortalCsrfToken(
  audience: EnterprisePortalAudience,
): string | undefined {
  return csrfTokens[audience];
}

function queryString(values: Record<string, string | number | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const result = query.toString();
  return result ? `?${result}` : "";
}

export async function loadEnterpriseStatus(): Promise<EnterpriseStatus> {
  const response = await fetch(enterpriseApiPath("/api/enterprise/status"), {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) {
    return { enabled: false };
  }
  return (await response.json()) as EnterpriseStatus;
}

export async function loginEnterprisePortal(
  audience: EnterprisePortalAudience,
  username: string,
  password: string,
): Promise<{ account: EnterpriseAccount; csrfToken: string }> {
  const result = await requestJson<{ account: EnterpriseAccount; csrfToken: string }>(
    `/api/auth/${audience}/login`,
    { method: "POST", body: JSON.stringify({ username, password }) },
    audience,
  );
  csrfTokens[audience] = result.csrfToken;
  return result;
}

export async function loadEnterprisePortalMe(audience: EnterprisePortalAudience) {
  return requestJson<{ account: EnterpriseAccount; csrfToken: string }>(
    `/api/auth/${audience}/me`,
    undefined,
    audience,
  );
}

export async function logoutEnterprisePortal(audience: EnterprisePortalAudience): Promise<void> {
  await requestJson<{ ok: true }>(
    `/api/auth/${audience}/logout`,
    { method: "POST", body: "{}" },
    audience,
  );
  delete csrfTokens[audience];
}

export async function changeEnterprisePortalPassword(
  audience: EnterprisePortalAudience,
  currentPassword: string,
  newPassword: string,
) {
  const result = await requestJson<{ ok: true; reloginRequired: boolean }>(
    `/api/auth/${audience}/change-password`,
    { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) },
    audience,
  );
  delete csrfTokens[audience];
  return result;
}

// Compatibility exports for the existing user portal screens.
export async function loginEnterprise(username: string, password: string) {
  return loginEnterprisePortal("user", username, password);
}
export async function loadEnterpriseMe() {
  return loadEnterprisePortalMe("user");
}
export async function logoutEnterprise() {
  return logoutEnterprisePortal("user");
}
export async function changeEnterprisePassword(currentPassword: string, newPassword: string) {
  return changeEnterprisePortalPassword("user", currentPassword, newPassword);
}
export async function loadMyEnterprisePolicy(): Promise<EnterpriseEffectivePolicy> {
  return requestJson<EnterpriseEffectivePolicy>("/api/enterprise/me/policy");
}

export async function loadEnterpriseUserCapabilities(): Promise<EnterpriseUserCapabilities> {
  return requestJson<EnterpriseUserCapabilities>("/api/enterprise/user/me/capabilities");
}

export async function listAdminAccounts(filters: Record<string, string> = {}) {
  return requestJson<{
    accounts: EnterpriseAccount[];
    pageInfo: EnterprisePageInfo;
    accessPresets: EnterpriseAccessPreset[];
  }>(`/api/enterprise/admin/accounts${queryString(filters)}`, undefined, "admin");
}

export async function createAdminAccount(input: {
  username: string;
  displayName: string;
  initialPassword: string;
  role: EnterpriseAccountRole;
  enabled: boolean;
  personalAgentEnabled: boolean;
  defaultAgentId: string | null;
  accessPresetKey?: string;
  skillGrants?: string[];
  agentGrants?: string[];
}) {
  return requestJson<{ account: EnterpriseAccount }>(
    "/api/enterprise/admin/accounts",
    {
      method: "POST",
      body: JSON.stringify({
        ...input,
        accessPresetKey: input.accessPresetKey ?? (input.role === "employee" ? "basic@1" : "none"),
      }),
    },
    "admin",
  );
}

export async function loadAdminAccount(accountId: string) {
  return requestJson<{
    account: EnterpriseAccount;
    entitlements: EnterpriseEntitlement[];
    effectivePolicy: EnterpriseEffectivePolicy;
    sessions: Array<Record<string, unknown>>;
  }>(`/api/enterprise/admin/accounts/${encodeURIComponent(accountId)}`, undefined, "admin");
}

export type EnterpriseAdminAccountPatch = Partial<EnterpriseAccount> & {
  applyAccessPreset?: boolean;
};

export async function updateAdminAccount(accountId: string, patch: EnterpriseAdminAccountPatch) {
  return requestJson<{ account: EnterpriseAccount }>(
    `/api/enterprise/admin/accounts/${encodeURIComponent(accountId)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
    "admin",
  );
}

export async function resetAdminAccountPassword(accountId: string, newPassword: string) {
  return requestJson<{ account: EnterpriseAccount }>(
    `/api/enterprise/admin/accounts/${encodeURIComponent(accountId)}/reset-password`,
    { method: "POST", body: JSON.stringify({ newPassword }) },
    "admin",
  );
}

export async function revokeAdminAccountSession(accountId: string, sessionId: string) {
  return requestJson<{ ok: true }>(
    `/api/enterprise/admin/accounts/${encodeURIComponent(accountId)}/sessions/${encodeURIComponent(sessionId)}/revoke`,
    { method: "POST", body: "{}" },
    "admin",
  );
}

export async function listAdminAgentCatalog() {
  return requestJson<{
    shared: EnterpriseSharedAgent[];
    personal: EnterprisePersonalAgent[];
    catalogRevision: string;
  }>("/api/enterprise/admin/agents", undefined, "admin");
}

export async function loadAdminAgentPanel(
  scope: "shared" | "personal",
  id: string,
  panel:
    | "overview"
    | "files"
    | "tools"
    | "skills"
    | "channels"
    | "cron"
    | "memory"
    | "relationships",
  signal?: AbortSignal,
) {
  return requestJson<Record<string, unknown>>(
    `/api/enterprise/admin/agents/${scope}/${encodeURIComponent(id)}/${panel}`,
    { signal },
    "admin",
  );
}

export type EnterpriseSharedRelationshipProfile = {
  revision: number;
  agentAlias: string;
  agentSelfReference: string;
  userAddress: string;
  customInstructions: string;
  updatedAt: number;
};

export type EnterpriseSharedRelationshipItem = {
  accountId: string;
  username: string;
  displayName: string;
  role: EnterpriseAccountRole;
  enabled: boolean;
  assigned: boolean;
  effectiveName: string;
  profile: EnterpriseSharedRelationshipProfile;
  workspace: string;
  files: Array<{
    name: string;
    missing: boolean;
    size: number;
    updatedAt: number | null;
    writable: boolean;
  }>;
};

export async function updateAdminSharedRelationship(
  agentId: string,
  accountId: string,
  profile: EnterpriseSharedRelationshipProfile,
) {
  const { revision: baseRevision, updatedAt: _updatedAt, ...draft } = profile;
  return requestJson<{ profile: EnterpriseSharedRelationshipProfile }>(
    `/api/enterprise/admin/agents/shared/${encodeURIComponent(agentId)}/relationships/${encodeURIComponent(accountId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ baseRevision, profile: draft }),
    },
    "admin",
  );
}

export async function loadAdminSharedRelationshipFile(
  agentId: string,
  accountId: string,
  name: string,
  signal?: AbortSignal,
) {
  return requestJson<{ file: EnterpriseAgentFile }>(
    `/api/enterprise/admin/agents/shared/${encodeURIComponent(agentId)}/relationships/${encodeURIComponent(accountId)}/files${queryString({ name })}`,
    { signal },
    "admin",
  );
}

export async function saveAdminSharedRelationshipFile(
  agentId: string,
  accountId: string,
  input: { name: string; content: string; baseRevision: string | null },
) {
  return requestJson<{ file: EnterpriseAgentFile }>(
    `/api/enterprise/admin/agents/shared/${encodeURIComponent(agentId)}/relationships/${encodeURIComponent(accountId)}/files`,
    { method: "PUT", body: JSON.stringify(input) },
    "admin",
  );
}

export type EnterpriseAgentFile = {
  name: string;
  path: string;
  missing: boolean;
  size: number;
  updatedAt: number | null;
  writable: boolean;
  content: string;
  contentRevision: string | null;
};

export async function loadAdminAgentFile(
  scope: "shared" | "personal",
  id: string,
  name: string,
  signal?: AbortSignal,
) {
  return requestJson<{ file: EnterpriseAgentFile }>(
    `/api/enterprise/admin/agents/${scope}/${encodeURIComponent(id)}/files${queryString({ name })}`,
    { signal },
    "admin",
  );
}

export async function saveAdminAgentFile(
  scope: "shared" | "personal",
  id: string,
  input: { name: string; content: string; baseRevision: string | null },
) {
  return requestJson<{ file: EnterpriseAgentFile }>(
    `/api/enterprise/admin/agents/${scope}/${encodeURIComponent(id)}/files`,
    { method: "PUT", body: JSON.stringify(input) },
    "admin",
  );
}

export async function updateAdminAgentTools(
  scope: "shared" | "personal",
  id: string,
  input: {
    profile: "minimal" | "coding" | "messaging" | "full" | null;
    alsoAllow: string[];
    deny: string[];
    baseHash?: string;
    baseRevision?: number;
  },
) {
  return requestJson<{
    agentId: string;
    hash?: string;
    accountId?: string;
    policyRevision?: number;
  }>(
    `/api/enterprise/admin/agents/${scope}/${encodeURIComponent(id)}/tools`,
    { method: "PATCH", body: JSON.stringify(input) },
    "admin",
  );
}

export async function updateAdminAgentSkills(
  scope: "shared" | "personal",
  id: string,
  skills: string[] | null,
  baseHash: string,
) {
  return requestJson<{ agentId: string; hash: string }>(
    `/api/enterprise/admin/agents/${scope}/${encodeURIComponent(id)}/skills`,
    { method: "PATCH", body: JSON.stringify({ skills, baseHash }) },
    "admin",
  );
}

export async function mutateAdminAgentCron(
  scope: "shared" | "personal",
  id: string,
  input: Record<string, unknown>,
) {
  return requestJson<Record<string, unknown>>(
    `/api/enterprise/admin/agents/${scope}/${encodeURIComponent(id)}/cron`,
    { method: "POST", body: JSON.stringify(input) },
    "admin",
  );
}

export async function runAdminAgentMemoryAction(
  scope: "shared" | "personal",
  id: string,
  action:
    | "backfillDreamDiary"
    | "resetDreamDiary"
    | "resetGroundedShortTerm"
    | "repairDreamingArtifacts"
    | "dedupeDreamDiary",
) {
  return requestJson<Record<string, unknown>>(
    `/api/enterprise/admin/agents/${scope}/${encodeURIComponent(id)}/memory`,
    { method: "POST", body: JSON.stringify({ action }) },
    "admin",
  );
}

export async function createAdminSharedAgent(input: {
  id: string;
  name: string;
  model: string | null;
  workspace: string | null;
  baseHash: string;
}) {
  return requestJson<{ agentId: string; hash: string }>(
    "/api/enterprise/admin/agents/shared",
    { method: "POST", body: JSON.stringify(input) },
    "admin",
  );
}

export async function updateAdminSharedAgent(
  agentId: string,
  input: {
    name?: string;
    model?: string | null;
    workspace?: string | null;
    baseHash: string;
  },
) {
  return requestJson<{ agentId: string; hash: string }>(
    `/api/enterprise/admin/agents/shared/${encodeURIComponent(agentId)}/overview`,
    { method: "PATCH", body: JSON.stringify(input) },
    "admin",
  );
}

export async function deleteAdminSharedAgent(agentId: string, baseHash: string) {
  return requestJson<{ agentId: string; hash: string }>(
    `/api/enterprise/admin/agents/shared/${encodeURIComponent(agentId)}`,
    { method: "DELETE", body: JSON.stringify({ baseHash }) },
    "admin",
  );
}

export async function loadAdminDelegationSettings() {
  return requestJson<{
    policy: EnterpriseDelegationPolicy;
    availableModels: string[];
    routerModelAvailable: boolean;
  }>("/api/enterprise/admin/delegation/settings", undefined, "admin");
}

export async function saveAdminDelegationSettings(policy: EnterpriseDelegationPolicy) {
  const { revision: baseRevision, updatedAt: _updatedAt, ...input } = policy;
  return requestJson<{ policy: EnterpriseDelegationPolicy }>(
    "/api/enterprise/admin/delegation/settings",
    { method: "PATCH", body: JSON.stringify({ ...input, baseRevision }) },
    "admin",
  );
}

export async function loadAdminDelegationOverview(filters: Record<string, string> = {}) {
  return requestJson<{
    policy: EnterpriseDelegationPolicy;
    accountsWithPersonalAgent: number;
    assignments: number;
    effectiveAssignments: number;
    routableAssignments: number;
    events: {
      totalEvents: number;
      delegated: number;
      clarified: number;
      blocked: number;
      failed: number;
      averageLatencyMs: number | null;
    };
  }>(`/api/enterprise/admin/delegation/overview${queryString(filters)}`, undefined, "admin");
}

export async function listAdminDelegationEvents(filters: Record<string, string> = {}) {
  return requestJson<{
    events: EnterpriseDelegationEvent[];
    total: number;
    nextCursor: string | null;
  }>(`/api/enterprise/admin/delegation/events${queryString(filters)}`, undefined, "admin");
}

export async function loadAdminAgentDelegationProfile(agentId: string, signal?: AbortSignal) {
  return requestJson<{
    agentId: string;
    name: string;
    description: string;
    profile: EnterpriseDelegationProfile;
    checklist: Record<string, boolean>;
    canActivate: boolean;
    policyRevision: number;
    configHash: string;
  }>(
    `/api/enterprise/admin/agents/${encodeURIComponent(agentId)}/delegation-profile`,
    { signal },
    "admin",
  );
}

export async function saveAdminAgentDelegationProfile(input: {
  agentId: string;
  description: string;
  profile: EnterpriseDelegationProfile;
  baseHash: string;
}) {
  return requestJson<{ agentId: string; hash: string }>(
    `/api/enterprise/admin/agents/${encodeURIComponent(input.agentId)}/delegation-profile`,
    {
      method: "PATCH",
      body: JSON.stringify({
        description: input.description,
        profile: {
          ...input.profile,
          requiredInputs: input.profile.requiredInputs.map(({ id, ...item }) =>
            id.trim() ? { id, ...item } : item,
          ),
        },
        baseHash: input.baseHash,
      }),
    },
    "admin",
  );
}

export async function draftAdminAgentDelegationProfile(agentId: string) {
  return requestJson<{
    description: string;
    draft: EnterpriseDelegationProfile;
    source: "ai";
    model: string;
    saved: false;
  }>(
    `/api/enterprise/admin/agents/${encodeURIComponent(agentId)}/delegation-profile/draft`,
    { method: "POST", body: "{}" },
    "admin",
  );
}

export async function simulateAdminAgentDelegation(
  agentId: string,
  accountId: string,
  prompt: string,
) {
  return requestJson<{
    outcome: "delegate" | "clarify" | "local" | "blocked" | "shadow";
    agentNames: string[];
    decisionSource: "explicit" | "rule" | "ai" | "system";
    reasonCode: string;
    confidenceBand: "clear" | "ambiguous" | null;
    policyRevision: number;
    profileRevisions: Record<string, string>;
    missingRequiredInput: {
      agentId: string;
      id: string;
      label: string;
      question: string;
    } | null;
  }>(
    `/api/enterprise/admin/agents/${encodeURIComponent(agentId)}/delegation-profile/simulate`,
    { method: "POST", body: JSON.stringify({ accountId, prompt }) },
    "admin",
  );
}

export async function loadAdminAccountDelegation(accountId: string) {
  return requestJson<{
    account: EnterpriseAccount;
    policy: EnterpriseDelegationPolicy;
    overrides: Array<{
      accountId: string;
      agentResourceKey: string;
      mode: "inherit" | "confirm_before_handoff" | "explicit_only" | "disabled";
      revision: number;
      updatedAt: number;
    }>;
    specialists: EnterpriseDelegationSpecialist[];
  }>(
    `/api/enterprise/admin/accounts/${encodeURIComponent(accountId)}/delegation`,
    undefined,
    "admin",
  );
}

export async function saveAdminAccountDelegationOverride(input: {
  accountId: string;
  agentResourceKey: string;
  mode: "inherit" | "confirm_before_handoff" | "explicit_only" | "disabled";
  baseRevision: number;
  baseAccountPolicyRevision: number;
}) {
  return requestJson<{
    override: Record<string, unknown>;
    accountPolicyRevision: number;
  }>(
    `/api/enterprise/admin/accounts/${encodeURIComponent(input.accountId)}/delegation`,
    { method: "PATCH", body: JSON.stringify(input) },
    "admin",
  );
}

export async function previewAdminDelegationActivation() {
  return requestJson<{
    previewToken: string;
    expiresAt: number;
    policy: EnterpriseDelegationPolicy;
    summary: {
      assignments: number;
      eligible: number;
      missingProfile: number;
      blocked: number;
      orphaned: number;
      affectedUsers: number;
    };
    rows: Array<{
      accountId: string;
      username: string;
      displayName: string;
      accountEnabled: boolean;
      personalAgentEnabled: boolean;
      agentId: string;
      agentName: string;
      resourceKey: string;
      assigned: boolean;
      effective: boolean;
      eligible: boolean;
      reasonCodes: string[];
    }>;
  }>(
    "/api/enterprise/admin/delegation/activation-preview",
    { method: "POST", body: "{}" },
    "admin",
  );
}

export async function activateAdminDelegation(
  previewToken: string,
  exclusions: Array<{ accountId: string; agentResourceKey: string }> = [],
) {
  return requestJson<{ policy: EnterpriseDelegationPolicy }>(
    "/api/enterprise/admin/delegation/activate",
    { method: "POST", body: JSON.stringify({ previewToken, exclusions }) },
    "admin",
  );
}

export async function listAdminSkillCatalog(filters: Record<string, string> = {}) {
  return requestJson<{ items: EnterpriseSkillCatalogItem[]; catalogRevision: string }>(
    `/api/enterprise/admin/skills${queryString(filters)}`,
    undefined,
    "admin",
  );
}

export async function searchAdminExternalSkills(query: string, signal?: AbortSignal) {
  return requestJson<{ results: ClawHubSearchResult[] }>(
    `/api/enterprise/admin/skills/search${queryString({ query })}`,
    { signal },
    "admin",
  );
}

export async function loadAdminExternalSkillDetail(ref: string, signal?: AbortSignal) {
  return requestJson<ClawHubSkillDetail>(
    `/api/enterprise/admin/skills/detail${queryString({ ref })}`,
    { signal },
    "admin",
  );
}

export async function installAdminExternalSkill(input: {
  agentId?: string;
  ref: string;
  version?: string;
  acknowledgeClawHubRisk?: boolean;
}) {
  const { agentId, ...rest } = input;
  return requestJson<{ message?: string; warning?: string; slug?: string; version?: string }>(
    "/api/enterprise/admin/skills/install",
    {
      method: "POST",
      body: JSON.stringify({
        ...(agentId ? { agentId } : {}),
        ...rest,
      }),
    },
    "admin",
  );
}

export async function importAdminSkillFolder(input: {
  agentId?: string;
  folderName: string;
  files: Array<{ path: string; contentBase64: string }>;
}) {
  return requestJson<{ slug: string; message: string; warning?: string }>(
    "/api/enterprise/admin/skills/import",
    {
      method: "POST",
      body: JSON.stringify({
        ...(input.agentId ? { agentId: input.agentId } : {}),
        folderName: input.folderName,
        files: input.files,
      }),
    },
    "admin",
  );
}

function adminIdempotencyHeaders(): HeadersInit {
  return { "Idempotency-Key": crypto.randomUUID() };
}

export async function listAdminPluginRequests(): Promise<EnterprisePluginRequest[]> {
  const result = await requestEnterprisePortalJson<{ items: EnterprisePluginRequest[] }>(
    "/api/enterprise/admin/plugin-requests",
    undefined,
    "admin",
  );
  return result.items;
}

export async function listAdminCodexPluginRequests(): Promise<EnterpriseCodexPluginRequest[]> {
  const result = await requestEnterprisePortalJson<{ items: EnterpriseCodexPluginRequest[] }>(
    "/api/enterprise/admin/codex-plugin-requests",
    undefined,
    "admin",
  );
  return result.items;
}

export function loadAdminCodexPluginRequest(
  id: string,
): Promise<EnterpriseCodexPluginRequestDetail> {
  return requestEnterprisePortalJson(
    `/api/enterprise/admin/codex-plugin-requests/${encodeURIComponent(id)}`,
    undefined,
    "admin",
  );
}

export function approveAdminCodexPluginRequest(
  request: EnterpriseCodexPluginRequest,
  scope: EnterpriseExtensionGrantScope = request.scope,
): Promise<{
  request: EnterpriseCodexPluginRequest;
  grant: EnterpriseCodexPluginGrant | null;
  authRequired?: boolean;
  appsNeedingAuth?: Array<{ id: string; name: string; installUrl?: string | null }>;
  connectUrls?: string[];
  restartRequired?: boolean;
}> {
  return requestEnterprisePortalJson(
    `/api/enterprise/admin/codex-plugin-requests/${encodeURIComponent(request.id)}/approve`,
    {
      method: "POST",
      headers: adminIdempotencyHeaders(),
      body: JSON.stringify({ baseRevision: request.revision, scope }),
    },
    "admin",
  );
}

export function rejectAdminCodexPluginRequest(
  request: EnterpriseCodexPluginRequest,
  reason: string,
): Promise<{ request: EnterpriseCodexPluginRequest }> {
  return requestEnterprisePortalJson(
    `/api/enterprise/admin/codex-plugin-requests/${encodeURIComponent(request.id)}/reject`,
    {
      method: "POST",
      headers: adminIdempotencyHeaders(),
      body: JSON.stringify({ baseRevision: request.revision, reason }),
    },
    "admin",
  );
}

export function loadAdminPluginRequest(id: string): Promise<EnterprisePluginRequestDetail> {
  return requestEnterprisePortalJson(
    `/api/enterprise/admin/plugin-requests/${encodeURIComponent(id)}`,
    undefined,
    "admin",
  );
}

export function approveAdminPluginRequest(
  request: EnterprisePluginRequest,
  scope: EnterpriseExtensionGrantScope = request.scope,
): Promise<{
  request: EnterprisePluginRequest;
  grant: EnterprisePluginGrant | null;
  restartRequired: boolean;
}> {
  return requestEnterprisePortalJson(
    `/api/enterprise/admin/plugin-requests/${encodeURIComponent(request.id)}/approve`,
    {
      method: "POST",
      headers: adminIdempotencyHeaders(),
      body: JSON.stringify({ baseRevision: request.revision, scope }),
    },
    "admin",
  );
}

export function rejectAdminPluginRequest(
  request: EnterprisePluginRequest,
  reason: string,
): Promise<{ request: EnterprisePluginRequest }> {
  return requestEnterprisePortalJson(
    `/api/enterprise/admin/plugin-requests/${encodeURIComponent(request.id)}/reject`,
    {
      method: "POST",
      headers: adminIdempotencyHeaders(),
      body: JSON.stringify({ baseRevision: request.revision, reason }),
    },
    "admin",
  );
}

export function revokeAdminPluginGrant(
  grant: EnterprisePluginGrant,
): Promise<{ grant: EnterprisePluginGrant }> {
  return requestEnterprisePortalJson(
    `/api/enterprise/admin/plugin-grants/${encodeURIComponent(grant.id)}/revoke`,
    {
      method: "POST",
      headers: adminIdempotencyHeaders(),
      body: JSON.stringify({ baseRevision: grant.revision }),
    },
    "admin",
  );
}

export async function listAdminToolCatalog(filters: Record<string, string> = {}) {
  return requestJson<{ items: EnterpriseToolCatalogItem[]; catalogRevision: string }>(
    `/api/enterprise/admin/tools${queryString(filters)}`,
    undefined,
    "admin",
  );
}

export async function loadAdminModelContext(signal?: AbortSignal) {
  return requestJson<EnterpriseAdminModelContext>(
    "/api/enterprise/admin/models/context",
    signal ? { signal } : undefined,
    "admin",
  );
}

export async function requestAdminModelAction<T>(
  method: EnterpriseAdminModelMethod,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  return requestJson<T>(
    "/api/enterprise/admin/models/action",
    { method: "POST", body: JSON.stringify({ method, params }), ...(signal ? { signal } : {}) },
    "admin",
  );
}

export async function loadAdminResourceAccess(resourceType: string, resourceKey: string) {
  return requestJson<{ resourceKey: string; assignments: EnterpriseEntitlement[] }>(
    `/api/enterprise/admin/access${queryString({ resourceType, resourceKey })}`,
    undefined,
    "admin",
  );
}

export async function applyAdminAccessChanges(input: {
  changes: Array<{
    accountId: string;
    resourceType: "agent" | "skill" | "tool";
    resourceKey: string;
    effect: EnterpriseEntitlementEffect | null;
  }>;
  baseRevisions: Record<string, number>;
}) {
  return requestJson<{ policyRevisions: Record<string, number> }>(
    "/api/enterprise/admin/access/changes",
    { method: "POST", body: JSON.stringify(input) },
    "admin",
  );
}

export async function loadAdminConfig() {
  return requestJson<EnterpriseConfigSnapshot>("/api/enterprise/admin/config", undefined, "admin");
}
export async function validateAdminConfig(raw: string, baseHash: string) {
  return requestJson<EnterpriseConfigValidation>(
    "/api/enterprise/admin/config/validate",
    { method: "POST", body: JSON.stringify({ raw, baseHash }) },
    "admin",
  );
}
export async function applyAdminConfig(raw: string, baseHash: string) {
  return requestJson<{
    hash: string;
    changedPaths: string[];
    impact: "none" | "reload" | "restart";
  }>(
    "/api/enterprise/admin/config/apply",
    { method: "POST", body: JSON.stringify({ raw, baseHash, confirm: "APPLY" }) },
    "admin",
  );
}
export async function loadAdminConfigHistory() {
  return requestJson<{ backups: Array<Record<string, unknown>> }>(
    "/api/enterprise/admin/config/history",
    undefined,
    "admin",
  );
}
export async function rollbackAdminConfig(slot: number, baseHash: string) {
  return requestJson<{ hash: string }>(
    `/api/enterprise/admin/config/history/${slot}/rollback`,
    { method: "POST", body: JSON.stringify({ baseHash, confirm: "ROLLBACK" }) },
    "admin",
  );
}
export async function loadAdminAudit() {
  return requestJson<{ events: EnterpriseAuditEvent[] }>(
    "/api/enterprise/admin/audit?limit=200",
    undefined,
    "admin",
  );
}

// Legacy admin page adapters retained for one release.
export async function listEnterpriseAccounts(): Promise<EnterpriseAccount[]> {
  return (await listAdminAccounts()).accounts;
}
export async function createEnterpriseAccount(input: {
  username: string;
  displayName: string;
  initialPassword: string;
  role: EnterpriseAccountRole;
}): Promise<EnterpriseAccount> {
  return (
    await createAdminAccount({
      ...input,
      enabled: true,
      personalAgentEnabled: input.role === "employee",
      defaultAgentId: null,
      accessPresetKey: input.role === "employee" ? "basic@1" : "none",
    })
  ).account;
}
export async function loadEnterpriseAccount(accountId: string) {
  return loadAdminAccount(accountId);
}
export async function updateEnterpriseAccount(
  accountId: string,
  patch: Partial<EnterpriseAccount>,
) {
  return (await updateAdminAccount(accountId, patch)).account;
}
export async function resetEnterprisePassword(accountId: string, newPassword: string) {
  return resetAdminAccountPassword(accountId, newPassword);
}
export async function replaceEnterpriseEntitlements(
  accountId: string,
  entitlements: EnterpriseEntitlement[],
): Promise<EnterpriseEntitlement[]> {
  const detail = await loadAdminAccount(accountId);
  const previous = new Map(
    detail.entitlements.map((item) => [`${item.resourceType}:${item.resourceId}`, item]),
  );
  const next = new Map(
    entitlements.map((item) => [`${item.resourceType}:${item.resourceId}`, item]),
  );
  const changes = [
    ...entitlements.map((item) => ({
      accountId,
      resourceType: item.resourceType,
      resourceKey: item.resourceId,
      effect: item.effect,
    })),
    ...[...previous.values()]
      .filter((item) => !next.has(`${item.resourceType}:${item.resourceId}`))
      .map((item) => ({
        accountId,
        resourceType: item.resourceType,
        resourceKey: item.resourceId,
        effect: null,
      })),
  ];
  await applyAdminAccessChanges({
    changes,
    baseRevisions: { [accountId]: detail.account.policyRevision },
  });
  return (await loadAdminAccount(accountId)).entitlements;
}
