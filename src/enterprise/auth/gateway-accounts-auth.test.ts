import type { IncomingMessage } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { authorizeWsControlUiGatewayConnect } from "../../gateway/auth.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import { createEnterpriseAccount, updateEnterpriseAccount } from "../accounts/account-store.js";
import { loginEnterpriseAccount } from "./auth-service.js";
import { ENTERPRISE_AUTH_COOKIE } from "./cookie.js";
import { hashEnterprisePassword } from "./password.js";

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

function request(cookie?: string): IncomingMessage {
  return {
    socket: { remoteAddress: "127.0.0.1" },
    headers: {
      host: "localhost:18789",
      origin: "http://localhost:18789",
      "sec-fetch-site": "same-origin",
      ...(cookie ? { cookie } : {}),
    },
  } as IncomingMessage;
}

describe("Gateway accounts auth", () => {
  it("accepts a revocable HttpOnly-cookie session and projects the durable profile", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "gateway.employee",
        displayName: "Gateway Employee",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
        mustChangePassword: false,
      });
      const login = await loginEnterpriseAccount("gateway.employee", "enterprise-password");
      const cookie = `${ENTERPRISE_AUTH_COOKIE}=${login.token}`;
      const originPolicy = {
        requestHost: "localhost:18789",
        origin: "http://localhost:18789",
        fetchSite: "same-origin",
      };

      await expect(
        authorizeWsControlUiGatewayConnect({
          auth: { mode: "accounts", allowTailscale: false },
          connectAuth: null,
          req: request(cookie),
          browserOriginPolicy: originPolicy,
        }),
      ).resolves.toMatchObject({
        ok: true,
        method: "accounts",
        user: account.username,
        profileId: account.profileId,
        accountRole: "employee",
      });

      updateEnterpriseAccount(account.id, { enabled: false });
      await expect(
        authorizeWsControlUiGatewayConnect({
          auth: { mode: "accounts", allowTailscale: false },
          connectAuth: null,
          req: request(cookie),
          browserOriginPolicy: originPolicy,
        }),
      ).resolves.toMatchObject({ ok: false, reason: "enterprise_session_invalid" });
    });
  });

  it("accepts an administrator session created for the user portal", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "gateway.admin",
        displayName: "Gateway Admin",
        passwordHash: await hashEnterprisePassword("enterprise-admin-password"),
        role: "administrator",
        mustChangePassword: false,
      });
      const login = await loginEnterpriseAccount(
        "gateway.admin",
        "enterprise-admin-password",
        {},
        "user",
      );

      await expect(
        authorizeWsControlUiGatewayConnect({
          auth: { mode: "accounts", allowTailscale: false },
          connectAuth: null,
          req: request(`${ENTERPRISE_AUTH_COOKIE}=${login.token}`),
          browserOriginPolicy: {
            requestHost: "localhost:18789",
            origin: "http://localhost:18789",
            fetchSite: "same-origin",
          },
        }),
      ).resolves.toMatchObject({
        ok: true,
        method: "accounts",
        user: account.username,
        profileId: account.profileId,
        accountRole: "administrator",
      });
    });
  });

  it("rejects missing cookies and forced-password-change accounts", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "gateway.first-login",
        displayName: "First Login",
        passwordHash: await hashEnterprisePassword("enterprise-password"),
        role: "employee",
      });
      const login = await loginEnterpriseAccount("gateway.first-login", "enterprise-password");
      const browserOriginPolicy = {
        requestHost: "localhost:18789",
        origin: "http://localhost:18789",
        fetchSite: "same-origin",
      };
      await expect(
        authorizeWsControlUiGatewayConnect({
          auth: { mode: "accounts", allowTailscale: false },
          connectAuth: null,
          req: request(),
          browserOriginPolicy,
        }),
      ).resolves.toMatchObject({ ok: false, reason: "enterprise_session_invalid" });
      await expect(
        authorizeWsControlUiGatewayConnect({
          auth: { mode: "accounts", allowTailscale: false },
          connectAuth: null,
          req: request(`${ENTERPRISE_AUTH_COOKIE}=${login.token}`),
          browserOriginPolicy,
        }),
      ).resolves.toMatchObject({
        ok: false,
        reason: "enterprise_password_change_required",
      });
    });
  });
});
