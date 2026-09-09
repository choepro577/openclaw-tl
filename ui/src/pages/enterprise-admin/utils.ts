import { adminShellCopy } from "../../i18n/enterprise-admin-shell.ts";
import { enterpriseErrorMessage } from "../../i18n/enterprise-errors.ts";
import { i18n } from "../../i18n/index.ts";
export type AdminPage =
  | "accounts"
  | "agents"
  | "knowledge"
  | "skills"
  | "plugins"
  | "config-tools"
  | "config-models"
  | "config-model-setup"
  | "config-system"
  | "config-appearance"
  | "config-history";

export type AdminConfigPage = Extract<AdminPage, `config-${string}`>;

export function enterprisePortalBase(): string {
  const pathname = globalThis.location?.pathname ?? "/";
  const indexes = ["/admin", "/app", "/enterprise"]
    .map((segment) => pathname.indexOf(segment))
    .filter((index) => index >= 0)
    .toSorted((left, right) => left - right);
  return indexes[0] === undefined ? "" : pathname.slice(0, indexes[0]);
}

export function adminHref(path: string): string {
  return `${enterprisePortalBase()}/admin${path.startsWith("/") ? path : `/${path}`}`;
}

export function adminPathname(): string {
  const base = enterprisePortalBase();
  const pathname = globalThis.location?.pathname ?? "/admin";
  return pathname.slice(base.length) || "/";
}

export function resolveAdminPage(pathname = adminPathname()): AdminPage {
  if (pathname.startsWith("/admin/agents")) {
    return "agents";
  }
  if (pathname.startsWith("/admin/skills")) {
    return "skills";
  }
  if (pathname.startsWith("/admin/plugins")) {
    return "plugins";
  }
  if (pathname.startsWith("/admin/knowledge")) {
    return "knowledge";
  }
  if (pathname.startsWith("/admin/config/models/setup")) {
    return "config-model-setup";
  }
  if (pathname.startsWith("/admin/config/models")) {
    return "config-models";
  }
  if (pathname.startsWith("/admin/config/system")) {
    return "config-system";
  }
  if (pathname.startsWith("/admin/config/appearance")) {
    return "config-appearance";
  }
  if (pathname.startsWith("/admin/config/history")) {
    return "config-history";
  }
  if (
    pathname.startsWith("/admin/config/tools") ||
    pathname === "/admin/config" ||
    pathname.startsWith("/admin/tools-config")
  ) {
    return "config-tools";
  }
  return "accounts";
}

export function isAdminConfigPage(page: AdminPage): page is AdminConfigPage {
  return page.startsWith("config-");
}

export function navigateAdmin(path: string, replace = false): void {
  const href = adminHref(path);
  if (replace) {
    globalThis.history.replaceState(globalThis.history.state, "", href);
  } else {
    globalThis.history.pushState(globalThis.history.state, "", href);
  }
  globalThis.dispatchEvent(new PopStateEvent("popstate"));
}

export function formatDate(value: number | null | undefined): string {
  if (!value) {
    return "—";
  }
  const milliseconds = value < 10_000_000_000 ? value * 1000 : value;
  return new Intl.DateTimeFormat(i18n.getLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(milliseconds);
}

export function errorMessage(error: unknown): string {
  return enterpriseErrorMessage(error, adminShellCopy("Đã xảy ra lỗi. Vui lòng thử lại."));
}
