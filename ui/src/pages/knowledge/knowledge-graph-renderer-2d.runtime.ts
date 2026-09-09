import { MultiDirectedGraph } from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import FA2LayoutSupervisor from "graphology-layout-forceatlas2/worker";
import Sigma from "sigma";
import type { NodeHoverDrawingFunction } from "sigma/rendering";
import { graphEdgeLabel } from "../../i18n/enterprise-knowledge-graph.ts";
import {
  graphSelectionNeighborhood,
  type GraphRendererAdapter,
  type GraphRendererOptions,
  type GraphRendererSelection,
  type GraphThemePalette,
  type GraphVisualLink,
} from "./knowledge-graph-renderer.ts";

type NodeAttributes = {
  x: number;
  y: number;
  size: number;
  label: string;
  color: string;
  kind: string;
  important: boolean;
};

type EdgeAttributes = {
  color: string;
  size: number;
  label: string;
  type: string;
};

function edgeSymbol(link: GraphVisualLink): string {
  if (link.changed === "added") {
    return "+";
  }
  if (link.changed === "removed") {
    return "−";
  }
  if (link.changed === "changed") {
    return "~";
  }
  if (link.reviewStatus === "proposed") {
    return "?";
  }
  if (link.reviewStatus === "rejected") {
    return "×";
  }
  return "→";
}

function linkColor(link: GraphVisualLink, palette: GraphThemePalette): string {
  if (link.reviewStatus === "proposed") {
    return palette.proposed;
  }
  if (link.reviewStatus === "rejected") {
    return palette.rejected;
  }
  return palette.edge;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

export async function createKnowledgeGraph2dRenderer(
  options: GraphRendererOptions,
): Promise<GraphRendererAdapter> {
  const { container, model, callbacks, reducedMotion } = options;
  let palette = options.palette;
  let selection: GraphRendererSelection = {};
  let destroyed = false;
  const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes>();

  for (const node of model.nodes) {
    graph.addNode(node.nodeRef, {
      x: node.x,
      y: node.y,
      size: node.value,
      label: node.shortLabel,
      color: palette.nodes[node.kind],
      kind: node.kind,
      important: node.important,
    });
  }
  for (const link of model.links) {
    graph.addEdgeWithKey(link.edgeRef, link.sourceNodeRef, link.targetNodeRef, {
      color: linkColor(link, palette),
      size: Math.max(0.5, link.confidence * 2.2),
      label: `${edgeSymbol(link)} ${graphEdgeLabel(link.kind)}`,
      type: "line",
    });
  }

  const drawHover: NodeHoverDrawingFunction<NodeAttributes, EdgeAttributes> = (
    context,
    data,
    settings,
  ) => {
    const label = data.label ?? "";
    const fontSize = Math.max(settings.labelSize, 13);
    context.save();
    context.beginPath();
    context.arc(data.x, data.y, data.size + 5, 0, Math.PI * 2);
    context.strokeStyle = palette.focus;
    context.lineWidth = 2;
    context.stroke();
    if (label) {
      context.font = `${settings.labelWeight} ${fontSize}px ${settings.labelFont}`;
      const width = context.measureText(label).width + 20;
      const height = fontSize + 14;
      const x = data.x + data.size + 9;
      const y = data.y - height / 2;
      roundRect(context, x, y, width, height, 7);
      context.fillStyle = palette.tooltipBackground;
      context.fill();
      context.strokeStyle = palette.tooltipBorder;
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = palette.text;
      context.textBaseline = "middle";
      context.fillText(label, x + 10, data.y);
    }
    context.restore();
  };

  const renderer = new Sigma(graph, container, {
    allowInvalidContainer: false,
    enableEdgeEvents: true,
    renderEdgeLabels: model.links.length <= 120,
    labelDensity: 0.12,
    labelGridCellSize: 90,
    labelRenderedSizeThreshold: 9,
    minCameraRatio: 0.04,
    maxCameraRatio: 12,
    stagePadding: 34,
    zIndex: true,
    labelColor: { color: palette.text },
    edgeLabelColor: { color: palette.mutedText },
    defaultDrawNodeHover: drawHover,
    nodeReducer: (nodeRef, data) => {
      const neighborhood = graphSelectionNeighborhood(model, selection);
      const active = neighborhood?.has(nodeRef) ?? true;
      const selected = nodeRef === selection.selectedNodeRef;
      const hovered = nodeRef === selection.hoveredNodeRef;
      return {
        x: data.x,
        y: data.y,
        label: data.label,
        type: "circle",
        color: selected || hovered ? palette.selected : active ? data.color : palette.edgeDim,
        size: selected || hovered ? data.size * 1.35 : data.size,
        forceLabel: data.important || selected || hovered,
        highlighted: selected || hovered,
        zIndex: selected || hovered ? 2 : active ? 1 : 0,
      };
    },
    edgeReducer: (edgeRef, data) => {
      const neighborhood = graphSelectionNeighborhood(model, selection);
      const ends = model.edgeEnds.get(edgeRef);
      const active =
        !neighborhood || Boolean(ends && neighborhood.has(ends[0]) && neighborhood.has(ends[1]));
      const selected =
        edgeRef === selection.selectedEdgeRef || edgeRef === selection.hoveredEdgeRef;
      return {
        label: data.label,
        type: data.type,
        color: selected ? palette.selected : active ? data.color : palette.edgeDim,
        size: selected ? data.size * 2.4 : active ? data.size : Math.max(0.35, data.size * 0.55),
        forceLabel: selected,
        zIndex: selected ? 2 : active ? 1 : 0,
      };
    },
  });

  const contextCanvas = container.querySelector("canvas");
  const handleContextLost = (event: Event) => {
    event.preventDefault();
    if (!destroyed) {
      callbacks.onContextLost();
    }
  };
  contextCanvas?.addEventListener("webglcontextlost", handleContextLost);
  renderer.on("clickNode", ({ node }) => callbacks.onNodeClick(node));
  renderer.on("clickEdge", ({ edge }) => callbacks.onEdgeClick(edge));
  renderer.on("enterNode", ({ node }) => callbacks.onNodeHover(node));
  renderer.on("leaveNode", () => callbacks.onNodeHover());
  renderer.on("enterEdge", ({ edge }) => callbacks.onEdgeHover(edge));
  renderer.on("leaveEdge", () => callbacks.onEdgeHover());

  const settings = forceAtlas2.inferSettings(graph);
  const layout = new FA2LayoutSupervisor(graph, {
    settings: {
      ...settings,
      barnesHutOptimize: true,
      slowDown: options.topologyMode === "structure" ? 12 : 8,
      gravity: options.topologyMode === "structure" ? 0.6 : settings.gravity,
    },
  });
  if (!reducedMotion) {
    layout.start();
  }

  return {
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      contextCanvas?.removeEventListener("webglcontextlost", handleContextLost);
      layout.kill();
      renderer.kill();
      container.replaceChildren();
    },
    pause: () => layout.stop(),
    resume: () => {
      if (!destroyed) {
        layout.start();
      }
    },
    fit: () => {
      void renderer.getCamera().animatedReset({ duration: reducedMotion ? 0 : 450 });
    },
    focus: (nodeRef) => {
      const data = renderer.getNodeDisplayData(nodeRef);
      if (!data) {
        return;
      }
      void renderer
        .getCamera()
        .animate(
          { x: data.x, y: data.y, ratio: Math.min(renderer.getCamera().ratio, 0.35) },
          { duration: reducedMotion ? 0 : 420 },
        );
    },
    resize: () => {
      if (!destroyed) {
        renderer.resize(true);
      }
    },
    updateTheme: (nextPalette) => {
      palette = nextPalette;
      for (const node of model.nodes) {
        graph.setNodeAttribute(node.nodeRef, "color", palette.nodes[node.kind]);
      }
      for (const link of model.links) {
        graph.setEdgeAttribute(link.edgeRef, "color", linkColor(link, palette));
      }
      renderer.setSettings({
        labelColor: { color: palette.text },
        edgeLabelColor: { color: palette.mutedText },
        defaultDrawNodeHover: drawHover,
      });
      renderer.refresh();
    },
    updateSelection: (nextSelection) => {
      selection = nextSelection;
      renderer.refresh();
    },
  };
}
