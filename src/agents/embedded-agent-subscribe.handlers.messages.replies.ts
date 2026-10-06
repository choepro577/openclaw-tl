import path from "node:path";
/**
 * Owns pending assistant reply directives and tool-media handoff.
 */
import { uniqueStrings } from "@openclaw/normalization-core/string-normalization";
import { resolveSendableOutboundReplyParts } from "openclaw/plugin-sdk/reply-payload";
import {
  copyReplyPayloadMetadata,
  getReplyPayloadMetadata,
  setReplyPayloadMetadata,
} from "../auto-reply/reply-payload.js";
import type { ReplyDirectiveParseResult } from "../auto-reply/reply/reply-directives.js";
import { normalizeMediaReferenceForComparison } from "../media/media-reference-comparison.js";
import { readMediaBuffer, resolveMediaBufferPath } from "../media/store.js";
import type { BlockReplyPayload } from "./embedded-agent-payloads.js";
import type { EmbeddedAgentSubscribeState } from "./embedded-agent-subscribe.handlers.types.js";

export function hasReplyDirectiveMetadata(
  parsed: ReplyDirectiveParseResult | null | undefined,
): boolean {
  return Boolean(
    parsed &&
    ((parsed.mediaUrls?.length ?? 0) > 0 ||
      parsed.audioAsVoice ||
      parsed.replyToId ||
      parsed.replyToTag ||
      parsed.replyToCurrent),
  );
}

function hasReplyDirectiveMetadataResult(
  parsed: ReplyDirectiveParseResult | null | undefined,
): parsed is ReplyDirectiveParseResult {
  return hasReplyDirectiveMetadata(parsed);
}

export function mergeReplyDirectiveResults(
  first: ReplyDirectiveParseResult | null | undefined,
  second: ReplyDirectiveParseResult | null | undefined,
): ReplyDirectiveParseResult | null {
  if (!first) {
    return second ?? null;
  }
  if (!second) {
    return first;
  }
  const mediaUrls = uniqueStrings([...(first.mediaUrls ?? []), ...(second.mediaUrls ?? [])]);
  return {
    text: `${first.text ?? ""}${second.text ?? ""}`,
    mediaUrls: mediaUrls.length ? mediaUrls : undefined,
    replyToId: second.replyToId ?? first.replyToId,
    replyToCurrent: first.replyToCurrent || second.replyToCurrent,
    replyToTag: first.replyToTag || second.replyToTag,
    audioAsVoice: first.audioAsVoice || second.audioAsVoice || undefined,
    isSilent: first.isSilent || second.isSilent,
  };
}

function clearPendingToolMedia(
  state: Pick<
    EmbeddedAgentSubscribeState,
    | "pendingToolMediaUrls"
    | "pendingToolMediaAttachments"
    | "pendingToolMediaTrustByUrl"
    | "pendingToolStagedFileSources"
    | "pendingToolAudioAsVoice"
  >,
) {
  state.pendingToolMediaUrls = [];
  state.pendingToolMediaAttachments = [];
  state.pendingToolMediaTrustByUrl.clear();
  state.pendingToolStagedFileSources = state.pendingToolStagedFileSources?.filter(
    (entry) => entry.deliveredToSource,
  );
  state.pendingToolAudioAsVoice = false;
}

function hasReplyMedia(payload: BlockReplyPayload): boolean {
  return (payload.mediaUrls ?? []).some((url) => url.trim().length > 0);
}

function readAlignedPendingToolMedia(
  state: Pick<
    EmbeddedAgentSubscribeState,
    | "pendingToolMediaUrls"
    | "pendingToolMediaAttachments"
    | "pendingToolMediaTrustByUrl"
    | "pendingToolStagedFileSources"
  >,
) {
  const seen = new Set<string>();
  const mediaUrls: string[] = [];
  const attachments: NonNullable<BlockReplyPayload["attachments"]> = [];
  for (const [index, url] of state.pendingToolMediaUrls.entries()) {
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    mediaUrls.push(url);
    const { trustedLocalMedia: _untrustedInput, ...attachment } =
      state.pendingToolMediaAttachments?.[index] ?? {};
    attachments.push({
      ...attachment,
      ...(state.pendingToolMediaTrustByUrl.get(url) === true ? { trustedLocalMedia: true } : {}),
    });
  }
  return {
    mediaUrls,
    attachments: attachments.some((entry) => Object.keys(entry).length > 0)
      ? attachments
      : undefined,
  };
}

function markHostProducedToolMedia(
  state: Pick<
    EmbeddedAgentSubscribeState,
    "pendingToolMediaTrustByUrl" | "pendingToolStagedFileSources"
  >,
  payload: BlockReplyPayload,
): BlockReplyPayload {
  const sources = (payload.mediaUrls ?? []).filter(
    (url) => state.pendingToolMediaTrustByUrl.get(url.trim()) === true,
  );
  const delivered = (state.pendingToolStagedFileSources ?? []).filter(
    (entry) => entry.deliveredToSource,
  );
  if (sources.length === 0 && delivered.length === 0) {
    return payload;
  }
  const stagedFileSources = (state.pendingToolStagedFileSources ?? []).filter(
    (entry) => entry.deliveredToSource || sources.includes(entry.mediaUrl),
  );
  return setReplyPayloadMetadata(payload, {
    ...(stagedFileSources.length > 0 ? { stagedFileSources } : {}),
    hostProducedMediaSources: [
      ...new Set([
        ...(getReplyPayloadMetadata(payload)?.hostProducedMediaSources ?? []),
        ...sources,
        ...delivered.map((entry) => entry.mediaUrl),
      ]),
    ],
  });
}

/** Moves queued tool media into a non-reasoning assistant reply payload. */
export function consumePendingToolMediaIntoReply(
  state: Pick<
    EmbeddedAgentSubscribeState,
    | "pendingToolMediaUrls"
    | "pendingToolMediaAttachments"
    | "pendingToolMediaTrustByUrl"
    | "pendingToolStagedFileSources"
    | "pendingToolAudioAsVoice"
  >,
  payload: BlockReplyPayload,
): BlockReplyPayload {
  if (payload.isReasoning) {
    return payload;
  }
  if (state.pendingToolMediaUrls.length === 0 && !state.pendingToolAudioAsVoice) {
    return markHostProducedToolMedia(state, payload);
  }
  if (hasReplyMedia(payload)) {
    // Pending tool media is a fallback delivery queue; explicit final media is
    // the assistant's user-visible selection, while tool output remains in the transcript.
    const alignedPendingMedia = readAlignedPendingToolMedia(state);
    const metadataByUrl = new Map(
      alignedPendingMedia.mediaUrls.map((url, index) => [
        url,
        alignedPendingMedia.attachments?.[index] ?? {},
      ]),
    );
    const selectedAttachments = (payload.mediaUrls ?? []).map(
      (url) => metadataByUrl.get(url.trim()) ?? {},
    );
    const allSelectedMediaIsPending =
      (payload.mediaUrls?.length ?? 0) > 0 &&
      (payload.mediaUrls ?? []).every((url) => metadataByUrl.has(url.trim()));
    const payloadWithMetadata =
      payload.attachments?.length ||
      selectedAttachments.every((entry) => Object.keys(entry).length === 0)
        ? payload
        : { ...payload, attachments: selectedAttachments };
    const selectedPayload =
      allSelectedMediaIsPending &&
      (payload.mediaUrls ?? []).every(
        (url) => state.pendingToolMediaTrustByUrl.get(url.trim()) === true,
      )
        ? { ...payloadWithMetadata, trustedLocalMedia: true }
        : payloadWithMetadata;
    const trustedPayload = markHostProducedToolMedia(
      state,
      copyReplyPayloadMetadata(payload, selectedPayload),
    );
    clearPendingToolMedia(state);
    return trustedPayload;
  }
  const pendingMedia = readAlignedPendingToolMedia(state);
  const allPendingMediaTrusted =
    pendingMedia.mediaUrls.length > 0 &&
    pendingMedia.mediaUrls.every((url) => state.pendingToolMediaTrustByUrl.get(url) === true);
  const mergedPayload: BlockReplyPayload = {
    ...payload,
    mediaUrls: pendingMedia.mediaUrls.length ? pendingMedia.mediaUrls : undefined,
    attachments: pendingMedia.attachments,
    audioAsVoice: payload.audioAsVoice || state.pendingToolAudioAsVoice || undefined,
    ...(payload.trustedLocalMedia || allPendingMediaTrusted ? { trustedLocalMedia: true } : {}),
  };
  const trustedPayload = markHostProducedToolMedia(
    state,
    copyReplyPayloadMetadata(payload, mergedPayload),
  );
  clearPendingToolMedia(state);
  return trustedPayload;
}

/** Restores reserved tool media after its outbound delivery was rejected. */
export function restorePendingToolMediaReply(
  state: Pick<
    EmbeddedAgentSubscribeState,
    | "pendingToolMediaUrls"
    | "pendingToolMediaAttachments"
    | "pendingToolMediaTrustByUrl"
    | "pendingToolStagedFileSources"
    | "pendingToolAudioAsVoice"
    | "pendingToolMediaDeliveryFailed"
  >,
  payload: BlockReplyPayload,
): void {
  state.pendingToolStagedFileSources = [
    ...(state.pendingToolStagedFileSources ?? []),
    ...(getReplyPayloadMetadata(payload)?.stagedFileSources ?? []),
  ];
  const pendingUrls = state.pendingToolMediaUrls;
  const pendingAttachments = state.pendingToolMediaAttachments ?? [];
  const restoredUrls = payload.mediaUrls ?? [];
  const restoredAttachments = payload.attachments ?? [];
  const seen = new Set(restoredUrls);
  state.pendingToolMediaUrls = [...restoredUrls, ...pendingUrls.filter((url) => !seen.has(url))];
  state.pendingToolMediaAttachments = [
    ...restoredUrls.map((_, index) => restoredAttachments[index] ?? {}),
    ...pendingUrls.flatMap((url, index) =>
      seen.has(url) ? [] : [pendingAttachments[index] ?? {}],
    ),
  ];
  const hostProduced = new Set([
    ...(getReplyPayloadMetadata(payload)?.hostProducedMediaSources ?? []),
    ...(getReplyPayloadMetadata(payload)?.stagedFileSources?.map((entry) => entry.mediaUrl) ?? []),
  ]);
  for (const url of restoredUrls) {
    if (hostProduced.has(url)) {
      state.pendingToolMediaTrustByUrl.set(url, true);
    } else if (!state.pendingToolMediaTrustByUrl.has(url)) {
      state.pendingToolMediaTrustByUrl.set(url, false);
    }
  }
  state.pendingToolAudioAsVoice ||= payload.audioAsVoice === true;
  state.pendingToolMediaDeliveryFailed = true;
}

/** Reads queued tool media without clearing it. */
export function readPendingToolMediaReply(
  state: Pick<
    EmbeddedAgentSubscribeState,
    | "pendingToolMediaUrls"
    | "pendingToolMediaAttachments"
    | "pendingToolMediaTrustByUrl"
    | "pendingToolStagedFileSources"
    | "pendingToolAudioAsVoice"
  >,
): BlockReplyPayload | null {
  if (
    state.pendingToolMediaUrls.length === 0 &&
    !state.pendingToolAudioAsVoice &&
    !state.pendingToolStagedFileSources?.some((entry) => entry.deliveredToSource)
  ) {
    return null;
  }
  const pendingMedia = readAlignedPendingToolMedia(state);
  const allPendingMediaTrusted =
    pendingMedia.mediaUrls.length > 0 &&
    pendingMedia.mediaUrls.every((url) => state.pendingToolMediaTrustByUrl.get(url) === true);
  return markHostProducedToolMedia(state, {
    mediaUrls: pendingMedia.mediaUrls.length ? pendingMedia.mediaUrls : undefined,
    attachments: pendingMedia.attachments,
    audioAsVoice: state.pendingToolAudioAsVoice || undefined,
    ...(allPendingMediaTrusted ? { trustedLocalMedia: true } : {}),
  });
}

/** Successful current-source receipt retires only exact current-run produced snapshots. */
export async function markSentToolFiles(
  state: Pick<
    EmbeddedAgentSubscribeState,
    "pendingToolMediaUrls" | "pendingToolMediaAttachments" | "pendingToolStagedFileSources"
  >,
  sentMediaUrls: string[],
  deliveredMediaUrls: string[],
  workspaceDir?: string,
): Promise<void> {
  if (sentMediaUrls.length === 0 || sentMediaUrls.length !== deliveredMediaUrls.length) {
    return;
  }
  const key = (source: string) => {
    const value = normalizeMediaReferenceForComparison(source);
    return workspaceDir && !path.isAbsolute(value) && !/^[a-z][a-z0-9+.-]*:/i.test(value)
      ? path.resolve(workspaceDir, value)
      : value;
  };
  const readOwned = async (source: string) => {
    const expected = normalizeMediaReferenceForComparison(source);
    if (!path.isAbsolute(expected)) {
      throw new Error("Delivered file is not an owned local snapshot.");
    }
    const id = path.basename(expected);
    if (
      normalizeMediaReferenceForComparison(await resolveMediaBufferPath(id, "outbound")) !==
      expected
    ) {
      throw new Error("Delivered file is outside its exact media-store identity.");
    }
    const saved = await readMediaBuffer(id, "outbound");
    if (normalizeMediaReferenceForComparison(saved.path) !== expected) {
      throw new Error("Delivered file identity changed.");
    }
    return saved.buffer;
  };
  for (const entry of state.pendingToolStagedFileSources ?? []) {
    const index = sentMediaUrls.findIndex((sent) =>
      [entry.mediaUrl, ...entry.sources].some((source) => key(source) === key(sent)),
    );
    if (index < 0) {
      continue;
    }
    try {
      const [producedBytes, deliveredBytes] = await Promise.all([
        readOwned(entry.mediaUrl),
        readOwned(deliveredMediaUrls[index]!),
      ]);
      if (
        state.pendingToolStagedFileSources?.includes(entry) &&
        producedBytes.equals(deliveredBytes)
      ) {
        entry.deliveredToSource = true;
      }
    } catch {
      // Failure to prove the actual delivered bytes keeps the automatic candidate.
    }
  }
  const delivered = new Set(
    state.pendingToolStagedFileSources
      ?.filter((entry) => entry.deliveredToSource)
      .map((entry) => entry.mediaUrl),
  );
  removePendingToolMedia(state, delivered);
}

/** Keep queued URLs and restored attachment metadata paired when an owned snapshot is removed. */
export function removePendingToolMedia(
  state: Pick<EmbeddedAgentSubscribeState, "pendingToolMediaUrls" | "pendingToolMediaAttachments">,
  removed: ReadonlySet<string>,
): void {
  const remaining = state.pendingToolMediaUrls
    .map((url, index) => ({ url, attachment: state.pendingToolMediaAttachments?.[index] ?? {} }))
    .filter((entry) => !removed.has(entry.url));
  state.pendingToolMediaUrls = remaining.map((entry) => entry.url);
  if (state.pendingToolMediaAttachments) {
    state.pendingToolMediaAttachments = remaining.map((entry) => entry.attachment);
  }
}

export function recordPendingAssistantReplyDirectives(
  state: Pick<EmbeddedAgentSubscribeState, "pendingAssistantReplyDirectives">,
  parsed: ReplyDirectiveParseResult | null | undefined,
) {
  if (!hasReplyDirectiveMetadataResult(parsed)) {
    return;
  }
  const current = state.pendingAssistantReplyDirectives;
  const mediaUrls = Array.from(
    new Set([...(current?.mediaUrls ?? []), ...(parsed.mediaUrls ?? [])]),
  );
  state.pendingAssistantReplyDirectives = {
    mediaUrls: mediaUrls.length ? mediaUrls : undefined,
    audioAsVoice: current?.audioAsVoice || parsed?.audioAsVoice || undefined,
    replyToId: parsed?.replyToId ?? current?.replyToId,
    replyToTag: current?.replyToTag || parsed.replyToTag || undefined,
    replyToCurrent: current?.replyToCurrent || parsed.replyToCurrent || undefined,
  };
}

/** Merges pending reply directives into one reply payload and clears them. */
export function consumePendingAssistantReplyDirectivesIntoReply(
  state: Pick<EmbeddedAgentSubscribeState, "pendingAssistantReplyDirectives">,
  payload: BlockReplyPayload,
): BlockReplyPayload {
  if (payload.isReasoning || !state.pendingAssistantReplyDirectives) {
    return payload;
  }
  const pending = state.pendingAssistantReplyDirectives;
  const mediaUrls = Array.from(
    new Set([...(payload.mediaUrls ?? []), ...(pending.mediaUrls ?? [])]),
  );
  state.pendingAssistantReplyDirectives = undefined;
  return copyReplyPayloadMetadata(payload, {
    ...payload,
    mediaUrls: mediaUrls.length ? mediaUrls : undefined,
    audioAsVoice: payload.audioAsVoice || pending.audioAsVoice || undefined,
    replyToId: payload.replyToId ?? pending.replyToId,
    replyToTag: Boolean(payload.replyToTag || pending.replyToTag) || undefined,
    replyToCurrent: Boolean(payload.replyToCurrent || pending.replyToCurrent) || undefined,
  });
}

/** True when a reply payload has text, media, or voice content worth sending. */
export function hasAssistantVisibleReply(params: {
  text?: string;
  mediaUrls?: string[];
  mediaUrl?: string;
  audioAsVoice?: boolean;
}): boolean {
  return resolveSendableOutboundReplyParts(params).hasContent || Boolean(params.audioAsVoice);
}

/** Builds normalized stream payload data for assistant visible output. */
