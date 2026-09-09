import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../i18n/index.ts";
import {
  adminHref,
  adminPathname,
  enterprisePortalBase,
  formatDate,
  navigateAdmin,
  resolveAdminPage,
} from "./utils.ts";

describe("Enterprise admin routing", () => {
  beforeEach(() => {
    globalThis.history.replaceState({}, "", "/ui/admin/accounts");
  });

  it("keeps the configured Control UI base outside the portal path", () => {
    expect(enterprisePortalBase()).toBe("/ui");
    expect(adminPathname()).toBe("/admin/accounts");
    expect(adminHref("/skills")).toBe("/ui/admin/skills");
  });

  it("derives the active sidebar item from deep links", () => {
    expect(resolveAdminPage("/admin/accounts")).toBe("accounts");
    expect(resolveAdminPage("/admin/agents?type=shared&agent=research")).toBe("agents");
    expect(resolveAdminPage("/admin/skills")).toBe("skills");
    expect(resolveAdminPage("/admin/config")).toBe("config-tools");
    expect(resolveAdminPage("/admin/tools-config")).toBe("config-tools");
    expect(resolveAdminPage("/admin/config/tools")).toBe("config-tools");
    expect(resolveAdminPage("/admin/config/models")).toBe("config-models");
    expect(resolveAdminPage("/admin/config/models/setup")).toBe("config-model-setup");
    expect(resolveAdminPage("/admin/config/system")).toBe("config-system");
    expect(resolveAdminPage("/admin/config/appearance")).toBe("config-appearance");
    expect(resolveAdminPage("/admin/config/history")).toBe("config-history");
  });

  it("formats timestamps using the selected language", async () => {
    const timestamp = 1_788_761_040_000;
    try {
      for (const locale of ["en", "vi"] as const) {
        await i18n.setLocale(locale);
        expect(formatDate(timestamp)).toBe(
          new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
            timestamp,
          ),
        );
      }
    } finally {
      await i18n.setLocale("en");
    }
  });

  it("updates history and publishes a navigation event", () => {
    const listener = vi.fn();
    globalThis.addEventListener("popstate", listener, { once: true });
    navigateAdmin("/agents");
    expect(globalThis.location.pathname).toBe("/ui/admin/agents");
    expect(listener).toHaveBeenCalledOnce();
  });
});
