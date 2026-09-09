import {
  CONTROL_UI_ENVIRONMENT_ATTRIBUTE,
  type ControlUiEnvironment,
} from "../../../src/gateway/control-ui-bootstrap-contract.js";
import { maskEngineName } from "../branding/display-brand.ts";
import { applyControlUiOperatorSeamColor } from "./control-ui-presentation.ts";

export function applyControlUiPresentation(params: {
  environment: ControlUiEnvironment | null;
  seamColor?: string;
}): void {
  applyControlUiOperatorSeamColor(params.seamColor);
  const root = document.documentElement;
  const environment = params.environment;
  if (!environment) {
    const previous = root.getAttribute(CONTROL_UI_ENVIRONMENT_ATTRIBUTE);
    if (previous) {
      const previousEnvironment: ControlUiEnvironment = JSON.parse(previous);
      const suffix = ` · ${maskEngineName(previousEnvironment.label)}`;
      if (document.title.endsWith(suffix)) {
        document.title = document.title.slice(0, -suffix.length);
      }
    }
    root.removeAttribute(CONTROL_UI_ENVIRONMENT_ATTRIBUTE);
    root.style.removeProperty("--control-ui-environment-color");
    root.style.removeProperty("--control-ui-environment-ink");
    document.querySelector(".control-ui-environment-stripe")?.remove();
    for (const icon of document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"][data-openclaw-original-favicon]',
    )) {
      const original: [string | null, string | null] = JSON.parse(
        icon.dataset.openclawOriginalFavicon!,
      );
      for (const [attribute, value] of [
        ["href", original[0]],
        ["type", original[1]],
      ] as const) {
        if (value === null) {
          icon.removeAttribute(attribute);
        } else {
          icon.setAttribute(attribute, value);
        }
      }
      delete icon.dataset.openclawOriginalFavicon;
    }
    return;
  }
  root.setAttribute(CONTROL_UI_ENVIRONMENT_ATTRIBUTE, JSON.stringify(environment));
  root.style.setProperty(
    "--control-ui-environment-color",
    `var(--control-ui-environment-${environment.color})`,
  );
  root.style.setProperty(
    "--control-ui-environment-ink",
    `var(--control-ui-environment-${environment.color}-ink)`,
  );
  if (!document.querySelector(".control-ui-environment-stripe")) {
    const stripe = document.createElement("div");
    stripe.className = "control-ui-environment-stripe";
    stripe.setAttribute("aria-hidden", "true");
    document.body.prepend(stripe);
  }
  const displayEnvironmentLabel = maskEngineName(environment.label);
  if (!document.title.endsWith(` · ${displayEnvironmentLabel}`)) {
    document.title = `${document.title} · ${displayEnvironmentLabel}`;
  }

  const color = getComputedStyle(root)
    .getPropertyValue(`--control-ui-environment-${environment.color}`)
    .trim();
  if (!color) {
    return;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect x="4" y="4" width="112" height="112" rx="28" fill="#0F172A"/><path d="M60 22L91 40V78L60 98L29 78V40L60 22ZM60 60L60 22M60 60L91 40M60 60L91 78M60 60L60 98M60 60L29 78M60 60L29 40" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/><circle cx="60" cy="60" r="10" fill="#0F172A" stroke="${color}" stroke-width="3"/><circle cx="60" cy="60" r="4" fill="#F8FAFC"/><circle cx="60" cy="22" r="5.5" fill="${color}"/><circle cx="91" cy="40" r="5.5" fill="${color}"/><circle cx="91" cy="78" r="5.5" fill="${color}"/><circle cx="60" cy="98" r="5.5" fill="${color}"/><circle cx="29" cy="78" r="5.5" fill="${color}"/><circle cx="29" cy="40" r="5.5" fill="${color}"/></svg>`;
  for (const icon of document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')) {
    icon.dataset.openclawOriginalFavicon ??= JSON.stringify([
      icon.getAttribute("href"),
      icon.getAttribute("type"),
    ]);
    icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    icon.type = "image/svg+xml";
  }
}
