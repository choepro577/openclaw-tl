# Browser acceptance guide

The current authoritative acceptance uses the user's already-open Chrome
session through CUA against gateway `18789`. Do not start the isolated gateway
`18889` or launch a second Playwright browser for this live acceptance. Keep
business credentials inside the normal secure login modal; never paste or
print them into chat, shell arguments, snapshots, traces, or repository
artifacts.

All live business acceptance in this lane is read-only. Do not submit PO
create/update/delete requests, approve a PO, replay a write, or attempt live
cleanup. Approval and replay behavior belongs in isolated automated fixtures.

The isolated Playwright driver remains available as a pre-build fallback in
`run-browser-acceptance.sh`. It is not evidence for the current live result.
When used in an explicitly isolated run, it stores artifacts under
`output/playwright/enterprise-shared-skill-qa-20260911/runs/`, reads the
generated password through Playwright's private secret store, and starts video,
action recording, and trace only after login succeeds.

## Direct shared-agent PO: current live pass

In the existing Chrome tab, create a fresh conversation on gateway `18789`,
select the shared `Mua hàng` agent, and submit this read-only request:

    Tra cứu đơn nhập hàng nháp hôm nay

The verified live run used an ordinary user and the secure PO business login.
It created session `9904b634-4f30-450f-af7f-32704d2e8a45`, run
`d2653106-bfe5-4918-afcd-e4760b3a2e4e`, and child key
`agent:purchase-order-skill:dashboard:767c9833-74cd-4927-9069-4dfeb3dc79d8`.
The materialized catalog contained `read`, `session_status`, and `skill_script`.
The run completed five successful skill results: `read`, two
`router_tool_search` calls, `search_po_sites`, and `get_po_draft_list`; the UI
returned seven drafts for `2026-09-11` with no authorization error.

Evidence is in
`session-evidence/operator-direct-po-success.json`. The extractor now reads
`skill_script.arguments.operation` and records only `skill`, `entrypoint`, and
`operation`, so business arguments and credentials cannot enter the report.

For another live run, capture a fresh session id and run id from the current
Chrome session, then use the read-only extractor. Do not reuse the old session
as proof of fresh-session behavior.

The expected sequence is a shared skill/tool catalog, `skill_script` with the
declared router operation, a `router_tool_search` result, then only read
operations selected from that result.

## Isolated fallback fixture preparation

Use these commands only when a separately authorized isolated acceptance lane
is needed for a future build; they do not apply to the current Chrome run and
must not be pointed at `18789`:

    output/enterprise-shared-skill-qa-20260911/prepare-hieu-fixture.sh \
      /tmp/.../openclaw-shared-skill-qa.../qa-env.sh hieu
    output/enterprise-shared-skill-qa-20260911/prepare-qa-skill.sh \
      /tmp/.../openclaw-shared-skill-qa.../qa-env.sh add purchase-order-skill
    output/enterprise-shared-skill-qa-20260911/capture-plugin-readiness.sh \
      /tmp/.../openclaw-shared-skill-qa.../qa-env.sh

The first command verifies normal user login in the copied state and removes
the standalone HR skill entitlement from `hieu`. The second command assigns a
fixed read-only QA marker through the normal shared-agent skill list. The
generated password remains under the private copied-state directory and is
read automatically by the browser driver.

## Direct shared-agent HR

In the existing Chrome session on gateway `18789`, create a fresh conversation,
select the shared `HRM` agent, and submit:

    Tra cứu danh sách nhân sự; chỉ đọc dữ liệu, không cập nhật.

The expected sequence is the HR skill catalog, router discovery, and one
read-only HR operation returned by the router.

## Personal Agent delegation

In the existing Chrome session on gateway `18789`, create a fresh parent
Personal Agent conversation and ask:

    Hãy giao cho agent Mua hàng tra cứu đơn nhập hàng nháp hôm nay.

Keep the parent and child sessions visible. Record the parent delegation call,
child session id, delegated run id, child catalog, child router call, selected
read operation, and final settlement back to Personal Agent. A successful
parent orchestration with zero child tool calls fails this acceptance.

## Restart and resume on the live gateway

After evidence is saved, restart gateway `18789` with the same deployed build,
then repeat the delegated flow in a new child. Finally resume an old session
and send the same read-only request. The resumed session must re-materialize
the current capability set or return an explicit stale-capability result.

For an explicitly authorized isolated Playwright run only, stop its capture
after the final snapshot:

    cd output/playwright/enterprise-shared-skill-qa-20260911
    export PLAYWRIGHT_CLI_SESSION=enterprise-shared-<label>
    export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
    export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
    "$PWCLI" video-chapter "final-state"
    "$PWCLI" snapshot --filename "runs/<label>/final.md"
    "$PWCLI" screenshot --filename "runs/<label>/final.png"
    "$PWCLI" recording-stop
    "$PWCLI" tracing-stop
    "$PWCLI" video-stop

Never put passwords, cookies, storage-state files, or raw business rows in
the repository output. For the current live run, use the existing Chrome
session and gateway database read-only; for an isolated run, use its private
runtime state. In both cases use the safe session evidence extractor for IDs,
tool names, counts, status, and error codes.
