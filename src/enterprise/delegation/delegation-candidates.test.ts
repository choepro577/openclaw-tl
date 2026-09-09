import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import {
  createEnterpriseAccount,
  getEnterpriseAccountById,
  updateEnterpriseAccount,
} from "../accounts/account-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import { listEnterpriseDelegationCandidates } from "./delegation-candidates.js";
import {
  writeEnterpriseDelegationOverride,
  writeEnterpriseDelegationPolicy,
} from "./delegation-store.js";

const tempDirectories: string[] = [];

function stateOptions() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-enterprise-candidates-"));
  tempDirectories.push(directory);
  return { path: join(directory, "openclaw.sqlite") };
}

function configWithProfile(status: "draft" | "active" | "disabled" = "active"): OpenClawConfig {
  return {
    agents: {
      entries: {
        contracts: {
          name: "Agent Hợp đồng",
          description:
            "Chuyên kiểm tra điều khoản, rủi ro và nghĩa vụ trong hợp đồng doanh nghiệp.",
          delegationTarget: {
            status,
            aliases: ["chuyên gia hợp đồng"],
            handlingMode: "auto_when_certain",
            useWhen: [
              "Kiểm tra điều khoản phạt và trách nhiệm trong hợp đồng",
              "Đánh giá rủi ro trước khi ký một hợp đồng thương mại",
            ],
            avoidWhen: ["Soạn email chào mừng nhân viên mới"],
            requiredInputs: [],
          },
        },
      },
    },
  };
}

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("enterprise delegation candidate read model", () => {
  it("uses only the current account explicit assignment and never administrator visibility", () => {
    const options = stateOptions();
    const assigned = createEnterpriseAccount(
      {
        username: "assigned.employee",
        displayName: "Assigned Employee",
        passwordHash: "test-hash",
        role: "employee",
        initialEntitlements: [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("contracts"),
            effect: "allow",
          },
        ],
      },
      options,
    );
    const unassigned = createEnterpriseAccount(
      {
        username: "unassigned.employee",
        displayName: "Unassigned Employee",
        passwordHash: "test-hash",
        role: "employee",
      },
      options,
    );
    const administrator = createEnterpriseAccount(
      {
        username: "visible.admin",
        displayName: "Visible Admin",
        passwordHash: "test-hash",
        role: "administrator",
      },
      options,
    );
    writeEnterpriseDelegationPolicy(
      0,
      {
        rollout: "on",
        routerModel: "test/router-model",
        autoThreshold: 0.9,
        clarifyThreshold: 0.7,
        minimumMargin: 0.15,
        maxDelegatesPerTurn: 3,
        eventRetentionDays: 90,
      },
      options,
    );

    expect(
      listEnterpriseDelegationCandidates(configWithProfile(), assigned, options),
    ).toMatchObject([
      {
        agentId: "contracts",
        assigned: true,
        effective: true,
        routable: true,
        reasonCodes: [],
      },
    ]);
    expect(listEnterpriseDelegationCandidates(configWithProfile(), unassigned, options)).toEqual(
      [],
    );
    expect(listEnterpriseDelegationCandidates(configWithProfile(), administrator, options)).toEqual(
      [],
    );
  });

  it("computes account, Personal Agent, profile, deny, and override blockers server-side", () => {
    const options = stateOptions();
    const key = sharedAgentResourceKey("contracts");
    const account = createEnterpriseAccount(
      {
        username: "matrix.employee",
        displayName: "Matrix Employee",
        passwordHash: "test-hash",
        role: "employee",
        initialEntitlements: [{ resourceType: "agent", resourceId: key, effect: "allow" }],
      },
      options,
    );
    writeEnterpriseDelegationPolicy(
      0,
      {
        rollout: "on",
        routerModel: "test/router-model",
        autoThreshold: 0.9,
        clarifyThreshold: 0.7,
        minimumMargin: 0.15,
        maxDelegatesPerTurn: 3,
        eventRetentionDays: 90,
      },
      options,
    );

    expect(
      listEnterpriseDelegationCandidates(configWithProfile("draft"), account, options)[0],
    ).toMatchObject({ assigned: true, effective: true, routable: false });

    const override = writeEnterpriseDelegationOverride(
      {
        accountId: account.id,
        agentResourceKey: key,
        mode: "disabled",
        baseRevision: 0,
        baseAccountPolicyRevision: account.policyRevision,
      },
      options,
    );
    const afterOverride = getEnterpriseAccountById(account.id, options)!;
    expect(
      listEnterpriseDelegationCandidates(configWithProfile(), afterOverride, options)[0],
    ).toMatchObject({
      effective: true,
      routable: false,
      effectiveMode: "disabled",
      overrideRevision: override.override.revision,
    });

    updateEnterpriseAccount(account.id, { enabled: false }, options);
    const disabled = getEnterpriseAccountById(account.id, options)!;
    expect(
      listEnterpriseDelegationCandidates(configWithProfile(), disabled, options)[0],
    ).toMatchObject({ assigned: true, effective: false, routable: false });

    updateEnterpriseAccount(account.id, { enabled: true, personalAgentEnabled: false }, options);
    const noPersonal = getEnterpriseAccountById(account.id, options)!;
    expect(
      listEnterpriseDelegationCandidates(configWithProfile(), noPersonal, options)[0],
    ).toMatchObject({ assigned: true, effective: true, routable: false });
  });

  it("applies deny-wins even when two active keys normalize to the same Agent", () => {
    const options = stateOptions();
    const account = createEnterpriseAccount(
      {
        username: "deny.employee",
        displayName: "Deny Employee",
        passwordHash: "test-hash",
        role: "employee",
        initialEntitlements: [
          {
            resourceType: "agent",
            resourceId: sharedAgentResourceKey("contracts"),
            effect: "allow",
          },
          {
            resourceType: "agent",
            resourceId: "agent:shared:%63ontracts",
            effect: "deny",
          },
        ],
      },
      options,
    );
    writeEnterpriseDelegationPolicy(
      0,
      {
        rollout: "on",
        routerModel: "test/router-model",
        autoThreshold: 0.9,
        clarifyThreshold: 0.7,
        minimumMargin: 0.15,
        maxDelegatesPerTurn: 3,
        eventRetentionDays: 90,
      },
      options,
    );
    expect(
      listEnterpriseDelegationCandidates(configWithProfile(), account, options)[0],
    ).toMatchObject({
      assigned: true,
      effective: false,
      routable: false,
      reasonCodes: expect.arrayContaining(["explicit_deny"]),
    });
  });
});
