import { brandProductCopy } from "../branding/display-brand.ts";
import type {
  EnterpriseKnowledgeGraphEdgeKind,
  EnterpriseKnowledgeGraphNodeKind,
  EnterpriseKnowledgeGraphOrigin,
  EnterpriseKnowledgeGraphReviewStatus,
  EnterpriseKnowledgeGraphSummary,
} from "../pages/enterprise/services/enterprise-knowledge-api.ts";
import { i18n } from "./index.ts";

/**
 * Copy for the graph that is mounted by both Enterprise Admin and Enterprise User.
 *
 * The graph is a shared component, so its copy cannot live in either portal page. Keep
 * the values as locale pairs and resolve them at call time; this is important for canvas
 * tooltips and for an already-mounted graph when the user changes locale.
 */
const copy = {
  nodeSource: ["Nguồn", "Source"],
  nodeSection: ["Mục", "Section"],
  nodeEntity: ["Thực thể", "Entity"],
  nodeConcept: ["Khái niệm", "Concept"],
  nodeClaim: ["Nhận định", "Claim"],
  edgeContains: ["chứa", "contains"],
  edgeReferences: ["tham chiếu", "references"],
  edgeMentions: ["đề cập", "mentions"],
  edgeSimilar: ["tương tự", "similar"],
  edgeSupports: ["hỗ trợ", "supports"],
  edgeContradicts: ["mâu thuẫn", "contradicts"],
  edgeSupersedes: ["thay thế", "supersedes"],
  edgeDependsOn: ["phụ thuộc", "depends on"],
  edgeAppliesTo: ["áp dụng cho", "applies to"],
  edgeCustom: ["tùy chỉnh", "custom"],
  originDeterministic: ["Xác định", "Deterministic"],
  originSemantic: ["Ngữ nghĩa", "Semantic"],
  originAi: ["AI", "AI"],
  originManual: ["Thủ công", "Manual"],
  reviewAccepted: ["Đã duyệt", "Accepted"],
  reviewProposed: ["Chờ duyệt", "Proposed"],
  reviewRejected: ["Đã từ chối", "Rejected"],
  statusReady: ["Sẵn sàng", "Ready"],
  statusDegraded: ["Giới hạn", "Degraded"],
  statusNotBuilt: ["Chưa tạo", "Not built"],
  statusCorrupt: ["Hỏng dữ liệu", "Corrupt"],
  snapshotActive: ["Active", "Active"],
  snapshotCandidate: ["Candidate", "Candidate"],
  errorLoad: ["Không thể tải bản đồ tri thức.", "Unable to load the knowledge graph."],
  errorPublicationNotFound: [
    "Zone chưa có publication Active; graph Active chỉ khả dụng cho bản phát hành đang hoạt động.",
    "This Zone has no Active publication; the Active graph is available only for the active release.",
  ],
  errorCandidateNotReady: [
    "Chưa có Candidate Graph sẵn sàng. Kiểm tra trạng thái xử lý nguồn trong Hoạt động.",
    "No Candidate Graph is ready. Check source processing status in Activity.",
  ],
  errorGraphNotBuilt: [
    "Snapshot {snapshot} chưa có graph sẵn sàng.",
    "The {snapshot} snapshot has no ready graph.",
  ],
  errorGraphIntegrity: [
    "Graph không vượt qua kiểm tra toàn vẹn. Xem tác vụ xử lý để biết chi tiết.",
    "The graph failed its integrity check. Review the processing task for details.",
  ],
  warningContextLost: [
    "WebGL bị gián đoạn; đã chuyển sang chế độ danh sách an toàn.",
    "WebGL was interrupted; switched to the safe list mode.",
  ],
  warningRenderer3d: [
    "Không thể khởi tạo 3D ({error}). Đã chuyển sang đồ thị 2D.",
    "Could not initialize 3D ({error}). Switched to the 2D graph.",
  ],
  warningRendererWebgl: [
    "Không thể khởi tạo WebGL ({error}). Đã chuyển sang danh sách.",
    "Could not initialize WebGL ({error}). Switched to the list.",
  ],
  warningTruncated: [
    "Graph lớn đã được giới hạn trên màn hình. Chọn một node và dùng chế độ lân cận để khám phá chính xác hơn.",
    "The large graph is capped on screen. Select a node and use neighborhood mode for a precise exploration.",
  ],
  warningReviewSaved: [
    "Quyết định đã được lưu. Candidate mới đang được rebuild theo batch.",
    "The decision was saved. A new Candidate is being rebuilt in a batch.",
  ],
  errorManualNoEvidence: [
    "Chọn node có evidence trước khi tạo quan hệ thủ công.",
    "Select a node with evidence before creating a manual relation.",
  ],
  errorManualSameNode: [
    "Chọn một node đích khác node nguồn.",
    "Select a target node different from the source node.",
  ],
  warningManualSaved: [
    "Quan hệ thủ công đã được lưu; candidate mới đang được dựng.",
    "The manual relation was saved; a new Candidate is being built.",
  ],
  warningVaultReady: [
    "Vault đã sẵn sàng: {count} tệp, hết hạn sau 15 phút.",
    "The vault is ready: {count} files; it expires in 15 minutes.",
  ],
  warningWebglUnsupported: [
    "Thiết bị không hỗ trợ WebGL; đang giữ chế độ danh sách an toàn.",
    "This device does not support WebGL; staying in safe list mode.",
  ],
  warningFullscreenDenied: [
    "Trình duyệt không cho phép mở toàn màn hình.",
    "The browser did not allow fullscreen mode.",
  ],
  graphStatsAria: ["Thống kê graph", "Graph statistics"],
  labelNode: ["node", "node"],
  labelEdge: ["cạnh", "edges"],
  labelPendingReview: ["chờ duyệt", "pending review"],
  labelOrphan: ["orphan", "orphans"],
  labelComponent: ["cụm", "components"],
  analysisMostlyStructuralTitle: [
    "Graph hiện chủ yếu là cấu trúc tài liệu.",
    "The graph is currently mostly document structure.",
  ],
  analysisStructuralAiOff: [
    "Graph cấu trúc đã sẵn sàng; AI enrichment đang tắt nên chưa có thêm quan hệ nghiệp vụ.",
    "The structural graph is ready; AI enrichment is off, so no additional business relations are available.",
  ],
  analysisStructuralRelations: [
    "Hầu hết cạnh đang là quan hệ chứa; hãy chuyển sang chế độ Quan hệ để xem entity, khái niệm và nhận định.",
    "Most edges are containment relations; switch to Relations mode to see entities, concepts, and claims.",
  ],
  analysisAiDegradedTitle: [
    "AI enrichment đang ở trạng thái giới hạn.",
    "AI enrichment is currently degraded.",
  ],
  analysisDeterministicAvailable: [
    "Graph deterministic vẫn dùng được. Nguyên nhân:",
    "The deterministic graph remains available. Reasons:",
  ],
  analysisProviderNotReady: ["provider chưa sẵn sàng", "provider is not ready"],
  filterAria: ["Bộ lọc graph", "Graph filters"],
  filterHeading: ["Bộ lọc", "Filters"],
  reset: ["Đặt lại", "Reset"],
  nodeType: ["Loại node", "Node type"],
  relationType: ["Quan hệ", "Relations"],
  originType: ["Nguồn tạo", "Origin"],
  reviewType: ["Kiểm duyệt", "Review"],
  minimumConfidence: ["Độ tin cậy tối thiểu", "Minimum confidence"],
  emptyGraphTitle: ["Graph chưa có dữ liệu phù hợp", "The graph has no matching data"],
  emptyGraphHint: [
    "Thử bỏ bớt bộ lọc hoặc kiểm tra trạng thái xử lý nguồn.",
    "Try removing filters or checking source processing status.",
  ],
  canvasAria: [
    "Bản đồ {mode} gồm {nodes} node và {edges} cạnh. Dùng chế độ danh sách để điều hướng bằng bàn phím.",
    "The {mode} map has {nodes} nodes and {edges} edges. Use list mode to navigate with the keyboard.",
  ],
  navigation3d: [
    "Kéo để xoay · cuộn để zoom · kéo phải để pan",
    "Drag to rotate · scroll to zoom · right-drag to pan",
  ],
  navigation2d: ["Kéo để pan · cuộn để zoom", "Drag to pan · scroll to zoom"],
  listAria: ["Danh sách graph", "Graph list"],
  tableNode: ["Node", "Node"],
  tableType: ["Loại", "Type"],
  tableSource: ["Nguồn", "Source"],
  tableLinks: ["Liên kết", "Links"],
  relationsHeading: ["Quan hệ", "Relations"],
  fallbackNode: ["Node", "Node"],
  fallbackSourceNode: ["Node nguồn", "Source node"],
  fallbackTargetNode: ["Node đích", "Target node"],
  inspectorAria: ["Chi tiết graph", "Graph details"],
  closeInspector: ["Đóng inspector", "Close inspector"],
  alias: ["Alias", "Alias"],
  source: ["Nguồn", "Source"],
  origin: ["Nguồn tạo", "Origin"],
  confidence: ["Độ tin cậy", "Confidence"],
  incoming: ["Liên kết vào", "Incoming"],
  outgoing: ["Liên kết ra", "Outgoing"],
  snapshotLabel: ["Snapshot", "Snapshot"],
  evidenceLocator: ["Evidence & locator ({count})", "Evidence & locator ({count})"],
  manualEdgeHeading: ["Tạo quan hệ có evidence", "Create an evidence-backed relation"],
  sourceNode: ["Node nguồn", "Source node"],
  targetNode: ["Node đích", "Target node"],
  selectNode: ["Chọn node…", "Select node…"],
  relation: ["Quan hệ", "Relation"],
  note: ["Ghi chú", "Note"],
  saveAndRebuild: ["Lưu & rebuild candidate", "Save & rebuild Candidate"],
  evidenceResolvedHelp: [
    "Evidence được phân giải từ node nguồn trong cùng generation; mọi trích dẫn vẫn phải mở qua Source Version.",
    "Evidence is resolved from the source node in the same generation; every citation must still open through the Source Version.",
  ],
  selectEdgeForReview: ["Chọn cạnh này để kiểm duyệt", "Select this edge for review"],
  emptyInspectorTitle: ["Chọn một node hoặc cạnh", "Select a node or edge"],
  emptyInspectorHelp: [
    "Inspector sẽ hiển thị provenance, backlink, evidence và locator OCR/parser.",
    "The inspector shows provenance, backlinks, evidence, and OCR/parser locators.",
  ],
  reviewQueue: ["Hàng đợi kiểm duyệt", "Review queue"],
  pendingEdges: ["cạnh đang chờ", "edges pending"],
  replacementRelation: ["Loại quan hệ thay thế", "Replacement relation type"],
  reviewNote: ["Ghi chú kiểm duyệt", "Review note"],
  reviewNotePlaceholder: ["Ghi chú…", "Note…"],
  reject: ["Từ chối", "Reject"],
  changeType: ["Đổi loại", "Change type"],
  approve: ["Phê duyệt", "Approve"],
  eyebrow: ["Kho tri thức · AI Graph V3", "Knowledge Vault · AI Graph V3"],
  title: ["Bản đồ tri thức", "Knowledge graph"],
  description: [
    "Graph cấu trúc tự động được dựng khi Zone có nguồn; AI enrichment là lớp bổ sung. Graph active chỉ đọc và Agent chỉ dùng evidence đã publish.",
    "The structural graph is built automatically when a Zone has sources; AI enrichment is an additional layer. The Active graph is read-only and Agents use published evidence only.",
  ],
  exporting: ["Đang xuất…", "Exporting…"],
  exportObsidian: ["Xuất Obsidian ZIP", "Export Obsidian ZIP"],
  downloadVault: ["Tải vault", "Download vault"],
  snapshotTabsAria: ["Snapshot graph", "Graph snapshot"],
  compareActiveCandidate: ["So sánh Active–Candidate", "Compare Active–Candidate"],
  compareAdded: ["thêm", "added"],
  compareRemoved: ["bỏ", "removed"],
  compareChanged: ["đổi", "changed"],
  searchPlaceholder: ["Tìm node, alias hoặc nguồn…", "Search nodes, aliases, or sources…"],
  search: ["Tìm", "Search"],
  mapTypeAria: ["Kiểu bản đồ", "Map type"],
  topologyStructure: ["Cấu trúc tài liệu", "Document structure"],
  topologyRelations: ["Quan hệ nghiệp vụ", "Business relations"],
  topologyAll: ["Toàn bộ graph", "Entire graph"],
  scopeAria: ["Phạm vi graph", "Graph scope"],
  scopeGlobal: ["Toàn Zone", "Entire Zone"],
  scopeLocal: ["Lân cận node", "Node neighborhood"],
  depthAria: ["Độ sâu", "Depth"],
  hopOne: ["1 hop", "1 hop"],
  hopTwo: ["2 hop", "2 hops"],
  displayMode: ["Chế độ hiển thị", "Display mode"],
  list: ["Danh sách", "List"],
  resume: ["Tiếp tục", "Resume"],
  pause: ["Tạm dừng", "Pause"],
  fit: ["Căn chỉnh", "Fit"],
  fullscreen: ["Toàn màn hình", "Fullscreen"],
  searchResultsAria: ["Kết quả tìm node", "Node search results"],
  diffAria: [
    "Thay đổi node và quan hệ giữa Active và Candidate",
    "Node and relation changes between Active and Candidate",
  ],
  relationPrefix: ["Quan hệ", "Relation"],
  loading: ["Đang tải graph…", "Loading graph…"],
  approvedSymbol: ["Đã duyệt", "Accepted"],
  proposedSymbol: ["Chờ duyệt", "Proposed"],
  rejectedSymbol: ["Đã từ chối", "Rejected"],
  truncated: ["Đã giới hạn dữ liệu hiển thị", "Displayed data is truncated"],
  confidenceMetric: ["độ tin cậy", "confidence"],
} as const;

export type EnterpriseKnowledgeGraphCopyKey = keyof typeof copy;

export function enterpriseKnowledgeGraphCopy(
  key: EnterpriseKnowledgeGraphCopyKey,
  params?: Record<string, string>,
): string {
  const value = copy[key][i18n.getLocale() === "vi" ? 0 : 1];
  const brandedValue = brandProductCopy(value);
  return params
    ? brandedValue.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? `{${name}}`)
    : brandedValue;
}

export const gk = enterpriseKnowledgeGraphCopy;

const nodeCopyKeys: Record<EnterpriseKnowledgeGraphNodeKind, EnterpriseKnowledgeGraphCopyKey> = {
  source: "nodeSource",
  section: "nodeSection",
  entity: "nodeEntity",
  concept: "nodeConcept",
  claim: "nodeClaim",
};

const edgeCopyKeys: Record<EnterpriseKnowledgeGraphEdgeKind, EnterpriseKnowledgeGraphCopyKey> = {
  contains: "edgeContains",
  references: "edgeReferences",
  mentions: "edgeMentions",
  similar: "edgeSimilar",
  supports: "edgeSupports",
  contradicts: "edgeContradicts",
  supersedes: "edgeSupersedes",
  depends_on: "edgeDependsOn",
  applies_to: "edgeAppliesTo",
  custom: "edgeCustom",
};

const originCopyKeys: Record<EnterpriseKnowledgeGraphOrigin, EnterpriseKnowledgeGraphCopyKey> = {
  deterministic: "originDeterministic",
  semantic: "originSemantic",
  ai: "originAi",
  manual: "originManual",
};

const reviewCopyKeys: Record<
  EnterpriseKnowledgeGraphReviewStatus,
  EnterpriseKnowledgeGraphCopyKey
> = {
  accepted: "reviewAccepted",
  proposed: "reviewProposed",
  rejected: "reviewRejected",
};

const statusCopyKeys: Record<
  EnterpriseKnowledgeGraphSummary["status"],
  EnterpriseKnowledgeGraphCopyKey
> = {
  ready: "statusReady",
  degraded: "statusDegraded",
  not_built: "statusNotBuilt",
  corrupt: "statusCorrupt",
};

export function graphNodeLabel(kind: EnterpriseKnowledgeGraphNodeKind): string {
  return gk(nodeCopyKeys[kind]);
}

export function graphEdgeLabel(kind: EnterpriseKnowledgeGraphEdgeKind): string {
  return gk(edgeCopyKeys[kind]);
}

export function graphOriginLabel(origin: EnterpriseKnowledgeGraphOrigin): string {
  return gk(originCopyKeys[origin]);
}

export function graphReviewLabel(status: EnterpriseKnowledgeGraphReviewStatus): string {
  return gk(reviewCopyKeys[status]);
}

export function graphStatusLabel(status: EnterpriseKnowledgeGraphSummary["status"]): string {
  return gk(statusCopyKeys[status]);
}
