import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HealthCheck } from "openclaw/plugin-sdk/health";
import {
  CODEX_MANAGED_APP_SERVER_CHECK_ID,
  registerCodexManagedAppServerDoctorChecks as registerChecks,
} from "./src/doctor.js";

const CODEX_PLUGIN_ROOT = path.dirname(fileURLToPath(import.meta.url));

export { CODEX_MANAGED_APP_SERVER_CHECK_ID };

export {
  createCodexEnterprisePluginRuntime,
  buildCodexPluginCapabilitySnapshot,
  computeCodexPluginCapabilityDigest,
  type CodexNativePluginGrant,
  type CodexEnterprisePluginAppAuthStatus,
  type CodexEnterprisePluginAuthStatus,
  type CodexEnterprisePluginAuthStatusOptions,
  type CodexEnterprisePluginMcpAuthOptions,
  type CodexEnterprisePluginMcpAuthResult,
  type CodexEnterprisePluginMcpAuthStatus,
  type CodexEnterprisePluginCatalog,
  type CodexEnterprisePluginInstallOptions,
  type CodexEnterprisePluginInstallResult,
  type CodexEnterprisePluginRefreshResult,
  type CodexEnterprisePluginReference,
  type CodexEnterprisePluginRuntime,
  type CodexEnterprisePluginRuntimeOptions,
} from "./runtime-api.js";

export function registerCodexManagedAppServerDoctorChecks(host: {
  registerHealthCheck(check: HealthCheck): void;
}): void {
  registerChecks({ ...host, pluginRoot: CODEX_PLUGIN_ROOT });
}
