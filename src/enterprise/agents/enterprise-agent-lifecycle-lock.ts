const lifecycleTails = new Map<string, Promise<void>>();

async function acquireLifecycleLock(key: string): Promise<() => void> {
  const previous = lifecycleTails.get(key) ?? Promise.resolve();
  let releaseGate: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  const tail = previous.then(() => gate);
  lifecycleTails.set(key, tail);
  await previous;
  return () => {
    releaseGate?.();
    if (lifecycleTails.get(key) === tail) {
      lifecycleTails.delete(key);
    }
  };
}

/**
 * Serializes grant/create/delete operations that touch the same Agent resource.
 * Multiple keys are sorted to keep future multi-Agent mutations deadlock-free.
 */
export async function withEnterpriseAgentLifecycleLocks<T>(
  resourceKeys: Iterable<string>,
  operation: () => Promise<T> | T,
): Promise<T> {
  const keys = [...new Set(resourceKeys)].filter(Boolean).toSorted();
  const releases: Array<() => void> = [];
  try {
    for (const key of keys) {
      releases.push(await acquireLifecycleLock(key));
    }
    return await operation();
  } finally {
    for (const release of releases.toReversed()) {
      release();
    }
  }
}

export function resetEnterpriseAgentLifecycleLocksForTest(): void {
  lifecycleTails.clear();
}
