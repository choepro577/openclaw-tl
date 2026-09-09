// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import {
  eaa,
  enterpriseAdminPresetDescription,
  enterpriseAdminPresetLabel,
} from "./enterprise-admin-accounts.ts";
import { i18n } from "./index.ts";

describe("enterprise admin account copy", () => {
  afterEach(async () => {
    await i18n.setLocale("en");
  });

  it("translates account copy and interpolates values in both locales", async () => {
    await i18n.setLocale("en");
    expect(eaa("createDialogDescription", { step: "2" })).toContain("Step 2/2");
    expect(enterpriseAdminPresetLabel("basic@1", "server label")).toBe("Basic access");

    await i18n.setLocale("vi");
    expect(eaa("createDialogDescription", { step: "2" })).toContain("Bước 2/2");
    expect(enterpriseAdminPresetDescription("standard-coding@1", "server description")).toBe(
      "Đọc, ghi, sửa file và chạy lệnh trong sandbox.",
    );
  });

  it("keeps unknown server preset labels and descriptions intact", async () => {
    await i18n.setLocale("en");
    expect(enterpriseAdminPresetLabel("custom@1", "Custom server label")).toBe(
      "Custom server label",
    );
    expect(enterpriseAdminPresetDescription("custom@1", "Custom server description")).toBe(
      "Custom server description",
    );
  });
});
