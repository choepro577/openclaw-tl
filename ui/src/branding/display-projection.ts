import { maskEngineName } from "./display-brand.ts";
import { syncMaskedInput, releaseDetachedMaskedInputs } from "./masked-input.ts";

// Keep the source alongside the rendered text, without adding it to the visible DOM.
// Copy actions that already close over their source or use data-* need no adaptation.
const textSources = new WeakMap<Text, { source: string; display: string }>();
const derivedOptionLabels = new WeakMap<HTMLOptionElement, string>();
const observedRoots = new WeakMap<Node, MutationObserver>();
const presentationAttributes = [
  "title",
  "alt",
  "aria-label",
  "aria-description",
  "aria-valuetext",
  "placeholder",
];
const observedAttributes = [
  ...presentationAttributes,
  "type",
  "value",
  "label",
  "data-theme-mode",
  "data-theme",
];
const excludedElements = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "TEMPLATE"]);
const inlineElements = new Set([
  "A",
  "ABBR",
  "B",
  "BDI",
  "BDO",
  "CODE",
  "DEL",
  "EM",
  "I",
  "KBD",
  "MARK",
  "S",
  "SMALL",
  "SPAN",
  "STRONG",
  "SUB",
  "SUP",
  "TIME",
  "U",
]);

function sourceText(node: Text): string {
  const previous = textSources.get(node);
  return previous?.display === node.data ? previous.source : node.data;
}

/** Used by DOM-backed Copy controls; normal action payloads remain untouched. */
export function originalDisplayText(root: Node): string {
  if (root.nodeType === Node.TEXT_NODE) {
    return sourceText(root as Text);
  }
  return Array.from(root.childNodes, originalDisplayText).join("");
}

function projectRun(nodes: Text[]): void {
  const sources = nodes.map(sourceText);
  const raw = sources.join("");
  if (!/openclaw/i.test(raw) && !nodes.some((node) => textSources.has(node))) {
    return;
  }
  // Match across highlighting spans (e.g. <span>open</span><span>claw</span>).
  // Remove the eighth character at its original offset, keeping all other spans intact.
  const chars = raw.split("");
  for (const match of raw.matchAll(/openclaw/gi)) {
    for (let i = 0; i < 8; i += 1) {
      chars[match.index + i] = i === 7 ? "" : "*";
    }
  }
  let offset = 0;
  nodes.forEach((node, index) => {
    const source = sources[index] ?? "";
    const display = chars.slice(offset, offset + source.length).join("");
    offset += source.length;
    if (node.data !== display) {
      if (source === display) {
        textSources.delete(node);
      } else {
        textSources.set(node, { source, display });
      }
      node.data = display;
    }
  });
}

function projectAttributes(element: Element): void {
  for (const name of presentationAttributes) {
    const value = element.getAttribute(name);
    if (value && /openclaw/i.test(value)) {
      element.setAttribute(name, maskEngineName(value));
    }
  }
}

/** Runs after a Lit commit, before paint; leaves ids, href/src, data-* and values alone. */
function projectSurface(root: Node): void {
  const owner = root instanceof Element ? root : root.parentElement;
  if (
    owner?.closest(
      '.cm-content, [contenteditable]:not([contenteditable="false"]), [data-maap-input-overlay]',
    )
  ) {
    return;
  }
  let run: Text[] = [];
  const flush = () => {
    projectRun(run);
    run = [];
  };
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      run.push(node as Text);
      return;
    }
    if (node instanceof Element) {
      if (node.hasAttribute("data-maap-input-overlay")) {
        return;
      }
      projectAttributes(node);
      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
        syncMaskedInput(node);
      }
      // The native option label is presentation; its text can be the submitted value.
      if (node instanceof HTMLOptionElement) {
        const attribute = node.getAttribute("label");
        const derived = attribute === null || attribute === derivedOptionLabels.get(node);
        const label = derived ? node.text : (attribute ?? node.text);
        const display = maskEngineName(label);
        if (display !== label) {
          if (derived) {
            derivedOptionLabels.set(node, display);
          }
          if (display !== attribute) {
            node.label = display;
          }
        } else if (derivedOptionLabels.has(node)) {
          node.removeAttribute("label");
          derivedOptionLabels.delete(node);
        }
        flush();
        return;
      }
      if (
        excludedElements.has(node.tagName) ||
        node.matches('.cm-content, [contenteditable]:not([contenteditable="false"])')
      ) {
        flush();
        return;
      }
      if (node.shadowRoot) {
        observeDisplayRoot(node.shadowRoot);
        projectDisplay(node.shadowRoot);
      }
      const block = !inlineElements.has(node.tagName);
      if (block) {
        flush();
      }
      node.childNodes.forEach(visit);
      if (block) {
        flush();
      }
      return;
    }
    node.childNodes.forEach(visit);
  };
  visit(root);
  flush();
}

function projectionBoundary(root: Node): Node | null {
  const tree = root.getRootNode();
  return tree instanceof Document ? tree.documentElement : tree instanceof ShadowRoot ? tree : null;
}

function inlineOwner(node: Node): Node {
  let owner = node.nodeType === Node.TEXT_NODE ? (node.parentNode ?? node) : node;
  while (owner instanceof Element && inlineElements.has(owner.tagName) && owner.parentNode) {
    owner = owner.parentNode;
  }
  return owner;
}

function dirtySurfaces(records: MutationRecord[]): Node[] {
  const roots = new Set<Node>();
  for (const record of records) {
    // Projection writes happen while disconnected. Every observed character
    // write is therefore new source, even if it equals the previous mask.
    if (record.type === "characterData") {
      textSources.delete(record.target as Text);
    }
    roots.add(inlineOwner(record.target));
  }
  return [...roots];
}

const observerOptions: MutationObserverInit = {
  subtree: true,
  childList: true,
  characterData: true,
  attributes: true,
  attributeFilter: observedAttributes,
};

/** Synchronous post-commit projection; observers never see our own display writes. */
export function projectDisplay(root: Node): void {
  const boundary = projectionBoundary(root);
  if (boundary) {
    observeDisplayRoot(boundary);
  }
  const observer = boundary ? observedRoots.get(boundary) : undefined;
  const pending = observer ? dirtySurfaces(observer.takeRecords()) : [];
  observer?.disconnect();
  try {
    const roots = [...new Set([root, ...pending])];
    for (const candidate of roots) {
      if (candidate !== root && !candidate.isConnected) {
        continue;
      }
      if (roots.some((parent) => parent !== candidate && parent.contains(candidate))) {
        continue;
      }
      projectSurface(candidate);
    }
    releaseDetachedMaskedInputs();
  } finally {
    if (observer && boundary) {
      observer.observe(boundary, observerOptions);
    }
  }
}

/** One observer per document/shadow tree covers portals and imperative updates. */
export function observeDisplayRoot(root: Node): void {
  const boundary = projectionBoundary(root);
  if (!boundary || observedRoots.has(boundary)) {
    return;
  }
  const observer = new MutationObserver((records) => {
    const roots = dirtySurfaces(records);
    for (const candidate of roots) {
      if (
        candidate.isConnected &&
        !roots.some((parent) => parent !== candidate && parent.contains(candidate))
      ) {
        projectDisplay(candidate);
      }
    }
    releaseDetachedMaskedInputs();
  });
  observer.observe(boundary, observerOptions);
  observedRoots.set(boundary, observer);
  const syncControl = (event: Event) => {
    const target = event.composedPath()[0];
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      syncMaskedInput(target);
    }
  };
  boundary.addEventListener("input", syncControl, true);
  boundary.addEventListener("change", syncControl, true);
}
