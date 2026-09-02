import { inferBasePathFromPathname } from "../../../app-route-paths.ts";
import type { EnterpriseAccountRole } from "../services/enterprise-api.ts";

export type EnterpriseAuthEntryPoint = "login" | "restore";

function stripTrailingSlash(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }
  return pathname.replace(/\/+$/u, "");
}

export function shouldOpenEnterpriseLanding(
  entryPoint: EnterpriseAuthEntryPoint,
  pathname: string,
): boolean {
  if (entryPoint === "login") {
    return true;
  }

  const normalizedPath = stripTrailingSlash(pathname || "/");
  const basePath = inferBasePathFromPathname(pathname || "/");
  return normalizedPath === (basePath || "/");
}

export function shouldRedirectEnterpriseHome(params: {
  role: EnterpriseAccountRole;
  pathname: string;
  basePath: string;
}): boolean {
  if (params.role !== "employee") {
    return false;
  }
  const pathname = stripTrailingSlash(params.pathname || "/");
  const basePath = stripTrailingSlash(params.basePath || "/");
  const relativePath =
    basePath === "/"
      ? pathname
      : pathname === basePath
        ? "/"
        : pathname.startsWith(`${basePath}/`)
          ? pathname.slice(basePath.length)
          : "";
  if (!relativePath) {
    return false;
  }
  const segments = relativePath.split("/").filter(Boolean);
  if ((segments[0] === "chat" || segments[0] === "dashboard") && segments.length === 2) {
    return true;
  }
  if ((segments[0] !== "chat" && segments[0] !== "dashboard") || segments.length !== 3) {
    return false;
  }
  try {
    return decodeURIComponent(segments[2] ?? "").toLowerCase() === "main";
  } catch {
    return false;
  }
}
