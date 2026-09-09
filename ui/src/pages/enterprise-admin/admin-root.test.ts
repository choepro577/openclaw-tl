/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  loadEnterprisePortalMe: vi.fn(),
  loginEnterprisePortal: vi.fn(),
}));

vi.mock("../enterprise/services/enterprise-api.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../enterprise/services/enterprise-api.ts")>();
  return {
    ...actual,
    loadEnterprisePortalMe: apiMocks.loadEnterprisePortalMe,
    loginEnterprisePortal: apiMocks.loginEnterprisePortal,
  };
});

import { i18n } from "../../i18n/index.ts";
import { EnterpriseApiError } from "../enterprise/services/enterprise-api.ts";
import { EnterpriseAdminRoot } from "./admin-root.ts";

const account = {
  id: "admin-1",
  profileId: "profile-1",
  username: "qaadmin",
  displayName: "QA Admin",
  role: "administrator" as const,
  mustChangePassword: true,
  enabled: true,
  personalAgentEnabled: false,
  defaultAgentId: null,
  accessPresetKey: "administrator",
  policyRevision: 1,
  createdAt: 1,
  updatedAt: 1,
  lastLoginAt: null,
};

describe("Enterprise admin login", () => {
  let root: EnterpriseAdminRoot;

  beforeEach(async () => {
    await i18n.setLocale("en");
    history.replaceState({}, "", "/admin/login");
    apiMocks.loadEnterprisePortalMe.mockRejectedValue(
      new EnterpriseApiError(401, "UNAUTHENTICATED", "Authentication required"),
    );
    apiMocks.loginEnterprisePortal.mockResolvedValue({ account });
    root = new EnterpriseAdminRoot();
    document.body.append(root);
  });

  afterEach(async () => {
    root.remove();
    await i18n.setLocale("en");
    vi.clearAllMocks();
  });

  it("switches login copy through the shared preference without losing entered credentials", async () => {
    await vi.waitFor(() => expect(root.querySelector("form")).not.toBeNull());
    const username = root.querySelector<HTMLInputElement>('[name="username"]')!;
    username.value = "qaadmin";
    const picker = root.querySelector<HTMLSelectElement>('select[aria-label="Language"]')!;
    picker.value = "vi";
    picker.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() =>
      expect(root.querySelector("h1")?.textContent).toBe("Đăng nhập quản trị"),
    );
    expect(localStorage.getItem("openclaw.i18n.locale")).toBe("vi");
    expect(document.documentElement.lang).toBe("vi");
    expect(root.querySelector<HTMLInputElement>('[name="username"]')?.value).toBe("qaadmin");
    picker.value = "en";
    picker.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() =>
      expect(root.querySelector("h1")?.textContent).toBe("Administrator sign-in"),
    );
    expect(localStorage.getItem("openclaw.i18n.locale")).toBe("en");
  });

  it("updates a visible API error when the language changes", async () => {
    apiMocks.loginEnterprisePortal.mockRejectedValue(
      new EnterpriseApiError(401, "INVALID_CREDENTIALS", "Username hoặc mật khẩu không đúng."),
    );
    await vi.waitFor(() => expect(root.querySelector("form")).not.toBeNull());
    root
      .querySelector("form")!
      .dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() =>
      expect(root.querySelector('[role="alert"]')?.textContent).toContain("password"),
    );
    const englishError = root.querySelector('[role="alert"]')!.textContent;
    await i18n.setLocale("vi");
    await root.updateComplete;
    expect(root.querySelector('[role="alert"]')?.textContent).toContain("mật khẩu");
    expect(root.querySelector('[role="alert"]')?.textContent).not.toBe(englishError);
  });

  it("places language after the form and reveals the password without losing its value", async () => {
    await vi.waitFor(() => expect(root.querySelector("form")).not.toBeNull());
    const form = root.querySelector("form")!;
    const picker = root.querySelector('select[aria-label="Language"]')!;
    expect(form.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const password = root.querySelector<HTMLInputElement>('[name="password"]')!;
    password.value = "temporary-password";
    password.dispatchEvent(new Event("input", { bubbles: true }));
    root.querySelector<HTMLButtonElement>('[aria-label="Show password"]')!.click();
    await root.updateComplete;

    expect(root.querySelector<HTMLInputElement>('[name="password"]')?.type).toBe("text");
    expect(root.querySelector<HTMLInputElement>('[name="password"]')?.value).toBe(
      "temporary-password",
    );
    expect(root.querySelector('[aria-label="Hide password"]')).not.toBeNull();
  });

  it("keeps the submitted form reference valid after the async login changes the page", async () => {
    await vi.waitFor(() => expect(root.querySelector("form")).not.toBeNull());
    const form = root.querySelector("form");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Expected the admin login form");
    }
    const username = form.elements.namedItem("username");
    const password = form.elements.namedItem("password");
    if (!(username instanceof HTMLInputElement) || !(password instanceof HTMLInputElement)) {
      throw new Error("Expected admin login inputs");
    }
    username.value = "qaadmin";
    password.value = "temporary-password";

    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(root.querySelector("h1")?.textContent).toBe("Change password"));
    expect(apiMocks.loginEnterprisePortal).toHaveBeenCalledWith(
      "admin",
      "qaadmin",
      "temporary-password",
    );
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});
