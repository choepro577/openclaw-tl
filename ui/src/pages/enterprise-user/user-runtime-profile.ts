import type { RouteLocation, RouterHistory } from "@openclaw/uirouter";
import {
  INTERNAL_SESSION_PATH_PARAM,
  normalizeBasePath,
  sessionRouteNamespaceFromPath,
  type RouteId,
} from "../../app-route-paths.ts";
import type { ApplicationRouter } from "../../app-routes.ts";
import type { ApplicationContext } from "../../app/context.ts";
import type { ApplicationRoutingProfile } from "../../app/routing/routing-profile.ts";
import { openUserAgentConversation } from "./adapters/chat-route-adapter.ts";
import { userBootstrapStore } from "./state/user-bootstrap-store.ts";
import { createEnterpriseUserRouter } from "./user-routes.ts";

const USER_ROUTE_PATHS: Partial<Record<RouteId, string>> = {
  chat: "/chat",
  "new-session": "/new",
  sessions: "/conversations",
  enterprise: "/agents",
  plugins: "/plugins",
  knowledge: "/knowledge",
  agents: "/agents/personal",
  cron: "/automations",
  automation: "/automations/new",
  profile: "/settings/account",
  appearance: "/settings/appearance",
  notifications: "/settings/notifications",
  about: "/help",
  advanced: "/not-found",
};

const USER_ALIASES = new Map<string, RouteId>([
  ["/enterprise", "enterprise"],
  ["/settings/agents", "agents"],
  ["/sessions", "sessions"],
  ["/cron", "cron"],
  ["/settings/profile", "profile"],
]);

function routePath(routeId: RouteId, basePath: string): string {
  const path = USER_ROUTE_PATHS[routeId] ?? USER_ROUTE_PATHS.advanced!;
  const base = normalizeBasePath(basePath);
  return base ? `${base}${path}` : path;
}

function pathWithinBase(pathname: string, basePath: string): string | null {
  const base = normalizeBasePath(basePath);
  if (!base) {
    return pathname || "/";
  }
  return pathname === base
    ? "/"
    : pathname.startsWith(`${base}/`)
      ? pathname.slice(base.length)
      : null;
}

export function enterpriseUserRouteIdFromPath(pathname: string, basePath: string): RouteId | null {
  const relative = pathWithinBase(pathname, basePath)?.replace(/\/$/, "") || "/";
  if (relative === "/") {
    return "enterprise";
  }
  if (sessionRouteNamespaceFromPath(pathname, basePath) === "chat") {
    return "chat";
  }
  if (/^\/agents\/shared\/[^/]+$/i.test(relative)) {
    return "enterprise";
  }
  if (/^\/automations\/(?:new|[^/]+)$/i.test(relative)) {
    return "automation";
  }
  for (const [routeId, path] of Object.entries(USER_ROUTE_PATHS) as Array<[RouteId, string]>) {
    if (relative.toLowerCase() === path.toLowerCase()) {
      return routeId;
    }
  }
  return USER_ALIASES.get(relative.toLowerCase()) ?? null;
}

export function enterpriseUserLocationForRoute(routeId: RouteId, basePath: string): RouteLocation {
  return { pathname: routePath(routeId, basePath), search: "", hash: "" };
}

function bridgedLocation(location: RouteLocation, basePath: string): RouteLocation {
  const sessionNamespace = sessionRouteNamespaceFromPath(location.pathname, basePath);
  if (sessionNamespace === "chat") {
    const search = new URLSearchParams(location.search);
    search.set(INTERNAL_SESSION_PATH_PARAM, location.pathname);
    return {
      ...location,
      pathname: routePath("chat", basePath),
      search: `?${search.toString()}`,
    };
  }
  const relative = pathWithinBase(location.pathname, basePath) ?? "";
  const shared = /^\/agents\/shared\/([^/]+)$/i.exec(relative);
  if (shared?.[1]) {
    return {
      ...location,
      pathname: routePath("enterprise", basePath),
      search: `?agent=${encodeURIComponent(decodeURIComponent(shared[1]))}`,
    };
  }
  const automation = /^\/automations\/([^/]+)$/i.exec(relative);
  if (automation?.[1]) {
    return {
      ...location,
      pathname: `${normalizeBasePath(basePath)}/automations/editor`,
      search: `?id=${encodeURIComponent(decodeURIComponent(automation[1]))}`,
    };
  }
  return location;
}

async function startEnterpriseUserRouter(
  router: ApplicationRouter,
  history: RouterHistory,
  basePath: string,
  context: ApplicationContext<RouteId>,
): Promise<void> {
  let initial = history.location();
  const shouldResumeDefaultAgent = pathWithinBase(initial.pathname, basePath) === "/";
  const initialRoute = enterpriseUserRouteIdFromPath(initial.pathname, basePath);
  if (initialRoute === null) {
    history.replace({ ...enterpriseUserLocationForRoute("advanced", basePath), search: "" });
    initial = history.location();
  } else if (pathWithinBase(initial.pathname, basePath) === "/") {
    history.replace(enterpriseUserLocationForRoute("enterprise", basePath));
    initial = history.location();
  } else if (initialRoute === "enterprise" && /\/enterprise\/?$/i.test(initial.pathname)) {
    history.replace(enterpriseUserLocationForRoute("enterprise", basePath));
    initial = history.location();
  } else if (initialRoute === "agents" && /\/settings\/agents\/?$/i.test(initial.pathname)) {
    history.replace(enterpriseUserLocationForRoute("agents", basePath));
    initial = history.location();
  }
  const routedHistory: RouterHistory = {
    location: () => bridgedLocation(history.location(), basePath),
    push: (next) => history.push(next),
    replace: (next) => history.replace(next),
    listen: (listener) =>
      history.listen((next) => {
        if (enterpriseUserRouteIdFromPath(next.pathname, basePath) === null) {
          history.replace(enterpriseUserLocationForRoute("advanced", basePath));
          return;
        }
        listener(bridgedLocation(next, basePath));
      }),
  };
  await router.start(routedHistory, basePath, context).catch((error: unknown) => {
    if (!(typeof error === "object" && error && "type" in error && error.type === "notFound")) {
      throw error;
    }
  });
  const bridged = bridgedLocation(initial, basePath);
  if (
    bridged.pathname !== initial.pathname ||
    bridged.search !== initial.search ||
    bridged.hash !== initial.hash
  ) {
    const routeId = enterpriseUserRouteIdFromPath(initial.pathname, basePath);
    if (routeId) {
      await router.navigate(routeId, context, { history: "none" }, initial);
    }
  }
  if (shouldResumeDefaultAgent) {
    await userBootstrapStore.load();
    const bootstrap = userBootstrapStore.state;
    if (bootstrap.phase === "ready" && bootstrap.data.defaultAgentKey) {
      const agent = bootstrap.data.agents.find(
        (candidate) => candidate.key === bootstrap.data.defaultAgentKey,
      );
      if (agent?.actions.canChat) {
        await openUserAgentConversation(context, agent.key, "resume-latest");
      }
    }
  }
}

export const enterpriseUserRoutingProfile: ApplicationRoutingProfile = {
  presentation: "enterprise-user",
  fallbackRouteId: "advanced",
  createRouter: createEnterpriseUserRouter,
  routeIdFromPath: enterpriseUserRouteIdFromPath,
  locationForRoute: enterpriseUserLocationForRoute,
  startRouter: startEnterpriseUserRouter,
};
