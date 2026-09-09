import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeOpenClawStateDatabaseForTest,
  type OpenClawStateDatabaseOptions,
} from "../../state/openclaw-state-db.js";
import { createEnterpriseAccount, updateEnterpriseAccount } from "../accounts/account-store.js";
import { sharedAgentResourceKey } from "../entitlements/resource-keys.js";
import {
  approveEnterpriseAgentAccessRequest,
  cancelPendingEnterpriseAgentAccessRequestsForResource,
  createEnterpriseAgentAccessRequest,
  findEnterpriseAgentAccessRequest,
  getEnterpriseAgentAccessRequest,
  listEnterpriseAgentAccessRequests,
  rejectEnterpriseAgentAccessRequest,
} from "./agent-access-request-store.js";

const directories: string[] = [];

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "openclaw-agent-access-"));
  directories.push(directory);
  const options: OpenClawStateDatabaseOptions = { path: join(directory, "state.sqlite") };
  const resourceKey = sharedAgentResourceKey("research");
  const requester = createEnterpriseAccount(
    {
      username: "access.requester",
      displayName: "Access Requester",
      passwordHash: "test-only",
      role: "employee",
      mustChangePassword: false,
    },
    options,
  );
  const reviewer = createEnterpriseAccount(
    {
      username: "access.reviewer",
      displayName: "Access Reviewer",
      passwordHash: "test-only",
      role: "administrator",
      mustChangePassword: false,
    },
    options,
  );
  return { options, resourceKey, requester, reviewer };
}

describe("Enterprise shared-agent access requests", () => {
  it("deduplicates pending requests, preserves rejection history, and reopens durably", () => {
    const { options, resourceKey, requester, reviewer } = fixture();
    const first = createEnterpriseAgentAccessRequest(
      { requesterAccountId: requester.id, agentId: "research", resourceKey },
      options,
    );
    expect(first).toMatchObject({ state: "pending", revision: 1 });
    expect(
      createEnterpriseAgentAccessRequest(
        { requesterAccountId: requester.id, agentId: "research", resourceKey },
        options,
      ).id,
    ).toBe(first.id);

    const rejected = rejectEnterpriseAgentAccessRequest(
      {
        requestId: first.id,
        reviewerAccountId: reviewer.id,
        baseRevision: first.revision,
        reason: "Need business owner approval.",
      },
      options,
    );
    expect(rejected).toMatchObject({ state: "rejected", revision: 2 });

    const resubmitted = createEnterpriseAgentAccessRequest(
      { requesterAccountId: requester.id, agentId: "research", resourceKey },
      options,
    );
    expect(resubmitted.id).not.toBe(first.id);
    expect(resubmitted).toMatchObject({ state: "pending", revision: 1 });
    expect(findEnterpriseAgentAccessRequest(requester.id, resourceKey, options)?.id).toBe(
      resubmitted.id,
    );

    closeOpenClawStateDatabaseForTest();
    expect(getEnterpriseAgentAccessRequest(first.id, options)).toMatchObject({
      id: first.id,
      state: "rejected",
      decisionReason: "Need business owner approval.",
    });
    expect(
      listEnterpriseAgentAccessRequests({ requesterAccountId: requester.id }, options),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.id, state: "rejected" }),
        expect.objectContaining({ id: resubmitted.id, state: "pending" }),
      ]),
    );
  });

  it("prioritizes pending over a rejected request when timestamps tie", () => {
    const { options, resourceKey, requester, reviewer } = fixture();
    const now = vi.spyOn(Date, "now").mockReturnValue(7_000);
    try {
      const first = createEnterpriseAgentAccessRequest(
        { requesterAccountId: requester.id, agentId: "research", resourceKey },
        options,
      );
      rejectEnterpriseAgentAccessRequest(
        {
          requestId: first.id,
          reviewerAccountId: reviewer.id,
          baseRevision: first.revision,
          reason: "Try again later.",
        },
        options,
      );
      const resubmitted = createEnterpriseAgentAccessRequest(
        { requesterAccountId: requester.id, agentId: "research", resourceKey },
        options,
      );
      expect(findEnterpriseAgentAccessRequest(requester.id, resourceKey, options)?.id).toBe(
        resubmitted.id,
      );
    } finally {
      now.mockRestore();
    }
  });

  it("grants and resolves atomically, and refuses a disabled requester", () => {
    const { options, resourceKey, requester, reviewer } = fixture();
    const pending = createEnterpriseAgentAccessRequest(
      { requesterAccountId: requester.id, agentId: "research", resourceKey },
      options,
    );
    updateEnterpriseAccount(requester.id, { enabled: false }, options);
    expect(() =>
      approveEnterpriseAgentAccessRequest(
        {
          requestId: pending.id,
          reviewerAccountId: reviewer.id,
          baseRevision: pending.revision,
        },
        options,
      ),
    ).toThrow("ACCOUNT_DISABLED");
    expect(getEnterpriseAgentAccessRequest(pending.id, options)).toMatchObject({
      state: "pending",
      revision: 1,
    });

    updateEnterpriseAccount(requester.id, { enabled: true }, options);
    const approved = approveEnterpriseAgentAccessRequest(
      {
        requestId: pending.id,
        reviewerAccountId: reviewer.id,
        baseRevision: pending.revision,
      },
      options,
    );
    expect(approved).toMatchObject({
      request: { id: pending.id, state: "approved", revision: 2 },
      entitlement: {
        accountId: requester.id,
        resourceType: "agent",
        resourceId: resourceKey,
        resourceState: "active",
        effect: "allow",
      },
    });
  });

  it("cancels pending requests when the shared Agent is removed", () => {
    const { options, resourceKey, requester } = fixture();
    const pending = createEnterpriseAgentAccessRequest(
      { requesterAccountId: requester.id, agentId: "research", resourceKey },
      options,
    );
    expect(
      cancelPendingEnterpriseAgentAccessRequestsForResource(resourceKey, "Agent removed", options),
    ).toBe(1);
    expect(getEnterpriseAgentAccessRequest(pending.id, options)).toMatchObject({
      state: "cancelled",
      revision: 2,
      decisionReason: "Agent removed",
    });
    const recreated = createEnterpriseAgentAccessRequest(
      { requesterAccountId: requester.id, agentId: "research", resourceKey },
      options,
    );
    expect(recreated.id).not.toBe(pending.id);
    expect(recreated.state).toBe("pending");
  });
});
