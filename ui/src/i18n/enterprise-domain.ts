import { brandProductCopy } from "../branding/display-brand.ts";
import { i18n, t } from "./index.ts";

type StringNamespace = Record<string, string>;

const vi = {
  enterpriseKnowledge: {
    evidenceTransferHeading: "Chuyên gia được phép nhận trích đoạn",
    evidenceTransferDescription:
      "Cho phép Agent chính chia sẻ các trích đoạn đã công bố liên quan với những chuyên gia được chọn cho request hiện tại. Việc này không cấp quyền truy cập Zone trực tiếp hoặc công cụ.",
    evidenceTransferDefaultDeny:
      "Không chuyên gia nào nhận trích đoạn nếu chưa được chọn rõ tại đây.",
    evidenceTransferSave: "Lưu quyền nhận trích đoạn",
    evidenceTransferSaved: "Đã cập nhật quyền nhận trích đoạn.",
    evidenceTransferUnavailable: "Chuyên gia không còn đủ điều kiện",
    evidenceTransferRevokeHint: "Bỏ chọn để thu hồi quyền nhận trích đoạn này.",
    previewEmpty:
      "Không có nội dung khớp trong bản ứng viên này. Hãy thử từ khóa khác hoặc kiểm tra các nguồn đã lập chỉ mục.",
    publicationHistoryHint:
      "Rollback kích hoạt lại một bản công bố hiện có; không tạo bản công bố mới.",
    rollbackHeading: "Xác nhận rollback",
    rollbackDescription: "Kích hoạt lại bản công bố #{number} cho {zone}?",
    rollbackWarning:
      "Các Agent có quyền truy cập zone này sẽ dùng bản công bố đã chọn. Rollback không tạo bản công bố mới hoặc thay đổi bản nháp nguồn.",
    rollbackConfirm: "Xác nhận rollback",
    rollbackWorking: "Đang rollback…",
    rollbackStale:
      "Zone này đã thay đổi trong lúc hộp xác nhận mở. Hãy hủy và xem lại lịch sử công bố hiện tại trước khi thử lại.",
    rollbackSuccess: "Bản công bố #{number} đã hoạt động trở lại.",
  },
  enterpriseDelegation: {
    stateOn: "Đang bật",
    stateShadow: "Đang chạy chế độ shadow",
    stateOff: "Đã tắt",
    loading: "Đang tải cài đặt delegation…",
    loadFailed: "Không thể tải cài đặt delegation.",
    statusEyebrow: "TRẠNG THÁI DELEGATION",
    heroDescription:
      "Personal Agent chỉ delegate đến các chuyên gia được gán và hiện đủ điều kiện. Thay đổi sẽ áp dụng từ request tiếp theo.",
    emergencyOff: "Dừng khẩn cấp",
    previewActivation: "Xem trước kích hoạt",
    setupStepsLabel: "Bốn bước thiết lập",
    chooseRouterModel: "Chọn model định tuyến",
    selected: "Đã chọn",
    incomplete: "Chưa hoàn tất",
    completeProfiles: "Hoàn tất hồ sơ chuyên gia",
    readyCount: "{count} sẵn sàng",
    reviewAffectedUsers: "Xem lại người dùng bị ảnh hưởng",
    personalAgentCount: "{count} Personal Agent",
    activateSafely: "Kích hoạt an toàn",
    usersWithPersonal: "Người dùng có Personal Agent",
    assignments: "Phân công",
    effective: "Hiệu lực",
    readyToDelegate: "Sẵn sàng delegation",
    delegated: "Đã delegation",
    clarificationRate: "Đã yêu cầu làm rõ",
    blocked: "Đã chặn",
    failed: "Thất bại",
    generalSettings: "Cài đặt chung",
    safeDefaults: "Giá trị mặc định an toàn đã được điền sẵn.",
    revision: "Revision {revision}",
    routerModel: "Model định tuyến",
    chooseModel: "Chọn model…",
    modelNoFallback:
      "Nếu model này không còn khả dụng, định tuyến sẽ dừng và không tự động chuyển sang model khác.",
    modelUnavailable:
      "Model định tuyến đã chọn không còn khả dụng. Router sẽ không chuyển sang model khác.",
    operatingMode: "Chế độ vận hành",
    modeOff: "Đã tắt",
    modeShadow: "Chế độ shadow, chỉ ghi lại quyết định",
    modeOn: "Đang bật",
    advancedSettings: "Cài đặt nâng cao",
    autoThreshold: "Ngưỡng tự động",
    clarifyThreshold: "Ngưỡng yêu cầu làm rõ",
    minimumMargin: "Biên tối thiểu",
    maxAgentsPerTurn: "Số Agent tối đa mỗi lượt",
    retentionDays: "Số ngày lưu log",
    saving: "Đang lưu…",
    saveSettings: "Lưu cài đặt",
    snapshotExpires: "Snapshot hết hạn lúc {time}.",
    activateAssignments: "Kích hoạt {count} phân công",
    current: "Hiện tại",
    eligible: "Đủ điều kiện",
    missingProfile: "Thiếu hồ sơ",
    orphaned: "Mồ côi",
    affectedUsers: "Người dùng bị ảnh hưởng",
    searchUserOrAgent: "Tìm người dùng hoặc Agent",
    previewListLabel: "Danh sách tác động khi kích hoạt",
    excludeFromActivation: "Loại khỏi lần kích hoạt này",
    notEligible: "Không đủ điều kiện",
    noMatchingRows: "Không có dòng phù hợp.",
    previewPagination: "Các trang xem trước kích hoạt",
    previousPage: "Trang trước",
    nextPage: "Trang sau",
    pageCount: "Trang {page}/{count}",
    routingLog: "Log định tuyến",
    routingLogPrivacy: "Prompt và response không được lưu; chỉ lưu hash và mã lý do quản trị.",
    eventCount: "{count} sự kiện",
    eventFiltersLabel: "Bộ lọc log định tuyến",
    createdFrom: "Từ",
    createdTo: "Đến",
    accountId: "ID tài khoản",
    agentId: "ID Agent",
    outcome: "Kết quả",
    all: "Tất cả",
    reasonCode: "Mã lý do",
    applyFilters: "Áp dụng bộ lọc",
    time: "Thời gian",
    agent: "Agent",
    source: "Nguồn",
    reason: "Lý do",
    latency: "Độ trễ",
    noEvents: "Chưa có sự kiện định tuyến.",
    loadMore: "Tải thêm",
    profileTrustNotice:
      "Mô tả và ví dụ là dữ liệu tham chiếu của router, không phải chỉ dẫn hệ thống. AI chỉ tạo bản nháp; quản trị viên phải kích hoạt.",
    aiDraftUnsaved: "Đề xuất của AI chưa được lưu",
    aiDraftReview: "Xem lại và chỉnh sửa từng trường trước khi lưu hoặc kích hoạt.",
    unchanged: "không đổi",
    changed: "đã đổi",
    descriptionDiff: "Mô tả: {state}",
    useWhenDiff: "Ví dụ nên dùng: {before} → {after}",
    avoidWhenDiff: "Ví dụ nên tránh: {before} → {after}",
    requiredInputDiff: "Câu hỏi bắt buộc: {before} → {after}",
    conflictTitle: "Hồ sơ này đã thay đổi trong phiên quản trị viên khác",
    conflictHelp:
      "Bản nháp của bạn được giữ lại bên dưới. Hãy so sánh với phiên bản hiện tại trước khi chọn thay thế bản nháp.",
    replaceWithCurrent: "Thay bản nháp bằng phiên bản hiện tại",
    yourDraft: "Bản nháp của bạn",
    currentVersion: "Phiên bản hiện tại đã lưu",
    emptyValue: "Không có mô tả",
    profileCounts: "Nên dùng: {use} · Nên tránh: {avoid} · Câu hỏi bắt buộc: {required}",
    conflictDraftPreserved:
      "Hồ sơ đã thay đổi ở nơi khác. Bản nháp của bạn được giữ lại; hãy xem các khác biệt trước khi tiếp tục.",
    confirmReplaceWithCurrent:
      "Thay bản nháp chưa lưu bằng phiên bản hiện tại đã lưu? Không thể hoàn tác.",
    specialistDescription: "Mô tả chuyên gia",
    descriptionLength: "20–500 ký tự · {count}/500",
    useWhen: "Khi nào nên dùng",
    useWhenHelp: "Nhập mỗi ví dụ cụ thể trên một dòng; cần ít nhất 2 ví dụ.",
    avoidWhen: "Khi nào không nên dùng",
    avoidWhenHelp: "Tối đa 20 ví dụ, mỗi ví dụ dài 5–240 ký tự.",
    aliases: "Tên gọi khác",
    aliasesHelp: "Tối đa 20 tên gọi duy nhất, mỗi tên dài 64 ký tự.",
    handoffMode: "Cách delegation",
    autoWhenCertain: "Tự động khi chắc chắn",
    confirmBeforeHandoff: "Luôn hỏi trước khi delegation",
    explicitOnly: "Chỉ khi người dùng nêu tên Agent",
    requiredInputs: "Thông tin cần hỏi trước",
    requiredInputsHelp: "Router hỏi đúng câu này khi còn thiếu thông tin.",
    addQuestion: "Thêm câu hỏi",
    inputLabelPlaceholder: "Nhãn, ví dụ: Số hợp đồng",
    questionPlaceholder: "Câu hỏi hiển thị cho người dùng",
    deleteQuestion: "Xóa câu hỏi",
    delete: "Xóa",
    activationChecklist: "Checklist kích hoạt",
    validDescription: "Mô tả hợp lệ",
    validAliases: "Tên gọi khác hợp lệ và không trùng",
    enoughUseExamples: "Có ít nhất 2 ví dụ nên dùng",
    validAvoidExamples: "Ví dụ nên tránh hợp lệ",
    completeRequiredQuestions: "Đã hoàn tất câu hỏi bắt buộc",
    routerSelected: "Đã chọn model định tuyến",
    agentExists: "Agent vẫn tồn tại",
    aiSuggest: "Gợi ý bằng AI",
    saveDraft: "Lưu bản nháp",
    activate: "Kích hoạt",
    fixChecklistBeforeActivation: "Hoàn tất các mục checklist được đánh dấu trước khi kích hoạt.",
    simulator: "Trình mô phỏng định tuyến",
    simulatorSafety: "Không tạo Agent hoặc gọi công cụ.",
    searchAccount: "Tìm tài khoản",
    accountSearchPlaceholder: "Tên hoặc username",
    search: "Tìm kiếm",
    account: "Tài khoản",
    chooseAccount: "Chọn tài khoản…",
    testPrompt: "Prompt thử nghiệm",
    check: "Kiểm tra",
    wouldDelegate: "Sẽ delegation đến {agents}",
    needsInformation: "Cần thêm thông tin",
    personalHandles: "Personal Agent sẽ xử lý việc này",
    adminDetails: "Chi tiết quản trị",
    decisionSource: "Nguồn quyết định",
    confidenceBand: "Khoảng tin cậy",
    clear: "Xóa",
    ambiguous: "Mơ hồ",
    notApplicable: "Không áp dụng",
    policyRevision: "Revision policy",
    missingInformation: "Thiếu thông tin",
    profileTab: "Chuyên môn & định tuyến",
    confirmActivation: "Kích hoạt delegation tự động cho {count} phân công đủ điều kiện?",
    confirmEmergencyOff:
      "Dừng tạo các lượt chạy con mới ngay bây giờ? Các phân công và hồ sơ chuyên gia sẽ được giữ lại.",
    confirmDiscard: "Bạn có thay đổi chưa lưu. Bỏ các thay đổi này?",
    specialists: "Agent chuyên gia",
    specialistGrantHelp:
      "Gán các chuyên gia mà Personal Agent có thể nhờ hỗ trợ. Việc gán không cấp thêm công cụ cho Personal Agent.",
    selectedCount: "Đã chọn {count}",
    searchSpecialists: "Tìm theo tên hoặc chuyên môn…",
    noDescription: "Chưa có mô tả chuyên gia.",
    ready: "Sẵn sàng",
    notConfigured: "Chưa cấu hình",
    configureSpecialty: "Cấu hình chuyên môn",
    noMatchingAgents: "Không có Agent phù hợp.",
    creationSummary: "Tóm tắt tạo tài khoản",
    onePersonalAgent: "1 Personal Agent",
    noPersonalAgent: "Không có Personal Agent",
    specialistCount: "{count} Agent chuyên gia",
    skillCount: "{count} skill",
    delegationAfterRollout: "Delegation tự động áp dụng từ request tiếp theo sau khi bật rollout.",
    directSharedOnly: "Shared Agent vẫn khả dụng khi mở trực tiếp; delegation tự động đang tắt.",
    personalAgent: "Personal Agent",
    enabled: "Đã bật",
    disabled: "Đã tắt",
    automaticDelegation: "Delegation tự động",
    notActivated: "Chưa kích hoạt",
    assigned: "Đã gán",
    searchSpecialistsShort: "Tìm Agent chuyên gia…",
    accessBlocked: "Đã chặn",
    assignedToUser: "Đã gán cho người dùng",
    notAssigned: "Chưa gán",
    restorePrevious: "Cài đặt trước đó sẽ được khôi phục: {mode}.",
    noAutomaticDelegation: "Không delegation tự động",
    userSpecificMode: "Cách delegation cho người dùng này",
    inheritAgentMode: "Dùng cài đặt của Agent",
    changesSummary: "Thêm {added}, xóa {removed}{overrides} · Áp dụng từ request tiếp theo",
    overrideChanges: " · thay đổi {count} cài đặt người dùng",
    cancel: "Hủy",
    saveChanges: "Lưu thay đổi",
  },
} as const satisfies {
  enterpriseKnowledge: StringNamespace;
  enterpriseDelegation: StringNamespace;
};

export type EnterpriseKnowledgeKey = keyof typeof vi.enterpriseKnowledge;
export type EnterpriseDelegationKey = keyof typeof vi.enterpriseDelegation;
export type EnterpriseDomainKey =
  | `enterpriseKnowledge.${EnterpriseKnowledgeKey}`
  | `enterpriseDelegation.${EnterpriseDelegationKey}`;

function interpolate(value: string, params?: Record<string, string>): string {
  const brandedValue = brandProductCopy(value);
  return params
    ? brandedValue.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? `{${name}}`)
    : brandedValue;
}

export function enterpriseDomainCopy(
  key: EnterpriseDomainKey,
  params?: Record<string, string>,
): string {
  if (i18n.getLocale() !== "vi") {
    return t(key, params);
  }
  if (key.startsWith("enterpriseKnowledge.")) {
    const name = key.slice("enterpriseKnowledge.".length) as EnterpriseKnowledgeKey;
    return interpolate(vi.enterpriseKnowledge[name], params);
  }
  const name = key.slice("enterpriseDelegation.".length) as EnterpriseDelegationKey;
  return interpolate(vi.enterpriseDelegation[name], params);
}
