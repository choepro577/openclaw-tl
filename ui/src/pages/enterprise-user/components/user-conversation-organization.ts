import type { GatewaySessionRow } from "../../../api/types.ts";
import type { EnterpriseConversationProject } from "../services/user-enterprise-api.ts";

export type OrganizedEnterpriseUserSessions = {
  pinned: GatewaySessionRow[];
  projects: Array<{ project: EnterpriseConversationProject; sessions: GatewaySessionRow[] }>;
  recent: GatewaySessionRow[];
};

export function organizeEnterpriseUserSessions(
  sessions: readonly GatewaySessionRow[],
  projects: readonly EnterpriseConversationProject[],
): OrganizedEnterpriseUserSessions {
  const sessionByKey = new Map(sessions.map((session) => [session.key, session]));
  const assigned = new Set(projects.flatMap((project) => project.sessionKeys));
  const pinned = sessions.filter((session) => session.pinned === true && session.archived !== true);
  const pinnedKeys = new Set(pinned.map((session) => session.key));
  return {
    pinned,
    projects: projects.map((project) => ({
      project,
      sessions: project.sessionKeys
        .map((key) => sessionByKey.get(key))
        .filter((session): session is GatewaySessionRow => Boolean(session))
        .filter((session) => !pinnedKeys.has(session.key)),
    })),
    recent: sessions.filter(
      (session) => !pinnedKeys.has(session.key) && !assigned.has(session.key),
    ),
  };
}
