import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { ENTERPRISE_USER_AUTH_COOKIE } from "../auth/cookie.js";
import { hashEnterprisePassword } from "../auth/password.js";
import {
  onEnterpriseSkillAuthRequired,
  resetEnterpriseSkillAuthRequestsForTest,
  waitForEnterpriseSkillAuth,
} from "../skill-runtime/skill-auth-request.js";
import { EnterpriseSkillScriptError } from "../skill-runtime/skill-script-runtime.js";
import { handleEnterpriseHttpRequest } from "./enterprise-http.js";

const SKILL_KEY = "auth-test-skill";
const SESSION_KEY = "agent:main:auth-test";

const skillAuthHttpMocks = vi.hoisted(() => ({
  login: vi.fn(),
  invoke: vi.fn(),
  capabilities: vi.fn(),
}));

vi.mock("../gateway/invoke-handler.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../gateway/invoke-handler.js")>()),
  invokeEnterpriseGatewayHandler: skillAuthHttpMocks.invoke,
}));

vi.mock("../isolation/enterprise-agent-capabilities.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../isolation/enterprise-agent-capabilities.js")>()),
  resolveEnterpriseSharedAgentCapabilities: skillAuthHttpMocks.capabilities,
}));

vi.mock("../isolation/enterprise-gateway-policy.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../isolation/enterprise-gateway-policy.js")>()),
  prepareEnterpriseGatewayRequest: ({ context }: { context: GatewayRequestContext }) => ({
    allowed: true,
    context,
  }),
  projectEnterpriseRuntimeConfig: (config: OpenClawConfig) => config,
}));

vi.mock("../skill-runtime/skill-script-runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../skill-runtime/skill-script-runtime.js")>()),
  loginEnterpriseSkill: skillAuthHttpMocks.login,
}));

const ENTERPRISE_CONFIG: OpenClawConfig = {
  enterprise: { enabled: true },
  gateway: { auth: { mode: "accounts" } },
  agents: { entries: { main: {} } },
};

afterEach(() => {
  resetEnterpriseSkillAuthRequestsForTest();
  closeOpenClawStateDatabaseForTest();
});

beforeEach(() => {
  skillAuthHttpMocks.login.mockReset();
  skillAuthHttpMocks.invoke.mockReset();
  skillAuthHttpMocks.capabilities.mockReset();
});

async function startEnterpriseServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((req, res) => {
    void handleEnterpriseHttpRequest(req, res, ENTERPRISE_CONFIG, {
      getGatewayContext: () => ({}) as GatewayRequestContext,
    })
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
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
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

describe("Enterprise skill auth HTTP", () => {
  it("counts SKILL_AUTH_REQUIRED failures, cancels the fifth waiter, and rejects the sixth call", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "skill-auth-http.admin",
        displayName: "Skill Auth HTTP Admin",
        passwordHash: await hashEnterprisePassword("skill-auth-http-admin-password"),
        role: "administrator",
        mustChangePassword: false,
      });
      const account = createEnterpriseAccount({
        username: "skill-auth-http",
        displayName: "Skill Auth HTTP",
        passwordHash: await hashEnterprisePassword("skill-auth-http-password"),
        role: "employee",
        mustChangePassword: false,
      });
      skillAuthHttpMocks.invoke.mockImplementation((_handler, _method, params) =>
        Promise.resolve({ session: { key: params.key } }),
      );
      skillAuthHttpMocks.capabilities.mockImplementation(({ account: owner, agentId, config }) => ({
        allowed: true,
        scope: "personal",
        accountId: owner.id,
        agentId,
        skillsSnapshot: {
          prompt: "",
          skills: [
            {
              name: SKILL_KEY,
              skillKey: SKILL_KEY,
              source: "test",
              scriptRuntime: {
                auth: {
                  mode: "login-token",
                  loginEntrypoint: "login",
                  loginOperation: "login",
                  fields: [
                    { id: "username", label: "Username", argument: "username", type: "text" },
                    {
                      id: "password",
                      label: "Password",
                      argument: "password",
                      type: "password",
                    },
                  ],
                  tokenPaths: ["token"],
                  injectArgument: "authorization",
                  ttlSeconds: 60,
                },
              },
            },
          ],
        },
        revision: "test-revision",
        config,
        pluginTools: [],
      }));
      skillAuthHttpMocks.login.mockRejectedValue(
        new EnterpriseSkillScriptError("SKILL_AUTH_REQUIRED", 401),
      );

      const { server, baseUrl } = await startEnterpriseServer();
      try {
        const login = await apiRequest(baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: { username: account.username, password: "skill-auth-http-password" },
        });
        expect(login.status).toBe(200);
        const loginBody = (await login.json()) as { csrfToken: string };
        const cookie = cookieFrom(login);
        expect(login.headers.get("set-cookie")).toContain(ENTERPRISE_USER_AUTH_COOKIE);

        let requestId: string | undefined;
        const unsubscribe = onEnterpriseSkillAuthRequired((request) => {
          requestId = request.requestId;
        });
        const waiter = waitForEnterpriseSkillAuth({
          accountId: account.id,
          parentSessionKey: SESSION_KEY,
          childSessionKey: "agent:auth-child:auth-test",
          childRunId: "auth-run",
          delegatedChild: false,
          agentId: "main",
          skillKey: SKILL_KEY,
          fields: [
            { id: "username", label: "Username", type: "text" },
            { id: "password", label: "Password", type: "password" },
          ],
        }).catch((error: unknown) => error);
        unsubscribe();
        expect(requestId).toEqual(expect.any(String));

        const responses: Array<{ status: number; body: Record<string, unknown> }> = [];
        for (let attempt = 1; attempt <= 5; attempt += 1) {
          const response = await apiRequest(baseUrl, "/api/enterprise/user/v2/skill-auth", {
            method: "POST",
            cookie,
            csrf: loginBody.csrfToken,
            body: {
              sessionKey: SESSION_KEY,
              skillKey: SKILL_KEY,
              requestId,
              fields: { username: "wrong", password: "wrong" },
            },
          });
          responses.push({
            status: response.status,
            body: (await response.json()) as Record<string, unknown>,
          });
        }

        expect(responses.map(({ status }) => status)).toEqual([401, 401, 401, 401, 401]);
        expect(responses.map(({ body }) => body.code)).toEqual([
          "SKILL_AUTH_REQUIRED",
          "SKILL_AUTH_REQUIRED",
          "SKILL_AUTH_REQUIRED",
          "SKILL_AUTH_REQUIRED",
          "SKILL_AUTH_ATTEMPTS_EXHAUSTED",
        ]);
        expect(responses.map(({ body }) => body.remainingAttempts)).toEqual([4, 3, 2, 1, 0]);
        await expect(waiter).resolves.toMatchObject({ message: "SKILL_AUTH_ATTEMPTS_EXHAUSTED" });

        const sixth = await apiRequest(baseUrl, "/api/enterprise/user/v2/skill-auth", {
          method: "POST",
          cookie,
          csrf: loginBody.csrfToken,
          body: {
            sessionKey: SESSION_KEY,
            skillKey: SKILL_KEY,
            requestId,
            fields: { username: "wrong", password: "wrong" },
          },
        });
        expect(sixth.status).toBe(404);
        await expect(sixth.json()).resolves.toMatchObject({ code: "SKILL_AUTH_REQUEST_NOT_FOUND" });
        expect(skillAuthHttpMocks.login).toHaveBeenCalledTimes(5);
      } finally {
        await closeServer(server);
      }
    });
  });
});
