/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  EnterpriseUserAgent,
  SharedAgentRelationshipProfile,
} from "../contracts/user-agent.ts";
import { UserSharedAgentDetailPage } from "../pages/agents/shared-agent-detail-page.ts";

type MutableSharedAgentPage = {
  agent: EnterpriseUserAgent;
  relationship: SharedAgentRelationshipProfile;
  relationshipSource: SharedAgentRelationshipProfile;
  relationshipBusy: boolean;
  render(): unknown;
};

const relationship: SharedAgentRelationshipProfile = {
  revision: 2,
  agentAlias: "Mây",
  agentSelfReference: "em",
  userAddress: "anh Minh",
  customInstructions: "Use a warm tone.",
  updatedAt: 10,
};

describe("Enterprise User shared Agent relationship", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    render(nothing, container);
    container.remove();
  });

  it("keeps the canonical Agent visible while exposing private names and memory scope", () => {
    const page = new UserSharedAgentDetailPage() as unknown as MutableSharedAgentPage;
    page.agent = {
      key: "shared:research",
      kind: "shared",
      name: "Mây",
      canonicalName: "Research Agent",
      description: null,
      avatar: null,
      availability: "ready",
      capabilityLabels: ["Search"],
      relationship,
      actions: {
        canChat: true,
        canSchedule: true,
        canEdit: false,
        canPersonalize: true,
      },
    };
    page.relationship = { ...relationship };
    page.relationshipSource = { ...relationship };
    page.relationshipBusy = false;

    render(page.render(), container);

    expect(container.querySelector("h1")?.textContent).toBe("Mây");
    expect(container.textContent).toContain("Research Agent");
    expect(container.querySelector<HTMLInputElement>('input[maxlength="64"]')?.value).toBe("Mây");
    expect(container.querySelector<HTMLInputElement>('input[maxlength="128"]')?.value).toBe(
      "anh Minh",
    );
    expect(container.querySelector<HTMLTextAreaElement>('textarea[maxlength="1200"]')?.value).toBe(
      "Use a warm tone.",
    );
    expect(container.textContent).toContain("Private memory");
    expect(container.textContent).toContain("isolated from other users");
  });
});
