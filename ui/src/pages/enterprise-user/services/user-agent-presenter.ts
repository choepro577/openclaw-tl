import { eu, type EnterpriseUserCopyKey } from "../../../i18n/enterprise-user.ts";
import type { EnterpriseUserAgent } from "../contracts/user-agent.ts";

const AVATAR_PRESET_LABELS: Record<string, string> = {
  sparkles: "✨",
  briefcase: "💼",
  "message-circle": "💬",
  bot: "🤖",
  user: "👤",
};

export function presentUserAgentAvatar(agent: EnterpriseUserAgent): string {
  const avatar = agent.avatar?.trim();
  return (avatar && AVATAR_PRESET_LABELS[avatar]) ?? avatar ?? agent.name.charAt(0).toUpperCase();
}

const ACCESS_REASON_COPY: Partial<Record<string, EnterpriseUserCopyKey>> = {
  not_granted: "agentAccessNotGranted",
  explicit_deny: "agentAccessDenied",
  account_disabled: "agentAccessAccountDisabled",
  personal_agent_disabled: "agentAccessPersonalDisabled",
  personal_agent_owner_mismatch: "agentAccessOwnerMismatch",
  employee_tool_hard_deny: "agentAccessDenied",
};

export function presentUserAgentAccessStatus(agent: EnterpriseUserAgent): string {
  const state = agent.access?.request?.state;
  if (state === "pending") {
    return eu("agentAccessPending");
  }
  if (state === "rejected") {
    return eu("agentAccessRejected");
  }
  if (state === "cancelled") {
    return eu("agentAccessCancelled");
  }
  const reason = agent.access?.reason;
  const key = reason ? ACCESS_REASON_COPY[reason] : undefined;
  return key ? eu(key) : reason || eu("agentAccessUnavailable");
}
