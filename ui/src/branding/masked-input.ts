import { maskEngineName } from "./display-brand.ts";

/** Marker used by the display projection to ignore presentation-only DOM. */
export const MASKED_INPUT_OVERLAY_ATTRIBUTE = "data-maap-input-overlay";
export const MASKED_INPUT_TARGET_CLASS = "maap-masked-input-target";

const MASKED_INPUT_OVERLAY_SELECTOR = `[${MASKED_INPUT_OVERLAY_ATTRIBUTE}]`;
const TEXT_INPUT_TYPES = new Set(["", "text", "search", "url", "email", "tel"]);
const OVERLAY_STYLE_PROPERTIES = [
  "box-sizing",
  "font",
  "font-family",
  "font-size",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "font-feature-settings",
  "font-kerning",
  "font-variation-settings",
  "letter-spacing",
  "line-height",
  "tab-size",
  "text-align",
  "text-indent",
  "text-rendering",
  "text-transform",
  "word-break",
  "word-spacing",
  "overflow-wrap",
  "white-space",
  "direction",
  "writing-mode",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-radius",
] as const;

type NativeTextControl = HTMLInputElement | HTMLTextAreaElement;

type DisplaySource = {
  text: string;
  placeholder: boolean;
};

type MaskedInputState = {
  target: NativeTextControl;
  overlay: HTMLDivElement;
  onInput: () => void;
  onScroll: () => void;
  onWindowScroll: () => void;
  onResize: () => void;
  resizeObserver: ResizeObserver | null;
};

const states = new Map<NativeTextControl, MaskedInputState>();

function isNativeTextControl(element: Element): element is NativeTextControl {
  if (element.tagName === "TEXTAREA") {
    return true;
  }
  if (element.tagName !== "INPUT") {
    return false;
  }
  const type = (element.getAttribute("type") ?? "").trim().toLowerCase();
  return TEXT_INPUT_TYPES.has(type);
}

function isOverlayElement(element: Element): boolean {
  return Boolean(element.closest(MASKED_INPUT_OVERLAY_SELECTOR));
}

function isMaskedInputTarget(element: Element): element is NativeTextControl {
  return !isOverlayElement(element) && isNativeTextControl(element);
}

function displaySource(target: NativeTextControl): DisplaySource {
  if (target.value) {
    return { text: target.value, placeholder: false };
  }
  return { text: target.placeholder, placeholder: true };
}

function computedStyleFor(target: NativeTextControl, pseudo?: string): CSSStyleDeclaration | null {
  const view = target.ownerDocument.defaultView;
  if (!view) {
    return null;
  }
  try {
    return view.getComputedStyle(target, pseudo);
  } catch {
    return null;
  }
}

function copyTargetStyles(
  target: NativeTextControl,
  overlay: HTMLDivElement,
  source: DisplaySource,
): void {
  const styles = {
    target: computedStyleFor(target),
    placeholder: source.placeholder ? computedStyleFor(target, "::placeholder") : null,
  };
  for (const property of OVERLAY_STYLE_PROPERTIES) {
    const value = styles.target?.getPropertyValue(property);
    if (value) {
      overlay.style.setProperty(property, value);
    }
  }
  const color = styles.placeholder?.getPropertyValue("color") || styles.target?.color;
  if (color) {
    overlay.style.color = color;
  }
  const opacity = styles.placeholder?.getPropertyValue("opacity") || styles.target?.opacity;
  if (opacity) {
    overlay.style.opacity = opacity;
  }
  overlay.style.whiteSpace = target instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";
}

function composedParent(element: Element): Element | null {
  if (element.assignedSlot) {
    return element.assignedSlot;
  }
  if (element.parentElement) {
    return element.parentElement;
  }
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

function overlayParent(target: NativeTextControl): HTMLElement {
  let parent = composedParent(target);
  while (parent) {
    if (parent instanceof HTMLDialogElement) {
      return parent;
    }
    parent = composedParent(parent);
  }
  return target.ownerDocument.body;
}

function appendOverlay(target: NativeTextControl, overlay: HTMLDivElement): void {
  overlayParent(target).append(overlay);
}

function createOverlay(target: NativeTextControl): HTMLDivElement {
  const overlay = target.ownerDocument.createElement("div");
  overlay.setAttribute(MASKED_INPUT_OVERLAY_ATTRIBUTE, "");
  overlay.className = "maap-masked-input-overlay";
  overlay.style.background = "transparent";
  overlay.style.borderColor = "transparent";
  overlay.style.borderStyle = "solid";
  overlay.style.contain = "paint";
  overlay.style.overflow = "hidden";
  overlay.style.pointerEvents = "none";
  overlay.style.position = "fixed";
  overlay.style.userSelect = "none";
  // Keep the mirror above the native control and inside the normal app chrome.
  // It has no hit area and only paints the control's own text rectangle.
  overlay.style.zIndex = "1";
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("role", "presentation");
  appendOverlay(target, overlay);
  return overlay;
}

function syncGeometry(state: MaskedInputState): void {
  const target = state.target;
  const overlay = state.overlay;
  const rect = target.getBoundingClientRect();
  const parent = overlayParent(target);
  if (overlay.parentNode !== parent) {
    parent.append(overlay);
  }
  const modal = parent instanceof HTMLDialogElement;
  const parentRect = parent.getBoundingClientRect();
  overlay.style.position = modal ? "absolute" : "fixed";
  overlay.style.left = `${rect.left - (modal ? parentRect.left + parent.clientLeft - parent.scrollLeft : 0)}px`;
  overlay.style.top = `${rect.top - (modal ? parentRect.top + parent.clientTop - parent.scrollTop : 0)}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.scrollLeft = target.scrollLeft;
  overlay.scrollTop = target.scrollTop;
  // The mirror must not escape a scrolling drawer or paint above another panel.
  const viewport = target.ownerDocument.documentElement;
  let left = Math.max(0, rect.left);
  let right = Math.min(viewport.clientWidth, rect.right);
  let top = Math.max(0, rect.top);
  let bottom = Math.min(viewport.clientHeight, rect.bottom);
  let stacking = 1;
  for (let ancestor = composedParent(target); ancestor; ancestor = composedParent(ancestor)) {
    const style = target.ownerDocument.defaultView?.getComputedStyle(ancestor);
    const bounds = ancestor.getBoundingClientRect();
    stacking = Math.max(stacking, Number(style?.zIndex) || 0);
    if (/auto|scroll|hidden|clip/.test(style?.overflowX ?? "")) {
      left = Math.max(left, bounds.left + ancestor.clientLeft);
      right = Math.min(right, bounds.left + ancestor.clientLeft + ancestor.clientWidth);
    }
    if (/auto|scroll|hidden|clip/.test(style?.overflowY ?? "")) {
      top = Math.max(top, bounds.top + ancestor.clientTop);
      bottom = Math.min(bottom, bounds.top + ancestor.clientTop + ancestor.clientHeight);
    }
  }
  overlay.style.zIndex = String(stacking);
  overlay.style.clipPath = `inset(${Math.max(0, top - rect.top)}px ${Math.max(0, rect.right - right)}px ${Math.max(0, rect.bottom - bottom)}px ${Math.max(0, left - rect.left)}px)`;
}

function disposeMaskedInput(target: NativeTextControl): void {
  const state = states.get(target);
  if (!state) {
    target.classList.remove(MASKED_INPUT_TARGET_CLASS);
    return;
  }
  states.delete(target);
  state.resizeObserver?.disconnect();
  target.removeEventListener("input", state.onInput);
  target.removeEventListener("change", state.onInput);
  target.removeEventListener("scroll", state.onScroll);
  const view = target.ownerDocument.defaultView;
  view?.removeEventListener("scroll", state.onWindowScroll, true);
  view?.removeEventListener("resize", state.onResize);
  state.overlay.remove();
  target.classList.remove(MASKED_INPUT_TARGET_CLASS);
}

function ensureState(target: NativeTextControl): MaskedInputState {
  const previous = states.get(target);
  if (previous) {
    return previous;
  }
  const overlay = createOverlay(target);
  const onInput = () => syncMaskedInput(target);
  const onScroll = () => syncGeometry(state);
  const onWindowScroll = () => syncGeometry(state);
  const onResize = () => syncGeometry(state);
  const state: MaskedInputState = {
    target,
    overlay,
    onInput,
    onScroll,
    onWindowScroll,
    onResize,
    resizeObserver: null,
  };
  states.set(target, state);
  target.addEventListener("input", onInput);
  target.addEventListener("change", onInput);
  target.addEventListener("scroll", onScroll, { passive: true });
  const view = target.ownerDocument.defaultView;
  view?.addEventListener("scroll", onWindowScroll, { capture: true, passive: true });
  view?.addEventListener("resize", onResize, { passive: true });
  if (typeof ResizeObserver === "function") {
    state.resizeObserver = new ResizeObserver(() => syncGeometry(state));
    state.resizeObserver.observe(target);
  }
  return state;
}

/**
 * Paint a masked mirror for one native text control without changing its
 * value, selection, attributes, or form submission payload.
 */
export function syncMaskedInput(element: Element): void {
  if (!isMaskedInputTarget(element)) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      disposeMaskedInput(element);
    }
    return;
  }
  const source = displaySource(element);
  if (!/openclaw/iu.test(source.text)) {
    disposeMaskedInput(element);
    return;
  }
  const state = ensureState(element);
  const display = maskEngineName(source.text);
  if (state.overlay.textContent !== display) {
    state.overlay.textContent = display;
  }
  state.overlay.dataset.placeholder = source.placeholder ? "true" : "false";
  copyTargetStyles(element, state.overlay, source);
  element.classList.add(MASKED_INPUT_TARGET_CLASS);
  syncGeometry(state);
}

/** Remove mirrors for controls detached by a Lit render or route change. */
export function releaseDetachedMaskedInputs(): void {
  for (const target of states.keys()) {
    if (!target.isConnected) {
      disposeMaskedInput(target);
    }
  }
}
