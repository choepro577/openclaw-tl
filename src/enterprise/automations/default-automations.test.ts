import { expectDefined } from "@openclaw/normalization-core";
import { afterEach, describe, expect, it } from "vitest";
import { loadCronJobsStoreSync, resolveCronJobsStorePath } from "../../cron/store.js";
import { resolveMemoryDreamingRunConfig } from "../../memory-host-sdk/dreaming-run-config.js";
import { resolveMemoryDreamingWorkspaces } from "../../memory-host-sdk/dreaming.js";
import {
  closeOpenClawStateDatabaseForTest,
  runOpenClawStateWriteTransaction,
} from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import {
  createEnterpriseAccount,
  deleteEnterpriseAccountForBootstrapRollback,
  getEnterpriseAccountByUsername,
  updateEnterpriseAccount,
} from "../accounts/account-store.js";
import { resolveEnterprisePersonalAgentId } from "../personal-agent/personal-agent-config.js";

const input = {
  username: "automation.owner",
  displayName: "Automation Owner",
  passwordHash: "unused",
  role: "employee" as const,
  mustChangePassword: false,
};
afterEach(() => closeOpenClawStateDatabaseForTest());

describe("new account maintenance automations", () => {
  it("commits two private defaults per account and restricts dreaming to the owning workspace", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async (state) => {
      const first = createEnterpriseAccount(input);
      const second = createEnterpriseAccount({ ...input, username: "automation.other" });
      const jobs = loadCronJobsStoreSync(resolveCronJobsStorePath()).jobs;
      expect(jobs).toHaveLength(4);
      const owned = jobs.filter((job) => job.owner?.accountId === first.id);
      expect(owned).toMatchObject([
        {
          name: "heartbeat-main",
          enabled: true,
          payload: { kind: "heartbeat" },
          schedule: { kind: "every", everyMs: 1_800_000 },
        },
        {
          name: "Memory Dreaming Promotion",
          enabled: true,
          payload: { kind: "agentTurn" },
          schedule: { kind: "cron", expr: "0 3 * * *" },
        },
      ]);
      expect(owned.every((job) => expectDefined(job.state.nextRunAtMs) > first.createdAt)).toBe(
        true,
      );
      const config = {
        enterprise: { enabled: true },
        agents: { entries: { main: { workspace: state.workspaceDir } } },
      };
      const agentId = resolveEnterprisePersonalAgentId(config, first);
      expect(owned.every((job) => job.agentId === agentId)).toBe(true);
      expect(
        jobs
          .filter((job) => job.owner?.accountId === second.id)
          .every((job) => job.agentId !== agentId),
      ).toBe(true);
      const context = { jobId: expectDefined(owned[1]).id, agentId };
      const scoped = await resolveMemoryDreamingRunConfig(config, context);
      const workspaces = resolveMemoryDreamingWorkspaces(scoped);
      expect(workspaces).toHaveLength(1);
      expect(expectDefined(workspaces[0]).agentIds).toEqual([agentId]);
      expect(expectDefined(workspaces[0]).workspaceDir).not.toBe(state.workspaceDir);
      deleteEnterpriseAccountForBootstrapRollback(second.id);
      expect(loadCronJobsStoreSync(resolveCronJobsStorePath()).jobs.map((job) => job.id)).toEqual(
        owned.map((job) => job.id),
      );
      updateEnterpriseAccount(first.id, { enabled: false });
      await expect(resolveMemoryDreamingRunConfig(config, context)).rejects.toThrow(/disabled/);
    });
  });

  it("rolls back defaults with the account when the enclosing transaction fails", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      expect(getEnterpriseAccountByUsername(input.username)).toBeUndefined();
      expect(() =>
        runOpenClawStateWriteTransaction(() => {
          createEnterpriseAccount(input);
          throw new Error("rollback");
        }),
      ).toThrow("rollback");
      expect(getEnterpriseAccountByUsername(input.username)).toBeUndefined();
      expect(loadCronJobsStoreSync(resolveCronJobsStorePath()).jobs).toEqual([]);
    });
  });
});
