/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../i18n/index.ts";
import type {
  EnterpriseDelegationPolicy,
  EnterpriseDelegationProfile,
} from "../../enterprise/services/enterprise-api.ts";
import {
  renderDelegationDashboard,
  renderDelegationProfileEditor,
} from "./agent-delegation-views.ts";

const policy: EnterpriseDelegationPolicy = {
  rollout: "shadow",
  routerModel: "test/router",
  autoThreshold: 0.9,
  clarifyThreshold: 0.7,
  minimumMargin: 0.15,
  maxDelegatesPerTurn: 3,
  eventRetentionDays: 90,
  revision: 2,
  updatedAt: 1,
};

const profile: EnterpriseDelegationProfile = {
  status: "draft",
  aliases: ["contract specialist"],
  handlingMode: "auto_when_certain",
  useWhen: ["Review a penalty clause", "Check contract obligations"],
  avoidWhen: [],
  requiredInputs: [],
};

let container: HTMLDivElement;

function findButton(label: string): HTMLButtonElement {
  const result = [...container.querySelectorAll("button")].find(
    (item) => item.textContent?.replace(/\s+/g, " ").trim() === label,
  );
  if (!result) {
    throw new Error(`Missing button: ${label}`);
  }
  return result;
}

describe("Enterprise delegation admin views", () => {
  beforeEach(async () => {
    await i18n.setLocale("en");
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    render(nothing, container);
    container.remove();
  });

  it("renders searchable, pageable activation exclusions and server log filters", () => {
    const onPreviewPage = vi.fn();
    const onPreviewExclusion = vi.fn();
    const onEventFilter = vi.fn();
    const rows = Array.from({ length: 26 }, (_, index) => ({
      accountId: `account-${index}`,
      username: `employee.${index}`,
      displayName: `Employee ${index}`,
      accountEnabled: true,
      personalAgentEnabled: true,
      agentId: "contracts",
      agentName: "Contract Agent",
      resourceKey: "agent:shared:contracts",
      assigned: true,
      effective: true,
      eligible: true,
      reasonCodes: [],
    }));
    render(
      renderDelegationDashboard({
        loading: false,
        busy: false,
        error: "",
        policy,
        availableModels: ["test/router"],
        routerModelAvailable: true,
        overview: {
          policy,
          accountsWithPersonalAgent: 26,
          assignments: 26,
          effectiveAssignments: 26,
          routableAssignments: 26,
          events: {
            totalEvents: 1,
            delegated: 1,
            clarified: 0,
            blocked: 0,
            failed: 0,
            averageLatencyMs: 5,
          },
        },
        events: [],
        eventTotal: 0,
        eventNextCursor: "50",
        eventFilters: {
          accountId: "",
          agentId: "",
          outcome: "",
          reasonCode: "",
          createdFrom: "",
          createdTo: "",
        },
        preview: {
          previewToken: "preview-1",
          expiresAt: Date.now() + 60_000,
          summary: {
            assignments: 26,
            eligible: 26,
            missingProfile: 0,
            blocked: 0,
            orphaned: 0,
            affectedUsers: 26,
          },
          rows,
        },
        previewExclusions: new Set(),
        previewQuery: "",
        previewPage: 0,
        onPolicy: vi.fn(),
        onEventFilter,
        onApplyEventFilters: vi.fn(),
        onLoadMoreEvents: vi.fn(),
        onSavePolicy: vi.fn(),
        onPreview: vi.fn(),
        onPreviewQuery: vi.fn(),
        onPreviewPage,
        onPreviewExclusion,
        onActivate: vi.fn(),
        onEmergencyOff: vi.fn(),
      }),
      container,
    );

    expect(container.querySelectorAll(".ea-preview-row")).toHaveLength(25);
    findButton("Next page").click();
    expect(onPreviewPage).toHaveBeenCalledWith(1);
    const exclusion = container.querySelector<HTMLInputElement>(
      ".ea-preview-row input[type='checkbox']",
    );
    exclusion?.click();
    expect(onPreviewExclusion).toHaveBeenCalledWith("account-0\u0000agent:shared:contracts", true);
    const accountFilter = [...container.querySelectorAll("label")]
      .find((label) => label.textContent?.includes("Account ID"))
      ?.querySelector("input");
    if (!(accountFilter instanceof HTMLInputElement)) {
      throw new Error("Missing account filter");
    }
    accountFilter.value = "account-0";
    accountFilter.dispatchEvent(new Event("input", { bubbles: true }));
    expect(onEventFilter).toHaveBeenCalledWith({ accountId: "account-0" });
  });

  it("shows an unsaved AI diff and structured simulator details without raw JSON", () => {
    render(
      renderDelegationProfileEditor({
        name: "Contract Agent",
        description: "Reviews contract risks and obligations for enterprise users.",
        profile,
        checklist: {
          description: true,
          useWhen: true,
          requiredInputs: true,
          routerModel: true,
          agentExists: true,
        },
        canActivate: true,
        dirty: true,
        busy: false,
        error: "",
        accounts: [],
        accountQuery: "",
        aiSuggested: true,
        source: {
          description: "Previous specialist description used before the AI suggestion.",
          profile: { ...profile, useWhen: [] },
        },
        simulationAccountId: "account-1",
        simulationPrompt: "Review contract 42",
        simulationResult: {
          outcome: "clarify",
          agentNames: ["Contract Agent"],
          decisionSource: "rule",
          reasonCode: "required_input_missing:contract_number",
          confidenceBand: "ambiguous",
          policyRevision: 2,
          profileRevisions: { contracts: "profile-2" },
          missingRequiredInput: {
            agentId: "contracts",
            id: "contract_number",
            label: "Contract number",
            question: "Which contract number should be reviewed?",
          },
        },
        onDescription: vi.fn(),
        onProfile: vi.fn(),
        onRequiredInputs: vi.fn(),
        onDraft: vi.fn(),
        onSave: vi.fn(),
        onUseCurrentVersion: vi.fn(),
        onAccountQuery: vi.fn(),
        onSearchAccounts: vi.fn(),
        onSimulationAccount: vi.fn(),
        onSimulationPrompt: vi.fn(),
        onSimulate: vi.fn(),
      }),
      container,
    );

    expect(container.textContent).toContain("AI suggestion has not been saved");
    expect(container.textContent).toContain("More information is required");
    expect(container.textContent).toContain("Which contract number should be reviewed?");
    expect(container.querySelector("pre")).toBeNull();
  });

  it("preserves and compares an administrator draft after a revision conflict", () => {
    const onUseCurrentVersion = vi.fn();
    render(
      renderDelegationProfileEditor({
        name: "Contract Agent",
        description: "My unsaved contract specialty description.",
        profile,
        checklist: {
          description: true,
          useWhen: true,
          requiredInputs: true,
          routerModel: true,
          agentExists: true,
        },
        canActivate: true,
        dirty: true,
        busy: false,
        error: "The profile changed elsewhere.",
        accounts: [],
        accountQuery: "",
        aiSuggested: false,
        conflict: {
          description: "Current description saved by another administrator.",
          profile: { ...profile, avoidWhen: ["Do not review personal letters"] },
          configHash: "current-hash",
        },
        simulationAccountId: "",
        simulationPrompt: "",
        onDescription: vi.fn(),
        onProfile: vi.fn(),
        onRequiredInputs: vi.fn(),
        onDraft: vi.fn(),
        onSave: vi.fn(),
        onUseCurrentVersion,
        onAccountQuery: vi.fn(),
        onSearchAccounts: vi.fn(),
        onSimulationAccount: vi.fn(),
        onSimulationPrompt: vi.fn(),
        onSimulate: vi.fn(),
      }),
      container,
    );

    expect(container.textContent).toContain("My unsaved contract specialty description.");
    expect(container.textContent).toContain("Current description saved by another administrator.");
    expect(
      container.querySelector("#ea-delegation-description")?.getAttribute("aria-describedby"),
    ).toBe("ea-delegation-description-help");
    findButton("Replace draft with current version").click();
    expect(onUseCurrentVersion).toHaveBeenCalledOnce();
  });
});
