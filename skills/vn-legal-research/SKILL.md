---
name: vn-legal-research
description: Research current Vietnamese economic-law and F&B regulatory documents from official state sources and produce legal-agent-ready summaries with citations, effectivity status, amendment chains, operational impact, and exact dates. Use when Codex needs the latest Vietnam rules on enterprise, investment, commerce, contracts, tax, labor, consumer protection, advertising, food safety, alcohol, tobacco, labeling, licensing, or restaurant/cafe/manufacturing/distribution compliance; when a user asks whether an F&B-facing legal document is still in force; or when a legal agent needs source-verified Vietnamese legal research for business operations.
---

# VN Legal Research

## Overview

Use official Vietnamese state sources first and always browse for current status. Treat questions about "moi nhat", "hien hanh", "con hieu luc khong", or "bi sua doi boi van ban nao" as time-sensitive legal research tasks that must not be answered from memory.

Optimize for legal-agent support in business contexts: return the exact title, number, issuing body, issuance date, effective date, current status, amendment or replacement chain, operator impact, and official links that support every material claim.

## Focus Areas

Prioritize these issue clusters unless the user clearly asks outside them:

- Economic-law baseline: enterprise, investment, commerce, contracts, competition, tax, invoicing, labor, and consumer protection
- F&B operations: restaurant, cafe, cloud kitchen, manufacturing, processing, import, distribution, wholesale, retail, franchise, and platform-based sales
- Licensing and conditions: business lines, food safety, product compliance, alcohol or tobacco controls where applicable, local operating conditions, fire safety, environment, and inspections
- Go-to-market: labeling, advertising, promotions, e-commerce, delivery apps, distributor arrangements, and consumer claims

For a more detailed issue map and triage checklist, read [references/economic-fnb-focus.md](references/economic-fnb-focus.md).

## Source Order

Use sources in this order unless the task clearly requires a different path:

1. `vbpl.vn`
   Primary source for full text, metadata, effective status, related documents, and amendment or replacement history.
2. `phapdien.moj.gov.vn`
   Use for topic-based research and currently effective codified rules. Map important provisions back to their source documents on `vbpl.vn`.
3. `congbao.chinhphu.vn`
   Use to confirm official gazette publication details and publication dates.
4. `xaydungchinhsach.chinhphu.vn`
   Use to discover very recent laws, decrees, circulars, and official "toan van" posts. Verify binding status and full text on `vbpl.vn` or another official source before concluding.
5. Official ministry, agency, National Assembly, Government, or provincial portals
   Use as supplemental official sources when the primary databases lag, link out, or omit a detail. For economic-law and F&B work, this often includes specialized regulators for business registration, tax, food safety, alcohol, tobacco, customs, local licensing, fire safety, or environment.

Do not rely on non-official legal websites for final conclusions. If a non-official source helps discovery, confirm the result on an official source before answering.

For more detail on each source and search patterns, read [references/official-sources.md](references/official-sources.md).

## Required Workflow

Follow this sequence for every substantive legal lookup:

1. Identify the target precisely.
   Extract the document number, title, topic, issuing body, time window, business model, sales channel, product type, and whether the user needs current law, historical law, or comparison.
2. Classify the business issue before researching.
   Decide whether the question is mainly about entity setup, licensing, product compliance, labeling, marketing, labor, tax, contracts, disputes, or store-level operations.
3. Build the legal stack.
   Start with horizontal economic-law documents, then add sector-specific F&B rules, then local implementation or licensing rules if the business activity is location-sensitive.
4. Search `vbpl.vn` first.
   Capture the exact Vietnamese title, number or symbol, document type, issuing body, signing date, effective date, and displayed status.
5. Trace the document chain.
   Open or inspect related-document metadata to find amendments, supplements, replacements, suspensions, or expiry.
6. Check topic-level codification when the user asks by subject.
   Use `phapdien.moj.gov.vn` to identify the controlling provisions, then map them back to the underlying source documents.
7. Confirm recency for "latest/current" questions.
   Check `xaydungchinhsach.chinhphu.vn` for recent official posts and `congbao.chinhphu.vn` for publication, then verify the binding text and status on `vbpl.vn`.
8. Translate legal findings into operator impact.
   State which entity type is affected, what permit, notice, label, contract, record, or operational control may be required, and whether the issue is national or location-specific.
9. Prefer absolute dates over relative phrasing.
   Quote dates like `29/03/2026` or `01/07/2025`, not "today", "recently", or "next month".
10. State uncertainty plainly.
    If official sources do not confirm current status, say so and avoid a definitive legal conclusion.

## Interpretation Rules

Apply these guardrails every time:

- Distinguish `ngay ban hanh` from `ngay co hieu luc`.
- Distinguish binding documents from drafts, news posts, policy explainers, and implementation plans.
- Treat `van ban hop nhat` as a convenience consolidation, not as a new independent legal norm.
- Do not say a document is still in force unless an official source supports that conclusion.
- Distinguish nationwide rules from provincial or district implementation rules.
- Distinguish obligations by business model: restaurant or cafe, cloud kitchen, manufacturer, importer, distributor, wholesaler, retailer, franchisee, or e-commerce seller.
- Call out whether the rule creates a licensing, notification, registration, testing, labeling, recordkeeping, training, or inspection exposure.
- If multiple official sources differ or lag, explain the conflict and prefer the source that directly states status or publishes the full text.
- For legal-agent tasks, separate the quoted source facts from your inference or synthesis.
- Do not overstate legal advice. Provide research findings and clearly label interpretation.

## Output Contract

Unless the user asks for a different format, include:

- Business model or operator type assumed
- Exact Vietnamese title
- Number or symbol
- Document type and issuing body
- Date issued
- Effective date
- Current status, if officially confirmed
- Key amending, supplementing, or replacing documents
- Practical impact for the business
- Permits, notices, records, or compliance actions to verify
- Short legal-agent summary focused on the user's question
- Official links used
- Date checked

When comparing multiple documents, use a compact table if that improves clarity.

For a reusable answer structure, read [references/legal-agent-output.md](references/legal-agent-output.md).

## Search Tactics

Use domain-filtered web search when on-site search is weak or the document is very new. Good patterns include:

- `site:vbpl.vn "123/2024/ND-CP"`
- `site:vbpl.vn "an toan thuc pham" "Nghi dinh"`
- `site:vbpl.vn "nhan hang hoa" "thuc pham"`
- `site:vbpl.vn "ruou" "giay phep"`
- `site:vbpl.vn "khuyen mai" "ruou bia"`
- `site:phapdien.moj.gov.vn "an toan thuc pham"`
- `site:congbao.chinhphu.vn "05/2026/TT-BTC"`
- `site:xaydungchinhsach.chinhphu.vn "toan van" "Nghi dinh"`

If the user asks for the newest rule in a topic, search by topic first, then narrow to the latest official document and verify whether it has taken effect.

## Practical Defaults

Use these defaults unless the user specifies otherwise:

- Prefer Vietnamese document titles exactly as published.
- Summarize in the user's language, but keep legal citations in their original Vietnamese form.
- For compliance-sensitive work, include both the currently controlling document and the latest amending document if they differ.
- If the request is broad, identify the top controlling documents first instead of listing every related text.
- For F&B questions, default to separating requirements by product, premise, channel, and geography.
