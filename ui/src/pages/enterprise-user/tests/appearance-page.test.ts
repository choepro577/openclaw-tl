import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteId } from "../../../app-route-paths.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import { loadSettings, patchSettings } from "../../../app/settings.ts";
import { createApplicationContextProvider } from "../../../test-helpers/application-context.ts";
import "../pages/settings/appearance-page.ts";

type AppearancePageElement = HTMLElement & { updateComplete: Promise<unknown> };

describe("Enterprise User appearance parity", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    patchSettings({ accent: undefined, textScale: undefined, theme: "claw", themeMode: "system" });
  });

  afterEach(() => {
    document.body.replaceChildren();
    patchSettings({ accent: undefined, textScale: undefined, theme: "claw", themeMode: "system" });
    vi.restoreAllMocks();
  });

  it("uses the canonical theme, accent, and text-size controls", async () => {
    const refresh = vi.fn();
    const context = {
      theme: {
        mode: "system",
        refresh,
        setMode: vi.fn(),
        subscribe: () => () => undefined,
      },
    } as unknown as ApplicationContext<RouteId>;
    const provider = createApplicationContextProvider(context);
    const page = document.createElement("openclaw-user-appearance-page") as AppearancePageElement;
    provider.append(page);
    document.body.append(provider);
    await page.updateComplete;

    expect(page.querySelectorAll(".settings-theme-card")).toHaveLength(3);
    expect(page.querySelectorAll(".settings-accent-swatch").length).toBeGreaterThan(3);
    expect(page.querySelectorAll(".settings-text-scale__btn")).toHaveLength(5);

    page.querySelector<HTMLButtonElement>(".settings-theme-card--knot")!.click();
    expect(loadSettings().theme).toBe("knot");

    const textScale125 = [
      ...page.querySelectorAll<HTMLButtonElement>(".settings-text-scale__btn"),
    ].find((button) => button.textContent?.includes("125%"));
    textScale125!.click();
    expect(loadSettings().textScale).toBe(125);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
