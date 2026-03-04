import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMediaDir } from "../media/store.js";
import { handleEnterpriseMediaDownloadHttpRequest } from "./enterprise-media-download.js";

vi.mock("../media/store.js", () => ({
  getMediaDir: vi.fn(),
}));

type MockResponse = ServerResponse & {
  body: string;
  headers: Record<string, string>;
};

function makeRequest(params: {
  method: string;
  url: string;
  headers?: Record<string, string>;
}): IncomingMessage {
  const req = Readable.from([]) as IncomingMessage & {
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

describe("enterprise media download http", () => {
  let tmpRoot = "";

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-media-download-"));
    vi.mocked(getMediaDir).mockReturnValue(tmpRoot);
  });

  afterEach(async () => {
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("handles CORS preflight", async () => {
    const req = makeRequest({
      method: "OPTIONS",
      url: "/media/tl00275/sample.pdf",
    });
    const res = makeResponse();

    const handled = await handleEnterpriseMediaDownloadHttpRequest(req, res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(204);
    expect(res.getHeader("access-control-allow-origin")).toBe("*");
    expect(String(res.getHeader("access-control-allow-methods"))).toContain("GET");
    expect(String(res.getHeader("access-control-allow-methods"))).toContain("HEAD");
  });

  it("returns 400 for invalid filename traversal", async () => {
    const req = makeRequest({
      method: "GET",
      url: "/media/tl00275/%2E%2E%2Fsecret.txt",
    });
    const res = makeResponse();

    const handled = await handleEnterpriseMediaDownloadHttpRequest(req, res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when media file does not exist", async () => {
    await fs.mkdir(path.join(tmpRoot, "tl00275"), { recursive: true });
    const req = makeRequest({
      method: "GET",
      url: "/media/tl00275/missing.pdf",
    });
    const res = makeResponse();

    const handled = await handleEnterpriseMediaDownloadHttpRequest(req, res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
  });

  it("serves media file by owner/name", async () => {
    const ownerDir = path.join(tmpRoot, "tl00275");
    await fs.mkdir(ownerDir, { recursive: true });
    const filePath = path.join(ownerDir, "report.pdf");
    await fs.writeFile(filePath, Buffer.from("pdf-content", "utf-8"));

    const req = makeRequest({
      method: "GET",
      url: "/media/tl00275/report.pdf",
    });
    const res = makeResponse();

    const handled = await handleEnterpriseMediaDownloadHttpRequest(req, res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("pdf-content");
    expect(res.getHeader("content-type")).toBe("application/pdf");
    expect(res.getHeader("cache-control")).toBe("public, max-age=3600");
    expect(res.getHeader("x-content-type-options")).toBe("nosniff");
  });

  it("supports HEAD with forced download", async () => {
    const ownerDir = path.join(tmpRoot, "tl00275");
    await fs.mkdir(ownerDir, { recursive: true });
    const filePath = path.join(ownerDir, "report.pdf");
    await fs.writeFile(filePath, Buffer.from("pdf-content", "utf-8"));

    const req = makeRequest({
      method: "HEAD",
      url: "/media/tl00275/report.pdf?download=1",
    });
    const res = makeResponse();

    const handled = await handleEnterpriseMediaDownloadHttpRequest(req, res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("");
    expect(String(res.getHeader("content-disposition"))).toContain("attachment;");
    expect(String(res.getHeader("content-disposition"))).toContain("report.pdf");
  });
});
