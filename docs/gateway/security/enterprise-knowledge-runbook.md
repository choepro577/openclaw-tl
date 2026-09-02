---
summary: "Operations, backup, restore, incident response, and release checks for Enterprise Knowledge Zones"
title: "Enterprise Knowledge operations"
---

# Enterprise Knowledge operations

## Readiness and monitoring

Use the Admin Knowledge readiness card or `GET /api/enterprise/admin/knowledge/readiness`. It reports worker, FTS, vector provider/model compatibility, OCR registration, AI analysis mode, graph feature state, concurrency, and enrichment transport/readiness without exposing credentials. Poll `GET /api/enterprise/admin/knowledge/doctor` from the authenticated operations plane for immutable-artifact permissions/missing files, active/candidate index checksum and SQLite integrity, dangling graph endpoint/evidence counts, proposed/orphan counts, queue/stuck/failure counts, graph build/retrieval timeout and truncation, export queue/storage, search p50/p95/p99, citation authorization failures, and storage usage. The report exposes hashes and canonical identities, never document text, graph labels, excerpts, signed citations, provider credentials, or filesystem paths.

Monitor queue depth, jobs with no heartbeat for ten minutes, stage failure rate, upload/ingestion/graph-build/publish latency, graph traversal p95/timeout/truncation, proposed/orphan growth, export failures/storage, search p50/p95/p99, partial and vector-fallback rate, zero-hit rate, citation authorization failures, denied-access spikes, SQLite busy/corruption, file descriptors, memory, and storage. Alert at failure rate above 5%, partial search above 1%, graph phase p95 above 1.5 seconds, storage above 80%, or overall search p95 above four seconds.

## Backup

1. Use the canonical full-state archive, which snapshots OpenClaw-owned SQLite files and includes the Enterprise Knowledge artifact root: `openclaw backup create --output <private-backup-directory> --verify`.
2. Keep the generated manifest and SHA-256 inventory. `openclaw backup verify <archive.tar.gz>` must pass before the backup is accepted.
3. For a database-only diagnostic snapshot, use `openclaw backup sqlite create --global --repository <private-repository>`, but do not treat it as a complete Knowledge backup because raw and normalized artifacts are separate files.
4. Derived Zone generation databases may be retained for faster recovery, but they are not the source of truth and can be rebuilt from normalized artifacts.
5. Store archives under the host encryption and retention policy. Provider credentials remain in canonical provider configuration and are not copied into Knowledge tables or audit.

## Restore and integrity rehearsal

1. Stop the Gateway and worker. Restore only a trusted, already verified archive into a fresh target: `openclaw backup restore <archive.tar.gz> --target <fresh-private-directory>`.
2. Point an isolated rehearsal Gateway at the restored target; never overwrite the live state directory in place.
3. Start the isolated Gateway. Additive schema ensure is idempotent and does not change the global database version.
4. Run the Knowledge `doctor` endpoint and verify private permissions (`0700` directories, `0600` files), immutable artifacts, active publication pointers, checksums, and SQLite integrity.
5. Rebuild a missing/corrupt derived generation from immutable normalized artifacts; do not alter Source Versions.
6. Exercise one published search and exact citation `get` with a test Agent/account, then verify an unbound Agent is denied.
7. Promote the restored target only after the rehearsal succeeds. Keep the prior state and archive through the application rollback window.

## Provider outage

- The active publication continues serving.
- Required OCR failure leaves the Source Version in `needs_ocr` and blocks publish.
- Embedding failure creates an FTS candidate marked degraded. Publish requires a Manager or Administrator to enter a reason; this override never bypasses extraction or OCR failure.
- After provider recovery, retry the failed job. A retry creates a new pipeline generation.
- A missing/failed local graph enrichment provider in a `local_only` Zone never falls through to a remote provider. The candidate remains deterministic/semantic and reports degraded enrichment.
- A remote enrichment provider is considered only for `external_allowed`. Malformed output is discarded and cannot block the active publication.

## Graph rollout and rollback

1. Deploy additive schema, Artifact V3, job steps/change feed, and `@openclaw/knowledge-graph-core` with `enterprise.knowledge.graph.enabled=false`, `aiAnalysis=off`, and `agentExpansion=off`.
2. Enable realtime subscriptions first. Verify `queued -> running -> stage steps -> candidate_ready` appears without reload, reconnect replay is monotonic, and Viewer receives no Candidate/job metadata.
3. Enable graph for one canary Zone and use **Phân tích lại bằng AI Graph V3** on one Source Version. Inspect Chapter/Article/Clause hierarchy, evidence locators, analysis coverage, dangling references, proposed/orphan counts, checksum, and candidate diff.
4. Run `aiAnalysis=shadow`, then `agentExpansion=shadow`; compare graph coverage/latency without adding expanded hits to model-visible search results.
5. Curator reviews exceptions, Manager publishes, and one internal Agent runs for 24 hours. Do not bulk-publish.
6. Complete a 72-hour staging soak plus restart, provider-outage, backup/restore, and publication-rollback rehearsals before expanding one Zone at a time.

Emergency rollback order is: set `agentExpansion=off`, then `aiAnalysis=off`; roll the Zone publication pointer back to its prior verified generation (including v1/v2); disable graph generation globally if necessary. FTS/vector search and exact citation `get` continue. Keep review/manual overlays and immutable generations for investigation; do not rewrite an active/candidate graph in place.

## Obsidian export operations

Exports are active-publication-only, idempotent per requester/key, private `0600`, capped at 5,000 entries/250 MiB uncompressed Markdown, and expire after 15 minutes. Download rechecks current Manager/Admin access. Expiry cleanup removes the archive and marks the job expired. Treat a leaked archive as an offline document disclosure: revoke access, preserve audit hashes/counts, remove the artifact, inspect the exact published generation, and follow the Enterprise incident process. The server never imports a vault, writes `.obsidian/plugins`, or launches Obsidian/Obsidian CLI.

## Stuck or failed jobs

Inspect the parent job plus `GET /:zoneId/jobs/:jobId/steps`: stage, current/total work, checkpoint reference, degraded reason, safe error code, attempts, lease owner, heartbeat, and pipeline/build generation. A Gateway restart reclaims an expired lease and resumes at the durable stage boundary. A newer `build_revision` marks the old Zone build superseded and clears its lease. Use Cancel for an active job and Retry only for a failed or cancelled job. Do not edit a completed generation or claim token directly. Permanent parser, MIME, auth, hash, policy, capacity, or vector-contract failures require correcting the input or provider configuration before creating a new version/retry.

## Security incident

1. Unbind affected canary or production Agents from the Zone. This increments access revision and blocks new search/get operations.
2. Preserve audit events, Source Versions, publications, artifacts, and job ledger. Do not purge evidence during investigation.
3. Rotate citation signing keys through the canonical Enterprise JWT/key procedure if signed-reference exposure is suspected; retain verification keys for the approved historical window.
4. If content is malicious or incorrect, roll the active publication pointer back to a verified generation.
5. Review data-egress consent, provider logs, denied-access events, and query-hash timing without collecting raw queries or document text into the incident ticket.

## Deployment rollback without data loss

1. Unbind canary Agents to stop retrieval exposure.
2. Roll each affected Zone back to its last integrity-verified publication.
3. Roll back the Gateway deployment to stop new routes/workers.
4. Keep additive tables and immutable artifacts. Derived candidates can be garbage-collected after the investigation grace period.
5. Re-enable one internal Agent and test account before widening bindings.

## Release gates

Run the repository changed checks, full unit/extension/UI suites, SDK surface check, UI style/i18n checks, UI build, import-cycle check, and `git diff --check`. The Gateway must serve the hash of the just-built UI. Record Graph Active/Candidate/Compare, inspector/review/manual relation, WebGL-loss/list fallback, desktop/mobile (1440/1100/768/390), light/dark, keyboard/screen reader, reduced motion, and 100/125/140% text-scale evidence. Complete threat-model review, graph relational Recall@8 benchmark (at least +10 percentage points with standard-search regression no worse than 2 points), 20-Zone/one-million-chunk memory/FD/build/concurrency capacity report, backup/restore, restart, provider outage, export expiry, and rollback rehearsals. Soak staging for 72 hours and canary one internal Agent for 24 hours before widening bindings.

The release claim is: no known in-scope defect, all recorded gates green, monitoring active, and rollback rehearsed. It is not a claim that unknown defects are impossible.
