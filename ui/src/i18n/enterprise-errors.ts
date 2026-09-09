import { i18n } from "./lib/translate.ts";

type EnterpriseErrorCopy = readonly [vietnamese: string, english: string];

const ENTERPRISE_ERROR_COPY: Record<string, EnterpriseErrorCopy> = {
  UNAUTHENTICATED: [
    "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    "Your session is invalid or has expired.",
  ],
  FORBIDDEN: [
    "Bạn không có quyền thực hiện thao tác này.",
    "You do not have permission to do this.",
  ],
  ORIGIN_DENIED: ["Nguồn yêu cầu không được phép.", "This request origin is not allowed."],
  CSRF_INVALID: [
    "Token bảo mật không hợp lệ. Hãy tải lại trang rồi thử lại.",
    "The security token is invalid. Refresh the page and try again.",
  ],
  BOOTSTRAP_ADMIN_REQUIRED: [
    "Hãy chạy openclaw auth bootstrap-admin trước khi đăng nhập.",
    "Run openclaw auth bootstrap-admin before signing in.",
  ],
  INVALID_CREDENTIALS: ["Username hoặc mật khẩu không đúng.", "Username or password is incorrect."],
  LOGIN_RATE_LIMITED: [
    "Đăng nhập bị tạm khóa trong 15 phút.",
    "Sign-in is temporarily locked for 15 minutes.",
  ],
  PASSWORD_CHANGE_REQUIRED: ["Bạn cần đổi mật khẩu trước.", "You must change your password first."],
  INVALID_CURRENT_PASSWORD: ["Mật khẩu hiện tại không đúng.", "The current password is incorrect."],
  PASSWORD_REUSE: [
    "Mật khẩu mới không được trùng mật khẩu hiện tại.",
    "The new password must differ from your current password.",
  ],
  PASSWORD_INVALID: [
    "Mật khẩu phải có từ 10 đến 512 ký tự.",
    "Password must be 10–512 characters.",
  ],
  USERNAME_INVALID: [
    "Username chỉ gồm chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.",
    "Username may contain lowercase letters, numbers, periods, underscores, or hyphens only.",
  ],
  USERNAME_EXISTS: ["Username đã tồn tại.", "That username is already in use."],
  ACCOUNT_NOT_FOUND: ["Không tìm thấy tài khoản.", "Account not found."],
  ACCOUNT_DISABLED: ["Tài khoản đã bị khóa.", "This account is disabled."],
  ROLE_INVALID: ["Role không hợp lệ.", "The role is invalid."],
  LAST_ADMIN_REQUIRED: [
    "Không thể khóa hoặc hạ role admin cuối cùng.",
    "You cannot disable or demote the last administrator.",
  ],
  VALIDATION_ERROR: ["Dữ liệu gửi lên không hợp lệ.", "The submitted data is invalid."],
  BODY_INVALID: ["JSON body không hợp lệ.", "The request body is invalid."],
  CONTENT_TYPE_REQUIRED: [
    "Content-Type phải là application/json.",
    "The request must use application/json.",
  ],
  BODY_TOO_LARGE: ["Request body vượt quá giới hạn.", "The request body exceeds the size limit."],
  CONFIRMATION_REQUIRED: ["Cần xác nhận thao tác.", "Confirmation is required for this action."],
  NOT_FOUND: ["Không tìm thấy Enterprise API.", "The Enterprise API endpoint was not found."],
  ENTERPRISE_INTERNAL_ERROR: [
    "Enterprise API gặp lỗi.",
    "The Enterprise API encountered an error. Try again.",
  ],
  RUNTIME_UNAVAILABLE: ["Gateway runtime chưa sẵn sàng.", "The Gateway runtime is not ready."],
  GATEWAY_RUNTIME_UNAVAILABLE: [
    "Gateway runtime chưa sẵn sàng.",
    "The Gateway runtime is not ready.",
  ],
  PERSONAL_AGENT_DISABLED: [
    "Personal Agent đã bị doanh nghiệp tắt.",
    "Personal Agent is disabled by your organization.",
  ],
  AGENT_NOT_FOUND: ["Không tìm thấy agent.", "Agent not found."],
  AGENT_NOT_ASSIGNED: [
    "Agent chưa được cấp cho tài khoản này.",
    "This Agent is not assigned to the account.",
  ],
  AGENT_EXISTS: ["Agent ID đã tồn tại.", "That Agent ID already exists."],
  AGENT_IN_USE: [
    "Agent đang là default/template hoặc còn được cấp cho user.",
    "The Agent is a default/template or is still assigned to a user.",
  ],
  KNOWLEDGE_NOT_FOUND: ["Không tìm thấy Knowledge item.", "Knowledge item not found."],
  KNOWLEDGE_FILE_TOO_LARGE: [
    "File Knowledge vượt quá giới hạn 64 KB.",
    "The Knowledge file exceeds the 64 KB limit.",
  ],
  KNOWLEDGE_FILE_INVALID: [
    "Chỉ hỗ trợ file UTF-8 .md hoặc .txt.",
    "Only UTF-8 .md or .txt files are supported.",
  ],
  KNOWLEDGE_ITEM_LIMIT: [
    "Bạn đã đạt giới hạn 20 Knowledge items.",
    "You have reached the limit of 20 Knowledge items.",
  ],
  KNOWLEDGE_TOTAL_LIMIT: [
    "Tổng Knowledge đang hoạt động vượt quá 16.000 ký tự.",
    "The active Knowledge total exceeds 16,000 characters.",
  ],
  KNOWLEDGE_TITLE_DUPLICATE: [
    "Tên Knowledge item đã tồn tại.",
    "That Knowledge item name already exists.",
  ],
  KNOWLEDGE_TITLE_EXISTS: [
    "Tên Knowledge item đã tồn tại.",
    "That Knowledge item name already exists.",
  ],
  CONVERSATION_NOT_FOUND: [
    "Không tìm thấy hội thoại thuộc tài khoản này.",
    "Conversation not found for this account.",
  ],
  CONVERSATION_PROJECT_NOT_FOUND: [
    "Không tìm thấy Project hội thoại.",
    "Conversation Project not found.",
  ],
  CONVERSATION_PROJECT_NAME_DUPLICATE: [
    "Tên Project đã tồn tại.",
    "That Project name already exists.",
  ],
  AUTOMATION_NOT_FOUND: ["Không tìm thấy Automation.", "Automation not found."],
  AUTOMATION_READ_ONLY: [
    "Automation này do hệ thống quản lý và không thể thay đổi từ User Portal.",
    "This Automation is system-managed and cannot be changed from the User Portal.",
  ],
  CRON_JOB_NOT_FOUND: [
    "Không tìm thấy cron job thuộc agent này.",
    "Cron job not found for this Agent.",
  ],
  MODEL_METHOD_UNSUPPORTED: ["Model action không được phép.", "This model action is not allowed."],
  MODEL_AGENT_SCOPE_DENIED: [
    "Model action vượt ngoài phạm vi Admin được phép.",
    "This model action is outside the allowed administrator scope.",
  ],
  MODEL_CONFIG_SCOPE_DENIED: [
    "Model action vượt ngoài phạm vi Admin được phép.",
    "This model action is outside the allowed administrator scope.",
  ],
  MODEL_WIZARD_SCOPE_DENIED: [
    "Model action vượt ngoài phạm vi Admin được phép.",
    "This model action is outside the allowed administrator scope.",
  ],
  PERSONAL_RUNTIME_SCOPE_UNAVAILABLE: [
    "Runtime chưa có khóa ownership riêng cho personal agent này.",
    "This Personal Agent does not have an owned runtime scope yet.",
  ],
  PERSONAL_AGENT_POLICY_MANAGED_BY_ACCESS: [
    "Quyền Tools/Skills của personal agent được quản lý theo tài khoản.",
    "Personal Agent tool and skill access is managed by the account policy.",
  ],
  RELATIONSHIP_SCOPE_UNAVAILABLE: [
    "Runtime chưa có khóa ownership riêng cho personal agent này.",
    "This Personal Agent does not have an owned runtime scope yet.",
  ],
  DELEGATION_MODEL_RATE_LIMITED: [
    "Model điều phối đang quá tải. Hãy thử lại sau.",
    "The delegation model is rate limited. Try again later.",
  ],
  DELEGATION_ROUTER_MODEL_REQUIRED: [
    "Cần chọn model định tuyến trước khi chạy thử hoặc kích hoạt.",
    "Select a routing model before previewing or activating.",
  ],
  DELEGATION_ROUTER_MODEL_UNAVAILABLE: [
    "Model định tuyến không nằm trong danh sách model hiện đang khả dụng.",
    "The routing model is not currently available.",
  ],
  DELEGATION_PREVIEW_CONFLICT: [
    "Dữ liệu đã đổi sau khi xem trước; hãy xem khác biệt và chạy lại bản xem trước.",
    "The data changed after preview; review the differences and preview again.",
  ],
  DELEGATION_PREVIEW_EXPIRED: [
    "Bản xem trước đã hết hạn; hãy chạy xem trước lại.",
    "The preview expired; run the preview again.",
  ],
  DELEGATION_OVERRIDE_ASSIGNMENT_REQUIRED: [
    "Cấu hình riêng cần có Agent, Skill hoặc Tool được gán.",
    "The override requires an assigned Agent, Skill, or Tool.",
  ],
  DELEGATION_OVERRIDE_CANNOT_LOOSEN: [
    "Cấu hình riêng chỉ được phép chặt hơn cấu hình mặc định của Agent.",
    "An override can only be stricter than the Agent's default configuration.",
  ],
  DELEGATION_DRAFT_MODEL_UNAVAILABLE: [
    "Model định tuyến hiện không khả dụng; hệ thống không tự đổi sang model khác.",
    "The routing model is unavailable; the system will not switch models automatically.",
  ],
  DELEGATION_DRAFT_INVALID: [
    "Model trả về bản nháp không hợp lệ. Không có thay đổi nào được lưu.",
    "The model returned an invalid draft. No changes were saved.",
  ],
  POLICY_REVISION_CONFLICT: [
    "Policy đã được thay đổi bởi một quản trị viên khác.",
    "The policy was changed by another administrator.",
  ],
  DELEGATION_POLICY_REVISION_CONFLICT: [
    "Thiết lập điều phối đã được quản trị viên khác thay đổi.",
    "Delegation settings were changed by another administrator.",
  ],
  DELEGATION_OVERRIDE_REVISION_CONFLICT: [
    "Cấu hình riêng của người dùng đã thay đổi; dữ liệu bạn nhập vẫn được giữ lại.",
    "The user's override changed; your entered data was kept.",
  ],
  CONFIG_HASH_CONFLICT: [
    "Config đã thay đổi; hãy tải lại trước khi áp dụng.",
    "The configuration changed; reload it before applying.",
  ],
  AGENT_FILE_REVISION_CONFLICT: [
    "File đã thay đổi; hãy tải lại trước khi lưu.",
    "The file changed; reload it before saving.",
  ],
  REVISION_CONFLICT: ["Dữ liệu đã được thay đổi ở nơi khác.", "The data was changed elsewhere."],
  ACCOUNT_TOOL_POLICY_REVISION_CONFLICT: [
    "Tool policy đã được thay đổi ở nơi khác; hãy tải lại trước khi lưu.",
    "The tool policy changed elsewhere; reload it before saving.",
  ],
  CRON_JOB_REVISION_CONFLICT: [
    "Cron job đã thay đổi; hãy tải lại trước khi lưu.",
    "The cron job changed; reload it before saving.",
  ],
  AUTOMATION_REVISION_CONFLICT: [
    "Automation đã thay đổi; hãy tải lại trước khi lưu.",
    "The Automation changed; reload it before saving.",
  ],
};

function readStringProperty(value: unknown, key: "code" | "message"): string | undefined {
  if (!value || (typeof value !== "object" && typeof value !== "function")) {
    return undefined;
  }
  try {
    const candidate = (value as Record<string, unknown>)[key];
    return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
  } catch {
    return undefined;
  }
}

function isGenericValidationMessage(message: string | undefined): boolean {
  return (
    message === "Dữ liệu gửi lên không hợp lệ." ||
    message === "The submitted data is invalid." ||
    message === "VALIDATION_ERROR"
  );
}

/** Localizes stable Enterprise API codes while retaining useful server diagnostics. */
export function enterpriseErrorMessage(error: unknown, fallback: string): string {
  const code = readStringProperty(error, "code");
  const message = readStringProperty(error, "message");
  const copy = code ? ENTERPRISE_ERROR_COPY[code] : undefined;
  if (copy && !(code === "VALIDATION_ERROR" && message && !isGenericValidationMessage(message))) {
    return copy[i18n.getLocale() === "vi" ? 0 : 1];
  }
  if (message && message !== code) {
    return message;
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return fallback;
}
