import type { EnterpriseAccountRole } from "../services/enterprise-api.ts";

let authenticatedRole: EnterpriseAccountRole | undefined;

const EMPLOYEE_ROUTE_IDS = new Set([
  "chat",
  "new-session",
  "sessions",
  "plugins",
  "cron",
  "enterprise",
]);

export function setEnterpriseUiAccountRole(role: EnterpriseAccountRole | undefined): void {
  authenticatedRole = role;
}

export function isEnterpriseUiActive(): boolean {
  return authenticatedRole !== undefined;
}

export function enterpriseUiAccountRole(): EnterpriseAccountRole | undefined {
  return authenticatedRole;
}

export function enterpriseUiCanShowHome(): boolean {
  return authenticatedRole === undefined || authenticatedRole === "administrator";
}

export function enterpriseEnabledRouteIds<T extends string>(
  routeIds: readonly T[],
  workboardEnabled: boolean,
): readonly T[] {
  if (authenticatedRole === "employee") {
    return routeIds.filter((routeId) => EMPLOYEE_ROUTE_IDS.has(routeId));
  }
  return routeIds.filter(
    (routeId) =>
      (workboardEnabled || routeId !== "workboard") &&
      (authenticatedRole !== undefined || routeId !== "enterprise"),
  );
}
