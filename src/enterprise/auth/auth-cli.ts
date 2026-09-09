// CLI management for Enterprise administrator authentication.
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
  getEnterpriseAccountByUsername,
} from "../accounts/account-store.js";
import { recoverEnterpriseAccountPassword } from "./auth-service.js";
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

function requirePasswordValue(value: unknown, label: string): string {
  if (isCancel(value)) {
    throw new Error("Đã hủy đổi mật khẩu.");
  }
  if (typeof value !== "string" || !value) {
    throw new Error(`${label} không được để trống.`);
  }
  if (value !== value.trim()) {
    throw new Error(`${label} không được có khoảng trắng ở đầu hoặc cuối.`);
  }
  return value;
}

function validatePasswordValue(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length < 10) {
    return "Mật khẩu cần ít nhất 10 ký tự.";
  }
  if (value !== value.trim()) {
    return "Mật khẩu không được có khoảng trắng ở đầu hoặc cuối.";
  }
  return undefined;
}

async function promptForPassword(title: string): Promise<string> {
  const nextPassword = requirePasswordValue(
    await password({
      message: stylePromptMessage(title),
      validate: validatePasswordValue,
    }),
    "Mật khẩu",
  );
  const confirmation = requirePasswordValue(
    await password({ message: stylePromptMessage("Nhập lại mật khẩu") }),
    "Xác nhận mật khẩu",
  );
  if (confirmation !== nextPassword) {
    throw new Error("Mật khẩu xác nhận không khớp.");
  }
  return nextPassword;
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
  const initialPassword = await promptForPassword("Mật khẩu ban đầu");

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

async function resetAdministratorPassword(username: string): Promise<void> {
  const account = getEnterpriseAccountByUsername(username);
  if (!account) {
    throw new Error(`Không tìm thấy tài khoản ${username}.`);
  }
  if (account.role !== "administrator") {
    throw new Error(`${account.username} không phải tài khoản administrator.`);
  }

  log.info(stylePromptTitle("OpenClaw Enterprise - Reset Admin Password") ?? "OpenClaw Enterprise");
  const nextPassword = await promptForPassword("Mật khẩu mới");
  await recoverEnterpriseAccountPassword(account.id, nextPassword);
  log.success(`Đã đặt lại mật khẩu cho administrator ${account.username}.`);
  log.info("Các phiên đăng nhập cũ đã bị thu hồi. Bạn có thể đăng nhập bằng mật khẩu mới.");
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
  auth
    .command("reset-admin-password")
    .description("Reset an existing Enterprise administrator password")
    .argument("[username]", "Administrator username", "admin")
    .action(async (username: string) => {
      await resetAdministratorPassword(username);
    });
  auth.action(() => auth.help());
}
