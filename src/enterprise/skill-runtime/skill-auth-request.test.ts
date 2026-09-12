import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelEnterpriseSkillAuthForChild,
  cancelEnterpriseSkillAuthRequest,
  claimEnterpriseSkillAuthRequest,
  onEnterpriseSkillAuthRequired,
  releaseEnterpriseSkillAuthRequest,
  resetEnterpriseSkillAuthRequestsForTest,
  resolveEnterpriseSkillAuthRequest,
  waitForEnterpriseSkillAuth,
} from "./skill-auth-request.js";

afterEach(() => {
  vi.useRealTimers();
  resetEnterpriseSkillAuthRequestsForTest();
});

function wait(timeoutMs = 5_000) {
  return waitForEnterpriseSkillAuth({
    accountId: "account-a",
    parentSessionKey: "parent-a",
    childSessionKey: "child-a",
    childRunId: "run-a",
    agentId: "purchase",
    skillKey: "purchase-order-skill",
    fields: [
      { id: "username", label: "User", type: "text" },
      { id: "password", label: "Password", type: "password" },
    ],
    timeoutMs,
  });
}

describe("Enterprise skill auth request broker", () => {
  it("rejects a late login when the admitted direct run has closed", async () => {
    let active = true;
    let requestId = "";
    onEnterpriseSkillAuthRequired((event) => {
      requestId = event.requestId;
    });
    const pending = waitForEnterpriseSkillAuth({
      accountId: "account-a",
      parentSessionKey: "direct-a",
      childSessionKey: "direct-a",
      childRunId: "run-a",
      delegatedChild: false,
      agentId: "purchase",
      skillKey: "purchase-order-skill",
      fields: [],
      assertActive: () => {
        if (!active) {
          throw new Error("run closed");
        }
      },
    });
    const result = expect(pending).rejects.toMatchObject({ code: "SKILL_AUTH_REVOKED" });
    active = false;
    expect(resolveEnterpriseSkillAuthRequest(requestId)).toBe(false);
    await result;
  });
  it("emits only structured metadata and resolves the exact waiter", async () => {
    let event: Parameters<Parameters<typeof onEnterpriseSkillAuthRequired>[0]>[0] | undefined;
    onEnterpriseSkillAuthRequired((value) => {
      event = value;
    });
    const pending = wait();
    expect(event).toMatchObject({
      accountId: "account-a",
      parentSessionKey: "parent-a",
      agentId: "purchase",
      skillKey: "purchase-order-skill",
    });
    expect(JSON.stringify(event)).not.toMatch(/authorization|token|arguments/i);
    expect(resolveEnterpriseSkillAuthRequest(event!.requestId)).toBe(true);
    await expect(pending).resolves.toBeUndefined();
    expect(resolveEnterpriseSkillAuthRequest(event!.requestId)).toBe(false);
  });

  it("binds claims and cancellation to account, session, and skill", async () => {
    let requestId = "";
    onEnterpriseSkillAuthRequired((event) => {
      requestId = event.requestId;
    });
    const pending = wait();
    expect(
      claimEnterpriseSkillAuthRequest({
        requestId,
        accountId: "other",
        parentSessionKey: "parent-a",
        skillKey: "purchase-order-skill",
      }),
    ).toMatchObject({ ok: false, code: "SKILL_AUTH_REQUEST_MISMATCH" });
    expect(
      claimEnterpriseSkillAuthRequest({
        requestId,
        accountId: "account-a",
        parentSessionKey: "parent-a",
        skillKey: "purchase-order-skill",
      }),
    ).toMatchObject({ ok: true });
    expect(
      claimEnterpriseSkillAuthRequest({
        requestId,
        accountId: "account-a",
        parentSessionKey: "parent-a",
        skillKey: "purchase-order-skill",
      }),
    ).toMatchObject({ ok: false, code: "SKILL_AUTH_REQUEST_BUSY" });
    releaseEnterpriseSkillAuthRequest(requestId);
    expect(
      cancelEnterpriseSkillAuthRequest({
        requestId,
        accountId: "account-a",
        parentSessionKey: "parent-a",
        skillKey: "purchase-order-skill",
      }),
    ).toBe(true);
    await expect(pending).rejects.toMatchObject({ code: "SKILL_AUTH_CANCELLED" });
  });

  it("rejects a waiting child on revoke and timeout", async () => {
    const revoked = wait();
    const revokedResult = expect(revoked).rejects.toMatchObject({ code: "SKILL_AUTH_REVOKED" });
    expect(cancelEnterpriseSkillAuthForChild("child-a", "run-a")).toBe(1);
    await revokedResult;

    vi.useFakeTimers();
    const timedOut = wait(1_000);
    const timedOutResult = expect(timedOut).rejects.toMatchObject({ code: "SKILL_AUTH_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(1_001);
    await timedOutResult;
  });
});
