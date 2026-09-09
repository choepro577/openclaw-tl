// Trusted catalog matching for named Enterprise specialists. Callers receive IDs only.
import { listAgentEntries } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { normalizeAgentId } from "../../routing/session-key.js";

export function normalizeEnterpriseDelegationText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function enterpriseDelegationTextContainsName(prompt: string, name: string): boolean {
  const normalizedName = normalizeEnterpriseDelegationText(name);
  if (normalizedName.length < 2) {
    return false;
  }
  const escaped = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(
    normalizeEnterpriseDelegationText(prompt),
  );
}

export function explicitlyMentionedEnterpriseAgentIds(
  config: OpenClawConfig,
  prompt: string,
): string[] {
  return listAgentEntries(config)
    .filter((entry) => {
      const names = [
        entry.identity?.name,
        entry.name,
        entry.id,
        ...(entry.delegationTarget?.aliases ?? []),
      ].filter((value): value is string => Boolean(value));
      return names.some((name) => enterpriseDelegationTextContainsName(prompt, name));
    })
    .map((entry) => normalizeAgentId(entry.id));
}
