/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  loginEnterpriseUser: vi.fn(),
  loadThienlyAuthConfig: vi.fn(),
}));

vi.mock("../services/user-enterprise-api.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/user-enterprise-api.ts")>();
  return { ...actual, loginEnterpriseUser: authMocks.loginEnterpriseUser };
});

vi.mock("../services/user-thienly-auth.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/user-thienly-auth.ts")>();
  return { ...actual, loadThienlyAuthConfig: authMocks.loadThienlyAuthConfig };
});

import { i18n } from "../../../i18n/index.ts";
import { EnterpriseUserLoginPage } from "./user-login-page.ts";

describe("Enterprise user login", () => {
  let page: EnterpriseUserLoginPage;

  beforeEach(async () => {
    await i18n.setLocale("en");
    authMocks.loadThienlyAuthConfig.mockResolvedValue({ enabled: false });
    authMocks.loginEnterpriseUser.mockResolvedValue({ account: { id: "user-1" } });
    page = new EnterpriseUserLoginPage();
    document.body.append(page);
    await page.updateComplete;
  });

  afterEach(async () => {
    page.remove();
    await i18n.setLocale("en");
    vi.clearAllMocks();
  });

  it("places language after the form and reveals the password without losing its value", async () => {
    const form = page.querySelector("form")!;
    const picker = page.querySelector('select[aria-label="Language"]')!;
    expect(form.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const password = page.querySelector<HTMLInputElement>('[name="password"]')!;
    password.value = "temporary-password";
    password.dispatchEvent(new Event("input", { bubbles: true }));
    page.querySelector<HTMLButtonElement>('[aria-label="Show password"]')!.click();
    await page.updateComplete;

    expect(page.querySelector<HTMLInputElement>('[name="password"]')?.type).toBe("text");
    expect(page.querySelector<HTMLInputElement>('[name="password"]')?.value).toBe(
      "temporary-password",
    );
    expect(page.querySelector('[aria-label="Hide password"]')).not.toBeNull();

    const username = page.querySelector<HTMLInputElement>('[name="username"]')!;
    username.value = " user-one ";
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() =>
      expect(authMocks.loginEnterpriseUser).toHaveBeenCalledWith("user-one", "temporary-password"),
    );
  });
});
