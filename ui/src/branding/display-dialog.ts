import { maskEngineName } from "./display-brand.ts";

/**
 * Present a native alert with product-engine names masked in its message.
 *
 * The wrapper deliberately owns only the message argument. Native dialogs
 * return no user data for alerts, and keeping the call here makes the
 * presentation boundary explicit without replacing the browser's global
 * dialog functions.
 */
export function showNativeAlert(message?: string): void {
  if (message === undefined) {
    globalThis.alert();
    return;
  }
  globalThis.alert(maskEngineName(message));
}

/** Present a native confirm with a masked message and the original decision. */
export function showNativeConfirm(message?: string): boolean {
  if (message === undefined) {
    return globalThis.confirm();
  }
  return globalThis.confirm(maskEngineName(message));
}

/**
 * Present a native prompt with a masked message while preserving the exact
 * default and returned value. Callers that require an exact technical token
 * can put the source token in `defaultValue`, where the browser keeps it
 * editable and copyable; it is intentionally never passed through the mask.
 */
export function showNativePrompt(message?: string, defaultValue?: string): string | null {
  if (message === undefined) {
    return defaultValue === undefined
      ? globalThis.prompt()
      : globalThis.prompt(undefined, defaultValue);
  }
  const maskedMessage = maskEngineName(message);
  return defaultValue === undefined
    ? globalThis.prompt(maskedMessage)
    : globalThis.prompt(maskedMessage, defaultValue);
}
