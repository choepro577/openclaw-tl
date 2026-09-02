import type { RouteId } from "../../../app-route-paths.ts";
import { selectApplicationSession } from "../../../app/agent-selection.ts";
import type { ApplicationContext } from "../../../app/context.ts";
import { eu } from "../../../i18n/enterprise-user.ts";
import { sessionNavigationTarget } from "../../../lib/sessions/route-navigation.ts";
import { parseAgentSessionKey } from "../../../lib/sessions/session-key.ts";
import type { AgentKey } from "../contracts/user-agent.ts";
import { openEnterpriseUserConversation } from "../services/user-enterprise-api.ts";
import { userAgentCatalogStore } from "../state/user-agent-catalog-store.ts";

export async function openUserAgentConversation(
  context: ApplicationContext<RouteId>,
  agentKey: AgentKey,
  mode: "resume-latest" | "new",
  options: { projectId?: string } = {},
): Promise<void> {
  const result = await openEnterpriseUserConversation(agentKey, mode, options);
  navigateToUserConversationSession(context, result.sessionKey, {
    agentKey,
    focusComposer: mode === "new",
  });
}

export function navigateToUserConversationSession(
  context: ApplicationContext<RouteId>,
  sessionKey: string,
  options: { agentKey?: AgentKey; focusComposer?: boolean } = {},
): void {
  const runtimeAgentId = parseAgentSessionKey(sessionKey)?.agentId;
  if (!runtimeAgentId) {
    throw new Error(eu("invalidConversation"));
  }
  if (options.agentKey) {
    userAgentCatalogStore.bindRuntimeAgent(options.agentKey, runtimeAgentId);
  } else {
    userAgentCatalogStore.setActiveRuntime(runtimeAgentId);
  }
  // Keep the established Control UI ordering: application ownership and the
  // Gateway session both change before route subscribers observe navigation.
  selectApplicationSession({
    selection: context.agentSelection,
    gateway: context.gateway,
    sessionKey,
    agentId: runtimeAgentId,
  });
  const target = sessionNavigationTarget({
    context,
    face: "chat",
    sessionKey,
    agentId: runtimeAgentId,
    exactKey: true,
    focusComposer: options.focusComposer,
    navigationKey: sessionKey,
  });
  context.navigate("chat", target.options);
}
