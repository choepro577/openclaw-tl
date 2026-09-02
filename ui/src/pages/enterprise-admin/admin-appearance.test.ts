/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  beginAdminAppearanceScope,
  loadAdminAppearance,
  saveAdminAppearance,
  testApi,
} from "./admin-appearance.ts";

describe("Enterprise Admin appearance", () => {
  beforeEach(() => {
    localStorage.clear();
    const root = document.documentElement;
    root.dataset.theme = "dark";
    root.dataset.themeMode = "dark";
    root.dataset.themeResolved = "dark";
    root.className = "wa-dark app-existing";
    root.setAttribute("style", "--control-ui-text-scale: 1.1; --existing: yes;");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("class");
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themeMode;
    delete document.documentElement.dataset.themeResolved;
  });

  it("persists in an Admin-only key, applies immediately, and restores the app root", () => {
    const finish = beginAdminAppearanceScope();
    const saved = saveAdminAppearance({
      theme: "knot",
      mode: "light",
      accent: "#52c99a",
      textScale: 125,
    });
    expect(saved).toEqual({
      theme: "knot",
      mode: "light",
      accent: "#52c99a",
      textScale: 125,
    });
    expect(localStorage.getItem(testApi.STORAGE_KEY)).toContain("#52c99a");
    expect(loadAdminAppearance()).toEqual(saved);
    expect(document.documentElement.dataset.theme).toBe("openknot-light");
    expect(document.documentElement.style.getPropertyValue("--control-ui-text-scale")).toBe("1.25");

    finish();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.className).toBe("wa-dark app-existing");
    expect(document.documentElement.style.getPropertyValue("--existing")).toBe("yes");
    expect(document.documentElement.style.getPropertyValue("--control-ui-text-scale")).toBe("1.1");
  });
});
