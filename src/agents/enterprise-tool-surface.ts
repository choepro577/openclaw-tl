import type { OpenClawConfig } from "../config/types.openclaw.js";
import { readGatewayRequestRuntimeMetadata } from "../gateway/request-runtime-config.js";

/** Verify the materialized catalog, before an incomplete capability reaches the model. */
export function assertEnterpriseToolSurface(params: {
  config?: OpenClawConfig;
  agentId?: string;
  tools: readonly { name: string }[];
  boundary: string;
  nativeSkillReader?: boolean;
}): void {
  if (!params.agentId) {
    return;
  }
  const capability = readGatewayRequestRuntimeMetadata(
    params.config,
  )?.enterpriseCapabilities?.resolve(params.agentId);
  if (!capability?.allowed || capability.skillsSnapshot.skills.length === 0) {
    return;
  }
  const required = [
    ...(params.nativeSkillReader ? [] : ["read"]),
    ...(capability.skillsSnapshot.skills.some((skill) => skill.scriptRuntime)
      ? ["skill_script"]
      : []),
  ];
  const available = new Set(params.tools.map((tool) => tool.name));
  const missing = required.filter((name) => !available.has(name));
  if (missing.length) {
    throw Object.assign(
      new Error(`ENTERPRISE_RUNTIME_CAPABILITY_MISSING: ${params.boundary}: ${missing.join(", ")}`),
      {
        code: "ENTERPRISE_RUNTIME_CAPABILITY_MISSING",
        boundary: params.boundary,
        revision: capability.revision,
        missing,
        available: [...available].toSorted(),
      },
    );
  }
}
