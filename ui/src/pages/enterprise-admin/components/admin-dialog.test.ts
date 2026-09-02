/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawModalDialog } from "../../../components/modal-dialog.ts";
import { installDialogPolyfill } from "../../../test-helpers/modal-dialog.ts";
import { EnterpriseAdminDialog } from "./admin-dialog.ts";

let restoreDialogPolyfill: () => void;

describe("EnterpriseAdminDialog", () => {
  beforeEach(() => {
    restoreDialogPolyfill = installDialogPolyfill();
  });

  afterEach(() => {
    document.body.replaceChildren();
    restoreDialogPolyfill();
  });

  it("does not render modal content before open is true", async () => {
    const element = document.createElement(
      "openclaw-enterprise-admin-dialog",
    ) as EnterpriseAdminDialog;
    const form = document.createElement("form");
    form.textContent = "Create resource";
    element.append(form);
    document.body.append(element);

    await element.updateComplete;

    expect(element.open).toBe(false);
    expect(element.hasAttribute("open")).toBe(false);
    expect(element.shadowRoot?.querySelector("dialog")).toBeNull();
    expect(element.shadowRoot?.querySelector("slot")).toBeNull();
  });

  it("mounts on open and removes the dialog again on close", async () => {
    const element = document.createElement(
      "openclaw-enterprise-admin-dialog",
    ) as EnterpriseAdminDialog;
    element.heading = "Create resource";
    document.body.append(element);

    element.open = true;
    await element.updateComplete;

    expect(element.hasAttribute("open")).toBe(true);
    expect(
      element.shadowRoot?.querySelector<OpenClawModalDialog>("openclaw-modal-dialog")?.open,
    ).toBe(true);
    expect(element.shadowRoot?.querySelector("slot")).not.toBeNull();

    element.open = false;
    await element.updateComplete;

    expect(element.hasAttribute("open")).toBe(false);
    expect(element.shadowRoot?.querySelector("dialog")).toBeNull();
    expect(element.shadowRoot?.querySelector("slot")).toBeNull();
  });

  it("keeps the dialog open when a dirty-state guard rejects closing", async () => {
    const element = document.createElement(
      "openclaw-enterprise-admin-dialog",
    ) as EnterpriseAdminDialog;
    const onClose = vi.fn();
    element.open = true;
    element.canClose = () => false;
    element.onClose = onClose;
    document.body.append(element);
    await element.updateComplete;

    element.shadowRoot?.querySelector<HTMLButtonElement>("button[aria-label='Đóng']")?.click();

    expect(
      element.shadowRoot?.querySelector<OpenClawModalDialog>("openclaw-modal-dialog")?.open,
    ).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});
