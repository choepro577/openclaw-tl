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
