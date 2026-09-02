// Schema-aware, redacted Enterprise admin config workflow.
import fs from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { readConfigFileSnapshot, writeConfigFile } from "../../config/io.js";
import { hashConfigRaw, parseConfigJson5 } from "../../config/io.read-helpers.js";
import { redactConfigObject, restoreRedactedValues } from "../../config/redact-snapshot.js";
import { buildConfigSchemaCore } from "../../config/schema.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { validateConfigObjectRawWithPlugins } from "../../config/validation.js";

function diffPaths(previous: unknown, next: unknown, prefix = ""): string[] {
  if (isDeepStrictEqual(previous, next)) {
    return [];
  }
  if (
    previous &&
    next &&
    typeof previous === "object" &&
    typeof next === "object" &&
    !Array.isArray(previous) &&
    !Array.isArray(next)
  ) {
    const left = previous as Record<string, unknown>;
    const right = next as Record<string, unknown>;
    return [...new Set([...Object.keys(left), ...Object.keys(right)])].flatMap((key) =>
      diffPaths(left[key], right[key], prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix || "<root>"];
}

function impactFor(paths: string[]): "none" | "reload" | "restart" {
  if (paths.length === 0) {
    return "none";
  }
  return paths.some((path) => /^(gateway\.(port|bind|auth|mode)|enterprise)(\.|$)/.test(path))
    ? "restart"
    : "reload";
}

async function prepareCandidate(raw: string, baseHash: string) {
  const snapshot = await readConfigFileSnapshot({ observe: false });
  const currentHash = snapshot.hash ?? hashConfigRaw(snapshot.raw);
  if (baseHash !== currentHash) {
    throw new Error(`CONFIG_HASH_CONFLICT:${currentHash}`);
  }
  if (!snapshot.valid) {
    throw new Error("CONFIG_CURRENT_INVALID");
  }
  const parsed = parseConfigJson5(raw);
  if (
    !parsed.ok ||
    !parsed.parsed ||
    typeof parsed.parsed !== "object" ||
    Array.isArray(parsed.parsed)
  ) {
    throw new Error(parsed.ok ? "CONFIG_OBJECT_REQUIRED" : `CONFIG_PARSE_ERROR:${parsed.error}`);
  }
  const schema = buildConfigSchemaCore();
  const restored = restoreRedactedValues(parsed.parsed, snapshot.config, schema.uiHints);
  if (!restored.ok) {
    throw new Error(`CONFIG_REDACTION_ERROR:${restored.humanReadableMessage ?? restored.error}`);
  }
  const validation = validateConfigObjectRawWithPlugins(restored.result);
  if (!validation.ok) {
    return { snapshot, schema, currentHash, validation, candidate: null, changedPaths: [] };
  }
  const candidate = validation.config;
  return {
    snapshot,
    schema,
    currentHash,
    validation,
    candidate,
    changedPaths: diffPaths(snapshot.config, candidate),
  };
}

export async function readEnterpriseAdminConfig() {
  const snapshot = await readConfigFileSnapshot({ observe: false });
  const schema = buildConfigSchemaCore();
  return {
    hash: snapshot.hash ?? hashConfigRaw(snapshot.raw),
    valid: snapshot.valid,
    issues: snapshot.issues,
    warnings: snapshot.warnings,
    config: redactConfigObject(snapshot.config, schema.uiHints),
    raw: JSON.stringify(redactConfigObject(snapshot.config, schema.uiHints), null, 2),
    schema,
    impact: { restartRequired: false, reloadRequired: false, warnings: snapshot.warnings },
  };
}

export async function validateEnterpriseAdminConfig(raw: string, baseHash: string) {
  const prepared = await prepareCandidate(raw, baseHash);
  if (!prepared.candidate) {
    return {
      ok: false,
      valid: false,
      hash: prepared.currentHash,
      issues: prepared.validation.issues,
      warnings: prepared.validation.warnings,
      changedPaths: [],
      sanitizedDiff: [],
      impact: {
        restartRequired: false,
        reloadRequired: false,
        highRiskPaths: [],
      },
    };
  }
  const impact = impactFor(prepared.changedPaths);
  return {
    ok: true,
    valid: true,
    hash: prepared.currentHash,
    issues: [],
    warnings: prepared.validation.warnings,
    changedPaths: prepared.changedPaths,
    sanitizedDiff: prepared.changedPaths.map((path) => ({
      path,
      before: "[redacted snapshot]",
      after: "[validated change]",
    })),
    impact: {
      restartRequired: impact === "restart",
      reloadRequired: impact === "reload" || impact === "restart",
      highRiskPaths: prepared.changedPaths.filter((path) =>
        /^(gateway\.(port|bind|auth|mode)|enterprise|sandbox|secrets)(\.|$)/.test(path),
      ),
    },
    config: redactConfigObject(prepared.candidate, prepared.schema.uiHints),
  };
}

export async function applyEnterpriseAdminConfig(
  raw: string,
  baseHash: string,
): Promise<{ hash: string; changedPaths: string[]; impact: "none" | "reload" | "restart" }> {
  const prepared = await prepareCandidate(raw, baseHash);
  if (!prepared.candidate) {
    throw new Error("CONFIG_VALIDATION_FAILED");
  }
  if (prepared.changedPaths.length === 0) {
    return { hash: prepared.currentHash, changedPaths: [], impact: "none" };
  }
  const result = await writeConfigFile(prepared.candidate as OpenClawConfig, {
    baseSnapshot: prepared.snapshot,
    allowDestructiveWrite: true,
    auditOrigin: "config-rpc",
  });
  return {
    hash: result.persistedHash,
    changedPaths: prepared.changedPaths,
    impact: impactFor(prepared.changedPaths),
  };
}

export async function listEnterpriseConfigBackups() {
  const snapshot = await readConfigFileSnapshot({ observe: false });
  const paths = [
    `${snapshot.path}.bak`,
    `${snapshot.path}.bak.1`,
    `${snapshot.path}.bak.2`,
    `${snapshot.path}.bak.3`,
    `${snapshot.path}.bak.4`,
  ];
  const items = await Promise.all(
    paths.map(async (backupPath, slot) => {
      try {
        const [raw, stat] = await Promise.all([
          fs.readFile(backupPath, "utf8"),
          fs.stat(backupPath),
        ]);
        return { slot, hash: hashConfigRaw(raw), updatedAt: stat.mtimeMs, size: stat.size };
      } catch {
        return null;
      }
    }),
  );
  return items.filter((item) => item !== null);
}

export async function rollbackEnterpriseAdminConfig(
  slot: number,
  baseHash: string,
): Promise<{ hash: string }> {
  if (!Number.isInteger(slot) || slot < 0 || slot > 4) {
    throw new Error("CONFIG_BACKUP_INVALID");
  }
  const snapshot = await readConfigFileSnapshot({ observe: false });
  const currentHash = snapshot.hash ?? hashConfigRaw(snapshot.raw);
  if (currentHash !== baseHash) {
    throw new Error(`CONFIG_HASH_CONFLICT:${currentHash}`);
  }
  const suffix = slot === 0 ? ".bak" : `.bak.${slot}`;
  const raw = await fs.readFile(`${snapshot.path}${suffix}`, "utf8");
  const parsed = parseConfigJson5(raw);
  if (!parsed.ok) {
    throw new Error(`CONFIG_PARSE_ERROR:${parsed.error}`);
  }
  const validation = validateConfigObjectRawWithPlugins(parsed.parsed);
  if (!validation.ok) {
    throw new Error("CONFIG_VALIDATION_FAILED");
  }
  const result = await writeConfigFile(validation.config, {
    baseSnapshot: snapshot,
    allowDestructiveWrite: true,
    auditOrigin: "config-rpc",
  });
  return { hash: result.persistedHash };
}
