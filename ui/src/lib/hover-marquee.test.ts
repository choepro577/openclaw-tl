import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startHoverMarquee, stopHoverMarquee } from "./hover-marquee.ts";

let pendingFrame: FrameRequestCallback | undefined;

function runPendingFrame(): void {
  const callback = pendingFrame;
  pendingFrame = undefined;
  callback?.(0);
}

function buildRow(params: { textWidth: number; labelWidth: number }) {
  const row = document.createElement("div");
  const viewport = document.createElement("span");
  const label = document.createElement("span");
  label.className = "hover-marquee";
  label.textContent = "Fix stale iMessage group-allowlist warning copy";
  viewport.append(label);
  row.append(viewport);
  document.body.append(row);
  Object.defineProperty(label, "clientWidth", { value: params.labelWidth });
  Object.defineProperty(label, "scrollWidth", { value: params.textWidth });
  return { row, viewport, label };
}

function buildCodexRow(params: { textWidth: number; labelWidth: number; fontSize?: number }) {
  const row = document.createElement("div");
  const label = document.createElement("span");
  const clip = document.createElement("span");
  const track = document.createElement("span");
  const content = document.createElement("span");
  label.className = "hover-marquee";
  label.dataset.hoverMarqueeMode = "codex";
  content.dataset.hoverMarqueeContent = "";
  content.textContent = "Fix stale iMessage group-allowlist warning copy";
  content.style.fontSize = `${params.fontSize ?? 10}px`;
  track.append(content);
  clip.append(track);
  label.append(clip);
  row.append(label);
  document.body.append(row);
  Object.defineProperty(label, "clientWidth", { value: params.labelWidth });
  vi.spyOn(content, "getBoundingClientRect").mockReturnValue({
    top: 0,
    right: params.textWidth,
    bottom: 10,
    left: 0,
    width: params.textWidth,
    height: 10,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return { row, label };
}

describe("hover marquee", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pendingFrame = undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      pendingFrame = callback;
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("waits before scrolling overflowing labels by the clipped distance", () => {
    const { row, label } = buildRow({ textWidth: 320, labelWidth: 180 });
    startHoverMarquee(row);
    expect(label.style.getPropertyValue("--hover-marquee-shift")).toBe("");
    runPendingFrame();
    expect(label.style.getPropertyValue("--hover-marquee-shift")).toBe("-140px");
    expect(label.style.getPropertyValue("--hover-marquee-duration")).toBe("1750ms");
    vi.advanceTimersByTime(499);
    expect(label.classList.contains("hover-marquee--scrolling")).toBe(false);
    vi.advanceTimersByTime(1);
    expect(label.classList.contains("hover-marquee--scrolling")).toBe(true);
    stopHoverMarquee(row);
    expect(label.classList.contains("hover-marquee--scrolling")).toBe(false);
  });

  it("cancels the delayed scroll when hover ends early", () => {
    const { row, label } = buildRow({ textWidth: 320, labelWidth: 180 });
    startHoverMarquee(row);
    runPendingFrame();
    vi.advanceTimersByTime(250);
    stopHoverMarquee(row);
    vi.advanceTimersByTime(250);
    expect(label.classList.contains("hover-marquee--scrolling")).toBe(false);
  });

  it("keeps the original delay when start repeats during hover", () => {
    const { row, label } = buildRow({ textWidth: 320, labelWidth: 180 });
    startHoverMarquee(row);
    runPendingFrame();
    vi.advanceTimersByTime(250);
    startHoverMarquee(row);
    runPendingFrame();
    vi.advanceTimersByTime(250);
    expect(label.classList.contains("hover-marquee--scrolling")).toBe(true);
  });

  it("cancels measurement when hover ends before the next frame", () => {
    const { row, label } = buildRow({ textWidth: 320, labelWidth: 180 });
    startHoverMarquee(row);
    stopHoverMarquee(row);
    runPendingFrame();
    vi.advanceTimersByTime(500);
    expect(label.style.getPropertyValue("--hover-marquee-shift")).toBe("");
    expect(label.classList.contains("hover-marquee--scrolling")).toBe(false);
  });

  it("keeps short scroll distances readable with a minimum duration", () => {
    const { row, label } = buildRow({ textWidth: 190, labelWidth: 180 });
    startHoverMarquee(row);
    runPendingFrame();
    expect(label.style.getPropertyValue("--hover-marquee-shift")).toBe("-10px");
    expect(label.style.getPropertyValue("--hover-marquee-duration")).toBe("300ms");
  });

  it("uses a clipping ancestor's content width", () => {
    const { row, viewport, label } = buildRow({ textWidth: 190, labelWidth: 220 });
    viewport.style.overflowX = "hidden";
    viewport.style.paddingRight = "44px";
    Object.defineProperty(viewport, "clientWidth", { value: 220 });
    startHoverMarquee(row);
    runPendingFrame();
    expect(label.style.getPropertyValue("--hover-marquee-shift")).toBe("-14px");
  });

  it("leaves labels that fit untouched", () => {
    const { row, label } = buildRow({ textWidth: 120, labelWidth: 180 });
    startHoverMarquee(row);
    runPendingFrame();
    expect(label.classList.contains("hover-marquee--scrolling")).toBe(false);
    expect(label.style.getPropertyValue("--hover-marquee-shift")).toBe("");
  });

  it("matches the Codex pause, speed, easing samples, and stop-at-end behavior", () => {
    const { row, label } = buildCodexRow({ textWidth: 320, labelWidth: 180 });
    startHoverMarquee(row);
    runPendingFrame();

    expect(label.style.getPropertyValue("--hover-marquee-shift")).toBe("-140px");
    expect(label.style.getPropertyValue("--hover-marquee-duration")).toBe("7.350s");
    expect(label.style.getPropertyValue("--hover-marquee-timing")).toMatch(
      /^linear\(0\.0000 0\.0000%, 0\.0000 4\.7619%,/,
    );
    expect(label.style.getPropertyValue("--hover-marquee-timing")).toMatch(/1\.0000 100\.0000%\)$/);
    expect(label.classList.contains("hover-marquee--scrolling")).toBe(true);

    stopHoverMarquee(row);
    expect(label.classList.contains("hover-marquee--scrolling")).toBe(false);
  });

  it("does not animate a Codex-style title that fits its viewport", () => {
    const { row, label } = buildCodexRow({ textWidth: 120, labelWidth: 180 });
    startHoverMarquee(row);
    runPendingFrame();

    expect(label.classList.contains("hover-marquee--scrolling")).toBe(false);
    expect(label.style.getPropertyValue("--hover-marquee-shift")).toBe("");
  });

  it("ignores hosts without a marquee label", () => {
    const row = document.createElement("div");
    expect(() => {
      startHoverMarquee(row);
      stopHoverMarquee(row);
    }).not.toThrow();
  });
});
