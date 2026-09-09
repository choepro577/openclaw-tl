# Enterprise delegation — core repair and live UI validation

Validated on 2026-09-04, local Chrome, gateway `127.0.0.1:18789`, real Enterprise account `hieu`. Existing assignments/profiles were used; no mock specialist, demo gateway, replacement account, or business-data mutation was used for the live cases below.

## Outcome

Personal Agent Cốm calls the assigned specialists, waits for real child runs, and returns their results in the original conversation. Chat shows named lifecycle steps, including running, completed, and result delivered. A handoff acknowledgement alone never renders as completed.

Both a newly created conversation and the older conversation containing spent decision tokens now work. The older conversation exercised the bounded one-time internal correction; it was not reset or deleted.

## Core repairs

- Keep account-scoped runtime config through spawn, child dispatch, completion announcement, and provider preparation. Personal Agent runtime auth can inherit the configured template's pinned auth owner.
- Separate structurally equal request configs in the prepared-model-runtime owner cache: private metadata is outside serialized JSON, so matching JSON is not proof that two request authorities match.
- Generate routing directives at the actual attempt boundary, bound to the current Personal Agent, session, and parent run. Do not freeze decision tokens in workspace bootstrap files. Codex receives dynamic overlays through turn instructions rather than only thread creation.
- Keep original user input separate from the verifier proposal. Explicitly naming an eligible specialist is handoff consent, while tool mutations remain separately guarded. Verifier agreement must also satisfy confidence, margin, independence, and required-input checks.
- Permit one internal correction when the model supplies a historical token, only after the exact current request binding matches. The wrong token starts nothing. A second wrong attempt closes the correction path; correct submissions still pass live entitlement/profile/policy validation.
- Track accepted delegated runs through normal child-run/yield handling. WebChat final responses count as delivered without requiring an external messaging delivery.
- Expose only session-owned task reads to the Enterprise user portal. Drop unscoped/foreign task broadcasts. No user task-cancel permission was added.

Temporary diagnostic logs used to isolate the stale-token case were removed.

## UI behavior

- Expanded specialist handoff card with the real Agent name.
- Steps: handed off → working → completed → returned to Personal Agent.
- Separate failed, blocked, cancelled, timeout, and delivery-failure states.
- State comes from the matching session + Agent + child run, not from text claiming that work finished.
- No raw decision token, tool JSON, internal reason code, or fabricated reasoning trace in the card.
- Live task updates invalidate transcript rendering even when the chat messages themselves have not changed.
- Keyboard Enter closes/reopens the activity disclosure; completed status survives a page reload.
- English source strings use the existing i18n flow. Generated Vietnamese locale updates remain pending because authenticated translation sync was unavailable; no manual generated-locale edits were made.

## Live evidence

| Case                                                           | Result                                                                                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-0228: named HR specialist, 3 onboarding steps               | One child, succeeded and delivered. UI observed working → completed → returned without reload.                                                          |
| UI-0229: second request in the same conversation, HR + Finance | Two independent children, both succeeded and delivered. Personal returned 5 onboarding steps and 5 budget items totaling 10,000,000 VND.                |
| UI-0233: same task in the older conversation with spent tokens | One `retry_required` tool result, then one successful `enterprise_delegate`, then `sessions_yield`. Exactly two children; both succeeded and delivered. |
| Reload older conversation                                      | Both specialist names and completed/delivered steps remained correct.                                                                                   |
| Keyboard disclosure                                            | Enter collapsed and reopened the step group, with focus retained.                                                                                       |

Child run IDs:

- UI-0228 HR: `02ce85ce-5a5d-4a5e-8d7d-6c6f81869b54`.
- UI-0229 HR: `a1d8d6e4-4152-499d-bbd3-a25528e099ac`; Finance: `3d1485fe-9ac8-4438-8e7f-05b9a1c66178`.
- UI-0233 HR: `bea10455-ca66-4f2f-94dd-be6dbd100131`; Finance: `0eb53e13-daf1-420a-969e-cce7f8a31b12`. Start timestamps differ by 46 ms; execution intervals overlap.

The pre-fix failures remain in the conversation as evidence. They are not counted as successful runs.

## Automated validation

Runs overlap in coverage; counts below must not be added together as unique tests.

| Check                                                                                        | Result                                                               |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Delegation router/store/guard + narrow tools + Enterprise task-read isolation and broadcasts | 15 files, 271 tests passed before the final one-correction addition. |
| Final narrow-tool correction/scope/spawn regressions                                         | 2 project entries, 16 tests passed.                                  |
| Prepared-runtime cache/lifecycle + actual attempt-boundary directives                        | 6 project entries, 146 tests passed.                                 |
| Codex thread/turn prompt and runtime sibling coverage                                        | 3 files, 313 tests passed.                                           |
| Chat UI card/tool/background-task/message/transcript/view coverage                           | 6 files, 562 tests passed.                                           |
| Final UI wording/render smoke                                                                | 2 files, 29 tests passed.                                            |
| `pnpm tsgo:core`                                                                             | Passed.                                                              |
| `pnpm ui:build`                                                                              | Passed, including UI performance budgets.                            |
| `pnpm ui:i18n:baseline`, `pnpm ui:i18n:verify`                                               | Passed; raw-copy baseline remained 960 entries.                      |
| `pnpm lint:ui:styles`                                                                        | Passed.                                                              |
| `pnpm check:import-cycles`                                                                   | Passed; 0 runtime value cycles.                                      |
| `git diff --check`                                                                           | Passed.                                                              |

Final served entry asset: `/assets/index-DHgr_xbu.js`; its SHA-256 matches the local built asset.

Earlier scoped spawn/auth/announcement/isolation coverage also passed (21 project entries, 1,383 tests); later edits were rechecked at their affected boundaries as listed above.

## Boundaries and remaining acceptance work

- This is not a declaration that every gate in the original full rollout plan is green.
- `pnpm tsgo:ui` still reports existing duplicate Enterprise user translation properties and a models-page ApplicationContext cast error outside this repair.
- No live write/send/delete/exec approval was authorized or exercised in these final live cases; mutation guard behavior has automated coverage, not full live acceptance here.
- Final live visual verification was desktop Chrome/dark theme plus reload/keyboard disclosure. Full 390px/light/zoom/screen-reader acceptance remains to be rerun for this change.
- Full repository suites, migration-on-state-copy, activation rollback, and the complete GA pilot matrix have not all been rerun in this repair pass.
- The operator's dirty worktree and existing chat history were preserved; no commit/reset or broad formatting was performed.
