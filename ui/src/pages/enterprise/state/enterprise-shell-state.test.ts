import { describe, expect, it } from "vitest";
import { resolveEnterpriseTab } from "./enterprise-shell-state.ts";

describe("Enterprise shell landing tab", () => {
  it("opens account administration first for administrators", () => {
    expect(resolveEnterpriseTab(undefined, "administrator")).toBe("accounts");
  });

  it("opens Personal Agent first for employees", () => {
    expect(resolveEnterpriseTab(undefined, "employee")).toBe("personal");
  });

  it("does not retain an administrator-only tab for employees", () => {
    expect(resolveEnterpriseTab("accounts", "employee")).toBe("personal");
    expect(resolveEnterpriseTab("management", "employee")).toBe("personal");
  });
});
