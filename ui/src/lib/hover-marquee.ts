// Hover marquee for clipped single-line labels. The default mode keeps the
// existing text-indent transition and ellipsis. The opt-in Codex mode measures
// a nested content span and supplies its pause/easing/distance to a transform
// animation, allowing a gradient edge instead of an ellipsis.
const MARQUEE_SPEED_PX_PER_SEC = 80;
const MARQUEE_MIN_DURATION_MS = 300;
const MARQUEE_HOVER_DELAY_MS = 500;
const CODEX_MARQUEE_FALLBACK_FONT_SIZE_PX = 13;
const CODEX_MARQUEE_SPEED_EM_PER_SEC = 2;
const CODEX_MARQUEE_DELAY_SEC = 0.35;
const CODEX_MARQUEE_SAMPLE_COUNT = 32;
const CODEX_MARQUEE_CURVE = { x1: 0.49, y1: 0.6, x2: 0.7, y2: 1 };
type PendingMarquee = { frame: number; timer?: number };

const pendingMarquees = new WeakMap<HTMLElement, PendingMarquee>();

function findMarqueeLabel(host: HTMLElement): HTMLElement | null {
  return host.classList.contains("hover-marquee")
    ? host
    : host.querySelector<HTMLElement>(".hover-marquee");
}

function getMarqueeViewportWidth(label: HTMLElement, host: HTMLElement): number {
  let width = label.clientWidth;
  for (
    let ancestor = label.parentElement;
    ancestor && ancestor !== host;
    ancestor = ancestor.parentElement
  ) {
    const style = getComputedStyle(ancestor);
    if (style.overflowX !== "hidden" && style.overflowX !== "clip") {
      continue;
    }
    const padding =
      (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    width = Math.min(width, Math.max(0, ancestor.clientWidth - padding));
  }
  return width;
}

function clearPendingMarquee(label: HTMLElement): void {
  const pending = pendingMarquees.get(label);
  if (pending === undefined) {
    return;
  }
  window.cancelAnimationFrame(pending.frame);
  if (pending.timer !== undefined) {
    window.clearTimeout(pending.timer);
  }
  pendingMarquees.delete(label);
}

function formatCodexMarqueePoint(progress: number, timeSec: number, totalSec: number): string {
  return `${progress.toFixed(4)} ${((timeSec / totalSec) * 100).toFixed(4)}%`;
}

function codexMarqueeTiming(scrollDurationSec: number, totalSec: number): string {
  const points = Array.from({ length: CODEX_MARQUEE_SAMPLE_COUNT + 1 }, (_, index) => {
    const position = index / CODEX_MARQUEE_SAMPLE_COUNT;
    const inverse = 1 - position;
    const first = 3 * inverse ** 2 * position;
    const second = 3 * inverse * position ** 2;
    const third = position ** 3;
    const progress = first * CODEX_MARQUEE_CURVE.y1 + second * CODEX_MARQUEE_CURVE.y2 + third;
    const time =
      CODEX_MARQUEE_DELAY_SEC +
      scrollDurationSec *
        (first * CODEX_MARQUEE_CURVE.x1 + second * CODEX_MARQUEE_CURVE.x2 + third);
    return formatCodexMarqueePoint(progress, time, totalSec);
  });
  return `linear(${[formatCodexMarqueePoint(0, 0, totalSec), ...points].join(", ")})`;
}

function startCodexHoverMarquee(label: HTMLElement): boolean {
  const content = label.querySelector<HTMLElement>("[data-hover-marquee-content]");
  if (!content) {
    return false;
  }
  const contentRectWidth = content.getBoundingClientRect().width;
  const contentWidth = contentRectWidth > 0 ? contentRectWidth : content.scrollWidth;
  const labelRectWidth = label.getBoundingClientRect().width;
  const viewportWidth = labelRectWidth > 0 ? labelRectWidth : label.clientWidth;
  const shift = contentWidth - viewportWidth;
  if (shift <= 1) {
    pendingMarquees.delete(label);
    return true;
  }

  const contentStyle = getComputedStyle(content);
  const parsedFontSize = Number.parseFloat(contentStyle.fontSize);
  const fontSize = Number.isFinite(parsedFontSize)
    ? parsedFontSize
    : CODEX_MARQUEE_FALLBACK_FONT_SIZE_PX;
  const parsedSpeed = Number.parseFloat(
    contentStyle.getPropertyValue("--marquee-speed-em-per-second"),
  );
  const speedEmPerSecond =
    Number.isFinite(parsedSpeed) && parsedSpeed > 0 ? parsedSpeed : CODEX_MARQUEE_SPEED_EM_PER_SEC;
  const scrollDurationSec = shift / (fontSize * speedEmPerSecond);
  const totalDurationSec = CODEX_MARQUEE_DELAY_SEC + scrollDurationSec;
  label.style.setProperty("--hover-marquee-shift", `${-shift}px`);
  label.style.setProperty("--hover-marquee-duration", `${totalDurationSec.toFixed(3)}s`);
  label.style.setProperty(
    "--hover-marquee-timing",
    codexMarqueeTiming(scrollDurationSec, totalDurationSec),
  );
  pendingMarquees.delete(label);
  label.classList.add("hover-marquee--scrolling");
  return true;
}

export function startHoverMarquee(host: HTMLElement): void {
  const label = findMarqueeLabel(host);
  if (
    !label ||
    label.classList.contains("hover-marquee--scrolling") ||
    pendingMarquees.has(label)
  ) {
    return;
  }
  // Catalog renders can reconnect refs while the pointer stays on the row.
  // Preserve this label's delay; keyed label replacements get fresh state.
  // Mouseenter fires before hover-only actions finish affecting layout. Measure
  // on the next frame so the marquee sees the width the user actually sees.
  const pending: PendingMarquee = {
    frame: window.requestAnimationFrame(() => {
      if (pendingMarquees.get(label) !== pending) {
        return;
      }
      if (label.dataset.hoverMarqueeMode === "codex" && startCodexHoverMarquee(label)) {
        return;
      }
      // A negative mid-transition indent (re-hover while snapping back) shrinks
      // scrollWidth; add it back when calculating the clipped distance.
      const indent = Number.parseFloat(getComputedStyle(label).textIndent) || 0;
      const shift = label.scrollWidth - indent - getMarqueeViewportWidth(label, host);
      if (shift <= 1) {
        pendingMarquees.delete(label);
        return;
      }
      const durationMs = Math.max(
        MARQUEE_MIN_DURATION_MS,
        Math.round((shift / MARQUEE_SPEED_PX_PER_SEC) * 1000),
      );
      label.style.setProperty("--hover-marquee-shift", `${-shift}px`);
      label.style.setProperty("--hover-marquee-duration", `${durationMs}ms`);
      // Keep quick pointer passes quiet; leaving before the timer fires cancels it.
      pending.timer = window.setTimeout(() => {
        pendingMarquees.delete(label);
        label.classList.add("hover-marquee--scrolling");
      }, MARQUEE_HOVER_DELAY_MS);
    }),
  };
  pendingMarquees.set(label, pending);
}

export function stopHoverMarquee(host: HTMLElement): void {
  const label = findMarqueeLabel(host);
  if (!label) {
    return;
  }
  clearPendingMarquee(label);
  label.classList.remove("hover-marquee--scrolling");
}

export function restartHoverMarqueeIfHovered(element: Element | undefined): void {
  if (!(element instanceof HTMLElement)) {
    return;
  }
  queueMicrotask(() => {
    const host = element.isConnected
      ? element.closest<HTMLElement>(".session-row-host")
      : undefined;
    if (host?.matches(":hover")) {
      startHoverMarquee(host);
    }
  });
}

export function startHoverMarqueeFromEvent(event: Event): void {
  if (event.currentTarget instanceof HTMLElement) {
    startHoverMarquee(event.currentTarget);
  }
}

export function stopHoverMarqueeFromEvent(event: Event): void {
  if (event.currentTarget instanceof HTMLElement) {
    stopHoverMarquee(event.currentTarget);
  }
}
