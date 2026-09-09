/* @vitest-environment jsdom */

import { nothing, render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderSensitiveInput } from "./sensitive-input.ts";

describe("renderSensitiveInput", () => {
  afterEach(() => {
    for (const container of document.body.querySelectorAll("div")) {
      render(nothing, container);
    }
    document.body.replaceChildren();
  });

  it("conceals the value with a native password input", () => {
    const container = document.createElement("div");
    const onInput = vi.fn();
    document.body.append(container);
    render(
      renderSensitiveInput({
        id: "secret",
        name: "secret",
        value: "secret",
        revealed: false,
        revealLabel: "Show API key",
        hideLabel: "Hide API key",
        onInput,
        onToggle: vi.fn(),
      }),
      container,
    );

    const input = container.querySelector<HTMLInputElement>("[data-sensitive-value]");
    const toggle = container.querySelector<HTMLButtonElement>(".oc-sensitive-toggle");
    expect(input?.type).toBe("password");
    expect(toggle?.dataset.sensitiveIcon).toBe("eye");
    expect(toggle?.getAttribute("aria-label")).toBe("Show API key");
    expect(toggle?.getAttribute("aria-pressed")).toBe("false");

    if (input) {
      input.value = "longer-key";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    expect(onInput).toHaveBeenCalledWith("longer-key");
  });

  it("reveals the value and presents the hide action", () => {
    const container = document.createElement("div");
    const onToggle = vi.fn();
    document.body.append(container);
    render(
      renderSensitiveInput({
        id: "secret",
        value: "secret",
        revealed: true,
        revealLabel: "Show API key",
        hideLabel: "Hide API key",
        autocomplete: "current-password",
        required: true,
        disabled: false,
        onInput: vi.fn(),
        onToggle,
      }),
      container,
    );

    const input = container.querySelector<HTMLInputElement>("[data-sensitive-value]");
    const toggle = container.querySelector<HTMLButtonElement>(".oc-sensitive-toggle");
    expect(input?.type).toBe("text");
    expect(input?.value).toBe("secret");
    expect(input?.autocomplete).toBe("current-password");
    expect(input?.required).toBe(true);
    expect(toggle?.dataset.sensitiveIcon).toBe("eye-off");
    expect(toggle?.getAttribute("aria-label")).toBe("Hide API key");
    expect(toggle?.getAttribute("aria-pressed")).toBe("true");

    toggle?.click();
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
