import type { EnterpriseUserAuthAccount } from "../services/user-enterprise-api.ts";

let account: EnterpriseUserAuthAccount | null = null;

export function setEnterpriseUserSessionAccount(next: EnterpriseUserAuthAccount | null): void {
  account = next;
}

export function enterpriseUserSessionAccount(): EnterpriseUserAuthAccount | null {
  return account;
}
