import { html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { OpenClawLightDomElement } from "../../lit/openclaw-element.ts";
import {
  EnterpriseApiError,
  type EnterprisePortalAudience,
} from "../enterprise/services/enterprise-api.ts";
import {
  createEnterpriseKnowledgeGraphExport,
  createEnterpriseKnowledgeGraphManualEdge,
  enterpriseKnowledgeGraphExportDownloadUrl,
  loadEnterpriseKnowledgeGraphAnalysis,
  loadEnterpriseKnowledgeGraphDiff,
  loadEnterpriseKnowledgeGraphNeighborhood,
  loadEnterpriseKnowledgeGraphNode,
  reviewEnterpriseKnowledgeGraphEdges,
  searchEnterpriseKnowledgeGraph,
  type EnterpriseKnowledgeGraphEdge,
  type EnterpriseKnowledgeGraphEdgeKind,
  type EnterpriseKnowledgeGraphNeighborhood,
  type EnterpriseKnowledgeGraphNode,
  type EnterpriseKnowledgeGraphNodeDetail,
  type EnterpriseKnowledgeGraphNodeKind,
  type EnterpriseKnowledgeGraphOrigin,
  type EnterpriseKnowledgeGraphReviewStatus,
  type EnterpriseKnowledgeGraphSnapshot,
  type EnterpriseKnowledgeGraphSummary,
  type EnterpriseKnowledgeZoneRole,
} from "../enterprise/services/enterprise-knowledge-api.ts";
import {
  chooseDefaultGraphRenderMode,
  createGraphVisualModel,
  readGraphThemePalette,
  type GraphRendererAdapter,
  type GraphRendererSelection,
  type GraphRenderMode,
  type GraphTopologyMode,
} from "./knowledge-graph-renderer.ts";
import "./knowledge-graph-view.css";

type GraphDisplaySnapshot = EnterpriseKnowledgeGraphSnapshot | "compare";
type GraphViewMode = "global" | "local";
type CompareCounts = { added: number; removed: number; changed: number };
type GraphAnalysis = Awaited<ReturnType<typeof loadEnterpriseKnowledgeGraphAnalysis>>["analysis"];

const NODE_KINDS: EnterpriseKnowledgeGraphNodeKind[] = [
  "source",
  "section",
  "entity",
  "concept",
  "claim",
];
const EDGE_KINDS: EnterpriseKnowledgeGraphEdgeKind[] = [
  "contains",
  "references",
  "mentions",
  "similar",
  "supports",
  "contradicts",
  "supersedes",
  "depends_on",
  "applies_to",
  "custom",
];
const ORIGINS: EnterpriseKnowledgeGraphOrigin[] = ["deterministic", "semantic", "ai", "manual"];
const REVIEW_STATUSES: EnterpriseKnowledgeGraphReviewStatus[] = [
  "accepted",
  "proposed",
  "rejected",
];

const NODE_LABELS: Record<EnterpriseKnowledgeGraphNodeKind, string> = {
  source: "Nguồn",
  section: "Mục",
  entity: "Thực thể",
  concept: "Khái niệm",
  claim: "Nhận định",
};
const EDGE_LABELS: Record<EnterpriseKnowledgeGraphEdgeKind, string> = {
  contains: "chứa",
  references: "tham chiếu",
  mentions: "đề cập",
  similar: "tương tự",
  supports: "hỗ trợ",
  contradicts: "mâu thuẫn",
  supersedes: "thay thế",
  depends_on: "phụ thuộc",
  applies_to: "áp dụng cho",
  custom: "tùy chỉnh",
};
const ORIGIN_LABELS: Record<EnterpriseKnowledgeGraphOrigin, string> = {
  deterministic: "Xác định",
  semantic: "Ngữ nghĩa",
  ai: "AI",
  manual: "Thủ công",
};
const REVIEW_LABELS: Record<EnterpriseKnowledgeGraphReviewStatus, string> = {
  accepted: "Đã duyệt",
  proposed: "Chờ duyệt",
  rejected: "Đã từ chối",
};
const GRAPH_STATUS_LABELS: Record<EnterpriseKnowledgeGraphSummary["status"], string> = {
  ready: "Sẵn sàng",
  degraded: "Giới hạn",
  not_built: "Chưa tạo",
  corrupt: "Hỏng dữ liệu",
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Không thể tải bản đồ tri thức.";
}

function graphErrorMessage(error: unknown, snapshot: EnterpriseKnowledgeGraphSnapshot): string {
  if (!(error instanceof EnterpriseApiError)) {
    return message(error);
  }
  if (error.code === "PUBLICATION_NOT_FOUND") {
    return "Zone chưa có publication đang hoạt động. Hãy publish Candidate trước khi xem Active Graph.";
  }
  if (error.code === "CANDIDATE_NOT_READY") {
    return "Zone chưa có Candidate. Hãy tải nguồn lên và tạo Candidate mới.";
  }
  if (error.code === "GRAPH_NOT_BUILT") {
    return snapshot === "active"
      ? "Publication hiện tại chưa có Graph. Hãy tạo và publish một Candidate Graph mới."
      : "Candidate hiện tại được tạo khi Knowledge Graph đang tắt. Hãy bật Graph trong Cấu hình và tạo Candidate mới.";
  }
  if (error.code === "GRAPH_INTEGRITY_FAILED") {
    return "Graph không vượt qua kiểm tra toàn vẹn. Hãy tạo lại Candidate và kiểm tra tác vụ lỗi.";
  }
  return message(error);
}

function inputValue(event: Event): string {
  return event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : "";
}

function selectValue(event: Event): string {
  return event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : "";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function graphEdgeKind(value: string): EnterpriseKnowledgeGraphEdgeKind {
  return EDGE_KINDS.find((kind) => kind === value) ?? "custom";
}

function edgeSymbol(edge: EnterpriseKnowledgeGraphEdge): string {
  if (edge.changed === "added") {
    return "+";
  }
  if (edge.changed === "removed") {
    return "−";
  }
  if (edge.changed === "changed") {
    return "~";
  }
  if (edge.reviewStatus === "proposed") {
    return "?";
  }
  if (edge.reviewStatus === "rejected") {
    return "×";
  }
  return "→";
}

function roleLevel(role: EnterpriseKnowledgeZoneRole): number {
  return { viewer: 1, curator: 2, manager: 3 }[role];
}

export class OpenClawKnowledgeGraphView extends OpenClawLightDomElement {
  @property() audience: EnterprisePortalAudience = "user";
  @property({ attribute: "zone-id" }) zoneId = "";
  @property({ attribute: "zone-name" }) zoneName = "";
  @property() override role: EnterpriseKnowledgeZoneRole = "viewer";
  @property({ type: Number, attribute: "zone-revision" }) zoneRevision = 0;
  @property({ type: Number, attribute: "snapshot-revision" }) snapshotRevision = 0;
  @property({ type: Boolean, attribute: "has-candidate" }) hasCandidate = false;
  @property({ type: Boolean, attribute: "has-active-publication" }) hasActivePublication = false;

  @state() private snapshot: GraphDisplaySnapshot = "active";
  @state() private viewMode: GraphViewMode = "global";
  @state() private renderMode: GraphRenderMode = "3d";
  @state() private topologyMode: GraphTopologyMode = "structure";
  @state() private depth: 1 | 2 = 1;
  @state() private query = "";
  @state() private minConfidence = 0;
  @state() private nodeKinds = new Set<EnterpriseKnowledgeGraphNodeKind>(NODE_KINDS);
  @state() private edgeKinds = new Set<EnterpriseKnowledgeGraphEdgeKind>(EDGE_KINDS);
  @state() private origins = new Set<EnterpriseKnowledgeGraphOrigin>(ORIGINS);
  @state() private reviewStatuses = new Set<EnterpriseKnowledgeGraphReviewStatus>([
    "accepted",
    "proposed",
  ]);
  @state() private graph?: EnterpriseKnowledgeGraphNeighborhood;
  @state() private selectedNode?: EnterpriseKnowledgeGraphNodeDetail;
  @state() private selectedEdge?: EnterpriseKnowledgeGraphEdge;
  @state() private selectedEdgeEvidence?: EnterpriseKnowledgeGraphNodeDetail;
  @state() private searchResults: EnterpriseKnowledgeGraphNode[] = [];
  @state() private compareCounts?: CompareCounts;
  @state() private compareNodes: EnterpriseKnowledgeGraphNode[] = [];
  @state() private compareEdges: EnterpriseKnowledgeGraphEdge[] = [];
  @state() private loading = false;
  @state() private error = "";
  @state() private warning = "";
  @state() private paused = false;
  @state() private selectedReviews = new Set<string>();
  @state() private reviewReplacement: EnterpriseKnowledgeGraphEdgeKind = "references";
  @state() private reviewNote = "";
  @state() private exporting = false;
  @state() private exportUrl = "";
  @state() private currentRevision = 0;
  @state() private analysis?: GraphAnalysis;

  private abort?: AbortController;
  private renderer?: GraphRendererAdapter;
  private renderSequence = 0;
  private reducedMotion?: MediaQueryList;
  private themeObserver?: MutationObserver;
  private resizeObserver?: ResizeObserver;
  private themeFrame?: number;
  private focusFrame?: number;
  private renderModeUserSelected = false;
  private hoveredNodeRef?: string;
  private hoveredEdgeRef?: string;
  private pendingFocusNodeRef?: string;
  private localRootNodeRef?: string;
  private loadedSnapshotRevision = -1;

  override connectedCallback(): void {
    super.connectedCallback();
    this.currentRevision = this.zoneRevision;
    this.reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    const mobile = Boolean(globalThis.matchMedia?.("(max-width: 768px)").matches);
    if (mobile) {
      this.viewMode = "local";
    }
    this.renderMode = chooseDefaultGraphRenderMode({
      webGlAvailable: this.webGlAvailable(),
      reducedMotion: Boolean(this.reducedMotion?.matches),
      mobile,
      weakDevice: this.weakDevice(),
    });
    if (this.renderMode === "list") {
      this.paused = true;
    }
    this.reducedMotion?.addEventListener("change", this.handleReducedMotionChange);
    this.themeObserver = new MutationObserver(() => this.scheduleThemeUpdate());
    const observation: MutationObserverInit = {
      attributes: true,
      attributeFilter: ["data-theme", "data-theme-mode", "style", "class"],
    };
    this.themeObserver.observe(document.documentElement, observation);
    if (document.body) {
      this.themeObserver.observe(document.body, observation);
    }
    for (let ancestor = this.parentElement; ancestor; ancestor = ancestor.parentElement) {
      this.themeObserver.observe(ancestor, observation);
    }
    this.themeObserver.observe(this, observation);
  }

  override disconnectedCallback(): void {
    this.abort?.abort();
    this.reducedMotion?.removeEventListener("change", this.handleReducedMotionChange);
    this.themeObserver?.disconnect();
    this.themeObserver = undefined;
    this.destroyRenderer();
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has("zoneId")) {
      this.currentRevision = this.zoneRevision;
      this.snapshot = this.defaultSnapshot();
      this.selectedNode = undefined;
      this.selectedEdge = undefined;
      this.selectedEdgeEvidence = undefined;
      this.searchResults = [];
      this.exportUrl = "";
      this.analysis = undefined;
      this.loadedSnapshotRevision = -1;
      this.localRootNodeRef = undefined;
      this.destroyRenderer();
      if (this.zoneId && this.snapshotAvailable(this.snapshot)) {
        void this.loadGraph();
      }
      return;
    }
    if (
      changed.has("hasActivePublication") ||
      changed.has("hasCandidate") ||
      changed.has("audience") ||
      changed.has("role")
    ) {
      if (!this.snapshotAvailable(this.snapshot)) {
        this.snapshot = this.defaultSnapshot();
        this.graph = undefined;
        this.error = "";
        if (this.zoneId && this.snapshotAvailable(this.snapshot)) {
          void this.loadGraph();
        }
      }
    }
    if (changed.has("zoneRevision") && this.zoneRevision > this.currentRevision) {
      this.currentRevision = this.zoneRevision;
    }
    if (
      changed.has("snapshotRevision") &&
      this.snapshotRevision !== this.loadedSnapshotRevision &&
      this.zoneId &&
      this.snapshotAvailable(this.snapshot)
    ) {
      void this.loadGraph();
    }
    if (changed.has("graph") || changed.has("renderMode") || changed.has("topologyMode")) {
      void this.renderCanvas();
      return;
    }
    if (changed.has("selectedNode") || changed.has("selectedEdge")) {
      this.syncRendererSelection();
    }
  }

  private readonly handleReducedMotionChange = (event: MediaQueryListEvent): void => {
    if (event.matches && !this.renderModeUserSelected) {
      this.paused = true;
      this.renderMode = "list";
    }
  };

  private get canCandidate(): boolean {
    return this.audience === "admin" || roleLevel(this.role) >= roleLevel("curator");
  }

  private get canExport(): boolean {
    return this.audience === "admin" || roleLevel(this.role) >= roleLevel("manager");
  }

  private defaultSnapshot(): GraphDisplaySnapshot {
    if (this.hasActivePublication) {
      return "active";
    }
    if (this.canCandidate && this.hasCandidate) {
      return "candidate";
    }
    return "active";
  }

  private snapshotAvailable(snapshot: GraphDisplaySnapshot): boolean {
    if (snapshot === "active") {
      return this.hasActivePublication;
    }
    if (snapshot === "candidate") {
      return this.canCandidate && this.hasCandidate;
    }
    return this.canCandidate && this.hasCandidate && this.hasActivePublication;
  }

  private webGlAvailable(): boolean {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }

  private weakDevice(): boolean {
    const deviceMemory = "deviceMemory" in navigator ? navigator.deviceMemory : undefined;
    return (
      (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
      (typeof deviceMemory === "number" && deviceMemory <= 4)
    );
  }

  private graphSelection(): GraphRendererSelection {
    return {
      selectedNodeRef: this.selectedNode?.nodeRef,
      selectedEdgeRef: this.selectedEdge?.edgeRef,
      hoveredNodeRef: this.hoveredNodeRef,
      hoveredEdgeRef: this.hoveredEdgeRef,
    };
  }

  private syncRendererSelection(): void {
    this.renderer?.updateSelection(this.graphSelection());
  }

  private scheduleThemeUpdate(): void {
    if (this.themeFrame !== undefined) {
      cancelAnimationFrame(this.themeFrame);
    }
    this.themeFrame = requestAnimationFrame(() => {
      this.themeFrame = undefined;
      const themeHost = this.querySelector<HTMLElement>(".knowledge-graph-shell") ?? this;
      this.renderer?.updateTheme(readGraphThemePalette(themeHost));
    });
  }

  private destroyRenderer(): void {
    this.renderSequence += 1;
    if (this.themeFrame !== undefined) {
      cancelAnimationFrame(this.themeFrame);
      this.themeFrame = undefined;
    }
    if (this.focusFrame !== undefined) {
      cancelAnimationFrame(this.focusFrame);
      this.focusFrame = undefined;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.renderer?.destroy();
    this.renderer = undefined;
    const canvas = this.querySelector<HTMLElement>("[data-knowledge-graph-canvas]");
    canvas?.replaceChildren();
  }

  private async renderCanvas(): Promise<void> {
    this.destroyRenderer();
    if (this.renderMode === "list" || !this.graph?.nodes.length) {
      return;
    }
    const container = this.querySelector<HTMLElement>("[data-knowledge-graph-canvas]");
    if (!container) {
      return;
    }
    const sequence = this.renderSequence;
    try {
      const createRenderer =
        this.renderMode === "3d"
          ? (await import("./knowledge-graph-renderer-3d.runtime.ts"))
              .createKnowledgeGraph3dRenderer
          : (await import("./knowledge-graph-renderer-2d.runtime.ts"))
              .createKnowledgeGraph2dRenderer;
      if (sequence !== this.renderSequence || !container.isConnected) {
        return;
      }
      const visualModel = createGraphVisualModel(
        this.graph.nodes,
        this.graph.edges,
        this.topologyMode,
      );
      const themeHost = this.querySelector<HTMLElement>(".knowledge-graph-shell") ?? this;
      const renderer = await createRenderer({
        container,
        model: visualModel,
        palette: readGraphThemePalette(themeHost),
        topologyMode: this.topologyMode,
        reducedMotion: Boolean(this.reducedMotion?.matches),
        callbacks: {
          onNodeClick: (nodeRef) => void this.selectNode(nodeRef),
          onEdgeClick: (edgeRef) => void this.selectEdge(edgeRef),
          onNodeHover: (nodeRef) => {
            this.hoveredNodeRef = nodeRef;
            this.syncRendererSelection();
          },
          onEdgeHover: (edgeRef) => {
            this.hoveredEdgeRef = edgeRef;
            this.syncRendererSelection();
          },
          onContextLost: () => {
            if (sequence !== this.renderSequence || this.renderMode === "list") {
              return;
            }
            this.warning = "WebGL bị gián đoạn; đã chuyển sang chế độ danh sách an toàn.";
            this.renderMode = "list";
          },
        },
      });
      if (sequence !== this.renderSequence || !container.isConnected) {
        renderer.destroy();
        return;
      }
      this.renderer = renderer;
      this.syncRendererSelection();
      if (this.paused) {
        renderer.pause();
      }
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          renderer.resize(entry.contentRect.width, entry.contentRect.height);
        }
      });
      this.resizeObserver.observe(container);
      const focusNodeRef = this.pendingFocusNodeRef ?? this.selectedNode?.nodeRef;
      if (focusNodeRef) {
        this.focusFrame = requestAnimationFrame(() => {
          this.focusFrame = undefined;
          renderer.focus(focusNodeRef);
          if (this.pendingFocusNodeRef === focusNodeRef) {
            this.pendingFocusNodeRef = undefined;
          }
        });
      }
    } catch (error) {
      this.destroyRenderer();
      if (this.renderMode === "3d" && this.webGlAvailable()) {
        this.warning = `Không thể khởi tạo 3D (${message(error)}). Đã chuyển sang đồ thị 2D.`;
        this.renderMode = "2d";
      } else {
        this.warning = `Không thể khởi tạo WebGL (${message(error)}). Đã chuyển sang danh sách.`;
        this.renderMode = "list";
      }
    }
  }

  private request(input: Parameters<typeof loadEnterpriseKnowledgeGraphNeighborhood>[2]) {
    this.abort?.abort();
    this.abort = new AbortController();
    return loadEnterpriseKnowledgeGraphNeighborhood(
      this.audience,
      this.zoneId,
      input,
      this.abort.signal,
    );
  }

  private graphSnapshot(): EnterpriseKnowledgeGraphSnapshot {
    return this.snapshot === "active" ? "active" : "candidate";
  }

  private effectiveNodeKinds(): EnterpriseKnowledgeGraphNodeKind[] {
    if (this.topologyMode === "structure") {
      return ["source", "section"];
    }
    if (this.topologyMode === "relations") {
      return ["entity", "concept", "claim"];
    }
    return [...this.nodeKinds];
  }

  private effectiveEdgeKinds(): EnterpriseKnowledgeGraphEdgeKind[] {
    if (this.topologyMode === "structure") {
      return ["contains", "references"];
    }
    if (this.topologyMode === "relations") {
      return EDGE_KINDS.filter((kind) => kind !== "contains");
    }
    return [...this.edgeKinds];
  }

  private async loadGraph(nodeRef?: string): Promise<void> {
    if (!this.zoneId) {
      return;
    }
    this.loading = true;
    this.error = "";
    this.warning = "";
    this.selectedReviews = new Set();
    try {
      const snapshot = this.graphSnapshot();
      const localRoot =
        this.viewMode === "local"
          ? (nodeRef ?? this.selectedNode?.nodeRef ?? this.localRootNodeRef)
          : undefined;
      const [graph, diff, analysisResult] = await Promise.all([
        this.request({
          snapshot,
          nodeRef: localRoot,
          depth: this.depth,
          nodeKinds: this.effectiveNodeKinds(),
          edgeKinds: this.effectiveEdgeKinds(),
          origins: [...this.origins],
          reviewStatuses: snapshot === "active" ? ["accepted"] : [...this.reviewStatuses],
          minConfidence: this.minConfidence,
        }),
        this.snapshot === "compare"
          ? loadEnterpriseKnowledgeGraphDiff(this.audience, this.zoneId)
          : Promise.resolve(undefined),
        loadEnterpriseKnowledgeGraphAnalysis(this.audience, this.zoneId, snapshot),
      ]);
      this.analysis = analysisResult.analysis;
      this.loadedSnapshotRevision = this.snapshotRevision;
      if (diff) {
        const changedByRef = new Map(diff.diff.edges.map((edge) => [edge.edgeRef, edge.changed]));
        const changedNodeByRef = new Map(
          diff.diff.nodes.map((node) => [node.nodeRef, node.changed] as const),
        );
        graph.edges = graph.edges.map((edge) => ({
          ...edge,
          changed: changedByRef.get(edge.edgeRef),
        }));
        graph.nodes = graph.nodes.map((node) => ({
          ...node,
          changed: changedNodeByRef.get(node.nodeRef),
        }));
        this.compareNodes = diff.diff.nodes;
        this.compareEdges = diff.diff.edges;
        this.compareCounts = diff.diff.counts;
      } else {
        this.compareNodes = [];
        this.compareEdges = [];
        this.compareCounts = undefined;
      }
      this.graph = {
        ...graph,
        nodes: graph.nodes.slice(0, 500),
        edges: graph.edges.slice(0, 1_500),
      };
      if (!this.renderModeUserSelected) {
        this.renderMode = chooseDefaultGraphRenderMode({
          webGlAvailable: this.webGlAvailable(),
          reducedMotion: Boolean(this.reducedMotion?.matches),
          mobile: Boolean(globalThis.matchMedia?.("(max-width: 768px)").matches),
          weakDevice: this.weakDevice(),
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
        });
      }
      if (graph.nodes.length >= 500 || graph.edges.length >= 1_500 || graph.truncated) {
        this.warning =
          "Graph lớn đã được giới hạn trên màn hình. Chọn một node và dùng chế độ lân cận để khám phá chính xác hơn.";
      }
      if (this.viewMode === "local" && !localRoot && graph.nodes[0]) {
        this.localRootNodeRef = graph.nodes[0].nodeRef;
        await this.loadGraph(graph.nodes[0].nodeRef);
      }
    } catch (error) {
      if (!isAbortError(error)) {
        this.graph = undefined;
        this.error = graphErrorMessage(error, this.graphSnapshot());
      }
    } finally {
      this.loading = false;
    }
  }

  private async changeSnapshot(snapshot: GraphDisplaySnapshot): Promise<void> {
    if (!this.snapshotAvailable(snapshot)) {
      return;
    }
    this.snapshot = snapshot;
    this.selectedNode = undefined;
    this.selectedEdge = undefined;
    this.selectedEdgeEvidence = undefined;
    this.localRootNodeRef = undefined;
    this.searchResults = [];
    await this.loadGraph();
  }

  private async selectNode(nodeRef: string): Promise<void> {
    this.pendingFocusNodeRef = nodeRef;
    this.loading = true;
    this.error = "";
    this.abort?.abort();
    this.abort = new AbortController();
    try {
      this.selectedEdge = undefined;
      this.selectedEdgeEvidence = undefined;
      this.selectedNode = (
        await loadEnterpriseKnowledgeGraphNode(
          this.audience,
          this.zoneId,
          this.graphSnapshot(),
          nodeRef,
          this.abort.signal,
        )
      ).node;
      this.localRootNodeRef = nodeRef;
      if (this.viewMode === "local") {
        await this.loadGraph(nodeRef);
      } else {
        this.focusFrame = requestAnimationFrame(() => {
          this.focusFrame = undefined;
          this.renderer?.focus(nodeRef);
          this.pendingFocusNodeRef = undefined;
        });
      }
    } catch (error) {
      if (!isAbortError(error)) {
        this.error = message(error);
      }
    } finally {
      this.loading = false;
    }
  }

  private async selectEdge(edgeRef: string): Promise<void> {
    const edge = this.graph?.edges.find((item) => item.edgeRef === edgeRef);
    if (!edge) {
      return;
    }
    this.loading = true;
    this.error = "";
    this.abort?.abort();
    this.abort = new AbortController();
    try {
      this.selectedNode = undefined;
      this.selectedEdge = edge;
      this.selectedEdgeEvidence = (
        await loadEnterpriseKnowledgeGraphNode(
          this.audience,
          this.zoneId,
          this.graphSnapshot(),
          edge.sourceNodeRef,
          this.abort.signal,
        )
      ).node;
    } catch (error) {
      if (!isAbortError(error)) {
        this.error = message(error);
      }
    } finally {
      this.loading = false;
    }
  }

  private async search(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const query = this.query.trim();
    if (!query) {
      this.searchResults = [];
      await this.loadGraph();
      return;
    }
    this.loading = true;
    this.error = "";
    try {
      this.searchResults = (
        await searchEnterpriseKnowledgeGraph(this.audience, this.zoneId, {
          snapshot: this.graphSnapshot(),
          query,
          nodeKinds: [...this.nodeKinds],
        })
      ).nodes;
      const first = this.searchResults[0];
      if (first) {
        this.viewMode = "local";
        await this.selectNode(first.nodeRef);
      }
    } catch (error) {
      this.error = message(error);
    } finally {
      this.loading = false;
    }
  }

  private toggleSet<T extends string>(values: Set<T>, value: T, checked: boolean): Set<T> {
    const next = new Set(values);
    if (checked) {
      next.add(value);
    } else {
      next.delete(value);
    }
    return next;
  }

  private toggleReview(edgeRef: string, checked: boolean): void {
    this.selectedReviews = this.toggleSet(this.selectedReviews, edgeRef, checked);
  }

  private async decideReviews(decision: "approve" | "reject" | "change_kind"): Promise<void> {
    if (!this.selectedReviews.size) {
      return;
    }
    this.loading = true;
    this.error = "";
    try {
      const result = await reviewEnterpriseKnowledgeGraphEdges(this.audience, this.zoneId, {
        baseRevision: this.currentRevision,
        decisions: [...this.selectedReviews].map((edgeRef) => ({
          edgeRef,
          decision,
          edgeKind: decision === "change_kind" ? this.reviewReplacement : undefined,
          note: this.reviewNote.trim() || undefined,
        })),
      });
      this.currentRevision = result.zone.revision;
      this.selectedReviews = new Set();
      this.reviewNote = "";
      this.warning = "Quyết định đã được lưu. Candidate mới đang được rebuild theo batch.";
      this.dispatchEvent(
        new CustomEvent("knowledge-graph-changed", {
          bubbles: true,
          composed: true,
          detail: { zone: result.zone, jobId: result.jobId },
        }),
      );
    } catch (error) {
      this.error = message(error);
    } finally {
      this.loading = false;
    }
  }

  private async createManualEdge(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.selectedNode?.evidence[0]) {
      this.error = "Chọn node có evidence trước khi tạo quan hệ thủ công.";
      return;
    }
    if (!(event.currentTarget instanceof HTMLFormElement)) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const targetNodeRef = String(data.get("targetNodeRef") ?? "");
    if (!targetNodeRef || targetNodeRef === this.selectedNode.nodeRef) {
      this.error = "Chọn một node đích khác node nguồn.";
      return;
    }
    const evidence = this.selectedNode.evidence[0];
    this.loading = true;
    this.error = "";
    try {
      const result = await createEnterpriseKnowledgeGraphManualEdge(this.audience, this.zoneId, {
        baseRevision: this.currentRevision,
        sourceNodeRef: this.selectedNode.nodeRef,
        targetNodeRef,
        edgeKind: graphEdgeKind(String(data.get("edgeKind"))),
        evidenceCitationId: evidence.citationId,
        evidenceLocator: evidence.locator,
        note: String(data.get("note") ?? "").trim() || undefined,
      });
      this.currentRevision = result.zone.revision;
      form.reset();
      this.warning = "Quan hệ thủ công đã được lưu; candidate mới đang được dựng.";
      this.dispatchEvent(
        new CustomEvent("knowledge-graph-changed", {
          bubbles: true,
          composed: true,
          detail: { zone: result.zone, jobId: result.jobId },
        }),
      );
    } catch (error) {
      this.error = message(error);
    } finally {
      this.loading = false;
    }
  }

  private async exportObsidian(): Promise<void> {
    this.exporting = true;
    this.error = "";
    try {
      const result = await createEnterpriseKnowledgeGraphExport(this.audience, this.zoneId);
      this.exportUrl = enterpriseKnowledgeGraphExportDownloadUrl(
        this.audience,
        this.zoneId,
        result.export.id,
      );
      this.warning = `Vault đã sẵn sàng: ${result.export.entryCount} tệp, hết hạn sau 15 phút.`;
    } catch (error) {
      this.error = message(error);
    } finally {
      this.exporting = false;
    }
  }

  private setRenderMode(mode: GraphRenderMode): void {
    this.renderModeUserSelected = true;
    if (mode !== "list" && !this.webGlAvailable()) {
      this.warning = "Thiết bị không hỗ trợ WebGL; đang giữ chế độ danh sách an toàn.";
      this.renderMode = "list";
      this.paused = true;
      return;
    }
    if (mode !== "list" && this.renderMode === "list") {
      this.paused = false;
    }
    this.renderMode = mode;
  }

  private toggleLayout(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.renderer?.pause();
    } else {
      this.renderer?.resume();
    }
  }

  private fitGraph(): void {
    this.renderer?.fit();
  }

  private async fullscreen(): Promise<void> {
    const shell = this.querySelector<HTMLElement>(".knowledge-graph-shell");
    if (!shell || !shell.requestFullscreen) {
      return;
    }
    try {
      await shell.requestFullscreen();
    } catch {
      this.warning = "Trình duyệt không cho phép mở toàn màn hình.";
    }
  }

  private openEvidence(evidence: EnterpriseKnowledgeGraphNodeDetail["evidence"][number]): void {
    this.dispatchEvent(
      new CustomEvent("knowledge-source-open", {
        bubbles: true,
        composed: true,
        detail: { citationId: evidence.citationId, locator: evidence.locator },
      }),
    );
  }

  private renderSummary(
    summary?: EnterpriseKnowledgeGraphSummary,
  ): TemplateResult | typeof nothing {
    if (!summary) {
      return nothing;
    }
    return html`<div class="knowledge-graph-kpis" aria-label="Thống kê graph">
      <span><strong>${summary.nodeCount}</strong> node</span>
      <span><strong>${summary.edgeCount}</strong> cạnh</span>
      <span><strong>${summary.proposedCount}</strong> chờ duyệt</span>
      <span><strong>${summary.orphanCount}</strong> orphan</span>
      <span><strong>${summary.componentCount}</strong> cụm</span>
      <span class="knowledge-graph-status is-${summary.status}"
        >${GRAPH_STATUS_LABELS[summary.status]}</span
      >
    </div>`;
  }

  private renderAnalysis(): TemplateResult | typeof nothing {
    const analysis = this.analysis;
    if (!analysis) {
      return nothing;
    }
    if (analysis.diagnosis === "mostly_structural") {
      return html`<div class="knowledge-graph-banner" role="status">
        <strong>Graph hiện chủ yếu là cấu trúc tài liệu.</strong>
        <span>
          ${analysis.aiAnalysisStatus === "off"
            ? "AI enrichment chưa tạo quan hệ nghiệp vụ. Hãy chạy Phân tích lại bằng AI Graph V3 trên Source Version."
            : "Hầu hết cạnh đang là quan hệ chứa; hãy chuyển sang chế độ Quan hệ để xem entity, khái niệm và nhận định."}
        </span>
      </div>`;
    }
    if (analysis.diagnosis === "ai_degraded") {
      return html`<div class="knowledge-graph-banner is-warning" role="status">
        <strong>AI enrichment đang ở trạng thái giới hạn.</strong>
        <span>
          Deterministic graph vẫn dùng được. Nguyên nhân:
          ${analysis.degradationReasons.join(", ") || "provider chưa sẵn sàng"}.
        </span>
      </div>`;
    }
    return nothing;
  }

  private renderMultiFilter<T extends string>(
    title: string,
    values: readonly T[],
    selected: Set<T>,
    label: (value: T) => string,
    change: (next: Set<T>) => void,
  ): TemplateResult {
    return html`<fieldset class="knowledge-graph-filter">
      <legend>${title}</legend>
      ${values.map(
        (value) => html`<label
          ><input
            type="checkbox"
            .checked=${selected.has(value)}
            @change=${(event: Event) => {
              const checked =
                event.currentTarget instanceof HTMLInputElement && event.currentTarget.checked;
              change(this.toggleSet(selected, value, checked));
              void this.loadGraph();
            }}
          />${label(value)}</label
        >`,
      )}
    </fieldset>`;
  }

  private renderFilters(): TemplateResult {
    return html`<aside class="knowledge-graph-filter-rail" aria-label="Bộ lọc graph">
      <div class="knowledge-graph-filter-heading">
        <strong>Bộ lọc</strong>
        <button
          class="knowledge-graph-text-button"
          type="button"
          @click=${() => {
            this.nodeKinds = new Set(NODE_KINDS);
            this.edgeKinds = new Set(EDGE_KINDS);
            this.origins = new Set(ORIGINS);
            this.reviewStatuses = new Set(["accepted", "proposed"]);
            this.minConfidence = 0;
            void this.loadGraph();
          }}
        >
          Đặt lại
        </button>
      </div>
      ${this.topologyMode === "all"
        ? this.renderMultiFilter(
            "Loại node",
            NODE_KINDS,
            this.nodeKinds,
            (value) => NODE_LABELS[value],
            (next) => (this.nodeKinds = next),
          )
        : nothing}
      ${this.topologyMode === "all"
        ? this.renderMultiFilter(
            "Quan hệ",
            EDGE_KINDS,
            this.edgeKinds,
            (value) => EDGE_LABELS[value],
            (next) => (this.edgeKinds = next),
          )
        : nothing}
      ${this.renderMultiFilter(
        "Nguồn tạo",
        ORIGINS,
        this.origins,
        (value) => ORIGIN_LABELS[value],
        (next) => (this.origins = next),
      )}
      ${this.snapshot !== "active"
        ? this.renderMultiFilter(
            "Review",
            REVIEW_STATUSES,
            this.reviewStatuses,
            (value) => REVIEW_LABELS[value],
            (next) => (this.reviewStatuses = next),
          )
        : nothing}
      <label class="knowledge-graph-range">
        Confidence tối thiểu <strong>${this.minConfidence.toFixed(2)}</strong>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          .value=${String(this.minConfidence)}
          @change=${(event: Event) => {
            this.minConfidence = Number(inputValue(event));
            void this.loadGraph();
          }}
        />
      </label>
    </aside>`;
  }

  private renderCanvasOrList(): TemplateResult {
    const graph = this.graph;
    if (!graph?.nodes.length && !this.loading) {
      return html`<div class="knowledge-graph-empty">
        <strong>Graph chưa có dữ liệu phù hợp</strong>
        <span>Thử bỏ bớt bộ lọc hoặc tạo Candidate Graph mới.</span>
      </div>`;
    }
    if (this.renderMode !== "list") {
      return html`<div class="knowledge-graph-viewport is-${this.renderMode}">
        <div
          class="knowledge-graph-canvas"
          data-knowledge-graph-canvas
          data-render-mode=${this.renderMode}
          role="img"
          aria-label=${`Bản đồ ${this.renderMode.toUpperCase()} gồm ${graph?.nodes.length ?? 0} node và ${graph?.edges.length ?? 0} cạnh. Dùng chế độ danh sách để điều hướng bằng bàn phím.`}
        ></div>
        <div class="knowledge-graph-navigation-help" aria-hidden="true">
          ${this.renderMode === "3d"
            ? "Kéo để xoay · cuộn để zoom · kéo phải để pan"
            : "Kéo để pan · cuộn để zoom"}
        </div>
      </div>`;
    }
    return html`<div class="knowledge-graph-list" role="region" aria-label="Danh sách graph">
      <table>
        <thead>
          <tr>
            <th>Node</th>
            <th>Loại</th>
            <th>Nguồn</th>
            <th>Liên kết</th>
          </tr>
        </thead>
        <tbody>
          ${(graph?.nodes ?? []).map(
            (node) => html`<tr>
              <td>
                <button type="button" @click=${() => void this.selectNode(node.nodeRef)}>
                  ${node.label}
                </button>
              </td>
              <td>${NODE_LABELS[node.kind]}</td>
              <td>${node.sourceTitle}</td>
              <td>${node.degree}</td>
            </tr>`,
          )}
        </tbody>
      </table>
      <h4>Quan hệ</h4>
      <ul>
        ${(graph?.edges ?? []).map((edge) => {
          const source = graph?.nodes.find((node) => node.nodeRef === edge.sourceNodeRef)?.label;
          const target = graph?.nodes.find((node) => node.nodeRef === edge.targetNodeRef)?.label;
          return html`<li>
            <button type="button" @click=${() => void this.selectEdge(edge.edgeRef)}>
              <span aria-hidden="true">${edgeSymbol(edge)}</span>
              <strong>${source ?? "Node"}</strong> ${EDGE_LABELS[edge.kind]}
              <strong>${target ?? "Node"}</strong> · ${REVIEW_LABELS[edge.reviewStatus]} ·
              ${edge.confidence.toFixed(2)}
            </button>
          </li>`;
        })}
      </ul>
    </div>`;
  }

  private renderInspector(): TemplateResult {
    const node = this.selectedNode;
    const edge = this.selectedEdge;
    const edgeSource = this.graph?.nodes.find((item) => item.nodeRef === edge?.sourceNodeRef);
    const edgeTarget = this.graph?.nodes.find((item) => item.nodeRef === edge?.targetNodeRef);
    const proposed = this.graph?.edges.filter((item) => item.reviewStatus === "proposed") ?? [];
    return html`<aside class="knowledge-graph-inspector" aria-label="Chi tiết graph">
      ${node
        ? html`<div class="knowledge-graph-inspector-heading">
              <span class="knowledge-graph-node-dot is-${node.kind}"></span>
              <div><strong>${node.label}</strong><small>${NODE_LABELS[node.kind]}</small></div>
              <button
                type="button"
                aria-label="Đóng inspector"
                @click=${() => (this.selectedNode = undefined)}
              >
                ×
              </button>
            </div>
            ${node.aliases.length
              ? html`<p class="knowledge-graph-aliases">Alias: ${node.aliases.join(", ")}</p>`
              : nothing}
            <dl class="knowledge-graph-facts">
              <div>
                <dt>Nguồn</dt>
                <dd>${node.sourceTitle}</dd>
              </div>
              <div>
                <dt>Nguồn tạo</dt>
                <dd>${ORIGIN_LABELS[node.origin]}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>${node.confidence.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Incoming</dt>
                <dd>${node.incoming.length}</dd>
              </div>
              <div>
                <dt>Outgoing</dt>
                <dd>${node.outgoing.length}</dd>
              </div>
            </dl>
            <details open>
              <summary>Evidence & locator (${node.evidence.length})</summary>
              <div class="knowledge-graph-evidence-list">
                ${node.evidence.map(
                  (evidence) => html`<button
                    type="button"
                    @click=${() => this.openEvidence(evidence)}
                  >
                    <strong>${evidence.sourceTitle} · v${evidence.sourceVersion}</strong>
                    <span>${evidence.excerpt}</span>
                    <code>${JSON.stringify(evidence.locator)}</code>
                  </button>`,
                )}
              </div>
            </details>
            ${this.snapshot !== "active" && this.canCandidate
              ? html`<form
                  class="knowledge-graph-manual"
                  @submit=${(event: SubmitEvent) => void this.createManualEdge(event)}
                >
                  <h4>Tạo quan hệ có evidence</h4>
                  <p>Node nguồn: <strong>${node.label}</strong></p>
                  <label
                    >Node đích<select name="targetNodeRef" required>
                      <option value="">Chọn node…</option>
                      ${(this.graph?.nodes ?? [])
                        .filter((item) => item.nodeRef !== node.nodeRef)
                        .map((item) => html`<option value=${item.nodeRef}>${item.label}</option>`)}
                    </select></label
                  >
                  <label
                    >Quan hệ<select name="edgeKind" required>
                      ${EDGE_KINDS.filter((kind) => !["contains", "similar"].includes(kind)).map(
                        (kind) => html`<option value=${kind}>${EDGE_LABELS[kind]}</option>`,
                      )}
                    </select></label
                  >
                  <label>Ghi chú<input name="note" maxlength="1000" /></label>
                  <button type="submit" ?disabled=${this.loading || !node.evidence.length}>
                    Lưu & rebuild candidate
                  </button>
                </form>`
              : nothing}`
        : edge
          ? html`<div class="knowledge-graph-inspector-heading">
                <span class="knowledge-graph-edge-symbol" aria-hidden="true"
                  >${edgeSymbol(edge)}</span
                >
                <div>
                  <strong>${EDGE_LABELS[edge.kind]}</strong
                  ><small>${REVIEW_LABELS[edge.reviewStatus]}</small>
                </div>
                <button
                  type="button"
                  aria-label="Đóng inspector"
                  @click=${() => {
                    this.selectedEdge = undefined;
                    this.selectedEdgeEvidence = undefined;
                  }}
                >
                  ×
                </button>
              </div>
              <p class="knowledge-graph-edge-path">
                <strong>${edgeSource?.label ?? "Node nguồn"}</strong>
                <span>${edgeSymbol(edge)} ${EDGE_LABELS[edge.kind]}</span>
                <strong>${edgeTarget?.label ?? "Node đích"}</strong>
              </p>
              <dl class="knowledge-graph-facts">
                <div>
                  <dt>Nguồn tạo</dt>
                  <dd>${ORIGIN_LABELS[edge.origin]}</dd>
                </div>
                <div>
                  <dt>Kiểm duyệt</dt>
                  <dd>${REVIEW_LABELS[edge.reviewStatus]}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>${edge.confidence.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Snapshot</dt>
                  <dd>${this.graphSnapshot()}</dd>
                </div>
              </dl>
              <details open>
                <summary>
                  Evidence & locator (${this.selectedEdgeEvidence?.evidence.length ?? 0})
                </summary>
                <p class="knowledge-graph-help">
                  Evidence được phân giải từ node nguồn trong cùng generation; mọi trích dẫn vẫn
                  phải mở qua Source Version.
                </p>
                <div class="knowledge-graph-evidence-list">
                  ${(this.selectedEdgeEvidence?.evidence ?? []).map(
                    (evidence) => html`<button
                      type="button"
                      @click=${() => this.openEvidence(evidence)}
                    >
                      <strong>${evidence.sourceTitle} · v${evidence.sourceVersion}</strong>
                      <span>${evidence.excerpt}</span>
                      <code>${JSON.stringify(evidence.locator)}</code>
                    </button>`,
                  )}
                </div>
              </details>
              ${this.snapshot !== "active" && edge.reviewStatus === "proposed"
                ? html`<button type="button" @click=${() => this.toggleReview(edge.edgeRef, true)}>
                    Chọn cạnh này để review
                  </button>`
                : nothing}`
          : html`<div class="knowledge-graph-inspector-empty">
              <strong>Chọn một node hoặc cạnh</strong>
              <span
                >Inspector sẽ hiển thị provenance, backlink, evidence và locator OCR/parser.</span
              >
            </div>`}
      ${this.snapshot !== "active" && this.canCandidate && proposed.length
        ? html`<section class="knowledge-graph-review">
            <div>
              <strong>Hàng đợi kiểm duyệt</strong><span>${proposed.length} cạnh đang chờ</span>
            </div>
            <div class="knowledge-graph-review-list">
              ${proposed.map(
                (reviewEdge) => html`<label>
                  <input
                    type="checkbox"
                    .checked=${this.selectedReviews.has(reviewEdge.edgeRef)}
                    @change=${(event: Event) =>
                      this.toggleReview(
                        reviewEdge.edgeRef,
                        event.currentTarget instanceof HTMLInputElement &&
                          event.currentTarget.checked,
                      )}
                  />
                  <span
                    ><strong>${edgeSymbol(reviewEdge)} ${EDGE_LABELS[reviewEdge.kind]}</strong
                    ><small
                      >${ORIGIN_LABELS[reviewEdge.origin]} ·
                      ${reviewEdge.confidence.toFixed(2)}</small
                    ></span
                  >
                </label>`,
              )}
            </div>
            <div class="knowledge-graph-review-actions">
              <select
                aria-label="Loại quan hệ thay thế"
                .value=${this.reviewReplacement}
                @change=${(event: Event) =>
                  (this.reviewReplacement = graphEdgeKind(selectValue(event)))}
              >
                ${EDGE_KINDS.map(
                  (kind) => html`<option value=${kind}>${EDGE_LABELS[kind]}</option>`,
                )}
              </select>
              <input
                aria-label="Ghi chú review"
                maxlength="1000"
                placeholder="Ghi chú…"
                .value=${this.reviewNote}
                @input=${(event: Event) => (this.reviewNote = inputValue(event))}
              />
              <button
                type="button"
                ?disabled=${!this.selectedReviews.size || this.loading}
                @click=${() => void this.decideReviews("reject")}
              >
                Từ chối
              </button>
              <button
                type="button"
                ?disabled=${!this.selectedReviews.size || this.loading}
                @click=${() => void this.decideReviews("change_kind")}
              >
                Đổi loại
              </button>
              <button
                class="is-primary"
                type="button"
                ?disabled=${!this.selectedReviews.size || this.loading}
                @click=${() => void this.decideReviews("approve")}
              >
                Phê duyệt
              </button>
            </div>
          </section>`
        : nothing}
    </aside>`;
  }

  override render(): TemplateResult {
    return html`<section class="knowledge-graph-shell">
      <header class="knowledge-graph-header">
        <div>
          <span class="knowledge-graph-eyebrow">Knowledge Vault · AI Graph V3</span>
          <h3>Bản đồ tri thức${this.zoneName ? ` · ${this.zoneName}` : ""}</h3>
          <p>
            Khám phá quan hệ có provenance; graph active là chỉ đọc và Agent chỉ dùng evidence đã
            publish.
          </p>
        </div>
        ${this.canExport
          ? html`<div class="knowledge-graph-export">
              <button
                type="button"
                ?disabled=${this.exporting || !this.hasActivePublication}
                @click=${() => void this.exportObsidian()}
              >
                ${this.exporting ? "Đang xuất…" : "Xuất Obsidian ZIP"}
              </button>
              ${this.exportUrl ? html`<a href=${this.exportUrl}>Tải vault</a>` : nothing}
            </div>`
          : nothing}
      </header>
      <div class="knowledge-graph-snapshot-tabs" role="tablist" aria-label="Graph snapshot">
        <button
          role="tab"
          aria-selected=${this.snapshot === "active"}
          class=${this.snapshot === "active" ? "is-active" : ""}
          ?disabled=${!this.hasActivePublication}
          @click=${() => void this.changeSnapshot("active")}
        >
          Active
        </button>
        ${this.canCandidate
          ? html`<button
                role="tab"
                aria-selected=${this.snapshot === "candidate"}
                class=${this.snapshot === "candidate" ? "is-active" : ""}
                ?disabled=${!this.hasCandidate}
                @click=${() => void this.changeSnapshot("candidate")}
              >
                Candidate
              </button>
              <button
                role="tab"
                aria-selected=${this.snapshot === "compare"}
                class=${this.snapshot === "compare" ? "is-active" : ""}
                ?disabled=${!this.hasCandidate || !this.hasActivePublication}
                @click=${() => void this.changeSnapshot("compare")}
              >
                Compare Active–Candidate
              </button>`
          : nothing}
        ${this.compareCounts
          ? html`<span class="knowledge-graph-compare-legend"
              ><b>+</b> ${this.compareCounts.added} thêm · <b>−</b> ${this.compareCounts.removed} bỏ
              · <b>~</b> ${this.compareCounts.changed} đổi</span
            >`
          : nothing}
      </div>
      <form
        class="knowledge-graph-toolbar"
        @submit=${(event: SubmitEvent) => void this.search(event)}
      >
        <input
          type="search"
          placeholder="Tìm node, alias hoặc nguồn…"
          .value=${this.query}
          @input=${(event: Event) => (this.query = inputValue(event))}
        />
        <button class="is-primary" ?disabled=${this.loading}>Tìm</button>
        <select
          aria-label="Kiểu bản đồ"
          .value=${this.topologyMode}
          @change=${(event: Event) => {
            const value = selectValue(event);
            this.topologyMode =
              value === "relations" ? "relations" : value === "all" ? "all" : "structure";
            this.selectedNode = undefined;
            this.selectedEdge = undefined;
            this.localRootNodeRef = undefined;
            void this.loadGraph();
          }}
        >
          <option value="structure">Cấu trúc tài liệu</option>
          <option value="relations">Quan hệ nghiệp vụ</option>
          <option value="all">Toàn bộ graph</option>
        </select>
        <select
          aria-label="Phạm vi graph"
          .value=${this.viewMode}
          @change=${(event: Event) => {
            this.viewMode = selectValue(event) === "local" ? "local" : "global";
            void this.loadGraph();
          }}
        >
          <option value="global">Toàn Zone</option>
          <option value="local">Lân cận node</option>
        </select>
        <select
          aria-label="Độ sâu"
          .value=${String(this.depth)}
          @change=${(event: Event) => {
            this.depth = selectValue(event) === "2" ? 2 : 1;
            void this.loadGraph();
          }}
        >
          <option value="1">1 hop</option>
          <option value="2">2 hop</option>
        </select>
        <span class="knowledge-graph-toolbar-divider"></span>
        <div class="knowledge-graph-render-modes" role="group" aria-label="Chế độ hiển thị">
          ${(["3d", "2d", "list"] as const).map(
            (mode) => html`<button
              type="button"
              class=${this.renderMode === mode ? "is-active" : ""}
              aria-pressed=${this.renderMode === mode}
              @click=${() => this.setRenderMode(mode)}
            >
              ${mode === "3d" ? "3D" : mode === "2d" ? "2D" : "Danh sách"}
            </button>`,
          )}
        </div>
        <button
          type="button"
          ?disabled=${this.renderMode === "list"}
          @click=${() => this.toggleLayout()}
        >
          ${this.paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button
          type="button"
          ?disabled=${this.renderMode === "list"}
          @click=${() => this.fitGraph()}
        >
          Fit
        </button>
        <button type="button" @click=${() => void this.fullscreen()}>Toàn màn hình</button>
      </form>
      ${this.renderSummary(this.graph?.summary)} ${this.renderAnalysis()}
      ${this.error
        ? html`<div class="knowledge-graph-banner is-error" role="alert">${this.error}</div>`
        : nothing}
      ${this.warning
        ? html`<div class="knowledge-graph-banner" role="status">${this.warning}</div>`
        : nothing}
      ${this.searchResults.length > 1
        ? html`<div class="knowledge-graph-search-results" aria-label="Kết quả tìm node">
            ${this.searchResults
              .slice(0, 12)
              .map(
                (node) =>
                  html`<button type="button" @click=${() => void this.selectNode(node.nodeRef)}>
                    ${node.label}<small>${NODE_LABELS[node.kind]} · ${node.sourceTitle}</small>
                  </button>`,
              )}
          </div>`
        : nothing}
      ${this.snapshot === "compare" && (this.compareNodes.length || this.compareEdges.length)
        ? html`<div
            class="knowledge-graph-diff-list"
            aria-label="Thay đổi node và quan hệ giữa Active và Candidate"
          >
            ${this.compareNodes
              .slice(0, 40)
              .map(
                (node) =>
                  html`<span class="is-${node.changed}"
                    ><b
                      >${node.changed === "added" ? "+" : node.changed === "removed" ? "−" : "~"}</b
                    >
                    ${node.label}<small>${NODE_LABELS[node.kind]}</small></span
                  >`,
              )}
            ${this.compareEdges.slice(0, 40).map(
              (edge) =>
                html`<span class="is-${edge.changed} is-edge"
                  ><b>${edge.changed === "added" ? "+" : edge.changed === "removed" ? "−" : "~"}</b>
                  Quan hệ ${EDGE_LABELS[edge.kind]}
                  <small>${ORIGIN_LABELS[edge.origin]}</small></span
                >`,
            )}
          </div>`
        : nothing}
      <div
        class="knowledge-graph-workspace ${this.selectedNode || this.selectedEdge
          ? "has-inspector"
          : ""}"
      >
        ${this.renderFilters()}
        <div class="knowledge-graph-stage" aria-busy=${this.loading}>
          ${this.loading
            ? html`<div class="knowledge-graph-loading">Đang tải graph…</div>`
            : nothing}
          ${this.renderCanvasOrList()}
        </div>
        ${this.renderInspector()}
      </div>
      <footer class="knowledge-graph-footer">
        <span><i class="knowledge-graph-node-dot is-source"></i>Nguồn</span>
        <span><i class="knowledge-graph-node-dot is-section"></i>Mục</span>
        <span><i class="knowledge-graph-node-dot is-entity"></i>Thực thể</span>
        <span><i class="knowledge-graph-node-dot is-concept"></i>Khái niệm</span>
        <span><i class="knowledge-graph-node-dot is-claim"></i>Nhận định</span>
        <span>→ Đã duyệt</span><span>? Chờ duyệt</span><span>× Đã từ chối</span>
        ${this.graph?.truncated ? html`<strong>Đã giới hạn dữ liệu hiển thị</strong>` : nothing}
      </footer>
    </section>`;
  }
}

if (!customElements.get("openclaw-knowledge-graph-view")) {
  customElements.define("openclaw-knowledge-graph-view", OpenClawKnowledgeGraphView);
}

declare global {
  interface HTMLElementTagNameMap {
    "openclaw-knowledge-graph-view": OpenClawKnowledgeGraphView;
  }
}
