import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const entry = (name = "linear") => ({
  name,
  source: { source: "local", path: `./plugins/${name}` },
  policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
  category: "Productivity",
});
const manifest = {
  name: "linear",
  description: "Manage issues and projects",
  interface: { displayName: "Linear", shortDescription: "Plan and build products" },
  apps: "./.app.json",
};
const json = (value: unknown) => new Response(JSON.stringify(value));

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public Codex catalog", () => {
  it("reads official metadata, filters it, and shares a successful cache across queries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ plugins: [entry()] }))
      .mockResolvedValueOnce(json(manifest));
    vi.stubGlobal("fetch", fetchMock);
    const { listCodexPublicCatalog } = await import("./codex-public-catalog.js");
    const result = await listCodexPublicCatalog();
    expect(result).toEqual({
      status: "available",
      items: [
        {
          id: "linear",
          name: "Linear",
          description: "Plan and build products",
          category: "Productivity",
        },
      ],
    });
    expect(await listCodexPublicCatalog(" BUILD ")).toEqual(result);
    expect(await listCodexPublicCatalog("no-match")).toEqual({ status: "available", items: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]).toEqual([
      "https://raw.githubusercontent.com/openai/plugins/main/plugins/linear/.codex-plugin/plugin.json",
      expect.objectContaining({
        credentials: "omit",
        redirect: "error",
        headers: { accept: "application/json" },
      }),
    ]);
  });

  it("never fetches traversal paths, foreign sources, unavailable entries, or mismatched directories", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          plugins: [
            entry("../private"),
            { ...entry(), source: { source: "local", path: "https://private.example/secret" } },
            { ...entry(), source: { source: "git", path: "./plugins/linear" } },
            { ...entry(), source: { source: "local", path: "./plugins/other" } },
            { ...entry(), policy: { installation: "NOT_AVAILABLE" } },
            entry(),
          ],
        }),
      )
      .mockResolvedValueOnce(json(manifest));
    vi.stubGlobal("fetch", fetchMock);
    const { listCodexPublicCatalog } = await import("./codex-public-catalog.js");
    expect((await listCodexPublicCatalog()).items.map((item) => item.id)).toEqual(["linear"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a safe unavailable outcome and allows retry after an upstream failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("private network diagnostic"))
      .mockResolvedValueOnce(json({ plugins: [entry()] }))
      .mockResolvedValueOnce(json(manifest));
    vi.stubGlobal("fetch", fetchMock);
    const { listCodexPublicCatalog } = await import("./codex-public-catalog.js");
    expect(await listCodexPublicCatalog()).toEqual({ status: "unavailable", items: [] });
    expect((await listCodexPublicCatalog()).status).toBe("available");
  });

  it.each([
    ["oversized body", () => new Response("x".repeat(256 * 1024 + 1))],
    ["excessive entries", () => json({ plugins: Array.from({ length: 129 }, () => entry()) })],
    ["invalid catalog", () => json({ privateError: "internal details" })],
  ])("bounds and rejects %s", async (_name, response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));
    const { listCodexPublicCatalog } = await import("./codex-public-catalog.js");
    expect(await listCodexPublicCatalog()).toEqual({ status: "unavailable", items: [] });
  });
});
