import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { handleEnterpriseHttpRequest } from "../api/enterprise-http.js";
import { hashEnterprisePassword } from "./password.js";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  closeOpenClawStateDatabaseForTest();
});

async function server(handler: Parameters<typeof createServer>[0]) {
  const instance = createServer(handler);
  await new Promise<void>((resolve) => instance.listen(0, "127.0.0.1", resolve));
  const address = instance.address();
  if (!address || typeof address === "string") throw new Error("SERVER_ADDRESS_MISSING");
  return { instance, url: `http://127.0.0.1:${address.port}` };
}

async function close(instance: Server) {
  await new Promise<void>((resolve, reject) =>
    instance.close((error) => (error ? reject(error) : resolve())),
  );
}

function cookie(response: Response, prefix: string) {
  const value = response.headers.getSetCookie().find((part) => part.startsWith(`${prefix}=`));
  if (!value) throw new Error(`COOKIE_MISSING:${prefix}`);
  return value.split(";", 1)[0]!;
}

describe("embedded Enterprise User bootstrap", () => {
  it("uses only the authenticated Thiên Lý profile and grants a path-scoped user session", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      vi.stubEnv("THIENLY_TEST_SECRET", "fixture-secret");
      let staffCode: string | null = "TL017";
      let profileId = 17;
      let profileCompany = 7;
      const profile = await server((req, res) => {
        const valid =
          req.url === "/api/profile?is_full=true" &&
          req.headers.token === "valid-session" &&
          req.headers["company-id"] === "7";
        res.setHeader("content-type", "application/json");
        res.statusCode = valid ? 201 : 401;
        res.end(
          JSON.stringify(
            valid
              ? {
                  success: true,
                  data: {
                    id: profileId,
                    company_id: profileCompany,
                    staff_code: staffCode,
                    name: "Nguyễn Văn An",
                  },
                }
              : { success: false, data: null },
          ),
        );
      });
      const config: OpenClawConfig = {
        enterprise: {
          enabled: true,
          thienly: {
            enabled: true,
            apiBaseUrl: `${profile.url}/api`,
            webBaseUrl: profile.url,
            callbackUrl: "http://127.0.0.1:18789/api/auth/user/thienly/callback",
            clientId: "fixture-client",
            clientSecretEnv: "THIENLY_TEST_SECRET",
          },
          personalAgent: { templateAgentId: "main" },
          userPortal: { version: "v2" },
        },
        gateway: { auth: { mode: "accounts" } },
        agents: { entries: { main: { name: "Main Agent" } } },
      };
      const gateway = await server((req, res) => {
        void handleEnterpriseHttpRequest(req, res, config).then((handled) => {
          if (!handled && !res.writableEnded) {
            res.statusCode = 404;
            res.end();
          }
        });
      });
      const request = (
        path: string,
        options: {
          token?: string;
          company?: string;
          authCookie?: string;
          csrf?: string;
          body?: unknown;
          method?: string;
        } = {},
      ) =>
        fetch(`${gateway.url}${path}`, {
          method: options.method ?? "GET",
          headers: {
            origin: gateway.url,
            "sec-fetch-site": "same-origin",
            ...(options.token ? { token: options.token } : {}),
            ...(options.company ? { "company-id": options.company } : {}),
            ...(options.authCookie ? { cookie: options.authCookie } : {}),
            ...(options.csrf ? { "x-csrf-token": options.csrf } : {}),
            ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
          },
          ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        });
      try {
        const wrongCompany = await request("/api/auth/user/embedded/bootstrap", {
          method: "POST",
          token: "valid-session",
          company: "8",
        });
        expect(wrongCompany.status).toBe(401);
        staffCode = null;
        const missingStaff = await request("/api/auth/user/embedded/bootstrap", {
          method: "POST",
          token: "valid-session",
          company: "7",
        });
        expect(missingStaff.status).toBe(401);
        staffCode = "TL017";
        profileCompany = 8;
        expect(
          (
            await request("/api/auth/user/embedded/bootstrap", {
              method: "POST",
              token: "valid-session",
              company: "7",
            })
          ).status,
        ).toBe(401);
        profileCompany = 7;
        profileId = 0;
        expect(
          (
            await request("/api/auth/user/embedded/bootstrap", {
              method: "POST",
              token: "valid-session",
              company: "7",
            })
          ).status,
        ).toBe(401);
        profileId = 17;
        const created = await request("/api/auth/user/embedded/bootstrap", {
          method: "POST",
          token: "valid-session",
          company: "7",
        });
        expect(created.status).toBe(200);
        expect(
          created.headers
            .getSetCookie()
            .some(
              (part) =>
                part.includes("Path=/assistant-openclaw") &&
                part.includes("HttpOnly") &&
                part.includes("Secure"),
            ),
        ).toBe(true);
        const auth = (await created.json()) as {
          account: { username: string };
          csrfToken: string;
          bootstrap: { agents: unknown[] };
        };
        expect(auth.bootstrap.agents.length).toBeGreaterThan(0);
        const embeddedCookie = cookie(created, "__Secure-openclaw_embed_session");
        const me = await request("/api/auth/user/me", { authCookie: embeddedCookie });
        expect(me.status).toBe(200);
        const denied = await request("/api/enterprise/user/v2/conversation-projects", {
          method: "POST",
          authCookie: embeddedCookie,
          body: { name: "Fixture", idempotencyKey: "fixture-project" },
        });
        expect(denied.status).toBe(403);
        const allowed = await request("/api/enterprise/user/v2/conversation-projects", {
          method: "POST",
          authCookie: embeddedCookie,
          csrf: auth.csrfToken,
          body: { name: "Fixture", idempotencyKey: "fixture-project" },
        });
        expect(allowed.status).toBe(201);
        const repeated = await request("/api/auth/user/embedded/bootstrap", {
          method: "POST",
          token: "valid-session",
          company: "7",
          authCookie: embeddedCookie,
        });
        expect(repeated.status).toBe(200);
        expect((await request("/api/auth/user/me", { authCookie: embeddedCookie })).status).toBe(
          401,
        );
        const repeatCookie = cookie(repeated, "__Secure-openclaw_embed_session");
        profileId = 18;
        staffCode = "TL018";
        const switched = await request("/api/auth/user/embedded/bootstrap", {
          method: "POST",
          token: "valid-session",
          company: "7",
          authCookie: repeatCookie,
        });
        expect(switched.status).toBe(200);
        const switchedAuth = (await switched.json()) as {
          account: { username: string };
          csrfToken: string;
        };
        expect(switchedAuth.account.username).not.toBe(auth.account.username);
        expect((await request("/api/auth/user/me", { authCookie: repeatCookie })).status).toBe(401);
        const switchedCookie = cookie(switched, "__Secure-openclaw_embed_session");
        const logout = await request("/api/auth/user/logout", {
          method: "POST",
          authCookie: switchedCookie,
          csrf: switchedAuth.csrfToken,
        });
        expect(logout.status).toBe(200);
        expect((await request("/api/auth/user/me", { authCookie: switchedCookie })).status).toBe(
          401,
        );
      } finally {
        await close(gateway.instance);
        await close(profile.instance);
      }
    });
  });

  it("requires password proof for an existing unlinked staff account", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      vi.stubEnv("THIENLY_TEST_SECRET", "fixture-secret");
      createEnterpriseAccount({
        username: "tl017",
        displayName: "Existing",
        passwordHash: await hashEnterprisePassword("correct-password"),
        role: "employee",
        mustChangePassword: false,
        personalAgentEnabled: true,
      });
      const profile = await server((_req, res) => {
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            data: { id: 17, company_id: 7, staff_code: "TL017", name: "An" },
          }),
        );
      });
      const config: OpenClawConfig = {
        enterprise: {
          enabled: true,
          thienly: {
            enabled: true,
            apiBaseUrl: `${profile.url}/api`,
            webBaseUrl: profile.url,
            callbackUrl: "http://127.0.0.1:18789/api/auth/user/thienly/callback",
            clientId: "fixture-client",
            clientSecretEnv: "THIENLY_TEST_SECRET",
          },
          personalAgent: { templateAgentId: "main" },
          userPortal: { version: "v2" },
        },
        gateway: { auth: { mode: "accounts" } },
        agents: { entries: { main: { name: "Main Agent" } } },
      };
      const gateway = await server((req, res) => {
        void handleEnterpriseHttpRequest(req, res, config);
      });
      try {
        const bootstrap = await fetch(`${gateway.url}/api/auth/user/embedded/bootstrap`, {
          method: "POST",
          headers: {
            origin: gateway.url,
            "sec-fetch-site": "same-origin",
            token: "valid-session",
            "company-id": "7",
          },
        });
        expect(bootstrap.status).toBe(409);
        let attempt = (await bootstrap.json()) as { attemptId: string };
        let browserCookie = cookie(bootstrap, "__Secure-openclaw_embed_browser");
        const link = (password: string, authCookie = browserCookie) =>
          fetch(`${gateway.url}/api/auth/user/embedded/link`, {
            method: "POST",
            headers: {
              origin: gateway.url,
              "sec-fetch-site": "same-origin",
              cookie: authCookie,
              "content-type": "application/json",
            },
            body: JSON.stringify({ attemptId: attempt.attemptId, password }),
          });
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(Date.now() + 11 * 60_000);
        expect((await link("correct-password")).status).toBe(409);
        vi.useRealTimers();
        const fresh = await fetch(`${gateway.url}/api/auth/user/embedded/bootstrap`, {
          method: "POST",
          headers: {
            origin: gateway.url,
            "sec-fetch-site": "same-origin",
            token: "valid-session",
            "company-id": "7",
          },
        });
        expect(fresh.status).toBe(409);
        attempt = (await fresh.json()) as { attemptId: string };
        browserCookie = cookie(fresh, "__Secure-openclaw_embed_browser");
        expect((await link("correct-password", "")).status).toBe(404);
        expect((await link("wrong-password")).status).toBe(401);
        const linked = await link("correct-password");
        expect(linked.status).toBe(200);
        expect(cookie(linked, "__Secure-openclaw_embed_session")).toContain("=");
        expect((await link("correct-password")).status).toBe(409);
      } finally {
        await close(gateway.instance);
        await close(profile.instance);
      }
    });
  });
});
