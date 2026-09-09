import { brandProductCopy } from "../branding/display-brand.ts";
import { i18n } from "./index.ts";

const copy = {
  usernameInvalid: [
    "Username chỉ gồm chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.",
    "Username may contain only lowercase ASCII letters, numbers, dots, underscores, or hyphens.",
  ],
  createDialogDescription: [
    "Bước {step}/2 · tài khoản mới bắt buộc đổi mật khẩu khi đăng nhập lần đầu",
    "Step {step}/2 · new accounts must change their password on first sign-in",
  ],
  sharedAgentCatalogUnavailable: [
    "Không tải được danh sách shared agent.",
    "The shared Agent list could not be loaded.",
  ],
  skillCatalogUnavailable: [
    "Không tải được danh sách skill.",
    "The Skill list could not be loaded.",
  ],
  personalAgentAccount: ["Personal agent của tài khoản", "Account Personal Agent"],
  personalAgentProvisioning: [
    "Hệ thống tự tạo agent và workspace riêng; không cần nhập Agent ID.",
    "The system creates a private Agent and workspace; no Agent ID is required.",
  ],
  accountAgentGrant: [
    "Tài khoản sẽ được cấp quyền sử dụng agent này ngay khi tạo.",
    "The account can use this Agent as soon as it is created.",
  ],
  presetRuntimeNote: [
    "Đây là quyền policy; khả năng chạy thực tế còn phụ thuộc plugin, provider, browser, thiết bị và điều kiện phiên.",
    "This is policy access; runtime availability also depends on plugins, providers, the browser, the device, and session conditions.",
  ],
  presetApplyNote: [
    "Áp dụng preset sẽ gỡ chặn nhóm công cụ này, đồng bộ quyền sandbox và giữ các quyền riêng ngoài nhóm.",
    "Applying a preset unlocks this tool group, synchronizes sandbox access, and keeps separate grants outside the group.",
  ],
  presetSessionNote: [
    "Có quyền policy chưa đồng nghĩa runtime sẵn sàng; plugin, provider, browser, thiết bị và điều kiện phiên vẫn được kiểm tra riêng.",
    "Policy access does not guarantee runtime readiness; plugins, providers, the browser, the device, and session conditions are checked separately.",
  ],
  applyPresetAgain: ["Áp dụng lại preset", "Reapply preset"],
  workspaceSkillNote: [
    "Skill theo workspace được cấp sau tại trang Skills. Quyền công cụ vẫn được quản lý độc lập với skill.",
    "Workspace Skills can be granted later from the Skills page. Tool access remains independent of Skills.",
  ],
  selectedSkillsSummary: [
    "Đã chọn {selected} · {ready} dùng được",
    "{selected} selected · {ready} usable",
  ],
  accountCreateSummaryUnselected: ["Chưa chọn", "Not selected"],
  selectAccount: ["Chọn tài khoản", "Select account"],
  accountDrawerDescription: [
    "@{username} · username không thể thay đổi",
    "@{username} · username cannot be changed",
  ],
  statusChangeNote: [
    "Thay đổi trạng thái có hiệu lực từ request tiếp theo. Policy revision hiện tại: {revision}.",
    "Status changes apply from the next request. Current policy revision: {revision}.",
  ],
  resetPasswordPrompt: [
    "Nhập mật khẩu tạm mới (tối thiểu 10 ký tự):",
    "Enter a new temporary password (at least 10 characters):",
  ],
  resetPasswordAction: ["Đặt lại mật khẩu", "Reset password"],
  sessionRevoked: ["đã thu hồi", "revoked"],
  advancedDataNote: [
    "Dữ liệu kỹ thuật dành cho quản trị viên nâng cao. Không cần chỉnh JSON để gán Agent chuyên môn.",
    "Technical data for advanced administrators. JSON editing is not required to assign specialist Agents.",
  ],
  effectivePermissions: ["Quyền effective", "Effective permissions"],
  entitlements: ["Quyền được cấp", "Entitlements"],
  accountListSummary: [
    "{count} tài khoản · quyền truy cập và phiên đăng nhập Enterprise",
    "{count} accounts · Enterprise access and sign-in sessions",
  ],
  presetBasicLabel: ["Quyền cơ bản", "Basic access"],
  presetBasicDescription: [
    "Cấp 32 công cụ cơ bản, đồng bộ quyền sử dụng trong sandbox.",
    "Grants 32 basic tools and synchronizes sandbox access.",
  ],
  presetStandardCodingLabel: ["Lập trình tiêu chuẩn", "Standard coding"],
  presetStandardCodingDescription: [
    "Đọc, ghi, sửa file và chạy lệnh trong sandbox.",
    "Read, write, edit files, and run commands in the sandbox.",
  ],
  presetNoneLabel: ["Không có preset", "No preset"],
  presetNoneDescription: [
    "Chỉ sử dụng các quyền được cấp riêng.",
    "Use only separately granted access.",
  ],
} as const;

export type EnterpriseAdminAccountsCopyKey = keyof typeof copy;

export function enterpriseAdminAccountsCopy(
  key: EnterpriseAdminAccountsCopyKey,
  params?: Record<string, string>,
): string {
  const value = copy[key][i18n.getLocale() === "vi" ? 0 : 1];
  const brandedValue = brandProductCopy(value);
  return params
    ? brandedValue.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? `{${name}}`)
    : brandedValue;
}

export const eaa = enterpriseAdminAccountsCopy;

const presetCopy = {
  "basic@1": {
    label: "presetBasicLabel",
    description: "presetBasicDescription",
  },
  "standard-coding@1": {
    label: "presetStandardCodingLabel",
    description: "presetStandardCodingDescription",
  },
  none: {
    label: "presetNoneLabel",
    description: "presetNoneDescription",
  },
} as const satisfies Record<
  string,
  { label: EnterpriseAdminAccountsCopyKey; description: EnterpriseAdminAccountsCopyKey }
>;

export function enterpriseAdminPresetLabel(key: string, fallback: string): string {
  const preset = Object.hasOwn(presetCopy, key)
    ? presetCopy[key as keyof typeof presetCopy]
    : undefined;
  return preset ? eaa(preset.label) : fallback;
}

export function enterpriseAdminPresetDescription(key: string, fallback: string): string {
  const preset = Object.hasOwn(presetCopy, key)
    ? presetCopy[key as keyof typeof presetCopy]
    : undefined;
  return preset ? eaa(preset.description) : fallback;
}
