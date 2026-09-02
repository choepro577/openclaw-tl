import { createHash } from "node:crypto";
import { listAgentEntries } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";

/** Resolves the company-managed template copied into one Personal Agent projection. */
export function resolveEnterprisePersonalAgentTemplateId(
  config: OpenClawConfig,
  account: EnterpriseAccount,
): string {
  const configured =
    config.enterprise?.personalAgent?.templateAgentId?.trim() || account.defaultAgentId?.trim();
  if (configured) {
    return normalizeAgentId(configured);
  }
  const entries = listAgentEntries(config);
  return normalizeAgentId(
    entries.find((entry) => entry.default === true)?.id ?? entries[0]?.id ?? "main",
  );
}

/** Runtime identity is account-specific even when multiple products share one template. */
export function resolveEnterprisePersonalAgentId(
  _config: OpenClawConfig,
  account: EnterpriseAccount,
): string {
  const suffix = createHash("sha256").update(account.id).digest("hex").slice(0, 20);
  return `enterprise-personal-${suffix}`;
}
