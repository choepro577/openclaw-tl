import { isRecord } from "@openclaw/normalization-core/record-coerce";
// Frontmatter helpers parse skill metadata from SKILL.md files.
import { readStringValue } from "@openclaw/normalization-core/string-coerce";
import { parseFrontmatterBlockResult } from "../../../packages/markdown-core/src/frontmatter.js";
import { validateRegistryNpmSpec } from "../../infra/npm-registry-spec.js";
import {
  applyOpenClawManifestInstallCommonFields,
  getFrontmatterString,
  normalizeStringList,
  parseOpenClawManifestInstallBase,
  parseFrontmatterBool,
  resolveOpenClawManifestBlock,
  resolveOpenClawManifestInstall,
  resolveOpenClawManifestOs,
  resolveOpenClawManifestRequires,
} from "../../shared/frontmatter.js";
import type {
  OpenClawSkillMetadata,
  ParsedSkillFrontmatter,
  SkillEntry,
  SkillInstallSpec,
  SkillInvocationPolicy,
  SkillScriptAuth,
  SkillScriptEntrypoint,
  SkillScriptRuntime,
} from "../types.js";
import type { Skill } from "./skill-contract.js";

export function parseSkillFrontmatter(content: string): ParsedSkillFrontmatter {
  const parsed = parseFrontmatterBlockResult(content);
  const issue = parsed.issues[0];
  if (issue) {
    throw new Error(`invalid frontmatter: ${issue.code}: ${issue.message}`);
  }
  return parsed.frontmatter;
}

const BREW_FORMULA_PATTERN = /^[A-Za-z0-9][A-Za-z0-9@+._/-]*$/;
const GO_MODULE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~+\-/]*(?:@[A-Za-z0-9][A-Za-z0-9._~+\-/]*)?$/;
const UV_PACKAGE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._\-[\]=<>!~+,]*$/;
const SCRIPT_ID_PATTERN = /^[a-z][a-z0-9_-]{0,127}$/;
const SCRIPT_ARGUMENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]{0,127}$/;
const TOKEN_PATH_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;

function scriptId(value: unknown): string | undefined {
  return typeof value === "string" && SCRIPT_ID_PATTERN.test(value) ? value : undefined;
}

function scriptIdList(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  const values: string[] = [];
  for (const item of value) {
    const id = scriptId(item);
    if (!id) {
      return undefined;
    }
    values.push(id);
  }
  return [...new Set(values)];
}

function scriptPath(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().replaceAll("\\", "/");
  return normalized.startsWith("scripts/") && !normalized.split("/").includes("..")
    ? normalized
    : undefined;
}

function scriptTimeout(value: unknown): number | undefined {
  return value === undefined
    ? undefined
    : typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 120_000
      ? value
      : undefined;
}

function parseScriptEntrypoint(value: unknown): SkillScriptEntrypoint | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const path = scriptPath(value.path);
  const timeoutMs = scriptTimeout(value.timeoutMs);
  if (!path || (value.timeoutMs !== undefined && timeoutMs === undefined)) {
    return undefined;
  }
  if (value.kind === "fixed" && (value.risk === "read" || value.risk === "write")) {
    return { path, kind: "fixed", risk: value.risk, ...(timeoutMs ? { timeoutMs } : {}) };
  }
  if (value.kind !== "operation" || value.unknownRisk !== "approval") {
    return undefined;
  }
  const routerOperation =
    value.routerOperation === undefined ? undefined : scriptId(value.routerOperation);
  const routerBypassOperations = scriptIdList(value.routerBypassOperations);
  const authExemptOperations = scriptIdList(value.authExemptOperations);
  const readOperations = scriptIdList(value.readOperations);
  const writeOperations = scriptIdList(value.writeOperations);
  if (
    (value.routerOperation !== undefined && !routerOperation) ||
    (value.routerBypassOperations !== undefined && !routerBypassOperations) ||
    (value.authExemptOperations !== undefined && !authExemptOperations) ||
    (value.readOperations !== undefined && !readOperations) ||
    (value.writeOperations !== undefined && !writeOperations) ||
    readOperations?.some((operation) => writeOperations?.includes(operation))
  ) {
    return undefined;
  }
  return {
    path,
    kind: "operation",
    unknownRisk: "approval",
    ...(timeoutMs ? { timeoutMs } : {}),
    ...(routerOperation ? { routerOperation } : {}),
    ...(routerBypassOperations ? { routerBypassOperations } : {}),
    ...(authExemptOperations ? { authExemptOperations } : {}),
    ...(readOperations ? { readOperations } : {}),
    ...(writeOperations ? { writeOperations } : {}),
  };
}

function parseScriptAuth(value: unknown): SkillScriptAuth | undefined {
  if (!isRecord(value) || value.mode !== "login-token" || !Array.isArray(value.fields)) {
    return undefined;
  }
  const loginEntrypoint = scriptId(value.loginEntrypoint);
  const loginOperation = scriptId(value.loginOperation);
  const injectArgument = scriptId(value.injectArgument);
  const rawTokenPaths = Array.isArray(value.tokenPaths) ? value.tokenPaths : [];
  const tokenPaths = rawTokenPaths.filter(
    (item): item is string => typeof item === "string" && TOKEN_PATH_PATTERN.test(item),
  );
  const fields: Array<SkillScriptAuth["fields"][number] | undefined> = value.fields.map((field) => {
    if (!isRecord(field)) {
      return undefined;
    }
    const id = scriptId(field.id);
    const argument =
      typeof field.argument === "string" && SCRIPT_ARGUMENT_PATTERN.test(field.argument)
        ? field.argument
        : undefined;
    const label = typeof field.label === "string" ? field.label.trim() : "";
    return id && argument && label && (field.type === "text" || field.type === "password")
      ? { id, label: label.slice(0, 128), argument, type: field.type }
      : undefined;
  });
  if (
    !loginEntrypoint ||
    !loginOperation ||
    !injectArgument ||
    tokenPaths.length !== rawTokenPaths.length ||
    tokenPaths.length === 0 ||
    fields.length === 0 ||
    fields.some((field) => !field) ||
    !fields.some((field) => field?.type === "password") ||
    new Set(fields.map((field) => field?.id)).size !== fields.length ||
    typeof value.ttlSeconds !== "number" ||
    !Number.isInteger(value.ttlSeconds) ||
    value.ttlSeconds < 60 ||
    value.ttlSeconds > 31_536_000
  ) {
    return undefined;
  }
  const parsedFields = fields.filter((field) => field !== undefined);
  return {
    mode: "login-token",
    loginEntrypoint,
    loginOperation,
    fields: parsedFields,
    tokenPaths: [...new Set(tokenPaths)],
    injectArgument,
    ttlSeconds: value.ttlSeconds,
  };
}

function parseScriptRuntime(value: unknown): SkillScriptRuntime | undefined {
  if (!isRecord(value) || !isRecord(value.entrypoints)) {
    return undefined;
  }
  const entrypoints: Record<string, SkillScriptEntrypoint> = {};
  for (const [name, raw] of Object.entries(value.entrypoints)) {
    const normalizedName = scriptId(name);
    const entrypoint = parseScriptEntrypoint(raw);
    if (!normalizedName || !entrypoint) {
      return undefined;
    }
    entrypoints[normalizedName] = entrypoint;
  }
  if (Object.keys(entrypoints).length === 0) {
    return undefined;
  }
  const auth = value.auth === undefined ? undefined : parseScriptAuth(value.auth);
  if (value.auth !== undefined && !auth) {
    return undefined;
  }
  if (auth) {
    const loginEntrypoint = entrypoints[auth.loginEntrypoint];
    if (loginEntrypoint?.kind !== "operation") {
      return undefined;
    }
  }
  return { entrypoints, ...(auth ? { auth } : {}) };
}

function normalizeSafeBrewFormula(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const formula = raw.trim();
  if (!formula || formula.startsWith("-") || formula.includes("\\") || formula.includes("..")) {
    return undefined;
  }
  if (!BREW_FORMULA_PATTERN.test(formula)) {
    return undefined;
  }
  return formula;
}

function normalizeSafeNpmSpec(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const spec = raw.trim();
  if (!spec || spec.startsWith("-")) {
    return undefined;
  }
  if (validateRegistryNpmSpec(spec) !== null) {
    return undefined;
  }
  return spec;
}

function normalizeSafeGoModule(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const moduleSpec = raw.trim();
  if (
    !moduleSpec ||
    moduleSpec.startsWith("-") ||
    moduleSpec.includes("\\") ||
    moduleSpec.includes("://")
  ) {
    return undefined;
  }
  if (!GO_MODULE_PATTERN.test(moduleSpec)) {
    return undefined;
  }
  return moduleSpec;
}

function normalizeSafeUvPackage(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const pkg = raw.trim();
  if (!pkg || pkg.startsWith("-") || pkg.includes("\\") || pkg.includes("://")) {
    return undefined;
  }
  if (!UV_PACKAGE_PATTERN.test(pkg)) {
    return undefined;
  }
  return pkg;
}

function normalizeSafeDownloadUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const value = raw.trim();
  if (!value || /\s/.test(value)) {
    return undefined;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function parseInstallSpec(input: unknown): SkillInstallSpec | undefined {
  const parsed = parseOpenClawManifestInstallBase(input, ["brew", "node", "go", "uv", "download"]);
  if (!parsed) {
    return undefined;
  }
  const { raw } = parsed;
  const spec = applyOpenClawManifestInstallCommonFields<SkillInstallSpec>(
    {
      kind: parsed.kind as SkillInstallSpec["kind"],
    },
    parsed,
  );
  const osList = normalizeStringList(raw.os);
  if (osList.length > 0) {
    spec.os = osList;
  }
  const formula = normalizeSafeBrewFormula(raw.formula);
  if (formula) {
    spec.formula = formula;
  }
  const cask = normalizeSafeBrewFormula(raw.cask);
  if (!spec.formula && cask) {
    spec.formula = cask;
  }
  if (spec.kind === "node") {
    const pkg = normalizeSafeNpmSpec(raw.package);
    if (pkg) {
      spec.package = pkg;
    }
  } else if (spec.kind === "uv") {
    const pkg = normalizeSafeUvPackage(raw.package);
    if (pkg) {
      spec.package = pkg;
    }
  }
  const moduleSpec = normalizeSafeGoModule(raw.module);
  if (moduleSpec) {
    spec.module = moduleSpec;
  }
  const downloadUrl = normalizeSafeDownloadUrl(raw.url);
  if (downloadUrl) {
    spec.url = downloadUrl;
  }
  if (typeof raw.archive === "string") {
    spec.archive = raw.archive;
  }
  if (typeof raw.extract === "boolean") {
    spec.extract = raw.extract;
  }
  if (typeof raw.stripComponents === "number") {
    spec.stripComponents = raw.stripComponents;
  }
  if (typeof raw.targetDir === "string") {
    spec.targetDir = raw.targetDir;
  }

  if (spec.kind === "brew" && !spec.formula) {
    return undefined;
  }
  if (spec.kind === "node" && !spec.package) {
    return undefined;
  }
  if (spec.kind === "go" && !spec.module) {
    return undefined;
  }
  if (spec.kind === "uv" && !spec.package) {
    return undefined;
  }
  if (spec.kind === "download" && !spec.url) {
    return undefined;
  }

  return spec;
}

export function resolveSkillManifestMetadata(
  frontmatter: ParsedSkillFrontmatter,
): OpenClawSkillMetadata | undefined {
  const metadataObj = resolveOpenClawManifestBlock({ frontmatter });
  if (!metadataObj) {
    return undefined;
  }
  const requires = resolveOpenClawManifestRequires(metadataObj);
  const install = resolveOpenClawManifestInstall(metadataObj, parseInstallSpec);
  const osRaw = resolveOpenClawManifestOs(metadataObj);
  const scriptRuntime =
    metadataObj.scriptRuntime === undefined
      ? undefined
      : parseScriptRuntime(metadataObj.scriptRuntime);
  return {
    always: typeof metadataObj.always === "boolean" ? metadataObj.always : undefined,
    emoji: readStringValue(metadataObj.emoji),
    homepage: readStringValue(metadataObj.homepage),
    skillKey: readStringValue(metadataObj.skillKey),
    primaryEnv: readStringValue(metadataObj.primaryEnv),
    os: osRaw.length > 0 ? osRaw : undefined,
    requires,
    install: install.length > 0 ? install : undefined,
    scriptRuntime,
  };
}

export function resolveSkillInvocationPolicy(
  frontmatter: ParsedSkillFrontmatter,
): SkillInvocationPolicy {
  return {
    userInvocable: parseFrontmatterBool(getFrontmatterString(frontmatter, "user-invocable"), true),
    disableModelInvocation: parseFrontmatterBool(
      getFrontmatterString(frontmatter, "disable-model-invocation"),
      false,
    ),
  };
}

export function resolveSkillKey(skill: Skill, entry?: SkillEntry): string {
  return entry?.metadata?.skillKey ?? skill.name;
}
