/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { testApi } from "./models-page.ts";

describe("Enterprise Admin Models transport", () => {
  it("applies the canonical request timeout to REST actions", async () => {
    const signal = testApi.requestSignal({ timeoutMs: 5 });

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(signal?.aborted).toBe(true);
  });

  it("keeps caller cancellation when composing it with a timeout", () => {
    const caller = new AbortController();
    const signal = testApi.requestSignal({ signal: caller.signal, timeoutMs: 40_000 });

    caller.abort();

    expect(signal?.aborted).toBe(true);
  });
});
