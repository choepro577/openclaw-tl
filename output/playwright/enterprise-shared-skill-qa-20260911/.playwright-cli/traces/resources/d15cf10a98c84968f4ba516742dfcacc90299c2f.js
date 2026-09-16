import { t as at } from "./control-ui-boot-gfE6fZcA.js";
import {
  An as n,
  Ar as r,
  Bn as i,
  Cr as a,
  Dn as o,
  Dr as s,
  Dt as c,
  En as l,
  Er as u,
  Fn as d,
  Gn as f,
  H as p,
  Hn as m,
  In as h,
  Ln as ee,
  Nn as te,
  Oi as ne,
  On as re,
  Or as ie,
  Pn as ae,
  Rn as oe,
  Sr as se,
  Tr as ce,
  Un as le,
  V as ue,
  Vn as de,
  W as fe,
  Wn as pe,
  Xn as me,
  Zn as he,
  _r as ge,
  ar as _e,
  br as g,
  cr as ve,
  dr as ye,
  fn as be,
  fr as xe,
  gn as Se,
  gr as Ce,
  hr as we,
  ir as Te,
  jn as Ee,
  kn as De,
  kr as Oe,
  l as ke,
  lr as Ae,
  mr as je,
  nr as Me,
  or as Ne,
  pr as Pe,
  rr as Fe,
  tr as Ie,
  u as Le,
  ur as Re,
  vr as ze,
  wr as Be,
  xr as Ve,
  yr as He,
  zn as Ue,
} from "./control-ui-foundation-CUUNgsy7.js";
import {
  B as We,
  I as Ge,
  J as Ke,
  R as qe,
  W as Je,
  Z as Ye,
  at as _,
  c as Xe,
  et as Ze,
  ft as Qe,
  lt as $e,
  ot as et,
  rt as tt,
  st as nt,
  u as rt,
  z as it,
} from "./lit-runtime-BZcFnh9F.js";
import { n as e, r as t } from "./rolldown-runtime-DkW27tQK.js";
function ot(e) {
  return (typeof e == `string` && e.trim()) || null;
}
function st(e) {
  return typeof e == `number` && Number.isSafeInteger(e) && e > 0 ? e : null;
}
function ct(e, t) {
  return st(be(be(e)?.__openclaw)?.seq) ?? st(t?.messageSeq);
}
function lt(e) {
  let t = ot(e);
  return t?.endsWith(`:user`) ? t.slice(0, -5) || null : t;
}
function ut(e, t) {
  let n = be(e),
    r = ot(n?.role)?.toLowerCase();
  if (!n || !r) return null;
  let i = be(n.__openclaw),
    a = ot(i?.importedFrom),
    o = ot(i?.cliSessionId),
    s = ot(i?.externalId),
    c =
      ot(i?.idempotencyKey) ?? ot(n.idempotencyKey) ?? ot(t?.idempotencyKey) ?? ot(t?.clientRunId),
    l = lt(c),
    u = lt(t?.runId),
    d = lt(i?.runId),
    f = ot(i?.mirrorOrigin) !== null,
    p = r === `assistant` && ot(n.api)?.toLowerCase() === `cli`,
    m = p && l?.startsWith(`cli-assistant:`) ? ot(l.slice(14)) : l,
    h = i && Object.keys(i).every((e) => e === `idempotencyKey`) ? m : null;
  return {
    role: r,
    id: ot(i?.id) ?? ot(t?.messageId),
    sequence: ct(e, t),
    idempotencyKey: c,
    runId: r === `assistant` ? (d ?? u ?? (p || !f ? m : null) ?? h) : (d ?? m ?? u),
    isImported: !!(a || o || s),
    externalSource: a && o && s ? JSON.stringify([a, o, s]) : null,
  };
}
function dt() {
  return (dt = e(() => {}))();
}
function ft(e) {
  return (typeof e == `string` && e.trim()) || null;
}
function pt(e, t, n = {}) {
  let r = ft(t.runId);
  if (!r || typeof t.state != `string` || ![`delta`, `final`, `error`, `aborted`].includes(t.state))
    return null;
  let i = t.message,
    a = Se(i) ? ft(i.stopReason) : null,
    o = ft(t.stopReason) ?? a,
    s = ft(t.errorKind),
    c = { runId: r, ...(i === void 0 ? {} : { message: i }), scope: n },
    l = Mt(
      e,
      t.state === `delta`
        ? { type: `runDelta`, ...c }
        : {
            type: `runTerminal`,
            ...c,
            status:
              t.state === `aborted`
                ? `aborted`
                : t.state === `error`
                  ? s === `timeout`
                    ? `timeout`
                    : `error`
                  : t.yielded === !0 && o === `end_turn`
                    ? `yielded`
                    : o === `error`
                      ? `error`
                      : `completed`,
            ...(o === null ? {} : { stopReason: o }),
            ...(s === null ? {} : { errorKind: s }),
            ...(typeof t.errorMessage == `string` ? { errorMessage: t.errorMessage } : {}),
          },
    );
  return { projection: l, previousRun: e.runs[r], currentRun: l.runs[r] };
}
function mt() {
  return (mt = e(() => {
    Lt();
  }))();
}
function ht(e) {
  let t = ut(e);
  if (!t || (t.role !== `user` && t.role !== `assistant`)) return !1;
  let n = be(be(e)?.__openclaw);
  return !n || Object.keys(n).every((e) => e === `idempotencyKey`);
}
function gt(e, t) {
  let n = ut(e, t?.envelope),
    r = t?.live !== !0 && ht(e) ? n?.runId : null,
    i = lt(t?.pendingRunId ?? r);
  return { message: e, identity: n, live: t?.live === !0, pending: i !== null, pendingRunId: i };
}
function _t(e) {
  let t = null;
  return e.map((e) => {
    let n = gt(e);
    return n.identity?.role === `user`
      ? ((t = n.pending ? n.pendingRunId : null), n)
      : t && n.identity?.role === `assistant` && !n.pending && ht(e)
        ? gt(e, { pendingRunId: t })
        : (ht(e) || (t = null), n);
  });
}
function vt(e = {}, t = []) {
  let n = _t(t);
  return {
    scope: { ...e },
    entries: n,
    messages: n.map((e) => e.message),
    runs: {},
    hasTransportGap: !1,
  };
}
function yt(e, t) {
  return It.every((n) => e[n] === void 0 || t[n] === void 0 || e[n] === t[n]);
}
function bt(e) {
  let t = { ...e.scope };
  for (let n of It) e[n] !== void 0 && Object.assign(t, { [n]: e[n] });
  return t;
}
function xt(e, t) {
  return !e || !t || e.role !== t.role
    ? !1
    : e.isImported || t.isImported
      ? !e.isImported || !t.isImported
        ? !1
        : e.externalSource || t.externalSource
          ? !!(e.externalSource && e.externalSource === t.externalSource)
          : e.sequence !== null && t.sequence !== null && e.sequence === t.sequence
      : e.id || t.id
        ? !!(e.id && t.id && e.id === t.id)
        : e.sequence !== null && t.sequence !== null && e.sequence === t.sequence;
}
function St(e, t, n = !1) {
  if (xt(e.identity, t.identity)) return !0;
  let r = e.identity?.id ? e : t.identity?.id ? t : null,
    i = r === e ? t : r === t ? e : null,
    a = be(be(r?.message)?.__openclaw);
  if (
    r?.live &&
    i?.live &&
    r.identity?.role === `assistant` &&
    i.identity?.role === `assistant` &&
    !r.identity.isImported &&
    !i.identity.isImported &&
    !i.identity.id &&
    r.identity.runId &&
    r.identity.runId === i.identity.runId &&
    (ot(a?.mirrorOrigin) === null || a?.runTerminal === !0)
  )
    return !0;
  let o = e.identity,
    s = t.identity,
    c = be(be(e.message)?.__openclaw);
  if (
    n &&
    t.live &&
    o &&
    s &&
    o.role === s.role &&
    !o.isImported &&
    !s.isImported &&
    o.id &&
    !s.id &&
    ((o.sequence !== null && o.sequence === s.sequence) ||
      (o.role === `assistant` &&
        s.sequence === null &&
        o.runId !== null &&
        o.runId === s.runId &&
        (ot(c?.mirrorOrigin) === null || c?.runTerminal === !0)))
  )
    return !0;
  if (e.pending && t.pending)
    return !!(
      e.identity?.role === t.identity?.role &&
      e.pendingRunId &&
      e.pendingRunId === t.pendingRunId
    );
  let l = e.pending ? e : t.pending ? t : null,
    u = l === e ? t : l === t ? e : null;
  return !!(
    l &&
    u &&
    l.identity &&
    u.identity &&
    l.identity.role === u.identity.role &&
    !l.identity.isImported &&
    !u.identity.isImported &&
    l.pendingRunId &&
    l.pendingRunId === u.identity.runId &&
    (l.identity.sequence === null ||
      u.identity.sequence === null ||
      l.identity.sequence === u.identity.sequence)
  );
}
function Ct(e, t) {
  return { ...e, entries: t, messages: t.map((e) => e.message) };
}
function wt(e, t, n) {
  let r = t.identity?.sequence,
    i =
      r == null
        ? -1
        : e.findIndex((e) => {
            let t = e.identity?.sequence;
            return t != null && t > r;
          });
  if (i < 0 && t.identity?.role === `user` && t.identity.runId) {
    let r = t.identity.runId,
      a = n?.[r]?.message;
    i = e.findIndex(
      (e) => e.identity?.role === `assistant` && (e.identity.runId === r || e.message === a),
    );
  }
  return i < 0 ? [...e, t] : [...e.slice(0, i), t, ...e.slice(i)];
}
function Tt(e, t, n, r = {}) {
  if (!yt(e.scope, r)) return e;
  let i = gt(t, { envelope: n, live: !0 });
  if (!i.identity) return e;
  let a = e.entries.findIndex((e) => St(e, i));
  if (a < 0) return Ct(e, wt(e.entries, i, e.runs));
  let o = e.entries[a];
  if (
    (o && o.message === t && o.live && !o.pending) ||
    (o && !o.pending && o.identity?.id && !i.identity.id)
  )
    return e;
  if (o?.pending && i.identity.sequence !== null) {
    let t = i.identity.sequence;
    return Ct(
      e,
      e.entries.some(
        ({ identity: e }, n) => e?.sequence != null && (n < a ? e.sequence > t : e.sequence < t),
      )
        ? wt(
            e.entries.filter((e, t) => t !== a),
            i,
            e.runs,
          )
        : e.entries.toSpliced(a, 1, i),
    );
  }
  return Ct(e, [...e.entries.slice(0, a), i, ...e.entries.slice(a + 1)]);
}
function Et(e, t, n = {}, r = {}) {
  let i = r.shouldIncludeMessage ? t.filter(r.shouldIncludeMessage) : t;
  if (!yt(e.scope, n)) return vt(n, i);
  let a = _t(i);
  for (let t of e.entries)
    (!t.live && !t.pending) ||
      r.shouldIncludeMessage?.(t.message) === !1 ||
      a.filter((e) => St(e, t, !0)).length === 1 ||
      (a = wt(a, t, e.runs));
  return { ...Ct(e, a), scope: { ...e.scope, ...n }, hasTransportGap: !1 };
}
function Dt(e) {
  if (typeof e == `string`) return e.trim().length > 0;
  let t = be(e);
  if (!t) return !1;
  let n =
      Array.isArray(t.content) &&
      t.content.some((e) => {
        let t = be(e);
        return t
          ? t.type !== `text` || ot(t.text) !== null
          : typeof e == `string` && e.trim().length > 0;
      }),
    r = be(t.__openclaw)?.media;
  return !!(
    (typeof t.content == `string` && t.content.trim()) ||
    n ||
    (Array.isArray(r) && r.length > 0)
  );
}
function Ot(e) {
  if (!Dt(e)) return null;
  let t = ut(e);
  if (t?.externalSource) return `import:${t.role}:${t.externalSource}`;
  if (t?.id && !t.isImported) return `id:${t.role}:${t.id}`;
  if (t?.sequence !== null && t?.sequence !== void 0) return `seq:${t.role}:${t.sequence}`;
  let n = be(e),
    r = be(n?.__openclaw);
  try {
    return `content:${JSON.stringify([t?.role ?? `assistant`, typeof e == `string` ? e : (n?.content ?? null), r?.media ?? null, t?.isImported ? [r?.importedFrom ?? null, r?.cliSessionId ?? null, r?.externalId ?? null] : null])}`;
  } catch {
    return null;
  }
}
function kt(e, t) {
  let n = Ot(t);
  return !!(n && e && (e.acceptedFinalMessageIdentities?.includes(n) || Ot(e.message) === n));
}
function At(e) {
  let t = Object.entries(e);
  if (t.length <= Pt) return e;
  let n = t.filter(([, e]) => e.status === `streaming`),
    r = t.filter(([, e]) => e.status !== `streaming`),
    i = Math.max(0, Ft - n.length),
    a = i > 0 ? r.slice(-i) : [];
  return Object.fromEntries([...n, ...a]);
}
function jt(e, t) {
  let n = ot(t.errorMessage),
    r = { ...t };
  n ? (r.errorMessage = n) : delete r.errorMessage;
  let i = e.runs[t.runId];
  if (i && i.status !== `streaming`) {
    let r = Ot(t.message),
      a = t.status === `completed` || t.status === `yielded`,
      o = !Dt(i.message) || (i.acceptedFinalMessageIdentities?.length ?? 0) > 0,
      s = a && (i.status === t.status || o) && r !== null && !kt(i, t.message),
      c = s && !Dt(i.message),
      l = ot(i.errorMessage) === null && n !== null;
    if (!s && !l) return e;
    let u = Ot(i.message),
      d = i.acceptedFinalMessageIdentities ?? (u ? [u] : []);
    return {
      ...e,
      runs: {
        ...e.runs,
        [t.runId]: {
          ...i,
          ...(c ? { message: t.message } : {}),
          ...(s && r ? { acceptedFinalMessageIdentities: [...d, r].slice(-32) } : {}),
          ...(l && n
            ? { errorMessage: n, ...(t.errorKind ? { errorKind: t.errorKind } : {}) }
            : {}),
        },
      },
    };
  }
  let a =
      i && i.status === `streaming` && t.status !== `streaming`
        ? Object.fromEntries(Object.entries(e.runs).filter(([e]) => e !== t.runId))
        : e.runs,
    o = t.status === `completed` || t.status === `yielded` ? Ot(t.message) : null;
  return {
    ...e,
    runs: At({
      ...a,
      [t.runId]: {
        ...i,
        ...r,
        ...(o ? { acceptedFinalMessageIdentities: [o] } : {}),
        ...(t.message === void 0 && i?.message !== void 0 ? { message: i.message } : {}),
      },
    }),
  };
}
function Mt(e, t) {
  let n = bt(t);
  if (t.type === `snapshotLoaded`) return yt(e.scope, n) ? Et(e, t.messages, n, t.options) : e;
  if (t.type === `sessionReset`) {
    let { sessionKey: t, sessionId: r, agentId: i } = e.scope;
    return yt({ sessionKey: t, sessionId: r, agentId: i }, n) ? vt({ ...e.scope, ...n }) : e;
  }
  if (!yt(e.scope, n)) return e;
  switch (t.type) {
    case `messagePersisted`:
      return Tt(e, t.message, t.envelope ?? t, n);
    case `sendPending`: {
      let n = lt(t.idempotencyKey ?? t.runId),
        r = gt(t.message, { pendingRunId: n });
      if (!n || !r.identity) return e;
      let i = e.entries.find((e) => e.message === t.message);
      return i &&
        !i.pending &&
        r.identity.id === null &&
        !r.identity.isImported &&
        r.identity.runId === n
        ? Ct(
            e,
            e.entries.map((e) => (e === i ? { ...i, pending: !0, pendingRunId: n } : e)),
          )
        : i || e.entries.some((e) => St(e, r))
          ? e
          : Ct(e, wt(e.entries, r, e.runs));
    }
    case `sendAcknowledged`: {
      let n = lt(t.idempotencyKey ?? t.runId),
        r = lt(t.previousRunId);
      if (!n || !r || r === n) return e;
      let i = !1,
        a = e.entries.flatMap((t) => {
          if (!t.pending || t.pendingRunId !== r) return [t];
          i = !0;
          let a = { ...t, pendingRunId: n };
          return e.entries.some((e) => !e.pending && St(a, e)) ? [] : [a];
        });
      return i ? Ct(e, a) : e;
    }
    case `sendFailed`: {
      let n = lt(t.runId),
        r = e.entries.filter((e) => !e.pending || e.pendingRunId !== n);
      return r.length === e.entries.length ? e : Ct(e, r);
    }
    case `runDelta`:
      return jt(e, {
        runId: t.runId,
        status: `streaming`,
        ...(t.message === void 0 ? {} : { message: t.message }),
      });
    case `runTerminal`:
      return jt(e, {
        runId: t.runId,
        status: t.status,
        ...(t.message === void 0 ? {} : { message: t.message }),
        ...(t.stopReason === void 0 ? {} : { stopReason: t.stopReason }),
        ...(t.errorKind === void 0 ? {} : { errorKind: t.errorKind }),
        ...(t.errorMessage === void 0 ? {} : { errorMessage: t.errorMessage }),
      });
    case `transportGap`:
      return e.hasTransportGap ? e : { ...e, hasTransportGap: !0 };
    case `reconnected`:
      return e;
    default:
      return e;
  }
}
function Nt(e, t, n = {}) {
  return pt(e, t, n);
}
var Pt, Ft, It;
function Lt() {
  return (Lt = e(() => {
    (dt(),
      mt(),
      (Pt = 200),
      (Ft = 150),
      (It = [`sessionKey`, `sessionId`, `agentId`, `lifecycleRevision`, `activeLeafEntryId`]));
  }))();
}
var Rt;
function zt() {
  return (zt = e(() => {
    (ke(),
      (Rt = class {
        constructor(e, t, n, r) {
          if (
            ((this.subscribe = !1),
            (this.provided = !1),
            (this.value = void 0),
            (this.t = (e, t) => {
              (this.unsubscribe &&
                (this.unsubscribe !== t && ((this.provided = !1), this.unsubscribe()),
                this.subscribe || this.unsubscribe()),
                (this.value = e),
                this.host.requestUpdate(),
                (this.provided && !this.subscribe) ||
                  ((this.provided = !0), this.callback && this.callback(e, t)),
                (this.unsubscribe = t));
            }),
            (this.host = e),
            t.context !== void 0)
          ) {
            let e = t;
            ((this.context = e.context),
              (this.callback = e.callback),
              (this.subscribe = e.subscribe ?? !1));
          } else ((this.context = t), (this.callback = n), (this.subscribe = r ?? !1));
          this.host.addController(this);
        }
        hostConnected() {
          this.dispatchRequest();
        }
        hostDisconnected() {
          this.unsubscribe &&= (this.unsubscribe(), void 0);
        }
        dispatchRequest() {
          this.host.dispatchEvent(new Le(this.context, this.host, this.t, this.subscribe));
        }
      }));
  }))();
}
function Bt({ context: e, subscribe: t }) {
  return (n, r) => {
    typeof r == `object`
      ? r.addInitializer(function () {
          new Rt(this, {
            context: e,
            callback: (e) => {
              n.set.call(this, e);
            },
            subscribe: t,
          });
        })
      : n.constructor.addInitializer((n) => {
          new Rt(n, {
            context: e,
            callback: (e) => {
              n[r] = e;
            },
            subscribe: t,
          });
        });
  };
}
function Vt() {
  return (Vt = e(() => {
    zt();
  }))();
}
var Ht;
function Ut() {
  return (Ut = e(() => {
    Ht = class extends Event {
      constructor(e) {
        (super(`wa-select`, { bubbles: !0, cancelable: !0, composed: !0 }), (this.detail = e));
      }
    };
  }))();
}
function* Wt(e = document.activeElement) {
  e != null &&
    (yield e,
    `shadowRoot` in e &&
      e.shadowRoot &&
      e.shadowRoot.mode !== `closed` &&
      (yield* Wt(e.shadowRoot.activeElement)));
}
var Gt;
function Kt() {
  return (Kt = e(() => {
    (Je(),
      (Gt = $e`
  :host {
    --show-duration: var(--wa-transition-fast);
    --hide-duration: var(--wa-transition-fast);
    display: contents;
  }

  #menu {
    display: flex;
    flex-direction: column;
    width: max-content;
    margin: 0;
    padding: 0.25em;
    border: var(--wa-border-style) var(--wa-border-width-s) var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background-color: var(--wa-color-surface-raised);
    box-shadow: var(--wa-shadow-m);
    color: var(--wa-color-text-normal);
    text-align: start;
    user-select: none;
    overflow: auto;
    max-width: var(--auto-size-available-width) !important;
    max-height: var(--auto-size-available-height) !important;

    &.show {
      animation: show var(--show-duration) ease;
    }

    &.hide {
      animation: show var(--hide-duration) ease reverse;
    }

    ::slotted(h1),
    ::slotted(h2),
    ::slotted(h3),
    ::slotted(h4),
    ::slotted(h5),
    ::slotted(h6) {
      display: block !important;
      margin: 0.25em 0 !important;
      padding: 0.25em 0.75em !important;
      color: var(--wa-color-text-quiet);
      font-family: var(--wa-font-family-body) !important;
      font-weight: var(--wa-font-weight-semibold) !important;
      font-size: var(--wa-font-size-smaller) !important;
    }

    ::slotted(wa-divider) {
      --spacing: 0.25em; /* Component-specific, left as-is */
    }
  }

  wa-popup[data-current-placement^='top'] #menu {
    transform-origin: bottom;
  }

  wa-popup[data-current-placement^='bottom'] #menu {
    transform-origin: top;
  }

  wa-popup[data-current-placement^='left'] #menu {
    transform-origin: right;
  }

  wa-popup[data-current-placement^='right'] #menu {
    transform-origin: left;
  }

  wa-popup[data-current-placement='left-start'] #menu {
    transform-origin: right top;
  }

  wa-popup[data-current-placement='left-end'] #menu {
    transform-origin: right bottom;
  }

  wa-popup[data-current-placement='right-start'] #menu {
    transform-origin: left top;
  }

  wa-popup[data-current-placement='right-end'] #menu {
    transform-origin: left bottom;
  }

  @keyframes show {
    from {
      scale: 0.9;
      opacity: 0;
    }
    to {
      scale: 1;
      opacity: 1;
    }
  }
`));
  }))();
}
var qt, Jt;
function Yt() {
  return (Yt = e(() => {
    (Ut(),
      Kt(),
      r(),
      ie(),
      u(),
      Be(),
      Fe(),
      Ie(),
      d(),
      te(),
      He(),
      Ce(),
      Ve(),
      xe(),
      Je(),
      Ye(),
      (qt = new Set()),
      (Jt = class extends ze {
        constructor() {
          (super(...arguments),
            (this.submenuCleanups = new Map()),
            (this.localize = new we(this)),
            (this.userTypedQuery = ``),
            (this.openSubmenuStack = []),
            (this.open = !1),
            (this.size = `m`),
            (this.placement = `bottom-start`),
            (this.distance = 0),
            (this.skidding = 0),
            (this.handleDocumentKeyDown = async (e) => {
              let t = this.localize.dir() === `rtl`;
              if (e.key === `Escape` && this.open && Te(this)) {
                let t = this.getTrigger();
                (e.preventDefault(),
                  e.stopPropagation(),
                  (this.open = !1),
                  t?.focus({ preventScroll: !0 }));
                return;
              }
              let n = [...Wt()].find((e) => e.localName === `wa-dropdown-item`),
                r = n?.localName === `wa-dropdown-item`,
                i = this.getCurrentSubmenuItem(),
                a = !!i,
                o,
                s,
                c;
              a
                ? ((o = this.getSubmenuItems(i)),
                  (s = o.find((e) => e.active || e === n)),
                  (c = s ? o.indexOf(s) : -1))
                : ((o = this.getItems()),
                  (s = o.find((e) => e.active || e === n)),
                  (c = s ? o.indexOf(s) : -1));
              let l;
              if (
                (e.key === `ArrowUp` &&
                  (e.preventDefault(),
                  e.stopPropagation(),
                  (l = c > 0 ? o[c - 1] : o[o.length - 1])),
                e.key === `ArrowDown` &&
                  (e.preventDefault(),
                  e.stopPropagation(),
                  (l = c !== -1 && c < o.length - 1 ? o[c + 1] : o[0])),
                e.key === (t ? `ArrowLeft` : `ArrowRight`) && r && s && s.hasSubmenu)
              ) {
                (e.preventDefault(),
                  e.stopPropagation(),
                  (s.submenuOpen = !0),
                  this.addToSubmenuStack(s),
                  setTimeout(() => {
                    let e = this.getSubmenuItems(s);
                    e.length > 0 &&
                      (e.forEach((e, t) => (e.active = t === 0)),
                      e[0].focus({ preventScroll: !0 }));
                  }, 0));
                return;
              }
              if (e.key === (t ? `ArrowRight` : `ArrowLeft`) && a) {
                (e.preventDefault(), e.stopPropagation());
                let t = this.removeFromSubmenuStack();
                t &&
                  ((t.submenuOpen = !1),
                  setTimeout(() => {
                    (t.focus({ preventScroll: !0 }),
                      (t.active = !0),
                      (t.slot === `submenu`
                        ? this.getSubmenuItems(t.parentElement)
                        : this.getItems()
                      ).forEach((e) => {
                        e !== t && (e.active = !1);
                      }));
                  }, 0));
                return;
              }
              if (
                ((e.key === `Home` || e.key === `End`) &&
                  (e.preventDefault(),
                  e.stopPropagation(),
                  (l = e.key === `Home` ? o[0] : o[o.length - 1])),
                e.key === `Tab` && (await this.hideMenu()),
                e.key.length === 1 &&
                  !(e.metaKey || e.ctrlKey || e.altKey) &&
                  (e.key !== ` ` || this.userTypedQuery !== ``) &&
                  (clearTimeout(this.userTypedTimeout),
                  (this.userTypedTimeout = setTimeout(() => {
                    this.userTypedQuery = ``;
                  }, 1e3)),
                  (this.userTypedQuery += e.key),
                  o.some((e) => {
                    let t = (e.textContent || ``).trim().toLowerCase(),
                      n = this.userTypedQuery.trim().toLowerCase();
                    return t.startsWith(n) ? ((l = e), !0) : !1;
                  })),
                l)
              ) {
                (e.preventDefault(),
                  e.stopPropagation(),
                  o.forEach((e) => (e.active = e === l)),
                  l.focus({ preventScroll: !0 }),
                  l.scrollIntoView({ block: `nearest` }));
                return;
              }
              (e.key === `Enter` || (e.key === ` ` && this.userTypedQuery === ``)) &&
                r &&
                s &&
                (e.preventDefault(),
                e.stopPropagation(),
                s.hasSubmenu
                  ? ((s.submenuOpen = !0),
                    this.addToSubmenuStack(s),
                    setTimeout(() => {
                      let e = this.getSubmenuItems(s);
                      e.length > 0 &&
                        (e.forEach((e, t) => (e.active = t === 0)),
                        e[0].focus({ preventScroll: !0 }));
                    }, 0))
                  : this.makeSelection(s));
            }),
            (this.handleDocumentPointerDown = (e) => {
              e
                .composedPath()
                .some((e) =>
                  e instanceof HTMLElement
                    ? e === this || e.closest(`wa-dropdown, [part="submenu"]`)
                    : !1,
                ) || (this.open = !1);
            }),
            (this.handleGlobalMouseMove = (e) => {
              let t = this.getCurrentSubmenuItem();
              if (!t?.submenuOpen || !t.submenuElement) return;
              let n = t.submenuElement.getBoundingClientRect(),
                r = this.localize.dir() === `rtl`,
                i = r ? n.right : n.left,
                a = r ? Math.max(e.clientX, i) : Math.min(e.clientX, i),
                o = Math.max(n.top, Math.min(e.clientY, n.bottom));
              (t.submenuElement.style.setProperty(`--safe-triangle-cursor-x`, `${a}px`),
                t.submenuElement.style.setProperty(`--safe-triangle-cursor-y`, `${o}px`));
              let s = e.composedPath(),
                c = t.matches(`:hover`),
                l = !!t.submenuElement?.matches(`:hover`),
                u = c || !!s.find((e) => e === t),
                d =
                  l ||
                  !!s.find(
                    (e) =>
                      e instanceof HTMLElement &&
                      e.closest(`[part="submenu"]`) === t.submenuElement,
                  );
              !u &&
                !d &&
                setTimeout(() => {
                  !c && !l && (t.submenuOpen = !1);
                }, 100);
            }));
        }
        handleSizeChange() {
          h(this.localName, this.size);
        }
        disconnectedCallback() {
          (super.disconnectedCallback(),
            clearInterval(this.userTypedTimeout),
            this.closeAllSubmenus(),
            this.submenuCleanups.forEach((e) => e()),
            this.submenuCleanups.clear(),
            document.removeEventListener(`mousemove`, this.handleGlobalMouseMove),
            document.removeEventListener(`keydown`, this.handleDocumentKeyDown),
            document.removeEventListener(`pointerdown`, this.handleDocumentPointerDown),
            Ne(this));
        }
        firstUpdated() {
          this.syncAriaAttributes();
        }
        async updated(e) {
          if (e.has(`open`)) {
            let t = e.get(`open`);
            if (t === this.open || (t === void 0 && this.open === !1)) return;
            (this.customStates.set(`open`, this.open),
              this.open ? await this.showMenu() : (this.closeAllSubmenus(), await this.hideMenu()));
          }
          e.has(`size`) && this.syncItemSizes();
        }
        getItems(e = !1) {
          let t = (this.defaultSlot?.assignedElements({ flatten: !0 }) ?? []).filter(
            (e) => e.localName === `wa-dropdown-item`,
          );
          return e ? t : t.filter((e) => !e.disabled);
        }
        getSubmenuItems(e, t = !1) {
          let n =
            e.shadowRoot?.querySelector(`slot[name="submenu"]`) ||
            e.querySelector(`slot[name="submenu"]`);
          if (!n) return [];
          let r = n
            .assignedElements({ flatten: !0 })
            .filter((e) => e.localName === `wa-dropdown-item`);
          return t ? r : r.filter((e) => !e.disabled);
        }
        syncItemSizes() {
          (this.defaultSlot?.assignedElements({ flatten: !0 }) ?? [])
            .filter((e) => e.localName === `wa-dropdown-item`)
            .forEach((e) => (e.size = this.size));
        }
        addToSubmenuStack(e) {
          let t = this.openSubmenuStack.indexOf(e);
          t === -1
            ? this.openSubmenuStack.push(e)
            : (this.openSubmenuStack = this.openSubmenuStack.slice(0, t + 1));
        }
        removeFromSubmenuStack() {
          return this.openSubmenuStack.pop();
        }
        getCurrentSubmenuItem() {
          return this.openSubmenuStack.length > 0
            ? this.openSubmenuStack[this.openSubmenuStack.length - 1]
            : void 0;
        }
        closeAllSubmenus() {
          (this.getItems(!0).forEach((e) => {
            e.submenuOpen = !1;
          }),
            (this.openSubmenuStack = []));
        }
        closeSiblingSubmenus(e) {
          let t = e.closest(`wa-dropdown-item:not([slot="submenu"])`),
            n;
          ((n = t ? this.getSubmenuItems(t, !0) : this.getItems(!0)),
            n.forEach((t) => {
              t !== e && t.submenuOpen && (t.submenuOpen = !1);
            }),
            this.openSubmenuStack.includes(e) || this.openSubmenuStack.push(e));
        }
        getTrigger() {
          return this.querySelector(`[slot="trigger"]`);
        }
        async showMenu() {
          if (!this.getTrigger() || !this.popup || !this.menu) return;
          let e = new Oe();
          if ((this.dispatchEvent(e), e.defaultPrevented)) {
            this.open = !1;
            return;
          }
          if (this.popup.active) return;
          (qt.forEach((e) => (e.open = !1)),
            (this.popup.active = !0),
            (this.open = !0),
            qt.add(this),
            _e(this),
            this.syncAriaAttributes(),
            document.addEventListener(`keydown`, this.handleDocumentKeyDown),
            document.addEventListener(`pointerdown`, this.handleDocumentPointerDown),
            document.addEventListener(`mousemove`, this.handleGlobalMouseMove),
            this.menu.classList.remove(`hide`),
            await he(this.menu, `show`));
          let t = this.getItems();
          (t.length > 0 &&
            (t.forEach((e, t) => (e.active = t === 0)), t[0].focus({ preventScroll: !0 })),
            this.dispatchEvent(new ce()));
        }
        async hideMenu() {
          if (!this.popup || !this.menu) return;
          let e = new s({ source: this });
          if ((this.dispatchEvent(e), e.defaultPrevented)) {
            this.open = !0;
            return;
          }
          ((this.open = !1),
            qt.delete(this),
            Ne(this),
            this.syncAriaAttributes(),
            document.removeEventListener(`keydown`, this.handleDocumentKeyDown),
            document.removeEventListener(`pointerdown`, this.handleDocumentPointerDown),
            document.removeEventListener(`mousemove`, this.handleGlobalMouseMove),
            this.menu.classList.remove(`show`),
            await he(this.menu, `hide`),
            (this.popup.active = this.open),
            this.dispatchEvent(new a()));
        }
        handleMenuClick(e) {
          let t = e.target.closest(`wa-dropdown-item`);
          if (!(!t || t.disabled)) {
            if (t.hasSubmenu) {
              ((t.submenuOpen ||= (this.closeSiblingSubmenus(t), this.addToSubmenuStack(t), !0)),
                e.stopPropagation());
              return;
            }
            this.makeSelection(t);
          }
        }
        async handleMenuSlotChange() {
          let e = this.getItems(!0);
          (await Promise.all(e.map((e) => e.updateComplete)), this.syncItemSizes());
          let t = e.some((e) => e.type === `checkbox`),
            n = e.some((e) => e.hasSubmenu);
          e.forEach((e, r) => {
            ((e.active = r === 0), (e.checkboxAdjacent = t), (e.submenuAdjacent = n));
          });
        }
        handleTriggerClick() {
          this.open = !this.open;
        }
        handleSubmenuOpening(e) {
          let t = e.detail.item;
          (this.closeSiblingSubmenus(t),
            this.addToSubmenuStack(t),
            this.setupSubmenuPosition(t),
            this.processSubmenuItems(t));
        }
        setupSubmenuPosition(e) {
          if (!e.submenuElement) return;
          this.cleanupSubmenuPosition(e);
          let t = Ae(e, e.submenuElement, () => {
            (this.positionSubmenu(e), this.updateSafeTriangleCoordinates(e));
          });
          this.submenuCleanups.set(e, t);
          let n = e.submenuElement.querySelector(`slot[name="submenu"]`);
          n &&
            (n.removeEventListener(`slotchange`, Jt.handleSubmenuSlotChange),
            n.addEventListener(`slotchange`, Jt.handleSubmenuSlotChange),
            Jt.handleSubmenuSlotChange({ target: n }));
        }
        static handleSubmenuSlotChange(e) {
          let t = e.target;
          if (!t) return;
          let n = t.assignedElements().filter((e) => e.localName === `wa-dropdown-item`);
          if (n.length === 0) return;
          let r = n.some((e) => e.hasSubmenu),
            i = n.some((e) => e.type === `checkbox`);
          n.forEach((e) => {
            ((e.submenuAdjacent = r), (e.checkboxAdjacent = i));
          });
        }
        processSubmenuItems(e) {
          if (!e.submenuElement) return;
          let t = this.getSubmenuItems(e, !0),
            n = t.some((e) => e.hasSubmenu);
          t.forEach((e) => {
            e.submenuAdjacent = n;
          });
        }
        cleanupSubmenuPosition(e) {
          let t = this.submenuCleanups.get(e);
          t && (t(), this.submenuCleanups.delete(e));
        }
        positionSubmenu(e) {
          if (!e.submenuElement) return;
          let t = this.localize.dir() === `rtl` ? `left-start` : `right-start`;
          Re(e, e.submenuElement, {
            placement: t,
            middleware: [
              Pe({ mainAxis: 0, crossAxis: -5 }),
              ye({ fallbackStrategy: `bestFit` }),
              je({ padding: 8 }),
            ],
          }).then(({ x: t, y: n, placement: r }) => {
            (e.submenuElement.setAttribute(`data-placement`, r),
              Object.assign(e.submenuElement.style, { left: `${t}px`, top: `${n}px` }));
          });
        }
        updateSafeTriangleCoordinates(e) {
          if (!e.submenuElement || !e.submenuOpen) return;
          if (document.activeElement?.matches(`:focus-visible`)) {
            e.submenuElement.style.setProperty(`--safe-triangle-visible`, `none`);
            return;
          }
          e.submenuElement.style.setProperty(`--safe-triangle-visible`, `block`);
          let t = e.submenuElement.getBoundingClientRect(),
            n = this.localize.dir() === `rtl`;
          (e.submenuElement.style.setProperty(
            `--safe-triangle-submenu-start-x`,
            `${n ? t.right : t.left}px`,
          ),
            e.submenuElement.style.setProperty(`--safe-triangle-submenu-start-y`, `${t.top}px`),
            e.submenuElement.style.setProperty(
              `--safe-triangle-submenu-end-x`,
              `${n ? t.right : t.left}px`,
            ),
            e.submenuElement.style.setProperty(`--safe-triangle-submenu-end-y`, `${t.bottom}px`));
        }
        makeSelection(e) {
          let t = this.getTrigger();
          if (e.disabled) return;
          e.type === `checkbox` && (e.checked = !e.checked);
          let n = new Ht({ item: e });
          (this.dispatchEvent(n),
            n.defaultPrevented || ((this.open = !1), t?.focus({ preventScroll: !0 })));
        }
        async syncAriaAttributes() {
          let e = this.getTrigger(),
            t;
          e &&
            (e.localName === `wa-button`
              ? (await customElements.whenDefined(`wa-button`),
                await e.updateComplete,
                (t = e.shadowRoot.querySelector(`[part~="base"]`)))
              : (t = e),
            t.hasAttribute(`id`) || t.setAttribute(`id`, Me(`wa-dropdown-trigger-`)),
            t.setAttribute(`aria-haspopup`, `menu`),
            t.setAttribute(`aria-expanded`, this.open ? `true` : `false`),
            this.menu?.setAttribute(`aria-expanded`, `false`));
        }
        render() {
          let e = this.didSSR && !this.hasUpdated ? this.open : this.popup?.active;
          return Ke`
      <wa-popup
        placement=${this.placement}
        distance=${this.distance}
        skidding=${this.skidding}
        ?active=${e}
        flip
        flip-fallback-strategy="best-fit"
        shift
        shift-padding="10"
        auto-size="vertical"
        auto-size-padding="10"
      >
        <slot
          name="trigger"
          slot="anchor"
          @click=${this.handleTriggerClick}
          @slotchange=${this.syncAriaAttributes}
        ></slot>
        <div
          id="menu"
          part="menu"
          role="menu"
          tabindex="-1"
          aria-orientation="vertical"
          @click=${this.handleMenuClick}
          @submenu-opening=${this.handleSubmenuOpening}
        >
          <slot @slotchange=${this.handleMenuSlotChange}></slot>
        </div>
      </wa-popup>
    `;
        }
      }),
      (Jt.css = [ae, Gt]),
      g([Ze(`slot:not([name])`)], Jt.prototype, `defaultSlot`, 2),
      g([Ze(`#menu`)], Jt.prototype, `menu`, 2),
      g([Ze(`wa-popup`)], Jt.prototype, `popup`, 2),
      g([_({ type: Boolean, reflect: !0 })], Jt.prototype, `open`, 2),
      g([_({ reflect: !0 })], Jt.prototype, `size`, 2),
      g([me(`size`)], Jt.prototype, `handleSizeChange`, 1),
      g([_({ reflect: !0 })], Jt.prototype, `placement`, 2),
      g([_({ type: Number })], Jt.prototype, `distance`, 2),
      g([_({ type: Number })], Jt.prototype, `skidding`, 2),
      (Jt = g([Qe(`wa-dropdown`)], Jt)));
  }))();
}
var Xt;
function Zt() {
  return (Zt = e(() => {
    (Je(),
      (Xt = $e`
  :host {
    display: flex;
    position: relative;
    align-items: center;
    padding: 0.5em 1em;
    border-radius: var(--wa-border-radius-s);
    isolation: isolate;
    color: var(--wa-color-text-normal);
    line-height: var(--wa-line-height-condensed);
    cursor: pointer;
    transition:
      var(--wa-transition-fast) background-color var(--wa-transition-easing),
      var(--wa-transition-fast) color var(--wa-transition-easing);
  }

  @media (hover: hover) {
    :host(:hover:not(:state(disabled))) {
      background-color: var(--wa-color-neutral-fill-normal);
    }
  }

  :host(:state(submenu-open)) {
    background-color: var(--wa-color-neutral-fill-normal);
  }

  :host(:focus-visible) {
    z-index: 1;
    outline: var(--wa-focus-ring);
    background-color: var(--wa-color-neutral-fill-normal);
  }

  :host(:state(disabled)),
  :host([disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Danger variant */
  :host([variant='danger']),
  :host([variant='danger']) #details {
    color: var(--wa-color-danger-on-quiet);
  }

  @media (hover: hover) {
    :host([variant='danger']:hover) {
      background-color: var(--wa-color-danger-fill-normal);
      color: var(--wa-color-danger-on-normal);
    }
  }

  :host([variant='danger']:state(submenu-open)),
  :host([variant='danger']:focus-visible) {
    background-color: var(--wa-color-danger-fill-normal);
    color: var(--wa-color-danger-on-normal);
  }

  :host([checkbox-adjacent]) {
    padding-inline-start: 2em;
  }

  /* Only add padding when item actually has a submenu */
  :host([submenu-adjacent]:not(:state(has-submenu))) #details {
    padding-inline-end: 0;
  }

  :host(:state(has-submenu)[submenu-adjacent]) #details {
    padding-inline-end: 1.75em;
  }

  #check {
    visibility: hidden;
    margin-inline-start: -1.5em;
    margin-inline-end: 0.5em;
    font-size: var(--wa-font-size-smaller);
  }

  :host(:state(checked)) #check {
    visibility: visible;
  }

  #icon ::slotted(*) {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    margin-inline-end: 0.75em !important;
    font-size: var(--wa-font-size-smaller);
  }

  #label {
    flex: 1 1 auto;
    min-width: 0;
  }

  #details {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: end;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-smaller) !important;
  }

  #details ::slotted(*) {
    margin-inline-start: 2em !important;
  }

  /* Submenu indicator icon */
  #submenu-indicator {
    position: absolute;
    inset-inline-end: 1em;
    color: var(--wa-color-neutral-on-quiet);
    font-size: var(--wa-font-size-smaller);
  }

  /* Flip chevron icon when RTL */
  :host(:dir(rtl)) #submenu-indicator {
    transform: scaleX(-1);
  }

  /* Submenu styles */
  #submenu {
    display: flex;
    z-index: 10;
    position: absolute;
    top: 0;
    left: 0;
    flex-direction: column;
    width: max-content;
    margin: 0;
    padding: 0.25em;
    border: var(--wa-border-style) var(--wa-border-width-s) var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background-color: var(--wa-color-surface-raised);
    box-shadow: var(--wa-shadow-m);
    color: var(--wa-color-text-normal);
    text-align: start;
    user-select: none;

    /* Override default popover styles */
    &[popover] {
      margin: 0;
      inset: auto;
      padding: 0.25em;
      overflow: visible;
      border-radius: var(--wa-border-radius-m);
    }

    &.show {
      animation: submenu-show var(--show-duration, var(--wa-transition-fast)) ease;
    }

    &.hide {
      animation: submenu-show var(--show-duration, var(--wa-transition-fast)) ease reverse;
    }

    /* Submenu placement transform origins */
    &[data-placement^='top'] {
      transform-origin: bottom;
    }

    &[data-placement^='bottom'] {
      transform-origin: top;
    }

    &[data-placement^='left'] {
      transform-origin: right;
    }

    &[data-placement^='right'] {
      transform-origin: left;
    }

    &[data-placement='left-start'] {
      transform-origin: right top;
    }

    &[data-placement='left-end'] {
      transform-origin: right bottom;
    }

    &[data-placement='right-start'] {
      transform-origin: left top;
    }

    &[data-placement='right-end'] {
      transform-origin: left bottom;
    }

    /* Safe triangle styling */
    &::before {
      display: none;
      z-index: 9;
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background-color: transparent;
      content: '';
      clip-path: polygon(
        var(--safe-triangle-cursor-x, 0) var(--safe-triangle-cursor-y, 0),
        var(--safe-triangle-submenu-start-x, 0) var(--safe-triangle-submenu-start-y, 0),
        var(--safe-triangle-submenu-end-x, 0) var(--safe-triangle-submenu-end-y, 0)
      );
      pointer-events: auto; /* Enable mouse events on the triangle */
    }

    &[data-visible]::before {
      display: block;
    }
  }

  ::slotted(wa-dropdown-item) {
    font-size: inherit;
  }

  ::slotted(wa-divider) {
    --spacing: 0.25em;
  }

  @keyframes submenu-show {
    from {
      scale: 0.9;
      opacity: 0;
    }
    to {
      scale: 1;
      opacity: 1;
    }
  }
`));
  }))();
}
var Qt;
function $t() {
  return ($t = e(() => {
    (Zt(),
      le(),
      d(),
      He(),
      Ve(),
      Je(),
      Ye(),
      (Qt = class extends ze {
        constructor() {
          (super(...arguments),
            (this.hasSlotController = new m(this, `[default]`, `start`, `end`)),
            (this.active = !1),
            (this.variant = `default`),
            (this.size = `m`),
            (this.checkboxAdjacent = !1),
            (this.submenuAdjacent = !1),
            (this.type = `normal`),
            (this.checked = !1),
            (this.disabled = !1),
            (this.submenuOpen = !1),
            (this.hasSubmenu = !1),
            (this.handleSlotChange = () => {
              ((this.hasSubmenu = this.hasSlotController.test(`submenu`)),
                this.updateHasSubmenuState(),
                this.hasSubmenu
                  ? (this.setAttribute(`aria-haspopup`, `menu`),
                    this.setAttribute(`aria-expanded`, this.submenuOpen ? `true` : `false`))
                  : (this.removeAttribute(`aria-haspopup`), this.removeAttribute(`aria-expanded`)));
            }),
            (this.handleHostClick = (e) => {
              this.disabled && (e.preventDefault(), e.stopImmediatePropagation());
            }),
            (this.handleClick = (e) => {
              this.disabled && (e.preventDefault(), e.stopImmediatePropagation());
            }));
        }
        handleSizeChange() {
          h(this.localName, this.size);
        }
        connectedCallback() {
          (super.connectedCallback(),
            this.addEventListener?.(`click`, this.handleHostClick),
            this.addEventListener?.(`mouseenter`, this.handleMouseEnter.bind(this)),
            this.shadowRoot?.addEventListener?.(`click`, this.handleClick, { capture: !0 }),
            this.shadowRoot?.addEventListener?.(`slotchange`, this.handleSlotChange));
        }
        disconnectedCallback() {
          (super.disconnectedCallback(),
            this.closeSubmenu(),
            this.removeEventListener?.(`click`, this.handleHostClick),
            this.removeEventListener?.(`mouseenter`, this.handleMouseEnter),
            this.shadowRoot?.removeEventListener?.(`click`, this.handleClick, { capture: !0 }),
            this.shadowRoot?.removeEventListener?.(`slotchange`, this.handleSlotChange));
        }
        firstUpdated() {
          (this.setAttribute(`tabindex`, `-1`),
            (this.hasSubmenu = this.hasSlotController.test(`submenu`)),
            this.updateHasSubmenuState());
        }
        updated(e) {
          (e.has(`active`) &&
            (this.setAttribute(`tabindex`, this.active ? `0` : `-1`),
            this.customStates.set(`active`, this.active)),
            e.has(`checked`) &&
              (this.type === `checkbox`
                ? this.setAttribute(`aria-checked`, this.checked ? `true` : `false`)
                : this.removeAttribute(`aria-checked`),
              this.customStates.set(`checked`, this.checked)),
            e.has(`disabled`) &&
              (this.setAttribute(`aria-disabled`, this.disabled ? `true` : `false`),
              this.customStates.set(`disabled`, this.disabled)),
            e.has(`type`) &&
              (this.type === `checkbox`
                ? (this.setAttribute(`role`, `menuitemcheckbox`),
                  this.setAttribute(`aria-checked`, this.checked ? `true` : `false`))
                : (this.setAttribute(`role`, `menuitem`), this.removeAttribute(`aria-checked`))),
            e.has(`submenuOpen`) &&
              (this.customStates.set(`submenu-open`, this.submenuOpen),
              this.submenuOpen ? this.openSubmenu() : this.closeSubmenu()));
        }
        updateHasSubmenuState() {
          this.customStates.set(`has-submenu`, this.hasSubmenu);
        }
        async openSubmenu() {
          let e = this.submenuElement;
          !this.hasSubmenu ||
            !e ||
            !this.isConnected ||
            (this.notifyParentOfOpening(),
            e.showPopover?.(),
            (e.hidden = !1),
            e.setAttribute(`data-visible`, ``),
            (this.submenuOpen = !0),
            this.setAttribute(`aria-expanded`, `true`),
            await he(e, `show`),
            setTimeout(() => {
              let e = this.getSubmenuItems();
              e.length > 0 &&
                (e.forEach((e, t) => (e.active = t === 0)), e[0].focus({ preventScroll: !0 }));
            }, 0));
        }
        notifyParentOfOpening() {
          let e = new CustomEvent(`submenu-opening`, {
            bubbles: !0,
            composed: !0,
            detail: { item: this },
          });
          this.dispatchEvent(e);
          let t = this.parentElement;
          t &&
            [...t.children]
              .filter(
                (e) =>
                  e !== this &&
                  e.localName === `wa-dropdown-item` &&
                  e.getAttribute(`slot`) === this.getAttribute(`slot`) &&
                  e.submenuOpen,
              )
              .forEach((e) => {
                e.submenuOpen = !1;
              });
        }
        async closeSubmenu() {
          let e = this.submenuElement;
          !this.hasSubmenu ||
            !e ||
            ((this.submenuOpen = !1),
            this.setAttribute(`aria-expanded`, `false`),
            e.hidden ||
              (await he(e, `hide`),
              e?.isConnected &&
                ((e.hidden = !0), e.removeAttribute(`data-visible`), e.hidePopover?.())));
        }
        getSubmenuItems() {
          return [...this.children].filter(
            (e) =>
              e.localName === `wa-dropdown-item` &&
              e.getAttribute(`slot`) === `submenu` &&
              !e.hasAttribute(`disabled`),
          );
        }
        handleMouseEnter() {
          this.hasSubmenu &&
            !this.disabled &&
            (this.notifyParentOfOpening(), (this.submenuOpen = !0));
        }
        render() {
          return Ke`
      ${
        this.type === `checkbox`
          ? Ke`
            <wa-icon
              id="check"
              part="checkmark"
              exportparts="svg:checkmark__svg"
              library="system"
              name="check"
            ></wa-icon>
          `
          : ``
      }

      <span id="icon" part="icon">
        <slot name="icon"></slot>
      </span>

      <span id="label" part="label">
        <slot></slot>
      </span>

      <span id="details" part="details">
        <slot name="details"></slot>
      </span>

      ${
        this.hasSubmenu
          ? Ke`
            <wa-icon
              id="submenu-indicator"
              part="submenu-icon"
              exportparts="svg:submenu-icon__svg"
              library="system"
              name="chevron-right"
            ></wa-icon>
          `
          : ``
      }
      ${
        this.hasSubmenu
          ? Ke`
            <div
              id="submenu"
              part="submenu"
              popover="manual"
              role="menu"
              tabindex="-1"
              aria-orientation="vertical"
              hidden
            >
              <slot name="submenu"></slot>
            </div>
          `
          : ``
      }
    `;
        }
      }),
      (Qt.css = Xt),
      g([Ze(`#submenu`)], Qt.prototype, `submenuElement`, 2),
      g([_({ type: Boolean })], Qt.prototype, `active`, 2),
      g([_({ reflect: !0 })], Qt.prototype, `variant`, 2),
      g([_({ reflect: !0 })], Qt.prototype, `size`, 2),
      g([me(`size`)], Qt.prototype, `handleSizeChange`, 1),
      g(
        [_({ attribute: `checkbox-adjacent`, type: Boolean, reflect: !0 })],
        Qt.prototype,
        `checkboxAdjacent`,
        2,
      ),
      g(
        [_({ attribute: `submenu-adjacent`, type: Boolean, reflect: !0 })],
        Qt.prototype,
        `submenuAdjacent`,
        2,
      ),
      g([_()], Qt.prototype, `value`, 2),
      g([_({ reflect: !0 })], Qt.prototype, `type`, 2),
      g([_({ type: Boolean })], Qt.prototype, `checked`, 2),
      g([_({ type: Boolean, reflect: !0 })], Qt.prototype, `disabled`, 2),
      g([_({ type: Boolean, reflect: !0 })], Qt.prototype, `submenuOpen`, 2),
      g([tt()], Qt.prototype, `hasSubmenu`, 2),
      (Qt = g([Qe(`wa-dropdown-item`)], Qt)));
  }))();
}
function en() {
  return (en = e(() => {
    (Yt(), Kt(), $t(), Zt(), ve(), se(), te(), l(), o(), He(), Ce(), ge());
  }))();
}
function tn() {
  return (tn = e(() => {
    ($t(), Zt(), l(), o(), He());
  }))();
}
function nn(e) {
  return e !== void 0 && e !== `local` && e !== `reclaimed`;
}
function rn() {
  return (rn = e(() => {}))();
}
function an(e, t) {
  return (
    t[e.length]?.(...e) ??
    (() => {
      throw Error(`Invalid Arguments`);
    })()
  );
}
function on(e, t, n) {
  return e >= t && e <= n;
}
function sn(e) {
  return e === 8205;
}
function cn(e) {
  return on(e, 55296, 56319);
}
function ln(e) {
  return on(e, 127462, 127487);
}
function un(e) {
  return on(e, 65024, 65039);
}
function dn(e) {
  return on(e, 768, 879) || on(e, 6832, 6911) || on(e, 7616, 7679) || on(e, 65056, 65071);
}
function fn(e) {
  return e > 65535 ? 2 : 1;
}
function pn(e, t) {
  for (; t < e.length;) {
    let n = e.codePointAt(t);
    if (dn(n) || un(n)) t += fn(n);
    else break;
  }
  return t;
}
function mn(e, t) {
  let n = e.codePointAt(t),
    r = t + fn(n);
  for (r = pn(e, r); r < e.length - 1 && sn(e.codePointAt(r));) {
    let t = e.codePointAt(r + 1);
    ((r += 1 + fn(t)), (r = pn(e, r)));
  }
  return (ln(n) && r < e.length && ln(e.codePointAt(r)) && (r += fn(e.codePointAt(r))), r);
}
function hn(e) {
  return cn(e) || dn(e) || un(e) || sn(e);
}
function gn(e) {
  let t = 0,
    n = 0;
  for (; n < e.length;) ((n = mn(e, n)), t++);
  return t;
}
function _n(e, t) {
  if (t === 0) return !0;
  let n = 0,
    r = 0;
  for (; r < e.length;) if (((r = mn(e, r)), n++, n >= t)) return !0;
  return !1;
}
function vn(e, t) {
  let n = 0,
    r = 0;
  for (; r < e.length;) if (((r = mn(e, r)), n++, n > t)) return !1;
  return !0;
}
function yn(e, t) {
  if (t === 0) return !0;
  let n = 0;
  for (; n < e.length;) {
    if (hn(e.charCodeAt(n))) return _n(e, t);
    if ((n++, n >= t)) return !0;
  }
  return !1;
}
function bn(e, t) {
  let n = 0;
  for (; n < e.length;) {
    if (hn(e.charCodeAt(n))) return vn(e, t);
    if ((n++, n > t)) return !1;
  }
  return !0;
}
var xn = t({
  Counted: () => Kn,
  Entries: () => Yn,
  EntriesRegExp: () => Jn,
  Every: () => Hn,
  EveryAll: () => Un,
  GraphemeCount: () => zn,
  HasPropertyKey: () => C,
  IsArray: () => v,
  IsBigInt: () => Sn,
  IsBoolean: () => Cn,
  IsClassInstance: () => Ln,
  IsConstructor: () => wn,
  IsDeepEqual: () => er,
  IsEqual: () => x,
  IsFunction: () => Tn,
  IsGreaterEqualThan: () => Fn,
  IsGreaterThan: () => Mn,
  IsInteger: () => En,
  IsLessEqualThan: () => Pn,
  IsLessThan: () => Nn,
  IsMaxLength: () => Bn,
  IsMinLength: () => Vn,
  IsMultipleOf: () => In,
  IsNull: () => Dn,
  IsNumber: () => On,
  IsObject: () => y,
  IsObjectNotArray: () => kn,
  IsString: () => b,
  IsSymbol: () => An,
  IsUndefined: () => jn,
  IsUnsafePropertyKey: () => qn,
  IsValueLike: () => Rn,
  Keys: () => w,
  ShiftLeft: () => S,
  Some: () => Wn,
  SomeAll: () => Gn,
  Symbols: () => Xn,
  Values: () => Zn,
});
function v(e) {
  return Array.isArray(e);
}
function Sn(e) {
  return x(typeof e, `bigint`);
}
function Cn(e) {
  return x(typeof e, `boolean`);
}
function wn(e) {
  if (jn(e) || !Tn(e)) return !1;
  let t = Function.prototype.toString.call(e);
  return !!(/^class\s/.test(t) || /\[native code\]/.test(t));
}
function Tn(e) {
  return x(typeof e, `function`);
}
function En(e) {
  return Number.isInteger(e);
}
function Dn(e) {
  return x(e, null);
}
function On(e) {
  return Number.isFinite(e);
}
function kn(e) {
  return y(e) && !v(e);
}
function y(e) {
  return x(typeof e, `object`) && !Dn(e);
}
function b(e) {
  return x(typeof e, `string`);
}
function An(e) {
  return x(typeof e, `symbol`);
}
function jn(e) {
  return x(e, void 0);
}
function x(e, t) {
  return e === t;
}
function Mn(e, t) {
  return e > t;
}
function Nn(e, t) {
  return e < t;
}
function Pn(e, t) {
  return e <= t;
}
function Fn(e, t) {
  return e >= t;
}
function In(e, t) {
  if (Sn(e) || Sn(t)) return BigInt(e) % BigInt(t) === 0n;
  if (!On(e) || (En(e) && (1 / t) % 1 == 0)) return !0;
  let n = e % t;
  return Math.min(Math.abs(n), Math.abs(n - t), Math.abs(n + t)) < 1e-10;
}
function Ln(e) {
  if (!y(e)) return !1;
  let t = globalThis.Object.getPrototypeOf(e);
  return (
    !Dn(t) &&
    x(typeof t.constructor, `function`) &&
    !(x(t.constructor, globalThis.Object) || x(t.constructor.name, `Object`))
  );
}
function Rn(e) {
  return Sn(e) || Cn(e) || Dn(e) || On(e) || b(e) || jn(e);
}
function zn(e) {
  return gn(e);
}
function Bn(e, t) {
  return bn(e, t);
}
function Vn(e, t) {
  return yn(e, t);
}
function Hn(e, t, n) {
  for (let r = t; r < e.length; r++) if (!n(e[r], r)) return !1;
  return !0;
}
function Un(e, t, n) {
  let r = !0;
  for (let i = t; i < e.length; i++) n(e[i], i) || (r = !1);
  return r;
}
function Wn(e, t) {
  for (let n = 0; n < e.length; n++) if (t(e[n], n)) return !0;
  return !1;
}
function Gn(e, t) {
  let n = !1;
  for (let r = 0; r < e.length; r++) t(e[r], r) && (n = !0);
  return n;
}
function Kn(e, t) {
  return e.reduce((e, n, r) => (t(n, r) ? ++e : e), 0);
}
function S(e, t, n) {
  return x(e.length, 0) ? n() : t(e[0], e.slice(1));
}
function qn(e) {
  return x(e, `__proto__`) || x(e, `constructor`) || x(e, `prototype`);
}
function C(e, t) {
  return qn(t) ? Object.prototype.hasOwnProperty.call(e, t) : t in e;
}
function Jn(e) {
  return w(e).map((t) => [RegExp(`^${t}$`), e[t]]);
}
function Yn(e) {
  return Object.entries(e);
}
function w(e) {
  return Object.getOwnPropertyNames(e);
}
function Xn(e) {
  return Object.getOwnPropertySymbols(e);
}
function Zn(e) {
  return Object.values(e);
}
function Qn(e, t) {
  if (!y(t)) return !1;
  let n = w(e);
  return x(n.length, w(t).length) && n.every((n) => er(e[n], t[n]));
}
function $n(e, t) {
  return v(t) && x(e.length, t.length) && e.every((n, r) => er(e[r], t[r]));
}
function er(e, t) {
  return v(e) ? $n(e, t) : y(e) ? Qn(e, t) : x(e, t);
}
function tr() {
  return (tr = e(() => {}))();
}
function nr(e) {
  return Kr.test(e);
}
function rr(e, t) {
  return `(${e} && ${t})`;
}
function ir(e, t) {
  return `(${e} || ${t})`;
}
function ar(e) {
  return `!(${e})`;
}
function or(e) {
  return `Array.isArray(${e})`;
}
function sr(e) {
  return `typeof ${e} === "bigint"`;
}
function cr(e) {
  return `typeof ${e} === "boolean"`;
}
function lr(e) {
  return `Number.isInteger(${e})`;
}
function ur(e) {
  return `${e} === null`;
}
function dr(e) {
  return `Number.isFinite(${e})`;
}
function fr(e) {
  return rr(pr(e), ar(or(e)));
}
function pr(e) {
  return `typeof ${e} === "object" && ${e} !== null`;
}
function mr(e) {
  return `typeof ${e} === "string"`;
}
function hr(e) {
  return `typeof ${e} === "symbol"`;
}
function gr(e) {
  return `${e} === undefined`;
}
function _r(e) {
  return `typeof ${e} === "function"`;
}
function vr(e) {
  return `Guard.IsConstructor(${e})`;
}
function yr(e, t) {
  return `${e} === ${t}`;
}
function br(e, t) {
  return `${e} > ${t}`;
}
function xr(e, t) {
  return `${e} < ${t}`;
}
function Sr(e, t) {
  return `${e} <= ${t}`;
}
function Cr(e, t) {
  return `${e} >= ${t}`;
}
function wr(e, t) {
  return `Guard.IsMinLength(${e}, ${t})`;
}
function Tr(e, t) {
  return `Guard.IsMaxLength(${e}, ${t})`;
}
function Er(e, t, n, r) {
  return x(t, `0`)
    ? `${e}.every((${n[0]}, ${n[1]}) => ${r})`
    : `((value, callback) => { for(let index = ${t}; index < value.length; index++) if (!callback(value[index], index)) return false; return true })(${e}, (${n[0]}, ${n[1]}) => ${r})`;
}
function Dr(e, t, n) {
  return `${e}.some((${t[0]}, ${t[1]}) => ${n})`;
}
function Or(e, t, n) {
  return `((value, callback) => { let result = false; for(let index = 0; index < value.length; index++) if (callback(value[index], index)) result = true; return result })(${e}, (${t[0]}, ${t[1]}) => ${n})`;
}
function kr(e, t, n) {
  return `${e}.reduce((result, ${t[0]}, ${t[1]}) => (${n}) ? ++result : result, 0)`;
}
function Ar(e) {
  return `Object.entries(${e})`;
}
function jr(e) {
  return `Object.getOwnPropertyNames(${e})`;
}
function Mr(e, t) {
  return x(t, `"__proto__"`) || x(t, `"constructor"`)
    ? `Object.prototype.hasOwnProperty.call(${e}, ${t})`
    : `${t} in ${e}`;
}
function Nr(e, t) {
  return `Guard.IsDeepEqual(${e}, ${t})`;
}
function Pr(e) {
  return `[${e.join(`, `)}]`;
}
function Fr(e, t) {
  return `((${e.join(`, `)}) => ${t})`;
}
function Ir(e, t) {
  return `${e}(${t.join(`, `)})`;
}
function Lr(e, t) {
  return `new ${e}(${t.join(`, `)})`;
}
function T(e, t) {
  return `${e}${nr(t) ? `.${t}` : `[${E(t)}]`}`;
}
function E(e) {
  if (!Rn(e)) throw Error(`Unsupported Constant`);
  return b(e) ? JSON.stringify(e) : `${e}`;
}
function Rr(e, t, n) {
  return `(${e} ? ${t} : ${n})`;
}
function zr(e) {
  return `{ ${e.join(`; `)}; }`;
}
function Br(e, t) {
  return `const ${e} = ${t}`;
}
function Vr(e, t) {
  return `if(${e}) { ${t} }`;
}
function Hr(e) {
  return `return ${e}`;
}
function Ur(e) {
  return x(e.length, 0) ? `true` : e.reduce((e, t) => rr(e, t));
}
function Wr(e) {
  return x(e.length, 0) ? `false` : e.reduce((e, t) => ir(e, t));
}
function Gr(e, t) {
  return `Guard.IsMultipleOf(${e}, ${t})`;
}
var Kr;
function qr() {
  return (qr = e(() => {
    (tr(), (Kr = /^[\p{ID_Start}_$][\p{ID_Continue}_$\u200C\u200D]*$/u));
  }))();
}
function Jr(e) {
  return e instanceof Boolean;
}
function Yr(e) {
  return e instanceof Number;
}
function Xr(e) {
  return e instanceof String;
}
function Zr(e) {
  return globalThis.ArrayBuffer.isView(e);
}
function Qr(e) {
  return e instanceof globalThis.RegExp;
}
function $r(e) {
  return e instanceof globalThis.Date;
}
function ei(e) {
  return e instanceof globalThis.Set;
}
function ti(e) {
  return e instanceof globalThis.Map;
}
var ni;
function D() {
  return (D = e(() => {
    (qr(), tr(), (ni = xn));
  }))();
}
function ri(e) {
  return (
    C(e, `~refine`) &&
    v(e[`~refine`]) &&
    Hn(e[`~refine`], 0, (e) => y(e) && C(e, `check`) && C(e, `error`) && Tn(e.check) && Tn(e.error))
  );
}
function ii() {
  return (ii = e(() => {
    D();
  }))();
}
function ai(e) {
  return y(e) && !v(e);
}
function oi(e) {
  return Cn(e);
}
function si(e) {
  return ai(e) || oi(e);
}
function ci() {
  return (ci = e(() => {
    D();
  }))();
}
function li(e) {
  return C(e, `additionalItems`) && si(e.additionalItems);
}
function ui() {
  return (ui = e(() => {
    (D(), ci());
  }))();
}
function di(e) {
  return C(e, `additionalProperties`) && si(e.additionalProperties);
}
function fi() {
  return (fi = e(() => {
    (D(), ci());
  }))();
}
function pi(e) {
  return C(e, `allOf`) && v(e.allOf) && e.allOf.every((e) => si(e));
}
function mi() {
  return (mi = e(() => {
    (D(), ci());
  }))();
}
function hi(e) {
  return C(e, `$anchor`) && b(e.$anchor);
}
function gi() {
  return (gi = e(() => {
    D();
  }))();
}
function _i(e) {
  return C(e, `anyOf`) && v(e.anyOf) && e.anyOf.every((e) => si(e));
}
function vi() {
  return (vi = e(() => {
    (D(), ci());
  }))();
}
function yi(e) {
  return C(e, `const`);
}
function bi() {
  return (bi = e(() => {
    D();
  }))();
}
function xi(e) {
  return C(e, `contains`) && si(e.contains);
}
function Si() {
  return (Si = e(() => {
    (D(), ci());
  }))();
}
function Ci(e) {
  return C(e, `default`);
}
function wi() {
  return (wi = e(() => {
    D();
  }))();
}
function Ti(e) {
  return (
    C(e, `dependencies`) &&
    y(e.dependencies) &&
    Object.values(e.dependencies).every((e) => si(e) || (v(e) && e.every((e) => b(e))))
  );
}
function Ei() {
  return (Ei = e(() => {
    (D(), ci());
  }))();
}
function Di(e) {
  return (
    C(e, `dependentRequired`) &&
    y(e.dependentRequired) &&
    Object.values(e.dependentRequired).every((e) => v(e) && e.every((e) => b(e)))
  );
}
function Oi() {
  return (Oi = e(() => {
    D();
  }))();
}
function ki(e) {
  return (
    C(e, `dependentSchemas`) &&
    y(e.dependentSchemas) &&
    Object.values(e.dependentSchemas).every((e) => si(e))
  );
}
function Ai() {
  return (Ai = e(() => {
    (D(), ci());
  }))();
}
function ji(e) {
  return C(e, `$dynamicAnchor`) && b(e.$dynamicAnchor);
}
function Mi() {
  return (Mi = e(() => {
    D();
  }))();
}
function Ni(e) {
  return C(e, `$dynamicRef`) && b(e.$dynamicRef);
}
function Pi() {
  return (Pi = e(() => {
    D();
  }))();
}
function Fi(e) {
  return C(e, `else`) && si(e.else);
}
function Ii() {
  return (Ii = e(() => {
    (D(), ci());
  }))();
}
function Li(e) {
  return C(e, `enum`) && v(e.enum);
}
function Ri() {
  return (Ri = e(() => {
    D();
  }))();
}
function zi(e) {
  return C(e, `exclusiveMaximum`) && (On(e.exclusiveMaximum) || Sn(e.exclusiveMaximum));
}
function Bi() {
  return (Bi = e(() => {
    D();
  }))();
}
function Vi(e) {
  return C(e, `exclusiveMinimum`) && (On(e.exclusiveMinimum) || Sn(e.exclusiveMinimum));
}
function Hi() {
  return (Hi = e(() => {
    D();
  }))();
}
function Ui(e) {
  return C(e, `format`) && b(e.format);
}
function Wi() {
  return (Wi = e(() => {
    D();
  }))();
}
function Gi(e) {
  return C(e, `$id`) && b(e.$id);
}
function Ki() {
  return (Ki = e(() => {
    D();
  }))();
}
function qi(e) {
  return C(e, `if`) && si(e.if);
}
function Ji() {
  return (Ji = e(() => {
    (D(), ci());
  }))();
}
function Yi(e) {
  return C(e, `items`) && (si(e.items) || (v(e.items) && e.items.every((e) => si(e))));
}
function Xi(e) {
  return Yi(e) && v(e.items);
}
function Zi() {
  return (Zi = e(() => {
    (D(), ci());
  }))();
}
function Qi(e) {
  return C(e, `maximum`) && (On(e.maximum) || Sn(e.maximum));
}
function $i() {
  return ($i = e(() => {
    D();
  }))();
}
function ea(e) {
  return C(e, `maxContains`) && On(e.maxContains);
}
function ta() {
  return (ta = e(() => {
    D();
  }))();
}
function na(e) {
  return C(e, `maxItems`) && On(e.maxItems);
}
function ra() {
  return (ra = e(() => {
    D();
  }))();
}
function ia(e) {
  return C(e, `maxLength`) && On(e.maxLength);
}
function aa() {
  return (aa = e(() => {
    D();
  }))();
}
function oa(e) {
  return C(e, `maxProperties`) && On(e.maxProperties);
}
function sa() {
  return (sa = e(() => {
    D();
  }))();
}
function ca(e) {
  return C(e, `minimum`) && (On(e.minimum) || Sn(e.minimum));
}
function la() {
  return (la = e(() => {
    D();
  }))();
}
function ua(e) {
  return C(e, `minContains`) && On(e.minContains);
}
function da() {
  return (da = e(() => {
    D();
  }))();
}
function fa(e) {
  return C(e, `minItems`) && On(e.minItems);
}
function pa() {
  return (pa = e(() => {
    D();
  }))();
}
function ma(e) {
  return C(e, `minLength`) && On(e.minLength);
}
function ha() {
  return (ha = e(() => {
    D();
  }))();
}
function ga(e) {
  return C(e, `minProperties`) && On(e.minProperties);
}
function _a() {
  return (_a = e(() => {
    D();
  }))();
}
function va(e) {
  return C(e, `multipleOf`) && (On(e.multipleOf) || Sn(e.multipleOf));
}
function ya() {
  return (ya = e(() => {
    D();
  }))();
}
function ba(e) {
  return C(e, `not`) && si(e.not);
}
function xa() {
  return (xa = e(() => {
    (D(), ci());
  }))();
}
function Sa(e) {
  return C(e, `oneOf`) && v(e.oneOf) && e.oneOf.every((e) => si(e));
}
function Ca() {
  return (Ca = e(() => {
    (D(), ci());
  }))();
}
function wa(e) {
  return C(e, `pattern`) && (b(e.pattern) || e.pattern instanceof RegExp);
}
function Ta() {
  return (Ta = e(() => {
    D();
  }))();
}
function Ea(e) {
  return (
    C(e, `patternProperties`) &&
    y(e.patternProperties) &&
    Object.values(e.patternProperties).every((e) => si(e))
  );
}
function Da() {
  return (Da = e(() => {
    (D(), ci());
  }))();
}
function Oa(e) {
  return C(e, `prefixItems`) && v(e.prefixItems) && e.prefixItems.every((e) => si(e));
}
function ka() {
  return (ka = e(() => {
    (D(), ci());
  }))();
}
function Aa(e) {
  return C(e, `properties`) && y(e.properties) && Object.values(e.properties).every((e) => si(e));
}
function ja() {
  return (ja = e(() => {
    (D(), ci());
  }))();
}
function Ma(e) {
  return C(e, `propertyNames`) && (y(e.propertyNames) || si(e.propertyNames));
}
function Na() {
  return (Na = e(() => {
    (D(), ci());
  }))();
}
function Pa(e) {
  return C(e, `$recursiveAnchor`) && Cn(e.$recursiveAnchor);
}
function Fa(e) {
  return Pa(e) && x(e.$recursiveAnchor, !0);
}
function Ia() {
  return (Ia = e(() => {
    D();
  }))();
}
function La(e) {
  return C(e, `$recursiveRef`) && b(e.$recursiveRef);
}
function Ra() {
  return (Ra = e(() => {
    D();
  }))();
}
function za(e) {
  return C(e, `$ref`) && b(e.$ref);
}
function Ba() {
  return (Ba = e(() => {
    D();
  }))();
}
function Va(e) {
  return C(e, `required`) && v(e.required) && e.required.every((e) => b(e));
}
function Ha() {
  return (Ha = e(() => {
    D();
  }))();
}
function Ua(e) {
  return C(e, `then`) && si(e.then);
}
function Wa() {
  return (Wa = e(() => {
    (D(), ci());
  }))();
}
function Ga(e) {
  return C(e, `type`) && (b(e.type) || (v(e.type) && e.type.every((e) => b(e))));
}
function Ka() {
  return (Ka = e(() => {
    D();
  }))();
}
function qa(e) {
  return C(e, `uniqueItems`) && Cn(e.uniqueItems);
}
function Ja() {
  return (Ja = e(() => {
    D();
  }))();
}
function Ya(e) {
  return C(e, `unevaluatedItems`) && si(e.unevaluatedItems);
}
function Xa() {
  return (Xa = e(() => {
    (D(), ci());
  }))();
}
function Za(e) {
  return C(e, `unevaluatedProperties`) && si(e.unevaluatedProperties);
}
function Qa() {
  return (Qa = e(() => {
    (D(), ci());
  }))();
}
function $a(e) {
  return Ya(e) || Za(e) || Wn(w(e), (t) => to(e[t]));
}
function eo(e) {
  return Wn(e, (e) => to(e));
}
function to(e) {
  return v(e) ? eo(e) : y(e) ? $a(e) : !1;
}
function no(e, t) {
  return to(t) || Wn(w(e), (t) => to(e[t]));
}
var ro, io, ao, oo;
function so() {
  return (so = e(() => {
    (Xa(),
      Qa(),
      D(),
      (ro = class {
        constructor(e) {
          this.hasUnevaluated = e;
        }
        UseUnevaluated() {
          return this.hasUnevaluated;
        }
        Push() {
          return Ir(T(`context`, `Push`), []);
        }
        Pop() {
          return Ir(T(`context`, `Pop`), []);
        }
        AddIndex(e) {
          return Ir(T(`context`, `AddIndex`), [e]);
        }
        AddKey(e) {
          return Ir(T(`context`, `AddKey`), [e]);
        }
        Merge(e) {
          return Ir(T(`context`, `Merge`), [e]);
        }
      }),
      (io = class {
        constructor() {
          let e = new Set(),
            t = new Set();
          this.stack = [{ indices: e, keys: t }];
        }
        Push() {
          let e = new Set(),
            t = new Set();
          return (this.stack.push({ indices: e, keys: t }), !0);
        }
        Pop() {
          return (this.stack.pop(), !0);
        }
        AddIndex(e) {
          return (this.GetIndices().add(e), !0);
        }
        AddKey(e) {
          return (this.GetKeys().add(e), !0);
        }
        GetIndices() {
          return this.stack[this.stack.length - 1].indices;
        }
        GetKeys() {
          return this.stack[this.stack.length - 1].keys;
        }
        Merge(e) {
          for (let t of e)
            (t.GetIndices().forEach((e) => this.GetIndices().add(e)),
              t.GetKeys().forEach((e) => this.GetKeys().add(e)));
          return !0;
        }
      }),
      (ao = class extends io {
        constructor(e) {
          (super(), (this.callback = e));
        }
        AddError(e) {
          return (this.callback(e), !1);
        }
      }),
      (oo = class extends ao {
        constructor() {
          (super((e) => this.errors.push(e)), (this.errors = []));
        }
        AddError(e) {
          return (this.errors.push(e), !1);
        }
        GetErrors() {
          return this.errors;
        }
      }));
  }))();
}
function co(e) {
  let t = `External[${fo.variables.length}]`;
  return (fo.variables.push(e), t);
}
function lo() {
  fo.variables = [];
}
function uo() {
  return { ...fo };
}
var fo;
function po() {
  return (po = e(() => {
    fo = { identifier: `External`, variables: [] };
  }))();
}
function mo(e, t, n, r) {
  return Er(
    co(n[`~refine`].map((e) => e)),
    E(0),
    [`refinement`, `_`],
    Ir(T(`refinement`, `check`), [r]),
  );
}
function ho(e, t, n, r) {
  return Hn(n[`~refine`], 0, (e, t) => e.check(r));
}
function go(e, t, n, r, i, a) {
  return Un(
    i[`~refine`],
    0,
    (e, i) =>
      e.check(a) ||
      t.AddError({
        keyword: `~refine`,
        schemaPath: n,
        instancePath: r,
        params: { index: i, message: e.error(a) },
      }),
  );
}
function _o() {
  return (_o = e(() => {
    (po(), D());
  }))();
}
function vo() {
  return `var_${yo++}`;
}
var yo;
function bo() {
  return (bo = e(() => {
    yo = 0;
  }))();
}
function xo(e) {
  return Yi(e) && v(e.items);
}
function So(e, t, n, r) {
  let [i, a] = [vo(), vo()],
    o = Wp(e, t, n.additionalItems, i),
    s = xr(a, E(n.items.length)),
    c = t.AddIndex(a);
  return Er(r, E(0), [i, a], ir(s, rr(o, c)));
}
function Co(e, t, n, r) {
  let [i, a] = [vo(), vo()],
    o = Wp(e, t, n.additionalItems, i),
    s = xr(a, E(n.items.length));
  return Er(r, E(0), [i, a], ir(s, o));
}
function wo(e, t, n, r) {
  return xo(n) ? (t.UseUnevaluated() ? So(e, t, n, r) : Co(e, t, n, r)) : E(!0);
}
function To(e, t, n, r) {
  return (
    !xo(n) ||
    Hn(r, 0, (r, i) => Nn(i, n.items.length) || (Kp(e, t, n.additionalItems, r) && t.AddIndex(i)))
  );
}
function Eo(e, t, n, r, i, a) {
  return (
    !xo(i) ||
    Hn(a, 0, (a, o) => {
      let s = `${n}/additionalItems`,
        c = `${r}/${o}`;
      return Nn(o, i.items.length) || (Jp(e, t, s, c, i.additionalItems, a) && t.AddIndex(o));
    })
  );
}
function Do() {
  return (Do = e(() => {
    (Zi(), bo(), D(), Xp());
  }))();
}
function Oo(e) {
  return new RegExp(e, `u`);
}
function ko(e) {
  return `^${e.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)}$`;
}
function Ao(e) {
  let t = [];
  return (
    Ea(e) && t.push(...w(e.patternProperties)),
    Aa(e) && t.push(...w(e.properties).map(ko)),
    x(t.length, 0) ? `(?!)` : `(${t.join(`|`)})`
  );
}
function jo(e, t, n) {
  return (
    Va(t) &&
    Aa(t) &&
    !Ea(t) &&
    x(t.additionalProperties, !1) &&
    x(w(t.properties).length, t.required.length)
  );
}
function Mo(e, t, n) {
  return yr(T(Ir(T(`Object`, `getOwnPropertyNames`), [n]), `length`), E(t.required.length));
}
function No(e, t, n, r) {
  let [i, a] = [vo(), vo()],
    o = co(Oo(Ao(n))),
    s = Wp(e, t, n.additionalProperties, `${r}[${i}]`),
    c = Ir(T(o, `test`), [i]),
    l = t.AddKey(i),
    u = t.UseUnevaluated() ? ir(c, rr(s, l)) : ir(c, s);
  return Er(jr(r), E(0), [i, a], u);
}
function Po(e, t, n, r) {
  return jo(t, n, r) ? Mo(t, n, r) : No(e, t, n, r);
}
function Fo(e, t, n, r) {
  let i = Oo(Ao(n));
  return Hn(
    w(r),
    0,
    (a, o) => i.test(a) || (Kp(e, t, n.additionalProperties, r[a]) && t.AddKey(a)),
  );
}
function Io(e, t, n, r, i, a) {
  let o = Oo(Ao(i)),
    s = [];
  return (
    Un(w(a), 0, (c, l) => {
      let u = `${n}/additionalProperties`,
        d = `${r}/${c}`,
        f = new oo(),
        p = o.test(c) || (Jp(e, f, u, d, i.additionalProperties, a[c]) && t.AddKey(c));
      return (p || s.push(c), p);
    }) ||
    t.AddError({
      keyword: `additionalProperties`,
      schemaPath: n,
      instancePath: r,
      params: { additionalProperties: s },
    })
  );
}
function Lo() {
  return (Lo = e(() => {
    (Da(), ja(), Ha(), po(), bo(), so(), D(), Xp());
  }))();
}
function Ro(e, t, n, r, i) {
  let a = Br(`results`, `[]`),
    o = n.map((e, t) => Br(`context_${t}`, Lr(`CheckContext`, []))),
    s = n.map((n, i) =>
      Br(`condition_${i}`, Ir(Fr([`context`], Gp(e, t, n, r)), [`context_${i}`])),
    ),
    c = n.map((e, t) => Vr(`condition_${t}`, Ir(T(`results`, `push`), [`context_${t}`]))),
    l = Hr(rr(i, t.Merge(`results`)));
  return Ir(Fr([], zr([a, ...o, ...s, ...c, l])), []);
}
function zo() {
  return (zo = e(() => {
    (D(), Xp());
  }))();
}
function Bo(e, t, n, r) {
  return Ro(e, t, n.allOf, r, yr(T(`results`, `length`), E(n.allOf.length)));
}
function Vo(e, t, n, r) {
  return Ur(n.allOf.map((n) => Gp(e, t, n, r)));
}
function Ho(e, t, n, r) {
  return t.UseUnevaluated() ? Bo(e, t, n, r) : Vo(e, t, n, r);
}
function Uo(e, t, n, r) {
  let i = n.allOf.reduce((t, n) => {
    let i = new io();
    return qp(e, i, n, r) ? [...t, i] : t;
  }, []);
  return x(i.length, n.allOf.length) && t.Merge(i);
}
function Wo(e, t, n, r, i, a) {
  let o = [],
    s = i.allOf.reduce((t, i, s) => {
      let c = `${n}/allOf/${s}`,
        l = new oo(),
        u = Yp(e, l, c, r, i, a);
      return (u || o.push(l), u ? [...t, l] : t);
    }, []),
    c = x(s.length, i.allOf.length) && t.Merge(s);
  return (c || o.forEach((e) => e.GetErrors().forEach((e) => t.AddError(e))), c);
}
function Go() {
  return (Go = e(() => {
    (so(), zo(), D(), Xp());
  }))();
}
function Ko(e, t, n, r) {
  return Ro(e, t, n.anyOf, r, br(T(`results`, `length`), E(0)));
}
function qo(e, t, n, r) {
  return Wr(n.anyOf.map((n) => Gp(e, t, n, r)));
}
function Jo(e, t, n, r) {
  return t.UseUnevaluated() ? Ko(e, t, n, r) : qo(e, t, n, r);
}
function Yo(e, t, n, r) {
  let i = n.anyOf.reduce((t, n) => {
    let i = new io();
    return qp(e, i, n, r) ? [...t, i] : t;
  }, []);
  return Mn(i.length, 0) && t.Merge(i);
}
function Xo(e, t, n, r, i, a) {
  let o = [],
    s = i.anyOf.reduce((t, i, s) => {
      let c = new oo(),
        l = Yp(e, c, `${n}/anyOf/${s}`, r, i, a);
      return (l || o.push(c), l ? [...t, c] : t);
    }, []),
    c = Mn(s.length, 0) && t.Merge(s);
  return (
    c || o.forEach((e) => e.GetErrors().forEach((e) => t.AddError(e))),
    c || t.AddError({ keyword: `anyOf`, schemaPath: n, instancePath: r, params: {} })
  );
}
function Zo() {
  return (Zo = e(() => {
    (so(), zo(), D(), Xp());
  }))();
}
function Qo(e, t, n, r) {
  return E(!!n);
}
function $o(e, t, n, r) {
  return n;
}
function es(e, t, n, r, i, a) {
  return (
    $o(e, t, i, a) || t.AddError({ keyword: `boolean`, schemaPath: n, instancePath: r, params: {} })
  );
}
function ts() {
  return (ts = e(() => {
    D();
  }))();
}
function ns(e, t, n, r) {
  return Rn(n.const) ? yr(r, E(n.const)) : Nr(r, co(n.const));
}
function rs(e, t, n, r) {
  return Rn(n.const) ? x(r, n.const) : er(r, n.const);
}
function is(e, t, n, r, i, a) {
  return (
    rs(e, t, i, a) ||
    t.AddError({
      keyword: `const`,
      schemaPath: n,
      instancePath: r,
      params: { allowedValue: i.const },
    })
  );
}
function as() {
  return (as = e(() => {
    (po(), D());
  }))();
}
function os(e) {
  return !(ua(e) && x(e.minContains, 0));
}
function ss(e, t, n, r) {
  let [i, a] = [vo(), vo()];
  return rr(
    ar(yr(T(r, `length`), E(0))),
    Or(r, [i, a], rr(Gp(e, t, n.contains, i), t.AddIndex(a))),
  );
}
function cs(e, t, n, r) {
  let [i] = [vo()];
  return rr(ar(yr(T(r, `length`), E(0))), Dr(r, [i, `_`], Gp(e, t, n.contains, i)));
}
function ls(e, t, n, r) {
  return os(n) ? (t.UseUnevaluated() ? ss(e, t, n, r) : cs(e, t, n, r)) : E(!0);
}
function us(e, t, n, r) {
  return !os(n) || (!x(r.length, 0) && Gn(r, (r, i) => qp(e, t, n.contains, r) && t.AddIndex(i)));
}
function ds(e, t, n, r, i, a) {
  return (
    us(e, t, i, a) ||
    t.AddError({ keyword: `contains`, schemaPath: n, instancePath: r, params: { minContains: 1 } })
  );
}
function fs() {
  return (fs = e(() => {
    (da(), bo(), D(), Xp());
  }))();
}
function ps(e, t, n, r) {
  return ir(
    yr(T(jr(r), `length`), E(0)),
    Ur(
      Yn(n.dependencies).map(([n, i]) => {
        let a = ar(Mr(r, E(n))),
          o = Gp(e, t, i, r);
        return ir(a, v(i) ? ((e) => Ur(e.map((e) => Mr(r, E(e)))))(i) : o);
      }),
    ),
  );
}
function ms(e, t, n, r) {
  let i = x(w(r).length, 0),
    a = Hn(
      Yn(n.dependencies),
      0,
      ([n, i]) => !C(r, n) || (v(i) ? i.every((e) => C(r, e)) : qp(e, t, i, r)),
    );
  return i || a;
}
function hs(e, t, n, r, i, a) {
  let o = x(w(a).length, 0),
    s = Un(Yn(i.dependencies), 0, ([i, o]) => {
      let s = `${n}/dependencies/${i}`;
      return (
        !C(a, i) ||
        (v(o)
          ? o.every(
              (e) =>
                C(a, e) ||
                t.AddError({
                  keyword: `dependencies`,
                  schemaPath: n,
                  instancePath: r,
                  params: { property: i, dependencies: o },
                }),
            )
          : Yp(e, t, s, r, o, a))
      );
    });
  return o || s;
}
function gs() {
  return (gs = e(() => {
    (D(), Xp());
  }))();
}
function _s(e, t, n, r) {
  return ir(
    yr(T(jr(r), `length`), E(0)),
    Ur(Yn(n.dependentRequired).map(([e, t]) => ir(ar(Mr(r, E(e))), Ur(t.map((e) => Mr(r, E(e))))))),
  );
}
function vs(e, t, n, r) {
  let i = x(w(r).length, 0),
    a = Hn(Yn(n.dependentRequired), 0, ([e, t]) => !C(r, e) || t.every((e) => C(r, e)));
  return i || a;
}
function ys(e, t, n, r, i, a) {
  let o = x(w(a).length, 0),
    s = Un(
      Yn(i.dependentRequired),
      0,
      ([e, i]) =>
        !C(a, e) ||
        Un(
          i,
          0,
          (o) =>
            C(a, o) ||
            t.AddError({
              keyword: `dependentRequired`,
              schemaPath: n,
              instancePath: r,
              params: { property: e, dependencies: i },
            }),
        ),
    );
  return o || s;
}
function bs() {
  return (bs = e(() => {
    D();
  }))();
}
function xs(e, t, n, r) {
  return ir(
    yr(T(jr(r), `length`), E(0)),
    Ur(Yn(n.dependentSchemas).map(([n, i]) => ir(ar(Mr(r, E(n))), Gp(e, t, i, r)))),
  );
}
function Ss(e, t, n, r) {
  let i = x(w(r).length, 0),
    a = Hn(Yn(n.dependentSchemas), 0, ([n, i]) => !C(r, n) || qp(e, t, i, r));
  return i || a;
}
function Cs(e, t, n, r, i, a) {
  let o = x(w(a).length, 0),
    s = Un(Yn(i.dependentSchemas), 0, ([i, o]) => {
      let s = `${n}/dependentSchemas/${i}`;
      return !C(a, i) || Yp(e, t, s, r, o, a);
    });
  return o || s;
}
function ws() {
  return (ws = e(() => {
    (D(), Xp());
  }))();
}
function Ts(e, t, n, r) {
  return rm(e, t, e.DynamicRef(n) ?? !1, r);
}
function Es(e, t, n, r) {
  let i = e.DynamicRef(n) ?? !1;
  return si(i) && qp(e, t, i, r);
}
function Ds(e, t, n, r, i, a) {
  let o = e.DynamicRef(i) ?? !1;
  return si(o) && Yp(e, t, `#`, r, o, a);
}
function Os() {
  return (Os = e(() => {
    (sm(), ci(), Xp());
  }))();
}
function ks(e, t, n, r) {
  return Wr(n.enum.map((e) => (Rn(e) ? yr(r, E(e)) : Nr(r, co(e)))));
}
function As(e, t, n, r) {
  return Wn(n.enum, (e) => (Rn(e) ? x(r, e) : er(r, e)));
}
function js(e, t, n, r, i, a) {
  return (
    As(e, t, i, a) ||
    t.AddError({
      keyword: `enum`,
      schemaPath: n,
      instancePath: r,
      params: { allowedValues: i.enum },
    })
  );
}
function Ms() {
  return (Ms = e(() => {
    (po(), D());
  }))();
}
function Ns(e, t, n, r) {
  return xr(r, E(n.exclusiveMaximum));
}
function Ps(e, t, n, r) {
  return Nn(r, n.exclusiveMaximum);
}
function Fs(e, t, n, r, i, a) {
  return (
    Ps(e, t, i, a) ||
    t.AddError({
      keyword: `exclusiveMaximum`,
      schemaPath: n,
      instancePath: r,
      params: { comparison: `<`, limit: i.exclusiveMaximum },
    })
  );
}
function Is() {
  return (Is = e(() => {
    D();
  }))();
}
function Ls(e, t, n, r) {
  return br(r, E(n.exclusiveMinimum));
}
function Rs(e, t, n, r) {
  return Mn(r, n.exclusiveMinimum);
}
function zs(e, t, n, r, i, a) {
  return (
    Rs(e, t, i, a) ||
    t.AddError({
      keyword: `exclusiveMinimum`,
      schemaPath: n,
      instancePath: r,
      params: { comparison: `>`, limit: i.exclusiveMinimum },
    })
  );
}
function Bs() {
  return (Bs = e(() => {
    D();
  }))();
}
function Vs(e) {
  return e % 4 == 0 && (e % 100 != 0 || e % 400 == 0);
}
function Hs(e) {
  let t = Ws.exec(e);
  if (!t) return !1;
  let n = +t[1],
    r = +t[2],
    i = +t[3];
  return r >= 1 && r <= 12 && i >= 1 && i <= (r === 2 && Vs(n) ? 29 : Us[r]);
}
var Us, Ws;
function Gs() {
  return (Gs = e(() => {
    ((Us = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]),
      (Ws = /^(\d\d\d\d)-(\d\d)-(\d\d)$/));
  }))();
}
function Ks(e, t = !0) {
  let n = qs.exec(e);
  if (!n || (t && !n[4] && !n[5])) return !1;
  let r = +n[1],
    i = +n[2],
    a = +n[3];
  if (r > 23 || i > 59 || a > 60) return !1;
  if (n[5]) {
    let e = +n[6],
      t = +n[7];
    if (e > 23 || t > 59) return !1;
  }
  if (a < 60) return !0;
  let o = n[5] === `-` ? -1 : 1,
    s = +(n[6] || 0),
    c = +(n[7] || 0);
  return (((r * 60 + i - o * (s * 60 + c)) % 1440) + 1440) % 1440 == 1439;
}
var qs;
function Js() {
  return (Js = e(() => {
    qs = /^(\d\d):(\d\d):(\d\d)(?:\.\d+)?(?:([Zz])|([+-])(\d\d):(\d\d))?$/;
  }))();
}
function Ys(e) {
  let t = e.split(/T/i);
  return t.length === 2 && Hs(t[0]) && Ks(t[1]);
}
function Xs() {
  return (Xs = e(() => {
    (Gs(), Js());
  }))();
}
function Zs(e) {
  return Qs.test(e);
}
var Qs;
function $s() {
  return ($s = e(() => {
    Qs =
      /^P((\d+Y(\d+M(\d+D)?)?|\d+M(\d+D)?|\d+D)(T(\d+H(\d+M(\d+S)?)?|\d+M(\d+S)?|\d+S))?|T(\d+H(\d+M(\d+S)?)?|\d+M(\d+S)?|\d+S)|\d+W)$/;
  }))();
}
function ec(e) {
  return tc.test(e);
}
var tc;
function nc() {
  return (nc = e(() => {
    tc =
      /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[^"\\]|\\.)*")@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*|\[(?:IPv6:[a-f0-9:]+|(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(?:\.(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3})\])$/i;
  }))();
}
var rc, ic, ac, oc, sc, cc, lc, uc, dc, fc, pc, mc, hc, gc, _c, vc, yc, bc, xc, Sc, Cc, wc, Tc, Ec;
function Dc() {
  return (Dc = e(() => {
    ((rc = /^(?!-).*(?<!-)$/),
      (ic = /^(?!..--)/),
      (ac = /^[a-zA-Z0-9-]*$/),
      (oc = /[^\p{ASCII}]/u),
      (sc = /[0-9]/),
      (cc = /[\u{0660}-\u{0669}]/u),
      (lc = /[\u{06f0}-\u{06f9}]/u),
      (uc = /[\u{002e}\u{002c}\u{003a}\u{002f}]/u),
      (dc = /[\u{002d}\u{002b}]/u),
      (fc = /\p{Mn}/u),
      (pc = /\p{Mc}/u),
      (mc = /[\p{Mn}\p{Mc}\p{Me}]/u),
      (hc = /\p{L}/u),
      (gc = /\p{Nd}/u),
      (_c = /\p{Script=Greek}/u),
      (vc = /\p{Script=Hebrew}/u),
      (yc = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u),
      (bc = /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Mandaic}]/u),
      (xc =
        /[\u{094d}\u{09cd}\u{0a4d}\u{0acd}\u{0b4d}\u{0bcd}\u{0c4d}\u{0ccd}\u{0d3b}\u{0d3c}\u{0d4d}\u{0dca}\u{1b44}\u{1baa}\u{1bab}\u{a9c0}\u{11046}\u{1107f}\u{110b9}\u{11133}\u{11134}\u{111c0}\u{11235}\u{1134d}\u{11442}\u{114c2}\u{115bf}\u{1163f}\u{116b6}\u{11c3f}\u{11d44}\u{11d45}]/u),
      (Sc = /[\u{0640}\u{07fa}\u{302e}\u{302f}\u{3031}\u{3032}\u{3033}\u{3034}\u{3035}\u{303b}]/u),
      (Cc = /[\u{00b7}\u{0375}\u{05f3}\u{05f4}\u{200c}\u{200d}\u{30fb}]/u),
      (wc = /[\u{00df}\u{03c2}\u{06fd}\u{06fe}\u{0f0b}\u{3007}]/u),
      (Tc = new RegExp([sc, lc].map((e) => e.source).join(`|`), `u`)),
      (Ec = new RegExp([hc, dc, uc, gc, fc, pc, Cc, wc].map((e) => e.source).join(`|`), `u`)));
  }))();
}
function Oc(e) {
  return rc.test(e) && ic.test(e) && ac.test(e);
}
function kc() {
  return (kc = e(() => {
    Dc();
  }))();
}
function Ac() {
  throw null;
}
function jc(e) {
  return e.toLowerCase().startsWith(`xn--`);
}
function Mc(e, t, n) {
  ((e = n ? Math.floor(e / Bc) : e >> 1), (e += Math.floor(e / t)));
  let r = 0;
  for (; e > 455;) ((e = Math.floor(e / 35)), (r += Ic));
  return r + Math.floor((36 * e) / (e + zc));
}
function Nc(e) {
  let t = [],
    n = Hc,
    r = 0,
    i = Vc,
    a = e.lastIndexOf(`-`);
  if (a > 0)
    for (let n = 0; n < a; n++) {
      let r = e.charCodeAt(n);
      (r >= 128 && Ac(), t.push(r));
    }
  let o = a < 0 ? 0 : a + 1;
  for (; o < e.length;) {
    let a = r,
      s = 1,
      c = Ic;
    for (;;) {
      o >= e.length && Ac();
      let t = e.charCodeAt(o++),
        n;
      (t >= 97 && t <= 122 ? (n = t - 97) : t >= 48 && t <= 57 ? (n = t - 48 + 26) : Ac(),
        (r += n * s));
      let a = c <= i ? Lc : c >= i + Rc ? Rc : c - i;
      if (n < a) break;
      ((s *= Ic - a), (c += Ic));
    }
    let l = t.length + 1;
    ((i = Mc(r - a, l, a === 0)), (n += Math.floor(r / l)), (r %= l), t.splice(r, 0, n), r++);
  }
  return String.fromCodePoint(...t);
}
function Pc(e) {
  return e < 26 ? String.fromCharCode(e + 97) : String.fromCharCode(e - 26 + 48);
}
function Fc(e) {
  let t = e.replace(Uc, ``),
    n = t.length,
    r = n > 0 ? [t, `-`] : [],
    i = Array.from(e, (e) => e.codePointAt(0)),
    a = Hc,
    o = 0,
    s = Vc,
    c = n;
  for (; c < i.length;) {
    let e = 1 / 0;
    for (let t of i) t >= a && t < e && (e = t);
    ((o += (e - a) * (c + 1)), (a = e));
    for (let e of i)
      if ((e < a && o++, e === a)) {
        let e = o;
        for (let t = Ic; ; t += Ic) {
          let n = t <= s ? Lc : t >= s + Rc ? Rc : t - s;
          if (e < n) break;
          let i = n + ((e - n) % (Ic - n));
          (r.push(Pc(i)), (e = Math.floor((e - n) / (Ic - n))));
        }
        (r.push(Pc(e)), (s = Mc(o, c + 1, c === n)), (o = 0), c++);
      }
    (o++, a++);
  }
  return r.join(``);
}
var Ic, Lc, Rc, zc, Bc, Vc, Hc, Uc;
function Wc() {
  return (Wc = e(() => {
    (Dc(),
      (Ic = 36),
      (Lc = 1),
      (Rc = 26),
      (zc = 38),
      (Bc = 700),
      (Vc = 72),
      (Hc = 128),
      (Uc = new RegExp(oc.source, `gu`)));
  }))();
}
function Gc(e) {
  if (jc(e))
    try {
      return qc(Nc(e.slice(4).toLowerCase()));
    } catch {
      return !1;
    }
  return qc(e);
}
function Kc(e) {
  let t = String.fromCodePoint(e);
  return Tc.test(t)
    ? `EN`
    : cc.test(t)
      ? `AN`
      : fc.test(t)
        ? `NSM`
        : vc.test(t)
          ? `R`
          : bc.test(t)
            ? `AL`
            : hc.test(t)
              ? `L`
              : `ON`;
}
function qc(e) {
  for (let t of e) if (Zc.test(Kc(t.codePointAt(0)))) return !0;
  return !1;
}
function Jc(e) {
  let t = !1,
    n = Xc,
    r = !1,
    i = !1,
    a = !0;
  for (let o of e) {
    let e = Kc(o.codePointAt(0));
    if (a) {
      if (e !== `L` && e !== `R` && e !== `AL`) return !1;
      ((t = e === `R` || e === `AL`), (n = t ? Yc : Xc), (a = !1));
    }
    if (!n.test(e)) return !1;
    e === `EN` ? (r = !0) : e === `AN` && (i = !0);
  }
  return !(t && r && i);
}
var Yc, Xc, Zc;
function Qc() {
  return (Qc = e(() => {
    (Wc(),
      Dc(),
      (Yc = /^(?:R|AL|AN|EN|ES|CS|ET|ON|BN|NSM)$/),
      (Xc = /^(?:L|EN|ES|CS|ET|ON|BN|NSM)$/),
      (Zc = /^(?:R|AL|AN)$/));
  }))();
}
function $c(e) {
  return oc.test(e) && Fc(e).length + 4 > 63;
}
function el(e) {
  return e[0] === `-` || e[e.length - 1] === `-` || e.slice(2).join(``).startsWith(`--`);
}
function tl(e) {
  if ($c(e) || (qc(e) && !Jc(e))) return !1;
  let t = [...e],
    n = t.map((e) => e.codePointAt(0)),
    r = n.length;
  if (el(t) || mc.test(t[0])) return !1;
  let i = !1;
  for (let e = 0; e < r; e++) {
    let r = n[e],
      a = t[e];
    if (Sc.test(a) || !Ec.test(a)) return !1;
    yc.test(a) && (i = !0);
    let o = n[e - 1],
      s = n[e + 1];
    switch (r) {
      case 183:
        if (o !== 108 || s !== 108) return !1;
        break;
      case 885:
        if (!s || !_c.test(t[e + 1])) return !1;
        break;
      case 1523:
      case 1524:
        if (!o || !vc.test(t[e - 1])) return !1;
        break;
      case 8204:
        if (!o || (o < 128 && !xc.test(t[e - 1]))) return !1;
        break;
      case 8205:
        if (!o || !xc.test(t[e - 1])) return !1;
    }
  }
  return !(e.includes(`・`) && !i);
}
function nl() {
  return (nl = e(() => {
    (Dc(), Qc(), Wc());
  }))();
}
function rl(e) {
  if (!jc(e)) return !1;
  try {
    let t = e.slice(4).toLowerCase();
    if (t.lastIndexOf(`-`) === 0) return !1;
    let n = Nc(t);
    return oc.test(n) ? tl(n) : !1;
  } catch {
    return !1;
  }
}
function il() {
  return (il = e(() => {
    (Wc(), nl(), Dc());
  }))();
}
function al(e) {
  return e.length > 0 && e.length <= 63;
}
function ol(e) {
  return al(e) && (rl(e) || Oc(e));
}
function sl(e) {
  return e.length === 0 || e.length > 253 || e.charCodeAt(e.length - 1) === 46
    ? !1
    : e.split(`.`).every((e) => ol(e));
}
function cl() {
  return (cl = e(() => {
    (kc(), il());
  }))();
}
function ll(e) {
  return e.length > 0 && e.length <= 63;
}
function ul(e) {
  return ll(e) && (rl(e) || tl(e));
}
function dl(e) {
  return e.normalize(`NFC`).replace(/[\u002E\u3002\uFF0E\uFF61]/g, `.`);
}
function fl(e) {
  if (e.length === 0 || e.includes(` `)) return !1;
  let t = dl(e);
  if (t.length > 253) return !1;
  let n = t.split(`.`),
    r = n.some((e) => Gc(e));
  return n.every((e) => ul(e) && (!r || Jc(e)));
}
function pl() {
  return (pl = e(() => {
    (Qc(), nl(), il());
  }))();
}
function ml() {
  return (ml = e(() => {
    (cl(), pl());
  }))();
}
function hl(e) {
  return sl(e);
}
function gl() {
  return (gl = e(() => {
    ml();
  }))();
}
function _l(e) {
  return vl.test(e.normalize(`NFC`));
}
var vl;
function yl() {
  return (yl = e(() => {
    vl =
      /^(?:[A-Za-z0-9!#$%&'*+\/=?^_`{|}~\u{0080}-\u{10FFFF}-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~\u{0080}-\u{10FFFF}-]+)*|"(?:[^"\\]|\\.)*")@[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,62})(?<!-)(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,62})(?<!-))*$/iu;
  }))();
}
function bl(e) {
  return fl(e);
}
function xl() {
  return (xl = e(() => {
    ml();
  }))();
}
function Sl(e) {
  return Cl.test(e);
}
var Cl;
function wl() {
  return (wl = e(() => {
    Cl = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
  }))();
}
function Tl(e) {
  return El.test(e);
}
var El;
function Dl() {
  return (Dl = e(() => {
    El =
      /^(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:)?[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)$/i;
  }))();
}
function Ol(e) {
  return !kl.test(e) && !Al.test(e) && URL.canParse(e, `http://example.com`);
}
var kl, Al;
function jl() {
  return (jl = e(() => {
    ((kl = /[\x00-\x20\x7F\\]|%(?![0-9a-fA-F]{2})/), (Al = /^[a-zA-Z][a-zA-Z0-9+\-.]*\/\//));
  }))();
}
function Ml(e) {
  return e.length < Pl ? e.replace(Fl, `[::1]`) : e;
}
function Nl(e) {
  return !Il.test(e) && URL.canParse(Ml(e));
}
var Pl, Fl, Il;
function Ll() {
  return (Ll = e(() => {
    ((Pl = 2048), (Fl = /\[[vV][0-9a-fA-F]+\.[^\]]+\]/), (Il = /[\x00-\x20<>\^`{|}\\]/));
  }))();
}
function Rl(e) {
  return zl.test(e);
}
var zl;
function Bl() {
  return (Bl = e(() => {
    zl = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i;
  }))();
}
function Vl(e) {
  return Hl.test(e);
}
var Hl;
function Ul() {
  return (Ul = e(() => {
    Hl = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
  }))();
}
function Wl(e) {
  try {
    return (new RegExp(e, `u`), !0);
  } catch {
    return !1;
  }
}
function Gl(e) {
  return Kl.test(e);
}
var Kl;
function ql() {
  return (ql = e(() => {
    Kl = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;
  }))();
}
function Jl(e) {
  return Yl.test(e);
}
var Yl;
function Xl() {
  return (Xl = e(() => {
    Yl =
      /^(?:[a-z][a-z0-9+\-.]*:(?:\/\/(?:(?:[-a-z0-9._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:[\da-f]{1,4}:){6}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|::(?:[\da-f]{1,4}:){5}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:[\da-f]{1,4})?::(?:[\da-f]{1,4}:){4}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,1}[\da-f]{1,4})?::(?:[\da-f]{1,4}:){3}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,2}[\da-f]{1,4})?::(?:[\da-f]{1,4}:){2}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,3}[\da-f]{1,4})?::[\da-f]{1,4}:(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,4}[\da-f]{1,4})?::(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,5}[\da-f]{1,4})?::[\da-f]{1,4}|(?:(?:[\da-f]{1,4}:){0,6}[\da-f]{1,4})?::)|v[0-9a-f]+\.[-a-z0-9._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)|(?:[-a-z0-9._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:\/\/(?:(?:[-a-z0-9._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:[\da-f]{1,4}:){6}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|::(?:[\da-f]{1,4}:){5}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:[\da-f]{1,4})?::(?:[\da-f]{1,4}:){4}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,1}[\da-f]{1,4})?::(?:[\da-f]{1,4}:){3}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,2}[\da-f]{1,4})?::(?:[\da-f]{1,4}:){2}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,3}[\da-f]{1,4})?::[\da-f]{1,4}:(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,4}[\da-f]{1,4})?::(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,5}[\da-f]{1,4})?::[\da-f]{1,4}|(?:(?:[\da-f]{1,4}:){0,6}[\da-f]{1,4})?::)|v[0-9a-f]+\.[-a-z0-9._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)|(?:[-a-z0-9._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[-a-z0-9._~!$&'()*+,;=@]|%[0-9a-f]{2})+(?:\/(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?)(?:\?(?:[-a-z0-9._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[-a-z0-9._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  }))();
}
function Zl(e) {
  return Ql.test(e);
}
var Ql;
function $l() {
  return ($l = e(() => {
    Ql =
      /^(?:(?:[^\x00-\x20"<>%\\^`{|}\x7f]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?:\.(?:[a-z0-9_]|%[0-9a-f]{2})+)*(?::[1-9]\d{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?:\.(?:[a-z0-9_]|%[0-9a-f]{2})+)*(?::[1-9]\d{0,3}|\*)?)*\})*$/i;
  }))();
}
function eu(e) {
  return tu.test(e);
}
var tu;
function nu() {
  return (nu = e(() => {
    tu =
      /^[a-z][a-z0-9+\-.]*:(?:\/\/(?:(?:[-a-z0-9._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:[\da-f]{1,4}:){6}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|::(?:[\da-f]{1,4}:){5}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:[\da-f]{1,4})?::(?:[\da-f]{1,4}:){4}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,1}[\da-f]{1,4})?::(?:[\da-f]{1,4}:){3}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,2}[\da-f]{1,4})?::(?:[\da-f]{1,4}:){2}(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,3}[\da-f]{1,4})?::[\da-f]{1,4}:(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,4}[\da-f]{1,4})?::(?:[\da-f]{1,4}:[\da-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))|(?:(?:[\da-f]{1,4}:){0,5}[\da-f]{1,4})?::[\da-f]{1,4}|(?:(?:[\da-f]{1,4}:){0,6}[\da-f]{1,4})?::)|v[0-9a-f]+\.[-a-z0-9._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)|(?:[-a-z0-9._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[-a-z0-9._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[-a-z0-9._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[-a-z0-9._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  }))();
}
function ru(e) {
  return URL.canParse(e);
}
function iu(e) {
  return au.test(e);
}
var au;
function ou() {
  return (ou = e(() => {
    au = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  }))();
}
function su() {
  mu.clear();
}
function cu() {
  return [...mu.entries()];
}
function lu(e, t) {
  mu.set(e, t);
}
function uu(e) {
  return mu.has(e);
}
function du(e) {
  return mu.get(e);
}
function fu(e, t) {
  return mu.get(e)?.(t) ?? !0;
}
function pu() {
  (su(),
    mu.set(`date-time`, Ys),
    mu.set(`date`, Hs),
    mu.set(`duration`, Zs),
    mu.set(`email`, ec),
    mu.set(`hostname`, hl),
    mu.set(`idn-email`, _l),
    mu.set(`idn-hostname`, bl),
    mu.set(`ipv4`, Sl),
    mu.set(`ipv6`, Tl),
    mu.set(`iri-reference`, Ol),
    mu.set(`iri`, Nl),
    mu.set(`json-pointer-uri-fragment`, Rl),
    mu.set(`json-pointer`, Vl),
    mu.set(`regex`, Wl),
    mu.set(`relative-json-pointer`, Gl),
    mu.set(`time`, Ks),
    mu.set(`uri-reference`, Jl),
    mu.set(`uri-template`, Zl),
    mu.set(`uri`, eu),
    mu.set(`url`, ru),
    mu.set(`uuid`, iu));
}
var mu;
function hu() {
  return (hu = e(() => {
    (Xs(),
      Gs(),
      $s(),
      nc(),
      gl(),
      yl(),
      xl(),
      wl(),
      Dl(),
      jl(),
      Ll(),
      Bl(),
      Ul(),
      ql(),
      Js(),
      Xl(),
      $l(),
      nu(),
      ou(),
      (mu = new Map()),
      pu());
  }))();
}
var gu = t({
  Clear: () => su,
  Entries: () => cu,
  Get: () => du,
  Has: () => uu,
  IsDate: () => Hs,
  IsDateTime: () => Ys,
  IsDuration: () => Zs,
  IsEmail: () => ec,
  IsHostname: () => hl,
  IsIPv4: () => Sl,
  IsIPv6: () => Tl,
  IsIdnEmail: () => _l,
  IsIdnHostname: () => bl,
  IsIri: () => Nl,
  IsIriReference: () => Ol,
  IsJsonPointer: () => Vl,
  IsJsonPointerUriFragment: () => Rl,
  IsRegex: () => Wl,
  IsRelativeJsonPointer: () => Gl,
  IsTime: () => Ks,
  IsUri: () => eu,
  IsUriReference: () => Jl,
  IsUriTemplate: () => Zl,
  IsUrl: () => ru,
  IsUuid: () => iu,
  Reset: () => pu,
  Set: () => lu,
  Test: () => fu,
});
function _u() {
  return (_u = e(() => {
    (hu(),
      Xs(),
      Gs(),
      $s(),
      nc(),
      gl(),
      yl(),
      xl(),
      wl(),
      Dl(),
      jl(),
      Ll(),
      Bl(),
      Ul(),
      ql(),
      Js(),
      Xl(),
      $l(),
      nu(),
      ou());
  }))();
}
function vu() {
  return (vu = e(() => {
    _u();
  }))();
}
function yu(e, t, n, r) {
  return Ir(T(`Format`, `Test`), [E(n.format), r]);
}
function bu(e, t, n, r) {
  return fu(n.format, r);
}
function xu(e, t, n, r, i, a) {
  return (
    bu(e, t, i, a) ||
    t.AddError({ keyword: `format`, schemaPath: n, instancePath: r, params: { format: i.format } })
  );
}
function Su() {
  return (Su = e(() => {
    (vu(), D());
  }))();
}
function Cu(e, t, n, r) {
  let i = !Ua(n) || n.then,
    a = !Fi(n) || n.else;
  return Rr(Gp(e, t, n.if, r), Gp(e, t, i, r), Gp(e, t, a, r));
}
function wu(e, t, n, r) {
  let i = !Ua(n) || n.then,
    a = !Fi(n) || n.else;
  return qp(e, t, n.if, r) ? qp(e, t, i, r) : qp(e, t, a, r);
}
function Tu(e, t, n, r, i, a) {
  let o = !Ua(i) || i.then,
    s = !Fi(i) || i.else,
    c = new oo(),
    l = Yp(e, c, `${n}/if`, r, i.if, a)
      ? Yp(e, c, `${n}/then`, r, o, a) ||
        t.AddError({
          keyword: `if`,
          schemaPath: n,
          instancePath: r,
          params: { failingKeyword: `then` },
        })
      : Yp(e, t, `${n}/else`, r, s, a) ||
        t.AddError({
          keyword: `if`,
          schemaPath: n,
          instancePath: r,
          params: { failingKeyword: `else` },
        });
  return (l && t.Merge([c]), l);
}
function Eu() {
  return (Eu = e(() => {
    (Wa(), Ii(), so(), D(), Xp());
  }))();
}
function Du(e, t, n, r) {
  return Ur(
    n.items.map((n, i) =>
      ir(Sr(T(r, `length`), E(i)), rr(Wp(e, t, n, `${r}[${i}]`), t.AddIndex(E(i)))),
    ),
  );
}
function Ou(e, t, n, r) {
  return Ur(n.items.map((n, i) => ir(Sr(T(r, `length`), E(i)), Wp(e, t, n, `${r}[${i}]`))));
}
function ku(e, t, n, r) {
  return t.UseUnevaluated() ? Du(e, t, n, r) : Ou(e, t, n, r);
}
function Au(e, t, n, r) {
  return Hn(n.items, 0, (n, i) => Pn(r.length, i) || (Kp(e, t, n, r[i]) && t.AddIndex(i)));
}
function ju(e, t, n, r, i, a) {
  return Un(i.items, 0, (i, o) => {
    let s = `${n}/items/${o}`,
      c = `${r}/${o}`;
    return Pn(a.length, o) || (Jp(e, t, s, c, i, a[o]) && t.AddIndex(o));
  });
}
function Mu(e, t, n, r) {
  let i = Oa(n) ? n.prefixItems.length : 0,
    a = Wp(e, t, n.items, `element`),
    o = t.AddIndex(`index`);
  return Er(r, E(i), [`element`, `index`], rr(a, o));
}
function Nu(e, t, n, r) {
  let i = Oa(n) ? n.prefixItems.length : 0,
    a = Wp(e, t, n.items, `element`);
  return Er(r, E(i), [`element`, `index`], a);
}
function Pu(e, t, n, r) {
  return t.UseUnevaluated() ? Mu(e, t, n, r) : Nu(e, t, n, r);
}
function Fu(e, t, n, r) {
  return Hn(r, Oa(n) ? n.prefixItems.length : 0, (r, i) => Kp(e, t, n.items, r) && t.AddIndex(i));
}
function Iu(e, t, n, r, i, a) {
  return Un(
    a,
    Oa(i) ? i.prefixItems.length : 0,
    (a, o) => Jp(e, t, `${n}/items`, `${r}/${o}`, i.items, a) && t.AddIndex(o),
  );
}
function Lu(e, t, n, r) {
  return Xi(n) ? ku(e, t, n, r) : Pu(e, t, n, r);
}
function Ru(e, t, n, r) {
  return Xi(n) ? Au(e, t, n, r) : Fu(e, t, n, r);
}
function zu(e, t, n, r, i, a) {
  return Xi(i) ? ju(e, t, n, r, i, a) : Iu(e, t, n, r, i, a);
}
function Bu() {
  return (Bu = e(() => {
    (ka(), Zi(), D(), Xp());
  }))();
}
function Vu(e) {
  return xi(e);
}
function Hu(e, t, n, r) {
  if (!Vu(n)) return E(!0);
  let [i] = [vo()];
  return Sr(kr(r, [i, `_`], Gp(e, t, n.contains, i)), E(n.maxContains));
}
function Uu(e, t, n, r) {
  return (
    !Vu(n) ||
    Pn(
      Kn(r, (r) => qp(e, t, n.contains, r)),
      n.maxContains,
    )
  );
}
function Wu(e, t, n, r, i, a) {
  let o = ua(i) ? i.minContains : 1;
  return (
    Uu(e, t, i, a) ||
    t.AddError({
      keyword: `contains`,
      schemaPath: n,
      instancePath: r,
      params: { minContains: o, maxContains: i.maxContains },
    })
  );
}
function Gu() {
  return (Gu = e(() => {
    (Si(), da(), bo(), D(), Xp());
  }))();
}
function Ku(e, t, n, r) {
  return Sr(r, E(n.maximum));
}
function qu(e, t, n, r) {
  return Pn(r, n.maximum);
}
function Ju(e, t, n, r, i, a) {
  return (
    qu(e, t, i, a) ||
    t.AddError({
      keyword: `maximum`,
      schemaPath: n,
      instancePath: r,
      params: { comparison: `<=`, limit: i.maximum },
    })
  );
}
function Yu() {
  return (Yu = e(() => {
    D();
  }))();
}
function Xu(e, t, n, r) {
  return Sr(T(r, `length`), E(n.maxItems));
}
function Zu(e, t, n, r) {
  return Pn(r.length, n.maxItems);
}
function Qu(e, t, n, r, i, a) {
  return (
    Zu(e, t, i, a) ||
    t.AddError({
      keyword: `maxItems`,
      schemaPath: n,
      instancePath: r,
      params: { limit: i.maxItems },
    })
  );
}
function $u() {
  return ($u = e(() => {
    D();
  }))();
}
function ed(e, t, n, r) {
  return Tr(r, E(n.maxLength));
}
function td(e, t, n, r) {
  return Bn(r, n.maxLength);
}
function nd(e, t, n, r, i, a) {
  return (
    td(e, t, i, a) ||
    t.AddError({
      keyword: `maxLength`,
      schemaPath: n,
      instancePath: r,
      params: { limit: i.maxLength },
    })
  );
}
function rd() {
  return (rd = e(() => {
    D();
  }))();
}
function id(e, t, n, r) {
  return Sr(T(jr(r), `length`), E(n.maxProperties));
}
function ad(e, t, n, r) {
  return Pn(w(r).length, n.maxProperties);
}
function od(e, t, n, r, i, a) {
  return (
    ad(e, t, i, a) ||
    t.AddError({
      keyword: `maxProperties`,
      schemaPath: n,
      instancePath: r,
      params: { limit: i.maxProperties },
    })
  );
}
function sd() {
  return (sd = e(() => {
    D();
  }))();
}
function cd(e) {
  return xi(e);
}
function ld(e, t, n, r) {
  let [i, a] = [vo(), vo()];
  return Cr(kr(r, [i, a], rr(Gp(e, t, n.contains, i), t.AddIndex(a))), E(n.minContains));
}
function ud(e, t, n, r) {
  let [i] = [vo()];
  return Cr(kr(r, [i, `_`], Gp(e, t, n.contains, i)), E(n.minContains));
}
function dd(e, t, n, r) {
  return cd(n) ? (t.UseUnevaluated() ? ld(e, t, n, r) : ud(e, t, n, r)) : E(!0);
}
function fd(e, t, n, r) {
  return (
    !cd(n) ||
    Fn(
      Kn(r, (r, i) => qp(e, t, n.contains, r) && t.AddIndex(i)),
      n.minContains,
    )
  );
}
function pd(e, t, n, r, i, a) {
  return (
    fd(e, t, i, a) ||
    t.AddError({
      keyword: `contains`,
      schemaPath: n,
      instancePath: r,
      params: { minContains: i.minContains },
    })
  );
}
function md() {
  return (md = e(() => {
    (Si(), bo(), D(), Xp());
  }))();
}
function hd(e, t, n, r) {
  return Cr(r, E(n.minimum));
}
function gd(e, t, n, r) {
  return Fn(r, n.minimum);
}
function _d(e, t, n, r, i, a) {
  return (
    gd(e, t, i, a) ||
    t.AddError({
      keyword: `minimum`,
      schemaPath: n,
      instancePath: r,
      params: { comparison: `>=`, limit: i.minimum },
    })
  );
}
function vd() {
  return (vd = e(() => {
    D();
  }))();
}
function yd(e, t, n, r) {
  return Cr(T(r, `length`), E(n.minItems));
}
function bd(e, t, n, r) {
  return Fn(r.length, n.minItems);
}
function xd(e, t, n, r, i, a) {
  return (
    bd(e, t, i, a) ||
    t.AddError({
      keyword: `minItems`,
      schemaPath: n,
      instancePath: r,
      params: { limit: i.minItems },
    })
  );
}
function Sd() {
  return (Sd = e(() => {
    D();
  }))();
}
function Cd(e, t, n, r) {
  return wr(r, E(n.minLength));
}
function wd(e, t, n, r) {
  return Vn(r, n.minLength);
}
function Td(e, t, n, r, i, a) {
  return (
    wd(e, t, i, a) ||
    t.AddError({
      keyword: `minLength`,
      schemaPath: n,
      instancePath: r,
      params: { limit: i.minLength },
    })
  );
}
function Ed() {
  return (Ed = e(() => {
    D();
  }))();
}
function Dd(e, t, n, r) {
  return Cr(T(jr(r), `length`), E(n.minProperties));
}
function Od(e, t, n, r) {
  return Fn(w(r).length, n.minProperties);
}
function kd(e, t, n, r, i, a) {
  return (
    Od(e, t, i, a) ||
    t.AddError({
      keyword: `minProperties`,
      schemaPath: n,
      instancePath: r,
      params: { limit: i.minProperties },
    })
  );
}
function Ad() {
  return (Ad = e(() => {
    D();
  }))();
}
function jd(e, t, n, r) {
  return Gr(r, E(n.multipleOf));
}
function Md(e, t, n, r) {
  return In(r, n.multipleOf);
}
function Nd(e, t, n, r, i, a) {
  return (
    Md(e, t, i, a) ||
    t.AddError({
      keyword: `multipleOf`,
      schemaPath: n,
      instancePath: r,
      params: { multipleOf: i.multipleOf },
    })
  );
}
function Pd() {
  return (Pd = e(() => {
    D();
  }))();
}
function Fd(e, t, n, r) {
  return Ro(e, t, [n.not], r, ar(yr(T(`results`, `length`), E(1))));
}
function Id(e, t, n, r) {
  return ar(Gp(e, t, n.not, r));
}
function Ld(e, t, n, r) {
  return t.UseUnevaluated() ? Fd(e, t, n, r) : Id(e, t, n, r);
}
function Rd(e, t, n, r) {
  let i = new io();
  return !qp(e, i, n.not, r) && t.Merge([i]);
}
function zd(e, t, n, r, i, a) {
  return (
    Rd(e, t, i, a) || t.AddError({ keyword: `not`, schemaPath: n, instancePath: r, params: {} })
  );
}
function Bd() {
  return (Bd = e(() => {
    (so(), zo(), D(), Xp());
  }))();
}
function Vd(e, t, n, r) {
  return Ro(e, t, n.oneOf, r, yr(T(`results`, `length`), E(1)));
}
function Hd(e, t, n, r) {
  let [i] = [vo()];
  return yr(kr(Pr(n.oneOf.map((n) => Gp(e, t, n, r))), [i, `_`], yr(i, E(!0))), E(1));
}
function Ud(e, t, n, r) {
  return t.UseUnevaluated() ? Vd(e, t, n, r) : Hd(e, t, n, r);
}
function Wd(e, t, n, r) {
  let i = n.oneOf.reduce((t, n) => {
    let i = new io();
    return qp(e, i, n, r) ? [...t, i] : t;
  }, []);
  return x(i.length, 1) && t.Merge(i);
}
function Gd(e, t, n, r, i, a) {
  let o = [],
    s = [],
    c = i.oneOf.reduce((t, i, c) => {
      let l = new oo(),
        u = Yp(e, l, `${n}/oneOf/${c}`, r, i, a);
      return (u && s.push(c), u || o.push(l), u ? [...t, l] : t);
    }, []),
    l = x(c.length, 1) && t.Merge(c);
  return (
    !l && x(s.length, 0) && o.forEach((e) => e.GetErrors().forEach((e) => t.AddError(e))),
    l ||
      t.AddError({
        keyword: `oneOf`,
        schemaPath: n,
        instancePath: r,
        params: { passingSchemas: s },
      })
  );
}
function Kd() {
  return (Kd = e(() => {
    (so(), zo(), D(), Xp(), bo());
  }))();
}
function qd(e, t, n, r) {
  return Ir(T(co(b(n.pattern) ? Oo(n.pattern) : n.pattern), `test`), [r]);
}
function Jd(e, t, n, r) {
  return (b(n.pattern) ? Oo(n.pattern) : n.pattern).test(r);
}
function Yd(e, t, n, r, i, a) {
  return (
    Jd(e, t, i, a) ||
    t.AddError({
      keyword: `pattern`,
      schemaPath: n,
      instancePath: r,
      params: { pattern: i.pattern },
    })
  );
}
function Xd() {
  return (Xd = e(() => {
    (po(), D());
  }))();
}
function Zd(e, t, n, r) {
  return Ur(
    Yn(n.patternProperties).map(([n, i]) => {
      let [a, o] = [vo(), vo()],
        s = ar(Ir(T(co(Oo(n)), `test`), [a])),
        c = Wp(e, t, i, o),
        l = t.AddKey(a),
        u = t.UseUnevaluated() ? ir(s, rr(c, l)) : ir(s, c);
      return Er(Ar(r), E(0), [`[${a}, ${o}]`, `_`], u);
    }),
  );
}
function Qd(e, t, n, r) {
  return Hn(Yn(n.patternProperties), 0, ([n, i]) => {
    let a = Oo(n);
    return Hn(Yn(r), 0, ([n, r]) => !a.test(n) || (Kp(e, t, i, r) && t.AddKey(n)));
  });
}
function $d(e, t, n, r, i, a) {
  return Un(Yn(i.patternProperties), 0, ([i, o]) => {
    let s = `${n}/patternProperties/${i}`,
      c = Oo(i);
    return Un(Yn(a), 0, ([n, i]) => {
      let a = `${r}/${n}`;
      return !c.test(n) || (Jp(e, t, s, a, o, i) && t.AddKey(n));
    });
  });
}
function ef() {
  return (ef = e(() => {
    (po(), bo(), D(), Xp());
  }))();
}
function tf(e, t, n, r) {
  return Ur(
    n.prefixItems.map((n, i) => {
      let a = Sr(T(r, `length`), E(i)),
        o = Wp(e, t, n, `${r}[${i}]`),
        s = t.AddIndex(E(i));
      return ir(a, t.UseUnevaluated() ? rr(o, s) : o);
    }),
  );
}
function nf(e, t, n, r) {
  return (
    x(r.length, 0) ||
    Hn(n.prefixItems, 0, (n, i) => Pn(r.length, i) || (Kp(e, t, n, r[i]) && t.AddIndex(i)))
  );
}
function rf(e, t, n, r, i, a) {
  return (
    x(a.length, 0) ||
    Un(i.prefixItems, 0, (i, o) => {
      let s = `${n}/prefixItems/${o}`,
        c = `${r}/${o}`;
      return Pn(a.length, o) || (Jp(e, t, s, c, i, a[o]) && t.AddIndex(o));
    })
  );
}
function af() {
  return (af = e(() => {
    (D(), Xp());
  }))();
}
function of() {
  return sf;
}
var sf;
function cf() {
  return (cf = e(() => {
    sf = {
      immutableTypes: !1,
      maxErrors: 8,
      maxInstantiationCount: 128,
      useAcceleration: !0,
      exactOptionalPropertyTypes: !1,
      enumerableKind: !1,
      correctiveParse: !1,
      unionPrioritySort: !0,
    };
  }))();
}
function lf(e, t) {
  return e.includes(t) || of().exactOptionalPropertyTypes;
}
function uf(e, t) {
  return gr(T(e, t));
}
function df(e, t) {
  return jn(e[t]);
}
function ff() {
  return (ff = e(() => {
    (cf(), D());
  }))();
}
function pf(e, t, n, r) {
  let i = Va(n) ? n.required : [];
  return Ur(
    Yn(n.properties).map(([n, a]) => {
      let o = ar(Mr(r, E(n))),
        s = Wp(e, t, a, T(r, n)),
        c = t.AddKey(E(n)),
        l = t.UseUnevaluated() ? rr(s, c) : s,
        u = i.includes(n) ? l : ir(o, l);
      return lf(i, n) ? u : ir(uf(r, n), u);
    }),
  );
}
function mf(e, t, n, r) {
  let i = Va(n) ? n.required : [];
  return Hn(Yn(n.properties), 0, ([n, a]) => {
    let o = !C(r, n) || (Kp(e, t, a, r[n]) && t.AddKey(n));
    return lf(i, n) ? o : df(r, n) || o;
  });
}
function hf(e, t, n, r, i, a) {
  let o = Va(i) ? i.required : [];
  return Un(Yn(i.properties), 0, ([i, s]) => {
    let c = `${n}/properties/${i}`,
      l = `${r}/${i}`,
      u = () => !C(a, i) || (Jp(e, t, c, l, s, a[i]) && t.AddKey(i));
    return lf(o, i) ? u() : df(a, i) || u();
  });
}
function gf() {
  return (gf = e(() => {
    (Ha(), D(), Xp(), ff());
  }))();
}
function _f(e, t, n, r) {
  let [i, a] = [vo(), vo()];
  return Er(jr(r), E(0), [i, a], Gp(e, t, n.propertyNames, i));
}
function vf(e, t, n, r) {
  return Hn(w(r), 0, (r, i) => qp(e, t, n.propertyNames, r));
}
function yf(e, t, n, r, i, a) {
  let o = [];
  return (
    Un(w(a), 0, (t, a) => {
      let s = `${r}/${t}`,
        c = `${n}/propertyNames`,
        l = Yp(e, new oo(), c, s, i.propertyNames, t);
      return (l || o.push(t), l);
    }) ||
    t.AddError({
      keyword: `propertyNames`,
      schemaPath: n,
      instancePath: r,
      params: { propertyNames: o },
    })
  );
}
function bf() {
  return (bf = e(() => {
    (bo(), so(), D(), Xp());
  }))();
}
function xf(e, t, n, r) {
  return rm(e, t, e.RecursiveRef(n) ?? !1, r);
}
function Sf(e, t, n, r) {
  let i = e.RecursiveRef(n) ?? !1;
  return si(i) && qp(e, t, i, r);
}
function Cf(e, t, n, r, i, a) {
  let o = e.RecursiveRef(i) ?? !1;
  return si(o) && Yp(e, t, `#`, r, o, a);
}
function wf() {
  return (wf = e(() => {
    (sm(), ci(), Xp());
  }))();
}
function Tf(e, t, n, r) {
  let i = Fr([`context`, `value`], rm(e, t, n, `value`));
  return Ir(
    Fr(
      [`context`, `value`],
      zr([
        Br(`nextContext`, Lr(`CheckContext`, [])),
        Br(`result`, Ir(i, [`nextContext`, `value`])),
        Vr(`result`, t.Merge(`[nextContext]`)),
        Hr(`result`),
      ]),
    ),
    [`context`, r],
  );
}
function Ef(e, t, n, r) {
  return rm(e, t, n, r);
}
function Df(e, t, n, r) {
  let i = e.Ref(n) ?? !1;
  return t.UseUnevaluated() ? Tf(e, t, i, r) : Ef(e, t, i, r);
}
function Of(e, t, n, r) {
  let i = e.Ref(n) ?? !1,
    a = new io(),
    o = si(i) && qp(e, a, i, r);
  return (o && t.Merge([a]), o);
}
function kf(e, t, n, r, i, a) {
  let o = e.Ref(i) ?? !1,
    s = new oo(),
    c = si(o) && Yp(e, s, `#`, r, o, a);
  return (c && t.Merge([s]), c || s.GetErrors().forEach((e) => t.AddError(e)), c);
}
function Af() {
  return (Af = e(() => {
    (sm(), ci(), so(), D(), Xp());
  }))();
}
function jf(e, t, n, r) {
  return Ur(n.required.map((e) => Mr(r, E(e))));
}
function Mf(e, t, n, r) {
  return Hn(n.required, 0, (e) => C(r, e));
}
function Nf(e, t, n, r, i, a) {
  let o = [];
  return (
    Un(i.required, 0, (e) => {
      let t = C(a, e);
      return (t || o.push(e), t);
    }) ||
    t.AddError({
      keyword: `required`,
      schemaPath: n,
      instancePath: r,
      params: { requiredProperties: o },
    })
  );
}
function Pf() {
  return (Pf = e(() => {
    D();
  }))();
}
function Ff(e, t, n, r) {
  return x(n, `object`)
    ? fr(r)
    : x(n, `array`)
      ? or(r)
      : x(n, `boolean`)
        ? cr(r)
        : x(n, `integer`)
          ? lr(r)
          : x(n, `number`)
            ? dr(r)
            : x(n, `null`)
              ? ur(r)
              : x(n, `string`)
                ? mr(r)
                : x(n, `bigint`)
                  ? sr(r)
                  : x(n, `constructor`)
                    ? vr(r)
                    : x(n, `function`)
                      ? _r(r)
                      : x(n, `symbol`)
                        ? hr(r)
                        : x(n, `undefined`) || x(n, `void`)
                          ? gr(r)
                          : E(!0);
}
function If(e, t, n, r, i) {
  return x(n, `object`)
    ? kn(i)
    : x(n, `array`)
      ? v(i)
      : x(n, `boolean`)
        ? Cn(i)
        : x(n, `integer`)
          ? En(i)
          : x(n, `number`)
            ? On(i)
            : x(n, `null`)
              ? Dn(i)
              : x(n, `string`)
                ? b(i)
                : x(n, `bigint`)
                  ? Sn(i)
                  : x(n, `constructor`)
                    ? wn(i)
                    : x(n, `function`)
                      ? Tn(i)
                      : x(n, `symbol`)
                        ? An(i)
                        : x(n, `undefined`)
                          ? jn(i)
                          : !x(n, `void`) || jn(i);
}
function Lf(e, t, n, r) {
  return Wr(n.map((n) => Ff(e, t, n, r)));
}
function Rf(e, t, n, r, i) {
  return Wn(n, (n) => If(e, t, n, r, i));
}
function zf(e, t, n, r) {
  return v(n.type) ? Lf(e, t, n.type, r) : Ff(e, t, n.type, r);
}
function Bf(e, t, n, r) {
  return v(n.type) ? Rf(e, t, n.type, n, r) : If(e, t, n.type, n, r);
}
function Vf(e, t, n, r, i, a) {
  return (
    (v(i.type) ? Rf(e, t, i.type, i, a) : If(e, t, i.type, i, a)) ||
    t.AddError({ keyword: `type`, schemaPath: n, instancePath: r, params: { type: i.type } })
  );
}
function Hf() {
  return (Hf = e(() => {
    D();
  }))();
}
function Uf(e, t, n, r) {
  let [i, a] = [vo(), vo()],
    o = Ir(T(`context`, `GetIndices`), []),
    s = Ir(T(`indices`, `has`), [i]),
    c = Gp(e, t, n.unevaluatedItems, a),
    l = Ir(T(`context`, `AddIndex`), [i]),
    u = Er(r, E(0), [a, i], rr(ir(s, c), l));
  return Ir(Fr([`context`], zr([Br(`indices`, o), Hr(u)])), [`context`]);
}
function Wf(e, t, n, r) {
  let i = t.GetIndices();
  return Hn(r, 0, (r, a) => (i.has(a) || qp(e, t, n.unevaluatedItems, r)) && t.AddIndex(a));
}
function Gf(e, t, n, r, i, a) {
  let o = t.GetIndices(),
    s = [];
  return (
    Un(a, 0, (a, c) => {
      let l = new oo(),
        u = (o.has(c) || Yp(e, l, n, r, i.unevaluatedItems, a)) && t.AddIndex(c);
      return (u || s.push(c), u);
    }) ||
    t.AddError({
      keyword: `unevaluatedItems`,
      schemaPath: n,
      instancePath: r,
      params: { unevaluatedItems: s },
    })
  );
}
function Kf() {
  return (Kf = e(() => {
    (bo(), so(), D(), Xp());
  }))();
}
function qf(e, t, n, r) {
  let [i, a] = [vo(), vo()],
    o = Ir(T(`context`, `GetKeys`), []),
    s = Ir(T(`keys`, `has`), [i]),
    c = Ir(T(`context`, `AddKey`), [i]),
    l = Gp(e, t, n.unevaluatedProperties, a),
    u = Er(Ar(r), E(0), [`[${i}, ${a}]`, `_`], ir(s, rr(l, c)));
  return Ir(Fr([`context`], zr([Br(`keys`, o), Hr(u)])), [`context`]);
}
function Jf(e, t, n, r) {
  let i = t.GetKeys();
  return Hn(
    Yn(r),
    0,
    ([r, a]) => i.has(r) || (qp(e, t, n.unevaluatedProperties, a) && t.AddKey(r)),
  );
}
function Yf(e, t, n, r, i, a) {
  let o = t.GetKeys(),
    s = [];
  return (
    Un(Yn(a), 0, ([a, c]) => {
      let l = new oo(),
        u = o.has(a) || (Yp(e, l, n, r, i.unevaluatedProperties, c) && t.AddKey(a));
      return (u || s.push(a), u);
    }) ||
    t.AddError({
      keyword: `unevaluatedProperties`,
      schemaPath: n,
      instancePath: r,
      params: { unevaluatedProperties: s },
    })
  );
}
function Xf() {
  return (Xf = e(() => {
    (bo(), so(), D(), Xp());
  }))();
}
function Zf() {
  throw Error(`Unreachable`);
}
var Qf = t({ Hash: () => vp, HashCode: () => _p });
function $f(e) {
  let t = new Set(),
    n = e;
  for (; n && n !== Object.prototype;) {
    for (let e of Reflect.ownKeys(n)) e !== `constructor` && typeof e != `symbol` && t.add(e);
    n = Object.getPrototypeOf(n);
  }
  return [...t];
}
function ep(e) {
  return typeof e == `number`;
}
function tp(e) {
  ((bp ^= Cp[e]), (bp = (bp * xp) % Sp));
}
function np(e) {
  tp(yp.Array);
  for (let t of e) gp(t);
}
function rp(e) {
  (tp(yp.BigInt), Tp.setBigInt64(0, e));
  for (let e of Ep) tp(e);
}
function ip(e) {
  (tp(yp.Boolean), tp(+!!e));
}
function ap(e) {
  (tp(yp.Constructor), gp(e.toString()));
}
function op(e) {
  (tp(yp.Date), gp(e.getTime()));
}
function sp(e) {
  (tp(yp.Function), gp(e.toString()));
}
function cp(e) {
  tp(yp.Null);
}
function lp(e) {
  (tp(yp.Number), Tp.setFloat64(0, e, !0));
  for (let e of Ep) tp(e);
}
function up(e) {
  tp(yp.Object);
  for (let t of $f(e).sort()) (gp(t), gp(e[t]));
}
function dp(e) {
  (tp(yp.RegExp), fp(e.toString()));
}
function fp(e) {
  tp(yp.String);
  for (let t of Dp.encode(e)) tp(t);
}
function pp(e) {
  (tp(yp.Symbol), gp(e.toString()));
}
function mp(e) {
  tp(yp.TypeArray);
  let t = new Uint8Array(e.buffer);
  for (let e = 0; e < t.length; e++) tp(t[e]);
}
function hp(e) {
  return tp(yp.Undefined);
}
function gp(e) {
  return Zr(e)
    ? mp(e)
    : $r(e)
      ? op(e)
      : Qr(e)
        ? dp(e)
        : Jr(e)
          ? ip(e.valueOf())
          : Xr(e)
            ? fp(e.valueOf())
            : Yr(e)
              ? lp(e.valueOf())
              : ep(e)
                ? lp(e)
                : v(e)
                  ? np(e)
                  : Cn(e)
                    ? ip(e)
                    : Sn(e)
                      ? rp(e)
                      : wn(e)
                        ? ap(e)
                        : Dn(e)
                          ? cp(e)
                          : y(e)
                            ? up(e)
                            : b(e)
                              ? fp(e)
                              : An(e)
                                ? pp(e)
                                : jn(e)
                                  ? hp(e)
                                  : Tn(e)
                                    ? sp(e)
                                    : Zf();
}
function _p(e) {
  return ((bp = BigInt(`14695981039346656037`)), gp(e), bp);
}
function vp(e) {
  return _p(e).toString(16).padStart(16, `0`);
}
var yp, bp, xp, Sp, Cp, wp, Tp, Ep, Dp;
function Op() {
  return (Op = e(() => {
    (D(),
      (function (e) {
        ((e[(e.Array = 0)] = `Array`),
          (e[(e.BigInt = 1)] = `BigInt`),
          (e[(e.Boolean = 2)] = `Boolean`),
          (e[(e.Date = 3)] = `Date`),
          (e[(e.Constructor = 4)] = `Constructor`),
          (e[(e.Function = 5)] = `Function`),
          (e[(e.Null = 6)] = `Null`),
          (e[(e.Number = 7)] = `Number`),
          (e[(e.Object = 8)] = `Object`),
          (e[(e.RegExp = 9)] = `RegExp`),
          (e[(e.String = 10)] = `String`),
          (e[(e.Symbol = 11)] = `Symbol`),
          (e[(e.TypeArray = 12)] = `TypeArray`),
          (e[(e.Undefined = 13)] = `Undefined`));
      })((yp ||= {})),
      (bp = BigInt(`14695981039346656037`)),
      ([xp, Sp] = [BigInt(`1099511628211`), BigInt(`18446744073709551616`)]),
      (Cp = Array.from({ length: 256 }).map((e, t) => BigInt(t))),
      (wp = new Float64Array(1)),
      (Tp = new DataView(wp.buffer)),
      (Ep = new Uint8Array(wp.buffer)),
      (Dp = new TextEncoder()));
  }))();
}
function kp() {
  return (kp = e(() => {
    Op();
  }))();
}
function Ap(e) {
  return !x(e.uniqueItems, !1);
}
function jp(e, t, n, r) {
  return Ap(n)
    ? yr(T(Lr(`Set`, [Ir(T(r, `map`), [T(`Hashing`, `Hash`)])]), `size`), T(r, `length`))
    : E(!0);
}
function Mp(e, t, n, r) {
  if (!Ap(n)) return !0;
  let i = new Set(r.map(vp)).size,
    a = r.length;
  return x(i, a);
}
function Np(e, t, n, r, i, a) {
  if (!Ap(i)) return !0;
  let o = new Set(),
    s = a.reduce((e, t, n) => {
      let r = vp(t);
      return o.has(r) ? [...e, n] : (o.add(r), e);
    }, []);
  return (
    x(s.length, 0) ||
    t.AddError({
      keyword: `uniqueItems`,
      schemaPath: n,
      instancePath: r,
      params: { duplicateItems: s },
    })
  );
}
function Pp() {
  return (Pp = e(() => {
    (kp(), D());
  }))();
}
function Fp(e, t) {
  return (
    Ga(e) && ((v(e.type) && Mn(e.type.length, 0) && Hn(e.type, 0, (e) => x(e, t))) || x(e.type, t))
  );
}
function Ip(e) {
  return Fp(e, `object`);
}
function Lp(e) {
  return (
    ai(e) &&
    (di(e) ||
      Ti(e) ||
      Di(e) ||
      ki(e) ||
      Aa(e) ||
      Ea(e) ||
      Ma(e) ||
      ga(e) ||
      oa(e) ||
      Va(e) ||
      Za(e))
  );
}
function Rp(e) {
  return Fp(e, `array`);
}
function zp(e) {
  return (
    ai(e) &&
    (li(e) || Yi(e) || xi(e) || ea(e) || na(e) || ua(e) || fa(e) || Oa(e) || Ya(e) || qa(e))
  );
}
function Bp(e) {
  return Fp(e, `string`);
}
function Vp(e) {
  return ai(e) && (ma(e) || ia(e) || Ui(e) || wa(e));
}
function Hp(e) {
  return Fp(e, `number`) || Fp(e, `bigint`);
}
function Up(e) {
  return ai(e) && (ca(e) || Qi(e) || zi(e) || Vi(e) || va(e));
}
function Wp(e, t, n, r) {
  return t.UseUnevaluated() ? rr(rr(t.Push(), Gp(e, t, n, r)), t.Pop()) : Gp(e, t, n, r);
}
function Gp(e, t, n, r) {
  e.Push(n);
  let i = [];
  if (oi(n)) return Qo(e, t, n, r);
  if ((Ga(n) && i.push(zf(e, t, n, r)), Lp(n))) {
    let a = [];
    (Va(n) && a.push(jf(e, t, n, r)),
      di(n) && a.push(Po(e, t, n, r)),
      Ti(n) && a.push(ps(e, t, n, r)),
      Di(n) && a.push(_s(e, t, n, r)),
      ki(n) && a.push(xs(e, t, n, r)),
      Ea(n) && a.push(Zd(e, t, n, r)),
      Aa(n) && a.push(pf(e, t, n, r)),
      Ma(n) && a.push(_f(e, t, n, r)),
      ga(n) && a.push(Dd(e, t, n, r)),
      oa(n) && a.push(id(e, t, n, r)));
    let o = Ur(a),
      s = ir(ar(fr(r)), o);
    i.push(Ip(n) ? o : s);
  }
  if (zp(n)) {
    let a = [];
    (li(n) && a.push(wo(e, t, n, r)),
      xi(n) && a.push(ls(e, t, n, r)),
      Yi(n) && a.push(Lu(e, t, n, r)),
      ea(n) && a.push(Hu(e, t, n, r)),
      na(n) && a.push(Xu(e, t, n, r)),
      ua(n) && a.push(dd(e, t, n, r)),
      fa(n) && a.push(yd(e, t, n, r)),
      Oa(n) && a.push(tf(e, t, n, r)),
      qa(n) && a.push(jp(e, t, n, r)));
    let o = Ur(a),
      s = ir(ar(or(r)), o);
    i.push(Rp(n) ? o : s);
  }
  if (Vp(n)) {
    let a = [];
    (ia(n) && a.push(ed(e, t, n, r)),
      ma(n) && a.push(Cd(e, t, n, r)),
      Ui(n) && a.push(yu(e, t, n, r)),
      wa(n) && a.push(qd(e, t, n, r)));
    let o = Ur(a),
      s = ir(ar(mr(r)), o);
    i.push(Bp(n) ? o : s);
  }
  if (Up(n)) {
    let a = [];
    (zi(n) && a.push(Ns(e, t, n, r)),
      Vi(n) && a.push(Ls(e, t, n, r)),
      Qi(n) && a.push(Ku(e, t, n, r)),
      ca(n) && a.push(hd(e, t, n, r)),
      va(n) && a.push(jd(e, t, n, r)));
    let o = Ur(a),
      s = ir(ar(ir(dr(r), sr(r))), o);
    i.push(Hp(n) ? o : s);
  }
  (za(n) && i.push(Df(e, t, n, r)),
    La(n) && i.push(xf(e, t, n, r)),
    Ni(n) && i.push(Ts(e, t, n, r)),
    yi(n) && i.push(ns(e, t, n, r)),
    Li(n) && i.push(ks(e, t, n, r)),
    qi(n) && i.push(Cu(e, t, n, r)),
    ba(n) && i.push(Ld(e, t, n, r)),
    pi(n) && i.push(Ho(e, t, n, r)),
    _i(n) && i.push(Jo(e, t, n, r)),
    Sa(n) && i.push(Ud(e, t, n, r)),
    Ya(n) && i.push(ir(ar(or(r)), Uf(e, t, n, r))),
    Za(n) && i.push(ir(ar(pr(r)), qf(e, t, n, r))),
    ri(n) && i.push(mo(e, t, n, r)));
  let a = Ur(i);
  return (e.Pop(n), a);
}
function Kp(e, t, n, r) {
  return t.Push() && qp(e, t, n, r) && t.Pop();
}
function qp(e, t, n, r) {
  e.Push(n);
  let i = oi(n)
    ? $o(e, t, n, r)
    : (!Ga(n) || Bf(e, t, n, r)) &&
      (!(y(r) && !v(r)) ||
        ((!Va(n) || Mf(e, t, n, r)) &&
          (!di(n) || Fo(e, t, n, r)) &&
          (!Ti(n) || ms(e, t, n, r)) &&
          (!Di(n) || vs(e, t, n, r)) &&
          (!ki(n) || Ss(e, t, n, r)) &&
          (!Ea(n) || Qd(e, t, n, r)) &&
          (!Aa(n) || mf(e, t, n, r)) &&
          (!Ma(n) || vf(e, t, n, r)) &&
          (!ga(n) || Od(e, t, n, r)) &&
          (!oa(n) || ad(e, t, n, r)))) &&
      (!v(r) ||
        ((!li(n) || To(e, t, n, r)) &&
          (!xi(n) || us(e, t, n, r)) &&
          (!Yi(n) || Ru(e, t, n, r)) &&
          (!ea(n) || Uu(e, t, n, r)) &&
          (!na(n) || Zu(e, t, n, r)) &&
          (!ua(n) || fd(e, t, n, r)) &&
          (!fa(n) || bd(e, t, n, r)) &&
          (!Oa(n) || nf(e, t, n, r)) &&
          (!qa(n) || Mp(e, t, n, r)))) &&
      (!b(r) ||
        ((!ia(n) || td(e, t, n, r)) &&
          (!ma(n) || wd(e, t, n, r)) &&
          (!Ui(n) || bu(e, t, n, r)) &&
          (!wa(n) || Jd(e, t, n, r)))) &&
      (!(On(r) || Sn(r)) ||
        ((!zi(n) || Ps(e, t, n, r)) &&
          (!Vi(n) || Rs(e, t, n, r)) &&
          (!Qi(n) || qu(e, t, n, r)) &&
          (!ca(n) || gd(e, t, n, r)) &&
          (!va(n) || Md(e, t, n, r)))) &&
      (!za(n) || Of(e, t, n, r)) &&
      (!La(n) || Sf(e, t, n, r)) &&
      (!Ni(n) || Es(e, t, n, r)) &&
      (!yi(n) || rs(e, t, n, r)) &&
      (!Li(n) || As(e, t, n, r)) &&
      (!qi(n) || wu(e, t, n, r)) &&
      (!ba(n) || Rd(e, t, n, r)) &&
      (!pi(n) || Uo(e, t, n, r)) &&
      (!_i(n) || Yo(e, t, n, r)) &&
      (!Sa(n) || Wd(e, t, n, r)) &&
      (!Ya(n) || !v(r) || Wf(e, t, n, r)) &&
      (!Za(n) || !y(r) || Jf(e, t, n, r)) &&
      (!ri(n) || ho(e, t, n, r));
  return (e.Pop(n), i);
}
function Jp(e, t, n, r, i, a) {
  return t.Push() && Yp(e, t, n, r, i, a) && t.Pop();
}
function Yp(e, t, n, r, i, a) {
  e.Push(i);
  let o = oi(i)
    ? es(e, t, n, r, i, a)
    : !!(
        (!Ga(i) || Vf(e, t, n, r, i, a)) &
        +(
          !(y(a) && !v(a)) ||
          !!(
            (!Va(i) || Nf(e, t, n, r, i, a)) &
            +(!di(i) || Io(e, t, n, r, i, a)) &
            (!Ti(i) || hs(e, t, n, r, i, a)) &
            (!Di(i) || ys(e, t, n, r, i, a)) &
            (!ki(i) || Cs(e, t, n, r, i, a)) &
            (!Ea(i) || $d(e, t, n, r, i, a)) &
            (!Aa(i) || hf(e, t, n, r, i, a)) &
            (!Ma(i) || yf(e, t, n, r, i, a)) &
            (!ga(i) || kd(e, t, n, r, i, a)) &
            (!oa(i) || od(e, t, n, r, i, a))
          )
        ) &
        (!v(a) ||
          !!(
            (!li(i) || Eo(e, t, n, r, i, a)) &
            +(!xi(i) || ds(e, t, n, r, i, a)) &
            (!Yi(i) || zu(e, t, n, r, i, a)) &
            (!ea(i) || Wu(e, t, n, r, i, a)) &
            (!na(i) || Qu(e, t, n, r, i, a)) &
            (!ua(i) || pd(e, t, n, r, i, a)) &
            (!fa(i) || xd(e, t, n, r, i, a)) &
            (!Oa(i) || rf(e, t, n, r, i, a)) &
            (!qa(i) || Np(e, t, n, r, i, a))
          )) &
        (!b(a) ||
          !!(
            (!ia(i) || nd(e, t, n, r, i, a)) &
            +(!ma(i) || Td(e, t, n, r, i, a)) &
            (!Ui(i) || xu(e, t, n, r, i, a)) &
            (!wa(i) || Yd(e, t, n, r, i, a))
          )) &
        (!(On(a) || Sn(a)) ||
          !!(
            (!zi(i) || Fs(e, t, n, r, i, a)) &
            +(!Vi(i) || zs(e, t, n, r, i, a)) &
            (!Qi(i) || Ju(e, t, n, r, i, a)) &
            (!ca(i) || _d(e, t, n, r, i, a)) &
            (!va(i) || Nd(e, t, n, r, i, a))
          )) &
        (!za(i) || kf(e, t, n, r, i, a)) &
        (!La(i) || Cf(e, t, n, r, i, a)) &
        (!Ni(i) || Ds(e, t, n, r, i, a)) &
        (!yi(i) || is(e, t, n, r, i, a)) &
        (!Li(i) || js(e, t, n, r, i, a)) &
        (!qi(i) || Tu(e, t, n, r, i, a)) &
        (!ba(i) || zd(e, t, n, r, i, a)) &
        (!pi(i) || Wo(e, t, n, r, i, a)) &
        (!_i(i) || Xo(e, t, n, r, i, a)) &
        (!Sa(i) || Gd(e, t, n, r, i, a)) &
        (!Ya(i) || !v(a) || Gf(e, t, n, r, i, a)) &
        (!Za(i) || !y(a) || Yf(e, t, n, r, i, a))
      ) &&
      (!ri(i) || go(e, t, n, r, i, a));
  return (e.Pop(i), o);
}
function Xp() {
  return (Xp = e(() => {
    (Ka(),
      ci(),
      fi(),
      Ei(),
      Oi(),
      Ai(),
      ja(),
      Da(),
      Na(),
      _a(),
      sa(),
      Ha(),
      Qa(),
      ui(),
      Zi(),
      Si(),
      ta(),
      ra(),
      da(),
      pa(),
      ka(),
      Xa(),
      Ja(),
      ha(),
      aa(),
      Wi(),
      Ta(),
      la(),
      $i(),
      Bi(),
      Hi(),
      ya(),
      Ba(),
      Ra(),
      Pi(),
      bi(),
      Ri(),
      Ji(),
      xa(),
      mi(),
      vi(),
      Ca(),
      ii(),
      _o(),
      D(),
      Do(),
      Lo(),
      Go(),
      Zo(),
      ts(),
      as(),
      fs(),
      gs(),
      bs(),
      ws(),
      Os(),
      Ms(),
      Is(),
      Bs(),
      Su(),
      Eu(),
      Bu(),
      Gu(),
      Yu(),
      $u(),
      rd(),
      sd(),
      md(),
      vd(),
      Sd(),
      Ed(),
      Ad(),
      Pd(),
      Bd(),
      Kd(),
      Xd(),
      ef(),
      af(),
      gf(),
      bf(),
      wf(),
      Af(),
      Pf(),
      Hf(),
      Kf(),
      Xf(),
      Pp());
  }))();
}
function Zp() {
  return `${im[0]++}`;
}
function Qp(e, t) {
  am.has(e) || am.set(e, new Map());
  let n = am.get(e);
  if (n.has(t)) return n.get(t);
  let r = Zp();
  return (n.set(t, r), r);
}
function $p(e, t, n, r) {
  return e.UseUnevaluated() ? Ir(`check_${n}`, [`context`, r]) : Ir(`check_${n}`, [r]);
}
function em(e, t, n, r) {
  let i = Gp(e, t, n, `value`);
  return t.UseUnevaluated()
    ? Br(`check_${r}`, Fr([`context`, `value`], i))
    : Br(`check_${r}`, Fr([`value`], i));
}
function tm() {
  ((im[0] = 0), am.clear(), om.clear());
}
function nm() {
  return [...om.values()];
}
function rm(e, t, n, r) {
  let i = Qp(n, e.BaseURL().href),
    a = $p(t, n, i, r);
  return om.has(i) ? a : (om.set(i, ``), om.set(i, em(e, t, n, i)), a);
}
var im, am, om;
function sm() {
  return (sm = e(() => {
    (D(), Xp(), (im = [0]), (am = new Map()), (om = new Map()));
  }))();
}
function cm(e, t) {
  return y(t) && !qn(e) ? t[e] : void 0;
}
function lm(e, t) {
  return e.reduce((e, t) => cm(t, e), t);
}
function um(e) {
  if (x(e.length, 0)) return [];
  let t = e.split(`/`).map((e) => e.replace(/~1/g, `/`).replace(/~0/g, `~`));
  return t.length > 0 && t[0] === `` ? t.slice(1) : t;
}
function dm(e, t) {
  return lm(um(t), e);
}
function fm() {
  return (fm = e(() => {
    D();
  }))();
}
function pm(e, t, n) {
  if (e.$id === n.hash) return e;
  let r = new URL(e.$id, t.href),
    i = new URL(n.href, t.href);
  if (x(r.pathname, i.pathname)) return n.hash.startsWith(`#`) ? gm(e, t, n) : e;
}
function mm(e, t, n) {
  let r = new URL(`#${e.$anchor}`, t.href),
    i = new URL(n.href, t.href);
  return x(r.href, i.href) ? e : void 0;
}
function hm(e, t, n) {
  let r = new URL(`#${e.$dynamicAnchor}`, t.href),
    i = new URL(n.href, t.href);
  return x(r.href, i.href) ? e : void 0;
}
function gm(e, t, n) {
  if (n.href.endsWith(`#`)) return e;
  if (!n.hash.startsWith(`#`)) return;
  let r = decodeURIComponent(n.hash.slice(1));
  if (r.startsWith(`/`)) return dm(e, r);
}
function _m(e, t, n) {
  if (Gi(e)) {
    let r = pm(e, t, n);
    if (!jn(r)) return r;
  }
  if (hi(e)) {
    let r = mm(e, t, n);
    if (!jn(r)) return r;
  }
  if (ji(e)) {
    let r = hm(e, t, n);
    if (!jn(r)) return r;
  }
  return gm(e, t, n);
}
function vm(e, t, n) {
  return e.reduce(
    (e, r) => {
      let i = xm(r, t, n);
      return jn(i) ? e : i;
    },
    void 0,
  );
}
function ym(e) {
  return x(e, `const`) || x(e, `enum`);
}
function bm(e, t, n) {
  return w(e).reduce(
    (r, i) => {
      if (ym(i)) return r;
      let a = xm(e[i], t, n);
      return jn(a) ? r : a;
    },
    void 0,
  );
}
function xm(e, t, n) {
  let r = ai(e) && Gi(e) ? new URL(e.$id, t.href) : t;
  if (ai(e)) {
    let t = _m(e, r, n);
    if (!jn(t)) return t;
  }
  if (v(e)) return vm(e, r, n);
  if (y(e)) return bm(e, r, n);
}
function Sm(e, t) {
  let n = Gi(e) ? new URL(e.$id, wm.href) : wm;
  return xm(e, n, new URL(t, n.href));
}
function Cm(e, t, n, r) {
  let i = n.$dynamicRef.startsWith(`#`) ? Sm(t, n.$dynamicRef) : Sm(e, n.$dynamicRef);
  if (!jn(i))
    return !ai(i) || !ji(i) || new URL(n.$dynamicRef, wm).hash.startsWith(`#/`)
      ? i
      : (r.find((e) => e.$dynamicAnchor === i.$dynamicAnchor) ?? i);
}
var wm;
function Tm() {
  return (Tm = e(() => {
    (D(), fm(), Ki(), gi(), Mi(), ci(), (wm = new URL(`https://json-schema.org`)));
  }))();
}
function Em() {
  return (Em = e(() => {
    Tm();
  }))();
}
function Dm() {
  return (Dm = e(() => {
    Em();
  }))();
}
var Om, km, Am, jm, Mm, Nm, Pm;
function Fm() {
  return (Fm = e(() => {
    (ci(),
      Ki(),
      gi(),
      Ia(),
      Mi(),
      D(),
      Dm(),
      (Om = function (e, t, n, r) {
        if (n === `a` && !r) throw TypeError(`Private accessor was defined without a getter`);
        if (typeof t == `function` ? e !== t || !r : !t.has(e))
          throw TypeError(
            `Cannot read private member from an object whose class did not declare it`,
          );
        return n === `m` ? r : n === `a` ? r.call(e) : r ? r.value : t.get(e);
      }),
      (Pm = class {
        constructor(e, t) {
          (km.add(this),
            (this.context = e),
            (this.schema = t),
            (this.ids = []),
            (this.anchors = []),
            (this.recursiveAnchors = []),
            (this.dynamicAnchors = []));
        }
        BaseURL() {
          return this.ids.reduce((e, t) => new URL(t.$id, e), wm);
        }
        Base() {
          return this.ids[this.ids.length - 1] ?? this.schema;
        }
        Push(e) {
          ai(e) &&
            (Gi(e) && (this.ids.push(e), Om(this, km, `m`, Am).call(this, e)),
            hi(e) && this.anchors.push(e),
            Fa(e) && this.recursiveAnchors.push(e),
            ji(e) && this.dynamicAnchors.push(e));
        }
        Pop(e) {
          ai(e) &&
            (Gi(e) && (this.ids.pop(), Om(this, km, `m`, jm).call(this, e)),
            hi(e) && this.anchors.pop(),
            Fa(e) && this.recursiveAnchors.pop(),
            ji(e) && this.dynamicAnchors.pop());
        }
        Ref(e) {
          return Om(this, km, `m`, Mm).call(this, e) ?? Om(this, km, `m`, Nm).call(this, e);
        }
        RecursiveRef(e) {
          return Fa(this.Base())
            ? Sm(this.recursiveAnchors[0], e.$recursiveRef)
            : Sm(this.Base(), e.$recursiveRef);
        }
        DynamicRef(e) {
          let t = this.schema;
          return Cm(t, this.Base(), e, this.dynamicAnchors);
        }
      }),
      (km = new WeakSet()),
      (Am = function e(t, n = !0) {
        if (!ai(t)) return;
        let r = t;
        if (!(!n && Gi(r))) {
          !n && ji(r) && this.dynamicAnchors.push(r);
          for (let t of w(r)) Om(this, km, `m`, e).call(this, r[t], !1);
        }
      }),
      (jm = function e(t, n = !0) {
        if (!ai(t)) return;
        let r = t;
        if (!(!n && Gi(r))) {
          !n && ji(r) && this.dynamicAnchors.pop();
          for (let t of w(r)) Om(this, km, `m`, e).call(this, r[t], !1);
        }
      }),
      (Mm = function (e) {
        return C(this.context, e.$ref) ? this.context[e.$ref] : void 0;
      }),
      (Nm = function (e) {
        let t = this.schema;
        return e.$ref.startsWith(`#`) ? Sm(this.Base(), e.$ref) : Sm(t, e.$ref);
      }));
  }))();
}
function Im() {
  return (Im = e(() => {
    (so(),
      po(),
      sm(),
      Fm(),
      Su(),
      Eu(),
      Bu(),
      Gu(),
      md(),
      Bd(),
      Kd(),
      ef(),
      af(),
      gf(),
      bf(),
      wf(),
      Af(),
      Xp(),
      Kf(),
      Xf(),
      Pp());
  }))();
}
function Lm() {
  try {
    return (zm(`null`)(), !0);
  } catch {
    return !1;
  }
}
function Rm() {
  return (jn(Bm) && (Bm = Lm()), Bm && of().useAcceleration);
}
function zm(...e) {
  return new globalThis.Function(...e);
}
var Bm;
function Vm() {
  return (Vm = e(() => {
    (cf(), D(), (Bm = void 0));
  }))();
}
function Hm(e) {
  return `${e.Functions().join(`;
`)}; return (value) => { ${(e.UseUnevaluated() ? [`const context = new CheckContext({}, {})`, `return ${e.Entry()}`] : [`return ${e.Entry()}`]).join(`; `)} }`;
}
function Um(e, t) {
  return zm(
    `CheckContext`,
    `Guard`,
    `Format`,
    `Hashing`,
    e.External().identifier,
    t,
  )(io, xn, gu, Qf, e.External().variables);
}
function Wm(e) {
  let t = new Pm(e.Context(), e.Schema()),
    n = new io();
  return (r) => qp(t, n, e.Schema(), r);
}
function Gm(e, t) {
  return Rm() ? Um(e, t) : Wm(e);
}
function Km(...e) {
  let [t, n] = an(e, { 2: (e, t) => [e, t], 1: (e) => [{}, e] });
  (lo(), tm());
  let r = new Pm(t, n),
    i = new ro(no(t, n)),
    a = rm(r, i, n, `value`),
    o = nm(),
    s = uo();
  return new Jm(t, n, s, o, a, i.UseUnevaluated());
}
var qm, Jm;
function Ym() {
  return (Ym = e(() => {
    (Vm(),
      kp(),
      D(),
      vu(),
      Im(),
      (qm = class {
        constructor(e, t, n) {
          ((this.isAccelerated = e), (this.code = t), (this.check = n));
        }
        IsAccelerated() {
          return this.isAccelerated;
        }
        Code() {
          return this.code;
        }
        Check(e) {
          return this.check(e);
        }
      }),
      (Jm = class {
        constructor(e, t, n, r, i, a) {
          ((this.context = e),
            (this.schema = t),
            (this.external = n),
            (this.functions = r),
            (this.entry = i),
            (this.useUnevaluated = a));
        }
        Context() {
          return this.context;
        }
        Schema() {
          return this.schema;
        }
        UseUnevaluated() {
          return this.useUnevaluated;
        }
        External() {
          return this.external;
        }
        Functions() {
          return this.functions;
        }
        Entry() {
          return this.entry;
        }
        Evaluate() {
          let e = Hm(this),
            t = Gm(this, e);
          return new qm(Rm(), e, t);
        }
      }));
  }))();
}
function Xm(e) {
  switch (e.keyword) {
    case `additionalProperties`:
      return `must not have additional properties`;
    case `anyOf`:
      return `must match a schema in anyOf`;
    case `boolean`:
      return `schema is false`;
    case `const`:
      return `must be equal to constant`;
    case `contains`:
      return `must contain at least 1 valid item`;
    case `dependencies`:
      return `must have properties ${e.params.dependencies.join(`, `)} when property ${e.params.property} is present`;
    case `dependentRequired`:
      return `must have properties ${e.params.dependencies.join(`, `)} when property ${e.params.property} is present`;
    case `enum`:
      return `must be equal to one of the allowed values`;
    case `exclusiveMaximum`:
      return `must be ${e.params.comparison} ${e.params.limit}`;
    case `exclusiveMinimum`:
      return `must be ${e.params.comparison} ${e.params.limit}`;
    case `format`:
      return `must match format "${e.params.format}"`;
    case `if`:
      return `must match "${e.params.failingKeyword}" schema`;
    case `maxItems`:
      return `must not have more than ${e.params.limit} items`;
    case `maxLength`:
      return `must not have more than ${e.params.limit} characters`;
    case `maxProperties`:
      return `must not have more than ${e.params.limit} properties`;
    case `maximum`:
      return `must be ${e.params.comparison} ${e.params.limit}`;
    case `minItems`:
      return `must not have fewer than ${e.params.limit} items`;
    case `minLength`:
      return `must not have fewer than ${e.params.limit} characters`;
    case `minProperties`:
      return `must not have fewer than ${e.params.limit} properties`;
    case `minimum`:
      return `must be ${e.params.comparison} ${e.params.limit}`;
    case `multipleOf`:
      return `must be multiple of ${e.params.multipleOf}`;
    case `not`:
      return `must not be valid`;
    case `oneOf`:
      return `must match exactly one schema in oneOf`;
    case `pattern`:
      return `must match pattern "${e.params.pattern}"`;
    case `propertyNames`:
      return `property names ${e.params.propertyNames.join(`, `)} are invalid`;
    case `required`:
      return `must have required properties ${e.params.requiredProperties.join(`, `)}`;
    case `type`:
      return typeof e.params.type == `string`
        ? `must be ${e.params.type}`
        : `must be either ${e.params.type.join(` or `)}`;
    case `unevaluatedItems`:
      return `must not have unevaluated items`;
    case `unevaluatedProperties`:
      return `must not have unevaluated properties`;
    case `uniqueItems`:
      return `must not have duplicate items`;
    case `~refine`:
      return e.params.message;
    default:
      return `an unknown validation error occurred`;
  }
}
function Zm() {
  return Qm;
}
var Qm;
function $m() {
  return ($m = e(() => {
    Qm = Xm;
  }))();
}
function eh(...e) {
  let [t, n, r] = an(e, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [{}, e, t] }),
    i = of(),
    a = Zm(),
    o = [];
  return [
    Yp(
      new Pm(t, n),
      new ao((e) => {
        if (!Fn(o.length, i.maxErrors)) return o.push({ ...e, message: a(e) });
      }),
      `#`,
      ``,
      n,
      r,
    ),
    o,
  ];
}
function th() {
  return (th = e(() => {
    (cf(), $m(), D(), Im());
  }))();
}
function nh(...e) {
  let [t, n, r] = an(e, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [{}, e, t] });
  return qp(new Pm(t, n), new io(), n, r);
}
function rh() {
  return (rh = e(() => {
    Im();
  }))();
}
function ih() {
  return (ih = e(() => {
    (rh(), th());
  }))();
}
function ah() {
  return (ah = e(() => {
    (Ym(), th(), ih());
  }))();
}
function oh() {
  return (oh = e(() => {
    (Im(), Dm(), wi(), Ym(), ah(), rh(), ih(), th());
  }))();
}
function sh() {
  return (sh = e(() => {
    oh();
  }))();
}
function ch(...e) {
  let [t, n, r] = an(e, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [{}, e, t] });
  return nh(t, n, r);
}
function lh() {
  return (lh = e(() => {
    sh();
  }))();
}
function uh() {
  return (uh = e(() => {
    lh();
  }))();
}
function dh(...e) {
  let [t, n, r] = an(e, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [{}, e, t] }),
    [i, a] = eh(t, n, r);
  return a;
}
function fh() {
  return (fh = e(() => {
    sh();
  }))();
}
function ph() {
  return (ph = e(() => {
    fh();
  }))();
}
var mh;
function hh() {
  return (hh = e(() => {
    (uh(),
      ph(),
      (mh = class extends Error {
        constructor(e, t, n) {
          (super(e),
            Object.defineProperty(this, "cause", {
              value: { source: e, errors: n, value: t },
              writable: !1,
              configurable: !1,
              enumerable: !1,
            }));
        }
      }));
  }))();
}
function gh() {
  return (gh = e(() => {
    hh();
  }))();
}
var _h;
function vh() {
  return (vh = e(() => {
    _h = { assign: 0, create: 0, clone: 0, discard: 0, update: 0 };
  }))();
}
function yh(e, t) {
  return ((_h.assign += 1), { ...e, ...t });
}
function bh() {
  return (bh = e(() => {
    vh();
  }))();
}
function xh(e) {
  return e;
}
function Sh(e) {
  return C(e, `~kind`) || C(e, `~unsafe`);
}
function Ch(e) {
  let t = {};
  for (let n of w(e)) {
    if (qn(n)) continue;
    let r = Object.getOwnPropertyDescriptor(e, n);
    ((r.value = jh(r.value)),
      x(r.enumerable, !0) ? (t[n] = r.value) : Object.defineProperty(t, n, r));
  }
  return t;
}
function wh(e) {
  let t = {};
  for (let n of w(e)) qn(n) || (t[n] = jh(e[n]));
  for (let n of Xn(e)) t[n] = jh(e[n]);
  return t;
}
function Th(e) {
  return Ln(e) ? xh(e) : Sh(e) ? Ch(e) : wh(e);
}
function Eh(e) {
  return e.map((e) => jh(e));
}
function Dh(e) {
  return e.slice();
}
function Oh(e) {
  return new RegExp(e.source, e.flags);
}
function kh(e) {
  return new Map(jh([...e.entries()]));
}
function Ah(e) {
  return new Set(jh([...e.values()]));
}
function jh(e) {
  return Zr(e)
    ? Dh(e)
    : Qr(e)
      ? Oh(e)
      : ti(e)
        ? kh(e)
        : ei(e)
          ? Ah(e)
          : v(e)
            ? Eh(e)
            : y(e)
              ? Th(e)
              : e;
}
function Mh(e) {
  return ((_h.clone += 1), jh(e));
}
function Nh() {
  return (Nh = e(() => {
    (D(), vh());
  }))();
}
function Ph(e, t) {
  for (let n of Object.keys(t))
    Object.defineProperty(e, n, { configurable: !0, writable: !0, enumerable: !1, value: t[n] });
  return e;
}
function Fh(e, t) {
  return { ...e, ...t };
}
function Ih(e, t, n = {}) {
  _h.create += 1;
  let r = of(),
    i = Fh(t, n),
    a = r.enumerableKind ? Fh(i, e) : Ph(i, e);
  return r.immutableTypes ? Object.freeze(a) : a;
}
function Lh() {
  return (Lh = e(() => {
    (cf(), vh());
  }))();
}
function Rh(e, t) {
  _h.discard += 1;
  let n = {};
  for (let r of w(e)) {
    if (t.includes(r)) continue;
    let i = Object.getOwnPropertyDescriptor(e, r);
    ((i.value = Mh(i.value)), Object.defineProperty(n, r, i));
  }
  return n;
}
function zh() {
  return (zh = e(() => {
    (D(), vh(), Nh());
  }))();
}
function O(e, t, n) {
  _h.update += 1;
  let r = of(),
    i = Mh(e);
  for (let e of Object.keys(t))
    Object.defineProperty(i, e, {
      configurable: !0,
      writable: !0,
      enumerable: r.enumerableKind,
      value: t[e],
    });
  for (let e of Object.keys(n))
    Object.defineProperty(i, e, { configurable: !0, enumerable: !0, writable: !0, value: n[e] });
  return i;
}
function Bh() {
  return (Bh = e(() => {
    (cf(), vh(), Nh());
  }))();
}
function Vh() {
  return (Vh = e(() => {
    kp();
  }))();
}
function Hh() {
  return (Hh = e(() => {
    Vh();
  }))();
}
function Uh(e, t) {
  return y(e) && C(e, `~kind`) && x(e[`~kind`], t);
}
function Wh(e) {
  return y(e);
}
function k() {
  return (k = e(() => {
    D();
  }))();
}
function Gh(e, t, n) {
  return Ih(
    { "~kind": `Deferred` },
    { type: `deferred`, action: e, parameters: t, options: n },
    {},
  );
}
function Kh(e) {
  return Uh(e, `Deferred`);
}
function qh() {
  return (qh = e(() => {
    (Lh(), k());
  }))();
}
function Jh(e) {
  return O(e, { "~readonly": !0 }, {});
}
function Yh(e, t) {
  return O(Jh(e), {}, t);
}
function Xh(e, t, n, r) {
  return Yh(K(e, t, n), r);
}
function Zh() {
  return (Zh = e(() => {
    (Bh(), q());
  }))();
}
function Qh(e) {
  return O(e, { "~optional": !0 }, {});
}
function $h(e, t) {
  return O(Qh(e), {}, t);
}
function eg(e, t, n, r) {
  return $h(K(e, t, n), r);
}
function tg() {
  return (tg = e(() => {
    (Bh(), q());
  }))();
}
function A(e, t) {
  return Ih({ "~kind": `Array` }, { type: `array`, items: e }, t);
}
function ng(e) {
  return Uh(e, `Array`);
}
function rg(e) {
  return Rh(e, [`~kind`, `type`, `items`]);
}
function ig() {
  return (ig = e(() => {
    (Lh(), zh(), k());
  }))();
}
function ag(e, t, n = {}) {
  return Ih({ "~kind": `Constructor` }, { type: `constructor`, parameters: e, instanceType: t }, n);
}
function og(e) {
  return Uh(e, `Constructor`);
}
function sg(e) {
  return Rh(e, [`~kind`, `type`, `parameters`, `instanceType`]);
}
function cg() {
  return (cg = e(() => {
    (Lh(), zh(), k());
  }))();
}
function lg(e, t, n = {}) {
  return Ih({ "~kind": `Function` }, { type: `function`, parameters: e, returnType: t }, n);
}
function ug(e) {
  return Uh(e, `Function`);
}
function dg(e) {
  return Rh(e, [`~kind`, `type`, `parameters`, `returnType`]);
}
function fg() {
  return (fg = e(() => {
    (Lh(), zh(), k());
  }))();
}
function pg(e, t) {
  return Ih({ "~kind": `Ref` }, { $ref: e }, t);
}
function mg(e) {
  return Uh(e, `Ref`);
}
function hg() {
  return (hg = e(() => {
    (Lh(), k());
  }))();
}
function gg(e, t) {
  return Ih({ "~kind": `Generic` }, { type: `generic`, parameters: e, expression: t });
}
function _g(e) {
  return Uh(e, `Generic`);
}
function vg() {
  return (vg = e(() => {
    (Lh(), k());
  }))();
}
function yg(e) {
  return Ih({ "~kind": `Any` }, {}, e);
}
function bg(e) {
  return Uh(e, `Any`);
}
function xg() {
  return (xg = e(() => {
    (Lh(), k());
  }))();
}
function Sg(e) {
  return Ih({ "~kind": `Never` }, { not: {} }, e);
}
function Cg(e) {
  return Uh(e, `Never`);
}
var wg;
function Tg() {
  return (Tg = e(() => {
    (Lh(), k(), (wg = `(?!)`));
  }))();
}
function Eg(e, t = {}) {
  return $h(e, t);
}
function Dg() {
  return (Dg = e(() => {
    tg();
  }))();
}
function j(e) {
  return Eg(e);
}
function Og(e) {
  return Wh(e) && C(e, `~optional`);
}
function kg() {
  return (kg = e(() => {
    (D(), k(), Dg());
  }))();
}
function Ag(e) {
  return w(e).filter((t) => !Og(e[t]));
}
function jg(e) {
  return w(e);
}
function Mg(e) {
  return Zn(e);
}
function Ng() {
  return (Ng = e(() => {
    (D(), kg());
  }))();
}
function M(e, t = {}) {
  let n = Ag(e);
  return Ih(
    { "~kind": `Object` },
    { type: `object`, ...(n.length > 0 ? { required: n } : {}), properties: e },
    t,
  );
}
function Pg(e) {
  return Uh(e, `Object`);
}
function Fg(e) {
  return Rh(e, [`~kind`, `type`, `properties`, `required`]);
}
function Ig() {
  return (Ig = e(() => {
    (Lh(), zh(), k(), Ng());
  }))();
}
function N(e) {
  return Ih({ "~kind": `Unknown` }, {}, e);
}
function Lg(e) {
  return Uh(e, `Unknown`);
}
function Rg() {
  return (Rg = e(() => {
    (Lh(), k());
  }))();
}
function zg(e, t, n) {
  return Ih(
    { "~kind": `Cyclic` },
    { $defs: w(e).reduce((t, n) => ({ ...t, [n]: O(e[n], {}, { $id: n }) }), {}), $ref: t },
    n,
  );
}
function Bg(e) {
  return Uh(e, `Cyclic`);
}
function Vg() {
  return (Vg = e(() => {
    (D(), Bh(), Lh(), k());
  }))();
}
function Hg(e) {
  return O(e, { "~unsafe": null }, {});
}
function Ug(e) {
  return kn(e) && C(e, `~unsafe`) && Dn(e[`~unsafe`]);
}
function Wg() {
  return (Wg = e(() => {
    (D(), Bh());
  }))();
}
function Gg(e) {
  return Uh(e, `Infer`);
}
function Kg() {
  return (Kg = e(() => {
    k();
  }))();
}
function qg(e, t, n, r = {}) {
  return Ih({ "~kind": `Dependent` }, { if: e, then: t, else: n }, r);
}
function Jg(e) {
  return Uh(e, `Dependent`);
}
function Yg(e) {
  return Rh(e, [`~kind`, `if`, `then`, `else`]);
}
function Xg() {
  return (Xg = e(() => {
    (Lh(), zh(), k());
  }))();
}
function Zg(e) {
  return kn(e);
}
function Qg(e) {
  return w(e)
    .filter((e) => isNaN(e))
    .reduce((t, n) => [...t, e[n]], []);
}
function $g() {
  return ($g = e(() => {
    D();
  }))();
}
function e_(e, t) {
  return Ih({ "~kind": `Enum` }, { enum: Zg(e) ? Qg(e) : e }, t);
}
function t_(e) {
  return Uh(e, `Enum`);
}
function n_() {
  return (n_ = e(() => {
    (Lh(), k(), $g());
  }))();
}
function r_(e, t = {}) {
  return Ih({ "~kind": `Intersect` }, { allOf: e }, t);
}
function i_(e) {
  return Uh(e, `Intersect`);
}
function a_(e) {
  return Rh(e, [`~kind`, `allOf`]);
}
function o_() {
  return (o_ = e(() => {
    (Lh(), zh(), k());
  }))();
}
function s_(e) {
  return (
    Wh(e) &&
    C(e, `~codec`) &&
    y(e[`~codec`]) &&
    C(e[`~codec`], `encode`) &&
    C(e[`~codec`], `decode`)
  );
}
function c_() {
  return (c_ = e(() => {
    (Hh(), D(), k());
  }))();
}
function l_(e) {
  return Wh(e) && C(e, `~immutable`);
}
function u_() {
  return (u_ = e(() => {
    (D(), k(), cj());
  }))();
}
function d_(e, t = {}) {
  return Yh(e, t);
}
function f_() {
  return (f_ = e(() => {
    Zh();
  }))();
}
function p_(e) {
  return Wh(e) && C(e, `~readonly`);
}
function m_() {
  return (m_ = e(() => {
    (D(), k());
  }))();
}
function h_(e, t) {
  return O(e, { "~refine": v_(e) ? [...e[`~refine`], t] : [t] }, {});
}
function g_(...e) {
  let [t, n, r] = an(e, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [e, t, () => `Refine Error`] });
  return h_(t, { check: n, error: r });
}
function __(e) {
  return kn(e) && C(e, `check`) && C(e, `error`) && Tn(e.check) && Tn(e.error);
}
function v_(e) {
  return Wh(e) && C(e, `~refine`) && v(e[`~refine`]) && Hn(e[`~refine`], 0, (e) => __(e));
}
function y_() {
  return (y_ = e(() => {
    (Bh(), D(), k());
  }))();
}
function b_(e) {
  return Ih({ "~kind": `BigInt` }, { type: `bigint` }, e);
}
function x_(e) {
  return Uh(e, `BigInt`);
}
var S_;
function C_() {
  return (C_ = e(() => {
    (Lh(), k(), (S_ = `-?(?:0|[1-9][0-9]*)n`));
  }))();
}
function P(e) {
  return Ih({ "~kind": `Boolean` }, { type: `boolean` }, e);
}
function w_(e) {
  return Uh(e, `Boolean`);
}
function T_() {
  return (T_ = e(() => {
    (Lh(), k());
  }))();
}
function F(e) {
  return Ih({ "~kind": `Integer` }, { type: `integer` }, e);
}
function E_(e) {
  return Uh(e, `Integer`);
}
var D_;
function O_() {
  return (O_ = e(() => {
    (Lh(), k(), (D_ = `-?(?:0|[1-9][0-9]*)`));
  }))();
}
function k_(e) {
  return Sn(e)
    ? `bigint`
    : Cn(e)
      ? `boolean`
      : On(e)
        ? `number`
        : b(e)
          ? `string`
          : (() => {
              throw new I_(e);
            })();
}
function I(e, t) {
  return Ih({ "~kind": `Literal` }, { type: k_(e), const: e }, t);
}
function A_(e) {
  return Sn(e) || Cn(e) || On(e) || b(e);
}
function j_(e) {
  return F_(e) && Sn(e.const);
}
function M_(e) {
  return F_(e) && Cn(e.const);
}
function N_(e) {
  return F_(e) && On(e.const);
}
function P_(e) {
  return F_(e) && b(e.const);
}
function F_(e) {
  return Uh(e, `Literal`);
}
var I_;
function L_() {
  return (L_ = e(() => {
    (Lh(),
      D(),
      k(),
      (I_ = class extends Error {
        constructor(e) {
          (super(`Invalid Literal value`),
            Object.defineProperty(this, "cause", {
              value: { value: e },
              writable: !1,
              configurable: !1,
              enumerable: !1,
            }));
        }
      }));
  }))();
}
function L(e) {
  return Ih({ "~kind": `Null` }, { type: `null` }, e);
}
function R_(e) {
  return Uh(e, `Null`);
}
function z_() {
  return (z_ = e(() => {
    (Lh(), k());
  }))();
}
function R(e) {
  return Ih({ "~kind": `Number` }, { type: `number` }, e);
}
function B_(e) {
  return Uh(e, `Number`);
}
var V_;
function H_() {
  return (H_ = e(() => {
    (Lh(), k(), (V_ = `-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?`));
  }))();
}
function U_(e) {
  return Ih({ "~kind": `Symbol` }, { type: `symbol` }, e);
}
function W_(e) {
  return Uh(e, `Symbol`);
}
function G_() {
  return (G_ = e(() => {
    (Lh(), k());
  }))();
}
function z(e) {
  return Ih({ "~kind": `String` }, { type: `string` }, e);
}
function K_(e) {
  return Uh(e, `String`);
}
function q_() {
  return (q_ = e(() => {
    (Lh(), k());
  }))();
}
function B(e, t = {}) {
  return Ih({ "~kind": `Union` }, { anyOf: e }, t);
}
function V(e) {
  return Uh(e, `Union`);
}
function J_(e) {
  return Rh(e, [`~kind`, `anyOf`]);
}
function H() {
  return (H = e(() => {
    (Lh(), zh(), k());
  }))();
}
function Y_(e) {
  let t = Cx(e);
  return x(t.length, 2) ? t[0] : [];
}
function X_() {
  return (X_ = e(() => {
    (D(), wx());
  }))();
}
function Z_(e) {
  return !0;
}
function Q_(e) {
  return S(
    e,
    (e, t) => (ev(e) ? Q_(t) : !1),
    () => !0,
  );
}
function $_(e) {
  return !x(e.length, 0) && Q_(e);
}
function ev(e) {
  return V(e) ? $_(e.anyOf) : F_(e) ? Z_(e.const) : !1;
}
function tv(e) {
  return $_(e);
}
function nv() {
  return (nv = e(() => {
    (D(), L_(), H());
  }))();
}
function rv(e) {
  return Ih({ "~kind": `TemplateLiteral` }, { type: `string`, pattern: e }, {});
}
function iv() {
  return (iv = e(() => {
    Lh();
  }))();
}
function av(e, t, n = []) {
  return S(
    e,
    (e, r) => av(r, t, [...n, `${e}${t}`]),
    () => n,
  );
}
function ov(e, t) {
  return x(e.length, 0) ? [`${t}`] : av(e, t);
}
function sv(e, t, n = []) {
  return S(
    t,
    (t, r) => sv(e, r, [...n, ...cv(e, t)]),
    () => n,
  );
}
function cv(e, t) {
  return V(t) ? sv(e, t.anyOf) : F_(t) ? ov(e, t.const) : Zf();
}
function lv(e, t) {
  return S(
    t,
    (t, n) => lv(cv(e, t), n),
    () => e,
  );
}
function uv(e) {
  return e.map((e) => I(e));
}
function dv(e) {
  return B(uv(lv([], e)));
}
function fv(e) {
  return x(e.length, 0) ? Zf() : x(e.length, 1) && F_(e[0]) ? e[0] : dv(e);
}
function pv(e) {
  let t = Y_(e);
  return x(t.length, 0) ? z() : tv(t) ? fv(t) : rv(e);
}
function mv(e) {
  let t = pv(e);
  return Jx(t) ? z() : t;
}
function hv() {
  return (hv = e(() => {
    (D(), L_(), q_(), Yx(), H(), X_(), nv(), iv());
  }))();
}
function gv(e, t) {
  return Ih({ "~kind": `Record` }, { type: `object`, patternProperties: { [e]: t } });
}
function _v() {
  return (_v = e(() => {
    Lh();
  }))();
}
function vv(e) {
  return gv(tb, e);
}
function yv() {
  return (yv = e(() => {
    (nb(), _v());
  }))();
}
function bv(e) {
  return M({ true: e, false: e });
}
function xv() {
  return (xv = e(() => {
    Ig();
  }))();
}
function Sv(e, t = {}) {
  let [n, r, i] = [e, e.length, !1];
  return Ih({ "~kind": `Tuple` }, { type: `array`, additionalItems: i, items: n, minItems: r }, t);
}
function Cv(e) {
  return Uh(e, `Tuple`);
}
function wv(e) {
  return Rh(e, [`~kind`, `type`, `items`, `minItems`, `additionalItems`]);
}
function Tv() {
  return (Tv = e(() => {
    (Lh(), zh(), k());
  }))();
}
function Ev(e) {
  return Rh(e, [`~readonly`]);
}
function Dv(e, t) {
  return O(Ev(e), {}, t);
}
function Ov(e, t, n, r) {
  return Dv(K(e, t, n), r);
}
function kv() {
  return (kv = e(() => {
    (zh(), Bh(), q());
  }))();
}
function Av(e, t = {}) {
  return Dv(e, t);
}
function jv() {
  return (jv = e(() => {
    kv();
  }))();
}
function Mv(e) {
  return Rh(e, [`~optional`]);
}
function Nv(e, t) {
  return O(Mv(e), {}, t);
}
function Pv(e, t, n, r) {
  return Nv(K(e, t, n), r);
}
function Fv() {
  return (Fv = e(() => {
    (zh(), Bh(), q());
  }))();
}
function Iv(e, t = {}) {
  return Nv(e, t);
}
function Lv() {
  return (Lv = e(() => {
    Fv();
  }))();
}
function Rv(e) {
  return e.reduceRight((e, t, n) => ({ [n]: t, ...e }), {});
}
function zv(e) {
  return M(Rv(e.items));
}
function Bv() {
  return (Bv = e(() => {
    Ig();
  }))();
}
function Vv(e) {
  return Pg(e) || Cv(e);
}
function Hv(e, t) {
  return p_(e) ? !!p_(t) : !1;
}
function Uv(e, t) {
  return Og(e) ? !!Og(t) : !1;
}
function Wv(e, t) {
  let n = Hv(e, t),
    r = Uv(e, t),
    i = Av(Iv(fy([e, t])));
  return n && r ? d_(Eg(i)) : n && !r ? d_(i) : !n && r ? Eg(i) : i;
}
function Gv(e, t, n) {
  return n in e ? (n in t ? Wv(e[n], t[n]) : e[n]) : n in t ? t[n] : Sg();
}
function Kv(e, t) {
  return [...new Set([...w(e), ...w(t)])].reduce((n, r) => ({ ...n, [r]: Gv(e, t, r) }), {});
}
function qv(e) {
  return Pg(e) ? e.properties : Cv(e) ? Rv(e.items) : {};
}
function Jv(e, t) {
  return M(Kv(qv(e), qv(t)));
}
function Yv() {
  return (Yv = e(() => {
    (D(), m_(), kg(), Ig(), Tg(), Tv(), f_(), Dg(), jv(), Lv(), Bv(), U());
  }))();
}
function Xv(e, t) {
  let n = zw(e, t);
  return x(n, 2) ? e : x(n, 3) || x(n, 0) ? t : Sg();
}
function Zv(e, t) {
  let n = Vv(e),
    r = Vv(t);
  return n && r ? Jv(e, t) : n && !r ? e : !n && r ? t : Xv(e, t);
}
function Qv(e, t) {
  return Cg(e) || bg(e) ? e : Lg(e) || Cg(t) || bg(t) ? t : Lg(t) ? e : Zv(e, t);
}
function $v() {
  return ($v = e(() => {
    (D(), xg(), Tg(), Rg(), Bw(), Yv());
  }))();
}
function ey(e, t) {
  return V(e) || V(t);
}
function ty(e, t) {
  let n = hy(e),
    r = hy(t);
  return ey(n, r) ? fy([n, r]) : Qv(n, r);
}
function ny(e, t, n = []) {
  return S(
    t,
    (t, r) => ny(e, r, [...n, ty(t, e)]),
    () => (x(n.length, 0) ? [e] : n),
  );
}
function ry(e, t, n = []) {
  return S(
    e,
    (e, r) => ry(r, t, [...n, ...iy([e], t)]),
    () => n,
  );
}
function iy(e, t = []) {
  return S(
    e,
    (e, n) => (V(e) ? iy(n, ry(e.anyOf, t)) : iy(n, ny(e, t))),
    () => t,
  );
}
function ay() {
  return (ay = e(() => {
    (D(), H(), $v(), U());
  }))();
}
function oy(e, t) {
  return tS(Iw({}, e, t)) ? [] : [e];
}
function sy(e, t, n = []) {
  return S(
    e,
    (e, r) => sy(r, t, [...n, ...oy(e, t)]),
    () => n,
  );
}
function cy(e, t) {
  let n = hy(e);
  return my(sy(V(n) ? n.anyOf : [n], t));
}
function ly() {
  return (ly = e(() => {
    (D(), H(), Rw(), U());
  }))();
}
function uy(e, t, n) {
  return my([fy([e, t]), cy(n, e)]);
}
function dy(e, t = []) {
  return S(
    e,
    (e, n) => dy(n, [...t, I(e)]),
    () => my(t),
  );
}
function fy(e) {
  return my(Ww(iy(e)));
}
function py(e) {
  return hy(mv(e));
}
function my(e) {
  return gy(Ww(e));
}
function hy(e) {
  return Jg(e)
    ? uy(e.if, e.then, e.else)
    : t_(e)
      ? dy(e.enum)
      : i_(e)
        ? fy(e.allOf)
        : Jx(e)
          ? py(e.pattern)
          : V(e)
            ? my(e.anyOf)
            : e;
}
function gy(e) {
  return x(e.length, 1) ? e[0] : x(e.length, 0) ? Sg() : B(e);
}
function U() {
  return (U = e(() => {
    (D(), Xg(), n_(), o_(), L_(), Tg(), Yx(), H(), ay(), Gw(), ly(), hv());
  }))();
}
function _y(e, t) {
  return By(dy(e), t);
}
function vy() {
  return (vy = e(() => {
    (Vy(), U());
  }))();
}
function yy(e, t) {
  return gv($y, t);
}
function by() {
  return (by = e(() => {
    (nb(), _v());
  }))();
}
function xy(e, t) {
  return By(fy(e), t);
}
function Sy() {
  return (Sy = e(() => {
    (U(), Vy());
  }))();
}
function Cy(e, t) {
  return b(e) || On(e)
    ? M({ [e]: t })
    : x(e, !1)
      ? M({ false: t })
      : x(e, !0)
        ? M({ true: t })
        : M({});
}
function wy() {
  return (wy = e(() => {
    (D(), Ig());
  }))();
}
function Ty(e, t) {
  return gv(eb, t);
}
function Ey() {
  return (Ey = e(() => {
    (nb(), _v());
  }))();
}
function Dy(e, t) {
  return C(e, `pattern`) && (b(e.pattern) || e.pattern instanceof RegExp)
    ? gv(e.pattern.toString(), t)
    : gv(tb, t);
}
function Oy() {
  return (Oy = e(() => {
    (D(), nb(), _v());
  }))();
}
function ky(e, t) {
  return tv(Y_(e)) ? By(py(e), t) : gv(e, t);
}
function Ay() {
  return (Ay = e(() => {
    (Vy(), X_(), nv(), U(), _v());
  }))();
}
function jy(e) {
  return V(e) ? My(e.anyOf) : [e];
}
function My(e, t = []) {
  return S(
    e,
    (e, n) => My(n, [...t, ...jy(e)]),
    () => t,
  );
}
function Ny() {
  return (Ny = e(() => {
    (D(), H());
  }))();
}
function Py(e) {
  return e.some((e) => K_(e) || B_(e) || E_(e));
}
function Fy(e, t) {
  return x(Py(e), !0) ? gv(tb, t) : void 0;
}
function Iy(e, t) {
  return e.reduce(
    (e, n) => (F_(n) && (b(n.const) || On(n.const)) ? { ...e, [n.const]: t } : e),
    {},
  );
}
function Ly(e, t) {
  return M(Iy(e, t));
}
function Ry(e, t) {
  let n = My(e),
    r = Fy(n, t);
  return Wh(r) ? r : Ly(n, t);
}
function zy() {
  return (zy = e(() => {
    (D(), k(), L_(), H_(), O_(), Ig(), q_(), nb(), Ny(), _v());
  }))();
}
function By(e, t) {
  return bg(e)
    ? vv(t)
    : w_(e)
      ? bv(t)
      : t_(e)
        ? _y(e.enum, t)
        : E_(e)
          ? yy(e, t)
          : i_(e)
            ? xy(e.allOf, t)
            : F_(e)
              ? Cy(e.const, t)
              : B_(e)
                ? Ty(e, t)
                : V(e)
                  ? Ry(e.anyOf, t)
                  : K_(e)
                    ? Dy(e, t)
                    : Jx(e)
                      ? ky(e.pattern, t)
                      : M({});
}
function Vy() {
  return (Vy = e(() => {
    (xg(),
      T_(),
      n_(),
      o_(),
      O_(),
      L_(),
      H_(),
      Ig(),
      q_(),
      Yx(),
      H(),
      yv(),
      xv(),
      vy(),
      by(),
      Sy(),
      wy(),
      Ey(),
      Oy(),
      Ay(),
      zy());
  }))();
}
function Hy(e, t, n) {
  return YA([e]) ? O(By(e, t), {}, n) : Gy(e, t, n);
}
function Uy(e, t, n, r, i) {
  return Hy(K(e, t, n), K(e, t, r), i);
}
function Wy() {
  return (Wy = e(() => {
    (Bh(), nb(), Vy(), q());
  }))();
}
function Gy(e, t, n = {}) {
  return Gh(`Record`, [e, t], n);
}
function Ky(e, t, n = {}) {
  return Hy(e, t, n);
}
function qy(e, t) {
  return gv(e, t);
}
function Jy(e) {
  return x(e, tb) ? z() : x(e, $y) ? F() : x(e, eb) ? R() : pv(e);
}
function Yy(e) {
  return w(e.patternProperties)[0];
}
function Xy(e) {
  return Jy(Yy(e));
}
function Zy(e) {
  return e.patternProperties[Yy(e)];
}
function Qy(e) {
  return Uh(e, `Record`);
}
var $y, eb, tb;
function nb() {
  return (nb = e(() => {
    (D(),
      k(),
      O_(),
      H_(),
      q_(),
      qh(),
      hv(),
      _v(),
      Wy(),
      ($y = `^${D_}$`),
      (eb = `^${V_}$`),
      (tb = `^.*$`));
  }))();
}
function rb(e) {
  return Ih({ "~kind": `Rest` }, { type: `rest`, items: e }, {});
}
function ib(e) {
  return Uh(e, `Rest`);
}
function ab() {
  return (ab = e(() => {
    (Lh(), k());
  }))();
}
function ob(e) {
  return Uh(e, `This`);
}
function sb() {
  return (sb = e(() => {
    k();
  }))();
}
function cb(e) {
  return Ih({ "~kind": `Undefined` }, { type: `undefined` }, e);
}
function lb(e) {
  return Uh(e, `Undefined`);
}
function ub() {
  return (ub = e(() => {
    (Lh(), k());
  }))();
}
function db(e) {
  return Uh(e, `Void`);
}
function fb() {
  return (fb = e(() => {
    k();
  }))();
}
function pb() {
  return (pb = e(() => {
    (c_(),
      u_(),
      kg(),
      y_(),
      xg(),
      ig(),
      C_(),
      T_(),
      NT(),
      cg(),
      Vg(),
      n_(),
      fg(),
      vg(),
      Xg(),
      O_(),
      o_(),
      L_(),
      Tg(),
      z_(),
      H_(),
      Rg(),
      G_(),
      Ig(),
      nb(),
      hg(),
      ab(),
      k(),
      q_(),
      Yx(),
      Tv(),
      ub(),
      H(),
      fb());
  }))();
}
function mb(e) {
  return b_();
}
function hb(e) {
  return z();
}
function gb(e) {
  return R();
}
function _b(e) {
  return F();
}
function vb(e) {
  return Sg();
}
function yb(e) {
  return I(e);
}
function bb(e) {
  return e;
}
function xb(e) {
  return B(e[1]);
}
function Sb(e) {
  return e.length === 3 ? [...e[0], ...e[2]] : e.length === 1 ? [...e[0]] : [];
}
function Cb(e) {
  return [e[0], ...e[1]];
}
function wb(e) {
  return e;
}
function Tb(e) {
  return e[1];
}
function Eb() {
  return (Eb = e(() => {
    (pb(), pj());
  }))();
}
function Db(e) {
  return x(e.length, 2);
}
function Ob(e, t, n) {
  return Db(e) ? t(e[0], e[1]) : n();
}
function kb() {
  return (kb = e(() => {
    tr();
  }))();
}
function Ab(e, t) {
  return x(t.indexOf(e), 0) ? [e, t.slice(e.length)] : [];
}
function jb(e, t) {
  for (let n = 0; n < e.length; n++) {
    let r = Ab(e[n], t);
    if (Db(r)) return r;
  }
  return [];
}
function Mb() {
  return (Mb = e(() => {
    (kb(), tr());
  }))();
}
function Nb(e, t) {
  return Array.from({ length: t - e + 1 }, (t, n) => String.fromCharCode(e + n));
}
var Pb, Fb, Ib;
function Lb() {
  return (Lb = e(() => {
    ((Pb = [...Nb(97, 122), ...Nb(65, 90)]), (Fb = Nb(49, 57)), (Ib = [`0`, ...Fb]));
  }))();
}
function Rb(e) {
  let t = e.indexOf(Gb);
  return x(t, -1) ? `` : e.slice(t + 2);
}
function zb(e) {
  let t = e.indexOf(`
`);
  return x(t, -1) ? `` : e.slice(t);
}
function Bb(e) {
  return e.replace(/^[ \t\r\f\v]+/, ``);
}
function Vb(e) {
  let t = Bb(e);
  return t.startsWith(Wb) ? Vb(Rb(t.slice(2))) : t.startsWith(Ub) ? Vb(zb(t.slice(2))) : t;
}
function Hb(e) {
  let t = e.trimStart();
  return t.startsWith(Wb) ? Hb(Rb(t.slice(2))) : t.startsWith(Ub) ? Hb(zb(t.slice(2))) : t;
}
var Ub, Wb, Gb;
function Kb() {
  return (Kb = e(() => {
    (tr(), Lb(), (Ub = `//`), (Wb = `/*`), (Gb = `*/`));
  }))();
}
function qb() {
  return (qb = e(() => {
    (Kb(), Lb(), [...Ib]);
  }))();
}
function Jb() {
  return (Jb = e(() => {
    (Kb(), Lb(), qb());
  }))();
}
function Yb() {
  return (Yb = e(() => {
    Jb();
  }))();
}
function Xb(e, t) {
  return jb([e], t);
}
function Zb(e, t) {
  return x(e, ``)
    ? [``, t]
    : e.startsWith(`
`)
      ? Xb(e, Vb(t))
      : e.startsWith(` `)
        ? Xb(e, t)
        : Xb(e, Hb(t));
}
function Qb() {
  return (Qb = e(() => {
    (tr(), Kb(), Mb(), Lb());
  }))();
}
var $b;
function ex() {
  return (ex = e(() => {
    (Kb(), Lb(), ($b = [...Pb, `_`, `$`]), [...$b, ...Ib]);
  }))();
}
function tx() {
  return (tx = e(() => {
    (Kb(), Lb(), qb(), [...Ib]);
  }))();
}
function nx() {
  return (nx = e(() => {
    (Kb(), Lb(), tx());
  }))();
}
function rx(e) {
  return x(e, ``) ? [] : [e.slice(0, 1), e.slice(1)];
}
function ix(e, t) {
  return S(
    e,
    (e, n) => (t.startsWith(e) ? !0 : ix(n, t)),
    () => !1,
  );
}
function ax(e, t, n = ``) {
  return Ob(
    rx(t),
    (r, i) => (ix(e, t) ? [n, t] : ax(e, i, `${n}${r}`)),
    () => [],
  );
}
function ox() {
  return (ox = e(() => {
    (kb(), tr());
  }))();
}
function sx() {
  return (sx = e(() => {
    (Kb(), Lb());
  }))();
}
function cx() {
  return (cx = e(() => {
    (Kb(), sx());
  }))();
}
function lx(e, t) {
  return Ob(
    ax(e, t),
    (e, t) => (x(e, ``) ? [] : [e, t]),
    () => [],
  );
}
function ux() {
  return (ux = e(() => {
    (tr(), kb(), ox());
  }))();
}
function dx() {
  return (dx = e(() => {
    (Yb(), Qb(), ex(), Jb(), nx(), sx(), cx(), qb(), tx(), ux(), ox());
  }))();
}
var W, fx, px, mx, hx, gx, _x, vx, yx, bx, xx, Sx, Cx;
function wx() {
  return (wx = e(() => {
    (Eb(),
      dx(),
      (W = (e, t, n = () => []) => (e.length === 2 ? t(e) : n())),
      (fx = (e) => W(Zb(`-?(?:0|[1-9][0-9]*)n`, e), ([e, t]) => [mb(e), t])),
      (px = (e) => W(Zb(`.*`, e), ([e, t]) => [hb(e), t])),
      (mx = (e) => W(Zb(`-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?`, e), ([e, t]) => [gb(e), t])),
      (hx = (e) => W(Zb(`-?(?:0|[1-9][0-9]*)`, e), ([e, t]) => [_b(e), t])),
      (gx = (e) => W(Zb(`(?!)`, e), ([e, t]) => [vb(e), t])),
      (_x = (e) =>
        W(
          lx(
            [
              `-?(?:0|[1-9][0-9]*)n`,
              `.*`,
              `-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?`,
              `-?(?:0|[1-9][0-9]*)`,
              `(?!)`,
              `(`,
              `)`,
              `$`,
              `|`,
            ],
            e,
          ),
          ([e, t]) => [yb(e), t],
        )),
      (vx = (e) =>
        W(
          W(
            fx(e),
            ([e, t]) => [e, t],
            () =>
              W(
                px(e),
                ([e, t]) => [e, t],
                () =>
                  W(
                    mx(e),
                    ([e, t]) => [e, t],
                    () =>
                      W(
                        hx(e),
                        ([e, t]) => [e, t],
                        () =>
                          W(
                            gx(e),
                            ([e, t]) => [e, t],
                            () =>
                              W(
                                yx(e),
                                ([e, t]) => [e, t],
                                () =>
                                  W(
                                    _x(e),
                                    ([e, t]) => [e, t],
                                    () => [],
                                  ),
                              ),
                          ),
                      ),
                  ),
              ),
          ),
          ([e, t]) => [bb(e), t],
        )),
      (yx = (e) =>
        W(
          W(Zb(`(`, e), ([e, t]) =>
            W(Sx(t), ([t, n]) => W(Zb(`)`, n), ([n, r]) => [[e, t, n], r])),
          ),
          ([e, t]) => [xb(e), t],
        )),
      (bx = (e) =>
        W(
          W(
            W(xx(e), ([e, t]) => W(Zb(`|`, t), ([t, n]) => W(bx(n), ([n, r]) => [[e, t, n], r]))),
            ([e, t]) => [e, t],
            () =>
              W(
                W(xx(e), ([e, t]) => [[e], t]),
                ([e, t]) => [e, t],
                () =>
                  W(
                    [[], e],
                    ([e, t]) => [e, t],
                    () => [],
                  ),
              ),
          ),
          ([e, t]) => [Sb(e), t],
        )),
      (xx = (e) =>
        W(
          W(vx(e), ([e, t]) => W(Sx(t), ([t, n]) => [[e, t], n])),
          ([e, t]) => [Cb(e), t],
        )),
      (Sx = (e) =>
        W(
          W(
            bx(e),
            ([e, t]) => [e, t],
            () =>
              W(
                xx(e),
                ([e, t]) => [e, t],
                () => [],
              ),
          ),
          ([e, t]) => [wb(e), t],
        )),
      (Cx = (e) =>
        W(
          W(Zb(`^`, e), ([e, t]) =>
            W(Sx(t), ([t, n]) => W(Zb(`$`, n), ([n, r]) => [[e, t, n], r])),
          ),
          ([e, t]) => [Tb(e), t],
        )));
  }))();
}
function Tx() {
  return (Tx = e(() => {
    wx();
  }))();
}
function Ex(e) {
  return e.join(`|`);
}
function Dx(e) {
  return e.slice(1, e.length - 1);
}
function Ox(e, t, n) {
  return zx(t, `${n}${e}`);
}
function kx(e, t) {
  return zx(e, `${t}${S_}`);
}
function Ax(e, t) {
  return zx(e, `${t}${D_}`);
}
function jx(e, t) {
  return zx(e, `${t}${V_}`);
}
function Mx(e, t) {
  return Rx(B([I(`false`), I(`true`)]), e, t);
}
function Nx(e, t) {
  return zx(e, `${t}.*`);
}
function Px(e, t, n) {
  return zx(t, `${n}${Dx(e)}`);
}
function Fx(e, t, n) {
  return Rx(Ux(e, {}), t, n);
}
function Ix(e, t, n) {
  return Rx(dy(e), t, n);
}
function Lx(e, t, n, r = []) {
  return S(
    e,
    (e, i) => Lx(i, t, n, [...r, Rx(e, [], ``)]),
    () => zx(t, `${n}(${Ex(r)})`),
  );
}
function Rx(e, t, n) {
  return t_(e)
    ? Ix(e.enum, t, n)
    : E_(e)
      ? Ax(t, n)
      : F_(e)
        ? Ox(e.const, t, n)
        : x_(e)
          ? kx(t, n)
          : w_(e)
            ? Mx(t, n)
            : B_(e)
              ? jx(t, n)
              : K_(e)
                ? Nx(t, n)
                : Jx(e)
                  ? Px(e.pattern, t, n)
                  : qx(e)
                    ? Fx(e.parameters[0], t, n)
                    : V(e)
                      ? Lx(e.anyOf, t, n)
                      : wg;
}
function zx(e, t) {
  return S(
    e,
    (e, n) => Rx(e, n, t),
    () => t,
  );
}
function Bx(e) {
  return `^${zx(e, ``)}$`;
}
function Vx(e) {
  return rv(Bx(e));
}
function Hx() {
  return (Hx = e(() => {
    (D(), n_(), L_(), H(), Yx(), C_(), q_(), H_(), O_(), T_(), Tg(), iv(), U(), Gx());
  }))();
}
function Ux(e, t) {
  return YA(e) ? O(Vx(e), {}, t) : Kx(e, t);
}
function Wx(e, t, n, r) {
  return Ux(QA(e, t, n), r);
}
function Gx() {
  return (Gx = e(() => {
    (Bh(), Yx(), Hx(), q());
  }))();
}
function Kx(e, t = {}) {
  return Gh(`TemplateLiteral`, [e], t);
}
function qx(e) {
  return Wh(e) && C(e, `action`) && x(e.action, `TemplateLiteral`);
}
function Jx(e) {
  return Uh(e, `TemplateLiteral`);
}
function Yx() {
  return (Yx = e(() => {
    (Vh(), D(), k(), qh(), Tx(), Gx());
  }))();
}
function Xx(e) {
  return Ih({ "~kind": `ExtendsUnion` }, { inferred: e });
}
function Zx(e) {
  return (
    y(e) && C(e, `~kind`) && C(e, `inferred`) && x(e[`~kind`], `ExtendsUnion`) && y(e.inferred)
  );
}
function G(e) {
  return Ih({ "~kind": `ExtendsTrue` }, { inferred: e });
}
function Qx(e) {
  return y(e) && C(e, `~kind`) && C(e, `inferred`) && x(e[`~kind`], `ExtendsTrue`) && y(e.inferred);
}
function $x() {
  return Ih({ "~kind": `ExtendsFalse` }, {});
}
function eS(e) {
  return y(e) && C(e, `~kind`) && x(e[`~kind`], `ExtendsFalse`);
}
function tS(e) {
  return Zx(e) || Qx(e);
}
function nS(e, t, n) {
  return tS(e) ? t(e.inferred) : n();
}
function rS() {
  return (rS = e(() => {
    (D(), Lh());
  }))();
}
function iS(e, t, n, r) {
  return nS(
    XC(e, n, r),
    (r) => G(yh(yh(e, r), { [t]: n })),
    () => $x(),
  );
}
function aS(e, t) {
  return G(e);
}
function oS(e, t, n, r, i) {
  return nS(
    XC(e, t, n),
    (e) =>
      nS(
        XC(e, t, r),
        (e) => G(e),
        () => $x(),
      ),
    () =>
      nS(
        XC(e, t, i),
        (e) => G(e),
        () => $x(),
      ),
  );
}
function sS(e, t, n) {
  return XC(e, t, dy(n));
}
function cS(e, t, n) {
  return S(
    n,
    (n, r) =>
      nS(
        XC(e, t, n),
        (e) => cS(e, t, r),
        () => $x(),
      ),
    () => G(e),
  );
}
function lS(e, t, n) {
  return XC(e, t, py(n));
}
function uS(e, t, n) {
  return S(
    n,
    (n, r) =>
      nS(
        XC(e, t, n),
        (e) => G(e),
        () => uS(e, t, r),
      ),
    () => $x(),
  );
}
function dS(e, t, n) {
  return bg(n)
    ? aS(e, t)
    : Jg(n)
      ? oS(e, t, n.if, n.then, n.else)
      : t_(n)
        ? sS(e, t, n.enum)
        : Gg(n)
          ? iS(e, n.name, t, n.extends)
          : i_(n)
            ? cS(e, t, n.allOf)
            : Jx(n)
              ? lS(e, t, n.pattern)
              : V(n)
                ? uS(e, t, n.anyOf)
                : Lg(n)
                  ? G(e)
                  : $x();
}
function fS() {
  return (fS = e(() => {
    (D(), bh(), xg(), Xg(), n_(), Kg(), o_(), Yx(), H(), Rg(), ZC(), rS(), U());
  }))();
}
function pS(e, t, n) {
  return Gg(n) ? dS(e, t, n) : bg(n) || Lg(n) ? G(e) : Xx(e);
}
function mS() {
  return (mS = e(() => {
    (Kg(), xg(), Rg(), fS(), rS());
  }))();
}
function hS(e, t) {
  let n = l_(e),
    r = l_(t);
  return (n && r) || (!n && r) ? !0 : !(n && !r);
}
function gS(e, t, n, r) {
  return ng(r) ? (hS(t, r) ? XC(e, n, r.items) : $x()) : dS(e, t, r);
}
function _S() {
  return (_S = e(() => {
    (ig(), u_(), fS(), ZC(), rS());
  }))();
}
function vS(e, t, n) {
  return x_(n) ? G(e) : dS(e, t, n);
}
function yS() {
  return (yS = e(() => {
    (C_(), fS(), rS());
  }))();
}
function bS(e, t, n) {
  return w_(n) ? G(e) : dS(e, t, n);
}
function xS() {
  return (xS = e(() => {
    (T_(), fS(), rS());
  }))();
}
function SS(e, t, n, r, i) {
  let a = Gg(r) ? t : r,
    o = Gg(r) ? r : t,
    s = Og(t),
    c = Og(r);
  return !s && c
    ? $x()
    : nS(
        XC(e, a, o),
        (e) => TS(e, n, i),
        () => $x(),
      );
}
function CS(e, t, n, r) {
  return S(
    r,
    (r, i) => SS(e, t, n, r, i),
    () => (Og(t) ? G(e) : $x()),
  );
}
function wS(e, t, n) {
  return S(
    t,
    (t, r) => CS(e, t, r, n),
    () => G(e),
  );
}
function TS(e, t, n) {
  return wS(e, t, n);
}
function ES() {
  return (ES = e(() => {
    (D(), Kg(), kg(), ZC(), rS());
  }))();
}
function DS(e, t, n) {
  return db(n) ? G(e) : XC(e, t, n);
}
function OS() {
  return (OS = e(() => {
    (fb(), ZC(), rS());
  }))();
}
function kS(e, t, n, r) {
  return bg(r) || Lg(r)
    ? G(e)
    : og(r)
      ? nS(
          TS(e, t, r.parameters),
          (e) => DS(e, n, r.instanceType),
          () => $x(),
        )
      : $x();
}
function AS() {
  return (AS = e(() => {
    (xg(), cg(), Rg(), rS(), ES(), OS());
  }))();
}
function jS(e, t, n, r, i) {
  return nS(
    XC(e, t, i),
    () => XC(e, n, i),
    () => XC(e, r, i),
  );
}
function MS() {
  return (MS = e(() => {
    (ZC(), rS());
  }))();
}
function NS(e, t, n) {
  return XC(e, dy(t), n);
}
function PS() {
  return (PS = e(() => {
    (ZC(), U());
  }))();
}
function FS(e, t, n, r) {
  return bg(r) || Lg(r)
    ? G(e)
    : ug(r)
      ? nS(
          TS(e, t, r.parameters),
          (e) => DS(e, n, r.returnType),
          () => $x(),
        )
      : $x();
}
function IS() {
  return (IS = e(() => {
    (xg(), fg(), Rg(), rS(), ES(), OS());
  }))();
}
function LS(e, t, n) {
  return E_(n) || B_(n) ? G(e) : dS(e, t, n);
}
function RS() {
  return (RS = e(() => {
    (O_(), H_(), fS(), rS());
  }))();
}
function zS(e, t, n) {
  return XC(e, fy(t), n);
}
function BS() {
  return (BS = e(() => {
    (ZC(), Yw());
  }))();
}
function VS(e, t, n) {
  return t === n ? G(e) : $x();
}
function HS(e, t, n) {
  return F_(n) ? VS(e, t, n.const) : x_(n) ? G(e) : dS(e, I(t), n);
}
function US(e, t, n) {
  return F_(n) ? VS(e, t, n.const) : w_(n) ? G(e) : dS(e, I(t), n);
}
function WS(e, t, n) {
  return F_(n) ? VS(e, t, n.const) : B_(n) ? G(e) : dS(e, I(t), n);
}
function GS(e, t, n) {
  return F_(n) ? VS(e, t, n.const) : K_(n) ? G(e) : dS(e, I(t), n);
}
function KS(e, t, n) {
  return Sn(t.const)
    ? HS(e, t.const, n)
    : Cn(t.const)
      ? US(e, t.const, n)
      : On(t.const)
        ? WS(e, t.const, n)
        : b(t.const)
          ? GS(e, t.const, n)
          : Zf();
}
function qS() {
  return (qS = e(() => {
    (D(), L_(), C_(), T_(), H_(), q_(), fS(), rS());
  }))();
}
function JS(e, t, n) {
  return Gg(n) ? dS(e, t, n) : G(e);
}
function YS() {
  return (YS = e(() => {
    (Kg(), fS(), rS());
  }))();
}
function XS(e, t, n) {
  return R_(n) ? G(e) : dS(e, t, n);
}
function ZS() {
  return (ZS = e(() => {
    (z_(), fS(), rS());
  }))();
}
function QS(e, t, n) {
  return B_(n) ? G(e) : dS(e, t, n);
}
function $S() {
  return ($S = e(() => {
    (H_(), fS(), rS());
  }))();
}
function eC(e, t, n) {
  return Og(t) ? (Og(n) ? G(e) : $x()) : G(e);
}
function tC(e, t, n) {
  return Gg(n) && Cg(n.extends)
    ? $x()
    : nS(
        XC(e, t, n),
        (e) => eC(e, t, n),
        () => $x(),
      );
}
function nC(e, t) {
  return e.reduce((e, n) => (n in t && tS(t[n]) ? { ...e, ...t[n].inferred } : Zf()), {});
}
function rC(e, t, n) {
  let r = {};
  for (let i of w(n))
    r[i] =
      i in t
        ? tC({}, t[i], n[i])
        : Og(n[i])
          ? Gg(n[i])
            ? G(yh(e, { [n[i].name]: n[i].extends }))
            : G(e)
          : $x();
  let i = Zn(r).every((e) => tS(e)),
    a = i ? nC(w(r), r) : {};
  return i ? G(a) : $x();
}
function iC(e, t, n) {
  let r = rC(e, t, n);
  return tS(r) ? G(yh(e, r.inferred)) : $x();
}
function aC(e, t, n) {
  return iC(e, t, n);
}
function oC(e, t) {
  return w(t).reduce(
    (n, r) => ({
      ...n,
      [r]: C(e, r) ? (V(n[r]) ? B([...n[r].anyOf, t[r]]) : B([e[r], t[r]])) : t[r],
    }),
    e,
  );
}
function sC(e, t, n, r) {
  return S(
    t,
    (t, i) =>
      nS(
        XC({}, e[t], n),
        (t) => sC(e, i, n, oC(r, t)),
        () => $x(),
      ),
    () => G(r),
  );
}
function cC(e, t, n, r) {
  return sC(t, w(t), r, e);
}
function lC(e, t, n) {
  return Qy(n) ? cC(e, t, Yy(n), Zy(n)) : Pg(n) ? aC(e, t, n.properties) : dS(e, M(t), n);
}
function uC() {
  return (uC = e(() => {
    (bh(), D(), kg(), Kg(), Tg(), Ig(), nb(), H(), ZC(), fS(), rS());
  }))();
}
function dC(e, t) {
  return x(w(t).length, 0) ? G(e) : $x();
}
function fC(e, t, n, r, i) {
  return XC(e, n, i);
}
function pC(e, t, n, r) {
  return Qy(r)
    ? fC(e, Jy(t), n, Jy(Yy(r)), Zy(r))
    : Pg(r)
      ? dC(e, r.properties)
      : bg(r) || Lg(r)
        ? G(e)
        : $x();
}
function mC() {
  return (mC = e(() => {
    (D(), xg(), Rg(), Ig(), nb(), ZC(), rS());
  }))();
}
function hC(e, t, n) {
  return K_(n) ? G(e) : dS(e, t, n);
}
function gC() {
  return (gC = e(() => {
    (q_(), fS(), rS());
  }))();
}
function _C(e, t, n) {
  return W_(n) ? G(e) : dS(e, t, n);
}
function vC() {
  return (vC = e(() => {
    (G_(), fS(), rS());
  }))();
}
function yC(e, t, n) {
  return XC(e, py(t), n);
}
function bC() {
  return (bC = e(() => {
    (ZC(), U());
  }))();
}
function xC(e, t) {
  return Ih({ "~kind": `Inferrable` }, { name: e, type: t }, {});
}
function SC(e) {
  return (
    y(e) &&
    C(e, `~kind`) &&
    C(e, `name`) &&
    C(e, `type`) &&
    x(e[`~kind`], `Inferrable`) &&
    b(e.name) &&
    y(e.type)
  );
}
function CC(e) {
  return ib(e)
    ? Gg(e.items)
      ? ng(e.items.extends)
        ? xC(e.items.name, e.items.extends.items)
        : Lg(e.items.extends)
          ? xC(e.items.name, e.items.extends)
          : void 0
      : Zf()
    : void 0;
}
function wC(e) {
  return Gg(e) ? xC(e.name, e.extends) : void 0;
}
function TC(e, t, n = []) {
  return S(
    e,
    (e, r) =>
      nS(
        XC({}, e, t),
        () => TC(r, t, [...n, e]),
        () => void 0,
      ),
    () => n,
  );
}
function EC(e, t, n, r) {
  let i = TC(n, r);
  return v(i) ? G(yh(e, { [t]: Sv(i) })) : $x();
}
function DC(e, t, n, r) {
  let i = TC(n, r);
  return v(i) ? G(yh(e, { [t]: B(i) })) : $x();
}
function OC() {
  return (OC = e(() => {
    (Lh(), bh(), D(), ig(), Rg(), Tv(), ZC(), H(), Kg(), ab(), rS());
  }))();
}
function kC(e) {
  return [...e].reverse();
}
function AC(e, t) {
  return t ? kC(e) : e;
}
function jC(e) {
  let t = e.length > 0 ? e[0] : void 0;
  return Wh(Wh(t) ? CC(t) : void 0);
}
function MC(e, t, n, r, i, a) {
  return nS(
    XC(e, n, i),
    (e) => FC(e, t, r, a),
    () => $x(),
  );
}
function NC(e, t, n, r, i) {
  let a = CC(r);
  return SC(a)
    ? EC(e, a.name, AC(n, t), a.type)
    : S(
        n,
        (n, a) => MC(e, t, n, a, r, i),
        () => $x(),
      );
}
function PC(e, t, n, r) {
  return S(
    r,
    (r, i) => NC(e, t, n, r, i),
    () => (x(n.length, 0) ? G(e) : $x()),
  );
}
function FC(e, t, n, r) {
  return PC(e, t, n, r);
}
function IC(e, t, n) {
  let r = ZA(e, JA([], []), n),
    i = jC(r);
  return FC(e, i, AC(t, i), AC(r, i));
}
function LC(e, t, n) {
  let r = wC(n);
  return SC(r)
    ? DC(e, r.name, t, r.type)
    : S(
        t,
        (t, r) =>
          nS(
            XC(e, t, n),
            (e) => LC(e, r, n),
            () => $x(),
          ),
        () => G(e),
      );
}
function RC(e, t, n) {
  let r = ZA(e, JA([], []), t);
  return Cv(n) ? IC(e, r, n.items) : ng(n) ? LC(e, r, n.items) : dS(e, Sv(r), n);
}
function zC() {
  return (zC = e(() => {
    (D(), k(), ig(), Tv(), ZC(), fS(), rS(), q(), OC());
  }))();
}
function BC(e, t, n) {
  return db(n) || lb(n) ? G(e) : dS(e, t, n);
}
function VC() {
  return (VC = e(() => {
    (ub(), fb(), fS(), rS());
  }))();
}
function HC(e, t, n) {
  return S(
    n,
    (n, r) =>
      nS(
        XC(e, t, n),
        (e) => G(e),
        () => HC(e, t, r),
      ),
    () => $x(),
  );
}
function UC(e, t, n) {
  return S(
    t,
    (t, r) =>
      nS(
        HC(e, t, n),
        (e) => UC(e, r, n),
        () => $x(),
      ),
    () => G(e),
  );
}
function WC(e, t, n) {
  let r = wC(n);
  return SC(r) ? DC(e, r.name, t, r.type) : V(n) ? UC(e, t, n.anyOf) : UC(e, t, [n]);
}
function GC() {
  return (GC = e(() => {
    (D(), H(), ZC(), rS(), OC());
  }))();
}
function KC(e, t, n) {
  return Gg(n) ? dS(e, t, n) : bg(n) || Lg(n) ? G(e) : $x();
}
function qC() {
  return (qC = e(() => {
    (xg(), Rg(), Kg(), fS(), rS());
  }))();
}
function JC(e, t, n) {
  return db(n) ? G(e) : dS(e, t, n);
}
function YC() {
  return (YC = e(() => {
    (fb(), fS(), rS());
  }))();
}
function XC(e, t, n) {
  return bg(t)
    ? pS(e, t, n)
    : ng(t)
      ? gS(e, t, t.items, n)
      : x_(t)
        ? vS(e, t, n)
        : w_(t)
          ? bS(e, t, n)
          : og(t)
            ? kS(e, t.parameters, t.instanceType, n)
            : Jg(t)
              ? jS(e, t.if, t.then, t.else, n)
              : t_(t)
                ? NS(e, t.enum, n)
                : ug(t)
                  ? FS(e, t.parameters, t.returnType, n)
                  : E_(t)
                    ? LS(e, t, n)
                    : i_(t)
                      ? zS(e, t.allOf, n)
                      : F_(t)
                        ? KS(e, t, n)
                        : Cg(t)
                          ? JS(e, t, n)
                          : R_(t)
                            ? XS(e, t, n)
                            : B_(t)
                              ? QS(e, t, n)
                              : Pg(t)
                                ? lC(e, t.properties, n)
                                : Qy(t)
                                  ? pC(e, Yy(t), Zy(t), n)
                                  : K_(t)
                                    ? hC(e, t, n)
                                    : W_(t)
                                      ? _C(e, t, n)
                                      : Jx(t)
                                        ? yC(e, t.pattern, n)
                                        : Cv(t)
                                          ? RC(e, t.items, n)
                                          : lb(t)
                                            ? BC(e, t, n)
                                            : V(t)
                                              ? WC(e, t.anyOf, n)
                                              : Lg(t)
                                                ? KC(e, t, n)
                                                : db(t)
                                                  ? JC(e, t, n)
                                                  : $x();
}
function ZC() {
  return (ZC = e(() => {
    (mS(),
      _S(),
      yS(),
      xS(),
      AS(),
      MS(),
      PS(),
      IS(),
      RS(),
      BS(),
      qS(),
      YS(),
      ZS(),
      $S(),
      uC(),
      mC(),
      gC(),
      vC(),
      bC(),
      zC(),
      VC(),
      GC(),
      qC(),
      YC(),
      xg(),
      ig(),
      C_(),
      T_(),
      cg(),
      Xg(),
      n_(),
      fg(),
      O_(),
      o_(),
      L_(),
      Tg(),
      z_(),
      H_(),
      Ig(),
      nb(),
      q_(),
      G_(),
      Yx(),
      Tv(),
      ub(),
      Rg(),
      H(),
      fb(),
      rS());
  }))();
}
function QC(e, t) {
  return fy([...e, M(t)]);
}
function $C(e, t, n) {
  return YA(e) ? O(QC(e, t), {}, n) : nw(e, t, n);
}
function ew(e, t, n, r, i) {
  return $C(QA(e, t, n), XA(e, t, r), i);
}
function tw() {
  return (tw = e(() => {
    (Bh(), Ig(), U(), pj(), q());
  }))();
}
function nw(e, t, n = {}) {
  return Gh(`Interface`, [e, t], n);
}
function rw(e) {
  return Wh(e) && C(e, `action`) && x(e.action, `Interface`);
}
function iw() {
  return (iw = e(() => {
    (D(), k(), qh(), tw());
  }))();
}
function aw(e, t, n) {
  return e.includes(n) ? !0 : cw([...e, n], t, t[n]);
}
function ow(e, t, n) {
  return sw(e, t, Mg(n));
}
function sw(e, t, n) {
  return S(
    n,
    (n, r) => (cw(e, t, n) ? !0 : sw(e, t, r)),
    () => !1,
  );
}
function cw(e, t, n) {
  return mg(n)
    ? aw(e, t, n.$ref)
    : ng(n)
      ? cw(e, t, n.items)
      : og(n)
        ? sw(e, t, [...n.parameters, n.instanceType])
        : ug(n)
          ? sw(e, t, [...n.parameters, n.returnType])
          : rw(n)
            ? ow(e, t, n.parameters[1])
            : i_(n)
              ? sw(e, t, n.allOf)
              : Pg(n)
                ? ow(e, t, n.properties)
                : V(n)
                  ? sw(e, t, n.anyOf)
                  : Cv(n)
                    ? sw(e, t, n.items)
                    : Qy(n)
                      ? cw(e, t, Zy(n))
                      : !1;
}
function lw(e, t, n) {
  return cw(e, t, n);
}
function uw() {
  return (uw = e(() => {
    (D(), ig(), cg(), fg(), o_(), Ig(), Ng(), nb(), Tv(), H(), hg(), iw());
  }))();
}
function dw(e, t) {
  return t.reduce((t, n) => (lw([n], e, e[n]) ? [...t, n] : t), []);
}
function fw(e) {
  return dw(e, jg(e));
}
function pw() {
  return (pw = e(() => {
    (Ng(), uw());
  }))();
}
function mw(e, t, n) {
  return n.includes(t) ? n : t in e ? _w(e, e[t], [...n, t]) : Zf();
}
function hw(e, t, n) {
  return gw(e, Mg(t), n);
}
function gw(e, t, n) {
  return t.reduce((t, n) => _w(e, n, t), n);
}
function _w(e, t, n) {
  return mg(t)
    ? mw(e, t.$ref, n)
    : ng(t)
      ? _w(e, t.items, n)
      : og(t)
        ? gw(e, [...t.parameters, t.instanceType], n)
        : ug(t)
          ? gw(e, [...t.parameters, t.returnType], n)
          : rw(t)
            ? hw(e, t.parameters[1], n)
            : i_(t)
              ? gw(e, t.allOf, n)
              : Pg(t)
                ? hw(e, t.properties, n)
                : V(t)
                  ? gw(e, t.anyOf, n)
                  : Cv(t)
                    ? gw(e, t.items, n)
                    : Qy(t)
                      ? _w(e, Zy(t), n)
                      : n;
}
function vw(e, t, n) {
  return _w(e, n, [t]);
}
function yw() {
  return (yw = e(() => {
    (ig(), cg(), fg(), o_(), Ig(), Ng(), nb(), Tv(), H(), hg(), iw());
  }))();
}
function bw(e) {
  return yg();
}
function xw(e) {
  return w(e).reduce((t, n) => ({ ...t, [n]: Cw(e[n]) }), {});
}
function Sw(e) {
  return e.reduce((e, t) => [...e, Cw(t)], []);
}
function Cw(e) {
  return mg(e)
    ? bw(e.$ref)
    : ng(e)
      ? A(Cw(e.items), rg(e))
      : og(e)
        ? ag(Sw(e.parameters), Cw(e.instanceType))
        : ug(e)
          ? lg(Sw(e.parameters), Cw(e.returnType))
          : i_(e)
            ? r_(Sw(e.allOf))
            : Pg(e)
              ? M(xw(e.properties))
              : Qy(e)
                ? Ky(Xy(e), Cw(Zy(e)))
                : V(e)
                  ? B(Sw(e.anyOf))
                  : Cv(e)
                    ? Sv(Sw(e.items))
                    : e;
}
function ww(e, t) {
  return t in e ? Cw(e[t]) : N();
}
function Tw(e) {
  return ww(e.$defs, e.$ref);
}
function Ew() {
  return (Ew = e(() => {
    (D(), xg(), ig(), cg(), fg(), o_(), Ig(), nb(), hg(), Tv(), H(), Rg());
  }))();
}
function Dw(e, t, n) {
  let r = QA(e, JA([], []), t),
    i = XA({}, JA([], []), n);
  return fy([...r, M(i)]);
}
function Ow(e, t) {
  return w(e)
    .filter((e) => t.includes(e))
    .reduce((t, n) => {
      let r = e[n],
        i = rw(r) ? Dw(e, r.parameters[0], r.parameters[1]) : r;
      return { ...t, [n]: i };
    }, {});
}
function kw(e, t, n) {
  return zg(Ow(e, vw(e, t, n)), t);
}
function Aw() {
  return (Aw = e(() => {
    (D(), Vg(), Ig(), yw(), pj(), q(), U());
  }))();
}
function jw(e, t) {
  return t in e ? (mg(e[t]) ? jw(e, e[t].$ref) : e[t]) : Sg();
}
function Mw(e, t) {
  return jw(e, t);
}
function Nw() {
  return (Nw = e(() => {
    (Tg(), hg());
  }))();
}
function Pw() {
  return (Pw = e(() => {
    (pw(), uw(), yw(), Ew(), Aw());
  }))();
}
function Fw(e) {
  return Bg(e) ? Tw(e) : Ug(e) ? N() : e;
}
function Iw(e, t, n) {
  return XC(e, Fw(t), Fw(n));
}
function Lw() {
  return (Lw = e(() => {
    (Vg(), Rg(), Wg(), ZC(), Pw());
  }))();
}
function Rw() {
  return (Rw = e(() => {
    (Lw(), rS());
  }))();
}
function zw(e, t) {
  let n = [Iw({}, e, t), Iw({}, t, e)];
  return tS(n[0]) && tS(n[1]) ? 0 : tS(n[0]) && eS(n[1]) ? 2 : eS(n[0]) && tS(n[1]) ? 3 : 1;
}
function Bw() {
  return (Bw = e(() => {
    Rw();
  }))();
}
function Vw(e, t, n = [], r = t) {
  return S(
    t,
    (t, i) => {
      let a = zw(e, t);
      return x(a, 2) || x(a, 0) ? r : x(a, 1) ? Vw(e, i, [...n, t], r) : Vw(e, i, n, r);
    },
    () => [...n, e],
  );
}
function Hw(e, t, n) {
  let r = hy(e);
  return bg(r) || Lg(r) ? [r] : Cg(r) ? Uw(t, n) : Pg(r) ? Uw(t, [...n, r]) : Uw(t, Vw(r, n));
}
function Uw(e, t = []) {
  return S(
    e,
    (e, n) => Hw(e, n, t),
    () => t,
  );
}
function Ww(e) {
  return My(Uw(e));
}
function Gw() {
  return (Gw = e(() => {
    (D(), xg(), Tg(), Ig(), Rg(), Bw(), Ny(), U());
  }))();
}
function Kw(e, t) {
  return O(hy(e), {}, t);
}
function qw(e, t, n, r) {
  return Kw(K(e, t, n), r);
}
function Jw() {
  return (Jw = e(() => {
    (Bh(), q(), U());
  }))();
}
function Yw() {
  return (Yw = e(() => {
    (Gw(), Bw(), Yv(), ay(), U(), Jw(), $v());
  }))();
}
function Xw(e, t = []) {
  return Kh(e) && x(e.action, `Conditional`)
    ? mg(e.parameters[0])
      ? Xw(e.parameters[2], Xw(e.parameters[3], [...t, e.parameters[0].$ref]))
      : Xw(e.parameters[2], Xw(e.parameters[3], t))
    : Kh(e) &&
        x(e.action, `Mapped`) &&
        Kh(e.parameters[1]) &&
        x(e.parameters[1].action, `KeyOf`) &&
        mg(e.parameters[1].parameters[0])
      ? [...t, e.parameters[1].parameters[0].$ref]
      : t;
}
function Zw(e, t) {
  return e.reduce((e, n) => [...e, t.includes(n.name)], []);
}
function Qw(e, t, n = []) {
  return S(
    e,
    (e, r) =>
      S(
        t,
        (t, i) => Qw(r, i, [...n, [t, e]]),
        () => n,
      ),
    () => n,
  );
}
function $w(e) {
  return Jx(e) ? py(e.pattern) : t_(e) ? dy(e.enum) : e;
}
function eT(e) {
  let t = $w(e);
  return V(t) ? [...t.anyOf] : [t];
}
function tT(e, t) {
  return e.reduce((e, n) => [...e, [...n, t]], []);
}
function nT(e, t) {
  return t.reduce((t, n) => [...t, ...tT(e, n)], []);
}
function rT(e) {
  return e.reduce((e, t) => (x(t[0], !0) ? nT(e, eT(t[1])) : nT(e, [t[1]])), [[]]);
}
function iT(e, t, n) {
  let r = Qw(t, Zw(e, Xw(n)));
  return (Kh(n) && x(n.action, `Conditional`)) || (Kh(n) && x(n.action, `Mapped`)) ? rT(r) : [t];
}
function aT() {
  return (aT = e(() => {
    (D(), H(), qh(), n_(), Yx(), hg(), U());
  }))();
}
function oT() {
  return [`(not-resolvable)`, Sg()];
}
function sT() {
  return [`(not-generic)`, Sg()];
}
function cT(e, t, n) {
  return [e, gg(t, n)];
}
function lT(e, t, n) {
  return t in e ? uT(e, t, e[t], n) : oT();
}
function uT(e, t, n, r) {
  return _g(n) ? cT(t, n.parameters, n.expression) : mg(n) ? lT(e, n.$ref, r) : sT();
}
function dT(e, t, n) {
  return uT(e, `(anonymous)`, t, n);
}
function fT() {
  return (fT = e(() => {
    (vg(), hg(), Tg());
  }))();
}
function pT(e, t, n) {
  if (Gg(t) || MT(t) || tS(Iw({}, t, n))) return;
  let r = { parameter: e, expect: n, actual: t };
  throw Error(`Argument for parameter ${e} does not satisfy constraint`, { cause: r });
}
function mT(e, t, n, r, i) {
  let a = K(e, t, i);
  return (pT(n, a, r), yh(e, { [n]: a }));
}
function hT(e, t, n, r, i) {
  let a = K(e, t, n.extends),
    o = K(e, t, n.equals);
  return S(
    i,
    (i, o) => gT(mT(e, t, n.name, a, i), t, r, o),
    () => gT(mT(e, t, n.name, a, o), t, r, []),
  );
}
function gT(e, t, n, r) {
  return S(
    n,
    (n, i) => hT(e, t, n, i, r),
    () => e,
  );
}
function _T(e, t, n, r) {
  return gT(e, t, n, r);
}
function vT() {
  return (vT = e(() => {
    (D(), bh(), q(), Rw(), Kg(), NT());
  }))();
}
function yT() {
  if (!Nn(kT, of().maxInstantiationCount))
    throw Error(`Type instantiation is excessively deep and possibly infinite`);
}
function bT() {
  (yT(), kT++, OT++);
}
function xT() {
  (OT--, x(OT, 0) && (kT = 0));
}
function ST(e) {
  return Mn(e.callstack.length, 0) ? e.callstack[e.callstack.length - 1] : ``;
}
function CT(e, t) {
  return x(ST(e), t);
}
function wT(e, t, n, r, i, a) {
  bT();
  try {
    let o = _T(e, t, r, a),
      s = K(o, JA([...t.callstack, n.$ref], t.visited), i);
    return K(o, JA([], []), s);
  } finally {
    xT();
  }
}
function TT(e, t, n, r, i, a) {
  return a.reduce((a, o) => {
    let s = wT(e, t, n, r, i, o);
    return [...a, s];
  }, []);
}
function ET(e, t, n, r, i, a) {
  let o = TT(e, t, n, r, i, iT(r, a, i));
  return x(o.length, 1) ? o[0] : my(o);
}
function DT(e, t, n, r) {
  let i = QA(e, t, r),
    a = dT(e, n, r),
    o = a[0],
    s = a[1];
  return _g(s)
    ? CT(t, o)
      ? jT(pg(o), i)
      : ET(e, t, pg(o), s.parameters, s.expression, i)
    : jT(n, i);
}
var OT, kT;
function AT() {
  return (AT = e(() => {
    (cf(), D(), NT(), hg(), vg(), Yw(), q(), aT(), fT(), vT(), (OT = 0), (kT = 0));
  }))();
}
function jT(e, t) {
  return Ih({ "~kind": `Call` }, { type: `call`, target: e, arguments: t }, {});
}
function MT(e) {
  return Uh(e, `Call`);
}
function NT() {
  return (NT = e(() => {
    (Lh(), k(), AT(), q());
  }))();
}
function PT(e) {
  return Rh(e, [`~immutable`]);
}
function FT(e, t) {
  return O(PT(e), {}, t);
}
function IT(e, t, n, r) {
  return FT(K(e, t, n), r);
}
function LT() {
  return (LT = e(() => {
    (zh(), Bh(), q());
  }))();
}
function RT(e, t) {
  return e(t);
}
function zT(e, t) {
  return b(t) ? I(RT(e, t)) : I(t);
}
function BT() {
  return (BT = e(() => {
    (D(), L_());
  }))();
}
function VT(e, t) {
  return GT(e, py(t));
}
function HT() {
  return (HT = e(() => {
    (KT(), Yw());
  }))();
}
function UT(e, t) {
  return B(t.map((t) => GT(e, t)));
}
function WT() {
  return (WT = e(() => {
    (H(), KT());
  }))();
}
function GT(e, t) {
  return F_(t) ? zT(e, t.const) : Jx(t) ? VT(e, t.pattern) : V(t) ? UT(e, t.anyOf) : t;
}
function KT() {
  return (KT = e(() => {
    (L_(), Yx(), H(), BT(), HT(), WT());
  }))();
}
function qT(e, t = {}) {
  return Gh(`Capitalize`, [e], t);
}
function JT() {
  return (JT = e(() => {
    (qh(), pE());
  }))();
}
function YT(e, t = {}) {
  return Gh(`Lowercase`, [e], t);
}
function XT() {
  return (XT = e(() => {
    (qh(), pE());
  }))();
}
function ZT(e, t = {}) {
  return Gh(`Uncapitalize`, [e], t);
}
function QT() {
  return (QT = e(() => {
    (qh(), pE());
  }))();
}
function $T(e, t = {}) {
  return Gh(`Uppercase`, [e], t);
}
function eE() {
  return (eE = e(() => {
    (qh(), pE());
  }))();
}
function tE(e, t) {
  return YA([e]) ? O(GT(lE, e), {}, t) : qT(e, t);
}
function nE(e, t) {
  return YA([e]) ? O(GT(uE, e), {}, t) : YT(e, t);
}
function rE(e, t) {
  return YA([e]) ? O(GT(dE, e), {}, t) : ZT(e, t);
}
function iE(e, t) {
  return YA([e]) ? O(GT(fE, e), {}, t) : $T(e, t);
}
function aE(e, t, n, r) {
  return tE(K(e, t, n), r);
}
function oE(e, t, n, r) {
  return nE(K(e, t, n), r);
}
function sE(e, t, n, r) {
  return rE(K(e, t, n), r);
}
function cE(e, t, n, r) {
  return iE(K(e, t, n), r);
}
var lE, uE, dE, fE;
function pE() {
  return (pE = e(() => {
    (Bh(),
      KT(),
      q(),
      JT(),
      XT(),
      QT(),
      eE(),
      (lE = (e) => e[0].toUpperCase() + e.slice(1)),
      (uE = (e) => e.toLowerCase()),
      (dE = (e) => e[0].toLowerCase() + e.slice(1)),
      (fE = (e) => e.toUpperCase()));
  }))();
}
function mE(e, t, n, r, i = {}) {
  return Gh(`Conditional`, [e, t, n, r], i);
}
function hE() {
  return (hE = e(() => {
    (qh(), yE(), q());
  }))();
}
function gE(e, t, n, r, i, a) {
  let o = Iw(e, n, r);
  return Zx(o) ? B([K(o.inferred, t, i), K(e, t, a)]) : Qx(o) ? K(o.inferred, t, i) : K(e, t, a);
}
function _E(e, t, n, r, i, a, o) {
  return YA([n, r]) ? O(gE(e, t, n, r, i, a), {}, o) : mE(n, r, i, a, o);
}
function vE(e, t, n, r, i, a, o) {
  return _E(e, t, K(e, t, n), K(e, t, r), i, a, o);
}
function yE() {
  return (yE = e(() => {
    (Bh(), H(), Rw(), q(), hE());
  }))();
}
function bE() {
  return (bE = e(() => {
    yE();
  }))();
}
function xE(e, t = {}) {
  return Gh(`ConstructorParameters`, [e], t);
}
function SE() {
  return (SE = e(() => {
    (qh(), EE());
  }))();
}
function CE(e) {
  let t = og(e) ? e.parameters : [];
  return Sv(ZA({}, JA([], []), t));
}
function wE(e, t) {
  return YA([e]) ? O(CE(e), {}, t) : xE(e, t);
}
function TE(e, t, n, r) {
  return wE(K(e, t, n), r);
}
function EE() {
  return (EE = e(() => {
    (Bh(), cg(), Tv(), SE(), q());
  }))();
}
function DE(e, t, n = {}) {
  return Gh(`Exclude`, [e, t], n);
}
function OE() {
  return (OE = e(() => {
    (qh(), jE());
  }))();
}
function kE(e, t, n) {
  return YA([e, t]) ? O(cy(e, t), {}, n) : DE(e, t, n);
}
function AE(e, t, n, r, i) {
  return kE(K(e, t, n), K(e, t, r), i);
}
function jE() {
  return (jE = e(() => {
    (Bh(), q(), OE(), ly());
  }))();
}
function ME(e, t, n = {}) {
  return Gh(`Extract`, [e, t], n);
}
function NE() {
  return (NE = e(() => {
    (qh(), BE());
  }))();
}
function PE(e, t) {
  return tS(Iw({}, e, t)) ? [e] : [];
}
function FE(e, t, n = []) {
  return S(
    e,
    (e, r) => FE(r, t, [...n, ...PE(e, t)]),
    () => n,
  );
}
function IE(e, t) {
  let n = hy(e);
  return my(FE(V(n) ? n.anyOf : [n], t));
}
function LE() {
  return (LE = e(() => {
    (D(), H(), Rw(), U());
  }))();
}
function RE(e, t, n) {
  return YA([e, t]) ? O(IE(e, t), {}, n) : ME(e, t, n);
}
function zE(e, t, n, r, i) {
  return RE(K(e, t, n), K(e, t, r), i);
}
function BE() {
  return (BE = e(() => {
    (Bh(), q(), NE(), LE());
  }))();
}
function VE(e, t, n = {}) {
  return Gh(`Index`, [e, t], n);
}
function HE() {
  return (HE = e(() => {
    (qh(), aO());
  }))();
}
function UE(e, t) {
  return rD(Mw(e, t));
}
function WE() {
  return (WE = e(() => {
    (iD(), Nw());
  }))();
}
function GE(e, t, n) {
  return rD(uy(e, t, n));
}
function KE() {
  return (KE = e(() => {
    (iD(), U());
  }))();
}
function qE(e, t) {
  let n = w(e).filter((e) => !C(t, e)),
    r = w(t).filter((t) => !C(e, t)),
    i = w(e).filter((e) => C(t, e)),
    a = n.reduce((t, n) => ({ ...t, [n]: e[n] }), {}),
    o = r.reduce((e, n) => ({ ...e, [n]: t[n] }), {}),
    s = i.reduce((n, r) => ({ ...n, [r]: fy([e[r], t[r]]) }), {});
  return yh(yh(a, o), s);
}
function JE(e) {
  return e.reduce((e, t) => qE(e, rD(t)), {});
}
function YE() {
  return (YE = e(() => {
    (bh(), D(), iD(), U());
  }))();
}
function XE(e) {
  return e;
}
function ZE(e) {
  return rD(zv(Sv(e)));
}
function QE() {
  return (QE = e(() => {
    (Tv(), Bv(), iD());
  }))();
}
function $E(e, t) {
  return w(e)
    .filter((e) => e in t)
    .reduce((n, r) => ({ ...n, [r]: my([e[r], t[r]]) }), {});
}
function eD(e, t) {
  return S(
    e,
    (e, n) => eD(n, $E(t, rD(e))),
    () => t,
  );
}
function tD(e) {
  return S(
    e,
    (e, t) => eD(t, rD(e)),
    () => Zf(),
  );
}
function nD() {
  return (nD = e(() => {
    (D(), U(), iD());
  }))();
}
function rD(e) {
  return Bg(e)
    ? UE(e.$defs, e.$ref)
    : Jg(e)
      ? GE(e.if, e.then, e.else)
      : i_(e)
        ? JE(e.allOf)
        : V(e)
          ? tD(e.anyOf)
          : Cv(e)
            ? ZE(e.items)
            : Pg(e)
              ? XE(e.properties)
              : {};
}
function iD() {
  return (iD = e(() => {
    (Vg(), Xg(), o_(), Ig(), Tv(), H(), WE(), KE(), YE(), QE(), nD());
  }))();
}
function aD(e) {
  return M(rD(e));
}
function oD() {
  return (oD = e(() => {
    (Ig(), iD());
  }))();
}
function sD() {
  return (sD = e(() => {
    oD();
  }))();
}
function cD(e) {
  let t = `${e}`;
  return lD.test(t) ? parseInt(t) : e;
}
var lD;
function uD() {
  return (uD = e(() => {
    lD = RegExp(`^(?:0|[1-9][0-9]*)$`);
  }))();
}
function dD(e) {
  return I(cD(e));
}
function fD(e) {
  return e.map((e) => pD(e));
}
function pD(e) {
  return i_(e) ? r_(fD(e.allOf)) : V(e) ? B(fD(e.anyOf)) : F_(e) ? dD(e.const) : e;
}
function mD(e, t) {
  return tS(Iw({}, pD(t), R())) ? e : F_(t) && x(t.const, `length`) ? R() : Sg();
}
function hD() {
  return (hD = e(() => {
    (D(), o_(), H(), L_(), H_(), Tg(), Rw(), uD());
  }))();
}
function gD(e, t) {
  return kD(Mw(e, t));
}
function _D() {
  return (_D = e(() => {
    (AD(), Nw());
  }))();
}
function vD(e, t, n) {
  return kD(uy(e, t, n));
}
function yD() {
  return (yD = e(() => {
    (AD(), U());
  }))();
}
function bD(e) {
  return kD(dy(e));
}
function xD() {
  return (xD = e(() => {
    (AD(), U());
  }))();
}
function SD(e) {
  return kD(fy(e));
}
function CD() {
  return (CD = e(() => {
    (U(), AD());
  }))();
}
function wD(e) {
  return [`${e}`];
}
function TD(e) {
  return kD(py(e));
}
function ED() {
  return (ED = e(() => {
    (AD(), U());
  }))();
}
function DD(e) {
  return e.reduce((e, t) => [...e, ...kD(t)], []);
}
function OD() {
  return (OD = e(() => {
    AD();
  }))();
}
function kD(e) {
  return Bg(e)
    ? gD(e.$defs, e.$ref)
    : Jg(e)
      ? vD(e.if, e.then, e.else)
      : t_(e)
        ? bD(e.enum)
        : i_(e)
          ? SD(e.allOf)
          : F_(e)
            ? wD(e.const)
            : Jx(e)
              ? TD(e.pattern)
              : V(e)
                ? DD(e.anyOf)
                : [];
}
function AD() {
  return (AD = e(() => {
    (Vg(), Xg(), n_(), o_(), L_(), Yx(), H(), _D(), yD(), xD(), CD(), ED(), OD());
  }))();
}
function jD(e) {
  return kD(e);
}
function MD() {
  return (MD = e(() => {
    AD();
  }))();
}
function ND(e, t) {
  return t.map((t) => PD(e, t));
}
function PD(e, t) {
  return ng(t)
    ? A(PD(e, t.items))
    : og(t)
      ? ag(ND(e, t.parameters), PD(e, t.instanceType))
      : ug(t)
        ? lg(ND(e, t.parameters), PD(e, t.returnType))
        : Cv(t)
          ? Sv(ND(e, t.items))
          : V(t)
            ? B(ND(e, t.anyOf))
            : i_(t)
              ? r_(ND(e, t.allOf))
              : ob(t)
                ? M(e)
                : t;
}
function FD(e, t) {
  return PD(e, t);
}
function ID() {
  return (ID = e(() => {
    (ig(), cg(), fg(), o_(), Ig(), Tv(), sb(), H());
  }))();
}
function LD(e, t) {
  return FD(e, t in e ? e[t] : Sg());
}
function RD(e, t) {
  return t.reduce((t, n) => [...t, LD(e, n)], []);
}
function zD(e, t) {
  return my(RD(e, jD(t)));
}
function BD(e) {
  return e.filter((e) => UD.test(e));
}
function VD(e) {
  return my(RD(e, BD(jg(e))));
}
function HD(e, t) {
  return B_(t) ? VD(e) : zD(e, t);
}
var UD;
function WD() {
  return (WD = e(() => {
    (H_(), Tg(), Ng(), U(), MD(), nb(), ID(), (UD = new RegExp($y)));
  }))();
}
function GD(e) {
  return I(cD(e));
}
function KD(e) {
  return e.map((e) => qD(e));
}
function qD(e) {
  return i_(e) ? r_(KD(e.allOf)) : V(e) ? B(KD(e.anyOf)) : F_(e) ? GD(e.const) : e;
}
function JD() {
  return (JD = e(() => {
    (H(), o_(), L_(), uD());
  }))();
}
function YD(e, t) {
  return e.reduceRight((e, n, r) => (tS(Iw({}, I(r), t)) ? [n, ...e] : e), []);
}
function XD(e, t) {
  return gy(YD(e, qD(t)));
}
function ZD(e) {
  return gy(e);
}
function QD(e, t) {
  return F_(t) && x(t.const, `length`) ? I(e.length) : B_(t) || E_(t) ? ZD(e) : XD(e, t);
}
function $D() {
  return ($D = e(() => {
    (D(), L_(), H_(), O_(), U(), Rw(), JD());
  }))();
}
function eO(e, t) {
  return ng(e) ? mD(e.items, t) : Pg(e) ? HD(e.properties, t) : Cv(e) ? QD(e.items, t) : Sg();
}
function tO() {
  return (tO = e(() => {
    (ig(), Tg(), Ig(), Tv(), hD(), WD(), $D());
  }))();
}
function nO(e) {
  return Bg(e) || Jg(e) || i_(e) || V(e) ? aD(e) : e;
}
function rO(e, t, n) {
  return YA([e, t]) ? O(eO(nO(e), t), {}, n) : VE(e, t, n);
}
function iO(e, t, n, r, i) {
  return rO(K(e, t, n), K(e, t, r), i);
}
function aO() {
  return (aO = e(() => {
    (Bh(), Vg(), Xg(), o_(), H(), q(), HE(), sD(), tO());
  }))();
}
function oO(e, t = {}) {
  return Gh(`InstanceType`, [e], t);
}
function sO() {
  return (sO = e(() => {
    (qh(), dO());
  }))();
}
function cO(e) {
  return og(e) ? e.instanceType : Sg();
}
function lO(e, t) {
  return YA([e]) ? O(cO(e), {}, t) : oO(e, t);
}
function uO(e, t, n, r = {}) {
  return lO(K(e, t, n), r);
}
function dO() {
  return (dO = e(() => {
    (Bh(), cg(), Tg(), sO(), q());
  }))();
}
function fO(e, t = {}) {
  return Gh(`KeyOf`, [e], t);
}
function pO() {
  return (pO = e(() => {
    (qh(), AO());
  }))();
}
function mO() {
  return B([R(), z(), U_()]);
}
function hO() {
  return (hO = e(() => {
    (H_(), q_(), G_(), H());
  }))();
}
function gO(e) {
  return R();
}
function _O() {
  return (_O = e(() => {
    H_();
  }))();
}
function vO(e) {
  return e.reduce((e, t) => (A_(t) ? [...e, I(cD(t))] : Zf()), []);
}
function yO(e) {
  return gy(vO(w(e)));
}
function bO() {
  return (bO = e(() => {
    (D(), L_(), uD(), U());
  }))();
}
function xO(e) {
  return Xy(e);
}
function SO() {
  return (SO = e(() => {
    nb();
  }))();
}
function CO(e) {
  return gy(e.map((e, t) => I(t)));
}
function wO() {
  return (wO = e(() => {
    (L_(), U());
  }))();
}
function TO(e) {
  return bg(e)
    ? mO()
    : ng(e)
      ? gO(e.items)
      : Pg(e)
        ? yO(e.properties)
        : Qy(e)
          ? xO(e)
          : Cv(e)
            ? CO(e.items)
            : Sg();
}
function EO() {
  return (EO = e(() => {
    (xg(), ig(), Tg(), Ig(), nb(), Tv(), hO(), _O(), bO(), SO(), wO());
  }))();
}
function DO(e) {
  return Bg(e) || Jg(e) || i_(e) || V(e) ? aD(e) : e;
}
function OO(e, t) {
  return YA([e]) ? O(TO(DO(e)), {}, t) : fO(e, t);
}
function kO(e, t, n, r) {
  return OO(K(e, t, n), r);
}
function AO() {
  return (AO = e(() => {
    (Bh(), Vg(), Xg(), o_(), H(), pO(), q(), sD(), EO());
  }))();
}
function jO(e, t, n, r, i = {}) {
  return Gh(`Mapped`, [e, t, n, r], i);
}
function MO() {
  return (MO = e(() => {
    (qh(), JO(), q());
  }))();
}
function NO(e) {
  return LO(py(e));
}
function PO(e) {
  return e.reduce((e, t) => [...e, ...LO(t)], []);
}
function FO(e) {
  return LO(dy(e));
}
function IO(e) {
  return On(e) ? [I(`${e}`)] : [I(e)];
}
function LO(e) {
  return t_(e)
    ? FO(e.enum)
    : F_(e)
      ? IO(e.const)
      : Jx(e)
        ? NO(e.pattern)
        : V(e)
          ? PO(e.anyOf)
          : [e];
}
function RO(e) {
  return LO(e);
}
function zO() {
  return (zO = e(() => {
    (D(), L_(), n_(), Yx(), H(), U());
  }))();
}
function BO(e) {
  return Jx(e) ? py(e.pattern) : e;
}
function VO(e, t, n, r, i, a) {
  let o = yh(e, { [n.name]: r }),
    s = BO(K(o, t, i)),
    c = K(o, t, a);
  return N_(s) || P_(s) ? { [s.const]: c } : {};
}
function HO(e, t, n, r, i, a) {
  return r.reduce((r, o) => [...r, VO(e, t, n, o, i, a)], []);
}
function UO(e) {
  return e.reduce((e, t) => [...e, M(t)], []);
}
function WO(e, t, n, r, i, a) {
  return fy(UO(HO(e, t, n, RO(r), i, a)));
}
function GO() {
  return (GO = e(() => {
    (bh(), L_(), Ig(), Yx(), q(), U(), zO());
  }))();
}
function KO(e, t, n, r, i, a, o) {
  return YA([r]) ? O(WO(e, t, n, r, i, a), {}, o) : jO(n, r, i, a, o);
}
function qO(e, t, n, r, i, a, o) {
  return KO(e, t, n, K(e, t, r), i, a, o);
}
function JO() {
  return (JO = e(() => {
    (Bh(), MO(), q(), GO());
  }))();
}
function YO(e, t, n) {
  let r = yh(e, t);
  return w(t)
    .filter((e) => n.includes(e))
    .reduce((e, n) => ({ ...e, [n]: kw(r, n, t[n]) }), {});
}
function XO(e, t, n) {
  let r = yh(e, t);
  return w(t)
    .filter((e) => !n.includes(e))
    .reduce((e, n) => ({ ...e, [n]: K(r, JA([], []), t[n]) }), {});
}
function ZO(e, t, n) {
  let r = fw(t),
    i = YO(e, t, r),
    a = XO(e, t, r);
  return O({ ...i, ...a }, {}, n);
}
function QO(e, t, n, r) {
  return ZO(e, n, r);
}
function $O() {
  return ($O = e(() => {
    (D(), bh(), Bh(), q(), pw(), Aw());
  }))();
}
function ek(e, t = {}) {
  return Gh(`NonNullable`, [e], t);
}
function tk() {
  return (tk = e(() => {
    (qh(), ak());
  }))();
}
function nk(e) {
  return kE(e, B([L(), cb()]), {});
}
function rk(e, t) {
  return YA([e]) ? O(nk(e), {}, t) : ek(e, t);
}
function ik(e, t, n, r) {
  return rk(K(e, t, n), r);
}
function ak() {
  return (ak = e(() => {
    (Bh(), z_(), ub(), H(), jE(), tk(), q());
  }))();
}
function ok(e, t, n = {}) {
  return Gh(`Omit`, [e, t], n);
}
function sk() {
  return (sk = e(() => {
    (qh(), hk());
  }))();
}
function ck(e) {
  let t = aD(e);
  return Pg(t) ? t.properties : Zf();
}
function lk() {
  return (lk = e(() => {
    (Ig(), sD());
  }))();
}
function uk(e, t) {
  return w(e).reduce((n, r) => (t.includes(r) ? n : { ...n, [r]: e[r] }), {});
}
function dk(e, t) {
  return M(uk(ck(e), jD(t)));
}
function fk() {
  return (fk = e(() => {
    (D(), Ig(), MD(), lk());
  }))();
}
function pk(e, t, n) {
  return YA([e, t]) ? O(dk(e, t), {}, n) : ok(e, t, n);
}
function mk(e, t, n, r, i) {
  return pk(K(e, t, n), K(e, t, r), i);
}
function hk() {
  return (hk = e(() => {
    (Bh(), sk(), q(), fk());
  }))();
}
function gk(e, t = {}) {
  return Gh(`Parameters`, [e], t);
}
function _k() {
  return (_k = e(() => {
    (qh(), xk());
  }))();
}
function vk(e) {
  let t = ug(e) ? e.parameters : [];
  return Sv(ZA({}, JA([], []), t));
}
function yk(e, t) {
  return YA([e]) ? O(vk(e), {}, t) : gk(e, t);
}
function bk(e, t, n, r) {
  return yk(K(e, t, n), r);
}
function xk() {
  return (xk = e(() => {
    (Bh(), fg(), Tv(), _k(), q());
  }))();
}
function Sk(e, t = {}) {
  return Gh(`Partial`, [e], t);
}
function Ck() {
  return (Ck = e(() => {
    (qh(), Rk());
  }))();
}
function wk(e, t) {
  let n = Pk(Mw(e, t));
  return zg(yh(e, { [t]: n }), t);
}
function Tk() {
  return (Tk = e(() => {
    (bh(), Vg(), Fk(), Nw());
  }))();
}
function Ek(e, t, n) {
  return Pk(uy(e, t, n));
}
function Dk() {
  return (Dk = e(() => {
    (Fk(), U());
  }))();
}
function Ok(e) {
  return Pk(fy(e));
}
function kk() {
  return (kk = e(() => {
    (Fk(), U());
  }))();
}
function Ak(e) {
  return B(e.map((e) => Pk(e)));
}
function jk() {
  return (jk = e(() => {
    (H(), Fk());
  }))();
}
function Mk(e) {
  return M(w(e).reduce((t, n) => ({ ...t, [n]: Eg(e[n]) }), {}));
}
function Nk() {
  return (Nk = e(() => {
    (D(), Ig(), Dg());
  }))();
}
function Pk(e) {
  return Bg(e)
    ? wk(e.$defs, e.$ref)
    : Jg(e)
      ? Ek(e.if, e.then, e.else)
      : i_(e)
        ? Ok(e.allOf)
        : V(e)
          ? Ak(e.anyOf)
          : Pg(e)
            ? Mk(e.properties)
            : M({});
}
function Fk() {
  return (Fk = e(() => {
    (Vg(), Xg(), o_(), Ig(), H(), Tk(), Dk(), kk(), jk(), Nk());
  }))();
}
function Ik(e, t) {
  return YA([e]) ? O(Pk(e), {}, t) : Sk(e, t);
}
function Lk(e, t, n, r) {
  return Ik(K(e, t, n), r);
}
function Rk() {
  return (Rk = e(() => {
    (Bh(), Ck(), Fk(), q());
  }))();
}
function zk(e, t, n = {}) {
  return Gh(`Pick`, [e, t], n);
}
function Bk() {
  return (Bk = e(() => {
    (qh(), Kk());
  }))();
}
function Vk(e, t) {
  return w(e).reduce((n, r) => (t.includes(r) ? yh(n, { [r]: e[r] }) : n), {});
}
function Hk(e, t) {
  return M(Vk(ck(e), jD(t)));
}
function Uk() {
  return (Uk = e(() => {
    (bh(), D(), Ig(), MD(), lk());
  }))();
}
function Wk(e, t, n) {
  return YA([e, t]) ? O(Hk(e, t), {}, n) : zk(e, t, n);
}
function Gk(e, t, n, r, i) {
  return Wk(K(e, t, n), K(e, t, r), i);
}
function Kk() {
  return (Kk = e(() => {
    (Bh(), Bk(), q(), Uk());
  }))();
}
function qk(e, t = {}) {
  return Gh(`ReadonlyObject`, [e], t);
}
function Jk() {
  return (Jk = e(() => {
    (qh(), pA());
  }))();
}
function Yk(e) {
  return sj(A(e));
}
function Xk() {
  return (Xk = e(() => {
    (ig(), cj());
  }))();
}
function Zk(e, t) {
  let n = lA(Mw(e, t));
  return zg(yh(e, { [t]: n }), t);
}
function Qk() {
  return (Qk = e(() => {
    (bh(), Vg(), uA(), Nw());
  }))();
}
function $k(e, t, n) {
  return lA(uy(e, t, n));
}
function eA() {
  return (eA = e(() => {
    (uA(), U());
  }))();
}
function tA(e) {
  return lA(fy(e));
}
function nA() {
  return (nA = e(() => {
    (uA(), U());
  }))();
}
function rA(e) {
  return M(w(e).reduce((t, n) => ({ ...t, [n]: d_(e[n]) }), {}));
}
function iA() {
  return (iA = e(() => {
    (D(), Ig(), f_());
  }))();
}
function aA(e) {
  return sj(Sv(e));
}
function oA() {
  return (oA = e(() => {
    (Tv(), cj());
  }))();
}
function sA(e) {
  return B(e.map((e) => lA(e)));
}
function cA() {
  return (cA = e(() => {
    (H(), uA());
  }))();
}
function lA(e) {
  return ng(e)
    ? Yk(e.items)
    : Bg(e)
      ? Zk(e.$defs, e.$ref)
      : Jg(e)
        ? $k(e.if, e.then, e.else)
        : i_(e)
          ? tA(e.allOf)
          : Pg(e)
            ? rA(e.properties)
            : Cv(e)
              ? aA(e.items)
              : V(e)
                ? sA(e.anyOf)
                : e;
}
function uA() {
  return (uA = e(() => {
    (ig(), Vg(), Xg(), o_(), Ig(), Tv(), H(), Xk(), Qk(), eA(), nA(), iA(), oA(), cA());
  }))();
}
function dA(e, t) {
  return YA([e]) ? O(lA(e), {}, t) : qk(e);
}
function fA(e, t, n, r) {
  return dA(K(e, t, n), r);
}
function pA() {
  return (pA = e(() => {
    (Bh(), Jk(), uA(), q());
  }))();
}
function mA(e, t, n, r) {
  return t.visited.includes(r) ? n : r in e ? K(e, JA(t.callstack, [...t.visited, r]), e[r]) : n;
}
function hA() {
  return (hA = e(() => {
    q();
  }))();
}
function gA(e, t) {
  let n = EA(Mw(e, t));
  return zg(yh(e, { [t]: n }), t);
}
function _A() {
  return (_A = e(() => {
    (bh(), Vg(), DA(), Nw());
  }))();
}
function vA(e, t, n) {
  return EA(uy(e, t, n));
}
function yA() {
  return (yA = e(() => {
    (DA(), U());
  }))();
}
function bA(e) {
  return EA(fy(e));
}
function xA() {
  return (xA = e(() => {
    (DA(), U());
  }))();
}
function SA(e) {
  return B(e.map((e) => EA(e)));
}
function CA() {
  return (CA = e(() => {
    (H(), DA());
  }))();
}
function wA(e) {
  return M(w(e).reduce((t, n) => ({ ...t, [n]: Iv(e[n]) }), {}));
}
function TA() {
  return (TA = e(() => {
    (D(), Ig(), Lv());
  }))();
}
function EA(e) {
  return Bg(e)
    ? gA(e.$defs, e.$ref)
    : Jg(e)
      ? vA(e.if, e.then, e.else)
      : i_(e)
        ? bA(e.allOf)
        : V(e)
          ? SA(e.anyOf)
          : Pg(e)
            ? wA(e.properties)
            : M({});
}
function DA() {
  return (DA = e(() => {
    (Vg(), Xg(), o_(), Ig(), H(), _A(), yA(), xA(), CA(), TA());
  }))();
}
function OA(e, t = {}) {
  return Gh(`Required`, [e], t);
}
function kA() {
  return (kA = e(() => {
    (qh(), MA());
  }))();
}
function AA(e, t) {
  return YA([e]) ? O(EA(e), {}, t) : OA(e, t);
}
function jA(e, t, n, r) {
  return AA(K(e, t, n), r);
}
function MA() {
  return (MA = e(() => {
    (Bh(), DA(), kA(), q());
  }))();
}
function NA(e, t = {}) {
  return Gh(`ReturnType`, [e], t);
}
function PA() {
  return (PA = e(() => {
    (qh(), RA());
  }))();
}
function FA(e) {
  return ug(e) ? e.returnType : Sg();
}
function IA(e, t) {
  return YA([e]) ? O(FA(e), {}, t) : NA(e, t);
}
function LA(e, t, n, r = {}) {
  return IA(K(e, t, n), r);
}
function RA() {
  return (RA = e(() => {
    (Bh(), fg(), Tg(), PA(), q());
  }))();
}
function zA(e, t) {
  return Gh(`With`, [e, t], {});
}
function BA(e, t) {
  return HA(e, t);
}
function VA() {
  return (VA = e(() => {
    (qh(), WA());
  }))();
}
function HA(e, t) {
  return YA([e]) ? O(e, {}, t) : zA(e, t);
}
function UA(e, t, n, r) {
  return HA(K(e, t, n), r);
}
function WA() {
  return (WA = e(() => {
    (Bh(), q(), VA());
  }))();
}
function GA(e) {
  return ib(e)
    ? Cv(e.items)
      ? KA(e.items.items)
      : Gg(e.items) || mg(e.items)
        ? [e]
        : [Sg()]
    : [e];
}
function KA(e) {
  return e.reduce((e, t) => [...e, ...GA(t)], []);
}
function qA() {
  return (qA = e(() => {
    (Kg(), Tg(), ab(), hg(), Tv());
  }))();
}
function JA(e, t) {
  return { callstack: e, visited: t };
}
function YA(e) {
  return S(
    e,
    (e, t) => !mg(e) && YA(t),
    () => !0,
  );
}
function XA(e, t, n) {
  return w(n).reduce((r, i) => ({ ...r, [i]: K(e, t, n[i]) }), {});
}
function ZA(e, t, n) {
  return KA(QA(e, t, n));
}
function QA(e, t, n) {
  return n.map((n) => K(e, t, n));
}
function $A(e, t) {
  let n = Og(e) ? $h(t, {}) : t,
    r = p_(e) ? Yh(n, {}) : n;
  return l_(e) ? ij(r, {}) : r;
}
function ej(e, t, n, r, i) {
  return x(n, `AddImmutable`)
    ? aj(e, t, r[0], i)
    : x(n, `RemoveImmutable`)
      ? IT(e, t, r[0], i)
      : x(n, `AddReadonly`)
        ? Xh(e, t, r[0], i)
        : x(n, `RemoveReadonly`)
          ? Ov(e, t, r[0], i)
          : x(n, `AddOptional`)
            ? eg(e, t, r[0], i)
            : x(n, `RemoveOptional`)
              ? Pv(e, t, r[0], i)
              : x(n, `Capitalize`)
                ? aE(e, t, r[0], i)
                : x(n, `Conditional`)
                  ? vE(e, t, r[0], r[1], r[2], r[3], i)
                  : x(n, `ConstructorParameters`)
                    ? TE(e, t, r[0], i)
                    : x(n, `Evaluate`)
                      ? qw(e, t, r[0], i)
                      : x(n, `Exclude`)
                        ? AE(e, t, r[0], r[1], i)
                        : x(n, `Extract`)
                          ? zE(e, t, r[0], r[1], i)
                          : x(n, `Index`)
                            ? iO(e, t, r[0], r[1], i)
                            : x(n, `InstanceType`)
                              ? uO(e, t, r[0], i)
                              : x(n, `Interface`)
                                ? ew(e, t, r[0], r[1], i)
                                : x(n, `KeyOf`)
                                  ? kO(e, t, r[0], i)
                                  : x(n, `Lowercase`)
                                    ? oE(e, t, r[0], i)
                                    : x(n, `Mapped`)
                                      ? qO(e, t, r[0], r[1], r[2], r[3], i)
                                      : x(n, `Module`)
                                        ? QO(e, t, r[0], i)
                                        : x(n, `NonNullable`)
                                          ? ik(e, t, r[0], i)
                                          : x(n, `Pick`)
                                            ? Gk(e, t, r[0], r[1], i)
                                            : x(n, `Parameters`)
                                              ? bk(e, t, r[0], i)
                                              : x(n, `Partial`)
                                                ? Lk(e, t, r[0], i)
                                                : x(n, `Omit`)
                                                  ? mk(e, t, r[0], r[1], i)
                                                  : x(n, `ReadonlyObject`)
                                                    ? fA(e, t, r[0], i)
                                                    : x(n, `Record`)
                                                      ? Uy(e, t, r[0], r[1], i)
                                                      : x(n, `Required`)
                                                        ? jA(e, t, r[0], i)
                                                        : x(n, `ReturnType`)
                                                          ? LA(e, t, r[0], i)
                                                          : x(n, `TemplateLiteral`)
                                                            ? Wx(e, t, r[0], i)
                                                            : x(n, `Uncapitalize`)
                                                              ? sE(e, t, r[0], i)
                                                              : x(n, `Uppercase`)
                                                                ? cE(e, t, r[0], i)
                                                                : x(n, `With`)
                                                                  ? UA(e, t, r[0], r[1])
                                                                  : Gh(n, r, i);
}
function tj(e, t, n) {
  return $A(
    n,
    mg(n)
      ? mA(e, t, n, n.$ref)
      : ng(n)
        ? A(K(e, t, n.items), rg(n))
        : MT(n)
          ? DT(e, t, n.target, n.arguments)
          : og(n)
            ? ag(QA(e, t, n.parameters), K(e, t, n.instanceType), sg(n))
            : ug(n)
              ? lg(QA(e, t, n.parameters), K(e, t, n.returnType), dg(n))
              : Jg(n)
                ? qg(K(e, t, n.if), K(e, t, n.then), K(e, t, n.else), Yg(n))
                : i_(n)
                  ? r_(QA(e, t, n.allOf), a_(n))
                  : Pg(n)
                    ? M(XA(e, t, n.properties), Fg(n))
                    : Qy(n)
                      ? qy(Yy(n), K(e, t, Zy(n)))
                      : ib(n)
                        ? rb(K(e, t, n.items))
                        : Cv(n)
                          ? Sv(ZA(e, t, n.items), wv(n))
                          : V(n)
                            ? B(QA(e, t, n.anyOf), J_(n))
                            : n,
  );
}
function K(e, t, n) {
  return Kh(n) ? ej(e, t, n.action, n.parameters, n.options) : tj(e, t, n);
}
function nj(e, t) {
  return K(e, JA([], []), t);
}
function q() {
  return (q = e(() => {
    (D(),
      oj(),
      Zh(),
      tg(),
      ig(),
      cg(),
      qh(),
      fg(),
      NT(),
      Xg(),
      o_(),
      Ig(),
      nb(),
      Tv(),
      H(),
      hg(),
      ab(),
      LT(),
      kv(),
      Fv(),
      kg(),
      u_(),
      m_(),
      AT(),
      pE(),
      bE(),
      EE(),
      Jw(),
      jE(),
      BE(),
      aO(),
      dO(),
      tw(),
      AO(),
      JO(),
      $O(),
      ak(),
      hk(),
      xk(),
      Rk(),
      Kk(),
      pA(),
      Wy(),
      hA(),
      MA(),
      RA(),
      Gx(),
      WA(),
      qA());
  }))();
}
function rj(e) {
  return O(e, { "~immutable": !0 }, {});
}
function ij(e, t) {
  return O(rj(e), {}, t);
}
function aj(e, t, n, r) {
  return ij(K(e, t, n), r);
}
function oj() {
  return (oj = e(() => {
    (Bh(), q());
  }))();
}
function sj(e, t = {}) {
  return ij(e, t);
}
function cj() {
  return (cj = e(() => {
    oj();
  }))();
}
function lj() {
  return (lj = e(() => {
    LT();
  }))();
}
function uj(e, t = {}) {
  return Kw(e, t);
}
function dj() {
  return (dj = e(() => {
    Jw();
  }))();
}
function fj() {
  return (fj = e(() => {
    (q(), $O());
  }))();
}
function pj() {
  return (pj = e(() => {
    (cj(),
      lj(),
      jv(),
      Lv(),
      JT(),
      hE(),
      SE(),
      dj(),
      OE(),
      NE(),
      HE(),
      sO(),
      iw(),
      pO(),
      XT(),
      MO(),
      fj(),
      tk(),
      sk(),
      _k(),
      Ck(),
      Bk(),
      Jk(),
      kA(),
      PA(),
      QT(),
      eE(),
      VA());
  }))();
}
function mj() {
  return (mj = e(() => {
    EE();
  }))();
}
function hj() {
  return (hj = e(() => {
    jE();
  }))();
}
function gj() {
  return (gj = e(() => {
    BE();
  }))();
}
function _j() {
  return (_j = e(() => {
    aO();
  }))();
}
function vj() {
  return (vj = e(() => {
    dO();
  }))();
}
function yj() {
  return (yj = e(() => {
    tw();
  }))();
}
function bj() {
  return (bj = e(() => {
    pE();
  }))();
}
function xj() {
  return (xj = e(() => {
    AO();
  }))();
}
function Sj() {
  return (Sj = e(() => {
    JO();
  }))();
}
function Cj() {
  return (Cj = e(() => {
    $O();
  }))();
}
function wj() {
  return (wj = e(() => {
    ak();
  }))();
}
function Tj() {
  return (Tj = e(() => {
    hk();
  }))();
}
function Ej() {
  return (Ej = e(() => {
    xk();
  }))();
}
function Dj() {
  return (Dj = e(() => {
    (X_(), Tx());
  }))();
}
function Oj() {
  return (Oj = e(() => {
    Rk();
  }))();
}
function kj() {
  return (kj = e(() => {
    Kk();
  }))();
}
function Aj(e, t) {
  let n = zw(e, t);
  return x(n, 3) ? 1 : +!!x(n, 1);
}
function jj(e, t, n = []) {
  return S(
    t,
    (r, i) => (x(Aj(e, r), 1) ? jj(e, i, [...n, r]) : [...n, e, ...t]),
    () => [...n, e],
  );
}
function Mj(e, t = []) {
  return S(
    e,
    (e, n) => Mj(n, jj(e, t)),
    () => t,
  );
}
function Nj(e) {
  return Mj(e);
}
function Pj() {
  return (Pj = e(() => {
    (D(), Bw());
  }))();
}
function Fj() {
  return (Fj = e(() => {
    Pj();
  }))();
}
function Ij() {
  return (Ij = e(() => {
    pA();
  }))();
}
function Lj() {
  return (Lj = e(() => {
    Wy();
  }))();
}
function Rj() {
  return (Rj = e(() => {
    hA();
  }))();
}
function zj() {
  return (zj = e(() => {
    MA();
  }))();
}
function Bj() {
  return (Bj = e(() => {
    RA();
  }))();
}
function Vj() {
  return (Vj = e(() => {
    X_();
  }))();
}
function Hj() {
  return (Hj = e(() => {
    (hv(), Hx(), Vj());
  }))();
}
function Uj() {
  return (Uj = e(() => {
    WA();
  }))();
}
function Wj() {
  return (Wj = e(() => {
    (q(),
      bE(),
      mj(),
      Pw(),
      Yw(),
      hj(),
      gj(),
      _j(),
      vj(),
      yj(),
      bj(),
      xj(),
      Sj(),
      Cj(),
      wj(),
      sD(),
      Tj(),
      Ej(),
      Dj(),
      Oj(),
      kj(),
      Fj(),
      Ij(),
      Lj(),
      Rj(),
      zj(),
      Bj(),
      Hj(),
      Uj());
  }))();
}
function Gj() {
  return (Gj = e(() => {
    (pb(), q(), wx());
  }))();
}
function Kj() {
  return (Kj = e(() => {
    Gj();
  }))();
}
function J() {
  return (J = e(() => {
    (pj(), Wj(), Rw(), Kj(), pb());
  }))();
}
function qj(e, t, n) {
  return v(n) ? n.map((n) => mM(e, t.items, n)) : n;
}
function Jj() {
  return (Jj = e(() => {
    (D(), hM());
  }))();
}
function Yj(e, t, n) {
  return mM({ ...e, ...t.$defs }, pg(t.$ref), n);
}
function Xj() {
  return (Xj = e(() => {
    (J(), hM());
  }))();
}
function Zj(e, t) {
  let n = C(t, `unevaluatedProperties`) ? { additionalProperties: t.unevaluatedProperties } : {},
    r = uj(nj(e, t));
  return Pg(r) ? BA(r, n) : r;
}
function Qj(e, t, n) {
  return mM(e, Zj(e, t), n);
}
function $j() {
  return ($j = e(() => {
    (J(), D(), hM());
  }))();
}
function eM(e) {
  return C(e, `additionalProperties`) ? e.additionalProperties : void 0;
}
function tM() {
  return (tM = e(() => {
    D();
  }))();
}
function nM(e, t, n) {
  if (!y(n) || v(n)) return n;
  let r = eM(t);
  for (let i of w(n)) {
    if (C(t.properties, i)) {
      n[i] = mM(e, t.properties[i], n[i]);
      continue;
    }
    if ((Cn(r) && x(r, !0)) || (Wh(r) && ch(e, r, n[i]))) {
      n[i] = mM(e, r, n[i]);
      continue;
    }
    delete n[i];
  }
  return n;
}
function rM() {
  return (rM = e(() => {
    (J(), D(), hM(), uh(), tM());
  }))();
}
function iM(e, t, n) {
  if (!y(n)) return n;
  let r = eM(t),
    [i, a] = [new RegExp(Yy(t)), Zy(t)];
  for (let t of w(n)) {
    if (i.test(t)) {
      n[t] = mM(e, a, n[t]);
      continue;
    }
    if ((Cn(r) && x(r, !0)) || (Wh(r) && ch(e, r, n[t]))) {
      n[t] = mM(e, r, n[t]);
      continue;
    }
    delete n[t];
  }
  return n;
}
function aM() {
  return (aM = e(() => {
    (J(), D(), hM(), uh(), tM());
  }))();
}
function oM(e, t, n) {
  return C(e, t.$ref) ? mM(e, e[t.$ref], n) : n;
}
function sM() {
  return (sM = e(() => {
    (D(), hM());
  }))();
}
function cM(e, t, n) {
  if (!v(n)) return n;
  let r = Math.min(n.length, t.items.length);
  for (let i = 0; i < r; i++) n[i] = mM(e, t.items[i], n[i]);
  return Mn(n.length, r) ? n.slice(0, r) : n;
}
function lM() {
  return (lM = e(() => {
    (D(), hM());
  }))();
}
function uM(e) {
  return Mh(e);
}
function dM() {
  return (dM = e(() => {
    Nh();
  }))();
}
function fM(e, t, n) {
  for (let r of t.anyOf) {
    let t = mM(e, r, uM(n));
    if (ch(e, r, t)) return t;
  }
  return n;
}
function pM() {
  return (pM = e(() => {
    (uh(), dM(), hM());
  }))();
}
function mM(e, t, n) {
  return ng(t)
    ? qj(e, t, n)
    : Bg(t)
      ? Yj(e, t, n)
      : i_(t)
        ? Qj(e, t, n)
        : Pg(t)
          ? nM(e, t, n)
          : Qy(t)
            ? iM(e, t, n)
            : mg(t)
              ? oM(e, t, n)
              : Cv(t)
                ? cM(e, t, n)
                : V(t)
                  ? fM(e, t, n)
                  : n;
}
function hM() {
  return (hM = e(() => {
    (J(), Jj(), Xj(), $j(), rM(), aM(), sM(), lM(), pM());
  }))();
}
function gM(e, t) {
  for (let n of ni.Keys(e)) ni.HasPropertyKey(t, n) || (t[n] = e[n]);
  return t;
}
function _M(e) {
  let t = {};
  for (let n of ni.Keys(e)) t[n] = bM(e[n]);
  return t;
}
function vM(e) {
  return yM(Nj(e));
}
function yM(e) {
  return e.map((e) => bM(e));
}
function bM(e) {
  return gM(
    e,
    ng(e)
      ? A(bM(e.items), rg(e))
      : i_(e)
        ? r_(yM(e.allOf))
        : V(e)
          ? B(vM(e.anyOf))
          : Pg(e)
            ? M(_M(e.properties))
            : Qy(e)
              ? Ky(Xy(e), bM(Zy(e)))
              : Cv(e)
                ? Sv(yM(e.items))
                : e,
  );
}
function xM(e) {
  return bM(e);
}
function SM() {
  return (SM = e(() => {
    (D(), J());
  }))();
}
function CM(...e) {
  let [t, n, r] = an(e, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [{}, e, t] });
  return mM(t, of().unionPrioritySort ? xM(n) : n, r);
}
function wM() {
  return (wM = e(() => {
    (Hh(), hM(), SM());
  }))();
}
function TM() {
  return (TM = e(() => {
    wM();
  }))();
}
function EM(e) {
  return y(e) && C(e, `value`);
}
function Y(e) {
  return { value: e };
}
function DM() {
  return (DM = e(() => {
    D();
  }))();
}
function OM(e) {
  return v(e) ? Y(e) : Y([e]);
}
function kM() {
  return (kM = e(() => {
    (D(), DM());
  }))();
}
function AM(e) {
  return x(e, !0) ? Y(BigInt(1)) : Y(BigInt(0));
}
function jM(e) {
  return IM.test(e);
}
function MM(e) {
  return LM.test(e);
}
function NM(e) {
  return RM.test(e);
}
function PM(e) {
  let t = e.toLowerCase();
  return jM(e)
    ? Y(BigInt(e.slice(0, e.length - 1)))
    : MM(e)
      ? Y(BigInt(e.split(`.`)[0]))
      : NM(e)
        ? Y(BigInt(e))
        : x(t, `false`)
          ? Y(BigInt(0))
          : x(t, `true`)
            ? Y(BigInt(1))
            : void 0;
}
function FM(e) {
  return Sn(e)
    ? Y(e)
    : Cn(e)
      ? AM(e)
      : On(e)
        ? Y(BigInt(Math.trunc(e)))
        : Dn(e)
          ? Y(BigInt(0))
          : b(e)
            ? PM(e)
            : jn(e)
              ? Y(BigInt(0))
              : void 0;
}
var IM, LM, RM;
function zM() {
  return (zM = e(() => {
    (D(),
      DM(),
      (IM = /^-?(0|[1-9]\d*)n$/),
      (LM = /^-?(0|[1-9]\d*)\.\d+$/),
      (RM = /^-?(0|[1-9]\d*)$/));
  }))();
}
function BM(e) {
  return x(e, BigInt(0)) ? Y(!1) : x(e, BigInt(1)) ? Y(!0) : void 0;
}
function VM(e) {
  return x(e, 0) ? Y(!1) : x(e, 1) ? Y(!0) : void 0;
}
function HM(e) {
  return x(e.toLowerCase(), `false`)
    ? Y(!1)
    : x(e.toLowerCase(), `true`)
      ? Y(!0)
      : x(e, `0`)
        ? Y(!1)
        : x(e, `1`)
          ? Y(!0)
          : void 0;
}
function UM(e) {
  return Sn(e)
    ? BM(e)
    : Cn(e)
      ? Y(e)
      : On(e)
        ? VM(e)
        : Dn(e)
          ? Y(!1)
          : b(e)
            ? HM(e)
            : jn(e)
              ? Y(!1)
              : void 0;
}
function WM() {
  return (WM = e(() => {
    (D(), DM());
  }))();
}
function GM(e) {
  return x(e, BigInt(0)) ? Y(null) : void 0;
}
function KM(e) {
  return x(e, !1) ? Y(null) : void 0;
}
function qM(e) {
  return x(e, 0) ? Y(null) : void 0;
}
function JM(e) {
  let t = e.toLowerCase();
  return x(t, `undefined`) || x(t, `null`) || x(e, ``) || x(e, `0`) ? Y(null) : void 0;
}
function YM(e) {
  return Sn(e)
    ? GM(e)
    : Cn(e)
      ? KM(e)
      : On(e)
        ? qM(e)
        : Dn(e)
          ? Y(null)
          : b(e)
            ? JM(e)
            : jn(e)
              ? Y(null)
              : void 0;
}
function XM() {
  return (XM = e(() => {
    (D(), DM());
  }))();
}
function ZM(e) {
  return e <= tN && e >= nN ? Y(Number(e)) : void 0;
}
function QM(e) {
  return Y(+!!e);
}
function $M(e) {
  let t = +e;
  if (On(t)) return Y(t);
  let n = e.toLowerCase();
  if (x(n, `false`)) return Y(0);
  if (x(n, `true`)) return Y(1);
  let r = FM(e);
  if (EM(r)) return r.value <= tN && r.value >= nN ? Y(Number(r.value)) : void 0;
}
function eN(e) {
  return Sn(e)
    ? ZM(e)
    : Cn(e)
      ? QM(e)
      : On(e)
        ? Y(e)
        : Dn(e)
          ? Y(0)
          : b(e)
            ? $M(e)
            : jn(e)
              ? Y(0)
              : void 0;
}
var tN, nN;
function rN() {
  return (rN = e(() => {
    (D(), DM(), zM(), (tN = BigInt(2 ** 53 - 1)), (nN = BigInt(-(2 ** 53 - 1))));
  }))();
}
function iN(e) {
  return Sn(e) || Cn(e) || On(e)
    ? Y(e.toString())
    : Dn(e)
      ? Y(`null`)
      : b(e)
        ? Y(e)
        : jn(e)
          ? Y(``)
          : void 0;
}
function aN() {
  return (aN = e(() => {
    (D(), DM());
  }))();
}
function oN(e) {
  return x(e, BigInt(0)) ? Y(void 0) : void 0;
}
function sN(e) {
  return x(e, !1) ? Y(void 0) : void 0;
}
function cN(e) {
  return x(e, 0) ? Y(void 0) : void 0;
}
function lN(e) {
  let t = e.toLowerCase();
  return x(t, `undefined`) || x(t, `null`) || x(e, ``) || x(e, `0`) ? Y(void 0) : void 0;
}
function uN(e) {
  return Sn(e)
    ? oN(e)
    : Cn(e)
      ? sN(e)
      : On(e)
        ? cN(e)
        : Dn(e)
          ? Y(void 0)
          : b(e)
            ? lN(e)
            : jn(e)
              ? Y(e)
              : void 0;
}
function dN() {
  return (dN = e(() => {
    (D(), DM());
  }))();
}
function fN() {
  return (fN = e(() => {
    (kM(), zM(), WM(), XM(), rN(), DM(), aN(), dN());
  }))();
}
function pN() {
  return (pN = e(() => {
    fN();
  }))();
}
function mN(e, t, n) {
  return OM(n).value.map((n) => cP(e, t.items, n));
}
function hN() {
  return (hN = e(() => {
    (lP(), pN());
  }))();
}
function gN(e, t, n) {
  let r = FM(n);
  return EM(r) ? r.value : n;
}
function _N() {
  return (_N = e(() => {
    pN();
  }))();
}
function vN(e, t, n) {
  let r = UM(n);
  return EM(r) ? r.value : n;
}
function yN() {
  return (yN = e(() => {
    pN();
  }))();
}
function bN(e, t, n) {
  return cP({ ...e, ...t.$defs }, pg(t.$ref), n);
}
function xN() {
  return (xN = e(() => {
    (J(), lP());
  }))();
}
function SN(e, t, n) {
  return cP(e, uj(t), n);
}
function CN() {
  return (CN = e(() => {
    (J(), lP());
  }))();
}
function wN(e, t, n) {
  let r = eN(n);
  return EM(r) ? Math.trunc(r.value) : n;
}
function TN() {
  return (TN = e(() => {
    pN();
  }))();
}
function EN(e, t, n) {
  return cP(e, uj(nj(e, t)), n);
}
function DN() {
  return (DN = e(() => {
    (J(), lP());
  }))();
}
function ON(e, t, n) {
  let r = FM(n);
  return EM(r) && x(t.const, r.value) ? r.value : n;
}
function kN(e, t, n) {
  let r = UM(n);
  return EM(r) && x(t.const, r.value) ? r.value : n;
}
function AN(e, t, n) {
  let r = eN(n);
  return EM(r) && x(t.const, r.value) ? r.value : n;
}
function jN(e, t, n) {
  let r = iN(n);
  return EM(r) && x(t.const, r.value) ? r.value : n;
}
function MN(e, t, n) {
  return x(t.const, n)
    ? n
    : j_(t)
      ? ON(e, t, n)
      : M_(t)
        ? kN(e, t, n)
        : N_(t)
          ? AN(e, t, n)
          : P_(t)
            ? jN(e, t, n)
            : Zf();
}
function NN() {
  return (NN = e(() => {
    (D(), J(), pN());
  }))();
}
function PN(e, t, n) {
  let r = YM(n);
  return EM(r) ? r.value : n;
}
function FN() {
  return (FN = e(() => {
    pN();
  }))();
}
function IN(e, t, n) {
  let r = eN(n);
  return EM(r) ? r.value : n;
}
function LN() {
  return (LN = e(() => {
    pN();
  }))();
}
function RN(e, t, n, r) {
  let i = w(r);
  for (let [a, o] of t) for (let t of i) a.test(t) || (r[t] = cP(e, n, r[t]));
  return r;
}
function zN() {
  return (zN = e(() => {
    (D(), lP());
  }))();
}
function BN(e, t, n) {
  return Og(e) && jn(n[t]);
}
function VN() {
  return (VN = e(() => {
    (D(), J());
  }))();
}
function HN(e, t, n) {
  let r = Jn(t.properties),
    i = w(n);
  for (let [t, a] of r) for (let r of i) !t.test(r) || BN(a, r, n) || (n[r] = cP(e, a, n[r]));
  return C(t, `additionalProperties`) && y(t.additionalProperties)
    ? RN(e, r, t.additionalProperties, n)
    : n;
}
function UN(e, t, n) {
  return kn(n) ? HN(e, t, n) : n;
}
function WN() {
  return (WN = e(() => {
    (D(), lP(), zN(), VN());
  }))();
}
function GN(e, t, n) {
  let r = Jn(t.patternProperties),
    i = w(n);
  for (let [t, a] of r) for (let r of i) t.test(r) && (n[r] = cP(e, a, n[r]));
  return C(t, `additionalProperties`) && y(t.additionalProperties)
    ? RN(e, r, t.additionalProperties, n)
    : n;
}
function KN(e, t, n) {
  return kn(n) ? GN(e, t, n) : n;
}
function qN() {
  return (qN = e(() => {
    (D(), lP(), zN());
  }))();
}
function JN(e, t, n) {
  return C(e, t.$ref) ? cP(e, e[t.$ref], n) : n;
}
function YN() {
  return (YN = e(() => {
    (lP(), D());
  }))();
}
function XN(e, t, n) {
  let r = iN(n);
  return EM(r) ? r.value : n;
}
function ZN() {
  return (ZN = e(() => {
    pN();
  }))();
}
function QN(e, t, n) {
  return cP(e, uj(t), n);
}
function $N() {
  return ($N = e(() => {
    (J(), lP());
  }))();
}
function eP(e, t, n) {
  if (!v(n)) return n;
  for (let r = 0; r < Math.min(t.items.length, n.length); r++) n[r] = cP(e, t.items[r], n[r]);
  return n;
}
function tP() {
  return (tP = e(() => {
    (D(), lP());
  }))();
}
function nP(e, t, n) {
  let r = uN(n);
  return EM(r) ? r.value : n;
}
function rP() {
  return (rP = e(() => {
    pN();
  }))();
}
function iP(e, t, n) {
  if (t.anyOf.some((t) => ch(e, t, n))) return n;
  let r = t.anyOf.map((t) => cP(e, t, uM(n))).find((n) => ch(e, t, n));
  return jn(r) ? n : r;
}
function aP() {
  return (aP = e(() => {
    (D(), uh(), dM(), lP());
  }))();
}
function oP(e, t, n) {
  return EM(uN(n)) ? void 0 : n;
}
function sP() {
  return (sP = e(() => {
    pN();
  }))();
}
function cP(e, t, n) {
  return ng(t)
    ? mN(e, t, n)
    : x_(t)
      ? gN(e, t, n)
      : w_(t)
        ? vN(e, t, n)
        : Bg(t)
          ? bN(e, t, n)
          : t_(t)
            ? SN(e, t, n)
            : E_(t)
              ? wN(e, t, n)
              : i_(t)
                ? EN(e, t, n)
                : F_(t)
                  ? MN(e, t, n)
                  : R_(t)
                    ? PN(e, t, n)
                    : B_(t)
                      ? IN(e, t, n)
                      : Pg(t)
                        ? UN(e, t, n)
                        : Qy(t)
                          ? KN(e, t, n)
                          : mg(t)
                            ? JN(e, t, n)
                            : K_(t)
                              ? XN(e, t, n)
                              : Jx(t)
                                ? QN(e, t, n)
                                : Cv(t)
                                  ? eP(e, t, n)
                                  : lb(t)
                                    ? nP(e, t, n)
                                    : V(t)
                                      ? iP(e, t, n)
                                      : db(t)
                                        ? oP(e, t, n)
                                        : n;
}
function lP() {
  return (lP = e(() => {
    (J(),
      hN(),
      _N(),
      yN(),
      xN(),
      CN(),
      TN(),
      DN(),
      NN(),
      FN(),
      LN(),
      WN(),
      qN(),
      YN(),
      ZN(),
      $N(),
      tP(),
      rP(),
      aP(),
      sP());
  }))();
}
function uP(...e) {
  let [t, n, r] = an(e, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [{}, e, t] });
  return cP(t, n, r);
}
function dP() {
  return (dP = e(() => {
    lP();
  }))();
}
function fP() {
  return (fP = e(() => {
    dP();
  }))();
}
function pP(e, t, n) {
  if (!v(n)) return n;
  for (let r = 0; r < n.length; r++) n[r] = jP(e, t.items, n[r]);
  return n;
}
function mP() {
  return (mP = e(() => {
    (D(), MP());
  }))();
}
function hP(e, t, n) {
  return jP({ ...e, ...t.$defs }, pg(t.$ref), n);
}
function gP() {
  return (gP = e(() => {
    (J(), MP());
  }))();
}
function _P(e, t) {
  return jn(t) ? (Tn(e.default) ? e.default() : uM(e.default)) : t;
}
function vP() {
  return (vP = e(() => {
    (D(), dM());
  }))();
}
function yP(e, t, n) {
  return jP(e, uj(nj(e, t)), n);
}
function bP() {
  return (bP = e(() => {
    (J(), MP());
  }))();
}
function xP(e, t, n) {
  if (!y(n)) return n;
  let r = w(t.properties);
  for (let i of r) {
    let r = jP(e, t.properties[i], n[i]);
    (jn(r) && (Og(t.properties[i]) || !C(t.properties[i], `default`))) || (n[i] = r);
  }
  if (!di(t) || Cn(t.additionalProperties)) return n;
  for (let i of w(n)) r.includes(i) || (n[i] = jP(e, t.additionalProperties, n[i]));
  return n;
}
function SP() {
  return (SP = e(() => {
    (J(), D(), MP(), fi());
  }))();
}
function CP(e, t, n) {
  if (!y(n)) return n;
  let [r, i] = [new RegExp(Yy(t)), Zy(t)];
  for (let t of w(n)) r.test(t) && Ci(i) && (n[t] = jP(e, i, n[t]));
  if (!di(t)) return n;
  for (let i of w(n)) r.test(i) || (n[i] = jP(e, t.additionalProperties, n[i]));
  return n;
}
function wP() {
  return (wP = e(() => {
    (J(), fi(), wi(), D(), MP());
  }))();
}
function TP(e, t, n) {
  return C(e, t.$ref) ? jP(e, e[t.$ref], n) : n;
}
function EP() {
  return (EP = e(() => {
    (D(), MP());
  }))();
}
function DP(e, t, n) {
  if (!v(n)) return n;
  let [r, i] = [t.items, Math.max(t.items.length, n.length)];
  for (let t = 0; t < i; t++) t < r.length && (n[t] = jP(e, r[t], n[t]));
  return n;
}
function OP() {
  return (OP = e(() => {
    (D(), MP());
  }))();
}
function kP(e, t, n) {
  for (let r of t.anyOf) {
    let t = jP(e, r, uM(n));
    if (ch(e, r, t)) return t;
  }
  return n;
}
function AP() {
  return (AP = e(() => {
    (uh(), dM(), MP());
  }))();
}
function jP(e, t, n) {
  let r = Ci(t) ? _P(t, n) : n;
  return ng(t)
    ? pP(e, t, r)
    : Bg(t)
      ? hP(e, t, r)
      : i_(t)
        ? yP(e, t, r)
        : Pg(t)
          ? xP(e, t, r)
          : Qy(t)
            ? CP(e, t, r)
            : mg(t)
              ? TP(e, t, r)
              : Cv(t)
                ? DP(e, t, r)
                : V(t)
                  ? kP(e, t, r)
                  : r;
}
function MP() {
  return (MP = e(() => {
    (sh(), J(), mP(), gP(), vP(), bP(), SP(), wP(), EP(), OP(), AP());
  }))();
}
function NP(...e) {
  let [t, n, r] = an(e, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [{}, e, t] });
  return jP(t, n, r);
}
function PP() {
  return (PP = e(() => {
    MP();
  }))();
}
function FP() {
  return (FP = e(() => {
    PP();
  }))();
}
function IP(e) {
  return (...t) => {
    let [n, r, i] = an(t, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [{}, e, t] });
    return e.reduce((e, t) => t(n, r, e), i);
  };
}
function LP() {
  return (LP = e(() => {}))();
}
function RP(e, t, n) {
  return t[`~codec`].decode(n);
}
function zP(e, t, n) {
  return t[`~codec`].encode(n);
}
function BP(e, t, n, r) {
  return s_(n) ? (x(e, `Decode`) ? RP(t, n, r) : zP(t, n, r)) : r;
}
function VP() {
  return (VP = e(() => {
    (D(), J());
  }))();
}
function HP(e, t, n, r) {
  if (!v(r)) return r;
  for (let i = 0; i < r.length; i++) r[i] = yF(e, t, n.items, r[i]);
  return BP(e, t, n, r);
}
function UP(e, t, n, r) {
  let i = BP(e, t, n, r);
  if (!v(i)) return i;
  for (let r = 0; r < i.length; r++) i[r] = yF(e, t, n.items, i[r]);
  return i;
}
function WP(e, t, n, r) {
  return x(e, `Decode`) ? HP(e, t, n, r) : UP(e, t, n, r);
}
function GP() {
  return (GP = e(() => {
    (D(), bF(), VP());
  }))();
}
function KP(e, t, n, r) {
  return ((r = yF(e, { ...t, ...n.$defs }, pg(n.$ref), r)), BP(e, t, n, r));
}
function qP() {
  return (qP = e(() => {
    (J(), bF(), VP());
  }))();
}
function JP(e) {
  return e.reduce((e, t) => ({ ...e, ...t }), {});
}
function YP(e, t) {
  for (let n of t) if (!er(e, n)) return n;
  return e;
}
function XP(e, t, n, r) {
  if (x(n.allOf.length, 0)) return BP(e, t, n, r);
  let i = n.allOf.map((n) => yF(e, t, n, CM(n, uM(r))));
  return BP(e, t, n, i.every((e) => y(e)) ? JP(i) : YP(r, i));
}
function ZP(e, t, n, r) {
  if (x(n.allOf.length, 0)) return BP(e, t, n, r);
  let i = BP(e, t, n, r),
    a = n.allOf.map((n) => yF(e, t, n, CM(n, uM(i))));
  return a.every((e) => y(e)) ? JP(a) : YP(i, a);
}
function QP(e, t, n, r) {
  return x(e, `Decode`) ? XP(e, t, n, r) : ZP(e, t, n, r);
}
function $P() {
  return ($P = e(() => {
    (D(), bF(), VP(), dM(), TM());
  }))();
}
function eF(e, t, n, r) {
  if (!kn(r)) return r;
  for (let i of w(n.properties))
    !C(r, i) || BN(n.properties[i], i, r) || (r[i] = yF(e, t, n.properties[i], r[i]));
  return BP(e, t, n, r);
}
function tF(e, t, n, r) {
  let i = BP(e, t, n, r);
  if (!kn(i)) return i;
  for (let r of w(n.properties))
    !C(i, r) || BN(n.properties[r], r, i) || (i[r] = yF(e, t, n.properties[r], i[r]));
  return i;
}
function nF(e, t, n, r) {
  return x(e, `Decode`) ? eF(e, t, n, r) : tF(e, t, n, r);
}
function rF() {
  return (rF = e(() => {
    (D(), bF(), VP(), VN());
  }))();
}
function iF(e, t, n, r) {
  if (!kn(r)) return r;
  let i = new RegExp(Yy(n));
  for (let a of w(r)) i.test(a) && (r[a] = yF(e, t, Zy(n), r[a]));
  return BP(e, t, n, r);
}
function aF(e, t, n, r) {
  let i = BP(e, t, n, r);
  if (!kn(i)) return i;
  let a = new RegExp(Yy(n));
  for (let r of w(i)) a.test(r) && (i[r] = yF(e, t, Zy(n), i[r]));
  return i;
}
function oF(e, t, n, r) {
  return x(e, `Decode`) ? iF(e, t, n, r) : aF(e, t, n, r);
}
function sF() {
  return (sF = e(() => {
    (D(), J(), bF(), VP());
  }))();
}
function cF(e, t, n, r) {
  return C(t, n.$ref) ? yF(e, t, t[n.$ref], r) : r;
}
function lF(e, t, n, r) {
  return x(e, `Decode`) ? BP(e, t, n, cF(e, t, n, r)) : cF(e, t, n, BP(e, t, n, r));
}
function uF() {
  return (uF = e(() => {
    (D(), bF(), VP());
  }))();
}
function dF(e, t, n, r) {
  if (!v(r)) return r;
  for (let i = 0; i < Math.min(n.items.length, r.length); i++) r[i] = yF(e, t, n.items[i], r[i]);
  return BP(e, t, n, r);
}
function fF(e, t, n, r) {
  let i = BP(e, t, n, r);
  if (!v(i)) return r;
  for (let r = 0; r < Math.min(n.items.length, i.length); r++) i[r] = yF(e, t, n.items[r], i[r]);
  return i;
}
function pF(e, t, n, r) {
  return x(e, `Decode`) ? dF(e, t, n, r) : fF(e, t, n, r);
}
function mF() {
  return (mF = e(() => {
    (D(), bF(), VP());
  }))();
}
function hF(e, t, n, r) {
  for (let i of n.anyOf) if (ch(t, i, r)) return BP(e, t, n, yF(e, t, i, r));
  return r;
}
function gF(e, t, n, r) {
  let i = BP(e, t, n, r);
  for (let r of n.anyOf) {
    let n = yF(e, t, r, uM(i));
    if (ch(t, r, n)) return n;
  }
  return i;
}
function _F(e, t, n, r) {
  return x(e, `Decode`) ? hF(e, t, n, r) : gF(e, t, n, r);
}
function vF() {
  return (vF = e(() => {
    (D(), VP(), bF(), dM(), uh());
  }))();
}
function yF(e, t, n, r) {
  return ng(n)
    ? WP(e, t, n, r)
    : Bg(n)
      ? KP(e, t, n, r)
      : i_(n)
        ? QP(e, t, n, r)
        : Pg(n)
          ? nF(e, t, n, r)
          : Qy(n)
            ? oF(e, t, n, r)
            : mg(n)
              ? lF(e, t, n, r)
              : Cv(n)
                ? pF(e, t, n, r)
                : V(n)
                  ? _F(e, t, n, r)
                  : BP(e, t, n, r);
}
function bF() {
  return (bF = e(() => {
    (J(), GP(), qP(), $P(), rF(), sF(), uF(), mF(), vF(), VP());
  }))();
}
function xF(e, t, n) {
  if (!ch(e, t, n)) throw new wF(n, dh(e, t, n));
  return n;
}
function SF(e, t, n) {
  return yF(`Decode`, e, of().unionPrioritySort ? xM(t) : t, n);
}
function CF(...e) {
  let [t, n, r] = an(e, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [{}, e, t] });
  return TF(t, n, r);
}
var wF, TF;
function EF() {
  return (EF = e(() => {
    (Hh(),
      gh(),
      uh(),
      ph(),
      TM(),
      dM(),
      fP(),
      FP(),
      LP(),
      bF(),
      SM(),
      (wF = class extends mh {
        constructor(e, t) {
          super(`Decode`, e, t);
        }
      }),
      (TF = IP([
        (e, t, n) => uM(n),
        (e, t, n) => NP(e, t, n),
        (e, t, n) => uP(e, t, n),
        (e, t, n) => CM(e, t, n),
        (e, t, n) => xF(e, t, n),
        (e, t, n) => SF(e, t, n),
      ])));
  }))();
}
function DF(e, t, n) {
  if (!ch(e, t, n)) throw new AF(n, dh(e, t, n));
  return n;
}
function OF(e, t, n) {
  return yF(`Encode`, e, of().unionPrioritySort ? xM(t) : t, n);
}
function kF(...e) {
  let [t, n, r] = an(e, { 3: (e, t, n) => [e, t, n], 2: (e, t) => [{}, e, t] });
  return jF(t, n, r);
}
var AF, jF;
function MF() {
  return (MF = e(() => {
    (Hh(),
      gh(),
      uh(),
      ph(),
      TM(),
      dM(),
      fP(),
      FP(),
      LP(),
      bF(),
      SM(),
      (AF = class extends mh {
        constructor(e, t) {
          super(`Encode`, e, t);
        }
      }),
      (jF = IP([
        (e, t, n) => uM(n),
        (e, t, n) => OF(e, t, n),
        (e, t, n) => NP(e, t, n),
        (e, t, n) => uP(e, t, n),
        (e, t, n) => CM(e, t, n),
        (e, t, n) => DF(e, t, n),
      ])));
  }))();
}
function NF(e, t) {
  return s_(t) || VF(e, t.items);
}
function PF(e, t) {
  return s_(t) || RF({ ...e, ...t.$defs }, pg(t.$ref));
}
function FF(e, t) {
  return s_(t) || t.allOf.some((t) => VF(e, t));
}
function IF(e, t) {
  return s_(t) || w(t.properties).some((n) => VF(e, t.properties[n]));
}
function LF(e, t) {
  return s_(t) || VF(e, Zy(t));
}
function RF(e, t) {
  return !UF.has(t.$ref) && (UF.add(t.$ref), s_(t) || (C(e, t.$ref) && VF(e, e[t.$ref])));
}
function zF(e, t) {
  return s_(t) || t.items.some((t) => VF(e, t));
}
function BF(e, t) {
  return s_(t) || t.anyOf.some((t) => VF(e, t));
}
function VF(e, t) {
  return ng(t)
    ? NF(e, t)
    : Bg(t)
      ? PF(e, t)
      : i_(t)
        ? FF(e, t)
        : Pg(t)
          ? IF(e, t)
          : Qy(t)
            ? LF(e, t)
            : mg(t)
              ? RF(e, t)
              : Cv(t)
                ? zF(e, t)
                : V(t)
                  ? BF(e, t)
                  : s_(t);
}
function HF(...e) {
  let [t, n] = an(e, { 2: (e, t) => [e, t], 1: (e) => [{}, e] });
  return (UF.clear(), VF(t, n));
}
var UF;
function WF() {
  return (WF = e(() => {
    (D(), J(), (UF = new Set()));
  }))();
}
function GF() {
  return (GF = e(() => {
    (EF(), MF(), WF());
  }))();
}
var KF;
function qF() {
  return (qF = e(() => {
    KF = class extends Error {
      constructor(e, t) {
        (super(t), (this.type = e));
      }
    };
  }))();
}
function JF(e, t) {
  return Tn(t.default) ? t.default(t) : y(t.default) ? uM(t.default) : t.default;
}
function YF() {
  return (YF = e(() => {
    (D(), dM());
  }))();
}
function XF(e, t) {
  if (qa(t) && !Ci(t))
    throw new KF(t, `Arrays with uniqueItems constraints must specify a default annotation`);
  let n = fa(t) ? t.minItems : 0;
  return Array.from({ length: n }, () => PI(e, t.items));
}
function ZF() {
  return (ZF = e(() => {
    (Ja(), wi(), pa(), FI(), qF());
  }))();
}
function QF(e, t) {
  return Vi(t) ? BigInt(t.exclusiveMinimum) + BigInt(1) : ca(t) ? BigInt(t.minimum) : BigInt(0);
}
function $F() {
  return ($F = e(() => {
    (Hi(), la());
  }))();
}
function eI(e, t) {
  return !1;
}
function tI(e, t) {
  let n = PI(e, t.instanceType);
  return class {
    constructor() {
      Object.assign(this, n);
    }
  };
}
function nI() {
  return (nI = e(() => {
    FI();
  }))();
}
function rI(e, t) {
  return PI({ ...e, ...t.$defs }, pg(t.$ref));
}
function iI() {
  return (iI = e(() => {
    (J(), FI());
  }))();
}
function aI(e, t) {
  return PI(e, uj(t));
}
function oI() {
  return (oI = e(() => {
    (J(), FI());
  }))();
}
function sI(e, t) {
  let n = PI(e, t.returnType);
  return () => n;
}
function cI() {
  return (cI = e(() => {
    FI();
  }))();
}
function lI(e, t) {
  return Vi(t) && On(t.exclusiveMinimum) ? t.exclusiveMinimum + 1 : ca(t) ? t.minimum : 0;
}
function uI() {
  return (uI = e(() => {
    (D(), Hi(), la());
  }))();
}
function dI(e, t) {
  return PI(e, uj(nj(e, t)));
}
function fI() {
  return (fI = e(() => {
    (J(), FI());
  }))();
}
function pI(e, t) {
  return t.const;
}
function mI(e, t) {
  throw new KF(t, `Cannot create TNever types`);
}
function hI() {
  return (hI = e(() => {
    qF();
  }))();
}
function gI(e, t) {
  return null;
}
function _I(e, t) {
  return Vi(t) && On(t.exclusiveMinimum) ? t.exclusiveMinimum + 1 : ca(t) ? t.minimum : 0;
}
function vI() {
  return (vI = e(() => {
    (D(), Hi(), la());
  }))();
}
function yI(e, t) {
  return (jn(t.required) ? [] : t.required).reduce(
    (n, r) => ({ ...n, [r]: PI(e, t.properties[r]) }),
    {},
  );
}
function bI() {
  return (bI = e(() => {
    (D(), FI());
  }))();
}
function xI(e, t) {
  if (ga(t) && !Ci(t))
    throw new KF(t, `Record with the minProperties constraint must have a default annotation`);
  return {};
}
function SI() {
  return (SI = e(() => {
    (_a(), wi(), qF());
  }))();
}
function CI(e, t) {
  return C(e, t.$ref)
    ? PI(e, e[t.$ref])
    : (() => {
        throw new KF(t, `Unable to deref Ref`);
      })();
}
function wI() {
  return (wI = e(() => {
    (D(), FI(), qF());
  }))();
}
function TI(e, t) {
  if ((wa(t) || Ui(t)) && !Ci(t))
    throw Error(`Strings with format or pattern constraints must specify default`);
  let n = ma(t) ? t.minLength : 0;
  return ``.padEnd(n);
}
function EI() {
  return (EI = e(() => {
    (Ta(), Wi(), wi(), ha());
  }))();
}
function DI(e, t) {
  return Symbol();
}
function OI(e, t) {
  let n = mv(t.pattern);
  if (K_(n)) throw new KF(t, `Unable to create TemplateLiteral due to infinite type expansion`);
  return PI(e, n);
}
function kI() {
  return (kI = e(() => {
    (J(), Hj(), FI(), qF());
  }))();
}
function AI(e, t) {
  return Array.from({ length: t.minItems }, (n, r) => PI(e, t.items[r]));
}
function jI() {
  return (jI = e(() => {
    FI();
  }))();
}
function MI(e, t) {
  if (x(t.anyOf.length, 0)) throw Error(`Unable to create Union with no variants`);
  return PI(e, t.anyOf[0]);
}
function NI() {
  return (NI = e(() => {
    (D(), FI());
  }))();
}
function PI(e, t) {
  return Ci(t)
    ? JF(e, t)
    : ng(t)
      ? XF(e, t)
      : x_(t)
        ? QF(e, t)
        : w_(t)
          ? eI(e, t)
          : og(t)
            ? tI(e, t)
            : Bg(t)
              ? rI(e, t)
              : t_(t)
                ? aI(e, t)
                : ug(t)
                  ? sI(e, t)
                  : E_(t)
                    ? lI(e, t)
                    : i_(t)
                      ? dI(e, t)
                      : F_(t)
                        ? pI(e, t)
                        : Cg(t)
                          ? mI(e, t)
                          : R_(t)
                            ? gI(e, t)
                            : B_(t)
                              ? _I(e, t)
                              : Pg(t)
                                ? yI(e, t)
                                : Qy(t)
                                  ? xI(e, t)
                                  : mg(t)
                                    ? CI(e, t)
                                    : K_(t)
                                      ? TI(e, t)
                                      : W_(t)
                                        ? DI(e, t)
                                        : Jx(t)
                                          ? OI(e, t)
                                          : Cv(t)
                                            ? AI(e, t)
                                            : lb(t)
                                              ? void 0
                                              : V(t)
                                                ? MI(e, t)
                                                : (db(t), void 0);
}
function FI() {
  return (FI = e(() => {
    (J(),
      wi(),
      YF(),
      ZF(),
      $F(),
      nI(),
      iI(),
      oI(),
      cI(),
      uI(),
      fI(),
      hI(),
      vI(),
      bI(),
      SI(),
      wI(),
      EI(),
      kI(),
      jI(),
      NI());
  }))();
}
function II(...e) {
  let [t, n] = an(e, { 2: (e, t) => [e, t], 1: (e) => [{}, e] });
  return PI(t, n);
}
function LI() {
  return (LI = e(() => {
    FI();
  }))();
}
function RI() {
  return (RI = e(() => {
    LI();
  }))();
}
function zI(e, t) {
  return er(e, t);
}
function BI() {
  return (BI = e(() => {
    D();
  }))();
}
function VI() {
  return (VI = e(() => {
    kp();
  }))();
}
function HI() {
  return (HI = e(() => {
    VI();
  }))();
}
function UI(e, t, n) {
  if (!ch(e, t, n)) throw new WI(n, dh(e, t, n));
  return n;
}
var WI, GI;
function KI() {
  return (KI = e(() => {
    (Vh(),
      gh(),
      uh(),
      ph(),
      TM(),
      dM(),
      fP(),
      FP(),
      LP(),
      (WI = class extends mh {
        constructor(e, t) {
          super(`Parse`, e, t);
        }
      }),
      (GI = IP([
        (e, t, n) => uM(n),
        (e, t, n) => NP(e, t, n),
        (e, t, n) => uP(e, t, n),
        (e, t, n) => CM(e, t, n),
        (e, t, n) => UI(e, t, n),
      ])));
  }))();
}
function qI() {
  return (qI = e(() => {
    KI();
  }))();
}
var JI, YI, XI;
function ZI() {
  return (ZI = e(() => {
    (J(),
      (JI = M({ type: I(`insert`), path: z(), value: N() })),
      (YI = Object({ type: I(`update`), path: z(), value: N() })),
      (XI = M({ type: I(`delete`), path: z() })),
      B([JI, YI, XI]));
  }))();
}
function QI() {
  return (QI = e(() => {
    ZI();
  }))();
}
function $I() {
  return ($I = e(() => {
    (uh(), RI(), HI(), uL());
  }))();
}
function eL() {
  return (eL = e(() => {
    (J(), uL());
  }))();
}
function tL() {
  return (tL = e(() => {
    (J(), uL());
  }))();
}
function nL() {
  return (nL = e(() => {
    (uh(), RI(), uL());
  }))();
}
function rL() {
  return (rL = e(() => {
    (J(), RI(), uh(), uL());
  }))();
}
function iL() {
  return (iL = e(() => {
    uL();
  }))();
}
function aL() {
  return (aL = e(() => {
    (Hj(), uL());
  }))();
}
function oL() {
  return (oL = e(() => {
    (uh(), RI(), uL());
  }))();
}
function sL() {
  return (sL = e(() => {
    (J(), uh());
  }))();
}
function cL() {
  return (cL = e(() => {
    (J(), Yw(), uh(), RI(), uL(), sL());
  }))();
}
function lL() {
  return (lL = e(() => {
    (uh(), RI(), fP());
  }))();
}
function uL() {
  return (uL = e(() => {
    (J(), uh(), RI(), $I(), eL(), tL(), nL(), rL(), iL(), aL(), oL(), cL(), lL());
  }))();
}
function dL() {
  return (dL = e(() => {
    (uL(), gh());
  }))();
}
function fL() {
  return (fL = e(() => {
    dL();
  }))();
}
function pL() {
  return (pL = e(() => {
    (VN(), SM(), sL());
  }))();
}
function mL() {
  return (mL = e(() => {
    (gh(), uh(), TM(), GF(), fP(), RI(), FP(), ph(), HI(), qI(), QI(), fL());
  }))();
}
function hL() {
  return (hL = e(() => {
    (gh(), uh(), TM(), GF(), fP(), RI(), ph(), FP(), HI(), qI(), QI(), fL(), pL(), mL());
  }))();
}
function gL() {
  return (gL = e(() => {
    (q(),
      Rw(),
      Kj(),
      JT(),
      hE(),
      SE(),
      dj(),
      OE(),
      NE(),
      pj(),
      sO(),
      iw(),
      pO(),
      XT(),
      MO(),
      fj(),
      tk(),
      sk(),
      _k(),
      Ck(),
      Bk(),
      Jk(),
      kA(),
      PA(),
      QT(),
      eE(),
      VA(),
      c_(),
      u_(),
      kg(),
      y_(),
      ig(),
      T_(),
      NT(),
      n_(),
      O_(),
      o_(),
      L_(),
      z_(),
      H_(),
      Ig(),
      nb(),
      q_(),
      Yx(),
      Tv(),
      H(),
      Rg(),
      Wg());
  }))();
}
function _L() {
  return (_L = e(() => {
    (pj(), Wj(), Rw(), Kj(), pb(), gL());
  }))();
}
function X(e) {
  return M(e, { additionalProperties: !1 });
}
function vL() {
  return (vL = e(() => {
    _L();
  }))();
}
var yL, bL, xL, SL;
function CL() {
  return (CL = e(() => {
    ((yL = `value`),
      (bL = /^[a-z][a-z0-9_-]{0,63}$/),
      (xL = `~(?:[^01]|$)`),
      (SL = `^(?!.*(?:^|/)\\.{1,2}(?:/|$))[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$`));
  }))();
}
var wL, TL, EL, Z, DL, OL, kL, AL, jL, ML, NL, PL, FL, IL, LL, RL, zL;
function BL() {
  return (BL = e(() => {
    (_L(),
      fe(),
      CL(),
      vL(),
      (wL = /^[A-Z][A-Z0-9_]{0,127}$/),
      (TL = [`external_user`, `inter_session`, `internal_system`]),
      (EL = 512),
      (Z = z({ minLength: 1 })),
      (DL = z({ minLength: 1, maxLength: 512 })),
      (OL = z({ minLength: 1, maxLength: EL })),
      (kL = X({
        kind: z({ enum: [...TL] }),
        originSessionId: j(z()),
        sourceSessionKey: j(z()),
        sourceChannel: j(z()),
        sourceTool: j(z()),
      })),
      (AL = e_(ue)),
      (jL = e_(p)),
      (ML = z({ pattern: bL.source })),
      (NL = X({ source: I(`env`), provider: ML, id: z({ pattern: wL.source }) })),
      (PL = Hg({
        type: `string`,
        anyOf: [{ const: yL }, { allOf: [{ pattern: `^/` }, { not: { pattern: xL } }] }],
      })),
      (FL = X({ source: I(`file`), provider: ML, id: PL })),
      (IL = X({ source: I(`exec`), provider: ML, id: z({ pattern: SL }) })),
      (LL = X({ source: I(`store`), provider: ML, id: z({ pattern: wL.source }) })),
      (RL = B([NL, FL, IL, LL])),
      (zL = B([z(), RL])));
  }))();
}
var VL, HL;
function UL() {
  return (UL = e(() => {
    (_L(),
      (VL = B([I(`shared`), I(`read-only`), I(`suggest`), I(`draft`)])),
      (HL = B([I(`admin`), I(`owner`), I(`member`), I(`viewer`)])));
  }))();
}
function WL() {
  return X({
    id: Z,
    type: Z,
    label: j(Z),
    status: GL,
    platform: j(Z),
    sessionHost: j(P()),
    workerSlots: j(QL),
    workerBundle: j(ZL),
    lastConnectedAtMs: j(F({ minimum: 0 })),
    lastDisconnectedAtMs: j(F({ minimum: 0 })),
    lastSeenAtMs: j(F({ minimum: 0 })),
    lastSeenReason: j(Z),
    trust: j(KL),
    capabilities: j(A(Z)),
    invocableCommands: j(
      A(z({ minLength: 1, maxLength: 128 }), { maxItems: 128, uniqueItems: !0 }),
    ),
    desktop: j(P()),
    issues: j(A(XL, { minItems: 1, maxItems: 8 })),
    worker: j($L),
  });
}
var GL, KL, qL, JL, YL, XL, ZL, QL, $L, eR, tR, nR, rR, iR;
function aR() {
  return (aR = e(() => {
    (_L(),
      vL(),
      BL(),
      (GL = z({ enum: [`available`, `unavailable`, `starting`, `stopping`, `error`] })),
      (KL = z({ enum: [`persistent`, `disposable`] })),
      (qL = B([
        I(`requested`),
        I(`provisioning`),
        I(`bootstrapping`),
        I(`ready`),
        I(`attached`),
        I(`idle`),
        I(`draining`),
        I(`destroying`),
        I(`destroyed`),
        I(`failed`),
        I(`orphaned`),
      ])),
      (JL = B([I(`stopped`), I(`connecting`), I(`connected`), I(`reconnecting`)])),
      (YL = B([I(`browser`), I(`terminal`)])),
      (XL = X({
        code: I(`update-required`),
        action: I(`update-and-reconnect`),
        updateCommand: I(`openclaw update`),
        headlessReconnectCommand: I(`openclaw node restart`),
      })),
      (ZL = B([X({ status: I(`installed`), version: Z }), X({ status: I(`missing`) })])),
      (QL = g_(
        X({ total: F({ minimum: 1, maximum: 1024 }), available: F({ minimum: 0, maximum: 1024 }) }),
        (e) => e.available <= e.total,
        (e) => `available worker slots ${e.available} exceed total ${e.total}`,
      )),
      ($L = X({
        providerId: Z,
        leaseId: j(Z),
        state: qL,
        ageMs: F({ minimum: 0 }),
        idleMs: j(F({ minimum: 0 })),
        attachedSessionIds: A(Z),
        tunnelStatus: JL,
        error: j(Z),
        desktop: j(P()),
        desktopApps: j(A(YL, { maxItems: 8, uniqueItems: !0 })),
      })),
      (eR = WL()),
      X({}),
      (tR = X({
        id: z({ minLength: 1, maxLength: 128 }),
        label: z({ minLength: 1, maxLength: 128 }),
        cpu: j(F({ minimum: 1, maximum: 65536 })),
        memoryGb: j(F({ minimum: 1, maximum: 65536 })),
        default: j(P()),
      })),
      (nR = A(tR, { minItems: 1, maxItems: 32 })),
      (rR = B([I(`worker-turn`), I(`remote-exec`)])),
      (iR = X({ id: Z, providerId: Z, trust: j(KL), executionMode: j(rR), machines: j(nR) })),
      X({ environments: A(eR), profiles: j(A(iR)) }),
      X({ environmentId: Z }),
      WL(),
      X({ profileId: Z, idempotencyKey: Z }),
      WL(),
      X({ environmentId: Z, force: j(P()) }),
      WL(),
      X({ environmentId: Z, control: j(P()) }),
      X({
        transport: z({ enum: [`rfb`] }),
        wsPath: Z,
        expiresAtMs: F({ minimum: 0 }),
        control: P(),
        vncPassword: j(Z),
      }),
      X({ environmentId: Z, app: YL }),
      X({ app: YL, status: I(`ready`) }));
  }))();
}
function oR(e, t) {
  return (Object.assign(t, { "x-openclaw-since": e }), t);
}
var sR, cR, lR, uR, dR, fR, pR, mR, hR;
function gR() {
  return (gR = e(() => {
    (_L(),
      vL(),
      BL(),
      X({}),
      (sR = z({ minLength: 1, maxLength: 128, pattern: `^[A-Z][A-Z0-9_]{0,127}$` })),
      (cR = z({ pattern: `^github-setup-[a-f0-9]{32}$` })),
      (lR = z({
        minLength: 1,
        maxLength: 128,
        pattern: `^(?:[A-Z][A-Z0-9_]{0,127}|github-setup-[a-f0-9]{32})$`,
      })),
      (uR = {
        name: sR,
        scopeKind: I(`team`),
        scopeId: I(``),
        createdAtMs: F({ minimum: 0 }),
        updatedAtMs: F({ minimum: 0 }),
        updatedBy: j(z()),
      }),
      (dR = A(z({ minLength: 1, maxLength: 253 }), { maxItems: 128, uniqueItems: !0 })),
      (fR = X({ ...uR, kind: I(`secret`), allowedHosts: j(oR(`2026.8`, dR)) })),
      (pR = X({ ...uR, kind: I(`env`), value: z({ maxLength: 65536 }) })),
      (mR = B([fR, pR])),
      X({}),
      X({ entries: A(mR) }),
      X({
        name: lR,
        value: z({ maxLength: 65536 }),
        kind: B([I(`secret`), I(`env`)]),
        allowedHosts: j(oR(`2026.8`, dR)),
      }),
      X({ name: lR }),
      X({ ok: I(!0), reloaded: P(), warningCount: j(F({ minimum: 0 })) }),
      X({
        commandName: Z,
        targetIds: A(Z),
        allowedPaths: j(A(Z)),
        forcedActivePaths: j(A(Z)),
        optionalActivePaths: j(A(Z)),
        providerOverrides: j(X({ webSearch: j(Z), webFetch: j(Z) })),
      }),
      (hR = X({ path: j(Z), pathSegments: A(Z), value: N() })),
      X({ ok: j(P()), assignments: j(A(hR)), diagnostics: j(A(Z)), inactiveRefPaths: j(A(Z)) }));
  }))();
}
var _R,
  vR,
  yR,
  bR,
  xR,
  SR,
  CR,
  wR,
  TR,
  ER,
  DR,
  OR,
  kR,
  AR,
  jR,
  MR,
  NR,
  PR,
  FR,
  IR,
  LR,
  RR,
  zR,
  BR,
  VR,
  HR,
  UR,
  WR,
  GR,
  KR,
  qR,
  JR,
  YR,
  XR,
  ZR,
  QR,
  $R,
  ez,
  tz,
  nz,
  rz,
  iz,
  az,
  oz,
  sz,
  cz,
  lz,
  uz,
  dz,
  fz,
  pz,
  mz,
  hz,
  gz,
  _z,
  vz,
  yz,
  bz,
  xz,
  Sz,
  Cz,
  wz,
  Tz,
  Ez,
  Dz,
  Oz,
  kz;
function Az() {
  return (Az = e(() => {
    (_L(),
      vL(),
      aR(),
      BL(),
      gR(),
      (_R = X({
        id: Z,
        fallback: j(B([I(`openclaw`), I(`none`)])),
        cloudPlacementSupported: j(P()),
        cloudPlacementExecutionMode: j(rR),
        devicePlacement: j(
          X({
            requiredNodeCommands: A(z({ minLength: 1, maxLength: 128 }), {
              maxItems: 32,
              uniqueItems: !0,
            }),
            consumesWorkerSlot: P(),
          }),
        ),
        devicePlacementSupported: j(P()),
        source: B([
          I(`env`),
          I(`agent`),
          I(`defaults`),
          I(`model`),
          I(`provider`),
          I(`implicit`),
          I(`session`),
          I(`session-key`),
        ]),
      })),
      (vR = X({ id: Z, label: Z })),
      (yR = X({ id: Z, label: Z, contextWindow: F({ minimum: 1 }) })),
      (bR = X({
        id: Z,
        name: Z,
        provider: Z,
        alias: j(Z),
        tags: j(A(Z)),
        available: j(P()),
        contextWindow: j(F({ minimum: 1 })),
        contextWindows: j(A(yR)),
        contextWindowDefault: j(Z),
        reasoning: j(P()),
        thinkingLevels: j(A(vR)),
        thinkingDefault: j(Z),
        supportsTools: j(P()),
        agentRuntime: j(_R),
        apiKeySupported: j(P()),
        input: j(A(B([I(`text`), I(`image`), I(`audio`), I(`video`), I(`document`)]))),
      })),
      (xR = B([I(`agent`), I(`system`)])),
      (SR = B([I(`operator`), I(`agent`), I(`claw`)])),
      (CR = X({
        id: Z,
        kind: j(xR),
        createdVia: j(SR),
        creatorAgentId: j(B([Z, L()])),
        createdAt: j(F({ minimum: 0 })),
        name: j(Z),
        identity: j(X({ name: j(Z), theme: j(Z), emoji: j(Z), avatar: j(Z), avatarUrl: j(Z) })),
        workspace: j(Z),
        workspaceGit: j(P()),
        model: j(X({ primary: j(Z), fallbacks: j(A(Z)) })),
        agentRuntime: j(_R),
        thinkingLevels: j(A(vR)),
        thinkingOptions: j(A(Z)),
        thinkingDefault: j(Z),
      })),
      X({}),
      (wR = B([I(`sole`), I(`legacy`), I(`explicit`)])),
      X({
        defaultId: Z,
        ownership: j(wR),
        selectionRequired: j(P()),
        mainKey: Z,
        scope: B([I(`per-sender`), I(`global`)]),
        agents: A(CR),
      }),
      X({ name: Z, workspace: j(Z), model: j(Z), emoji: j(z()), avatar: j(z()) }),
      X({ ok: I(!0), agentId: Z, name: Z, workspace: Z, model: j(Z) }),
      X({
        agentId: Z,
        name: j(Z),
        workspace: j(Z),
        model: j(B([Z, L()])),
        emoji: j(z()),
        avatar: j(z()),
      }),
      X({ ok: I(!0), agentId: Z }),
      X({ agentId: Z, deleteFiles: j(P()) }),
      X({
        ok: I(!0),
        agentId: Z,
        removedBindings: F({ minimum: 0 }),
        removed: j(A(X({ path: Z, method: B([I(`trash`), I(`missing`)]) }))),
        failed: j(A(X({ path: Z, reason: Z }))),
        purgeFailed: j(I(!0)),
      }),
      (TR = X({
        name: Z,
        path: Z,
        missing: P(),
        expectedAbsent: j(P()),
        size: j(F({ minimum: 0 })),
        updatedAtMs: j(F({ minimum: 0 })),
        content: j(z()),
      })),
      X({ agentId: Z }),
      X({ agentId: Z, workspace: Z, files: A(TR) }),
      X({ agentId: Z, name: Z }),
      X({ agentId: Z, workspace: Z, file: TR }),
      X({ agentId: Z, name: Z, content: z() }),
      X({ ok: I(!0), agentId: Z, workspace: Z, file: TR }),
      M(
        {
          agentId: j(Z),
          includeProviderCapabilities: j(P()),
          preparedOnly: j(P()),
          refresh: j(P()),
          view: j(B([I(`default`), I(`configured`), I(`provider-config`), I(`all`)])),
        },
        {
          additionalProperties: !1,
          not: {
            properties: { preparedOnly: { const: !0 }, refresh: { const: !0 } },
            required: [`preparedOnly`, `refresh`],
          },
        },
      ),
      X({ refresh: j(P()), agentId: j(z()) }),
      X({ provider: Z, profileIds: j(A(Z, { minItems: 1 })), agentId: j(z()) }),
      (ER = X({
        provider: Z,
        profileId: j(Z),
        status: B([I(`ready`), I(`auth-rejected`), I(`unavailable`)]),
      })),
      X({ models: A(bR), providerOutcomes: j(A(ER)) }),
      X({ provider: Z, profileId: j(Z), timeoutMs: j(F({ minimum: 1 })), agentId: j(z()) }),
      (DR = B([
        I(`ok`),
        I(`auth`),
        I(`rate_limit`),
        I(`billing`),
        I(`timeout`),
        I(`format`),
        I(`unknown`),
        I(`no_model`),
      ])),
      (OR = X({
        profileId: j(Z),
        label: Z,
        status: DR,
        latencyMs: j(F({ minimum: 0 })),
        error: j(z()),
      })),
      X({
        provider: Z,
        status: DR,
        latencyMs: j(F({ minimum: 0 })),
        error: j(z()),
        results: A(OR),
      }),
      X({ agentId: j(Z) }),
      X({}),
      X({ bins: A(Z) }),
      (kR = z({ minLength: 64, maxLength: 64, pattern: `^[a-fA-F0-9]{64}$` })),
      (AR = z({ minLength: 1, maxLength: 2048 })),
      (jR = z({ minLength: 1, maxLength: 5592408 })),
      X({
        kind: I(`skill-archive`),
        slug: Z,
        sizeBytes: F({ minimum: 1 }),
        sha256: j(kR),
        force: j(P()),
        idempotencyKey: j(AR),
      }),
      X({ uploadId: Z, offset: F({ minimum: 0 }), dataBase64: jR }),
      X({ uploadId: Z, sha256: j(kR) }),
      (MR =
        "ClawHub skill reference: `@owner/slug`, `skills-sh:owner/repo/slug`, or a bare `slug` when no publisher is known."),
      (NR = `not-scanned-by-clawhub`),
      B([
        X({
          agentId: j(Z),
          name: Z,
          installId: Z,
          dangerouslyForceUnsafeInstall: j(
            P({
              deprecated: !0,
              description: `Deprecated compatibility field. Current servers ignore it; install policy is controlled by security.installPolicy.`,
            }),
          ),
          timeoutMs: j(F({ minimum: 1e3 })),
        }),
        X({
          agentId: j(Z),
          source: I(`clawhub`),
          scope: j(I(`global`)),
          slug: z({ minLength: 1, description: MR }),
          version: j(Z),
          force: j(P()),
          acknowledgeClawHubRisk: j(P()),
          timeoutMs: j(F({ minimum: 1e3 })),
        }),
        X({
          agentId: j(Z),
          source: I(`upload`),
          uploadId: Z,
          slug: Z,
          force: j(P()),
          sha256: j(kR),
          timeoutMs: j(F({ minimum: 1e3 })),
        }),
      ]),
      B([
        X({ skillKey: Z, enabled: j(P()), apiKey: j(z()), env: j(Ky(Z, z())) }),
        X({
          agentId: j(Z),
          source: I(`clawhub`),
          slug: j(Z),
          all: j(P()),
          force: j(P()),
          acknowledgeClawHubRisk: j(P()),
        }),
      ]),
      X({ query: j(Z), limit: j(F({ minimum: 1, maximum: 100 })) }),
      X({
        results: A(
          X({
            score: R(),
            slug: Z,
            installRef: z({
              minLength: 1,
              description:
                "Source-qualified reference for this result. Send it as `slug` to skills.install; several publishers can share one slug.",
            }),
            installOnly: j(
              I(!0, {
                description:
                  "Present when ClawHub serves this result install-only: offer install directly with `installRef`, because skills.detail cannot answer for it. Absence means the ordinary review-then-install flow, so results from servers that predate this field keep their existing behavior.",
              }),
            ),
            trustState: j(
              I(NR, {
                description: `Present when ClawHub resolves this result from a source it has not scanned.`,
              }),
            ),
            displayName: Z,
            summary: j(z()),
            icon: j(B([z(), L()])),
            version: j(Z),
            updatedAt: j(F()),
          }),
        ),
      }),
      X({ slug: z({ minLength: 1, description: MR }) }),
      X({ agentId: j(Z) }),
      X({
        skill: B([
          X({
            slug: Z,
            displayName: Z,
            summary: j(z()),
            tags: j(Ky(Z, z())),
            channel: j(B([z(), L()])),
            isOfficial: j(B([P(), L()])),
            createdAt: F(),
            updatedAt: F(),
          }),
          L(),
        ]),
        latestVersion: j(B([X({ version: Z, createdAt: F(), changelog: j(z()) }), L()])),
        metadata: j(B([X({ os: j(B([A(z()), L()])), systems: j(B([A(z()), L()])) }), L()])),
        owner: j(
          B([
            X({
              handle: j(B([Z, L()])),
              displayName: j(B([Z, L()])),
              image: j(B([z(), L()])),
              official: j(B([P(), L()])),
              channel: j(B([z(), L()])),
              isOfficial: j(B([P(), L()])),
            }),
            L(),
          ]),
        ),
      }),
      X({
        schema: I(`openclaw.skills.security-verdicts.v1`),
        items: A(
          X({
            registry: Z,
            ok: P(),
            decision: Z,
            reasons: A(z()),
            requestedSlug: Z,
            requestedOwnerHandle: j(Z),
            requestedVersion: Z,
            slug: j(B([Z, L()])),
            version: j(B([Z, L()])),
            displayName: j(B([z(), L()])),
            publisherHandle: j(B([z(), L()])),
            publisherDisplayName: j(B([z(), L()])),
            createdAt: j(B([F(), L()])),
            checkedAt: j(B([F(), L()])),
            skillUrl: j(B([z(), L()])),
            securityAuditUrl: j(B([z(), L()])),
            securityStatus: j(B([z(), L()])),
            securityPassed: j(B([P(), L()])),
            error: j(X({ code: j(z()), message: j(z()) })),
          }),
        ),
      }),
      X({ agentId: j(Z), skillKey: Z }),
      X({
        schema: I(`openclaw.skills.skill-card.v1`),
        skillKey: Z,
        path: Z,
        sizeBytes: F({ minimum: 0 }),
        content: z(),
      }),
      (PR = B([I(`pending`), I(`applied`), I(`rejected`), I(`quarantined`), I(`stale`)])),
      (FR = B([I(`create`), I(`update`)])),
      (IR = B([I(`pending`), I(`clean`), I(`failed`), I(`quarantined`)])),
      (LR = B([I(`skill-workshop`), I(`cli`), I(`gateway`)])),
      (RR = z({ minLength: 1, maxLength: 1048576 })),
      (zR = X({ path: Z, content: z({ maxLength: 262144 }) })),
      (BR = X({
        path: Z,
        sizeBytes: F({ minimum: 0, maximum: 262144 }),
        hash: kR,
        targetExisted: j(P()),
        targetContentHash: j(kR),
      })),
      (VR = X({
        ruleId: Z,
        severity: B([I(`info`), I(`warn`), I(`critical`)]),
        file: Z,
        line: F({ minimum: 1 }),
        message: Z,
        evidence: z(),
      })),
      (HR = X({
        state: IR,
        scannedAt: Z,
        critical: F({ minimum: 0 }),
        warn: F({ minimum: 0 }),
        info: F({ minimum: 0 }),
        findings: A(VR),
      })),
      (UR = X({
        skillName: Z,
        skillKey: Z,
        skillDir: Z,
        skillFile: Z,
        source: j(Z),
        currentContentHash: j(Z),
      })),
      (WR = X({ agentId: j(Z), sessionKey: j(Z), runId: j(Z), messageId: j(Z) })),
      (GR = X({
        ruleId: z({ minLength: 1, maxLength: 256 }),
        severity: B([I(`info`), I(`warn`), I(`critical`)]),
        message: z({ minLength: 1, maxLength: 4e3 }),
        file: j(z({ minLength: 1, maxLength: 1024 })),
        line: j(F({ minimum: 1 })),
      })),
      (KR = X({
        summary: j(z({ maxLength: 8e3 })),
        findings: j(A(GR, { maxItems: 200 })),
        metrics: j(
          Ky(z(), B([z({ maxLength: 4e3 }), R(), P()]), {
            maxProperties: 64,
            propertyNames: z({ minLength: 1, maxLength: 128 }),
          }),
        ),
        evaluatorVersion: j(z({ minLength: 1, maxLength: 128 })),
        mode: j(z({ minLength: 1, maxLength: 128 })),
        decision: j(B([I(`pass`), I(`revise`), I(`block`)])),
        decisionReason: j(z({ maxLength: 2e3 })),
      })),
      (qR = {
        pluginId: z({ minLength: 1, maxLength: 128 }),
        pluginVersion: j(z({ minLength: 1, maxLength: 128 })),
        evaluatorId: z({ minLength: 1, maxLength: 128 }),
      }),
      (JR = B([
        X({ ...qR, status: I(`completed`), result: KR }),
        X({ ...qR, status: I(`skipped`) }),
        X({ ...qR, status: I(`error`), error: z({ minLength: 1, maxLength: 2e3 }) }),
      ])),
      (YR = X({
        id: Z,
        proposedVersion: Z,
        revisionHash: kR,
        trigger: B([I(`manual`), I(`apply`)]),
        startedAt: Z,
        completedAt: Z,
        correlationId: j(Z),
        targetTreeSha256: j(kR),
        outcomes: A(JR, { maxItems: 64 }),
      })),
      (XR = X({
        schema: I(`openclaw.skill-workshop.proposal.v1`),
        id: Z,
        kind: FR,
        status: PR,
        title: Z,
        description: Z,
        createdAt: Z,
        updatedAt: Z,
        createdBy: LR,
        origin: j(WR),
        proposedVersion: Z,
        draftFile: I(`PROPOSAL.md`),
        draftHash: Z,
        supportFiles: j(A(BR, { maxItems: 64 })),
        target: UR,
        scan: HR,
        goal: j(z()),
        evidence: j(z()),
        appliedAt: j(Z),
        rejectedAt: j(Z),
        quarantinedAt: j(Z),
        staleAt: j(Z),
        statusReason: j(z()),
        evaluation: j(YR),
      })),
      (ZR = X({
        id: Z,
        kind: FR,
        status: PR,
        title: Z,
        description: Z,
        skillName: Z,
        skillKey: Z,
        createdAt: Z,
        updatedAt: Z,
        scanState: IR,
      })),
      X({ agentId: j(Z) }),
      X({
        schema: I(`openclaw.skill-workshop.proposals-manifest.v1`),
        updatedAt: Z,
        proposals: A(ZR),
      }),
      X({ agentId: j(Z), proposalId: Z }),
      X({
        record: XR,
        revisionHash: j(kR),
        content: z(),
        supportFiles: j(A(zR, { maxItems: 64 })),
      }),
      X({
        agentId: j(Z),
        name: Z,
        description: Z,
        content: RR,
        supportFiles: j(A(zR, { maxItems: 64 })),
        goal: j(z()),
        evidence: j(z()),
      }),
      X({
        agentId: j(Z),
        skillName: Z,
        description: j(Z),
        content: RR,
        supportFiles: j(A(zR, { maxItems: 64 })),
        goal: j(z()),
        evidence: j(z()),
      }),
      X({
        agentId: j(Z),
        proposalId: Z,
        expectedRevisionHash: j(kR),
        correlationId: j(z({ minLength: 1, maxLength: 256 })),
        content: j(RR),
        supportFiles: j(A(zR, { maxItems: 64 })),
        description: j(Z),
        goal: j(z()),
        evidence: j(z()),
      }),
      X({
        agentId: j(Z),
        targetAgentId: j(Z),
        proposalId: Z,
        expectedRevisionHash: kR,
        instructions: z({ minLength: 1, maxLength: 32768 }),
        sessionKey: Z,
        sessionId: j(Z),
        idempotencyKey: Z,
      }),
      M(
        { runId: Z, status: B([I(`started`), I(`in_flight`), I(`ok`), I(`timeout`), I(`error`)]) },
        { additionalProperties: !0 },
      ),
      X({
        agentId: j(Z),
        proposalId: Z,
        expectedRevisionHash: kR,
        correlationId: j(z({ minLength: 1, maxLength: 256 })),
        reason: j(z()),
      }),
      X({
        agentId: j(Z),
        proposalId: Z,
        expectedRevisionHash: j(kR),
        correlationId: j(z({ minLength: 1, maxLength: 256 })),
        reason: j(z()),
      }),
      X({
        agentId: j(Z),
        proposalId: Z,
        expectedRevisionHash: j(kR),
        correlationId: j(z({ minLength: 1, maxLength: 256 })),
      }),
      X({ record: XR, evaluation: YR }),
      (QR = B([
        I(`created`),
        I(`revised`),
        I(`evaluation_completed`),
        I(`applied`),
        I(`rejected`),
        I(`quarantined`),
        I(`stale`),
      ])),
      ($R = X({ type: B([I(`agent`), I(`gateway`), I(`plugin`), I(`system`)]), id: j(Z) })),
      (ez = Ky(z(), B([z({ maxLength: 4e3 }), R(), P(), L()]), {
        maxProperties: 32,
        propertyNames: z({ minLength: 1, maxLength: 80 }),
      })),
      (tz = X({
        sequence: F({ minimum: 1 }),
        eventId: Z,
        proposalId: Z,
        proposedVersion: Z,
        revisionHash: kR,
        type: QR,
        occurredAt: Z,
        actor: $R,
        correlationId: j(Z),
        payload: j(ez),
        evaluation: j(YR),
      })),
      X({
        agentId: j(Z),
        proposalId: j(Z),
        afterSequence: j(F({ minimum: 0 })),
        limit: j(F({ minimum: 1, maximum: 200 })),
      }),
      X({ events: A(tz, { maxItems: 200 }), nextSequence: j(F({ minimum: 1 })) }),
      X({ record: XR, targetSkillFile: Z }),
      (nz = B([I(`active`), I(`stale`), I(`archived`)])),
      (rz = X({
        skillFile: Z,
        skillKey: Z,
        skillName: Z,
        state: nz,
        pinned: P(),
        createdAtMs: R(),
        stateChangedAtMs: R(),
        lastUsedAtMs: B([R(), L()]),
        useCount: R(),
        archivedReason: B([z(), L()]),
      })),
      (iz = X({ left: Z, right: Z, score: R() })),
      X({}),
      X({
        lastAttemptAtMs: B([R(), L()]),
        lastSuccessAtMs: B([R(), L()]),
        lastError: B([z(), L()]),
        counts: X({ active: R(), stale: R(), archived: R() }),
        skills: A(rz),
        overlaps: A(iz),
      }),
      X({ skill: Z }),
      X({ agentId: j(Z), includePlugins: j(P()) }),
      (az = B([I(`system`), I(`agent`)])),
      X({ agentId: Z, selectedScope: az }),
      (oz = B([I(`system-detected`), I(`system-configured`), I(`agent-override`)])),
      (sz = z({ minLength: 1, pattern: `\\S` })),
      (cz = X({ name: j(sz), email: j(sz) })),
      (lz = X({
        source: oz,
        credentialKind: B([I(`native`), I(`managed-pat`), I(`managed-oauth`)]),
        credentialState: B([
          I(`available`),
          I(`unavailable`),
          I(`configured_unavailable`),
          I(`unverified`),
          I(`rate_limited`),
        ]),
        account: B([X({ login: Z }), L()]),
        gitAuthor: X({ name: B([z(), L()]), email: B([z(), L()]) }),
        evidence: B([I(`github-api`), I(`none`), I(`unverified`), I(`rate-limited`)]),
        accessExpiresAtMs: B([F({ minimum: 0 }), L()]),
        refreshState: B([
          I(`not_applicable`),
          I(`available`),
          I(`expired`),
          I(`unavailable`),
          I(`refreshing`),
          I(`failed`),
        ]),
        oauthScopes: A(z({ minLength: 1, maxLength: 128, pattern: `\\S` }), { maxItems: 32 }),
        repositoryGrants: I(`unknown`),
      })),
      (uz = X({ scope: az, configured: P(), identity: B([lz, L()]) })),
      (dz = X({ agentId: Z, selectedScope: az, selected: uz, effective: lz })),
      (fz = X({ scope: az, agentId: Z, mode: I(`managed`), secretName: cR, gitAuthor: j(cz) })),
      (pz = X({ scope: az, agentId: Z, mode: I(`inherit`) })),
      B([fz, pz]),
      (mz = z({ pattern: `^github-device-[a-f0-9]{32}$` })),
      X({ scope: az, agentId: Z }),
      X({
        requestId: mz,
        userCode: z({ pattern: `^[A-Z0-9]{4}-[A-Z0-9]{4}$` }),
        verificationUri: I(`https://github.com/login/device`),
        expiresInMs: F({ minimum: 1, maximum: 9e5 }),
        pollAfterMs: F({ minimum: 1e3, maximum: 6e4 }),
      }),
      X({ requestId: mz }),
      (hz = X({ status: I(`pending`), retryAfterMs: F({ minimum: 1, maximum: 6e4 }) })),
      (gz = X({ status: I(`slow_down`), retryAfterMs: F({ minimum: 1, maximum: 6e4 }) })),
      (_z = X({ status: I(`access_denied`) })),
      (vz = X({ status: I(`expired`) })),
      (yz = X({ status: I(`incorrect_device_code`) })),
      (bz = X({ status: I(`network_error`), retryAfterMs: F({ minimum: 1, maximum: 6e4 }) })),
      (xz = X({ status: I(`failed`), reason: B([I(`identity_changed`), I(`setup_failed`)]) })),
      (Sz = X({ status: I(`success`), githubStatus: dz })),
      B([hz, gz, _z, vz, yz, bz, xz, Sz]),
      X({ requestId: mz }),
      X({ cancelled: P() }),
      X({ agentId: j(Z), sessionKey: Z }),
      X({
        name: Z,
        args: j(Ky(z(), N())),
        sessionKey: j(Z),
        agentId: j(Z),
        confirm: j(P()),
        idempotencyKey: j(Z),
        conversationReadOrigin: j(I(`direct-operator`)),
      }),
      (Cz = X({ id: B([I(`minimal`), I(`coding`), I(`messaging`), I(`full`)]), label: Z })),
      (wz = X({
        id: Z,
        label: Z,
        description: z(),
        source: B([I(`core`), I(`plugin`)]),
        pluginId: j(Z),
        optional: j(P()),
        risk: j(B([I(`low`), I(`medium`), I(`high`)])),
        tags: j(A(Z)),
        defaultProfiles: A(B([I(`minimal`), I(`coding`), I(`messaging`), I(`full`)])),
      })),
      (Tz = X({
        id: Z,
        label: Z,
        source: B([I(`core`), I(`plugin`)]),
        pluginId: j(Z),
        tools: A(wz),
      })),
      X({ agentId: Z, profiles: A(Cz), groups: A(Tz) }),
      (Ez = X({
        id: Z,
        label: Z,
        description: z(),
        rawDescription: z(),
        source: B([I(`core`), I(`plugin`), I(`channel`), I(`mcp`)]),
        pluginId: j(Z),
        channelId: j(Z),
        mcpServer: j(Z),
        mcpToolName: j(Z),
        deniedBySession: j(I(!0)),
        risk: j(B([I(`low`), I(`medium`), I(`high`)])),
        tags: j(A(Z)),
      })),
      (Dz = X({
        id: B([I(`core`), I(`plugin`), I(`channel`), I(`mcp`)]),
        label: Z,
        source: B([I(`core`), I(`plugin`), I(`channel`), I(`mcp`)]),
        tools: A(Ez),
      })),
      (Oz = X({ id: Z, severity: B([I(`info`), I(`warning`)]), message: z(), servers: j(A(Z)) })),
      X({ agentId: Z, profile: Z, groups: A(Dz), notices: j(A(Oz)) }),
      (kz = X({ code: Z, message: Z, details: j(N()) })),
      X({
        ok: P(),
        toolName: Z,
        output: j(N()),
        requiresApproval: j(P()),
        approvalId: j(Z),
        source: j(B([I(`core`), I(`plugin`), I(`mcp`), I(`channel`), z()])),
        error: j(kz),
      }));
  }))();
}
var jz, Mz, Nz, Pz, Fz, Iz, Lz, Rz, zz, Bz;
function Vz() {
  return (Vz = e(() => {
    (_L(),
      vL(),
      BL(),
      (jz = z({ minLength: 1, maxLength: 1024, pattern: `^[A-Za-z0-9_./\\[\\]\\-*]+$` })),
      (Mz = X({ channel: j(z()), to: j(z()), accountId: j(z()), threadId: j(B([z(), R()])) })),
      X({}),
      X({ raw: Z, baseHash: j(Z) }),
      (Nz = {
        raw: Z,
        baseHash: j(Z),
        sessionKey: j(z()),
        deliveryContext: j(Mz),
        note: j(z()),
        restartDelayMs: j(F({ minimum: 0 })),
      }),
      X(Nz),
      X({ ...Nz, replacePaths: j(A(Z, { maxItems: 256 })) }),
      X({}),
      X({ path: jz }),
      X({ refreshCheckout: j(P()) }),
      (Pz = X({ sha: Z, subject: z({ maxLength: 120 }) })),
      (Fz = X({
        currentVersion: Z,
        latestVersion: Z,
        channel: Z,
        currentSha: j(Z),
        upstreamRef: j(Z),
        upstreamSha: j(Z),
        commitsBehind: j(F({ minimum: 0 })),
        commits: j(A(Pz, { maxItems: 5 })),
      })),
      (Iz = {
        currentSha: j(Z),
        commitAtMs: j(F({ minimum: 0 })),
        installedAtMs: j(F({ minimum: 0 })),
      }),
      (Lz = B([
        X({ ...Iz, status: I(`current`) }),
        X({ ...Iz, status: I(`behind`), commitsBehind: F({ minimum: 1 }) }),
        X({ ...Iz, status: I(`ahead`), commitsAhead: F({ minimum: 1 }) }),
        X({
          ...Iz,
          status: I(`diverged`),
          commitsAhead: F({ minimum: 1 }),
          commitsBehind: F({ minimum: 1 }),
        }),
        X({
          ...Iz,
          status: I(`unavailable`),
          reason: B([
            I(`fetch-failed`),
            I(`no-upstream`),
            I(`no-upstream-sha`),
            I(`comparison-failed`),
            I(`git-unavailable`),
          ]),
        }),
      ])),
      (Rz = X({
        channel: Z,
        autoEnabled: P(),
        install: j(X({ kind: B([I(`package`), I(`git`), I(`unknown`)]), git: j(Lz) })),
        target: j(
          B([
            X({ kind: I(`package`), version: Z }),
            X({ kind: I(`git`), upstreamRef: Z, upstreamSha: Z, commitsBehind: F({ minimum: 0 }) }),
          ]),
        ),
        campaign: j(
          X({
            id: Z,
            state: B([I(`waiting-for-idle`), I(`countdown`), I(`applying`)]),
            announcedAtMs: F({ minimum: 0 }),
            applyAtMs: j(F({ minimum: 0 })),
            holdUntilMs: j(F({ minimum: 0 })),
            forceAtMs: F({ minimum: 0 }),
            updatedAtMs: F({ minimum: 0 }),
          }),
        ),
      })),
      X({
        sentinel: N(),
        updateAvailable: B([Fz, L()]),
        effectiveChannel: j(B([I(`stable`), I(`extended-stable`), I(`beta`), I(`dev`)])),
        schedule: j(Rz),
      }),
      X({}),
      X({ ok: P(), schedule: j(Rz) }),
      X({
        sessionKey: j(z()),
        deliveryContext: j(Mz),
        note: j(z()),
        continuationMessage: j(z()),
        restartDelayMs: j(F({ minimum: 0 })),
        timeoutMs: j(F({ minimum: 1 })),
      }),
      (zz = X({
        label: j(z()),
        help: j(z()),
        docsUrl: j(z()),
        tags: j(A(z())),
        group: j(z()),
        order: j(F()),
        advanced: j(P()),
        sensitive: j(P()),
        placeholder: j(z()),
        presentation: j(I(`phone-number`)),
        itemTemplate: j(N()),
      })),
      X({ schema: N(), uiHints: Ky(z(), zz), version: Z, generatedAt: Z }),
      (Bz = X({
        key: Z,
        path: Z,
        type: j(B([z(), A(z())])),
        required: P(),
        hasChildren: P(),
        reloadKind: j(B([I(`restart`), I(`hot`), I(`none`)])),
        hint: j(zz),
        hintPath: j(z()),
      })),
      X({
        path: Z,
        schema: N(),
        reloadKind: j(B([I(`restart`), I(`hot`), I(`none`)])),
        hint: j(zz),
        hintPath: j(z()),
        children: A(Bz),
      }));
  }))();
}
var Hz, Uz, Wz, Gz, Kz, qz;
function Jz() {
  return (Jz = e(() => {
    (_L(),
      Az(),
      vL(),
      Vz(),
      BL(),
      (Hz = X({
        host: j(Z),
        ip: j(Z),
        version: j(Z),
        platform: j(Z),
        deviceFamily: j(Z),
        modelIdentifier: j(Z),
        timeZone: j(Z),
        mode: j(Z),
        lastInputSeconds: j(F({ minimum: 0 })),
        reason: j(Z),
        tags: j(A(Z)),
        text: j(z()),
        ts: F({ minimum: 0 }),
        deviceId: j(Z),
        roles: j(A(Z)),
        scopes: j(A(Z)),
        instanceId: j(Z),
        user: j(X({ id: Z, email: j(Z), name: j(Z), avatarUrl: j(Z) })),
        watchedSessions: j(A(Z)),
      })),
      (Uz = X({
        path: z(),
        count: F({ minimum: 0 }),
        recent: A(
          X({ key: z(), updatedAt: B([F({ minimum: 0 }), L()]), age: B([F({ minimum: 0 }), L()]) }),
        ),
      })),
      (Wz = X({
        ok: j(I(!0)),
        ts: j(F({ minimum: 0 })),
        durationMs: j(F({ minimum: 0 })),
        eventLoop: j(
          X({
            degraded: P(),
            degradedSinceMs: j(B([F({ minimum: 0 }), L()])),
            reasons: A(B([I(`event_loop_delay`), I(`event_loop_utilization`), I(`cpu`)])),
            intervalMs: R({ minimum: 0 }),
            delayP99Ms: R({ minimum: 0 }),
            delayMaxMs: R({ minimum: 0 }),
            utilization: R({ minimum: 0 }),
            cpuCoreRatio: R({ minimum: 0 }),
          }),
        ),
        plugins: j(
          X({
            loaded: A(z()),
            errors: A(
              X({
                id: z(),
                origin: z(),
                activated: P(),
                activationSource: j(z()),
                activationReason: j(z()),
                failurePhase: j(z()),
                error: z(),
              }),
            ),
            unavailable: j(
              A(
                X({
                  id: z(),
                  state: I(`configured-unavailable`),
                  diagnostic: X({ kind: I(`plugin-verification`), reason: z(), detail: z() }),
                }),
              ),
            ),
          }),
        ),
        contextEngines: j(
          X({
            quarantined: A(
              X({
                engineId: z(),
                owner: j(z()),
                operation: z(),
                reason: z(),
                failedAt: F({ minimum: 0 }),
              }),
            ),
          }),
        ),
        deliveryQueues: j(
          X({
            failed: A(
              X({ queueName: z(), count: F({ minimum: 0 }), oldestFailedAt: j(F({ minimum: 0 })) }),
            ),
            ingressFailed: j(
              A(
                X({
                  channelId: z(),
                  accountId: z(),
                  count: F({ minimum: 0 }),
                  oldestFailedAt: j(F({ minimum: 0 })),
                }),
              ),
            ),
            ingressPressure: j(
              A(
                X({
                  channelId: z(),
                  accountId: z(),
                  laneCount: F({ minimum: 0 }),
                  pendingCount: F({ minimum: 0 }),
                  claimedCount: F({ minimum: 0 }),
                  blockedCount: F({ minimum: 0 }),
                  oldestReceivedAt: F({ minimum: 0 }),
                }),
              ),
            ),
          }),
        ),
        modelPricing: j(
          X({
            state: B([I(`ok`), I(`degraded`), I(`disabled`)]),
            sources: A(
              X({
                source: B([I(`openrouter`), I(`litellm`), I(`bootstrap`), I(`refresh`)]),
                state: B([I(`ok`), I(`degraded`)]),
                lastFailureAt: j(F({ minimum: 0 })),
                detail: j(z()),
              }),
            ),
            lastFailureAt: j(F({ minimum: 0 })),
            detail: j(z()),
          }),
        ),
        configReload: j(X({ hotReloadStatus: B([I(`active`), I(`disabled`)]) })),
        channels: j(Ky(z(), N())),
        channelOrder: j(A(z())),
        channelLabels: j(Ky(z(), z())),
        heartbeatSeconds: j(F({ minimum: 0 })),
        defaultAgentId: j(z()),
        agents: j(
          A(
            X({
              agentId: z(),
              name: j(z()),
              isDefault: P(),
              heartbeat: X({
                enabled: P(),
                every: z(),
                everyMs: B([F({ minimum: 0 }), L()]),
                prompt: z(),
                target: z(),
                model: j(z()),
                session: j(z()),
                ackMaxChars: F({ minimum: 0 }),
              }),
              sessions: Uz,
            }),
          ),
        ),
        sessions: j(Uz),
      })),
      (Gz = X({
        defaultAgentId: Z,
        modelConfigured: j(P()),
        ownership: j(wR),
        selectionRequired: j(P()),
        mainKey: Z,
        mainSessionKey: Z,
        scope: j(Z),
      })),
      (Kz = X({ presence: F({ minimum: 0 }), health: F({ minimum: 0 }) })),
      (qz = X({
        presence: A(Hz),
        health: Wz,
        stateVersion: Kz,
        uptimeMs: F({ minimum: 0 }),
        appliedConfigHash: j(B([Z, L()])),
        configPath: j(Z),
        stateDir: j(Z),
        sessionDefaults: j(Gz),
        authMode: j(B([I(`none`), I(`token`), I(`password`), I(`trusted-proxy`), I(`accounts`)])),
        updateAvailable: j(Fz),
        updateSchedule: j(Rz),
      })));
  }))();
}
var Yz;
function Xz() {
  return (Xz = e(() => {
    Yz = [
      `auth`,
      `auth_permanent`,
      `format`,
      `rate_limit`,
      `overloaded`,
      `billing`,
      `server_error`,
      `timeout`,
      `tls_certificate`,
      `context_overflow`,
      `model_not_found`,
      `session_expired`,
      `empty_response`,
      `no_error_details`,
      `unclassified`,
      `unknown`,
    ];
  }))();
}
var Zz, Qz;
function $z() {
  return ($z = e(() => {
    (_L(), Xz(), (Zz = Yz.map((e) => I(e))), (Qz = B(Zz)));
  }))();
}
var eB, tB, nB, rB, iB, aB, oB;
function sB() {
  return (sB = e(() => {
    (_L(),
      vL(),
      BL(),
      (eB = z({ minLength: 1, maxLength: 256, pattern: `^[^\\r\\n]*\\S[^\\r\\n]*$` })),
      (tB = z({ minLength: 1, maxLength: 8192 })),
      X({ sessionKey: j(Z), idempotencyKey: Z, title: j(eB), body: j(tB) }),
      (nB = { requestId: Z }),
      (rB = X({ ...nB, status: I(`requested`), message: Z })),
      (iB = X({ ...nB, status: I(`publishing`), message: Z })),
      (aB = X({ ...nB, status: I(`published`), url: Z, repository: Z, branch: Z, headCommit: Z })),
      (oB = X({
        ...nB,
        status: I(`failed`),
        code: B([
          I(`identity_changed`),
          I(`identity_unavailable`),
          I(`session_changed`),
          I(`workspace_changed`),
          I(`not_git`),
          I(`not_github`),
          I(`no_changes`),
          I(`push_rejected`),
          I(`github_rejected`),
          I(`unavailable`),
        ]),
        message: Z,
        nextAction: Z,
      })),
      B([rB, iB, aB, oB]));
  }))();
}
var cB, lB, uB, dB, fB, pB, mB, hB, gB, _B, vB, yB, bB, xB;
function SB() {
  return (SB = e(() => {
    (_L(),
      vL(),
      (cB = 65536),
      (lB = z({ minLength: 1, maxLength: 256, pattern: `^\\S(?:.*\\S)?$` })),
      (uB = z({ minLength: 1, maxLength: 128 })),
      (dB = B([
        I(`invalid-credential`),
        I(`credential-expired`),
        I(`environment-mismatch`),
        I(`environment-unavailable`),
        I(`bundle-mismatch`),
        I(`version-mismatch`),
        I(`session-mismatch`),
        I(`placement-mismatch`),
        I(`owner-epoch-mismatch`),
        I(`rpc-set-mismatch`),
        I(`protocol-features-mismatch`),
      ])),
      (fB = B([
        dB,
        I(`admission-rejected`),
        I(`invalid-handshake`),
        I(`protocol-mismatch`),
        I(`gateway-unavailable`),
        I(`invalid-frame`),
        I(`slow-consumer`),
        I(`method-not-allowed`),
        I(`invalid-heartbeat`),
        I(`credential-replaced`),
        I(`gateway-shutdown`),
      ])),
      (pB = B([I(`INVALID_REQUEST`), I(`UNAVAILABLE`)])),
      (mB = X({ reason: fB })),
      (hB = X({
        code: pB,
        message: z({ minLength: 1, maxLength: 256 }),
        details: mB,
        retryable: j(P()),
        retryAfterMs: j(F({ minimum: 0 })),
      })),
      (gB = X({ type: I(`res`), id: uB, ok: I(!1), error: hB })),
      (_B = X({
        input: R({ minimum: 0 }),
        output: R({ minimum: 0 }),
        cacheRead: R({ minimum: 0 }),
        cacheWrite: R({ minimum: 0 }),
        contextUsage: j(
          B([
            X({
              state: I(`available`),
              promptTokens: R({ minimum: 0 }),
              totalTokens: R({ minimum: 0 }),
            }),
            X({ state: I(`unavailable`) }),
          ]),
        ),
        totalTokens: R({ minimum: 0 }),
        cost: X({
          input: R({ minimum: 0 }),
          output: R({ minimum: 0 }),
          cacheRead: R({ minimum: 0 }),
          cacheWrite: R({ minimum: 0 }),
          total: R({ minimum: 0 }),
          totalOrigin: j(I(`provider-billed`)),
        }),
      })),
      (vB = X({
        type: lB,
        timestamp: F({ minimum: 0 }),
        error: j(
          X({
            name: j(z({ maxLength: 256 })),
            message: z({ maxLength: cB }),
            stack: j(z({ maxLength: cB })),
            code: j(B([z({ maxLength: 256 }), R()])),
          }),
        ),
        details: j(Ky(z({ minLength: 1, maxLength: 256 }), N())),
      })),
      (yB = z({ maxLength: cB })),
      (bB = F({ minimum: 0, maximum: 2 ** 53 - 1 })),
      (xB = F({ minimum: 1, maximum: 2 ** 53 - 1 })));
  }))();
}
function CB(e) {
  return X(e);
}
var wB,
  TB,
  EB,
  DB,
  OB,
  kB,
  AB,
  jB,
  MB,
  NB,
  PB,
  FB,
  IB,
  LB,
  RB,
  zB,
  BB,
  VB,
  HB,
  UB,
  WB,
  GB,
  KB,
  qB,
  JB,
  YB,
  XB,
  ZB,
  QB,
  $B,
  eV,
  tV,
  nV,
  rV,
  iV,
  aV,
  oV,
  sV,
  cV,
  lV,
  uV,
  dV,
  fV,
  pV,
  mV,
  hV,
  gV,
  _V,
  vV,
  yV,
  bV,
  xV,
  SV,
  CV,
  wV,
  TV,
  EV,
  DV,
  OV;
function kV() {
  return (kV = e(() => {
    (_L(),
      fe(),
      vL(),
      $z(),
      sB(),
      SB(),
      (wB = [
        `worker.heartbeat`,
        `worker.transcript.commit`,
        `worker.live-event`,
        `worker.sessions.spawn`,
        `worker.sessions.send`,
        `worker.github.publish`,
      ]),
      (TB = 8192),
      (EB = cB),
      (DB = z({ minLength: 16, maxLength: 256 })),
      (OB = z({ minLength: 1, maxLength: 128 })),
      (kB = z({ minLength: 64, maxLength: 64, pattern: `^[a-f0-9]{64}$` })),
      (AB = oR(
        `2026.7`,
        X({
          bundleHash: kB,
          openclawVersion: z({ minLength: 1, maxLength: 128 }),
          protocolFeatures: A(OB, { maxItems: 64, uniqueItems: !0 }),
          bundlePrewarm: j(F({ minimum: 1, maximum: 2 ** 53 - 1 })),
        }),
      )),
      (jB = {
        environmentId: lB,
        credential: DB,
        ownerEpoch: F({ minimum: 0, maximum: 2 ** 53 - 1 }),
        rpcSetVersion: F({ minimum: 1, maximum: 2 ** 53 - 1 }),
        handshake: AB,
      }),
      (MB = B([X({ ...jB, sessionId: L(), runId: L() }), X({ ...jB, sessionId: lB, runId: lB })])),
      (NB = X({
        minProtocol: F({ minimum: 1 }),
        maxProtocol: F({ minimum: 1 }),
        client: X({
          id: I(ue.WORKER),
          version: z({ minLength: 1, maxLength: 128 }),
          platform: z({ minLength: 1, maxLength: 128 }),
          mode: I(p.WORKER),
        }),
        role: I(`worker`),
        admission: MB,
      })),
      X({ type: I(`req`), id: uB, method: I(`connect`), params: NB }),
      (PB = X({
        type: I(`worker-hello-ok`),
        environmentId: lB,
        sessionId: B([lB, L()]),
        ownerEpoch: F({ minimum: 0, maximum: 2 ** 53 - 1 }),
        rpcSetVersion: F({ minimum: 1, maximum: 2 ** 53 - 1 }),
        protocolFeatures: A(OB, { maxItems: 64, uniqueItems: !0 }),
        credentialExpiresAtMs: F({ minimum: 0 }),
        policy: X({ heartbeatIntervalMs: F({ minimum: 1 }), maxPayload: F({ minimum: 1 }) }),
      })),
      (FB = X({ type: I(`res`), id: uB, ok: I(!0), payload: PB })),
      B([FB, gB]),
      (IB = B([I(`ready`), I(`busy`), I(`draining`)])),
      (LB = X({ sentAtMs: F({ minimum: 0 }), status: IB })),
      (RB = X({
        receivedAtMs: F({ minimum: 0 }),
        status: I(`ok`),
        ownerEpoch: F({ minimum: 0, maximum: 2 ** 53 - 1 }),
      })),
      X({ type: I(`req`), id: uB, method: I(wB[0]), params: LB }),
      (zB = X({ type: I(`res`), id: uB, ok: I(!0), payload: RB })),
      B([zB, gB]),
      (BB = z({ minLength: 1, maxLength: 256 })),
      X({
        toolCallId: BB,
        task: z({ minLength: 1, maxLength: TB }),
        label: j(z({ minLength: 1, maxLength: 256 })),
        agentId: j(lB),
        model: j(z({ minLength: 1, maxLength: 256 })),
        runTimeoutSeconds: j(F({ minimum: 0, maximum: 86400 })),
      }),
      X({
        toolCallId: BB,
        sessionKey: z({ minLength: 1, maxLength: 1024 }),
        message: z({ minLength: 1, maxLength: TB }),
        timeoutSeconds: j(F({ minimum: 0, maximum: 86400 })),
      }),
      X({ toolCallId: BB, title: j(eB), body: j(tB) }),
      (VB = X({ resultJson: z({ minLength: 2, maxLength: cB }) })),
      B([X({ type: I(`res`), id: uB, ok: I(!0), payload: VB }), gB]),
      B([X({ type: I(`res`), id: uB, ok: I(!0), payload: VB }), gB]),
      B([X({ type: I(`res`), id: uB, ok: I(!0), payload: VB }), gB]),
      (HB = X({
        type: I(`text`),
        text: z({ maxLength: cB }),
        textSignature: j(z({ minLength: 1, maxLength: cB })),
      })),
      (UB = X({
        type: I(`thinking`),
        thinking: z({ maxLength: cB }),
        thinkingSignature: j(z({ minLength: 1, maxLength: cB })),
        redacted: j(P()),
      })),
      (WB = X({
        type: I(`image`),
        data: z({ minLength: 1, maxLength: cB }),
        mimeType: z({ minLength: 1, maxLength: 256 }),
      })),
      (GB = X({
        type: I(`toolCall`),
        id: lB,
        name: lB,
        arguments: Ky(z({ minLength: 1, maxLength: 256 }), N()),
        thoughtSignature: j(z({ minLength: 1, maxLength: cB })),
        executionMode: j(B([I(`sequential`), I(`parallel`)])),
      })),
      (KB = z({ minLength: 2, maxLength: 16, pattern: `^[a-z0-9]+$` })),
      (qB = X({
        v: I(1),
        type: lB,
        id: j(z({ minLength: 1, maxLength: cB })),
        data: z({ minLength: 1, maxLength: EB }),
        replayIndex: j(F({ minimum: 0, maximum: 2 ** 53 - 1 })),
        provider: lB,
        api: lB,
        model: lB,
        baseUrlHash: j(KB),
        sessionHash: j(KB),
        authProfileHash: j(KB),
      })),
      (JB = X({
        role: I(`user`),
        content: A(B([HB, WB]), { minItems: 1, maxItems: 128 }),
        timestamp: F({ minimum: 0 }),
      })),
      (YB = X({
        role: I(`assistant`),
        content: A(B([HB, UB, GB]), { maxItems: 128 }),
        api: lB,
        provider: lB,
        model: lB,
        responseModel: j(lB),
        responseId: j(lB),
        providerReplay: j(qB),
        diagnostics: j(A(vB, { maxItems: 128 })),
        usage: _B,
        stopReason: B([I(`stop`), I(`length`), I(`toolUse`), I(`error`), I(`aborted`)]),
        errorMessage: j(z({ maxLength: cB })),
        errorCode: j(z({ maxLength: 256 })),
        errorType: j(z({ maxLength: 256 })),
        errorBody: j(z({ maxLength: cB })),
        timestamp: F({ minimum: 0 }),
      })),
      (XB = X({
        role: I(`toolResult`),
        toolCallId: lB,
        toolName: lB,
        content: A(B([HB, WB]), { maxItems: 128 }),
        details: j(N()),
        isError: P(),
        timestamp: F({ minimum: 0 }),
      })),
      (ZB = B([JB, YB, XB])),
      (QB = X({
        runEpoch: F({ minimum: 0, maximum: 2 ** 53 - 1 }),
        seq: F({ minimum: 1, maximum: 2 ** 53 - 1 }),
        baseLeafId: B([lB, L()]),
        messages: A(ZB, { minItems: 1, maxItems: 64 }),
      })),
      ($B = X({ entryIds: A(lB, { minItems: 1, maxItems: 64 }), newLeafId: lB })),
      (eV = B([
        I(`stale-base-leaf`),
        I(`epoch-mismatch`),
        I(`invalid-batch`),
        I(`session-not-attached`),
      ])),
      (tV = X({
        code: I(`INVALID_REQUEST`),
        message: z({ minLength: 1, maxLength: 256 }),
        details: X({ reason: eV }),
      })),
      X({ type: I(`req`), id: uB, method: I(wB[1]), params: QB }),
      (nV = X({ type: I(`res`), id: uB, ok: I(!0), payload: $B })),
      (rV = X({ type: I(`res`), id: uB, ok: I(!1), error: tV })),
      B([nV, rV, gB]),
      (iV = j(yB)),
      (aV = j(bB)),
      (oV = z({ minLength: 1, maxLength: cB, pattern: `^\\S(?:.*\\S)?$` })),
      (sV = CB({
        text: yB,
        delta: yB,
        replace: j(I(!0)),
        mediaUrls: j(A(oV, { maxItems: 128 })),
        phase: j(B([I(`commentary`), I(`final_answer`)])),
        itemId: j(lB),
      })),
      (cV = CB({ text: yB, delta: yB })),
      (lV = { name: lB, toolCallId: lB, hideFromChannelProgress: j(I(!0)) }),
      (uV = B([
        CB({ ...lV, phase: I(`start`), args: N() }),
        CB({ ...lV, phase: I(`update`), partialResult: N() }),
        CB({
          ...lV,
          phase: I(`result`),
          meta: iV,
          isError: P(),
          result: N(),
          toolErrorSummary: iV,
        }),
      ])),
      (dV = {
        kind: B([I(`exec`), I(`plugin`), I(`unknown`)]),
        title: yB,
        itemId: j(lB),
        toolCallId: j(lB),
        approvalId: j(lB),
        approvalSlug: j(lB),
        command: iV,
        host: iV,
        reason: iV,
        scope: j(B([I(`turn`), I(`session`)])),
        message: iV,
      }),
      (fV = B([
        CB({ ...dV, phase: I(`requested`), status: B([I(`pending`), I(`unavailable`)]) }),
        CB({ ...dV, phase: I(`resolved`), status: B([I(`approved`), I(`denied`), I(`failed`)]) }),
      ])),
      (pV = CB({ phase: I(`start`), startedAt: bB })),
      (mV = CB({
        provider: oV,
        model: oV,
        error: yB,
        reason: j(Qz),
        authMode: j(oV),
        status: aV,
        code: j(z({ minLength: 1, maxLength: cB })),
      })),
      (hV = { selectedProvider: oV, selectedModel: oV, activeProvider: oV, activeModel: oV }),
      (gV = CB({
        ...hV,
        phase: I(`fallback`),
        reasonSummary: yB,
        attemptSummaries: A(yB, { maxItems: 128 }),
        attempts: A(mV, { maxItems: 128 }),
      })),
      (_V = CB({ ...hV, phase: I(`fallback_cleared`), previousActiveModel: j(oV) })),
      (vV = CB({
        phase: I(`fallback_step`),
        fallbackStepType: I(`fallback_step`),
        fallbackStepFromModel: oV,
        fallbackStepToModel: j(oV),
        fallbackStepFromFailureReason: j(Qz),
        fallbackStepFromFailureDetail: iV,
        fallbackStepChainPosition: aV,
        fallbackStepFinalOutcome: B([I(`next_fallback`), I(`succeeded`), I(`chain_exhausted`)]),
      })),
      (yV = {
        startedAt: aV,
        endedAt: bB,
        stopReason: j(lB),
        yielded: j(I(!0)),
        timeoutPhase: j(
          B([I(`queue`), I(`preflight`), I(`provider`), I(`post_turn`), I(`gateway_draining`)]),
        ),
        providerStarted: j(P()),
        aborted: j(P()),
        toolErrorSummary: iV,
        livenessState: j(B([I(`working`), I(`paused`), I(`blocked`), I(`abandoned`)])),
        replayInvalid: j(I(!0)),
      }),
      (bV = B([
        CB({ ...yV, phase: I(`finishing`), error: iV }),
        CB({ ...yV, phase: I(`end`) }),
        CB({ ...yV, phase: I(`error`), error: yB, fallbackExhaustedFailure: j(I(!0)) }),
      ])),
      (xV = B([pV, gV, _V, vV, bV])),
      (SV = B([
        CB({ kind: I(`assistant`), payload: sV }),
        CB({ kind: I(`thinking`), payload: cV }),
        CB({ kind: I(`tool`), payload: uV }),
        CB({ kind: I(`approval`), payload: fV }),
        CB({ kind: I(`lifecycle`), payload: xV }),
      ])),
      (CV = CB({ runEpoch: bB, lastAckedSeq: bB, seq: xB, runId: lB, event: SV })),
      (wV = CB({ ackedSeq: bB })),
      (TV = B([
        CB({
          reason: B([
            I(`epoch-mismatch`),
            I(`session-not-attached`),
            I(`invalid-event`),
            I(`capacity-exceeded`),
          ]),
        }),
        CB({ reason: I(`resync-required`), ackedSeq: bB, expectedSeq: xB }),
      ])),
      (EV = CB({
        code: I(`INVALID_REQUEST`),
        message: z({ minLength: 1, maxLength: 256 }),
        details: TV,
      })),
      CB({ type: I(`req`), id: uB, method: I(wB[2]), params: CV }),
      (DV = CB({ type: I(`res`), id: uB, ok: I(!0), payload: wV })),
      (OV = CB({ type: I(`res`), id: uB, ok: I(!1), error: EV })),
      B([DV, OV, gB]));
  }))();
}
var AV, jV, MV, NV, PV;
function FV() {
  return (FV = e(() => {
    (_L(),
      vL(),
      BL(),
      UL(),
      Jz(),
      kV(),
      (AV = {
        BOARD_WIDGET_PUT_CANVAS_DOC: `board-widget-put-canvas-doc`,
        CHAT_SEND_ROUTING_CONTRACT: `chat-send-routing-contract`,
        GATEWAY_RESTART_TARGET_SAFE: `gateway-restart-target-safe-v1`,
        NODE_WORKER_BUNDLE_RETENTION: `node-worker-bundle-retention-v1`,
        NODE_WORKER_BUNDLE_STATUS: `node-worker-bundle-status-v1`,
        SYSTEM_AGENT_WIZARD_CANCEL: `openclaw-chat-wizard-cancel`,
        SYSTEM_AGENT_SETUP_MODEL_REF: `openclaw-setup-model-ref`,
        TASK_SUGGESTIONS_ACCEPT_MODES: `taskSuggestions.acceptModes`,
      }),
      X({ ts: F({ minimum: 0 }) }),
      X({ reason: Z, restartExpectedMs: j(F({ minimum: 0 })) }),
      X({
        minProtocol: F({ minimum: 1 }),
        maxProtocol: F({ minimum: 1 }),
        client: X({
          id: AL,
          displayName: j(Z),
          version: Z,
          buildId: j(z({ minLength: 1, maxLength: 96 })),
          platform: Z,
          deviceFamily: j(Z),
          modelIdentifier: j(Z),
          timeZone: j(z({ minLength: 1, maxLength: 64 })),
          mode: jL,
          instanceId: j(Z),
        }),
        caps: j(A(Z, { default: [] })),
        commands: j(A(Z)),
        computerUse: j(N()),
        workerRuns: j(AB),
        permissions: j(Ky(Z, P())),
        pathEnv: j(z()),
        role: j(Z),
        scopes: j(A(Z)),
        device: j(X({ id: Z, publicKey: Z, signature: Z, signedAt: F({ minimum: 0 }), nonce: Z })),
        auth: j(
          X({
            token: j(z()),
            bootstrapToken: j(z()),
            deviceToken: j(z()),
            password: j(z()),
            approvalRuntimeToken: j(z()),
            agentRuntimeIdentityToken: j(z()),
          }),
        ),
        locale: j(z()),
        userAgent: j(z()),
      }),
      X({
        type: I(`hello-ok`),
        protocol: F({ minimum: 1 }),
        server: X({
          version: Z,
          buildId: j(z({ minLength: 1, maxLength: 96 })),
          bootId: j(z({ minLength: 1, maxLength: 96 })),
          controlUiBuildSource: j(B([I(`bundled`), I(`configured`)])),
          connId: Z,
        }),
        features: X({ methods: A(Z), events: A(Z), capabilities: j(A(Z)) }),
        snapshot: qz,
        controlUiTabs: j(
          A(
            X({
              pluginId: Z,
              id: Z,
              label: Z,
              description: j(z()),
              icon: j(z()),
              path: j(z()),
              placement: j(z()),
              requiresGatewayAuth: j(P()),
              group: j(B([I(`control`), I(`agent`)])),
              order: j(R()),
            }),
          ),
        ),
        controlUiWidgetKinds: j(A(X({ pluginId: Z, kind: Z, label: Z }))),
        pluginSurfaceUrls: j(Ky(Z, Z)),
        auth: X({
          deviceToken: j(Z),
          recoveryMigrationAllowed: j(I(!0)),
          recoveryScope: j(Z),
          role: Z,
          scopes: A(Z),
          issuedAtMs: j(F({ minimum: 0 })),
          deviceTokens: j(
            A(X({ deviceToken: Z, role: Z, scopes: A(Z), issuedAtMs: F({ minimum: 0 }) })),
          ),
        }),
        policy: X({
          maxPayload: F({ minimum: 1 }),
          maxBufferedBytes: F({ minimum: 1 }),
          tickIntervalMs: F({ minimum: 1 }),
          attachments: j(X({ maxBytes: F({ minimum: 1 }), maxImageBytes: F({ minimum: 1 }) })),
          allowedSessionVisibilities: j(A(VL)),
          hasMultipleSessionSharingIdentities: j(P()),
        }),
      }),
      (jV = X({
        code: Z,
        message: Z,
        details: j(N()),
        retryable: j(P()),
        retryAfterMs: j(F({ minimum: 0 })),
      })),
      (MV = X({
        type: I(`req`),
        id: Z,
        method: Z,
        params: j(N()),
        traceparent: j(z({ maxLength: 128 })),
      })),
      (NV = X({ type: I(`res`), id: Z, ok: P(), payload: j(N()), error: j(jV) })),
      (PV = X({
        type: I(`event`),
        event: Z,
        payload: j(N()),
        seq: j(F({ minimum: 0 })),
        stateVersion: j(Kz),
      })),
      B([MV, NV, PV], { discriminator: `type` }));
  }))();
}
var IV;
function LV() {
  return (LV = e(() => {
    IV = 1e3;
  }))();
}
var RV, zV, BV, VV, HV, UV, WV, GV, KV, qV, JV, YV, XV, ZV;
function QV() {
  return (QV = e(() => {
    (_L(),
      LV(),
      vL(),
      BL(),
      X({
        cursor: j(F({ minimum: 0 })),
        limit: j(F({ minimum: 1, maximum: 5e3 })),
        maxBytes: j(F({ minimum: 1, maximum: 1e6 })),
      }),
      X({
        file: Z,
        cursor: F({ minimum: 0 }),
        size: F({ minimum: 0 }),
        lines: A(z()),
        truncated: j(P()),
        reset: j(P()),
      }),
      X({
        sessionKey: Z,
        agentId: j(Z),
        cursor: j(z()),
        limit: j(F({ minimum: 1, maximum: IV })),
        offset: j(F({ minimum: 0 })),
        messageId: j(Z),
        sessionId: j(Z),
        maxChars: j(F({ minimum: 1, maximum: 5e5 })),
      }),
      (RV = X({
        kind: I(`delta`),
        messages: A(N()),
        deltaCursor: z(),
        sessionInfo: N(),
        agentsList: j(N()),
        metadata: j(N()),
      })),
      (zV = X({ kind: I(`reset`) })),
      B([RV, zV]),
      X({ agentId: j(Z) }),
      X({
        sessionKey: Z,
        agentId: j(Z),
        items: A(
          X({
            id: z({ minLength: 1, maxLength: 64 }),
            name: z({ minLength: 1, maxLength: 200 }),
            input: z({ minLength: 1, maxLength: 4e3 }),
          }),
          { minItems: 1, maxItems: 24 },
        ),
      }),
      X({ titles: Ky(z(), z()), disabled: j(P()) }),
      X({
        sessionKey: Z,
        agentId: j(Z),
        messageId: Z,
        maxChars: j(F({ minimum: 1, maximum: 2e6 })),
      }),
      X({
        ok: P(),
        message: j(N()),
        unavailableReason: j(B([I(`not_found`), I(`oversized`), I(`not_visible`)])),
      }),
      (BV = M(
        {
          type: j(z()),
          mimeType: j(z()),
          fileName: j(z()),
          content: j(N()),
          sizeBytes: j(R()),
          durationMs: j(R()),
          width: j(R()),
          height: j(R()),
        },
        { additionalProperties: !0 },
      )),
      (VV = A(BV)),
      (HV = Ky(z({ minLength: 1, maxLength: 128 }), N(), { maxProperties: 16 })),
      (UV = [`steer`, `followup`, `collect`, `interrupt`]),
      X({
        sessionKey: DL,
        agentId: j(Z),
        sessionId: j(Z),
        message: z(),
        thinking: j(z()),
        fastMode: j(B([P(), I(`auto`)])),
        fastAutoOnSeconds: j(F({ minimum: 1 })),
        queueMode: j(z({ enum: [...UV] })),
        deliver: j(P()),
        originatingChannel: j(z()),
        originatingTo: j(z()),
        originatingAccountId: j(z()),
        originatingThreadId: j(z()),
        replyToId: j(Z),
        attachments: j(VV),
        toolBindings: j(HV),
        timeoutMs: j(F({ minimum: 0 })),
        systemInputProvenance: j(kL),
        systemProvenanceReceipt: j(z()),
        suppressCommandInterpretation: j(P()),
        expectedLeafEntryId: j(B([Z, L()])),
        expectedSessionRoutingContract: j(Z),
        idempotencyKey: Z,
      }),
      X({ sessionKey: Z, agentId: j(Z), runId: j(Z), preserveSideRuns: j(P()) }),
      X({ sessionKey: Z, agentId: j(Z), message: Z, label: j(z({ maxLength: 100 })) }),
      (WV = { runId: Z, sessionKey: Z, agentId: j(Z), spawnedBy: j(Z), seq: F({ minimum: 0 }) }),
      (GV = B([I(`refusal`), I(`timeout`), I(`rate_limit`), I(`context_length`), I(`unknown`)])),
      (KV = B([
        I(`preparing_workspace`),
        I(`provisioning_environment`),
        I(`preparing_context`),
        I(`starting_model`),
      ])),
      (qV = X({ ...WV, state: I(`status`), phase: KV })),
      (JV = X({
        ...WV,
        state: I(`delta`),
        message: j(N()),
        deltaText: z(),
        replace: j(P()),
        usage: j(N()),
      })),
      (YV = X({
        ...WV,
        state: I(`final`),
        message: j(N()),
        usage: j(N()),
        stopReason: j(z()),
        yielded: j(I(!0)),
      })),
      (XV = X({
        ...WV,
        state: I(`aborted`),
        message: j(N()),
        errorMessage: j(z()),
        stopReason: j(z()),
      })),
      (ZV = X({
        ...WV,
        state: I(`error`),
        message: j(N()),
        errorMessage: j(z()),
        errorKind: j(GV),
        usage: j(N()),
        stopReason: j(z()),
      })),
      B([qV, JV, YV, XV, ZV]));
  }))();
}
var $V, eH, tH, nH, rH, iH, aH, oH, sH, cH;
function lH() {
  return (lH = e(() => {
    (_L(),
      vL(),
      BL(),
      ($V = N()),
      (eH = X({
        id: Z,
        pluginId: Z,
        pluginName: j(Z),
        surface: B([I(`session`), I(`tool`), I(`run`), I(`settings`), I(`tab`), I(`widget`)]),
        label: Z,
        description: j(z()),
        placement: j(z()),
        schema: j($V),
        requiredScopes: j(A(Z)),
      })),
      X({}),
      X({ ok: I(!0), descriptors: A(eH) }),
      X({ pluginId: Z, actionId: Z, sessionKey: j(Z), agentId: j(Z), payload: j($V) }),
      (tH = X({ ok: I(!0), result: j($V), continueAgent: j(P()), reply: j($V) })),
      (nH = X({ ok: I(!1), error: z(), code: j(z()), details: j($V) })),
      B([tH, nH]),
      (rH = X({ source: I(`clawhub`), packageName: Z })),
      (iH = X({ source: I(`official`), pluginId: Z })),
      (aH = B([rH, iH])),
      (oH = X({
        id: Z,
        name: Z,
        packageName: j(Z),
        description: j(z()),
        version: j(Z),
        kind: j(A(Z)),
        origin: j(Z),
        installed: P(),
        enabled: P(),
        state: B([I(`enabled`), I(`disabled`), I(`not-installed`), I(`error`)]),
        featured: j(P()),
        featuredAt: j(F({ minimum: 0 })),
        order: j(R()),
        hasIcon: j(P()),
        install: j(aH),
        error: j(z()),
        category: j(Z),
        removable: j(P()),
      })),
      X({}),
      X({ plugins: A(oH), diagnostics: A(N()), mutationAllowed: P() }),
      X({ query: Z, limit: j(F({ minimum: 1, maximum: 100 })) }),
      (sH = X({
        name: Z,
        displayName: Z,
        family: B([I(`code-plugin`), I(`bundle-plugin`)]),
        channel: B([I(`official`), I(`community`), I(`private`)]),
        isOfficial: P(),
        summary: j(z()),
        latestVersion: j(Z),
        runtimeId: j(Z),
        downloads: j(R({ minimum: 0 })),
        verificationTier: j(Z),
      })),
      (cH = X({ score: R(), package: sH })),
      X({ results: A(cH) }),
      B([
        X({
          source: I(`clawhub`),
          packageName: Z,
          version: j(Z),
          acknowledgeClawHubRisk: j(P()),
          acknowledgeInstallPolicyWarning: j(I(!0)),
        }),
        X({ source: I(`official`), pluginId: Z, acknowledgeInstallPolicyWarning: j(I(!0)) }),
      ]),
      X({ ok: I(!0), plugin: oH, restartRequired: I(!0), warnings: j(A(z())) }),
      X({}),
      X({ ok: I(!0) }),
      X({ pluginId: Z }),
      X({ ok: I(!0), pluginId: Z, restartRequired: I(!0), removed: A(z()), warnings: j(A(z())) }),
      X({ pluginId: Z, enabled: P() }),
      X({ ok: I(!0), plugin: oH, restartRequired: P(), warnings: j(A(z())) }));
  }))();
}
var uH, dH;
function fH() {
  return (fH = e(() => {
    (BL(), (uH = Z), (dH = Z));
  }))();
}
var pH, mH, hH, gH;
function _H() {
  return (_H = e(() => {
    (_L(),
      vL(),
      BL(),
      fH(),
      UL(),
      (pH = B([I(`read-only`), I(`guarded`), I(`workspace`), I(`full`)])),
      (mH = X({
        mcpServers: j(Ky(z({ minLength: 1 }), P())),
        mcpToolsDeny: j(Ky(z({ minLength: 1 }), A(Z))),
        skills: j(Ky(z({ minLength: 1 }), P())),
        webSearch: j(P()),
      })),
      (hH = X({
        type: B([I(`human`), I(`agent`), I(`system`)]),
        id: j(Z),
        label: j(Z),
        avatarUrl: j(Z),
      })),
      (gH = X({ actor: hH, assignedBy: j(hH), assignedAt: j(R({ minimum: 0 })) })),
      M(
        {
          key: z(),
          sessionId: j(z()),
          incognito: j(I(!0)),
          kind: B([I(`direct`), I(`group`), I(`global`), I(`unknown`)]),
          label: j(z()),
          icon: j(z()),
          channelAvatarUrl: j(Z),
          boardFace: j(B([I(`chat`), I(`dashboard`)])),
          displayName: j(z()),
          derivedTitle: j(z()),
          lastMessagePreview: j(z()),
          channel: j(z()),
          classification: j(uH),
          agentId: j(Z),
          accountId: j(Z),
          peerKind: j(dH),
          isMain: j(P()),
          isBackground: j(P()),
          chatType: j(B([I(`direct`), I(`group`), I(`channel`)])),
          updatedAt: j(B([R(), L()])),
          archived: j(P()),
          archivedAt: j(R()),
          archivedBy: j(hH),
          pinned: j(P()),
          pinnedAt: j(R()),
          unread: j(P()),
          lastReadAt: j(R()),
          lastActivityAt: j(R()),
          lastInteractionAt: j(R()),
          status: j(
            B([I(`queued`), I(`running`), I(`done`), I(`failed`), I(`killed`), I(`timeout`)]),
          ),
          lastRunError: j(z()),
          lastRunId: j(Z),
          restartRecoveryStatus: j(I(`tombstoned`)),
          activeLeafEntryId: j(B([Z, L()])),
          spawnedBy: j(z()),
          parentSessionKey: j(z()),
          controlOwnerSessionKey: j(z()),
          childSessions: j(A(z())),
          forkedFromParent: j(P()),
          spawnDepth: j(R()),
          subagentRole: j(B([I(`orchestrator`), I(`leaf`)])),
          subagentControlScope: j(B([I(`children`), I(`none`)])),
          swarmGroupId: j(z()),
          worktree: j(M({ id: z(), branch: z(), repoRoot: z() })),
          execNode: j(z()),
          execCwd: j(z()),
          spawnedWorkspaceDir: j(z()),
          spawnedCwd: j(z()),
          permissionMode: j(pH),
          sessionRoot: j(z()),
          createdVia: j(
            B([
              I(`operator`),
              I(`spawn`),
              I(`channel`),
              I(`cron`),
              I(`talk`),
              I(`run`),
              I(`plugin`),
              I(`internal`),
            ]),
          ),
          createdActor: j(hH),
          owner: j(gH),
          participants: j(A(hH, { maxItems: 4 })),
          participantCount: j(F({ minimum: 0 })),
          visibility: j(VL),
          sharingRole: j(HL),
          createdAt: j(R()),
          forkSource: j(M({ sessionKey: z(), sessionId: z(), entryId: j(z()) })),
          previousSessionId: j(z()),
          inputTokens: j(R()),
          outputTokens: j(R()),
          totalTokens: j(R()),
          totalTokensFresh: j(P()),
          contextTokens: j(R()),
          estimatedCostUsd: j(R()),
          model: j(z()),
          modelProvider: j(z()),
          toolOverrides: j(mH),
        },
        { additionalProperties: !0 },
      ));
  }))();
}
var vH;
function yH() {
  return (yH = e(() => {
    (_L(),
      vL(),
      QV(),
      BL(),
      _H(),
      UL(),
      (vH = 24e4),
      X({
        key: j(Z),
        idempotencyKey: j(Z),
        agentId: j(Z),
        label: j(OL),
        category: j(OL),
        model: j(Z),
        contextWindow: j(Z),
        thinkingLevel: j(Z),
        permissionMode: j(pH),
        incognito: j(P()),
        visibility: j(VL),
        catalogId: j(Z),
        parentSessionKey: j(Z),
        spawnDepth: j(
          F({
            minimum: 1,
            description: `Spawn-lineage depth for spawn-owned creations (visible subagent sessions); requires parentSessionKey. Omitted creations persist as root sessions (depth 0).`,
          }),
        ),
        fork: j(P({ description: `Fork the parent transcript; requires parentSessionKey.` })),
        forkFrom: j(
          I(`last-completed`, {
            description: `Fork through the parent's last completed assistant message; requires fork=true.`,
          }),
        ),
        emitCommandHooks: j(P()),
        succeedsParent: j(
          P({
            description: `When sessions.create creates a distinct child, whether that child succeeds its parent and emits the parent's terminal session_end. Requires parentSessionKey and emitCommandHooks. False keeps the parent active; omission preserves legacy behavior.`,
          }),
        ),
        task: j(z()),
        message: j(z()),
        attachments: j(VV),
        projectId: j(
          z({ minLength: 1, description: `Start in a registered project; operator.write.` }),
        ),
        worktree: j(P()),
        worktreeBaseRef: j(
          z({
            minLength: 1,
            description: `Base ref for the new managed worktree branch. Requires worktree=true.`,
          }),
        ),
        worktreeName: j(
          z({
            pattern: `^[a-z0-9][a-z0-9-]{0,63}$`,
            description: `Managed worktree name; becomes branch openclaw/<name>. Requires worktree=true.`,
          }),
        ),
        execNode: j(
          z({
            minLength: 1,
            description: `Bind session exec to host=node with this node id/name. Requires operator.admin.`,
          }),
        ),
        cwd: j(
          z({
            minLength: 1,
            description: `Absolute Gateway working directory, managed-worktree source directory, or working directory on execNode. Gateway paths outside configured agent workspaces and all execNode paths require operator.admin.`,
          }),
        ),
      }));
  }))();
}
function bH() {
  if (TH === void 0)
    try {
      TH = RegExp(`^\\p{RGI_Emoji}$`, `v`);
    } catch {
      TH = null;
    }
  return TH;
}
function xH(e) {
  return e.length > 16 || /^[!-~]$/u.test(e)
    ? !1
    : [...new Intl.Segmenter(void 0, { granularity: `grapheme` }).segment(e)].length === 1;
}
function SH(e) {
  let t = e.trim();
  if (!t) return null;
  if (wH.has(t)) return t;
  let n = bH();
  return (n ? n.test(t) : xH(t)) ? t : null;
}
var CH, wH, TH;
function EH() {
  return (EH = e(() => {
    ((CH = [`braces`, `book`, `monitor`, `bot`, `kanban`, `coins`]), (wH = new Set(CH)));
  }))();
}
var DH,
  OH,
  kH,
  AH,
  jH,
  MH,
  NH,
  PH,
  FH,
  IH,
  LH,
  RH,
  zH,
  BH,
  VH,
  HH,
  UH,
  WH,
  GH,
  KH,
  qH,
  JH,
  YH,
  XH,
  ZH,
  QH;
function $H() {
  return ($H = e(() => {
    (_L(),
      vL(),
      FV(),
      QV(),
      lH(),
      BL(),
      _H(),
      (DH = B([
        I(`on-track`),
        I(`grinding`),
        I(`stuck`),
        I(`waiting-on-user`),
        I(`wrapping-up`),
        I(`done`),
        I(`failed`),
      ])),
      (OH = X({ completed: F({ minimum: 0 }), total: F({ minimum: 0 }) })),
      (kH = X({
        sessionKey: Z,
        agentId: j(Z),
        runId: j(Z),
        revision: F({ minimum: 1 }),
        updatedAt: F({ minimum: 0 }),
        headline: z({ minLength: 1, maxLength: 120 }),
        assessment: j(z({ minLength: 1, maxLength: 320 })),
        health: DH,
        planProgress: j(OH),
      })),
      X({ visible: P() }),
      X({ ok: I(!0) }),
      (AH = X({
        question: z({ minLength: 1, maxLength: 400 }),
        answer: z({ minLength: 1, maxLength: 1200 }),
        ts: F({ minimum: 0 }),
      })),
      X({ sessionKey: Z, agentId: j(Z), question: z({ minLength: 1, maxLength: 400 }) }),
      X({ answer: z({ minLength: 1, maxLength: 1200 }), ts: F({ minimum: 0 }) }),
      X({ sessionKey: Z, agentId: j(Z) }),
      X({ exchanges: A(AH, { maxItems: 24 }) }),
      X({ sessionKey: Z, agentId: j(Z) }),
      X({ ok: I(!0) }),
      (jH = B([I(`manual`), I(`auto-threshold`), I(`overflow-retry`), I(`timeout-retry`)])),
      X({
        operationId: Z,
        operation: I(`compact`),
        phase: B([I(`start`), I(`end`)]),
        sessionKey: Z,
        agentId: j(Z),
        ts: F({ minimum: 0 }),
        completed: j(P()),
        reason: j(z()),
      }),
      (MH = X({ sessionId: Z, sessionFile: j(Z), leafId: j(Z), entryId: j(Z) })),
      (NH = X({
        checkpointId: Z,
        sessionKey: Z,
        sessionId: Z,
        createdAt: F({ minimum: 0 }),
        reason: jH,
        tokensBefore: j(F({ minimum: 0 })),
        tokensAfter: j(F({ minimum: 0 })),
        tokensVersion: j(I(1)),
        summary: j(z()),
        firstKeptEntryId: j(Z),
        preCompaction: MH,
        postCompaction: MH,
      })),
      (PH = B([I(`modified`), I(`read`)])),
      (FH = B([I(`modified`), I(`read`), I(`mixed`)])),
      (IH = B([I(`utf8`), I(`base64`)])),
      (LH = B([I(`text`), I(`image`), I(`unsupported`)])),
      (RH = z({ minLength: 64, maxLength: 64, pattern: `^[a-f0-9]{64}$` })),
      (zH = X({
        path: Z,
        workspacePath: j(Z),
        name: Z,
        kind: PH,
        missing: P(),
        size: j(F({ minimum: 0 })),
        updatedAtMs: j(F({ minimum: 0 })),
        content: j(z()),
        hash: j(RH),
        mimeType: j(Z),
        contentEncoding: j(IH),
        previewKind: j(LH),
      })),
      (BH = X({
        path: z(),
        name: Z,
        kind: B([I(`file`), I(`directory`)]),
        sessionKind: j(FH),
        size: j(F({ minimum: 0 })),
        updatedAtMs: j(F({ minimum: 0 })),
      })),
      (VH = X({
        path: z(),
        parentPath: j(z()),
        search: j(z()),
        entries: A(BH),
        truncated: j(P()),
      })),
      X({ sessionKey: Z, agentId: j(Z), path: j(z()), search: j(z()) }),
      X({ sessionKey: Z, root: j(Z), gitCheckout: j(P()), files: A(zH), browser: j(VH) }),
      X({ sessionKey: Z, path: Z, agentId: j(Z) }),
      X({ sessionKey: Z, root: j(Z), file: zH }),
      X({ sessionKey: Z, path: Z, agentId: j(Z), content: z(), expectedHash: RH }),
      X({ sessionKey: Z, root: j(Z), file: zH }),
      X({ key: Z, agentId: j(Z) }),
      X({ ok: P(), path: j(Z), error: j(Z) }),
      (HH = B([I(`added`), I(`modified`), I(`deleted`), I(`renamed`)])),
      (UH = X({
        path: Z,
        oldPath: j(Z),
        status: HH,
        additions: F({ minimum: 0 }),
        deletions: F({ minimum: 0 }),
        binary: j(P()),
        untracked: j(P()),
        patch: j(z()),
        truncated: j(P()),
      })),
      (WH = X({ sha: Z, subject: z() })),
      (GH = B([I(`all`), I(`uncommitted`), I(`commit`)])),
      X({ sessionKey: Z, agentId: j(Z), scope: j(GH), commit: j(Z) }),
      X({
        sessionKey: Z,
        root: j(Z),
        branch: j(Z),
        baseRef: j(Z),
        aheadCount: j(F({ minimum: 0 })),
        commits: j(A(WH, { maxItems: 50 })),
        mergeBase: j(WH),
        files: A(UH),
        additions: F({ minimum: 0 }),
        deletions: F({ minimum: 0 }),
        truncated: j(P()),
        unavailableReason: j(B([I(`unknown_session`), I(`not_git`), I(`unknown_commit`)])),
      }),
      X({
        limit: j(F({ minimum: 1 })),
        offset: j(F({ minimum: 0 })),
        activeMinutes: j(F({ minimum: 1 })),
        requireLastInteraction: j(P()),
        sortBy: j(B([I(`updatedAt`), I(`lastInteractionAt`)])),
        includeGlobal: j(P()),
        includeUnknown: j(P()),
        configuredAgentsOnly: j(P()),
        includeDerivedTitles: j(P()),
        includeLastMessage: j(P()),
        label: j(OL),
        boardFace: j(B([I(`chat`), I(`dashboard`)])),
        creatorId: j(Z),
        ownerId: j(Z),
        involvingMe: j(P()),
        spawnedBy: j(Z),
        agentId: j(Z),
        search: j(z()),
        archived: j(B([P(), I(`all`)])),
      }),
      X({
        agentId: j(Z),
        sessionKeys: j(A(Z, { minItems: 1, maxItems: 200 })),
        query: z({ minLength: 1, maxLength: 4096 }),
        limit: j(F({ minimum: 1, maximum: 25 })),
      }),
      (KH = X({
        sessionKey: Z,
        sessionId: Z,
        messageId: Z,
        role: B([I(`user`), I(`assistant`)]),
        timestamp: F({ minimum: 0 }),
        snippet: z(),
        score: R(),
      })),
      X({ results: A(KH), indexing: j(P()), truncated: j(P()) }),
      X({
        agent: j(Z),
        allAgents: j(P()),
        enforce: j(P()),
        activeKey: j(Z),
        fixMissing: j(P()),
        fixDmScope: j(P()),
      }),
      X({
        keys: A(Z, { minItems: 1 }),
        limit: j(F({ minimum: 1 })),
        maxChars: j(F({ minimum: 20 })),
      }),
      X({ key: Z, includeDerivedTitles: j(P()), includeLastMessage: j(P()) }),
      (qH = X({ id: Z, path: Z, branch: Z })),
      M(
        {
          ok: I(!0),
          key: Z,
          sessionId: j(Z),
          entry: j(Ky(z(), N())),
          runStarted: j(P()),
          runId: j(Z),
          messageSeq: j(F({ minimum: 1 })),
          runError: j(jV),
          worktree: j(qH),
        },
        { additionalProperties: !0 },
      ),
      X({
        key: Z,
        agentId: j(Z),
        message: z(),
        thinking: j(z()),
        attachments: j(VV),
        timeoutMs: j(F({ minimum: 0 })),
        idempotencyKey: j(Z),
      }),
      X({ key: Z, agentId: j(Z), includeApprovals: j(I(!0)) }),
      X({ key: Z, agentId: j(Z) }),
      X({ key: j(Z), runId: j(Z), agentId: j(Z), clearQueued: j(P()) }),
      X({ key: Z, agentId: j(Z), pluginId: Z, namespace: Z, value: j($V), unset: j(P()) }),
      X({ ok: I(!0), key: Z, value: j($V) }),
      X({ key: Z, agentId: j(Z), reason: j(B([I(`new`), I(`reset`)])) }),
      X({ key: Z, agentId: j(Z), owner: X({ type: B([I(`agent`), I(`human`)]), id: Z }) }),
      X({ ok: I(!0), key: Z, owner: gH }),
      X({}),
      (JH = X({ name: OL, position: F({ minimum: 0 }) })),
      (YH = X({ name: OL, cwd: j(Z), worktree: j(P()) })),
      (XH = z({ minLength: 1, maxLength: 512 })),
      X({ groups: A(JH), sectionOrder: j(A(XH, { maxItems: 232 })) }),
      X({}),
      X({ defaults: A(YH) }),
      X({ names: A(OL, { maxItems: 200 }), sectionOrder: j(A(XH, { maxItems: 232 })) }),
      X({ name: OL, to: OL }),
      X({ name: OL, cwd: B([Z, L()]), worktree: P() }),
      X({ ok: I(!0), defaults: A(YH) }),
      X({ name: OL }),
      X({
        ok: I(!0),
        groups: A(JH),
        sectionOrder: j(A(XH, { maxItems: 232 })),
        updatedSessions: j(F({ minimum: 0 })),
      }),
      X({ key: Z, agentId: j(Z), maxLines: j(F({ minimum: 1 })) }),
      X({ key: Z, agentId: j(Z) }),
      X({ key: Z, agentId: j(Z), checkpointId: Z }),
      X({ key: Z, agentId: j(Z), checkpointId: Z }),
      X({ sessionKey: Z, agentId: j(Z), entryId: Z }),
      X({ sessionKey: Z, agentId: j(Z), entryId: Z }),
      (ZH = X({ mimeType: z(), data: z() })),
      X({ editorText: j(z()), editorAttachments: j(A(ZH)) }),
      X({ sessionKey: Z, editorText: j(z()), editorAttachments: j(A(ZH)) }),
      (QH = X({
        leafEntryId: Z,
        headline: z(),
        messageCount: F({ minimum: 0 }),
        updatedAt: j(Z),
        active: P(),
      })),
      X({ sessionKey: Z, agentId: j(Z) }),
      X({ branches: A(QH) }),
      X({ sessionKey: Z, agentId: j(Z), leafEntryId: Z }),
      X({}),
      X({ ok: I(!0), key: Z, checkpoints: A(NH) }),
      X({
        ok: I(!0),
        sourceKey: Z,
        key: Z,
        sessionId: Z,
        checkpoint: NH,
        entry: M({ sessionId: Z, updatedAt: F({ minimum: 0 }) }, { additionalProperties: !0 }),
      }),
      X({
        ok: I(!0),
        key: Z,
        sessionId: Z,
        checkpoint: NH,
        entry: M({ sessionId: Z, updatedAt: F({ minimum: 0 }) }, { additionalProperties: !0 }),
      }),
      X({
        key: j(Z),
        agentId: j(Z),
        agentScope: j(I(`all`)),
        startDate: j(z({ pattern: `^\\d{4}-\\d{2}-\\d{2}$` })),
        endDate: j(z({ pattern: `^\\d{4}-\\d{2}-\\d{2}$` })),
        mode: j(B([I(`utc`), I(`gateway`), I(`specific`)])),
        range: j(B([I(`7d`), I(`30d`), I(`90d`), I(`1y`), I(`all`)])),
        groupBy: j(B([I(`instance`), I(`family`)])),
        includeHistorical: j(
          P({ deprecated: !0, description: `Deprecated alias for groupBy: family.` }),
        ),
        utcOffset: j(
          z({
            pattern: `^UTC[+-]\\d{1,2}(?::[0-5]\\d)?$`,
            deprecated: !0,
            description: `Deprecated compatibility fallback; use timeZone.`,
          }),
        ),
        timeZone: j(Z),
        limit: j(F({ minimum: 1 })),
        includeContextWeight: j(P()),
      }));
  }))();
}
function eU(e, t) {
  let n = t || iU;
  return tU(
    e,
    typeof n.includeImageAlt != `boolean` || n.includeImageAlt,
    typeof n.includeHtml != `boolean` || n.includeHtml,
  );
}
function tU(e, t, n) {
  if (rU(e)) {
    if (`value` in e) return e.type === `html` && !n ? `` : e.value;
    if (t && `alt` in e && e.alt) return e.alt;
    if (`children` in e) return nU(e.children, t, n);
  }
  return Array.isArray(e) ? nU(e, t, n) : ``;
}
function nU(e, t, n) {
  let r = [],
    i = -1;
  for (; ++i < e.length;) r[i] = tU(e[i], t, n);
  return r.join(``);
}
function rU(e) {
  return !!(e && typeof e == `object`);
}
var iU;
function aU() {
  return (aU = e(() => {
    iU = {};
  }))();
}
function oU(e) {
  let t = `&` + e + `;`;
  sU.innerHTML = t;
  let n = sU.textContent;
  return n.charCodeAt(n.length - 1) === 59 && e !== `semi` ? !1 : n !== t && n;
}
var sU;
function cU() {
  return (cU = e(() => {
    sU = document.createElement(`i`);
  }))();
}
function lU(e, t, n, r) {
  let i = e.length,
    a = 0,
    o;
  if (((t = t < 0 ? (-t > i ? 0 : i + t) : t > i ? i : t), (n = n > 0 ? n : 0), r.length < 1e4))
    ((o = Array.from(r)), o.unshift(t, n), e.splice(...o));
  else
    for (n && e.splice(t, n); a < r.length;)
      ((o = r.slice(a, a + 1e4)), o.unshift(t, 0), e.splice(...o), (a += 1e4), (t += 1e4));
}
function uU(e, t) {
  return e.length > 0 ? (lU(e, e.length, 0, t), e) : t;
}
function dU(e) {
  let t = {},
    n = -1;
  for (; ++n < e.length;) fU(t, e[n]);
  return t;
}
function fU(e, t) {
  let n;
  for (n in t) {
    let r = (mU.call(e, n) ? e[n] : void 0) || (e[n] = {}),
      i = t[n],
      a;
    if (i)
      for (a in i) {
        mU.call(r, a) || (r[a] = []);
        let e = i[a];
        pU(r[a], Array.isArray(e) ? e : e ? [e] : []);
      }
  }
}
function pU(e, t) {
  let n = -1,
    r = [];
  for (; ++n < t.length;) (t[n].add === `after` ? e : r).push(t[n]);
  lU(e, 0, 0, r);
}
var mU;
function hU() {
  return (hU = e(() => {
    mU = {}.hasOwnProperty;
  }))();
}
function gU(e, t) {
  let n = Number.parseInt(e, t);
  return n < 9 ||
    n === 11 ||
    (n > 13 && n < 32) ||
    (n > 126 && n < 160) ||
    (n > 55295 && n < 57344) ||
    (n > 64975 && n < 65008) ||
    (n & 65535) == 65535 ||
    (n & 65535) == 65534 ||
    n > 1114111
    ? `�`
    : String.fromCodePoint(n);
}
function _U(e) {
  return e
    .replace(/[\t\n\r ]+/g, ` `)
    .replace(/^ | $/g, ``)
    .toLowerCase()
    .toUpperCase();
}
function vU(e) {
  return e !== null && (e < 32 || e === 127);
}
function Q(e) {
  return e !== null && e < -2;
}
function yU(e) {
  return e !== null && (e < 0 || e === 32);
}
function $(e) {
  return e === -2 || e === -1 || e === 32;
}
function bU(e) {
  return t;
  function t(t) {
    return t !== null && t > -1 && e.test(String.fromCharCode(t));
  }
}
var xU, SU, CU, wU, TU, EU, DU, OU;
function kU() {
  return (kU = e(() => {
    ((xU = bU(/[A-Za-z]/)),
      (SU = bU(/[\dA-Za-z]/)),
      (CU = bU(/[#-'*+\--9=?A-Z^-~]/)),
      (wU = bU(/\d/)),
      (TU = bU(/[\dA-Fa-f]/)),
      (EU = bU(/[!-/:-@[-`{-~]/)),
      (DU = bU(/\p{P}|\p{S}/u)),
      (OU = bU(/\s/)));
  }))();
}
function AU(e, t, n, r) {
  let i = r ? r - 1 : 1 / 0,
    a = 0;
  return o;
  function o(r) {
    return $(r) ? (e.enter(n), s(r)) : t(r);
  }
  function s(r) {
    return $(r) && a++ < i ? (e.consume(r), s) : (e.exit(n), t(r));
  }
}
function jU() {
  return (jU = e(() => {
    kU();
  }))();
}
function MU(e) {
  let t = e.attempt(this.parser.constructs.contentInitial, r, i),
    n;
  return t;
  function r(n) {
    if (n === null) {
      e.consume(n);
      return;
    }
    return (e.enter(`lineEnding`), e.consume(n), e.exit(`lineEnding`), AU(e, t, `linePrefix`));
  }
  function i(t) {
    return (e.enter(`paragraph`), a(t));
  }
  function a(t) {
    let r = e.enter(`chunkText`, { contentType: `text`, previous: n });
    return (n && (n.next = r), (n = r), o(t));
  }
  function o(t) {
    if (t === null) {
      (e.exit(`chunkText`), e.exit(`paragraph`), e.consume(t));
      return;
    }
    return Q(t) ? (e.consume(t), e.exit(`chunkText`), a) : (e.consume(t), o);
  }
}
var NU;
function PU() {
  return (PU = e(() => {
    (jU(), kU(), (NU = { tokenize: MU }));
  }))();
}
function FU(e) {
  let t = this,
    n = [],
    r = 0,
    i,
    a,
    o;
  return s;
  function s(i) {
    if (r < n.length) {
      let a = n[r];
      return ((t.containerState = a[1]), e.attempt(a[0].continuation, c, l)(i));
    }
    return l(i);
  }
  function c(e) {
    if ((r++, t.containerState._closeFlow)) {
      ((t.containerState._closeFlow = void 0), i && ne());
      let n = t.events.length,
        a = n,
        o;
      for (; a--;)
        if (t.events[a][0] === `exit` && t.events[a][1].type === `chunkFlow`) {
          o = t.events[a][1].end;
          break;
        }
      te(r);
      let s = n;
      for (; s < t.events.length;) ((t.events[s][1].end = { ...o }), s++);
      return (lU(t.events, a + 1, 0, t.events.slice(n)), (t.events.length = s), l(e));
    }
    return s(e);
  }
  function l(a) {
    if (r === n.length) {
      if (!i) return f(a);
      if (i.currentConstruct && i.currentConstruct.concrete) return m(a);
      t.interrupt = !!(i.currentConstruct && !i._gfmTableDynamicInterruptHack);
    }
    return ((t.containerState = {}), e.check(RU, u, d)(a));
  }
  function u(e) {
    return (i && ne(), te(r), f(e));
  }
  function d(e) {
    return ((t.parser.lazy[t.now().line] = r !== n.length), (o = t.now().offset), m(e));
  }
  function f(n) {
    return ((t.containerState = {}), e.attempt(RU, p, m)(n));
  }
  function p(e) {
    return (r++, n.push([t.currentConstruct, t.containerState]), f(e));
  }
  function m(n) {
    if (n === null) {
      (i && ne(), te(0), e.consume(n));
      return;
    }
    return (
      (i ||= t.parser.flow(t.now())),
      e.enter(`chunkFlow`, { _tokenizer: i, contentType: `flow`, previous: a }),
      h(n)
    );
  }
  function h(n) {
    if (n === null) {
      (ee(e.exit(`chunkFlow`), !0), te(0), e.consume(n));
      return;
    }
    return Q(n)
      ? (e.consume(n), ee(e.exit(`chunkFlow`)), (r = 0), (t.interrupt = void 0), s)
      : (e.consume(n), h);
  }
  function ee(e, n) {
    let s = t.sliceStream(e);
    if (
      (n && s.push(null),
      (e.previous = a),
      a && (a.next = e),
      (a = e),
      i.defineSkip(e.start),
      i.write(s),
      t.parser.lazy[e.start.line])
    ) {
      let e = i.events.length;
      for (; e--;)
        if (
          i.events[e][1].start.offset < o &&
          (!i.events[e][1].end || i.events[e][1].end.offset > o)
        )
          return;
      let n = t.events.length,
        a = n,
        s,
        c;
      for (; a--;)
        if (t.events[a][0] === `exit` && t.events[a][1].type === `chunkFlow`) {
          if (s) {
            c = t.events[a][1].end;
            break;
          }
          s = !0;
        }
      for (te(r), e = n; e < t.events.length;) ((t.events[e][1].end = { ...c }), e++);
      (lU(t.events, a + 1, 0, t.events.slice(n)), (t.events.length = e));
    }
  }
  function te(r) {
    let i = n.length;
    for (; i-- > r;) {
      let r = n[i];
      ((t.containerState = r[1]), r[0].exit.call(t, e));
    }
    n.length = r;
  }
  function ne() {
    (i.write([null]), (a = void 0), (i = void 0), (t.containerState._closeFlow = void 0));
  }
}
function IU(e, t, n) {
  return AU(
    e,
    e.attempt(this.parser.constructs.document, t, n),
    `linePrefix`,
    this.parser.constructs.disable.null.includes(`codeIndented`) ? void 0 : 4,
  );
}
var LU, RU;
function zU() {
  return (zU = e(() => {
    (jU(), kU(), (LU = { tokenize: FU }), (RU = { tokenize: IU }));
  }))();
}
function BU(e) {
  if (e === null || yU(e) || OU(e)) return 1;
  if (DU(e)) return 2;
}
function VU() {
  return (VU = e(() => {
    kU();
  }))();
}
function HU(e, t, n) {
  let r = [],
    i = -1;
  for (; ++i < e.length;) {
    let a = e[i].resolveAll;
    a && !r.includes(a) && ((t = a(t, n)), r.push(a));
  }
  return t;
}
function UU(e, t) {
  let n = -1,
    r,
    i,
    a,
    o,
    s,
    c,
    l,
    u;
  for (; ++n < e.length;)
    if (e[n][0] === `enter` && e[n][1].type === `attentionSequence` && e[n][1]._close) {
      for (r = n; r--;)
        if (
          e[r][0] === `exit` &&
          e[r][1].type === `attentionSequence` &&
          e[r][1]._open &&
          t.sliceSerialize(e[r][1]).charCodeAt(0) === t.sliceSerialize(e[n][1]).charCodeAt(0)
        ) {
          if (
            (e[r][1]._close || e[n][1]._open) &&
            (e[n][1].end.offset - e[n][1].start.offset) % 3 &&
            !(
              (e[r][1].end.offset -
                e[r][1].start.offset +
                e[n][1].end.offset -
                e[n][1].start.offset) %
              3
            )
          )
            continue;
          c =
            e[r][1].end.offset - e[r][1].start.offset > 1 &&
            e[n][1].end.offset - e[n][1].start.offset > 1
              ? 2
              : 1;
          let d = { ...e[r][1].end },
            f = { ...e[n][1].start };
          (GU(d, -c),
            GU(f, c),
            (o = {
              type: c > 1 ? `strongSequence` : `emphasisSequence`,
              start: d,
              end: { ...e[r][1].end },
            }),
            (s = {
              type: c > 1 ? `strongSequence` : `emphasisSequence`,
              start: { ...e[n][1].start },
              end: f,
            }),
            (a = {
              type: c > 1 ? `strongText` : `emphasisText`,
              start: { ...e[r][1].end },
              end: { ...e[n][1].start },
            }),
            (i = { type: c > 1 ? `strong` : `emphasis`, start: { ...o.start }, end: { ...s.end } }),
            (e[r][1].end = { ...o.start }),
            (e[n][1].start = { ...s.end }),
            (l = []),
            e[r][1].end.offset - e[r][1].start.offset &&
              (l = uU(l, [
                [`enter`, e[r][1], t],
                [`exit`, e[r][1], t],
              ])),
            (l = uU(l, [
              [`enter`, i, t],
              [`enter`, o, t],
              [`exit`, o, t],
              [`enter`, a, t],
            ])),
            (l = uU(l, HU(t.parser.constructs.insideSpan.null, e.slice(r + 1, n), t))),
            (l = uU(l, [
              [`exit`, a, t],
              [`enter`, s, t],
              [`exit`, s, t],
              [`exit`, i, t],
            ])),
            e[n][1].end.offset - e[n][1].start.offset
              ? ((u = 2),
                (l = uU(l, [
                  [`enter`, e[n][1], t],
                  [`exit`, e[n][1], t],
                ])))
              : (u = 0),
            lU(e, r - 1, n - r + 3, l),
            (n = r + l.length - u - 2));
          break;
        }
    }
  for (n = -1; ++n < e.length;) e[n][1].type === `attentionSequence` && (e[n][1].type = `data`);
  return e;
}
function WU(e, t) {
  let n = this.parser.constructs.attentionMarkers.null,
    r = this.previous,
    i = BU(r),
    a;
  return o;
  function o(t) {
    return ((a = t), e.enter(`attentionSequence`), s(t));
  }
  function s(o) {
    if (o === a) return (e.consume(o), s);
    let c = e.exit(`attentionSequence`),
      l = BU(o),
      u = !l || (l === 2 && i) || n.includes(o),
      d = !i || (i === 2 && l) || n.includes(r);
    return (
      (c._open = !!(a === 42 ? u : u && (i || !d))),
      (c._close = !!(a === 42 ? d : d && (l || !u))),
      t(o)
    );
  }
}
function GU(e, t) {
  ((e.column += t), (e.offset += t), (e._bufferIndex += t));
}
var KU;
function qU() {
  return (qU = e(() => {
    (VU(), (KU = { name: `attention`, resolveAll: UU, tokenize: WU }));
  }))();
}
function JU(e, t, n) {
  let r = 0;
  return i;
  function i(t) {
    return (
      e.enter(`autolink`),
      e.enter(`autolinkMarker`),
      e.consume(t),
      e.exit(`autolinkMarker`),
      e.enter(`autolinkProtocol`),
      a
    );
  }
  function a(t) {
    return xU(t) ? (e.consume(t), o) : t === 64 ? n(t) : l(t);
  }
  function o(e) {
    return e === 43 || e === 45 || e === 46 || SU(e) ? ((r = 1), s(e)) : l(e);
  }
  function s(t) {
    return t === 58
      ? (e.consume(t), (r = 0), c)
      : (t === 43 || t === 45 || t === 46 || SU(t)) && r++ < 32
        ? (e.consume(t), s)
        : ((r = 0), l(t));
  }
  function c(r) {
    return r === 62
      ? (e.exit(`autolinkProtocol`),
        e.enter(`autolinkMarker`),
        e.consume(r),
        e.exit(`autolinkMarker`),
        e.exit(`autolink`),
        t)
      : r === null || r === 32 || r === 60 || vU(r)
        ? n(r)
        : (e.consume(r), c);
  }
  function l(t) {
    return t === 64 ? (e.consume(t), u) : CU(t) ? (e.consume(t), l) : n(t);
  }
  function u(e) {
    return SU(e) ? d(e) : n(e);
  }
  function d(n) {
    return n === 46
      ? (e.consume(n), (r = 0), u)
      : n === 62
        ? ((e.exit(`autolinkProtocol`).type = `autolinkEmail`),
          e.enter(`autolinkMarker`),
          e.consume(n),
          e.exit(`autolinkMarker`),
          e.exit(`autolink`),
          t)
        : f(n);
  }
  function f(t) {
    if ((t === 45 || SU(t)) && r++ < 63) {
      let n = t === 45 ? f : d;
      return (e.consume(t), n);
    }
    return n(t);
  }
}
var YU;
function XU() {
  return (XU = e(() => {
    (kU(), (YU = { name: `autolink`, tokenize: JU }));
  }))();
}
function ZU(e, t, n) {
  return r;
  function r(t) {
    return $(t) ? AU(e, i, `linePrefix`)(t) : i(t);
  }
  function i(e) {
    return e === null || Q(e) ? t(e) : n(e);
  }
}
var QU;
function $U() {
  return ($U = e(() => {
    (jU(), kU(), (QU = { partial: !0, tokenize: ZU }));
  }))();
}
function eW(e, t, n) {
  let r = this;
  return i;
  function i(t) {
    if (t === 62) {
      let n = r.containerState;
      return (
        (n.open ||= (e.enter(`blockQuote`, { _container: !0 }), !0)),
        e.enter(`blockQuotePrefix`),
        e.enter(`blockQuoteMarker`),
        e.consume(t),
        e.exit(`blockQuoteMarker`),
        a
      );
    }
    return n(t);
  }
  function a(n) {
    return $(n)
      ? (e.enter(`blockQuotePrefixWhitespace`),
        e.consume(n),
        e.exit(`blockQuotePrefixWhitespace`),
        e.exit(`blockQuotePrefix`),
        t)
      : (e.exit(`blockQuotePrefix`), t(n));
  }
}
function tW(e, t, n) {
  let r = this;
  return i;
  function i(t) {
    return $(t)
      ? AU(
          e,
          a,
          `linePrefix`,
          r.parser.constructs.disable.null.includes(`codeIndented`) ? void 0 : 4,
        )(t)
      : a(t);
  }
  function a(r) {
    return e.attempt(rW, t, n)(r);
  }
}
function nW(e) {
  e.exit(`blockQuote`);
}
var rW;
function iW() {
  return (iW = e(() => {
    (jU(),
      kU(),
      (rW = { continuation: { tokenize: tW }, exit: nW, name: `blockQuote`, tokenize: eW }));
  }))();
}
function aW(e, t, n) {
  return r;
  function r(t) {
    return (
      e.enter(`characterEscape`), e.enter(`escapeMarker`), e.consume(t), e.exit(`escapeMarker`), i
    );
  }
  function i(r) {
    return EU(r)
      ? (e.enter(`characterEscapeValue`),
        e.consume(r),
        e.exit(`characterEscapeValue`),
        e.exit(`characterEscape`),
        t)
      : n(r);
  }
}
var oW;
function sW() {
  return (sW = e(() => {
    (kU(), (oW = { name: `characterEscape`, tokenize: aW }));
  }))();
}
function cW(e, t, n) {
  let r = this,
    i = 0,
    a,
    o;
  return s;
  function s(t) {
    return (
      e.enter(`characterReference`),
      e.enter(`characterReferenceMarker`),
      e.consume(t),
      e.exit(`characterReferenceMarker`),
      c
    );
  }
  function c(t) {
    return t === 35
      ? (e.enter(`characterReferenceMarkerNumeric`),
        e.consume(t),
        e.exit(`characterReferenceMarkerNumeric`),
        l)
      : (e.enter(`characterReferenceValue`), (a = 31), (o = SU), u(t));
  }
  function l(t) {
    return t === 88 || t === 120
      ? (e.enter(`characterReferenceMarkerHexadecimal`),
        e.consume(t),
        e.exit(`characterReferenceMarkerHexadecimal`),
        e.enter(`characterReferenceValue`),
        (a = 6),
        (o = TU),
        u)
      : (e.enter(`characterReferenceValue`), (a = 7), (o = wU), u(t));
  }
  function u(s) {
    if (s === 59 && i) {
      let i = e.exit(`characterReferenceValue`);
      return o === SU && !oU(r.sliceSerialize(i))
        ? n(s)
        : (e.enter(`characterReferenceMarker`),
          e.consume(s),
          e.exit(`characterReferenceMarker`),
          e.exit(`characterReference`),
          t);
    }
    return o(s) && i++ < a ? (e.consume(s), u) : n(s);
  }
}
var lW;
function uW() {
  return (uW = e(() => {
    (cU(), kU(), (lW = { name: `characterReference`, tokenize: cW }));
  }))();
}
function dW(e, t, n) {
  let r = this,
    i = { partial: !0, tokenize: ae },
    a = 0,
    o = 0,
    s;
  return c;
  function c(e) {
    return l(e);
  }
  function l(t) {
    let n = r.events[r.events.length - 1];
    return (
      (a = n && n[1].type === `linePrefix` ? n[2].sliceSerialize(n[1], !0).length : 0),
      (s = t),
      e.enter(`codeFenced`),
      e.enter(`codeFencedFence`),
      e.enter(`codeFencedFenceSequence`),
      u(t)
    );
  }
  function u(t) {
    return t === s
      ? (o++, e.consume(t), u)
      : o < 3
        ? n(t)
        : (e.exit(`codeFencedFenceSequence`), $(t) ? AU(e, d, `whitespace`)(t) : d(t));
  }
  function d(n) {
    return n === null || Q(n)
      ? (e.exit(`codeFencedFence`), r.interrupt ? t(n) : e.check(pW, h, ie)(n))
      : (e.enter(`codeFencedFenceInfo`), e.enter(`chunkString`, { contentType: `string` }), f(n));
  }
  function f(t) {
    return t === null || Q(t)
      ? (e.exit(`chunkString`), e.exit(`codeFencedFenceInfo`), d(t))
      : $(t)
        ? (e.exit(`chunkString`), e.exit(`codeFencedFenceInfo`), AU(e, p, `whitespace`)(t))
        : t === 96 && t === s
          ? n(t)
          : (e.consume(t), f);
  }
  function p(t) {
    return t === null || Q(t)
      ? d(t)
      : (e.enter(`codeFencedFenceMeta`), e.enter(`chunkString`, { contentType: `string` }), m(t));
  }
  function m(t) {
    return t === null || Q(t)
      ? (e.exit(`chunkString`), e.exit(`codeFencedFenceMeta`), d(t))
      : t === 96 && t === s
        ? n(t)
        : (e.consume(t), m);
  }
  function h(t) {
    return e.attempt(i, ie, ee)(t);
  }
  function ee(t) {
    return (e.enter(`lineEnding`), e.consume(t), e.exit(`lineEnding`), te);
  }
  function te(t) {
    return a > 0 && $(t) ? AU(e, ne, `linePrefix`, a + 1)(t) : ne(t);
  }
  function ne(t) {
    return t === null || Q(t) ? e.check(pW, h, ie)(t) : (e.enter(`codeFlowValue`), re(t));
  }
  function re(t) {
    return t === null || Q(t) ? (e.exit(`codeFlowValue`), ne(t)) : (e.consume(t), re);
  }
  function ie(n) {
    return (e.exit(`codeFenced`), t(n));
  }
  function ae(e, t, n) {
    let i = 0;
    return a;
    function a(t) {
      return (e.enter(`lineEnding`), e.consume(t), e.exit(`lineEnding`), c);
    }
    function c(t) {
      return (
        e.enter(`codeFencedFence`),
        $(t)
          ? AU(
              e,
              l,
              `linePrefix`,
              r.parser.constructs.disable.null.includes(`codeIndented`) ? void 0 : 4,
            )(t)
          : l(t)
      );
    }
    function l(t) {
      return t === s ? (e.enter(`codeFencedFenceSequence`), u(t)) : n(t);
    }
    function u(t) {
      return t === s
        ? (i++, e.consume(t), u)
        : i >= o
          ? (e.exit(`codeFencedFenceSequence`), $(t) ? AU(e, d, `whitespace`)(t) : d(t))
          : n(t);
    }
    function d(r) {
      return r === null || Q(r) ? (e.exit(`codeFencedFence`), t(r)) : n(r);
    }
  }
}
function fW(e, t, n) {
  let r = this;
  return i;
  function i(t) {
    return t === null ? n(t) : (e.enter(`lineEnding`), e.consume(t), e.exit(`lineEnding`), a);
  }
  function a(e) {
    return r.parser.lazy[r.now().line] ? n(e) : t(e);
  }
}
var pW, mW;
function hW() {
  return (hW = e(() => {
    (jU(),
      kU(),
      (pW = { partial: !0, tokenize: fW }),
      (mW = { concrete: !0, name: `codeFenced`, tokenize: dW }));
  }))();
}
function gW(e, t, n) {
  let r = this;
  return i;
  function i(t) {
    return (e.enter(`codeIndented`), AU(e, a, `linePrefix`, 5)(t));
  }
  function a(e) {
    let t = r.events[r.events.length - 1];
    return t && t[1].type === `linePrefix` && t[2].sliceSerialize(t[1], !0).length >= 4
      ? o(e)
      : n(e);
  }
  function o(t) {
    return t === null ? c(t) : Q(t) ? e.attempt(yW, o, c)(t) : (e.enter(`codeFlowValue`), s(t));
  }
  function s(t) {
    return t === null || Q(t) ? (e.exit(`codeFlowValue`), o(t)) : (e.consume(t), s);
  }
  function c(n) {
    return (e.exit(`codeIndented`), t(n));
  }
}
function _W(e, t, n) {
  let r = this;
  return i;
  function i(t) {
    return r.parser.lazy[r.now().line]
      ? n(t)
      : Q(t)
        ? (e.enter(`lineEnding`), e.consume(t), e.exit(`lineEnding`), i)
        : AU(e, a, `linePrefix`, 5)(t);
  }
  function a(e) {
    let a = r.events[r.events.length - 1];
    return a && a[1].type === `linePrefix` && a[2].sliceSerialize(a[1], !0).length >= 4
      ? t(e)
      : Q(e)
        ? i(e)
        : n(e);
  }
}
var vW, yW;
function bW() {
  return (bW = e(() => {
    (jU(),
      kU(),
      (vW = { name: `codeIndented`, tokenize: gW }),
      (yW = { partial: !0, tokenize: _W }));
  }))();
}
function xW(e) {
  let t = e.length - 4,
    n = 3,
    r,
    i;
  if (
    (e[n][1].type === `lineEnding` || e[n][1].type === `space`) &&
    (e[t][1].type === `lineEnding` || e[t][1].type === `space`)
  ) {
    for (r = n; ++r < t;)
      if (e[r][1].type === `codeTextData`) {
        ((e[n][1].type = `codeTextPadding`),
          (e[t][1].type = `codeTextPadding`),
          (n += 2),
          (t -= 2));
        break;
      }
  }
  for (r = n - 1, t++; ++r <= t;)
    i === void 0
      ? r !== t && e[r][1].type !== `lineEnding` && (i = r)
      : (r === t || e[r][1].type === `lineEnding`) &&
        ((e[i][1].type = `codeTextData`),
        r !== i + 2 &&
          ((e[i][1].end = e[r - 1][1].end),
          e.splice(i + 2, r - i - 2),
          (t -= r - i - 2),
          (r = i + 2)),
        (i = void 0));
  return e;
}
function SW(e) {
  return e !== 96 || this.events[this.events.length - 1][1].type === `characterEscape`;
}
function CW(e, t, n) {
  let r = 0,
    i,
    a;
  return o;
  function o(t) {
    return (e.enter(`codeText`), e.enter(`codeTextSequence`), s(t));
  }
  function s(t) {
    return t === 96 ? (e.consume(t), r++, s) : (e.exit(`codeTextSequence`), c(t));
  }
  function c(t) {
    return t === null
      ? n(t)
      : t === 32
        ? (e.enter(`space`), e.consume(t), e.exit(`space`), c)
        : t === 96
          ? ((a = e.enter(`codeTextSequence`)), (i = 0), u(t))
          : Q(t)
            ? (e.enter(`lineEnding`), e.consume(t), e.exit(`lineEnding`), c)
            : (e.enter(`codeTextData`), l(t));
  }
  function l(t) {
    return t === null || t === 32 || t === 96 || Q(t)
      ? (e.exit(`codeTextData`), c(t))
      : (e.consume(t), l);
  }
  function u(n) {
    return n === 96
      ? (e.consume(n), i++, u)
      : i === r
        ? (e.exit(`codeTextSequence`), e.exit(`codeText`), t(n))
        : ((a.type = `codeTextData`), l(n));
  }
}
var wW;
function TW() {
  return (TW = e(() => {
    (kU(), (wW = { name: `codeText`, previous: SW, resolve: xW, tokenize: CW }));
  }))();
}
function EW(e, t) {
  let n = 0;
  if (t.length < 1e4) e.push(...t);
  else for (; n < t.length;) (e.push(...t.slice(n, n + 1e4)), (n += 1e4));
}
var DW;
function OW() {
  return (OW = e(() => {
    DW = class {
      constructor(e) {
        ((this.left = e ? [...e] : []), (this.right = []));
      }
      get(e) {
        if (e < 0 || e >= this.left.length + this.right.length)
          throw RangeError(
            "Cannot access index `" +
              e +
              "` in a splice buffer of size `" +
              (this.left.length + this.right.length) +
              "`",
          );
        return e < this.left.length
          ? this.left[e]
          : this.right[this.right.length - e + this.left.length - 1];
      }
      get length() {
        return this.left.length + this.right.length;
      }
      shift() {
        return (this.setCursor(0), this.right.pop());
      }
      slice(e, t) {
        let n = t ?? 1 / 0;
        return n < this.left.length
          ? this.left.slice(e, n)
          : e > this.left.length
            ? this.right
                .slice(
                  this.right.length - n + this.left.length,
                  this.right.length - e + this.left.length,
                )
                .reverse()
            : this.left
                .slice(e)
                .concat(this.right.slice(this.right.length - n + this.left.length).reverse());
      }
      splice(e, t, n) {
        let r = t || 0;
        this.setCursor(Math.trunc(e));
        let i = this.right.splice(this.right.length - r, 1 / 0);
        return (n && EW(this.left, n), i.reverse());
      }
      pop() {
        return (this.setCursor(1 / 0), this.left.pop());
      }
      push(e) {
        (this.setCursor(1 / 0), this.left.push(e));
      }
      pushMany(e) {
        (this.setCursor(1 / 0), EW(this.left, e));
      }
      unshift(e) {
        (this.setCursor(0), this.right.push(e));
      }
      unshiftMany(e) {
        (this.setCursor(0), EW(this.right, e.reverse()));
      }
      setCursor(e) {
        if (
          !(
            e === this.left.length ||
            (e > this.left.length && this.right.length === 0) ||
            (e < 0 && this.left.length === 0)
          )
        ) {
          if (e < this.left.length) {
            let t = this.left.splice(e, 1 / 0);
            EW(this.right, t.reverse());
          } else {
            let t = this.right.splice(this.left.length + this.right.length - e, 1 / 0);
            EW(this.left, t.reverse());
          }
        }
      }
    };
  }))();
}
function kW(e) {
  let t = {},
    n = -1,
    r,
    i,
    a,
    o,
    s,
    c,
    l,
    u = new DW(e);
  for (; ++n < u.length;) {
    for (; n in t;) n = t[n];
    if (
      ((r = u.get(n)),
      n &&
        r[1].type === `chunkFlow` &&
        u.get(n - 1)[1].type === `listItemPrefix` &&
        ((c = r[1]._tokenizer.events),
        (a = 0),
        a < c.length && c[a][1].type === `lineEndingBlank` && (a += 2),
        a < c.length && c[a][1].type === `content`))
    )
      for (; ++a < c.length && c[a][1].type !== `content`;)
        c[a][1].type === `chunkText` && ((c[a][1]._isInFirstContentOfListItem = !0), a++);
    if (r[0] === `enter`) r[1].contentType && (Object.assign(t, AW(u, n)), (n = t[n]), (l = !0));
    else if (r[1]._container) {
      for (a = n, i = void 0; a--;)
        if (((o = u.get(a)), o[1].type === `lineEnding` || o[1].type === `lineEndingBlank`))
          o[0] === `enter` &&
            (i && (u.get(i)[1].type = `lineEndingBlank`), (o[1].type = `lineEnding`), (i = a));
        else if (o[1].type !== `linePrefix` && o[1].type !== `listItemIndent`) break;
      i &&
        ((r[1].end = { ...u.get(i)[1].start }),
        (s = u.slice(i, n)),
        s.unshift(r),
        u.splice(i, n - i + 1, s));
    }
  }
  return (lU(e, 0, 1 / 0, u.slice(0)), !l);
}
function AW(e, t) {
  let n = e.get(t)[1],
    r = e.get(t)[2],
    i = t - 1,
    a = [],
    o = n._tokenizer;
  o ||
    ((o = r.parser[n.contentType](n.start)),
    n._contentTypeTextTrailing && (o._contentTypeTextTrailing = !0));
  let s = o.events,
    c = [],
    l = {},
    u,
    d,
    f = -1,
    p = n,
    m = 0,
    h = 0,
    ee = [h];
  for (; p;) {
    for (; e.get(++i)[1] !== p;);
    (a.push(i),
      p._tokenizer ||
        ((u = r.sliceStream(p)),
        p.next || u.push(null),
        d && o.defineSkip(p.start),
        p._isInFirstContentOfListItem && (o._gfmTasklistFirstContentOfListItem = !0),
        o.write(u),
        p._isInFirstContentOfListItem && (o._gfmTasklistFirstContentOfListItem = void 0)),
      (d = p),
      (p = p.next));
  }
  for (p = n; ++f < s.length;)
    s[f][0] === `exit` &&
      s[f - 1][0] === `enter` &&
      s[f][1].type === s[f - 1][1].type &&
      s[f][1].start.line !== s[f][1].end.line &&
      ((h = f + 1), ee.push(h), (p._tokenizer = void 0), (p.previous = void 0), (p = p.next));
  for (
    o.events = [], p ? ((p._tokenizer = void 0), (p.previous = void 0)) : ee.pop(), f = ee.length;
    f--;
  ) {
    let t = s.slice(ee[f], ee[f + 1]),
      n = a.pop();
    (c.push([n, n + t.length - 1]), e.splice(n, 2, t));
  }
  for (c.reverse(), f = -1; ++f < c.length;)
    ((l[m + c[f][0]] = m + c[f][1]), (m += c[f][1] - c[f][0] - 1));
  return l;
}
function jW() {
  return (jW = e(() => {
    OW();
  }))();
}
function MW(e) {
  return (kW(e), e);
}
function NW(e, t) {
  let n;
  return r;
  function r(t) {
    return (e.enter(`content`), (n = e.enter(`chunkContent`, { contentType: `content` })), i(t));
  }
  function i(t) {
    return t === null ? a(t) : Q(t) ? e.check(IW, o, a)(t) : (e.consume(t), i);
  }
  function a(n) {
    return (e.exit(`chunkContent`), e.exit(`content`), t(n));
  }
  function o(t) {
    return (
      e.consume(t),
      e.exit(`chunkContent`),
      (n.next = e.enter(`chunkContent`, { contentType: `content`, previous: n })),
      (n = n.next),
      i
    );
  }
}
function PW(e, t, n) {
  let r = this;
  return i;
  function i(t) {
    return (
      e.exit(`chunkContent`),
      e.enter(`lineEnding`),
      e.consume(t),
      e.exit(`lineEnding`),
      AU(e, a, `linePrefix`)
    );
  }
  function a(i) {
    if (i === null || Q(i)) return n(i);
    let a = r.events[r.events.length - 1];
    return !r.parser.constructs.disable.null.includes(`codeIndented`) &&
      a &&
      a[1].type === `linePrefix` &&
      a[2].sliceSerialize(a[1], !0).length >= 4
      ? t(i)
      : e.interrupt(r.parser.constructs.flow, n, t)(i);
  }
}
var FW, IW;
function LW() {
  return (LW = e(() => {
    (jU(), kU(), jW(), (FW = { resolve: MW, tokenize: NW }), (IW = { partial: !0, tokenize: PW }));
  }))();
}
function RW(e, t, n, r, i, a, o, s, c) {
  let l = c || 1 / 0,
    u = 0;
  return d;
  function d(t) {
    return t === 60
      ? (e.enter(r), e.enter(i), e.enter(a), e.consume(t), e.exit(a), f)
      : t === null || t === 32 || t === 41 || vU(t)
        ? n(t)
        : (e.enter(r),
          e.enter(o),
          e.enter(s),
          e.enter(`chunkString`, { contentType: `string` }),
          h(t));
  }
  function f(n) {
    return n === 62
      ? (e.enter(a), e.consume(n), e.exit(a), e.exit(i), e.exit(r), t)
      : (e.enter(s), e.enter(`chunkString`, { contentType: `string` }), p(n));
  }
  function p(t) {
    return t === 62
      ? (e.exit(`chunkString`), e.exit(s), f(t))
      : t === null || t === 60 || Q(t)
        ? n(t)
        : (e.consume(t), t === 92 ? m : p);
  }
  function m(t) {
    return t === 60 || t === 62 || t === 92 ? (e.consume(t), p) : p(t);
  }
  function h(i) {
    return !u && (i === null || i === 41 || yU(i))
      ? (e.exit(`chunkString`), e.exit(s), e.exit(o), e.exit(r), t(i))
      : u < l && i === 40
        ? (e.consume(i), u++, h)
        : i === 41
          ? (e.consume(i), u--, h)
          : i === null || i === 32 || i === 40 || vU(i)
            ? n(i)
            : (e.consume(i), i === 92 ? ee : h);
  }
  function ee(t) {
    return t === 40 || t === 41 || t === 92 ? (e.consume(t), h) : h(t);
  }
}
function zW() {
  return (zW = e(() => {
    kU();
  }))();
}
function BW(e, t, n, r, i, a) {
  let o = this,
    s = 0,
    c;
  return l;
  function l(t) {
    return (e.enter(r), e.enter(i), e.consume(t), e.exit(i), e.enter(a), u);
  }
  function u(l) {
    return s > 999 ||
      l === null ||
      l === 91 ||
      (l === 93 && !c) ||
      (l === 94 && !s && `_hiddenFootnoteSupport` in o.parser.constructs)
      ? n(l)
      : l === 93
        ? (e.exit(a), e.enter(i), e.consume(l), e.exit(i), e.exit(r), t)
        : Q(l)
          ? (e.enter(`lineEnding`), e.consume(l), e.exit(`lineEnding`), u)
          : (e.enter(`chunkString`, { contentType: `string` }), d(l));
  }
  function d(t) {
    return t === null || t === 91 || t === 93 || Q(t) || s++ > 999
      ? (e.exit(`chunkString`), u(t))
      : (e.consume(t), (c ||= !$(t)), t === 92 ? f : d);
  }
  function f(t) {
    return t === 91 || t === 92 || t === 93 ? (e.consume(t), s++, d) : d(t);
  }
}
function VW() {
  return (VW = e(() => {
    kU();
  }))();
}
function HW(e, t, n, r, i, a) {
  let o;
  return s;
  function s(t) {
    return t === 34 || t === 39 || t === 40
      ? (e.enter(r), e.enter(i), e.consume(t), e.exit(i), (o = t === 40 ? 41 : t), c)
      : n(t);
  }
  function c(n) {
    return n === o ? (e.enter(i), e.consume(n), e.exit(i), e.exit(r), t) : (e.enter(a), l(n));
  }
  function l(t) {
    return t === o
      ? (e.exit(a), c(o))
      : t === null
        ? n(t)
        : Q(t)
          ? (e.enter(`lineEnding`), e.consume(t), e.exit(`lineEnding`), AU(e, l, `linePrefix`))
          : (e.enter(`chunkString`, { contentType: `string` }), u(t));
  }
  function u(t) {
    return t === o || t === null || Q(t)
      ? (e.exit(`chunkString`), l(t))
      : (e.consume(t), t === 92 ? d : u);
  }
  function d(t) {
    return t === o || t === 92 ? (e.consume(t), u) : u(t);
  }
}
function UW() {
  return (UW = e(() => {
    (jU(), kU());
  }))();
}
function WW(e, t) {
  let n;
  return r;
  function r(i) {
    return Q(i)
      ? (e.enter(`lineEnding`), e.consume(i), e.exit(`lineEnding`), (n = !0), r)
      : $(i)
        ? AU(e, r, n ? `linePrefix` : `lineSuffix`)(i)
        : t(i);
  }
}
function GW() {
  return (GW = e(() => {
    (jU(), kU());
  }))();
}
function KW(e, t, n) {
  let r = this,
    i;
  return a;
  function a(t) {
    return (e.enter(`definition`), o(t));
  }
  function o(t) {
    return BW.call(
      r,
      e,
      s,
      n,
      `definitionLabel`,
      `definitionLabelMarker`,
      `definitionLabelString`,
    )(t);
  }
  function s(t) {
    return (
      (i = _U(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1))),
      t === 58 ? (e.enter(`definitionMarker`), e.consume(t), e.exit(`definitionMarker`), c) : n(t)
    );
  }
  function c(t) {
    return yU(t) ? WW(e, l)(t) : l(t);
  }
  function l(t) {
    return RW(
      e,
      u,
      n,
      `definitionDestination`,
      `definitionDestinationLiteral`,
      `definitionDestinationLiteralMarker`,
      `definitionDestinationRaw`,
      `definitionDestinationString`,
    )(t);
  }
  function u(t) {
    return e.attempt(YW, d, d)(t);
  }
  function d(t) {
    return $(t) ? AU(e, f, `whitespace`)(t) : f(t);
  }
  function f(a) {
    return a === null || Q(a) ? (e.exit(`definition`), r.parser.defined.push(i), t(a)) : n(a);
  }
}
function qW(e, t, n) {
  return r;
  function r(t) {
    return yU(t) ? WW(e, i)(t) : n(t);
  }
  function i(t) {
    return HW(e, a, n, `definitionTitle`, `definitionTitleMarker`, `definitionTitleString`)(t);
  }
  function a(t) {
    return $(t) ? AU(e, o, `whitespace`)(t) : o(t);
  }
  function o(e) {
    return e === null || Q(e) ? t(e) : n(e);
  }
}
var JW, YW;
function XW() {
  return (XW = e(() => {
    (zW(),
      VW(),
      jU(),
      UW(),
      GW(),
      kU(),
      (JW = { name: `definition`, tokenize: KW }),
      (YW = { partial: !0, tokenize: qW }));
  }))();
}
function ZW(e, t, n) {
  return r;
  function r(t) {
    return (e.enter(`hardBreakEscape`), e.consume(t), i);
  }
  function i(r) {
    return Q(r) ? (e.exit(`hardBreakEscape`), t(r)) : n(r);
  }
}
var QW;
function $W() {
  return ($W = e(() => {
    (kU(), (QW = { name: `hardBreakEscape`, tokenize: ZW }));
  }))();
}
function eG(e, t) {
  let n = e.length - 2,
    r = 3,
    i,
    a;
  return (
    e[r][1].type === `whitespace` && (r += 2),
    n - 2 > r && e[n][1].type === `whitespace` && (n -= 2),
    e[n][1].type === `atxHeadingSequence` &&
      (r === n - 1 || (n - 4 > r && e[n - 2][1].type === `whitespace`)) &&
      (n -= r + 1 === n ? 2 : 4),
    n > r &&
      ((i = { type: `atxHeadingText`, start: e[r][1].start, end: e[n][1].end }),
      (a = { type: `chunkText`, start: e[r][1].start, end: e[n][1].end, contentType: `text` }),
      lU(e, r, n - r + 1, [
        [`enter`, i, t],
        [`enter`, a, t],
        [`exit`, a, t],
        [`exit`, i, t],
      ])),
    e
  );
}
function tG(e, t, n) {
  let r = 0;
  return i;
  function i(t) {
    return (e.enter(`atxHeading`), a(t));
  }
  function a(t) {
    return (e.enter(`atxHeadingSequence`), o(t));
  }
  function o(t) {
    return t === 35 && r++ < 6
      ? (e.consume(t), o)
      : t === null || yU(t)
        ? (e.exit(`atxHeadingSequence`), s(t))
        : n(t);
  }
  function s(n) {
    return n === 35
      ? (e.enter(`atxHeadingSequence`), c(n))
      : n === null || Q(n)
        ? (e.exit(`atxHeading`), t(n))
        : $(n)
          ? AU(e, s, `whitespace`)(n)
          : (e.enter(`atxHeadingText`), l(n));
  }
  function c(t) {
    return t === 35 ? (e.consume(t), c) : (e.exit(`atxHeadingSequence`), s(t));
  }
  function l(t) {
    return t === null || t === 35 || yU(t) ? (e.exit(`atxHeadingText`), s(t)) : (e.consume(t), l);
  }
}
var nG;
function rG() {
  return (rG = e(() => {
    (jU(), kU(), (nG = { name: `headingAtx`, resolve: eG, tokenize: tG }));
  }))();
}
var iG, aG;
function oG() {
  return (oG = e(() => {
    ((iG =
      `address.article.aside.base.basefont.blockquote.body.caption.center.col.colgroup.dd.details.dialog.dir.div.dl.dt.fieldset.figcaption.figure.footer.form.frame.frameset.h1.h2.h3.h4.h5.h6.head.header.hr.html.iframe.legend.li.link.main.menu.menuitem.nav.noframes.ol.optgroup.option.p.param.search.section.summary.table.tbody.td.tfoot.th.thead.title.tr.track.ul`.split(
        `.`,
      )),
      (aG = [`pre`, `script`, `style`, `textarea`]));
  }))();
}
function sG(e) {
  let t = e.length;
  for (; t-- && (e[t][0] !== `enter` || e[t][1].type !== `htmlFlow`););
  return (
    t > 1 &&
      e[t - 2][1].type === `linePrefix` &&
      ((e[t][1].start = e[t - 2][1].start),
      (e[t + 1][1].start = e[t - 2][1].start),
      e.splice(t - 2, 2)),
    e
  );
}
function cG(e, t, n) {
  let r = this,
    i,
    a,
    o,
    s,
    c;
  return l;
  function l(e) {
    return u(e);
  }
  function u(t) {
    return (e.enter(`htmlFlow`), e.enter(`htmlFlowData`), e.consume(t), d);
  }
  function d(s) {
    return s === 33
      ? (e.consume(s), f)
      : s === 47
        ? (e.consume(s), (a = !0), h)
        : s === 63
          ? (e.consume(s), (i = 3), r.interrupt ? t : ye)
          : xU(s)
            ? (e.consume(s), (o = String.fromCharCode(s)), ee)
            : n(s);
  }
  function f(a) {
    return a === 45
      ? (e.consume(a), (i = 2), p)
      : a === 91
        ? (e.consume(a), (i = 5), (s = 0), m)
        : xU(a)
          ? (e.consume(a), (i = 4), r.interrupt ? t : ye)
          : n(a);
  }
  function p(i) {
    return i === 45 ? (e.consume(i), r.interrupt ? t : ye) : n(i);
  }
  function m(i) {
    return i === `CDATA[`.charCodeAt(s++)
      ? (e.consume(i), s === 6 ? (r.interrupt ? t : fe) : m)
      : n(i);
  }
  function h(t) {
    return xU(t) ? (e.consume(t), (o = String.fromCharCode(t)), ee) : n(t);
  }
  function ee(s) {
    if (s === null || s === 47 || s === 62 || yU(s)) {
      let c = s === 47,
        l = o.toLowerCase();
      return !c && !a && aG.includes(l)
        ? ((i = 1), r.interrupt ? t(s) : fe(s))
        : iG.includes(o.toLowerCase())
          ? ((i = 6), c ? (e.consume(s), te) : r.interrupt ? t(s) : fe(s))
          : ((i = 7), r.interrupt && !r.parser.lazy[r.now().line] ? n(s) : a ? ne(s) : re(s));
    }
    return s === 45 || SU(s) ? (e.consume(s), (o += String.fromCharCode(s)), ee) : n(s);
  }
  function te(i) {
    return i === 62 ? (e.consume(i), r.interrupt ? t : fe) : n(i);
  }
  function ne(t) {
    return $(t) ? (e.consume(t), ne) : ue(t);
  }
  function re(t) {
    return t === 47
      ? (e.consume(t), ue)
      : t === 58 || t === 95 || xU(t)
        ? (e.consume(t), ie)
        : $(t)
          ? (e.consume(t), re)
          : ue(t);
  }
  function ie(t) {
    return t === 45 || t === 46 || t === 58 || t === 95 || SU(t) ? (e.consume(t), ie) : ae(t);
  }
  function ae(t) {
    return t === 61 ? (e.consume(t), oe) : $(t) ? (e.consume(t), ae) : re(t);
  }
  function oe(t) {
    return t === null || t === 60 || t === 61 || t === 62 || t === 96
      ? n(t)
      : t === 34 || t === 39
        ? (e.consume(t), (c = t), se)
        : $(t)
          ? (e.consume(t), oe)
          : ce(t);
  }
  function se(t) {
    return t === c
      ? (e.consume(t), (c = null), le)
      : t === null || Q(t)
        ? n(t)
        : (e.consume(t), se);
  }
  function ce(t) {
    return t === null ||
      t === 34 ||
      t === 39 ||
      t === 47 ||
      t === 60 ||
      t === 61 ||
      t === 62 ||
      t === 96 ||
      yU(t)
      ? ae(t)
      : (e.consume(t), ce);
  }
  function le(e) {
    return e === 47 || e === 62 || $(e) ? re(e) : n(e);
  }
  function ue(t) {
    return t === 62 ? (e.consume(t), de) : n(t);
  }
  function de(t) {
    return t === null || Q(t) ? fe(t) : $(t) ? (e.consume(t), de) : n(t);
  }
  function fe(t) {
    return t === 45 && i === 2
      ? (e.consume(t), ge)
      : t === 60 && i === 1
        ? (e.consume(t), _e)
        : t === 62 && i === 4
          ? (e.consume(t), be)
          : t === 63 && i === 3
            ? (e.consume(t), ye)
            : t === 93 && i === 5
              ? (e.consume(t), ve)
              : Q(t) && (i === 6 || i === 7)
                ? (e.exit(`htmlFlowData`), e.check(fG, xe, pe)(t))
                : t === null || Q(t)
                  ? (e.exit(`htmlFlowData`), pe(t))
                  : (e.consume(t), fe);
  }
  function pe(t) {
    return e.check(pG, me, xe)(t);
  }
  function me(t) {
    return (e.enter(`lineEnding`), e.consume(t), e.exit(`lineEnding`), he);
  }
  function he(t) {
    return t === null || Q(t) ? pe(t) : (e.enter(`htmlFlowData`), fe(t));
  }
  function ge(t) {
    return t === 45 ? (e.consume(t), ye) : fe(t);
  }
  function _e(t) {
    return t === 47 ? (e.consume(t), (o = ``), g) : fe(t);
  }
  function g(t) {
    if (t === 62) {
      let n = o.toLowerCase();
      return aG.includes(n) ? (e.consume(t), be) : fe(t);
    }
    return xU(t) && o.length < 8 ? (e.consume(t), (o += String.fromCharCode(t)), g) : fe(t);
  }
  function ve(t) {
    return t === 93 ? (e.consume(t), ye) : fe(t);
  }
  function ye(t) {
    return t === 62 ? (e.consume(t), be) : t === 45 && i === 2 ? (e.consume(t), ye) : fe(t);
  }
  function be(t) {
    return t === null || Q(t) ? (e.exit(`htmlFlowData`), xe(t)) : (e.consume(t), be);
  }
  function xe(n) {
    return (e.exit(`htmlFlow`), t(n));
  }
}
function lG(e, t, n) {
  let r = this;
  return i;
  function i(t) {
    return Q(t) ? (e.enter(`lineEnding`), e.consume(t), e.exit(`lineEnding`), a) : n(t);
  }
  function a(e) {
    return r.parser.lazy[r.now().line] ? n(e) : t(e);
  }
}
function uG(e, t, n) {
  return r;
  function r(r) {
    return (e.enter(`lineEnding`), e.consume(r), e.exit(`lineEnding`), e.attempt(QU, t, n));
  }
}
var dG, fG, pG;
function mG() {
  return (mG = e(() => {
    (kU(),
      oG(),
      $U(),
      (dG = { concrete: !0, name: `htmlFlow`, resolveTo: sG, tokenize: cG }),
      (fG = { partial: !0, tokenize: uG }),
      (pG = { partial: !0, tokenize: lG }));
  }))();
}
function hG(e, t, n) {
  let r = this,
    i,
    a,
    o;
  return s;
  function s(t) {
    return (e.enter(`htmlText`), e.enter(`htmlTextData`), e.consume(t), c);
  }
  function c(t) {
    return t === 33
      ? (e.consume(t), l)
      : t === 47
        ? (e.consume(t), ae)
        : t === 63
          ? (e.consume(t), re)
          : xU(t)
            ? (e.consume(t), ce)
            : n(t);
  }
  function l(t) {
    return t === 45
      ? (e.consume(t), u)
      : t === 91
        ? (e.consume(t), (a = 0), m)
        : xU(t)
          ? (e.consume(t), ne)
          : n(t);
  }
  function u(t) {
    return t === 45 ? (e.consume(t), p) : n(t);
  }
  function d(t) {
    return t === null
      ? n(t)
      : t === 45
        ? (e.consume(t), f)
        : Q(t)
          ? ((o = d), _e(t))
          : (e.consume(t), d);
  }
  function f(t) {
    return t === 45 ? (e.consume(t), p) : d(t);
  }
  function p(e) {
    return e === 62 ? ge(e) : e === 45 ? f(e) : d(e);
  }
  function m(t) {
    return t === `CDATA[`.charCodeAt(a++) ? (e.consume(t), a === 6 ? h : m) : n(t);
  }
  function h(t) {
    return t === null
      ? n(t)
      : t === 93
        ? (e.consume(t), ee)
        : Q(t)
          ? ((o = h), _e(t))
          : (e.consume(t), h);
  }
  function ee(t) {
    return t === 93 ? (e.consume(t), te) : h(t);
  }
  function te(t) {
    return t === 62 ? ge(t) : t === 93 ? (e.consume(t), te) : h(t);
  }
  function ne(t) {
    return t === null || t === 62 ? ge(t) : Q(t) ? ((o = ne), _e(t)) : (e.consume(t), ne);
  }
  function re(t) {
    return t === null
      ? n(t)
      : t === 63
        ? (e.consume(t), ie)
        : Q(t)
          ? ((o = re), _e(t))
          : (e.consume(t), re);
  }
  function ie(e) {
    return e === 62 ? ge(e) : re(e);
  }
  function ae(t) {
    return xU(t) ? (e.consume(t), oe) : n(t);
  }
  function oe(t) {
    return t === 45 || SU(t) ? (e.consume(t), oe) : se(t);
  }
  function se(t) {
    return Q(t) ? ((o = se), _e(t)) : $(t) ? (e.consume(t), se) : ge(t);
  }
  function ce(t) {
    return t === 45 || SU(t) ? (e.consume(t), ce) : t === 47 || t === 62 || yU(t) ? le(t) : n(t);
  }
  function le(t) {
    return t === 47
      ? (e.consume(t), ge)
      : t === 58 || t === 95 || xU(t)
        ? (e.consume(t), ue)
        : Q(t)
          ? ((o = le), _e(t))
          : $(t)
            ? (e.consume(t), le)
            : ge(t);
  }
  function ue(t) {
    return t === 45 || t === 46 || t === 58 || t === 95 || SU(t) ? (e.consume(t), ue) : de(t);
  }
  function de(t) {
    return t === 61
      ? (e.consume(t), fe)
      : Q(t)
        ? ((o = de), _e(t))
        : $(t)
          ? (e.consume(t), de)
          : le(t);
  }
  function fe(t) {
    return t === null || t === 60 || t === 61 || t === 62 || t === 96
      ? n(t)
      : t === 34 || t === 39
        ? (e.consume(t), (i = t), pe)
        : Q(t)
          ? ((o = fe), _e(t))
          : $(t)
            ? (e.consume(t), fe)
            : (e.consume(t), me);
  }
  function pe(t) {
    return t === i
      ? (e.consume(t), (i = void 0), he)
      : t === null
        ? n(t)
        : Q(t)
          ? ((o = pe), _e(t))
          : (e.consume(t), pe);
  }
  function me(t) {
    return t === null || t === 34 || t === 39 || t === 60 || t === 61 || t === 96
      ? n(t)
      : t === 47 || t === 62 || yU(t)
        ? le(t)
        : (e.consume(t), me);
  }
  function he(e) {
    return e === 47 || e === 62 || yU(e) ? le(e) : n(e);
  }
  function ge(r) {
    return r === 62 ? (e.consume(r), e.exit(`htmlTextData`), e.exit(`htmlText`), t) : n(r);
  }
  function _e(t) {
    return (e.exit(`htmlTextData`), e.enter(`lineEnding`), e.consume(t), e.exit(`lineEnding`), g);
  }
  function g(t) {
    return $(t)
      ? AU(
          e,
          ve,
          `linePrefix`,
          r.parser.constructs.disable.null.includes(`codeIndented`) ? void 0 : 4,
        )(t)
      : ve(t);
  }
  function ve(t) {
    return (e.enter(`htmlTextData`), o(t));
  }
}
var gG;
function _G() {
  return (_G = e(() => {
    (jU(), kU(), (gG = { name: `htmlText`, tokenize: hG }));
  }))();
}
function vG(e) {
  let t = -1,
    n = [];
  for (; ++t < e.length;) {
    let r = e[t][1];
    if (
      (n.push(e[t]), r.type === `labelImage` || r.type === `labelLink` || r.type === `labelEnd`)
    ) {
      let e = r.type === `labelImage` ? 4 : 2;
      ((r.type = `data`), (t += e));
    }
  }
  return (e.length !== n.length && lU(e, 0, e.length, n), e);
}
function yG(e, t) {
  let n = e.length,
    r = 0,
    i,
    a,
    o,
    s;
  for (; n--;)
    if (((i = e[n][1]), a)) {
      if (i.type === `link` || (i.type === `labelLink` && i._inactive)) break;
      e[n][0] === `enter` && i.type === `labelLink` && (i._inactive = !0);
    } else if (o) {
      if (
        e[n][0] === `enter` &&
        (i.type === `labelImage` || i.type === `labelLink`) &&
        !i._balanced &&
        ((a = n), i.type !== `labelLink`)
      ) {
        r = 2;
        break;
      }
    } else i.type === `labelEnd` && (o = n);
  let c = {
      type: e[a][1].type === `labelLink` ? `link` : `image`,
      start: { ...e[a][1].start },
      end: { ...e[e.length - 1][1].end },
    },
    l = { type: `label`, start: { ...e[a][1].start }, end: { ...e[o][1].end } },
    u = { type: `labelText`, start: { ...e[a + r + 2][1].end }, end: { ...e[o - 2][1].start } };
  return (
    (s = [
      [`enter`, c, t],
      [`enter`, l, t],
    ]),
    (s = uU(s, e.slice(a + 1, a + r + 3))),
    (s = uU(s, [[`enter`, u, t]])),
    (s = uU(s, HU(t.parser.constructs.insideSpan.null, e.slice(a + r + 4, o - 3), t))),
    (s = uU(s, [[`exit`, u, t], e[o - 2], e[o - 1], [`exit`, l, t]])),
    (s = uU(s, e.slice(o + 1))),
    (s = uU(s, [[`exit`, c, t]])),
    lU(e, a, e.length, s),
    e
  );
}
function bG(e, t, n) {
  let r = this,
    i = r.events.length,
    a,
    o;
  for (; i--;)
    if (
      (r.events[i][1].type === `labelImage` || r.events[i][1].type === `labelLink`) &&
      !r.events[i][1]._balanced
    ) {
      a = r.events[i][1];
      break;
    }
  return s;
  function s(t) {
    return a
      ? a._inactive
        ? d(t)
        : ((o = r.parser.defined.includes(_U(r.sliceSerialize({ start: a.end, end: r.now() })))),
          e.enter(`labelEnd`),
          e.enter(`labelMarker`),
          e.consume(t),
          e.exit(`labelMarker`),
          e.exit(`labelEnd`),
          c)
      : n(t);
  }
  function c(t) {
    return t === 40
      ? e.attempt(TG, u, o ? u : d)(t)
      : t === 91
        ? e.attempt(EG, u, o ? l : d)(t)
        : o
          ? u(t)
          : d(t);
  }
  function l(t) {
    return e.attempt(DG, u, d)(t);
  }
  function u(e) {
    return t(e);
  }
  function d(e) {
    return ((a._balanced = !0), n(e));
  }
}
function xG(e, t, n) {
  return r;
  function r(t) {
    return (
      e.enter(`resource`), e.enter(`resourceMarker`), e.consume(t), e.exit(`resourceMarker`), i
    );
  }
  function i(t) {
    return yU(t) ? WW(e, a)(t) : a(t);
  }
  function a(t) {
    return t === 41
      ? u(t)
      : RW(
          e,
          o,
          s,
          `resourceDestination`,
          `resourceDestinationLiteral`,
          `resourceDestinationLiteralMarker`,
          `resourceDestinationRaw`,
          `resourceDestinationString`,
          32,
        )(t);
  }
  function o(t) {
    return yU(t) ? WW(e, c)(t) : u(t);
  }
  function s(e) {
    return n(e);
  }
  function c(t) {
    return t === 34 || t === 39 || t === 40
      ? HW(e, l, n, `resourceTitle`, `resourceTitleMarker`, `resourceTitleString`)(t)
      : u(t);
  }
  function l(t) {
    return yU(t) ? WW(e, u)(t) : u(t);
  }
  function u(r) {
    return r === 41
      ? (e.enter(`resourceMarker`), e.consume(r), e.exit(`resourceMarker`), e.exit(`resource`), t)
      : n(r);
  }
}
function SG(e, t, n) {
  let r = this;
  return i;
  function i(t) {
    return BW.call(r, e, a, o, `reference`, `referenceMarker`, `referenceString`)(t);
  }
  function a(e) {
    return r.parser.defined.includes(
      _U(r.sliceSerialize(r.events[r.events.length - 1][1]).slice(1, -1)),
    )
      ? t(e)
      : n(e);
  }
  function o(e) {
    return n(e);
  }
}
function CG(e, t, n) {
  return r;
  function r(t) {
    return (
      e.enter(`reference`), e.enter(`referenceMarker`), e.consume(t), e.exit(`referenceMarker`), i
    );
  }
  function i(r) {
    return r === 93
      ? (e.enter(`referenceMarker`),
        e.consume(r),
        e.exit(`referenceMarker`),
        e.exit(`reference`),
        t)
      : n(r);
  }
}
var wG, TG, EG, DG;
function OG() {
  return (OG = e(() => {
    (zW(),
      VW(),
      UW(),
      GW(),
      kU(),
      (wG = { name: `labelEnd`, resolveAll: vG, resolveTo: yG, tokenize: bG }),
      (TG = { tokenize: xG }),
      (EG = { tokenize: SG }),
      (DG = { tokenize: CG }));
  }))();
}
function kG(e, t, n) {
  let r = this;
  return i;
  function i(t) {
    return (
      e.enter(`labelImage`),
      e.enter(`labelImageMarker`),
      e.consume(t),
      e.exit(`labelImageMarker`),
      a
    );
  }
  function a(t) {
    return t === 91
      ? (e.enter(`labelMarker`), e.consume(t), e.exit(`labelMarker`), e.exit(`labelImage`), o)
      : n(t);
  }
  function o(e) {
    return e === 94 && `_hiddenFootnoteSupport` in r.parser.constructs ? n(e) : t(e);
  }
}
var AG;
function jG() {
  return (jG = e(() => {
    (OG(), (AG = { name: `labelStartImage`, resolveAll: wG.resolveAll, tokenize: kG }));
  }))();
}
function MG(e, t, n) {
  let r = this;
  return i;
  function i(t) {
    return (
      e.enter(`labelLink`),
      e.enter(`labelMarker`),
      e.consume(t),
      e.exit(`labelMarker`),
      e.exit(`labelLink`),
      a
    );
  }
  function a(e) {
    return e === 94 && `_hiddenFootnoteSupport` in r.parser.constructs ? n(e) : t(e);
  }
}
var NG;
function PG() {
  return (PG = e(() => {
    (OG(), (NG = { name: `labelStartLink`, resolveAll: wG.resolveAll, tokenize: MG }));
  }))();
}
function FG(e, t) {
  return n;
  function n(n) {
    return (e.enter(`lineEnding`), e.consume(n), e.exit(`lineEnding`), AU(e, t, `linePrefix`));
  }
}
var IG;
function LG() {
  return (LG = e(() => {
    (jU(), (IG = { name: `lineEnding`, tokenize: FG }));
  }))();
}
function RG(e, t, n) {
  let r = 0,
    i;
  return a;
  function a(t) {
    return (e.enter(`thematicBreak`), o(t));
  }
  function o(e) {
    return ((i = e), s(e));
  }
  function s(a) {
    return a === i
      ? (e.enter(`thematicBreakSequence`), c(a))
      : r >= 3 && (a === null || Q(a))
        ? (e.exit(`thematicBreak`), t(a))
        : n(a);
  }
  function c(t) {
    return t === i
      ? (e.consume(t), r++, c)
      : (e.exit(`thematicBreakSequence`), $(t) ? AU(e, s, `whitespace`)(t) : s(t));
  }
}
var zG;
function BG() {
  return (BG = e(() => {
    (jU(), kU(), (zG = { name: `thematicBreak`, tokenize: RG }));
  }))();
}
function VG(e, t, n) {
  let r = this,
    i = r.events[r.events.length - 1],
    a = i && i[1].type === `linePrefix` ? i[2].sliceSerialize(i[1], !0).length : 0,
    o = 0;
  return s;
  function s(t) {
    let i =
      r.containerState.type || (t === 42 || t === 43 || t === 45 ? `listUnordered` : `listOrdered`);
    if (i === `listUnordered` ? !r.containerState.marker || t === r.containerState.marker : wU(t)) {
      if (
        (r.containerState.type || ((r.containerState.type = i), e.enter(i, { _container: !0 })),
        i === `listUnordered`)
      )
        return (e.enter(`listItemPrefix`), t === 42 || t === 45 ? e.check(zG, n, l)(t) : l(t));
      if (!r.interrupt || t === 49)
        return (e.enter(`listItemPrefix`), e.enter(`listItemValue`), c(t));
    }
    return n(t);
  }
  function c(t) {
    return wU(t) && ++o < 10
      ? (e.consume(t), c)
      : (!r.interrupt || o < 2) &&
          (r.containerState.marker ? t === r.containerState.marker : t === 41 || t === 46)
        ? (e.exit(`listItemValue`), l(t))
        : n(t);
  }
  function l(t) {
    return (
      e.enter(`listItemMarker`),
      e.consume(t),
      e.exit(`listItemMarker`),
      (r.containerState.marker = r.containerState.marker || t),
      e.check(QU, r.interrupt ? n : u, e.attempt(qG, f, d))
    );
  }
  function u(e) {
    return ((r.containerState.initialBlankLine = !0), a++, f(e));
  }
  function d(t) {
    return $(t)
      ? (e.enter(`listItemPrefixWhitespace`), e.consume(t), e.exit(`listItemPrefixWhitespace`), f)
      : n(t);
  }
  function f(n) {
    return (
      (r.containerState.size = a + r.sliceSerialize(e.exit(`listItemPrefix`), !0).length), t(n)
    );
  }
}
function HG(e, t, n) {
  let r = this;
  return ((r.containerState._closeFlow = void 0), e.check(QU, i, a));
  function i(n) {
    return (
      (r.containerState.furtherBlankLines =
        r.containerState.furtherBlankLines || r.containerState.initialBlankLine),
      AU(e, t, `listItemIndent`, r.containerState.size + 1)(n)
    );
  }
  function a(n) {
    return r.containerState.furtherBlankLines || !$(n)
      ? ((r.containerState.furtherBlankLines = void 0),
        (r.containerState.initialBlankLine = void 0),
        o(n))
      : ((r.containerState.furtherBlankLines = void 0),
        (r.containerState.initialBlankLine = void 0),
        e.attempt(JG, t, o)(n));
  }
  function o(i) {
    return (
      (r.containerState._closeFlow = !0),
      (r.interrupt = void 0),
      AU(
        e,
        e.attempt(KG, t, n),
        `linePrefix`,
        r.parser.constructs.disable.null.includes(`codeIndented`) ? void 0 : 4,
      )(i)
    );
  }
}
function UG(e, t, n) {
  let r = this;
  return AU(e, i, `listItemIndent`, r.containerState.size + 1);
  function i(e) {
    let i = r.events[r.events.length - 1];
    return i &&
      i[1].type === `listItemIndent` &&
      i[2].sliceSerialize(i[1], !0).length === r.containerState.size
      ? t(e)
      : n(e);
  }
}
function WG(e) {
  e.exit(this.containerState.type);
}
function GG(e, t, n) {
  let r = this;
  return AU(
    e,
    i,
    `listItemPrefixWhitespace`,
    r.parser.constructs.disable.null.includes(`codeIndented`) ? void 0 : 5,
  );
  function i(e) {
    let i = r.events[r.events.length - 1];
    return !$(e) && i && i[1].type === `listItemPrefixWhitespace` ? t(e) : n(e);
  }
}
var KG, qG, JG;
function YG() {
  return (YG = e(() => {
    (jU(),
      kU(),
      $U(),
      BG(),
      (KG = { continuation: { tokenize: HG }, exit: WG, name: `list`, tokenize: VG }),
      (qG = { partial: !0, tokenize: GG }),
      (JG = { partial: !0, tokenize: UG }));
  }))();
}
function XG(e, t) {
  let n = e.length,
    r,
    i,
    a;
  for (; n--;)
    if (e[n][0] === `enter`) {
      if (e[n][1].type === `content`) {
        r = n;
        break;
      }
      e[n][1].type === `paragraph` && (i = n);
    } else
      (e[n][1].type === `content` && e.splice(n, 1),
        !a && e[n][1].type === `definition` && (a = n));
  let o = {
    type: `setextHeading`,
    start: { ...e[r][1].start },
    end: { ...e[e.length - 1][1].end },
  };
  return (
    (e[i][1].type = `setextHeadingText`),
    a
      ? (e.splice(i, 0, [`enter`, o, t]),
        e.splice(a + 1, 0, [`exit`, e[r][1], t]),
        (e[r][1].end = { ...e[a][1].end }))
      : (e[r][1] = o),
    e.push([`exit`, o, t]),
    e
  );
}
function ZG(e, t, n) {
  let r = this,
    i;
  return a;
  function a(t) {
    let a = r.events.length,
      s;
    for (; a--;)
      if (
        r.events[a][1].type !== `lineEnding` &&
        r.events[a][1].type !== `linePrefix` &&
        r.events[a][1].type !== `content`
      ) {
        s = r.events[a][1].type === `paragraph`;
        break;
      }
    return !r.parser.lazy[r.now().line] && (r.interrupt || s)
      ? (e.enter(`setextHeadingLine`), (i = t), o(t))
      : n(t);
  }
  function o(t) {
    return (e.enter(`setextHeadingLineSequence`), s(t));
  }
  function s(t) {
    return t === i
      ? (e.consume(t), s)
      : (e.exit(`setextHeadingLineSequence`), $(t) ? AU(e, c, `lineSuffix`)(t) : c(t));
  }
  function c(r) {
    return r === null || Q(r) ? (e.exit(`setextHeadingLine`), t(r)) : n(r);
  }
}
var QG;
function $G() {
  return ($G = e(() => {
    (jU(), kU(), (QG = { name: `setextUnderline`, resolveTo: XG, tokenize: ZG }));
  }))();
}
function eK(e) {
  let t = this,
    n = e.attempt(
      QU,
      r,
      e.attempt(
        this.parser.constructs.flowInitial,
        i,
        AU(e, e.attempt(this.parser.constructs.flow, i, e.attempt(FW, i)), `linePrefix`),
      ),
    );
  return n;
  function r(r) {
    if (r === null) {
      e.consume(r);
      return;
    }
    return (
      e.enter(`lineEndingBlank`),
      e.consume(r),
      e.exit(`lineEndingBlank`),
      (t.currentConstruct = void 0),
      n
    );
  }
  function i(r) {
    if (r === null) {
      e.consume(r);
      return;
    }
    return (
      e.enter(`lineEnding`), e.consume(r), e.exit(`lineEnding`), (t.currentConstruct = void 0), n
    );
  }
}
var tK;
function nK() {
  return (nK = e(() => {
    ($U(), LW(), jU(), (tK = { tokenize: eK }));
  }))();
}
function rK(e) {
  return { resolveAll: iK(e === `text` ? aK : void 0), tokenize: t };
  function t(t) {
    let n = this,
      r = this.parser.constructs[e],
      i = t.attempt(r, a, o);
    return a;
    function a(e) {
      return c(e) ? i(e) : o(e);
    }
    function o(e) {
      if (e === null) {
        t.consume(e);
        return;
      }
      return (t.enter(`data`), t.consume(e), s);
    }
    function s(e) {
      return c(e) ? (t.exit(`data`), i(e)) : (t.consume(e), s);
    }
    function c(e) {
      if (e === null) return !0;
      let t = r[e],
        i = -1;
      if (t)
        for (; ++i < t.length;) {
          let e = t[i];
          if (!e.previous || e.previous.call(n, n.previous)) return !0;
        }
      return !1;
    }
  }
}
function iK(e) {
  return t;
  function t(t, n) {
    let r = -1,
      i;
    for (; ++r <= t.length;)
      i === void 0
        ? t[r] && t[r][1].type === `data` && ((i = r), r++)
        : (!t[r] || t[r][1].type !== `data`) &&
          (r !== i + 2 &&
            ((t[i][1].end = t[r - 1][1].end), t.splice(i + 2, r - i - 2), (r = i + 2)),
          (i = void 0));
    return e ? e(t, n) : t;
  }
}
function aK(e, t) {
  let n = 0;
  for (; ++n <= e.length;)
    if ((n === e.length || e[n][1].type === `lineEnding`) && e[n - 1][1].type === `data`) {
      let r = e[n - 1][1],
        i = t.sliceStream(r),
        a = i.length,
        o = -1,
        s = 0,
        c;
      for (; a--;) {
        let e = i[a];
        if (typeof e == `string`) {
          for (o = e.length; e.charCodeAt(o - 1) === 32;) (s++, o--);
          if (o) break;
          o = -1;
        } else if (e === -2) ((c = !0), s++);
        else if (e !== -1) {
          a++;
          break;
        }
      }
      if ((t._contentTypeTextTrailing && n === e.length && (s = 0), s)) {
        let i = {
          type: n === e.length || c || s < 2 ? `lineSuffix` : `hardBreakTrailing`,
          start: {
            _bufferIndex: a ? o : r.start._bufferIndex + o,
            _index: r.start._index + a,
            line: r.end.line,
            column: r.end.column - s,
            offset: r.end.offset - s,
          },
          end: { ...r.end },
        };
        ((r.end = { ...i.start }),
          r.start.offset === r.end.offset
            ? Object.assign(r, i)
            : (e.splice(n, 0, [`enter`, i, t], [`exit`, i, t]), (n += 2)));
      }
      n++;
    }
  return e;
}
var oK, sK, cK;
function lK() {
  return (lK = e(() => {
    ((oK = { resolveAll: iK() }), (sK = rK(`string`)), (cK = rK(`text`)));
  }))();
}
var uK = t({
    attentionMarkers: () => vK,
    contentInitial: () => fK,
    disable: () => yK,
    document: () => dK,
    flow: () => mK,
    flowInitial: () => pK,
    insideSpan: () => _K,
    string: () => hK,
    text: () => gK,
  }),
  dK,
  fK,
  pK,
  mK,
  hK,
  gK,
  _K,
  vK,
  yK;
function bK() {
  return (bK = e(() => {
    (qU(),
      XU(),
      iW(),
      sW(),
      uW(),
      hW(),
      bW(),
      TW(),
      XW(),
      $W(),
      rG(),
      mG(),
      _G(),
      OG(),
      jG(),
      PG(),
      LG(),
      YG(),
      $G(),
      BG(),
      lK(),
      (dK = {
        42: KG,
        43: KG,
        45: KG,
        48: KG,
        49: KG,
        50: KG,
        51: KG,
        52: KG,
        53: KG,
        54: KG,
        55: KG,
        56: KG,
        57: KG,
        62: rW,
      }),
      (fK = { 91: JW }),
      (pK = { [-2]: vW, [-1]: vW, 32: vW }),
      (mK = { 35: nG, 42: zG, 45: [QG, zG], 60: dG, 61: QG, 95: zG, 96: mW, 126: mW }),
      (hK = { 38: lW, 92: oW }),
      (gK = {
        [-5]: IG,
        [-4]: IG,
        [-3]: IG,
        33: AG,
        38: lW,
        42: KU,
        60: [YU, gG],
        91: NG,
        92: [QW, oW],
        93: wG,
        95: KU,
        96: wW,
      }),
      (_K = { null: [KU, oK] }),
      (vK = { null: [42, 95] }),
      (yK = { null: [] }));
  }))();
}
function xK(e, t, n) {
  let r = {
      _bufferIndex: -1,
      _index: 0,
      line: (n && n.line) || 1,
      column: (n && n.column) || 1,
      offset: (n && n.offset) || 0,
    },
    i = {},
    a = [],
    o = [],
    s = [],
    c = {
      attempt: se(ae),
      check: se(oe),
      consume: ne,
      enter: re,
      exit: ie,
      interrupt: se(oe, { interrupt: !0 }),
    },
    l = {
      code: null,
      containerState: {},
      defineSkip: h,
      events: [],
      now: m,
      parser: e,
      previous: null,
      sliceSerialize: f,
      sliceStream: p,
      write: d,
    },
    u = t.tokenize.call(l, c);
  return (t.resolveAll && a.push(t), l);
  function d(e) {
    return (
      (o = uU(o, e)),
      ee(),
      o[o.length - 1] === null ? (ce(t, 0), (l.events = HU(a, l.events, l)), l.events) : []
    );
  }
  function f(e, t) {
    return CK(p(e), t);
  }
  function p(e) {
    return SK(o, e);
  }
  function m() {
    let { _bufferIndex: e, _index: t, line: n, column: i, offset: a } = r;
    return { _bufferIndex: e, _index: t, line: n, column: i, offset: a };
  }
  function h(e) {
    ((i[e.line] = e.column), ue());
  }
  function ee() {
    let e;
    for (; r._index < o.length;) {
      let t = o[r._index];
      if (typeof t == `string`)
        for (
          e = r._index, r._bufferIndex < 0 && (r._bufferIndex = 0);
          r._index === e && r._bufferIndex < t.length;
        )
          te(t.charCodeAt(r._bufferIndex));
      else te(t);
    }
  }
  function te(e) {
    u = u(e);
  }
  function ne(e) {
    (Q(e)
      ? (r.line++, (r.column = 1), (r.offset += e === -3 ? 2 : 1), ue())
      : e !== -1 && (r.column++, r.offset++),
      r._bufferIndex < 0
        ? r._index++
        : (r._bufferIndex++,
          r._bufferIndex === o[r._index].length && ((r._bufferIndex = -1), r._index++)),
      (l.previous = e));
  }
  function re(e, t) {
    let n = t || {};
    return ((n.type = e), (n.start = m()), l.events.push([`enter`, n, l]), s.push(n), n);
  }
  function ie(e) {
    let t = s.pop();
    return ((t.end = m()), l.events.push([`exit`, t, l]), t);
  }
  function ae(e, t) {
    ce(e, t.from);
  }
  function oe(e, t) {
    t.restore();
  }
  function se(e, t) {
    return n;
    function n(n, r, i) {
      let a, o, s, u;
      return Array.isArray(n) ? f(n) : `tokenize` in n ? f([n]) : d(n);
      function d(e) {
        return t;
        function t(t) {
          let n = t !== null && e[t],
            r = t !== null && e.null;
          return f([
            ...(Array.isArray(n) ? n : n ? [n] : []),
            ...(Array.isArray(r) ? r : r ? [r] : []),
          ])(t);
        }
      }
      function f(e) {
        return ((a = e), (o = 0), e.length === 0 ? i : p(e[o]));
      }
      function p(e) {
        return n;
        function n(n) {
          return (
            (u = le()),
            (s = e),
            e.partial || (l.currentConstruct = e),
            e.name && l.parser.constructs.disable.null.includes(e.name)
              ? h(n)
              : e.tokenize.call(t ? Object.assign(Object.create(l), t) : l, c, m, h)(n)
          );
        }
      }
      function m(t) {
        return (e(s, u), r);
      }
      function h(e) {
        return (u.restore(), ++o < a.length ? p(a[o]) : i);
      }
    }
  }
  function ce(e, t) {
    (e.resolveAll && !a.includes(e) && a.push(e),
      e.resolve && lU(l.events, t, l.events.length - t, e.resolve(l.events.slice(t), l)),
      e.resolveTo && (l.events = e.resolveTo(l.events, l)));
  }
  function le() {
    let e = m(),
      t = l.previous,
      n = l.currentConstruct,
      i = l.events.length,
      a = Array.from(s);
    return { from: i, restore: o };
    function o() {
      ((r = e), (l.previous = t), (l.currentConstruct = n), (l.events.length = i), (s = a), ue());
    }
  }
  function ue() {
    r.line in i && r.column < 2 && ((r.column = i[r.line]), (r.offset += i[r.line] - 1));
  }
}
function SK(e, t) {
  let n = t.start._index,
    r = t.start._bufferIndex,
    i = t.end._index,
    a = t.end._bufferIndex,
    o;
  if (n === i) o = [e[n].slice(r, a)];
  else {
    if (((o = e.slice(n, i)), r > -1)) {
      let e = o[0];
      typeof e == `string` ? (o[0] = e.slice(r)) : o.shift();
    }
    a > 0 && o.push(e[i].slice(0, a));
  }
  return o;
}
function CK(e, t) {
  let n = -1,
    r = [],
    i;
  for (; ++n < e.length;) {
    let a = e[n],
      o;
    if (typeof a == `string`) o = a;
    else
      switch (a) {
        case -5:
          o = `\r`;
          break;
        case -4:
          o = `
`;
          break;
        case -3:
          o = `\r
`;
          break;
        case -2:
          o = t ? ` ` : `	`;
          break;
        case -1:
          if (!t && i) continue;
          o = ` `;
          break;
        default:
          o = String.fromCharCode(a);
      }
    ((i = a === -2), r.push(o));
  }
  return r.join(``);
}
function wK() {
  return (wK = e(() => {
    kU();
  }))();
}
function TK(e) {
  let t = {
    constructs: dU([uK, ...((e || {}).extensions || [])]),
    content: n(NU),
    defined: [],
    document: n(LU),
    flow: n(tK),
    lazy: {},
    string: n(sK),
    text: n(cK),
  };
  return t;
  function n(e) {
    return n;
    function n(n) {
      return xK(t, e, n);
    }
  }
}
function EK() {
  return (EK = e(() => {
    (hU(), PU(), zU(), nK(), lK(), bK(), wK());
  }))();
}
function DK(e) {
  for (; !kW(e););
  return e;
}
function OK() {
  return (OK = e(() => {
    jW();
  }))();
}
function kK() {
  let e = 1,
    t = ``,
    n = !0,
    r;
  return i;
  function i(i, a, o) {
    let s = [],
      c,
      l,
      u,
      d,
      f;
    for (
      i = t + (typeof i == `string` ? i.toString() : new TextDecoder(a || void 0).decode(i)),
        u = 0,
        t = ``,
        n &&= (i.charCodeAt(0) === 65279 && u++, void 0);
      u < i.length;
    ) {
      if (
        ((AK.lastIndex = u),
        (c = AK.exec(i)),
        (d = c && c.index !== void 0 ? c.index : i.length),
        (f = i.charCodeAt(d)),
        !c)
      ) {
        t = i.slice(u);
        break;
      }
      if (f === 10 && u === d && r) (s.push(-3), (r = void 0));
      else
        switch (((r &&= (s.push(-5), void 0)), u < d && (s.push(i.slice(u, d)), (e += d - u)), f)) {
          case 0:
            (s.push(65533), e++);
            break;
          case 9:
            for (l = Math.ceil(e / 4) * 4, s.push(-2); e++ < l;) s.push(-1);
            break;
          case 10:
            (s.push(-4), (e = 1));
            break;
          default:
            ((r = !0), (e = 1));
        }
      u = d + 1;
    }
    return (o && (r && s.push(-5), t && s.push(t), s.push(null)), s);
  }
}
var AK;
function jK() {
  return (jK = e(() => {
    AK = /[\0\t\n\r]/g;
  }))();
}
function MK(e) {
  return e.replace(PK, NK);
}
function NK(e, t, n) {
  if (t) return t;
  if (n.charCodeAt(0) === 35) {
    let e = n.charCodeAt(1),
      t = e === 120 || e === 88;
    return gU(n.slice(t ? 2 : 1), t ? 16 : 10);
  }
  return oU(n) || e;
}
var PK;
function FK() {
  return (FK = e(() => {
    (cU(), (PK = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi));
  }))();
}
function IK(e) {
  return !e || typeof e != `object`
    ? ``
    : `position` in e || `type` in e
      ? RK(e.position)
      : `start` in e || `end` in e
        ? RK(e)
        : `line` in e || `column` in e
          ? LK(e)
          : ``;
}
function LK(e) {
  return zK(e && e.line) + `:` + zK(e && e.column);
}
function RK(e) {
  return LK(e && e.start) + `-` + LK(e && e.end);
}
function zK(e) {
  return e && typeof e == `number` ? e : 1;
}
function BK(e, t, n) {
  return (
    t && typeof t == `object` && ((n = t), (t = void 0)),
    VK(n)(
      DK(
        TK(n)
          .document()
          .write(kK()(e, t, !0)),
      ),
    )
  );
}
function VK(e) {
  let t = {
    transforms: [],
    canContainEols: [`emphasis`, `fragment`, `heading`, `paragraph`, `strong`],
    enter: {
      autolink: a(Re),
      autolinkProtocol: le,
      autolinkEmail: le,
      atxHeading: a(Pe),
      blockQuote: a(ke),
      characterEscape: le,
      characterReference: le,
      codeFenced: a(Ae),
      codeFencedFenceInfo: o,
      codeFencedFenceMeta: o,
      codeIndented: a(Ae, o),
      codeText: a(je, o),
      codeTextData: le,
      data: le,
      codeFlowValue: le,
      definition: a(Me),
      definitionDestinationString: o,
      definitionLabelString: o,
      definitionTitleString: o,
      emphasis: a(Ne),
      hardBreakEscape: a(Fe),
      hardBreakTrailing: a(Fe),
      htmlFlow: a(Ie, o),
      htmlFlowData: le,
      htmlText: a(Ie, o),
      htmlTextData: le,
      image: a(Le),
      label: o,
      link: a(Re),
      listItem: a(Be),
      listItemValue: f,
      listOrdered: a(ze, d),
      listUnordered: a(ze),
      paragraph: a(Ve),
      reference: Se,
      referenceString: o,
      resourceDestinationString: o,
      resourceTitleString: o,
      setextHeading: a(Pe),
      strong: a(He),
      thematicBreak: a(We),
    },
    exit: {
      atxHeading: c(),
      atxHeadingSequence: ae,
      autolink: c(),
      autolinkEmail: Oe,
      autolinkProtocol: De,
      blockQuote: c(),
      characterEscapeValue: ue,
      characterReferenceMarkerHexadecimal: we,
      characterReferenceMarkerNumeric: we,
      characterReferenceValue: Te,
      characterReference: Ee,
      codeFenced: c(ee),
      codeFencedFence: h,
      codeFencedFenceInfo: p,
      codeFencedFenceMeta: m,
      codeFlowValue: ue,
      codeIndented: c(te),
      codeText: c(he),
      codeTextData: ue,
      data: ue,
      definition: c(),
      definitionDestinationString: ie,
      definitionLabelString: ne,
      definitionTitleString: re,
      emphasis: c(),
      hardBreakEscape: c(fe),
      hardBreakTrailing: c(fe),
      htmlFlow: c(pe),
      htmlFlowData: ue,
      htmlText: c(me),
      htmlTextData: ue,
      image: c(_e),
      label: ve,
      labelText: g,
      lineEnding: de,
      link: c(ge),
      listItem: c(),
      listOrdered: c(),
      listUnordered: c(),
      paragraph: c(),
      referenceString: Ce,
      resourceDestinationString: ye,
      resourceTitleString: be,
      resource: xe,
      setextHeading: c(ce),
      setextHeadingLineSequence: se,
      setextHeadingText: oe,
      strong: c(),
      thematicBreak: c(),
    },
  };
  UK(t, (e || {}).mdastExtensions || []);
  let n = {};
  return r;
  function r(e) {
    let r = { type: `root`, children: [] },
      a = {
        stack: [r],
        tokenStack: [],
        config: t,
        enter: s,
        exit: l,
        buffer: o,
        resume: u,
        data: n,
      },
      c = [],
      d = -1;
    for (; ++d < e.length;)
      (e[d][1].type === `listOrdered` || e[d][1].type === `listUnordered`) &&
        (e[d][0] === `enter` ? c.push(d) : (d = i(e, c.pop(), d)));
    for (d = -1; ++d < e.length;) {
      let n = t[e[d][0]];
      KK.call(n, e[d][1].type) &&
        n[e[d][1].type].call(Object.assign({ sliceSerialize: e[d][2].sliceSerialize }, a), e[d][1]);
    }
    if (a.tokenStack.length > 0) {
      let e = a.tokenStack[a.tokenStack.length - 1];
      (e[1] || GK).call(a, void 0, e[0]);
    }
    for (
      r.position = {
        start: HK(e.length > 0 ? e[0][1].start : { line: 1, column: 1, offset: 0 }),
        end: HK(e.length > 0 ? e[e.length - 2][1].end : { line: 1, column: 1, offset: 0 }),
      },
        d = -1;
      ++d < t.transforms.length;
    )
      r = t.transforms[d](r) || r;
    return r;
  }
  function i(e, t, n) {
    let r = t - 1,
      i = -1,
      a = !1,
      o,
      s,
      c,
      l;
    for (; ++r <= n;) {
      let t = e[r];
      switch (t[1].type) {
        case `listUnordered`:
        case `listOrdered`:
        case `blockQuote`:
          (t[0] === `enter` ? i++ : i--, (l = void 0));
          break;
        case `lineEndingBlank`:
          t[0] === `enter` && (o && !l && !i && !c && (c = r), (l = void 0));
          break;
        case `linePrefix`:
        case `listItemValue`:
        case `listItemMarker`:
        case `listItemPrefix`:
        case `listItemPrefixWhitespace`:
          break;
        default:
          l = void 0;
      }
      if (
        (!i && t[0] === `enter` && t[1].type === `listItemPrefix`) ||
        (i === -1 &&
          t[0] === `exit` &&
          (t[1].type === `listUnordered` || t[1].type === `listOrdered`))
      ) {
        if (o) {
          let i = r;
          for (s = void 0; i--;) {
            let t = e[i];
            if (t[1].type === `lineEnding` || t[1].type === `lineEndingBlank`) {
              if (t[0] === `exit`) continue;
              (s && ((e[s][1].type = `lineEndingBlank`), (a = !0)),
                (t[1].type = `lineEnding`),
                (s = i));
            } else if (
              t[1].type !== `linePrefix` &&
              t[1].type !== `blockQuotePrefix` &&
              t[1].type !== `blockQuotePrefixWhitespace` &&
              t[1].type !== `blockQuoteMarker` &&
              t[1].type !== `listItemIndent`
            )
              break;
          }
          (c && (!s || c < s) && (o._spread = !0),
            (o.end = Object.assign({}, s ? e[s][1].start : t[1].end)),
            e.splice(s || r, 0, [`exit`, o, t[2]]),
            r++,
            n++);
        }
        if (t[1].type === `listItemPrefix`) {
          let i = {
            type: `listItem`,
            _spread: !1,
            start: Object.assign({}, t[1].start),
            end: void 0,
          };
          ((o = i), e.splice(r, 0, [`enter`, i, t[2]]), r++, n++, (c = void 0), (l = !0));
        }
      }
    }
    return ((e[t][1]._spread = a), n);
  }
  function a(e, t) {
    return n;
    function n(n) {
      (s.call(this, e(n), n), t && t.call(this, n));
    }
  }
  function o() {
    this.stack.push({ type: `fragment`, children: [] });
  }
  function s(e, t, n) {
    (this.stack[this.stack.length - 1].children.push(e),
      this.stack.push(e),
      this.tokenStack.push([t, n || void 0]),
      (e.position = { start: HK(t.start), end: void 0 }));
  }
  function c(e) {
    return t;
    function t(t) {
      (e && e.call(this, t), l.call(this, t));
    }
  }
  function l(e, t) {
    let n = this.stack.pop(),
      r = this.tokenStack.pop();
    if (r) r[0].type !== e.type && (t ? t.call(this, e, r[0]) : (r[1] || GK).call(this, e, r[0]));
    else
      throw Error(
        "Cannot close `" + e.type + "` (" + IK({ start: e.start, end: e.end }) + `): it’s not open`,
      );
    n.position.end = HK(e.end);
  }
  function u() {
    return eU(this.stack.pop());
  }
  function d() {
    this.data.expectingFirstListItemValue = !0;
  }
  function f(e) {
    if (this.data.expectingFirstListItemValue) {
      let t = this.stack[this.stack.length - 2];
      ((t.start = Number.parseInt(this.sliceSerialize(e), 10)),
        (this.data.expectingFirstListItemValue = void 0));
    }
  }
  function p() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    t.lang = e;
  }
  function m() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    t.meta = e;
  }
  function h() {
    this.data.flowCodeInside || (this.buffer(), (this.data.flowCodeInside = !0));
  }
  function ee() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    ((t.value = e.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, ``)), (this.data.flowCodeInside = void 0));
  }
  function te() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    t.value = e.replace(/(\r?\n|\r)$/g, ``);
  }
  function ne(e) {
    let t = this.resume(),
      n = this.stack[this.stack.length - 1];
    ((n.label = t), (n.identifier = _U(this.sliceSerialize(e)).toLowerCase()));
  }
  function re() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    t.title = e;
  }
  function ie() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    t.url = e;
  }
  function ae(e) {
    let t = this.stack[this.stack.length - 1];
    t.depth ||= this.sliceSerialize(e).length;
  }
  function oe() {
    this.data.setextHeadingSlurpLineEnding = !0;
  }
  function se(e) {
    let t = this.stack[this.stack.length - 1];
    t.depth = this.sliceSerialize(e).codePointAt(0) === 61 ? 1 : 2;
  }
  function ce() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function le(e) {
    let t = this.stack[this.stack.length - 1].children,
      n = t[t.length - 1];
    ((!n || n.type !== `text`) &&
      ((n = Ue()), (n.position = { start: HK(e.start), end: void 0 }), t.push(n)),
      this.stack.push(n));
  }
  function ue(e) {
    let t = this.stack.pop();
    ((t.value += this.sliceSerialize(e)), (t.position.end = HK(e.end)));
  }
  function de(e) {
    let n = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      let t = n.children[n.children.length - 1];
      ((t.position.end = HK(e.end)), (this.data.atHardBreak = void 0));
      return;
    }
    !this.data.setextHeadingSlurpLineEnding &&
      t.canContainEols.includes(n.type) &&
      (le.call(this, e), ue.call(this, e));
  }
  function fe() {
    this.data.atHardBreak = !0;
  }
  function pe() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    t.value = e;
  }
  function me() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    t.value = e;
  }
  function he() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    t.value = e;
  }
  function ge() {
    let e = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      let t = this.data.referenceType || `shortcut`;
      ((e.type += `Reference`), (e.referenceType = t), delete e.url, delete e.title);
    } else (delete e.identifier, delete e.label);
    this.data.referenceType = void 0;
  }
  function _e() {
    let e = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      let t = this.data.referenceType || `shortcut`;
      ((e.type += `Reference`), (e.referenceType = t), delete e.url, delete e.title);
    } else (delete e.identifier, delete e.label);
    this.data.referenceType = void 0;
  }
  function g(e) {
    let t = this.sliceSerialize(e),
      n = this.stack[this.stack.length - 2];
    ((n.label = MK(t)), (n.identifier = _U(t).toLowerCase()));
  }
  function ve() {
    let e = this.stack[this.stack.length - 1],
      t = this.resume(),
      n = this.stack[this.stack.length - 1];
    ((this.data.inReference = !0), n.type === `link` ? (n.children = e.children) : (n.alt = t));
  }
  function ye() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    t.url = e;
  }
  function be() {
    let e = this.resume(),
      t = this.stack[this.stack.length - 1];
    t.title = e;
  }
  function xe() {
    this.data.inReference = void 0;
  }
  function Se() {
    this.data.referenceType = `collapsed`;
  }
  function Ce(e) {
    let t = this.resume(),
      n = this.stack[this.stack.length - 1];
    ((n.label = t),
      (n.identifier = _U(this.sliceSerialize(e)).toLowerCase()),
      (this.data.referenceType = `full`));
  }
  function we(e) {
    this.data.characterReferenceType = e.type;
  }
  function Te(e) {
    let t = this.sliceSerialize(e),
      n = this.data.characterReferenceType,
      r;
    n
      ? ((r = gU(t, n === `characterReferenceMarkerNumeric` ? 10 : 16)),
        (this.data.characterReferenceType = void 0))
      : (r = oU(t));
    let i = this.stack[this.stack.length - 1];
    i.value += r;
  }
  function Ee(e) {
    let t = this.stack.pop();
    t.position.end = HK(e.end);
  }
  function De(e) {
    ue.call(this, e);
    let t = this.stack[this.stack.length - 1];
    t.url = this.sliceSerialize(e);
  }
  function Oe(e) {
    ue.call(this, e);
    let t = this.stack[this.stack.length - 1];
    t.url = `mailto:` + this.sliceSerialize(e);
  }
  function ke() {
    return { type: `blockquote`, children: [] };
  }
  function Ae() {
    return { type: `code`, lang: null, meta: null, value: `` };
  }
  function je() {
    return { type: `inlineCode`, value: `` };
  }
  function Me() {
    return { type: `definition`, identifier: ``, label: null, title: null, url: `` };
  }
  function Ne() {
    return { type: `emphasis`, children: [] };
  }
  function Pe() {
    return { type: `heading`, depth: 0, children: [] };
  }
  function Fe() {
    return { type: `break` };
  }
  function Ie() {
    return { type: `html`, value: `` };
  }
  function Le() {
    return { type: `image`, title: null, url: ``, alt: null };
  }
  function Re() {
    return { type: `link`, title: null, url: ``, children: [] };
  }
  function ze(e) {
    return {
      type: `list`,
      ordered: e.type === `listOrdered`,
      start: null,
      spread: e._spread,
      children: [],
    };
  }
  function Be(e) {
    return { type: `listItem`, spread: e._spread, checked: null, children: [] };
  }
  function Ve() {
    return { type: `paragraph`, children: [] };
  }
  function He() {
    return { type: `strong`, children: [] };
  }
  function Ue() {
    return { type: `text`, value: `` };
  }
  function We() {
    return { type: `thematicBreak` };
  }
}
function HK(e) {
  return { line: e.line, column: e.column, offset: e.offset };
}
function UK(e, t) {
  let n = -1;
  for (; ++n < t.length;) {
    let r = t[n];
    Array.isArray(r) ? UK(e, r) : WK(e, r);
  }
}
function WK(e, t) {
  let n;
  for (n in t)
    if (KK.call(t, n))
      switch (n) {
        case `canContainEols`: {
          let r = t[n];
          r && e[n].push(...r);
          break;
        }
        case `transforms`: {
          let r = t[n];
          r && e[n].push(...r);
          break;
        }
        case `enter`:
        case `exit`: {
          let r = t[n];
          r && Object.assign(e[n], r);
          break;
        }
      }
}
function GK(e, t) {
  throw Error(
    e
      ? "Cannot close `" +
          e.type +
          "` (" +
          IK({ start: e.start, end: e.end }) +
          "): a different token (`" +
          t.type +
          "`, " +
          IK({ start: t.start, end: t.end }) +
          `) is open`
      : "Cannot close document, a token (`" +
          t.type +
          "`, " +
          IK({ start: t.start, end: t.end }) +
          `) is still open`,
  );
}
var KK;
function qK() {
  return (qK = e(() => {
    (aU(), EK(), OK(), jK(), FK(), cU(), (KK = {}.hasOwnProperty));
  }))();
}
function JK() {
  return {
    enter: { table: YK, tableData: $K, tableHeader: $K, tableRow: ZK },
    exit: { codeText: eq, table: XK, tableData: QK, tableHeader: QK, tableRow: QK },
  };
}
function YK(e) {
  let t = e._align;
  (this.enter(
    {
      type: `table`,
      align: t.map(function (e) {
        return e === `none` ? null : e;
      }),
      children: [],
    },
    e,
  ),
    (this.data.inTable = !0));
}
function XK(e) {
  (this.exit(e), (this.data.inTable = void 0));
}
function ZK(e) {
  this.enter({ type: `tableRow`, children: [] }, e);
}
function QK(e) {
  this.exit(e);
}
function $K(e) {
  this.enter({ type: `tableCell`, children: [] }, e);
}
function eq(e) {
  let t = this.resume();
  this.data.inTable && (t = t.replace(/\\([\\|])/g, tq));
  let n = this.stack[this.stack.length - 1];
  (n.type, (n.value = t), this.exit(e));
}
function tq(e, t) {
  return t === `|` ? t : e;
}
function nq() {
  return (nq = e(() => {}))();
}
function rq(e, t, n, r) {
  let i = 0;
  if (n !== 0 || r.length !== 0) {
    for (; i < e.map.length;) {
      if (e.map[i][0] === t) {
        ((e.map[i][1] += n), e.map[i][2].push(...r));
        return;
      }
      i += 1;
    }
    e.map.push([t, n, r]);
  }
}
var iq;
function aq() {
  return (aq = e(() => {
    iq = class {
      constructor() {
        this.map = [];
      }
      add(e, t, n) {
        rq(this, e, t, n);
      }
      consume(e) {
        if (
          (this.map.sort(function (e, t) {
            return e[0] - t[0];
          }),
          this.map.length === 0)
        )
          return;
        let t = this.map.length,
          n = [];
        for (; t > 0;)
          (--t,
            n.push(e.slice(this.map[t][0] + this.map[t][1]), this.map[t][2]),
            (e.length = this.map[t][0]));
        (n.push(e.slice()), (e.length = 0));
        let r = n.pop();
        for (; r;) {
          for (let t of r) e.push(t);
          r = n.pop();
        }
        this.map.length = 0;
      }
    };
  }))();
}
function oq(e, t) {
  let n = !1,
    r = [];
  for (; t < e.length;) {
    let i = e[t];
    if (n) {
      if (i[0] === `enter`)
        i[1].type === `tableContent` &&
          r.push(e[t + 1][1].type === `tableDelimiterMarker` ? `left` : `none`);
      else if (i[1].type === `tableContent`) {
        if (e[t - 1][1].type === `tableDelimiterMarker`) {
          let e = r.length - 1;
          r[e] = r[e] === `left` ? `center` : `right`;
        }
      } else if (i[1].type === `tableDelimiterRow`) break;
    } else i[0] === `enter` && i[1].type === `tableDelimiterRow` && (n = !0);
    t += 1;
  }
  return r;
}
function sq() {
  return { flow: { null: { name: `table`, tokenize: cq, resolveAll: lq } } };
}
function cq(e, t, n) {
  let r = this,
    i = 0,
    a = 0,
    o;
  return s;
  function s(e) {
    let t = r.events.length - 1;
    for (; t > -1;) {
      let e = r.events[t][1].type;
      if (e === `lineEnding` || e === `linePrefix`) t--;
      else break;
    }
    let i = t > -1 ? r.events[t][1].type : null,
      a = i === `tableHead` || i === `tableRow` ? oe : c;
    return a === oe && r.parser.lazy[r.now().line] ? n(e) : a(e);
  }
  function c(t) {
    return (e.enter(`tableHead`), e.enter(`tableRow`), l(t));
  }
  function l(e) {
    return e === 124 ? u(e) : ((o = !0), (a += 1), u(e));
  }
  function u(t) {
    return t === null
      ? n(t)
      : Q(t)
        ? a > 1
          ? ((a = 0),
            (r.interrupt = !0),
            e.exit(`tableRow`),
            e.enter(`lineEnding`),
            e.consume(t),
            e.exit(`lineEnding`),
            p)
          : n(t)
        : $(t)
          ? AU(e, u, `whitespace`)(t)
          : ((a += 1),
            o && ((o = !1), (i += 1)),
            t === 124
              ? (e.enter(`tableCellDivider`), e.consume(t), e.exit(`tableCellDivider`), (o = !0), u)
              : (e.enter(`data`), d(t)));
  }
  function d(t) {
    return t === null || t === 124 || yU(t)
      ? (e.exit(`data`), u(t))
      : (e.consume(t), t === 92 ? f : d);
  }
  function f(t) {
    return t === 92 || t === 124 ? (e.consume(t), d) : d(t);
  }
  function p(t) {
    return (
      (r.interrupt = !1),
      r.parser.lazy[r.now().line]
        ? n(t)
        : (e.enter(`tableDelimiterRow`),
          (o = !1),
          $(t)
            ? AU(
                e,
                m,
                `linePrefix`,
                r.parser.constructs.disable.null.includes(`codeIndented`) ? void 0 : 4,
              )(t)
            : m(t))
    );
  }
  function m(t) {
    return t === 45 || t === 58
      ? ee(t)
      : t === 124
        ? ((o = !0), e.enter(`tableCellDivider`), e.consume(t), e.exit(`tableCellDivider`), h)
        : ae(t);
  }
  function h(t) {
    return $(t) ? AU(e, ee, `whitespace`)(t) : ee(t);
  }
  function ee(t) {
    return t === 58
      ? ((a += 1),
        (o = !0),
        e.enter(`tableDelimiterMarker`),
        e.consume(t),
        e.exit(`tableDelimiterMarker`),
        te)
      : t === 45
        ? ((a += 1), te(t))
        : t === null || Q(t)
          ? ie(t)
          : ae(t);
  }
  function te(t) {
    return t === 45 ? (e.enter(`tableDelimiterFiller`), ne(t)) : ae(t);
  }
  function ne(t) {
    return t === 45
      ? (e.consume(t), ne)
      : t === 58
        ? ((o = !0),
          e.exit(`tableDelimiterFiller`),
          e.enter(`tableDelimiterMarker`),
          e.consume(t),
          e.exit(`tableDelimiterMarker`),
          re)
        : (e.exit(`tableDelimiterFiller`), re(t));
  }
  function re(t) {
    return $(t) ? AU(e, ie, `whitespace`)(t) : ie(t);
  }
  function ie(n) {
    return n === 124
      ? m(n)
      : n === null || Q(n)
        ? !o || i !== a
          ? ae(n)
          : (e.exit(`tableDelimiterRow`), e.exit(`tableHead`), t(n))
        : ae(n);
  }
  function ae(e) {
    return n(e);
  }
  function oe(t) {
    return (e.enter(`tableRow`), se(t));
  }
  function se(n) {
    return n === 124
      ? (e.enter(`tableCellDivider`), e.consume(n), e.exit(`tableCellDivider`), se)
      : n === null || Q(n)
        ? (e.exit(`tableRow`), t(n))
        : $(n)
          ? AU(e, se, `whitespace`)(n)
          : (e.enter(`data`), ce(n));
  }
  function ce(t) {
    return t === null || t === 124 || yU(t)
      ? (e.exit(`data`), se(t))
      : (e.consume(t), t === 92 ? le : ce);
  }
  function le(t) {
    return t === 92 || t === 124 ? (e.consume(t), ce) : ce(t);
  }
}
function lq(e, t) {
  let n = -1,
    r = !0,
    i = 0,
    a = [0, 0, 0, 0],
    o = [0, 0, 0, 0],
    s = !1,
    c = 0,
    l,
    u,
    d,
    f = new iq();
  for (; ++n < e.length;) {
    let p = e[n],
      m = p[1];
    p[0] === `enter`
      ? m.type === `tableHead`
        ? ((s = !1),
          c !== 0 && (dq(f, t, c, l, u), (u = void 0), (c = 0)),
          (l = { type: `table`, start: Object.assign({}, m.start), end: Object.assign({}, m.end) }),
          f.add(n, 0, [[`enter`, l, t]]))
        : m.type === `tableRow` || m.type === `tableDelimiterRow`
          ? ((r = !0),
            (d = void 0),
            (a = [0, 0, 0, 0]),
            (o = [0, n + 1, 0, 0]),
            s &&
              ((s = !1),
              (u = {
                type: `tableBody`,
                start: Object.assign({}, m.start),
                end: Object.assign({}, m.end),
              }),
              f.add(n, 0, [[`enter`, u, t]])),
            (i = m.type === `tableDelimiterRow` ? 2 : u ? 3 : 1))
          : i &&
              (m.type === `data` ||
                m.type === `tableDelimiterMarker` ||
                m.type === `tableDelimiterFiller`)
            ? ((r = !1),
              o[2] === 0 &&
                (a[1] !== 0 && ((o[0] = o[1]), (d = uq(f, t, a, i, void 0, d)), (a = [0, 0, 0, 0])),
                (o[2] = n)))
            : m.type === `tableCellDivider` &&
              (r
                ? (r = !1)
                : (a[1] !== 0 && ((o[0] = o[1]), (d = uq(f, t, a, i, void 0, d))),
                  (a = o),
                  (o = [a[1], n, 0, 0])))
      : m.type === `tableHead`
        ? ((s = !0), (c = n))
        : m.type === `tableRow` || m.type === `tableDelimiterRow`
          ? ((c = n),
            a[1] === 0
              ? o[1] !== 0 && (d = uq(f, t, o, i, n, d))
              : ((o[0] = o[1]), (d = uq(f, t, a, i, n, d))),
            (i = 0))
          : i &&
            (m.type === `data` ||
              m.type === `tableDelimiterMarker` ||
              m.type === `tableDelimiterFiller`) &&
            (o[3] = n);
  }
  for (c !== 0 && dq(f, t, c, l, u), f.consume(t.events), n = -1; ++n < t.events.length;) {
    let e = t.events[n];
    e[0] === `enter` && e[1].type === `table` && (e[1]._align = oq(t.events, n));
  }
  return e;
}
function uq(e, t, n, r, i, a) {
  let o = r === 1 ? `tableHeader` : r === 2 ? `tableDelimiter` : `tableData`;
  n[0] !== 0 && ((a.end = Object.assign({}, fq(t.events, n[0]))), e.add(n[0], 0, [[`exit`, a, t]]));
  let s = fq(t.events, n[1]);
  if (
    ((a = { type: o, start: Object.assign({}, s), end: Object.assign({}, s) }),
    e.add(n[1], 0, [[`enter`, a, t]]),
    n[2] !== 0)
  ) {
    let i = fq(t.events, n[2]),
      a = fq(t.events, n[3]),
      o = { type: `tableContent`, start: Object.assign({}, i), end: Object.assign({}, a) };
    if ((e.add(n[2], 0, [[`enter`, o, t]]), r !== 2)) {
      let r = t.events[n[2]],
        i = t.events[n[3]];
      if (
        ((r[1].end = Object.assign({}, i[1].end)),
        (r[1].type = `chunkText`),
        (r[1].contentType = `text`),
        n[3] > n[2] + 1)
      ) {
        let t = n[2] + 1,
          r = n[3] - n[2] - 1;
        e.add(t, r, []);
      }
    }
    e.add(n[3] + 1, 0, [[`exit`, o, t]]);
  }
  return (
    i !== void 0 &&
      ((a.end = Object.assign({}, fq(t.events, i))), e.add(i, 0, [[`exit`, a, t]]), (a = void 0)),
    a
  );
}
function dq(e, t, n, r, i) {
  let a = [],
    o = fq(t.events, n);
  (i && ((i.end = Object.assign({}, o)), a.push([`exit`, i, t])),
    (r.end = Object.assign({}, o)),
    a.push([`exit`, r, t]),
    e.add(n + 1, 0, a));
}
function fq(e, t) {
  let n = e[t],
    r = n[0] === `enter` ? `start` : `end`;
  return n[1][r];
}
function pq() {
  return (pq = e(() => {
    (jU(), kU(), aq());
  }))();
}
function mq(e, t = !0) {
  let n = [],
    r = 0;
  for (; r < e.length;) {
    let i = e.indexOf(`<`, r);
    if (i === -1) break;
    let a = hq(e, i, t);
    if (a.kind === `tag`) {
      (n.push(a.tag), (r = a.tag.index + a.tag.text.length));
      continue;
    }
    if (a.kind === `pending`) return { tags: n, pendingStart: i };
    r = a.next;
  }
  return { tags: n };
}
function hq(e, t, n) {
  let r = _q(e, t + 1),
    i = !1;
  e.charAt(r) === `/` && ((i = !0), (r = _q(e, r + 1)));
  let a = r;
  for (; r < e.length && yq(e.charCodeAt(r));) r += 1;
  let o = e.slice(a, r).toLowerCase();
  if (!o) return r === e.length && !n ? { kind: `pending` } : gq(e, t);
  if (!Eq.has(o)) {
    let i = Tq.some((e) => e.startsWith(o));
    return r === e.length && !n && i ? { kind: `pending` } : gq(e, t);
  }
  if (r === e.length) return n ? gq(e, t) : { kind: `pending` };
  let s = e.charAt(r);
  if (!vq(s) && s !== `/` && s !== `>`) return gq(e, t);
  let c,
    l = ``;
  for (; r < e.length; r += 1) {
    let n = e.charAt(r);
    if (c) {
      n === c && (c = void 0);
      continue;
    }
    if (n === `"` || n === `'`) {
      c = n;
      continue;
    }
    if (n === `<`) return gq(e, t);
    if (n === `>`) {
      let n = r + 1;
      return {
        kind: `tag`,
        tag: {
          index: t,
          text: e.slice(t, n),
          isClose: i,
          isSelfClosing: !i && l === `/`,
          isPrivate: o === `internal`,
        },
      };
    }
    vq(n) || (l = n);
  }
  return n ? gq(e, t) : { kind: `pending` };
}
function gq(e, t) {
  let n = e.indexOf(`<`, t + 1);
  return { kind: `invalid`, next: n === -1 ? e.length : n };
}
function _q(e, t) {
  let n = t;
  for (; n < e.length && vq(e.charAt(n));) n += 1;
  return n;
}
function vq(e) {
  return /\s/u.test(e);
}
function yq(e) {
  return (e >= 48 && e <= 57) || (e >= 65 && e <= 90) || (e >= 97 && e <= 122) || e === 58;
}
function bq(e) {
  if (!e) return { codeSpans: [], retainStart: 0 };
  let t = BK(e, { extensions: [Dq, sq()], mdastExtensions: [JK()] }),
    n = [],
    r = [t];
  for (; r.length > 0;) {
    let e = r.pop();
    if (!e) continue;
    if (e.type === `code` || e.type === `inlineCode`) {
      let t = e.position?.start?.offset,
        r = e.position?.end?.offset;
      t !== void 0 && r !== void 0 && n.push([t, r]);
    }
    let t = e.children ?? [];
    for (let e = t.length - 1; e >= 0; --e) {
      let n = t[e];
      n && r.push(n);
    }
  }
  let i = t.children ?? [];
  return {
    codeSpans: n.toSorted((e, t) => e[0] - t[0]),
    retainStart: i.at(-1)?.position?.start?.offset ?? e.length,
  };
}
function xq(e) {
  return bq(e).codeSpans;
}
function Sq(e, t) {
  let n = 0,
    r = t.length - 1;
  for (; n <= r;) {
    let i = Math.floor((n + r) / 2),
      a = t[i];
    if (!a) return !1;
    if (e < a[0]) r = i - 1;
    else if (e >= a[1]) n = i + 1;
    else return !0;
  }
  return !1;
}
function Cq(e, t, n, r) {
  let i = [],
    a = (e, t) => {
      if (!t) return;
      let r = i.at(-1);
      (r?.kind === e ? (r.text += t) : i.push({ kind: e, text: t }),
        e === `text` && t.trim() && (n.visibleEver = !0));
    },
    o = (e) => {
      e &&
        (n.depth > 0 && n.pending
          ? ((n.pending.content += e),
            (n.pending.protectedClose ||= mq(e).tags.some((e) => e.isClose)))
          : a(`text`, e));
    },
    s = r.start ?? 0,
    c = mq(e.slice(s), r.final),
    l = [];
  for (let e of c.tags) {
    let n = {
      index: e.index + s,
      isClose: e.isClose,
      isSelfClosing: e.isSelfClosing,
      isPrivate: e.isPrivate,
      text: e.text,
    };
    Sq(n.index, t) || l.push(n);
  }
  let u = [];
  if (r.scope === `leading`) {
    let e = !1;
    for (let t = l.length - 1; t >= 0; --t)
      ((e ||= l[t]?.isPrivate === !0), (u[t] = e), (e ||= l[t]?.isClose === !0));
  }
  let d = s;
  for (let t = 0; t < l.length; t += 1) {
    let s = l[t];
    if (!s) continue;
    let c = e.slice(d, s.index);
    o(c);
    let f = s.index + s.text.length;
    if (s.isSelfClosing) {
      if (n.depth === 0 && r.scope === `leading` && n.visibleEver) {
        (a(`text`, e.slice(s.index)), (d = e.length));
        break;
      }
      d = f;
      continue;
    }
    if (!s.isClose) {
      if (n.depth === 0 && r.scope === `leading` && n.visibleEver && !u[t]) {
        (a(`text`, e.slice(s.index)), (d = e.length));
        break;
      }
      (n.depth === 0
        ? (n.pending = {
            content: ``,
            containsPrivate: s.isPrivate,
            openTag: s.text,
            protectedClose: !1,
            visibleBefore: n.visibleEver,
          })
        : n.pending && (n.pending.containsPrivate ||= s.isPrivate),
        (n.depth += 1),
        (d = f));
      continue;
    }
    if (n.depth > 0) {
      (--n.depth,
        n.depth === 0 && n.pending
          ? (n.pending.containsPrivate || a(`thinking`, n.pending.content), (n.pending = void 0))
          : n.pending && (n.pending.protectedClose = !0),
        (d = f));
      continue;
    }
    if (r.mode === `visible`) o(s.text);
    else {
      let t = e.slice(f);
      if (c.trim() && t.trim()) {
        let e = i.filter((e) => e.kind === `thinking`);
        (i.splice(0, i.length, ...e), (n.visibleEver = !1));
      }
    }
    d = f;
  }
  if ((o(e.slice(d)), r.final && n.depth > 0 && n.pending)) {
    let e = n.pending;
    (e.containsPrivate ||
      (r.mode === `static-preserve` ||
      (r.mode === `static-strict` && !e.visibleBefore && !e.protectedClose) ||
      (r.mode === `visible` && !e.protectedClose)
        ? a(`text`, r.mode === `visible` && e.visibleBefore ? e.openTag + e.content : e.content)
        : a(`thinking`, e.content)),
      (n.depth = 0),
      (n.pending = void 0));
  }
  return i;
}
function wq(e, t) {
  return Cq(
    e,
    xq(e),
    { depth: 0, visibleEver: !1 },
    {
      final: !0,
      mode: t.mode === `preserve` ? `static-preserve` : `static-strict`,
      scope: t.scope,
    },
  )
    .filter((e) => e.kind === `text`)
    .map((e) => e.text)
    .join(``);
}
var Tq, Eq, Dq;
function Oq() {
  return (Oq = e(() => {
    (qK(),
      nq(),
      pq(),
      (Tq = [
        `think`,
        `thinking`,
        `thought`,
        `reasoning`,
        `internal`,
        `antthinking`,
        `antml:think`,
        `antml:thinking`,
        `antml:thought`,
        `antml:reasoning`,
        `mm:think`,
        `mm:thinking`,
        `mm:thought`,
        `mm:reasoning`,
      ]),
      (Eq = new Set(Tq)),
      (Dq = { disable: { null: [`htmlFlow`, `htmlText`] } }));
  }))();
}
function kq() {
  return (kq = e(() => {
    Oq();
  }))();
}
function Aq(e) {
  if (e) {
    if (e.startsWith(`image/`)) return `image`;
    if (e.startsWith(`audio/`)) return `audio`;
    if (e.startsWith(`video/`)) return `video`;
    if (e === `application/pdf` || e.startsWith(`text/`) || e.startsWith(`application/`))
      return `document`;
  }
}
function jq() {
  return (jq = e(() => {}))();
}
function Mq() {
  return (Mq = e(() => {
    at();
  }))();
}
function Nq() {
  let e = {};
  for (let [t, n] of Object.entries(Iq)) e[n] ??= t;
  return e;
}
function Pq(e) {
  if (!e) return;
  let t = e.split(`;`)[0]?.trim().toLowerCase();
  if (t) return Lq[t] ?? t;
}
function Fq(e) {
  return Aq(Pq(e));
}
var Iq, Lq;
function Rq() {
  return (Rq = e(() => {
    (at(),
      jq(),
      Mq(),
      (Iq = {
        "image/avif": `.avif`,
        "image/heic": `.heic`,
        "image/heic-sequence": `.heic`,
        "image/heif": `.heif`,
        "image/heif-sequence": `.heif`,
        "image/bmp": `.bmp`,
        "image/jpg": `.jpg`,
        "image/jpeg": `.jpg`,
        "image/png": `.png`,
        "image/svg+xml": `.svg`,
        "image/webp": `.webp`,
        "image/gif": `.gif`,
        "audio/aiff": `.aiff`,
        "audio/x-aiff": `.aiff`,
        "audio/ogg": `.ogg`,
        "audio/mpeg": `.mp3`,
        "audio/mp3": `.mp3`,
        "audio/wav": `.wav`,
        "audio/wave": `.wav`,
        "audio/x-wav": `.wav`,
        "audio/flac": `.flac`,
        "audio/aac": `.aac`,
        "audio/amr": `.amr`,
        "audio/opus": `.opus`,
        "audio/webm": `.webm`,
        "audio/x-m4a": `.m4a`,
        "audio/m4a": `.m4a`,
        "audio/mp4": `.m4a`,
        "audio/x-caf": `.caf`,
        "video/x-msvideo": `.avi`,
        "video/x-m4v": `.m4v`,
        "video/mp4": `.mp4`,
        "video/x-matroska": `.mkv`,
        "video/webm": `.webm`,
        "video/x-flv": `.flv`,
        "video/x-ms-wmv": `.wmv`,
        "video/quicktime": `.mov`,
        "application/pdf": `.pdf`,
        "application/json": `.json`,
        "application/yaml": `.yaml`,
        "application/zip": `.zip`,
        "application/gzip": `.gz`,
        "application/x-tar": `.tar`,
        "application/x-7z-compressed": `.7z`,
        "application/vnd.rar": `.rar`,
        "application/msword": `.doc`,
        "application/vnd.ms-excel": `.xls`,
        "application/vnd.ms-powerpoint": `.ppt`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": `.docx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": `.xlsx`,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": `.pptx`,
        "text/csv": `.csv`,
        "text/plain": `.txt`,
        "text/markdown": `.md`,
        "text/html": `.html`,
        "text/xml": `.xml`,
        "text/css": `.css`,
        "application/xml": `.xml`,
      }),
      { ...Nq() },
      (Lq = {
        "image/apng": `image/png`,
        "text/yaml": `application/yaml`,
        "application/x-yaml": `application/yaml`,
        "application/xml": `text/xml`,
      }));
  }))();
}
var zq, Bq, Vq, Hq, Uq, Wq, Gq, Kq, qq, Jq, Yq;
function Xq() {
  return (Xq = e(() => {
    (_L(),
      vL(),
      BL(),
      (zq = B([
        I(`queued`),
        I(`running`),
        I(`completed`),
        I(`failed`),
        I(`cancelled`),
        I(`timed_out`),
      ])),
      (Bq = B([z(), F({ minimum: 0 })])),
      (Vq = B([
        I(`pending`),
        I(`delivered`),
        I(`session_queued`),
        I(`failed`),
        I(`dismissed`),
        I(`parent_missing`),
        I(`not_applicable`),
      ])),
      (Hq = B([I(`succeeded`), I(`blocked`)])),
      (Uq = oR(
        `2026.8`,
        X({ files: F({ minimum: 0 }), added: F({ minimum: 0 }), removed: F({ minimum: 0 }) }),
      )),
      (Wq = X({
        id: Z,
        kind: j(z()),
        runtime: j(z()),
        status: zq,
        title: j(z()),
        agentId: j(z()),
        sessionKey: j(z()),
        childSessionKey: j(z()),
        ownerKey: j(z()),
        runId: j(z()),
        taskId: j(z()),
        flowId: j(z()),
        parentTaskId: j(z()),
        sourceId: j(z()),
        createdAt: j(Bq),
        updatedAt: j(Bq),
        startedAt: j(Bq),
        endedAt: j(Bq),
        toolUseCount: j(F({ minimum: 0 })),
        lastToolName: j(z()),
        lastActivity: j(oR(`2026.8`, z({ maxLength: 200 }))),
        diffStat: j(Uq),
        progressSummary: j(z()),
        terminalSummary: j(z()),
        error: j(z()),
        deliveryStatus: j(Vq),
        terminalOutcome: j(Hq),
        result: j(z()),
        prompt: j(z()),
      })),
      X({
        status: j(B([zq, A(zq)])),
        agentId: j(Z),
        sessionKey: j(Z),
        limit: j(F({ minimum: 1, maximum: 500 })),
        cursor: j(z()),
      }),
      (Gq = X({ tasks: A(Wq), nextCursor: j(z()) })),
      X({ taskId: Z }),
      (Kq = X({ task: Wq, toolMessages: j(A(N(), { maxItems: 200 })) })),
      X({ taskId: Z, reason: j(z()) }),
      (qq = X({ found: P(), cancelled: P(), reason: j(z()), task: j(Wq) })),
      X({ taskIds: A(Z, { minItems: 1, maxItems: 10 }) }),
      (Jq = X({ taskId: Z, ok: P(), reason: j(z()), duplicateRisk: j(P()), task: j(Wq) })),
      (Yq = X({ results: A(Jq, { maxItems: 10 }) })));
  }))();
}
var Zq, Qq, $q, eJ;
function tJ() {
  return (tJ = e(() => {
    (nt(),
      (Zq = { INITIAL: 0, PENDING: 1, COMPLETE: 2, ERROR: 3 }),
      (Qq = Symbol()),
      ($q = class {
        get taskComplete() {
          return (
            (this.t ||=
              this.i === 1
                ? new Promise((e, t) => {
                    ((this.o = e), (this.h = t));
                  })
                : this.i === 3
                  ? Promise.reject(this.l)
                  : Promise.resolve(this.u)),
            this.t
          );
        }
        constructor(e, t, n) {
          ((this.p = 0), (this.i = 0), (this._ = e).addController(this));
          let r = typeof t == `object` ? t : { task: t, args: n };
          ((this.v = r.task),
            (this.j = r.args),
            (this.m = r.argsEqual ?? eJ),
            (this.k = r.onComplete),
            (this.A = r.onError),
            (this.autoRun = r.autoRun ?? !0),
            `initialValue` in r &&
              ((this.u = r.initialValue), (this.i = 2), (this.O = this.T?.())));
        }
        hostUpdate() {
          !0 === this.autoRun && this.S();
        }
        hostUpdated() {
          this.autoRun === `afterUpdate` && this.S();
        }
        T() {
          if (this.j === void 0) return;
          let e = this.j();
          if (!Array.isArray(e)) throw Error(`The args function must return an array`);
          return e;
        }
        async S() {
          let e = this.T(),
            t = this.O;
          ((this.O = e),
            e === t || e === void 0 || (t !== void 0 && this.m(t, e)) || (await this.run(e)));
        }
        async run(e) {
          let t, n;
          ((e ??= this.T()),
            (this.O = e),
            this.i === 1
              ? this.q?.abort()
              : ((this.t = void 0), (this.o = void 0), (this.h = void 0)),
            (this.i = 1),
            this.autoRun === `afterUpdate`
              ? queueMicrotask(() => this._.requestUpdate())
              : this._.requestUpdate());
          let r = ++this.p;
          this.q = new AbortController();
          let i = !1;
          try {
            t = await this.v(e, { signal: this.q.signal });
          } catch (e) {
            ((i = !0), (n = e));
          }
          if (this.p === r) {
            if (t === Qq) this.i = 0;
            else {
              if (!1 === i) {
                try {
                  this.k?.(t);
                } catch {}
                ((this.i = 2), this.o?.(t));
              } else {
                try {
                  this.A?.(n);
                } catch {}
                ((this.i = 3), this.h?.(n));
              }
              ((this.u = t), (this.l = n));
            }
            this._.requestUpdate();
          }
        }
        abort(e) {
          this.i === 1 && this.q?.abort(e);
        }
        get value() {
          return this.u;
        }
        get error() {
          return this.l;
        }
        get status() {
          return this.i;
        }
        render(e) {
          switch (this.i) {
            case 0:
              return e.initial?.();
            case 1:
              return e.pending?.();
            case 2:
              return e.complete?.(this.value);
            case 3:
              return e.error?.(this.error);
            default:
              throw Error(`Unexpected status: ` + this.i);
          }
        }
      }),
      (eJ = (e, t) => e === t || (e.length === t.length && e.every((e, n) => !et(e, t[n])))));
  }))();
}
function nJ() {
  return (nJ = e(() => {
    tJ();
  }))();
}
function rJ(e) {
  return ne(e);
}
function iJ() {
  return (iJ = e(() => {}))();
}
function aJ(e) {
  let t = be(e);
  if (!t) return;
  let n = c(t.ruleId),
    r = c(t.message),
    i = t.severity;
  if (!n || !r || (i !== `info` && i !== `warn` && i !== `critical`)) return;
  let a = c(t.file),
    o = c(t.evidence),
    s = t.line;
  if (
    !(
      (t.file !== void 0 && !a) ||
      (t.evidence !== void 0 && !o) ||
      (s !== void 0 && (typeof s != `number` || !Number.isSafeInteger(s) || s <= 0))
    )
  )
    return {
      ruleId: n,
      severity: i,
      message: r,
      ...(a ? { file: a } : {}),
      ...(s === void 0 ? {} : { line: s }),
      ...(o ? { evidence: o } : {}),
    };
}
function oJ(e) {
  let t = be(e);
  if (!t) return;
  let n = c(t.targetName),
    r = c(t.reason),
    i = t.targetType,
    a = t.requestMode;
  if (
    t.installPolicyCode !== `install_policy_warning_acknowledgement_required` ||
    !n ||
    !r ||
    (i !== `skill` && i !== `plugin`) ||
    (a !== `install` && a !== `update`)
  )
    return;
  let o;
  if (t.findings !== void 0) {
    if (!Array.isArray(t.findings)) return;
    o = [];
    for (let e of t.findings) {
      let t = aJ(e);
      if (!t) return;
      o.push(t);
    }
  }
  return {
    installPolicyCode: sJ,
    targetName: n,
    targetType: i,
    requestMode: a,
    reason: r,
    ...(o ? { findings: o } : {}),
  };
}
var sJ;
function cJ() {
  return (cJ = e(() => {
    sJ = `install_policy_warning_acknowledgement_required`;
  }))();
}
function lJ(e) {
  if (!Se(e)) return;
  let t = e.code;
  return t === dJ.INFERENCE_UNAVAILABLE ? { code: t } : void 0;
}
function uJ(e) {
  if (!Se(e)) return;
  let t = e.code;
  return t === dJ.SESSION_INVALIDATED ? { code: t } : void 0;
}
var dJ;
function fJ() {
  return (fJ = e(() => {
    dJ = {
      INFERENCE_UNAVAILABLE: `system_agent_inference_unavailable`,
      SESSION_INVALIDATED: `system_agent_session_invalidated`,
    };
  }))();
}
function pJ() {
  return (pJ = e(() => {
    sh();
  }))();
}
var mJ;
function hJ() {
  return (hJ = e(() => {
    (cf(),
      hL(),
      sh(),
      (mJ = class {
        constructor(e, t) {
          ((this.hasCodec = HF(e, t)),
            (this.buildResult = Km(e, t)),
            (this.evaluateResult = this.buildResult.Evaluate()));
        }
        IsAccelerated() {
          return this.evaluateResult.IsAccelerated();
        }
        Context() {
          return this.buildResult.Context();
        }
        Type() {
          return this.buildResult.Schema();
        }
        Code() {
          return this.evaluateResult.Code();
        }
        Check(e) {
          return this.evaluateResult.Check(e);
        }
        Parse(e) {
          if (this.Check(e)) return e;
          if (of().correctiveParse) return GI(this.Context(), this.Type(), e);
          throw new WI(e, this.Errors(e));
        }
        Errors(e) {
          return this.IsAccelerated() && this.Check(e) ? [] : dh(this.Context(), this.Type(), e);
        }
        Clean(e) {
          return CM(this.Context(), this.Type(), e);
        }
        Convert(e) {
          return uP(this.Context(), this.Type(), e);
        }
        Create() {
          return II(this.Context(), this.Type());
        }
        Default(e) {
          return NP(this.Context(), this.Type(), e);
        }
        Decode(e) {
          return this.hasCodec ? CF(this.Context(), this.Type(), e) : this.Parse(e);
        }
        Encode(e) {
          return this.hasCodec ? kF(this.Context(), this.Type(), e) : this.Parse(e);
        }
      }));
  }))();
}
function gJ(...e) {
  let [t, n] = an(e, { 2: (e, t) => [e, t], 1: (e) => [{}, e] });
  return new mJ(t, n);
}
function _J() {
  return (_J = e(() => {
    hJ();
  }))();
}
function vJ() {
  return (vJ = e(() => {
    (pJ(), _J(), hJ());
  }))();
}
function yJ(e, t) {
  let n,
    r = null,
    i = () => ((n ??= gJ(e)), n),
    a = (e) => {
      let n = t?.(e);
      if (n) return ((r = [n]), !1);
      let a = i(),
        o = a.Check(e);
      return ((r = o ? null : [...a.Errors(e)]), o);
    };
  return (
    Object.defineProperties(a, {
      errors: {
        configurable: !0,
        enumerable: !0,
        get: () => r,
        set: (e) => {
          r = e ?? null;
        },
      },
      schema: { configurable: !0, enumerable: !0, get: () => e },
    }),
    a
  );
}
function bJ() {
  return (bJ = e(() => {
    vJ();
  }))();
}
var xJ;
function SJ() {
  return (SJ = e(() => {
    xJ = `^(?!\\.{1,2}$)(?:[^\\uD800-\\uDFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF])+$`;
  }))();
}
var CJ,
  wJ,
  TJ,
  EJ,
  DJ,
  OJ,
  kJ,
  AJ,
  jJ,
  MJ,
  NJ,
  PJ,
  FJ,
  IJ,
  LJ,
  RJ,
  zJ,
  BJ,
  VJ,
  HJ,
  UJ,
  WJ,
  GJ,
  KJ,
  qJ,
  JJ,
  YJ,
  XJ,
  ZJ,
  QJ,
  $J,
  eY,
  tY;
function nY() {
  return (nY = e(() => {
    (_L(),
      SJ(),
      vL(),
      BL(),
      (CJ = z({
        minLength: 1,
        pattern: xJ,
        description: `Exact full approval id encoded safely in deep-link paths.`,
      })),
      (wJ = B([I(`exec`), I(`plugin`), I(`system-agent`)])),
      (TJ = B([I(`allow-once`), I(`allow-always`), I(`deny`)])),
      (EJ = B([I(`allow-once`), I(`allow-always`)])),
      B([
        I(`user`),
        I(`timeout`),
        I(`malformed-verdict`),
        I(`no-route`),
        I(`run-aborted`),
        I(`gateway-restart`),
        I(`storage-corrupt`),
      ]),
      (DJ = B([I(`user`)])),
      (OJ = B([I(`user`), I(`malformed-verdict`), I(`no-route`), I(`storage-corrupt`)])),
      (kJ = B([I(`timeout`)])),
      (AJ = B([I(`run-aborted`), I(`gateway-restart`)])),
      (jJ = B([I(`info`), I(`warning`), I(`critical`)])),
      (MJ = A(TJ, {
        minItems: 1,
        maxItems: 3,
        uniqueItems: !0,
        contains: I(`deny`),
        description: `Available reviewer decisions. Deny is always available so malformed or unsafe input can fail closed.`,
      })),
      (NJ = Sv([I(`allow-once`), I(`deny`)])),
      (PJ = M(
        {
          kind: I(`exec`),
          commandText: Z,
          commandPreview: j(B([z(), L()])),
          warningText: j(B([z(), L()])),
          host: j(B([z(), L()])),
          nodeId: j(B([Z, L()])),
          agentId: j(B([Z, L()])),
          allowedDecisions: MJ,
        },
        {
          additionalProperties: !1,
          description: `Reviewer-safe exec presentation. Runtime cwd, environment, system-run binding, and execution plan are intentionally excluded.`,
        },
      )),
      (FJ = X({
        kind: I(`plugin`),
        title: z({ minLength: 1, maxLength: 80 }),
        description: z({ minLength: 1, maxLength: 512 }),
        detail: j(z({ minLength: 1, maxLength: 16384 })),
        severity: jJ,
        pluginId: j(B([Z, L()])),
        toolName: j(B([Z, L()])),
        agentId: j(B([Z, L()])),
        allowedDecisions: MJ,
      })),
      (IJ = X({
        kind: I(`system-agent`),
        title: z({ minLength: 1, maxLength: 80 }),
        description: z({ minLength: 1, maxLength: 512 }),
        proposalHash: z({ pattern: `^[a-f0-9]{64}$` }),
        agentId: j(B([Z, L()])),
        allowedDecisions: NJ,
      })),
      (LJ = B([PJ, FJ, IJ])),
      (RJ = {
        id: CJ,
        urlPath: Z,
        createdAtMs: F({ minimum: 0 }),
        expiresAtMs: F({ minimum: 0 }),
        presentation: LJ,
      }),
      (zJ = X({ agentId: j(Z), sessionKey: j(Z) })),
      (BJ = X({ kind: B([I(`device`), I(`channel`), I(`runtime`), I(`system`)]), id: j(Z) })),
      (VJ = { resolvedAtMs: F({ minimum: 0 }), source: j(zJ), resolver: j(BJ) }),
      (HJ = X({ ...RJ, status: I(`pending`) })),
      (UJ = X({ ...RJ, ...VJ, status: I(`allowed`), decision: EJ, reason: DJ })),
      (WJ = X({ ...RJ, ...VJ, status: I(`denied`), decision: I(`deny`), reason: OJ })),
      (GJ = X({ ...RJ, ...VJ, status: I(`expired`), reason: kJ })),
      (KJ = X({ ...RJ, ...VJ, status: I(`cancelled`), reason: AJ })),
      (qJ = B([HJ, UJ, WJ, GJ, KJ])),
      (JJ = B([UJ, WJ, GJ, KJ])),
      X({ id: RJ.id }),
      (YJ = X({ approval: qJ })),
      X({
        cursor: j(z({ minLength: 1, maxLength: 512 })),
        limit: j(F({ minimum: 1, maximum: 100 })),
        kind: j(wJ),
      }),
      (XJ = X({ items: A(JJ), nextCursor: j(z({ minLength: 1, maxLength: 512 })) })),
      (ZJ = X({ channel: Z, accountId: Z, senderId: Z })),
      X({ id: RJ.id, kind: wJ, decision: TJ, reviewer: j(ZJ) }),
      (QJ = X({ applied: P(), approval: JJ })),
      ($J = { sessionKey: Z, sourceSessionKey: j(Z), updatedAtMs: F({ minimum: 0 }) }),
      (eY = oR(`2026.7`, X({ ...$J, phase: I(`pending`), approval: HJ }))),
      (tY = oR(`2026.7`, X({ ...$J, phase: I(`terminal`), approval: JJ }))),
      oR(`2026.7`, B([eY, tY])),
      oR(
        `2026.7`,
        X({ sessionKey: Z, updatedAtMs: F({ minimum: 0 }), approvals: A(HJ), truncated: P() }),
      ));
  }))();
}
var rY, iY, aY;
function oY() {
  return (oY = e(() => {
    (bJ(), nY(), (rY = yJ(YJ)), (iY = yJ(XJ)), (aY = yJ(QJ)));
  }))();
}
var sY, cY, lY, uY, dY, fY, pY, mY, hY, gY;
function _Y() {
  return (_Y = e(() => {
    (_L(),
      vL(),
      BL(),
      (sY = `git.coauthor.enabled`),
      (cY = z({ minLength: 1, maxLength: 128 })),
      (lY = z({ maxLength: 256 })),
      (uY = z({ minLength: 1, maxLength: 128, pattern: `\\S` })),
      (dY = z({ pattern: `^.{1,256}$` })),
      (fY = Ky(dY, N())),
      (pY = Ky(dY, N(), { maxProperties: 32 })),
      (mY = B([I(`image/png`), I(`image/jpeg`), I(`image/webp`)])),
      (hY = X({ login: z({ minLength: 1, maxLength: 39 }), profileUrl: Z, avatarUrl: Z })),
      (gY = X({
        id: cY,
        displayName: B([lY, L()]),
        avatarMime: B([mY, L()]),
        mergedInto: B([cY, L()]),
        createdAt: F({ minimum: 0 }),
        updatedAt: F({ minimum: 0 }),
        emails: A(Z),
        githubIdentity: B([hY, L()]),
        hasAvatar: P(),
        role: j(uY),
      })),
      X({}),
      X({ profiles: A(gY) }),
      X({}),
      X({ profile: gY }),
      X({ email: z({ minLength: 1, maxLength: 320 }), targetProfileId: cY }),
      X({ profile: gY }),
      X({ profileId: cY, displayName: B([lY, L()]) }),
      X({ profile: gY }),
      X({ profileId: cY, role: B([uY, L()]) }),
      X({ profile: gY }),
      X({ profileId: cY, mime: mY, avatarBase64: z({ minLength: 1, maxLength: 7e5 }) }),
      X({ profile: gY, avatarRevision: Z }),
      X({ keys: j(A(dY, { maxItems: 32, uniqueItems: !0 })) }),
      B([X({ status: I(`ok`), entries: fY }), X({ status: I(`no_durable_identity`) })]),
      X({ entries: pY }),
      B([X({ status: I(`ok`) }), X({ status: I(`no_durable_identity`) })]));
  }))();
}
function vY(e) {
  let t = [`th`, `en`].join(``);
  return Object.fromEntries([[t, { required: e }]]);
}
var yY,
  bY,
  xY,
  SY,
  CY,
  wY,
  TY,
  EY,
  DY,
  OY,
  kY,
  AY,
  jY,
  MY,
  NY,
  PY,
  FY,
  IY,
  LY,
  RY,
  zY,
  BY,
  VY,
  HY,
  UY;
function WY() {
  return (WY = e(() => {
    (_L(),
      vL(),
      BL(),
      X({ enabled: P(), phase: j(z()) }),
      X({ includeSecrets: j(P()) }),
      X({
        text: Z,
        voiceId: j(z()),
        modelId: j(z()),
        outputFormat: j(z()),
        speed: j(R()),
        rateWpm: j(F({ minimum: 1 })),
        stability: j(R()),
        similarity: j(R()),
        style: j(R()),
        speakerBoost: j(P()),
        seed: j(F({ minimum: 0 })),
        normalize: j(z()),
        language: j(z()),
        latencyTier: j(F({ minimum: 0 })),
      }),
      X({ text: Z }),
      (yY = B([I(`realtime`), I(`stt-tts`), I(`transcription`)])),
      (bY = B([I(`webrtc`), I(`provider-websocket`), I(`gateway-relay`), I(`managed-room`)])),
      (xY = B([I(`agent-consult`), I(`direct-tools`), I(`none`)])),
      (SY = B([I(`status`), I(`steer`), I(`cancel`), I(`followup`)])),
      (CY = B([
        I(`session.started`),
        I(`session.ready`),
        I(`session.closed`),
        I(`session.error`),
        I(`session.replaced`),
        I(`turn.started`),
        I(`turn.ended`),
        I(`turn.cancelled`),
        I(`capture.started`),
        I(`capture.stopped`),
        I(`capture.cancelled`),
        I(`capture.once`),
        I(`input.audio.delta`),
        I(`input.audio.committed`),
        I(`transcript.delta`),
        I(`transcript.done`),
        I(`output.text.delta`),
        I(`output.text.done`),
        I(`output.audio.started`),
        I(`output.audio.delta`),
        I(`output.audio.done`),
        I(`tool.call`),
        I(`tool.progress`),
        I(`tool.result`),
        I(`tool.error`),
        I(`usage.metrics`),
        I(`latency.metrics`),
        I(`health.changed`),
      ])),
      (wY = [
        `turn.started`,
        `turn.ended`,
        `turn.cancelled`,
        `input.audio.delta`,
        `input.audio.committed`,
        `transcript.delta`,
        `transcript.done`,
        `output.text.delta`,
        `output.text.done`,
        `output.audio.started`,
        `output.audio.delta`,
        `output.audio.done`,
        `tool.call`,
        `tool.progress`,
        `tool.result`,
        `tool.error`,
      ]),
      (TY = [`capture.started`, `capture.stopped`, `capture.cancelled`, `capture.once`]),
      M(
        {
          id: Z,
          type: CY,
          sessionId: Z,
          turnId: j(z()),
          captureId: j(z()),
          seq: F({ minimum: 1 }),
          timestamp: Z,
          mode: yY,
          transport: bY,
          brain: xY,
          provider: j(z()),
          final: j(P()),
          callId: j(z()),
          itemId: j(z()),
          parentId: j(z()),
          payload: N(),
        },
        {
          additionalProperties: !1,
          allOf: [
            { if: { properties: { type: { enum: wY } }, required: [`type`] }, ...vY([`turnId`]) },
            {
              if: { properties: { type: { enum: TY } }, required: [`type`] },
              ...vY([`captureId`]),
            },
          ],
        },
      ),
      (EY = z({ pattern: `^[A-Za-z0-9_-]{1,128}$` })),
      X({
        sessionKey: j(Z),
        voiceSessionId: j(EY),
        provider: j(z()),
        model: j(z()),
        voice: j(z()),
        vadThreshold: j(R()),
        silenceDurationMs: j(F({ minimum: 1 })),
        prefixPaddingMs: j(F({ minimum: 0 })),
        reasoningEffort: j(z()),
        mode: j(yY),
        transport: j(bY),
        brain: j(xY),
        capabilities: j(
          A(B([I(`camera-frame`), I(`voice-transcript`), I(`gateway-control-v1`)]), {
            uniqueItems: !0,
          }),
        ),
      }),
      X({
        sessionKey: Z,
        voiceSessionId: j(EY),
        callId: Z,
        name: Z,
        args: j(N()),
        relaySessionId: j(Z),
      }),
      X({
        sessionKey: Z,
        voiceSessionId: EY,
        entryId: EY,
        role: B([I(`user`), I(`assistant`)]),
        text: Z,
        timestamp: j(R()),
      }),
      X({ sessionKey: Z, voiceSessionId: EY }),
      X({ ok: I(!0) }),
      X({ runId: Z, idempotencyKey: Z }),
      X({ sessionKey: Z, text: Z, mode: j(SY) }),
      X({
        ok: P(),
        mode: SY,
        sessionKey: Z,
        sessionId: j(Z),
        active: P(),
        queued: j(P()),
        aborted: j(P()),
        target: j(B([I(`embedded_run`), I(`reply_run`)])),
        reason: j(z()),
        message: z(),
        speak: P(),
        show: P(),
        suppress: P(),
        providerResult: j(X({ status: I(`cancelled`), message: z() })),
        enqueuedAtMs: j(R()),
        deliveredAtMs: j(R()),
      }),
      X({
        sessionKey: j(z()),
        spawnedBy: j(Z),
        provider: j(z()),
        model: j(z()),
        voice: j(z()),
        language: j(z({ pattern: `^[a-z]{2}$` })),
        vadThreshold: j(R()),
        silenceDurationMs: j(F({ minimum: 1 })),
        prefixPaddingMs: j(F({ minimum: 0 })),
        reasoningEffort: j(z()),
        mode: j(yY),
        transport: j(bY),
        brain: j(xY),
        ttlMs: j(F({ minimum: 1e3, maximum: 36e5 })),
      }),
      X({ sessionId: Z, audioBase64: Z, timestamp: j(R()) }),
      X({ sessionId: Z, turnId: j(z()), reason: j(z()) }),
      (DY = X({ ok: I(!0), status: j(B([I(`applied`), I(`stale`), I(`idle`)])), turnId: j(Z) })),
      X({
        sessionId: Z,
        callId: Z,
        result: N(),
        options: j(X({ suppressResponse: j(P()), willContinue: j(P()) })),
      }),
      X({ sessionId: Z, sessionKey: j(Z), text: Z, mode: j(SY) }),
      X({ sessionId: Z }),
      X({}),
      (OY = X({
        id: Z,
        label: Z,
        configured: P(),
        aliases: j(A(Z)),
        models: j(A(z())),
        voices: j(A(z())),
        defaultModel: j(z()),
        modes: j(A(yY)),
        transports: j(A(bY)),
        brains: j(A(xY)),
        inputAudioFormats: j(
          A(
            X({
              encoding: B([I(`pcm16`), I(`g711_ulaw`)]),
              sampleRateHz: F({ minimum: 1 }),
              channels: F({ minimum: 1 }),
            }),
          ),
        ),
        outputAudioFormats: j(
          A(
            X({
              encoding: B([I(`pcm16`), I(`g711_ulaw`)]),
              sampleRateHz: F({ minimum: 1 }),
              channels: F({ minimum: 1 }),
            }),
          ),
        ),
        supportsBrowserSession: j(P()),
        supportsBargeIn: j(P()),
        supportsToolCalls: j(P()),
        supportsVideoFrames: j(P()),
        supportsSessionResumption: j(P()),
      })),
      (kY = X({ ready: j(P()), activeProvider: j(z()), providers: A(OY) })),
      X({
        modes: A(yY),
        transports: A(bY),
        brains: A(xY),
        speech: kY,
        transcription: kY,
        realtime: kY,
      }),
      (AY = X({
        inputEncoding: B([I(`pcm16`), I(`g711_ulaw`)]),
        inputSampleRateHz: F({ minimum: 1 }),
        outputEncoding: B([I(`pcm16`), I(`g711_ulaw`)]),
        outputSampleRateHz: F({ minimum: 1 }),
      })),
      X({
        sessionId: Z,
        provider: j(z()),
        mode: yY,
        transport: bY,
        brain: xY,
        relaySessionId: j(Z),
        transcriptionSessionId: j(Z),
        handoffId: j(Z),
        roomId: j(Z),
        roomUrl: j(Z),
        token: j(Z),
        audio: j(N()),
        model: j(z()),
        voice: j(z()),
        expiresAt: j(R()),
      }),
      X({ ok: P() }),
      (jY = X({
        provider: Z,
        transport: I(`webrtc`),
        voiceSessionId: Z,
        clientSecret: Z,
        offerUrl: j(z()),
        offerHeaders: j(Ky(z(), z())),
        model: j(z()),
        voice: j(z()),
        expiresAt: j(R()),
        clientControl: j(X({ owner: I(`gateway`) })),
      })),
      (MY = X({
        provider: Z,
        transport: I(`provider-websocket`),
        voiceSessionId: Z,
        protocol: Z,
        clientSecret: Z,
        websocketUrl: Z,
        audio: AY,
        initialMessage: j(N()),
        model: j(z()),
        voice: j(z()),
        expiresAt: j(R()),
      })),
      (NY = X({
        provider: Z,
        transport: I(`gateway-relay`),
        voiceSessionId: j(Z),
        relaySessionId: Z,
        audio: AY,
        model: j(z()),
        voice: j(z()),
        expiresAt: j(R()),
      })),
      (PY = X({
        provider: Z,
        transport: I(`managed-room`),
        voiceSessionId: j(Z),
        roomUrl: Z,
        token: j(z()),
        model: j(z()),
        voice: j(z()),
        expiresAt: j(R()),
      })),
      B([jY, MY, NY, PY]),
      (FY = { apiKey: j(zL) }),
      (IY = M(FY, { additionalProperties: !0 })),
      (LY = X({
        provider: j(z()),
        providers: j(Ky(z(), IY)),
        model: j(z()),
        speakerVoice: j(z()),
        speakerVoiceId: j(z()),
        voice: j(z()),
        instructions: j(z()),
        mode: j(yY),
        transport: j(bY),
        vadThreshold: j(R({ minimum: 0, maximum: 1 })),
        silenceDurationMs: j(F({ minimum: 1 })),
        prefixPaddingMs: j(F({ minimum: 0 })),
        reasoningEffort: j(z({ minLength: 1 })),
        brain: j(xY),
        consultRouting: j(B([I(`provider-direct`), I(`force-agent-consult`)])),
      })),
      (RY = X({ provider: z(), config: IY })),
      (zY = X({
        provider: j(z()),
        providers: j(Ky(z(), IY)),
        realtime: j(LY),
        resolved: j(RY),
        consultThinkingLevel: j(z()),
        consultFastMode: j(P()),
        speechLocale: j(z()),
        interruptOnSpeech: j(P()),
        silenceTimeoutMs: j(F({ minimum: 1 })),
      })),
      X({
        config: X({
          talk: j(zY),
          session: j(X({ mainKey: j(z()) })),
          ui: j(X({ seamColor: j(z()) })),
        }),
      }),
      X({
        audioBase64: Z,
        provider: Z,
        outputFormat: j(z()),
        voiceCompatible: j(P()),
        mimeType: j(z()),
        fileExtension: j(z()),
      }),
      X({
        audioBase64: Z,
        provider: Z,
        outputFormat: j(z()),
        mimeType: j(z()),
        fileExtension: j(z()),
      }),
      X({ probe: j(P()), timeoutMs: j(F({ minimum: 0 })), channel: j(Z) }),
      (BY = M(
        {
          accountId: Z,
          name: j(z()),
          enabled: j(P()),
          configured: j(P()),
          linked: j(P()),
          running: j(P()),
          connected: j(P()),
          reconnectAttempts: j(F({ minimum: 0 })),
          lastConnectedAt: j(B([F({ minimum: 0 }), L()])),
          lastError: j(B([z(), L()])),
          healthState: j(z()),
          lastStartAt: j(B([F({ minimum: 0 }), L()])),
          lastStopAt: j(B([F({ minimum: 0 }), L()])),
          lastInboundAt: j(B([F({ minimum: 0 }), L()])),
          lastOutboundAt: j(B([F({ minimum: 0 }), L()])),
          lastTransportActivityAt: j(B([F({ minimum: 0 }), L()])),
          busy: j(P()),
          activeRuns: j(F({ minimum: 0 })),
          lastRunActivityAt: j(B([F({ minimum: 0 }), L()])),
          activeRunStartedAt: j(B([F({ minimum: 0 }), L()])),
          lastProbeAt: j(B([F({ minimum: 0 }), L()])),
          mode: j(z()),
          dmPolicy: j(z()),
          allowFrom: j(A(z())),
          tokenSource: j(z()),
          botTokenSource: j(z()),
          appTokenSource: j(z()),
          credentialSource: j(B([z(), L()])),
          audienceType: j(B([z(), L()])),
          audience: j(B([z(), L()])),
          webhookPath: j(B([z(), L()])),
          webhookUrl: j(B([z(), L()])),
          baseUrl: j(z()),
          allowUnmentionedGroups: j(P()),
          cliPath: j(B([z(), L()])),
          dbPath: j(B([z(), L()])),
          port: j(B([F({ minimum: 0 }), L()])),
          probe: j(N()),
          audit: j(N()),
          application: j(N()),
        },
        { additionalProperties: !0 },
      )),
      (VY = X({ id: Z, label: Z, detailLabel: Z, systemImage: j(z()) })),
      (HY = X({
        degraded: P(),
        degradedSinceMs: j(B([F({ minimum: 0 }), L()])),
        reasons: A(B([I(`event_loop_delay`), I(`event_loop_utilization`), I(`cpu`)])),
        intervalMs: F({ minimum: 0 }),
        delayP99Ms: R({ minimum: 0 }),
        delayMaxMs: R({ minimum: 0 }),
        utilization: R({ minimum: 0 }),
        cpuCoreRatio: R({ minimum: 0 }),
      })),
      X({
        ts: F({ minimum: 0 }),
        channelOrder: A(Z),
        channelLabels: Ky(Z, Z),
        channelDetailLabels: j(Ky(Z, Z)),
        channelSystemImages: j(Ky(Z, Z)),
        channelMeta: j(A(VY)),
        channels: Ky(Z, N()),
        channelAccounts: Ky(Z, A(BY)),
        channelDefaultAccountId: Ky(Z, Z),
        eventLoop: j(HY),
        partial: j(P()),
        warnings: j(A(z())),
      }),
      X({ channel: Z, accountId: j(z()) }),
      X({ channel: Z, accountId: j(z()) }),
      X({ channel: Z, accountId: j(z()) }),
      X({ force: j(P()), timeoutMs: j(F({ minimum: 0 })), verbose: j(P()), accountId: j(z()) }),
      (UY = z({ maxLength: 16384, pattern: `^data:image/png;base64,` })),
      X({ timeoutMs: j(F({ minimum: 0 })), accountId: j(z()), currentQrDataUrl: j(UY) }));
  }))();
}
var GY;
function KY() {
  return (KY = e(() => {
    (bJ(), WY(), (GY = yJ(DY)));
  }))();
}
var qY;
function JY() {
  return (JY = e(() => {
    qY = class extends Event {
      constructor(e) {
        (super(`wa-tab-hide`, { bubbles: !0, cancelable: !1, composed: !0 }), (this.detail = e));
      }
    };
  }))();
}
var YY;
function XY() {
  return (XY = e(() => {
    YY = class extends Event {
      constructor(e) {
        (super(`wa-tab-show`, { bubbles: !0, cancelable: !1, composed: !0 }), (this.detail = e));
      }
    };
  }))();
}
var ZY;
function QY() {
  return (QY = e(() => {
    (Je(),
      (ZY = $e`
  :host {
    --indicator-color: var(--wa-color-brand-fill-loud);
    --track-color: var(--wa-color-neutral-fill-normal);
    --track-width: 0.125rem;

    /* Private */
    --safe-track-width: max(0.5px, round(var(--track-width), 0.5px));

    display: block;
  }

  .tab-group {
    display: flex;
    border-radius: 0;
  }

  .tabs {
    display: flex;
    position: relative;
  }

  .indicator {
    position: absolute;
  }

  .tab-group-has-scroll-controls .nav-container {
    position: relative;
    padding: 0 1.5em;
  }

  .body {
    display: block;
  }

  .scroll-button {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1.5em;
  }

  .scroll-button-start {
    inset-inline-start: 0;
  }

  .scroll-button-end {
    inset-inline-end: 0;
  }

  /*
    * Top
    */

  .tab-group-top {
    flex-direction: column;
  }

  .tab-group-top .nav-container {
    order: 1;
  }

  .tab-group-top .nav {
    display: flex;
    overflow-x: auto;

    /* Hide scrollbar in Firefox */
    scrollbar-width: none;
  }

  /* Hide scrollbar in Chrome/Safari */
  .tab-group-top .nav::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .tab-group-top .tabs {
    flex: 1 1 auto;
    position: relative;
    flex-direction: row;
    border-bottom: solid var(--safe-track-width) var(--track-color);
  }

  .tab-group-top .indicator {
    bottom: calc(-1 * var(--safe-track-width));
    border-bottom: solid var(--safe-track-width) var(--indicator-color);
  }

  .tab-group-top .body {
    order: 2;
  }

  .tab-group-top ::slotted(wa-tab[active]) {
    border-block-end: solid var(--safe-track-width) var(--indicator-color);
    margin-block-end: calc(-1 * var(--safe-track-width));
  }

  .tab-group-top .body slot::slotted(wa-tab-panel) {
    --padding: var(--wa-space-xl) 0;
  }

  /*
    * Bottom
    */

  .tab-group-bottom {
    flex-direction: column;
  }

  .tab-group-bottom .nav-container {
    order: 2;
  }

  .tab-group-bottom .nav {
    display: flex;
    overflow-x: auto;

    /* Hide scrollbar in Firefox */
    scrollbar-width: none;
  }

  /* Hide scrollbar in Chrome/Safari */
  .tab-group-bottom .nav::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .tab-group-bottom .tabs {
    flex: 1 1 auto;
    position: relative;
    flex-direction: row;
    border-top: solid var(--safe-track-width) var(--track-color);
  }

  .tab-group-bottom .indicator {
    top: calc(-1 * var(--safe-track-width));
    border-top: solid var(--safe-track-width) var(--indicator-color);
  }

  .tab-group-bottom .body {
    order: 1;
  }

  .tab-group-bottom ::slotted(wa-tab[active]) {
    border-block-start: solid var(--safe-track-width) var(--indicator-color);
    margin-block-start: calc(-1 * var(--safe-track-width));
  }

  .tab-group-bottom .body slot::slotted(wa-tab-panel) {
    --padding: var(--wa-space-xl) 0;
  }

  /*
    * Start
    */

  .tab-group-start {
    flex-direction: row;
  }

  .tab-group-start .nav-container {
    order: 1;
  }

  .tab-group-start .tabs {
    flex: 0 0 auto;
    flex-direction: column;
    border-inline-end: solid var(--safe-track-width) var(--track-color);
  }

  .tab-group-start .indicator {
    inset-inline-end: calc(-1 * var(--safe-track-width));
    border-right: solid var(--safe-track-width) var(--indicator-color);
  }

  .tab-group-start .body {
    flex: 1 1 auto;
    order: 2;
  }

  .tab-group-start ::slotted(wa-tab[active]) {
    border-inline-end: solid var(--safe-track-width) var(--indicator-color);
    margin-inline-end: calc(-1 * var(--safe-track-width));
  }

  .tab-group-start .body slot::slotted(wa-tab-panel) {
    --padding: 0 var(--wa-space-xl);
  }

  /*
    * End
    */

  .tab-group-end {
    flex-direction: row;
  }

  .tab-group-end .nav-container {
    order: 2;
  }

  .tab-group-end .tabs {
    flex: 0 0 auto;
    flex-direction: column;
    border-left: solid var(--safe-track-width) var(--track-color);
  }

  .tab-group-end .indicator {
    inset-inline-start: calc(-1 * var(--safe-track-width));
    border-inline-start: solid var(--safe-track-width) var(--indicator-color);
  }

  .tab-group-end .body {
    flex: 1 1 auto;
    order: 1;
  }

  .tab-group-end ::slotted(wa-tab[active]) {
    border-inline-start: solid var(--safe-track-width) var(--indicator-color);
    margin-inline-start: calc(-1 * var(--safe-track-width));
  }

  .tab-group-end .body slot::slotted(wa-tab-panel) {
    --padding: 0 var(--wa-space-xl);
  }
`));
  }))();
}
var $Y;
function eX() {
  return (eX = e(() => {
    (JY(),
      XY(),
      QY(),
      pe(),
      He(),
      Ce(),
      Ve(),
      Je(),
      Ye(),
      it(),
      ($Y = class extends ze {
        constructor() {
          (super(...arguments),
            (this.tabs = []),
            (this.focusableTabs = []),
            (this.panels = []),
            (this.localize = new we(this)),
            (this.hasScrollControls = !1),
            (this.active = ``),
            (this.placement = `top`),
            (this.activation = `auto`),
            (this.withoutScrollControls = !1));
        }
        connectedCallback() {
          (super.connectedCallback(),
            (this.resizeObserver = new ResizeObserver(() => {
              this.updateScrollControls();
            })),
            (this.mutationObserver = new MutationObserver((e) => {
              e.some((e) => ![`aria-labelledby`, `aria-controls`].includes(e.attributeName)) &&
                setTimeout(() => this.setAriaLabels());
              let t = e.filter((e) => e.target.closest(`wa-tab-group`) === this);
              if (t.some((e) => e.attributeName === `disabled`)) this.syncTabsAndPanels();
              else if (t.some((e) => e.attributeName === `active`)) {
                let e = t
                  .filter(
                    (e) =>
                      e.attributeName === `active` && e.target.tagName.toLowerCase() === `wa-tab`,
                  )
                  .map((e) => e.target)
                  .find((e) => e.active);
                e && e.closest(`wa-tab-group`) === this && this.setActiveTab(e);
              }
            })),
            this.updateComplete.then(() => {
              (this.syncTabsAndPanels(),
                this.mutationObserver.observe(this, { attributes: !0, childList: !0, subtree: !0 }),
                this.resizeObserver.observe(this.nav),
                new IntersectionObserver((e, t) => {
                  if (e[0].intersectionRatio > 0) {
                    if ((this.setAriaLabels(), this.active)) {
                      let e = this.tabs.find((e) => e.panel === this.active);
                      e && this.setActiveTab(e);
                    } else
                      this.setActiveTab(this.getActiveTab() ?? this.tabs[0], { emitEvents: !1 });
                    t.unobserve(e[0].target);
                  }
                }).observe(this.tabGroup));
            }));
        }
        disconnectedCallback() {
          (super.disconnectedCallback(),
            this.mutationObserver?.disconnect(),
            this.nav && this.resizeObserver?.unobserve(this.nav));
        }
        getAllTabs() {
          return [...this.shadowRoot.querySelector(`slot[name="nav"]`).assignedElements()].filter(
            (e) => e.tagName.toLowerCase() === `wa-tab`,
          );
        }
        getAllPanels() {
          return [...this.defaultSlot.assignedElements()].filter(
            (e) => e.tagName.toLowerCase() === `wa-tab-panel`,
          );
        }
        getActiveTab() {
          return this.tabs.find((e) => e.active);
        }
        handleClick(e) {
          let t = e.target.closest(`wa-tab`);
          t?.closest(`wa-tab-group`) === this &&
            t !== null &&
            this.setActiveTab(t, { scrollBehavior: `smooth` });
        }
        handleKeyDown(e) {
          let t = e.target.closest(`wa-tab`);
          if (t?.closest(`wa-tab-group`) === this) {
            if ([`Enter`, ` `].includes(e.key)) {
              t !== null &&
                (this.setActiveTab(t, { scrollBehavior: `smooth` }), e.preventDefault());
              return;
            }
            if (
              [`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Home`, `End`].includes(e.key)
            ) {
              let t = this.tabs.find((e) => e.matches(`:focus`)),
                n = this.localize.dir() === `rtl`,
                r = null;
              if (t?.tagName.toLowerCase() === `wa-tab`) {
                if (e.key === `Home`) r = this.focusableTabs[0];
                else if (e.key === `End`) r = this.focusableTabs[this.focusableTabs.length - 1];
                else if (
                  ([`top`, `bottom`].includes(this.placement) &&
                    e.key === (n ? `ArrowRight` : `ArrowLeft`)) ||
                  ([`start`, `end`].includes(this.placement) && e.key === `ArrowUp`)
                ) {
                  let e = this.tabs.findIndex((e) => e === t);
                  r = this.findNextFocusableTab(e, `backward`);
                } else if (
                  ([`top`, `bottom`].includes(this.placement) &&
                    e.key === (n ? `ArrowLeft` : `ArrowRight`)) ||
                  ([`start`, `end`].includes(this.placement) && e.key === `ArrowDown`)
                ) {
                  let e = this.tabs.findIndex((e) => e === t);
                  r = this.findNextFocusableTab(e, `forward`);
                }
                if (!r) return;
                ((r.tabIndex = 0),
                  r.focus({ preventScroll: !0 }),
                  this.activation === `auto`
                    ? this.setActiveTab(r, { scrollBehavior: `smooth` })
                    : this.tabs.forEach((e) => {
                        e.tabIndex = e === r ? 0 : -1;
                      }),
                  [`top`, `bottom`].includes(this.placement) && f(r, this.nav, `horizontal`),
                  e.preventDefault());
              }
            }
          }
        }
        findNextFocusableTab(e, t) {
          let n = null,
            r = t === `forward` ? 1 : -1,
            i = e + r;
          for (; e < this.tabs.length;) {
            if (((n = this.tabs[i] || null), n === null)) {
              n =
                t === `forward`
                  ? this.focusableTabs[0]
                  : this.focusableTabs[this.focusableTabs.length - 1];
              break;
            }
            if (!n.disabled) break;
            i += r;
          }
          return n;
        }
        handleScrollToStart() {
          this.nav.scroll({
            left:
              this.localize.dir() === `rtl`
                ? this.nav.scrollLeft + this.nav.clientWidth
                : this.nav.scrollLeft - this.nav.clientWidth,
            behavior: `smooth`,
          });
        }
        handleScrollToEnd() {
          this.nav.scroll({
            left:
              this.localize.dir() === `rtl`
                ? this.nav.scrollLeft - this.nav.clientWidth
                : this.nav.scrollLeft + this.nav.clientWidth,
            behavior: `smooth`,
          });
        }
        setActiveTab(e, t) {
          if (
            ((t = { emitEvents: !0, scrollBehavior: `auto`, ...t }),
            e.closest(`wa-tab-group`) === this && e !== this.activeTab && !e.disabled)
          ) {
            let n = this.activeTab;
            ((this.active = e.panel),
              (this.activeTab = e),
              this.tabs.forEach((e) => {
                ((e.active = e === this.activeTab), (e.tabIndex = e === this.activeTab ? 0 : -1));
              }),
              this.panels.forEach((e) => (e.active = e.name === this.activeTab?.panel)),
              [`top`, `bottom`].includes(this.placement) &&
                f(this.activeTab, this.nav, `horizontal`, t.scrollBehavior),
              t.emitEvents &&
                (n && this.dispatchEvent(new qY({ name: n.panel })),
                this.dispatchEvent(new YY({ name: this.activeTab.panel }))));
          }
        }
        setAriaLabels() {
          this.tabs.forEach((e) => {
            let t = this.panels.find((t) => t.name === e.panel);
            t &&
              (e.setAttribute(`aria-controls`, t.getAttribute(`id`)),
              t.setAttribute(`aria-labelledby`, e.getAttribute(`id`)));
          });
        }
        syncTabsAndPanels() {
          ((this.tabs = this.getAllTabs()),
            (this.focusableTabs = this.tabs.filter((e) => !e.disabled)),
            (this.panels = this.getAllPanels()),
            this.updateComplete.then(() => this.updateScrollControls()));
        }
        updateActiveTab() {
          let e = this.tabs.find((e) => e.panel === this.active);
          e && this.setActiveTab(e, { scrollBehavior: `smooth` });
        }
        updateScrollControls() {
          this.hasScrollControls =
            !this.withoutScrollControls &&
            [`top`, `bottom`].includes(this.placement) &&
            this.nav.scrollWidth > this.nav.clientWidth + 1;
        }
        render() {
          let e = this.hasUpdated ? this.localize.dir() === `rtl` : this.dir === `rtl`;
          return Ke`
      <div
        part="base tab-group"
        class=${We({ "tab-group": !0, "tab-group-top": this.placement === `top`, "tab-group-bottom": this.placement === `bottom`, "tab-group-start": this.placement === `start`, "tab-group-end": this.placement === `end`, "tab-group-has-scroll-controls": this.hasScrollControls })}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <div class="nav-container" part="nav">
          ${
            this.hasScrollControls
              ? Ke`
                <wa-button
                  part="scroll-button scroll-button-start"
                  exportparts="base:scroll-button__base"
                  class="scroll-button scroll-button-start"
                  appearance="plain"
                  @click=${this.handleScrollToStart}
                >
                  <wa-icon
                    name=${e ? `chevron-right` : `chevron-left`}
                    library="system"
                    variant="solid"
                    label=${this.localize.term(`scrollToStart`)}
                  ></wa-icon>
                </wa-button>
              `
              : ``
          }

          <!-- We have a focus listener because in Firefox (and soon to be Chrome) overflow containers are focusable. -->
          <div class="nav" @focus=${() => this.activeTab?.focus({ preventScroll: !0 })}>
            <div part="tabs" class="tabs" role="tablist">
              <slot name="nav" @slotchange=${this.syncTabsAndPanels}></slot>
            </div>
          </div>

          ${
            this.hasScrollControls
              ? Ke`
                <wa-button
                  part="scroll-button scroll-button-end"
                  class="scroll-button scroll-button-end"
                  exportparts="base:scroll-button__base"
                  appearance="plain"
                  @click=${this.handleScrollToEnd}
                >
                  <wa-icon
                    name=${e ? `chevron-left` : `chevron-right`}
                    library="system"
                    variant="solid"
                    label=${this.localize.term(`scrollToEnd`)}
                  ></wa-icon>
                </wa-button>
              `
              : ``
          }
        </div>

        <div part="body" class="body"><slot @slotchange=${this.syncTabsAndPanels}></slot></div>
      </div>
    `;
        }
      }),
      ($Y.css = ZY),
      g([Ze(`.tab-group`)], $Y.prototype, `tabGroup`, 2),
      g([Ze(`.body slot`)], $Y.prototype, `defaultSlot`, 2),
      g([Ze(`.nav`)], $Y.prototype, `nav`, 2),
      g([tt()], $Y.prototype, `hasScrollControls`, 2),
      g([_({ reflect: !0 })], $Y.prototype, `active`, 2),
      g([_()], $Y.prototype, `placement`, 2),
      g([_()], $Y.prototype, `activation`, 2),
      g(
        [_({ attribute: `without-scroll-controls`, type: Boolean })],
        $Y.prototype,
        `withoutScrollControls`,
        2,
      ),
      g([me(`active`)], $Y.prototype, `updateActiveTab`, 1),
      g(
        [me(`withoutScrollControls`, { waitUntilFirstUpdate: !0 })],
        $Y.prototype,
        `updateScrollControls`,
        1,
      ),
      ($Y = g([Qe(`wa-tab-group`)], $Y)));
  }))();
}
var tX;
function nX() {
  return (nX = e(() => {
    (Je(),
      (tX = $e`
  :host {
    --padding: 0;

    display: none;
  }

  :host([active]) {
    display: block;
  }

  .tab-panel {
    display: block;
    padding: var(--padding);
  }
`));
  }))();
}
var rX, iX;
function aX() {
  return (aX = e(() => {
    (nX(),
      He(),
      Ve(),
      Je(),
      Ye(),
      it(),
      (rX = 0),
      (iX = class extends ze {
        constructor() {
          (super(...arguments),
            (this.attrId = ++rX),
            (this.componentId = `wa-tab-panel-${this.attrId}`),
            (this.name = ``),
            (this.active = !1),
            (this.role = `tabpanel`));
        }
        connectedCallback() {
          (super.connectedCallback(),
            (this.id = (this.id || ``).length > 0 ? this.id : this.componentId));
        }
        handleActiveChange() {
          this.setAttribute(`aria-hidden`, this.active ? `false` : `true`);
        }
        render() {
          return Ke`
      <slot
        part="base"
        class=${We({ "tab-panel": !0, "tab-panel-active": this.active })}
      ></slot>
    `;
        }
      }),
      (iX.css = tX),
      g([_({ reflect: !0 })], iX.prototype, `name`, 2),
      g([_({ type: Boolean, reflect: !0 })], iX.prototype, `active`, 2),
      g([_({ reflect: !0 })], iX.prototype, `role`, 2),
      g([me(`active`)], iX.prototype, `handleActiveChange`, 1),
      (iX = g([Qe(`wa-tab-panel`)], iX)));
  }))();
}
var oX;
function sX() {
  return (sX = e(() => {
    (Je(),
      (oX = $e`
  :host {
    display: inline-block;
    color: var(--wa-color-neutral-on-quiet);
    font-weight: var(--wa-font-weight-action);
  }

  .tab {
    display: inline-flex;
    align-items: center;
    font: inherit;
    padding: 1em 1.5em;
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    transition: color var(--wa-transition-fast) var(--wa-transition-easing);

    ::slotted(wa-icon:first-child) {
      margin-inline-end: 0.5em;
    }

    ::slotted(wa-icon:last-child) {
      margin-inline-start: 0.5em;
    }
  }

  @media (hover: hover) {
    :host(:hover:not([disabled])) .tab {
      color: currentColor;
    }
  }

  :host(:focus) {
    outline: transparent;
  }

  :host(:focus-visible) .tab {
    outline: var(--wa-focus-ring);
    outline-offset: calc(-1 * var(--wa-border-width-l) - var(--wa-focus-ring-offset));
  }

  :host([active]:not([disabled])) {
    color: var(--wa-color-brand-on-quiet);
  }

  :host([disabled]) .tab {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (forced-colors: active) {
    :host([active]:not([disabled])) {
      outline: solid 1px transparent;
      outline-offset: -3px;
    }
  }
`));
  }))();
}
var cX, lX;
function uX() {
  return (uX = e(() => {
    (sX(),
      He(),
      Ve(),
      Je(),
      Ye(),
      it(),
      (cX = 0),
      (lX = class extends ze {
        constructor() {
          (super(...arguments),
            (this.attrId = ++cX),
            (this.componentId = `wa-tab-${this.attrId}`),
            (this.panel = ``),
            (this.active = !1),
            (this.disabled = !1),
            (this.tabIndex = 0),
            (this.slot = `nav`),
            (this.role = `tab`));
        }
        handleActiveChange() {
          this.setAttribute(`aria-selected`, this.active ? `true` : `false`);
        }
        handleDisabledChange() {
          (this.setAttribute(`aria-disabled`, this.disabled ? `true` : `false`),
            (this.tabIndex = this.disabled && !this.active ? -1 : 0));
        }
        render() {
          return (
            (this.id = this.id?.length > 0 ? this.id : this.componentId),
            Ke`
      <div
        part="base tab"
        class=${We({ tab: !0, "tab-active": this.active })}
      >
        <slot></slot>
      </div>
    `
          );
        }
      }),
      (lX.css = oX),
      g([Ze(`.tab`)], lX.prototype, `tab`, 2),
      g([_({ reflect: !0 })], lX.prototype, `panel`, 2),
      g([_({ type: Boolean, reflect: !0 })], lX.prototype, `active`, 2),
      g([_({ type: Boolean, reflect: !0 })], lX.prototype, `disabled`, 2),
      g([_({ type: Number, reflect: !0 })], lX.prototype, `tabIndex`, 2),
      g([_({ reflect: !0 })], lX.prototype, `slot`, 2),
      g([_({ reflect: !0 })], lX.prototype, `role`, 2),
      g([me(`active`)], lX.prototype, `handleActiveChange`, 1),
      g([me(`disabled`)], lX.prototype, `handleDisabledChange`, 1),
      (lX = g([Qe(`wa-tab`)], lX)));
  }))();
}
function dX() {
  return (dX = e(() => {
    (eX(),
      aX(),
      uX(),
      sX(),
      QY(),
      nX(),
      n(),
      re(),
      De(),
      Ue(),
      ee(),
      te(),
      Ee(),
      l(),
      o(),
      He(),
      Ce(),
      ge());
  }))();
}
function fX() {
  return (fX = e(() => {
    (aX(), nX(), He());
  }))();
}
function pX() {
  return (pX = e(() => {
    (uX(), sX(), He());
  }))();
}
var mX;
function hX() {
  return (hX = e(() => {
    mX = (e = {}) => {
      let { validationElement: t, validationProperty: n } = e;
      (t ||
        (typeof document < `u` &&
          `createElement` in document &&
          (t = Object.assign(document.createElement(`input`), { required: !0 }))),
        (n ||= `value`));
      let r = {
        observedAttributes: [`required`],
        message: t?.validationMessage,
        checkValidity(e) {
          let t = { message: ``, isValid: !0, invalidKeys: [] };
          return (
            (e.required ?? e.hasAttribute(`required`)) &&
              (e[n] ||
                ((t.message = typeof r.message == `function` ? r.message(e) : r.message || ``),
                (t.isValid = !1),
                t.invalidKeys.push(`valueMissing`))),
            t
          );
        },
      };
      return r;
    };
  }))();
}
var gX;
function _X() {
  return (_X = e(() => {
    (Je(),
      (gX = $e`
  :host {
    display: flex;
    flex-direction: column;
  }

  /* Treat wrapped labels, inputs, and hints as direct children of the host element */
  [part~='form-control'] {
    display: contents;
  }

  /* Label */
  :is([part~='form-control-label'], [part~='label']):has(*:not(:empty)),
  :is([part~='form-control-label'], [part~='label']).has-label {
    display: inline-flex;
    color: var(--wa-form-control-label-color);
    font-weight: var(--wa-form-control-label-font-weight);
    line-height: var(--wa-form-control-label-line-height);
    margin-block-end: 0.5em;
  }

  :host([required]) :is([part~='form-control-label'], [part~='label'])::after {
    content: var(--wa-form-control-required-content);
    margin-inline-start: var(--wa-form-control-required-content-offset);
    color: var(--wa-form-control-required-content-color);
  }

  /* Help text */
  [part~='hint'] {
    display: block;
    color: var(--wa-form-control-hint-color);
    font-weight: var(--wa-form-control-hint-font-weight);
    line-height: var(--wa-form-control-hint-line-height);
    margin-block-start: 0.5em;
    font-size: var(--wa-font-size-smaller);

    &:not(.has-slotted, .has-hint) {
      display: none;
    }
  }
`));
  }))();
}
function vX(e) {
  return e === ` ` || e === `	`;
}
function yX(e) {
  return vX(e) || e === `\r`;
}
function bX(e, t, n) {
  let r = t;
  for (; r < n && vX(e[r]);) r += 1;
  return r;
}
function xX(e, t, n) {
  for (let r of kX) {
    let i = t + r.length;
    if (i <= n && e.slice(t, i).toLowerCase() === r) return { role: r, end: i };
  }
  return null;
}
function SX(e) {
  let t = Math.min(e.lineEnd, e.contentStart + e.maxContentLength + 1),
    n = -1;
  for (let r = e.contentStart; r < t; r += 1) {
    let t = e.text[r];
    if (t === "`") return null;
    if (t === e.close) {
      n = r;
      break;
    }
  }
  if (n === -1) return null;
  let r = n - e.contentStart;
  return r < e.minContentLength || r > e.maxContentLength ? null : n + 1;
}
function CX(e) {
  return e === void 0 || yX(e) || e === `:` || e === `：`;
}
function wX(e, t, n) {
  let r = xX(e, t, n);
  if (!r) return null;
  let i = bX(e, r.end, n);
  if (e[i] !== `[`) return null;
  let a = SX({
    text: e,
    contentStart: i + 1,
    lineEnd: n,
    close: `]`,
    minContentLength: 1,
    maxContentLength: 160,
  });
  return !a || !CX(e[a])
    ? null
    : { start: t, end: a, kind: `role_timestamp_bracket`, role: r.role };
}
function TX(e, t, n) {
  if (e[t] !== `[`) return null;
  let r = SX({
    text: e,
    contentStart: t + 1,
    lineEnd: n,
    close: `]`,
    minContentLength: 4,
    maxContentLength: 160,
  });
  if (!r) return null;
  let i = xX(e, bX(e, r, n), n);
  if (!i) return null;
  let a = bX(e, i.end, n);
  return e[a] !== `:` && e[a] !== `：`
    ? null
    : { start: t, end: a + 1, kind: `timestamp_role_colon`, role: i.role };
}
function EX(e, t, n) {
  if (e[t] !== `<`) return null;
  let r = xX(e, bX(e, t + 1, n), n),
    i = r ? e[r.end] : void 0;
  if (!r || (i !== `>` && !vX(i))) return null;
  let a = SX({
    text: e,
    contentStart: r.end,
    lineEnd: n,
    close: `>`,
    minContentLength: 0,
    maxContentLength: 160,
  });
  return !a || !CX(e[a]) ? null : { start: t, end: a, kind: `angle_role_header`, role: r.role };
}
function DX(e, t) {
  return e.start < t.end && e.end > t.start;
}
function OX(e, t = []) {
  let n = [],
    r = [...t].toSorted((e, t) => e.start - t.start || e.end - t.end),
    i = 0,
    a = 0;
  for (; a < e.length;) {
    let t = e.indexOf(
        `
`,
        a,
      ),
      o = t === -1 ? e.length : t,
      s = bX(e, a, o),
      c = TX(e, s, o) ?? EX(e, s, o) ?? wX(e, s, o);
    if (c) {
      for (;;) {
        let e = r[i];
        if (!e || e.end > c.start) break;
        i += 1;
      }
      let e = r[i];
      (!e || !DX(c, e)) && n.push(c);
    }
    if (t === -1) break;
    a = t + 1;
  }
  return n;
}
var kX;
function AX() {
  return (AX = e(() => {
    kX = [`assistant`, `developer`, `system`, `user`];
  }))();
}
function jX(e) {
  return PX.exec(e)?.[0];
}
function MX(e, t) {
  let n = t ? 2 : 1;
  for (; n < e.length;) {
    let t = e.charCodeAt(n);
    if (!((t >= 65 && t <= 90) || (t >= 97 && t <= 122)) && !(t >= 48 && t <= 57) && t !== 45)
      break;
    n += 1;
  }
  return e.slice(t ? 2 : 1, n).toLowerCase();
}
function* NX(e) {
  let t = 0;
  for (; t < e.length;) {
    let n = e.indexOf(`<`, t);
    if (n < 0) return;
    let r = jX(e.slice(n));
    if (!r) {
      t = n + 1;
      continue;
    }
    let i = r.startsWith(`</`),
      a = n + r.length,
      o = MX(r, i);
    if (!o) {
      t = a;
      continue;
    }
    (yield {
      raw: r,
      start: n,
      end: a,
      name: o,
      closing: i,
      selfClosing: !i && r.trimEnd().endsWith(`/>`),
    },
      (t = a));
  }
}
var PX;
function FX() {
  return (FX = e(() => {
    PX =
      /^(?:<[A-Za-z][A-Za-z0-9-]*(?:\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\s*=\s*(?:[^"'=<>`\x00-\x20]+|'[^']*'|"[^"]*"))?)*\s*\/?>|<\/[A-Za-z][A-Za-z0-9-]*\s*>|<!---?>|<!--(?:[^-]|-[^-]|--[^>])*-->|<\?[\s\S]*?\?>|<![A-Za-z][^>]*>|<!\[CDATA\[[\s\S]*?\]\]>)/;
  }))();
}
function IX(e) {
  let t = [],
    n = [],
    r = -1;
  for (let i of NX(e))
    if (qX.has(i.name)) {
      if (i.closing) {
        let e = n.lastIndexOf(i.name);
        e !== -1 &&
          (n.splice(e), n.length === 0 && r !== -1 && (t.push({ start: r, end: i.end }), (r = -1)));
      } else i.selfClosing || (n.length === 0 && (r = i.start), n.push(i.name));
    }
  return (n.length > 0 && r !== -1 && t.push({ start: r, end: e.length }), t);
}
function LX(e, t) {
  return e.type === `softbreak` || e.type === `hardbreak`
    ? {
        text: `
`,
        excludedRanges: [],
      }
    : e.type === `html_inline` && t.isStructuralHtmlInline?.(e) === !0
      ? null
      : e.type === `text` || e.type === `html_inline`
        ? { text: e.content, excludedRanges: [] }
        : e.type === `code_inline`
          ? { text: e.content, excludedRanges: [{ start: 0, end: e.content.length }] }
          : e.type === `image`
            ? e.children && e.children.length > 0
              ? RX(e.children, t)
              : { text: e.content, excludedRanges: [] }
            : null;
}
function RX(e, t) {
  let n = ``,
    r = [];
  for (let i of e) {
    let e = LX(i, t);
    if (!e) continue;
    let a = n.length;
    n += e.text;
    for (let t of e.excludedRanges) r.push({ start: a + t.start, end: a + t.end });
  }
  return (r.push(...IX(n)), { text: n, excludedRanges: r });
}
function zX(e, t, n, r = t.type) {
  let i = new e(r, r === `assistant_transcript_role_text` ? `` : t.tag, 0);
  return (Object.assign(i, t), (i.type = r), (i.content = n), (i.children = null), i);
}
function BX(e, t, n, r) {
  let i = zX(e, t, n, KX);
  return (
    (i.meta = {
      ...(t.meta && typeof t.meta == `object` ? t.meta : {}),
      assistantTranscriptRoleHeader: { kind: r.kind, role: r.role },
    }),
    i
  );
}
function VX(e) {
  let { token: t, visibleStart: n } = e,
    r = n + t.content.length,
    i = e.spans[e.spanStartIndex];
  if (!i || i.start >= r) return [t];
  let a = [],
    o = 0;
  for (let i = e.spanStartIndex; i < e.spans.length; i += 1) {
    let s = e.spans[i];
    if (!s || s.start >= r) break;
    if (s.end <= n) continue;
    let c = Math.max(s.start, n) - n,
      l = Math.min(s.end, r) - n;
    (c > o && a.push(zX(e.TokenType, t, t.content.slice(o, c))),
      l > c && a.push(BX(e.TokenType, t, t.content.slice(c, l), s)),
      (o = l));
  }
  return (o < t.content.length && a.push(zX(e.TokenType, t, t.content.slice(o))), a);
}
function HX(e, t, n, r) {
  let i = RX(t, r),
    a = OX(i.text, i.excludedRanges);
  if (a.length === 0) return t;
  let o = [],
    s = 0,
    c = 0;
  for (let n of t) {
    let t = LX(n, r);
    if (!t) {
      o.push(n);
      continue;
    }
    let i = t.text;
    for (;;) {
      let e = a[c];
      if (!e || e.end > s) break;
      c += 1;
    }
    if (n.type === `text` || n.type === `html_inline`)
      o.push(...VX({ TokenType: e, token: n, visibleStart: s, spanStartIndex: c, spans: a }));
    else if (n.type === `image`) {
      let e = s + i.length,
        t = [];
      for (let n = c; n < a.length; n += 1) {
        let r = a[n];
        if (!r || r.start >= e) break;
        r.end <= s ||
          t.push({ ...r, start: Math.max(r.start, s) - s, end: Math.min(r.end, e) - s });
      }
      (t.length > 0 &&
        (n.meta = {
          ...(n.meta && typeof n.meta == `object` ? n.meta : {}),
          assistantTranscriptRoleImage: { text: i, spans: t },
        }),
        o.push(n));
    } else o.push(n);
    s += i.length;
  }
  return n ? o : UX(o);
}
function UX(e) {
  let t = [],
    n = new Set();
  for (let r of e) {
    if (r.type === `link_open`) {
      t.push({ token: r, containsRole: !1 });
      continue;
    }
    let e = r.meta?.assistantTranscriptRoleImage;
    if (r.type === `assistant_transcript_role_text` || e?.spans.length) {
      for (let e of t) e.containsRole = !0;
      continue;
    }
    if (r.type !== `link_close`) continue;
    let i = t.pop();
    i?.containsRole && (n.add(i.token), n.add(r));
  }
  let r = [];
  for (let t of e) {
    if (n.has(t)) continue;
    let e = r.at(-1);
    if (
      e?.type === `assistant_transcript_role_text` &&
      t.type === `assistant_transcript_role_text`
    ) {
      e.content += t.content;
      continue;
    }
    r.push(t);
  }
  return r;
}
function WX(e, t) {
  let n = OX(t.content, IX(t.content));
  return n.length === 0
    ? [t]
    : VX({ TokenType: e, token: t, visibleStart: 0, spanStartIndex: 0, spans: n });
}
function GX(e, t = {}) {
  e.core.ruler.after(`text_join`, `assistant_transcript_roles`, (e) => {
    if (e.env?.assistantTranscriptRoleHeaders !== !0) return;
    let n = [],
      r = e.env?.assistantTranscriptRolePreserveLinks === !0;
    for (let i of e.tokens) {
      if (i.type === `inline` && i.children) {
        ((i.children = HX(e.Token, i.children, r, t)), n.push(i));
        continue;
      }
      if (i.type === `html_block`) {
        n.push(...WX(e.Token, i));
        continue;
      }
      n.push(i);
    }
    e.tokens = n;
  });
}
var KX, qX;
function JX() {
  return (JX = e(() => {
    (AX(),
      FX(),
      (KX = `assistant_transcript_role_text`),
      (qX = new Set([`code`, `pre`, `script`, `style`, `textarea`])));
  }))();
}
var YX,
  XX,
  ZX,
  QX,
  $X,
  eZ,
  tZ,
  nZ,
  rZ,
  iZ,
  aZ,
  oZ,
  sZ,
  cZ,
  lZ,
  uZ,
  dZ,
  fZ,
  pZ,
  mZ,
  hZ,
  gZ,
  _Z,
  vZ,
  yZ,
  bZ,
  xZ,
  SZ,
  CZ,
  wZ,
  TZ,
  EZ,
  DZ,
  OZ,
  kZ,
  AZ,
  jZ,
  MZ,
  NZ,
  PZ,
  FZ,
  IZ,
  LZ,
  RZ,
  zZ,
  BZ,
  VZ,
  HZ,
  UZ,
  WZ,
  GZ,
  KZ,
  qZ,
  JZ,
  YZ,
  XZ,
  ZZ,
  QZ,
  $Z,
  eQ,
  tQ,
  nQ,
  rQ,
  iQ,
  aQ,
  oQ,
  sQ,
  cQ,
  lQ,
  uQ,
  dQ,
  fQ,
  pQ,
  mQ,
  hQ,
  gQ,
  _Q,
  vQ,
  yQ,
  bQ,
  xQ,
  SQ,
  CQ,
  wQ,
  TQ,
  EQ,
  DQ,
  OQ;
function kQ() {
  return (kQ = e(() => {
    ((YX = Object.defineProperty),
      (XX = Object.defineProperties),
      (ZX = Object.getOwnPropertyDescriptors),
      (QX = Object.getOwnPropertySymbols),
      ($X = Object.prototype.hasOwnProperty),
      (eZ = Object.prototype.propertyIsEnumerable),
      (tZ = (e, t, n) =>
        t in e
          ? YX(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (nZ = (e, t) => {
        for (var n in (t ||= {})) $X.call(t, n) && tZ(e, n, t[n]);
        if (QX) for (var n of QX(t)) eZ.call(t, n) && tZ(e, n, t[n]);
        return e;
      }),
      (rZ = (e, t) => XX(e, ZX(t))),
      (iZ = (e, t) => {
        let n = !1,
          r = !1;
        for (let i = 0; i < t; i += 1) {
          if (e[i] === `\\` && i + 1 < e.length && e[i + 1] === "`") {
            i += 1;
            continue;
          }
          if (e.substring(i, i + 3) === "```") {
            ((r = !r), (i += 2));
            continue;
          }
          !r && e[i] === "`" && (n = !n);
        }
        return n || r;
      }),
      (aZ = (e, t) => {
        let n = e.substring(t, t + 3) === "```",
          r = t > 0 && e.substring(t - 1, t + 2) === "```",
          i = t > 1 && e.substring(t - 2, t + 1) === "```";
        return n || r || i;
      }),
      (oZ = (e) => {
        let t = 0;
        for (let n = 0; n < e.length; n += 1) {
          if (e[n] === `\\` && n + 1 < e.length && e[n + 1] === "`") {
            n += 1;
            continue;
          }
          e[n] === "`" && !aZ(e, n) && (t += 1);
        }
        return t;
      }),
      (sZ = (e, t) => {
        let n = !1,
          r = !1,
          i = -1;
        for (let a = 0; a < e.length; a += 1) {
          if (e[a] === `\\` && a + 1 < e.length && e[a + 1] === "`") {
            a += 1;
            continue;
          }
          if (e.substring(a, a + 3) === "```") {
            ((r = !r), (a += 2));
            continue;
          }
          if (!r && e[a] === "`") {
            if (n) {
              if (i < t && t < a) return !0;
              ((n = !1), (i = -1));
            } else ((n = !0), (i = a));
          }
        }
        return !1;
      }),
      (cZ = /^(\s*(?:[-*+]|\d+[.)]) +)>(=?\s*[$]?\d)/gm),
      (lZ = (e) =>
        !e || typeof e != `string` || !e.includes(`>`)
          ? e
          : e.replace(cZ, (t, n, r, i) => (iZ(e, i) ? t : `${n}\\>${r}`))),
      (uZ = /(\*\*)([^*]*\*?)$/),
      (dZ = /(__)([^_]*?)$/),
      (fZ = /(\*\*\*)([^*]*?)$/),
      (pZ = /(\*)([^*]*?)$/),
      (mZ = /(_)([^_]*?)$/),
      (hZ = /(`)([^`]*?)$/),
      (gZ = /(~~)([^~]*?)$/),
      (_Z = /^[\s_~*`]*$/),
      (vZ = /^[\s]*[-*+][\s]+$/),
      (yZ = /[\p{L}\p{N}_]/u),
      (bZ = /^```[^`\n]*```?$/),
      (xZ = /^\*{4,}$/),
      (SZ = /(__)([^_]+)_$/),
      (CZ = /(~~)([^~]+)~$/),
      (wZ = /~~/g),
      (TZ = (e) => {
        if (!e) return !1;
        let t = e.charCodeAt(0);
        return (
          (t >= 48 && t <= 57) ||
          (t >= 65 && t <= 90) ||
          (t >= 97 && t <= 122) ||
          t === 95 ||
          yZ.test(e)
        );
      }),
      (EZ = (e, t) => {
        let n = 1;
        for (let r = t - 1; r >= 0; --r)
          if (e[r] === `]`) n += 1;
          else if (e[r] === `[` && (--n, n === 0)) return r;
        return -1;
      }),
      (DZ = (e, t) => {
        let n = 1;
        for (let r = t + 1; r < e.length; r += 1)
          if (e[r] === `[`) n += 1;
          else if (e[r] === `]` && (--n, n === 0)) return r;
        return -1;
      }),
      (OZ = (e, t) => {
        let n = !1,
          r = !1;
        for (let i = 0; i < e.length && i < t; i += 1) {
          if (e[i] === `\\` && e[i + 1] === `$`) {
            i += 1;
            continue;
          }
          e[i] === `$` && (e[i + 1] === `$` ? ((r = !r), (i += 1), (n = !1)) : r || (n = !n));
        }
        return n || r;
      }),
      (kZ = (e, t) => {
        for (let n = t; n < e.length; n += 1) {
          if (e[n] === `)`) return !0;
          if (
            e[n] ===
            `
`
          )
            return !1;
        }
        return !1;
      }),
      (AZ = (e, t) => {
        for (let n = t - 1; n >= 0; --n) {
          if (e[n] === `)`) return !1;
          if (e[n] === `(`) return n > 0 && e[n - 1] === `]` && kZ(e, t);
          if (
            e[n] ===
            `
`
          )
            return !1;
        }
        return !1;
      }),
      (jZ = (e, t) => {
        for (let n = t - 1; n >= 0; --n) {
          if (e[n] === `>`) return !1;
          if (e[n] === `<`) {
            let t = n + 1 < e.length ? e[n + 1] : ``;
            return (t >= `a` && t <= `z`) || (t >= `A` && t <= `Z`) || t === `/`;
          }
          if (
            e[n] ===
            `
`
          )
            return !1;
        }
        return !1;
      }),
      (MZ = (e, t, n) => {
        let r = 0;
        for (let n = t - 1; n >= 0; --n)
          if (
            e[n] ===
            `
`
          ) {
            r = n + 1;
            break;
          }
        let i = e.length;
        for (let n = t; n < e.length; n += 1)
          if (
            e[n] ===
            `
`
          ) {
            i = n;
            break;
          }
        let a = e.substring(r, i),
          o = 0,
          s = !1;
        for (let e of a)
          if (e === n) o += 1;
          else if (e !== ` ` && e !== `	`) {
            s = !0;
            break;
          }
        return o >= 3 && !s;
      }),
      (NZ = (e, t, n, r) =>
        n === `\\` || (e.includes(`$`) && OZ(e, t))
          ? !0
          : n !== `*` && r === `*`
            ? (t < e.length - 2 ? e[t + 2] : ``) !== `*`
            : !!(
                n === `*` ||
                (n && r && TZ(n) && TZ(r)) ||
                ((!n ||
                  n === ` ` ||
                  n === `	` ||
                  n ===
                    `
`) &&
                  (!r ||
                    r === ` ` ||
                    r === `	` ||
                    r ===
                      `
`))
              )),
      (PZ = (e) => {
        let t = 0,
          n = !1,
          r = e.length;
        for (let i = 0; i < r; i += 1) {
          if (e[i] === "`" && i + 2 < r && e[i + 1] === "`" && e[i + 2] === "`") {
            ((n = !n), (i += 2));
            continue;
          }
          if (n || e[i] !== `*`) continue;
          let a = i > 0 ? e[i - 1] : ``,
            o = i < r - 1 ? e[i + 1] : ``;
          NZ(e, i, a, o) || (t += 1);
        }
        return t;
      }),
      (FZ = (e, t, n, r) =>
        !!(
          n === `\\` ||
          (e.includes(`$`) && OZ(e, t)) ||
          AZ(e, t) ||
          jZ(e, t) ||
          n === `_` ||
          r === `_` ||
          (n && r && TZ(n) && TZ(r))
        )),
      (IZ = (e) => {
        let t = 0,
          n = !1,
          r = e.length;
        for (let i = 0; i < r; i += 1) {
          if (e[i] === "`" && i + 2 < r && e[i + 1] === "`" && e[i + 2] === "`") {
            ((n = !n), (i += 2));
            continue;
          }
          if (n || e[i] !== `_`) continue;
          let a = i > 0 ? e[i - 1] : ``,
            o = i < r - 1 ? e[i + 1] : ``;
          FZ(e, i, a, o) || (t += 1);
        }
        return t;
      }),
      (LZ = (e) => {
        let t = 0,
          n = 0,
          r = !1;
        for (let i = 0; i < e.length; i += 1) {
          if (e[i] === "`" && i + 2 < e.length && e[i + 1] === "`" && e[i + 2] === "`") {
            (n >= 3 && (t += Math.floor(n / 3)), (n = 0), (r = !r), (i += 2));
            continue;
          }
          r || (e[i] === `*` ? (n += 1) : (n >= 3 && (t += Math.floor(n / 3)), (n = 0)));
        }
        return (n >= 3 && (t += Math.floor(n / 3)), t);
      }),
      (RZ = (e) => {
        let t = 0,
          n = !1;
        for (let r = 0; r < e.length; r += 1) {
          if (e[r] === "`" && r + 2 < e.length && e[r + 1] === "`" && e[r + 2] === "`") {
            ((n = !n), (r += 2));
            continue;
          }
          n || (e[r] === `*` && r + 1 < e.length && e[r + 1] === `*` && ((t += 1), (r += 1)));
        }
        return t;
      }),
      (zZ = (e) => {
        let t = 0,
          n = !1;
        for (let r = 0; r < e.length; r += 1) {
          if (e[r] === "`" && r + 2 < e.length && e[r + 1] === "`" && e[r + 2] === "`") {
            ((n = !n), (r += 2));
            continue;
          }
          n || (e[r] === `_` && r + 1 < e.length && e[r + 1] === `_` && ((t += 1), (r += 1)));
        }
        return t;
      }),
      (BZ = (e, t, n) => {
        if (!t || _Z.test(t)) return !0;
        let r = e.substring(0, n).lastIndexOf(`
`),
          i = r === -1 ? 0 : r + 1,
          a = e.substring(i, n);
        return vZ.test(a) &&
          t.includes(`
`)
          ? !0
          : MZ(e, n, `*`);
      }),
      (VZ = (e) => {
        let t = e.match(uZ);
        if (!t) return e;
        let n = t[2],
          r = e.lastIndexOf(t[1]);
        return iZ(e, r) || sZ(e, r) || BZ(e, n, r)
          ? e
          : RZ(e) % 2 == 1
            ? n.endsWith(`*`)
              ? `${e}*`
              : `${e}**`
            : e;
      }),
      (HZ = (e, t, n) => {
        if (!t || _Z.test(t)) return !0;
        let r = e.substring(0, n).lastIndexOf(`
`),
          i = r === -1 ? 0 : r + 1,
          a = e.substring(i, n);
        return vZ.test(a) &&
          t.includes(`
`)
          ? !0
          : MZ(e, n, `_`);
      }),
      (UZ = (e) => {
        let t = e.match(dZ);
        if (!t) {
          let t = e.match(SZ);
          if (t) {
            let n = e.lastIndexOf(t[1]);
            if (!(iZ(e, n) || sZ(e, n)) && zZ(e) % 2 == 1) return `${e}_`;
          }
          return e;
        }
        let n = t[2],
          r = e.lastIndexOf(t[1]);
        return iZ(e, r) || sZ(e, r) || HZ(e, n, r) ? e : zZ(e) % 2 == 1 ? `${e}__` : e;
      }),
      (WZ = (e) => {
        let t = !1;
        for (let n = 0; n < e.length; n += 1) {
          if (e[n] === "`" && n + 2 < e.length && e[n + 1] === "`" && e[n + 2] === "`") {
            ((t = !t), (n += 2));
            continue;
          }
          if (
            !t &&
            e[n] === `*` &&
            e[n - 1] !== `*` &&
            e[n + 1] !== `*` &&
            e[n - 1] !== `\\` &&
            !OZ(e, n)
          ) {
            let t = n > 0 ? e[n - 1] : ``,
              r = n < e.length - 1 ? e[n + 1] : ``;
            if (
              ((!t ||
                t === ` ` ||
                t === `	` ||
                t ===
                  `
`) &&
                (!r ||
                  r === ` ` ||
                  r === `	` ||
                  r ===
                    `
`)) ||
              (t && r && TZ(t) && TZ(r))
            )
              continue;
            return n;
          }
        }
        return -1;
      }),
      (GZ = (e) => {
        if (!e.match(pZ)) return e;
        let t = WZ(e);
        if (t === -1 || iZ(e, t) || sZ(e, t)) return e;
        let n = e.substring(t + 1);
        return !n || _Z.test(n) ? e : PZ(e) % 2 == 1 ? `${e}*` : e;
      }),
      (KZ = (e) => {
        let t = !1;
        for (let n = 0; n < e.length; n += 1) {
          if (e[n] === "`" && n + 2 < e.length && e[n + 1] === "`" && e[n + 2] === "`") {
            ((t = !t), (n += 2));
            continue;
          }
          if (
            !t &&
            e[n] === `_` &&
            e[n - 1] !== `_` &&
            e[n + 1] !== `_` &&
            e[n - 1] !== `\\` &&
            !OZ(e, n) &&
            !AZ(e, n)
          ) {
            let t = n > 0 ? e[n - 1] : ``,
              r = n < e.length - 1 ? e[n + 1] : ``;
            if (t && r && TZ(t) && TZ(r)) continue;
            return n;
          }
        }
        return -1;
      }),
      (qZ = (e) => {
        let t = e.length;
        for (
          ;
          t > 0 &&
          e[t - 1] ===
            `
`;
        )
          --t;
        return t < e.length ? `${e.slice(0, t)}_${e.slice(t)}` : `${e}_`;
      }),
      (JZ = (e) => {
        if (!e.endsWith(`**`)) return null;
        let t = e.slice(0, -2);
        if (RZ(t) % 2 != 1) return null;
        let n = t.indexOf(`**`),
          r = KZ(t);
        return n !== -1 && r !== -1 && n < r ? `${t}_**` : null;
      }),
      (YZ = (e) => {
        if (!e.match(mZ)) return e;
        let t = KZ(e);
        if (t === -1) return e;
        let n = e.substring(t + 1);
        if (!n || _Z.test(n) || iZ(e, t) || sZ(e, t)) return e;
        if (IZ(e) % 2 == 1) {
          let t = JZ(e);
          return t === null ? qZ(e) : t;
        }
        return e;
      }),
      (XZ = (e) => {
        let t = RZ(e),
          n = PZ(e);
        return t % 2 == 0 && n % 2 == 0;
      }),
      (ZZ = (e, t, n) => (!t || _Z.test(t) || iZ(e, n) || sZ(e, n) ? !0 : MZ(e, n, `*`))),
      (QZ = (e) => {
        if (xZ.test(e)) return e;
        let t = e.match(fZ);
        if (!t) return e;
        let n = t[2];
        return ZZ(e, n, e.lastIndexOf(t[1])) ? e : LZ(e) % 2 == 1 ? (XZ(e) ? e : `${e}***`) : e;
      }),
      ($Z = /<[a-zA-Z/][^>]*$/),
      (eQ = (e) => {
        let t = e.match($Z);
        return !t || t.index === void 0 || iZ(e, t.index) ? e : e.substring(0, t.index).trimEnd();
      }),
      (tQ = (e) =>
        !e.match(bZ) ||
        e.includes(`
`)
          ? null
          : e.endsWith("``") && !e.endsWith("```")
            ? `${e}\``
            : e),
      (nQ = (e) => (e.match(/```/g) || []).length % 2 == 1),
      (rQ = (e) => {
        let t = tQ(e);
        if (t !== null) return t;
        let n = e.match(hZ);
        if (n && !nQ(e)) {
          let t = n[2];
          if (!t || _Z.test(t)) return e;
          if (oZ(e) % 2 == 1) return `${e}\``;
        }
        return e;
      }),
      (iQ = (e, t) =>
        (t >= 2 && e.substring(t - 2, t + 1) === "```") ||
        (t >= 1 && e.substring(t - 1, t + 2) === "```") ||
        (t <= e.length - 3 && e.substring(t, t + 3) === "```")),
      (aQ = (e) => {
        let t = 0,
          n = !1;
        for (let r = 0; r < e.length - 1; r += 1)
          (e[r] === "`" && !iQ(e, r) && (n = !n),
            !n && e[r] === `$` && e[r + 1] === `$` && ((t += 1), (r += 1)));
        return t;
      }),
      (oQ = (e) => {
        let t = 0,
          n = !1;
        for (let r = 0; r < e.length; r += 1) {
          if (e[r] === `\\`) {
            r += 1;
            continue;
          }
          if (e[r] === "`" && !iQ(e, r)) {
            n = !n;
            continue;
          }
          !n && e[r] === `$` && (r + 1 < e.length && e[r + 1] === `$` ? (r += 1) : (t += 1));
        }
        return t;
      }),
      (sQ = (e) => {
        if (e.endsWith(`$`) && !e.endsWith(`$$`)) return `${e}$`;
        let t = e.indexOf(`$$`);
        return t !== -1 &&
          e.indexOf(
            `
`,
            t,
          ) !== -1 &&
          !e.endsWith(`
`)
          ? `${e}
$$`
          : `${e}$$`;
      }),
      (cQ = (e) => (aQ(e) % 2 == 0 ? e : sQ(e))),
      (lQ = (e) => (oQ(e) % 2 == 1 ? `${e}$` : e)),
      (uQ = (e, t, n) => {
        if (e.substring(t + 2).includes(`)`)) return null;
        let r = EZ(e, t);
        if (r === -1 || iZ(e, r)) return null;
        let i = r > 0 && e[r - 1] === `!`,
          a = i ? r - 1 : r,
          o = e.substring(0, a);
        if (i) return o;
        let s = e.substring(r + 1, t);
        return n === `text-only` ? `${o}${s}` : `${o}[${s}](streamdown:incomplete-link)`;
      }),
      (dQ = (e, t) => {
        for (let n = 0; n < t; n++)
          if (e[n] === `[` && !iZ(e, n)) {
            if (n > 0 && e[n - 1] === `!`) continue;
            let t = DZ(e, n);
            if (t === -1) return n;
            if (t + 1 < e.length && e[t + 1] === `(`) {
              let r = e.indexOf(`)`, t + 2);
              r !== -1 && (n = r);
            }
          }
        return t;
      }),
      (fQ = (e, t, n) => {
        let r = t > 0 && e[t - 1] === `!`,
          i = r ? t - 1 : t;
        if (!e.substring(t + 1).includes(`]`)) {
          let a = e.substring(0, i);
          if (r) return a;
          if (n === `text-only`) {
            let n = dQ(e, t);
            return e.substring(0, n) + e.substring(n + 1);
          }
          return `${e}](streamdown:incomplete-link)`;
        }
        if (DZ(e, t) === -1) {
          let a = e.substring(0, i);
          if (r) return a;
          if (n === `text-only`) {
            let n = dQ(e, t);
            return e.substring(0, n) + e.substring(n + 1);
          }
          return `${e}](streamdown:incomplete-link)`;
        }
        return null;
      }),
      (pQ = (e, t = `protocol`) => {
        let n = e.lastIndexOf(`](`);
        if (n !== -1 && !iZ(e, n)) {
          let r = uQ(e, n, t);
          if (r !== null) return r;
        }
        for (let n = e.length - 1; n >= 0; --n)
          if (e[n] === `[` && !iZ(e, n)) {
            let r = fQ(e, n, t);
            if (r !== null) return r;
          }
        return e;
      }),
      (mQ = /^-{1,2}$/),
      (hQ = /^[\s]*-{1,2}[\s]+$/),
      (gQ = /^={1,2}$/),
      (_Q = /^[\s]*={1,2}[\s]+$/),
      (vQ = (e) => {
        if (!e || typeof e != `string`) return e;
        let t = e.lastIndexOf(`
`);
        if (t === -1) return e;
        let n = e.substring(t + 1),
          r = e.substring(0, t),
          i = n.trim();
        if (mQ.test(i) && !n.match(hQ)) {
          let t = r
            .split(`
`)
            .at(-1);
          if (t && t.trim().length > 0) return `${e}\u200B`;
        }
        if (gQ.test(i) && !n.match(_Q)) {
          let t = r
            .split(`
`)
            .at(-1);
          if (t && t.trim().length > 0) return `${e}\u200B`;
        }
        return e;
      }),
      (yQ = RegExp(`(?<=[\\p{L}\\p{N}_])~(?!~)(?=[\\p{L}\\p{N}_])`, `gu`)),
      (bQ = (e) =>
        !e || typeof e != `string` || !e.includes(`~`)
          ? e
          : e.replace(yQ, (t, n) => (iZ(e, n) ? t : `\\~`))),
      (xQ = (e) => {
        let t = e.match(gZ);
        if (t) {
          let n = t[2];
          if (!n || _Z.test(n)) return e;
          let r = e.lastIndexOf(t[1]);
          if (iZ(e, r) || sZ(e, r)) return e;
          if (e.match(wZ)?.length % 2 == 1) return `${e}~~`;
        } else {
          let t = e.match(CZ);
          if (t) {
            let n = e.lastIndexOf(t[0].slice(0, 2));
            if (iZ(e, n) || sZ(e, n)) return e;
            if (e.match(wZ)?.length % 2 == 1) return `${e}~`;
          }
        }
        return e;
      }),
      (SQ = (e) => e !== !1),
      (CQ = (e) => e === !0),
      (wQ = {
        SINGLE_TILDE: 0,
        COMPARISON_OPERATORS: 5,
        HTML_TAGS: 10,
        SETEXT_HEADINGS: 15,
        LINKS: 20,
        BOLD_ITALIC: 30,
        BOLD: 35,
        ITALIC_DOUBLE_UNDERSCORE: 40,
        ITALIC_SINGLE_ASTERISK: 41,
        ITALIC_SINGLE_UNDERSCORE: 42,
        INLINE_CODE: 50,
        STRIKETHROUGH: 60,
        KATEX: 70,
        INLINE_KATEX: 75,
        DEFAULT: 100,
      }),
      (TQ = [
        {
          handler: { name: `singleTilde`, handle: bQ, priority: wQ.SINGLE_TILDE },
          optionKey: `singleTilde`,
        },
        {
          handler: { name: `comparisonOperators`, handle: lZ, priority: wQ.COMPARISON_OPERATORS },
          optionKey: `comparisonOperators`,
        },
        {
          handler: { name: `htmlTags`, handle: eQ, priority: wQ.HTML_TAGS },
          optionKey: `htmlTags`,
        },
        {
          handler: { name: `setextHeadings`, handle: vQ, priority: wQ.SETEXT_HEADINGS },
          optionKey: `setextHeadings`,
        },
        {
          handler: { name: `links`, handle: pQ, priority: wQ.LINKS },
          optionKey: `links`,
          earlyReturn: (e) => e.endsWith(`](streamdown:incomplete-link)`),
        },
        {
          handler: { name: `boldItalic`, handle: QZ, priority: wQ.BOLD_ITALIC },
          optionKey: `boldItalic`,
        },
        { handler: { name: `bold`, handle: VZ, priority: wQ.BOLD }, optionKey: `bold` },
        {
          handler: {
            name: `italicDoubleUnderscore`,
            handle: UZ,
            priority: wQ.ITALIC_DOUBLE_UNDERSCORE,
          },
          optionKey: `italic`,
        },
        {
          handler: {
            name: `italicSingleAsterisk`,
            handle: GZ,
            priority: wQ.ITALIC_SINGLE_ASTERISK,
          },
          optionKey: `italic`,
        },
        {
          handler: {
            name: `italicSingleUnderscore`,
            handle: YZ,
            priority: wQ.ITALIC_SINGLE_UNDERSCORE,
          },
          optionKey: `italic`,
        },
        {
          handler: { name: `inlineCode`, handle: rQ, priority: wQ.INLINE_CODE },
          optionKey: `inlineCode`,
        },
        {
          handler: { name: `strikethrough`, handle: xQ, priority: wQ.STRIKETHROUGH },
          optionKey: `strikethrough`,
        },
        { handler: { name: `katex`, handle: cQ, priority: wQ.KATEX }, optionKey: `katex` },
        {
          handler: { name: `inlineKatex`, handle: lQ, priority: wQ.INLINE_KATEX },
          optionKey: `inlineKatex`,
        },
      ]),
      (EQ = (e) => {
        let t = e?.linkMode ?? `protocol`;
        return TQ.filter(({ handler: t, optionKey: n }) =>
          t.name === `links`
            ? SQ(e?.links) || SQ(e?.images)
            : t.name === `inlineKatex`
              ? CQ(e?.inlineKatex)
              : SQ(e?.[n]),
        ).map(({ handler: e, earlyReturn: n }) =>
          e.name === `links`
            ? {
                handler: rZ(nZ({}, e), { handle: (e) => pQ(e, t) }),
                earlyReturn: t === `protocol` ? n : void 0,
              }
            : { handler: e, earlyReturn: n },
        );
      }),
      (DQ = (e, t) => {
        if (!e || typeof e != `string`) return e;
        let n = e.endsWith(` `) && !e.endsWith(`  `) ? e.slice(0, -1) : e,
          r = EQ(t),
          i = (t?.handlers ?? []).map((e) => ({
            handler: rZ(nZ({}, e), { priority: e.priority ?? wQ.DEFAULT }),
            earlyReturn: void 0,
          })),
          a = [...r, ...i].sort((e, t) => (e.handler.priority ?? 0) - (t.handler.priority ?? 0));
        for (let { handler: e, earlyReturn: t } of a)
          if (((n = e.handle(n)), t != null && t(n))) return n;
        return n;
      }),
      (OQ = DQ));
  }))();
}
function AQ(e, t) {
  let n = [],
    r = t?.atLineStart ?? !0,
    i = t?.open ? { ...t.open, start: 0 } : void 0,
    a = 0;
  for (; a <= e.length;) {
    let t = e.indexOf(
        `
`,
        a,
      ),
      o = t === -1 ? e.length : t,
      s = e.slice(a, o).replace(/\r$/, ``),
      c = s.match(/^( {0,3})(`{3,}|~{3,})(.*)$/);
    if (c && (a > 0 || r)) {
      let [, e, r, l] = c;
      if (e === void 0 || r === void 0 || l === void 0) {
        if (t === -1) break;
        a = t + 1;
        continue;
      }
      let u = r.charAt(0),
        d = r.length;
      if (!i) i = { start: a, markerChar: u, markerLen: d, openLine: s, marker: r, indent: e };
      else if (i.markerChar === u && d >= i.markerLen && /^[ \t]*$/.test(l)) {
        let e = o;
        (n.push({
          start: i.start,
          end: e,
          openLine: i.openLine,
          marker: i.marker,
          indent: i.indent,
        }),
          (i = void 0));
      }
    }
    if (t === -1) break;
    a = t + 1;
  }
  return (
    i &&
      n.push({
        start: i.start,
        end: e.length,
        openLine: i.openLine,
        marker: i.marker,
        indent: i.indent,
      }),
    {
      spans: n,
      state: {
        atLineStart:
          e.length === 0
            ? r
            : e.endsWith(`
`),
        ...(i
          ? {
              open: {
                markerChar: i.markerChar,
                markerLen: i.markerLen,
                openLine: i.openLine,
                marker: i.marker,
                indent: i.indent,
              },
            }
          : {}),
      },
    }
  );
}
function jQ(e) {
  return AQ(e).spans;
}
function MQ() {
  return (MQ = e(() => {}))();
}
var NQ, PQ, FQ;
function IQ() {
  return (IQ = e(() => {
    ((NQ = {
      emoji: `🧩`,
      detailKeys: [
        `command`,
        `path`,
        `url`,
        `targetUrl`,
        `targetId`,
        `ref`,
        `element`,
        `node`,
        `nodeId`,
        `id`,
        `requestId`,
        `to`,
        `channelId`,
        `guildId`,
        `userId`,
        `name`,
        `query`,
        `pattern`,
        `messageId`,
      ],
    }),
      (PQ = JSON.parse(
        `{"bash":{"emoji":"🛠️","title":"Bash","detailKeys":["command"]},"computer":{"emoji":"🖱️","title":"Computer","detailKeys":["action","coordinate","text","node","nodeId","screenIndex"]},"mobile_ui":{"emoji":"📱","title":"Mobile UI","detailKeys":["action","mobileAction","snapshotId","node","nodeId"]},"screen":{"emoji":"🖥️","title":"Screen","detailKeys":["action","sessionKey","dock"]},"terminal":{"emoji":"⌨️","title":"Terminal","detailKeys":["action","sessionId","command","cwd"]},"portal":{"emoji":"🌐","title":"Portal","detailKeys":["action","port","id","title","path"]},"process":{"emoji":"🧰","title":"Process","detailKeys":["sessionId"]},"read":{"emoji":"📖","title":"Read","detailKeys":["path"]},"write":{"emoji":"✍️","title":"Write","detailKeys":["path"]},"edit":{"emoji":"📝","title":"Edit","detailKeys":["path"]},"attach":{"emoji":"📎","title":"Attach","detailKeys":["path","url","fileName"]},"api":{"emoji":"🌐","title":"API","detailKeys":["url","endpoint","path","method","name"]},"browser":{"emoji":"🌐","title":"Browser","actions":{"status":{"label":"status"},"start":{"label":"start"},"stop":{"label":"stop"},"tabs":{"label":"tabs"},"open":{"label":"open","detailKeys":["targetUrl"]},"focus":{"label":"focus","detailKeys":["targetId"]},"close":{"label":"close","detailKeys":["targetId"]},"snapshot":{"label":"snapshot","detailKeys":["targetUrl","targetId","ref","element","format"]},"screenshot":{"label":"screenshot","detailKeys":["targetUrl","targetId","ref","element"]},"navigate":{"label":"navigate","detailKeys":["targetUrl","targetId"]},"console":{"label":"console","detailKeys":["level","targetId"]},"pdf":{"label":"pdf","detailKeys":["targetId"]},"upload":{"label":"upload","detailKeys":["paths","ref","inputRef","element","targetId"]},"dialog":{"label":"dialog","detailKeys":["accept","promptText","targetId"]},"act":{"label":"act","detailKeys":["request.kind","request.ref","request.selector","request.text","request.value"]}}},"canvas":{"emoji":"🖼️","title":"Canvas","actions":{"present":{"label":"present","detailKeys":["target","node","nodeId"]},"hide":{"label":"hide","detailKeys":["node","nodeId"]},"navigate":{"label":"navigate","detailKeys":["url","node","nodeId"]}}},"dashboard":{"emoji":"📋","title":"Dashboard","detailKeys":["action","tabId","name","title"]},"nodes":{"emoji":"📱","title":"Nodes","actions":{"status":{"label":"status"},"describe":{"label":"describe","detailKeys":["node","nodeId"]},"pending":{"label":"pending"},"approve":{"label":"approve","detailKeys":["requestId"]},"reject":{"label":"reject","detailKeys":["requestId"]},"notify":{"label":"notify","detailKeys":["node","nodeId","title","body"]},"camera_snap":{"label":"camera snap","detailKeys":["node","nodeId","facing","deviceId"]},"camera_list":{"label":"camera list","detailKeys":["node","nodeId"]},"camera_clip":{"label":"camera clip","detailKeys":["node","nodeId","facing","duration","durationMs"]},"camera_ptz":{"label":"camera PTZ","detailKeys":["ptzOperation","node","nodeId","deviceId"]},"screen_record":{"label":"screen record","detailKeys":["node","nodeId","duration","durationMs","fps","screenIndex"]},"screen_snapshot":{"label":"screen snapshot","detailKeys":["node","nodeId","screenIndex","maxWidth"]}}},"cron":{"emoji":"⏰","title":"Cron","actions":{"status":{"label":"status"},"list":{"label":"list"},"add":{"label":"add","detailKeys":["job.name","job.id","job.schedule","job.cron"]},"update":{"label":"update","detailKeys":["id"]},"remove":{"label":"remove","detailKeys":["id"]},"run":{"label":"run","detailKeys":["id"]},"runs":{"label":"runs","detailKeys":["id"]},"wake":{"label":"wake","detailKeys":["text","mode"]}}},"get_goal":{"emoji":"🎯","title":"Get Goal","detailKeys":[]},"create_goal":{"emoji":"🎯","title":"Create Goal","detailKeys":["objective","token_budget"]},"update_goal":{"emoji":"🎯","title":"Update Goal","detailKeys":["status"]},"progress_card":{"emoji":"🗺️","title":"Progress Card","detailKeys":["plan.0.step","markdown"]},"ask_user":{"emoji":"❓","title":"Ask User","detailKeys":["questions.0.question"]},"suggest_task":{"emoji":"✨","title":"Suggest Task","detailKeys":["title","tldr","cwd"]},"dismiss_task":{"emoji":"🗑️","title":"Dismiss Task","detailKeys":["task_id","reason"]},"skill_workshop":{"emoji":"🧰","title":"Skill Workshop","detailKeys":["action","name","proposal_id"]},"openclaw":{"emoji":"🦀","title":"OpenClaw","detailKeys":["action","path","model"]},"gateway":{"emoji":"🔌","title":"Gateway","detailKeys":["action","path"]},"exec":{"emoji":"🛠️","title":"Exec","detailKeys":["command"]},"tool_call":{"emoji":"🧰","title":"Tool Call","detailKeys":[]},"tool_call_update":{"emoji":"🧰","title":"Tool Call","detailKeys":[]},"session_status":{"emoji":"📊","title":"Session Status","detailKeys":["sessionKey","model"]},"github_publish":{"emoji":"🔀","title":"GitHub Publish","detailKeys":["title"]},"github_identity_status":{"emoji":"🔐","title":"GitHub Identity Status","detailKeys":[]},"sessions":{"emoji":"🗂️","title":"Session Settings","actions":{"patch":{"label":"update","detailKeys":["sessionKey","label","pinned","archived","model","thinkingLevel"]},"group_list":{"label":"groups"},"group_set":{"label":"set groups","detailKeys":["names"]},"group_rename":{"label":"rename group","detailKeys":["name","to"]},"group_delete":{"label":"delete group","detailKeys":["name"]}}},"sessions_list":{"emoji":"🗂️","title":"Sessions","detailKeys":["kinds","label","agentId","search","limit","activeMinutes","includeDerivedTitles","includeLastMessage","messageLimit"]},"conversations_list":{"emoji":"💬","title":"Conversations","detailKeys":["channel","limit"]},"conversations_send":{"emoji":"📨","title":"Conversation Send","detailKeys":["conversationRef"]},"conversations_turn":{"emoji":"↔️","title":"Conversation Turn","detailKeys":["conversationRef","timeoutSeconds"]},"sessions_send":{"emoji":"📨","title":"Session Send","detailKeys":["label","sessionKey","agentId","timeoutSeconds"]},"sessions_history":{"emoji":"🧾","title":"Session History","detailKeys":["sessionKey","limit","includeTools"]},"sessions_search":{"emoji":"🔎","title":"Session Search","detailKeys":["query","sessionKey","limit"]},"transcripts":{"emoji":"🎙️","title":"Transcripts","actions":{"start":{"label":"start","detailKeys":["sessionId","title","providerId","accountId","guildId","channelId","meetingUrl"]},"stop":{"label":"stop","detailKeys":["sessionId"]},"status":{"label":"status"},"import":{"label":"import","detailKeys":["sessionId","title","providerId","meetingUrl","speakerLabel"]},"summarize":{"label":"summarize","detailKeys":["sessionId"]}}},"sessions_spawn":{"emoji":"🧑‍🔧","title":"Sub-agent","detailKeys":["label","task","agentId","model","thinking","runTimeoutSeconds","cleanup"]},"agents_wait":{"emoji":"⏳","title":"Wait for Agents","detailKeys":["ids","timeoutSeconds"]},"structured_output":{"emoji":"🧾","title":"Structured Output","detailKeys":["result"]},"subagents":{"emoji":"🤖","title":"Subagents","actions":{"list":{"label":"list","detailKeys":["recentMinutes"]},"kill":{"label":"kill","detailKeys":["target"]},"steer":{"label":"steer","detailKeys":["target"]}}},"agents_list":{"emoji":"🧭","title":"Agents","detailKeys":[]},"enterprise_specialists_list":{"emoji":"🧭","title":"Enterprise Specialists","detailKeys":[]},"enterprise_delegate":{"emoji":"🤝","title":"Enterprise Delegation","detailKeys":["decisionId"]},"skill_script":{"emoji":"🧩","title":"Skill Script","detailKeys":[]},"enterprise_knowledge_search":{"emoji":"🔎","title":"Enterprise Knowledge Search","detailKeys":["query","limit"]},"enterprise_knowledge_get":{"emoji":"📖","title":"Enterprise Knowledge","detailKeys":["citationId"]},"memory_search":{"emoji":"🧠","title":"Memory Search","detailKeys":["query"]},"memory_get":{"emoji":"📓","title":"Memory Get","detailKeys":["path","from","lines"]},"web_search":{"emoji":"🔎","title":"Web Search","detailKeys":["query","count"]},"web_fetch":{"emoji":"📄","title":"Web Fetch","detailKeys":["url","extractMode","maxChars"]},"code_execution":{"emoji":"🧮","title":"Code Execution","detailKeys":["task"]},"message":{"emoji":"✉️","title":"Message","actions":{"send":{"label":"send","detailKeys":["provider","to","media","replyTo","threadId"]},"poll":{"label":"poll","detailKeys":["provider","to","pollQuestion"]},"react":{"label":"react","detailKeys":["provider","to","messageId","emoji","remove"]},"reactions":{"label":"reactions","detailKeys":["provider","to","messageId","limit"]},"read":{"label":"read","detailKeys":["provider","to","limit"]},"edit":{"label":"edit","detailKeys":["provider","to","messageId"]},"delete":{"label":"delete","detailKeys":["provider","to","messageId"]},"pin":{"label":"pin","detailKeys":["provider","to","messageId"]},"unpin":{"label":"unpin","detailKeys":["provider","to","messageId"]},"list-pins":{"label":"list pins","detailKeys":["provider","to"]},"permissions":{"label":"permissions","detailKeys":["provider","channelId","to"]},"thread-create":{"label":"thread create","detailKeys":["provider","channelId","threadName"]},"thread-list":{"label":"thread list","detailKeys":["provider","guildId","channelId"]},"thread-reply":{"label":"thread reply","detailKeys":["provider","channelId","messageId"]},"search":{"label":"search","detailKeys":["provider","guildId","query"]},"sticker":{"label":"sticker","detailKeys":["provider","to","stickerId"]},"member-info":{"label":"member","detailKeys":["provider","guildId","userId"]},"role-info":{"label":"roles","detailKeys":["provider","guildId"]},"emoji-list":{"label":"emoji list","detailKeys":["provider","guildId"]},"emoji-upload":{"label":"emoji upload","detailKeys":["provider","guildId","emojiName"]},"sticker-upload":{"label":"sticker upload","detailKeys":["provider","guildId","stickerName"]},"role-add":{"label":"role add","detailKeys":["provider","guildId","userId","roleId"]},"role-remove":{"label":"role remove","detailKeys":["provider","guildId","userId","roleId"]},"channel-info":{"label":"channel","detailKeys":["provider","channelId"]},"channel-list":{"label":"channels","detailKeys":["provider","guildId"]},"voice-status":{"label":"voice","detailKeys":["provider","guildId","userId"]},"event-list":{"label":"events","detailKeys":["provider","guildId"]},"event-create":{"label":"event create","detailKeys":["provider","guildId","eventName"]},"timeout":{"label":"timeout","detailKeys":["provider","guildId","userId"]},"kick":{"label":"kick","detailKeys":["provider","guildId","userId"]},"ban":{"label":"ban","detailKeys":["provider","guildId","userId"]}}},"apply_patch":{"emoji":"🩹","title":"Apply Patch","detailKeys":[]},"image":{"emoji":"🖼️","title":"Image","detailKeys":["path","paths","url","urls","prompt","model"]},"view_image":{"emoji":"🖼️","title":"View Image","detailKeys":["path","paths","url","urls","prompt","model"]},"image_generate":{"emoji":"🎨","title":"Image Generation","actions":{"generate":{"label":"generate","detailKeys":["prompt","model","count","resolution","aspectRatio"]},"list":{"label":"list","detailKeys":["provider","model"]}}},"music_generate":{"emoji":"🎵","title":"Music Generation","actions":{"generate":{"label":"generate","detailKeys":["prompt","model","durationSeconds","format","instrumental"]},"list":{"label":"list","detailKeys":["provider","model"]}}},"video_generate":{"emoji":"🎬","title":"Video Generation","actions":{"generate":{"label":"generate","detailKeys":["prompt","model","durationSeconds","resolution","aspectRatio","audio","watermark"]},"list":{"label":"list","detailKeys":["provider","model"]}}},"pdf":{"emoji":"📑","title":"PDF","detailKeys":["path","paths","url","urls","prompt","pageRange","model"]},"sessions_yield":{"emoji":"⏸️","title":"Yield"},"tts":{"emoji":"🔊","title":"TTS","detailKeys":["text","channel"]}}`,
      )),
      (FQ = { version: 1, fallback: NQ, tools: PQ }));
  }))();
}
var LQ;
function RQ() {
  return (RQ = e(() => {
    (Je(),
      (LQ = $e`
  :host {
    --checked-icon-color: var(--wa-form-control-activated-color);
    --checked-icon-scale: 0.7;

    color: var(--wa-form-control-value-color);
    display: inline-flex;
    flex-direction: row;
    align-items: top;
    font-family: inherit;
    font-weight: var(--wa-form-control-value-font-weight);
    line-height: var(--wa-form-control-value-line-height);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }

  :host(:focus) {
    outline: none;
  }

  /* When the control isn't checked, hide the circle for Windows High Contrast mode a11y */
  :host(:not(:state(checked))) svg circle {
    opacity: 0;
  }

  [part~='label'] {
    display: inline;
  }

  [part~='hint'] {
    margin-block-start: 0.5em;
  }

  /* Default spacing for default appearance radios */
  :host([appearance='default']) {
    margin-block: 0.375em; /* Half of the original 0.75em gap on each side */
  }

  :host([appearance='default'][data-wa-radio-horizontal]) {
    margin-block: 0;
    margin-inline: 0.5em; /* Half of the original 1em gap on each side */
  }

  /* Remove margin from first/last items to prevent extra space */
  :host([appearance='default'][data-wa-radio-first]) {
    margin-block-start: 0;
    margin-inline-start: 0;
  }

  :host([appearance='default'][data-wa-radio-last]) {
    margin-block-end: 0;
    margin-inline-end: 0;
  }

  /* Button appearance have no spacing, they get handled by the overlap margins below */
  :host([appearance='button']) {
    margin: 0;
    align-items: center;
    min-height: var(--wa-form-control-height);
    background-color: var(--wa-color-surface-default);
    border: var(--wa-form-control-border-width) var(--wa-form-control-border-style) var(--wa-form-control-border-color);
    border-radius: var(--wa-border-radius-m);
    padding: 0 var(--wa-form-control-padding-inline);
    transition:
      background-color var(--wa-transition-fast),
      border-color var(--wa-transition-fast);
  }

  /* Default appearance */
  :host([appearance='default']) {
    .control {
      flex: 0 0 auto;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--wa-form-control-toggle-size);
      height: var(--wa-form-control-toggle-size);
      border-color: var(--wa-form-control-border-color);
      border-radius: 50%;
      border-style: var(--wa-form-control-border-style);
      border-width: var(--wa-form-control-border-width);
      background-color: var(--wa-form-control-background-color);
      color: transparent;
      transition:
        background var(--wa-transition-normal),
        border-color var(--wa-transition-fast),
        box-shadow var(--wa-transition-fast),
        color var(--wa-transition-fast);
      transition-timing-function: var(--wa-transition-easing);

      margin-inline-end: 0.5em;
    }

    .checked-icon {
      display: flex;
      fill: currentColor;
      width: var(--wa-form-control-toggle-size);
      height: var(--wa-form-control-toggle-size);
      scale: var(--checked-icon-scale);
    }
  }

  /* Button appearance */
  :host([appearance='button']) {
    .control {
      display: none;
    }
  }

  /* Checked */
  :host(:state(checked)) .control {
    color: var(--checked-icon-color);
    border-color: var(--wa-form-control-activated-color);
    background-color: var(--wa-form-control-background-color);
  }

  /* Focus */
  :host(:focus-visible) .control {
    outline: var(--wa-focus-ring);
    outline-offset: var(--wa-focus-ring-offset);
  }

  /* Disabled */
  :host(:state(disabled)) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Horizontal grouping - remove inner border radius */
  :host([appearance='button'][data-wa-radio-horizontal][data-wa-radio-inner]) {
    border-radius: 0;
  }

  :host([appearance='button'][data-wa-radio-horizontal][data-wa-radio-first]) {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }

  :host([appearance='button'][data-wa-radio-horizontal][data-wa-radio-last]) {
    border-start-start-radius: 0;
    border-end-start-radius: 0;
  }

  /* Vertical grouping - remove inner border radius */
  :host([appearance='button'][data-wa-radio-vertical][data-wa-radio-inner]) {
    border-radius: 0;
  }

  :host([appearance='button'][data-wa-radio-vertical][data-wa-radio-first]) {
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }

  :host([appearance='button'][data-wa-radio-vertical][data-wa-radio-last]) {
    border-start-start-radius: 0;
    border-start-end-radius: 0;
  }

  @media (hover: hover) {
    :host([appearance='button']:hover:not(:state(disabled), :state(checked))) {
      background-color: color-mix(in srgb, var(--wa-color-surface-default) 95%, var(--wa-color-mix-hover));
    }
  }

  :host([appearance='button']:focus-visible) {
    outline: var(--wa-focus-ring);
    outline-offset: var(--wa-focus-ring-offset);
  }

  :host([appearance='button']:state(checked)) {
    border-color: var(--wa-form-control-activated-color);
    background-color: var(--wa-color-brand-fill-quiet);
  }

  :host([appearance='button']:state(checked):focus-visible) {
    outline: var(--wa-focus-ring);
    outline-offset: var(--wa-focus-ring-offset);
  }

  /* Button overlap margins */
  :host([appearance='button'][data-wa-radio-horizontal]:not([data-wa-radio-first])) {
    margin-inline-start: calc(-1 * var(--wa-form-control-border-width));
  }

  :host([appearance='button'][data-wa-radio-vertical]:not([data-wa-radio-first])) {
    margin-block-start: calc(-1 * var(--wa-form-control-border-width));
  }

  /* Ensure interactive states are visible above adjacent buttons */
  :host([appearance='button']:hover),
  :host([appearance='button']:state(checked)) {
    position: relative;
    z-index: 1;
  }

  :host([appearance='button']:focus-visible) {
    z-index: 2;
  }
`));
  }))();
}
var zQ;
function BQ() {
  return (BQ = e(() => {
    (RQ(),
      _X(),
      Ue(),
      d(),
      te(),
      Ve(),
      Je(),
      Ye(),
      (zQ = class extends oe {
        constructor() {
          (super(),
            (this.checked = !1),
            (this.forceDisabled = !1),
            (this.appearance = `default`),
            (this.disabled = !1),
            (this.handleClick = () => {
              !this.disabled && !this.forceDisabled && (this.checked = !0);
            }),
            this.addEventListener(`click`, this.handleClick));
        }
        handleSizeChange() {
          h(this.localName, this.size);
        }
        connectedCallback() {
          (super.connectedCallback(), this.setInitialAttributes());
        }
        setInitialAttributes() {
          (this.setAttribute(`role`, `radio`),
            (this.tabIndex = 0),
            this.setAttribute(
              `aria-disabled`,
              this.disabled || this.forceDisabled ? `true` : `false`,
            ));
        }
        updated(e) {
          if (
            (super.updated(e),
            e.has(`checked`) &&
              (this.customStates.set(`checked`, this.checked),
              this.setAttribute(`aria-checked`, this.checked ? `true` : `false`),
              !this.disabled && !this.forceDisabled && (this.tabIndex = this.checked ? 0 : -1)),
            e.has(`disabled`) || e.has(`forceDisabled`))
          ) {
            let e = this.disabled || this.forceDisabled;
            (this.customStates.set(`disabled`, e),
              this.setAttribute(`aria-disabled`, e ? `true` : `false`),
              (this.tabIndex = e ? -1 : this.checked ? 0 : -1));
          }
        }
        setValue() {}
        render() {
          return Ke`
      <span part="control" class="control">
        ${
          this.checked
            ? Ke`
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" part="checked-icon" class="checked-icon">
                <circle cx="8" cy="8" r="8" />
              </svg>
            `
            : ``
        }
      </span>

      <slot part="label" class="label"></slot>
    `;
        }
      }),
      (zQ.css = [gX, ae, LQ]),
      g([tt()], zQ.prototype, `checked`, 2),
      g([tt()], zQ.prototype, `forceDisabled`, 2),
      g([_({ reflect: !0 })], zQ.prototype, `value`, 2),
      g([_({ reflect: !0 })], zQ.prototype, `appearance`, 2),
      g([_({ reflect: !0 })], zQ.prototype, `size`, 2),
      g([me(`size`)], zQ.prototype, `handleSizeChange`, 1),
      g([_({ type: Boolean })], zQ.prototype, `disabled`, 2),
      (zQ = g([Qe(`wa-radio`)], zQ)),
      zQ.disableWarning?.(`change-in-update`));
  }))();
}
function VQ() {
  return (VQ = e(() => {
    (BQ(), RQ(), _X(), Ue(), te(), l(), o(), He());
  }))();
}
var HQ;
function UQ() {
  return (UQ = e(() => {
    (Je(),
      (HQ = $e`
  .form-control {
    position: relative;
    border: none;
    padding: 0;
    margin: 0;
  }

  .label {
    padding: 0;
  }

  .radio-group-required .label::after {
    content: var(--wa-form-control-required-content);
    margin-inline-start: var(--wa-form-control-required-content-offset);
  }

  [part~='form-control-input'] {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 0; /* Radios handle their own spacing */
  }

  /* Horizontal */
  :host([orientation='horizontal']) [part~='form-control-input'] {
    flex-direction: row;
  }

  /* Help text */
  [part~='hint'] {
    margin-block-start: 0.5em;
  }
`));
  }))();
}
var WQ;
function GQ() {
  return (GQ = e(() => {
    (UQ(),
      hX(),
      _X(),
      Ie(),
      Ue(),
      le(),
      d(),
      te(),
      Ve(),
      Je(),
      Ye(),
      it(),
      (WQ = class extends oe {
        constructor() {
          (super(),
            (this.hasSlotController = new m(this, `hint`, `label`)),
            (this.label = ``),
            (this.hint = ``),
            (this.name = null),
            (this.disabled = !1),
            (this.orientation = `vertical`),
            (this._value = null),
            (this.defaultValue = this.getAttribute(`value`) || null),
            (this.required = !1),
            (this.withLabel = !1),
            (this.withHint = !1),
            (this.handleRadioClick = (e) => {
              let t = e.target.closest(`wa-radio`);
              if (!t || t.disabled || t.forceDisabled || this.disabled) return;
              let n = this.value;
              ((this.value = t.value), (t.checked = !0));
              let r = this.getAllRadios();
              for (let e of r) t !== e && ((e.checked = !1), e.setAttribute(`tabindex`, `-1`));
              this.value !== n &&
                this.updateComplete.then(() => {
                  (this.dispatchEvent(new InputEvent(`input`, { bubbles: !0, composed: !0 })),
                    this.dispatchEvent(new Event(`change`, { bubbles: !0, composed: !0 })));
                });
            }),
            this.addEventListener(`keydown`, this.handleKeyDown),
            this.addEventListener(`click`, this.handleRadioClick));
        }
        static get validators() {
          let e = [
            mX({
              validationElement: Object.assign(document.createElement(`input`), {
                required: !0,
                type: `radio`,
                name: Me(`__wa-radio`),
              }),
            }),
          ];
          return [...super.validators, ...e];
        }
        get value() {
          return this.valueHasChanged ? this._value : (this._value ?? this.defaultValue);
        }
        set value(e) {
          (typeof e == `number` && (e = String(e)), (this.valueHasChanged = !0), (this._value = e));
        }
        handleSizeChange() {
          h(this.localName, this.size);
        }
        get validationTarget() {
          let e = this.querySelector(`:is(wa-radio):not([disabled])`);
          if (e) return e;
        }
        updated(e) {
          (e.has(`disabled`) || e.has(`size`) || e.has(`value`) || e.has(`defaultValue`)) &&
            this.syncRadioElements();
        }
        formResetCallback(...e) {
          ((this._value = null), super.formResetCallback(...e), this.syncRadioElements());
        }
        getAllRadios() {
          return [...this.querySelectorAll(`wa-radio`)];
        }
        handleLabelClick() {
          this.focus();
        }
        async syncRadioElements() {
          let e = this.getAllRadios();
          if (
            (e.forEach((t, n) => {
              (this.size && t.setAttribute(`size`, this.size),
                t.toggleAttribute(`data-wa-radio-horizontal`, this.orientation !== `vertical`),
                t.toggleAttribute(`data-wa-radio-vertical`, this.orientation === `vertical`),
                t.toggleAttribute(`data-wa-radio-first`, n === 0),
                t.toggleAttribute(`data-wa-radio-inner`, n !== 0 && n !== e.length - 1),
                t.toggleAttribute(`data-wa-radio-last`, n === e.length - 1),
                (t.forceDisabled = this.disabled));
            }),
            await Promise.all(
              e.map(async (e) => {
                (await e.updateComplete, (e.checked = !e.disabled && e.value === this.value));
              }),
            ),
            this.disabled)
          )
            e.forEach((e) => {
              e.tabIndex = -1;
            });
          else {
            let t = e.filter((e) => !e.disabled),
              n = t.find((e) => e.checked);
            (t.length > 0 &&
              (n
                ? t.forEach((e) => {
                    e.tabIndex = e.checked ? 0 : -1;
                  })
                : t.forEach((e, t) => {
                    e.tabIndex = t === 0 ? 0 : -1;
                  })),
              e
                .filter((e) => e.disabled)
                .forEach((e) => {
                  e.tabIndex = -1;
                }));
          }
        }
        handleKeyDown(e) {
          if (
            ![`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, ` `].includes(e.key) ||
            this.disabled
          )
            return;
          let t = this.getAllRadios().filter((e) => !e.disabled);
          if (t.length <= 0) return;
          e.preventDefault();
          let n = this.value,
            r = t.find((e) => e.checked) ?? t[0],
            i = e.key === ` ` ? 0 : [`ArrowUp`, `ArrowLeft`].includes(e.key) ? -1 : 1,
            a = t.indexOf(r) + i;
          ((a ||= 0), a < 0 && (a = t.length - 1), a > t.length - 1 && (a = 0));
          let o = t.some((e) => e.tagName.toLowerCase() === `wa-radio-button`);
          (this.getAllRadios().forEach((e) => {
            ((e.checked = !1), o || e.setAttribute(`tabindex`, `-1`));
          }),
            (this.value = t[a].value),
            (t[a].checked = !0),
            o
              ? t[a].shadowRoot.querySelector(`button`).focus()
              : (t[a].setAttribute(`tabindex`, `0`), t[a].focus()),
            this.value !== n &&
              this.updateComplete.then(() => {
                (this.dispatchEvent(new InputEvent(`input`, { bubbles: !0, composed: !0 })),
                  this.dispatchEvent(new Event(`change`, { bubbles: !0, composed: !0 })));
              }),
            e.preventDefault());
        }
        focus(e) {
          if (this.disabled) return;
          let t = this.getAllRadios(),
            n = t.find((e) => e.checked),
            r = t.find((e) => !e.disabled),
            i = n || r;
          i && i.focus(e);
        }
        render() {
          let e = this.hasSlotController.test(`label`, `withLabel`),
            t = this.hasSlotController.test(`hint`, `withHint`),
            n = this.label ? !0 : !!e,
            r = this.hint ? !0 : !!t;
          return Ke`
      <fieldset
        part="form-control"
        class=${We({ "form-control": !0, "form-control-radio-group": !0, "form-control-has-label": n })}
        role="radiogroup"
        aria-labelledby="label"
        aria-describedby="hint"
        aria-errormessage="error-message"
        aria-orientation=${this.orientation}
      >
        <label
          part="form-control-label"
          id="label"
          class=${We({ label: !0, "has-label": n })}
          aria-hidden=${n ? `false` : `true`}
          @click=${this.handleLabelClick}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <slot part="form-control-input" @slotchange=${this.syncRadioElements}></slot>

        <slot
          id="hint"
          name="hint"
          part="hint"
          class=${We({ "has-slotted": r })}
          aria-hidden=${r ? `false` : `true`}
          >${this.hint}</slot
        >
      </fieldset>
    `;
        }
      }),
      (WQ.css = [ae, gX, HQ]),
      (WQ.shadowRootOptions = { ...oe.shadowRootOptions, delegatesFocus: !0 }),
      g([Ze(`slot:not([name])`)], WQ.prototype, `defaultSlot`, 2),
      g([_()], WQ.prototype, `label`, 2),
      g([_({ attribute: `hint` })], WQ.prototype, `hint`, 2),
      g([_({ reflect: !0 })], WQ.prototype, `name`, 2),
      g([_({ type: Boolean, reflect: !0 })], WQ.prototype, `disabled`, 2),
      g([_({ reflect: !0 })], WQ.prototype, `orientation`, 2),
      g([tt()], WQ.prototype, `value`, 1),
      g([_({ attribute: `value`, reflect: !0 })], WQ.prototype, `defaultValue`, 2),
      g([_({ reflect: !0 })], WQ.prototype, `size`, 2),
      g([me(`size`)], WQ.prototype, `handleSizeChange`, 1),
      g([_({ type: Boolean, reflect: !0 })], WQ.prototype, `required`, 2),
      g([_({ type: Boolean, attribute: `with-label` })], WQ.prototype, `withLabel`, 2),
      g([_({ type: Boolean, attribute: `with-hint` })], WQ.prototype, `withHint`, 2),
      (WQ = g([Qe(`wa-radio-group`)], WQ)),
      WQ.disableWarning?.(`change-in-update`));
  }))();
}
function KQ() {
  return (KQ = e(() => {
    (GQ(), BQ(), RQ(), UQ(), _X(), Ue(), te(), l(), o(), He());
  }))();
}
var qQ;
function JQ() {
  return (JQ = e(() => {
    (Je(),
      (qQ = $e`
  :host {
    --height: var(--wa-form-control-toggle-size);
    --width: calc(var(--height) * 1.75);
    --thumb-size: 0.75em;

    display: inline-flex;
    line-height: var(--wa-form-control-value-line-height);
  }

  label {
    position: relative;
    display: flex;
    align-items: center;
    font: inherit;
    color: var(--wa-form-control-value-color);
    vertical-align: middle;
    cursor: pointer;
  }

  .switch {
    flex: 0 0 auto;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--width);
    height: var(--height);
    background-color: var(--wa-form-control-background-color);
    border-color: var(--wa-form-control-border-color);
    border-radius: var(--height);
    border-style: var(--wa-form-control-border-style);
    border-width: var(--wa-form-control-border-width);
    transition-property: translate, background, border-color, box-shadow;
    transition-duration: var(--wa-transition-normal);
    transition-timing-function: var(--wa-transition-easing);
  }

  :host([did-ssr]:not(:defined)) .switch {
    transition-property: unset;
    transition-duration: unset;
    transition-timing-function: unset;
  }

  .switch .thumb {
    aspect-ratio: 1 / 1;
    width: var(--thumb-size);
    height: var(--thumb-size);
    background-color: var(--wa-form-control-border-color);
    border-radius: 50%;
    translate: calc((var(--width) - var(--height)) / -2);
    transition: inherit;
  }
  .switch .thumb:dir(rtl) {
    translate: calc((var(--width) - var(--height)) / 2);
  }

  .input {
    position: absolute;
    opacity: 0;
    padding: 0;
    margin: 0;
    pointer-events: none;
  }

  /* Focus */
  label:not(.disabled) .input:focus-visible ~ .switch .thumb {
    outline: var(--wa-focus-ring);
    outline-offset: var(--wa-focus-ring-offset);
  }

  /* Checked */
  .checked .switch {
    background-color: var(--wa-form-control-activated-color);
    border-color: var(--wa-form-control-activated-color);
  }

  .checked .switch .thumb {
    background-color: var(--wa-color-surface-default);
    translate: calc((var(--width) - var(--height)) / 2);
  }
  .checked .switch .thumb:dir(rtl) {
    translate: calc((var(--width) - var(--height)) / -2);
  }

  /* Disabled */
  label:has(> :disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  [part~='label'] {
    display: inline-block;
    line-height: var(--height);
    margin-inline-start: 0.5em;
    user-select: none;
    -webkit-user-select: none;
  }

  :host([required]) [part~='label']::after {
    content: var(--wa-form-control-required-content);
    color: var(--wa-form-control-required-content-color);
    margin-inline-start: var(--wa-form-control-required-content-offset);
  }

  @media (forced-colors: active) {
    :checked:enabled + .switch:hover .thumb,
    :checked + .switch .thumb {
      background-color: ButtonText;
    }
  }
`));
  }))();
}
var YQ;
function XQ() {
  return (XQ = e(() => {
    (JQ(),
      _X(),
      de(),
      Ue(),
      le(),
      d(),
      te(),
      Ce(),
      Ve(),
      Je(),
      Ye(),
      it(),
      Ge(),
      Xe(),
      (YQ = class extends oe {
        constructor() {
          (super(...arguments),
            (this.hasSlotController = new m(this, `hint`)),
            (this.localize = new we(this)),
            (this.title = ``),
            (this.name = null),
            (this._value = this.getAttribute(`value`) ?? null),
            (this.size = `m`),
            (this.disabled = !1),
            (this._checked = null),
            (this.defaultChecked = this.hasAttribute(`checked`)),
            (this.required = !1),
            (this.hint = ``),
            (this.withHint = !1));
        }
        static get validators() {
          return [...super.validators, i()];
        }
        get value() {
          return this._value ?? `on`;
        }
        set value(e) {
          this._value = e;
        }
        handleSizeChange() {
          h(this.localName, this.size);
        }
        get checked() {
          return this.valueHasChanged ? !!this._checked : (this._checked ?? this.defaultChecked);
        }
        set checked(e) {
          ((this._checked = !!e), (this.valueHasChanged = !0));
        }
        handleClick() {
          ((this.hasInteracted = !0),
            (this.checked = !this.checked),
            this.updateComplete.then(() => {
              this.dispatchEvent(new Event(`change`, { bubbles: !0, composed: !0 }));
            }));
        }
        handleKeyDown(e) {
          let t = this.localize.dir() === `rtl`;
          (e.key === `ArrowLeft` &&
            (e.preventDefault(),
            (this.checked = t),
            this.updateComplete.then(() => {
              (this.dispatchEvent(new Event(`change`, { bubbles: !0, composed: !0 })),
                this.dispatchEvent(new InputEvent(`input`, { bubbles: !0, composed: !0 })));
            })),
            e.key === `ArrowRight` &&
              (e.preventDefault(),
              (this.checked = !t),
              this.updateComplete.then(() => {
                (this.dispatchEvent(new Event(`change`, { bubbles: !0, composed: !0 })),
                  this.dispatchEvent(new InputEvent(`input`, { bubbles: !0, composed: !0 })));
              })));
        }
        willUpdate(e) {
          (super.willUpdate(e),
            (e.has(`value`) || e.has(`checked`) || e.has(`defaultChecked`) || e.has(`disabled`)) &&
              this.handleValueOrCheckedChange());
        }
        handleValueOrCheckedChange() {
          if (this.didSSR && !this.hasUpdated) {
            this.updateComplete.then(() => {
              this.handleValueOrCheckedChange();
            });
            return;
          }
          (this.setValue(this.checked ? this.value : null, this._value), this.updateValidity());
        }
        handleStateChange() {
          (this.hasUpdated && (this.input.checked = this.checked),
            this.customStates.set(`checked`, this.checked),
            this.updateValidity());
        }
        handleDisabledChange() {
          this.updateValidity();
        }
        click() {
          this.input.click();
        }
        focus(e) {
          this.input.focus(e);
        }
        blur() {
          this.input.blur();
        }
        setValue(e, t) {
          if (!this.checked) {
            this.internals.setFormValue(null, null);
            return;
          }
          this.internals.setFormValue(e ?? `on`, t);
        }
        formResetCallback() {
          ((this._checked = null), super.formResetCallback(), this.handleValueOrCheckedChange());
        }
        render() {
          let e = this.hasSlotController.test(`hint`, `withHint`),
            t = this.hint ? !0 : !!e,
            n = this.didSSR && !this.hasUpdated ? this.checked : this.defaultChecked,
            r = this.didSSR && !this.hasUpdated ? null : rt(this.checked);
          return Ke`
      <label
        part="base switch"
        class=${We({ checked: this.checked, disabled: this.disabled })}
      >
        <input
          class="input"
          type="checkbox"
          title=${this.title}
          name=${qe(this.name)}
          value=${qe(this.value)}
          .checked=${qe(r)}
          ?checked=${n}
          ?disabled=${this.disabled}
          ?required=${this.required}
          role="switch"
          aria-checked=${this.checked ? `true` : `false`}
          aria-describedby="hint"
          @click=${this.handleClick}
          @keydown=${this.handleKeyDown}
        />

        <span part="control" class="switch">
          <span part="thumb" class="thumb"></span>
        </span>

        <slot part="label" class="label"></slot>
      </label>

      <slot
        id="hint"
        name="hint"
        part="hint"
        class=${We({ "has-slotted": t })}
        aria-hidden=${t ? `false` : `true`}
        >${this.hint}</slot
      >
    `;
        }
      }),
      (YQ.shadowRootOptions = { ...oe.shadowRootOptions, delegatesFocus: !0 }),
      (YQ.css = [gX, ae, qQ]),
      g([Ze(`input[type="checkbox"]`)], YQ.prototype, `input`, 2),
      g([_()], YQ.prototype, `title`, 2),
      g([_({ reflect: !0 })], YQ.prototype, `name`, 2),
      g([_({ reflect: !0 })], YQ.prototype, `value`, 1),
      g([_({ reflect: !0 })], YQ.prototype, `size`, 2),
      g([me(`size`)], YQ.prototype, `handleSizeChange`, 1),
      g([_({ type: Boolean })], YQ.prototype, `disabled`, 2),
      g([_({ type: Boolean, attribute: !1 })], YQ.prototype, `checked`, 1),
      g(
        [_({ type: Boolean, attribute: `checked`, reflect: !0 })],
        YQ.prototype,
        `defaultChecked`,
        2,
      ),
      g([_({ type: Boolean, reflect: !0 })], YQ.prototype, `required`, 2),
      g([_({ attribute: `hint` })], YQ.prototype, `hint`, 2),
      g([_({ attribute: `with-hint`, type: Boolean })], YQ.prototype, `withHint`, 2),
      g([me([`checked`, `defaultChecked`])], YQ.prototype, `handleStateChange`, 1),
      g([me(`disabled`, { waitUntilFirstUpdate: !0 })], YQ.prototype, `handleDisabledChange`, 1),
      (YQ = g([Qe(`wa-switch`)], YQ)),
      YQ.disableWarning?.(`change-in-update`));
  }))();
}
function ZQ() {
  return (ZQ = e(() => {
    (XQ(), JQ(), _X(), Ue(), te(), He(), Ce(), ge());
  }))();
}
function QQ() {
  return (x$ ||= document.createElement(`div`).style);
}
function $Q(e) {
  if (C$[e]) return C$[e];
  let t = QQ();
  if (e in t) return (C$[e] = e);
  let n = e[0].toUpperCase() + e.slice(1),
    r = S$.length;
  for (; r--;) {
    let i = `${S$[r]}${n}`;
    if (i in t) return (C$[e] = i);
  }
}
function e$(e, t) {
  return parseFloat(t[$Q(e)]) || 0;
}
function t$(e, t, n = window.getComputedStyle(e)) {
  let r = t === `border` ? `Width` : ``;
  return {
    left: e$(`${t}Left${r}`, n),
    right: e$(`${t}Right${r}`, n),
    top: e$(`${t}Top${r}`, n),
    bottom: e$(`${t}Bottom${r}`, n),
  };
}
function n$(e, t, n) {
  e.style[$Q(t)] = n;
}
function r$(e, t) {
  n$(e, `transition`, `${$Q(`transform`)} ${t.duration}ms ${t.easing}`);
}
function i$(e, { x: t, y: n, scale: r, isSVG: i }, a) {
  if ((n$(e, `transform`, `scale(${r}) translate(${t}px, ${n}px)`), i && b$)) {
    let t = window.getComputedStyle(e).getPropertyValue(`transform`);
    e.setAttribute(`transform`, t);
  }
}
function a$(e) {
  let t = e.parentNode;
  (!t || t.nodeType !== 1) && (t = document.documentElement);
  let n = window.getComputedStyle(e),
    r = window.getComputedStyle(t),
    i = e.getBoundingClientRect(),
    a = t.getBoundingClientRect();
  return {
    elem: {
      style: n,
      width: i.width,
      height: i.height,
      top: i.top,
      bottom: i.bottom,
      left: i.left,
      right: i.right,
      margin: t$(e, `margin`, n),
      border: t$(e, `border`, n),
    },
    parent: {
      style: r,
      width: a.width,
      height: a.height,
      top: a.top,
      bottom: a.bottom,
      left: a.left,
      right: a.right,
      padding: t$(t, `padding`, r),
      border: t$(t, `border`, r),
    },
  };
}
function o$(e, t, n, r) {
  w$[e].split(` `).forEach((e) => {
    t.addEventListener(e, n, r);
  });
}
function s$(e, t, n) {
  w$[e].split(` `).forEach((e) => {
    t.removeEventListener(e, n);
  });
}
function c$(e, t) {
  let n = e.length;
  for (; n--;) if (e[n].pointerId === t.pointerId) return n;
  return -1;
}
function l$(e, t) {
  let n;
  if (t.touches) {
    n = 0;
    for (let r of t.touches) ((r.pointerId = n++), l$(e, r));
    return;
  }
  ((n = c$(e, t)), n > -1 && e.splice(n, 1), e.push(t));
}
function u$(e, t) {
  if (t.touches) {
    for (; e.length;) e.pop();
    return;
  }
  let n = c$(e, t);
  n > -1 && e.splice(n, 1);
}
function d$(e) {
  e = e.slice(0);
  let t = e.pop(),
    n;
  for (; (n = e.pop());)
    t = {
      clientX: (n.clientX - t.clientX) / 2 + t.clientX,
      clientY: (n.clientY - t.clientY) / 2 + t.clientY,
    };
  return t;
}
function f$(e) {
  if (e.length < 2) return 0;
  let t = e[0],
    n = e[1];
  return Math.sqrt(Math.abs(n.clientX - t.clientX) ** 2 + Math.abs(n.clientY - t.clientY) ** 2);
}
function p$(e) {
  let t = e;
  for (; t && t.parentNode;) {
    if (t.parentNode === document) return !0;
    t = t.parentNode instanceof ShadowRoot ? t.parentNode.host : t.parentNode;
  }
  return !1;
}
function m$(e) {
  return (e.getAttribute(`class`) || ``).trim();
}
function h$(e, t) {
  return e.nodeType === 1 && ` ${m$(e)} `.indexOf(` ${t} `) > -1;
}
function g$(e, t) {
  for (let n = e; n != null; n = n.parentNode)
    if (h$(n, t.excludeClass) || t.exclude.indexOf(n) > -1) return !0;
  return !1;
}
function _$(e) {
  return T$.test(e.namespaceURI) && e.nodeName.toLowerCase() !== `svg`;
}
function v$(e) {
  let t = {};
  for (let n in e) e.hasOwnProperty(n) && (t[n] = e[n]);
  return t;
}
function y$(e, t) {
  if (!e) throw Error(`Panzoom requires an element as an argument`);
  if (e.nodeType !== 1) throw Error(`Panzoom requires an element with a nodeType of 1`);
  if (!p$(e))
    throw Error(`Panzoom should be called on elements that have been attached to the DOM`);
  t = { ...E$, ...t };
  let n = _$(e),
    r = e.parentNode;
  ((r.style.overflow = t.overflow),
    (r.style.userSelect = `none`),
    (r.style.touchAction = t.touchAction),
    ((t.canvas ? r : e).style.cursor = t.cursor),
    (e.style.userSelect = `none`),
    (e.style.touchAction = t.touchAction),
    n$(e, `transformOrigin`, typeof t.origin == `string` ? t.origin : n ? `0 0` : `50% 50%`));
  function i() {
    ((r.style.overflow = ``),
      (r.style.userSelect = ``),
      (r.style.touchAction = ``),
      (r.style.cursor = ``),
      (e.style.cursor = ``),
      (e.style.userSelect = ``),
      (e.style.touchAction = ``),
      n$(e, `transformOrigin`, ``));
  }
  function a(n = {}) {
    for (let e in n) n.hasOwnProperty(e) && (t[e] = n[e]);
    ((n.hasOwnProperty(`cursor`) || n.hasOwnProperty(`canvas`)) &&
      ((r.style.cursor = e.style.cursor = ``), ((t.canvas ? r : e).style.cursor = t.cursor)),
      n.hasOwnProperty(`overflow`) && (r.style.overflow = n.overflow),
      n.hasOwnProperty(`touchAction`) &&
        ((r.style.touchAction = n.touchAction), (e.style.touchAction = n.touchAction)));
  }
  let o = 0,
    s = 0,
    c = 1,
    l = !1;
  (h(t.startScale, { animate: !1, force: !0 }),
    setTimeout(() => {
      m(t.startX, t.startY, { animate: !1, force: !0 });
    }));
  function u(t, n, r) {
    if (r.silent) return;
    let i = new CustomEvent(t, { detail: n });
    e.dispatchEvent(i);
  }
  function d(t, r, i) {
    let a = { x: o, y: s, scale: c, isSVG: n, originalEvent: i };
    return (
      requestAnimationFrame(() => {
        (typeof r.animate == `boolean` && (r.animate ? r$(e, r) : n$(e, `transition`, `none`)),
          r.setTransform(e, a, r),
          u(t, a, r),
          u(`panzoomchange`, a, r));
      }),
      a
    );
  }
  function f(n, r, i, a) {
    let l = { ...t, ...a },
      u = { x: o, y: s, opts: l };
    if (!a?.force && (l.disablePan || (l.panOnlyWhenZoomed && c === l.startScale))) return u;
    if (
      ((n = parseFloat(n)),
      (r = parseFloat(r)),
      l.disableXAxis || (u.x = (l.relative ? o : 0) + n),
      l.disableYAxis || (u.y = (l.relative ? s : 0) + r),
      l.contain)
    ) {
      let t = a$(e),
        n = t.elem.width / c,
        r = t.elem.height / c,
        a = n * i,
        o = r * i,
        s = (a - n) / 2,
        d = (o - r) / 2;
      if (l.contain === `inside`) {
        let e = (-t.elem.margin.left - t.parent.padding.left + s) / i,
          n =
            (t.parent.width -
              a -
              t.parent.padding.left -
              t.elem.margin.left -
              t.parent.border.left -
              t.parent.border.right +
              s) /
            i;
        u.x = Math.max(Math.min(u.x, n), e);
        let r = (-t.elem.margin.top - t.parent.padding.top + d) / i,
          c =
            (t.parent.height -
              o -
              t.parent.padding.top -
              t.elem.margin.top -
              t.parent.border.top -
              t.parent.border.bottom +
              d) /
            i;
        u.y = Math.max(Math.min(u.y, c), r);
      } else if (l.contain === `outside`) {
        let e =
            (-(a - t.parent.width) -
              t.parent.padding.left -
              t.parent.border.left -
              t.parent.border.right +
              s) /
            i,
          n = (s - t.parent.padding.left) / i;
        u.x = Math.max(Math.min(u.x, n), e);
        let r =
            (-(o - t.parent.height) -
              t.parent.padding.top -
              t.parent.border.top -
              t.parent.border.bottom +
              d) /
            i,
          c = (d - t.parent.padding.top) / i;
        u.y = Math.max(Math.min(u.y, c), r);
      }
    }
    return (l.roundPixels && ((u.x = Math.round(u.x)), (u.y = Math.round(u.y))), u);
  }
  function p(n, r) {
    let i = { ...t, ...r },
      a = { scale: c, opts: i };
    if (!r?.force && i.disableZoom) return a;
    let o = t.minScale,
      s = t.maxScale;
    if (i.contain) {
      let n = a$(e),
        r = n.elem.width / c,
        i = n.elem.height / c;
      if (r > 1 && i > 1) {
        let e = n.parent.width - n.parent.border.left - n.parent.border.right,
          a = n.parent.height - n.parent.border.top - n.parent.border.bottom,
          c = e / r,
          l = a / i;
        t.contain === `inside`
          ? (s = Math.min(s, c, l))
          : t.contain === `outside` && (o = Math.max(o, c, l));
      }
    }
    return ((a.scale = Math.min(Math.max(n, o), s)), a);
  }
  function m(e, t, r, i) {
    let a = f(e, t, c, r);
    return o !== a.x || s !== a.y
      ? ((o = a.x), (s = a.y), d(`panzoompan`, a.opts, i))
      : { x: o, y: s, scale: c, isSVG: n, originalEvent: i };
  }
  function h(e, t, n) {
    let r = p(e, t),
      i = r.opts;
    if (!t?.force && i.disableZoom) return;
    e = r.scale;
    let a = o,
      l = s;
    if (i.focal) {
      let t = i.focal;
      ((a = (t.x / e - t.x / c + o * e) / e), (l = (t.y / e - t.y / c + s * e) / e));
    }
    let u = f(a, l, e, { relative: !1, force: !0 });
    return ((o = u.x), (s = u.y), (c = e), d(`panzoomzoom`, i, n));
  }
  function ee(e, n) {
    let r = { ...t, animate: !0, ...n };
    return h(c * Math.exp((e ? 1 : -1) * r.step), r);
  }
  function te(e) {
    return ee(!0, e);
  }
  function ne(e) {
    return ee(!1, e);
  }
  function re(t, r, i, a) {
    let o = a$(e),
      s = {
        width:
          o.parent.width -
          o.parent.padding.left -
          o.parent.padding.right -
          o.parent.border.left -
          o.parent.border.right,
        height:
          o.parent.height -
          o.parent.padding.top -
          o.parent.padding.bottom -
          o.parent.border.top -
          o.parent.border.bottom,
      },
      l =
        r.clientX -
        o.parent.left -
        o.parent.padding.left -
        o.parent.border.left -
        o.elem.margin.left,
      u = r.clientY - o.parent.top - o.parent.padding.top - o.parent.border.top - o.elem.margin.top;
    n || ((l -= o.elem.width / c / 2), (u -= o.elem.height / c / 2));
    let d = { x: (l / s.width) * (s.width * t), y: (u / s.height) * (s.height * t) };
    return h(t, { ...i, animate: !1, focal: d }, a);
  }
  function ie(e, n) {
    e.preventDefault();
    let r = { ...t, ...n, animate: !1 },
      i = (e.deltaY === 0 && e.deltaX ? e.deltaX : e.deltaY) < 0 ? 1 : -1,
      a = p(c * Math.exp((i * r.step) / 3), r).scale;
    return re(a, e, r, e);
  }
  function ae(e) {
    let n = { ...t, animate: !0, force: !0, ...e };
    c = p(n.startScale, n).scale;
    let r = f(n.startX, n.startY, c, n);
    return ((o = r.x), (s = r.y), d(`panzoomreset`, n));
  }
  let oe,
    se,
    ce,
    le,
    ue,
    de,
    fe = [];
  function pe(e) {
    if (g$(e.target, t)) return;
    (l$(fe, e),
      (l = !0),
      t.handleStartEvent(e),
      (oe = o),
      (se = s),
      u(`panzoomstart`, { x: o, y: s, scale: c, isSVG: n, originalEvent: e }, t));
    let r = d$(fe);
    ((ce = r.clientX), (le = r.clientY), (ue = c), (de = f$(fe)));
  }
  function me(e) {
    if (!l || oe === void 0 || se === void 0 || ce === void 0 || le === void 0) return;
    l$(fe, e);
    let n = d$(fe),
      r = fe.length > 1,
      i = c;
    (r &&
      (de === 0 && (de = f$(fe)),
      (i = p(((f$(fe) - de) * t.step) / 80 + ue).scale),
      re(i, n, { animate: !1 }, e)),
      (!r || t.pinchAndPan) &&
        m(oe + (n.clientX - ce) / i, se + (n.clientY - le) / i, { animate: !1 }, e));
  }
  function he(e) {
    (fe.length === 1 && u(`panzoomend`, { x: o, y: s, scale: c, isSVG: n, originalEvent: e }, t),
      u$(fe, e),
      l && ((l = !1), (oe = se = ce = le = void 0)));
  }
  let ge = !1;
  function _e() {
    ge ||
      ((ge = !0),
      o$(`down`, t.canvas ? r : e, pe),
      o$(`move`, document, me, { passive: !0 }),
      o$(`up`, document, he, { passive: !0 }));
  }
  function g() {
    ((ge = !1), s$(`down`, t.canvas ? r : e, pe), s$(`move`, document, me), s$(`up`, document, he));
  }
  return (
    t.noBind || _e(),
    {
      bind: _e,
      destroy: g,
      eventNames: w$,
      getPan: () => ({ x: o, y: s }),
      getScale: () => c,
      getOptions: () => v$(t),
      handleDown: pe,
      handleMove: me,
      handleUp: he,
      pan: m,
      reset: ae,
      resetStyle: i,
      setOptions: a,
      setStyle: (t, n) => n$(e, t, n),
      zoom: h,
      zoomIn: te,
      zoomOut: ne,
      zoomToPoint: re,
      zoomWithWheel: ie,
    }
  );
}
var b$, x$, S$, C$, w$, T$, E$;
function D$() {
  return (D$ = e(() => {
    (typeof window < `u` &&
      (window.NodeList &&
        !NodeList.prototype.forEach &&
        (NodeList.prototype.forEach = Array.prototype.forEach),
      typeof window.CustomEvent != `function` &&
        (window.CustomEvent = function (e, t) {
          t ||= { bubbles: !1, cancelable: !1, detail: null };
          var n = document.createEvent(`CustomEvent`);
          return (n.initCustomEvent(e, t.bubbles, t.cancelable, t.detail), n);
        })),
      (b$ = typeof document < `u` && !!document.documentMode),
      (S$ = [`webkit`, `moz`, `ms`]),
      (C$ = {}),
      (w$ = { down: `mousedown`, move: `mousemove`, up: `mouseup mouseleave` }),
      typeof window < `u` &&
        (typeof window.PointerEvent == `function`
          ? (w$ = {
              down: `pointerdown`,
              move: `pointermove`,
              up: `pointerup pointerleave pointercancel`,
            })
          : typeof window.TouchEvent == `function` &&
            (w$ = { down: `touchstart`, move: `touchmove`, up: `touchend touchcancel` })),
      (T$ = /^http:[\w\.\/]+svg$/),
      (E$ = {
        animate: !1,
        canvas: !1,
        cursor: `move`,
        disablePan: !1,
        disableZoom: !1,
        disableXAxis: !1,
        disableYAxis: !1,
        duration: 200,
        easing: `ease-in-out`,
        exclude: [],
        excludeClass: `panzoom-exclude`,
        handleStartEvent: (e) => {
          (e.preventDefault(), e.stopPropagation());
        },
        maxScale: 4,
        minScale: 0.125,
        overflow: `hidden`,
        panOnlyWhenZoomed: !1,
        pinchAndPan: !1,
        relative: !1,
        setTransform: i$,
        startX: 0,
        startY: 0,
        startScale: 1,
        step: 0.3,
        touchAction: `none`,
      }),
      (y$.defaultOptions = E$));
  }))();
}
function O$(e, t, n) {
  let r = Array(e);
  return new Proxy(r, {
    get(r, i, a) {
      if (typeof i == `string`) {
        let a = i.charCodeAt(0);
        if (a >= 48 && a <= 57) {
          let a = +i;
          if (Number.isInteger(a) && a >= 0 && a < e) {
            let e = r[a];
            if (!e) {
              let i = t[a * 2];
              e = r[a] = {
                index: a,
                key: n(a),
                start: i,
                size: t[a * 2 + 1],
                end: i + t[a * 2 + 1],
                lane: 0,
              };
            }
            return e;
          }
        }
        if (i === `length`) return e;
      }
      return Reflect.get(r, i, a);
    },
  });
}
function k$(e, t, n) {
  let r = n.initialDeps ?? [],
    i,
    a = !0;
  function o() {
    let o = e();
    return o.length !== r.length || o.some((e, t) => r[t] !== e)
      ? ((r = o),
        (i = t(...o)),
        n?.onChange && !(a && n.skipInitialOnChange) && n.onChange(i),
        (a = !1),
        i)
      : i;
  }
  return (
    (o.updateDeps = (e) => {
      r = e;
    }),
    o
  );
}
function A$(e, t) {
  if (e === void 0) throw Error(`Unexpected undefined${t ? `: ${t}` : ``}`);
  return e;
}
var j$, M$;
function N$() {
  return (N$ = e(() => {
    ((j$ = (e, t) => Math.abs(e - t) < 1.01),
      (M$ = (e, t, n) => {
        let r;
        return function (...i) {
          (e.clearTimeout(r), (r = e.setTimeout(() => t.apply(this, i), n)));
        };
      }));
  }))();
}
function P$(e, t, n) {
  let r = 0;
  for (; r <= t;) {
    let i = ((r + t) / 2) | 0,
      a = e[i * 2];
    if (a < n) r = i + 1;
    else if (a > n) t = i - 1;
    else return i;
  }
  return r > 0 ? r - 1 : 0;
}
function F$(e, t, n, r, i) {
  let a = e.length - 1;
  if (e.length <= r) return { startIndex: 0, endIndex: a };
  if (r === 1 && i !== null) {
    let e = P$(i, a, n),
      r = e,
      o = n + t;
    for (; r < a && i[r * 2] + i[r * 2 + 1] < o;) r++;
    return { startIndex: e, endIndex: r };
  }
  let o = X$(0, a, (t) => e[t].start, n),
    s = o;
  if (r === 1) for (; s < a && e[s].end < n + t;) s++;
  else if (r > 1) {
    let i = Array(r).fill(0);
    for (; s < a && i.some((e) => e < n + t);) {
      let t = e[s];
      ((i[t.lane] = t.end), s++);
    }
    let c = Array(r).fill(n + t);
    for (; o >= 0 && c.some((e) => e >= n);) {
      let t = e[o];
      ((c[t.lane] = t.start), o--);
    }
    ((o = Math.max(0, o - (o % r))), (s = Math.min(a, s + (r - 1 - (s % r)))));
  }
  return { startIndex: o, endIndex: s };
}
var I$, L$, R$, z$, B$, V$, H$, U$, W$, G$, K$, q$, J$, Y$, X$;
function Z$() {
  return (Z$ = e(() => {
    (N$(),
      (L$ = () => {
        if (I$ !== void 0) return I$;
        if (typeof navigator > `u`) return (I$ = !1);
        if (/iP(hone|od|ad)/.test(navigator.userAgent)) return (I$ = !0);
        let e = navigator.maxTouchPoints;
        return (I$ = navigator.platform === `MacIntel` && e !== void 0 && e > 0);
      }),
      (R$ = (e) => {
        let { offsetWidth: t, offsetHeight: n } = e;
        return { width: t, height: n };
      }),
      (z$ = (e) => e),
      (B$ = (e) => {
        let t = Math.max(e.startIndex - e.overscan, 0),
          n = Math.min(e.endIndex + e.overscan, e.count - 1) - t + 1,
          r = Array(n);
        for (let e = 0; e < n; e++) r[e] = t + e;
        return r;
      }),
      (V$ = (e, t) => {
        let n = e.scrollElement;
        if (!n) return;
        let r = e.targetWindow;
        if (!r) return;
        let i = (e) => {
          let { width: n, height: r } = e;
          t({ width: Math.round(n), height: Math.round(r) });
        };
        if ((i(R$(n)), !r.ResizeObserver)) return () => {};
        let a = new r.ResizeObserver((t) => {
          let r = () => {
            let e = t[0];
            if (e?.borderBoxSize) {
              let t = e.borderBoxSize[0];
              if (t) {
                i({ width: t.inlineSize, height: t.blockSize });
                return;
              }
            }
            i(R$(n));
          };
          e.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(r) : r();
        });
        return (
          a.observe(n, { box: `border-box` }),
          () => {
            a.unobserve(n);
          }
        );
      }),
      (H$ = { passive: !0 }),
      (U$ = typeof window > `u` || `onscrollend` in window),
      (W$ = (e, t, n) => {
        let r = e.scrollElement;
        if (!r) return;
        let i = e.targetWindow;
        if (!i) return;
        let a = e.options.useScrollendEvent && U$,
          o = 0,
          s = a ? null : M$(i, () => t(o, !1), e.options.isScrollingResetDelay),
          c = (e) => () => {
            ((o = n(r)), s?.(), t(o, e));
          },
          l = c(!0),
          u = c(!1);
        return (
          r.addEventListener(`scroll`, l, H$),
          a && r.addEventListener(`scrollend`, u, H$),
          () => {
            (r.removeEventListener(`scroll`, l), a && r.removeEventListener(`scrollend`, u));
          }
        );
      }),
      (G$ = (e, t) =>
        W$(e, t, (t) => {
          let { horizontal: n, isRtl: r } = e.options;
          return n ? t.scrollLeft * ((r && -1) || 1) : t.scrollTop;
        })),
      (K$ = (e, t, n) => {
        if (n.options.useCachedMeasurements) {
          let t = n.indexFromElement(e),
            r = n.options.getItemKey(t);
          return n.itemSizeCache.get(r) ?? n.options.estimateSize(t);
        }
        if (t?.borderBoxSize) {
          let e = t.borderBoxSize[0];
          if (e) return Math.round(e[n.options.horizontal ? `inlineSize` : `blockSize`]);
        }
        if (!t) {
          let t = n.indexFromElement(e),
            r = n.options.getItemKey(t),
            i = n.itemSizeCache.get(r);
          if (i !== void 0) return i;
        }
        return e[n.options.horizontal ? `offsetWidth` : `offsetHeight`];
      }),
      (q$ = (e, { adjustments: t = 0, behavior: n }, r) => {
        var i, a;
        (a = (i = r.scrollElement)?.scrollTo) == null ||
          a.call(i, { [r.options.horizontal ? `left` : `top`]: e + t, behavior: n });
      }),
      (J$ = q$),
      (Y$ = class {
        constructor(e) {
          ((this.unsubs = []),
            (this.scrollElement = null),
            (this.targetWindow = null),
            (this.isScrolling = !1),
            (this.scrollState = null),
            (this.measurementsCache = []),
            (this._flatMeasurements = null),
            (this.itemSizeCache = new Map()),
            (this.itemSizeCacheVersion = 0),
            (this.laneAssignments = new Map()),
            (this.pendingMin = null),
            (this.prevLanes = void 0),
            (this.lanesChangedFlag = !1),
            (this.lanesSettling = !1),
            (this.pendingScrollAnchor = null),
            (this.scrollRect = null),
            (this.scrollOffset = null),
            (this.scrollDirection = null),
            (this.scrollAdjustments = 0),
            (this._iosDeferredAdjustment = 0),
            (this._iosTouching = !1),
            (this._iosJustTouchEnded = !1),
            (this._iosTouchEndTimerId = null),
            (this._intendedScrollOffset = null),
            (this.elementsCache = new Map()),
            (this.now = () => {
              var e;
              return (e = this.targetWindow?.performance)?.now?.call(e) ?? Date.now();
            }),
            (this.observer = (() => {
              let e = null,
                t = () =>
                  e ||
                  (!this.targetWindow || !this.targetWindow.ResizeObserver
                    ? null
                    : (e = new this.targetWindow.ResizeObserver((e) => {
                        e.forEach((e) => {
                          let t = () => {
                            let t = e.target,
                              n = this.indexFromElement(t);
                            if (!t.isConnected) {
                              this.observer.unobserve(t);
                              for (let [e, n] of this.elementsCache)
                                if (n === t) {
                                  this.elementsCache.delete(e);
                                  break;
                                }
                              return;
                            }
                            this.shouldMeasureDuringScroll(n) &&
                              this.resizeItem(n, this.options.measureElement(t, e, this));
                          };
                          this.options.useAnimationFrameWithResizeObserver
                            ? requestAnimationFrame(t)
                            : t();
                        });
                      })));
              return {
                disconnect: () => {
                  var n;
                  ((n = t()) == null || n.disconnect(), (e = null));
                },
                observe: (e) => t()?.observe(e, { box: `border-box` }),
                unobserve: (e) => t()?.unobserve(e),
              };
            })()),
            (this.range = null),
            (this.setOptions = (e) => {
              let t = {
                debug: !1,
                initialOffset: 0,
                overscan: 1,
                paddingStart: 0,
                paddingEnd: 0,
                scrollPaddingStart: 0,
                scrollPaddingEnd: 0,
                horizontal: !1,
                getItemKey: z$,
                rangeExtractor: B$,
                onChange: () => {},
                measureElement: K$,
                initialRect: { width: 0, height: 0 },
                scrollMargin: 0,
                gap: 0,
                indexAttribute: `data-index`,
                initialMeasurementsCache: [],
                lanes: 1,
                anchorTo: `start`,
                followOnAppend: !1,
                scrollEndThreshold: 1,
                isScrollingResetDelay: 150,
                enabled: !0,
                isRtl: !1,
                useScrollendEvent: !1,
                useAnimationFrameWithResizeObserver: !1,
                laneAssignmentMode: `estimate`,
                useCachedMeasurements: !1,
              };
              for (let n in e) {
                let r = e[n];
                r !== void 0 && (t[n] = r);
              }
              let n = this.options,
                r = null,
                i = null,
                a = !1;
              if (
                n !== void 0 &&
                n.enabled &&
                t.enabled &&
                t.anchorTo === `end` &&
                this.scrollElement !== null
              ) {
                let e = n.count,
                  o = t.count,
                  s = this.getMeasurements(),
                  c = e > 0 ? (s[0]?.key ?? n.getItemKey(0)) : null,
                  l = e > 0 ? (s[e - 1]?.key ?? n.getItemKey(e - 1)) : null;
                if (
                  o !== e ||
                  (e > 0 && o > 0 && (t.getItemKey(0) !== c || t.getItemKey(o - 1) !== l))
                ) {
                  a = !0;
                  let c =
                    e > 0 ? (this.getVirtualItemForOffset(this.getScrollOffset()) ?? s[0]) : null;
                  c && (r = [c.key, this.getScrollOffset() - c.start]);
                  let u = t.followOnAppend === !0 ? `auto` : t.followOnAppend || null;
                  u &&
                    o > e &&
                    this.isAtEnd(n.scrollEndThreshold) &&
                    (e === 0 || t.getItemKey(o - 1) !== l) &&
                    (i = u);
                }
              }
              ((this.options = t), a && ((this.pendingMin = 0), this.itemSizeCacheVersion++));
              let o = !1,
                s = 0;
              if (r && this.scrollOffset !== null) {
                let [e, t] = r,
                  n = this.getMeasurements(),
                  { count: i, getItemKey: a } = this.options,
                  c = 0;
                for (; c < i && a(c) !== e;) c++;
                if (c < i) {
                  let e = n[c];
                  if (e) {
                    let n = Math.max(0, e.start + t);
                    n !== this.scrollOffset &&
                      ((s = n - this.scrollOffset), (this.scrollOffset = n), (o = !0));
                  }
                }
              }
              (o || i) && (this.pendingScrollAnchor = [o ? r[0] : null, o ? r[1] : 0, i, s]);
            }),
            (this.notify = (e) => {
              var t, n;
              (n = (t = this.options).onChange) == null || n.call(t, this, e);
            }),
            (this.maybeNotify = k$(
              () => (
                this.calculateRange(),
                [
                  this.isScrolling,
                  this.range ? this.range.startIndex : null,
                  this.range ? this.range.endIndex : null,
                ]
              ),
              (e) => {
                this.notify(e);
              },
              {
                key: !1,
                debug: () => this.options.debug,
                initialDeps: [
                  this.isScrolling,
                  this.range ? this.range.startIndex : null,
                  this.range ? this.range.endIndex : null,
                ],
              },
            )),
            (this.cleanup = () => {
              (this.unsubs.filter(Boolean).forEach((e) => e()),
                (this.unsubs = []),
                this.observer.disconnect(),
                this.rafId != null &&
                  this.targetWindow &&
                  (this.targetWindow.cancelAnimationFrame(this.rafId), (this.rafId = null)),
                (this.scrollState = null),
                (this._iosDeferredAdjustment = 0),
                (this._iosTouching = !1),
                (this._iosJustTouchEnded = !1),
                (this.scrollElement = null),
                (this.targetWindow = null));
            }),
            (this._didMount = () => () => {
              this.cleanup();
            }),
            (this._willUpdate = () => {
              let e = this.options.enabled ? this.options.getScrollElement() : null;
              if (this.scrollElement !== e) {
                if ((this.cleanup(), !e)) {
                  this.maybeNotify();
                  return;
                }
                if (
                  ((this.scrollElement = e),
                  (this.targetWindow =
                    this.scrollElement && `ownerDocument` in this.scrollElement
                      ? this.scrollElement.ownerDocument.defaultView
                      : (this.scrollElement?.window ?? null)),
                  this.elementsCache.forEach((e) => {
                    this.observer.observe(e);
                  }),
                  this.unsubs.push(
                    this.options.observeElementRect(this, (e) => {
                      ((this.scrollRect = e), this.maybeNotify());
                    }),
                  ),
                  this.unsubs.push(
                    this.options.observeElementOffset(this, (e, t) => {
                      if (t && this._intendedScrollOffset === null && e === this.scrollOffset)
                        return;
                      (this._intendedScrollOffset !== null &&
                        Math.abs(e - this._intendedScrollOffset) < 1.5 &&
                        (e = this._intendedScrollOffset),
                        (this._intendedScrollOffset = null),
                        (this.scrollAdjustments = 0));
                      let n = this.getScrollOffset();
                      ((this.scrollDirection = t
                        ? n === e
                          ? this.scrollDirection
                          : n < e
                            ? `forward`
                            : `backward`
                        : null),
                        (this.scrollOffset = e),
                        (this.isScrolling = t),
                        this._flushIosDeferredIfReady(),
                        this.scrollState && this.scheduleScrollReconcile(),
                        this.maybeNotify());
                    }),
                  ),
                  `addEventListener` in this.scrollElement)
                ) {
                  let e = this.scrollElement,
                    t = () => {
                      ((this._iosTouching = !0),
                        (this._iosJustTouchEnded = !1),
                        this._iosTouchEndTimerId !== null &&
                          this.targetWindow != null &&
                          (this.targetWindow.clearTimeout(this._iosTouchEndTimerId),
                          (this._iosTouchEndTimerId = null)));
                    },
                    n = () => {
                      ((this._iosTouching = !1),
                        !(!L$() || this.targetWindow == null) &&
                          ((this._iosJustTouchEnded = !0),
                          (this._iosTouchEndTimerId = this.targetWindow.setTimeout(() => {
                            ((this._iosJustTouchEnded = !1),
                              (this._iosTouchEndTimerId = null),
                              this._flushIosDeferredIfReady());
                          }, 150))));
                    };
                  (e.addEventListener(`touchstart`, t, H$),
                    e.addEventListener(`touchend`, n, H$),
                    this.unsubs.push(() => {
                      (e.removeEventListener(`touchstart`, t),
                        e.removeEventListener(`touchend`, n),
                        this._iosTouchEndTimerId !== null &&
                          this.targetWindow != null &&
                          (this.targetWindow.clearTimeout(this._iosTouchEndTimerId),
                          (this._iosTouchEndTimerId = null)));
                    }));
                }
                this._scrollToOffset(this.getScrollOffset(), {
                  adjustments: void 0,
                  behavior: void 0,
                });
              }
              let t = this.pendingScrollAnchor;
              if (
                ((this.pendingScrollAnchor = null), t && this.scrollElement && this.options.enabled)
              ) {
                let [e, n, r, i] = t;
                (e !== null &&
                  !r &&
                  (L$() && (this.isScrolling || this._iosTouching || this._iosJustTouchEnded)
                    ? i !== 0 && (this._iosDeferredAdjustment += i)
                    : this._scrollToOffset(this.getScrollOffset(), {
                        adjustments: void 0,
                        behavior: void 0,
                      })),
                  r && this.scrollToEnd({ behavior: r }));
              }
            }),
            (this._flushIosDeferredIfReady = () => {
              if (
                this._iosDeferredAdjustment === 0 ||
                this.isScrolling ||
                this._iosTouching ||
                this._iosJustTouchEnded
              )
                return;
              let e = this.getScrollOffset(),
                t = this.getMaxScrollOffset();
              if (e < 0 || e > t) return;
              if (this._iosDeferredAdjustment < 0 && e >= t - 1) {
                this._iosDeferredAdjustment = 0;
                return;
              }
              let n = this._iosDeferredAdjustment;
              ((this._iosDeferredAdjustment = 0),
                this._scrollToOffset(e, {
                  adjustments: (this.scrollAdjustments += n),
                  behavior: void 0,
                }));
            }),
            (this.rafId = null),
            (this.getSize = () =>
              this.options.enabled
                ? ((this.scrollRect = this.scrollRect ?? this.options.initialRect),
                  this.scrollRect[this.options.horizontal ? `width` : `height`])
                : ((this.scrollRect = null), 0)),
            (this.getScrollOffset = () =>
              this.options.enabled
                ? ((this.scrollOffset =
                    this.scrollOffset ??
                    (typeof this.options.initialOffset == `function`
                      ? this.options.initialOffset()
                      : this.options.initialOffset)),
                  this.scrollOffset)
                : ((this.scrollOffset = null), 0)),
            (this.getMeasurementOptions = k$(
              () => [
                this.options.count,
                this.options.paddingStart,
                this.options.scrollMargin,
                this.options.getItemKey,
                this.options.enabled,
                this.options.lanes,
                this.options.laneAssignmentMode,
                this.options.gap,
              ],
              (e, t, n, r, i, a, o, s) => (
                this.prevLanes !== void 0 && this.prevLanes !== a && (this.lanesChangedFlag = !0),
                (this.prevLanes = a),
                (this.pendingMin = null),
                {
                  count: e,
                  paddingStart: t,
                  scrollMargin: n,
                  getItemKey: r,
                  enabled: i,
                  lanes: a,
                  laneAssignmentMode: o,
                  gap: s,
                }
              ),
              { key: !1 },
            )),
            (this.getMeasurements = k$(
              () => [this.getMeasurementOptions(), this.itemSizeCacheVersion],
              (
                {
                  count: e,
                  paddingStart: t,
                  scrollMargin: n,
                  getItemKey: r,
                  enabled: i,
                  lanes: a,
                  laneAssignmentMode: o,
                  gap: s,
                },
                c,
              ) => {
                let l = this.itemSizeCache;
                if (!i)
                  return (
                    (this.measurementsCache = []),
                    this.itemSizeCache.clear(),
                    this.laneAssignments.clear(),
                    []
                  );
                if (this.laneAssignments.size > e)
                  for (let t of this.laneAssignments.keys())
                    t >= e && this.laneAssignments.delete(t);
                (this.lanesChangedFlag &&
                  ((this.lanesChangedFlag = !1),
                  (this.lanesSettling = !0),
                  (this.measurementsCache = []),
                  this.itemSizeCache.clear(),
                  this.laneAssignments.clear(),
                  (this.pendingMin = null)),
                  this.measurementsCache.length === 0 &&
                    !this.lanesSettling &&
                    ((this.measurementsCache = this.options.initialMeasurementsCache),
                    this.measurementsCache.forEach((e) => {
                      this.itemSizeCache.set(e.key, e.size);
                    })));
                let u = this.lanesSettling ? 0 : (this.pendingMin ?? 0);
                if (
                  ((this.pendingMin = null),
                  this.lanesSettling &&
                    this.measurementsCache.length === e &&
                    (this.lanesSettling = !1),
                  a === 1)
                ) {
                  let i = e * 2,
                    a = this._flatMeasurements;
                  if (!a || a.length < i) {
                    let e = new Float64Array(i);
                    (a && u > 0 && e.set(a.subarray(0, u * 2)),
                      (a = e),
                      (this._flatMeasurements = a));
                  }
                  let o;
                  if (u === 0) o = t + n;
                  else {
                    let e = u - 1;
                    o = a[e * 2] + a[e * 2 + 1] + s;
                  }
                  for (let t = u; t < e; t++) {
                    let e = r(t),
                      n = l.get(e),
                      i = typeof n == `number` ? n : this.options.estimateSize(t);
                    ((a[t * 2] = o), (a[t * 2 + 1] = i), (o += i + s));
                  }
                  let c = O$(e, a, r);
                  return ((this.measurementsCache = c), c);
                }
                let d = this.measurementsCache.slice(0, u),
                  f = Array(a).fill(void 0),
                  p = new Float64Array(a),
                  m = 0;
                for (let e = 0; e < u; e++) {
                  let t = d[e];
                  t && (f[t.lane] === void 0 && m++, (f[t.lane] = e), (p[t.lane] = t.end));
                }
                for (let i = u; i < e; i++) {
                  let e = r(i),
                    c = this.laneAssignments.get(i),
                    u,
                    h,
                    ee = o === `estimate` || l.has(e);
                  if (c !== void 0 && this.options.lanes > 1) {
                    u = c;
                    let e = f[u],
                      r = e === void 0 ? void 0 : d[e];
                    h = r ? r.end + s : t + n;
                  } else if (m === a) {
                    let e = 0,
                      t = p[0],
                      n = f[0];
                    for (let r = 1; r < a; r++) {
                      let i = p[r];
                      (i < t || (i === t && f[r] < n)) && ((e = r), (t = i), (n = f[r]));
                    }
                    ((u = e), (h = t + s), ee && this.laneAssignments.set(i, u));
                  } else
                    ((u = i % this.options.lanes),
                      (h = t + n),
                      ee && this.laneAssignments.set(i, u));
                  let te = l.get(e),
                    ne = typeof te == `number` ? te : this.options.estimateSize(i),
                    re = h + ne;
                  ((d[i] = { index: i, start: h, size: ne, end: re, key: e, lane: u }),
                    f[u] === void 0 && m++,
                    (f[u] = i),
                    (p[u] = re));
                }
                return ((this.measurementsCache = d), d);
              },
              { key: !1, debug: () => this.options.debug },
            )),
            (this.calculateRange = k$(
              () => [
                this.getMeasurements(),
                this.getSize(),
                this.getScrollOffset(),
                this.options.lanes,
              ],
              (e, t, n, r) =>
                e.length === 0 || t === 0
                  ? ((this.range = null), null)
                  : ((this.range = F$(
                      e,
                      t,
                      n,
                      r,
                      r === 1 && this._flatMeasurements != null ? this._flatMeasurements : null,
                    )),
                    this.range),
              { key: !1, debug: () => this.options.debug },
            )),
            (this.getVirtualIndexes = k$(
              () => {
                let e = null,
                  t = null,
                  n = this.calculateRange();
                return (
                  n && ((e = n.startIndex), (t = n.endIndex)),
                  this.maybeNotify.updateDeps([this.isScrolling, e, t]),
                  [this.options.rangeExtractor, this.options.overscan, this.options.count, e, t]
                );
              },
              (e, t, n, r, i) =>
                r === null || i === null
                  ? []
                  : e({ startIndex: r, endIndex: i, overscan: t, count: n }),
              { key: !1, debug: () => this.options.debug },
            )),
            (this.indexFromElement = (e) => {
              let t = this.options.indexAttribute,
                n = e.getAttribute(t);
              return n
                ? parseInt(n, 10)
                : (console.warn(`Missing attribute name '${t}={index}' on measured element.`), -1);
            }),
            (this.shouldMeasureDuringScroll = (e) => {
              if (!this.scrollState || this.scrollState.behavior !== `smooth`) return !0;
              let t =
                this.scrollState.index ??
                this.getVirtualItemForOffset(this.scrollState.lastTargetOffset)?.index;
              if (t !== void 0 && this.range) {
                let n = Math.max(
                    this.options.overscan,
                    Math.ceil((this.range.endIndex - this.range.startIndex) / 2),
                  ),
                  r = Math.max(0, t - n),
                  i = Math.min(this.options.count - 1, t + n);
                return e >= r && e <= i;
              }
              return !0;
            }),
            (this.measureElement = (e) => {
              if (!e) {
                this.elementsCache.forEach((e, t) => {
                  e.isConnected || (this.observer.unobserve(e), this.elementsCache.delete(t));
                });
                return;
              }
              let t = this.indexFromElement(e),
                n = this.options.getItemKey(t),
                r = this.elementsCache.get(n);
              (r !== e &&
                (r && this.observer.unobserve(r),
                this.observer.observe(e),
                this.elementsCache.set(n, e)),
                (!this.isScrolling || this.scrollState) &&
                  this.shouldMeasureDuringScroll(t) &&
                  this.resizeItem(t, this.options.measureElement(e, void 0, this)));
            }),
            (this.resizeItem = (e, t) => {
              if (e < 0 || e >= this.options.count) return;
              let n,
                r,
                i,
                a = this._flatMeasurements;
              if (this.options.lanes === 1 && a !== null)
                ((i = this.options.getItemKey(e)), (r = a[e * 2]), (n = a[e * 2 + 1]));
              else {
                let t = this.measurementsCache[e];
                if (!t) return;
                ((i = t.key), (r = t.start), (n = t.size));
              }
              let o = this.itemSizeCache.get(i) ?? n,
                s = t - o;
              if (s !== 0) {
                let a =
                    this.options.anchorTo === `end` &&
                    this.scrollState?.behavior !== `smooth` &&
                    this.getVirtualDistanceFromEnd() <= this.options.scrollEndThreshold,
                  c = a ? this.getTotalSize() : 0,
                  l = this.getScrollOffset() + this.scrollAdjustments,
                  u = this.itemSizeCache.has(i)
                    ? r + o <= l && this.scrollDirection !== `backward`
                    : r < l,
                  d =
                    this.scrollState?.behavior !== `smooth` &&
                    (this.shouldAdjustScrollPositionOnItemSizeChange === void 0
                      ? u
                      : this.shouldAdjustScrollPositionOnItemSizeChange(
                          this.measurementsCache[e] ?? {
                            index: e,
                            key: i,
                            start: r,
                            size: n,
                            end: r + n,
                            lane: 0,
                          },
                          s,
                          this,
                        ));
                ((this.pendingMin === null || e < this.pendingMin) && (this.pendingMin = e),
                  this.itemSizeCache.set(i, t),
                  this.itemSizeCacheVersion++);
                let f = !1;
                (a
                  ? (f = this.applyScrollAdjustment(this.getTotalSize() - c))
                  : d && (f = this.applyScrollAdjustment(s)),
                  this.notify(f));
              }
            }),
            (this.getVirtualItems = k$(
              () => [this.getVirtualIndexes(), this.getMeasurements()],
              (e, t) => {
                let n = [];
                for (let r = 0, i = e.length; r < i; r++) {
                  let i = t[e[r]];
                  n.push(i);
                }
                return n;
              },
              { key: !1, debug: () => this.options.debug },
            )),
            (this.getVirtualItemForOffset = (e) => {
              let t = this.getMeasurements();
              if (t.length === 0) return;
              let n = this._flatMeasurements,
                r = this.options.lanes === 1 && n != null;
              return A$(t[X$(0, t.length - 1, r ? (e) => n[e * 2] : (e) => A$(t[e]).start, e)]);
            }),
            (this.getMaxScrollOffset = () => {
              if (!this.scrollElement) return 0;
              if (`scrollHeight` in this.scrollElement)
                return this.options.horizontal
                  ? this.scrollElement.scrollWidth - this.scrollElement.clientWidth
                  : this.scrollElement.scrollHeight - this.scrollElement.clientHeight;
              {
                let e = this.scrollElement.document.documentElement;
                return this.options.horizontal
                  ? e.scrollWidth - this.scrollElement.innerWidth
                  : e.scrollHeight - this.scrollElement.innerHeight;
              }
            }),
            (this.getVirtualDistanceFromEnd = () =>
              Math.max(this.getTotalSize() - this.getSize() - this.getScrollOffset(), 0)),
            (this.getDistanceFromEnd = () =>
              Math.max(this.getMaxScrollOffset() - this.getScrollOffset(), 0)),
            (this.isAtEnd = (e = this.options.scrollEndThreshold) =>
              this.getDistanceFromEnd() <= e),
            (this.getOffsetForAlignment = (e, t, n = 0) => {
              if (!this.scrollElement) return 0;
              let r = this.getSize(),
                i = this.getScrollOffset();
              (t === `auto` && (t = e >= i + r ? `end` : `start`),
                t === `center` ? (e += (n - r) / 2) : t === `end` && (e -= r));
              let a = this.getMaxScrollOffset();
              return Math.max(Math.min(a, e), 0);
            }),
            (this.getOffsetForIndex = (e, t = `auto`) => {
              e = Math.max(0, Math.min(e, this.options.count - 1));
              let n = this.getSize(),
                r = this.getScrollOffset(),
                i = this.measurementsCache[e];
              if (!i) return;
              if (t === `auto`) {
                if (i.end >= r + n - this.options.scrollPaddingEnd) t = `end`;
                else if (i.start <= r + this.options.scrollPaddingStart) t = `start`;
                else return [r, t];
              }
              if (t === `end` && e === this.options.count - 1)
                return [this.getMaxScrollOffset(), t];
              let a =
                t === `end`
                  ? i.end + this.options.scrollPaddingEnd
                  : i.start - this.options.scrollPaddingStart;
              return [this.getOffsetForAlignment(a, t, i.size), t];
            }),
            (this.scrollToOffset = (e, { align: t = `start`, behavior: n = `auto` } = {}) => {
              this._iosDeferredAdjustment = 0;
              let r = this.getOffsetForAlignment(e, t),
                i = this.now();
              ((this.scrollState = {
                index: null,
                align: t,
                behavior: n,
                startedAt: i,
                lastTargetOffset: r,
                stableFrames: 0,
              }),
                this._scrollToOffset(r, { adjustments: void 0, behavior: n }),
                this.scheduleScrollReconcile());
            }),
            (this.scrollToIndex = (e, { align: t = `auto`, behavior: n = `auto` } = {}) => {
              ((this._iosDeferredAdjustment = 0),
                (e = Math.max(0, Math.min(e, this.options.count - 1))));
              let r = this.getOffsetForIndex(e, t);
              if (!r) return;
              let [i, a] = r,
                o = this.now();
              ((this.scrollState = {
                index: e,
                align: a,
                behavior: n,
                startedAt: o,
                lastTargetOffset: i,
                stableFrames: 0,
              }),
                this._scrollToOffset(i, { adjustments: void 0, behavior: n }),
                this.scheduleScrollReconcile());
            }),
            (this.scrollBy = (e, { behavior: t = `auto` } = {}) => {
              let n = this.getScrollOffset() + e,
                r = this.now();
              ((this.scrollState = {
                index: null,
                align: `start`,
                behavior: t,
                startedAt: r,
                lastTargetOffset: n,
                stableFrames: 0,
              }),
                this._scrollToOffset(n, { adjustments: void 0, behavior: t }),
                this.scheduleScrollReconcile());
            }),
            (this.scrollToEnd = ({ behavior: e = `auto` } = {}) => {
              if (this.options.count > 0) {
                this.scrollToIndex(this.options.count - 1, { align: `end`, behavior: e });
                return;
              }
              this.scrollToOffset(Math.max(this.getTotalSize() - this.getSize(), 0), {
                behavior: e,
              });
            }),
            (this.getTotalSize = () => {
              let e = this.getMeasurements(),
                t;
              if (e.length === 0) t = this.options.paddingStart;
              else if (this.options.lanes === 1) {
                let n = e.length - 1,
                  r = this._flatMeasurements;
                t = r == null ? (e[n]?.end ?? 0) : r[n * 2] + r[n * 2 + 1];
              } else {
                let n = Array(this.options.lanes).fill(null),
                  r = e.length - 1;
                for (; r >= 0 && n.some((e) => e === null);) {
                  let t = e[r];
                  (n[t.lane] === null && (n[t.lane] = t.end), r--);
                }
                t = Math.max(...n.filter((e) => e !== null));
              }
              return Math.max(t - this.options.scrollMargin + this.options.paddingEnd, 0);
            }),
            (this.takeSnapshot = () => {
              let e = [];
              if (this.itemSizeCache.size === 0) return e;
              let t = this.getMeasurements();
              for (let n of t)
                n &&
                  this.itemSizeCache.has(n.key) &&
                  e.push({
                    index: n.index,
                    key: n.key,
                    start: n.start,
                    size: n.size,
                    end: n.end,
                    lane: n.lane,
                  });
              return e;
            }),
            (this._scrollToOffset = (e, { adjustments: t, behavior: n }) => {
              ((this._intendedScrollOffset = e + (t ?? 0)),
                this.options.scrollToFn(e, { behavior: n, adjustments: t }, this));
            }),
            (this.measure = () => {
              ((this.pendingMin = null),
                this.itemSizeCache.clear(),
                this.laneAssignments.clear(),
                this.itemSizeCacheVersion++,
                this.notify(!1));
            }),
            this.setOptions(e));
        }
        applyScrollAdjustment(e, t) {
          return e === 0
            ? !1
            : L$() && (this.isScrolling || this._iosTouching || this._iosJustTouchEnded)
              ? ((this._iosDeferredAdjustment += e), !1)
              : (this._scrollToOffset(this.getScrollOffset(), {
                  adjustments: (this.scrollAdjustments += e),
                  behavior: t,
                }),
                this.scrollOffset !== null &&
                  ((this.scrollOffset += this.scrollAdjustments),
                  this.scrollOffset < 0 && (this.scrollOffset = 0),
                  (this.scrollAdjustments = 0)),
                !0);
        }
        scheduleScrollReconcile() {
          if (!this.targetWindow) {
            this.scrollState = null;
            return;
          }
          this.rafId ??= this.targetWindow.requestAnimationFrame(() => {
            ((this.rafId = null), this.reconcileScroll());
          });
        }
        reconcileScroll() {
          if (!this.scrollState || !this.scrollElement) return;
          if (this.now() - this.scrollState.startedAt > 5e3) {
            this.scrollState = null;
            return;
          }
          let e =
              this.scrollState.index == null
                ? void 0
                : this.getOffsetForIndex(this.scrollState.index, this.scrollState.align),
            t = e ? e[0] : this.scrollState.lastTargetOffset,
            n = t !== this.scrollState.lastTargetOffset;
          if (!n && j$(t, this.getScrollOffset())) {
            if ((this.scrollState.stableFrames++, this.scrollState.stableFrames >= 1)) {
              (this.getScrollOffset() !== t &&
                this._scrollToOffset(t, { adjustments: void 0, behavior: `auto` }),
                (this.scrollState = null));
              return;
            }
          } else if (((this.scrollState.stableFrames = 0), n)) {
            let e = this.getSize() || 600,
              n = Math.abs(t - this.getScrollOffset()),
              r = this.scrollState.behavior === `smooth` && n > e;
            ((this.scrollState.lastTargetOffset = t),
              r || (this.scrollState.behavior = `auto`),
              this._scrollToOffset(t, { adjustments: void 0, behavior: r ? `smooth` : `auto` }));
          }
          this.scheduleScrollReconcile();
        }
      }),
      (X$ = (e, t, n, r) => {
        for (; e <= t;) {
          let i = ((e + t) / 2) | 0,
            a = n(i);
          if (a < r) e = i + 1;
          else if (a > r) t = i - 1;
          else return i;
        }
        return e > 0 ? e - 1 : 0;
      }));
  }))();
}
var Q$, $$;
function e1() {
  return (e1 = e(() => {
    (Z$(),
      (Q$ = class {
        constructor(e, t) {
          this.cleanup = () => {};
          let n = {
            ...t,
            onChange: (e, n) => {
              var r;
              (this.host.updateComplete.then(() => this.host.requestUpdate()),
                (r = t.onChange) == null || r.call(t, e, n));
            },
          };
          ((this.virtualizer = new Y$(n)), (this.host = e).addController(this));
        }
        getVirtualizer() {
          return this.virtualizer;
        }
        hostConnected() {
          this.cleanup = this.virtualizer._didMount();
        }
        hostUpdated() {
          this.virtualizer._willUpdate();
        }
        hostDisconnected() {
          this.cleanup();
        }
      }),
      ($$ = class extends Q$ {
        constructor(e, t) {
          super(e, { observeElementRect: V$, observeElementOffset: G$, scrollToFn: J$, ...t });
        }
      }));
  }))();
}
function t1() {
  return (t1 = e(() => {
    (ve(), se(), He(), Ce(), ge());
  }))();
}
export {
  qq as $,
  $Y as A,
  Bn as At,
  fJ as B,
  Lt as Bt,
  gX as C,
  BL as Ct,
  pX as D,
  ch as Dt,
  hX as E,
  BI as Et,
  _Y as F,
  en as Ft,
  iJ as G,
  ut as Gt,
  uJ as H,
  Mt as Ht,
  oY as I,
  Bt as It,
  $q as J,
  rJ as K,
  ct as Kt,
  rY as L,
  Vt as Lt,
  KY as M,
  rn as Mt,
  GY as N,
  nn as Nt,
  fX as O,
  lh as Ot,
  sY as P,
  tn as Pt,
  Wq as Q,
  iY as R,
  vt as Rt,
  GX as S,
  FV as St,
  mX as T,
  zI as Tt,
  cJ as U,
  Nt as Ut,
  lJ as V,
  Et as Vt,
  oJ as W,
  dt as Wt,
  tJ as X,
  Qq as Y,
  Zq as Z,
  jQ as _,
  EH as _t,
  B$ as a,
  Fq as at,
  KX as b,
  yH as bt,
  V$ as c,
  Aq as ct,
  ZQ as d,
  Oq as dt,
  Kq as et,
  KQ as f,
  mq as ft,
  MQ as g,
  CH as gt,
  FQ as h,
  $H as ht,
  Y$ as i,
  Rq as it,
  eX as j,
  tr as jt,
  dX as k,
  D as kt,
  y$ as l,
  kq as lt,
  IQ as m,
  kH as mt,
  $$ as n,
  Yq as nt,
  Z$ as o,
  Pq as ot,
  VQ as p,
  wq as pt,
  nJ as q,
  e1 as r,
  Xq as rt,
  K$ as s,
  jq as st,
  t1 as t,
  Gq as tt,
  D$ as u,
  xq as ut,
  OQ as v,
  SH as vt,
  _X as w,
  hL as wt,
  JX as x,
  AV as xt,
  kQ as y,
  vH as yt,
  aY as z,
  kt as zt,
};
//# sourceMappingURL=control-ui-boot-CIjwt-AI.js.map
