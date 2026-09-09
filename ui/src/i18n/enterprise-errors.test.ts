import { afterEach, describe, expect, it } from "vitest";
import { enterpriseErrorMessage } from "./enterprise-errors.ts";
import { i18n } from "./index.ts";

describe("enterpriseErrorMessage", () => {
  afterEach(async () => {
    await i18n.setLocale("en");
  });

  it("localizes stable auth and account codes in Vietnamese and English", async () => {
    await i18n.setLocale("vi");
    expect(
      enterpriseErrorMessage({ code: "INVALID_CREDENTIALS", message: "server detail" }, "fallback"),
    ).toBe("Username hoặc mật khẩu không đúng.");
    expect(
      enterpriseErrorMessage({ code: "ACCOUNT_NOT_FOUND", message: "server detail" }, "fallback"),
    ).toBe("Không tìm thấy tài khoản.");

    await i18n.setLocale("en");
    expect(
      enterpriseErrorMessage({ code: "PASSWORD_REUSE", message: "server detail" }, "fallback"),
    ).toBe("The new password must differ from your current password.");
  });

  it("keeps unknown server diagnostics and variable validation details", async () => {
    await i18n.setLocale("en");
    expect(
      enterpriseErrorMessage(
        { code: "FIELD_INVALID:displayName", message: "displayName must be a non-empty string" },
        "fallback",
      ),
    ).toBe("displayName must be a non-empty string");
    expect(
      enterpriseErrorMessage(
        { code: "VALIDATION_ERROR", message: "agentId is invalid" },
        "fallback",
      ),
    ).toBe("agentId is invalid");
    expect(enterpriseErrorMessage({ code: "NEW_SERVER_CODE" }, "fallback")).toBe("fallback");
  });

  it("accepts Error instances and safely falls back for malformed values", () => {
    expect(enterpriseErrorMessage(new Error("network failed"), "fallback")).toBe("network failed");
    expect(enterpriseErrorMessage({ code: "INVALID_CREDENTIALS" }, "fallback")).toBe(
      "Username or password is incorrect.",
    );
    expect(enterpriseErrorMessage(null, "fallback")).toBe("fallback");
    expect(enterpriseErrorMessage("server failed", "fallback")).toBe("server failed");
  });
});
