// Resolves media paths from reply payloads into runtime attachment metadata.
import path from "node:path";
import { isPassThroughRemoteMediaSource } from "@openclaw/media-core/media-source-url";
import { resolveSendableOutboundReplyParts } from "openclaw/plugin-sdk/reply-payload";
import {
  sanitizeAgentRunTerminalReplyText,
  type AgentRunTerminalReplySnapshot,
} from "../../agents/agent-run-terminal-reply.js";
import { resolveSessionAgentId } from "../../agents/agent-scope.js";
import { resolvePathFromInput, toRelativeWorkspacePath } from "../../agents/path-policy.js";
import {
  assertMediaNotDataUrl,
  resolveAllowedManagedMediaPath,
  resolveSandboxedMediaSource,
} from "../../agents/sandbox-paths.js";
import { ensureSandboxWorkspaceForSession } from "../../agents/sandbox.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import { logVerbose } from "../../globals.js";
import { resolveOutboundMediaMaxBytes } from "../../media/configured-max-bytes.js";
import { resolveLocalMediaPath } from "../../media/local-media-path.js";
import { resolveOutboundAttachmentFromUrl } from "../../media/outbound-attachment.js";
import { resolveAgentScopedOutboundMediaAccess } from "../../media/read-capability.js";
import { extractOriginalFilename } from "../../media/store.js";
import { isSubagentSessionKey } from "../../routing/session-key.js";
import {
  appendReplyMediaFailureWarning,
  copyReplyPayloadMetadata,
  getReplyPayloadMetadata,
  isReplyPayloadTerminalContent,
  setReplyPayloadMetadata,
} from "../reply-payload.js";
import type { ReplyPayload } from "../types.js";
import {
  extractReplyFileReferences,
  stripReplyFileReferenceText,
} from "./reply-file-references.js";

const FILE_URL_RE = /^file:/i;
const WINDOWS_DRIVE_RE = /^[a-zA-Z]:[\\/]/;
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const HAS_FILE_EXT_RE = /\.\w{1,10}$/;

function isLikelyLocalMediaSource(media: string): boolean {
  return (
    FILE_URL_RE.test(media) ||
    media.startsWith("/") ||
    media.startsWith("./") ||
    media.startsWith("../") ||
    media.startsWith("~") ||
    WINDOWS_DRIVE_RE.test(media) ||
    media.startsWith("\\\\") ||
    (!SCHEME_RE.test(media) &&
      (media.includes("/") || media.includes("\\") || HAS_FILE_EXT_RE.test(media)))
  );
}

function getPayloadMediaList(payload: ReplyPayload): string[] {
  return resolveSendableOutboundReplyParts(payload).mediaUrls;
}

/** Private production proof survives host clones; serialized trust flags never grant reads. */
export function hasHostProducedReplyMediaSource(payload: ReplyPayload, source: string): boolean {
  const metadata = getReplyPayloadMetadata(payload);
  const canonicalSource = resolveLocalMediaPath(source) ?? source;
  return [
    ...(metadata?.hostProducedMediaSources ?? []),
    ...(metadata?.stagedFileSources?.map((entry) => entry.mediaUrl) ?? []),
  ].some((produced) => (resolveLocalMediaPath(produced) ?? produced) === canonicalSource);
}

export function createReplyMediaPathNormalizer(params: {
  cfg: OpenClawConfig;
  sessionKey?: string;
  agentId?: string;
  workspaceDir: string;
  messageProvider?: string;
  accountId?: string;
  groupId?: string;
  groupChannel?: string;
  groupSpace?: string;
  requesterSenderId?: string;
  requesterSenderName?: string;
  requesterSenderUsername?: string;
  requesterSenderE164?: string;
  sandboxRoot?: string;
}): (payload: ReplyPayload) => Promise<ReplyPayload> {
  // Prefer an explicit agentId so callers without a resolved sessionKey (e.g.
  // `openclaw agent --deliver` with `--reply-channel/--reply-to`) still get
  // the stricter agent-scoped file-read policy applied during staging.
  const agentId =
    params.agentId ??
    (params.sessionKey
      ? resolveSessionAgentId({ sessionKey: params.sessionKey, config: params.cfg })
      : undefined);
  const maxBytes = resolveOutboundMediaMaxBytes({
    cfg: params.cfg,
    channel: params.messageProvider,
    accountId: params.accountId,
  });
  const explicitSandboxRoot = params.sandboxRoot?.trim();
  let sandboxRootPromise: Promise<string | undefined> | undefined = explicitSandboxRoot
    ? Promise.resolve(explicitSandboxRoot)
    : undefined;
  const persistedMediaBySource = new Map<string, Promise<{ path: string; newlyPersisted: true }>>();

  const resolveSandboxRoot = async (): Promise<string | undefined> => {
    if (!sandboxRootPromise) {
      sandboxRootPromise = ensureSandboxWorkspaceForSession({
        config: params.cfg,
        sessionKey: params.sessionKey,
        workspaceDir: params.workspaceDir,
      }).then((sandbox) => sandbox?.workspaceDir);
    }
    return await sandboxRootPromise;
  };

  const resolveMediaAccessForSource = (media: string) =>
    resolveAgentScopedOutboundMediaAccess({
      cfg: params.cfg,
      agentId,
      workspaceDir: params.workspaceDir,
      mediaSources: [media],
      sessionKey: params.sessionKey,
      messageProvider: params.sessionKey ? undefined : params.messageProvider,
      accountId: params.accountId,
      requesterSenderId: params.requesterSenderId,
      requesterSenderName: params.requesterSenderName,
      requesterSenderUsername: params.requesterSenderUsername,
      requesterSenderE164: params.requesterSenderE164,
      groupId: params.groupId,
      groupChannel: params.groupChannel,
      groupSpace: params.groupSpace,
    });

  const persistLocalReplyMedia = async (
    media: string,
  ): Promise<{ path: string; newlyPersisted: boolean }> => {
    if (!isLikelyLocalMediaSource(media)) {
      return { path: media, newlyPersisted: false };
    }
    const managedMediaPath = await resolveAllowedManagedMediaPath(media);
    if (managedMediaPath) {
      return { path: managedMediaPath, newlyPersisted: false };
    }
    const cached = persistedMediaBySource.get(media);
    if (cached) {
      return await cached;
    }
    const persistPromise = resolveOutboundAttachmentFromUrl(media, maxBytes, {
      mediaAccess: resolveMediaAccessForSource(media),
    })
      .then((saved) => ({ path: saved.path, newlyPersisted: true as const }))
      .catch((err: unknown) => {
        persistedMediaBySource.delete(media);
        throw err;
      });
    persistedMediaBySource.set(media, persistPromise);
    return await persistPromise;
  };

  const resolveWorkspaceRelativeMedia = (media: string): string => {
    const relativeWorkspacePath = toRelativeWorkspacePath(params.workspaceDir, media, {
      cwd: params.workspaceDir,
    });
    return resolvePathFromInput(relativeWorkspacePath, params.workspaceDir);
  };

  const resolveAbsoluteWorkspaceMedia = (media: string): string | undefined => {
    if (FILE_URL_RE.test(media) || (!path.isAbsolute(media) && !WINDOWS_DRIVE_RE.test(media))) {
      return undefined;
    }
    try {
      return resolveWorkspaceRelativeMedia(media);
    } catch {
      return undefined;
    }
  };

  const normalizeMediaSource = async (
    raw: string,
  ): Promise<{ source: string; trustedLocalMedia: boolean }> => {
    const media = raw.trim();
    if (!media) {
      return { source: media, trustedLocalMedia: false };
    }
    assertMediaNotDataUrl(media);
    if (isPassThroughRemoteMediaSource(media)) {
      return { source: media, trustedLocalMedia: false };
    }
    const absoluteWorkspaceMedia = resolveAbsoluteWorkspaceMedia(media);
    if (absoluteWorkspaceMedia) {
      const persisted = await persistLocalReplyMedia(absoluteWorkspaceMedia);
      return { source: persisted.path, trustedLocalMedia: persisted.newlyPersisted };
    }
    const isRelativeLocalMedia =
      isLikelyLocalMediaSource(media) &&
      !FILE_URL_RE.test(media) &&
      !media.startsWith("~") &&
      !path.isAbsolute(media) &&
      !WINDOWS_DRIVE_RE.test(media);
    const sandboxRoot = await resolveSandboxRoot();
    if (sandboxRoot) {
      let sandboxResolvedMedia: string;
      try {
        sandboxResolvedMedia = await resolveSandboxedMediaSource({
          media,
          sandboxRoot,
        });
      } catch (err) {
        if (FILE_URL_RE.test(media)) {
          throw new Error(
            "Host-local MEDIA file URLs are blocked in normal replies. Use a safe path or the message tool.",
            { cause: err },
          );
        }
        throw err;
      }
      const persisted = await persistLocalReplyMedia(sandboxResolvedMedia);
      return { source: persisted.path, trustedLocalMedia: persisted.newlyPersisted };
    }
    if (isRelativeLocalMedia) {
      const persisted = await persistLocalReplyMedia(resolveWorkspaceRelativeMedia(media));
      return { source: persisted.path, trustedLocalMedia: persisted.newlyPersisted };
    }
    if (!isLikelyLocalMediaSource(media)) {
      return { source: media, trustedLocalMedia: false };
    }
    if (FILE_URL_RE.test(media)) {
      throw new Error(
        "Host-local MEDIA file URLs are blocked in normal replies. Use a safe path or the message tool.",
      );
    }
    const persisted = await persistLocalReplyMedia(media);
    return { source: persisted.path, trustedLocalMedia: persisted.newlyPersisted };
  };

  return async (payload) => {
    const fileReferences =
      payload.sensitiveMedia || payload.isReasoning ? [] : extractReplyFileReferences(payload.text);
    const mediaList = [
      ...new Set([
        ...getPayloadMediaList(payload),
        ...fileReferences.map((reference) => reference.source),
      ]),
    ];
    if (mediaList.length === 0) {
      return payload;
    }

    const normalizedMedia: string[] = [];
    const normalizedAttachments: NonNullable<ReplyPayload["attachments"]> = [];
    const inferredSources = new Set(fileReferences.map((reference) => reference.source));
    const seen = new Set<string>();
    const normalizedSources = new Map<string, string>();
    let firstMediaDropError: unknown;
    let sawNormalizedLocalMedia = false;
    let allNormalizedLocalMediaTrusted = true;
    for (const media of mediaList) {
      let normalized: Awaited<ReturnType<typeof normalizeMediaSource>>;
      try {
        const managedPath = await resolveAllowedManagedMediaPath(
          resolveLocalMediaPath(media) ?? media,
        );
        if (managedPath && !hasHostProducedReplyMediaSource(payload, managedPath)) {
          throw new Error(
            "Managed media requires host-produced provenance, not a model-provided path or trust flag.",
          );
        }
        normalized = await normalizeMediaSource(media);
      } catch (err) {
        firstMediaDropError ??= err;
        logVerbose(`dropping blocked reply media ${media}: ${String(err)}`);
        continue;
      }
      if (!normalized.source) {
        continue;
      }
      normalizedSources.set(media, normalized.source);
      if (seen.has(normalized.source)) {
        continue;
      }
      seen.add(normalized.source);
      normalizedMedia.push(normalized.source);
      const attachment =
        payload.attachments?.find((entry) =>
          [entry.path, entry.url, entry.mediaUrl, entry.filePath].includes(media),
        ) ?? payload.attachments?.[mediaList.indexOf(media)];
      normalizedAttachments.push({
        ...attachment,
        path: normalized.source,
        ...(inferredSources.has(media)
          ? {
              name:
                attachment?.name ??
                extractOriginalFilename(
                  FILE_URL_RE.test(media) ? decodeURIComponent(media) : media,
                ),
              // Successful local normalization either staged the file or validated its managed root.
              trustedLocalMedia: isLikelyLocalMediaSource(normalized.source),
            }
          : {}),
      });
      if (isLikelyLocalMediaSource(normalized.source)) {
        sawNormalizedLocalMedia = true;
        allNormalizedLocalMediaTrusted &&= normalized.trustedLocalMedia;
      }
    }

    const referenceText =
      payload.text === undefined
        ? undefined
        : stripReplyFileReferenceText(payload.text, fileReferences);
    const text =
      firstMediaDropError === undefined
        ? referenceText
        : appendReplyMediaFailureWarning(referenceText);

    if (normalizedMedia.length === 0) {
      return copyReplyPayloadMetadata(payload, {
        ...payload,
        text,
        mediaUrl: undefined,
        mediaUrls: undefined,
        attachments: undefined,
      });
    }

    return setReplyPayloadMetadata(
      copyReplyPayloadMetadata(payload, {
        ...payload,
        text,
        mediaUrl: normalizedMedia[0],
        mediaUrls: normalizedMedia,
        ...(fileReferences.length > 0 || payload.attachments
          ? { attachments: normalizedAttachments }
          : {}),
        ...(payload.trustedLocalMedia === true ||
        (sawNormalizedLocalMedia && allNormalizedLocalMediaTrusted)
          ? { trustedLocalMedia: true }
          : {}),
      }),
      {
        stagedFileSources: normalizedMedia.map((mediaUrl) => ({
          mediaUrl,
          sources: [
            ...new Set([
              ...(getReplyPayloadMetadata(payload)?.stagedFileSources?.find(
                (entry) => entry.mediaUrl === mediaUrl,
              )?.sources ?? []),
              ...[...normalizedSources]
                .filter(([, source]) => source === mediaUrl)
                .map(([source]) => source),
            ]),
          ],
        })),
      },
    );
  };
}

export type ReplyMediaContext = {
  normalizePayload: (payload: ReplyPayload) => Promise<ReplyPayload>;
};

export function createReplyMediaContext(
  params: Parameters<typeof createReplyMediaPathNormalizer>[0],
): ReplyMediaContext {
  return {
    normalizePayload: createReplyMediaPathNormalizer(params),
  };
}

/** Stage final file references while the producing session still owns its sandbox. */
export async function normalizeAgentRunReplyMedia(
  params: Parameters<typeof createReplyMediaPathNormalizer>[0] & {
    payloads?: ReplyPayload[];
    terminalReply?: AgentRunTerminalReplySnapshot;
    runId?: string;
    sessionId?: string;
  },
): Promise<{ payloads?: ReplyPayload[]; terminalReply?: AgentRunTerminalReplySnapshot }> {
  const normalize = createReplyMediaPathNormalizer(params);
  const payloads: ReplyPayload[] = [];
  for (const payload of params.payloads ?? []) {
    payloads.push(payload.sensitiveMedia ? payload : await normalize(payload));
  }
  let terminalReply = params.terminalReply;
  let terminalPayload: ReplyPayload | undefined;
  if (terminalReply?.disposition === "visible") {
    const terminalText = terminalReply.text;
    const terminalSource = params.payloads?.findLast(
      (payload) =>
        sanitizeAgentRunTerminalReplyText(payload.text ?? "") ===
        sanitizeAgentRunTerminalReplyText(terminalText),
    );
    if (
      terminalSource?.sensitiveMedia ||
      (terminalSource && !isReplyPayloadTerminalContent(terminalSource))
    ) {
      terminalReply = { disposition: "visible", text: stripReplyFileReferenceText(terminalText) };
    } else {
      const visiblePayloads = payloads.filter(
        (payload) => !payload.sensitiveMedia && isReplyPayloadTerminalContent(payload),
      );
      const input = setReplyPayloadMetadata(
        { text: terminalText },
        {
          hostProducedMediaSources: visiblePayloads.flatMap(
            (payload) => getReplyPayloadMetadata(payload)?.hostProducedMediaSources ?? [],
          ),
          stagedFileSources: visiblePayloads.flatMap(
            (payload) => getReplyPayloadMetadata(payload)?.stagedFileSources ?? [],
          ),
        },
      );
      terminalPayload = await normalize(input);
      terminalReply = { disposition: "visible", text: terminalPayload.text ?? terminalText };
      const deliveredSources = new Set(payloads.flatMap(getPayloadMediaList));
      const missingMedia = getPayloadMediaList(terminalPayload).filter(
        (source) => !deliveredSources.has(source),
      );
      if (missingMedia.length > 0) {
        payloads.push(
          copyReplyPayloadMetadata(terminalPayload, {
            ...terminalPayload,
            text: undefined,
            mediaUrl: missingMedia[0],
            mediaUrls: missingMedia,
            attachments: missingMedia.map(
              (source) =>
                terminalPayload?.attachments?.find((attachment) => attachment.path === source) ??
                {},
            ),
          }),
        );
      }
    }
  }
  const artifactPayloads = payloads.filter(
    (payload) =>
      !payload.sensitiveMedia &&
      !payload.isReasoning &&
      !payload.isCommentary &&
      getPayloadMediaList(payload).length > 0,
  );
  if (
    artifactPayloads.length > 0 &&
    params.runId &&
    params.sessionId &&
    params.agentId &&
    params.sessionKey &&
    isSubagentSessionKey(params.sessionKey)
  ) {
    try {
      const { stageRunReplyFiles } =
        await import("../../gateway/server-methods/chat-history-files.runtime.js");
      await stageRunReplyFiles({
        cfg: params.cfg,
        sessionKey: params.sessionKey,
        agentId: params.agentId,
        sessionId: params.sessionId,
        runId: params.runId,
        payloads: artifactPayloads,
      });
    } catch (error) {
      logVerbose(`reply file transcript staging failed: ${String(error)}`);
      if (terminalReply?.disposition === "visible") {
        terminalReply = {
          disposition: "visible",
          text: appendReplyMediaFailureWarning(terminalReply.text),
        };
      }
      for (const payload of payloads) {
        payload.text = appendReplyMediaFailureWarning(payload.text);
      }
    }
  }
  return { payloads: payloads.length > 0 ? payloads : params.payloads, terminalReply };
}
