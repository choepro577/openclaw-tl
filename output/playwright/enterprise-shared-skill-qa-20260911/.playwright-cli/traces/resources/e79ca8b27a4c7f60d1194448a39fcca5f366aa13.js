import {
  Ci as n,
  Lt as r,
  Si as i,
  Ti as a,
  bi as o,
  ji as s,
  ki as c,
  ln as l,
  wi as u,
  xi as d,
} from "./control-ui-foundation-CUUNgsy7.js";
import { t as f } from "./gateway-runtime-CzCgK0eB.js";
import { a as e, n as t } from "./rolldown-runtime-DkW27tQK.js";
function p(e) {
  let t = e.trim();
  if (!t) return `/`;
  let n = t.startsWith(`/`) ? t : `/${t}`;
  return n.length > 1 && n.endsWith(`/`) ? n.slice(0, -1) : n;
}
function m(e) {
  if (e === `~dot`) return `.`;
  if (e === `~dotdot`) return `..`;
  try {
    return decodeURIComponent(e.startsWith(`~~`) ? e.slice(1) : e) || null;
  } catch {
    return null;
  }
}
function h(e, t) {
  let n = c(e);
  return !n || t.length === 0 || t.some((e) => !e) ? null : `agent:${a(n)}:${t.join(`:`)}`;
}
function g(e, t = ``, r) {
  let o = p(e);
  for (let e of [`chat`, `dashboard`]) {
    let s = `${i(t)}/${e}/`;
    if (!o.startsWith(s)) continue;
    let c = o.slice(s.length).split(`/`),
      l = m(c[0] ?? ``);
    if (!l) return null;
    let u = a(l);
    if (c.length === 1) return { namespace: e, kind: `main`, agentId: u };
    let f = c[1] === `~key`,
      p = c.slice(f ? 2 : 1).map(m);
    if (p.some((e) => e === null)) return null;
    let g = p,
      _ = h(u, g);
    if (!_) return null;
    if (f || g.length !== 1) return { namespace: e, kind: `literal`, agentId: u, sessionKey: _ };
    let v = g[0] ?? ``;
    if (d(v, r)) return { namespace: e, kind: `literal`, agentId: u, sessionKey: _ };
    let y = n(v);
    return y
      ? { namespace: e, kind: `short`, agentId: u, literalSessionKey: _, ...y }
      : { namespace: e, kind: `literal`, agentId: u, sessionKey: _, slugCandidate: v };
  }
  return null;
}
function _() {
  return (_ = t(() => {
    (u(), o());
  }))();
}
function v(e, t) {
  return t.some((t) => e >= t.start && e < t.end);
}
function y(e) {
  return !!(e && /[A-Za-z0-9_-]/.test(e));
}
function ee(e) {
  return !!(e && /[A-Za-z0-9_.:-]/.test(e));
}
function b(e, t) {
  let n = t;
  for (; n < e.length && (e[n] === ` ` || e[n] === `	`);) n += 1;
  return n;
}
function x(e, t) {
  let n = t;
  for (; n < e.length && /[^\S\r\n]/u.test(e[n] ?? ``);) n += 1;
  return n;
}
function S(e, t) {
  let n = t;
  for (; n < e.length && /\s/.test(e[n] ?? ``);) n += 1;
  return n;
}
function te(e, t) {
  return e[t] === `\r`
    ? e[t + 1] ===
      `
`
      ? t + 2
      : t + 1
    : e[t] ===
        `
`
      ? t + 1
      : null;
}
function ne(e, t, n) {
  let r = b(e, t),
    i = te(e, r);
  if (i !== null) return i;
  for (let e = t; e <= r; e += 1)
    if (n?.lineBreakOffsets.has(e)) return (n.usedLineBreakOffsets?.add(e), e);
  return null;
}
function re(e, t, n, r) {
  if (n - t > r) return null;
  let i = oe.encode(e.slice(t, n)).byteLength;
  return i <= r ? i : null;
}
function C(e, t, n) {
  return e.slice(t, t + n.length).toLowerCase() === n;
}
function w(e, t, n) {
  let r = e.slice(t, t + n.length).toLowerCase();
  return r.length < n.length && n.startsWith(r);
}
function ie(e, t, n) {
  for (let r = e.indexOf(`<`, n); r !== -1; r = e.indexOf(`<`, r + 1)) if (C(e, r, t)) return r;
  return -1;
}
function ae(e, t = 0, n) {
  let r = t,
    i,
    a;
  if (e[r] === `<`) {
    if (!C(e, r, k) && !w(e, r, k)) return { kind: `invalid`, at: t };
    if (e.length - r < 10) return { kind: `prefix` };
    r += 10;
    let n = r;
    for (; ee(e[r]) && r - n < 121;) r += 1;
    if (((a = { start: n, end: r }), (i = `function`), r - n > 120))
      return { kind: `invalid`, at: r };
    if (r === e.length)
      return {
        kind: `prefix`,
        candidate: { syntax: i, name: a, nameComplete: !1, parameters: [] },
      };
    if (r === n || e[r] !== `>`) return { kind: `invalid`, at: r };
    r += 1;
  } else if (e[r] === `[`) {
    r += 1;
    let t = r;
    for (; y(e[r]) && r - t < 121;) r += 1;
    if (r - t > 120) return { kind: `invalid`, at: r };
    let o = e.slice(t, r);
    if (r === e.length && `tool`.startsWith(o)) return { kind: `prefix` };
    if (((i = `named-bracket`), (a = { start: t, end: r }), e[r] === `:` && o === `tool`)) {
      ((i = `tool-bracket`), (r += 1));
      let t = r;
      for (; y(e[r]) && r - t < 121;) r += 1;
      if (((a = { start: t, end: r }), r - t > 120)) return { kind: `invalid`, at: r };
    }
    if (r === e.length)
      return {
        kind: `prefix`,
        candidate: { syntax: i, name: a, nameComplete: !1, parameters: [] },
      };
    if (a.start === a.end || e[r] !== `]`) return { kind: `invalid`, at: r };
    if (((r += 1), i === `named-bracket`)) {
      if (r === e.length)
        return {
          kind: `prefix`,
          candidate: { syntax: i, name: a, nameComplete: !0, parameters: [] },
        };
      let t = ne(e, r, n);
      if (t === null) return { kind: `invalid`, at: r };
      r = t;
    }
  } else return { kind: `invalid`, at: t };
  let o = r,
    s = [],
    c = (e, t) => ({
      syntax: i,
      name: a,
      nameComplete: !0,
      parameters: s,
      payload: { start: o, end: e },
      ...(t === void 0 ? {} : { activeParameterOpenEnd: t }),
    }),
    l,
    u = (e, t) => ({
      kind: `prefix`,
      candidate: c(e, t),
      completeEnd: i === `tool-bracket` ? l : void 0,
    }),
    d = (e, t = e) => ({ kind: `complete`, ...c(e), end: t });
  for (;;) {
    let t = S(e, r);
    if (t === e.length)
      return i === `tool-bracket` && l !== void 0
        ? d(l)
        : { kind: `prefix`, candidate: c(e.length) };
    if (C(e, t, A))
      return i !== `function` && s.length === 0
        ? { kind: `invalid`, at: t, candidate: c(t) }
        : d(t, t + 11);
    if (w(e, t, A)) return u(t);
    if (C(e, t, j)) {
      let n = t + 11,
        i = n;
      for (; ee(e[i]) && i - n < 121;) i += 1;
      if (i - n > 120) return { kind: `invalid`, at: t, candidate: c(t) };
      if (i === e.length) return u(t);
      if (i === n || e[i] !== `>`) return { kind: `invalid`, at: t, candidate: c(t) };
      let a = i + 1,
        o = ie(e, se, a);
      if (o === -1) return u(e.length, a);
      let d = o + 12;
      (s.push({ name: { start: n, end: i }, value: { start: a, end: o } }), (r = d), (l = d));
      continue;
    }
    return w(e, t, j)
      ? u(t)
      : i === `tool-bracket` && l !== void 0
        ? d(l)
        : { kind: `invalid`, at: t, candidate: c(t) };
  }
}
var T, E, D, O, oe, k, A, j, se;
function M() {
  return (M = t(() => {
    ((T = `[END_TOOL_REQUEST]`),
      (E = `<|channel|>`),
      (D = `<|message|>`),
      (O = `<|call|>`),
      (oe = new TextEncoder()),
      (k = `<function=`),
      (A = `</function>`),
      (j = `<parameter=`),
      (se = `</parameter>`));
  }))();
}
function N(e, t, n) {
  let r = e.length - t;
  return t >= 0 && r < n.length && n.startsWith(e.slice(t));
}
function ce(e, t) {
  let n = t;
  for (; y(e[n]);) {
    if (n - t === L) return null;
    n += 1;
  }
  return n;
}
function P(e, t, n, r, i) {
  return {
    syntax: e,
    name: t,
    nameComplete: n,
    ...(r ? { payload: r } : {}),
    ...(i ? { json: i } : {}),
  };
}
function le(e, t, n) {
  let r = t + 1,
    i = `named-bracket`;
  if (e.startsWith(`tool:`, r)) ((i = `tool-bracket`), (r += 5));
  else if (N(e, r, `tool:`)) return { kind: `prefix` };
  let a = r,
    o = ce(e, a);
  if (o === null) return { kind: `invalid`, at: a + L };
  let s = { start: a, end: o };
  if (((r = o), r === e.length))
    return { kind: `prefix`, ...(a === o ? {} : { candidate: P(i, s, !1) }) };
  if (a === o || e[r] !== `]`) return { kind: `invalid`, at: r };
  r += 1;
  let c = P(i, s, !0);
  if (i === `named-bracket`) {
    let t = b(e, r);
    if (t === e.length) return { kind: `prefix`, candidate: c };
    let i = ne(e, r, n);
    if (i === null) return { kind: `invalid`, at: t, candidate: c };
    r = i;
  }
  return { kind: `complete`, cursor: r, value: c };
}
function ue(e, t) {
  let n = t;
  if (e.startsWith(`<|channel|>`, n)) n += E.length;
  else if (N(e, n, `<|channel|>`)) return { kind: `prefix` };
  else if (e[n] === `<`) return { kind: `invalid`, at: n };
  let r = R.find((t) => e.startsWith(t, n));
  if (!r) return R.some((t) => N(e, n, t)) ? { kind: `prefix` } : { kind: `invalid`, at: n };
  if (((n += r.length), n === e.length)) return { kind: `prefix` };
  if (e[n] !== ` ` && e[n] !== `	`) return { kind: `invalid`, at: n };
  if (((n = b(e, n)), !e.startsWith(`to=`, n)))
    return N(e, n, `to=`) ? { kind: `prefix` } : { kind: `invalid`, at: n };
  n += 3;
  let i = n,
    a = ce(e, i);
  if (a === null) return { kind: `invalid`, at: i + L };
  let o = { start: i, end: a };
  if (((n = a), n === e.length))
    return { kind: `prefix`, ...(i === a ? {} : { candidate: P(`harmony`, o, !1) }) };
  if (i === a || (e[n] !== ` ` && e[n] !== `	`)) return { kind: `invalid`, at: n };
  n = b(e, n);
  let s = P(`harmony`, o, !0);
  if (!e.startsWith(`code`, n))
    return N(e, n, `code`)
      ? { kind: `prefix`, candidate: s }
      : { kind: `invalid`, at: n, candidate: s };
  if (((n = S(e, n + 4)), e.startsWith(`<|message|>`, n))) n = S(e, n + D.length);
  else if (N(e, n, `<|message|>`)) return { kind: `prefix`, candidate: s };
  else if (e[n] === `<`) return { kind: `invalid`, at: n, candidate: s };
  return { kind: `complete`, cursor: n, value: s };
}
function de(e, t) {
  let n = 0,
    r = !1,
    i = !1;
  for (let a = t; a < e.length; a += 1) {
    let t = e[a];
    if (i) {
      r ? (r = !1) : t === `\\` ? (r = !0) : t === `"` && (i = !1);
      continue;
    }
    if (t === `"`) i = !0;
    else if (t === `{`) n += 1;
    else if (t === `}` && (--n, n === 0))
      return { kind: `complete`, end: a + 1, state: { depth: n, escaped: r, inString: i } };
  }
  return { kind: `prefix`, end: e.length, state: { depth: n, escaped: r, inString: i } };
}
function fe(e, t = 0, n) {
  let r = e[t] === `[` ? le(e, t, n) : ue(e, t);
  if (r.kind !== `complete`) return r;
  let i = r.value,
    a = S(e, r.cursor);
  if (a === e.length) return { kind: `prefix`, candidate: i };
  if (e[a] !== `{`) return { kind: `invalid`, at: a, candidate: i };
  let o = de(e, a),
    s = { start: a, end: o.end };
  if (o.kind === `prefix`)
    return { kind: `prefix`, candidate: P(i.syntax, i.name, !0, s, o.state) };
  let c = P(i.syntax, i.name, !0, s, o.state);
  if (i.syntax !== `named-bracket`) {
    let t = S(e, o.end),
      n = e.slice(i.name.start, i.name.end),
      r = [O, T, `[/${n}]`];
    for (let n of r) {
      if (e.startsWith(n, t)) return { ...i, kind: `complete`, payload: s, end: t + n.length };
      if (t < e.length && N(e, t, n)) return { kind: `prefix`, candidate: c };
    }
    return { ...i, kind: `complete`, payload: s, end: o.end };
  }
  let l = S(e, o.end);
  if (l === e.length) return { kind: `prefix`, candidate: c };
  let u = e.slice(i.name.start, i.name.end),
    d = [T, `[/${u}]`];
  for (let t of d) {
    if (e.startsWith(t, l)) return { ...i, payload: s, kind: `complete`, end: l + t.length };
    if (N(e, l, t)) return { kind: `prefix`, candidate: c };
  }
  return { kind: `invalid`, at: l, candidate: c };
}
function F(e, t = 0, n) {
  let r = ae(e, t, n?.structuralLineBreaks),
    i = fe(e, t, n?.structuralLineBreaks),
    a = n?.maxPayloadBytes ?? I,
    o = (t) => {
      let r = t.kind === `complete` ? t : t.candidate;
      if (!r) return { accepted: t.kind === `prefix` };
      let i = e.slice(r.name.start, r.name.end);
      return (
        r.nameComplete ? (n?.matcher?.hasExactName(i) ?? !0) : (n?.matcher?.hasNamePrefix(i) ?? !0)
      )
        ? { accepted: !0, value: r, ...(r.payload ? { payload: r.payload } : {}) }
        : { accepted: !1 };
    },
    s = o(r),
    c = o(i),
    l = { json: i, matches: { json: c.accepted, xmlish: s.accepted }, xmlish: r },
    u = (t) => !!(t && re(e, t.start, t.end, a) === null),
    d = u(s.payload),
    f = u(c.payload);
  if (s.accepted && r.kind === `complete`)
    return {
      ...l,
      end: r.end,
      kind: `complete`,
      next: r.end,
      overCap: d,
      payloadStart: r.payload.start,
    };
  if (c.accepted && i.kind === `complete`)
    return f || pe(e, i.payload)
      ? {
          ...l,
          end: i.end,
          kind: `complete`,
          next: i.end,
          overCap: f,
          payloadStart: i.payload.start,
        }
      : {
          ...l,
          at: i.end,
          kind: `invalid`,
          next: i.end,
          overCap: !1,
          payloadStart: i.payload.start,
        };
  if (s.accepted && r.kind === `invalid` && d && s.payload)
    return {
      ...l,
      at: r.at,
      kind: `invalid`,
      next: r.at,
      overCap: !0,
      payloadStart: s.payload.start,
    };
  if (c.accepted && i.kind === `invalid` && f && c.payload)
    return {
      ...l,
      at: i.at,
      kind: `invalid`,
      next: i.at,
      overCap: !0,
      payloadStart: c.payload.start,
    };
  let p = s.accepted && r.kind === `prefix`,
    m = c.accepted && i.kind === `prefix`;
  if (p || m) {
    let t = p ? s.payload : c.payload;
    return {
      ...l,
      ...(r.kind === `prefix` && r.completeEnd !== void 0 ? { completeEnd: r.completeEnd } : {}),
      kind: `prefix`,
      next: e.length,
      overCap: u(t),
      ...(t ? { payloadStart: t.start } : {}),
    };
  }
  let h = t + 1;
  return (
    s.accepted && (h = Math.max(h, r.kind === `invalid` ? r.at : e.length)),
    c.accepted &&
      (h = Math.max(h, i.kind === `complete` ? i.end : i.kind === `invalid` ? i.at : e.length)),
    { ...l, at: h, kind: `invalid`, next: h, overCap: !1 }
  );
}
function pe(e, t) {
  return l(e.slice(t.start, t.end)) ?? null;
}
function me(e, t = {}) {
  if (
    !e ||
    (!/\[(?:tool:)?[A-Za-z0-9_-]+\]/.test(e) &&
      !/(?:^|[\r\n])[^\S\r\n]*(?:<\|channel\|>)?(?:commentary|analysis|final)[ \t]+to=/.test(e) &&
      !/(?:^|[\r\n])[^\S\r\n]*<function=/i.test(e))
  )
    return e;
  let n = t.resolveProtectedRanges?.(e) ?? [],
    r = ``,
    i = 0,
    a = 0;
  for (; a < e.length;) {
    if (
      a !== 0 &&
      e[a - 1] !==
        `
` &&
      e[a - 1] !== `\r`
    ) {
      a += 1;
      continue;
    }
    let t = x(e, a);
    if (v(t, n)) {
      a += 1;
      continue;
    }
    let o = F(e, t);
    if (o.kind === `prefix` && o.completeEnd === void 0) return r + e.slice(i);
    if (o.kind === `invalid`) {
      a = Math.max(a + 1, o.next);
      continue;
    }
    let s = o.kind === `complete` ? o.end : o.completeEnd;
    if (s === void 0) return r + e.slice(i);
    for (r += e.slice(i, a); ;) {
      let t = x(e, s);
      if (v(t, n)) break;
      let r = F(e, t),
        i = r.kind === `complete` ? r.end : r.kind === `prefix` ? r.completeEnd : void 0;
      if (i === void 0 || i <= s) break;
      s = i;
    }
    let c = x(e, s);
    ((i = c === e.length ? c : (te(e, c) ?? s)), (a = i));
  }
  return ((r += e.slice(i)), r);
}
var I, L, R;
function z() {
  return (z = t(() => {
    (r(), M(), (I = 256e3), (L = 120), (R = [`commentary`, `analysis`, `final`]));
  }))();
}
function B() {
  return (B = t(() => {
    (M(), z());
  }))();
}
function V() {
  return (V = t(() => {
    z();
  }))();
}
function H() {
  return (H = t(() => {
    (z(), B(), V());
  }))();
}
function he(e) {
  return e
    .replace(/```[\s\S]*?```/g, ` `)
    .replace(/```/g, ` `)
    .replace(/`([^`]*)`/g, `$1`)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, `$1`)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, `$1`)
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gm, ``)
    .replace(/(\*{1,2})(?=\S)([\s\S]*?\S)\1/g, `$2`)
    .replace(/(^|[^\p{L}\p{N}])(_{1,2})(?=\S)([\s\S]*?\S)\2(?![\p{L}\p{N}])/gu, `$1$3`)
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, `$1`)
    .replace(/\s+/g, ` `)
    .trim();
}
function ge() {
  return (ge = t(() => {}))();
}
function U(e) {
  let [t, n, r, i, a, o, s, c] = e;
  if (
    t === void 0 ||
    n === void 0 ||
    r === void 0 ||
    i === void 0 ||
    a === void 0 ||
    o === void 0 ||
    s === void 0 ||
    c === void 0
  )
    throw Error(`expected IPv6 address to expose 8 hextets`);
  return [t, n, r, i, a, o, s, c];
}
function _e(e) {
  return e.startsWith(`[`) && e.endsWith(`]`) ? e.slice(1, -1) : e;
}
function ve(e) {
  return /^[0-9]+$/.test(e) || /^0x[0-9a-f]+$/i.test(e);
}
function ye(e) {
  return e.kind() === `ipv4`;
}
function W(e) {
  let t = s(e);
  if (t) return _e(t);
}
function be(e) {
  let t = W(e);
  if (t)
    return K.default.IPv4.isValidFourPartDecimal(t) || K.default.IPv6.isValid(t)
      ? K.default.parse(t)
      : void 0;
}
function xe(e) {
  let t = W(e);
  if (t) return K.default.isValid(t) ? K.default.parse(t) : void 0;
}
function Se(e) {
  let t = W(e);
  return t !== void 0 && K.default.IPv4.isValidFourPartDecimal(t);
}
function Ce(e) {
  let t = s(e);
  if (!t) return !1;
  let n = _e(t);
  if (!n || n.includes(`:`) || Se(n)) return !1;
  let r = n.split(`.`);
  return !(
    r.length === 0 ||
    r.length > 4 ||
    r.some((e) => e.length === 0) ||
    !r.every((e) => ve(e))
  );
}
function we(e, t = {}) {
  let n = e.range();
  if (De(e)) return !0;
  if (n === `uniqueLocal` && t.allowUniqueLocalRange === !0) return !1;
  if (Ae.has(n)) return !0;
  let [r] = U(e.parts);
  return (r & 65472) == 65216;
}
function Te(e, t = {}) {
  let n = e.match(je);
  return n && t.allowRfc2544BenchmarkRange === !0 ? !1 : ke.has(e.range()) || n;
}
function G(e, t) {
  let n = [(e >>> 8) & 255, e & 255, (t >>> 8) & 255, t & 255];
  return K.default.IPv4.parse(n.join(`.`));
}
function Ee(e) {
  return e[0] === 100 && e[1] === 65435 && e[2] === 1;
}
function De(e) {
  return Ee(U(e.parts));
}
function Oe(e) {
  let t = U(e.parts);
  switch (e.range()) {
    case `ipv4Mapped`:
      return e.toIPv4Address();
    case `rfc6145`:
      return G(t[6], t[7]);
    case `rfc6052`:
      return De(e) ? void 0 : G(t[6], t[7]);
    case `6to4`:
      return G(t[1], t[2]);
    case `teredo`:
      return G(t[6] ^ 65535, t[7] ^ 65535);
  }
  let n = t[0] === 0 && t[1] === 0 && t[2] === 0 && t[3] === 0 && t[4] === 0 && t[5] === 0,
    r = !(t[4] & 64767) && t[5] === 24318;
  if (n || r) return G(t[6], t[7]);
}
var K, ke, Ae, je;
function Me() {
  return (Me = t(() => {
    ((K = e(f(), 1)),
      (ke = new Set([
        `unspecified`,
        `broadcast`,
        `multicast`,
        `linkLocal`,
        `loopback`,
        `carrierGradeNat`,
        `private`,
        `reserved`,
      ])),
      (Ae = new Set([
        `unspecified`,
        `loopback`,
        `linkLocal`,
        `uniqueLocal`,
        `multicast`,
        `reserved`,
        `benchmarking`,
        `discard`,
        `orchid2`,
      ])),
      (je = [K.default.IPv4.parse(`198.18.0.0`), 15]));
  }))();
}
function Ne(e) {
  return Pe.test(e);
}
var Pe;
function Fe() {
  return (Fe = t(() => {
    Pe = /^https?:\/\//i;
  }))();
}
function Ie(e, t) {
  return ((X.lastIndex = t), X.exec(e)?.[0]);
}
function Le(e, t) {
  let n = e.charCodeAt(t);
  return n === 155 ? 1 : n === 27 && e.charCodeAt(t + 1) === 91 ? 2 : 0;
}
function Re(e, t) {
  let n = Le(e, t);
  if (n === 0) return;
  let r = t + n,
    i = [],
    a = !1;
  for (; r < e.length;) {
    let t = e.charCodeAt(r);
    if (t === 24 || t === 26) {
      ((r += 1), (a = !0));
      break;
    }
    if (t === 27 || t === 155) {
      a = !0;
      break;
    }
    if (t <= 31 || t === 127) {
      (i.push(e.charAt(r)), (r += 1));
      continue;
    }
    if (t >= 32 && t <= 63) {
      r += 1;
      continue;
    }
    (t >= 64 && t <= 126 && (r += 1), (a = !0));
    break;
  }
  return { controls: i, ended: a, value: e.slice(t, r) };
}
var q, J, Y, ze, X;
function Be() {
  return (Be = t(() => {
    ((q = `(?:\\x1b\\]|\\x9d)`),
      (J = `(?:\\x1b\\\\|\\x07|\\x9c)`),
      (Y = `${q}[^\\x07\\x1b\\x9c]*${J}`),
      (ze = `[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]`),
      (X = new RegExp(Y, `y`)));
  }))();
}
function Ve(e) {
  return e.includes(`\x1B`) || e.includes(``) || e.includes(``);
}
function He(e, t) {
  let n = [],
    r = 0,
    i = 0;
  for (; i < e.length;) {
    let a = e.charCodeAt(i);
    if (a !== 27 && a !== 155 && a !== 157) {
      i += 1;
      continue;
    }
    let o = Ie(e, i);
    if (o) {
      (n.push(e.slice(r, i)), (i += o.length), (r = i));
      continue;
    }
    let s = Re(e, i);
    if (!s) {
      Z.lastIndex = i;
      let a = t.compatibilityGrammar ? Z.exec(e) : null;
      if (a) {
        (n.push(e.slice(r, i)), (i += a[0].length), (r = i));
        continue;
      }
      i += 1;
      continue;
    }
    Z.lastIndex = i;
    let c = t.compatibilityGrammar ? Z.exec(e) : null;
    if (!s.ended && t.preserveIncompleteCsi) break;
    let l = i + s.value.length,
      u = s.value.length;
    (s.controls.length === 0 && c && c[0].length > u && (l = i + c[0].length),
      n.push(e.slice(r, i), ...s.controls),
      (i = l),
      (r = l));
  }
  return (n.push(e.slice(r)), n.join(``));
}
function Ue(e) {
  return Ve(e) ? He(e, { compatibilityGrammar: !1 }) : e;
}
var We, Z;
function Q() {
  return (Q = t(() => {
    (Be(),
      (We = `${q}[\\s\\S]*?${J}`),
      (Z = RegExp(`${We}|${ze}`, `y`)),
      typeof Intl < `u` &&
        `Segmenter` in Intl &&
        new Intl.Segmenter(void 0, { granularity: `grapheme` }));
  }))();
}
function Ge(e) {
  for (let t of e) {
    let e = t.codePointAt(0);
    if (e !== void 0 && (e <= 31 || (e >= 127 && e <= 159))) return !0;
  }
  return !1;
}
function $() {
  return ($ = t(() => {
    Q();
  }))();
}
export {
  g as S,
  ge as _,
  Ne as a,
  me as b,
  Me as c,
  Se as d,
  ye as f,
  he as g,
  xe as h,
  Ue as i,
  Te as l,
  be as m,
  $ as n,
  Fe as o,
  Ce as p,
  Q as r,
  Oe as s,
  Ge as t,
  we as u,
  H as v,
  _ as x,
  z as y,
};
//# sourceMappingURL=control-ui-boot-adV0af1C.js.map
