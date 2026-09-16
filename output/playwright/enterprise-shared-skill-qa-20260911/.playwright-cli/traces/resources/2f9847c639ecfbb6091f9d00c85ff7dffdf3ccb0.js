import {
  R as p,
  d as m,
  f as h,
  l as ee,
  nt as te,
  ot as g,
  tt as ne,
} from "./control-ui-boot-4F0V1byh.js";
import { Ta as d, wa as f } from "./control-ui-core-B5rJKETr.js";
import {
  Ai as t,
  Gt as n,
  Lt as r,
  Oi as i,
  Vt as a,
  in as o,
  ji as s,
  nn as c,
  pn as l,
  zt as u,
} from "./control-ui-foundation-CUUNgsy7.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function re(e) {
  return `(?:^|\\r?\\n)[ \\t]*${g(e)}[ \\t]*(?=\\r?\\n|$)`;
}
function ie(e, t, n) {
  let r = new RegExp(re(t), `g`);
  r.lastIndex = Math.max(0, n);
  let i = r.exec(e);
  return i ? i.index + i[0].indexOf(t) : -1;
}
function ae(e, t) {
  return e.replace(new RegExp(re(t), `g`), ``);
}
function oe(e, t) {
  let n =
    e.lastIndexOf(
      `
`,
      t - 1,
    ) + 1;
  return n === 0 ? 0 : e[n - 2] === `\r` ? n - 2 : n - 1;
}
function se(e, t, n, r = {}) {
  let i = e,
    a = [];
  for (;;) {
    let e = ie(i, t, 0);
    if (e === -1) return { text: i, blocks: a };
    let o = e + t.length,
      s = 1,
      c = -1;
    for (; s > 0;) {
      let e = ie(i, t, o),
        r = ie(i, n, o);
      if (r === -1) break;
      if (e !== -1 && e < r) {
        ((s += 1), (o = e + t.length));
        continue;
      }
      (--s, (c = r), (o = r + n.length));
    }
    let l = r.preserveSurroundingWhitespace ? oe(i, e) : e,
      u = r.preserveSurroundingWhitespace ? i.slice(0, l) : i.slice(0, e).trimEnd();
    if (c === -1 || s !== 0) return { text: u, blocks: a };
    let d = c + n.length;
    for (; i[d] === ` ` || i[d] === `	`;) d += 1;
    a.push(i.slice(e, d).trim());
    let f = r.preserveSurroundingWhitespace ? i.slice(d) : i.slice(d).trimStart();
    i =
      !r.preserveSurroundingWhitespace && u && f
        ? `${u}${
            r.separator ??
            `

`
          }${f}`
        : `${u}${f}`;
  }
}
function ce(e, t, n, r) {
  return se(e, t, n, r).text;
}
function le(e, t) {
  if (!e.startsWith(b, t)) return null;
  let n = e.indexOf(ge, t + 32);
  if (n === -1) return null;
  let r = e.indexOf(_e, n + 34);
  if (r === -1) return null;
  let i = e.indexOf(
    `

Action:
`,
    r + 32,
  );
  if (i === -1) return null;
  let a = i + 10,
    o = e.indexOf(`${x}${b}`, a);
  if (o !== -1) return o;
  let s = e.indexOf(
    `

`,
    a,
  );
  return s === -1 ? e.length : s;
}
function ue(e) {
  let t = e,
    n = 0;
  for (;;) {
    let e = t.indexOf(y, n);
    if (e === -1) return t;
    let r = e + y.length;
    if (!t.startsWith(b, r)) {
      n = r;
      continue;
    }
    let i = le(t, r);
    if (i == null) {
      let e = t.indexOf(
        `

`,
        r + 32,
      );
      i = e === -1 ? t.length : e;
    } else
      for (; t.startsWith(`${x}${b}`, i);) {
        let e = i + 7,
          n = le(t, e);
        if (n == null) break;
        i = n;
      }
    let a = t.slice(0, e).trimEnd(),
      o = t.slice(i).trimStart();
    ((t = a && o ? `${a}\n\n${o}` : `${a}${o}`), (n = Math.max(0, a.length - 1)));
  }
}
function de(e) {
  let t = e.split(/\r?\n/),
    n = !1,
    r = [];
  for (let e = 0; e < t.length; e += 1) {
    let i = t[e] ?? ``,
      a = t[e + 1] ?? ``;
    if (
      ve.includes(i.trim()) &&
      a.trim() ===
        `This context is runtime-generated, not user-authored. Keep internal details private.`
    ) {
      for (n = !0, e += 1; e + 1 < t.length && (t[e + 1] ?? ``).trim() === ``;) e += 1;
      continue;
    }
    r.push(i);
  }
  return n
    ? r
        .join(`
`)
        .replace(
          /\n{3,}/g,
          `

`,
        )
        .trim()
    : e;
}
function fe(e, t = {}) {
  return e && de(ue(ae(ce(e, _, v, t), v)));
}
var _, v, pe, me, he, y, b, x, ge, _e, ve;
function ye() {
  return (ye = e(() => {
    ((_ = `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`),
      (v = `<<<END_OPENCLAW_INTERNAL_CONTEXT>>>`),
      (pe = `This context is runtime-generated, not user-authored. Keep internal details private.`),
      (me = `OpenClaw runtime context for the active user request in this turn. Do not reply to or describe this context. Use it to continue answering the active user request now. Do not wait for another message.`),
      (he = `OpenClaw runtime event.`),
      (y =
        [`OpenClaw runtime context (internal):`, pe, ``].join(`
`) +
        `
`),
      (b = `[Internal task completion event]`),
      (x = `

---

`),
      (ge = `<<<BEGIN_UNTRUSTED_CHILD_RESULT>>>`),
      (_e = `<<<END_UNTRUSTED_CHILD_RESULT>>>`),
      (ve = [me, `OpenClaw runtime context for the immediately preceding user message.`, he]));
  }))();
}
function be(e) {
  let t = C.get(e);
  if (t) return t;
  let n = g(e),
    r = RegExp(`^\\s*${n}(?:\\s+${n})*\\s*$`, `i`);
  return (C.set(e, r), r);
}
function xe(e) {
  let t = w.get(e);
  if (t) return t;
  let n = g(e),
    r = RegExp(`(?:^|\\s+|\\*+)${n}(?:\\s+${n})*\\s*$`, `i`);
  return (w.set(e, r), r);
}
function Se(e) {
  return e.replace(/^\p{P}+|\p{P}+$/gu, ``);
}
function Ce(e, t = S) {
  return e ? be(t).test(e) || be(t).test(Se(e.trim())) : !1;
}
function we(e, t = S) {
  return e.replace(xe(t), ``).trim();
}
var S, C, w;
function Te() {
  return (Te = e(() => {
    ((S = `NO_REPLY`), (C = new Map()), (w = new Map()));
  }))();
}
function Ee() {
  return (Ee = e(() => {
    te();
  }))();
}
var T;
function De() {
  return (De = e(() => {
    T = `⟦openclaw:ctx⟧`;
  }))();
}
function Oe(e) {
  let t = e.trim();
  return t.length > 14 && t.endsWith(`⟦openclaw:ctx⟧`);
}
function ke(e) {
  let t = e.trim();
  return ne.some((e) => e === t);
}
function Ae(e, t) {
  let n = t + 1;
  for (; n < e.length && e[n]?.trim() !== ``;) n++;
  for (; n < e.length && e[n]?.trim() === ``;) n++;
  return n;
}
function je(e, t) {
  return e[t]?.trim() === Pe;
}
function Me(e) {
  let t = [];
  for (let n = 0; n < e.length; n += 1) {
    let r = e.at(n);
    if (r === void 0) break;
    if (r.trim() === D && e[n + 1]?.trim() === Fe) {
      let t = -1;
      for (let r = n + 2; r < e.length; r += 1)
        if (e[r]?.trim() === Ie) {
          t = r;
          break;
        }
      if (t !== -1) {
        for (n = t; n + 1 < e.length && e[n + 1]?.trim() === ``;) n += 1;
        continue;
      }
    }
    t.push(r);
  }
  return t;
}
function Ne(e) {
  if (!e) return e;
  let t = e.replace(E, ``);
  if (!ze.test(t)) return t;
  let n = Me(
      t.split(`
`),
    ),
    r = [],
    i = !1,
    a = !1;
  for (let e = 0; e < n.length; e++) {
    let t = n.at(e);
    if (t === void 0 || (!i && je(n, e))) break;
    if (!(!i && ke(t))) {
      if (!i && Oe(t)) {
        if (n[e + 1]?.trim() !== "```json") {
          e = Ae(n, e) - 1;
          continue;
        }
        ((i = !0), (a = !1));
        continue;
      }
      if (i) {
        if (!a && t.trim() === "```json") {
          a = !0;
          continue;
        }
        if (a) {
          t.trim() === "```" && ((i = !1), (a = !1));
          continue;
        }
        if (t.trim() === ``) continue;
        i = !1;
      }
      r.push(t);
    }
  }
  return r
    .join(`
`)
    .replace(/^\n+/, ``)
    .replace(/\n+$/, ``)
    .replace(E, ``);
}
var E, Pe, D, Fe, Ie, Le, Re, ze;
function Be() {
  return (Be = e(() => {
    (r(),
      Ee(),
      De(),
      (E = /^\[[A-Za-z]{3} \d{4}-\d{2}-\d{2} \d{2}:\d{2}[^\]]*\] */),
      (Pe = `Context: ${T}`),
      (D = `Context:`),
      (Fe = `<active_memory_plugin>`),
      (Ie = `</active_memory_plugin>`),
      (Le = [T, ...ne].map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)).join(`|`)),
      (Re = D.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)),
      (ze = RegExp(`${Le}|^[ \t]*${Re}[ \t]*$`, `m`)));
  }))();
}
function O(e) {
  if (!e) return e;
  let t = e.trim();
  return t.length >= 2 &&
    ((t.startsWith(`"`) && t.endsWith(`"`)) || (t.startsWith(`'`) && t.endsWith(`'`)))
    ? t.slice(1, -1).trim()
    : t;
}
function k(e, t = 48) {
  if (!e) return [];
  let n = [],
    r = ``,
    i,
    a = !1;
  for (let o of e) {
    if (a) {
      ((r += o), (a = !1));
      continue;
    }
    if (o === `\\`) {
      a = !0;
      continue;
    }
    if (i) {
      o === i ? (i = void 0) : (r += o);
      continue;
    }
    if (o === `"` || o === `'`) {
      i = o;
      continue;
    }
    if (/\s/.test(o)) {
      if (!r) continue;
      if ((n.push(r), n.length >= t)) return n;
      r = ``;
      continue;
    }
    r += o;
  }
  return (r && n.push(r), n);
}
function A(e) {
  if (!e) return;
  let t = O(e) ?? e,
    n = t.split(/[/]/).at(-1) ?? t;
  return i(n);
}
function j(e, t) {
  let n = new Set(t);
  for (let r = 0; r < e.length; r += 1) {
    let i = e[r];
    if (i) {
      if (n.has(i)) {
        let t = e[r + 1];
        if (t && !t.startsWith(`-`)) return t;
        continue;
      }
      for (let e of t)
        if (e.startsWith(`--`) && i.startsWith(`${e}=`)) return i.slice(e.length + 1);
    }
  }
}
function M(e, t = 1, n = []) {
  let r = [],
    i = new Set(n);
  for (let n = t; n < e.length; n += 1) {
    let t = e[n];
    if (t) {
      if (t === `--`) {
        for (let t = n + 1; t < e.length; t += 1) {
          let n = e[t];
          n && r.push(n);
        }
        break;
      }
      if (t.startsWith(`--`)) {
        if (t.includes(`=`)) continue;
        i.has(t) && (n += 1);
        continue;
      }
      if (t.startsWith(`-`)) {
        i.has(t) && (n += 1);
        continue;
      }
      r.push(t);
    }
  }
  return r;
}
function N(e, t = 1, n = []) {
  return M(e, t, n)[0];
}
function P(e) {
  if (e.length === 0) return e;
  let t = 0;
  if (A(e[0]) === `env`) {
    for (t = 1; t < e.length;) {
      let n = e[t];
      if (!n) break;
      if (n.startsWith(`-`)) {
        t += 1;
        continue;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(n)) {
        t += 1;
        continue;
      }
      break;
    }
    return e.slice(t);
  }
  for (; t < e.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(e.at(t) ?? ``);) t += 1;
  return e.slice(t);
}
function Ve(e) {
  let t = k(e, 10);
  if (t.length < 3) return e;
  let n = A(t[0]);
  if (n !== `bash` && n !== `sh` && n !== `zsh` && n !== `fish`) return e;
  let r = t.findIndex((e, t) => t > 0 && (e === `-c` || e === `-lc` || e === `-ic`));
  if (r === -1) return e;
  let i = t
    .slice(r + 1)
    .join(` `)
    .trim();
  return i ? (O(i) ?? e) : e;
}
function He(e, t) {
  if (e[t] !== `<` || e[t - 1] === `<` || e[t + 1] !== `<` || e[t + 2] === `<`) return;
  let n = e[t + 2] === `-`,
    r = t + (n ? 3 : 2);
  for (; /[ \t]/u.test(e[r] ?? ``);) r += 1;
  let i = ``,
    a;
  for (; r < e.length; r += 1) {
    let t = e[r] ?? ``;
    if (a) {
      if (t === a) {
        a = void 0;
        continue;
      }
      if (a === `"` && t === `\\` && r + 1 < e.length) {
        ((r += 1), (i += e[r] ?? ``));
        continue;
      }
      i += t;
      continue;
    }
    if (/[\r\n;&|<>]/u.test(t) || /[ \t]/u.test(t)) break;
    if (t === `'` || t === `"`) {
      a = t;
      continue;
    }
    if (t === `\\` && r + 1 < e.length) {
      ((r += 1), (i += e[r] ?? ``));
      continue;
    }
    i += t;
  }
  return i ? { value: i, stripLeadingTabs: n, operatorIndex: t } : void 0;
}
function Ue(e, t, n) {
  let r = n;
  for (; r <= e.length;) {
    let n = e.indexOf(
        `
`,
        r,
      ),
      i = n === -1 ? e.length : n,
      a = e.slice(r, i).replace(/\r$/u, ``);
    if ((t.stripLeadingTabs ? a.replace(/^\t+/u, ``) : a) === t.value) return i;
    if (n === -1) return;
    r = n + 1;
  }
}
function We(e, t) {
  let n = t + 1;
  for (
    ;
    e[n] === `\\` &&
    e[n + 1] ===
      `
`;
  )
    n += 2;
  return e[n] === `(` ? n : void 0;
}
function F(e, t, n) {
  let r,
    i = !1,
    a = !0,
    o = 0,
    s = 0,
    c = [],
    l = !1;
  for (let u = 0; u < e.length; u += 1) {
    let d = e.charAt(u),
      f = l;
    if (((l = !1), i)) {
      if (
        ((i = !1),
        d ===
          `
`)
      ) {
        if (((l = f), t(``, u - 1) === !1 || t(``, u) === !1)) return;
      } else a = !1;
      continue;
    }
    if (r === `'`) {
      d === r && (r = void 0);
      continue;
    }
    if (d === `\\`) {
      ((l = f), (i = !0));
      continue;
    }
    if (r) {
      d === (r === `ansi-c` ? `'` : r) && (r = void 0);
      continue;
    }
    if (d === `"` || d === `'`) {
      ((r = d === `'` && f ? `ansi-c` : d), (a = !1));
      continue;
    }
    if (d === `#` && a && o === 0) {
      let t = e.indexOf(
        `
`,
        u + 1,
      );
      if (t === -1) return;
      u = t - 1;
      continue;
    }
    let p = o === 0 && d === `(` && (f || a) ? We(e, u) : void 0,
      m = p !== void 0,
      h = o > 0 || m;
    if (!h) {
      let t = He(e, u);
      t && c.push(t);
    }
    if (
      d ===
        `
` &&
      c.length > 0
    ) {
      let t = u + 1,
        r,
        i = [];
      for (let n of c) {
        if (((r = Ue(e, n, t)), r === void 0)) break;
        (i.push({ marker: n, start: t, end: r }), (t = r + 1));
      }
      if (((c = []), r !== void 0)) {
        for (let e of i) n?.(e.marker.operatorIndex, e.start, e.end);
        u = r - 1;
        continue;
      }
    }
    if (p !== void 0) {
      if (t(d, u) === !1 || t(e.charAt(p), p) === !1) return;
    } else if (!h && t(d, u) === !1) return;
    if (d === `(` && (o > 0 || m)) {
      o += 1;
      continue;
    }
    if (d === `)` && o > 0) {
      --o;
      continue;
    }
    if (!h) {
      if (/\s/u.test(d)) a = !0;
      else if (d === `(`) {
        let t = e[u - 1];
        t === `$` || t === `<` || t === `>` ? (a = !0) : (a &&= ((s += 1), !0));
      } else d === `)` ? (s > 0 ? (--s, (a = !0)) : (a = !1)) : (a = !!/[;&|<>]/u.test(d));
      l = d === `$`;
    }
  }
}
function Ge(e, t) {
  let n = [],
    r = 0,
    i = 0,
    a = [];
  return (
    F(
      e,
      (o, s) => {
        let c = t(o, s);
        return c === 0 || (n.push(a.join(``) + e.slice(i, s)), (r = s + c), (i = r), (a = []), !0);
      },
      (t, n, o) => {
        t < r && (a.push(e.slice(i, n)), (i = o));
      },
    ),
    n.push(a.join(``) + e.slice(i)),
    n.map((e) => e.trim()).filter((e) => e.length > 0)
  );
}
function Ke(e) {
  let t = Array.from({ length: e.length }, () => `\0`);
  F(e, (e, n) => ((t[n] = e), !0));
  let n = t.join(``);
  return $e.test(n) || et.test(n) || tt.test(n) || nt.test(n) || rt.test(n) || it.test(n);
}
function qe(e) {
  return Ke(e)
    ? e.trim()
      ? [e.trim()]
      : []
    : Ge(e, (t, n) => (t === `;` ? 1 : (t === `&` || t === `|`) && e[n + 1] === t ? 2 : 0));
}
function Je(e) {
  return Ge(e, (t, n) => +(t === `|` && e[n - 1] !== `|` && e[n + 1] !== `|`));
}
function Ye(e) {
  let t = k(e, 3),
    n = A(t[0]);
  if (n === `cd` || n === `pushd`) return t[1] || void 0;
}
function Xe(e) {
  let t = A(k(e, 2)[0]);
  return t === `cd` || t === `pushd` || t === `popd`;
}
function Ze(e) {
  return A(k(e, 2)[0]) === `popd`;
}
function Qe(e) {
  let t = e.trim(),
    n;
  for (let e = 0; e < 4; e += 1) {
    let r;
    F(t, (e, n) => {
      if (e === `&` && t[n + 1] === `&`) return ((r = { index: n, length: 2 }), !1);
      if (e === `|` && t[n + 1] === `|`) return ((r = { index: n, length: 2, isOr: !0 }), !1);
      if (
        e === `;` ||
        e ===
          `
`
      )
        return ((r = { index: n, length: 1 }), !1);
    });
    let i = (r ? t.slice(0, r.index) : t).trim(),
      a = (r ? !r.isOr : e > 0) && Xe(i);
    if (
      !(i.startsWith(`set `) || i.startsWith(`export `) || i.startsWith(`unset `) || a) ||
      (a && (n = Ze(i) ? void 0 : (Ye(i) ?? n)),
      (t = r ? t.slice(r.index + r.length).trimStart() : ``),
      !t)
    )
      break;
  }
  return { command: t.trim(), chdirPath: n };
}
var I, L, R, z, B, $e, V, et, tt, H, nt, rt, it;
function at() {
  return (at = e(() => {
    ((I = String.raw`(?:^|;|\n|(?<!>)\||(?<![<>])&(?![>&]))\s*(?:(?:time(?:\s+-p)?(?:\s+--)?|!)(?:\s+|(?=\()))*`),
      (L = String.raw`(?=$|[\s;&|()<>])`),
      (R = `(?:(?:for|while|until|if|case|select|coproc)${L}|(?:\\[\\[|\\{)${L})`),
      (z = `(?:${R}|\\((?!\\())`),
      (B = `(?:${R}|\\()`),
      ($e = RegExp(`${I}${z}`, `u`)),
      (V = `[^\\s;&|()<>]+`),
      (et = RegExp(`${I}function\\s+${V}(?:\\s+${B}|\\((?!\\s*\\)))`, `u`)),
      (tt = RegExp(`${I}(?:function\\s+)?${V}\\s*\\(\\s*\\)\\s*${B}`, `u`)),
      (H = String.raw`(?:\$\((?!\()|[<>]\()\s*(?:(?:time(?:\s+-p)?(?:\s+--)?|!)(?:\s+|(?=\()))*`),
      (nt = RegExp(`${H}${z}`, `u`)),
      (rt = RegExp(`${H}function\\s+${V}(?:\\s+${B}|\\((?!\\s*\\)))`, `u`)),
      (it = RegExp(`${H}(?:function\\s+)?${V}\\s*\\(\\s*\\)\\s*${B}`, `u`)));
  }))();
}
function U(e) {
  if (e.length === 0) return `run command`;
  let t = A(e[0]) ?? `command`;
  if (t === `git`) {
    let t = new Set([`-C`, `-c`, `--git-dir`, `--work-tree`, `--namespace`, `--config-env`]),
      n = j(e, [`-C`]),
      r;
    for (let n = 1; n < e.length; n += 1) {
      let i = e[n];
      if (i) {
        if (i === `--`) {
          r = N(e, n + 1);
          break;
        }
        if (i.startsWith(`--`)) {
          if (i.includes(`=`)) continue;
          t.has(i) && (n += 1);
          continue;
        }
        if (i.startsWith(`-`)) {
          t.has(i) && (n += 1);
          continue;
        }
        r = i;
        break;
      }
    }
    return (
      (r
        ? {
            status: `check git status`,
            diff: `check git diff`,
            log: `view git history`,
            show: `show git object`,
            branch: `list git branches`,
            checkout: `switch git branch`,
            switch: `switch git branch`,
            commit: `create git commit`,
            pull: `pull git changes`,
            push: `push git changes`,
            fetch: `fetch git changes`,
            merge: `merge git changes`,
            rebase: `rebase git branch`,
            add: `stage git changes`,
            restore: `restore git files`,
            reset: `reset git state`,
            stash: `stash git changes`,
          }[r]
        : void 0) ||
      (!r || r.startsWith(`/`) || r.startsWith(`~`) || r.includes(`/`)
        ? n
          ? `run git command in ${n}`
          : `run git command`
        : `run git ${r}`)
    );
  }
  if (t === `grep` || t === `rg` || t === `ripgrep`) {
    let t = M(e, 1, [
        `-e`,
        `--regexp`,
        `-f`,
        `--file`,
        `-m`,
        `--max-count`,
        `-A`,
        `--after-context`,
        `-B`,
        `--before-context`,
        `-C`,
        `--context`,
      ]),
      n = j(e, [`-e`, `--regexp`]) ?? t[0],
      r = t.length > 1 ? t.at(-1) : void 0;
    return n
      ? ot(n)
        ? r
          ? `search text in ${r}`
          : `search text`
        : r
          ? `search "${n}" in ${r}`
          : `search "${n}"`
      : `search text`;
  }
  if (t === `find`) {
    let t = e[1] && !e[1].startsWith(`-`) ? e[1] : `.`,
      n = j(e, [`-name`, `-iname`]);
    return n ? `find files named "${n}" in ${t}` : `find files in ${t}`;
  }
  if (t === `ls`) {
    let t = N(e, 1);
    return t ? `list files in ${t}` : `list files`;
  }
  if (t === `head` || t === `tail`) {
    let n =
        j(e, [`-n`, `--lines`]) ??
        e
          .slice(1)
          .find((e) => /^-\d+$/.test(e))
          ?.slice(1),
      r = M(e, 1, [`-n`, `--lines`]),
      i = r.at(-1);
    i && /^\d+$/.test(i) && r.length === 1 && (i = void 0);
    let a = t === `head` ? `first` : `last`,
      o = n === `1` ? `line` : `lines`;
    return n && i
      ? `show ${a} ${n} ${o} of ${i}`
      : n
        ? `show ${a} ${n} ${o}`
        : i
          ? `show ${i}`
          : `show ${t} output`;
  }
  if (t === `cat`) {
    let t = N(e, 1);
    return t ? `show ${t}` : `show output`;
  }
  if (t === `sed`) {
    let t = j(e, [`-e`, `--expression`]),
      n = M(e, 1, [`-e`, `--expression`, `-f`, `--file`]),
      r = t ?? n[0],
      i = t ? n[0] : n[1];
    if (r) {
      let e = (O(r) ?? r).replace(/\s+/g, ``),
        t = e.match(/^([0-9]+),([0-9]+)p$/);
      if (t) return i ? `print lines ${t[1]}-${t[2]} from ${i}` : `print lines ${t[1]}-${t[2]}`;
      let n = e.match(/^([0-9]+)p$/);
      if (n) return i ? `print line ${n[1]} from ${i}` : `print line ${n[1]}`;
    }
    return i ? `run sed on ${i}` : `run sed transform`;
  }
  if (t === `printf` || t === `echo`) return `print text`;
  if (t === `cp` || t === `mv`) {
    let n = M(e, 1, [`-t`, `--target-directory`, `-S`, `--suffix`]),
      r = n[0],
      i = n[1],
      a = t === `cp` ? `copy` : `move`;
    return r && i ? `${a} ${r} to ${i}` : r ? `${a} ${r}` : `${a} files`;
  }
  if (t === `rm`) {
    let t = N(e, 1);
    return t ? `remove ${t}` : `remove files`;
  }
  if (t === `mkdir`) {
    let t = N(e, 1);
    return t ? `create folder ${t}` : `create folder`;
  }
  if (t === `touch`) {
    let t = N(e, 1);
    return t ? `create file ${t}` : `create file`;
  }
  if (t === `curl` || t === `wget`) {
    let t = e.find((e) => /^https?:\/\//i.test(e));
    return t ? `fetch ${t}` : `fetch url`;
  }
  if (t === `npm` || t === `pnpm` || t === `yarn` || t === `bun`) {
    let n = M(e, 1, [`--prefix`, `-C`, `--cwd`, `--config`]),
      r = n[0] ?? `command`;
    return (
      {
        install: `install dependencies`,
        test: `run tests`,
        build: `run build`,
        start: `start app`,
        lint: `run lint`,
        run: n[1] ? `run ${n[1]}` : `run script`,
      }[r] ?? `run ${t} ${r}`
    );
  }
  if (t === `node` || t === `python` || t === `python3` || t === `ruby` || t === `php`) {
    if (e.slice(1).find((e) => e.startsWith(`<<`))) return `run ${t} inline script (heredoc)`;
    if (
      (t === `node`
        ? j(e, [`-e`, `--eval`])
        : t === `python` || t === `python3`
          ? j(e, [`-c`])
          : void 0) !== void 0
    )
      return `run ${t} inline script`;
    let n = N(e, 1, t === `node` ? [`-e`, `--eval`, `-m`] : [`-c`, `-e`, `--eval`, `-m`]);
    return n
      ? t === `node`
        ? `${e.includes(`--check`) || e.includes(`-c`) ? `check js syntax for` : `run node script`} ${n}`
        : `run ${t} ${n}`
      : `run ${t}`;
  }
  if (t === `openclaw`) {
    let t = N(e, 1);
    return t ? `run openclaw ${t}` : `run openclaw`;
  }
  let n = N(e, 1);
  return !n || n.length > 48
    ? `run ${t}`
    : /^[A-Za-z0-9._/-]+$/.test(n)
      ? `run ${t} ${n}`
      : `run ${t}`;
}
function ot(e) {
  let t = e.trim();
  return !t || e.length > 120 || /[\r\n`]/u.test(e) || /^Bash failed:/iu.test(t) || st(t);
}
function st(e) {
  return e.split(/(?:\||->)/u).some((e) => yt.test(e.trim()));
}
function ct(e) {
  let t = Je(e);
  return t.length > 1
    ? `${U(P(k(t[0])))} -> ${U(P(k(t[t.length - 1])))}${t.length > 2 ? ` (+${t.length - 2} steps)` : ``}`
    : U(P(k(e)));
}
function lt(e) {
  let t = [];
  return (
    F(e, (n, r) => {
      if (n !== `<` || e[r - 1] === `<` || e[r + 1] !== `<` || e[r + 2] === `<`) return !0;
      let i = e[r + 2] === `-`,
        a = ut(e, r + (i ? 3 : 2));
      return (a && t.push({ value: a, stripLeadingTabs: i }), !0);
    }),
    t
  );
}
function ut(e, t) {
  let n = t;
  for (; /\s/u.test(e[n] ?? ``);) n += 1;
  let r = ``,
    i;
  for (let t = n; t < e.length; t += 1) {
    let n = e[t] ?? ``;
    if (i) {
      if (n === i) {
        i = void 0;
        continue;
      }
      if (i === `"` && n === `\\` && t + 1 < e.length) {
        ((t += 1), (r += e[t] ?? ``));
        continue;
      }
      r += n;
      continue;
    }
    if (/[\s;&|<>]/u.test(n)) break;
    if (n === `'` || n === `"`) {
      i = n;
      continue;
    }
    if (n === `\\` && t + 1 < e.length) {
      ((t += 1), (r += e[t] ?? ``));
      continue;
    }
    r += n;
  }
  return r || void 0;
}
function dt(e) {
  if (
    !e.includes(`
`)
  )
    return;
  let t = e.split(/\r?\n/u),
    n = [],
    r = !1;
  for (let e = 0; e < t.length; e += 1) {
    let i = t[e] ?? ``;
    n.push(i);
    let a = lt(i);
    if (a.length !== 0) {
      r = !0;
      for (let n of a)
        for (
          e += 1;
          e < t.length &&
          (n.stripLeadingTabs ? (t[e] ?? ``).replace(/^\t+/u, ``) : (t[e] ?? ``)) !== n.value;
        )
          e += 1;
    }
  }
  if (r)
    return n
      .map((e) => e.trim())
      .filter(Boolean)
      .join(`; `);
}
function ft(e) {
  return e.replace(/\\/g, `/`).replace(/\/+$/g, ``);
}
function pt(e) {
  let t = ft(e).split(`/`).filter(Boolean);
  if (t.length !== 0) {
    for (let e = 0; e < t.length; e += 1) {
      let n = t[e];
      if (n) {
        if (n === `.openclaw` && t[e + 1] === `workspace`) return `agent`;
        if (n === `.openclaw` && t[e + 1] === `sandboxes`) return `sandbox`;
        if (
          (/[-_]workspace$/i.test(n) && n.toLowerCase() !== `workspace`) ||
          /^workspace[-_]/i.test(n)
        )
          return `agent`;
      }
    }
    if (t.includes(`Projects`) || t.includes(`projects`)) return `repo`;
    if (t.at(-1)?.toLowerCase() === `workspace`) return `workspace`;
  }
}
function mt(e) {
  let t = pt(e);
  if (t !== `sandbox`) return t ? `(${t})` : `(in ${e})`;
}
function ht(e) {
  let { command: t, chdirPath: n } = Qe(e);
  if (!t) return n ? { text: ``, chdirPath: n } : void 0;
  let r = qe(dt(t) ?? t);
  if (r.length === 0) return;
  let i = r.map((e) => ct(e)),
    a = i.length === 1 ? i.at(0) : i.join(` → `);
  if (a) return { text: a, chdirPath: n, allGeneric: i.every((e) => gt(e)) };
}
function gt(e) {
  return e === `run command` ? !0 : e.startsWith(`run `) ? !bt.some((t) => e.startsWith(t)) : !1;
}
function _t(e, t = 120) {
  let n = d(
    e
      .replace(/\s*\n\s*/g, ` `)
      .replace(/\s{2,}/g, ` `)
      .trim(),
  );
  if (n.length <= t) return n;
  let r = Math.floor((t - 1) / 2);
  return `${u(n, 0, r)}…${u(n, -(t - 1 - r))}`;
}
function vt(e, t) {
  let n = l(e);
  if (!n) return;
  let r = typeof n.command == `string` ? n.command.trim() : void 0;
  if (!r) return;
  let i = n.host === `node` && typeof n.node == `string` && n.node.trim() ? n.node.trim() : void 0,
    a = Ve(r),
    o = _t(a),
    s = typeof n.workdir == `string` ? n.workdir : typeof n.cwd == `string` ? n.cwd : void 0,
    c = i ? ` · node: ${i}` : ``;
  if (Ke(a)) {
    let e = s?.trim() ? mt(s.trim()) : void 0;
    return `${e ? `${o} ${e}` : o}${c}`;
  }
  let u = ht(a) ?? ht(r),
    d = u?.text || `run command`,
    f = s?.trim() || u?.chdirPath || void 0,
    m = f ? mt(f) : void 0;
  if (u?.allGeneric !== !1 && gt(d)) return `${m ? `${o} ${m}` : o}${c}`;
  let h = m ? `${d} ${m}` : d;
  return t?.detailMode !== `explain` && o && o !== h && o !== d ? `${h}${c} · ${p(o)}` : `${h}${c}`;
}
var yt, bt;
function xt() {
  return (xt = e(() => {
    (f(),
      at(),
      (yt = /^search\s+(?:["']|text(?:\s+in(?:\s|$)|$))/iu),
      (bt =
        `check git.view git.show git.list git.switch git.create git.pull git.push git.fetch git.merge git.rebase git.stage git.restore git.reset git.stash git.search .find files.list files.show first.show last.print line.print text.copy .move .remove .create folder.create file.fetch http.install dependencies.run tests.run build.start app.run lint.run openclaw.run node script.run node .run python.run ruby.run php.run sed.run git .run npm .run pnpm .run yarn .run bun .check js syntax`.split(
          `.`,
        )));
  }))();
}
function St(e) {
  return (e ?? `tool`).trim();
}
function Ct(e) {
  let t = e.replace(/_/g, ` `).trim();
  if (!t) return `Tool`;
  let n = [];
  for (let e of t.split(/\s+/))
    n.push(
      e.length <= 2 && e.toUpperCase() === e ? e : `${e.at(0)?.toUpperCase() ?? ``}${e.slice(1)}`,
    );
  return n.join(` `);
}
function wt(e) {
  let t = s(e);
  if (t) return t.replace(/_/g, ` `);
}
function Tt(e) {
  if (!e || typeof e != `object`) return;
  let t = e.action;
  if (typeof t == `string`) return s(t) || void 0;
}
function Et(e) {
  return Kt({
    toolKey: e.toolKey,
    args: e.args,
    meta: e.meta,
    action: Tt(e.args),
    spec: e.spec,
    fallbackDetailKeys: e.fallbackDetailKeys,
    detailMode: e.detailMode,
    toolDetailMode: e.toolDetailMode,
    detailCoerce: e.detailCoerce,
    detailMaxEntries: e.detailMaxEntries,
    detailFormatKey: e.detailFormatKey,
  });
}
function W(e, t = {}) {
  if (e != null) {
    if (typeof e == `string`) {
      let t = e.trim();
      if (!t) return;
      let n = s(t.split(/\r?\n/)[0]) ?? ``;
      if (!n) return;
      let r = d(n);
      return r.length > 160 ? `${u(r, 0, 79)}…${u(r, -80)}` : r;
    }
    if (typeof e == `boolean`) return !e && !t.includeFalsy ? void 0 : e ? `true` : `false`;
    if (typeof e == `number`)
      return !Number.isFinite(e) || (e === 0 && !t.includeFalsy) ? void 0 : String(e);
    if (Array.isArray(e)) {
      let n = [],
        r = 0;
      for (let i of e) {
        let e = W(i, t);
        e && ((r += 1), n.length < 3 && n.push(e));
      }
      if (r === 0) return;
      let i = n.join(`, `);
      return r > 3 ? `${i}…` : i;
    }
  }
}
function Dt(e, t) {
  if (!e || typeof e != `object`) return;
  let n = e;
  for (let e of t.split(`.`)) {
    if (!e || !n || typeof n != `object`) return;
    n = n[e];
  }
  return n;
}
function Ot(e) {
  let t = l(e);
  if (t)
    for (let e of [t.path, t.file_path, t.filePath]) {
      if (typeof e != `string`) continue;
      let t = e.trim();
      if (t) return t;
    }
}
function kt(e) {
  let t = l(e);
  if (!t) return;
  let n = Ot(t);
  if (!n) return;
  let r = typeof t.offset == `number` && Number.isFinite(t.offset) ? Math.floor(t.offset) : void 0,
    i = typeof t.limit == `number` && Number.isFinite(t.limit) ? Math.floor(t.limit) : void 0,
    a = r === void 0 ? void 0 : Math.max(1, r),
    o = i === void 0 ? void 0 : Math.max(1, i);
  return a !== void 0 && o !== void 0
    ? `${o === 1 ? `line` : `lines`} ${a}-${a + o - 1} from ${n}`
    : a === void 0
      ? o === void 0
        ? `from ${n}`
        : `first ${o} ${o === 1 ? `line` : `lines`} of ${n}`
      : `from line ${a} in ${n}`;
}
function At(e, t) {
  let n = l(t);
  if (!n) return;
  let r = Ot(n) ?? s(n.url);
  if (!r) return;
  if (e === `attach`) return `from ${r}`;
  let i = e === `edit` ? `in` : `to`,
    a =
      typeof n.content == `string`
        ? n.content
        : typeof n.newText == `string`
          ? n.newText
          : typeof n.new_string == `string`
            ? n.new_string
            : void 0;
  return a && a.length > 0 ? `${i} ${r} (${a.length} chars)` : `${i} ${r}`;
}
function jt(e) {
  let t = l(e);
  if (!t) return;
  let n = Mt(t),
    r =
      typeof t.count == `number` && Number.isFinite(t.count) && t.count > 0
        ? Math.floor(t.count)
        : typeof t.max_results == `number` && Number.isFinite(t.max_results) && t.max_results > 0
          ? Math.floor(t.max_results)
          : typeof t.num_results == `number` && Number.isFinite(t.num_results) && t.num_results > 0
            ? Math.floor(t.num_results)
            : typeof t.limit == `number` && Number.isFinite(t.limit) && t.limit > 0
              ? Math.floor(t.limit)
              : typeof t.top_k == `number` && Number.isFinite(t.top_k) && t.top_k > 0
                ? Math.floor(t.top_k)
                : void 0;
  if (n.length === 0) return;
  let i = n.slice(0, 3).map((e) => `"${e}"`),
    a = n.length > i.length ? `${i.join(`, `)}…` : i.join(`, `);
  return r === void 0 ? `for ${a}` : `for ${a} (top ${r})`;
}
function Mt(e) {
  let t = [],
    n = new Set(),
    r = (e) => {
      let r = s(e);
      !r || n.has(r) || (n.add(r), t.push(r));
    };
  (r(e.query), r(e.q), r(e.search), r(e.input), r(e.objective));
  for (let t of [`search_query`, `image_query`, `queries`, `search_queries`]) {
    let n = e[t];
    if (Array.isArray(n))
      for (let e of n) {
        if (typeof e == `string`) {
          r(e);
          continue;
        }
        let t = l(e);
        t && (r(t.query), r(t.q), r(t.search));
      }
  }
  return t;
}
function Nt(e) {
  let t = e.match(/openclaw\.tools\.call\s*\(\s*/s);
  if (!t || t.index === void 0) return;
  let n = e.slice(t.index + t[0].length),
    r = n.match(/^("[^"]{1,240}"|'[^']{1,240}'|[^,)\s]{1,240})/s);
  if (!r?.[1]) return;
  let i = n.slice(r[0].length),
    a = i.indexOf(`,`);
  if (a < 0) return { target: r[1] };
  let o = i.slice(a + 1);
  return { target: r[1], args: o };
}
function Pt(e) {
  let t = s(e);
  if (!t) return;
  let n = t.match(/^(?:openclaw|mcp|client):[^:]+:(.+)$/s);
  return s(n?.[1]) ?? t;
}
function Ft(e) {
  let t = new Map();
  for (let n of e.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?openclaw\.tools\.describe\s*\(\s*("[^"]{1,240}"|'[^']{1,240}')\s*(?:,|\))/gs,
  )) {
    let e = n[1],
      r = G(n[2]);
    e && r && t.set(e, r);
  }
  return t;
}
function It(e, t) {
  let n = s(t);
  if (!n) return;
  let r = n.match(/^([A-Za-z_$][\w$]*)\.id\b/s);
  if (r?.[1]) {
    let t = Ft(e).get(r[1]);
    if (t) return t;
  }
  return G(n);
}
function G(e) {
  let t = s(e);
  if (!t) return;
  let n = t.match(/^[\s]*["']([^"']{1,160})["'][\s]*$/s);
  if (n?.[1]) return s(n[1]);
  if (t.match(/\.id\b/)) return s(t.replace(/\.id\b.*/s, ``));
  let r = t.match(/name\s*:\s*["']([^"']{1,120})["']/s);
  if (r?.[1]) return s(r[1]);
  let i = t.replace(/\s+/g, ` `).trim();
  return i.length <= 80 ? i : void 0;
}
function Lt(e) {
  let t = Rt(e);
  if (!t) return;
  let n = {};
  for (let e of t.matchAll(
    /(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|true|false|null|[+-]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:e[+-]?\d+)?)/gi,
  )) {
    let t = e[1],
      r = e[2];
    !t || r === void 0 || (n[t] = zt(r));
  }
  return Object.keys(n).length > 0 ? n : void 0;
}
function Rt(e) {
  let t = s(e);
  if (!t) return;
  let n = t.indexOf(`{`);
  if (n < 0) return;
  let r = 0,
    i,
    a = !1;
  for (let e = n; e < t.length; e += 1) {
    let o = t[e];
    if (a) {
      a = !1;
      continue;
    }
    if (o === `\\`) {
      a = !0;
      continue;
    }
    if (i) {
      o === i && (i = void 0);
      continue;
    }
    if (o === `"` || o === `'`) {
      i = o;
      continue;
    }
    if (o === `{`) {
      r += 1;
      continue;
    }
    if (o === `}` && (--r, r === 0)) return t.slice(n, e + 1);
  }
}
function zt(e) {
  if (e === `true`) return !0;
  if (e === `false`) return !1;
  if (e === `null`) return null;
  let t = o(e);
  if (t !== void 0) return t;
  let n = e[0],
    r = e.slice(1, -1);
  if (n === `"`)
    try {
      return JSON.parse(e);
    } catch {
      return r;
    }
  return r.replace(/\\'/g, `'`).replace(/\\\\/g, `\\`);
}
function Bt(e) {
  let t = s(e)
    ?.replace(/[);\s]+$/g, ``)
    .trim();
  if (!t) return;
  let n = t.match(/query\s*:\s*["']([^"']{1,80})["']/s);
  if (n?.[1]) return `query ` + n[1].trim();
  let r = t.match(/action\s*:\s*["']([^"']{1,80})["']/s);
  if (r?.[1]) return s(r[1]);
  let i = t.match(/command\s*:\s*["']([^"'\n]{1,120})["']/s);
  if (i?.[1]) return s(i[1]);
  let a = t.match(/sessionId\s*:\s*["']([^"']{1,80})["']/s);
  if (a?.[1]) return `session ` + a[1].trim();
  let o = t.match(/id\s*:\s*["']([^"']{1,80})["']/s);
  if (o?.[1]) return o[1].trim();
}
function Vt(e) {
  let t = l(e);
  if (!t || typeof t.code != `string`) return;
  let n = t.code,
    r = Nt(n);
  if (r) {
    let e = It(n, r.target);
    return e
      ? {
          toolName: e,
          displayToolName: Pt(e),
          displayArgs: Lt(r.args),
          detail: Bt(r.args),
          bridgeVerb: `call`,
        }
      : { toolName: `tool_search_code`, detail: `call selected tool`, bridgeVerb: `call` };
  }
  let i = n.match(/openclaw\.tools\.describe\s*\(\s*([^)]+?)\s*(?:,|\))/s);
  if (i) {
    let e = G(i[1]);
    return e
      ? { toolName: e, detail: `describe via tool search`, bridgeVerb: `describe` }
      : { toolName: `tool_search_code`, detail: `describe selected tool`, bridgeVerb: `describe` };
  }
  let a = n.match(/openclaw\.tools\.search\s*\(\s*([^)]+?)\s*(?:,|\))/s);
  if (a) {
    let e = G(a[1]);
    return {
      toolName: `tool_search_code`,
      detail: e ? `search ` + e : `search tools`,
      bridgeVerb: `search`,
    };
  }
  return { toolName: `tool_search_code`, detail: `run bridge code` };
}
function Ht(e) {
  return Vt(e)?.detail;
}
function Ut(e) {
  let t = l(e);
  if (!t) return;
  let n = s(t.url);
  if (!n) return;
  let r = s(t.extractMode),
    i =
      typeof t.maxChars == `number` && Number.isFinite(t.maxChars) && t.maxChars > 0
        ? Math.floor(t.maxChars)
        : void 0,
    a = ``;
  return (
    r && (a = `mode ${r}`),
    i !== void 0 && (a = a ? `${a}, max ${i} chars` : `max ${i} chars`),
    a ? `from ${n} (${a})` : `from ${n}`
  );
}
function Wt(e, t) {
  if (!(!e || !t)) return e.actions?.[t] ?? void 0;
}
function Gt(e, t, n) {
  if (n.mode === `first`) {
    for (let r of t) {
      let t = W(Dt(e, r), n.coerce);
      if (t) return t;
    }
    return;
  }
  let r = [];
  for (let i of t) {
    let t = W(Dt(e, i), n.coerce);
    t && r.push({ label: n.formatKey ? n.formatKey(i) : i, value: t });
  }
  if (r.length === 0) return;
  if (r.length === 1) return r.at(0)?.value;
  let i = new Set(),
    a = [];
  for (let e of r) {
    let t = `${e.label}:${e.value}`;
    i.has(t) || (i.add(t), a.push(e));
  }
  if (a.length === 0) return;
  let o = n.maxEntries ?? 8,
    s = [];
  for (let e = 0; e < a.length && e < o; e += 1) {
    let t = a[e];
    t && s.push(`${t.label} ${t.value}`);
  }
  return s.join(` · `);
}
function Kt(e) {
  let t = Wt(e.spec, e.action),
    n =
      e.toolKey === `web_search`
        ? `search`
        : e.toolKey === `web_fetch`
          ? `fetch`
          : e.toolKey.replace(/_/g, ` `).replace(/\./g, ` `),
    r = wt(t?.label ?? e.action ?? n),
    i;
  ((e.toolKey === `exec` || e.toolKey === `bash`) &&
    (i = vt(e.args, { detailMode: e.toolDetailMode })),
    !i && e.toolKey === `read` && (i = kt(e.args)),
    !i &&
      (e.toolKey === `write` || e.toolKey === `edit` || e.toolKey === `attach`) &&
      (i = At(e.toolKey, e.args)),
    !i && e.toolKey === `web_search` && (i = jt(e.args)),
    !i && e.toolKey === `web_fetch` && (i = Ut(e.args)),
    !i && e.toolKey === `tool_search_code` && (i = Ht(e.args)));
  let a = t?.detailKeys ?? e.spec?.detailKeys ?? e.fallbackDetailKeys ?? [];
  return (
    !i &&
      a.length > 0 &&
      (i = Gt(e.args, a, {
        mode: e.detailMode,
        coerce: e.detailCoerce,
        maxEntries: e.detailMaxEntries,
        formatKey: e.detailFormatKey,
      })),
    !i && e.meta && (i = e.meta),
    { verb: r, detail: i }
  );
}
function qt(e, t = {}) {
  if (!e) return;
  let n = e.includes(` · `)
    ? (() => {
        let t = [];
        for (let n of e.split(` · `)) {
          let e = n.trim();
          e && t.push(e);
        }
        return t.join(`, `);
      })()
    : e;
  if (n) return t.prefixWithWith ? `with ${n}` : n;
}
function Jt() {
  return (Jt = e(() => {
    (c(), f(), xt());
  }))();
}
function Yt(e) {
  let n = t(e);
  if (n) {
    if (n === `interrupt` || n === `interrupts` || n === `abort`) return `interrupt`;
    if (n === `steer` || n === `steering`) return `steer`;
    if (n === `followup` || n === `follow-ups` || n === `followups`) return `followup`;
    if (n === `collect` || n === `coalesce`) return `collect`;
  }
}
function Xt() {
  return (Xt = e(() => {}))();
}
function Zt(e) {
  let n = t(e);
  if (!n) return;
  let r = n.replace(/[\s_-]+/g, ``);
  if (r === `adaptive` || r === `auto`) return `adaptive`;
  if (r === `max`) return `max`;
  if (r === `ultra`) return `ultra`;
  if (r === `xhigh` || r === `extrahigh`) return `xhigh`;
  if ([`off`, `none`].includes(n)) return `off`;
  if ([`on`, `enable`, `enabled`].includes(n)) return `low`;
  if ([`min`, `minimal`].includes(n)) return `minimal`;
  if ([`low`, `thinkhard`, `think-hard`, `think_hard`].includes(n)) return `low`;
  if ([`mid`, `med`, `medium`, `thinkharder`, `think-harder`, `harder`].includes(n))
    return `medium`;
  if ([`high`, `ultrathink`, `think-hard`, `thinkhardest`, `highest`].includes(n)) return `high`;
  if ([`think`].includes(n)) return `minimal`;
}
function Qt(e) {
  return e.catalog?.find((t) => t.provider === e.provider && t.id === e.model)?.reasoning
    ? `low`
    : `off`;
}
var $t, K;
function q() {
  return (q = e(() => {
    (($t = [`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `adaptive`, `max`, `ultra`]),
      $t.join(`|`),
      (K = [`off`, `minimal`, `low`, `medium`, `high`]));
  }))();
}
function J(e) {
  if (e == null) return;
  let t;
  return (
    (t =
      typeof e == `string`
        ? (s(e) ?? ``)
        : typeof e == `number` || typeof e == `boolean` || typeof e == `bigint`
          ? (s(String(e)) ?? ``)
          : typeof e == `symbol` || typeof e == `function`
            ? (s(e.toString()) ?? ``)
            : JSON.stringify(e)),
    t || void 0
  );
}
function Y(e, n) {
  let r = t(J(e.action)),
    i = J(e.path),
    a = J(e.value);
  return r ? n.formatKnownAction(r, i) || en(r, { path: i, value: a }) : void 0;
}
function en(e, t) {
  return e === `unset`
    ? t.path
      ? `${e} ${t.path}`
      : e
    : e === `set` && t.path
      ? t.value
        ? `${e} ${t.path}=${t.value}`
        : `${e} ${t.path}`
      : e;
}
var tn, nn, rn, an, on, sn, X;
function cn() {
  return (cn = e(() => {
    ((tn = (e) =>
      Y(e, {
        formatKnownAction: (e, t) => {
          if (e === `show` || e === `get`) return t ? `${e} ${t}` : e;
        },
      })),
      (nn = (e) =>
        Y(e, {
          formatKnownAction: (e, t) => {
            if (e === `show` || e === `get`) return t ? `${e} ${t}` : e;
          },
        })),
      (rn = (e) =>
        Y(e, {
          formatKnownAction: (e, t) => {
            if (e === `list`) return `list`;
            if (e === `show` || e === `get` || e === `enable` || e === `disable`)
              return t ? `${e} ${t}` : e;
          },
        })),
      (an = (e) =>
        Y(e, {
          formatKnownAction: (e) => {
            if (e === `show` || e === `reset`) return e;
          },
        })),
      (on = (e) => {
        let t = J(e.mode),
          n = J(e.debounce),
          r = J(e.cap),
          i = J(e.drop),
          a = [];
        return (
          t && a.push(t),
          n && a.push(`debounce:${n}`),
          r && a.push(`cap:${r}`),
          i && a.push(`drop:${i}`),
          a.length > 0 ? a.join(` `) : void 0
        );
      }),
      (sn = (e) => {
        let t = J(e.host),
          n = J(e.security),
          r = J(e.ask),
          i = J(e.node),
          a = [];
        return (
          t && a.push(`host=${t}`),
          n && a.push(`security=${n}`),
          r && a.push(`ask=${r}`),
          i && a.push(`node=${i}`),
          a.length > 0 ? a.join(` `) : void 0
        );
      }),
      (X = { config: tn, mcp: nn, plugins: rn, debug: an, queue: on, exec: sn }));
  }))();
}
function ln(e) {
  let t = e.trim(),
    n = t.toLowerCase();
  return n === `list` || n === `status` || /\s/u.test(t);
}
function un(e) {
  let t = (e.textAliases ?? (e.textAlias ? [e.textAlias] : []))
      .map((e) => e.trim())
      .filter(Boolean),
    r = e.scope ?? (e.nativeName ? (t.length ? `both` : `native`) : `text`),
    i = e.acceptsArgs ?? !!e.args?.length,
    a = e.argsParsing ?? (e.args?.length ? `positional` : `none`);
  return {
    key: e.key,
    nativeName: e.nativeName,
    nativeAliases: e.nativeAliases ? n(e.nativeAliases) : void 0,
    nativeProviders: e.nativeProviders ? n(e.nativeProviders) : void 0,
    description: e.description,
    acceptsArgs: i,
    args: e.args,
    argsParsing: a,
    formatArgs: e.formatArgs,
    argsMenu: e.argsMenu,
    textAliases: t,
    scope: r,
    category: e.category,
    tier: e.tier,
  };
}
function Z(e, n, ...r) {
  let i = e.find((e) => e.key === n);
  if (!i) throw Error(`registerAlias: unknown command key: ${n}`);
  let a = new Set(i.textAliases.map((e) => e.toLowerCase()));
  for (let e of r) {
    let n = e.trim(),
      r = t(n);
    !r || a.has(r) || (a.add(r), i.textAliases.push(n));
  }
}
function dn(e) {
  let n = new Set(),
    r = new Set(),
    i = new Set();
  for (let a of e) {
    if (n.has(a.key)) throw Error(`Duplicate command key: ${a.key}`);
    n.add(a.key);
    let e = a.nativeName?.trim();
    if (a.scope === `text`) {
      if (e) throw Error(`Text-only command has native name: ${a.key}`);
      if (a.nativeAliases?.length) throw Error(`Text-only command has native aliases: ${a.key}`);
      if (a.textAliases.length === 0) throw Error(`Text-only command missing text alias: ${a.key}`);
    } else if (e)
      for (let n of [e, ...(a.nativeAliases ?? [])]) {
        let e = t(n) ?? ``;
        if (r.has(e)) throw Error(`Duplicate native command: ${n}`);
        r.add(e);
      }
    else throw Error(`Native command missing native name: ${a.key}`);
    if (a.scope === `native` && a.textAliases.length > 0)
      throw Error(`Native-only command has text aliases: ${a.key}`);
    for (let e of a.textAliases) {
      if (!e.startsWith(`/`)) throw Error(`Command alias missing leading '/': ${e}`);
      let n = t(e) ?? ``;
      if (i.has(n)) throw Error(`Duplicate command alias: ${e}`);
      i.add(n);
    }
  }
}
function Q(...e) {
  return e;
}
function $(e, t, n = {}) {
  return { name: e, description: t, type: `string`, ...n };
}
function fn([e, t, n, r, i = {}]) {
  let { nativeName: a = e, textAliases: o, ...s } = i;
  return un({
    key: e,
    nativeName: a === !1 ? void 0 : a,
    description: t,
    textAlias: o ? void 0 : `/${e}`,
    textAliases: o,
    category: n,
    tier: r,
    ...s,
  });
}
function pn(e = {}) {
  let t = e.listThinkingLevels ?? (() => mn),
    n = (e, n, r, i) => [`default`, ...t(e, n, r, i).filter((e) => e !== "default")],
    r = [
      Q(`help`, `Show available commands.`, `status`, `essential`),
      Q(`commands`, `List all slash commands.`, `status`, `power`),
      Q(`tools`, `List available runtime tools.`, `status`, `standard`, {
        args: [$(`mode`, `compact or verbose`, { choices: [`compact`, `verbose`] })],
        argsMenu: `auto`,
      }),
      Q(`skill`, `Run a skill by name.`, `tools`, `standard`, {
        args: [
          $(`name`, `Skill name`, { required: !0 }),
          $(`input`, `Skill input`, { captureRemaining: !0 }),
        ],
      }),
      Q(`learn`, `Draft a reusable skill from recent work or named sources.`, `tools`, `standard`, {
        args: [
          $(`request`, `Sources and requirements for the skill draft`, { captureRemaining: !0 }),
        ],
      }),
      Q(
        `loop`,
        `Loop a prompt: /loop [interval] <prompt> | /loop status | /loop stop [name]`,
        `tools`,
        `standard`,
        {
          args: [
            $(`spec`, `[interval] prompt, or status/stop`, { required: !1, captureRemaining: !0 }),
          ],
        },
      ),
      Q(`status`, `Show current status.`, `status`, `essential`, { acceptsArgs: !0 }),
      Q(`goal`, `Show or control the current goal.`, `status`, `standard`, {
        args: [
          $(`action`, `status, start, edit, pause, resume, complete, block, clear`, {
            choices: [`status`, `start`, `edit`, `pause`, `resume`, `complete`, `block`, `clear`],
          }),
          $(`text`, `Goal objective or note`, { captureRemaining: !0 }),
        ],
      }),
      Q(
        `diagnostics`,
        `Explain Gateway diagnostics and Codex feedback upload options.`,
        `status`,
        `standard`,
        { args: [$(`note`, `Optional note for Codex feedback upload`, { captureRemaining: !0 })] },
      ),
      Q(`login`, `Pair Codex login.`, `management`, `standard`, {
        nativeProviders: [`discord`, `slack`, `telegram`],
        args: [$(`provider`, `Provider to pair`, { choices: [`codex`, `openai`] })],
      }),
      Q(`openclaw`, `Run the OpenClaw setup and repair helper.`, `management`, `essential`, {
        nativeName: !1,
        acceptsArgs: !0,
      }),
      Q(`tasks`, `List background tasks for this session.`, `status`, `standard`),
      Q(`allowlist`, `List/add/remove allowlist entries.`, `management`, `power`, {
        nativeName: !1,
        acceptsArgs: !0,
      }),
      Q(`approve`, `Approve or deny exec requests.`, `management`, `power`, { acceptsArgs: !0 }),
      Q(`context`, `Explain how context is built and used.`, `status`, `standard`, {
        acceptsArgs: !0,
      }),
      Q(
        `btw`,
        `Ask a side question without changing future session context.`,
        `tools`,
        `standard`,
        { nativeAliases: [`side`], textAliases: [`/btw`, `/side`], acceptsArgs: !0 },
      ),
      Q(
        `export-session`,
        `Export current session to an owner-only HTML file in the workspace.`,
        `status`,
        `essential`,
        {
          textAliases: [`/export-session`, `/export`],
          args: [$(`path`, `Output path inside workspace (default: workspace)`, { required: !1 })],
        },
      ),
      Q(
        `export-trajectory`,
        `Export a JSONL trajectory bundle for the active session.`,
        `status`,
        `essential`,
        {
          textAliases: [`/export-trajectory`, `/trajectory`],
          args: [$(`path`, `Output directory (default: workspace)`, { required: !1 })],
        },
      ),
      Q(`tts`, `Control text-to-speech (TTS).`, `media`, `standard`, {
        args: [
          $(`action`, `TTS action`, {
            choices: [
              { value: `on`, label: `On` },
              { value: `off`, label: `Off` },
              { value: `status`, label: `Status` },
              { value: `provider`, label: `Provider` },
              { value: `limit`, label: `Limit` },
              { value: `summary`, label: `Summary` },
              { value: `audio`, label: `Audio` },
              { value: `help`, label: `Help` },
            ],
          }),
          $(`value`, `Provider, limit, or text`, { captureRemaining: !0 }),
        ],
        argsMenu: {
          arg: `action`,
          title: `TTS Actions:
• On – Enable TTS for responses
• Off – Disable TTS
• Status – Show current settings
• Provider – Show or set the voice provider
• Limit – Set max characters for TTS
• Summary – Toggle AI summary for long texts
• Audio – Generate TTS from custom text
• Help – Show usage guide`,
        },
      }),
      Q(`whoami`, `Show your sender id.`, `status`, `power`),
      Q(
        `session`,
        `Manage session-level settings (for example /session idle).`,
        `session`,
        `power`,
        {
          args: [
            $(`action`, `idle | max-age`, { choices: [`idle`, `max-age`] }),
            $(`value`, `Duration (24h, 90m) or off`, { captureRemaining: !0 }),
          ],
          argsMenu: `auto`,
        },
      ),
      Q(`subagents`, `Inspect subagent runs for this session.`, `management`, `standard`, {
        args: [
          $(`action`, `list | log | info`, { choices: [`list`, `log`, `info`] }),
          $(`target`, `Run id, index, or session key`),
          $(`value`, `Additional input (limit/message)`, { captureRemaining: !0 }),
        ],
        argsMenu: `auto`,
      }),
      Q(`acp`, `Manage ACP sessions and runtime options.`, `management`, `power`, {
        args: [
          $(`action`, `Action to run`, {
            preferAutocomplete: !0,
            choices: [
              `spawn`,
              `cancel`,
              `steer`,
              `close`,
              `sessions`,
              `status`,
              `set-mode`,
              `set`,
              `cwd`,
              `permissions`,
              `timeout`,
              `model`,
              `reset-options`,
              `doctor`,
              `install`,
              `help`,
            ],
          }),
          $(`value`, `Action arguments`, { captureRemaining: !0 }),
        ],
        argsMenu: `auto`,
      }),
      Q(
        `focus`,
        `Bind this thread (Discord) or topic/conversation (Telegram) to a session target.`,
        `management`,
        `power`,
        {
          args: [
            $(`target`, `Subagent label/index or session key/id/label`, { captureRemaining: !0 }),
          ],
        },
      ),
      Q(
        `unfocus`,
        `Remove the current thread (Discord) or topic/conversation (Telegram) binding.`,
        `management`,
        `power`,
      ),
      Q(`agents`, `List thread-bound agents for this session.`, `management`, `standard`),
      Q(`steer`, `Send guidance to the active run in this session.`, `management`, `standard`, {
        args: [$(`message`, `Steering message`, { captureRemaining: !0 })],
      }),
      Q(`config`, `Show or set config values.`, `management`, `power`, {
        args: [
          $(`action`, `show | get | set | unset`, { choices: [`show`, `get`, `set`, `unset`] }),
          $(`path`, `Config path`),
          $(`value`, `Value for set`, { captureRemaining: !0 }),
        ],
        argsParsing: `none`,
        formatArgs: X.config,
      }),
      Q(`mcp`, `Show or set OpenClaw MCP servers.`, `management`, `power`, {
        args: [
          $(`action`, `show | get | set | unset`, { choices: [`show`, `get`, `set`, `unset`] }),
          $(`path`, `MCP server name`),
          $(`value`, `JSON config for set`, { captureRemaining: !0 }),
        ],
        argsParsing: `none`,
        formatArgs: X.mcp,
      }),
      Q(`plugins`, `List, show, enable, or disable plugins.`, `management`, `power`, {
        textAliases: [`/plugins`, `/plugin`],
        args: [
          $(`action`, `list | show | get | enable | disable`, {
            choices: [`list`, `show`, `get`, `enable`, `disable`],
          }),
          $(`path`, `Plugin id or name`),
        ],
        argsParsing: `none`,
        formatArgs: X.plugins,
      }),
      Q(`debug`, `Set runtime debug overrides.`, `management`, `power`, {
        args: [
          $(`action`, `show | reset | set | unset`, { choices: [`show`, `reset`, `set`, `unset`] }),
          $(`path`, `Debug path`),
          $(`value`, `Value for set`, { captureRemaining: !0 }),
        ],
        argsParsing: `none`,
        formatArgs: X.debug,
      }),
      Q(`usage`, `Usage footer or cost summary.`, `options`, `standard`, {
        args: [
          $(`mode`, `off, tokens, full, or cost`, { choices: [`off`, `tokens`, `full`, `cost`] }),
        ],
        argsMenu: `auto`,
      }),
      Q(`stop`, `Stop the current run.`, `session`, `essential`),
      Q(`restart`, `Restart OpenClaw.`, `tools`, `power`),
      Q(`activation`, `Set group activation mode.`, `management`, `power`, {
        args: [$(`mode`, `mention or always`, { choices: [`mention`, `always`] })],
        argsMenu: `auto`,
      }),
      Q(`send`, `Set send policy.`, `management`, `power`, {
        args: [$(`mode`, `on, off, or inherit`, { choices: [`on`, `off`, `inherit`] })],
        argsMenu: `auto`,
      }),
      Q(`reset`, `Reset the current session.`, `session`, `essential`, { acceptsArgs: !0 }),
      Q(`new`, `Start a new session.`, `session`, `essential`, { acceptsArgs: !0 }),
      Q(`name`, `Name or rename the current session.`, `session`, `standard`, {
        args: [$(`title`, `New session name (omit to see a suggestion)`, { captureRemaining: !0 })],
      }),
      Q(`compact`, `Compact the session context.`, `session`, `essential`, {
        args: [$(`instructions`, `Extra compaction instructions`, { captureRemaining: !0 })],
      }),
      Q(`think`, `Set thinking level.`, `options`, `essential`, {
        args: [
          $(`level`, `Thinking level`, {
            choices: ({ provider: e, model: t, catalog: r, agentRuntime: i }) => n(e, t, r, i),
          }),
        ],
        argsMenu: `auto`,
      }),
      Q(`verbose`, `Toggle verbose mode.`, `options`, `standard`, {
        args: [$(`mode`, `on, off, or full`, { choices: [`on`, `off`, `full`] })],
      }),
      Q(`trace`, `Toggle plugin trace lines.`, `options`, `power`, {
        args: [$(`mode`, `on, off, or raw`, { choices: [`on`, `off`, `raw`] })],
        argsMenu: `auto`,
      }),
      Q(`fast`, `Toggle fast mode.`, `options`, `standard`, {
        args: [
          $(`mode`, `on, off, auto, default, or status`, {
            choices: ({ cfg: e, provider: t, model: n }) => [
              `on`,
              `off`,
              {
                value: `auto`,
                label: ee({ fastAutoOnSeconds: h({ cfg: e, provider: t, model: n }) }),
              },
              `default`,
              `status`,
            ],
          }),
        ],
        argsMenu: `auto`,
      }),
      Q(`reasoning`, `Toggle reasoning visibility.`, `options`, `standard`, {
        args: [$(`mode`, `on, off, or stream`, { choices: [`on`, `off`, `stream`] })],
        argsMenu: `auto`,
      }),
      Q(`elevated`, `Toggle elevated mode.`, `options`, `power`, {
        args: [$(`mode`, `on, off, ask, or full`, { choices: [`on`, `off`, `ask`, `full`] })],
        argsMenu: `auto`,
      }),
      Q(`exec`, `Set exec defaults for this session.`, `options`, `power`, {
        args: [
          $(`host`, `sandbox, gateway, or node`, { choices: [`sandbox`, `gateway`, `node`] }),
          $(`security`, `deny, allowlist, or full`, { choices: [`deny`, `allowlist`, `full`] }),
          $(`ask`, `off, on-miss, or always`, { choices: [`off`, `on-miss`, `always`] }),
          $(`node`, `Node id or name`),
        ],
        argsParsing: `none`,
        formatArgs: X.exec,
      }),
      Q(
        `model`,
        `Show or set the model; direct owner/admin selections request a default update.`,
        `options`,
        `essential`,
        { args: [$(`model`, `Model id; add -s to change only this session`)] },
      ),
      Q(`models`, `List model providers/models.`, `options`, `standard`, { acceptsArgs: !0 }),
      Q(`queue`, `Adjust queue settings.`, `options`, `power`, {
        args: [
          $(`mode`, `queue mode`, { choices: [`steer`, `followup`, `collect`, `interrupt`] }),
          $(`debounce`, `debounce duration (e.g. 500ms, 2s)`),
          $(`cap`, `queue cap`, { type: `number` }),
          $(`drop`, `drop policy`, { choices: [`old`, `new`, `summarize`] }),
        ],
        argsParsing: `none`,
        formatArgs: X.queue,
      }),
      Q(`bash`, `Run host shell commands (host-only).`, `tools`, `power`, {
        nativeName: !1,
        args: [$(`command`, `Shell command`, { captureRemaining: !0 })],
      }),
    ].map(fn);
  return (
    Z(r, `whoami`, `/id`),
    Z(r, `think`, `/thinking`, `/t`),
    Z(r, `verbose`, `/v`),
    Z(r, `reasoning`, `/reason`),
    Z(r, `elevated`, `/elev`),
    Z(r, `steer`, `/tell`),
    dn(r),
    r
  );
}
var mn;
function hn() {
  return (hn = e(() => {
    (a(), m(), cn(), q(), (mn = [...K, `xhigh`, `adaptive`, `max`]));
  }))();
}
export {
  ye as C,
  v as S,
  S as _,
  q as a,
  we as b,
  Xt as c,
  qt as d,
  Jt as f,
  Ne as g,
  Be as h,
  K as i,
  Yt as l,
  Et as m,
  hn as n,
  Zt as o,
  St as p,
  ln as r,
  Qt as s,
  pn as t,
  Ct as u,
  Te as v,
  fe as w,
  _ as x,
  Ce as y,
};
//# sourceMappingURL=control-ui-boot-DOOMhK8q.js.map
