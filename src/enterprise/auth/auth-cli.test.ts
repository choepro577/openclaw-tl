import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeOpenClawStateDatabaseForTest } from "../../state/openclaw-state-db.js";
import { withOpenClawTestState } from "../../test-utils/openclaw-test-state.js";
import {
  createEnterpriseAccount,
  getEnterpriseAccountByUsername,
} from "../accounts/account-store.js";
import { registerEnterpriseAuthCli } from "./auth-cli.js";
import { hashEnterprisePassword, verifyEnterprisePassword } from "./password.js";

const promptMocks = vi.hoisted(() => ({
  info: vi.fn(),
  password: vi.fn(),
  success: vi.fn(),
  text: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  isCancel: () => false,
  log: { info: promptMocks.info, success: promptMocks.success },
  password: (options: unknown) => promptMocks.password(options),
  text: (options: unknown) => promptMocks.text(options),
}));

function createProgram(): Command {
  const program = new Command().name("openclaw").exitOverride();
  registerEnterpriseAuthCli(program);
  return program;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  closeOpenClawStateDatabaseForTest();
});

describe("Enterprise auth CLI", () => {
  it("resets an existing administrator password without deleting the account", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      const account = createEnterpriseAccount({
        username: "recovery.admin",
        displayName: "Recovery Admin",
        passwordHash: await hashEnterprisePassword("old-admin-password"),
        role: "administrator",
        mustChangePassword: false,
      });
      promptMocks.password
        .mockResolvedValueOnce("new-admin-password")
        .mockResolvedValueOnce("new-admin-password");

      await createProgram().parseAsync(["auth", "reset-admin-password", account.username], {
        from: "user",
      });

      const updated = getEnterpriseAccountByUsername(account.username);
      expect(updated?.id).toBe(account.id);
      expect(updated?.mustChangePassword).toBe(false);
      await expect(
        verifyEnterprisePassword("new-admin-password", updated?.passwordHash ?? ""),
      ).resolves.toBe(true);
      expect(promptMocks.success).toHaveBeenCalledWith(
        `Đã đặt lại mật khẩu cho administrator ${account.username}.`,
      );
    });
  });

  it("rejects accidental surrounding whitespace in a replacement password", async () => {
    await withOpenClawTestState({ scenario: "minimal", applyEnv: true }, async () => {
      createEnterpriseAccount({
        username: "admin",
        displayName: "Admin",
        passwordHash: await hashEnterprisePassword("old-admin-password"),
        role: "administrator",
      });
      promptMocks.password.mockResolvedValueOnce(" new-admin-password ");

      await expect(
        createProgram().parseAsync(["auth", "reset-admin-password"], { from: "user" }),
      ).rejects.toThrow("Mật khẩu không được có khoảng trắng ở đầu hoặc cuối.");
    });
  });
});
