import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { handleEnterpriseHttpRequest } from "../api/enterprise-http.js";
import { hashEnterprisePassword } from "../auth/password.js";

const CONFIG: OpenClawConfig = {
  enterprise: { enabled: true },
  gateway: { auth: { mode: "accounts" } },
};

afterEach(() => closeOpenClawStateDatabaseForTest());

async function server(): Promise<{ server: Server; baseUrl: string }> {
  const instance = createServer((req, res) => {
    void handleEnterpriseHttpRequest(req, res, CONFIG).then((handled) => {
      if (!handled && !res.writableEnded) {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  await new Promise<void>((resolve) => {
    instance.listen(0, "127.0.0.1", resolve);
  });
  const address = instance.address();
  if (!address || typeof address === "string") {
    throw new Error("TEST_SERVER_UNAVAILABLE");
  }
  return { server: instance, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function closeServer(instance: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    instance.close((error) => (error ? reject(error) : resolve()));
  });
}

async function request(
  baseUrl: string,
  path: string,
  input: {
    method?: string;
    body?: unknown;
    cookie?: string;
    csrf?: string;
    idempotencyKey?: string;
  } = {},
): Promise<Response> {
  return await fetch(`${baseUrl}${path}`, {
    method: input.method ?? "GET",
    headers: {
      origin: baseUrl,
      "sec-fetch-site": "same-origin",
      ...(input.body === undefined ? {} : { "content-type": "application/json" }),
      ...(input.cookie ? { cookie: input.cookie } : {}),
      ...(input.csrf ? { "x-csrf-token": input.csrf } : {}),
      ...(input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : {}),
    },
    ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
  });
}

function cookie(response: Response): string {
  const value = response.headers.get("set-cookie");
  if (!value) {
    throw new Error("COOKIE_MISSING");
  }
  return value.split(";", 1)[0]!;
}

async function login(
  baseUrl: string,
  audience: "admin" | "user",
  username: string,
  password: string,
): Promise<{ cookie: string; csrf: string }> {
  const response = await request(baseUrl, `/api/auth/${audience}/login`, {
    method: "POST",
    body: { username, password },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { csrfToken: string };
  return { cookie: cookie(response), csrf: body.csrfToken };
}

describe("Enterprise Knowledge HTTP role contract", () => {
  it("separates audiences, hides foreign Zones and enforces Admin/Manager/Curator/Viewer actions", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const password = "knowledge-http-password";
      const passwordHash = await hashEnterprisePassword(password);
      const admin = createEnterpriseAccount({
        username: "knowledge.http.admin",
        displayName: "Knowledge Admin",
        passwordHash,
        role: "administrator",
        mustChangePassword: false,
      });
      const manager = createEnterpriseAccount({
        username: "knowledge.http.manager",
        displayName: "Knowledge Manager",
        passwordHash,
        role: "employee",
        mustChangePassword: false,
      });
      const curator = createEnterpriseAccount({
        username: "knowledge.http.curator",
        displayName: "Knowledge Curator",
        passwordHash,
        role: "employee",
        mustChangePassword: false,
      });
      const viewer = createEnterpriseAccount({
        username: "knowledge.http.viewer",
        displayName: "Knowledge Viewer",
        passwordHash,
        role: "employee",
        mustChangePassword: false,
      });
      createEnterpriseAccount({
        username: "knowledge.http.foreign",
        displayName: "Foreign User",
        passwordHash,
        role: "employee",
        mustChangePassword: false,
      });
      const running = await server();
      try {
        const adminAuth = await login(running.baseUrl, "admin", "knowledge.http.admin", password);
        const managerAuth = await login(
          running.baseUrl,
          "user",
          "knowledge.http.manager",
          password,
        );
        const curatorAuth = await login(
          running.baseUrl,
          "user",
          "knowledge.http.curator",
          password,
        );
        const viewerAuth = await login(running.baseUrl, "user", "knowledge.http.viewer", password);
        const foreignAuth = await login(
          running.baseUrl,
          "user",
          "knowledge.http.foreign",
          password,
        );

        const deniedCreate = await request(running.baseUrl, "/api/enterprise/admin/knowledge", {
          method: "POST",
          cookie: managerAuth.cookie,
          csrf: managerAuth.csrf,
          idempotencyKey: "denied-create",
          body: { slug: "denied-zone", name: "Denied" },
        });
        expect(deniedCreate.status).toBe(401);

        const createInput = {
          slug: "http-role-zone",
          name: "HTTP Role Zone",
          description: "Role contract fixture",
        };
        const created = await request(running.baseUrl, "/api/enterprise/admin/knowledge", {
          method: "POST",
          cookie: adminAuth.cookie,
          csrf: adminAuth.csrf,
          idempotencyKey: "create-role-zone",
          body: createInput,
        });
        expect(created.status).toBe(201);
        const createdBody = (await created.json()) as {
          zone: { id: string; revision: number };
        };
        const replay = await request(running.baseUrl, "/api/enterprise/admin/knowledge", {
          method: "POST",
          cookie: adminAuth.cookie,
          csrf: adminAuth.csrf,
          idempotencyKey: "create-role-zone",
          body: createInput,
        });
        expect(replay.status).toBe(201);
        expect(replay.headers.get("idempotency-replayed")).toBe("true");
        const zoneId = createdBody.zone.id;

        const members = await request(
          running.baseUrl,
          `/api/enterprise/admin/knowledge/${zoneId}/members`,
          {
            method: "PUT",
            cookie: adminAuth.cookie,
            csrf: adminAuth.csrf,
            body: {
              baseRevision: createdBody.zone.revision,
              members: [
                { accountId: manager.id, role: "manager" },
                { accountId: curator.id, role: "curator" },
                { accountId: viewer.id, role: "viewer" },
              ],
            },
          },
        );
        expect(members.status).toBe(200);

        const adminGraphSettings = await request(
          running.baseUrl,
          `/api/enterprise/admin/knowledge/${zoneId}/graph/settings`,
          { cookie: adminAuth.cookie },
        );
        expect(adminGraphSettings.status).toBe(200);
        const userGraphSettings = await request(
          running.baseUrl,
          `/api/enterprise/user/v2/knowledge/${zoneId}/graph/settings`,
          { cookie: managerAuth.cookie },
        );
        expect(userGraphSettings.status).toBe(403);
        const invalidGraphThreshold = await request(
          running.baseUrl,
          `/api/enterprise/admin/knowledge/${zoneId}/graph/settings`,
          {
            method: "PATCH",
            cookie: adminAuth.cookie,
            csrf: adminAuth.csrf,
            body: { baseRevision: 1, autoApprovalThreshold: 0.5 },
          },
        );
        expect(invalidGraphThreshold.status).toBe(422);
        const viewerCandidate = await request(
          running.baseUrl,
          `/api/enterprise/user/v2/knowledge/${zoneId}/graph/neighborhood?snapshot=candidate`,
          { cookie: viewerAuth.cookie },
        );
        expect(viewerCandidate.status).toBe(404);
        const curatorExport = await request(
          running.baseUrl,
          `/api/enterprise/user/v2/knowledge/${zoneId}/graph/exports`,
          {
            method: "POST",
            cookie: curatorAuth.cookie,
            csrf: curatorAuth.csrf,
            idempotencyKey: "curator-export-denied",
            body: {},
          },
        );
        expect(curatorExport.status).toBe(403);

        const note = await request(
          running.baseUrl,
          `/api/enterprise/user/v2/knowledge/${zoneId}/sources/note`,
          {
            method: "POST",
            cookie: curatorAuth.cookie,
            csrf: curatorAuth.csrf,
            idempotencyKey: "curator-note",
            body: { title: "Policy", content: "Published only after Manager approval." },
          },
        );
        expect(note.status).toBe(202);

        const viewerWrite = await request(
          running.baseUrl,
          `/api/enterprise/user/v2/knowledge/${zoneId}/sources/note`,
          {
            method: "POST",
            cookie: viewerAuth.cookie,
            csrf: viewerAuth.csrf,
            idempotencyKey: "viewer-note",
            body: { title: "Denied", content: "Denied" },
          },
        );
        expect(viewerWrite.status).toBe(404);

        const managerBinding = await request(
          running.baseUrl,
          `/api/enterprise/user/v2/knowledge/${zoneId}/agents`,
          {
            method: "PUT",
            cookie: managerAuth.cookie,
            csrf: managerAuth.csrf,
            body: { baseRevision: 1, agentResourceKeys: ["agent:shared:main"] },
          },
        );
        expect(managerBinding.status).toBe(403);

        const curatorPublish = await request(
          running.baseUrl,
          `/api/enterprise/user/v2/knowledge/${zoneId}/publish`,
          {
            method: "POST",
            cookie: curatorAuth.cookie,
            csrf: curatorAuth.csrf,
            idempotencyKey: "curator-publish",
            body: { baseRevision: 1, generationId: "candidate-denied" },
          },
        );
        expect(curatorPublish.status).toBe(403);

        const foreignRead = await request(
          running.baseUrl,
          `/api/enterprise/user/v2/knowledge/${zoneId}`,
          { cookie: foreignAuth.cookie },
        );
        expect(foreignRead.status).toBe(404);
        expect(admin.id).toBeTruthy();
      } finally {
        await closeServer(running.server);
      }
    });
  });
});
