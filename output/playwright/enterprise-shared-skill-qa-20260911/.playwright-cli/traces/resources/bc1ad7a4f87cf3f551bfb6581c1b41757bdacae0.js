import { r as M, t as N } from "./chat-route-adapter-Di6rAvcG.js";
import { D as h, I as g, N as _, P as v, i as y, o as b } from "./control-ui-boot-BkPDmfcr.js";
import { $ as x, P as S, U as C, it as w, x as T } from "./control-ui-boot-Bvc3ZZNG.js";
import { It as p, Lt as m } from "./control-ui-boot-CIjwt-AI.js";
import { Is as n, Ns as r, Ps as i } from "./control-ui-core-B5rJKETr.js";
import { M as a, j as o } from "./control-ui-core-BOclcphE.js";
import { Kn as t } from "./control-ui-foundation-CUUNgsy7.js";
import { G as s, J as c, W as l, Z as u, at as d, rt as f } from "./lit-runtime-BZcFnh9F.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
import { n as E, t as D } from "./settings-workspace-Cbu1mPuU.js";
import { n as A, t as j } from "./user-agent-catalog-store-9TBczRt4.js";
import { n as P, r as F, t as I } from "./user-agent-presenter-DM90PmU-.js";
import { n as O, t as k } from "./user-bootstrap-store-x-iL-PgP.js";
import "./personal-agent-BJm-7ZLh.js";
function L(e) {
  return e.kind === `personal` ? e.actions.canChat : (e.access?.allowed ?? e.actions.canChat);
}
function R(e) {
  return (
    e.kind === `shared` &&
    !L(e) &&
    e.actions.canRequestAccess === !0 &&
    e.access?.request?.state !== `pending`
  );
}
var z;
function B() {
  return (B = e(() => {
    (l(),
      u(),
      b(),
      n(),
      I(),
      (z = class extends r {
        constructor(...e) {
          (super(...e), (this.busy = !1));
        }
        render() {
          let e = this.agent;
          if (!e) return s;
          let t = e.access?.request,
            n = R(e),
            r = t?.state === `pending`,
            i = L(e),
            a = e.kind === `shared` && !i ? e.canonicalName : e.name,
            o = i ? null : P(e);
          return c`<article class="card eu-agent-card">
      <div class="eu-agent-card__identity">
        <span class="eu-agent-card__avatar" aria-hidden="true"
          >${F(e)}</span
        >
        <div class="eu-agent-card__copy">
          <div class="eu-agent-card__kind">
            ${e.kind === `personal` ? y(`personalAgent`) : y(`enterpriseAgent`)}
          </div>
          <h2>${a}</h2>
          ${
            e.kind === `shared` && i && e.name !== e.canonicalName
              ? c`<p class="eu-agent-card__canonical">
                ${y(`sharedCanonicalName`)}: ${e.canonicalName}
              </p>`
              : s
          }
        </div>
      </div>
      ${
        e.description || e.kind === `shared`
          ? c`<p class="eu-agent-card__description">
            ${e.description || y(`managedByCompany`)}
          </p>`
          : s
      }
      ${
        e.capabilityLabels.length > 0
          ? c`<ul class="eu-capability-list" aria-label=${y(`available`)}>
            ${e.capabilityLabels.map((e) => c`<li>${e}</li>`)}
          </ul>`
          : s
      }
      <div class="eu-agent-card__footer">
        <div class="eu-agent-card__status" role="status">
          <span
            class="eu-agent-card__badge ${e.actions.canChat ? `eu-agent-card__badge--ready` : ``}"
          >
            ${e.actions.canChat ? y(`agentReadyToChat`) : (o ?? y(`notAvailable`))}
          </span>
          ${!e.actions.canChat && t?.decisionReason ? c`<p class="eu-agent-card__decision">${t.decisionReason}</p>` : s}
        </div>
        <div class="eu-actions eu-agent-card__actions">
          <button
            type="button"
            class="btn primary"
            ?disabled=${this.busy || (!e.actions.canChat && !n)}
            @click=${() => (e.actions.canChat ? this.onStart?.(e) : this.onRequestAccess?.(e))}
          >
            ${this.busy ? (e.actions.canChat ? y(`agentOpenBusy`) : y(`agentAccessRequestBusy`)) : e.actions.canChat ? y(`startChat`) : t?.state === `rejected` ? y(`agentAccessResubmit`) : n ? y(`requestAgentAccess`) : (o ?? y(`notAvailable`))}
          </button>
          ${
            r
              ? c`<button
                type="button"
                class="btn"
                ?disabled=${this.busy}
                @click=${() => this.onCancelAccess?.(e)}
              >
                ${y(`cancelAgentAccessRequest`)}
              </button>`
              : s
          }
          ${
            e.actions.canEdit
              ? c`<button type="button" class="btn" @click=${() => this.onEdit?.(e)}>
                ${y(`edit`)}
              </button>`
              : s
          }
          ${
            e.kind === `shared`
              ? c`<button type="button" class="btn" @click=${() => this.onDetail?.(e)}>
                ${y(`viewCapabilities`)}
              </button>`
              : s
          }
        </div>
      </div>
    </article>`;
        }
      }),
      t([d({ attribute: !1 })], z.prototype, `agent`, void 0),
      t([d({ attribute: !1 })], z.prototype, `busy`, void 0),
      t([d({ attribute: !1 })], z.prototype, `onStart`, void 0),
      t([d({ attribute: !1 })], z.prototype, `onRequestAccess`, void 0),
      t([d({ attribute: !1 })], z.prototype, `onCancelAccess`, void 0),
      t([d({ attribute: !1 })], z.prototype, `onEdit`, void 0),
      t([d({ attribute: !1 })], z.prototype, `onDetail`, void 0),
      customElements.get(`openclaw-user-agent-card`) ||
        customElements.define(`openclaw-user-agent-card`, z));
  }))();
}
var V;
function H() {
  return (H = e(() => {
    (m(),
      l(),
      u(),
      a(),
      h(),
      b(),
      n(),
      N(),
      I(),
      S(),
      k(),
      (V = class extends i {
        constructor(...e) {
          (super(...e),
            (this.busy = !1),
            (this.error = ``),
            (this.relationshipBusy = !1),
            (this.accessRequest = null),
            (this.accessRequestBusy = !1),
            (this.relationshipEpoch = 0));
        }
        updated(e) {
          if (e.has(`agent`)) {
            let t = e.get(`agent`),
              n = this.agent,
              r = !!(
                t &&
                n &&
                t.key === n.key &&
                this.canLoadRelationship(t) &&
                this.canLoadRelationship(n)
              );
            if (((this.accessRequest = n?.access?.request ?? null), (this.error = ``), r)) {
              !this.relationship && !this.relationshipBusy && this.loadRelationship();
              return;
            }
            (++this.relationshipEpoch,
              (this.relationship = void 0),
              (this.relationshipSource = void 0),
              (this.relationshipBusy = !1),
              (this.accessRequestBusy = !1),
              this.loadRelationship());
          }
        }
        canLoadRelationship(e = this.agent) {
          return !!(e && e.kind === `shared` && e.actions.canChat && L(e));
        }
        async loadRelationship() {
          let e = this.agent;
          if (!e || !this.canLoadRelationship(e)) return;
          let t = ++this.relationshipEpoch;
          ((this.relationshipBusy = !0), (this.error = ``));
          try {
            let n = await C(e.key);
            t === this.relationshipEpoch &&
              ((this.relationship = n), (this.relationshipSource = n));
          } catch (e) {
            t === this.relationshipEpoch &&
              (this.error = e instanceof Error ? e.message : y(`sharedRelationshipLoadFailed`));
          } finally {
            t === this.relationshipEpoch && (this.relationshipBusy = !1);
          }
        }
        updateRelationship(e) {
          this.relationship &&= { ...this.relationship, ...e };
        }
        relationshipDirty() {
          let e = this.relationship,
            t = this.relationshipSource;
          return !!(
            e &&
            t &&
            (e.agentAlias !== t.agentAlias ||
              e.agentSelfReference !== t.agentSelfReference ||
              e.userAddress !== t.userAddress ||
              e.customInstructions !== t.customInstructions)
          );
        }
        async saveRelationship() {
          let e = this.agent,
            t = this.relationship;
          if (!(!e || !t || this.relationshipBusy || !this.relationshipDirty())) {
            ((this.relationshipBusy = !0), (this.error = ``));
            try {
              let n = await w(e.key, t);
              ((this.relationship = n), (this.relationshipSource = n), await O.load(!0));
            } catch (e) {
              this.error = e instanceof Error ? e.message : y(`sharedRelationshipSaveFailed`);
            } finally {
              this.relationshipBusy = !1;
            }
          }
        }
        async start() {
          if (!(!this.agent || !this.agent.actions.canChat || this.busy)) {
            ((this.busy = !0), (this.error = ``));
            try {
              await M(this.context, this.agent.key, `resume-latest`);
            } catch (e) {
              this.error = e instanceof Error ? e.message : y(`agentOpenFailed`);
            } finally {
              this.busy = !1;
            }
          }
        }
        async requestAccess() {
          let e = this.agent;
          if (!(!e || !R(e) || this.accessRequestBusy)) {
            ((this.accessRequestBusy = !0), (this.error = ``));
            try {
              let t = await x(e.key);
              ((this.accessRequest = t), O.applyAgentAccessRequest(t));
            } catch (e) {
              this.error = e instanceof Error ? e.message : y(`agentAccessRequestFailed`);
            } finally {
              this.accessRequestBusy = !1;
            }
          }
        }
        async cancelAccess() {
          let e = this.agent,
            t = this.accessRequest ?? e?.access?.request;
          if (!(!e || !t || t.state !== `pending` || this.accessRequestBusy)) {
            ((this.accessRequestBusy = !0), (this.error = ``));
            try {
              let e = await T(t);
              ((this.accessRequest = e), O.applyAgentAccessRequest(e));
            } catch (e) {
              this.error = e instanceof Error ? e.message : y(`agentAccessCancelFailed`);
            } finally {
              this.accessRequestBusy = !1;
            }
          }
        }
        backToLibrary() {
          (this.context.navigate(`enterprise`),
            this.dispatchEvent(
              new CustomEvent(`shared-agent-detail-close`, { bubbles: !0, composed: !0 }),
            ));
        }
        render() {
          let e = this.agent;
          if (!e) return s;
          let t = this.canLoadRelationship(e),
            n = t ? (this.relationship ?? e.relationship ?? void 0) : void 0,
            r = this.accessRequest ?? e.access?.request ?? null,
            i = R(e),
            a = n?.agentAlias || e.canonicalName;
          return _(
            c`
        <header class="eu-page-header">
          <div>
            <p class="eu-agent-card__kind">${y(`enterpriseAgent`)} · ${y(`managedByCompany`)}</p>
            <h1>${a}</h1>
            <p>${e.description ?? y(`sharedAgentDescription`)}</p>
          </div>
          ${
            e.actions.canChat
              ? c`<button
                class="btn primary"
                type="button"
                ?disabled=${this.busy}
                @click=${() => void this.start()}
              >
                ${this.busy ? y(`agentOpenBusy`) : y(`startChat`)}
              </button>`
              : r?.state === `pending`
                ? c`<button
                  class="btn"
                  type="button"
                  ?disabled=${this.accessRequestBusy}
                  @click=${() => void this.cancelAccess()}
                >
                  ${this.accessRequestBusy ? y(`agentAccessRequestBusy`) : y(`cancelAgentAccessRequest`)}
                </button>`
                : i
                  ? c`<button
                    class="btn primary"
                    type="button"
                    ?disabled=${this.accessRequestBusy}
                    @click=${() => void this.requestAccess()}
                  >
                    ${this.accessRequestBusy ? y(`agentAccessRequestBusy`) : r?.state === `rejected` ? y(`agentAccessResubmit`) : y(`requestAgentAccess`)}
                  </button>`
                  : s
          }
        </header>
        ${
          e.actions.canChat
            ? s
            : c`<div class="callout warn" role="status">
              ${P(e)}
              ${r?.decisionReason ? c`<br /><small>${r.decisionReason}</small>` : s}
            </div>`
        }
        ${this.error ? c`<div class="callout danger" role="alert">${this.error}</div>` : s}
        ${
          t
            ? g(
                {
                  title: y(`sharedRelationshipTitle`),
                  description: y(`sharedRelationshipDescription`),
                  actions: c`<button
                  class="btn primary"
                  type="button"
                  ?disabled=${this.relationshipBusy || !this.relationshipDirty()}
                  @click=${() => void this.saveRelationship()}
                >
                  ${this.relationshipBusy ? y(`saveBusy`) : y(`saveChanges`)}
                </button>`,
                },
                n
                  ? c`
                    ${v({ title: y(`sharedCanonicalName`), description: y(`sharedCanonicalNameDescription`), control: c`<strong>${e.canonicalName}</strong>` })}
                    ${v({
                      title: y(`sharedAgentAlias`),
                      description: y(`sharedAgentAliasDescription`),
                      control: c`<input
                        class="settings-input"
                        aria-label=${y(`sharedAgentAlias`)}
                        maxlength="64"
                        placeholder=${e.canonicalName}
                        .value=${n.agentAlias}
                        ?disabled=${this.relationshipBusy || !e.actions.canPersonalize}
                        @input=${(e) => this.updateRelationship({ agentAlias: e.currentTarget.value })}
                      />`,
                    })}
                    ${v({
                      title: y(`sharedAgentSelfReference`),
                      description: y(`sharedAgentSelfReferenceDescription`),
                      control: c`<input
                        class="settings-input"
                        aria-label=${y(`sharedAgentSelfReference`)}
                        maxlength="64"
                        .value=${n.agentSelfReference}
                        ?disabled=${this.relationshipBusy || !e.actions.canPersonalize}
                        @input=${(e) => this.updateRelationship({ agentSelfReference: e.currentTarget.value })}
                      />`,
                    })}
                    ${v({
                      title: y(`sharedUserAddress`),
                      description: y(`sharedUserAddressDescription`),
                      control: c`<input
                        class="settings-input"
                        aria-label=${y(`sharedUserAddress`)}
                        maxlength="128"
                        .value=${n.userAddress}
                        ?disabled=${this.relationshipBusy || !e.actions.canPersonalize}
                        @input=${(e) => this.updateRelationship({ userAddress: e.currentTarget.value })}
                      />`,
                    })}
                    ${v({
                      title: y(`sharedRelationshipInstructions`),
                      description: y(`sharedRelationshipInstructionsDescription`),
                      stacked: !0,
                      control: c`<textarea
                        class="settings-textarea eu-personal-agent__textarea"
                        aria-label=${y(`sharedRelationshipInstructions`)}
                        maxlength="1200"
                        .value=${n.customInstructions}
                        ?disabled=${this.relationshipBusy || !e.actions.canPersonalize}
                        @input=${(e) => this.updateRelationship({ customInstructions: e.currentTarget.value })}
                      ></textarea>`,
                    })}
                  `
                  : v({ title: y(`loading`) }),
              )
            : s
        }
        ${t ? g({ title: y(`sharedPrivateMemory`), description: y(`sharedPrivateMemoryDescription`) }, v({ title: y(`sharedMemoryScope`), description: y(`sharedMemoryScopeDescription`) })) : s}
        ${g({ title: y(`available`), description: y(`managedCapabilitiesDescription`) }, e.capabilityLabels.length ? e.capabilityLabels.map((e) => v({ title: e })) : v({ title: y(`managedCapabilitiesEmpty`) }))}
        ${g({ title: y(`managedByCompany`) }, v({ title: y(`managedByCompany`), description: y(`managedUseDescription`) }))}
        <button class="btn" type="button" @click=${() => this.backToLibrary()}>
          ${y(`agentLibraryBack`)}
        </button>
      `,
            { wide: !0 },
          );
        }
      }),
      t([p({ context: o, subscribe: !1 })], V.prototype, `context`, void 0),
      t([d({ attribute: !1 })], V.prototype, `agent`, void 0),
      t([f()], V.prototype, `busy`, void 0),
      t([f()], V.prototype, `error`, void 0),
      t([f()], V.prototype, `relationship`, void 0),
      t([f()], V.prototype, `relationshipSource`, void 0),
      t([f()], V.prototype, `relationshipBusy`, void 0),
      t([f()], V.prototype, `accessRequest`, void 0),
      t([f()], V.prototype, `accessRequestBusy`, void 0),
      customElements.get(`openclaw-user-shared-agent-detail-page`) ||
        customElements.define(`openclaw-user-shared-agent-detail-page`, V));
  }))();
}
var U;
function W() {
  return (W = e(() => {
    (m(),
      l(),
      u(),
      a(),
      h(),
      D(),
      b(),
      n(),
      N(),
      B(),
      H(),
      S(),
      j(),
      k(),
      (U = class extends i {
        constructor(...e) {
          (super(...e),
            (this.query = ``),
            (this.busyKey = ``),
            (this.requestBusyKey = ``),
            (this.error = ``),
            (this.unsubscribers = []),
            (this.refreshOnFocus = () => {
              this.refreshCatalog();
            }));
        }
        connectedCallback() {
          (super.connectedCallback(),
            (this.unsubscribers = [
              O.subscribe(() => this.requestUpdate()),
              A.subscribe(() => this.requestUpdate()),
            ]),
            window.addEventListener(`focus`, this.refreshOnFocus),
            this.refreshCatalog());
        }
        disconnectedCallback() {
          for (let e of this.unsubscribers) e();
          ((this.unsubscribers = []),
            window.removeEventListener(`focus`, this.refreshOnFocus),
            super.disconnectedCallback());
        }
        refreshCatalog() {
          O.state.phase !== `loading` && A.load(!0);
        }
        async start(e) {
          if (!(!e.actions.canChat || this.busyKey || this.requestBusyKey)) {
            ((this.busyKey = e.key), (this.error = ``));
            try {
              await M(this.context, e.key, `resume-latest`);
            } catch (e) {
              this.error = e instanceof Error ? e.message : y(`agentOpenFailed`);
            } finally {
              this.busyKey = ``;
            }
          }
        }
        async requestAccess(e) {
          if (!(!R(e) || this.busyKey || this.requestBusyKey)) {
            ((this.requestBusyKey = e.key), (this.error = ``));
            try {
              let t = await x(e.key);
              O.applyAgentAccessRequest(t);
            } catch (e) {
              this.error = e instanceof Error ? e.message : y(`agentAccessRequestFailed`);
            } finally {
              this.requestBusyKey = ``;
            }
          }
        }
        async cancelAccess(e) {
          let t = e.access?.request;
          if (!(!t || t.state !== `pending` || this.busyKey || this.requestBusyKey)) {
            ((this.requestBusyKey = e.key), (this.error = ``));
            try {
              let e = await T(t);
              O.applyAgentAccessRequest(e);
            } catch (e) {
              this.error = e instanceof Error ? e.message : y(`agentAccessCancelFailed`);
            } finally {
              this.requestBusyKey = ``;
            }
          }
        }
        sharedAgentKeyFromPath() {
          let e = new URLSearchParams(globalThis.location?.search ?? ``).get(`agent`);
          if (e) return e;
          let t = /\/agents\/shared\/([^/]+)\/?$/i.exec(globalThis.location?.pathname ?? ``);
          if (!t?.[1]) return null;
          try {
            return decodeURIComponent(t[1]);
          } catch {
            return null;
          }
        }
        showDetail(e) {
          let t = this.context.basePath.replace(/\/$/u, ``);
          (this.context.navigate(`enterprise`, {
            pathname: `${t}/agents/shared/${encodeURIComponent(e.key)}`,
          }),
            this.requestUpdate());
        }
        render() {
          let e = O.state,
            t =
              e.phase === `loading` || e.phase === `idle`
                ? c`<div class="loading-state" role="status">${y(`agentLibraryLoading`)}</div>`
                : e.phase === `error`
                  ? c`<div class="callout danger" role="alert">
              ${e.message}
              <button
                class="btn"
                type="button"
                @click=${() => void A.load(!0)}
              >
                ${y(`retry`)}
              </button>
            </div>`
                  : e.phase === `ready`
                    ? (() => {
                        let t = this.sharedAgentKeyFromPath();
                        if (t) {
                          let n = e.data.agents.find((e) => e.kind === `shared` && e.key === t);
                          return n
                            ? c`${
                                e.refreshError
                                  ? c`<div class="callout danger" role="alert">
                              ${e.refreshError}
                            </div>`
                                  : s
                              }
                        <openclaw-user-shared-agent-detail-page
                          .agent=${n}
                          @shared-agent-detail-close=${() => {
                            (this.refreshCatalog(), this.requestUpdate());
                          }}
                        ></openclaw-user-shared-agent-detail-page>`
                            : c`<div class="callout warn" role="status">
                        ${y(`agentNoAccess`)}
                        <button
                          class="btn"
                          type="button"
                          @click=${() => this.context.navigate(`enterprise`)}
                        >
                          ${y(`agentLibraryBack`)}
                        </button>
                      </div>`;
                        }
                        let n = this.query.trim().toLowerCase(),
                          r = e.data.agents.filter(
                            (e) =>
                              !n ||
                              e.name.toLowerCase().includes(n) ||
                              e.canonicalName.toLowerCase().includes(n) ||
                              e.description?.toLowerCase().includes(n),
                          ),
                          i = e.data.agents.filter((e) => e.kind === `shared`).length;
                        return _(
                          c`
                    <header class="eu-page-header eu-agent-library-header">
                      <div>
                        <h1>${y(`agentLibrary`)}</h1>
                        <p>${y(`agentLibraryDescription`)}</p>
                      </div>
                    </header>
                    ${
                      e.refreshError
                        ? c`<div class="callout danger" role="alert">
                          ${e.refreshError}
                        </div>`
                        : s
                    }
                    ${
                      e.data.agents.length > 6
                        ? c`<label class="field eu-agent-search">
                          <span>${y(`agentSearch`)}</span>
                          <input
                            class="input"
                            type="search"
                            .value=${this.query}
                            @input=${(e) => {
                              this.query = e.currentTarget.value;
                            }}
                          />
                        </label>`
                        : s
                    }
                    ${this.error ? c`<div class="callout danger" role="alert">${this.error}</div>` : s}
                    <div class="eu-agent-grid">
                      ${r.map(
                        (e) => c`<openclaw-user-agent-card
                          .agent=${e}
                          .busy=${this.busyKey === e.key || this.requestBusyKey === e.key}
                          .onStart=${(e) => void this.start(e)}
                          .onRequestAccess=${(e) => void this.requestAccess(e)}
                          .onCancelAccess=${(e) => void this.cancelAccess(e)}
                          .onEdit=${() => this.context.navigate(`agents`)}
                          .onDetail=${(e) => this.showDetail(e)}
                        ></openclaw-user-agent-card>`,
                      )}
                    </div>
                    ${i === 0 ? c`<div class="settings-empty">${y(`agentNoCompany`)}</div>` : s}
                  `,
                          { wide: !0 },
                        );
                      })()
                    : s;
          return E(t);
        }
      }),
      t([p({ context: o, subscribe: !1 })], U.prototype, `context`, void 0),
      t([f()], U.prototype, `query`, void 0),
      t([f()], U.prototype, `busyKey`, void 0),
      t([f()], U.prototype, `requestBusyKey`, void 0),
      t([f()], U.prototype, `error`, void 0),
      customElements.get(`openclaw-user-agents-library-page`) ||
        customElements.define(`openclaw-user-agents-library-page`, U));
  }))();
}
W();
//# sourceMappingURL=agents-library-page-CX35-lz1.js.map
