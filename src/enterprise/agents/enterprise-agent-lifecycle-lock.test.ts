import { afterEach, describe, expect, it } from "vitest";
import {
  resetEnterpriseAgentLifecycleLocksForTest,
  withEnterpriseAgentLifecycleLocks,
} from "./enterprise-agent-lifecycle-lock.js";

function deferred() {
  let resolve: (() => void) | undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve: () => resolve?.() };
}

afterEach(() => {
  resetEnterpriseAgentLifecycleLocksForTest();
});

describe("Enterprise Agent lifecycle lock", () => {
  it("serializes the same Agent while allowing an unrelated Agent to proceed", async () => {
    const firstEntered = deferred();
    const releaseFirst = deferred();
    const order: string[] = [];
    const first = withEnterpriseAgentLifecycleLocks(["agent:shared:contracts"], async () => {
      order.push("first-entered");
      firstEntered.resolve();
      await releaseFirst.promise;
      order.push("first-left");
    });
    await firstEntered.promise;

    const second = withEnterpriseAgentLifecycleLocks(["agent:shared:contracts"], () => {
      order.push("second-entered");
    });
    await withEnterpriseAgentLifecycleLocks(["agent:shared:finance"], () => {
      order.push("unrelated-entered");
    });
    expect(order).toEqual(["first-entered", "unrelated-entered"]);

    releaseFirst.resolve();
    await Promise.all([first, second]);
    expect(order).toEqual(["first-entered", "unrelated-entered", "first-left", "second-entered"]);
  });

  it("sorts overlapping multi-Agent locks so callers cannot deadlock", async () => {
    const operations = await Promise.all([
      withEnterpriseAgentLifecycleLocks(["agent:shared:b", "agent:shared:a"], () => "first"),
      withEnterpriseAgentLifecycleLocks(["agent:shared:a", "agent:shared:b"], () => "second"),
    ]);
    expect(operations).toEqual(["first", "second"]);
  });
});
