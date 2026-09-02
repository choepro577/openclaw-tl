import type {
  EnterpriseKnowledgeGraphEdge,
  EnterpriseKnowledgeGraphNode,
  EnterpriseKnowledgeGraphNodeKind,
  EnterpriseKnowledgeGraphReviewStatus,
} from "../enterprise/services/enterprise-knowledge-api.ts";

export type GraphRenderMode = "3d" | "2d" | "list";
export type GraphTopologyMode = "structure" | "relations" | "all";

export function chooseDefaultGraphRenderMode(input: {
  webGlAvailable: boolean;
  reducedMotion: boolean;
  mobile: boolean;
  weakDevice: boolean;
  nodeCount?: number;
  edgeCount?: number;
}): GraphRenderMode {
  if (!input.webGlAvailable || input.reducedMotion) {
    return "list";
  }
  if (
    input.mobile ||
    input.weakDevice ||
    (input.nodeCount ?? 0) >= 350 ||
    (input.edgeCount ?? 0) >= 1_000
  ) {
    return "2d";
  }
  return "3d";
}

export type GraphThemePalette = {
  background: string;
  surface: string;
  text: string;
  textStrong: string;
  mutedText: string;
  tooltipBackground: string;
  tooltipBorder: string;
  edge: string;
  edgeDim: string;
  selected: string;
  focus: string;
  proposed: string;
  rejected: string;
  nodes: Record<EnterpriseKnowledgeGraphNodeKind, string>;
};

export type GraphVisualNode = {
  id: string;
  nodeRef: string;
  kind: EnterpriseKnowledgeGraphNodeKind;
  label: string;
  shortLabel: string;
  degree: number;
  value: number;
  x: number;
  y: number;
  z: number;
  important: boolean;
  changed?: EnterpriseKnowledgeGraphNode["changed"];
};

export type GraphVisualLink = {
  id: string;
  edgeRef: string;
  source: string | GraphVisualNode;
  target: string | GraphVisualNode;
  sourceNodeRef: string;
  targetNodeRef: string;
  kind: EnterpriseKnowledgeGraphEdge["kind"];
  reviewStatus: EnterpriseKnowledgeGraphReviewStatus;
  confidence: number;
  changed?: EnterpriseKnowledgeGraphEdge["changed"];
};

export type GraphVisualModel = {
  nodes: GraphVisualNode[];
  links: GraphVisualLink[];
  neighbors: ReadonlyMap<string, ReadonlySet<string>>;
  edgeEnds: ReadonlyMap<string, readonly [string, string]>;
};

export type GraphRendererSelection = {
  selectedNodeRef?: string;
  selectedEdgeRef?: string;
  hoveredNodeRef?: string;
  hoveredEdgeRef?: string;
};

export type GraphRendererAdapter = {
  destroy: () => void;
  pause: () => void;
  resume: () => void;
  fit: () => void;
  focus: (nodeRef: string) => void;
  resize: (width: number, height: number) => void;
  updateTheme: (palette: GraphThemePalette) => void;
  updateSelection: (selection: GraphRendererSelection) => void;
};

export type GraphRendererCallbacks = {
  onNodeClick: (nodeRef: string) => void;
  onEdgeClick: (edgeRef: string) => void;
  onNodeHover: (nodeRef?: string) => void;
  onEdgeHover: (edgeRef?: string) => void;
  onContextLost: () => void;
};

export type GraphRendererOptions = {
  container: HTMLElement;
  model: GraphVisualModel;
  palette: GraphThemePalette;
  topologyMode: GraphTopologyMode;
  reducedMotion: boolean;
  callbacks: GraphRendererCallbacks;
};

const FALLBACK_PALETTE: GraphThemePalette = {
  background: "rgb(17, 22, 30)",
  surface: "rgb(25, 31, 42)",
  text: "rgb(232, 236, 244)",
  textStrong: "rgb(255, 255, 255)",
  mutedText: "rgb(166, 174, 190)",
  tooltipBackground: "rgb(25, 31, 42)",
  tooltipBorder: "rgb(72, 82, 102)",
  edge: "rgb(126, 139, 164)",
  edgeDim: "rgb(61, 70, 87)",
  selected: "rgb(84, 156, 255)",
  focus: "rgb(255, 213, 91)",
  proposed: "rgb(245, 158, 11)",
  rejected: "rgb(239, 68, 68)",
  nodes: {
    source: "rgb(91, 141, 239)",
    section: "rgb(139, 124, 246)",
    entity: "rgb(245, 158, 11)",
    concept: "rgb(16, 185, 129)",
    claim: "rgb(239, 107, 115)",
  },
};

const PALETTE_VARIABLES = {
  background: "--kg-bg",
  surface: "--kg-bg-2",
  text: "--kg-text",
  textStrong: "--kg-text-strong",
  mutedText: "--kg-muted",
  tooltipBackground: "--kg-tooltip-bg",
  tooltipBorder: "--kg-tooltip-border",
  edge: "--kg-edge",
  edgeDim: "--kg-edge-dim",
  selected: "--kg-selected",
  focus: "--kg-focus",
  proposed: "--kg-proposed",
  rejected: "--kg-rejected",
} as const;

const NODE_VARIABLES: Record<EnterpriseKnowledgeGraphNodeKind, string> = {
  source: "--kg-node-source",
  section: "--kg-node-section",
  entity: "--kg-node-entity",
  concept: "--kg-node-concept",
  claim: "--kg-node-claim",
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnitVector(seed: string): readonly [number, number, number] {
  const longitude = ((stableHash(`${seed}:longitude`) % 1_000_003) / 1_000_003) * Math.PI * 2;
  const z = ((stableHash(`${seed}:latitude`) % 1_000_033) / 1_000_033) * 2 - 1;
  const radius = Math.sqrt(Math.max(0, 1 - z * z));
  return [Math.cos(longitude) * radius, Math.sin(longitude) * radius, z];
}

function truncateLabel(label: string, maxLength = 34): string {
  const characters = Array.from(label.trim());
  if (characters.length <= maxLength) {
    return characters.join("");
  }
  return `${characters.slice(0, maxLength - 1).join("")}…`;
}

function changedPrefix(node: EnterpriseKnowledgeGraphNode): string {
  if (node.changed === "added") {
    return "+ ";
  }
  if (node.changed === "removed") {
    return "− ";
  }
  if (node.changed === "changed") {
    return "~ ";
  }
  return "";
}

function createCoordinates(
  nodes: EnterpriseKnowledgeGraphNode[],
  edges: EnterpriseKnowledgeGraphEdge[],
  topologyMode: GraphTopologyMode,
): Map<string, readonly [number, number, number]> {
  const byRef = new Map(nodes.map((node) => [node.nodeRef, node]));
  const containsParent = new Map<string, string>();
  for (const edge of edges) {
    if (
      edge.kind === "contains" &&
      byRef.has(edge.sourceNodeRef) &&
      byRef.has(edge.targetNodeRef)
    ) {
      containsParent.set(edge.targetNodeRef, edge.sourceNodeRef);
    }
  }

  const coordinates = new Map<string, readonly [number, number, number]>();
  const resolving = new Set<string>();
  const resolve = (nodeRef: string): readonly [number, number, number] => {
    const existing = coordinates.get(nodeRef);
    if (existing) {
      return existing;
    }
    const node = byRef.get(nodeRef);
    const vector = seededUnitVector(nodeRef);
    if (!node || topologyMode !== "structure") {
      const radius = 95 + Math.min(80, Math.sqrt(Math.max(0, node?.degree ?? 0)) * 13);
      const result = [vector[0] * radius, vector[1] * radius, vector[2] * radius] as const;
      coordinates.set(nodeRef, result);
      return result;
    }
    if (node.kind === "source") {
      const sourceCount = nodes.filter((candidate) => candidate.kind === "source").length;
      const radius = sourceCount > 1 ? 90 : 0;
      const result =
        radius === 0
          ? ([0, 0, 0] as const)
          : ([vector[0] * radius, vector[1] * radius, vector[2] * radius] as const);
      coordinates.set(nodeRef, result);
      return result;
    }
    const parentRef = containsParent.get(nodeRef);
    if (parentRef && !resolving.has(parentRef)) {
      resolving.add(nodeRef);
      const parent = resolve(parentRef);
      resolving.delete(nodeRef);
      const distance = byRef.get(parentRef)?.kind === "source" ? 115 : 62;
      const result = [
        parent[0] + vector[0] * distance,
        parent[1] + vector[1] * distance,
        parent[2] + vector[2] * distance,
      ] as const;
      coordinates.set(nodeRef, result);
      return result;
    }
    const result = [vector[0] * 140, vector[1] * 140, vector[2] * 140] as const;
    coordinates.set(nodeRef, result);
    return result;
  };

  for (const node of [...nodes].sort((left, right) => left.nodeRef.localeCompare(right.nodeRef))) {
    resolve(node.nodeRef);
  }
  return coordinates;
}

export function createGraphVisualModel(
  nodes: EnterpriseKnowledgeGraphNode[],
  edges: EnterpriseKnowledgeGraphEdge[],
  topologyMode: GraphTopologyMode,
): GraphVisualModel {
  const coordinates = createCoordinates(nodes, edges, topologyMode);
  const importantRefs = new Set(
    [...nodes]
      .filter((node) => node.kind !== "source")
      .sort(
        (left, right) => right.degree - left.degree || left.nodeRef.localeCompare(right.nodeRef),
      )
      .slice(0, 8)
      .map((node) => node.nodeRef),
  );
  const visualNodes = nodes.map((node) => {
    const [x, y, z] = coordinates.get(node.nodeRef) ?? [0, 0, 0];
    const label = `${changedPrefix(node)}${node.label}`;
    return {
      id: node.nodeRef,
      nodeRef: node.nodeRef,
      kind: node.kind,
      label,
      shortLabel: truncateLabel(label),
      degree: node.degree,
      value: Math.max(3, Math.min(18, 4 + Math.sqrt(Math.max(0, node.degree)) * 1.7)),
      x,
      y,
      z,
      important: node.kind === "source" || importantRefs.has(node.nodeRef),
      changed: node.changed,
    } satisfies GraphVisualNode;
  });
  const nodeRefs = new Set(visualNodes.map((node) => node.nodeRef));
  const neighborSets = new Map<string, Set<string>>(
    visualNodes.map((node) => [node.nodeRef, new Set<string>()]),
  );
  const edgeEnds = new Map<string, readonly [string, string]>();
  const links = edges.flatMap((edge): GraphVisualLink[] => {
    if (!nodeRefs.has(edge.sourceNodeRef) || !nodeRefs.has(edge.targetNodeRef)) {
      return [];
    }
    neighborSets.get(edge.sourceNodeRef)?.add(edge.targetNodeRef);
    neighborSets.get(edge.targetNodeRef)?.add(edge.sourceNodeRef);
    edgeEnds.set(edge.edgeRef, [edge.sourceNodeRef, edge.targetNodeRef]);
    return [
      {
        id: edge.edgeRef,
        edgeRef: edge.edgeRef,
        source: edge.sourceNodeRef,
        target: edge.targetNodeRef,
        sourceNodeRef: edge.sourceNodeRef,
        targetNodeRef: edge.targetNodeRef,
        kind: edge.kind,
        reviewStatus: edge.reviewStatus,
        confidence: edge.confidence,
        changed: edge.changed,
      },
    ];
  });
  return { nodes: visualNodes, links, neighbors: neighborSets, edgeEnds };
}

function parseColor(color: string): readonly [number, number, number] | undefined {
  const rgb = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  const hex = color.match(/^#([\da-f]{6})$/i)?.[1];
  if (hex) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }
  return undefined;
}

function luminance(color: string): number | undefined {
  const channels = parseColor(color);
  if (!channels) {
    return undefined;
  }
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  if (foregroundLuminance === undefined || backgroundLuminance === undefined) {
    return 1;
  }
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureReadableText(
  candidate: string,
  strongCandidate: string,
  background: string,
): string {
  if (contrastRatio(candidate, background) >= 4.5) {
    return candidate;
  }
  if (contrastRatio(strongCandidate, background) >= 4.5) {
    return strongCandidate;
  }
  const black = "rgb(0, 0, 0)";
  const white = "rgb(255, 255, 255)";
  return contrastRatio(black, background) > contrastRatio(white, background) ? black : white;
}

export function readGraphThemePalette(host: HTMLElement): GraphThemePalette {
  if (!host.isConnected || typeof getComputedStyle !== "function") {
    return FALLBACK_PALETTE;
  }
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:absolute;inline-size:0;block-size:0;overflow:hidden;pointer-events:none;visibility:hidden";
  host.append(probe);
  const resolve = (variable: string, fallback: string): string => {
    probe.style.color = `var(${variable}, ${fallback})`;
    return getComputedStyle(probe).color || fallback;
  };
  const resolved: Omit<GraphThemePalette, "nodes"> = {
    background: resolve(PALETTE_VARIABLES.background, FALLBACK_PALETTE.background),
    surface: resolve(PALETTE_VARIABLES.surface, FALLBACK_PALETTE.surface),
    text: resolve(PALETTE_VARIABLES.text, FALLBACK_PALETTE.text),
    textStrong: resolve(PALETTE_VARIABLES.textStrong, FALLBACK_PALETTE.textStrong),
    mutedText: resolve(PALETTE_VARIABLES.mutedText, FALLBACK_PALETTE.mutedText),
    tooltipBackground: resolve(
      PALETTE_VARIABLES.tooltipBackground,
      FALLBACK_PALETTE.tooltipBackground,
    ),
    tooltipBorder: resolve(PALETTE_VARIABLES.tooltipBorder, FALLBACK_PALETTE.tooltipBorder),
    edge: resolve(PALETTE_VARIABLES.edge, FALLBACK_PALETTE.edge),
    edgeDim: resolve(PALETTE_VARIABLES.edgeDim, FALLBACK_PALETTE.edgeDim),
    selected: resolve(PALETTE_VARIABLES.selected, FALLBACK_PALETTE.selected),
    focus: resolve(PALETTE_VARIABLES.focus, FALLBACK_PALETTE.focus),
    proposed: resolve(PALETTE_VARIABLES.proposed, FALLBACK_PALETTE.proposed),
    rejected: resolve(PALETTE_VARIABLES.rejected, FALLBACK_PALETTE.rejected),
  };
  const nodes: GraphThemePalette["nodes"] = {
    source: resolve(NODE_VARIABLES.source, FALLBACK_PALETTE.nodes.source),
    section: resolve(NODE_VARIABLES.section, FALLBACK_PALETTE.nodes.section),
    entity: resolve(NODE_VARIABLES.entity, FALLBACK_PALETTE.nodes.entity),
    concept: resolve(NODE_VARIABLES.concept, FALLBACK_PALETTE.nodes.concept),
    claim: resolve(NODE_VARIABLES.claim, FALLBACK_PALETTE.nodes.claim),
  };
  probe.remove();
  const text = ensureReadableText(resolved.text, resolved.textStrong, resolved.background);
  return { ...resolved, text, nodes };
}

export function graphSelectionNeighborhood(
  model: GraphVisualModel,
  selection: GraphRendererSelection,
): ReadonlySet<string> | undefined {
  const activeNode = selection.hoveredNodeRef ?? selection.selectedNodeRef;
  if (activeNode) {
    return new Set([activeNode, ...(model.neighbors.get(activeNode) ?? [])]);
  }
  const activeEdge = selection.hoveredEdgeRef ?? selection.selectedEdgeRef;
  const ends = activeEdge ? model.edgeEnds.get(activeEdge) : undefined;
  return ends ? new Set(ends) : undefined;
}
