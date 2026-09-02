import { describe, expect, it } from "vitest";
import {
  shouldOpenEnterpriseLanding,
  shouldRedirectEnterpriseHome,
} from "./enterprise-auth-navigation.ts";

describe("Enterprise authentication landing", () => {
  it("opens the Enterprise portal after a fresh login from any OpenClaw route", () => {
    expect(shouldOpenEnterpriseLanding("login", "/chat/main/session-1")).toBe(true);
    expect(shouldOpenEnterpriseLanding("login", "/settings/agents")).toBe(true);
  });

  it("opens the Enterprise portal when a restored session starts at the app root", () => {
    expect(shouldOpenEnterpriseLanding("restore", "/")).toBe(true);
    expect(shouldOpenEnterpriseLanding("restore", "/openclaw/")).toBe(true);
  });

  it("preserves an explicit deep link for a restored session", () => {
    expect(shouldOpenEnterpriseLanding("restore", "/enterprise")).toBe(false);
    expect(shouldOpenEnterpriseLanding("restore", "/settings/agents")).toBe(false);
  });

  it("redirects employee Home paths without redirecting ordinary sessions", () => {
    expect(
      shouldRedirectEnterpriseHome({
        role: "employee",
        pathname: "/app/chat/main",
        basePath: "/app",
      }),
    ).toBe(true);
    expect(
      shouldRedirectEnterpriseHome({
        role: "employee",
        pathname: "/app/chat/main/main",
        basePath: "/app",
      }),
    ).toBe(true);
    expect(
      shouldRedirectEnterpriseHome({
        role: "employee",
        pathname: "/app/chat/main/greeting-session-82a0cf79",
        basePath: "/app",
      }),
    ).toBe(false);
    expect(
      shouldRedirectEnterpriseHome({
        role: "administrator",
        pathname: "/app/chat/main",
        basePath: "/app",
      }),
    ).toBe(false);
  });
});
