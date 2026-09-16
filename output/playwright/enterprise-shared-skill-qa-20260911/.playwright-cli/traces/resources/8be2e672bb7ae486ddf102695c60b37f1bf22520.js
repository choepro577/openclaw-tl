import { n as Te, r as k, t as A } from "./chat-route-adapter-Di6rAvcG.js";
import { n as w, t as Se } from "./confirm-dialog-Cu2vXHyn.js";
import { i as y, mi as ce, o as b, pi as le } from "./control-ui-boot-BkPDmfcr.js";
import {
  E as he,
  I as ge,
  P as _e,
  Q as ve,
  b as C,
  j as ye,
  kt as be,
  ln as xe,
} from "./control-ui-boot-Bvc3ZZNG.js";
import {
  Aa as x,
  Ba as ue,
  Da as S,
  Ea as de,
  Ga as fe,
  Na as pe,
  Ua as me,
} from "./control-ui-boot-D1_QZILW.js";
import {
  Di as n,
  Is as r,
  Ns as i,
  Ps as a,
  ii as o,
  ji as s,
  st as c,
} from "./control-ui-core-B5rJKETr.js";
import {
  Jr as ee,
  Kr as te,
  Xn as l,
  Zn as u,
  an as d,
  in as ne,
  mt as re,
  on as ie,
  pt as ae,
  qn as oe,
} from "./control-ui-core-BOclcphE.js";
import { o as v, t as se } from "./control-ui-core-k5VGv3wu.js";
import { Kn as t } from "./control-ui-foundation-CUUNgsy7.js";
import { n as T, t as Ce } from "./input-dialog-8_SMx5uN.js";
import { G as f, J as p, W as m, Z as h, at as g, rt as _ } from "./lit-runtime-BZcFnh9F.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
import { n as D, t as O } from "./user-agent-catalog-store-9TBczRt4.js";
import { r as j, t as M } from "./user-agent-presenter-DM90PmU-.js";
import { n as E, t as we } from "./user-bootstrap-store-x-iL-PgP.js";
function Ee(e, t) {
  let n = t.trim().toLocaleLowerCase();
  return n
    ? e.filter((e) =>
        [e.name, e.canonicalName, e.description ?? ``, ...e.capabilityLabels].some((e) =>
          e.toLocaleLowerCase().includes(n),
        ),
      )
    : e;
}
var N;
function P() {
  return (P = e(() => {
    (m(),
      h(),
      u(),
      b(),
      r(),
      A(),
      M(),
      O(),
      (N = class extends i {
        constructor(...e) {
          (super(...e),
            (this.operationBusy = !1),
            (this.query = ``),
            (this.switching = !1),
            (this.error = ``),
            (this.closeOnOutsidePointer = (e) => {
              e.composedPath().includes(this) || this.closeMenu();
            }),
            (this.closeOnEscape = (e) => {
              let t = this.renderRoot.querySelector(`details`);
              e.key !== `Escape` ||
                !t?.open ||
                (e.preventDefault(), this.closeMenu(), t.querySelector(`summary`)?.focus());
            }),
            (this.closeOnViewportChange = (e) => {
              (e.type === `scroll` && e.target instanceof Node && this.contains(e.target)) ||
                this.closeMenu();
            }));
        }
        connectedCallback() {
          (super.connectedCallback(),
            (this.unsubscribe = D.subscribe(() => this.requestUpdate())),
            document.addEventListener(`pointerdown`, this.closeOnOutsidePointer),
            document.addEventListener(`keydown`, this.closeOnEscape),
            document.addEventListener(`scroll`, this.closeOnViewportChange, !0),
            window.addEventListener(`resize`, this.closeOnViewportChange),
            D.load());
        }
        disconnectedCallback() {
          (this.unsubscribe?.(),
            (this.unsubscribe = void 0),
            document.removeEventListener(`pointerdown`, this.closeOnOutsidePointer),
            document.removeEventListener(`keydown`, this.closeOnEscape),
            document.removeEventListener(`scroll`, this.closeOnViewportChange, !0),
            window.removeEventListener(`resize`, this.closeOnViewportChange),
            super.disconnectedCallback());
        }
        closeMenu() {
          let e = this.renderRoot.querySelector(`details`);
          e && (e.open = !1);
        }
        positionMenu(e) {
          if (!e.open) return;
          let t = e.querySelector(`summary`),
            n = e.querySelector(`.eu-agent-switcher__menu`);
          if (!t || !n) return;
          let r = t.getBoundingClientRect(),
            i = window.innerHeight - r.bottom - 4 - 8,
            a = r.top - 4 - 8,
            o = i < 220 && a > i,
            s = o ? a : i;
          ((n.style.left = `${Math.max(8, r.left)}px`),
            (n.style.width = `${Math.min(r.width, window.innerWidth - 16)}px`),
            (n.style.maxHeight = `${Math.min(360, Math.max(80, s))}px`),
            (n.style.top = o ? `auto` : `${r.bottom + 4}px`),
            (n.style.bottom = o ? `${window.innerHeight - r.top + 4}px` : `auto`));
        }
        async selectAgent(e) {
          let t = this.context;
          if (!(!t || this.switching || this.operationBusy)) {
            ((this.switching = !0), this.onSwitchingChange?.(!0), (this.error = ``));
            try {
              (await k(t, e, `resume-latest`), this.closeMenu(), this.onNavigate?.());
            } catch (e) {
              this.error = e instanceof Error ? e.message : y(`switchAgentFailed`);
            } finally {
              ((this.switching = !1), this.onSwitchingChange?.(!1));
            }
          }
        }
        showPersonalAgent() {
          let e = this.context;
          e && ((this.error = ``), e.navigate(`agents`), this.closeMenu(), this.onNavigate?.());
        }
        renderGroup(e, t) {
          return t.length === 0
            ? f
            : p`
      <section class="eu-agent-switcher__group" aria-label=${e}>
        <span class="eu-agent-switcher__group-label">${e}</span>
        ${t.map(
          (e) => p`
            <div class="eu-agent-switcher__row">
              <button
                type="button"
                class="eu-agent-switcher__select"
                aria-current=${D.activeKey === e.key ? `true` : f}
                ?disabled=${this.switching || this.operationBusy || !e.actions.canChat}
                @click=${() => void this.selectAgent(e.key)}
              >
                <span class="eu-agent-switcher__menu-avatar" aria-hidden="true">
                  ${j(e)}
                </span>
                <span class="eu-agent-switcher__copy">
                  <strong>${e.name}</strong>
                  <small>${e.description ?? y(`managedByCompany`)}</small>
                </span>
                ${
                  D.activeKey === e.key
                    ? p`<span class="eu-agent-switcher__active" aria-label=${y(`activeAgent`)}
                      >${l.check}</span
                    >`
                    : f
                }
              </button>
              ${
                e.kind === `personal`
                  ? p`<button
                    type="button"
                    class="btn btn--ghost eu-agent-switcher__action"
                    aria-label=${y(`edit`)}
                    @click=${() => this.showPersonalAgent()}
                  >
                    ${l.edit}
                  </button>`
                  : f
              }
            </div>
          `,
        )}
      </section>
    `;
        }
        render() {
          let e = D.agents,
            t = D.activeAgent,
            n = Ee(e, this.query);
          return p`
      <details
        class="eu-agent-switcher"
        @toggle=${(e) => this.positionMenu(e.currentTarget)}
      >
        <summary aria-label=${y(`changeActiveAgent`)}>
          <span class="eu-agent-switcher__avatar" aria-hidden="true">
            ${t ? j(t) : `◌`}
          </span>
          <span class="eu-agent-switcher__identity">
            <small>${y(`activeAgent`)}</small>
            <strong>${t?.name ?? y(`notAvailable`)}</strong>
          </span>
          <span class="eu-agent-switcher__chevron" aria-hidden="true">${l.chevronDown}</span>
        </summary>
        <div class="eu-agent-switcher__menu">
          ${
            e.length > 6
              ? p`<label class="field eu-agent-switcher__search">
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
              : f
          }
          ${this.renderGroup(
            y(`myAgents`),
            n.filter((e) => e.kind === `personal`),
          )}
          ${this.renderGroup(
            y(`company`),
            n.filter((e) => e.kind === `shared`),
          )}
          ${n.length === 0 ? p`<div class="settings-empty">${y(`agentNone`)}</div>` : f}
        </div>
      </details>
      ${this.error ? p`<p class="callout danger" role="alert">${this.error}</p>` : f}
    `;
        }
      }),
      t([g({ attribute: !1 })], N.prototype, `context`, void 0),
      t([g({ attribute: !1 })], N.prototype, `onNavigate`, void 0),
      t([g({ attribute: !1 })], N.prototype, `operationBusy`, void 0),
      t([g({ attribute: !1 })], N.prototype, `onSwitchingChange`, void 0),
      t([_()], N.prototype, `query`, void 0),
      t([_()], N.prototype, `switching`, void 0),
      t([_()], N.prototype, `error`, void 0),
      customElements.get(`openclaw-enterprise-user-agent-switcher`) ||
        customElements.define(`openclaw-enterprise-user-agent-switcher`, N));
  }))();
}
function F(e) {
  return s(e.key, e);
}
var I, L, R;
function z() {
  return (z = e(() => {
    (n(),
      de(),
      (I = `recent`),
      (L = 420),
      (R = class {
        constructor(e) {
          ((this.host = e),
            (this.draggingSessionKey = null),
            (this.sessionDropTarget = null),
            (this.sessionDropBeforeKey = null),
            (this.suppressNextConversationOpen = !1),
            (this.handleSessionPointerMove = (e) => {
              let t = this.pointerDrag;
              if (
                !t ||
                t.pointerId !== e.pointerId ||
                (!t.active && !this.activatePointerDrag(e, t))
              )
                return;
              (e.preventDefault(),
                this.pointerDragPreview?.style.setProperty(
                  `transform`,
                  `translate3d(${e.clientX + 12}px, ${e.clientY + 12}px, 0)`,
                ));
              let n = document
                  .elementFromPoint(e.clientX, e.clientY)
                  ?.closest(`.eu-session-project, .eu-session-recent`),
                r = n?.dataset.projectId;
              if (n?.classList.contains(`eu-session-recent`) && this.recentAcceptsSession())
                this.setSessionDropTarget(I, this.predictedRecentBeforeSessionKey(t.sessionKey));
              else if (r) {
                let i = this.beforeSessionKeyAtPoint(n, e.clientY, t.sessionKey);
                this.projectAcceptsSession(r, i)
                  ? this.activateProjectTarget(r, i)
                  : this.clearSessionDropTarget();
              } else this.clearSessionDropTarget();
            }),
            (this.handleSessionPointerUp = (e) => {
              let t = this.pointerDrag;
              if (!t || t.pointerId !== e.pointerId) return;
              let n = t.active,
                r = t.sessionKey,
                i = this.sessionDropTarget,
                a = this.sessionDropBeforeKey,
                o = i === `recent` ? null : i,
                s = !!(i && (o === null || this.placementChangesOrder(r, o, a)));
              if (
                (n &&
                  (e.preventDefault(),
                  (this.suppressNextConversationOpen = !0),
                  globalThis.setTimeout(() => {
                    this.suppressNextConversationOpen = !1;
                  }, 0)),
                this.finishSessionDrag(),
                !n || !i)
              )
                return;
              let c = this.host.getSessions().find((e) => e.key === r);
              c && s && this.host.moveToProject(c, o, o === null ? void 0 : a);
            }),
            (this.handleSessionPointerCancel = (e) => {
              this.pointerDrag?.pointerId === e.pointerId && this.finishSessionDrag();
            }));
        }
        connect() {
          (globalThis.addEventListener(`pointermove`, this.handleSessionPointerMove, {
            passive: !1,
          }),
            globalThis.addEventListener(`pointerup`, this.handleSessionPointerUp),
            globalThis.addEventListener(`pointercancel`, this.handleSessionPointerCancel));
        }
        disconnect() {
          (globalThis.removeEventListener(`pointermove`, this.handleSessionPointerMove),
            globalThis.removeEventListener(`pointerup`, this.handleSessionPointerUp),
            globalThis.removeEventListener(`pointercancel`, this.handleSessionPointerCancel),
            this.clearPointerSessionDrag(),
            this.clearPendingProjectExpansion(),
            document.body.classList.remove(`eu-session-drag-active`));
        }
        consumeSuppressedConversationOpen() {
          return this.suppressNextConversationOpen
            ? ((this.suppressNextConversationOpen = !1), !0)
            : !1;
        }
        startSessionDrag(e, t) {
          if (this.pointerDrag?.active) {
            e.preventDefault();
            return;
          }
          let n = e.dataTransfer;
          if (!n) return;
          (this.clearPointerSessionDrag(),
            pe(n, t.key),
            this.setDraggingSessionKey(t.key),
            this.clearSessionDropTarget(),
            this.host.closeMenu(),
            document.body.classList.add(`eu-session-drag-active`));
          let r = this.createSessionDragPreview(t, e.currentTarget);
          (n.setDragImage(r, 18, 20), globalThis.setTimeout(() => r.remove(), 0));
        }
        startPointerSessionDrag(e, t) {
          let n = e.currentTarget,
            r = e.pointerType !== `mouse` && !n.classList.contains(`eu-session-row__drag-handle`);
          e.button !== 0 ||
            r ||
            this.host.getBusyKey() ||
            t.archived === !0 ||
            t.pinned === !0 ||
            (this.pointerDrag = {
              pointerId: e.pointerId,
              sessionKey: t.key,
              startX: e.clientX,
              startY: e.clientY,
              active: !1,
            });
        }
        finishSessionDrag() {
          (this.clearPointerSessionDrag(),
            this.clearPendingProjectExpansion(),
            document.body.classList.remove(`eu-session-drag-active`),
            this.setDraggingSessionKey(null),
            this.clearSessionDropTarget());
        }
        handleProjectDragOver(e, t) {
          let n = this.draggingSessionKey,
            r = n ? this.beforeSessionKeyAtPoint(e.currentTarget, e.clientY, n) : null;
          if (!x(e.dataTransfer) || !n || !this.projectAcceptsSession(t.id, r)) {
            (this.sessionDropTarget === t.id && this.clearSessionDropTarget(),
              e.dataTransfer && (e.dataTransfer.dropEffect = `none`));
            return;
          }
          (e.preventDefault(),
            e.dataTransfer && (e.dataTransfer.dropEffect = `move`),
            this.activateProjectTarget(t.id, r));
        }
        handleProjectDragLeave(e, t) {
          let n = e.currentTarget;
          (e.relatedTarget instanceof Node && n.contains(e.relatedTarget)) ||
            (this.sessionDropTarget === t && this.clearSessionDropTarget());
        }
        handleProjectDrop(e, t) {
          let n = S(e.dataTransfer) ?? this.draggingSessionKey,
            r = n ? this.host.getSessions().find((e) => e.key === n) : void 0,
            i = this.sessionDropBeforeKey;
          !r ||
            !this.projectAcceptsSession(t.id, i) ||
            (e.preventDefault(),
            e.stopPropagation(),
            this.finishSessionDrag(),
            this.host.moveToProject(r, t.id, i));
        }
        handleRecentDragOver(e) {
          if (!x(e.dataTransfer) || !this.recentAcceptsSession()) {
            (this.sessionDropTarget === `recent` && this.clearSessionDropTarget(),
              e.dataTransfer && (e.dataTransfer.dropEffect = `none`));
            return;
          }
          (e.preventDefault(),
            e.dataTransfer && (e.dataTransfer.dropEffect = `move`),
            this.setSessionDropTarget(
              I,
              this.predictedRecentBeforeSessionKey(this.draggingSessionKey),
            ));
        }
        handleRecentDragLeave(e) {
          let t = e.currentTarget;
          (e.relatedTarget instanceof Node && t.contains(e.relatedTarget)) ||
            (this.sessionDropTarget === `recent` && this.clearSessionDropTarget());
        }
        handleRecentDrop(e) {
          let t = S(e.dataTransfer) ?? this.draggingSessionKey,
            n = t ? this.host.getSessions().find((e) => e.key === t) : void 0;
          !n ||
            this.projectIdForSession(n.key) === null ||
            (e.preventDefault(),
            e.stopPropagation(),
            this.finishSessionDrag(),
            this.host.moveToProject(n, null));
        }
        recentDropActive() {
          return this.sessionDropTarget === I;
        }
        dropMarkerBefore(e, t) {
          return this.sessionDropTarget === e && this.sessionDropBeforeKey === t;
        }
        dropMarkerAtEnd(e) {
          return this.sessionDropTarget === e && this.sessionDropBeforeKey === null;
        }
        createSessionDragPreview(e, t) {
          let n = document.createElement(`div`);
          ((n.className = `eu-session-drag-preview`),
            n.setAttribute(`aria-hidden`, `true`),
            (n.style.width = `${Math.min(Math.max(t.getBoundingClientRect().width, 190), 320)}px`));
          let r = document.createElement(`span`);
          r.className = `eu-session-drag-preview__icon`;
          let i = document.createElement(`span`);
          return (
            (i.className = `eu-session-drag-preview__label`),
            (i.textContent = F(e)),
            n.append(r, i),
            document.body.append(n),
            n
          );
        }
        activatePointerDrag(e, t) {
          if (Math.hypot(e.clientX - t.startX, e.clientY - t.startY) < 6) return !1;
          let n = this.host.getSessions().find((e) => e.key === t.sessionKey),
            r = this.host.element.querySelector(
              `.eu-session-row[data-session-key="${CSS.escape(t.sessionKey)}"] .eu-session-row__open`,
            );
          return !n || !r
            ? (this.clearPointerSessionDrag(), !1)
            : ((t.active = !0),
              this.setDraggingSessionKey(t.sessionKey),
              this.host.closeMenu(),
              document.body.classList.add(`eu-session-drag-active`),
              (this.pointerDragPreview = this.createSessionDragPreview(n, r)),
              this.pointerDragPreview.classList.add(`eu-session-drag-preview--pointer`),
              !0);
        }
        activateProjectTarget(e, t) {
          if ((this.setSessionDropTarget(e, t), !this.host.getCollapsedProjects().has(e))) {
            this.clearPendingProjectExpansion();
            return;
          }
          if (this.pendingProjectExpansion?.projectId === e) return;
          this.clearPendingProjectExpansion();
          let n = globalThis.setTimeout(() => {
            if (((this.pendingProjectExpansion = void 0), this.sessionDropTarget !== e)) return;
            let t = new Set(this.host.getCollapsedProjects());
            (t.delete(e), this.host.setCollapsedProjects(t));
          }, L);
          this.pendingProjectExpansion = { projectId: e, timeoutId: n };
        }
        projectAcceptsSession(e, t) {
          let n = this.draggingSessionKey;
          return !!(
            n &&
            !this.host.getShowArchived() &&
            !this.host.getBusyKey() &&
            this.placementChangesOrder(n, e, t)
          );
        }
        recentAcceptsSession() {
          let e = this.draggingSessionKey;
          return !!(
            e &&
            !this.host.getShowArchived() &&
            !this.host.getBusyKey() &&
            this.projectIdForSession(e) !== null
          );
        }
        beforeSessionKeyAtPoint(e, t, n) {
          let r = Array.from(e.querySelectorAll(`.eu-session-row`)).filter(
            (e) => e.dataset.sessionKey !== n,
          );
          for (let e of r) {
            let n = e.getBoundingClientRect();
            if (t < n.top + n.height / 2) return e.dataset.sessionKey ?? null;
          }
          return null;
        }
        placementChangesOrder(e, t, n) {
          let r = this.host.getProjects().find((e) => e.id === t);
          if (!r) return !1;
          let i = r.sessionKeys.filter((t) => t !== e),
            a = n === null ? i.length : i.indexOf(n);
          if (a < 0) return !1;
          let o = [...i];
          return (
            o.splice(a, 0, e),
            o.length !== r.sessionKeys.length || o.some((e, t) => e !== r.sessionKeys[t])
          );
        }
        predictedRecentBeforeSessionKey(e) {
          if (!e) return null;
          let t = new Set(this.host.getProjects().flatMap((e) => e.sessionKeys));
          t.delete(e);
          let n = this.host
              .getSessions()
              .filter((e) => e.archived === !0 || e.pinned !== !0)
              .filter((e) => !t.has(e.key)),
            r = n.findIndex((t) => t.key === e);
          return r >= 0 ? (n[r + 1]?.key ?? null) : null;
        }
        projectIdForSession(e) {
          return this.host.getProjects().find((t) => t.sessionKeys.includes(e))?.id ?? null;
        }
        setDraggingSessionKey(e) {
          this.draggingSessionKey !== e &&
            ((this.draggingSessionKey = e), this.host.requestUpdate());
        }
        setSessionDropTarget(e, t) {
          (this.sessionDropTarget !== e || this.sessionDropBeforeKey !== t) &&
            (this.pendingProjectExpansion?.projectId !== e && this.clearPendingProjectExpansion(),
            (this.sessionDropTarget = e),
            (this.sessionDropBeforeKey = t),
            this.host.requestUpdate());
        }
        clearSessionDropTarget() {
          this.sessionDropTarget !== null &&
            (this.clearPendingProjectExpansion(),
            (this.sessionDropTarget = null),
            (this.sessionDropBeforeKey = null),
            this.host.requestUpdate());
        }
        clearPendingProjectExpansion() {
          this.pendingProjectExpansion &&=
            (globalThis.clearTimeout(this.pendingProjectExpansion.timeoutId), void 0);
        }
        clearPointerSessionDrag() {
          ((this.pointerDrag = void 0),
            this.pointerDragPreview?.remove(),
            (this.pointerDragPreview = void 0));
        }
      }));
  }))();
}
function B() {
  return p`<div
    class="eu-session-drop-indicator"
    role="status"
    aria-label=${y(`conversationDragHint`)}
  ></div>`;
}
function De(e, t, n, r) {
  return p`<div class="eu-session-section__rows">
    ${t.map((t) => p`${n.dropMarkerBefore(e, t.key) ? B() : f}${r(t)}`)}
    ${n.dropMarkerAtEnd(e) ? B() : f}
  </div>`;
}
function V() {
  return (V = e(() => {
    (m(), b());
  }))();
}
function Oe(e, t) {
  let n = new Map(e.map((e) => [e.key, e])),
    r = new Set(t.flatMap((e) => e.sessionKeys)),
    i = e.filter((e) => e.pinned === !0 && e.archived !== !0),
    a = new Set(i.map((e) => e.key));
  return {
    pinned: i,
    projects: t.map((e) => ({
      project: e,
      sessions: e.sessionKeys
        .map((e) => n.get(e))
        .filter((e) => !!e)
        .filter((e) => !a.has(e.key)),
    })),
    recent: e.filter((e) => !a.has(e.key) && !r.has(e.key)),
  };
}
var H, U;
function W() {
  return (W = e(() => {
    (m(),
      h(),
      Se(),
      u(),
      Ce(),
      le(),
      b(),
      ue(),
      r(),
      A(),
      _e(),
      O(),
      z(),
      V(),
      (H = 5),
      (U = class extends i {
        constructor(...e) {
          (super(...e),
            (this.sessions = []),
            (this.projects = []),
            (this.loading = !0),
            (this.showArchived = !1),
            (this.projectsExpanded = !0),
            (this.recentExpanded = !0),
            (this.openMenu = ``),
            (this.collapsedProjects = new Set()),
            (this.visibleSessionCounts = {}),
            (this.busyKey = ``),
            (this.error = ``),
            (this.loadGeneration = 0),
            (this.dragController = new R({
              element: this,
              getSessions: () => this.sessions,
              getProjects: () => this.projects,
              getBusyKey: () => this.busyKey,
              getShowArchived: () => this.showArchived,
              getCollapsedProjects: () => this.collapsedProjects,
              setCollapsedProjects: (e) => {
                this.collapsedProjects = e;
              },
              closeMenu: () => {
                this.openMenu = ``;
              },
              moveToProject: (e, t, n) => this.moveToProject(e, t, n),
              requestUpdate: () => this.requestUpdate(),
            })),
            (this.handleOutsidePointerDown = (e) => {
              this.openMenu &&
                (e
                  .composedPath()
                  .some(
                    (e) =>
                      e instanceof HTMLElement &&
                      (e.classList.contains(`eu-session-actions`) ||
                        e.classList.contains(`eu-session-actions__trigger`)),
                  ) ||
                  (this.openMenu = ``));
            }),
            (this.handleGlobalKeydown = (e) => {
              e.key === `Escape` && this.openMenu && (this.openMenu = ``);
            }));
        }
        connectedCallback() {
          (super.connectedCallback(),
            globalThis.addEventListener(`pointerdown`, this.handleOutsidePointerDown),
            globalThis.addEventListener(`keydown`, this.handleGlobalKeydown),
            this.dragController.connect(),
            (this.unsubscribeAgentCatalog = D.subscribe(() => this.requestUpdate())),
            D.load());
        }
        disconnectedCallback() {
          (globalThis.removeEventListener(`pointerdown`, this.handleOutsidePointerDown),
            globalThis.removeEventListener(`keydown`, this.handleGlobalKeydown),
            this.dragController.disconnect(),
            this.unsubscribeAgentCatalog?.(),
            (this.unsubscribeAgentCatalog = void 0),
            this.unsubscribeSessions?.(),
            (this.unsubscribeSessions = void 0),
            (this.subscribedSessions = void 0),
            (this.loadGeneration += 1),
            super.disconnectedCallback());
        }
        updated(e) {
          e.has(`context`) && e.size > 0 && this.load();
        }
        async load() {
          let e = this.context;
          if (!e) return;
          let t = ++this.loadGeneration;
          ((this.loading = this.sessions.length === 0 && this.projects.length === 0),
            (this.error = ``));
          let n = this.sessionListScope();
          this.subscribeSessionList(e, n);
          try {
            let [, r] = await Promise.all([e.sessions.refreshList({ ...n, force: !0 }), ge()]);
            if (t !== this.loadGeneration) return;
            this.projects = r;
          } catch (e) {
            t === this.loadGeneration &&
              (this.error = e instanceof Error ? e.message : y(`conversationLoadFailed`));
          } finally {
            t === this.loadGeneration && (this.loading = !1);
          }
        }
        sessionListScope() {
          return {
            limit: 100,
            includeGlobal: !0,
            includeUnknown: !1,
            includeDerivedTitles: !0,
            includeLastMessage: !1,
            archivedFilter: this.showArchived ? `archived` : `active`,
          };
        }
        subscribeSessionList(e, t) {
          if (
            this.subscribedSessions === e.sessions &&
            this.subscribedArchived === this.showArchived
          )
            return;
          (this.unsubscribeSessions?.(),
            (this.subscribedSessions = e.sessions),
            (this.subscribedArchived = this.showArchived));
          let n = this.showArchived,
            r = (t) => {
              e === this.context &&
                n === this.showArchived &&
                ((this.sessions = t.result?.sessions ?? []), t.error && (this.error = t.error));
            };
          ((this.unsubscribeSessions = e.sessions.subscribeList(t, r)),
            r(e.sessions.listSnapshot(t)));
        }
        openConversation(e) {
          this.dragController.consumeSuppressedConversationOpen() ||
            (this.context && ((this.openMenu = ``), Te(this.context, e.key), this.onNavigate?.()));
        }
        toggleMenu(e, t) {
          (t.preventDefault(), t.stopPropagation(), (this.openMenu = this.openMenu === e ? `` : e));
        }
        async runMutation(e, t) {
          ((this.openMenu = ``), (this.busyKey = e), (this.error = ``));
          try {
            (await t(), await this.load());
          } catch (e) {
            this.error = e instanceof Error ? e.message : y(`conversationUpdateFailed`);
          } finally {
            this.busyKey = ``;
          }
        }
        async createProject() {
          await T({
            title: y(`projectCreate`),
            label: y(`projectName`),
            requireValue: !0,
            submit: async (e) => {
              try {
                return (await he(e), await this.load(), null);
              } catch (e) {
                return e instanceof Error ? e.message : y(`projectSaveFailed`);
              }
            },
          });
        }
        async renameProject(e) {
          ((this.openMenu = ``),
            await T({
              title: y(`projectRename`),
              label: y(`projectName`),
              defaultValue: e.name,
              requireValue: !0,
              requireChange: !0,
              submit: async (t) => {
                try {
                  return (await ve(e.id, t), await this.load(), null);
                } catch (e) {
                  return e instanceof Error ? e.message : y(`projectSaveFailed`);
                }
              },
            }));
        }
        async removeProject(e) {
          ((this.openMenu = ``),
            (await w({
              title: y(`deleteNamed`, { name: e.name }),
              message: y(`projectDeleteConfirm`),
              confirmLabel: y(`delete`),
              danger: !0,
            })) &&
              (await this.runMutation(`project:${e.id}`, async () => {
                await ye(e.id);
              })));
        }
        async createProjectConversation(e) {
          let t = this.context,
            n = D.activeKey;
          if (!t || !n || this.busyKey) return;
          let r = `project-create:${e.id}`;
          ((this.busyKey = r), (this.openMenu = ``), (this.error = ``));
          try {
            (await k(t, n, `new`, { projectId: e.id }), await this.load(), this.onNavigate?.());
          } catch (e) {
            this.error = e instanceof Error ? e.message : y(`conversationCreateFailed`);
          } finally {
            this.busyKey = ``;
          }
        }
        async renameConversation(e) {
          ((this.openMenu = ``),
            await T({
              title: y(`conversationRename`),
              label: y(`conversationName`),
              defaultValue: e.displayName ?? e.label ?? ``,
              requireValue: !0,
              requireChange: !0,
              submit: async (t) =>
                (await this.context?.sessions.patch(e.key, { label: t }))
                  ? (await this.load(), null)
                  : (this.context?.sessions.state.error ?? y(`conversationRenameFailed`)),
            }));
        }
        togglePin(e) {
          return this.runMutation(`session:${e.key}`, async () => {
            if (!(await this.context?.sessions.patch(e.key, { pinned: e.pinned !== !0 })))
              throw Error(this.context?.sessions.state.error ?? y(`conversationUpdateFailed`));
          });
        }
        toggleArchive(e) {
          return this.runMutation(`session:${e.key}`, async () => {
            if (!e.sessionId) throw Error(y(`conversationUpdateFailed`));
            if (
              !(await this.context?.sessions.patch(
                e.key,
                { archived: e.archived !== !0 },
                { expectedSessionId: e.sessionId },
              ))
            )
              throw Error(this.context?.sessions.state.error ?? y(`conversationUpdateFailed`));
          });
        }
        async moveToProject(e, t, n) {
          let r = this.projects;
          ((this.openMenu = ``),
            (this.busyKey = `session:${e.key}`),
            (this.error = ``),
            (this.projects = this.projects.map((r) => {
              let i = r.sessionKeys.filter((t) => t !== e.key);
              if (r.id !== t) return { ...r, sessionKeys: i };
              let a = n === void 0 ? 0 : n === null ? i.length : i.indexOf(n),
                o = [...i];
              return (o.splice(Math.max(0, a), 0, e.key), { ...r, sessionKeys: o });
            })));
          try {
            (await C(e.key, t, n), await this.load());
          } catch (e) {
            ((this.projects = r),
              (this.error = e instanceof Error ? e.message : y(`conversationUpdateFailed`)));
          } finally {
            this.busyKey = ``;
          }
        }
        async removeConversation(e) {
          ((this.openMenu = ``),
            (await w({
              title: y(`conversationDelete`),
              message: y(`conversationDeleteConfirm`),
              confirmLabel: y(`delete`),
              danger: !0,
            })) &&
              (await this.runMutation(`session:${e.key}`, async () => {
                if (!e.sessionId) throw Error(y(`conversationUpdateFailed`));
                if (
                  !(
                    await this.context?.sessions.delete(e.key, {
                      expectedSessionId: e.sessionId,
                      deleteTranscript: !0,
                    })
                  )?.deleted
                )
                  throw Error(this.context?.sessions.state.error ?? y(`conversationUpdateFailed`));
                await C(e.key, null);
              })));
        }
        renderSessionActions(e, t) {
          let n = `session:${e.key}`,
            r = e.archived === !0;
          return p`
      <div class="eu-session-actions">
        <button
          type="button"
          class="eu-session-actions__trigger"
          title=${y(`conversationActions`)}
          aria-label=${y(`conversationActions`)}
          aria-expanded=${String(this.openMenu === n)}
          ?disabled=${this.busyKey === n}
          @click=${(e) => this.toggleMenu(n, e)}
        >
          ${l.moreHorizontal}
        </button>
        ${t ? ce(!1) : f}
        ${
          this.openMenu === n
            ? p`<div class="eu-session-actions__menu" role="menu">
              ${r ? f : this.actionButton(e.pinned === !0 ? l.pinOff : l.pin, e.pinned === !0 ? y(`unpin`) : y(`pin`), () => void this.togglePin(e))}
              ${this.actionButton(l.pencil, y(`conversationRename`), () => void this.renameConversation(e))}
              <div class="eu-session-actions__label">${y(`moveToProject`)}</div>
              ${this.actionButton(l.messageSquare, y(`noProject`), () => void this.moveToProject(e, null))}
              ${this.projects.map((t) => this.actionButton(l.folder, t.name, () => void this.moveToProject(e, t.id)))}
              <div class="eu-session-actions__separator" role="separator"></div>
              ${this.actionButton(r ? l.archiveRestore : l.archive, y(r ? `restore` : `archive`), () => void this.toggleArchive(e))}
              ${this.actionButton(l.trash, y(`delete`), () => void this.removeConversation(e), !0)}
            </div>`
            : f
        }
      </div>
    `;
        }
        actionButton(e, t, n, r = !1) {
          return p`<button
      type="button"
      role="menuitem"
      class="eu-session-actions__item ${r ? `eu-session-actions__item--danger` : ``}"
      @click=${n}
    >
      <span aria-hidden="true">${e}</span><span>${t}</span>
    </button>`;
        }
        renderSession(e) {
          let t = F(e),
            n = this.context?.gateway.snapshot.sessionKey === e.key,
            r = e.archived !== !0 && o(e),
            i = this.openMenu === `session:${e.key}`,
            a = e.archived !== !0 && e.pinned !== !0 && this.projects.length > 0 && !this.busyKey;
          return p`<div
      class="eu-session-row ${n ? `eu-session-row--active` : ``} ${e.archived ? `eu-session-row--archived` : ``} ${r ? `eu-session-row--running` : ``} ${i ? `eu-session-row--menu-open` : ``} ${a ? `eu-session-row--draggable` : ``} ${this.dragController.draggingSessionKey === e.key ? `eu-session-row--dragging` : ``}"
      data-session-key=${e.key}
      @mouseenter=${me}
      @mouseleave=${fe}
    >
      <button
        type="button"
        class="eu-session-row__open"
        title=${t}
        draggable=${a ? `true` : `false`}
        @pointerdown=${a ? (t) => this.dragController.startPointerSessionDrag(t, e) : f}
        @dragstart=${a ? (t) => this.dragController.startSessionDrag(t, e) : f}
        @dragend=${a ? () => this.dragController.finishSessionDrag() : f}
        @click=${() => this.openConversation(e)}
      >
        <span class="eu-session-title-marquee hover-marquee" data-hover-marquee-mode="codex">
          <span class="eu-session-title-marquee__clip">
            <span class="eu-session-title-marquee__track">
              <span class="eu-session-title-marquee__content" data-hover-marquee-content dir="auto"
                >${t}</span
              >
            </span>
          </span>
        </span>
      </button>
      ${this.renderSessionActions(e, r)}
    </div>`;
        }
        renderSessionRows(e, t) {
          let n = `${this.showArchived ? `archived` : `active`}:${e}`,
            r = this.visibleSessionCounts[n] ?? H;
          return p`
      ${De(e, t.slice(0, r), this.dragController, (e) => this.renderSession(e))}
      ${
        t.length > r
          ? p`<button
            type="button"
            class="eu-session-show-more"
            @click=${() => {
              this.visibleSessionCounts = { ...this.visibleSessionCounts, [n]: r + H };
            }}
          >
            ${y(`conversationShowMore`)}
          </button>`
          : f
      }
    `;
        }
        toggleProject(e) {
          let t = new Set(this.collapsedProjects);
          (t.has(e) ? t.delete(e) : t.add(e), (this.collapsedProjects = t));
        }
        renderProjectSection(e, t) {
          let n = `project:${e.id}`,
            r = this.collapsedProjects.has(e.id),
            i = this.dragController.sessionDropTarget === e.id;
          return p`<section
      class="eu-session-section eu-session-project ${i ? `eu-session-project--session-drop` : ``}"
      data-project-id=${e.id}
      @dragover=${(t) => this.dragController.handleProjectDragOver(t, e)}
      @dragleave=${(t) => this.dragController.handleProjectDragLeave(t, e.id)}
      @drop=${(t) => this.dragController.handleProjectDrop(t, e)}
    >
      <div
        class="eu-session-section__header ${this.openMenu === n ? `eu-session-section__header--menu-open` : ``}"
      >
        <button
          type="button"
          class="eu-session-section__toggle"
          aria-expanded=${String(!r)}
          @click=${() => this.toggleProject(e.id)}
        >
          <span class="eu-session-section__folder-icon" aria-hidden="true"
            >${r && !i ? l.folder : l.folderOpen}</span
          >
          <span class="eu-session-section__name">${e.name}</span>
        </button>
        <button
          type="button"
          class="eu-session-actions__trigger"
          title=${y(`projectConversationCreate`, { name: e.name })}
          aria-label=${y(`projectConversationCreate`, { name: e.name })}
          ?disabled=${!!this.busyKey || !D.activeKey}
          @click=${(t) => {
            (t.preventDefault(), t.stopPropagation(), this.createProjectConversation(e));
          }}
        >
          ${l.plus}
        </button>
        <div class="eu-session-actions">
          <button
            type="button"
            class="eu-session-actions__trigger"
            title=${y(`projectActions`)}
            aria-label=${y(`projectActions`)}
            aria-expanded=${String(this.openMenu === n)}
            @click=${(e) => this.toggleMenu(n, e)}
          >
            ${l.moreHorizontal}
          </button>
          ${
            this.openMenu === n
              ? p`<div class="eu-session-actions__menu" role="menu">
                ${this.actionButton(l.pencil, y(`projectRename`), () => void this.renameProject(e))}
                ${this.actionButton(l.trash, y(`projectDelete`), () => void this.removeProject(e), !0)}
              </div>`
              : f
          }
        </div>
      </div>
      ${r && !i ? f : this.renderSessionRows(e.id, t)}
    </section>`;
        }
        renderNamedSection(e, t) {
          return t.length
            ? p`<section class="eu-session-section">
      <div class="eu-session-section__label">
        <span>${e}</span><span class="eu-session-section__count">${t.length}</span>
      </div>
      ${this.renderSessionRows(`pinned`, t)}
    </section>`
            : f;
        }
        renderRecentSection(e) {
          if (!e.length && !this.projects.length) return f;
          let t = this.dragController.recentDropActive();
          return p`<section
      class="eu-session-section eu-session-recent ${t ? `eu-session-recent--session-drop` : ``}"
      @dragover=${(e) => this.dragController.handleRecentDragOver(e)}
      @dragleave=${(e) => this.dragController.handleRecentDragLeave(e)}
      @drop=${(e) => this.dragController.handleRecentDrop(e)}
    >
      <button
        type="button"
        class="eu-session-section__label eu-session-heading-toggle"
        aria-expanded=${String(this.recentExpanded)}
        @click=${() => {
          this.recentExpanded = !this.recentExpanded;
        }}
      >
        <span class="eu-session-heading-toggle__label">
          ${this.showArchived ? y(`archived`) : y(`recent`)}
          ${this.recentExpanded ? f : p`<span aria-hidden="true">${l.chevronRight}</span>`}
        </span>
        <span class="eu-session-section__count">${e.length}</span>
      </button>
      ${this.recentExpanded ? this.renderSessionRows(I, e) : f}
    </section>`;
        }
        render() {
          let e = Oe(this.sessions, this.projects);
          return p`<div class="eu-session-organizer" aria-label=${y(`conversationOrganizer`)}>
      <div class="eu-session-organizer__toolbar">
        <button
          type="button"
          class="eu-session-heading-toggle"
          aria-expanded=${String(this.projectsExpanded)}
          @click=${() => {
            this.projectsExpanded = !this.projectsExpanded;
          }}
        >
          <span class="eu-session-heading-toggle__label">
            ${y(`projects`)}
            ${this.projectsExpanded ? f : p`<span aria-hidden="true">${l.chevronRight}</span>`}
          </span>
        </button>
        <div>
          <button
            type="button"
            title=${y(`projectCreate`)}
            aria-label=${y(`projectCreate`)}
            @click=${() => void this.createProject()}
          >
            ${l.plus}
          </button>
        </div>
      </div>
      ${this.error ? p`<div class="eu-session-organizer__error" role="alert">${this.error}</div>` : f}
      ${
        this.loading
          ? p`<div class="eu-session-organizer__loading" role="status">${y(`loading`)}</div>`
          : p`
            ${this.renderNamedSection(y(`pinned`), e.pinned)}
            ${this.projectsExpanded ? e.projects.map(({ project: e, sessions: t }) => this.renderProjectSection(e, t)) : f}
            ${this.renderRecentSection(e.recent)}
            ${!e.pinned.length && !e.projects.length && !e.recent.length ? p`<div class="eu-session-section__empty">${y(`conversationEmpty`)}</div>` : f}
          `
      }
    </div>`;
        }
      }),
      t([g({ attribute: !1 })], U.prototype, `context`, void 0),
      t([g({ attribute: !1 })], U.prototype, `onNavigate`, void 0),
      t([_()], U.prototype, `sessions`, void 0),
      t([_()], U.prototype, `projects`, void 0),
      t([_()], U.prototype, `loading`, void 0),
      t([_()], U.prototype, `showArchived`, void 0),
      t([_()], U.prototype, `projectsExpanded`, void 0),
      t([_()], U.prototype, `recentExpanded`, void 0),
      t([_()], U.prototype, `openMenu`, void 0),
      t([_()], U.prototype, `collapsedProjects`, void 0),
      t([_()], U.prototype, `visibleSessionCounts`, void 0),
      t([_()], U.prototype, `busyKey`, void 0),
      t([_()], U.prototype, `error`, void 0),
      customElements.get(`openclaw-enterprise-user-conversation-organizer`) ||
        customElements.define(`openclaw-enterprise-user-conversation-organizer`, U));
  }))();
}
var G;
function K() {
  return (K = e(() => {
    (m(),
      h(),
      u(),
      b(),
      r(),
      be(),
      A(),
      O(),
      we(),
      P(),
      W(),
      (G = class extends i {
        constructor(...e) {
          (super(...e),
            (this.activeRoute = `enterprise`),
            (this.creatingConversation = !1),
            (this.switchingAgent = !1),
            (this.conversationError = ``),
            (this.unsubscribers = []));
        }
        connectedCallback() {
          (super.connectedCallback(),
            (this.unsubscribers = [E.subscribe(() => this.requestUpdate())]),
            E.load());
        }
        disconnectedCallback() {
          for (let e of this.unsubscribers) e();
          ((this.unsubscribers = []), super.disconnectedCallback());
        }
        navigate(e) {
          (this.context?.navigate(e), this.onNavigate?.());
        }
        async createConversation() {
          let e = this.context,
            t = D.activeAgent;
          if (!(!e || this.creatingConversation || this.switchingAgent)) {
            if (!t?.actions.canChat) {
              this.navigate(`new-session`);
              return;
            }
            ((this.creatingConversation = !0), (this.conversationError = ``));
            try {
              (await k(e, t.key, `new`), this.onNavigate?.());
            } catch (e) {
              this.conversationError =
                e instanceof Error ? e.message : y(`conversationCreateFailed`);
            } finally {
              this.creatingConversation = !1;
            }
          }
        }
        navItem(e, t, n) {
          let r = this.activeRoute === e;
          return p`<button
      type="button"
      class="nav-item ${r ? `active` : ``}"
      aria-current=${r ? `page` : f}
      @click=${() => this.navigate(e)}
    >
      ${n === void 0 ? f : p`<span class="nav-item__icon" aria-hidden="true">${n}</span>`}
      <span>${t}</span>
    </button>`;
        }
        render() {
          let e = E.state,
            t = e.phase === `ready` ? e.data.user : null,
            n = e.phase === `ready` && e.data.agents.some((e) => e.actions.canChat);
          return p`
      <aside class="sidebar" aria-label=${y(`enterpriseUserNavigation`)}>
        <div class="sidebar-shell">
          <div class="sidebar-shell__content">
            <div class="sidebar-shell__body">
              <openclaw-enterprise-user-agent-switcher
                .context=${this.context}
                .onNavigate=${this.onNavigate}
                .operationBusy=${this.creatingConversation}
                .onSwitchingChange=${(e) => {
                  this.switchingAgent = e;
                }}
              ></openclaw-enterprise-user-agent-switcher>
              <button
                type="button"
                class="btn primary eu-new-chat"
                ?disabled=${this.creatingConversation || this.switchingAgent || !n}
                @click=${() => void this.createConversation()}
              >
                ${l.plus}
                <span
                  >${this.creatingConversation ? y(`conversationCreateBusy`) : y(`newConversation`)}</span
                >
              </button>
              ${this.conversationError ? p`<div class="callout danger" role="alert">${this.conversationError}</div>` : f}
              <nav class="sidebar-nav" aria-label=${y(`userPages`)}>
                ${this.navItem(`enterprise`, y(`agents`), l.bot)}
                ${e.phase === `ready` && e.data.features.automations ? this.navItem(`cron`, y(`automations`), l.clock) : f}
                ${e.phase === `ready` && e.data.features.plugins.enabled ? this.navItem(`plugins`, y(`plugins`), l.box) : f}
                ${e.phase === `ready` && e.data.features.knowledge.enabled ? this.navItem(`knowledge`, y(`knowledgeEnterprise`), l.book) : f}
                <openclaw-enterprise-user-conversation-organizer
                  .context=${this.context}
                  .onNavigate=${this.onNavigate}
                ></openclaw-enterprise-user-conversation-organizer>
              </nav>
            </div>
          </div>
          <div class="sidebar-shell__footer">
            <details class="eu-account-menu">
              <summary class="nav-item">
                <span class="eu-account-avatar" aria-hidden="true"
                  >${t?.displayName.charAt(0).toUpperCase() ?? `U`}</span
                >
                <span>${t?.displayName ?? y(`account`)}</span>
              </summary>
              <div class="eu-account-menu__items">
                ${this.navItem(`profile`, y(`accountSecurity`), l.users)}
                ${this.navItem(`appearance`, y(`appearance`), l.sun)}
                ${e.phase === `ready` && e.data.features.notifications ? this.navItem(`notifications`, y(`notifications`), l.radio) : f}
                ${this.navItem(`about`, y(`helpAbout`), l.shieldQuestion)}
                <button
                  type="button"
                  class="nav-item"
                  @click=${async () => {
                    (await xe(`user`), globalThis.location.reload());
                  }}
                >
                  <span class="nav-item__icon" aria-hidden="true">${l.x}</span>
                  <span>${y(`logout`)}</span>
                </button>
              </div>
            </details>
          </div>
        </div>
      </aside>
    `;
        }
      }),
      t([g({ attribute: !1 })], G.prototype, `context`, void 0),
      t([g({ attribute: !1 })], G.prototype, `activeRoute`, void 0),
      t([g({ attribute: !1 })], G.prototype, `onNavigate`, void 0),
      t([_()], G.prototype, `creatingConversation`, void 0),
      t([_()], G.prototype, `switchingAgent`, void 0),
      t([_()], G.prototype, `conversationError`, void 0),
      customElements.get(`openclaw-enterprise-user-sidebar`) ||
        customElements.define(`openclaw-enterprise-user-sidebar`, G));
  }))();
}
var q;
function J() {
  return (J = e(() => {
    (m(),
      h(),
      u(),
      b(),
      r(),
      M(),
      O(),
      (q = class extends i {
        constructor(...e) {
          (super(...e), (this.drawerOpen = !1));
        }
        connectedCallback() {
          (super.connectedCallback(), (this.unsubscribe = D.subscribe(() => this.requestUpdate())));
        }
        disconnectedCallback() {
          (this.unsubscribe?.(), (this.unsubscribe = void 0), super.disconnectedCallback());
        }
        render() {
          let e = D.activeAgent;
          return p`<header class="topbar eu-topbar">
      <button
        type="button"
        class="topbar-icon-btn topbar-nav-toggle"
        aria-label=${y(`enterpriseNavigation`)}
        aria-expanded=${this.drawerOpen}
        @click=${(e) => this.onToggleDrawer?.(e.currentTarget)}
      >
        ${l.menu}
      </button>
      <button
        type="button"
        class="btn btn--ghost eu-topbar__agent"
        aria-label=${y(`changeActiveAgent`)}
        @click=${(e) => this.onToggleDrawer?.(e.currentTarget)}
      >
        <span aria-hidden="true">${e ? j(e) : `◌`}</span>
        <span class="eu-topbar__agent-label">
          <small>${y(`activeAgent`)}</small>
          <strong>${e?.name ?? `MAAP`}</strong>
        </span>
      </button>
    </header>`;
        }
      }),
      t([g({ attribute: !1 })], q.prototype, `drawerOpen`, void 0),
      t([g({ attribute: !1 })], q.prototype, `onToggleDrawer`, void 0),
      customElements.get(`openclaw-enterprise-user-topbar`) ||
        customElements.define(`openclaw-enterprise-user-topbar`, q));
  }))();
}
function ke(e) {
  let t = e.context,
    n = e.runtime;
  if (!t || !n || e.routeState.routeId === void 0)
    return p`<main class="connect-splash" role="status" aria-label=${v(`common.loading`)}>
      <openclaw-mascot mood="thinking" .size=${120}></openclaw-mascot>
    </main>`;
  let r = e.routeState.routeId,
    i = ee(r),
    a = re(),
    o = e.navDrawerOpen && a,
    s = p`<openclaw-enterprise-user-sidebar
    .context=${t}
    .activeRoute=${r}
    .onNavigate=${() => e.closeNavDrawer({ restoreFocus: !0 })}
  ></openclaw-enterprise-user-sidebar>`,
    c = t.gateway.snapshot.phase !== `connected` && r !== `chat` && r !== `appearance`;
  return p`
    <div
      class="shell eu-shell ${i ? `shell--chat` : ``} ${a ? `shell--mobile-nav` : ``} ${o ? `shell--nav-drawer-open` : ``}"
      @theme-change=${(t) => e.handleThemeChange(t)}
    >
      <a class="shell-skip-link" href="#enterprise-user-main"> ${v(`common.skipToMainContent`)} </a>
      <openclaw-enterprise-user-topbar
        .drawerOpen=${o}
        .onToggleDrawer=${(t) => e.toggleNavigationSurface(t)}
      ></openclaw-enterprise-user-topbar>
      <div class="shell-nav">
        ${
          a
            ? p`<openclaw-modal-dialog
              class="drawer nav-drawer"
              .open=${o}
              .label=${y(`enterpriseNavigation`)}
              @modal-cancel=${() => e.closeNavDrawer({ restoreFocus: !0 })}
            >
              <div class="shell-nav-modal__content" tabindex="-1" autofocus>${s}</div>
            </openclaw-modal-dialog>`
            : s
        }
      </div>
      <main
        id="enterprise-user-main"
        class="content ${i ? `content--chat` : ``}"
        .tabIndex=${-1}
      >
        ${
          c
            ? p`<div class="connection-action-block" role="status" aria-live="polite">
              ${v(`connection.actionsUnavailable`)}
            </div>`
            : f
        }
        <openclaw-router-outlet
          ?inert=${c}
          aria-disabled=${c ? `true` : f}
          .router=${n.router}
          .retryContext=${t}
        ></openclaw-router-outlet>
      </main>
      <openclaw-toast-host></openclaw-toast-host>
    </div>
  `;
}
function Y() {
  return (Y = e(() => {
    (m(), te(), ae(), b(), se(), ie(), oe(), c(), K(), J());
  }))();
}
var X;
function Z() {
  return (Z = e(() => {
    (h(),
      ne(),
      r(),
      (X = class extends a {
        constructor(...e) {
          (super(...e),
            (this.navDrawerOpen = !1),
            (this.routeState = {}),
            (this.drawerTrigger = null),
            (this.handleViewportChange = () => {
              this.requestUpdate();
            }),
            (this.handleThemeChange = (e) => {
              this.context?.theme.setMode(e.detail.mode, e.detail.element);
            }));
        }
        get context() {
          return this.runtime?.context;
        }
        willUpdate(e) {
          e.has(`runtime`) && this.bindRuntime();
        }
        connectedCallback() {
          (super.connectedCallback(),
            globalThis.addEventListener(`resize`, this.handleViewportChange),
            this.bindRuntime());
        }
        disconnectedCallback() {
          (globalThis.removeEventListener(`resize`, this.handleViewportChange),
            this.unbindRuntime(),
            super.disconnectedCallback());
        }
        bindRuntime() {
          this.unbindRuntime();
          let e = this.runtime;
          if (!e) {
            this.routeState = {};
            return;
          }
          ((this.routeState = d(e.router.getState())),
            (this.stopRouter = e.router.subscribeSelector(d, (e) => {
              this.routeState = e;
            })),
            (this.stopGateway = e.context.gateway.subscribe(() => this.requestUpdate())),
            (this.stopTheme = e.context.theme.subscribe(() => this.requestUpdate())));
        }
        unbindRuntime() {
          (this.stopRouter?.(),
            this.stopGateway?.(),
            this.stopTheme?.(),
            (this.stopRouter = void 0),
            (this.stopGateway = void 0),
            (this.stopTheme = void 0));
        }
        toggleNavigationSurface(e) {
          if (this.navDrawerOpen) {
            this.closeNavDrawer({ restoreFocus: !0 });
            return;
          }
          ((this.drawerTrigger = e ?? null), (this.navDrawerOpen = !0));
        }
        closeNavDrawer(e = {}) {
          if (!this.navDrawerOpen) return;
          this.navDrawerOpen = !1;
          let t = this.drawerTrigger;
          ((this.drawerTrigger = null),
            e.restoreFocus && t && globalThis.requestAnimationFrame(() => t.focus()));
        }
      }),
      t([g({ attribute: !1 })], X.prototype, `runtime`, void 0),
      t([_()], X.prototype, `navDrawerOpen`, void 0),
      t([_()], X.prototype, `routeState`, void 0));
  }))();
}
var Q;
function $() {
  return ($ = e(() => {
    (h(),
      Y(),
      Z(),
      (Q = class extends X {
        render() {
          return ke(this);
        }
      }),
      t([g({ attribute: !1 })], Q.prototype, `account`, void 0),
      customElements.get(`openclaw-enterprise-user-root`) ||
        customElements.define(`openclaw-enterprise-user-root`, Q));
  }))();
}
$();
export { Q as EnterpriseUserRoot };
//# sourceMappingURL=enterprise-user-root-CVdwWp6B.js.map
