import {
  C as Dt,
  D as Ot,
  S as kt,
  _ as At,
  g as jt,
  k as Mt,
  p as Nt,
  y as Pt,
} from "./config-runtime-DfcY45Be.js";
import {
  C as zn,
  D as Bn,
  E as Vn,
  O as Hn,
  S as Un,
  T as Wn,
  b as Gn,
  g as Kn,
  h as qn,
  it as Jn,
  k as Yn,
  m as Xn,
  p as Zn,
  rt as Qn,
  v as $n,
  w as er,
  x as tr,
  y as nr,
} from "./control-ui-boot-4F0V1byh.js";
import { n as Ut, t as Wt } from "./control-ui-boot-adV0af1C.js";
import { a as N, g as jn, h as Mn, n as Nn, r as Pn, t as Fn } from "./control-ui-boot-BbQ-8EFH.js";
import {
  $a as Ft,
  Qa as It,
  Sn as Lt,
  ho as Rt,
  i as A,
  lo as zt,
  o as Bt,
  uo as Vt,
  xn as Ht,
} from "./control-ui-boot-BkPDmfcr.js";
import {
  Bt as vt,
  Gt as k,
  Ht as yt,
  Kt as bt,
  M as xt,
  N as St,
  Rt as Ct,
  Wt as wt,
} from "./control-ui-boot-CIjwt-AI.js";
import {
  Cr as Gt,
  Dr as Kt,
  Jn as qt,
  Mo as Jt,
  Qn as Yt,
  Qr as Xt,
  Sr as Zt,
  Xn as Qt,
  Xr as $t,
  Zn as en,
  Zr as tn,
  br as nn,
  ca as rn,
  fr as an,
  hr as on,
  ia as j,
  ln as sn,
  on as cn,
  oo as ln,
  pr as un,
  so as dn,
  vr as fn,
  wr as pn,
  xn as mn,
  xr as hn,
  yr as gn,
} from "./control-ui-boot-D1_QZILW.js";
import { Jt as rr, qt as ir } from "./control-ui-boot-DBYHHRMP.js";
import {
  C as _n,
  D as vn,
  E as yn,
  O as bn,
  Q as xn,
  _ as Sn,
  a as Cn,
  d as wn,
  f as Tn,
  g as En,
  i as Dn,
  k as On,
  nt as M,
  u as kn,
  w as An,
} from "./control-ui-boot-DJiLHUhu.js";
import {
  C as ar,
  D as or,
  E as sr,
  g as cr,
  m as lr,
  w as ur,
} from "./control-ui-boot-DkB48Nei.js";
import { C as In, D as Ln, w as Rn } from "./control-ui-boot-DWMwnn3C.js";
import {
  Bo as le,
  C as ue,
  Ca as S,
  Ci as de,
  D as fe,
  Dr as pe,
  E as me,
  Ko as he,
  L as ge,
  M as _e,
  Mr as ve,
  Or as ye,
  Qo as be,
  R as xe,
  Ro as Se,
  Rr as Ce,
  Sa as we,
  Si as Te,
  T as Ee,
  Wo as C,
  Xo as De,
  Yo as Oe,
  _ as ke,
  cs as Ae,
  es as je,
  g as Me,
  gi as Ne,
  ii as Pe,
  is as Fe,
  j as Ie,
  jr as Le,
  kr as Re,
  ni as ze,
  ns as Be,
  nt as Ve,
  pi as He,
  qo as Ue,
  rt as We,
  ss as Ge,
  ts as Ke,
  wi as qe,
  xa as w,
  y as Je,
  yi as Ye,
  zo as T,
} from "./control-ui-core-B5rJKETr.js";
import {
  Dn as Xe,
  Fn as Ze,
  Gr as Qe,
  Kr as $e,
  Mn as et,
  Pn as tt,
  Rn as nt,
  S as rt,
  Vr as it,
  Xn as at,
  Z as ot,
  Zn as st,
  kt as ct,
  oi as lt,
  qn as ut,
  wt as dt,
  x as ft,
  z as pt,
  zn as mt,
} from "./control-ui-core-BOclcphE.js";
import { o as O, t as _t } from "./control-ui-core-k5VGv3wu.js";
import {
  $ as t,
  Bt as n,
  Ht as r,
  I as i,
  Lt as a,
  Nr as o,
  Oi as s,
  P as c,
  Pr as l,
  Ti as u,
  Vt as d,
  Wt as f,
  Zt as p,
  ai as m,
  ci as h,
  di as g,
  dn as _,
  fn as v,
  gn as y,
  ji as b,
  ki as x,
  mi as ee,
  mn as te,
  nn as ne,
  pi as re,
  tt as ie,
  ui as ae,
  un as oe,
  xn as se,
  zt as ce,
} from "./control-ui-foundation-CUUNgsy7.js";
import { a as Tt, r as Et } from "./gateway-runtime-CzCgK0eB.js";
import { G as E, J as D, K as ht, W as gt } from "./lit-runtime-BZcFnh9F.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function dr(e) {
  return Promise.all([...gr].map((t) => Promise.resolve(t(e)))).then(() => void 0);
}
function fr() {
  try {
    (localStorage.setItem(hr, String(++_r)), localStorage.removeItem(hr));
  } catch {}
}
function pr(e) {
  let t = dr(e);
  return (fr(), t);
}
function mr(e) {
  return (gr.add(e), () => gr.delete(e));
}
var hr, gr, _r;
function vr() {
  return (vr = e(() => {
    ((hr = `openclaw.control.chatSnapshots.invalidate.v1`),
      (gr = new Set()),
      (_r = 0),
      typeof window < `u` &&
        window.addEventListener(`storage`, (e) => {
          e.key === hr &&
            e.newValue !== null &&
            dr({}).catch((e) => {
              console.error(`[chat-snapshot-cache] cross-tab invalidation failed`, e);
            });
        }));
  }))();
}
function yr() {
  let e = pr({});
  return xr().then(async ({ clearStoredChatSnapshotStorage: t }) => {
    (await e, await t());
  });
}
function br(e, t) {
  return xr().then(({ deleteStoredChatSnapshot: n, resolveChatSnapshotKey: r }) =>
    Promise.all(
      t.map(({ key: t, agentId: i }) =>
        n(r({ ...e, assistantAgentId: i ?? e.assistantAgentId }, { sessionKey: t, agentId: i })),
      ),
    ).then(() => void 0),
  );
}
var xr;
function Sr() {
  return (Sr = e(() => {
    (vr(),
      l(),
      (xr = () =>
        o(() => import(`./session-snapshot-invalidation-DopsXwT0.js`), [], import.meta.url)));
  }))();
}
function Cr(e, t, n) {
  let r = new URLSearchParams(e.search),
    i = new URLSearchParams(e.hash.startsWith(`#`) ? e.hash.slice(1) : ``);
  if (r.has(`session`) || i.has(`session`)) return !1;
  let a = n(e.pathname, t);
  return a !== null && a !== `chat` ? !1 : lt(e.pathname, t) === null;
}
function wr(e, t) {
  return e.pathname === t.pathname && e.search === t.search && e.hash === t.hash;
}
async function Tr(e) {
  let t = await e.initialLocationReady;
  return (
    !wr(e.history.location(), t) &&
      e.shouldInstallLocation?.() !== !1 &&
      (e.installLocation ? await e.installLocation(t) : e.history.replace(t)),
    e.enabled
      ? Er({
          context: e.context,
          isStillDefaultLanding: () => wr(e.history.location(), t),
          redirect:
            e.redirect ?? (() => e.context.replace(`model-setup`, { search: `?firstRun=1` })),
          onInitialDecision: e.onInitialDecision ?? (() => void 0),
        })
      : (e.onInitialDecision?.(), () => void 0)
  );
}
function Er(e) {
  let t = !1,
    n = () => {
      t || ((t = !0), e.onInitialDecision());
    },
    r = (r) => {
      if (t) return;
      if (r.phase !== `connected`) {
        (r.hello || r.phase === `reload-required` || r.phase === `stopped`) && n();
        return;
      }
      let i = r.hello ? Ft(r.hello) : void 0,
        a = e.context.agentSelection.state.selectedId?.trim() || null,
        o = i?.defaultAgentId?.trim() || null,
        s = a === null || a === o;
      (Xe(r.hello?.auth ?? null) &&
        Tt(r, `openclaw.setup.detect`) === !0 &&
        i?.modelConfigured === !1 &&
        s &&
        e.isStillDefaultLanding() &&
        e.redirect(),
        n());
    },
    i = e.context.gateway.subscribe(r);
  return (
    r(e.context.gateway.snapshot),
    () => {
      (i(), n());
    }
  );
}
function Dr() {
  return (Dr = e(() => {
    ($e(), It(), et(), Et());
  }))();
}
function P(e, t) {
  if (!e.has(t)) return;
  let n = e.get(t);
  return (e.delete(t), e.set(t, n), n);
}
function F(e, t, n) {
  for (e.delete(t), e.set(t, n); e.size > 20;) {
    let t = e.keys().next().value;
    if (typeof t != `string`) break;
    e.delete(t);
  }
}
function Or(e, t, n) {
  if (e.has(t)) return P(e, t);
  let r = n();
  return (F(e, t, r), r);
}
function kr() {
  return (kr = e(() => {}))();
}
function Ar(e, t) {
  t === void 0
    ? console.debug(`[chat-snapshot-cache] ${e}`)
    : console.debug(`[chat-snapshot-cache] ${e}`, t);
}
function jr() {
  try {
    return globalThis.indexedDB ?? null;
  } catch (e) {
    return (Ar(`IndexedDB is unavailable`, e), null);
  }
}
function Mr(e) {
  return new Promise((t, n) => {
    let r = e.open(Lr, zr);
    (r.addEventListener(`upgradeneeded`, () => {
      let e = r.result;
      for (let t of Array.from(e.objectStoreNames)) e.deleteObjectStore(t);
      (e.createObjectStore(I, { keyPath: `sessionKey` }),
        e.createObjectStore(Rr, { keyPath: `sessionKey` }));
    }),
      r.addEventListener(`success`, () => t(r.result)),
      r.addEventListener(`error`, () => n(r.error ?? Error(`IndexedDB open failed`))),
      r.addEventListener(`blocked`, () => n(Error(`IndexedDB open was blocked`))));
  });
}
function Nr(e) {
  return new Promise((t) => {
    try {
      let n = e.deleteDatabase(Lr);
      (n.addEventListener(`success`, () => t(!0)),
        n.addEventListener(`error`, () => t(!1)),
        n.addEventListener(`blocked`, () => t(!1)));
    } catch {
      t(!1);
    }
  });
}
async function Pr() {
  let e = jr();
  if (!e) return null;
  let t;
  try {
    t = await Mr(e);
  } catch (n) {
    if ((Ar(`resetting cache after IndexedDB open failure`, n), !(await Nr(e)))) return null;
    try {
      t = await Mr(e);
    } catch (e) {
      return (Ar(`IndexedDB cache remains unavailable`, e), null);
    }
  }
  if (
    (t.addEventListener(`versionchange`, () => t.close()),
    t.objectStoreNames.length === 2 &&
      t.objectStoreNames.contains(`snapshots`) &&
      t.objectStoreNames.contains(`snapshotMetadata`))
  )
    return t;
  if ((t.close(), Ar(`resetting cache after IndexedDB schema mismatch`), !(await Nr(e))))
    return null;
  try {
    let t = await Mr(e);
    return (t.addEventListener(`versionchange`, () => t.close()), t);
  } catch (e) {
    return (Ar(`IndexedDB cache reset failed`, e), null);
  }
}
async function Fr(e) {
  e?.close();
  let t = jr();
  t && !(await Nr(t)) && Ar(`IndexedDB cache reset was blocked`);
}
async function Ir(e) {
  let t = await Pr();
  if (t)
    try {
      await new Promise((n) => {
        let r = t.transaction([I, Rr], `readwrite`);
        (r.addEventListener(`complete`, () => n()),
          r.addEventListener(`error`, () => n()),
          r.addEventListener(`abort`, () => n()),
          r.objectStore(I).delete(e),
          r.objectStore(Rr).delete(e));
      });
    } catch {
    } finally {
      t.close();
    }
}
var Lr, I, Rr, zr;
function Br() {
  return (Br = e(() => {
    ((Lr = `openclaw-chat-snapshots`), (I = `snapshots`), (Rr = `snapshotMetadata`), (zr = 2));
  }))();
}
function L(e, t) {
  let n = De(t.sessionKey),
    r = t.agentId?.trim(),
    i = r ? u(r) : n ? u(n.agentId) : Ue(t.sessionKey) ? Fe(e) : Ke(e),
    a = Oe(t.sessionKey),
    o = n ? a.split(`:`).slice(2).join(`:`) : a,
    s = je(e);
  return `agent:${i}:${Ue(t.sessionKey) || o === `main` || o === s ? Se : o}`;
}
function Vr() {
  try {
    return globalThis.indexedDB ?? null;
  } catch {
    return null;
  }
}
async function Hr(e) {
  (await pr({ sessionKey: e }), await Ir(e));
}
async function Ur() {
  let e = Vr();
  if (e)
    try {
      await new Promise((t) => {
        let n = e.deleteDatabase(Lr);
        (n.addEventListener(`success`, () => t()),
          n.addEventListener(`error`, () => t()),
          n.addEventListener(`blocked`, () => t()));
      });
    } catch {}
}
async function Wr() {
  (await pr({}), await Ur());
}
function Gr() {
  return (Gr = e(() => {
    (C(), Br(), vr());
  }))();
}
function Kr(e, t) {
  mi.set(e, t);
}
function qr(e, t) {
  (e.delete(t), mi.get(e)?.delete(t));
}
function Jr(e, t) {
  ((e.chatMessages = t.messages),
    (e.chatHistoryPagination = t.pagination),
    (e.currentSessionId = t.sessionId),
    (e.chatDisplayedLeafEntryId = t.displayedLeafEntryId));
}
function Yr(e, t, n) {
  mi.get(e)?.write(t, n);
}
function Xr(e, t, n, r, i) {
  let a = L(t, n),
    o = P(e, a);
  if (!o) return;
  if (i) {
    let t = pi.get(e);
    if ((t || ((t = new WeakSet()), pi.set(e, t)), t.has(i))) return;
    t.add(i);
  }
  let s = ai(r);
  if (s === null) {
    qr(e, a);
    return;
  }
  let c = i
      ? yt(Ct({}, o.snapshot.messages), {
          type: `messagePersisted`,
          message: r,
          envelope: i,
        }).messages.slice()
      : [...o.snapshot.messages, r],
    l = {
      ...(o.snapshot.deltaCursor === void 0 ? {} : { deltaCursor: o.snapshot.deltaCursor }),
      ...(Object.hasOwn(o.snapshot, `displayedLeafEntryId`)
        ? { displayedLeafEntryId: o.snapshot.displayedLeafEntryId }
        : {}),
      messages: c,
      pagination: o.snapshot.pagination,
      sessionId: o.snapshot.sessionId,
    };
  if (i) {
    $r(e, t, n, l);
    return;
  }
  let u = o.weight + s + +(o.snapshot.messages.length > 0);
  if (u > ui) {
    $r(e, t, n, l);
    return;
  }
  (F(e, a, { snapshot: l, weight: u }), li(e), Yr(e, a, l));
}
function Zr(e, t, n) {
  return ei(e, t, n)?.messages ?? [];
}
function Qr(e, t, n) {
  qr(e, L(t, n));
}
function $r(e, t, n, r) {
  let i = L(t, n),
    a = P(e, i);
  if (
    a?.snapshot.messages === r.messages &&
    a.snapshot.deltaCursor === r.deltaCursor &&
    a.snapshot.sessionId === r.sessionId &&
    a.snapshot.displayedLeafEntryId === r.displayedLeafEntryId &&
    ci(a.snapshot.pagination, r.pagination)
  )
    return;
  if (
    r.messages.length === 0 &&
    r.sessionId === null &&
    !r.pagination.hasMore &&
    (r.pagination.totalMessages ?? 0) === 0 &&
    r.pagination.completeSnapshot !== !0
  ) {
    qr(e, i);
    return;
  }
  let o = ni(r);
  if (!o) {
    qr(e, i);
    return;
  }
  (F(e, i, o), li(e), Yr(e, i, o.snapshot));
}
function ei(e, t, n) {
  return P(e, L(t, n))?.snapshot ?? null;
}
function ti(e) {
  let t = ri(e.messages);
  return t
    ? ii(
        e.deltaCursor,
        e.pagination,
        e.sessionId,
        e.displayedLeafEntryId,
        t.reduce((e, t) => e + t, 0),
        t.length,
      )
    : null;
}
function ni(e) {
  let t = ri(e.messages);
  if (!t) return null;
  let n = t.reduce((e, t) => e + t, 0),
    r = 0;
  for (;;) {
    let i = r === 0 ? e.pagination : oi(e.pagination, e.messages, r);
    if (!i) return null;
    let a = ii(e.deltaCursor, i, e.sessionId, e.displayedLeafEntryId, n, t.length - r);
    if (a !== null && a <= ui)
      return r === 0
        ? { snapshot: e, weight: a }
        : {
            snapshot: {
              ...(e.deltaCursor === void 0 ? {} : { deltaCursor: e.deltaCursor }),
              ...(Object.hasOwn(e, `displayedLeafEntryId`)
                ? { displayedLeafEntryId: e.displayedLeafEntryId }
                : {}),
              messages: e.messages.slice(r),
              pagination: { ...i },
              sessionId: e.sessionId,
            },
            weight: a,
          };
    if (r >= e.messages.length) return null;
    let o = bt(e.messages[r]);
    if (((n -= t[r] ?? 0), (r += 1), o !== null))
      for (; r < e.messages.length && bt(e.messages[r]) === o;) ((n -= t[r] ?? 0), (r += 1));
  }
}
function ri(e) {
  let t = [];
  for (let n of e) {
    let e = ai(n);
    if (e === null) return null;
    t.push(e);
  }
  return t;
}
function ii(e, t, n, r, i, a) {
  let o = si({
    ...(e === void 0 ? {} : { deltaCursor: e }),
    ...(r === void 0 ? {} : { displayedLeafEntryId: r }),
    messages: [],
    pagination: t,
    sessionId: n,
  });
  return o === null ? null : o + i + Math.max(0, a - 1);
}
function ai(e) {
  if (e && typeof e == `object`) {
    let t = fi.get(e);
    if (t !== void 0) return t;
  }
  try {
    let t = JSON.stringify([e]),
      n = t ? Math.max(0, t.length - 2) : 0;
    return (e && typeof e == `object` && fi.set(e, n), n);
  } catch {
    return null;
  }
}
function oi(e, t, n = 0) {
  let r = e.totalMessages,
    i = null;
  for (let e = n; e < t.length && ((i = bt(t[e])), i === null); e += 1);
  if (typeof r != `number` || i === null) return null;
  let a = r - i + 1;
  return a <= 0
    ? null
    : i > 1
      ? { hasMore: !0, nextOffset: a, totalMessages: r }
      : { hasMore: !1, totalMessages: r };
}
function si(e) {
  try {
    return JSON.stringify(e)?.length ?? 0;
  } catch {
    return null;
  }
}
function ci(e, t) {
  return e.hasMore !== t.hasMore || e.totalMessages !== t.totalMessages
    ? !1
    : e.hasMore && t.hasMore
      ? e.nextOffset === t.nextOffset
      : !e.hasMore && !t.hasMore && e.completeSnapshot === t.completeSnapshot;
}
function li(e) {
  let t = 0;
  for (let n of e.values()) t += n.weight;
  for (; t > di;) {
    let n = e.keys().next().value;
    if (typeof n != `string`) break;
    ((t -= e.get(n)?.weight ?? 0), e.delete(n));
  }
}
var ui, di, fi, pi, mi;
function hi() {
  return (hi = e(() => {
    (vt(),
      wt(),
      kr(),
      Gr(),
      (ui = 12582912),
      (di = 25165824),
      (fi = new WeakMap()),
      (pi = new WeakMap()),
      (mi = new WeakMap()));
  }))();
}
function gi(e, t) {
  let n = [],
    r = e.trim();
  r && n.push({ type: `text`, text: r });
  for (let e of t ?? []) {
    let t = In(e);
    if (!t) continue;
    if (e.mimeType.startsWith(`image/`)) {
      n.push({ type: `image`, url: t, source: { type: `url`, url: t } });
      continue;
    }
    let r = e.mimeType.trim().toLowerCase(),
      i =
        r.startsWith(`video/`) ||
        ((r === `` || r === `application/octet-stream`) && ln(e.fileName ?? ``));
    n.push({
      type: `attachment`,
      attachment: {
        url: t,
        kind: e.mimeType.startsWith(`audio/`) ? `audio` : i ? `video` : `document`,
        label: e.fileName?.trim() || `Attached file`,
        mimeType: e.mimeType,
      },
    });
  }
  return n;
}
function _i() {
  return (_i = e(() => {
    (dn(), Rn());
  }))();
}
function vi(e, t, n, r) {
  return (
    t &&
      e &&
      typeof e == `object` &&
      Ei.set(e, {
        runId: t,
        ...(n ? { afterBoundaryRunId: n } : {}),
        ...(r ? { disposition: r } : {}),
      }),
    e
  );
}
function yi(e, t) {
  return !!(e && typeof e == `object` && Ei.get(e)?.runId === t);
}
function bi(e) {
  return e && typeof e == `object` ? (Ei.get(e)?.runId ?? null) : null;
}
function xi(e) {
  return e && typeof e == `object` ? (Ei.get(e)?.afterBoundaryRunId ?? null) : null;
}
function Si(e) {
  return e && typeof e == `object` ? (Ei.get(e)?.disposition ?? null) : null;
}
function Ci(e) {
  let t = v(e.payload),
    n = k(t?.message, { messageId: t?.messageId }),
    r = n?.role === `assistant` && !n.isImported ? n.id : null;
  !e.runIdBeforeApply ||
    !e.matchesChat ||
    e.event.hasActiveRun === !0 ||
    !r ||
    Di.set(e.host, {
      historyApplied: !1,
      messageId: r,
      runId: e.event.clientRunId ?? e.event.runId ?? e.runIdBeforeApply,
      sessionKey: e.event.key,
    });
}
function wi(e) {
  let t = Di.get(e.host),
    n = !!(
      t &&
      T(t.sessionKey, e.sessionKey) &&
      e.visibleMessages.some((e) => {
        let n = k(e);
        return n?.role === `assistant` && !n.isImported && n.id === t.messageId;
      })
    );
  return !t || !n
    ? e.previousMessages
    : (Di.set(e.host, { ...t, historyApplied: !0 }),
      e.previousMessages.filter((e) => !yi(e, t.runId)));
}
function Ti(e, t) {
  let n = Di.get(e);
  return n?.runId === t && n.historyApplied;
}
var Ei, Di;
function Oi() {
  return (Oi = e(() => {
    (wt(), C(), (Ei = new WeakMap()), (Di = new WeakMap()));
  }))();
}
function ki(e, t = e.length) {
  for (let n = t - 1; n >= 0; --n) if (k(e[n])?.role === `user`) return n;
  return -1;
}
function Ai(e) {
  let t = v(v(e)?.__openclaw);
  return b(t?.steerTargetRunId) ?? null;
}
function ji(e) {
  for (let t of e) {
    let e = M(t);
    if (e?.startsWith(`send:`)) return e.slice(5);
  }
  return null;
}
function Mi(e) {
  for (let t of e) {
    let e = Ai(t);
    if (e) return e;
  }
  return null;
}
function Ni(e, t) {
  let n = new Map(),
    r = new Map();
  for (let [i, a] of e.entries()) {
    let e = t(a),
      o = ji(e);
    o && !n.has(o) && n.set(o, i);
    let s = Mi(e);
    if (s) {
      let e = r.get(s) ?? [];
      (e.push(i), r.set(s, e));
    }
  }
  let i = new Map(),
    a = new Map();
  for (let [e, t] of r) {
    let r = n.get(e);
    if (r !== void 0) for (let e of t) e <= r || (i.set(r, e), a.set(e, r), (r = e));
  }
  return { continuationTurnIndexes: i, precedingContinuationTurnIndexes: a };
}
function Pi(e, t) {
  for (let n = e.length - 1; n >= 0; --n) {
    if (k(e[n])?.role !== `user` || Ai(e[n]) !== t) continue;
    let r = M(e[n]);
    if (r?.startsWith(`send:`)) return { index: n, runId: r.slice(5) };
  }
  return null;
}
function Fi(e) {
  let t = e.chatStreamSegments ?? [];
  for (let e = t.length - 1; e >= 0; --e) {
    let n = b(t[e]?.boundaryRunId);
    if (n) return n;
  }
}
function Ii(e, t) {
  let n = t.afterBoundaryRunId ? `send:${t.afterBoundaryRunId}` : null,
    r = n ? e.findIndex((e) => M(e) === n) : -1,
    i = t.boundaryRunId ? `send:${t.boundaryRunId}` : null,
    a = i ? e.findIndex((e) => M(e) === i) : -1;
  if (a >= 0) return { start: r >= 0 ? r + 1 : ki(e, a) + 1, end: a };
  if (r >= 0) {
    let t = e.findIndex((e, t) => t > r && k(e)?.role === `user`);
    return { start: r + 1, end: t >= 0 ? t : e.length };
  }
  let o = t.runId ? `send:${t.runId}` : null,
    s = o ? e.findIndex((e) => M(e) === o) : -1;
  if (s >= 0) {
    let t = e.findIndex((e, t) => t > s && k(e)?.role === `user`);
    return { start: s + 1, end: t >= 0 ? t : e.length };
  }
  let c = e.length;
  return { start: ki(e, c) + 1, end: c };
}
function Li(e, t, n, r, i) {
  for (let a = n; a < r; a++) {
    let n = i(e[a]);
    if (n != null && n > t) return a;
  }
  return r;
}
function Ri(e, t, n, r) {
  let i = null;
  for (let n = t - 1; n >= 0 && ((i = r(e[n])), i == null); --n);
  let a = null;
  for (let n = t; n < e.length && ((a = r(e[n])), a == null); n += 1);
  if (i != null && n <= i) {
    let e = i + 1;
    return a != null && e >= a ? i + (a - i) / 2 : e;
  }
  if (a != null && n >= a) {
    let e = a - 1;
    return i != null && e <= i ? i + (a - i) / 2 : e;
  }
  return n;
}
function zi(e, t, n, r = e.length) {
  let i = -1;
  for (let a = 0; a < r; a += 1) {
    let r = e[a],
      o = k(r),
      s = o?.runId === n ? j(r) : null;
    if (o?.role === `assistant` && s && (t.startsWith(s) || s.startsWith(t))) {
      i = a;
      break;
    }
  }
  let a = i >= 0 ? i : ki(e, r) + 1,
    o = 0;
  for (let i = a; i < r; i += 1) {
    let r = k(e[i]);
    if (r?.role !== `assistant` || (r.runId && r.runId !== n)) continue;
    let a = j(e[i]);
    if (!a) continue;
    let s = t.slice(o);
    if (s.startsWith(a)) {
      o += a.length;
      continue;
    }
    if (a.startsWith(s)) return null;
    let c = o > 0 ? /^\s+/u.exec(s)?.[0] : void 0;
    if (c && s.slice(c.length).startsWith(a)) {
      o += c.length + a.length;
      continue;
    }
    if (c && a.startsWith(s.slice(c.length))) return null;
    if (o > 0) break;
  }
  return t.slice(o);
}
function Bi(e, t) {
  let n = e.chatMessages,
    r = e.chatRunId;
  if (!Array.isArray(n) || !r) return null;
  let i = Pi(n, r);
  if (!i || i.index <= 0) return null;
  let a = zi(n, t, r, i.index);
  return a === t
    ? null
    : { boundaryRunId: i.runId, prefix: a === null ? t : t.slice(0, t.length - a.length) };
}
function Vi(e, t) {
  if (e.chatRunId !== t.runId || Fi(e) === t.boundaryRunId) return;
  let n = Fi(e);
  e.chatStreamSegments = [
    ...(e.chatStreamSegments ?? []),
    {
      text: ``,
      ts: t.timestamp ?? Date.now(),
      runId: t.runId,
      boundaryRunId: t.boundaryRunId,
      boundaryMarker: !0,
      ...(n ? { afterBoundaryRunId: n } : {}),
    },
  ];
}
function Hi(e, t) {
  if (Array.isArray(e.content)) {
    let n = !1,
      r = e.content.flatMap((e) => {
        let r = v(e);
        return !r ||
          (r.type !== `text` && r.type !== `input_text` && r.type !== `output_text`) ||
          typeof r.text != `string`
          ? [e]
          : n
            ? []
            : ((n = !0), [{ ...r, text: t }]);
      });
    if (n) return { ...e, content: r };
  }
  return typeof e.content == `string`
    ? { ...e, content: t }
    : typeof e.text == `string`
      ? { ...e, text: t }
      : e;
}
function Ui(e, t) {
  return !!(e?.boundaryRunId && t.startsWith(e.prefix));
}
function Wi(e, t) {
  let n = j(e);
  if (!n) return { kind: `none` };
  let r = null,
    i = [],
    a = null;
  for (let [e, n] of (t.chatStreamSegments ?? []).entries()) {
    if (en(n) && typeof n.text == `string`) {
      let t = qt(r, n.text);
      (t !== r && i.push(e), (r = t));
    }
    let t = b(n.boundaryRunId);
    t && r && (a = { boundaryRunId: t, prefix: r, segmentIndexes: [...i] });
  }
  let o = Bi(t, n),
    s = Ui(a, n) ? a : Ui(o, n) ? o : null;
  if (!s) return { kind: `none` };
  let c = n.slice(s.prefix.length).trimStart();
  return {
    kind: `split`,
    afterBoundaryRunId: s.boundaryRunId,
    replacedSegmentIndexes: s === o && a ? a.segmentIndexes : [],
    tailMessage: c ? Hi(e, c) : null,
  };
}
function Gi(e) {
  let t = e.messages;
  if (!t) return;
  let n = t.findIndex((t) => M(t) === `send:${e.boundaryRunId}`),
    r = e.afterBoundaryRunId ?? e.runId,
    i = t.findIndex((e) => M(e) === `send:${r}`);
  if (!(i < 0 || n <= i))
    for (let e = i + 1; e < n; e += 1) {
      if (k(t[e])?.role !== `user`) continue;
      let n = M(t[e]);
      if (n?.startsWith(`send:`)) return n.slice(5);
    }
}
function Ki(e, t) {
  if (e.chatRunId !== t.runId) return;
  let n = e.chatStreamSegments ?? [],
    r;
  for (let e = n.length - 1; e >= 0 && ((r = b(n[e]?.boundaryRunId)), !r); --e);
  let i = typeof e.chatStream == `string`,
    a = i && !!e.chatStream?.trim(),
    o = t.boundaryRunId
      ? (Gi({
          messages: e.chatMessages,
          runId: t.runId,
          boundaryRunId: t.boundaryRunId,
          afterBoundaryRunId: r,
        }) ?? t.boundaryRunId)
      : void 0;
  if (o) {
    let e = n.findLastIndex((e) => e.boundaryRunId);
    n = n.map((t, n) => (n <= e || t.boundaryRunId ? t : { ...t, boundaryRunId: o }));
  }
  if (
    (a &&
      (n = [
        ...n,
        {
          text: e.chatStream ?? ``,
          ts: e.chatStreamStartedAt ?? t.timestamp ?? Date.now(),
          runId: t.runId,
          ...(r ? { afterBoundaryRunId: r } : {}),
          ...(o ? { boundaryRunId: o } : {}),
          ...(t.toolCallId ? { toolCallId: t.toolCallId } : {}),
        },
      ]),
    t.boundaryRunId && !n.some((e) => e.boundaryRunId === t.boundaryRunId))
  ) {
    let i = o === t.boundaryRunId ? r : o;
    n = [
      ...n,
      {
        text: ``,
        ts: e.chatStreamStartedAt ?? t.timestamp ?? Date.now(),
        runId: t.runId,
        boundaryRunId: t.boundaryRunId,
        boundaryMarker: !0,
        ...(i ? { afterBoundaryRunId: i } : {}),
      },
    ];
  }
  ((e.chatStreamSegments = n), i && ((e.chatStream = null), (e.chatStreamStartedAt = null)));
}
function qi() {
  return (qi = e(() => {
    (wt(), rn(), xn());
  }))();
}
function Ji(e) {
  return e === void 0 ? void 0 : Yi[e];
}
var Yi;
function Xi() {
  return (Xi = e(() => {
    Yi = {
      main_session_restart_recovery: {
        icon: `cpu`,
        labelKey: `chat.systemNotice.restartRecovery.label`,
        summaryKey: `chat.systemNotice.restartRecovery.summary`,
      },
      "restart-sentinel": { icon: `cpu`, labelKey: `chat.systemNotice.gatewayRestarted.label` },
    };
  }))();
}
function Zi(e, t) {
  return JSON.stringify([e, t]);
}
function Qi(e, t, n, r) {
  if (!n) return;
  let i = r ? Zi(r, n) : n;
  t.has(i) || (t.add(i), e.push({ id: n, ...(r ? { runId: r } : {}) }));
}
function $i(e) {
  return Nn(e.type) || Pn(e.type);
}
function R(e) {
  let t = v(e);
  if (!t) return [];
  let n = [],
    r = new Set(),
    i = Array.isArray(t.content) ? t.content.filter((e) => !!e && typeof e == `object`) : [],
    a = N({ ...t, id: void 0 }),
    o = b(t.runId),
    s = t.role;
  ((typeof s == `string` && Kt(s).toLowerCase() === `tool`) ||
    sa.some((e) => !!b(t[e])) ||
    i.some($i)) &&
    Qi(n, r, a, o);
  for (let e of i) $i(e) && Qi(n, r, N(e) ?? a, b(e.runId) ?? o);
  return n;
}
function ea(e) {
  return Array.isArray(e.toolStreamOrder)
    ? e.toolStreamOrder
        .filter((e) => typeof e == `string` && !!e.trim())
        .map((t) => {
          let n = v(e.toolStreamById?.get(t)),
            r = v(n?.message),
            i = b(n?.toolCallId) ?? (r ? N(r) : void 0) ?? t,
            a = b(n?.runId) ?? b(r?.runId);
          return a ? { identity: t, id: i, runId: a } : { identity: t, id: i };
        })
    : [];
}
function ta(e, t) {
  let n = t.filter((t) => t.id === e.id && (!e.runId || !t.runId || t.runId === e.runId));
  return n.length === 1 ? n[0]?.identity : void 0;
}
function na(e) {
  let t = [],
    n = new Set();
  for (let [r, i] of e.entries())
    for (let e of R(i)) {
      let i = JSON.stringify([e.runId ?? null, e.id]);
      n.has(i) || (n.add(i), t.push({ ...e, identity: `live:${r}:${i}` }));
    }
  return t;
}
function ra(e, t) {
  let n = v(e);
  if (!n) return;
  let r = Array.isArray(n.content) ? n.content.map(v) : [];
  if (
    r.some((e) => Nn(e?.type)) ||
    !((typeof n.role == `string` && Kt(n.role) === `tool`) || r.some((e) => Pn(e?.type)))
  )
    return;
  let i = R(e),
    a = i.length === 1 ? i[0] : void 0;
  if (!a) return;
  let o = t.flatMap((e, t) =>
    R(e).some((e) => e.id === a.id && (!e.runId || !a.runId || e.runId === a.runId)) ? [t] : [],
  );
  return o.length === 1 ? o[0] : void 0;
}
function ia(e, t) {
  let n = v(e),
    r = v(t);
  if (!n || !r || !Array.isArray(n.content)) return e;
  let i = new Set(R(t).map((e) => e.id)),
    a = N({ ...n, id: void 0 }),
    o = n.content.filter((e) => {
      let t = v(e);
      return !t || !Pn(t.type) || !i.has(N(t) ?? a ?? ``);
    });
  return {
    ...n,
    content: o,
    __openclawToolStreamResultReceived: !0,
    ...(r.__openclaw === void 0 ? {} : { __openclaw: r.__openclaw }),
  };
}
function aa(e, t) {
  let n = v(e);
  if (!n || !Array.isArray(n.content) || t.length === 0) return e;
  let r = N({ ...n, id: void 0 }),
    i = b(n.runId),
    a = n.content.filter((e) => {
      let n = v(e);
      if (!n || !$i(n)) return !0;
      let a = N(n) ?? r;
      if (!a) return !0;
      let o = b(n.runId) ?? i;
      return !ta({ id: a, ...(o ? { runId: o } : {}) }, t);
    });
  return a.length === n.content.length ? e : { ...n, content: a };
}
function oa(e, t) {
  let n = ea(t),
    r = new Set();
  if (n.length === 0) return r;
  let i = e.findLastIndex((e) => {
    let t = v(e)?.role;
    return typeof t == `string` && Kt(t).toLowerCase() === `user`;
  });
  for (let t of e.slice(i + 1))
    for (let e of R(t)) {
      let t = ta(e, n);
      t && r.add(t);
    }
  return r;
}
var sa;
function ca() {
  return (ca = e(() => {
    (Fn(), pn(), (sa = [`toolName`, `tool_name`]));
  }))();
}
function la(e) {
  return !e || e.startsWith(`/`) || e.includes(`\0`)
    ? !1
    : e.split(`/`).every((e) => e !== `` && e !== `.` && e !== `..`);
}
function ua(e) {
  return Array.from(e)
    .map((e) => {
      if (e === `\\`) return `\\\\`;
      let t = e.codePointAt(0);
      return t !== void 0 && (t <= 31 || (t >= 127 && t <= 159))
        ? `\\u{${t.toString(16).padStart(4, `0`)}}`
        : e;
    })
    .join(``);
}
function da(e) {
  let t = v(e);
  if (!t || !Array.isArray(t.paths) || t.paths.length === 0) return;
  let n = t.paths.filter((e) => typeof e == `string` && la(e));
  if (
    !(
      n.length !== t.paths.length ||
      typeof t.stagedResultRef != `string` ||
      !/^refs\/openclaw\/worker-results\/[A-Za-z0-9-]+$/u.test(t.stagedResultRef) ||
      (t.totalCount !== void 0 && (!Number.isSafeInteger(t.totalCount) || t.totalCount < n.length))
    )
  )
    return {
      paths: n,
      stagedResultRef: t.stagedResultRef,
      ...(t.totalCount === void 0 ? {} : { totalCount: t.totalCount }),
    };
}
function fa(e) {
  if (!(!e || !(`workspaceResultConflict` in e))) return da(e.workspaceResultConflict);
}
function pa(e) {
  let t = v(e);
  if (t?.role === `custom` && t.customType === va) return da(t.details);
}
function ma(e) {
  return Math.max(e.paths.length, e.totalCount ?? e.paths.length);
}
function ha(e) {
  let t = e.paths.slice(0, ya);
  return { paths: t, remaining: Math.max(0, ma(e) - t.length) };
}
function ga(e) {
  return `'${e.replaceAll(`'`, `'\\''`)}'`;
}
function _a(e) {
  let t = e.paths.find((e) => !Wt(e));
  if (!t) return;
  let n = ga(`${e.stagedResultRef}:${t}`),
    r = ga(e.stagedResultRef),
    i = ga(`:(top,literal)${t}`);
  return { inspect: `git show ${n}`, takeCloud: `git checkout ${r} -- ${i}` };
}
var va, ya;
function ba() {
  return (ba = e(() => {
    (Ut(), (va = `cloud-workspace-conflict`), (ya = 5));
  }))();
}
function xa() {
  return La;
}
function Sa(e, t) {
  let n = `${e}\u0000${t}`;
  return `t${Jt(n).toString(36)}${n.length.toString(36)}`;
}
function Ca(e) {
  if (e == null) return null;
  if (typeof e == `string`) return n(e, ka);
  try {
    let t = JSON.stringify(e);
    return typeof t == `string` ? n(t, ka) : null;
  } catch {
    return null;
  }
}
function wa(e, t) {
  let r = un(e, t);
  if (r === `command`) {
    let e = v(t),
      r = typeof e?.command == `string` ? e.command.trim() : ``,
      i = on(r).trim();
    if (i.length < Ma) return null;
    let a = n(i, ka);
    return { key: Sa(`command`, a), input: a };
  }
  if (r !== `generic`) return null;
  let i = Ca(t);
  return !i || i.length < Na ? null : { key: Sa(e.trim().toLowerCase(), i), input: i };
}
function Ta(e, t) {
  let n = wa(e, t);
  if (!n) return;
  let r = Pa.get(n.key);
  if (r) return r;
  Da(e, n);
}
function Ea(e) {
  (e.client ||
    ((Ra = !1),
    Pa.clear(),
    Fa.clear(),
    Ia.clear(),
    (z = new Map()),
    (B &&= (clearTimeout(B), null))),
    e.client !== za && (Ra = !1),
    (za = e.client),
    (Ba = e.sessionKey),
    (Va = e.agentId ?? null),
    (Ha = e.onTitlesChanged));
}
function Da(e, t) {
  Ra ||
    !za ||
    !Ba ||
    Pa.has(t.key) ||
    Fa.has(t.key) ||
    Ia.has(t.key) ||
    z.has(t.key) ||
    (z.set(t.key, {
      key: t.key,
      name: e,
      input: t.input,
      sessionKey: Ba,
      agentId: Va,
      client: za,
      notify: Ha,
    }),
    (B ??= setTimeout(() => {
      ((B = null), Oa());
    }, ja)));
}
async function Oa() {
  let e = z.values().next().value;
  if (!e) {
    z = new Map();
    return;
  }
  let t = [];
  for (let n of z.values())
    n.client === e.client &&
      n.sessionKey === e.sessionKey &&
      n.agentId === e.agentId &&
      t.length < Aa &&
      t.push(n);
  for (let e of t) (z.delete(e.key), Fa.add(e.key));
  let n = z.size > 0;
  try {
    let n = await e.client.request(`chat.toolTitles`, {
      sessionKey: e.sessionKey,
      ...(e.agentId ? { agentId: e.agentId } : {}),
      items: t.map((e) => ({ id: e.key, name: e.name, input: e.input })),
    });
    if (n?.disabled === !0) {
      ((Ra = !0), (z = new Map()));
      return;
    }
    let r = n?.titles ?? {},
      i = !1;
    for (let e of t) {
      let t = r[e.key],
        n = typeof t == `string` ? t.trim() : ``;
      n ? (Pa.set(e.key, n), (i = !0)) : Ia.add(e.key);
    }
    if (i) {
      La += 1;
      let e = new Set();
      for (let n of t) n.notify && !e.has(n.notify) && (e.add(n.notify), n.notify());
    }
  } catch {
    for (let e of t) Ia.add(e.key);
  } finally {
    for (let e of t) Fa.delete(e.key);
    n &&
      !B &&
      (B = setTimeout(() => {
        ((B = null), Oa());
      }, ja));
  }
}
var ka, Aa, ja, Ma, Na, Pa, Fa, Ia, La, Ra, z, B, za, Ba, Va, Ha;
function Ua() {
  return (Ua = e(() => {
    (an(),
      (ka = 2e3),
      (Aa = 24),
      (ja = 250),
      (Ma = 12),
      (Na = 120),
      (Pa = new Map()),
      (Fa = new Set()),
      (Ia = new Set()),
      (La = 0),
      (Ra = !1),
      (z = new Map()),
      (B = null),
      (za = null),
      (Ba = null),
      (Va = null),
      (Ha = null));
  }))();
}
function Wa(e) {
  return typeof e == `number` && Number.isFinite(e) && e >= 0 ? Math.trunc(e) : void 0;
}
function Ga(e) {
  return typeof e == `number` && Number.isSafeInteger(e) && e > 0 && e <= 65536 ? e : void 0;
}
function Ka(e) {
  let t = (Array.isArray(e) ? e : []).flatMap((e) =>
    y(e) &&
    e.code === `update-required` &&
    e.action === `update-and-reconnect` &&
    e.updateCommand === `openclaw update` &&
    e.headlessReconnectCommand === `openclaw node restart`
      ? [e]
      : [],
  );
  return t.length > 0 ? t : void 0;
}
function qa(e) {
  return (Array.isArray(e) ? e : [])
    .flatMap((e) => {
      if (!e || typeof e != `object`) return [];
      let t = e,
        n = b(t.id),
        r = b(t.providerId);
      if (!n || !r) return [];
      let i = t.trust === `persistent` || t.trust === `disposable` ? t.trust : void 0,
        a =
          t.executionMode === `worker-turn` || t.executionMode === `remote-exec`
            ? t.executionMode
            : void 0,
        o = Ja(t.machines);
      return [
        {
          id: n,
          providerId: r,
          trust: i,
          executionMode: a,
          ...(o.length > 0 ? { machines: o } : {}),
        },
      ];
    })
    .toSorted((e, t) => e.id.localeCompare(t.id));
}
function Ja(e) {
  let t = new Map();
  for (let n of (Array.isArray(e) ? e : []).slice(0, 32)) {
    if (!y(n)) continue;
    let e = b(n.id),
      r = b(n.label);
    if (!e || e.length > 128 || !r || r.length > 128 || t.has(e)) continue;
    let i = Ga(n.cpu),
      a = Ga(n.memoryGb);
    t.set(e, {
      id: e,
      label: r,
      ...(i === void 0 ? {} : { cpu: i }),
      ...(a === void 0 ? {} : { memoryGb: a }),
      ...(typeof n.default == `boolean` ? { default: n.default } : {}),
    });
  }
  return [...t.values()];
}
function Ya(e) {
  return typeof e == `string` && $a.has(e);
}
function Xa(e) {
  return typeof e == `number` && Number.isSafeInteger(e);
}
function Za(e) {
  if (
    !y(e) ||
    Object.keys(e).some((e) => e !== `total` && e !== `available`) ||
    !Xa(e.total) ||
    !Xa(e.available)
  )
    return;
  let t = e.total,
    n = e.available;
  return t >= 1 && t <= 1024 && n >= 0 && n <= t ? { total: t, available: n } : void 0;
}
function Qa(e) {
  return (Array.isArray(e) ? e : [])
    .flatMap((e) => {
      if (!e || typeof e != `object`) return [];
      let t = e,
        n = b(t.id),
        i = b(t.type);
      if (!n || (i !== `local` && i !== `node` && i !== `worker`) || !Ya(t.status)) return [];
      let a = t.status,
        o = b(t.label),
        s = b(t.platform),
        c = t.trust === `persistent` || t.trust === `disposable` ? t.trust : void 0,
        l = r(t.capabilities),
        u = Array.isArray(t.invocableCommands)
          ? f(t.invocableCommands)
              .filter((e) => e.length <= 128)
              .slice(0, 128)
          : void 0,
        d = Wa(t.lastConnectedAtMs),
        p = Wa(t.lastDisconnectedAtMs),
        m = Wa(t.lastSeenAtMs),
        h = b(t.lastSeenReason),
        g = Ka(t.issues),
        _ = Za(t.workerSlots);
      return [
        {
          id: n,
          type: i,
          status: a,
          ...(o ? { label: o } : {}),
          ...(s ? { platform: s } : {}),
          ...(typeof t.sessionHost == `boolean` ? { sessionHost: t.sessionHost } : {}),
          ...(_ ? { workerSlots: _ } : {}),
          ...(d === void 0 ? {} : { lastConnectedAtMs: d }),
          ...(p === void 0 ? {} : { lastDisconnectedAtMs: p }),
          ...(m === void 0 ? {} : { lastSeenAtMs: m }),
          ...(h ? { lastSeenReason: h } : {}),
          ...(c ? { trust: c } : {}),
          ...(l ? { capabilities: l } : {}),
          ...(u ? { invocableCommands: u } : {}),
          ...(g ? { issues: g } : {}),
        },
      ];
    })
    .toSorted((e, t) => e.id.localeCompare(t.id));
}
var $a;
function eo() {
  return (eo = e(() => {
    (d(), ($a = new Set([`available`, `unavailable`, `starting`, `stopping`, `error`])));
  }))();
}
async function to(e) {
  let t = await e.request(`environments.list`, {});
  return { profiles: qa(t?.profiles), environments: Qa(t?.environments) };
}
function no(e, t) {
  return D`
    <button
      type="button"
      class="session-menu__item"
      data-value=${e.value}
      data-popover=${e.keepOpen ? E : `close`}
      aria-pressed=${String(e.checked)}
      title=${e.title ?? E}
      ?disabled=${t || (e.disabled ?? !1)}
      @click=${e.onSelect}
    >
      ${e.icon ? D`<span class="session-menu__icon" aria-hidden="true">${e.icon}</span>` : E}
      <span class="session-menu__text">${e.label}</span>
      ${e.sub ? D`<span class="session-menu__sub">${e.sub}</span>` : E}
      ${
        e.facts?.length
          ? D`<span class="new-session-page__menu-facts">
            ${e.facts.map((e) => D`<span class="new-session-page__menu-fact">${e}</span>`)}
          </span>`
          : E
      }
      <span class="session-menu__check" aria-hidden="true"
        >${e.checked ? at.check : E}</span
      >
    </button>
  `;
}
function ro(e) {
  return D`
    <div class="session-menu__separator" role="separator"></div>
    <button
      type="button"
      class="session-menu__item new-session-page__connect-machine"
      data-value="connect-machine"
      aria-pressed="false"
      ?disabled=${e.disabled}
      @click=${e.onSelect}
    >
      <span class="session-menu__icon" aria-hidden="true">${at.link}</span>
      <span class="session-menu__text">${O(`newSession.connectMachine`)}</span>
    </button>
  `;
}
function io(e) {
  return e.profiles.map((t) => {
    let n = e.profileDisabledReason?.(t);
    return no(
      {
        value: `cloud:${t.id}`,
        label: O(`newSession.cloudWorker`, { profile: t.id }),
        icon: e.icon,
        facts:
          t.trust === `disposable`
            ? [O(`newSession.environmentDisposable`)]
            : t.trust === `persistent`
              ? [O(`newSession.environmentPersistent`)]
              : void 0,
        checked: e.selectedId === t.id,
        disabled: e.disabled || !!n,
        title:
          (e.disabled ? e.disabledReason : n) ??
          O(`newSession.cloudWorkerProvider`, { provider: t.providerId }),
        onSelect: () => e.onSelect(t.id),
      },
      e.submitting,
    );
  });
}
function ao(e) {
  let t = e.cpu === void 0 ? void 0 : String(e.cpu),
    n = e.memoryGb === void 0 ? void 0 : String(e.memoryGb);
  return t && n
    ? O(`newSession.machineShape`, { cpu: t, memory: n })
    : t
      ? O(`newSession.machineCpu`, { cpu: t })
      : n
        ? O(`newSession.machineMemory`, { memory: n })
        : void 0;
}
function oo(e) {
  return e.machines.map((t) =>
    no(
      {
        value: `machine:${t.id}`,
        label: t.label,
        sub: ao(t),
        facts: t.default ? [O(`newSession.machineDefault`)] : void 0,
        checked: e.selectedId === t.id,
        keepOpen: !0,
        onSelect: () => e.onSelect(t.id),
      },
      e.submitting,
    ),
  );
}
function so() {
  return (so = e(() => {
    (gt(), st(), _t(), eo());
  }))();
}
function co(e) {
  let t = De(e)?.rest.match(ae)?.[1];
  return t ? t.toLowerCase().replaceAll(`-`, ``) : null;
}
function lo(e, t) {
  let n = co(e.key);
  return !n || !n.startsWith(t.shortId.toLowerCase().replaceAll(`-`, ``))
    ? !1
    : !t.slugHint || re(e.displayName) === t.slugHint;
}
function uo(e, t, n) {
  let r = new URLSearchParams(t.search).get(Re)?.trim(),
    i = $t(e.gateway, t.pathname),
    a = r ?? i,
    o = !!(i && i === a);
  if (a) {
    let i = () => {
        r && Xt(e.gateway, t.pathname, r);
      },
      s = Le(e, a, n.agentId);
    if (s && lo(s, n)) return (i(), { sessionKey: s.key, row: s });
    let c = co(a),
      l = De(a)?.agentId;
    if (
      o &&
      c?.startsWith(n.shortId.toLowerCase().replaceAll(`-`, ``)) &&
      l &&
      u(l) === u(n.agentId)
    )
      return (i(), { sessionKey: a });
  }
}
function fo() {
  return (fo = e(() => {
    (ee(), tn(), ve(), C());
  }))();
}
function po() {
  window.dispatchEvent(new CustomEvent(dt));
}
var mo;
function ho() {
  return (ho = e(() => {
    (ct(), mn(), (mo = xe(ge.debugOverlay)));
  }))();
}
function go(e) {
  return new URLSearchParams(e.search).get(`draft`) || void 0;
}
function _o(e) {
  return new URLSearchParams(e.search).get(pe) === `1`;
}
function vo(e) {
  let t = new URLSearchParams(e.search);
  (t.delete(`draft`), t.delete(pe));
  let n = t.toString();
  return { ...e, search: n ? `?${n}` : `` };
}
function yo(e) {
  return { draft: go(e), ...(_o(e) ? { focusComposer: !0 } : {}) };
}
function bo(e) {
  let t = new URLSearchParams(),
    n = go(e);
  return (n && t.set(`draft`, n), _o(e) && t.set(pe, `1`), t.size > 0 ? `?` + t.toString() : ``);
}
function xo(e, t, n = e?.sessionKey) {
  return !e || !T(n, e.sessionKey) || t === e ? void 0 : e.draft;
}
function So() {
  return (So = e(() => {
    (ve(), C());
  }))();
}
function Co(e, t, n) {
  return {
    columns: [{ id: e, panes: [{ id: t, sessionKey: n }], paneWeights: [1] }],
    columnWeights: [1],
    activePaneId: t,
  };
}
function wo(e, t, n) {
  return se(e[t], n);
}
function To(e, t, n) {
  let r = wo(e, t, `${n} before divider`);
  return r / (r + wo(e, t + 1, `${n} after divider`));
}
function V(e) {
  return {
    columns: e.columns.map((e) => ({
      ...e,
      panes: e.panes.map((e) => ({ ...e })),
      paneWeights: [...e.paneWeights],
    })),
    columnWeights: [...e.columnWeights],
    activePaneId: e.activePaneId,
  };
}
function Eo(e) {
  return `c${e.columns.reduce((e, t) => Math.max(e, me(t.id, `c`)), 0) + 1}`;
}
function Do(e) {
  return `p${ko(e).reduce((e, t) => Math.max(e, me(t.id, `p`)), 0) + 1}`;
}
function Oo(e, t) {
  for (let [n, r] of e.columns.entries()) {
    let e = r.panes.findIndex((e) => e.id === t);
    if (e >= 0) {
      let t = r.panes[e];
      if (!t) continue;
      return {
        column: { ...r, panes: r.panes.map((e) => ({ ...e })), paneWeights: [...r.paneWeights] },
        columnIndex: n,
        pane: { ...t },
        paneIndex: e,
      };
    }
  }
  return null;
}
function ko(e) {
  return e.columns.flatMap((e) => e.panes.map((e) => ({ ...e })));
}
function Ao(e, t) {
  if (!t) return ko(e);
  let n = Oo(e, e.activePaneId)?.pane;
  return n ? [n] : [];
}
function jo(e, t, n, r) {
  let i = Oo(e, t),
    a = V(e);
  if (!i) return a;
  let o = Do(e);
  if (r === `left` || r === `right`) {
    let t = se(a.columnWeights[i.columnIndex], `split column weight for located pane`),
      s = i.columnIndex + +(r === `right`);
    (a.columns.splice(s, 0, { id: Eo(e), panes: [{ id: o, sessionKey: n }], paneWeights: [1] }),
      a.columnWeights.splice(i.columnIndex, 1, t / 2, t / 2));
  } else {
    let e = a.columns[i.columnIndex];
    if (!e) return a;
    let t = se(e.paneWeights[i.paneIndex], `split pane weight for located pane`),
      s = i.paneIndex + +(r === `down`);
    (e.panes.splice(s, 0, { id: o, sessionKey: n }),
      e.paneWeights.splice(i.paneIndex, 1, t / 2, t / 2));
  }
  return ((a.activePaneId = o), a);
}
function Mo(e, t) {
  let n = Oo(e, t);
  if (!n) return V(e);
  let r = V(e),
    i = r.columns[n.columnIndex];
  if (!i) return r;
  let a = r.activePaneId === t,
    o = r.activePaneId;
  if (
    (a &&
      (o =
        i.panes[n.paneIndex - 1]?.id ??
        r.columns[n.columnIndex - 1]?.panes.at(-1)?.id ??
        r.columns.flatMap((e) => e.panes).find((e) => e.id !== t)?.id ??
        ``),
    i.panes.splice(n.paneIndex, 1),
    i.paneWeights.splice(n.paneIndex, 1),
    i.panes.length === 0
      ? (r.columns.splice(n.columnIndex, 1), r.columnWeights.splice(n.columnIndex, 1))
      : (i.paneWeights = Ee(i.paneWeights)),
    !(ko(r).length <= 1))
  )
    return ((r.columnWeights = Ee(r.columnWeights)), (r.activePaneId = o), r);
}
function No(e, t, n) {
  let r = V(e),
    i = r.columns.flatMap((e) => e.panes).find((e) => e.id === t);
  return (i && (i.sessionKey = n), r);
}
function Po(e, t) {
  let n = V(e);
  return (ko(e).some((e) => e.id === t) && (n.activePaneId = t), n);
}
function Fo(e, t, n) {
  if (t.kind === `split`) {
    let r = n ? ko(e).find((e) => e.sessionKey === n) : void 0;
    return n && !r ? e : jo(e, r?.id ?? e.activePaneId, t.sessionKey, t.direction);
  }
  let r = ko(e).find((e) => e.sessionKey === t.sessionKey);
  return r ? (t.kind === `close-pane` ? Mo(e, r.id) : Po(e, r.id)) : e;
}
function Io(e, t, n) {
  let r = [...e];
  if (t < 0 || t + 1 >= e.length) return r;
  let i = e[t],
    a = e[t + 1];
  if (i === void 0 || a === void 0) return r;
  let o = i + a,
    s = Math.max(zo, Math.min(0.85, n));
  return ((r[t] = o * s), (r[t + 1] = o * (1 - s)), r);
}
function Lo(e, t, n) {
  let r = V(e);
  return ((r.columnWeights = Io(r.columnWeights, t, n)), r);
}
function Ro(e, t, n, r) {
  let i = V(e),
    a = i.columns.find((e) => e.id === t);
  return (a && (a.paneWeights = Io(a.paneWeights, n, r)), i);
}
var zo;
function Bo() {
  return (Bo = e(() => {
    (a(), ue(), (zo = 0.15));
  }))();
}
function Vo(e, t) {
  let n = x(t);
  if (!n) return null;
  let r = x(e);
  if (r) {
    let e = `${r}/`;
    if (s(n).startsWith(s(e))) {
      let t = n.slice(e.length).trim();
      if (t) return `${r}/${t}`;
    }
    return `${r}/${n}`;
  }
  let i = n.indexOf(`/`);
  if (i > 0) {
    let e = n.slice(0, i).trim(),
      t = n.slice(i + 1).trim();
    if (e && t) return `${e}/${t}`;
  }
  return n;
}
function Ho(e) {
  return Array.isArray(e)
    ? e
        .map((e) => x(e))
        .filter((e) => !!e)
        .map((e) => w(e))
    : [];
}
function Uo(e) {
  if (!Array.isArray(e)) return [];
  let t = [];
  for (let n of e) {
    if (!n || typeof n != `object`) continue;
    let e = n,
      r = x(e.provider),
      i = x(e.model);
    if (!r || !i) continue;
    let a = w(
      x(e.reason)?.replace(/_/g, ` `) ??
        x(e.code) ??
        (typeof e.status == `number` ? `HTTP ${e.status}` : null) ??
        x(e.error) ??
        `error`,
    );
    t.push({ provider: r, model: i, reason: a });
  }
  return t;
}
function Wo(e) {
  if (!e || typeof e != `object`) return null;
  let t = e;
  if (typeof t.text == `string`) return t.text;
  let n = t.content;
  if (!Array.isArray(n)) return null;
  let r = n
    .map((e) => {
      if (!e || typeof e != `object`) return null;
      let t = e;
      return t.type === `text` && typeof t.text == `string` ? t.text : null;
    })
    .filter((e) => !!e);
  return r.length === 0
    ? null
    : r.join(`
`);
}
function Go(e) {
  if (e == null) return null;
  if (typeof e == `number` || typeof e == `boolean`) return String(e);
  let t = Wo(e),
    n;
  if (typeof e == `string`) n = e;
  else if (t) n = t;
  else
    try {
      n = JSON.stringify(e, null, 2);
    } catch {
      n = Me(e);
    }
  let r = Je(n, Ds);
  return r.truncated
    ? `${r.text}\n\n… truncated (${r.total} chars, showing first ${r.text.length}).`
    : r.text;
}
function Ko(e) {
  let t = _(e),
    n = t?.added,
    r = t?.removed;
  return typeof n == `number` &&
    Number.isInteger(n) &&
    n >= 0 &&
    typeof r == `number` &&
    Number.isInteger(r) &&
    r >= 0
    ? { added: n, removed: r }
    : void 0;
}
function qo(e) {
  let t = _(_(e)?.details);
  if (!t || t.changedModel !== !0) return;
  if (Object.hasOwn(t, `modelOverride`)) return x(t.modelOverride);
  let n = x(t.model);
  if (!n) return;
  let r = x(t.modelProvider);
  return r ? `${r}/${n}` : n;
}
function Jo(e, t) {
  let n = t.result,
    r = _(_(n)?.details),
    i = x(r?.sessionKey) ?? e.sessionKey;
  if (!Ge(e, i, x(r?.agentId))) return;
  let a = qo(n);
  a !== void 0 && e.sessions.setModelOverride(i, a);
}
function Yo(e) {
  let t = [];
  return (
    t.push({
      type: `toolcall`,
      name: e.name,
      arguments: e.args ?? {},
      ...(e.details === void 0 ? {} : { details: e.details }),
    }),
    (e.output || e.resultReceived) &&
      t.push({
        type: `toolresult`,
        name: e.name,
        text: e.output ?? ``,
        ...(e.details === void 0 ? {} : { details: e.details }),
        ...(e.isError === void 0 ? {} : { isError: e.isError }),
        ...(e.exitCode === void 0 ? {} : { exitCode: e.exitCode }),
      }),
    {
      role: `assistant`,
      toolCallId: e.toolCallId,
      runId: e.runId,
      content: t,
      timestamp: e.startedAt,
      __openclawToolStreamLive: !0,
      __openclawToolStreamResultReceived: e.resultReceived === !0,
      ...(e.resultReceived !== !0 && e.liveDiffStat
        ? { __openclawToolStreamDiffStat: e.liveDiffStat }
        : {}),
      __openclawToolStreamReceivedAt: e.receivedAt,
    }
  );
}
function Xo(e) {
  if (e.toolStreamOrder.length <= Ts) return;
  let t = e.toolStreamOrder.length - Ts,
    n = e.toolStreamOrder.splice(0, t);
  for (let t of n) e.toolStreamById.delete(t);
}
function Zo(e) {
  e.chatToolMessages = e.toolStreamOrder
    .map((t) => e.toolStreamById.get(t)?.message)
    .filter((e) => !!e);
}
function Qo(e) {
  e.toolStreamSyncTimer != null &&
    (clearTimeout(e.toolStreamSyncTimer), (e.toolStreamSyncTimer = null));
}
function $o(e) {
  (Qo(e), Zo(e));
}
function es(e, t = !1) {
  if (t) {
    $o(e);
    return;
  }
  e.toolStreamSyncTimer ??= window.setTimeout(() => {
    ($o(e), e.requestUpdate?.());
  }, Es);
}
function ts(e) {
  (Qo(e),
    e.toolStreamById.clear(),
    (e.toolStreamOrder = []),
    e.activityEventSeqById?.clear(),
    (e.chatToolMessages = []),
    (e.chatStreamSegments = []),
    e.knownAgentRunIds?.clear(),
    e.waitingApprovalStatuses?.clear());
}
function ns(e, t) {
  Qo(e);
  let n = new Set();
  for (let r of e.toolStreamOrder) e.toolStreamById.get(r)?.runId === t && n.add(r);
  for (let t of n) e.toolStreamById.delete(t);
  let r = `tool:[${JSON.stringify(t)},`;
  for (let t of e.activityEventSeqById?.keys() ?? [])
    t.startsWith(r) && e.activityEventSeqById?.delete(t);
  ((e.toolStreamOrder = e.toolStreamOrder.filter((e) => !n.has(e))),
    Zo(e),
    (e.chatStreamSegments = e.chatStreamSegments.filter((e) => e.runId !== t)),
    e.knownAgentRunIds?.delete(t));
  for (let [n, r] of e.waitingApprovalStatuses ?? [])
    r.runId === t && e.waitingApprovalStatuses?.delete(n);
}
function rs(e, t) {
  return `tool:${JSON.stringify([e, t])}`;
}
function is(e, t) {
  return `${e}:review:${JSON.stringify(t)}`;
}
function as(e, t) {
  let n = Number.isSafeInteger(t.seq) ? t.seq : 0;
  if (t.stream === `tool`) {
    let r = x(t.data?.toolCallId);
    if (!r) return !0;
    let i = rs(t.runId, r),
      a = `${i}:result`,
      o = e.activityEventSeqById?.get(a),
      s = x(t.data?.phase);
    if (s !== `result` && o !== void 0 && n <= o) return !1;
    let c = s === `review` ? x(_(t.data.review)?.id) : void 0,
      l = e.activityEventSeqById?.get(`${i}:review-floor`);
    if (c && l !== void 0 && n <= l) return !1;
    let u = c ? is(i, c) : i,
      d = e.activityEventSeqById?.get(u);
    if (d !== void 0 && n <= d) return !1;
    let f = (e.activityEventSeqById ??= new Map());
    if ((f.set(u, n), s === `result`)) {
      f.set(a, n);
      for (let e of f.keys()) e.startsWith(`${i}:review:`) && f.delete(e);
    }
    return !0;
  }
  if (t.stream !== `item` || t.data?.kind !== `preamble`) return !0;
  let r = x(t.data.itemId) ?? x(t.data.id) ?? `latest`,
    i = `preamble:${t.runId}:${r}`,
    a = e.activityEventSeqById?.get(i);
  return a !== void 0 && n <= a ? !1 : ((e.activityEventSeqById ??= new Map()).set(i, n), !0);
}
function os(e) {
  let t = e.localRunId ? e.usageByRun?.get(e.localRunId) : void 0;
  if (t !== void 0) return t;
  for (let t of e.activeRunIds ?? []) {
    let n = e.usageByRun?.get(t);
    if (n !== void 0) return n;
  }
  return null;
}
function ss(e) {
  if (e.localRunId) return e.localRunId;
  let t = new Set(e.activeRunIds ?? []);
  return (
    e.queue?.find(
      (e) =>
        e.sendState === `waiting-reconnect` && typeof e.sendRunId == `string` && t.has(e.sendRunId),
    )?.sendRunId ?? null
  );
}
function cs(e, t) {
  let n = (e.waitingApprovalStatuses ??= new Map()),
    r = (e.waitingApprovalResolvedIds ??= new Set()),
    i = new Set(t.map((e) => e.id));
  for (let e of r) i.has(e) || r.delete(e);
  let a = t.filter(
      (t) =>
        t.kind === `exec` && t.request.sessionKey && Ge(e, t.request.sessionKey, t.request.agentId),
    ),
    o = new Set(a.map((e) => e.id)),
    s = !1;
  for (let e of n.keys()) o.has(e) || (n.delete(e), (s = !0));
  if (n.size > 0) return s;
  for (let t of a) {
    let i = x(t.request.runId);
    !i ||
      !e.knownAgentRunIds?.has(i) ||
      r.has(t.id) ||
      (n.set(t.id, { approvalId: t.id, toolCallId: null, runId: i }), (s = !0));
  }
  return s;
}
function ls(e) {
  e.compactionClearTimer != null &&
    (window.clearTimeout(e.compactionClearTimer), (e.compactionClearTimer = null));
}
function us(e, t = Os, n) {
  e.compactionClearTimer = window.setTimeout(() => {
    let t = e.compactionStatus;
    (n?.phase && t?.phase !== n.phase) ||
      (n?.runId && t?.runId !== n.runId) ||
      ((e.compactionStatus = null), (e.compactionClearTimer = null), e.requestUpdate?.());
  }, t);
}
function ds(e, t) {
  ((e.compactionStatus = {
    phase: `complete`,
    runId: t,
    startedAt: e.compactionStatus?.startedAt ?? null,
    completedAt: Date.now(),
  }),
    us(e, Os, { phase: `complete`, runId: t }));
}
function fs(e, t) {
  if (!t || t.operation !== `compact`) return;
  let n = x(t.sessionKey),
    r = x(t.agentId) ?? void 0;
  if (!n || !Ge(e, n, r)) return;
  let i = x(t.operationId) ?? `session-compact:${n}`,
    a = e;
  if (t.phase === `start`) {
    (ls(a),
      (a.compactionStatus = {
        phase: `active`,
        runId: i,
        startedAt: Date.now(),
        completedAt: null,
      }),
      us(a, ks, { phase: `active`, runId: i }));
    return;
  }
  if (t.phase === `end` && !(a.compactionStatus?.runId && a.compactionStatus.runId !== i)) {
    if ((ls(a), t.completed === !0)) {
      ds(a, i);
      return;
    }
    a.compactionStatus = null;
  }
}
function ps(e, t) {
  let n = t.data ?? {},
    r = typeof n.phase == `string` ? n.phase : ``,
    i = n.completed === !0;
  if ((ls(e), r === `start`)) {
    ((e.compactionStatus = {
      phase: `active`,
      runId: t.runId,
      startedAt: Date.now(),
      completedAt: null,
    }),
      us(e, ks, { phase: `active`, runId: t.runId }));
    return;
  }
  if (r === `end`) {
    if (n.willRetry === !0 && i) {
      ((e.compactionStatus = {
        phase: `retrying`,
        runId: t.runId,
        startedAt: e.compactionStatus?.startedAt ?? Date.now(),
        completedAt: null,
      }),
        us(e, ks, { phase: `retrying`, runId: t.runId }));
      return;
    }
    if (i) {
      ds(e, t.runId);
      return;
    }
    e.compactionStatus = null;
  }
}
function ms(e, t) {
  let n = t.data ?? {},
    r = x(n.phase);
  (r === `end` || r === `error`) &&
    hs(e, t, { allowSessionScopedWhenIdle: !0 }).accepted &&
    e.compactionStatus?.phase === `retrying` &&
    ((e.compactionStatus.runId && e.compactionStatus.runId !== t.runId) || ds(e, t.runId));
}
function hs(e, t, n) {
  let r = typeof t.sessionKey == `string` ? t.sessionKey : void 0;
  return r && !Ge(e, r, x(t.agentId))
    ? { accepted: !1 }
    : !e.chatRunId && n?.allowSessionScopedWhenIdle && r
      ? { accepted: !0, sessionKey: r }
      : (!r && e.chatRunId && t.runId !== e.chatRunId) ||
          (e.chatRunId && t.runId !== e.chatRunId) ||
          !e.chatRunId
        ? { accepted: !1 }
        : { accepted: !0, sessionKey: r };
}
function gs(e, t) {
  if (t.stream !== `usage`) return !1;
  let n = x(t.sessionKey);
  if (n) {
    if (!Ge(e, n, x(t.agentId))) return !0;
  } else if (!e.chatRunId || t.runId !== e.chatRunId) return !0;
  let r = t.data?.outputTokens;
  if (typeof r != `number` || !Number.isFinite(r)) return !0;
  let i = Math.floor(r);
  if (i < 0) return !0;
  let a = e.chatRunUsageById?.get(t.runId);
  return (
    (a !== void 0 && i <= a) || (e.chatRunUsageById = new Map(e.chatRunUsageById).set(t.runId, i)),
    !0
  );
}
function _s(e, t) {
  let n = t.data ?? {},
    r = t.stream === `fallback` ? `fallback` : x(n.phase);
  if (
    (t.stream === `lifecycle` && r !== `fallback` && r !== `fallback_cleared`) ||
    !hs(e, t, { allowSessionScopedWhenIdle: !0 }).accepted
  )
    return;
  let i = Vo(n.selectedProvider, n.selectedModel) ?? Vo(n.fromProvider, n.fromModel),
    a = Vo(n.activeProvider, n.activeModel) ?? Vo(n.toProvider, n.toModel),
    o = Vo(n.previousActiveProvider, n.previousActiveModel) ?? x(n.previousActiveModel);
  if (!i || !a || (r === `fallback` && i === a)) return;
  let s = x(n.reasonSummary) ?? x(n.reason),
    c = s ? w(s) : null,
    l = (() => {
      let e = Ho(n.attemptSummaries);
      return e.length > 0
        ? e
        : Uo(n.attempts).map(
            (e) => `${Vo(e.provider, e.model) ?? `${e.provider}/${e.model}`}: ${we(e.reason)}`,
          );
    })();
  (e.fallbackClearTimer != null &&
    (window.clearTimeout(e.fallbackClearTimer), (e.fallbackClearTimer = null)),
    (e.fallbackStatus = {
      phase: r === `fallback_cleared` ? `cleared` : `active`,
      selected: i,
      active: r === `fallback_cleared` ? i : a,
      previous: r === `fallback_cleared` ? (o ?? (a === i ? void 0 : a)) : void 0,
      reason: c ?? void 0,
      attempts: l,
      occurredAt: Date.now(),
    }),
    (e.fallbackClearTimer = window.setTimeout(() => {
      ((e.fallbackStatus = null), (e.fallbackClearTimer = null), e.requestUpdate?.());
    }, As)));
}
function vs(e, t) {
  let n = x(t.data?.phase);
  if (n !== `waiting-approval` && n !== `approval-resolved`) return !1;
  let r = x(t.data?.approvalId),
    i = x(t.sessionKey);
  if (!r || !i) return !0;
  if (n === `waiting-approval`) {
    let n = (e.waitingApprovalStatuses ??= new Map());
    return (
      e.waitingApprovalResolvedIds?.delete(r),
      n.set(r, { approvalId: r, toolCallId: x(t.data?.toolCallId), runId: t.runId }),
      !0
    );
  }
  return (
    (e.waitingApprovalResolvedIds ??= new Set()).add(r), e.waitingApprovalStatuses?.delete(r), !0
  );
}
function ys(e) {
  if (e.stream !== `item`) return null;
  let t = e.data ?? {};
  if (t.kind !== `preamble`) return null;
  let n = (
      typeof t.itemId == `string` && t.itemId.trim()
        ? t.itemId
        : typeof t.id == `string` && t.id.trim()
          ? t.id
          : null
    )?.trim(),
    r = bs(t.progressText);
  return !r && !n ? null : { text: r, ...(n ? { itemId: n } : {}) };
}
function bs(e) {
  if (typeof e != `string`) return ``;
  let t = Jn(e).text.trim(),
    n = t.replace(/^[\s*_`~]+|[\s*_`~]+$/gu, ``).trim();
  return /^NO_REPLY$/iu.test(n) ? `` : t;
}
function xs(e, t) {
  let n = ys(t);
  if (!n) return !1;
  if (!hs(e, t, { allowSessionScopedWhenIdle: !0 }).accepted) return !0;
  if (n.itemId && !n.text.trim())
    return ((e.chatStreamSegments = e.chatStreamSegments.filter((e) => e.itemId !== n.itemId)), !0);
  let r = n.itemId ? e.chatStreamSegments.findIndex((e) => e.itemId === n.itemId) : -1;
  if (r >= 0)
    return (
      e.chatStreamSegments[r] &&
        (e.chatStreamSegments = e.chatStreamSegments.map((e, i) =>
          i === r ? { ...e, text: n.text, runId: t.runId } : e,
        )),
      !0
    );
  let i = e.chatStreamSegments[e.chatStreamSegments.length - 1];
  return (
    (!n.itemId && i && !i.toolCallId && i.text === n.text) ||
      (e.chatStreamSegments = [
        ...e.chatStreamSegments,
        { text: n.text, ts: t.ts, runId: t.runId, ...(n.itemId ? { itemId: n.itemId } : {}) },
      ]),
    !0
  );
}
function Ss(e, t) {
  if (t.stream !== `codex_app_server.guardian`) return !1;
  let n = t.data ?? {},
    r = x(n.phase),
    i = x(n.status),
    a =
      r === `warning`
        ? `warning`
        : r === `completed` && i === `approved`
          ? `approved`
          : r === `completed` && [`denied`, `timedOut`, `aborted`].includes(i ?? ``)
            ? `denied`
            : null;
  if (!a) return !0;
  let o = x(n.reviewId) ?? String(t.seq),
    s = x(n.targetItemId);
  if (r === `completed` && s) return !0;
  let c = x(n.command),
    l = x(n.riskLevel),
    u = x(n.rationale),
    d = x(n.message),
    f = {
      key: `guardian:${t.runId}:${o}:${a}`,
      runId: t.runId,
      timestamp: typeof t.ts == `number` ? t.ts : Date.now(),
      kind: a,
      ...(c ? { command: c } : {}),
      ...(l ? { riskLevel: l } : {}),
      ...(u ? { rationale: u } : {}),
      ...(d ? { message: d } : {}),
    },
    p = e.guardianNotices ?? [],
    m = p.findIndex((e) => e.key === f.key);
  return (
    (e.guardianNotices = m === -1 ? [...p.slice(-49), f] : p.map((e, t) => (t === m ? f : e))), !0
  );
}
function Cs(e, t, n, r) {
  let i = n.toolCallId,
    a = rs(t.runId, i),
    o = (e.activityEventSeqById ??= new Map()),
    s = (e) => o.get(is(a, e.id)) ?? 0,
    c = `${a}:review-floor`,
    l = hn(n.details),
    u = Math.max(o.get(c) ?? 0, ...l.map(s)),
    d = [...l.filter((e) => e.id !== r.id), r].toSorted((e, t) => s(e) - s(t)),
    f = d.slice(0, -16),
    p = d.slice(-16);
  if (f.length > 0) {
    o.set(c, Math.max(o.get(c) ?? 0, ...f.map(s)));
    for (let e of f) o.delete(is(a, e.id));
  }
  let m = nn(t.data),
    h = Zt(p),
    g = nn(n.details),
    _ = g === `denied` ? `denied` : (m ?? h ?? void 0);
  ((n.details = Gt(n.details, p, _ && t.seq >= u ? _ : g)), (n.message = Yo(n)), es(e, !0));
}
function ws(e, t) {
  if (!t) return !1;
  let n = typeof t.sessionKey == `string` ? t.sessionKey : void 0;
  if ((n && !Ge(e, n, x(t.agentId))) || !as(e, t)) return !1;
  if (t.stream === `lifecycle` || t.stream === `tool`) {
    let n = x(t.runId);
    n && (e.knownAgentRunIds ??= new Set()).add(n);
  }
  if (gs(e, t) || Ss(e, t)) return !0;
  if (t.stream === `compaction`) return (ps(e, t), !0);
  if (t.stream === `lifecycle`) {
    let n = t.data?.phase;
    if ((n === `start` || n === `end` || n === `error`) && e.chatRunUsageById?.has(t.runId)) {
      let n = new Map(e.chatRunUsageById);
      (n.delete(t.runId), (e.chatRunUsageById = n));
    }
    return vs(e, t) ? !0 : (ms(e, t), _s(e, t), !0);
  }
  if (t.stream === `fallback`) return (_s(e, t), !0);
  if (xs(e, t)) return !0;
  if (t.stream !== `tool`) return !1;
  let r = t.data ?? {},
    i = typeof r.toolCallId == `string` ? r.toolCallId : ``;
  if (!i) return !1;
  let a = Zi(t.runId, i),
    o = e.toolStreamById.get(a),
    s = typeof r.phase == `string` ? r.phase : ``,
    c = s === `review` ? gn(r.review) : null;
  if (s === `review` && !c) return !0;
  let l = s !== `start` && o?.name && o.name !== `tool` ? o.name : (x(r.name) ?? o?.name ?? `tool`);
  s === `start` &&
    t.runId === e.chatRunId &&
    (e.chatRunStartup = { state: `activity`, runId: t.runId });
  let u = s === `start` ? r.args : void 0,
    d = s === `update` ? Go(r.partialResult) : s === `result` ? Go(r.result) : void 0,
    f = s === `result` ? _(r.result)?.details : void 0,
    p = nn(r) ?? nn(f),
    m = p ? Gt(f, [], p) : f,
    h = s === `result` && typeof r.isError == `boolean` ? r.isError : void 0,
    g = (s === `result` ? _(r.result) : void 0)?.exitCode,
    v = typeof g == `number` && Number.isInteger(g) ? g : void 0,
    y = s === `input_delta` ? Ko(r.diff) : void 0;
  l === `session_status` && s === `result` && Jo(e, r);
  let b = Date.now();
  if (!o)
    (Ki(e, { runId: t.runId, toolCallId: i, timestamp: b }),
      (o = {
        toolCallId: i,
        runId: t.runId,
        sessionKey: n,
        name: l,
        args: u,
        output: d || void 0,
        ...(m === void 0 ? {} : { details: m }),
        ...(h === void 0 ? {} : { isError: h }),
        ...(v === void 0 ? {} : { exitCode: v }),
        ...(y ? { liveDiffStat: y } : {}),
        ...(s === `result` ? { resultReceived: !0 } : {}),
        startedAt: typeof t.ts == `number` ? t.ts : b,
        receivedAt: b,
        message: {},
      }),
      e.toolStreamById.set(a, o),
      e.toolStreamOrder.push(a));
  else {
    if (
      ((o.name = l),
      u !== void 0 && (o.args = u),
      d !== void 0 && (o.output = d || void 0),
      f !== void 0 || p)
    ) {
      let e = nn(o.details),
        t = e === `denied` ? `denied` : (p ?? e),
        n = hn(o.details);
      o.details = n.length ? Gt(f, n, t) : m;
    }
    (h !== void 0 && (o.isError = h),
      v !== void 0 && (o.exitCode = v),
      y && (o.liveDiffStat = y),
      s === `result` && ((o.liveDiffStat = void 0), (o.resultReceived = !0)));
  }
  return c ? (Xo(e), Cs(e, t, o, c), !0) : ((o.message = Yo(o)), Xo(e), es(e, s === `result`), !0);
}
var Ts, Es, Ds, Os, ks, As;
function js() {
  return (js = e(() => {
    (Qn(),
      fn(),
      S(),
      ke(),
      C(),
      qi(),
      ca(),
      (Ts = 50),
      (Es = 80),
      (Ds = 12e4),
      (Os = 5e3),
      (ks = 3e5),
      (As = 8e3));
  }))();
}
function Ms(e) {
  return (typeof e == `string` ? e.trim() : ``) || null;
}
function Ns(e, t) {
  ((e.lastError = t), (e.chatError = t));
}
function Ps(e) {
  return !!(e.chatSending || e.chatRunId);
}
function Fs(e) {
  return !!(e.chatRunId || e.sessionsResult?.sessions.some((t) => T(t.key, e.sessionKey) && Pe(t)));
}
function Is(e) {
  return (
    Fs(e) ||
    !!e.sessionsResult?.sessions.some(
      (t) => T(t.key, e.sessionKey) && t.hasActiveSubagentRun === !0,
    )
  );
}
function Ls(e) {
  return oc.has(s(e.trim()));
}
function Rs(e, t) {
  return Ue(t) || (he(e) && Be(e, t) !== null) ? {} : { clearQueued: !0 };
}
async function zs(e, t) {
  try {
    return (
      t.runId === null
        ? await e.request(`sessions.abort`, {
            key: t.sessionKey,
            ...(t.agentId ? { agentId: t.agentId } : {}),
            ...(t.clearQueued ? { clearQueued: !0 } : {}),
          })
        : await e.request(`chat.abort`, {
            sessionKey: t.sessionKey,
            ...(t.agentId ? { agentId: t.agentId } : {}),
            runId: t.runId,
          }),
      { ok: !0 }
    );
  } catch (e) {
    return { ok: !1, error: e };
  }
}
function Bs(e, t) {
  let n = e.chatRunId ?? null,
    r = { sourceClient: t, sessionKey: e.sessionKey, ...Ne(e, e.sessionKey) };
  return n ? { ...r, runId: n } : { ...r, runId: null, ...Rs(e, e.sessionKey) };
}
async function Vs(e) {
  let t = e.client;
  if (!t || !e.connected) return !1;
  let n = await zs(t, Bs(e, t));
  return (n.ok || Ns(e, ir(n.error)), n.ok);
}
async function Hs(e) {
  let t = e.pendingAbort,
    n = e.client;
  if (!t || !n || !e.connected || ((e.pendingAbort = null), t.sourceClient !== n)) return !1;
  let r = On({ client: n, hello: e.hello, phase: `connected` }, !0).abort;
  if (!r.allowed) return (Ns(e, r.reason), !1);
  let i = await zs(n, t);
  return i.ok ? !0 : (Ns(e, ir(i.error)), !1);
}
async function Us(e, t) {
  let n = e.connected ? null : e.client,
    r = n ? Bs(e, n) : null,
    i = r?.runId ? r : null;
  if (!e.connected && !i) {
    Ns(e, O(`chat.questions.disconnected`));
    return;
  }
  if ((t?.preserveDraft || ((e.chatMessage = ``), cr(e)), i)) {
    e.pendingAbort = i;
    return;
  }
  await Vs(e);
}
function Ws(e) {
  e != null && globalThis.clearTimeout(e);
}
function Gs(e) {
  return (
    e.toolStreamById instanceof Map &&
    Array.isArray(e.toolStreamOrder) &&
    Array.isArray(e.chatToolMessages) &&
    Array.isArray(e.chatStreamSegments)
  );
}
function Ks(e) {
  (Ws(e.chatRunStatusClearTimer), (e.chatRunStatusClearTimer = null), (e.chatRunStatus = null));
}
function qs(e, t) {
  (Ws(e.chatRunStatusClearTimer),
    (e.chatRunStatusClearTimer = globalThis.setTimeout(() => {
      let n = e.chatRunStatus;
      n?.phase === t.phase &&
        n.runId === t.runId &&
        n.sessionKey === t.sessionKey &&
        n.occurredAt === t.occurredAt &&
        ((e.chatRunStatus = null),
        (e.chatRunStatusClearTimer = null),
        nc(e) || e.requestUpdate?.());
    }, ac)));
}
function Js(e, t) {
  (t ? e.knownAgentRunIds?.delete(t) : e.knownAgentRunIds?.clear(),
    (!t || e.chatRunStartup?.runId === t) && (e.chatRunStartup = null),
    Ws(e.compactionClearTimer),
    (e.compactionClearTimer = null),
    (e.compactionStatus &&= null),
    Ws(e.fallbackClearTimer),
    (e.fallbackClearTimer = null),
    (e.fallbackStatus &&= null));
  for (let [n, r] of e.waitingApprovalStatuses ?? [])
    (!t || !r.runId || r.runId === t) && e.waitingApprovalStatuses?.delete(n);
}
function Ys(e, t) {
  let n = new Set(),
    r = Ms(t.sessionKey) ?? e.sessionKey;
  (r && n.add(r), Ae(e, `global`, r) && n.add(`global`));
  for (let t of e.sessionsResult?.sessions ?? []) Ae(e, t.key, r) && n.add(t.key);
  for (let e of t.sessionKeys ?? []) {
    let t = Ms(e);
    t && n.add(t);
  }
  return n;
}
function Xs(e, t, n) {
  if (!t.outcome) return;
  let r = Ys(e, t);
  if (r.size === 0) return;
  let i = t.sessionStatus ?? (t.outcome === `done` ? `done` : `killed`),
    a = { sessionKeys: [...r], runId: t.runId ?? e.chatRunId ?? null, status: i, endedAt: n };
  ((e.sessionsResult &&= ze(e.sessionsResult, a)), e.sessions?.reconcileRunTerminal?.(a));
}
function Zs(e, t, n) {
  if (!t.yielded) return;
  let r = {
    sessionKeys: [...Ys(e, t)],
    runId: t.runId ?? e.chatRunId ?? null,
    status: `running`,
    endedAt: n,
  };
  ((e.sessionsResult &&= ze(e.sessionsResult, r)), e.sessions?.reconcileRunTerminal?.(r));
}
function Qs(e, t = {}) {
  let n = Date.now(),
    r = t.runId ?? e.chatRunId ?? null,
    i = Ms(t.sessionKey) ?? e.sessionKey;
  if (
    ((t.clearIndicators ?? !0) && Js(e, r),
    t.clearChatStream && ((e.chatStream = null), (e.chatStreamStartedAt = null)),
    t.clearLocalRun && (e.chatRunId = null),
    Gs(e) && (t.clearToolStream ? ts(e) : t.clearToolStreamForRun && r && ns(e, r)),
    t.outcome)
  ) {
    let a = { phase: t.outcome, runId: r, sessionKey: i, occurredAt: n };
    (Xs(e, t, n),
      t.armLocalTerminalReconcile &&
        (e.lastLocalTerminalReconcile = {
          sessionKey: i,
          runId: r,
          phase: t.outcome,
          sessionStatus: t.sessionStatus ?? (t.outcome === `done` ? `done` : `killed`),
        }),
      t.publishRunStatus !== !1 && ((e.chatRunStatus = a), qs(e, a)));
  } else
    t.yielded
      ? (Zs(e, t, n), (e.lastLocalTerminalReconcile = null), Ks(e))
      : t.clearRunStatus && Ks(e);
  t.requestUpdate !== !1 && e.requestUpdate?.();
}
function $s(e) {
  return e.sessionsResult?.sessions.find((t) => Ae(e, t.key, e.sessionKey));
}
function ec(e) {
  let t = e.lastLocalTerminalReconcile;
  if (!t || t.sessionKey !== e.sessionKey) return !1;
  let n = $s(e);
  return !n || !Pe(n)
    ? !1
    : t.runId == null || n.activeRunIds?.length !== 1 || n.activeRunIds[0] !== t.runId
      ? ((e.lastLocalTerminalReconcile = null), !1)
      : (Xs(
          e,
          {
            outcome: t.phase,
            sessionStatus: t.sessionStatus,
            sessionKey: t.sessionKey,
            runId: t.runId,
          },
          Date.now(),
        ),
        e.requestUpdate?.(),
        !0);
}
function tc(e, t = {}) {
  if (!e.chatRunId && e.chatStream == null) return ec(e);
  let n = $s(e);
  return n ? ic(e, n, t) : !1;
}
function nc(e) {
  let t = $s(e);
  return e.chatRunId && t?.lastRunId === e.chatRunId
    ? ic(e, t, { publishRunStatus: !1 })
    : e.lastLocalTerminalReconcile != null &&
        !e.chatRunId &&
        e.chatStream == null &&
        tc(e, { publishRunStatus: !1 });
}
function rc(e, t, n) {
  return Ae(e, t, n);
}
function ic(e, t, n = {}) {
  if (
    !rc(e, t.key, e.sessionKey) ||
    (!e.chatRunId && e.chatStream == null) ||
    t.hasActiveRun === !0 ||
    Pe(t) ||
    (t.hasActiveRun !== !1 && t.status === `running`)
  )
    return !1;
  let r = t.status !== void 0;
  return t.hasActiveRun !== !1 && !r
    ? !1
    : (Qs(e, {
        outcome: t.status === `done` ? `done` : `interrupted`,
        sessionStatus: t.status === `running` || t.status === void 0 ? `killed` : t.status,
        runId: e.chatRunId,
        sessionKey: e.sessionKey,
        sessionKeys: [t.key],
        clearLocalRun: !0,
        clearChatStream: !0,
        clearToolStreamForRun: !0,
        publishRunStatus: n.publishRunStatus,
      }),
      !0);
}
var ac, oc;
function sc() {
  return (sc = e(() => {
    (_t(),
      Ce(),
      C(),
      bn(),
      rr(),
      lr(),
      js(),
      (ac = 5e3),
      (oc = new Set([`/stop`, `stop`, `esc`, `abort`, `wait`, `exit`])));
  }))();
}
function cc(e) {
  let t = H.get(e);
  if (t) return (H.delete(e), H.set(e, t), t);
  let n = new Map();
  for (H.set(e, n); H.size > Cc;) {
    let e = H.keys().next().value;
    if (typeof e != `string`) break;
    H.delete(e);
  }
  return n;
}
function lc(e, t) {
  let n = cc(e),
    r = P(n, t);
  if (r !== void 0) return r;
  for (let [e, r] of n) if (T(e, t)) return (n.delete(e), F(n, t, r), r);
}
function uc(e, t, n) {
  let r = cc(e);
  for (let e of r.keys()) T(e, t) && r.delete(e);
  F(r, t, { scrollTop: Math.max(0, n.scrollTop), anchorToEnd: n.anchorToEnd });
}
function dc(e) {
  let t = Math.max(0, e.scrollHeight - e.clientHeight),
    n = Math.min(Math.max(0, e.scrollTop), t);
  return { scrollTop: n, anchorToEnd: t - n <= 8 };
}
function fc(e, t) {
  return typeof e.querySelector == `function` ? e.querySelector(t) : null;
}
function pc(e) {
  (e.chatScrollFrame != null &&
    (cancelAnimationFrame(e.chatScrollFrame), (e.chatScrollFrame = null)),
    e.chatScrollGuardFrame != null &&
      (cancelAnimationFrame(e.chatScrollGuardFrame), (e.chatScrollGuardFrame = null)),
    (e.chatIsProgrammaticScroll = !1));
}
function mc(e) {
  ((e.chatScrollGeneration += 1),
    e.chatScrollCommitCleanup?.(),
    (e.chatScrollCommitCleanup = null),
    pc(e));
}
function hc(e, t) {
  e.chatNewMessagesBelow !== t && ((e.chatNewMessagesBelow = t), e.renderLifecycle.invalidate());
}
function gc(e, t, n, r) {
  e.chatScrollGuardFrame != null && cancelAnimationFrame(e.chatScrollGuardFrame);
  let i = () => {
    if (((e.chatScrollGuardFrame = null), t !== e.chatScrollGeneration)) return;
    let a = n.scrollHeight - n.scrollTop - n.clientHeight;
    if (r && a > 8) {
      e.chatScrollGuardFrame = requestAnimationFrame(i);
      return;
    }
    e.chatIsProgrammaticScroll = !1;
  };
  e.chatScrollGuardFrame = requestAnimationFrame(i);
}
function _c(e) {
  return fc(e, `.chat-thread`);
}
function vc(e, t = !1, n = !1, r = {}) {
  pc(e);
  let i = e.chatScrollGeneration;
  e.chatScrollFrame = requestAnimationFrame(() => {
    if (((e.chatScrollFrame = null), i !== e.chatScrollGeneration)) return;
    let a = _c(e);
    if (!a) return;
    let o = a.scrollHeight - a.scrollTop - a.clientHeight,
      s = a.scrollHeight > (e.chatLastScrollHeight ?? 0) + 1;
    e.chatLastScrollHeight = a.scrollHeight;
    let c = r.contentChanged ?? r.source !== `resize`,
      l = r.source === `manual`,
      u = t && !e.chatHasAutoScrolled;
    if (
      !(
        l ||
        u ||
        (!e.chatFollowLocked && (r.source === `resize` || e.chatUserNearBottom || o < Sc))
      )
    ) {
      (c || (r.source === `resize` && s)) && hc(e, !0);
      return;
    }
    (u && (e.chatHasAutoScrolled = !0), (e.chatFollowLocked = !1));
    let d =
        n &&
        (typeof window > `u` ||
          typeof window.matchMedia != `function` ||
          !window.matchMedia(`(prefers-reduced-motion: reduce)`).matches),
      f = a.scrollHeight;
    ((e.chatProgrammaticScrollTarget = f),
      (e.chatIsProgrammaticScroll = !0),
      e.chatScrollToEnd
        ? e.chatScrollToEnd({ behavior: d ? `smooth` : `auto` })
        : typeof a.scrollTo == `function`
          ? a.scrollTo({ top: f, behavior: d ? `smooth` : `auto` })
          : (a.scrollTop = f),
      gc(e, i, a, d || !!e.chatScrollToEnd),
      (e.chatUserNearBottom = !0),
      hc(e, !1));
  });
}
function yc(e, t = !1, n = !1, r = {}) {
  mc(e);
  let i = e.chatScrollGeneration,
    a = !1,
    o = e.renderLifecycle.afterCommit(() => {
      ((a = !0),
        i === e.chatScrollGeneration && ((e.chatScrollCommitCleanup = null), vc(e, t, n, r)));
    });
  a || (e.chatScrollCommitCleanup = o);
}
function bc(e, t) {
  let n = t.currentTarget;
  if (!n) return;
  let r = Math.max(0, n.scrollTop),
    i = r - e.chatLastScrollTop;
  ((e.chatLastScrollTop = r), (e.chatLastScrollHeight = n.scrollHeight));
  let a = i < 0;
  if (e.chatIsProgrammaticScroll) {
    if (!a) return;
    (e.chatScrollGuardFrame != null &&
      (cancelAnimationFrame(e.chatScrollGuardFrame), (e.chatScrollGuardFrame = null)),
      (e.chatIsProgrammaticScroll = !1));
  }
  let o = n.scrollHeight - n.scrollTop - n.clientHeight;
  (a && o > 8
    ? ((e.chatHasAutoScrolled = !0), (e.chatFollowLocked = !0))
    : o <= 8 && (e.chatFollowLocked = !1),
    (e.chatUserNearBottom = !e.chatFollowLocked && o < Sc),
    hc(e, n.scrollHeight - n.clientHeight > 8 && o > 8));
}
function xc(e) {
  (mc(e),
    (e.chatHasAutoScrolled = !1),
    (e.chatUserNearBottom = !0),
    (e.chatFollowLocked = !1),
    (e.chatLastScrollTop = 0),
    (e.chatLastScrollHeight = 0),
    (e.chatNewMessagesBelow = !1),
    (e.chatIsProgrammaticScroll = !1),
    (e.chatProgrammaticScrollTarget = 0));
}
var Sc, Cc, H;
function wc() {
  return (wc = e(() => {
    (C(), kr(), (Sc = 450), (Cc = 8), (H = new Map()));
  }))();
}
function Tc(e) {
  let t = e;
  return t.toolStreamById instanceof Map &&
    Array.isArray(t.toolStreamOrder) &&
    Array.isArray(t.chatToolMessages) &&
    Array.isArray(t.chatStreamSegments)
    ? t
    : null;
}
function Ec(e) {
  let t = e;
  return Array.isArray(t.toolStreamOrder) ? t.toolStreamOrder.filter((e) => b(e) !== void 0) : [];
}
function Dc(e) {
  for (let t = e.length - 1; t >= 0; t--) {
    let n = e[t];
    if (!(!n || typeof n != `object`) && s(n.role) === `user`) return t;
  }
  return -1;
}
function Oc(e, t) {
  let n = Tc(e);
  if (!n) return;
  let r = t?.preserveStreamSegments ? [...n.chatStreamSegments] : null;
  (ts(n), r && (n.chatStreamSegments = r));
}
function kc(e, t) {
  let n = Tc(e);
  n && ns(n, t);
}
function Ac(e) {
  let t = e;
  Array.isArray(t.chatStreamSegments) && (t.chatStreamSegments = []);
}
function jc(e, t = e, n = Date.now(), r = `current`, i, a, o) {
  return {
    role: `assistant`,
    content: [{ type: `text`, text: e }],
    timestamp: n,
    openclawStreamFallback: {
      replacementText: t,
      source: r,
      ...(i ? { itemId: i } : {}),
      ...(a ? { runId: a } : {}),
      ...(o ? { afterBoundaryRunId: o } : {}),
    },
  };
}
function Mc(e) {
  return v(v(e)?.openclawStreamFallback);
}
function Nc(e) {
  let t = Mc(e);
  return t && !b(t.itemId) ? t : null;
}
function Pc(e, t) {
  let n = k(t),
    r = (n?.role === `assistant` ? n.runId : null) ?? bi(t),
    i = xi(t) ?? void 0;
  if (r)
    for (let t = e.length - 1; t >= 0; --t) {
      let n = e[t],
        a = Nc(n);
      if (!(!a || b(a.runId) !== r)) {
        i = b(a.afterBoundaryRunId) ?? i;
        break;
      }
    }
  let a = Ii(e, { ...(r ? { runId: r } : {}), ...(i ? { afterBoundaryRunId: i } : {}) }),
    o = j(t)?.trim() ?? ``,
    s = new Set(),
    c = [],
    l = 0;
  for (let t = a.start; t < a.end; t += 1) {
    let n = e[t],
      r = Mc(n);
    if (!r) continue;
    let i = j(n)?.trim();
    if (b(r.itemId)) {
      i && i === o && s.add(t);
      continue;
    }
    if ((r.source === `current` && c.push(t), !i)) continue;
    let a = o.slice(l),
      u = /^\s*/u.exec(a)?.[0].length ?? 0;
    a.slice(u).startsWith(i) && (s.add(t), (l += u + i.length));
  }
  let u = c[0];
  s.size === 0 && c.length === 1 && u !== void 0 && s.add(u);
  let d = [],
    f = null;
  for (let t = a.start; t < a.end; t += 1) s.has(t) ? (f ??= d.length) : d.push(e[t]);
  let p = f ?? d.length;
  return [...e.slice(0, a.start), ...d.slice(0, p), t, ...d.slice(p), ...e.slice(a.end)];
}
function Fc(e, t) {
  return !e?.trim() || t(e) ? null : e;
}
function Ic(e, t, n, r, i = e.length) {
  let a = t.trim();
  return a
    ? e.slice(r, i).some((e) => {
        if (!e || typeof e != `object`) return !1;
        let t = s(e.role);
        if ((t && t !== `assistant`) || (t === `assistant` && n(e))) return !1;
        let r = j(e)?.trim();
        return !!(r && (r === a || r.startsWith(a)));
      })
    : !1;
}
function Lc(e, t) {
  let n = Bc(e, { includeCurrent: !0, isHiddenStreamText: () => !1 }).findLast(
    (e) => e.source === `current`,
  );
  return !!(n && (Ic([t], n.replacementText, () => !1, 0) || Ic([t], n.text, () => !1, 0)));
}
function Rc(e) {
  if (!e || typeof e != `object`) return null;
  let t = e.openclawStreamFallback;
  if (!t || typeof t != `object`) return null;
  let n = t.itemId;
  return typeof n == `string` && n.trim() ? n.trim() : null;
}
function zc(e, t, n, r = e.length) {
  return e.slice(n, r).some((e) => Rc(e) === t);
}
function Bc(e, t) {
  let n = e,
    r = ea(e),
    i = [],
    a = null,
    o = Array.isArray(n.chatStreamSegments) ? n.chatStreamSegments : [],
    s = 0,
    c;
  for (let [e, n] of o.entries()) {
    if (!n || typeof n.text != `string`) continue;
    let o = typeof n.toolCallId == `string` && n.toolCallId.trim() ? n.toolCallId.trim() : null,
      l = Qt(n),
      u = l && typeof n.itemId == `string` ? n.itemId.trim() : void 0,
      d = l ? void 0 : r[s],
      f = b(n.runId) ?? d?.runId,
      p = b(n.afterBoundaryRunId) ?? c,
      m = b(n.boundaryRunId);
    !l && n.boundaryMarker !== !0 && (s += 1);
    let h = en(n),
      g = Fc(h ? Yt(n.text, a) : n.text, t.isHiddenStreamText);
    (g &&
      i.push({
        text: g,
        replacementText: n.text,
        source: `segment`,
        segmentIndex: e,
        timestamp: typeof n.ts == `number` && Number.isFinite(n.ts) ? n.ts : Date.now(),
        ...(u ? { itemId: u } : {}),
        ...(f ? { runId: f } : {}),
        ...(p ? { afterBoundaryRunId: p } : {}),
        ...(m ? { boundaryRunId: m } : {}),
        toolCallId: o ?? d?.id,
      }),
      h && (a = qt(a, n.text)),
      m && (c = m));
  }
  if (t.includeCurrent !== !1 && typeof e.chatStream == `string`) {
    let n = Fc(Yt(e.chatStream, a), t.isHiddenStreamText);
    n &&
      i.push({
        text: n,
        replacementText: e.chatStream,
        source: `current`,
        timestamp: e.chatStreamStartedAt ?? Date.now(),
        ...(e.chatRunId ? { runId: e.chatRunId } : {}),
        ...(c ? { afterBoundaryRunId: c } : {}),
      });
  }
  return i;
}
function Vc(e, t) {
  if (typeof e.chatStream != `string`) return null;
  let n = e,
    r = Array.isArray(n.chatStreamSegments) ? n.chatStreamSegments : [],
    i = null;
  for (let e of r) en(e) && typeof e.text == `string` && (i = qt(i, e.text));
  return Fc(Yt(e.chatStream, i), t);
}
function Hc(e, t, n, r, i = e.length) {
  return t.itemId
    ? zc(e, t.itemId, r, i)
    : Ic(e, t.replacementText, n, r, i) || Ic(e, t.text, n, r, i);
}
function Uc(e, t) {
  let n = Dc(e) + 1;
  return e
    .slice(n)
    .some((e) =>
      !e || typeof e != `object` || s(e.role) !== `assistant` || t(e) ? !1 : !!j(e)?.trim(),
    );
}
function Wc(e, t, n) {
  let r = Bc(t, n),
    i = n.persistCommentary === !0 ? r : r.filter((e) => !e.itemId);
  return (
    r.length > 0 &&
    (i.length > 0 || Uc(e, n.isHiddenAssistantMessage)) &&
    i.every((t) => {
      let r = Ii(e, t);
      return Hc(e, t, n.isHiddenAssistantMessage, r.start, r.end);
    })
  );
}
function Gc(e, t) {
  return Bc(e, t).length > 0;
}
function Kc(e, t, n) {
  let r = j(e)?.trim();
  if (!r) return !1;
  let i = Bc(t, { includeCurrent: !0, isHiddenStreamText: n.isHiddenStreamText }).filter(
    (e) => n.persistCommentary === !0 || !e.itemId,
  );
  if (i.length === 0) return !1;
  let a = 0;
  for (let [e, t] of i.entries()) {
    let n = t.text.trim(),
      i = r.indexOf(n, a);
    if (i < 0 || (e === 0 && i !== 0)) return !1;
    a = i + n.length;
  }
  return !0;
}
function qc(e, t, n, r, i, a) {
  let o = ea(t),
    s = i ? ta({ id: i, ...(a ? { runId: a } : {}) }, o) : void 0,
    c = s ? new Set([s]) : i ? new Set() : new Set(o.map((e) => e.identity));
  if (c.size === 0) return -1;
  for (let t = n; t < r; t++)
    if (
      R(e[t]).some((e) => {
        let t = ta(e, o);
        return t !== void 0 && c.has(t);
      })
    )
      return t;
  return -1;
}
function Jc(e) {
  if (!e || typeof e != `object`) return null;
  let t = e;
  return p(t.timestamp) ?? p(t.ts) ?? null;
}
function Yc(e, t, n) {
  let r = e,
    i = n.persistCommentary === !0,
    a = n.replacementMessages;
  for (let e of Bc(t, n)) {
    if (!i && e.itemId) continue;
    let o = a?.length ? [...r, ...a] : r,
      s = Ii(o, e);
    if (Hc(o, e, n.isHiddenAssistantMessage, s.start, s.end)) continue;
    let c = o === r ? s : Ii(r, e),
      l =
        e.source === `segment` && e.toolCallId
          ? qc(r, t, c.start, c.end, e.toolCallId, e.runId)
          : -1;
    if (n.requirePersistedTool && l < 0) continue;
    let u = l >= 0 ? l : e.source === `segment` ? Li(r, e.timestamp, c.start, c.end, Jc) : c.end,
      d = jc(
        e.text,
        e.replacementText,
        Ri(r, u, e.timestamp, Jc),
        e.source,
        e.itemId,
        e.runId,
        e.afterBoundaryRunId,
      );
    r = [...r.slice(0, u), d, ...r.slice(u)];
  }
  return r;
}
function Xc() {
  return (Xc = e(() => {
    (wt(), ne(), rn(), qi(), Oi(), ca(), js());
  }))();
}
function Zc(e, t) {
  let n = null;
  return e.flatMap((e, r) =>
    t(e, r)
      ? (en(e) && (n = qt(n, e.text)), [])
      : !n || !en(e)
        ? [e]
        : [{ ...e, text: Yt(e.text, n) }],
  );
}
function Qc(e, t) {
  if (!e.chatStreamSegments || t.length === 0) return;
  let n = new Set(t);
  e.chatStreamSegments = Zc(e.chatStreamSegments, (e, t) => n.has(t));
}
function $c(e, t) {
  let n = v(v(t)?.openclawStreamFallback),
    r = b(n?.itemId);
  !r ||
    !e.chatStreamSegments ||
    Qc(
      e,
      e.chatStreamSegments.flatMap((e, t) => (b(e.itemId) === r ? [t] : [])),
    );
}
function el(e, t, n) {
  if (!Array.isArray(t.chatStreamSegments)) return !1;
  let r = new Set();
  for (let i of Bc(t, { includeCurrent: !1, isHiddenStreamText: n.isHiddenStreamText })) {
    if (i.segmentIndex === void 0 || (i.itemId && n.persistCommentary !== !0)) continue;
    let t = Ii(e, i);
    Hc(e, i, n.isHiddenAssistantMessage, t.start, t.end) && r.add(i.segmentIndex);
  }
  if (r.size === 0) return !1;
  let i = Vc(t, n.isHiddenStreamText);
  return (
    (t.chatStreamSegments = Zc(t.chatStreamSegments, (e, t) => r.has(t))),
    typeof t.chatStream == `string` &&
      ((t.chatStream = i), i === null && (t.chatStreamStartedAt = null)),
    !0
  );
}
function tl(e, t) {
  if (t.size === 0) return;
  let n = ea(e);
  if (e.toolStreamById instanceof Map) for (let n of t) e.toolStreamById.delete(n);
  if (
    (Array.isArray(e.toolStreamOrder) &&
      (e.toolStreamOrder = e.toolStreamOrder.filter((e) => typeof e == `string` && !t.has(e))),
    Array.isArray(e.chatToolMessages) &&
      (e.chatToolMessages = e.chatToolMessages.filter((e) =>
        R(e).every((e) => {
          let r = ta(e, n);
          return r === void 0 || !t.has(r);
        }),
      )),
    !Array.isArray(e.chatStreamSegments))
  )
    return;
  let r = 0;
  e.chatStreamSegments = Zc(e.chatStreamSegments, (e) => {
    if (e.boundaryMarker === !0) return !1;
    let i = b(e.toolCallId),
      a = Qt(e),
      o = a ? void 0 : n[r];
    a || (r += 1);
    let s = b(e.runId),
      c = i ? ta({ id: i, ...(s ? { runId: s } : {}) }, n) : o?.identity;
    return !!(c && t.has(c));
  });
}
function nl() {
  return (nl = e(() => {
    (qi(), Xc(), ca());
  }))();
}
function rl(e, t, n, r, i) {
  if (t.kind !== `live`) return null;
  if (t.activeRunId) return i && i !== t.activeRunId ? null : t.activeRunId;
  let a = e.lastLocalTerminalReconcile,
    o = a?.sessionKey === e.sessionKey ? a.runId : null;
  if (!o) return null;
  if (i) return i === o ? o : null;
  let s = ar(e, e.chatMessages, r).runs[o]?.message,
    c = j(s)?.trim();
  return c && c === j(n)?.trim() ? o : null;
}
function il(e, t, n, r) {
  let i = oe(t);
  if (!i) return;
  let a = i.message,
    o = k(a, i);
  if (!o) return;
  let s = sr(e, { agentId: vn(e) }),
    c = !!(
      o.role === `assistant` &&
      o.sequence !== null &&
      o.runId &&
      r.kind === `live` &&
      r.activeRunId &&
      o.runId !== r.activeRunId
    ),
    l = o.runId === i.runId ? o.runId : null,
    u =
      o.role === `assistant` && o.id && !o.isImported && (l || (!o.runId && n !== !0))
        ? rl(e, r, a, s, l)
        : null;
  if (
    (r.kind === `live` && o.role !== `user` && !c && !u) ||
    (o.isImported && !o.externalSource && bt(a) === null) ||
    (!o.id && !o.idempotencyKey && o.sequence === null)
  )
    return;
  let d = oe(a);
  if (!d) return;
  let f = oe(d.__openclaw),
    p = {
      ...d,
      __openclaw: {
        ...f,
        ...(o.id ? { id: o.id } : {}),
        ...(o.idempotencyKey ? { idempotencyKey: o.idempotencyKey } : {}),
        ...(o.sequence === null ? {} : { seq: o.sequence }),
      },
    },
    m = or(
      e,
      { type: `messagePersisted`, message: p, envelope: u ? { ...i, runId: u } : i },
      { scope: s, runActive: n },
    );
  o.role === `assistant` &&
    m.messages.includes(p) &&
    ($c(e, p),
    u &&
      ((n === !1 || (e.chatStream !== null && Lc(e, p))) &&
        ((e.chatStream = null), (e.chatStreamStartedAt = null)),
      n === !1 && kc(e, u)));
  let h = Ai(p),
    g = e.chatRunId,
    _ = h ? Pi(m.messages, h) : null;
  o.role === `user` &&
    n === !0 &&
    o.runId &&
    h &&
    (!g || g === h || g === o.runId) &&
    _?.runId === o.runId &&
    Fi(e) !== o.runId &&
    ((e.chatRunId = h), Ki(e, { runId: h, boundaryRunId: o.runId }));
}
function al() {
  return (al = e(() => {
    (wt(), rn(), yn(), ur(), qi(), Xc(), nl());
  }))();
}
function U(e) {
  return structuredClone(e);
}
function ol(e) {
  return Math.min(El, Math.max(260, e));
}
function sl(e) {
  return Math.min(Dl, Math.max(220, e));
}
function cl(e) {
  return e.dock === `bottom` ? `bottom` : `right`;
}
function ll(e, t) {
  return (
    e.open === !0 &&
    e.columns.some((e) => e.panels.find((t) => t.id === e.activePanelId)?.slot === t)
  );
}
function ul(e, t) {
  let n = new Set(e.columns.flatMap((e) => e.panels.map((e) => e.id)));
  if (!n.has(t)) return t;
  let r = 2;
  for (; n.has(`${t}-${r}`);) r += 1;
  return `${t}-${r}`;
}
function dl(e, t) {
  for (let n = 0; n < e.columns.length; n += 1) {
    let r = e.columns[n],
      i = r.panels.findIndex((e) => e.id === t);
    if (i < 0) continue;
    let a = r.panels.splice(i, 1)[0];
    return (
      r.panels.length === 0
        ? e.columns.splice(n, 1)
        : r.activePanelId === t &&
          (r.activePanelId = r.panels[Math.min(i, r.panels.length - 1)]?.id ?? ``),
      a
    );
  }
  return null;
}
function fl(e, t) {
  let n = U(e),
    r = n.columns.flatMap((e) => e.panels).find((e) => e.slot === t);
  if (r) {
    n.open = !0;
    let e = n.columns.find((e) => e.panels.includes(r));
    return (e && (e.activePanelId = r.id), n);
  }
  let i = { id: ul(n, t), slot: t },
    a = n.columns[0];
  return (
    a
      ? (a.panels.push(i), (a.activePanelId = i.id))
      : (n.columns = [
          {
            id: `side-panel-column`,
            side: `right`,
            panels: [i],
            activePanelId: i.id,
            height: wl,
            width: Cl,
          },
        ]),
    (n.open = !0),
    n
  );
}
function pl(e, t) {
  let n = U(e),
    r = n.columns.flatMap((e) => e.panels).find((e) => e.slot === t);
  return (r && dl(n, r.id), n);
}
function ml(e, t) {
  let n = new Set(t),
    r = U(e);
  return (
    (r.columns = r.columns.flatMap((e) => {
      let t = e.panels.filter((e) => n.has(e.slot));
      return t.length === 0
        ? []
        : [
            {
              ...e,
              panels: t,
              activePanelId: t.some((t) => t.id === e.activePanelId) ? e.activePanelId : t[0].id,
            },
          ];
    })),
    r
  );
}
function hl(e, t) {
  let n = U(e),
    r = n.columns.find((e) => e.panels.some((e) => e.id === t));
  return (r && ((r.activePanelId = t), (n.open = !0)), n);
}
function gl(e, t, n, r) {
  let i = U(e),
    a = i.columns[0]?.panels;
  if (!a || t === n) return i;
  let o = a.findIndex((e) => e.id === t),
    s = a.findIndex((e) => e.id === n);
  if (o < 0 || s < 0) return i;
  let [c] = a.splice(o, 1),
    l = a.findIndex((e) => e.id === n);
  return (a.splice(l + +(r === `after`), 0, c), i);
}
function _l(e, t) {
  return { ...U(e), open: t };
}
function vl(e, t) {
  return { ...U(e), expanded: t };
}
function yl(e, t) {
  return { ...U(e), dock: t };
}
function bl(e, t, n) {
  let r = U(e),
    i = r.columns.find((e) => e.id === t);
  return (
    i && Number.isFinite(n) && (cl(r) === `bottom` ? (i.height = sl(n)) : (i.width = ol(n))), r
  );
}
function xl(e, t) {
  let n = U(e);
  if (!Number.isFinite(t) || t <= 0) return n;
  let r = n.columns[0];
  if (!r) return n;
  if (((n.columns = [r]), cl(n) === `bottom`)) return ((r.height = sl(r.height)), n);
  let i = Math.max(260, Math.min(El, t * 0.6)),
    a = Math.max(0, t - Ol - kl);
  return 260 > a ? null : ((r.width = Math.min(i, a, ol(r.width))), n);
}
function Sl(e, t) {
  return t < 680;
}
var Cl, wl, Tl, El, Dl, Ol, kl;
function Al() {
  return (Al = e(() => {
    (_e(),
      (Cl = 480),
      (wl = 360),
      (Tl = `openclaw-sidebar-geometry-commit`),
      (El = 1200),
      (Dl = 800),
      (Ol = 312),
      (kl = 4));
  }))();
}
function jl(e, t, n) {
  let r = e.length > 0 && t?.recoveryScopeReady === !0 && !n;
  return { profiles: r ? [] : e, unsupported: r };
}
function Ml(e, t, n) {
  return t
    ? to(e).then((e) => ({ ...e, profiles: n ? e.profiles : [] }))
    : Promise.resolve({ profiles: [], environments: [] });
}
var Nl;
function Pl() {
  return (Pl = e(() => {
    (so(), (Nl = [1e3, 3e3, 1e4, 3e4, 6e4]));
  }))();
}
function Fl() {
  return {
    entries: [],
    nextEntryId: 1,
    userEntryId: null,
    userEntryAwaitingFinal: !1,
    userEntryAwaitingFinalStartedAtMs: null,
    assistantEntryId: null,
  };
}
function Il(e, t) {
  let n = t.text;
  if (t.final ? n.trim() === `` : n === ``) return e;
  let r = t.nowMs ?? Date.now();
  if (t.role === `assistant`) {
    let i = zl(e, `user`, r);
    return Ll(i, t.role, i.assistantEntryId, n, t.final, r);
  }
  let i = e.userEntryId,
    a = i !== null && Bl(e, i, n, t.final, r),
    o = i === null || a ? zl(e, `assistant`, r) : e;
  return Ll(
    a && i !== null
      ? {
          ...zl(o, `user`, r),
          userEntryId: null,
          userEntryAwaitingFinal: !1,
          userEntryAwaitingFinalStartedAtMs: null,
        }
      : o,
    t.role,
    a ? null : i,
    n,
    t.final,
    r,
  );
}
function Ll(e, t, n, r, i, a) {
  if (n === null) {
    let n = `rt-${e.nextEntryId}`,
      o = [...e.entries, { id: n, role: t, text: Ul(r.trimStart()), isStreaming: !i }].slice(-60);
    return Rl({ ...e, entries: o, nextEntryId: e.nextEntryId + 1 }, t, n, i, a);
  }
  let o = e.entries.findIndex((e) => e.id === n);
  if (o === -1) return Ll(e, t, null, r, i, a);
  let s = e.entries[o];
  if (!s) return Ll(e, t, null, r, i, a);
  let c = Ul(t === `assistant` ? Vl(s.text, r, i) : Hl(s.text, r, i)),
    l =
      s.text === c && s.isStreaming === !i
        ? e.entries
        : e.entries.map((e, t) => (t === o ? { ...e, text: c, isStreaming: !i } : e));
  return Rl({ ...e, entries: l }, t, n, i, a);
}
function Rl(e, t, n, r, i) {
  return t === `user`
    ? {
        ...e,
        userEntryId: r ? null : n,
        userEntryAwaitingFinal: !1,
        userEntryAwaitingFinalStartedAtMs: null,
      }
    : { ...e, assistantEntryId: r ? null : n };
}
function zl(e, t, n = Date.now()) {
  let r = t === `user` ? e.userEntryId : e.assistantEntryId;
  if (r === null) return e;
  let i = e.entries.map((e) => (e.id === r && e.isStreaming ? { ...e, isStreaming: !1 } : e));
  return t === `user`
    ? { ...e, entries: i, userEntryAwaitingFinal: !0, userEntryAwaitingFinalStartedAtMs: n }
    : { ...e, entries: i, assistantEntryId: null };
}
function Bl(e, t, n, r, i) {
  let a = e.entries.find((e) => e.id === t);
  if (!a || a.isStreaming) return !1;
  let o = a.text;
  return !(
    o.trim() === `` ||
    n.trim() === `` ||
    (n[0] && /\s/.test(n[0])) ||
    n === o ||
    n.startsWith(o) ||
    o.endsWith(n) ||
    (r &&
      e.userEntryAwaitingFinal &&
      (e.userEntryAwaitingFinalStartedAtMs === null
        ? 1 / 0
        : i - e.userEntryAwaitingFinalStartedAtMs) <= $l &&
      Wl(o, n))
  );
}
function Vl(e, t, n) {
  return e.trim() === ``
    ? t.trimStart()
    : n && (t === e || t.startsWith(e) || Wl(e, t))
      ? t
      : `${e}${t}`;
}
function Hl(e, t, n) {
  if (e.trim() === ``) return t.trimStart();
  if (t === `` || t === e || e.endsWith(t)) return e;
  if (t.startsWith(e)) return t;
  if (t[0] && /\s/.test(t[0])) return `${e}${t}`;
  if (n && Wl(e, t)) return t;
  let r = Jl(e, t),
    i = r > 0 ? t.slice(r) : t;
  return i === `` ? e : `${e}${r > 0 || !Yl(e, i) ? `` : ` `}${i}`;
}
function Ul(e) {
  if (e.length <= Xl) return e;
  let t = e.indexOf(Ql),
    n = ce(e, 0, t >= 255 && t <= Zl ? t : Zl).replace(/[\uD800-\uDBFF]$/, ``),
    r = Xl - n.length - 3,
    i = ce(e, -r);
  return `${n}${Ql}${i}`;
}
function Wl(e, t) {
  let n = Gl(e),
    r = Gl(t);
  if (n.length === 0 || r.length === 0 || n[0] !== r[0]) return !1;
  if (n.length > 1 && r.length > 1 && n[1] === r[1]) return !0;
  let i = Kl(e),
    a = Kl(t),
    o = ql(i, a),
    s = Math.min(i.length, a.length);
  return o >= 6 && o / Math.max(1, s) >= 0.45;
}
function Gl(e) {
  return [...e.toLowerCase().matchAll(/[\p{L}\p{N}]+/gu)].map((e) => e[0]);
}
function Kl(e) {
  return e.toLowerCase().replace(/\s+/g, ` `).trim();
}
function ql(e, t) {
  let n = Math.min(e.length, t.length),
    r = 0;
  for (; r < n && e[r] === t[r];) r += 1;
  return r;
}
function Jl(e, t) {
  let n = e.toLowerCase(),
    r = t.toLowerCase(),
    i = Math.min(n.length, r.length);
  for (let e = i; e >= 3; --e) if (n.endsWith(r.slice(0, e))) return e;
  return 0;
}
function Yl(e, t) {
  let n = e.at(-1),
    r = t[0];
  return !n || !r || /\s/.test(n) || /\s/.test(r)
    ? !1
    : /[\p{L}\p{N}.!?,:;)\]}"'’”]/u.test(n) && /[\p{L}\p{N}]/u.test(r);
}
var Xl, Zl, Ql, $l;
function eu() {
  return (eu = e(() => {
    ((Xl = 8e3),
      (Zl = 256),
      (Ql = `
…
`),
      ($l = 1500));
  }))();
}
function tu(e, t) {
  let n = [],
    r = new Set();
  for (let i of e) {
    let e = i.deviceId.trim();
    i.kind !== t ||
      !e ||
      e === "default" ||
      r.has(e) ||
      (r.add(e),
      n.push({
        deviceId: e,
        label:
          i.label.trim() ||
          O(
            t === `audioinput`
              ? `chat.composer.microphoneFallback`
              : `chat.composer.cameraFallback`,
            { number: String(n.length + 1) },
          ),
      }));
  }
  return n;
}
function nu(e, t) {
  let n = e.filter((e) => e.kind === t);
  return n.length === 0 || n.some((e) => !e.deviceId || !e.label);
}
function ru(e) {
  return (e instanceof DOMException ? gu[e.name] : void 0) ?? `failed`;
}
function iu(e, t) {
  let [n, r] = hu[e];
  return O(t === `audioinput` ? n : r);
}
function au(e) {
  let t = globalThis.navigator?.mediaDevices;
  return t?.addEventListener
    ? (t.addEventListener(`devicechange`, e), () => t.removeEventListener(`devicechange`, e))
    : () => void 0;
}
function ou(e) {
  return iu(ru(e), `audioinput`);
}
async function su(e, t) {
  let n = globalThis.navigator?.mediaDevices;
  if (!n?.enumerateDevices)
    return { devices: [], permissionRequired: !1, issue: `list-unsupported` };
  let r;
  try {
    r = await n.enumerateDevices();
  } catch (e) {
    return { devices: [], permissionRequired: !1, issue: ru(e) };
  }
  let i = nu(r, t);
  if (!e || !i || !n.getUserMedia) return { devices: tu(r, t), permissionRequired: i, issue: null };
  try {
    return (
      (await n.getUserMedia(t === `audioinput` ? { audio: !0 } : { video: !0 }))
        .getTracks()
        .forEach((e) => e.stop()),
      (r = await n.enumerateDevices()),
      { devices: tu(r, t), permissionRequired: nu(r, t), issue: null }
    );
  } catch (e) {
    return { devices: tu(r, t), permissionRequired: i, issue: ru(e) };
  }
}
async function cu(e) {
  return su(e, `audioinput`);
}
async function lu(e) {
  return su(e, `videoinput`);
}
function uu(e) {
  let t = e?.trim();
  return {
    autoGainControl: !0,
    echoCancellation: !0,
    noiseSuppression: !0,
    ...(t ? { deviceId: { exact: t } } : {}),
  };
}
function du(e) {
  return e.reason instanceof Error
    ? e.reason
    : new DOMException(`Realtime Talk input cancelled`, `AbortError`);
}
async function fu(e, t) {
  if (t?.aborted) throw du(t);
  let n = e();
  if (!t) return await n;
  let r = () => void 0,
    i = new Promise((e, n) => {
      let i = () => n(du(t));
      (t.addEventListener(`abort`, i, { once: !0 }), (r = () => t.removeEventListener(`abort`, i)));
    });
  try {
    return await Promise.race([n, i]);
  } catch (e) {
    throw t.aborted
      ? (n.then(
          (e) => e.getTracks().forEach((e) => e.stop()),
          () => void 0,
        ),
        du(t))
      : e;
  } finally {
    r();
  }
}
async function pu(e, t = {}) {
  let n = globalThis.navigator?.mediaDevices;
  if (!n?.getUserMedia) throw Error(O(`chat.composer.realtimeTalkRequiresMicrophone`));
  let r;
  try {
    r = { stream: await fu(() => n.getUserMedia({ audio: uu(e) }), t.signal) };
  } catch (t) {
    if (e?.trim() && t instanceof DOMException && t.name === `OverconstrainedError`)
      throw Error(O(`chat.composer.selectedMicrophoneUnavailable`), { cause: t });
    if (t instanceof DOMException && t.name !== `AbortError`) r = { failure: ou(t) };
    else throw t;
  }
  if (`failure` in r) throw Error(r.failure);
  let { stream: i } = r;
  if (t.signal?.aborted) throw (i.getTracks().forEach((e) => e.stop()), du(t.signal));
  return i;
}
async function mu(e, t = {}) {
  let n = globalThis.navigator?.mediaDevices;
  if (!n?.getUserMedia) throw Error(O(`chat.composer.cameraAccessFailed`));
  let r = e?.trim(),
    i;
  try {
    if (
      ((i = await fu(() => n.getUserMedia({ video: !r || { deviceId: { exact: r } } }), t.signal)),
      t.signal?.aborted)
    )
      throw (i.getTracks().forEach((e) => e.stop()), du(t.signal));
    return i;
  } catch (e) {
    throw t.signal?.aborted
      ? du(t.signal)
      : r && e instanceof DOMException && e.name === `OverconstrainedError`
        ? Error(O(`chat.composer.selectedCameraUnavailable`), { cause: e })
        : e instanceof DOMException && e.name === `NotAllowedError`
          ? Error(O(`chat.composer.cameraPermissionBlocked`), { cause: e })
          : e instanceof DOMException && e.name === `NotFoundError`
            ? Error(O(`chat.composer.cameraNoneFound`), { cause: e })
            : e instanceof DOMException && e.name === `NotReadableError`
              ? Error(O(`chat.composer.cameraBusy`), { cause: e })
              : Error(O(`chat.composer.cameraAccessFailed`), { cause: e });
  }
}
var hu, gu;
function _u() {
  return (_u = e(() => {
    (_t(),
      (hu = {
        "list-unsupported": [
          `chat.composer.microphoneListUnsupported`,
          `chat.composer.cameraListUnsupported`,
        ],
        "none-found": [`chat.composer.microphoneNoneFound`, `chat.composer.cameraNoneFound`],
        "permission-blocked": [
          `chat.composer.microphonePermissionBlocked`,
          `chat.composer.cameraPermissionBlocked`,
        ],
        busy: [`chat.composer.microphoneBusy`, `chat.composer.cameraBusy`],
        "page-inactive": [
          `chat.composer.microphonePageInactive`,
          `chat.composer.cameraPageInactive`,
        ],
        failed: [`chat.composer.microphoneAccessFailed`, `chat.composer.cameraAccessFailed`],
      }),
      (gu = {
        NotAllowedError: `permission-blocked`,
        NotFoundError: `none-found`,
        NotReadableError: `busy`,
        InvalidStateError: `page-inactive`,
      }));
  }))();
}
var vu;
function yu() {
  return (yu = e(() => {
    vu = class {
      constructor() {
        ((this.listeners = new Set()), (this.currentLevel = 0));
      }
      get value() {
        return this.currentLevel;
      }
      set(e) {
        let t = Math.round((Number.isFinite(e) ? Math.min(1, Math.max(0, e)) : 0) * 100) / 100;
        if (t !== this.currentLevel) {
          this.currentLevel = t;
          for (let e of this.listeners) e(t);
        }
      }
      subscribe(e) {
        return (this.listeners.add(e), e(this.currentLevel), () => this.listeners.delete(e));
      }
    };
  }))();
}
function bu(e) {
  let t = ``,
    n = 32768;
  for (let r = 0; r < e.length; r += n) {
    let i = e.subarray(r, r + n);
    t += String.fromCharCode(...i);
  }
  return btoa(t);
}
function xu(e) {
  let t = atob(e),
    n = new Uint8Array(t.length);
  for (let e = 0; e < t.length; e += 1) n[e] = t.charCodeAt(e);
  return n;
}
function Su(e) {
  let t = new Uint8Array(e.length * 2),
    n = new DataView(t.buffer);
  for (let t = 0; t < e.length; t += 1) {
    let r = Math.max(-1, Math.min(1, e[t] ?? 0));
    n.setInt16(t * 2, r < 0 ? r * 32768 : r * 32767, !0);
  }
  return t;
}
function Cu(e) {
  let t = new Uint8Array(e.length);
  for (let n = 0; n < e.length; n += 1) {
    let r = Math.max(-1, Math.min(1, e[n] ?? 0)),
      i = Math.round(r < 0 ? r * 32768 : r * 32767),
      a = 0,
      o = i;
    (o < 0 && ((a = 128), (o = -o)), (o = Math.min(o, 32635) + 132));
    let s = 7,
      c = 16384;
    for (; (o & c) === 0 && s > 0;) (--s, (c >>= 1));
    let l = (o >> (s + 3)) & 15;
    t[n] = ~(a | (s << 4) | l) & 255;
  }
  return t;
}
function wu(e) {
  let t = 0,
    n = 0;
  for (let r of e) {
    let e = Number.isFinite(r) ? r : 0;
    ((t = Math.max(t, Math.abs(e))), (n += e * e));
  }
  return { peak: t, rms: e.length > 0 ? Math.sqrt(n / e.length) : 0 };
}
function Tu(e) {
  let t = new DataView(e.buffer, e.byteOffset, e.byteLength),
    n = new Float32Array(Math.floor(e.byteLength / 2));
  for (let e = 0; e < n.length; e += 1) n[e] = t.getInt16(e * 2, !0) / 32768;
  return n;
}
function Eu(e) {
  let t = e.endsWith(`==`) ? 2 : +!!e.endsWith(`=`);
  return Math.max(0, Math.floor((e.length * 3) / 4) - t);
}
var Du, Ou, ku, Au, ju, Mu;
function Nu() {
  return (Nu = e(() => {
    ((Du = class {
      constructor() {
        ((this.source = null), (this.processor = null), (this.sink = null));
      }
      start(e, t, n) {
        (this.stop(),
          (this.source = t.createMediaStreamSource(e)),
          (this.processor = t.createScriptProcessor(4096, 1, 1)),
          (this.sink = t.createGain()),
          (this.sink.gain.value = 0),
          (this.processor.onaudioprocess = (e) => n(e.inputBuffer.getChannelData(0))),
          this.source.connect(this.processor),
          this.processor.connect(this.sink),
          this.sink.connect(t.destination));
      }
      stop() {
        ((this.processor &&=
          ((this.processor.onaudioprocess = null), this.processor.disconnect(), null)),
          this.sink?.disconnect(),
          (this.sink = null),
          this.source?.disconnect(),
          (this.source = null));
      }
    }),
      (Ou = class {
        constructor() {
          ((this.level = 0), (this.noiseFloor = 0.01));
        }
        sample(e) {
          let t = wu(e),
            n = 0.65 * t.rms + 0.35 * t.peak;
          n <= Math.max(0.02, this.noiseFloor * 2) &&
            (this.noiseFloor = 0.95 * this.noiseFloor + 0.05 * n);
          let r = Math.max(0, n - this.noiseFloor * 1.5),
            i = Math.min(1, Math.sqrt(r / 0.18)),
            a = i > this.level ? 0.65 : 0.18;
          return (
            (this.level = a * i + (1 - a) * this.level),
            this.level < 0.01 && (this.level = 0),
            this.level
          );
        }
        reset() {
          ((this.level = 0), (this.noiseFloor = 0.01));
        }
      }),
      (ku = class {
        constructor(e) {
          ((this.onLevel = e),
            (this.context = null),
            (this.source = null),
            (this.analyser = null),
            (this.timer = null),
            (this.ownsContext = !1),
            (this.levelMeter = new Ou()),
            (this.samples = new Float32Array(512)),
            (this.lastLevel = -1));
        }
        start(e, t) {
          this.stop(!1);
          try {
            let n = t ?? new AudioContext();
            ((this.context = n), (this.ownsContext = !t));
            let r = n.createMediaStreamSource(e);
            this.source = r;
            let i = n.createAnalyser();
            ((this.analyser = i),
              (i.fftSize = this.samples.length),
              (i.smoothingTimeConstant = 0),
              r.connect(i),
              (this.timer = globalThis.setInterval(() => this.publishCurrentLevel(), 100)),
              this.publishCurrentLevel());
          } catch {
            this.stop();
          }
        }
        stop(e = !0) {
          (this.timer !== null && (globalThis.clearInterval(this.timer), (this.timer = null)),
            this.source?.disconnect(),
            (this.source = null),
            this.analyser?.disconnect(),
            (this.analyser = null),
            this.ownsContext && this.context?.close(),
            (this.context = null),
            (this.ownsContext = !1),
            this.levelMeter.reset(),
            (this.lastLevel = -1),
            e && this.onLevel(0));
        }
        publishCurrentLevel() {
          if (!this.analyser) return;
          (this.samples.fill(0), this.analyser.getFloatTimeDomainData(this.samples));
          let e = Math.round(this.levelMeter.sample(this.samples) * 100) / 100;
          e !== this.lastLevel && ((this.lastLevel = e), this.onLevel(e));
        }
      }),
      (Au = 10),
      (ju = 320),
      (Mu = class {
        constructor() {
          ((this.playhead = 0), (this.sources = new Set()));
        }
        get queuedUntil() {
          return this.playhead;
        }
        get isPlaying() {
          return this.sources.size > 0;
        }
        play(e, t, n) {
          if (!t) return `ignored`;
          let r = Math.max(t.currentTime, this.playhead),
            i = Math.max(0, r - t.currentTime),
            a = Au - i,
            o = Eu(e),
            s = Math.floor(o / 2);
          if (this.sources.size >= ju || a <= 0 || s / n > a) return `overflow`;
          let c;
          try {
            c = Tu(xu(e));
          } catch {
            return `ignored`;
          }
          if (c.length === 0) return `ignored`;
          let l = r + c.length / n;
          if (l - t.currentTime > Au) return `overflow`;
          let u = t.createBuffer(1, c.length, n);
          u.getChannelData(0).set(c);
          let d = t.createBufferSource();
          return (
            this.sources.add(d),
            d.addEventListener(`ended`, () => this.sources.delete(d)),
            (d.buffer = u),
            d.connect(t.destination),
            d.start(r),
            (this.playhead = l),
            `queued`
          );
        }
        stop(e) {
          let t = [...this.sources];
          (this.sources.clear(), (this.playhead = e?.currentTime ?? 0));
          for (let e of t)
            try {
              e.stop();
            } catch {}
        }
      }));
  }))();
}
function Pu(e, t) {
  let n = 0,
    r = 0,
    i,
    a = Iu(e, t);
  return (r) => {
    if (!e.callbacks.onTalkEvent) return;
    let s = o(r);
    ((n += 1),
      e.callbacks.onTalkEvent({
        id: `${a}:${n}`,
        type: r.type,
        sessionId: a,
        turnId: s,
        captureId: r.captureId,
        seq: n,
        timestamp: new Date().toISOString(),
        mode: `realtime`,
        transport: t.transport,
        brain: `agent-consult`,
        provider: t.provider,
        final: r.final,
        callId: r.callId,
        itemId: r.itemId,
        parentId: r.parentId,
        payload: r.payload ?? null,
      }),
      (r.type === `turn.ended` ||
        r.type === `turn.cancelled` ||
        r.type === `session.replaced` ||
        r.type === `session.closed`) &&
        (i = void 0));
  };
  function o(e) {
    return e.type === `turn.started` || Fu(e.type)
      ? ((i = e.turnId ?? i ?? `turn-${++r}`), i)
      : e.turnId;
  }
}
function Fu(e) {
  return (
    e === `turn.ended` ||
    e === `turn.cancelled` ||
    e.startsWith(`input.audio.`) ||
    e.startsWith(`transcript.`) ||
    e.startsWith(`output.`) ||
    e.startsWith(`tool.`)
  );
}
function Iu(e, t) {
  let n = t.sessionId;
  return typeof n == `string` && n.trim()
    ? n.trim()
    : `relaySessionId` in t && t.relaySessionId.trim()
      ? t.relaySessionId
      : `${e.sessionKey}:${t.provider}:${t.transport}`;
}
function Lu(e) {
  if (!e || typeof e != `object`) return ``;
  let t = e;
  return typeof t.text == `string`
    ? t.text
    : (Array.isArray(t.content) ? t.content : [])
        .map((e) => {
          if (!e || typeof e != `object`) return ``;
          let t = e;
          return t.type === `text` && typeof t.text == `string` ? t.text : ``;
        })
        .filter(Boolean)
        .join(`

`)
        .trim();
}
function Ru(e) {
  if (!e) return;
  let t = e.error?.trim();
  if (e.status === `error`) return Error(t || `OpenClaw tool call failed`);
  if (e.status !== `timeout` || e.pendingError) return;
  let n = e.stopReason?.trim(),
    r = e.timeoutPhase?.trim(),
    i = e.livenessState?.trim();
  if (
    e.endedAt !== void 0 ||
    t !== void 0 ||
    e.aborted === !0 ||
    (i !== void 0 && i.length > 0) ||
    e.yielded === !0 ||
    (n !== void 0 && n.length > 0) ||
    r === `preflight` ||
    r === `provider` ||
    r === `post_turn` ||
    e.providerStarted === !0
  )
    return Error(t || `OpenClaw tool call timed out`);
}
function zu(e) {
  return new Promise((t, n) => {
    if (e.signal?.aborted) {
      n(new DOMException(`OpenClaw tool call aborted`, `AbortError`));
      return;
    }
    let r = window.setTimeout(() => {
        u(Error(`OpenClaw tool call timed out`));
      }, e.timeoutMs),
      i = !1,
      a = !1,
      o,
      s = () => {
        u(new DOMException(`OpenClaw tool call aborted`, `AbortError`));
      };
    e.signal?.addEventListener(`abort`, s, { once: !0 });
    let c = () => void 0,
      l = (e) => {
        i || ((i = !0), f(), t(e));
      },
      u = (e) => {
        i || ((i = !0), f(), n(e));
      },
      d = () => {
        a ||
          ((a = !0),
          e.client
            .request(`agent.wait`, { runId: e.runId, timeoutMs: e.timeoutMs })
            .then((e) => {
              if (i) return;
              let t = Ru(e);
              if (t) {
                u(t);
                return;
              }
              e?.status !== `timeout` &&
                (o = window.setTimeout(() => {
                  l(`OpenClaw finished with no text.`);
                }, Ku));
            })
            .catch((e) => {
              u(e instanceof Error ? e : Error(String(e)));
            }));
      };
    c = e.client.addEventListener((t) => {
      if (t.event !== `chat`) return;
      let n = t.payload;
      if (!(!n || n.runId !== e.runId)) {
        if ((Bu(e.emitTalkEvent, n), n.state === `final`)) {
          let e = Lu(n.message);
          if (e) {
            l(e);
            return;
          }
          d();
        } else
          n.state === `aborted`
            ? u(new DOMException(n.errorMessage ?? `OpenClaw tool call aborted`, `AbortError`))
            : n.state === `error` && u(Error(n.errorMessage ?? `OpenClaw tool call failed`));
      }
    });
    function f() {
      (window.clearTimeout(r),
        o !== void 0 && window.clearTimeout(o),
        e.signal?.removeEventListener(`abort`, s),
        c());
    }
  });
}
function Bu(e, t) {
  if (!e || t.stream !== `tool`) return;
  let n = t.data && typeof t.data == `object` ? t.data : {},
    r = typeof n.phase == `string` ? n.phase : void 0,
    i = typeof n.name == `string` ? n.name : void 0;
  e({
    type: `tool.progress`,
    callId: typeof n.toolCallId == `string` ? n.toolCallId : void 0,
    payload: { runId: t.runId, ...(i ? { name: i } : {}), ...(r ? { phase: r } : {}) },
  });
}
async function Vu(e) {
  let t = e.text.trim();
  if (!t) return;
  let n =
    e.sessionId && e.sessionId.trim()
      ? e.ctx.client.request(`talk.session.steer`, {
          sessionId: e.sessionId,
          sessionKey: e.ctx.sessionKey,
          text: t,
          ...(e.mode ? { mode: e.mode } : {}),
        })
      : e.ctx.client.request(`talk.client.steer`, {
          sessionKey: e.ctx.sessionKey,
          text: t,
          ...(e.mode ? { mode: e.mode } : {}),
        });
  try {
    let t = await n;
    (e.onControlResult?.(t),
      Uu(t, e.speakControlResult, e.suppressSpeechForModes),
      e.emitTalkEvent?.({
        type: `tool.progress`,
        payload: { name: `openclaw_agent_control`, result: t },
        final:
          t && typeof t == `object` && `mode` in t
            ? t.mode === `status` || t.mode === `cancel`
            : void 0,
      }));
  } catch (t) {
    e.emitTalkEvent?.({ type: `tool.error`, payload: { message: w(t) }, final: !0 });
  }
}
async function Hu(e) {
  if (e.signal?.aborted) return;
  let t, n;
  try {
    let r = tr(e.args);
    if (
      ((t =
        e.sessionId && e.sessionId.trim()
          ? await e.ctx.client.request(`talk.session.steer`, {
              sessionId: e.sessionId,
              sessionKey: e.ctx.sessionKey,
              text: r.text,
              mode: r.mode,
            })
          : await e.ctx.client.request(`talk.client.steer`, {
              sessionKey: e.ctx.sessionKey,
              text: r.text,
              mode: r.mode,
            })),
      e.signal?.aborted)
    )
      return;
    n = {
      type: `tool.progress`,
      callId: e.callId,
      payload: { name: `openclaw_agent_control`, result: t },
      final:
        t && typeof t == `object` && `mode` in t
          ? t.mode === `status` || t.mode === `cancel`
          : void 0,
    };
  } catch (r) {
    let i = w(r);
    if (
      ((n = { type: `tool.error`, callId: e.callId, payload: { message: i }, final: !0 }),
      (t = { error: i }),
      e.signal?.aborted || Gu(r))
    )
      return;
  }
  (await e.submit(e.callId, t), !e.signal?.aborted && e.emitTalkEvent?.(n));
}
function Uu(e, t, n) {
  if (!t || !e || typeof e != `object`) return;
  let r = e,
    i = typeof r.mode == `string` ? r.mode : void 0;
  if (i && n?.includes(i)) return;
  let a = typeof r.message == `string` ? r.message.trim() : ``;
  ((r.speak === !0 && r.suppress !== !0) || (r.ok === !0 && i === `steer` && r.suppress === !0)) &&
    a &&
    t(nr(a));
}
async function Wu(e) {
  let { ctx: t, callId: n, submit: r } = e;
  t.callbacks.onStatus?.(`thinking`);
  let i,
    a = !1,
    o = !1,
    s = !1,
    c = async (e) => {
      o || ((o = !0), await r(n, e), (s = !0));
    },
    l = async () => {
      e.submitAbortResult !== !1 && (await c($n()));
    },
    u = () => {
      ((a = !0), i && t.client.request(`chat.abort`, { sessionKey: t.sessionKey, runId: i }));
    };
  if (e.signal?.aborted) {
    await l();
    return;
  }
  e.signal?.addEventListener(`abort`, u, { once: !0 });
  try {
    let r = typeof e.args == `string` ? JSON.parse(e.args || `{}`) : (e.args ?? {});
    if ((await t.flushTranscriptWrites?.(), e.signal?.aborted)) {
      await l();
      return;
    }
    let a = await t.client.request(`talk.client.toolCall`, {
      sessionKey: t.sessionKey,
      ...(t.voiceSessionId ? { voiceSessionId: t.voiceSessionId } : {}),
      callId: n,
      name: zn,
      args: r,
      ...(e.relaySessionId ? { relaySessionId: e.relaySessionId } : {}),
    });
    if (((i = a.runId ?? a.idempotencyKey), !i))
      throw Error(`OpenClaw realtime tool call did not return a run id`);
    if (e.signal?.aborted) {
      (u(), await l());
      return;
    }
    await c({
      result: await zu({
        client: t.client,
        runId: i,
        timeoutMs: 12e4,
        emitTalkEvent: e.emitTalkEvent,
        signal: e.signal,
      }),
    });
  } catch (t) {
    if (o) throw t;
    if (a || e.signal?.aborted || Gu(t)) {
      await l();
      return;
    }
    await c({ error: w(t) });
  } finally {
    (e.signal?.removeEventListener(`abort`, u),
      s && !a && !e.signal?.aborted && t.callbacks.onStatus?.(`listening`));
  }
}
function Gu(e) {
  return (
    (typeof DOMException < `u` && e instanceof DOMException && e.name === `AbortError`) ||
    (typeof e == `object` && !!e && `name` in e && e.name === `AbortError`)
  );
}
var Ku;
function qu() {
  return (qu = e(() => {
    (er(), Gn(), S(), (Ku = 500));
  }))();
}
function Ju(e) {
  try {
    return (JSON.stringify(e)?.length ?? 0) * 2;
  } catch {
    return 262145;
  }
}
var Yu, Xu, Zu, Qu, $u, ed, td, nd, rd;
function id() {
  return (id = e(() => {
    (xt(),
      _t(),
      S(),
      Nu(),
      _u(),
      qu(),
      (Yu = 0.02),
      (Xu = 0.08),
      (Zu = 2),
      (Qu = 4),
      ($u = 8e3),
      (ed = 8e3),
      (td = 32),
      (nd = 262144),
      (rd = class {
        constructor(e, t) {
          ((this.session = e),
            (this.ctx = t),
            (this.media = null),
            (this.inputContext = null),
            (this.outputContext = null),
            (this.inputMeter = null),
            (this.inputPump = new Du()),
            (this.unsubscribe = null),
            (this.closed = !1),
            (this.mediaSetupController = null),
            (this.audioAppendAbortController = null),
            (this.pendingAudioAppends = new Set()),
            (this.outputQueue = new Mu()),
            (this.toolAbortControllers = new Map()),
            (this.completedToolCalls = new Set()),
            (this.submittingToolCalls = new Set()),
            (this.delayedToolResults = new Set()),
            (this.markAckTimers = new Set()),
            (this.cancelRequestedForPlayback = !1),
            (this.activeOutputTurnId = null),
            (this.playbackOverflowed = !1),
            (this.pendingOutputCancellations = 0),
            (this.speechFramesDuringPlayback = 0),
            (this.activated = !1),
            (this.pendingActivationEvents = []),
            (this.pendingActivationEventBytes = 0),
            (this.startupError = null));
        }
        async start() {
          if (!navigator.mediaDevices?.getUserMedia)
            throw Error(`Realtime Talk requires browser microphone access`);
          if (
            this.session.audio.inputEncoding !== `pcm16` ||
            this.session.audio.outputEncoding !== `pcm16`
          )
            throw Error(`Gateway-relay realtime Talk currently requires PCM16 audio`);
          ((this.closed = !1),
            (this.activated = !1),
            (this.pendingActivationEvents = []),
            (this.pendingActivationEventBytes = 0),
            (this.startupError = null),
            this.mediaSetupController?.abort());
          let e = new AbortController();
          ((this.mediaSetupController = e),
            (this.unsubscribe = this.ctx.client.addEventListener((e) => {
              e.event === `talk.event` && this.handleIncomingRelayEvent(e.payload);
            })));
          let t;
          try {
            t = await pu(this.ctx.inputDeviceId, { signal: e.signal });
          } catch (e) {
            let t = this.currentStartupError();
            if (t) throw t;
            if (this.closed) return `cancelled`;
            throw e;
          } finally {
            this.mediaSetupController === e && (this.mediaSetupController = null);
          }
          let n = this.currentStartupError();
          if (n) throw (t.getTracks().forEach((e) => e.stop()), n);
          return this.closed
            ? (t.getTracks().forEach((e) => e.stop()), `cancelled`)
            : ((this.media = t),
              (this.inputContext = new AudioContext({
                sampleRate: this.session.audio.inputSampleRateHz,
              })),
              (this.outputContext = new AudioContext({
                sampleRate: this.session.audio.outputSampleRateHz,
              })),
              this.abortPendingAudioAppends(),
              (this.audioAppendAbortController = new AbortController()),
              this.ctx.callbacks.onInputLevel &&
                ((this.inputMeter = new ku(this.ctx.callbacks.onInputLevel)),
                this.inputMeter.start(this.media, this.inputContext)),
              this.startMicrophonePump(),
              `ready`);
        }
        activate() {
          if (this.closed || this.activated) return;
          this.activated = !0;
          let e = this.pendingActivationEvents;
          ((this.pendingActivationEvents = []), (this.pendingActivationEventBytes = 0));
          for (let t of e) {
            try {
              this.handleRelayEvent(t);
            } catch (e) {
              throw (this.stop(), e);
            }
            if (this.closed) return;
          }
        }
        stop() {
          let e = this.closed;
          (this.stopLocal(),
            e ||
              this.ctx.client
                .request(
                  `talk.session.close`,
                  { sessionId: this.session.relaySessionId },
                  { timeoutMs: ed },
                )
                .catch(() => void 0));
        }
        stopLocal() {
          ((this.closed = !0),
            this.mediaSetupController?.abort(),
            (this.mediaSetupController = null),
            (this.activated = !1),
            (this.pendingActivationEvents = []),
            (this.pendingActivationEventBytes = 0),
            this.unsubscribe?.(),
            (this.unsubscribe = null),
            this.inputPump.stop(),
            this.abortPendingAudioAppends(),
            this.inputMeter?.stop(),
            (this.inputMeter = null),
            this.markAckTimers.forEach((e) => window.clearTimeout(e)),
            this.markAckTimers.clear(),
            this.discardDelayedToolResults(),
            this.abortConsults(),
            this.media?.getTracks().forEach((e) => e.stop()),
            (this.media = null),
            (this.playbackOverflowed = !1),
            (this.activeOutputTurnId = null),
            this.stopOutput(),
            this.inputContext?.close(),
            (this.inputContext = null),
            this.outputContext?.close(),
            (this.outputContext = null));
        }
        startMicrophonePump() {
          !this.media ||
            !this.inputContext ||
            this.inputPump.start(this.media, this.inputContext, (e) => {
              if (this.closed) return;
              this.detectBargeInSpeech(e) && this.cancelOutputForBargeIn();
              let t = this.audioAppendAbortController;
              if (!t || t.signal.aborted || this.pendingOutputCancellations) return;
              if (this.pendingAudioAppends.size >= Qu) {
                this.failAudioAppend(`Realtime Talk audio input fell behind`);
                return;
              }
              let n = Su(e),
                r = this.ctx.client
                  .request(
                    `talk.session.appendAudio`,
                    {
                      sessionId: this.session.relaySessionId,
                      audioBase64: bu(n),
                      timestamp: Math.round((this.inputContext?.currentTime ?? 0) * 1e3),
                    },
                    { signal: t.signal, timeoutMs: $u },
                  )
                  .catch((e) => this.failAudioAppend(e));
              (this.pendingAudioAppends.add(r),
                r.finally(() => {
                  this.pendingAudioAppends.delete(r);
                }));
            });
        }
        abortPendingAudioAppends() {
          (this.audioAppendAbortController?.abort(),
            (this.audioAppendAbortController = null),
            this.pendingAudioAppends.clear());
        }
        failAudioAppend(e) {
          this.closed || (this.ctx.callbacks.onStatus?.(`error`, w(e)), this.stop());
        }
        currentStartupError() {
          return this.startupError;
        }
        handleIncomingRelayEvent(e) {
          if (e.relaySessionId !== this.session.relaySessionId || this.closed) return;
          if (this.activated) {
            this.handleRelayEvent(e);
            return;
          }
          if (
            (e.type === `error` &&
              (this.lastRelayError = e.message ? w(e.message) : `Realtime relay failed`),
            e.type === `close`)
          ) {
            ((this.startupError = Error(
              e.reason === `error`
                ? (this.lastRelayError ?? `Realtime relay closed before browser setup completed`)
                : `Realtime relay closed before browser setup completed`,
            )),
              this.stopLocal());
            return;
          }
          let t = Ju(e);
          if (
            this.pendingActivationEvents.length >= td ||
            t > nd - this.pendingActivationEventBytes
          ) {
            ((this.startupError = Error(
              `Realtime relay emitted too much data before browser setup completed`,
            )),
              this.stop());
            return;
          }
          (this.pendingActivationEvents.push(e), (this.pendingActivationEventBytes += t));
        }
        handleRelayEvent(e) {
          if (e.relaySessionId !== this.session.relaySessionId || this.closed) return;
          let t = e.type === `close`;
          try {
            switch ((e.talkEvent && this.ctx.callbacks.onTalkEvent?.(e.talkEvent), e.type)) {
              case `ready`:
                this.ctx.callbacks.onStatus?.(`listening`);
                return;
              case `audio`:
                if (e.audioBase64 && !this.playbackOverflowed) {
                  let t = e.talkEvent?.turnId?.trim();
                  if (!t) {
                    (this.ctx.callbacks.onStatus?.(
                      `error`,
                      O(`chat.composer.realtimeTalkMissingTurnIdentity`),
                    ),
                      this.stop());
                    return;
                  }
                  ((this.activeOutputTurnId = t),
                    (this.cancelRequestedForPlayback = !1),
                    (this.speechFramesDuringPlayback = 0),
                    this.playPcm16(e.audioBase64));
                }
                return;
              case `clear`:
                if (e.talkEvent?.turnId && e.talkEvent.turnId !== this.activeOutputTurnId) return;
                ((this.playbackOverflowed = !1),
                  this.stopOutput({
                    releaseDelayedToolResults: this.pendingOutputCancellations === 0,
                  }),
                  (this.activeOutputTurnId = null),
                  e.talkEvent?.type === `turn.cancelled` && this.abortConsults());
                return;
              case `mark`:
                e.markName && this.scheduleMarkAck(e.markName);
                return;
              case `transcript`:
                e.role &&
                  e.text &&
                  this.ctx.callbacks.onTranscript?.({
                    role: e.role,
                    text: e.text,
                    final: e.final ?? !1,
                  });
                return;
              case `toolCall`:
                this.handleToolCall(e).catch((e) => {
                  this.reportToolResultSubmissionError(e);
                });
                return;
              case `toolCallCancelled`:
                this.cancelToolCall(e.callId);
                return;
              case `toolResult`:
                this.isFinalToolResult(e) && this.completeToolCall(e.callId);
                return;
              case `error`:
                ((this.lastRelayError = e.message ? w(e.message) : `Realtime relay failed`),
                  this.ctx.callbacks.onStatus?.(`error`, this.lastRelayError));
                return;
              case `close`:
                (this.abortConsults(),
                  this.ctx.callbacks.onStatus?.(
                    e.reason === `error` ? `error` : `idle`,
                    e.reason === `error`
                      ? (this.lastRelayError ?? `Realtime relay closed`)
                      : void 0,
                  ));
            }
          } finally {
            t && !this.closed && this.stopLocal();
          }
        }
        playPcm16(e) {
          this.outputQueue.play(e, this.outputContext, this.session.audio.outputSampleRateHz) ===
            `overflow` &&
            ((this.playbackOverflowed = !0), this.cancelOutput(`playback-overflow`, !1));
        }
        stopOutput(e = {}) {
          (this.outputQueue.stop(this.outputContext),
            (this.speechFramesDuringPlayback = 0),
            (e.releaseDelayedToolResults ?? !0) && this.flushDelayedToolResults());
        }
        scheduleMarkAck(e) {
          let t = this.outputPlaybackDelayMs();
          if (t > 0) {
            let n = window.setTimeout(() => {
              (this.markAckTimers.delete(n), this.scheduleMarkAck(e));
            }, t);
            this.markAckTimers.add(n);
            return;
          }
          this.closed ||
            this.ctx.client
              .request(`talk.session.acknowledgeMark`, {
                sessionId: this.session.relaySessionId,
                markName: e,
              })
              .catch((e) => this.reportToolResultSubmissionError(e));
        }
        async handleToolCall(e) {
          let t = e.callId?.trim(),
            n = e.name?.trim();
          if (!t || !n) return;
          if (n === `openclaw_agent_control`) {
            let n = this.startToolExecution(t);
            try {
              await Hu({
                ctx: this.ctx,
                callId: t,
                args: e.args ?? {},
                sessionId: this.session.relaySessionId,
                signal: n.signal,
                submit: (e, t) => this.submitToolResult(e, t),
              });
            } finally {
              this.finishToolExecution(t, n);
            }
            return;
          }
          if (n !== `openclaw_agent_consult`) {
            await this.submitToolResult(t, { error: `Tool "${n}" not available in browser Talk` });
            return;
          }
          let r = this.startToolExecution(t);
          try {
            if (e.forced) {
              if (
                (await this.submitToolResult(
                  t,
                  {
                    status: `working`,
                    tool: zn,
                    message: `Tell the person briefly that you are checking, then wait for the final OpenClaw result before answering with the actual result.`,
                  },
                  { willContinue: !0 },
                ),
                this.completedToolCalls.has(t))
              )
                return;
              if (r.signal.aborted) {
                await this.submitToolResult(t, { status: `cancelled` });
                return;
              }
            }
            await Wu({
              ctx: this.ctx,
              callId: t,
              args: e.args ?? {},
              relaySessionId: this.session.relaySessionId,
              signal: r.signal,
              submit: (e, t) => this.submitToolResult(e, t),
            });
          } finally {
            this.finishToolExecution(t, r);
          }
        }
        async submitToolResult(e, t, n) {
          if (this.completedToolCalls.has(e)) return;
          let r = n?.suppressResponse !== !0 && n?.willContinue !== !0;
          if (
            !this.closed &&
            r &&
            (this.pendingOutputCancellations > 0 || this.outputPlaybackDelayMs() > 0)
          ) {
            this.scheduleDelayedToolResult({ callId: e, result: t, ...(n ? { options: n } : {}) });
            return;
          }
          await this.sendToolResultNow(e, t, n);
        }
        async sendToolResultNow(e, t, n) {
          if (!this.completedToolCalls.has(e)) {
            this.submittingToolCalls.add(e);
            try {
              await this.ctx.client.request(`talk.session.submitToolResult`, {
                sessionId: this.session.relaySessionId,
                callId: e,
                result: t,
                ...(n ? { options: n } : {}),
              });
            } finally {
              this.submittingToolCalls.delete(e);
            }
          }
        }
        outputPlaybackDelayMs() {
          return this.outputContext
            ? Math.max(
                0,
                Math.ceil((this.outputQueue.queuedUntil - this.outputContext.currentTime) * 1e3),
              )
            : 0;
        }
        scheduleDelayedToolResult(e) {
          (this.delayedToolResults.add(e), this.rescheduleDelayedToolResult(e));
        }
        rescheduleDelayedToolResult(e) {
          if (this.closed) {
            this.discardDelayedToolResult(e);
            return;
          }
          if (this.pendingOutputCancellations > 0) return;
          let t = this.outputPlaybackDelayMs();
          if (t > 0) {
            e.timer = window.setTimeout(() => {
              ((e.timer = void 0), this.rescheduleDelayedToolResult(e));
            }, t);
            return;
          }
          (this.discardDelayedToolResult(e),
            this.sendToolResultNow(e.callId, e.result, e.options).catch((e) => {
              this.reportToolResultSubmissionError(e);
            }));
        }
        flushDelayedToolResults() {
          for (let e of this.delayedToolResults)
            (this.discardDelayedToolResult(e),
              this.closed ||
                this.sendToolResultNow(e.callId, e.result, e.options).catch((e) => {
                  this.reportToolResultSubmissionError(e);
                }));
        }
        pauseDelayedToolResults() {
          for (let e of this.delayedToolResults)
            e.timer !== void 0 && (window.clearTimeout(e.timer), (e.timer = void 0));
        }
        discardDelayedToolResults() {
          for (let e of this.delayedToolResults) this.discardDelayedToolResult(e);
        }
        discardDelayedToolResult(e) {
          (e.timer !== void 0 && (window.clearTimeout(e.timer), (e.timer = void 0)),
            this.delayedToolResults.delete(e));
        }
        reportToolResultSubmissionError(e) {
          if (this.closed) return;
          let t = w(e);
          ((this.lastRelayError = t), this.ctx.callbacks.onStatus?.(`error`, t));
        }
        completeToolCall(e) {
          let t = e?.trim();
          t &&
            (this.completedToolCalls.add(t),
            !this.submittingToolCalls.has(t) &&
              (this.toolAbortControllers.get(t)?.abort(), this.toolAbortControllers.delete(t)));
        }
        cancelToolCall(e) {
          let t = e?.trim();
          if (t) {
            (this.completedToolCalls.add(t),
              this.toolAbortControllers.get(t)?.abort(),
              this.toolAbortControllers.delete(t));
            for (let e of this.delayedToolResults)
              e.callId === t && this.discardDelayedToolResult(e);
          }
        }
        startToolExecution(e) {
          let t = new AbortController();
          return (this.toolAbortControllers.set(e, t), t);
        }
        finishToolExecution(e, t) {
          this.toolAbortControllers.get(e) === t && this.toolAbortControllers.delete(e);
        }
        isFinalToolResult(e) {
          let t = e.talkEvent;
          return !(t?.type === `tool.progress` || (t?.type === `tool.result` && t.final === !1));
        }
        cancelOutputForBargeIn() {
          this.cancelOutput(`barge-in`);
        }
        cancelOutput(e, t = !0) {
          if ((t && !this.outputQueue.isPlaying) || this.cancelRequestedForPlayback) return;
          let n = this.activeOutputTurnId;
          if (!n) {
            (this.ctx.callbacks.onStatus?.(
              `error`,
              O(`chat.composer.realtimeTalkMissingTurnIdentity`),
            ),
              this.stop());
            return;
          }
          ((this.cancelRequestedForPlayback = !0),
            (this.pendingOutputCancellations += 1),
            this.pauseDelayedToolResults(),
            this.stopOutput({ releaseDelayedToolResults: !1 }),
            this.ctx.client
              .request(`talk.session.cancelOutput`, {
                sessionId: this.session.relaySessionId,
                reason: e,
                turnId: n,
              })
              .then((e) => {
                if (
                  !St(e) ||
                  ((e.status === void 0 || e.status === `applied`) &&
                    e.turnId !== void 0 &&
                    e.turnId !== n)
                )
                  throw Error(O(`chat.composer.realtimeTalkCancellationRejected`));
                (--this.pendingOutputCancellations,
                  this.pendingOutputCancellations === 0 && this.flushDelayedToolResults());
              })
              .catch((e) => {
                (--this.pendingOutputCancellations,
                  this.reportToolResultSubmissionError(e),
                  this.stop());
              }));
        }
        abortConsults() {
          for (let e of this.toolAbortControllers.values()) e.abort();
          this.toolAbortControllers.clear();
        }
        detectBargeInSpeech(e) {
          if (!this.outputQueue.isPlaying || this.cancelRequestedForPlayback)
            return ((this.speechFramesDuringPlayback = 0), !1);
          let t = wu(e);
          return (
            t.rms >= Yu && t.peak >= Xu
              ? (this.speechFramesDuringPlayback += 1)
              : (this.speechFramesDuringPlayback = 0),
            this.speechFramesDuringPlayback >= Zu
          );
        }
      }));
  }))();
}
var ad;
function od() {
  return (od = e(() => {
    ad = class {
      constructor(e) {
        ((this.options = e),
          (this.stream = null),
          (this.video = null),
          (this.setupController = null),
          (this.handleTrackEnded = () => this.release()));
      }
      async setEnabled(e) {
        if (!e) {
          this.release();
          return;
        }
        if (this.options.isClosed()) throw Error(`Realtime Talk session is closed`);
        if (this.hasLiveTrack()) return;
        this.setupController?.abort();
        let t = new AbortController();
        this.setupController = t;
        let n;
        try {
          n = await this.options.acquire(this.options.getDeviceId(), t.signal);
        } catch (e) {
          if (this.options.isClosed() || t.signal.aborted) return;
          throw e;
        } finally {
          this.setupController === t && (this.setupController = null);
        }
        if (this.options.isClosed() || t.signal.aborted) {
          n.getTracks().forEach((e) => e.stop());
          return;
        }
        ((this.stream = n),
          n
            .getVideoTracks()
            .forEach((e) => e.addEventListener(`ended`, this.handleTrackEnded, { once: !0 })));
        let r = document.createElement(`video`);
        ((r.autoplay = !0),
          (r.muted = !0),
          (r.playsInline = !0),
          (r.srcObject = n),
          (this.video = r),
          this.options.onStream(n),
          r.play().catch(() => void 0),
          this.options.onAcquired?.());
      }
      async switchDevice(e) {
        let t = e?.trim() || void 0,
          n =
            this.stream?.getVideoTracks()[0]?.getSettings?.().deviceId?.trim() ||
            this.options.getDeviceId(),
          r = this.stream !== null || this.setupController !== null;
        if ((this.options.setDeviceId(t), r)) {
          this.release();
          try {
            await this.setEnabled(!0);
          } catch (e) {
            if (!this.options.isClosed() && n !== t) {
              this.options.setDeviceId(n);
              try {
                await this.setEnabled(!0);
              } catch {}
            }
            throw e;
          }
        }
      }
      hasLiveTrack() {
        return this.stream?.getVideoTracks().some((e) => e.readyState === `live`) === !0;
      }
      hasUsableTrack() {
        return (
          this.stream
            ?.getVideoTracks()
            .some((e) => e.readyState === `live` && e.enabled && !e.muted) === !0
        );
      }
      release() {
        (this.setupController?.abort(),
          (this.setupController = null),
          this.options.onReleased?.(),
          this.stream?.getVideoTracks().forEach((e) => {
            (e.removeEventListener(`ended`, this.handleTrackEnded), e.stop());
          }),
          (this.stream = null),
          (this.video &&= ((this.video.srcObject = null), null)),
          this.options.onStream(null));
      }
      hostDisconnected() {
        this.release();
      }
    };
  }))();
}
function sd(e) {
  let t;
  try {
    t = new URL(e.websocketUrl);
  } catch {
    throw Error(`Invalid Google Live WebSocket URL`);
  }
  if (t.protocol !== `wss:`) throw Error(`Google Live WebSocket URL must use wss://`);
  if (t.hostname.toLowerCase() !== ld) throw Error(`Untrusted Google Live WebSocket host`);
  if (t.username || t.password)
    throw Error(`Google Live WebSocket URL must not include credentials`);
  if (!ud.test(t.pathname)) throw Error(`Untrusted Google Live WebSocket path`);
  return ((t.search = ``), t.searchParams.set(`access_token`, e.clientSecret), t.toString());
}
function cd(e) {
  let t;
  for (let n of e)
    try {
      n();
    } catch (e) {
      t ??= e instanceof Error ? e : Error(`Realtime Talk cleanup failed`, { cause: e });
    }
  if (t) throw t;
}
var ld, ud, dd, fd;
function pd() {
  return (pd = e(() => {
    ((ld = `generativelanguage.googleapis.com`),
      (ud =
        /^\/ws\/google\.ai\.generativelanguage\.v[0-9a-z]+\.GenerativeService\.BidiGenerateContent(?:Constrained)?$/),
      (dd = 3e4),
      (fd = class {
        constructor() {
          ((this.state = `idle`), (this.socket = null), (this.waiter = null), (this.error = null));
        }
        get currentState() {
          return this.state;
        }
        get isActive() {
          return this.state === `active`;
        }
        get setupComplete() {
          return this.state === `ready` || this.state === `active`;
        }
        begin(e) {
          return (
            (this.state = `connecting`),
            (this.socket = e),
            (this.error = null),
            new Promise((e, t) => {
              this.waiter = { resolve: e, reject: t };
            })
          );
        }
        markReady(e) {
          return this.state !== `connecting` || this.socket !== e
            ? !1
            : ((this.state = `ready`), this.takeWaiter()?.resolve(`ready`), !0);
        }
        finishStart(e) {
          if (this.error) throw this.error;
          return this.state === `cancelled` ? `cancelled` : e;
        }
        activate() {
          if (this.state === `active`) return !1;
          if (this.error) throw this.error;
          if (this.state === `cancelled` || this.state === `idle`) return !1;
          if (this.state !== `ready`)
            throw Error(`Google Live transport activated before setup completed`);
          return ((this.state = `active`), !0);
        }
        failStartup(e, t) {
          return this.socket !== e || (this.state !== `connecting` && this.state !== `ready`)
            ? !1
            : ((this.state = `failed`), (this.error = t), this.takeWaiter()?.reject(t), !0);
        }
        cancel() {
          this.state !== `cancelled` &&
            this.state !== `failed` &&
            ((this.state = `cancelled`), this.takeWaiter()?.resolve(`cancelled`));
        }
        takeWaiter() {
          let e = this.waiter;
          return ((this.waiter = null), e);
        }
      }));
  }))();
}
var md, hd, gd;
function _d() {
  return (_d = e(() => {
    (Kn(),
      S(),
      qu(),
      (md = 1024),
      (hd = 1024),
      (gd = class {
        constructor(e) {
          ((this.options = e),
            (this.pendingCalls = new Map()),
            (this.seenCallIds = new Set()),
            (this.abortControllers = new Map()));
        }
        release() {
          let e = [...this.abortControllers.values()];
          (this.abortControllers.clear(), this.pendingCalls.clear(), this.seenCallIds.clear());
          for (let t of e) t.abort();
        }
        hasPendingConsult() {
          for (let e of this.pendingCalls.values())
            if (!e.cancelled && e.name === `openclaw_agent_consult`) return !0;
          return !1;
        }
        async handleCall(e) {
          if (this.options.isClosed()) return;
          let t = e.name?.trim(),
            n = e.id?.trim();
          if (!(!t || !n || this.seenCallIds.has(n))) {
            if (this.seenCallIds.size >= hd) {
              this.options.failConnection(`Google Live tool-call session limit exceeded`);
              return;
            }
            if (this.pendingCalls.size >= md) {
              this.options.failConnection(`Google Live pending tool-call limit exceeded`);
              return;
            }
            if (
              (this.seenCallIds.add(n),
              this.pendingCalls.set(n, { name: t, cancelled: !1 }),
              !this.isSupportedTool(t))
            ) {
              let e = `Tool "${t}" is not available in browser Talk`;
              if (!this.submitResult(n, { error: e })) return;
              this.options.emitTalkEvent({
                type: `tool.error`,
                callId: n,
                final: !0,
                payload: { name: t, message: e },
              });
              return;
            }
            if (
              (this.options.emitTalkEvent({
                type: `tool.call`,
                callId: n,
                payload: { name: t, args: e.args ?? {} },
              }),
              t === `openclaw_agent_control`)
            ) {
              await this.runControl(n, e.args);
              return;
            }
            if (t === `describe_view`) {
              this.submitDescribeView(n);
              return;
            }
            await this.runConsult(n, e.args);
          }
        }
        cancel(e) {
          for (let t of e ?? []) {
            let e = t.trim(),
              n = this.pendingCalls.get(e);
            if (!e || !n || n.cancelled) continue;
            n.cancelled = !0;
            let r = this.abortControllers.get(e);
            r ? r.abort() : this.pendingCalls.delete(e);
          }
        }
        isSupportedTool(e) {
          return (
            e === `openclaw_agent_control` ||
            e === `describe_view` ||
            e === `openclaw_agent_consult`
          );
        }
        async runControl(e, t) {
          let n = this.startExecution(e);
          try {
            await Hu({
              ctx: this.createActiveContext(),
              callId: e,
              args: t ?? {},
              signal: n.signal,
              emitTalkEvent: this.options.emitTalkEvent,
              submit: (e, t) => {
                this.submitResult(e, t);
              },
            });
          } finally {
            this.finishExecution(e, n);
          }
        }
        submitDescribeView(e) {
          let t = this.options.isDescribeViewActive();
          this.submitResult(
            e,
            t ? { ok: !0, cameraStreamActive: !0 } : { ok: !1, error: `camera is off` },
          ) &&
            this.options.emitTalkEvent({
              type: t ? `tool.result` : `tool.error`,
              callId: e,
              final: !0,
              payload: { name: qn, cameraStreamActive: t },
            });
        }
        async runConsult(e, t) {
          let n = this.startExecution(e);
          try {
            await Wu({
              ctx: this.createActiveContext(),
              callId: e,
              args: t ?? {},
              signal: n.signal,
              submitAbortResult: !1,
              emitTalkEvent: this.options.emitTalkEvent,
              submit: (e, t) => {
                this.submitResult(e, t);
              },
            });
          } finally {
            this.finishExecution(e, n);
          }
        }
        createActiveContext() {
          let { ctx: e } = this.options;
          return {
            ...e,
            callbacks: {
              onStatus: (t, n) => {
                this.options.isClosed() || e.callbacks.onStatus?.(t, n);
              },
              onTranscript: (t) => {
                this.options.isClosed() || e.callbacks.onTranscript?.(t);
              },
              onTalkEvent: (t) => {
                this.options.isClosed() || e.callbacks.onTalkEvent?.(t);
              },
            },
          };
        }
        submitResult(e, t) {
          let n = this.pendingCalls.get(e);
          if (!n || n.cancelled) return !1;
          try {
            this.options.sendResult(e, n.name, t);
          } catch (e) {
            return (this.options.failConnection(w(e)), !1);
          }
          return (this.pendingCalls.delete(e), !0);
        }
        startExecution(e) {
          let t = new AbortController();
          return (this.abortControllers.set(e, t), t);
        }
        finishExecution(e, t) {
          this.abortControllers.get(e) === t && this.abortControllers.delete(e);
          let n = this.pendingCalls.get(e);
          n?.cancelled &&
            (this.pendingCalls.delete(e),
            n.name === `openclaw_agent_consult` &&
              !this.options.isClosed() &&
              !this.hasPendingConsult() &&
              this.options.ctx.callbacks.onStatus?.(`listening`));
        }
      }));
  }))();
}
async function vd(e, t, n) {
  if (!e?.srcObject) throw Error(`Camera preview is unavailable`);
  if (
    (e.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && (await yd(e)),
    e.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !e.videoWidth || !e.videoHeight)
  )
    throw Error(`Camera frame has no image data`);
  let r = Math.min(1, 1280 / e.videoWidth, 720 / e.videoHeight),
    i = document.createElement(`canvas`),
    a = i.getContext(`2d`);
  if (!a) throw Error(`Camera frame capture is unavailable`);
  let o = 0.8;
  for (let s = 0; s < bd; s += 1) {
    ((i.width = Math.max(1, Math.round(e.videoWidth * r))),
      (i.height = Math.max(1, Math.round(e.videoHeight * r))),
      a.drawImage(e, 0, 0, i.width, i.height));
    let s = i.toDataURL(`image/jpeg`, o),
      c = { data: s.slice(s.indexOf(`,`) + 1), mimeType: `image/jpeg` },
      l = new TextEncoder().encode(JSON.stringify(n(c))).length;
    if (l <= t) return c;
    let u = Math.min(0.75, Math.sqrt(t / l) * 0.9);
    ((r *= u), (o = Math.max(0.4, o - 0.1)));
  }
  throw Error(`Camera frame is too large for the Realtime connection`);
}
function yd(e) {
  return new Promise((t, n) => {
    let r,
      i = (i) => {
        r !== void 0 &&
          (globalThis.clearTimeout(r),
          (r = void 0),
          e.removeEventListener(`loadeddata`, a),
          i ? n(i) : t());
      },
      a = () => i();
    ((r = globalThis.setTimeout(() => i(Error(`Camera preview did not become ready`)), 5e3)),
      e.addEventListener(`loadeddata`, a),
      e.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && i());
  });
}
var bd;
function xd() {
  return (xd = e(() => {
    bd = 8;
  }))();
}
function Sd(e) {
  return { realtimeInput: { video: e } };
}
function Cd(e) {
  if (!e) return !0;
  let t = e.startsWith(`models/`) ? e.slice(7) : e;
  return t.startsWith(`gemini-3.1-`) && t.includes(`-live`);
}
async function wd(e) {
  let t = e;
  return typeof t == `string`
    ? t
    : (typeof Blob < `u` && t instanceof Blob && (t = await t.arrayBuffer()),
      Td(t)
        ? new TextDecoder().decode(new Uint8Array(t))
        : ArrayBuffer.isView(t)
          ? new TextDecoder().decode(new Uint8Array(t.buffer, t.byteOffset, t.byteLength))
          : String(t));
}
function Td(e) {
  return e instanceof ArrayBuffer || Object.prototype.toString.call(e) === `[object ArrayBuffer]`;
}
var Ed, Dd, Od;
function kd() {
  return (kd = e(() => {
    (S(),
      Nu(),
      od(),
      pd(),
      _d(),
      _u(),
      qu(),
      xd(),
      (Ed = 1e3),
      (Dd = 524288),
      (Od = class {
        constructor(e, t) {
          ((this.session = e),
            (this.ctx = t),
            (this.ws = null),
            (this.setupTimeout = null),
            (this.media = null),
            (this.inputContext = null),
            (this.outputContext = null),
            (this.inputMeter = null),
            (this.inputPump = new Du()),
            (this.closed = !1),
            (this.mediaSetupController = null),
            (this.lifecycle = new fd()),
            (this.cameraPublished = !1),
            (this.videoFramesActive = !1),
            (this.hasSentVideoFrame = !1),
            (this.videoFrameTimer = null),
            (this.outputQueue = new Mu()),
            (this.emitTalkEvent = Pu(t, e)),
            (this.toolOwner = new gd({
              ctx: t,
              emitTalkEvent: this.emitTalkEvent,
              isClosed: () => this.closed,
              failConnection: (e) => {
                let t = this.ws;
                t && this.failConnection(t, e);
              },
              isDescribeViewActive: () =>
                this.videoFramesActive && this.hasSentVideoFrame && this.camera.hasUsableTrack(),
              sendResult: (e, t, n) => this.sendToolResult(e, t, n),
              sendControlSpeechMessage: (e) => this.sendControlSpeechMessage(e),
              stopOutputForSuppressedControl: (e) => this.stopOutputForSuppressedControl(e),
            })),
            (this.camera = new ad({
              acquire: (e, t) => mu(e, { signal: t }),
              getDeviceId: () => this.ctx.videoDeviceId,
              setDeviceId: (e) => (this.ctx.videoDeviceId = e),
              isClosed: () => this.closed,
              onStream: (e) => {
                if (e) {
                  if (!this.lifecycle.isActive) return;
                  ((this.cameraPublished = !0), this.ctx.callbacks.onVideoStream?.(e));
                } else
                  this.cameraPublished &&
                    ((this.cameraPublished = !1), this.ctx.callbacks.onVideoStream?.(null));
              },
              onAcquired: () => {
                this.lifecycle.isActive && this.startVideoFrames();
              },
              onReleased: () => this.stopVideoFrames(),
            })));
        }
        async start() {
          if (!navigator.mediaDevices?.getUserMedia || typeof WebSocket > `u`)
            throw Error(`Realtime Talk requires browser WebSocket and microphone access`);
          if (this.session.protocol !== `google-live-bidi`)
            throw Error(`Unsupported realtime WebSocket protocol: ${this.session.protocol}`);
          let e = sd(this.session);
          ((this.closed = !1), (this.cameraPublished = !1), this.mediaSetupController?.abort());
          let t = new AbortController();
          this.mediaSetupController = t;
          let n;
          try {
            n = await pu(this.ctx.inputDeviceId, { signal: t.signal });
          } catch (e) {
            if (this.closed) return `cancelled`;
            throw e;
          } finally {
            this.mediaSetupController === t && (this.mediaSetupController = null);
          }
          if (this.closed) return (n.getTracks().forEach((e) => e.stop()), `cancelled`);
          ((this.media = n),
            (this.inputContext = new AudioContext({
              sampleRate: this.session.audio.inputSampleRateHz,
            })),
            (this.outputContext = new AudioContext({
              sampleRate: this.session.audio.outputSampleRateHz,
            })));
          let r = new WebSocket(e);
          ((this.ws = r), (r.binaryType = `arraybuffer`));
          let i = this.lifecycle.begin(r);
          return (
            (this.setupTimeout = globalThis.setTimeout(() => {
              this.closed ||
                this.ws !== r ||
                ((this.setupTimeout = null),
                this.failConnection(r, `Realtime connection timed out after ${dd}ms`));
            }, dd)),
            r.addEventListener(`open`, () => {
              this.closed ||
                this.ws !== r ||
                this.send(this.session.initialMessage ?? { setup: {} });
            }),
            r.addEventListener(`message`, (e) => {
              this.handleMessage(r, e.data);
            }),
            r.addEventListener(`close`, () => {
              this.failConnection(r, `Realtime connection closed`);
            }),
            r.addEventListener(`error`, () => {
              this.failConnection(r, `Realtime connection failed`);
            }),
            this.lifecycle.finishStart(await i)
          );
        }
        activate() {
          if (!(this.closed || !this.lifecycle.activate()))
            try {
              if (
                (this.ctx.callbacks.onStatus?.(`listening`),
                this.assertActivationCurrent(),
                this.emitTalkEvent({ type: `session.ready` }),
                this.assertActivationCurrent(),
                this.ctx.callbacks.onInputLevel && this.media && this.inputContext)
              ) {
                let e = new ku(this.ctx.callbacks.onInputLevel);
                ((this.inputMeter = e),
                  e.start(this.media, this.inputContext),
                  this.assertActivationCurrent());
              }
              (this.startMicrophonePump(),
                this.camera.stream &&
                  !this.cameraPublished &&
                  ((this.cameraPublished = !0),
                  this.ctx.callbacks.onVideoStream?.(this.camera.stream)),
                this.assertActivationCurrent(),
                this.startVideoFrames());
            } catch (e) {
              try {
                this.stop({ emitClosed: !1 });
              } catch {}
              throw e;
            }
        }
        assertActivationCurrent() {
          if (this.closed || !this.lifecycle.isActive)
            throw Error(`Google Live transport activation cancelled`);
        }
        async setVideoEnabled(e) {
          await this.camera.setEnabled(e);
        }
        async switchCamera(e) {
          await this.camera.switchDevice(e);
        }
        stop(e) {
          let t = !this.closed && this.lifecycle.isActive && e?.emitClosed !== !1;
          ((this.closed = !0),
            this.lifecycle.cancel(),
            cd([
              () => {
                t && this.emitTalkEvent({ type: `session.closed`, final: !0 });
              },
              () => this.releaseResources(),
            ]));
        }
        releaseResources() {
          let e = this.mediaSetupController;
          ((this.mediaSetupController = null), this.clearSetupTimeout());
          let t = this.inputMeter;
          this.inputMeter = null;
          let n = this.media;
          this.media = null;
          let r = this.inputContext;
          this.inputContext = null;
          let i = this.outputContext;
          this.outputContext = null;
          let a = this.ws;
          ((this.ws = null),
            cd([
              () => e?.abort(),
              () => this.toolOwner.release(),
              () => this.inputPump.stop(),
              () => t?.stop(),
              ...(n?.getTracks() ?? []).map((e) => () => e.stop()),
              () => this.camera.release(),
              () => this.stopOutput(),
              () => {
                r?.close();
              },
              () => {
                i?.close();
              },
              () => a?.close(),
            ]));
        }
        clearSetupTimeout() {
          this.setupTimeout !== null &&
            (globalThis.clearTimeout(this.setupTimeout), (this.setupTimeout = null));
        }
        failConnection(e, t) {
          if (!(this.closed || this.ws !== e)) {
            if (this.lifecycle.failStartup(e, Error(t))) {
              try {
                this.stop({ emitClosed: !1 });
              } catch {}
              return;
            }
            try {
              this.ctx.callbacks.onStatus?.(`error`, t);
            } finally {
              this.stop();
            }
          }
        }
        startMicrophonePump() {
          this.closed ||
            !this.media ||
            !this.inputContext ||
            this.inputPump.start(this.media, this.inputContext, (e) => {
              if (this.ws?.readyState !== WebSocket.OPEN) return;
              let t = Su(e);
              this.send({
                realtimeInput: {
                  audio: {
                    data: bu(t),
                    mimeType: `audio/pcm;rate=${this.inputContext?.sampleRate ?? 16e3}`,
                  },
                },
              });
            });
        }
        send(e) {
          return (
            !this.closed &&
            this.ws?.readyState === WebSocket.OPEN &&
            (this.ws.send(JSON.stringify(e)), !0)
          );
        }
        async handleMessage(e, t) {
          if (this.closed || this.ws !== e) return;
          let n;
          try {
            n = JSON.parse(await wd(t));
          } catch {
            return;
          }
          if (
            this.closed ||
            this.ws !== e ||
            (n.setupComplete && this.lifecycle.markReady(e) && this.clearSetupTimeout(),
            !this.lifecycle.isActive)
          )
            return;
          let r = n.serverContent;
          if (
            (r?.interrupted &&
              (this.stopOutput(),
              this.emitTalkEvent({
                type: `turn.cancelled`,
                final: !0,
                payload: { reason: `provider-interrupted` },
              })),
            r?.inputTranscription?.text)
          ) {
            if (
              (this.ctx.callbacks.onTranscript?.({
                role: `user`,
                text: r.inputTranscription.text,
                final: r.inputTranscription.finished ?? !1,
              }),
              this.closed)
            )
              return;
            (this.emitTalkEvent({
              type: r.inputTranscription.finished ? `transcript.done` : `transcript.delta`,
              final: r.inputTranscription.finished ?? !1,
              payload: { role: `user`, text: r.inputTranscription.text },
            }),
              r.inputTranscription.finished &&
                this.toolOwner.hasPendingConsult() &&
                Un(r.inputTranscription.text) &&
                Vu({
                  ctx: this.ctx,
                  text: r.inputTranscription.text,
                  emitTalkEvent: this.emitTalkEvent,
                  onControlResult: (e) => this.stopOutputForSuppressedControl(e),
                  speakControlResult: (e) => this.sendControlSpeechMessage(e),
                  suppressSpeechForModes: [`cancel`],
                }));
          }
          if (r?.outputTranscription?.text) {
            if (
              (this.ctx.callbacks.onTranscript?.({
                role: `assistant`,
                text: r.outputTranscription.text,
                final: r.outputTranscription.finished ?? !1,
              }),
              this.closed)
            )
              return;
            this.emitTalkEvent({
              type: r.outputTranscription.finished ? `output.text.done` : `output.text.delta`,
              final: r.outputTranscription.finished ?? !1,
              payload: { text: r.outputTranscription.text },
            });
          }
          for (let e of r?.modelTurn?.parts ?? [])
            if (e.inlineData?.data) {
              if (
                (this.emitTalkEvent({
                  type: `output.audio.delta`,
                  payload: { byteLength: Eu(e.inlineData.data), mimeType: e.inlineData.mimeType },
                }),
                this.playPcm16(e.inlineData.data),
                this.closed)
              )
                return;
            } else if (!e.thought && typeof e.text == `string` && e.text.trim()) {
              if (
                (this.ctx.callbacks.onTranscript?.({
                  role: `assistant`,
                  text: e.text,
                  final: r?.turnComplete ?? !1,
                }),
                this.closed)
              )
                return;
              this.emitTalkEvent({
                type: r?.turnComplete ? `output.text.done` : `output.text.delta`,
                final: r?.turnComplete ?? !1,
                payload: { text: e.text },
              });
            }
          r?.turnComplete && this.emitTalkEvent({ type: `turn.ended`, final: !0 });
          for (let e of n.toolCall?.functionCalls ?? [])
            this.toolOwner.handleCall(e).catch((e) => {
              this.reportToolResultSubmissionError(e);
            });
          this.toolOwner.cancel(n.toolCallCancellation?.ids);
        }
        playPcm16(e) {
          this.closed ||
            (this.outputQueue.play(e, this.outputContext, this.session.audio.outputSampleRateHz) ===
              `overflow` &&
              (this.stopOutput(),
              this.emitTalkEvent({
                type: `turn.cancelled`,
                final: !0,
                payload: { reason: `playback-overflow` },
              }),
              this.ctx.callbacks.onStatus?.(
                `error`,
                `Realtime Talk playback exceeded the browser audio buffer limit`,
              ),
              this.stop()));
        }
        stopOutput() {
          this.outputQueue.stop(this.outputContext);
        }
        sendToolResult(e, t, n) {
          if (
            !this.send({
              toolResponse: {
                functionResponses: [
                  {
                    id: e,
                    name: t,
                    ...(Cd(this.session.model) ? {} : { scheduling: `WHEN_IDLE` }),
                    response: n && typeof n == `object` && !Array.isArray(n) ? n : { output: n },
                  },
                ],
              },
            })
          )
            throw Error(`Google Live socket is not open`);
        }
        reportToolResultSubmissionError(e) {
          if (this.closed) return;
          let t = w(e);
          this.ctx.callbacks.onStatus?.(`error`, t);
        }
        startVideoFrames() {
          !this.camera.video ||
            this.videoFramesActive ||
            this.closed ||
            ((this.videoFramesActive = !0), this.scheduleVideoFrame(0));
        }
        scheduleVideoFrame(e) {
          !this.videoFramesActive ||
            this.closed ||
            (this.videoFrameTimer = globalThis.setTimeout(() => {
              ((this.videoFrameTimer = null), this.sendVideoFrame());
            }, e));
        }
        async sendVideoFrame() {
          if (!this.camera.hasLiveTrack()) {
            this.stopVideoFrames();
            return;
          }
          if (!this.camera.hasUsableTrack()) {
            this.scheduleVideoFrame(Ed);
            return;
          }
          try {
            let e = await vd(this.camera.video, Dd, Sd);
            if (!this.videoFramesActive || this.closed) return;
            if (!this.send(Sd(e))) throw Error(`Google Live socket is not open`);
            this.hasSentVideoFrame = !0;
          } catch (e) {
            this.closed || ((this.videoFramesActive = !1), this.reportToolResultSubmissionError(e));
            return;
          }
          this.scheduleVideoFrame(Ed);
        }
        stopVideoFrames() {
          ((this.videoFramesActive = !1),
            (this.hasSentVideoFrame = !1),
            this.videoFrameTimer !== null &&
              (globalThis.clearTimeout(this.videoFrameTimer), (this.videoFrameTimer = null)));
        }
        sendControlSpeechMessage(e) {
          if ((this.stopOutput(), !Cd(this.session.model))) {
            this.send({
              clientContent: { turns: [{ role: `user`, parts: [{ text: e }] }], turnComplete: !0 },
            });
            return;
          }
          this.send({ realtimeInput: { text: e } });
        }
        stopOutputForSuppressedControl(e) {
          if (!e || typeof e != `object`) return;
          let t = e;
          t.ok === !0 &&
            (t.mode === `cancel` || (t.suppress === !0 && t.mode !== `steer`)) &&
            this.stopOutput();
        }
      }));
  }))();
}
function Ad(e, t) {
  let n = Rd.get(e);
  n || ((n = new Map()), Rd.set(e, n));
  let r = n.get(t) ?? 0,
    i = [...n.values()].reduce((e, t) => e + t, 0);
  if (r >= Pd || i >= Fd) throw Error(`Too many active or closing realtime Talk voice sessions`);
  n.set(t, r + 1);
  let a = n,
    o = new AbortController(),
    s = new AbortController(),
    c = !1,
    l,
    u,
    d = () => {
      if (c) return;
      ((c = !0),
        l !== void 0 && (clearTimeout(l), (l = void 0)),
        u !== void 0 && (clearTimeout(u), (u = void 0)));
      let e = (a.get(t) ?? 1) - 1;
      e > 0 ? a.set(t, e) : a.delete(t);
    };
  return {
    signal: o.signal,
    closeSignal: s.signal,
    beginDrain: () => {
      c ||
        l !== void 0 ||
        u !== void 0 ||
        ((l = setTimeout(() => {
          o.abort();
        }, Id)),
        (u = setTimeout(() => {
          (o.abort(), s.abort(), d());
        }, Ld)));
    },
    release: d,
  };
}
function jd(e) {
  if ((e.nextTransport?.stop({ emitClosed: !1 }), !e.reusesExistingOwner)) {
    if (e.transport === `gateway-relay` && e.nextTransport) {
      e.owner.release();
      return;
    }
    e.closeVoiceSession();
  }
}
function Md() {
  let e = Error(`voice transcript persistence aborted`);
  return ((e.name = `AbortError`), e);
}
async function Nd(e, t) {
  if (t.aborted) throw Md();
  e <= 0 ||
    (await new Promise((n, r) => {
      let i = setTimeout(() => {
          (t.removeEventListener(`abort`, a), n());
        }, e),
        a = () => {
          (clearTimeout(i), r(Md()));
        };
      t.addEventListener(`abort`, a, { once: !0 });
    }));
}
var Pd, Fd, Id, Ld, Rd;
function zd() {
  return (zd = e(() => {
    (ie(), (Pd = 2), (Fd = 16), (Id = t), (Ld = Id + t), (Rd = new WeakMap()));
  }))();
}
function Bd(e, t) {
  let n = e ?? Gd;
  try {
    return new URL(n).toString();
  } catch {}
  let r = new URL(t, window.location.href);
  return (
    r.protocol === `ws:`
      ? (r.protocol = `http:`)
      : r.protocol === `wss:` && (r.protocol = `https:`),
    (r.pathname = `/`),
    (r.search = ``),
    (r.hash = ``),
    new URL(n, r).toString()
  );
}
function Vd(e) {
  let t = e?.sctp?.maxMessageSize;
  return typeof t == `number` && Number.isFinite(t) && t > 0 ? t : Wd;
}
function Hd(e) {
  return {
    type: `conversation.item.create`,
    item: {
      type: `message`,
      role: `user`,
      content: [{ type: `input_image`, image_url: `data:${e.mimeType};base64,${e.data}` }],
    },
  };
}
var Ud, Wd, Gd, Kd, qd;
function Jd() {
  return (Jd = e(() => {
    (Zn(),
      (Ud = 3e4),
      (Wd = 65536),
      (Gd = `https://api.openai.com/v1/realtime/calls`),
      (Kd = class {
        constructor(e) {
          ((this.maxSettledResponses = e),
            (this.unkeyedSettled = !1),
            (this.settledResponseIds = new Set()));
        }
        start(e) {
          ((this.activeResponseId = e), (this.unkeyedSettled = !1));
        }
        finish(e) {
          let t =
            e.type === `response.cancelled`
              ? { status: `cancelled`, ...(e.response?.id ? { responseId: e.response.id } : {}) }
              : Xn({ providerLabel: `OpenAI realtime voice`, response: e.response });
          if (
            (t.responseId && this.settledResponseIds.has(t.responseId)) ||
            (!t.responseId && this.unkeyedSettled) ||
            (t.responseId &&
              this.activeResponseId !== void 0 &&
              t.responseId !== this.activeResponseId)
          )
            return;
          let n =
            t.responseId !== void 0 && this.settledResponseIds.size >= this.maxSettledResponses;
          return (
            t.responseId && !n
              ? this.settledResponseIds.add(t.responseId)
              : t.responseId || (this.unkeyedSettled = !0),
            (this.activeResponseId = void 0),
            { outcome: t, overflow: n }
          );
        }
        reset() {
          ((this.activeResponseId = void 0),
            (this.unkeyedSettled = !1),
            this.settledResponseIds.clear());
        }
      }),
      (qd = class {
        constructor() {
          this.pendingRequest = null;
        }
        async readAnswer(e) {
          let t = this.beginRequest();
          try {
            let n;
            try {
              n = await fetch(Bd(e.session.offerUrl, e.gatewayUrl), {
                method: `POST`,
                body: e.offer.sdp,
                headers: {
                  ...e.session.offerHeaders,
                  Authorization: `Bearer ${e.session.clientSecret}`,
                  "Content-Type": `application/sdp`,
                },
                signal: t.controller.signal,
              });
            } catch (t) {
              if (!e.isCurrent()) return;
              throw t;
            }
            if (!e.isCurrent()) return;
            if (!n.ok) throw Error(`Realtime WebRTC setup failed (${n.status})`);
            let r;
            try {
              r = await n.text();
            } catch (t) {
              if (!e.isCurrent()) return;
              throw t;
            }
            return e.isCurrent() ? r : void 0;
          } finally {
            this.finishRequest(t);
          }
        }
        abort() {
          let e = this.pendingRequest;
          e &&
            ((this.pendingRequest = null),
            globalThis.clearTimeout(e.timeout),
            e.controller.abort());
        }
        beginRequest() {
          this.abort();
          let e = new AbortController(),
            t = {
              controller: e,
              timeout: globalThis.setTimeout(() => {
                e.abort(Error(`Realtime WebRTC offer request timed out after ${Ud}ms`));
              }, Ud),
            };
          return ((this.pendingRequest = t), t);
        }
        finishRequest(e) {
          (globalThis.clearTimeout(e.timeout),
            this.pendingRequest === e && (this.pendingRequest = null));
        }
      }));
  }))();
}
var Yd, Xd, Zd, Qd, $d;
function ef() {
  return (ef = e(() => {
    (Kn(),
      S(),
      Nu(),
      od(),
      _u(),
      qu(),
      xd(),
      Jd(),
      (Yd = 256e3),
      (Xd = 1024),
      (Zd = new TextEncoder()),
      (Qd = Symbol(`cancelledSetup`)),
      ($d = class {
        constructor(e, t) {
          ((this.session = e),
            (this.ctx = t),
            (this.peer = null),
            (this.channel = null),
            (this.media = null),
            (this.audio = null),
            (this.inputMeter = null),
            (this.closed = !1),
            (this.responseActive = !1),
            (this.responseCreateInFlight = !1),
            (this.responseCreatePending = !1),
            (this.responseOutcomes = new Kd(Xd)),
            (this.completedToolCallIds = new Set()),
            (this.offerExchange = new qd()),
            (this.mediaSetupController = null),
            (this.consultAbortControllers = new Set()),
            (this.starting = !1),
            (this.startupError = null),
            (this.emitTalkEvent = Pu(t, e)),
            (this.camera = new ad({
              acquire: (e, t) => mu(e, { signal: t }),
              getDeviceId: () => this.ctx.videoDeviceId,
              setDeviceId: (e) => (this.ctx.videoDeviceId = e),
              isClosed: () => this.closed,
              onStream: (e) => this.ctx.callbacks.onVideoStream?.(e),
            })));
        }
        async start() {
          if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection > `u`)
            throw Error(`Realtime Talk requires browser WebRTC and microphone access`);
          ((this.closed = !1),
            (this.starting = !0),
            (this.startupError = null),
            this.mediaSetupController?.abort());
          let e = new RTCPeerConnection();
          ((this.peer = e),
            (this.audio = document.createElement(`audio`)),
            (this.audio.autoplay = !0),
            (this.audio.muted = !1),
            this.audio.setAttribute(`playsinline`, ``),
            (this.audio.style.display = `none`),
            document.body.append(this.audio),
            e.addEventListener(`track`, (e) => {
              let t = e.streams[0];
              if (this.audio && t) {
                this.audio.srcObject = t;
                let n = this.audio,
                  r = (e) => {
                    this.audio !== n ||
                      this.closed ||
                      n.play().catch((t) => {
                        e &&
                          this.audio === n &&
                          !this.closed &&
                          this.ctx.callbacks.onStatus?.(
                            `error`,
                            `Realtime audio playback failed: ${w(t)}`,
                          );
                      });
                  };
                (r(!e.track.muted), e.track.addEventListener(`unmute`, () => r(!0), { once: !0 }));
              }
            }));
          let t = new AbortController();
          this.mediaSetupController = t;
          let n;
          try {
            n = await this.awaitSetupStep(e, pu(this.ctx.inputDeviceId, { signal: t.signal }));
          } finally {
            this.mediaSetupController === t && (this.mediaSetupController = null);
          }
          if (n === Qd) return this.cancelledStart();
          if (!this.isCurrentPeer(e))
            return (n.getTracks().forEach((e) => e.stop()), this.cancelledStart());
          ((this.media = n),
            this.ctx.callbacks.onInputLevel &&
              ((this.inputMeter = new ku(this.ctx.callbacks.onInputLevel)),
              this.inputMeter.start(n)));
          for (let t of n.getAudioTracks()) e.addTrack(t, n);
          let r = e.createDataChannel(`oai-events`);
          if (!this.isCurrentPeer(e)) return (r.close(), this.cancelledStart());
          ((this.channel = r),
            r.addEventListener(`open`, () => {
              (this.ctx.callbacks.onStatus?.(`listening`),
                this.emitTalkEvent({ type: `session.ready` }));
            }),
            r.addEventListener(`message`, (e) => this.handleRealtimeEvent(e.data)),
            e.addEventListener(`connectionstatechange`, () => {
              this.closed ||
                ((this.peer?.connectionState === `failed` ||
                  this.peer?.connectionState === `closed`) &&
                  this.failConnection(`Realtime connection closed`));
            }));
          let i = await this.awaitSetupStep(e, e.createOffer());
          if (
            i === Qd ||
            !this.isCurrentPeer(e) ||
            (await this.awaitSetupStep(e, e.setLocalDescription(i))) === Qd ||
            !this.isCurrentPeer(e)
          )
            return this.cancelledStart();
          let a = await this.offerExchange.readAnswer({
            session: this.session,
            offer: i,
            gatewayUrl: this.ctx.client.gatewayUrl,
            isCurrent: () => this.isCurrentPeer(e),
          });
          return a === void 0 ||
            !this.isCurrentPeer(e) ||
            (await this.awaitSetupStep(e, e.setRemoteDescription({ type: `answer`, sdp: a }))) ===
              Qd ||
            !this.isCurrentPeer(e)
            ? this.cancelledStart()
            : ((this.starting = !1), `ready`);
        }
        async setVideoEnabled(e) {
          await this.camera.setEnabled(e);
        }
        async switchCamera(e) {
          await this.camera.switchDevice(e);
        }
        isCurrentPeer(e) {
          return !this.closed && this.peer === e;
        }
        cancelledStart() {
          let e = this.currentStartupError();
          if (e) throw e;
          return `cancelled`;
        }
        currentStartupError() {
          return this.startupError;
        }
        async awaitSetupStep(e, t) {
          try {
            return await t;
          } catch (t) {
            if (!this.isCurrentPeer(e)) return Qd;
            throw t;
          }
        }
        stop(e) {
          let t = !this.closed && e?.emitClosed !== !1;
          this.closed = !0;
          try {
            t && this.emitTalkEvent({ type: `session.closed`, final: !0 });
          } finally {
            this.releaseResources();
          }
        }
        releaseResources() {
          ((this.starting = !1),
            this.mediaSetupController?.abort(),
            (this.mediaSetupController = null),
            this.offerExchange.abort(),
            this.channel?.close(),
            (this.channel = null),
            this.peer?.close(),
            (this.peer = null),
            this.media?.getTracks().forEach((e) => e.stop()),
            (this.media = null),
            this.camera.release(),
            this.inputMeter?.stop(),
            (this.inputMeter = null),
            this.audio?.remove(),
            (this.audio = null));
          for (let e of this.consultAbortControllers) e.abort();
          (this.consultAbortControllers.clear(),
            this.completedToolCallIds.clear(),
            this.responseOutcomes.reset(),
            (this.responseActive = !1),
            (this.responseCreateInFlight = !1),
            (this.responseCreatePending = !1));
        }
        failConnection(e) {
          if (this.closed) return;
          let t = this.starting;
          try {
            t ? (this.startupError = Error(e)) : this.ctx.callbacks.onStatus?.(`error`, e);
          } finally {
            this.stop({ emitClosed: !t });
          }
        }
        send(e) {
          this.channel?.readyState === `open` && this.channel.send(JSON.stringify(e));
        }
        handleRealtimeEvent(e) {
          if (this.closed) return;
          let t;
          try {
            t = JSON.parse(String(e));
          } catch {
            return;
          }
          switch (t.type) {
            case `input_transcript.added`:
              this.emitFramelessTranscript(`user`, t.item?.text, !1, t.item?.id);
              return;
            case `output_transcript.added`:
              this.emitFramelessTranscript(`assistant`, t.item?.text, !1, t.item?.id);
              return;
            case `turn.done`: {
              let e = t.turn?.role;
              if (e === `user` || e === `assistant`) {
                if (
                  (this.emitFramelessTranscript(e, t.turn?.transcript, !0, t.turn?.id), this.closed)
                )
                  return;
                e === `assistant` &&
                  (this.ctx.callbacks.onStatus?.(`listening`),
                  this.emitTalkEvent({
                    type: `turn.ended`,
                    final: !0,
                    payload: { status: `completed` },
                  }));
              }
              return;
            }
            case `conversation.item.input_audio_transcription.completed`:
              if (t.transcript) {
                if (
                  (this.ctx.callbacks.onTranscript?.({
                    role: `user`,
                    text: t.transcript,
                    final: !0,
                  }),
                  this.closed)
                )
                  return;
                (this.emitTalkEvent({
                  type: `transcript.done`,
                  final: !0,
                  itemId: t.item_id,
                  payload: { role: `user`, text: t.transcript },
                }),
                  this.consultAbortControllers.size > 0 &&
                    Un(t.transcript) &&
                    Vu({
                      ctx: this.ctx,
                      text: t.transcript,
                      emitTalkEvent: this.emitTalkEvent,
                      onControlResult: (e) => this.interruptSuppressedControlResponse(e),
                      speakControlResult: (e) => this.sendControlSpeechMessage(e),
                      suppressSpeechForModes: [`cancel`],
                    }));
              }
              return;
            case `conversation.output_transcript.delta`:
            case `response.output_text.delta`:
            case `response.audio_transcript.delta`:
            case `response.output_audio_transcript.delta`:
              this.emitAssistantTranscript(t, !1);
              return;
            case `response.output_text.done`:
            case `response.audio_transcript.done`:
            case `response.output_audio_transcript.done`:
              this.emitAssistantTranscript(t, !0);
              break;
            case `response.function_call_arguments.delta`:
            case `response.function_call_arguments.done`:
              break;
            case `input_audio_buffer.speech_started`:
              (this.ctx.callbacks.onStatus?.(`listening`, `Speech detected`),
                this.emitTalkEvent({ type: `turn.started`, payload: { source: t.type } }));
              return;
            case `input_audio_buffer.speech_stopped`:
              (this.ctx.callbacks.onStatus?.(`thinking`, `Processing speech`),
                this.emitTalkEvent({ type: `input.audio.committed`, final: !0 }));
              return;
            case `response.created`:
              ((this.responseActive = !0),
                (this.responseCreateInFlight = !1),
                this.responseOutcomes.start(t.response?.id),
                this.ctx.callbacks.onStatus?.(`thinking`, `Generating response`));
              return;
            case `response.cancelled`:
            case `response.done`: {
              let e = this.responseOutcomes.finish(t);
              if (!e) return;
              let { outcome: n } = e;
              try {
                if (n.status === `completed` && (this.handleCompletedResponse(t), this.closed))
                  return;
                (n.status === `failed` || n.status === `incomplete`
                  ? (this.ctx.callbacks.onStatus?.(`error`, n.message),
                    this.emitTalkEvent({ type: `session.error`, final: !0, payload: n }))
                  : this.ctx.callbacks.onStatus?.(
                      `listening`,
                      n.status === `cancelled` ? `Response cancelled` : void 0,
                    ),
                  this.emitTalkEvent({
                    type: n.status === `cancelled` ? `turn.cancelled` : `turn.ended`,
                    final: !0,
                    payload: n,
                  }));
              } finally {
                (e.overflow && this.failConnection(`Realtime response session limit exceeded`),
                  (this.responseActive = !1),
                  (this.responseCreateInFlight = !1),
                  this.flushPendingResponseCreate());
              }
              return;
            }
            case `error`:
              ((this.responseCreateInFlight = !1),
                this.ctx.callbacks.onStatus?.(`error`, this.extractErrorDetail(t.error)),
                this.emitTalkEvent({
                  type: `session.error`,
                  final: !0,
                  payload: { message: this.extractErrorDetail(t.error) },
                }));
          }
        }
        emitAssistantTranscript(e, t) {
          let n = t ? (e.transcript ?? e.text) : e.delta;
          n &&
            (this.ctx.callbacks.onTranscript?.({ role: `assistant`, text: n, final: t }),
            !this.closed &&
              this.emitTalkEvent({
                type: t ? `output.text.done` : `output.text.delta`,
                final: t,
                itemId: e.item_id,
                payload: { text: n },
              }));
        }
        emitFramelessTranscript(e, t, n, r) {
          if (
            !t ||
            (this.ctx.callbacks.onTranscript?.({ role: e, text: t, final: n }), this.closed)
          )
            return;
          let i =
            e === `user`
              ? n
                ? `transcript.done`
                : `transcript.delta`
              : n
                ? `output.text.done`
                : `output.text.delta`;
          this.emitTalkEvent({ type: i, final: n, itemId: r, payload: { role: e, text: t } });
        }
        extractErrorDetail(e) {
          if (!e || typeof e != `object`) return `Realtime provider error`;
          let t = e,
            n = typeof t.message == `string` ? t.message.trim() : ``,
            r = typeof t.code == `string` ? t.code.trim() : ``,
            i = typeof t.type == `string` ? t.type.trim() : ``;
          return n || r || i || `Realtime provider error`;
        }
        handleCompletedResponse(e) {
          let t = e.response;
          if (!(!y(t) || t.status !== `completed` || !Array.isArray(t.output)))
            for (let e of t.output) {
              if (
                !y(e) ||
                e.type !== `function_call` ||
                (e.status !== void 0 && e.status !== `completed`)
              )
                continue;
              let t = (typeof e.id == `string` && e.id.trim()) || void 0,
                n = typeof e.call_id == `string` ? e.call_id.trim() : ``,
                r = typeof e.name == `string` ? e.name.trim() : ``,
                i = typeof e.arguments == `string` ? e.arguments : ``;
              if (
                !(!n || !r || !i.trim()) &&
                (r === `openclaw_agent_control` ||
                  r === `describe_view` ||
                  r === `openclaw_agent_consult`) &&
                !this.completedToolCallIds.has(n)
              ) {
                if (this.completedToolCallIds.size >= Xd) {
                  this.failConnection(`Realtime tool-call session limit exceeded`);
                  return;
                }
                if ((this.completedToolCallIds.add(n), Zd.encode(i).byteLength > Yd)) {
                  let e = `Realtime tool arguments exceed the 256000-byte UTF-8 limit`;
                  (this.submitToolResult(n, { error: e }),
                    this.emitTalkEvent({
                      type: `tool.error`,
                      callId: n,
                      itemId: t,
                      final: !0,
                      payload: { name: r, message: e },
                    }));
                  continue;
                }
                this.handleToolCall({ itemId: t, callId: n, name: r, args: i }).catch((e) => {
                  this.reportToolResultSubmissionError(e);
                });
              }
            }
        }
        async handleToolCall(e) {
          let { itemId: t, callId: n, name: r, args: i } = e;
          if (r === `openclaw_agent_control`) {
            await Hu({
              ctx: this.ctx,
              callId: n,
              args: i,
              emitTalkEvent: this.emitTalkEvent,
              submit: (e, t) => this.submitToolResult(e, t),
            });
            return;
          }
          if (r === `describe_view`) {
            await this.handleDescribeViewToolCall(n, t);
            return;
          }
          if (r !== `openclaw_agent_consult`) return;
          this.emitTalkEvent({
            type: `tool.call`,
            callId: n,
            itemId: t,
            payload: { name: r, args: i },
          });
          let a = new AbortController();
          this.consultAbortControllers.add(a);
          try {
            await Wu({
              ctx: this.ctx,
              callId: n,
              args: i,
              signal: a.signal,
              emitTalkEvent: this.emitTalkEvent,
              submit: (e, t) => this.submitToolResult(e, t),
            });
          } finally {
            this.consultAbortControllers.delete(a);
          }
        }
        async handleDescribeViewToolCall(e, t) {
          if (
            (this.emitTalkEvent({ type: `tool.call`, callId: e, itemId: t, payload: { name: qn } }),
            !this.camera.hasLiveTrack())
          ) {
            (this.submitToolResult(e, { ok: !1, error: `camera is off` }),
              this.emitTalkEvent({
                type: `tool.error`,
                callId: e,
                itemId: t,
                final: !0,
                payload: { name: qn, message: `camera is off` },
              }));
            return;
          }
          try {
            let n = await vd(this.camera.video, Vd(this.peer), Hd);
            (this.send(Hd(n)),
              this.submitToolResult(e, { ok: !0, frameAttached: !0 }),
              this.emitTalkEvent({
                type: `tool.result`,
                callId: e,
                itemId: t,
                final: !0,
                payload: { name: qn, frameAttached: !0 },
              }));
          } catch (n) {
            let r = w(n);
            (this.submitToolResult(e, { ok: !1, error: r }),
              this.emitTalkEvent({
                type: `tool.error`,
                callId: e,
                itemId: t,
                final: !0,
                payload: { name: qn, message: r },
              }));
          }
        }
        submitToolResult(e, t) {
          this.closed ||
            (this.send({
              type: `conversation.item.create`,
              item: { type: `function_call_output`, call_id: e, output: JSON.stringify(t) },
            }),
            this.requestResponseCreate());
        }
        reportToolResultSubmissionError(e) {
          if (this.closed) return;
          let t = w(e);
          this.ctx.callbacks.onStatus?.(`error`, t);
        }
        sendControlSpeechMessage(e) {
          (this.responseActive && this.send({ type: `response.cancel` }),
            this.send({
              type: `conversation.item.create`,
              item: { type: `message`, role: `user`, content: [{ type: `input_text`, text: e }] },
            }),
            this.requestResponseCreate());
        }
        interruptSuppressedControlResponse(e) {
          if (!this.responseActive || !e || typeof e != `object`) return;
          let t = e;
          t.ok === !0 &&
            (t.mode === `cancel` || (t.suppress === !0 && t.mode !== `steer`)) &&
            this.send({ type: `response.cancel` });
        }
        requestResponseCreate() {
          if (this.responseActive || this.responseCreateInFlight) {
            this.responseCreatePending = !0;
            return;
          }
          ((this.responseCreatePending = !1),
            (this.responseCreateInFlight = !0),
            this.send({ type: `response.create` }));
        }
        flushPendingResponseCreate() {
          this.responseCreatePending &&
            ((this.responseCreatePending = !1), this.requestResponseCreate());
        }
      }));
  }))();
}
async function tf(e) {
  let t = !1,
    n;
  if (
    (await Promise.all(
      [...W].map(async (r) => {
        try {
          await r.switchCameraIfEnabled(e);
        } catch (e) {
          ((t = !0), (n ??= e));
        }
      }),
    ),
    t)
  )
    throw n;
}
function nf(e) {
  if (typeof e != `string`) return;
  let t = Yn(e);
  if (t === `webrtc` || t === `provider-websocket` || t === `gateway-relay` || t === `managed-room`)
    return t;
}
function rf(e, t) {
  let n = af(e);
  if (n === `webrtc`) return new $d(e, t);
  if (n === `provider-websocket`) return new Od(e, t);
  if (n === `gateway-relay`) return new rd(e, t);
  let r = e.transport ?? `unknown`;
  throw Error(`Unsupported realtime Talk transport: ${r}`);
}
function af(e) {
  return Yn(e.transport) ?? `webrtc`;
}
function of(e, t) {
  return e instanceof Error ? e : Error(t, { cause: e });
}
function sf(e) {
  return Object.fromEntries(Object.entries(e).filter(([, e]) => e !== void 0));
}
var W, cf;
function lf() {
  return (lf = e(() => {
    (ie(),
      Hn(),
      Vn(),
      S(),
      id(),
      kd(),
      zd(),
      ef(),
      (W = new Set()),
      (cf = class {
        constructor(e, t, n = {}, r = {}, i = {}) {
          ((this.client = e),
            (this.sessionKey = t),
            (this.callbacks = n),
            (this.options = r),
            (this.localOptions = i),
            (this.transport = null),
            (this.pendingTransport = null),
            (this.closed = !1),
            (this.lifecycleGeneration = 0),
            (this.videoEnabled = !1),
            (this.videoOperation = 0),
            (this.transportGeneration = 0),
            (this.transcriptSeqByVoiceSessionId = new Map()),
            (this.acceptingTranscripts = !1),
            (this.serverOwnedVoiceSession = !1),
            (this.transcriptQueue = Wn.createQueue()));
        }
        async start() {
          let e = Ad(this.client, this.sessionKey),
            t = !1;
          try {
            let n = ++this.lifecycleGeneration;
            (this.stopPendingTransport(),
              (this.closed = !1),
              this.callbacks.onStatus?.(`connecting`));
            let r = this.transport,
              i = this.voiceSessionId,
              a = this.clientVoiceSessionOwner,
              o = this.acceptingTranscripts,
              s = this.serverOwnedVoiceSession,
              c = this.transportGeneration,
              l = await this.resolveVideoCapability();
            if (this.closed || n !== this.lifecycleGeneration) return;
            let u = [`voice-transcript`];
            l && u.push(`camera-frame`);
            let d = await this.createSession({ ...this.options, capabilities: u }),
              f = af(d);
            if (f === `managed-room`)
              throw Error(`Managed-room realtime Talk sessions are not available in this UI yet`);
            let p = d.voiceSessionId ?? (f === `gateway-relay` ? d.relaySessionId : void 0);
            if (!p) throw Error(`Realtime Talk session did not return a voice session id`);
            if (this.closed || n !== this.lifecycleGeneration) {
              (this.closeUnadoptedVoiceSession(p, f, e), (t = !0));
              return;
            }
            if (a && (f === `gateway-relay` || p !== i))
              throw (
                this.closeUnadoptedVoiceSession(p, f, e),
                (t = !0),
                Error(`Realtime Talk replacement changed the active voice session`)
              );
            let m = a && p === i ? a : e;
            m !== e && e.release();
            let h = n,
              g =
                f === `gateway-relay`
                  ? this.callbacks
                  : this.clientOwnedTranscriptCallbacks(p, h, m.signal),
              _ = this.transcriptQueue,
              v = null,
              y;
            try {
              ((v = rf(d, {
                client: this.client,
                sessionKey: this.sessionKey,
                voiceSessionId: p,
                flushTranscriptWrites: async () => await _.flush(),
                callbacks: g,
                inputDeviceId: this.localOptions.inputDeviceId,
                videoDeviceId: this.localOptions.videoDeviceId,
                consultThinkingLevel: d.consultThinkingLevel,
                consultFastMode: d.consultFastMode,
              })),
                (this.pendingTransport = v),
                this.callbacks.onVideoCapability?.(l && typeof v.setVideoEnabled == `function`),
                (y = await v.start()));
            } catch (e) {
              throw (
                this.pendingTransport === v && (this.pendingTransport = null),
                jd({
                  nextTransport: v,
                  transport: f,
                  owner: m,
                  reusesExistingOwner: !!(a && m === a),
                  closeVoiceSession: () => this.closeUnadoptedVoiceSession(p, f, m),
                }),
                (t = !0),
                e
              );
            }
            if (
              (this.pendingTransport === v && (this.pendingTransport = null),
              y === `cancelled` || this.closed || n !== this.lifecycleGeneration)
            ) {
              (jd({
                nextTransport: v,
                transport: f,
                owner: m,
                reusesExistingOwner: !!(a && m === a),
                closeVoiceSession: () => this.closeUnadoptedVoiceSession(p, f, m),
              }),
                (t = !0));
              return;
            }
            ((this.voiceSessionId = p),
              (this.acceptingTranscripts = !0),
              (this.serverOwnedVoiceSession = f === `gateway-relay`),
              (this.transportGeneration = h),
              (this.transport = v),
              this.serverOwnedVoiceSession
                ? (e.release(), (this.clientVoiceSessionOwner = void 0))
                : (this.clientVoiceSessionOwner = m));
            try {
              v.activate?.();
            } catch (e) {
              throw (
                !this.closed && n === this.lifecycleGeneration && this.transport === v
                  ? ((this.voiceSessionId = i),
                    (this.acceptingTranscripts = o),
                    (this.serverOwnedVoiceSession = s),
                    (this.transportGeneration = c),
                    (this.transport = r),
                    (this.clientVoiceSessionOwner = a),
                    jd({
                      nextTransport: v,
                      transport: f,
                      owner: m,
                      reusesExistingOwner: !!(a && m === a),
                      closeVoiceSession: () => this.closeUnadoptedVoiceSession(p, f, m),
                    }))
                  : (this.transport === v && v.stop({ emitClosed: !1 }),
                    r?.stop({ emitClosed: !1 })),
                (t = !0),
                e
              );
            }
            ((t = !0), r?.stop({ emitClosed: !1 }));
          } finally {
            t || e.release();
          }
        }
        async resolveVideoCapability() {
          if (!this.callbacks.onVideoCapability) return !1;
          try {
            let e = await this.client.request(`talk.catalog`, {}, { timeoutMs: t }),
              n = this.options.provider ?? e.realtime.activeProvider;
            return n
              ? e.realtime.providers.find((e) => e.id === n || e.aliases?.includes(n))
                  ?.supportsVideoFrames === !0
              : !1;
          } catch {
            return !1;
          }
        }
        async createSession(e) {
          let n = { ...e };
          try {
            return await this.client.request(
              `talk.client.create`,
              sf({ sessionKey: this.sessionKey, voiceSessionId: this.voiceSessionId, ...n }),
              { timeoutMs: t },
            );
          } catch (e) {
            let r = n.transport;
            if (!r) {
              let n;
              try {
                n = await this.client.request(`talk.config`, {}, { timeoutMs: t });
              } catch {
                throw e;
              }
              if (!n.config || typeof n.config != `object`) throw e;
              let i = n.config?.talk?.realtime?.transport;
              if (i !== void 0 && ((r = nf(i)), !r)) throw e;
            }
            if (r && r !== `gateway-relay`) throw e;
            let i = { ...n };
            delete i.capabilities;
            try {
              let e = await this.client.request(
                `talk.session.create`,
                sf({
                  sessionKey: this.sessionKey,
                  ...i,
                  mode: `realtime`,
                  transport: r ?? `gateway-relay`,
                  brain: `agent-consult`,
                }),
                { timeoutMs: t },
              );
              return af(e) === `gateway-relay` ? { ...e, voiceSessionId: e.relaySessionId } : e;
            } catch {
              throw e;
            }
          }
        }
        stop() {
          ((this.lifecycleGeneration += 1),
            (this.closed = !0),
            (this.videoOperation += 1),
            (this.videoEnabled = !1),
            W.delete(this),
            this.callbacks.onStatus?.(`idle`),
            this.stopPendingTransport());
          let e = this.detachVoiceSession();
          (this.transport?.stop(), (this.transport = null), e && this.closeLogicalVoiceSession(e));
        }
        stopPendingTransport() {
          let e = this.pendingTransport;
          ((this.pendingTransport = null), e?.stop({ emitClosed: !1 }));
        }
        closeUnadoptedVoiceSession(e, n, r) {
          if (n === `gateway-relay`) {
            this.client
              .request(`talk.session.close`, { sessionId: e }, { timeoutMs: t })
              .catch(() => void 0)
              .finally(r.release);
            return;
          }
          let i = Wn.createQueue();
          (i.seal(),
            this.closeLogicalVoiceSession({
              voiceSessionId: e,
              serverOwned: !1,
              transcriptQueue: i,
              owner: r,
            }));
        }
        clientOwnedTranscriptCallbacks(e, t, n) {
          return {
            ...this.callbacks,
            onTranscript: (r) => {
              if (
                !(
                  this.transportGeneration !== t ||
                  this.voiceSessionId !== e ||
                  !this.acceptingTranscripts
                )
              ) {
                if (r.final) {
                  let i = (this.transcriptSeqByVoiceSessionId.get(e) ?? 0) + 1,
                    a = String(i),
                    o = r.role,
                    s = Bn(r.text);
                  if (s) {
                    let r = this.transcriptQueue.enqueue(
                      async () =>
                        await this.writeTranscriptWithRetry({
                          voiceSessionId: e,
                          entryId: a,
                          role: o,
                          text: s,
                          signal: n,
                        }),
                      { weight: s.length },
                    );
                    if (!r.accepted) {
                      r.reason === `overflow` && this.failTranscriptPersistence(t);
                      return;
                    }
                    (this.transcriptSeqByVoiceSessionId.set(e, i),
                      r.completion.catch((e) => {
                        if (n.aborted) return;
                        let r = `Voice transcript could not be saved: ${w(e)}`;
                        (console.warn(r, e),
                          this.transportGeneration === t && this.callbacks.onStatus?.(`error`, r));
                      }));
                  }
                }
                this.callbacks.onTranscript?.(r);
              }
            },
          };
        }
        failTranscriptPersistence(e) {
          if (this.transportGeneration !== e || !this.acceptingTranscripts || !this.voiceSessionId)
            return;
          ((this.lifecycleGeneration += 1),
            (this.closed = !0),
            (this.videoOperation += 1),
            (this.videoEnabled = !1),
            W.delete(this),
            this.stopPendingTransport());
          let t = this.detachVoiceSession();
          ((this.transportGeneration += 1),
            this.transport?.stop(),
            (this.transport = null),
            console.warn(Wn.overflowMessage),
            this.callbacks.onStatus?.(`error`, Wn.overflowMessage),
            t && this.closeLogicalVoiceSession(t));
        }
        async writeTranscriptWithRetry(e) {
          let n = [0, 500, 2e3],
            r;
          for (let i of n) {
            if (i > 0) await Nd(i, e.signal);
            else if (e.signal.aborted) throw Md();
            try {
              await this.client.request(
                `talk.client.transcript`,
                {
                  sessionKey: this.sessionKey,
                  voiceSessionId: e.voiceSessionId,
                  entryId: e.entryId,
                  role: e.role,
                  text: e.text,
                  timestamp: Date.now(),
                },
                { signal: e.signal, timeoutMs: t },
              );
              return;
            } catch (t) {
              if (e.signal.aborted) throw Md();
              r = t;
            }
          }
          throw of(r, `voice transcript save failed`);
        }
        detachVoiceSession() {
          let e = this.voiceSessionId;
          if (!e) return;
          let t = {
            voiceSessionId: e,
            serverOwned: this.serverOwnedVoiceSession,
            generation: this.transportGeneration,
            transcriptQueue: this.transcriptQueue,
            owner: this.clientVoiceSessionOwner,
          };
          return (
            t.transcriptQueue.seal(),
            this.transcriptSeqByVoiceSessionId.delete(e),
            (this.voiceSessionId = void 0),
            (this.acceptingTranscripts = !1),
            (this.serverOwnedVoiceSession = !1),
            (this.transcriptQueue = Wn.createQueue()),
            (this.clientVoiceSessionOwner = void 0),
            t
          );
        }
        closeLogicalVoiceSession(e) {
          if (e.serverOwned) {
            e.owner?.release();
            return;
          }
          let n = e.owner;
          (n.beginDrain(),
            e.transcriptQueue
              .flush()
              .then(async () => {
                let r;
                for (let i of [0, 500, 2e3]) {
                  if (i > 0) await Nd(i, n.closeSignal);
                  else if (n.closeSignal.aborted) throw Md();
                  try {
                    await this.client.request(
                      `talk.client.close`,
                      { sessionKey: this.sessionKey, voiceSessionId: e.voiceSessionId },
                      { signal: n.closeSignal, timeoutMs: t },
                    );
                    return;
                  } catch (e) {
                    if (n.closeSignal.aborted) throw Md();
                    r = e;
                  }
                }
                throw of(r, `Realtime Talk voice session close failed`);
              })
              .catch((t) => {
                n.closeSignal.aborted ||
                  (console.warn(`Realtime Talk voice session close failed`, t),
                  this.transportGeneration === e.generation &&
                    this.callbacks.onStatus?.(`error`, `Realtime Talk voice session close failed`));
              })
              .finally(n.release));
        }
        async setVideoEnabled(e) {
          let t = this.transport;
          if (this.closed || !t?.setVideoEnabled)
            throw Error(`Camera is unavailable for this realtime session`);
          let n = ++this.videoOperation,
            r = this.videoEnabled;
          ((this.videoEnabled = e), e ? W.add(this) : W.delete(this));
          try {
            await t.setVideoEnabled(e);
          } catch (e) {
            throw (
              n === this.videoOperation &&
                !this.closed &&
                this.transport === t &&
                ((this.videoEnabled = r), r ? W.add(this) : W.delete(this)),
              e
            );
          }
          n === this.videoOperation &&
            (this.closed || this.transport !== t) &&
            ((this.videoEnabled = !1), W.delete(this));
        }
        async switchCamera(e) {
          let t = e?.trim() || void 0;
          if (((this.localOptions.videoDeviceId = t), this.closed || !this.transport?.switchCamera))
            throw Error(`Camera switching is unavailable for this realtime session`);
          await this.transport.switchCamera(t);
        }
        async switchCameraIfEnabled(e) {
          if (this.videoEnabled)
            try {
              await this.switchCamera(e);
            } catch (e) {
              throw (this.callbacks.onVideoError?.(e), e);
            }
        }
      }));
  }))();
}
function uf(e, t) {
  return (
    t.id === e.source.id &&
    t.sendRunId === e.source.sendRunId &&
    t.sendAttempts === e.source.sendAttempts &&
    t.sendState === e.source.sendState &&
    t.agentId === e.source.agentId &&
    t.sessionKey === e.source.sessionKey &&
    t.orderKey === e.source.orderKey
  );
}
function df(e) {
  let t = e.chatQueuedEdit;
  if (!t || !Ye(e, t.sessionKey, t.agentId)) return null;
  let n = En(e, t.id);
  return !n || !uf(t, n) ? ((e.chatQueuedEdit = null), null) : t;
}
function ff(e, t) {
  return kn(e, (e) => df(e)?.id === t);
}
function pf(e, t) {
  return ff(e, t);
}
function mf(e, t) {
  return ff(e, t);
}
function hf(e, t) {
  return ff(e, t);
}
function gf(e, t) {
  let n = En(e, t);
  if (!n || !sn(n) || n.localCommandName || df(e) || ff(e, t)) return `unavailable`;
  let r = He(e, e.sessionKey);
  return (
    (e.chatQueuedEdit = {
      ...(r ? { agentId: r } : {}),
      attachments: n.attachments ?? [],
      draftText: n.text,
      id: t,
      orderKey: cn(n),
      revision: 0,
      ...(n.replyToId ? { replyToId: n.replyToId } : {}),
      sessionKey: e.sessionKey,
      source: { ...n },
      sourceWasDurable: Tn(e, t),
    }),
    `started`
  );
}
function _f(e, t) {
  let n = df(e);
  return n ? ((n.draftText = t), (n.revision += 1), !0) : !1;
}
function vf(e) {
  return df(e) ? ((e.chatQueuedEdit = null), !0) : !1;
}
function yf(e, t, n = [], r) {
  let i = r ?? df(e);
  if ((r && e.chatQueuedEdit !== i) || !i || (!t && Tn(e, i.id))) return;
  ((e.chatQueuedEdit = null), Sn(e, i.id, i.sessionKey));
  let a = new Set(n.map((e) => e.id));
  Ln(i.attachments.filter((e) => !a.has(e.id)));
}
var bf, xf, Sf, Cf, wf;
function Tf() {
  return (Tf = e(() => {
    (Ce(),
      Rn(),
      wn(),
      (bf = `A queued message is being edited in another pane. Finish or cancel that edit before editing it here.`),
      (xf = `A queued message is being edited in another pane. Finish or cancel that edit before removing it.`),
      (Sf = `A queued message is being edited in another pane. Finish or cancel that edit before reordering it.`),
      (Cf = `A queued message is being edited in another pane. Finish or cancel that edit before retrying it.`),
      (wf = `A queued message is being edited in another pane. Finish or cancel that edit before steering it.`));
  }))();
}
function Ef() {
  let e = globalThis.location?.pathname ?? `/`,
    t = [`/admin`, `/app`, `/enterprise`]
      .map((t) => e.indexOf(t))
      .filter((e) => e >= 0)
      .toSorted((e, t) => e - t)[0];
  return t === void 0 ? Qe(e) : e.slice(0, t);
}
function Df(e) {
  return `${Ef()}${e}`;
}
async function G(e, t, n) {
  let r = new Headers(t?.headers);
  if (
    (r.set(`Accept`, `application/json`),
    t?.body && r.set(`Content-Type`, `application/json`),
    n && t?.method && ![`GET`, `HEAD`].includes(t.method.toUpperCase()))
  ) {
    let e = Y[n];
    e && r.set(`X-CSRF-Token`, e);
  }
  let i = await fetch(Df(e), { credentials: `include`, cache: `no-store`, ...t, headers: r }),
    a = (i.headers.get(`content-type`) ?? ``).includes(`application/json`)
      ? await i.json()
      : void 0;
  if (!i.ok)
    throw new Jp(
      i.status,
      typeof a?.code == `string` ? a.code : `HTTP_ERROR`,
      typeof a?.message == `string` ? a.message : `HTTP ${i.status}`,
      a,
    );
  if (!a) throw new Jp(i.status, `INVALID_RESPONSE`, `Phản hồi không hợp lệ.`);
  return (n && typeof a.csrfToken == `string` && (Y[n] = a.csrfToken), a);
}
function K(e, t) {
  return G(e, t, `user`);
}
function q(e, t, n) {
  return G(e, t, n);
}
function Of(e) {
  return Y[e];
}
function J(e) {
  let t = new URLSearchParams();
  for (let [n, r] of Object.entries(e)) r != null && r !== `` && t.set(n, String(r));
  let n = t.toString();
  return n ? `?${n}` : ``;
}
async function kf() {
  let e = await fetch(Df(`/api/enterprise/status`), {
    credentials: `include`,
    cache: `no-store`,
    headers: { Accept: `application/json` },
  });
  return !e.ok || !(e.headers.get(`content-type`) ?? ``).includes(`application/json`)
    ? { enabled: !1 }
    : await e.json();
}
async function Af(e, t, n) {
  let r = await G(
    `/api/auth/${e}/login`,
    { method: `POST`, body: JSON.stringify({ username: t, password: n }) },
    e,
  );
  return ((Y[e] = r.csrfToken), r);
}
async function jf(e) {
  return G(`/api/auth/${e}/me`, void 0, e);
}
async function Mf(e) {
  (await G(`/api/auth/${e}/logout`, { method: `POST`, body: `{}` }, e), delete Y[e]);
}
async function Nf(e, t, n) {
  let r = await G(
    `/api/auth/${e}/change-password`,
    { method: `POST`, body: JSON.stringify({ currentPassword: t, newPassword: n }) },
    e,
  );
  return (delete Y[e], r);
}
async function Pf() {
  return jf(`user`);
}
async function Ff() {
  return Mf(`user`);
}
async function If() {
  return G(`/api/enterprise/me/policy`);
}
async function Lf() {
  return G(`/api/enterprise/user/me/capabilities`);
}
async function Rf(e = {}) {
  return G(`/api/enterprise/admin/accounts${J(e)}`, void 0, `admin`);
}
async function zf(e) {
  return G(
    `/api/enterprise/admin/accounts`,
    {
      method: `POST`,
      body: JSON.stringify({
        ...e,
        accessPresetKey: e.accessPresetKey ?? (e.role === `employee` ? `basic@1` : `none`),
      }),
    },
    `admin`,
  );
}
async function Bf(e) {
  return G(`/api/enterprise/admin/accounts/${encodeURIComponent(e)}`, void 0, `admin`);
}
async function Vf(e, t) {
  return G(
    `/api/enterprise/admin/accounts/${encodeURIComponent(e)}`,
    { method: `PATCH`, body: JSON.stringify(t) },
    `admin`,
  );
}
async function Hf(e, t) {
  return G(
    `/api/enterprise/admin/accounts/${encodeURIComponent(e)}/reset-password`,
    { method: `POST`, body: JSON.stringify({ newPassword: t }) },
    `admin`,
  );
}
async function Uf(e, t) {
  return G(
    `/api/enterprise/admin/accounts/${encodeURIComponent(e)}/sessions/${encodeURIComponent(t)}/revoke`,
    { method: `POST`, body: `{}` },
    `admin`,
  );
}
async function Wf() {
  return G(`/api/enterprise/admin/agents`, void 0, `admin`);
}
async function Gf(e, t, n, r) {
  return G(
    `/api/enterprise/admin/agents/${e}/${encodeURIComponent(t)}/${n}`,
    { signal: r },
    `admin`,
  );
}
async function Kf(e, t, n) {
  let { revision: r, updatedAt: i, ...a } = n;
  return G(
    `/api/enterprise/admin/agents/shared/${encodeURIComponent(e)}/relationships/${encodeURIComponent(t)}`,
    { method: `PATCH`, body: JSON.stringify({ baseRevision: r, profile: a }) },
    `admin`,
  );
}
async function qf(e, t, n, r) {
  return G(
    `/api/enterprise/admin/agents/shared/${encodeURIComponent(e)}/relationships/${encodeURIComponent(t)}/files${J({ name: n })}`,
    { signal: r },
    `admin`,
  );
}
async function Jf(e, t, n) {
  return G(
    `/api/enterprise/admin/agents/shared/${encodeURIComponent(e)}/relationships/${encodeURIComponent(t)}/files`,
    { method: `PUT`, body: JSON.stringify(n) },
    `admin`,
  );
}
async function Yf(e, t, n, r) {
  return G(
    `/api/enterprise/admin/agents/${e}/${encodeURIComponent(t)}/files${J({ name: n })}`,
    { signal: r },
    `admin`,
  );
}
async function Xf(e, t, n) {
  return G(
    `/api/enterprise/admin/agents/${e}/${encodeURIComponent(t)}/files`,
    { method: `PUT`, body: JSON.stringify(n) },
    `admin`,
  );
}
async function Zf(e, t, n) {
  return G(
    `/api/enterprise/admin/agents/${e}/${encodeURIComponent(t)}/tools`,
    { method: `PATCH`, body: JSON.stringify(n) },
    `admin`,
  );
}
async function Qf(e, t, n, r) {
  return G(
    `/api/enterprise/admin/agents/${e}/${encodeURIComponent(t)}/skills`,
    { method: `PATCH`, body: JSON.stringify({ skills: n, baseHash: r }) },
    `admin`,
  );
}
async function $f(e, t, n) {
  return G(
    `/api/enterprise/admin/agents/${e}/${encodeURIComponent(t)}/cron`,
    { method: `POST`, body: JSON.stringify(n) },
    `admin`,
  );
}
async function ep(e, t, n) {
  return G(
    `/api/enterprise/admin/agents/${e}/${encodeURIComponent(t)}/memory`,
    { method: `POST`, body: JSON.stringify({ action: n }) },
    `admin`,
  );
}
async function tp(e) {
  return G(
    `/api/enterprise/admin/agents/shared`,
    { method: `POST`, body: JSON.stringify(e) },
    `admin`,
  );
}
async function np(e, t) {
  return G(
    `/api/enterprise/admin/agents/shared/${encodeURIComponent(e)}/overview`,
    { method: `PATCH`, body: JSON.stringify(t) },
    `admin`,
  );
}
async function rp(e, t) {
  return G(
    `/api/enterprise/admin/agents/shared/${encodeURIComponent(e)}`,
    { method: `DELETE`, body: JSON.stringify({ baseHash: t }) },
    `admin`,
  );
}
async function ip() {
  return G(`/api/enterprise/admin/delegation/settings`, void 0, `admin`);
}
async function ap(e) {
  let { revision: t, updatedAt: n, ...r } = e;
  return G(
    `/api/enterprise/admin/delegation/settings`,
    { method: `PATCH`, body: JSON.stringify({ ...r, baseRevision: t }) },
    `admin`,
  );
}
async function op(e = {}) {
  return G(`/api/enterprise/admin/delegation/overview${J(e)}`, void 0, `admin`);
}
async function sp(e = {}) {
  return G(`/api/enterprise/admin/delegation/events${J(e)}`, void 0, `admin`);
}
async function cp(e, t) {
  return G(
    `/api/enterprise/admin/agents/${encodeURIComponent(e)}/delegation-profile`,
    { signal: t },
    `admin`,
  );
}
async function lp(e) {
  return G(
    `/api/enterprise/admin/agents/${encodeURIComponent(e.agentId)}/delegation-profile`,
    {
      method: `PATCH`,
      body: JSON.stringify({
        description: e.description,
        profile: {
          ...e.profile,
          requiredInputs: e.profile.requiredInputs.map(({ id: e, ...t }) =>
            e.trim() ? { id: e, ...t } : t,
          ),
        },
        baseHash: e.baseHash,
      }),
    },
    `admin`,
  );
}
async function up(e) {
  return G(
    `/api/enterprise/admin/agents/${encodeURIComponent(e)}/delegation-profile/draft`,
    { method: `POST`, body: `{}` },
    `admin`,
  );
}
async function dp(e, t, n) {
  return G(
    `/api/enterprise/admin/agents/${encodeURIComponent(e)}/delegation-profile/simulate`,
    { method: `POST`, body: JSON.stringify({ accountId: t, prompt: n }) },
    `admin`,
  );
}
async function fp(e) {
  return G(`/api/enterprise/admin/accounts/${encodeURIComponent(e)}/delegation`, void 0, `admin`);
}
async function pp(e) {
  return G(
    `/api/enterprise/admin/accounts/${encodeURIComponent(e.accountId)}/delegation`,
    { method: `PATCH`, body: JSON.stringify(e) },
    `admin`,
  );
}
async function mp() {
  return G(
    `/api/enterprise/admin/delegation/activation-preview`,
    { method: `POST`, body: `{}` },
    `admin`,
  );
}
async function hp(e, t = []) {
  return G(
    `/api/enterprise/admin/delegation/activate`,
    { method: `POST`, body: JSON.stringify({ previewToken: e, exclusions: t }) },
    `admin`,
  );
}
async function gp(e = {}) {
  return G(`/api/enterprise/admin/skills${J(e)}`, void 0, `admin`);
}
async function _p(e, t) {
  return G(`/api/enterprise/admin/skills/search${J({ query: e })}`, { signal: t }, `admin`);
}
async function vp(e, t) {
  return G(`/api/enterprise/admin/skills/detail${J({ ref: e })}`, { signal: t }, `admin`);
}
async function yp(e) {
  let { agentId: t, ...n } = e;
  return G(
    `/api/enterprise/admin/skills/install`,
    { method: `POST`, body: JSON.stringify({ ...(t ? { agentId: t } : {}), ...n }) },
    `admin`,
  );
}
async function bp(e) {
  return G(
    `/api/enterprise/admin/skills/import`,
    {
      method: `POST`,
      body: JSON.stringify({
        ...(e.agentId ? { agentId: e.agentId } : {}),
        folderName: e.folderName,
        files: e.files,
      }),
    },
    `admin`,
  );
}
function xp() {
  return { "Idempotency-Key": crypto.randomUUID() };
}
async function Sp() {
  return (await q(`/api/enterprise/admin/plugin-requests`, void 0, `admin`)).items;
}
async function Cp() {
  return (await q(`/api/enterprise/admin/codex-plugin-requests`, void 0, `admin`)).items;
}
function wp(e) {
  return q(`/api/enterprise/admin/codex-plugin-requests/${encodeURIComponent(e)}`, void 0, `admin`);
}
function Tp(e, t = e.scope) {
  return q(
    `/api/enterprise/admin/codex-plugin-requests/${encodeURIComponent(e.id)}/approve`,
    { method: `POST`, headers: xp(), body: JSON.stringify({ baseRevision: e.revision, scope: t }) },
    `admin`,
  );
}
function Ep(e, t) {
  return q(
    `/api/enterprise/admin/codex-plugin-requests/${encodeURIComponent(e.id)}/reject`,
    {
      method: `POST`,
      headers: xp(),
      body: JSON.stringify({ baseRevision: e.revision, reason: t }),
    },
    `admin`,
  );
}
function Dp(e) {
  return q(`/api/enterprise/admin/plugin-requests/${encodeURIComponent(e)}`, void 0, `admin`);
}
function Op(e, t = e.scope) {
  return q(
    `/api/enterprise/admin/plugin-requests/${encodeURIComponent(e.id)}/approve`,
    { method: `POST`, headers: xp(), body: JSON.stringify({ baseRevision: e.revision, scope: t }) },
    `admin`,
  );
}
function kp(e, t) {
  return q(
    `/api/enterprise/admin/plugin-requests/${encodeURIComponent(e.id)}/reject`,
    {
      method: `POST`,
      headers: xp(),
      body: JSON.stringify({ baseRevision: e.revision, reason: t }),
    },
    `admin`,
  );
}
function Ap(e) {
  return q(
    `/api/enterprise/admin/plugin-grants/${encodeURIComponent(e.id)}/revoke`,
    { method: `POST`, headers: xp(), body: JSON.stringify({ baseRevision: e.revision }) },
    `admin`,
  );
}
async function jp(e = {}) {
  return G(`/api/enterprise/admin/tools${J(e)}`, void 0, `admin`);
}
async function Mp(e) {
  return G(`/api/enterprise/admin/models/context`, e ? { signal: e } : void 0, `admin`);
}
async function Np(e, t, n) {
  return G(
    `/api/enterprise/admin/models/action`,
    { method: `POST`, body: JSON.stringify({ method: e, params: t }), ...(n ? { signal: n } : {}) },
    `admin`,
  );
}
async function Pp(e, t) {
  return G(
    `/api/enterprise/admin/access${J({ resourceType: e, resourceKey: t })}`,
    void 0,
    `admin`,
  );
}
async function Fp(e) {
  return G(
    `/api/enterprise/admin/access/changes`,
    { method: `POST`, body: JSON.stringify(e) },
    `admin`,
  );
}
async function Ip() {
  return G(`/api/enterprise/admin/config`, void 0, `admin`);
}
async function Lp(e, t) {
  return G(
    `/api/enterprise/admin/config/validate`,
    { method: `POST`, body: JSON.stringify({ raw: e, baseHash: t }) },
    `admin`,
  );
}
async function Rp(e, t) {
  return G(
    `/api/enterprise/admin/config/apply`,
    { method: `POST`, body: JSON.stringify({ raw: e, baseHash: t, confirm: `APPLY` }) },
    `admin`,
  );
}
async function zp() {
  return G(`/api/enterprise/admin/config/history`, void 0, `admin`);
}
async function Bp(e, t) {
  return G(
    `/api/enterprise/admin/config/history/${e}/rollback`,
    { method: `POST`, body: JSON.stringify({ baseHash: t, confirm: `ROLLBACK` }) },
    `admin`,
  );
}
async function Vp() {
  return G(`/api/enterprise/admin/audit?limit=200`, void 0, `admin`);
}
async function Hp() {
  return (await Rf()).accounts;
}
async function Up(e) {
  return (
    await zf({
      ...e,
      enabled: !0,
      personalAgentEnabled: e.role === `employee`,
      defaultAgentId: null,
      accessPresetKey: e.role === `employee` ? `basic@1` : `none`,
    })
  ).account;
}
async function Wp(e) {
  return Bf(e);
}
async function Gp(e, t) {
  return (await Vf(e, t)).account;
}
async function Kp(e, t) {
  return Hf(e, t);
}
async function qp(e, t) {
  let n = await Bf(e),
    r = new Map(n.entitlements.map((e) => [`${e.resourceType}:${e.resourceId}`, e])),
    i = new Map(t.map((e) => [`${e.resourceType}:${e.resourceId}`, e]));
  return (
    await Fp({
      changes: [
        ...t.map((t) => ({
          accountId: e,
          resourceType: t.resourceType,
          resourceKey: t.resourceId,
          effect: t.effect,
        })),
        ...[...r.values()]
          .filter((e) => !i.has(`${e.resourceType}:${e.resourceId}`))
          .map((t) => ({
            accountId: e,
            resourceType: t.resourceType,
            resourceKey: t.resourceId,
            effect: null,
          })),
      ],
      baseRevisions: { [e]: n.account.policyRevision },
    }),
    (await Bf(e)).entitlements
  );
}
var Y, Jp;
function Yp() {
  return (Yp = e(() => {
    ($e(),
      (Y = {}),
      (Jp = class extends Error {
        constructor(e, t, n, r) {
          (super(n), (this.status = e), (this.code = t), (this.payload = r));
        }
      }));
  }))();
}
function Xp(e, t) {
  return K(`/api/auth/user/login`, {
    method: `POST`,
    body: JSON.stringify({ username: e, password: t }),
  });
}
function Zp() {
  return K(`/api/auth/user/me`);
}
function Qp(e, t) {
  return K(`/api/auth/user/change-password`, {
    method: `POST`,
    body: JSON.stringify({ currentPassword: e, newPassword: t }),
  });
}
function $p(e) {
  return K(`/api/enterprise/user/v2/account`, {
    method: `PATCH`,
    body: JSON.stringify({ displayName: e }),
  });
}
function em(e) {
  return K(`/api/enterprise/user/v2/account/avatar`, { method: `PATCH`, body: JSON.stringify(e) });
}
function tm() {
  return K(`/api/enterprise/user/v2/bootstrap`);
}
function nm(e, t, n, r) {
  return K(`/api/enterprise/user/v2/skill-auth`, {
    method: `POST`,
    body: JSON.stringify({ sessionKey: e, skillKey: t, fields: n, ...(r ? { requestId: r } : {}) }),
  });
}
async function rm(e, t, n) {
  await K(`/api/enterprise/user/v2/skill-auth`, {
    method: `DELETE`,
    body: JSON.stringify({ sessionKey: e, skillKey: t, ...(n ? { requestId: n } : {}) }),
  });
}
async function im(e) {
  return (
    await K(`/api/enterprise/user/v2/agent-access-requests`, {
      method: `POST`,
      ...X({ agentKey: e }),
    })
  ).request;
}
async function am(e) {
  return (
    await K(`/api/enterprise/user/v2/agent-access-requests/${encodeURIComponent(e.id)}/cancel`, {
      method: `POST`,
      ...X({ baseRevision: e.revision }),
    })
  ).request;
}
function om(e, t, n = {}) {
  return K(`/api/enterprise/user/v2/conversations/open`, {
    method: `POST`,
    body: JSON.stringify({
      agentKey: e,
      mode: t,
      clientRequestId: crypto.randomUUID(),
      ...(n.projectId ? { projectId: n.projectId } : {}),
    }),
  });
}
async function sm() {
  return (await K(`/api/enterprise/user/v2/conversation-projects`)).items;
}
async function cm(e) {
  return (
    await K(`/api/enterprise/user/v2/conversation-projects`, {
      method: `POST`,
      body: JSON.stringify({ name: e, idempotencyKey: crypto.randomUUID() }),
    })
  ).project;
}
async function lm(e, t) {
  return (
    await K(`/api/enterprise/user/v2/conversation-projects/${encodeURIComponent(e)}`, {
      method: `PATCH`,
      body: JSON.stringify({ name: t }),
    })
  ).project;
}
async function um(e) {
  await K(`/api/enterprise/user/v2/conversation-projects/${encodeURIComponent(e)}`, {
    method: `DELETE`,
    body: `{}`,
  });
}
async function dm(e, t, n) {
  await K(`/api/enterprise/user/v2/conversation-projects/assignment`, {
    method: `PATCH`,
    body: JSON.stringify({
      sessionKey: e,
      projectId: t,
      ...(n === void 0 ? {} : { beforeSessionKey: n }),
    }),
  });
}
async function fm() {
  return (await K(`/api/enterprise/user/v2/personal-agent`)).profile;
}
async function pm(e) {
  let { revision: t, ...n } = e;
  return (
    await K(`/api/enterprise/user/v2/personal-agent`, {
      method: `PATCH`,
      body: JSON.stringify({ baseRevision: t, profile: n }),
    })
  ).profile;
}
async function mm(e) {
  return (
    await K(`/api/enterprise/user/v2/personal-agent/reset`, {
      method: `POST`,
      body: JSON.stringify({ baseRevision: e }),
    })
  ).profile;
}
async function hm(e) {
  return (await K(`/api/enterprise/user/v2/shared-agents/${encodeURIComponent(e)}/relationship`))
    .profile;
}
async function gm(e, t) {
  let { revision: n, updatedAt: r, ...i } = t;
  return (
    await K(`/api/enterprise/user/v2/shared-agents/${encodeURIComponent(e)}/relationship`, {
      method: `PATCH`,
      body: JSON.stringify({ baseRevision: n, profile: i }),
    })
  ).profile;
}
async function _m() {
  return (await K(`/api/enterprise/user/v2/personal-agent/knowledge`)).items;
}
async function vm(e) {
  return (
    await K(`/api/enterprise/user/v2/personal-agent/knowledge`, {
      method: `POST`,
      body: JSON.stringify(e),
    })
  ).item;
}
async function ym(e) {
  return (
    await K(`/api/enterprise/user/v2/personal-agent/knowledge/${encodeURIComponent(e.id)}`, {
      method: `PATCH`,
      body: JSON.stringify({ baseRevision: e.revision, title: e.title, content: e.content }),
    })
  ).item;
}
async function bm(e) {
  await K(`/api/enterprise/user/v2/personal-agent/knowledge/${encodeURIComponent(e)}`, {
    method: `DELETE`,
    body: `{}`,
  });
}
async function xm() {
  return (await K(`/api/enterprise/user/v2/automations`)).items;
}
async function Sm(e) {
  return (
    await K(`/api/enterprise/user/v2/automations`, { method: `POST`, body: JSON.stringify(e) })
  ).item;
}
async function Cm(e, t, n) {
  return (
    await K(`/api/enterprise/user/v2/automations/${encodeURIComponent(e)}`, {
      method: `PATCH`,
      body: JSON.stringify({ revision: t, automation: n }),
    })
  ).item;
}
async function wm(e) {
  await K(`/api/enterprise/user/v2/automations/${encodeURIComponent(e)}`, {
    method: `DELETE`,
    body: `{}`,
  });
}
async function Tm(e) {
  await K(`/api/enterprise/user/v2/automations/${encodeURIComponent(e)}/run`, {
    method: `POST`,
    body: `{}`,
  });
}
function X(e) {
  return { headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(e) };
}
async function Em(e) {
  return (
    await K(
      `/api/enterprise/user/v2/extensions/catalog?${new URLSearchParams({ agentKey: e.agentKey, query: e.query }).toString()}`,
      { signal: e.signal },
    )
  ).items;
}
async function Dm(e) {
  let t = new URLSearchParams({ agentKey: e.agentKey });
  e.query.trim() && t.set(`query`, e.query.trim());
  let n = await K(`/api/enterprise/user/v2/extensions/codex?${t.toString()}`, { signal: e.signal });
  return {
    status: n.status ?? `available`,
    items: n.items,
    installed: n.installed,
    requests: n.requests,
  };
}
function Om(e) {
  return K(
    `/api/enterprise/user/v2/extensions/codex/detail?${new URLSearchParams({ agentKey: e.agentKey, pluginId: e.pluginId }).toString()}`,
    { signal: e.signal },
  );
}
async function km(e) {
  return (await K(`/api/enterprise/user/v2/extensions/codex/requests`, { method: `POST`, ...X(e) }))
    .request;
}
async function Am(e) {
  return (
    await K(
      `/api/enterprise/user/v2/extensions/codex/requests/${encodeURIComponent(e.id)}/cancel`,
      { method: `POST`, ...X({ baseRevision: e.revision }) },
    )
  ).request;
}
async function jm(e, t, n = {}) {
  return K(`/api/enterprise/user/v2/extensions/codex/grants/${encodeURIComponent(e.id)}/${t}`, {
    method: `POST`,
    ...X({ baseRevision: e.revision, ...n }),
  });
}
function Mm(e, t) {
  return jm(e, t ? `enable` : `disable`);
}
function Nm(e) {
  return jm(e, `remove`);
}
function Pm(e) {
  return jm(e, `refresh`);
}
function Fm(e, t) {
  return jm(e, `connect`, { serverName: t });
}
function Im(e) {
  let t = new URLSearchParams({ agentKey: e.agentKey, kind: e.kind, catalogKey: e.catalogKey });
  return (
    e.version && t.set(`version`, e.version),
    K(`/api/enterprise/user/v2/extensions/detail?${t.toString()}`)
  );
}
function Lm(e) {
  return K(`/api/enterprise/user/v2/extensions/installed?agentKey=${encodeURIComponent(e)}`);
}
async function Rm(e) {
  return (
    await K(`/api/enterprise/user/v2/extensions/skills`, {
      method: `POST`,
      ...X({ reviewToken: e }),
    })
  ).install;
}
async function zm(e, t) {
  let n = { baseRevision: e.revision, reviewToken: t };
  return (
    await K(`/api/enterprise/user/v2/extensions/skills/${encodeURIComponent(e.id)}/update`, {
      method: `POST`,
      ...X(n),
    })
  ).install;
}
async function Bm(e, t) {
  let n = { baseRevision: e.revision, enabled: t };
  return (
    await K(`/api/enterprise/user/v2/extensions/skills/${encodeURIComponent(e.id)}`, {
      method: `PATCH`,
      ...X(n),
    })
  ).install;
}
async function Vm(e) {
  let t = { baseRevision: e.revision };
  await K(`/api/enterprise/user/v2/extensions/skills/${encodeURIComponent(e.id)}`, {
    method: `DELETE`,
    ...X(t),
  });
}
async function Hm() {
  return (await K(`/api/enterprise/user/v2/plugin-requests`)).items;
}
async function Um(e) {
  return (
    await K(`/api/enterprise/user/v2/plugin-requests`, { method: `POST`, ...X({ reviewToken: e }) })
  ).request;
}
async function Wm(e) {
  let t = { baseRevision: e.revision };
  return (
    await K(`/api/enterprise/user/v2/plugin-requests/${encodeURIComponent(e.id)}/cancel`, {
      method: `POST`,
      ...X(t),
    })
  ).request;
}
async function Gm(e) {
  let t = { baseRevision: e.revision };
  return (
    await K(`/api/enterprise/user/v2/plugin-grants/${encodeURIComponent(e.id)}/relinquish`, {
      method: `POST`,
      ...X(t),
    })
  ).grant;
}
function Km() {
  return (Km = e(() => {
    Yp();
  }))();
}
function qm(e) {
  return e
    .replace(/-skill$/u, ``)
    .split(/[-_]/u)
    .filter(Boolean)
    .map((e) => `${e.slice(0, 1).toUpperCase()}${e.slice(1)}`)
    .join(` `);
}
function Jm(e, t, n) {
  if (Zm) return Promise.resolve();
  Zm = e.requestId;
  let r = document.createElement(`div`);
  return (
    document.body.append(r),
    new Promise((i) => {
      let a = {},
        o = new Set(),
        s = !1,
        c = null,
        l = Math.max(0, Date.parse(e.expiresAt) - Date.now()),
        u = 0,
        d = () => {
          (window.clearTimeout(u), ht(E, r), r.remove(), n?.(e), t(), i());
        };
      u = window.setTimeout(d, l);
      let f = () => e.fields.some((e) => !a[e.id]?.trim()),
        p = async (t) => {
          if (s) {
            t?.preventDefault();
            return;
          }
          ((s = !0), g());
          try {
            await rm(e.parentSessionKey, e.skillKey, e.requestId);
          } finally {
            d();
          }
        },
        m = async (t) => {
          if ((t.preventDefault(), !(s || f()))) {
            ((s = !0), (c = null), g());
            try {
              await nm(e.parentSessionKey, e.skillKey, a, e.requestId);
            } catch (e) {
              ((s = !1), (c = w(e)), g());
              return;
            }
            d();
          }
        },
        h = (e, t) => {
          let n = f();
          ((a[e] = t), n !== f() && g());
        };
      function g() {
        let t = qm(e.skillKey);
        ht(
          D`
          <openclaw-modal-dialog
            label="${A(`login`)} ${t}"
            description="Thông tin được gửi thẳng tới Gateway và không đi qua nội dung chat."
            @modal-cancel=${p}
          >
            <form class="exec-approval-card" autocomplete="off" @submit=${m}>
              <div class="exec-approval-header">
                <div class="exec-approval-title">${A(`login`)} ${t}</div>
              </div>
              ${e.fields.map(
                (e, t) => D`
                  <label class="field input-dialog__field">
                    <span>${e.label}</span>
                    ${
                      e.type === `password`
                        ? Lt({
                            id: `skill-auth-${e.id}`,
                            name: e.id,
                            value: a[e.id] ?? ``,
                            revealed: o.has(e.id),
                            revealLabel: A(`showPassword`),
                            hideLabel: A(`hidePassword`),
                            autocomplete: `current-password`,
                            required: !0,
                            disabled: s,
                            ariaInvalid: c ? `true` : `false`,
                            autofocus: t === 0,
                            onInput: (t) => h(e.id, t),
                            onToggle: () => {
                              (o.has(e.id) ? o.delete(e.id) : o.add(e.id), g());
                            },
                          })
                        : D`<input
                          name=${e.id}
                          type="text"
                          spellcheck="false"
                          required
                          .value=${a[e.id] ?? ``}
                          ?disabled=${s}
                          aria-invalid=${c ? `true` : E}
                          ?autofocus=${t === 0}
                          @input=${(t) => h(e.id, t.currentTarget instanceof HTMLInputElement ? t.currentTarget.value : ``)}
                        />`
                    }
                  </label>
                `,
              )}
              ${c ? D`<div class="exec-approval-error" role="alert">${c}</div>` : E}
              <div class="exec-approval-actions">
                <button type="submit" class="btn primary" ?disabled=${s || f()}>
                  ${A(`login`)}
                </button>
                <button type="button" class="btn" ?disabled=${s} @click=${p}>
                  ${A(`cancel`)}
                </button>
              </div>
            </form>
          </openclaw-modal-dialog>
        `,
          r,
        );
      }
      g();
    }).finally(() => {
      Zm = void 0;
    })
  );
}
function Ym(e, t, n) {
  if (!We() || !e) return E;
  !Xm.has(e.requestId) && !Zm && (Xm.add(e.requestId), queueMicrotask(() => void Jm(e, t, n)));
  let r = qm(e.skillKey);
  return D`
    <button
      type="button"
      class="agent-chat__input-btn"
      aria-label="${A(`login`)} ${r}"
      title="${A(`login`)} ${r}"
      @click=${() => void Jm(e, t, n)}
    >
      ${at.key}<span>${r}</span>
    </button>
  `;
}
var Xm, Zm;
function Qm() {
  return (Qm = e(() => {
    (gt(), st(), ut(), Ht(), Bt(), S(), Ve(), Km(), (Xm = new Set()));
  }))();
}
function $m(e, t) {
  try {
    let n = e.getItem(t);
    if (!n) return !1;
    let r = JSON.parse(n);
    return y(r) && r.open === !0;
  } catch {
    return !1;
  }
}
function eh(e) {
  try {
    e.setItem(ih, `1`);
  } catch {}
}
function th(e) {
  try {
    return e.getItem(ih) === `1`;
  } catch {
    return !1;
  }
}
function nh() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
function rh(e) {
  let t = e.sessionKey.trim(),
    n = e.storage === void 0 ? nh() : e.storage;
  if (!t || !n || th(n)) return e.settings;
  if (e.settings.sidebarSessionLayouts?.[t] !== void 0) return (eh(n), e.settings);
  let r = new Set([
      ...(e.browserAvailable ? [`browser`] : []),
      ...(e.desktopAvailable ? [`desktop`] : []),
    ]),
    i = { columns: [] };
  for (let e of ah) r.has(e.slot) && $m(n, e.storageKey) && (i = fl(i, e.slot));
  let a =
    i.columns.length > 0
      ? ot({ sidebarSessionLayouts: Ie(e.settings.sidebarSessionLayouts, t, i) })
      : e.settings;
  return (eh(n), a);
}
var ih, ah;
function oh() {
  return (oh = e(() => {
    (a(),
      pt(),
      fe(),
      Al(),
      (ih = `openclaw.chat.sidePanel.legacyDockVisibility.v1`),
      (ah = [
        { storageKey: `openclaw.browser.panel.v1`, slot: `browser` },
        { storageKey: `openclaw.desktopPanel`, slot: `desktop` },
      ]));
  }))();
}
function sh(e) {
  return e?.split(`;`, 1)[0]?.trim().toLowerCase() ?? ``;
}
function ch(e) {
  try {
    let t = new URL(e, window.location.href);
    return (
      t.protocol === `ws:`
        ? (t.protocol = `http:`)
        : t.protocol === `wss:` && (t.protocol = `https:`),
      t.origin === window.location.origin
    );
  } catch {
    return !1;
  }
}
function lh(e) {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:px)?$/iu.test(e.trim())) return null;
  let t = Number.parseFloat(e);
  return Number.isFinite(t) ? t : null;
}
function uh(e) {
  if (!kh.has(e.name) || /^on/iu.test(e.name) || (e.namespaceURI && e.name !== `xmlns`)) return !1;
  let t = e.value.trim();
  switch (e.name) {
    case `d`:
      return Nh.test(t);
    case `points`:
    case `viewBox`:
      return Mh.test(t);
    case `fill`:
    case `stroke`:
      return Ah.test(t);
    case `clip-rule`:
    case `fill-rule`:
      return /^(?:evenodd|nonzero)$/u.test(t);
    case `stroke-linecap`:
      return /^(?:butt|round|square)$/u.test(t);
    case `stroke-linejoin`:
      return /^(?:bevel|miter|round)$/u.test(t);
    case `transform`:
      return /^(?:\s*(?:matrix|rotate|scale|skewX|skewY|translate)\(\s*[0-9eE+.,\s-]+\)\s*)+$/u.test(
        t,
      );
    case `cx`:
    case `cy`:
    case `height`:
    case `opacity`:
    case `r`:
    case `rx`:
    case `ry`:
    case `stroke-miterlimit`:
    case `stroke-width`:
    case `width`:
    case `x`:
    case `x1`:
    case `x2`:
    case `y`:
    case `y1`:
    case `y2`:
      return jh.test(t);
    case `preserveAspectRatio`:
      return /^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?:\s+(?:meet|slice))?)$/u.test(t);
    case `xmlns`:
      return t === Dh;
    case `aria-hidden`:
    case `focusable`:
      return /^(?:false|true)$/u.test(t);
    case `role`:
      return t === `img`;
    case `aria-label`:
      return /^[^<>&]{0,256}$/u.test(t);
    default:
      return !1;
  }
}
async function dh(e) {
  let t = new Image();
  return (
    (t.decoding = `async`),
    await new Promise((n, r) => {
      let i = window.setTimeout(() => {
        ((t.src = ``), r(Error(`plugin SVG decode timed out`)));
      }, Sh);
      (t.addEventListener(
        `load`,
        () => {
          (window.clearTimeout(i), n());
        },
        { once: !0 },
      ),
        t.addEventListener(
          `error`,
          () => {
            (window.clearTimeout(i), r(Error(`plugin SVG decode failed`)));
          },
          { once: !0 },
        ),
        (t.src = e));
    }),
    t
  );
}
function fh(e) {
  let t = e.getAttribute(`viewBox`);
  if (t) {
    let e = t
        .trim()
        .split(/[\s,]+/u)
        .map((e) => Number(e)),
      n = e[2],
      r = e[3];
    return e.length !== 4 ||
      e.some((e) => !Number.isFinite(e)) ||
      !n ||
      !r ||
      n <= 0 ||
      r <= 0 ||
      n > Eh ||
      r > Eh
      ? null
      : { width: n, height: r };
  }
  let n = lh(e.getAttribute(`width`) ?? ``),
    r = lh(e.getAttribute(`height`) ?? ``);
  return !n || !r || n <= 0 || r <= 0 || n > Eh || r > Eh ? null : { width: n, height: r };
}
async function ph(e) {
  let t = await e.text();
  if (/<!doctype|<!entity/iu.test(t)) return null;
  let n = new DOMParser().parseFromString(t, `image/svg+xml`);
  if (n.querySelector(`parsererror`)) return null;
  let r = n.documentElement;
  if (r.namespaceURI !== Dh || r.localName !== `svg`) return null;
  let i = [r, ...Array.from(r.querySelectorAll(`*`))];
  if (i.length > Ch) return null;
  let a = 0;
  for (let e of i) {
    if (e.namespaceURI !== Dh || !Oh.has(e.localName.toLowerCase())) return null;
    for (let t of Array.from(e.attributes)) {
      if (!uh(t)) return null;
      (t.name === `d` || t.name === `points`) && (a += t.value.length);
    }
  }
  if (
    a > wh ||
    i.reduce((e, t) => e + (t.getAttribute(`d`)?.match(/[a-z]/giu)?.length ?? 0), 0) > Th
  )
    return null;
  let o = fh(r);
  return o
    ? {
        blob: new Blob([new XMLSerializer().serializeToString(r)], { type: `image/svg+xml` }),
        ...o,
      }
    : null;
}
async function mh(e) {
  let t = await ph(e);
  if (!t) return null;
  let n = Math.min(xh / t.width, xh / t.height),
    r = Math.max(1, Math.round(t.width * n)),
    i = Math.max(1, Math.round(t.height * n)),
    a = URL.createObjectURL(t.blob);
  try {
    let e = await dh(a),
      t = document.createElement(`canvas`);
    ((t.width = xh), (t.height = xh));
    let n = t.getContext(`2d`);
    return n
      ? (n.drawImage(e, Math.round((xh - r) / 2), Math.round((xh - i) / 2), r, i),
        await new Promise((e) => {
          t.toBlob(e, `image/png`);
        }))
      : null;
  } finally {
    URL.revokeObjectURL(a);
  }
}
function hh(e) {
  e.bodyUsed || e.body?.cancel().catch(() => void 0);
}
async function gh(e, t) {
  if (!ch(e.gatewayUrl)) return null;
  let n = rt(e.auth),
    r = n.length > 0 ? n : [``];
  for (let n of r) {
    let r = { Accept: `image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml` };
    n && (r.Authorization = `Bearer ${n}`);
    let i = await fetch(t, {
      method: `GET`,
      headers: r,
      credentials: `same-origin`,
      signal: e.signal,
    });
    if (!i.ok) {
      if ((hh(i), i.status === 401 || i.status === 403)) continue;
      return null;
    }
    let a = sh(i.headers.get(`content-type`));
    if (!bh.has(a)) return (hh(i), null);
    let o = await i.blob(),
      s = a === `image/svg+xml` ? await mh(o) : o;
    return s ? URL.createObjectURL(s) : null;
  }
  return null;
}
function _h(e) {
  return gh(e, Mn(`pluginIcon`, e.resourceBasePath, e.pluginId));
}
function vh(e) {
  return gh(e, Mn(`catalogIcon`, e.resourceBasePath, e.iconUrl));
}
function yh(e) {
  return gh(e, Mn(`linkFavicon`, e.resourceBasePath, e.hostname));
}
var bh, xh, Sh, Ch, wh, Th, Eh, Dh, Oh, kh, Ah, jh, Mh, Nh;
function Ph() {
  return (Ph = e(() => {
    (jn(),
      ft(),
      (bh = new Set([`image/png`, `image/svg+xml`, `image/x-icon`])),
      (xh = 256),
      (Sh = 5e3),
      (Ch = 4),
      (wh = 8192),
      (Th = 1024),
      (Eh = 4096),
      (Dh = `http://www.w3.org/2000/svg`),
      (Oh = new Set([
        `circle`,
        `desc`,
        `ellipse`,
        `g`,
        `line`,
        `path`,
        `polygon`,
        `polyline`,
        `rect`,
        `svg`,
        `title`,
      ])),
      (kh = new Set(
        `aria-hidden.aria-label.clip-rule.cx.cy.d.fill.fill-rule.focusable.height.opacity.points.preserveAspectRatio.r.role.rx.ry.stroke.stroke-linecap.stroke-linejoin.stroke-miterlimit.stroke-width.transform.viewBox.width.x.x1.x2.xmlns.y.y1.y2`.split(
          `.`,
        ),
      )),
      (Ah = /^(?:none|currentColor|#[0-9a-f]{3,8})$/iu),
      (jh = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu),
      (Mh = /^[0-9eE+.,\s-]+$/u),
      (Nh = /^[0-9a-zA-Z+.,\s-]+$/u));
  }))();
}
function Fh(e, t) {
  return Bh
    ? Bh.expiresAt <= Date.now()
      ? ((Bh = void 0), !1)
      : Bh.sourceData !== t && T(Bh.sessionKey, e)
    : !1;
}
var Ih, Lh, Rh, zh, Bh, Vh;
function Hh() {
  return (Hh = e(() => {
    (C(),
      (Ih = 3e4),
      (Lh = 15e3),
      (Rh = 250),
      (zh = `.agent-chat__composer-combobox textarea`),
      (Vh = class {
        constructor(e) {
          this.host = e;
        }
        rendered(e, t, n) {
          let r = !!(e && (t === void 0 || (t !== null && T(t, e.sessionKey))));
          return (
            e &&
              !e.draft &&
              r &&
              Fh(e.sessionKey, e) &&
              ((Bh = void 0), this.maintain(e.sessionKey)),
            !!(e && n !== e && r && (e.draft !== void 0 || e.focusComposer))
          );
        }
        shouldFocusPane(e, t, n, r) {
          return !!(e && r && ((t && r.focusComposer) || (!t && Fh(n, r))));
        }
        beforeDraftCleanup(e) {
          e.focusComposer &&
            (Bh = { expiresAt: Date.now() + Ih, sessionKey: e.sessionKey, sourceData: e });
        }
        maintain(e) {
          this.timer !== void 0 && (window.clearTimeout(this.timer), (this.timer = void 0));
          let t = Date.now() + Lh,
            n,
            r = () => {
              if (!this.host.isConnected) {
                this.timer = void 0;
                return;
              }
              let i = [...this.host.querySelectorAll(`openclaw-chat-pane`)]
                  .find((t) => t.active && t.sessionKey !== void 0 && T(t.sessionKey, e))
                  ?.querySelector(zh),
                a = document.activeElement,
                o = a === n || a === document.body || (a instanceof HTMLElement && !a.isConnected);
              if (i && (!n || o)) (i.focus({ preventScroll: !0 }), (n = i));
              else if (n && !o) {
                this.timer = void 0;
                return;
              }
              this.timer = Date.now() < t ? window.setTimeout(r, Rh) : void 0;
            };
          r();
        }
      }));
  }))();
}
function Uh(e) {
  return e.lastActivityAt ?? e.updatedAt ?? 0;
}
function Wh(e, t) {
  t === void 0
    ? console.debug(`[chat-session-prefetch] ${e}`)
    : console.debug(`[chat-session-prefetch] ${e}`, t);
}
function Gh(e, t) {
  return e.length === t.length && e.every((e, n) => e === t[n]);
}
function Kh(e, t, n, r) {
  return new Qh(e, t, n, r);
}
var qh, Jh, Yh, Xh, Zh, Qh;
function $h() {
  return ($h = e(() => {
    (_n(),
      Cn(),
      hi(),
      Gr(),
      (qh = 5),
      (Jh = 1500),
      (Yh = 3e4),
      (Xh = `openclaw-chat-prefetch`),
      (Zh = class {
        constructor(e, t) {
          ((this.cache = e),
            (this.snapshotStore = t),
            (this.connected = !1),
            (this.snapshot = null),
            (this.lastAttemptAt = new Map()),
            (this.delayTimer = null),
            (this.idleTimer = null),
            (this.idleCallback = null),
            (this.running = !1),
            (this.rescheduleDelayMs = null),
            (this.handleVisibilityChange = () => {
              document.visibilityState === `visible` && this.schedule();
            }));
        }
        connect() {
          this.connected ||
            ((this.connected = !0),
            document.addEventListener(`visibilitychange`, this.handleVisibilityChange),
            this.schedule());
        }
        disconnect() {
          ((this.connected = !1),
            (this.rescheduleDelayMs = null),
            document.removeEventListener(`visibilitychange`, this.handleVisibilityChange),
            this.cancelScheduledWork());
        }
        update(e) {
          let t = this.snapshot;
          ((this.snapshot = e),
            (!t ||
              t.client !== e.client ||
              t.listRevision !== e.listRevision ||
              t.historyReady !== e.historyReady ||
              !Gh(t.openSessionKeys, e.openSessionKeys)) &&
              this.schedule(e.historyReady && !t?.historyReady ? 0 : void 0));
        }
        schedule(e = Jh) {
          if (this.connected) {
            if (this.running) {
              this.rescheduleDelayMs =
                this.rescheduleDelayMs === null ? e : Math.min(this.rescheduleDelayMs, e);
              return;
            }
            this.delayTimer === null &&
              this.idleTimer === null &&
              this.idleCallback === null &&
              (this.delayTimer = globalThis.setTimeout(() => {
                ((this.delayTimer = null), this.scheduleIdleCycle());
              }, e));
          }
        }
        scheduleIdleCycle() {
          if (this.connected) {
            if (typeof window.requestIdleCallback == `function`) {
              this.idleCallback = window.requestIdleCallback(() => {
                ((this.idleCallback = null), this.runCycle());
              });
              return;
            }
            this.idleTimer = globalThis.setTimeout(() => {
              ((this.idleTimer = null), this.runCycle());
            }, 0);
          }
        }
        async runCycle() {
          if (!(!this.connected || this.running || document.visibilityState === `hidden`)) {
            this.running = !0;
            try {
              let e = typeof navigator > `u` ? void 0 : navigator.locks;
              e
                ? await e.request(Xh, { ifAvailable: !0 }, async (e) => {
                    e && (await this.prefetchEligibleSessions());
                  })
                : await this.prefetchEligibleSessions();
            } catch (e) {
              Wh(`cycle failed`, e);
            } finally {
              if (((this.running = !1), this.rescheduleDelayMs !== null)) {
                let e = this.rescheduleDelayMs;
                ((this.rescheduleDelayMs = null), this.schedule(e));
              }
            }
          }
        }
        async prefetchEligibleSessions() {
          let e = this.snapshot;
          if (
            !e?.client ||
            !e.rows ||
            document.visibilityState === `hidden` ||
            !this.connected ||
            !e.historyReady ||
            (await this.snapshotStore.loadSavedAtIndex(), !this.isCurrent(e))
          )
            return;
          let t = this.selectCandidates(e);
          t.deferMs !== null && this.schedule(t.deferMs);
          for (let n of t.candidates) {
            if (!this.isCurrent(e)) return;
            if (!this.isOpen(n.snapshotKey, this.snapshot)) {
              this.lastAttemptAt.set(n.snapshotKey, Date.now());
              try {
                let t = ei(this.cache, e.snapshotHost, { sessionKey: n.snapshotKey });
                if (!t && this.snapshotStore.readSavedAt(n.snapshotKey) !== null) {
                  if (((t = await this.snapshotStore.read(n.snapshotKey)), !this.isCurrent(e)))
                    return;
                  t && $r(this.cache, e.snapshotHost, { sessionKey: n.snapshotKey }, t);
                }
                let r = await An(
                  e.client,
                  n.snapshotKey,
                  this,
                  () => this.isCurrent(e),
                  t?.deltaCursor,
                );
                if (!this.isCurrent(e)) return;
                if (r.kind === `reset`) {
                  if (t?.deltaCursor !== void 0) {
                    let { deltaCursor: r, ...i } = t;
                    ($r(this.cache, e.snapshotHost, { sessionKey: n.snapshotKey }, i), (t = i));
                  }
                  if (
                    ((r = await An(e.client, n.snapshotKey, this, () => this.isCurrent(e))),
                    !this.isCurrent(e))
                  )
                    return;
                }
                if (
                  this.isOpen(n.snapshotKey, this.snapshot) ||
                  this.currentActivityAt(n.snapshotKey) > n.activityAt
                )
                  continue;
                let i;
                if (r.kind === `delta`) {
                  for (let t of r.messages) {
                    let r = te(t);
                    !r ||
                      !Object.hasOwn(r, `message`) ||
                      Xr(this.cache, e.snapshotHost, { sessionKey: n.snapshotKey }, r.message, r);
                  }
                  let t = ei(this.cache, e.snapshotHost, { sessionKey: n.snapshotKey });
                  if (!t) continue;
                  i = {
                    ...t,
                    deltaCursor: r.deltaCursor,
                    ...(Object.hasOwn(r.sessionInfo, `activeLeafEntryId`)
                      ? { displayedLeafEntryId: r.sessionInfo.activeLeafEntryId?.trim() || null }
                      : {}),
                    sessionId: r.sessionInfo.sessionId?.trim() || t.sessionId,
                  };
                } else if (r.kind === `snapshot`) i = r.snapshot;
                else throw Error(`chat history page request returned a cursor reset`);
                $r(this.cache, e.snapshotHost, { sessionKey: n.snapshotKey }, i);
              } catch (e) {
                Wh(`history fetch failed for ${n.snapshotKey}`, e);
              }
            }
          }
        }
        selectCandidates(e) {
          let t = new Set(e.openSessionKeys.map((t) => L(e.snapshotHost, { sessionKey: t }))),
            n = [...(e.rows ?? [])].toSorted((e, t) => Uh(t) - Uh(e)),
            r = [],
            i = new Set(),
            a = null;
          for (let o of n) {
            let n = L(e.snapshotHost, { sessionKey: o.key, agentId: o.agentId });
            if (t.has(n) || i.has(n)) continue;
            i.add(n);
            let s = Uh(o),
              c = this.snapshotStore.readSavedAt(n);
            if (c !== null && c >= s) continue;
            let l = Date.now() - (this.lastAttemptAt.get(n) ?? 0);
            if (l < Yh) {
              let e = Yh - l;
              a = a === null ? e : Math.min(a, e);
              continue;
            }
            if ((r.push({ activityAt: s, snapshotKey: n }), r.length === qh)) break;
          }
          return { candidates: r, deferMs: a };
        }
        isCurrent(e) {
          return (
            this.connected &&
            document.visibilityState !== `hidden` &&
            this.snapshot?.client === e.client &&
            this.snapshot.listRevision === e.listRevision &&
            this.snapshot.historyReady
          );
        }
        isOpen(e, t) {
          return !!t?.openSessionKeys.some((n) => L(t.snapshotHost, { sessionKey: n }) === e);
        }
        currentActivityAt(e) {
          let t = this.snapshot;
          if (!t?.rows) return 0;
          let n = 0;
          for (let r of t.rows)
            L(t.snapshotHost, { sessionKey: r.key, agentId: r.agentId }) === e &&
              (n = Math.max(n, Uh(r)));
          return n;
        }
        cancelScheduledWork() {
          (this.delayTimer !== null &&
            (globalThis.clearTimeout(this.delayTimer), (this.delayTimer = null)),
            this.idleTimer !== null &&
              (globalThis.clearTimeout(this.idleTimer), (this.idleTimer = null)),
            this.idleCallback !== null &&
              (window.cancelIdleCallback(this.idleCallback), (this.idleCallback = null)));
        }
      }),
      (Qh = class {
        constructor(e, t, n, r) {
          ((this.host = e),
            (this.readContext = r),
            (this.subscriptions = []),
            (this.handleHistoryCommitted = () => {
              this.sync();
            }),
            (this.sync = () => {
              let e = this.readContext();
              if (
                (e !== this.context &&
                  (this.clearSubscriptions(),
                  (this.context = e),
                  e && (this.subscriptions = [e.gateway.subscribe(this.sync)])),
                !e)
              )
                return;
              let t = [...this.host.querySelectorAll(`openclaw-chat-pane`)].flatMap((e) =>
                  e.sessionKey ? [e.sessionKey] : [],
                ),
                n = [...this.host.querySelectorAll(`openclaw-chat-pane`)].filter(
                  (e) => e.visuallyPresented !== !1,
                ),
                r = n.length > 0 && n.every((e) => e.sessionHistoryReady === !0);
              this.prefetcher.update({
                client: e.gateway.snapshot.phase === `connected` ? e.gateway.snapshot.client : null,
                listRevision: e.sessions.canonicalListRevision,
                historyReady: r,
                openSessionKeys: t,
                rows: e.sessions.state.result?.sessions ?? null,
                snapshotHost: {
                  assistantAgentId: e.gateway.snapshot.assistantAgentId,
                  agentsList: e.agents.state.agentsList,
                  hello: e.gateway.snapshot.hello,
                },
              });
            }),
            (this.prefetcher = new Zh(t, n)),
            e.addController(this));
        }
        hostConnected() {
          (this.host.addEventListener(Dn, this.handleHistoryCommitted),
            this.prefetcher.connect(),
            this.sync());
        }
        hostUpdated() {
          this.sync();
        }
        hostDisconnected() {
          (this.host.removeEventListener(Dn, this.handleHistoryCommitted),
            this.clearSubscriptions(),
            this.prefetcher.disconnect());
        }
        clearSubscriptions() {
          for (let e of this.subscriptions) e();
          ((this.subscriptions = []), (this.context = void 0));
        }
      }));
  }))();
}
function eg(e, t) {
  t === void 0
    ? console.debug(`[chat-snapshot-cache] ${e}`)
    : console.debug(`[chat-snapshot-cache] ${e}`, t);
}
function tg(e) {
  return new Promise((t, n) => {
    (e.addEventListener(`complete`, () => t()),
      e.addEventListener(`error`, () => n(e.error ?? Error(`IndexedDB failed`))),
      e.addEventListener(`abort`, () => n(e.error ?? Error(`IndexedDB aborted`))));
  });
}
function ng(e) {
  return new Promise((t, n) => {
    (e.addEventListener(`success`, () => t(e.result)),
      e.addEventListener(`error`, () => n(e.error ?? Error(`IndexedDB request failed`))));
  });
}
function rg(e) {
  try {
    let t = JSON.stringify(e);
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
}
function ig(e, t) {
  let n = mg.safeParse(e);
  return n.success && (!t || n.data.sessionKey === t) ? n.data : null;
}
function ag(e, t) {
  let n = rg(t.snapshot);
  if (!n) return null;
  let r = mg.safeParse({
    savedAt: t.savedAt,
    sessionId: t.snapshot.sessionId,
    sessionKey: e,
    snapshot: n,
  });
  return r.success ? r.data : null;
}
async function og(e) {
  let t = await Pr();
  if (!t) return null;
  try {
    let n = t.transaction(I, `readonly`),
      r = await ng(n.objectStore(I).get(e));
    return (
      await tg(n),
      r === void 0
        ? null
        : ig(r, e) || (eg(`resetting cache after record shape mismatch`), await Fr(t), null)
    );
  } catch (e) {
    return (eg(`IndexedDB read failed`, e), await Fr(t), null);
  } finally {
    t.close();
  }
}
async function sg() {
  let e = await Pr();
  if (!e) return [];
  try {
    let t = e.transaction(I, `readonly`),
      n = await ng(t.objectStore(I).getAll());
    await tg(t);
    let r = [];
    for (let t of n) {
      let n = ig(t);
      if (!n) return (eg(`resetting cache after record shape mismatch`), await Fr(e), null);
      r.push(n);
    }
    return r;
  } catch (t) {
    return (eg(`IndexedDB read failed`, t), await Fr(e), null);
  } finally {
    e.close();
  }
}
function cg(e) {
  let t = ti(e.snapshot) ?? 0;
  try {
    return (
      t +
      JSON.stringify({ savedAt: e.savedAt, sessionId: e.sessionId, sessionKey: e.sessionKey })
        .length
    );
  } catch {
    return t;
  }
}
async function lg(e, t) {
  if (e.length === 0 || t !== Z) return [];
  let n = await Pr();
  if (!n) return [];
  try {
    let t = n.transaction([I, Rr], `readwrite`),
      r = t.objectStore(I),
      i = t.objectStore(Rr),
      a = await ng(i.getAll()),
      o = new Map();
    for (let e of a) {
      let n = hg.safeParse(e);
      if (!n.success) throw (t.abort(), Error(`IndexedDB metadata shape mismatch`));
      o.set(n.data.sessionKey, n.data);
    }
    for (let t of e) {
      let e = { savedAt: t.savedAt, sessionKey: t.sessionKey, weight: cg(t) };
      (o.set(t.sessionKey, e), r.put(t), i.put(e));
    }
    let s = [...o.values()].toSorted((e, t) => e.savedAt - t.savedAt),
      c = s.reduce((e, t) => e + t.weight, 0),
      l = [];
    for (; s.length > 20 || c > 25165824;) {
      let e = s.shift();
      if (!e) break;
      ((c -= e.weight), r.delete(e.sessionKey), i.delete(e.sessionKey), l.push(e.sessionKey));
    }
    return (await tg(t), l);
  } catch (e) {
    return (eg(`resetting cache after IndexedDB write failure`, e), await Fr(n), null);
  } finally {
    n.close();
  }
}
function ug() {
  for (let e of gg) e.flush();
}
var dg, fg, pg, mg, hg, gg, Z, _g;
function vg() {
  return (vg = e(() => {
    (At(),
      kr(),
      hi(),
      Br(),
      vr(),
      Gr(),
      (dg = 500),
      (fg = jt(`hasMore`, [
        Dt({
          completeSnapshot: Pt(!0).optional(),
          hasMore: Pt(!1),
          totalMessages: kt().finite().nonnegative().optional(),
        }).strict(),
        Dt({
          hasMore: Pt(!0),
          nextOffset: kt().finite().nonnegative(),
          totalMessages: kt().finite().nonnegative().optional(),
        }).strict(),
      ])),
      (pg = Dt({
        deltaCursor: Ot().optional(),
        displayedLeafEntryId: Ot().nullable().optional(),
        messages: Nt(Mt()),
        pagination: fg,
        sessionId: Ot().nullable(),
      }).strict()),
      (mg = Dt({
        savedAt: kt().finite().nonnegative(),
        sessionId: Ot().nullable(),
        sessionKey: Ot().min(1),
        snapshot: pg,
      })
        .strict()
        .refine((e) => e.sessionId === e.snapshot.sessionId)),
      (hg = Dt({
        savedAt: kt().finite().nonnegative(),
        sessionKey: Ot().min(1),
        weight: kt().finite().nonnegative(),
      }).strict()),
      (gg = new Set()),
      (Z = 0),
      (_g = class {
        constructor(e) {
          ((this.memoryCache = e),
            (this.connected = !1),
            (this.pending = new Map()),
            (this.hydratedSnapshots = new Map()),
            (this.revisions = new Map()),
            (this.savedAtBySession = new Map()),
            (this.savedAtSeed = null),
            (this.writeTimer = null),
            (this.writeChain = Promise.resolve()));
        }
        connect() {
          ((this.connected = !0), gg.add(this));
        }
        disconnect() {
          ((this.connected = !1),
            this.flush().finally(() => {
              this.connected || gg.delete(this);
            }));
        }
        async read(e) {
          let t = Z,
            n = this.revisions.get(e) ?? 0,
            r = await og(e);
          return !r || t !== Z || n !== (this.revisions.get(e) ?? 0)
            ? null
            : (F(this.hydratedSnapshots, e, r.snapshot), r.snapshot);
        }
        async loadSavedAtIndex() {
          ((this.savedAtSeed ??= this.seedSavedAtIndex()), await this.savedAtSeed);
        }
        readSavedAt(e) {
          return this.pending.get(e)?.savedAt ?? this.savedAtBySession.get(e) ?? null;
        }
        write(e, t) {
          (this.revisions.set(e, (this.revisions.get(e) ?? 0) + 1),
            P(this.hydratedSnapshots, e) !== t &&
              (this.hydratedSnapshots.delete(e), this.schedule(e, t)));
        }
        async delete(e) {
          (this.forget(e), await Hr(e));
        }
        forget(e) {
          (this.revisions.set(e, (this.revisions.get(e) ?? 0) + 1),
            this.pending.delete(e),
            this.hydratedSnapshots.delete(e),
            this.savedAtBySession.delete(e));
        }
        async flush() {
          this.writeTimer !== null &&
            (globalThis.clearTimeout(this.writeTimer), (this.writeTimer = null));
          let e = [...this.pending.entries()],
            t = new Map(e.map(([e]) => [e, this.revisions.get(e) ?? 0]));
          this.pending.clear();
          let n = [];
          for (let [t, r] of e) {
            let e = ag(t, r);
            e ? n.push(e) : await this.delete(t);
          }
          let r = Z;
          ((this.writeChain = this.writeChain.then(async () => {
            let e = await lg(
              n.filter(({ sessionKey: e }) => t.get(e) === (this.revisions.get(e) ?? 0)),
              r,
            );
            if (e === null) {
              this.resetSavedAtIndex();
              return;
            }
            for (let t of e) this.pending.has(t) || this.savedAtBySession.delete(t);
          })),
            await this.writeChain);
        }
        clearMemory() {
          (this.writeTimer !== null &&
            (globalThis.clearTimeout(this.writeTimer), (this.writeTimer = null)),
            this.pending.clear(),
            this.hydratedSnapshots.clear(),
            this.revisions.clear(),
            this.savedAtBySession.clear(),
            this.memoryCache?.clear());
        }
        async whenIdle() {
          await this.writeChain;
        }
        schedule(e, t) {
          let n = { savedAt: Date.now(), snapshot: t };
          (this.pending.set(e, n),
            this.savedAtBySession.set(e, n.savedAt),
            this.writeTimer !== null && globalThis.clearTimeout(this.writeTimer),
            (this.writeTimer = globalThis.setTimeout(() => {
              ((this.writeTimer = null), this.flush());
            }, dg)));
        }
        async seedSavedAtIndex() {
          let e = Z,
            t = new Map(this.revisions),
            n = await sg();
          if (e === Z) {
            if (!n) {
              this.resetSavedAtIndex();
              return;
            }
            for (let e of n) {
              if ((t.get(e.sessionKey) ?? 0) !== (this.revisions.get(e.sessionKey) ?? 0)) continue;
              let n = this.savedAtBySession.get(e.sessionKey) ?? 0;
              this.savedAtBySession.set(e.sessionKey, Math.max(n, e.savedAt));
            }
          }
        }
        resetSavedAtIndex() {
          this.savedAtBySession.clear();
          for (let [e, t] of this.pending) this.savedAtBySession.set(e, t.savedAt);
        }
      }),
      mr(async ({ sessionKey: e }) => {
        e || (Z += 1);
        for (let t of gg) e ? t.forget(e) : t.clearMemory();
        await Promise.all([...gg].map((e) => e.whenIdle()));
      }),
      typeof window < `u` &&
        (window.addEventListener(`pagehide`, ug),
        document.addEventListener(`visibilitychange`, () => {
          document.visibilityState === `hidden` && ug();
        })));
  }))();
}
function yg(e, t, n) {
  let r = (t - e.left) / e.width,
    i = (n - e.top) / e.height,
    a =
      r <= xg
        ? { edge: `left`, distance: r }
        : 1 - r <= xg
          ? { edge: `right`, distance: 1 - r }
          : null,
    o =
      i <= xg
        ? { edge: `up`, distance: i }
        : 1 - i <= xg
          ? { edge: `down`, distance: 1 - i }
          : null,
    s = a && o ? (a.distance <= o.distance ? a : o) : (a ?? o);
  return s ? { kind: `edge`, edge: s.edge } : { kind: `center` };
}
function bg(e, t) {
  let n = { left: e.left, top: e.top, width: e.width, height: e.height };
  return t.kind === `center`
    ? n
    : t.edge === `left`
      ? { ...n, width: e.width / 2 }
      : t.edge === `right`
        ? { ...n, left: e.left + e.width / 2, width: e.width / 2 }
        : t.edge === `up`
          ? { ...n, height: e.height / 2 }
          : { ...n, top: e.top + e.height / 2, height: e.height / 2 };
}
var xg;
function Sg() {
  return (Sg = e(() => {
    xg = 0.3;
  }))();
}
function Cg(e, t) {
  if (e.kind !== `ambiguous` || e.truncated || !t) return e;
  let n = e.sessions.filter((e) => re(e.displayName) === t);
  return n.length === 1 && n[0] ? { kind: `unique`, session: n[0] } : e;
}
async function wg(e, t, n) {
  let r = new Map(),
    i = t.shortId.toLowerCase().replaceAll(`-`, ``),
    a = 0;
  for (let o = 0; ; o += 1) {
    n.throwIfAborted();
    let s = await e.sessions.list({
      agentId: t.agentId,
      archivedFilter: `all`,
      includeDerivedTitles: !0,
      limit: Tg,
      search: i.slice(0, 8),
      ...(a > 0 ? { offset: a } : {}),
    });
    if ((n.throwIfAborted(), !s)) throw Error(`Session list unavailable while resolving URL.`);
    for (let e of s.sessions) co(e.key)?.startsWith(i) && r.set(e.key, e);
    let c = [...r.values()];
    if (c.length > 1)
      return Cg({ kind: `ambiguous`, sessions: c, truncated: s.hasMore === !0 }, t.slugHint);
    if (s.hasMore !== !0) {
      let e = c[0];
      return e ? { kind: `unique`, session: e } : { kind: `not-found` };
    }
    if (o === 4) return { kind: `ambiguous`, sessions: c, truncated: !0 };
    let l = s.nextOffset ?? a + s.sessions.length;
    if (l <= a) return { kind: `ambiguous`, sessions: c, truncated: !0 };
    a = l;
  }
}
var Tg;
function Eg() {
  return (Eg = e(() => {
    (ee(), fo(), (Tg = 20));
  }))();
}
function Dg(e) {
  return (
    e instanceof nt &&
    e.gatewayCode === c.INVALID_REQUEST &&
    e.message.includes(`invalid sessions.resolve params:`) &&
    e.message.includes(`unexpected property 'shortId'`)
  );
}
async function Og(e, t, n) {
  let r = await Rt(e.gateway, n);
  n.throwIfAborted();
  let i;
  try {
    i = await r.request(`sessions.resolve`, {
      shortId: t.shortId,
      ...(t.slugHint ? { slugHint: t.slugHint } : {}),
      agentId: t.agentId,
      allowMissing: !0,
    });
  } catch (r) {
    if (!Dg(r)) throw r;
    return wg(e, t, n);
  }
  n.throwIfAborted();
  let a = i.ok ? [{ key: i.key }] : i.candidates;
  if (!a?.length) return { kind: `not-found` };
  let o = (
    await Promise.all(
      a.map(
        async ({ key: e }) => (await r.request(`sessions.describe`, { key: e })).session ?? null,
      ),
    )
  ).filter((e) => e !== null);
  return (
    n.throwIfAborted(),
    i.ok
      ? o[0]
        ? { kind: `unique`, session: o[0] }
        : { kind: `not-found` }
      : { kind: `ambiguous`, sessions: o, truncated: a.length === 10 }
  );
}
function kg() {
  return (kg = e(() => {
    (i(), mt(), Eg());
  }))();
}
function Ag(e, t, n) {
  let r = e.toLowerCase().replaceAll(`-`, ``);
  if (!g.test(r)) return null;
  if (n) return r;
  let i = t.map((e) => e.toLowerCase().replaceAll(`-`, ``));
  for (let e = 8; e <= r.length; e += 1) {
    let t = r.slice(0, e);
    if (i.filter((e) => e.startsWith(t)).length === 1) return t;
  }
  return r;
}
function jg(e, t) {
  if (t.kind !== `exact`) return null;
  let n = { agentsList: e.agents.state.agentsList, hello: e.gateway.snapshot.hello },
    r = Be(n, t.value);
  return De(t.value)?.rest.toLowerCase() === `global` || he(n) ? r : null;
}
function Mg(e, t) {
  return t.kind === `exact`
    ? jg(e, t) === u(t.agentId)
      ? `global`
      : t.value
    : t.value.split(`-`).reduce((e, t) => (t.length > e.length ? t : e), ``);
}
function Ng(e, t, n) {
  if (n.kind === `exact`) {
    let r = jg(e, n);
    return t.sessions.filter((e) => T(e.key, n.value) || (Ue(e.key) && r === u(n.agentId)));
  }
  return t.sessions.filter((e) => co(e.key) !== null && re(e.displayName) === n.value);
}
async function Pg(e, t, n) {
  let r = await Rt(e.gateway, n);
  n.throwIfAborted();
  let i = Xg.get(r) ?? new Map();
  Xg.set(r, i);
  let a = `${u(t.agentId)}:${t.kind}:${t.value}`,
    o = i.get(a);
  if (!o || o.controller.signal.aborted) {
    let n = new AbortController();
    ((o = {
      controller: n,
      promise: Promise.resolve().then(() => Ig(e, t, n.signal)),
      subscribers: new Set(),
    }),
      i.set(a, o));
  }
  o.subscribers.add(n);
  let s = o,
    c = () => void 0,
    l = new Promise((e, t) => {
      c = t;
    }),
    d = () => {
      (s.subscribers.delete(n),
        s.subscribers.size === 0 && s.controller.abort(n.reason),
        c(n.reason));
    };
  (n.addEventListener(`abort`, d, { once: !0 }), n.aborted && d());
  try {
    return await Promise.race([s.promise, l]);
  } finally {
    (n.removeEventListener(`abort`, d),
      s.subscribers.delete(n),
      s.subscribers.size === 0 && i.get(a) === s && i.delete(a));
  }
}
function Fg(e, t) {
  return e === `slug` && t.length === 0
    ? { kind: `not-found` }
    : { kind: `ambiguous`, sessions: t, truncated: !0 };
}
async function Ig(e, t, n) {
  let r = new Map(),
    i = 0;
  for (let a = 0; ; a += 1) {
    n.throwIfAborted();
    let o = await e.sessions.list({
      agentId: t.agentId,
      archivedFilter: `all`,
      includeDerivedTitles: !0,
      limit: Yg,
      search: Mg(e, t),
      ...(i > 0 ? { offset: i } : {}),
    });
    if ((n.throwIfAborted(), !o)) return null;
    for (let n of Ng(e, o, t)) r.set(n.key, n);
    let s = [...r.values()];
    if (t.kind === `exact` && s[0]) return { kind: `unique`, session: s[0] };
    if (s.length > 1) return { kind: `ambiguous`, sessions: s, truncated: o.hasMore === !0 };
    if (o.hasMore !== !0) {
      let e = s[0];
      return e ? { kind: `unique`, session: e } : { kind: `not-found` };
    }
    if (a === 4) return Fg(t.kind, s);
    let c = o.nextOffset ?? i + o.sessions.length;
    if (c <= i) return Fg(t.kind, s);
    i = c;
  }
}
function Lg(e) {
  return new URLSearchParams(e.search).get(ye) === `1`;
}
function Rg(e, t) {
  let n = new URLSearchParams(e.search);
  n.delete(t);
  let r = n.toString();
  return { ...e, search: r ? `?${r}` : `` };
}
function Q(e) {
  return Rg(Rg(e, ye), Re);
}
function zg(e) {
  return e.boardFace === `dashboard` ? `dashboard` : `chat`;
}
function $(e) {
  return je({ agentsList: e.agents.state.agentsList, hello: e.gateway.snapshot.hello });
}
function Bg(e) {
  return !!(
    e.agents.state.agentsList?.mainKey?.trim() ||
    (e.gateway.snapshot.phase === `connected` && e.gateway.snapshot.hello)
  );
}
function Vg(e, t, n, r) {
  let i = De(r);
  if (!i) return null;
  let a = $(e).toLowerCase();
  if (i.rest.toLowerCase() !== a) return null;
  let o = Ze(n, i.agentId, r, e.basePath, { mainKey: a });
  return o && o !== t.pathname ? { ...Q(t), pathname: o } : null;
}
function Hg(e) {
  let t = e.face,
    n = be(e.row.key),
    r = Ze(t, n, e.row.key, e.context.basePath, {
      displayName: e.row.displayName,
      mainKey: $(e.context),
      shortIdLength: e.shortIdLength,
    });
  if (!r) return;
  let i = Q(e.location);
  return r !== e.location.pathname || i.search !== e.location.search ? { ...i, pathname: r } : null;
}
function Ug(e, t) {
  let n = $(e),
    r = Vt(t.pathname, e.basePath, n);
  if (r) return { target: r, location: t };
  let i = new URLSearchParams(t.search).get(it);
  if (!i) return null;
  let a = Vt(i, e.basePath, n);
  return a ? { target: a, location: { ...Rg(t, it), pathname: i } } : null;
}
function Wg(e, t) {
  return le({ agentId: t.agentId, mainKey: $(e) });
}
function Gg(e, t, n, r, i) {
  let a = n.sessions.flatMap((e) => {
      let t = co(e.key);
      return t ? [{ row: e, uuid: t }] : [];
    }),
    o = a.map(({ uuid: e }) => e);
  return a.flatMap(({ row: a, uuid: s }) => {
    let c = Ag(s, o, n.truncated);
    if (!c) return [];
    let l = be(a.key),
      u = i ? zg(a) : t,
      d = Ze(u, l, a.key, e.basePath, {
        displayName: a.displayName,
        mainKey: $(e),
        shortIdLength: c.length,
      });
    return d
      ? [
          {
            agentId: l,
            displayName: a.displayName?.trim() || a.key,
            href: `${d}${bo(r)}`,
            idPrefix: c,
          },
        ]
      : [];
  });
}
function Kg(e) {
  let t = e.preferenceDerived ? zg(e.row) : e.face,
    n = Hg({
      context: e.context,
      location: e.location,
      face: t,
      row: e.row,
      ...(e.shortId ? { shortIdLength: e.shortId.length } : {}),
    });
  return n === void 0
    ? null
    : {
        kind: `session`,
        sessionKey: e.row.key,
        ...yo(e.location),
        face: t,
        ...(e.shortId && e.shortId.length > 8 ? { shortId: e.shortId } : {}),
        ...(n ? { canonicalLocation: n, canonicalLocationSource: e.location } : {}),
      };
}
function qg(e) {
  if (!Ue(e.row.key)) return Kg(e);
  let t = e.preferenceDerived ? zg(e.row) : e.face,
    n = Ze(t, e.target.agentId, Wg(e.context, e.target), e.context.basePath, {
      mainKey: $(e.context),
    });
  if (!n) return null;
  let r = Q(e.location),
    i =
      n !== e.location.pathname || r.search !== e.location.search ? { ...r, pathname: n } : void 0;
  return {
    kind: `session`,
    sessionKey: e.row.key,
    agentId: e.target.agentId,
    ...yo(e.location),
    face: t,
    ...(i ? { canonicalLocation: i, canonicalLocationSource: e.location } : {}),
  };
}
async function Jg(e, t, n, r) {
  let i = Ug(e, t);
  if (!i || i.target.namespace !== n) return h({ routeId: n });
  let { target: a } = i,
    o = i.location,
    s = Lg(o),
    c = de(o.search);
  if (a.kind === `main` && c) {
    let t = Te(c),
      i = s ? Q(o) : null,
      l = n;
    if (s) {
      let n = await Pg(e, { kind: `exact`, value: t, agentId: a.agentId }, r);
      if (n?.kind === `unique`) {
        l = zg(n.session);
        let t = Ze(l, a.agentId, Wg(e, a), e.basePath, { mainKey: $(e) });
        t && (i = { ...Q(o), pathname: t });
      }
    }
    return {
      kind: `session`,
      sessionKey: t,
      agentId: a.agentId,
      ...yo(o),
      face: l,
      ...(i ? { canonicalLocation: i, canonicalLocationSource: o } : {}),
    };
  }
  if (a.kind === `main`) {
    await Rt(e.gateway, r);
    let t = Wg(e, a);
    if (s) {
      let i = await Pg(e, { kind: `exact`, value: t, agentId: a.agentId }, r);
      if (i?.kind === `unique`)
        return (
          qg({
            context: e,
            location: o,
            face: n,
            row: i.session,
            target: a,
            preferenceDerived: s,
          }) ?? h({ routeId: n })
        );
    }
    let i = s ? Q(o) : null;
    return {
      kind: `session`,
      sessionKey: t,
      ...yo(o),
      face: n,
      ...(i && i.search !== o.search ? { canonicalLocation: i, canonicalLocationSource: o } : {}),
    };
  }
  if (a.kind === `literal`) {
    let t = Bg(e),
      i = s || !!a.slugCandidate;
    if (!t && i && (await Rt(e.gateway, r), (t = Bg(e)), t)) return await Jg(e, o, n, r);
    if (i) {
      let i = t ? Le(e, a.sessionKey, a.agentId) : void 0,
        c = i
          ? { kind: `unique`, session: i }
          : await Pg(e, { kind: `exact`, value: a.sessionKey, agentId: a.agentId }, r);
      if (c?.kind === `unique`)
        return (
          Kg({ context: e, location: o, face: n, row: c.session, preferenceDerived: s }) ??
          h({ routeId: n })
        );
      if (a.slugCandidate && c?.kind === `not-found`) {
        let t = await Pg(e, { kind: `slug`, value: a.slugCandidate, agentId: a.agentId }, r);
        if (t?.kind === `not-found`) return h({ routeId: n });
        if (t?.kind === `ambiguous`)
          return {
            kind: `ambiguous`,
            shortId: a.slugCandidate,
            candidates: Gg(e, n, t, o, s),
            truncated: t.truncated,
            face: n,
          };
        if (t?.kind === `unique`)
          return (
            Kg({ context: e, location: o, face: n, row: t.session, preferenceDerived: s }) ??
            h({ routeId: n })
          );
      }
    }
    let c = t ? Vg(e, o, n, a.sessionKey) : null,
      l = De(a.sessionKey),
      u =
        !t && l
          ? Rt(e.gateway, r)
              .then(() => Vg(e, o, n, a.sessionKey))
              .catch(() => null)
          : void 0,
      d = s ? Q(o) : null;
    return {
      kind: `session`,
      sessionKey: a.sessionKey,
      ...yo(o),
      face: n,
      ...(c
        ? { canonicalLocation: c, canonicalLocationSource: o }
        : d && d.search !== o.search
          ? { canonicalLocation: d, canonicalLocationSource: o }
          : {}),
      ...(u ? { canonicalLocationReady: u, canonicalLocationSource: o } : {}),
    };
  }
  let l = uo(e, o, a);
  if (l && !l.row) {
    let e = Q(o),
      t = e.search !== o.search;
    return {
      kind: `session`,
      sessionKey: l.sessionKey,
      ...yo(o),
      face: n,
      ...(a.shortId.length > 8 ? { shortId: a.shortId } : {}),
      ...(t ? { canonicalLocation: e, canonicalLocationSource: o } : {}),
    };
  }
  let u = l?.row ? { kind: `unique`, session: l.row } : await Og(e, a, r);
  if (u.kind === `not-found`) {
    let t = await Pg(e, { kind: `exact`, value: a.literalSessionKey, agentId: a.agentId }, r);
    return t?.kind === `unique`
      ? (Kg({ context: e, location: o, face: n, row: t.session, preferenceDerived: s }) ??
          h({ routeId: n }))
      : h({ routeId: n });
  }
  return u.kind === `ambiguous`
    ? {
        kind: `ambiguous`,
        shortId: a.shortId,
        candidates: Gg(e, n, u, o, s),
        truncated: u.truncated,
        face: n,
      }
    : (Kg({
        context: e,
        location: o,
        face: n,
        row: u.session,
        preferenceDerived: s,
        shortId: a.shortId,
      }) ?? h({ routeId: n }));
}
var Yg, Xg;
function Zg() {
  return (Zg = e(() => {
    (ee(),
      m(),
      $e(),
      tt(),
      zt(),
      qe(),
      ve(),
      C(),
      So(),
      fo(),
      kg(),
      (Yg = 20),
      (Xg = new WeakMap()));
  }))();
}
export {
  im as $,
  P as $a,
  ro as $i,
  cf as $n,
  Vc as $r,
  Pp as $t,
  Um as A,
  Oi as Aa,
  Oo as Ai,
  dp as An,
  fl as Ar,
  yp as At,
  tm as B,
  Jr as Ba,
  wo as Bi,
  Sf as Bn,
  Qc as Br,
  fp as Bt,
  Wm as C,
  qi as Ca,
  js as Ci,
  ep as Cn,
  Tl as Cr,
  Up as Ct,
  vm as D,
  Wi as Da,
  ss as Di,
  ap as Dn,
  Al as Dr,
  Of as Dt,
  cm as E,
  Vi as Ea,
  os as Ei,
  Xf as En,
  xl as Er,
  Df as Et,
  Rm as F,
  Ci as Fa,
  Ro as Fi,
  Kf as Fn,
  vl as Fr,
  Sp as Ft,
  Lm as G,
  Zr as Ga,
  mo as Gi,
  vf as Gn,
  Ac as Gr,
  wp as Gt,
  fm as H,
  Qr as Ha,
  So as Hi,
  wf as Hn,
  el as Hr,
  Yf as Ht,
  sm as I,
  vi as Ia,
  Po as Ii,
  Gp as In,
  _l as Ir,
  gp as It,
  Pm as J,
  Wr as Ja,
  fo as Ji,
  pf as Jn,
  Wc as Jr,
  op as Jt,
  Xp as K,
  ei as Ka,
  ho as Ki,
  Tf as Kn,
  Ec as Kr,
  Ip as Kt,
  _m as L,
  gi as La,
  No as Li,
  Lp as Ln,
  cl as Lr,
  jp as Lt,
  bm as M,
  Si as Ma,
  jo as Mi,
  Qf as Mn,
  bl as Mr,
  Wf as Mt,
  wm as N,
  bi as Na,
  ko as Ni,
  Zf as Nn,
  ml as Nr,
  Cp as Nt,
  Sm as O,
  zi as Oa,
  Fo as Oi,
  Jf as On,
  Sl as Or,
  bp as Ot,
  Km as P,
  wi as Pa,
  Lo as Pi,
  np as Pn,
  yl as Pr,
  sp as Pt,
  lm as Q,
  Or as Qa,
  io as Qi,
  _f as Qn,
  Kc as Qr,
  Dp as Qt,
  xm as R,
  _i as Ra,
  Co as Ri,
  bf as Rn,
  il as Rr,
  Hp as Rt,
  Am as S,
  Ni as Sa,
  fs as Si,
  Bp as Sn,
  jl as Sr,
  tp as St,
  Fm as T,
  Fi as Ta,
  ts as Ti,
  lp as Tn,
  pl as Tr,
  up as Tt,
  hm as U,
  hi as Ua,
  vo as Ui,
  df as Un,
  tl as Ur,
  Gf as Ut,
  Zp as V,
  $r as Va,
  Ao as Vi,
  Cf as Vn,
  nl as Vr,
  cp as Vt,
  Om as W,
  Kr as Wa,
  xo as Wi,
  gf as Wn,
  Pc as Wr,
  Vp as Wt,
  Nm as X,
  Gr as Xa,
  so as Xi,
  hf as Xn,
  Yc as Xr,
  vp as Xt,
  Gm as Y,
  Hr as Ya,
  co as Yi,
  mf as Yn,
  Xc as Yr,
  ip as Yt,
  Vm as Z,
  L as Za,
  oo as Zi,
  yf as Zn,
  Oc as Zr,
  Mp as Zt,
  rh as _,
  ia as _a,
  tc as _i,
  K as _n,
  eu as _r,
  Rp as _t,
  bg as a,
  Ua as aa,
  xc as ai,
  Lf as an,
  yr as ao,
  Cu as ar,
  Dm as at,
  dm as b,
  Xi as ba,
  Hs as bi,
  Uf as bn,
  Ml as br,
  Nf as bt,
  $h as c,
  ma as ca,
  vc as ci,
  Ff as cn,
  vr as co,
  yu as cr,
  Bm as ct,
  Hh as d,
  fa as da,
  Is as di,
  mp as dn,
  cu as dr,
  ym as dt,
  no as ea,
  mc as ei,
  qf as en,
  kr as eo,
  lf as er,
  mm as et,
  vh as f,
  pa as fa,
  Fs as fi,
  Ep as fn,
  _u as fr,
  Cm as ft,
  oh as g,
  oa as ga,
  nc as gi,
  q as gn,
  Fl as gr,
  Fp as gt,
  Ph as h,
  ca as ha,
  Ls as hi,
  Np as hn,
  iu as hr,
  hp as ht,
  yg as i,
  xa as ia,
  wc as ii,
  kf as in,
  Tr as io,
  bu as ir,
  gm as it,
  um as j,
  yi as ja,
  Bo as ji,
  Vf as jn,
  gl as jr,
  Rf as jt,
  km as k,
  Ti as ka,
  Mo as ki,
  _p as kn,
  ll as kr,
  Yp as kt,
  Kh as l,
  _a as la,
  ac as li,
  Mf as ln,
  mr as lo,
  ou as lr,
  $p as lt,
  _h as m,
  Zi as ma,
  Ps as mi,
  qp as mn,
  pu as mr,
  Jp as mt,
  Jg as n,
  Ea as na,
  lc as ni,
  Pf as nn,
  Dr as no,
  ku as nr,
  Tm as nt,
  _g as o,
  ba as oa,
  uc as oi,
  If as on,
  br as oo,
  Nu as or,
  Em as ot,
  yh as p,
  na as pa,
  sc as pi,
  kp as pn,
  au as pr,
  zm as pt,
  om as q,
  Ur as qa,
  po as qi,
  ff as qn,
  Gc as qr,
  zp as qt,
  Sg as r,
  Ta as ra,
  bc as ri,
  jf as rn,
  Cr as ro,
  Du as rr,
  pm as rt,
  vg as s,
  ha as sa,
  yc as si,
  Af as sn,
  Sr as so,
  vu as sr,
  Mm as st,
  Zg as t,
  to as ta,
  dc as ti,
  Wp as tn,
  F as to,
  tf as tr,
  Im as tt,
  Vh as u,
  ua,
  Us as ui,
  $f as un,
  lu as ur,
  em as ut,
  Qm as v,
  aa as va,
  ic as vi,
  Hf as vn,
  Il as vr,
  Tp as vt,
  Qp as w,
  Pi as wa,
  cs as wi,
  pp as wn,
  hl as wr,
  rp as wt,
  am as x,
  Ji as xa,
  ws as xi,
  Ap as xn,
  Pl as xr,
  zf as xt,
  Ym as y,
  ra as ya,
  Qs as yi,
  Kp as yn,
  Nl as yr,
  Op as yt,
  Hm as z,
  Xr as za,
  To as zi,
  xf as zn,
  al as zr,
  Bf as zt,
};
//# sourceMappingURL=control-ui-boot-Bvc3ZZNG.js.map
