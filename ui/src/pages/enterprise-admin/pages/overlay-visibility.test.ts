/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import { installDialogPolyfill } from "../../../test-helpers/modal-dialog.ts";
import type { EnterpriseAdminDialog } from "../components/admin-dialog.ts";
import { EnterpriseAdminAccountsPage } from "./accounts-page.ts";
import { EnterpriseAdminAgentsPage } from "./agents-page.ts";
import { EnterpriseAdminConfigHistoryPage } from "./config-history-page.ts";
import { EnterpriseAdminConfigToolsPage } from "./config-tools-page.ts";
import { EnterpriseAdminSkillsPage } from "./skills-page.ts";

let container: HTMLDivElement;
let restoreDialogPolyfill: () => void;

function button(label: string): HTMLButtonElement {
  const match = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent?.replace(/\s+/g, " ").trim() === label,
  );
  if (!match) {
    throw new Error(`Missing button: ${label}`);
  }
  return match;
}

describe("Enterprise admin overlay visibility", () => {
  beforeEach(async () => {
    await i18n.setLocale("vi");
    restoreDialogPolyfill = installDialogPolyfill();
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    await i18n.setLocale("en");
    render(nothing, container);
    container.remove();
    restoreDialogPolyfill();
  });

  it("mounts the account create modal only after clicking its create button", async () => {
    const page = new EnterpriseAdminAccountsPage();
    render(page.render(), container);

    expect(container.querySelector("openclaw-enterprise-admin-dialog")).toBeNull();

    button("Tạo tài khoản").click();
    render(page.render(), container);
    const dialog = container.querySelector<EnterpriseAdminDialog>(
      "openclaw-enterprise-admin-dialog",
    );
    await dialog?.updateComplete;

    expect(dialog?.open).toBe(true);
    expect(
      dialog?.shadowRoot?.querySelector<HTMLElement & { open: boolean }>("openclaw-modal-dialog")
        ?.open,
    ).toBe(true);
  });

  it("mounts and unmounts the shared-agent create modal with its controls", async () => {
    const page = new EnterpriseAdminAgentsPage();
    render(page.render(), container);

    expect(container.querySelector("openclaw-enterprise-admin-dialog")).toBeNull();

    button("Tạo agent dùng chung").click();
    render(page.render(), container);
    const dialog = container.querySelector<EnterpriseAdminDialog>(
      "openclaw-enterprise-admin-dialog",
    );
    await dialog?.updateComplete;

    expect(dialog?.open).toBe(true);
    expect(dialog?.querySelector("input[name='id']")).not.toBeNull();

    button("Hủy").click();
    render(page.render(), container);
    expect(container.querySelector("openclaw-enterprise-admin-dialog")).toBeNull();
  });

  it("keeps skill and tool access overlays out of the default page DOM", () => {
    render(new EnterpriseAdminSkillsPage().render(), container);
    expect(container.querySelector("openclaw-enterprise-access-dialog")).toBeNull();
    expect(container.querySelector("openclaw-enterprise-admin-dialog")).toBeNull();

    render(new EnterpriseAdminConfigToolsPage().render(), container);
    expect(container.querySelector("openclaw-enterprise-access-dialog")).toBeNull();
    expect(container.querySelector("openclaw-enterprise-admin-dialog")).toBeNull();
  });

  it("mounts rollback confirmation only after selecting a backup", async () => {
    const page = new EnterpriseAdminConfigHistoryPage();
    render(page.render(), container);
    expect(container.querySelector("openclaw-enterprise-admin-dialog")).toBeNull();

    const mutable = page as unknown as { rollbackSlot: number | null };
    mutable.rollbackSlot = 2;
    render(page.render(), container);
    const dialog = container.querySelector<EnterpriseAdminDialog>(
      "openclaw-enterprise-admin-dialog",
    );
    await dialog?.updateComplete;

    expect(dialog?.open).toBe(true);
    expect(dialog?.querySelector("input")).not.toBeNull();
    expect(container.textContent).toContain("ROLLBACK");
  });
});
