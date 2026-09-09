import { afterEach, describe, expect, it } from "vitest";
import {
  enterpriseUserChatCardCopy,
  type EnterpriseUserChatCardKey,
} from "./enterprise-user-chat.ts";
import { i18n } from "./index.ts";
import type { TranslationMap } from "./lib/types.ts";
import { en } from "./locales/en.ts";

function flattenStrings(value: unknown, prefix: string): Array<{ key: string; source: string }> {
  if (typeof value === "string") {
    return [{ key: prefix, source: value }];
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => flattenStrings(child, `${prefix}.${key}`));
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/gu)].map((match) => match[1] ?? "").toSorted();
}

function namespace(value: string | TranslationMap | undefined, path: string): TranslationMap {
  if (!value || typeof value === "string") {
    throw new Error(`Expected translation namespace at ${path}`);
  }
  return value;
}

const chat = namespace(en["chat"], "chat");
const toolCards = namespace(chat["toolCards"], "chat.toolCards");
const modelControls = namespace(chat["modelControls"], "chat.modelControls");
const messages = namespace(chat["messages"], "chat.messages");
const permissionControls = namespace(chat["permissionControls"], "chat.permissionControls");
const canonical = [
  ...flattenStrings(
    namespace(toolCards["knowledge"], "chat.toolCards.knowledge"),
    "chat.toolCards.knowledge",
  ),
  ...flattenStrings(
    namespace(toolCards["delegation"], "chat.toolCards.delegation"),
    "chat.toolCards.delegation",
  ),
  ...flattenStrings(
    {
      modelControls: {
        contextWindowAria: modelControls["contextWindowAria"],
        contextWindow: modelControls["contextWindow"],
      },
      messages: { tooLargeToDisplay: messages["tooLargeToDisplay"] },
      permissionControls: { help: permissionControls["help"] },
    },
    "chat",
  ),
];

afterEach(async () => {
  await i18n.setLocale("en");
});

describe("enterprise user chat local catalog", () => {
  it("covers the canonical English keys with matching placeholders in Vietnamese", async () => {
    await i18n.setLocale("vi");
    for (const entry of canonical) {
      const key = entry.key as EnterpriseUserChatCardKey;
      const value = enterpriseUserChatCardCopy(key);
      expect(placeholders(value), key).toEqual(placeholders(entry.source));
    }
  });

  it("interpolates Vietnamese card and shared chat copy", async () => {
    await i18n.setLocale("vi");
    expect(
      enterpriseUserChatCardCopy("chat.toolCards.knowledge.referenceMany", { count: "3" }),
    ).toBe("Tìm thấy 3 tham chiếu");
    expect(
      enterpriseUserChatCardCopy("chat.modelControls.contextWindowAria", { state: "đầy" }),
    ).toBe("Cửa sổ ngữ cảnh: đầy");
  });
});
