/** Host-only observation restriction for one private internal preparation execution. */
import { AsyncLocalStorage } from "node:async_hooks";
import { resolveGlobalSingleton } from "../shared/global-singleton.js";

const scope = resolveGlobalSingleton<AsyncLocalStorage<true>>(
  Symbol.for("openclaw.privateRunObservations"),
  () => new AsyncLocalStorage<true>(),
);

/** Restricts observations only; it never grants tools or bypasses action authorization. */
export function runWithPrivateRunObservationScope<T>(run: () => T): T {
  return scope.run(true, run);
}

/** Plugins may observe the restriction, but cannot create it through the SDK. */
export function isPrivateRunObservationScope(): boolean {
  return scope.getStore() === true;
}

/** EventEmitter callbacks retain the restriction even after their registration scope returns. */
export function bindPrivateRunObservationScope<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  return isPrivateRunObservationScope()
    ? (...args) => scope.run(true, () => callback(...args))
    : callback;
}
