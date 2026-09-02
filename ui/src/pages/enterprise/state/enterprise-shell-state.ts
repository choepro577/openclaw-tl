import type { EnterpriseAccountRole } from "../services/enterprise-api.ts";

export type EnterpriseTab = "personal" | "agents" | "profile" | "accounts" | "management";

export function resolveEnterpriseTab(
  requestedTab: EnterpriseTab | undefined,
  role: EnterpriseAccountRole | undefined,
): EnterpriseTab {
  if (role === "administrator") {
    return requestedTab ?? "accounts";
  }
  if (requestedTab === "accounts" || requestedTab === "management") {
    return "personal";
  }
  return requestedTab ?? "personal";
}
