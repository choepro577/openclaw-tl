/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import { installDialogPolyfill } from "../../../test-helpers/modal-dialog.ts";
import type {
  EnterpriseAccount,
  EnterpriseAccessPreset,
} from "../../enterprise/services/enterprise-api.ts";

const enterpriseApiMocks = vi.hoisted(() => ({
  applyAdminAccessChanges: vi.fn(),
  listAdminAccounts: vi.fn(),
  loadAdminResourceAccess: vi.fn(),
}));

vi.mock("../../enterprise/services/enterprise-api.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../enterprise/services/enterprise-api.ts")>()),
  ...enterpriseApiMocks,
}));

import { EnterpriseAccessDialog } from "./access-dialog.ts";

const accessPresets: EnterpriseAccessPreset[] = [
  {
    key: "basic@1",
    label: "Quyền cơ bản",
    description: "Basic access",
    toolIds: ["read"],
  },
];

function account(id: string, username: string, displayName: string): EnterpriseAccount {
  return {
    id,
    profileId: `profile-${id}`,
    username,
    displayName,
    role: "employee",
    mustChangePassword: false,
    enabled: true,
    personalAgentEnabled: true,
    defaultAgentId: null,
    accessPresetKey: "basic@1",
    policyRevision: 3,
    createdAt: 1,
    updatedAt: 2,
    lastLoginAt: null,
  };
}

async function settle(element: EnterpriseAccessDialog): Promise<void> {
  await vi.waitFor(async () => {
    await element.updateComplete;
    expect(element.querySelectorAll(".ea-access-row").length).toBeGreaterThan(0);
  });
}

describe("EnterpriseAccessDialog", () => {
  let restoreDialogPolyfill: () => void;

  beforeEach(async () => {
    await i18n.setLocale("vi");
    vi.useFakeTimers();
    restoreDialogPolyfill = installDialogPolyfill();
    enterpriseApiMocks.listAdminAccounts.mockReset();
    enterpriseApiMocks.loadAdminResourceAccess.mockReset();
    enterpriseApiMocks.applyAdminAccessChanges.mockReset();
    enterpriseApiMocks.loadAdminResourceAccess.mockResolvedValue({
      resourceKey: "tool:core:write",
      assignments: [],
    });
  });

  afterEach(async () => {
    document.body.replaceChildren();
    vi.useRealTimers();
    vi.restoreAllMocks();
    restoreDialogPolyfill();
    await i18n.setLocale("en");
  });

  it("searches server-side and keeps an unsaved grant for a hidden account", async () => {
    const first = account("account-1", "hieu", "Hiếu DZ");
    const second = account("account-2", "nguyen.hieu", "Nguyễn Đức Hiếu");
    enterpriseApiMocks.listAdminAccounts
      .mockResolvedValueOnce({
        accounts: [first, second],
        pageInfo: { total: 2, nextCursor: null },
        accessPresets,
      })
      .mockResolvedValueOnce({
        accounts: [second],
        pageInfo: { total: 1, nextCursor: null },
        accessPresets,
      });
    enterpriseApiMocks.applyAdminAccessChanges.mockResolvedValue({ policyRevisions: {} });

    const element = document.createElement(
      "openclaw-enterprise-access-dialog",
    ) as EnterpriseAccessDialog;
    element.open = true;
    element.resourceType = "tool";
    element.resourceKey = "tool:core:write";
    element.resourceName = "write";
    document.body.append(element);
    await settle(element);

    const allow = element.querySelector<HTMLInputElement>(
      `input[name="access-${first.id}"][value="allow"]`,
    );
    expect(allow).not.toBeNull();
    allow!.checked = true;
    allow!.dispatchEvent(new Event("change", { bubbles: true }));

    const search = element.querySelector<HTMLInputElement>("input[type='search']");
    expect(search).not.toBeNull();
    search!.value = "nguyen";
    search!.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(250);
    await vi.waitFor(() => expect(enterpriseApiMocks.listAdminAccounts).toHaveBeenCalledTimes(2));
    await vi.waitFor(async () => {
      await element.updateComplete;
      expect(element.querySelectorAll(".ea-access-row")).toHaveLength(1);
    });

    expect(enterpriseApiMocks.listAdminAccounts).toHaveBeenLastCalledWith({
      role: "employee",
      limit: "100",
      query: "nguyen",
    });
    element.querySelector<HTMLButtonElement>("button.ea-button--primary")?.click();
    await vi.waitFor(() =>
      expect(enterpriseApiMocks.applyAdminAccessChanges).toHaveBeenCalledOnce(),
    );
    expect(enterpriseApiMocks.applyAdminAccessChanges).toHaveBeenCalledWith({
      changes: [
        {
          accountId: first.id,
          resourceType: "tool",
          resourceKey: "tool:core:write",
          effect: "allow",
        },
      ],
      baseRevisions: { [first.id]: first.policyRevision },
    });
  });
});
