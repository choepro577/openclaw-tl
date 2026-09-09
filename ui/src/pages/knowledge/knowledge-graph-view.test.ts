/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../i18n/index.ts";
import type {
  EnterpriseKnowledgeGraphNeighborhood,
  EnterpriseKnowledgeGraphNodeDetail,
} from "../enterprise/services/enterprise-knowledge-api.ts";
import { OpenClawKnowledgeGraphView } from "./knowledge-graph-view.ts";

type MutableGraphView = {
  audience: "admin" | "user";
  zoneId: string;
  zoneName: string;
  zoneRevision: number;
  hasCandidate: boolean;
  hasActivePublication: boolean;
  role: "viewer" | "curator" | "manager";
  snapshot: "active" | "candidate" | "compare";
  renderMode: "3d" | "2d" | "list";
  topologyMode: "structure" | "relations" | "all";
  analysis?: {
    generationId: string;
    snapshotRevision: number;
    artifactSchemaVersion: 1 | 2 | 3;
    aiAnalysisStatus: "off" | "ready" | "degraded";
    nodeCounts: Record<string, number>;
    edgeCounts: Record<string, number>;
    originCounts: Record<string, number>;
    containsRatio: number;
    maxSourceDegree: number;
    diagnosis: "relational" | "mostly_structural" | "ai_degraded";
    degradationReasons: string[];
  };
  graph?: EnterpriseKnowledgeGraphNeighborhood;
  selectedNode?: EnterpriseKnowledgeGraphNodeDetail;
  renderer?: { destroy: () => void };
  abort?: AbortController;
  error: string;
  updated(changed: Map<string, unknown>): void;
  render(): unknown;
  disconnectedCallback(): void;
};

const graph: EnterpriseKnowledgeGraphNeighborhood = {
  summary: {
    snapshot: "candidate",
    generationId: "generation-1",
    publicationId: null,
    schemaVersion: 2,
    status: "ready",
    nodeCount: 2,
    edgeCount: 1,
    proposedCount: 1,
    orphanCount: 0,
    componentCount: 1,
    truncated: false,
    builtAt: 1,
    enrichmentIdentity: { provider: "local", model: "relations", transport: "local" },
  },
  nodes: [
    {
      nodeRef: "node-a",
      kind: "concept",
      label: "Annual leave",
      aliases: ["Vacation"],
      confidence: 1,
      origin: "deterministic",
      degree: 1,
      sourceTitle: "Leave policy",
      locator: { kind: "text", section: "Leave" },
    },
    {
      nodeRef: "node-b",
      kind: "claim",
      label: "Manager approval",
      aliases: [],
      confidence: 0.98,
      origin: "ai",
      degree: 1,
      sourceTitle: "Leave policy",
      locator: { kind: "text", section: "Leave" },
    },
  ],
  edges: [
    {
      edgeRef: "edge-a",
      sourceNodeRef: "node-a",
      targetNodeRef: "node-b",
      kind: "depends_on",
      origin: "ai",
      reviewStatus: "proposed",
      confidence: 0.98,
    },
  ],
  depth: 1,
  truncated: false,
};

function page(role: MutableGraphView["role"]): MutableGraphView {
  const view = new OpenClawKnowledgeGraphView() as unknown as MutableGraphView;
  view.audience = "user";
  view.zoneId = "zone-1";
  view.zoneName = "HR";
  view.zoneRevision = 2;
  view.hasCandidate = true;
  view.hasActivePublication = true;
  view.role = role;
  view.renderMode = "list";
  view.graph = graph;
  return view;
}

describe("shared Enterprise Knowledge Graph View", () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    await i18n.setLocale("vi");
  });

  afterEach(async () => {
    await i18n.setLocale("en");
    vi.unstubAllGlobals();
    render(nothing, container);
    container?.remove();
  });

  it("keeps Viewer on active read-only graph with an accessible list", () => {
    container = document.createElement("div");
    const view = page("viewer");
    view.snapshot = "active";
    render(view.render(), container);
    expect(container.textContent).toContain("Bản đồ tri thức · HR");
    expect(container.querySelector('[role="region"][aria-label="Danh sách graph"]')).not.toBeNull();
    expect(container.textContent).not.toContain("Compare Active–Candidate");
    expect(container.textContent).not.toContain("Hàng đợi kiểm duyệt");
    expect(container.textContent).not.toContain("Xuất Obsidian ZIP");
  });

  it("shows Candidate review and Manager export without color-only status", () => {
    container = document.createElement("div");
    const view = page("manager");
    view.snapshot = "candidate";
    render(view.render(), container);
    expect(container.textContent).toContain("So sánh Active–Candidate");
    expect(container.textContent).toContain("Hàng đợi kiểm duyệt");
    expect(container.textContent).toContain("? Chờ duyệt");
    expect(container.textContent).toContain("Xuất Obsidian ZIP");
  });

  it("switches shared graph copy between English and Vietnamese at render time", async () => {
    container = document.createElement("div");
    const view = page("manager");
    view.snapshot = "candidate";

    await i18n.setLocale("en");
    render(view.render(), container);
    expect(container.textContent).toContain("Knowledge graph · HR");
    expect(container.querySelector('[role="region"][aria-label="Graph list"]')).not.toBeNull();
    expect(container.textContent).toContain("Relations");
    expect(container.textContent).toContain("Proposed");

    await i18n.setLocale("vi");
    render(view.render(), container);
    expect(container.textContent).toContain("Bản đồ tri thức · HR");
    expect(container.querySelector('[role="region"][aria-label="Danh sách graph"]')).not.toBeNull();
    expect(container.textContent).toContain("Quan hệ");
    expect(container.textContent).toContain("Chờ duyệt");
  });

  it("offers structural and relational views and explains a fan-shaped graph", () => {
    container = document.createElement("div");
    const view = page("manager");
    view.snapshot = "candidate";
    view.topologyMode = "structure";
    view.analysis = {
      generationId: "generation-1",
      snapshotRevision: 4,
      artifactSchemaVersion: 3,
      aiAnalysisStatus: "off",
      nodeCounts: { source: 1, section: 150 },
      edgeCounts: { contains: 150 },
      originCounts: { deterministic: 150 },
      containsRatio: 1,
      maxSourceDegree: 150,
      diagnosis: "mostly_structural",
      degradationReasons: [],
    };
    render(view.render(), container);

    expect(container.textContent).toContain("Cấu trúc tài liệu");
    expect(container.textContent).toContain("Quan hệ nghiệp vụ");
    expect(container.textContent).toContain("Toàn bộ graph");
    expect(container.textContent).toContain("Graph hiện chủ yếu là cấu trúc tài liệu");
    expect(container.textContent).toContain("Graph cấu trúc đã sẵn sàng");
    expect(container.textContent).toContain("3D");
    expect(container.textContent).toContain("2D");
    expect(container.textContent).toContain("Danh sách");
  });

  it("opens Candidate by default and disables Active when the zone has not been published", () => {
    container = document.createElement("div");
    const view = page("manager");
    view.zoneId = "";
    view.hasActivePublication = false;
    view.snapshot = "active";
    view.updated(new Map([["zoneId", "zone-before"]]));
    render(view.render(), container);

    expect(view.snapshot).toBe("candidate");
    expect((container.querySelector('[role="tab"]') as HTMLButtonElement | null)?.disabled).toBe(
      true,
    );
    expect(container.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe(
      "Candidate",
    );
  });

  it("explains a missing graph without directing the operator to publish or change policy", async () => {
    const view = page("manager");
    view.graph = undefined;
    view.snapshot = "active";
    const response = new Response(
      JSON.stringify({ code: "GRAPH_NOT_BUILT", message: "Graph is not available." }),
      { status: 422, headers: { "content-type": "application/json" } },
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response.clone()),
    );

    view.updated(new Map([["zoneId", "zone-before"]]));
    await vi.waitFor(() => expect(view.error).toContain("chưa có graph sẵn sàng"));

    expect(view.error).not.toContain("publish");
    expect(view.error).not.toContain("Cấu hình");
    expect(view.error).not.toContain("bật Graph");
  });

  it("destroys the renderer and stale requests when the component disconnects", () => {
    const view = page("curator");
    const rendererDestroy = vi.fn();
    const abort = new AbortController();
    const abortSpy = vi.spyOn(abort, "abort");
    view.renderer = { destroy: rendererDestroy };
    view.abort = abort;
    view.disconnectedCallback();
    expect(rendererDestroy).toHaveBeenCalledOnce();
    expect(abortSpy).toHaveBeenCalledOnce();
  });
});
