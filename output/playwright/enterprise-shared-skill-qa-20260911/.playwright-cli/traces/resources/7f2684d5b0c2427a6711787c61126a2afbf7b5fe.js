import { La as v, Ra as y, h as b, p as ne } from "./control-ui-boot-Bvc3ZZNG.js";
import {
  Bt as c,
  Gt as l,
  Ht as u,
  Rt as d,
  Vt as f,
  Wt as p,
} from "./control-ui-boot-CIjwt-AI.js";
import { aa as m, ca as h, ia as g } from "./control-ui-boot-D1_QZILW.js";
import { d as ee, h as _, m as te } from "./control-ui-boot-DJiLHUhu.js";
import { D as re, S as ie, w as ae } from "./control-ui-boot-DWMwnn3C.js";
import { Wo as i, zo as a } from "./control-ui-core-B5rJKETr.js";
import { Mr as o, Nr as s } from "./control-ui-core-BOclcphE.js";
import { fn as t, nn as n, on as r } from "./control-ui-foundation-CUUNgsy7.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function x(e, t = {}) {
  let n = Object.hasOwn(t, `sessionId`) ? t.sessionId : e.currentSessionId;
  return {
    sessionKey: t.sessionKey ?? e.sessionKey,
    ...(t.agentId ? { agentId: t.agentId } : {}),
    ...(n ? { sessionId: n } : {}),
    ...(t.lifecycleRevision === void 0 ? {} : { lifecycleRevision: t.lifecycleRevision }),
    ...(Object.hasOwn(t, `activeLeafEntryId`) || Object.hasOwn(e, `chatDisplayedLeafEntryId`)
      ? {
          activeLeafEntryId: Object.hasOwn(t, `activeLeafEntryId`)
            ? (t.activeLeafEntryId ?? null)
            : (e.chatDisplayedLeafEntryId ?? null),
        }
      : {}),
  };
}
function S(e, t = [], n = {}) {
  let r = E.get(e),
    i =
      r !== void 0 &&
      [`sessionKey`, `sessionId`, `agentId`, `lifecycleRevision`, `activeLeafEntryId`].some((e) => {
        if (!Object.hasOwn(n, e)) return !1;
        let t = r.scope[e];
        return t !== void 0 && t !== n[e];
      });
  if (!r || i) {
    let r = d(n, t);
    return (E.set(e, r), r);
  }
  let a = [`sessionKey`, `sessionId`, `agentId`, `lifecycleRevision`, `activeLeafEntryId`].some(
      (e) => Object.hasOwn(n, e) && r.scope[e] === void 0 && n[e] !== void 0,
    )
      ? { ...r, scope: { ...r.scope, ...n } }
      : r,
    o = a.messages.length === t.length && a.messages.every((e, n) => e === t[n]) ? a : f(a, t, n);
  return (o !== r && E.set(e, o), o);
}
function C(e, t) {
  E.set(e, t);
}
function oe(e, t, n = {}) {
  let r = n.scope ?? x(e),
    i = S(e, e.chatMessages, r),
    a = n.event ? u(i, { ...n.event, scope: r }) : i,
    o = n.event?.type === `messagePersisted` ? n.event.message : null,
    s = new Set(a.entries.map((e) => e.message)),
    c = n.retainSupersededMessages
      ? new Set()
      : new Set(i.entries.filter((e) => !s.has(e.message)).map((e) => e.message)),
    l = o === null || s.has(o),
    f = [],
    p = !1;
  for (let e of t) {
    if (c.has(e)) {
      l && o !== null && !p && (f.push(o), (p = !0));
      continue;
    }
    if (e === o) {
      if (!l || p) continue;
      p = !0;
    }
    f.push(e);
  }
  let m = [...a.entries],
    h = d(r, f).entries.map((e) => {
      let t = m.findIndex((t) => t.message === e.message);
      return t < 0 ? e : (m.splice(t, 1)[0] ?? e);
    }),
    g = { ...a, scope: { ...a.scope, ...r }, entries: h, messages: h.map((e) => e.message) };
  return (C(e, g), (e.chatMessages = [...g.messages]), g);
}
function w(e, n, r) {
  let i = l(e, n),
    a = r.message.__openclaw?.seq ?? null;
  if (
    i?.role !== `user` ||
    i.isImported ||
    i.runId !== r.pendingRunId ||
    (a !== null && i.sequence !== a)
  )
    return e;
  let o = t(e) ?? {},
    { media: s, ...c } = t(o.__openclaw) ?? {};
  return {
    ...r.message,
    ...o,
    content: r.message.content,
    __openclaw: { ...r.message.__openclaw, ...c },
  };
}
function se(e, t) {
  let n = e.initialUserMessage?.read(t, e.client ?? null);
  if (!n) return !1;
  let r = x(e, { sessionKey: t }),
    i = e.chatMessages;
  return (
    T(e, { type: `sendPending`, runId: n.pendingRunId, message: n.message }, { scope: r }),
    e.chatMessages !== i
  );
}
function T(e, t, n = {}) {
  let r = n.scope ?? x(e),
    i = S(e, n.messages ?? e.chatMessages, r),
    a = r.sessionKey ?? e.sessionKey,
    o = e.initialUserMessage?.read(a, e.client ?? null) ?? null,
    s = !1,
    c = (e, t) => {
      let n = o ? w(e, t, o) : e;
      return ((s ||= n !== e), n);
    },
    l =
      t.type === `messagePersisted`
        ? { ...t, message: c(t.message, t.envelope ?? t) }
        : t.type === `snapshotLoaded`
          ? { ...t, messages: t.messages.map((e) => c(e)) }
          : t,
    d = i;
  (t.type === `snapshotLoaded` &&
    o &&
    !s &&
    n.runActive !== !1 &&
    (d = u(d, { type: `sendPending`, runId: o.pendingRunId, message: o.message, scope: r })),
    (d = u(d, { ...l, scope: r })));
  let f =
    e.chatMessages.length === d.messages.length &&
    e.chatMessages.every((e, t) => e === d.messages[t]);
  return (
    d !== i && C(e, d),
    f || (e.chatMessages = [...d.messages]),
    s && n.runActive === !1 && e.initialUserMessage?.clear(a),
    d
  );
}
var E;
function D() {
  return (D = e(() => {
    (c(), p(), (E = new WeakMap()));
  }))();
}
function O() {
  return typeof performance < `u` && typeof performance.now == `function`
    ? performance.now()
    : Date.now();
}
function ce(e) {
  return Math.max(0, Math.round(e));
}
function k(e, t) {
  let n = !0,
    r = null,
    i = null,
    a = () => {
      if (n) {
        n = !1;
        try {
          e();
        } finally {
          t();
        }
      }
    };
  if (typeof window > `u` || typeof window.requestAnimationFrame != `function`) queueMicrotask(a);
  else {
    let e = !1,
      t = window.requestAnimationFrame(() => {
        if (((e = !0), (r = null), !n)) return;
        let t = !1,
          o = window.requestAnimationFrame(() => {
            ((t = !0), (i = null), a());
          });
        t || (i = o);
      });
    e || (r = t);
  }
  return () => {
    n &&
      ((n = !1),
      r !== null && (window.cancelAnimationFrame(r), (r = null)),
      i !== null && (window.cancelAnimationFrame(i), (i = null)));
  };
}
function le(e, t, n) {
  let r = 0;
  return e.filter(
    (e) => !e || typeof e != `object` || !(`event` in e) || e.event !== t || ((r += 1), r <= n),
  );
}
function ue(e, t, n, r) {
  let i = { ts: Date.now(), event: t, payload: n };
  (Array.isArray(e.eventLogBuffer) &&
    (e.eventLogBuffer = [
      i,
      ...(typeof r?.maxBufferedEventsForType == `number`
        ? le(e.eventLogBuffer, t, Math.max(0, r.maxBufferedEventsForType - 1))
        : e.eventLogBuffer),
    ].slice(0, A)),
    r?.console !== !1 && (r?.warn === !0 ? console.warn : console.debug)(`[openclaw] ${t}`, n));
}
function de(e, t) {
  if (e.renderLifecycle) {
    e.renderLifecycle.afterCommit((e) => k(t, e));
    return;
  }
  k(t, () => void 0);
}
var A;
function j() {
  return (j = e(() => {
    A = 250;
  }))();
}
function M(e, t) {
  if (e.length === 0 && t.length === 0) return [];
  let n = Math.max(0, e.length - B),
    r = [...t];
  for (let t = e.length - 1; t >= n; t--) {
    let n = e[t];
    if (!n || typeof n != `object`) continue;
    let i = n;
    if ((typeof i.role == `string` ? i.role.toLowerCase() : ``) !== `user`) continue;
    let a = g(n);
    if (!a || !a.trim()) continue;
    let o = typeof n.timestamp == `number` ? (n.timestamp ?? 0) : 0;
    r.push({ text: a, ts: o });
  }
  r.sort((e, t) => t.ts - e.ts);
  let i = [],
    a = new Set();
  for (let e of r) a.has(e.text) || (a.add(e.text), i.push(e.text));
  return i;
}
function N(e, t) {
  let n = t.trim();
  if (!n) return;
  let r = e.chatLocalInputHistoryBySession[e.sessionKey] ?? [];
  r[0]?.text !== n &&
    (e.chatLocalInputHistoryBySession[e.sessionKey] = [{ text: n, ts: Date.now() }, ...r].slice(
      0,
      B,
    ));
}
function P(e) {
  ((e.chatInputHistorySessionKey = null),
    (e.chatInputHistoryItems = null),
    (e.chatInputHistoryIndex = -1),
    (e.chatDraftBeforeHistory = null));
}
function F(e, t) {
  ((e.chatMessage = t), P(e));
}
function I(e) {
  if (e.chatInputHistoryIndex === -1) return !1;
  if (!Array.isArray(e.chatInputHistoryItems) || e.chatInputHistorySessionKey !== e.sessionKey)
    return !0;
  let t = e.chatInputHistoryItems[e.chatInputHistoryIndex];
  return typeof t != `string` || t !== e.chatMessage;
}
function L(e) {
  if (Array.isArray(e.chatInputHistoryItems) && e.chatInputHistorySessionKey === e.sessionKey)
    return e.chatInputHistoryItems;
  let t = M(e.chatMessages, e.chatLocalInputHistoryBySession[e.sessionKey] ?? []);
  return (
    (e.chatInputHistoryItems = t),
    (e.chatInputHistorySessionKey = e.sessionKey),
    (e.chatInputHistoryIndex = -1),
    (e.chatDraftBeforeHistory = e.chatMessage),
    t
  );
}
function R(e, t) {
  let n = L(e);
  return n.length === 0
    ? !1
    : t === `up`
      ? e.chatInputHistoryIndex >= n.length - 1
        ? !1
        : ((e.chatInputHistoryIndex += 1),
          (e.chatMessage = n[e.chatInputHistoryIndex] ?? e.chatMessage),
          !0)
      : e.chatInputHistoryIndex === -1
        ? !1
        : e.chatInputHistoryIndex === 0
          ? ((e.chatInputHistoryIndex = -1), (e.chatMessage = e.chatDraftBeforeHistory ?? ``), !0)
          : (--e.chatInputHistoryIndex,
            (e.chatMessage = n[e.chatInputHistoryIndex] ?? e.chatMessage),
            !0);
}
function z(e, t) {
  I(e) && P(e);
  let n = e.chatInputHistoryIndex !== -1,
    r = {
      historyNavigationActiveBefore: n,
      historyNavigationActiveAfter: n,
      selectionStart: t.selectionStart,
      selectionEnd: t.selectionEnd,
      valueLength: t.valueLength,
    };
  if (e.chatLoading)
    return {
      ...r,
      handled: !1,
      preventDefault: !1,
      restoreCaret: null,
      decision: `blocked:history-loading`,
    };
  if (t.altKey || t.ctrlKey || t.metaKey || t.shiftKey || t.isComposing || t.keyCode === 229)
    return {
      ...r,
      handled: !1,
      preventDefault: !1,
      restoreCaret: null,
      decision: `blocked:modifier-or-composition`,
    };
  if (t.selectionStart !== t.selectionEnd)
    return {
      ...r,
      handled: !1,
      preventDefault: !1,
      restoreCaret: null,
      decision: `blocked:selection-range`,
    };
  if (n) {
    let n = t.key === `ArrowUp` ? `up` : `down`,
      i = R(e, n),
      a = e.chatInputHistoryIndex !== -1;
    return {
      ...r,
      handled: i,
      preventDefault: i,
      restoreCaret: i ? n : null,
      decision: i
        ? n === `up`
          ? `handled:history-up`
          : `handled:history-down`
        : `blocked:history-boundary`,
      historyNavigationActiveAfter: a,
    };
  }
  if (t.key === `ArrowDown`)
    return {
      ...r,
      handled: !1,
      preventDefault: !1,
      restoreCaret: null,
      decision: `blocked:arrowdown-editing-mode`,
    };
  if (t.selectionStart !== 0)
    return {
      ...r,
      handled: !1,
      preventDefault: !1,
      restoreCaret: null,
      decision: `blocked:arrowup-not-at-start`,
    };
  let i = R(e, `up`),
    a = e.chatInputHistoryIndex !== -1;
  return {
    ...r,
    handled: i,
    preventDefault: i,
    restoreCaret: i ? `up` : null,
    decision: i ? `handled:enter-history-up` : `blocked:history-boundary`,
    historyNavigationActiveAfter: a,
  };
}
var B;
function V() {
  return (V = e(() => {
    (h(), (B = 100));
  }))();
}
function H(e) {
  let t = G.get(e);
  return (t || ((t = new Map()), G.set(e, t)), t);
}
async function fe(e, t) {
  let n = H(e),
    r = t.agentId.trim(),
    i = t?.rejectOnFailure === !0,
    a = `${r}\0${t.preparedOnly ? `prepared` : `exact`}`,
    o = `${r}\0prepared`,
    s = n.get(a),
    c = Date.now(),
    l = t.refresh === !0 || (t.refreshIfDue === !0 && (s?.refreshEligibleAt ?? 0) <= c),
    u = l ? c + W : s?.refreshEligibleAt,
    d = t.refreshIfDue === !0 && (s?.refreshEligibleAt ?? 0) > c;
  if (t.refreshIfDue === !0 && s?.inFlight && s.inFlightRefresh === !0 && s.inFlightRejects === i)
    return s.inFlight;
  if (!l && s?.models && (s.expiresAt > c || d)) return s.models;
  if (s?.inFlight && s.inFlightRejects === i && (!l || s.inFlightRefresh === !0)) return s.inFlight;
  let f = pe(e, s?.models, r, t.preparedOnly === !0, l, i)
    .then((e) => {
      let r = n.get(a);
      if (!r || r.inFlight === f) {
        let r = l ? (e.fresh ? Date.now() + W : void 0) : u,
          i = {
            expiresAt: e.fresh ? Date.now() + U : 0,
            ...(r ? { refreshEligibleAt: r } : {}),
            models: e.models,
          };
        (n.set(a, i), e.fresh && t.preparedOnly !== !0 && n.set(o, i));
      }
      return e.models;
    })
    .catch((e) => {
      let t = n.get(a);
      throw (l && t?.inFlight === f && delete t.refreshEligibleAt, e);
    })
    .finally(() => {
      let e = n.get(a);
      e?.inFlight === f && delete e.inFlight;
    });
  return (
    n.set(a, {
      expiresAt: s?.expiresAt ?? 0,
      ...(u ? { refreshEligibleAt: u } : {}),
      models: s?.models ?? [],
      inFlight: f,
      inFlightRejects: i,
      ...(l ? { inFlightRefresh: !0 } : {}),
    }),
    f
  );
}
async function pe(e, t, n, r, i, a) {
  try {
    return {
      models:
        (
          await e.request(`models.list`, {
            view: `configured`,
            agentId: n,
            ...(r ? { preparedOnly: !0 } : {}),
            ...(i ? { refresh: !0 } : {}),
          })
        )?.models ?? [],
      fresh: !0,
    };
  } catch (e) {
    if (a) throw e;
    return { models: t ?? [], fresh: !1 };
  }
}
var U, W, G;
function K() {
  return (K = e(() => {
    ((U = 6e4), (W = 3e5), (G = new WeakMap()));
  }))();
}
function me(e, t) {
  let n = he(e, t);
  if (!n) return;
  let r = new Blob([n], { type: `text/markdown` }),
    i = URL.createObjectURL(r),
    a = document.createElement(`a`);
  ((a.href = i), (a.download = `chat-${t}-${Date.now()}.md`), a.click(), URL.revokeObjectURL(i));
}
function he(e, t) {
  let n = Array.isArray(e) ? e : [];
  if (n.length === 0) return null;
  let i = [`# Chat with ${t}`, ``];
  for (let e of n) {
    let n = e,
      a = n.role === `user` ? `You` : n.role === `assistant` ? t : `Tool`,
      o = m(e) ?? ``,
      s = r(n.timestamp) ?? ``;
    i.push(`## ${a}${s ? ` (${s})` : ``}`, ``, o, ``);
  }
  return i.join(`
`);
}
function q() {
  return (q = e(() => {
    (n(), h());
  }))();
}
function J(e) {
  X &&= (globalThis.clearTimeout(X.timer), e && re(X.item.attachments ?? []), null);
}
function ge(e, t) {
  (J(!0), (X = { item: t, sessionKey: e, timer: globalThis.setTimeout(() => J(!0), Y) }));
}
function _e(e, t, n, r, i = {}) {
  let a = i.runId?.trim();
  if (!a) return;
  let o = n.attachments?.map((e) => {
      let t = ie(e);
      return t ? { ...e, dataUrl: t, previewUrl: t } : e;
    }),
    s =
      typeof i.messageSeq == `number` && Number.isSafeInteger(i.messageSeq) && i.messageSeq > 0
        ? i.messageSeq
        : void 0,
    c = {
      role: `user`,
      content: v(n.text, o),
      timestamp: n.createdAt,
      __openclaw: { idempotencyKey: `${a}:user`, ...(s === void 0 ? {} : { seq: s }) },
    };
  e.prepare({ message: c, owner: r, sessionKey: t, pendingRunId: a });
}
function ve(e) {
  if (!X || !a(X.sessionKey, e)) return null;
  let t = X.item;
  return (J(!1), t);
}
function ye(e, t) {
  let n = ve(t);
  return n
    ? (_(e, t, n.agentId).some((e) => e.id === n.id) || te(e, t, n, n.agentId, { retryable: !0 }),
      !0)
    : !1;
}
var Y, X;
function Z() {
  return (Z = e(() => {
    (i(), ae(), ee(), y(), (Y = 6e4), (X = null));
  }))();
}
function be(e) {
  return (t, n) => ne({ ...e, hostname: t, signal: n });
}
function xe(e, t) {
  for (let n of e.querySelectorAll(`img.markdown-link-favicon[data-link-favicon-host]`)) {
    if (n.dataset.linkFaviconState) continue;
    let e = n.dataset.linkFaviconHost?.trim();
    if (!e) {
      n.dataset.linkFaviconState = `failed`;
      continue;
    }
    if (/openclaw/i.test(e)) {
      ((n.src = o(`favicon.svg`)),
        n.classList.add(`is-loaded`),
        (n.dataset.linkFaviconState = `loaded`));
      continue;
    }
    if (!t) continue;
    n.dataset.linkFaviconState = `loading`;
    let r = new AbortController(),
      i = window.setTimeout(() => r.abort(), Q);
    t(e, r.signal)
      .then((e) => {
        if (!e) {
          n.dataset.linkFaviconState = `failed`;
          return;
        }
        if (!n.isConnected) {
          URL.revokeObjectURL(e);
          return;
        }
        let t = () => URL.revokeObjectURL(e);
        (n.addEventListener(
          `load`,
          () => {
            (n.naturalWidth > 0 &&
              (n.classList.add(`is-loaded`), (n.dataset.linkFaviconState = `loaded`)),
              t());
          },
          { once: !0 },
        ),
          n.addEventListener(
            `error`,
            () => {
              ((n.dataset.linkFaviconState = `failed`), t());
            },
            { once: !0 },
          ),
          (n.src = e));
      })
      .catch(() => {
        n.dataset.linkFaviconState = `failed`;
      })
      .finally(() => window.clearTimeout(i));
  }
}
var Q;
function $() {
  return ($ = e(() => {
    (s(), b(), (Q = 15e3));
  }))();
}
export {
  S as C,
  T as D,
  x as E,
  C as O,
  se as S,
  oe as T,
  O as _,
  Z as a,
  ce as b,
  me as c,
  fe as d,
  F as f,
  P as g,
  N as h,
  ye as i,
  q as l,
  V as m,
  xe as n,
  ge as o,
  z as p,
  $ as r,
  _e as s,
  be as t,
  K as u,
  j as v,
  D as w,
  de as x,
  ue as y,
};
//# sourceMappingURL=control-ui-boot-DkB48Nei.js.map
