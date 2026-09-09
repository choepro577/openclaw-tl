import { html, nothing } from "lit";
import { eaa } from "../../../i18n/enterprise-admin-agents.ts";
import {
  enterpriseDomainCopy,
  type EnterpriseDelegationKey,
} from "../../../i18n/enterprise-domain.ts";
import type {
  EnterpriseAccount,
  EnterpriseDelegationEvent,
  EnterpriseDelegationPolicy,
  EnterpriseDelegationProfile,
} from "../../enterprise/services/enterprise-api.ts";
import { formatDate } from "../utils.ts";

type DelegationOverview = {
  policy: EnterpriseDelegationPolicy;
  accountsWithPersonalAgent: number;
  assignments: number;
  effectiveAssignments: number;
  routableAssignments: number;
  events: {
    totalEvents: number;
    delegated: number;
    clarified: number;
    blocked: number;
    failed: number;
    averageLatencyMs: number | null;
  };
};

type ActivationPreview = {
  previewToken: string;
  expiresAt: number;
  summary: {
    assignments: number;
    eligible: number;
    missingProfile: number;
    blocked: number;
    orphaned: number;
    affectedUsers: number;
  };
  rows: Array<{
    accountId: string;
    username: string;
    displayName: string;
    accountEnabled: boolean;
    personalAgentEnabled: boolean;
    agentId: string;
    agentName: string;
    resourceKey: string;
    assigned: boolean;
    effective: boolean;
    eligible: boolean;
    reasonCodes: string[];
  }>;
};

type DelegationSimulationResult = {
  outcome: "delegate" | "clarify" | "local" | "blocked" | "shadow";
  agentNames: string[];
  decisionSource: "explicit" | "rule" | "ai" | "system";
  reasonCode: string;
  confidenceBand: "clear" | "ambiguous" | null;
  policyRevision: number;
  profileRevisions: Record<string, string>;
  missingRequiredInput: {
    agentId: string;
    id: string;
    label: string;
    question: string;
  } | null;
};

export type DelegationEventFilterDraft = {
  accountId: string;
  agentId: string;
  outcome: string;
  reasonCode: string;
  createdFrom: string;
  createdTo: string;
};

const previewRowKey = (accountId: string, resourceKey: string) =>
  `${accountId}\u0000${resourceKey}`;

const d = (key: EnterpriseDelegationKey, params?: Record<string, string>) =>
  enterpriseDomainCopy(`enterpriseDelegation.${key}`, params);

function outcomeLabel(value: string): string {
  switch (value) {
    case "delegated":
      return d("delegated");
    case "clarified":
      return eaa("Clarified");
    case "local":
      return eaa("Local");
    case "blocked":
      return d("blocked");
    case "failed":
      return d("failed");
    case "cancelled":
      return eaa("Cancelled");
    case "shadow":
      return eaa("Shadow");
    default:
      return value;
  }
}

function decisionSourceLabel(value: string): string {
  switch (value) {
    case "explicit":
      return eaa("Explicit");
    case "rule":
      return eaa("Rule");
    case "ai":
      return eaa("AI");
    case "system":
      return eaa("System");
    default:
      return value;
  }
}

function eventValue(event: Event): string {
  const target = event.currentTarget;
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
    ? target.value
    : "";
}

function eventChecked(event: Event): boolean {
  return event.currentTarget instanceof HTMLInputElement && event.currentTarget.checked;
}

function delegationRollout(value: string): EnterpriseDelegationPolicy["rollout"] {
  return value === "on" || value === "shadow" ? value : "off";
}

function rolloutLabel(rollout: EnterpriseDelegationPolicy["rollout"]): string {
  return rollout === "on" ? d("stateOn") : rollout === "shadow" ? d("stateShadow") : d("stateOff");
}

export function renderDelegationDashboard(props: {
  loading: boolean;
  busy: boolean;
  error: string;
  overview?: DelegationOverview;
  policy?: EnterpriseDelegationPolicy;
  availableModels: string[];
  routerModelAvailable: boolean;
  events: EnterpriseDelegationEvent[];
  eventTotal: number;
  eventNextCursor: string | null;
  eventFilters: DelegationEventFilterDraft;
  preview?: ActivationPreview;
  previewExclusions: ReadonlySet<string>;
  previewQuery: string;
  previewPage: number;
  onPolicy: (patch: Partial<EnterpriseDelegationPolicy>) => void;
  onEventFilter: (patch: Partial<DelegationEventFilterDraft>) => void;
  onApplyEventFilters: () => void;
  onLoadMoreEvents: () => void;
  onSavePolicy: () => void;
  onPreview: () => void;
  onPreviewQuery: (value: string) => void;
  onPreviewPage: (page: number) => void;
  onPreviewExclusion: (key: string, excluded: boolean) => void;
  onActivate: () => void;
  onEmergencyOff: () => void;
}) {
  if (props.loading) {
    return html`<div class="ea-loading" role="status">${d("loading")}</div>`;
  }
  const policy = props.policy;
  if (!policy) {
    return html`<div class="ea-empty">
      <p class="ea-error">${props.error || d("loadFailed")}</p>
    </div>`;
  }
  const overview = props.overview;
  const clarifyRate = overview?.events.totalEvents
    ? Math.round((overview.events.clarified / overview.events.totalEvents) * 100)
    : 0;
  const failureRate = overview?.events.totalEvents
    ? Math.round((overview.events.failed / overview.events.totalEvents) * 100)
    : 0;
  const matchingPreviewRows = (props.preview?.rows ?? []).filter((row) => {
    const query = props.previewQuery.trim().toLocaleLowerCase();
    return (
      !query ||
      [row.displayName, row.username, row.agentName, row.agentId].some((value) =>
        value.toLocaleLowerCase().includes(query),
      )
    );
  });
  const previewPageCount = Math.max(1, Math.ceil(matchingPreviewRows.length / 25));
  const previewPage = Math.min(props.previewPage, previewPageCount - 1);
  const visiblePreviewRows = matchingPreviewRows.slice(previewPage * 25, previewPage * 25 + 25);
  const eligibleAfterExclusions = Math.max(
    0,
    (props.preview?.summary.eligible ?? 0) - props.previewExclusions.size,
  );
  return html`
    <div class="ea-delegation-page ea-stack">
      <section class="ea-delegation-hero">
        <div>
          <span class="ea-eyebrow">${d("statusEyebrow")}</span>
          <h2>${rolloutLabel(policy.rollout)}</h2>
          <p>${d("heroDescription")}</p>
        </div>
        <div class="ea-row-actions">
          ${policy.rollout !== "off"
            ? html`<button
                class="ea-button ea-button--danger"
                type="button"
                ?disabled=${props.busy}
                @click=${props.onEmergencyOff}
              >
                ${d("emergencyOff")}
              </button>`
            : nothing}
          <button class="ea-button" type="button" ?disabled=${props.busy} @click=${props.onPreview}>
            ${d("previewActivation")}
          </button>
        </div>
      </section>

      <section class="ea-card ea-delegation-steps" aria-label=${d("setupStepsLabel")}>
        ${[
          ["1", d("chooseRouterModel"), policy.routerModel ? d("selected") : d("incomplete")],
          [
            "2",
            d("completeProfiles"),
            d("readyCount", { count: String(overview?.routableAssignments ?? 0) }),
          ],
          [
            "3",
            d("reviewAffectedUsers"),
            d("personalAgentCount", {
              count: String(overview?.accountsWithPersonalAgent ?? 0),
            }),
          ],
          ["4", d("activateSafely"), rolloutLabel(policy.rollout)],
        ].map(
          ([step, title, status]) => html`<div class="ea-delegation-step">
            <span>${step}</span>
            <div><strong>${title}</strong><small>${status}</small></div>
          </div>`,
        )}
      </section>

      <section class="ea-delegation-metrics">
        ${[
          [d("usersWithPersonal"), overview?.accountsWithPersonalAgent ?? 0],
          [d("assignments"), overview?.assignments ?? 0],
          [d("effective"), overview?.effectiveAssignments ?? 0],
          [d("readyToDelegate"), overview?.routableAssignments ?? 0],
          [d("delegated"), overview?.events.delegated ?? 0],
          [d("clarificationRate"), `${clarifyRate}%`],
          [d("blocked"), overview?.events.blocked ?? 0],
          [d("failed"), `${failureRate}%`],
        ].map(
          ([label, value]) =>
            html`<div class="ea-card"><span>${label}</span><strong>${value}</strong></div>`,
        )}
      </section>

      <section class="ea-card ea-delegation-settings">
        <div class="ea-account-access-heading">
          <div>
            <h3>${d("generalSettings")}</h3>
            <p>${d("safeDefaults")}</p>
          </div>
          <span class="ea-badge">${d("revision", { revision: String(policy.revision) })}</span>
        </div>
        <label class="ea-field">
          ${d("routerModel")}
          <select
            class="ea-select"
            .value=${policy.routerModel}
            @change=${(event: Event) => props.onPolicy({ routerModel: eventValue(event) })}
          >
            <option value="" ?selected=${policy.routerModel === ""}>${d("chooseModel")}</option>
            ${props.availableModels.map(
              (model) => html`<option value=${model} ?selected=${model === policy.routerModel}>
                ${model}
              </option>`,
            )}
          </select>
          <span class="ea-muted">${d("modelNoFallback")}</span>
        </label>
        ${policy.routerModel && !props.routerModelAvailable
          ? html`<div class="ea-banner ea-banner--error" role="alert">
              ${d("modelUnavailable")}
            </div>`
          : nothing}
        <label class="ea-field">
          ${d("operatingMode")}
          <select
            class="ea-select"
            .value=${policy.rollout}
            @change=${(event: Event) =>
              props.onPolicy({
                rollout: delegationRollout(eventValue(event)),
              })}
          >
            <option value="off">${d("modeOff")}</option>
            <option value="shadow">${d("modeShadow")}</option>
            <option value="on">${d("modeOn")}</option>
          </select>
        </label>
        <details>
          <summary>${d("advancedSettings")}</summary>
          <div class="ea-delegation-advanced">
            <label class="ea-field"
              >${d("autoThreshold")}<input
                class="ea-input"
                type="number"
                min="0"
                max="1"
                step="0.01"
                .value=${String(policy.autoThreshold)}
                @input=${(event: Event) =>
                  props.onPolicy({
                    autoThreshold: Number(eventValue(event)),
                  })}
            /></label>
            <label class="ea-field"
              >${d("clarifyThreshold")}<input
                class="ea-input"
                type="number"
                min="0"
                max="1"
                step="0.01"
                .value=${String(policy.clarifyThreshold)}
                @input=${(event: Event) =>
                  props.onPolicy({
                    clarifyThreshold: Number(eventValue(event)),
                  })}
            /></label>
            <label class="ea-field"
              >${d("minimumMargin")}<input
                class="ea-input"
                type="number"
                min="0"
                max="1"
                step="0.01"
                .value=${String(policy.minimumMargin)}
                @input=${(event: Event) =>
                  props.onPolicy({
                    minimumMargin: Number(eventValue(event)),
                  })}
            /></label>
            <label class="ea-field"
              >${d("maxAgentsPerTurn")}<input
                class="ea-input"
                type="number"
                min="1"
                max="3"
                .value=${String(policy.maxDelegatesPerTurn)}
                @input=${(event: Event) =>
                  props.onPolicy({
                    maxDelegatesPerTurn: Number(eventValue(event)),
                  })}
            /></label>
            <label class="ea-field"
              >${d("retentionDays")}<input
                class="ea-input"
                type="number"
                min="1"
                max="3650"
                .value=${String(policy.eventRetentionDays)}
                @input=${(event: Event) =>
                  props.onPolicy({
                    eventRetentionDays: Number(eventValue(event)),
                  })}
            /></label>
          </div>
        </details>
        ${props.error ? html`<p class="ea-error" role="alert">${props.error}</p>` : nothing}
        <div class="ea-form-actions">
          <button
            class="ea-button ea-button--primary"
            type="button"
            ?disabled=${props.busy}
            @click=${props.onSavePolicy}
          >
            ${props.busy ? d("saving") : d("saveSettings")}
          </button>
        </div>
      </section>

      ${props.preview
        ? html`<section class="ea-card ea-activation-preview">
            <div class="ea-account-access-heading">
              <div>
                <h3>${d("previewActivation")}</h3>
                <p>${d("snapshotExpires", { time: formatDate(props.preview.expiresAt) })}</p>
              </div>
              <button
                class="ea-button ea-button--primary"
                type="button"
                ?disabled=${props.busy || !policy.routerModel}
                @click=${props.onActivate}
              >
                ${d("activateAssignments", { count: String(eligibleAfterExclusions) })}
              </button>
            </div>
            <div class="ea-delegation-metrics">
              <div>
                <span>${d("current")}</span><strong>${props.preview.summary.assignments}</strong>
              </div>
              <div>
                <span>${d("eligible")}</span><strong>${props.preview.summary.eligible}</strong>
              </div>
              <div>
                <span>${d("missingProfile")}</span
                ><strong>${props.preview.summary.missingProfile}</strong>
              </div>
              <div>
                <span>${d("blocked")}</span><strong>${props.preview.summary.blocked}</strong>
              </div>
              <div>
                <span>${d("orphaned")}</span><strong>${props.preview.summary.orphaned}</strong>
              </div>
              <div>
                <span>${d("affectedUsers")}</span
                ><strong>${props.preview.summary.affectedUsers}</strong>
              </div>
            </div>
            <label class="ea-field">
              ${d("searchUserOrAgent")}
              <input
                class="ea-input"
                type="search"
                .value=${props.previewQuery}
                @input=${(event: Event) => props.onPreviewQuery(eventValue(event))}
              />
            </label>
            <div class="ea-preview-list" aria-label=${d("previewListLabel")}>
              ${visiblePreviewRows.map((row) => {
                const key = previewRowKey(row.accountId, row.resourceKey);
                const excluded = props.previewExclusions.has(key);
                return html`<article class="ea-preview-row">
                  <div>
                    <strong>${row.displayName} (@${row.username})</strong>
                    <span>${row.agentName}</span>
                    ${row.reasonCodes.length
                      ? html`<small>${row.reasonCodes.join(", ")}</small>`
                      : nothing}
                  </div>
                  <label class="ea-switch-row">
                    <span>${row.eligible ? d("excludeFromActivation") : d("notEligible")}</span>
                    <input
                      type="checkbox"
                      .checked=${excluded}
                      ?disabled=${!row.eligible}
                      @change=${(event: Event) =>
                        props.onPreviewExclusion(key, eventChecked(event))}
                    />
                  </label>
                </article>`;
              })}
              ${visiblePreviewRows.length === 0
                ? html`<div class="ea-empty">${d("noMatchingRows")}</div>`
                : nothing}
            </div>
            <div class="ea-pagination" aria-label=${d("previewPagination")}>
              <button
                class="ea-button"
                type="button"
                ?disabled=${previewPage === 0}
                @click=${() => props.onPreviewPage(previewPage - 1)}
              >
                ${d("previousPage")}
              </button>
              <span
                >${d("pageCount", {
                  page: String(previewPage + 1),
                  count: String(previewPageCount),
                })}</span
              >
              <button
                class="ea-button"
                type="button"
                ?disabled=${previewPage + 1 >= previewPageCount}
                @click=${() => props.onPreviewPage(previewPage + 1)}
              >
                ${d("nextPage")}
              </button>
            </div>
          </section>`
        : nothing}

      <section class="ea-card ea-table-wrap">
        <div class="ea-account-access-heading">
          <div>
            <h3>${d("routingLog")}</h3>
            <p>${d("routingLogPrivacy")}</p>
          </div>
          <span class="ea-badge">${d("eventCount", { count: String(props.eventTotal) })}</span>
        </div>
        <div class="ea-event-filters" aria-label=${d("eventFiltersLabel")}>
          <label class="ea-field"
            >${d("createdFrom")}<input
              class="ea-input"
              type="datetime-local"
              .value=${props.eventFilters.createdFrom}
              @input=${(event: Event) =>
                props.onEventFilter({
                  createdFrom: eventValue(event),
                })}
          /></label>
          <label class="ea-field"
            >${d("createdTo")}<input
              class="ea-input"
              type="datetime-local"
              .value=${props.eventFilters.createdTo}
              @input=${(event: Event) =>
                props.onEventFilter({
                  createdTo: eventValue(event),
                })}
          /></label>
          <label class="ea-field"
            >${d("accountId")}<input
              class="ea-input"
              .value=${props.eventFilters.accountId}
              @input=${(event: Event) =>
                props.onEventFilter({
                  accountId: eventValue(event),
                })}
          /></label>
          <label class="ea-field"
            >${d("agentId")}<input
              class="ea-input"
              .value=${props.eventFilters.agentId}
              @input=${(event: Event) => props.onEventFilter({ agentId: eventValue(event) })}
          /></label>
          <label class="ea-field"
            >${d("outcome")}<select
              class="ea-select"
              .value=${props.eventFilters.outcome}
              @change=${(event: Event) => props.onEventFilter({ outcome: eventValue(event) })}
            >
              <option value="">${d("all")}</option>
              ${["delegated", "clarified", "local", "blocked", "failed", "cancelled", "shadow"].map(
                (outcome) => html`<option value=${outcome}>${outcomeLabel(outcome)}</option>`,
              )}
            </select></label
          >
          <label class="ea-field"
            >${d("reasonCode")}<input
              class="ea-input"
              .value=${props.eventFilters.reasonCode}
              @input=${(event: Event) =>
                props.onEventFilter({
                  reasonCode: eventValue(event),
                })}
          /></label>
          <button class="ea-button" type="button" @click=${props.onApplyEventFilters}>
            ${d("applyFilters")}
          </button>
        </div>
        <table class="ea-table">
          <thead>
            <tr>
              <th>${d("time")}</th>
              <th>${d("account")}</th>
              <th>${d("agent")}</th>
              <th>${d("outcome")}</th>
              <th>${d("source")}</th>
              <th>${d("reason")}</th>
              <th>${d("latency")}</th>
            </tr>
          </thead>
          <tbody>
            ${props.events.map(
              (event) =>
                html`<tr>
                  <td data-label=${d("time")}>${formatDate(event.createdAt)}</td>
                  <td data-label=${d("account")}>${event.accountId}</td>
                  <td data-label=${d("agent")}>${event.sharedAgentIds.join(", ") || "—"}</td>
                  <td data-label=${d("outcome")}>
                    <span class="ea-badge">${outcomeLabel(event.outcome)}</span>
                  </td>
                  <td data-label=${d("source")}>${decisionSourceLabel(event.decisionSource)}</td>
                  <td data-label=${d("reason")}>${event.reasonCode}</td>
                  <td data-label=${d("latency")}>
                    ${event.latencyMs === null ? "—" : `${event.latencyMs} ms`}
                  </td>
                </tr>`,
            )}
          </tbody>
        </table>
        ${props.events.length === 0 ? html`<div class="ea-empty">${d("noEvents")}</div>` : nothing}
        ${props.eventNextCursor
          ? html`<div class="ea-form-actions">
              <button
                class="ea-button"
                type="button"
                ?disabled=${props.busy}
                @click=${props.onLoadMoreEvents}
              >
                ${d("loadMore")}
              </button>
            </div>`
          : nothing}
      </section>
    </div>
  `;
}

export function renderDelegationProfileEditor(props: {
  name: string;
  description: string;
  profile: EnterpriseDelegationProfile;
  checklist: Record<string, boolean>;
  canActivate: boolean;
  dirty: boolean;
  busy: boolean;
  error: string;
  accounts: EnterpriseAccount[];
  accountQuery: string;
  aiSuggested: boolean;
  source?: { description: string; profile: EnterpriseDelegationProfile };
  conflict?: {
    description: string;
    profile: EnterpriseDelegationProfile;
    configHash: string;
  };
  simulationAccountId: string;
  simulationPrompt: string;
  simulationResult?: DelegationSimulationResult;
  onDescription: (value: string) => void;
  onProfile: (patch: Partial<EnterpriseDelegationProfile>) => void;
  onRequiredInputs: (value: EnterpriseDelegationProfile["requiredInputs"]) => void;
  onDraft: () => void;
  onSave: (activate: boolean) => void;
  onUseCurrentVersion: () => void;
  onAccountQuery: (value: string) => void;
  onSearchAccounts: () => void;
  onSimulationAccount: (value: string) => void;
  onSimulationPrompt: (value: string) => void;
  onSimulate: () => void;
}) {
  const lines = (value: string) =>
    value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  return html`
    <div class="ea-delegation-profile ea-stack">
      <div class="ea-banner">${d("profileTrustNotice")}</div>
      ${props.aiSuggested && props.source
        ? html`<section class="ea-card ea-ai-draft-review" role="status">
            <div>
              <strong>${d("aiDraftUnsaved")}</strong>
              <p>${d("aiDraftReview")}</p>
            </div>
            <ul>
              <li>
                ${d("descriptionDiff", {
                  state:
                    props.description === props.source.description ? d("unchanged") : d("changed"),
                })}
              </li>
              <li>
                ${d("useWhenDiff", {
                  before: String(props.source.profile.useWhen.length),
                  after: String(props.profile.useWhen.length),
                })}
              </li>
              <li>
                ${d("avoidWhenDiff", {
                  before: String(props.source.profile.avoidWhen.length),
                  after: String(props.profile.avoidWhen.length),
                })}
              </li>
              <li>
                ${d("requiredInputDiff", {
                  before: String(props.source.profile.requiredInputs.length),
                  after: String(props.profile.requiredInputs.length),
                })}
              </li>
            </ul>
          </section>`
        : nothing}
      ${props.conflict
        ? html`<section class="ea-card ea-conflict-review" role="alert">
            <div class="ea-account-access-heading">
              <div>
                <strong>${d("conflictTitle")}</strong>
                <p>${d("conflictHelp")}</p>
              </div>
              <button class="ea-button" type="button" @click=${props.onUseCurrentVersion}>
                ${d("replaceWithCurrent")}
              </button>
            </div>
            <div class="ea-conflict-grid">
              <div>
                <strong>${d("yourDraft")}</strong>
                <p>${props.description || d("emptyValue")}</p>
                <small
                  >${d("profileCounts", {
                    use: String(props.profile.useWhen.length),
                    avoid: String(props.profile.avoidWhen.length),
                    required: String(props.profile.requiredInputs.length),
                  })}</small
                >
              </div>
              <div>
                <strong>${d("currentVersion")}</strong>
                <p>${props.conflict.description || d("emptyValue")}</p>
                <small
                  >${d("profileCounts", {
                    use: String(props.conflict.profile.useWhen.length),
                    avoid: String(props.conflict.profile.avoidWhen.length),
                    required: String(props.conflict.profile.requiredInputs.length),
                  })}</small
                >
              </div>
            </div>
          </section>`
        : nothing}
      <label class="ea-field"
        >${d("specialistDescription")}<textarea
          id="ea-delegation-description"
          class="ea-textarea ea-textarea--compact"
          maxlength="500"
          .value=${props.description}
          aria-invalid=${String(!props.checklist.description)}
          aria-describedby="ea-delegation-description-help"
          @input=${(event: Event) => props.onDescription(eventValue(event))}
        ></textarea
        ><span id="ea-delegation-description-help" class="ea-muted"
          >${d("descriptionLength", { count: String(props.description.length) })}</span
        ></label
      >
      <label class="ea-field"
        >${d("useWhen")}<textarea
          id="ea-delegation-use-when"
          class="ea-textarea ea-textarea--compact"
          .value=${props.profile.useWhen.join("\n")}
          aria-invalid=${String(!props.checklist.useWhen)}
          aria-describedby="ea-delegation-use-when-help"
          @input=${(event: Event) => props.onProfile({ useWhen: lines(eventValue(event)) })}
        ></textarea
        ><span id="ea-delegation-use-when-help" class="ea-muted">${d("useWhenHelp")}</span></label
      >
      <label class="ea-field"
        >${d("avoidWhen")}<textarea
          id="ea-delegation-avoid-when"
          class="ea-textarea ea-textarea--compact"
          .value=${props.profile.avoidWhen.join("\n")}
          aria-invalid=${String(!props.checklist.avoidWhen)}
          aria-describedby="ea-delegation-avoid-when-help"
          @input=${(event: Event) =>
            props.onProfile({
              avoidWhen: lines(eventValue(event)),
            })}
        ></textarea
        ><span id="ea-delegation-avoid-when-help" class="ea-muted">${d("avoidWhenHelp")}</span>
      </label>
      <label class="ea-field"
        >${d("aliases")}<textarea
          id="ea-delegation-aliases"
          class="ea-textarea ea-textarea--small"
          .value=${props.profile.aliases.join("\n")}
          aria-invalid=${String(!props.checklist.aliases)}
          aria-describedby="ea-delegation-aliases-help"
          @input=${(event: Event) => props.onProfile({ aliases: lines(eventValue(event)) })}
        ></textarea
        ><span id="ea-delegation-aliases-help" class="ea-muted">${d("aliasesHelp")}</span>
      </label>
      <fieldset class="ea-fieldset">
        <legend>${d("handoffMode")}</legend>
        ${(
          [
            ["auto_when_certain", d("autoWhenCertain")],
            ["confirm_before_handoff", d("confirmBeforeHandoff")],
            ["explicit_only", d("explicitOnly")],
          ] as const
        ).map(
          ([value, label]) =>
            html`<label
              ><input
                type="radio"
                name="handlingMode"
                value=${value}
                .checked=${props.profile.handlingMode === value}
                @change=${() => props.onProfile({ handlingMode: value })}
              />${label}</label
            >`,
        )}
      </fieldset>
      <section class="ea-stack">
        <div class="ea-account-access-heading">
          <div>
            <h3>${d("requiredInputs")}</h3>
            <p>${d("requiredInputsHelp")}</p>
          </div>
          <button
            class="ea-button"
            type="button"
            @click=${() =>
              props.onRequiredInputs([
                ...props.profile.requiredInputs,
                { id: "", label: "", question: "" },
              ])}
          >
            ${d("addQuestion")}
          </button>
        </div>
        ${props.profile.requiredInputs.map(
          (item, index) =>
            html`<div class="ea-required-input-row">
              <input
                class="ea-input"
                placeholder=${d("inputLabelPlaceholder")}
                .value=${item.label}
                aria-invalid=${String(
                  item.label.trim().length < 1 || item.label.trim().length > 80,
                )}
                @input=${(event: Event) =>
                  props.onRequiredInputs(
                    props.profile.requiredInputs.map((current, position) =>
                      position === index ? { ...current, label: eventValue(event) } : current,
                    ),
                  )}
              /><input
                class="ea-input"
                placeholder=${d("questionPlaceholder")}
                .value=${item.question}
                aria-invalid=${String(
                  item.question.trim().length < 5 || item.question.trim().length > 240,
                )}
                @input=${(event: Event) =>
                  props.onRequiredInputs(
                    props.profile.requiredInputs.map((current, position) =>
                      position === index ? { ...current, question: eventValue(event) } : current,
                    ),
                  )}
              /><button
                class="ea-button ea-button--danger"
                type="button"
                aria-label=${d("deleteQuestion")}
                @click=${() =>
                  props.onRequiredInputs(
                    props.profile.requiredInputs.filter((_, position) => position !== index),
                  )}
              >
                ${d("delete")}
              </button>
            </div>`,
        )}
      </section>
      <section class="ea-card ea-profile-checklist">
        <h3>${d("activationChecklist")}</h3>
        ${Object.entries({
          description: d("validDescription"),
          aliases: d("validAliases"),
          useWhen: d("enoughUseExamples"),
          avoidWhen: d("validAvoidExamples"),
          requiredInputs: d("completeRequiredQuestions"),
          routerModel: d("routerSelected"),
          agentExists: d("agentExists"),
        }).map(
          ([key, label]) =>
            html`<div>
              <span aria-hidden="true">${props.checklist[key] ? "✓" : "!"}</span
              ><span>${label}</span>
            </div>`,
        )}
      </section>
      ${props.error ? html`<p class="ea-error" role="alert">${props.error}</p>` : nothing}
      <div class="ea-form-actions ea-sticky-actions">
        <button class="ea-button" type="button" ?disabled=${props.busy} @click=${props.onDraft}>
          ${d("aiSuggest")}</button
        ><button
          class="ea-button"
          type="button"
          ?disabled=${props.busy || !props.dirty}
          @click=${() => props.onSave(false)}
        >
          ${d("saveDraft")}</button
        ><button
          class="ea-button ea-button--primary"
          type="button"
          ?disabled=${props.busy}
          aria-disabled=${String(!props.canActivate)}
          @click=${() => props.onSave(true)}
        >
          ${d("activate")}
        </button>
      </div>
      <section class="ea-card ea-route-simulator">
        <div>
          <h3>${d("simulator")}</h3>
          <p>${d("simulatorSafety")}</p>
        </div>
        <div class="ea-account-search-row">
          <label class="ea-field"
            >${d("searchAccount")}<input
              class="ea-input"
              type="search"
              placeholder=${d("accountSearchPlaceholder")}
              .value=${props.accountQuery}
              @input=${(event: Event) => props.onAccountQuery(eventValue(event))}
              @keydown=${(event: KeyboardEvent) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  props.onSearchAccounts();
                }
              }}
          /></label>
          <button
            class="ea-button"
            type="button"
            ?disabled=${props.busy}
            @click=${props.onSearchAccounts}
          >
            ${d("search")}
          </button>
        </div>
        <label class="ea-field"
          >${d("account")}<select
            class="ea-select"
            .value=${props.simulationAccountId}
            @change=${(event: Event) => props.onSimulationAccount(eventValue(event))}
          >
            <option value="">${d("chooseAccount")}</option>
            ${props.accounts.map(
              (account) =>
                html`<option value=${account.id}>
                  ${account.displayName} (@${account.username})
                </option>`,
            )}
          </select></label
        ><label class="ea-field"
          >${d("testPrompt")}<textarea
            class="ea-textarea ea-textarea--small"
            .value=${props.simulationPrompt}
            @input=${(event: Event) => props.onSimulationPrompt(eventValue(event))}
          ></textarea></label
        ><button
          class="ea-button"
          type="button"
          ?disabled=${props.busy || !props.simulationAccountId || !props.simulationPrompt.trim()}
          @click=${props.onSimulate}
        >
          ${d("check")}</button
        >${props.simulationResult
          ? html`<div class="ea-banner" role="status">
              <strong
                >${props.simulationResult.outcome === "delegate"
                  ? d("wouldDelegate", {
                      agents: props.simulationResult.agentNames.join(", "),
                    })
                  : props.simulationResult.outcome === "clarify"
                    ? d("needsInformation")
                    : props.simulationResult.outcome === "blocked"
                      ? d("blocked")
                      : d("personalHandles")}</strong
              >
              <details>
                <summary>${d("adminDetails")}</summary>
                <dl class="ea-simulation-details">
                  <div>
                    <dt>${d("decisionSource")}</dt>
                    <dd>
                      ${decisionSourceLabel(props.simulationResult.decisionSource ?? "system")}
                    </dd>
                  </div>
                  <div>
                    <dt>${d("reason")}</dt>
                    <dd>${String(props.simulationResult.reasonCode ?? "—")}</dd>
                  </div>
                  <div>
                    <dt>${d("confidenceBand")}</dt>
                    <dd>
                      ${props.simulationResult.confidenceBand === "clear"
                        ? d("clear")
                        : props.simulationResult.confidenceBand === "ambiguous"
                          ? d("ambiguous")
                          : d("notApplicable")}
                    </dd>
                  </div>
                  <div>
                    <dt>${d("policyRevision")}</dt>
                    <dd>${String(props.simulationResult.policyRevision ?? "—")}</dd>
                  </div>
                  ${props.simulationResult.missingRequiredInput
                    ? html`<div>
                        <dt>${d("missingInformation")}</dt>
                        <dd>
                          ${props.simulationResult.missingRequiredInput.label}:
                          ${props.simulationResult.missingRequiredInput.question}
                        </dd>
                      </div>`
                    : nothing}
                </dl>
              </details>
            </div>`
          : nothing}
      </section>
    </div>
  `;
}
