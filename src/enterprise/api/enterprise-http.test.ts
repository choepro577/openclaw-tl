import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ClawHubTrustErrorCodes,
  ErrorCodes,
} from "../../../packages/gateway-protocol/src/index.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount, updateEnterpriseAccount } from "../accounts/account-store.js";
import { ENTERPRISE_ADMIN_AUTH_COOKIE, ENTERPRISE_USER_AUTH_COOKIE } from "../auth/cookie.js";
import { hashEnterprisePassword } from "../auth/password.js";
import {
  listEnterpriseEntitlements,
  replaceEnterpriseEntitlements,
} from "../entitlements/entitlement-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { handleEnterpriseHttpRequest } from "./enterprise-http.js";

type MockSkillHandlerOptions = {
  params: Record<string, unknown>;
  respond: (ok: boolean, payload?: unknown, error?: Record<string, unknown>) => void;
};

const skillHandlerMocks = vi.hoisted(() => ({
  search: vi.fn(),
  detail: vi.fn(),
  install: vi.fn(),
}));

vi.mock("../../gateway/server-methods/skills.js", () => ({
  skillsHandlers: {
    "skills.search": skillHandlerMocks.search,
    "skills.detail": skillHandlerMocks.detail,
    "skills.install": skillHandlerMocks.install,
  },
}));

const ENTERPRISE_CONFIG: OpenClawConfig = {
  enterprise: { enabled: true },
  gateway: { auth: { mode: "accounts" } },
};

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

beforeEach(() => {
  skillHandlerMocks.search.mockReset();
  skillHandlerMocks.detail.mockReset();
  skillHandlerMocks.install.mockReset();
});

async function startEnterpriseServer(
  config: OpenClawConfig = ENTERPRISE_CONFIG,
  hooks: Parameters<typeof handleEnterpriseHttpRequest>[3] = {},
): Promise<{
  server: Server;
  baseUrl: string;
}> {
  const server = createServer((req, res) => {
    void handleEnterpriseHttpRequest(req, res, config, hooks)
      .then((handled) => {
        if (!handled && !res.writableEnded) {
          res.statusCode = 404;
          res.end();
        }
      })
      .catch((error: unknown) => {
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.end(String(error));
        }
      });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("TEST_SERVER_ADDRESS_UNAVAILABLE");
  }
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function apiRequest(
  baseUrl: string,
  path: string,
  options: { method?: string; body?: unknown; cookie?: string; csrf?: string } = {},
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      origin: baseUrl,
      "sec-fetch-site": "same-origin",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.csrf ? { "x-csrf-token": options.csrf } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

function cookieFrom(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("SET_COOKIE_MISSING");
  }
  return setCookie.split(";", 1)[0]!;
}

describe("Enterprise HTTP API", () => {
  it("keeps shared-Agent names and private files scoped to each authenticated account", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "relationship.admin",
        displayName: "Relationship Admin",
        passwordHash: await hashEnterprisePassword("admin-relationship-password"),
        role: "administrator",
        mustChangePassword: false,
      });
      const first = createEnterpriseAccount({
        username: "relationship.employee.first",
        displayName: "First Employee",
        passwordHash: await hashEnterprisePassword("first-relationship-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const second = createEnterpriseAccount({
        username: "relationship.employee.second",
        displayName: "Second Employee",
        passwordHash: await hashEnterprisePassword("second-relationship-password"),
        role: "employee",
        mustChangePassword: false,
      });
      for (const account of [first, second]) {
        replaceEnterpriseEntitlements(account.id, [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("research"),
            effect: "allow",
          },
        ]);
      }
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "research" } },
        gateway: { auth: { mode: "accounts" } },
        agents: { entries: { research: { name: "Research Agent" } } },
      };
      const { server, baseUrl } = await startEnterpriseServer(config);
      try {
        const firstLogin = await apiRequest(baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: {
            username: "relationship.employee.first",
            password: "first-relationship-password",
          },
        });
        const firstLoginBody = (await firstLogin.json()) as { csrfToken: string };
        const firstCookie = cookieFrom(firstLogin);
        const firstBootstrap = (await (
          await apiRequest(baseUrl, "/api/enterprise/user/v2/bootstrap", {
            cookie: firstCookie,
          })
        ).json()) as { agents: Array<Record<string, unknown>> };
        const shared = firstBootstrap.agents.find((agent) => agent.kind === "shared");
        const agentKey = String(shared?.key ?? "");
        expect(agentKey).toMatch(/^shared:/u);

        const saved = await apiRequest(
          baseUrl,
          `/api/enterprise/user/v2/shared-agents/${encodeURIComponent(agentKey)}/relationship`,
          {
            method: "PATCH",
            cookie: firstCookie,
            csrf: firstLoginBody.csrfToken,
            body: {
              baseRevision: 0,
              profile: {
                agentAlias: "Mây",
                agentSelfReference: "em",
                userAddress: "anh Minh",
                customInstructions: "Use a warm tone.",
              },
            },
          },
        );
        expect(saved.status).toBe(200);

        const refreshed = (await (
          await apiRequest(baseUrl, "/api/enterprise/user/v2/bootstrap", {
            cookie: firstCookie,
          })
        ).json()) as { agents: Array<Record<string, unknown>> };
        expect(refreshed.agents.find((agent) => agent.kind === "shared")).toMatchObject({
          name: "Mây",
          canonicalName: "Research Agent",
          relationship: { userAddress: "anh Minh", revision: 1 },
        });

        const secondLogin = await apiRequest(baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: {
            username: "relationship.employee.second",
            password: "second-relationship-password",
          },
        });
        const secondBootstrap = (await (
          await apiRequest(baseUrl, "/api/enterprise/user/v2/bootstrap", {
            cookie: cookieFrom(secondLogin),
          })
        ).json()) as { agents: Array<Record<string, unknown>> };
        expect(secondBootstrap.agents.find((agent) => agent.kind === "shared")).toMatchObject({
          name: "Research Agent",
          canonicalName: "Research Agent",
          relationship: { agentAlias: "", userAddress: "Second Employee", revision: 0 },
        });

        const adminLogin = await apiRequest(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          body: {
            username: "relationship.admin",
            password: "admin-relationship-password",
          },
        });
        const adminBody = (await adminLogin.json()) as { csrfToken: string };
        const adminCookie = cookieFrom(adminLogin);
        const panel = await apiRequest(
          baseUrl,
          "/api/enterprise/admin/agents/shared/research/relationships",
          { cookie: adminCookie },
        );
        expect(panel.status).toBe(200);
        const panelBody = (await panel.json()) as {
          relationship: { items: Array<Record<string, unknown>> };
        };
        expect(panelBody.relationship.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              accountId: first.id,
              effectiveName: "Mây",
              profile: expect.objectContaining({ userAddress: "anh Minh" }),
            }),
            expect.objectContaining({
              accountId: second.id,
              effectiveName: "Research Agent",
            }),
          ]),
        );

        const written = await apiRequest(
          baseUrl,
          `/api/enterprise/admin/agents/shared/research/relationships/${encodeURIComponent(first.id)}/files`,
          {
            method: "PUT",
            cookie: adminCookie,
            csrf: adminBody.csrfToken,
            body: { name: "MEMORY.md", content: "First account memory", baseRevision: null },
          },
        );
        expect(written.status).toBe(200);
        const secondFile = await apiRequest(
          baseUrl,
          `/api/enterprise/admin/agents/shared/research/relationships/${encodeURIComponent(second.id)}/files?name=MEMORY.md`,
          { cookie: adminCookie },
        );
        await expect(secondFile.json()).resolves.toMatchObject({
          accountId: second.id,
          file: { missing: true, content: "" },
        });
      } finally {
        await closeServer(server);
      }
    });
  });

  it("serves a sanitized owner-scoped User V2 profile and Knowledge contract", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "v2.admin",
        displayName: "V2 Admin",
        passwordHash: await hashEnterprisePassword("admin-password-v2"),
        role: "administrator",
        mustChangePassword: false,
      });
      createEnterpriseAccount({
        username: "v2.employee",
        displayName: "V2 Employee",
        passwordHash: await hashEnterprisePassword("employee-password-v2"),
        role: "employee",
        mustChangePassword: false,
      });
      createEnterpriseAccount({
        username: "v2.other",
        displayName: "Other Employee",
        passwordHash: await hashEnterprisePassword("other-password-v2"),
        role: "employee",
        mustChangePassword: false,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true, personalAgent: { templateAgentId: "main" } },
        gateway: { auth: { mode: "accounts" } },
        agents: { entries: { main: { name: "Template" } } },
      };
      const { server, baseUrl } = await startEnterpriseServer(config);
      try {
        const login = await apiRequest(baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: { username: "v2.employee", password: "employee-password-v2" },
        });
        const loginBody = (await login.json()) as {
          account: Record<string, unknown>;
          csrfToken: string;
        };
        expect(login.status).toBe(200);
        expect(loginBody.account).toEqual({
          username: "v2.employee",
          displayName: "V2 Employee",
          role: "employee",
          mustChangePassword: false,
          enabled: true,
          personalAgentEnabled: true,
        });
        const cookie = cookieFrom(login);

        const avatar = await apiRequest(baseUrl, "/api/enterprise/user/v2/account/avatar", {
          method: "PATCH",
          cookie,
          csrf: loginBody.csrfToken,
          body: {
            mime: "image/png",
            avatarBase64:
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          },
        });
        expect(avatar.status).toBe(200);
        const avatarBody = (await avatar.json()) as Record<string, unknown>;
        expect(Object.keys(avatarBody)).toEqual(["avatarRevision"]);

        const bootstrap = await apiRequest(baseUrl, "/api/enterprise/user/v2/bootstrap", {
          cookie,
        });
        const bootstrapBody = (await bootstrap.json()) as Record<string, unknown>;
        expect(bootstrap.status).toBe(200);
        expect(bootstrapBody).toMatchObject({
          schemaVersion: 2,
          defaultAgentKey: "personal",
          agents: [{ key: "personal", kind: "personal" }],
        });
        expect(JSON.stringify(bootstrapBody)).not.toMatch(
          /accountId|profileId|runtimeAgentId|workspace|provider|resourceKey|toolId|skillId/u,
        );

        const profileResponse = await apiRequest(
          baseUrl,
          "/api/enterprise/user/v2/personal-agent",
          { cookie },
        );
        const profile = ((await profileResponse.json()) as { profile: Record<string, unknown> })
          .profile;
        const saved = await apiRequest(baseUrl, "/api/enterprise/user/v2/personal-agent", {
          method: "PATCH",
          cookie,
          csrf: loginBody.csrfToken,
          body: {
            baseRevision: profile.revision,
            profile: {
              name: "My Enterprise Assistant",
              avatarPreset: "sparkles",
              greeting: "How can I help?",
              tone: "professional",
              responseLength: "balanced",
              language: "vi",
              customInstructions: "Lead with the result.",
              preferredName: "Employee",
              workContext: "Product delivery",
              preferences: "Use checklists",
            },
          },
        });
        expect(saved.status).toBe(200);
        await expect(saved.json()).resolves.toMatchObject({
          profile: { revision: 1, name: "My Enterprise Assistant" },
        });

        const created = await apiRequest(
          baseUrl,
          "/api/enterprise/user/v2/personal-agent/knowledge",
          {
            method: "POST",
            cookie,
            csrf: loginBody.csrfToken,
            body: {
              title: "Team glossary",
              kind: "note",
              sourceName: null,
              mimeType: null,
              content: "Falcon is the release train.",
            },
          },
        );
        expect(created.status).toBe(201);
        const knowledgeId = String(((await created.json()) as { item: { id: string } }).item.id);
        const duplicate = await apiRequest(
          baseUrl,
          "/api/enterprise/user/v2/personal-agent/knowledge",
          {
            method: "POST",
            cookie,
            csrf: loginBody.csrfToken,
            body: {
              title: "team GLOSSARY",
              kind: "note",
              sourceName: null,
              mimeType: null,
              content: "Duplicate title",
            },
          },
        );
        expect(duplicate.status).toBe(409);

        const otherLogin = await apiRequest(baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: { username: "v2.other", password: "other-password-v2" },
        });
        const otherBody = (await otherLogin.json()) as { csrfToken: string };
        const foreignDelete = await apiRequest(
          baseUrl,
          `/api/enterprise/user/v2/personal-agent/knowledge/${knowledgeId}`,
          {
            method: "DELETE",
            cookie: cookieFrom(otherLogin),
            csrf: otherBody.csrfToken,
            body: {},
          },
        );
        expect(foreignDelete.status).toBe(404);
      } finally {
        await closeServer(server);
      }
    });
  });

  it("logs in with a secure cookie, resolves me, and revokes logout", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "http.admin",
        displayName: "HTTP Admin",
        passwordHash: await hashEnterprisePassword("admin-password-1"),
        role: "administrator",
        mustChangePassword: false,
      });
      const { server, baseUrl } = await startEnterpriseServer();
      try {
        const login = await apiRequest(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          body: { username: "http.admin", password: "admin-password-1" },
        });
        expect(login.status).toBe(200);
        const loginBody = (await login.json()) as Record<string, unknown>;
        expect(loginBody).toHaveProperty("account");
        expect(JSON.stringify(loginBody)).not.toContain("token");

        const setCookie = login.headers.get("set-cookie") ?? "";
        expect(setCookie).toContain(`${ENTERPRISE_ADMIN_AUTH_COOKIE}=`);
        expect(setCookie).toContain("HttpOnly");
        expect(setCookie).toContain("Secure");
        expect(setCookie).toContain("SameSite=Lax");
        const cookie = cookieFrom(login);
        const csrf = String(loginBody.csrfToken);

        const me = await apiRequest(baseUrl, "/api/auth/admin/me", { cookie });
        expect(me.status).toBe(200);
        await expect(me.json()).resolves.toMatchObject({
          account: { username: "http.admin", role: "administrator" },
        });

        const policy = await apiRequest(baseUrl, "/api/enterprise/me/policy", { cookie });
        await expect(policy.json()).resolves.toMatchObject({
          defaultAgentId: resolveEnterprisePersonalAgentId(ENTERPRISE_CONFIG, account),
        });

        const logout = await apiRequest(baseUrl, "/api/auth/admin/logout", {
          method: "POST",
          body: {},
          cookie,
          csrf,
        });
        expect(logout.status).toBe(200);
        const revoked = await apiRequest(baseUrl, "/api/auth/admin/me", { cookie });
        expect(revoked.status).toBe(401);
      } finally {
        await closeServer(server);
      }
    });
  });

  it("enforces administrator APIs and persists deny-wins entitlements", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const adminAccount = createEnterpriseAccount({
        username: "policy.admin",
        displayName: "Policy Admin",
        passwordHash: await hashEnterprisePassword("admin-password-2"),
        role: "administrator",
        mustChangePassword: false,
        personalAgentEnabled: true,
      });
      const { server, baseUrl } = await startEnterpriseServer();
      try {
        const adminLogin = await apiRequest(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          body: { username: "policy.admin", password: "admin-password-2" },
        });
        const adminCookie = cookieFrom(adminLogin);
        const adminLoginBody = (await adminLogin.json()) as { csrfToken: string };
        const created = await apiRequest(baseUrl, "/api/enterprise/accounts", {
          method: "POST",
          cookie: adminCookie,
          body: {
            username: "policy.employee",
            displayName: "Policy Employee",
            initialPassword: "employee-password",
            role: "employee",
          },
        });
        expect(created.status).toBe(201);
        const createdBody = (await created.json()) as { account: { id: string } };
        const employeeAccountId = createdBody.account.id;

        const personalFiles = await apiRequest(
          baseUrl,
          `/api/enterprise/admin/agents/personal/${encodeURIComponent(adminAccount.id)}/files`,
          { cookie: adminCookie },
        );
        expect(personalFiles.status).toBe(200);

        const personalToolsBefore = await apiRequest(
          baseUrl,
          `/api/enterprise/admin/agents/personal/${encodeURIComponent(adminAccount.id)}/tools`,
          { cookie: adminCookie },
        );
        expect(personalToolsBefore.status).toBe(200);
        await expect(personalToolsBefore.json()).resolves.toMatchObject({
          editable: true,
          policyRevision: 0,
        });

        const personalToolsSaved = await apiRequest(
          baseUrl,
          `/api/enterprise/admin/agents/personal/${encodeURIComponent(adminAccount.id)}/tools`,
          {
            method: "PATCH",
            cookie: adminCookie,
            csrf: adminLoginBody.csrfToken,
            body: {
              profile: "full",
              alsoAllow: ["web_search"],
              deny: ["write"],
              baseRevision: 0,
            },
          },
        );
        expect(personalToolsSaved.status).toBe(200);
        await expect(personalToolsSaved.json()).resolves.toMatchObject({ policyRevision: 1 });

        const personalToolsAfter = await apiRequest(
          baseUrl,
          `/api/enterprise/admin/agents/personal/${encodeURIComponent(adminAccount.id)}/tools`,
          { cookie: adminCookie },
        );
        const personalToolsAfterBody = (await personalToolsAfter.json()) as Record<string, unknown>;
        expect(personalToolsAfterBody).toMatchObject({
          editable: true,
          policyRevision: 1,
          policy: {
            profile: "full",
            alsoAllow: ["web_search"],
            deny: expect.arrayContaining(["write"]),
          },
        });
        const effectiveTools = personalToolsAfterBody.effectiveTools as {
          groups?: Array<{ tools?: Array<{ id?: string }> }>;
        };
        const effectiveToolIds =
          effectiveTools.groups?.flatMap(
            (group) =>
              group.tools?.map((tool) => tool.id).filter((id): id is string => Boolean(id)) ?? [],
          ) ?? [];
        expect(effectiveToolIds).toContain("web_search");
        expect(effectiveToolIds).not.toContain("write");
        expect(effectiveToolIds).not.toContain("gateway");

        const entitlements = await apiRequest(
          baseUrl,
          `/api/enterprise/accounts/${encodeURIComponent(employeeAccountId)}/entitlements`,
          {
            method: "PUT",
            cookie: adminCookie,
            body: {
              entitlements: [
                { resourceType: "agent", resourceId: "agent:shared:research", effect: "allow" },
                { resourceType: "tool", resourceId: "tool:core:web_search", effect: "allow" },
                { resourceType: "tool", resourceId: "tool:core:exec", effect: "allow" },
                { resourceType: "tool", resourceId: "tool:core:exec", effect: "deny" },
              ],
            },
          },
        );
        expect(entitlements.status).toBe(200);

        const effective = await apiRequest(
          baseUrl,
          `/api/enterprise/accounts/${encodeURIComponent(employeeAccountId)}/effective-policy`,
          { cookie: adminCookie },
        );
        expect(effective.status).toBe(200);
        await expect(effective.json()).resolves.toMatchObject({
          entitlements: expect.arrayContaining([
            expect.objectContaining({
              resourceType: "agent",
              resourceId: "agent:shared:research",
              effect: "allow",
            }),
            expect.objectContaining({
              resourceType: "tool",
              resourceId: "tool:core:web_search",
              effect: "allow",
            }),
            expect.objectContaining({
              resourceType: "tool",
              resourceId: "tool:core:exec",
              effect: "deny",
            }),
          ]),
          employeeHardDeniedTools: expect.arrayContaining(["elevated", "gateway"]),
        });

        updateEnterpriseAccount(employeeAccountId, { mustChangePassword: false });
        const employeeLogin = await apiRequest(baseUrl, "/api/auth/login", {
          method: "POST",
          body: { username: "policy.employee", password: "employee-password" },
        });
        const employeeCookie = cookieFrom(employeeLogin);
        const forbidden = await apiRequest(baseUrl, "/api/enterprise/accounts", {
          cookie: employeeCookie,
        });
        expect(forbidden.status).toBe(401);
      } finally {
        await closeServer(server);
      }
    });
  });

  it("lets administrators use the user portal while keeping admin login administrator-only", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "dual.admin",
        displayName: "Dual Admin",
        passwordHash: await hashEnterprisePassword("admin-password-3"),
        role: "administrator",
        mustChangePassword: false,
      });
      createEnterpriseAccount({
        username: "dual.employee",
        displayName: "Dual Employee",
        passwordHash: await hashEnterprisePassword("employee-password-3"),
        role: "employee",
        mustChangePassword: false,
      });
      const { server, baseUrl } = await startEnterpriseServer();
      try {
        const wrongAdmin = await apiRequest(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          body: { username: "dual.employee", password: "employee-password-3" },
        });
        expect(wrongAdmin.status).toBe(401);
        expect(wrongAdmin.headers.get("set-cookie")).toBeNull();

        const adminUserLogin = await apiRequest(baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: { username: "dual.admin", password: "admin-password-3" },
        });
        expect(adminUserLogin.status).toBe(200);
        expect(adminUserLogin.headers.get("set-cookie")).toContain(ENTERPRISE_USER_AUTH_COOKIE);

        const adminLogin = await apiRequest(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          body: { username: "dual.admin", password: "admin-password-3" },
        });
        const userLogin = await apiRequest(baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: { username: "dual.employee", password: "employee-password-3" },
        });
        expect(adminLogin.headers.get("set-cookie")).toContain(ENTERPRISE_ADMIN_AUTH_COOKIE);
        expect(userLogin.headers.get("set-cookie")).toContain(ENTERPRISE_USER_AUTH_COOKIE);
        const adminUserCookie = cookieFrom(adminUserLogin);
        await expect(
          (
            await apiRequest(baseUrl, "/api/auth/user/me", {
              cookie: adminUserCookie,
            })
          ).json(),
        ).resolves.toMatchObject({
          account: { username: "dual.admin", role: "administrator" },
        });
        expect(
          (
            await apiRequest(baseUrl, "/api/enterprise/user/me/capabilities", {
              cookie: adminUserCookie,
            })
          ).status,
        ).toBe(200);
        expect(
          (
            await apiRequest(baseUrl, "/api/auth/admin/me", {
              cookie: adminUserCookie,
            })
          ).status,
        ).toBe(401);
        expect(
          (
            await apiRequest(baseUrl, "/api/auth/admin/me", {
              cookie: cookieFrom(adminLogin),
            })
          ).status,
        ).toBe(200);
        expect(
          (
            await apiRequest(baseUrl, "/api/auth/user/me", {
              cookie: cookieFrom(userLogin),
            })
          ).status,
        ).toBe(200);
      } finally {
        await closeServer(server);
      }
    });
  });

  it("requires a session-bound CSRF token for new admin mutations", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "csrf.admin",
        displayName: "CSRF Admin",
        passwordHash: await hashEnterprisePassword("admin-password-4"),
        role: "administrator",
        mustChangePassword: false,
      });
      const { server, baseUrl } = await startEnterpriseServer();
      try {
        const login = await apiRequest(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          body: { username: "csrf.admin", password: "admin-password-4" },
        });
        const body = (await login.json()) as { csrfToken: string };
        const cookie = cookieFrom(login);
        const denied = await apiRequest(baseUrl, "/api/enterprise/admin/accounts", {
          method: "POST",
          cookie,
          body: {
            username: "csrf.employee.denied",
            displayName: "Denied",
            initialPassword: "employee-password-4",
            role: "employee",
          },
        });
        expect(denied.status).toBe(403);

        const invalidUsername = await apiRequest(baseUrl, "/api/enterprise/admin/accounts", {
          method: "POST",
          cookie,
          csrf: body.csrfToken,
          body: {
            username: "csrf.hiếu",
            displayName: "Invalid Username",
            initialPassword: "employee-password-4",
            role: "employee",
          },
        });
        expect(invalidUsername.status).toBe(400);
        await expect(invalidUsername.json()).resolves.toMatchObject({
          code: "VALIDATION_ERROR",
          message:
            "Username chỉ gồm chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.",
        });

        const created = await apiRequest(baseUrl, "/api/enterprise/admin/accounts", {
          method: "POST",
          cookie,
          csrf: body.csrfToken,
          body: {
            username: "csrf.employee",
            displayName: "CSRF Employee",
            initialPassword: "employee-password-4",
            role: "employee",
            accessPresetKey: "standard-coding@1",
          },
        });
        expect(created.status).toBe(201);
        await expect(created.json()).resolves.toMatchObject({
          account: {
            username: "csrf.employee",
            mustChangePassword: true,
            accessPresetKey: "standard-coding@1",
          },
        });
      } finally {
        await closeServer(server);
      }
    });
  });

  it("grants an employee access to the shared agent selected as their default", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "default-agent.admin",
        displayName: "Default Agent Admin",
        passwordHash: await hashEnterprisePassword("admin-password-5"),
        role: "administrator",
        mustChangePassword: false,
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true },
        gateway: { auth: { mode: "accounts" } },
        agents: { entries: { finance: { name: "Finance Agent" } } },
      };
      const { server, baseUrl } = await startEnterpriseServer(config);
      try {
        const login = await apiRequest(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          body: { username: "default-agent.admin", password: "admin-password-5" },
        });
        const loginBody = (await login.json()) as { csrfToken: string };
        const created = await apiRequest(baseUrl, "/api/enterprise/admin/accounts", {
          method: "POST",
          cookie: cookieFrom(login),
          csrf: loginBody.csrfToken,
          body: {
            username: "default-agent.employee",
            displayName: "Default Agent Employee",
            initialPassword: "employee-password-5",
            role: "employee",
            personalAgentEnabled: false,
            defaultAgentId: "finance",
          },
        });

        expect(created.status).toBe(201);
        const createdBody = (await created.json()) as { account: { id: string } };
        expect(listEnterpriseEntitlements(createdBody.account.id)).toContainEqual(
          expect.objectContaining({
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("finance"),
            effect: "allow",
          }),
        );
      } finally {
        await closeServer(server);
      }
    });
  });

  it("reuses Gateway ClawHub handlers and preserves risk acknowledgement details", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "skills.admin",
        displayName: "Skills Admin",
        passwordHash: await hashEnterprisePassword("admin-password-5"),
        role: "administrator",
        mustChangePassword: false,
      });
      skillHandlerMocks.search.mockImplementation(
        ({ params, respond }: MockSkillHandlerOptions) => {
          respond(true, {
            results: [{ slug: "github", installRef: "@openclaw/github", displayName: "GitHub" }],
            params,
          });
        },
      );
      skillHandlerMocks.detail.mockImplementation(
        ({ params, respond }: MockSkillHandlerOptions) => {
          respond(true, { skill: { slug: params.slug, displayName: "GitHub" } });
        },
      );
      skillHandlerMocks.install.mockImplementation(
        ({ params, respond }: MockSkillHandlerOptions) => {
          respond(false, undefined, {
            code: ErrorCodes.UNAVAILABLE,
            message: "Review required",
            details: {
              clawhubTrustCode: ClawHubTrustErrorCodes.RISK_ACKNOWLEDGEMENT_REQUIRED,
              version: "1.2.3",
              warning: "Suspicious behavior was detected.",
            },
          });
          expect(params).toMatchObject({
            source: "clawhub",
            slug: "@openclaw/github",
            agentId: "main",
          });
        },
      );
      const { server, baseUrl } = await startEnterpriseServer(
        { ...ENTERPRISE_CONFIG, agents: { entries: { main: {} } } },
        {
          getGatewayContext: () => ({}) as GatewayRequestContext,
        },
      );
      try {
        const login = await apiRequest(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          body: { username: "skills.admin", password: "admin-password-5" },
        });
        const loginBody = (await login.json()) as { csrfToken: string };
        const cookie = cookieFrom(login);

        const search = await apiRequest(
          baseUrl,
          "/api/enterprise/admin/skills/search?query=github",
          { cookie },
        );
        expect(search.status).toBe(200);
        await expect(search.json()).resolves.toMatchObject({
          results: [{ installRef: "@openclaw/github" }],
          params: { query: "github", limit: 20 },
        });

        const detail = await apiRequest(
          baseUrl,
          "/api/enterprise/admin/skills/detail?ref=%40openclaw%2Fgithub",
          { cookie },
        );
        expect(detail.status).toBe(200);
        expect(skillHandlerMocks.detail).toHaveBeenCalledOnce();

        const install = await apiRequest(baseUrl, "/api/enterprise/admin/skills/install", {
          method: "POST",
          cookie,
          csrf: loginBody.csrfToken,
          body: { agentId: "main", ref: "@openclaw/github" },
        });
        expect(install.status).toBe(409);
        await expect(install.json()).resolves.toMatchObject({
          code: ErrorCodes.UNAVAILABLE,
          message: "Review required",
          details: {
            clawhubTrustCode: ClawHubTrustErrorCodes.RISK_ACKNOWLEDGEMENT_REQUIRED,
            version: "1.2.3",
            warning: "Suspicious behavior was detected.",
          },
        });
        skillHandlerMocks.install.mockImplementation(
          ({ params, respond }: MockSkillHandlerOptions) => {
            expect(params).toMatchObject({
              source: "clawhub",
              scope: "global",
              slug: "@openclaw/github",
            });
            expect(params).not.toHaveProperty("agentId");
            respond(true, { ok: true, slug: "github" });
          },
        );
        const globalInstall = await apiRequest(baseUrl, "/api/enterprise/admin/skills/install", {
          method: "POST",
          cookie,
          csrf: loginBody.csrfToken,
          body: { ref: "@openclaw/github" },
        });
        expect(globalInstall.status).toBe(200);
        const folderImport = await apiRequest(baseUrl, "/api/enterprise/admin/skills/import", {
          method: "POST",
          cookie,
          body: { folderName: "example", files: [] },
        });
        expect(folderImport.status).toBe(403);
        const invalidFolder = await apiRequest(baseUrl, "/api/enterprise/admin/skills/import", {
          method: "POST",
          cookie,
          csrf: loginBody.csrfToken,
          body: { folderName: "example", files: [] },
        });
        expect(invalidFolder.status).toBe(400);
      } finally {
        await closeServer(server);
      }
    });
  });

  it("isolates Admin Models behind shared-agent scope, CSRF, origin, and a fixed method allowlist", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "models.admin",
        displayName: "Models Admin",
        passwordHash: await hashEnterprisePassword("admin-password-models"),
        role: "administrator",
        mustChangePassword: false,
      });
      const modelConfig: OpenClawConfig = {
        ...ENTERPRISE_CONFIG,
        agents: {
          entries: {
            main: { name: "Main" },
            research: { name: "Research" },
            openclaw: { name: "System" },
          },
        },
      };
      const gatewayContext = {
        getRuntimeConfig: () => modelConfig,
      } as GatewayRequestContext;
      const { server, baseUrl } = await startEnterpriseServer(modelConfig, {
        getGatewayContext: () => gatewayContext,
      });
      try {
        const login = await apiRequest(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          body: { username: "models.admin", password: "admin-password-models" },
        });
        const loginBody = (await login.json()) as { csrfToken: string };
        const cookie = cookieFrom(login);

        const context = await apiRequest(baseUrl, "/api/enterprise/admin/models/context", {
          cookie,
        });
        expect(context.status).toBe(200);
        await expect(context.json()).resolves.toMatchObject({
          agents: {
            defaultId: "main",
            agents: [{ id: "main" }, { id: "research" }],
          },
          methods: expect.arrayContaining(["models.list", "openclaw.setup.activate"]),
        });

        const missingCsrf = await apiRequest(baseUrl, "/api/enterprise/admin/models/action", {
          method: "POST",
          cookie,
          body: { method: "models.list", params: { agentId: "main" } },
        });
        expect(missingCsrf.status).toBe(403);

        const unsupported = await apiRequest(baseUrl, "/api/enterprise/admin/models/action", {
          method: "POST",
          cookie,
          csrf: loginBody.csrfToken,
          body: { method: "gateway.restart", params: {} },
        });
        expect(unsupported.status).toBe(400);
        await expect(unsupported.json()).resolves.toMatchObject({
          code: "MODEL_METHOD_UNSUPPORTED",
        });

        const personalAgent = await apiRequest(baseUrl, "/api/enterprise/admin/models/action", {
          method: "POST",
          cookie,
          csrf: loginBody.csrfToken,
          body: { method: "models.list", params: { agentId: "personal-user" } },
        });
        expect(personalAgent.status).toBe(403);

        const secret = "must-never-be-returned";
        const outOfScopePatch = await apiRequest(baseUrl, "/api/enterprise/admin/models/action", {
          method: "POST",
          cookie,
          csrf: loginBody.csrfToken,
          body: {
            method: "config.patch",
            params: { raw: JSON.stringify({ gateway: { auth: { token: secret } } }) },
          },
        });
        expect(outOfScopePatch.status).toBe(403);
        expect(await outOfScopePatch.text()).not.toContain(secret);

        const wrongOrigin = await fetch(`${baseUrl}/api/enterprise/admin/models/action`, {
          method: "POST",
          headers: {
            origin: "https://attacker.invalid",
            "sec-fetch-site": "cross-site",
            "content-type": "application/json",
            cookie,
            "x-csrf-token": loginBody.csrfToken,
          },
          body: JSON.stringify({ method: "models.list", params: { agentId: "main" } }),
        });
        expect(wrongOrigin.status).toBe(403);

        const audit = await apiRequest(baseUrl, "/api/enterprise/admin/audit?limit=20", { cookie });
        expect(JSON.stringify(await audit.json())).not.toContain(secret);
      } finally {
        await closeServer(server);
      }
    });
  });

  it("does not claim Enterprise routes when the feature flag is disabled", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const { server, baseUrl } = await startEnterpriseServer({ enterprise: { enabled: false } });
      try {
        const response = await apiRequest(baseUrl, "/api/enterprise/status");
        expect(response.status).toBe(404);
      } finally {
        await closeServer(server);
      }
    });
  });

  it("secures delegation settings, rejects looser overrides, and blocks unknown grants", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "delegation.api.admin",
        displayName: "Delegation API Admin",
        passwordHash: await hashEnterprisePassword("delegation-admin-password"),
        role: "administrator",
        mustChangePassword: false,
      });
      const employee = createEnterpriseAccount({
        username: "delegation.api.employee",
        displayName: "Delegation API Employee",
        passwordHash: await hashEnterprisePassword("delegation-employee-password"),
        role: "employee",
        mustChangePassword: false,
        initialEntitlements: [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("contracts"),
            effect: "allow",
          },
        ],
      });
      const config: OpenClawConfig = {
        enterprise: { enabled: true },
        gateway: { auth: { mode: "accounts" } },
        agents: {
          entries: {
            contracts: {
              name: "Agent Hợp đồng",
              description:
                "Chuyên kiểm tra điều khoản, rủi ro và nghĩa vụ trong hợp đồng doanh nghiệp.",
              delegationTarget: {
                status: "active",
                aliases: ["chuyên gia hợp đồng"],
                handlingMode: "explicit_only",
                useWhen: [
                  "Kiểm tra điều khoản phạt trong hợp đồng",
                  "Đánh giá rủi ro trước khi ký hợp đồng",
                ],
                avoidWhen: [],
                requiredInputs: [],
              },
            },
          },
        },
      };
      let routerModelAvailable = true;
      const gatewayContext = {
        loadGatewayModelCatalog: async () =>
          routerModelAvailable ? [{ provider: "test", id: "router", name: "Test Router" }] : [],
      } as unknown as GatewayRequestContext;
      const { server, baseUrl } = await startEnterpriseServer(config, {
        getGatewayContext: () => gatewayContext,
      });
      try {
        const login = await apiRequest(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          body: { username: "delegation.api.admin", password: "delegation-admin-password" },
        });
        const cookie = cookieFrom(login);
        const loginBody = (await login.json()) as { csrfToken: string };

        const settings = await apiRequest(baseUrl, "/api/enterprise/admin/delegation/settings", {
          cookie,
        });
        await expect(settings.json()).resolves.toMatchObject({
          policy: { rollout: "off", revision: 0 },
          availableModels: ["test/router"],
        });

        const noCsrf = await apiRequest(baseUrl, "/api/enterprise/admin/delegation/settings", {
          method: "PATCH",
          cookie,
          body: {
            baseRevision: 0,
            rollout: "shadow",
            routerModel: "test/router",
            autoThreshold: 0.9,
            clarifyThreshold: 0.7,
            minimumMargin: 0.15,
            maxDelegatesPerTurn: 3,
            eventRetentionDays: 90,
          },
        });
        expect(noCsrf.status).toBe(403);

        const saved = await apiRequest(baseUrl, "/api/enterprise/admin/delegation/settings", {
          method: "PATCH",
          cookie,
          csrf: loginBody.csrfToken,
          body: {
            baseRevision: 0,
            rollout: "shadow",
            routerModel: "test/router",
            autoThreshold: 0.9,
            clarifyThreshold: 0.7,
            minimumMargin: 0.15,
            maxDelegatesPerTurn: 3,
            eventRetentionDays: 90,
          },
        });
        expect(saved.status).toBe(200);
        await expect(saved.json()).resolves.toMatchObject({ policy: { revision: 1 } });

        const invalidEventFilter = await apiRequest(
          baseUrl,
          "/api/enterprise/admin/delegation/events?outcome=unknown",
          { cookie },
        );
        expect(invalidEventFilter.status).toBe(400);
        await expect(invalidEventFilter.json()).resolves.toMatchObject({
          code: "VALIDATION_ERROR",
        });

        const previewResponse = await apiRequest(
          baseUrl,
          "/api/enterprise/admin/delegation/activation-preview",
          { method: "POST", cookie, csrf: loginBody.csrfToken, body: {} },
        );
        expect(previewResponse.status).toBe(200);
        const preview = (await previewResponse.json()) as { previewToken: string };
        routerModelAvailable = false;
        const unavailableActivation = await apiRequest(
          baseUrl,
          "/api/enterprise/admin/delegation/activate",
          {
            method: "POST",
            cookie,
            csrf: loginBody.csrfToken,
            body: { previewToken: preview.previewToken, exclusions: [] },
          },
        );
        expect(unavailableActivation.status).toBe(400);
        await expect(unavailableActivation.json()).resolves.toMatchObject({
          code: "DELEGATION_ROUTER_MODEL_UNAVAILABLE",
        });
        routerModelAvailable = true;

        const looser = await apiRequest(
          baseUrl,
          `/api/enterprise/admin/accounts/${employee.id}/delegation`,
          {
            method: "PATCH",
            cookie,
            csrf: loginBody.csrfToken,
            body: {
              agentResourceKey: sharedAgentResourceKey("contracts"),
              mode: "confirm_before_handoff",
              baseRevision: 0,
              baseAccountPolicyRevision: employee.policyRevision,
            },
          },
        );
        expect(looser.status).toBe(400);
        await expect(looser.json()).resolves.toMatchObject({
          code: "DELEGATION_OVERRIDE_CANNOT_LOOSEN",
        });

        const disabled = await apiRequest(
          baseUrl,
          `/api/enterprise/admin/accounts/${employee.id}/delegation`,
          {
            method: "PATCH",
            cookie,
            csrf: loginBody.csrfToken,
            body: {
              agentResourceKey: sharedAgentResourceKey("contracts"),
              mode: "disabled",
              baseRevision: 0,
              baseAccountPolicyRevision: employee.policyRevision,
            },
          },
        );
        expect(disabled.status).toBe(200);

        const unknownGrant = await apiRequest(baseUrl, "/api/enterprise/admin/access/changes", {
          method: "POST",
          cookie,
          csrf: loginBody.csrfToken,
          body: {
            changes: [
              {
                accountId: employee.id,
                resourceType: "agent",
                resourceKey: "agent:shared:deleted-agent",
                effect: "allow",
              },
            ],
            baseRevisions: { [employee.id]: employee.policyRevision + 1 },
          },
        });
        expect(unknownGrant.status).toBe(400);
        expect(
          listEnterpriseEntitlements(employee.id).some(
            (item) => item.resourceId === "agent:shared:deleted-agent",
          ),
        ).toBe(false);
      } finally {
        await closeServer(server);
      }
    });
  });
});

it("serves preset metadata and applies/reapplies basic through the authenticated HTTP API", async () => {
  await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
    createEnterpriseAccount({
      username: "preset.admin",
      displayName: "Admin",
      passwordHash: await hashEnterprisePassword("preset-admin-password"),
      role: "administrator",
      mustChangePassword: false,
    });
    const { server, baseUrl } = await startEnterpriseServer();
    try {
      const login = await apiRequest(baseUrl, "/api/auth/admin/login", {
        method: "POST",
        body: { username: "preset.admin", password: "preset-admin-password" },
      });
      const { csrfToken } = (await login.json()) as { csrfToken: string };
      const cookie = cookieFrom(login);
      const listing = await apiRequest(baseUrl, "/api/enterprise/admin/accounts", { cookie });
      const catalog = (await listing.json()) as {
        accessPresets: Array<{ key: string; toolIds: string[] }>;
      };
      expect(
        catalog.accessPresets.find((preset) => preset.key === "basic@1")?.toolIds,
      ).toHaveLength(32);
      const response = await apiRequest(baseUrl, "/api/enterprise/admin/accounts", {
        method: "POST",
        cookie,
        csrf: csrfToken,
        body: {
          username: "preset.employee",
          displayName: "Employee",
          initialPassword: "preset-employee-password",
          role: "employee",
        },
      });
      expect(response.status).toBe(201);
      const { account } = (await response.json()) as {
        account: { id: string; accessPresetKey: string; policyRevision: number };
      };
      expect(account.accessPresetKey).toBe("basic@1");
      const { readEnterpriseAccountToolPolicy, writeEnterpriseAccountToolPolicy } =
        await import("../accounts/account-tool-policy-store.js");
      writeEnterpriseAccountToolPolicy(account.id, 0, {
        profile: "coding",
        alsoAllow: [],
        deny: ["browser"],
      });
      const endpoint = `/api/enterprise/admin/accounts/${account.id}`;
      expect(
        (
          await apiRequest(baseUrl, endpoint, {
            method: "PATCH",
            cookie,
            csrf: csrfToken,
            body: { displayName: "Renamed", accessPresetKey: "basic@1" },
          })
        ).status,
      ).toBe(200);
      expect(readEnterpriseAccountToolPolicy(account.id).deny).toContain("browser");
      expect(
        (
          await apiRequest(baseUrl, endpoint, {
            method: "PATCH",
            cookie,
            csrf: csrfToken,
            body: { applyAccessPreset: true },
          })
        ).status,
      ).toBe(200);
      expect(readEnterpriseAccountToolPolicy(account.id).deny).not.toContain("browser");
      const invalid = await apiRequest(baseUrl, endpoint, {
        method: "PATCH",
        cookie,
        csrf: csrfToken,
        body: { applyAccessPreset: "yes" },
      });
      expect(invalid.status).toBe(400);
    } finally {
      await closeServer(server);
    }
  });
});
