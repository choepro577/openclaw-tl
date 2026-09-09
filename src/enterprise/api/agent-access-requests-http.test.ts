import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount, getEnterpriseAccountById } from "../accounts/account-store.js";
import { hashEnterprisePassword } from "../auth/password.js";
import { applyEnterpriseAccessChanges } from "../entitlements/entitlement-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import { enterpriseSharedAgentKey } from "../user/user-agent-key.js";
import type { AgentKey } from "../user/user-api-contracts.js";
import { resolveEnterpriseUserRuntimeAgentId } from "../user/user-gateway-client.js";
import { handleEnterpriseHttpRequest } from "./enterprise-http.js";

type Auth = { cookie: string; csrf: string };

type AccessConfig = OpenClawConfig & {
  agents: NonNullable<OpenClawConfig["agents"]>;
};

const USER_REQUESTS_PATH = "/api/enterprise/user/v2/agent-access-requests";
const ADMIN_REQUESTS_PATH = "/api/enterprise/admin/agent-access-requests";

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

async function startEnterpriseServer(
  config: OpenClawConfig,
  getGatewayContext?: () => GatewayRequestContext | undefined,
): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((req, res) => {
    void handleEnterpriseHttpRequest(req, res, config, { getGatewayContext })
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

async function login(
  baseUrl: string,
  audience: "admin" | "user",
  username: string,
  password: string,
): Promise<Auth> {
  const response = await apiRequest(baseUrl, `/api/auth/${audience}/login`, {
    method: "POST",
    body: { username, password },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { csrfToken: string };
  return { cookie: cookieFrom(response), csrf: body.csrfToken };
}

async function createFixture(): Promise<{
  config: AccessConfig;
  agentKey: AgentKey;
  adminUsername: string;
  adminPassword: string;
  firstUsername: string;
  firstPassword: string;
  secondUsername: string;
  secondPassword: string;
}> {
  const adminUsername = "access-review.admin";
  const adminPassword = "access-review-admin-password";
  const firstUsername = "access-review.first";
  const firstPassword = "access-review-first-password";
  const secondUsername = "access-review.second";
  const secondPassword = "access-review-second-password";
  createEnterpriseAccount({
    username: adminUsername,
    displayName: "Access Review Admin",
    passwordHash: await hashEnterprisePassword(adminPassword),
    role: "administrator",
    mustChangePassword: false,
  });
  createEnterpriseAccount({
    username: firstUsername,
    displayName: "First Employee",
    passwordHash: await hashEnterprisePassword(firstPassword),
    role: "employee",
    mustChangePassword: false,
  });
  createEnterpriseAccount({
    username: secondUsername,
    displayName: "Second Employee",
    passwordHash: await hashEnterprisePassword(secondPassword),
    role: "employee",
    mustChangePassword: false,
  });
  const config = {
    enterprise: { enabled: true },
    gateway: { auth: { mode: "accounts" } },
    agents: { entries: { research: { name: "Research Agent", description: "Shared research" } } },
  } satisfies AccessConfig;
  const agentKey = enterpriseSharedAgentKey(sharedAgentResourceKey("research"));
  return {
    config,
    agentKey,
    adminUsername,
    adminPassword,
    firstUsername,
    firstPassword,
    secondUsername,
    secondPassword,
  };
}

describe("Enterprise shared-agent access request HTTP API", () => {
  it("keeps request history account-scoped and blocks chat before approval", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const fixture = await createFixture();
      await state.writeConfig(fixture.config);
      const { server, baseUrl } = await startEnterpriseServer(
        fixture.config,
        () => ({ getRuntimeConfig: () => fixture.config }) as GatewayRequestContext,
      );
      try {
        expect((await apiRequest(baseUrl, USER_REQUESTS_PATH)).status).toBe(401);

        const firstAuth = await login(
          baseUrl,
          "user",
          fixture.firstUsername,
          fixture.firstPassword,
        );
        const secondAuth = await login(
          baseUrl,
          "user",
          fixture.secondUsername,
          fixture.secondPassword,
        );
        const adminAuth = await login(
          baseUrl,
          "admin",
          fixture.adminUsername,
          fixture.adminPassword,
        );

        const missingCsrf = await apiRequest(baseUrl, USER_REQUESTS_PATH, {
          method: "POST",
          cookie: firstAuth.cookie,
          body: { agentKey: fixture.agentKey },
        });
        expect(missingCsrf.status).toBe(403);

        const created = await apiRequest(baseUrl, USER_REQUESTS_PATH, {
          method: "POST",
          cookie: firstAuth.cookie,
          csrf: firstAuth.csrf,
          body: { agentKey: fixture.agentKey },
        });
        expect(created.status).toBe(201);
        const createdBody = (await created.json()) as {
          request: { id: string; agentKey: string; state: string; revision: number };
        };
        expect(createdBody.request).toMatchObject({
          agentKey: fixture.agentKey,
          state: "pending",
          revision: 1,
        });

        const duplicate = await apiRequest(baseUrl, USER_REQUESTS_PATH, {
          method: "POST",
          cookie: firstAuth.cookie,
          csrf: firstAuth.csrf,
          body: { agentKey: fixture.agentKey },
        });
        expect(duplicate.status).toBe(200);
        expect((await duplicate.json()).request.id).toBe(createdBody.request.id);

        await expect(
          (
            await apiRequest(baseUrl, USER_REQUESTS_PATH, {
              cookie: secondAuth.cookie,
            })
          ).json(),
        ).resolves.toEqual({ items: [] });

        const adminList = await apiRequest(baseUrl, ADMIN_REQUESTS_PATH, {
          cookie: adminAuth.cookie,
        });
        expect(adminList.status).toBe(200);
        await expect(adminList.json()).resolves.toMatchObject({
          items: [
            {
              id: createdBody.request.id,
              requester: {
                username: fixture.firstUsername,
                displayName: "First Employee",
              },
              agent: {
                agentId: "research",
                name: "Research Agent",
                description: "Shared research",
              },
            },
          ],
        });

        const employeeAdminList = await apiRequest(baseUrl, ADMIN_REQUESTS_PATH, {
          cookie: firstAuth.cookie,
        });
        expect(employeeAdminList.status).toBe(401);

        const bootstrap = await apiRequest(baseUrl, "/api/enterprise/user/v2/bootstrap", {
          cookie: firstAuth.cookie,
        });
        expect(bootstrap.status).toBe(200);
        const bootstrapBody = (await bootstrap.json()) as {
          agents: Array<Record<string, unknown>>;
        };
        const shared = bootstrapBody.agents.find((agent) => agent.key === fixture.agentKey);
        expect(shared).toMatchObject({
          kind: "shared",
          access: {
            allowed: false,
            request: {
              id: createdBody.request.id,
              agentKey: fixture.agentKey,
              state: "pending",
            },
          },
          actions: { canChat: false, canSchedule: false },
        });
        expect(
          (shared?.access as { request?: Record<string, unknown> } | undefined)?.request,
        ).not.toHaveProperty("requesterAccountId");

        const project = await apiRequest(baseUrl, "/api/enterprise/user/v2/conversation-projects", {
          method: "POST",
          cookie: firstAuth.cookie,
          csrf: firstAuth.csrf,
          body: { name: "Access request smoke", idempotencyKey: "access-request-smoke" },
        });
        expect(project.status).toBe(201);
        const projectId = ((await project.json()) as { project: { id: string } }).project.id;
        const deniedChat = await apiRequest(baseUrl, "/api/enterprise/user/v2/conversations/open", {
          method: "POST",
          cookie: firstAuth.cookie,
          csrf: firstAuth.csrf,
          body: {
            agentKey: fixture.agentKey,
            mode: "new",
            clientRequestId: "access-request-denied-chat",
            projectId,
          },
        });
        expect(deniedChat.status).toBe(404);
        await expect(deniedChat.json()).resolves.toMatchObject({ code: "AGENT_NOT_FOUND" });
      } finally {
        await closeServer(server);
      }
    });
  });

  it("approves access atomically, reflects it in bootstrap, and supports reject/resubmit/cancel CAS", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const fixture = await createFixture();
      await state.writeConfig(fixture.config);
      const { server, baseUrl } = await startEnterpriseServer(fixture.config);
      try {
        const firstAuth = await login(
          baseUrl,
          "user",
          fixture.firstUsername,
          fixture.firstPassword,
        );
        const adminAuth = await login(
          baseUrl,
          "admin",
          fixture.adminUsername,
          fixture.adminPassword,
        );

        const firstRequest = await apiRequest(baseUrl, USER_REQUESTS_PATH, {
          method: "POST",
          cookie: firstAuth.cookie,
          csrf: firstAuth.csrf,
          body: { agentKey: fixture.agentKey },
        });
        const firstRequestBody = (await firstRequest.json()) as {
          request: { id: string; revision: number };
        };
        const requestId = firstRequestBody.request.id;

        const detail = await apiRequest(baseUrl, `${ADMIN_REQUESTS_PATH}/${requestId}`, {
          cookie: adminAuth.cookie,
        });
        expect(detail.status).toBe(200);
        await expect(detail.json()).resolves.toMatchObject({
          request: { id: requestId, state: "pending" },
          account: { username: fixture.firstUsername },
          agent: { agentId: "research" },
          entitlement: null,
        });

        const missingCsrf = await apiRequest(
          baseUrl,
          `${ADMIN_REQUESTS_PATH}/${requestId}/approve`,
          {
            method: "POST",
            cookie: adminAuth.cookie,
            body: { baseRevision: 1 },
          },
        );
        expect(missingCsrf.status).toBe(403);

        const approved = await apiRequest(baseUrl, `${ADMIN_REQUESTS_PATH}/${requestId}/approve`, {
          method: "POST",
          cookie: adminAuth.cookie,
          csrf: adminAuth.csrf,
          body: { baseRevision: firstRequestBody.request.revision },
        });
        expect(approved.status).toBe(200);
        const approvedBody = (await approved.json()) as { entitlement: { accountId: string } };
        expect(approvedBody).toMatchObject({
          request: { id: requestId, state: "approved", revision: 2 },
          entitlement: {
            accountId: expect.any(String),
            resourceType: "agent",
            resourceId: "agent:shared:research",
            resourceState: "active",
            effect: "allow",
          },
        });

        const replayApprove = await apiRequest(
          baseUrl,
          `${ADMIN_REQUESTS_PATH}/${requestId}/approve`,
          {
            method: "POST",
            cookie: adminAuth.cookie,
            csrf: adminAuth.csrf,
            body: { baseRevision: 1 },
          },
        );
        expect(replayApprove.status).toBe(409);

        const bootstrap = await apiRequest(baseUrl, "/api/enterprise/user/v2/bootstrap", {
          cookie: firstAuth.cookie,
        });
        const bootstrapBody = (await bootstrap.json()) as {
          agents: Array<Record<string, unknown>>;
        };
        expect(bootstrapBody.agents.find((agent) => agent.key === fixture.agentKey)).toMatchObject({
          access: {
            allowed: true,
            request: { id: requestId, state: "approved" },
          },
          actions: { canChat: true, canSchedule: true },
        });

        const account = getEnterpriseAccountById(approvedBody.entitlement.accountId)!;
        expect(resolveEnterpriseUserRuntimeAgentId(fixture.config, account, fixture.agentKey)).toBe(
          "research",
        );
        applyEnterpriseAccessChanges(
          [
            {
              accountId: account.id,
              resourceType: "agent",
              resourceId: "agent:shared:research",
              effect: "deny",
            },
          ],
          { [account.id]: account.policyRevision },
        );
        const revokedAccount = getEnterpriseAccountById(account.id)!;
        expect(() =>
          resolveEnterpriseUserRuntimeAgentId(fixture.config, revokedAccount, fixture.agentKey),
        ).toThrow("AGENT_NOT_FOUND");
        const revokedBootstrap = await apiRequest(baseUrl, "/api/enterprise/user/v2/bootstrap", {
          cookie: firstAuth.cookie,
        });
        const revokedBody = (await revokedBootstrap.json()) as {
          agents: Array<Record<string, unknown>>;
        };
        expect(revokedBody.agents.find((agent) => agent.key === fixture.agentKey)).toMatchObject({
          access: { allowed: false, request: { state: "approved" } },
          actions: { canChat: false, canSchedule: false, canRequestAccess: true },
          relationship: null,
        });
        const requestAgain = await apiRequest(baseUrl, USER_REQUESTS_PATH, {
          method: "POST",
          cookie: firstAuth.cookie,
          csrf: firstAuth.csrf,
          body: { agentKey: fixture.agentKey },
        });
        expect(requestAgain.status).toBe(201);
        await expect(requestAgain.json()).resolves.toMatchObject({ request: { state: "pending" } });

        const secondRequest = await apiRequest(baseUrl, USER_REQUESTS_PATH, {
          method: "POST",
          cookie: firstAuth.cookie,
          csrf: firstAuth.csrf,
          body: { agentKey: "shared:missing-agent" },
        });
        expect(secondRequest.status).toBe(404);

        const deniedAccountAuth = await login(
          baseUrl,
          "user",
          fixture.secondUsername,
          fixture.secondPassword,
        );
        const rejectedRequestResponse = await apiRequest(baseUrl, USER_REQUESTS_PATH, {
          method: "POST",
          cookie: deniedAccountAuth.cookie,
          csrf: deniedAccountAuth.csrf,
          body: { agentKey: fixture.agentKey },
        });
        const rejectedRequest = (await rejectedRequestResponse.json()) as {
          request: { id: string; revision: number };
        };
        const reject = await apiRequest(
          baseUrl,
          `${ADMIN_REQUESTS_PATH}/${rejectedRequest.request.id}/reject`,
          {
            method: "POST",
            cookie: adminAuth.cookie,
            csrf: adminAuth.csrf,
            body: {
              baseRevision: rejectedRequest.request.revision,
              reason: "Agent này đang trong giai đoạn giới hạn thử nghiệm.",
            },
          },
        );
        expect(reject.status).toBe(200);
        await expect(reject.json()).resolves.toMatchObject({
          request: {
            id: rejectedRequest.request.id,
            state: "rejected",
            decisionReason: "Agent này đang trong giai đoạn giới hạn thử nghiệm.",
          },
        });

        const resubmitted = await apiRequest(baseUrl, USER_REQUESTS_PATH, {
          method: "POST",
          cookie: deniedAccountAuth.cookie,
          csrf: deniedAccountAuth.csrf,
          body: { agentKey: fixture.agentKey },
        });
        expect(resubmitted.status).toBe(201);
        const resubmittedBody = (await resubmitted.json()) as {
          request: { id: string; revision: number; state: string };
        };
        expect(resubmittedBody.request).toMatchObject({ state: "pending", revision: 1 });
        expect(resubmittedBody.request.id).not.toBe(rejectedRequest.request.id);

        const staleCancel = await apiRequest(
          baseUrl,
          `${USER_REQUESTS_PATH}/${resubmittedBody.request.id}/cancel`,
          {
            method: "POST",
            cookie: deniedAccountAuth.cookie,
            csrf: deniedAccountAuth.csrf,
            body: { baseRevision: 2 },
          },
        );
        expect(staleCancel.status).toBe(409);

        const cancelled = await apiRequest(
          baseUrl,
          `${USER_REQUESTS_PATH}/${resubmittedBody.request.id}/cancel`,
          {
            method: "POST",
            cookie: deniedAccountAuth.cookie,
            csrf: deniedAccountAuth.csrf,
            body: { baseRevision: resubmittedBody.request.revision },
          },
        );
        expect(cancelled.status).toBe(200);
        await expect(cancelled.json()).resolves.toMatchObject({
          request: { id: resubmittedBody.request.id, state: "cancelled", revision: 2 },
        });
      } finally {
        await closeServer(server);
      }
    });
  });
});
