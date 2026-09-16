const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "./dist-BEJujaiw.js",
      "./config-runtime-DfcY45Be.js",
      "./rolldown-runtime-DkW27tQK.js",
      "./control-ui-foundation-CUUNgsy7.js",
      "./control-ui-core-B5rJKETr.js",
      "./control-ui-core-BOclcphE.js",
      "./lit-runtime-BZcFnh9F.js",
      "./control-ui-core-k5VGv3wu.js",
      "./gateway-runtime-CzCgK0eB.js",
      "./control-ui-core-CXVrgOlR.css",
    ]),
) => i.map((i) => d[i]);
import {
  C as It,
  D as Lt,
  O as Rt,
  S as zt,
  _ as Bt,
  b as Vt,
  c as Ht,
  k as Ut,
  p as Wt,
  s as Gt,
  y as Kt,
} from "./config-runtime-DfcY45Be.js";
import {
  $ as fn,
  B as pn,
  G as mn,
  J as hn,
  K as gn,
  Q as _n,
  V as vn,
  W as yn,
  Y as bn,
  Z as xn,
  et as Sn,
  j as Cn,
  ot as wn,
  q as Tn,
} from "./control-ui-boot-4F0V1byh.js";
import {
  M as Zt,
  N as Qt,
  P as $t,
  a as en,
  c as tn,
  f as nn,
  i as rn,
  l as an,
  n as on,
  o as sn,
  r as cn,
  s as ln,
  t as un,
  u as dn,
} from "./control-ui-boot-BbQ-8EFH.js";
import { Xt as qt, Yt as Jt, oo as Yt, ro as Xt } from "./control-ui-boot-BkPDmfcr.js";
import {
  $ as yt,
  Dt as bt,
  G as xt,
  K as St,
  Q as Ct,
  ct as wt,
  et as Tt,
  h as Et,
  m as Dt,
  nt as Ot,
  rt as kt,
  st as At,
  tt as jt,
  wt as Mt,
} from "./control-ui-boot-CIjwt-AI.js";
import {
  C as En,
  a as Dn,
  c as On,
  d as kn,
  f as An,
  g as jn,
  h as Mn,
  i as Nn,
  l as Pn,
  m as Fn,
  n as In,
  o as N,
  p as Ln,
  s as Rn,
  t as zn,
  u as Bn,
  w as Vn,
} from "./control-ui-boot-DOOMhK8q.js";
import {
  $r as ie,
  Ao as ae,
  B as oe,
  Bo as w,
  Ca as T,
  Do as se,
  Eo as ce,
  Fo as le,
  Gt as ue,
  Ii as de,
  Io as fe,
  J as pe,
  Jr as me,
  L as E,
  Li as he,
  Mo as D,
  No as ge,
  Oo as _e,
  Pi as ve,
  Po as ye,
  Qo as be,
  Ro as xe,
  Rr as Se,
  Rs as Ce,
  Sa as we,
  Ta as Te,
  To as Ee,
  Ut as De,
  Wo as O,
  Wt as Oe,
  Xo as ke,
  Xr as Ae,
  Yo as je,
  Yr as Me,
  Zo as Ne,
  _a as k,
  _s as Pe,
  ct as Fe,
  da as Ie,
  di as Le,
  ds as Re,
  es as ze,
  fs as Be,
  ga as Ve,
  gs as He,
  ha as Ue,
  hs as We,
  ls as Ge,
  ma as Ke,
  ms as qe,
  pa as Je,
  ps as Ye,
  rs as Xe,
  sa as Ze,
  ss as Qe,
  st as $e,
  ti as et,
  ts as tt,
  us as nt,
  va as rt,
  wa as it,
  xa as A,
  zo as at,
} from "./control-ui-core-B5rJKETr.js";
import {
  An as ot,
  Dt as st,
  K as ct,
  Kr as lt,
  Mn as ut,
  Rn as dt,
  Zr as ft,
  br as pt,
  fr as mt,
  kt as ht,
  vr as gt,
  z as _t,
  zn as vt,
} from "./control-ui-core-BOclcphE.js";
import { o as j, t as M } from "./control-ui-core-k5VGv3wu.js";
import {
  $ as t,
  $r as n,
  Ai as r,
  Bt as i,
  Ei as a,
  I as o,
  Mi as s,
  Nr as c,
  Oi as l,
  P as u,
  Pr as d,
  S as f,
  Ti as p,
  Xt as m,
  dn as h,
  fn as g,
  gn as _,
  ji as v,
  jt as y,
  ki as b,
  mn as x,
  nn as S,
  ti as C,
  tt as ee,
  v as te,
  w as ne,
  y as re,
} from "./control-ui-foundation-CUUNgsy7.js";
import { a as Nt, n as Pt, r as Ft } from "./gateway-runtime-CzCgK0eB.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function Hn(e) {
  let t = e.snapshot.client,
    n = e.snapshot.phase === `connected`,
    r = 0,
    i = new Map(),
    a = new Map(),
    o = new Map(),
    s = new Set(),
    c = () => {
      for (let e of s) e();
    },
    l = (e) => {
      let s = e.phase === `connected`;
      if (e.client === t && s === n) return;
      let l = i.size > 0;
      ((t = e.client), (n = s), (r += 1), i.clear(), a.clear(), o.clear(), l && c());
    };
  e.subscribe(l);
  let u = (e) => [...new Set(e.map((e) => e?.trim()).filter((e) => !!e))],
    d = (e, t) => {
      let n = a.get(t);
      if (n) return n;
      let r = e
        .request(`agent.identity.get`, { agentId: t })
        .catch(() => null)
        .finally(() => {
          a.get(t) === r && a.delete(t);
        });
      return (a.set(t, r), r);
    };
  return {
    get(e) {
      let t = e?.trim();
      return t ? (i.get(t) ?? null) : null;
    },
    entries() {
      return [...i.values()];
    },
    async ensure(t) {
      let n = e.snapshot;
      l(n);
      let a = n.client;
      if (!a || n.phase !== `connected`) return;
      let s = r,
        f = u(t).filter((e) => !i.has(e));
      if (f.length === 0) return;
      let p = await Promise.all(f.map(async (e) => [e, o.get(e) ?? 0, await d(a, e)]));
      if (r !== s || e.snapshot.client !== a || e.snapshot.phase !== `connected`) return;
      let m = !1;
      for (let [e, t, n] of p) n && t === (o.get(e) ?? 0) && (i.set(e, n), (m = !0));
      m && c();
    },
    invalidate(e) {
      let t = !1;
      for (let n of u(e)) (o.set(n, (o.get(n) ?? 0) + 1), i.delete(n) && (t = !0), a.delete(n));
      t && c();
    },
    subscribe(e) {
      return (s.add(e), () => s.delete(e));
    },
  };
}
function Un() {
  return (Un = e(() => {}))();
}
function Wn(e, t) {
  let n = t.agentId.trim(),
    r = t.sessionKey.trim();
  return `${n}:${r}:model=${Jn(e, r) || `(default)`}`;
}
async function Gn(e, t, n = {}) {
  let r = e.client,
    i = t.agentId.trim(),
    a = t.sessionKey.trim(),
    o = Wn(e, { agentId: i, sessionKey: a });
  if (
    !r ||
    !e.connected ||
    !i ||
    !a ||
    (e.toolsEffectiveLoading && e.toolsEffectiveLoadingKey === o)
  )
    return;
  let s = Symbol(`effective-tools-request`);
  Yn.set(e, s);
  let c = () => e.client === r && e.connected && Yn.get(e) === s && (n.isCurrent?.() ?? !0),
    l = () => !c() || (n.ignoreResponse?.(i, o) ?? !1);
  ((e.toolsEffectiveLoading = !0),
    (e.toolsEffectiveLoadingKey = o),
    (e.toolsEffectiveResultKey = null),
    (e.toolsEffectiveError = null),
    (e.toolsEffectiveResult = null));
  try {
    let t = await r.request(`tools.effective`, { agentId: i, sessionKey: a });
    if (l()) return;
    ((e.toolsEffectiveResultKey = o), (e.toolsEffectiveResult = t));
  } catch (t) {
    if (l()) return;
    e.toolsEffectiveError = n.onError?.(t) ?? A(t);
  } finally {
    c() &&
      e.toolsEffectiveLoadingKey === o &&
      (Yn.delete(e), (e.toolsEffectiveLoadingKey = null), (e.toolsEffectiveLoading = !1));
  }
}
function Kn(e) {
  (Yn.delete(e),
    (e.toolsEffectiveResult = null),
    (e.toolsEffectiveResultKey = null),
    (e.toolsEffectiveError = null),
    (e.toolsEffectiveLoading = !1),
    (e.toolsEffectiveLoadingKey = null));
}
function qn(e) {
  let t = e.sessionKey?.trim();
  if (!t || e.agentsPanel !== `tools` || !e.agentsSelectedId) return;
  let n = be(t);
  if (!(!n || e.agentsSelectedId !== n)) return Gn(e, { agentId: n, sessionKey: t });
}
function Jn(e, t) {
  let n = t.trim();
  if (!n) return ``;
  let r = e.chatModelCatalog ?? [],
    i = e.sessions.state.modelOverrides[n],
    a = e.sessionsResult?.defaults,
    o = Pe(a?.model, a?.modelProvider, r);
  if (i === null) return o;
  if (i) return We(Be(i), r);
  let s = e.sessionsResult?.sessions?.find((e) => e.key === n);
  return s?.model ? Pe(s.model, s.modelProvider, r) : o;
}
var Yn;
function Xn() {
  return (Xn = e(() => {
    (qe(), T(), O(), (Yn = new WeakMap()));
  }))();
}
function Zn(e) {
  let t;
  return (n) => {
    let r = () => {
      let r = n.state.scopeId;
      if (t === void 0) {
        t = r;
        return;
      }
      if (r === t) return;
      let i = t;
      ((t = r), e(r, i));
    };
    return (r(), n.subscribe(r));
  };
}
function Qn() {
  return (Qn = e(() => {}))();
}
async function $n(e) {
  return e.request(`agents.list`, {});
}
async function er(e, t) {
  return e.request(`agents.files.list`, { agentId: t });
}
function tr(e, t) {
  return !!(e.agentsSelectedId && e.agentsSelectedId !== t);
}
function nr(e, t) {
  return ue(e) ? De(t) : A(e);
}
async function rr(e, t) {
  let n = t.trim(),
    r = e.client;
  if (!r || !e.connected || !n || (e.toolsCatalogLoading && e.toolsCatalogLoadingAgentId === n))
    return;
  let i = e.requestGeneration,
    a = () =>
      e.client !== r || e.requestGeneration !== i || e.toolsCatalogLoadingAgentId !== n || tr(e, n);
  ((e.toolsCatalogLoading = !0),
    (e.toolsCatalogLoadingAgentId = n),
    (e.toolsCatalogError = null),
    (e.toolsCatalogResult = null));
  try {
    let t = await r.request(`tools.catalog`, { agentId: n, includePlugins: !0 });
    if (a()) return;
    e.toolsCatalogResult = t;
  } catch (t) {
    if (a()) return;
    e.toolsCatalogError = nr(t, `tools catalog`);
  } finally {
    e.client === r &&
      e.requestGeneration === i &&
      e.toolsCatalogLoadingAgentId === n &&
      ((e.toolsCatalogLoadingAgentId = null), (e.toolsCatalogLoading = !1));
  }
}
async function ir(e, t) {
  let n = e.client,
    r = e.requestGeneration;
  await Gn(e, t, {
    isCurrent: () => e.client === n && e.connected && e.requestGeneration === r,
    ignoreResponse: (t, n) => e.toolsEffectiveLoadingKey !== n || tr(e, t),
    onError: (e) => nr(e, `effective tools`),
  });
}
async function ar(e, t, n, r = () => !0) {
  if (!r()) return;
  let i = e.state.configFormDirty;
  e.stageDefaultAgent(t) &&
    !i &&
    e.state.configFormDirty &&
    (await e.save({ canDispatch: r })) &&
    r() &&
    (await n());
}
async function or(e, t) {
  await e.request(`agents.update`, {
    agentId: t.agentId,
    ...(t.name ? { name: t.name } : {}),
    ...(t.emoji ? { emoji: t.emoji } : {}),
    ...(t.avatar ? { avatar: t.avatar } : {}),
  });
}
function sr() {
  return { list: null, loading: !1, error: null };
}
function cr(e) {
  return e?.trim() || null;
}
function lr(e) {
  let t = ve(e.snapshot),
    n = {
      client: e.snapshot.client,
      connected: e.snapshot.phase === `connected`,
      agentsLoading: !1,
      agentsError: null,
      agentsList: null,
    },
    r = new Map(),
    i = new Map(),
    a = new Map(),
    o = new Set(),
    s = !1,
    c = 0,
    l = null,
    u = () => {
      ((l = null), (c += 1), (n.agentsLoading = !1));
    },
    d = () => {
      if (!s) for (let e of o) e(n);
    },
    f = (e) => {
      let t = r.get(e);
      if (t) return t;
      let n = sr();
      return (r.set(e, n), n);
    },
    p = async (e) => {
      let r = t.capture();
      if (!r) return n.agentsList;
      if (l && !e) return l;
      if (n.agentsList && !e) return n.agentsList;
      let i = ++c;
      ((n.agentsLoading = !0), (n.agentsError = null), d());
      let a = $n(r.client)
        .then((e) => {
          let a = t.isCurrent(r) && c === i;
          return (a && ((n.agentsList = e), (n.agentsError = null)), a ? e : null);
        })
        .catch(
          (e) => (
            t.isCurrent(r) && c === i && (n.agentsError = ue(e) ? De(`agent list`) : A(e)),
            null
          ),
        )
        .finally(() => {
          let e = c === i;
          (e && (l = null), e && t.isCurrent(r) && ((n.agentsLoading = !1), d()));
        });
      return ((l = a), a);
    },
    m = async (e, n) => {
      let o = cr(e),
        s = t.capture();
      if (!o || !s) return o ? (r.get(o)?.list ?? null) : null;
      let c = f(o);
      if (c.list && !n) return c.list;
      let l = i.get(o);
      if (l && !n) return l;
      ((c.loading = !0), (c.error = null), d());
      let u = Symbol(`agent-files-request-owner`);
      a.set(o, u);
      let p = er(s.client, o)
        .then((e) => {
          let n = t.isCurrent(s) && a.get(o) === u;
          return (n && e && ((c.list = e), (c.error = null)), n ? c.list : null);
        })
        .catch((e) => (t.isCurrent(s) && a.get(o) === u && (c.error = A(e)), null))
        .finally(() => {
          let e = a.get(o) === u;
          (e && (i.delete(o), a.delete(o)), e && t.isCurrent(s) && ((c.loading = !1), d()));
        });
      return (i.set(o, p), p);
    },
    h = e.subscribe((e) => {
      let o = n.client !== e.client,
        s = e.phase === `connected`;
      if ((t.transition(e), (n.client = e.client), (n.connected = s), o || !s)) {
        (u(), i.clear(), a.clear());
        for (let e of r.values()) e.loading = !1;
        (r.clear(), (n.agentsList = null), (n.agentsError = null));
      }
      d();
    });
  return {
    get state() {
      return n;
    },
    ensureList: () => p(!1),
    refreshList: () => p(!0),
    files(e) {
      let t = cr(e);
      return t ? (r.get(t) ?? sr()) : sr();
    },
    invalidateFiles(e) {
      let t = !1,
        n = new Set(e.map(cr).filter((e) => e !== null));
      for (let e of n) ((t = r.delete(e) || t), (t = i.delete(e) || t), (t = a.delete(e) || t));
      t && d();
    },
    ensureFiles: (e) => m(e, !1),
    refreshFiles: (e) => m(e, !0),
    subscribe(e) {
      return (o.add(e), () => o.delete(e));
    },
    dispose() {
      ((s = !0), t.dispose(), h(), o.clear(), i.clear(), a.clear(), r.clear(), u());
    },
  };
}
function ur() {
  return (ur = e(() => {
    (T(), Oe(), Xn());
  }))();
}
function dr(e, t) {
  let n = e && Object.hasOwn(e, t) && e[t];
  return Array.isArray(n) ? n : [];
}
function fr(e, t) {
  if (!e) return !1;
  let n = g(Object.hasOwn(e.channels, t) ? e.channels[t] : void 0);
  return (
    n?.configured === !0 ||
    n?.running === !0 ||
    n?.connected === !0 ||
    dr(e.channelAccounts, t).some(
      (e) => e.configured === !0 || e.running === !0 || e.connected === !0,
    )
  );
}
function pr(e) {
  return e
    ? [
        ...new Set([
          ...e.channelOrder,
          ...Object.keys(e.channels),
          ...Object.keys(e.channelAccounts),
        ]),
      ].some((t) => fr(e, t))
    : !1;
}
function mr(e) {
  let t = e.hello?.auth;
  return JSON.stringify({
    role: t?.role ?? null,
    scopes: t?.scopes ? [...t.scopes].toSorted() : null,
  });
}
function hr(e, t) {
  let n = e.hello?.auth;
  return (
    !n?.scopes || re({ role: n.role ?? `operator`, requestedScopes: [t], allowedScopes: n.scopes })
  );
}
function gr(e = {}) {
  return {
    client: e.client ?? null,
    connected: e.phase === `connected`,
    channelsLoading: !1,
    channelsLoadingProbe: null,
    channelsRefreshSeq: 0,
    channelsSnapshot: null,
    channelsError: null,
    channelsLastSuccess: null,
    pairingLoading: !1,
    pairingRefreshSeq: 0,
    pairingSnapshot: null,
    pairingError: null,
    pairingLastSuccess: null,
    pairingBusyRequestId: null,
    whatsappLoginMessage: null,
    whatsappLoginQrDataUrl: null,
    whatsappLoginConnected: null,
    whatsappBusy: !1,
  };
}
function _r(e) {
  return new Promise((t) => {
    setTimeout(t, e);
  });
}
function vr(e, t, n) {
  return e.client === t && e.channelsRefreshSeq === n;
}
async function yr(e, t, n = {}) {
  let r = e.client;
  if (!r || !e.connected || (e.channelsLoading && (!e.channelsLoadingProbe || t))) return;
  let i = (e.channelsRefreshSeq ?? 0) + 1;
  ((e.channelsRefreshSeq = i), (e.channelsLoading = !0), (e.channelsLoadingProbe = t));
  let a = (async () => {
      try {
        let n = await r.request(`channels.status`, { probe: t, timeoutMs: 8e3 });
        if (!vr(e, r, i)) return;
        ((e.channelsSnapshot = n), (e.channelsError = null), (e.channelsLastSuccess = Date.now()));
      } catch (t) {
        if (!vr(e, r, i)) return;
        ue(t)
          ? ((e.channelsSnapshot = null), (e.channelsError = De(`channel status`)))
          : (e.channelsError = A(t));
      } finally {
        vr(e, r, i) && ((e.channelsLoading = !1), (e.channelsLoadingProbe = null));
      }
    })(),
    o = n.softTimeoutMs;
  await (typeof o == `number` && o > 0 ? Promise.race([a, _r(o)]) : a);
}
function br(e, t, n) {
  return e.connected && e.client === t && e.pairingRefreshSeq === n;
}
function xr(e) {
  ((e.pairingRefreshSeq += 1), (e.pairingLoading = !1));
}
async function Sr(e, t = {}) {
  let n = e.client;
  if (!n || !e.connected || e.pairingLoading || (e.pairingBusyRequestId && !t.duringMutation))
    return;
  let r = e.pairingRefreshSeq + 1;
  ((e.pairingRefreshSeq = r), (e.pairingLoading = !0), (e.pairingError = null));
  try {
    let t = await n.request(`channels.pairing.list`, {});
    if (!br(e, n, r)) return;
    ((e.pairingSnapshot = t), (e.pairingLastSuccess = Date.now()));
  } catch (t) {
    br(e, n, r) && (e.pairingError = A(t));
  } finally {
    br(e, n, r) && (e.pairingLoading = !1);
  }
}
function P(e, t) {
  return (
    e.connected &&
    e.client === t.client &&
    Er(e).pairingEpoch === t.pairingEpoch &&
    e.pairingBusyRequestId === t.requestId
  );
}
function Cr(e, t) {
  let n = e.pairingSnapshot;
  !n ||
    !n.requests.some((e) => e.requestId === t) ||
    (e.pairingSnapshot = { ...n, requests: n.requests.filter((e) => e.requestId !== t) });
}
async function wr(e, t) {
  let n = e.client;
  if (!n || !e.connected || e.pairingBusyRequestId) return null;
  let r = { client: n, pairingEpoch: Er(e).pairingEpoch, requestId: t.requestId };
  (xr(e), (e.pairingBusyRequestId = t.requestId), (e.pairingError = null));
  try {
    let i = await n.request(`channels.pairing.approve`, t);
    return P(e, r)
      ? (Cr(e, t.requestId), xr(e), await Sr(e, { duringMutation: !0 }), P(e, r) ? i : null)
      : null;
  } catch (t) {
    return (P(e, r) && (e.pairingError = A(t)), null);
  } finally {
    P(e, r) && (e.pairingBusyRequestId = null);
  }
}
async function Tr(e, t) {
  let n = e.client;
  if (!n || !e.connected || e.pairingBusyRequestId) return !1;
  let r = { client: n, pairingEpoch: Er(e).pairingEpoch, requestId: t.requestId };
  (xr(e), (e.pairingBusyRequestId = t.requestId), (e.pairingError = null));
  try {
    return (
      await n.request(`channels.pairing.dismiss`, t),
      P(e, r) ? (Cr(e, t.requestId), xr(e), await Sr(e, { duringMutation: !0 }), P(e, r)) : !1
    );
  } catch (t) {
    return (P(e, r) && (e.pairingError = A(t)), !1);
  } finally {
    P(e, r) && (e.pairingBusyRequestId = null);
  }
}
function Er(e) {
  let t = Fr.get(e);
  if (t) return t;
  let n = { whatsappEpoch: 0, pairingEpoch: 0, whatsappOperationSeq: 0 };
  return (Fr.set(e, n), n);
}
function Dr(e) {
  let t = e.client;
  if (!t || !e.connected || e.whatsappBusy) return null;
  let n = Er(e),
    r = n.whatsappOperationSeq + 1;
  return (
    (n.whatsappOperationSeq = r),
    (e.whatsappBusy = !0),
    { client: t, whatsappEpoch: n.whatsappEpoch, operationSeq: r }
  );
}
function F(e, t) {
  let n = Er(e);
  return (
    e.connected &&
    e.client === t.client &&
    n.whatsappEpoch === t.whatsappEpoch &&
    n.whatsappOperationSeq === t.operationSeq
  );
}
async function Or(e, t, n) {
  let r = Dr(e);
  if (!r) return !1;
  try {
    let i = await r.client.request(`web.login.start`, {
      force: t,
      timeoutMs: 3e4,
      ...(n ? { accountId: n } : {}),
    });
    if (!F(e, r)) return !1;
    ((e.whatsappLoginMessage = i.message ? A(i.message) : null),
      (e.whatsappLoginQrDataUrl = i.qrDataUrl ?? null),
      (e.whatsappLoginConnected = typeof i.connected == `boolean` ? i.connected : null));
  } catch (t) {
    if (!F(e, r)) return !1;
    ((e.whatsappLoginMessage = A(t)),
      (e.whatsappLoginQrDataUrl = null),
      (e.whatsappLoginConnected = null));
  } finally {
    F(e, r) && (e.whatsappBusy = !1);
  }
  return !0;
}
async function kr(e, t) {
  let n = Dr(e);
  if (!n) return !1;
  let r = e.whatsappLoginQrDataUrl ?? void 0;
  try {
    let i = await n.client.request(`web.login.wait`, {
      timeoutMs: 12e4,
      currentQrDataUrl: r,
      ...(t ? { accountId: t } : {}),
    });
    if (!F(e, n)) return !1;
    ((e.whatsappLoginMessage = i.message ? A(i.message) : null),
      (e.whatsappLoginConnected = i.connected ?? null),
      i.qrDataUrl
        ? (e.whatsappLoginQrDataUrl = i.qrDataUrl)
        : i.connected && (e.whatsappLoginQrDataUrl = null));
  } catch (t) {
    if (!F(e, n)) return !1;
    ((e.whatsappLoginMessage = A(t)), (e.whatsappLoginConnected = null));
  } finally {
    F(e, n) && (e.whatsappBusy = !1);
  }
  return !0;
}
async function Ar(e, t) {
  let n = Dr(e);
  if (!n) return !1;
  try {
    let r = await n.client.request(`channels.logout`, {
      channel: `whatsapp`,
      ...(t ? { accountId: t } : {}),
    });
    if (!F(e, n)) return !1;
    r.cleared
      ? ((e.whatsappLoginMessage = j(`channels.whatsapp.loggedOut`)),
        (e.whatsappLoginQrDataUrl = null),
        (e.whatsappLoginConnected = null))
      : (e.whatsappLoginMessage = j(`channels.whatsapp.logoutNotCleared`));
  } catch (t) {
    if (!F(e, n)) return !1;
    e.whatsappLoginMessage = A(t);
  } finally {
    F(e, n) && (e.whatsappBusy = !1);
  }
  return !0;
}
function jr(e, t) {
  if (!e) return null;
  let n = (e.channels ?? {})[t];
  if (n && typeof n == `object`) return n;
  let r = e[t];
  return r && typeof r == `object` ? r : null;
}
function Mr(e) {
  if (e == null) return j(`common.na`);
  if (typeof e == `string` || typeof e == `number` || typeof e == `boolean`) return String(e);
  try {
    return JSON.stringify(e);
  } catch {
    return j(`common.na`);
  }
}
function Nr(e) {
  let t = jr(e.configForm, e.channelId);
  return t ? e.fields.flatMap((e) => (e in t ? [{ label: e, value: Mr(t[e]) }] : [])) : [];
}
function Pr(e) {
  let t = gr(e.snapshot),
    n = new Set(),
    r = hr(e.snapshot, `operator.read`),
    i = mr(e.snapshot),
    a = hr(e.snapshot, `operator.admin`),
    o = !1,
    s = () => {
      if (!o) for (let e of n) e(t);
    },
    c = async (e) => {
      if (o) return;
      let t = e();
      s();
      try {
        await t;
      } finally {
        s();
      }
    },
    l = e.subscribe((e) => {
      let n = t.client !== e.client,
        o = e.phase === `connected`,
        c = t.connected !== o,
        l = hr(e, `operator.read`),
        u = r !== l;
      r = l;
      let d = mr(e),
        f = i !== d;
      i = d;
      let p = hr(e, `operator.admin`),
        m = a !== p;
      ((a = p), (t.client = e.client), (t.connected = o));
      let h = Er(t);
      ((n || c || u) &&
        ((t.channelsLoading = !1),
        (t.channelsLoadingProbe = null),
        (t.channelsRefreshSeq = (t.channelsRefreshSeq ?? 0) + 1),
        (t.channelsError = o || !l ? null : t.channelsError),
        (t.channelsSnapshot = null),
        (t.channelsLastSuccess = null)),
        (n || c || m) &&
          ((h.whatsappEpoch += 1),
          (h.whatsappOperationSeq += 1),
          (t.whatsappBusy = !1),
          p ||
            ((t.whatsappLoginMessage = null),
            (t.whatsappLoginQrDataUrl = null),
            (t.whatsappLoginConnected = null))),
        (n || c || f) &&
          ((h.pairingEpoch += 1),
          (t.pairingSnapshot = null),
          (t.pairingError = null),
          (t.pairingLastSuccess = null),
          (t.pairingLoading = !1),
          (t.pairingBusyRequestId = null),
          (t.pairingRefreshSeq += 1)),
        s());
    });
  return {
    get state() {
      return t;
    },
    refresh: (e, n) => c(() => yr(t, e ?? !1, n)),
    refreshPairing: () => c(() => Sr(t)),
    approvePairing: async (e) => {
      let n = null;
      return (
        await c(async () => {
          n = await wr(t, e);
        }),
        n
      );
    },
    dismissPairing: async (e) => {
      let n = !1;
      return (
        await c(async () => {
          n = await Tr(t, e);
        }),
        n
      );
    },
    startWhatsApp: (e, n) =>
      c(async () => {
        (await Or(t, e, n)) && (await yr(t, !0));
      }),
    waitWhatsApp: (e) =>
      c(async () => {
        (await kr(t, e)) && (await yr(t, !0));
      }),
    logoutWhatsApp: (e) =>
      c(async () => {
        (await Ar(t, e)) && (await yr(t, !0));
      }),
    subscribe(e) {
      return (n.add(e), () => n.delete(e));
    },
    dispose() {
      if (o) return;
      o = !0;
      let e = Er(t);
      ((e.whatsappEpoch += 1),
        (e.pairingEpoch += 1),
        (e.whatsappOperationSeq += 1),
        (t.pairingRefreshSeq += 1),
        (t.pairingBusyRequestId = null),
        (t.whatsappBusy = !1),
        l(),
        n.clear());
    },
  };
}
var Fr;
function Ir() {
  return (Ir = e(() => {
    (te(), M(), T(), Oe(), (Fr = new WeakMap()));
  }))();
}
function Lr(e) {
  let t = null,
    n = 0,
    r = 0,
    i = !1,
    a = () => {
      ((t &&= (clearTimeout(t), null)), (n = 0), (r += 1));
    },
    o = () => {
      if (i || !e.shouldRefresh()) {
        a();
        return;
      }
      if (t) return;
      let s = Rr[Math.min(n, Rr.length - 1)];
      t = setTimeout(() => {
        t = null;
        let i = r;
        ((n = Math.min(n + 1, Rr.length - 1)),
          e
            .refresh(() => i === r)
            .then(
              () => i === r && o(),
              () => i === r && o(),
            ));
      }, s);
    };
  return {
    cancel: a,
    reconcile: o,
    dispose: () => {
      ((i = !0), a());
    },
  };
}
var Rr;
function zr() {
  return (zr = e(() => {
    Rr = [250, 750, 1500, 3e3, 6e3, 3e4];
  }))();
}
function Br() {
  return Ur !== null;
}
function Vr() {
  return (
    (Wr ??= c(
      () =>
        import(`./dist-BEJujaiw.js`).then(
          (e) => ((Ur = e.default), Ur),
          (e) => {
            throw ((Wr = null), e);
          },
        ),
      __vite__mapDeps([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
      import.meta.url,
    )),
    Wr
  );
}
function Hr(e) {
  try {
    return JSON.parse(e);
  } catch (t) {
    if (Ur) return Ur.parse(e);
    throw (Vr().catch(() => void 0), t);
  }
}
var Ur, Wr;
function Gr() {
  return (Gr = e(() => {
    (d(), (Ur = null), (Wr = null));
  }))();
}
function Kr(e) {
  L.delete(e);
}
function qr(e, t) {
  let n = A(e),
    r = e instanceof dt ? `${e.name}: ${n}` : n;
  if (!t || !(e instanceof dt) || !_(e.details)) return r;
  let i = e.details.issues;
  if (!Array.isArray(i)) return r;
  let a = `${e.name}: invalid config: `;
  if (!r.startsWith(a)) return r;
  let o = ni(t);
  if (!o) return r;
  let s = a.length;
  for (let e of i) {
    if (
      !_(e) ||
      typeof e.path != `string` ||
      typeof e.message != `string` ||
      !r.startsWith(`${e.path}: ${e.message}`, s)
    )
      break;
    let t = Jr(e.path, o);
    if (
      (t !== e.path && (r = `${r.slice(0, s)}${t}${r.slice(s + e.path.length)}`),
      (s += t.length + 2 + e.message.length),
      !r.startsWith(`; `, s))
    )
      break;
    s += 2;
  }
  return r;
}
function Jr(e, t) {
  let n = e.split(`.`),
    r = (e, t) => {
      if (t === n.length) return [``];
      let i = n[t];
      if (i === void 0) return [];
      if (Array.isArray(e)) {
        let a = Number(i);
        return !/^\d+$/u.test(i) || !Number.isSafeInteger(a) || !Object.hasOwn(e, a)
          ? [n.slice(t).join(`.`)]
          : r(e[a], t + 1).map((e) => (e ? `#${a + 1}.${e}` : `#${a + 1}`));
      }
      if (!_(e)) return [n.slice(t).join(`.`)];
      let a = Object.keys(e).flatMap((i) => {
        let a = i.split(`.`);
        return a.length > n.length - t || !a.every((e, r) => e === n[t + r])
          ? []
          : r(e[i], t + a.length).map((e) => (e ? `${i}.${e}` : i));
      });
      return a.length > 0 ? a : [n.slice(t).join(`.`)];
    },
    i = new Set(r(t, 0));
  return i.size === 1 ? (i.values().next().value ?? e) : e;
}
function Yr(e, t, n = {}) {
  let r = e.configFormDirty && n.discardPendingChanges !== !0;
  n.discardPendingChanges === !0 && (e.configAutoSaveStatus = `idle`);
  let i = t.configRevisionHash ?? t.hash ?? null;
  t.appliedConfigHash !== void 0 && (e.configNeedsApply = i !== t.appliedConfigHash);
  let a = e.configDraftBaseHash ?? e.configSnapshot?.hash ?? null;
  e.configSnapshot = t;
  let o = fe(t);
  !(typeof t.raw == `string` || o || e.configForm) &&
    e.configFormMode === `raw` &&
    (e.configFormMode = `form`);
  let s = typeof t.raw == `string` ? t.raw : o ? k(o) : e.configRaw;
  (r
    ? e.configFormMode !== `raw` && e.configForm
      ? (e.configRaw = k(e.configForm))
      : e.configFormMode !== `raw` && (e.configRaw = s)
    : (e.configRaw = s),
    (e.configValid = typeof t.valid == `boolean` ? t.valid : null),
    (e.configIssues = Array.isArray(t.issues) ? t.issues : []),
    r
      ? (e.configDraftBaseHash = a)
      : ((e.configForm = Ze(o ?? {})),
        (e.configFormOriginal = Ze(o ?? {})),
        ri(e, s),
        (e.configFormDirty = !1),
        (e.configFormMode = `form`),
        (e.configDraftBaseHash = t.hash ?? null),
        L.delete(e)));
}
function Xr(e) {
  let t = e.trim();
  return t === `true` || (t !== `false` && e);
}
function I(e, t) {
  if (e == null) return e;
  if (t.allOf && t.allOf.length > 0) {
    let { allOf: n, ...r } = t,
      i = I(e, r);
    for (let e of n) i = I(i, e);
    return i;
  }
  let n = Ve(t);
  if (t.anyOf || t.oneOf) {
    let n = (t.anyOf ?? t.oneOf ?? []).filter(
      (e) => !(e.type === `null` || (Array.isArray(e.type) && e.type.includes(`null`))),
    );
    if (n.length === 1) {
      let t = n[0];
      return t ? I(e, t) : e;
    }
    if (typeof e == `string`) {
      if (n.some(Ue)) return e;
      for (let t of n) {
        let n = Ve(t);
        if (n === `number` || n === `integer`) {
          let t = Xt(e, n === `integer`);
          if (t === void 0 || typeof t == `number`) return t;
        }
        if (n === `boolean`) {
          let t = Xr(e);
          if (typeof t == `boolean`) return t;
        }
      }
    }
    for (let t of n) {
      let n = Ve(t);
      if (
        (n === `object` && typeof e == `object` && !Array.isArray(e)) ||
        (n === `array` && Array.isArray(e))
      )
        return I(e, t);
    }
    return e;
  }
  if (n === `number` || n === `integer`) {
    if (typeof e == `string`) {
      let t = Xt(e, n === `integer`);
      if (t === void 0 || typeof t == `number`) return t;
    }
    return e;
  }
  if (n === `boolean`) {
    if (typeof e == `string`) {
      let t = Xr(e);
      if (typeof t == `boolean`) return t;
    }
    return e;
  }
  if (n === `string`) return typeof e == `string` && e.length === 0 && t.minLength ? void 0 : e;
  if (n === `object`) {
    if (typeof e != `object` || Array.isArray(e)) return e;
    let n = t.properties ?? {},
      r =
        t.additionalProperties && typeof t.additionalProperties == `object`
          ? t.additionalProperties
          : null,
      i = {};
    for (let [t, a] of Object.entries(e)) {
      let e = n[t] ?? r,
        o = e ? I(a, e) : a;
      o !== void 0 && (i[t] = o);
    }
    return i;
  }
  if (n === `array`) {
    if (!Array.isArray(e)) return e;
    let n = t.items;
    return Array.isArray(n)
      ? e.map((e, t) => {
          let r = t < n.length ? n[t] : void 0;
          return r ? I(e, r) : e;
        })
      : n
        ? e.map((e) => I(e, n)).filter((e) => e !== void 0)
        : e;
  }
  return e;
}
function Zr(e) {
  if (!e.configFormDirty && typeof e.configSnapshot?.raw == `string`) return e.configSnapshot.raw;
  if (e.configFormMode !== `form` || !e.configForm) return e.configRaw;
  let t = _(e.configSchema) ? e.configSchema : null,
    n = t ? I(e.configForm, t) : e.configForm,
    r = Ke(n, e.configFormOriginal, e.configRawOriginalParsed);
  return k(r);
}
function Qr(e, t, n) {
  let r = ni(t);
  ((e.configSnapshot = {
    ...e.configSnapshot,
    raw: t,
    hash: n ?? e.configSnapshot?.hash ?? null,
    valid: !0,
    issues: [],
    ...(r ? { config: r, sourceConfig: r } : {}),
  }),
    (e.configValid = !0),
    (e.configIssues = []),
    ri(e, t),
    r && (e.configFormOriginal = Ze(r)),
    (e.configDraftBaseHash = n),
    e.configFormDirty || ((e.configRaw = t), r && (e.configForm = Ze(r))));
}
function $r(e, t) {
  if (e.configSnapshot?.raw !== t) return;
  let n = e.configSnapshot.hash ?? null;
  e.configFormDirty && (e.configDraftBaseHash = n ?? e.configDraftBaseHash);
}
function ei(e, t) {
  let n = Ze(e.configFormOriginal ?? fe(e.configSnapshot) ?? {}),
    r = k(t),
    i = k(n);
  ((e.configForm = t),
    (e.configRaw = r),
    (e.configFormDirty = r !== i),
    (e.configFormMode = `form`),
    ti(e));
}
function ti(e) {
  e.configAutoSaveStatus !== `saving` &&
    e.configAutoSaveStatus !== `conflict` &&
    e.configAutoSaveStatus !== `paused` &&
    (!e.configFormDirty && e.configAutoSaveStatus === `error` && (e.lastError = null),
    (e.configAutoSaveStatus = `idle`));
}
function ni(e) {
  try {
    let t = Hr(e);
    return t && typeof t == `object` && !Array.isArray(t) ? t : null;
  } catch {
    return null;
  }
}
function ri(e, t) {
  ((e.configRawOriginal = t), (e.configRawOriginalParsePending = null));
  try {
    e.configRawOriginalParsed = g(Hr(t));
    return;
  } catch {
    e.configRawOriginalParsed = null;
  }
  let n = Vr()
    .then((r) => {
      if (e.configRawOriginal === t && e.configRawOriginalParsePending === n)
        try {
          e.configRawOriginalParsed = g(r.parse(t));
        } catch {
          e.configRawOriginalParsed = null;
        }
    })
    .catch(() => void 0)
    .finally(() => {
      e.configRawOriginalParsePending === n && (e.configRawOriginalParsePending = null);
    });
  e.configRawOriginalParsePending = n;
}
function ii(e, t) {
  let n;
  if (e.configFormDirty && e.configFormMode === `raw`) {
    let t = ni(e.configRaw);
    if (!t) {
      ((e.configAutoSaveStatus = `error`), (e.lastError = j(`configView.rawDraftBlocksFormEdit`)));
      return;
    }
    n = t;
  } else n = Ze(e.configForm ?? fe(e.configSnapshot) ?? {});
  (t(n), ei(e, n));
}
function ai(e, t) {
  let n = L.get(e);
  n ? n.add(t) : L.set(e, new Set([t]));
}
function oi(e, t) {
  let n = L.get(e);
  n && (n.delete(t), n.size === 0 && L.delete(e));
}
function si(e, t, n, r) {
  if (
    n.length !== 4 ||
    n[0] !== `plugins` ||
    n[1] !== `entries` ||
    typeof n[2] != `string` ||
    n[3] !== `enabled`
  )
    return;
  let i = n[2],
    a = t.plugins && typeof t.plugins == `object` && !Array.isArray(t.plugins) ? t.plugins : null,
    o = Array.isArray(a?.allow) ? a.allow : null;
  if (!o) {
    oi(e, i);
    return;
  }
  if (r === !0) {
    if (o.includes(i)) return;
    if (o.length === 0) {
      oi(e, i);
      return;
    }
    (rt(t, [`plugins`, `allow`], [...o, i]), ai(e, i));
    return;
  }
  L.get(e)?.has(i) &&
    (rt(
      t,
      [`plugins`, `allow`],
      o.filter((e) => e !== i),
    ),
    oi(e, i));
}
function ci(e, t, n) {
  ii(e, (r) => {
    if ((rt(r, t, n), t[0] === `plugins` && t[1] === `allow`)) {
      L.delete(e);
      return;
    }
    si(e, r, t, n);
  });
}
function li(e, t) {
  (Vr().catch(() => void 0),
    (e.configRaw = t),
    (e.configFormMode = `raw`),
    (e.configFormDirty = t !== e.configRawOriginal),
    ti(e),
    (e.configDraftBaseHash = e.configFormDirty
      ? (e.configDraftBaseHash ?? e.configSnapshot?.hash ?? null)
      : (e.configSnapshot?.hash ?? null)));
}
function ui(e) {
  let t = fe(e.configSnapshot);
  ((e.configForm = Ze(e.configFormOriginal ?? t ?? {})),
    (e.configRaw = e.configRawOriginal ?? k(e.configFormOriginal ?? t ?? {})),
    (e.configFormDirty = !1),
    (e.configFormMode = `form`),
    (e.configDraftBaseHash = e.configSnapshot?.hash ?? null),
    L.delete(e));
}
function di(e, t) {
  ii(e, (e) => Je(e, t));
}
function fi(e, t) {
  let n = e.configForm ?? fe(e.configSnapshot),
    r = le(n, t);
  if (!r) return !1;
  let i = r.path[2];
  return (
    ii(e, (e) => {
      let t = _(e.agents) ? e.agents : null,
        n = _(t?.entries) ? t.entries : null;
      if (n)
        for (let [e, t] of Object.entries(n))
          _(t) && (e === i ? (t.default = !0) : delete t.default);
    }),
    !0
  );
}
var L;
function pi() {
  return (pi = e(() => {
    (vt(), Yt(), M(), Ie(), T(), Gr(), ae(), (L = new WeakMap()));
  }))();
}
function mi(e) {
  if (typeof e?.raw == `string`) return e.raw;
  let t = fe(e);
  return t ? k(t) : null;
}
async function hi(e, t, n, r) {
  let i = e.configFormMode === `form` && e.configFormDirty ? mi(e.configSnapshot) : null,
    a = e.client,
    o = _e(e);
  ((await t()) &&
    a &&
    D(e, a, o) &&
    i !== null &&
    mi(e.configSnapshot) === i &&
    ((e.configDraftBaseHash = e.configSnapshot?.hash ?? e.configDraftBaseHash), n()),
    r());
}
function gi(e) {
  let t = e?.hash;
  return typeof t == `string` && t.length > 0 ? t : null;
}
function _i(e) {
  return A(e).includes(`config changed since last load`);
}
function vi(e) {
  return e instanceof dt && (e.gatewayCode === u.INVALID_REQUEST || e.gatewayCode === u.FORBIDDEN);
}
async function yi(e, t, n, r, i, a) {
  if (!D(e, t, n))
    return {
      ok: !1,
      reason: `unavailable`,
      error: `Connection changed before the configuration update started.`,
    };
  if (i.canDispatch && !i.canDispatch())
    return {
      ok: !1,
      reason: `unavailable`,
      error: i.dispatchError ?? `Access changed before the configuration update started.`,
    };
  let o;
  try {
    o = await r(t);
  } catch (r) {
    return D(e, t, n)
      ? { ok: !1, reason: _i(r) ? `conflict` : vi(r) ? `rejected` : `error`, error: A(r) }
      : {
          ok: !1,
          reason: `unavailable`,
          error: `Connection changed before the configuration update completed.`,
        };
  }
  let s = (e) => ({ ok: !0, value: o, refresh: { ok: !1, error: e } });
  if (!D(e, t, n)) return s(`Connection changed before the configuration update was refreshed.`);
  try {
    let r = await a();
    return D(e, t, n)
      ? r
        ? { ok: !0, value: o, refresh: { ok: !0 } }
        : s(
            e.lastError ??
              `The configuration update completed, but its authoritative refresh failed.`,
          )
      : s(`Connection changed before the configuration update was refreshed.`);
  } catch (e) {
    return s(A(e));
  }
}
async function bi(e, t = {}, n = () => !0) {
  let r = e.client;
  if (!r || !e.connected) return !1;
  let i = _e(e),
    a = ye(e, `config`);
  ((e.configLoading = !0), (e.lastError = null), (e.chatError = null));
  try {
    let o = await r.request(`config.get`, {});
    return !ge(e, `config`, a, r, i) || !n() ? !1 : (Yr(e, o, t), !0);
  } catch (t) {
    return (ge(e, `config`, a, r, i) && (e.lastError = A(t)), !1);
  } finally {
    ge(e, `config`, a, r, i) && (e.configLoading = !1);
  }
}
async function xi(e) {
  let t = e.client;
  if (!t || !e.connected || e.configSchemaLoading) return;
  let n = _e(e),
    r = ye(e, `schema`);
  e.configSchemaLoading = !0;
  try {
    let i = await t.request(`config.schema`, {});
    if (!ge(e, `schema`, r, t, n)) return;
    Si(e, i);
  } catch (i) {
    ge(e, `schema`, r, t, n) && (e.lastError = A(i));
  } finally {
    ge(e, `schema`, r, t, n) && (e.configSchemaLoading = !1);
  }
}
function Si(e, t) {
  ((e.configSchema = t.schema ?? null),
    (e.configUiHints = t.uiHints ?? {}),
    (e.configSchemaVersion = t.version ?? null));
}
async function Ci(e, t, n, r = {}, i, a = () => !0) {
  let o = e.client;
  if (!o || !e.connected) return !1;
  let s = _e(e),
    c = () => D(e, o, s);
  ((e[n] = !0), (e.lastError = null), (e.chatError = null));
  let l = null;
  try {
    if (e.configRawOriginalParsePending && (await e.configRawOriginalParsePending, !c())) return !1;
    let n = Zr(e);
    l = e.configFormMode === `form` ? n : null;
    let s = e.configDraftBaseHash ?? e.configSnapshot?.hash;
    if (!s) return ((e.lastError = `Config hash missing; reload and retry.`), !1);
    if (!c() || !a()) return !1;
    i?.({ raw: n, ackHash: null });
    let u = gi(await o.request(t, { raw: n, baseHash: s, ...r }));
    return (
      i?.({ raw: n, ackHash: u }),
      !c() ||
      (Zr(e) === n ? ((e.configFormDirty = !1), Kr(e)) : (e.configFormDirty = !0),
      Qr(e, n, u),
      t === `config.apply`
        ? ((e.configNeedsApply = !1), (e.configAutoSaveStatus = `idle`))
        : (e.configNeedsApply = !0),
      await bi(e),
      !c())
        ? !1
        : (u || $r(e, n),
          t === `config.set` && (e.configAutoSaveStatus = e.configFormDirty ? `idle` : `saved`),
          !0)
    );
  } catch (n) {
    return (
      c() &&
        ((e.lastError = qr(n, l)),
        _i(n)
          ? (e.configAutoSaveStatus = `conflict`)
          : t === `config.set` && (e.configAutoSaveStatus = `error`)),
      !1
    );
  } finally {
    c() && (e[n] = !1);
  }
}
function wi(e, t, n, r) {
  if (!r()) return;
  let i = Zr(e);
  t.request(`config.set`, { raw: i, baseHash: n }).catch(() => void 0);
}
async function Ti(e, t, n = () => !0) {
  let r = e.client;
  if (!r || !e.connected || !e.configFormDirty || e.configFormMode !== `form`) return !1;
  let i = _e(e),
    a = () => D(e, r, i);
  if (
    e.configRawOriginalParsePending &&
    (await e.configRawOriginalParsePending,
    !a() || !e.configFormDirty || e.configFormMode !== `form`)
  )
    return !1;
  let o = Zr(e),
    s = e.configDraftBaseHash ?? e.configSnapshot?.hash;
  if (!s)
    return (
      (e.configAutoSaveStatus = `error`),
      (e.lastError = `Config hash missing; reload and retry.`),
      !1
    );
  if (!a() || !n()) return !1;
  ((e.configAutoSaveStatus = `saving`), (e.lastError = null), (e.chatError = null));
  try {
    let n = gi(await r.request(`config.set`, { raw: o, baseHash: s }));
    if ((t?.(n), !a())) return !1;
    if (
      ((e.configNeedsApply = !0),
      Zr(e) === o ? ((e.configFormDirty = !1), Kr(e)) : (e.configFormDirty = !0),
      Qr(e, o, n),
      !n)
    ) {
      if ((await bi(e), !a())) return !1;
      $r(e, o);
    }
    return ((e.configAutoSaveStatus = e.configFormDirty ? `idle` : `saved`), !0);
  } catch (t) {
    return (
      a() && ((e.lastError = qr(t, o)), (e.configAutoSaveStatus = _i(t) ? `conflict` : `error`)), !1
    );
  }
}
async function Ei(e, t, n) {
  return Ci(e, `config.set`, `configSaving`, {}, t, n);
}
async function Di(e, t) {
  return Ci(e, `config.apply`, `configApplying`, { sessionKey: e.applySessionKey }, void 0, t);
}
async function Oi(e, t, n) {
  let r = e.client,
    i = e.configSnapshot;
  if (!r || !e.connected || !i) return !1;
  let a = _e(e),
    o = i.hash;
  if (!o) return ((e.lastError = `Config hash missing; refresh and retry.`), !1);
  if (t.canDispatch && !t.canDispatch()) return !1;
  ((e.lastError = null), (e.chatError = null));
  try {
    let s = await r.request(`config.patch`, {
      baseHash: o,
      raw: typeof t.raw == `string` ? t.raw : JSON.stringify(t.raw),
      sessionKey: e.applySessionKey,
      note: t.note,
      ...(t.replacePaths?.length ? { replacePaths: t.replacePaths } : {}),
    });
    if (!D(e, r, a)) return !1;
    let c = s.noop !== !0;
    return (c && (e.configNeedsApply = !0), await n?.(s, i), c && (e.configNeedsApply = !0), !0);
  } catch (t) {
    return (D(e, r, a) && (e.lastError = A(t)), !1);
  }
}
function ki(e, t, n) {
  let r = g(t.config),
    i = gi(t);
  if (!r) return;
  let a = e.configSnapshot ?? n,
    o = t.noop === !0 ? (a.raw ?? e.configRaw) : k(r);
  Yr(e, {
    ...a,
    config: r,
    sourceConfig: r,
    hash: i ?? a.hash ?? null,
    raw: o,
    valid: !0,
    issues: [],
  });
}
async function Ai(e, t) {
  let n = e.client;
  if (!n || !e.connected) return null;
  let r = _e(e);
  try {
    let i = await n.request(`config.schema.lookup`, { path: t });
    return D(e, n, r) ? i : null;
  } catch (t) {
    if (!D(e, n, r)) return null;
    throw t;
  }
}
async function ji(e) {
  let t = e.client;
  if (!t || !e.connected) return;
  let n = _e(e),
    r = () => D(e, t, n);
  ((e.lastError = null), (e.chatError = null));
  let i = async (t, n) => {
    if (!r()) return;
    let i = t;
    (n && (i += (await pe(n)) ? `\n\nFile path copied to clipboard: ${n}` : `\n\nFile path: ${n}`),
      r() && ((e.lastError = we(i)), Fe({ message: e.lastError })));
  };
  try {
    let n = await t.request(`config.openFile`, {});
    if (!r()) return;
    n.ok || (await i(we(n.error, `Failed to open config file`), n.path || e.configSnapshot?.path));
  } catch (t) {
    await i(A(t), e.configSnapshot?.path);
  }
}
function Mi() {
  return (Mi = e(() => {
    (o(), vt(), Ie(), T(), $e(), pi(), ae());
  }))();
}
function Ni(e, t = {}) {
  let n = se(e.snapshot),
    r = new Set(),
    i = null,
    a = null,
    o = !1,
    s = (t, n) =>
      Pt(
        { client: e.snapshot.client, hello: e.snapshot.hello ?? null, phase: e.snapshot.phase },
        t,
        t === `config.schema` ? `operator.read` : `operator.admin`,
        n,
      ),
    c = () => {
      if (!o) for (let e of r) e(n);
    },
    l = async (e) => {
      try {
        let t = e();
        return (c(), await t);
      } finally {
        c();
      }
    },
    u = (e) => {
      (e(), c());
    },
    d = (e, t) => {
      let n = t
        .then(() => void 0)
        .finally(() => {
          e === `config` && i === n ? (i = null) : e === `schema` && a === n && (a = null);
        });
      return (e === `config` ? (i = n) : (a = n), n);
    },
    f = (e, t) => (e === `config` ? i : a) ?? d(e, l(t)),
    p = Lr({
      shouldRefresh: () =>
        !o && n.connected && n.configNeedsApply && n.configSnapshot?.appliedConfigHash !== void 0,
      refresh: (e) => f(`config`, () => bi(n, {}, e)),
    }),
    m = Gt({
      autoLoadOnConnect: t.autoLoadOnConnect !== !1,
      state: n,
      gateway: e,
      publish: c,
      run: l,
      mutate: u,
      trackLoad: d,
      resetLoads: () => {
        ((i = null), (a = null));
      },
      resetConfigLoad: () => {
        i = null;
      },
      refreshConnectionState: () => {
        let e = l(() => bi(n));
        return (
          d(`config`, e),
          n.configSchemaVersion !== null &&
            g() &&
            d(
              `schema`,
              l(() => xi(n)),
            ),
          e
        );
      },
      canCallConfigMethod: s,
      cancelAppliedRefresh: p.cancel,
      reconcileAppliedRefresh: p.reconcile,
      disposeAppliedRefresh: p.dispose,
      isDisposed: () => o,
    }),
    h = async () => {
      (n.configSnapshot || (await f(`config`, () => bi(n))), p.reconcile());
    },
    g = () => {
      let t = e.snapshot;
      return !t.client || t.phase !== `connected` || Nt(t, `config.schema`) === !1
        ? !1
        : ot(t.hello?.auth ?? null);
    };
  return {
    get state() {
      return n;
    },
    get canSet() {
      return s(`config.set`);
    },
    get canApply() {
      return s(`config.apply`);
    },
    get canPatch() {
      return s(`config.patch`);
    },
    get canOpenFile() {
      return s(`config.openFile`, { requireAdvertisement: !1 });
    },
    ensureLoaded: h,
    ensureSchemaLoaded: () =>
      n.configSchema || !g() ? Promise.resolve() : f(`schema`, () => xi(n)),
    refresh: async (e) => {
      (e?.discardPendingChanges && (await m.prepareDiscard()), p.cancel());
      try {
        await d(
          `config`,
          l(() => bi(n, e)),
        );
      } finally {
        p.reconcile();
      }
    },
    refreshSchema: () =>
      d(
        `schema`,
        l(() => xi(n)),
      ),
    patchForm: m.patchForm,
    removeFormValue: m.removeFormValue,
    setRaw: m.setRaw,
    resetDraft: m.resetDraft,
    discardDraft: m.discardDraft,
    setWritesSuspended: m.setWritesSuspended,
    waitForPendingWrites: m.waitForPendingWrites,
    save: m.save,
    apply: m.apply,
    openFile: () =>
      s(`config.openFile`, { requireAdvertisement: !1 }) ? l(() => ji(n)) : Promise.resolve(),
    agentEntry: (e, t) => Ee(n, e, t),
    stageDefaultAgent: m.stageDefaultAgent,
    patch: m.patch,
    patchFromSnapshot: m.patchFromSnapshot,
    runExternalMutation: m.runExternalMutation,
    lookupSchemaPath: (e) => l(() => Ai(n, e)),
    subscribe(e) {
      return (r.add(e), () => r.delete(e));
    },
    dispose() {
      ((o = !0), m.dispose(), r.clear(), ce(n), Kr(n));
    },
  };
}
function Pi() {
  return (Pi = e(() => {
    (ut(), Ft(), zr(), pi(), Mi(), ae(), Ht());
  }))();
}
function Fi(e) {
  return !e.metadata?.archivedAt;
}
function Ii(e, t, n) {
  let r = t.metadata?.automation?.boardId?.trim() || `default`,
    i = e
      .filter(
        (e) =>
          e.id !== t.id &&
          e.status === n &&
          (e.metadata?.automation?.boardId?.trim() || `default`) === r,
      )
      .map((e) => e.position);
  return Math.max(0, ...i) + 1e3;
}
function Li(e) {
  let t = e.boards.find((t) => t.id === e.boardFilter)?.id;
  return t ? { boardId: t } : {};
}
function Ri(e, t) {
  let n = e.cards.filter((e) => e.id !== t.id);
  (n.push(t), (e.cards = n.toSorted((e, t) => e.position - t.position)));
}
function zi(e) {
  let t = [];
  for (let n of e.metadata?.links ?? []) {
    let e = n.type === `parent` ? n.targetCardId?.trim() : ``;
    e && !t.includes(e) && t.push(e);
  }
  return t;
}
function Bi(e, t) {
  let n = new Map(t.map((e) => [e.id, e])),
    r = zi(e).map((e) => {
      let t = n.get(e);
      return {
        id: e,
        title: t?.title ?? e,
        status: t?.status,
        done: t?.status === `done`,
        missing: !t,
      };
    });
  return { parents: r, blockedParents: r.filter((e) => !e.done) };
}
function Vi(e, t) {
  let n = [];
  for (let r of e) {
    if (r.id === t) continue;
    let e = r.metadata?.links;
    if (!e?.some((e) => e.targetCardId === t)) {
      n.push(r);
      continue;
    }
    let i = e.filter((e) => e.targetCardId !== t),
      a = { ...r.metadata, links: i };
    (i.length === 0 && delete a.links,
      n.push(Object.keys(a).length ? { ...r, metadata: a } : { ...r, metadata: void 0 }));
  }
  return n;
}
function Hi(e) {
  let t = e.loaded && e.mutationReadiness === `stale_edit_draft`;
  ((e.draftOpen = !1),
    (e.editingCardId = null),
    (e.editingCardBase = null),
    (e.draftTitle = ``),
    (e.draftNotes = ``),
    (e.draftStatus = `todo`),
    (e.draftPriority = `normal`),
    (e.draftLabels = ``),
    (e.draftAgentId = ``),
    (e.draftSessionKey = ``),
    (e.draftTemplateId = ``),
    (e.draftCommentBody = ``),
    t && (e.mutationReadiness = `ready`));
}
function Ui(e) {
  let t = [];
  for (let n of e.split(`,`)) {
    let e = n.trim();
    if ((e && !t.includes(e) && t.push(e), t.length >= 12)) break;
  }
  return t;
}
function Wi(e) {
  return {
    title: e.draftTitle,
    notes: e.draftNotes,
    status: e.draftStatus,
    priority: e.draftPriority,
    labels: Ui(e.draftLabels),
    agentId: e.draftAgentId,
    sessionKey: e.draftSessionKey,
    ...(e.draftTemplateId ? { templateId: e.draftTemplateId } : {}),
  };
}
function Gi(e) {
  return {
    title: e.title,
    notes: e.notes ?? ``,
    status: e.status,
    priority: e.priority,
    labels: e.labels,
    agentId: e.agentId ?? ``,
    sessionKey: Xi(e) ?? ``,
    templateId: e.metadata?.templateId ?? ``,
  };
}
function Ki(e) {
  let t = e.editingCardBase;
  if (!t) return {};
  let n = { ...Wi(e), templateId: e.draftTemplateId },
    r = Gi(t),
    i = {};
  for (let e of Object.keys(n))
    JSON.stringify(n[e]) !== JSON.stringify(r[e]) &&
      (i[e] = e === `templateId` && n[e] === `` ? null : n[e]);
  return i;
}
function qi(e, t) {
  let n = new Set(Object.keys(Ki(e))),
    r = Gi(t);
  (n.has(`title`) || (e.draftTitle = r.title),
    n.has(`notes`) || (e.draftNotes = r.notes),
    n.has(`status`) || (e.draftStatus = r.status),
    n.has(`priority`) || (e.draftPriority = r.priority),
    n.has(`labels`) || (e.draftLabels = r.labels.join(`, `)),
    n.has(`agentId`) || (e.draftAgentId = r.agentId),
    n.has(`sessionKey`) || (e.draftSessionKey = r.sessionKey),
    n.has(`templateId`) || (e.draftTemplateId = r.templateId),
    (e.editingCardBase = t));
}
function Ji(e) {
  return e === `failed` || e === `killed` || e === `timeout`;
}
function Yi(e) {
  if (
    e.status === `running` &&
    e.hasActiveRun === !1 &&
    !(typeof e.updatedAt != `number` || Date.now() - e.updatedAt < Qi)
  )
    return {
      detectedAt: Date.now(),
      lastSessionUpdatedAt: e.updatedAt,
      reason: `Linked session has not reported recent activity.`,
    };
}
function Xi(e) {
  return e.sessionKey ?? e.execution?.sessionKey;
}
function Zi(e) {
  return e.runId ?? e.execution?.runId;
}
var Qi;
function $i() {
  return ($i = e(() => {
    Qi = 18e5;
  }))();
}
function ea(e) {
  let t = R(e),
    n = (t.loadGeneration ?? 0) + 1;
  return ((t.loadGeneration = n), n);
}
function ta(e, t) {
  return R(e).loadGeneration === t;
}
function na(e) {
  let t = R(e),
    n = (t.lifecycleReconciliationEpoch ?? 0) + 1;
  return ((t.lifecycleReconciliationEpoch = n), n);
}
function ra(e) {
  return R(e).lifecycleReconciliationEpoch ?? 0;
}
function ia(e, t) {
  return ra(e) === t;
}
function aa(e) {
  let t = R(e),
    n = t.state;
  (n &&
    (fa(n, !1, { host: e }),
    ua(n, { host: e }),
    t.loadPromise && (n.draftSaving || (n.loading = !1), n.loaded || (n.loadAttempted = !1))),
    ea(e),
    delete t.loadPromise,
    delete t.loadToken,
    na(e));
}
function oa(e) {
  let t = R(e),
    n = !!t.loadPromise;
  ((t.liveRefreshGeneration = (t.liveRefreshGeneration ?? 0) + 1),
    t.liveRefreshRetryTimer &&
      (clearTimeout(t.liveRefreshRetryTimer), delete t.liveRefreshRetryTimer),
    delete t.liveRefreshEntry,
    delete t.liveRefreshPromise,
    delete t.liveChangeEpoch,
    delete t.liveHighestSeenRevision,
    delete t.liveAppliedRevision,
    delete t.liveRefreshPending,
    n && aa(e));
}
function sa(e) {
  let t = R(e),
    n = t.lifecycleTaskPreparedTimer;
  n && (clearTimeout(n), delete t.lifecycleTaskPreparedTimer);
}
function ca(e) {
  let t = R(e),
    n = t.lifecycleTaskRetryTimer;
  n && (clearTimeout(n), delete t.lifecycleTaskRetryTimer);
}
function la(e) {
  let t = R(e),
    n = t.lifecycleTaskContinuationTimer;
  n && (clearTimeout(n), delete t.lifecycleTaskContinuationTimer);
}
function ua(e, t = {}) {
  ((e.lifecycleConfirmedTaskIds = new Set()),
    (e.lifecycleTaskConfirmationStartedAt = null),
    ha(e, !1, t));
}
function da(e) {
  let t = R(e);
  (sa(e), ca(e), la(e), delete t.lifecycleTaskRefreshPromise);
  let n = t.state;
  (n &&
    (fa(n, !1),
    ma(n, !1),
    (n.lifecycleTaskRefreshError = null),
    ua(n, { host: e }),
    n.draftSaving || (n.loading = !1),
    (n.mutationReadiness = `canonical_reload_required`),
    (n.loaded = !1),
    (n.loadAttempted = !1)),
    ea(e),
    delete t.loadPromise,
    delete t.loadToken,
    na(e));
}
function fa(e, t, n = {}) {
  let r = n.preparedAt ?? Date.now();
  ((e.lifecycleTasksPrepared = t), (e.lifecycleTasksPreparedAt = t ? r : null));
  let i = n.host;
  if (!i || (sa(i), !t || !n.requestUpdate || !Ta(e))) return;
  let a = setTimeout(
    () => {
      (delete R(i).lifecycleTaskPreparedTimer, n.requestUpdate?.());
    },
    Math.max(0, r + Ma - Date.now()),
  );
  R(i).lifecycleTaskPreparedTimer = a;
}
function pa(e, t = Date.now()) {
  return !e.lifecycleTasksPrepared ||
    e.lifecycleTasksPreparedAt === null ||
    t - e.lifecycleTasksPreparedAt >= Ma
    ? null
    : e.lifecycleTasksPreparedAt;
}
function ma(e, t, n = {}) {
  let r = n.retryDelayMs ?? Aa;
  ((e.lifecycleTaskRefreshFailed = t), (e.lifecycleTaskRefreshRetryAt = t ? Date.now() + r : null));
  let i = n.host;
  if (!i || (ca(i), !t || !n.requestUpdate)) return;
  let a = setTimeout(() => {
    (delete R(i).lifecycleTaskRetryTimer, n.requestUpdate?.());
  }, r);
  R(i).lifecycleTaskRetryTimer = a;
}
function ha(e, t, n = {}) {
  e.lifecycleTaskRefreshContinueAt = t ? Date.now() + ja : null;
  let r = n.host;
  if (!r || (la(r), !t || !n.requestUpdate)) return;
  let i = setTimeout(() => {
    (delete R(r).lifecycleTaskContinuationTimer, n.requestUpdate?.());
  }, ja);
  R(r).lifecycleTaskContinuationTimer = i;
}
function ga(e, t = Date.now()) {
  return (
    e.lifecycleTaskRefreshFailed &&
    e.lifecycleTaskRefreshRetryAt !== null &&
    t < e.lifecycleTaskRefreshRetryAt
  );
}
function _a(e, t = Date.now()) {
  return e.lifecycleTaskRefreshContinueAt !== null && t < e.lifecycleTaskRefreshContinueAt;
}
function va() {
  return {
    loading: !1,
    loaded: !1,
    loadAttempted: !1,
    mutationReadiness: `ready`,
    error: null,
    cards: [],
    boards: [],
    statuses: n,
    tasksByCardId: new Map(),
    missingTaskIds: new Set(),
    lastDispatchSummary: null,
    dispatching: !1,
    query: ``,
    priorityFilter: `all`,
    agentFilter: `all`,
    boardFilter: `__all__`,
    viewPreset: `all`,
    activeHealthHighlight: null,
    showArchived: !1,
    layout: `compact`,
    hideEmptyColumns: !1,
    lastRefreshAt: null,
    lastRefreshStartedAt: null,
    lastRefreshError: null,
    lastRefreshSource: null,
    lifecycleTasksPrepared: !1,
    lifecycleTasksPreparedAt: null,
    lifecycleTaskRefreshFailed: !1,
    lifecycleTaskRefreshRetryAt: null,
    lifecycleTaskRefreshContinueAt: null,
    lifecycleTaskRefreshError: null,
    lifecycleConfirmedTaskIds: new Set(),
    lifecycleTaskConfirmationStartedAt: null,
    draftOpen: !1,
    draftSaving: !1,
    editingCardId: null,
    editingCardBase: null,
    draftTitle: ``,
    draftNotes: ``,
    draftStatus: `todo`,
    draftPriority: `normal`,
    draftLabels: ``,
    draftAgentId: ``,
    draftSessionKey: ``,
    draftTemplateId: ``,
    draftCommentBody: ``,
    detailCardId: null,
    detailCommentBody: ``,
    busyCardIds: new Set(),
    draggedCardId: null,
    capturingSessionKeys: new Set(),
  };
}
function R(e) {
  let t = Da.get(e);
  return (t || ((t = {}), Da.set(e, t)), t);
}
function ya(e) {
  let t = R(e);
  return ((t.state ??= va()), t.state);
}
function ba(e) {
  return e.mutationReadiness === `ready`;
}
function xa(e) {
  return !!(e.draftSaving || e.busyCardIds.size || e.capturingSessionKeys.size);
}
function Sa(e) {
  return !!R(e).loadPromise;
}
function Ca(e, t) {
  return !!(t.draftOpen || t.editingCardId || t.draggedCardId || t.dispatching || xa(t) || Sa(e));
}
function wa(e) {
  return (
    e.cards.some((t) => Fi(t) && e.tasksByCardId.has(t.id)) ||
    e.cards.some((t) => {
      if (!Fi(t)) return !1;
      let n = b(t.taskId);
      return !!(n && !e.missingTaskIds.has(n));
    })
  );
}
function Ta(e) {
  return wa(e) || e.cards.some((e) => Fi(e) && e.status === `running` && !!Xi(e));
}
function Ea(e, t = {}) {
  return e.cards.every((n) => {
    if (!Fi(n)) return !0;
    let r = b(n.taskId);
    return r
      ? e.missingTaskIds.has(r) || e.tasksByCardId.has(n.id)
      : !t.requireRunningTaskDiscovery ||
          n.status !== `running` ||
          !Xi(n) ||
          e.tasksByCardId.has(n.id);
  });
}
var Da, Oa, ka, Aa, ja, Ma;
function Na() {
  return (Na = e(() => {
    ($i(),
      C(),
      (Da = new WeakMap()),
      (Oa = 5e3),
      (ka = `Task confirmation exceeded its freshness window.`),
      (Aa = 5e3),
      (ja = 100),
      (Ma = 5e3));
  }))();
}
function Pa() {
  let e = new Set(),
    t = !1,
    n = !1,
    r = {
      get state() {
        return ya(r);
      },
      get boardsReady() {
        return n;
      },
      notify() {
        if (!t) for (let t of e) t();
      },
      setBoardsReady(e) {
        n = e;
      },
      clearBoards() {
        let e = r.state.boards.length > 0,
          t = n;
        ((n = !1), (r.state.boards = []), (e || t) && r.notify());
      },
      subscribe(t) {
        return (e.add(t), () => e.delete(t));
      },
      dispose() {
        ((t = !0), oa(r), da(r), e.clear());
      },
    };
  return r;
}
function Fa() {
  return (Fa = e(() => {
    Na();
  }))();
}
function Ia() {
  return Ra;
}
function La() {
  Ra += 1;
}
var Ra;
function za() {
  return (za = e(() => {
    Ra = 0;
  }))();
}
function Ba(e) {
  let t = b(e?.name) ?? b(e?.username);
  if (t) return t;
  let n = b(e?.id);
  return n ? (/^([^@\s]+)@[^@\s]+$/.exec(n)?.[1] ?? n) : null;
}
function Va(e) {
  let t = b(e?.id),
    n = b(e?.name),
    r = b(e?.username),
    i = b(e?.profileAvatarUrl);
  return !t && !n && !r && !i
    ? null
    : {
        ...(t ? { id: t } : {}),
        ...(n ? { name: n } : {}),
        ...(r ? { username: r } : {}),
        ...(i ? { profileAvatarUrl: i } : {}),
      };
}
function Ha(e) {
  return e
    ? [e.id ?? ``, e.name ?? ``, e.username ?? ``, e.profileAvatarUrl ?? ``].join(`\0`)
    : null;
}
function Ua() {
  return (Ua = e(() => {}))();
}
function Wa(e) {
  let t = 2166136261;
  for (let n = 0; n < e.length; n += 1) ((t ^= e.charCodeAt(n)), (t = Math.imul(t, 16777619)));
  return t >>> 0;
}
function Ga() {
  return (Ga = e(() => {}))();
}
function Ka(e) {
  ao.add(e);
}
function qa() {
  return { origin: no, resourceBasePath: ro, authHeader: io };
}
function Ja(e) {
  if (!e) return null;
  try {
    let t = new URL(e);
    return `${t.protocol === `wss:` ? `https:` : t.protocol === `ws:` ? `http:` : t.protocol}//${t.host}`;
  } catch {
    return null;
  }
}
function Ya(e, t = null, n = ``) {
  let r = Ja(e),
    i = globalThis.location?.origin,
    a = r && i === r ? ft(n) : ``,
    o = t?.trim() || null;
  if (no !== r || ro !== a || io !== o) for (let e of ao) e();
  ((no = r), (ro = a), (io = o));
}
function Xa(e, t, n = ro) {
  try {
    let r = new URL(e, to),
      i = r.origin === to,
      a = Qt(r.pathname, i ? `` : n);
    if (!a) return null;
    let o = `${n}${a}${r.search}`;
    return i ? (t ? new URL(o, t).toString() : o) : t && r.origin === t ? t + o : null;
  } catch {
    return null;
  }
}
function Za(e) {
  return (
    e
      .trim()
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((e) => Array.from(e)[0] ?? ``)
      .join(``)
      .toUpperCase() || `?`
  );
}
function Qa(e) {
  let t = e.id?.trim(),
    n = Ba(e) ?? `?`;
  return { kind: `initials`, initials: Za(n), colorSeed: Wa(t || n) };
}
function $a(e) {
  return Qa(e).colorSeed % 360;
}
function eo(e) {
  let t = no,
    n = e.profileAvatarUrl?.trim();
  if (n) {
    let e = Xa(n, t);
    if (e) return { kind: `profile`, url: e };
  }
  let r = e.id?.trim();
  if (r && oo.test(r)) {
    let e = Xa(Zt(r), t);
    if (e) return { kind: `profile`, url: e };
  }
  return Qa(e);
}
var to, no, ro, io, ao, oo;
function so() {
  return (so = e(() => {
    ($t(),
      lt(),
      Ua(),
      (to = `https://origin-probe.invalid`),
      (no = null),
      (ro = ``),
      (io = null),
      (ao = new Set()),
      (oo = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu));
  }))();
}
function co(e) {
  return (
    !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
  );
}
function lo(e) {
  for (let t of e.composedPath()) if (t instanceof HTMLAnchorElement) return t;
  return e.target instanceof Element ? e.target.closest(`a`) : null;
}
function uo(e) {
  let t = lo(e);
  if (!t || t.hasAttribute(`download`) || t.hasAttribute(`data-file-path`)) return null;
  try {
    let e = new URL(t.href, window.location.href);
    return (e.protocol === `http:` || e.protocol === `https:`) &&
      e.origin !== window.location.origin
      ? { anchor: t, url: e }
      : null;
  } catch {
    return null;
  }
}
function fo() {
  return (fo = e(() => {}))();
}
function po(e, n) {
  return e.request(`device.pair.setupCode`, n, { timeoutMs: t });
}
function mo(e) {
  return po(e, { includeQr: !1, joinUrl: !0 });
}
function ho(e) {
  return {
    client: e.client,
    connected: e.connected,
    devicePairSetupOpen: !1,
    devicePairSetupLifecycle: { phase: `selection`, access: `full` },
    devicePairSetupExpiryTimer: null,
    devicePairSetupCountdownTimer: null,
    onDevicePairSetupChange: e.onChange ?? (() => {}),
    pendingCount: 0,
  };
}
function go(e) {
  return {
    devicePairSetupOpen: e.devicePairSetupOpen,
    devicePairSetupLifecycle: e.devicePairSetupLifecycle,
    devicePairPendingCount: e.pendingCount,
  };
}
function _o(e) {
  e.devicePairSetupCountdownTimer &&= (clearInterval(e.devicePairSetupCountdownTimer), null);
}
function vo(e, t) {
  _o(e);
  let n = e.devicePairSetupLifecycle,
    r = n.phase === `waiting` ? n.setup.expiresAtMs : void 0;
  n.access !== `node` ||
    !e.devicePairSetupOpen ||
    typeof r != `number` ||
    r <= Date.now() ||
    (e.devicePairSetupCountdownTimer = setInterval(() => {
      ((!e.devicePairSetupOpen || r <= Date.now()) && _o(e), t());
    }, 1e3));
}
function yo(e) {
  return (
    typeof e.setupId == `string` &&
    e.setupId.length > 0 &&
    typeof e.expiresAtMs == `number` &&
    Number.isInteger(e.expiresAtMs) &&
    e.expiresAtMs >= 0
  );
}
function bo(e) {
  e.devicePairSetupExpiryTimer !== null &&
    (clearTimeout(e.devicePairSetupExpiryTimer), (e.devicePairSetupExpiryTimer = null));
}
async function xo(e, t) {
  let n = e.client;
  if (!n || !e.connected) return { status: `unavailable`, message: `Gateway unavailable` };
  try {
    let e = await n.request(`device.pair.setupStatus`, { setupId: t });
    if (e?.completion === void 0) {
      if (e?.deliveryUncertain === void 0) return { status: `missing` };
      let n = Eo(e.deliveryUncertain);
      return n?.setupId === t
        ? { status: `delivery-uncertain`, outcome: n }
        : { status: `unavailable`, message: `Invalid setup status response` };
    }
    let r = To(e.completion);
    return r?.setupId === t
      ? { status: `found`, completion: r }
      : { status: `unavailable`, message: `Invalid setup status response` };
  } catch (e) {
    return { status: `unavailable`, message: A(e) };
  }
}
function So(e, t, n, r) {
  let i = e.devicePairSetupLifecycle;
  if (
    (i.phase === `waiting` && i.setup.setupId === t) ||
    (i.phase === `reconciling` && i.setupId === t) ||
    (i.phase === `error` && i.source === `status` && i.setupId === t)
  ) {
    if (r.status === `found`) {
      Do(e, r.completion);
      return;
    }
    if (r.status === `delivery-uncertain`) {
      Oo(e, r.outcome);
      return;
    }
    ((e.devicePairSetupLifecycle =
      r.status === `missing`
        ? { phase: `expired`, access: n }
        : { phase: `error`, source: `status`, access: n, setupId: t, message: r.message }),
      e.onDevicePairSetupChange());
  }
}
async function Co(e, t) {
  let n = e.devicePairSetupLifecycle;
  if (n.phase !== `waiting` || n.setup.setupId !== t) return;
  (bo(e), _o(e));
  let r = n.access;
  ((e.devicePairSetupLifecycle = { phase: `reconciling`, access: r, setupId: t }),
    e.onDevicePairSetupChange(),
    So(e, t, r, await xo(e, t)));
}
function wo(e, t) {
  bo(e);
  let n = () => {
    let r = t.expiresAtMs - Date.now();
    if (r > 0) {
      e.devicePairSetupExpiryTimer = setTimeout(n, r);
      return;
    }
    Co(e, t.setupId);
  };
  n();
}
function To(e) {
  if (!_(e)) return null;
  let { setupId: t, deviceName: n, access: r } = e;
  if (typeof t != `string` || t.length === 0 || (r !== `full` && r !== `limited` && r !== `node`))
    return null;
  let i = typeof n == `string` ? n.trim() : ``;
  return { setupId: t, access: r, ...(i ? { deviceName: i } : {}) };
}
function Eo(e) {
  let t = To(e);
  return t ? { setupId: t.setupId, access: t.access } : null;
}
function Do(e, t) {
  let n = e.devicePairSetupLifecycle;
  return (n.phase === `waiting` && n.setup.setupId === t.setupId) ||
    (n.phase === `reconciling` && n.setupId === t.setupId) ||
    (n.phase === `error` && n.source === `status` && n.setupId === t.setupId)
    ? (_o(e),
      bo(e),
      (e.devicePairSetupLifecycle = {
        phase: `success`,
        access: t.access,
        ...(t.deviceName ? { deviceName: t.deviceName } : {}),
      }),
      e.onDevicePairSetupChange(),
      !0)
    : !1;
}
function Oo(e, t) {
  let n = e.devicePairSetupLifecycle;
  return (n.phase === `waiting` && n.setup.setupId === t.setupId) ||
    (n.phase === `reconciling` && n.setupId === t.setupId) ||
    (n.phase === `error` && n.source === `status` && n.setupId === t.setupId)
    ? (_o(e),
      bo(e),
      (e.devicePairSetupLifecycle = { phase: `delivery-uncertain`, access: t.access }),
      e.onDevicePairSetupChange(),
      !0)
    : !1;
}
async function ko(e) {
  e.devicePairSetupOpen = !0;
}
async function Ao(e) {
  let t = e.client,
    n = e.devicePairSetupLifecycle,
    r = n.access;
  if (!t || !e.connected || e.devicePairSetupLifecycle.phase === `loading` || z.has(e)) return;
  let i = {};
  if ((z.set(e, i), n.phase === `error` && n.source === `status`)) {
    let t = await xo(e, n.setupId);
    z.get(e) === i && (So(e, n.setupId, r, t), z.delete(e));
    return;
  }
  (bo(e), (e.devicePairSetupLifecycle = { phase: `loading`, access: r }));
  try {
    let n = await po(
      t,
      r === `full`
        ? {}
        : r === `node`
          ? { bootstrapProfile: `node`, includeQr: !1 }
          : { bootstrapProfile: `limited` },
    );
    if (z.get(e) !== i || e.client !== t || !e.connected || !e.devicePairSetupOpen) return;
    if (!yo(n))
      throw Error(
        `Gateway does not provide pairing lifecycle metadata. Update the Gateway and try again.`,
      );
    ((e.devicePairSetupLifecycle = {
      phase: `waiting`,
      access: n.access === `full` || n.access === `limited` || n.access === `node` ? n.access : r,
      setup: n,
    }),
      wo(e, n));
  } catch (n) {
    z.get(e) === i &&
      e.client === t &&
      e.devicePairSetupOpen &&
      (e.devicePairSetupLifecycle = { phase: `error`, source: `create`, access: r, message: A(n) });
  } finally {
    z.get(e) === i && z.delete(e);
  }
}
async function jo(e, t) {
  (e.devicePairSetupLifecycle.phase === `selection` ||
    (e.devicePairSetupLifecycle.phase === `error` &&
      e.devicePairSetupLifecycle.source === `create`)) &&
    e.devicePairSetupLifecycle.access !== t &&
    (e.devicePairSetupLifecycle = { phase: `selection`, access: t });
}
function Mo(e) {
  (_o(e),
    z.delete(e),
    bo(e),
    (e.devicePairSetupOpen = !1),
    (e.devicePairSetupLifecycle = { phase: `selection`, access: `full` }));
}
var z;
function No() {
  return (No = e(() => {
    (ee(), T(), (z = new WeakMap()));
  }))();
}
function Po(e) {
  return e.startsWith(`/`) && Lo.some((t) => e.startsWith(t) || e.includes(t));
}
function Fo(e) {
  let t = e.trim();
  if (!t) return;
  let n;
  try {
    if (/^https?:\/\//i.test(t) || Po(t)) {
      let e = new URL(t, `https://openclaw.invalid`).pathname;
      n = e.slice(e.lastIndexOf(`/`) + 1);
      try {
        let e = n.replace(/%2f/gi, `%252F`).replace(/%5c/gi, `%255C`);
        n = decodeURIComponent(e);
      } catch {}
    } else n = t.split(/[\\/]/).pop() ?? t;
  } catch {
    n = t.split(/[\\/]/).pop() ?? t;
  }
  return /\.([a-zA-Z0-9]+)$/.exec(n)?.[1]?.toLowerCase();
}
function Io(e) {
  let t = Fo(e);
  return t !== void 0 && Ro.has(t);
}
var Lo, Ro;
function zo() {
  return (zo = e(() => {
    ((Lo = [
      `/__openclaw__/assistant-media`,
      `/__openclaw__/media/`,
      `/api/chat/media/outgoing/`,
      `/media/inbound/`,
    ]),
      (Ro = new Set([`avi`, `m4v`, `mkv`, `mov`, `mp4`, `mpeg`, `mpg`, `webm`])));
  }))();
}
function Bo(e) {
  return `${e.length}:${e}`;
}
function Vo(e, t) {
  return `${Uo}${Bo(e)}:${Bo(t)}:`;
}
function Ho(e, t, n) {
  return `${Vo(e, t)}${Bo(n)}`;
}
var Uo;
function Wo() {
  return (Wo = e(() => {
    Uo = `openclaw.new-session.session-placement-recovery.v1:`;
  }))();
}
function Go(e, t, n) {
  if (!_(e)) return null;
  let r = e;
  return Object.keys(r).some((e) => !ss.has(e)) ||
    r.key !== t ||
    r.agentId !== n ||
    r.message !== `` ||
    r.worktree !== !0 ||
    (r.incognito !== void 0 && r.incognito !== !0) ||
    (r.visibility !== void 0 && r.visibility !== `draft`) ||
    (r.projectId !== void 0 && r.cwd !== void 0) ||
    os.some((e) => r[e] !== void 0 && !a(r[e]))
    ? null
    : r;
}
function Ko(e) {
  try {
    let t = JSON.parse(e);
    return _(t) ? t : null;
  } catch {
    return null;
  }
}
function qo(e, t, n) {
  return e.gatewayUrl === t && e.recoveryScope === n;
}
function Jo(e) {
  return _(e)
    ? (e.kind === `profile` &&
        Object.keys(e).every((e) => e === `kind` || e === `profileId` || e === `machineClass`) &&
        a(e.profileId) &&
        (e.machineClass === void 0 || (a(e.machineClass) && e.machineClass.length <= 128))) ||
      (e.kind === `device` &&
        Object.keys(e).every((e) => e === `kind` || e === `deviceId`) &&
        a(e.deviceId))
      ? e
      : e.kind === `auto-device` && Object.keys(e).every((e) => e === `kind`)
        ? { kind: `auto-device` }
        : null
    : null;
}
function Yo(e, t, n, r) {
  return e.createParams?.incognito === !0 ||
    !a(e.sessionKey) ||
    (r !== void 0 && e.sessionKey !== r) ||
    !a(e.messageId) ||
    typeof e.message != `string` ||
    (!a(e.message) && !e.attachments?.length) ||
    (e.attachments !== void 0 && !Array.isArray(e.attachments)) ||
    !Jo(e.target) ||
    !a(e.agentId) ||
    !qo(e, t, n) ||
    (e.phase !== `creating` && e.phase !== `dispatching` && e.phase !== `sending`) ||
    (e.phase === `creating` && !Go(e.createParams, e.sessionKey, e.agentId))
    ? null
    : e;
}
function Xo(e, t) {
  try {
    return (e.removeItem(t), e.getItem(t) === null);
  } catch {
    return !1;
  }
}
function Zo(e, t, n, r, i) {
  try {
    let a = e.getItem(t);
    if (a === null) return null;
    let o = Ko(a),
      s = o ? Yo(o, n, r, i) : null;
    return !s || t !== Ho(n, r, s.sessionKey) ? (Xo(e, t), null) : s;
  } catch {
    return null;
  }
}
function Qo(e, t, n, r) {
  let i = Ho(r.gatewayUrl, r.recoveryScope, r.sessionKey),
    a = JSON.stringify(r);
  try {
    if ((e.removeItem(t), e.getItem(t) !== null)) return null;
    e.setItem(i, a);
    let n = Zo(e, i, r.gatewayUrl, r.recoveryScope, r.sessionKey);
    if (n) return n;
  } catch {}
  Xo(e, i);
  try {
    e.setItem(t, n);
  } catch {}
  return null;
}
function $o(e, t) {
  if (!e || !t) return [];
  try {
    let n = globalThis.sessionStorage;
    if (!n) return [];
    let r = Vo(e, t),
      i = [];
    for (let e = 0; e < n.length; e += 1) {
      let t = n.key(e);
      t?.startsWith(r) && i.push(t);
    }
    let a = i.toSorted(),
      o = new Map();
    for (let r of a) {
      let i = Zo(n, r, e, t);
      i && o.set(i.sessionKey, i);
    }
    return [...o.values()].toSorted((e, t) => e.sessionKey.localeCompare(t.sessionKey));
  } catch {
    return [];
  }
}
function es(e, t, n) {
  for (let r of $o(e, t)) rs({ ...r, recoveryScope: n }) && as(e, t, r.sessionKey);
}
function ts(e, t, n) {
  if (!e || !t || !n) return null;
  try {
    let r = globalThis.sessionStorage;
    return r ? Zo(r, Ho(e, t, n), e, t, n) : null;
  } catch {
    return null;
  }
}
function ns(e) {
  try {
    let t = globalThis.sessionStorage;
    if (!t || !e.gatewayUrl || !e.recoveryScope || !e.sessionKey) return !1;
    let n = Ho(e.gatewayUrl, e.recoveryScope, e.sessionKey);
    return (
      t.setItem(n, JSON.stringify(e)), !!Zo(t, n, e.gatewayUrl, e.recoveryScope, e.sessionKey)
    );
  } catch {
    return !1;
  }
}
function rs(e) {
  let t = ts(e.gatewayUrl, e.recoveryScope, e.sessionKey);
  return t && t.messageId !== e.messageId ? !1 : ns(e);
}
function is(e, t) {
  if (e === t.sessionKey) return ns(t);
  try {
    let n = globalThis.sessionStorage;
    if (!n || !e) return !1;
    let r = Ho(t.gatewayUrl, t.recoveryScope, e),
      i = n.getItem(r),
      a = Zo(n, r, t.gatewayUrl, t.recoveryScope, e);
    if (!i || !a) return ns(t);
    let o = Zo(
      n,
      Ho(t.gatewayUrl, t.recoveryScope, t.sessionKey),
      t.gatewayUrl,
      t.recoveryScope,
      t.sessionKey,
    );
    return o ? o.messageId === t.messageId && Xo(n, r) : !!Qo(n, r, i, t);
  } catch {
    return !1;
  }
}
function as(e, t, n) {
  if (!(!e || !t))
    try {
      let r = globalThis.sessionStorage;
      if (!r) return;
      if (n) {
        Xo(r, Ho(e, t, n));
        return;
      }
      let i = Vo(e, t);
      for (let e = r.length - 1; e >= 0; --e) {
        let t = r.key(e);
        t?.startsWith(i) && Xo(r, t);
      }
    } catch {}
}
var os, ss;
function cs() {
  return (cs = e(() => {
    (Wo(),
      (os = [
        `category`,
        `model`,
        `thinkingLevel`,
        `worktreeBaseRef`,
        `worktreeName`,
        `cwd`,
        `catalogId`,
        `projectId`,
      ]),
      (ss = new Set([`key`, `agentId`, `message`, `worktree`, `incognito`, `visibility`, ...os])));
  }))();
}
function ls(e) {
  return {
    key: e.key,
    agentId: e.agentId,
    ...(e.target.kind === `profile`
      ? {
          profileId: e.target.profileId,
          ...(e.target.machineClass ? { machineClass: e.target.machineClass } : {}),
        }
      : e.target.kind === `device`
        ? { deviceId: e.target.deviceId }
        : { autoDevice: !0 }),
  };
}
function us(e) {
  return e instanceof dt ? e.retryable || e.gatewayCode === `UNAVAILABLE` : !0;
}
async function ds(e, t) {
  try {
    let n = await e.request(`sessions.describe`, { key: t });
    if (n?.session === null) return { status: `missing` };
    let r = n?.session?.sessionId;
    return {
      status: `read`,
      placement: n?.session?.placement,
      ...(typeof r == `string` && r.trim() ? { sessionId: r } : {}),
    };
  } catch (e) {
    return us(e) ? { status: `unavailable` } : { status: `rejected`, error: A(e) };
  }
}
async function B(e, t) {
  t.abortRun &&
    (await e.request(`sessions.abort`, { key: t.key, agentId: t.agentId }).catch(() => void 0));
  try {
    await e.request(`sessions.reclaim`, { key: t.key, agentId: t.agentId });
    return;
  } catch (e) {
    return A(e);
  }
}
async function fs(e, t, n) {
  let r = t.initial ? { status: `read`, placement: t.initial } : void 0,
    i = 0,
    a = 0;
  for (let o = 0; o < vs; o += 1) {
    let o = r ?? (await ds(e, t.key));
    if (((r = void 0), o.status === `missing`)) return { status: `missing` };
    if (o.status === `rejected`) return { status: `cleanup-rejected`, error: o.error };
    if (o.status === `unavailable`) {
      i += 1;
      let r = !n();
      if (r || i >= ys) {
        if (!t.cleanupOnCancellation && r) return { status: `interrupted` };
        let n = await B(e, { key: t.key, agentId: t.agentId, abortRun: !1 });
        if (r) return n ? { status: `cleanup-rejected`, error: n } : { status: `cancelled` };
        let i = `session placement could not be verified`;
        return { status: `cleanup-rejected`, error: n ? `${i}; cleanup failed: ${n}` : i };
      }
      await new Promise((e) => {
        globalThis.setTimeout(e, _s);
      });
      continue;
    }
    if (((i = 0), o.status === `read`)) {
      let r = o.placement;
      if (r) a = 0;
      else if (((a += 1), a >= bs))
        return { status: `cleanup-rejected`, error: `session placement could not be verified` };
      if (!n()) {
        if (!t.cleanupOnCancellation) return { status: `interrupted` };
        let n = await B(e, { key: t.key, agentId: t.agentId, abortRun: !1 });
        return n ? { status: `cleanup-rejected`, error: n } : { status: `cancelled` };
      }
      if (r?.state === `active`) return { status: `active`, placement: r };
      if (r && !xs.has(r.state)) {
        if (r.state === `failed`) {
          let n = await B(e, { key: t.key, agentId: t.agentId, abortRun: !1 });
          if (n) return { status: `cleanup-rejected`, error: n };
        }
        return { status: `rejected`, placement: r };
      }
    }
    await new Promise((e) => {
      globalThis.setTimeout(e, _s);
    });
  }
  if (!t.cleanupOnCancellation && !n()) return { status: `interrupted` };
  if (!n()) {
    let n = await B(e, { key: t.key, agentId: t.agentId, abortRun: !1 });
    return n ? { status: `cleanup-rejected`, error: n } : { status: `cancelled` };
  }
  return {
    status: `cleanup-rejected`,
    error: n()
      ? `session placement reconciliation timed out`
      : `session placement cleanup timed out`,
  };
}
async function ps(e, t, n) {
  if (!e) return `gateway unavailable during draft cleanup`;
  let r = await ds(e, t);
  if (r.status !== `missing`)
    return r.status === `rejected`
      ? r.error
      : r.status === `unavailable`
        ? `placement draft session could not be verified`
        : r.sessionId
          ? ms(e, { key: t, agentId: n, sessionId: r.sessionId })
          : `placement draft session identity is unavailable`;
}
async function ms(e, t) {
  try {
    await e.request(`sessions.patch`, {
      key: t.key,
      agentId: t.agentId,
      archived: !0,
      expectedSessionId: t.sessionId,
    });
  } catch (e) {
    return A(e);
  }
  try {
    if (
      (
        await e.request(`sessions.delete`, {
          key: t.key,
          agentId: t.agentId,
          deleteTranscript: !0,
          expectedSessionId: t.sessionId,
          archivedOnly: !0,
        })
      ).deleted !== !0
    )
      throw Error(`placement draft session was not deleted`);
    return;
  } catch (n) {
    let r = A(n);
    try {
      await e.request(`sessions.patch`, {
        key: t.key,
        agentId: t.agentId,
        archived: !1,
        expectedSessionId: t.sessionId,
      });
    } catch (e) {
      return `${r}; restoring the placement draft failed: ${A(e)}`;
    }
    return r;
  }
}
async function hs(e, t, n) {
  if (!e) return `gateway unavailable during draft cleanup`;
  let r = await ds(e, t);
  if (r.status !== `missing`) {
    if (r.status === `rejected`) return r.error;
    if (r.status === `unavailable`) return `session placement could not be verified`;
    if (r.placement) {
      let r = await B(e, { key: t, agentId: n, abortRun: !1 });
      if (r) return r;
    }
    return r.sessionId
      ? ms(e, { key: t, agentId: n, sessionId: r.sessionId })
      : `placement draft session identity is unavailable`;
  }
}
async function gs(e, t, n, r = () => !0) {
  let i = t.cleanupOnCancellation !== !1,
    a,
    o = ``;
  if (t.recovering) {
    let r = await ds(e, t.key);
    (r.status === `missing`
      ? (a = { status: `missing` })
      : r.status === `rejected`
        ? (a = { status: `cleanup-rejected`, error: r.error })
        : (r.status === `unavailable` || r.placement) &&
          (a = await fs(
            e,
            {
              key: t.key,
              agentId: t.agentId,
              initial: r.status === `read` ? r.placement : void 0,
              cleanupOnCancellation: i,
            },
            n,
          )),
      t.retryTerminalPlacement && a?.status === `rejected` && (a = void 0));
  }
  if (!a)
    try {
      let r = await e.request(
        `sessions.dispatch`,
        ls({ key: t.key, agentId: t.agentId, target: t.target }),
      );
      a = await fs(
        e,
        { key: t.key, agentId: t.agentId, initial: r.placement, cleanupOnCancellation: i },
        n,
      );
    } catch (r) {
      if (((o = A(r)), !i && !n())) return { status: `interrupted` };
      if (!us(r)) return { status: `dispatch-rejected`, error: o };
      a = await fs(e, { key: t.key, agentId: t.agentId, cleanupOnCancellation: i }, n);
    }
  if (!i && !n()) return { status: `interrupted` };
  if (a.status === `cancelled` || a.status === `interrupted` || a.status === `cleanup-rejected`)
    return a;
  if (a.status === `missing`)
    return { status: `session-missing`, error: `placement draft session no longer exists` };
  if (a.status === `rejected`) {
    let e = typeof a.placement?.state == `string` ? a.placement.state : ``;
    return { status: `dispatch-rejected`, error: o || (e ? `session placement became ${e}` : ``) };
  }
  if (!n()) {
    if (!i) return { status: `interrupted` };
    let n = await B(e, { key: t.key, agentId: t.agentId, abortRun: !1 });
    return n ? { status: `cleanup-rejected`, error: n } : { status: `cancelled` };
  }
  let s = t.messageId ?? de();
  if (!r()) {
    let n = await B(e, { key: t.key, agentId: t.agentId, abortRun: !1 });
    return n
      ? { status: `cleanup-rejected`, error: n }
      : { status: `send-not-started`, error: `placement recovery storage is unavailable` };
  }
  try {
    let r = await e.request(`sessions.send`, {
      key: t.key,
      agentId: t.agentId,
      message: t.message,
      attachments: t.attachments,
      idempotencyKey: s,
    });
    if (!n()) {
      if (!i) return { status: `interrupted` };
      let n = await B(e, { key: t.key, agentId: t.agentId, abortRun: !0 });
      return n ? { status: `cleanup-rejected`, error: n, messageId: s } : { status: `cancelled` };
    }
    let a = r?.messageSeq;
    return {
      status: `started`,
      messageId: s,
      ...(typeof a == `number` && Number.isSafeInteger(a) && a > 0 ? { messageSeq: a } : {}),
    };
  } catch (r) {
    if (!n()) {
      if (!i) return { status: `interrupted` };
      let n = await B(e, { key: t.key, agentId: t.agentId, abortRun: !0 });
      return n ? { status: `cleanup-rejected`, error: n, messageId: s } : { status: `cancelled` };
    }
    if (!us(r)) {
      let n = await B(e, { key: t.key, agentId: t.agentId, abortRun: !1 });
      return n
        ? { status: `cleanup-rejected`, error: n, messageId: s }
        : { status: `send-definitive-rejected`, error: A(r), messageId: s };
    }
    return { status: `send-rejected`, error: A(r), messageId: s };
  }
}
var _s, vs, ys, bs, xs;
function Ss() {
  return (Ss = e(() => {
    (vt(),
      T(),
      he(),
      (_s = 250),
      (vs = 1200),
      (ys = 4),
      (bs = 20),
      (xs = new Set([
        `requested`,
        `provisioning`,
        `syncing`,
        `starting`,
        `draining`,
        `reconciling`,
      ])));
  }))();
}
async function Cs(e) {
  let t = e.persistRecovery !== !1,
    n = e.recovery,
    r = () => e.isLifecycleCurrent() && e.ownsRecovery(),
    i = e.recovering && t ? ts(n.gatewayUrl, n.recoveryScope, n.sessionKey) : null;
  if (!r()) {
    if (!e.cleanupOnCancellation) return { status: `interrupted` };
    let r = t ? (e.recovering ? i?.sessionKey === n.sessionKey : rs(n)) : !1,
      a = e.recovering
        ? await hs(e.client, n.sessionKey, n.agentId)
        : await ps(e.client, n.sessionKey, n.agentId);
    return (
      a || e.clearRecovery(`resolved`),
      { status: `cancelled`, cleanupError: a, recoveryPersisted: a ? r : !1 }
    );
  }
  let a = t ? (e.recovering ? i?.sessionKey === n.sessionKey : ns(n)) : !0;
  if (!r() || !a) {
    if (!e.cleanupOnCancellation && !r()) return { status: `interrupted` };
    if (e.recovering && !a)
      return {
        status: `cancelled`,
        cleanupError: `placement recovery storage is unavailable`,
        recoveryPersisted: !1,
      };
    let t = e.recovering
      ? await hs(e.client, n.sessionKey, n.agentId)
      : await ps(e.client, n.sessionKey, n.agentId);
    return (
      t || e.clearRecovery(`resolved`),
      { status: `cancelled`, cleanupError: t, recoveryPersisted: a }
    );
  }
  let o = await gs(
    e.client,
    {
      key: n.sessionKey,
      agentId: n.agentId,
      target: n.target,
      message: n.message,
      attachments: n.attachments,
      messageId: n.messageId,
      recovering: e.recovering,
      retryTerminalPlacement: e.recovering && n.phase === `sending`,
      cleanupOnCancellation: e.cleanupOnCancellation,
    },
    r,
    () => {
      if (n.phase === `sending`) return !0;
      if (!t) return (e.setRecoveryPhase(`sending`, !1), !0);
      let r = ts(n.gatewayUrl, n.recoveryScope, n.sessionKey);
      if (r && r.messageId !== n.messageId) return !1;
      let i = ns({ ...n, phase: `sending` });
      return (i && e.setRecoveryPhase(`sending`, !0), i);
    },
  );
  if (!e.cleanupOnCancellation && !r()) return { status: `interrupted` };
  if (o.status === `interrupted`) return o;
  if (o.status === `cancelled`) {
    let r = await ps(e.client, n.sessionKey, n.agentId);
    return (
      r || e.clearRecovery(`resolved`),
      { status: `cancelled`, cleanupError: r, recoveryPersisted: t }
    );
  }
  return o.status === `cleanup-rejected`
    ? o
    : o.status === `send-not-started` ||
        o.status === `send-definitive-rejected` ||
        o.status === `session-missing` ||
        o.status === `dispatch-rejected`
      ? (e.clearRecovery(`resolved`), { status: `dispatch-rejected`, error: o.error })
      : o.status === `send-rejected`
        ? o
        : e.isLifecycleCurrent()
          ? e.ownsRecovery()
            ? (e.clearRecovery(`resolved`), o)
            : (e.clearRecovery(`resolved`), { status: `ownership-lost` })
          : (e.clearRecovery(`interrupted`), { status: `interrupted` });
}
function ws() {
  return (ws = e(() => {
    (cs(), Ss());
  }))();
}
function Ts(e) {
  return e.classList.contains(`hover-marquee`) ? e : e.querySelector(`.hover-marquee`);
}
function Es(e, t) {
  let n = e.clientWidth;
  for (let r = e.parentElement; r && r !== t; r = r.parentElement) {
    let e = getComputedStyle(r);
    if (e.overflowX !== `hidden` && e.overflowX !== `clip`) continue;
    let t = (Number.parseFloat(e.paddingLeft) || 0) + (Number.parseFloat(e.paddingRight) || 0);
    n = Math.min(n, Math.max(0, r.clientWidth - t));
  }
  return n;
}
function Ds(e) {
  let t = V.get(e);
  t !== void 0 &&
    (window.cancelAnimationFrame(t.frame),
    t.timer !== void 0 && window.clearTimeout(t.timer),
    V.delete(e));
}
function Os(e, t, n) {
  return `${e.toFixed(4)} ${((t / n) * 100).toFixed(4)}%`;
}
function ks(e, t) {
  let n = Array.from({ length: 33 }, (n, r) => {
    let i = r / Hs,
      a = 1 - i,
      o = 3 * a ** 2 * i,
      s = 3 * a * i ** 2,
      c = i ** 3;
    return Os(o * Us.y1 + s * Us.y2 + c, Vs + e * (o * Us.x1 + s * Us.x2 + c), t);
  });
  return `linear(${[Os(0, 0, t), ...n].join(`, `)})`;
}
function As(e) {
  let t = e.querySelector(`[data-hover-marquee-content]`);
  if (!t) return !1;
  let n = t.getBoundingClientRect().width,
    r = n > 0 ? n : t.scrollWidth,
    i = e.getBoundingClientRect().width,
    a = r - (i > 0 ? i : e.clientWidth);
  if (a <= 1) return (V.delete(e), !0);
  let o = getComputedStyle(t),
    s = Number.parseFloat(o.fontSize),
    c = Number.isFinite(s) ? s : zs,
    l = Number.parseFloat(o.getPropertyValue(`--marquee-speed-em-per-second`)),
    u = a / (c * (Number.isFinite(l) && l > 0 ? l : Bs)),
    d = Vs + u;
  return (
    e.style.setProperty(`--hover-marquee-shift`, `${-a}px`),
    e.style.setProperty(`--hover-marquee-duration`, `${d.toFixed(3)}s`),
    e.style.setProperty(`--hover-marquee-timing`, ks(u, d)),
    V.delete(e),
    e.classList.add(`hover-marquee--scrolling`),
    !0
  );
}
function js(e) {
  let t = Ts(e);
  if (!t || t.classList.contains(`hover-marquee--scrolling`) || V.has(t)) return;
  let n = {
    frame: window.requestAnimationFrame(() => {
      if (V.get(t) !== n || (t.dataset.hoverMarqueeMode === `codex` && As(t))) return;
      let r = Number.parseFloat(getComputedStyle(t).textIndent) || 0,
        i = t.scrollWidth - r - Es(t, e);
      if (i <= 1) {
        V.delete(t);
        return;
      }
      let a = Math.max(Ls, Math.round((i / Is) * 1e3));
      (t.style.setProperty(`--hover-marquee-shift`, `${-i}px`),
        t.style.setProperty(`--hover-marquee-duration`, `${a}ms`),
        (n.timer = window.setTimeout(() => {
          (V.delete(t), t.classList.add(`hover-marquee--scrolling`));
        }, Rs)));
    }),
  };
  V.set(t, n);
}
function Ms(e) {
  let t = Ts(e);
  t && (Ds(t), t.classList.remove(`hover-marquee--scrolling`));
}
function Ns(e) {
  e instanceof HTMLElement &&
    queueMicrotask(() => {
      let t = e.isConnected ? e.closest(`.session-row-host`) : void 0;
      t?.matches(`:hover`) && js(t);
    });
}
function Ps(e) {
  e.currentTarget instanceof HTMLElement && js(e.currentTarget);
}
function Fs(e) {
  e.currentTarget instanceof HTMLElement && Ms(e.currentTarget);
}
var Is, Ls, Rs, zs, Bs, Vs, Hs, Us, V;
function Ws() {
  return (Ws = e(() => {
    ((Is = 80),
      (Ls = 300),
      (Rs = 500),
      (zs = 13),
      (Bs = 2),
      (Vs = 0.35),
      (Hs = 32),
      (Us = { x1: 0.49, y1: 0.6, x2: 0.7, y2: 1 }),
      (V = new WeakMap()));
  }))();
}
function Gs(e) {
  return e === `none` || e === `person` ? e : `project`;
}
function Ks(e) {
  let t = [],
    n = [],
    r = new Map(),
    i = [];
  for (let a of e) {
    let e = a.customGroup?.trim();
    if (e) {
      let n = `custom:${e}`,
        i = r.get(n);
      (i ||
        ((i = { key: n, label: e, title: `Custom group: ${e}`, sessions: [] }),
        r.set(n, i),
        t.push(i)),
        i.sessions.push(a));
      continue;
    }
    let o = a.cwd?.trim().replace(/[\\/]+$/, ``);
    if (!o) {
      i.push(a);
      continue;
    }
    if (((o = o.match(/^(.*?)[\\/]\.claude[\\/]worktrees[\\/][^\\/]/)?.[1] ?? o), !o)) {
      i.push(a);
      continue;
    }
    let s = r.get(o);
    (s ||
      ((s = { key: o, label: o.split(/[\\/]/).at(-1) || o, title: o, sessions: [] }),
      r.set(o, s),
      n.push(s)),
      s.sessions.push(a));
  }
  return { groups: [...t, ...n], ungrouped: i };
}
function qs(e) {
  let t = new Map(),
    n = [];
  for (let r of e) {
    let e = r.createdActor;
    if (!e?.id) {
      n.push(r);
      continue;
    }
    let i = `person:${e.id}`,
      a = t.get(i);
    if (!a) {
      let n = e.label?.trim() || e.id;
      ((a = { key: i, label: n, title: `Created by ${n}`, sessions: [] }), t.set(i, a));
    }
    a.sessions.push(r);
  }
  return {
    groups: [...t.values()].toSorted((e, t) => e.label.localeCompare(t.label)),
    ungrouped: n,
  };
}
function Js() {
  return (Js = e(() => {}))();
}
function Ys(e, t) {
  (e.setData(ic, t), e.setData(`text/plain`, t), (e.effectAllowed = `copyMove`));
}
function Xs(e) {
  return e?.getData(`application/x-openclaw-session-key`).trim() || null;
}
function Zs(e) {
  return Array.from(e?.types ?? []).includes(ic);
}
function Qs(e, t) {
  (e.setData(ac, t), (e.effectAllowed = `move`));
}
function $s(e) {
  return e?.getData(ac).trim() || null;
}
function ec(e) {
  return Array.from(e?.types ?? []).includes(ac);
}
function tc(e, t) {
  (e.setData(oc, t), (e.effectAllowed = `move`));
}
function nc(e) {
  return e?.getData(oc).trim() || null;
}
function rc(e) {
  return Array.from(e?.types ?? []).includes(oc);
}
var ic, ac, oc;
function sc() {
  return (sc = e(() => {
    ((ic = `application/x-openclaw-session-key`),
      (ac = `application/x-openclaw-session-group`),
      (oc = `application/x-openclaw-sidebar-route`));
  }))();
}
function cc(e, t, n = []) {
  let r = [...new Set(t.map((e) => e.trim()).filter(Boolean))],
    i = new Set(r),
    a = [...new Set(n.map((e) => e.trim()).filter(Boolean))],
    o = new Set(a),
    s = (Ae(e) ?? []).filter((e) =>
      e.startsWith(`category:`)
        ? i.has(e.slice(9))
        : !e.startsWith(`catalog:`) || o.has(e.slice(8)),
    );
  for (let e of r) {
    let t = `category:${e}`;
    if (s.includes(t)) continue;
    let n = s.findIndex((e) => xc.includes(e));
    s.splice(n < 0 ? s.length : n, 0, t);
  }
  for (let [e, t] of xc.entries()) {
    if (s.includes(t)) continue;
    if (e === 0) {
      s.push(t);
      continue;
    }
    let n = xc[e - 1];
    s.splice(s.indexOf(n) + 1, 0, t);
  }
  let c = a.map((e) => `catalog:${e}`).filter((e) => !s.includes(e));
  return (s.splice(s.indexOf(`work`) + 1, 0, ...c), s);
}
function lc(e, t, n, r) {
  return Me(e, t, n, r);
}
function uc(e) {
  return yc.includes(e) ? e : `none`;
}
function dc(e, t) {
  if (typeof e != `number` || !Number.isFinite(e) || e <= 0) return ``;
  let n = new Date(t);
  n.setHours(0, 0, 0, 0);
  let r = 864e5;
  return e >= n.getTime()
    ? `today`
    : e >= n.getTime() - r
      ? `yesterday`
      : e >= n.getTime() - 6 * r
        ? `week`
        : `older`;
}
function fc(e) {
  return e.channel ?? Ne(e.key)?.channel ?? ``;
}
function pc(e, t, n) {
  switch (t) {
    case `category`:
      return e.category?.trim() ?? ``;
    case `person`:
      return e.owner?.actor.id?.trim() || ``;
    case `channel`:
      return fc(e);
    case `kind`:
      return e.kind;
    case `agent`:
      return ke(e.key)?.agentId ?? ``;
    case `date`:
      return dc(e.updatedAt, n);
    default:
      return ``;
  }
}
function mc(e) {
  let t = e.now ?? Date.now(),
    n = new Map();
  for (let r of e.rows) {
    let i = pc(r, e.mode, t),
      a = n.get(i);
    a ? a.push(r) : n.set(i, [r]);
  }
  return vc(e.mode, n, e.knownCategories ?? []).map((e) => ({ id: e, rows: n.get(e) ?? [] }));
}
function hc(e) {
  return e === `none` || e === `person` ? e : `category`;
}
function gc(e, t) {
  return t === `category` && e.pinned !== !0 && !!e.category?.trim() && e.kind === `group`;
}
function _c(e, t = {}) {
  let n = t.grouping ?? `category`,
    r = [],
    i = [],
    a = [],
    o = [],
    s = new Map(),
    c = new Map();
  if (n === `category`)
    for (let e of t.knownGroups ?? []) {
      let t = e.trim();
      t && !s.has(t) && s.set(t, []);
    }
  for (let t of e) {
    if (t.pinned === !0) {
      r.push(t);
      continue;
    }
    let e = n === `person` ? t.owner?.actor : void 0,
      l = e?.id?.trim();
    if (e && l) {
      let n = c.get(l);
      n
        ? n.rows.push(t)
        : c.set(l, {
            id: `person:${l}`,
            personOwner: {
              type: e.type,
              id: l,
              ...(e.label ? { label: e.label } : {}),
              ...(e.avatarUrl ? { avatarUrl: e.avatarUrl } : {}),
            },
            rows: [t],
          });
      continue;
    }
    let u = n === `category` ? t.category?.trim() : void 0;
    if (u) {
      let e = s.get(u);
      e ? e.push(t) : s.set(u, [t]);
      continue;
    }
    if (t.kind === `group`) {
      a.push(t);
      continue;
    }
    if (t.workSession === !0 || t.acpSession === !0) {
      o.push(t);
      continue;
    }
    i.push(t);
  }
  let l = [];
  (r.length > 0 && l.push({ id: `pinned`, rows: r }),
    l.push(
      ...[...c.values()].toSorted((e, n) => {
        let r = e.personOwner,
          i = n.personOwner;
        return (
          (r.id === t.selfOwnerId ? 0 : r.type === `agent` ? 2 : 1) -
            (i.id === t.selfOwnerId ? 0 : i.type === `agent` ? 2 : 1) ||
          (r.label || r.id).localeCompare(i.label || i.id) ||
          r.id.localeCompare(i.id)
        );
      }),
    ));
  let u = [...new Set((t.knownGroups ?? []).map((e) => e.trim()).filter(Boolean))],
    d = [
      ...u.filter((e) => s.has(e)),
      ...[...s.keys()].filter((e) => !u.includes(e)).toSorted((e, t) => e.localeCompare(t)),
    ],
    f = d.map((e) => ({ id: `category:${e}`, category: e, rows: s.get(e) ?? [] }));
  f.push({ id: `ungrouped`, rows: i });
  let p = e.some((e) => gc(e, n));
  ((a.length > 0 || p) && f.push({ id: `groups`, groups: !0, rows: a }),
    f.push({ id: `work`, work: !0, rows: o }));
  let m = [...new Set((t.catalogIds ?? []).map((e) => e.trim()).filter(Boolean))];
  if ((f.push(...m.map((e) => ({ id: `catalog:${e}`, rows: [] }))), t.sectionOrder)) {
    let e = new Map(f.map((e) => [e.id, e]));
    for (let n of cc(t.sectionOrder, d, m)) {
      let t = e.get(n);
      t && (l.push(t), e.delete(t.id));
    }
    return (l.push(...f.filter((t) => e.has(t.id))), l);
  }
  return (l.push(...f), l);
}
function vc(e, t, n) {
  if (e === `date`) return bc.filter((e) => t.has(e));
  if (e === `category`) {
    let e = [...new Set(n.map((e) => e.trim()).filter(Boolean))],
      r = [...t.keys()]
        .filter((t) => t !== `` && !e.includes(t))
        .toSorted((e, t) => e.localeCompare(t));
    return [...e, ...r, ``];
  }
  let r = [...t.keys()].filter((e) => e !== ``);
  return (r.sort((e, t) => e.localeCompare(t)), t.has(``) && r.push(``), r);
}
var yc, bc, xc;
function Sc() {
  return (Sc = e(() => {
    (me(),
      O(),
      (yc = [`none`, `category`, `person`, `channel`, `kind`, `agent`, `date`]),
      (bc = [`today`, `yesterday`, `week`, `older`, ``]),
      (xc = [`ungrouped`, `groups`, `work`]));
  }))();
}
function Cc(e, t = Oc) {
  let n = e.trim();
  if (!n) return { shouldSkip: !0, text: `` };
  let r = n
    .replace(/<[^>]*>/g, ` `)
    .replace(/&nbsp;/gi, ` `)
    .replace(/^[*`~_]+/, ``)
    .replace(/[*`~_]+$/, ``);
  if (!n.includes(Dc) && !r.includes(Dc)) return { shouldSkip: !1, text: n };
  let i = RegExp(`${wn(Dc)}[^\\w]{0,4}$`),
    a = !0,
    o = !1;
  for (n = r.trim(); a;) {
    a = !1;
    let e = n.trim();
    if (e.startsWith(Dc)) {
      ((n = e.slice(12).trimStart()), (o = !0), (a = !0));
      continue;
    }
    if (i.test(e)) {
      let t = e.lastIndexOf(Dc),
        r = e.slice(0, t).trimEnd(),
        i = e.slice(t + 12).trimStart();
      ((n = r ? `${r}${i}`.trimEnd() : ``), (o = !0), (a = !0));
    }
  }
  return o ? { shouldSkip: !n || n.length <= t, text: n } : { shouldSkip: !1, text: n };
}
function wc(e) {
  return e === `thinking` || e === `reasoning`;
}
function Tc(e) {
  if (typeof e == `string`) return { text: e, hasVisibleNonTextContent: !1 };
  if (!Array.isArray(e)) return { text: ``, hasVisibleNonTextContent: e != null };
  let t = !1;
  return {
    text: e
      .filter((e) =>
        !e || typeof e != `object` || !(`type` in e)
          ? ((t = !0), !1)
          : e.type === `text`
            ? typeof e.text == `string` || ((t = !0), !1)
            : (wc(e.type) || (t = !0), !1),
      )
      .map((e) => e.text)
      .join(``),
    hasVisibleNonTextContent: t,
  };
}
function Ec(e) {
  if (!e || typeof e != `object`) return !1;
  let t = e;
  if (l(t.role) !== `assistant` || (typeof t.senderLabel == `string` && t.senderLabel.trim()))
    return !1;
  let { text: n, hasVisibleNonTextContent: r } = Tc(
    typeof t.content == `string` || Array.isArray(t.content) ? t.content : t.text,
  );
  return !r && Cc(n).shouldSkip;
}
var Dc, Oc;
function kc() {
  return (kc = e(() => {
    ((Dc = `HEARTBEAT_OK`), (Oc = 300));
  }))();
}
function Ac(e) {
  return Tn(e);
}
function jc() {
  return (jc = e(() => {
    gn();
  }))();
}
function Mc(e, t) {
  return (
    e === `text` ||
    (t === `user` && e === `input_text`) ||
    (t === `assistant` && (e === `input_text` || e === `output_text`))
  );
}
function Nc(e, t) {
  let n = l(t) === `user`,
    r = Vn(e);
  return t === `assistant` ? Ac(r) : n ? jn(_n(r)) : _n(r);
}
function Pc(e) {
  if (e == null) return null;
  let t = e,
    n = typeof t.role == `string` ? t.role : ``,
    r = n === `assistant` ? hn(e) : Rc(e);
  return r ? Nc(r, n) : null;
}
function Fc(e) {
  if (!e || typeof e != `object`) return Pc(e);
  let t = e;
  if (Uc.has(t)) return Uc.get(t) ?? null;
  let n = Pc(e);
  return (Uc.set(t, n), n);
}
function Ic(e) {
  if (e == null) return null;
  let t = e.content,
    n = [];
  if (Array.isArray(t))
    for (let e of t) {
      let t = e;
      if (t.type === `thinking` && typeof t.thinking == `string`) {
        let e = t.thinking.trim();
        e && n.push(e);
      }
    }
  return n.length > 0
    ? n.join(`
`)
    : null;
}
function Lc(e) {
  if (!e || typeof e != `object`) return Ic(e);
  let t = e;
  if (Wc.has(t)) return Wc.get(t) ?? null;
  let n = Ic(e);
  return (Wc.set(t, n), n);
}
function Rc(e) {
  if (e == null) return null;
  let t = e,
    n = l(t.role),
    r = t.content;
  if (typeof r == `string`) return r;
  if (Array.isArray(r)) {
    let e = r
      .map((e) => {
        let t = e;
        return Mc(t.type, n) && typeof t.text == `string` ? t.text : null;
      })
      .filter((e) => typeof e == `string`);
    if (e.length > 0)
      return e.join(`
`);
  }
  return typeof t.text == `string` ? t.text : null;
}
function zc(e) {
  return !e || typeof e != `object`
    ? []
    : (Sn(e) ?? []).flatMap((e) => {
        let t = e.path ?? e.url;
        return t ? [{ path: t, mediaType: e.contentType ?? e.kind, fileName: e.fileName }] : [];
      });
}
function Bc(e) {
  let t = e.trim();
  if (!t) return ``;
  let n = t
    .split(/\r?\n/)
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => `_${e}_`);
  return n.length
    ? [`_Reasoning:_`, ...n].join(`
`)
    : ``;
}
function Vc(e) {
  if (typeof e == `string`) return !0;
  if (!Array.isArray(e)) return !1;
  if (e.length === 0) return !0;
  let t = !1;
  for (let n of e) {
    if (!n || typeof n != `object`) return !1;
    let e = n;
    if (e.type !== `text` || ((t = !0), typeof e.text != `string`)) return !1;
  }
  return t;
}
function Hc(e) {
  if (!e || typeof e != `object`) return !1;
  let t = e;
  return l(t.role) !== `user` || zc(t).length > 0 || !Vc(t.content ?? t.text)
    ? !1
    : (Pc(e)?.trim() ?? ``) === ``;
}
var Uc, Wc;
function Gc() {
  return (Gc = e(() => {
    (En(), Mn(), fn(), xn(), bn(), jc(), (Uc = new WeakMap()), (Wc = new WeakMap()));
  }))();
}
function Kc(e, t) {
  return t
    ? {
        sessionKey: e,
        ...(t.agentId ? { agentId: t.agentId } : {}),
        runId: t.runId,
        revision: t.revision,
        updatedAt: t.updatedAt,
        headline: t.headline,
        health: t.health,
      }
    : null;
}
function qc(e) {
  return e === `stuck` || e === `waiting-on-user`;
}
function Jc(e) {
  return e.localRunId
    ? e.localRunId
    : !e.session?.hasActiveRun || !e.digest?.runId
      ? null
      : e.session.activeRunIds?.includes(e.digest.runId)
        ? e.digest.runId
        : null;
}
function Yc(e, t) {
  return e
    ? t
      ? e.revision === t.revision
        ? e.updatedAt >= t.updatedAt
          ? e
          : t
        : e.revision > t.revision
          ? e
          : t
      : e
    : (t ?? null);
}
function Xc() {
  return (Xc = e(() => {}))();
}
function Zc(e) {
  if (!bt(Ct, e)) return null;
  let t = e.id.trim(),
    n = e.taskId?.trim() || t;
  return !t || !n ? null : { ...e, id: t, taskId: n };
}
function Qc() {
  return (Qc = e(() => {
    (Mt(), kt());
  }))();
}
var $c;
function el() {
  return (el = e(() => {
    (T(),
      ($c = class {
        constructor() {
          this.entries = new Map();
        }
        clear() {
          this.entries.clear();
        }
        prune(e) {
          let t = new Set(e.filter((e) => e.contentKind === `mcp-app`).map((e) => this.key(e)));
          for (let e of this.entries.keys()) t.has(e) || this.entries.delete(e);
        }
        async resolve(e, t, n) {
          let r = this.key(e);
          n && this.entries.delete(r);
          let i = this.entries.get(r);
          if (i) return await i;
          let a = t()
            .then((e) => ({ status: `ready`, ...e }))
            .catch((e) => ({ status: `stale`, error: A(e) }));
          this.entries.set(r, a);
          let o = await a;
          return (this.entries.get(r) === a && this.entries.set(r, o), o);
        }
        key(e) {
          return `${e.name}\0${e.revision}\0${e.instanceId ?? ``}\0${e.grantState}`;
        }
      }));
  }))();
}
function tl(e) {
  return { sessionKey: e, revision: 0, tabs: [], widgets: [] };
}
function nl(e) {
  let t = e?.trim() ?? ``;
  return t ? Array.from(t).slice(0, 80).join(``) : void 0;
}
var rl, il;
function al() {
  return (al = e(() => {
    ((rl = class {
      constructor(e) {
        ((this.value = e), (this.listeners = new Set()));
      }
      subscribe(e) {
        return (this.listeners.add(e), () => this.listeners.delete(e));
      }
      set(e) {
        this.value = e;
        for (let e of this.listeners) e();
      }
    }),
      (il = class {
        constructor() {
          this.listeners = new Set();
        }
        subscribe(e) {
          return (this.listeners.add(e), () => this.listeners.delete(e));
        }
        emit(e) {
          for (let t of this.listeners) t(e);
        }
      }));
  }))();
}
function ol(e) {
  let t = 14695981039346656037n;
  for (let n of new TextEncoder().encode(e))
    ((t ^= BigInt(n)), (t = BigInt.asUintN(64, t * 1099511628211n)));
  return t.toString(16).padStart(16, `0`);
}
function sl(e) {
  let t = `canvas-${e.toLowerCase().replace(/[^a-z0-9._-]/gu, `-`)}`;
  return t === `canvas-${e}` && t.length <= 64
    ? t
    : `${t.slice(0, 47).replace(/[._-]+$/gu, ``) || `canvas-widget`}-${ol(e)}`;
}
function cl(e) {
  return `mcp-app-${ol(e)}`;
}
function ll() {
  return (ll = e(() => {}))();
}
function ul(e, t = Date.now()) {
  e.viewTicket && e.viewTicketTtlMs && pl.set(e, t);
}
function dl(e, t, n = Date.now()) {
  e.viewTicket && e.viewTicketTtlMs && pl.set(e, pl.get(t) ?? n);
}
function fl(e, t = Date.now()) {
  let n = e.viewTicketTtlMs;
  if (!e.viewTicket || !n) return;
  let r = pl.get(e);
  return r === void 0 ? n : Math.max(0, n - (t - r));
}
var pl;
function ml() {
  return (ml = e(() => {
    pl = new WeakMap();
  }))();
}
function hl(e, t) {
  return {
    ...e,
    ...(t.frameUrl === void 0 ? {} : { frameUrl: t.frameUrl }),
    ...(t.viewTicket === void 0 ? {} : { viewTicket: t.viewTicket }),
    ...(t.viewTicketTtlMs === void 0 ? {} : { viewTicketTtlMs: t.viewTicketTtlMs }),
    ...(t.viewGeneration === void 0 ? {} : { viewGeneration: t.viewGeneration }),
    ...(t.sandboxUrl === void 0 ? {} : { sandboxUrl: t.sandboxUrl }),
    ...(t.sandboxPort === void 0 ? {} : { sandboxPort: t.sandboxPort }),
    ...(t.sandboxOrigin === void 0 ? {} : { sandboxOrigin: t.sandboxOrigin }),
  };
}
var gl;
function _l() {
  return (_l = e(() => {
    (T(),
      O(),
      el(),
      al(),
      ml(),
      (gl = class {
        constructor(e, t, n = !0, r = !0, i = !1, a = !0, o = !0) {
          ((this.sessionKey = e),
            (this.canPinWidgets = r),
            (this.canPinMcpApps = i),
            (this.canMutate = a),
            (this.canGrant = o),
            (this.loadErrorSignal = new rl(null)),
            (this.eventStream = new il()),
            (this.retiredClients = new WeakSet()),
            (this.clientGeneration = 0),
            (this.refreshRequested = !1),
            (this.userRefreshRequested = !1),
            (this.changedWidgets = new Set()),
            (this.stateGeneration = 0),
            (this.connected = !1),
            (this.appViews = new $c()),
            (this.disposed = !1),
            (this.snapshotLoaded = !1),
            (this.snapshotSignal = new rl(tl(e))),
            (this.snapshot$ = this.snapshotSignal),
            (this.loadError$ = this.loadErrorSignal),
            (this.events = this.eventStream),
            (this.client = t),
            (this.connected = n),
            this.subscribe(t),
            n && this.activate());
        }
        attachClient(e, t = !0) {
          if (this.disposed || (e !== this.client && this.retiredClients.has(e))) return;
          let n = t && !this.connected;
          if (((this.connected = t), t || this.wakeRetryDelay?.(), e === this.client)) {
            n && this.activate();
            return;
          }
          (this.retiredClients.add(this.client),
            this.unsubscribe?.(),
            (this.client = e),
            (this.clientGeneration += 1),
            (this.stateGeneration += 1),
            this.changedWidgets.clear(),
            this.appViews.clear(),
            (this.snapshotLoaded = !1),
            this.setLoadError(null),
            this.snapshotSignal.set(tl(this.sessionKey)),
            this.subscribe(e),
            t && this.activate());
        }
        activate() {
          return this.requestRefresh();
        }
        get hasLoadedSnapshot() {
          return this.snapshotLoaded;
        }
        dispose() {
          this.disposed ||
            ((this.disposed = !0),
            (this.connected = !1),
            this.unsubscribe?.(),
            (this.unsubscribe = void 0),
            (this.clientGeneration += 1),
            (this.stateGeneration += 1),
            (this.refreshRequested = !1),
            (this.userRefreshRequested = !1),
            this.changedWidgets.clear(),
            this.appViews.clear(),
            this.wakeRetryDelay?.());
        }
        async applyOps(e) {
          await this.mutate(`board.update`, { sessionKey: this.sessionKey, ops: e });
        }
        async grant(e, t) {
          let n = this.snapshotSignal.value.widgets.find((t) => t.name === e);
          if (!n) throw (this.requestRefresh(), Error(`Dashboard widget not found: ${e}`));
          await this.mutate(`board.widget.grant`, {
            sessionKey: this.sessionKey,
            name: e,
            decision: t,
            revision: n.revision,
            ...(n.instanceId ? { instanceId: n.instanceId } : {}),
          });
        }
        pinWidget(e) {
          return this.pinBoardWidget(e, e.name ?? sl(e.docId), {
            kind: `canvas-doc`,
            docId: e.docId,
          });
        }
        pinMcpApp(e) {
          return this.pinBoardWidget(e, e.name ?? cl(e.viewId), {
            kind: `mcp-app`,
            viewId: e.viewId,
          });
        }
        async pinBoardWidget(e, t, n) {
          let r = nl(e.title);
          await this.mutate(
            `board.widget.put`,
            {
              sessionKey: this.sessionKey,
              name: t,
              ...(r ? { title: r } : {}),
              content: n,
              ...(e.tabId || e.size || e.after
                ? {
                    placement: {
                      ...(e.tabId ? { tabId: e.tabId } : {}),
                      ...(e.size ? { size: e.size } : {}),
                      ...(e.after ? { after: e.after } : {}),
                    },
                  }
                : {}),
            },
            t,
          );
        }
        widgetFrameUrl(e, t) {
          return (
            this.snapshotSignal.value.widgets.find((n) => n.name === e && n.revision === t)
              ?.frameUrl ?? ``
          );
        }
        refreshWidgetFrame(e) {
          return this.requestRefresh(e, !0);
        }
        async widgetAppView(e, t) {
          return await this.resolveWidgetAppView(e, t, !1);
        }
        async refreshWidgetAppView(e, t) {
          return await this.resolveWidgetAppView(e, t, !0);
        }
        async resolveWidgetAppView(e, t, n) {
          let r = this.snapshotSignal.value.widgets.find(
            (n) => n.name === e && n.revision === t && n.contentKind === `mcp-app`,
          );
          if (!r) return { status: `stale`, error: `Dashboard MCP App widget unavailable` };
          let i = this.client;
          return await this.appViews.resolve(
            r,
            async () =>
              await i.request(`board.widget.appView`, {
                sessionKey: this.sessionKey,
                name: e,
                revision: t,
                ...(r.instanceId ? { instanceId: r.instanceId } : {}),
              }),
            n,
          );
        }
        subscribe(e) {
          this.unsubscribe = e.addEventListener((t) => {
            if (!(this.disposed || e !== this.client)) {
              if (t.event === `board.changed`) {
                let e = t.payload;
                e &&
                  this.matchesSession(e.sessionKey) &&
                  ((this.stateGeneration += 1), this.requestRefresh(e.widget));
                return;
              }
              if (t.event === `board.command`) {
                let e = t.payload;
                e?.command &&
                  this.matchesSession(e.sessionKey) &&
                  this.eventStream.emit({ sessionKey: this.sessionKey, command: e.command });
              }
            }
          });
        }
        matchesSession(e) {
          return typeof e == `string` && je(e) === je(this.sessionKey);
        }
        requestRefresh(e, t = !1) {
          return this.disposed
            ? Promise.resolve()
            : ((this.refreshRequested = !0),
              (this.userRefreshRequested ||= t),
              e && this.changedWidgets.add(e),
              this.wakeRetryDelay?.(),
              (this.refreshLoop ??= this.runRefreshLoop().finally(() => {
                ((this.refreshLoop = void 0),
                  this.refreshRequested &&
                    (this.connected || this.userRefreshRequested) &&
                    this.requestRefresh());
              })),
              this.refreshLoop);
        }
        async runRefreshLoop() {
          let e = { delayMs: 1e3 };
          for (; this.refreshRequested;) {
            if (this.disposed) {
              this.refreshRequested = !1;
              return;
            }
            if (!this.connected && !this.userRefreshRequested) return;
            this.userRefreshRequested = !1;
            let t = new Set(this.changedWidgets);
            this.changedWidgets.clear();
            let n = this.client,
              r = this.stateGeneration;
            try {
              let i = await n.request(`board.get`, { sessionKey: this.sessionKey });
              if (this.disposed) return;
              if (n !== this.client) {
                this.refreshRequested = !0;
                continue;
              }
              if (((this.userRefreshRequested = !1), r !== this.stateGeneration)) {
                this.refreshRequested = !0;
                for (let e of t) this.changedWidgets.add(e);
                continue;
              }
              for (let e of this.changedWidgets) t.add(e);
              (this.changedWidgets.clear(),
                (this.refreshRequested = !1),
                this.setSnapshot(i, t),
                (e.delayMs = 1e3));
            } catch (r) {
              if (this.disposed) return;
              if (((this.refreshRequested = !0), n !== this.client)) continue;
              this.setLoadError(A(r));
              for (let e of t) this.changedWidgets.add(e);
              if (!this.connected) {
                if (this.userRefreshRequested) continue;
                return;
              }
              let i = e.delayMs;
              ((e.delayMs = Math.min(i * 2, 3e4)), await this.waitForRetry(i));
              continue;
            }
          }
        }
        waitForRetry(e) {
          return new Promise((t) => {
            let n,
              r = () => {
                n &&
                  (clearTimeout(n),
                  (n = void 0),
                  this.wakeRetryDelay === r && (this.wakeRetryDelay = void 0),
                  t());
              };
            ((n = setTimeout(r, e)), (this.wakeRetryDelay = r));
          });
        }
        async mutate(e, t, n) {
          if (this.disposed) throw Error(`Session dashboard provider is no longer active`);
          let r = this.client,
            i = this.clientGeneration,
            a = ++this.stateGeneration;
          try {
            let o = await r.request(e, t);
            !this.disposed &&
              r === this.client &&
              i === this.clientGeneration &&
              a === this.stateGeneration &&
              ((this.stateGeneration += 1), this.setSnapshot(o, n ? new Set([n]) : new Set(), !0));
          } catch (e) {
            throw (
              !this.disposed &&
                r === this.client &&
                i === this.clientGeneration &&
                a === this.stateGeneration &&
                this.requestRefresh(),
              e
            );
          }
        }
        setSnapshot(e, t = new Set(), n = !1) {
          let r = Date.now(),
            i = new Map(this.snapshotSignal.value.widgets.map((e) => [e.name, e])),
            a = e.widgets.map((e) => {
              let a = i.get(e.name);
              if (
                n &&
                a &&
                !t.has(e.name) &&
                a.revision === e.revision &&
                a.instanceId === e.instanceId &&
                e.viewGeneration === void 0
              ) {
                let t = hl(e, a);
                return (dl(t, a, r), t);
              }
              if (
                a &&
                !t.has(e.name) &&
                a.revision === e.revision &&
                a.instanceId === e.instanceId &&
                a.viewGeneration === e.viewGeneration &&
                !e.sandboxUrl &&
                a.frameUrl
              ) {
                let t = { ...e, frameUrl: a.frameUrl };
                return (ul(t, r), t);
              }
              return (ul(e, r), e);
            });
          (this.appViews.prune(a),
            (this.snapshotLoaded = !0),
            this.snapshotSignal.set({ ...e, widgets: a }),
            this.setLoadError(null));
        }
        setLoadError(e) {
          this.loadErrorSignal.value !== e && this.loadErrorSignal.set(e);
        }
      }));
  }))();
}
function vl(e) {
  let t = e.tabs
      .toSorted((e, t) => e.position - t.position)
      .map((e, t) => Object.assign({}, e, { position: t })),
    n = new Map(t.map((e) => [e.tabId, e.position])),
    r = new Map(),
    i = e.widgets
      .toSorted(
        (e, t) =>
          (n.get(e.tabId) ?? 2 ** 53 - 1) - (n.get(t.tabId) ?? 2 ** 53 - 1) ||
          e.position - t.position,
      )
      .map((e) => {
        let t = r.get(e.tabId) ?? 0;
        return (r.set(e.tabId, t + 1), Object.assign({}, e, { position: t }));
      });
  return { ...e, tabs: t, widgets: i };
}
function yl(e, t) {
  switch (t.kind) {
    case `tab_create`:
      return e.tabs.some((e) => e.tabId === t.tabId)
        ? e
        : {
            ...e,
            tabs: [
              ...e.tabs,
              {
                tabId: t.tabId,
                title: t.title,
                position: e.tabs.length,
                chatDock: t.chatDock ?? `right`,
              },
            ],
          };
    case `tab_update`: {
      let n = e.tabs.toSorted((e, t) => e.position - t.position),
        r = n.findIndex((e) => e.tabId === t.tabId);
      if (r < 0) return e;
      let [i] = n.splice(r, 1),
        a = {
          ...i,
          ...(t.title === void 0 ? {} : { title: t.title }),
          ...(t.chatDock === void 0 ? {} : { chatDock: t.chatDock }),
        },
        o = Math.max(0, Math.min(t.position === void 0 ? r : Math.trunc(t.position), n.length));
      return (
        n.splice(o, 0, a), { ...e, tabs: n.map((e, t) => Object.assign({}, e, { position: t })) }
      );
    }
    case `tab_delete`: {
      let n = e.tabs.filter((e) => e.tabId !== t.tabId);
      if (n.length === 0 && e.widgets.length > 0) return e;
      let r = n[0]?.tabId;
      return {
        ...e,
        tabs: n,
        widgets: e.widgets.map((e) =>
          e.tabId === t.tabId && r ? { ...e, tabId: r, position: 2 ** 53 - 1 } : e,
        ),
      };
    }
    case `tabs_reorder`: {
      let n = new Set(t.tabIds);
      return t.tabIds.length !== e.tabs.length ||
        n.size !== e.tabs.length ||
        e.tabs.some((e) => !n.has(e.tabId))
        ? e
        : {
            ...e,
            tabs: t.tabIds.flatMap((t, n) => {
              let r = e.tabs.find((e) => e.tabId === t);
              return r ? [{ ...r, position: n }] : [];
            }),
          };
    }
    case `widget_move`: {
      let n = e.widgets.find((e) => e.name === t.name),
        r = t.after ? e.widgets.find((e) => e.name === t.after) : void 0;
      if (!n || (t.after && (!r || r.name === n.name))) return e;
      let i = t.tabId ?? n.tabId;
      if (
        (t.position !== void 0 && t.after !== void 0) ||
        !e.tabs.some((e) => e.tabId === i) ||
        (r && r.tabId !== i)
      )
        return e;
      let a = e.widgets.filter((e) => e.name !== n.name),
        o = a.filter((e) => e.tabId === i).toSorted((e, t) => e.position - t.position),
        s = r ? o.findIndex((e) => e.name === r.name) : -1,
        c = r ? s + 1 : Math.max(0, Math.min(t.position ?? o.length, o.length));
      return (
        o.splice(c, 0, { ...n, tabId: i }),
        {
          ...e,
          widgets: e.tabs.flatMap((e) =>
            (e.tabId === i
              ? o
              : a.filter((t) => t.tabId === e.tabId).toSorted((e, t) => e.position - t.position)
            ).map((e, t) => Object.assign({}, e, { position: t })),
          ),
        }
      );
    }
    case `widget_resize`:
      return {
        ...e,
        widgets: e.widgets.map((e) =>
          e.name === t.name
            ? {
                ...e,
                sizeW: Math.min(12, Math.max(1, Math.trunc(t.sizeW))),
                sizeH: Math.min(20, Math.max(1, Math.trunc(t.sizeH))),
                heightMode: t.heightMode ?? `fixed`,
              }
            : e,
        ),
      };
    case `widget_remove`:
      return { ...e, widgets: e.widgets.filter((e) => e.name !== t.name) };
  }
  return e;
}
function bl(e) {
  return {
    sessionKey: e,
    revision: 1,
    tabs: [
      { tabId: `main`, title: j(`chat.board.mockOverview`), position: 0, chatDock: `right` },
      { tabId: `research`, title: j(`chat.board.mockResearch`), position: 1, chatDock: `bottom` },
    ],
    widgets: [
      {
        name: `session-status`,
        tabId: `main`,
        title: j(`chat.board.mockSessionStatus`),
        contentKind: `html`,
        sizeW: 4,
        sizeH: 3,
        position: 0,
        grantState: `granted`,
        revision: 1,
      },
      {
        name: `recent-findings`,
        tabId: `main`,
        title: j(`chat.board.mockRecentFindings`),
        contentKind: `mcp-app`,
        sizeW: 8,
        sizeH: 6,
        position: 1,
        grantState: `pending`,
        revision: 1,
      },
      {
        name: `source-map`,
        tabId: `research`,
        title: j(`chat.board.mockSourceMap`),
        contentKind: `html`,
        sizeW: 12,
        sizeH: 8,
        position: 0,
        grantState: `none`,
        revision: 1,
      },
    ],
  };
}
function xl(e) {
  return e.tabs.length > 0 || e.widgets.length > 0;
}
function Sl() {
  let e = globalThis.location;
  return new URLSearchParams(e?.search ?? ``).get(`mockBoard`) === `1` ? e : null;
}
function Cl() {
  return Sl() !== null;
}
function wl(e) {
  return /^agent:[^:]+:[^:]+$/u.test(e);
}
function Tl(e) {
  let t = je(e);
  return t === `main` ? w({ agentId: `main` }) : t;
}
function El(e, t = !0) {
  let n = Tl(e),
    r = Sl();
  if (r && wl(n)) {
    r !== Ll && (Il.clear(), (Ll = r));
    let e = Il.get(n);
    return (e || ((e = new Nl(n)), Il.set(n, e)), e);
  }
  let i = t ? H.get(n)?.provider : void 0;
  if (i) return i;
  let a = Fl.get(n);
  return (a || ((a = new Ml(n)), Fl.set(n, a)), a);
}
function Dl(e, t, n = !0, r = !0, i = !1, a = !0, o = !0) {
  let s = Tl(e),
    c = El(s);
  if (c instanceof Nl) return { provider: c, update: () => void 0, release: () => void 0 };
  let l = H.get(s);
  l
    ? l.provider.attachClient(t, n)
    : ((l = { provider: new gl(s, t, n), consumers: 0 }), H.set(s, l));
  let u = new Pl(l.provider, { canPinWidgets: r, canPinMcpApps: i, canMutate: a, canGrant: o });
  l.consumers += 1;
  let d = !1;
  return {
    provider: u,
    update: (e, t, n) => {
      d ||
        H.get(s)?.provider !== l.provider ||
        (u.updateCapabilities(n), l.provider.attachClient(e, t));
    },
    release: () => {
      if (d) return;
      ((d = !0), u.deactivate());
      let e = H.get(s);
      !e ||
        e.provider !== l.provider ||
        (--e.consumers,
        !(e.consumers > 0) &&
          (e.provider.hasLoadedSnapshot && U.set(s, xl(e.provider.snapshot$.value)),
          H.delete(s),
          e.provider.dispose()));
    },
  };
}
function Ol(e) {
  return e instanceof gl || e instanceof Pl ? e.hasLoadedSnapshot : !0;
}
function kl(e, t) {
  let n = Tl(e),
    r = U.get(n);
  return (U.set(n, t), r !== t);
}
function Al() {
  let e = U.size > 0;
  return (U.clear(), e);
}
function jl(e) {
  let t = Tl(e),
    n = H.get(t)?.provider ?? Il.get(t);
  return n instanceof gl && !n.hasLoadedSnapshot
    ? (U.get(t) ?? !1)
    : n
      ? xl(n.snapshot$.value)
      : (U.get(t) ?? !1);
}
var Ml, Nl, Pl, Fl, Il, H, U, Ll;
function Rl() {
  return (Rl = e(() => {
    (M(),
      O(),
      _l(),
      al(),
      (Ml = class {
        constructor(e = ``) {
          ((this.sessionKey = e),
            (this.canMutate = !1),
            (this.canGrant = !1),
            (this.canPinWidgets = !1),
            (this.canPinMcpApps = !1),
            (this.loadError$ = new rl(null)),
            (this.events = new il()),
            (this.snapshot$ = new rl(tl(e))));
        }
        async applyOps(e) {}
        async grant(e, t) {}
        async pinWidget(e) {
          throw Error(`Session dashboard unavailable`);
        }
        async pinMcpApp(e) {
          throw Error(`Session dashboard unavailable`);
        }
        widgetFrameUrl(e, t) {
          return ``;
        }
        async refreshWidgetFrame(e) {}
        async widgetAppView(e, t) {
          return { status: `stale`, error: `Session dashboard unavailable` };
        }
        async refreshWidgetAppView(e, t) {
          return { status: `stale`, error: `Session dashboard unavailable` };
        }
      }),
      (Nl = class {
        constructor(e) {
          ((this.sessionKey = e),
            (this.canMutate = !0),
            (this.canGrant = !0),
            (this.canPinWidgets = !0),
            (this.canPinMcpApps = !0),
            (this.loadError$ = new rl(null)),
            (this.eventStream = new il()),
            (this.snapshotSignal = new rl(bl(e))),
            (this.snapshot$ = this.snapshotSignal),
            (this.events = this.eventStream));
        }
        async applyOps(e) {
          let t = this.snapshotSignal.value;
          for (let n of e) t = vl(yl(t, n));
          this.snapshotSignal.set({ ...t, revision: t.revision + 1 });
        }
        async grant(e, t) {
          let n = this.snapshotSignal.value,
            r = n.widgets.slice(),
            i = r.findIndex((t) => t.name === e),
            a = r[i];
          (a && (r[i] = { ...a, grantState: t }),
            this.snapshotSignal.set({ ...n, revision: n.revision + 1, widgets: r }));
        }
        async pinWidget(e) {
          let t = e.name ?? sl(e.docId);
          this.pinMockBoardWidget(e, t, `html`);
        }
        async pinMcpApp(e) {
          let t = e.name ?? cl(e.viewId);
          this.pinMockBoardWidget(e, t, `mcp-app`);
        }
        pinMockBoardWidget(e, t, n) {
          let r = this.snapshotSignal.value,
            i = nl(e.title),
            a = e.tabId ?? r.tabs[0]?.tabId ?? `main`,
            o = r.tabs.length
              ? r.tabs
              : [
                  {
                    tabId: `main`,
                    title: j(`chat.board.defaultTab`),
                    position: 0,
                    chatDock: `right`,
                  },
                ],
            s = r.widgets.find((e) => e.name === t),
            c = r.widgets.filter((e) => e.name !== t);
          (c.push({
            name: t,
            tabId: a,
            ...(i ? { title: i } : {}),
            contentKind: n,
            sizeW: s?.sizeW ?? 6,
            sizeH: s?.sizeH ?? 4,
            position: s?.position ?? c.filter((e) => e.tabId === a).length,
            grantState: `none`,
            revision: (s?.revision ?? 0) + 1,
            ...(n === `html`
              ? { frameUrl: `about:blank#board-widget=${encodeURIComponent(t)}` }
              : {}),
          }),
            this.snapshotSignal.set(vl({ ...r, revision: r.revision + 1, tabs: o, widgets: c })));
        }
        widgetFrameUrl(e, t) {
          return (
            this.snapshotSignal.value.widgets.find((n) => n.name === e && n.revision === t)
              ?.frameUrl ?? `about:blank#board-widget=${encodeURIComponent(e)}&revision=${t}`
          );
        }
        async refreshWidgetFrame(e) {}
        async widgetAppView(e, t) {
          return { status: `stale`, error: `MCP App mock view unavailable` };
        }
        async refreshWidgetAppView(e, t) {
          return await this.widgetAppView(e, t);
        }
        emitCommand(e) {
          this.eventStream.emit({ sessionKey: this.sessionKey, command: e });
        }
      }),
      (Pl = class {
        constructor(e, t) {
          ((this.transport = e),
            (this.capabilities = t),
            (this.active = !0),
            (this.loadError$ = e.loadError$),
            (this.snapshot$ = e.snapshot$),
            (this.events = e.events));
        }
        get sessionKey() {
          return this.transport.sessionKey;
        }
        get canPinWidgets() {
          return this.active && this.capabilities.canPinWidgets;
        }
        get canPinMcpApps() {
          return this.active && this.capabilities.canPinMcpApps;
        }
        get canMutate() {
          return this.active && this.capabilities.canMutate;
        }
        get canGrant() {
          return this.active && this.capabilities.canGrant;
        }
        get hasLoadedSnapshot() {
          return this.transport.hasLoadedSnapshot;
        }
        updateCapabilities(e) {
          this.active && (this.capabilities = e);
        }
        deactivate() {
          this.active = !1;
        }
        async applyOps(e) {
          if (!this.canMutate) throw Error(`Session dashboard mutation unavailable`);
          await this.transport.applyOps(e);
        }
        async grant(e, t) {
          if (!this.canGrant) throw Error(`Session dashboard approval unavailable`);
          await this.transport.grant(e, t);
        }
        async pinWidget(e) {
          if (!this.canMutate || !this.canPinWidgets)
            throw Error(`Session dashboard widget pinning unavailable`);
          await this.transport.pinWidget(e);
        }
        async pinMcpApp(e) {
          if (!this.canMutate || !this.canPinMcpApps)
            throw Error(`Session dashboard MCP App pinning unavailable`);
          await this.transport.pinMcpApp(e);
        }
        widgetFrameUrl(e, t) {
          return this.transport.widgetFrameUrl(e, t);
        }
        refreshWidgetFrame(e) {
          return this.transport.refreshWidgetFrame(e);
        }
        widgetAppView(e, t) {
          return this.transport.widgetAppView(e, t);
        }
        refreshWidgetAppView(e, t) {
          return this.transport.refreshWidgetAppView(e, t);
        }
      }),
      (Fl = new Map()),
      (Il = new Map()),
      (H = new Map()),
      (U = new Map()),
      (Ll = null));
  }))();
}
var zl, Bl;
function Vl() {
  return (Vl = e(() => {
    (Rl(),
      (zl = () => ({ client: null, connected: !1, available: !1, key: `` })),
      (Bl = class {
        constructor(e, t, n = El, r = zl) {
          ((this.host = e),
            (this.sessionKeys = t),
            (this.resolveProvider = n),
            (this.resolveSource = r),
            (this.subscriptions = new Map()),
            (this.lookupGeneration = new Map()),
            (this.lookupSequence = 0),
            (this.lookedUpSessions = new Set()),
            (this.knownRevisions = new Map()),
            (this.retryDelay = new Map()),
            (this.retryTimers = new Map()),
            (this.visibleSessionKeys = new Set()),
            (this.sourceClient = null),
            (this.sourceKey = ``),
            (this.sourceActive = !1),
            (this.available = !1),
            (this.connected = !1),
            e.addController(this));
        }
        hostConnected() {
          ((this.connected = !0), this.synchronize());
        }
        hostUpdate() {
          this.synchronize();
        }
        hostDisconnected() {
          this.connected = !1;
          for (let e of this.subscriptions.values()) e();
          (this.subscriptions.clear(), this.disconnectSource(), this.visibleSessionKeys.clear());
        }
        synchronize() {
          if (!this.connected) return;
          let e = new Set(
              this.sessionKeys()
                .map((e) => e.trim())
                .filter(Boolean)
                .map(Tl),
            ),
            t = new Set([...e].map((e) => this.resolveProvider(e)));
          for (let [e, n] of this.subscriptions) t.has(e) || (n(), this.subscriptions.delete(e));
          for (let e of t)
            this.subscriptions.has(e) ||
              this.subscriptions.set(
                e,
                e.snapshot$.subscribe(() => this.host.requestUpdate()),
              );
          for (let t of this.visibleSessionKeys)
            e.has(t) ||
              (this.lookedUpSessions.delete(t),
              this.lookupGeneration.delete(t),
              this.knownRevisions.delete(t),
              this.clearRetry(t));
          if (
            ((this.visibleSessionKeys = e),
            this.synchronizeSource(),
            this.sourceActive && this.sourceClient)
          )
            for (let t of e)
              this.lookedUpSessions.has(t) ||
                (this.lookedUpSessions.add(t), this.lookup(t, this.sourceClient));
        }
        synchronizeSource() {
          let e = this.resolveSource(),
            t = e.connected && e.available && e.client !== null;
          if (
            this.sourceClient === e.client &&
            this.sourceActive === t &&
            this.available === e.available &&
            this.sourceKey === e.key
          )
            return;
          let n = this.sourceClient !== e.client || this.sourceKey !== e.key || !e.available;
          if (
            (this.disconnectSource(),
            (this.sourceClient = e.client),
            (this.sourceActive = t),
            (this.available = e.available),
            (this.sourceKey = e.key),
            n && Al() && this.host.requestUpdate(),
            !t || !e.client)
          )
            return;
          let r = e.client;
          this.sourceUnsubscribe = r.addEventListener((e) => {
            if (e.event !== `board.changed`) return;
            let t = e.payload,
              n = typeof t?.sessionKey == `string` ? Tl(t.sessionKey) : void 0;
            if (n && this.visibleSessionKeys.has(n)) {
              let e =
                typeof t?.revision == `number` && Number.isInteger(t.revision) && t.revision >= 0
                  ? t.revision
                  : void 0;
              if (e !== void 0 && this.knownRevisions.get(n) === e) return;
              (e !== void 0 && this.knownRevisions.set(n, e),
                this.clearRetry(n),
                this.lookup(n, r));
            }
          });
        }
        disconnectSource() {
          (this.sourceUnsubscribe?.(),
            (this.sourceUnsubscribe = void 0),
            (this.sourceClient = null),
            (this.sourceActive = !1),
            (this.available = !1),
            this.lookedUpSessions.clear(),
            this.lookupGeneration.clear(),
            this.knownRevisions.clear());
          for (let e of this.retryTimers.keys()) this.clearRetry(e);
        }
        lookup(e, t) {
          let n = ++this.lookupSequence;
          (this.lookupGeneration.set(e, n),
            t
              .request(`board.get`, { sessionKey: e })
              .then((r) => {
                !this.connected ||
                  !this.sourceActive ||
                  this.sourceClient !== t ||
                  this.lookupGeneration.get(e) !== n ||
                  !this.visibleSessionKeys.has(e) ||
                  (this.knownRevisions.set(e, r.revision),
                  kl(e, xl(r)) && this.host.requestUpdate(),
                  this.clearRetry(e));
              })
              .catch(() => {
                this.sourceClient === t &&
                  this.lookupGeneration.get(e) === n &&
                  this.visibleSessionKeys.has(e) &&
                  this.scheduleRetry(e, t);
              }));
        }
        scheduleRetry(e, t) {
          if (this.retryTimers.has(e)) return;
          let n = this.retryDelay.get(e) ?? 1e3,
            r = setTimeout(() => {
              (this.retryTimers.delete(e),
                this.connected &&
                  this.sourceActive &&
                  this.sourceClient === t &&
                  this.visibleSessionKeys.has(e) &&
                  this.lookup(e, t));
            }, n);
          (this.retryTimers.set(e, r), this.retryDelay.set(e, Math.min(n * 2, 3e4)));
        }
        clearRetry(e) {
          let t = this.retryTimers.get(e);
          (t && (clearTimeout(t), this.retryTimers.delete(e)), this.retryDelay.delete(e));
        }
      }));
  }))();
}
function Hl(e, t, n) {
  let r = t.replaceAll(`\\`, `/`);
  return `${e}://file${(r.startsWith(`/`) ? r : `/${r}`)
    .split(`/`)
    .map((e, t) => (t === 1 && /^[a-z]:$/i.test(e) ? e : encodeURIComponent(e)))
    .join(`/`)}${n ? `:${n}` : ``}`;
}
function Ul(e, t, n) {
  return window.open(Hl(e, t, n));
}
var Wl, Gl;
function Kl() {
  return (Kl = e(() => {
    ((Wl = [`cursor`, `vscode`, `windsurf`, `zed`]),
      (Gl = { cursor: `Cursor`, vscode: `VS Code`, windsurf: `Windsurf`, zed: `Zed` }));
  }))();
}
function ql(e) {
  return e?.trim() || void 0;
}
function Jl(e) {
  return [...e]
    .map(ql)
    .filter((e) => e !== void 0)
    .toSorted()[0];
}
function Yl(e) {
  if (!e || typeof e != `object`) return [];
  let t = e.presence;
  return Array.isArray(t) ? t : [];
}
function Xl(e) {
  return [
    ql(e.host) ?? ``,
    ql(e.platform) ?? ``,
    ql(e.deviceFamily) ?? ``,
    ql(e.instanceId) ?? ``,
    String(e.ts ?? 0).padStart(16, `0`),
  ].join(`\0`);
}
function Zl(e, t) {
  return e < t ? -1 : +(e > t);
}
function Ql(e, t, n) {
  let r = new Map(),
    i = ql(t);
  for (let t of e) {
    if (t.reason === `disconnect` || !t.user?.id) continue;
    let e = t.user.id,
      a = r.get(e);
    (a ? a.push(t) : r.set(e, [t]), !i && n && t.instanceId === n && (i = e));
  }
  return {
    selfUserId: i,
    users: [...r.entries()]
      .toSorted(([e], [t]) => (e < t ? -1 : +(e > t)))
      .map(([e, t]) => ({
        id: e,
        name: Jl(t.map((e) => e.user?.name)),
        email: Jl(t.map((e) => e.user?.email)),
        avatarUrl: Jl(t.map((e) => e.user?.avatarUrl)),
        watchedSessions: [...new Set(t.flatMap((e) => e.watchedSessions ?? []))].toSorted(),
        entries: t.toSorted((e, t) => Zl(Xl(e), Xl(t))),
      })),
  };
}
function $l(e, t, n) {
  return Ql(e, t, n);
}
function eu(e, t, n) {
  return du && cu === e && lu === t && uu === n
    ? du
    : ((cu = e), (lu = t), (uu = n), (du = Ql(Yl(e), t, n)), du);
}
function tu(e) {
  return e.name ?? e.email ?? e.id;
}
function nu(e) {
  let t = (e.entries ?? []).flatMap((e) =>
    e.lastInputSeconds === void 0 ? [] : [e.lastInputSeconds],
  );
  return t.length > 0 && t.every((e) => e > su);
}
function ru(e, t) {
  let n = Number(nu(e)) - Number(nu(t));
  if (n !== 0) return n;
  let r = tu(e).toLowerCase(),
    i = tu(t).toLowerCase();
  return r < i ? -1 : r > i ? 1 : e.id < t.id ? -1 : +(e.id > t.id);
}
function iu(e, t, n) {
  let r = eu(e, t, n);
  return r.users.filter((e) => e.id !== r.selfUserId).toSorted(ru);
}
function au(e, t, n, r, i) {
  let a = eu(e, t, n),
    o = ql(i);
  return a.users.some((e) => e.id !== a.selfUserId && e.id !== o && e.watchedSessions.includes(r));
}
function ou(e) {
  return eu(e).users.length >= 2;
}
var su, cu, lu, uu, du;
function fu() {
  return (fu = e(() => {
    su = 120;
  }))();
}
function pu() {
  for (let e of W.values()) e.blobUrl && URL.revokeObjectURL(e.blobUrl);
  W.clear();
}
function mu(e) {
  for (; W.size > vu;) {
    let t = !1;
    for (let [n, r] of W)
      if (!(!r.blobUrl || !r.loaded || r === e)) {
        (W.delete(n), URL.revokeObjectURL(r.blobUrl), (t = !0));
        break;
      }
    if (!t) break;
  }
}
function hu(e) {
  let t = W.get(e);
  if (t) return (W.delete(e), W.set(e, t), t.loaded && t.blobUrl ? t.blobUrl : t.promise);
  let n = { blobUrl: null, loaded: !1, promise: Promise.resolve(null) },
    { authHeader: r } = qa();
  return (
    (n.promise = (async () => {
      try {
        let t = await fetch(e, {
          credentials: `include`,
          ...(r ? { headers: { Authorization: r } } : {}),
          signal: AbortSignal.timeout(yu),
        });
        if (!t.ok) return null;
        let i = await t.blob();
        if (i.size === 0 || i.size > 2097152 || !bu.has(i.type.toLowerCase())) return null;
        let a = URL.createObjectURL(i);
        return W.get(e) === n ? ((n.blobUrl = a), mu(n), a) : (URL.revokeObjectURL(a), null);
      } catch {
        return null;
      } finally {
        !n.blobUrl && W.get(e) === n && W.delete(e);
      }
    })()),
    W.set(e, n),
    mu(n),
    n.promise
  );
}
function gu(e) {
  let { authHeader: t, origin: n, resourceBasePath: r } = qa(),
    i = Xa(e, n, r);
  if (!i) return null;
  let a = globalThis.location?.origin,
    o = a ? new URL(i, a).origin !== a : !1;
  return n || t || o ? hu(i) : i;
}
function _u(e) {
  if (e?.startsWith(`blob:`)) {
    for (let t of W.values())
      if (t.blobUrl === e) {
        ((t.loaded = !0), mu());
        return;
      }
  }
}
var vu, yu, bu, W;
function xu() {
  return (xu = e(() => {
    (y(),
      so(),
      (vu = 128),
      (yu = 3e4),
      (bu = new Set([`image/gif`, `image/jpeg`, `image/png`, `image/webp`])),
      (W = new Map()),
      Ka(pu));
  }))();
}
function Su(e) {
  if (e.status !== 503) return;
  let t = e.headers?.get(`retry-after`)?.trim();
  if (!t || !/^\d+$/.test(t)) return;
  let n = Number(t) * 1e3;
  return Number.isSafeInteger(n) && n > 0 && n <= Ou ? n : void 0;
}
function Cu(e, t) {
  G.get(e) === t &&
    (G.delete(e),
    t.retryTimer !== void 0 && (clearTimeout(t.retryTimer), (t.retryTimer = void 0)),
    t.controller.abort(),
    t.blobUrl && URL.revokeObjectURL(t.blobUrl));
}
function wu(e, t, n, r) {
  return `${n ? `stable-miss` : `retry-miss`}\0${r ? `retry-503` : `drop-503`}\0${t.join(``)}\0${e}`;
}
function Tu(e, t) {
  let n = G.get(e);
  n &&
    (n.consumers.delete(t),
    !(n.consumers.size > 0 || n.releaseTimer !== void 0) &&
      (n.releaseTimer = setTimeout(() => {
        ((n.releaseTimer = void 0), !(G.get(e) !== n || n.consumers.size > 0) && Cu(e, n));
      }, 0)));
}
async function Eu(e, t, n, r, i, a) {
  let o = setTimeout(() => a.controller.abort(), Du),
    s = null,
    c = !1,
    l;
  try {
    for (let e of n.length > 0 ? n : [``]) {
      let n = await fetch(t, {
        ...(e ? { headers: { Authorization: `Bearer ${e}` } } : {}),
        signal: a.controller.signal,
      });
      if (n.ok) {
        s = URL.createObjectURL(await n.blob());
        break;
      }
      if (((c = n.status === 404), (l = i ? Su(n) : void 0), n.status !== 401 && n.status !== 403))
        break;
    }
  } catch {
  } finally {
    clearTimeout(o);
  }
  if (G.get(e) !== a) {
    s && URL.revokeObjectURL(s);
    return;
  }
  if (!s) {
    if (c && r) return;
    if (l !== void 0) {
      a.consumers.size > 0 && a.retryAttempts < ku
        ? ((a.retryAttempts += 1),
          (a.retryTimer = setTimeout(() => {
            ((a.retryTimer = void 0),
              G.get(e) === a &&
                a.consumers.size !== 0 &&
                ((a.controller = new AbortController()), Eu(e, t, n, r, i, a)));
          }, l)))
        : a.consumers.size > 0 && (a.retryEligibleAt = Date.now() + Au);
      return;
    }
    Cu(e, a);
    return;
  }
  a.blobUrl = s;
  for (let e of a.consumers.values()) e();
}
var Du, Ou, ku, Au, G, ju;
function Mu() {
  return (Mu = e(() => {
    ((Du = 3e4),
      (Ou = 3e4),
      (ku = 3),
      (Au = 3e4),
      (G = new Map()),
      (ju = class {
        constructor(e, t = {}) {
          ((this.onUpdate = e),
            (this.options = t),
            (this.owner = Symbol(`authenticated-avatar-route-owner`)),
            (this.keys = new Set()));
        }
        reset() {
          for (let e of this.keys) Tu(e, this.owner);
          this.keys.clear();
        }
        withActiveRoutes(e) {
          let t = this.keys;
          this.keys = new Set();
          try {
            return e();
          } finally {
            for (let e of t) this.keys.has(e) || Tu(e, this.owner);
          }
        }
        resolve(e, t) {
          if (!e.startsWith(`/`)) return e;
          let n = this.options.cacheNotFound === !0,
            r = this.options.retryUnavailable === !0,
            i = wu(e, t, n, r),
            a = G.get(i);
          return (
            a
              ? a.blobUrl === null &&
                a.retryTimer === void 0 &&
                a.retryEligibleAt !== void 0 &&
                Date.now() >= a.retryEligibleAt &&
                ((a.retryAttempts = 0),
                (a.retryEligibleAt = void 0),
                (a.controller = new AbortController()),
                Eu(i, e, t, n, r, a))
              : ((a = {
                  blobUrl: null,
                  consumers: new Map(),
                  controller: new AbortController(),
                  releaseTimer: void 0,
                  retryTimer: void 0,
                  retryAttempts: 0,
                  retryEligibleAt: void 0,
                }),
                G.set(i, a),
                Eu(i, e, t, n, r, a)),
            a.releaseTimer !== void 0 && (clearTimeout(a.releaseTimer), (a.releaseTimer = void 0)),
            a.consumers.set(this.owner, this.onUpdate),
            this.keys.add(i),
            a.blobUrl
          );
        }
      }));
  }))();
}
function Nu(e) {
  return e.state?.lastRunStatus ?? e.state?.lastStatus ?? `unknown`;
}
function Pu(e) {
  let t = e.state?.runningAtMs;
  return typeof t == `number` && Number.isFinite(t);
}
function Fu(e) {
  return e.state?.autoDisabled ? !0 : e.enabled && Nu(e) === `error`;
}
function Iu() {
  return (Iu = e(() => {}))();
}
function Lu(e, t) {
  let n = e.trim();
  if (!Ru.test(n)) return;
  let [r, i = ``] = n.split(`.`),
    a = (r || `0`).replace(/^0+/u, ``) || `0`,
    o = i.replace(/0+$/u, ``);
  if (a.length > String(2 ** 53 - 1).length || o.length > 10) return;
  let s = 10n ** BigInt(o.length),
    c = (BigInt(a) * s + BigInt(o || `0`)) * BigInt(zu[t]);
  if (c % s !== 0n) return;
  let l = c / s;
  return l > 0n && l <= BigInt(2 ** 53 - 1) ? Number(l) : void 0;
}
var Ru, zu;
function Bu() {
  return (Bu = e(() => {
    ((Ru = /^(?:\d+(?:\.\d*)?|\.\d+)$/u),
      (zu = { seconds: 1e3, minutes: 6e4, hours: 36e5, days: 864e5 }));
  }))();
}
async function Vu(e) {
  if (!(!e.client || !e.connected))
    try {
      let t = await e.client.request(`cron.list`, {
        ...(e.cronAgentId ? { agentId: e.cronAgentId } : {}),
        enabled: `enabled`,
        includeDeliveryPreviews: !1,
        lastRunStatus: `error`,
        limit: 1,
        offset: 0,
      });
      e.cronFailingCount = typeof t?.total == `number` ? t.total : null;
    } catch {
      e.cronFailingCount = null;
    }
}
async function Hu(e) {
  if (!e.client || !e.connected || !e.cronAgentId) {
    ((e.cronScopedTotal = null), (e.cronScopedNextWakeAtMs = null));
    return;
  }
  try {
    let [t, n] = await Promise.all([
      e.client.request(`cron.list`, {
        agentId: e.cronAgentId,
        includeDisabled: !0,
        includeDeliveryPreviews: !1,
        limit: 1,
        offset: 0,
      }),
      e.client.request(`cron.list`, {
        agentId: e.cronAgentId,
        enabled: `enabled`,
        includeDeliveryPreviews: !1,
        limit: 1,
        offset: 0,
        sortBy: `nextRunAtMs`,
        sortDir: `asc`,
      }),
    ]);
    e.cronScopedTotal = typeof t.total == `number` ? t.total : null;
    let r = n.jobs[0]?.state?.nextRunAtMs;
    e.cronScopedNextWakeAtMs = typeof r == `number` && Number.isFinite(r) ? r : null;
  } catch {
    ((e.cronScopedTotal = null), (e.cronScopedNextWakeAtMs = null));
  }
}
function Uu() {
  return (Uu = e(() => {}))();
}
function Wu(e) {
  let t = St(e);
  return mn(t) ?? t;
}
function Gu(e) {
  return e.status === `missing`
    ? !0
    : Array.isArray(e.profiles)
      ? e.profiles.some((e) => e.type === `oauth` || e.type === `token`)
      : !1;
}
function Ku(e) {
  let t = new Map();
  for (let n of e) {
    let e = Wu(n.provider),
      r = t.get(e) ?? [];
    (r.push(n), t.set(e, r));
  }
  return [...t].map(([e, t]) => {
    let n = t.reduce((e, t) => (Yu.indexOf(t.status) < Yu.indexOf(e.status) ? t : e));
    return Object.assign({}, n, { provider: e, profiles: t.flatMap((e) => e.profiles) });
  });
}
async function qu(e, t) {
  let n = { ...(t?.refresh ? { refresh: !0 } : {}), agentId: t.agentId };
  return (
    (t?.signal
      ? await e.request(`models.authStatus`, n, { signal: t.signal })
      : await e.request(`models.authStatus`, n)) ?? Ju
  );
}
var Ju, Yu;
function Xu() {
  return (Xu = e(() => {
    (xt(),
      yn(),
      (Ju = { ts: 0, providers: [] }),
      (Yu = [`expired`, `missing`, `expiring`, `ok`, `static`]));
  }))();
}
function Zu(e) {
  window.dispatchEvent(new CustomEvent(st, { detail: e }));
}
function Qu(e, t) {
  Zu({ open: !0, agentId: t, catalog: e });
}
function $u(e) {
  Zu({ open: !0, terminalSessionId: e });
}
function ed() {
  return (ed = e(() => {
    ht();
  }))();
}
var td;
function nd() {
  return (nd = e(() => {
    td = class {
      constructor(e, t, n, r = !0) {
        ((this.intervalMs = t),
          (this.tick = n),
          (this.autoStart = r),
          (this.timer = null),
          e.addController(this));
      }
      hostConnected() {
        this.autoStart && this.start();
      }
      hostDisconnected() {
        this.stop();
      }
      start() {
        return (
          this.timer === null &&
          ((this.timer = globalThis.setInterval(() => {
            this.tick();
          }, this.intervalMs)),
          !0)
        );
      }
      stop() {
        this.timer !== null && (globalThis.clearInterval(this.timer), (this.timer = null));
      }
    };
  }))();
}
function rd(e) {
  let t = new CustomEvent(cd, { cancelable: !0, detail: e });
  return (globalThis.dispatchEvent(t), t.defaultPrevented);
}
function id(e, t) {
  let n = {},
    r = e.activeRouteId,
    i = e.sessionKey;
  ud.set(e, n);
  let a = {
    ...t,
    commit: () =>
      !e.isConnected || e.activeRouteId !== r || e.sessionKey !== i || ud.get(e) !== n
        ? !1
        : (ud.delete(e), t.commit()),
  };
  rd(a) || a.commit();
}
function ad(e, t, n) {
  let { client: r, hello: i } = e.snapshot,
    a = { pathname: t, sessionKey: n, client: r, hello: i };
  (ld.set(e, a),
    globalThis.setTimeout(() => {
      ld.get(e) === a && ld.delete(e);
    }, sd));
}
function od(e, t) {
  let n = ld.get(e);
  if (!n || n.pathname !== t) return;
  ld.delete(e);
  let { client: r, hello: i } = e.snapshot;
  if (n.client === r && n.hello === i) return n.sessionKey;
}
var sd, cd, ld, ud;
function dd() {
  return (dd = e(() => {
    ((sd = 2e3),
      (cd = `openclaw:session-navigation-intent`),
      (ld = new WeakMap()),
      (ud = new WeakMap()));
  }))();
}
function fd(e, t, n, r = new Set(), i = [], a = !1, o = !1, s = !1) {
  let c = new Set(t.map((e) => e.key)),
    l = new Set(n),
    u = new Set(i.map((e) => e.id)),
    d = new Set(),
    f = [],
    p = [];
  for (let t of e) {
    let e = gt(t);
    if (!e) continue;
    let n = pt(e);
    if (!d.has(n)) {
      if (e.type === `route`) {
        if (e.route === `workboard`) {
          (d.add(n), p.push(n), s && f.push(e));
          continue;
        }
        if (!l.has(e.route)) continue;
        (d.add(n), f.push(e), p.push(n));
        continue;
      }
      if (e.type === `workboard`) {
        if ((d.add(n), p.push(n), !a || !o)) continue;
        if (!u.has(e.boardId)) {
          p.pop();
          continue;
        }
        f.push(e);
        continue;
      }
      if (c.has(e.key)) {
        (d.add(n), f.push(e), p.push(n));
        continue;
      }
      r.has(e.key) || (d.add(n), p.push(n));
    }
  }
  for (let e of t) {
    let t = { type: `session`, key: e.key },
      n = pt(t);
    d.has(n) || (d.add(n), f.push(t), p.push(n));
  }
  return { entries: f, sidebarEntries: p };
}
function pd() {
  return (pd = e(() => {
    mt();
  }))();
}
function md() {
  let e = null,
    t = hd,
    n = () => {
      e !== null && (globalThis.clearTimeout(e), (e = null));
    };
  return {
    cancel: n,
    reset() {
      (n(), (t = hd));
    },
    schedule(r) {
      n();
      let i = t;
      ((t = Math.min(t * 2, gd)),
        (e = globalThis.setTimeout(() => {
          ((e = null), r());
        }, i)));
    },
  };
}
var hd, gd;
function _d() {
  return (_d = e(() => {
    ((hd = 3e4), (gd = 3e5));
  }))();
}
function vd(e, t) {
  let n = e.trim();
  return !n || ke(n) || !t?.trim() ? n : `agent:${p(t)}:${n}`;
}
function yd(e) {
  if (!e || typeof e != `object` || !(`sessions` in e)) return null;
  let t = e.sessions;
  return g(t);
}
function bd(e) {
  let t = new Map(),
    n = new WeakMap(),
    r = new Map(),
    i = new Set(),
    a = new Map(),
    o = new Set(),
    s = md(),
    c = ve(e.snapshot),
    l = null,
    u = null,
    d = 0,
    f = !1,
    p = 0,
    m = !1,
    h = null,
    _ = null,
    v = null,
    y = () => {
      for (let e of Array.from(i)) e();
    },
    b = (e, t) => {
      let n = a.get(e);
      if (n) {
        a.delete(e);
        for (let e of n) e(t);
      }
    },
    x = () => {
      let e = new Map();
      for (let n of t.values()) for (let t of n.keys) e.set(t, (e.get(t) ?? !1) || n.foreground);
      return [...e]
        .toSorted(([e, t], [n, r]) => Number(r) - Number(t) || e.localeCompare(n))
        .slice(0, 200)
        .map(([e]) => e);
    },
    S = () => {
      let e = new Set(x());
      for (let t of o) e.has(t) || o.delete(t);
      for (let t of a.keys()) e.has(t) || b(t);
      for (let t of r.keys()) e.has(t) || r.delete(t);
    },
    C = () => t.size > 0 || i.size > 0 || a.size > 0,
    ee = () => {
      ((d += 1), (l = null), (u = null));
      let e = r.size > 0;
      r.clear();
      for (let e of a.keys()) b(e);
      e && y();
    },
    te = (e) => {
      let t = c.transition(e);
      (t && ee(), (t || e.hello !== l) && (s.reset(), w()));
    },
    ne = (t) => {
      if (t.event === `sessions.changed`) {
        let n = et(t.payload),
          i = g(t.payload)?.reason;
        if (!n || !Cd.has(i)) return;
        let a = x().filter((t) =>
          Qe(
            {
              assistantAgentId: e.snapshot.assistantAgentId,
              hello: e.snapshot.hello,
              sessionKey: t,
            },
            n.key,
            n.agentId,
          ),
        );
        if (a.length === 0) return;
        let c = !1;
        for (let e of a) ((c = r.delete(e) || c), o.add(e));
        (s.reset(), c && y(), w());
        return;
      }
      if (t.event !== `controlUi.sessionPullRequests.changed`) return;
      let n = yd(t.payload);
      if (!n) return;
      let i = new Set(x());
      for (let [e, t] of Object.entries(n)) {
        if (!i.has(e)) continue;
        let n = r.get(e),
          a = t;
        (n && t.status === `rate-limited` && t.pullRequests.length === 0
          ? (a = { ...t, pullRequests: n.pullRequests, branch: t.branch ?? n.branch })
          : n &&
            t.status === `unavailable` &&
            (n.pullRequests.length > 0 || n.branch !== void 0) &&
            (a = { ...n, status: `unavailable` }),
          r.set(e, a),
          b(e, a));
      }
      y();
    },
    re = () => {
      (s.reset(), w());
    },
    ie = () => {
      m ||
        ((m = !0),
        c.transition(e.snapshot) && ee(),
        (l = null),
        (u = null),
        (h = e.subscribe(te)),
        (_ = e.subscribeEvents(ne)),
        typeof document < `u` &&
          (document.addEventListener(`visibilitychange`, re), (v = document)));
    },
    ae = () => {
      m &&
        ((m = !1),
        h?.(),
        (h = null),
        _?.(),
        (_ = null),
        v?.removeEventListener(`visibilitychange`, re),
        (v = null),
        s.reset(),
        (d += 1),
        (p += 1),
        (f = !1),
        (l = null),
        (u = null),
        r.clear());
    };
  function oe() {
    if (((f = !1), !m)) return;
    let t = e.snapshot,
      n = t.client;
    if (
      t.phase !== `connected` ||
      n === null ||
      t.hello === null ||
      Nt(t, `controlUi.sessionPullRequests.subscribe`) !== !0
    ) {
      ((l = null), (u = null));
      for (let e of a.keys()) b(e);
      C() || ae();
      return;
    }
    let r = typeof document < `u` && document.visibilityState === `hidden` ? [] : x(),
      i = new Set(r),
      c = [...o].filter((e) => i.has(e)),
      p = JSON.stringify(r.toSorted());
    if (t.hello === l && p === u && c.length === 0) {
      C() || ae();
      return;
    }
    ((l = t.hello), (u = p));
    let h = ++d,
      g = () => m && C() && h === d && t.hello === l && p === u;
    s.cancel();
    let _ = n.request(Sd, { sessionKeys: r, ...(c.length > 0 ? { refreshSessionKeys: c } : {}) });
    (C() || ae(),
      _.then(() => {
        if (g()) {
          for (let e of c) o.delete(e);
          s.reset();
        }
      }).catch(() => {
        if (g()) {
          ((u = null),
            s.schedule(() => {
              m && C() && w();
            }));
          for (let e of r) b(e);
        }
      }));
  }
  function w() {
    if (!m || f) return;
    f = !0;
    let e = p;
    globalThis.queueMicrotask(() => {
      e === p && oe();
    });
  }
  let T = (e, n, r = {}) => {
    let i = C(),
      a = new Set(n.map((e) => e.trim()).filter(Boolean)),
      o = t.get(e);
    (o === void 0
      ? a.size === 0
      : o.keys.size === a.size &&
        o.foreground === (r.foreground === !0) &&
        [...a].every((e) => o.keys.has(e))) ||
      (a.size === 0 ? t.delete(e) : t.set(e, { keys: a, foreground: r.foreground === !0 }),
      s.reset(),
      S(),
      C() ? (i || ((l = null), (u = null)), ie(), w()) : m && oe());
  };
  return {
    watch: T,
    unwatch: (e) => {
      (n.delete(e), T(e, []));
    },
    load: async (i, o) => {
      let s = o.trim();
      if (!s) return;
      let c = {};
      (n.set(i, c), T(i, [s], { foreground: !0 }));
      try {
        return (
          r.get(s) ||
          (e.snapshot.phase !== `connected` ||
          Nt(e.snapshot, `controlUi.sessionPullRequests.subscribe`) !== !0
            ? void 0
            : await new Promise((e) => {
                let t = a.get(s) ?? new Set();
                (t.add(e), a.set(s, t), w());
              }))
        );
      } finally {
        let e = t.get(i);
        n.get(i) === c && e?.keys.size === 1 && e.keys.has(s) && (n.delete(i), T(i, []));
      }
    },
    refresh: (e) => {
      let t = e.trim();
      !t || !x().includes(t) || (o.add(t), s.reset(), w());
    },
    get: (e) => r.get(e),
    subscribe: (e) => {
      let t = C();
      return (
        i.add(e),
        t || ((l = null), (u = null)),
        ie(),
        () => {
          i.delete(e) && (C() ? w() : m && oe());
        }
      );
    },
  };
}
function xd(e) {
  let t = wd.get(e);
  if (t) return t;
  let n = bd(e);
  return (wd.set(e, n), n);
}
var Sd, Cd, wd;
function Td() {
  return (Td = e(() => {
    (nn(),
      Ft(),
      _d(),
      ie(),
      O(),
      (Sd = `controlUi.sessionPullRequests.subscribe`),
      (Cd = new Set([`new`, `reset`, `branch-switch`, `fork`, `rewind`])),
      (wd = new WeakMap()));
  }))();
}
async function Ed(e) {
  if (e.initialResult === null) return [];
  let t = new Map(),
    n;
  for (let r = 0; r < Dd; r += 1) {
    let i = t.size,
      a = new Set(),
      o = 0,
      s = r === 0 ? e.initialResult : void 0;
    for (; !a.has(o);) {
      a.add(o);
      let r = s ?? (await e.list(o));
      if (((s = void 0), e.isCurrent && !e.isCurrent())) return null;
      if (!r) throw Error(e.missingResultError);
      typeof r.totalCount == `number` && (n = Math.max(n ?? 0, r.totalCount));
      let i = e.mapPageRows?.(r.sessions) ?? r.sessions;
      for (let e of i) t.set(e.key, e);
      if (!(r.hasMore ?? (typeof r.totalCount == `number` && o + r.sessions.length < r.totalCount)))
        break;
      let c = r.nextOffset ?? (r.offset ?? o) + r.sessions.length;
      if (c <= o) {
        if (e.stalledPaginationError) throw Error(e.stalledPaginationError);
        break;
      }
      o = c;
    }
    if (t.size === i || n === void 0 || t.size >= n) break;
  }
  if (e.incompletePaginationError && n !== void 0 && t.size < n)
    throw Error(e.incompletePaginationError);
  return [...t.values()];
}
var Dd;
function Od() {
  return (Od = e(() => {
    Dd = 4;
  }))();
}
async function kd(e) {
  let t = e.pageSize ?? Ad;
  return Ed({
    list: (n) =>
      e.sessions.list({
        spawnedBy: e.parentKey,
        ...(n > 0 ? { offset: n } : {}),
        limit: t,
        includeGlobal: !1,
        includeUnknown: !1,
        configuredAgentsOnly: !0,
      }),
    isCurrent: e.isCurrent,
    missingResultError: `child session list returned no result`,
    mapPageRows: (e) => {
      let t = Date.now();
      return e.map((e) => ({ ...e, runtimeSampledAt: t }));
    },
  });
}
var Ad;
function jd() {
  return (jd = e(() => {
    (Od(), (Ad = 100));
  }))();
}
function Md(e) {
  if (!l(e).startsWith(Id)) return !1;
  let t = e.indexOf(`,`);
  if (t < 5) return !1;
  let n = e.slice(5, t),
    r = l(n.split(`;`)[0]);
  return r.startsWith(`image/`) ? !Rd.has(r) : !1;
}
function Nd(e, t, n = {}) {
  let r = e.trim();
  if (!r) return null;
  if (n.allowDataImage === !0 && Md(r)) return r;
  if (l(r).startsWith(Id)) return null;
  try {
    let e = new URL(r, t);
    return Ld.has(l(e.protocol)) ? e.toString() : null;
  } catch {
    return null;
  }
}
function Pd() {
  let e = window.open(`about:blank`, `_blank`);
  return (e && (e.opener = null), e);
}
function Fd(e, t = {}) {
  let n = Nd(e, t.baseHref ?? window.location.href, t);
  if (!n) return null;
  let r = window.open(n, `_blank`, `noopener,noreferrer`);
  return (r && (r.opener = null), r);
}
var Id, Ld, Rd;
function zd() {
  return (zd = e(() => {
    ((Id = `data:`),
      (Ld = new Set([`http:`, `https:`, `blob:`])),
      (Rd = new Set([`image/svg+xml`])));
  }))();
}
function Bd(e) {
  let t = {};
  for (let n of Wd) {
    let r = e(Gd[n]).trim();
    r && (t[n] = r);
  }
  return t;
}
function Vd() {
  let e = document.documentElement,
    t = getComputedStyle(e);
  return {
    type: `openclaw:widget-theme`,
    mode: e.dataset.themeMode === `light` ? `light` : `dark`,
    tokens: Bd((e) => t.getPropertyValue(e)),
  };
}
function Hd(e, t = `*`) {
  e.contentWindow?.postMessage(Vd(), t);
}
function Ud() {
  if (
    typeof window > `u` ||
    typeof document > `u` ||
    typeof MutationObserver > `u` ||
    Kd.has(window)
  )
    return;
  Kd.add(window);
  let e = document.documentElement;
  new MutationObserver(() => {
    for (let e of document.querySelectorAll(`.chat-tool-card__preview-frame, .board-widget__frame`))
      Hd(e);
  }).observe(e, { attributes: !0, attributeFilter: [`data-theme`, `data-theme-mode`, `style`] });
}
var Wd, Gd, Kd;
function qd() {
  return (qd = e(() => {
    ((Wd = [
      `surface`,
      `card`,
      `elevated`,
      `text`,
      `text-strong`,
      `muted`,
      `border`,
      `border-strong`,
      `accent`,
      `accent-fill`,
      `accent-fg`,
      `ok`,
      `warn`,
      `danger`,
      `info`,
      `radius`,
      `radius-full`,
      `scrollbar-size`,
      `scrollbar-thumb-inset`,
      `scrollbar-thumb`,
      `scrollbar-thumb-hover`,
      `font-body`,
      `font-mono`,
    ]),
      (Gd = {
        surface: `--bg`,
        card: `--card`,
        elevated: `--bg-elevated`,
        text: `--text`,
        "text-strong": `--text-strong`,
        muted: `--muted`,
        border: `--border`,
        "border-strong": `--border-strong`,
        accent: `--accent`,
        "accent-fill": `--primary`,
        "accent-fg": `--primary-foreground`,
        ok: `--ok`,
        warn: `--warn`,
        danger: `--danger`,
        info: `--info`,
        radius: `--radius`,
        "radius-full": `--radius-full`,
        "scrollbar-size": `--scrollbar-size`,
        "scrollbar-thumb-inset": `--scrollbar-thumb-inset`,
        "scrollbar-thumb": `--scrollbar-thumb`,
        "scrollbar-thumb-hover": `--scrollbar-thumb-hover`,
        "font-body": `--font-body`,
        "font-mono": `--mono`,
      }),
      (Kd = new WeakSet()));
  }))();
}
function Jd(e, t = /[\s\p{P}\p{S}]/u) {
  if (!e) return `ltr`;
  for (let n of e) if (!t.test(n)) return Yd.test(n) ? `rtl` : `ltr`;
  return `ltr`;
}
var Yd;
function Xd() {
  return (Xd = e(() => {
    Yd =
      /\p{Script=Hebrew}|\p{Script=Arabic}|\p{Script=Syriac}|\p{Script=Thaana}|\p{Script=Nko}|\p{Script=Samaritan}|\p{Script=Mandaic}|\p{Script=Adlam}|\p{Script=Phoenician}|\p{Script=Lydian}/u;
  }))();
}
function Zd(e) {
  if (gf.test(e)) return { display: e, id: e };
  let t = hf.exec(e);
  if (!t?.[1]) return null;
  let n = e.slice(0, t.index).trim();
  return n ? { display: n, id: t[1] } : null;
}
function Qd(e) {
  let t = e.toLowerCase();
  return t === `user`
    ? `user`
    : t === `assistant`
      ? `assistant`
      : t === `system`
        ? `system`
        : t === `toolresult` || t === `tool_result` || t === `tool` || t === `function`
          ? `tool`
          : e;
}
function $d(e) {
  let t = Tf.parse(e).role?.toLowerCase() ?? ``;
  return t === `toolresult` || t === `tool_result`;
}
function ef(e) {
  let t = Tf.parse(e);
  return (
    (t.role ? Qd(t.role) : `unknown`) === `tool` ||
    t.toolCallId !== void 0 ||
    t.tool_call_id !== void 0 ||
    t.toolUseId !== void 0 ||
    t.tool_use_id !== void 0 ||
    t.toolName !== void 0 ||
    t.tool_name !== void 0
  );
}
function tf(e, t) {
  return (
    e.text !== void 0 &&
    (e.type === `text` ||
      (t === `user` && e.type === `input_text`) ||
      (t === `assistant` && (e.type === `input_text` || e.type === `output_text`)))
  );
}
function nf(e) {
  if (!e || e.kind !== `canvas` || e.surface === `tool_card`) return null;
  let t = e.render === `url` ? `url` : null;
  if (!t) return null;
  let n = e.mcpApp,
    r = dn(e.boardWidgetName) ? e.boardWidgetName : void 0;
  return {
    kind: `canvas`,
    surface: `assistant_message`,
    render: t,
    ...(e.title === void 0 ? {} : { title: e.title }),
    ...(e.preferredHeight === void 0 ? {} : { preferredHeight: e.preferredHeight }),
    ...(e.url === void 0 ? {} : { url: e.url }),
    ...(e.viewId === void 0 ? {} : { viewId: e.viewId }),
    ...(e.className === void 0 ? {} : { className: e.className }),
    ...(e.style === void 0 ? {} : { style: e.style }),
    ...(e.sandbox === `strict` || e.sandbox === `scripts` ? { sandbox: e.sandbox } : {}),
    ...(r ? { boardWidgetName: r } : {}),
    ...(n?.viewId?.trim()
      ? {
          mcpApp: {
            viewId: n.viewId,
            ...(n.serverName === void 0 ? {} : { serverName: n.serverName }),
            ...(n.toolName === void 0 ? {} : { toolName: n.toolName }),
            ...(n.uiResourceUri === void 0 ? {} : { uiResourceUri: n.uiResourceUri }),
            ...(n.toolCallId === void 0 ? {} : { toolCallId: n.toolCallId }),
            ...(n.originSessionKey === void 0 ? {} : { originSessionKey: n.originSessionKey }),
          },
        }
      : {}),
  };
}
function rf(e) {
  let t = e.trim();
  return (
    /^https?:\/\//i.test(t) ||
    /^data:(?:image|audio|video)\//i.test(t) ||
    /^\/(?:__openclaw__|media)\//.test(t) ||
    t.startsWith(`file://`) ||
    t.startsWith(`~`) ||
    t.startsWith(`/`) ||
    /^[a-zA-Z]:[\\/]/.test(t)
  );
}
function af(e) {
  let t = e.trim();
  return t
    ? !/^https?:\/\//i.test(t) &&
        !/^data:(?:image|audio|video)\//i.test(t) &&
        !/^\/(?:__openclaw__|media)\//.test(t) &&
        !t.startsWith(`file://`) &&
        !t.startsWith(`~`) &&
        !t.startsWith(`/`) &&
        !/^[a-zA-Z]:[\\/]/.test(t)
    : !1;
}
function of(e) {
  let t = Fo(e);
  return t ? Ef[t] : void 0;
}
function sf(e) {
  let t = of(e),
    n = wt(t);
  return {
    kind: !n || n === `sticker` || n === `unknown` ? `document` : n,
    mimeType: t,
    label: (() => {
      try {
        if (/^https?:\/\//i.test(e)) {
          let t = new URL(e);
          return t.pathname.split(`/`).pop()?.trim() || t.hostname || e;
        }
      } catch {}
      return e.split(/[\\/]/).pop()?.trim() || e;
    })(),
  };
}
function cf(e) {
  if (e.type !== `audio`) return null;
  let t = e.source;
  if (!t) return null;
  let n = t.media_type?.trim().toLowerCase().startsWith(`audio/`)
    ? t.media_type.trim()
    : `audio/mpeg`;
  if (t.type === `base64` && t.data !== void 0) {
    let r = t.data.trim();
    return r
      ? {
          type: `attachment`,
          attachment: {
            url: r.startsWith(`data:`) ? r : `data:${n};base64,${r}`,
            kind: `audio`,
            label: e.label?.trim() || `Audio`,
            mimeType: n,
            ...(e.isVoiceNote === !0 ? { isVoiceNote: !0 } : {}),
          },
        }
      : null;
  }
  if (t.type === `url` && t.url !== void 0) {
    let r = t.url.trim();
    return r
      ? {
          type: `attachment`,
          attachment: {
            url: r,
            kind: `audio`,
            label: e.label?.trim() || `Audio`,
            mimeType: n,
            ...(e.isVoiceNote === !0 ? { isVoiceNote: !0 } : {}),
          },
        }
      : null;
  }
  return null;
}
function lf(e) {
  if ((e.type !== `audio` && e.type !== `video` && e.type !== `file`) || e.url === void 0)
    return null;
  let t = e.url.trim();
  if (!t) return null;
  let n = e.type === `file` ? `document` : e.type,
    r = n === `audio` ? `Audio` : n === `video` ? `Video` : `Document`;
  return {
    type: `attachment`,
    attachment: {
      url: t,
      kind: n,
      label: e.fileName?.trim() || e.label?.trim() || r,
      ...(e.mimeType === void 0 ? {} : { mimeType: e.mimeType }),
      ...(e.artifactId === void 0 ? {} : { artifactId: e.artifactId }),
      ...(n === `audio` && e.isVoiceNote === !0 ? { isVoiceNote: !0 } : {}),
      ...(e.playback === `native` || e.playback === `transcode` ? { playback: e.playback } : {}),
      ...(e.sizeBytes !== void 0 && e.sizeBytes >= 0 ? { sizeBytes: e.sizeBytes } : {}),
      ...(e.durationMs !== void 0 && e.durationMs >= 0 ? { durationMs: e.durationMs } : {}),
      ...(n === `video` && e.width !== void 0 && e.width > 0 ? { width: e.width } : {}),
      ...(n === `video` && e.height !== void 0 && e.height > 0 ? { height: e.height } : {}),
    },
  };
}
function uf(e) {
  let t = [];
  for (let n of e) {
    let e = t[t.length - 1];
    if (n.type === `text` && e?.type === `text`) {
      e.text = [e.text, n.text].filter((e) => e !== void 0).join(`
`);
      continue;
    }
    t.push(n);
  }
  return t.filter((e) => e.type !== `text` || !!e.text?.trim());
}
function df(e) {
  return jn(e);
}
function ff(e) {
  return e
    .map((e) => (e.type !== `text` || typeof e.text != `string` ? e : { ...e, text: df(e.text) }))
    .filter((e) => e.type !== `text` || !!e.text?.trim());
}
function pf(e, t) {
  let n = tn(e),
    r = vn(n.text, { extractAudioDirectives: !1 }),
    i = [],
    a = t?.audioAsVoice === !0,
    o = t?.replyToId?.trim(),
    s = o ? { kind: `id`, id: o } : t?.replyToCurrent === !0 ? { kind: `current` } : null,
    c = r.segments ?? [{ type: `text`, text: r.text }];
  for (let e of c) {
    if (e.type === `media`) {
      if (!rf(e.url)) {
        af(e.url) && i.push({ type: `text`, text: `MEDIA:${e.url}` });
        continue;
      }
      let t = sf(e.url);
      i.push({
        type: `attachment`,
        attachment: { url: e.url, kind: t.kind, label: t.label, mimeType: t.mimeType },
      });
      continue;
    }
    e.text && i.push({ type: `text`, text: e.text });
  }
  for (let e of n.previews)
    e.surface === `assistant_message` &&
      i.push({ type: `canvas`, preview: { ...e, surface: `assistant_message` }, rawText: null });
  let l = uf(
    i.map((e) =>
      e.type === `attachment` && e.attachment.kind === `audio` && a
        ? Object.assign({}, e, { attachment: { ...e.attachment, isVoiceNote: !0 } })
        : e,
    ),
  );
  return {
    content:
      l.length > 0
        ? l
        : (r.mediaUrls ?? []).some((e) => af(e))
          ? (r.mediaUrls ?? [])
              .filter((e) => af(e))
              .map((e) => ({ type: `text`, text: `MEDIA:${e}` }))
          : s === null && !a && r.text.trim().length > 0
            ? [{ type: `text`, text: r.text }]
            : [],
    audioAsVoice: a,
    replyTarget: s,
  };
}
function mf(e) {
  let t = Tf.parse(e),
    n = t.role ?? `unknown`,
    r =
      t.toolCallId !== void 0 ||
      t.tool_call_id !== void 0 ||
      t.toolUseId !== void 0 ||
      t.tool_use_id !== void 0,
    i = t.content,
    a = Array.isArray(i) ? i : null,
    o = a?.some((e) => cn(e.type) || on(e.type)) ?? !1,
    s = t.toolName !== void 0 || t.tool_name !== void 0;
  (r || o || s) && (n = `toolResult`);
  let c = n === `assistant`,
    l = c ? t.openclawDelivery : void 0,
    u = [],
    d = !1,
    f = null;
  if (typeof t.content == `string`) {
    if (c) {
      let e = pf(t.content, l);
      ((u = e.content), (d = e.audioAsVoice), (f = e.replyTarget));
    } else u = [{ type: `text`, text: t.content }];
  } else if (a)
    u = a.flatMap((e) => {
      if (e.type === `thinking`) return [];
      if (c) {
        let t = lf(e);
        if (t) return [t];
        let n = cf(e);
        if (n) return [n];
      } else if (e.type === `audio`) return [];
      if (e.type === `attachment` && e.attachment) {
        let t = e.attachment;
        return t.url === void 0 ||
          (t.kind !== `image` &&
            t.kind !== `audio` &&
            t.kind !== `video` &&
            t.kind !== `document`) ||
          t.label === void 0
          ? []
          : [
              {
                type: `attachment`,
                attachment: {
                  url: t.url,
                  kind: t.kind,
                  label: t.label,
                  ...(t.mimeType === void 0 ? {} : { mimeType: t.mimeType }),
                  ...(t.isVoiceNote === !0 ? { isVoiceNote: !0 } : {}),
                  ...(t.artifactId === void 0 ? {} : { artifactId: t.artifactId }),
                  ...(t.playback === `native` || t.playback === `transcode`
                    ? { playback: t.playback }
                    : {}),
                  ...(t.sizeBytes !== void 0 && t.sizeBytes >= 0 ? { sizeBytes: t.sizeBytes } : {}),
                  ...(t.durationMs !== void 0 && t.durationMs >= 0
                    ? { durationMs: t.durationMs }
                    : {}),
                  ...(t.width !== void 0 && t.width > 0 ? { width: t.width } : {}),
                  ...(t.height !== void 0 && t.height > 0 ? { height: t.height } : {}),
                },
              },
            ];
      }
      if (e.type === `canvas` && e.preview) {
        let t = nf(e.preview);
        return t ? [{ type: `canvas`, preview: t, rawText: e.rawText ?? null }] : [];
      }
      if (tf(e, n)) {
        if (c) {
          let t = pf(e.text, l);
          return (
            (d ||= t.audioAsVoice),
            (t.replyTarget?.kind === `id` || (t.replyTarget?.kind === `current` && f === null)) &&
              (f = t.replyTarget),
            t.content
          );
        }
        return [{ type: `text`, text: e.text, name: void 0, args: void 0 }];
      }
      return [{ type: e.type || `text`, text: e.text, name: e.name, args: rn(e) }];
    });
  else if (t.text !== void 0) {
    if (c) {
      let e = pf(t.text, l);
      ((u = e.content), (d = e.audioAsVoice), (f = e.replyTarget));
    } else u = [{ type: `text`, text: t.text }];
  }
  let p = t.timestamp ?? Date.now(),
    m = t.id,
    h = t.__openclaw,
    g = h?.replyToId?.trim() ?? ``;
  g && (f = { kind: `id`, id: g });
  let _ = h?.replyToPreview,
    v = _?.text?.trim() ?? ``,
    y = _?.senderLabel?.trim() ?? ``,
    b = Va({
      id: h?.senderId,
      name: h?.senderName,
      username: h?.senderUsername,
      profileAvatarUrl: h?.senderProfileAvatarUrl,
    }),
    x = t.senderLabel?.trim() ?? ``,
    S = x ? Zd(x) : null,
    C = x ? (S?.display ?? x) : Ba(b),
    ee = b ?? (S ? Va({ id: S.id, ...(S.display === S.id ? {} : { name: S.display }) }) : null);
  return (
    (u = ff(u)),
    {
      role: n,
      content: u,
      timestamp: p,
      id: m,
      senderLabel: C,
      ...(ee ? { sender: ee } : {}),
      ...(d ? { audioAsVoice: !0 } : {}),
      ...(v ? { replyPreview: { text: v, ...(y ? { senderLabel: y } : {}) } } : {}),
      ...(f ? { replyTarget: f } : {}),
    }
  );
}
var hf, gf, K, q, _f, vf, yf, bf, xf, Sf, Cf, wf, Tf, Ef;
function Df() {
  return (Df = e(() => {
    (At(),
      Bt(),
      Mn(),
      an(),
      un(),
      pn(),
      zo(),
      Ua(),
      (hf = /\s+\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/iu),
      (gf = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu),
      (K = Lt()
        .optional()
        .catch(void 0)),
      (q = zt()
        .optional()
        .catch(void 0)),
      (_f = Vt({
        viewId: K,
        serverName: K,
        toolName: K,
        uiResourceUri: K,
        toolCallId: K,
        originSessionKey: K,
      })
        .optional()
        .catch(void 0)),
      (vf = Vt({
        title: K,
        preferredHeight: q,
        url: K,
        viewId: K,
        className: K,
        style: K,
        mcpApp: _f,
      })
        .optional()
        .catch(void 0)),
      (yf = Vt({
        url: K,
        label: K,
        mimeType: K,
        artifactId: K,
        sizeBytes: q,
        durationMs: q,
        width: q,
        height: q,
      })
        .optional()
        .catch(void 0)),
      (bf = Vt({ media_type: K, data: K, url: K })
        .optional()
        .catch(void 0)),
      (xf = Vt({
        text: K,
        source: bf,
        attachment: yf,
        preview: vf,
        rawText: K,
        label: K,
        fileName: K,
        mimeType: K,
        artifactId: K,
        url: K,
        sizeBytes: q,
        durationMs: q,
        width: q,
        height: q,
      })),
      (Sf = Wt(Rt([xf, Ut().transform(() => null)])).transform((e) => e.filter((e) => e !== null))),
      (Cf = Vt({
        replyToId: K,
        replyToPreview: It({ text: K, senderLabel: K })
          .optional()
          .catch(void 0),
      })
        .optional()
        .catch(void 0)),
      (wf = It({ audioAsVoice: Kt(!0).optional(), replyToCurrent: Kt(!0).optional(), replyToId: K })
        .optional()
        .catch(void 0)),
      (Tf = Vt({
        role: K,
        content: Rt([Lt(), Sf])
          .optional()
          .catch(void 0),
        text: K,
        timestamp: q,
        id: K,
        senderLabel: K,
        toolCallId: K,
        tool_call_id: K,
        toolUseId: K,
        tool_use_id: K,
        toolName: K,
        tool_name: K,
        __openclaw: Cf,
        openclawDelivery: wf,
      }).catch({})),
      (Ef = {
        png: `image/png`,
        jpg: `image/jpeg`,
        jpeg: `image/jpeg`,
        webp: `image/webp`,
        gif: `image/gif`,
        heic: `image/heic`,
        heif: `image/heif`,
        ogg: `audio/ogg`,
        oga: `audio/ogg`,
        mp3: `audio/mpeg`,
        wav: `audio/wav`,
        flac: `audio/flac`,
        aac: `audio/aac`,
        opus: `audio/opus`,
        m4a: `audio/mp4`,
        m2a: `audio/mpeg`,
        mp4: `video/mp4`,
        mov: `video/quicktime`,
        pdf: `application/pdf`,
        txt: `text/plain`,
        md: `text/markdown`,
        csv: `text/csv`,
        json: `application/json`,
        zip: `application/zip`,
      }));
  }))();
}
function Of(e, t) {
  let n = typeof e == `string` ? e.trim() : ``;
  return n ? i(n, t) : void 0;
}
function kf(e) {
  return e !== void 0 && Ff.has(e);
}
function Af(e) {
  let t = g(e),
    n = Of(t?.id, 256),
    r = Of(t?.label, 80),
    i = Of(t?.status, 32);
  if (!n || !r || !kf(i)) return null;
  let a = Of(t?.riskLevel, 40),
    o = Of(t?.userAuthorization, 40),
    s = Of(t?.rationale, 2e3);
  return {
    id: n,
    label: r,
    status: i,
    ...(a ? { riskLevel: a } : {}),
    ...(o ? { userAuthorization: o } : {}),
    ...(s ? { rationale: s } : {}),
  };
}
function jf(e) {
  let t = g(e)?.approvalReviews;
  return Array.isArray(t)
    ? t
        .slice(-16)
        .map(Af)
        .filter((e) => e !== null)
    : [];
}
function Mf(e, t, n) {
  return {
    ...(g(e) ?? (e === void 0 ? {} : { toolDetails: e })),
    approvalReviews: [...t],
    ...(n ? { approvalReviewOutcome: n } : {}),
  };
}
function Nf(e) {
  let t = g(e)?.approvalReviewOutcome;
  return t === `approved` || t === `denied` || t === `reviewing` ? t : void 0;
}
function Pf(e, t = []) {
  return t.includes(`denied`) ||
    e.some((e) => [`denied`, `timed_out`, `aborted`].includes(e.status))
    ? `denied`
    : t.includes(`reviewing`) || e.some((e) => e.status === `in_progress`)
      ? `reviewing`
      : t.includes(`approved`) || e.some((e) => e.status === `approved`)
        ? `approved`
        : null;
}
var Ff;
function If() {
  return (If = e(() => {
    Ff = new Set([`in_progress`, `approved`, `denied`, `timed_out`, `aborted`]);
  }))();
}
function Lf(e) {
  let t = 0,
    n = 0;
  for (let r of e) r.kind === `add` ? (t += 1) : r.kind === `del` && (n += 1);
  return { added: t, removed: n };
}
function Rf(e) {
  if (!e.trim()) return null;
  let t = [],
    n = !1;
  for (let r of e.split(`
`)) {
    if (!r) continue;
    if (/^\s*\.\.\.\(truncated\)\.\.\.\s*$/.test(r)) {
      ((n = !0), t.push({ kind: `skip`, text: `` }));
      continue;
    }
    if (/^\s*\.\.\.\s*$/.test(r)) {
      t.push({ kind: `skip`, text: `` });
      continue;
    }
    let e = r.match(/^([+\- ])\s*(\d+) ?(.*)$/s);
    if (!e) return null;
    let [, i, a, o] = e;
    if (!i || !a) return null;
    if (
      (t.push({
        kind: i === `+` ? `add` : i === `-` ? `del` : `ctx`,
        lineNo: Number.parseInt(a, 10),
        text: o ?? ``,
      }),
      t.length > 400)
    ) {
      (t.push({ kind: `skip`, text: `` }), (n = !0));
      break;
    }
  }
  return t.some((e) => e.kind === `add` || e.kind === `del`)
    ? n
      ? { kind: `truncated`, lines: t }
      : { kind: `complete`, lines: t, stat: Lf(t) }
    : null;
}
function zf(e) {
  let t = e
    .replace(
      /\r\n/g,
      `
`,
    )
    .replace(
      /\r/g,
      `
`,
    );
  if (t === ``) return [];
  let n = t.split(`
`);
  return (n.length > 1 && n[n.length - 1] === `` && n.pop(), n);
}
function Bf(e, t, n) {
  if (!n && e.length <= 400 && !t) return e;
  if (!e.some((e) => e.kind === `add` || e.kind === `del`))
    return n && !t
      ? []
      : t
        ? [{ kind: `skip`, text: `` }]
        : [...e.slice(0, 400), { kind: `skip`, text: `` }];
  let r = new Uint8Array(e.length);
  for (let t = 0; t < e.length; t++) {
    let n = e[t];
    if (!n || (n.kind !== `add` && n.kind !== `del`)) continue;
    let i = Math.max(0, t - 3),
      a = Math.min(e.length, t + 4);
    r.fill(1, i, a);
  }
  let i = [],
    a = !1,
    o = t;
  for (let t = 0; t < e.length; t++) {
    if (r[t] === 0) {
      ((a = !0), (o = !0));
      continue;
    }
    if (
      (a && i.at(-1)?.kind !== `skip` && i.push({ kind: `skip`, text: `` }),
      (a = !1),
      i.length >= 400)
    ) {
      o = !0;
      break;
    }
    let n = e[t];
    n && i.push(n);
  }
  return (o && i.at(-1)?.kind !== `skip` && i.push({ kind: `skip`, text: `` }), i);
}
function Vf(e, t, n) {
  let r = zf(e),
    i = zf(t),
    a = r.length > Gf || i.length > Gf,
    o = r.length === i.length && r.every((e, t) => e === i[t]),
    s = a && !o,
    c = r.slice(0, Gf),
    l = i.slice(0, Gf),
    u = c.length,
    d = l.length,
    f = Array.from({ length: u + 1 }, () => Array.from({ length: d + 1 }, () => 0));
  for (let e = u - 1; e >= 0; e--) {
    let t = f[e],
      n = f[e + 1];
    if (!(!t || !n))
      for (let r = d - 1; r >= 0; r--)
        t[r] = c[e] === l[r] ? (n[r + 1] ?? 0) + 1 : Math.max(n[r] ?? 0, t[r + 1] ?? 0);
  }
  let p = [],
    m = 0,
    h = 0;
  for (; m < u && h < d;) {
    let e = c[m],
      t = l[h];
    if (e === void 0 || t === void 0) break;
    e === t
      ? (p.push({ kind: `ctx`, text: e }), m++, h++)
      : (f[m + 1]?.[h] ?? 0) >= (f[m]?.[h + 1] ?? 0)
        ? (p.push({ kind: `del`, text: e }), m++)
        : (p.push({ kind: `add`, text: t }), h++);
  }
  for (; m < u;) {
    let e = c[m];
    (e !== void 0 && p.push({ kind: `del`, text: e }), m++);
  }
  for (; h < d;) {
    let e = l[h];
    (e !== void 0 && p.push({ kind: `add`, text: e }), h++);
  }
  let g = Bf(p, s, n?.compactUnchanged === !0);
  return s ? { kind: `truncated`, lines: g } : { kind: `complete`, lines: g, stat: Lf(p) };
}
function Hf(e, t = 80) {
  let n = zf(e),
    r = [];
  for (let [e, i] of n.slice(0, t).entries()) r.push({ kind: `add`, lineNo: e + 1, text: i });
  return (n.length > t && r.push({ kind: `skip`, text: `` }), r);
}
function Uf(e) {
  return zf(e).length;
}
function Wf(e, t) {
  let n = t?.maxLines ?? 400,
    r = [],
    i = t?.truncated === !0 || e.some((e) => e.kind === `truncated`),
    a = i;
  for (let t of e) {
    if (t.lines.length === 0) continue;
    if (r.length > 0) {
      if (r.length >= n) {
        a = !0;
        break;
      }
      r.push({ kind: `skip`, text: `` });
    }
    let e = n - r.length;
    if (t.lines.length > e) {
      (r.push(...t.lines.slice(0, e)), (a = !0));
      break;
    }
    r.push(...t.lines);
  }
  return (
    a && r.at(-1)?.kind !== `skip` && r.push({ kind: `skip`, text: `` }),
    i
      ? { kind: `truncated`, lines: r }
      : {
          kind: `complete`,
          lines: r,
          stat: e.reduce(
            (e, t) => ({
              added: e.added + (t.kind === `complete` ? t.stat.added : 0),
              removed: e.removed + (t.kind === `complete` ? t.stat.removed : 0),
            }),
            { added: 0, removed: 0 },
          ),
        }
  );
}
var Gf;
function Kf() {
  return (Kf = e(() => {
    Gf = 600;
  }))();
}
function qf(e) {
  if (e === ``) return [];
  let t = e
    .replace(
      /\r\n/g,
      `
`,
    )
    .replace(
      /\r/g,
      `
`,
    ).split(`
`);
  return (t.length > 1 && t.at(-1) === `` && t.pop(), t);
}
function Jf(e, t, n) {
  let r = n.trim(),
    i = { operation: t, sourcePath: r, path: r, lines: [], stat: { added: 0, removed: 0 } };
  return (e.sections.push(i), i);
}
function Yf(e, t, n) {
  (n.kind === `add` ? (t.stat.added += 1) : n.kind === `del` && (t.stat.removed += 1),
    e.storedRows < 400 ? (t.lines.push(n), (e.storedRows += 1)) : (e.truncated = !0));
}
function Xf(e, t) {
  t.lines.length !== 0 && t.lines.at(-1)?.kind !== `skip` && Yf(e, t, { kind: `skip`, text: `` });
}
function Zf(e) {
  let t = e.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  return t
    ? {
        oldLine: Number.parseInt(t[1] ?? ``, 10),
        oldLeft: t[2] === void 0 ? 1 : Number.parseInt(t[2], 10),
        newLine: Number.parseInt(t[3] ?? ``, 10),
        newLeft: t[4] === void 0 ? 1 : Number.parseInt(t[4], 10),
      }
    : {};
}
function Qf(e, t, n, r) {
  let i, a;
  (n.startsWith(`+`)
    ? ((i = `add`),
      (a = r.newLine),
      r.newLine !== void 0 && ((r.newLine += 1), (r.newLeft = Math.max(0, (r.newLeft ?? 0) - 1))))
    : n.startsWith(`-`)
      ? ((i = `del`),
        (a = r.oldLine),
        r.oldLine !== void 0 && ((r.oldLine += 1), (r.oldLeft = Math.max(0, (r.oldLeft ?? 0) - 1))))
      : ((i = `ctx`),
        (a = r.newLine),
        r.oldLine !== void 0 &&
          r.newLine !== void 0 &&
          ((r.oldLine += 1),
          (r.newLine += 1),
          (r.oldLeft = Math.max(0, (r.oldLeft ?? 0) - 1)),
          (r.newLeft = Math.max(0, (r.newLeft ?? 0) - 1)))),
    Yf(e, t, {
      kind: i,
      ...(a === void 0 ? {} : { lineNo: a }),
      text: n === `` ? `` : n.slice(1),
    }));
}
function $f(e) {
  return e.oldLeft !== void 0 && e.oldLeft === 0 && e.newLeft === 0;
}
function ep(e) {
  return e.operation === `update` && e.path !== e.sourcePath
    ? `Move ${e.sourcePath} → ${e.path}`
    : `${e.operation === `add` ? `Add` : e.operation === `delete` ? `Delete` : `Update`} ${e.path}`;
}
function tp(e) {
  if (e.sections.length === 0) return null;
  let t = [...new Set(e.sections.map((e) => e.path).filter(Boolean))],
    n = e.sections.map(({ operation: e, path: t }) => ({ operation: e, path: t })),
    r = e.sections.reduce(
      (e, t) => ({ added: e.added + t.stat.added, removed: e.removed + t.stat.removed }),
      { added: 0, removed: 0 },
    ),
    i = [],
    a = e.truncated,
    o = (e) => {
      i.length < 400 ? i.push(e) : (a = !0);
    };
  for (let t of e.sections) {
    e.sections.length > 1 &&
      (i.length > 0 && i.at(-1)?.kind !== `skip` && o({ kind: `skip`, text: `` }),
      o({ kind: `file`, text: ep(t) }));
    for (let e of t.lines) o(e);
  }
  a && i.at(-1)?.kind !== `skip` && i.push({ kind: `skip`, text: `` });
  let s = e.sections.length === 1 ? e.sections.at(0) : void 0,
    c =
      s && s.operation === `update` && s.sourcePath !== s.path
        ? { from: s.sourcePath, to: s.path }
        : void 0;
  return { paths: t, fileOperations: n, lines: i, stat: r, ...(c ? { move: c } : {}) };
}
function np(e) {
  let t = { sections: [], storedRows: 0, truncated: !1 },
    n = null,
    r = `outside`,
    i = null;
  for (let a of qf(e)) {
    let e = r === `update` ? a.trimEnd() : a.trim(),
      o = e.match(/^\*\*\* (Update|Add|Delete) File: (.+)$/);
    if (o) {
      let e = o[1],
        a = o[2];
      if (!e || !a) continue;
      ((r = e.toLowerCase()), (n = Jf(t, r, a)), (i = null));
      continue;
    }
    let s = r === `update` ? e.match(/^\*\*\* Move to: (.+)$/) : null;
    if (s && n) {
      n.path = s[1]?.trim() ?? n.path;
      continue;
    }
    if (
      !(
        e === `*** Begin Patch` ||
        e === `*** End Patch` ||
        e === `*** End of File` ||
        e.startsWith(`*** Environment ID:`)
      ) &&
      n
    ) {
      if (r === `update` && a.startsWith(`@@`)) {
        (Xf(t, n), (i = Zf(a)));
        continue;
      }
      r === `add` && a.startsWith(`+`)
        ? Yf(t, n, { kind: `add`, lineNo: n.stat.added + 1, text: a.slice(1) })
        : r === `update` &&
          (a === `` || a.startsWith(`+`) || a.startsWith(`-`) || a.startsWith(` `)) &&
          (Qf(t, n, a, i ?? {}), i && $f(i) && (i = null));
    }
  }
  return tp(t);
}
function rp(e) {
  return (e.split(`	`, 1)[0]?.trim() ?? ``).replace(/^[ab]\//, ``);
}
function ip(e, t, n, r, i) {
  let a = rp(n.slice(4)),
    o = rp(r.slice(4)),
    s = a === `/dev/null` ? `add` : o === `/dev/null` ? `delete` : `update`,
    c = o === `/dev/null` ? a : o,
    l = i && t ? t : Jf(e, s, c);
  return ((l.operation = s), (l.sourcePath = a || l.sourcePath), (l.path = c || l.path), l);
}
function ap(e) {
  let t = { sections: [], storedRows: 0, truncated: !1 },
    n = qf(e),
    r = null,
    i = null,
    a = !1;
  for (let e = 0; e < n.length; e++) {
    let o = n[e];
    if (o === void 0) continue;
    let s = o.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (s) {
      let e = s[1],
        n = s[2];
      if (!e || !n) continue;
      ((r = Jf(t, `update`, n)), (r.sourcePath = e), (i = null), (a = !0));
      continue;
    }
    let c = n[e + 1];
    if (!i && o.startsWith(`--- `) && c?.startsWith(`+++ `)) {
      ((r = ip(t, r, o, c, a)), (a = !1), (e += 1));
      continue;
    }
    if (o.startsWith(`@@`)) {
      (r && Xf(t, r), (i = Zf(o)), (a = !1));
      continue;
    }
    /^index |^new file mode |^deleted file mode |^similarity index /.test(o) ||
      (r &&
        i &&
        (o.startsWith(`+`) || o.startsWith(`-`) || o.startsWith(` `)) &&
        (Qf(t, r, o, i), $f(i) && (i = null)));
  }
  return tp(t);
}
function op(e) {
  let t = typeof e == `string` ? e : g(e)?.type;
  return t === `add` || t === `delete` ? t : `update`;
}
function sp(e) {
  let t = g(e),
    n = t?.added,
    r = t?.removed;
  return typeof n == `number` && typeof r == `number` && n >= 0 && r >= 0
    ? { added: Math.trunc(n), removed: Math.trunc(r) }
    : null;
}
function cp(e, t, n) {
  let r = null;
  for (let i of qf(n))
    i.startsWith(`@@`)
      ? (Xf(e, t), (r = Zf(i)))
      : r &&
        (i.startsWith(`+`) || i.startsWith(`-`) || i.startsWith(` `)) &&
        (Qf(e, t, i, r), $f(r) && (r = null));
}
function lp(e) {
  let t = { sections: [], storedRows: 0, truncated: !1 };
  for (let n of e) {
    let e = g(n),
      r = s(e?.path)?.trim();
    if (!e || !r) continue;
    let i = op(e.kind),
      a = Jf(t, i, r),
      o = s(g(e.kind)?.move_path ?? g(e.kind)?.movePath);
    if ((o && (a.path = o.trim()), typeof e.diff == `string`)) {
      if (i === `update`) cp(t, a, e.diff);
      else {
        let n = i === `add` ? `add` : `del`;
        for (let [r, i] of qf(e.diff).entries()) Yf(t, a, { kind: n, lineNo: r + 1, text: i });
      }
    }
    let c = sp(e.stat);
    (c && (a.stat = c), (t.truncated ||= e.diffTruncated === !0));
  }
  return tp(t);
}
function up(e) {
  let t = g(e);
  if (!t) return null;
  if (Array.isArray(t.changes)) {
    let e = lp(t.changes);
    if (e) return e;
  }
  let n = s(t.patch) ?? s(t.input) ?? s(t.diff);
  return n
    ? /(?:^|\n)\s*\*\*\* (?:Begin Patch|Update File:|Add File:|Delete File:)/.test(n)
      ? np(n)
      : ap(n)
    : null;
}
function dp() {
  return (dp = e(() => {
    Kf();
  }))();
}
function fp(e) {
  if (e)
    return (
      s(e.path) ??
      s(e.file_path) ??
      s(e.filePath) ??
      s(e.file) ??
      s(e.filepath) ??
      s(e.filename) ??
      s(e.notebook_path)
    );
}
function pp(e) {
  let t = e.replace(/\\/g, `/`).replace(/\/+$/, ``),
    n = t.lastIndexOf(`/`);
  return n <= 0 ? { base: t || e } : { base: t.slice(n + 1), dir: t.slice(0, n) };
}
function mp(e) {
  let t = [],
    n = 0,
    r = !1,
    i = (e, i) => {
      if (typeof e == `string` && typeof i == `string`) {
        let a = e.length + i.length;
        if (n + a > Lp) {
          r = !0;
          return;
        }
        ((n += a), t.push({ oldText: e, newText: i }));
      }
    };
  if (Array.isArray(e.edits))
    for (let t = 0; t < e.edits.length; t++) {
      if (t >= Ip) {
        r = !0;
        break;
      }
      let n = e.edits[t],
        a = g(n);
      if (
        a &&
        (i(
          a.oldText ?? a.old_string ?? a.oldString ?? a.old_str,
          a.newText ?? a.new_string ?? a.newString ?? a.new_str,
        ),
        r)
      )
        break;
    }
  else
    i(
      e.oldText ?? e.old_string ?? e.oldString ?? e.old_str,
      e.newText ?? e.new_string ?? e.newString ?? e.new_str,
    );
  return { pairs: t, truncated: r };
}
function hp(e) {
  let t = g(e),
    n = t ? s(t.diff) : void 0;
  if (!n) return null;
  let r = Rf(n);
  return r ? { lines: r.lines, ...(r.kind === `complete` ? { stat: r.stat } : {}) } : null;
}
function gp(e) {
  let t = hp(e.details);
  if (t) return t;
  let n = g(e.args);
  if (!n) return null;
  let { pairs: r, truncated: i } = mp(n);
  if (r.length === 0) return i ? { lines: [{ kind: `skip`, text: `` }] } : null;
  let a = Wf(
    r.map((e) => Vf(e.oldText, e.newText)),
    { truncated: i },
  );
  return a.lines.length === 0
    ? null
    : { lines: a.lines, ...(a.kind === `complete` ? { stat: a.stat } : {}) };
}
function _p(e, t) {
  let n = hp(e.details);
  if (n) return n;
  let r = t ? s(t.insert_text) : void 0;
  if (!r) return null;
  let i = Vf(``, r).lines;
  return i.length > 0 ? { lines: i } : null;
}
function vp(e) {
  return up(e);
}
function yp(e) {
  let t = vp(e);
  if (!t) return null;
  if (t.paths.length > 1)
    return {
      kind: `edit`,
      target: `${t.paths.length} files`,
      fileOperations: t.fileOperations,
      diff: t.lines,
      stat: t.stat,
    };
  if (t.move) {
    let e = pp(t.move.from),
      n = pp(t.move.to),
      r = e.dir === n.dir ? e.dir : void 0;
    return {
      kind: `edit`,
      target: r ? `${e.base} → ${n.base}` : `${t.move.from} → ${t.move.to}`,
      targetDetail: r,
      fileOperations: t.fileOperations,
      diff: t.lines,
      stat: t.stat,
    };
  }
  let n = t.paths[0] ? pp(t.paths[0]) : null;
  return {
    kind: `edit`,
    target: n?.base,
    targetDetail: n?.dir,
    fileOperations: t.fileOperations,
    diff: t.lines,
    stat: t.stat,
  };
}
function bp(e) {
  return e.trim().toLowerCase();
}
function xp(e) {
  let t = s(g(e)?.command)?.trim().toLowerCase();
  switch (t) {
    case `view`:
    case `str_replace`:
    case `create`:
    case `insert`:
    case `undo_edit`:
      return t;
    default:
      return;
  }
}
function Sp(e, t) {
  let n = g(t);
  if (Fp.has(bp(e))) return vp(n)?.paths ?? [];
  let r = fp(n);
  return r ? [r] : [];
}
function Cp(e, t) {
  if (Fp.has(bp(e))) return vp(g(t))?.fileOperations;
}
function wp(e, t) {
  let n = bp(e);
  if (jp.has(n))
    switch (xp(t)) {
      case `view`:
        return `read`;
      case `str_replace`:
      case `insert`:
      case `undo_edit`:
        return `edit`;
      case `create`:
        return `write`;
      default:
        return `generic`;
    }
  if (Op.has(n)) return `command`;
  if (kp.has(n)) return `read`;
  if (Ap.has(n) || Fp.has(n)) return `edit`;
  if (Mp.has(n)) return `write`;
  if (Np.has(n)) return `search`;
  if (Pp.has(n)) return `fetch`;
  let r = g(t);
  return r && typeof r.command == `string` && Object.keys(r).length <= 3 ? `command` : `generic`;
}
function Tp(e) {
  let t = g(e.args),
    n = t ?? g(e.details),
    r = bp(e.name);
  if (n) {
    let t = Rp.get(n);
    if (t && t.details === e.details && t.name === r) return t.view;
  }
  let i = Dp(e, t);
  return (n && Rp.set(n, { details: e.details, name: r, view: i }), i);
}
function Ep(e) {
  return (
    e.match(/^\s*(?:\/(?:usr\/)?bin\/)?(?:ba|z|da)?sh\s+-l?c\s+(['"])([\s\S]+)\1\s*$/)?.[2] ?? e
  );
}
function Dp(e, t) {
  let n = wp(e.name, e.args),
    r = bp(e.name),
    i = jp.has(r) ? xp(e.args) : void 0;
  if (n === `command`) {
    let e = t ? s(t.command) : void 0;
    return { kind: n, command: e && Ep(e) };
  }
  if (n === `read`) {
    let e = fp(t);
    if (!e) return { kind: `generic` };
    let { base: r, dir: i } = pp(e);
    return { kind: n, target: r, targetDetail: i };
  }
  if (n === `edit`) {
    if (Fp.has(r)) return yp(t) ?? { kind: `generic` };
    let a = fp(t);
    if (!a) return { kind: `generic` };
    let { base: o, dir: s } = pp(a),
      c = i === `insert` ? _p(e, t) : i === `undo_edit` ? hp(e.details) : gp(e);
    return {
      kind: n,
      target: o,
      targetDetail: s,
      ...(c ? { diff: c.lines, ...(c.stat ? { stat: c.stat } : {}) } : {}),
    };
  }
  if (n === `write`) {
    let r = fp(t);
    if (!r) return { kind: `generic` };
    let { base: a, dir: o } = pp(r),
      c = hp(e.details);
    if (c)
      return {
        kind: n,
        target: a,
        targetDetail: o,
        diff: c.lines,
        ...(c.stat ? { stat: c.stat } : {}),
      };
    let l = g(e.details);
    if (l?.changed === !1) return { kind: n, target: a, targetDetail: o };
    let u = t ? s(i === `create` ? t.file_text : t.content) : void 0;
    return u
      ? {
          kind: n,
          target: a,
          targetDetail: o,
          diff: Hf(u),
          ...(l && l.created !== !0 ? {} : { stat: { added: Uf(u), removed: 0 } }),
        }
      : { kind: n, target: a, targetDetail: o };
  }
  if (n === `search`) {
    let e = t ? (s(t.pattern) ?? s(t.query) ?? s(t.glob)) : void 0,
      r = fp(t) ?? (t ? s(t.path) : void 0);
    return !e && !r
      ? { kind: `generic` }
      : { kind: n, target: e ?? r, targetDetail: e ? r : void 0 };
  }
  if (n === `fetch`) {
    let e = t ? s(t.url) : void 0;
    return e ? { kind: n, target: e } : { kind: `generic` };
  }
  return { kind: `generic` };
}
var Op, kp, Ap, jp, Mp, Np, Pp, Fp, Ip, Lp, Rp;
function zp() {
  return (zp = e(() => {
    (Kf(),
      dp(),
      (Op = new Set([`bash`, `exec`, `shell`, `run_command`, `run_terminal_cmd`])),
      (kp = new Set([`read`, `read_file`, `readfile`, `notebookread`, `notebook_read`])),
      (Ap = new Set([
        `edit`,
        `edit_file`,
        `multiedit`,
        `multi_edit`,
        `notebookedit`,
        `notebook_edit`,
      ])),
      (jp = new Set([`str_replace_editor`, `str_replace_based_edit_tool`])),
      (Mp = new Set([`write`, `write_file`, `create_file`])),
      (Np = new Set([`grep`, `find`, `glob`, `ls`, `list`, `codebase_search`])),
      (Pp = new Set([`web_fetch`, `webfetch`, `fetch`])),
      (Fp = new Set([`apply_patch`, `applypatch`, `patch`])),
      (Ip = 8),
      (Lp = 12e4),
      (Rp = new WeakMap()));
  }))();
}
function Bp(e) {
  if (typeof e.messageId == `string` && e.messageId.trim()) return e.messageId;
  let t = e.__openclaw,
    n = g(t);
  return typeof n?.id == `string` && n.id.trim() ? n.id : void 0;
}
function Vp(e) {
  return Array.isArray(e) ? e.filter((e) => !!e && typeof e == `object`) : [];
}
function Hp(e) {
  if (typeof e != `string`) return e;
  let t = e.trim();
  if (!t || (!t.startsWith(`{`) && !t.startsWith(`[`))) return e;
  try {
    return JSON.parse(t);
  } catch {
    return e;
  }
}
function Up(e) {
  let t = e.trim();
  if (!t.startsWith(`{`) || !t.endsWith(`}`)) return null;
  try {
    return h(JSON.parse(t));
  } catch {
    return null;
  }
}
function Wp(e) {
  if (typeof e.text == `string`) return e.text;
  if (typeof e.content == `string`) return e.content;
  if (Array.isArray(e.content)) {
    let t = e.content.flatMap((e) => {
      if (!e || typeof e != `object`) return [];
      let t = e.text;
      return typeof t == `string` ? [t] : [];
    });
    if (t.length > 0)
      return t.join(`
`);
  }
}
function Gp(e) {
  let t = e.isError ?? e.is_error;
  return typeof t == `boolean` ? t : void 0;
}
function Kp(...e) {
  for (let t of e) {
    let e = h(t),
      n = e?.exitCode ?? e?.exit_code;
    if (typeof n == `number` && Number.isInteger(n)) return n;
  }
}
function qp(e) {
  return typeof e == `string` && mm.has(e.trim().toLowerCase());
}
function Jp(e) {
  if (!e) return !1;
  let t = e.trim();
  if (!t) return !1;
  if (fm.test(t)) return !0;
  if (t.length > pm || !t.startsWith(`{`) || !t.endsWith(`}`)) return !1;
  let n;
  try {
    n = JSON.parse(t);
  } catch {
    return !1;
  }
  if (!_(n)) return !1;
  let r = n,
    i = Gp(r);
  if (i !== void 0) return i;
  if (`error` in r) {
    let e = r.error;
    if (typeof e == `string`) return e.trim().length > 0;
    if (typeof e == `boolean`) return e;
    if (e && typeof e == `object`) return !0;
  }
  return qp(r.status);
}
function Yp(e) {
  return g(e.details)?.status === `skipped`;
}
function Xp(e) {
  return Yp(e) ? !1 : e.isError === void 0 ? Jp(e.outputText) : e.isError;
}
function Zp(e, t) {
  return Yp(e)
    ? `skipped`
    : Xp(e)
      ? `failed`
      : t === !0 && e.live === !0 && e.completed !== !0
        ? `running`
        : e.completed === !0 || (e.live !== !0 && e.outputText !== void 0)
          ? `succeeded`
          : `unknown`;
}
function Qp(e) {
  return Jt(g(e.details)?.deniedReason === `steering` ? `toolSkippedForUpdate` : `toolSkipped`);
}
function $p(e, t) {
  let n = ln(e, t);
  return n?.surface === `assistant_message` ? { ...n, surface: `assistant_message` } : void 0;
}
function em(e) {
  let t = sn(e);
  return t?.surface === `assistant_message` ? { ...t, surface: `assistant_message` } : void 0;
}
function tm(e, t) {
  return (
    en(e) ||
    (typeof e.callId == `string` && e.callId.trim()) ||
    (typeof t.toolCallId == `string` && t.toolCallId.trim()) ||
    (typeof t.tool_call_id == `string` && t.tool_call_id.trim()) ||
    (typeof t.toolUseId == `string` && t.toolUseId.trim()) ||
    (typeof t.tool_use_id == `string` && t.tool_use_id.trim()) ||
    void 0
  );
}
function nm(e, t) {
  return (
    (typeof e.name == `string` && e.name.trim()) ||
    (typeof t.toolName == `string` && t.toolName.trim()) ||
    (typeof t.tool_name == `string` && t.tool_name.trim()) ||
    `tool`
  );
}
function rm(e, t, n, r = `tool`) {
  let i = tm(e, t);
  return i ? `${r}:${i}` : `${r}:${nm(e, t)}:${n}`;
}
function im(e) {
  if (e != null) {
    if (typeof e == `string`) return e;
    try {
      return JSON.stringify(e, null, 2);
    } catch {
      return typeof e == `number` || typeof e == `boolean` || typeof e == `bigint`
        ? String(e)
        : typeof e == `symbol`
          ? e.description
            ? `Symbol(${e.description})`
            : `Symbol()`
          : Object.prototype.toString.call(e);
    }
  }
}
function am(e) {
  let t = e?.trim().replace(/\s+/g, ` `);
  if (t) return t.replace(/^with\s+/i, ``).trim() || t;
}
function om(e) {
  return am(e)
    ?.toLowerCase()
    .replace(/[\s._-]+/g, ``);
}
function sm(e, t) {
  let n = am(e);
  if (!n) return;
  let r = om(n),
    i = om(t);
  return r && i && r === i ? void 0 : n;
}
function cm(e) {
  let t = am(e);
  if (t) return i(t, 120);
}
function lm(e) {
  if (!_(e)) return;
  let t = e;
  for (let e of hm) {
    let n = t[e];
    if (typeof n != `string`) continue;
    let r = n.split(/\r\n?|\n/).find((e) => e.trim().length > 0),
      i = cm(r ? Te(r) : void 0);
    if (i) return i;
  }
}
function um(e, t = `tool`) {
  let n = e,
    r = Vp(n.content),
    i = Gp(n),
    a = n.__openclawToolStreamLive === !0,
    o = h(n.__openclawToolStreamDiffStat),
    s =
      typeof o?.added == `number` &&
      Number.isInteger(o.added) &&
      o.added >= 0 &&
      typeof o.removed == `number` &&
      Number.isInteger(o.removed) &&
      o.removed >= 0
        ? { added: o.added, removed: o.removed }
        : void 0,
    c = [],
    l = new WeakSet(),
    u = Bp(n);
  for (let e = 0; e < r.length; e++) {
    let o = r[e] ?? {};
    if (
      on(o.type) ||
      (typeof o.name == `string` && (o.arguments != null || o.args != null || o.input != null))
    ) {
      let r = Hp(o.arguments ?? o.args ?? o.input),
        i = tm(o, n),
        l = o.details ?? n.details;
      c.push({
        id: rm(o, n, e, t),
        ...(i ? { callId: i } : {}),
        name: nm(o, n),
        args: r,
        inputText: im(r),
        ...(l === void 0 ? {} : { details: l }),
        ...(a ? { live: !0, completed: n.__openclawToolStreamResultReceived === !0 } : {}),
        ...(s ? { liveDiffStat: s } : {}),
        messageId: u,
      });
      continue;
    }
    if (cn(o.type)) {
      let r = nm(o, n),
        s = rm(o, n, e, t),
        d = tm(o, n),
        f =
          c.find((e) => e.id === s) ??
          c.find((e) => (!d || !e.callId) && e.name === r && e.outputText === void 0 && !l.has(e)),
        p = Wp(o),
        m = o.details ?? n.details,
        h = em(m) ?? $p(p, r),
        g = Gp(o) ?? i,
        _ = Kp(o, m, p ? Up(p) : void 0, n);
      if (f) {
        (l.add(f),
          (f.callId ??= d),
          a || (f.completed = !0),
          (f.outputText = p),
          (f.preview = h),
          m !== void 0 && (f.details = m),
          g !== void 0 && (f.isError = g),
          _ !== void 0 && (f.exitCode = _));
        continue;
      }
      c.push({
        id: s,
        ...(d ? { callId: d } : {}),
        name: r,
        completed: !0,
        outputText: p,
        ...(m === void 0 ? {} : { details: m }),
        messageId: u,
        ...(g === void 0 ? {} : { isError: g }),
        ...(_ === void 0 ? {} : { exitCode: _ }),
        preview: h,
      });
    }
  }
  let d = typeof n.role == `string` ? n.role.toLowerCase() : ``;
  if (
    ($d(e) ||
      d === `tool` ||
      d === `function` ||
      typeof n.toolName == `string` ||
      typeof n.tool_name == `string`) &&
    c.length === 0
  ) {
    let r =
        (typeof n.toolName == `string` && n.toolName) ||
        (typeof n.tool_name == `string` && n.tool_name) ||
        `tool`,
      a = Fc(e) ?? void 0,
      o = tm({}, n),
      s = Kp(n, n.details, a ? Up(a) : void 0);
    c.push({
      id: rm({}, n, 0, t),
      ...(o ? { callId: o } : {}),
      name: r,
      completed: $d(e) || d === `tool` || d === `function`,
      outputText: a,
      ...(n.details === void 0 ? {} : { details: n.details }),
      messageId: u,
      ...(i === void 0 ? {} : { isError: i }),
      ...(s === void 0 ? {} : { exitCode: s }),
      preview: em(n.details) ?? $p(a, r),
    });
  }
  return c;
}
function dm(e, t = `tool`) {
  if (!e || typeof e != `object`) return um(e, t);
  let n = gm.get(e);
  n || ((n = new Map()), gm.set(e, n));
  let r = n.get(t);
  if (r) return r;
  let i = um(e, t);
  return (n.set(t, i), i);
}
var fm, pm, mm, hm, gm;
function _m() {
  return (_m = e(() => {
    (an(),
      un(),
      qt(),
      it(),
      Gc(),
      Df(),
      (fm = /^tool not found\.?$/i),
      (pm = 2e4),
      (mm = new Set([`error`, `failed`, `timeout`])),
      (hm = [`message`, `prompt`, `task`, `query`, `text`, `description`]),
      (gm = new WeakMap()));
  }))();
}
function vm(e, t, n) {
  let r = e.files[t];
  r.calls += 1;
  for (let e of n) e.trim() && r.paths.add(e.trim());
}
function ym(e, t) {
  if (Yp(t)) {
    e.skipped++;
    return;
  }
  if (t.name === `enterprise_knowledge_search` || t.name === `enterprise_knowledge_get`) {
    e[t.name === `enterprise_knowledge_search` ? `knowledgeSearches` : `knowledgeReads`]++;
    return;
  }
  let n = wp(t.name, t.args),
    r = Cp(t.name, t.args);
  if (r)
    for (let { operation: t, path: n } of r)
      vm(e, t === `add` ? `write` : t === `delete` ? `delete` : `edit`, [n]);
  else {
    let r = Sp(t.name, t.args);
    switch (n) {
      case `command`:
        e.commands += 1;
        break;
      case `read`:
        vm(e, `read`, r);
        break;
      case `edit`:
        vm(e, `edit`, r);
        break;
      case `write`:
        vm(e, `write`, r);
        break;
      case `search`:
        e.searches += 1;
        break;
      case `fetch`:
        e.fetches += 1;
        break;
      default:
        ((e.others += 1), e.otherNames.add(t.name));
    }
  }
}
function bm(e, t, n) {
  return j(e === 1 ? t : n, { count: String(e) });
}
function xm(e, t) {
  return t.size > 0 ? t.size : e;
}
function Sm(e) {
  let t = {
    commands: 0,
    files: {
      read: { calls: 0, paths: new Set() },
      edit: { calls: 0, paths: new Set() },
      write: { calls: 0, paths: new Set() },
      delete: { calls: 0, paths: new Set() },
    },
    searches: 0,
    fetches: 0,
    knowledgeSearches: 0,
    knowledgeReads: 0,
    otherNames: new Set(),
    others: 0,
    skipped: 0,
  };
  for (let n of e) ym(t, n);
  let n = [];
  (t.skipped > 0 && n.push(Jt(`toolGroupSkipped`, { count: String(t.skipped) })),
    t.commands > 0 &&
      n.push(
        bm(t.commands, `chat.toolCards.group.commandsOne`, `chat.toolCards.group.commandsMany`),
      ));
  for (let [e, r, i] of [
    [`read`, `readsOne`, `readsMany`],
    [`edit`, `editsOne`, `editsMany`],
    [`write`, `writesOne`, `writesMany`],
    [`delete`, `deletesOne`, `deletesMany`],
  ]) {
    let { calls: a, paths: o } = t.files[e];
    a > 0 && n.push(bm(xm(a, o), `chat.toolCards.group.${r}`, `chat.toolCards.group.${i}`));
  }
  (t.searches > 0 &&
    n.push(bm(t.searches, `chat.toolCards.group.searchesOne`, `chat.toolCards.group.searchesMany`)),
    t.fetches > 0 &&
      n.push(bm(t.fetches, `chat.toolCards.group.fetchesOne`, `chat.toolCards.group.fetchesMany`)));
  for (let e of [`knowledgeSearches`, `knowledgeReads`])
    t[e] > 0 && n.push(j(`chat.toolCards.group.${e}`, { count: String(t[e]) }));
  if (t.others > 0) {
    let e = [...t.otherNames].slice(0, 2).join(`, `);
    n.push(
      t.otherNames.size <= 2 && e
        ? j(
            t.others > t.otherNames.size
              ? `chat.toolCards.group.namedToolRepeated`
              : `chat.toolCards.group.namedTool`,
            { names: e, count: String(t.others) },
          )
        : bm(t.others, `chat.toolCards.group.otherOne`, `chat.toolCards.group.otherMany`),
    );
  }
  if (n.length === 0)
    return bm(e.length, `chat.toolCards.group.emptyOne`, `chat.toolCards.group.emptyMany`);
  let r = n.join(`, `);
  return r.charAt(0).toUpperCase() + r.slice(1);
}
function Cm() {
  return (Cm = e(() => {
    (qt(), M(), zp(), _m());
  }))();
}
function wm(e) {
  return typeof e.itemId == `string` && e.itemId.trim().length > 0;
}
function Tm(e) {
  return e.boundaryMarker !== !0 && !wm(e);
}
function Em(e, t) {
  return t.trim() && (e === null || t.startsWith(e)) ? t : e;
}
function Dm(e, t) {
  return !t || !e.startsWith(t) ? e : e.slice(t.length).trimStart();
}
function Om() {
  return (Om = e(() => {}))();
}
function km(e) {
  return j(Jm[e]);
}
function Am(e) {
  return Ym[e];
}
function jm(e) {
  switch (e.runtime) {
    case `subagent`:
      return j(`tasksPage.runtime.subagent`);
    case `cron`:
      return j(`tasksPage.runtime.cron`);
    case `acp`:
      return j(`tasksPage.runtime.acp`);
    case `cli`:
      return j(`tasksPage.runtime.cli`);
    default:
      return j(`tasksPage.runtime.unknown`);
  }
}
function Mm(e) {
  return e.title ?? e.kind ?? (e.runtime ? jm(e) : j(`tasksPage.untitled`));
}
function Nm(e) {
  return e.status === `queued` || e.status === `running`
    ? (e.progressSummary ?? null)
    : e.status === `failed` || e.status === `timed_out`
      ? (e.error ?? e.terminalSummary ?? e.progressSummary ?? null)
      : (e.terminalSummary ?? e.error ?? e.progressSummary ?? null);
}
function Pm(e) {
  return e.status === `queued` || e.status === `running`;
}
function Fm(e) {
  if (typeof e == `number`) return e;
  if (typeof e == `string`) {
    let t = Date.parse(e);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}
function Im(e, t, n) {
  let r = n.prompt ?? t.prompt;
  return r && e.prompt !== r ? { ...e, prompt: r } : e;
}
function Lm(e, t, n = `detail`) {
  if (!t) return e;
  let r = Fm(e.updatedAt ?? e.endedAt ?? e.createdAt),
    i = Fm(t.updatedAt ?? t.endedAt ?? t.createdAt);
  if (i > r) return Im(t, e, t);
  if (i < r) return e;
  let a = Pm(e);
  if (a !== Pm(t)) return Im(a ? t : e, e, t);
  if (!a) return n === `event` ? Im(t, e, t) : e;
  if (e.status === `running` && t.status === `queued`) return Im(e, e, t);
  if (e.status === `queued` && t.status === `running`) return Im(t, e, t);
  let o = e.toolUseCount ?? 0,
    s = t.toolUseCount ?? 0;
  return Im(o > s ? e : s > o || n !== `detail` ? t : e, e, t);
}
function Rm(e) {
  return e.toSorted((e, t) => {
    let n = Fm(t.updatedAt) - Fm(e.updatedAt);
    return n === 0 ? (e.id < t.id ? -1 : +(e.id > t.id)) : n;
  });
}
function zm(e) {
  let t = Rm(e);
  return {
    active: t.filter((e) => e.status === `queued` || e.status === `running`),
    recent: t.filter((e) => e.status !== `queued` && e.status !== `running`).slice(0, 50),
  };
}
function Bm(e) {
  return bt(jt, e)
    ? {
        tasks: Rm(e.tasks.map(Zc).filter((e) => e !== null)),
        ...(e.nextCursor === void 0 ? {} : { nextCursor: e.nextCursor }),
      }
    : null;
}
function Vm(e) {
  if (!bt(Tt, e)) return null;
  let t = Zc(e.task);
  return t ? { task: t, toolMessages: e.toolMessages ?? [] } : null;
}
function Hm(e) {
  return Vm(e)?.task ?? null;
}
function Um(...e) {
  let t = new Map();
  for (let n of e)
    for (let e of n) {
      let n = t.get(e.id);
      t.set(e.id, n ? Lm(n, e, `snapshot`) : e);
    }
  return Rm([...t.values()]);
}
function Wm(e) {
  if (!bt(yt, e)) return null;
  let t = v(e.reason),
    n = Zc(e.task);
  return {
    found: e.found,
    cancelled: e.cancelled,
    ...(t ? { reason: t } : {}),
    ...(n ? { task: n } : {}),
  };
}
function Gm(e) {
  return bt(Ot, e)
    ? {
        results: e.results.map((e) => {
          let t = Zc(e.task),
            { task: n, ...r } = e;
          return { ...r, ...(t ? { task: t } : {}) };
        }),
      }
    : null;
}
function Km(e) {
  if (!_(e)) return null;
  if (e.action === `restored`) return { action: `restored` };
  if (e.action === `deleted`) {
    let t = v(e.taskId);
    return t ? { action: `deleted`, taskId: t } : null;
  }
  if (e.action === `upserted`) {
    let t = Zc(e.task);
    return t ? { action: `upserted`, task: t } : null;
  }
  return null;
}
function qm(e, t) {
  let n = Km(t);
  if (!n || n.action === `restored`) return { tasks: [...e], refetch: !0 };
  if (n.action === `deleted`) return { tasks: Rm(e.filter((e) => e.id !== n.taskId)), refetch: !1 };
  let r = e.find((e) => e.id === n.task.id);
  return {
    tasks: Rm([r ? Lm(r, n.task, `event`) : n.task, ...e.filter((e) => e.id !== n.task.id)]),
    refetch: !1,
  };
}
var Jm, Ym;
function Xm() {
  return (Xm = e(() => {
    (Mt(),
      kt(),
      M(),
      Qc(),
      (Jm = {
        queued: `tasksPage.status.queued`,
        running: `tasksPage.status.running`,
        completed: `tasksPage.status.completed`,
        failed: `tasksPage.status.failed`,
        cancelled: `tasksPage.status.cancelled`,
        timed_out: `tasksPage.status.timedOut`,
      }),
      (Ym = {
        queued: `chip-warn`,
        running: `chip-warn`,
        completed: `chip-ok`,
        failed: `chip-danger`,
        cancelled: ``,
        timed_out: `chip-danger`,
      }));
  }))();
}
function Zm(e) {
  return e ? (fh[e] ?? `puzzle`) : `puzzle`;
}
function Qm(e) {
  return {
    icon: Zm(e?.emoji),
    title: e?.title,
    label: e?.label,
    detailKeys: e?.detailKeys,
    actions: e?.actions,
  };
}
function $m(e) {
  if (!_(e) || typeof e.skill != `string`) return;
  let t = e.skill
    .replace(/-skill$/u, ``)
    .split(/[-_]/u)
    .filter(Boolean)
    .map((e) => `${e.slice(0, 1).toUpperCase()}${e.slice(1)}`)
    .join(` `);
  return t ? `Skill Script · ${t}` : void 0;
}
function eh(e) {
  if (!e) return e;
  for (let t of [
    { re: /^\/Users\/[^/]+(\/|$)/, replacement: `~$1` },
    { re: /^\/home\/[^/]+(\/|$)/, replacement: `~$1` },
    { re: /^C:\\Users\\[^\\]+(\\|$)/i, replacement: `~$1` },
  ])
    if (t.re.test(e)) return e.replace(t.re, t.replacement);
  return e;
}
function th(e) {
  let t = Ln(e.name),
    n = l(t),
    r = hh[n],
    i = r?.icon ?? mh.icon ?? `puzzle`,
    a = r?.title ?? Bn(t),
    o = n === `skill_script` ? ($m(e.args) ?? a) : (r?.label ?? a),
    s = Fn({
      toolKey: n,
      args: e.args,
      meta: e.meta,
      spec: r,
      fallbackDetailKeys: mh.detailKeys,
      detailMode: `first`,
      toolDetailMode: e.detailMode,
      detailCoerce: { includeFalsy: !0 },
    }),
    { verb: c } = s,
    { detail: u } = s;
  return ((u &&= eh(u)), { name: t, icon: i, title: a, label: o, verb: c, detail: u });
}
function nh(e) {
  return kn(e.detail, { prefixWithWith: !0 });
}
function rh(e) {
  return e === uh || e.startsWith(`${uh}/`) || e === lh || e.startsWith(`${lh}/`);
}
function ih(e) {
  return e.protocol === `http:` || e.protocol === `https:`;
}
function ah(e, t = !1) {
  try {
    let n = new URL(e, `http://localhost`);
    return n.origin === `http://localhost`
      ? rh(n.pathname)
        ? `${n.pathname}${n.search}${n.hash}`
        : void 0
      : !t || !ih(n)
        ? void 0
        : n.toString();
  } catch {
    return;
  }
}
function oh(e) {
  let t = e?.trim();
  return !!(t && ah(t, !1));
}
function sh(e, t, n = !1) {
  let r = e?.trim();
  if (!r) return;
  let i = ah(r, n);
  if (i) {
    if (!t?.trim()) return i;
    try {
      let e = new URL(t),
        n = e.pathname.replace(/\/+$/, ``);
      if (!n.startsWith(dh)) return i;
      let r = new URL(i, e.origin);
      return rh(r.pathname)
        ? ((r.protocol = e.protocol),
          (r.username = e.username),
          (r.password = e.password),
          (r.host = e.host),
          (r.pathname = `${n}${r.pathname}`),
          r.toString())
        : i;
    } catch {
      return i;
    }
  }
}
function ch(e, t) {
  if (t === `strict` || (t === `scripts` && e === `strict`)) return ``;
  if (t === `scripts`) return `allow-scripts`;
  switch (e) {
    case `strict`:
      return ``;
    case `trusted`:
      return `allow-scripts allow-same-origin`;
    default:
      return `allow-scripts`;
  }
}
var lh, uh, dh, fh, ph, mh, hh;
function gh() {
  return (gh = e(() => {
    (Dt(),
      An(),
      (lh = `/__openclaw__/a2ui`),
      (uh = `/__openclaw__/canvas`),
      (dh = `/__openclaw__/cap`),
      (fh = {
        "🧩": `puzzle`,
        "🛠️": `wrench`,
        "🧰": `wrench`,
        "📖": `fileText`,
        "✍️": `edit`,
        "📝": `penLine`,
        "📎": `paperclip`,
        "🌐": `globe`,
        "📺": `monitor`,
        "🧾": `fileText`,
        "🔐": `settings`,
        "💻": `monitor`,
        "🔌": `plug`,
        "💬": `messageSquare`,
      }),
      (ph = Et),
      (mh = Qm(ph.fallback ?? { emoji: `🧩` })),
      (hh = Object.fromEntries(Object.entries(ph.tools ?? {}).map(([e, t]) => [e, Qm(t)]))));
  }))();
}
function J(e, ...t) {
  return { id: e, label: `shortcutsOverlay.labels.${e}`, combos: t };
}
function _h(e, t) {
  return { id: e, label: `shortcutsOverlay.sections.${e}`, entries: t };
}
function vh(e = `enter`) {
  return e === `modifier-enter`
    ? yh.map((e) =>
        e.entries.some((e) => bh.has(e.id))
          ? _h(
              e.id,
              e.entries.map((e) => (bh.has(e.id) ? J(e.id, E.modifiedEnter) : e)),
            )
          : e,
      )
    : yh;
}
var yh, bh;
function xh() {
  return (xh = e(() => {
    (oe(),
      (yh = [
        _h(`general`, [
          J(`commandPalette`, E.commandPalette),
          J(`keyboardShortcuts`, E.keyboardShortcuts),
          J(`toggleSidebar`, E.toggleSidebar),
          J(`debugOverlay`, E.debugOverlay),
          J(`appearanceSettings`, E.appearanceSettings),
          J(`startNewSession`, E.sendMessage),
          J(`closeDialog`, E.escape),
        ]),
        _h(`chat`, [
          J(`sendMessage`, E.sendMessage),
          J(`newline`, E.newline),
          J(`steerImmediately`, E.modifiedEnter),
          J(`historyRecall`, E.historyPrevious, E.historyNext),
          J(`transcriptSearch`, E.transcriptSearch),
          J(`clearReply`, E.escape),
          J(`stopResponse`, E.escape),
          J(`cancelDictation`, E.escape),
          J(`saveQueuedMessage`, E.modifiedEnter),
        ]),
        _h(`panels`, [J(`terminalPanel`, E.terminalPanel), J(`workspaceFiles`, E.workspaceFiles)]),
        _h(`sidebar`, [
          J(`toggleSessionSelect`, E.toggleSessionSelect),
          J(`extendSessionSelect`, E.extendSessionSelect),
        ]),
        _h(`imageViewer`, [
          J(`zoomIn`, E.zoomIn),
          J(`zoomOut`, E.zoomOut),
          J(`zoomReset`, E.zoomReset),
        ]),
        _h(`approvals`, [
          J(`approveOnce`, E.modifiedEnter),
          J(`approveAlways`, E.approveAlways),
          J(`denyApproval`, E.denyApproval),
        ]),
      ]),
      (bh = new Set([`sendMessage`, `startNewSession`])));
  }))();
}
function Sh(e) {
  let t = [],
    n = new Set(Ch);
  for (let i of (e ?? ``).split(/\s+/)) {
    let e = r(i);
    !e || n.has(e) || (n.add(e), t.push(e));
  }
  return [...Ch, ...t].join(` `);
}
var Ch, wh;
function Th() {
  return (Th = e(() => {
    ((Ch = [`noopener`, `noreferrer`]), (wh = `_blank`));
  }))();
}
function Eh(e) {
  return !_(e) ||
    typeof e.step != `string` ||
    (e.status !== `pending` && e.status !== `in_progress` && e.status !== `completed`)
    ? null
    : { status: e.status, step: e.step };
}
function Dh(e, t) {
  if (!_(e)) throw Error(`Progress card response was invalid`);
  let n = e.card;
  if (n === null) return null;
  if (!_(n)) throw Error(`Progress card response was invalid`);
  let r = n.markdown,
    i = n.revision,
    a = n.updatedAt,
    o = n.steps;
  if (
    n.sessionKey !== t ||
    (r !== void 0 && typeof r != `string`) ||
    (o !== void 0 && !Array.isArray(o)) ||
    typeof i != `number` ||
    !Number.isInteger(i) ||
    i < 1 ||
    typeof a != `number` ||
    !Number.isInteger(a)
  )
    throw Error(`Progress card response did not match the requested session`);
  let s = Array.isArray(o) ? o.map(Eh) : void 0;
  if (s?.some((e) => e === null)) throw Error(`Progress card response contained invalid steps`);
  let c = s?.filter((e) => e !== null);
  if (r === void 0 && (!c || c.length === 0))
    throw Error(`Progress card response contained no content`);
  return {
    sessionKey: t,
    revision: i,
    updatedAt: a,
    ...(r === void 0 ? {} : { markdown: r }),
    ...(c && c.length > 0 ? { steps: c } : {}),
  };
}
function Oh(e) {
  let t = new Map(),
    n = new Map(),
    r = new Map(),
    i = new Map(),
    a = new Map(),
    o = new Set(),
    s = e.snapshot.client,
    c = !1,
    l = null,
    u = null,
    d = () => {
      for (let e of o) e();
    },
    f = () => new Set(Array.from(t.values()).flatMap((e) => Array.from(e))),
    p = (e, t) => {
      for (n.delete(e), n.set(e, t); n.size > Nh;) {
        let e = f(),
          t = [...n.keys()].find((t) => !e.has(t));
        if (t === void 0) break;
        n.delete(t);
      }
    },
    m = () =>
      e.snapshot.phase === `connected` && e.snapshot.client !== null && Nt(e.snapshot, Ah) === !0,
    h = async (t) => {
      let o = t.trim();
      if (!o || !m()) return null;
      let s = n.get(o);
      if (s) return (p(o, s), s.card);
      let c = i.get(o);
      if (c) return c;
      let l = e.snapshot.client;
      if (!l) return null;
      r.delete(o) && d();
      let u = a.get(o) ?? 0,
        f = l,
        h = l
          .request(Ah, { sessionKey: o })
          .then((t) => {
            let n = Dh(t, o);
            return (a.get(o) ?? 0) !== u || e.snapshot.client !== f
              ? null
              : (p(o, { card: n, revision: n?.revision ?? null }), d(), n);
          })
          .catch((t) => {
            if ((a.get(o) ?? 0) === u && e.snapshot.client === f) {
              let e =
                t instanceof dt &&
                _(t.details) &&
                t.details.code === `SESSION_PARTICIPATION_REQUIRED`;
              (r.set(o, e ? `access-denied` : `unavailable`), d());
            }
            throw t;
          })
          .finally(() => {
            i.get(o) === h && i.delete(o);
          });
      return (i.set(o, h), h);
    },
    g = () => {
      for (let e of f()) h(e).catch(() => void 0);
    },
    v = (e) => {
      let t = e.client !== s,
        o = m(),
        l = o && !c;
      if (((c = o), !(!t && !l))) {
        if (t) {
          s = e.client;
          for (let e of i.keys()) a.set(e, (a.get(e) ?? 0) + 1);
          (n.clear(), r.clear(), i.clear(), d());
        }
        g();
      }
    },
    y = (e) => {
      if (e.event !== Mh || !_(e.payload)) return;
      let t = e.payload.sessionKey,
        o = e.payload.revision;
      if (
        !(typeof t != `string` || (o !== null && (typeof o != `number` || !Number.isInteger(o)))) &&
        n.get(t)?.revision !== o
      ) {
        if (o === null) {
          (a.set(t, (a.get(t) ?? 0) + 1), r.delete(t), p(t, { card: null, revision: null }), d());
          return;
        }
        if ((a.set(t, (a.get(t) ?? 0) + 1), n.delete(t), r.delete(t), f().has(t))) {
          let e = i.get(t);
          e
            ? e.finally(() => void h(t).catch(() => void 0)).catch(() => void 0)
            : h(t).catch(() => void 0);
        }
      }
    },
    b = () => {
      l || u || ((c = m()), (l = e.subscribe(v)), (u = e.subscribeEvents(y)));
    },
    x = () => {
      t.size > 0 || o.size > 0 || (l?.(), u?.(), (l = null), (u = null), i.clear());
    },
    S = (e, n) => {
      let r = new Set(n.map((e) => e.trim()).filter(Boolean));
      if (r.size === 0) {
        (t.delete(e), x());
        return;
      }
      (t.set(e, r), b());
      for (let e of r) h(e).catch(() => void 0);
    };
  return {
    watch: S,
    unwatch: (e) => S(e, []),
    load: h,
    dismiss: async (t) => {
      let r = e.snapshot.client;
      if (!r) return !1;
      let i = await r.request(jh, { sessionKey: t.sessionKey, expectedRevision: t.revision }),
        a = i.card === null;
      return (
        a && n.get(t.sessionKey)?.revision === t.revision
          ? (p(t.sessionKey, { card: null, revision: null }), d())
          : i.card && (p(t.sessionKey, { card: i.card, revision: i.card.revision }), d()),
        a
      );
    },
    get: (e) => n.get(e)?.card,
    getError: (e) => r.get(e),
    subscribe: (e) => (
      o.add(e),
      b(),
      () => {
        (o.delete(e), x());
      }
    ),
  };
}
function kh(e) {
  let t = Ph.get(e);
  if (t) return t;
  let n = Oh(e);
  return (Ph.set(e, n), n);
}
var Ah, jh, Mh, Nh, Ph;
function Fh() {
  return (Fh = e(() => {
    (vt(),
      Ft(),
      (Ah = `progressCard.get`),
      (jh = `progressCard.put`),
      (Mh = `progressCard.changed`),
      (Nh = 100),
      (Ph = new WeakMap()));
  }))();
}
function Ih(e) {
  return JSON.stringify([e.gatewayOwner, e.recoveryScope]);
}
function Lh(e) {
  return JSON.stringify([e.gatewayOwner, e.recoveryScope, e.scopeKey]);
}
function Rh(e) {
  let t = Math.max(Date.now(), e + 1, sg + 1);
  return ((sg = t), t);
}
function zh(e, t) {
  return e ?? Error(t);
}
function Bh(e) {
  return new Promise((t, n) => {
    (e.addEventListener(`success`, () => t(e.result), { once: !0 }),
      e.addEventListener(`error`, () => n(zh(e.error, `IndexedDB request failed`)), { once: !0 }));
  });
}
function Y(e) {
  return new Promise((t, n) => {
    (e.addEventListener(`complete`, () => t(), { once: !0 }),
      e.addEventListener(`abort`, () => n(zh(e.error, `IndexedDB transaction aborted`)), {
        once: !0,
      }),
      e.addEventListener(`error`, () => n(zh(e.error, `IndexedDB transaction failed`)), {
        once: !0,
      }));
  });
}
function Vh() {
  return (
    og ||
    ((og = new Promise((e, t) => {
      if (typeof indexedDB > `u`) {
        t(Error(`IndexedDB is unavailable`));
        return;
      }
      let n = indexedDB.open(eg, tg);
      (n.addEventListener(
        `upgradeneeded`,
        () => {
          let e = n.result,
            t = e.objectStoreNames.contains(X)
              ? n.transaction?.objectStore(X)
              : e.createObjectStore(X, { keyPath: `key` });
          t && !t.indexNames.contains(ng) && t.createIndex(ng, ng, { unique: !1 });
        },
        { once: !0 },
      ),
        n.addEventListener(
          `success`,
          () => {
            let t = n.result;
            (t.addEventListener(`versionchange`, () => {
              (t.close(), (og = null));
            }),
              e(t),
              globalThis.setTimeout(() => void qh(t).catch(() => void 0), 0));
          },
          { once: !0 },
        ),
        n.addEventListener(
          `error`,
          () => {
            ((og = null), t(zh(n.error, `IndexedDB open failed`)));
          },
          { once: !0 },
        ),
        n.addEventListener(
          `blocked`,
          () => {
            ((og = null), t(Error(`IndexedDB upgrade was blocked`)));
          },
          { once: !0 },
        ));
    })),
    og)
  );
}
function Hh(e) {
  if (!e || typeof e != `object`) return !1;
  let t = e;
  return t.blob instanceof Blob && typeof t.mimeType == `string`;
}
function Uh(e) {
  if (!e || typeof e != `object`) return null;
  let t = e;
  return typeof t.key != `string` ||
    typeof t.ownerKey != `string` ||
    typeof t.gatewayOwner != `string` ||
    typeof t.recoveryScope != `string` ||
    typeof t.scopeKey != `string` ||
    typeof t.updatedAt != `number` ||
    typeof t.writeId != `string` ||
    typeof t.text != `string` ||
    typeof t.revision != `number` ||
    !Number.isSafeInteger(t.revision) ||
    t.revision <= 0 ||
    !Array.isArray(t.attachments) ||
    !t.attachments.every(Hh)
    ? null
    : t;
}
function Wh(e) {
  return !!(e.text || e.attachments.length > 0);
}
function Gh(e, t) {
  let n = Rh(e.revision);
  return { ...e, revision: n, text: ``, attachments: [], updatedAt: t, writeId: `fence:${n}` };
}
function Kh(e, t) {
  if (!(e.updatedAt > t - rg)) return Wh(e) ? Gh(e, t) : null;
}
async function qh(e) {
  let t = e.transaction(X, `readwrite`),
    n = t.objectStore(X),
    r = Date.now(),
    i = n.openCursor();
  (i.addEventListener(`success`, () => {
    try {
      let e = i.result;
      if (!e) return;
      let t = Uh(e.value),
        n = t ? Kh(t, r) : void 0;
      (n === null ? e.delete() : n && e.update(n), e.continue());
    } catch {
      t.abort();
    }
  }),
    await Y(t));
}
async function Jh(e, t, n) {
  let r = (await Bh(e.index(ng).getAll(t))).flatMap((e) => {
      let t = Uh(e);
      return t ? [t] : [];
    }),
    i = [];
  for (let t of r) {
    let r = Kh(t, n);
    if (r === null) {
      e.delete(t.key);
      continue;
    }
    if (r) {
      e.put(r);
      continue;
    }
    Wh(t) && i.push(t);
  }
  i.sort((e, t) => t.updatedAt - e.updatedAt);
  for (let t of i.slice(ig)) e.put(Gh(t, n));
}
async function Yh(e) {
  try {
    let t = (await Vh()).transaction(X, `readwrite`),
      n = t.objectStore(X),
      r = await Bh(n.get(Lh(e))),
      i = Uh(r),
      a = Date.now();
    if (!i) return (r !== void 0 && n.delete(Lh(e)), await Y(t), { status: `not-found` });
    if (
      i.gatewayOwner !== e.gatewayOwner ||
      i.recoveryScope !== e.recoveryScope ||
      i.scopeKey !== e.scopeKey
    )
      return (t.abort(), { status: `storage-failed` });
    let o = Kh(i, a);
    return o === null
      ? (n.delete(i.key), await Y(t), { status: `not-found` })
      : o
        ? (n.put(o), await Y(t), { status: `not-found`, revision: o.revision, writeId: o.writeId })
        : (await Y(t),
          Wh(i)
            ? {
                status: `found`,
                draft: {
                  revision: i.revision,
                  writeId: i.writeId,
                  text: i.text,
                  attachments: i.attachments,
                },
              }
            : { status: `not-found`, revision: i.revision, writeId: i.writeId });
  } catch {
    return { status: `storage-failed` };
  }
}
async function Xh(e, t, n) {
  if (t.attachments.reduce((e, t) => e + t.blob.size, 0) > ag) {
    let r = await Xh(e, { revision: t.revision, text: t.text, attachments: [] }, n);
    return r.status === `persisted`
      ? { status: `payload-too-large`, revision: r.revision, writeId: r.writeId }
      : r;
  }
  try {
    let r = (await Vh()).transaction(X, `readwrite`),
      i = r.objectStore(X),
      a = Lh(e),
      o = Uh(await Bh(i.get(a)));
    if (o?.revision === t.revision)
      return (
        r.abort(),
        o.writeId === n.writeId
          ? { status: `persisted`, revision: o.revision, writeId: o.writeId }
          : { status: `conflict` }
      );
    if (
      !(o
        ? (o.revision === n.expectedRevision &&
            (n.expectedWriteId === void 0 || o.writeId === n.expectedWriteId)) ||
          n.expectedWriteIds?.includes(o.writeId) === !0
        : n.expectedRevision === 0 && n.expectedWriteId === void 0) ||
      (o?.revision ?? 0) > t.revision
    )
      return (r.abort(), { status: `conflict` });
    let s = Date.now(),
      c = {
        key: a,
        ownerKey: Ih(e),
        gatewayOwner: e.gatewayOwner,
        recoveryScope: e.recoveryScope,
        scopeKey: e.scopeKey,
        revision: t.revision,
        text: t.text,
        attachments: t.attachments,
        updatedAt: s,
        writeId: n.writeId,
      };
    return (
      i.put(c),
      await Jh(i, c.ownerKey, s),
      await Y(r),
      { status: `persisted`, revision: t.revision, writeId: n.writeId }
    );
  } catch {
    return { status: `storage-failed` };
  }
}
async function Zh(e, t = 0, n) {
  try {
    let r = (await Vh()).transaction(X, `readwrite`),
      i = r.objectStore(X),
      a = Date.now(),
      o = await Qh(i, e, t, n, a);
    return o.status === `conflict` ? (r.abort(), o) : (await Jh(i, Ih(e), a), await Y(r), o);
  } catch {
    return { status: `storage-failed` };
  }
}
async function Qh(e, t, n, r, i) {
  let a = Lh(t),
    o = Uh(await Bh(e.get(a)));
  if (r !== void 0 && (o?.revision ?? 0) >= r) return { status: `conflict` };
  let s = Rh(Math.max(n, o?.revision ?? 0)),
    c = `retired:${s}`;
  return (
    e.put({
      key: a,
      ownerKey: Ih(t),
      gatewayOwner: t.gatewayOwner,
      recoveryScope: t.recoveryScope,
      scopeKey: t.scopeKey,
      revision: s,
      text: ``,
      attachments: [],
      updatedAt: i,
      writeId: c,
    }),
    { status: `persisted`, revision: s, writeId: c }
  );
}
async function $h(e, t) {
  try {
    let n = (await Vh()).transaction(X, `readwrite`),
      r = n.objectStore(X),
      i = Date.now();
    for (let n of t)
      await Qh(r, { ...e, scopeKey: n.scopeKey }, n.minimumRevision, n.retireBeforeRevision, i);
    return (await Jh(r, Ih({ ...e, scopeKey: `` }), i), await Y(n), `completed`);
  } catch {
    return `storage-failed`;
  }
}
var eg, tg, X, ng, rg, ig, ag, og, sg;
function cg() {
  return (cg = e(() => {
    ((eg = `openclaw-control-ui`),
      (tg = 1),
      (X = `composerDrafts`),
      (ng = `ownerKey`),
      (rg = 6048e5),
      (ig = 20),
      (ag = 26214400),
      (og = null),
      (sg = 0));
  }))();
}
function lg(e) {
  return e.orderKey ?? e.createdAt;
}
function ug(e, t) {
  return lg(e) - lg(t);
}
function dg(e) {
  return (
    !e.pendingRunId &&
    (e.sendState === void 0 ||
      e.sendState === `waiting-idle` ||
      e.sendState === `waiting-reconnect` ||
      e.sendState === `failed`)
  );
}
function fg(e, t = dg) {
  let n = [],
    r = [];
  for (let i of e.toSorted(ug)) {
    if (t(i)) {
      r.push(i);
      continue;
    }
    r.length > 0 && (n.push(r), (r = []));
  }
  return (r.length > 0 && n.push(r), n);
}
function pg(e, t, n) {
  let r = e.toSorted(ug),
    i = r.findIndex((e) => e.id === t),
    a = Math.min(Math.max(n, 0), r.length - 1);
  if (i < 0 || i === a) return [];
  let o = r.map(lg);
  for (let e = 1; e < o.length; e += 1) o[e] = Math.max(o[e], o[e - 1] + 1);
  let s = r.splice(i, 1)[0];
  return (
    r.splice(a, 0, s), r.flatMap((e, t) => (lg(e) === o[t] ? [] : [{ ...e, orderKey: o[t] }]))
  );
}
function mg() {
  return (mg = e(() => {}))();
}
function hg(e) {
  return typeof e == `boolean` ? e : void 0;
}
function gg(e) {
  if (!_(e)) return null;
  let t = e,
    n = s(t.id),
    r = s(t.mimeType);
  if (!n || !r) return null;
  let i = { id: n, mimeType: r },
    a = s(t.fileName);
  (a && (i.fileName = a),
    typeof t.sizeBytes == `number` && Number.isFinite(t.sizeBytes) && (i.sizeBytes = t.sizeBytes));
  let o = s(t.dataUrl);
  return (o && (i.dataUrl = o), i);
}
function _g(e) {
  if (!_(e)) return null;
  let t = e,
    n = s(t.id),
    r = typeof t.text == `string` ? t.text : ``,
    i = typeof t.createdAt == `number` && Number.isFinite(t.createdAt) ? t.createdAt : Date.now();
  if (!n || (!r.trim() && !Array.isArray(t.attachments))) return null;
  let a = Array.isArray(t.attachments) ? t.attachments.map(gg).filter((e) => e !== null) : [],
    o = { id: n, text: r, createdAt: i };
  typeof t.orderKey == `number` && Number.isFinite(t.orderKey) && (o.orderKey = t.orderKey);
  let c = Va(t.sender);
  c && (o.sender = c);
  let l =
    t.kind === `steered` || s(t.steerTargetRunId) !== void 0 || t.sendState === `steering`
      ? `steer`
      : Pn(typeof t.queueMode == `string` ? t.queueMode : void 0);
  (l && (o.queueMode = l), a.length && (o.attachments = a));
  let u = hg(t.refreshSessions);
  u !== void 0 && (o.refreshSessions = u);
  let d = s(t.replyToId);
  (d && (o.replyToId = d),
    t.sendState === `steering`
      ? (o.sendState = `unconfirmed`)
      : t.sendState === `failed` ||
          t.sendState === `unconfirmed` ||
          t.sendState === `waiting-idle` ||
          t.sendState === `waiting-reconnect`
        ? (o.sendState = t.sendState)
        : t.sendState === `waiting-model` && ((o.sendState = `failed`), (o.sendError = yg)));
  let f = s(t.sendError);
  f && (o.sendError = f);
  let m = s(t.sendRunId);
  (m && (o.sendRunId = m),
    typeof t.sendAttempts == `number` &&
      Number.isFinite(t.sendAttempts) &&
      (o.sendAttempts = t.sendAttempts));
  let h = s(t.localCommandArgs);
  h && (o.localCommandArgs = h);
  let g = s(t.localCommandName);
  g && (o.localCommandName = g);
  let v = s(t.sessionKey);
  v && (o.sessionKey = v);
  let y = s(t.agentId);
  return (y && (o.agentId = p(y)), o);
}
function Z(e) {
  if (!_(e)) return null;
  let t = e,
    n = typeof t.draft == `string` ? t.draft : void 0,
    r = Array.isArray(t.queue)
      ? t.queue
          .slice(0, vg)
          .map(_g)
          .filter((e) => e !== null)
      : void 0,
    i = Array.isArray(t.removedQueueItemIds)
      ? t.removedQueueItemIds.map(s).filter((e) => e !== void 0)
      : void 0,
    a = new Set(i ?? []),
    o = r?.filter((e) => !a.has(e.id)),
    c = typeof t.updatedAt == `number` && Number.isFinite(t.updatedAt) ? t.updatedAt : Date.now(),
    l =
      (typeof t.draftRevision == `number` && Number.isSafeInteger(t.draftRevision)
        ? t.draftRevision
        : void 0) ?? (n ? c : void 0);
  return !n && l === void 0 && (!o || o.length === 0)
    ? null
    : {
        ...(n ? { draft: n } : {}),
        ...(l === void 0 ? {} : { draftRevision: l }),
        ...(o && o.length > 0 ? { queue: o } : {}),
        updatedAt: c,
      };
}
var vg, yg;
function bg() {
  return (bg = e(() => {
    (On(),
      O(),
      Ua(),
      (vg = 1e3),
      (yg = `Chat settings update was interrupted. Review and retry when ready.`));
  }))();
}
function xg(e) {
  Dg = Math.max(Dg, e ?? 0);
}
function Sg(e = 0) {
  let t = Math.max(Date.now(), Dg + 1, e + 1);
  return ((Dg = t), t);
}
function Cg(e, t, n, r) {
  if (r === void 0) return;
  let i = Og.get(e);
  i || ((i = new Map()), Og.set(e, i));
  let a = i.get(t);
  (a || ((a = new Map()), i.set(t, a)), a.set(n, Math.max(a.get(n) ?? 0, r)));
}
function wg(e, t, n, r) {
  let i = kg.get(e);
  i || ((i = new Map()), kg.set(e, i));
  let a = i.get(t);
  (a || ((a = new Map()), i.set(t, a)), a.set(n, Math.max(a.get(n) ?? 0, r)));
}
function Tg(e, t, n) {
  return Og.get(e)?.get(t)?.get(n) ?? 0;
}
function Eg(e, t, n) {
  return kg.get(e)?.get(t)?.get(n) ?? 0;
}
var Dg, Og, kg;
function Ag() {
  return (Ag = e(() => {
    ((Dg = 0), (Og = new WeakMap()), (kg = new WeakMap()));
  }))();
}
function jg(e) {
  return (
    e_.add(e),
    !t_ && typeof window < `u` && ((t_ = !0), window.addEventListener(`storage`, Ng)),
    () => {
      (e_.delete(e),
        t_ &&
          e_.size === 0 &&
          typeof window < `u` &&
          ((t_ = !1), window.removeEventListener(`storage`, Ng)));
    }
  );
}
function Mg() {
  for (let e of e_)
    try {
      e();
    } catch (e) {
      console.error(`[openclaw] stored chat outbox listener failed`, e);
    }
}
function Ng(e) {
  if (e.key === null && e.storageArea) {
    (n_.get(e.storageArea)?.clear(), r_.get(e.storageArea)?.clear(), Mg());
    return;
  }
  if (e.key?.startsWith(Qg) || e.key?.startsWith(Zg)) {
    if (e.storageArea) {
      let t = e.key.startsWith(Zg) ? `${Qg}${e.key.slice(33)}` : e.key;
      r_.get(e.storageArea)?.delete(t);
    }
    Mg();
  }
}
function Pg(e) {
  let t = e?.trim() || `default`,
    n = encodeURIComponent(t);
  return {
    key: `${Qg}${n}`,
    legacyKey: `${Zg}${n.slice(0, 240)}`,
    gatewayOwner: t,
    legacyOwnerIsUnambiguous: n.length < 240,
  };
}
function Fg(e) {
  if (e.agentsList != null) return !0;
  let t = e.hello?.snapshot;
  return !!(
    t &&
    typeof t == `object` &&
    `sessionDefaults` in t &&
    t.sessionDefaults &&
    typeof t.sessionDefaults == `object`
  );
}
function Ig(e, t, n) {
  let r = n_.get(e);
  (r || ((r = new Map()), n_.set(e, r)), r.set(t, n ?? null));
}
function Lg(e, t) {
  return n_.get(e)?.get(t) ?? void 0;
}
function Rg(e, t, n, r) {
  let i = ke(t),
    a = t.trim().toLowerCase(),
    o = Fg(e),
    s = ze(e),
    c = a === `main` || a === s,
    l = i?.rest ?? a,
    u = !o && r?.key === l,
    d = !o && !i && r && (a === `main` || u) ? r.agentId : void 0,
    f = !o && !i && a === `main`,
    m = i && (i.rest === `global` || i.rest === `main` || i.rest === s),
    h = a === `global` || c || !!m || u,
    g = i?.agentId ?? n?.trim(),
    _ = Xe(e),
    v = o && !i && c ? tt(e) : void 0,
    y = h
      ? g
        ? p(g)
        : v || d || (f ? void 0 : _ || (u ? r.agentId : void 0))
      : i?.agentId
        ? p(i.agentId)
        : void 0;
  return {
    conversationKey: f && !y ? xe : h ? `global` : t,
    agentScope: y ?? (h ? `@unresolved` : `main`),
    ...(y ? { routingAgentId: y } : {}),
    isGlobal: h,
  };
}
function zg(e, t) {
  return `${e}\u0000agent:${t}`;
}
function Bg(e, t) {
  if (!Fg(t)) return !1;
  let n = ze(t),
    r = n === `main` ? void 0 : { key: n, agentId: tt(t) };
  return e.mainAlias?.key === r?.key && e.mainAlias?.agentId === r?.agentId
    ? !1
    : (r ? (e.mainAlias = r) : delete e.mainAlias, !0);
}
function Vg(e, t) {
  if (!e) return t;
  let n = e.updatedAt > t.updatedAt ? e : t,
    r = n === e ? t : e,
    i = (e.draftRevision ?? -1) > (t.draftRevision ?? -1) ? e : t,
    a = Array.from(new Map([...(r.queue ?? []), ...(n.queue ?? [])].map((e) => [e.id, e])).values())
      .toSorted(ug)
      .slice(0, vg);
  return {
    ...(i.draft ? { draft: i.draft } : {}),
    ...(i.draftRevision === void 0 ? {} : { draftRevision: i.draftRevision }),
    ...(a.length ? { queue: a } : {}),
    updatedAt: Math.max(e.updatedAt, t.updatedAt),
  };
}
function Hg(e, t, n, r) {
  let i = Bg(e, t),
    a = Rg(t, n, r, e.mainAlias),
    o = zg(a.conversationKey, a.agentScope),
    s = Fg(t) ? tt(t) : e.mainAlias?.agentId;
  if (s) {
    let n = zg(`global`, s),
      r = Z(e.sessions[n]),
      a = new Set([xe, ze(t), ...(e.mainAlias ? [e.mainAlias.key] : [])]);
    for (let t of Object.keys(e.sessions)) {
      if (t === n) continue;
      let o = t.lastIndexOf(`\0agent:`);
      if (o < 0 || !a.has(t.slice(0, o).trim().toLowerCase())) continue;
      let c = Z(e.sessions[t]);
      if (!c) continue;
      let l = c.queue?.map((e) => ({ ...e, agentId: s, sessionKey: `global` }));
      ((r = Vg(r, { ...c, ...(l ? { queue: l } : {}) })),
        (e.sessions[n] = r),
        delete e.sessions[t],
        (i = !0));
    }
  }
  let c = Z(e.sessions[o]),
    l = `\u0000agent:${a.agentScope}`,
    u = !a.isGlobal && !ke(n);
  for (let n of Object.keys(e.sessions)) {
    if (n === o) continue;
    let r = n.lastIndexOf(`\0agent:`);
    if (r < 0) continue;
    let s = n.slice(0, r),
      d = u && s === a.conversationKey;
    if (
      (!d && !n.endsWith(l)) ||
      (!d &&
        Rg(t, s, a.agentScope === `@unresolved` ? void 0 : a.agentScope, e.mainAlias)
          .conversationKey !== a.conversationKey)
    )
      continue;
    let f = Z(e.sessions[n]);
    if (!f) continue;
    let p = f.queue?.map(({ agentId: e, ...t }) => ({
      ...t,
      sessionKey: a.conversationKey,
      ...(a.routingAgentId ? { agentId: a.routingAgentId } : {}),
    }));
    ((c = Vg(c, { ...f, ...(p ? { queue: p } : {}) })),
      (e.sessions[o] = c),
      delete e.sessions[n],
      (i = !0));
  }
  if (!a.isGlobal || a.agentScope !== Xe(t)) return { session: c, storeSessionKey: o, migrated: i };
  let d = zg(a.conversationKey, $g),
    f = o === d ? null : Z(e.sessions[d]);
  if (!f) return { session: c, storeSessionKey: o, migrated: i };
  let p = f.queue?.map((e) => (e.agentId ? e : { ...e, agentId: a.agentScope })),
    m = Vg(c, { ...f, ...(p ? { queue: p } : {}) });
  return (
    (e.sessions[o] = m), delete e.sessions[d], { session: m, storeSessionKey: o, migrated: !0 }
  );
}
function Ug(e, t, n) {
  let r = Ce(),
    i = Pg(e.settings?.gatewayUrl),
    a = Rg(e, t, n, r ? Lg(r, i.key) : void 0);
  return {
    sessionKey: a.conversationKey,
    ...(a.routingAgentId ? { agentId: a.routingAgentId } : {}),
  };
}
function Wg(e) {
  let t = e.sessionKey.trim().toLowerCase(),
    n = e.agentId ?? (t === `global` || t === `main` ? `@unresolved` : `main`);
  return zg(e.sessionKey, n);
}
function Gg(e, t, n, r) {
  let i;
  try {
    i = JSON.parse(n);
  } catch {
    return null;
  }
  if (!i || i.version !== r || !i.sessions || typeof i.sessions != `object`) return null;
  if (r === 2 && i.gatewayOwner !== t.gatewayOwner)
    throw Error(`Chat outbox gateway owner mismatch`);
  try {
    let n = {};
    for (let [r, a] of Object.entries(i.sessions)) {
      let i = Z(a);
      i && ((n[r] = i), xg(i.draftRevision), Cg(e, t.key, r, i.draftRevision));
    }
    let r = i.mainAlias,
      a =
        r &&
        typeof r == `object` &&
        typeof r.key == `string` &&
        r.key.trim() &&
        typeof r.agentId == `string` &&
        r.agentId.trim()
          ? { key: r.key.trim().toLowerCase(), agentId: p(r.agentId) }
          : void 0;
    return (
      Ig(e, t.key, a),
      { version: 2, gatewayOwner: t.gatewayOwner, sessions: n, ...(a ? { mainAlias: a } : {}) }
    );
  } catch {
    return null;
  }
}
function Kg(e, t) {
  let n = e.getItem(t.key);
  if (n) {
    let r = Gg(e, t, n, 2);
    if (r) return r;
  } else if (t.legacyOwnerIsUnambiguous) {
    let n = e.getItem(t.legacyKey),
      r = n ? Gg(e, t, n, 1) : null;
    if (r) {
      try {
        (Jg(e, t, r), e.removeItem(t.legacyKey));
      } catch {}
      return r;
    }
  }
  return (Ig(e, t.key, void 0), { version: 2, gatewayOwner: t.gatewayOwner, sessions: {} });
}
function qg(e, t) {
  let n = r_.get(e),
    r = n?.get(t.key);
  if (r) return r;
  let i = Kg(e, t),
    a = n ?? new Map();
  return (a.set(t.key, i), r_.set(e, a), i);
}
function Jg(e, t, n) {
  r_.get(e)?.delete(t.key);
  let r = Object.entries(n.sessions),
    i = r.filter(([, e]) => e.queue?.length);
  if (i.length > 20) throw Error(`Chat outbox session limit reached`);
  let a = r.filter(([, e]) => !e.queue?.length),
    o = `global\u0000agent:${$g}`,
    s = (e, t) =>
      t[1].updatedAt - e[1].updatedAt ||
      (t[1].draftRevision ?? 0) - (e[1].draftRevision ?? 0) ||
      e[0].localeCompare(t[0]),
    c = a.find(([e]) => e === o),
    l = [
      ...(c ? [c] : []),
      ...a.filter(([e, t]) => e !== o && !t.draft && t.draftRevision !== void 0).toSorted(s),
    ].slice(0, 20),
    u = [
      ...[...i.toSorted(s), ...a.filter(([e, t]) => e !== o && !!t.draft).toSorted(s)].slice(0, 20),
      ...l,
    ];
  if (u.length === 0 && !n.mainAlias) {
    (e.removeItem(t.key), Ig(e, t.key, void 0));
    return;
  }
  (e.setItem(
    t.key,
    JSON.stringify({
      version: 2,
      gatewayOwner: t.gatewayOwner,
      sessions: Object.fromEntries(u),
      ...(n.mainAlias ? { mainAlias: n.mainAlias } : {}),
    }),
  ),
    Ig(e, t.key, n.mainAlias));
}
function Yg(e, t) {
  let n = Pg(e.settings?.gatewayUrl);
  if (t.length === 0) return { gatewayOwner: n.gatewayOwner, retirements: [], storageFailed: !1 };
  let r = Ce();
  if (!r)
    return {
      gatewayOwner: n.gatewayOwner,
      retirements: t.flatMap((t) => {
        if (!t.key.trim()) return [];
        let n = Rg(e, t.key, t.agentId);
        return [
          {
            scope: {
              sessionKey: n.conversationKey,
              ...(n.routingAgentId ? { agentId: n.routingAgentId } : {}),
            },
            minimumRevision: t.retireBeforeRevision,
            retireBeforeRevision: t.retireBeforeRevision,
          },
        ];
      }),
      storageFailed: !0,
    };
  let i = [],
    a = [],
    o = !1;
  try {
    let s = Kg(r, n),
      c = !1;
    for (let l of t) {
      if (!l.key.trim()) return { gatewayOwner: n.gatewayOwner, retirements: i, storageFailed: !0 };
      let t = Rg(e, l.key, l.agentId, s.mainAlias),
        u = {
          sessionKey: t.conversationKey,
          ...(t.routingAgentId ? { agentId: t.routingAgentId } : {}),
        },
        d = Hg(s, e, u.sessionKey, u.agentId);
      c ||= d.migrated;
      let f = d.session?.draftRevision ?? 0,
        p = Math.max(f, Tg(r, n.key, d.storeSessionKey), Eg(r, n.key, d.storeSessionKey)),
        m = l.retireBeforeRevision;
      (f < l.retireBeforeRevision &&
        ((m = Sg(Math.max(p, l.retireBeforeRevision))),
        wg(r, n.key, d.storeSessionKey, m),
        (o ||= !!d.session?.draft || !!d.session?.queue?.length),
        (s.sessions[d.storeSessionKey] = { draftRevision: m, updatedAt: Date.now() }),
        a.push({ storeSessionKey: d.storeSessionKey, revision: m }),
        (c = !0)),
        i.push({ scope: u, minimumRevision: m, retireBeforeRevision: l.retireBeforeRevision }));
    }
    if (!c) return { gatewayOwner: n.gatewayOwner, retirements: i, storageFailed: !1 };
    Jg(r, n, s);
    let l = Kg(r, n);
    for (let { storeSessionKey: e, revision: t } of a) {
      let a = Z(l.sessions[e]);
      if (a?.draftRevision !== t || a.draft || a.queue?.length)
        return { gatewayOwner: n.gatewayOwner, retirements: i, storageFailed: !0 };
      Cg(r, n.key, e, t);
    }
    return (o && Mg(), { gatewayOwner: n.gatewayOwner, retirements: i, storageFailed: !1 });
  } catch {
    return { gatewayOwner: n.gatewayOwner, retirements: i, storageFailed: !0 };
  }
}
function Xg(e, t) {
  let { agentId: n, ...r } = e;
  return {
    ...r,
    sessionKey: t.conversationKey,
    ...(t.routingAgentId ? { agentId: t.routingAgentId } : {}),
  };
}
var Zg, Qg, $g, e_, t_, n_, r_;
function i_() {
  return (i_ = e(() => {
    (O(),
      bg(),
      Ag(),
      (Zg = `openclaw.control.chatComposer.v1:`),
      (Qg = `openclaw.control.chatComposer.v2:`),
      ($g = `@unresolved`),
      (e_ = new Set()),
      (t_ = !1),
      (n_ = new WeakMap()),
      (r_ = new WeakMap()));
  }))();
}
function a_(e) {
  let t = Ce();
  if (!t) return [];
  try {
    let n = Pg(e.settings?.gatewayUrl),
      r = qg(t, n),
      i = !1,
      a = Xe(e),
      o = Fg(e) ? tt(e) : void 0;
    for (let t of new Set([o, a])) t && (i = Hg(r, e, `global`, t).migrated || i);
    let s = `\0agent:`;
    for (let t of Object.keys(r.sessions)) {
      let n = t.lastIndexOf(s);
      if (n < 0) continue;
      let a = t.slice(n + 7);
      i = Hg(r, e, t.slice(0, n), a === `@unresolved` ? void 0 : a).migrated || i;
    }
    if (i)
      try {
        Jg(t, n, r);
      } catch {}
    return Object.entries(r.sessions).flatMap(([t, n]) => {
      let i = t.lastIndexOf(s);
      if (i < 0) return [];
      let a = t.slice(i + 7);
      return [
        { scope: Rg(e, t.slice(0, i), a === `@unresolved` ? void 0 : a, r.mainAlias), session: n },
      ];
    });
  } catch {
    return [];
  }
}
function o_(e) {
  return new Set(
    a_(e).flatMap(({ scope: e, session: t }) =>
      t.draft
        ? [
            Wg({
              sessionKey: e.conversationKey,
              ...(e.routingAgentId ? { agentId: e.routingAgentId } : {}),
            }),
          ]
        : [],
    ),
  );
}
function s_(e) {
  return a_(e)
    .flatMap(({ scope: e, session: t }) =>
      t.queue?.length
        ? [
            {
              sessionKey: e.conversationKey,
              ...(e.routingAgentId ? { agentId: e.routingAgentId } : {}),
              queue: t.queue.map((t) => Xg(t, e)).toSorted(ug),
            },
          ]
        : [],
    )
    .toSorted(
      (e, t) =>
        (e.queue[0]?.createdAt ?? 2 ** 53 - 1) - (t.queue[0]?.createdAt ?? 2 ** 53 - 1) ||
        e.sessionKey.localeCompare(t.sessionKey),
    );
}
function c_(e) {
  let t = new Map();
  for (let n of s_(e)) {
    let e = t.get(Wg(n)) ?? { all: new Set(), attention: new Set() };
    for (let t of n.queue)
      t.pendingRunId ||
        (e.all.add(t.id),
        (t.sendState === `failed` || t.sendState === `unconfirmed`) && e.attention.add(t.id));
    e.all.size && t.set(Wg(n), e);
  }
  let n = new Map(),
    r = new Map(),
    i = 0;
  for (let [e, a] of t)
    (n.set(e, a.all.size), (i += a.all.size), a.attention.size && r.set(e, a.attention.size));
  return { countsByScope: n, attentionCountsByScope: r, total: i };
}
function l_() {
  return (l_ = e(() => {
    (O(), i_());
  }))();
}
function u_() {
  return (u_ = e(() => {
    cs();
  }))();
}
function d_(e) {
  if (typeof e == `boolean`) return e;
  let t = g(e)?.enabled;
  return typeof t == `boolean` ? t : void 0;
}
function f_(e, t) {
  let n = g(e),
    r = d_(g(n?.tools)?.swarm),
    i = g(n?.agents),
    a = g(i?.entries),
    o = t ? p(t) : null,
    s = o ? Object.keys(a ?? {}).find((e) => p(e) === o) : null,
    c = s ? g(a?.[s]) : null;
  return d_(g(c?.tools)?.swarm) ?? r ?? !1;
}
function p_(e, t) {
  return (e.updatedAt ?? 0) >= (t.updatedAt ?? 0);
}
function m_(e, t) {
  let n = new Map();
  for (let r of [...e, ...t]) {
    let e = n.get(r.key);
    (!e || p_(r, e)) && n.set(r.key, r);
  }
  return [...n.values()];
}
async function h_(e) {
  let t = await kd({
    sessions: e.sessions,
    parentKey: e.parentKey,
    isCurrent: e.isCurrent,
    pageSize: g_,
  });
  return t ? m_(e.currentRows, t) : null;
}
var g_, __;
function v_() {
  return (v_ = e(() => {
    (jd(),
      O(),
      (g_ = 1e4),
      (__ = class {
        constructor() {
          ((this.rows = []),
            (this.key = ``),
            (this.revision = -1),
            (this.generation = 0),
            (this.attemptRevision = -1),
            (this.attempts = 0),
            (this.timer = null));
        }
        update(e) {
          let t = `${e.sourceEpoch}:${e.parentKey}`;
          (this.key !== t && this.reset(t),
            (this.rows = m_(this.rows, e.currentRows())),
            e.onRows(this.rows));
          let n = e.sessions.canonicalListRevision;
          (this.attemptRevision !== n && ((this.attemptRevision = n), (this.attempts = 0)),
            this.revision !== n &&
              this.timer === null &&
              (this.timer = setTimeout(() => this.hydrate(e), 250)));
        }
        dispose() {
          this.reset(``);
        }
        hydrate(e) {
          let t = this.generation,
            n = e.sessions.canonicalListRevision,
            r = `${e.sourceEpoch}:${e.parentKey}`,
            i = () => t === this.generation && this.key === r,
            a = e.currentRows(),
            o = new Map(a.map((e) => [e.key, JSON.stringify(e)])),
            s = !1,
            c = !1;
          ((this.attempts += 1),
            h_({ sessions: e.sessions, parentKey: e.parentKey, currentRows: a, isCurrent: i })
              .then((t) => {
                if (!t || !i()) return;
                ((s = !0), (this.revision = n));
                let r = e.currentRows().filter((e) => o.get(e.key) !== JSON.stringify(e));
                ((this.rows = m_(t, r)), e.onRows(this.rows));
              })
              .catch(() => {
                if (!i()) return;
                c = !0;
                let t = Math.min(3e4, 1e3 * 2 ** Math.min(this.attempts - 1, 5));
                this.timer = setTimeout(() => {
                  ((this.timer = null), i() && this.update(e));
                }, t);
              })
              .finally(() => {
                i() &&
                  (c || (this.timer = null),
                  s && this.revision !== e.sessions.canonicalListRevision && this.update(e));
              }));
        }
        reset(e) {
          (this.timer !== null && clearTimeout(this.timer),
            (this.rows = []),
            (this.key = e),
            (this.revision = -1),
            (this.generation += 1),
            (this.attemptRevision = -1),
            (this.attempts = 0),
            (this.timer = null));
        }
      }));
  }))();
}
function y_(e) {
  let t = new Map(),
    n = md(),
    r = e.snapshot.client,
    i = null,
    a = null,
    o = null,
    s = 0,
    c = 0,
    l = !1,
    u = 0,
    d = !1,
    f = null,
    p = null,
    m = () => t.size > 0,
    h = () => {
      let n = e.snapshot.hello,
        r = new Set();
      for (let e of t.values())
        for (let t of e) {
          let e = Le(t, n).trim();
          e && r.add(e);
        }
      return [...r].toSorted().slice(0, 32);
    },
    g = () => x(),
    _ = () => {
      (n.reset(), x());
    },
    v = () => {
      d ||
        ((d = !0),
        (r = e.snapshot.client),
        (i = null),
        (a = null),
        (o = null),
        (s = 0),
        (f = e.subscribe(g)),
        typeof document < `u` &&
          (document.addEventListener(`visibilitychange`, _), (p = document)));
    },
    y = () => {
      d &&
        ((d = !1),
        f?.(),
        (f = null),
        p?.removeEventListener(`visibilitychange`, _),
        (p = null),
        n.reset(),
        (c += 1),
        (u += 1),
        (l = !1),
        (i = null),
        (a = null),
        (o = null),
        (s = 0));
    };
  function b() {
    if (((l = !1), !d)) return;
    let t = e.snapshot,
      u = t.client;
    if (
      (u !== r && (n.reset(), (r = u), (i = null), (a = null), (o = null), (s = 0)),
      t.phase !== `connected` || u === null || t.hello === null || Nt(t, x_) !== !0)
    ) {
      ((i = null), (a = null), (o = null), (s = 0), m() || y());
      return;
    }
    let f = typeof document < `u` && document.visibilityState === `hidden` ? [] : h(),
      p = f.some((e) => !e.startsWith(`agent:`)) ? t.assistantAgentId : void 0,
      g = JSON.stringify({ agentId: p, sessionKeys: f });
    if (t.hello === i && g === a) {
      !m() && o === g && s === c && y();
      return;
    }
    ((i = t.hello), (a = g));
    let _ = ++c,
      v = () => d && _ === c && t.hello === i && g === a;
    (n.cancel(),
      u
        .request(x_, { ...(p ? { agentId: p } : {}), sessionKeys: f })
        .then(() => {
          v() && ((o = g), (s = _), n.reset(), m() || y());
        })
        .catch(() => {
          v() &&
            ((a = null),
            n.schedule(() => {
              d && x();
            }));
        }));
  }
  function x() {
    if (!d || l) return;
    l = !0;
    let e = u;
    globalThis.queueMicrotask(() => {
      e === u && b();
    });
  }
  let S = (e, r) => {
    let i = new Set(r.map((e) => e.trim()).filter(Boolean)),
      a = t.get(e);
    (a === void 0 ? i.size === 0 : a.size === i.size && [...i].every((e) => a.has(e))) ||
      (i.size === 0 ? t.delete(e) : t.set(e, i), n.reset(), m() ? (v(), x()) : d && b());
  };
  return { watch: S, unwatch: (e) => S(e, []) };
}
function b_(e) {
  let t = S_.get(e);
  if (t) return t;
  let n = y_(e);
  return (S_.set(e, n), n);
}
var x_, S_;
function C_() {
  return (C_ = e(() => {
    (Ft(), _d(), Se(), (x_ = `sessions.viewers.set`), (S_ = new WeakMap()));
  }))();
}
function w_(e) {
  return typeof e == `string` ? Pn(e) : void 0;
}
function T_(e, t = {}) {
  let n = x(e),
    r = x(n?.messages),
    i = x(r?.queue),
    a = w_(x(i?.byChannel)?.webchat) ?? w_(i?.mode),
    o = w_(t.effectiveMode),
    s = w_(t.sessionMode);
  if (s) return s;
  if (t.configNeedsApply) return o;
  if (!(t.sessionMetadataLoaded === !1 && !o) && !(!n && !o)) return a ?? o ?? `steer`;
}
function E_(e, t) {
  return ct(e) ?? t;
}
function D_() {
  return (D_ = e(() => {
    (On(), Cn(), _t());
  }))();
}
function O_(e) {
  return e.sessionsResult?.sessions?.find((t) => at(t.key, e.sessionKey));
}
function k_(e) {
  let t = e.chatModelCatalog ?? [],
    n = e.modelOverrides;
  if (Object.hasOwn(n, e.sessionKey)) {
    let r = n[e.sessionKey];
    return r == null ? `` : We(Be(r), t);
  }
  let r = O_(e);
  return Pe(r?.model, r?.modelProvider, t);
}
function A_(e) {
  return (
    Pe(e.agentDefaultModel, void 0, e.chatModelCatalog ?? []) ||
    Pe(
      e.sessionsResult?.defaults?.model,
      e.sessionsResult?.defaults?.modelProvider,
      e.chatModelCatalog ?? [],
    )
  );
}
function j_(e) {
  let t = e.trim().toLowerCase(),
    n = t.indexOf(`/`);
  return n <= 0 ? t : `${He(t.slice(0, n))}/${t.slice(n + 1)}`;
}
function M_(e, t) {
  let n = e.trim().toLowerCase();
  if (!n) return e;
  let r = j_(e);
  for (let e of [!1, !0]) {
    let i = t.find(
      (t) => !!t.disabled === e && (t.value.trim().toLowerCase() === n || j_(t.value) === r),
    );
    if (i) return i.value;
  }
  return e;
}
function N_(e, t) {
  let n = new Set(),
    r = [],
    i = new Set(e.filter((e) => e.available !== !1).map((e) => j_(Re(e.id, e.provider))));
  for (let a of e.toSorted(
    (e, t) =>
      Number(e.available === !1) - Number(t.available === !1) ||
      Number(e.provider.trim().toLowerCase() !== He(e.provider)) -
        Number(t.provider.trim().toLowerCase() !== He(t.provider)),
  )) {
    let e = nt(a, t),
      o = e.value.trim(),
      s = o.toLowerCase();
    !o ||
      n.has(s) ||
      (a.available === !1 && i.has(j_(e.value))) ||
      (n.add(s), r.push({ ...e, ...(a.available === !1 ? { disabled: !0 } : {}) }));
  }
  return r;
}
function P_(e, t, n) {
  let r = j_(Pe(e, t, n)),
    i = n.filter((e) => j_(Re(e.id, e.provider)) === r);
  return i.length > 0 && i.every((e) => e.available === !1);
}
function F_(e) {
  let t = e.chatModelCatalog ?? [],
    n = Ge(t.filter((e) => e.available !== !1 || P_(e.id, e.provider, t))),
    r = N_(t, n),
    i = M_(k_(e), r),
    a = M_(A_(e), r),
    o = Ye(a, n);
  return {
    currentOverride: i,
    defaultModel: a,
    defaultLabel: a ? `Default (${o})` : `Default model`,
    options: r,
  };
}
function I_(e) {
  if (e === `auto`) return `auto`;
  if (e === `on`) return !0;
  if (e === `off`) return !1;
}
function L_(e) {
  let t = e?.effectiveFastMode ?? e?.fastMode,
    n =
      t === `auto`
        ? j(`chat.commandResults.fast.autoValue`, { seconds: String(e?.fastAutoOnSeconds ?? 60) })
        : j(t === !0 ? `chat.commandResults.fast.on` : `chat.commandResults.fast.off`),
    r = e?.effectiveFastModeSource,
    i =
      r === `session`
        ? j(`chat.commandResults.fast.sourceSession`)
        : r === `agent`
          ? j(`chat.commandResults.fast.sourceAgent`)
          : r === `config`
            ? j(`chat.commandResults.fast.sourceModel`)
            : r === "default"
              ? j(`chat.commandResults.fast.sourceDefault`)
              : ``;
  return `${j(`chat.commandResults.fast.current`, { value: n })}${i}.`;
}
function R_(e, t, n) {
  let r = e.trim();
  if (!r) return null;
  let i = r.toLowerCase(),
    a = new Set(
      t
        .filter((e) => e.id.trim().toLowerCase() === i)
        .map((e) => He(e.provider))
        .filter(Boolean),
    ),
    o = new Set(
      t
        .filter((e) => Re(e.id, e.provider).trim().toLowerCase() === i)
        .map((e) => He(e.provider))
        .filter(Boolean),
    );
  return o.size === 1
    ? ([...o][0] ?? null)
    : n && a.has(n) && !o.has(n)
      ? n
      : a.size === 1
        ? ([...a][0] ?? null)
        : null;
}
function z_(e, t) {
  let n = e.trim().toLowerCase();
  return n
    ? t.some((e) => {
        let t = e.id.trim().toLowerCase(),
          r = Re(e.id, e.provider).trim().toLowerCase();
        return t === n || r === n;
      })
    : !1;
}
function B_(e) {
  let t = e.sessionsResult?.sessions?.find((t) => at(t.key, e.sessionKey)),
    n = He(t?.modelProvider ?? ``) || null,
    r = He(e.sessionsResult?.defaults?.modelProvider ?? ``) || null,
    i = z_(e.currentModelOverride, e.catalog),
    a = !e.currentModelOverride || !i ? (n ?? r) : null,
    o = R_(e.currentModelOverride, e.catalog, n) ?? a ?? null,
    s =
      t?.fastMode === `auto` ? `auto` : t?.fastMode === !0 ? `on` : t?.fastMode === !1 ? `off` : ``,
    c = o === `openai`,
    l = t?.effectiveFastMode ?? t?.fastMode,
    u = c ? (l === !0 ? `on` : l === `auto` ? `auto` : `off`) : s,
    d = !!(o && V_.has(o)),
    f = d || !!s,
    p = l === !0 || l === `auto`,
    m = l === `auto` ? `Auto` : p ? `Fast` : c || u === `off` ? `Standard` : `Default`,
    h = d ? (p ? `off` : `on`) : ``;
  return {
    active: p,
    currentOverride: u,
    disabled:
      !f ||
      !e.connected ||
      e.loading ||
      e.sending ||
      !!e.activeRunId ||
      e.stream !== null ||
      !e.gatewayAvailable,
    label: m,
    nextValue: h,
    supported: f,
  };
}
var V_;
function H_() {
  return (H_ = e(() => {
    (M(), O(), qe(), (V_ = new Set([`anthropic`, `minimax`, `minimax-portal`, `openai`, `xai`])));
  }))();
}
function U_(e) {
  let t = e
    .replace(
      /\r\n/g,
      `
`,
    )
    .replace(
      /\r/g,
      `
`,
    ).split(`
`);
  return (t.at(-1) === `` && t.pop(), t);
}
function W_(e, t) {
  for (let n of e)
    if ((n.kind === `add` || n.kind === `ctx`) && n.lineNo !== void 0 && t[n.lineNo - 1] !== n.text)
      return !1;
  return !0;
}
function G_(e, t, n) {
  return Array.from({ length: n }, (n, r) => ({ kind: `ctx`, lineNo: t + r, text: e[t + r - 1] }));
}
function K_(e, t, n, r, i) {
  let a = e.findIndex((e) => e.kind === `skip` && e.gap === t),
    o = t.newStart + t.count - 1;
  if (a < 0 || t.newStart < 1 || t.count < 1 || o > n.length || !W_(e, n)) return null;
  let s = r === `all` || t.count <= J_ ? t.count : Math.min(q_, t.count),
    c = t.count - s,
    l = G_(n, r === `up` ? t.newStart + c : t.newStart, s),
    u = [];
  return (
    r === `up` && c > 0 && u.push({ kind: `skip`, text: i(c), gap: { ...t, count: c } }),
    u.push(...l),
    r !== `up` &&
      c > 0 &&
      u.push({
        kind: `skip`,
        text: i(c),
        gap: { oldStart: t.oldStart + s, newStart: t.newStart + s, count: c },
      }),
    [...e.slice(0, a), ...u, ...e.slice(a + 1)]
  );
}
var q_, J_;
function Y_() {
  return (Y_ = e(() => {
    ((q_ = 20), (J_ = 25));
  }))();
}
function X_(e) {
  let t = [];
  for (let n = 0; n < e.length;) {
    let r = e[n];
    if (!r) break;
    if (r.kind !== `add` && r.kind !== `del`) {
      (t.push({ kind: `span`, line: r }), (n += 1));
      continue;
    }
    let i = [],
      a = [];
    for (; n < e.length;) {
      let t = e[n];
      if (t?.kind === `del`) i.push(t);
      else if (t?.kind === `add`) a.push(t);
      else break;
      n += 1;
    }
    let o = Math.max(i.length, a.length);
    for (let e = 0; e < o; e += 1)
      t.push({ kind: `pair`, ...(i[e] ? { left: i[e] } : {}), ...(a[e] ? { right: a[e] } : {}) });
  }
  return t;
}
function Z_() {
  return (Z_ = e(() => {}))();
}
function Q_(e, t, n = $_) {
  let r = [],
    i = !1,
    a = !1,
    o = 0,
    s = 0,
    c,
    l,
    u = e.replace(
      /\r\n/g,
      `
`,
    ).split(`
`);
  u.at(-1) === `` && u.pop();
  for (let e of u) {
    let u = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(e);
    if (u) {
      let e = Number.parseInt(u[1] ?? ``, 10),
        n = Number.parseInt(u[2] ?? ``, 10),
        i = c === void 0 ? e - 1 : e - c;
      (i > 0 &&
        r.push({
          kind: `skip`,
          text: t(i),
          gap: { oldStart: c ?? e - i, newStart: l ?? n - i, count: i },
        }),
        (o = e),
        (s = n),
        (a = !0));
      continue;
    }
    if (!(!a || e.startsWith(`\\`))) {
      if (r.length >= n) {
        i = !0;
        break;
      }
      (e.startsWith(`+`)
        ? (r.push({ kind: `add`, lineNo: s, text: e.slice(1) }), (s += 1))
        : e.startsWith(`-`)
          ? (r.push({ kind: `del`, lineNo: o, text: e.slice(1) }), (o += 1))
          : (r.push({ kind: `ctx`, lineNo: s, text: e.slice(1) }), (o += 1), (s += 1)),
        (c = o),
        (l = s));
    }
  }
  return { lines: r, truncated: i };
}
var $_;
function ev() {
  return (ev = e(() => {
    $_ = 600;
  }))();
}
function tv(e, t, n) {
  return t === `worktree`
    ? { taskId: e }
    : { taskId: e, mode: t, ...(n ? { cloudProfileId: n } : {}) };
}
function nv() {
  return (nv = e(() => {}))();
}
var rv;
function iv() {
  return (iv = e(() => {
    rv = class {
      constructor() {
        ((this.activeSessionKey = ``), (this.requested = !1));
      }
      shouldPatch(e, t) {
        let n = e.trim();
        return (
          n !== this.activeSessionKey && ((this.activeSessionKey = n), (this.requested = !1)),
          n
            ? t === !1
              ? ((this.requested = !1), !1)
              : t !== !0 || this.requested
                ? !1
                : ((this.requested = !0), !0)
            : !1
        );
      }
      patchFailed(e) {
        e.trim() === this.activeSessionKey && (this.requested = !1);
      }
    };
  }))();
}
function av(e) {
  let t = [],
    n = ``,
    r = null,
    i = !1;
  for (let a = 0; a < e.length; a += 1) {
    let o = e[a] ?? ``;
    if (o === `\\` && r === `"`) {
      let t = 1;
      for (; e[a + t] === `\\`;) t += 1;
      (e[a + t] === `"`
        ? ((n += `\\`.repeat(Math.floor(t / 2))), t % 2 == 0 ? (r = null) : (n += `"`), (a += t))
        : ((n += `\\`.repeat(t)), (a += t - 1)),
        (i = !0));
      continue;
    }
    if (o === `\\` && r === null) {
      let t = e[a + 1];
      t && (t === `"` || t === `'` || /\s/u.test(t))
        ? ((n += t), (i = !0), (a += 1))
        : ((n += o), (i = !0));
      continue;
    }
    if (r) {
      (o === r ? (r = null) : (n += o), (i = !0));
      continue;
    }
    if (o === `'` || o === `"`) {
      ((r = o), (i = !0));
      continue;
    }
    if (/\s/u.test(o)) {
      i &&= (t.push(n), (n = ``), !1);
      continue;
    }
    ((n += o), (i = !0));
  }
  return r ? null : (i && t.push(n), t);
}
function ov(e, t) {
  if (t !== `stdio`)
    try {
      let n = new URL(e).protocol;
      return n === `http:` || n === `https:` ? { url: e, transport: t } : null;
    } catch {
      return null;
    }
  if (/^https?:\/\//i.test(e)) return null;
  let [n, ...r] = av(e.trim()) ?? [];
  return n ? (r.length > 0 ? { command: n, args: r } : { command: n }) : null;
}
function sv(e) {
  if (!e) return null;
  let t = g(g(e.mcp)?.servers) ?? {};
  return Object.entries(t)
    .map(([e, t]) => {
      let n = g(t) ?? {},
        r = typeof n.url == `string` ? n.url : ``,
        i = typeof n.command == `string` ? n.command : ``,
        a = i
          ? `stdio`
          : r
            ? n.transport === `streamable-http`
              ? `streamable-http`
              : n.transport === void 0 || n.transport === `sse`
                ? `sse`
                : `invalid`
            : `invalid`;
      return {
        name: e,
        enabled: n.enabled !== !1,
        transport: a,
        target: i || ne(r),
        auth: typeof n.auth == `string` ? n.auth : null,
        toolFilter: !!n.toolFilter,
        parallel: n.supportsParallelToolCalls === !0,
        tls: n.sslVerify === !1 ? `verify-off` : n.clientCert || n.clientKey ? `mtls` : null,
      };
    })
    .toSorted((e, t) => e.name.localeCompare(t.name));
}
function cv(e, t, n) {
  return Object.hasOwn(e, t)
    ? { error: j(`mcpServers.nameTaken`, { name: t }) }
    : { patch: { [t]: n } };
}
function lv(e, t, n) {
  return Object.hasOwn(e, t)
    ? { patch: { [t]: { enabled: n ? null : !1 } } }
    : { error: j(`mcpServers.missing`, { name: t }) };
}
function uv(e, t) {
  return Object.hasOwn(e, t)
    ? { patch: { [t]: null } }
    : { error: j(`mcpServers.missing`, { name: t }) };
}
async function dv(e, t) {
  try {
    return (
      await e.ensureLoaded(),
      (await e.patchFromSnapshot((e) => {
        let n = g(g(e.mcp)?.servers) ?? {},
          r = t.buildPatch(n);
        return `error` in r ? r : { options: { raw: { mcp: { servers: r.patch } }, note: t.note } };
      }))
        ? (await e.refresh(), { ok: !0 })
        : { ok: !1, error: e.state.lastError ?? j(`mcpServers.configUnavailable`) }
    );
  } catch (e) {
    return { ok: !1, error: A(e) };
  }
}
var fv;
function pv() {
  return (pv = e(() => {
    (f(), M(), T(), (fv = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/));
  }))();
}
function mv(e, t = (e) => e) {
  let n = {};
  for (let [r, i] of Object.entries(e ?? {}))
    Object.defineProperty(n, r, { configurable: !0, enumerable: !0, value: t(i), writable: !0 });
  return n;
}
function hv(e, t) {
  return e != null && Object.hasOwn(e, t) ? e[t] : void 0;
}
function gv(e, t, n) {
  Object.defineProperty(e, t, { configurable: !0, enumerable: !0, value: n, writable: !0 });
}
function _v(e) {
  return {
    ...(e?.mcpServers ? { mcpServers: mv(e.mcpServers) } : {}),
    ...(e?.mcpToolsDeny ? { mcpToolsDeny: mv(e.mcpToolsDeny, (e) => [...e]) } : {}),
    ...(e?.skills ? { skills: mv(e.skills) } : {}),
    ...(e?.webSearch === void 0 ? {} : { webSearch: e.webSearch }),
  };
}
function vv(e, t) {
  return t ?? e;
}
function yv(e, t, n, r, i) {
  let a = _v(e),
    o = mv(Object.hasOwn(a, t) ? a[t] : void 0);
  return (
    r === i ? delete o[n] : gv(o, n, r), Object.keys(o).length === 0 ? delete a[t] : (a[t] = o), a
  );
}
function bv(e, t, n = !0) {
  let r = _v(e);
  return (t === n ? delete r.webSearch : (r.webSearch = t), r);
}
function xv(e, t, n, r) {
  let i = _v(e),
    a = Object.hasOwn(i, `mcpToolsDeny`) ? i.mcpToolsDeny : void 0,
    o = new Set(hv(a, t) ?? []);
  r ? o.add(n) : o.delete(n);
  let s = mv(a, (e) => [...e]);
  return (
    o.size > 0 ? gv(s, t, [...o].toSorted()) : delete s[t],
    Object.keys(s).length === 0 ? delete i.mcpToolsDeny : (i.mcpToolsDeny = s),
    i
  );
}
function Sv(e) {
  return (
    Object.keys(e?.mcpServers ?? {}).length +
    Object.keys(e?.skills ?? {}).length +
    Object.keys(e?.mcpToolsDeny ?? {}).length +
    (e?.webSearch === void 0 ? 0 : 1)
  );
}
function Cv(e, t) {
  return [
    ...Object.keys(e?.mcpServers ?? {}),
    ...Object.keys(e?.skills ?? {}),
    ...Object.keys(e?.mcpToolsDeny ?? {}),
    ...(e?.webSearch === void 0 ? [] : [t]),
  ].toSorted((e, t) => e.localeCompare(t));
}
function wv() {
  return (wv = e(() => {}))();
}
function Tv(e) {
  return e.key.replace(/[:.-]/g, `_`);
}
function Ev(e) {
  return (e.aliases ?? [])
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => (e.startsWith(`/`) ? e.slice(1) : e));
}
function Dv(e) {
  return e.name.trim() || null;
}
function Ov(e) {
  if (e.args?.length)
    return e.args
      .map((e) => {
        let t = `<${e.name}>`;
        return e.required ? t : `[${e.name}]`;
      })
      .join(` `);
}
function kv(e) {
  return typeof e == `string` ? e : e.value;
}
function Av(e) {
  let t = e.args?.[0];
  if (!t) return;
  let n = t.choices?.map(kv).filter(Boolean);
  return n?.length ? n : void 0;
}
function jv(e) {
  let t = dy[Tv(e)];
  if (t) return t;
  switch (e.category) {
    case `session`:
      return `session`;
    case `options`:
      return `model`;
    case `management`:
      return `tools`;
    default:
      return `tools`;
  }
}
function Mv(e) {
  return cy[Tv(e)] ?? `terminal`;
}
function Nv(e) {
  let t = e.tier;
  return t === `essential` || t === `standard` || t === `power` ? t : `standard`;
}
function Pv(e, t = `local`) {
  let n = Dv(e);
  if (!n) return null;
  let r = e.source ?? (t === `local` ? `native` : void 0);
  return {
    key: e.key,
    name: n,
    aliases: Ev(e).filter((e) => e !== n),
    description: py[e.key] ?? e.description,
    ...(fy[e.key] ? { descriptionKey: fy[e.key] } : {}),
    args: my[e.key] ?? Ov(e),
    icon: Mv(e),
    category: jv(e),
    executeLocal: t === `local` && ly.has(e.key),
    argOptions: Av(e),
    tier: t === `local` ? Nv(e) : `standard`,
    ...(r ? { source: r } : {}),
    ...(e.skillDisplayName ? { skillDisplayName: e.skillDisplayName } : {}),
    ...(e.skillModelVisible === void 0 ? {} : { skillModelVisible: e.skillModelVisible }),
    ...(e.clientPresentation ? { clientPresentation: e.clientPresentation } : {}),
  };
}
function Fv(e) {
  let t = e.trim().replace(/^\//u, ``).slice(0, ay),
    n = l(t);
  return !n || !ey.test(n) ? null : n;
}
function Iv(e, t) {
  let n = typeof e == `string` ? e : ``;
  return n.length > t ? i(n, t) : n;
}
function Lv(e) {
  let t = `args` in e ? e.args : void 0;
  return Array.isArray(t) ? t.map((e) => g(e)).filter((e) => e !== null) : [];
}
function Rv(e) {
  if (e.dynamic === !0) return [];
  let t = e.choices;
  return Array.isArray(t)
    ? t
        .map((e) => {
          if (typeof e == `string`) return Iv(e, ay);
          let t = g(e);
          return t ? { value: Iv(t.value, ay), label: Iv(t.label, ay) } : null;
        })
        .filter((e) => (e ? (typeof e == `string` ? !!e : !!e.value) : !1))
    : [];
}
function zv(e) {
  let t = g(e);
  if (
    !t ||
    Object.keys(t).length !== 2 ||
    !Object.hasOwn(t, `when`) ||
    !Object.hasOwn(t, `action`) ||
    t.when !== `no-arguments`
  )
    return;
  let n = g(t.action);
  if (
    !(!n || Object.keys(n).length !== 1 || !Object.hasOwn(n, `kind`) || n.kind !== `device-pairing`)
  )
    return { when: `no-arguments`, action: { kind: `device-pairing` } };
}
function Bv() {
  return [
    ...zn()
      .map((e) => ({
        key: e.key,
        name: e.textAliases[0]?.replace(/^\//u, ``) ?? e.key,
        aliases: e.textAliases,
        description: e.description,
        args: e.args?.map((e) => ({
          name: e.name,
          required: e.required,
          choices: Array.isArray(e.choices) ? e.choices : void 0,
        })),
        category: e.category,
        tier: e.tier,
      }))
      .map((e) => Pv(e, `local`))
      .filter((e) => e !== null),
    ...uy,
  ];
}
function Vv(e = Bv()) {
  let t = new Set();
  for (let n of e) {
    t.add(l(n.name));
    for (let e of n.aliases ?? []) {
      let n = Fv(e);
      n && t.add(n);
    }
  }
  return t;
}
function Hv(e, t) {
  let n = (Array.isArray(e.textAliases) ? e.textAliases : [])
      .slice(0, ny)
      .filter((e) => typeof e == `string`)
      .map(Fv)
      .filter((e) => !!e)
      .filter((e) => !t.has(e)),
    r = n[0] ?? (typeof e.name == `string` ? Fv(e.name) : null);
  if (!r || t.has(r)) return null;
  let i = Lv(e)
    .slice(0, ry)
    .map((e) => ({
      name: Iv(e.name, sy),
      required: e.required === !0,
      choices: Rv(e).slice(0, iy),
    }))
    .filter((e) => e.name.length > 0)
    .map((e) =>
      Object.assign(
        { name: e.name },
        e.required ? { required: !0 } : {},
        e.choices.length > 0 ? { choices: e.choices } : {},
      ),
    );
  return {
    key: r,
    name: r,
    aliases: n.map((e) => `/${e}`),
    description: Iv(e.description, oy),
    ...(i.length > 0 ? { args: i } : {}),
    category: typeof e.category == `string` ? e.category : void 0,
    source:
      e.source === `native` || e.source === `plugin` || e.source === `skill` ? e.source : void 0,
    skillDisplayName:
      (typeof e.skillDisplayName == `string` && Iv(e.skillDisplayName, ay).trim()) || void 0,
    skillModelVisible: typeof e.skillModelVisible == `boolean` ? e.skillModelVisible : void 0,
    clientPresentation: e.source === `plugin` ? zv(e.clientPresentation) : void 0,
  };
}
function Uv(e) {
  Q.splice(0, Q.length, ...e);
}
function Wv(e) {
  let t = Bv(),
    n = Vv(t),
    r = e
      .slice(0, ty)
      .map((e) => Hv(e, n))
      .filter((e) => e !== null)
      .map((e) => Pv(e, `remote`))
      .filter((e) => e !== null),
    i = new Map();
  for (let e of [...t, ...r]) {
    let t = l(e.name);
    !t || i.has(t) || i.set(t, e);
  }
  return Array.from(i.values());
}
function Gv(e) {
  let t = e?.commands;
  return Array.isArray(t) ? t.map((e) => g(e)).filter((e) => e !== null) : [];
}
function Kv() {
  return Bv();
}
function qv(e) {
  return j(`chat.commands.categories.${e}`);
}
function Jv(e) {
  return e.descriptionKey ? j(e.descriptionKey) : e.description;
}
function Yv(e, t) {
  let n = [e.name, ...(e.aliases ?? [])].map(l);
  return n.some((e) => e === t)
    ? 0
    : n.some((e) => e.startsWith(t))
      ? 1
      : n.some((e) => e.includes(t))
        ? 2
        : l(Jv(e)).includes(t)
          ? 3
          : _y;
}
function Xv(e, t) {
  let n = l(e),
    r = t?.showAll ?? !1,
    i = n ? Q.filter((e) => Yv(e, n) < _y) : Q;
  return (
    !n && !r && (i = i.filter((e) => (e.tier ?? `standard`) !== `power`)),
    i.toSorted((e, t) => {
      if (n) {
        let r = Yv(e, n) - Yv(t, n);
        if (r !== 0) return r;
      }
      let r = gy[e.tier ?? `standard`] ?? 1,
        i = gy[t.tier ?? `standard`] ?? 1;
      if (r !== i) return r - i;
      let a = hy.indexOf(e.category ?? `session`),
        o = hy.indexOf(t.category ?? `session`);
      return a === o ? 0 : a - o;
    })
  );
}
function Zv(e) {
  return e.skillDisplayName?.trim() || e.name;
}
function Qv(e) {
  let t = l(e),
    n = t.replace(/[\s_]+/gu, `-`);
  return Q.filter((e) => e.source === `skill` && e.skillModelVisible === !0)
    .filter((e) => {
      let r = l(Zv(e)),
        i = r.replace(/[\s_]+/gu, `-`),
        a = l(e.name).replace(/[\s_]+/gu, `-`);
      return !t || r.includes(t) || i.includes(n) || a.startsWith(n) || l(Jv(e)).includes(t);
    })
    .toSorted((e, t) => Zv(e).localeCompare(Zv(t)));
}
function $v(e) {
  let t = e.trim();
  if (!t.startsWith(`/`)) return null;
  let n = t.slice(1),
    r = n.search(/[\s:]/u),
    i = r === -1 ? n : n.slice(0, r),
    a = r === -1 ? `` : n.slice(r).trimStart();
  a.startsWith(`:`) && (a = a.slice(1).trimStart());
  let o = a.trim();
  if (!i) return null;
  let s = l(i),
    c = Q.find((e) => e.name === s || e.aliases?.some((e) => l(e) === s));
  return c ? { command: c, args: o } : null;
}
var ey, ty, ny, ry, iy, ay, oy, sy, cy, ly, uy, dy, fy, py, my, Q, hy, gy, _y;
function vy() {
  return (vy = e(() => {
    (In(),
      M(),
      (ey = /^[a-z0-9][a-z0-9_-]*$/u),
      (ty = 500),
      (ny = 20),
      (ry = 20),
      (iy = 50),
      (ay = 200),
      (oy = 2e3),
      (sy = 200),
      (cy = {
        help: `book`,
        status: `barChart`,
        usage: `barChart`,
        export: `download`,
        export_session: `download`,
        tools: `terminal`,
        skill: `zap`,
        commands: `book`,
        new: `plus`,
        reset: `refresh`,
        compact: `loader`,
        stop: `stop`,
        clear: `trash`,
        model: `brain`,
        models: `brain`,
        think: `brain`,
        verbose: `terminal`,
        fast: `zap`,
        agents: `monitor`,
        subagents: `folder`,
        steer: `send`,
        tts: `volume2`,
      }),
      (ly = new Set([
        `help`,
        `new`,
        `reset`,
        `stop`,
        `compact`,
        `model`,
        `think`,
        `fast`,
        `verbose`,
        `export-session`,
        `usage`,
        `agents`,
        `steer`,
        `redirect`,
      ])),
      (uy = [
        {
          key: `clear`,
          name: `clear`,
          description: `Clear chat history`,
          descriptionKey: `chat.commands.clearDescription`,
          icon: `trash`,
          category: `session`,
          executeLocal: !0,
          tier: `standard`,
        },
        {
          key: `redirect`,
          name: `redirect`,
          description: `Abort and restart with a new message`,
          descriptionKey: `chat.commands.redirectDescription`,
          args: `<message>`,
          icon: `refresh`,
          category: `agents`,
          executeLocal: !0,
          tier: `power`,
        },
      ]),
      (dy = {
        help: `tools`,
        commands: `tools`,
        tools: `tools`,
        skill: `tools`,
        status: `tools`,
        export_session: `tools`,
        usage: `tools`,
        tts: `tools`,
        agents: `agents`,
        subagents: `agents`,
        steer: `agents`,
        redirect: `agents`,
        session: `session`,
        stop: `session`,
        reset: `session`,
        new: `session`,
        compact: `session`,
        model: `model`,
        models: `model`,
        think: `model`,
        verbose: `model`,
        fast: `model`,
        reasoning: `model`,
        elevated: `model`,
        queue: `model`,
      }),
      (fy = { steer: `chat.commands.steerDescription` }),
      (py = { steer: `Inject a message into the active run` }),
      (my = { steer: `<message>` }),
      (Q = Kv()),
      (hy = [`session`, `model`, `tools`, `agents`]),
      (gy = { essential: 0, standard: 1, power: 2 }),
      (_y = 4));
  }))();
}
function yy(e, t) {
  let n = t?.trim(),
    r = e?.snapshot;
  if (!n || !r || typeof r != `object`) return null;
  let i = r.presence;
  if (!Array.isArray(i)) return null;
  let a = i.find((e) => (!e || typeof e != `object` || Array.isArray(e) ? !1 : e.instanceId === n));
  if (!a || typeof a != `object` || Array.isArray(a)) return null;
  let o = a.user;
  if (!o || typeof o != `object` || Array.isArray(o)) return null;
  let s = o;
  return Va({ id: s.id ?? s.email, name: s.name, profileAvatarUrl: s.avatarUrl });
}
function by() {
  return (by = e(() => {
    Ua();
  }))();
}
function xy(e, t, n, r) {
  let i = n.trim();
  if (!i) return;
  let a = l(i);
  t.has(a) || (t.add(a), e.push({ value: i, label: r(i) }));
}
function Sy() {
  return (Sy = e(() => {}))();
}
function Cy(e, t) {
  let n = e?.agentRuntime?.id?.trim(),
    r = t?.agentRuntime?.id?.trim();
  return (
    (!e?.modelProvider || e.modelProvider === t?.modelProvider) &&
    (!e?.model || e.model === t?.model) &&
    (!n || !r || n === r)
  );
}
function wy() {
  return (wy = e(() => {}))();
}
function Ty(e, t, n = [], r) {
  let { provider: i, model: a } = Py({ defaults: t, session: e });
  return Iy({ catalog: n, defaults: t, fallbackLabels: r, model: a, provider: i, session: e });
}
function Ey(e, t, n = []) {
  let r = Ty(e, t, n, []).map((e) => $(e.id));
  return r.length > 0 ? [`default`, ...new Set(r.filter((e) => e && e !== "default"))] : [];
}
function Dy(e, t, n = []) {
  let r = Ty(e, t, n)
    .map((e) => e.label)
    .join(`, `);
  return r.split(`, `).includes(`default`) ? r : `default, ${r}`;
}
function Oy(e, t, n, r = []) {
  let i = N(e);
  if (i) return i;
  let a = l(e);
  return Ty(t, n, r)
    .map((e) => ({ id: N(e.id) ?? l(e.id), label: l(e.label) }))
    .find((e) => e.id === a || e.label === a)?.id;
}
function ky(e, t, n, r = []) {
  return Ty(e, t, r).some((e) => (N(e.id) ?? l(e.id)) === n || N(e.label) === n);
}
function Ay(e, t, n) {
  let r = N(e?.thinkingLevel);
  if (r) return Ty(e, t).find((e) => N(e.id) === r)?.label ?? r;
  if (e?.thinkingDefault) return e.thinkingDefault;
  if ((!e || Cy(e, t)) && t?.thinkingDefault) return t.thinkingDefault;
  let i = e?.modelProvider ?? t?.modelProvider,
    a = e?.model ?? t?.model;
  return !i || !a ? `off` : Rn({ provider: i, model: a, catalog: n });
}
function jy(e) {
  let t = new Set(),
    n = [],
    r = (e, r) => {
      let i = $(e);
      xy(n, t, i, () => zy(i, r));
    };
  for (let t of e) r(t.id, t.label);
  return n;
}
function My(e) {
  return $(e ?? ``) === `off`;
}
function Ny(e) {
  return e.every((e) => My(e.id || e.label));
}
function Py(e) {
  return {
    provider: e.session?.modelProvider ?? e.defaults?.modelProvider ?? null,
    model: e.session?.model ?? e.defaults?.model ?? null,
  };
}
function Fy(e, t, n) {
  return t && n ? e.find((e) => e.provider === t && e.id === n) : void 0;
}
function Iy(e) {
  let t = Cy(e.session, e.defaults),
    n = Fy(e.catalog, e.provider, e.model),
    r =
      (e.session?.thinkingLevels?.length ? e.session.thinkingLevels : null) ??
      (e.session?.model && n?.thinkingLevels?.length ? n.thinkingLevels : null) ??
      (t && e.defaults?.thinkingLevels?.length ? e.defaults.thinkingLevels : null);
  if (r) return e.hideUnsupportedOffOnly && n?.reasoning === !1 && Ny(r) ? [] : r;
  let i =
    (e.session?.thinkingOptions?.length ? e.session.thinkingOptions : null) ??
    (t && e.defaults?.thinkingOptions?.length ? e.defaults.thinkingOptions : null);
  return e.hideUnsupportedOffOnly && n?.reasoning === !1 && (!i || i.every(My))
    ? []
    : (i ?? e.fallbackLabels ?? Nn).map((e) => ({ id: N(e) ?? l(e), label: e }));
}
function Ly(e) {
  let t = e.session ?? e.sessionsResult?.sessions?.find((t) => at(t.key, e.sessionKey)),
    n = t?.thinkingLevel,
    r = typeof n == `string` && n.trim() ? (N(n) ?? n.trim()) : ``,
    i = e.defaults ?? e.sessionsResult?.defaults,
    { provider: a, model: o } = Py({ defaults: i, session: t }),
    s = Fy(e.catalog, a, o),
    c = Iy({
      catalog: e.catalog,
      defaults: i,
      hideUnsupportedOffOnly: !0,
      model: o,
      provider: a,
      session: t,
    }),
    l = (!t || Cy(t, i)) && i?.thinkingDefault ? i.thinkingDefault : void 0,
    u =
      t?.thinkingDefault ??
      (t?.model ? s?.thinkingDefault : void 0) ??
      l ??
      (a && o ? Rn({ provider: a, model: o, catalog: [...e.catalog] }) : `off`),
    d = c.length === 0 && r === `off` ? `` : r,
    f = jy(c),
    p = $(u),
    m = { value: p, displayLabel: Ry(u) },
    h = d || p,
    g = f.findIndex((e) => e.value === h),
    _ = d ? `override` : `default`,
    v = d ? (f[g]?.label ?? zy(d)) : m.displayLabel;
  return {
    selection:
      g >= 0
        ? { kind: `anchored`, source: _, value: h, displayLabel: v, index: g }
        : { kind: `unanchored`, source: _, value: h, displayLabel: v },
    inherited: m,
    options: f,
  };
}
function $(e) {
  return N(e) ?? l(e);
}
function Ry(e) {
  return `Inherited: ${By(e ? $(e) : `off`)}`;
}
function zy(e, t) {
  let n = $(e);
  return !n || n === `off` ? `Off` : By(t?.trim() || n);
}
function By(e) {
  let t = l(e);
  if ([`on`, `enable`, `enabled`].includes(t)) return `On`;
  switch ($(e)) {
    case `adaptive`:
      return `Adaptive`;
    case `minimal`:
      return `Minimal`;
    case `low`:
      return `Low`;
    case `medium`:
      return `Medium`;
    case `high`:
      return `High`;
    case `xhigh`:
      return `Extra high`;
    case `max`:
      return `Maximum`;
    case `ultra`:
      return `Ultra`;
    default:
      return e.charAt(0).toUpperCase() + e.slice(1);
  }
}
function Vy() {
  return (Vy = e(() => {
    (Dn(), Sy(), O());
  }))();
}
function Hy(e) {
  let t = e.replace(/\s+/g, ` `).trim();
  return i(t, Ky);
}
function Uy(e) {
  let t = Hy(e);
  return t ? `Explain "${t}" from this conversation in more detail.` : null;
}
function Wy(e) {
  let t = Hy(e);
  return t ? `Regarding "${t}": ` : null;
}
function Gy(e) {
  return e
    .trim()
    .replace(/^\/(?:btw|side)(?::\s*|\s+|$)/i, ``)
    .trim();
}
var Ky;
function qy() {
  return (qy = e(() => {
    Ky = 300;
  }))();
}
function Jy(e) {
  let t = m(e);
  if (t === void 0) return null;
  let n = t - Date.now();
  if (n <= 0) return `now`;
  let r = Math.floor(n / 6e4);
  if (r < 1) return `<1m`;
  if (r < 60) return `${r}m`;
  let i = Math.floor(r / 60),
    a = r % 60;
  if (i < 24) return a > 0 ? `${i}h ${a}m` : `${i}h`;
  let o = Math.floor(i / 24);
  if (o < 7) {
    let e = i % 24;
    return e > 0 ? `${o}d ${e}h` : `${o}d`;
  }
  return new Date(t).toLocaleDateString(void 0, { month: `short`, day: `numeric` });
}
function Yy(e) {
  return Math.max(0, Math.min(100, Math.round(e)));
}
function Xy(e, t) {
  let n = [];
  for (let r of (e?.providers ?? []).filter(t)) {
    let e = r.usage;
    if (!e) continue;
    let t = (e.windows ?? []).map((e) => {
        let t = { label: (e.label || ``).trim(), usedPercent: Yy(e.usedPercent) };
        return (e.resetAt !== void 0 && (t.resetAt = e.resetAt), t);
      }),
      i = (e.billing ?? []).flatMap((e) => {
        if (
          e.type !== `budget` ||
          !Number.isFinite(e.used) ||
          !Number.isFinite(e.limit) ||
          e.used < 0 ||
          e.limit <= 0
        )
          return [];
        let t = { used: e.used, limit: e.limit, unit: e.unit };
        return (e.label && (t.label = e.label), [t]);
      });
    if (t.length === 0 && i.length === 0) continue;
    let a = [...new Set([r.provider, e.providerId].filter((e) => !!e))],
      o = JSON.stringify([r.displayName, e.accountEmail ?? null, t, i]),
      s = n.find((e) => e.identity === o);
    if (s) {
      for (let e of a) s.group.providers.includes(e) || s.group.providers.push(e);
      continue;
    }
    n.push({
      identity: o,
      group: {
        providers: a,
        displayName: r.displayName,
        ...(e.plan ? { plan: e.plan } : {}),
        ...(e.accountEmail ? { accountEmail: e.accountEmail } : {}),
        windows: t,
        budgets: i,
      },
    });
  }
  return n.map((e) => e.group);
}
function Zy() {
  return (Zy = e(() => {
    S();
  }))();
}
function Qy(e) {
  if (!Number.isFinite(e) || e <= 0) return `0`;
  if (e < 1e3) return String(Math.round(e));
  if (e < 1e6) {
    let t = e >= 1e4 ? Math.round(e / 1e3) : Math.round(e / 100) / 10;
    return t >= 1e3 ? `1m` : `${t}k`;
  }
  return `${e >= 1e7 ? Math.round(e / 1e6) : Math.round(e / 1e5) / 10}m`;
}
function $y(e) {
  return typeof e.tokenBudget == `number` && Number.isFinite(e.tokenBudget)
    ? `${Qy(e.tokensUsed)}/${Qy(e.tokenBudget)}`
    : e.tokensUsed > 0
      ? `${Qy(e.tokensUsed)} used`
      : null;
}
function eb(e) {
  switch (e) {
    case `active`:
      return `Pursuing goal`;
    case `paused`:
      return `Goal paused`;
    case `blocked`:
      return `Goal blocked`;
    case `usage_limited`:
      return `Goal hit usage limits`;
    case `budget_limited`:
      return `Goal unmet`;
    case `complete`:
      return `Goal achieved`;
  }
  return e;
}
function tb(e) {
  let t = $y(e),
    n = eb(e.status);
  return t ? `${n} (${t})` : n;
}
function nb(e, t) {
  let n = (() => {
    switch (e.status) {
      case `active`:
        return t;
      case `paused`:
        return e.pausedAt ?? e.updatedAt;
      case `blocked`:
        return e.blockedAt ?? e.updatedAt;
      case `usage_limited`:
        return e.usageLimitedAt ?? e.updatedAt;
      case `budget_limited`:
        return e.budgetLimitedAt ?? e.updatedAt;
      case `complete`:
        return e.completedAt ?? e.updatedAt;
    }
    return e.status;
  })();
  return Math.max(0, n - e.createdAt);
}
function rb(e) {
  let t = Math.max(0, Math.floor(e / 1e3));
  if (t < 60) return `${t}s`;
  let n = Math.floor(t / 60);
  if (n < 60) return `${n}m`;
  let r = Math.floor(n / 60),
    i = n % 60;
  return i > 0 ? `${r}h ${i}m` : `${r}h`;
}
function ib(e) {
  let t = e.lastStatusNote ? ` - ${e.lastStatusNote}` : ``;
  return `${tb(e)}: ${e.objective}${t}`;
}
function ab() {
  return (ab = e(() => {}))();
}
export {
  pv as $,
  $o as $a,
  Xc as $i,
  Cm as $n,
  ha as $o,
  id as $r,
  pr as $s,
  Eg as $t,
  Kv as A,
  Zs as Aa,
  $l as Ai,
  Xm as An,
  $a as Ao,
  Xd as Ar,
  ki as As,
  m_ as At,
  Uv as B,
  Ws as Ba,
  Tl as Bi,
  zm as Bn,
  Pa as Bo,
  jd as Br,
  Yr as Bs,
  Kg as Bt,
  Ey as C,
  uc as Ca,
  _u as Ci,
  nh as Cn,
  fo as Co,
  Mf as Cr,
  Hi as Cs,
  T_ as Ct,
  by as D,
  Xs as Da,
  nu as Di,
  ch as Dn,
  Ka as Do,
  Qd as Dr,
  Xi as Ds,
  h_ as Dt,
  Cy as E,
  sc as Ea,
  fu as Ei,
  sh as En,
  qa as Eo,
  mf as Er,
  Zi as Es,
  __ as Et,
  qv as F,
  Qs as Fa,
  Ul as Fi,
  Wm as Fn,
  Ua as Fo,
  zd as Fr,
  bi as Fs,
  c_ as Ft,
  bv as G,
  Fs as Ga,
  jl as Gi,
  km as Gn,
  R as Go,
  vd as Gr,
  fi as Gs,
  Pg as Gt,
  wv as H,
  js as Ha,
  Ol as Hi,
  Nm as Hn,
  ka as Ho,
  Od as Hr,
  di as Hs,
  Ug as Ht,
  Xv as I,
  qs as Ia,
  Bl as Ii,
  Vm as In,
  Ha as Io,
  Fd as Ir,
  Oi as Is,
  $g as It,
  Cv as J,
  ps as Ja,
  sl as Ji,
  Em as Jn,
  aa as Jo,
  fd as Jr,
  Gr as Js,
  Jg as Jt,
  hv as K,
  Cs as Ka,
  ml as Ki,
  Fm as Kn,
  ya as Ko,
  xd as Kr,
  ci as Ks,
  Wg as Kt,
  Jv as L,
  Ks as La,
  Vl as Li,
  Hm as Ln,
  La as Lo,
  Pd as Lr,
  hi as Ls,
  Xg as Lt,
  Gv as M,
  ec as Ma,
  Wl as Mi,
  Um as Mn,
  Wa as Mo,
  qd as Mr,
  Ti as Ms,
  l_ as Mt,
  Qv as N,
  Ys as Na,
  Gl as Ni,
  Lm as Nn,
  Ga as No,
  Ud as Nr,
  yi as Ns,
  s_ as Nt,
  yy as O,
  nc as Oa,
  tu as Oi,
  th as On,
  eo as Oo,
  df as Or,
  Ni as Os,
  v_ as Ot,
  Zv as P,
  tc as Pa,
  Kl as Pi,
  Km as Pn,
  Ba as Po,
  Hd as Pr,
  Mi as Ps,
  o_ as Pt,
  lv as Q,
  cs as Qa,
  Zc as Qi,
  Dm as Qn,
  ua as Qo,
  ad as Qr,
  fr as Qs,
  Cg as Qt,
  vy as R,
  Js as Ra,
  Dl as Ri,
  Bm as Rn,
  Ia as Ro,
  Nd as Rr,
  Ei as Rs,
  i_ as Rt,
  Ay as S,
  cc as Sa,
  gu as Si,
  vh as Sn,
  uo as So,
  Pf as Sr,
  Ri as Ss,
  E_ as St,
  wy as T,
  ic as Ta,
  au as Ti,
  oh as Tn,
  so as To,
  ef as Tr,
  Yi as Ts,
  b_ as Tt,
  yv as U,
  Ps as Ua,
  Rl as Ui,
  jm as Un,
  Oa as Uo,
  Sd as Ur,
  ui as Us,
  Hg as Ut,
  Sv as V,
  Ns as Va,
  El as Vi,
  Rm as Vn,
  Fa as Vo,
  Ed as Vr,
  pi as Vs,
  Rg as Vt,
  xv as W,
  Ms as Wa,
  Cl as Wi,
  Am as Wn,
  ra as Wo,
  Td as Wr,
  Zr as Ws,
  Yg as Wt,
  cv as X,
  ls as Xa,
  cl as Xi,
  wm as Xn,
  ta as Xo,
  od as Xr,
  Hr as Xs,
  Sg as Xt,
  fv as Y,
  Ss as Ya,
  ll as Yi,
  Om as Yn,
  ia as Yo,
  cd as Yr,
  Br as Ys,
  Ag as Yt,
  uv as Z,
  as as Za,
  Qc as Zi,
  Tm as Zn,
  ea as Zo,
  dd as Zr,
  Vr as Zs,
  wg as Zt,
  zy as _,
  gc as _a,
  Gn as _c,
  Pu as _i,
  kh as _n,
  Ao as _o,
  Kf as _r,
  Fi as _s,
  B_ as _t,
  $y as a,
  Fc as aa,
  Nr as ac,
  Wu as ai,
  fg as an,
  Fo as ao,
  sm as ar,
  xa as as,
  nv as at,
  $ as b,
  Sc as ba,
  Hn as bc,
  Mu as bi,
  Th as bn,
  vo as bo,
  Nf as br,
  qi as bs,
  F_ as bt,
  Xy as c,
  Gc as ca,
  ur as cc,
  Ku as ci,
  mg as cn,
  Mo as co,
  Yp as cr,
  _a as cs,
  Q_ as ct,
  Wy as d,
  jc as da,
  ar as dc,
  Vu as di,
  cg as dn,
  No as do,
  Qp as dr,
  ba as ds,
  K_ as dt,
  qc as ea,
  Pr as ec,
  td as ei,
  Tg as en,
  es as eo,
  Sm as er,
  ma as es,
  ov as et,
  Uy as f,
  Ac as fa,
  or as fc,
  Hu as fi,
  Yh as fn,
  Oo as fo,
  zp as fr,
  Ea as fs,
  Y_ as ft,
  Dy as g,
  yc as ga,
  Xn as gc,
  Fu as gi,
  Fh as gn,
  go,
  Vf as gr,
  $i as gs,
  I_ as gt,
  Ry as h,
  Cc as ha,
  Wn as hc,
  Iu as hi,
  Xh as hn,
  Eo as ho,
  Ep as hr,
  Bi as hs,
  P_ as ht,
  tb as i,
  Pc as ia,
  jr as ic,
  $u as ii,
  Z as in,
  ns as io,
  am as ir,
  oa as is,
  iv as it,
  Wv as j,
  rc as ja,
  eu as ji,
  Pm as jn,
  Ya as jo,
  Vd as jr,
  Di as js,
  u_ as jt,
  Q as k,
  $s as ka,
  iu as ki,
  qm as kn,
  Qa as ko,
  Jd as kr,
  Pi as ks,
  f_ as kt,
  Jy as l,
  Hc as la,
  rr as lc,
  qu as li,
  dg as ln,
  Do as lo,
  lm as lr,
  ga as ls,
  Z_ as lt,
  qy as m,
  Ec as ma,
  Zn as mc,
  Lu as mi,
  $h as mn,
  To as mo,
  Tp as mr,
  Wi as ms,
  H_ as mt,
  rb as n,
  Kc as na,
  Ir as nc,
  ed as ni,
  bg as nn,
  is as no,
  $p as nr,
  Ta as ns,
  sv as nt,
  nb as o,
  Lc as oa,
  mr as oc,
  Xu as oi,
  lg as on,
  Io as oo,
  _m as or,
  wa as os,
  tv as ot,
  Gy as p,
  kc as pa,
  Qn as pc,
  Bu as pi,
  Zh as pn,
  ko as po,
  wp as pr,
  Ki as ps,
  U_ as pt,
  vv as q,
  ws as qa,
  fl as qi,
  Mm as qn,
  Na as qo,
  pd as qr,
  li as qs,
  jg as qt,
  eb as r,
  Jc as ra,
  dr as rc,
  Qu as ri,
  _g as rn,
  ts as ro,
  cm as rr,
  da as rs,
  rv as rt,
  ab as s,
  Bc as sa,
  lr as sc,
  Gu as si,
  ug as sn,
  zo as so,
  Xp as sr,
  Ca as ss,
  ev as st,
  ib as t,
  Yc as ta,
  Mr as tc,
  nd as ti,
  yg as tn,
  Go as to,
  dm as tr,
  fa as ts,
  dv as tt,
  Zy as u,
  zc as ua,
  ir as uc,
  Uu as ui,
  pg as un,
  ho as uo,
  Zp as ur,
  pa as us,
  X_ as ut,
  Vy as v,
  mc as va,
  qn as vc,
  Nu as vi,
  wh as vn,
  mo as vo,
  If as vr,
  Ji as vs,
  L_ as vt,
  Oy as w,
  hc as wa,
  ou as wi,
  gh as wn,
  co as wo,
  Df as wr,
  Li as ws,
  C_ as wt,
  Ly as x,
  lc as xa,
  Un as xc,
  xu as xi,
  xh as xn,
  lo as xo,
  jf as xr,
  Vi as xs,
  D_ as xt,
  ky as y,
  _c as ya,
  Kn as yc,
  ju as yi,
  Sh as yn,
  jo as yo,
  Af as yr,
  Ii as ys,
  k_ as yt,
  $v as z,
  Gs as za,
  xl as zi,
  Gm as zn,
  za as zo,
  kd as zr,
  wi as zs,
  Mg as zt,
};
//# sourceMappingURL=control-ui-boot-D1_QZILW.js.map
