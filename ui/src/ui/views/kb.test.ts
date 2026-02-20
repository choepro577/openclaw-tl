import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import type { AgentKbEntry } from "../types.ts";
import { renderKb, type KbProps } from "./kb.ts";

const SAMPLE_ENTRIES: AgentKbEntry[] = [
  {
    type: "dir",
    name: "policies",
    path: "policies",
    parentPath: "",
  },
  {
    type: "dir",
    name: "hr",
    path: "policies/hr",
    parentPath: "policies",
  },
  {
    type: "file",
    name: "rules.md",
    path: "policies/hr/rules.md",
    parentPath: "policies/hr",
    size: 120,
    updatedAtMs: Date.now(),
  },
];

function createProps(overrides: Partial<KbProps> = {}): KbProps {
  return {
    loading: false,
    saving: false,
    deleting: false,
    syncing: false,
    syncAllStarting: false,
    extraPathsLoading: false,
    extraPathsSaving: false,
    error: null,
    tree: {
      kbRoot: "KB",
      entries: SAMPLE_ENTRIES,
    },
    expandedDirs: { "": true, policies: true, "policies/hr": true },
    agentsList: {
      defaultId: "main",
      mainKey: "main",
      scope: "all",
      agents: [
        {
          id: "main",
          name: "Main",
        },
      ],
    },
    selectedAgentId: "main",
    selectedPath: null,
    selectedType: null,
    fileDraft: "",
    fileContent: "",
    syncResult: null,
    syncAllStatus: null,
    extraPathsRows: [],
    kbPath: "/Users/test/.openclaw-dev/KB",
    onSelectAgent: () => undefined,
    onRefresh: () => undefined,
    onSelectEntry: () => undefined,
    onCreateFolder: () => undefined,
    onCreateFile: () => undefined,
    onUploadFile: () => undefined,
    onSaveFile: () => undefined,
    onDeletePath: () => undefined,
    onDraftChange: () => undefined,
    onSyncAgent: () => undefined,
    onSyncAll: () => undefined,
    onToggleDir: () => undefined,
    onExpandAllDirs: () => undefined,
    onCollapseAllDirs: () => undefined,
    onReloadExtraPaths: () => undefined,
    onSetExtraPaths: () => undefined,
    ...overrides,
  };
}

function findCardByTitle(container: HTMLElement, title: string): HTMLElement | null {
  const cards = Array.from(container.querySelectorAll<HTMLElement>(".card"));
  return (
    cards.find((card) => card.querySelector(".card-title")?.textContent?.trim() === title) ?? null
  );
}

function findCardByTitlePrefix(container: HTMLElement, titlePrefix: string): HTMLElement | null {
  const cards = Array.from(container.querySelectorAll<HTMLElement>(".card"));
  return (
    cards.find((card) =>
      card.querySelector(".card-title")?.textContent?.trim().startsWith(titlePrefix),
    ) ?? null
  );
}

describe("kb view", () => {
  it("renders Agent select in Extra Paths card, not in Knowledge Base card", () => {
    const container = document.createElement("div");
    render(renderKb(createProps()), container);

    const kbCard = findCardByTitle(container, "Knowledge Base (Global)");
    expect(kbCard).not.toBeNull();
    expect(kbCard?.querySelector("select")).toBeNull();

    const extraCard = findCardByTitlePrefix(container, "Extra Paths");
    expect(extraCard).not.toBeNull();
    expect(extraCard?.querySelector("select")).not.toBeNull();
  });

  it("places Sync selected agent in Extra Paths card", () => {
    const container = document.createElement("div");
    render(renderKb(createProps()), container);

    const extraCard = findCardByTitlePrefix(container, "Extra Paths");
    expect(extraCard).not.toBeNull();

    const syncSelectedButton = Array.from(extraCard?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.trim() === "Sync selected agent",
    );
    expect(syncSelectedButton).not.toBeUndefined();
  });

  it("renders Sync all agents only in Sync Controls card", () => {
    const container = document.createElement("div");
    render(renderKb(createProps()), container);

    const syncCard = findCardByTitle(container, "Sync Controls");
    expect(syncCard).not.toBeNull();

    const allSyncButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "Sync all agents",
    );
    expect(allSyncButtons.length).toBe(1);
    expect(syncCard?.contains(allSyncButtons[0] ?? null)).toBe(true);
  });

  it("hides descendants when collapsed and shows descendants when expanded", () => {
    const container = document.createElement("div");

    render(
      renderKb(
        createProps({
          expandedDirs: { "": true },
        }),
      ),
      container,
    );
    expect(container.textContent).not.toContain("rules.md");

    render(
      renderKb(
        createProps({
          expandedDirs: { "": true, policies: true, "policies/hr": true },
        }),
      ),
      container,
    );
    expect(container.textContent).toContain("rules.md");
  });

  it("does not trigger select handler when clicking a folder chevron", () => {
    const container = document.createElement("div");
    const onSelectEntry = vi.fn();
    const onToggleDir = vi.fn();

    render(
      renderKb(
        createProps({
          expandedDirs: { "": true },
          onSelectEntry,
          onToggleDir,
        }),
      ),
      container,
    );

    const folderRow = Array.from(container.querySelectorAll<HTMLElement>(".kb-tree-node")).find(
      (row) => row.textContent?.includes("policies"),
    );
    expect(folderRow).not.toBeUndefined();

    const chevron = folderRow?.querySelector<HTMLElement>(
      ".kb-tree-chevron:not(.kb-tree-chevron--spacer)",
    );
    expect(chevron).not.toBeNull();

    chevron?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onToggleDir).toHaveBeenCalledTimes(1);
    expect(onToggleDir).toHaveBeenCalledWith("policies");
    expect(onSelectEntry).not.toHaveBeenCalled();
  });

  it("shows editor and enables Save when selected file draft differs", () => {
    const container = document.createElement("div");

    render(
      renderKb(
        createProps({
          selectedPath: "policies/hr/rules.md",
          selectedType: "file",
          fileContent: "# Old",
          fileDraft: "# New",
        }),
      ),
      container,
    );

    const textarea = container.querySelector("textarea");
    expect(textarea).not.toBeNull();

    const saveButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Save",
    );
    expect(saveButton).not.toBeUndefined();
    expect(saveButton?.hasAttribute("disabled")).toBe(false);
  });

  it("renders kb layout structure for responsive tree/editor panel", () => {
    const container = document.createElement("div");
    render(renderKb(createProps()), container);

    expect(container.querySelector(".kb-layout")).not.toBeNull();
    expect(container.querySelector(".kb-tree-panel")).not.toBeNull();
    expect(container.querySelector(".kb-editor-panel")).not.toBeNull();
  });
});
