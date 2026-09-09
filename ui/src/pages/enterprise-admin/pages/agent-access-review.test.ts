/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  EnterpriseAgentAccessRequest,
  EnterpriseAgentAccessRequestDetail,
} from "../agent-access-api.ts";

const api = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  list: vi.fn().mockResolvedValue([]),
  load: vi.fn(),
}));

vi.mock("../agent-access-api.ts", () => ({
  approveAdminAgentAccessRequest: api.approve,
  rejectAdminAgentAccessRequest: api.reject,
  listAdminAgentAccessRequests: api.list,
  loadAdminAgentAccessRequest: api.load,
}));

vi.mock("../../enterprise/services/enterprise-api.ts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../enterprise/services/enterprise-api.ts")>();
  return {
    ...actual,
    listAdminAgentCatalog: vi.fn().mockResolvedValue({
      shared: [],
      personal: [],
      catalogRevision: "catalog-1",
    }),
  };
});

import { EnterpriseAdminAgentsPage } from "./agents-page.ts";

type MutablePage = {
  accessRequestDetail?: EnterpriseAgentAccessRequestDetail;
  accessRequestRejectReason: string;
  accessRequests: EnterpriseAgentAccessRequest[];
  accessRequestsError: string;
  approveAccessRequest(): Promise<void>;
  rejectAccessRequest(): Promise<void>;
};

const pending = (): EnterpriseAgentAccessRequest => ({
  id: "request-1",
  requesterAccountId: "account-1",
  requester: { id: "account-1", username: "minh", displayName: "Minh" },
  agentKey: "shared:research",
  resourceKey: "agent:shared:research",
  agentId: "research",
  agent: {
    agentId: "research",
    name: "Research Agent",
    description: null,
    resourceKey: "agent:shared:research",
  },
  state: "pending",
  revision: 4,
  decisionReason: null,
  reviewerAccountId: null,
  createdAt: 1,
  updatedAt: 1,
  decidedAt: null,
});

afterEach(() => {
  api.approve.mockReset();
  api.reject.mockReset();
  api.list.mockReset().mockResolvedValue([]);
  api.load.mockReset();
});

describe("Enterprise admin Agent access review", () => {
  it("approves with the request revision and updates the queue from the response", async () => {
    const request = pending();
    api.approve.mockResolvedValue({ request: { ...request, state: "approved" } });
    const page = new EnterpriseAdminAgentsPage() as unknown as MutablePage;
    page.accessRequestDetail = { request };
    page.accessRequests = [request];

    await page.approveAccessRequest();

    expect(api.approve).toHaveBeenCalledWith(
      expect.objectContaining({ id: "request-1", revision: 4 }),
    );
    expect(api.list).not.toHaveBeenCalled();
    expect(api.load).not.toHaveBeenCalled();
    expect(page.accessRequests[0]?.state).toBe("approved");
    expect(page.accessRequestDetail?.request.state).toBe("approved");
  });

  it("requires a reason and sends it with the revision when rejecting", async () => {
    const request = pending();
    api.reject.mockResolvedValue({
      request: { ...request, state: "rejected", decisionReason: "Need manager approval." },
    });
    const page = new EnterpriseAdminAgentsPage() as unknown as MutablePage;
    page.accessRequestDetail = { request };
    page.accessRequests = [request];
    page.accessRequestRejectReason = " Need manager approval. ";

    await page.rejectAccessRequest();

    expect(api.reject).toHaveBeenCalledWith(
      expect.objectContaining({ id: "request-1", revision: 4 }),
      "Need manager approval.",
    );
    expect(api.list).not.toHaveBeenCalled();
    expect(api.load).not.toHaveBeenCalled();
    expect(page.accessRequests[0]?.state).toBe("rejected");
    expect(page.accessRequestDetail?.request.state).toBe("rejected");
  });

  it("keeps a conflict visible and retries with the refreshed revision", async () => {
    const request = pending();
    const refreshed = { ...request, revision: 5 };
    api.approve
      .mockRejectedValueOnce(new Error("REVISION_CONFLICT"))
      .mockResolvedValueOnce({ request: { ...refreshed, state: "approved" } });
    api.load.mockResolvedValue({ request: refreshed });
    const page = new EnterpriseAdminAgentsPage() as unknown as MutablePage;
    page.accessRequestDetail = { request };

    await page.approveAccessRequest();

    expect(page.accessRequestsError).toContain("REVISION_CONFLICT");
    expect(page.accessRequestDetail?.request.revision).toBe(5);

    await page.approveAccessRequest();

    expect(api.approve).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: "request-1", revision: 5 }),
    );
    expect(page.accessRequestDetail?.request.state).toBe("approved");
  });
});
