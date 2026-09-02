/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UserPersonalAgentPage } from "../pages/agents/personal-agent-page.ts";
import type { PersonalAgentEditorState } from "../state/personal-agent-editor-store.ts";
import { personalAgentEditorStore } from "../state/personal-agent-editor-store.ts";
import type { UserBootstrapState } from "../state/user-bootstrap-store.ts";
import { userBootstrapStore } from "../state/user-bootstrap-store.ts";

type PersonalAgentPanel = "overview" | "instructions" | "knowledge" | "capabilities";

type MutablePersonalAgentPage = {
  activePanel: PersonalAgentPanel;
  render(): unknown;
};

const readyEditorState: PersonalAgentEditorState = {
  phase: "ready",
  source: {
    revision: 2,
    name: "Personal Agent",
    avatarPreset: "sparkles",
    greeting: "How can I help?",
    tone: "professional",
    responseLength: "balanced",
    language: "auto",
    customInstructions: "Prefer concrete examples.",
    preferredName: "Alex",
    workContext: "Engineering lead",
    preferences: "Use checklists",
  },
  draft: {
    revision: 2,
    name: "Personal Agent",
    avatarPreset: "sparkles",
    greeting: "How can I help?",
    tone: "professional",
    responseLength: "balanced",
    language: "auto",
    customInstructions: "Prefer concrete examples.",
    preferredName: "Alex",
    workContext: "Engineering lead",
    preferences: "Use checklists",
  },
  knowledge: [
    {
      id: "knowledge-1",
      title: "Project glossary",
      kind: "note",
      sourceName: null,
      content: "A project note",
      revision: 1,
      createdAt: 1,
      updatedAt: 2,
    },
  ],
  busy: false,
  conflictRevision: null,
  error: null,
};

const readyBootstrapState: UserBootstrapState = {
  phase: "ready",
  data: {
    schemaVersion: 2,
    user: { username: "alex", displayName: "Alex", avatarUrl: null },
    features: {
      personalAgent: { enabled: true, editable: true },
      automations: true,
      notifications: true,
      knowledge: { enabled: false, memberships: 0 },
    },
    agents: [
      {
        key: "personal",
        kind: "personal",
        name: "Personal Agent",
        canonicalName: "Personal Agent",
        description: "Personal workspace",
        avatar: "sparkles",
        availability: "ready",
        capabilityLabels: ["Web search", "Calendar"],
        relationship: null,
        actions: { canChat: true, canSchedule: true, canEdit: true, canPersonalize: false },
      },
    ],
    defaultAgentKey: "personal",
    policyRevision: 1,
    catalogRevision: "catalog-1",
  },
};

describe("Enterprise User Personal Agent settings", () => {
  let container: HTMLDivElement;
  let previousEditorState: PersonalAgentEditorState;
  let previousBootstrapState: UserBootstrapState;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    previousEditorState = personalAgentEditorStore.state;
    previousBootstrapState = userBootstrapStore.state;
    personalAgentEditorStore.state = readyEditorState;
    userBootstrapStore.state = readyBootstrapState;
  });

  afterEach(() => {
    personalAgentEditorStore.state = previousEditorState;
    userBootstrapStore.state = previousBootstrapState;
    render(nothing, container);
    container.remove();
  });

  it("uses the canonical Agent tab workspace and keeps every personal setting reachable", () => {
    const page = new UserPersonalAgentPage() as unknown as MutablePersonalAgentPage;

    render(page.render(), container);

    expect(container.querySelector(".personal-agent-hub-tabs")).not.toBeNull();
    expect(
      Array.from(container.querySelectorAll("wa-tab")).map((tab) =>
        tab.textContent?.replace(/\s+/g, " ").trim(),
      ),
    ).toEqual(["Overview", "Instructions", "Knowledge1", "Capabilities2"]);
    expect(
      Array.from(container.querySelectorAll(".settings-section__heading")).map((heading) =>
        heading.textContent?.replace(/\s+/g, " ").trim(),
      ),
    ).toEqual(["Identity", "Response style"]);
    expect(container.querySelector<HTMLInputElement>('input[maxlength="64"]')?.value).toBe(
      "Personal Agent",
    );
    expect(container.querySelector<HTMLTextAreaElement>('textarea[maxlength="240"]')?.value).toBe(
      "How can I help?",
    );

    page.activePanel = "instructions";
    render(page.render(), container);
    expect(
      Array.from(container.querySelectorAll(".settings-section__heading")).map((heading) =>
        heading.textContent?.replace(/\s+/g, " ").trim(),
      ),
    ).toEqual(["Instructions", "About you"]);
    expect(container.querySelector<HTMLTextAreaElement>('textarea[maxlength="4000"]')?.value).toBe(
      "Prefer concrete examples.",
    );
    expect(container.querySelector<HTMLInputElement>('input[maxlength="128"]')?.value).toBe("Alex");

    page.activePanel = "knowledge";
    render(page.render(), container);
    expect(container.textContent).toContain("Project glossary");
    expect(container.querySelector('input[placeholder="Knowledge name"]')).not.toBeNull();

    page.activePanel = "capabilities";
    render(page.render(), container);
    expect(container.textContent).toContain("Web search");
    expect(container.textContent).toContain("Calendar");
    expect(container.textContent).toContain("Reset customizations to defaults");
  });
});
