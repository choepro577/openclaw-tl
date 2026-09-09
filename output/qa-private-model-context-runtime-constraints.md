# Private model context: runtime boundary

## Implemented boundary

The host keeps `resolvePrivateModelContext` as a process-only closure on the admitted attempt. It is removed from both public harness parameter types and plugin parameter projection. Neither the task nor `extraSystemPrompt` contains its result.

For the built-in OpenClaw HTTP/SSE transport, the existing guarded fetch owns network policy and DNS/dispatcher preparation. Its final `fetchImpl` callback resolves the excerpt package and rechecks admission immediately before each HTTP send, including SDK retries. The provider receives an added untrusted user-message copy; canonical context, prompt observers, and HTTP capture do not receive that copy. Non-success HTTP bodies and SSE error metadata are projected to safe errors because an upstream error may echo submitted excerpts. Unknown terminal statuses/incomplete reasons fail closed before SDK error handling or debug event peeks; known incomplete reasons retain actual answer output and numeric usage, not arbitrary diagnostic metadata.

Currently supported: boundary-aware `openai-responses`, `openai-completions`, and `anthropic-messages` HTTP/SSE requests. WebSocket/auto, custom streams, other APIs, redirect replay, native compaction endpoints, previous-response delta requests, and active debug proxy capture fail closed. This is an explicit incomplete-execution result, not a successful evidence handoff. No provider, model, binary, or transport setting is changed to evade this restriction.

## Why Codex cannot safely receive the package yet

The sibling Codex source inspected is commit `498d40b`.

1. [additional_context.rs:16](/Users/hieunguyenduc/workplace/outsource/assistant-tl/codex/codex-rs/core/src/state/additional_context.rs:16) merges `additionalContext` entries into native response items and retains the values. It is not an ephemeral per-request parameter.
2. [turn.rs:1418](/Users/hieunguyenduc/workplace/outsource/assistant-tl/codex/codex-rs/core/src/session/turn.rs:1418), `run_sampling_request`, contains its own retry loop. It clones native history and builds another prompt without a new OpenClaw `turn/start` call.
3. [turn.rs:2296](/Users/hieunguyenduc/workplace/outsource/assistant-tl/codex/codex-rs/core/src/session/turn.rs:2296) calls `ModelClientSession.stream` using the resolved model and provider. No OpenClaw per-model authorization callback is present at this boundary.
4. [session.rs:846](/Users/hieunguyenduc/workplace/outsource/assistant-tl/codex/codex-rs/core/src/session/session.rs:846) suppresses rollout persistence for `ephemeral`, but this does not remove in-memory history or authorize the next model request.

Example: grant permitted at `turn/start` → first native request gets evidence → Admin revokes grant → native retry reuses history. A check only before `turn/start` would still leak the second use. Therefore both core plugin selection and the Codex adapter reject private-context assignments before plugin execution/connection; normal non-private Codex turns are unchanged.

## Required upstream contract before enabling Codex transfers

An upstream host-controlled per-send private-context capability is required, not a mandatory dynamic tool prompt. It must:

- expose actual resolved model, provider, endpoint/transport and a unique send attempt identity to a host request immediately before every sampling send, including tool continuations, stream retries and provider fallback;
- wait for a correlated one-use allow/deny response, fail closed on disconnect/cancellation/timeout, and prevent a stale response from authorizing another request;
- add allowed untrusted text only to the outgoing provider request after rollout, telemetry and debug capture; never merge it into `AdditionalContextStore`, native history, compaction state or prompt diagnostics;
- enforce the host's byte/token limits without silent truncation;
- use ephemeral native thread persistence while retaining OpenClaw's normal durable child metadata.

Suggested upstream regression scenarios: grant revoked between initial request and retry; fallback selects a different provider; grant revoked after context resolution before send; host disconnect; early/duplicate allow response; competing native tool continuation; compaction; native rollout and diagnostic inspection with a unique private sentinel. The assertion must inspect actual provider requests, not merely `turn/start.additionalContext`.

## Verification boundary

Main task coordinates test execution. Added tests inspect a real local HTTP endpoint through the OpenAI SDK and the built-in native Responses stream, including SDK retry/revocation and diagnostic capture exclusion. The Codex regression asserts zero connection/start requests for a private-context assignment. Successful private evidence delivery through Codex is intentionally **not** claimed.
