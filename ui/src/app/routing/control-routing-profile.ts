import {
  createApplicationRouter,
  locationForRoute,
  routeIdFromPath,
  startApplicationRouter,
} from "../../app-routes.ts";
import type { ApplicationRoutingProfile } from "./routing-profile.ts";

export const controlRoutingProfile: ApplicationRoutingProfile = {
  fallbackRouteId: "chat",
  createRouter: createApplicationRouter,
  routeIdFromPath,
  locationForRoute,
  startRouter: startApplicationRouter,
};
