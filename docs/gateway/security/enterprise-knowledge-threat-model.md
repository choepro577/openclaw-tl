---
summary: "Trust boundaries, abuse cases, mitigations, and residual risks for Enterprise Knowledge Zones"
title: "Enterprise Knowledge threat model"
---

# Enterprise Knowledge threat model

## Assets and trust boundaries

Protected assets are raw documents, normalized segments, embeddings, graph nodes/edges/evidence, review/manual overlays, publication history, Zone membership, Agent bindings, provider credentials, export archives, audit records, and signed citation references. The primary boundaries are the Admin and User HTTP audiences, the server-attested Agent authority, the per-Zone generation database, the local artifact/export root, and any explicitly consented external OCR, embedding, or graph-enrichment provider.

Document text, URLs, filenames, Office XML, OCR output, and retrieval excerpts are untrusted data. They never become instructions and cannot choose account, Agent, Zone, publication, filesystem path, provider credential, or citation identity.

## Threats and controls

| Threat                                     | Security property                                             | Controls                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-account or cross-Zone enumeration    | Foreign resources remain undiscoverable                       | Separate session cookies/audiences, server-side membership lookup, foreign identifiers return `404`                                                  |
| Privilege escalation by Manager or Curator | Only Administrator grants Manager or binds Agent              | Distinct Admin/User routes, role matrix checks, revision CAS, success/failure audit                                                                  |
| Model-forged authority                     | Model cannot widen retrieval scope                            | Authority captures current session/account/canonical Agent server-side; tool schema accepts no identity or Zone list                                 |
| Revocation race                            | New search/get cannot return revoked data                     | Entitlement and binding checks per call, access-revision fingerprint before return, current authorization on citation open                           |
| Vector post-filter leakage                 | A Zone never influences another Zone's candidates             | Separate SQLite generation per Zone; only authorized databases are opened, then results are merged                                                   |
| Cross-Zone graph inference                 | An edge cannot disclose or connect a forbidden Zone           | Graph is generated and stored per Zone; overview only merges authorized disconnected clusters; no persisted cross-Zone edge                          |
| Candidate or rejected-edge leakage         | Unpublished relations cannot influence an Agent               | Candidate is role-gated; traversal and export select accepted active edges only; publication pointer and access revision are rechecked               |
| Forged or stale graph reference            | UI cannot address a node/edge from another generation         | Signed opaque node/edge refs bind Zone and generation; foreign and stale refs return `404`                                                           |
| Hallucinated enrichment                    | AI cannot create unsupported organizational facts             | Isolated completion has no tools, strict JSON schema, current-version evidence locator, risk auto-approval allowlist, curator review overlay         |
| Remote enrichment of local-only data       | Provider policy remains fail closed                           | `local_only` permits only a local provider; otherwise deterministic/semantic build continues degraded without remote egress                          |
| Graph traversal denial of service          | Cycles or hubs cannot exhaust request resources               | Two-hop/neighbor/node/edge caps, no chained `similar`, 1.5-second budget, hybrid fallback, bounded UI/API payloads                                   |
| Obsidian export disclosure                 | Offline archive contains only authorized publishable Markdown | Manager/Admin gate, active publication only, private `0600` file, requester/Zone recheck, 15-minute expiry, size caps and forbidden-field tests      |
| Prompt injection in enterprise content     | Retrieved data cannot alter system/tool policy                | Search returns references; `get` marks evidence untrusted; grounding guard requires exact retrieval and structured citations                         |
| Parser exploitation                        | Uploaded bytes cannot execute or escape storage               | Magic/MIME validation, private staging, bounded ZIP/XML, DTD/XXE/macro/OLE/external relationship rejection, no formula execution, sanitized HTML     |
| SSRF and credential forwarding             | URL ingestion reaches only allowed public targets             | HTTP(S) only, no URL credentials/cookies, DNS/IP validation at every redirect, rebinding/private/link-local/metadata denial, robots and crawl bounds |
| Upload race or overwrite                   | A stale writer cannot commit another writer's bytes           | Exact offsets, chunk claim token/lease/owner fencing, immutable commit hash, TTL, quota, idempotent commit                                           |
| Job double execution after restart         | Only the current claim changes durable state                  | Lease, heartbeat, claim token/owner and pipeline-generation fencing; idempotent stages; stale generation rejection                                   |
| Realtime event leakage or replay confusion | Queue metadata reaches only current authorized Zone viewers   | Existing Gateway subscription, per-event session/account/role/membership recheck, role-filtered entity kinds, monotonic sequence dedupe, gap refresh |
| Stale build overwrites a newer Candidate   | A superseded build cannot publish derived state               | `build_revision` coalescing, explicit superseded step/event, cleared lease, generation fencing, immutable Candidate                                  |
| Half-published corpus                      | Readers see one complete generation                           | Immutable candidate, integrity checksum, source-set revision CAS, atomic active-publication pointer                                                  |
| Citation tampering or historical bypass    | Citation resolves to exact authorized evidence                | Opaque signed reference, key rotation support, immutable Source Version/locator, current Agent binding/publication check                             |
| Sensitive telemetry leakage                | Operations data contains no corpus or credentials             | Query/reference hashes only, safe error codes, bounded IDs/count/timing, audit redaction, no filesystem path in API/doctor output                    |
| CAS purge damages another Zone             | Physical deduplication never shares lifecycle authority       | Typed Admin-only purge, archived-state and revision fencing, active job/upload blockers, post-transaction refcount recheck                           |
| External data egress without consent       | Local-only is fail closed                                     | Zone defaults to `local_only`; Administrator explicitly enables egress; provider credentials remain canonical and are never copied                   |

## Availability and recovery

The active publication remains usable while a candidate is built or a provider is unavailable. Expired leases are reclaimed after restart. Missing/corrupt generation files are reported by the Admin `doctor` endpoint and can be rebuilt from immutable normalized artifacts. Canonical OpenClaw backup archives include the shared state database and the Enterprise Knowledge artifact root; restore is performed into a fresh target and verified before activation.

## Accepted residual risks

- Evidence already returned into a running model context before revocation can still influence that turn. Normal revocation does not terminate all active chats; regulated hard-revoke is a separate feature.
- A configured external OCR, embedding, or enrichment provider necessarily receives the consented segments. Provider-side retention and jurisdiction remain governed by the selected provider contract.
- Graph relations can amplify a mistaken source statement even when provenance is intact. Risk-gated review and mandatory citation retrieval reduce this risk but do not establish factual truth.
- Unknown parser, SQLite, runtime, or model vulnerabilities cannot be ruled out. Release requires fuzz/fault tests, monitoring, a staged soak, canary binding, and rehearsed rollback rather than an absolute no-defect claim.

## Review checklist

- Verify every mutation has audience, origin, CSRF, role, revision/idempotency, and safe error behavior.
- Run parser/URL/upload fuzz suites and the restart/race suite repeatedly.
- Confirm search/get audit contains no raw query, document text, embedding, credential, signed citation, or filesystem path.
- Confirm graph audit contains only hashes, counts, depth, status, latency, and extractor identity; inspect export archives for forbidden fields and permissions.
- Exercise duplicate/out-of-order realtime sequences, replay gaps, disconnected HTTP fallback, Viewer event filtering, session/membership revoke, and unsubscribe on Zone teardown.
- Exercise stale/foreign node and edge refs, candidate access by Viewer, rejected/proposed traversal exclusion, local-only enrichment denial, cyclic/high-degree caps, and WebGL/list fallback.
- Exercise unbind during search, citation open after revoke, provider outage, missing index, backup restore, and publication rollback.
- Record the reviewer, commit, test report, staging soak, canary window, and any accepted exception in release evidence.
