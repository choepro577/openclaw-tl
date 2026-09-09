import { afterEach, describe, expect, it } from "vitest";
import {
  MASKED_INPUT_OVERLAY_ATTRIBUTE,
  MASKED_INPUT_TARGET_CLASS,
  releaseDetachedMaskedInputs,
  syncMaskedInput,
} from "./masked-input.ts";

const overlaySelector = `[${MASKED_INPUT_OVERLAY_ATTRIBUTE}]`;

afterEach(() => {
  document.body.replaceChildren();
  releaseDetachedMaskedInputs();
});

function overlays(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(overlaySelector)];
}

describe("masked input presentation", () => {
  it("masks a native technical value without changing selection or form submission", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "path";
    input.value = "/home/app/OpenClaw/workspace";
    form.append(input);
    document.body.append(form);
    input.focus();
    input.setSelectionRange(10, 18);

    syncMaskedInput(input);

    expect(input.value).toBe("/home/app/OpenClaw/workspace");
    expect(input.selectionStart).toBe(10);
    expect(input.selectionEnd).toBe(18);
    expect(new FormData(form).get("path")).toBe("/home/app/OpenClaw/workspace");
    expect(input.classList.contains(MASKED_INPUT_TARGET_CLASS)).toBe(true);
    expect(overlays()[0]?.textContent).toBe("/home/app/*******/workspace");
  });

  it("updates the mirror from input events and masks a readonly placeholder", () => {
    const input = document.createElement("input");
    input.value = "/tmp/openclaw/one";
    input.readOnly = true;
    document.body.append(input);
    syncMaskedInput(input);

    input.value = "/tmp/OPENCLAW/two";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(overlays()[0]?.textContent).toBe("/tmp/*******/two");
    expect(input.value).toBe("/tmp/OPENCLAW/two");

    input.value = "";
    input.placeholder = "Select an openclaw workspace";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(overlays()[0]?.textContent).toBe("Select an ******* workspace");
    expect(input.placeholder).toBe("Select an openclaw workspace");
    expect(input.readOnly).toBe(true);
  });

  it("leaves password controls untouched even when their value contains the engine name", () => {
    const input = document.createElement("input");
    input.type = "password";
    input.value = "OpenClaw-secret";
    document.body.append(input);

    syncMaskedInput(input);

    expect(overlays()).toHaveLength(0);
    expect(input.value).toBe("OpenClaw-secret");
    expect(input.classList.contains(MASKED_INPUT_TARGET_CLASS)).toBe(false);
  });

  it("releases a mirror when the control is detached", () => {
    const input = document.createElement("input");
    input.value = "/srv/openclaw";
    document.body.append(input);
    syncMaskedInput(input);
    expect(overlays()).toHaveLength(1);

    input.remove();
    releaseDetachedMaskedInputs();

    expect(overlays()).toHaveLength(0);
    expect(input.classList.contains(MASKED_INPUT_TARGET_CLASS)).toBe(false);
  });
});
