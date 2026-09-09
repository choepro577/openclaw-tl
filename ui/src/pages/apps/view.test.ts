/* @vitest-environment jsdom */
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { renderApps } from "./view.ts";

describe("MAAP local app actions", () => {
  it("keeps Plugins navigation without upstream downloads or promotional artwork", () => {
    const onNavigate = vi.fn();
    const container = document.createElement("div");
    render(renderApps({ onNavigate }), container);
    expect(container.querySelector("a[href], img")).toBeNull();
    expect(container.querySelectorAll("button")).toHaveLength(1);
    container.querySelector("button")!.click();
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("plugins");
  });

  it("retains pairing only when the caller grants that action", () => {
    const onPairDevice = vi.fn();
    const container = document.createElement("div");
    render(renderApps({ onNavigate: vi.fn(), onPairDevice }), container);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    buttons[1].click();
    expect(onPairDevice).toHaveBeenCalledOnce();
  });
});
