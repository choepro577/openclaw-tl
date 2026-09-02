import type { RouteLocation, RouterHistory } from "@openclaw/uirouter";
import type { RouteId } from "../../app-route-paths.ts";
import type { ApplicationRouter } from "../../app-routes.ts";
import type { ApplicationContext } from "../context.ts";

/**
 * Owns the complete URL contract for one portal. Keeping these functions
 * together prevents path matching, generated links, and startup history from
 * drifting when a portal uses a restricted route tree.
 */
export type ApplicationRoutingProfile = {
  /** Presentation boundary used by shared pages to remove operator-only chrome. */
  readonly presentation?: "control" | "enterprise-user";
  readonly fallbackRouteId: RouteId;
  createRouter(): ApplicationRouter;
  routeIdFromPath(pathname: string, basePath: string): RouteId | null;
  locationForRoute(routeId: RouteId, basePath: string): RouteLocation;
  startRouter(
    router: ApplicationRouter,
    history: RouterHistory,
    basePath: string,
    context: ApplicationContext<RouteId>,
  ): Promise<void>;
};
