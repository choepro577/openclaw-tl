import { asNullableObjectRecord as readRecord } from "@openclaw/normalization-core/record-coerce";

export const USER_VISIBLE_URL_PATHS_FIELD = "__openclawUserVisibleUrlPaths";

const URL_PLACEHOLDER = (index: number) => `\u0000openclaw-user-visible-url-${index}\u0000`;

function urlAtPath(value: unknown, path: string): string | undefined {
  let current = value;
  for (const key of path.split(".")) {
    const record = readRecord(current);
    if (!record || !Object.hasOwn(record, key)) {
      return undefined;
    }
    current = record[key];
  }
  if (typeof current !== "string") {
    return undefined;
  }
  try {
    const url = new URL(current);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password
      ? current
      : undefined;
  } catch {
    return undefined;
  }
}

/** Only host-declared skill-script result paths may expose bearer URLs to the user. */
export function declaredUserVisibleToolUrls(
  toolName: string,
  details: unknown,
  outputText?: string,
): string[] {
  if (toolName !== "skill_script") {
    return [];
  }
  const paths = readRecord(details)?.[USER_VISIBLE_URL_PATHS_FIELD];
  if (!Array.isArray(paths)) {
    return [];
  }
  let textResult: unknown;
  if (outputText?.startsWith("{")) {
    try {
      textResult = JSON.parse(outputText);
    } catch {
      // Structured details remain the source when text is not JSON.
    }
  }
  return [
    ...new Set(
      paths.flatMap((path) => {
        if (
          typeof path !== "string" ||
          !/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/u.test(path)
        ) {
          return [];
        }
        const url = urlAtPath(details, path) ?? urlAtPath(textResult, path);
        return url ? [url] : [];
      }),
    ),
  ];
}

export function protectUserVisibleUrls(text: string, urls: readonly string[]): string {
  return urls.reduce((value, url, index) => value.replaceAll(url, URL_PLACEHOLDER(index)), text);
}

export function restoreUserVisibleUrls(text: string, urls: readonly string[]): string {
  return urls.reduce((value, url, index) => value.replaceAll(URL_PLACEHOLDER(index), url), text);
}
