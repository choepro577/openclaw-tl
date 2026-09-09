import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ClawHubTrustErrorCodes,
  ErrorCodes,
  type ErrorShape,
} from "../../../packages/gateway-protocol/src/index.js";
import type {
  GatewayRequestContext,
  GatewayRequestHandler,
} from "../../gateway/server-methods/types.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount } from "../accounts/account-store.js";
import { ENTERPRISE_ADMIN_AUTH_COOKIE, ENTERPRISE_USER_AUTH_COOKIE } from "../auth/cookie.js";
import { issueEnterpriseCsrfToken, issueEnterpriseJwt } from "../auth/jwt.js";
import { createEnterpriseSession } from "../auth/session-store.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";
import {
  createEnterpriseCodexPluginRequest,
  getEnterpriseCodexPluginRequest,
  transitionEnterpriseCodexPluginRequest,
  upsertEnterpriseCodexPluginGrant,
} from "./codex-plugin-store.js";
import {
  enterpriseExtensionHttpTestHooks,
  handleEnterpriseExtensionHttpRequest,
} from "./enterprise-extension-http.js";
import {
  createEnterprisePluginRequest,
  getEnterprisePluginRequest,
  listEnterpriseAccountPluginGrants,
} from "./extension-store.js";

const publicCatalog = vi.hoisted(() => vi.fn());
vi.mock("./codex-public-catalog.js", () => ({ listCodexPublicCatalog: publicCatalog }));

const installHandler = vi.hoisted(() => vi.fn<GatewayRequestHandler>());
vi.mock("../../gateway/server-methods/plugins.js", () => ({
  pluginsHandlers: { "plugins.install": installHandler },
}));
vi.mock("../../plugins/installed-plugin-index-records.js", () => ({
  loadInstalledPluginIndexInstallRecordsSync: () => ({}),
}));
vi.mock("../../plugins/management-service.js", () => ({
  listManagedPlugins: async () => ({ plugins: [] }),
}));
vi.mock("./extension-service.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./extension-service.js")>()),
  revalidateEnterprisePluginRequestArtifact: async () => undefined,
}));

afterEach(() => {
  installHandler.mockReset();
  publicCatalog.mockReset();
  closeOpenClawStateDatabaseForTest();
});

it("fences Codex cancellation by account, CSRF, revision and idempotency", async () => {
  await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
    const config = { enterprise: { enabled: true, userExtensions: { enabled: true } } };
    const accounts = ["codex-owner", "codex-other"].map((username) =>
      createEnterpriseAccount({
        username,
        displayName: username,
        passwordHash: "test-only",
        role: "employee",
        mustChangePassword: false,
      }),
    );
    const credentials = accounts.map((account) => {
      const session = createEnterpriseSession(account.id, {}, "user");
      return {
        cookie: `${ENTERPRISE_USER_AUTH_COOKIE}=${issueEnterpriseJwt({ accountId: account.id, audience: "user", ...session })}`,
        csrf: issueEnterpriseCsrfToken(session.sessionId, "user"),
      };
    });
    const request = createEnterpriseCodexPluginRequest({
      requesterAccountId: accounts[0]!.id,
      agentKey: "personal",
      runtimeAgentId: resolveEnterprisePersonalAgentId(config, accounts[0]!),
      pluginName: "gmail",
      marketplaceName: "openai-curated-remote",
      requestKind: "install",
      catalogSnapshot: {},
      capabilitySnapshot: {},
      capabilityDigest: "reviewed",
    });
    const pathname = `/api/enterprise/user/v2/extensions/codex/requests/${request.id}/cancel`;
    const server = createServer((req, res) => {
      void handleEnterpriseExtensionHttpRequest({ req, res, config, pathname });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("TEST_SERVER_ADDRESS_UNAVAILABLE");
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const cancel = (actor: number, key: string, csrf = true, revision = request.revision) =>
        fetch(`${baseUrl}${pathname}`, {
          method: "POST",
          headers: {
            origin: baseUrl,
            "sec-fetch-site": "same-origin",
            "content-type": "application/json",
            cookie: credentials[actor]!.cookie,
            "idempotency-key": key,
            ...(csrf ? { "x-csrf-token": credentials[actor]!.csrf } : {}),
          },
          body: JSON.stringify({ baseRevision: revision }),
        });
      expect((await cancel(1, "other-account")).status).toBe(404);
      expect((await cancel(0, "missing-csrf", false)).status).toBe(403);
      expect((await cancel(0, "stale-revision", true, request.revision + 1)).status).toBe(409);
      expect(getEnterpriseCodexPluginRequest(request.id)?.state).toBe("pending");
      const accepted = await cancel(0, "owner-cancel");
      expect(accepted.status).toBe(200);
      const body = await accepted.json();
      expect(body.request.state).toBe("cancelled");
      const replay = await cancel(0, "owner-cancel");
      expect(replay.status).toBe(200);
      expect(replay.headers.get("Idempotency-Replayed")).toBe("true");
      expect(await replay.json()).toEqual(body);
      expect(getEnterpriseCodexPluginRequest(request.id)?.revision).toBe(request.revision + 1);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});

it("fences Codex MCP connect by grant revision before opening OAuth", async () => {
  await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
    const config = { enterprise: { enabled: true, userExtensions: { enabled: true } } };
    const account = createEnterpriseAccount({
      username: "codex-connect-owner",
      displayName: "Codex Connect Owner",
      passwordHash: "test-only",
      role: "employee",
      mustChangePassword: false,
    });
    const session = createEnterpriseSession(account.id, {}, "user");
    const cookie = `${ENTERPRISE_USER_AUTH_COOKIE}=${issueEnterpriseJwt({ accountId: account.id, audience: "user", ...session })}`;
    const request = createEnterpriseCodexPluginRequest({
      requesterAccountId: account.id,
      agentKey: "personal",
      runtimeAgentId: resolveEnterprisePersonalAgentId(config, account),
      pluginName: "gmail",
      marketplaceName: "openai-curated-remote",
      requestKind: "install",
      catalogSnapshot: {},
      capabilitySnapshot: { mcpServers: ["gmail-server"] },
      capabilityDigest: "reviewed",
    });
    const available = transitionEnterpriseCodexPluginRequest({
      id: request.id,
      baseRevision: request.revision,
      from: ["pending"],
      to: "available",
      installedPluginId: "gmail@openai-curated-remote",
    });
    const grant = upsertEnterpriseCodexPluginGrant({
      accountId: account.id,
      agentKey: "personal",
      runtimeAgentId: available.runtimeAgentId,
      pluginName: available.pluginName,
      marketplaceName: available.marketplaceName,
      remotePluginId: available.remotePluginId,
      installedPluginId: available.installedPluginId,
      capabilitySnapshot: available.capabilitySnapshot,
      capabilityDigest: available.capabilityDigest,
      sourceRequestId: available.id,
      state: "active",
    });
    const pathname = `/api/enterprise/user/v2/extensions/codex/grants/${grant.id}/connect`;
    const server = createServer((req, res) => {
      void handleEnterpriseExtensionHttpRequest({ req, res, config, pathname });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("TEST_SERVER_ADDRESS_UNAVAILABLE");
      }
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const response = await fetch(`${baseUrl}${pathname}`, {
        method: "POST",
        headers: {
          origin: baseUrl,
          "sec-fetch-site": "same-origin",
          "content-type": "application/json",
          cookie,
          "x-csrf-token": issueEnterpriseCsrfToken(session.sessionId, "user"),
          "idempotency-key": "codex-connect-stale-revision",
        },
        body: JSON.stringify({
          baseRevision: grant.revision + 1,
          serverName: "gmail-server",
        }),
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code: "CODEX_PLUGIN_REVISION_CONFLICT" });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});

describe("Enterprise Admin plugin approval HTTP errors", () => {
  const cases: Array<{ name: string; error: ErrorShape | Error; status: number; body: object }> = [
    {
      name: "preserves the public install failure and details",
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: "Package requires compiled runtime output for TypeScript entry ./src/index.ts.",
        details: { reason: "INVALID_OPENCLAW_EXTENSIONS" },
      },
      status: 400,
      body: {
        code: ErrorCodes.INVALID_REQUEST,
        message: "Package requires compiled runtime output for TypeScript entry ./src/index.ts.",
        details: { reason: "INVALID_OPENCLAW_EXTENSIONS" },
      },
    },
    {
      name: "keeps trust acknowledgement conflicts actionable",
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: "ClawHub risk acknowledgement is required.",
        details: { clawhubTrustCode: ClawHubTrustErrorCodes.RISK_ACKNOWLEDGEMENT_REQUIRED },
      },
      status: 409,
      body: {
        code: ErrorCodes.INVALID_REQUEST,
        message: "ClawHub risk acknowledgement is required.",
        details: { clawhubTrustCode: ClawHubTrustErrorCodes.RISK_ACKNOWLEDGEMENT_REQUIRED },
      },
    },
    {
      name: "preserves an unavailable install service without inventing details",
      error: { code: ErrorCodes.UNAVAILABLE, message: "Plugin registry is unavailable." },
      status: 503,
      body: { code: ErrorCodes.UNAVAILABLE, message: "Plugin registry is unavailable." },
    },
    {
      name: "does not expose unexpected internal errors",
      error: new Error("private installer diagnostic"),
      status: 500,
      body: { code: "ENTERPRISE_EXTENSION_INTERNAL_ERROR", message: "Extension request failed." },
    },
  ];

  it.each(cases)("$name", async ({ error, status, body }) => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "plugin-reviewer",
        displayName: "Plugin Reviewer",
        passwordHash: "test-only",
        role: "administrator",
        mustChangePassword: false,
      });
      const session = createEnterpriseSession(account.id, {}, "admin");
      const token = issueEnterpriseJwt({ accountId: account.id, audience: "admin", ...session });
      const request = createEnterprisePluginRequest({
        requesterAccountId: account.id,
        packageName: "@acme/native",
        packageFamily: "code_plugin",
        exactVersion: "1.0.0",
        integrity: "sha256:artifact",
        requestKind: "install",
        trustSnapshot: { disposition: "clean" },
        capabilitySnapshot: {},
        capabilityDigest: "capability-digest",
      });
      installHandler.mockImplementation(async ({ respond }) => {
        if (error instanceof Error) {
          throw error;
        }
        respond(false, undefined, error);
      });
      const pathname = `/api/enterprise/admin/plugin-requests/${request.id}/approve`;
      const server = createServer((req, res) => {
        void handleEnterpriseExtensionHttpRequest({
          req,
          res,
          config: { enterprise: { enabled: true, userExtensions: { enabled: true } } },
          pathname,
          getGatewayContext: () => ({}) as GatewayRequestContext,
        });
      });
      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
      });
      try {
        const address = server.address();
        if (!address || typeof address === "string") {
          throw new Error("TEST_SERVER_ADDRESS_UNAVAILABLE");
        }
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const response = await fetch(`${baseUrl}${pathname}`, {
          method: "POST",
          headers: {
            origin: baseUrl,
            "sec-fetch-site": "same-origin",
            "content-type": "application/json",
            cookie: `${ENTERPRISE_ADMIN_AUTH_COOKIE}=${token}`,
            "x-csrf-token": issueEnterpriseCsrfToken(session.sessionId, "admin"),
            "idempotency-key": "install-error-probe",
            "x-request-id": "approval-probe",
          },
          body: JSON.stringify({ baseRevision: request.revision }),
        });
        expect(response.status).toBe(status);
        expect(await response.json()).toEqual({ ...body, requestId: "approval-probe" });
        expect(getEnterprisePluginRequest(request.id)?.state).toBe("install_failed");
        expect(listEnterpriseAccountPluginGrants(account.id)).toEqual([]);
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((closeError) => (closeError ? reject(closeError) : resolve()));
        });
      }
    });
  });
});

describe("Enterprise User extension DTO boundary", () => {
  it("does not expose account, runtime Agent, filesystem, or capability internals", () => {
    const skill = enterpriseExtensionHttpTestHooks.presentUserSkillInstall({
      id: "install-1",
      accountId: "account-secret",
      agentKey: "personal",
      runtimeAgentId: "runtime-secret",
      clawhubRef: "calendar",
      skillName: "calendar",
      exactVersion: "1.0.0",
      integrity: "sha256:artifact",
      relativePath: "skills/calendar",
      treeHash: "sha256:tree",
      enabled: true,
      state: "ready",
      safeErrorCode: null,
      revision: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    const request = enterpriseExtensionHttpTestHooks.presentUserPluginRequest({
      id: "request-1",
      requesterAccountId: "account-secret",
      packageName: "native",
      packageFamily: "code_plugin",
      exactVersion: "1.0.0",
      integrity: "sha256:artifact",
      requestKind: "install",
      trustSnapshot: { internal: true },
      capabilitySnapshot: { secrets: true },
      capabilityDigest: "capability-secret",
      state: "pending",
      installedPluginId: null,
      reviewerAccountId: null,
      decisionReason: null,
      safeErrorCode: null,
      revision: 1,
      createdAt: 1,
      updatedAt: 1,
      decidedAt: null,
    });

    expect(skill).not.toHaveProperty("accountId");
    expect(skill).not.toHaveProperty("runtimeAgentId");
    expect(skill).not.toHaveProperty("relativePath");
    expect(skill).not.toHaveProperty("treeHash");
    expect(request).not.toHaveProperty("requesterAccountId");
    expect(request).not.toHaveProperty("trustSnapshot");
    expect(request).not.toHaveProperty("capabilitySnapshot");
    expect(request).not.toHaveProperty("capabilityDigest");
  });
});

describe("Enterprise User public Codex catalog access", () => {
  it.each([
    {
      name: "authorized personal agent",
      auth: true,
      enabled: true,
      agent: "personal",
      status: 200,
    },
    { name: "unauthenticated request", auth: false, enabled: true, agent: "personal", status: 401 },
    {
      name: "unknown shared agent",
      auth: true,
      enabled: true,
      agent: "shared:unknown",
      status: 404,
    },
    { name: "invalid agent key", auth: true, enabled: true, agent: "other", status: 422 },
    { name: "disabled feature", auth: true, enabled: false, agent: "personal", status: 404 },
  ])("enforces $name before fetching public metadata", async ({ auth, enabled, agent, status }) => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "catalog-reader",
        displayName: "Catalog Reader",
        passwordHash: "test-only",
        role: "employee",
        mustChangePassword: false,
      });
      const session = createEnterpriseSession(account.id, {}, "user");
      const token = issueEnterpriseJwt({ accountId: account.id, audience: "user", ...session });
      const catalog = {
        status: "available",
        items: [{ id: "linear", name: "Linear", description: "Plan", category: "Productivity" }],
      };
      publicCatalog.mockResolvedValue(catalog);
      const pathname = "/api/enterprise/user/v2/extensions/codex-catalog";
      const server = createServer((req, res) => {
        void handleEnterpriseExtensionHttpRequest({
          req,
          res,
          pathname,
          config: { enterprise: { enabled: true, userExtensions: { enabled } } },
        });
      });
      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
      });
      try {
        const address = server.address();
        if (!address || typeof address === "string") {
          throw new Error("TEST_SERVER_ADDRESS_UNAVAILABLE");
        }
        const response = await fetch(
          `http://127.0.0.1:${address.port}${pathname}?agentKey=${agent}&query=linear`,
          {
            headers: auth ? { cookie: `${ENTERPRISE_USER_AUTH_COOKIE}=${token}` } : {},
          },
        );
        expect(response.status).toBe(status);
        if (status === 200) {
          expect(await response.json()).toEqual(catalog);
          expect(publicCatalog).toHaveBeenCalledWith("linear");
        } else {
          expect(publicCatalog).not.toHaveBeenCalled();
        }
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    });
  });
});
