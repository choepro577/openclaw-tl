import { applyControlUiAccent } from "../../app/control-ui-presentation.ts";
import {
  normalizeAccentColor,
  normalizeTextScale,
  type TextScaleStop,
} from "../../app/settings.ts";
import {
  parseThemeSelection,
  resolveTheme,
  type ThemeMode,
  type ThemeName,
} from "../../app/theme.ts";

const STORAGE_KEY = "openclaw.enterprise.admin.appearance.v1";
export const ADMIN_APPEARANCE_EVENT = "openclaw-enterprise-admin-appearance-change";

export type AdminAppearance = {
  theme: Exclude<ThemeName, "custom">;
  mode: ThemeMode;
  accent?: string;
  textScale: TextScaleStop;
};

const DEFAULT_APPEARANCE: AdminAppearance = {
  theme: "claw",
  mode: "system",
  textScale: 100,
};

export function loadAdminAppearance(): AdminAppearance {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? "null") as Record<
      string,
      unknown
    > | null;
    if (!parsed) {
      return { ...DEFAULT_APPEARANCE };
    }
    const selection = parseThemeSelection(parsed.theme, parsed.mode);
    return {
      theme: selection.theme === "custom" ? "claw" : selection.theme,
      mode: selection.mode,
      ...(normalizeAccentColor(parsed.accent)
        ? { accent: normalizeAccentColor(parsed.accent) }
        : {}),
      textScale: normalizeTextScale(parsed.textScale),
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function applyAdminAppearance(settings: AdminAppearance): void {
  const root = document.documentElement;
  const resolved = resolveTheme(settings.theme, settings.mode);
  const resolvedMode = resolved.endsWith("light") || resolved === "light" ? "light" : "dark";
  root.dataset.theme = resolved;
  root.dataset.themeMode = resolvedMode;
  root.dataset.themeResolved = resolvedMode;
  root.classList.toggle("wa-light", resolvedMode === "light");
  root.classList.toggle("wa-dark", resolvedMode === "dark");
  root.style.colorScheme = resolvedMode;
  root.style.setProperty("--control-ui-text-scale", String(settings.textScale / 100));
  applyControlUiAccent(settings.accent);
}

export function saveAdminAppearance(next: AdminAppearance): AdminAppearance {
  const normalized: AdminAppearance = {
    theme: next.theme === "knot" || next.theme === "dash" ? next.theme : "claw",
    mode: next.mode === "light" || next.mode === "dark" ? next.mode : "system",
    ...(normalizeAccentColor(next.accent) ? { accent: normalizeAccentColor(next.accent) } : {}),
    textScale: normalizeTextScale(next.textScale),
  };
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(normalized));
  applyAdminAppearance(normalized);
  globalThis.dispatchEvent(new CustomEvent(ADMIN_APPEARANCE_EVENT, { detail: normalized }));
  return normalized;
}

export function resetAdminAppearance(): AdminAppearance {
  globalThis.localStorage?.removeItem(STORAGE_KEY);
  return saveAdminAppearance({ ...DEFAULT_APPEARANCE });
}

export function beginAdminAppearanceScope(): () => void {
  const root = document.documentElement;
  const previous = {
    theme: root.getAttribute("data-theme"),
    themeMode: root.getAttribute("data-theme-mode"),
    themeResolved: root.getAttribute("data-theme-resolved"),
    className: root.className,
    style: root.getAttribute("style"),
  };
  const apply = () => applyAdminAppearance(loadAdminAppearance());
  const media = globalThis.matchMedia?.("(prefers-color-scheme: light)");
  const onMedia = () => {
    if (loadAdminAppearance().mode === "system") {
      apply();
    }
  };
  media?.addEventListener("change", onMedia);
  apply();
  return () => {
    media?.removeEventListener("change", onMedia);
    // Clear the module-level Admin accent override before restoring the exact
    // application root style snapshot captured on entry.
    applyControlUiAccent(undefined);
    for (const [name, value] of [
      ["data-theme", previous.theme],
      ["data-theme-mode", previous.themeMode],
      ["data-theme-resolved", previous.themeResolved],
    ] as const) {
      if (value === null) {
        root.removeAttribute(name);
      } else {
        root.setAttribute(name, value);
      }
    }
    root.className = previous.className;
    if (previous.style === null) {
      root.removeAttribute("style");
    } else {
      root.setAttribute("style", previous.style);
    }
  };
}

export const testApi = { STORAGE_KEY, DEFAULT_APPEARANCE };
