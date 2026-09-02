import { describe, expect, it } from "vitest";
import { enterpriseUserRouteIdFromPath } from "../user-runtime-profile.ts";

describe("Enterprise User route allowlist", () => {
  it("matches only product routes", () => {
    expect(enterpriseUserRouteIdFromPath("/app", "/app")).toBe("enterprise");
    expect(enterpriseUserRouteIdFromPath("/app/agents", "/app")).toBe("enterprise");
    expect(enterpriseUserRouteIdFromPath("/app/agents/personal", "/app")).toBe("agents");
    expect(enterpriseUserRouteIdFromPath("/app/plugins", "/app")).toBe("plugins");
    expect(enterpriseUserRouteIdFromPath("/app/automations/new", "/app")).toBe("automation");
    expect(enterpriseUserRouteIdFromPath("/app/settings/account", "/app")).toBe("profile");
    expect(enterpriseUserRouteIdFromPath("/app/help", "/app")).toBe("about");
  });

  it.each(["debug", "logs", "config", "devices", "models", "terminal"])(
    "rejects direct operator route /app/%s",
    (route) => {
      expect(enterpriseUserRouteIdFromPath(`/app/${route}`, "/app")).toBeNull();
    },
  );

  it("keeps compatibility aliases inside the positive allowlist", () => {
    expect(enterpriseUserRouteIdFromPath("/app/enterprise", "/app")).toBe("enterprise");
    expect(enterpriseUserRouteIdFromPath("/app/settings/agents", "/app")).toBe("agents");
  });
});
