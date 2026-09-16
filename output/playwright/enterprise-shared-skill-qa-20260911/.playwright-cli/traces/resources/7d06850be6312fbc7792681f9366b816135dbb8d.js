import { v as n, y as r } from "./control-ui-foundation-CUUNgsy7.js";
import { n as e, t } from "./rolldown-runtime-DkW27tQK.js";
var i,
  a,
  o,
  s,
  c,
  l,
  u,
  d,
  f,
  p,
  m,
  h,
  g,
  _,
  v,
  y,
  b,
  x,
  S,
  C,
  w,
  T,
  E,
  ee,
  D,
  te,
  O,
  k,
  A,
  j,
  M,
  N,
  ne,
  P,
  F,
  I,
  L,
  R,
  z,
  B,
  V,
  H,
  U,
  re,
  W,
  ie,
  G,
  K,
  ae,
  q,
  J,
  oe,
  se,
  ce,
  le,
  ue,
  Y,
  de,
  fe,
  X,
  Z,
  Q,
  pe,
  me,
  $,
  he;
function ge() {
  return (ge = e(() => {
    ((i = Object.freeze({
      p: 57896044618658097711785492504343953926634992332820282019728792003956564819949n,
      n: 7237005577332262213973186563042994240857116359379907606001950938285454250989n,
      h: 8n,
      a: 57896044618658097711785492504343953926634992332820282019728792003956564819948n,
      d: 37095705934669439343138083508754565189542113879843219016388785533085940283555n,
      Gx: 15112221349535400772501151409588531511454012693041857206046113283949847762202n,
      Gy: 46316835694926478169428394003475163141307993866256225615783033603165251855960n,
    })),
      ({ p: a, n: o, Gx: s, Gy: c, a: l, d: u, h: d } = i),
      (f = 32),
      (p = (...e) => {
        `captureStackTrace` in Error &&
          typeof Error.captureStackTrace == `function` &&
          Error.captureStackTrace(...e);
      }),
      (m = (e = ``) => {
        let t = Error(e);
        throw (p(t, m), t);
      }),
      (h = (e) => typeof e == `bigint`),
      (g = (e) => typeof e == `string`),
      (_ = (e) =>
        e instanceof Uint8Array ||
        (ArrayBuffer.isView(e) &&
          e.constructor.name === `Uint8Array` &&
          `BYTES_PER_ELEMENT` in e &&
          e.BYTES_PER_ELEMENT === 1)),
      (v = (e, t, n = ``) => {
        let r = _(e),
          i = e?.length,
          a = t !== void 0;
        if (!r || (a && i !== t)) {
          let o = n && `"${n}" `,
            s = a ? ` of length ${t}` : ``,
            c = r ? `length=${i}` : `type=${typeof e}`,
            l = o + `expected Uint8Array` + s + `, got ` + c;
          throw r ? RangeError(l) : TypeError(l);
        }
        return e;
      }),
      (y = (e) => new Uint8Array(e)),
      (b = (e) => Uint8Array.from(e)),
      (x = (e, t) => e.toString(16).padStart(t, `0`)),
      (S = (e) =>
        Array.from(v(e))
          .map((e) => x(e, 2))
          .join(``)),
      (C = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }),
      (w = (e) => {
        if (e >= C._0 && e <= C._9) return e - C._0;
        if (e >= C.A && e <= C.F) return e - (C.A - 10);
        if (e >= C.a && e <= C.f) return e - (C.a - 10);
      }),
      (T = (e) => {
        let t = `hex invalid`;
        if (!g(e)) return m(t);
        let n = e.length,
          r = n / 2;
        if (n % 2) return m(t);
        let i = y(r);
        for (let n = 0, a = 0; n < r; n++, a += 2) {
          let r = w(e.charCodeAt(a)),
            o = w(e.charCodeAt(a + 1));
          if (r === void 0 || o === void 0) return m(t);
          i[n] = r * 16 + o;
        }
        return i;
      }),
      (E = () => globalThis?.crypto),
      (ee = () => E()?.subtle ?? m(`crypto.subtle must be defined, consider polyfill`)),
      (D = (...e) => {
        let t = 0;
        for (let n of e) t += v(n).length;
        let n = y(t),
          r = 0;
        return (
          e.forEach((e) => {
            (n.set(e, r), (r += e.length));
          }),
          n
        );
      }),
      (te = (e = f) => E().getRandomValues(y(e))),
      (O = BigInt),
      (k = (e, t, n, r = `bad number: out of range`) => {
        if (!h(e)) throw TypeError(r);
        if (t <= e && e < n) return e;
        throw RangeError(r);
      }),
      (A = (e, t = a) => {
        let n = e % t;
        return n >= 0n ? n : t + n;
      }),
      (j = (1n << 255n) - 1n),
      (M = (e) => {
        e < 0n && m(`negative coordinate`);
        let t = (e >> 255n) * 19n + (e & j);
        return ((t = (t >> 255n) * 19n + (t & j)), t % a);
      }),
      (N = (e) => A(e, o)),
      (ne = (e, t) => {
        (e === 0n || t <= 0n) && m(`no inverse n=` + e + ` mod=` + t);
        let n = A(e, t),
          r = t,
          i = 0n,
          a = 1n,
          o = 1n,
          s = 0n;
        for (; n !== 0n;) {
          let e = r / n,
            t = r % n,
            c = i - o * e,
            l = a - s * e;
          ((r = n), (n = t), (i = o), (a = s), (o = c), (s = l));
        }
        return r === 1n ? A(i, t) : m(`no inverse`);
      }),
      (P = (e) => {
        let t = Y[e];
        return (typeof t != `function` && m(`hashes.` + e + ` not set`), t);
      }),
      (F = (e) => v(e, 64, `digest`)),
      (I = (e) => (e instanceof R ? e : m(`Point expected`))),
      (L = 2n ** 256n),
      (R = class e {
        static BASE;
        static ZERO;
        X;
        Y;
        Z;
        T;
        constructor(e, t, n, r) {
          let i = L;
          ((this.X = k(e, 0n, i)),
            (this.Y = k(t, 0n, i)),
            (this.Z = k(n, 1n, i)),
            (this.T = k(r, 0n, i)),
            Object.freeze(this));
        }
        static CURVE() {
          return i;
        }
        static fromAffine(t) {
          return new e(t.x, t.y, 1n, M(t.x * t.y));
        }
        static fromBytes(t, n = !1) {
          let r = u,
            i = b(v(t, f)),
            o = t[31];
          i[31] = o & -129;
          let s = H(i);
          k(s, 0n, n ? L : a);
          let c = M(s * s),
            l = A(c - 1n),
            d = M(r * c + 1n),
            { isValid: p, value: h } = ie(l, d);
          p || m(`bad point: y not sqrt`);
          let g = (h & 1n) == 1n,
            _ = !!(o & 128);
          return (
            !n && h === 0n && _ && m(`bad point: x==0, isLastByteOdd`),
            _ !== g && (h = A(-h)),
            new e(h, s, 1n, M(h * s))
          );
        }
        static fromHex(t, n) {
          return e.fromBytes(T(t), n);
        }
        get x() {
          return this.toAffine().x;
        }
        get y() {
          return this.toAffine().y;
        }
        assertValidity() {
          let e = l,
            t = u,
            n = this;
          if (n.is0()) return m(`bad point: ZERO`);
          let { X: r, Y: i, Z: a, T: o } = n,
            s = M(r * r),
            c = M(i * i),
            d = M(a * a),
            f = M(d * d),
            p = M(s * e);
          return M(d * (p + c)) === A(f + M(t * M(s * c)))
            ? M(r * i) === M(a * o)
              ? this
              : m(`bad point: equation left != right (2)`)
            : m(`bad point: equation left != right (1)`);
        }
        equals(e) {
          let { X: t, Y: n, Z: r } = this,
            { X: i, Y: a, Z: o } = I(e),
            s = M(t * o),
            c = M(i * r),
            l = M(n * o),
            u = M(a * r);
          return s === c && l === u;
        }
        is0() {
          return this.equals(B);
        }
        negate() {
          return new e(A(-this.X), this.Y, this.Z, A(-this.T));
        }
        double() {
          let { X: t, Y: n, Z: r } = this,
            i = l,
            a = M(t * t),
            o = M(n * n),
            s = M(2n * r * r),
            c = M(i * a),
            u = A(t + n),
            d = A(M(u * u) - a - o),
            f = A(c + o),
            p = A(f - s),
            m = A(c - o),
            h = M(d * p),
            g = M(f * m),
            _ = M(d * m),
            v = M(p * f);
          return new e(h, g, v, _);
        }
        add(t) {
          let { X: n, Y: r, Z: i, T: a } = this,
            { X: o, Y: s, Z: c, T: d } = I(t),
            f = l,
            p = u,
            m = M(n * o),
            h = M(r * s),
            g = M(M(a * p) * d),
            _ = M(i * c),
            v = A(M(A(n + r) * A(o + s)) - m - h),
            y = A(_ - g),
            b = A(_ + g),
            x = A(h - M(f * m)),
            S = M(v * y),
            C = M(b * x),
            w = M(v * x),
            T = M(y * b);
          return new e(S, C, T, w);
        }
        subtract(e) {
          return this.add(I(e).negate());
        }
        multiply(e, t = !0) {
          if ((!t && e === 0n) || (k(e, 1n, o), !t && this.is0())) return B;
          if (e === 1n) return this;
          if (this.equals(z)) return he(e).p;
          let n = B,
            r = z;
          for (let i = this; e > 0n; i = i.double(), e >>= 1n)
            e & 1n ? (n = n.add(i)) : t && (r = r.add(i));
          return n;
        }
        multiplyUnsafe(e) {
          return this.multiply(e, !1);
        }
        toAffine() {
          let { X: e, Y: t, Z: n } = this;
          if (this.equals(B)) return { x: 0n, y: 1n };
          let r = ne(n, a);
          return (M(n * r) !== 1n && m(`invalid inverse`), { x: M(e * r), y: M(t * r) });
        }
        toBytes() {
          let { x: e, y: t } = this.toAffine(),
            n = V(t);
          return ((n[31] |= e & 1n ? 128 : 0), n);
        }
        toHex() {
          return S(this.toBytes());
        }
        clearCofactor() {
          return this.multiply(O(d), !1);
        }
        isSmallOrder() {
          return this.clearCofactor().is0();
        }
        isTorsionFree() {
          let e = this.multiply(o / 2n, !1).double();
          return (o % 2n && (e = e.add(this)), e.is0());
        }
      }),
      (z = new R(s, c, 1n, A(s * c))),
      (B = new R(0n, 1n, 1n, 0n)),
      (R.BASE = z),
      (R.ZERO = B),
      (V = (e) => T(x(k(e, 0n, L), 64)).reverse()),
      (H = (e) => O(`0x` + S(b(v(e)).reverse()))),
      (U = (e, t) => {
        let n = e;
        for (; t-- > 0n;) n = M(n * n);
        return n;
      }),
      (re = (e) => {
        let t = M(e * e),
          n = M(t * e),
          r = M(U(n, 2n) * n),
          i = M(U(r, 1n) * e),
          a = M(U(i, 5n) * i),
          o = M(U(a, 10n) * a),
          s = M(U(o, 20n) * o),
          c = M(U(s, 40n) * s),
          l = M(U(c, 80n) * c),
          u = M(U(l, 80n) * c),
          d = M(U(u, 10n) * a);
        return { pow_p_5_8: M(U(d, 2n) * e), b2: n };
      }),
      (W = 19681161376707505956807079304988542015446066515923890162744021073123829784752n),
      (ie = (e, t) => {
        let n = M(t * M(t * t)),
          r = M(M(n * n) * t),
          i = re(M(e * r)).pow_p_5_8,
          a = M(e * M(n * i)),
          o = M(t * M(a * a)),
          s = a,
          c = M(a * W),
          l = o === e,
          u = o === A(-e),
          d = o === A(-e * W);
        return (
          l && (a = s),
          (u || d) && (a = c),
          (A(a) & 1n) == 1n && (a = A(-a)),
          { isValid: l || u, value: a }
        );
      }),
      (G = (e) => N(H(e))),
      (K = (...e) => Promise.resolve(P(`sha512Async`)(D(...e))).then(F)),
      (ae = (...e) => F(P(`sha512`)(D(...e)))),
      (q = (e) => {
        let t = b(e),
          n = t.slice(0, 32);
        ((n[0] &= 248), (n[31] &= 127), (n[31] |= 64));
        let r = t.slice(32, 64),
          i = G(n),
          a = z.multiply(i);
        return { head: n, prefix: r, scalar: i, point: a, pointBytes: a.toBytes() };
      }),
      (J = (e) => K(v(e, f)).then(q)),
      (oe = (e) => q(ae(v(e, f)))),
      (se = (e) => J(e).then((e) => e.pointBytes)),
      (ce = (e) => K(e.hashable).then(e.finish)),
      (le = (e, t, n) => {
        let { pointBytes: r, scalar: i } = e,
          a = G(t),
          o = z.multiply(a).toBytes();
        return {
          hashable: D(o, r, n),
          finish: (e) => {
            let t = N(a + G(e) * i);
            return v(D(o, V(t)), 64);
          },
        };
      }),
      (ue = async (e, t) => {
        let n = v(e),
          r = await J(t),
          i = await K(r.prefix, n);
        return ce(le(r, i, n));
      }),
      (Y = {
        sha512Async: async (e) => {
          let t = ee(),
            n = D(e);
          return y(await t.digest(`SHA-512`, n.buffer));
        },
        sha512: void 0,
      }),
      (de = (e) => ((e = e === void 0 ? te(f) : e), v(e, f))),
      (fe = Object.freeze({
        getExtendedPublicKeyAsync: J,
        getExtendedPublicKey: oe,
        randomSecretKey: de,
      })),
      (X = 8),
      (Z = Math.ceil(256 / X) + 1),
      (Q = 128),
      (pe = () => {
        let e = [],
          t = z,
          n = t;
        for (let r = 0; r < Z; r++) {
          ((n = t), e.push(n));
          for (let r = 1; r < Q; r++) ((n = n.add(t)), e.push(n));
          t = n.double();
        }
        return e;
      }),
      (me = void 0),
      ($ = (e, t) => {
        let n = t.negate();
        return e ? n : t;
      }),
      (he = (e) => {
        let t = (me ||= pe()),
          n = B,
          r = z,
          i = 2 ** X,
          a = O(255),
          o = O(X);
        for (let s = 0; s < Z; s++) {
          let c = Number(e & a);
          ((e >>= o), c > Q && ((c -= i), (e += 1n)));
          let l = s * Q,
            u = l,
            d = l + Math.abs(c) - 1,
            f = s % 2 != 0,
            p = c < 0;
          c === 0 ? (r = r.add($(f, t[u]))) : (n = n.add($(p, t[d])));
        }
        return (e !== 0n && m(`invalid wnaf`), { p: n, f: r });
      }));
  }))();
}
function _e(e, t) {
  let n = e.hello?.features?.methods;
  return Array.isArray(n) ? n.includes(t) : null;
}
function ve(e, t) {
  let n = e.hello?.features?.capabilities;
  return Array.isArray(n) ? n.includes(t) : null;
}
function ye(e, t, n, i = {}) {
  if (!e?.client || e.phase !== `connected` || (i.requireAdvertisement !== !1 && _e(e, t) !== !0))
    return !1;
  let a = e.hello?.auth;
  return !a || !Array.isArray(a.scopes)
    ? !1
    : r({ role: a.role, requestedScopes: [n], allowedScopes: a.scopes });
}
function be() {
  return (be = e(() => {
    n();
  }))();
}
var xe = t((e, t) => {
  (function (e) {
    let n = `(0?\\d+|0x[a-f0-9]+)`,
      r = {
        fourOctet: RegExp(`^${n}\\.${n}\\.${n}\\.${n}$`, `i`),
        threeOctet: RegExp(`^${n}\\.${n}\\.${n}$`, `i`),
        twoOctet: RegExp(`^${n}\\.${n}$`, `i`),
        longValue: RegExp(`^${n}$`, `i`),
      },
      i = RegExp(`^0[0-7]+$`, `i`),
      a = RegExp(`^0x[a-f0-9]+$`, `i`),
      o = `%[0-9a-z]{1,}`,
      s = `(?:[0-9a-f]+::?)+`,
      c = {
        zoneIndex: RegExp(o, `i`),
        native: RegExp(`^(::)?(${s})?([0-9a-f]+)?(::)?(${o})?$`, `i`),
        deprecatedTransitional: RegExp(`^(?:::)(${n}\\.${n}\\.${n}\\.${n}(${o})?)$`, `i`),
        transitional: RegExp(`^((?:${s})|(?:::)(?:${s})?)${n}\\.${n}\\.${n}\\.${n}(${o})?$`, `i`),
      };
    function l(e, t) {
      if (e.indexOf(`::`) !== e.lastIndexOf(`::`)) return null;
      let n = 0,
        r = -1,
        i = (e.match(c.zoneIndex) || [])[0],
        a,
        o;
      for (
        i && ((i = i.substring(1)), (e = e.replace(/%.+$/, ``)));
        (r = e.indexOf(`:`, r + 1)) >= 0;
      )
        n++;
      if ((e.substr(0, 2) === `::` && n--, e.substr(-2, 2) === `::` && n--, n >= t)) return null;
      for (o = t - n, a = `:`; o--;) a += `0:`;
      return (
        (e = e.replace(`::`, a)),
        e[0] === `:` && (e = e.slice(1)),
        e[e.length - 1] === `:` && (e = e.slice(0, -1)),
        (t = (function () {
          let t = e.split(`:`),
            n = [];
          for (let e = 0; e < t.length; e++) n.push(t[e].length > 4 ? NaN : parseInt(t[e], 16));
          return n;
        })()),
        { parts: t, zoneId: i }
      );
    }
    function u(e, t, n, r) {
      if (e.length !== t.length)
        throw Error(`ipaddr: cannot match CIDR for objects with different lengths`);
      let i = 0,
        a;
      for (; r > 0;) {
        if (((a = n - r), a < 0 && (a = 0), e[i] >> a !== t[i] >> a)) return !1;
        ((r -= n), (i += 1));
      }
      return !0;
    }
    function d(e) {
      if (a.test(e)) return parseInt(e, 16);
      if (e[0] === `0` && !isNaN(parseInt(e[1], 10))) {
        if (i.test(e)) return parseInt(e, 8);
        throw Error(`ipaddr: cannot parse ${e} as octal`);
      }
      return parseInt(e, 10);
    }
    function f(e, t) {
      for (; e.length < t;) e = `0${e}`;
      return e;
    }
    let p = {};
    ((p.IPv4 = (function () {
      function e(e) {
        if (e.length !== 4) throw Error(`ipaddr: ipv4 octet count should be 4`);
        let t, n;
        for (t = 0; t < e.length; t++)
          if (((n = e[t]), !(0 <= n && n <= 255)))
            throw Error(`ipaddr: ipv4 octet should fit in 8 bits`);
        this.octets = e;
      }
      return (
        (e.prototype.SpecialRanges = {
          unspecified: [[new e([0, 0, 0, 0]), 8]],
          broadcast: [[new e([255, 255, 255, 255]), 32]],
          multicast: [[new e([224, 0, 0, 0]), 4]],
          linkLocal: [[new e([169, 254, 0, 0]), 16]],
          loopback: [[new e([127, 0, 0, 0]), 8]],
          carrierGradeNat: [[new e([100, 64, 0, 0]), 10]],
          private: [
            [new e([10, 0, 0, 0]), 8],
            [new e([172, 16, 0, 0]), 12],
            [new e([192, 168, 0, 0]), 16],
          ],
          reserved: [
            [new e([192, 0, 0, 0]), 24],
            [new e([192, 0, 2, 0]), 24],
            [new e([192, 88, 99, 0]), 24],
            [new e([198, 18, 0, 0]), 15],
            [new e([198, 51, 100, 0]), 24],
            [new e([203, 0, 113, 0]), 24],
            [new e([240, 0, 0, 0]), 4],
          ],
          as112: [
            [new e([192, 175, 48, 0]), 24],
            [new e([192, 31, 196, 0]), 24],
          ],
          amt: [[new e([192, 52, 193, 0]), 24]],
        }),
        (e.prototype.kind = function () {
          return `ipv4`;
        }),
        (e.prototype.match = function (e, t) {
          let n;
          if ((t === void 0 && ((n = e), (e = n[0]), (t = n[1])), e.kind() !== `ipv4`))
            throw Error(`ipaddr: cannot match ipv4 address with non-ipv4 one`);
          return u(this.octets, e.octets, 8, t);
        }),
        (e.prototype.prefixLengthFromSubnetMask = function () {
          let e = 0,
            t = !1,
            n = { 0: 8, 128: 7, 192: 6, 224: 5, 240: 4, 248: 3, 252: 2, 254: 1, 255: 0 },
            r,
            i,
            a;
          for (r = 3; r >= 0; --r)
            if (((i = this.octets[r]), i in n)) {
              if (((a = n[i]), t && a !== 0)) return null;
              (a !== 8 && (t = !0), (e += a));
            } else return null;
          return 32 - e;
        }),
        (e.prototype.range = function () {
          return p.subnetMatch(this, this.SpecialRanges);
        }),
        (e.prototype.toByteArray = function () {
          return this.octets.slice(0);
        }),
        (e.prototype.toIPv4MappedAddress = function () {
          return p.IPv6.parse(`::ffff:${this.toString()}`);
        }),
        (e.prototype.toNormalizedString = function () {
          return this.toString();
        }),
        (e.prototype.toString = function () {
          return this.octets.join(`.`);
        }),
        e
      );
    })()),
      (p.IPv4.broadcastAddressFromCIDR = function (e) {
        try {
          let t = this.parseCIDR(e),
            n = t[0].toByteArray(),
            r = this.subnetMaskFromPrefixLength(t[1]).toByteArray(),
            i = [],
            a = 0;
          for (; a < 4;) (i.push(parseInt(n[a], 10) | (parseInt(r[a], 10) ^ 255)), a++);
          return new this(i);
        } catch (e) {
          throw Error(`ipaddr: the address does not have IPv4 CIDR format`, { cause: e });
        }
      }),
      (p.IPv4.isIPv4 = function (e) {
        return this.parser(e) !== null;
      }),
      (p.IPv4.isValid = function (e) {
        try {
          return (new this(this.parser(e)), !0);
        } catch {
          return !1;
        }
      }),
      (p.IPv4.isValidCIDR = function (e) {
        try {
          return (this.parseCIDR(e), !0);
        } catch {
          return !1;
        }
      }),
      (p.IPv4.isValidFourPartDecimal = function (e) {
        return !!(p.IPv4.isValid(e) && e.match(/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){3}$/));
      }),
      (p.IPv4.isValidCIDRFourPartDecimal = function (e) {
        let t = e.match(/^(.+)\/(\d+)$/);
        return !p.IPv4.isValidCIDR(e) || !t ? !1 : p.IPv4.isValidFourPartDecimal(t[1]);
      }),
      (p.IPv4.networkAddressFromCIDR = function (e) {
        let t, n, r, i, a;
        try {
          for (
            t = this.parseCIDR(e),
              r = t[0].toByteArray(),
              a = this.subnetMaskFromPrefixLength(t[1]).toByteArray(),
              i = [],
              n = 0;
            n < 4;
          )
            (i.push(parseInt(r[n], 10) & parseInt(a[n], 10)), n++);
          return new this(i);
        } catch (e) {
          throw Error(`ipaddr: the address does not have IPv4 CIDR format`, { cause: e });
        }
      }),
      (p.IPv4.parse = function (e) {
        let t = this.parser(e);
        if (t === null) throw Error(`ipaddr: string is not formatted like an IPv4 Address`);
        return new this(t);
      }),
      (p.IPv4.parseCIDR = function (e) {
        let t;
        if ((t = e.match(/^(.+)\/(\d+)$/))) {
          let e = parseInt(t[2]);
          if (e >= 0 && e <= 32) {
            let n = [this.parse(t[1]), e];
            return (
              Object.defineProperty(n, "toString", {
                value: function () {
                  return this.join(`/`);
                },
              }),
              n
            );
          }
        }
        throw Error(`ipaddr: string is not formatted like an IPv4 CIDR range`);
      }),
      (p.IPv4.parser = function (e) {
        let t, n, i;
        if ((t = e.match(r.fourOctet)))
          return (function () {
            let e = t.slice(1, 6),
              r = [];
            for (let t = 0; t < e.length; t++) ((n = e[t]), r.push(d(n)));
            return r;
          })();
        if ((t = e.match(r.longValue))) {
          if (((i = d(t[1])), i > 4294967295 || i < 0))
            throw Error(`ipaddr: address outside defined range`);
          return (function () {
            let e = [],
              t;
            for (t = 0; t <= 24; t += 8) e.push((i >> t) & 255);
            return e;
          })().reverse();
        }
        return (t = e.match(r.twoOctet))
          ? (function () {
              let e = t.slice(1, 4),
                n = [];
              if (((i = d(e[1])), i > 16777215 || i < 0))
                throw Error(`ipaddr: address outside defined range`);
              return (
                n.push(d(e[0])), n.push((i >> 16) & 255), n.push((i >> 8) & 255), n.push(i & 255), n
              );
            })()
          : (t = e.match(r.threeOctet))
            ? (function () {
                let e = t.slice(1, 5),
                  n = [];
                if (((i = d(e[2])), i > 65535 || i < 0))
                  throw Error(`ipaddr: address outside defined range`);
                return (
                  n.push(d(e[0])), n.push(d(e[1])), n.push((i >> 8) & 255), n.push(i & 255), n
                );
              })()
            : null;
      }),
      (p.IPv4.subnetMaskFromPrefixLength = function (e) {
        if (((e = parseInt(e)), Number.isNaN(e) || e < 0 || e > 32))
          throw Error(`ipaddr: invalid IPv4 prefix length`);
        let t = [0, 0, 0, 0],
          n = 0,
          r = Math.floor(e / 8);
        for (; n < r;) ((t[n] = 255), n++);
        return (r < 4 && (t[r] = (2 ** (e % 8) - 1) << (8 - (e % 8))), new this(t));
      }),
      (p.IPv6 = (function () {
        function e(e, t) {
          let n, r;
          if (e.length === 16)
            for (this.parts = [], n = 0; n <= 14; n += 2) this.parts.push((e[n] << 8) | e[n + 1]);
          else if (e.length === 8) this.parts = e;
          else throw Error(`ipaddr: ipv6 part count should be 8 or 16`);
          for (n = 0; n < this.parts.length; n++)
            if (((r = this.parts[n]), !(0 <= r && r <= 65535)))
              throw Error(`ipaddr: ipv6 part should fit in 16 bits`);
          t && (this.zoneId = t);
        }
        return (
          (e.prototype.SpecialRanges = {
            unspecified: [new e([0, 0, 0, 0, 0, 0, 0, 0]), 128],
            linkLocal: [new e([65152, 0, 0, 0, 0, 0, 0, 0]), 10],
            multicast: [new e([65280, 0, 0, 0, 0, 0, 0, 0]), 8],
            loopback: [new e([0, 0, 0, 0, 0, 0, 0, 1]), 128],
            uniqueLocal: [new e([64512, 0, 0, 0, 0, 0, 0, 0]), 7],
            ipv4Mapped: [new e([0, 0, 0, 0, 0, 65535, 0, 0]), 96],
            deprecatedSiteLocal: [new e([65216, 0, 0, 0, 0, 0, 0, 0]), 10],
            discard: [new e([256, 0, 0, 0, 0, 0, 0, 0]), 64],
            rfc6145: [new e([0, 0, 0, 0, 65535, 0, 0, 0]), 96],
            rfc6052: [
              [new e([100, 65435, 0, 0, 0, 0, 0, 0]), 96],
              [new e([100, 65435, 1, 0, 0, 0, 0, 0]), 48],
            ],
            "6to4": [new e([8194, 0, 0, 0, 0, 0, 0, 0]), 16],
            teredo: [new e([8193, 0, 0, 0, 0, 0, 0, 0]), 32],
            benchmarking: [new e([8193, 2, 0, 0, 0, 0, 0, 0]), 48],
            amt: [new e([8193, 3, 0, 0, 0, 0, 0, 0]), 32],
            as112v6: [
              [new e([8193, 4, 274, 0, 0, 0, 0, 0]), 48],
              [new e([9760, 79, 32768, 0, 0, 0, 0, 0]), 48],
            ],
            deprecatedOrchid: [new e([8193, 16, 0, 0, 0, 0, 0, 0]), 28],
            orchid2: [new e([8193, 32, 0, 0, 0, 0, 0, 0]), 28],
            droneRemoteIdProtocolEntityTags: [new e([8193, 48, 0, 0, 0, 0, 0, 0]), 28],
            segmentRouting: [new e([24320, 0, 0, 0, 0, 0, 0, 0]), 16],
            reserved: [
              [new e([8193, 0, 0, 0, 0, 0, 0, 0]), 23],
              [new e([8193, 3512, 0, 0, 0, 0, 0, 0]), 32],
              [new e([16383, 0, 0, 0, 0, 0, 0, 0]), 20],
            ],
          }),
          (e.prototype.isIPv4MappedAddress = function () {
            return this.range() === `ipv4Mapped`;
          }),
          (e.prototype.kind = function () {
            return `ipv6`;
          }),
          (e.prototype.match = function (e, t) {
            let n;
            if ((t === void 0 && ((n = e), (e = n[0]), (t = n[1])), e.kind() !== `ipv6`))
              throw Error(`ipaddr: cannot match ipv6 address with non-ipv6 one`);
            return u(this.parts, e.parts, 16, t);
          }),
          (e.prototype.prefixLengthFromSubnetMask = function () {
            let e = 0,
              t = !1,
              n = {
                0: 16,
                32768: 15,
                49152: 14,
                57344: 13,
                61440: 12,
                63488: 11,
                64512: 10,
                65024: 9,
                65280: 8,
                65408: 7,
                65472: 6,
                65504: 5,
                65520: 4,
                65528: 3,
                65532: 2,
                65534: 1,
                65535: 0,
              },
              r,
              i;
            for (let a = 7; a >= 0; --a)
              if (((r = this.parts[a]), r in n)) {
                if (((i = n[r]), t && i !== 0)) return null;
                (i !== 16 && (t = !0), (e += i));
              } else return null;
            return 128 - e;
          }),
          (e.prototype.range = function () {
            return p.subnetMatch(this, this.SpecialRanges);
          }),
          (e.prototype.toByteArray = function () {
            let e,
              t = [],
              n = this.parts;
            for (let r = 0; r < n.length; r++) ((e = n[r]), t.push(e >> 8), t.push(e & 255));
            return t;
          }),
          (e.prototype.toFixedLengthString = function () {
            let e = function () {
                let e = [];
                for (let t = 0; t < this.parts.length; t++)
                  e.push(f(this.parts[t].toString(16), 4));
                return e;
              }
                .call(this)
                .join(`:`),
              t = ``;
            return (this.zoneId && (t = `%${this.zoneId}`), e + t);
          }),
          (e.prototype.toIPv4Address = function () {
            if (!this.isIPv4MappedAddress())
              throw Error(`ipaddr: trying to convert a generic ipv6 address to ipv4`);
            let e = this.parts.slice(-2),
              t = e[0],
              n = e[1];
            return new p.IPv4([t >> 8, t & 255, n >> 8, n & 255]);
          }),
          (e.prototype.toNormalizedString = function () {
            let e = function () {
                let e = [];
                for (let t = 0; t < this.parts.length; t++) e.push(this.parts[t].toString(16));
                return e;
              }
                .call(this)
                .join(`:`),
              t = ``;
            return (this.zoneId && (t = `%${this.zoneId}`), e + t);
          }),
          (e.prototype.toRFC5952String = function () {
            let e = /((^|:)(0(:|$)){2,})/g,
              t = ``;
            this.zoneId && (t = `%${this.zoneId}`);
            let n = this.toNormalizedString(),
              r = n.slice(0, n.length - t.length),
              i = 0,
              a = -1,
              o = -1,
              s;
            for (; (s = e.exec(r));) {
              let e = (s[0].match(/0/g) || []).length;
              e > o && ((o = e), (i = s.index), (a = s[0].length));
            }
            return a < 0 ? r + t : `${r.substring(0, i)}::${r.substring(i + a)}${t}`;
          }),
          (e.prototype.toString = function () {
            return this.toRFC5952String();
          }),
          e
        );
      })()),
      (p.IPv6.broadcastAddressFromCIDR = function (e) {
        try {
          let t = this.parseCIDR(e),
            n = t[0].toByteArray(),
            r = this.subnetMaskFromPrefixLength(t[1]).toByteArray(),
            i = [],
            a = 0;
          for (; a < 16;) (i.push(parseInt(n[a], 10) | (parseInt(r[a], 10) ^ 255)), a++);
          return new this(i);
        } catch (e) {
          throw Error(`ipaddr: the address does not have IPv6 CIDR format`, { cause: e });
        }
      }),
      (p.IPv6.isIPv6 = function (e) {
        return this.parser(e) !== null;
      }),
      (p.IPv6.isValid = function (e) {
        if (typeof e == `string` && e.indexOf(`:`) === -1) return !1;
        try {
          let t = this.parser(e);
          return (new this(t.parts, t.zoneId), !0);
        } catch {
          return !1;
        }
      }),
      (p.IPv6.isValidCIDR = function (e) {
        if (typeof e == `string` && e.indexOf(`:`) === -1) return !1;
        try {
          return (this.parseCIDR(e), !0);
        } catch {
          return !1;
        }
      }),
      (p.IPv6.networkAddressFromCIDR = function (e) {
        let t, n, r, i, a;
        try {
          for (
            t = this.parseCIDR(e),
              r = t[0].toByteArray(),
              a = this.subnetMaskFromPrefixLength(t[1]).toByteArray(),
              i = [],
              n = 0;
            n < 16;
          )
            (i.push(parseInt(r[n], 10) & parseInt(a[n], 10)), n++);
          return new this(i);
        } catch (e) {
          throw Error(`ipaddr: the address does not have IPv6 CIDR format`, { cause: e });
        }
      }),
      (p.IPv6.parse = function (e) {
        let t = this.parser(e);
        if (t === null) throw Error(`ipaddr: string is not formatted like an IPv6 Address`);
        return new this(t.parts, t.zoneId);
      }),
      (p.IPv6.parseCIDR = function (e) {
        let t, n, r;
        if ((n = e.match(/^(.+)\/(\d+)$/)) && ((t = parseInt(n[2])), t >= 0 && t <= 128))
          return (
            (r = [this.parse(n[1]), t]),
            Object.defineProperty(r, "toString", {
              value: function () {
                return this.join(`/`);
              },
            }),
            r
          );
        throw Error(`ipaddr: string is not formatted like an IPv6 CIDR range`);
      }),
      (p.IPv6.parser = function (e) {
        let t, n, r, i, a, o;
        if ((r = e.match(c.deprecatedTransitional))) return this.parser(`::ffff:${r[1]}`);
        if (c.native.test(e)) return l(e, 8);
        if (
          (r = e.match(c.transitional)) &&
          ((o = r[6] || ``),
          (t = r[1]),
          r[1].endsWith(`::`) || (t = t.slice(0, -1)),
          (t = l(t + o, 6)),
          t && t.parts)
        ) {
          for (
            a = [parseInt(r[2]), parseInt(r[3]), parseInt(r[4]), parseInt(r[5])], n = 0;
            n < a.length;
            n++
          )
            if (((i = a[n]), !(0 <= i && i <= 255))) return null;
          return (
            t.parts.push((a[0] << 8) | a[1]),
            t.parts.push((a[2] << 8) | a[3]),
            { parts: t.parts, zoneId: t.zoneId }
          );
        }
        return null;
      }),
      (p.IPv6.subnetMaskFromPrefixLength = function (e) {
        if (((e = parseInt(e)), Number.isNaN(e) || e < 0 || e > 128))
          throw Error(`ipaddr: invalid IPv6 prefix length`);
        let t = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          n = 0,
          r = Math.floor(e / 8);
        for (; n < r;) ((t[n] = 255), n++);
        return (r < 16 && (t[r] = (2 ** (e % 8) - 1) << (8 - (e % 8))), new this(t));
      }),
      (p.fromByteArray = function (e) {
        let t = e.length;
        if (t === 4) return new p.IPv4(e);
        if (t === 16) return new p.IPv6(e);
        throw Error(`ipaddr: the binary input is neither an IPv6 nor IPv4 address`);
      }),
      (p.isValid = function (e) {
        return p.IPv6.isValid(e) || p.IPv4.isValid(e);
      }),
      (p.isValidCIDR = function (e) {
        return p.IPv6.isValidCIDR(e) || p.IPv4.isValidCIDR(e);
      }),
      (p.parse = function (e) {
        if (p.IPv6.isValid(e)) return p.IPv6.parse(e);
        if (p.IPv4.isValid(e)) return p.IPv4.parse(e);
        throw Error(`ipaddr: the address has neither IPv6 nor IPv4 format`);
      }),
      (p.parseCIDR = function (e) {
        try {
          return p.IPv6.parseCIDR(e);
        } catch {
          try {
            return p.IPv4.parseCIDR(e);
          } catch (e) {
            throw Error(`ipaddr: the address has neither IPv6 nor IPv4 CIDR format`, { cause: e });
          }
        }
      }),
      (p.process = function (e) {
        let t = this.parse(e);
        return t.kind() === `ipv6` && t.isIPv4MappedAddress() ? t.toIPv4Address() : t;
      }),
      (p.subnetMatch = function (e, t, n) {
        let r, i, a, o;
        for (i in ((n ??= `unicast`), t))
          if (Object.prototype.hasOwnProperty.call(t, i)) {
            for (a = t[i], a[0] && !(a[0] instanceof Array) && (a = [a]), r = 0; r < a.length; r++)
              if (((o = a[r]), e.kind() === o[0].kind() && e.match.apply(e, o))) return i;
          }
        return n;
      }),
      t !== void 0 && t.exports ? (t.exports = p) : (e.ipaddr = p));
  })(e);
});
export { _e as a, ge as c, ve as i, ue as l, ye as n, se as o, be as r, Y as s, xe as t, fe as u };
//# sourceMappingURL=gateway-runtime-CzCgK0eB.js.map
