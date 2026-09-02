import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { hashEnterprisePassword } from "../auth/password.js";
import { handleEnterpriseHttpRequest } from "./enterprise-http.js";

const ENTERPRISE_CONFIG: OpenClawConfig = {
  enterprise: { enabled: true },
  gateway: { auth: { mode: "accounts" } },
};

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

async function startEnterpriseServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((req, res) => {
    void handleEnterpriseHttpRequest(req, res, ENTERPRISE_CONFIG)
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

describe("Enterprise conversation Projects HTTP API", () => {
  it("keeps Projects account-scoped and protects mutations with CSRF", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "projects.admin",
        displayName: "Projects Admin",
        passwordHash: await hashEnterprisePassword("projects-admin-password"),
        role: "administrator",
        mustChangePassword: false,
      });
      createEnterpriseAccount({
        username: "projects.owner",
        displayName: "Projects Owner",
        passwordHash: await hashEnterprisePassword("projects-owner-password"),
        role: "employee",
        mustChangePassword: false,
      });
      createEnterpriseAccount({
        username: "projects.other",
        displayName: "Projects Other",
        passwordHash: await hashEnterprisePassword("projects-other-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const { server, baseUrl } = await startEnterpriseServer();
      try {
        const ownerLogin = await apiRequest(baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: { username: "projects.owner", password: "projects-owner-password" },
        });
        const ownerAuth = (await ownerLogin.json()) as { csrfToken: string };
        const ownerCookie = cookieFrom(ownerLogin);
        const otherLogin = await apiRequest(baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: { username: "projects.other", password: "projects-other-password" },
        });
        const otherAuth = (await otherLogin.json()) as { csrfToken: string };
        const otherCookie = cookieFrom(otherLogin);

        const missingCsrf = await apiRequest(
          baseUrl,
          "/api/enterprise/user/v2/conversation-projects",
          {
            method: "POST",
            cookie: ownerCookie,
            body: { name: "Launch", idempotencyKey: "project-create-missing-csrf" },
          },
        );
        expect(missingCsrf.status).toBe(403);

        const created = await apiRequest(baseUrl, "/api/enterprise/user/v2/conversation-projects", {
          method: "POST",
          cookie: ownerCookie,
          csrf: ownerAuth.csrfToken,
          body: { name: "Launch", idempotencyKey: "project-create-launch" },
        });
        expect(created.status).toBe(201);
        const createdBody = (await created.json()) as { project: { id: string; name: string } };
        expect(createdBody.project.name).toBe("Launch");

        const ownerList = await apiRequest(
          baseUrl,
          "/api/enterprise/user/v2/conversation-projects",
          { cookie: ownerCookie },
        );
        await expect(ownerList.json()).resolves.toMatchObject({
          items: [{ id: createdBody.project.id, name: "Launch", sessionKeys: [] }],
        });
        const otherList = await apiRequest(
          baseUrl,
          "/api/enterprise/user/v2/conversation-projects",
          { cookie: otherCookie },
        );
        await expect(otherList.json()).resolves.toEqual({ items: [] });

        const foreignProjectOpen = await apiRequest(
          baseUrl,
          "/api/enterprise/user/v2/conversations/open",
          {
            method: "POST",
            cookie: otherCookie,
            csrf: otherAuth.csrfToken,
            body: {
              agentKey: "personal",
              mode: "new",
              clientRequestId: "foreign-project-open",
              projectId: createdBody.project.id,
            },
          },
        );
        expect(foreignProjectOpen.status).toBe(404);
        await expect(foreignProjectOpen.json()).resolves.toMatchObject({
          code: "CONVERSATION_PROJECT_NOT_FOUND",
        });

        const duplicate = await apiRequest(
          baseUrl,
          "/api/enterprise/user/v2/conversation-projects",
          {
            method: "POST",
            cookie: ownerCookie,
            csrf: ownerAuth.csrfToken,
            body: { name: "launch", idempotencyKey: "project-create-duplicate" },
          },
        );
        expect(duplicate.status).toBe(409);
        await expect(duplicate.json()).resolves.toMatchObject({
          code: "CONVERSATION_PROJECT_NAME_DUPLICATE",
        });

        const renamed = await apiRequest(
          baseUrl,
          `/api/enterprise/user/v2/conversation-projects/${createdBody.project.id}`,
          {
            method: "PATCH",
            cookie: ownerCookie,
            csrf: ownerAuth.csrfToken,
            body: { name: "Launch plan" },
          },
        );
        expect(renamed.status).toBe(200);
        await expect(renamed.json()).resolves.toMatchObject({
          project: { id: createdBody.project.id, name: "Launch plan" },
        });

        const unassigned = await apiRequest(
          baseUrl,
          "/api/enterprise/user/v2/conversation-projects/assignment",
          {
            method: "PATCH",
            cookie: ownerCookie,
            csrf: ownerAuth.csrfToken,
            body: { sessionKey: "agent:main:missing", projectId: null },
          },
        );
        expect(unassigned.status).toBe(200);

        const removed = await apiRequest(
          baseUrl,
          `/api/enterprise/user/v2/conversation-projects/${createdBody.project.id}`,
          {
            method: "DELETE",
            cookie: ownerCookie,
            csrf: ownerAuth.csrfToken,
          },
        );
        expect(removed.status).toBe(200);
        await expect(removed.json()).resolves.toEqual({ ok: true });
      } finally {
        await closeServer(server);
      }
    });
  });
});
