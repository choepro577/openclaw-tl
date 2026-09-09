import { createHmac, randomBytes } from "node:crypto";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { detectMime, kindFromMime } from "@openclaw/media-core/mime";
import {
  asDateTimestampMs,
  resolveTimestampMsToIsoString,
} from "@openclaw/normalization-core/number-coercion";
import {
  type AgentAvatarResolution,
  resolvePublicAgentAvatarSource,
} from "../agents/identity-avatar.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { getEnterpriseAccountById } from "../enterprise/accounts/account-store.js";
import { getActiveEnterpriseSession } from "../enterprise/auth/session-store.js";
import { resolveEnterpriseWorkspacePath } from "../enterprise/personal-agent/personal-workspace.js";
import {
  createEnterpriseUserGatewayClient,
  resolveEnterpriseUserAgentKey,
} from "../enterprise/user/user-gateway-client.js";
import {
  matchRootFileOpenFailure,
  openRootFileSync,
  readFileDescriptorBounded,
} from "../infra/boundary-file-read.js";
import { resolveDevInstallGitBranch } from "../infra/dev-install-branch.js";
import { readFileWindowFully } from "../infra/file-read.js";
import { openLocalFileSafely, FsSafeError } from "../infra/fs-safe.js";
import { safeFileURLToPath } from "../infra/local-file-access.js";
import { isWithinDir } from "../infra/path-safety.js";
import { assertLocalMediaAllowed, getDefaultLocalRootsCore } from "../media/local-media-access.js";
import { getAgentScopedMediaLocalRoots } from "../media/local-roots.js";
import { readPersistedMediaFacts } from "../media/media-facts.js";
import { probePlaybackMediaFileDescriptor, type MediaProbeResult } from "../media/media-probe.js";
import {
  resolveMediaReferenceLocalPath,
  resolveMediaReferenceLocalPathInfo,
  normalizeMediaReferenceSource,
} from "../media/media-reference.js";
import {
  replacePlaybackFileExtension,
  resolvePlaybackModeForSource,
  resolvePlaybackTranscode,
} from "../media/playback-transcode.js";
import { extractOriginalFilename } from "../media/store.js";
import { safeEqualSecret } from "../security/secret-equal.js";
import { AVATAR_MAX_BYTES, resolveAvatarMime } from "../shared/avatar-policy.js";
import { resolveUserPath } from "../utils.js";
import { resolveRuntimeServiceBuildId, resolveRuntimeServiceVersion } from "../version.js";
import { openGatewayAssistantAvatar, resolveGatewayAssistantAvatar } from "./assistant-avatar.js";
import { DEFAULT_ASSISTANT_IDENTITY, resolveAssistantIdentity } from "./assistant-identity.js";
import { buildAssistantMediaContentDisposition } from "./assistant-media-content-disposition.js";
import type { AuthRateLimiter } from "./auth-rate-limit.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import {
  buildControlUiResourcePath,
  buildControlUiRootAssetPath,
  CONTROL_UI_BASE_PATH_ATTRIBUTE,
  CONTROL_UI_BOOTSTRAP_CONFIG_PATH,
  CONTROL_UI_ENVIRONMENT_ATTRIBUTE,
  CONTROL_UI_ROOT_PUBLIC_ASSETS,
  CONTROL_UI_TERMINAL_ENABLED_ATTRIBUTE,
  isControlUiRootPublicAsset,
  parseControlUiResourcePath,
  type ControlUiBootstrapConfig,
  type ControlUiEnvironment,
  type ControlUiPluginFrameGrantAck,
} from "./control-ui-contract.js";
import { buildControlUiCspHeader, computeInlineScriptHashes } from "./control-ui-csp.js";
import {
  isReadHttpMethod,
  respondNotFound as respondControlUiNotFound,
  respondPlainText,
} from "./control-ui-http-utils.js";
import {
  classifyControlUiRequest,
  isControlUiApprovalDocumentPath,
  isControlUiFocusDocumentPath,
} from "./control-ui-routing.js";
import { normalizeControlUiBasePath } from "./control-ui-shared.js";
import {
  isControlUiPrecompressedAssetExtension,
  isControlUiStaticAssetExtension,
  readAndCloseControlUiFile,
  readAndCloseControlUiFileText,
  resolveControlUiHtmlEncoding,
  resolveOpenedControlUiRepresentation,
  respondControlUiNotAcceptable,
  respondHeadForControlUiFile,
  sendControlUiHtmlBody,
  serveControlUiAsset,
} from "./control-ui-static.js";
import {
  createGatewayByteStream,
  resolveByteResponse,
  writeByteHeaders,
} from "./http-byte-range.js";
import { authorizeControlUiReadRequestOrReply } from "./http-utils.js";
import { resolveLocalSessionWorkspaceRoot } from "./server-methods/sessions-files.js";
import { createSessionListEntryFilter, resolveSessionSharingTarget } from "./session-sharing.js";
import { readSessionMessagesWithSourceAsync } from "./session-transcript-readers.js";
import { isTerminalConfigEnabled } from "./terminal/enabled.js";

const ROOT_PREFIX = "/";
const CONTROL_UI_ASSISTANT_MEDIA_PREFIX = "/__openclaw__/assistant-media";
const CONTROL_UI_ASSISTANT_MEDIA_TICKET_SCOPE = "assistant-media";
const CONTROL_UI_ASSISTANT_MEDIA_TICKET_TTL_MS = 5 * 60 * 1000;
const CONTROL_UI_ASSETS_MISSING_MESSAGE =
  "Control UI assets not found. Build them with `pnpm ui:build` (auto-installs UI deps), or run `pnpm ui:dev` during development.";
const controlUiAssistantMediaTicketSecret = randomBytes(32);

type ControlUiRequestOptions = {
  basePath?: string;
  config?: OpenClawConfig;
  terminalEnabled?: boolean;
  agentId?: string;
  root?: ControlUiRootState;
  auth?: ResolvedGatewayAuth;
  trustedProxies?: string[];
  allowRealIpFallback?: boolean;
  rateLimiter?: AuthRateLimiter;
};

export type ControlUiRootState =
  | { kind: "bundled"; path: string; realPath?: string }
  | { kind: "resolved"; path: string; realPath?: string }
  | { kind: "invalid"; path: string }
  | { kind: "preparing" }
  // The document route is unauthenticated; build diagnostics stay in Gateway logs.
  | { kind: "failed" }
  | { kind: "missing" };

const CONTROL_UI_NAMESPACE_PREFIX = "/__openclaw__/";
/** Anchors bundled assets before deep-linked documents begin preloading. */
function rewriteControlUiIndexHtmlAssetHrefs(html: string, basePath: string): string {
  const normalized = normalizeControlUiBasePath(basePath);
  let next = html
    .replaceAll('src="./assets/', `src="${normalized}/assets/`)
    .replaceAll('href="./assets/', `href="${normalized}/assets/`);
  for (const asset of CONTROL_UI_ROOT_PUBLIC_ASSETS) {
    const assetHref = `href="${buildControlUiRootAssetPath(normalized, asset)}"`;
    // Vite's portable ./ base emits relative hrefs, which the browser starts
    // resolving against a nested route before the UI can correct them.
    next = next.replaceAll(`href="./${asset}"`, assetHref);
    if (normalized) {
      next = next.replaceAll(`href="/${asset}"`, assetHref);
    }
  }
  return next;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("'", "&#39;");
}

type ControlUiAvatarMeta = {
  avatarUrl: string | null;
  avatarSource: string | null;
  avatarStatus: AgentAvatarResolution["kind"] | null;
  avatarReason: string | null;
};

function controlUiAvatarResolutionMeta(resolved: AgentAvatarResolution | null): {
  avatarSource: string | null;
  avatarStatus: AgentAvatarResolution["kind"] | null;
  avatarReason: string | null;
} {
  if (!resolved) {
    return { avatarSource: null, avatarStatus: null, avatarReason: null };
  }
  return {
    avatarSource: resolvePublicAgentAvatarSource(resolved) ?? null,
    avatarStatus: resolved.kind,
    avatarReason: resolved.kind === "none" ? resolved.reason : null,
  };
}

function applyControlUiSecurityHeaders(res: ServerResponse) {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", buildControlUiCspHeader());
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  // Browser Talk is owned by this same-origin Control UI document. Keep camera
  // access here; the Gateway's default policy continues to deny it elsewhere.
  res.setHeader(
    "Permissions-Policy",
    "camera=(self), microphone=*, geolocation=*, clipboard-write=*",
  );
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.end(JSON.stringify(body));
}

function respondControlUiAssetsUnavailable(
  res: ServerResponse,
  options?: {
    configuredRootPath?: string;
    failed?: boolean;
    preparing?: boolean;
  },
) {
  const message = options?.preparing
    ? "Control UI assets are being prepared. Try again shortly."
    : options?.failed
      ? "Control UI assets could not be prepared. Check the Gateway logs or run `openclaw doctor --fix`."
      : options?.configuredRootPath
        ? `Control UI assets not found at ${options.configuredRootPath}. Build them with \`pnpm ui:build\` (auto-installs UI deps), or update gateway.controlUi.root.`
        : CONTROL_UI_ASSETS_MISSING_MESSAGE;
  if (options?.preparing) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Retry-After", "1");
  }
  respondPlainText(res, 503, message);
}

function isValidAgentPathSegment(agentId: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(agentId);
}

function normalizeAssistantMediaSource(source: string): string | null {
  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("file://")) {
    try {
      return safeFileURLToPath(trimmed);
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("~")) {
    return resolveUserPath(trimmed);
  }
  return trimmed;
}

function resolveAssistantMediaRoutePath(basePath?: string): string {
  const normalizedBasePath =
    basePath && basePath !== "/" ? (basePath.endsWith("/") ? basePath.slice(0, -1) : basePath) : "";
  return `${normalizedBasePath}${CONTROL_UI_ASSISTANT_MEDIA_PREFIX}`;
}

type AssistantMediaAvailability =
  | ({
      available: true;
      mimeType?: string;
      playback?: "native" | "transcode";
      sizeBytes?: number;
      workspacePath?: string;
    } & MediaProbeResult)
  | { available: false; reason: string; code: string };

type OperatorAssistantMediaTicketPayload = {
  scope: typeof CONTROL_UI_ASSISTANT_MEDIA_TICKET_SCOPE;
  source: string;
  exp: number;
};

type EnterpriseAssistantMediaPrincipal = {
  profileId: string;
  accountId: string;
  accountRole: "administrator" | "employee";
  sessionId: string;
};

type EnterpriseAssistantMediaTicketPayload = OperatorAssistantMediaTicketPayload & {
  subject: "enterprise";
  profileId: string;
  accountId: string;
  accountRole: "administrator" | "employee";
  enterpriseSessionId: string;
  sessionKey: string;
  agentId: string;
};

type VerifiedAssistantMediaTicket =
  | { kind: "operator" }
  | {
      kind: "enterprise";
      principal: EnterpriseAssistantMediaPrincipal;
      sessionKey: string;
      agentId: string;
    };

function signAssistantMediaTicketPayload(encodedPayload: string): string {
  return createHmac("sha256", controlUiAssistantMediaTicketSecret)
    .update(encodedPayload)
    .digest("base64url");
}

function createAssistantMediaTicket(
  source: string,
  enterprise:
    | {
        principal: EnterpriseAssistantMediaPrincipal;
        sessionKey: string;
        agentId: string;
      }
    | undefined,
  nowMs = Date.now(),
) {
  const now = asDateTimestampMs(nowMs);
  if (now === undefined) {
    return {};
  }
  const exp = asDateTimestampMs(now + CONTROL_UI_ASSISTANT_MEDIA_TICKET_TTL_MS);
  if (exp === undefined) {
    return {};
  }
  const payload: OperatorAssistantMediaTicketPayload | EnterpriseAssistantMediaTicketPayload = {
    scope: CONTROL_UI_ASSISTANT_MEDIA_TICKET_SCOPE,
    source,
    exp,
    ...(enterprise
      ? {
          subject: "enterprise" as const,
          profileId: enterprise.principal.profileId,
          accountId: enterprise.principal.accountId,
          accountRole: enterprise.principal.accountRole,
          enterpriseSessionId: enterprise.principal.sessionId,
          sessionKey: enterprise.sessionKey,
          agentId: enterprise.agentId,
        }
      : {}),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signAssistantMediaTicketPayload(encodedPayload);
  return {
    mediaTicket: `${enterprise ? "v2" : "v1"}.${encodedPayload}.${sig}`,
    mediaTicketExpiresAt: resolveTimestampMsToIsoString(exp),
  };
}

function verifyAssistantMediaTicket(
  ticket: string | null,
  source: string,
  nowMs = Date.now(),
): VerifiedAssistantMediaTicket | null {
  const now = asDateTimestampMs(nowMs);
  if (now === undefined) {
    return null;
  }
  const parts = ticket?.split(".");
  if (!parts || parts.length !== 3 || (parts[0] !== "v1" && parts[0] !== "v2")) {
    return null;
  }
  const [version, encodedPayload, sig] = parts;
  if (!encodedPayload || !sig) {
    return null;
  }
  const expectedSig = signAssistantMediaTicketPayload(encodedPayload);
  if (!safeEqualSecret(sig, expectedSig)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<EnterpriseAssistantMediaTicketPayload>;
    const commonValid =
      payload.scope === CONTROL_UI_ASSISTANT_MEDIA_TICKET_SCOPE &&
      payload.source === source &&
      typeof payload.exp === "number" &&
      Number.isFinite(payload.exp) &&
      payload.exp >= now;
    if (!commonValid) {
      return null;
    }
    if (version === "v1") {
      return payload.subject === undefined ? { kind: "operator" } : null;
    }
    return payload.subject === "enterprise" &&
      typeof payload.profileId === "string" &&
      typeof payload.accountId === "string" &&
      (payload.accountRole === "administrator" || payload.accountRole === "employee") &&
      typeof payload.enterpriseSessionId === "string" &&
      typeof payload.sessionKey === "string" &&
      typeof payload.agentId === "string"
      ? {
          kind: "enterprise",
          principal: {
            profileId: payload.profileId,
            accountId: payload.accountId,
            accountRole: payload.accountRole,
            sessionId: payload.enterpriseSessionId,
          },
          sessionKey: payload.sessionKey,
          agentId: payload.agentId,
        }
      : null;
  } catch {
    return null;
  }
}

type EnterpriseAssistantMediaScope = {
  principal: EnterpriseAssistantMediaPrincipal;
  sessionKey: string;
  agentId: string;
  workspaceRoot: string;
  target: NonNullable<ReturnType<typeof resolveSessionSharingTarget>>;
};

function assistantMediaPathDenied(): Error {
  return Object.assign(new Error("assistant media path is outside the authorized session"), {
    code: "path-not-allowed",
  });
}

function resolveWorkspaceRelativePath(root: string, candidate: string): string | null {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    return relative === "" ? "" : null;
  }
  return relative.split(path.sep).join("/");
}

function mapSessionWorkspaceSource(source: string, workspaceRoot: string): string {
  const normalized = normalizeMediaReferenceSource(source);
  if (normalized !== "/workspace" && !normalized.startsWith("/workspace/")) {
    return normalized;
  }
  const relative = normalized.slice("/workspace".length).replace(/^\/+/, "");
  const candidate = path.resolve(workspaceRoot, ...relative.split("/").filter(Boolean));
  if (resolveWorkspaceRelativePath(workspaceRoot, candidate) === null) {
    throw assistantMediaPathDenied();
  }
  return candidate;
}

async function resolveEnterpriseAssistantMediaScope(params: {
  config: OpenClawConfig | undefined;
  principal: EnterpriseAssistantMediaPrincipal;
  sessionKey: string | null;
  expectedAgentId?: string;
}): Promise<EnterpriseAssistantMediaScope | null> {
  const sessionKey = params.sessionKey?.trim();
  if (!params.config || !sessionKey) {
    return null;
  }
  const account = getEnterpriseAccountById(params.principal.accountId);
  const authSession = getActiveEnterpriseSession(params.principal.sessionId, {}, "user");
  if (
    !account?.enabled ||
    account.mustChangePassword ||
    account.profileId !== params.principal.profileId ||
    account.role !== params.principal.accountRole ||
    !authSession ||
    authSession.accountId !== account.id
  ) {
    return null;
  }
  const config = params.config;
  const client = createEnterpriseUserGatewayClient(account, params.principal.sessionId);
  const target = resolveSessionSharingTarget({ cfg: config, sessionKey });
  const filter = createSessionListEntryFilter({ cfg: config, client });
  if (
    !target ||
    (filter && !filter(target.canonicalKey, target.entry)) ||
    (params.expectedAgentId && target.agentId !== params.expectedAgentId) ||
    !resolveEnterpriseUserAgentKey(config, account, target.agentId)
  ) {
    return null;
  }
  const accountAgentWorkspace = resolveEnterpriseWorkspacePath(account.profileId, target.agentId);
  // HTTP reads must use the same account workspace as the projected chat runtime
  // when the session does not pin its own workspace.
  const workspaceRoot = resolveLocalSessionWorkspaceRoot({
    defaultWorkspaceDir: accountAgentWorkspace,
    cfg: config,
    sessionKey: target.canonicalKey,
    agentId: target.agentId,
  });
  if (!workspaceRoot) {
    return null;
  }
  if (resolveWorkspaceRelativePath(accountAgentWorkspace, workspaceRoot) === null) {
    return null;
  }
  return {
    principal: params.principal,
    sessionKey: target.canonicalKey,
    agentId: target.agentId,
    workspaceRoot: path.resolve(workspaceRoot),
    target,
  };
}

function collectTranscriptMediaSources(message: unknown): string[] {
  if (!message || typeof message !== "object") {
    return [];
  }
  const sources = new Set<string>();
  for (const fact of readPersistedMediaFacts(message as object) ?? []) {
    if (fact.path) {
      sources.add(fact.path);
    }
    if (fact.url) {
      sources.add(fact.url);
    }
  }
  const content = (message as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return [...sources];
  }
  for (const rawBlock of content) {
    if (!rawBlock || typeof rawBlock !== "object") {
      continue;
    }
    const block = rawBlock as Record<string, unknown>;
    for (const key of ["url", "openUrl", "path"] as const) {
      if (typeof block[key] === "string") {
        sources.add(block[key] as string);
      }
    }
    const imageUrl = block.image_url;
    if (typeof imageUrl === "string") {
      sources.add(imageUrl);
    } else if (
      imageUrl &&
      typeof imageUrl === "object" &&
      typeof (imageUrl as { url?: unknown }).url === "string"
    ) {
      sources.add((imageUrl as { url: string }).url);
    }
    const source = block.source;
    if (source && typeof source === "object") {
      for (const value of [
        (source as { url?: unknown }).url,
        (source as { path?: unknown }).path,
      ]) {
        if (typeof value === "string") {
          sources.add(value);
        }
      }
    }
  }
  return [...sources];
}

async function sessionTranscriptReferencesSource(
  scope: EnterpriseAssistantMediaScope,
  source: string,
  requestedPath: string,
): Promise<boolean> {
  const sessionId = scope.target.entry.sessionId;
  if (!sessionId) {
    return false;
  }
  const normalizedSource = normalizeMediaReferenceSource(source);
  const read = await readSessionMessagesWithSourceAsync(
    {
      agentId: scope.agentId,
      sessionEntry: scope.target.entry,
      sessionId,
      sessionKey: scope.sessionKey,
      storePath: scope.target.storePath,
    },
    {
      mode: "full",
      reason: "enterprise assistant media ownership",
      allowResetArchiveFallback: true,
    },
  );
  for (const message of read.messages) {
    for (const candidate of collectTranscriptMediaSources(message)) {
      if (normalizeMediaReferenceSource(candidate) === normalizedSource) {
        return true;
      }
      try {
        const candidatePath = await resolveMediaReferenceLocalPath(candidate);
        if (path.resolve(candidatePath) === path.resolve(requestedPath)) {
          return true;
        }
      } catch {
        // Malformed or stale transcript references never grant access.
      }
    }
  }
  return false;
}

async function prepareEnterpriseAssistantMediaSource(
  scope: EnterpriseAssistantMediaScope,
  source: string,
): Promise<{ source: string; localRoots: readonly string[]; workspacePath?: string }> {
  const mappedSource = mapSessionWorkspaceSource(source, scope.workspaceRoot);
  const localPath = await resolveMediaReferenceLocalPath(mappedSource);
  const workspacePath = resolveWorkspaceRelativePath(scope.workspaceRoot, localPath);
  if (
    workspacePath === null &&
    !(await sessionTranscriptReferencesSource(scope, source, localPath))
  ) {
    throw assistantMediaPathDenied();
  }
  return {
    source: mappedSource,
    localRoots: [scope.workspaceRoot],
    ...(workspacePath !== null ? { workspacePath } : {}),
  };
}

function classifyAssistantMediaError(err: unknown): AssistantMediaAvailability {
  if (err instanceof FsSafeError) {
    switch (err.code) {
      case "not-found":
        return { available: false, code: "file-not-found", reason: "File not found" };
      case "not-file":
        return { available: false, code: "not-a-file", reason: "Not a file" };
      case "invalid-path":
      case "path-mismatch":
      case "symlink":
        return { available: false, code: "invalid-file", reason: "Invalid file" };
      default:
        return {
          available: false,
          code: "attachment-unavailable",
          reason: "Attachment unavailable",
        };
    }
  }
  if (err instanceof Error && "code" in err) {
    const errorCode = (err as { code?: unknown }).code;
    switch (typeof errorCode === "string" ? errorCode : "") {
      case "path-not-allowed":
        return {
          available: false,
          code: "outside-allowed-folders",
          reason: "Outside allowed folders",
        };
      case "invalid-file-url":
      case "invalid-path":
      case "unsafe-bypass":
      case "network-path-not-allowed":
      case "invalid-root":
        return { available: false, code: "blocked-local-file", reason: "Blocked local file" };
      case "not-found":
        return { available: false, code: "file-not-found", reason: "File not found" };
      case "not-file":
        return { available: false, code: "not-a-file", reason: "Not a file" };
      default:
        break;
    }
  }
  return { available: false, code: "attachment-unavailable", reason: "Attachment unavailable" };
}

async function resolveAssistantMediaAvailability(
  source: string,
  localRoots: readonly string[],
  workspacePath?: string,
): Promise<AssistantMediaAvailability> {
  try {
    const localPath = await resolveMediaReferenceLocalPath(source);
    await assertLocalMediaAllowed(localPath, localRoots);
    const opened = await openLocalFileSafely({ filePath: localPath });
    try {
      const sizeBytes = opened.stat.size;
      let mimeType: string | undefined;
      try {
        const sniffLength = Math.min(sizeBytes, 8192);
        const sniffBuffer = sniffLength > 0 ? Buffer.allocUnsafe(sniffLength) : undefined;
        const bytesRead = sniffBuffer
          ? await readFileWindowFully(opened.handle, sniffBuffer, 0)
          : 0;
        mimeType =
          (await detectMime({
            buffer: sniffBuffer?.subarray(0, bytesRead),
            filePath: localPath,
          })) ?? undefined;
      } catch {
        // Availability is authoritative; optional metadata remains best-effort.
      }
      const mediaKind = kindFromMime(mimeType);
      const playbackProbe =
        mediaKind === "audio" || mediaKind === "video"
          ? await probePlaybackMediaFileDescriptor(opened.handle.fd, mediaKind)
          : null;
      const probe: MediaProbeResult = playbackProbe
        ? {
            ...(playbackProbe.durationMs ? { durationMs: playbackProbe.durationMs } : {}),
            ...(playbackProbe.width && playbackProbe.height
              ? { width: playbackProbe.width, height: playbackProbe.height }
              : {}),
          }
        : {};
      const playback =
        mimeType && (mediaKind === "audio" || mediaKind === "video")
          ? await resolvePlaybackModeForSource({
              sourcePath: opened.realPath,
              sourceStat: opened.stat,
              mimeType,
              kind: mediaKind,
              probe: playbackProbe,
            })
          : undefined;
      return {
        available: true,
        ...(mimeType ? { mimeType } : {}),
        ...(playback ? { playback } : {}),
        sizeBytes,
        ...(workspacePath !== undefined ? { workspacePath } : {}),
        ...probe,
      };
    } finally {
      await opened.handle.close().catch(() => {});
    }
  } catch (err) {
    return classifyAssistantMediaError(err);
  }
}

export async function handleControlUiAssistantMediaRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts?: {
    basePath?: string;
    config?: OpenClawConfig;
    agentId?: string;
    auth?: ResolvedGatewayAuth;
    trustedProxies?: string[];
    allowRealIpFallback?: boolean;
    rateLimiter?: AuthRateLimiter;
  },
): Promise<boolean> {
  const urlRaw = req.url;
  if (!urlRaw || !isReadHttpMethod(req.method)) {
    return false;
  }
  const url = new URL(urlRaw, "http://localhost");
  if (url.pathname !== resolveAssistantMediaRoutePath(opts?.basePath)) {
    return false;
  }

  applyControlUiSecurityHeaders(res);
  const source = normalizeAssistantMediaSource(url.searchParams.get("source") ?? "");
  if (!source) {
    respondControlUiNotFound(res);
    return true;
  }
  const isMetaRequest = url.searchParams.get("meta") === "1";
  const requestedSessionKey = url.searchParams.get("sessionKey")?.trim() || null;
  const verifiedTicket = isMetaRequest
    ? null
    : verifyAssistantMediaTicket(url.searchParams.get("mediaTicket"), source);
  if (verifiedTicket?.kind === "operator" && opts?.auth?.mode === "accounts") {
    respondPlainText(res, 401, "Unauthorized");
    return true;
  }
  let requestAuth: Awaited<ReturnType<typeof authorizeControlUiReadRequestOrReply>> = null;
  if (!verifiedTicket) {
    requestAuth = await authorizeControlUiReadRequestOrReply({
      req,
      res,
      auth: opts?.auth,
      trustedProxies: opts?.trustedProxies,
      allowRealIpFallback: opts?.allowRealIpFallback,
      rateLimiter: opts?.rateLimiter,
      allowQueryToken: true,
    });
    if (!requestAuth) {
      return true;
    }
  }

  let enterpriseScope: EnterpriseAssistantMediaScope | null = null;
  if (verifiedTicket?.kind === "enterprise") {
    if (requestedSessionKey !== verifiedTicket.sessionKey) {
      respondPlainText(res, 401, "Unauthorized");
      return true;
    }
    enterpriseScope = await resolveEnterpriseAssistantMediaScope({
      config: opts?.config,
      principal: verifiedTicket.principal,
      sessionKey: verifiedTicket.sessionKey,
      expectedAgentId: verifiedTicket.agentId,
    });
    if (!enterpriseScope) {
      respondPlainText(res, 401, "Unauthorized");
      return true;
    }
  } else if (requestAuth?.authMethod === "accounts") {
    const enterprisePrincipal =
      typeof requestAuth.profileId === "string" &&
      typeof requestAuth.enterpriseAccountId === "string" &&
      (requestAuth.accountRole === "administrator" || requestAuth.accountRole === "employee") &&
      typeof requestAuth.enterpriseSessionId === "string"
        ? {
            profileId: requestAuth.profileId,
            accountId: requestAuth.enterpriseAccountId,
            accountRole: requestAuth.accountRole,
            sessionId: requestAuth.enterpriseSessionId,
          }
        : null;
    enterpriseScope = enterprisePrincipal
      ? await resolveEnterpriseAssistantMediaScope({
          config: opts?.config,
          principal: enterprisePrincipal,
          sessionKey: requestedSessionKey,
        })
      : null;
    if (!enterpriseScope) {
      if (isMetaRequest) {
        sendJson(res, 200, {
          available: false,
          code: "attachment-unavailable",
          reason: "Attachment unavailable",
        } satisfies AssistantMediaAvailability);
      } else {
        respondControlUiNotFound(res);
      }
      return true;
    }
  }

  let effectiveSource = source;
  let localRoots: readonly string[] = opts?.config
    ? getAgentScopedMediaLocalRoots(opts.config, opts.agentId)
    : getDefaultLocalRootsCore();
  let workspacePath: string | undefined;
  if (enterpriseScope) {
    try {
      const prepared = await prepareEnterpriseAssistantMediaSource(enterpriseScope, source);
      effectiveSource = prepared.source;
      localRoots = prepared.localRoots;
      workspacePath = prepared.workspacePath;
    } catch (error) {
      if (isMetaRequest) {
        sendJson(res, 200, classifyAssistantMediaError(error));
      } else {
        respondControlUiNotFound(res);
      }
      return true;
    }
  }

  if (isMetaRequest) {
    const availability = await resolveAssistantMediaAvailability(
      effectiveSource,
      localRoots,
      workspacePath,
    );
    sendJson(
      res,
      200,
      availability.available
        ? {
            ...availability,
            ...createAssistantMediaTicket(
              source,
              enterpriseScope
                ? {
                    principal: enterpriseScope.principal,
                    sessionKey: enterpriseScope.sessionKey,
                    agentId: enterpriseScope.agentId,
                  }
                : undefined,
            ),
          }
        : availability,
    );
    return true;
  }

  let byteStream: ReturnType<typeof createGatewayByteStream> | undefined;
  try {
    const resolvedReference = await resolveMediaReferenceLocalPathInfo(effectiveSource);
    const localPath = resolvedReference.path;
    await assertLocalMediaAllowed(localPath, localRoots);
    let opened = await openLocalFileSafely({ filePath: localPath });
    byteStream = createGatewayByteStream(res, opened.handle, () => respondControlUiNotFound(res));
    const sniffLength = Math.min(opened.stat.size, 8192);
    const sniffBuffer = sniffLength > 0 ? Buffer.allocUnsafe(sniffLength) : undefined;
    const bytesRead =
      sniffBuffer && sniffLength > 0 ? await readFileWindowFully(opened.handle, sniffBuffer, 0) : 0;
    const mime = await detectMime({
      buffer: sniffBuffer?.subarray(0, bytesRead),
      filePath: localPath,
    });
    let contentType = mime ?? "application/octet-stream";
    let filename =
      resolvedReference.kind === "inbound"
        ? extractOriginalFilename(localPath)
        : path.basename(localPath);
    const mediaKind = kindFromMime(contentType);
    if (
      url.searchParams.get("playback") === "1" &&
      (mediaKind === "audio" || mediaKind === "video")
    ) {
      const playback = await resolvePlaybackTranscode({
        sourcePath: opened.realPath,
        sourceStat: opened.stat,
        mimeType: contentType,
        kind: mediaKind,
      });
      if (playback.kind === "preparing") {
        await byteStream.close();
        sendJson(res, 202, { status: "preparing" });
        return true;
      }
      if (playback.kind === "transcoded") {
        const transcoded = await openLocalFileSafely({ filePath: playback.path }).catch(() => null);
        if (transcoded) {
          await byteStream.close();
          opened = transcoded;
          byteStream = createGatewayByteStream(res, opened.handle, () =>
            respondControlUiNotFound(res),
          );
          contentType = playback.contentType;
          filename = replacePlaybackFileExtension(filename, playback.extension);
        }
      }
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      buildAssistantMediaContentDisposition(filename, contentType),
    );
    res.setHeader("Cache-Control", "no-cache");
    const byteResponse = resolveByteResponse({
      file: opened.stat,
      method: req.method,
      request: req,
    });
    writeByteHeaders(res, byteResponse);
    await byteStream.pipe(byteResponse, req.method);
    return true;
  } catch {
    await byteStream?.close();
    respondControlUiNotFound(res);
    return true;
  }
}

export async function handleControlUiAvatarRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: {
    basePath?: string;
    config: OpenClawConfig;
    auth?: ResolvedGatewayAuth;
    trustedProxies?: string[];
    allowRealIpFallback?: boolean;
    rateLimiter?: AuthRateLimiter;
  },
): Promise<boolean> {
  const urlRaw = req.url;
  if (!urlRaw) {
    return false;
  }
  if (!isReadHttpMethod(req.method)) {
    return false;
  }

  const url = new URL(urlRaw, "http://localhost");
  const basePath = normalizeControlUiBasePath(opts.basePath);
  const pathname = url.pathname;
  const parsed = parseControlUiResourcePath("agentAvatar", pathname, basePath);
  if (!parsed.matched) {
    return false;
  }

  applyControlUiSecurityHeaders(res);
  const agentId = parsed.value;
  if (!agentId || !isValidAgentPathSegment(agentId)) {
    respondControlUiNotFound(res);
    return true;
  }

  if (
    !(await authorizeControlUiReadRequestOrReply({
      req,
      res,
      auth: opts.auth,
      trustedProxies: opts.trustedProxies,
      allowRealIpFallback: opts.allowRealIpFallback,
      rateLimiter: opts.rateLimiter,
    }))
  ) {
    return true;
  }

  const identity = resolveAssistantIdentity({ cfg: opts.config, agentId });
  const projection = openGatewayAssistantAvatar({ cfg: opts.config, identity });
  const resolved = projection.resolution;

  if (url.searchParams.get("meta") === "1") {
    try {
      const meta = controlUiAvatarResolutionMeta(resolved);
      const avatarUrl =
        resolved?.kind === "local"
          ? buildControlUiResourcePath("agentAvatar", basePath, agentId)
          : resolved?.kind === "remote" || resolved?.kind === "data"
            ? resolved.url
            : null;
      sendJson(res, 200, {
        avatarUrl,
        avatarSource: meta.avatarSource,
        avatarStatus: meta.avatarStatus,
        avatarReason: meta.avatarReason,
      } satisfies ControlUiAvatarMeta);
    } finally {
      if (projection.openedFile) {
        fs.closeSync(projection.openedFile.fd);
      }
    }
    return true;
  }

  if (resolved?.kind !== "local" || !projection.openedFile) {
    respondControlUiNotFound(res);
    return true;
  }

  try {
    res.setHeader("Content-Type", resolveAvatarMime(projection.openedFile.path));
    res.setHeader("Cache-Control", "no-cache");
    if (req.method === "HEAD") {
      res.statusCode = 200;
      // The pinned descriptor exposes GET's exact byte count without reading the avatar.
      res.setHeader("Content-Length", String(projection.openedFile.stat.size));
      res.end();
      return true;
    }
    const body = await readFileDescriptorBounded(projection.openedFile.fd, AVATAR_MAX_BYTES);
    res.end(body);
    return true;
  } catch {
    respondControlUiNotFound(res);
    return true;
  } finally {
    fs.closeSync(projection.openedFile.fd);
  }
}

async function serveResolvedIndexHtml(
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
  basePath?: string,
  allowWasm?: boolean,
  environment?: ControlUiEnvironment,
) {
  const normalizedBasePath = normalizeControlUiBasePath(basePath);
  const withBasePath = rewriteControlUiIndexHtmlAssetHrefs(body, normalizedBasePath);
  // An empty base path is authoritative for Gateway resources even when the
  // router infers a namespace. Always emit it so resources stay root-mounted.
  const basePathAttribute = ` ${CONTROL_UI_BASE_PATH_ATTRIBUTE}="${escapeHtmlAttribute(normalizedBasePath)}"`;
  const environmentAttributes = environment
    ? ` ${CONTROL_UI_ENVIRONMENT_ATTRIBUTE}="${escapeHtmlAttribute(JSON.stringify(environment))}"`
    : "";
  // Let the app initialize fail-closed without guessing whether this document
  // was served with the terminal's WASM CSP allowance.
  const prepared = withBasePath.replace(
    /<html\b/i,
    `<html${basePathAttribute} ${CONTROL_UI_TERMINAL_ENABLED_ATTRIBUTE}="${allowWasm === true}"${environmentAttributes}`,
  );
  const hashes = computeInlineScriptHashes(prepared);
  // Always set the document CSP here (the index carries inline scripts) so the
  // terminal's WASM relaxation is applied to the page that loads ghostty-web.
  res.setHeader(
    "Content-Security-Policy",
    buildControlUiCspHeader({
      inlineScriptHashes: hashes,
      allowWasm,
      portalHost: req.headers.host,
    }),
  );
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  await sendControlUiHtmlBody(req, res, prepared);
}

function isExpectedSafePathError(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  return code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP";
}

function resolveSafeControlUiFile(
  rootReal: string,
  filePath: string,
  rejectHardlinks: boolean,
): { path: string; fd: number; size: number } | null {
  const opened = openRootFileSync({
    absolutePath: filePath,
    rootPath: rootReal,
    rootRealPath: rootReal,
    boundaryLabel: "control ui root",
    skipLexicalRootCheck: true,
    // Symlinked assets that resolve inside the root are served; fs-safe still
    // rejects hops whose canonical target escapes the control-ui root.
    rejectSymlinks: false,
    rejectHardlinks,
  });
  if (!opened.ok) {
    return matchRootFileOpenFailure(opened, {
      io: (failure) => {
        throw failure.error;
      },
      fallback: () => null,
    });
  }
  return { path: opened.path, fd: opened.fd, size: opened.stat.size };
}

function isSafeRelativePath(relPath: string) {
  if (!relPath) {
    return false;
  }
  const normalized = path.posix.normalize(relPath);
  if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(normalized)) {
    return false;
  }
  if (normalized.startsWith("../") || normalized === "..") {
    return false;
  }
  if (normalized.includes("\0")) {
    return false;
  }
  return true;
}

// Path served by the gateway under the default Control UI namespace when no
// `gateway.controlUi.basePath` is configured. The SPA is mounted at
// `/__openclaw__/`, so a browser that opens the default entry infers
// `/__openclaw__` as its base path (see `inferBasePathFromPathname`) and fetches
// `/__openclaw__/control-ui-config.json`. Accept that namespaced alias so the
// default entry resolves its bootstrap config instead of 404ing.
const CONTROL_UI_DEFAULT_NAMESPACE_BOOTSTRAP_CONFIG_PATH = `${CONTROL_UI_NAMESPACE_PREFIX.replace(
  /\/$/,
  "",
)}${CONTROL_UI_BOOTSTRAP_CONFIG_PATH}`;

// Single-underscore `/__openclaw` prefix used by the pre-base-path-relative
// bootstrap endpoint. Before #66946 made the config path base-path-relative,
// `CONTROL_UI_BOOTSTRAP_CONFIG_PATH` was hard-coded to
// `/__openclaw/control-ui-config.json`, so current main and the v2026.6.1
// release serve and document that exact path under an empty base path.
const LEGACY_CONTROL_UI_NAMESPACE_PREFIX = "/__openclaw";

// The old documented no-base-path bootstrap endpoint
// (`/__openclaw/control-ui-config.json`, single underscore). It is derived from
// the legacy `/__openclaw` namespace joined with the canonical config constant
// so it tracks any rename of the config filename. Kept as an empty-base-path
// compatibility alias so older bundles and clients that fetch the previously
// documented endpoint keep receiving config after upgrading instead of 404ing.
const LEGACY_BOOTSTRAP_CONFIG_PATH = `${LEGACY_CONTROL_UI_NAMESPACE_PREFIX}${CONTROL_UI_BOOTSTRAP_CONFIG_PATH}`;

/**
 * Whether `pathname` should be served the Control UI bootstrap config payload.
 *
 * The canonical endpoint is the configured base path joined with the shared
 * bootstrap constant (or the bare constant when no base path is configured).
 * For every base path (configured or empty) we additionally accept the legacy
 * single-underscore suffix `${basePath}/__openclaw/control-ui-config.json` that
 * current main and v2026.6.1 serve and document, so older bundles and clients
 * that still request the pre-#66946 endpoint keep receiving config after an
 * upgrade instead of 404ing. When no base path is configured we further accept
 * the default-namespace alias `/__openclaw__/control-ui-config.json`, which is
 * what the default `/__openclaw__/` entry requests after inferring its base path
 * from the URL. All compatibility endpoints are preserved; no path is removed.
 */
function matchesControlUiBootstrapConfigPath(pathname: string, basePath: string): boolean {
  // Canonical and legacy suffixes apply under both an empty and a configured
  // base path. `LEGACY_BOOTSTRAP_CONFIG_PATH` already starts with the legacy
  // `/__openclaw` namespace, so joining it with the base path yields
  // `${basePath}/__openclaw/control-ui-config.json` (or the bare legacy path
  // when no base path is configured).
  if (
    pathname === `${basePath}${CONTROL_UI_BOOTSTRAP_CONFIG_PATH}` ||
    pathname === `${basePath}${LEGACY_BOOTSTRAP_CONFIG_PATH}`
  ) {
    return true;
  }
  // The default `/__openclaw__/` namespace alias only applies when no base path
  // is configured; with a configured base path the canonical endpoint already
  // lives under that base path and this inferred alias does not apply.
  return basePath === "" && pathname === CONTROL_UI_DEFAULT_NAMESPACE_BOOTSTRAP_CONFIG_PATH;
}

export async function handleControlUiHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts?: ControlUiRequestOptions,
): Promise<boolean> {
  const urlRaw = req.url;
  if (!urlRaw) {
    return false;
  }
  const url = new URL(urlRaw, "http://localhost");
  const basePath = normalizeControlUiBasePath(opts?.basePath);
  const pathname = url.pathname;
  // The embedded terminal ships ghostty-web (WASM); the index CSP carries the
  // WASM relaxation whenever the terminal is enabled (the default) and stays
  // strict once operators opt out with gateway.terminal.enabled: false.
  const terminalEnabled = opts?.terminalEnabled ?? isTerminalConfigEnabled(opts?.config);
  const route = classifyControlUiRequest({
    basePath,
    pathname,
    search: url.search,
    method: req.method,
    accept: req.headers?.accept,
  });
  if (route.kind === "not-control-ui") {
    return false;
  }
  if (route.kind === "not-found") {
    applyControlUiSecurityHeaders(res);
    respondControlUiNotFound(res);
    return true;
  }
  if (route.kind === "redirect") {
    applyControlUiSecurityHeaders(res);
    res.statusCode = 302;
    res.setHeader("Location", route.location);
    res.end();
    return true;
  }

  applyControlUiSecurityHeaders(res);

  if (matchesControlUiBootstrapConfigPath(pathname, basePath)) {
    let pluginFrameGrants: readonly ControlUiPluginFrameGrantAck[] = [];
    const requestAuth = await authorizeControlUiReadRequestOrReply({
      req,
      res,
      auth: opts?.auth,
      trustedProxies: opts?.trustedProxies,
      allowRealIpFallback: opts?.allowRealIpFallback,
      rateLimiter: opts?.rateLimiter,
      onPluginFrameGrants: (grants) => {
        pluginFrameGrants = grants;
      },
    });
    if (!requestAuth) {
      return true;
    }
    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.end();
      return true;
    }
    const config = opts?.config;
    const resolvedIdentity = config
      ? resolveAssistantIdentity({ cfg: config, agentId: opts?.agentId })
      : undefined;
    const identity = resolvedIdentity ?? DEFAULT_ASSISTANT_IDENTITY;
    const assistantAgentId = resolvedIdentity?.agentId;
    const avatarProjection =
      config && resolvedIdentity
        ? resolveGatewayAssistantAvatar({ cfg: config, identity: resolvedIdentity })
        : { avatar: identity.avatar, resolution: null };
    const avatarMeta = controlUiAvatarResolutionMeta(avatarProjection.resolution);
    sendJson(res, 200, {
      basePath,
      assistantName: identity.name,
      assistantAvatar: avatarProjection.avatar,
      assistantAvatarSource: avatarMeta.avatarSource,
      assistantAvatarStatus: avatarMeta.avatarStatus,
      assistantAvatarReason: avatarMeta.avatarReason,
      ...(assistantAgentId ? { assistantAgentId } : {}),
      serverVersion: resolveRuntimeServiceVersion(process.env),
      serverBuildId:
        config?.gateway?.controlUi?.root === undefined
          ? (resolveRuntimeServiceBuildId() ?? undefined)
          : undefined,
      devGitBranch: (await resolveDevInstallGitBranch()) ?? undefined,
      localMediaPreviewRoots:
        requestAuth.authMethod === "accounts"
          ? []
          : [...getAgentScopedMediaLocalRoots(config ?? {}, assistantAgentId)],
      embedSandbox:
        config?.gateway?.controlUi?.embedSandbox === "trusted"
          ? "trusted"
          : config?.gateway?.controlUi?.embedSandbox === "strict"
            ? "strict"
            : "scripts",
      allowExternalEmbedUrls: config?.gateway?.controlUi?.allowExternalEmbedUrls === true,
      automaticallyFetchFavicons: config?.gateway?.controlUi?.automaticallyFetchFavicons !== false,
      seamColor: config?.ui?.seamColor,
      environment: config?.gateway?.controlUi?.environment,
      terminalEnabled,
      cliAgentsEnabled: config?.gateway?.cliAgents?.enabled === true,
      pluginFrameGrants: pluginFrameGrants.map(({ pluginId, path: grantPath, match }) => ({
        pluginId,
        path: grantPath,
        match,
      })),
    } satisfies ControlUiBootstrapConfig);
    return true;
  }

  const rootState = opts?.root;
  if (rootState?.kind === "invalid") {
    respondControlUiAssetsUnavailable(res, {
      configuredRootPath: rootState.path,
    });
    return true;
  }
  if (rootState?.kind === "preparing") {
    respondControlUiAssetsUnavailable(res, {
      preparing: true,
    });
    return true;
  }
  if (rootState?.kind === "failed") {
    respondControlUiAssetsUnavailable(res, {
      failed: true,
    });
    return true;
  }
  if (!rootState || rootState.kind === "missing") {
    respondControlUiAssetsUnavailable(res);
    return true;
  }

  const root = rootState.path;
  const rootReal = (() => {
    if (rootState.realPath) {
      return rootState.realPath;
    }
    try {
      return fs.realpathSync(root);
    } catch (error) {
      if (isExpectedSafePathError(error)) {
        return null;
      }
      throw error;
    }
  })();
  if (!rootReal) {
    respondControlUiAssetsUnavailable(res);
    return true;
  }

  const uiPath =
    basePath && pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname;
  const standaloneDocument =
    isControlUiApprovalDocumentPath({ basePath, pathname }) ||
    isControlUiFocusDocumentPath({ basePath, pathname });
  const rel = (() => {
    if (uiPath === ROOT_PREFIX) {
      return "";
    }
    if (uiPath.startsWith(CONTROL_UI_NAMESPACE_PREFIX)) {
      const namespacedRel = uiPath.slice(CONTROL_UI_NAMESPACE_PREFIX.length);
      if (isControlUiRootPublicAsset(namespacedRel)) {
        return namespacedRel;
      }
    }
    const assetsIndex = uiPath.indexOf("/assets/");
    if (assetsIndex >= 0) {
      return uiPath.slice(assetsIndex + 1);
    }
    return uiPath.slice(1);
  })();
  const requested = standaloneDocument
    ? "index.html"
    : rel && !rel.endsWith("/")
      ? rel
      : `${rel}index.html`;
  const fileRel = requested || "index.html";
  if (!isSafeRelativePath(fileRel)) {
    respondControlUiNotFound(res);
    return true;
  }
  const filePath = path.resolve(root, fileRel);
  if (!isWithinDir(root, filePath)) {
    respondControlUiNotFound(res);
    return true;
  }

  const isBundledRoot = rootState.kind === "bundled";
  // Bundled sidecars are implementation artifacts selected through
  // Accept-Encoding. Configured roots retain ordinary .br/.gz resources.
  if (
    isBundledRoot &&
    isControlUiPrecompressedAssetExtension(path.extname(fileRel).toLowerCase())
  ) {
    respondControlUiNotFound(res);
    return true;
  }
  const rejectHardlinks = !isBundledRoot;
  // Vite fingerprints every file emitted under the bundled assets directory.
  // Configured roots remain revalidated because their naming is not our contract.
  const immutableAsset = isBundledRoot && fileRel.startsWith("assets/");
  const safeFile = resolveSafeControlUiFile(rootReal, filePath, rejectHardlinks);
  if (safeFile) {
    if (path.basename(safeFile.path) === "index.html") {
      if (req.method === "HEAD") {
        try {
          const encoding = resolveControlUiHtmlEncoding(req);
          if (encoding === "not-acceptable") {
            respondControlUiNotAcceptable(res);
            return true;
          }
          respondHeadForControlUiFile(res, safeFile.path, {
            encoding: encoding === "identity" ? undefined : encoding,
          });
          return true;
        } finally {
          fs.closeSync(safeFile.fd);
        }
      }
      const body = await readAndCloseControlUiFileText(safeFile.fd);
      await serveResolvedIndexHtml(
        req,
        res,
        body,
        basePath,
        terminalEnabled,
        opts?.config?.gateway?.controlUi?.environment,
      );
      return true;
    }
    const representation = resolveOpenedControlUiRepresentation({
      req,
      sourceFile: safeFile,
      precompressed: immutableAsset,
      openPrecompressedFile: (compressedPath) =>
        resolveSafeControlUiFile(rootReal, compressedPath, false),
    });
    if (!representation) {
      respondControlUiNotAcceptable(res);
      return true;
    }
    if (req.method === "HEAD") {
      try {
        respondHeadForControlUiFile(res, representation.contentPath, {
          immutable: immutableAsset,
          encoding: representation.encoding,
          contentLength: representation.bodyFile.size,
        });
        return true;
      } finally {
        fs.closeSync(representation.bodyFile.fd);
      }
    }
    const body = await readAndCloseControlUiFile(representation.bodyFile.fd);
    await serveControlUiAsset(res, representation.contentPath, body, {
      immutable: immutableAsset,
      encoding: representation.encoding,
    });
    return true;
  }

  // If the requested path looks like a static asset (known extension), return
  // 404 rather than falling through to the SPA index.html fallback.  We check
  // against the same extension set used by the static response helper so
  // that dotted SPA routes (e.g. /user/jane.doe, /v2.0) still get the
  // client-side router fallback.
  if (isControlUiStaticAssetExtension(path.extname(fileRel).toLowerCase())) {
    respondControlUiNotFound(res);
    return true;
  }

  if (!route.spaFallback) {
    return false;
  }

  // SPA fallback (client-side router): serve index.html for unknown paths.
  const indexPath = path.join(root, "index.html");
  const safeIndex = resolveSafeControlUiFile(rootReal, indexPath, rejectHardlinks);
  if (safeIndex) {
    if (req.method === "HEAD") {
      try {
        const encoding = resolveControlUiHtmlEncoding(req);
        if (encoding === "not-acceptable") {
          respondControlUiNotAcceptable(res);
          return true;
        }
        respondHeadForControlUiFile(res, safeIndex.path, {
          encoding: encoding === "identity" ? undefined : encoding,
        });
        return true;
      } finally {
        fs.closeSync(safeIndex.fd);
      }
    }
    const body = await readAndCloseControlUiFileText(safeIndex.fd);
    await serveResolvedIndexHtml(
      req,
      res,
      body,
      basePath,
      terminalEnabled,
      opts?.config?.gateway?.controlUi?.environment,
    );
    return true;
  }

  respondControlUiNotFound(res);
  return true;
}
/* oxlint-disable max-lines -- TODO: split this grandfathered oversized file. */
