// Sandbox lifecycle tests protect the exclusion that serializes foreground
// provisioning with background pruning for one stable scope key.
import { describe, expect, it } from "vitest";
import {
  activatePendingSandboxActiveLeases,
  acquireSandboxActiveLease,
  acquireSandboxLifecycleLease,
  hasSandboxActiveUsers,
  isSandboxLifecycleActive,
  reserveSandboxActiveLease,
} from "./lifecycle.js";

describe("sandbox lifecycle leases", () => {
  it("waits for the current owner before granting a competing lease", async () => {
    const releaseFirst = await acquireSandboxLifecycleLease("scope:one");
    let secondAcquired = false;
    const second = acquireSandboxLifecycleLease("scope:one").then((release) => {
      secondAcquired = true;
      return release;
    });

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(secondAcquired).toBe(false);
    expect(isSandboxLifecycleActive("scope:one")).toBe(true);

    releaseFirst();
    const releaseSecond = await second;
    expect(secondAcquired).toBe(true);
    expect(isSandboxLifecycleActive("scope:one")).toBe(true);
    releaseSecond();
    expect(isSandboxLifecycleActive("scope:one")).toBe(false);
  });

  it("makes release idempotent", async () => {
    const release = await acquireSandboxLifecycleLease("scope:two");
    release();
    release();
    expect(isSandboxLifecycleActive("scope:two")).toBe(false);
  });

  it("allows concurrent active turns without making warm mutation wait for a full turn", async () => {
    const releaseFirst = await acquireSandboxActiveLease("scope:shared");
    const releaseSecond = await acquireSandboxActiveLease("scope:shared");
    let mutationAcquired = false;
    const mutation = acquireSandboxLifecycleLease("scope:shared").then((release) => {
      mutationAcquired = true;
      return release;
    });

    const releaseMutation = await mutation;
    expect(mutationAcquired).toBe(true);
    expect(hasSandboxActiveUsers("scope:shared")).toBe(true);
    expect(isSandboxLifecycleActive("scope:shared")).toBe(true);

    releaseMutation();
    releaseFirst();
    releaseSecond();
    expect(isSandboxLifecycleActive("scope:shared")).toBe(false);
  });

  it("transfers a writer to an active turn without exposing a prune gap", async () => {
    const releaseWriter = await acquireSandboxLifecycleLease("scope:handoff");
    const reservation = reserveSandboxActiveLease("scope:handoff", "prep:handoff");
    let mutationAcquired = false;
    const mutation = acquireSandboxLifecycleLease("scope:handoff").then((release) => {
      mutationAcquired = true;
      return release;
    });

    activatePendingSandboxActiveLeases("scope:handoff", "prep:handoff");
    const releaseActive = await reservation.wait();
    expect(isSandboxLifecycleActive("scope:handoff")).toBe(true);
    releaseWriter();
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    // A warm mutation may proceed alongside readers; its destructive caller
    // must consult the active-user count before removing the runtime.
    expect(mutationAcquired).toBe(true);

    releaseActive();
    const releaseMutation = await mutation;
    releaseMutation();
    expect(isSandboxLifecycleActive("scope:handoff")).toBe(false);
  });

  it("settles a cancelled reservation safely before its caller waits", async () => {
    const reservation = reserveSandboxActiveLease("scope:cancel-before-wait", "prep:cancel");
    reservation.cancel(new Error("preparation failed"));

    const release = await reservation.wait();
    release();
    expect(hasSandboxActiveUsers("scope:cancel-before-wait")).toBe(false);
    expect(isSandboxLifecycleActive("scope:cancel-before-wait")).toBe(false);
  });
});
