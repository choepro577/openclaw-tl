export type EnterprisePortalStatus = {
  enabled: boolean;
  userPortalVersion: "legacy" | "v2";
};

export type PortalResolution =
  | { kind: "control" }
  | { kind: "admin" }
  | { kind: "user-legacy" }
  | { kind: "user-v2" }
  | { kind: "redirect"; href: string };

type PortalSegment = "admin" | "app" | "enterprise";

function segmentIndex(pathname: string, segment: PortalSegment): number {
  const token = `/${segment}`;
  let from = 0;
  while (from < pathname.length) {
    const index = pathname.indexOf(token, from);
    if (index < 0) {
      return -1;
    }
    const next = pathname[index + token.length];
    if (next === undefined || next === "/") {
      return index;
    }
    from = index + token.length;
  }
  return -1;
}

export function enterprisePortalBasePath(pathname: string): string {
  const indexes = (["admin", "app", "enterprise"] as const)
    .map((segment) => segmentIndex(pathname, segment))
    .filter((index) => index >= 0)
    .toSorted((left, right) => left - right);
  return indexes[0] === undefined ? "" : pathname.slice(0, indexes[0]);
}

export function resolvePortal(
  pathname: string,
  status: EnterprisePortalStatus | null,
): PortalResolution {
  if (!status?.enabled) {
    return { kind: "control" };
  }
  const legacyIndex = segmentIndex(pathname, "enterprise");
  if (legacyIndex >= 0) {
    return { kind: "redirect", href: `${pathname.slice(0, legacyIndex)}/admin` };
  }
  if (segmentIndex(pathname, "admin") >= 0) {
    return { kind: "admin" };
  }
  const appIndex = segmentIndex(pathname, "app");
  if (appIndex < 0) {
    const basePath = enterprisePortalBasePath(pathname);
    const suffix =
      pathname === basePath || pathname === `${basePath}/` ? "" : pathname.slice(basePath.length);
    return { kind: "redirect", href: `${basePath}/app${suffix === "/" ? "" : suffix}` };
  }
  return status.userPortalVersion === "v2" ? { kind: "user-v2" } : { kind: "user-legacy" };
}
