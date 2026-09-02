import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type { CronJob, CronJobCreate } from "../../cron/types.js";
import { createEnterpriseAccount } from "../../enterprise/accounts/account-store.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import {
  assertEnterpriseCronSpec,
  cronJobMatchesEnterpriseScope,
  readEnterpriseCronCallerScope,
  stampEnterpriseCronOwner,
} from "./enterprise-cron-scope.js";
import type { GatewayClient } from "./types.js";

afterEach(() => closeOpenClawStateDatabaseForTest());

function createInput(patch: Partial<CronJobCreate> = {}): CronJobCreate {
  return {
    agentId: "main",
    name: "Personal reminder",
    enabled: true,
    schedule: { kind: "every", everyMs: 60_000 },
    sessionTarget: "isolated",
    wakeMode: "now",
    payload: { kind: "agentTurn", message: "Prepare my update" },
    ...patch,
  };
}

describe("Enterprise cron caller scope", () => {
  it("stamps the authenticated owner and hides foreign or ownerless jobs", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "cron.owner",
        displayName: "Cron Owner",
        passwordHash: "test-password-hash",
        role: "employee",
        mustChangePassword: false,
      });
      const client = {
        connect: {
          minProtocol: 1,
          maxProtocol: 1,
          client: { id: "openclaw-control-ui", version: "test", platform: "test", mode: "webchat" },
          role: "operator",
          scopes: ["operator.read", "operator.write"],
        },
        authenticatedUserProfile: {
          profileId: account.profileId,
          displayName: account.displayName,
          hasAvatar: false,
          updatedAt: 1,
        },
        internal: {
          enterpriseSession: {
            sessionId: "enterprise-session",
            audience: "user",
            accountId: account.id,
            accountRole: account.role,
          },
        },
      } as GatewayClient;
      const scope = readEnterpriseCronCallerScope(client);
      expect(scope).toMatchObject({
        accountId: account.id,
        profileId: account.profileId,
        active: true,
      });

      const stamped = stampEnterpriseCronOwner(
        createInput({ owner: { accountId: "spoofed", agentId: "foreign" } }),
        scope,
      );
      expect(stamped.owner).toEqual({
        accountId: account.id,
        agentId: "main",
        sessionKey: `enterprise-account:${account.id}`,
      });
      expect(cronJobMatchesEnterpriseScope({ owner: stamped.owner } as CronJob, scope)).toBe(true);
      expect(
        cronJobMatchesEnterpriseScope(
          { owner: { accountId: "another-account", agentId: "main" } } as CronJob,
          scope,
        ),
      ).toBe(false);
      expect(cronJobMatchesEnterpriseScope({} as CronJob, scope)).toBe(false);
    });
  });

  it("allows only entitled isolated agent turns on time schedules", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "cron.policy",
        displayName: "Cron Policy",
        passwordHash: "test-password-hash",
        role: "employee",
        mustChangePassword: false,
      });
      const scope = {
        kind: "enterpriseUser" as const,
        accountId: account.id,
        profileId: account.profileId,
        accountRole: account.role,
        active: true,
      };
      const cfg = { agents: { entries: { main: {} } } } satisfies OpenClawConfig;
      expect(() =>
        assertEnterpriseCronSpec({ job: createInput() as CronJob, cfg, scope }),
      ).not.toThrow();
      for (const payload of [
        { kind: "systemEvent" as const, text: "unsafe" },
        { kind: "command" as const, argv: ["echo", "unsafe"] },
        { kind: "script" as const, script: "return true" },
        { kind: "heartbeat" as const },
      ]) {
        expect(() =>
          assertEnterpriseCronSpec({ job: createInput({ payload }) as CronJob, cfg, scope }),
        ).toThrow("agentTurn");
      }
      for (const schedule of [
        { kind: "on-exit" as const, command: "true" },
        { kind: "stream" as const, command: ["echo", "unsafe"] },
      ]) {
        expect(() =>
          assertEnterpriseCronSpec({ job: createInput({ schedule }) as CronJob, cfg, scope }),
        ).toThrow("time schedule");
      }
      expect(() =>
        assertEnterpriseCronSpec({
          job: createInput({ trigger: { script: "return true" } }) as CronJob,
          cfg,
          scope,
        }),
      ).toThrow("trigger scripts");
      expect(() =>
        assertEnterpriseCronSpec({
          job: createInput({ agentId: "finance" }) as CronJob,
          cfg,
          scope,
        }),
      ).toThrow("outside current entitlement");
      expect(() =>
        assertEnterpriseCronSpec({
          job: createInput({ agentId: "finance" }) as CronJob,
          cfg,
          scope,
          requireAgentEntitlement: false,
        }),
      ).not.toThrow();
      expect(() =>
        assertEnterpriseCronSpec({
          job: createInput({ sessionTarget: "main" }) as CronJob,
          cfg,
          scope,
        }),
      ).toThrow("isolated session");
    });
  });

  it("keeps a disabled connected account in a fail-closed Enterprise scope", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "cron.disabled",
        displayName: "Cron Disabled",
        passwordHash: "test-password-hash",
        role: "employee",
        mustChangePassword: false,
        enabled: false,
      });
      const client = {
        connect: {
          minProtocol: 1,
          maxProtocol: 1,
          client: { id: "openclaw-control-ui", version: "test", platform: "test", mode: "webchat" },
          role: "operator",
          scopes: ["operator.read", "operator.write"],
        },
        authenticatedUserProfile: {
          profileId: account.profileId,
          displayName: account.displayName,
          hasAvatar: false,
          updatedAt: 1,
        },
        internal: {
          enterpriseSession: {
            sessionId: "enterprise-session",
            audience: "user",
            accountId: account.id,
            accountRole: account.role,
          },
        },
      } as GatewayClient;

      const scope = readEnterpriseCronCallerScope(client);
      expect(scope).toMatchObject({ accountId: account.id, active: false });
      expect(
        cronJobMatchesEnterpriseScope(
          {
            owner: {
              accountId: account.id,
              agentId: "main",
              sessionKey: `enterprise-account:${account.id}`,
            },
          } as CronJob,
          scope,
        ),
      ).toBe(false);
      expect(() => stampEnterpriseCronOwner(createInput(), scope)).toThrow(
        "authority is no longer active",
      );
    });
  });
});
