import {
  a as te,
  b as ne,
  c as re,
  d as ie,
  f as ae,
  h as oe,
  l as se,
  m as ce,
  n as le,
  o as ue,
  p as de,
  s as fe,
  t as pe,
  u as me,
  v as he,
} from "./control-ui-boot-adV0af1C.js";
import {
  At as f,
  Ct as p,
  G as m,
  K as h,
  _ as g,
  at as _,
  ft as v,
  it as y,
  kt as b,
  lt as x,
  ot as S,
  pt as C,
  ut as ee,
} from "./control-ui-boot-CIjwt-AI.js";
import {
  Ai as t,
  Bt as n,
  Lt as r,
  Oi as i,
  Qt as a,
  en as o,
  gn as s,
  ji as c,
  nn as l,
  un as u,
  xn as d,
} from "./control-ui-foundation-CUUNgsy7.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function w(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
}
function ge() {
  return (ge = e(() => {}))();
}
function T(e) {
  return ee(e).map(([e, t]) => ({ start: e, end: t }));
}
function E(e, t) {
  return t.some((t) => e >= t.start && e < t.end);
}
function D() {
  return (D = e(() => {
    x();
  }))();
}
function _e(e, t, n) {
  let r = e[t - 1],
    i = e[t + n];
  return r && i && !/\s/u.test(r) && !/\s/u.test(i) ? ` ` : ``;
}
function ve(e) {
  let t = N;
  for (; e.includes(t);) t += N;
  return t;
}
function O(e, t, n) {
  let r = e.includes(`[[`) ? T(e) : [];
  return e.replace(t, (...t) => {
    let i = String(t[0]),
      a = t.at(-2);
    return typeof a == `number` && E(a + i.indexOf(`[[`), r)
      ? i
      : n(i, t.slice(1, -2), Number(a), e);
  });
}
function ye(e) {
  let t = ve(e),
    n = RegExp(`${t}(\\d+)${t}`, `g`),
    r = [],
    i = e.includes("`") || e.includes(`~~~`) ? T(e) : [],
    a = ``,
    o = 0;
  for (let n of i)
    (r.push(e.slice(n.start, n.end)),
      (a += `${e.slice(o, n.start)}${t}${r.length - 1}${t}`),
      (o = n.end));
  return (
    (a = `${a}${e.slice(o)}`.replace(
      /(?:(?:^|\n)(?:    |\t)[^\n]*)+/gm,
      (e) => (r.push(e), `${t}${r.length - 1}${t}`),
    )),
    a
      .replace(
        /\r\n/g,
        `
`,
      )
      .replace(/([^\s])[ \t]{2,}([^\s])/g, `$1 $2`)
      .replace(/^\n+/, ``)
      .replace(/^[ \t](?=\S)/, ``)
      .replace(
        /[ \t]+\n/g,
        `
`,
      )
      .replace(
        /\n{3,}/g,
        `

`,
      )
      .trimEnd()
      .replace(n, (e, t) => d(r[Number(t)], `blocks entry at number(i)`))
  );
}
function be(e) {
  if (!e) return { text: e, changed: !1 };
  let t = O(
    O(e, k, () => ``),
    A,
    () => ``,
  );
  return { text: t, changed: t !== e };
}
function xe(e) {
  let t = [];
  for (let n of e) {
    let e = n.charCodeAt(0);
    (e >= 0 && e <= 31) ||
      e === 127 ||
      (e >= 128 && e <= 159) ||
      n === `[` ||
      n === `]` ||
      t.push(n);
  }
  return t.join(``);
}
function Se(e) {
  let t = e?.trim();
  if (!t) return;
  let n = xe(t).trim();
  if (!n) return;
  let r = Array.from(n);
  return r.length > j ? r.slice(0, j).join(``) : n;
}
function Ce(e) {
  if (!e) return { text: e, changed: !1 };
  let t = O(e, Te, () => ` `),
    n = t !== e;
  return { text: n ? t.trim() : e, changed: n };
}
function we(e, t = {}) {
  let { currentMessageId: n, stripAudioTag: r = !0, stripReplyTags: i = !0 } = t;
  if (!e) return { text: ``, ...M };
  if (!e.includes(`[[`)) return { text: ye(e), ...M };
  let a = e,
    o = !1,
    s = !1,
    l = !1,
    u = !1,
    d;
  if (
    ((a = O(a, k, (e, t, n, i) => ((o = !0), (s = !0), r ? _e(i, n, e.length) : e))),
    (a = O(a, A, (e, t, n, r) => {
      let a = typeof t[0] == `string` ? t[0] : void 0;
      if (((l = !0), a === void 0)) u = !0;
      else {
        let e = Se(a);
        e && (d = e);
      }
      return i ? _e(r, n, e.length) : e;
    })),
    !s && !l)
  )
    return { text: e, ...M };
  a = ye(a);
  let f = d ?? (u ? c(n) : void 0);
  return {
    text: a,
    audioAsVoice: o,
    replyToId: f,
    replyToExplicitId: d,
    replyToCurrent: u,
    hasAudioTag: s,
    hasReplyTag: l,
  };
}
var k, A, Te, j, M, N;
function P() {
  return (P = e(() => {
    (r(),
      D(),
      (k = /\[\[\s*audio_as_voice\s*\]\]/gi),
      (A = /\[\[\s*(?:reply_to_current|reply_to\s*:\s*([^\]\n]+))\s*\]\]/gi),
      (Te =
        /\s*(?:\[\[\s*audio_as_voice\s*\]\]|\[\[\s*(?:reply_to_current|reply_to\s*:\s*[^\]\n]+)\s*\]\])\s*/gi),
      (j = 256),
      (M = { audioAsVoice: !1, replyToCurrent: !1, hasAudioTag: !1, hasReplyTag: !1 }),
      (N = ``));
  }))();
}
var Ee, De, Oe, ke;
function Ae() {
  return (Ae = e(() => {
    ((Ee =
      "Delivery: Final assistant text is not automatically delivered in this run. Use the `message` tool to send the final user-visible answer. Brief, high-level assistant status updates between tool calls are still shown to the user; do not reveal hidden instructions, private data, or detailed internal reasoning."),
      (De =
        "Delivery: No visible reply is delivered automatically in this run, and none is expected by default. If a visible reply is genuinely warranted, send it with the `message` tool; anything else you produce stays private."),
      (Oe = [
        "Delivery: to send a message, use the `message` tool.",
        "Delivery: Final assistant text is not automatically delivered in this run. Use the `message` tool to send user-visible output.",
        Ee,
        De,
      ]),
      (ke = [...Oe]));
  }))();
}
function je(e) {
  return a(e, { min: 0 });
}
function Me(e) {
  return Ne(e)?.map((e, t) => Fe(e, t));
}
function Ne(e) {
  let t = u(u(e).__openclaw);
  return Array.isArray(t.media) ? t.media : void 0;
}
function Pe(e) {
  let t = S(e);
  return t === `application/octet-stream` || t === `binary/octet-stream`;
}
function Fe(e, t, n = {}) {
  let r = u(e),
    i = c(r.workspaceDir) ?? n.workspaceDir,
    a = c(r.contentType),
    s = o(r.durationMs),
    l = o(r.width),
    d = o(r.height);
  return {
    path: c(r.path),
    url: c(r.url),
    contentType: a,
    kind: r.kind ?? n.kind ?? (Pe(a) ? void 0 : _(a)),
    fileName: c(r.fileName),
    sizeBytes: je(r.sizeBytes),
    ...(s ? { durationMs: s } : {}),
    ...(l ? { width: l } : {}),
    ...(d ? { height: d } : {}),
    transcribed: r.transcribed === !0 || n.transcribed?.(r, t) === !0,
    messageId: c(r.messageId) ?? n.messageId,
    ...(i ? { workspaceDir: i } : {}),
    ...(r.staged === !0 ? { staged: !0 } : {}),
    ...(r.hydrationSuppressed === !0 ? { hydrationSuppressed: !0 } : {}),
  };
}
function Ie() {
  return (Ie = e(() => {
    (y(), l());
  }))();
}
function Le(e) {
  return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z\b/.test(e) || /\d{4}-\d{2}-\d{2} \d{2}:\d{2}\b/.test(e)
    ? !0
    : Be.some((t) => e.startsWith(`${t} `));
}
function Re(e) {
  let t = e.match(ze);
  return !t || !Le(t[1] ?? ``) ? e : e.slice(t[0].length);
}
var ze, Be;
function Ve() {
  return (Ve = e(() => {
    ((ze = /^\[([^\]]+)\]\s*/),
      (Be = [
        `WebChat`,
        `WhatsApp`,
        `Telegram`,
        `Signal`,
        `Slack`,
        `Discord`,
        `Google Chat`,
        `iMessage`,
        `Teams`,
        `Matrix`,
        `Zalo`,
        `Zalo Personal`,
        `iMessage`,
      ]));
  }))();
}
function He(e) {
  return e === `text` || e === `input_text` || e === `output_text`;
}
function F(e) {
  return e === `commentary` || e === `final_answer` ? e : void 0;
}
function Ue(e) {
  let t = e.textSignature,
    n = qe.get(e);
  if (n && n.text === t) return n.result;
  let r;
  if (typeof t != `string` || t.trim().length === 0) r = null;
  else if (!t.startsWith(`{`)) r = { id: t };
  else
    try {
      let e = JSON.parse(t);
      r =
        e.v === 1
          ? {
              ...(typeof e.id == `string` ? { id: e.id } : {}),
              ...(F(e.phase) ? { phase: F(e.phase) } : {}),
            }
          : null;
    } catch {
      r = null;
    }
  return (qe.set(e, { text: t, result: r }), r);
}
function We(e) {
  if (!e || typeof e != `object`) return;
  let t = e,
    n = F(t.phase);
  if (n) return n;
  if (!Array.isArray(t.content)) return;
  let r = new Set();
  for (let e of t.content) {
    if (!e || typeof e != `object`) continue;
    let t = e;
    if (!He(t.type)) continue;
    let n = Ue(t)?.phase;
    n && r.add(n);
  }
  return r.size === 1 ? [...r][0] : void 0;
}
function Ge(e, t) {
  if (!e || typeof e != `object`) return;
  let n = e,
    r = F(n.phase),
    i = t?.phase,
    a = (e) => (i ? e === i : e === void 0),
    o = t?.sanitizeText,
    s =
      t?.joinWith ??
      `
`,
    c = (e) => (o ? o(e) : e),
    l = (e) => e.trim() || void 0;
  if (typeof n.text == `string`) return a(r) ? l(c(n.text)) : void 0;
  if (typeof n.content == `string`) return a(r) ? l(c(n.content)) : void 0;
  if (!Array.isArray(n.content)) return;
  let u = n.content.some((e) => {
    if (!e || typeof e != `object`) return !1;
    let t = e;
    return He(t.type) ? !!Ue(t)?.phase : !1;
  });
  if (!i && u) return;
  let d = n.content
    .map((e) => {
      if (!e || typeof e != `object`) return null;
      let t = e;
      if (!He(t.type) || typeof t.text != `string`) return null;
      let n = Ue(t)?.phase ?? (u ? void 0 : r);
      if (!a(n)) return null;
      let i = c(t.text);
      return i.trim() ? i : null;
    })
    .filter((e) => typeof e == `string`);
  if (d.length !== 0) return l(d.join(s));
}
function Ke(e) {
  return Ge(e, { phase: `final_answer` }) || Ge(e);
}
var qe;
function Je() {
  return (Je = e(() => {
    qe = new WeakMap();
  }))();
}
function Ye(e, t, n) {
  return n.some((n) => e < n.end && t > n.start);
}
function Xe(e, t) {
  return !!(e && t && !/\s/.test(e) && !/\s/.test(t));
}
function Ze(e) {
  if (!e || ((I.lastIndex = 0), !I.test(e))) return e;
  I.lastIndex = 0;
  let t = T(e),
    n = ``,
    r = 0;
  for (let i of e.matchAll(I)) {
    let a = i[0],
      o = i.index ?? 0,
      s = o + a.length;
    ((n += e.slice(r, o)),
      E(o, t) || Ye(o, s, t) ? (n += a) : Xe(e[o - 1], e[s]) && (n += ` `),
      (r = s));
  }
  return ((n += e.slice(r)), n);
}
var I;
function Qe() {
  return (Qe = e(() => {
    (D(), (I = /<[|｜][^|｜]*[|｜]>/g));
  }))();
}
function L(e) {
  return /\s/.test(e);
}
function $e(e) {
  let t = 0;
  for (; t < e.length;) {
    for (; t < e.length && L(e[t] ?? ``);) t += 1;
    if (t >= e.length) return !0;
    let n = t;
    for (; t < e.length;) {
      let n = e[t] ?? ``;
      if (L(n) || n === `=`) break;
      if (n === `/` || n === `"` || n === `'` || n === `<` || n === `>`) return !1;
      t += 1;
    }
    if (t === n) return !1;
    for (; t < e.length && L(e[t] ?? ``);) t += 1;
    if (e[t] !== `=`) continue;
    for (t += 1; t < e.length && L(e[t] ?? ``);) t += 1;
    if (t >= e.length) return !1;
    let r = e[t];
    if (r === `"` || r === `'`) {
      t += 1;
      let n = e.indexOf(r, t);
      if (n === -1) return !1;
      t = n + 1;
      continue;
    }
    let i = t;
    for (; t < e.length && !L(e[t] ?? ``);) {
      let n = e[t] ?? ``;
      if (n === `"` || n === `'` || n === `<` || n === `>`) return !1;
      t += 1;
    }
    if (t === i) return !1;
  }
  return !0;
}
function et(e) {
  if (!e.startsWith(`<`) || !e.endsWith(`>`)) return null;
  let t = e.slice(1, -1).trimStart(),
    n = !1;
  if (
    (t.startsWith(`/`) && ((n = !0), (t = t.slice(1).trimStart())),
    !t.toLowerCase().startsWith(`final`))
  )
    return null;
  let r = t[5] ?? ``;
  if (r && !L(r) && r !== `/`) return null;
  let i = t.slice(5);
  if (n) return i.trim().length === 0 ? { isClose: !0, isSelfClosing: !1 } : null;
  let a = i.trimEnd(),
    o = a.endsWith(`/`);
  return ((i = o ? a.slice(0, -1) : i), $e(i) ? { isClose: !1, isSelfClosing: o } : null);
}
function tt(e) {
  let t = [];
  for (let n of e.matchAll(nt)) {
    let e = n[0],
      r = et(e);
    r && t.push({ index: n.index ?? 0, text: e, ...r });
  }
  return t;
}
var nt;
function rt() {
  return (rt = e(() => {
    nt = /<[^<>]*>/g;
  }))();
}
function it(e, t) {
  return t === `none` ? e : t === `start` ? e.trimStart() : e.trim();
}
function at(e, t) {
  if (!e) return e;
  let n = t?.mode ?? `strict`,
    r = t?.trim ?? `both`,
    i = t?.scope ?? `all`,
    a = e,
    o = tt(a),
    s = v(a).tags.length > 0;
  if (o.length === 0 && !s) return e;
  if (o.length > 0) {
    let e = [],
      t = T(a);
    for (let n of o) {
      let r = n.index;
      e.push({ start: r, length: n.text.length, inCode: E(r, t) });
    }
    for (let t = e.length - 1; t >= 0; t--) {
      let n = d(e[t], `final matches capture group i`);
      n.inCode || (a = a.slice(0, n.start) + a.slice(n.start + n.length));
    }
  }
  return it(C(a, { mode: n, scope: i }), r);
}
function ot() {
  return (ot = e(() => {
    (r(), x(), D(), rt());
  }))();
}
function st(e, t, n) {
  let r = null,
    i = !1;
  for (let a = t; a < n; a += 1) {
    let t = e[a];
    if (r === null) {
      (t === `"` || t === `'`) && (r = t);
      continue;
    }
    if (i) {
      i = !1;
      continue;
    }
    if (t === `\\`) {
      i = !0;
      continue;
    }
    t === r && (r = null);
  }
  return r !== null;
}
function R(e, t) {
  if (e[t] !== `<`) return null;
  let n = t + 1;
  for (; n < e.length && /\s/.test(e.charAt(n));) n += 1;
  let r = !1;
  if (e[n] === `/`) for (r = !0, n += 1; n < e.length && /\s/.test(e.charAt(n));) n += 1;
  let a = n;
  if (!/[A-Za-z_:]/.test(e[n] ?? ``)) return null;
  for (n += 1; n < e.length && /[A-Za-z0-9_.:-]/.test(e.charAt(n));) n += 1;
  let o = i(e.slice(a, n));
  if (!ct(e[n])) return null;
  let s = n,
    c = lt(e, n);
  return c === -1
    ? { contentStart: s, end: e.length, isClose: r, isSelfClosing: !1, tagName: o, isTruncated: !0 }
    : {
        contentStart: s,
        end: c + 1,
        isClose: r,
        isSelfClosing: !r && /\/\s*$/.test(e.slice(n, c)),
        tagName: o,
        isTruncated: !1,
      };
}
function ct(e) {
  return !e || /\s/.test(e) || e === `/` || e === `>`;
}
function lt(e, t) {
  let n = null,
    r = !1;
  for (let i = t; i < e.length; i += 1) {
    let t = e[i];
    if (n !== null) {
      if (r) {
        r = !1;
        continue;
      }
      if (t === `\\`) {
        r = !0;
        continue;
      }
      t === n && (n = null);
      continue;
    }
    if (t === `"` || t === `'`) {
      n = t;
      continue;
    }
    if (t === `<`) return -1;
    if (t === `>`) return i;
  }
  return -1;
}
function ut(e, t) {
  let n = e.slice(t);
  return V.test(n) ? `json` : qt.test(n) ? `xml` : null;
}
function dt(e, t) {
  if (!Jt.test(e.slice(t))) return !1;
  let n = t;
  for (; n < e.length && /\s/.test(e.charAt(n));) n += 1;
  let r = z(e, n);
  return !r ||
    r.isClose ||
    r.isSelfClosing ||
    r.isTruncated ||
    (r.tagName !== `function_call` && r.tagName !== `tool_call`)
    ? !1
    : V.test(e.slice(r.end));
}
function ft(e, t, n) {
  if (
    n.tagName !== `function` ||
    n.isClose ||
    n.isSelfClosing ||
    n.isTruncated ||
    !/\bname\s*=/.test(e.slice(n.contentStart, n.end))
  )
    return !1;
  let r = t - 1;
  for (; r >= 0 && (e[r] === ` ` || e[r] === `	`);) --r;
  return (
    r < 0 ||
    e[r] ===
      `
` ||
    e[r] === `\r` ||
    /[.!?:]/.test(e.charAt(r))
  );
}
function pt(e, t, n) {
  let r = t - 1;
  for (; r >= 0 && (e[r] === ` ` || e[r] === `	`);) --r;
  if (
    !(
      r < 0 ||
      e[r] ===
        `
` ||
      e[r] === `\r`
    )
  )
    return !1;
  let i = n.end;
  for (; i < e.length && (e[i] === ` ` || e[i] === `	`);) i += 1;
  return (
    i >= e.length ||
    e[i] ===
      `
` ||
    e[i] === `\r`
  );
}
function mt(e, t) {
  let n = t.end;
  for (; n < e.length && (e[n] === ` ` || e[n] === `	`);) n += 1;
  return (
    n >= e.length ||
    e[n] ===
      `
` ||
    e[n] === `\r`
  );
}
function ht(e, t) {
  let n = t.end;
  for (; n < e.length && (e[n] === ` ` || e[n] === `	`);) n += 1;
  return (
    n < e.length &&
    e[n] !==
      `
` &&
    e[n] !== `\r`
  );
}
function gt(e) {
  let t = e.length - 1;
  for (; t >= 0 && (e[t] === ` ` || e[t] === `	`);) --t;
  return (
    t < 0 ||
    e[t] ===
      `
` ||
    e[t] === `\r`
  );
}
function _t(e, t, n) {
  if (n === null || n > t) return !1;
  for (let r = n; r < t; r += 1)
    if (
      e[r] !== ` ` &&
      e[r] !== `	` &&
      e[r] !==
        `
` &&
      e[r] !== `\r`
    )
      return !1;
  return !0;
}
function vt(e, t, n) {
  for (let r = t; r < e.length; r += 1) {
    if (e[r] !== `<`) continue;
    let t = z(e, r);
    if (t) {
      if (t.isClose && t.tagName === n && !t.isTruncated) return r;
      r = Math.max(r, t.end - 1);
    }
  }
  return -1;
}
function yt(e, t, n) {
  let r = t;
  for (; r < e.length && /\s/.test(e.charAt(r));) r += 1;
  if (e[r] !== `<`) return null;
  let i = z(e, r);
  return !i || i.isClose || i.tagName !== n ? null : i;
}
function z(e, t) {
  let n = R(e, t);
  return n && Kt.has(n.tagName) ? n : null;
}
function bt(e, t, n) {
  let r = 1;
  for (let i = t; i < e.length; i += 1) {
    if (e[i] !== `<`) continue;
    let t = R(e, i);
    if (!(!t || t.tagName !== n || t.isTruncated)) {
      if (t.isClose) {
        if ((--r, r === 0)) return !0;
      } else t.isSelfClosing || (r += 1);
      i = Math.max(i, t.end - 1);
    }
  }
  return !1;
}
function xt(e, t) {
  if (t.tagName !== `function` || !/\bname\s*=/.test(e.slice(t.contentStart, t.end))) return !1;
  let n = t.end;
  for (; n < e.length && /\s/.test(e.charAt(n));) n += 1;
  let r = R(e, n);
  return r?.tagName === `parameter` && !r.isClose;
}
function St(e, t) {
  return e[t] === `\r` &&
    e[t + 1] ===
      `
`
    ? t + 2
    : e[t] ===
          `
` || e[t] === `\r`
      ? t + 1
      : null;
}
function Ct(e, t, n) {
  return n > t &&
    e[n - 1] ===
      `
`
    ? n - (n - 2 >= t && e[n - 2] === `\r` ? 2 : 1)
    : n > t && e[n - 1] === `\r`
      ? n - 1
      : n;
}
function wt(e, t) {
  let n = t - 1;
  for (; n >= 0 && (e[n] === ` ` || e[n] === `	`);) --n;
  return (
    n < 0 ||
    e[n] ===
      `
` ||
    e[n] === `\r`
  );
}
function Tt(e, t) {
  let n = t;
  for (; n < e.length && (e[n] === ` ` || e[n] === `	`);) n += 1;
  return (
    n >= e.length ||
    e[n] ===
      `
` ||
    e[n] === `\r`
  );
}
function Et(e) {
  if (!/<\s*\/?\s*parameter\b/i.test(e)) return e;
  let t = T(e),
    n = [],
    r = ``,
    i = 0;
  for (let a = 0; a < e.length; a += 1) {
    if (e[a] !== `<` || E(a, t)) continue;
    let o = R(e, a);
    if (!(!o || o.isTruncated)) {
      if (o.isClose) {
        let t = n.findLastIndex((e) => e.name === o.tagName);
        if (t !== -1) {
          let s = d(n[t], `open tags entry at open index`);
          if (s.unwrap) {
            let t = s.trimBoundaryLineBreaks && wt(e, a) && Tt(e, o.end) ? Ct(e, i, a) : a;
            ((r += e.slice(i, t)), (i = o.end));
          }
          n.splice(t);
        }
      } else if (o.isSelfClosing)
        o.tagName === `parameter` && n.length === 0 && ((r += e.slice(i, a)), (i = o.end));
      else if (bt(e, o.end, o.tagName) || xt(e, o)) {
        let t = o.tagName === `parameter` && n.length === 0,
          s = !1;
        if (t) {
          ((r += e.slice(i, a)), (i = o.end));
          let t = wt(e, a) ? St(e, i) : null;
          t !== null && ((i = t), (s = !0));
        }
        n.push({ name: o.tagName, unwrap: t, trimBoundaryLineBreaks: s });
      }
      a = Math.max(a, o.end - 1);
    }
  }
  return r + e.slice(i);
}
function Dt(e, t = {}) {
  let n = e;
  if (!n || !Gt.test(n)) return n;
  let r = T(n),
    i = ``,
    a = 0,
    o = !1,
    s = 0,
    c = !1,
    l = 0,
    u = null,
    d = null,
    f = new Map();
  for (let e = 0; e < n.length; e += 1) {
    if (n[e] !== `<` || (!o && E(e, r))) continue;
    let p = z(n, e);
    if (p) {
      if (!o) {
        if (((i += n.slice(a, e)), p.isClose)) {
          if (p.isTruncated) {
            let t = p.contentStart;
            ((i += n.slice(e, t)), (a = t), (e = Math.max(e, t - 1)));
            continue;
          }
          let t = f.get(p.tagName) ?? 0;
          (t > 0 && ((i += n.slice(e, p.end)), f.set(p.tagName, t - 1)),
            (a = p.end),
            (e = Math.max(e, p.end - 1)));
          continue;
        }
        if (p.isSelfClosing) {
          ((d = p.end), (a = p.end), (e = Math.max(e, p.end - 1)));
          continue;
        }
        let r = p.isTruncated ? p.contentStart : p.end,
          m = p.tagName === `function_calls` || p.tagName === `tool_calls`,
          h = m ? vt(n, p.end, p.tagName) : -1,
          g = h === -1 ? null : z(n, h),
          _ =
            t.stripFunctionResponseAfterPluralToolCalls === !0 &&
            m &&
            g !== null &&
            yt(n, g.end, `function_response`) !== null,
          v =
            p.tagName === `tool_call` ||
            p.tagName === `function` ||
            p.tagName === `antml:invoke` ||
            ((t.stripFunctionCallsXmlPayloads === !0 || _) && m)
              ? ut(n, r)
              : V.test(n.slice(r))
                ? `json`
                : null,
          y = p.tagName !== `function` || ft(n, e, p),
          b = p.tagName === `function_response` ? vt(n, p.end, p.tagName) : -1,
          x = _t(n, e, d) && (mt(n, p) || b !== -1 || ht(n, p)),
          S =
            p.tagName === `function_response` &&
            (pt(n, e, p) || x || (b !== -1 && gt(i) && mt(n, p)));
        if (!p.isClose && ((v && y) || S)) {
          if (
            ((o = !0),
            (s = p.end),
            (c = v === `json` || (v === `xml` && dt(n, r))),
            (l = e),
            (u = p.tagName),
            p.isTruncated)
          ) {
            a = n.length;
            break;
          }
        } else {
          let t = p.isTruncated ? p.contentStart : p.end;
          ((i += n.slice(e, t)),
            p.isTruncated || f.set(p.tagName, (f.get(p.tagName) ?? 0) + 1),
            (a = t),
            (e = Math.max(e, t - 1)));
          continue;
        }
      } else if (
        p.isClose &&
        (p.tagName === u || (u === `tool_result` && p.tagName === `tool_call`)) &&
        (!c || !st(n, s, e))
      ) {
        let e = u;
        ((o = !1), (c = !1), (u = null), e && (d = p.end));
      }
      ((a = p.end), (e = Math.max(e, p.end - 1)));
    }
  }
  return (o ? u === `function` && (i += n.slice(l)) : (i += n.slice(a)), Et(i));
}
function Ot(e) {
  if (!e || !/minimax:tool_call/i.test(e)) return e;
  let t = T(e),
    n = /<invoke\b[^>]*>[\s\S]*?<\/invoke>|<\/?minimax:tool_call>/gi,
    r = ``,
    i = 0;
  for (let a of e.matchAll(n)) {
    let n = a.index ?? 0;
    E(n, t) || ((r += e.slice(i, n)), (i = n + a[0].length));
  }
  return ((r += e.slice(i)), r);
}
function kt(e) {
  return /\btool\s*=>\s*["'][A-Za-z_][A-Za-z0-9_.:-]{0,119}["']/i.test(e) && /\bargs\s*=>/i.test(e);
}
function At(e) {
  return (
    /^\s*[{[]/.test(e) ||
    /\b(?:tool|result|output|content)\s*=>/i.test(e) ||
    /\b(?:tool|result|output|content)\s*:/i.test(e)
  );
}
function jt(e) {
  if (!e || !zt.test(e)) return e;
  let t = T(e),
    n = ``,
    r = 0;
  for (; r < e.length;) {
    let i = /\[\s*TOOL_(CALL|RESULT)\s*\]/gi.exec(e.slice(r));
    if (!i?.[0]) {
      n += e.slice(r);
      break;
    }
    let a = i[1]?.toUpperCase(),
      o = r + (i.index ?? 0),
      s = o + i[0].length;
    if (E(o, t)) {
      ((n += e.slice(r, s)), (r = s));
      continue;
    }
    let c = (a === `RESULT` ? /\[\s*\/\s*TOOL_RESULT\s*\]/gi : /\[\s*\/\s*TOOL_CALL\s*\]/gi).exec(
        e.slice(s),
      ),
      l = c?.[0] && !E(s + (c.index ?? 0), t) ? s + (c.index ?? 0) : -1,
      u = l >= 0 ? l : e.length,
      d = e.slice(s, u);
    if (!(a === `RESULT` ? At(d) : kt(d))) {
      ((n += e.slice(r, s)), (r = s));
      continue;
    }
    ((n += e.slice(r, o)), (r = l >= 0 ? l + (c?.[0].length ?? 0) : e.length));
  }
  return n;
}
function Mt(e) {
  if (!e || (!/\[Tool (?:Call|Result)/i.test(e) && !/\[Historical context/i.test(e))) return e;
  let t = (e, t, n) => {
      let { allowLeadingNewlines: r = !1 } = n ?? {},
        i = t;
      for (; i < e.length;) {
        let t = e[i];
        if (t === ` ` || t === `	`) {
          i += 1;
          continue;
        }
        if (
          r &&
          (t ===
            `
` ||
            t === `\r`)
        ) {
          i += 1;
          continue;
        }
        break;
      }
      if (i >= e.length) return null;
      let a = e[i];
      if (a === `{` || a === `[`) {
        let t = 0,
          n = !1,
          r = !1;
        for (let a = i; a < e.length; a += 1) {
          let i = e[a];
          if (n) {
            r ? (r = !1) : i === `\\` ? (r = !0) : i === `"` && (n = !1);
            continue;
          }
          if (i === `"`) {
            n = !0;
            continue;
          }
          if (i === `{` || i === `[`) t += 1;
          else if ((i === `}` || i === `]`) && (--t, t === 0)) return a + 1;
        }
        return null;
      }
      if (a === `"`) {
        let t = !1;
        for (let n = i + 1; n < e.length; n += 1) {
          let r = e[n];
          if (t) {
            t = !1;
            continue;
          }
          if (r === `\\`) {
            t = !0;
            continue;
          }
          if (r === `"`) return n + 1;
        }
        return null;
      }
      let o = i;
      for (
        ;
        o < e.length &&
        e[o] !==
          `
` &&
        e[o] !== `\r`;
      )
        o += 1;
      return o;
    },
    n = ((e) => {
      let n = /\[Tool Call:[^\]]*\]/gi,
        r = T(e),
        a = ``,
        o = 0;
      for (let s of e.matchAll(n)) {
        let n = s.index ?? 0;
        if (n < o || E(n, r)) continue;
        a += e.slice(o, n);
        let c = n + s[0].length;
        for (; c < e.length && (e[c] === ` ` || e[c] === `	`);) c += 1;
        for (
          e[c] === `\r` && (c += 1),
            e[c] ===
              `
` && (c += 1);
          c < e.length && (e[c] === ` ` || e[c] === `	`);
        )
          c += 1;
        if (i(e.slice(c, c + 9)) === `arguments`) {
          ((c += 9), e[c] === `:` && (c += 1), e[c] === ` ` && (c += 1));
          let n = t(e, c, { allowLeadingNewlines: !0 });
          n !== null && (c = n);
        }
        ((e[c] ===
          `
` ||
          e[c] === `\r`) &&
          (a.endsWith(`
`) ||
            a.endsWith(`\r`) ||
            a.length === 0) &&
          (e[c] === `\r` && (c += 1),
          e[c] ===
            `
` && (c += 1)),
          (o = c));
      }
      return ((a += e.slice(o)), a);
    })(e),
    r = T(n);
  return (
    (n = n.replace(/\[Tool Result for ID[^\]]*\]\n?[\s\S]*?(?=\n*\[Tool |\n*$)/gi, (e, t) =>
      E(t, r) ? e : ``,
    )),
    (r = T(n)),
    (n = n.replace(/\[Historical context:[^\]]*\]\n?/gi, (e, t) => (E(t, r) ? e : ``))),
    n.trim()
  );
}
function Nt(e) {
  if (!e || !Rt.test(e)) return e;
  B.lastIndex = 0;
  let t = T(e),
    n = ``,
    r = 0,
    i = !1;
  for (let a of e.matchAll(B)) {
    let o = a.index ?? 0;
    if (E(o, t)) continue;
    let s = a[1] === `/`;
    (i ? s && (i = !1) : ((n += e.slice(r, o)), s || (i = !0)), (r = o + a[0].length));
  }
  return (i || (n += e.slice(r)), n);
}
function Pt(e) {
  if (!e || !Bt.test(e)) return e;
  let t = T(e),
    n = ``,
    r = 0;
  for (; r < e.length;) {
    let i = e.indexOf(
        `
`,
        r,
      ),
      a = i === -1 ? e.length : i + 1,
      o = e.slice(r, a),
      s = (
        o.endsWith(`
`)
          ? o.slice(0, -1).replace(/\r$/, ``)
          : o
      ).trim();
    ((!E(r, t) && (Vt.test(s) || Ht.test(s) || Ut.test(s) || Wt.test(s))) || (n += o), (r = a));
  }
  return n;
}
function Ft(e, t) {
  if (!e) return e;
  let n = (e) => at(e, { mode: t.reasoningMode, scope: t.reasoningScope, trim: t.reasoningTrim }),
    r = (e) => (t.finalTrim === `none` ? e : t.finalTrim === `start` ? e.trimStart() : e.trim()),
    i = (e) => {
      let n = e;
      return (
        t.preserveMinimaxToolXml || (n = Ot(n)),
        (n = Ze(n)),
        (n = Nt(n)),
        (n = Dt(n, {
          stripFunctionCallsXmlPayloads: t.stripFunctionCallsXmlPayloads,
          stripFunctionResponseAfterPluralToolCalls: t.stripFunctionResponseAfterPluralToolCalls,
        })),
        t.stripInternalTraceLines !== !1 && (n = Pt(n)),
        (n = jt(n)),
        (n = ne(n, { resolveProtectedRanges: T })),
        t.preserveDowngradedToolText || (n = Mt(n)),
        n
      );
    };
  return t.stageOrder === `reasoning-first` ? r(i(n(e))) : r(n(i(e)));
}
function It(e, t = `delivery`) {
  return Ft(e, Yt[t]);
}
function Lt(e) {
  return It(e, `internal-scaffolding`);
}
var B, Rt, zt, Bt, Vt, Ht, Ut, Wt, Gt, Kt, V, qt, Jt, Yt;
function Xt() {
  return (Xt = e(() => {
    (r(),
      he(),
      D(),
      Qe(),
      ot(),
      (B = /<\s*(\/?)\s*relevant[-_]memories\b[^<>]*>/gi),
      (Rt = /<\s*\/?\s*relevant[-_]memories\b/i),
      (zt = /\[\s*\/?\s*TOOL_(?:CALL|RESULT)\s*\]/i),
      (Bt = /(?:📊|🛠️|📖|📝|🔍|🔎|⚙️|tool[-_ ]?call|tool[-_ ]?result|function[-_ ]?call)/i),
      (Vt =
        /^(?:>\s*)?(?:⚠️\s*)?(?:📊|🛠️|📖|📝|🔍|🔎|⚙️)\s*(?:Session Status|Exec|Read|Edit|Write|Patch|Search|Open|Click|Find|Screenshot|Update Plan|Tool Call|Tool Result|Function Call|Shell|Command)\s*:/i),
      (Ht =
        /^(?:>\s*)?⚠️\s*🛠️\s+(?:(?:Exec|Bash)\s+failed(?:(?:\s+\(exit\s+-?\d+\))|(?:\s*:[^\r\n]*))?|\S[^\r\n]*\s+\(agent\)`{0,2}\s+failed(?:\s*:[^\r\n]*)?)\s*$/i),
      (Ut =
        /^(?:>\s*)?🛠️\s*(?:(?:(?:elevated|pty)\b\s*(?:·|,)\s*)+)?(?:`{1,2}\s*\S|(?:run|check|fetch|pull|push|view|show|list|switch|create|merge|rebase|stage|restore|reset|stash|search|find|print|copy|move|remove|install|start|cd|git|pnpm|npm|yarn|bun|node|python|python3|bash|sh)\b)/i),
      (Wt = /^(?:>\s*)?(?:tool[-_ ]?call|tool[-_ ]?result|function[-_ ]?call)\s*[:=]/i),
      (Gt =
        /<\s*\/?\s*(?:antml:)?(?:tool_call|tool_result|function_calls?|function_response|function|tool_calls|invoke|parameter)\b/i),
      (Kt = new Set([
        `tool_call`,
        `tool_result`,
        `function_call`,
        `function_calls`,
        `function_response`,
        `function`,
        `tool_calls`,
        `antml:invoke`,
        `antml:parameter`,
      ])),
      (V =
        /^(?:\s+[A-Za-z_:][-A-Za-z0-9_:.]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))*\s*(?:\r?\n\s*)?[[{]/),
      (qt =
        /^\s*(?:\r?\n\s*)?<(?:antml:)?(?:function_call|tool_call|function|invoke|parameters?|arguments?)\b/i),
      (Jt = /^\s*(?:\r?\n\s*)?<(?:function_call|tool_call)\b/i),
      (Yt = {
        delivery: {
          finalTrim: `both`,
          stripFunctionResponseAfterPluralToolCalls: !0,
          reasoningMode: `strict`,
          reasoningTrim: `both`,
          stageOrder: `reasoning-last`,
        },
        "final-answer-delivery": {
          finalTrim: `both`,
          stripFunctionResponseAfterPluralToolCalls: !0,
          reasoningMode: `strict`,
          reasoningScope: `leading`,
          reasoningTrim: `both`,
          stageOrder: `reasoning-last`,
        },
        history: {
          finalTrim: `none`,
          reasoningMode: `strict`,
          reasoningTrim: `none`,
          stageOrder: `reasoning-last`,
        },
        "internal-scaffolding": {
          finalTrim: `start`,
          preserveDowngradedToolText: !0,
          preserveMinimaxToolXml: !0,
          reasoningMode: `preserve`,
          reasoningTrim: `start`,
          stageOrder: `reasoning-first`,
        },
        "tool-progress": {
          finalTrim: `both`,
          stripFunctionCallsXmlPayloads: !0,
          stripInternalTraceLines: !1,
          reasoningMode: `strict`,
          reasoningTrim: `both`,
          stageOrder: `reasoning-last`,
        },
      }));
  }))();
}
function Zt(e, t) {
  if (!e) return;
  let n = h(e);
  if (n === `openai` && (t?.credentialType === `oauth` || t?.credentialType === `token`))
    return `openai`;
  if (n !== `openai`)
    return n === `claude-cli`
      ? `anthropic`
      : n === `minimax-portal` || n === `minimax-cn` || n === `minimax-portal-cn`
        ? `minimax`
        : n || void 0;
}
function Qt() {
  return (Qt = e(() => {
    (m(), l());
  }))();
}
function $t(e) {
  return e.replace(tn, ``).replace(en, ``);
}
var en, tn;
function nn() {
  return (nn = e(() => {
    ((en = /cite(?:[^]*)?/g), (tn = /[ \t]*cite(?:[^]*)?(?=\r?\n|$)/g));
  }))();
}
function rn(e) {
  let t = we(e, { stripReplyTags: !1 });
  return { text: t.text, audioAsVoice: t.audioAsVoice, hadTag: t.hasAudioTag };
}
function an() {
  return (an = e(() => {
    P();
  }))();
}
function H(e) {
  return e.replace(q, ``);
}
function U(e) {
  let t = e.replace(/^[`"'[{(]+/, ``).replace(/[`"'\\})\],]+$/, ``);
  return Tn.exec(t)?.[1] ?? t;
}
function on(e) {
  return e.startsWith(`~/`) || e.startsWith(`~\\`);
}
function W(e) {
  return e.startsWith(`../`) || e === `..` || (e.startsWith(`~`) && !on(e)) || kn.test(e);
}
function sn(e) {
  return (
    e.startsWith(`/`) ||
    e.startsWith(`./`) ||
    e.startsWith(`../`) ||
    e.startsWith(`~`) ||
    En.test(e) ||
    e.startsWith(`\\\\`) ||
    (!J.test(e) && (e.includes(`/`) || e.includes(`\\`)))
  );
}
function cn(e) {
  return W(e)
    ? !1
    : e.startsWith(`/`) ||
        e.startsWith(`./`) ||
        on(e) ||
        En.test(e) ||
        e.startsWith(`\\\\`) ||
        (!J.test(e) && (e.includes(`/`) || e.includes(`\\`)));
}
function ln(e) {
  let t = e
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, ``)
    .replace(/\.+$/, ``);
  return t.split(`.`).some((e) => e.length === 0) ? `` : t;
}
function un(e) {
  let t = ln(e);
  if (
    !t ||
    !t.includes(`.`) ||
    t === `localhost` ||
    t === `localhost.localdomain` ||
    t === `metadata.google.internal` ||
    t.endsWith(`.localhost`) ||
    t.endsWith(`.local`) ||
    t.endsWith(`.internal`)
  )
    return !0;
  let n = ce(t);
  if (n) {
    if (ae(n)) return se(n);
    if (me(n)) return !0;
    let e = fe(n);
    return e ? se(e) : !1;
  }
  return t.includes(`:`) && !oe(t) ? !0 : !ie(t) && de(t);
}
function dn(e) {
  try {
    let t = new URL(e);
    return t.protocol === `https:` && !t.username && !t.password && !un(t.hostname);
  } catch {
    return !1;
  }
}
function G(e, t) {
  return !e || e.length > 4096 || (!t?.allowSpaces && /\s/.test(e))
    ? !1
    : te(e)
      ? dn(e)
      : cn(e)
        ? !0
        : !W(e) && !!(t?.allowBareFilename && !J.test(e) && On.test(e));
}
function fn(e) {
  let t = H(U(e));
  return Dn.test(t) || J.test(t);
}
function pn(e) {
  let t = [],
    n = 0;
  for (let r of e.matchAll(/\S+/g)) {
    let i = H(U(r[0])),
      a = t.at(-1),
      o = a ? H(U(a)) : ``;
    (Dn.test(o) && !fn(i) && (!On.test(o) || !G(i))
      ? (t[t.length - 1] = `${a}${e.slice(n, r.index)}${r[0]}`)
      : t.push(r[0]),
      (n = r.index + r[0].length));
  }
  return t;
}
function mn(e) {
  let t = e.trim();
  if (t.length < 2) return;
  let n = t[0];
  if (n === t[t.length - 1] && (n === `"` || n === `'` || n === "`")) return t.slice(1, -1).trim();
}
function hn(e) {
  return H(U(mn(e) ?? e));
}
function gn(e) {
  return e.includes("```") || e.includes(`~~~`);
}
function K(e) {
  return e.replace(/[ \t]{2,}/g, ` `).trim();
}
function _n(e, t, n, r) {
  let i = 1;
  for (let a = t; a < e.length; a += 1) {
    let t = e[a];
    if (t === `\\`) {
      a += 1;
      continue;
    }
    if (t === n) {
      i += 1;
      continue;
    }
    if (t === r && (--i, i === 0)) return a;
  }
}
function vn(e) {
  return te(e) && G(e);
}
function yn(e, t) {
  let n = t;
  for (; n < e.length && /\s/.test(e[n] ?? ``);) n += 1;
  let r = e[n];
  if (!r) return;
  let i = r === `"` || r === `'` ? r : r === `(` ? `)` : null;
  if (!i) return;
  let a =
    r === `(`
      ? _n(e, n + 1, `(`, `)`)
      : (() => {
          for (let t = n + 1; t < e.length; t += 1) {
            let n = e[t];
            if (n === `\\`) {
              t += 1;
              continue;
            }
            if (n === i) return t;
          }
        })();
  if (a == null) return;
  let o = a + 1;
  for (; o < e.length && /\s/.test(e[o] ?? ``);) o += 1;
  return e[o] === `)` ? o + 1 : void 0;
}
function bn(e, t) {
  let n = t;
  for (; n < e.length && /\s/.test(e[n] ?? ``);) n += 1;
  if (n >= e.length) return;
  if (e[n] === `<`) {
    let t = n + 1;
    for (; t < e.length;) {
      let r = e[t];
      if (r === `\\`) {
        t += 2;
        continue;
      }
      if (r === `>`) {
        let r = e.slice(n + 1, t).trim();
        if (!r) return;
        let i = t + 1;
        for (; i < e.length && /\s/.test(e[i] ?? ``);) i += 1;
        if (e[i] === `)`) return { destination: r, end: i + 1 };
        let a = yn(e, i);
        return a ? { destination: r, end: a } : void 0;
      }
      t += 1;
    }
    return;
  }
  let r = n,
    i = n,
    a = 0;
  for (; n < e.length;) {
    let t = e.charAt(n);
    if (t === `\\`) {
      ((n += 2), (i = n));
      continue;
    }
    if (t === `(`) {
      ((a += 1), (n += 1), (i = n));
      continue;
    }
    if (t === `)`) {
      if (a === 0) {
        let t = e.slice(r, i).trim();
        return t ? { destination: t, end: n + 1 } : void 0;
      }
      (--a, (n += 1), (i = n));
      continue;
    }
    if (/\s/.test(t) && a === 0) {
      let t = e.slice(r, i).trim();
      if (!t) return;
      let a = yn(e, n);
      return a ? { destination: t, end: a } : void 0;
    }
    ((n += 1), (i = n));
  }
}
function xn(e) {
  if (e.length > An) return [];
  let t = [],
    n = 0,
    r = 0;
  for (; t.length < Mn && r < jn;) {
    let i = e.indexOf(`![`, n);
    if (i < 0) break;
    r += 1;
    let a = _n(e, i + 2, `[`, `]`);
    if (a == null || e[a + 1] !== `(`) {
      n = i + 2;
      continue;
    }
    let o = bn(e, a + 2);
    if (!o) {
      n = i + 2;
      continue;
    }
    (t.push({ start: i, end: o.end, destination: o.destination }), (n = o.end));
  }
  return t;
}
function Sn(e) {
  let t = xn(e.line);
  if (t.length === 0) return { lineSegments: [], foundMedia: !1 };
  let n = [],
    r = [],
    i = [],
    a = 0,
    o = !1;
  for (let s of t) {
    let t = e.line.slice(a, s.start);
    (n.push(t), r.push(t));
    let c = hn(s.destination),
      l = e.allowlist?.get(c);
    if (l || (!e.allowlist && vn(c))) {
      let t = K(n.join(``));
      (t && i.push({ type: `text`, text: t }), (n.length = 0));
      let r = l ?? c;
      (e.media.push(r), i.push({ type: `media`, url: r }), (o = !0));
    } else {
      let t = e.line.slice(s.start, s.end);
      (n.push(t), r.push(t));
    }
    a = s.end;
  }
  let s = e.line.slice(a);
  (n.push(s), r.push(s));
  let c = K(n.join(``));
  return (
    c && i.push({ type: `text`, text: c }),
    { cleanedLine: K(r.join(``)) || void 0, lineSegments: i, foundMedia: o }
  );
}
function Cn(e, t = {}) {
  let n = e.trimEnd();
  if (!n.trim()) return { text: `` };
  let r =
      t.markdownImageAllowlist === void 0
        ? void 0
        : new Map(t.markdownImageAllowlist.map((e) => [hn(e), e])),
    i = r !== void 0 || t.extractMarkdownImages === !0,
    a = t.extractMediaDirectives !== !1,
    o = a && /media:/i.test(n),
    s = i && /!\[[^\]]*]\(/.test(n),
    c = n.includes(`[[`);
  if (!o && !s && !c) return { text: n };
  let l = [],
    u = !1,
    f = [],
    p,
    m = (e) => {
      let t = f[f.length - 1];
      t?.type === `text`
        ? (t.text = `${t.text}\n${e.trim() ? e : ``}`)
        : e.trim()
          ? ((p = { type: `text`, text: e }), f.push(p))
          : t?.type === `media` &&
            p &&
            !p.text.endsWith(`
`) &&
            (p.text += `
`);
    },
    h = gn(n) ? g(n) : [],
    _ = n.split(`
`),
    v = [],
    y = 0;
  for (let e of _) {
    if (h.some((e) => y >= e.start && y < e.end)) {
      (v.push(e), m(e), (y += e.length + 1));
      continue;
    }
    let t = e.trimStart();
    if (!a || !t.toUpperCase().startsWith(`MEDIA:`)) {
      let t = i ? Sn({ line: e, media: l, allowlist: r }) : { lineSegments: [], foundMedia: !1 };
      if (!t.foundMedia) (v.push(e), m(e));
      else {
        ((u = !0), t.cleanedLine && v.push(t.cleanedLine));
        for (let e of t.lineSegments) {
          if (e.type === `text`) {
            m(e.text);
            continue;
          }
          f.push(e);
        }
      }
      y += e.length + 1;
      continue;
    }
    let n = Array.from(e.matchAll(wn));
    if (n.length === 0) {
      (v.push(e), m(e), (y += e.length + 1));
      continue;
    }
    let o = [],
      s = [],
      c = 0;
    for (let t of n) {
      let n = t.index ?? 0;
      o.push(e.slice(c, n));
      let r = d(t[1], `parse regex capture 1`),
        i = mn(r),
        a = i ?? r,
        f = i ? [i] : pn(r),
        p = l.length,
        m = 0,
        h = [],
        g = !1;
      for (let e of f) {
        let t = H(U(e));
        G(t, i || /\s/.test(e) ? { allowSpaces: !0 } : void 0)
          ? (l.push(t), (g = !0), (u = !0), (m += 1))
          : (!/\s/.test(e) || !W(t)) && h.push(e);
      }
      let _ = a.trim(),
        v = sn(_) || q.test(_);
      if (!i && m === 1 && h.length > 0 && !f.slice(1).some(fn) && /\s/.test(a) && v) {
        let e = H(U(a));
        G(e, { allowSpaces: !0 }) &&
          (l.splice(p, l.length - p, e), (g = !0), (u = !0), (h.length = 0));
      }
      if (!g && !i && /\s/.test(a)) {
        let e = H(U(a));
        G(e, { allowSpaces: !0, allowBareFilename: !0 }) &&
          (l.splice(p, l.length - p, e), (g = !0), (u = !0), (h.length = 0));
      }
      if (!g) {
        let e = H(U(a));
        G(e, { allowSpaces: !0, allowBareFilename: !0 }) &&
          (l.push(e), (g = !0), (u = !0), (h.length = 0));
      }
      if (g) {
        let e = K(o.join(``));
        (e && s.push({ type: `text`, text: e }), (o.length = 0));
        for (let e of l.slice(p)) s.push({ type: `media`, url: e });
        h.length > 0 && o.push(h.join(` `));
      } else v ? (u = !0) : o.push(t[0]);
      c = n + t[0].length;
    }
    o.push(e.slice(c));
    let p = K(o.join(``));
    p && (v.push(p), s.push({ type: `text`, text: p }));
    for (let e of s) {
      if (e.type === `text`) {
        m(e.text);
        continue;
      }
      f.push(e);
    }
    y += e.length + 1;
  }
  let b = v
      .join(`
`)
      .replace(/^(?:[ \t]*\n)+/, ``),
    x = t.extractAudioDirectives === !1 ? { text: b, audioAsVoice: !1 } : rn(b),
    S = x.text.trimEnd(),
    C = x.audioAsVoice;
  if (l.length === 0) {
    let e = u || C ? S : n,
      t = { text: e, segments: e ? [{ type: `text`, text: e }] : [] };
    return (C && (t.audioAsVoice = !0), t);
  }
  return {
    text: S,
    mediaUrls: l,
    segments: f.length > 0 ? f : [{ type: `text`, text: S }],
    ...(C ? { audioAsVoice: !0 } : {}),
  };
}
var wn, q, Tn, En, Dn, J, On, kn, An, jn, Mn;
function Nn() {
  return (Nn = e(() => {
    (re(),
      ue(),
      r(),
      an(),
      (wn = /\bMEDIA:\s*`?([^\n]+)`?/gi),
      (q = /^file:(?:\/\/)?/i),
      (Tn = /^(.*\.\w{1,10})\\?"(?=[\]},:]|$).*/s),
      (En = /^[a-zA-Z]:[\\/]/),
      (Dn = /^(?:[a-z]:[\\/]|[/~]|\.{1,2}[\\/]|\\\\)/i),
      (J = /^[a-zA-Z][a-zA-Z0-9+.-]*:/),
      (On = /\.\w{1,10}$/),
      (kn = /(?:^|[/\\])\.\.(?:[/\\]|$)/),
      (An = 2e4),
      (jn = 80),
      (Mn = 50));
  }))();
}
function Pn(e) {
  let t = 0,
    n = 0;
  for (let r of e) {
    if (r === "`") {
      ((n += 1), (t = Math.max(t, n)));
      continue;
    }
    n = 0;
  }
  return t;
}
function Fn(e) {
  let t = "`".repeat(Pn(e) + 1),
    n =
      e.startsWith("`") ||
      e.endsWith("`") ||
      e.includes(`
`)
        ? ` `
        : ``;
  return `${t}${n}${e}${n}${t}`;
}
function In() {
  return (In = e(() => {}))();
}
function Ln(e) {
  let t = e.trim();
  if (!t || Bn(t)) return t;
  let n = t.match(/^\/(?:home|Users)\/([^/]+)(.*)$/);
  if (n && zn(n[1])) return Rn(n[2] ?? ``);
  let r = t.match(/^[A-Za-z]:[\\/]Users[\\/]([^\\/]+)(.*)$/i);
  return r && zn(r[1]) ? Rn(r[2] ?? ``) : t;
}
function Rn(e) {
  return `~${e.replace(/\\/g, `/`)}`;
}
function zn(e) {
  return e !== void 0 && e !== `.` && e !== `..`;
}
function Bn(e) {
  return /(^|[\\/])\.{1,2}(?=[\\/]|$)/.test(e);
}
function Vn() {
  return (Vn = e(() => {}))();
}
function Hn(e) {
  let t = `${e.getFullYear()}-${e.getMonth() + 1}-${e.getDate()}`,
    n = 2166136261;
  for (let e = 0; e < t.length; e++) ((n ^= t.charCodeAt(e)), (n = Math.imul(n, 16777619)));
  return n >>> 0;
}
function Un(e) {
  return Hn(e) % 16 == 3;
}
function Wn() {
  return (Wn = e(() => {}))();
}
var Gn;
function Kn() {
  return (Kn = e(() => {
    Gn = class {
      constructor(e, t, n = () => 1) {
        ((this.capacity = e),
          (this.overflow = t),
          (this.measure = n),
          (this.values = []),
          (this.size = 0),
          (this.closed = !1));
      }
      push(e) {
        if (this.closed) return !1;
        let t = this.measure(e);
        if (this.size + t <= this.capacity) return (this.values.push(e), (this.size += t), !0);
        if (this.overflow.mode === `latch`) return ((this.closed = !0), !1);
        if (this.overflow.mode === `fail-closed`)
          return (
            (this.values = []), (this.size = 0), (this.closed = !0), this.overflow.onOverflow(), !1
          );
        for (
          this.values.push(e), this.size += t;
          this.size > this.capacity && this.values.length > 1;
        )
          this.size -= this.measure(this.values.shift());
        if (this.size > this.capacity) {
          let t = this.overflow.fit?.(e, this.capacity);
          ((this.values = t === void 0 ? [] : [t]),
            (this.size = t === void 0 ? 0 : this.measure(t)));
        }
        return !0;
      }
      drain() {
        let e = this.values;
        return ((this.values = []), (this.size = 0), e);
      }
    };
  }))();
}
var qn;
function Jn() {
  return (Jn = e(() => {
    qn = `webchat`;
  }))();
}
function Yn(e) {
  let t = c(e);
  if (t)
    return t === `webrtc-sdp` ? `webrtc` : t === `json-pcm-websocket` ? `provider-websocket` : t;
}
function Xn() {
  return (Xn = e(() => {}))();
}
var Zn;
function Qn() {
  return (Qn = e(() => {
    Zn = class {
      constructor(e) {
        if (
          ((this.options = e),
          (this.pending = []),
          (this.pendingWeight = 0),
          (this.active = !1),
          (this.sealed = !1),
          (this.overflowed = !1),
          (this.failed = !1),
          (this.settledPrefix = Promise.resolve()),
          !Number.isSafeInteger(e.maxPendingCount) || e.maxPendingCount < 0)
        )
          throw Error(`maxPendingCount must be a non-negative safe integer`);
        if (!Number.isFinite(e.maxPendingWeight) || e.maxPendingWeight < 0)
          throw Error(`maxPendingWeight must be a non-negative finite number`);
      }
      get isIdle() {
        return !this.active && this.pending.length === 0;
      }
      get didOverflow() {
        return this.overflowed;
      }
      enqueue(e, t = {}) {
        if (this.sealed) return { accepted: !1, reason: `sealed` };
        let n = t.weight ?? 1;
        if (!Number.isFinite(n) || n < 0)
          throw Error(`queue task weight must be a non-negative finite number`);
        if (
          this.active &&
          (this.pending.length >= this.options.maxPendingCount ||
            this.pendingWeight + n > this.options.maxPendingWeight)
        )
          return t.sealOnOverflow === !1
            ? { accepted: !1, reason: `capacity` }
            : ((this.sealed = !0), (this.overflowed = !0), { accepted: !1, reason: `overflow` });
        let r,
          i,
          a = new Promise((e, t) => {
            ((r = e), (i = t));
          }),
          o = { weight: n, run: e, resolve: (e) => r(e), reject: i };
        return (
          (this.settledPrefix = a.then(
            () => void 0,
            () => void 0,
          )),
          this.active
            ? (this.pending.push(o), (this.pendingWeight += n))
            : ((this.active = !0), this.startTask(o)),
          { accepted: !0, completion: a }
        );
      }
      seal() {
        this.sealed = !0;
      }
      flush(e = {}) {
        let t = this.settledPrefix;
        return e.requireSuccess === !0
          ? t.then(() => {
              if (this.failed) throw this.firstFailure;
            })
          : t;
      }
      startTask(e) {
        this.runTask(e);
      }
      async runTask(e) {
        try {
          e.resolve(await e.run());
        } catch (t) {
          (this.failed || ((this.failed = !0), (this.firstFailure = t)), e.reject(t));
        } finally {
          let e = this.pending.shift();
          e
            ? ((this.pendingWeight -= e.weight), queueMicrotask(() => this.startTask(e)))
            : (this.active = !1);
        }
      }
    };
  }))();
}
function $n(e) {
  return n(e.trim(), er);
}
var er, Y, tr, nr, rr;
function ir() {
  return (ir = e(() => {
    (Qn(),
      (er = 8e3),
      (Y = 40),
      (tr = Y * er),
      (nr = `Voice transcript persistence could not keep up; the realtime session was stopped.`),
      (rr = {
        maxPendingCount: Y,
        overflowMessage: nr,
        createQueue: () => new Zn({ maxPendingCount: Y, maxPendingWeight: tr }),
      }));
  }))();
}
var ar;
function or() {
  return (or = e(() => {
    ar = `openclaw_agent_consult`;
  }))();
}
function sr(e) {
  let n = t(e);
  return hr.includes(n) ? n : void 0;
}
function X(e, t) {
  return t.some((t) => t.test(e));
}
function cr(e) {
  return (
    /\b(?:don'?t|do\s+not|not|never)\s+(?:please\s+)?(?:cancel|cancle|stop|abort|kill|end)\b/.test(
      e,
    ) || /\bstop\s+(?:it|that|this)\s+from\b/.test(e)
  );
}
function lr(e) {
  let t = sr(e.mode);
  if (t) return { mode: t, confidence: `high`, reason: `explicit_mode`, shouldAutoControl: !0 };
  let n = e.text.trim().toLowerCase();
  return X(n, xr)
    ? { mode: `steer`, confidence: `medium`, reason: `steer_command`, shouldAutoControl: !0 }
    : !cr(n) && X(n, _r)
      ? { mode: `cancel`, confidence: `high`, reason: `cancel_safety`, shouldAutoControl: !0 }
      : X(n, vr)
        ? { mode: `status`, confidence: `high`, reason: `status_query`, shouldAutoControl: !0 }
        : X(n, yr)
          ? {
              mode: `followup`,
              confidence: `high`,
              reason: `followup_marker`,
              shouldAutoControl: !0,
            }
          : X(n, br)
            ? {
                mode: `steer`,
                confidence: `medium`,
                reason: `steer_command`,
                shouldAutoControl: !0,
              }
            : { mode: `status`, confidence: `low`, reason: `safe_default`, shouldAutoControl: !1 };
}
function ur(e) {
  return lr({ text: e }).shouldAutoControl;
}
function dr(e) {
  let t = fr(e),
    n = u(t),
    r = c(n.text) ?? c(n.message) ?? c(n.request) ?? c(n.query);
  if (!r) throw Error(`text required`);
  return { text: r, mode: sr(n.mode) ?? lr({ text: r }).mode };
}
function fr(e) {
  if (typeof e != `string`) return e;
  let t = e.trim();
  if (!t) return {};
  try {
    return JSON.parse(t);
  } catch {
    return { text: t };
  }
}
function pr(e) {
  return [
    `Internal OpenClaw voice control result.`,
    `Do not call openclaw_agent_consult or any other tool for this message.`,
    `Speak this exact OpenClaw status to the voice call, without adding, removing, or rephrasing words.`,
    `Status: ${JSON.stringify(e)}`,
  ].join(`
`);
}
function mr(e = `Cancelled the active OpenClaw run.`) {
  return { status: `cancelled`, message: e };
}
var hr, gr, _r, vr, yr, br, xr;
function Sr() {
  return (Sr = e(() => {
    ((hr = [`status`, `steer`, `cancel`, `followup`]),
      (gr = `openclaw_agent_control`),
      (_r = [
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(?:please\s+)?(?:cancel|cancle|abort)(?:\s+(?:that|this|it|the\s+(?:check|run|task|work)))?(?:\s*[.!?])?$/,
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(?:please\s+)?(?:never mind|nevermind|forget it|kill it|end that)(?:\s*[.!?])?$/,
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(?:please\s+)?stop(?:\s+(?:that|this|it|the\s+(?:check|run|task|work)))?(?:\s*[.!?])?$/,
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(?:can|could|would)\s+you\s+(?:please\s+)?(?:cancel|cancle|stop|abort)(?:\s+(?:that|this|it|the\s+(?:check|run|task|work)))?(?:\s*[.!?])?$/,
        /^(?:(?:ok|okay|alright|all right|actually)[,\s]+)?(?:can|could|would)\s+(?:we|you)\s+(?:just\s+)?(?:cancel|cancle|stop|abort)(?:\s+(?:that|this|it|the\s+(?:check|run|task|work)))?(?:\s*[.!?])?$/,
        /\b(?:cancel|cancle|stop|abort)\s+(?:that|this|it|the\s+(?:check|run|task|work))\b/,
      ]),
      (vr = [
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(?:status|progress|update)(?:\s*[.!?])?$/,
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(?:give me|what'?s|any)\s+(?:an?\s+)?update(?:\s*[.!?])?$/,
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(where are we|what'?s happening|what (?:are you|is it) doing|what'?s it doing|how (?:is|are) (?:it|you|that|this) going|how'?s it going|are you still working|is it done|did it finish)(\b|[.!?])/,
      ]),
      (yr = [
        /^(after that|when you'?re done|when it'?s done|next|then|also|one more thing|follow up)(\b|[,.!?])/,
      ]),
      (br = [
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(?:please\s+)?update\s+\S/,
        /^(?:actually|instead|change|switch|focus|use|try|prefer|make|do|check|look at|go with|redirect|steer|tell it to)\b/,
        /^(?:can|could|would)\s+you\s+(?:actually\s+)?(?:change|switch|focus|use|try|prefer|make|do|check|look at|go with|redirect|steer)\b/,
        /\b(?:instead|not that|rather than|change that|switch to|focus on|use the|try the|go with|tell it to)\b/,
      ]),
      (xr = [
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(?:please\s+)?stop\s+(?:using|doing|checking|looking at|focusing on|trying)\b/,
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(?:can|could|would)\s+(?:you|we)\s+(?:please\s+)?stop\s+(?:using|doing|checking|looking at|focusing on|trying)\b/,
        /^(?:(?:ok|okay|alright|all right)[,\s]+)?(?:please\s+)?stop\s+(?:that|this|it|the\s+(?:check|run|task|work))\s+from\b/,
      ]));
  }))();
}
var Cr;
function wr() {
  return (wr = e(() => {
    Cr = `describe_view`;
  }))();
}
function Tr(e) {
  let t = s(e.response) ? e.response : void 0,
    n = s(t?.status_details) ? t.status_details : void 0,
    r = s(n?.error) ? n.error : void 0,
    i = c(r?.code),
    a = c(r?.message),
    o = c(r?.type),
    l =
      i || a || o
        ? { ...(i ? { code: i } : {}), ...(a ? { message: a } : {}), ...(o ? { type: o } : {}) }
        : void 0,
    u = c(n?.reason),
    d = c(t?.id) ?? c(e.responseId),
    f = d ? { responseId: d } : {};
  switch (t?.status) {
    case `completed`:
      return { ...f, status: `completed` };
    case `cancelled`:
      return { ...f, status: `cancelled`, ...(u ? { reason: u } : {}) };
    case `failed`:
    case `incomplete`: {
      let n = t.status,
        r = [u, a ?? i ?? o].filter(Boolean).join(`: `);
      return {
        ...f,
        status: n,
        ...(u ? { reason: u } : {}),
        ...(l ? { error: l } : {}),
        message: `${e.providerLabel} response ${n}${r ? `: ${r}` : ``}`,
      };
    }
    default: {
      let n = c(t?.status),
        r = n ? `invalid status ${n}` : `missing terminal status`;
      return {
        ...f,
        status: `failed`,
        reason: `invalid_response_status`,
        error: { type: `invalid_response_status`, message: r },
        message: `${e.providerLabel} response failed: ${r}`,
      };
    }
  }
}
function Er() {
  return (Er = e(() => {}))();
}
function Dr(e, t) {
  let n = e?.trim() ?? ``,
    r = t?.trim() ?? ``;
  return n ? (r ? (i(r).startsWith(`${i(n)}/`) ? r : `${n}/${r}`) : n) : r;
}
function Or(e) {
  let t = e.cfg?.agents?.defaults?.models;
  if (t) return t[Dr(e.provider, e.model)]?.params;
}
function Z(e) {
  return typeof e == `number` && Number.isInteger(e) && e > 0 ? e : void 0;
}
function kr(e) {
  let t = Or(e);
  return (
    Z(t?.fastAutoOnSeconds) ??
    Z(t?.fast_auto_on_seconds) ??
    Z(t?.fastSeconds) ??
    Z(t?.fast_seconds) ??
    60
  );
}
function Ar(e) {
  return e === `auto` ? `auto` : e === !0 ? `on` : `off`;
}
function jr(e) {
  return `auto (${Z(e?.fastAutoOnSeconds) ?? 60} sec)`;
}
function Mr() {
  return (Mr = e(() => {}))();
}
function Nr(e) {
  return typeof e == `string` && Pr.has(e);
}
var Pr;
function Fr() {
  return (Fr = e(() => {
    Pr = new Set([`accepted`, `started`, `in_flight`]);
  }))();
}
function Ir(e) {
  if (!e || typeof e != `object` || Array.isArray(e)) return !1;
  let t = e.kind;
  return typeof t == `string` && Vr.has(t);
}
function Lr(e, t) {
  return e === `openclaw` && typeof t == `string` && Br.has(t);
}
function Rr(e) {
  if (!e || typeof e != `object` || Array.isArray(e)) return !1;
  let t = e;
  return t.role === `assistant`
    ? Lr(t.provider, t.model)
      ? !0
      : Ir(t.openclawDeliveryMirror)
    : !1;
}
var zr, Br, Vr;
function Hr() {
  return (Hr = e(() => {
    ((zr = `delivery-mirror`),
      (Br = new Set([zr, `gateway-injected`])),
      (Vr = new Set([`channel-final`, `channel-final-suppressed`, `message-tool-source-reply`])));
  }))();
}
function Ur(e, t) {
  if (Number.isNaN(t) || t === 1 / 0) return;
  let n = Math.max(0, Math.floor(t));
  if (n <= 0) {
    e.clear();
    return;
  }
  for (; e.size > n;) {
    let t = e.keys().next();
    if (t.done) break;
    e.delete(t.value);
  }
}
function Wr(e) {
  return e.length <= $r ? Q.get(e) : void 0;
}
function Gr(e, t) {
  e.length > $r || (Q.set(e, t), Ur(Q, Qr));
}
function Kr(e) {
  let t = e.toLowerCase();
  return Zr.some((e) => t.includes(`${e.channel}:`));
}
function qr(e) {
  let t = [];
  for (let n of Zr) {
    let r = w(n.channel);
    for (let a of n.peerKinds) {
      let o = w(a);
      if (n.span === `segment`) {
        let n = RegExp(`(^|:)${r}:${o}:([^:]+)`, `gi`);
        for (let r of e.matchAll(n)) {
          let e = r[0] ?? ``,
            n = r[2] ?? ``,
            i = (r.index ?? 0) + e.length - n.length;
          t.push({ start: i, end: i + n.length, trim: !0 });
        }
      } else {
        let a = (n) => {
            if (n >= e.length) return;
            let r = e.slice(n),
              a = i(r).lastIndexOf(`:thread:`);
            if (a === -1) {
              t.push({ start: n, end: e.length, trim: !1 });
              return;
            }
            t.push({ start: n, end: n + a, trim: !1 });
            let o = n + a + 8;
            o < e.length && t.push({ start: o, end: e.length, trim: !1 });
          },
          s = RegExp(`^(?:agent:[^:]*:)+:*${r}:${o}:`, `i`).exec(e);
        if (s) {
          a(s[0].length);
          continue;
        }
        if (n.unscoped) {
          let t = RegExp(`^${r}:${o}:`, `i`).exec(e);
          t && a(t[0].length);
        }
      }
    }
  }
  return t;
}
function Jr(e) {
  let t = c(e);
  if (!t) return ``;
  let n = Wr(t);
  if (n !== void 0) return n;
  if (!Kr(t)) {
    let e = t.toLowerCase();
    return (Gr(t, e), e);
  }
  let r = qr(t)
      .filter((e) => e.end > e.start)
      .toSorted((e, t) => e.start - t.start),
    a = ``,
    o = 0;
  for (let e of r) {
    if (e.start < o) continue;
    a += i(t.slice(o, e.start));
    let n = t.slice(e.start, e.end);
    ((a += e.trim ? n.trim() : n), (o = e.end));
  }
  return ((a += i(t.slice(o))), Gr(t, a), a);
}
function Yr(e) {
  let t = Jr(e);
  if (!t || !t.startsWith(`agent:`)) return null;
  let n = t.indexOf(`:`, 6);
  if (n === -1) return null;
  let r = c(t.slice(6, n)),
    i = t.slice(n + 1);
  return !r || !i || i.startsWith(`:`) ? null : { agentId: r, rest: i };
}
function Xr(e) {
  let n = Yr(e);
  return n ? t(n.rest)?.startsWith(`cron:`) === !0 : !1;
}
var Zr, Qr, $r, Q;
function ei() {
  return (ei = e(() => {
    ((Zr = [
      { channel: `signal`, peerKinds: new Set([`group`]), span: `segment`, unscoped: !0 },
      { channel: `matrix`, peerKinds: new Set([`channel`, `group`]), span: `tail`, unscoped: !0 },
    ]),
      (Qr = 2048),
      ($r = 4096),
      (Q = new Map()));
  }))();
}
function $() {
  throw Error(si);
}
function ti(e) {
  (e.length === 0 || e.length > oi || pe(e)) && $();
  let t;
  try {
    t = new URL(e);
  } catch {
    $();
  }
  let n = e.slice(e.indexOf(`://`) + 3).split(`/`, 1)[0] ?? ``;
  ((t.protocol !== `ws:` && t.protocol !== `wss:`) ||
    e.includes(`?`) ||
    e.includes(`#`) ||
    n.includes(`@`) ||
    t.username.length > 0 ||
    t.password.length > 0) &&
    $();
}
function ni(e, t) {
  ((e.length === 0 || !f(e, 512) || pe(e) || Yr(e) === null) && $(), ti(t));
}
function ri(e) {
  let t = ``;
  for (let n of e) t += String.fromCharCode(n);
  return btoa(t).replaceAll(`+`, `-`).replaceAll(`/`, `_`).replace(/=+$/u, ``);
}
function ii(e) {
  ni(e.sessionKey, e.gatewayUrl);
  let t = { version: 1, sessionKey: e.sessionKey, gatewayUrl: e.gatewayUrl },
    n = ri(new TextEncoder().encode(JSON.stringify(t)));
  return (n.length > ai && $(), n);
}
var ai, oi, si;
function ci() {
  return (ci = e(() => {
    (b(),
      p(),
      le(),
      ei(),
      (ai = 4096),
      (oi = 2048),
      (si = `Invalid --handoff payload. Copy a fresh command from the Control UI.`));
  }))();
}
function li(e, t) {
  return e === `global`
    ? `global`
    : e === `unknown`
      ? `unknown`
      : Xr(e)
        ? `cron`
        : t?.spawnedBy
          ? `spawn-child`
          : t?.chatType === `group` ||
              t?.chatType === `channel` ||
              e.includes(`:group:`) ||
              e.includes(`:channel:`)
            ? `group`
            : `direct`;
}
function ui() {
  return (ui = e(() => {
    ei();
  }))();
}
export {
  Ie as $,
  qn as A,
  Nn as B,
  ar as C,
  $n as D,
  ir as E,
  Un as F,
  Zt as G,
  nn as H,
  Ln as I,
  Ke as J,
  Xt as K,
  Vn as L,
  Gn as M,
  Kn as N,
  Xn as O,
  Wn as P,
  Re as Q,
  Fn as R,
  ur as S,
  rr as T,
  $t as U,
  Cn as V,
  Qt as W,
  We as X,
  Je as Y,
  Ve as Z,
  gr as _,
  Hr as a,
  be as at,
  Sr as b,
  Nr as c,
  Mr as d,
  Me as et,
  kr as f,
  wr as g,
  Cr as h,
  ci as i,
  Ce as it,
  Jn as j,
  Yn as k,
  jr as l,
  Tr as m,
  ui as n,
  Ae as nt,
  Rr as o,
  w as ot,
  Er as p,
  Lt as q,
  ii as r,
  P as rt,
  Fr as s,
  ge as st,
  li as t,
  ke as tt,
  Ar as u,
  mr as v,
  or as w,
  dr as x,
  pr as y,
  In as z,
};
//# sourceMappingURL=control-ui-boot-4F0V1byh.js.map
