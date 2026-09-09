// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { enterpriseDomainCopy, type EnterpriseDomainKey } from "./enterprise-domain.ts";
import { i18n } from "./index.ts";
import { en } from "./locales/en.ts";

const namespaces = ["enterpriseKnowledge", "enterpriseDelegation"] as const;

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/gu)].map((match) => match[1]).toSorted();
}

describe("enterprise domain copy", () => {
  afterEach(async () => {
    await i18n.setLocale("en");
  });

  it("keeps Vietnamese values complete and placeholders aligned with English", async () => {
    await i18n.setLocale("en");
    const englishValues = new Map<string, string>();
    for (const namespace of namespaces) {
      const english = en[namespace] as Record<string, string>;
      for (const key of Object.keys(english)) {
        const domainKey = `${namespace}.${key}` as EnterpriseDomainKey;
        englishValues.set(domainKey, enterpriseDomainCopy(domainKey));
      }
    }

    await i18n.setLocale("vi");
    for (const [domainKey, englishValue] of englishValues) {
      const vietnameseValue = enterpriseDomainCopy(domainKey as EnterpriseDomainKey);
      expect(vietnameseValue).not.toBe(domainKey);
      expect(placeholders(vietnameseValue)).toEqual(placeholders(englishValue));
    }
  });

  it("resolves both locales through the shared i18n manager", async () => {
    await i18n.setLocale("en");
    expect(
      enterpriseDomainCopy("enterpriseKnowledge.rollbackDescription", {
        number: "3",
        zone: "HR",
      }),
    ).toBe("Reactivate publication #3 for HR?");

    await i18n.setLocale("vi");
    expect(
      enterpriseDomainCopy("enterpriseKnowledge.rollbackDescription", {
        number: "3",
        zone: "HR",
      }),
    ).toBe("Kích hoạt lại bản công bố #3 cho HR?");
  });
});
