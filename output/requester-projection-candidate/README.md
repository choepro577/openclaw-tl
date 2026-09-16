# Requester Enterprise projection recovery candidate

## Root cause

`activateSubagentRegistry()` rebinds restored rows to the current host Gateway resolver. The Enterprise account projection is request scoped and held in a process-local WeakMap, so after a restart a durable requester key such as `agent:enterprise-personal-<hash>:...` resolves against the host roster. The host config does not contain that account-owned Personal Agent, which produces `Agent \"enterprise-personal-...\" no longer exists in configuration` during requester settle wake.

This is separate from child `chat.history` authorization and from a missing skill mount. It affects the final requester wake after the child results have already been frozen.

## Candidate change

- Reconstruct the account-owned Personal Agent projection at delivery from the deterministic Personal Agent id.
- Re-read the current account, `enabled`, `mustChangePassword`, `personalAgentEnabled`, and current Enterprise Agent entitlement before projecting.
- Reuse `projectEnterpriseRuntimeConfig()` and the existing account policy/skill/tool/workspace projection.
- Attach account-owned Enterprise metadata needed by the Personal Agent, delegation and Codex grant checks. No raw Enterprise bearer session is persisted or reconstructed; Knowledge authority is only attached for live sessions.
- Pass the projected context only for Enterprise Personal Agent requester keys. Shared/legacy requesters retain their existing resolver because no durable account owner can be inferred safely.
- If a Personal Agent account is unavailable, fail/retry the durable wake instead of falling back to the host roster or replaying business tools.

## Files

- `src/enterprise/isolation/enterprise-gateway-policy.ts`
- `src/agents/subagents/announce/subagent-announce.requester-settle-wake.ts`
- `src/enterprise/isolation/enterprise-background-projection.test.ts`

## Validation in scratch worktree

Worktree: `/tmp/openclaw-requester-projection-wt.76062`

- `pnpm exec vitest run src/enterprise/isolation/enterprise-background-projection.test.ts` — 2 passed
- `pnpm exec vitest run src/agents/subagents/announce/subagent-announce.requester-settle-wake.test.ts` — 80 passed
- `pnpm exec vitest run src/enterprise/isolation/enterprise-gateway-policy.test.ts` — 20 passed
- `pnpm tsgo:core` — passed
- `git diff --check` — passed

Patch SHA-256: `c728237e37d20f4fe18e9a167f75dc1b2b01482c9ff6605a23adbf3c414f8eec`

## Boundary

The candidate repairs requester-agent projection after restart. It does not alter child restart recovery, skill mount setup, or the prior direct transcript target patch. Knowledge operations require a live raw Enterprise session by contract; a post-restart completion wake therefore remains limited to the already-frozen findings and account-authorized runtime capabilities.
