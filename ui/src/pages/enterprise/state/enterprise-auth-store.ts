import { eu } from "../../../i18n/enterprise-user.ts";
import {
  EnterpriseApiError,
  loadEnterpriseMe,
  loadEnterpriseStatus,
  type EnterpriseAccount,
} from "../services/enterprise-api.ts";
import type { EnterpriseAuthEntryPoint } from "./enterprise-auth-navigation.ts";
import { setEnterpriseUiAccountRole } from "./enterprise-ui-access.ts";

export type EnterpriseAuthState =
  | { phase: "checking" }
  | { phase: "disabled" }
  | { phase: "unauthenticated"; bootstrapped: boolean; error?: string }
  | { phase: "password-change"; account: EnterpriseAccount; error?: string }
  | { phase: "authenticated"; account: EnterpriseAccount; entryPoint: EnterpriseAuthEntryPoint }
  | { phase: "error"; message: string };

export class EnterpriseAuthStore {
  state: EnterpriseAuthState = { phase: "checking" };
  private readonly listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setState(state: EnterpriseAuthState): void {
    this.state = state;
    setEnterpriseUiAccountRole(state.phase === "authenticated" ? state.account.role : undefined);
    for (const listener of this.listeners) {
      listener();
    }
  }

  async load(): Promise<void> {
    this.setState({ phase: "checking" });
    try {
      const status = await loadEnterpriseStatus();
      if (!status.enabled) {
        this.setState({ phase: "disabled" });
        return;
      }
      if (!status.bootstrapped) {
        this.setState({ phase: "unauthenticated", bootstrapped: false });
        return;
      }
      try {
        const { account } = await loadEnterpriseMe();
        this.acceptAccount(account, "restore");
      } catch (error) {
        if (error instanceof EnterpriseApiError && error.status === 401) {
          this.setState({ phase: "unauthenticated", bootstrapped: true });
          return;
        }
        throw error;
      }
    } catch (error) {
      this.setState({
        phase: "error",
        message: error instanceof Error ? error.message : eu("portalCheckFailed"),
      });
    }
  }

  acceptAccount(account: EnterpriseAccount, entryPoint: EnterpriseAuthEntryPoint = "login"): void {
    this.setState(
      account.mustChangePassword
        ? { phase: "password-change", account }
        : { phase: "authenticated", account, entryPoint },
    );
  }
}

export const enterpriseAuthStore = new EnterpriseAuthStore();
