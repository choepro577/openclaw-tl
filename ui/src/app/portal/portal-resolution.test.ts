// @vitest-environment node
import { describe, expect, it } from "vitest";
import { enterprisePortalBasePath, resolvePortal } from "./portal-resolution.ts";

const v2 = { enabled: true, userPortalVersion: "v2" } as const;
const legacy = { enabled: true, userPortalVersion: "legacy" } as const;

describe("Enterprise portal resolution", () => {
  it("keeps non-Enterprise traffic on the unchanged Control UI", () => {
    expect(resolvePortal("/app/debug", null)).toEqual({ kind: "control" });
    expect(resolvePortal("/app", { enabled: false, userPortalVersion: "legacy" })).toEqual({
      kind: "control",
    });
  });

  it("dispatches Admin and User portals before starting a runtime", () => {
    expect(resolvePortal("/openclaw/admin", v2)).toEqual({ kind: "admin" });
    expect(resolvePortal("/openclaw/app", v2)).toEqual({ kind: "user-v2" });
    expect(resolvePortal("/openclaw/app", legacy)).toEqual({ kind: "user-legacy" });
  });

  it("preserves compatibility redirects and mount prefixes", () => {
    expect(resolvePortal("/openclaw/enterprise", v2)).toEqual({
      kind: "redirect",
      href: "/openclaw/admin",
    });
    expect(resolvePortal("/", v2)).toEqual({ kind: "redirect", href: "/app" });
    expect(enterprisePortalBasePath("/openclaw/app/agents")).toBe("/openclaw");
  });

  it("does not mistake a longer path segment for a portal", () => {
    expect(enterprisePortalBasePath("/application")).toBe("");
    expect(resolvePortal("/application", v2)).toEqual({
      kind: "redirect",
      href: "/app/application",
    });
  });
});
