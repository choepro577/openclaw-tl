// CLI bootstrap for the first Enterprise administrator.
import { isCancel, log, password, text } from "@clack/prompts";
import type { Command } from "commander";
import {
  stylePromptMessage,
  stylePromptTitle,
} from "../../../packages/terminal-core/src/prompt-style.js";
import { readConfigFileSnapshot, writeConfigFile } from "../../config/config.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import {
  countEnterpriseAdministrators,
  createEnterpriseAccount,
  deleteEnterpriseAccountForBootstrapRollback,
} from "../accounts/account-store.js";
import { hashEnterprisePassword } from "./password.js";

function requirePromptValue(value: unknown, label: string): string {
  if (isCancel(value)) {
    throw new Error("Đã hủy tạo admin.");
  }
  if (typeof value !== "string") {
    throw new Error(`${label} không hợp lệ.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} không được để trống.`);
  }
  return normalized;
}

async function bootstrapAdministrator(): Promise<void> {
  if (countEnterpriseAdministrators() > 0) {
    throw new Error("Enterprise đã có tài khoản administrator.");
  }

  log.info(stylePromptTitle("OpenClaw Enterprise - Bootstrap Admin") ?? "OpenClaw Enterprise");
  const username = requirePromptValue(
    await text({
      message: stylePromptMessage("Username admin"),
      placeholder: "admin",
      validate: (value) =>
        /^[a-z0-9][a-z0-9._-]{2,63}$/.test(
          (typeof value === "string" ? value : "").trim().toLowerCase(),
        )
          ? undefined
          : "Dùng 3-64 ký tự: chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.",
    }),
    "Username",
  );
  const displayName = requirePromptValue(
    await text({
      message: stylePromptMessage("Tên hiển thị"),
      placeholder: "Administrator",
      validate: (value) => {
        const normalized = typeof value === "string" ? value.trim() : "";
        return normalized.length > 0 && normalized.length <= 128
          ? undefined
          : "Tên hiển thị phải có từ 1 đến 128 ký tự.";
      },
    }),
    "Tên hiển thị",
  );
  const initialPassword = requirePromptValue(
    await password({
      message: stylePromptMessage("Mật khẩu ban đầu"),
      validate: (value) =>
        typeof value === "string" && value.length >= 10
          ? undefined
          : "Mật khẩu cần ít nhất 10 ký tự.",
    }),
    "Mật khẩu",
  );
  const confirmation = requirePromptValue(
    await password({ message: stylePromptMessage("Nhập lại mật khẩu") }),
    "Xác nhận mật khẩu",
  );
  if (confirmation !== initialPassword) {
    throw new Error("Mật khẩu xác nhận không khớp.");
  }

  const account = createEnterpriseAccount({
    username,
    displayName,
    passwordHash: await hashEnterprisePassword(initialPassword),
    role: "administrator",
    mustChangePassword: true,
  });

  const snapshot = await readConfigFileSnapshot({ observe: false });
  const current = structuredClone(snapshot.sourceConfig);
  const auth = { ...current.gateway?.auth };
  delete auth.token;
  delete auth.password;
  delete auth.trustedProxy;
  const nextConfig: OpenClawConfig = {
    ...current,
    enterprise: { ...current.enterprise, enabled: true },
    gateway: {
      ...current.gateway,
      mode: current.gateway?.mode ?? "local",
      auth: { ...auth, mode: "accounts", allowTailscale: false },
      roles: current.gateway?.roles ?? {
        default: "employee",
        definitions: {
          employee: {
            sessions: { others: "none" },
            agents: "*",
            scopes: ["operator.read", "operator.write", "operator.questions"],
          },
          administrator: {
            sessions: { others: "none" },
            agents: "*",
            scopes: ["operator.read", "operator.write", "operator.questions"],
          },
        },
      },
    },
  };
  try {
    await writeConfigFile(nextConfig);
  } catch (error) {
    deleteEnterpriseAccountForBootstrapRollback(account.id);
    throw error;
  }

  log.success(`Đã tạo administrator ${account.username}.`);
  log.info("Enterprise đã bật. Chạy: openclaw gateway");
  log.info("Admin phải đổi mật khẩu ngay ở lần đăng nhập đầu tiên.");
}

export function registerEnterpriseAuthCli(program: Command): void {
  const auth = program
    .command("auth")
    .description("Manage OpenClaw Enterprise account authentication");
  auth
    .command("bootstrap-admin")
    .description("Create the first Enterprise administrator and enable accounts auth")
    .action(async () => {
      await bootstrapAdministrator();
    });
  auth.action(() => auth.help());
}
