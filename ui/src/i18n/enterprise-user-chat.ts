import { i18n } from "./index.ts";

const en = {
  agentLibraryBack: "Back to Agent Library",
  runtimeUnavailable:
    "This Agent is temporarily unavailable. Choose another Agent or contact your company administrator.",
  runtimeUnavailableTitle: "Agent unavailable",
  welcomeHint: "Type a message to start a conversation.",
} as const;

const vi: Record<keyof typeof en, string> = {
  agentLibraryBack: "Về Agent Library",
  runtimeUnavailable:
    "Agent tạm thời không khả dụng. Hãy chọn Agent khác hoặc liên hệ quản trị viên doanh nghiệp.",
  runtimeUnavailableTitle: "Agent không khả dụng",
  welcomeHint: "Nhập nội dung để bắt đầu hội thoại.",
};

export function enterpriseUserChatCopy(key: keyof typeof en): string {
  return (i18n.getLocale() === "vi" ? vi : en)[key];
}
