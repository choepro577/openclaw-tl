import { formatErrorMessage } from "../infra/errors.js";
import { redactSensitiveText } from "../logging/redact.js";

export function observerError(error: unknown) {
  const record = error && typeof error === "object" ? error : undefined;
  const clean = (value: string) => redactSensitiveText(value, { mode: "tools" }).slice(0, 1_024);
  return {
    name: clean(error instanceof Error ? error.name : typeof error),
    message: clean(formatErrorMessage(error)),
    ...(record &&
    "code" in record &&
    (typeof record.code === "string" || typeof record.code === "number")
      ? { code: clean(String(record.code)) }
      : {}),
  };
}
