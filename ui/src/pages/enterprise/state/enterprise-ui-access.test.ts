import { afterEach, describe, expect, it } from "vitest";
import {
  enterpriseEnabledRouteIds,
  enterpriseUiCanShowHome,
  setEnterpriseUiAccountRole,
} from "./enterprise-ui-access.ts";

describe("Enterprise UI route access", () => {
  afterEach(() => {
    setEnterpriseUiAccountRole(undefined);
  });

  it("keeps the Plugins hub available to employees", () => {
    setEnterpriseUiAccountRole("employee");

    expect(
      enterpriseEnabledRouteIds(
        ["chat", "new-session", "sessions", "plugins", "cron", "config", "enterprise"],
        false,
      ),
    ).toEqual(["chat", "new-session", "sessions", "plugins", "cron", "enterprise"]);
  });

  it("shows Home only outside Enterprise or for administrators", () => {
    expect(enterpriseUiCanShowHome()).toBe(true);

    setEnterpriseUiAccountRole("employee");
    expect(enterpriseUiCanShowHome()).toBe(false);

    setEnterpriseUiAccountRole("administrator");
    expect(enterpriseUiCanShowHome()).toBe(true);
  });
});
