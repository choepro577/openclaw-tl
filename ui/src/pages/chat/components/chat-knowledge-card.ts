import { asNullableRecord } from "@openclaw/normalization-core/record-coerce";
import { truncateUtf16Safe } from "@openclaw/normalization-core/utf16-slice";
import { html, nothing } from "lit";
import { icons } from "../../../components/icons.ts";
import { enterpriseUserChatCardCopy } from "../../../i18n/enterprise-user-chat.ts";
import type { ToolCard } from "../../../lib/chat/chat-types.ts";
import { resolveToolCardOutcome, toolCardSkippedLabel } from "../../../lib/chat/tool-cards.ts";
import "./chat-knowledge-card.css";

type KnowledgeSource = { title: string; zone: string; version?: number; location: string };
type KnowledgePresentation = {
  state: "running" | "failed" | "skipped" | "unavailable" | "references" | "evidence";
  sources: KnowledgeSource[];
  query?: string;
  evidence?: string;
  truncated?: boolean;
  searchedZones?: number;
  partial?: boolean;
};

export function isEnterpriseKnowledgeTool(name: string): boolean {
  return name === "enterprise_knowledge_search" || name === "enterprise_knowledge_get";
}

function text(value: unknown, limit = 240): string | undefined {
  return typeof value === "string"
    ? truncateUtf16Safe(value.trim(), limit) || undefined
    : undefined;
}

function count(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function source(value: unknown): KnowledgeSource | null {
  const citation = asNullableRecord(value);
  const title = text(citation?.sourceTitle);
  const zone = text(citation?.zoneLabel);
  if (!title || !zone) {
    return null;
  }
  const locator = asNullableRecord(citation?.locator);
  const location = (
    ["page", "section", "paragraph", "sheet", "range", "slide", "table", "cell"] as const
  )
    .flatMap((key) => {
      const locatorValue = text(locator?.[key]) ?? count(locator?.[key])?.toString();
      return locatorValue
        ? [
            enterpriseUserChatCardCopy(`chat.toolCards.knowledge.location.${key}`, {
              value: locatorValue,
            }),
          ]
        : [];
    })
    .join(" · ");
  return { title, zone, version: count(citation?.sourceVersion), location };
}

function envelope(card: ToolCard): Record<string, unknown> | null {
  const details = asNullableRecord(card.details);
  if (details && (Array.isArray(details.hits) || typeof details.evidence === "string")) {
    return details;
  }
  // Historical results may only contain text. Never fall back to displaying raw
  // payloads: citation tokens and model instructions are not user-facing evidence.
  if (!card.outputText || card.outputText.length > 256_000) {
    return null;
  }
  try {
    return asNullableRecord(JSON.parse(card.outputText));
  } catch {
    return null;
  }
}

function presentation(card: ToolCard, runActive?: boolean): KnowledgePresentation {
  const outcome = resolveToolCardOutcome(card, runActive);
  const empty: KnowledgePresentation = { state: "unavailable", sources: [] };
  if (outcome === "running" || outcome === "failed" || outcome === "skipped") {
    return { ...empty, state: outcome };
  }
  const result = envelope(card);
  if (outcome !== "succeeded" || !result) {
    return empty;
  }
  if (card.name === "enterprise_knowledge_search" && Array.isArray(result.hits)) {
    const sources = result.hits.slice(0, 20).map((hit) => source(asNullableRecord(hit)?.citation));
    if (sources.some((item) => item === null)) {
      return empty;
    }
    const coverage = asNullableRecord(result.coverage);
    return {
      state: "references",
      sources: sources.filter((item) => item !== null),
      query: text(asNullableRecord(card.args)?.query, 400),
      searchedZones: count(coverage?.searchedZones),
      partial: result.partial === true || (count(coverage?.unavailableZones) ?? 0) > 0,
      truncated: result.hits.length > 20,
    };
  }
  const citation = source(result.citation);
  const evidence = text(result.evidence, 12_000);
  return card.name === "enterprise_knowledge_get" && citation && evidence
    ? {
        state: "evidence",
        sources: [citation],
        evidence,
        truncated: typeof result.evidence === "string" && result.evidence.trim().length > 12_000,
      }
    : empty;
}

function summary(model: KnowledgePresentation, card: ToolCard): string {
  if (model.state === "skipped") {
    return toolCardSkippedLabel(card);
  }
  if (model.state === "references") {
    const sourceCount = model.sources.length;
    const key = sourceCount === 0 ? "empty" : sourceCount === 1 ? "referenceOne" : "referenceMany";
    return enterpriseUserChatCardCopy(`chat.toolCards.knowledge.${key}`, {
      count: String(sourceCount),
    });
  }
  if (model.state === "running") {
    return enterpriseUserChatCardCopy(
      `chat.toolCards.knowledge.${card.name === "enterprise_knowledge_search" ? "searching" : "retrieving"}`,
    );
  }
  if (model.state === "evidence") {
    return enterpriseUserChatCardCopy("chat.toolCards.knowledge.evidence");
  }
  if (model.state === "failed") {
    return enterpriseUserChatCardCopy("chat.toolCards.knowledge.failed");
  }
  return enterpriseUserChatCardCopy("chat.toolCards.knowledge.unavailable");
}

export function enterpriseKnowledgeSummary(card: ToolCard, runActive?: boolean): string {
  return summary(presentation(card, runActive), card);
}

export function renderKnowledgeCard(
  card: ToolCard,
  opts: { expanded: boolean; runActive?: boolean; onToggleExpanded?: (id: string) => void },
) {
  const model = presentation(card, opts.runActive);
  const label = summary(model, card);
  const heading = html`<span class="chat-knowledge__icon" aria-hidden="true"
      >${card.name === "enterprise_knowledge_search" ? icons.search : icons.fileText}</span
    ><span class="chat-knowledge__heading-text"
      ><small>${enterpriseUserChatCardCopy("chat.toolCards.knowledge.title")}</small
      ><span role="status">${label}</span></span
    >`;
  return html`<section
    class="chat-knowledge"
    aria-label=${enterpriseUserChatCardCopy("chat.toolCards.knowledge.title")}
  >
    ${opts.onToggleExpanded
      ? html`<button
          class="chat-inline-disclosure chat-knowledge__heading"
          type="button"
          aria-expanded=${String(opts.expanded)}
          @click=${() => opts.onToggleExpanded?.(card.id)}
        >
          ${heading}<span class="chat-inline-disclosure__chevron" aria-hidden="true"
            >${icons.chevronDown}</span
          >
        </button>`
      : html`<div class="chat-knowledge__heading">${heading}</div>`}
    ${opts.expanded
      ? html`<div class="chat-knowledge__body">
          ${model.query ? html`<p class="chat-knowledge__query">${model.query}</p>` : nothing}
          ${model.searchedZones !== undefined
            ? html`<p class="chat-knowledge__meta">
                ${enterpriseUserChatCardCopy("chat.toolCards.knowledge.coverage", {
                  count: String(model.searchedZones),
                })}
              </p>`
            : nothing}
          ${model.partial
            ? html`<p class="chat-knowledge__notice">
                ${enterpriseUserChatCardCopy("chat.toolCards.knowledge.partial")}
              </p>`
            : nothing}
          ${model.state === "references" && model.sources.length
            ? html`<p class="chat-knowledge__meta">
                ${enterpriseUserChatCardCopy("chat.toolCards.knowledge.referencesOnly")}
              </p>`
            : nothing}
          ${model.sources.map(
            (item) => html`<article class="chat-knowledge__source">
              <strong>${item.title}</strong>
              <span class="chat-knowledge__meta"
                >${item.zone}${item.version !== undefined
                  ? ` · ${enterpriseUserChatCardCopy("chat.toolCards.knowledge.version", {
                      value: String(item.version),
                    })}`
                  : ""}</span
              >
              ${item.location
                ? html`<span class="chat-knowledge__meta">${item.location}</span>`
                : nothing}
              ${model.evidence
                ? html`<blockquote class="chat-knowledge__evidence">${model.evidence}</blockquote>`
                : nothing}
            </article>`,
          )}
          ${model.truncated
            ? html`<p class="chat-knowledge__meta">
                ${enterpriseUserChatCardCopy("chat.toolCards.knowledge.truncated")}
              </p>`
            : nothing}
        </div>`
      : nothing}
  </section>`;
}
