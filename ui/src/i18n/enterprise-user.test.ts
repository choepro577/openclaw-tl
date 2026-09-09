// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { enterpriseUserChatCopy } from "./enterprise-user-chat.ts";
import { eu, euKnowledgeValue } from "./enterprise-user.ts";
import { i18n } from "./index.ts";

describe("enterprise user copy", () => {
  afterEach(async () => {
    await i18n.setLocale("en");
  });

  it("translates stable Knowledge values and preserves unknown server values", async () => {
    await i18n.setLocale("en");
    expect(euKnowledgeValue("zone_build")).toBe("Knowledge zone build");
    expect(euKnowledgeValue("file")).toBe("File");
    expect(euKnowledgeValue("future_server_state")).toBe("future_server_state");
    expect(eu("knowledgeCandidatePublish")).toBe("Publish candidate");

    await i18n.setLocale("vi");
    expect(eu("knowledgeGraph")).toBe("Bản đồ tri thức");
    expect(euKnowledgeValue("zone_build")).toBe("Xây dựng vùng tri thức");
    expect(euKnowledgeValue("file")).toBe("Tệp");
    expect(eu("knowledgeCandidatePublish")).toBe("Xuất bản candidate");
  });

  it("keeps chat copy reactive to the shared locale manager", async () => {
    await i18n.setLocale("en");
    expect(enterpriseUserChatCopy("welcomeHint")).toBe("Type a message to start a conversation.");

    await i18n.setLocale("vi");
    expect(enterpriseUserChatCopy("welcomeHint")).toBe("Nhập nội dung để bắt đầu hội thoại.");
  });
});
