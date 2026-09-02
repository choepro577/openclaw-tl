import type { RouteLocation } from "@openclaw/uirouter";

export function sameRouteLocation(left: RouteLocation, right: RouteLocation): boolean {
  return (
    left.pathname === right.pathname && left.search === right.search && left.hash === right.hash
  );
}
