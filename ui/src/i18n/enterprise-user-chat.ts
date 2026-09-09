import { i18n, t } from "./index.ts";

const en = {
  toolSkipped: "Not performed",
  toolSkippedForUpdate: "Not performed because a newer message arrived",
  toolGroupSkipped: "skipped requests: {count}",
  agentLibraryBack: "Back to Agent Library",
  runtimeUnavailable:
    "This Agent is temporarily unavailable. Choose another Agent or contact your company administrator.",
  runtimeUnavailableTitle: "Agent unavailable",
  welcomeHint: "Type a message to start a conversation.",
} as const;

const vi: Record<keyof typeof en, string> = {
  toolSkipped: "Không thực hiện",
  toolSkippedForUpdate: "Không thực hiện do có cập nhật mới",
  toolGroupSkipped: "yêu cầu không thực hiện: {count}",
  agentLibraryBack: "Về Agent Library",
  runtimeUnavailable:
    "Agent tạm thời không khả dụng. Hãy chọn Agent khác hoặc liên hệ quản trị viên doanh nghiệp.",
  runtimeUnavailableTitle: "Agent không khả dụng",
  welcomeHint: "Nhập nội dung để bắt đầu hội thoại.",
};

const chatVi = {
  "chat.toolCards.knowledge.title": "Tri thức doanh nghiệp",
  "chat.toolCards.knowledge.searching": "Đang tìm trong tri thức doanh nghiệp",
  "chat.toolCards.knowledge.retrieving": "Đang lấy bằng chứng nguồn",
  "chat.toolCards.knowledge.referenceOne": "Tìm thấy 1 tham chiếu",
  "chat.toolCards.knowledge.referenceMany": "Tìm thấy {count} tham chiếu",
  "chat.toolCards.knowledge.empty": "Không có tham chiếu phù hợp",
  "chat.toolCards.knowledge.coverage": "Đã tìm trong {count} zone",
  "chat.toolCards.knowledge.referencesOnly":
    "Chỉ có tham chiếu — cần lấy bằng chứng nguồn trước khi trả lời.",
  "chat.toolCards.knowledge.evidence": "Đã lấy bằng chứng",
  "chat.toolCards.knowledge.failed": "Yêu cầu tri thức thất bại",
  "chat.toolCards.knowledge.unavailable":
    "Kết quả tri thức không khả dụng; chưa xác nhận đã lấy dữ liệu",
  "chat.toolCards.knowledge.partial":
    "Không thể tìm trong một số zone. Các kết quả này chưa đầy đủ.",
  "chat.toolCards.knowledge.truncated": "Bản xem trước này đã được rút gọn.",
  "chat.toolCards.knowledge.version": "Phiên bản {value}",
  "chat.toolCards.knowledge.location.page": "Trang {value}",
  "chat.toolCards.knowledge.location.section": "Mục: {value}",
  "chat.toolCards.knowledge.location.paragraph": "Đoạn: {value}",
  "chat.toolCards.knowledge.location.sheet": "Trang tính: {value}",
  "chat.toolCards.knowledge.location.range": "Các ô {value}",
  "chat.toolCards.knowledge.location.slide": "Slide {value}",
  "chat.toolCards.knowledge.location.table": "Bảng {value}",
  "chat.toolCards.knowledge.location.cell": "Ô {value}",
  "chat.toolCards.delegation.title": "Bàn giao cho chuyên gia",
  "chat.toolCards.delegation.agentStatus": "{name} — {status}",
  "chat.toolCards.delegation.checking":
    "Đang kiểm tra quyền truy cập và chuẩn bị bàn giao cho chuyên gia…",
  "chat.toolCards.delegation.confirming": "Đang chờ bạn xác nhận trước khi bàn giao cho chuyên gia",
  "chat.toolCards.delegation.refreshing": "Đã làm mới bàn giao cho tin nhắn này",
  "chat.toolCards.delegation.handoff": "Đã bàn giao tác vụ cho chuyên gia",
  "chat.toolCards.delegation.assigned": "Đã gán — đang chờ cập nhật tiến độ đã xác minh",
  "chat.toolCards.delegation.queued": "Đang chờ bắt đầu",
  "chat.toolCards.delegation.running": "Chuyên gia đang xử lý…",
  "chat.toolCards.delegation.completed": "Chuyên gia đã hoàn tất tác vụ",
  "chat.toolCards.delegation.failed": "Tác vụ chuyên gia thất bại",
  "chat.toolCards.delegation.cancelled": "Tác vụ chuyên gia đã bị hủy",
  "chat.toolCards.delegation.timed_out": "Tác vụ chuyên gia đã hết thời gian",
  "chat.toolCards.delegation.blocked": "Bàn giao cho chuyên gia đã bị chặn",
  "chat.toolCards.delegation.returned": "Đã trả kết quả về Personal Agent",
  "chat.toolCards.delegation.returning": "Đang chờ kết quả được chuyển về Personal Agent",
  "chat.toolCards.delegation.returnFailed":
    "Tác vụ hoàn tất nhưng không thể chuyển kết quả về Personal Agent",
  "chat.toolCards.delegation.workingCount": "{count} đang làm việc",
  "chat.toolCards.delegation.returningCount": "{count} đang gửi báo cáo",
  "chat.toolCards.delegation.reportedCount": "{count} đã báo cáo",
  "chat.toolCards.delegation.failedCount": "{count} lỗi",
  "chat.toolCards.delegation.moreAgents": "+{count} tác nhân",
  "chat.toolCards.delegation.local": "Đã xử lý cục bộ; chưa bàn giao cho chuyên gia",
  "chat.toolCards.delegation.unavailable":
    "Không thể xem trạng thái bàn giao; chưa xác nhận hoàn tất",
  "chat.modelControls.contextWindowAria": "Cửa sổ ngữ cảnh: {state}",
  "chat.modelControls.contextWindow": "Cửa sổ ngữ cảnh",
  "chat.messages.tooLargeToDisplay": "Tin nhắn này quá lớn để hiển thị tại đây.",
  "chat.permissionControls.help": "Chọn quyền cho các lượt chạy mới.",
} as const;

export type EnterpriseUserChatCardKey = keyof typeof chatVi;

function interpolate(value: string, params?: Record<string, string>): string {
  return params
    ? value.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? `{${name}}`)
    : value;
}

export function enterpriseUserChatCopy(
  key: keyof typeof en,
  params?: Record<string, string>,
): string {
  return interpolate((i18n.getLocale() === "vi" ? vi : en)[key], params);
}

export function enterpriseUserChatCardCopy(
  key: EnterpriseUserChatCardKey,
  params?: Record<string, string>,
): string {
  return i18n.getLocale() === "vi" ? interpolate(chatVi[key], params) : t(key, params);
}
