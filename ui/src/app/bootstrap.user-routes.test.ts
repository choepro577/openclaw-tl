import { describe, expect, it, vi } from "vitest";
import { enterpriseUserRoutingProfile } from "../pages/enterprise-user/user-runtime-profile.ts";
import { bootstrapApplication } from "./bootstrap.ts";
import { loadSettings, saveSettings } from "./settings.ts";

describe("Enterprise User bootstrap location", () => {
  it.each([
    "/app/plugins",
    "/app/conversations",
    "/app/settings/account",
    "/app/help",
    "/app/agents/personal",
    "/app/agents/shared/research",
    "/app/automations/new",
  ])("preserves the explicit route %s instead of restoring the last chat", async (pathname) => {
    const previousSettings = loadSettings();
    const previousUrl = window.location.href;
    saveSettings({
      ...previousSettings,
      sessionKey: "agent:research:dashboard:conversation-1",
      lastActiveSessionKey: "agent:research:dashboard:conversation-1",
    });
    window.history.replaceState({}, "", `${pathname}?keep=yes#details`);
    const runtime = bootstrapApplication({
      basePathOverride: "/app",
      routingProfile: enterpriseUserRoutingProfile,
    });
    // This boundary is startup/history ownership; route data and transport
    // are downstream and must not need a live Gateway to preserve a URL.
    const gatewayStart = vi.spyOn(runtime.context.gateway, "start").mockImplementation(() => {});
    const routerStart = vi.spyOn(runtime.router, "start").mockResolvedValue();
    const routerNavigate = vi.spyOn(runtime.router, "navigate").mockResolvedValue();

    try {
      await runtime.start();

      expect(routerStart).toHaveBeenCalledOnce();
      expect(window.location.pathname).toBe(pathname);
      expect(window.location.search).toBe("?keep=yes");
      expect(window.location.hash).toBe("#details");
    } finally {
      runtime.stop();
      gatewayStart.mockRestore();
      routerStart.mockRestore();
      routerNavigate.mockRestore();
      saveSettings(previousSettings);
      window.history.replaceState({}, "", previousUrl);
    }
  });
});
