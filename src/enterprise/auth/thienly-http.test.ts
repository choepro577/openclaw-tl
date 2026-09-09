import fs from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import {
  createEnterpriseAccount,
  getEnterpriseAccountByUsername,
  listEnterpriseAccounts,
} from "../accounts/account-store.js";
import {
  readEnterpriseAccountToolPolicy,
  writeEnterpriseAccountToolPolicy,
} from "../accounts/account-tool-policy-store.js";
import { handleEnterpriseHttpRequest } from "../api/enterprise-http.js";
import {
  listEnterpriseEntitlements,
  resolveEnterpriseResourceAccess,
} from "../entitlements/entitlement-store.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import { resolveEnterpriseWorkspacePath } from "../personal-agent/personal-workspace.js";
import { ENTERPRISE_USER_AUTH_COOKIE } from "./cookie.js";
import { hashEnterprisePassword } from "./password.js";
import { bindThienLyIdentity, getThienLyBinding } from "./thienly-store.js";

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

type Identity = {
  subject: string;
  company_id: number;
  user_id: number;
  staff_code: string;
  display_name: string;
};

type ExchangeResponse = {
  status?: number;
  body: unknown;
};

type HttpServer = {
  server: Server;
  baseUrl: string;
};

type ExchangeServer = HttpServer & {
  readonly exchangeCount: number;
  readonly requests: Array<Record<string, unknown>>;
  readonly requestStarted: Promise<void>;
  release: () => void;
};

type MaapServer = HttpServer & {
  setConfig: (config: OpenClawConfig) => void;
};

const TEST_SECRET = "test-thienly-client-secret";
const THIENLY_PREFIX = "/api/auth/user/thienly";
const USER_ME_PATH = "/api/auth/user/me";

afterEach(() => {
  vi.unstubAllEnvs();
  closeOpenClawStateDatabaseForTest();
});

async function startHttpServer(handler: RequestHandler): Promise<HttpServer> {
  const server = createServer((req, res) => {
    void Promise.resolve(handler(req, res)).catch((error: unknown) => {
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

async function readRequestBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function exchangeEnvelope(identity: Identity): ExchangeResponse {
  return {
    body: {
      success: true,
      data: identity,
    },
  };
}

async function startExchangeServer(
  options: {
    exchange?: (request: Record<string, unknown>) => ExchangeResponse | Promise<ExchangeResponse>;
    delayed?: boolean;
  } = {},
): Promise<ExchangeServer> {
  let exchangeCount = 0;
  const requests: Array<Record<string, unknown>> = [];
  let requestStartedResolve!: () => void;
  const requestStarted = new Promise<void>((resolve) => {
    requestStartedResolve = resolve;
  });
  let releaseResolve: (() => void) | undefined;
  const delay = options.delayed
    ? new Promise<void>((resolve) => {
        releaseResolve = resolve;
      })
    : Promise.resolve();

  const fixture = await startHttpServer(async (req, res) => {
    if (
      req.method !== "POST" ||
      new URL(req.url ?? "/", "http://127.0.0.1").pathname !== "/api/maap/connect/exchange"
    ) {
      res.statusCode = 404;
      res.end();
      return;
    }
    const request = await readRequestBody(req);
    exchangeCount += 1;
    requests.push(request);
    requestStartedResolve();
    await delay;
    const response =
      (await options.exchange?.(request)) ??
      exchangeEnvelope({
        subject: "comnieu:7:17",
        company_id: 7,
        user_id: 17,
        staff_code: "TL017",
        display_name: "Nguyễn Văn An",
      });
    res.statusCode = response.status ?? 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(response.body));
  });

  return {
    ...fixture,
    get exchangeCount() {
      return exchangeCount;
    },
    requests,
    requestStarted,
    release: () => releaseResolve?.(),
  };
}

async function startMaapServer(): Promise<MaapServer> {
  let config: OpenClawConfig | undefined;
  const fixture = await startHttpServer(async (req, res) => {
    if (!config) {
      res.statusCode = 500;
      res.end("TEST_CONFIG_NOT_READY");
      return;
    }
    const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    const handled = await handleEnterpriseHttpRequest(req, res, config);
    if (!handled && !res.writableEnded) {
      res.statusCode = pathname.startsWith("/api/") ? 404 : 404;
      res.end();
    }
  });
  return {
    ...fixture,
    setConfig: (nextConfig) => {
      config = nextConfig;
    },
  };
}

function makeConfig(maapBaseUrl: string, thienLyBaseUrl: string): OpenClawConfig {
  return {
    enterprise: {
      enabled: true,
      thienly: {
        enabled: true,
        webBaseUrl: thienLyBaseUrl,
        apiBaseUrl: `${thienLyBaseUrl}/api`,
        callbackUrl: `${maapBaseUrl}${THIENLY_PREFIX}/callback`,
        clientId: "maap-test-client",
        clientSecretEnv: "THIENLY_TEST_SECRET",
      },
      personalAgent: { templateAgentId: "main" },
      userPortal: { version: "v2" },
    },
    gateway: { auth: { mode: "accounts" } },
    agents: { entries: { main: { name: "Main Agent" } } },
  };
}

function createAdmin(): void {
  createEnterpriseAccount({
    username: "fixture-admin",
    displayName: "Fixture Admin",
    passwordHash: "admin-placeholder",
    role: "administrator",
    mustChangePassword: false,
  });
}

function cookieFrom(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("SET_COOKIE_MISSING");
  }
  return setCookie.split(";", 1)[0]!;
}

async function apiRequest(
  baseUrl: string,
  pathname: string,
  options: {
    method?: string;
    body?: unknown;
    cookie?: string;
    csrf?: string;
    origin?: string;
    fetchSite?: string;
  } = {},
): Promise<Response> {
  return fetch(`${baseUrl}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      origin: options.origin ?? baseUrl,
      "sec-fetch-site": options.fetchSite ?? "same-origin",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.csrf ? { "x-csrf-token": options.csrf } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function beginAttempt(
  baseUrl: string,
  options: { browserCookie?: string } = {},
): Promise<{
  attempt: { id: string; phase: string; events: Array<{ phase: string }> };
  browserCookie: string;
  state: string;
  authorizationUrl: URL;
}> {
  const response = await apiRequest(baseUrl, `${THIENLY_PREFIX}/start`, {
    method: "POST",
    cookie: options.browserCookie,
  });
  expect(response.status).toBe(201);
  const body = await readJson<{
    attempt: { id: string; phase: string; events: Array<{ phase: string }> };
    authorizationUrl: string;
  }>(response);
  const authorizationUrl = new URL(body.authorizationUrl);
  const state = authorizationUrl.searchParams.get("state");
  expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/u);
  expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe("S256");
  expect(authorizationUrl.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/u);
  expect(authorizationUrl.searchParams.get("client_secret")).toBeNull();
  return {
    attempt: body.attempt,
    browserCookie: cookieFrom(response),
    state: state!,
    authorizationUrl,
  };
}

async function getAttempt(baseUrl: string, id: string, browserCookie: string) {
  const response = await apiRequest(baseUrl, `${THIENLY_PREFIX}/attempts/${id}`, {
    cookie: browserCookie,
  });
  expect(response.status).toBe(200);
  return readJson<{
    attempt: { phase: string; events: Array<{ phase: string }>; error?: { code: string } };
  }>(response);
}

async function callback(
  baseUrl: string,
  state: string,
  browserCookie: string,
  code = "c".repeat(32),
): Promise<Response> {
  const url = new URL(`${baseUrl}${THIENLY_PREFIX}/callback`);
  url.searchParams.set("state", state);
  url.searchParams.set("code", code);
  return fetch(url, { headers: { cookie: browserCookie } });
}

async function completeAttempt(
  baseUrl: string,
  id: string,
  browserCookie: string,
): Promise<{
  response: Response;
  body: { account: Record<string, unknown>; csrfToken: string };
  authCookie: string;
}> {
  const response = await apiRequest(baseUrl, `${THIENLY_PREFIX}/attempts/${id}/complete`, {
    method: "POST",
    cookie: browserCookie,
  });
  const body = await readJson<{ account: Record<string, unknown>; csrfToken: string }>(response);
  return { response, body, authCookie: cookieFrom(response) };
}

async function readFirstSseChunk(
  baseUrl: string,
  id: string,
  browserCookie: string,
): Promise<string> {
  const controller = new AbortController();
  const response = await fetch(`${baseUrl}${THIENLY_PREFIX}/attempts/${id}/events`, {
    headers: { cookie: browserCookie },
    signal: controller.signal,
  });
  expect(response.status).toBe(200);
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("SSE_BODY_MISSING");
  }
  const first = await reader.read();
  await reader.cancel().catch(() => undefined);
  controller.abort();
  return new TextDecoder().decode(first.value);
}

describe("Thiên Lý authentication HTTP boundary", () => {
  it("runs start, durable restart, SSE, callback, Personal Agent bootstrap, and cookie completion", async () => {
    vi.stubEnv("THIENLY_TEST_SECRET", TEST_SECRET);
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createAdmin();
      const identity: Identity = {
        subject: "comnieu:7:17",
        company_id: 7,
        user_id: 17,
        staff_code: " TL017 ",
        display_name: "Nguyễn Văn An",
      };
      const issuer = await startExchangeServer({ exchange: () => exchangeEnvelope(identity) });
      const maap = await startMaapServer();
      maap.setConfig(makeConfig(maap.baseUrl, issuer.baseUrl));
      try {
        const started = await beginAttempt(maap.baseUrl);
        expect(started.authorizationUrl.origin).toBe(issuer.baseUrl);
        expect(started.authorizationUrl.pathname).toBe("/integrations/maap/connect");
        expect(started.authorizationUrl.searchParams.get("redirect_uri")).toBe(
          `${maap.baseUrl}${THIENLY_PREFIX}/callback`,
        );

        const sse = await readFirstSseChunk(
          maap.baseUrl,
          started.attempt.id,
          started.browserCookie,
        );
        expect(sse).toContain("event: progress");
        expect(sse).toContain('"phase":"waiting"');
        expect(sse).not.toContain(TEST_SECRET);
        expect(sse).not.toContain("verifier");
        expect(sse).not.toContain("browserHash");
        expect(sse).not.toContain("stateHash");

        closeOpenClawStateDatabaseForTest();
        await expect(
          getAttempt(maap.baseUrl, started.attempt.id, started.browserCookie),
        ).resolves.toMatchObject({
          attempt: { phase: "waiting" },
        });

        const callbackResponse = await callback(maap.baseUrl, started.state, started.browserCookie);
        expect(callbackResponse.status).toBe(200);
        expect(callbackResponse.headers.get("set-cookie")).toBeNull();
        const ready = await getAttempt(maap.baseUrl, started.attempt.id, started.browserCookie);
        expect(ready.attempt).toMatchObject({ phase: "ready" });
        expect(getThienLyBinding(identity.subject)?.staffCode).toBe(" TL017 ");
        expect(ready.attempt.events.map((event) => event.phase)).toEqual([
          "waiting",
          "verifying",
          "account",
          "agent",
          "ready",
        ]);

        const completed = await completeAttempt(
          maap.baseUrl,
          started.attempt.id,
          started.browserCookie,
        );
        expect(completed.response.status).toBe(200);
        expect(completed.authCookie).toContain(`${ENTERPRISE_USER_AUTH_COOKIE}=`);
        expect(completed.body.account).toEqual({
          username: "tl017",
          displayName: "Nguyễn Văn An",
          role: "employee",
          mustChangePassword: false,
          enabled: true,
          personalAgentEnabled: true,
        });

        const me = await apiRequest(maap.baseUrl, USER_ME_PATH, { cookie: completed.authCookie });
        expect(me.status).toBe(200);
        await expect(readJson(me)).resolves.toMatchObject({
          account: { username: "tl017", displayName: "Nguyễn Văn An" },
        });

        const account = getEnterpriseAccountByUsername("TL017");
        expect(account).toMatchObject({
          username: "tl017",
          displayName: "Nguyễn Văn An",
          role: "employee",
          accessPresetKey: "basic@1",
          personalAgentEnabled: true,
          defaultAgentId: null,
        });
        expect(
          listEnterpriseEntitlements(account!.id).filter((item) => item.resourceType !== "tool"),
        ).toEqual([]);
        expect(
          resolveEnterpriseResourceAccess(
            account!,
            "tool",
            "read",
            {},
            makeConfig(maap.baseUrl, issuer.baseUrl),
          ),
        ).toEqual({
          allowed: true,
          reason: "access_preset",
        });

        const bootstrapResponse = await apiRequest(
          maap.baseUrl,
          "/api/enterprise/user/v2/bootstrap",
          {
            cookie: completed.authCookie,
          },
        );
        expect(bootstrapResponse.status).toBe(200);
        const bootstrap = await readJson<{
          defaultAgentKey: string | null;
          agents: Array<{
            key: string;
            kind: string;
            availability: string;
            actions: { canChat: boolean };
          }>;
        }>(bootstrapResponse);
        expect(bootstrap.defaultAgentKey).toBe("personal");
        expect(bootstrap.agents).toEqual([
          expect.objectContaining({
            key: "personal",
            kind: "personal",
            availability: "ready",
            actions: expect.objectContaining({ canChat: true }),
          }),
        ]);
      } finally {
        await closeServer(maap.server);
        await closeServer(issuer.server);
      }
    });
  });

  it("requires the existing MAAP password before linking and preserves policy and password-change state", async () => {
    vi.stubEnv("THIENLY_TEST_SECRET", TEST_SECRET);
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createAdmin();
      const legacyPassword = "legacy-password";
      const legacy = createEnterpriseAccount({
        username: "tl021",
        displayName: "Legacy Employee",
        passwordHash: await hashEnterprisePassword(legacyPassword),
        role: "employee",
        mustChangePassword: true,
        accessPresetKey: "standard-coding@1",
      });
      const policyBefore = writeEnterpriseAccountToolPolicy(legacy.id, 0, {
        profile: "coding",
        alsoAllow: ["web_fetch"],
        deny: ["browser"],
      });
      const identity: Identity = {
        subject: "comnieu:7:21",
        company_id: 7,
        user_id: 21,
        staff_code: "TL021",
        display_name: "Legacy Employee Updated",
      };
      const issuer = await startExchangeServer({ exchange: () => exchangeEnvelope(identity) });
      const maap = await startMaapServer();
      maap.setConfig(makeConfig(maap.baseUrl, issuer.baseUrl));
      try {
        const started = await beginAttempt(maap.baseUrl);
        await callback(maap.baseUrl, started.state, started.browserCookie);
        await expect(
          getAttempt(maap.baseUrl, started.attempt.id, started.browserCookie),
        ).resolves.toMatchObject({
          attempt: { phase: "link_required", account: { username: "tl021" } },
        });

        const wrong = await apiRequest(
          maap.baseUrl,
          `${THIENLY_PREFIX}/attempts/${started.attempt.id}/link`,
          {
            method: "POST",
            cookie: started.browserCookie,
            body: { password: "wrong-password" },
          },
        );
        expect(wrong.status).toBe(401);
        expect(await readJson<{ code: string }>(wrong)).toMatchObject({
          code: "INVALID_CREDENTIALS",
        });
        expect(getThienLyBinding(identity.subject)).toBeUndefined();

        const linked = await apiRequest(
          maap.baseUrl,
          `${THIENLY_PREFIX}/attempts/${started.attempt.id}/link`,
          {
            method: "POST",
            cookie: started.browserCookie,
            body: { password: legacyPassword },
          },
        );
        expect(linked.status).toBe(200);
        await expect(readJson(linked)).resolves.toMatchObject({ attempt: { phase: "ready" } });
        expect(getThienLyBinding(identity.subject)).toMatchObject({
          accountId: legacy.id,
          staffCode: "TL021",
        });
        expect(getEnterpriseAccountByUsername("tl021")).toMatchObject({
          id: legacy.id,
          displayName: "Legacy Employee",
          mustChangePassword: true,
          accessPresetKey: "standard-coding@1",
        });
        expect(readEnterpriseAccountToolPolicy(legacy.id)).toEqual(policyBefore);

        const completed = await completeAttempt(
          maap.baseUrl,
          started.attempt.id,
          started.browserCookie,
        );
        expect(completed.response.status).toBe(200);
        expect(completed.body.account).toMatchObject({
          username: "tl021",
          mustChangePassword: true,
        });
        const changed = await apiRequest(maap.baseUrl, "/api/auth/user/change-password", {
          method: "POST",
          cookie: completed.authCookie,
          csrf: completed.body.csrfToken,
          body: { currentPassword: legacyPassword, newPassword: "new-legacy-password" },
        });
        expect(changed.status).toBe(200);
        const oldLogin = await apiRequest(maap.baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: { username: "tl021", password: legacyPassword },
        });
        expect(oldLogin.status).toBe(401);
        const newLogin = await apiRequest(maap.baseUrl, "/api/auth/user/login", {
          method: "POST",
          body: { username: "tl021", password: "new-legacy-password" },
        });
        expect(newLogin.status).toBe(200);
        expect(readEnterpriseAccountToolPolicy(legacy.id)).toEqual(policyBefore);
      } finally {
        await closeServer(maap.server);
        await closeServer(issuer.server);
      }
    });
  });

  it.each([
    {
      name: "missing staff code",
      response: {
        status: 422,
        body: { success: false, data: null, msg_code: "EMPLOYEE_CODE_REQUIRED" },
      },
      expectedCode: "EMPLOYEE_CODE_REQUIRED",
    },
    {
      name: "malformed staff code",
      response: exchangeEnvelope({
        subject: "comnieu:7:23",
        company_id: 7,
        user_id: 23,
        staff_code: "x",
        display_name: "Invalid Employee",
      }),
      expectedCode: "EMPLOYEE_CODE_INVALID",
    },
  ])("does not create an account or session for $name", async ({ response, expectedCode }) => {
    vi.stubEnv("THIENLY_TEST_SECRET", TEST_SECRET);
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createAdmin();
      const issuer = await startExchangeServer({ exchange: () => response });
      const maap = await startMaapServer();
      maap.setConfig(makeConfig(maap.baseUrl, issuer.baseUrl));
      try {
        const started = await beginAttempt(maap.baseUrl);
        expect((await callback(maap.baseUrl, started.state, started.browserCookie)).status).toBe(
          200,
        );
        const failed = await getAttempt(maap.baseUrl, started.attempt.id, started.browserCookie);
        expect(failed.attempt).toMatchObject({ phase: "failed", error: { code: expectedCode } });
        expect(
          listEnterpriseAccounts().filter((account) => account.username !== "fixture-admin"),
        ).toEqual([]);
        expect((await apiRequest(maap.baseUrl, USER_ME_PATH)).status).toBe(401);
        expect(
          (
            await apiRequest(
              maap.baseUrl,
              `${THIENLY_PREFIX}/attempts/${started.attempt.id}/complete`,
              {
                method: "POST",
                cookie: started.browserCookie,
              },
            )
          ).status,
        ).toBe(409);
      } finally {
        await closeServer(maap.server);
        await closeServer(issuer.server);
      }
    });
  });

  it("binds attempts to state, browser, and same-origin mutations", async () => {
    vi.stubEnv("THIENLY_TEST_SECRET", TEST_SECRET);
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createAdmin();
      const issuer = await startExchangeServer();
      const maap = await startMaapServer();
      maap.setConfig(makeConfig(maap.baseUrl, issuer.baseUrl));
      try {
        const started = await beginAttempt(maap.baseUrl);
        const forged = await callback(maap.baseUrl, `${started.state}x`, started.browserCookie);
        expect(forged.status).toBe(404);
        const otherBrowser = await apiRequest(
          maap.baseUrl,
          `${THIENLY_PREFIX}/attempts/${started.attempt.id}`,
        );
        expect(otherBrowser.status).toBe(404);
        const wrongCookieCallback = await callback(
          maap.baseUrl,
          started.state,
          "__Host-maap_thienly_browser=wrong",
        );
        expect(wrongCookieCallback.status).toBe(404);
        const crossOrigin = await apiRequest(maap.baseUrl, `${THIENLY_PREFIX}/start`, {
          method: "POST",
          origin: "http://evil.example",
          fetchSite: "cross-site",
        });
        expect(crossOrigin.status).toBe(403);
        expect(await readJson<{ code: string }>(crossOrigin)).toMatchObject({
          code: "ORIGIN_DENIED",
        });
        expect(
          (await getAttempt(maap.baseUrl, started.attempt.id, started.browserCookie)).attempt.phase,
        ).toBe("waiting");
      } finally {
        await closeServer(maap.server);
        await closeServer(issuer.server);
      }
    });
  });

  it("deduplicates parallel and replayed callbacks to one account", async () => {
    vi.stubEnv("THIENLY_TEST_SECRET", TEST_SECRET);
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createAdmin();
      const identity: Identity = {
        subject: "comnieu:7:25",
        company_id: 7,
        user_id: 25,
        staff_code: "TL025",
        display_name: "Parallel Employee",
      };
      const issuer = await startExchangeServer({ exchange: () => exchangeEnvelope(identity) });
      const maap = await startMaapServer();
      maap.setConfig(makeConfig(maap.baseUrl, issuer.baseUrl));
      try {
        const first = await beginAttempt(maap.baseUrl);
        const second = await beginAttempt(maap.baseUrl, { browserCookie: first.browserCookie });
        expect(second.browserCookie).toBe(first.browserCookie);
        const [firstCallback, replayCallback] = await Promise.all([
          callback(maap.baseUrl, first.state, first.browserCookie, "a".repeat(32)),
          callback(maap.baseUrl, first.state, first.browserCookie, "b".repeat(32)),
        ]);
        expect(firstCallback.status).toBe(200);
        expect(replayCallback.status).toBe(200);
        expect(
          (await callback(maap.baseUrl, second.state, second.browserCookie, "d".repeat(32))).status,
        ).toBe(200);
        expect(issuer.exchangeCount).toBe(2);
        expect(
          (await getAttempt(maap.baseUrl, first.attempt.id, first.browserCookie)).attempt.phase,
        ).toBe("ready");
        expect(
          (await getAttempt(maap.baseUrl, second.attempt.id, second.browserCookie)).attempt.phase,
        ).toBe("ready");
        expect(
          listEnterpriseAccounts().filter((account) => account.username === "tl025"),
        ).toHaveLength(1);
        expect(getThienLyBinding(identity.subject)).toMatchObject({
          subject: identity.subject,
          staffCode: "TL025",
        });

        const completed = await completeAttempt(
          maap.baseUrl,
          first.attempt.id,
          first.browserCookie,
        );
        expect(completed.response.status).toBe(200);
        expect((await callback(maap.baseUrl, first.state, first.browserCookie)).status).toBe(200);
        expect(issuer.exchangeCount).toBe(2);
      } finally {
        await closeServer(maap.server);
        await closeServer(issuer.server);
      }
    });
  });

  it("withholds a session after workspace bootstrap failure and resumes from durable state", async () => {
    vi.stubEnv("THIENLY_TEST_SECRET", TEST_SECRET);
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createAdmin();
      const identity: Identity = {
        subject: "comnieu:7:26",
        company_id: 7,
        user_id: 26,
        staff_code: "TL026",
        display_name: "Workspace Recovery Employee",
      };
      const account = createEnterpriseAccount({
        username: "tl026",
        displayName: identity.display_name,
        passwordHash: await hashEnterprisePassword("existing-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const issuer = await startExchangeServer({ exchange: () => exchangeEnvelope(identity) });
      const maap = await startMaapServer();
      const config = makeConfig(maap.baseUrl, issuer.baseUrl);
      maap.setConfig(config);
      bindThienLyIdentity(identity, account.id, account.username);
      const workspacePath = resolveEnterpriseWorkspacePath(
        account.profileId,
        resolveEnterprisePersonalAgentId(config, account),
      );
      fs.mkdirSync(path.dirname(workspacePath), { recursive: true });
      fs.symlinkSync(".", workspacePath, "dir");
      try {
        const failedStart = await beginAttempt(maap.baseUrl);
        expect(
          (await callback(maap.baseUrl, failedStart.state, failedStart.browserCookie)).status,
        ).toBe(200);
        const failed = await getAttempt(
          maap.baseUrl,
          failedStart.attempt.id,
          failedStart.browserCookie,
        );
        expect(failed.attempt.phase).toBe("failed");
        expect(
          (
            await apiRequest(
              maap.baseUrl,
              `${THIENLY_PREFIX}/attempts/${failedStart.attempt.id}/complete`,
              {
                method: "POST",
                cookie: failedStart.browserCookie,
              },
            )
          ).status,
        ).toBe(409);
        expect(listEnterpriseAccounts().filter((item) => item.username === "tl026")).toHaveLength(
          1,
        );

        fs.unlinkSync(workspacePath);
        closeOpenClawStateDatabaseForTest();
        const retry = await beginAttempt(maap.baseUrl);
        await expect(
          getAttempt(maap.baseUrl, retry.attempt.id, retry.browserCookie),
        ).resolves.toMatchObject({
          attempt: { phase: "waiting" },
        });
        expect((await callback(maap.baseUrl, retry.state, retry.browserCookie)).status).toBe(200);
        expect(
          (await getAttempt(maap.baseUrl, retry.attempt.id, retry.browserCookie)).attempt.phase,
        ).toBe("ready");
        const completed = await completeAttempt(
          maap.baseUrl,
          retry.attempt.id,
          retry.browserCookie,
        );
        expect(completed.response.status).toBe(200);
        await expect(
          apiRequest(maap.baseUrl, USER_ME_PATH, { cookie: completed.authCookie }),
        ).resolves.toMatchObject({
          status: 200,
        });
        expect(listEnterpriseAccounts().filter((item) => item.username === "tl026")).toHaveLength(
          1,
        );
      } finally {
        if (fs.lstatSync(path.dirname(workspacePath), { throwIfNoEntry: false })) {
          try {
            if (fs.lstatSync(workspacePath, { throwIfNoEntry: false })) {
              fs.unlinkSync(workspacePath);
            }
          } catch {
            // Fixture cleanup owns the temporary state directory.
          }
        }
        await closeServer(maap.server);
        await closeServer(issuer.server);
      }
    });
  });

  it("cancels an in-flight exchange without provisioning or issuing a session", async () => {
    vi.stubEnv("THIENLY_TEST_SECRET", TEST_SECRET);
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createAdmin();
      const identity: Identity = {
        subject: "comnieu:7:27",
        company_id: 7,
        user_id: 27,
        staff_code: "TL027",
        display_name: "Cancelled Employee",
      };
      const issuer = await startExchangeServer({
        delayed: true,
        exchange: () => exchangeEnvelope(identity),
      });
      const maap = await startMaapServer();
      maap.setConfig(makeConfig(maap.baseUrl, issuer.baseUrl));
      try {
        const started = await beginAttempt(maap.baseUrl);
        const callbackPromise = callback(maap.baseUrl, started.state, started.browserCookie);
        await issuer.requestStarted;
        const cancelled = await apiRequest(
          maap.baseUrl,
          `${THIENLY_PREFIX}/attempts/${started.attempt.id}/cancel`,
          {
            method: "POST",
            cookie: started.browserCookie,
          },
        );
        expect(cancelled.status).toBe(200);
        await expect(readJson(cancelled)).resolves.toMatchObject({
          attempt: { phase: "cancelled" },
        });
        issuer.release();
        expect((await callbackPromise).status).toBe(200);
        expect(
          (await getAttempt(maap.baseUrl, started.attempt.id, started.browserCookie)).attempt.phase,
        ).toBe("cancelled");
        expect(listEnterpriseAccounts().filter((account) => account.username === "tl027")).toEqual(
          [],
        );
        expect((await apiRequest(maap.baseUrl, USER_ME_PATH)).status).toBe(401);
        expect(
          (
            await apiRequest(
              maap.baseUrl,
              `${THIENLY_PREFIX}/attempts/${started.attempt.id}/complete`,
              {
                method: "POST",
                cookie: started.browserCookie,
              },
            )
          ).status,
        ).toBe(409);
      } finally {
        issuer.release();
        await closeServer(maap.server);
        await closeServer(issuer.server);
      }
    });
  });
});
