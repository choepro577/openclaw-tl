import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveMediaBuffer } from "../media/store.js";
import { authorizeGatewayConnect } from "./auth.js";
import { handleEnterpriseMediaUploadHttpRequest } from "./enterprise-media-upload.js";
import { verifyEnterpriseSocketToken } from "./enterprise-socket-auth.js";

vi.mock("../config/config.js", () => ({
  loadConfig: () => ({
    gateway: {
      trustedProxies: ["127.0.0.1"],
    },
  }),
}));

vi.mock("../media/store.js", () => ({
  saveMediaBuffer: vi.fn(),
}));

vi.mock("./enterprise-socket-auth.js", () => ({
  verifyEnterpriseSocketToken: vi.fn(),
}));

vi.mock("./auth.js", () => ({
  authorizeGatewayConnect: vi.fn(),
}));

type MockResponse = ServerResponse & {
  body: string;
  headers: Record<string, string>;
};

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

function makeOptionsRequest(params?: {
  origin?: string;
  requestHeaders?: string;
}): IncomingMessage {
  const req = Readable.from([]) as IncomingMessage & {
    method: string;
    url: string;
    headers: Record<string, string>;
    socket: { remoteAddress: string };
  };
  req.method = "OPTIONS";
  req.url = "/v1/enterprise/media/upload";
  req.headers = {
    host: "127.0.0.1:18789",
    ...(params?.origin ? { origin: params.origin } : {}),
    ...(params?.requestHeaders
      ? {
          "access-control-request-headers": params.requestHeaders,
        }
      : {}),
  };
  req.socket = { remoteAddress: "127.0.0.1" };
  return req;
}

async function makeMultipartRequest(params: {
  fileName: string;
  mimeType: string;
  content: Buffer;
  ownerCode?: string;
  authorization?: string;
}): Promise<IncomingMessage> {
  const formData = new FormData();
  formData.append(
    "file",
    new File([params.content], params.fileName, {
      type: params.mimeType,
    }),
  );
  if (typeof params.ownerCode === "string") {
    formData.append("ownerCode", params.ownerCode);
  }

  const request = new Request("http://127.0.0.1:18789/v1/enterprise/media/upload", {
    method: "POST",
    body: formData,
    headers: params.authorization
      ? {
          authorization: params.authorization,
        }
      : undefined,
  });
  const rawBody = Buffer.from(await request.arrayBuffer());

  const req = Readable.from([rawBody]) as IncomingMessage & {
    method: string;
    url: string;
    headers: Record<string, string>;
    socket: { remoteAddress: string };
  };
  req.method = "POST";
  req.url = "/v1/enterprise/media/upload";
  req.headers = {
    host: "127.0.0.1:18789",
    "content-type": request.headers.get("content-type") ?? "",
    ...(params.authorization
      ? {
          authorization: params.authorization,
        }
      : {}),
  };
  req.socket = { remoteAddress: "127.0.0.1" };
  return req;
}

describe("enterprise media upload http", () => {
  beforeEach(() => {
    vi.mocked(saveMediaBuffer).mockReset();
    vi.mocked(verifyEnterpriseSocketToken).mockReset();
    vi.mocked(authorizeGatewayConnect).mockReset();
    vi.mocked(verifyEnterpriseSocketToken).mockReturnValue({ ok: true });
    vi.mocked(authorizeGatewayConnect).mockResolvedValue({ ok: true });
  });

  it("handles CORS preflight OPTIONS", async () => {
    const req = makeOptionsRequest({
      origin: "http://localhost:5173",
      requestHeaders: "authorization, content-type",
    });
    const res = makeResponse();

    const handled = await handleEnterpriseMediaUploadHttpRequest(req, res, {
      auth: { mode: "token", token: "gateway-token", allowTailscale: false },
    });

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(204);
    expect(res.getHeader("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(String(res.getHeader("access-control-allow-methods"))).toContain("POST");
    expect(String(res.getHeader("access-control-allow-headers"))).toContain("authorization");
  });

  it("returns 401 when enterprise token and gateway token are both invalid", async () => {
    vi.mocked(verifyEnterpriseSocketToken).mockReturnValue({ ok: false });
    vi.mocked(authorizeGatewayConnect).mockResolvedValue({ ok: false });
    const req = await makeMultipartRequest({
      fileName: "sample.txt",
      mimeType: "text/plain",
      content: Buffer.from("hello", "utf-8"),
    });
    const res = makeResponse();

    const handled = await handleEnterpriseMediaUploadHttpRequest(req, res, {
      auth: { mode: "token", token: "gateway-token", allowTailscale: false },
    });

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(401);
    expect(res.getHeader("access-control-allow-origin")).toBe("*");
  });

  it("uploads multipart file and falls back ownerCode to dynamic when invalid", async () => {
    vi.mocked(saveMediaBuffer).mockResolvedValue({
      id: "sample-id",
      path: "/tmp/media/dynamic/sample-id.txt",
      size: 5,
      contentType: "text/plain",
    });
    const req = await makeMultipartRequest({
      fileName: "sample.txt",
      mimeType: "text/plain",
      content: Buffer.from("hello", "utf-8"),
      ownerCode: "../invalid",
      authorization: "Bearer ent_token_valid",
    });
    const res = makeResponse();

    const handled = await handleEnterpriseMediaUploadHttpRequest(req, res, {
      auth: { mode: "token", token: "gateway-token", allowTailscale: false },
    });

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(saveMediaBuffer).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveMediaBuffer).mock.calls[0]?.[2]).toBe("dynamic");
    const payload = parseResponseJson<{
      ok: boolean;
      path: string;
      mediaPath: string;
      url: string;
      ownerCodeResolved: string;
      sizeBytes: number;
      mimeType: string;
      fileName: string;
    }>(res);
    expect(payload.ok).toBe(true);
    expect(payload.ownerCodeResolved).toBe("dynamic");
    expect(payload.path).toBe("/tmp/media/dynamic/sample-id.txt");
    expect(payload.mediaPath).toBe("dynamic/sample-id");
    expect(payload.url).toBe("http://127.0.0.1:18789/media/dynamic/sample-id");
    expect(payload.sizeBytes).toBe(5);
    expect(payload.mimeType).toBe("text/plain");
    expect(payload.fileName).toBe("sample.txt");
  });

  it("returns 413 when uploaded file exceeds 5MB", async () => {
    const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    const req = await makeMultipartRequest({
      fileName: "big.bin",
      mimeType: "application/octet-stream",
      content: bigBuffer,
      ownerCode: "tl00275",
      authorization: "Bearer ent_token_valid",
    });
    const res = makeResponse();

    const handled = await handleEnterpriseMediaUploadHttpRequest(req, res, {
      auth: { mode: "token", token: "gateway-token", allowTailscale: false },
    });

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(413);
    expect(saveMediaBuffer).not.toHaveBeenCalled();
    const body = parseResponseJson<{ error?: { message?: string } }>(res);
    expect(body.error?.message).toContain("5MB");
  });
});
