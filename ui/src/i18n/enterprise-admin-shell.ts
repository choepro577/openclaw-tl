import { i18n } from "./index.ts";

const copy = {
  Administrator: ["Quản trị viên", "Administrator"],
  "Quản lý tài khoản": ["Quản lý tài khoản", "Account management"],
  "Quản lý agent": ["Quản lý agent", "Agent management"],
  "Tri thức doanh nghiệp": ["Tri thức doanh nghiệp", "Enterprise knowledge"],
  "Quản lý skill": ["Quản lý skill", "Skill management"],
  Plugins: ["Plugins", "Plugins"],
  Tools: ["Công cụ", "Tools"],
  Models: ["Mô hình", "Models"],
  "System Config": ["Cấu hình hệ thống", "System Config"],
  "UI & Appearance": ["Giao diện", "UI & Appearance"],
  "Change History & Audit": ["Lịch sử thay đổi & kiểm toán", "Change History & Audit"],
  "Quản trị Enterprise": ["Quản trị Enterprise", "Enterprise administration"],
  Config: ["Cấu hình", "Config"],
  "Đổi mật khẩu": ["Đổi mật khẩu", "Change password"],
  "Đăng xuất": ["Đăng xuất", "Sign out"],
  "Mở menu": ["Mở menu", "Open menu"],
  "Mật khẩu xác nhận không khớp.": ["Mật khẩu xác nhận không khớp.", "Passwords do not match."],
  "Đăng nhập quản trị": ["Đăng nhập quản trị", "Administrator sign-in"],
  "Chỉ tài khoản administrator có thể truy cập portal này.": [
    "Chỉ tài khoản quản trị có thể truy cập cổng này.",
    "Only administrator accounts can access this portal.",
  ],
  Username: ["Tên đăng nhập", "Username"],
  "Mật khẩu": ["Mật khẩu", "Password"],
  "Hiện mật khẩu": ["Hiện mật khẩu", "Show password"],
  "Ẩn mật khẩu": ["Ẩn mật khẩu", "Hide password"],
  "Đang đăng nhập…": ["Đang đăng nhập…", "Signing in…"],
  "Đăng nhập Admin": ["Đăng nhập quản trị", "Sign in as administrator"],
  "sau khi đổi bạn cần đăng nhập lại.": [
    "sau khi đổi bạn cần đăng nhập lại.",
    "sign in again after changing your password.",
  ],
  "Mật khẩu hiện tại": ["Mật khẩu hiện tại", "Current password"],
  "Mật khẩu mới": ["Mật khẩu mới", "New password"],
  "Xác nhận mật khẩu mới": ["Xác nhận mật khẩu mới", "Confirm new password"],
  "Đang cập nhật…": ["Đang cập nhật…", "Updating…"],
  "Quay lại dashboard": ["Quay lại trang quản trị", "Back to dashboard"],
  "Đang kiểm tra phiên quản trị…": [
    "Đang kiểm tra phiên quản trị…",
    "Checking administrator session…",
  ],
  "Thử lại": ["Thử lại", "Try again"],
  "Đã xảy ra lỗi. Vui lòng thử lại.": [
    "Đã xảy ra lỗi. Vui lòng thử lại.",
    "Something went wrong. Please try again.",
  ],
} as const;

export function adminShellCopy(key: keyof typeof copy): string {
  return copy[key][i18n.getLocale() === "vi" ? 0 : 1];
}
