import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleEnterpriseAgentHttpRequest } from "./enterprise-agent-http.js";
import { ensureAgentProvisioned } from "./enterprise-agent-service.js";
import { issueEnterpriseSocketToken } from "./enterprise-socket-auth.js";
import { ensureEnterpriseWorkspaceScaffold } from "./enterprise-workspace-scaffold.js";

vi.mock("../config/config.js", () => ({
  loadConfig: () => ({
    gateway: {
      trustedProxies: ["127.0.0.1"],
    },
  }),
}));

vi.mock("./enterprise-agent-service.js", () => ({
  ensureAgentProvisioned: vi.fn(),
}));

vi.mock("./enterprise-socket-auth.js", () => ({
  issueEnterpriseSocketToken: vi.fn(),
}));

vi.mock("./enterprise-workspace-scaffold.js", () => ({
  ENTERPRISE_WORKSPACE_PROFILE: "enterprise-employee-v1",
  ENTERPRISE_WORKSPACE_FILE_NAMES: ["AGENTS.md", "SOUL.md", "TOOLS.md", "IDENTITY.md", "USER.md"],
  ensureEnterpriseWorkspaceScaffold: vi.fn(),
}));

type MockResponse = ServerResponse & {
  body: string;
  headers: Record<string, string>;
};

function makeRequest(params: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}): IncomingMessage {
  const chunks =
    params.body === undefined ? [] : [Buffer.from(JSON.stringify(params.body), "utf-8")];
  const req = Readable.from(chunks) as IncomingMessage & {
    method: string;
    url: string;
    headers: Record<string, string>;
    socket: { remoteAddress: string };
  };
  req.method = params.method;
  req.url = params.url;
  req.headers = {
    host: "127.0.0.1:18789",
    ...params.headers,
  };
  req.socket = { remoteAddress: "127.0.0.1" };
  return req;
}

function makeResponse(): MockResponse {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    body: "",
    headers,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = String(value);
      return this;
    },
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
    end(chunk?: string | Buffer) {
      this.body = chunk ? chunk.toString() : "";
      return this;
    },
  } as unknown as MockResponse;
  return res;
}

function parseResponseJson<T>(res: MockResponse): T {
  return JSON.parse(res.body) as T;
}

describe("enterprise agent http", () => {
  beforeEach(() => {
    vi.mocked(ensureAgentProvisioned).mockReset();
    vi.mocked(issueEnterpriseSocketToken).mockReset();
    vi.mocked(ensureEnterpriseWorkspaceScaffold).mockReset();
  });

  it("returns 401 when auth token is missing", async () => {
    const req = makeRequest({
      method: "POST",
      url: "/v1/enterprise/agents/ensure",
      body: { employeeCode: "NV001" },
    });
    const res = makeResponse();

    const handled = await handleEnterpriseAgentHttpRequest(req, res, {
      auth: { mode: "token", token: "service-token", allowTailscale: false },
    });

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(401);
    const body = parseResponseJson<{ error: { message: string; type: string } }>(res);
    expect(body.error.type).toBe("unauthorized");
  });

  it("returns 400 when employeeCode is blank", async () => {
    const req = makeRequest({
      method: "POST",
      url: "/v1/enterprise/agents/ensure",
      headers: {
        authorization: "Bearer service-token",
      },
      body: { employeeCode: "   " },
    });
    const res = makeResponse();

    const handled = await handleEnterpriseAgentHttpRequest(req, res, {
      auth: { mode: "token", token: "service-token", allowTailscale: false },
    });

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(400);
    const body = parseResponseJson<{ error: { message: string; type: string } }>(res);
    expect(body.error.type).toBe("invalid_request_error");
    expect(body.error.message).toContain("employeeCode is required");
  });

  it("returns scaffold metadata for created agent", async () => {
    vi.mocked(ensureAgentProvisioned).mockResolvedValue({
      status: "created",
      agentId: "nv00123",
      workspace: "/tmp/workspace-nv00123",
      config: {},
    });
    vi.mocked(ensureEnterpriseWorkspaceScaffold).mockResolvedValue({
      profile: "enterprise-employee-v1",
      createdFiles: ["AGENTS.md", "SOUL.md", "TOOLS.md", "IDENTITY.md", "USER.md"],
      existingFiles: [],
    });
    vi.mocked(issueEnterpriseSocketToken).mockReturnValue({
      token: "ent_token_created",
      expiresAtMs: 1760000000000,
    });

    const req = makeRequest({
      method: "POST",
      url: "/v1/enterprise/agents/ensure",
      headers: {
        authorization: "Bearer service-token",
      },
      body: {
        employeeCode: "NV00123",
        displayName: "Nguyen Van A",
      },
    });
    const res = makeResponse();

    await handleEnterpriseAgentHttpRequest(req, res, {
      auth: { mode: "token", token: "service-token", allowTailscale: false },
    });

    expect(res.statusCode).toBe(200);
    const body = parseResponseJson<{
      ok: boolean;
      status: string;
      agentId: string;
      workspace: string;
      socketToken: string;
      workspaceScaffold: {
        profile: string;
        createdFiles: string[];
        existingFiles: string[];
      };
    }>(res);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("created");
    expect(body.agentId).toBe("nv00123");
    expect(body.socketToken).toBe("ent_token_created");
    expect(body.workspaceScaffold.profile).toBe("enterprise-employee-v1");
    expect(body.workspaceScaffold.createdFiles).toEqual([
      "AGENTS.md",
      "SOUL.md",
      "TOOLS.md",
      "IDENTITY.md",
      "USER.md",
    ]);

    const ensureArgs = vi.mocked(ensureAgentProvisioned).mock.calls[0]?.[0] as
      | { identity?: unknown; ensureBootstrapFiles?: boolean }
      | undefined;
    expect(ensureArgs?.ensureBootstrapFiles).toBe(false);
    expect(ensureArgs?.identity).toBeUndefined();
  });

  it("returns existing status and backfill result for existing agent", async () => {
    vi.mocked(ensureAgentProvisioned).mockResolvedValue({
      status: "existing",
      agentId: "nv00999",
      workspace: "/tmp/workspace-nv00999",
      config: {},
    });
    vi.mocked(ensureEnterpriseWorkspaceScaffold).mockResolvedValue({
      profile: "enterprise-employee-v1",
      createdFiles: ["SOUL.md"],
      existingFiles: ["AGENTS.md", "TOOLS.md", "IDENTITY.md", "USER.md"],
    });
    vi.mocked(issueEnterpriseSocketToken).mockReturnValue({
      token: "ent_token_existing",
      expiresAtMs: 1760000000500,
    });

    const req = makeRequest({
      method: "POST",
      url: "/v1/enterprise/agents/ensure",
      headers: {
        authorization: "Bearer service-token",
      },
      body: {
        employeeCode: "NV00999",
        displayName: "Existing Employee",
      },
    });
    const res = makeResponse();

    await handleEnterpriseAgentHttpRequest(req, res, {
      auth: { mode: "token", token: "service-token", allowTailscale: false },
    });

    expect(res.statusCode).toBe(200);
    const body = parseResponseJson<{
      ok: boolean;
      status: string;
      workspaceScaffold: {
        createdFiles: string[];
        existingFiles: string[];
      };
    }>(res);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("existing");
    expect(body.workspaceScaffold.createdFiles).toEqual(["SOUL.md"]);
    expect(body.workspaceScaffold.existingFiles).toEqual([
      "AGENTS.md",
      "TOOLS.md",
      "IDENTITY.md",
      "USER.md",
    ]);
  });
});
