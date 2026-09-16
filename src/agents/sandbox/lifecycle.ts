/**
 * Process-local sandbox lifecycle coordination.
 *
 * Provisioning and pruning mutate the runtime selected by a stable scope key,
 * so those operations use an exclusive writer lease. A running turn only
 * reads/uses that runtime and uses a shared lease instead. This lets two
 * turns in the same agent/shared sandbox run concurrently. Destructive callers
 * check active readers under the writer lease and defer removal while in use.
 */
import { resolveGlobalSingleton } from "../../shared/global-singleton.js";

type SandboxLifecycleState = {
  /** FIFO chain for exclusive provisioning/prune operations. */
  mutationTail: Promise<void>;
  /** Number of exclusive operations waiting or owning the writer lease. */
  queuedMutations: number;
  mutationOwner: boolean;
  /** Number of turns currently using the runtime. */
  activeUsers: number;
  /** Foreground preparations waiting for their resource writer to hand off. */
  pendingActiveLeases: Set<PendingSandboxActiveLease>;
  /** Waiters are notified whenever a reader/writer state changes. */
  waiters: Set<() => void>;
  /** Resolved waiters remain referenced until their async continuation runs. */
  pendingWaiters: number;
};

type PendingSandboxActiveLease = {
  ownerKey: string;
  resolve: (release: () => void) => void;
  reject: (error: unknown) => void;
  waitStarted: boolean;
  settled: boolean;
};

// Sandbox context and prune can be loaded by separate lazy runtime chunks.
// Keep one lifecycle table across those chunks so a prune in one chunk cannot
// miss a foreground lease acquired by another.
const sandboxLifecycleStates = resolveGlobalSingleton(
  Symbol.for("openclaw.sandboxLifecycleStates"),
  () => new Map<string, SandboxLifecycleState>(),
);

function normalizeScopeKey(scopeKey: string | undefined): string {
  return scopeKey?.trim() ?? "";
}

function getOrCreateState(key: string): SandboxLifecycleState {
  const existing = sandboxLifecycleStates.get(key);
  if (existing) {
    return existing;
  }
  const state: SandboxLifecycleState = {
    mutationTail: Promise.resolve(),
    queuedMutations: 0,
    mutationOwner: false,
    activeUsers: 0,
    pendingActiveLeases: new Set(),
    waiters: new Set(),
    pendingWaiters: 0,
  };
  sandboxLifecycleStates.set(key, state);
  return state;
}

function notifyStateChanged(state: SandboxLifecycleState): void {
  const waiters = [...state.waiters];
  state.waiters.clear();
  for (const wake of waiters) {
    wake();
  }
}

function waitForStateChange(key: string, state: SandboxLifecycleState): Promise<void> {
  state.pendingWaiters += 1;
  return new Promise((resolve) => {
    state.waiters.add(() => {
      resolve();
      // Keep the state alive until the continuation that was just woken can
      // either acquire a reader lease or register for another notification.
      queueMicrotask(() => {
        state.pendingWaiters = Math.max(0, state.pendingWaiters - 1);
        maybeDeleteState(key, state);
      });
    });
  });
}

function maybeDeleteState(key: string, state: SandboxLifecycleState): void {
  if (
    state.queuedMutations === 0 &&
    !state.mutationOwner &&
    state.activeUsers === 0 &&
    state.pendingActiveLeases.size === 0 &&
    state.waiters.size === 0 &&
    state.pendingWaiters === 0 &&
    sandboxLifecycleStates.get(key) === state
  ) {
    sandboxLifecycleStates.delete(key);
  }
}

function createActiveLease(key: string, state: SandboxLifecycleState): () => void {
  state.activeUsers += 1;
  notifyStateChanged(state);
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    state.activeUsers = Math.max(0, state.activeUsers - 1);
    notifyStateChanged(state);
    maybeDeleteState(key, state);
  };
}

function settlePendingActiveLeases(
  key: string,
  state: SandboxLifecycleState,
  ownerKey: string,
  error?: unknown,
): void {
  for (const pending of state.pendingActiveLeases) {
    if (pending.ownerKey !== ownerKey) {
      continue;
    }
    state.pendingActiveLeases.delete(pending);
    pending.settled = true;
    if (error !== undefined) {
      // A preparation may fail before its foreground caller reaches
      // reservation.wait(). Rejecting an unobserved promise creates an
      // unhandled rejection; a later wait still needs to settle, so resolve
      // it with an idempotent no-op when no waiter has subscribed yet.
      if (pending.waitStarted) {
        pending.reject(error);
      } else {
        pending.resolve(() => undefined);
      }
    } else {
      pending.resolve(createActiveLease(key, state));
    }
  }
  maybeDeleteState(key, state);
}

export type SandboxActiveLeaseReservation = {
  wait(): Promise<() => void>;
  cancel(reason?: unknown): void;
};

/**
 * Reserves active-use protection before a resource preparation starts. The
 * preparation owner activates it synchronously before releasing its writer.
 */
export function reserveSandboxActiveLease(
  scopeKey: string | undefined,
  preparationKey?: string,
): SandboxActiveLeaseReservation {
  const key = normalizeScopeKey(scopeKey);
  const ownerKey = preparationKey ?? "";
  if (!key) {
    return {
      wait: async () => () => undefined,
      cancel: () => undefined,
    };
  }
  const state = getOrCreateState(key);
  let settled = false;
  let resolveWait!: (release: () => void) => void;
  let rejectWait!: (error: unknown) => void;
  const waitPromise = new Promise<() => void>((resolve, reject) => {
    resolveWait = resolve;
    rejectWait = reject;
  });
  const pending: PendingSandboxActiveLease = {
    ownerKey,
    resolve: resolveWait,
    reject: rejectWait,
    waitStarted: false,
    settled: false,
  };
  // Keep the reservation pending until its resource owner has completed. The
  // writer itself protects the runtime while it is being prepared, and this
  // avoids counting the preparation's own reservation as an active turn. That
  // distinction lets the first request safely replace a stale browser/runtime
  // while still protecting an already-running turn in the same scope.
  let acquiredRelease: (() => void) | undefined;
  let handedOff = false;
  pending.resolve = (release) => {
    acquiredRelease = release;
    resolveWait(release);
  };
  state.pendingActiveLeases.add(pending);
  return {
    wait: async () => {
      pending.waitStarted = true;
      const release = await waitPromise;
      handedOff = true;
      acquiredRelease = undefined;
      return release;
    },
    cancel: (reason = new Error("sandbox active lease reservation cancelled")) => {
      // If preparation activated this reservation before the caller reached
      // wait(), release the reader here. The returned release remains
      // idempotent if the caller later consumes the already-settled wait.
      if (!handedOff && acquiredRelease) {
        acquiredRelease();
        acquiredRelease = undefined;
        settled = true;
        pending.settled = true;
        maybeDeleteState(key, state);
        return;
      }
      if (settled || pending.settled) {
        return;
      }
      settled = true;
      state.pendingActiveLeases.delete(pending);
      pending.settled = true;
      if (pending.waitStarted) {
        rejectWait(reason);
      } else {
        pending.resolve(() => undefined);
      }
      maybeDeleteState(key, state);
    },
  };
}

/** Completes pending reservations while the matching resource writer still owns the scope. */
export function activatePendingSandboxActiveLeases(
  scopeKey: string | undefined,
  preparationKey?: string,
): void {
  const key = normalizeScopeKey(scopeKey);
  if (!key) {
    return;
  }
  const state = sandboxLifecycleStates.get(key);
  if (!state) {
    return;
  }
  settlePendingActiveLeases(key, state, preparationKey ?? "");
}

/** Fails pending reservations when their matching resource preparation fails. */
export function cancelPendingSandboxActiveLeases(
  scopeKey: string | undefined,
  preparationKey: string | undefined,
  reason: unknown,
): void {
  const key = normalizeScopeKey(scopeKey);
  if (!key) {
    return;
  }
  const state = sandboxLifecycleStates.get(key);
  if (!state) {
    return;
  }
  settlePendingActiveLeases(key, state, preparationKey ?? "", reason);
}

/**
 * Acquires exclusive ownership of one sandbox scope for provisioning/pruning.
 * Writers serialize mutations but may run alongside active readers; destructive
 * callers must re-check the reader count while owning the writer before removal.
 * Its queued count gives writers priority over new readers.
 */
export async function acquireSandboxLifecycleLease(
  scopeKey: string | undefined,
): Promise<() => void> {
  const key = normalizeScopeKey(scopeKey);
  if (!key) {
    return () => undefined;
  }

  const state = getOrCreateState(key);
  state.queuedMutations += 1;
  const previous = state.mutationTail;
  let releaseTurnInQueue!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseTurnInQueue = resolve;
  });
  state.mutationTail = current;

  await previous;
  state.queuedMutations -= 1;
  state.mutationOwner = true;
  notifyStateChanged(state);

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    state.mutationOwner = false;
    releaseTurnInQueue();
    notifyStateChanged(state);
    maybeDeleteState(key, state);
  };
}

/**
 * Acquires shared use of an already-prepared sandbox for one active turn.
 * Multiple active turns on the same scope are allowed to hold this lease at
 * once. A queued writer blocks new readers until it has completed.
 */
export async function acquireSandboxActiveLease(scopeKey: string | undefined): Promise<() => void> {
  const key = normalizeScopeKey(scopeKey);
  if (!key) {
    return () => undefined;
  }

  const state = getOrCreateState(key);
  while (state.mutationOwner || state.queuedMutations > 0) {
    await waitForStateChange(key, state);
  }
  return createActiveLease(key, state);
}

/** Returns true while a scope is being mutated or used by an active turn. */
export function isSandboxLifecycleActive(scopeKey: string | undefined): boolean {
  const key = normalizeScopeKey(scopeKey);
  if (!key) {
    return false;
  }
  const state = sandboxLifecycleStates.get(key);
  return Boolean(state?.mutationOwner || state?.activeUsers);
}

/** Returns true when a foreground turn currently holds a shared-use lease. */
export function hasSandboxActiveUsers(scopeKey: string | undefined): boolean {
  const key = normalizeScopeKey(scopeKey);
  if (!key) {
    return false;
  }
  return (sandboxLifecycleStates.get(key)?.activeUsers ?? 0) > 0;
}
