/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDialogPolyfill } from "../../../test-helpers/modal-dialog.ts";
import type { EnterpriseAgentFile } from "../../enterprise/services/enterprise-api.ts";
import type { EnterpriseSharedRelationshipProfile } from "../../enterprise/services/enterprise-api.ts";
import { EnterpriseAdminAgentsPage } from "./agents-page.ts";

type MutableAgentPage = {
  selected: unknown;
  drawerTab: string;
  panelData: Record<string, unknown>;
  panelLoading: boolean;
  activeFile?: EnterpriseAgentFile;
  fileDraft: string;
  toolProfile: "minimal" | "coding" | "messaging" | "full" | null;
  toolAlsoAllow: string[];
  toolDeny: string[];
  relationshipAccountId: string;
  relationshipProfile?: EnterpriseSharedRelationshipProfile;
  relationshipSource?: EnterpriseSharedRelationshipProfile;
  loadPanel(): Promise<void>;
  render(): unknown;
};

let container: HTMLDivElement;
let restoreDialogPolyfill: () => void;

function button(label: string): HTMLButtonElement {
  const match = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent?.replace(/\s+/g, " ").trim() === label,
  );
  if (!match) {
    throw new Error(`Missing button: ${label}`);
  }
  return match;
}

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("Enterprise admin agent detail panels", () => {
  beforeEach(() => {
    restoreDialogPolyfill = installDialogPolyfill();
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    render(nothing, container);
    container.remove();
    restoreDialogPolyfill();
  });

  it("uses the canonical Agents settings layout in a wide detail drawer", () => {
    const page = new EnterpriseAdminAgentsPage() as unknown as MutableAgentPage;
    page.selected = {
      kind: "personal",
      value: {
        kind: "personal",
        instanceId: "personal:account-1",
        resourceKey: "agent:personal:account-1",
        accountId: "account-1",
        ownerDisplayName: "Personal User",
        username: "personal.user",
        enabled: true,
        runtimeAgentId: "main",
        model: "openai/gpt-5.6-sol",
        workspaceStatus: "ready",
        activeSessionCount: 1,
        skillCount: 4,
        toolCount: 7,
        updatedAt: 1,
      },
    };
    page.drawerTab = "overview";
    page.panelLoading = false;
    page.panelData = {
      agent: { name: "Personal User", thinkingDefault: "medium" },
      workspace: "/workspace/personal-user",
      defaults: { model: "openai/gpt-5.6-sol" },
    };

    render(page.render(), container);

    const drawer = container.querySelector("openclaw-enterprise-admin-dialog") as HTMLElement & {
      wide: boolean;
    };
    expect(drawer.wide).toBe(true);
    expect(container.querySelector(".enterprise-agent-hub-tabs")).not.toBeNull();
    expect(container.querySelector(".agent-identity-editor")).not.toBeNull();
    expect(container.querySelector(".callout.warn")).toBeNull();
    expect(
      Array.from(container.querySelectorAll(".settings-section__heading")).map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(["Identity", "Overview", "Model selection"]);
    expect(container.querySelector(".ea-kpis")).toBeNull();
  });

  it("opens the first core file as soon as the Files panel loads", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      return new Response(
        JSON.stringify(
          url.includes("?name=")
            ? {
                file: {
                  name: "AGENTS.md",
                  path: "/workspace/AGENTS.md",
                  missing: false,
                  size: 18,
                  updatedAt: 1,
                  writable: true,
                  content: "Agent instructions",
                  contentRevision: "revision-1",
                },
              }
            : {
                files: [
                  {
                    name: "AGENTS.md",
                    missing: false,
                    size: 18,
                    updatedAt: 1,
                    writable: true,
                  },
                  {
                    name: "SOUL.md",
                    missing: false,
                    size: 13,
                    updatedAt: 1,
                    writable: true,
                  },
                ],
              },
        ),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const page = new EnterpriseAdminAgentsPage() as unknown as MutableAgentPage;
    page.selected = {
      kind: "shared",
      value: {
        kind: "shared",
        agentId: "main",
        resourceKey: "agent:shared:main",
        name: "Main",
        model: null,
        workspace: "/workspace",
        runtimeType: "embedded",
        assignedUserCount: 0,
        skillCount: 0,
        toolCount: 0,
      },
    };
    page.drawerTab = "files";
    await page.loadPanel();
    render(page.render(), container);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/enterprise/admin/agents/shared/main/files?name=AGENTS.md"),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(container.querySelector<HTMLTextAreaElement>("textarea.ea-file-editor")?.value).toBe(
      "Agent instructions",
    );
    expect(
      container
        .querySelector('[id="enterprise-agent-files-tab-AGENTS.md"]')
        ?.getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("shows per-user names and the complete private workspace file manager", () => {
    const page = new EnterpriseAdminAgentsPage() as unknown as MutableAgentPage;
    const profile: EnterpriseSharedRelationshipProfile = {
      revision: 1,
      agentAlias: "Mây",
      agentSelfReference: "em",
      userAddress: "anh Minh",
      customInstructions: "Use a warm tone.",
      updatedAt: 10,
    };
    page.selected = {
      kind: "shared",
      value: {
        kind: "shared",
        agentId: "research",
        resourceKey: "agent:shared:research",
        name: "Research Agent",
        model: null,
        workspace: "/workspace",
        runtimeType: "embedded",
        assignedUserCount: 1,
        skillCount: 0,
        toolCount: 0,
      },
    };
    page.drawerTab = "relationships";
    page.panelLoading = false;
    page.relationshipAccountId = "account-1";
    page.relationshipProfile = { ...profile };
    page.relationshipSource = { ...profile };
    page.panelData = {
      relationship: {
        canonicalName: "Research Agent",
        items: [
          {
            accountId: "account-1",
            username: "minh",
            displayName: "Minh",
            role: "employee",
            enabled: true,
            assigned: true,
            effectiveName: "Mây",
            profile,
            workspace: "/private/account-1/research/workspace",
            files: [
              { name: "IDENTITY.md", missing: false, size: 10, updatedAt: 1, writable: true },
              { name: "MEMORY.md", missing: false, size: 12, updatedAt: 1, writable: true },
            ],
          },
        ],
      },
    };
    page.activeFile = {
      name: "MEMORY.md",
      path: "/private/account-1/research/workspace/MEMORY.md",
      missing: false,
      size: 12,
      updatedAt: 1,
      writable: true,
      content: "Private memory",
      contentRevision: "memory-revision",
    };
    page.fileDraft = "Private memory";

    render(page.render(), container);

    expect(container.textContent).toContain("Danh xưng của Minh");
    expect(container.textContent).toContain("Agent gốc: Research Agent");
    expect(container.querySelector<HTMLInputElement>('input[maxlength="64"]')?.value).toBe("Mây");
    expect(container.textContent).toContain("Files riêng của user");
    expect(container.textContent).toContain("Memory tách biệt");
    expect(container.querySelector<HTMLTextAreaElement>("textarea.ea-file-editor")?.value).toBe(
      "Private memory",
    );
  });

  it("does not render the redundant technical header above structured panels", () => {
    const page = new EnterpriseAdminAgentsPage() as unknown as MutableAgentPage;
    page.selected = {
      kind: "personal",
      value: {
        kind: "personal",
        instanceId: "personal:account-1",
        resourceKey: "agent:personal:account-1",
        accountId: "account-1",
        ownerDisplayName: "Personal User",
        username: "personal.user",
        enabled: true,
        runtimeAgentId: "main",
        model: null,
        workspaceStatus: "ready",
        skillCount: 0,
        toolCount: 0,
      },
    };
    page.drawerTab = "files";
    page.panelLoading = false;
    page.panelData = { files: [] };

    render(page.render(), container);

    expect(container.textContent).not.toContain("Dữ liệu lấy từ domain service thật");
    expect(container.querySelectorAll(".enterprise-agent-panel__content > .ea-card")).toHaveLength(
      1,
    );
  });

  it("renders a sanitized Markdown preview from the current file draft", async () => {
    const page = new EnterpriseAdminAgentsPage() as unknown as MutableAgentPage;
    page.selected = {
      kind: "shared",
      value: {
        kind: "shared",
        agentId: "main",
        resourceKey: "agent:shared:main",
        name: "Main",
        model: null,
        workspace: "/workspace",
        runtimeType: "embedded",
        assignedUserCount: 0,
        skillCount: 0,
        toolCount: 0,
      },
    };
    page.drawerTab = "files";
    page.panelLoading = false;
    page.panelData = {
      files: [
        {
          name: "SOUL.md",
          missing: false,
          size: 13,
          updatedAt: 1,
          writable: true,
        },
      ],
    };
    page.activeFile = {
      name: "SOUL.md",
      path: "/workspace/SOUL.md",
      missing: false,
      size: 13,
      updatedAt: 1,
      writable: true,
      content: "Original soul",
      contentRevision: "revision-1",
    };
    page.fileDraft = "# Draft soul\n\n**Hiện tại**\n\n<script>alert('unsafe')</script>";

    render(page.render(), container);

    const preview = container.querySelector(".md-preview-dialog__reader");
    expect(preview?.querySelector("h1")?.textContent).toBe("Draft soul");
    expect(preview?.querySelector("strong")?.textContent).toBe("Hiện tại");
    expect(preview?.querySelector("script")).toBeNull();

    button("Preview").click();
    await settle();
    expect(
      (container.querySelector("openclaw-modal-dialog") as HTMLElement & { open: boolean }).open,
    ).toBe(true);
  });

  it("renders an empty cron state with a create action instead of raw null", () => {
    const page = new EnterpriseAdminAgentsPage() as unknown as MutableAgentPage;
    page.selected = {
      kind: "shared",
      value: {
        kind: "shared",
        agentId: "main",
        resourceKey: "agent:shared:main",
        name: "Main",
        model: null,
        workspace: "/workspace",
        runtimeType: "embedded",
        assignedUserCount: 0,
        skillCount: 0,
        toolCount: 0,
      },
    };
    page.drawerTab = "cron";
    page.panelLoading = false;
    page.panelData = {
      cron: {
        available: true,
        status: { enabled: true, triggersEnabled: true, jobs: 0, nextWakeAtMs: null },
        jobs: [],
      },
    };

    render(page.render(), container);

    expect(container.textContent).toContain("Agent chưa có cron job.");
    expect(button("Tạo lịch")).toBeInstanceOf(HTMLButtonElement);
    expect(container.textContent).not.toContain("null");
    expect(container.querySelectorAll("openclaw-enterprise-admin-dialog")).toHaveLength(1);

    button("Tạo lịch").click();
    render(page.render(), container);

    expect(container.querySelectorAll("openclaw-enterprise-admin-dialog")).toHaveLength(2);
    expect(
      Array.from(container.querySelectorAll("openclaw-enterprise-admin-dialog")).some(
        (dialog) => (dialog as HTMLElement & { heading: string }).heading === "Tạo cron job",
      ),
    ).toBe(true);
  });

  it("fails closed instead of showing shared runtime data for a personal agent", () => {
    const page = new EnterpriseAdminAgentsPage() as unknown as MutableAgentPage;
    page.selected = {
      kind: "personal",
      value: {
        kind: "personal",
        instanceId: "personal:account-1",
        resourceKey: "agent:personal:account-1",
        accountId: "account-1",
        ownerDisplayName: "Personal User",
        username: "personal.user",
        enabled: true,
        runtimeAgentId: "main",
        model: null,
        workspaceStatus: "ready",
        skillCount: 0,
        toolCount: 0,
      },
    };
    page.drawerTab = "cron";
    page.panelLoading = false;
    page.panelData = {
      cron: {
        available: false,
        jobs: [],
        reason: "PERSONAL_RUNTIME_SCOPE_UNAVAILABLE",
      },
    };

    render(page.render(), container);

    expect(container.textContent).toContain("ownership");
    expect(container.textContent).not.toContain("Tạo lịch");
  });

  it("shows personal tool permission from the effective account-scoped inventory", () => {
    const page = new EnterpriseAdminAgentsPage() as unknown as MutableAgentPage;
    page.selected = {
      kind: "personal",
      value: {
        kind: "personal",
        instanceId: "personal:account-1",
        resourceKey: "agent:personal:account-1",
        accountId: "account-1",
        ownerDisplayName: "Personal User",
        username: "personal.user",
        enabled: true,
        runtimeAgentId: "main",
        model: null,
        workspaceStatus: "ready",
        skillCount: 0,
        toolCount: 7,
      },
    };
    page.drawerTab = "tools";
    page.panelLoading = false;
    page.toolProfile = "minimal";
    page.toolAlsoAllow = ["read", "write", "edit", "apply_patch", "exec", "process"];
    page.toolDeny = ["session_status", "gateway"];
    page.panelData = {
      accountId: "account-1",
      editable: true,
      policyRevision: 0,
      inheritedProfile: "minimal",
      lockedToolIds: ["gateway"],
      tools: {
        groups: [
          {
            id: "files",
            label: "Files",
            source: "core",
            tools: [
              { id: "read", description: "Read files" },
              { id: "write", description: "Write files" },
            ],
          },
          {
            id: "sessions",
            label: "Sessions",
            source: "core",
            tools: [{ id: "session_status", description: "Session status" }],
          },
          {
            id: "automation",
            label: "Automation",
            source: "core",
            tools: [
              { id: "gateway", description: "Manage gateway" },
              { id: "browser", description: "Use browser sidecar" },
            ],
          },
        ],
      },
      effectiveTools: {
        groups: [
          {
            id: "core",
            tools: [{ id: "read" }, { id: "write" }],
          },
        ],
      },
      sandboxState: {
        enabled: true,
        tools: [
          { id: "read", status: "open" },
          { id: "write", status: "open" },
          { id: "session_status", status: "blocked", reason: "ADMIN_POLICY_DENY" },
          { id: "gateway", status: "locked", reason: "ENTERPRISE_NON_DELEGABLE" },
          { id: "browser", status: "setup_required", reason: "SANDBOX_BROWSER_DISABLED" },
        ],
      },
    };

    render(page.render(), container);

    const permissions = Object.fromEntries(
      Array.from(container.querySelectorAll("tbody tr")).map((row) => [
        row.querySelector("strong")?.textContent?.trim(),
        row.querySelector(".ea-toggle-label span")?.textContent?.trim(),
      ]),
    );
    expect(permissions).toMatchObject({
      read: "Đã cấp",
      write: "Đã cấp",
      session_status: "Đã chặn",
      gateway: "Bị khóa",
    });
    const sandboxStates = Object.fromEntries(
      Array.from(container.querySelectorAll("tbody tr")).map((row) => [
        row.querySelector("strong")?.textContent?.trim(),
        row.querySelector(".ea-sandbox-state")?.textContent?.trim(),
      ]),
    );
    expect(sandboxStates).toMatchObject({
      read: "Sandbox đã mở",
      write: "Sandbox đã mở",
      session_status: "Sandbox đang chặn",
      gateway: "Bị khóa",
      browser: "Được cấp, cần cấu hình",
    });
    expect(container.querySelector<HTMLSelectElement>("select.ea-select")?.disabled).toBe(false);
    expect(
      Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).filter(
        (input) => input.disabled,
      ),
    ).toHaveLength(1);
    expect(container.textContent).toContain("không sửa shared template hoặc global config");
  });
});
