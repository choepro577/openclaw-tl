import { brandProductCopy } from "../../branding/display-brand.ts";
import { i18n } from "../../i18n/index.ts";

const en = {
  greeting: "Hello {name}.",
  assignedAgents: "Assigned Agents",
  profile: "Profile",
  accounts: "Accounts",
  management: "Agent, Skill & Tool",
  managementTitle: "OpenClaw configuration management",
  managementDescription:
    "Enterprise manages account access here. Agent, Skill, and Tool definitions remain in the main OpenClaw pages.",
  manageAgents: "Manage Agents",
  manageSkills: "Manage Skills",
  manageTools: "Manage Tools & Config",
  accountsLoadFailed: "Could not load accounts.",
  accountsCreateFailed: "Could not create the account.",
  accountLoadFailed: "Could not load account details.",
  accountList: "Accounts",
  createAccount: "Create account",
  initialPassword: "Initial password",
  administrator: "Administrator",
  employee: "Employee",
  active: "active",
  locked: "locked",
  selectAccount: "Select an account to manage.",
  accountSaveSuccess: "Account saved.",
  accountSaveFailed: "Could not save the account.",
  entitlementUpdateSuccess: "Permissions updated.",
  entitlementUpdateFailed: "Could not update permissions.",
  resetPasswordPrompt: "Enter a temporary password (at least 10 characters):",
  resetPasswordSuccess: "Password reset and all sessions revoked.",
  resetPasswordFailed: "Could not reset the password.",
  displayName: "Display name",
  defaultAgent: "Default Agent",
  accountEnabled: "Account active",
  personalAgentEnabled: "Enable Personal Agent",
  saveAccount: "Save account",
  resetPassword: "Reset password",
  entitlementsTitle: "Grant Agent, Skill, and Tool access",
  resourceId: "Resource ID",
  allow: "Allow",
  deny: "Deny",
  addOrReplace: "Add / replace",
  resourceType: "Type",
  permission: "Permission",
  remove: "Remove",
  effectivePolicy: "Effective permissions",
  enabled: "Enabled",
  disabled: "Disabled",
  effective: "Effective",
  employeeDeniedTools: "Tools always locked for Employees:",
  agentListTitle: "Assigned system Agents",
  agentListDescription: "Each Agent uses its own workspace, session, and memory for your account.",
  administratorAllAgents: "Administrators can use every available Agent.",
  noAssignedAgents: "No system Agents have been assigned.",
  newSession: "New session",
  profileTitle: "Enterprise profile",
  name: "Name",
  logoutBusy: "Signing out…",
  personalAgentDescription:
    "Workspace, memory, and sessions are kept separate for account {username}.",
  defaultAgentValue: "Default Agent: ",
  startPersonalAgent: "Start Personal Agent session",
  personalAgentDisabled: "Personal Agent is disabled by an administrator.",
  bootstrapCommand: "Run: openclaw auth bootstrap-admin",
} as const;

const vi: Record<keyof typeof en, string> = {
  greeting: "Xin chào {name}.",
  assignedAgents: "Agent được cấp",
  profile: "Hồ sơ",
  accounts: "Tài khoản",
  management: "Agent, Skill & Tool",
  managementTitle: "Quản trị cấu hình OpenClaw",
  managementDescription:
    "Enterprise quản lý quyền tài khoản tại đây. Định nghĩa Agent, Skill và Tool vẫn dùng các trang OpenClaw chính.",
  manageAgents: "Quản lý Agents",
  manageSkills: "Quản lý Skills",
  manageTools: "Quản lý Tools & Config",
  accountsLoadFailed: "Không thể tải tài khoản.",
  accountsCreateFailed: "Không thể tạo tài khoản.",
  accountLoadFailed: "Không thể tải chi tiết tài khoản.",
  accountList: "Tài khoản",
  createAccount: "Tạo tài khoản",
  initialPassword: "Mật khẩu ban đầu",
  administrator: "Quản trị viên",
  employee: "Nhân viên",
  active: "đang hoạt động",
  locked: "đã khóa",
  selectAccount: "Chọn một tài khoản để quản lý.",
  accountSaveSuccess: "Đã lưu tài khoản.",
  accountSaveFailed: "Không thể lưu tài khoản.",
  entitlementUpdateSuccess: "Đã cập nhật quyền.",
  entitlementUpdateFailed: "Không thể cập nhật quyền.",
  resetPasswordPrompt: "Nhập mật khẩu tạm mới (ít nhất 10 ký tự):",
  resetPasswordSuccess: "Đã reset mật khẩu và thu hồi toàn bộ session.",
  resetPasswordFailed: "Không thể reset mật khẩu.",
  displayName: "Tên hiển thị",
  defaultAgent: "Agent mặc định",
  accountEnabled: "Tài khoản hoạt động",
  personalAgentEnabled: "Bật Personal Agent",
  saveAccount: "Lưu tài khoản",
  resetPassword: "Reset mật khẩu",
  entitlementsTitle: "Cấp quyền Agent, Skill và Tool",
  resourceId: "Resource ID",
  allow: "Cho phép",
  deny: "Từ chối",
  addOrReplace: "Thêm / thay thế",
  resourceType: "Loại",
  permission: "Quyền",
  remove: "Xóa",
  effectivePolicy: "Quyền hiệu lực",
  enabled: "Bật",
  disabled: "Tắt",
  effective: "Hiệu lực",
  employeeDeniedTools: "Tool luôn bị khóa với Nhân viên:",
  agentListTitle: "Agent hệ thống được cấp",
  agentListDescription: "Mỗi Agent dùng workspace, session và memory riêng cho tài khoản của bạn.",
  administratorAllAgents: "Quản trị viên được phép sử dụng toàn bộ Agent hiện có.",
  noAssignedAgents: "Chưa được cấp Agent hệ thống nào.",
  newSession: "Tạo session mới",
  profileTitle: "Hồ sơ Enterprise",
  name: "Tên",
  logoutBusy: "Đang đăng xuất…",
  personalAgentDescription: "Workspace, memory và session được lưu riêng cho tài khoản {username}.",
  defaultAgentValue: "Agent mặc định: ",
  startPersonalAgent: "Bắt đầu phiên Personal Agent",
  personalAgentDisabled: "Personal Agent đang bị quản trị viên tắt.",
  bootstrapCommand: "Hãy chạy: openclaw auth bootstrap-admin",
};

export type EnterpriseCopyKey = keyof typeof en;

export function enterpriseCopy(key: EnterpriseCopyKey, params?: Record<string, string>): string {
  const value = brandProductCopy((i18n.getLocale() === "vi" ? vi : en)[key]);
  return params
    ? value.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? `{${name}}`)
    : value;
}

export function enterpriseRoleLabel(role: string): string {
  return role === "administrator"
    ? enterpriseCopy("administrator")
    : role === "employee"
      ? enterpriseCopy("employee")
      : role;
}

export function enterpriseStatusLabel(enabled: boolean): string {
  return enterpriseCopy(enabled ? "active" : "locked");
}

export function enterpriseResourceTypeLabel(resourceType: string): string {
  if (resourceType === "agent") {
    return "Agent";
  }
  if (resourceType === "skill") {
    return "Skill";
  }
  if (resourceType === "tool") {
    return "Tool";
  }
  return resourceType;
}

export function enterpriseEffectLabel(effect: string): string {
  return effect === "allow"
    ? enterpriseCopy("allow")
    : effect === "deny"
      ? enterpriseCopy("deny")
      : effect;
}
