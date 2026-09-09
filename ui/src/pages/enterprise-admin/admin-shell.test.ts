/* @vitest-environment jsdom */

import { render, type TemplateResult } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "../../i18n/index.ts";
import { EnterpriseAdminShell } from "./admin-shell.ts";

describe("Enterprise Admin Config sidebar", () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    await i18n.setLocale("en");
    history.replaceState({}, "", "/admin/config/models/setup");
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => container.remove());

  it("keeps Config and Models active for Model Setup and renders all submenu routes", () => {
    const shell = new EnterpriseAdminShell();
    shell.page = "config-model-setup";
    const sidebar = (shell as unknown as { renderSidebar: () => TemplateResult }).renderSidebar();
    render(sidebar, container);

    const labels = Array.from(container.querySelectorAll(".ea-nav__subitem")).map((item) =>
      item.textContent?.trim(),
    );
    expect(labels).toEqual([
      "Tools",
      "Models",
      "System Config",
      "UI & Appearance",
      "Change History & Audit",
    ]);
    expect(container.querySelector(".ea-nav__item--active")?.textContent).toContain("Config");
    expect(container.querySelector(".ea-nav__subitem--active")?.textContent).toContain("Models");
  });
});
