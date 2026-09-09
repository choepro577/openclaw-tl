import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { stableStringify } from "@openclaw/normalization-core/stable-stringify";
import { resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { normalizeClawHubSha256Integrity } from "../../infra/clawhub-artifacts.js";
import { ensureClawHubPackageTrustAcknowledged } from "../../infra/clawhub-install-trust.js";
import {
  fetchClawHubPackageArtifact,
  fetchClawHubPackageDetail,
  fetchClawHubPackageVersion,
  searchClawHubPackages,
  listClawHubPackages,
  type ClawHubPackageArtifactResolverResponse,
} from "../../infra/clawhub-packages.js";
import {
  fetchClawHubSkillDetail,
  searchClawHubSkills,
  type ClawHubSkillSearchResult,
} from "../../infra/clawhub-skills.js";
import { sha256Hex } from "../../infra/crypto-digest.js";
import { loadInstalledPluginIndexInstallRecordsSync } from "../../plugins/installed-plugin-index-records.js";
import { buildWorkspaceSkillStatus } from "../../skills/discovery/status.js";
import { parseRequestedClawHubSkillRef } from "../../skills/lifecycle/clawhub-store.js";
import {
  applyClawHubSkillUninstall,
  planClawHubSkillUninstall,
} from "../../skills/lifecycle/clawhub-uninstall.js";
import {
  installSkillFromClawHub,
  preflightSkillFromClawHub,
} from "../../skills/lifecycle/clawhub.js";
import type { EnterpriseAccount } from "../accounts/account-types.js";
import { resolveEnterprisePersonalAgentTemplateId } from "../personal-agent/personal-agent-config.js";
import { ensureEnterpriseWorkspaceFromTemplate } from "../personal-agent/personal-workspace.js";
import type { AgentKey } from "../user/user-api-contracts.js";
import { resolveEnterpriseUserRuntimeAgentId } from "../user/user-gateway-client.js";
import {
  createEnterprisePluginRequest,
  deleteEnterpriseUserSkillInstallRecord,
  getEnterpriseUserSkillInstall,
  listEnterpriseAccountPluginGrants,
  listEnterprisePluginRequests,
  listEnterpriseUserSkillInstalls,
  writeEnterpriseUserSkillInstall,
} from "./extension-store.js";
import type {
  EnterpriseAccountPluginGrant,
  EnterpriseExtensionCatalogItem,
  EnterpriseExtensionKind,
  EnterpriseExtensionTrust,
  EnterprisePluginRequest,
  EnterpriseUserSkillInstall,
} from "./extension-types.js";

const REVIEW_TOKEN_TTL_MS = 10 * 60 * 1_000;
const reviewTokens = new Map<string, EnterpriseExtensionReview>();
const extensionLocks = new Map<string, Promise<void>>();

type EnterpriseExtensionReview = {
  token: string;
  accountId: string;
  kind: EnterpriseExtensionKind;
  catalogKey: string;
  exactVersion: string;
  integrity: string;
  trust: EnterpriseExtensionTrust;
  capabilitySnapshot: Record<string, unknown>;
  capabilityDigest: string;
  agentKey?: AgentKey;
  skillName?: string;
  requirements: string[];
  expiresAt: number;
};

export class EnterpriseExtensionError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message = code,
  ) {
    super(message);
    this.name = "EnterpriseExtensionError";
  }
}

function pruneReviewTokens(): void {
  const now = Date.now();
  for (const [token, review] of reviewTokens) {
    if (review.expiresAt <= now) {
      reviewTokens.delete(token);
    }
  }
  while (reviewTokens.size >= 512) {
    reviewTokens.delete(reviewTokens.keys().next().value as string);
  }
}

function issueReviewToken(input: Omit<EnterpriseExtensionReview, "token" | "expiresAt">): string {
  pruneReviewTokens();
  const token = randomUUID();
  reviewTokens.set(token, { ...input, token, expiresAt: Date.now() + REVIEW_TOKEN_TTL_MS });
  return token;
}

export function readEnterpriseExtensionReview(
  token: string,
  accountId: string,
): EnterpriseExtensionReview {
  pruneReviewTokens();
  const review = reviewTokens.get(token);
  if (!review || review.accountId !== accountId || review.expiresAt <= Date.now()) {
    throw new EnterpriseExtensionError("REVIEW_TOKEN_INVALID", 409);
  }
  return review;
}

async function withExtensionLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const prior = extensionLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = prior.then(() => current);
  extensionLocks.set(key, queued);
  await prior;
  try {
    return await operation();
  } finally {
    release();
    if (extensionLocks.get(key) === queued) {
      extensionLocks.delete(key);
    }
  }
}

function resolveAccountAgentWorkspace(params: {
  config: OpenClawConfig;
  account: EnterpriseAccount;
  agentKey: AgentKey;
}): { runtimeAgentId: string; workspaceDir: string } {
  let runtimeAgentId: string;
  try {
    runtimeAgentId = resolveEnterpriseUserRuntimeAgentId(
      params.config,
      params.account,
      params.agentKey,
    );
  } catch {
    throw new EnterpriseExtensionError("AGENT_NOT_FOUND", 404);
  }
  const templateAgentId =
    params.agentKey === "personal"
      ? resolveEnterprisePersonalAgentTemplateId(params.config, params.account)
      : runtimeAgentId;
  const templateWorkspace = resolveAgentWorkspaceDir(params.config, templateAgentId);
  return {
    runtimeAgentId,
    workspaceDir: ensureEnterpriseWorkspaceFromTemplate(
      params.account.profileId,
      runtimeAgentId,
      templateWorkspace,
    ),
  };
}

function managedSkillRelativePath(workspaceDir: string, skillDir: string): string {
  const relativePath = path.relative(workspaceDir, skillDir).split(path.sep).join("/");
  if (!/^skills\/[a-z0-9][a-z0-9._-]*$/i.test(relativePath)) {
    throw new EnterpriseExtensionError("SKILL_PATH_INVALID", 409);
  }
  return relativePath;
}

async function restoreManagedSkillVersion(input: {
  config: OpenClawConfig;
  workspaceDir: string;
  install: EnterpriseUserSkillInstall;
}): Promise<boolean> {
  try {
    const restored = await installSkillFromClawHub({
      workspaceDir: input.workspaceDir,
      slug: input.install.clawhubRef,
      version: input.install.exactVersion,
      expectedIntegrity: input.install.integrity,
      force: true,
      config: input.config,
    });
    if (!restored.ok) {
      return false;
    }
    const plan = await planClawHubSkillUninstall({
      workspaceDir: input.workspaceDir,
      slug: input.install.clawhubRef,
      expectedVersion: input.install.exactVersion,
    });
    return plan.ok && plan.plan.fileTreeSha256 === input.install.treeHash;
  } catch {
    return false;
  }
}

function toTrust(
  fields: Awaited<ReturnType<typeof ensureClawHubPackageTrustAcknowledged>>,
): EnterpriseExtensionTrust {
  if (!fields.ok) {
    return {
      disposition: "unscanned",
      scanStatus: null,
      moderationState: null,
      checkedAt: new Date().toISOString(),
    };
  }
  const record = fields.trustInstallRecordFields;
  const disposition = record.clawhubTrustPending
    ? "pending"
    : record.clawhubTrustStale
      ? "stale"
      : record.clawhubTrustModerationState === "revoked"
        ? "revoked"
        : record.clawhubTrustDisposition === "blocked"
          ? "malicious"
          : record.clawhubTrustDisposition === "clean" && !fields.warning
            ? "clean"
            : "unscanned";
  return {
    disposition,
    scanStatus: record.clawhubTrustScanStatus ?? null,
    moderationState: record.clawhubTrustModerationState ?? null,
    checkedAt: record.clawhubTrustCheckedAt,
  };
}

async function requireCleanTrust(input: {
  kind: "skill" | "plugin";
  packageName: string;
  version: string;
  workspaceDir?: string;
  ownerHandle?: string;
  mode?: "install" | "update";
}): Promise<EnterpriseExtensionTrust> {
  const result = await ensureClawHubPackageTrustAcknowledged({
    subject:
      input.kind === "skill"
        ? {
            kind: "skill",
            packageName: input.packageName,
            workspaceDir: input.workspaceDir ?? os.tmpdir(),
            ...(input.ownerHandle ? { ownerHandle: input.ownerHandle } : {}),
          }
        : { kind: "plugin", packageName: input.packageName },
    version: input.version,
    mode: input.mode,
  });
  const trust = toTrust(result);
  if (!result.ok || result.warning || trust.disposition !== "clean") {
    throw new EnterpriseExtensionError("CLAWHUB_RELEASE_NOT_CLEAN", 409);
  }
  return trust;
}

function artifactIntegrity(artifact: ClawHubPackageArtifactResolverResponse): string | null {
  const resolved = artifact.artifact;
  if (!resolved) {
    return null;
  }
  return normalizeClawHubSha256Integrity(resolved.artifactSha256 ?? "") ?? null;
}

function requirementsFromSkill(
  skill: ReturnType<typeof buildWorkspaceSkillStatus>["skills"][number],
): string[] {
  return [
    ...skill.missing.bins.map((value) => `bin:${value}`),
    ...skill.missing.anyBins.map((value) => `any-bin:${value}`),
    ...skill.missing.env.map((value) => `env:${value}`),
    ...skill.missing.config.map((value) => `config:${value}`),
    ...skill.missing.os.map((value) => `os:${value}`),
  ];
}

async function inspectStagedSkill(input: {
  config: OpenClawConfig;
  ref: string;
  version: string;
  integrity: string;
}): Promise<{ skillName: string; treeHash: string; requirements: string[] }> {
  const stagingRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-enterprise-skill-"));
  const workspaceDir = path.join(stagingRoot, "workspace");
  await fs.mkdir(workspaceDir, { recursive: true, mode: 0o700 });
  try {
    const installed = await installSkillFromClawHub({
      workspaceDir,
      slug: input.ref,
      version: input.version,
      expectedIntegrity: input.integrity,
      config: input.config,
    });
    if (!installed.ok) {
      throw new EnterpriseExtensionError(installed.code ?? "SKILL_STAGE_FAILED", 409);
    }
    const status = buildWorkspaceSkillStatus(workspaceDir, { config: input.config });
    const skill = status.skills.find(
      (entry) => path.resolve(entry.baseDir) === path.resolve(installed.targetDir),
    );
    const clawhub = skill?.clawhub;
    if (!skill || !clawhub?.valid || !clawhub.fileTreeSha256) {
      throw new EnterpriseExtensionError("SKILL_IDENTITY_INVALID", 409);
    }
    const parsed = parseRequestedClawHubSkillRef(input.ref);
    if (clawhub.slug !== parsed.slug) {
      throw new EnterpriseExtensionError("SKILL_IDENTITY_MISMATCH", 409);
    }
    return {
      skillName: skill.name,
      treeHash: clawhub.fileTreeSha256,
      requirements: requirementsFromSkill(skill),
    };
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }
}

function requestStateFor(
  requests: readonly EnterprisePluginRequest[],
  grants: readonly EnterpriseAccountPluginGrant[],
  packageName: string,
  version: string | undefined,
): EnterprisePluginRequest["state"] | null {
  const matching = requests.filter(
    (request) => request.packageName === packageName && request.exactVersion === version,
  );
  const pending = matching.find(
    (request) => request.state === "pending" || request.state === "approving",
  );
  if (pending) {
    return pending.state;
  }
  if (
    matching.some(
      (request) =>
        request.state === "available" &&
        grants.some(
          (grant) =>
            grant.sourceRequestId === request.id &&
            grant.state === "active" &&
            grant.exactVersion === request.exactVersion &&
            grant.integrity === request.integrity,
        ),
    )
  ) {
    return "available";
  }
  // Approval history is immutable; only a current grant can make it available.
  const latest = matching[0];
  return latest?.state === "available" ? null : (latest?.state ?? null);
}

// Cache discovery only; account access and request/grant state are resolved on every read.
const catalogPages = new Map<
  string,
  {
    expiresAt: number;
    pending: Promise<EnterpriseExtensionCatalogItem[]>;
  }
>();
const CATALOG_TTL_MS = 60_000;

async function discoverExtensionCatalog(query: string): Promise<EnterpriseExtensionCatalogItem[]> {
  const [skillResults, pluginResults] = query
    ? await Promise.all([
        searchClawHubSkills({ query, limit: 12 }),
        searchClawHubPackages({ query, limit: 12 }),
      ])
    : await Promise.all([
        listClawHubPackages({ family: "skill", limit: 12 }).then((items) =>
          items.flatMap((item): ClawHubSkillSearchResult[] =>
            item.ownerHandle
              ? [
                  {
                    score: 0,
                    slug: item.name,
                    installRef: `@${item.ownerHandle}/${item.name}`,
                    ownerHandle: item.ownerHandle,
                    displayName: item.displayName,
                    summary: item.summary ?? undefined,
                    version: item.latestVersion ?? undefined,
                  },
                ]
              : [],
          ),
        ),
        Promise.all([
          listClawHubPackages({ family: "code-plugin", limit: 6 }),
          listClawHubPackages({ family: "bundle-plugin", limit: 6 }),
        ]).then((pages) => pages.flat().map((item) => ({ score: 0, package: item }))),
      ]);
  return [
    ...skillResults.map(
      (result): EnterpriseExtensionCatalogItem => ({
        catalogKey: result.installRef,
        kind: "skill",
        name: result.displayName,
        description: result.summary ?? null,
        publisher: result.ownerHandle ?? null,
        version: result.version ?? null,
        integrity: null,
        trust: null,
        allowedAction: "none",
        reasonCodes: [result.trustState ? "ALTERNATE_REGISTRY_DENIED" : "REVIEW_REQUIRED"],
        requirements: [],
        requestState: null,
      }),
    ),
    ...pluginResults
      .filter(
        ({ package: item }) => item.family === "code-plugin" || item.family === "bundle-plugin",
      )
      .map(
        ({ package: item }): EnterpriseExtensionCatalogItem => ({
          catalogKey: item.name,
          kind: item.family === "code-plugin" ? "code_plugin" : "bundle_plugin",
          name: item.displayName,
          description: item.summary ?? null,
          publisher: item.ownerHandle ?? null,
          version: item.latestVersion ?? null,
          integrity: null,
          trust: null,
          allowedAction: "none",
          reasonCodes: ["REVIEW_REQUIRED"],
          requirements: item.environmentFlags ?? [],
          requestState: null,
        }),
      ),
  ];
}

export async function searchEnterpriseExtensions(input: {
  config: OpenClawConfig;
  account: EnterpriseAccount;
  agentKey: AgentKey;
  query: string;
}): Promise<{ items: EnterpriseExtensionCatalogItem[] }> {
  resolveAccountAgentWorkspace(input);
  const query = input.query.trim();
  // Discovery may use registry credentials: never share a cached page across accounts.
  const key = JSON.stringify([
    input.account.id,
    process.env.OPENCLAW_CLAWHUB_URL,
    process.env.CLAWHUB_URL,
    query,
  ]);
  let page = catalogPages.get(key);
  if (!page || page.expiresAt <= Date.now()) {
    page = { expiresAt: Infinity, pending: discoverExtensionCatalog(query) };
    catalogPages.delete(key);
    catalogPages.set(key, page);
    while (catalogPages.size > 32) {
      catalogPages.delete(catalogPages.keys().next().value!);
    }
    const current = page;
    void page.pending.then(
      () => {
        current.expiresAt = Date.now() + CATALOG_TTL_MS;
      },
      () => {
        if (catalogPages.get(key) === current) {
          catalogPages.delete(key);
        }
      },
    );
  }
  const items = structuredClone(await page.pending);
  const requests = listEnterprisePluginRequests({ accountId: input.account.id });
  const grants = listEnterpriseAccountPluginGrants(input.account.id);
  for (const item of items) {
    if (item.kind === "skill") {
      continue;
    }
    item.requestState = requestStateFor(
      requests,
      grants,
      item.catalogKey,
      item.version ?? undefined,
    );
  }
  return { items };
}

export async function reviewEnterpriseExtension(input: {
  config: OpenClawConfig;
  account: EnterpriseAccount;
  agentKey?: AgentKey;
  kind: EnterpriseExtensionKind;
  catalogKey: string;
  version?: string;
}): Promise<{ item: EnterpriseExtensionCatalogItem; reviewToken: string; expiresAt: number }> {
  if (input.kind === "skill") {
    if (!input.agentKey) {
      throw new EnterpriseExtensionError("AGENT_KEY_REQUIRED", 422);
    }
    const { workspaceDir } = resolveAccountAgentWorkspace({
      config: input.config,
      account: input.account,
      agentKey: input.agentKey,
    });
    const requested = parseRequestedClawHubSkillRef(input.catalogKey);
    if (requested.trustState) {
      throw new EnterpriseExtensionError("ALTERNATE_REGISTRY_DENIED", 409);
    }
    const detail = await fetchClawHubSkillDetail({
      slug: requested.slug,
      ...(requested.ownerHandle ? { ownerHandle: requested.ownerHandle } : {}),
    });
    const exactVersion = input.version ?? detail.latestVersion?.version;
    if (!exactVersion) {
      throw new EnterpriseExtensionError("VERSION_REQUIRED", 422);
    }
    const trust = await requireCleanTrust({
      kind: "skill",
      packageName: requested.slug,
      version: exactVersion,
      workspaceDir,
      ...(requested.ownerHandle ? { ownerHandle: requested.ownerHandle } : {}),
    });
    const preflight = await preflightSkillFromClawHub({
      workspaceDir: path.join(os.tmpdir(), `openclaw-review-${randomUUID()}`),
      slug: input.catalogKey,
      version: exactVersion,
    });
    if (!preflight.ok) {
      throw new EnterpriseExtensionError(preflight.code, 409);
    }
    const staged = await inspectStagedSkill({
      config: input.config,
      ref: input.catalogKey,
      version: exactVersion,
      integrity: preflight.integrity,
    });
    const existing = buildWorkspaceSkillStatus(workspaceDir, {
      config: input.config,
    }).skills.find((skill) => skill.name === staged.skillName || skill.skillKey === requested.slug);
    if (existing && !existing.clawhub) {
      throw new EnterpriseExtensionError("SKILL_COLLISION", 409);
    }
    const capabilitySnapshot = { skillName: staged.skillName, requirements: staged.requirements };
    const capabilityDigest = sha256Hex(stableStringify(capabilitySnapshot));
    const token = issueReviewToken({
      accountId: input.account.id,
      kind: "skill",
      catalogKey: input.catalogKey,
      exactVersion,
      integrity: preflight.integrity,
      trust,
      capabilitySnapshot,
      capabilityDigest,
      agentKey: input.agentKey,
      skillName: staged.skillName,
      requirements: staged.requirements,
    });
    return {
      item: {
        catalogKey: input.catalogKey,
        kind: "skill",
        name: detail.skill?.displayName ?? staged.skillName,
        description: detail.skill?.summary ?? null,
        publisher: detail.owner?.handle ?? requested.ownerHandle ?? null,
        version: exactVersion,
        integrity: preflight.integrity,
        trust,
        allowedAction: "install_skill",
        reasonCodes: [],
        requirements: staged.requirements,
        requestState: null,
      },
      reviewToken: token,
      expiresAt: Date.now() + REVIEW_TOKEN_TTL_MS,
    };
  }

  const detail = await fetchClawHubPackageDetail({ name: input.catalogKey });
  const exactVersion = input.version ?? detail.package?.latestVersion ?? undefined;
  const family = detail.package?.family;
  if (!exactVersion || (family !== "code-plugin" && family !== "bundle-plugin")) {
    throw new EnterpriseExtensionError("PLUGIN_PACKAGE_INVALID", 422);
  }
  const [version, artifact, trust] = await Promise.all([
    fetchClawHubPackageVersion({ name: input.catalogKey, version: exactVersion }),
    fetchClawHubPackageArtifact({ name: input.catalogKey, version: exactVersion }),
    requireCleanTrust({ kind: "plugin", packageName: input.catalogKey, version: exactVersion }),
  ]);
  const integrity = artifactIntegrity(artifact);
  if (!integrity) {
    throw new EnterpriseExtensionError("INTEGRITY_UNAVAILABLE", 409);
  }
  const capabilitySnapshot = {
    family: version.package?.family,
    capabilities: version.version?.capabilities ?? {},
    environment: version.version?.clawpack?.environment ?? {},
    compatibility: version.version?.compatibility ?? {},
  };
  const capabilityDigest = sha256Hex(stableStringify(capabilitySnapshot));
  const token = issueReviewToken({
    accountId: input.account.id,
    kind: family === "code-plugin" ? "code_plugin" : "bundle_plugin",
    catalogKey: input.catalogKey,
    exactVersion,
    integrity,
    trust,
    capabilitySnapshot,
    capabilityDigest,
    requirements: [],
  });
  return {
    item: {
      catalogKey: input.catalogKey,
      kind: family === "code-plugin" ? "code_plugin" : "bundle_plugin",
      name: detail.package?.displayName ?? input.catalogKey,
      description: detail.package?.summary ?? null,
      publisher: detail.owner?.handle ?? null,
      version: exactVersion,
      integrity,
      trust,
      allowedAction: "request_admin",
      reasonCodes: ["NATIVE_PLUGIN_REQUIRES_ADMIN"],
      requirements: [],
      requestState: requestStateFor(
        listEnterprisePluginRequests({ accountId: input.account.id }),
        listEnterpriseAccountPluginGrants(input.account.id),
        input.catalogKey,
        exactVersion,
      ),
    },
    reviewToken: token,
    expiresAt: Date.now() + REVIEW_TOKEN_TTL_MS,
  };
}

async function revalidateReview(
  review: EnterpriseExtensionReview,
  config: OpenClawConfig,
  account: EnterpriseAccount,
): Promise<void> {
  if (review.kind === "skill") {
    if (!review.agentKey) {
      throw new EnterpriseExtensionError("AGENT_KEY_REQUIRED", 422);
    }
    const requested = parseRequestedClawHubSkillRef(review.catalogKey);
    const { workspaceDir } = resolveAccountAgentWorkspace({
      config,
      account,
      agentKey: review.agentKey,
    });
    await requireCleanTrust({
      kind: "skill",
      packageName: requested.slug,
      version: review.exactVersion,
      workspaceDir,
      ...(requested.ownerHandle ? { ownerHandle: requested.ownerHandle } : {}),
    });
    const preflight = await preflightSkillFromClawHub({
      workspaceDir: path.join(os.tmpdir(), `openclaw-review-${randomUUID()}`),
      slug: review.catalogKey,
      version: review.exactVersion,
      expectedIntegrity: review.integrity,
    });
    if (!preflight.ok || preflight.integrity !== review.integrity) {
      throw new EnterpriseExtensionError("ARTIFACT_REVALIDATION_FAILED", 409);
    }
    return;
  }
  const [artifact, version, trust] = await Promise.all([
    fetchClawHubPackageArtifact({ name: review.catalogKey, version: review.exactVersion }),
    fetchClawHubPackageVersion({ name: review.catalogKey, version: review.exactVersion }),
    requireCleanTrust({
      kind: "plugin",
      packageName: review.catalogKey,
      version: review.exactVersion,
    }),
  ]);
  const capabilitySnapshot = {
    family: version.package?.family,
    capabilities: version.version?.capabilities ?? {},
    environment: version.version?.clawpack?.environment ?? {},
    compatibility: version.version?.compatibility ?? {},
  };
  if (
    artifactIntegrity(artifact) !== review.integrity ||
    sha256Hex(stableStringify(capabilitySnapshot)) !== review.capabilityDigest ||
    trust.disposition !== "clean"
  ) {
    throw new EnterpriseExtensionError("ARTIFACT_REVALIDATION_FAILED", 409);
  }
}

export async function installEnterpriseUserSkill(input: {
  config: OpenClawConfig;
  account: EnterpriseAccount;
  reviewToken: string;
}): Promise<EnterpriseUserSkillInstall> {
  const review = readEnterpriseExtensionReview(input.reviewToken, input.account.id);
  if (review.kind !== "skill" || !review.agentKey || !review.skillName) {
    throw new EnterpriseExtensionError("REVIEW_TOKEN_KIND_INVALID", 409);
  }
  const key = `${input.account.id}\0${review.agentKey}\0${review.catalogKey}`;
  return await withExtensionLock(key, async () => {
    await revalidateReview(review, input.config, input.account);
    const { runtimeAgentId, workspaceDir } = resolveAccountAgentWorkspace({
      config: input.config,
      account: input.account,
      agentKey: review.agentKey!,
    });
    const existing = listEnterpriseUserSkillInstalls(input.account.id, review.agentKey!).find(
      (install) => install.clawhubRef === review.catalogKey,
    );
    if (existing) {
      throw new EnterpriseExtensionError("SKILL_ALREADY_INSTALLED", 409);
    }
    const before = buildWorkspaceSkillStatus(workspaceDir, { config: input.config }).skills;
    if (
      before.some(
        (skill) =>
          skill.name === review.skillName ||
          skill.skillKey === parseRequestedClawHubSkillRef(review.catalogKey).slug,
      )
    ) {
      throw new EnterpriseExtensionError("SKILL_COLLISION", 409);
    }
    const installed = await installSkillFromClawHub({
      workspaceDir,
      slug: review.catalogKey,
      version: review.exactVersion,
      expectedIntegrity: review.integrity,
      config: input.config,
    });
    if (!installed.ok) {
      throw new EnterpriseExtensionError(installed.code ?? "SKILL_INSTALL_FAILED", 409);
    }
    const plan = await planClawHubSkillUninstall({
      workspaceDir,
      slug: review.catalogKey,
      expectedVersion: review.exactVersion,
    });
    if (!plan.ok) {
      throw new EnterpriseExtensionError("SKILL_COMMIT_VERIFICATION_FAILED", 500);
    }
    const status = buildWorkspaceSkillStatus(workspaceDir, { config: input.config });
    const skill = status.skills.find(
      (entry) => path.resolve(entry.baseDir) === path.resolve(installed.targetDir),
    );
    if (!skill || skill.name !== review.skillName) {
      await applyClawHubSkillUninstall(plan.plan);
      throw new EnterpriseExtensionError("SKILL_IDENTITY_MISMATCH", 409);
    }
    try {
      return writeEnterpriseUserSkillInstall({
        accountId: input.account.id,
        agentKey: review.agentKey!,
        runtimeAgentId,
        clawhubRef: review.catalogKey,
        skillName: review.skillName,
        exactVersion: review.exactVersion,
        integrity: review.integrity,
        relativePath: managedSkillRelativePath(workspaceDir, installed.targetDir),
        treeHash: plan.plan.fileTreeSha256,
        enabled: review.requirements.length === 0,
        state: review.requirements.length === 0 ? "ready" : "needs_setup",
        safeErrorCode: review.requirements.length === 0 ? null : "DEPENDENCY_SETUP_REQUIRED",
      });
    } catch (error) {
      await applyClawHubSkillUninstall(plan.plan);
      throw error;
    }
  });
}

export async function updateEnterpriseUserSkill(input: {
  config: OpenClawConfig;
  account: EnterpriseAccount;
  id: string;
  baseRevision: number;
  reviewToken: string;
}): Promise<EnterpriseUserSkillInstall> {
  const current = getEnterpriseUserSkillInstall(input.account.id, input.id);
  const review = readEnterpriseExtensionReview(input.reviewToken, input.account.id);
  if (
    !current ||
    review.kind !== "skill" ||
    review.catalogKey !== current.clawhubRef ||
    review.agentKey !== current.agentKey
  ) {
    throw new EnterpriseExtensionError("SKILL_INSTALL_NOT_FOUND", 404);
  }
  if (current.revision !== input.baseRevision) {
    throw new EnterpriseExtensionError("EXTENSION_REVISION_CONFLICT", 409);
  }
  return await withExtensionLock(
    `${input.account.id}\0${current.agentKey}\0${current.clawhubRef}`,
    async () => {
      const { runtimeAgentId, workspaceDir } = resolveAccountAgentWorkspace({
        config: input.config,
        account: input.account,
        agentKey: current.agentKey,
      });
      if (runtimeAgentId !== current.runtimeAgentId) {
        throw new EnterpriseExtensionError("AGENT_NOT_FOUND", 404);
      }
      const local = await planClawHubSkillUninstall({
        workspaceDir,
        slug: current.clawhubRef,
        expectedVersion: current.exactVersion,
      });
      if (!local.ok || local.plan.fileTreeSha256 !== current.treeHash) {
        writeEnterpriseUserSkillInstall({
          ...current,
          state: "modified",
          safeErrorCode: "SKILL_TAMPERED",
          baseRevision: current.revision,
        });
        throw new EnterpriseExtensionError("SKILL_TAMPERED", 409);
      }
      await revalidateReview(review, input.config, input.account);
      const installed = await installSkillFromClawHub({
        workspaceDir,
        slug: review.catalogKey,
        version: review.exactVersion,
        expectedIntegrity: review.integrity,
        force: true,
        config: input.config,
      });
      if (!installed.ok) {
        throw new EnterpriseExtensionError(installed.code ?? "SKILL_UPDATE_FAILED", 409);
      }
      const nextPlan = await planClawHubSkillUninstall({
        workspaceDir,
        slug: review.catalogKey,
        expectedVersion: review.exactVersion,
      });
      if (!nextPlan.ok) {
        await restoreManagedSkillVersion({
          config: input.config,
          workspaceDir,
          install: current,
        });
        throw new EnterpriseExtensionError("SKILL_COMMIT_VERIFICATION_FAILED", 500);
      }
      try {
        const eligibleState = current.enabled ? "ready" : "disabled";
        return writeEnterpriseUserSkillInstall({
          ...current,
          exactVersion: review.exactVersion,
          integrity: review.integrity,
          treeHash: nextPlan.plan.fileTreeSha256,
          enabled: current.enabled && review.requirements.length === 0,
          state: review.requirements.length === 0 ? eligibleState : "needs_setup",
          safeErrorCode: review.requirements.length === 0 ? null : "DEPENDENCY_SETUP_REQUIRED",
          baseRevision: input.baseRevision,
        });
      } catch (error) {
        const restored = await restoreManagedSkillVersion({
          config: input.config,
          workspaceDir,
          install: current,
        });
        if (!restored) {
          throw new EnterpriseExtensionError("SKILL_RECONCILIATION_REQUIRED", 500);
        }
        throw error;
      }
    },
  );
}

export async function setEnterpriseUserSkillEnabled(input: {
  config: OpenClawConfig;
  account: EnterpriseAccount;
  id: string;
  baseRevision: number;
  enabled: boolean;
}): Promise<EnterpriseUserSkillInstall> {
  const current = getEnterpriseUserSkillInstall(input.account.id, input.id);
  if (!current) {
    throw new EnterpriseExtensionError("SKILL_INSTALL_NOT_FOUND", 404);
  }
  const resolved = resolveAccountAgentWorkspace({
    config: input.config,
    account: input.account,
    agentKey: current.agentKey,
  });
  if (resolved.runtimeAgentId !== current.runtimeAgentId) {
    throw new EnterpriseExtensionError("AGENT_NOT_FOUND", 404);
  }
  if (current.state === "modified" || current.state === "error") {
    throw new EnterpriseExtensionError("SKILL_STATE_BLOCKED", 409);
  }
  if (input.enabled) {
    const plan = await planClawHubSkillUninstall({
      workspaceDir: resolved.workspaceDir,
      slug: current.clawhubRef,
      expectedVersion: current.exactVersion,
    });
    if (!plan.ok || plan.plan.fileTreeSha256 !== current.treeHash) {
      writeEnterpriseUserSkillInstall({
        ...current,
        enabled: false,
        state: "modified",
        safeErrorCode: "SKILL_TAMPERED",
        baseRevision: current.revision,
      });
      throw new EnterpriseExtensionError("SKILL_TAMPERED", 409);
    }
    const status = buildWorkspaceSkillStatus(resolved.workspaceDir, { config: input.config });
    const skill = status.skills.find(
      (entry) => path.resolve(entry.baseDir) === path.resolve(plan.plan.targetDir),
    );
    if (!skill || requirementsFromSkill(skill).length > 0) {
      throw new EnterpriseExtensionError("DEPENDENCY_SETUP_REQUIRED", 409);
    }
  }
  return writeEnterpriseUserSkillInstall({
    ...current,
    enabled: input.enabled,
    state: input.enabled ? "ready" : "disabled",
    safeErrorCode: input.enabled ? null : current.safeErrorCode,
    baseRevision: input.baseRevision,
  });
}

export async function removeEnterpriseUserSkill(input: {
  config: OpenClawConfig;
  account: EnterpriseAccount;
  id: string;
  baseRevision: number;
}): Promise<void> {
  const current = getEnterpriseUserSkillInstall(input.account.id, input.id);
  if (!current) {
    throw new EnterpriseExtensionError("SKILL_INSTALL_NOT_FOUND", 404);
  }
  const { runtimeAgentId, workspaceDir } = resolveAccountAgentWorkspace({
    config: input.config,
    account: input.account,
    agentKey: current.agentKey,
  });
  if (runtimeAgentId !== current.runtimeAgentId) {
    throw new EnterpriseExtensionError("AGENT_NOT_FOUND", 404);
  }
  await withExtensionLock(
    `${input.account.id}\0${current.agentKey}\0${current.clawhubRef}`,
    async () => {
      const plan = await planClawHubSkillUninstall({
        workspaceDir,
        slug: current.clawhubRef,
        expectedVersion: current.exactVersion,
      });
      if (!plan.ok || plan.plan.fileTreeSha256 !== current.treeHash) {
        writeEnterpriseUserSkillInstall({
          ...current,
          state: "modified",
          safeErrorCode: "SKILL_TAMPERED",
          baseRevision: current.revision,
        });
        throw new EnterpriseExtensionError("SKILL_TAMPERED", 409);
      }
      const removed = await applyClawHubSkillUninstall(plan.plan);
      if (!removed.ok) {
        throw new EnterpriseExtensionError("SKILL_REMOVE_FAILED", 500);
      }
      try {
        deleteEnterpriseUserSkillInstallRecord(input.account.id, input.id, input.baseRevision);
      } catch (error) {
        const restored = await restoreManagedSkillVersion({
          config: input.config,
          workspaceDir,
          install: current,
        });
        throw new EnterpriseExtensionError(
          restored ? "EXTENSION_REVISION_CONFLICT" : "SKILL_RECONCILIATION_REQUIRED",
          restored ? 409 : 500,
          String(error),
        );
      }
    },
  );
}

export async function requestEnterpriseNativePlugin(input: {
  config: OpenClawConfig;
  account: EnterpriseAccount;
  reviewToken: string;
}): Promise<EnterprisePluginRequest> {
  const review = readEnterpriseExtensionReview(input.reviewToken, input.account.id);
  if (review.kind === "skill") {
    throw new EnterpriseExtensionError("REVIEW_TOKEN_KIND_INVALID", 409);
  }
  await revalidateReview(review, input.config, input.account);
  let requestKind: "install" | "access" = "install";
  try {
    requestKind = Object.values(loadInstalledPluginIndexInstallRecordsSync()).some(
      (record) =>
        record.source === "clawhub" &&
        record.clawhubPackage === review.catalogKey &&
        (record.clawhubVersion ?? record.version) === review.exactVersion &&
        (record.integrity ?? record.npmIntegrity) === review.integrity,
    )
      ? "access"
      : "install";
  } catch {
    // Missing or unreadable global metadata is treated as requiring a full Admin install review.
  }
  return createEnterprisePluginRequest({
    requesterAccountId: input.account.id,
    packageName: review.catalogKey,
    packageFamily: review.kind,
    exactVersion: review.exactVersion,
    integrity: review.integrity,
    requestKind,
    trustSnapshot: review.trust,
    capabilitySnapshot: review.capabilitySnapshot,
    capabilityDigest: review.capabilityDigest,
  });
}

export async function revalidateEnterprisePluginRequestArtifact(
  request: EnterprisePluginRequest,
): Promise<void> {
  const [artifact, version] = await Promise.all([
    fetchClawHubPackageArtifact({ name: request.packageName, version: request.exactVersion }),
    fetchClawHubPackageVersion({ name: request.packageName, version: request.exactVersion }),
    requireCleanTrust({
      kind: "plugin",
      packageName: request.packageName,
      version: request.exactVersion,
    }),
  ]);
  const capabilitySnapshot = {
    family: version.package?.family,
    capabilities: version.version?.capabilities ?? {},
    environment: version.version?.clawpack?.environment ?? {},
    compatibility: version.version?.compatibility ?? {},
  };
  if (
    artifactIntegrity(artifact) !== request.integrity ||
    sha256Hex(stableStringify(capabilitySnapshot)) !== request.capabilityDigest
  ) {
    throw new EnterpriseExtensionError("ARTIFACT_REVALIDATION_FAILED", 409);
  }
}

export const enterpriseExtensionTestHooks = {
  clearReviewTokens(): void {
    reviewTokens.clear();
  },
};
