import type { ForceGraph3DInstance } from "3d-force-graph";
import type { Group } from "three";
import type SpriteText from "three-spritetext";
import {
  enterpriseKnowledgeGraphCopy as gk,
  graphEdgeLabel,
  graphNodeLabel,
  graphReviewLabel,
} from "../../i18n/enterprise-knowledge-graph.ts";
import {
  graphSelectionNeighborhood,
  type GraphRendererAdapter,
  type GraphRendererOptions,
  type GraphRendererSelection,
  type GraphThemePalette,
  type GraphVisualLink,
  type GraphVisualNode,
} from "./knowledge-graph-renderer.ts";

type ForceNode = GraphVisualNode & {
  vx?: number;
  vy?: number;
  vz?: number;
};

type ForceLink = Omit<GraphVisualLink, "source" | "target"> & {
  source: string | ForceNode;
  target: string | ForceNode;
};

type LinkForce = {
  distance: (accessor: (link: ForceLink) => number) => LinkForce;
  strength: (accessor: (link: ForceLink) => number) => LinkForce;
};

type ChargeForce = {
  strength: (strength: number) => ChargeForce;
};

type ClusterForce = ((alpha: number) => void) & {
  initialize: (nodes: ForceNode[]) => void;
};

function linkColor(link: ForceLink, palette: GraphThemePalette): string {
  if (link.reviewStatus === "proposed") {
    return palette.proposed;
  }
  if (link.reviewStatus === "rejected") {
    return palette.rejected;
  }
  return palette.edge;
}

function tooltip(title: string, detail: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "knowledge-graph-tooltip";
  const heading = document.createElement("strong");
  const metadata = document.createElement("span");
  heading.textContent = title;
  metadata.textContent = detail;
  wrapper.append(heading, metadata);
  return wrapper;
}

function labelObject(
  node: ForceNode,
  palette: GraphThemePalette,
  selection: GraphRendererSelection,
  GroupConstructor: typeof import("three").Group,
  SpriteTextConstructor: typeof import("three-spritetext").default,
): Group | SpriteText {
  const visible =
    node.important ||
    node.nodeRef === selection.selectedNodeRef ||
    node.nodeRef === selection.hoveredNodeRef;
  if (!visible) {
    return new GroupConstructor();
  }
  const label = new SpriteTextConstructor(node.shortLabel, 3.6, palette.text);
  label.backgroundColor = palette.tooltipBackground;
  label.borderColor = palette.tooltipBorder;
  label.borderWidth = 0.5;
  label.borderRadius = 2;
  label.padding = [2.5, 1.5];
  label.fontWeight = node.kind === "source" ? "700" : "600";
  label.material.depthWrite = false;
  label.position.set(0, Math.cbrt(node.value) + 4, 0);
  return label;
}

function createClusterForce(): ClusterForce {
  let nodes: ForceNode[] = [];
  const anchors: Record<GraphVisualNode["kind"], readonly [number, number, number]> = {
    source: [0, 0, 0],
    section: [-80, 45, 20],
    entity: [80, 35, -15],
    concept: [0, -80, 35],
    claim: [45, 20, 85],
  };
  const force = (alpha: number) => {
    const strength = alpha * 0.018;
    for (const node of nodes) {
      const anchor = anchors[node.kind];
      node.vx = (node.vx ?? 0) + (anchor[0] - node.x) * strength;
      node.vy = (node.vy ?? 0) + (anchor[1] - node.y) * strength;
      node.vz = (node.vz ?? 0) + (anchor[2] - node.z) * strength;
    }
  };
  return Object.assign(force, {
    initialize: (nextNodes: ForceNode[]) => {
      nodes = nextNodes;
    },
  });
}

function isLinkForce(force: unknown): force is LinkForce {
  return (
    typeof force === "function" &&
    "distance" in force &&
    typeof force.distance === "function" &&
    "strength" in force &&
    typeof force.strength === "function"
  );
}

function isChargeForce(force: unknown): force is ChargeForce {
  return typeof force === "function" && "strength" in force && typeof force.strength === "function";
}

export async function createKnowledgeGraph3dRenderer(
  options: GraphRendererOptions,
): Promise<GraphRendererAdapter> {
  const { container, model, callbacks, reducedMotion } = options;
  let palette = options.palette;
  let selection: GraphRendererSelection = {};
  let destroyed = false;
  let cameraFocused = false;
  let simulationTimer: number | undefined;
  let initialFitTimer: number | undefined;
  const nodes = model.nodes.map((node) => ({ ...node })) satisfies ForceNode[];
  const links = model.links.map((link) => ({ ...link })) satisfies ForceLink[];
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  const [
    { default: ForceGraph3D },
    { Group: GroupConstructor },
    { default: SpriteTextConstructor },
  ] = await Promise.all([import("3d-force-graph"), import("three"), import("three-spritetext")]);
  const graphInstance = new ForceGraph3D(container, {
    controlType: "orbit",
    rendererConfig: { antialias: true, alpha: false, powerPreference: "high-performance" },
  });
  // SAFETY: This instance receives only the ForceNode/ForceLink data constructed above.
  const graph = graphInstance as unknown as ForceGraph3DInstance<ForceNode, ForceLink>;

  const activeNodeColor = (node: ForceNode): string => {
    const neighborhood = graphSelectionNeighborhood(model, selection);
    const selected =
      node.nodeRef === selection.selectedNodeRef || node.nodeRef === selection.hoveredNodeRef;
    if (selected) {
      return palette.selected;
    }
    return !neighborhood || neighborhood.has(node.nodeRef)
      ? palette.nodes[node.kind]
      : palette.edgeDim;
  };
  const activeLinkColor = (link: ForceLink): string => {
    const neighborhood = graphSelectionNeighborhood(model, selection);
    const selected =
      link.edgeRef === selection.selectedEdgeRef || link.edgeRef === selection.hoveredEdgeRef;
    if (selected) {
      return palette.selected;
    }
    const active =
      !neighborhood ||
      (neighborhood.has(link.sourceNodeRef) && neighborhood.has(link.targetNodeRef));
    return active ? linkColor(link, palette) : palette.edgeDim;
  };

  graph
    .width(width)
    .height(height)
    .backgroundColor(palette.background)
    .showNavInfo(false)
    .nodeId("nodeRef")
    .linkSource("source")
    .linkTarget("target")
    .nodeRelSize(1)
    .nodeVal((node) => node.value)
    .nodeColor(activeNodeColor)
    .nodeOpacity(0.96)
    .nodeResolution(18)
    .nodeThreeObject((node) =>
      labelObject(node, palette, selection, GroupConstructor, SpriteTextConstructor),
    )
    .nodeThreeObjectExtend(true)
    .nodeLabel((node) => tooltip(node.label, graphNodeLabel(node.kind)))
    .linkColor(activeLinkColor)
    .linkOpacity(0.58)
    .linkWidth((link) => {
      const selected =
        link.edgeRef === selection.selectedEdgeRef || link.edgeRef === selection.hoveredEdgeRef;
      return Math.max(0.35, link.confidence * (selected ? 3.2 : 1.7));
    })
    .linkLabel((link) =>
      tooltip(
        graphEdgeLabel(link.kind),
        `${graphReviewLabel(link.reviewStatus)} · ${
          // Resolve the metric label at callback time so locale changes are reflected in tooltips.
          gk("confidenceMetric")
        } ${link.confidence.toFixed(2)}`,
      ),
    )
    .linkDirectionalArrowLength((link) => Math.max(2.5, link.confidence * 4.5))
    .linkDirectionalArrowRelPos(0.82)
    .linkDirectionalArrowColor(activeLinkColor)
    .linkDirectionalParticles((link) =>
      link.edgeRef === selection.selectedEdgeRef || link.edgeRef === selection.hoveredEdgeRef
        ? 2
        : 0,
    )
    .linkDirectionalParticleWidth((link) => Math.max(1.2, link.confidence * 2.8))
    .linkDirectionalParticleColor(() => palette.focus)
    .linkHoverPrecision(5)
    .d3VelocityDecay(0.28)
    .warmupTicks(options.topologyMode === "structure" ? 35 : 55)
    .cooldownTicks(reducedMotion ? 90 : 180)
    .cooldownTime(reducedMotion ? 1_800 : 6_000)
    .onNodeClick((node) => callbacks.onNodeClick(node.nodeRef))
    .onLinkClick((link) => callbacks.onEdgeClick(link.edgeRef))
    .onNodeHover((node) => callbacks.onNodeHover(node?.nodeRef))
    .onLinkHover((link) => callbacks.onEdgeHover(link?.edgeRef))
    .onEngineStop(() => {
      if (!destroyed && !cameraFocused) {
        graph.zoomToFit(reducedMotion ? 0 : 500, 68);
      }
    })
    .graphData({ nodes, links });

  const linkForce = graph.d3Force("link");
  if (isLinkForce(linkForce)) {
    linkForce
      .distance((link) => (link.kind === "contains" ? 54 : link.kind === "references" ? 112 : 82))
      .strength((link) =>
        link.kind === "contains" ? 0.72 : link.kind === "references" ? 0.18 : 0.35,
      );
  }
  const chargeForce = graph.d3Force("charge");
  if (isChargeForce(chargeForce)) {
    chargeForce.strength(options.topologyMode === "structure" ? -115 : -145);
  }
  if (options.topologyMode !== "structure") {
    graph.d3Force("kind-cluster", createClusterForce());
  }
  simulationTimer = window.setTimeout(() => {
    simulationTimer = undefined;
    if (!destroyed) {
      graph.d3ReheatSimulation();
      graph.resumeAnimation();
    }
  }, 50);
  initialFitTimer = window.setTimeout(() => {
    initialFitTimer = undefined;
    if (!destroyed && !cameraFocused) {
      graph.zoomToFit(reducedMotion ? 0 : 420, 68);
    }
  }, 450);

  const canvas = graph.renderer().domElement;
  const handleContextLost = (event: Event) => {
    event.preventDefault();
    if (!destroyed) {
      callbacks.onContextLost();
    }
  };
  canvas.addEventListener("webglcontextlost", handleContextLost);

  const refreshVisuals = () => {
    graph
      .nodeColor(activeNodeColor)
      .linkColor(activeLinkColor)
      .linkDirectionalArrowColor(activeLinkColor)
      .nodeThreeObject((node) =>
        labelObject(node, palette, selection, GroupConstructor, SpriteTextConstructor),
      )
      .refresh();
  };

  return {
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      if (simulationTimer !== undefined) {
        window.clearTimeout(simulationTimer);
      }
      if (initialFitTimer !== undefined) {
        window.clearTimeout(initialFitTimer);
      }
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      graph.pauseAnimation();
      graph._destructor();
      container.replaceChildren();
    },
    pause: () => graph.pauseAnimation(),
    resume: () => {
      if (!destroyed) {
        graph.resumeAnimation();
      }
    },
    fit: () => {
      cameraFocused = true;
      graph.zoomToFit(reducedMotion ? 0 : 520, 68);
    },
    focus: (nodeRef) => {
      const node = nodes.find((candidate) => candidate.nodeRef === nodeRef);
      if (!node) {
        return;
      }
      cameraFocused = true;
      const current = graph.cameraPosition();
      const offset = {
        x: current.x - node.x,
        y: current.y - node.y,
        z: current.z - node.z,
      };
      const distance = Math.hypot(offset.x, offset.y, offset.z);
      const direction =
        distance > 0.001
          ? { x: offset.x / distance, y: offset.y / distance, z: offset.z / distance }
          : { x: 0, y: 0, z: 1 };
      const focusDistance = Math.max(120, node.value * 10);
      graph.cameraPosition(
        {
          x: node.x + direction.x * focusDistance,
          y: node.y + direction.y * focusDistance,
          z: node.z + direction.z * focusDistance,
        },
        { x: node.x, y: node.y, z: node.z },
        reducedMotion ? 0 : 620,
      );
    },
    resize: (nextWidth, nextHeight) => {
      if (!destroyed) {
        graph.width(Math.max(1, nextWidth)).height(Math.max(1, nextHeight));
      }
    },
    updateTheme: (nextPalette) => {
      palette = nextPalette;
      graph.backgroundColor(palette.background);
      refreshVisuals();
    },
    updateSelection: (nextSelection) => {
      selection = nextSelection;
      refreshVisuals();
    },
  };
}
