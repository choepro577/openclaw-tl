/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import { captureI18nStateForTesting } from "../../../i18n/lib/translate.test-support.ts";
import type { EnterpriseAgentAccessRequest } from "../agent-access-api.ts";
import {
  renderAgentAccessRequestList,
  type AgentAccessRequestListFilter,
} from "./agent-access-request-views.ts";

const request = (state: EnterpriseAgentAccessRequest["state"]): EnterpriseAgentAccessRequest => ({
  id: `request-${state}`,
  requesterAccountId: "account-1",
  requester: { id: "account-1", username: "minh", displayName: "Minh" },
  agentKey: "shared:research",
  resourceKey: "agent:shared:research",
  agentId: "research",
  agent: {
    agentId: "research",
    name: "Research Agent",
    description: "Tìm và tổng hợp tài liệu.",
    resourceKey: "agent:shared:research",
  },
  state,
  revision: 2,
  decisionReason: state === "rejected" ? "Chưa phù hợp với vai trò hiện tại." : null,
  reviewerAccountId: state === "pending" ? null : "admin-1",
  createdAt: 1,
  updatedAt: 2,
  decidedAt: state === "pending" ? null : 3,
});

const container = document.createElement("div");
document.body.append(container);
let restoreI18n: (() => Promise<void>) | undefined;

beforeEach(async () => {
  restoreI18n = captureI18nStateForTesting();
  await i18n.setLocale("vi");
});

afterEach(async () => {
  render(nothing, container);
  await restoreI18n?.();
  restoreI18n = undefined;
});

function renderList(
  filter: AgentAccessRequestListFilter,
  items: EnterpriseAgentAccessRequest[],
  overrides: Partial<Parameters<typeof renderAgentAccessRequestList>[0]> = {},
) {
  let selected: EnterpriseAgentAccessRequest | undefined;
  render(
    renderAgentAccessRequestList({
      items,
      filter,
      loading: false,
      error: "",
      busyId: "",
      onFilter: () => undefined,
      onRefresh: () => undefined,
      onOpen: (item) => (selected = item),
      ...overrides,
    }),
    container,
  );
  return { selected: () => selected };
}

describe("Enterprise admin Agent access request list", () => {
  it("shows pending requests and opens their review", () => {
    const pending = request("pending");
    const { selected } = renderList("pending", [pending, request("approved")]);

    expect(container.textContent).toContain("Research Agent");
    expect(container.textContent).toContain("Đang chờ duyệt");
    expect(container.textContent).not.toContain("Đã cấp quyền");

    const button = container.querySelector<HTMLButtonElement>(".ea-table button");
    button?.click();
    expect(selected()).toBe(pending);
  });

  it("shows approval history separately", () => {
    renderList("history", [request("pending"), request("approved"), request("rejected")]);

    expect(container.textContent).toContain("Đã cấp quyền");
    expect(container.textContent).toContain("Đã từ chối");
    expect(container.textContent).not.toContain("Đang chờ duyệt");
    expect(container.textContent).toContain("Chưa phù hợp với vai trò hiện tại.");
  });

  it("keeps the list actionable while exposing loading and error states", () => {
    render(
      renderAgentAccessRequestList({
        items: [],
        filter: "pending",
        loading: true,
        error: "Không tải được yêu cầu.",
        busyId: "request-1",
        onFilter: () => undefined,
        onRefresh: () => undefined,
        onOpen: () => undefined,
      }),
      container,
    );

    expect(container.querySelector('[role="status"]')?.textContent).toContain("Đang tải");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Không tải được");
    expect(container.querySelector<HTMLButtonElement>(".ea-tabs .ea-button")?.disabled).toBe(true);
  });
});
