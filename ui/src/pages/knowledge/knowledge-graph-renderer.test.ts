/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import type {
  EnterpriseKnowledgeGraphEdge,
  EnterpriseKnowledgeGraphNode,
} from "../enterprise/services/enterprise-knowledge-api.ts";
import {
  chooseDefaultGraphRenderMode,
  contrastRatio,
  createGraphVisualModel,
  graphSelectionNeighborhood,
} from "./knowledge-graph-renderer.ts";

const nodes: EnterpriseKnowledgeGraphNode[] = [
  {
    nodeRef: "source-hr",
    kind: "source",
    label: "HR handbook",
    aliases: [],
    confidence: 1,
    origin: "deterministic",
    degree: 2,
    sourceTitle: "HR handbook",
    locator: { kind: "document" },
  },
  {
    nodeRef: "section-leave",
    kind: "section",
    label: "Annual leave and manager approval policy with a deliberately long label",
    aliases: [],
    confidence: 1,
    origin: "deterministic",
    degree: 1,
    sourceTitle: "HR handbook",
    locator: { kind: "heading" },
  },
  {
    nodeRef: "concept-approval",
    kind: "concept",
    label: "Manager approval",
    aliases: [],
    confidence: 0.92,
    origin: "ai",
    degree: 1,
    sourceTitle: "HR handbook",
    locator: { kind: "text" },
  },
];

const edges: EnterpriseKnowledgeGraphEdge[] = [
  {
    edgeRef: "contains-leave",
    sourceNodeRef: "source-hr",
    targetNodeRef: "section-leave",
    kind: "contains",
    origin: "deterministic",
    reviewStatus: "accepted",
    confidence: 1,
  },
  {
    edgeRef: "references-approval",
    sourceNodeRef: "section-leave",
    targetNodeRef: "concept-approval",
    kind: "references",
    origin: "ai",
    reviewStatus: "proposed",
    confidence: 0.92,
  },
];

describe("Knowledge Graph visual model", () => {
  it("chooses 3D on capable desktop and safe fallbacks elsewhere", () => {
    const capable = {
      webGlAvailable: true,
      reducedMotion: false,
      mobile: false,
      weakDevice: false,
    };
    expect(chooseDefaultGraphRenderMode(capable)).toBe("3d");
    expect(chooseDefaultGraphRenderMode({ ...capable, weakDevice: true })).toBe("2d");
    expect(chooseDefaultGraphRenderMode({ ...capable, nodeCount: 500 })).toBe("2d");
    expect(chooseDefaultGraphRenderMode({ ...capable, reducedMotion: true })).toBe("list");
    expect(chooseDefaultGraphRenderMode({ ...capable, webGlAvailable: false })).toBe("list");
  });

  it("creates stable 3D seeds and bounded labels", () => {
    const first = createGraphVisualModel(nodes, edges, "structure");
    const second = createGraphVisualModel([...nodes].reverse(), [...edges].reverse(), "structure");
    const firstByRef = new Map(first.nodes.map((node) => [node.nodeRef, node]));
    const secondByRef = new Map(second.nodes.map((node) => [node.nodeRef, node]));

    for (const node of nodes) {
      expect(secondByRef.get(node.nodeRef)).toMatchObject({
        x: firstByRef.get(node.nodeRef)?.x,
        y: firstByRef.get(node.nodeRef)?.y,
        z: firstByRef.get(node.nodeRef)?.z,
      });
    }
    expect(firstByRef.get("source-hr")).toMatchObject({ x: 0, y: 0, z: 0, important: true });
    expect(firstByRef.get("section-leave")?.shortLabel.endsWith("…")).toBe(true);
  });

  it("highlights one-hop neighbors and both ends of a selected edge", () => {
    const model = createGraphVisualModel(nodes, edges, "all");
    expect([
      ...((graphSelectionNeighborhood(model, { selectedNodeRef: "section-leave" }) ??
        new Set()) as ReadonlySet<string>),
    ]).toEqual(expect.arrayContaining(["source-hr", "section-leave", "concept-approval"]));
    expect([
      ...((graphSelectionNeighborhood(model, { selectedEdgeRef: "contains-leave" }) ??
        new Set()) as ReadonlySet<string>),
    ]).toEqual(expect.arrayContaining(["source-hr", "section-leave"]));
  });

  it("calculates WCAG contrast ratios for renderer palette fallbacks", () => {
    expect(contrastRatio("rgb(255, 255, 255)", "rgb(0, 0, 0)")).toBeCloseTo(21, 3);
    expect(contrastRatio("rgb(232, 236, 244)", "rgb(17, 22, 30)")).toBeGreaterThan(4.5);
  });
});
