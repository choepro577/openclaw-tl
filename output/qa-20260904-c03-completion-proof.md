# C03: specialist completion preservation

Boundary: real captured QA input replayed through the patched source formatter. This is **not** a deployed-runtime retest.

Run from the `openclaw-tl` repository:

```sh
node --import tsx output/qa-20260904-c03-completion-proof.mjs
```

Observed 2026-09-04, exit 0. Both SQLite handles are read-only; output contains metadata and booleans only.

- Real child run: `e23bea00-aa9d-45e8-a04e-734e9cf910f0`.
- Parent transcript: `901d4a92-9c9b-409b-9421-57e78f5ab2c2`, sequence 17.
- Captured child: 1,590 characters; SHA-256 `5df6a88e4f9a3766c59808278cb592cfa19d30a9c54c8381a97b461c018d54fc`.
- Historical parent wake: 1,181 characters; contains the **exact** canonical escaped 512-character child projection. It lacks the child’s later `294` and `120` results.
- Patched findings: 1,766 characters, within the existing 4,096-character total budget; no truncation marker; contains the exact complete child text and all three `204`, `294`, `120` results.

Cause and effect: `maybeWakeRequesterAfterAllChildrenSettled` calls `buildChildCompletionFindings` and places those findings in the requester wake. Previously that producer applied 512 characters to each child before checking the 4,096-character batch allowance. A single 1,590-character answer therefore lost its tail unnecessarily. The patched producer retains complete sanitized/escaped results when the complete batch fits. Otherwise it uses the unchanged compact, failure-prioritized truncation/omission policy. No timeout, total budget, tool permission, runtime state, or configuration was changed by this patch.

Regression commands:

```sh
node scripts/run-vitest.mjs src/agents/subagents/announce/subagent-announce-output.test.ts
node scripts/run-vitest.mjs src/agents/subagents/announce/subagent-announce-output.test.ts src/agents/subagents/announce/subagent-announce.requester-settle-wake.test.ts
```

Before the production fix: two new complete-result cases failed on the missing conclusion; 63 existing cases passed. After the fix: both files passed, 103 tests total, including existing failure priority, many-child, Unicode, control-character sanitation, and escaped-expansion hard-limit coverage. Scoped formatting, diff whitespace check, and oxlint passed. A fresh browser/runtime C03 rerun after QA rebuild remains necessary for deployment-level acceptance.
