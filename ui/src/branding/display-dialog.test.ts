import { afterEach, describe, expect, it, vi } from "vitest";
import { showNativeAlert, showNativeConfirm, showNativePrompt } from "./display-dialog.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("native dialog display boundary", () => {
  it("masks alert messages and keeps the native return contract", () => {
    const alert = vi.fn();
    vi.stubGlobal("alert", alert);

    expect(showNativeAlert("Failed at /home/app/.OpenClaw/workspace")).toBeUndefined();
    expect(alert).toHaveBeenCalledWith("Failed at /home/app/.*******/workspace");
  });

  it("masks confirm messages while returning the browser decision", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);

    expect(showNativeConfirm("Remove @openclaw/diffs?")).toBe(false);
    expect(confirm).toHaveBeenCalledWith("Remove @*******/diffs?");
  });

  it("preserves exact prompt defaults and returned technical values", () => {
    const prompt = vi.fn(() => "openclaw-zone");
    vi.stubGlobal("prompt", prompt);

    expect(showNativePrompt("Enter the exact slug for /tmp/openclaw", "openclaw-zone")).toBe(
      "openclaw-zone",
    );
    expect(prompt).toHaveBeenCalledWith("Enter the exact slug for /tmp/*******", "openclaw-zone");
  });
});
