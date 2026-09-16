import { a as e, n as t, r as n, t as r } from "./rolldown-runtime-DkW27tQK.js";
function i(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
  return r;
}
function a(e) {
  if (Array.isArray(e)) return e;
}
function o(e, t) {
  var n = e == null ? null : (typeof Symbol < `u` && e[Symbol.iterator]) || e[`@@iterator`];
  if (n != null) {
    var r,
      i,
      a,
      o,
      s = [],
      c = !0,
      l = !1;
    try {
      if (((a = (n = n.call(e)).next), t !== 0))
        for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
    } catch (e) {
      ((l = !0), (i = e));
    } finally {
      try {
        if (!c && n.return != null && ((o = n.return()), Object(o) !== o)) return;
      } finally {
        if (l) throw i;
      }
    }
    return s;
  }
}
function s() {
  throw TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function c(e, t) {
  return a(e) || o(e, t) || l(e, t) || s();
}
function l(e, t) {
  if (e) {
    if (typeof e == `string`) return i(e, t);
    var n = {}.toString.call(e).slice(8, -1);
    return (
      n === `Object` && e.constructor && (n = e.constructor.name),
      n === `Map` || n === `Set`
        ? Array.from(e)
        : n === `Arguments` || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
          ? i(e, t)
          : void 0
    );
  }
}
function u(e) {
  return function (t) {
    t instanceof RegExp && (t.lastIndex = 0);
    var n = [...arguments].slice(1);
    return O(e, t, n);
  };
}
function d(e) {
  return function () {
    return k(e, [...arguments]);
  };
}
function f(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : F;
  if ((b && b(e, null), !P(t))) return e;
  let r = t.length;
  for (; r--;) {
    let i = t[r];
    if (typeof i == `string`) {
      let e = n(i);
      e !== i && (x(t) || (t[r] = e), (i = e));
    }
    e[i] = !0;
  }
  return e;
}
function p(e) {
  for (let t = 0; t < e.length; t++) R(e, t) || (e[t] = null);
  return e;
}
function m(e) {
  let t = E(null);
  for (let r of y(e)) {
    var n = c(r, 2);
    let i = n[0],
      a = n[1];
    R(e, i) &&
      (t[i] = P(a) ? p(a) : a && typeof a == `object` && a.constructor === Object ? m(a) : a);
  }
  return t;
}
function h(e) {
  switch (typeof e) {
    case `string`:
      return e;
    case `number`:
      return I(e);
    case `boolean`:
      return oe(e);
    case `bigint`:
      return L ? L(e) : `0`;
    case `symbol`:
      return se ? se(e) : `Symbol()`;
    case `undefined`:
      return ce(e);
    case `function`:
    case `object`: {
      if (e === null) return ce(e);
      let t = e,
        n = g(t, `toString`);
      if (typeof n == `function`) {
        let e = n(t);
        return typeof e == `string` ? e : ce(e);
      }
      return ce(e);
    }
    default:
      return ce(e);
  }
}
function g(e, t) {
  for (; e !== null;) {
    let n = C(e, t);
    if (n) {
      if (n.get) return u(n.get);
      if (typeof n.value == `function`) return u(n.value);
    }
    e = S(e);
  }
  function n() {
    return null;
  }
  return n;
}
function _(e) {
  try {
    return (z(e, ``), !0);
  } catch {
    return !1;
  }
}
function v() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Fe(),
    t = (e) => v(e);
  if (
    ((t.version = `3.4.13`),
    (t.removed = []),
    !e || !e.document || e.document.nodeType !== B.document || !e.Element)
  )
    return ((t.isSupported = !1), t);
  let n = e.document,
    r = n,
    i = r.currentScript;
  e.DocumentFragment;
  let a = e.HTMLTemplateElement,
    o = e.Node,
    s = e.Element,
    c = e.NodeFilter;
  (e.NamedNodeMap === void 0 && (e.NamedNodeMap || e.MozNamedAttrMap), e.HTMLFormElement);
  let l = e.DOMParser,
    u = e.trustedTypes,
    d = s.prototype,
    p = g(d, `cloneNode`),
    b = g(d, `remove`),
    x = g(d, `nextSibling`),
    S = g(d, `childNodes`),
    C = g(d, `parentNode`),
    D = g(d, `shadowRoot`),
    O = g(d, `attributes`),
    k = o && o.prototype ? g(o.prototype, `nodeType`) : null,
    I = o && o.prototype ? g(o.prototype, `nodeName`) : null,
    oe = o && o.prototype ? g(o.prototype, `ownerDocument`) : null;
  if (typeof a == `function`) {
    let e = n.createElement(`template`);
    e.content && e.content.ownerDocument && (n = e.content.ownerDocument);
  }
  let L,
    se = ``,
    ce,
    ze = !1,
    Be = 0,
    Ve = function () {
      if (Be > 0)
        throw le(
          `A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.`,
        );
    },
    He = function (e) {
      (Ve(), Be++);
      try {
        return L.createHTML(e);
      } finally {
        Be--;
      }
    },
    Ue = function (e) {
      (Ve(), Be++);
      try {
        return L.createScriptURL(e);
      } finally {
        Be--;
      }
    },
    We = function () {
      return ((ze ||= ((ce = Ie(u, i)), !0)), ce);
    },
    Ge = n,
    Ke = Ge.implementation,
    qe = Ge.createNodeIterator,
    Je = Ge.createDocumentFragment,
    Ye = Ge.getElementsByTagName,
    Xe = r.importNode,
    V = Le();
  t.isSupported =
    typeof y == `function` && typeof C == `function` && Ke && Ke.createHTMLDocument !== void 0;
  let Ze = xe,
    Qe = Se,
    $e = Ce,
    et = we,
    tt = Te,
    nt = De,
    rt = Oe,
    it = Ae,
    at = Ee,
    H = null,
    ot = f({}, [...ue, ...de, ...fe, ...me, ...ge]),
    U = null,
    st = f({}, [..._e, ...ve, ...ye, ...be]),
    W = Object.seal(
      E(null, {
        tagNameCheck: { writable: !0, configurable: !1, enumerable: !0, value: null },
        attributeNameCheck: { writable: !0, configurable: !1, enumerable: !0, value: null },
        allowCustomizedBuiltInElements: {
          writable: !0,
          configurable: !1,
          enumerable: !0,
          value: !1,
        },
      }),
    ),
    ct = null,
    lt = null,
    G = Object.seal(
      E(null, {
        tagCheck: { writable: !0, configurable: !1, enumerable: !0, value: null },
        attributeCheck: { writable: !0, configurable: !1, enumerable: !0, value: null },
      }),
    ),
    ut = !0,
    dt = !0,
    ft = !1,
    pt = !0,
    mt = !1,
    ht = !0,
    gt = !1,
    _t = !1,
    vt = null,
    yt = null,
    bt = !1,
    xt = !1,
    St = !1,
    Ct = !1,
    wt = !0,
    Tt = !1,
    Et = `user-content-`,
    Dt = !0,
    Ot = !1,
    kt = {},
    At = null,
    jt = f(
      {},
      `annotation-xml.audio.colgroup.desc.foreignobject.head.iframe.math.mi.mn.mo.ms.mtext.noembed.noframes.noscript.plaintext.script.selectedcontent.style.svg.template.thead.title.video.xmp`.split(
        `.`,
      ),
    ),
    Mt = null,
    Nt = f({}, [`audio`, `video`, `img`, `source`, `image`, `track`]),
    Pt = null,
    Ft = f({}, [
      `alt`,
      `class`,
      `for`,
      `id`,
      `label`,
      `name`,
      `pattern`,
      `placeholder`,
      `role`,
      `summary`,
      `title`,
      `value`,
      `style`,
      `xmlns`,
    ]),
    It = `http://www.w3.org/1998/Math/MathML`,
    Lt = `http://www.w3.org/2000/svg`,
    K = `http://www.w3.org/1999/xhtml`,
    Rt = K,
    zt = !1,
    Bt = null,
    Vt = f({}, [It, Lt, K], te),
    Ht = w([`mi`, `mo`, `mn`, `ms`, `mtext`]),
    Ut = f({}, Ht),
    Wt = w([`annotation-xml`]),
    Gt = f({}, Wt),
    Kt = f({}, [`title`, `style`, `font`, `a`, `script`]),
    qt = null,
    Jt = [`application/xhtml+xml`, `text/html`],
    q = null,
    Yt = null,
    Xt = n.createElement(`form`),
    Zt = function (e) {
      return e instanceof RegExp || e instanceof Function;
    },
    Qt = function () {
      let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      if (Yt && Yt === e) return;
      ((!e || typeof e != `object`) && (e = {}),
        (e = m(e)),
        (qt = Jt.indexOf(e.PARSER_MEDIA_TYPE) === -1 ? `text/html` : e.PARSER_MEDIA_TYPE),
        (q = qt === `application/xhtml+xml` ? te : F),
        (H = Re(e, `ALLOWED_TAGS`, ot, { transform: q })),
        (U = Re(e, `ALLOWED_ATTR`, st, { transform: q })),
        (Bt = Re(e, `ALLOWED_NAMESPACES`, Vt, { transform: te })),
        (Pt = Re(e, `ADD_URI_SAFE_ATTR`, Ft, { transform: q, base: Ft })),
        (Mt = Re(e, `ADD_DATA_URI_TAGS`, Nt, { transform: q, base: Nt })),
        (At = Re(e, `FORBID_CONTENTS`, jt, { transform: q })),
        (ct = Re(e, `FORBID_TAGS`, m({}), { transform: q })),
        (lt = Re(e, `FORBID_ATTR`, m({}), { transform: q })),
        (kt = R(e, `USE_PROFILES`)
          ? e.USE_PROFILES && typeof e.USE_PROFILES == `object`
            ? m(e.USE_PROFILES)
            : e.USE_PROFILES
          : !1),
        (ut = e.ALLOW_ARIA_ATTR !== !1),
        (dt = e.ALLOW_DATA_ATTR !== !1),
        (ft = e.ALLOW_UNKNOWN_PROTOCOLS || !1),
        (pt = e.ALLOW_SELF_CLOSE_IN_ATTR !== !1),
        (mt = e.SAFE_FOR_TEMPLATES || !1),
        (ht = e.SAFE_FOR_XML !== !1),
        (gt = e.WHOLE_DOCUMENT || !1),
        (xt = e.RETURN_DOM || !1),
        (St = e.RETURN_DOM_FRAGMENT || !1),
        (Ct = e.RETURN_TRUSTED_TYPE || !1),
        (bt = e.FORCE_BODY || !1),
        (wt = e.SANITIZE_DOM !== !1),
        (Tt = e.SANITIZE_NAMED_PROPS || !1),
        (Dt = e.KEEP_CONTENT !== !1),
        (Ot = e.IN_PLACE || !1),
        (at = _(e.ALLOWED_URI_REGEXP) ? e.ALLOWED_URI_REGEXP : Ee),
        (Rt = typeof e.NAMESPACE == `string` ? e.NAMESPACE : K),
        (Ut =
          R(e, `MATHML_TEXT_INTEGRATION_POINTS`) &&
          e.MATHML_TEXT_INTEGRATION_POINTS &&
          typeof e.MATHML_TEXT_INTEGRATION_POINTS == `object`
            ? m(e.MATHML_TEXT_INTEGRATION_POINTS)
            : f({}, Ht)),
        (Gt =
          R(e, `HTML_INTEGRATION_POINTS`) &&
          e.HTML_INTEGRATION_POINTS &&
          typeof e.HTML_INTEGRATION_POINTS == `object`
            ? m(e.HTML_INTEGRATION_POINTS)
            : f({}, Wt)));
      let t =
        R(e, `CUSTOM_ELEMENT_HANDLING`) &&
        e.CUSTOM_ELEMENT_HANDLING &&
        typeof e.CUSTOM_ELEMENT_HANDLING == `object`
          ? m(e.CUSTOM_ELEMENT_HANDLING)
          : E(null);
      if (
        ((W = E(null)),
        R(t, `tagNameCheck`) && Zt(t.tagNameCheck) && (W.tagNameCheck = t.tagNameCheck),
        R(t, `attributeNameCheck`) &&
          Zt(t.attributeNameCheck) &&
          (W.attributeNameCheck = t.attributeNameCheck),
        R(t, `allowCustomizedBuiltInElements`) &&
          typeof t.allowCustomizedBuiltInElements == `boolean` &&
          (W.allowCustomizedBuiltInElements = t.allowCustomizedBuiltInElements),
        T(W),
        mt && (dt = !1),
        St && (xt = !0),
        kt &&
          ((H = f({}, ge)),
          (U = E(null)),
          kt.html === !0 && (f(H, ue), f(U, _e)),
          kt.svg === !0 && (f(H, de), f(U, ve), f(U, be)),
          kt.svgFilters === !0 && (f(H, fe), f(U, ve), f(U, be)),
          kt.mathMl === !0 && (f(H, me), f(U, ye), f(U, be))),
        (G.tagCheck = null),
        (G.attributeCheck = null),
        R(e, `ADD_TAGS`) &&
          (typeof e.ADD_TAGS == `function`
            ? (G.tagCheck = e.ADD_TAGS)
            : P(e.ADD_TAGS) && (H === ot && (H = m(H)), f(H, e.ADD_TAGS, q))),
        R(e, `ADD_ATTR`) &&
          (typeof e.ADD_ATTR == `function`
            ? (G.attributeCheck = e.ADD_ATTR)
            : P(e.ADD_ATTR) && (U === st && (U = m(U)), f(U, e.ADD_ATTR, q))),
        R(e, `ADD_URI_SAFE_ATTR`) && P(e.ADD_URI_SAFE_ATTR) && f(Pt, e.ADD_URI_SAFE_ATTR, q),
        R(e, `FORBID_CONTENTS`) &&
          P(e.FORBID_CONTENTS) &&
          (At === jt && (At = m(At)), f(At, e.FORBID_CONTENTS, q)),
        R(e, `ADD_FORBID_CONTENTS`) &&
          P(e.ADD_FORBID_CONTENTS) &&
          (At === jt && (At = m(At)), f(At, e.ADD_FORBID_CONTENTS, q)),
        Dt && (H[`#text`] = !0),
        gt && f(H, [`html`, `head`, `body`]),
        H.table && (f(H, [`tbody`]), delete ct.tbody),
        e.TRUSTED_TYPES_POLICY)
      ) {
        if (typeof e.TRUSTED_TYPES_POLICY.createHTML != `function`)
          throw le(`TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.`);
        if (typeof e.TRUSTED_TYPES_POLICY.createScriptURL != `function`)
          throw le(
            `TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.`,
          );
        let t = L;
        L = e.TRUSTED_TYPES_POLICY;
        try {
          se = He(``);
        } catch (e) {
          throw ((L = t), e);
        }
      } else
        e.TRUSTED_TYPES_POLICY === null
          ? ((L = void 0), (se = ``))
          : (L === void 0 && (L = We()), L && typeof se == `string` && (se = He(``)));
      (w && w(e), (Yt = e));
    },
    $t = f({}, [...de, ...fe, ...pe]),
    en = f({}, [...me, ...he]),
    tn = function (e, t, n) {
      return t.namespaceURI === K
        ? e === `svg`
        : t.namespaceURI === It
          ? e === `svg` && (n === `annotation-xml` || Ut[n])
          : !!$t[e];
    },
    nn = function (e, t, n) {
      return t.namespaceURI === K
        ? e === `math`
        : t.namespaceURI === Lt
          ? e === `math` && Gt[n]
          : !!en[e];
    },
    rn = function (e, t, n) {
      return (t.namespaceURI === Lt && !Gt[n]) || (t.namespaceURI === It && !Ut[n])
        ? !1
        : !en[e] && (Kt[e] || !$t[e]);
    },
    an = function (e) {
      let t = C(e);
      (!t || !t.tagName) && (t = { namespaceURI: Rt, tagName: `template` });
      let n = F(e.tagName),
        r = F(t.tagName);
      return Bt[e.namespaceURI]
        ? e.namespaceURI === Lt
          ? tn(n, t, r)
          : e.namespaceURI === It
            ? nn(n, t, r)
            : e.namespaceURI === K
              ? rn(n, t, r)
              : !!(qt === `application/xhtml+xml` && Bt[e.namespaceURI])
        : !1;
    },
    on = function (e) {
      M(t.removed, { element: e });
      try {
        C(e).removeChild(e);
      } catch {
        if ((b(e), !C(e)))
          throw le(
            `a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place`,
          );
      }
    },
    sn = function (e) {
      un(e);
      let t = S(e);
      if (t) {
        let e = [];
        (A(t, (t) => {
          M(e, t);
        }),
          A(e, (e) => {
            try {
              b(e);
            } catch {}
          }));
      }
      let n = O(e);
      if (n)
        for (let t = n.length - 1; t >= 0; --t) {
          let r = n[t],
            i = r && r.name;
          if (typeof i == `string`)
            try {
              e.removeAttribute(i);
            } catch {}
        }
    },
    cn = function (e, n) {
      try {
        M(t.removed, { attribute: n.getAttributeNode(e), from: n });
      } catch {
        M(t.removed, { attribute: null, from: n });
      }
      if ((n.removeAttribute(e), e === `is`)) {
        if (xt || St)
          try {
            on(n);
          } catch {}
        else
          try {
            n.setAttribute(e, ``);
          } catch {}
      }
    },
    ln = function (e) {
      let t = O(e);
      if (t)
        for (let n = t.length - 1; n >= 0; --n) {
          let r = t[n],
            i = r && r.name;
          if (!(typeof i != `string` || U[q(i)]))
            try {
              e.removeAttribute(i);
            } catch {}
        }
    },
    un = function (e) {
      let t = [e];
      for (; t.length > 0;) {
        let e = t.pop();
        (k ? k(e) : e.nodeType) === B.element && ln(e);
        let n = S(e);
        if (n) for (let e = n.length - 1; e >= 0; --e) t.push(n[e]);
      }
    },
    dn = function (e) {
      if (!ht) return;
      let t = [e];
      for (; t.length > 0;) {
        let e = t.pop(),
          n = k ? k(e) : e.nodeType;
        if (n === B.processingInstruction || (n === B.comment && z(Me, e.data))) {
          try {
            b(e);
          } catch {}
          continue;
        }
        if (n === B.element) {
          let t = e,
            n = q(I ? I(e) : e.nodeName);
          try {
            (t.hasAttribute && t.hasAttribute(`patchsrc`) && t.removeAttribute(`patchsrc`),
              t.hasAttribute &&
                t.hasAttribute(`for`) &&
                n !== `label` &&
                n !== `output` &&
                t.removeAttribute(`for`));
          } catch {}
        }
        let r = S(e);
        if (r) for (let e = r.length - 1; e >= 0; --e) t.push(r[e]);
      }
    },
    fn = function (e) {
      let t = null,
        r = null;
      if (bt) e = `<remove></remove>` + e;
      else {
        let t = ne(e, /^[\r\n\t ]+/);
        r = t && t[0];
      }
      qt === `application/xhtml+xml` &&
        Rt === K &&
        (e =
          `<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>` + e + `</body></html>`);
      let i = L ? He(e) : e;
      if (Rt === K)
        try {
          t = new l().parseFromString(i, qt);
        } catch {}
      if (!t || !t.documentElement) {
        t = Ke.createDocument(Rt, `template`, null);
        try {
          t.documentElement.innerHTML = zt ? se : i;
        } catch {}
      }
      let a = t.body || t.documentElement;
      return (
        e && r && a.insertBefore(n.createTextNode(r), a.childNodes[0] || null),
        Rt === K ? Ye.call(t, gt ? `html` : `body`)[0] : gt ? t.documentElement : a
      );
    },
    pn = function (e) {
      let t = oe ? oe(e) : e.ownerDocument;
      return qe.call(
        t || e,
        e,
        c.SHOW_ELEMENT |
          c.SHOW_COMMENT |
          c.SHOW_TEXT |
          c.SHOW_PROCESSING_INSTRUCTION |
          c.SHOW_CDATA_SECTION,
        null,
      );
    },
    mn = function (e) {
      return ((e = re(e, Ze, ` `)), (e = re(e, Qe, ` `)), (e = re(e, $e, ` `)), e);
    },
    hn = function (e) {
      e.normalize();
      let t = oe ? oe(e) : e.ownerDocument,
        n = qe.call(
          t || e,
          e,
          c.SHOW_TEXT | c.SHOW_COMMENT | c.SHOW_CDATA_SECTION | c.SHOW_PROCESSING_INSTRUCTION,
          null,
        ),
        r = n.nextNode();
      for (; r;) ((r.data = mn(r.data)), (r = n.nextNode()));
      let i = e.querySelectorAll?.call(e, `template`);
      i &&
        A(i, (e) => {
          _n(e.content) && hn(e.content);
        });
    },
    gn = function (e) {
      let t = I ? I(e) : null;
      return typeof t != `string` || q(t) !== `form`
        ? !1
        : typeof e.nodeName != `string` ||
            typeof e.textContent != `string` ||
            typeof e.removeChild != `function` ||
            e.attributes !== O(e) ||
            typeof e.removeAttribute != `function` ||
            typeof e.setAttribute != `function` ||
            typeof e.namespaceURI != `string` ||
            typeof e.insertBefore != `function` ||
            typeof e.hasChildNodes != `function` ||
            e.nodeType !== k(e) ||
            e.childNodes !== S(e);
    },
    _n = function (e) {
      if (!k || typeof e != `object` || !e) return !1;
      try {
        return k(e) === B.documentFragment;
      } catch {
        return !1;
      }
    },
    vn = function (e) {
      if (!k || typeof e != `object` || !e) return !1;
      try {
        return typeof k(e) == `number`;
      } catch {
        return !1;
      }
    };
  function J(e, n, r) {
    e.length !== 0 &&
      A(e, (e) => {
        e.call(t, n, r, Yt);
      });
  }
  let yn = function (e, t) {
      return !!(
        (ht &&
          e.hasChildNodes() &&
          !vn(e.firstElementChild) &&
          z(je, e.textContent) &&
          z(je, e.innerHTML)) ||
        (ht && e.namespaceURI === K && t === `style` && vn(e.firstElementChild)) ||
        e.nodeType === B.processingInstruction ||
        (ht && e.nodeType === B.comment && z(Me, e.data))
      );
    },
    bn = function (e, t, n) {
      if (
        !ct[t] &&
        Tn(t) &&
        ((W.tagNameCheck instanceof RegExp && z(W.tagNameCheck, t)) ||
          (W.tagNameCheck instanceof Function && W.tagNameCheck(t)))
      )
        return !1;
      if (Dt && !At[t]) {
        let t = C(e),
          r = S(e);
        if (r && t) {
          let i = r.length;
          for (let a = i - 1; a >= 0; --a) {
            let i = e === n ? p(r[a], !0) : r[a];
            t.insertBefore(i, x(e));
          }
        }
      }
      return (on(e), !0);
    },
    xn = function (e, t, n, r) {
      return e.length === 0 ? t : t === n || t === r ? m(t) : t;
    },
    Sn = function (e, n) {
      if ((J(V.beforeSanitizeElements, e, null), e !== n && C(e) === null))
        return (Ot && un(e), !0);
      if (gn(e)) return (on(e), !0);
      let r = q(I ? I(e) : e.nodeName);
      if (
        ((H = xn(V.uponSanitizeElement, H, ot, vt)),
        J(V.uponSanitizeElement, e, { tagName: r, allowedTags: H }),
        e !== n && C(e) === null)
      )
        return (Ot && un(e), !0);
      if (yn(e, r)) return (on(e), !0);
      if (ct[r] || (!(G.tagCheck instanceof Function && G.tagCheck(r)) && !H[r])) {
        let t = bn(e, r, n);
        return (t === !1 && J(V.afterSanitizeElements, e, null), t);
      }
      if (
        ((k ? k(e) : e.nodeType) === B.element && !an(e)) ||
        ((r === `noscript` || r === `noembed` || r === `noframes`) && z(Ne, e.innerHTML))
      )
        return (on(e), !0);
      if (mt && e.nodeType === B.text) {
        let n = mn(e.textContent);
        e.textContent !== n && (M(t.removed, { element: e.cloneNode() }), (e.textContent = n));
      }
      return (J(V.afterSanitizeElements, e, null), !1);
    },
    Cn = function (e, t, r) {
      if (
        lt[t] ||
        (ht && t === `patchsrc`) ||
        (ht && t === `for` && e !== `label` && e !== `output`) ||
        (wt && (t === `id` || t === `name`) && (r in n || r in Xt))
      )
        return !1;
      let i = U[t] || (G.attributeCheck instanceof Function && G.attributeCheck(t, e));
      if (!(dt && z(et, t)) && !(ut && z(tt, t))) {
        if (!i) {
          if (
            !(
              (Tn(e) &&
                ((W.tagNameCheck instanceof RegExp && z(W.tagNameCheck, e)) ||
                  (W.tagNameCheck instanceof Function && W.tagNameCheck(e))) &&
                ((W.attributeNameCheck instanceof RegExp && z(W.attributeNameCheck, t)) ||
                  (W.attributeNameCheck instanceof Function && W.attributeNameCheck(t, e)))) ||
              (t === `is` &&
                W.allowCustomizedBuiltInElements &&
                ((W.tagNameCheck instanceof RegExp && z(W.tagNameCheck, r)) ||
                  (W.tagNameCheck instanceof Function && W.tagNameCheck(r))))
            )
          )
            return !1;
        } else if (
          !Pt[t] &&
          !z(at, re(r, rt, ``)) &&
          !(
            (t === `src` || t === `xlink:href` || t === `href`) &&
            e !== `script` &&
            ie(r, `data:`) === 0 &&
            Mt[e]
          ) &&
          !(ft && !z(nt, re(r, rt, ``))) &&
          r
        )
          return !1;
      }
      return !0;
    },
    wn = f({}, [
      `annotation-xml`,
      `color-profile`,
      `font-face`,
      `font-face-format`,
      `font-face-name`,
      `font-face-src`,
      `font-face-uri`,
      `missing-glyph`,
    ]),
    Tn = function (e) {
      return !wn[F(e)] && z(it, e);
    },
    En = function (e, t, n, r) {
      if (L && typeof u == `object` && typeof u.getAttributeType == `function` && !n)
        switch (u.getAttributeType(e, t)) {
          case `TrustedHTML`:
            return He(r);
          case `TrustedScriptURL`:
            return Ue(r);
        }
      return r;
    },
    Dn = function (e, n, r, i) {
      try {
        (r ? e.setAttributeNS(r, n, i) : e.setAttribute(n, i), gn(e) ? on(e) : j(t.removed));
      } catch {
        cn(n, e);
      }
    },
    On = function (e) {
      J(V.beforeSanitizeAttributes, e, null);
      let t = e.attributes;
      if (!t || gn(e)) return;
      U = xn(V.uponSanitizeAttribute, U, st, yt);
      let n = {
          attrName: ``,
          attrValue: ``,
          keepAttr: !0,
          allowedAttributes: U,
          forceKeepAttr: void 0,
        },
        r = t.length,
        i = q(e.nodeName);
      for (; r--;) {
        let a = t[r],
          o = a.name,
          s = a.namespaceURI,
          c = a.value,
          l = q(o),
          u = c,
          d = o === `value` ? u : ae(u);
        if (
          ((n.attrName = l),
          (n.attrValue = d),
          (n.keepAttr = !0),
          (n.forceKeepAttr = void 0),
          J(V.uponSanitizeAttribute, e, n),
          (d = n.attrValue),
          Tt && (l === `id` || l === `name`) && ie(d, Et) !== 0 && (cn(o, e), (d = Et + d)),
          ht &&
            z(
              /((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i,
              d,
            ))
        ) {
          cn(o, e);
          continue;
        }
        if (l === `attributename` && ne(d, `href`)) {
          cn(o, e);
          continue;
        }
        if (!n.forceKeepAttr) {
          if (!n.keepAttr) {
            cn(o, e);
            continue;
          }
          if (!pt && z(Pe, d)) {
            cn(o, e);
            continue;
          }
          if ((mt && (d = mn(d)), !Cn(i, l, d))) {
            cn(o, e);
            continue;
          }
          ((d = En(i, l, s, d)), d !== u && Dn(e, o, s, d));
        }
      }
      J(V.afterSanitizeAttributes, e, null);
    },
    Y = function (e) {
      let t = null,
        n = pn(e);
      for (J(V.beforeSanitizeShadowDOM, e, null); (t = n.nextNode());)
        if (
          (J(V.uponSanitizeShadowNode, t, null),
          Sn(t, e),
          On(t),
          _n(t.content) && Y(t.content),
          (k ? k(t) : t.nodeType) === B.element)
        ) {
          let e = D(t);
          _n(e) && (kn(e), Y(e));
        }
      J(V.afterSanitizeShadowDOM, e, null);
    },
    kn = function (e) {
      let t = [{ node: e, shadow: null }];
      for (; t.length > 0;) {
        let e = t.pop();
        if (e.shadow) {
          Y(e.shadow);
          continue;
        }
        let n = e.node,
          r = (k ? k(n) : n.nodeType) === B.element,
          i = S(n);
        if (i) for (let e = i.length - 1; e >= 0; --e) t.push({ node: i[e], shadow: null });
        if (r) {
          let e = I ? I(n) : null;
          if (typeof e == `string` && q(e) === `template`) {
            let e = n.content;
            _n(e) && t.push({ node: e, shadow: null });
          }
        }
        if (r) {
          let e = D(n);
          _n(e) && t.push({ node: null, shadow: e }, { node: e, shadow: null });
        }
      }
    };
  return (
    (t.sanitize = function (e) {
      let n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {},
        i = null,
        a = null,
        o = null,
        s = null;
      if (
        ((zt = !e),
        zt && (e = `<!-->`),
        typeof e != `string` && !vn(e) && ((e = h(e)), typeof e != `string`))
      )
        throw le(`dirty is not a string, aborting`);
      if (!t.isSupported) return e;
      (_t ? ((H = vt), (U = yt)) : Qt(n),
        (V.uponSanitizeElement.length > 0 || V.uponSanitizeAttribute.length > 0) && (H = m(H)),
        V.uponSanitizeAttribute.length > 0 && (U = m(U)),
        (t.removed = []));
      let c = Ot && typeof e != `string` && vn(e);
      if (c) {
        dn(e);
        let t = I ? I(e) : e.nodeName;
        if (typeof t == `string`) {
          let n = q(t);
          if (!H[n] || ct[n])
            throw (sn(e), le(`root node is forbidden and cannot be sanitized in-place`));
        }
        if (gn(e)) throw (sn(e), le(`root node is clobbered and cannot be sanitized in-place`));
        try {
          kn(e);
        } catch (t) {
          throw (sn(e), t);
        }
      } else if (vn(e))
        ((i = fn(`<!---->`)),
          (a = i.ownerDocument.importNode(e, !0)),
          (a.nodeType === B.element && a.nodeName === `BODY`) || a.nodeName === `HTML`
            ? (i = a)
            : i.appendChild(a),
          kn(a));
      else {
        if (!xt && !mt && !gt && e.indexOf(`<`) === -1) return L && Ct ? He(e) : e;
        if (((i = fn(e)), !i)) return xt ? null : Ct ? se : ``;
      }
      i && bt && on(i.firstChild);
      let l = c ? e : i;
      try {
        let e = pn(l);
        for (; (o = e.nextNode());) (Sn(o, l), On(o), _n(o.content) && Y(o.content));
      } catch (n) {
        throw (
          c &&
            (sn(e),
            A(t.removed, (e) => {
              e.element && un(e.element);
            })),
          n
        );
      }
      if (c)
        return (
          A(t.removed, (e) => {
            e.element && un(e.element);
          }),
          mt && hn(e),
          e
        );
      if (xt) {
        if ((mt && hn(i), St))
          for (s = Je.call(i.ownerDocument); i.firstChild;) s.appendChild(i.firstChild);
        else s = i;
        return ((U.shadowroot || U.shadowrootmode) && (s = Xe.call(r, s, !0)), s);
      }
      let u = gt ? i.outerHTML : i.innerHTML;
      return (
        gt &&
          H[`!doctype`] &&
          i.ownerDocument &&
          i.ownerDocument.doctype &&
          i.ownerDocument.doctype.name &&
          z(ke, i.ownerDocument.doctype.name) &&
          (u =
            `<!DOCTYPE ` +
            i.ownerDocument.doctype.name +
            `>
` +
            u),
        mt && (u = mn(u)),
        L && Ct ? He(u) : u
      );
    }),
    (t.setConfig = function () {
      let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      (Qt(e), (_t = !0), (vt = H), (yt = U));
    }),
    (t.clearConfig = function () {
      ((Yt = null), (_t = !1), (vt = null), (yt = null), (L = ce), (se = ``));
    }),
    (t.isValidAttribute = function (e, t, n) {
      Yt || Qt({});
      let r = q(e),
        i = q(t);
      return Cn(r, i, n);
    }),
    (t.addHook = function (e, t) {
      typeof t == `function` && R(V, e) && M(V[e], t);
    }),
    (t.removeHook = function (e, t) {
      if (R(V, e)) {
        if (t !== void 0) {
          let n = ee(V[e], t);
          return n === -1 ? void 0 : N(V[e], n, 1)[0];
        }
        return j(V[e]);
      }
    }),
    (t.removeHooks = function (e) {
      R(V, e) && (V[e] = []);
    }),
    (t.removeAllHooks = function () {
      V = Le();
    }),
    t
  );
}
var y,
  b,
  x,
  S,
  C,
  w,
  T,
  E,
  D,
  O,
  k,
  A,
  ee,
  j,
  M,
  N,
  P,
  F,
  te,
  ne,
  re,
  ie,
  ae,
  I,
  oe,
  L,
  se,
  R,
  ce,
  z,
  le,
  ue,
  de,
  fe,
  pe,
  me,
  he,
  ge,
  _e,
  ve,
  ye,
  be,
  xe,
  Se,
  Ce,
  we,
  Te,
  Ee,
  De,
  Oe,
  ke,
  Ae,
  je,
  Me,
  Ne,
  Pe,
  B,
  Fe,
  Ie,
  Le,
  Re,
  ze;
function Be() {
  return (Be = t(() => {
    ((y = Object.entries),
      (b = Object.setPrototypeOf),
      (x = Object.isFrozen),
      (S = Object.getPrototypeOf),
      (C = Object.getOwnPropertyDescriptor),
      (w = Object.freeze),
      (T = Object.seal),
      (E = Object.create),
      (D = typeof Reflect < `u` && Reflect),
      (O = D.apply),
      (k = D.construct),
      (w ||= function (e) {
        return e;
      }),
      (T ||= function (e) {
        return e;
      }),
      (O ||= function (e, t) {
        var n = [...arguments].slice(2);
        return e.apply(t, n);
      }),
      (k ||= function (e) {
        return new e(...[...arguments].slice(1));
      }),
      (A = u(Array.prototype.forEach)),
      (ee = u(Array.prototype.lastIndexOf)),
      (j = u(Array.prototype.pop)),
      (M = u(Array.prototype.push)),
      (N = u(Array.prototype.splice)),
      (P = Array.isArray),
      (F = u(String.prototype.toLowerCase)),
      (te = u(String.prototype.toString)),
      (ne = u(String.prototype.match)),
      (re = u(String.prototype.replace)),
      (ie = u(String.prototype.indexOf)),
      (ae = u(String.prototype.trim)),
      (I = u(Number.prototype.toString)),
      (oe = u(Boolean.prototype.toString)),
      (L = typeof BigInt > `u` ? null : u(BigInt.prototype.toString)),
      (se = typeof Symbol > `u` ? null : u(Symbol.prototype.toString)),
      (R = u(Object.prototype.hasOwnProperty)),
      (ce = u(Object.prototype.toString)),
      (z = u(RegExp.prototype.test)),
      (le = d(TypeError)),
      (ue = w(
        `a.abbr.acronym.address.area.article.aside.audio.b.bdi.bdo.big.blink.blockquote.body.br.button.canvas.caption.center.cite.code.col.colgroup.content.data.datalist.dd.decorator.del.details.dfn.dialog.dir.div.dl.dt.element.em.fieldset.figcaption.figure.font.footer.form.h1.h2.h3.h4.h5.h6.head.header.hgroup.hr.html.i.img.input.ins.kbd.label.legend.li.main.map.mark.marquee.menu.menuitem.meter.nav.nobr.ol.optgroup.option.output.p.picture.pre.progress.q.rp.rt.ruby.s.samp.search.section.select.shadow.slot.small.source.spacer.span.strike.strong.style.sub.summary.sup.table.tbody.td.template.textarea.tfoot.th.thead.time.tr.track.tt.u.ul.var.video.wbr`.split(
          `.`,
        ),
      )),
      (de = w(
        `svg.a.altglyph.altglyphdef.altglyphitem.animatecolor.animatemotion.animatetransform.circle.clippath.defs.desc.ellipse.enterkeyhint.exportparts.filter.font.g.glyph.glyphref.hkern.image.inputmode.line.lineargradient.marker.mask.metadata.mpath.part.path.pattern.polygon.polyline.radialgradient.rect.stop.style.switch.symbol.text.textpath.title.tref.tspan.view.vkern`.split(
          `.`,
        ),
      )),
      (fe = w([
        `feBlend`,
        `feColorMatrix`,
        `feComponentTransfer`,
        `feComposite`,
        `feConvolveMatrix`,
        `feDiffuseLighting`,
        `feDisplacementMap`,
        `feDistantLight`,
        `feDropShadow`,
        `feFlood`,
        `feFuncA`,
        `feFuncB`,
        `feFuncG`,
        `feFuncR`,
        `feGaussianBlur`,
        `feImage`,
        `feMerge`,
        `feMergeNode`,
        `feMorphology`,
        `feOffset`,
        `fePointLight`,
        `feSpecularLighting`,
        `feSpotLight`,
        `feTile`,
        `feTurbulence`,
      ])),
      (pe = w([
        `animate`,
        `color-profile`,
        `cursor`,
        `discard`,
        `font-face`,
        `font-face-format`,
        `font-face-name`,
        `font-face-src`,
        `font-face-uri`,
        `foreignobject`,
        `hatch`,
        `hatchpath`,
        `mesh`,
        `meshgradient`,
        `meshpatch`,
        `meshrow`,
        `missing-glyph`,
        `script`,
        `set`,
        `solidcolor`,
        `unknown`,
        `use`,
      ])),
      (me = w(
        `math.menclose.merror.mfenced.mfrac.mglyph.mi.mlabeledtr.mmultiscripts.mn.mo.mover.mpadded.mphantom.mroot.mrow.ms.mspace.msqrt.mstyle.msub.msup.msubsup.mtable.mtd.mtext.mtr.munder.munderover.mprescripts`.split(
          `.`,
        ),
      )),
      (he = w([
        `maction`,
        `maligngroup`,
        `malignmark`,
        `mlongdiv`,
        `mscarries`,
        `mscarry`,
        `msgroup`,
        `mstack`,
        `msline`,
        `msrow`,
        `semantics`,
        `annotation`,
        `annotation-xml`,
        `mprescripts`,
        `none`,
      ])),
      (ge = w([`#text`])),
      (_e = w(
        `accept.action.align.alt.autocapitalize.autocomplete.autopictureinpicture.autoplay.background.bgcolor.border.capture.cellpadding.cellspacing.checked.cite.class.clear.color.cols.colspan.command.commandfor.controls.controlslist.coords.crossorigin.datetime.decoding.default.dir.disabled.disablepictureinpicture.disableremoteplayback.download.draggable.enctype.enterkeyhint.exportparts.face.for.headers.height.hidden.high.href.hreflang.id.inert.inputmode.integrity.ismap.kind.label.lang.list.loading.loop.low.max.maxlength.media.method.min.minlength.multiple.muted.name.nonce.noshade.novalidate.nowrap.open.optimum.part.pattern.placeholder.playsinline.popover.popovertarget.popovertargetaction.poster.preload.pubdate.radiogroup.readonly.rel.required.rev.reversed.role.rows.rowspan.spellcheck.scope.selected.shape.size.sizes.slot.span.srclang.start.src.srcset.step.style.summary.tabindex.title.translate.type.usemap.valign.value.width.wrap.xmlns`.split(
          `.`,
        ),
      )),
      (ve = w(
        `accent-height.accumulate.additive.alignment-baseline.amplitude.ascent.attributename.attributetype.azimuth.basefrequency.baseline-shift.begin.bias.by.class.clip.clippathunits.clip-path.clip-rule.color.color-interpolation.color-interpolation-filters.color-profile.color-rendering.cx.cy.d.dx.dy.diffuseconstant.direction.display.divisor.dominant-baseline.dur.edgemode.elevation.end.exponent.fill.fill-opacity.fill-rule.filter.filterunits.flood-color.flood-opacity.font-family.font-size.font-size-adjust.font-stretch.font-style.font-variant.font-weight.fx.fy.g1.g2.glyph-name.glyphref.gradientunits.gradienttransform.height.href.id.image-rendering.in.in2.intercept.k.k1.k2.k3.k4.kerning.keypoints.keysplines.keytimes.lang.lengthadjust.letter-spacing.kernelmatrix.kernelunitlength.lighting-color.local.marker-end.marker-mid.marker-start.markerheight.markerunits.markerwidth.maskcontentunits.maskunits.max.mask.mask-type.media.method.mode.min.name.numoctaves.offset.operator.opacity.order.orient.orientation.origin.overflow.paint-order.path.pathlength.patterncontentunits.patterntransform.patternunits.points.preservealpha.preserveaspectratio.primitiveunits.r.rx.ry.radius.refx.refy.repeatcount.repeatdur.restart.result.rotate.scale.seed.shape-rendering.slope.specularconstant.specularexponent.spreadmethod.startoffset.stddeviation.stitchtiles.stop-color.stop-opacity.stroke-dasharray.stroke-dashoffset.stroke-linecap.stroke-linejoin.stroke-miterlimit.stroke-opacity.stroke.stroke-width.style.surfacescale.systemlanguage.tabindex.tablevalues.targetx.targety.transform.transform-origin.text-anchor.text-decoration.text-orientation.text-rendering.textlength.type.u1.u2.unicode.values.viewbox.visibility.version.vert-adv-y.vert-origin-x.vert-origin-y.width.word-spacing.wrap.writing-mode.xchannelselector.ychannelselector.x.x1.x2.xmlns.y.y1.y2.z.zoomandpan`.split(
          `.`,
        ),
      )),
      (ye = w(
        `accent.accentunder.align.bevelled.close.columnalign.columnlines.columnspacing.columnspan.denomalign.depth.dir.display.displaystyle.encoding.fence.frame.height.href.id.largeop.length.linethickness.lquote.lspace.mathbackground.mathcolor.mathsize.mathvariant.maxsize.minsize.movablelimits.notation.numalign.open.rowalign.rowlines.rowspacing.rowspan.rspace.rquote.scriptlevel.scriptminsize.scriptsizemultiplier.selection.separator.separators.stretchy.subscriptshift.supscriptshift.symmetric.voffset.width.xmlns`.split(
          `.`,
        ),
      )),
      (be = w([`xlink:href`, `xml:id`, `xlink:title`, `xml:space`, `xmlns:xlink`])),
      (xe = T(/{{[\w\W]*|^[\w\W]*}}/g)),
      (Se = T(/<%[\w\W]*|^[\w\W]*%>/g)),
      (Ce = T(/\${[\w\W]*/g)),
      (we = T(/^data-[\-\w.\u00B7-\uFFFF]+$/)),
      (Te = T(/^aria-[\-\w]+$/)),
      (Ee = T(
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      )),
      (De = T(/^(?:\w+script|data):/i)),
      (Oe = T(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g)),
      (ke = T(/^html$/i)),
      (Ae = T(/^[a-z][.\w]*(-[.\w]+)+$/i)),
      (je = T(/<[/\w!]/g)),
      (Me = T(/<[/\w]/g)),
      (Ne = T(/<\/no(script|embed|frames)/i)),
      (Pe = T(/\/>/i)),
      (B = {
        element: 1,
        attribute: 2,
        text: 3,
        cdataSection: 4,
        entityReference: 5,
        entityNode: 6,
        processingInstruction: 7,
        comment: 8,
        document: 9,
        documentType: 10,
        documentFragment: 11,
        notation: 12,
      }),
      (Fe = function () {
        return typeof window > `u` ? null : window;
      }),
      (Ie = function (e, t) {
        if (typeof e != `object` || typeof e.createPolicy != `function`) return null;
        let n = null,
          r = `data-tt-policy-suffix`;
        t && t.hasAttribute(r) && (n = t.getAttribute(r));
        let i = `dompurify` + (n ? `#` + n : ``);
        try {
          return e.createPolicy(i, {
            createHTML(e) {
              return e;
            },
            createScriptURL(e) {
              return e;
            },
          });
        } catch {
          return (console.warn(`TrustedTypes policy ` + i + ` could not be created.`), null);
        }
      }),
      (Le = function () {
        return {
          afterSanitizeAttributes: [],
          afterSanitizeElements: [],
          afterSanitizeShadowDOM: [],
          beforeSanitizeAttributes: [],
          beforeSanitizeElements: [],
          beforeSanitizeShadowDOM: [],
          uponSanitizeAttribute: [],
          uponSanitizeElement: [],
          uponSanitizeShadowNode: [],
        };
      }),
      (Re = function (e, t, n, r) {
        return R(e, t) && P(e[t]) ? f(r.base ? m(r.base) : {}, e[t], r.transform) : n;
      }),
      (ze = v()));
  }))();
}
var Ve = r((e, t) => {
    function n(e) {
      return (
        e instanceof Map
          ? (e.clear =
              e.delete =
              e.set =
                function () {
                  throw Error(`map is read-only`);
                })
          : e instanceof Set &&
            (e.add =
              e.clear =
              e.delete =
                function () {
                  throw Error(`set is read-only`);
                }),
        Object.freeze(e),
        Object.getOwnPropertyNames(e).forEach((t) => {
          let r = e[t],
            i = typeof r;
          (i === `object` || i === `function`) && !Object.isFrozen(r) && n(r);
        }),
        e
      );
    }
    var r = class {
      constructor(e) {
        (e.data === void 0 && (e.data = {}), (this.data = e.data), (this.isMatchIgnored = !1));
      }
      ignoreMatch() {
        this.isMatchIgnored = !0;
      }
    };
    function i(e) {
      return e
        .replace(/&/g, `&amp;`)
        .replace(/</g, `&lt;`)
        .replace(/>/g, `&gt;`)
        .replace(/"/g, `&quot;`)
        .replace(/'/g, `&#x27;`);
    }
    function a(e, ...t) {
      let n = Object.create(null);
      for (let t in e) n[t] = e[t];
      return (
        t.forEach(function (e) {
          for (let t in e) n[t] = e[t];
        }),
        n
      );
    }
    var o = `</span>`,
      s = (e) => !!e.scope,
      c = (e, { prefix: t }) => {
        if (e.startsWith(`language:`)) return e.replace(`language:`, `language-`);
        if (e.includes(`.`)) {
          let n = e.split(`.`);
          return [`${t}${n.shift()}`, ...n.map((e, t) => `${e}${`_`.repeat(t + 1)}`)].join(` `);
        }
        return `${t}${e}`;
      },
      l = class {
        constructor(e, t) {
          ((this.buffer = ``), (this.classPrefix = t.classPrefix), e.walk(this));
        }
        addText(e) {
          this.buffer += i(e);
        }
        openNode(e) {
          if (!s(e)) return;
          let t = c(e.scope, { prefix: this.classPrefix });
          this.span(t);
        }
        closeNode(e) {
          s(e) && (this.buffer += o);
        }
        value() {
          return this.buffer;
        }
        span(e) {
          this.buffer += `<span class="${e}">`;
        }
      },
      u = (e = {}) => {
        let t = { children: [] };
        return (Object.assign(t, e), t);
      },
      d = class e {
        constructor() {
          ((this.rootNode = u()), (this.stack = [this.rootNode]));
        }
        get top() {
          return this.stack[this.stack.length - 1];
        }
        get root() {
          return this.rootNode;
        }
        add(e) {
          this.top.children.push(e);
        }
        openNode(e) {
          let t = u({ scope: e });
          (this.add(t), this.stack.push(t));
        }
        closeNode() {
          if (this.stack.length > 1) return this.stack.pop();
        }
        closeAllNodes() {
          for (; this.closeNode(););
        }
        toJSON() {
          return JSON.stringify(this.rootNode, null, 4);
        }
        walk(e) {
          return this.constructor._walk(e, this.rootNode);
        }
        static _walk(e, t) {
          return (
            typeof t == `string`
              ? e.addText(t)
              : t.children &&
                (e.openNode(t), t.children.forEach((t) => this._walk(e, t)), e.closeNode(t)),
            e
          );
        }
        static _collapse(t) {
          typeof t != `string` &&
            t.children &&
            (t.children.every((e) => typeof e == `string`)
              ? (t.children = [t.children.join(``)])
              : t.children.forEach((t) => {
                  e._collapse(t);
                }));
        }
      },
      f = class extends d {
        constructor(e) {
          (super(), (this.options = e));
        }
        addText(e) {
          e !== `` && this.add(e);
        }
        startScope(e) {
          this.openNode(e);
        }
        endScope() {
          this.closeNode();
        }
        __addSublanguage(e, t) {
          let n = e.root;
          (t && (n.scope = `language:${t}`), this.add(n));
        }
        toHTML() {
          return new l(this, this.options).value();
        }
        finalize() {
          return (this.closeAllNodes(), !0);
        }
      };
    function p(e) {
      return e ? (typeof e == `string` ? e : e.source) : null;
    }
    function m(e) {
      return _(`(?=`, e, `)`);
    }
    function h(e) {
      return _(`(?:`, e, `)*`);
    }
    function g(e) {
      return _(`(?:`, e, `)?`);
    }
    function _(...e) {
      return e.map((e) => p(e)).join(``);
    }
    function v(e) {
      let t = e[e.length - 1];
      return typeof t == `object` && t.constructor === Object ? (e.splice(e.length - 1, 1), t) : {};
    }
    function y(...e) {
      return `(` + (v(e).capture ? `` : `?:`) + e.map((e) => p(e)).join(`|`) + `)`;
    }
    function b(e) {
      return RegExp(e.toString() + `|`).exec(``).length - 1;
    }
    function x(e, t) {
      let n = e && e.exec(t);
      return n && n.index === 0;
    }
    var S = new RegExp(
      y(
        /\[(?:[^\\\]]|\\.)*\]/,
        /\(\?<(?![=!])[^>]+>/,
        /\(\?'[^']+'/,
        /\(\??/,
        /\\([1-9][0-9]*)/,
        /\\./,
      ),
    );
    function C(e, { joinWith: t }) {
      let n = 0;
      return e
        .map((e) => {
          n += 1;
          let t = n,
            r = p(e),
            i = ``;
          for (; r.length > 0;) {
            let e = S.exec(r);
            if (!e) {
              i += r;
              break;
            }
            ((i += r.substring(0, e.index)),
              (r = r.substring(e.index + e[0].length)),
              e[0][0] === `\\` && e[1]
                ? (i += `\\` + String(Number(e[1]) + t))
                : ((i += e[0]), (e[0] === `(` || /^\(\?[<']/.test(e[0])) && n++));
          }
          return i;
        })
        .map((e) => `(${e})`)
        .join(t);
    }
    var w = /\b\B/,
      T = `[a-zA-Z]\\w*`,
      E = `[a-zA-Z_]\\w*`,
      D = `\\b\\d+(\\.\\d+)?`,
      O = `(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)`,
      k = `\\b(0b[01]+)`,
      A = `!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~`,
      ee = (e = {}) => {
        let t = /^#![ ]*\//;
        return (
          e.binary && (e.begin = _(t, /.*\b/, e.binary, /\b.*/)),
          a(
            {
              scope: `meta`,
              begin: t,
              end: /$/,
              relevance: 0,
              "on:begin": (e, t) => {
                e.index !== 0 && t.ignoreMatch();
              },
            },
            e,
          )
        );
      },
      j = { begin: `\\\\[\\s\\S]`, relevance: 0 },
      M = { scope: `string`, begin: `'`, end: `'`, illegal: `\\n`, contains: [j] },
      N = { scope: `string`, begin: `"`, end: `"`, illegal: `\\n`, contains: [j] },
      P = {
        begin:
          /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/,
      },
      F = function (e, t, n = {}) {
        let r = a({ scope: `comment`, begin: e, end: t, contains: [] }, n);
        r.contains.push({
          scope: `doctag`,
          begin: `[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)`,
          end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
          excludeBegin: !0,
          relevance: 0,
        });
        let i = y(
          `I`,
          `a`,
          `is`,
          `so`,
          `us`,
          `to`,
          `at`,
          `if`,
          `in`,
          `it`,
          `on`,
          /[A-Za-z]+['](d|ve|re|ll|t|s|n)/,
          /[A-Za-z]+[-][a-z]+/,
          /[A-Za-z][a-z]{2,}/,
        );
        return (r.contains.push({ begin: _(/[ ]+/, `(`, i, /[.]?[:]?([.][ ]|[ ])/, `){3}`) }), r);
      },
      te = F(`//`, `$`),
      ne = F(`/\\*`, `\\*/`),
      re = F(`#`, `$`),
      ie = Object.freeze({
        __proto__: null,
        APOS_STRING_MODE: M,
        BACKSLASH_ESCAPE: j,
        BINARY_NUMBER_MODE: { scope: `number`, begin: k, relevance: 0 },
        BINARY_NUMBER_RE: k,
        COMMENT: F,
        C_BLOCK_COMMENT_MODE: ne,
        C_LINE_COMMENT_MODE: te,
        C_NUMBER_MODE: { scope: `number`, begin: O, relevance: 0 },
        C_NUMBER_RE: O,
        END_SAME_AS_BEGIN: function (e) {
          return Object.assign(e, {
            "on:begin": (e, t) => {
              t.data._beginMatch = e[1];
            },
            "on:end": (e, t) => {
              t.data._beginMatch !== e[1] && t.ignoreMatch();
            },
          });
        },
        HASH_COMMENT_MODE: re,
        IDENT_RE: T,
        MATCH_NOTHING_RE: w,
        METHOD_GUARD: { begin: `\\.\\s*[a-zA-Z_]\\w*`, relevance: 0 },
        NUMBER_MODE: { scope: `number`, begin: D, relevance: 0 },
        NUMBER_RE: D,
        PHRASAL_WORDS_MODE: P,
        QUOTE_STRING_MODE: N,
        REGEXP_MODE: {
          scope: `regexp`,
          begin: /\/(?=[^/\n]*\/)/,
          end: /\/[gimuy]*/,
          contains: [j, { begin: /\[/, end: /\]/, relevance: 0, contains: [j] }],
        },
        RE_STARTERS_RE: A,
        SHEBANG: ee,
        TITLE_MODE: { scope: `title`, begin: T, relevance: 0 },
        UNDERSCORE_IDENT_RE: E,
        UNDERSCORE_TITLE_MODE: { scope: `title`, begin: E, relevance: 0 },
      });
    function ae(e, t) {
      e.input[e.index - 1] === `.` && t.ignoreMatch();
    }
    function I(e, t) {
      e.className !== void 0 && ((e.scope = e.className), delete e.className);
    }
    function oe(e, t) {
      t &&
        e.beginKeywords &&
        ((e.begin = `\\b(` + e.beginKeywords.split(` `).join(`|`) + `)(?!\\.)(?=\\b|\\s)`),
        (e.__beforeBegin = ae),
        (e.keywords = e.keywords || e.beginKeywords),
        delete e.beginKeywords,
        e.relevance === void 0 && (e.relevance = 0));
    }
    function L(e, t) {
      Array.isArray(e.illegal) && (e.illegal = y(...e.illegal));
    }
    function se(e, t) {
      if (e.match) {
        if (e.begin || e.end) throw Error(`begin & end are not supported with match`);
        ((e.begin = e.match), delete e.match);
      }
    }
    function R(e, t) {
      e.relevance === void 0 && (e.relevance = 1);
    }
    var ce = (e, t) => {
        if (!e.beforeMatch) return;
        if (e.starts) throw Error(`beforeMatch cannot be used with starts`);
        let n = Object.assign({}, e);
        (Object.keys(e).forEach((t) => {
          delete e[t];
        }),
          (e.keywords = n.keywords),
          (e.begin = _(n.beforeMatch, m(n.begin))),
          (e.starts = { relevance: 0, contains: [Object.assign(n, { endsParent: !0 })] }),
          (e.relevance = 0),
          delete n.beforeMatch);
      },
      z = [`of`, `and`, `for`, `in`, `not`, `or`, `if`, `then`, `parent`, `list`, `value`],
      le = `keyword`;
    function ue(e, t, n = le) {
      let r = Object.create(null);
      return (
        typeof e == `string`
          ? i(n, e.split(` `))
          : Array.isArray(e)
            ? i(n, e)
            : Object.keys(e).forEach(function (n) {
                Object.assign(r, ue(e[n], t, n));
              }),
        r
      );
      function i(e, n) {
        (t && (n = n.map((e) => e.toLowerCase())),
          n.forEach(function (t) {
            let n = t.split(`|`);
            r[n[0]] = [e, de(n[0], n[1])];
          }));
      }
    }
    function de(e, t) {
      return t ? Number(t) : +!fe(e);
    }
    function fe(e) {
      return z.includes(e.toLowerCase());
    }
    var pe = {},
      me = (e) => {
        console.error(e);
      },
      he = (e, ...t) => {
        console.log(`WARN: ${e}`, ...t);
      },
      ge = (e, t) => {
        pe[`${e}/${t}`] || (console.log(`Deprecated as of ${e}. ${t}`), (pe[`${e}/${t}`] = !0));
      },
      _e = Error();
    function ve(e, t, { key: n }) {
      let r = 0,
        i = e[n],
        a = {},
        o = {};
      for (let e = 1; e <= t.length; e++) ((o[e + r] = i[e]), (a[e + r] = !0), (r += b(t[e - 1])));
      ((e[n] = o), (e[n]._emit = a), (e[n]._multi = !0));
    }
    function ye(e) {
      if (Array.isArray(e.begin)) {
        if (e.skip || e.excludeBegin || e.returnBegin)
          throw (me(`skip, excludeBegin, returnBegin not compatible with beginScope: {}`), _e);
        if (typeof e.beginScope != `object` || e.beginScope === null)
          throw (me(`beginScope must be object`), _e);
        (ve(e, e.begin, { key: `beginScope` }), (e.begin = C(e.begin, { joinWith: `` })));
      }
    }
    function be(e) {
      if (Array.isArray(e.end)) {
        if (e.skip || e.excludeEnd || e.returnEnd)
          throw (me(`skip, excludeEnd, returnEnd not compatible with endScope: {}`), _e);
        if (typeof e.endScope != `object` || e.endScope === null)
          throw (me(`endScope must be object`), _e);
        (ve(e, e.end, { key: `endScope` }), (e.end = C(e.end, { joinWith: `` })));
      }
    }
    function xe(e) {
      e.scope &&
        typeof e.scope == `object` &&
        e.scope !== null &&
        ((e.beginScope = e.scope), delete e.scope);
    }
    function Se(e) {
      (xe(e),
        typeof e.beginScope == `string` && (e.beginScope = { _wrap: e.beginScope }),
        typeof e.endScope == `string` && (e.endScope = { _wrap: e.endScope }),
        ye(e),
        be(e));
    }
    function Ce(e) {
      function t(t, n) {
        return new RegExp(
          p(t),
          `m` + (e.case_insensitive ? `i` : ``) + (e.unicodeRegex ? `u` : ``) + (n ? `g` : ``),
        );
      }
      class n {
        constructor() {
          ((this.matchIndexes = {}), (this.regexes = []), (this.matchAt = 1), (this.position = 0));
        }
        addRule(e, t) {
          ((t.position = this.position++),
            (this.matchIndexes[this.matchAt] = t),
            this.regexes.push([t, e]),
            (this.matchAt += b(e) + 1));
        }
        compile() {
          this.regexes.length === 0 && (this.exec = () => null);
          let e = this.regexes.map((e) => e[1]);
          ((this.matcherRe = t(C(e, { joinWith: `|` }), !0)), (this.lastIndex = 0));
        }
        exec(e) {
          this.matcherRe.lastIndex = this.lastIndex;
          let t = this.matcherRe.exec(e);
          if (!t) return null;
          let n = t.findIndex((e, t) => t > 0 && e !== void 0),
            r = this.matchIndexes[n];
          return (t.splice(0, n), Object.assign(t, r));
        }
      }
      class r {
        constructor() {
          ((this.rules = []),
            (this.multiRegexes = []),
            (this.count = 0),
            (this.lastIndex = 0),
            (this.regexIndex = 0));
        }
        getMatcher(e) {
          if (this.multiRegexes[e]) return this.multiRegexes[e];
          let t = new n();
          return (
            this.rules.slice(e).forEach(([e, n]) => t.addRule(e, n)),
            t.compile(),
            (this.multiRegexes[e] = t),
            t
          );
        }
        resumingScanAtSamePosition() {
          return this.regexIndex !== 0;
        }
        considerAll() {
          this.regexIndex = 0;
        }
        addRule(e, t) {
          (this.rules.push([e, t]), t.type === `begin` && this.count++);
        }
        exec(e) {
          let t = this.getMatcher(this.regexIndex);
          t.lastIndex = this.lastIndex;
          let n = t.exec(e);
          if (this.resumingScanAtSamePosition() && !(n && n.index === this.lastIndex)) {
            let t = this.getMatcher(0);
            ((t.lastIndex = this.lastIndex + 1), (n = t.exec(e)));
          }
          return (
            n &&
              ((this.regexIndex += n.position + 1),
              this.regexIndex === this.count && this.considerAll()),
            n
          );
        }
      }
      function i(e) {
        let t = new r();
        return (
          e.contains.forEach((e) => t.addRule(e.begin, { rule: e, type: `begin` })),
          e.terminatorEnd && t.addRule(e.terminatorEnd, { type: `end` }),
          e.illegal && t.addRule(e.illegal, { type: `illegal` }),
          t
        );
      }
      function o(n, r) {
        let a = n;
        if (n.isCompiled) return a;
        ([I, se, Se, ce].forEach((e) => e(n, r)),
          e.compilerExtensions.forEach((e) => e(n, r)),
          (n.__beforeBegin = null),
          [oe, L, R].forEach((e) => e(n, r)),
          (n.isCompiled = !0));
        let s = null;
        return (
          typeof n.keywords == `object` &&
            n.keywords.$pattern &&
            ((n.keywords = Object.assign({}, n.keywords)),
            (s = n.keywords.$pattern),
            delete n.keywords.$pattern),
          (s ||= /\w+/),
          (n.keywords &&= ue(n.keywords, e.case_insensitive)),
          (a.keywordPatternRe = t(s, !0)),
          r &&
            ((n.begin ||= /\B|\b/),
            (a.beginRe = t(a.begin)),
            !n.end && !n.endsWithParent && (n.end = /\B|\b/),
            n.end && (a.endRe = t(a.end)),
            (a.terminatorEnd = p(a.end) || ``),
            n.endsWithParent &&
              r.terminatorEnd &&
              (a.terminatorEnd += (n.end ? `|` : ``) + r.terminatorEnd)),
          n.illegal && (a.illegalRe = t(n.illegal)),
          (n.contains ||= []),
          (n.contains = [].concat(
            ...n.contains.map(function (e) {
              return Te(e === `self` ? n : e);
            }),
          )),
          n.contains.forEach(function (e) {
            o(e, a);
          }),
          n.starts && o(n.starts, r),
          (a.matcher = i(a)),
          a
        );
      }
      if (((e.compilerExtensions ||= []), e.contains && e.contains.includes(`self`)))
        throw Error(
          "ERR: contains `self` is not supported at the top-level of a language.  See documentation.",
        );
      return ((e.classNameAliases = a(e.classNameAliases || {})), o(e));
    }
    function we(e) {
      return e ? e.endsWithParent || we(e.starts) : !1;
    }
    function Te(e) {
      return (
        e.variants &&
          !e.cachedVariants &&
          (e.cachedVariants = e.variants.map(function (t) {
            return a(e, { variants: null }, t);
          })),
        e.cachedVariants
          ? e.cachedVariants
          : we(e)
            ? a(e, { starts: e.starts ? a(e.starts) : null })
            : Object.isFrozen(e)
              ? a(e)
              : e
      );
    }
    var Ee = `11.12.0`,
      De = class extends Error {
        constructor(e, t) {
          (super(e), (this.name = `HTMLInjectionError`), (this.html = t));
        }
      },
      Oe = i,
      ke = a,
      Ae = Symbol(`nomatch`),
      je = 7,
      Me = function (e) {
        let t = Object.create(null),
          i = Object.create(null),
          a = [],
          o = !0,
          s = `Could not find the language '{}', did you forget to load/include a language module?`,
          c = { disableAutodetect: !0, name: `Plain text`, contains: [] },
          l = {
            ignoreUnescapedHTML: !1,
            throwUnescapedHTML: !1,
            noHighlightRe: /^(no-?highlight)$/i,
            languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
            classPrefix: `hljs-`,
            cssSelector: `pre code`,
            languages: null,
            __emitter: f,
          };
        function u(e) {
          return l.noHighlightRe.test(e);
        }
        function d(e) {
          let t = e.className + ` `;
          t += e.parentNode ? e.parentNode.className : ``;
          let n = l.languageDetectRe.exec(t);
          if (n) {
            let t = M(n[1]);
            return (
              t ||
                (he(s.replace(`{}`, n[1])),
                he(`Falling back to no-highlight mode for this block.`, e)),
              t ? n[1] : `no-highlight`
            );
          }
          return t.split(/\s+/).find((e) => u(e) || M(e));
        }
        function p(e, t, n) {
          let r = ``,
            i = ``;
          (typeof t == `object`
            ? ((r = e), (n = t.ignoreIllegals), (i = t.language))
            : (ge(`10.7.0`, `highlight(lang, code, ...args) has been deprecated.`),
              ge(
                `10.7.0`,
                `Please use highlight(code, options) instead.
https://github.com/highlightjs/highlight.js/issues/2277`,
              ),
              (i = e),
              (r = t)),
            n === void 0 && (n = !0));
          let a = { code: r, language: i };
          re(`before:highlight`, a);
          let o = a.result ? a.result : v(a.language, a.code, n);
          return ((o.code = a.code), re(`after:highlight`, o), o);
        }
        function v(e, n, i, a) {
          let c = Object.create(null);
          function u(e, t) {
            return e.keywords[t];
          }
          function d() {
            if (!A.keywords) {
              j.addText(N);
              return;
            }
            let e = 0;
            A.keywordPatternRe.lastIndex = 0;
            let t = A.keywordPatternRe.exec(N),
              n = ``;
            for (; t;) {
              n += N.substring(e, t.index);
              let r = D.case_insensitive ? t[0].toLowerCase() : t[0],
                i = u(A, r);
              if (i) {
                let [e, a] = i;
                if (
                  (j.addText(n),
                  (n = ``),
                  (c[r] = (c[r] || 0) + 1),
                  c[r] <= je && (P += a),
                  e.startsWith(`_`))
                )
                  n += t[0];
                else {
                  let n = D.classNameAliases[e] || e;
                  m(t[0], n);
                }
              } else n += t[0];
              ((e = A.keywordPatternRe.lastIndex), (t = A.keywordPatternRe.exec(N)));
            }
            ((n += N.substring(e)), j.addText(n));
          }
          function f() {
            if (N === ``) return;
            let e = null;
            if (typeof A.subLanguage == `string`) {
              if (!t[A.subLanguage]) {
                j.addText(N);
                return;
              }
              ((e = v(A.subLanguage, N, !0, ee[A.subLanguage])), (ee[A.subLanguage] = e._top));
            } else e = S(N, A.subLanguage.length ? A.subLanguage : null);
            (A.relevance > 0 && (P += e.relevance), j.__addSublanguage(e._emitter, e.language));
          }
          function p() {
            (A.subLanguage == null ? d() : f(), (N = ``));
          }
          function m(e, t) {
            e !== `` && (j.startScope(t), j.addText(e), j.endScope());
          }
          function h(e, t) {
            let n = 1,
              r = t.length - 1;
            for (; n <= r;) {
              if (!e._emit[n]) {
                n++;
                continue;
              }
              let r = D.classNameAliases[e[n]] || e[n],
                i = t[n];
              (r ? m(i, r) : ((N = i), d(), (N = ``)), n++);
            }
          }
          function g(e, t) {
            return (
              e.scope &&
                typeof e.scope == `string` &&
                j.openNode(D.classNameAliases[e.scope] || e.scope),
              e.beginScope &&
                (e.beginScope._wrap
                  ? (m(N, D.classNameAliases[e.beginScope._wrap] || e.beginScope._wrap), (N = ``))
                  : e.beginScope._multi && (h(e.beginScope, t), (N = ``))),
              (A = Object.create(e, { parent: { value: A } })),
              A
            );
          }
          function _(e, t, n) {
            let i = x(e.endRe, n);
            if (i) {
              if (e[`on:end`]) {
                let n = new r(e);
                (e[`on:end`](t, n), n.isMatchIgnored && (i = !1));
              }
              if (i) {
                for (; e.endsParent && e.parent;) e = e.parent;
                return e;
              }
            }
            if (e.endsWithParent) return _(e.parent, t, n);
          }
          function y(e) {
            return A.matcher.regexIndex === 0 ? ((N += e[0]), 1) : ((ne = !0), 0);
          }
          function b(e) {
            let t = e[0],
              n = e.rule,
              i = new r(n),
              a = [n.__beforeBegin, n[`on:begin`]];
            for (let n of a) if (n && (n(e, i), i.isMatchIgnored)) return y(t);
            return (
              n.skip
                ? (N += t)
                : (n.excludeBegin && (N += t), p(), !n.returnBegin && !n.excludeBegin && (N = t)),
              g(n, e),
              n.returnBegin ? 0 : t.length
            );
          }
          function C(e) {
            let t = e[0],
              r = n.substring(e.index),
              i = _(A, e, r);
            if (!i) return Ae;
            let a = A;
            A.endScope && A.endScope._wrap
              ? (p(), m(t, A.endScope._wrap))
              : A.endScope && A.endScope._multi
                ? (p(), h(A.endScope, e))
                : a.skip
                  ? (N += t)
                  : (a.returnEnd || a.excludeEnd || (N += t), p(), a.excludeEnd && (N = t));
            do
              (A.scope && j.closeNode(),
                !A.skip && !A.subLanguage && (P += A.relevance),
                (A = A.parent));
            while (A !== i.parent);
            return (i.starts && g(i.starts, e), a.returnEnd ? 0 : t.length);
          }
          function w() {
            let e = [];
            for (let t = A; t !== D; t = t.parent) t.scope && e.unshift(t.scope);
            e.forEach((e) => j.openNode(e));
          }
          let T = {};
          function E(t, r) {
            let a = r && r[0];
            if (((N += t), a == null)) return (p(), 0);
            if (T.type === `begin` && r.type === `end` && T.index === r.index && a === ``) {
              if (((N += n.slice(r.index, r.index + 1)), !o)) {
                let t = Error(`0 width match regex (${e})`);
                throw ((t.languageName = e), (t.badRule = T.rule), t);
              }
              return 1;
            }
            if (((T = r), r.type === `begin`)) return b(r);
            if (r.type === `illegal` && !i) {
              let e = Error(
                `Illegal lexeme "` + a + `" for mode "` + (A.scope || `<unnamed>`) + `"`,
              );
              throw ((e.mode = A), e);
            }
            if (r.type === `end`) {
              let e = C(r);
              if (e !== Ae) return e;
            }
            if (r.type === `illegal` && a === ``)
              return (
                r.index === n.length ||
                  (N += `
`),
                1
              );
            if (te > 1e5 && te > r.index * 3)
              throw Error(`potential infinite loop, way more iterations than matches`);
            return ((N += a), a.length);
          }
          let D = M(e);
          if (!D) throw (me(s.replace(`{}`, e)), Error(`Unknown language: "` + e + `"`));
          let O = Ce(D),
            k = ``,
            A = a || O,
            ee = {},
            j = new l.__emitter(l);
          w();
          let N = ``,
            P = 0,
            F = 0,
            te = 0,
            ne = !1;
          try {
            if (D.__emitTokens) D.__emitTokens(n, j);
            else {
              for (A.matcher.considerAll(); ;) {
                (te++, ne ? (ne = !1) : A.matcher.considerAll(), (A.matcher.lastIndex = F));
                let e = A.matcher.exec(n);
                if (!e) break;
                let t = E(n.substring(F, e.index), e);
                F = e.index + t;
              }
              E(n.substring(F));
            }
            return (
              j.finalize(),
              (k = j.toHTML()),
              { language: e, value: k, relevance: P, illegal: !1, _emitter: j, _top: A }
            );
          } catch (t) {
            if (t.message && t.message.includes(`Illegal`))
              return {
                language: e,
                value: Oe(n),
                illegal: !0,
                relevance: 0,
                _illegalBy: {
                  message: t.message,
                  index: F,
                  context: n.slice(F - 100, F + 100),
                  mode: t.mode,
                  resultSoFar: k,
                },
                _emitter: j,
              };
            if (o)
              return {
                language: e,
                value: Oe(n),
                illegal: !1,
                relevance: 0,
                errorRaised: t,
                _emitter: j,
                _top: A,
              };
            throw t;
          }
        }
        function b(e) {
          let t = {
            value: Oe(e),
            illegal: !1,
            relevance: 0,
            _top: c,
            _emitter: new l.__emitter(l),
          };
          return (t._emitter.addText(e), t);
        }
        function S(e, n) {
          n = n || l.languages || Object.keys(t);
          let r = b(e),
            i = n
              .filter(M)
              .filter(P)
              .map((t) => v(t, e, !1));
          i.unshift(r);
          let [a, o] = i.sort((e, t) => {
              if (e.relevance !== t.relevance) return t.relevance - e.relevance;
              if (e.language && t.language) {
                if (M(e.language).supersetOf === t.language) return 1;
                if (M(t.language).supersetOf === e.language) return -1;
              }
              return 0;
            }),
            s = a;
          return ((s.secondBest = o), s);
        }
        function C(e, t, n) {
          let r = (t && i[t]) || n;
          (e.classList.add(`hljs`), e.classList.add(`language-${r}`));
        }
        function w(e) {
          let t = null,
            n = d(e);
          if (u(n)) return;
          if ((re(`before:highlightElement`, { el: e, language: n }), e.dataset.highlighted)) {
            console.log(
              "Element previously highlighted. To highlight again, first unset `dataset.highlighted`.",
              e,
            );
            return;
          }
          if (
            e.children.length > 0 &&
            (l.ignoreUnescapedHTML ||
              (console.warn(
                `One of your code blocks includes unescaped HTML. This is a potentially serious security risk.`,
              ),
              console.warn(`https://github.com/highlightjs/highlight.js/wiki/security`),
              console.warn(`The element with unescaped HTML:`),
              console.warn(e)),
            l.throwUnescapedHTML)
          )
            throw new De(`One of your code blocks includes unescaped HTML.`, e.innerHTML);
          t = e;
          let r = t.textContent,
            i = n ? p(r, { language: n, ignoreIllegals: !0 }) : S(r);
          ((e.innerHTML = i.value),
            (e.dataset.highlighted = `yes`),
            C(e, n, i.language),
            (e.result = { language: i.language, re: i.relevance, relevance: i.relevance }),
            i.secondBest &&
              (e.secondBest = {
                language: i.secondBest.language,
                relevance: i.secondBest.relevance,
              }),
            re(`after:highlightElement`, { el: e, result: i, text: r }));
        }
        function T(e) {
          l = ke(l, e);
        }
        let E = () => {
          (k(), ge(`10.6.0`, `initHighlighting() deprecated.  Use highlightAll() now.`));
        };
        function D() {
          (k(), ge(`10.6.0`, `initHighlightingOnLoad() deprecated.  Use highlightAll() now.`));
        }
        let O = !1;
        function k() {
          function e() {
            k();
          }
          if (document.readyState === `loading`) {
            (O || window.addEventListener(`DOMContentLoaded`, e, !1), (O = !0));
            return;
          }
          document.querySelectorAll(l.cssSelector).forEach(w);
        }
        function A(n, r) {
          let i = null;
          try {
            i = r(e);
          } catch (e) {
            if ((me(`Language definition for '{}' could not be registered.`.replace(`{}`, n)), o))
              me(e);
            else throw e;
            i = c;
          }
          (i.name || (i.name = n),
            (t[n] = i),
            (i.rawDefinition = r.bind(null, e)),
            i.aliases && N(i.aliases, { languageName: n }));
        }
        function ee(e) {
          delete t[e];
          for (let t of Object.keys(i)) i[t] === e && delete i[t];
        }
        function j() {
          return Object.keys(t);
        }
        function M(e) {
          return ((e = (e || ``).toLowerCase()), t[e] || t[i[e]]);
        }
        function N(e, { languageName: t }) {
          (typeof e == `string` && (e = [e]),
            e.forEach((e) => {
              i[e.toLowerCase()] = t;
            }));
        }
        function P(e) {
          let t = M(e);
          return t && !t.disableAutodetect;
        }
        function F(e) {
          (e[`before:highlightBlock`] &&
            !e[`before:highlightElement`] &&
            (e[`before:highlightElement`] = (t) => {
              e[`before:highlightBlock`](Object.assign({ block: t.el }, t));
            }),
            e[`after:highlightBlock`] &&
              !e[`after:highlightElement`] &&
              (e[`after:highlightElement`] = (t) => {
                e[`after:highlightBlock`](Object.assign({ block: t.el }, t));
              }));
        }
        function te(e) {
          (F(e), a.push(e));
        }
        function ne(e) {
          let t = a.indexOf(e);
          t !== -1 && a.splice(t, 1);
        }
        function re(e, t) {
          let n = e;
          a.forEach(function (e) {
            e[n] && e[n](t);
          });
        }
        function ae(e) {
          return (
            ge(`10.7.0`, `highlightBlock will be removed entirely in v12.0`),
            ge(`10.7.0`, `Please use highlightElement now.`),
            w(e)
          );
        }
        (Object.assign(e, {
          highlight: p,
          highlightAuto: S,
          highlightAll: k,
          highlightElement: w,
          highlightBlock: ae,
          configure: T,
          initHighlighting: E,
          initHighlightingOnLoad: D,
          registerLanguage: A,
          unregisterLanguage: ee,
          listLanguages: j,
          getLanguage: M,
          registerAliases: N,
          autoDetection: P,
          inherit: ke,
          addPlugin: te,
          removePlugin: ne,
        }),
          (e.debugMode = function () {
            o = !1;
          }),
          (e.safeMode = function () {
            o = !0;
          }),
          (e.versionString = Ee),
          (e.regex = { concat: _, lookahead: m, either: y, optional: g, anyNumberOfTimes: h }));
        for (let e in ie) typeof ie[e] == `object` && n(ie[e]);
        return (Object.assign(e, ie), e);
      },
      Ne = Me({});
    ((Ne.newInstance = () => Me({})), (t.exports = Ne), (Ne.HighlightJS = Ne), (Ne.default = Ne));
  }),
  He,
  Ue;
function We() {
  return (We = t(() => {
    ((He = e(Ve())), (Ue = He.default));
  }))();
}
function Ge(e) {
  let t = e.regex,
    n = {},
    r = { begin: /\$\{/, end: /\}/, contains: [`self`, { begin: /:-/, contains: [n] }] };
  Object.assign(n, {
    className: `variable`,
    variants: [{ begin: t.concat(/\$[\w\d#@][\w\d_]*/, `(?![\\w\\d])(?![$])`) }, r],
  });
  let i = { className: `subst`, begin: /\$\(/, end: /\)/, contains: [e.BACKSLASH_ESCAPE] },
    a = e.inherit(e.COMMENT(), { match: [/(^|\s)/, /#.*$/], scope: { 2: `comment` } }),
    o = {
      begin: /<<-?\s*(?=\w+)/,
      starts: {
        contains: [e.END_SAME_AS_BEGIN({ begin: /(\w+)/, end: /(\w+)/, className: `string` })],
      },
    },
    s = { className: `string`, begin: /"/, end: /"/, contains: [e.BACKSLASH_ESCAPE, n, i] };
  i.contains.push(s);
  let c = { match: /\\"/ },
    l = { className: `string`, begin: /'/, end: /'/ },
    u = { match: /\\'/ },
    d = {
      begin: /\$?\(\(/,
      end: /\)\)/,
      contains: [{ begin: /\d+#[0-9a-f]+/, className: `number` }, e.NUMBER_MODE, n],
    },
    f = e.SHEBANG({
      binary: `(${[`fish`, `bash`, `zsh`, `sh`, `csh`, `ksh`, `tcsh`, `dash`, `scsh`].join(`|`)})`,
      relevance: 10,
    }),
    p = {
      className: `function`,
      begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
      returnBegin: !0,
      contains: [e.inherit(e.TITLE_MODE, { begin: /\w[\w\d_]*/ })],
      relevance: 0,
    },
    m = [
      `if`,
      `then`,
      `else`,
      `elif`,
      `fi`,
      `time`,
      `for`,
      `while`,
      `until`,
      `in`,
      `do`,
      `done`,
      `case`,
      `esac`,
      `coproc`,
      `function`,
      `select`,
    ],
    h = [`true`, `false`],
    g = { match: /(\/[a-z._-]+)+/ },
    _ = [
      `break`,
      `cd`,
      `continue`,
      `eval`,
      `exec`,
      `exit`,
      `export`,
      `getopts`,
      `hash`,
      `pwd`,
      `readonly`,
      `return`,
      `shift`,
      `test`,
      `times`,
      `trap`,
      `umask`,
      `unset`,
    ],
    v = [
      `alias`,
      `bind`,
      `builtin`,
      `caller`,
      `command`,
      `declare`,
      `echo`,
      `enable`,
      `help`,
      `let`,
      `local`,
      `logout`,
      `mapfile`,
      `printf`,
      `read`,
      `readarray`,
      `source`,
      `sudo`,
      `type`,
      `typeset`,
      `ulimit`,
      `unalias`,
    ],
    y =
      `autoload.bg.bindkey.bye.cap.chdir.clone.comparguments.compcall.compctl.compdescribe.compfiles.compgroups.compquote.comptags.comptry.compvalues.dirs.disable.disown.echotc.echoti.emulate.fc.fg.float.functions.getcap.getln.history.integer.jobs.kill.limit.log.noglob.popd.print.pushd.pushln.rehash.sched.setcap.setopt.stat.suspend.ttyctl.unfunction.unhash.unlimit.unsetopt.vared.wait.whence.where.which.zcompile.zformat.zftp.zle.zmodload.zparseopts.zprof.zpty.zregexparse.zsocket.zstyle.ztcp`.split(
        `.`,
      ),
    b =
      `chcon.chgrp.chown.chmod.cp.dd.df.dir.dircolors.ln.ls.mkdir.mkfifo.mknod.mktemp.mv.realpath.rm.rmdir.shred.sync.touch.truncate.vdir.b2sum.base32.base64.cat.cksum.comm.csplit.cut.expand.fmt.fold.head.join.md5sum.nl.numfmt.od.paste.ptx.pr.sha1sum.sha224sum.sha256sum.sha384sum.sha512sum.shuf.sort.split.sum.tac.tail.tr.tsort.unexpand.uniq.wc.arch.basename.chroot.date.dirname.du.echo.env.expr.factor.groups.hostid.id.link.logname.nice.nohup.nproc.pathchk.pinky.printenv.printf.pwd.readlink.runcon.seq.sleep.stat.stdbuf.stty.tee.test.timeout.tty.uname.unlink.uptime.users.who.whoami.yes`.split(
        `.`,
      );
  return {
    name: `Bash`,
    aliases: [`sh`, `zsh`],
    keywords: {
      $pattern: /\b[a-z][a-z0-9._-]+\b/,
      keyword: m,
      literal: h,
      built_in: [..._, ...v, `set`, `shopt`, ...y, ...b],
    },
    contains: [f, e.SHEBANG(), p, d, a, o, g, s, c, l, u, n],
  };
}
function Ke() {
  return (Ke = t(() => {}))();
}
function qe(e) {
  let t = e.regex,
    n = e.COMMENT(`//`, `$`, { contains: [{ begin: /\\\n/ }] }),
    r = `[a-zA-Z_]\\w*::`,
    i =
      `(?!struct)(decltype\\(auto\\)|` +
      t.optional(r) +
      `[a-zA-Z_]\\w*` +
      t.optional(`<[^<>]+>`) +
      `)`,
    a = { className: `type`, begin: `\\b[a-z\\d_]*_t\\b` },
    o = {
      className: `string`,
      variants: [
        { begin: `(u8?|U|L)?"`, end: `"`, illegal: `\\n`, contains: [e.BACKSLASH_ESCAPE] },
        {
          begin: `(u8?|U|L)?'(\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)|.)`,
          end: `'`,
          illegal: `.`,
        },
        e.END_SAME_AS_BEGIN({
          begin: /(?:u8?|U|L)?R"([^()\\\s"]{0,16})\(/,
          end: /\)([^()\\\s"]{0,16})"/,
        }),
      ],
    },
    s = {
      className: `number`,
      variants: [
        {
          begin: `[+-]?(?:(?:\\b[0-9](?:'?[0-9])*\\.(?:[0-9](?:'?[0-9])*)?|\\.[0-9](?:'?[0-9])*)(?:[Ee][+-]?[0-9](?:'?[0-9])*)?|\\b[0-9](?:'?[0-9])*[Ee][+-]?[0-9](?:'?[0-9])*|\\b0[Xx](?:[0-9A-Fa-f](?:'?[0-9A-Fa-f])*(?:\\.(?:[0-9A-Fa-f](?:'?[0-9A-Fa-f])*)?)?|\\.[0-9A-Fa-f](?:'?[0-9A-Fa-f])*)[Pp][+-]?[0-9](?:'?[0-9])*)(?:[Ff](?:16|32|64|128)?|(BF|bf)16|[Ll]|)`,
        },
        {
          begin: `[+-]?\\b(?:0[Bb][01](?:'?[01])*|0[Xx][0-9A-Fa-f](?:'?[0-9A-Fa-f])*|0(?:'?[0-7])*|[1-9](?:'?[0-9])*)(?:[Uu](?:LL?|ll?)|[Uu][Zz]?|(?:LL?|ll?)[Uu]?|[Zz][Uu]|)`,
        },
      ],
      relevance: 0,
    },
    c = [
      {
        scope: `meta`,
        begin: /#\s*include\b/,
        end: /$/,
        keywords: { keyword: `include` },
        contains: [
          { begin: /\\\n/ },
          o,
          { scope: `string`, begin: /<.*?>/ },
          n,
          e.C_BLOCK_COMMENT_MODE,
        ],
      },
      {
        className: `meta`,
        begin: /#\s*[a-z]+\b/,
        end: /$/,
        keywords: {
          keyword: `if else elif endif define undef warning error line pragma _Pragma ifdef ifndef include`,
        },
        contains: [
          { begin: /\\\n/, relevance: 0 },
          e.inherit(o, { className: `string` }),
          n,
          e.C_BLOCK_COMMENT_MODE,
        ],
      },
    ],
    l = { className: `title`, begin: t.optional(r) + e.IDENT_RE, relevance: 0 },
    u = t.optional(r) + e.IDENT_RE + `\\s*\\(`,
    d =
      `alignas.alignof.and.and_eq.asm.atomic_cancel.atomic_commit.atomic_noexcept.auto.bitand.bitor.break.case.catch.class.co_await.co_return.co_yield.compl.concept.const_cast|10.consteval.constexpr.constinit.continue.decltype.default.delete.do.dynamic_cast|10.else.enum.explicit.export.extern.false.final.for.friend.goto.if.import.inline.module.mutable.namespace.new.noexcept.not.not_eq.nullptr.operator.or.or_eq.override.private.protected.public.reflexpr.register.reinterpret_cast|10.requires.return.sizeof.static_assert.static_cast|10.struct.switch.synchronized.template.this.thread_local.throw.transaction_safe.transaction_safe_dynamic.true.try.typedef.typeid.typename.union.using.virtual.volatile.while.xor.xor_eq`.split(
        `.`,
      ),
    f = [
      `bool`,
      `char`,
      `char16_t`,
      `char32_t`,
      `char8_t`,
      `double`,
      `float`,
      `int`,
      `long`,
      `short`,
      `void`,
      `wchar_t`,
      `unsigned`,
      `signed`,
      `const`,
      `static`,
    ],
    p =
      `any.auto_ptr.barrier.binary_semaphore.bitset.complex.condition_variable.condition_variable_any.counting_semaphore.deque.false_type.flat_map.flat_set.future.imaginary.initializer_list.istringstream.jthread.latch.lock_guard.multimap.multiset.mutex.optional.ostringstream.packaged_task.pair.promise.priority_queue.queue.recursive_mutex.recursive_timed_mutex.scoped_lock.set.shared_future.shared_lock.shared_mutex.shared_timed_mutex.shared_ptr.stack.string_view.stringstream.timed_mutex.thread.true_type.tuple.unique_lock.unique_ptr.unordered_map.unordered_multimap.unordered_multiset.unordered_set.variant.vector.weak_ptr.wstring.wstring_view`.split(
        `.`,
      ),
    m =
      `abort.abs.acos.apply.as_const.asin.atan.atan2.calloc.ceil.cerr.cin.clog.cos.cosh.cout.declval.endl.exchange.exit.exp.fabs.floor.fmod.forward.fprintf.fputs.free.frexp.fscanf.future.invoke.isalnum.isalpha.iscntrl.isdigit.isgraph.islower.isprint.ispunct.isspace.isupper.isxdigit.labs.launder.ldexp.log.log10.make_pair.make_shared.make_shared_for_overwrite.make_tuple.make_unique.malloc.memchr.memcmp.memcpy.memset.modf.move.pow.printf.putchar.puts.realloc.scanf.sin.sinh.snprintf.sprintf.sqrt.sscanf.std.stderr.stdin.stdout.strcat.strchr.strcmp.strcpy.strcspn.strlen.strncat.strncmp.strncpy.strpbrk.strrchr.strspn.strstr.swap.tan.tanh.terminate.to_underlying.tolower.toupper.vfprintf.visit.vprintf.vsprintf`.split(
        `.`,
      ),
    h = {
      type: f,
      keyword: d,
      literal: [`NULL`, `false`, `nullopt`, `nullptr`, `true`],
      built_in: [`_Pragma`],
      _type_hints: p,
    },
    g = {
      className: `function.dispatch`,
      relevance: 0,
      keywords: { _hint: m },
      begin: t.concat(/\b/, `(?!${d.join(`|`)})`, e.IDENT_RE, t.lookahead(/(<[^<>]+>|)\s*\(/)),
    },
    _ = [g, ...c, a, n, e.C_BLOCK_COMMENT_MODE, s, o],
    v = {
      variants: [
        { begin: /=/, end: /;/ },
        { begin: /\(/, end: /\)/ },
        { beginKeywords: `new throw return else`, end: /;/ },
      ],
      keywords: h,
      contains: _.concat([
        { begin: /\(/, end: /\)/, keywords: h, contains: _.concat([`self`]), relevance: 0 },
      ]),
      relevance: 0,
    },
    y = {
      className: `function`,
      begin: `(` + i + `[\\*&\\s]+){1,12}` + u,
      returnBegin: !0,
      end: /[{;=]/,
      excludeEnd: !0,
      keywords: h,
      illegal: /[^\w\s\*&:<>.]/,
      contains: [
        { begin: `decltype\\(auto\\)`, keywords: h, relevance: 0 },
        { begin: u, returnBegin: !0, contains: [l], relevance: 0 },
        { begin: /::/, relevance: 0 },
        { begin: /:/, endsWithParent: !0, contains: [o, s] },
        { relevance: 0, match: /,/ },
        {
          className: `params`,
          begin: /\(/,
          end: /\)/,
          keywords: h,
          relevance: 0,
          contains: [
            n,
            e.C_BLOCK_COMMENT_MODE,
            o,
            s,
            a,
            {
              begin: /\(/,
              end: /\)/,
              keywords: h,
              relevance: 0,
              contains: [`self`, n, e.C_BLOCK_COMMENT_MODE, o, s, a],
            },
          ],
        },
        a,
        n,
        e.C_BLOCK_COMMENT_MODE,
        ...c,
      ],
    };
  return {
    name: `C++`,
    aliases: [`cc`, `c++`, `h++`, `hpp`, `hh`, `hxx`, `cxx`],
    keywords: h,
    illegal: `</`,
    classNameAliases: { "function.dispatch": `built_in` },
    contains: [].concat(v, y, g, _, [
      ...c,
      {
        begin: `\\b(deque|list|queue|priority_queue|pair|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array|tuple|optional|variant|function|flat_map|flat_set)\\s*<(?!<)`,
        end: `>`,
        keywords: h,
        contains: [`self`, a],
      },
      { begin: e.IDENT_RE + `::`, keywords: h },
      {
        match: [/\b(?:enum(?:\s+(?:class|struct))?|class|struct|union)/, /\s+/, /\w+/],
        className: { 1: `keyword`, 3: `title.class` },
      },
    ]),
  };
}
function Je() {
  return (Je = t(() => {}))();
}
function Ye(e) {
  let t = e.regex,
    n = Xe(e),
    r = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ },
    i = /@-?\w[\w]*(-\w+)*/,
    a = [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE];
  return {
    name: `CSS`,
    case_insensitive: !0,
    illegal: /[=|'\$]/,
    keywords: { keyframePosition: `from to` },
    classNameAliases: { keyframePosition: `selector-tag` },
    contains: [
      n.BLOCK_COMMENT,
      r,
      n.CSS_NUMBER_MODE,
      { className: `selector-id`, begin: /#[A-Za-z0-9_-]+/, relevance: 0 },
      { className: `selector-class`, begin: `\\.[a-zA-Z-][a-zA-Z0-9_-]*`, relevance: 0 },
      n.ATTRIBUTE_SELECTOR_MODE,
      {
        className: `selector-pseudo`,
        variants: [{ begin: `:(` + et.join(`|`) + `)` }, { begin: `:(:)?(` + tt.join(`|`) + `)` }],
      },
      n.CSS_VARIABLE,
      { className: `attribute`, begin: `\\b(` + nt.join(`|`) + `)\\b` },
      {
        begin: /:/,
        end: /[;}{]/,
        contains: [
          n.BLOCK_COMMENT,
          n.HEXCOLOR,
          n.IMPORTANT,
          n.CSS_NUMBER_MODE,
          n.UNICODE_RANGE,
          ...a,
          {
            begin: /(url|data-uri)\(/,
            end: /\)/,
            relevance: 0,
            keywords: { built_in: `url data-uri` },
            contains: [
              ...a,
              { className: `string`, begin: /[^)]/, endsWithParent: !0, excludeEnd: !0 },
            ],
          },
          n.FUNCTION_DISPATCH,
        ],
      },
      {
        begin: t.lookahead(/@/),
        end: `[{;]`,
        relevance: 0,
        illegal: /:/,
        contains: [
          { className: `keyword`, begin: i },
          {
            begin: /\s/,
            endsWithParent: !0,
            excludeEnd: !0,
            relevance: 0,
            keywords: { $pattern: /[a-z-]+/, keyword: `and or not only`, attribute: $e.join(` `) },
            contains: [{ begin: /[a-z-]+(?=:)/, className: `attribute` }, ...a, n.CSS_NUMBER_MODE],
          },
        ],
      },
      { className: `selector-tag`, begin: `\\b(` + Qe.join(`|`) + `)\\b` },
    ],
  };
}
var Xe, V, Ze, Qe, $e, et, tt, nt;
function rt() {
  return (rt = t(() => {
    ((Xe = (e) => ({
      IMPORTANT: { scope: `meta`, begin: `!important` },
      BLOCK_COMMENT: e.C_BLOCK_COMMENT_MODE,
      HEXCOLOR: { scope: `number`, begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/ },
      UNICODE_RANGE: {
        scope: `number`,
        begin: /\b[Uu]\+[0-9A-Fa-f][0-9A-Fa-f?]{0,5}(-[0-9A-Fa-f][0-9A-Fa-f]{0,5})?/,
      },
      FUNCTION_DISPATCH: { className: `built_in`, begin: /[\w-]+(?=\()/ },
      ATTRIBUTE_SELECTOR_MODE: {
        scope: `selector-attr`,
        begin: /\[/,
        end: /\]/,
        illegal: `$`,
        contains: [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE],
      },
      CSS_NUMBER_MODE: {
        scope: `number`,
        begin:
          e.NUMBER_RE +
          `(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?`,
        relevance: 0,
      },
      CSS_VARIABLE: { className: `attr`, begin: /--[A-Za-z_][A-Za-z0-9_-]*/ },
    })),
      (V =
        `a.abbr.address.article.aside.audio.b.blockquote.body.button.canvas.caption.cite.code.dd.del.details.dfn.div.dl.dt.em.fieldset.figcaption.figure.footer.form.h1.h2.h3.h4.h5.h6.header.hgroup.html.i.iframe.img.input.ins.kbd.label.legend.li.main.mark.menu.nav.object.ol.optgroup.option.p.picture.q.quote.samp.section.select.source.span.strong.summary.sup.table.tbody.td.textarea.tfoot.th.thead.time.tr.ul.var.video`.split(
          `.`,
        )),
      (Ze =
        `defs.g.marker.mask.pattern.svg.switch.symbol.feBlend.feColorMatrix.feComponentTransfer.feComposite.feConvolveMatrix.feDiffuseLighting.feDisplacementMap.feFlood.feGaussianBlur.feImage.feMerge.feMorphology.feOffset.feSpecularLighting.feTile.feTurbulence.linearGradient.radialGradient.stop.circle.ellipse.image.line.path.polygon.polyline.rect.text.use.textPath.tspan.foreignObject.clipPath`.split(
          `.`,
        )),
      (Qe = [...V, ...Ze]),
      ($e =
        `any-hover.any-pointer.aspect-ratio.color.color-gamut.color-index.device-aspect-ratio.device-height.device-width.display-mode.forced-colors.grid.height.hover.inverted-colors.monochrome.orientation.overflow-block.overflow-inline.pointer.prefers-color-scheme.prefers-contrast.prefers-reduced-motion.prefers-reduced-transparency.resolution.scan.scripting.update.width.min-width.max-width.min-height.max-height`
          .split(`.`)
          .sort()
          .reverse()),
      (et =
        `active.any-link.blank.checked.current.default.defined.dir.disabled.drop.empty.enabled.first.first-child.first-of-type.fullscreen.future.focus.focus-visible.focus-within.has.host.host-context.hover.indeterminate.in-range.invalid.is.lang.last-child.last-of-type.left.link.local-link.not.nth-child.nth-col.nth-last-child.nth-last-col.nth-last-of-type.nth-of-type.only-child.only-of-type.optional.out-of-range.past.placeholder-shown.read-only.read-write.required.right.root.scope.target.target-within.user-invalid.valid.visited.where`
          .split(`.`)
          .sort()
          .reverse()),
      (tt = [
        `after`,
        `backdrop`,
        `before`,
        `cue`,
        `cue-region`,
        `first-letter`,
        `first-line`,
        `grammar-error`,
        `marker`,
        `part`,
        `placeholder`,
        `selection`,
        `slotted`,
        `spelling-error`,
      ]
        .sort()
        .reverse()),
      (nt =
        `accent-color.align-content.align-items.align-self.alignment-baseline.all.anchor-name.animation.animation-composition.animation-delay.animation-direction.animation-duration.animation-fill-mode.animation-iteration-count.animation-name.animation-play-state.animation-range.animation-range-end.animation-range-start.animation-timeline.animation-timing-function.appearance.aspect-ratio.backdrop-filter.backface-visibility.background.background-attachment.background-blend-mode.background-clip.background-color.background-image.background-origin.background-position.background-position-x.background-position-y.background-repeat.background-size.baseline-shift.block-size.border.border-block.border-block-color.border-block-end.border-block-end-color.border-block-end-style.border-block-end-width.border-block-start.border-block-start-color.border-block-start-style.border-block-start-width.border-block-style.border-block-width.border-bottom.border-bottom-color.border-bottom-left-radius.border-bottom-right-radius.border-bottom-style.border-bottom-width.border-collapse.border-color.border-end-end-radius.border-end-start-radius.border-image.border-image-outset.border-image-repeat.border-image-slice.border-image-source.border-image-width.border-inline.border-inline-color.border-inline-end.border-inline-end-color.border-inline-end-style.border-inline-end-width.border-inline-start.border-inline-start-color.border-inline-start-style.border-inline-start-width.border-inline-style.border-inline-width.border-left.border-left-color.border-left-style.border-left-width.border-radius.border-right.border-right-color.border-right-style.border-right-width.border-spacing.border-start-end-radius.border-start-start-radius.border-style.border-top.border-top-color.border-top-left-radius.border-top-right-radius.border-top-style.border-top-width.border-width.bottom.box-align.box-decoration-break.box-direction.box-flex.box-flex-group.box-lines.box-ordinal-group.box-orient.box-pack.box-shadow.box-sizing.break-after.break-before.break-inside.caption-side.caret-color.clear.clip.clip-path.clip-rule.color.color-interpolation.color-interpolation-filters.color-profile.color-rendering.color-scheme.column-count.column-fill.column-gap.column-rule.column-rule-color.column-rule-style.column-rule-width.column-span.column-width.columns.contain.contain-intrinsic-block-size.contain-intrinsic-height.contain-intrinsic-inline-size.contain-intrinsic-size.contain-intrinsic-width.container.container-name.container-type.content.content-visibility.corner-bottom-left-shape.corner-bottom-right-shape.corner-shape.corner-top-left-shape.corner-top-right-shape.counter-increment.counter-reset.counter-set.cue.cue-after.cue-before.cursor.cx.cy.direction.display.dominant-baseline.empty-cells.enable-background.field-sizing.fill.fill-opacity.fill-rule.filter.flex.flex-basis.flex-direction.flex-flow.flex-grow.flex-shrink.flex-wrap.float.flood-color.flood-opacity.flow.font.font-display.font-family.font-feature-settings.font-kerning.font-language-override.font-optical-sizing.font-palette.font-size.font-size-adjust.font-smooth.font-smoothing.font-stretch.font-style.font-synthesis.font-synthesis-position.font-synthesis-small-caps.font-synthesis-style.font-synthesis-weight.font-variant.font-variant-alternates.font-variant-caps.font-variant-east-asian.font-variant-emoji.font-variant-ligatures.font-variant-numeric.font-variant-position.font-variation-settings.font-weight.forced-color-adjust.gap.glyph-orientation-horizontal.glyph-orientation-vertical.grid.grid-area.grid-auto-columns.grid-auto-flow.grid-auto-rows.grid-column.grid-column-end.grid-column-start.grid-gap.grid-row.grid-row-end.grid-row-start.grid-template.grid-template-areas.grid-template-columns.grid-template-rows.hanging-punctuation.height.hyphenate-character.hyphenate-limit-chars.hyphens.icon.image-orientation.image-rendering.image-resolution.ime-mode.initial-letter.initial-letter-align.inline-size.inset.inset-area.inset-block.inset-block-end.inset-block-start.inset-inline.inset-inline-end.inset-inline-start.isolation.justify-content.justify-items.justify-self.kerning.left.letter-spacing.lighting-color.line-break.line-height.line-height-step.list-style.list-style-image.list-style-position.list-style-type.margin.margin-block.margin-block-end.margin-block-start.margin-bottom.margin-inline.margin-inline-end.margin-inline-start.margin-left.margin-right.margin-top.margin-trim.marker.marker-end.marker-mid.marker-start.marks.mask.mask-border.mask-border-mode.mask-border-outset.mask-border-repeat.mask-border-slice.mask-border-source.mask-border-width.mask-clip.mask-composite.mask-image.mask-mode.mask-origin.mask-position.mask-repeat.mask-size.mask-type.masonry-auto-flow.math-depth.math-shift.math-style.max-block-size.max-height.max-inline-size.max-width.min-block-size.min-height.min-inline-size.min-width.mix-blend-mode.nav-down.nav-index.nav-left.nav-right.nav-up.none.normal.object-fit.object-position.offset.offset-anchor.offset-distance.offset-path.offset-position.offset-rotate.opacity.order.orphans.outline.outline-color.outline-offset.outline-style.outline-width.overflow.overflow-anchor.overflow-block.overflow-clip-margin.overflow-inline.overflow-wrap.overflow-x.overflow-y.overlay.overscroll-behavior.overscroll-behavior-block.overscroll-behavior-inline.overscroll-behavior-x.overscroll-behavior-y.padding.padding-block.padding-block-end.padding-block-start.padding-bottom.padding-inline.padding-inline-end.padding-inline-start.padding-left.padding-right.padding-top.page.page-break-after.page-break-before.page-break-inside.paint-order.pause.pause-after.pause-before.perspective.perspective-origin.place-content.place-items.place-self.pointer-events.position.position-anchor.position-visibility.print-color-adjust.quotes.r.resize.rest.rest-after.rest-before.right.rotate.row-gap.ruby-align.ruby-position.scale.scroll-behavior.scroll-margin.scroll-margin-block.scroll-margin-block-end.scroll-margin-block-start.scroll-margin-bottom.scroll-margin-inline.scroll-margin-inline-end.scroll-margin-inline-start.scroll-margin-left.scroll-margin-right.scroll-margin-top.scroll-padding.scroll-padding-block.scroll-padding-block-end.scroll-padding-block-start.scroll-padding-bottom.scroll-padding-inline.scroll-padding-inline-end.scroll-padding-inline-start.scroll-padding-left.scroll-padding-right.scroll-padding-top.scroll-snap-align.scroll-snap-stop.scroll-snap-type.scroll-timeline.scroll-timeline-axis.scroll-timeline-name.scrollbar-color.scrollbar-gutter.scrollbar-width.shape-image-threshold.shape-margin.shape-outside.shape-rendering.speak.speak-as.src.stop-color.stop-opacity.stroke.stroke-dasharray.stroke-dashoffset.stroke-linecap.stroke-linejoin.stroke-miterlimit.stroke-opacity.stroke-width.tab-size.table-layout.text-align.text-align-all.text-align-last.text-anchor.text-combine-upright.text-decoration.text-decoration-color.text-decoration-line.text-decoration-skip.text-decoration-skip-ink.text-decoration-style.text-decoration-thickness.text-emphasis.text-emphasis-color.text-emphasis-position.text-emphasis-style.text-indent.text-justify.text-orientation.text-overflow.text-rendering.text-shadow.text-size-adjust.text-transform.text-underline-offset.text-underline-position.text-wrap.text-wrap-mode.text-wrap-style.timeline-scope.top.touch-action.transform.transform-box.transform-origin.transform-style.transition.transition-behavior.transition-delay.transition-duration.transition-property.transition-timing-function.translate.unicode-bidi.unicode-range.user-modify.user-select.vector-effect.vertical-align.view-timeline.view-timeline-axis.view-timeline-inset.view-timeline-name.view-transition-name.visibility.voice-balance.voice-duration.voice-family.voice-pitch.voice-range.voice-rate.voice-stress.voice-volume.white-space.white-space-collapse.widows.width.will-change.word-break.word-spacing.word-wrap.writing-mode.x.y.z-index.zoom`
          .split(`.`)
          .sort()
          .reverse()));
  }))();
}
function it(e) {
  let t = e.regex;
  return {
    name: `Diff`,
    aliases: [`patch`],
    contains: [
      {
        className: `meta`,
        relevance: 10,
        match: t.either(
          /^@@ +-\d+,\d+ +\+\d+,\d+ +@@/,
          /^@@ +-\d+ +\+\d+,\d+ +@@/,
          /^@@ +-\d+,\d+ +\+\d+ +@@/,
          /^@@ +-\d+ +\+\d+ +@@/,
          /^\*\*\* +\d+,\d+ +\*\*\*\*$/,
          /^--- +\d+,\d+ +----$/,
        ),
      },
      {
        className: `comment`,
        variants: [
          {
            begin: t.either(
              /Index: /,
              /^index/,
              /={3,}/,
              /^-{3}/,
              /^\*{3} /,
              /^\+{3}/,
              /^diff --git/,
            ),
            end: /$/,
          },
          { match: /^\*{15}$/ },
        ],
      },
      { className: `addition`, begin: /^\+/, end: /$/ },
      { className: `deletion`, begin: /^-/, end: /$/ },
      { className: `addition`, begin: /^!/, end: /$/ },
    ],
  };
}
function at() {
  return (at = t(() => {}))();
}
function H(e) {
  let t = {
    keyword: [
      `break`,
      `case`,
      `chan`,
      `const`,
      `continue`,
      `default`,
      `defer`,
      `else`,
      `fallthrough`,
      `for`,
      `func`,
      `go`,
      `goto`,
      `if`,
      `import`,
      `interface`,
      `map`,
      `package`,
      `range`,
      `return`,
      `select`,
      `struct`,
      `switch`,
      `type`,
      `var`,
    ],
    type: [
      `bool`,
      `byte`,
      `complex64`,
      `complex128`,
      `error`,
      `float32`,
      `float64`,
      `int8`,
      `int16`,
      `int32`,
      `int64`,
      `string`,
      `uint8`,
      `uint16`,
      `uint32`,
      `uint64`,
      `int`,
      `uint`,
      `uintptr`,
      `rune`,
    ],
    literal: [`true`, `false`, `iota`, `nil`],
    built_in: [
      `append`,
      `cap`,
      `close`,
      `complex`,
      `copy`,
      `imag`,
      `len`,
      `make`,
      `new`,
      `panic`,
      `print`,
      `println`,
      `real`,
      `recover`,
      `delete`,
    ],
  };
  return {
    name: `Go`,
    aliases: [`golang`],
    keywords: t,
    illegal: `</`,
    contains: [
      e.C_LINE_COMMENT_MODE,
      e.C_BLOCK_COMMENT_MODE,
      {
        className: `string`,
        variants: [e.QUOTE_STRING_MODE, e.APOS_STRING_MODE, { begin: "`", end: "`" }],
      },
      {
        className: `number`,
        variants: [
          { match: /-?\b0[xX]\.[a-fA-F0-9](_?[a-fA-F0-9])*[pP][+-]?\d(_?\d)*i?/, relevance: 0 },
          {
            match:
              /-?\b0[xX](_?[a-fA-F0-9])+((\.([a-fA-F0-9](_?[a-fA-F0-9])*)?)?[pP][+-]?\d(_?\d)*)?i?/,
            relevance: 0,
          },
          { match: /-?\b0[oO](_?[0-7])*i?/, relevance: 0 },
          { match: /-?\b0[bB](_?[01])*i?/, relevance: 0 },
          { match: /-?\.\d(_?\d)*([eE][+-]?\d(_?\d)*)?i?/, relevance: 0 },
          { match: /-?\b\d(_?\d)*(\.(\d(_?\d)*)?)?([eE][+-]?\d(_?\d)*)?i?/, relevance: 0 },
        ],
      },
      { begin: /:=/ },
      {
        className: `function`,
        beginKeywords: `func`,
        end: `\\s*(\\{|$)`,
        excludeEnd: !0,
        contains: [
          e.TITLE_MODE,
          {
            className: `params`,
            begin: /\(/,
            end: /\)/,
            endsParent: !0,
            keywords: t,
            illegal: /["']/,
          },
        ],
      },
    ],
  };
}
function ot() {
  return (ot = t(() => {}))();
}
function U(e, t, n) {
  return n === -1 ? `` : e.replace(t, (r) => U(e, t, n - 1));
}
function st(e) {
  let t = e.regex,
    n = `[À-ʸa-zA-Z_$][À-ʸa-zA-Z_$0-9]*`,
    r = `(?:(?:\\s*\\[\\s*])+)?`,
    i = `(?:\\?(?:\\s+(?:extends|super)\\s+[À-ʸa-zA-Z_$][À-ʸa-zA-Z_$0-9]*<@@@>(?:(?:\\s*\\[\\s*])+)?)?|[À-ʸa-zA-Z_$][À-ʸa-zA-Z_$0-9]*<@@@>(?:(?:\\s*\\[\\s*])+)?)`,
    a = U(`(?:\\s*<\\s*` + i + `(?:\\s*,\\s*` + i + `)*\\s*>)?`, /<@@@>/g, 2),
    o = {
      keyword:
        `synchronized.abstract.private.var.static.if.const .for.while.strictfp.finally.protected.import.native.final.void.enum.else.break.transient.catch.instanceof.volatile.case.assert.package.default.public.try.switch.continue.throws.protected.public.private.module.requires.exports.do.sealed.yield.permits.goto.when`.split(
          `.`,
        ),
      literal: [`false`, `true`, `null`],
      type: [`char`, `boolean`, `long`, `float`, `int`, `byte`, `short`, `double`],
      built_in: [`super`, `this`],
    },
    s = {
      className: `meta`,
      begin: `@` + n,
      contains: [{ begin: /\(/, end: /\)/, contains: [`self`] }],
    },
    c = {
      className: `params`,
      begin: /\(/,
      end: /\)/,
      keywords: o,
      relevance: 0,
      contains: [e.C_BLOCK_COMMENT_MODE],
      endsParent: !0,
    };
  return {
    name: `Java`,
    aliases: [`jsp`],
    keywords: o,
    illegal: /<\/|#/,
    contains: [
      e.COMMENT(`/\\*\\*`, `\\*/`, {
        relevance: 0,
        contains: [
          { begin: /\w+@/, relevance: 0 },
          { className: `doctag`, begin: `@[A-Za-z]+` },
        ],
      }),
      { begin: /import java\.[a-z]+\./, keywords: `import`, relevance: 2 },
      e.C_LINE_COMMENT_MODE,
      e.C_BLOCK_COMMENT_MODE,
      { begin: /"""/, end: /"""/, className: `string`, contains: [e.BACKSLASH_ESCAPE] },
      e.APOS_STRING_MODE,
      e.QUOTE_STRING_MODE,
      {
        match: [/\b(?:class|interface|enum|extends|implements|new)/, /\s+/, n],
        className: { 1: `keyword`, 3: `title.class` },
      },
      { match: /non-sealed/, scope: `keyword` },
      { beginKeywords: `new throw return else yield assert`, relevance: 0 },
      {
        begin: [n, t.concat(a, r, /\s+/), n, r, /\s*/, /=(?!=)/],
        className: { 1: `type`, 3: `variable`, 6: `operator` },
      },
      {
        begin: [/record/, /\s+/, n],
        className: { 1: `keyword`, 3: `title.class` },
        contains: [c, e.C_LINE_COMMENT_MODE, e.C_BLOCK_COMMENT_MODE],
      },
      {
        begin: [n, t.concat(a, r, /\s+/), n, /\s*(?=\()/],
        className: { 1: `type`, 3: `title.function` },
        keywords: o,
        contains: [
          {
            className: `params`,
            begin: /\(/,
            end: /\)/,
            keywords: o,
            relevance: 0,
            contains: [s, e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, G, e.C_BLOCK_COMMENT_MODE],
          },
          e.C_LINE_COMMENT_MODE,
          e.C_BLOCK_COMMENT_MODE,
        ],
      },
      G,
      s,
    ],
  };
}
var W, ct, lt, G;
function ut() {
  return (ut = t(() => {
    ((W = `[0-9](_*[0-9])*`),
      (ct = `\\.(${W})`),
      (lt = `[0-9a-fA-F](_*[0-9a-fA-F])*`),
      (G = {
        className: `number`,
        variants: [
          { begin: `(\\b(${W})((${ct})|\\.)?|(${ct}))[eE][+-]?(${W})[fFdD]?\\b` },
          { begin: `\\b(${W})((${ct})[fFdD]?\\b|\\.([fFdD]\\b)?)` },
          { begin: `(${ct})[fFdD]?\\b` },
          { begin: `\\b(${W})[fFdD]\\b` },
          { begin: `\\b0[xX]((${lt})\\.?|(${lt})?\\.(${lt}))[pP][+-]?(${W})[fFdD]?\\b` },
          { begin: `\\b(0|[1-9](_*[0-9])*)[lL]?\\b` },
          { begin: `\\b0[xX](${lt})[lL]?\\b` },
          { begin: `\\b0(_*[0-7])*[lL]?\\b` },
          { begin: `\\b0[bB][01](_*[01])*[lL]?\\b` },
        ],
        relevance: 0,
      }));
  }))();
}
function dt(e) {
  let t = e.regex,
    n = (e, { after: t }) => {
      let n = `</` + e[0].slice(1);
      return e.input.indexOf(n, t) !== -1;
    },
    r = ft,
    i = { begin: `<>`, end: `</>` },
    a = /<[A-Za-z0-9\\._:-]+\s*\/>/,
    o = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      isTrulyOpeningTag: (e, t) => {
        let r = e[0].length + e.index,
          i = e.input[r];
        if (i === `<` || i === `,`) {
          t.ignoreMatch();
          return;
        }
        i === `>` && (n(e, { after: r }) || t.ignoreMatch());
        let a,
          o = e.input.substring(r);
        if ((a = o.match(/^\s*=/))) {
          t.ignoreMatch();
          return;
        }
        if ((a = o.match(/^\s+extends\s+/)) && a.index === 0) {
          t.ignoreMatch();
          return;
        }
      },
    },
    s = { $pattern: ft, keyword: pt, literal: mt, built_in: yt, "variable.language": vt },
    c = `[0-9](_?[0-9])*`,
    l = `\\.(${c})`,
    u = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`,
    d = {
      className: `number`,
      variants: [
        { begin: `(\\b(${u})((${l})|\\.)?|(${l}))[eE][+-]?(${c})\\b` },
        { begin: `\\b(${u})\\b((${l})\\b|\\.)?|(${l})\\b` },
        { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
        { begin: `\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b` },
        { begin: `\\b0[bB][0-1](_?[0-1])*n?\\b` },
        { begin: `\\b0[oO][0-7](_?[0-7])*n?\\b` },
        { begin: `\\b0[0-7]+n?\\b` },
      ],
      relevance: 0,
    },
    f = { className: `subst`, begin: `\\$\\{`, end: `\\}`, keywords: s, contains: [] },
    p = {
      begin: ".?html`",
      end: ``,
      starts: { end: "`", returnEnd: !1, contains: [e.BACKSLASH_ESCAPE, f], subLanguage: `xml` },
    },
    m = {
      begin: ".?css`",
      end: ``,
      starts: { end: "`", returnEnd: !1, contains: [e.BACKSLASH_ESCAPE, f], subLanguage: `css` },
    },
    h = {
      begin: ".?gql`",
      end: ``,
      starts: {
        end: "`",
        returnEnd: !1,
        contains: [e.BACKSLASH_ESCAPE, f],
        subLanguage: `graphql`,
      },
    },
    g = { className: `string`, begin: "`", end: "`", contains: [e.BACKSLASH_ESCAPE, f] },
    _ = {
      className: `comment`,
      variants: [
        e.COMMENT(/\/\*\*(?!\/)/, `\\*/`, {
          relevance: 0,
          contains: [
            {
              begin: `(?=@[A-Za-z]+)`,
              relevance: 0,
              contains: [
                { className: `doctag`, begin: `@[A-Za-z]+` },
                {
                  className: `type`,
                  begin: `\\{`,
                  end: `\\}`,
                  excludeEnd: !0,
                  excludeBegin: !0,
                  relevance: 0,
                },
                { className: `variable`, begin: r + `(?=\\s*(-)|$)`, endsParent: !0, relevance: 0 },
                { begin: /(?=[^\n])\s/, relevance: 0 },
              ],
            },
          ],
        }),
        e.C_BLOCK_COMMENT_MODE,
        e.C_LINE_COMMENT_MODE,
      ],
    },
    v = [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, p, m, h, g, { match: /\$\d+/ }, d];
  f.contains = v.concat({ begin: /\{/, end: /\}/, keywords: s, contains: [`self`].concat(v) });
  let y = [].concat(_, f.contains),
    b = y.concat([{ begin: /(\s*)\(/, end: /\)/, keywords: s, contains: [`self`].concat(y) }]),
    x = {
      className: `params`,
      begin: /(\s*)\(/,
      end: /\)/,
      excludeBegin: !0,
      excludeEnd: !0,
      keywords: s,
      contains: b,
    },
    S = {
      variants: [
        {
          match: [
            /class/,
            /\s+/,
            r,
            /\s+/,
            /extends/,
            /\s+/,
            t.concat(r, `(`, t.concat(/\./, r), `)*`),
          ],
          scope: { 1: `keyword`, 3: `title.class`, 5: `keyword`, 7: `title.class.inherited` },
        },
        { match: [/class/, /\s+/, r], scope: { 1: `keyword`, 3: `title.class` } },
      ],
    },
    C = {
      relevance: 0,
      match: t.either(
        /\bJSON/,
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
      ),
      className: `title.class`,
      keywords: { _: [...ht, ...gt] },
    },
    w = {
      label: `use_strict`,
      className: `meta`,
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/,
    },
    T = {
      variants: [
        { match: [/function/, /\s+/, r, /(?=\s*\()/] },
        { match: [/function/, /\s*(?=\()/] },
      ],
      className: { 1: `keyword`, 3: `title.function` },
      label: `func.def`,
      contains: [x],
      illegal: /%/,
    },
    E = { relevance: 0, match: /\b[A-Z][A-Z_0-9]+\b/, className: `variable.constant` };
  function D(e) {
    return t.concat(`(?!`, e.join(`|`), `)`);
  }
  let O = {
      match: t.concat(
        /\b/,
        D([..._t, `super`, `import`, `await`].map((e) => `${e}\\s*\\(`)),
        r,
        t.lookahead(/\s*\(/),
      ),
      className: `title.function`,
      relevance: 0,
    },
    k = {
      begin: t.concat(/\./, t.lookahead(t.concat(r, /(?![0-9A-Za-z$_(])/))),
      end: r,
      excludeBegin: !0,
      keywords: `prototype`,
      className: `property`,
      relevance: 0,
    },
    A = {
      match: [/get|set/, /\s+/, r, /(?=\()/],
      className: { 1: `keyword`, 3: `title.function` },
      contains: [{ begin: /\(\)/ }, x],
    },
    ee =
      `(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|` +
      e.UNDERSCORE_IDENT_RE +
      `)\\s*=>`,
    j = {
      match: [/const|var|let/, /\s+/, r, /\s*/, /=\s*/, /(async\s*)?/, t.lookahead(ee)],
      keywords: `async`,
      className: { 1: `keyword`, 3: `title.function` },
      contains: [x],
    };
  return {
    name: `JavaScript`,
    aliases: [`js`, `jsx`, `mjs`, `cjs`],
    keywords: s,
    exports: { PARAMS_CONTAINS: b, CLASS_REFERENCE: C },
    illegal: /#(?![$_A-Za-z])/,
    contains: [
      e.SHEBANG({ label: `shebang`, binary: `node`, relevance: 5 }),
      w,
      e.APOS_STRING_MODE,
      e.QUOTE_STRING_MODE,
      p,
      m,
      h,
      g,
      _,
      { match: /\$\d+/ },
      d,
      C,
      { scope: `attr`, match: r + t.lookahead(`:`), relevance: 0 },
      j,
      {
        begin: `(` + e.RE_STARTERS_RE + `|\\b(case|return|throw)\\b)\\s*`,
        keywords: `return throw case`,
        relevance: 0,
        contains: [
          _,
          e.REGEXP_MODE,
          {
            className: `function`,
            begin: ee,
            returnBegin: !0,
            end: `\\s*=>`,
            contains: [
              {
                className: `params`,
                variants: [
                  { begin: e.UNDERSCORE_IDENT_RE, relevance: 0 },
                  { className: null, begin: /\(\s*\)/, skip: !0 },
                  {
                    begin: /(\s*)\(/,
                    end: /\)/,
                    excludeBegin: !0,
                    excludeEnd: !0,
                    keywords: s,
                    contains: b,
                  },
                ],
              },
            ],
          },
          { begin: /,/, relevance: 0 },
          { match: /\s+/, relevance: 0 },
          {
            variants: [
              { begin: i.begin, end: i.end },
              { match: a },
              { begin: o.begin, "on:begin": o.isTrulyOpeningTag, end: o.end },
            ],
            subLanguage: `xml`,
            contains: [{ begin: o.begin, end: o.end, skip: !0, contains: [`self`] }],
          },
        ],
      },
      T,
      { beginKeywords: `while if switch catch for` },
      {
        begin:
          `\\b(?!function)` +
          e.UNDERSCORE_IDENT_RE +
          `\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{`,
        returnBegin: !0,
        label: `func.def`,
        contains: [x, e.inherit(e.TITLE_MODE, { begin: r, className: `title.function` })],
      },
      { match: /\.\.\./, relevance: 0 },
      k,
      { match: `\\$` + r, relevance: 0 },
      { match: [/\bconstructor(?=\s*\()/], className: { 1: `title.function` }, contains: [x] },
      O,
      E,
      S,
      A,
      { match: /\$[(.]/ },
    ],
  };
}
var ft, pt, mt, ht, gt, _t, vt, yt;
function bt() {
  return (bt = t(() => {
    ((ft = `[A-Za-z$_][0-9A-Za-z$_]*`),
      (pt =
        `as.in.of.if.for.while.finally.var.new.function.do.return.void.else.break.catch.instanceof.with.throw.case.default.try.switch.continue.typeof.delete.let.yield.const.class.debugger.async.await.static.import.from.export.extends.using`.split(
          `.`,
        )),
      (mt = [`true`, `false`, `null`, `undefined`, `NaN`, `Infinity`]),
      (ht =
        `Object.Function.Boolean.Symbol.Math.Date.Number.BigInt.String.RegExp.Array.Float32Array.Float64Array.Int8Array.Uint8Array.Uint8ClampedArray.Int16Array.Int32Array.Uint16Array.Uint32Array.BigInt64Array.BigUint64Array.Set.Map.WeakSet.WeakMap.ArrayBuffer.SharedArrayBuffer.Atomics.DataView.JSON.Promise.Generator.GeneratorFunction.AsyncFunction.Reflect.Proxy.Intl.WebAssembly`.split(
          `.`,
        )),
      (gt = [
        `Error`,
        `EvalError`,
        `InternalError`,
        `RangeError`,
        `ReferenceError`,
        `SyntaxError`,
        `TypeError`,
        `URIError`,
      ]),
      (_t = [
        `setInterval`,
        `setTimeout`,
        `clearInterval`,
        `clearTimeout`,
        `require`,
        `exports`,
        `eval`,
        `isFinite`,
        `isNaN`,
        `parseFloat`,
        `parseInt`,
        `decodeURI`,
        `decodeURIComponent`,
        `encodeURI`,
        `encodeURIComponent`,
        `escape`,
        `unescape`,
      ]),
      (vt = [
        `arguments`,
        `this`,
        `super`,
        `console`,
        `window`,
        `document`,
        `localStorage`,
        `sessionStorage`,
        `module`,
        `self`,
        `global`,
      ]),
      (yt = [].concat(_t, ht, gt)));
  }))();
}
function xt(e) {
  let t = {
      className: `attr`,
      begin: /(("(\\.|[^\\"\r\n])*")|('(\\.|[^\\'\r\n])*'))(?=\s*:)/,
      relevance: 1.01,
    },
    n = { match: /[{}[\],:]/, className: `punctuation`, relevance: 0 },
    r = [`true`, `false`, `null`],
    i = { scope: `literal`, beginKeywords: r.join(` `) };
  return {
    name: `JSON`,
    aliases: [`jsonc`, `json5`],
    keywords: { literal: r },
    contains: [
      t,
      n,
      e.APOS_STRING_MODE,
      e.QUOTE_STRING_MODE,
      i,
      St,
      e.C_LINE_COMMENT_MODE,
      e.C_BLOCK_COMMENT_MODE,
    ],
    illegal: `\\S`,
  };
}
var St;
function Ct() {
  return (Ct = t(() => {
    St = {
      scope: `number`,
      match: `([-+]?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)|NaN|[-+]?Infinity`,
      relevance: 0,
    };
  }))();
}
function wt(e) {
  let t = e.regex,
    n = { begin: /<\/?[A-Za-z_]/, end: `>`, subLanguage: `xml`, relevance: 0 },
    r = { match: /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/ },
    i = {
      className: `code`,
      variants: [
        { begin: "(`{3,})[^`](.|\\n)*?\\1`*[ ]*" },
        { begin: `(~{3,})[^~](.|\\n)*?\\1~*[ ]*` },
        { begin: "```", end: "```+[ ]*$" },
        { begin: `~~~`, end: `~~~+[ ]*$` },
        { begin: "`.+?`" },
        {
          begin: `(?=^( {4}|\\t))`,
          contains: [{ begin: `^( {4}|\\t)`, end: `(\\n)$` }],
          relevance: 0,
        },
      ],
    },
    a = {
      className: `bullet`,
      begin: `^[ 	]*([*+-]|(\\d+\\.))(?=\\s+)`,
      end: `\\s+`,
      excludeEnd: !0,
    },
    o = {
      begin: /^\[[^\n]+\]:/,
      returnBegin: !0,
      contains: [
        { className: `symbol`, begin: /\[/, end: /\]/, excludeBegin: !0, excludeEnd: !0 },
        { className: `link`, begin: /:\s*/, end: /$/, excludeBegin: !0 },
      ],
    },
    s = {
      variants: [
        { begin: /\[.+?\]\[.*?\]/, relevance: 0 },
        { begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/, relevance: 2 },
        { begin: t.concat(/\[.+?\]\(/, /[A-Za-z][A-Za-z0-9+.-]*/, /:\/\/.*?\)/), relevance: 2 },
        { begin: /\[.+?\]\([./?&#].*?\)/, relevance: 1 },
        { begin: /\[.*?\]\(.*?\)/, relevance: 0 },
      ],
      returnBegin: !0,
      contains: [
        { match: /\[(?=\])/ },
        {
          className: `string`,
          relevance: 0,
          begin: `\\[`,
          end: `\\]`,
          excludeBegin: !0,
          returnEnd: !0,
        },
        {
          className: `link`,
          relevance: 0,
          begin: `\\]\\(`,
          end: `\\)`,
          excludeBegin: !0,
          excludeEnd: !0,
        },
        {
          className: `symbol`,
          relevance: 0,
          begin: `\\]\\[`,
          end: `\\]`,
          excludeBegin: !0,
          excludeEnd: !0,
        },
      ],
    },
    c = {
      className: `strong`,
      contains: [],
      variants: [
        { begin: /_{2}(?!\s)/, end: /_{2}/ },
        { begin: /\*{2}(?!\s)/, end: /\*{2}/ },
      ],
    },
    l = {
      className: `emphasis`,
      contains: [],
      variants: [
        { begin: /\*(?![*\s])/, end: /\*/ },
        { begin: /_(?![_\s])/, end: /_/, relevance: 0 },
      ],
    },
    u = e.inherit(c, { contains: [] }),
    d = e.inherit(l, { contains: [] });
  (c.contains.push(d), l.contains.push(u));
  let f = [n, s];
  return (
    [c, l, u, d].forEach((e) => {
      e.contains = e.contains.concat(f);
    }),
    (f = f.concat(c, l)),
    {
      name: `Markdown`,
      aliases: [`md`, `mkdown`, `mkd`],
      contains: [
        {
          className: `section`,
          variants: [
            { begin: `^#{1,6}`, end: `$`, contains: f },
            {
              begin: `(?=^.+?\\n[=-]{2,}$)`,
              contains: [{ begin: `^[=-]*$` }, { begin: `^`, end: `\\n`, contains: f }],
            },
          ],
        },
        n,
        a,
        r,
        c,
        l,
        { className: `quote`, begin: `^>\\s+`, contains: f, end: `$` },
        i,
        s,
        o,
        { scope: `literal`, match: /&([a-zA-Z0-9]+|#[0-9]{1,7}|#[Xx][0-9a-fA-F]{1,6});/ },
      ],
    }
  );
}
function Tt() {
  return (Tt = t(() => {}))();
}
function Et(e) {
  let t = e.regex,
    n = /[\p{XID_Start}_]\p{XID_Continue}*/u,
    r =
      `and.as.assert.async.await.break.case.class.continue.def.del.elif.else.except.finally.for.from.global.if.import.in.is.lambda.lazy.match.nonlocal|10.not.or.pass.raise.return.try.while.with.yield`.split(
        `.`,
      ),
    i = {
      $pattern: /[A-Za-z]\w+|__\w+__/,
      keyword: r,
      built_in:
        `__import__.abs.aiter.all.anext.any.ascii.bin.bool.breakpoint.bytearray.bytes.callable.chr.classmethod.compile.complex.delattr.dict.dir.divmod.enumerate.eval.exec.filter.float.format.frozendict.frozenset.getattr.globals.hasattr.hash.help.hex.id.input.int.isinstance.issubclass.iter.len.list.locals.map.max.memoryview.min.next.object.oct.open.ord.pow.print.property.range.repr.reversed.round.sentinel.set.setattr.slice.sorted.staticmethod.str.sum.super.tuple.type.vars.zip`.split(
          `.`,
        ),
      literal: [`__debug__`, `Ellipsis`, `False`, `None`, `NotImplemented`, `True`],
      type: [
        `Any`,
        `Callable`,
        `Coroutine`,
        `Dict`,
        `List`,
        `Literal`,
        `Generic`,
        `Optional`,
        `Sequence`,
        `Set`,
        `Tuple`,
        `Type`,
        `Union`,
      ],
    },
    a = { className: `meta`, begin: /^(>>>|\.\.\.) / },
    o = { className: `subst`, begin: /\{/, end: /\}/, keywords: i, illegal: /#/ },
    s = { begin: /\{\{/, relevance: 0 },
    c = {
      className: `string`,
      contains: [e.BACKSLASH_ESCAPE],
      variants: [
        {
          begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
          end: /'''/,
          contains: [e.BACKSLASH_ESCAPE, a],
          relevance: 10,
        },
        {
          begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
          end: /"""/,
          contains: [e.BACKSLASH_ESCAPE, a],
          relevance: 10,
        },
        {
          begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])'''/,
          end: /'''/,
          contains: [e.BACKSLASH_ESCAPE, a, s, o],
        },
        {
          begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])"""/,
          end: /"""/,
          contains: [e.BACKSLASH_ESCAPE, a, s, o],
        },
        { begin: /([uU]|[rR])'/, end: /'/, relevance: 10 },
        { begin: /([uU]|[rR])"/, end: /"/, relevance: 10 },
        { begin: /([bB]|[bB][rR]|[rR][bB])'/, end: /'/ },
        { begin: /([bB]|[bB][rR]|[rR][bB])"/, end: /"/ },
        {
          begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])'/,
          end: /'/,
          contains: [e.BACKSLASH_ESCAPE, s, o],
        },
        {
          begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])"/,
          end: /"/,
          contains: [e.BACKSLASH_ESCAPE, s, o],
        },
        e.APOS_STRING_MODE,
        e.QUOTE_STRING_MODE,
      ],
    },
    l = `[0-9](_?[0-9])*`,
    u = `(\\b(${l}))?\\.(${l})|\\b(${l})\\.`,
    d = `\\b|${r.join(`|`)}`,
    f = {
      className: `number`,
      relevance: 0,
      variants: [
        { begin: `(\\b(${l})|(${u}))[eE][+-]?(${l})[jJ]?(?=${d})` },
        { begin: `(${u})[jJ]?` },
        { begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${d})` },
        { begin: `\\b0[bB](_?[01])+[lL]?(?=${d})` },
        { begin: `\\b0[oO](_?[0-7])+[lL]?(?=${d})` },
        { begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${d})` },
        { begin: `\\b(${l})[jJ](?=${d})` },
      ],
    },
    p = {
      className: `comment`,
      begin: t.lookahead(/# type:/),
      end: /$/,
      keywords: i,
      contains: [{ begin: /# type:/ }, { begin: /#/, end: /\b\B/, endsWithParent: !0 }],
    },
    m = {
      className: `params`,
      variants: [
        { className: ``, begin: /\(\s*\)/, skip: !0 },
        {
          begin: /\(/,
          end: /\)/,
          excludeBegin: !0,
          excludeEnd: !0,
          keywords: i,
          contains: [`self`, a, f, c, e.HASH_COMMENT_MODE],
        },
      ],
    };
  return (
    (o.contains = [c, f, a]),
    {
      name: `Python`,
      aliases: [`py`, `gyp`, `ipython`],
      unicodeRegex: !0,
      keywords: i,
      illegal: /(<\/|\?)|=>/,
      contains: [
        a,
        f,
        { scope: `variable.language`, match: /\bself\b/ },
        { beginKeywords: `if`, relevance: 0 },
        { match: /\bor\b/, scope: `keyword` },
        c,
        p,
        e.HASH_COMMENT_MODE,
        { match: [/\bdef/, /\s+/, n], scope: { 1: `keyword`, 3: `title.function` }, contains: [m] },
        {
          variants: [
            { match: [/\bclass/, /\s+/, n, /\s*/, /\(\s*/, n, /\s*\)/] },
            { match: [/\bclass/, /\s+/, n] },
          ],
          scope: { 1: `keyword`, 3: `title.class`, 6: `title.class.inherited` },
        },
        { className: `meta`, begin: /^[\t ]*@/, end: /(?=#)|$/, contains: [f, m, c] },
      ],
    }
  );
}
function Dt() {
  return (Dt = t(() => {}))();
}
function Ot(e) {
  let t = e.regex,
    n = /(r#)?/,
    r = t.concat(n, e.UNDERSCORE_IDENT_RE),
    i = t.concat(n, e.IDENT_RE),
    a = {
      scope: `title.function.invoke`,
      relevance: 0,
      begin: t.concat(/\b/, /(?!(?:let|for|while|if|else|match)\b)/, i, t.lookahead(/\s*\(/)),
    },
    o = `([ui](8|16|32|64|128|size)|f(16|32|64|128))?`,
    s =
      `abstract.as.async.await.become.box.break.const.continue.crate.do.dyn.else.enum.extern.false.final.fn.for.if.impl.in.let.loop.macro.match.mod.move.mut.override.priv.pub.raw.ref.return.self.Self.static.struct.super.trait.true.try.type.typeof.union.unsafe.unsized.use.virtual.where.while.yield`.split(
        `.`,
      ),
    c = [`true`, `false`, `Some`, `None`, `Ok`, `Err`],
    l =
      `drop .Copy.Send.Sized.Sync.Drop.Fn.FnMut.FnOnce.ToOwned.Clone.Debug.PartialEq.PartialOrd.Eq.Ord.AsRef.AsMut.Into.From.Default.Iterator.Extend.IntoIterator.DoubleEndedIterator.ExactSizeIterator.SliceConcatExt.ToString.assert!.assert_eq!.bitflags!.bytes!.cfg!.col!.concat!.concat_idents!.debug_assert!.debug_assert_eq!.env!.eprintln!.panic!.file!.format!.format_args!.include_bytes!.include_str!.line!.local_data_key!.module_path!.option_env!.print!.println!.select!.stringify!.try!.unimplemented!.unreachable!.vec!.write!.writeln!.macro_rules!.assert_ne!.debug_assert_ne!`.split(
        `.`,
      ),
    u = [
      `i8`,
      `i16`,
      `i32`,
      `i64`,
      `i128`,
      `isize`,
      `u8`,
      `u16`,
      `u32`,
      `u64`,
      `u128`,
      `usize`,
      `f16`,
      `f32`,
      `f64`,
      `f128`,
      `str`,
      `char`,
      `bool`,
      `Box`,
      `Option`,
      `Result`,
      `String`,
      `Vec`,
    ];
  return {
    name: `Rust`,
    aliases: [`rs`],
    keywords: { $pattern: e.IDENT_RE + `!?`, type: u, keyword: s, literal: c, built_in: l },
    illegal: `</`,
    contains: [
      e.C_LINE_COMMENT_MODE,
      e.COMMENT(`/\\*`, `\\*/`, { contains: [`self`] }),
      e.inherit(e.QUOTE_STRING_MODE, { begin: /b?"/, illegal: null }),
      { scope: `symbol`, begin: /'[a-zA-Z_][a-zA-Z0-9_]*(?!')/ },
      {
        scope: `string`,
        variants: [
          { begin: /b?r(#*)"(.|\n)*?"\1(?!#)/ },
          {
            begin: /b?'/,
            end: /'/,
            contains: [{ scope: `char.escape`, match: /\\('|"|\\|\w|x\w{2}|u\w{4}|U\w{8})/ }],
          },
        ],
      },
      {
        scope: `number`,
        variants: [
          { begin: `\\b0b([01_]+)` + o },
          { begin: `\\b0o([0-7_]+)` + o },
          { begin: `\\b0x([A-Fa-f0-9_]+)` + o },
          { begin: `\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)` + o },
        ],
        relevance: 0,
      },
      { begin: [/\bsafe/, /\s+/, /extern/], scope: { 1: `keyword`, 3: `keyword` } },
      { begin: [/fn/, /\s+/, r], scope: { 1: `keyword`, 3: `title.function` } },
      {
        scope: `meta`,
        begin: `#!?\\[`,
        end: `\\]`,
        contains: [{ scope: `string`, begin: /"/, end: /"/, contains: [e.BACKSLASH_ESCAPE] }],
      },
      {
        begin: [/let/, /\s+/, /(?:mut\s+)?/, r],
        scope: { 1: `keyword`, 3: `keyword`, 4: `variable` },
      },
      {
        begin: [/for/, /\s+/, r, /\s+/, /in/],
        scope: { 1: `keyword`, 3: `variable`, 5: `keyword` },
      },
      { begin: [/type/, /\s+/, r], scope: { 1: `keyword`, 3: `title.class` } },
      {
        begin: [/(?:trait|enum|struct|union|impl|for)/, /\s+/, r],
        scope: { 1: `keyword`, 3: `title.class` },
      },
      { begin: e.IDENT_RE + `::`, keywords: { keyword: `Self`, built_in: l, type: u } },
      { scope: `punctuation`, begin: `->` },
      a,
    ],
  };
}
function kt() {
  return (kt = t(() => {}))();
}
function At(e) {
  let t = e.regex,
    n = (e, { after: t }) => {
      let n = `</` + e[0].slice(1);
      return e.input.indexOf(n, t) !== -1;
    },
    r = Mt,
    i = { begin: `<>`, end: `</>` },
    a = /<[A-Za-z0-9\\._:-]+\s*\/>/,
    o = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      isTrulyOpeningTag: (e, t) => {
        let r = e[0].length + e.index,
          i = e.input[r];
        if (i === `<` || i === `,`) {
          t.ignoreMatch();
          return;
        }
        i === `>` && (n(e, { after: r }) || t.ignoreMatch());
        let a,
          o = e.input.substring(r);
        if ((a = o.match(/^\s*=/))) {
          t.ignoreMatch();
          return;
        }
        if ((a = o.match(/^\s+extends\s+/)) && a.index === 0) {
          t.ignoreMatch();
          return;
        }
      },
    },
    s = { $pattern: Mt, keyword: Nt, literal: Pt, built_in: Rt, "variable.language": K },
    c = `[0-9](_?[0-9])*`,
    l = `\\.(${c})`,
    u = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`,
    d = {
      className: `number`,
      variants: [
        { begin: `(\\b(${u})((${l})|\\.)?|(${l}))[eE][+-]?(${c})\\b` },
        { begin: `\\b(${u})\\b((${l})\\b|\\.)?|(${l})\\b` },
        { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
        { begin: `\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b` },
        { begin: `\\b0[bB][0-1](_?[0-1])*n?\\b` },
        { begin: `\\b0[oO][0-7](_?[0-7])*n?\\b` },
        { begin: `\\b0[0-7]+n?\\b` },
      ],
      relevance: 0,
    },
    f = { className: `subst`, begin: `\\$\\{`, end: `\\}`, keywords: s, contains: [] },
    p = {
      begin: ".?html`",
      end: ``,
      starts: { end: "`", returnEnd: !1, contains: [e.BACKSLASH_ESCAPE, f], subLanguage: `xml` },
    },
    m = {
      begin: ".?css`",
      end: ``,
      starts: { end: "`", returnEnd: !1, contains: [e.BACKSLASH_ESCAPE, f], subLanguage: `css` },
    },
    h = {
      begin: ".?gql`",
      end: ``,
      starts: {
        end: "`",
        returnEnd: !1,
        contains: [e.BACKSLASH_ESCAPE, f],
        subLanguage: `graphql`,
      },
    },
    g = { className: `string`, begin: "`", end: "`", contains: [e.BACKSLASH_ESCAPE, f] },
    _ = {
      className: `comment`,
      variants: [
        e.COMMENT(/\/\*\*(?!\/)/, `\\*/`, {
          relevance: 0,
          contains: [
            {
              begin: `(?=@[A-Za-z]+)`,
              relevance: 0,
              contains: [
                { className: `doctag`, begin: `@[A-Za-z]+` },
                {
                  className: `type`,
                  begin: `\\{`,
                  end: `\\}`,
                  excludeEnd: !0,
                  excludeBegin: !0,
                  relevance: 0,
                },
                { className: `variable`, begin: r + `(?=\\s*(-)|$)`, endsParent: !0, relevance: 0 },
                { begin: /(?=[^\n])\s/, relevance: 0 },
              ],
            },
          ],
        }),
        e.C_BLOCK_COMMENT_MODE,
        e.C_LINE_COMMENT_MODE,
      ],
    },
    v = [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE, p, m, h, g, { match: /\$\d+/ }, d];
  f.contains = v.concat({ begin: /\{/, end: /\}/, keywords: s, contains: [`self`].concat(v) });
  let y = [].concat(_, f.contains),
    b = y.concat([{ begin: /(\s*)\(/, end: /\)/, keywords: s, contains: [`self`].concat(y) }]),
    x = {
      className: `params`,
      begin: /(\s*)\(/,
      end: /\)/,
      excludeBegin: !0,
      excludeEnd: !0,
      keywords: s,
      contains: b,
    },
    S = {
      variants: [
        {
          match: [
            /class/,
            /\s+/,
            r,
            /\s+/,
            /extends/,
            /\s+/,
            t.concat(r, `(`, t.concat(/\./, r), `)*`),
          ],
          scope: { 1: `keyword`, 3: `title.class`, 5: `keyword`, 7: `title.class.inherited` },
        },
        { match: [/class/, /\s+/, r], scope: { 1: `keyword`, 3: `title.class` } },
      ],
    },
    C = {
      relevance: 0,
      match: t.either(
        /\bJSON/,
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
      ),
      className: `title.class`,
      keywords: { _: [...Ft, ...It] },
    },
    w = {
      label: `use_strict`,
      className: `meta`,
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/,
    },
    T = {
      variants: [
        { match: [/function/, /\s+/, r, /(?=\s*\()/] },
        { match: [/function/, /\s*(?=\()/] },
      ],
      className: { 1: `keyword`, 3: `title.function` },
      label: `func.def`,
      contains: [x],
      illegal: /%/,
    },
    E = { relevance: 0, match: /\b[A-Z][A-Z_0-9]+\b/, className: `variable.constant` };
  function D(e) {
    return t.concat(`(?!`, e.join(`|`), `)`);
  }
  let O = {
      match: t.concat(
        /\b/,
        D([...Lt, `super`, `import`, `await`].map((e) => `${e}\\s*\\(`)),
        r,
        t.lookahead(/\s*\(/),
      ),
      className: `title.function`,
      relevance: 0,
    },
    k = {
      begin: t.concat(/\./, t.lookahead(t.concat(r, /(?![0-9A-Za-z$_(])/))),
      end: r,
      excludeBegin: !0,
      keywords: `prototype`,
      className: `property`,
      relevance: 0,
    },
    A = {
      match: [/get|set/, /\s+/, r, /(?=\()/],
      className: { 1: `keyword`, 3: `title.function` },
      contains: [{ begin: /\(\)/ }, x],
    },
    ee =
      `(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|` +
      e.UNDERSCORE_IDENT_RE +
      `)\\s*=>`,
    j = {
      match: [/const|var|let/, /\s+/, r, /\s*/, /=\s*/, /(async\s*)?/, t.lookahead(ee)],
      keywords: `async`,
      className: { 1: `keyword`, 3: `title.function` },
      contains: [x],
    };
  return {
    name: `JavaScript`,
    aliases: [`js`, `jsx`, `mjs`, `cjs`],
    keywords: s,
    exports: { PARAMS_CONTAINS: b, CLASS_REFERENCE: C },
    illegal: /#(?![$_A-Za-z])/,
    contains: [
      e.SHEBANG({ label: `shebang`, binary: `node`, relevance: 5 }),
      w,
      e.APOS_STRING_MODE,
      e.QUOTE_STRING_MODE,
      p,
      m,
      h,
      g,
      _,
      { match: /\$\d+/ },
      d,
      C,
      { scope: `attr`, match: r + t.lookahead(`:`), relevance: 0 },
      j,
      {
        begin: `(` + e.RE_STARTERS_RE + `|\\b(case|return|throw)\\b)\\s*`,
        keywords: `return throw case`,
        relevance: 0,
        contains: [
          _,
          e.REGEXP_MODE,
          {
            className: `function`,
            begin: ee,
            returnBegin: !0,
            end: `\\s*=>`,
            contains: [
              {
                className: `params`,
                variants: [
                  { begin: e.UNDERSCORE_IDENT_RE, relevance: 0 },
                  { className: null, begin: /\(\s*\)/, skip: !0 },
                  {
                    begin: /(\s*)\(/,
                    end: /\)/,
                    excludeBegin: !0,
                    excludeEnd: !0,
                    keywords: s,
                    contains: b,
                  },
                ],
              },
            ],
          },
          { begin: /,/, relevance: 0 },
          { match: /\s+/, relevance: 0 },
          {
            variants: [
              { begin: i.begin, end: i.end },
              { match: a },
              { begin: o.begin, "on:begin": o.isTrulyOpeningTag, end: o.end },
            ],
            subLanguage: `xml`,
            contains: [{ begin: o.begin, end: o.end, skip: !0, contains: [`self`] }],
          },
        ],
      },
      T,
      { beginKeywords: `while if switch catch for` },
      {
        begin:
          `\\b(?!function)` +
          e.UNDERSCORE_IDENT_RE +
          `\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{`,
        returnBegin: !0,
        label: `func.def`,
        contains: [x, e.inherit(e.TITLE_MODE, { begin: r, className: `title.function` })],
      },
      { match: /\.\.\./, relevance: 0 },
      k,
      { match: `\\$` + r, relevance: 0 },
      { match: [/\bconstructor(?=\s*\()/], className: { 1: `title.function` }, contains: [x] },
      O,
      E,
      S,
      A,
      { match: /\$[(.]/ },
    ],
  };
}
function jt(e) {
  let t = e.regex,
    n = At(e),
    r = Mt,
    i = [
      `any`,
      `void`,
      `number`,
      `boolean`,
      `string`,
      `object`,
      `never`,
      `symbol`,
      `bigint`,
      `unknown`,
    ],
    a = { begin: [/namespace/, /\s+/, e.IDENT_RE], beginScope: { 1: `keyword`, 3: `title.class` } },
    o = {
      beginKeywords: `interface`,
      end: /\{/,
      excludeEnd: !0,
      keywords: { keyword: `interface extends`, built_in: i },
      contains: [n.exports.CLASS_REFERENCE],
    },
    s = { className: `meta`, relevance: 10, begin: /^\s*['"]use strict['"]/ },
    c = {
      $pattern: Mt,
      keyword: Nt.concat([
        `type`,
        `interface`,
        `public`,
        `private`,
        `protected`,
        `implements`,
        `declare`,
        `abstract`,
        `readonly`,
        `enum`,
        `override`,
        `satisfies`,
      ]),
      literal: Pt,
      built_in: Rt.concat(i),
      "variable.language": K,
    },
    l = { className: `meta`, begin: `@` + r },
    u = (e, t, n) => {
      let r = e.contains.findIndex((e) => e.label === t);
      if (r === -1) throw Error(`can not find mode to replace`);
      e.contains.splice(r, 1, n);
    };
  (Object.assign(n.keywords, c), n.exports.PARAMS_CONTAINS.push(l));
  let d = n.contains.find((e) => e.scope === `attr`),
    f = Object.assign({}, d, { match: t.concat(r, t.lookahead(/\s*\?:/)) });
  (n.exports.PARAMS_CONTAINS.push([n.exports.CLASS_REFERENCE, d, f]),
    (n.contains = n.contains.concat([l, a, o, f])),
    u(n, `shebang`, e.SHEBANG()),
    u(n, `use_strict`, s));
  let p = n.contains.find((e) => e.label === `func.def`);
  return (
    (p.relevance = 0),
    Object.assign(n, { name: `TypeScript`, aliases: [`ts`, `tsx`, `mts`, `cts`] }),
    n
  );
}
var Mt, Nt, Pt, Ft, It, Lt, K, Rt;
function zt() {
  return (zt = t(() => {
    ((Mt = `[A-Za-z$_][0-9A-Za-z$_]*`),
      (Nt =
        `as.in.of.if.for.while.finally.var.new.function.do.return.void.else.break.catch.instanceof.with.throw.case.default.try.switch.continue.typeof.delete.let.yield.const.class.debugger.async.await.static.import.from.export.extends.using`.split(
          `.`,
        )),
      (Pt = [`true`, `false`, `null`, `undefined`, `NaN`, `Infinity`]),
      (Ft =
        `Object.Function.Boolean.Symbol.Math.Date.Number.BigInt.String.RegExp.Array.Float32Array.Float64Array.Int8Array.Uint8Array.Uint8ClampedArray.Int16Array.Int32Array.Uint16Array.Uint32Array.BigInt64Array.BigUint64Array.Set.Map.WeakSet.WeakMap.ArrayBuffer.SharedArrayBuffer.Atomics.DataView.JSON.Promise.Generator.GeneratorFunction.AsyncFunction.Reflect.Proxy.Intl.WebAssembly`.split(
          `.`,
        )),
      (It = [
        `Error`,
        `EvalError`,
        `InternalError`,
        `RangeError`,
        `ReferenceError`,
        `SyntaxError`,
        `TypeError`,
        `URIError`,
      ]),
      (Lt = [
        `setInterval`,
        `setTimeout`,
        `clearInterval`,
        `clearTimeout`,
        `require`,
        `exports`,
        `eval`,
        `isFinite`,
        `isNaN`,
        `parseFloat`,
        `parseInt`,
        `decodeURI`,
        `decodeURIComponent`,
        `encodeURI`,
        `encodeURIComponent`,
        `escape`,
        `unescape`,
      ]),
      (K = [
        `arguments`,
        `this`,
        `super`,
        `console`,
        `window`,
        `document`,
        `localStorage`,
        `sessionStorage`,
        `module`,
        `self`,
        `global`,
      ]),
      (Rt = [].concat(Lt, Ft, It)));
  }))();
}
function Bt(e) {
  let t = e.regex,
    n = t.concat(/[\p{L}_]/u, t.optional(/[\p{L}0-9_.-]*:/u), /[\p{L}0-9_.-]*/u),
    r = /[\p{L}0-9._:-]+/u,
    i = { className: `symbol`, begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/ },
    a = {
      begin: /\s/,
      contains: [{ className: `keyword`, begin: /#?[a-z_][a-z1-9_-]+/, illegal: /\n/ }],
    },
    o = e.inherit(a, { begin: /\(/, end: /\)/ }),
    s = e.inherit(e.APOS_STRING_MODE, { className: `string` }),
    c = e.inherit(e.QUOTE_STRING_MODE, { className: `string` }),
    l = {
      endsWithParent: !0,
      illegal: /</,
      relevance: 0,
      contains: [
        { className: `attr`, begin: r, relevance: 0 },
        {
          begin: /=\s*/,
          relevance: 0,
          contains: [
            {
              className: `string`,
              endsParent: !0,
              variants: [
                { begin: /"/, end: /"/, contains: [i] },
                { begin: /'/, end: /'/, contains: [i] },
                { begin: /[^\s"'=<>`]+/ },
              ],
            },
          ],
        },
      ],
    };
  return {
    name: `HTML, XML`,
    aliases: [`html`, `xhtml`, `rss`, `atom`, `xjb`, `xsd`, `xsl`, `plist`, `wsf`, `svg`],
    case_insensitive: !0,
    unicodeRegex: !0,
    contains: [
      {
        className: `meta`,
        begin: /<![a-z]/,
        end: />/,
        relevance: 10,
        contains: [
          a,
          c,
          s,
          o,
          {
            begin: /\[/,
            end: /\]/,
            contains: [{ className: `meta`, begin: /<![a-z]/, end: />/, contains: [a, o, c, s] }],
          },
        ],
      },
      e.COMMENT(/<!--/, /-->/, { relevance: 10 }),
      { begin: /<!\[CDATA\[/, end: /\]\]>/, relevance: 10 },
      i,
      {
        className: `meta`,
        end: /\?>/,
        variants: [
          { begin: /<\?xml/, relevance: 10, contains: [c] },
          { begin: /<\?[a-z][a-z0-9]+/ },
        ],
      },
      {
        className: `tag`,
        begin: /<style(?=\s|>)/,
        end: />/,
        keywords: { name: `style` },
        contains: [l],
        starts: { end: /<\/style>/, returnEnd: !0, subLanguage: `css` },
      },
      {
        className: `tag`,
        begin: /<script(?=\s|>)/,
        end: />/,
        keywords: { name: `script` },
        contains: [l],
        starts: { end: /<\/script>/, returnEnd: !0, subLanguage: `javascript` },
      },
      { className: `tag`, begin: /<>|<\/>/ },
      {
        className: `tag`,
        begin: t.concat(/</, t.lookahead(t.concat(n, t.either(/\/>/, />/, /\s/)))),
        end: /\/?>/,
        contains: [{ className: `name`, begin: n, relevance: 0, starts: l }],
      },
      {
        className: `tag`,
        begin: t.concat(/<\//, t.lookahead(t.concat(n, />/))),
        contains: [
          { className: `name`, begin: n, relevance: 0 },
          { begin: />/, relevance: 0, endsParent: !0 },
        ],
      },
    ],
  };
}
function Vt() {
  return (Vt = t(() => {}))();
}
function Ht(e) {
  let t = `true false yes no null`,
    n = `[\\w#;/?:@&=+$,.~*'()[\\]]+`,
    r = {
      className: `attr`,
      variants: [
        { begin: /[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/ },
        { begin: /"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/ },
        { begin: /'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/ },
      ],
    },
    i = {
      className: `template-variable`,
      variants: [
        { begin: /\{\{/, end: /\}\}/ },
        { begin: /%\{/, end: /\}/ },
      ],
    },
    a = {
      className: `string`,
      relevance: 0,
      begin: /'/,
      end: /'/,
      contains: [{ match: /''/, scope: `char.escape`, relevance: 0 }],
    },
    o = {
      className: `string`,
      relevance: 0,
      variants: [{ begin: /"/, end: /"/ }, { begin: /\S+/ }],
      contains: [e.BACKSLASH_ESCAPE, i],
    },
    s = e.inherit(o, {
      variants: [
        { begin: /'/, end: /'/, contains: [{ begin: /''/, relevance: 0 }] },
        { begin: /"/, end: /"/ },
        { begin: /[^\s,{}[\]]+/ },
      ],
    }),
    c = {
      className: `number`,
      begin: `\\b[0-9]{4}(-[0-9][0-9]){0,2}([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?(\\.[0-9]*)?([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?\\b`,
    },
    l = { end: `,`, endsWithParent: !0, excludeEnd: !0, keywords: t, relevance: 0 },
    u = { begin: /\{/, end: /\}/, contains: [l], illegal: `\\n`, relevance: 0 },
    d = { begin: `\\[`, end: `\\]`, contains: [l], illegal: `\\n`, relevance: 0 },
    f = [
      r,
      { className: `meta`, begin: `^---\\s*$`, relevance: 10 },
      {
        className: `string`,
        begin: `[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*`,
      },
      {
        begin: `<%[%=-]?`,
        end: `[%-]?%>`,
        subLanguage: `ruby`,
        excludeBegin: !0,
        excludeEnd: !0,
        relevance: 0,
      },
      { className: `type`, begin: `!\\w+!` + n },
      { className: `type`, begin: `!<` + n + `>` },
      { className: `type`, begin: `!` + n },
      { className: `type`, begin: `!!` + n },
      { className: `meta`, begin: `&` + e.UNDERSCORE_IDENT_RE + `$` },
      { className: `meta`, begin: `\\*` + e.UNDERSCORE_IDENT_RE + `$` },
      { className: `bullet`, begin: `-(?=[ ]|$)`, relevance: 0 },
      e.HASH_COMMENT_MODE,
      { beginKeywords: t, keywords: { literal: t } },
      c,
      { className: `number`, begin: e.C_NUMBER_RE + `\\b`, relevance: 0 },
      u,
      d,
      a,
      o,
    ],
    p = [...f];
  return (
    p.pop(),
    p.push(s),
    (l.contains = p),
    { name: `YAML`, case_insensitive: !0, aliases: [`yml`], contains: f }
  );
}
function Ut() {
  return (Ut = t(() => {}))();
}
function Wt(e) {
  let t = Kt[e];
  if (t) return t;
  t = Kt[e] = [];
  for (let e = 0; e < 128; e++) {
    let n = String.fromCharCode(e);
    t.push(n);
  }
  for (let n = 0; n < e.length; n++) {
    let r = e.charCodeAt(n);
    t[r] = `%` + (`0` + r.toString(16).toUpperCase()).slice(-2);
  }
  return t;
}
function Gt(e, t) {
  typeof t != `string` && (t = Gt.defaultChars);
  let n = Wt(t);
  return e.replace(/(%[a-f0-9]{2})+/gi, function (e) {
    let t = ``;
    for (let r = 0, i = e.length; r < i; r += 3) {
      let a = parseInt(e.slice(r + 1, r + 3), 16);
      if (a < 128) {
        t += n[a];
        continue;
      }
      if ((a & 224) == 192 && r + 3 < i) {
        let n = parseInt(e.slice(r + 4, r + 6), 16);
        if ((n & 192) == 128) {
          let e = ((a << 6) & 1984) | (n & 63);
          ((t += e < 128 ? `��` : String.fromCharCode(e)), (r += 3));
          continue;
        }
      }
      if ((a & 240) == 224 && r + 6 < i) {
        let n = parseInt(e.slice(r + 4, r + 6), 16),
          i = parseInt(e.slice(r + 7, r + 9), 16);
        if ((n & 192) == 128 && (i & 192) == 128) {
          let e = ((a << 12) & 61440) | ((n << 6) & 4032) | (i & 63);
          ((t += e < 2048 || (e >= 55296 && e <= 57343) ? `���` : String.fromCharCode(e)),
            (r += 6));
          continue;
        }
      }
      if ((a & 248) == 240 && r + 9 < i) {
        let n = parseInt(e.slice(r + 4, r + 6), 16),
          i = parseInt(e.slice(r + 7, r + 9), 16),
          o = parseInt(e.slice(r + 10, r + 12), 16);
        if ((n & 192) == 128 && (i & 192) == 128 && (o & 192) == 128) {
          let e = ((a << 18) & 1835008) | ((n << 12) & 258048) | ((i << 6) & 4032) | (o & 63);
          (e < 65536 || e > 1114111
            ? (t += `����`)
            : ((e -= 65536), (t += String.fromCharCode(55296 + (e >> 10), 56320 + (e & 1023)))),
            (r += 9));
          continue;
        }
      }
      t += `�`;
    }
    return t;
  });
}
var Kt;
function qt() {
  return (qt = t(() => {
    ((Kt = {}), (Gt.defaultChars = `;/?:@&=+$,#`), (Gt.componentChars = ``));
  }))();
}
function Jt(e) {
  let t = Yt[e];
  if (t) return t;
  t = Yt[e] = [];
  for (let e = 0; e < 128; e++) {
    let n = String.fromCharCode(e);
    /^[0-9a-z]$/i.test(n)
      ? t.push(n)
      : t.push(`%` + (`0` + e.toString(16).toUpperCase()).slice(-2));
  }
  for (let n = 0; n < e.length; n++) t[e.charCodeAt(n)] = e[n];
  return t;
}
function q(e, t, n) {
  (typeof t != `string` && ((n = t), (t = q.defaultChars)), n === void 0 && (n = !0));
  let r = Jt(t),
    i = ``;
  for (let t = 0, a = e.length; t < a; t++) {
    let o = e.charCodeAt(t);
    if (n && o === 37 && t + 2 < a && /^[0-9a-f]{2}$/i.test(e.slice(t + 1, t + 3))) {
      ((i += e.slice(t, t + 3)), (t += 2));
      continue;
    }
    if (o < 128) {
      i += r[o];
      continue;
    }
    if (o >= 55296 && o <= 57343) {
      if (o >= 55296 && o <= 56319 && t + 1 < a) {
        let n = e.charCodeAt(t + 1);
        if (n >= 56320 && n <= 57343) {
          ((i += encodeURIComponent(e[t] + e[t + 1])), t++);
          continue;
        }
      }
      i += `%EF%BF%BD`;
      continue;
    }
    i += encodeURIComponent(e[t]);
  }
  return i;
}
var Yt;
function Xt() {
  return (Xt = t(() => {
    ((Yt = {}), (q.defaultChars = `;/?:@&=+$,-_.!~*'()#`), (q.componentChars = `-_.!~*'()`));
  }))();
}
function Zt(e) {
  let t = ``;
  return (
    (t += e.protocol || ``),
    (t += e.slashes ? `//` : ``),
    (t += e.auth ? e.auth + `@` : ``),
    e.hostname && e.hostname.indexOf(`:`) !== -1
      ? (t += `[` + e.hostname + `]`)
      : (t += e.hostname || ``),
    (t += e.port ? `:` + e.port : ``),
    (t += e.pathname || ``),
    (t += e.search || ``),
    (t += e.hash || ``),
    t
  );
}
function Qt() {
  ((this.protocol = null),
    (this.slashes = null),
    (this.auth = null),
    (this.port = null),
    (this.hostname = null),
    (this.hash = null),
    (this.search = null),
    (this.pathname = null));
}
function $t(e, t) {
  if (e && e instanceof Qt) return e;
  let n = new Qt();
  return (n.parse(e, t), n);
}
var en, tn, nn, rn, an, on, sn, cn, ln, un, dn, fn;
function pn() {
  return (pn = t(() => {
    ((en = /^([a-z0-9.+-]+:)/i),
      (tn = /:[0-9]*$/),
      (nn = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/),
      (rn = [
        `{`,
        `}`,
        `|`,
        `\\`,
        `^`,
        "`",
        `<`,
        `>`,
        `"`,
        "`",
        ` `,
        `\r`,
        `
`,
        `	`,
      ]),
      (an = [`'`].concat(rn)),
      (on = [`%`, `/`, `?`, `;`, `#`].concat(an)),
      (sn = [`/`, `?`, `#`]),
      (cn = 255),
      (ln = /^[+a-z0-9A-Z_-]{0,63}$/),
      (un = /^([+a-z0-9A-Z_-]{0,63})(.*)$/),
      (dn = { javascript: !0, "javascript:": !0 }),
      (fn = {
        http: !0,
        https: !0,
        ftp: !0,
        gopher: !0,
        file: !0,
        "http:": !0,
        "https:": !0,
        "ftp:": !0,
        "gopher:": !0,
        "file:": !0,
      }),
      (Qt.prototype.parse = function (e, t) {
        let n,
          r,
          i,
          a = e;
        if (((a = a.trim()), !t && e.split(`#`).length === 1)) {
          let e = nn.exec(a);
          if (e) return ((this.pathname = e[1]), e[2] && (this.search = e[2]), this);
        }
        let o = en.exec(a);
        if (
          (o && ((o = o[0]), (n = o.toLowerCase()), (this.protocol = o), (a = a.substr(o.length))),
          (t || o || a.match(/^\/\/[^@\/]+@[^@\/]+/)) &&
            ((i = a.substr(0, 2) === `//`),
            i && !(o && dn[o]) && ((a = a.substr(2)), (this.slashes = !0))),
          !dn[o] && (i || (o && !fn[o])))
        ) {
          let e = -1;
          for (let t = 0; t < sn.length; t++)
            ((r = a.indexOf(sn[t])), r !== -1 && (e === -1 || r < e) && (e = r));
          let t, n;
          ((n = e === -1 ? a.lastIndexOf(`@`) : a.lastIndexOf(`@`, e)),
            n !== -1 && ((t = a.slice(0, n)), (a = a.slice(n + 1)), (this.auth = t)),
            (e = -1));
          for (let t = 0; t < on.length; t++)
            ((r = a.indexOf(on[t])), r !== -1 && (e === -1 || r < e) && (e = r));
          (e === -1 && (e = a.length), a[e - 1] === `:` && e--);
          let i = a.slice(0, e);
          ((a = a.slice(e)), this.parseHost(i), (this.hostname = this.hostname || ``));
          let o = this.hostname[0] === `[` && this.hostname[this.hostname.length - 1] === `]`;
          if (!o) {
            let e = this.hostname.split(/\./);
            for (let t = 0, n = e.length; t < n; t++) {
              let n = e[t];
              if (n && !n.match(ln)) {
                let r = ``;
                for (let e = 0, t = n.length; e < t; e++)
                  n.charCodeAt(e) > 127 ? (r += `x`) : (r += n[e]);
                if (!r.match(ln)) {
                  let r = e.slice(0, t),
                    i = e.slice(t + 1),
                    o = n.match(un);
                  (o && (r.push(o[1]), i.unshift(o[2])),
                    i.length && (a = i.join(`.`) + a),
                    (this.hostname = r.join(`.`)));
                  break;
                }
              }
            }
          }
          (this.hostname.length > cn && (this.hostname = ``),
            o && (this.hostname = this.hostname.substr(1, this.hostname.length - 2)));
        }
        let s = a.indexOf(`#`);
        s !== -1 && ((this.hash = a.substr(s)), (a = a.slice(0, s)));
        let c = a.indexOf(`?`);
        return (
          c !== -1 && ((this.search = a.substr(c)), (a = a.slice(0, c))),
          a && (this.pathname = a),
          fn[n] && this.hostname && !this.pathname && (this.pathname = ``),
          this
        );
      }),
      (Qt.prototype.parseHost = function (e) {
        let t = tn.exec(e);
        (t &&
          ((t = t[0]),
          t !== `:` && (this.port = t.substr(1)),
          (e = e.substr(0, e.length - t.length))),
          e && (this.hostname = e));
      }));
  }))();
}
var mn = n({ decode: () => Gt, encode: () => q, format: () => Zt, parse: () => $t });
function hn() {
  return (hn = t(() => {
    (qt(), Xt(), pn());
  }))();
}
var gn = n({ Any: () => _n, Cc: () => vn, Cf: () => J, P: () => yn, S: () => bn, Z: () => xn }),
  _n,
  vn,
  J,
  yn,
  bn,
  xn;
function Sn() {
  return (Sn = t(() => {
    ((_n =
      /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/),
      (vn = /[\0-\x1F\x7F-\x9F]/),
      (J =
        /[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/),
      (yn =
        /[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B4E\u1B4F\u1B5A-\u1B60\u1B7D-\u1B7F\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDD6E\uDEAD\uDED0\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9\uDFD4\uDFD5\uDFD7\uDFD8]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09\uDFE1]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDD6D-\uDD6F\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD839\uDDFF|\uD83A[\uDD5E\uDD5F]/),
      (bn =
        /[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C1\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2429\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E5\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD803[\uDD8E\uDD8F\uDED1-\uDED8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDC00-\uDCEF\uDCFA-\uDCFC\uDD00-\uDEB3\uDEBA-\uDED0\uDEE0-\uDEF0\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED8\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0-\uDCBB\uDCC0\uDCC1\uDCD0-\uDCD8\uDD00-\uDE57\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF-\uDEF8\uDF00-\uDF92\uDF94-\uDFEF\uDFFA]/),
      (xn = /[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/));
  }))();
}
function Cn(e) {
  return (e >= 55296 && e <= 57343) || e > 1114111 ? 65533 : (wn.get(e) ?? e);
}
var wn;
function Tn() {
  return (Tn = t(() => {
    wn = new Map([
      [0, 65533],
      [128, 8364],
      [130, 8218],
      [131, 402],
      [132, 8222],
      [133, 8230],
      [134, 8224],
      [135, 8225],
      [136, 710],
      [137, 8240],
      [138, 352],
      [139, 8249],
      [140, 338],
      [142, 381],
      [145, 8216],
      [146, 8217],
      [147, 8220],
      [148, 8221],
      [149, 8226],
      [150, 8211],
      [151, 8212],
      [152, 732],
      [153, 8482],
      [154, 353],
      [155, 8250],
      [156, 339],
      [158, 382],
      [159, 376],
    ]);
  }))();
}
function En(e) {
  let t = atob(e),
    n = t.length & -2,
    r = new Uint16Array(n / 2);
  for (let e = 0, i = 0; e < n; e += 2) {
    let n = t.charCodeAt(e),
      a = t.charCodeAt(e + 1);
    r[i++] = n | (a << 8);
  }
  return r;
}
var Dn;
function On() {
  return (On = t(() => {
    Dn = En(
      `QR08ALkAAgH6AYsDNQR2BO0EPgXZBQEGLAbdBxMISQrvCmQLfQurDKQNLw4fD4YPpA+6D/IPAAAAAAAAAAAAAAAAKhBMEY8TmxUWF2EYLBkxGuAa3RsJHDscWR8YIC8jSCSIJcMl6ie3Ku8rEC0CLjoupS7kLgAIRU1hYmNmZ2xtbm9wcnN0dVQAWgBeAGUAaQBzAHcAfgCBAIQAhwCSAJoAoACsALMAbABpAGcAO4DGAMZAUAA7gCYAJkBjAHUAdABlADuAwQDBQHIiZXZlAAJhAAFpeW0AcgByAGMAO4DCAMJAEGRyAADgNdgE3XIAYQB2AGUAO4DAAMBA8CFoYZFj4SFjcgBhZAAAoFMqAAFncIsAjgBvAG4ABGFmAADgNdg43fAlbHlGdW5jdGlvbgCgYSBpAG4AZwA7gMUAxUAAAWNzpACoAHIAAOA12Jzc6SFnbgCgVCJpAGwAZABlADuAwwDDQG0AbAA7gMQAxEAABGFjZWZvcnN1xQDYANoA7QDxAPYA+QD8AAABY3LJAM8AayNzbGFzaAAAoBYidgHTANUAAKDnKmUAZAAAoAYjeQARZIABY3J0AOAA5QDrAGEidXNlAACgNSLuI291bGxpcwCgLCFhAJJjcgAA4DXYBd1wAGYAAOA12Dnd5SF2ZdhiYwDyAOoAbSJwZXEAAKBOIgAHSE9hY2RlZmhpbG9yc3UXARoBHwE6AVIBVQFiAWQBZgGCAakB6QHtAfIBYwB5ACdkUABZADuAqQCpQIABY3B5ACUBKAE1AfUhdGUGYWmg0iJ0KGFsRGlmZmVyZW50aWFsRAAAoEUhbCJleXMAAKAtIQACYWVpb0EBRAFKAU0B8iFvbgxhZABpAGwAO4DHAMdAcgBjAAhhbiJpbnQAAKAwIm8AdAAKYQABZG5ZAV0BaSJsbGEAuGB0I2VyRG90ALdg8gA5AWkAp2NyImNsZQAAAkRNUFRwAXQBeQF9AW8AdAAAoJkiaSJudXMAAKCWIuwhdXMAoJUiaSJtZXMAAKCXIm8AAAFjc4cBlAFrKndpc2VDb250b3VySW50ZWdyYWwAAKAyImUjQ3VybHkAAAFEUZwBpAFvJXVibGVRdW90ZQAAoB0gdSJvdGUAAKAZIAACbG5wdbABtgHNAdgBbwBuAGWgNyIAoHQqgAFnaXQAvAHBAcUB8iJ1ZW50AKBhIm4AdAAAoC8i7yV1ckludGVncmFsAKAuIgABZnLRAdMBAKACIe8iZHVjdACgECJuLnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbAAAoDMi7yFzcwCgLypjAHIAAOA12J7ccABDoNMiYQBwAACgTSKABURKU1phY2VmaW9zAAsCEgIVAhgCGwIsAjQCOQI9AnMCfwNvoEUh9CJyYWhkAKARKWMAeQACZGMAeQAFZGMAeQAPZIABZ3JzACECJQIoAuchZXIAoCEgcgAAoKEhaAB2AACg5CoAAWF5MAIzAvIhb24OYRRkbAB0oAciYQCUY3IAAOA12AfdAAFhZkECawIAAWNtRQJnAvIjaXRpY2FsAAJBREdUUAJUAl8CYwJjInV0ZQC0YG8AdAFZAloC2WJiJGxlQWN1dGUA3WJyImF2ZQBgYGkibGRlANxi7yFuZACgxCJmJWVyZW50aWFsRAAAoEYhcAR9AgAAAAAAAIECjgIAABoDZgAA4DXYO91EoagAhQKJAm8AdAAAoNwgcSJ1YWwAAKBQIuIhbGUAA0NETFJVVpkCqAK1Au8C/wIRA28AbgB0AG8AdQByAEkAbgB0AGUAZwByAGEA7ADEAW8AdAKvAgAAAACwAqhgbiNBcnJvdwAAoNMhAAFlb7kC0AJmAHQAgAFBUlQAwQLGAs0CciJyb3cAAKDQIekkZ2h0QXJyb3cAoNQhZQDlACsCbgBnAAABTFLWAugC5SFmdAABQVLcAuECciJyb3cAAKD4J+kkZ2h0QXJyb3cAoPon6SRnaHRBcnJvdwCg+SdpImdodAAAAUFU9gL7AnIicm93AACg0iFlAGUAAKCoInAAQQIGAwAAAAALA3Iicm93AACg0SFvJHduQXJyb3cAAKDVIWUlcnRpY2FsQmFyAACgJSJuAAADQUJMUlRhJAM2AzoDWgNxA3oDciJyb3cAAKGTIUJVLAMwA2EAcgAAoBMpcCNBcnJvdwAAoPUhciJldmUAEWPlIWZ00gJDAwAASwMAAFIDaSVnaHRWZWN0b3IAAKBQKWUkZVZlY3RvcgAAoF4p5SJjdG9yQqC9IWEAcgAAoFYpaSJnaHQA1AFiAwAAaQNlJGVWZWN0b3IAAKBfKeUiY3RvckKgwSFhAHIAAKBXKWUAZQBBoKQiciJyb3cAAKCnIXIAcgBvAPcAtAIAAWN0gwOHA3IA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YwAAoN8i4SFycnCgtiEAoD0pgKIqImJjZG9zACsVMBU6FT4VQRVyImNhcAAAoEgqAAFhdTQVNxVwAACgRipwAACgSipvAHQAAKCNInIAAKBFKgDgKiIA/gACYWxydksVURVuFXMVcgByAG2gtyEAoDwpeQCAAWV2dwBYFWUVaRVxAHACXxUAAAAAYxVyAGUA4wAXFXUA4wAZFWUAZQAAoM4iZSJkZ2UAAKDPImUAbgA7gKQApEBlI2Fycm93AAABbHJ7FX8V5SFmdACgtiFpImdodAAAoLchZQDkAG0VAAFjaYsVkRVvAG4AaQBuAPQAkwFuAHQAAKAxImwiY3R5AACgLSOACUFIYWJjZGVmaGlqbG9yc3R1d3oAuBW7Fb8V1RXgFegV+RUKFhUWHxZUFlcWZRbFFtsW7xb7FgUXChdyAPIAtAJhAHIAAKBlKQACZ2xyc8YVyhXOFdAV5yFlcgCgICDlIXRoAKA4IfIA9QxoAHagECAAoKMiawHZFd4VYSJyb3cAAKAPKWEA4wBfAgABYXnkFecV8iFvbg9hNGQAoUYhYW/tFfQVAAFnciEC8RVyAACgyiF0InNlcQAAoHcqgAFnbG0A/xUCFgUWO4CwALBAdABhALRjcCJ0eXYAAKCxKQABaXIOFhIW8yFodACgfykA4DXYId1hAHIAAAFschsWHRYAoMMhAKDCIYACYWVnc3YAKBauAjYWOhY+Fm0AAKHEIm9zLhY0Fm4AZABzoMQi9SFpdACgZiZhIm1tYQDdY2kAbgAAoPIiAKH3AGlvQxZRFmQAZQAAgfcAO29KFksW90BuI3RpbWVzAACgxyJuAPgAUBZjAHkAUmRjAG8CXhYAAAAAYhZyAG4AAKAeI28AcAAAoA0jgAJscHR1dwBuFnEWdRaSFp4W7CFhciRgZgAA4DXYVd0AotkCZW1wc30WhBaJFo0WcQBkoFAibwB0AACgUSJpIm51cwAAoDgi7CF1cwCgFCLxInVhcmUAoKEiYgBsAGUAYgBhAHIAdwBlAGQAZwDlANcAbgCAAWFkaAClFqoWtBZyAHIAbwD3APUMbwB3AG4AYQByAHIAbwB3APMA8xVhI3Jwb29uAAABbHK8FsAWZQBmAPQAHBZpAGcAaAD0AB4WYgHJFs8WawBhAHIAbwD3AJILbwLUFgAAAADYFnIAbgAAoB8jbwBwAACgDCOAAWNvdADhFukW7BYAAXJ55RboFgDgNdi53FVkbAAAoPYp8iFvaxFhAAFkcvMW9xZvAHQAAKDxImkA5qC/JVsSAAFhaP8WAhdyAPIANQNhAPIA1wvhIm5nbGUAoKYpAAFjaQ4XEBd5AF9k5yJyYXJyAKD/JwAJRGFjZGVmZ2xtbm9wcXJzdHV4MRc4F0YXWxcyBF4XaRd5F40XrBe0F78X2RcVGCEYLRg1GEAYAAFEbzUXgRZvAPQA+BUAAWNzPBdCF3UAdABlADuA6QDpQPQhZXIAoG4qAAJhaW95TRdQF1YXWhfyIW9uG2FyAGOgViI7gOoA6kDsIW9uAKBVIk1kbwB0ABdhAAFEcmIXZhdvAHQAAKBSIgDgNdgi3XKhmipuF3QXYQB2AGUAO4DoAOhAZKCWKm8AdAAAoJgqgKGZKmlscwCAF4UXhxfuInRlcnMAoOcjAKATIWSglSpvAHQAAKCXKoABYXBzAJMXlheiF2MAcgATYXQAeQBzogUinxcAAAAAoRdlAHQAAKAFInAAMaADIDMBqRerFwCgBCAAoAUgAAFnc7AXsRdLYXAAAKACIAABZ3C4F7sXbwBuABlhZgAA4DXYVt2AAWFscwDFF8sXzxdyAHOg1SJsAACg4yl1AHMAAKBxKmkAAKG1A2x21RfYF28AbgC1Y/VjAAJjc3V24BfoF/0XEBgAAWlv5BdWF3IAYwAAoFYiaQLuFwAAAADwF+0ADQThIW50AAFnbPUX+Rd0AHIAAKCWKuUhc3MAoJUqgAFhZWkAAxgGGAoYbABzAD1gcwB0AACgXyJ2AESgYSJEAACgeCrwImFyc2wAoOUpAAFEYRkYHRhvAHQAAKBTInIAcgAAoHEpgAFjZGkAJxgqGO0XcgAAoC8hbwD0AIwCAAFhaDEYMhi3YzuA8ADwQAABbXI5GD0YbAA7gOsA60BvAACgrCCAAWNpcABGGEgYSxhsACFgcwD0ACwEAAFlb08YVxhjAHQAYQB0AGkAbwDuABoEbgBlAG4AdABpAGEAbADlADME4Ql1GAAAgRgAAIMYiBgAAAAAoRilGAAAqhgAALsYvhjRGAAA1xgnGWwAbABpAG4AZwBkAG8AdABzAGUA8QBlF3kARGRtImFsZQAAoEAmgAFpbHIAjRiRGJ0Y7CFpZwCgA/tpApcYAAAAAJoYZwAAoAD7aQBnAACgBPsA4DXYI93sIWlnAKAB++whaWcA4GYAagCAAWFsdACvGLIYthh0AACgbSZpAGcAAKAC+24AcwAAoLElbwBmAJJh8AHCGAAAxhhmAADgNdhX3QABYWvJGMwYbADsAGsEdqDUIgCg2SphI3J0aW50AACgDSoAAWFv2hgiGQABY3PeGB8ZsQPnGP0YBRkSGRUZAAAdGbID7xjyGPQY9xj5GAAA+xg7gL0AvUAAoFMhO4C8ALxAAKBVIQCgWSEAoFshswEBGQAAAxkAoFQhAKBWIbQCCxkOGQAAAAAQGTuAvgC+QACgVyEAoFwhNQAAoFghtgEZGQAAGxkAoFohAKBdITgAAKBeIWwAAKBEIHcAbgAAoCIjYwByAADgNdi73IAIRWFiY2RlZmdpamxub3JzdHYARhlKGVoZXhlmGWkZkhmWGZkZnRmgGa0ZxhnLGc8Z4BkjGmygZyIAoIwqgAFjbXAAUBlTGVgZ9SF0ZfVhbQBhAOSgswM6FgCghipyImV2ZQAfYQABaXliGWUZcgBjAB1hM2RvAHQAIWGAoWUibHFzAMYEcBl6GfGhZSLOBAAAdhlsAGEAbgD0AN8EgKF+KmNkbACBGYQZjBljAACgqSpvAHQAb6CAKmyggioAoIQqZeDbIgD+cwAAoJQqcgAA4DXYJN3noGsirATtIWVsAKA3IWMAeQBTZIChdyJFYWoApxmpGasZAKCSKgCgpSoAoKQqAAJFYWVztBm2Gb0ZwhkAoGkicABwoIoq8iFveACgiipxoIgq8aCIKrUZaQBtAACg5yJwAGYAAOA12FjdYQB2AOUAYwIAAWNp0xnWGXIAAKAKIW0AAKFzImVs3BneGQCgjioAoJAqAIM+ADtjZGxxco0E6xn0GfgZ/BkBGgABY2nvGfEZAKCnKnIAAKB6Km8AdAAAoNci0CFhcgCglSl1ImVzdAAAoHwqgAJhZGVscwAKGvQZFhrVBCAa8AEPGgAAFBpwAHIAbwD4AFkZcgAAoHgpcQAAAWxxxAQbGmwAZQBzAPMASRlpAO0A5AQAAWVuJxouGnIjdG5lcXEAAOBpIgD+xQAsGgAFQWFiY2Vma29zeUAaQxpmGmoabRqDGocalhrCGtMacgDyAMwCAAJpbG1yShpOGlAaVBpyAHMA8ABxD2YAvWBpAGwA9AASBQABZHJYGlsaYwB5AEpkAKGUIWN3YBpkGmkAcgAAoEgpAKCtIWEAcgAAoA8h6SFyYyVhgAFhbHIAcxp7Gn8a8iF0c3WgZSZpAHQAAKBlJuwhaXAAoCYg4yFvbgCguSJyAADgNdgl3XMAAAFld4wakRphInJvdwAAoCUpYSJyb3cAAKAmKYACYW1vcHIAnxqjGqcauhq+GnIAcgAAoP8h9CFodACgOyJrAAABbHKsGrMaZSRmdGFycm93AACgqSHpJGdodGFycm93AKCqIWYAAOA12Fnd4iFhcgCgFSCAAWNsdADIGswa0BpyAADgNdi93GEAcwDoAGka8iFvaydhAAFicNca2xr1IWxsAKBDIOghZW4AoBAg4Qr2GgAA/RoAAAgbExsaGwAAIRs7GwAAAAA+G2IbmRuVG6sbAACyG80b0htjAHUAdABlADuA7QDtQAChYyBpeQEbBhtyAGMAO4DuAO5AOGQAAWN4CxsNG3kANWRjAGwAO4ChAKFAAAFmcssCFhsA4DXYJt1yAGEAdgBlADuA7ADsQIChSCFpbm8AJxsyGzYbAAFpbisbLxtuAHQAAKAMKnQAAKAtIuYhaW4AoNwpdABhAACgKSHsIWlnM2GAAWFvcABDG1sbXhuAAWNndABJG0sbWRtyACthgAFlbHAAcQVRG1UbaQBuAOUAyAVhAHIA9AByBWgAMWFmAACgtyJlAGQAtWEAoggiY2ZvdGkbbRt1G3kb4SFyZQCgBSFpAG4AdKAeImkAZQAAoN0pZABvAPQAWxsAoisiY2VscIEbhRuPG5QbYQBsAACguiIAAWdyiRuNG2UAcgDzACMQ4wCCG2EicmhrAACgFyryIW9kAKA8KgACY2dwdJ8boRukG6gbeQBRZG8AbgAvYWYAAOA12FrdYQC5Y3UAZQBzAHQAO4C/AL9AAAFjabUbuRtyAADgNdi+3G4AAKIIIkVkc3bCG8QbyBvQAwCg+SJvAHQAAKD1Inag9CIAoPMiaaBiIOwhZGUpYesB1hsAANkbYwB5AFZkbAA7gO8A70AAA2NmbW9zdeYb7hvyG/Ub+hsFHAABaXnqG+0bcgBjADVhOWRyAADgNdgn3eEhdGg3YnAAZgAA4DXYW93jAf8bAAADHHIAAOA12L/c8iFjeVhk6yFjeVRkAARhY2ZnaGpvcxUcGhwiHCYcKhwtHDAcNRzwIXBhdqC6A/BjAAFleR4cIRzkIWls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ZmdobG1vcHJzdHV3CiwNLBEsHSwnLDEsQCxLLFIsYix6LIQsjyzLLOgs7Sz/LAotcgDyAAkDYQByAACgYykAAWNyFSwbLHUAdABlADuA+gD6QPIACQ1yAOMBIywAACUseQBeZHYAZQBtYQABaXkrLDAscgBjADuA+wD7QENkgAFhYmgANyw6LD0scgDyANEO7CFhY3FhYQDyAOAOAAFpckQsSCzzIWh0AKB+KQDgNdgy3XIAYQB2AGUAO4D5APlAYQFWLF8scgAAAWxyWixcLACgvyEAoL4hbABrAACggCUAAWN0Zix2LG8CbCwAAAAAcyxyAG4AZaAcI3IAAKAcI28AcAAAoA8jcgBpAACg+CUAAWFsfiyBLGMAcgBrYTuAqACoQAABZ3CILIssbwBuAHNhZgAA4DXYZt0AA2FkaGxzdZksniynLLgsuyzFLHIAcgBvAPcACQ1vAHcAbgBhAHIAcgBvAPcA2A5hI3Jwb29uAAABbHKvLLMsZQBmAPQAWyxpAGcAaAD0AF0sdQDzAKYOaQAAocUDaGzBLMIs0mNvAG4AxWPwI2Fycm93cwCgyCGAAWNpdADRLOEs5CxvAtcsAAAAAN4scgBuAGWgHSNyAACgHSNvAHAAAKAOI24AZwBvYXIAaQAAoPklYwByAADgNdjK3IABZGlyAPMs9yz6LG8AdAAAoPAi7CFkZWlhaQBmoLUlAKC0JQABYW0DLQYtcgDyAMosbAA7gPwA/EDhIm5nbGUAoKcpgAdBQkRhY2RlZmxub3Byc3oAJy0qLTAtNC2bLZ0toS2/LcMtxy3TLdgt3C3gLfwtcgDyABADYQByAHag6CoAoOkqYQBzAOgA/gIAAW5yOC08LechcnQAoJwpgANla25wcnN0AJkpSC1NLVQtXi1iLYItYQBwAHAA4QAaHG8AdABoAGkAbgDnAKEXgAFoaXIAoSmzJFotbwBwAPQAdCVooJUh7wD4JgABaXVmLWotZwBtAOEAuygAAWJwbi14LXMjZXRuZXEAceCKIgD+AODLKgD+cyNldG5lcQBx4IsiAP4A4MwqAP4AAWhyhi2KLWUAdADhABIraSNhbmdsZQAAAWxyki2WLeUhZnQAoLIiaSJnaHQAAKCzInkAMmThIXNoAKCiIoABZWxyAKcttC24LWKiKCKuLQAAAACyLWEAcgAAoLsicQAAoFoi7CFpcACg7iIAAWJ0vC1eD2EA8gBfD3IAAOA12DPddAByAOkAlS1zAHUAAAFicM0t0C0A4IIi0iAA4IMi0iBwAGYAAOA12GfdcgBvAPAAWQt0AHIA6QCaLQABY3XkLegtcgAA4DXYy9wAAWJw7C30LW4AAAFFZXUt8S0A4IoiAP5uAAABRWV/LfktAOCLIgD+6SJnemFnAKCaKYADY2Vmb3BycwANLhAuJS4pLiMuLi40LukhcmN1YQABZGkULiEuAAFiZxguHC5hAHIAAKBfKmUAcaAnIgCgWSLlIXJwAKAYIXIAAOA12DTdcABmAADgNdho3WWgQCJhAHQA6ABqD2MAcgAA4DXYzNzjCuQRUC4AAFQuAABYLmIuAAAAAGMubS5wLnQuAAAAAIguki4AAJouJxIqEnQAcgDpAB0ScgAA4DXYNd0AAUFhWy5eLnIA8gDnAnIA8gCTB75jAAFBYWYuaS5yAPIA4AJyAPIAjAdhAPAAeh5pAHMAAKD7IoABZHB0APgReS6DLgABZmx9LoAuAOA12GnddQDzAP8RaQBtAOUABBIAAUFhiy6OLnIA8gDuAnIA8gCaBwABY3GVLgoScgAA4DXYzdwAAXB0nS6hLmwAdQDzACUScgDpACASAARhY2VmaW9zdbEuvC7ELsguzC7PLtQu2S5jAAABdXm2LrsudABlADuA/QD9QE9kAAFpecAuwy5yAGMAd2FLZG4AO4ClAKVAcgAA4DXYNt1jAHkAV2RwAGYAAOA12GrdYwByAADgNdjO3AABY23dLt8ueQBOZGwAO4D/AP9AAAVhY2RlZmhpb3N38y73Lv8uAi8MLxAvEy8YLx0vIi9jInV0ZQB6YQABYXn7Lv4u8iFvbn5hN2RvAHQAfGEAAWV0Bi8KL3QAcgDmAB8QYQC2Y3IAAOA12DfdYwB5ADZk5yJyYXJyAKDdIXAAZgAA4DXYa91jAHIAAOA12M/cAAFqbiYvKC8AoA0gagAAoAwg`,
    );
  }))();
}
var Y;
function kn() {
  return (kn = t(() => {
    (function (e) {
      ((e[(e.VALUE_LENGTH = 49152)] = `VALUE_LENGTH`),
        (e[(e.FLAG13 = 8192)] = `FLAG13`),
        (e[(e.BRANCH_LENGTH = 8064)] = `BRANCH_LENGTH`),
        (e[(e.JUMP_TABLE = 127)] = `JUMP_TABLE`));
    })((Y ||= {}));
  }))();
}
function An(e) {
  return e >= X.ZERO && e <= X.NINE;
}
function jn(e) {
  return (e >= X.UPPER_A && e <= X.UPPER_F) || (e >= X.LOWER_A && e <= X.LOWER_F);
}
function Mn(e) {
  return (e >= X.UPPER_A && e <= X.UPPER_Z) || (e >= X.LOWER_A && e <= X.LOWER_Z) || An(e);
}
function Nn(e) {
  return e === X.EQUALS || Mn(e);
}
function Pn(e) {
  let t = ``,
    n = new zn(e, (e) => (t += String.fromCodePoint(e)));
  return function (e, r) {
    let i = 0,
      a = 0;
    for (; (a = e.indexOf(`&`, a)) >= 0;) {
      ((t += e.slice(i, a)), n.startEntity(r));
      let o = n.write(e, a + 1);
      if (o < 0) {
        i = a + n.end();
        break;
      }
      ((i = a + o), (a = o === 0 ? i + 1 : i));
    }
    let o = t + e.slice(i);
    return ((t = ``), o);
  };
}
function Fn(e, t, n, r) {
  let i = (t & Y.BRANCH_LENGTH) >> 7,
    a = t & Y.JUMP_TABLE;
  if (i === 0) return a !== 0 && r === a ? n : -1;
  if (a) {
    let t = r - a;
    return t < 0 || t >= i ? -1 : e[n + t] - 1;
  }
  let o = (i + 1) >> 1,
    s = 0,
    c = i - 1;
  for (; s <= c;) {
    let t = (s + c) >>> 1,
      i = (e[n + (t >> 1)] >> ((t & 1) * 8)) & 255;
    if (i < r) s = t + 1;
    else if (i > r) c = t - 1;
    else return e[n + o + t];
  }
  return -1;
}
function In(e) {
  return Bn(e, Rn.Strict);
}
var X, Ln, Z, Rn, zn, Bn;
function Vn() {
  return (Vn = t(() => {
    (Tn(),
      On(),
      kn(),
      (function (e) {
        ((e[(e.NUM = 35)] = `NUM`),
          (e[(e.SEMI = 59)] = `SEMI`),
          (e[(e.EQUALS = 61)] = `EQUALS`),
          (e[(e.ZERO = 48)] = `ZERO`),
          (e[(e.NINE = 57)] = `NINE`),
          (e[(e.LOWER_A = 97)] = `LOWER_A`),
          (e[(e.LOWER_F = 102)] = `LOWER_F`),
          (e[(e.LOWER_X = 120)] = `LOWER_X`),
          (e[(e.LOWER_Z = 122)] = `LOWER_Z`),
          (e[(e.UPPER_A = 65)] = `UPPER_A`),
          (e[(e.UPPER_F = 70)] = `UPPER_F`),
          (e[(e.UPPER_Z = 90)] = `UPPER_Z`));
      })((X ||= {})),
      (Ln = 32),
      (function (e) {
        ((e[(e.EntityStart = 0)] = `EntityStart`),
          (e[(e.NumericStart = 1)] = `NumericStart`),
          (e[(e.NumericDecimal = 2)] = `NumericDecimal`),
          (e[(e.NumericHex = 3)] = `NumericHex`),
          (e[(e.NamedEntity = 4)] = `NamedEntity`));
      })((Z ||= {})),
      (function (e) {
        ((e[(e.Legacy = 0)] = `Legacy`),
          (e[(e.Strict = 1)] = `Strict`),
          (e[(e.Attribute = 2)] = `Attribute`));
      })((Rn ||= {})),
      (zn = class {
        decodeTree;
        emitCodePoint;
        errors;
        constructor(e, t, n) {
          ((this.decodeTree = e), (this.emitCodePoint = t), (this.errors = n));
        }
        state = Z.EntityStart;
        consumed = 1;
        result = 0;
        treeIndex = 0;
        excess = 1;
        decodeMode = Rn.Strict;
        runConsumed = 0;
        startEntity(e) {
          ((this.decodeMode = e),
            (this.state = Z.EntityStart),
            (this.result = 0),
            (this.treeIndex = 0),
            (this.excess = 1),
            (this.consumed = 1),
            (this.runConsumed = 0));
        }
        write(e, t) {
          switch (this.state) {
            case Z.EntityStart:
              return e.charCodeAt(t) === X.NUM
                ? ((this.state = Z.NumericStart),
                  (this.consumed += 1),
                  this.stateNumericStart(e, t + 1))
                : ((this.state = Z.NamedEntity), this.stateNamedEntity(e, t));
            case Z.NumericStart:
              return this.stateNumericStart(e, t);
            case Z.NumericDecimal:
              return this.stateNumericDecimal(e, t);
            case Z.NumericHex:
              return this.stateNumericHex(e, t);
            case Z.NamedEntity:
              return this.stateNamedEntity(e, t);
          }
        }
        stateNumericStart(e, t) {
          return t >= e.length
            ? -1
            : (e.charCodeAt(t) | Ln) === X.LOWER_X
              ? ((this.state = Z.NumericHex), (this.consumed += 1), this.stateNumericHex(e, t + 1))
              : ((this.state = Z.NumericDecimal), this.stateNumericDecimal(e, t));
        }
        stateNumericHex(e, t) {
          for (; t < e.length;) {
            let n = e.charCodeAt(t);
            if (An(n) || jn(n)) {
              let e = n <= X.NINE ? n - X.ZERO : (n | Ln) - X.LOWER_A + 10;
              ((this.result = this.result * 16 + e), this.consumed++, t++);
            } else return this.emitNumericEntity(n, 3);
          }
          return -1;
        }
        stateNumericDecimal(e, t) {
          for (; t < e.length;) {
            let n = e.charCodeAt(t);
            if (An(n)) ((this.result = this.result * 10 + (n - X.ZERO)), this.consumed++, t++);
            else return this.emitNumericEntity(n, 2);
          }
          return -1;
        }
        emitNumericEntity(e, t) {
          if (this.consumed <= t)
            return (this.errors?.absenceOfDigitsInNumericCharacterReference(this.consumed), 0);
          if (e === X.SEMI) this.consumed += 1;
          else if (this.decodeMode === Rn.Strict) return 0;
          return (
            this.emitCodePoint(Cn(this.result), this.consumed),
            this.errors &&
              (e !== X.SEMI && this.errors.missingSemicolonAfterCharacterReference(),
              this.errors.validateNumericCharacterReference(this.result)),
            this.consumed
          );
        }
        stateNamedEntity(e, t) {
          let { decodeTree: n } = this,
            r = n[this.treeIndex],
            i = (r & Y.VALUE_LENGTH) >> 14;
          for (; t < e.length;) {
            if (i === 0 && (r & Y.FLAG13) !== 0) {
              let a = (r & Y.BRANCH_LENGTH) >> 7;
              if (this.runConsumed === 0) {
                let n = r & Y.JUMP_TABLE;
                if (e.charCodeAt(t) !== n)
                  return this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity();
                (t++, this.excess++, this.runConsumed++);
              }
              for (; this.runConsumed < a;) {
                if (t >= e.length) return -1;
                let r = this.runConsumed - 1,
                  i = n[this.treeIndex + 1 + (r >> 1)],
                  a = r % 2 == 0 ? i & 255 : (i >> 8) & 255;
                if (e.charCodeAt(t) !== a)
                  return (
                    (this.runConsumed = 0),
                    this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity()
                  );
                (t++, this.excess++, this.runConsumed++);
              }
              ((this.runConsumed = 0),
                (this.treeIndex += 1 + (a >> 1)),
                (r = n[this.treeIndex]),
                (i = (r & Y.VALUE_LENGTH) >> 14));
            }
            if (t >= e.length) break;
            let a = e.charCodeAt(t);
            if (a === X.SEMI && i !== 0 && (r & Y.FLAG13) !== 0)
              return this.emitNamedEntityData(this.treeIndex, i, this.consumed + this.excess);
            if (
              ((this.treeIndex = Fn(n, r, this.treeIndex + Math.max(1, i), a)), this.treeIndex < 0)
            )
              return this.result === 0 || (this.decodeMode === Rn.Attribute && (i === 0 || Nn(a)))
                ? 0
                : this.emitNotTerminatedNamedEntity();
            if (((r = n[this.treeIndex]), (i = (r & Y.VALUE_LENGTH) >> 14), i !== 0)) {
              if (a === X.SEMI)
                return this.emitNamedEntityData(this.treeIndex, i, this.consumed + this.excess);
              this.decodeMode !== Rn.Strict &&
                (r & Y.FLAG13) === 0 &&
                ((this.result = this.treeIndex), (this.consumed += this.excess), (this.excess = 0));
            }
            (t++, this.excess++);
          }
          return -1;
        }
        emitNotTerminatedNamedEntity() {
          let { result: e, decodeTree: t } = this,
            n = (t[e] & Y.VALUE_LENGTH) >> 14;
          return (
            this.emitNamedEntityData(e, n, this.consumed),
            this.errors?.missingSemicolonAfterCharacterReference(),
            this.consumed
          );
        }
        emitNamedEntityData(e, t, n) {
          let { decodeTree: r } = this;
          return (
            this.emitCodePoint(t === 1 ? r[e] & ~(Y.VALUE_LENGTH | Y.FLAG13) : r[e + 1], n),
            t === 3 && this.emitCodePoint(r[e + 2], n),
            n
          );
        }
        end() {
          switch (this.state) {
            case Z.NamedEntity:
              return this.result !== 0 &&
                (this.decodeMode !== Rn.Attribute || this.result === this.treeIndex)
                ? this.emitNotTerminatedNamedEntity()
                : 0;
            case Z.NumericDecimal:
              return this.emitNumericEntity(0, 2);
            case Z.NumericHex:
              return this.emitNumericEntity(0, 3);
            case Z.NumericStart:
              return (this.errors?.absenceOfDigitsInNumericCharacterReference(this.consumed), 0);
            case Z.EntityStart:
              return 0;
          }
        }
      }),
      (Bn = Pn(Dn)));
  }))();
}
function Hn() {
  let e = qn.split(`|`);
  return (
    Kn.split(`|`).forEach((t) => {
      let n = t.indexOf(`:`),
        r = t.slice(0, n);
      for (let i of t.slice(n + 1)) e.push(r + i);
    }),
    e
  );
}
var Un, Wn, Gn, Kn, qn, Jn, Yn, Xn;
function Zn() {
  return (Zn = t(() => {
    (Sn(),
      (Un = class {
        src_Any = _n.source;
        src_Cc = vn.source;
        src_Z = xn.source;
        src_P = yn.source;
        src_ZPCc = [this.src_Z, this.src_P, this.src_Cc].join(`|`);
        src_ZCc = [this.src_Z, this.src_Cc].join(`|`);
        cache = {};
        opts = { maxLength: 1e4, urlAuth: !1, schema_names: [] };
        constructor(e = {}) {
          this.opts = { ...this.opts, ...e };
        }
        set(e = {}) {
          return ((this.opts = { ...this.opts, ...e }), (this.cache = {}), this);
        }
        escapeRE(e) {
          return e.replace(/[.?*+^$[\]\\(){}|-]/g, `\\$&`);
        }
        nestedPairRE(e, t, n = 4) {
          let r = this.escapeRE(e),
            i = this.escapeRE(t),
            a = `(?:(?!${this.src_ZCc}|${r}|${i}).)`,
            o = `${r}${a}{0,1000}${i}`;
          for (let e = 2; e <= n; e++) o = `${r}(?:${a}|${o}){0,1000}${i}`;
          return o;
        }
        get_text_separators() {
          return (this.cache.text_separators ??= /[><\uff5c]/);
        }
        get_pseudo_letter() {
          return (this.cache.src_pseudo_letter ??= RegExp(
            `(?:(?!${this.get_text_separators().source}|${this.src_ZPCc})${this.src_Any})`,
          ));
        }
        get_ipv4_addr() {
          return (this.cache.src_ip4 ??= RegExp(
            `(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])[.]){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])`,
          ));
        }
        get_ipv6_addr() {
          let e = `[0-9A-Fa-f]{1,4}`,
            t = `(?:(?:${e}:${e})|${this.get_ipv4_addr().source})`;
          return (this.cache.src_ip6_addr ??= RegExp(
            `(?:(?:${e}:){6}${t}|::(?:${e}:){5}${t}|(?:${e})?::(?:${e}:){4}${t}|(?:(?:${e}:){0,1}${e})?::(?:${e}:){3}${t}|(?:(?:${e}:){0,2}${e})?::(?:${e}:){2}${t}|(?:(?:${e}:){0,3}${e})?::${e}:${t}|(?:(?:${e}:){0,4}${e})?::${t}|(?:(?:${e}:){0,5}${e})?::${e}|(?:(?:${e}:){0,6}${e})?::)`,
          ));
        }
        get_ipv6_url_host() {
          return (this.cache.src_ip6_host ??= RegExp(`\\[${this.get_ipv6_addr().source}\\]`));
        }
        get_ipv6_mail_host() {
          return (this.cache.src_ipv6_mail_host ??= RegExp(
            `\\[IPv6:${this.get_ipv6_addr().source}\\]`,
          ));
        }
        get_auth() {
          return (this.cache.src_auth ??= RegExp(
            `(?:(?:(?!${this.src_ZCc}|[@/\\[\\]()]).){1,50}@)?`,
          ));
        }
        get_port() {
          return (this.cache.src_port ??= RegExp(
            `(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?`,
          ));
        }
        get_host_terminator() {
          return (this.cache.src_host_terminator ??= RegExp(
            `(?=$|${this.get_text_separators().source}|${this.src_ZPCc})(?!${this.opts[`---`] ? `-(?!--)|` : `-|`}_|:\\d|\\.-|\\.(?!$|${this.src_ZPCc}))`,
          ));
        }
        get_path_terminator() {
          return (this.cache.src_path_terminator ??= RegExp(
            `${this.src_ZPCc}|${this.get_text_separators().source}`,
          ));
        }
        get_path() {
          return (this.cache.src_path ??= RegExp(
            `(?:[/?#](?:${this.nestedPairRE(`[`, `]`)}|${this.nestedPairRE(`(`, `)`)}|${this.nestedPairRE(`{`, `}`)}|\\"(?:(?!${this.src_ZCc}|["]).){1,100}\\"|\\'(?:(?!${this.src_ZCc}|[']).){1,100}\\'|\\'(?=${this.get_pseudo_letter().source}|[-])|\\.{2,20}[:]?[a-zA-Z0-9%/&]|\\.(?!${this.src_ZCc}|[.]|$)|` +
              (this.opts[`---`] ? `\\-(?!--(?:[^-]|$))(?:-{0,19})|` : `\\-{1,20}|`) +
              `,(?!${this.src_ZCc}|$)|;(?!${this.src_ZCc}|$)|\\!{1,20}(?!${this.src_ZCc}|[!]|$)|\\?(?!${this.src_ZCc}|[?]|$)|` +
              this.get_path_extra().source +
              `[\\\\/:%@#&=_~*]|(?!${this.get_path_terminator().source}).){1,${this.opts.maxLength}}|\\/)?`,
          ));
        }
        get_mail_name() {
          return (this.cache.src_mail_name ??= RegExp(
            "[-!#$%&'*+/=?^_`{|}~a-zA-Z0-9](?:[-!#$%&'*+/=?^_`{|}~a-zA-Z0-9]|[.](?=[-!#$%&'*+/=?^_`{|}~a-zA-Z0-9])){0,63}",
          ));
        }
        get_xn() {
          return (this.cache.src_xn ??= RegExp(`xn--[a-z0-9\\-]{1,59}`));
        }
        get_tld() {
          if (this.cache.tld) return this.cache.tld;
          let e = [...new Set(this.opts.tlds || [])].sort().reverse().join(`|`);
          return (
            (this.cache.tld = RegExp(`${e || `$#none#$`}|${this.get_xn().source}`)), this.cache.tld
          );
        }
        get_domain_root() {
          return (this.cache.src_domain_root ??= RegExp(
            `(?:` + this.get_xn().source + `|${this.get_pseudo_letter().source}{1,63})`,
          ));
        }
        get_domain() {
          return (this.cache.src_domain ??= RegExp(
            `(?:` +
              this.get_xn().source +
              `|(?:${this.get_pseudo_letter().source})|(?:${this.get_pseudo_letter().source}(?:-|${this.get_pseudo_letter().source}){0,61}${this.get_pseudo_letter().source}))`,
          ));
        }
        get_url_host_port() {
          return (this.cache.url_host_port ??= RegExp(
            `(?:` +
              this.get_ipv6_url_host().source +
              `|(?:(?:(?:${this.get_domain().source})\\.){0,10}${this.get_domain().source}))` +
              this.get_port().source +
              this.get_host_terminator().source,
          ));
        }
        get_fuzzy_url_host_port() {
          return (this.cache.fuzzy_url_host_port ??= RegExp(
            `(?:` +
              (this.opts.fuzzyIP ? this.get_ipv4_addr().source + `|` : ``) +
              `(?:(?:(?:${this.get_domain().source})\\.){1,10}(?:${this.get_tld().source})))` +
              this.get_host_terminator().source,
          ));
        }
        get_mail_host() {
          return (this.cache.src_mail_host ??= RegExp(
            `(?:` +
              this.get_ipv6_mail_host().source +
              `|(?:(?:(?:${this.get_domain().source})\\.){0,4}${this.get_domain().source}))` +
              this.get_host_terminator().source,
          ));
        }
        get_fuzzy_mail_host() {
          return (this.cache.src_fuzzy_mail_host ??= RegExp(
            `(?:` +
              this.get_ipv6_mail_host().source +
              `|(?:(?:(?:${this.get_domain().source})[.]){1,4}${this.get_domain_root().source}))` +
              this.get_host_terminator().source,
          ));
        }
        get_path_extra() {
          return (this.cache.src_path_extra ??= RegExp(``));
        }
        get_fuzzy_mail_host_search() {
          return (this.cache.mail_fuzzy_host_search ??= RegExp(
            `@${this.get_fuzzy_mail_host().source}`,
            `ig`,
          ));
        }
        get_fuzzy_link_search() {
          return (this.cache.link_fuzzy_search ??= RegExp(
            `(^|(?![.:/\\-_@])(?:[$+<=>^\`|\uff5c]|${this.src_ZPCc}))(?:(?![$+<=>^\`|\uff5c])${this.get_fuzzy_url_host_port().source}${this.get_path().source})`,
            `ig`,
          ));
        }
        get_http_validator() {
          return (this.cache.http_validator ??= RegExp(
            `\\/\\/` +
              (this.opts.urlAuth ? this.get_auth().source : ``) +
              this.get_url_host_port().source +
              this.get_path().source,
            `iy`,
          ));
        }
        get_relative_proto_validator() {
          return (this.cache.relative_proto_validator ??= RegExp(
            (this.opts.urlAuth ? this.get_auth().source : ``) +
              `(?:localhost|${this.get_ipv6_url_host().source}|(?:(?:${this.get_domain().source})[.]){1,10}${this.get_domain_root().source})` +
              this.get_port().source +
              this.get_host_terminator().source +
              this.get_path().source,
            `iy`,
          ));
        }
        get_mail_name_validator() {
          return (this.cache.mail_name_validator ??= RegExp(
            `(?:^|${this.get_text_separators().source}|"|\\(|${this.src_ZCc})(${this.get_mail_name().source})$`,
          ));
        }
        get_mailto_validator() {
          return (this.cache.mailto_validator ??= RegExp(
            `${this.get_mail_name().source}@${this.get_mail_host().source}`,
            `iy`,
          ));
        }
        get_schema_names() {
          return (this.cache.schema_names ??= new RegExp(
            (this.opts.schema_names || []).map((e) => this.escapeRE(e)).join(`|`),
          ));
        }
        get_schema_search() {
          return (this.cache.schema_search ??= RegExp(
            `(^|(?!_)(?:[><\uff5c]|${this.src_ZPCc}))(${this.get_schema_names().source})`,
            `ig`,
          ));
        }
        get_schema_at_start() {
          return (this.cache.schema_at_start ??= RegExp(
            `^${this.get_schema_search().source}`,
            `i`,
          ));
        }
      }),
      (Wn = {
        validate: (e, t, n) => {
          let r = n.re.get_http_validator();
          r.lastIndex = t;
          let i = r.exec(e);
          return i ? i[0].length : 0;
        },
        normalize: (e, t) => t.normalize(e),
      }),
      (Gn = {
        "http:": Wn,
        "https:": Wn,
        "ftp:": Wn,
        "//": {
          validate: function (e, t, n) {
            let r = n.re.get_relative_proto_validator();
            r.lastIndex = t;
            let i = r.exec(e);
            return i
              ? (t >= 3 && e[t - 3] === `:`) || (t >= 3 && e[t - 3] === `/`)
                ? 0
                : i[0].length
              : 0;
          },
          normalize: (e, t) => t.normalize(e),
        },
        "mailto:": {
          validate: function (e, t, n) {
            let r = n.re.get_mailto_validator();
            r.lastIndex = t;
            let i = r.exec(e);
            return i ? i[0].length : 0;
          },
          normalize: (e, t) => t.normalize(e),
        },
      }),
      (Kn = `a:cdefgilmnoqrstuwxz|b:abdefghijmnorstvwyz|c:acdfghiklmnoruvwxyz|d:ejkmoz|e:cegrstu|f:ijkmor|g:abdefghilmnpqrstuwy|h:kmnrtu|i:delmnoqrst|j:emop|k:eghimnprwyz|l:abcikrstuvy|m:acdeghklmnopqrstuvwxyz|n:acefgilopruz|o:m|p:aefghklmnrstwy|q:a|r:eosuw|s:abcdeghijklmnortuvxyz|t:cdfghjklmnortvwz|u:agksyz|v:aceginu|w:fs|y:et|z:amw`),
      (qn = `biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф`),
      (Jn = {
        fuzzyLink: !1,
        fuzzyEmail: !0,
        fuzzyIP: !1,
        "---": !1,
        tlds: Hn(),
        urlAuth: !1,
        maxLength: 1e4,
      }),
      (Yn = class {
        schema;
        index;
        lastIndex;
        raw;
        text;
        url;
        constructor(e, t, n, r) {
          let i = e.slice(n, r);
          ((this.schema = t.toLowerCase()),
            (this.index = n),
            (this.lastIndex = r),
            (this.raw = i),
            (this.text = i),
            (this.url = i));
        }
      }),
      (Xn = class {
        __opts__;
        __schemas__;
        re;
        constructor(e = {}) {
          let { rebuilder: t, ...n } = e;
          ((this.__opts__ = { ...Jn, ...n }),
            (this.__schemas__ = { ...Gn }),
            (this.re = t || new Un()),
            this.re.set({ ...this.__opts__, schema_names: Object.keys(this.__schemas__) }));
        }
        add(e, t = null) {
          if (!t) delete this.__schemas__[e];
          else {
            let n = { normalize: (e, t) => t.normalize(e), ...t };
            this.__schemas__[e] = n;
          }
          return (
            this.re.set({ ...this.__opts__, schema_names: Object.keys(this.__schemas__) }), this
          );
        }
        set(e = {}) {
          return (
            (this.__opts__ = { ...this.__opts__, ...e }),
            this.re.set({ ...this.__opts__, schema_names: Object.keys(this.__schemas__) }),
            this
          );
        }
        test(e) {
          if (!e.length) return !1;
          let t, n;
          for (n = this.re.get_schema_search(), n.lastIndex = 0; (t = n.exec(e)) !== null;)
            if (this.testSchemaAt(e, t[2], n.lastIndex)) return !0;
          if (
            this.__opts__.fuzzyLink &&
            this.__schemas__[`http:`] &&
            ((n = this.re.get_fuzzy_link_search()), (n.lastIndex = 0), n.exec(e) !== null)
          )
            return !0;
          if (this.__opts__.fuzzyEmail && this.__schemas__[`mailto:`] && e.indexOf(`@`) >= 0) {
            let n = this.re.get_fuzzy_mail_host_search(),
              r = this.re.get_mail_name_validator();
            for (n.lastIndex = 0; (t = n.exec(e)) !== null;) {
              let n = e.slice(Math.max(0, t.index - 65), t.index);
              if (r.test(n)) return !0;
            }
          }
          return !1;
        }
        testSchemaAt(e, t, n) {
          return this.__schemas__[t.toLowerCase()]
            ? this.__schemas__[t.toLowerCase()].validate(
                e.slice(0, n + this.__opts__.maxLength),
                n,
                this,
              )
            : 0;
        }
        match(e) {
          let t = [],
            n = this.re.get_schema_search(),
            r,
            i,
            a,
            o,
            s,
            c,
            l = !1,
            u = !1,
            d = !1,
            f = 0;
          if (!e.length) return null;
          for (
            n.lastIndex = 0,
              this.__opts__.fuzzyLink &&
                this.__schemas__[`http:`] &&
                ((r = this.re.get_fuzzy_link_search()), (r.lastIndex = 0)),
              this.__opts__.fuzzyEmail &&
                this.__schemas__[`mailto:`] &&
                ((i = this.re.get_fuzzy_mail_host_search()),
                (i.lastIndex = 0),
                (a = this.re.get_mail_name_validator()));
            ;
          ) {
            let p = Math.max(f - 1, 0);
            if (i && a && !d && (!s || s.index < f))
              for (i.lastIndex < p && (i.lastIndex = p); ;) {
                let t = i.exec(e);
                if (!t) {
                  ((d = !0), (s = void 0));
                  break;
                }
                let n = a.exec(e.slice(Math.max(0, t.index - 65), t.index));
                if (n) {
                  if (
                    ((s = {
                      schema: `mailto:`,
                      index: t.index - n[1].length,
                      lastIndex: t.index + t[0].length,
                    }),
                    s.index >= f)
                  )
                    break;
                  i.lastIndex < p && (i.lastIndex = p);
                }
              }
            if (r && !u && (!o || o.index < f))
              for (r.lastIndex < p && (r.lastIndex = p); ;) {
                let t = r.exec(e);
                if (!t) {
                  ((u = !0), (o = void 0));
                  break;
                }
                if (
                  ((o = {
                    schema: ``,
                    index: t.index + t[1].length,
                    lastIndex: t.index + t[0].length,
                  }),
                  o.index >= f)
                )
                  break;
                r.lastIndex < p && (r.lastIndex = p);
              }
            let m = s;
            (!m ||
              (o && (o.index < m.index || (o.index === m.index && o.lastIndex > m.lastIndex)))) &&
              (m = o);
            let h;
            if (!l)
              for (;;) {
                if (!c) {
                  n.lastIndex < p && (n.lastIndex = p);
                  let t = n.exec(e);
                  if (!t) {
                    l = !0;
                    break;
                  }
                  c = {
                    schema: t[2],
                    index: t.index + t[1].length,
                    lastIndex: t.index + t[0].length,
                  };
                }
                if (c.index < f) {
                  c = void 0;
                  continue;
                }
                if (m && c.index > m.index) break;
                let t = c;
                c = void 0;
                let r = this.testSchemaAt(e, t.schema, t.lastIndex);
                if (r) {
                  h = { schema: t.schema, index: t.index, lastIndex: t.lastIndex + r };
                  break;
                }
              }
            let g = h;
            if (
              ((!g ||
                (s && (s.index < g.index || (s.index === g.index && s.lastIndex > g.lastIndex)))) &&
                (g = s),
              (!g ||
                (o && (o.index < g.index || (o.index === g.index && o.lastIndex > g.lastIndex)))) &&
                (g = o),
              !g)
            )
              break;
            g === s ? (s = void 0) : g === o && (o = void 0);
            let _ = new Yn(e, g.schema, g.index, g.lastIndex);
            (_.schema ? this.__schemas__[_.schema].normalize(_, this) : this.normalize(_),
              t.push(_),
              (f = g.lastIndex));
          }
          return t.length ? t : null;
        }
        matchAtStart(e) {
          if (!e.length) return null;
          let t = this.re.get_schema_at_start().exec(e);
          if (!t) return null;
          let n = this.testSchemaAt(e, t[2], t[0].length);
          if (!n) return null;
          let r = new Yn(e, t[2], t.index + t[1].length, t.index + t[0].length + n);
          return (this.__schemas__[r.schema].normalize(r, this), r);
        }
        tlds(e, t = !1) {
          return (
            (e = Array.isArray(e) ? e : [e]),
            t ? (this.__opts__.tlds = this.__opts__.tlds.concat(e)) : (this.__opts__.tlds = e),
            this.re.set({ ...this.__opts__, schema_names: Object.keys(this.__schemas__) }),
            this
          );
        }
        normalize(e) {
          (e.schema || (e.url = `http://${e.url}`),
            e.schema === `mailto:` && !/^mailto:/i.test(e.url) && (e.url = `mailto:${e.url}`));
        }
      }));
  }))();
}
function Qn(e) {
  throw RangeError(mr[e]);
}
function $n(e, t) {
  let n = [],
    r = e.length;
  for (; r--;) n[r] = t(e[r]);
  return n;
}
function er(e, t) {
  let n = e.split(`@`),
    r = ``;
  (n.length > 1 && ((r = n[0] + `@`), (e = n[1])), (e = e.replace(pr, `.`)));
  let i = $n(e.split(`.`), t).join(`.`);
  return r + i;
}
function tr(e) {
  let t = [],
    n = 0,
    r = e.length;
  for (; n < r;) {
    let i = e.charCodeAt(n++);
    if (i >= 55296 && i <= 56319 && n < r) {
      let r = e.charCodeAt(n++);
      (r & 64512) == 56320 ? t.push(((i & 1023) << 10) + (r & 1023) + 65536) : (t.push(i), n--);
    } else t.push(i);
  }
  return t;
}
var nr,
  rr,
  ir,
  ar,
  or,
  sr,
  cr,
  lr,
  ur,
  dr,
  fr,
  pr,
  mr,
  hr,
  gr,
  _r,
  vr,
  yr,
  br,
  xr,
  Sr,
  Cr,
  wr,
  Tr,
  Er;
function Dr() {
  return (Dr = t(() => {
    ((nr = 2147483647),
      (rr = 36),
      (ir = 1),
      (ar = 26),
      (or = 38),
      (sr = 700),
      (cr = 72),
      (lr = 128),
      (ur = `-`),
      (dr = /^xn--/),
      (fr = /[^\0-\x7F]/),
      (pr = /[\x2E\u3002\uFF0E\uFF61]/g),
      (mr = {
        overflow: `Overflow: input needs wider integers to process`,
        "not-basic": `Illegal input >= 0x80 (not a basic code point)`,
        "invalid-input": `Invalid input`,
      }),
      (hr = 35),
      (gr = Math.floor),
      (_r = String.fromCharCode),
      (vr = (e) => String.fromCodePoint(...e)),
      (yr = function (e) {
        return e >= 48 && e < 58
          ? 26 + (e - 48)
          : e >= 65 && e < 91
            ? e - 65
            : e >= 97 && e < 123
              ? e - 97
              : rr;
      }),
      (br = function (e, t) {
        return e + 22 + 75 * (e < 26) - ((t != 0) << 5);
      }),
      (xr = function (e, t, n) {
        let r = 0;
        for (e = n ? gr(e / sr) : e >> 1, e += gr(e / t); e > 455; r += rr) e = gr(e / hr);
        return gr(r + (36 * e) / (e + or));
      }),
      (Sr = function (e) {
        let t = [],
          n = e.length,
          r = 0,
          i = lr,
          a = cr,
          o = e.lastIndexOf(ur);
        o < 0 && (o = 0);
        for (let n = 0; n < o; ++n)
          (e.charCodeAt(n) >= 128 && Qn(`not-basic`), t.push(e.charCodeAt(n)));
        for (let s = o > 0 ? o + 1 : 0; s < n;) {
          let o = r;
          for (let t = 1, i = rr; ; i += rr) {
            s >= n && Qn(`invalid-input`);
            let o = yr(e.charCodeAt(s++));
            (o >= rr && Qn(`invalid-input`), o > gr((nr - r) / t) && Qn(`overflow`), (r += o * t));
            let c = i <= a ? ir : i >= a + ar ? ar : i - a;
            if (o < c) break;
            let l = rr - c;
            (t > gr(nr / l) && Qn(`overflow`), (t *= l));
          }
          let c = t.length + 1;
          ((a = xr(r - o, c, o == 0)),
            gr(r / c) > nr - i && Qn(`overflow`),
            (i += gr(r / c)),
            (r %= c),
            t.splice(r++, 0, i));
        }
        return String.fromCodePoint(...t);
      }),
      (Cr = function (e) {
        let t = [];
        e = tr(e);
        let n = e.length,
          r = lr,
          i = 0,
          a = cr;
        for (let n of e) n < 128 && t.push(_r(n));
        let o = t.length,
          s = o;
        for (o && t.push(ur); s < n;) {
          let n = nr;
          for (let t of e) t >= r && t < n && (n = t);
          let c = s + 1;
          (n - r > gr((nr - i) / c) && Qn(`overflow`), (i += (n - r) * c), (r = n));
          for (let n of e)
            if ((n < r && ++i > nr && Qn(`overflow`), n === r)) {
              let e = i;
              for (let n = rr; ; n += rr) {
                let r = n <= a ? ir : n >= a + ar ? ar : n - a;
                if (e < r) break;
                let i = e - r,
                  o = rr - r;
                (t.push(_r(br(r + (i % o), 0))), (e = gr(i / o)));
              }
              (t.push(_r(br(e, 0))), (a = xr(i, c, s === o)), (i = 0), ++s);
            }
          (++i, ++r);
        }
        return t.join(``);
      }),
      (wr = function (e) {
        return er(e, function (e) {
          return dr.test(e) ? Sr(e.slice(4).toLowerCase()) : e;
        });
      }),
      (Tr = function (e) {
        return er(e, function (e) {
          return fr.test(e) ? `xn--` + Cr(e) : e;
        });
      }),
      (Er = {
        version: `2.3.1`,
        ucs2: { decode: tr, encode: vr },
        decode: Sr,
        encode: Cr,
        toASCII: Tr,
        toUnicode: wr,
      }));
  }))();
}
function Or(e) {
  let t = function (...n) {
    return Reflect.construct(e, n, new.target && new.target !== t ? new.target : e);
  };
  return (
    Object.defineProperty(t, "name", { value: e.name }),
    Object.setPrototypeOf(t, e),
    (t.prototype = e.prototype),
    t
  );
}
function kr(e, t, n) {
  return [].concat(e.slice(0, t), n, e.slice(t + 1));
}
function Ar(e) {
  return !(
    (e >= 55296 && e <= 57343) ||
    (e >= 64976 && e <= 65007) ||
    (e & 65535) == 65535 ||
    (e & 65535) == 65534 ||
    (e >= 0 && e <= 8) ||
    e === 11 ||
    (e >= 14 && e <= 31) ||
    (e >= 127 && e <= 159) ||
    e > 1114111
  );
}
function jr(e) {
  if (e > 65535) {
    e -= 65536;
    let t = 55296 + (e >> 10),
      n = 56320 + (e & 1023);
    return String.fromCharCode(t, n);
  }
  return String.fromCharCode(e);
}
function Mr(e, t) {
  if (t.charCodeAt(0) === 35 && ia.test(t)) {
    let n = t[1].toLowerCase() === `x` ? parseInt(t.slice(2), 16) : parseInt(t.slice(1), 10);
    return Ar(n) ? jr(n) : e;
  }
  let n = In(e);
  return n === e ? e : n;
}
function Nr(e) {
  return e.indexOf(`\\`) < 0 ? e : e.replace(na, `$1`);
}
function Pr(e) {
  return e.indexOf(`\\`) < 0 && e.indexOf(`&`) < 0
    ? e
    : e.replace(ra, function (e, t, n) {
        return t || Mr(e, n);
      });
}
function Fr(e) {
  return sa[e];
}
function Ir(e) {
  return aa.test(e) ? e.replace(oa, Fr) : e;
}
function Lr(e) {
  return e.replace(ca, `\\$&`);
}
function Q(e) {
  switch (e) {
    case 9:
    case 32:
      return !0;
  }
  return !1;
}
function Rr(e) {
  if (e >= 8192 && e <= 8202) return !0;
  switch (e) {
    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 32:
    case 160:
    case 5760:
    case 8239:
    case 8287:
    case 12288:
      return !0;
  }
  return !1;
}
function zr(e) {
  return yn.test(e) || bn.test(e);
}
function Br(e) {
  return zr(jr(e));
}
function Vr(e) {
  switch (e) {
    case 33:
    case 34:
    case 35:
    case 36:
    case 37:
    case 38:
    case 39:
    case 40:
    case 41:
    case 42:
    case 43:
    case 44:
    case 45:
    case 46:
    case 47:
    case 58:
    case 59:
    case 60:
    case 61:
    case 62:
    case 63:
    case 64:
    case 91:
    case 92:
    case 93:
    case 94:
    case 95:
    case 96:
    case 123:
    case 124:
    case 125:
    case 126:
      return !0;
    default:
      return !1;
  }
}
function Hr(e) {
  return ((e = e.trim().replace(/\s+/g, ` `)), e.toLowerCase().toUpperCase());
}
function Ur(e) {
  return e === 32 || e === 9 || e === 10 || e === 13;
}
function Wr(e) {
  let t = 0;
  for (; t < e.length && Ur(e.charCodeAt(t)); t++);
  let n = e.length - 1;
  for (; n >= t && Ur(e.charCodeAt(n)); n--);
  return e.slice(t, n + 1);
}
function Gr(e, t, n) {
  let r,
    i,
    a,
    o,
    s = e.posMax,
    c = e.pos;
  for (e.pos = t + 1, r = 1; e.pos < s;) {
    if (((a = e.src.charCodeAt(e.pos)), a === 93 && (r--, r === 0))) {
      i = !0;
      break;
    }
    if (((o = e.pos), e.md.inline.skipToken(e), a === 91)) {
      if (o === e.pos - 1) r++;
      else if (n) return ((e.pos = c), -1);
    }
  }
  let l = -1;
  return (i && (l = e.pos), (e.pos = c), l);
}
function Kr(e, t, n) {
  let r,
    i = t,
    a = { ok: !1, pos: 0, str: `` };
  if (e.charCodeAt(i) === 60) {
    for (i++; i < n;) {
      if (((r = e.charCodeAt(i)), r === 10 || r === 60)) return a;
      if (r === 62) return ((a.pos = i + 1), (a.str = Pr(e.slice(t + 1, i))), (a.ok = !0), a);
      if (r === 92 && i + 1 < n) {
        i += 2;
        continue;
      }
      i++;
    }
    return a;
  }
  let o = 0;
  for (; i < n && ((r = e.charCodeAt(i)), !(r === 32 || r < 32 || r === 127));) {
    if (r === 92 && i + 1 < n) {
      if (e.charCodeAt(i + 1) === 32) {
        i++;
        continue;
      }
      i += 2;
      continue;
    }
    if (r === 40 && (o++, o > 32)) return a;
    if (r === 41) {
      if (o === 0) break;
      o--;
    }
    i++;
  }
  return t === i || o !== 0 ? a : ((a.str = Pr(e.slice(t, i))), (a.pos = i), (a.ok = !0), a);
}
function qr(e, t, n, r) {
  let i,
    a = t,
    o = { ok: !1, can_continue: !1, pos: 0, str: ``, marker: 0 };
  if (r) ((o.str = r.str), (o.marker = r.marker));
  else {
    if (a >= n) return o;
    let r = e.charCodeAt(a);
    if (r !== 34 && r !== 39 && r !== 40) return o;
    (t++, a++, r === 40 && (r = 41), (o.marker = r));
  }
  for (; a < n;) {
    if (((i = e.charCodeAt(a)), i === o.marker))
      return ((o.pos = a + 1), (o.str += Pr(e.slice(t, a))), (o.ok = !0), o);
    if (i === 40 && o.marker === 41) return o;
    (i === 92 && a + 1 < n && a++, a++);
  }
  return ((o.can_continue = !0), (o.str += Pr(e.slice(t, a))), o);
}
function Jr(e) {
  "@babel/helpers - typeof";
  return (
    (Jr =
      typeof Symbol == `function` && typeof Symbol.iterator == `symbol`
        ? function (e) {
            return typeof e;
          }
        : function (e) {
            return e &&
              typeof Symbol == `function` &&
              e.constructor === Symbol &&
              e !== Symbol.prototype
              ? `symbol`
              : typeof e;
          }),
    Jr(e)
  );
}
function Yr(e, t) {
  if (Jr(e) != `object` || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || `default`);
    if (Jr(r) != `object`) return r;
    throw TypeError(`@@toPrimitive must return a primitive value.`);
  }
  return (t === `string` ? String : Number)(e);
}
function Xr(e) {
  var t = Yr(e, `string`);
  return Jr(t) == `symbol` ? t : t + ``;
}
function $(e, t, n) {
  return (
    (t = Xr(t)) in e
      ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 })
      : (e[t] = n),
    e
  );
}
function Zr(e) {
  let t;
  ((t = e.src.replace(
    ga,
    `
`,
  )),
    (t = t.replace(_a, `�`)),
    (e.src = t));
}
function Qr(e) {
  let t;
  e.inlineMode
    ? ((t = new e.Token(`inline`, ``, 0)),
      (t.content = e.src),
      (t.map = [0, 1]),
      (t.children = []),
      e.tokens.push(t))
    : e.md.block.parse(e.src, e.md, e.env, e.tokens);
}
function $r(e) {
  let t = e.tokens,
    n = 0;
  for (let e = 0; e < t.length; e++)
    t[e].type !== `reference_definition` && (e !== n && (t[n] = t[e]), n++);
  t.length !== n && (t.length = n);
}
function ei(e) {
  let t = e.tokens;
  for (let n = 0, r = t.length; n < r; n++) {
    let r = t[n];
    r.type === `inline` && e.md.inline.parse(r.content, e.md, e.env, r.children);
  }
}
function ti(e) {
  return /^<a[>\s]/i.test(e);
}
function ni(e) {
  return /^<\/a\s*>/i.test(e);
}
function ri(e) {
  let t = e.tokens;
  if (e.md.options.linkify)
    for (let n = 0, r = t.length; n < r; n++) {
      if (t[n].type !== `inline` || !e.md.linkify.test(t[n].content)) continue;
      let r = t[n].children,
        i = 0;
      for (let a = r.length - 1; a >= 0; a--) {
        let o = r[a];
        if (o.type === `link_close`) {
          for (a--; r[a].level !== o.level && r[a].type !== `link_open`;) a--;
          continue;
        }
        if (
          (o.type === `html_inline` && (ti(o.content) && i > 0 && i--, ni(o.content) && i++),
          !(i > 0) && o.type === `text` && e.md.linkify.test(o.content))
        ) {
          let i = o.content,
            s = e.md.linkify.match(i),
            c = [],
            l = o.level,
            u = 0;
          s.length > 0 &&
            s[0].index === 0 &&
            a > 0 &&
            r[a - 1].type === `text_special` &&
            (s = s.slice(1));
          for (let t = 0; t < s.length; t++) {
            let n = s[t].url,
              r = e.md.normalizeLink(n);
            if (!e.md.validateLink(r)) continue;
            let a = s[t].text;
            a = s[t].schema
              ? s[t].schema === `mailto:` && !/^mailto:/i.test(a)
                ? e.md.normalizeLinkText(`mailto:${a}`).replace(/^mailto:/, ``)
                : e.md.normalizeLinkText(a)
              : e.md.normalizeLinkText(`http://${a}`).replace(/^http:\/\//, ``);
            let o = s[t].index;
            if (o > u) {
              let t = new e.Token(`text`, ``, 0);
              ((t.content = i.slice(u, o)), (t.level = l), c.push(t));
            }
            let d = new e.Token(`link_open`, `a`, 1);
            ((d.attrs = [[`href`, r]]),
              (d.level = l++),
              (d.markup = `linkify`),
              (d.info = `auto`),
              c.push(d));
            let f = new e.Token(`text`, ``, 0);
            ((f.content = a), (f.level = l), c.push(f));
            let p = new e.Token(`link_close`, `a`, -1);
            ((p.level = --l),
              (p.markup = `linkify`),
              (p.info = `auto`),
              c.push(p),
              (u = s[t].lastIndex));
          }
          if (u < i.length) {
            let t = new e.Token(`text`, ``, 0);
            ((t.content = i.slice(u)), (t.level = l), c.push(t));
          }
          t[n].children = r = kr(r, a, c);
        }
      }
    }
}
function ii(e, t) {
  return xa[t.toLowerCase()];
}
function ai(e) {
  let t = 0;
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    (r.type === `text` && !t && (r.content = r.content.replace(ba, ii)),
      r.type === `link_open` && r.info === `auto` && t--,
      r.type === `link_close` && r.info === `auto` && t++);
  }
}
function oi(e) {
  let t = 0;
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    (r.type === `text` &&
      !t &&
      va.test(r.content) &&
      (r.content = r.content
        .replace(/\+-/g, `±`)
        .replace(/\.{2,}/g, `…`)
        .replace(/([?!])…/g, `$1..`)
        .replace(/([?!]){4,}/g, `$1$1$1`)
        .replace(/,{2,}/g, `,`)
        .replace(/(^|[^-])---(?=[^-]|$)/gm, `$1—`)
        .replace(/(^|\s)--(?=\s|$)/gm, `$1–`)
        .replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, `$1–`)),
      r.type === `link_open` && r.info === `auto` && t--,
      r.type === `link_close` && r.info === `auto` && t++);
  }
}
function si(e) {
  let t;
  if (e.md.options.typographer)
    for (t = e.tokens.length - 1; t >= 0; t--)
      e.tokens[t].type === `inline` &&
        (ya.test(e.tokens[t].content) && ai(e.tokens[t].children),
        va.test(e.tokens[t].content) && oi(e.tokens[t].children));
}
function ci(e, t, n, r) {
  (e[t] || (e[t] = []), e[t].push({ pos: n, ch: r }));
}
function li(e, t) {
  let n = ``,
    r = 0;
  t.sort((e, t) => e.pos - t.pos);
  for (let i = 0; i < t.length; i++) {
    let a = t[i];
    ((n += e.slice(r, a.pos) + a.ch), (r = a.pos + 1));
  }
  return n + e.slice(r);
}
function ui(e, t) {
  let n,
    r = [],
    i = {};
  for (let a = 0; a < e.length; a++) {
    let o = e[a],
      s = e[a].level;
    for (n = r.length - 1; n >= 0 && !(r[n].level <= s); n--);
    if (((r.length = n + 1), o.type !== `text`)) continue;
    let c = o.content,
      l = 0,
      u = c.length;
    OUTER: for (; l < u;) {
      Ca.lastIndex = l;
      let o = Ca.exec(c);
      if (!o) break;
      let d = !0,
        f = !0;
      l = o.index + 1;
      let p = o[0] === `'`,
        m = 32;
      if (o.index - 1 >= 0) m = c.charCodeAt(o.index - 1);
      else
        for (n = a - 1; n >= 0 && e[n].type !== `softbreak` && e[n].type !== `hardbreak`; n--)
          if (e[n].content) {
            m = e[n].content.charCodeAt(e[n].content.length - 1);
            break;
          }
      let h = 32;
      if (l < u) h = c.charCodeAt(l);
      else
        for (n = a + 1; n < e.length && e[n].type !== `softbreak` && e[n].type !== `hardbreak`; n++)
          if (e[n].content) {
            h = e[n].content.charCodeAt(0);
            break;
          }
      let g = Vr(m) || Br(m),
        _ = Vr(h) || Br(h),
        v = Rr(m),
        y = Rr(h);
      if (
        (y ? (d = !1) : _ && (v || g || (d = !1)),
        v ? (f = !1) : g && (y || _ || (f = !1)),
        h === 34 && o[0] === `"` && m >= 48 && m <= 57 && (f = d = !1),
        d && f && ((d = g), (f = _)),
        !d && !f)
      ) {
        p && ci(i, a, o.index, wa);
        continue;
      }
      if (f)
        for (n = r.length - 1; n >= 0; n--) {
          let e = r[n];
          if (r[n].level < s) break;
          if (e.single === p && r[n].level === s) {
            e = r[n];
            let s, c;
            (p
              ? ((s = t.md.options.quotes[2]), (c = t.md.options.quotes[3]))
              : ((s = t.md.options.quotes[0]), (c = t.md.options.quotes[1])),
              ci(i, a, o.index, c),
              ci(i, e.token, e.pos, s),
              (r.length = n));
            continue OUTER;
          }
        }
      d ? r.push({ token: a, pos: o.index, single: p, level: s }) : f && p && ci(i, a, o.index, wa);
    }
  }
  Object.keys(i).forEach(function (t) {
    let n = Number(t);
    e[n].content = li(e[n].content, i[t]);
  });
}
function di(e) {
  if (e.md.options.typographer)
    for (let t = e.tokens.length - 1; t >= 0; t--)
      e.tokens[t].type !== `inline` || !Sa.test(e.tokens[t].content) || ui(e.tokens[t].children, e);
}
function fi(e) {
  let t,
    n,
    r = e.length;
  for (t = 0; t < r; t++) e[t].type === `text_special` && (e[t].type = `text`);
  for (t = n = 0; t < r; t++)
    e[t].type === `text` && t + 1 < r && e[t + 1].type === `text`
      ? (e[t + 1].content = e[t].content + e[t + 1].content)
      : (t !== n && (e[n] = e[t]), n++);
  t !== n && (e.length = n);
}
function pi(e) {
  let t,
    n,
    r = e.tokens,
    i = r.length;
  for (let e = 0; e < i; e++) {
    if (r[e].type !== `inline`) continue;
    let i = r[e].children,
      a = i.length;
    for (t = 0; t < a; t++)
      (i[t].type === `text_special` && (i[t].type = `text`), i[t].children && fi(i[t].children));
    for (t = n = 0; t < a; t++)
      i[t].type === `text` && t + 1 < a && i[t + 1].type === `text`
        ? (i[t + 1].content = i[t].content + i[t + 1].content)
        : (t !== n && (i[n] = i[t]), n++);
    t !== n && (i.length = n);
  }
}
function mi(e, t) {
  let n = e.bMarks[t] + e.tShift[t],
    r = e.eMarks[t];
  return e.src.slice(n, r);
}
function hi(e) {
  let t = [],
    n = e.length,
    r = 0,
    i = e.charCodeAt(r),
    a = !1,
    o = 0,
    s = ``;
  for (; r < n;)
    (i === 124 &&
      (a
        ? ((s += e.substring(o, r - 1)), (o = r))
        : (t.push(s + e.substring(o, r)), (s = ``), (o = r + 1))),
      (a = i === 92),
      r++,
      (i = e.charCodeAt(r)));
  return (t.push(s + e.substring(o)), t);
}
function gi(e, t, n, r) {
  if (t + 2 > n) return !1;
  let i = t + 1;
  if (e.sCount[i] < e.blkIndent || e.sCount[i] - e.blkIndent >= 4) return !1;
  let a = e.bMarks[i] + e.tShift[i];
  if (a >= e.eMarks[i]) return !1;
  let o = e.src.charCodeAt(a++);
  if ((o !== 124 && o !== 45 && o !== 58) || a >= e.eMarks[i]) return !1;
  let s = e.src.charCodeAt(a++);
  if ((s !== 124 && s !== 45 && s !== 58 && !Q(s)) || (o === 45 && Q(s))) return !1;
  for (; a < e.eMarks[i];) {
    let t = e.src.charCodeAt(a);
    if (t !== 124 && t !== 45 && t !== 58 && !Q(t)) return !1;
    a++;
  }
  let c = mi(e, t + 1),
    l = c.split(`|`),
    u = [];
  for (let e = 0; e < l.length; e++) {
    let t = l[e].trim();
    if (!t) {
      if (e === 0 || e === l.length - 1) continue;
      return !1;
    }
    if (!/^:?-+:?$/.test(t)) return !1;
    t.charCodeAt(t.length - 1) === 58
      ? u.push(t.charCodeAt(0) === 58 ? `center` : `right`)
      : t.charCodeAt(0) === 58
        ? u.push(`left`)
        : u.push(``);
  }
  if (((c = mi(e, t).trim()), c.indexOf(`|`) === -1 || e.sCount[t] - e.blkIndent >= 4)) return !1;
  ((l = hi(c)),
    l.length && l[0] === `` && l.shift(),
    l.length && l[l.length - 1] === `` && l.pop());
  let d = l.length;
  if (d === 0 || d !== u.length) return !1;
  if (r) return !0;
  let f = e.parentType;
  e.parentType = `table`;
  let p = e.md.block.ruler.getRules(`blockquote`),
    m = e.push(`table_open`, `table`, 1),
    h = [t, 0];
  m.map = h;
  let g = e.push(`thead_open`, `thead`, 1);
  g.map = [t, t + 1];
  let _ = e.push(`tr_open`, `tr`, 1);
  _.map = [t, t + 1];
  for (let t = 0; t < l.length; t++) {
    let n = e.push(`th_open`, `th`, 1);
    u[t] && (n.attrs = [[`style`, `text-align:${u[t]}`]]);
    let r = e.push(`inline`, ``, 0);
    ((r.content = l[t].trim()), (r.children = []), e.push(`th_close`, `th`, -1));
  }
  (e.push(`tr_close`, `tr`, -1), e.push(`thead_close`, `thead`, -1));
  let v,
    y = 0;
  for (i = t + 2; i < n && !(e.sCount[i] < e.blkIndent); i++) {
    let r = !1;
    for (let t = 0, a = p.length; t < a; t++)
      if (p[t](e, i, n, !0)) {
        r = !0;
        break;
      }
    if (
      r ||
      ((c = mi(e, i).trim()), !c) ||
      e.sCount[i] - e.blkIndent >= 4 ||
      ((l = hi(c)),
      l.length && l[0] === `` && l.shift(),
      l.length && l[l.length - 1] === `` && l.pop(),
      (y += d - l.length),
      y > Oa)
    )
      break;
    if (i === t + 2) {
      let n = e.push(`tbody_open`, `tbody`, 1);
      n.map = v = [t + 2, 0];
    }
    let a = e.push(`tr_open`, `tr`, 1);
    a.map = [i, i + 1];
    for (let t = 0; t < d; t++) {
      let n = e.push(`td_open`, `td`, 1);
      u[t] && (n.attrs = [[`style`, `text-align:${u[t]}`]]);
      let r = e.push(`inline`, ``, 0);
      ((r.content = l[t] ? l[t].trim() : ``), (r.children = []), e.push(`td_close`, `td`, -1));
    }
    e.push(`tr_close`, `tr`, -1);
  }
  return (
    v && (e.push(`tbody_close`, `tbody`, -1), (v[1] = i)),
    e.push(`table_close`, `table`, -1),
    (h[1] = i),
    (e.parentType = f),
    (e.line = i),
    !0
  );
}
function _i(e, t, n) {
  if (e.sCount[t] - e.blkIndent < 4) return !1;
  let r = t + 1,
    i = r;
  for (; r < n;) {
    if (e.isEmpty(r)) {
      r++;
      continue;
    }
    if (e.sCount[r] - e.blkIndent >= 4) {
      (r++, (i = r));
      continue;
    }
    break;
  }
  e.line = i;
  let a = e.push(`code_block`, `code`, 0);
  return (
    (a.content =
      e.getLines(t, i, 4 + e.blkIndent, !1) +
      `
`),
    (a.map = [t, e.line]),
    !0
  );
}
function vi(e, t, n, r) {
  let i = e.bMarks[t] + e.tShift[t],
    a = e.eMarks[t];
  if (e.sCount[t] - e.blkIndent >= 4 || i + 3 > a) return !1;
  let o = e.src.charCodeAt(i);
  if (o !== 126 && o !== 96) return !1;
  let s = i;
  i = e.skipChars(i, o);
  let c = i - s;
  if (c < 3) return !1;
  let l = e.src.slice(s, i),
    u = e.src.slice(i, a);
  if (o === 96 && u.indexOf(String.fromCharCode(o)) >= 0) return !1;
  if (r) return !0;
  let d = t,
    f = !1;
  for (
    ;
    d++,
      !(
        d >= n ||
        ((i = s = e.bMarks[d] + e.tShift[d]), (a = e.eMarks[d]), i < a && e.sCount[d] < e.blkIndent)
      );
  )
    if (
      e.src.charCodeAt(i) === o &&
      !(e.sCount[d] - e.blkIndent >= 4) &&
      ((i = e.skipChars(i, o)), !(i - s < c) && ((i = e.skipSpaces(i)), !(i < a)))
    ) {
      f = !0;
      break;
    }
  ((c = e.sCount[t]), (e.line = d + +!!f));
  let p = e.push(`fence`, `code`, 0);
  return (
    (p.info = u),
    (p.content = e.getLines(t + 1, d, c, !0)),
    (p.markup = l),
    (p.map = [t, e.line]),
    !0
  );
}
function yi(e, t, n, r) {
  let i = e.bMarks[t] + e.tShift[t],
    a = e.eMarks[t],
    o = e.lineMax;
  if (e.sCount[t] - e.blkIndent >= 4 || e.src.charCodeAt(i) !== 62) return !1;
  if (r) return !0;
  let s = [],
    c = [],
    l = [],
    u = [],
    d = e.md.block.ruler.getRules(`blockquote`),
    f = e.parentType;
  e.parentType = `blockquote`;
  let p = !1,
    m;
  for (m = t; m < n; m++) {
    let t = e.sCount[m] < e.blkIndent;
    if (((i = e.bMarks[m] + e.tShift[m]), (a = e.eMarks[m]), i >= a)) break;
    if (e.src.charCodeAt(i++) === 62 && !t) {
      let t = e.sCount[m] + 1,
        n,
        r;
      e.src.charCodeAt(i) === 32
        ? (i++, t++, (r = !1), (n = !0))
        : e.src.charCodeAt(i) === 9
          ? ((n = !0), (e.bsCount[m] + t) % 4 == 3 ? (i++, t++, (r = !1)) : (r = !0))
          : (n = !1);
      let o = t;
      for (s.push(e.bMarks[m]), e.bMarks[m] = i; i < a;) {
        let t = e.src.charCodeAt(i);
        if (Q(t)) t === 9 ? (o += 4 - ((o + e.bsCount[m] + +!!r) % 4)) : o++;
        else break;
        i++;
      }
      ((p = i >= a),
        c.push(e.bsCount[m]),
        (e.bsCount[m] = e.sCount[m] + 1 + +!!n),
        l.push(e.sCount[m]),
        (e.sCount[m] = o - t),
        u.push(e.tShift[m]),
        (e.tShift[m] = i - e.bMarks[m]));
      continue;
    }
    if (p) break;
    let r = !1;
    for (let t = 0, i = d.length; t < i; t++)
      if (d[t](e, m, n, !0)) {
        r = !0;
        break;
      }
    if (r) {
      ((e.lineMax = m),
        e.blkIndent !== 0 &&
          (s.push(e.bMarks[m]),
          c.push(e.bsCount[m]),
          u.push(e.tShift[m]),
          l.push(e.sCount[m]),
          (e.sCount[m] -= e.blkIndent)));
      break;
    }
    (s.push(e.bMarks[m]),
      c.push(e.bsCount[m]),
      u.push(e.tShift[m]),
      l.push(e.sCount[m]),
      (e.sCount[m] = -1));
  }
  let h = e.blkIndent;
  e.blkIndent = 0;
  let g = e.push(`blockquote_open`, `blockquote`, 1);
  g.markup = `>`;
  let _ = [t, 0];
  ((g.map = _), e.md.block.tokenize(e, t, m));
  let v = e.push(`blockquote_close`, `blockquote`, -1);
  ((v.markup = `>`), (e.lineMax = o), (e.parentType = f), (_[1] = e.line));
  for (let n = 0; n < u.length; n++)
    ((e.bMarks[n + t] = s[n]),
      (e.tShift[n + t] = u[n]),
      (e.sCount[n + t] = l[n]),
      (e.bsCount[n + t] = c[n]));
  return ((e.blkIndent = h), !0);
}
function bi(e, t, n, r) {
  let i = e.eMarks[t];
  if (e.sCount[t] - e.blkIndent >= 4) return !1;
  let a = e.bMarks[t] + e.tShift[t],
    o = e.src.charCodeAt(a++);
  if (o !== 42 && o !== 45 && o !== 95) return !1;
  let s = 1;
  for (; a < i;) {
    let t = e.src.charCodeAt(a++);
    if (t !== o && !Q(t)) return !1;
    t === o && s++;
  }
  if (s < 3) return !1;
  if (r) return !0;
  e.line = t + 1;
  let c = e.push(`hr`, `hr`, 0);
  return ((c.map = [t, e.line]), (c.markup = Array(s + 1).join(String.fromCharCode(o))), !0);
}
function xi(e, t) {
  let n = e.eMarks[t],
    r = e.bMarks[t] + e.tShift[t],
    i = e.src.charCodeAt(r++);
  return (i !== 42 && i !== 45 && i !== 43) || (r < n && !Q(e.src.charCodeAt(r))) ? -1 : r;
}
function Si(e, t) {
  let n = e.bMarks[t] + e.tShift[t],
    r = e.eMarks[t],
    i = n;
  if (i + 1 >= r) return -1;
  let a = e.src.charCodeAt(i++);
  if (a < 48 || a > 57) return -1;
  for (;;) {
    if (i >= r) return -1;
    if (((a = e.src.charCodeAt(i++)), a >= 48 && a <= 57)) {
      if (i - n >= 10) return -1;
      continue;
    }
    if (a === 41 || a === 46) break;
    return -1;
  }
  return i < r && ((a = e.src.charCodeAt(i)), !Q(a)) ? -1 : i;
}
function Ci(e, t) {
  let n = e.level + 2;
  for (let r = t + 2, i = e.tokens.length - 2; r < i; r++)
    e.tokens[r].level === n &&
      e.tokens[r].type === `paragraph_open` &&
      ((e.tokens[r + 2].hidden = !0), (e.tokens[r].hidden = !0), (r += 2));
}
function wi(e, t, n, r) {
  let i,
    a,
    o,
    s,
    c = t,
    l = !0;
  if (
    e.sCount[c] - e.blkIndent >= 4 ||
    (e.listIndent >= 0 && e.sCount[c] - e.listIndent >= 4 && e.sCount[c] < e.blkIndent)
  )
    return !1;
  let u = !1;
  r && e.parentType === `paragraph` && e.sCount[c] >= e.blkIndent && (u = !0);
  let d, f, p;
  if ((p = Si(e, c)) >= 0) {
    if (
      ((d = !0), (o = e.bMarks[c] + e.tShift[c]), (f = Number(e.src.slice(o, p - 1))), u && f !== 1)
    )
      return !1;
  } else if ((p = xi(e, c)) >= 0) d = !1;
  else return !1;
  if (u && e.skipSpaces(p) >= e.eMarks[c]) return !1;
  if (r) return !0;
  let m = e.src.charCodeAt(p - 1),
    h = e.tokens.length;
  d
    ? ((s = e.push(`ordered_list_open`, `ol`, 1)), f !== 1 && (s.attrs = [[`start`, f]]))
    : (s = e.push(`bullet_list_open`, `ul`, 1));
  let g = [c, 0];
  ((s.map = g), (s.markup = String.fromCharCode(m)));
  let _ = !1,
    v = e.md.block.ruler.getRules(`list`),
    y = e.parentType;
  for (e.parentType = `list`; c < n;) {
    ((a = p), (i = e.eMarks[c]));
    let t = e.sCount[c] + p - (e.bMarks[c] + e.tShift[c]),
      r = t;
    for (; a < i;) {
      let t = e.src.charCodeAt(a);
      if (t === 9) r += 4 - ((r + e.bsCount[c]) % 4);
      else if (t === 32) r++;
      else break;
      a++;
    }
    let u = a,
      f;
    ((f = u >= i ? 1 : r - t), f > 4 && (f = 1));
    let h = t + f;
    ((s = e.push(`list_item_open`, `li`, 1)), (s.markup = String.fromCharCode(m)));
    let g = [c, 0];
    ((s.map = g), d && (s.info = e.src.slice(o, p - 1)));
    let y = e.tight,
      b = e.tShift[c],
      x = e.sCount[c],
      S = e.listIndent;
    if (
      ((e.listIndent = e.blkIndent),
      (e.blkIndent = h),
      (e.tight = !0),
      (e.tShift[c] = u - e.bMarks[c]),
      (e.sCount[c] = r),
      u >= i && e.isEmpty(c + 1)
        ? (e.line = Math.min(e.line + 2, n))
        : e.md.block.tokenize(e, c, n),
      (!e.tight || _) && (l = !1),
      (_ = e.line - c > 1 && e.isEmpty(e.line - 1)),
      (e.blkIndent = e.listIndent),
      (e.listIndent = S),
      (e.tShift[c] = b),
      (e.sCount[c] = x),
      (e.tight = y),
      (s = e.push(`list_item_close`, `li`, -1)),
      (s.markup = String.fromCharCode(m)),
      (c = e.line),
      (g[1] = c),
      c >= n || e.sCount[c] < e.blkIndent || e.sCount[c] - e.blkIndent >= 4)
    )
      break;
    let C = !1;
    for (let t = 0, r = v.length; t < r; t++)
      if (v[t](e, c, n, !0)) {
        C = !0;
        break;
      }
    if (C) break;
    if (d) {
      if (((p = Si(e, c)), p < 0)) break;
      o = e.bMarks[c] + e.tShift[c];
    } else if (((p = xi(e, c)), p < 0)) break;
    if (m !== e.src.charCodeAt(p - 1)) break;
  }
  return (
    (s = d ? e.push(`ordered_list_close`, `ol`, -1) : e.push(`bullet_list_close`, `ul`, -1)),
    (s.markup = String.fromCharCode(m)),
    (g[1] = c),
    (e.line = c),
    (e.parentType = y),
    l && Ci(e, h),
    !0
  );
}
function Ti(e, t, n, r) {
  let i = e.bMarks[t] + e.tShift[t],
    a = e.eMarks[t],
    o = t + 1;
  if (e.sCount[t] - e.blkIndent >= 4 || e.src.charCodeAt(i) !== 91) return !1;
  function s(t) {
    let n = e.lineMax;
    if (t >= n || e.isEmpty(t)) return null;
    let r = !1;
    if ((e.sCount[t] - e.blkIndent > 3 && (r = !0), e.sCount[t] < 0 && (r = !0), !r)) {
      let r = e.md.block.ruler.getRules(`reference`),
        i = e.parentType;
      e.parentType = `reference`;
      let a = !1;
      for (let i = 0, o = r.length; i < o; i++)
        if (r[i](e, t, n, !0)) {
          a = !0;
          break;
        }
      if (((e.parentType = i), a)) return null;
    }
    let i = e.bMarks[t] + e.tShift[t],
      a = e.eMarks[t];
    return e.src.slice(i, a + 1);
  }
  let c = e.src.slice(i, a + 1);
  a = c.length;
  let l = -1;
  for (i = 1; i < a; i++) {
    let e = c.charCodeAt(i);
    if (e === 91) return !1;
    if (e === 93) {
      l = i;
      break;
    }
    if (e === 10) {
      let e = s(o);
      e !== null && ((c += e), (a = c.length), o++);
    } else if (e === 92 && (i++, i < a && c.charCodeAt(i) === 10)) {
      let e = s(o);
      e !== null && ((c += e), (a = c.length), o++);
    }
  }
  if (l < 0 || c.charCodeAt(l + 1) !== 58) return !1;
  for (i = l + 2; i < a; i++) {
    let e = c.charCodeAt(i);
    if (e === 10) {
      let e = s(o);
      e !== null && ((c += e), (a = c.length), o++);
    } else if (!Q(e)) break;
  }
  let u = e.md.helpers.parseLinkDestination(c, i, a);
  if (!u.ok) return !1;
  let d = e.md.normalizeLink(u.str);
  if (!e.md.validateLink(d)) return !1;
  i = u.pos;
  let f = i,
    p = o,
    m = i;
  for (; i < a; i++) {
    let e = c.charCodeAt(i);
    if (e === 10) {
      let e = s(o);
      e !== null && ((c += e), (a = c.length), o++);
    } else if (!Q(e)) break;
  }
  let h = e.md.helpers.parseLinkTitle(c, i, a);
  for (; h.can_continue;) {
    let t = s(o);
    if (t === null) break;
    ((c += t), (i = a), (a = c.length), o++, (h = e.md.helpers.parseLinkTitle(c, i, a, h)));
  }
  let g;
  for (
    i < a && m !== i && h.ok ? ((g = h.str), (i = h.pos)) : ((g = ``), (i = f), (o = p));
    i < a && Q(c.charCodeAt(i));
  )
    i++;
  if (i < a && c.charCodeAt(i) !== 10 && g)
    for (g = ``, i = f, o = p; i < a && Q(c.charCodeAt(i));) i++;
  if (i < a && c.charCodeAt(i) !== 10) return !1;
  let _ = Hr(c.slice(1, l));
  if (!_) return !1;
  if (r) return !0;
  (e.env.references === void 0 && (e.env.references = {}),
    e.env.references[_] === void 0 && (e.env.references[_] = { title: g, href: d }));
  let v = e.push(`reference_definition`, ``, 0);
  ((v.map = [t, o]), (v.hidden = !0));
  let y = Object.create(null);
  return ((y.label = _), (v.meta = y), (e.line = o), !0);
}
function Ei(e, t, n, r) {
  let i = e.bMarks[t] + e.tShift[t],
    a = e.eMarks[t];
  if (e.sCount[t] - e.blkIndent >= 4 || !e.md.options.html || e.src.charCodeAt(i) !== 60) return !1;
  let o = e.src.slice(i, a),
    s = 0;
  for (; s < Pa.length && !Pa[s][0].test(o); s++);
  if (s === Pa.length) return !1;
  if (r) return Pa[s][2];
  let c = t + 1,
    l = Pa[s][1].test(``);
  if (!Pa[s][1].test(o)) {
    for (; c < n && !(e.sCount[c] < e.blkIndent && (l || !e.isEmpty(c))); c++)
      if (
        ((i = e.bMarks[c] + e.tShift[c]),
        (a = e.eMarks[c]),
        (o = e.src.slice(i, a)),
        Pa[s][1].test(o))
      ) {
        o.length !== 0 && c++;
        break;
      }
  }
  e.line = c;
  let u = e.push(`html_block`, ``, 0);
  return ((u.map = [t, c]), (u.content = e.getLines(t, c, e.blkIndent, !0)), !0);
}
function Di(e, t, n, r) {
  let i = e.bMarks[t] + e.tShift[t],
    a = e.eMarks[t];
  if (e.sCount[t] - e.blkIndent >= 4) return !1;
  let o = e.src.charCodeAt(i);
  if (o !== 35 || i >= a) return !1;
  let s = 1;
  for (o = e.src.charCodeAt(++i); o === 35 && i < a && s <= 6;) (s++, (o = e.src.charCodeAt(++i)));
  if (s > 6 || (i < a && !Q(o))) return !1;
  if (r) return !0;
  a = e.skipSpacesBack(a, i);
  let c = e.skipCharsBack(a, 35, i);
  (c > i && Q(e.src.charCodeAt(c - 1)) && (a = c), (e.line = t + 1));
  let l = e.push(`heading_open`, `h${s}`, 1);
  ((l.markup = `########`.slice(0, s)), (l.map = [t, e.line]));
  let u = e.push(`inline`, ``, 0);
  ((u.content = Wr(e.src.slice(i, a))), (u.map = [t, e.line]), (u.children = []));
  let d = e.push(`heading_close`, `h${s}`, -1);
  return ((d.markup = `########`.slice(0, s)), !0);
}
function Oi(e, t, n) {
  let r = e.md.block.ruler.getRules(`paragraph`);
  if (e.sCount[t] - e.blkIndent >= 4) return !1;
  let i = e.parentType;
  e.parentType = `paragraph`;
  let a = 0,
    o,
    s = t + 1;
  for (; s < n && !e.isEmpty(s); s++) {
    if (e.sCount[s] - e.blkIndent > 3) continue;
    if (e.sCount[s] >= e.blkIndent) {
      let t = e.bMarks[s] + e.tShift[s],
        n = e.eMarks[s];
      if (
        t < n &&
        ((o = e.src.charCodeAt(t)),
        (o === 45 || o === 61) && ((t = e.skipChars(t, o)), (t = e.skipSpaces(t)), t >= n))
      ) {
        a = o === 61 ? 1 : 2;
        break;
      }
    }
    if (e.sCount[s] < 0) continue;
    let t = !1;
    for (let i = 0, a = r.length; i < a; i++)
      if (r[i](e, s, n, !0)) {
        t = !0;
        break;
      }
    if (t) break;
  }
  if (!a) return ((e.parentType = i), !1);
  let c = Wr(e.getLines(t, s, e.blkIndent, !1));
  e.line = s + 1;
  let l = e.push(`heading_open`, `h${a}`, 1);
  ((l.markup = String.fromCharCode(o)), (l.map = [t, e.line]));
  let u = e.push(`inline`, ``, 0);
  ((u.content = c), (u.map = [t, e.line - 1]), (u.children = []));
  let d = e.push(`heading_close`, `h${a}`, -1);
  return ((d.markup = String.fromCharCode(o)), (e.parentType = i), !0);
}
function ki(e, t, n) {
  let r = e.md.block.ruler.getRules(`paragraph`),
    i = e.parentType,
    a = t + 1;
  for (e.parentType = `paragraph`; a < n && !e.isEmpty(a); a++) {
    if (e.sCount[a] - e.blkIndent > 3 || e.sCount[a] < 0) continue;
    let t = !1;
    for (let i = 0, o = r.length; i < o; i++)
      if (r[i](e, a, n, !0)) {
        t = !0;
        break;
      }
    if (t) break;
  }
  let o = Wr(e.getLines(t, a, e.blkIndent, !1));
  e.line = a;
  let s = e.push(`paragraph_open`, `p`, 1);
  s.map = [t, e.line];
  let c = e.push(`inline`, ``, 0);
  return (
    (c.content = o),
    (c.map = [t, e.line]),
    (c.children = []),
    e.push(`paragraph_close`, `p`, -1),
    (e.parentType = i),
    !0
  );
}
function Ai(e) {
  switch (e) {
    case 10:
    case 33:
    case 35:
    case 36:
    case 37:
    case 38:
    case 42:
    case 43:
    case 45:
    case 58:
    case 60:
    case 61:
    case 62:
    case 64:
    case 91:
    case 92:
    case 93:
    case 94:
    case 95:
    case 96:
    case 123:
    case 125:
    case 126:
      return !0;
    default:
      return !1;
  }
}
function ji(e, t) {
  let n = e.pos;
  for (; n < e.posMax && !Ai(e.src.charCodeAt(n));) n++;
  return n !== e.pos && (t || (e.pending += e.src.slice(e.pos, n)), (e.pos = n), !0);
}
function Mi(e, t) {
  if (!e.md.options.linkify || e.linkLevel > 0) return !1;
  let n = e.pos,
    r = e.posMax;
  if (
    n + 3 > r ||
    e.src.charCodeAt(n) !== 58 ||
    e.src.charCodeAt(n + 1) !== 47 ||
    e.src.charCodeAt(n + 2) !== 47
  )
    return !1;
  let i = e.pending.match(Ra);
  if (!i) return !1;
  let a = i[1],
    o = e.md.linkify.matchAtStart(e.src.slice(n - a.length));
  if (!o) return !1;
  let s = o.url;
  if (s.length <= a.length) return !1;
  let c = s.length;
  for (; c > 0 && s.charCodeAt(c - 1) === 42;) c--;
  c !== s.length && (s = s.slice(0, c));
  let l = e.md.normalizeLink(s);
  if (!e.md.validateLink(l)) return !1;
  if (!t) {
    e.pending = e.pending.slice(0, -a.length);
    let t = e.push(`link_open`, `a`, 1);
    ((t.attrs = [[`href`, l]]), (t.markup = `linkify`), (t.info = `auto`));
    let n = e.push(`text`, ``, 0);
    n.content = e.md.normalizeLinkText(s);
    let r = e.push(`link_close`, `a`, -1);
    ((r.markup = `linkify`), (r.info = `auto`));
  }
  return ((e.pos += s.length - a.length), !0);
}
function Ni(e, t) {
  let n = e.pos;
  if (e.src.charCodeAt(n) !== 10) return !1;
  let r = e.pending.length - 1,
    i = e.posMax;
  if (!t) {
    if (r >= 0 && e.pending.charCodeAt(r) === 32) {
      if (r >= 1 && e.pending.charCodeAt(r - 1) === 32) {
        let t = r - 1;
        for (; t >= 1 && e.pending.charCodeAt(t - 1) === 32;) t--;
        ((e.pending = e.pending.slice(0, t)), e.push(`hardbreak`, `br`, 0));
      } else ((e.pending = e.pending.slice(0, -1)), e.push(`softbreak`, `br`, 0));
    } else e.push(`softbreak`, `br`, 0);
  }
  for (n++; n < i && Q(e.src.charCodeAt(n));) n++;
  return ((e.pos = n), !0);
}
function Pi(e, t) {
  let n = e.pos,
    r = e.posMax;
  if (e.src.charCodeAt(n) !== 92 || (n++, n >= r)) return !1;
  let i = e.src.charCodeAt(n);
  if (i === 10) {
    for (t || e.push(`hardbreak`, `br`, 0), n++; n < r && ((i = e.src.charCodeAt(n)), Q(i));) n++;
    return ((e.pos = n), !0);
  }
  if (i === 32) {
    if (!t) {
      let t = e.push(`text_special`, ``, 0);
      ((t.content = `\\`), (t.markup = `\\`), (t.info = `escape`));
    }
    return ((e.pos = n), !0);
  }
  let a = e.src[n];
  if (i >= 55296 && i <= 56319 && n + 1 < r) {
    let t = e.src.charCodeAt(n + 1);
    t >= 56320 && t <= 57343 && ((a += e.src[n + 1]), n++);
  }
  let o = `\\` + a;
  if (!t) {
    let t = e.push(`text_special`, ``, 0);
    ((t.content = i < 256 && za[i] !== 0 ? a : o), (t.markup = o), (t.info = `escape`));
  }
  return ((e.pos = n + 1), !0);
}
function Fi(e, t) {
  let n = e.pos;
  if (e.src.charCodeAt(n) !== 96) return !1;
  let r = n;
  n++;
  let i = e.posMax;
  for (; n < i && e.src.charCodeAt(n) === 96;) n++;
  let a = e.src.slice(r, n),
    o = a.length;
  if (e.backticksScanned && (e.backticks[o] || 0) <= r)
    return (t || (e.pending += a), (e.pos += o), !0);
  let s = n,
    c;
  for (; (c = e.src.indexOf("`", s)) !== -1;) {
    for (s = c + 1; s < i && e.src.charCodeAt(s) === 96;) s++;
    let r = s - c;
    if (r === o) {
      if (!t) {
        let t = e.push(`code_inline`, `code`, 0);
        ((t.markup = a),
          (t.content = e.src
            .slice(n, c)
            .replace(/\n/g, ` `)
            .replace(/^ (.+) $/, `$1`)));
      }
      return ((e.pos = s), !0);
    }
    e.backticks[r] = c;
  }
  return ((e.backticksScanned = !0), t || (e.pending += a), (e.pos += o), !0);
}
function Ii(e, t) {
  let n = e.pos,
    r = e.src.charCodeAt(n);
  if (t || r !== 126) return !1;
  let i = e.scanDelims(e.pos, !0),
    a = i.length,
    o = String.fromCharCode(r);
  if (a < 2) return !1;
  let s;
  a % 2 && ((s = e.push(`text`, ``, 0)), (s.content = o), a--);
  for (let t = 0; t < a; t += 2)
    ((s = e.push(`text`, ``, 0)),
      (s.content = o + o),
      e.delimiters.push({
        marker: r,
        length: 0,
        token: e.tokens.length - 1,
        end: -1,
        open: i.can_open,
        close: i.can_close,
      }));
  return ((e.pos += i.length), !0);
}
function Li(e, t) {
  let n,
    r = [],
    i = t.length;
  for (let a = 0; a < i; a++) {
    let i = t[a];
    if (i.marker !== 126 || i.end === -1) continue;
    let o = t[i.end];
    ((n = e.tokens[i.token]),
      (n.type = `s_open`),
      (n.tag = `s`),
      (n.nesting = 1),
      (n.markup = `~~`),
      (n.content = ``),
      (n = e.tokens[o.token]),
      (n.type = `s_close`),
      (n.tag = `s`),
      (n.nesting = -1),
      (n.markup = `~~`),
      (n.content = ``),
      e.tokens[o.token - 1].type === `text` &&
        e.tokens[o.token - 1].content === `~` &&
        r.push(o.token - 1));
  }
  for (; r.length;) {
    let t = r.pop(),
      i = t + 1;
    for (; i < e.tokens.length && e.tokens[i].type === `s_close`;) i++;
    (i--, t !== i && ((n = e.tokens[i]), (e.tokens[i] = e.tokens[t]), (e.tokens[t] = n)));
  }
}
function Ri(e) {
  let t = e.tokens_meta,
    n = e.tokens_meta.length;
  Li(e, e.delimiters);
  for (let r = 0; r < n; r++) {
    let n = t[r]?.delimiters;
    n && Li(e, n);
  }
}
function zi(e, t) {
  let n = e.pos,
    r = e.src.charCodeAt(n);
  if (t || (r !== 95 && r !== 42)) return !1;
  let i = e.scanDelims(e.pos, r === 42);
  for (let t = 0; t < i.length; t++) {
    let t = e.push(`text`, ``, 0);
    ((t.content = String.fromCharCode(r)),
      e.delimiters.push({
        marker: r,
        length: i.length,
        token: e.tokens.length - 1,
        end: -1,
        open: i.can_open,
        close: i.can_close,
      }));
  }
  return ((e.pos += i.length), !0);
}
function Bi(e, t) {
  let n = t.length;
  for (let r = n - 1; r >= 0; r--) {
    let n = t[r];
    if ((n.marker !== 95 && n.marker !== 42) || n.end === -1) continue;
    let i = t[n.end],
      a =
        r > 0 &&
        t[r - 1].end === n.end + 1 &&
        t[r - 1].marker === n.marker &&
        t[r - 1].token === n.token - 1 &&
        t[n.end + 1].token === i.token + 1,
      o = String.fromCharCode(n.marker),
      s = e.tokens[n.token];
    ((s.type = a ? `strong_open` : `em_open`),
      (s.tag = a ? `strong` : `em`),
      (s.nesting = 1),
      (s.markup = a ? o + o : o),
      (s.content = ``));
    let c = e.tokens[i.token];
    ((c.type = a ? `strong_close` : `em_close`),
      (c.tag = a ? `strong` : `em`),
      (c.nesting = -1),
      (c.markup = a ? o + o : o),
      (c.content = ``),
      a &&
        ((e.tokens[t[r - 1].token].content = ``),
        (e.tokens[t[n.end + 1].token].content = ``),
        r--));
  }
}
function Vi(e) {
  let t = e.tokens_meta,
    n = e.tokens_meta.length;
  Bi(e, e.delimiters);
  for (let r = 0; r < n; r++) {
    let n = t[r]?.delimiters;
    n && Bi(e, n);
  }
}
function Hi(e, t) {
  let n,
    r,
    i,
    a,
    o = ``,
    s = ``,
    c = e.pos,
    l = !0;
  if (e.src.charCodeAt(e.pos) !== 91) return !1;
  let u = e.pos,
    d = e.posMax,
    f = e.pos + 1,
    p = e.md.helpers.parseLinkLabel(e, e.pos, !0);
  if (p < 0) return !1;
  let m = p + 1;
  if (m < d && e.src.charCodeAt(m) === 40) {
    for (l = !1, m++; m < d && ((n = e.src.charCodeAt(m)), !(!Q(n) && n !== 10)); m++);
    if (m >= d) return !1;
    if (((c = m), (i = e.md.helpers.parseLinkDestination(e.src, m, e.posMax)), i.ok)) {
      for (
        o = e.md.normalizeLink(i.str), e.md.validateLink(o) ? (m = i.pos) : (o = ``), c = m;
        m < d && ((n = e.src.charCodeAt(m)), !(!Q(n) && n !== 10));
        m++
      );
      if (((i = e.md.helpers.parseLinkTitle(e.src, m, e.posMax)), m < d && c !== m && i.ok))
        for (s = i.str, m = i.pos; m < d && ((n = e.src.charCodeAt(m)), !(!Q(n) && n !== 10)); m++);
    }
    ((m >= d || e.src.charCodeAt(m) !== 41) && (l = !0), m++);
  }
  if (l) {
    if (e.env.references === void 0) return !1;
    if (
      (m < d && e.src.charCodeAt(m) === 91
        ? ((c = m + 1),
          (m = e.md.helpers.parseLinkLabel(e, m)),
          m >= 0 ? (r = e.src.slice(c, m++)) : (m = p + 1))
        : (m = p + 1),
      (r ||= e.src.slice(f, p)),
      (r = Hr(r)),
      (a = e.env.references[r]),
      !a)
    )
      return ((e.pos = u), !1);
    ((o = a.href), (s = a.title));
  }
  if (!t) {
    ((e.pos = f), (e.posMax = p));
    let t = e.push(`link_open`, `a`, 1),
      n = [[`href`, o]];
    if (((t.attrs = n), s && n.push([`title`, s]), r)) {
      let e = Object.create(null);
      ((e.label = r), (t.meta = e));
    }
    (e.linkLevel++, e.md.inline.tokenize(e), e.linkLevel--, e.push(`link_close`, `a`, -1));
  }
  return ((e.pos = m), (e.posMax = d), !0);
}
function Ui(e, t) {
  let n,
    r,
    i,
    a,
    o,
    s,
    c,
    l,
    u = ``,
    d = e.pos,
    f = e.posMax;
  if (e.src.charCodeAt(e.pos) !== 33 || e.src.charCodeAt(e.pos + 1) !== 91) return !1;
  let p = e.pos + 2,
    m = e.md.helpers.parseLinkLabel(e, e.pos + 1, !1);
  if (m < 0) return !1;
  if (((a = m + 1), a < f && e.src.charCodeAt(a) === 40)) {
    for (a++; a < f && ((n = e.src.charCodeAt(a)), !(!Q(n) && n !== 10)); a++);
    if (a >= f) return !1;
    for (
      l = a,
        s = e.md.helpers.parseLinkDestination(e.src, a, e.posMax),
        s.ok && ((u = e.md.normalizeLink(s.str)), e.md.validateLink(u) ? (a = s.pos) : (u = ``)),
        l = a;
      a < f && ((n = e.src.charCodeAt(a)), !(!Q(n) && n !== 10));
      a++
    );
    if (((s = e.md.helpers.parseLinkTitle(e.src, a, e.posMax)), a < f && l !== a && s.ok))
      for (c = s.str, a = s.pos; a < f && ((n = e.src.charCodeAt(a)), !(!Q(n) && n !== 10)); a++);
    else c = ``;
    if (a >= f || e.src.charCodeAt(a) !== 41) return ((e.pos = d), !1);
    a++;
  } else {
    if (e.env.references === void 0) return !1;
    if (
      (a < f && e.src.charCodeAt(a) === 91
        ? ((l = a + 1),
          (a = e.md.helpers.parseLinkLabel(e, a)),
          a >= 0 ? (i = e.src.slice(l, a++)) : (a = m + 1))
        : (a = m + 1),
      (i ||= e.src.slice(p, m)),
      (i = Hr(i)),
      (o = e.env.references[i]),
      !o)
    )
      return ((e.pos = d), !1);
    ((u = o.href), (c = o.title));
  }
  if (!t) {
    r = e.src.slice(p, m);
    let t = [];
    e.md.inline.parse(r, e.md, e.env, t);
    let n = e.push(`image`, `img`, 0),
      a = [
        [`src`, u],
        [`alt`, ``],
      ];
    if (((n.attrs = a), (n.children = t), (n.content = r), c && a.push([`title`, c]), i)) {
      let e = Object.create(null);
      ((e.label = i), (n.meta = e));
    }
  }
  return ((e.pos = a), (e.posMax = f), !0);
}
function Wi(e, t) {
  let n = e.pos;
  if (e.src.charCodeAt(n) !== 60) return !1;
  let r = e.pos,
    i = e.posMax;
  for (;;) {
    if (++n >= i) return !1;
    let t = e.src.charCodeAt(n);
    if (t === 60) return !1;
    if (t === 62) break;
  }
  let a = e.src.slice(r + 1, n);
  if (Ua.test(a)) {
    let n = e.md.normalizeLink(a);
    if (!e.md.validateLink(n)) return !1;
    if (!t) {
      let t = e.push(`link_open`, `a`, 1);
      ((t.attrs = [[`href`, n]]), (t.markup = `autolink`), (t.info = `auto`));
      let r = e.push(`text`, ``, 0);
      r.content = e.md.normalizeLinkText(a);
      let i = e.push(`link_close`, `a`, -1);
      ((i.markup = `autolink`), (i.info = `auto`));
    }
    return ((e.pos += a.length + 2), !0);
  }
  if (Ha.test(a)) {
    let n = e.md.normalizeLink(`mailto:${a}`);
    if (!e.md.validateLink(n)) return !1;
    if (!t) {
      let t = e.push(`link_open`, `a`, 1);
      ((t.attrs = [[`href`, n]]), (t.markup = `autolink`), (t.info = `auto`));
      let r = e.push(`text`, ``, 0);
      r.content = e.md.normalizeLinkText(a);
      let i = e.push(`link_close`, `a`, -1);
      ((i.markup = `autolink`), (i.info = `auto`));
    }
    return ((e.pos += a.length + 2), !0);
  }
  return !1;
}
function Gi(e) {
  return /^<a[>\s]/i.test(e);
}
function Ki(e) {
  return /^<\/a\s*>/i.test(e);
}
function qi(e) {
  let t = e | 32;
  return t >= 97 && t <= 122;
}
function Ji(e, t) {
  if (!e.md.options.html) return !1;
  let n = e.posMax,
    r = e.pos;
  if (e.src.charCodeAt(r) !== 60 || r + 2 >= n) return !1;
  let i = e.src.charCodeAt(r + 1);
  if (i !== 33 && i !== 63 && i !== 47 && !qi(i)) return !1;
  let a = e.src.slice(r).match(Ma);
  if (!a) return !1;
  if (!t) {
    let t = e.push(`html_inline`, ``, 0);
    ((t.content = a[0]), Gi(t.content) && e.linkLevel++, Ki(t.content) && e.linkLevel--);
  }
  return ((e.pos += a[0].length), !0);
}
function Yi(e, t) {
  let n = e.pos,
    r = e.posMax;
  if (e.src.charCodeAt(n) !== 38 || n + 1 >= r) return !1;
  if (e.src.charCodeAt(n + 1) === 35) {
    let r = e.src.slice(n).match(Wa);
    if (r) {
      if (!t) {
        let t = r[1][0].toLowerCase() === `x` ? parseInt(r[1].slice(1), 16) : parseInt(r[1], 10),
          n = e.push(`text_special`, ``, 0);
        ((n.content = Ar(t) ? jr(t) : jr(65533)), (n.markup = r[0]), (n.info = `entity`));
      }
      return ((e.pos += r[0].length), !0);
    }
  } else {
    let r = e.src.slice(n).match(Ga);
    if (r) {
      let n = In(r[0]);
      if (n !== r[0]) {
        if (!t) {
          let t = e.push(`text_special`, ``, 0);
          ((t.content = n), (t.markup = r[0]), (t.info = `entity`));
        }
        return ((e.pos += r[0].length), !0);
      }
    }
  }
  return !1;
}
function Xi(e) {
  let t = {},
    n = e.length;
  if (!n) return;
  let r = 0,
    i = -2,
    a = [];
  for (let o = 0; o < n; o++) {
    let n = e[o];
    if (
      (a.push(0),
      (e[r].marker !== n.marker || i !== n.token - 1) && (r = o),
      (i = n.token),
      (n.length = n.length || 0),
      !n.close)
    )
      continue;
    t.hasOwnProperty(n.marker) || (t[n.marker] = [-1, -1, -1, -1, -1, -1]);
    let s = t[n.marker][(n.open ? 3 : 0) + (n.length % 3)],
      c = r - a[r] - 1,
      l = c;
    for (; c > s; c -= a[c] + 1) {
      let t = e[c];
      if (t.marker === n.marker && t.open && t.end < 0) {
        let r = !1;
        if (
          ((t.close || n.open) &&
            (t.length + n.length) % 3 == 0 &&
            (t.length % 3 != 0 || n.length % 3 != 0) &&
            (r = !0),
          !r)
        ) {
          let r = c > 0 && !e[c - 1].open ? a[c - 1] + 1 : 0;
          ((a[o] = o - c + r),
            (a[c] = r),
            (n.open = !1),
            (t.end = o),
            (t.close = !1),
            (l = -1),
            (i = -2));
          break;
        }
      }
    }
    l !== -1 && (t[n.marker][(n.open ? 3 : 0) + ((n.length || 0) % 3)] = l);
  }
}
function Zi(e) {
  let t = e.tokens_meta,
    n = e.tokens_meta.length;
  Xi(e.delimiters);
  for (let e = 0; e < n; e++) {
    let n = t[e]?.delimiters;
    n && Xi(n);
  }
}
function Qi(e) {
  let t,
    n,
    r = 0,
    i = e.tokens,
    a = e.tokens.length;
  for (t = n = 0; t < a; t++)
    (i[t].nesting < 0 && r--,
      (i[t].level = r),
      i[t].nesting > 0 && r++,
      i[t].type === `text` && t + 1 < a && i[t + 1].type === `text`
        ? (i[t + 1].content = i[t].content + i[t + 1].content)
        : (t !== n && (i[n] = i[t]), n++));
  t !== n && (i.length = n);
}
var $i,
  ea,
  ta,
  na,
  ra,
  ia,
  aa,
  oa,
  sa,
  ca,
  la,
  ua,
  da,
  fa,
  pa,
  ma,
  ha,
  ga,
  _a,
  va,
  ya,
  ba,
  xa,
  Sa,
  Ca,
  wa,
  Ta,
  Ea,
  Da,
  Oa,
  ka,
  Aa,
  ja,
  Ma,
  Na,
  Pa,
  Fa,
  Ia,
  La,
  Ra,
  za,
  Ba,
  Va,
  Ha,
  Ua,
  Wa,
  Ga,
  Ka,
  qa,
  Ja,
  Ya,
  Xa,
  Za,
  Qa,
  $a,
  eo;
function to() {
  return (to = t(() => {
    (hn(),
      Sn(),
      Vn(),
      Zn(),
      Dr(),
      ($i = Object.defineProperty),
      (ea = (e, t) => {
        let n = {};
        for (var r in e) $i(n, r, { get: e[r], enumerable: !0 });
        return (t || $i(n, Symbol.toStringTag, { value: `Module` }), n);
      }),
      (ta = ea({
        arrayReplaceAt: () => kr,
        asciiTrim: () => Wr,
        callable: () => Or,
        escapeHtml: () => Ir,
        escapeRE: () => Lr,
        fromCodePoint: () => jr,
        isMdAsciiPunct: () => Vr,
        isPunctChar: () => zr,
        isPunctCharCode: () => Br,
        isSpace: () => Q,
        isValidEntityCode: () => Ar,
        isWhiteSpace: () => Rr,
        lib: () => la,
        normalizeReference: () => Hr,
        unescapeAll: () => Pr,
        unescapeMd: () => Nr,
      })),
      (na = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g),
      (ra = RegExp(`${na.source}|&([a-z#][a-z0-9]{1,31});`, `gi`)),
      (ia = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i),
      (aa = /[&<>"]/),
      (oa = /[&<>"]/g),
      (sa = { "&": `&amp;`, "<": `&lt;`, ">": `&gt;`, '"': `&quot;` }),
      (ca = /[.?*+^$[\]\\(){}|-]/g),
      (la = { mdurl: mn, ucmicro: gn }),
      (ua = ea({
        parseLinkDestination: () => Kr,
        parseLinkLabel: () => Gr,
        parseLinkTitle: () => qr,
      })),
      (da = class {
        constructor(e, t, n) {
          ($(this, `map`, null),
            $(this, `level`, 0),
            $(this, `children`, null),
            $(this, `content`, ``),
            $(this, `markup`, ``),
            $(this, `info`, ``),
            $(this, `block`, !1),
            $(this, `hidden`, !1),
            (this.type = e),
            (this.tag = t),
            (this.attrs = null),
            (this.nesting = n),
            (this.meta = null));
        }
        attrIndex(e) {
          if (!this.attrs) return -1;
          let t = this.attrs;
          for (let n = 0, r = t.length; n < r; n++) if (t[n][0] === e) return n;
          return -1;
        }
        attrPush(e) {
          this.attrs ? this.attrs.push(e) : (this.attrs = [e]);
        }
        attrSet(e, t) {
          let n = this.attrIndex(e),
            r = [e, t];
          n < 0 ? this.attrPush(r) : (this.attrs[n] = r);
        }
        attrGet(e) {
          let t = this.attrIndex(e),
            n = null;
          return (t >= 0 && (n = this.attrs[t][1]), n);
        }
        attrJoin(e, t) {
          let n = this.attrIndex(e);
          n < 0 ? this.attrPush([e, t]) : (this.attrs[n][1] = `${this.attrs[n][1]} ${t}`);
        }
      }),
      (fa = class {
        constructor() {
          ($(this, `__rules__`, []), $(this, `__cache__`, null));
        }
        __find__(e) {
          for (let t = 0; t < this.__rules__.length; t++)
            if (this.__rules__[t].name === e) return t;
          return -1;
        }
        __compile__() {
          let e = new Set();
          (this.__rules__.forEach((t) => {
            t.enabled &&
              t.alt.forEach((t) => {
                t && e.add(t);
              });
          }),
            (this.__cache__ = Object.create(null)),
            (this.__cache__[``] = []),
            this.__rules__.forEach((e) => {
              e.enabled && this.__cache__[``].push(e.fn);
            }),
            e.forEach((e) => {
              ((this.__cache__[e] = []),
                this.__rules__.forEach((t) => {
                  t.enabled && t.alt.indexOf(e) >= 0 && this.__cache__[e].push(t.fn);
                }));
            }));
        }
        at(e, t, n = {}) {
          let r = this.__find__(e);
          if (r === -1) throw Error(`Parser rule not found: ${e}`);
          ((this.__rules__[r].fn = t),
            (this.__rules__[r].alt = n.alt || []),
            (this.__cache__ = null));
        }
        before(e, t, n, r = {}) {
          let i = this.__find__(e);
          if (i === -1) throw Error(`Parser rule not found: ${e}`);
          (this.__rules__.splice(i, 0, { name: t, enabled: !0, fn: n, alt: r.alt || [] }),
            (this.__cache__ = null));
        }
        after(e, t, n, r = {}) {
          let i = this.__find__(e);
          if (i === -1) throw Error(`Parser rule not found: ${e}`);
          (this.__rules__.splice(i + 1, 0, { name: t, enabled: !0, fn: n, alt: r.alt || [] }),
            (this.__cache__ = null));
        }
        push(e, t, n = {}) {
          (this.__rules__.push({ name: e, enabled: !0, fn: t, alt: n.alt || [] }),
            (this.__cache__ = null));
        }
        enable(e, t = !1) {
          Array.isArray(e) || (e = [e]);
          let n = [];
          return (
            e.forEach((e) => {
              let r = this.__find__(e);
              if (r < 0) {
                if (t) return;
                throw Error(`Rules manager: invalid rule name ${e}`);
              }
              ((this.__rules__[r].enabled = !0), n.push(e));
            }),
            (this.__cache__ = null),
            n
          );
        }
        enableOnly(e, t = !1) {
          (Array.isArray(e) || (e = [e]),
            this.__rules__.forEach((e) => {
              e.enabled = !1;
            }),
            this.enable(e, t));
        }
        disable(e, t = !1) {
          Array.isArray(e) || (e = [e]);
          let n = [];
          return (
            e.forEach((e) => {
              let r = this.__find__(e);
              if (r < 0) {
                if (t) return;
                throw Error(`Rules manager: invalid rule name ${e}`);
              }
              ((this.__rules__[r].enabled = !1), n.push(e));
            }),
            (this.__cache__ = null),
            n
          );
        }
        getRules(e) {
          return (this.__cache__ || this.__compile__(), this.__cache__[e] || []);
        }
      }),
      (pa = {}),
      (pa.code_inline = function (e, t, n, r, i) {
        let a = e[t];
        return `<code${i.renderAttrs(a)}>${Ir(a.content)}</code>`;
      }),
      (pa.code_block = function (e, t, n, r, i) {
        let a = e[t];
        return `<pre${i.renderAttrs(a)}><code>${Ir(e[t].content)}</code></pre>\n`;
      }),
      (pa.fence = function (e, t, n, r, i) {
        let a = e[t],
          o = a.info ? Pr(a.info).trim() : ``,
          s = ``,
          c = ``;
        if (o) {
          let e = o.split(/(\s+)/g);
          ((s = e[0]), (c = e.slice(2).join(``)));
        }
        let l;
        if (
          ((l = (n.highlight && n.highlight(a.content, s, c)) || Ir(a.content)),
          l.indexOf(`<pre`) === 0)
        )
          return (
            l +
            `
`
          );
        if (o) {
          let e = a.attrIndex(`class`),
            t = a.attrs ? a.attrs.slice() : [];
          e < 0
            ? t.push([`class`, `${n.langPrefix}${s}`])
            : ((t[e] = [t[e][0], t[e][1]]), (t[e][1] += ` ${n.langPrefix}${s}`));
          let r = { attrs: t };
          return `<pre><code${i.renderAttrs(r)}>${l}</code></pre>\n`;
        }
        return `<pre><code${i.renderAttrs(a)}>${l}</code></pre>\n`;
      }),
      (pa.image = function (e, t, n, r, i) {
        let a = e[t];
        return (
          (a.attrs[a.attrIndex(`alt`)][1] = i.renderInlineAsText(a.children, n, r)),
          i.renderToken(e, t, n)
        );
      }),
      (pa.hardbreak = function (e, t, n) {
        return n.xhtmlOut
          ? `<br />
`
          : `<br>
`;
      }),
      (pa.softbreak = function (e, t, n) {
        return n.breaks
          ? n.xhtmlOut
            ? `<br />
`
            : `<br>
`
          : `
`;
      }),
      (pa.text = function (e, t) {
        return Ir(e[t].content);
      }),
      (pa.html_block = function (e, t) {
        return e[t].content;
      }),
      (pa.html_inline = function (e, t) {
        return e[t].content;
      }),
      (ma = class {
        constructor() {
          $(this, `rules`, Object.assign({}, pa));
        }
        renderAttrs(e) {
          let t, n, r;
          if (!e.attrs) return ``;
          for (r = ``, t = 0, n = e.attrs.length; t < n; t++)
            r += ` ${Ir(e.attrs[t][0])}="${Ir(String(e.attrs[t][1]))}"`;
          return r;
        }
        renderToken(e, t, n) {
          let r = e[t],
            i = ``;
          if (r.hidden) return ``;
          let a = t - 1;
          for (; a >= 0 && e[a].hidden && e[a].nesting === 0;) a--;
          (r.block &&
            r.nesting !== -1 &&
            a >= 0 &&
            e[a].hidden &&
            e[a].nesting === -1 &&
            (i += `
`),
            (i += (r.nesting === -1 ? `</` : `<`) + r.tag),
            (i += this.renderAttrs(r)),
            r.nesting === 0 && n.xhtmlOut && (i += ` /`));
          let o = !1;
          if (r.block && ((o = !0), r.nesting === 1)) {
            let n = t + 1;
            for (; n < e.length && e[n].hidden && e[n].nesting === 0;) n++;
            if (n < e.length) {
              let t = e[n];
              (t.type === `inline` || t.hidden || (t.nesting === -1 && t.tag === r.tag)) &&
                (o = !1);
            }
          }
          return (
            (i += o
              ? `>
`
              : `>`),
            i
          );
        }
        renderInline(e, t, n) {
          let r = ``,
            i = this.rules;
          for (let a = 0, o = e.length; a < o; a++) {
            let o = e[a].type;
            i[o] === void 0 ? (r += this.renderToken(e, a, t)) : (r += i[o](e, a, t, n, this));
          }
          return r;
        }
        renderInlineAsText(e, t, n) {
          let r = ``;
          for (let i = 0, a = e.length; i < a; i++)
            switch (e[i].type) {
              case `text`:
              case `code_inline`:
                r += e[i].content;
                break;
              case `image`:
                r += this.renderInlineAsText(e[i].children, t, n);
                break;
              case `html_inline`:
              case `html_block`:
                r += e[i].content;
                break;
              case `softbreak`:
              case `hardbreak`:
                r += `
`;
            }
          return r;
        }
        render(e, t, n) {
          let r = ``,
            i = this.rules;
          for (let a = 0, o = e.length; a < o; a++) {
            let o = e[a].type;
            o === `inline`
              ? (r += this.renderInline(e[a].children, t, n))
              : i[o] === void 0
                ? (r += this.renderToken(e, a, t))
                : (r += i[o](e, a, t, n, this));
          }
          return r;
        }
      }),
      (ha = class {
        constructor(e, t, n) {
          ($(this, `tokens`, []),
            $(this, `inlineMode`, !1),
            $(this, `Token`, da),
            (this.src = e),
            (this.env = n),
            (this.md = t));
        }
      }),
      (ga = /\r\n?|\n/g),
      (_a = /\0/g),
      (va = /\+-|\.\.|\?\?\?\?|!!!!|,,|--/),
      (ya = /\((c|tm|r)\)/i),
      (ba = /\((c|tm|r)\)/gi),
      (xa = { c: `©`, r: `®`, tm: `™` }),
      (Sa = /['"]/),
      (Ca = /['"]/g),
      (wa = `’`),
      (Ta = [
        [`normalize`, Zr],
        [`block`, Qr],
        [`strip_references`, $r],
        [`inline`, ei],
        [`linkify`, ri],
        [`replacements`, si],
        [`smartquotes`, di],
        [`text_join`, pi],
      ]),
      (Ea = class {
        constructor() {
          ($(this, `ruler`, new fa()), $(this, `State`, ha));
          for (let e = 0; e < Ta.length; e++) this.ruler.push(Ta[e][0], Ta[e][1]);
        }
        process(e) {
          let t = this.ruler.getRules(``);
          for (let n = 0, r = t.length; n < r; n++) t[n](e);
        }
      }),
      (Da = class {
        constructor(e, t, n, r) {
          ($(this, `bMarks`, []),
            $(this, `eMarks`, []),
            $(this, `tShift`, []),
            $(this, `sCount`, []),
            $(this, `bsCount`, []),
            $(this, `blkIndent`, 0),
            $(this, `line`, 0),
            $(this, `lineMax`, 0),
            $(this, `tight`, !1),
            $(this, `listIndent`, -1),
            $(this, `parentType`, `root`),
            $(this, `level`, 0),
            $(this, `Token`, da),
            (this.src = e),
            (this.md = t),
            (this.env = n),
            (this.tokens = r));
          let i = this.src;
          for (let e = 0, t = 0, n = 0, r = 0, a = i.length, o = !1; t < a; t++) {
            let s = i.charCodeAt(t);
            if (!o) {
              if (Q(s)) {
                (n++, s === 9 ? (r += 4 - (r % 4)) : r++);
                continue;
              }
              o = !0;
            }
            (s === 10 || t === a - 1) &&
              (s !== 10 && t++,
              this.bMarks.push(e),
              this.eMarks.push(t),
              this.tShift.push(n),
              this.sCount.push(r),
              this.bsCount.push(0),
              (o = !1),
              (n = 0),
              (r = 0),
              (e = t + 1));
          }
          (this.bMarks.push(i.length),
            this.eMarks.push(i.length),
            this.tShift.push(0),
            this.sCount.push(0),
            this.bsCount.push(0),
            (this.lineMax = this.bMarks.length - 1));
        }
        push(e, t, n) {
          let r = new da(e, t, n);
          return (
            (r.block = !0),
            n < 0 && this.level--,
            (r.level = this.level),
            n > 0 && this.level++,
            this.tokens.push(r),
            r
          );
        }
        isEmpty(e) {
          return this.bMarks[e] + this.tShift[e] >= this.eMarks[e];
        }
        skipEmptyLines(e) {
          for (
            let t = this.lineMax;
            e < t && !(this.bMarks[e] + this.tShift[e] < this.eMarks[e]);
            e++
          );
          return e;
        }
        skipSpaces(e) {
          for (let t = this.src.length; e < t && Q(this.src.charCodeAt(e)); e++);
          return e;
        }
        skipSpacesBack(e, t) {
          if (e <= t) return e;
          for (; e > t;) if (!Q(this.src.charCodeAt(--e))) return e + 1;
          return e;
        }
        skipChars(e, t) {
          for (let n = this.src.length; e < n && this.src.charCodeAt(e) === t; e++);
          return e;
        }
        skipCharsBack(e, t, n) {
          if (e <= n) return e;
          for (; e > n;) if (t !== this.src.charCodeAt(--e)) return e + 1;
          return e;
        }
        getLines(e, t, n, r) {
          if (e >= t) return ``;
          let i = Array(t - e);
          for (let a = 0, o = e; o < t; o++, a++) {
            let e = 0,
              s = this.bMarks[o],
              c = s,
              l;
            for (l = o + 1 < t || r ? this.eMarks[o] + 1 : this.eMarks[o]; c < l && e < n;) {
              let t = this.src.charCodeAt(c);
              if (Q(t)) t === 9 ? (e += 4 - ((e + this.bsCount[o]) % 4)) : e++;
              else if (c - s < this.tShift[o]) e++;
              else break;
              c++;
            }
            e > n
              ? (i[a] = Array(e - n + 1).join(` `) + this.src.slice(c, l))
              : (i[a] = this.src.slice(c, l));
          }
          return i.join(``);
        }
      }),
      (Oa = 65536),
      (ka =
        `address.article.aside.base.basefont.blockquote.body.caption.center.col.colgroup.dd.details.dialog.dir.div.dl.dt.fieldset.figcaption.figure.footer.form.frame.frameset.h1.h2.h3.h4.h5.h6.head.header.hr.html.iframe.legend.li.link.main.menu.menuitem.nav.noframes.ol.optgroup.option.p.param.search.section.summary.table.tbody.td.tfoot.th.thead.title.tr.track.ul`.split(
          `.`,
        )),
      (Aa = `<[A-Za-z][A-Za-z0-9\\-]*(?:\\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\\s*=\\s*(?:[^"'=<>\`\\x00-\\x20]+|'[^']*'|"[^"]*"))?)*\\s*\\/?>`),
      (ja = `<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>`),
      (Ma = RegExp(
        `^(?:${Aa}|${ja}|<!---?>|<!--(?:[^-]|-[^-]|--[^>])*-->|<[?][\\s\\S]*?[?]>|<![A-Za-z][^>]*>|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>)`,
      )),
      (Na = RegExp(`^(?:${Aa}|${ja})`)),
      (Pa = [
        [/^<(script|pre|style|textarea)(?=(\s|>|$))/i, /<\/(script|pre|style|textarea)>/i, !0],
        [/^<!--/, /-->/, !0],
        [/^<\?/, /\?>/, !0],
        [/^<![A-Za-z]/, />/, !0],
        [/^<!\[CDATA\[/, /\]\]>/, !0],
        [RegExp(`^</?(${ka.join(`|`)})(?=(\\s|/?>|$))`, `i`), /^$/, !0],
        [RegExp(`${Na.source}\\s*$`), /^$/, !1],
      ]),
      (Fa = [
        [`table`, gi, [`paragraph`, `reference`]],
        [`code`, _i],
        [`fence`, vi, [`paragraph`, `reference`, `blockquote`, `list`]],
        [`blockquote`, yi, [`paragraph`, `reference`, `blockquote`, `list`]],
        [`hr`, bi, [`paragraph`, `reference`, `blockquote`, `list`]],
        [`list`, wi, [`paragraph`, `reference`, `blockquote`]],
        [`reference`, Ti],
        [`html_block`, Ei, [`paragraph`, `reference`, `blockquote`]],
        [`heading`, Di, [`paragraph`, `reference`, `blockquote`]],
        [`lheading`, Oi],
        [`paragraph`, ki],
      ]),
      (Ia = class {
        constructor() {
          ($(this, `ruler`, new fa()), $(this, `State`, Da));
          for (let e = 0; e < Fa.length; e++)
            this.ruler.push(Fa[e][0], Fa[e][1], { alt: (Fa[e][2] || []).slice() });
        }
        tokenize(e, t, n) {
          let r = this.ruler.getRules(``),
            i = r.length,
            a = e.md.options.maxNesting,
            o = t,
            s = !1;
          for (
            ;
            o < n && ((e.line = o = e.skipEmptyLines(o)), !(o >= n || e.sCount[o] < e.blkIndent));
          ) {
            if (e.level >= a) {
              e.line = n;
              break;
            }
            let t = e.line,
              c = !1;
            for (let a = 0; a < i; a++)
              if (((c = r[a](e, o, n, !1)), c)) {
                if (t >= e.line) throw Error(`block rule didn't increment state.line`);
                break;
              }
            if (!c) throw Error(`none of the block rules matched`);
            ((e.tight = !s),
              e.isEmpty(e.line - 1) && (s = !0),
              (o = e.line),
              o < n && e.isEmpty(o) && ((s = !0), o++, (e.line = o)));
          }
        }
        parse(e, t, n, r) {
          if (!e) return;
          let i = new this.State(e, t, n, r);
          this.tokenize(i, i.line, i.lineMax);
        }
      }),
      (La = class {
        constructor(e, t, n, r) {
          ($(this, `pos`, 0),
            $(this, `level`, 0),
            $(this, `pending`, ``),
            $(this, `pendingLevel`, 0),
            $(this, `cache`, {}),
            $(this, `backticks`, {}),
            $(this, `backticksScanned`, !1),
            $(this, `linkLevel`, 0),
            $(this, `delimiters`, []),
            $(this, `_prev_delimiters`, []),
            $(this, `Token`, da),
            (this.src = e),
            (this.env = n),
            (this.md = t),
            (this.tokens = r),
            (this.tokens_meta = Array(r.length)),
            (this.posMax = this.src.length));
        }
        pushPending() {
          let e = new da(`text`, ``, 0);
          return (
            (e.content = this.pending),
            (e.level = this.pendingLevel),
            this.tokens.push(e),
            (this.pending = ``),
            e
          );
        }
        push(e, t, n) {
          this.pending && this.pushPending();
          let r = new da(e, t, n),
            i;
          return (
            n < 0 && (this.level--, (this.delimiters = this._prev_delimiters.pop())),
            (r.level = this.level),
            n > 0 &&
              (this.level++,
              this._prev_delimiters.push(this.delimiters),
              (this.delimiters = []),
              (i = { delimiters: this.delimiters })),
            (this.pendingLevel = this.level),
            this.tokens.push(r),
            this.tokens_meta.push(i),
            r
          );
        }
        scanDelims(e, t) {
          let n = this.posMax,
            r = this.src.charCodeAt(e),
            i;
          if (e === 0) i = 32;
          else if (e === 1) ((i = this.src.charCodeAt(0)), (i & 63488) == 55296 && (i = 65533));
          else if (((i = this.src.charCodeAt(e - 1)), (i & 64512) == 56320)) {
            let t = this.src.charCodeAt(e - 2);
            i = (t & 64512) == 55296 ? 65536 + ((t - 55296) << 10) + (i - 56320) : 65533;
          } else (i & 64512) == 55296 && (i = 65533);
          let a = e;
          for (; a < n && this.src.charCodeAt(a) === r;) a++;
          let o = a - e,
            s = a < n ? this.src.charCodeAt(a) : 32;
          if ((s & 64512) == 55296) {
            let e = this.src.charCodeAt(a + 1);
            s = (e & 64512) == 56320 ? 65536 + ((s - 55296) << 10) + (e - 56320) : 65533;
          } else (s & 64512) == 56320 && (s = 65533);
          let c = Vr(i) || Br(i),
            l = Vr(s) || Br(s),
            u = Rr(i),
            d = Rr(s),
            f = !d && (!l || u || c),
            p = !u && (!c || d || l);
          return { can_open: f && (t || !p || c), can_close: p && (t || !f || l), length: o };
        }
      }),
      (Ra = /(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i),
      (za = []));
    for (let e = 0; e < 256; e++) za.push(0);
    (`\\!"#$%&'()*+,./:;<=>?@[]^_\`{|}~-`.split(``).forEach(function (e) {
      za[e.charCodeAt(0)] = 1;
    }),
      (Ba = { tokenize: Ii, postProcess: Ri }),
      (Va = { tokenize: zi, postProcess: Vi }),
      (Ha =
        /^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/),
      (Ua = /^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/),
      (Wa = /^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i),
      (Ga = /^&([a-z][a-z0-9]{1,31});/i),
      (Ka = [
        [`text`, ji],
        [`linkify`, Mi],
        [`newline`, Ni],
        [`escape`, Pi],
        [`backticks`, Fi],
        [`strikethrough`, Ba.tokenize],
        [`emphasis`, Va.tokenize],
        [`link`, Hi],
        [`image`, Ui],
        [`autolink`, Wi],
        [`html_inline`, Ji],
        [`entity`, Yi],
      ]),
      (qa = [
        [`balance_pairs`, Zi],
        [`strikethrough`, Ba.postProcess],
        [`emphasis`, Va.postProcess],
        [`fragments_join`, Qi],
      ]),
      (Ja = class {
        constructor() {
          ($(this, `ruler`, new fa()), $(this, `ruler2`, new fa()), $(this, `State`, La));
          for (let e = 0; e < Ka.length; e++) this.ruler.push(Ka[e][0], Ka[e][1]);
          for (let e = 0; e < qa.length; e++) this.ruler2.push(qa[e][0], qa[e][1]);
        }
        skipToken(e) {
          let t = e.pos,
            n = this.ruler.getRules(``),
            r = n.length,
            i = e.md.options.maxNesting,
            a = e.cache;
          if (a[t] !== void 0) {
            e.pos = a[t];
            return;
          }
          let o = !1;
          if (e.level < i) {
            for (let i = 0; i < r; i++)
              if ((e.level++, (o = n[i](e, !0)), e.level--, o)) {
                if (t >= e.pos) throw Error(`inline rule didn't increment state.pos`);
                break;
              }
          } else e.pos = e.posMax;
          (o || e.pos++, (a[t] = e.pos));
        }
        tokenize(e) {
          let t = this.ruler.getRules(``),
            n = t.length,
            r = e.posMax,
            i = e.md.options.maxNesting;
          for (; e.pos < r;) {
            let a = e.pos,
              o = !1;
            if (e.level < i) {
              for (let r = 0; r < n; r++)
                if (((o = t[r](e, !1)), o)) {
                  if (a >= e.pos) throw Error(`inline rule didn't increment state.pos`);
                  break;
                }
            }
            if (o) {
              if (e.pos >= r) break;
              continue;
            }
            e.pending += e.src[e.pos++];
          }
          e.pending && e.pushPending();
        }
        parse(e, t, n, r) {
          let i = new this.State(e, t, n, r);
          this.tokenize(i);
          let a = this.ruler2.getRules(``),
            o = a.length;
          for (let e = 0; e < o; e++) a[e](i);
        }
      }),
      (Ya = {
        default: {
          options: {
            html: !1,
            xhtmlOut: !1,
            breaks: !1,
            langPrefix: `language-`,
            linkify: !1,
            typographer: !1,
            quotes: `“”‘’`,
            highlight: null,
            maxNesting: 100,
          },
          components: { core: {}, block: {}, inline: {} },
        },
        zero: {
          options: {
            html: !1,
            xhtmlOut: !1,
            breaks: !1,
            langPrefix: `language-`,
            linkify: !1,
            typographer: !1,
            quotes: `“”‘’`,
            highlight: null,
            maxNesting: 20,
          },
          components: {
            core: { rules: [`normalize`, `block`, `strip_references`, `inline`, `text_join`] },
            block: { rules: [`paragraph`] },
            inline: { rules: [`text`], rules2: [`balance_pairs`, `fragments_join`] },
          },
        },
        commonmark: {
          options: {
            html: !0,
            xhtmlOut: !0,
            breaks: !1,
            langPrefix: `language-`,
            linkify: !1,
            typographer: !1,
            quotes: `“”‘’`,
            highlight: null,
            maxNesting: 20,
          },
          components: {
            core: { rules: [`normalize`, `block`, `strip_references`, `inline`, `text_join`] },
            block: {
              rules: [
                `blockquote`,
                `code`,
                `fence`,
                `heading`,
                `hr`,
                `html_block`,
                `lheading`,
                `list`,
                `reference`,
                `paragraph`,
              ],
            },
            inline: {
              rules: [
                `autolink`,
                `backticks`,
                `emphasis`,
                `entity`,
                `escape`,
                `html_inline`,
                `image`,
                `link`,
                `newline`,
                `text`,
              ],
              rules2: [`balance_pairs`, `emphasis`, `fragments_join`],
            },
          },
        },
      }),
      (Xa = /^(vbscript|javascript|file|data):/),
      (Za = /^data:image\/(gif|png|jpeg|webp);/),
      (Qa = [`http:`, `https:`, `mailto:`]),
      ($a = class {
        validateLink(e) {
          let t = e.trim().toLowerCase();
          return !Xa.test(t) || Za.test(t);
        }
        normalizeLink(e) {
          let t = $t(e, !0);
          if (t.hostname && (!t.protocol || Qa.indexOf(t.protocol) >= 0))
            try {
              t.hostname = Er.toASCII(t.hostname);
            } catch {}
          return q(Zt(t));
        }
        normalizeLinkText(e) {
          let t = $t(e, !0);
          if (t.hostname && (!t.protocol || Qa.indexOf(t.protocol) >= 0))
            try {
              t.hostname = Er.toUnicode(t.hostname);
            } catch {}
          return Gt(Zt(t), Gt.defaultChars + `%`);
        }
        constructor(...e) {
          ($(this, `inline`, new Ja()),
            $(this, `block`, new Ia()),
            $(this, `core`, new Ea()),
            $(this, `renderer`, new ma()),
            $(this, `linkify`, new Xn()),
            $(this, `utils`, ta),
            $(this, `helpers`, Object.assign({}, ua)));
          let [t, n] = e;
          typeof t == `string`
            ? (this.configure(t), n && this.set(n))
            : (this.configure(`default`), this.set(t || {}));
        }
        set(e) {
          return (Object.assign(this.options, e), this);
        }
        configure(e) {
          let t;
          if (typeof e == `string`) {
            let n = e;
            if (((t = Ya[n]), !t)) throw Error(`Wrong 'markdown-it' preset "${n}", check name`);
          } else t = e;
          if (!t) throw Error("Wrong `markdown-it` preset, can't be empty");
          t.options && (this.options = { ...t.options });
          let n = t.components;
          if (n) {
            [`core`, `block`, `inline`].forEach((e) => {
              let t = n[e]?.rules;
              t && this[e].ruler.enableOnly(t);
            });
            let e = n.inline?.rules2;
            e && this.inline.ruler2.enableOnly(e);
          }
          return this;
        }
        enable(e, t = !1) {
          let n = [];
          (Array.isArray(e) || (e = [e]),
            [`core`, `block`, `inline`].forEach((t) => {
              n = n.concat(this[t].ruler.enable(e, !0));
            }),
            (n = n.concat(this.inline.ruler2.enable(e, !0))));
          let r = e.filter((e) => n.indexOf(e) < 0);
          if (r.length && !t) throw Error(`MarkdownIt. Failed to enable unknown rule(s): ${r}`);
          return this;
        }
        disable(e, t = !1) {
          let n = [];
          (Array.isArray(e) || (e = [e]),
            [`core`, `block`, `inline`].forEach((t) => {
              n = n.concat(this[t].ruler.disable(e, !0));
            }),
            (n = n.concat(this.inline.ruler2.disable(e, !0))));
          let r = e.filter((e) => n.indexOf(e) < 0);
          if (r.length && !t) throw Error(`MarkdownIt. Failed to disable unknown rule(s): ${r}`);
          return this;
        }
        use(e, ...t) {
          return (e.apply(e, [this, ...t]), this);
        }
        parse(e, t) {
          if (typeof e != `string`) throw Error(`Input data should be a String`);
          let n = new this.core.State(e, this, t);
          return (this.core.process(n), n.tokens);
        }
        render(e, t = {}) {
          return this.renderer.render(this.parse(e, t), this.options, t);
        }
        parseInline(e, t) {
          let n = new this.core.State(e, this, t);
          return ((n.inlineMode = !0), this.core.process(n), n.tokens);
        }
        renderInline(e, t = {}) {
          return this.renderer.render(this.parseInline(e, t), this.options, t);
        }
      }),
      $($a, `Token`, da),
      $($a, `Ruler`, fa),
      $($a, `Renderer`, ma),
      $($a, `ParserCore`, Ea),
      $($a, `StateCore`, ha),
      $($a, `ParserBlock`, Ia),
      $($a, `StateBlock`, Da),
      $($a, `ParserInline`, Ja),
      $($a, `StateInline`, La),
      (eo = Or($a)));
  }))();
}
var no = r((e, t) => {
  var n = !0,
    r = !1,
    i = !1;
  t.exports = function (e, t) {
    (t && ((n = !t.enabled), (r = !!t.label), (i = !!t.labelAfter)),
      e.core.ruler.after(`inline`, `github-task-lists`, function (e) {
        for (var t = e.tokens, r = 2; r < t.length; r++)
          s(t, r) &&
            (c(t[r], e.Token),
            a(t[r - 2], `class`, `task-list-item` + (n ? `` : ` enabled`)),
            a(t[o(t, r - 2)], `class`, `contains-task-list`));
      }));
  };
  function a(e, t, n) {
    var r = e.attrIndex(t),
      i = [t, n];
    r < 0 ? e.attrPush(i) : (e.attrs[r] = i);
  }
  function o(e, t) {
    for (var n = e[t].level - 1, r = t - 1; r >= 0; r--) if (e[r].level === n) return r;
    return -1;
  }
  function s(e, t) {
    return p(e[t]) && m(e[t - 1]) && h(e[t - 2]) && g(e[t]);
  }
  function c(e, t) {
    if (
      (e.children.unshift(l(e, t)),
      (e.children[1].content = e.children[1].content.slice(3)),
      (e.content = e.content.slice(3)),
      r)
    ) {
      if (i) {
        e.children.pop();
        var n = `task-item-` + Math.ceil(Math.random() * 1e7 - 1e3);
        ((e.children[0].content = e.children[0].content.slice(0, -1) + ` id="` + n + `">`),
          e.children.push(f(e.content, n, t)));
      } else (e.children.unshift(u(t)), e.children.push(d(t)));
    }
  }
  function l(e, t) {
    var r = new t(`html_inline`, ``, 0),
      i = n ? ` disabled="" ` : ``;
    return (
      e.content.indexOf(`[ ] `) === 0
        ? (r.content = `<input class="task-list-item-checkbox"` + i + `type="checkbox">`)
        : (e.content.indexOf(`[x] `) === 0 || e.content.indexOf(`[X] `) === 0) &&
          (r.content =
            `<input class="task-list-item-checkbox" checked=""` + i + `type="checkbox">`),
      r
    );
  }
  function u(e) {
    var t = new e(`html_inline`, ``, 0);
    return ((t.content = `<label>`), t);
  }
  function d(e) {
    var t = new e(`html_inline`, ``, 0);
    return ((t.content = `</label>`), t);
  }
  function f(e, t, n) {
    var r = new n(`html_inline`, ``, 0);
    return (
      (r.content = `<label class="task-list-item-label" for="` + t + `">` + e + `</label>`),
      (r.attrs = [{ for: t }]),
      r
    );
  }
  function p(e) {
    return e.type === `inline`;
  }
  function m(e) {
    return e.type === `paragraph_open`;
  }
  function h(e) {
    return e.type === `list_item_open`;
  }
  function g(e) {
    return (
      e.content.indexOf(`[ ] `) === 0 ||
      e.content.indexOf(`[x] `) === 0 ||
      e.content.indexOf(`[X] `) === 0
    );
  }
});
export {
  Ge as A,
  ot as C,
  rt as D,
  Ye as E,
  ze as F,
  Ue as M,
  We as N,
  qe as O,
  Be as P,
  H as S,
  at as T,
  xt as _,
  Ht as a,
  ut as b,
  zt as c,
  Ot as d,
  Dt as f,
  Ct as g,
  wt as h,
  Ut as i,
  Ke as j,
  Je as k,
  jt as l,
  Tt as m,
  eo as n,
  Vt as o,
  Et as p,
  to as r,
  Bt as s,
  no as t,
  kt as u,
  bt as v,
  it as w,
  st as x,
  dt as y,
};
//# sourceMappingURL=markdown-runtime-DmZBdNxi.js.map
