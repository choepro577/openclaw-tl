import { _ as c } from "./control-ui-boot-CIjwt-AI.js";
import { _ as l, b as u, v as d, y as f } from "./control-ui-boot-DOOMhK8q.js";
import {
  Lt as t,
  Zt as n,
  ji as r,
  ln as i,
  mn as a,
  nn as o,
  xn as s,
} from "./control-ui-foundation-CUUNgsy7.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function p(e) {
  let t = e?.trim() ?? ``;
  if (!t || t === `/`) return ``;
  let n = t.startsWith(`/`) ? t : `/${t}`;
  return n.endsWith(`/`) ? n.slice(0, -1) : n;
}
function m(e, t, n) {
  let r = `${p(n)}${g}${encodeURIComponent(e)}${_}`;
  return t === void 0 ? r : `${r}?v=${encodeURIComponent(String(t))}`;
}
function h(e, t) {
  let n = p(t),
    r = e.startsWith(`/api/users/`)
      ? e
      : n && e.startsWith(`${n}/api/users/`)
        ? e.slice(n.length)
        : ``;
  if (!r.endsWith(`/avatar`)) return;
  let i = r.slice(11, -7);
  if (!(!i || i.includes(`/`)))
    try {
      return r;
    } catch {
      return;
    }
}
var g, _;
function v() {
  return (v = e(() => {
    ((g = `/api/users/`), (_ = `/avatar`));
  }))();
}
var y, b;
function x() {
  return (x = e(() => {
    ((y = `device.pair.changed`), (b = `update.available`));
  }))();
}
function S(e) {
  let t = e.trim();
  if (!t) return ``;
  let n = t.toUpperCase();
  return /[^A-Z_]/.test(n) ? `` : n;
}
function C(e) {
  let t = e.trim();
  return T.some((e) => f(t, e));
}
function ee(e) {
  if (C(e)) return ``;
  let t = e;
  for (let e of T) {
    let n = u(t, e);
    n !== t.trim() && (t = n);
  }
  return t;
}
function w(e) {
  let t = e.trim(),
    n = S(e);
  return n
    ? T.some((e) => {
        let r = e.toUpperCase();
        return n === r || !r.startsWith(n)
          ? !1
          : n.includes(`_`)
            ? !0
            : e !== `NO_REPLY` && t !== t.toUpperCase()
              ? !1
              : n.length >= E[e];
      })
    : !1;
}
var T, E;
function D() {
  return (D = e(() => {
    (d(),
      (T = [l, `ANNOUNCE_SKIP`, `REPLY_SKIP`]),
      (E = { [l]: 2, ANNOUNCE_SKIP: 3, REPLY_SKIP: 3 }));
  }))();
}
function te() {
  return O;
}
var O;
function k() {
  return (k = e(() => {
    O = 3e4;
  }))();
}
function A(e) {
  try {
    let t = new URL(`http://openclaw.invalid`),
      n = new URL(e, t);
    return n.origin === t.origin ? n.pathname : void 0;
  } catch {
    return;
  }
}
var j, M, N, P;
function F() {
  return (F = e(() => {
    ((j = 3e5),
      (M = `__openclaw_plugin_frame_auth_probe`),
      (N = `__openclaw_plugin_frame_auth_origin`),
      (P = `openclaw-plugin-frame-auth-probe`));
  }))();
}
function I(e, t, n) {
  let r = L[e];
  return `${p(t)}${r.prefix}/${encodeURIComponent(n)}${r.suffix}`;
}
var L;
function R() {
  return (R = e(() => {
    (v(),
      (L = {
        agentAvatar: { prefix: `/avatar`, suffix: `` },
        catalogIcon: { prefix: `/__openclaw__/catalog-icon`, suffix: `` },
        channelAvatar: { prefix: `/__openclaw__/channel-avatar`, suffix: `` },
        linkFavicon: { prefix: `/__openclaw__/link-favicon`, suffix: `` },
        pluginIcon: { prefix: `/__openclaw__/plugin-icon`, suffix: `` },
        userAvatar: { prefix: g.slice(0, -1), suffix: _ },
        workspaceIcon: { prefix: `/__openclaw__/workspace-icon`, suffix: `` },
      }));
  }))();
}
var z;
function B() {
  return (B = e(() => {
    z = [
      `apple-touch-icon.png`,
      `favicon-32.png`,
      `favicon.ico`,
      `favicon.svg`,
      `manifest.webmanifest`,
      `sw.js`,
    ];
  }))();
}
var V;
function H() {
  return (H = e(() => {
    (R(), (V = `controlUi.sessionPullRequests.changed`));
  }))();
}
function U(e, t) {
  let n = e?.[t];
  return typeof n == `string` && n.trim() ? n : void 0;
}
function W(e, t) {
  let r = e?.[t];
  return n(r);
}
function G(e, t) {
  let n = e?.[t];
  return a(n);
}
function ne(e) {
  let t = U(e, `viewId`);
  if (!t || t.length > 128) return;
  let n = U(e, `serverName`),
    r = U(e, `toolName`),
    i = U(e, `uiResourceUri`),
    a = U(e, `toolCallId`),
    o = U(e, `originSessionKey`),
    s = e?.resultMetaState === `unavailable` ? `unavailable` : void 0;
  return n &&
    n.length <= 256 &&
    r &&
    r.length <= 256 &&
    i?.startsWith(`ui://`) &&
    i.length <= 2048 &&
    a &&
    a.length <= 512
    ? {
        viewId: t,
        serverName: n,
        toolName: r,
        uiResourceUri: i,
        toolCallId: a,
        ...(o && o.length <= 512 ? { originSessionKey: o } : {}),
        ...(s ? { resultMetaState: s } : {}),
      }
    : { viewId: t };
}
function K(e) {
  return e === `assistant_message` || e === `node_panel` ? e : void 0;
}
function re(e) {
  return e === `strict` || e === `scripts` ? e : void 0;
}
function q(e) {
  return typeof e == `number` && Number.isFinite(e) && e >= 160
    ? Math.min(Math.trunc(e), 1200)
    : void 0;
}
function J(e) {
  return typeof e == `string` && /^[a-z0-9][a-z0-9._-]{0,63}$/u.test(e);
}
function Y(e) {
  if (!e || U(e, `kind`)?.trim().toLowerCase() !== `canvas`) return;
  let t = G(e, `presentation`),
    n = G(e, `view`),
    r = G(e, `source`),
    i = ne(G(e, `mcpApp`)),
    a = i?.viewId,
    o = U(t, `target`) ?? U(e, `target`),
    s = o ? K(o) : `assistant_message`;
  if (!s) return;
  let c = U(t, `title`) ?? U(n, `title`),
    l = q(
      W(t, `preferred_height`) ??
        W(t, `preferredHeight`) ??
        W(n, `preferred_height`) ??
        W(n, `preferredHeight`),
    ),
    u = U(t, `class_name`) ?? U(t, `className`),
    d = U(t, `style`),
    f = re(U(t, `sandbox`)),
    p = U(n, `url`) ?? U(n, `entryUrl`),
    m = U(n, `id`) ?? U(n, `docId`),
    h = U(n, `boardWidgetName`),
    g = J(h) ? h : void 0;
  if (a && m === a)
    return {
      kind: `canvas`,
      surface: s,
      render: `url`,
      viewId: m,
      ...(c ? { title: c } : {}),
      ...(l ? { preferredHeight: l } : {}),
      ...(f ? { sandbox: f } : {}),
      mcpApp: i,
    };
  if (p)
    return {
      kind: `canvas`,
      surface: s,
      render: `url`,
      url: p,
      ...(m ? { viewId: m } : {}),
      ...(c ? { title: c } : {}),
      ...(l ? { preferredHeight: l } : {}),
      ...(u ? { className: u } : {}),
      ...(d ? { style: d } : {}),
      ...(f ? { sandbox: f } : {}),
      ...(g ? { boardWidgetName: g } : {}),
      ...(i ? { mcpApp: i } : {}),
    };
  if (U(r, `type`)?.trim().toLowerCase() === `url`) {
    let e = U(r, `url`);
    return e
      ? {
          kind: `canvas`,
          surface: s,
          render: `url`,
          url: e,
          ...(c ? { title: c } : {}),
          ...(l ? { preferredHeight: l } : {}),
          ...(u ? { className: u } : {}),
          ...(d ? { style: d } : {}),
          ...(f ? { sandbox: f } : {}),
          ...(i ? { mcpApp: i } : {}),
        }
      : void 0;
  }
}
function ie(e) {
  let t = a(e);
  return Y(a(t?.mcpAppPreview));
}
function ae(e) {
  let t = {},
    n = /([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
    r;
  for (; (r = n.exec(e));) {
    let e = r[1]?.trim().toLowerCase(),
      n = (r[2] ?? r[3] ?? ``).trim();
    e && n && (t[e] = n);
  }
  return t;
}
function oe(e) {
  return `/__openclaw__/canvas/documents/${encodeURIComponent(e.trim())}/index.html`;
}
function se(e) {
  if (e.target && K(e.target) !== `assistant_message`) return;
  let t = e.title?.trim() || void 0,
    n = e.height && Number.isFinite(Number(e.height)) ? q(Number(e.height)) : void 0,
    r = e.class?.trim() || e.class_name?.trim() || void 0,
    i = e.style?.trim() || void 0,
    a = e.ref?.trim(),
    o = e.url?.trim();
  if (o || a)
    return {
      kind: `canvas`,
      surface: `assistant_message`,
      render: `url`,
      url: o ?? oe(s(a, `canvas reference`)),
      ...(a ? { viewId: a } : {}),
      ...(t ? { title: t } : {}),
      ...(n ? { preferredHeight: n } : {}),
      ...(r ? { className: r } : {}),
      ...(i ? { style: i } : {}),
    };
}
function ce(e, t) {
  return Y(e ? i(e) : void 0);
}
function le(e) {
  if (!e?.trim() || !e.toLowerCase().includes(`[embed`)) return { text: e ?? ``, previews: [] };
  let t = c(e),
    n = [];
  for (let r of [
    /\[embed\s+([^\]]*?[^\]/]|)\]([\s\S]*?)\[\/embed\]/gi,
    /\[embed\s+([^\]]*?)\/\]/gi,
  ]) {
    let i;
    for (; (i = r.exec(e));) {
      let e = i.index ?? 0;
      t.some((t) => e >= t.start && e < t.end) ||
        n.push({
          start: e,
          end: e + i[0].length,
          attrs: ae(i[1] ?? ``),
          ...(i[2] === void 0 ? {} : { body: i[2] }),
        });
    }
  }
  if (n.length === 0) return { text: e, previews: [] };
  n.sort((e, t) => e.start - t.start);
  let r = [],
    i = 0,
    a = ``;
  for (let t of n) {
    if (t.start < i) continue;
    a += e.slice(i, t.start);
    let n = se(t.attrs);
    (n ? r.push(n) : (a += e.slice(t.start, t.end)), (i = t.end));
  }
  return (
    (a += e.slice(i)),
    {
      text: a
        .replace(
          /\n{3,}/g,
          `

`,
        )
        .trim(),
      previews: r,
    }
  );
}
function X() {
  return (X = e(() => {
    (t(), o());
  }))();
}
function Z(e) {
  return typeof e == `string` ? e.toLowerCase() : ``;
}
function ue(e) {
  let t = Z(e);
  return t === `toolcall` || t === `tool_call` || t === `tooluse` || t === `tool_use`;
}
function de(e) {
  let t = Z(e);
  return t === `toolresult` || t === `tool_result`;
}
function fe(e) {
  return e.args ?? e.arguments ?? e.input;
}
function pe(e) {
  for (let t of Q) {
    let n = r(e[t]);
    if (n) return n;
  }
}
var Q;
function $() {
  return ($ = e(() => {
    Q = [`id`, `tool_call_id`, `toolCallId`, `tool_use_id`, `toolUseId`];
  }))();
}
export {
  b as A,
  k as C,
  C as D,
  w as E,
  m as M,
  h as N,
  ee as O,
  v as P,
  A as S,
  D as T,
  j as _,
  pe as a,
  M as b,
  le as c,
  V as d,
  H as f,
  R as g,
  I as h,
  fe as i,
  x as j,
  y as k,
  X as l,
  B as m,
  ue as n,
  ie as o,
  z as p,
  de as r,
  ce as s,
  $ as t,
  J as u,
  P as v,
  te as w,
  F as x,
  N as y,
};
//# sourceMappingURL=control-ui-boot-BbQ-8EFH.js.map
