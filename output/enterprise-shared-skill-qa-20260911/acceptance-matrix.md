> Cập nhật cuối: xem [biên bản bản build cuối](nghiem-thu-ban-cuoi.md). Các trạng thái bên dưới ghi nhận từng mốc lịch sử; các ca live chỉ đọc trên bản cuối đã đạt ngày 12/09, gồm đúng phiên lỗi cũ; xem biên bản cuối để biết phạm vi và giới hạn.

# Enterprise shared-agent acceptance lane

This lane uses a copied SQLite/config state and a private loopback port. The
operator gateway on port 18789 and ~/.openclaw remain untouched. Run fixture
preparation before each build under test, then keep the generated qa-env.sh
path private.

The current copied fixture uses ordinary employee `hieu` with a generated
password stored at mode 600 outside this repository. The account service
changed only the copied password and removed the copied account's standalone
HR skill entitlement, leaving its six shared-agent entitlements intact. The
same shared purchase-order and HR agents are also granted to `tl00275`, so the
two users can be compared. The copied state has no active shared-agent plugin
grant: `diffs` is private account scope and `gmail` is private Personal Agent
scope. Those rows must not be promoted during this acceptance.

A read-only audit of the live 18789 permission flow found two account-scoped
plugin-grant rows (`test-echo` revoked and `diffs` unavailable), one active
account-scoped Personal Agent Codex grant (`gmail`), and zero
`shared_agent` plugin grants. Live shared-plugin inheritance is therefore not
applicable to the currently configured PO/HR agents. The automated A/B
shared-grant regression remains required, and private grants must never be
auto-promoted.

## Baseline and build identity

1. Prepare the fixture with prepare-isolated-state.sh.
2. Start it with start-isolated-gateway.sh.
   If the provider needs a source runtime environment, set
   OPENCLAW_QA_RUNTIME_ENV_FILE to the authorized source .env only for the
   gateway process; never copy its values into the fixture or an artifact.
3. Capture baseline-current-dist.json for purchase-order-skill and hrm.
   Record repository SHA, dist/.buildstamp, Node, pnpm, and bundled Codex
   package version together with the artifact.
4. Treat skills list/check as configuration evidence only. The acceptance
   record must also contain the tool manifest materialized for the fresh
   session, the tool names actually called, the delegated run id, and the
   business result envelope.

## Fresh-session matrix

Use the existing test-data PO/HR backend and read-only requests first. Keep
each row as a new session and record account, parent agent, shared target,
build identity, materialized tool names, child session id, run id, and
transcript/runtime event counts.

| Case | Fresh action                                                                             | Required proof                                                                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Regular user opens a fresh direct shared-agent session and asks for an open PO lookup    | Parent and shared agent show the expected shared-skill/tool catalog; router_tool_search is called; selected read operation is called; no permission error                         |
| B    | Same user opens a fresh direct HR shared-agent session and asks for a staff lookup       | HR skill is present in the materialized catalog; router and selected read operation both execute; result envelope is returned                                                     |
| C    | Regular user asks Personal Agent to delegate the same PO request to the shared PO agent  | Parent enterprise_delegate is accepted; child receives the same shared-skill capability; child calls router and selected read operation; result settles back to Personal Agent    |
| D    | Repeat C in a fresh child after restarting the isolated gateway on the same copied state | Restart does not change catalog or delegated result; record new process/build identity and no stale-session reuse                                                                 |
| E    | Change the shared-agent grant in isolated state, then open a new session                 | Newly granted skill/tool appears; revoked skill/tool does not appear. Capture capability revision or equivalent projection marker                                                 |
| F    | Revoke the grant while a delegated run is in flight                                      | Active run is rejected at capability boundary; no business tool runs after revocation; error is capability-change/admission result, not generic missing-tool result               |
| G    | Resume an old session created before the fix and send the same read request              | Resumed session re-materializes the current capability set on the next turn, retains history, and completes the authorized read; a stale-capability error alone is not acceptance |

## Skill add/remove revision check

The isolated config includes `qa-shared-acceptance-skill` in the shared PO
agent's normal `agents.entries.purchase-order-skill.skills` list. Its fixed
read entrypoint returns the stable marker `QA_SHARED_SKILL_OK` and performs no
network or business operation.

1. Start one fresh direct PO session for `hieu` and one for `tl00275`; record
   the materialized skill/tool catalog and invoke the marker from both sessions.
2. Keep one session open, run `prepare-qa-skill.sh <qa-env.sh> remove
purchase-order-skill`, and send a new turn. The new turn must re-evaluate the
   capability revision, omit the marker skill, and return a capability-change
   or not-granted result without running the script. The previous transcript
   must remain readable.
3. Run `prepare-qa-skill.sh <qa-env.sh> add purchase-order-skill`, send another
   turn in the same open session, and verify the marker appears again only
   after the refreshed projection. Capture the config hash and materialized
   catalog for each revision.

## Business write guard

The user has explicitly changed this lane to read-only. Do not create, update,
delete, approve, replay, or clean up any live PO. The earlier authorized
fixture write and partial `PriceManualID` cleanup remain historical evidence
only; no further live restoration attempt is allowed.

Approval, replay suppression, and restoration behavior may continue in local
automated fixtures with synthetic state. They must not require a live business
login, live PO request, or live approval row.

## Pass criteria

A case passes only when all of these are present in the artifact: fresh
session id, runtime/build identity, actual materialized tool catalog, at least
one expected tool call, no authorization error, and expected business result
status. A successful orchestration row with zero child tool calls is a
failure for this feature and must remain visible as such.
