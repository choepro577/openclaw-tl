import {
  As as p,
  Bs as ee,
  Fs as te,
  Gs as ne,
  Hs as re,
  Is as ie,
  Ks as ae,
  Ls as oe,
  Ms as se,
  Ns as ce,
  Ps as le,
  Rs as ue,
  Us as de,
  Vs as fe,
  Ws as pe,
  js as me,
  qs as he,
  zs as ge,
} from "./control-ui-boot-D1_QZILW.js";
import {
  Ao as n,
  Io as r,
  Mo as i,
  Oo as a,
  Po as o,
  _a as s,
  da as c,
  jo as l,
  sa as u,
} from "./control-ui-core-B5rJKETr.js";
import { o as d, t as f } from "./control-ui-core-k5VGv3wu.js";
import { fn as t } from "./control-ui-foundation-CUUNgsy7.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function _e(e, t, n) {
  let r = e[t];
  if (typeof r == `object` && r) {
    if (Array.isArray(r))
      for (let e = 0; e < r.length; e++) {
        let t = String(e),
          i = _e(r, t, n);
        i === void 0
          ? delete r[t]
          : Object.defineProperty(r, t, {
              value: i,
              writable: !0,
              enumerable: !0,
              configurable: !0,
            });
      }
    else
      for (let e in r) {
        let t = _e(r, e, n);
        t === void 0
          ? delete r[e]
          : Object.defineProperty(r, e, {
              value: t,
              writable: !0,
              enumerable: !0,
              configurable: !0,
            });
      }
  }
  return n.call(e, t, r);
}
function ve() {
  for (M = `default`, N = ``, Oe = !1, P = 1; ;) {
    F = m();
    let e = ke[M]();
    if (e) return e;
  }
}
function m() {
  if (we[Te]) return String.fromCodePoint(we.codePointAt(Te));
}
function h() {
  let e = m();
  return (
    e ===
    `
`
      ? (O++, (k = 0))
      : e
        ? (k += e.length)
        : k++,
    e && (Te += e.length),
    e
  );
}
function g(e, t) {
  return { type: e, value: t, line: O, column: k };
}
function _(e) {
  for (let t of e) {
    if (m() !== t) throw S(h());
    h();
  }
}
function v() {
  switch (m()) {
    case `b`:
      return (h(), `\b`);
    case `f`:
      return (h(), `\f`);
    case `n`:
      return (
        h(),
        `
`
      );
    case `r`:
      return (h(), `\r`);
    case `t`:
      return (h(), `	`);
    case `v`:
      return (h(), `\v`);
    case `0`:
      if ((h(), T.isDigit(m()))) throw S(h());
      return `\0`;
    case `x`:
      return (h(), ye());
    case `u`:
      return (h(), y());
    case `
`:
    case `\u2028`:
    case `\u2029`:
      return (h(), ``);
    case `\r`:
      return (
        h(),
        m() ===
          `
` && h(),
        ``
      );
    case `1`:
    case `2`:
    case `3`:
    case `4`:
    case `5`:
    case `6`:
    case `7`:
    case `8`:
    case `9`:
      throw S(h());
    case void 0:
      throw S(h());
  }
  return h();
}
function ye() {
  let e = ``,
    t = m();
  if (!T.isHexDigit(t) || ((e += h()), (t = m()), !T.isHexDigit(t))) throw S(h());
  return ((e += h()), String.fromCodePoint(parseInt(e, 16)));
}
function y() {
  let e = ``,
    t = 4;
  for (; t-- > 0;) {
    let t = m();
    if (!T.isHexDigit(t)) throw S(h());
    e += h();
  }
  return String.fromCodePoint(parseInt(e, 16));
}
function b() {
  let e;
  switch (A.type) {
    case `punctuator`:
      switch (A.value) {
        case `{`:
          e = {};
          break;
        case `[`:
          e = [];
      }
      break;
    case `null`:
    case `boolean`:
    case `numeric`:
    case `string`:
      e = A.value;
  }
  if (j === void 0) j = e;
  else {
    let t = D[D.length - 1];
    Array.isArray(t)
      ? t.push(e)
      : Object.defineProperty(t, Ee, { value: e, writable: !0, enumerable: !0, configurable: !0 });
  }
  if (typeof e == `object` && e)
    (D.push(e), (E = Array.isArray(e) ? `beforeArrayValue` : `beforePropertyName`));
  else {
    let e = D[D.length - 1];
    E = e == null ? `end` : Array.isArray(e) ? `afterArrayValue` : `afterPropertyValue`;
  }
}
function x() {
  D.pop();
  let e = D[D.length - 1];
  E = e == null ? `end` : Array.isArray(e) ? `afterArrayValue` : `afterPropertyValue`;
}
function S(e) {
  return w(
    e === void 0
      ? `JSON5: invalid end of input at ${O}:${k}`
      : `JSON5: invalid character '${Se(e)}' at ${O}:${k}`,
  );
}
function C() {
  return w(`JSON5: invalid end of input at ${O}:${k}`);
}
function be() {
  return ((k -= 5), w(`JSON5: invalid identifier character at ${O}:${k}`));
}
function xe(e) {
  console.warn(`JSON5: '${Se(e)}' in strings is not valid ECMAScript; consider escaping`);
}
function Se(e) {
  let t = {
    "'": `\\'`,
    '"': `\\"`,
    "\\": `\\\\`,
    "\b": `\\b`,
    "\f": `\\f`,
    "\n": `\\n`,
    "\r": `\\r`,
    "	": `\\t`,
    "\v": `\\v`,
    "\0": `\\0`,
    "\u2028": `\\u2028`,
    "\u2029": `\\u2029`,
  };
  if (t[e]) return t[e];
  if (e < ` `) {
    let t = e.charCodeAt(0).toString(16);
    return `\\x` + (`00` + t).substring(t.length);
  }
  return e;
}
function w(e) {
  let t = SyntaxError(e);
  return ((t.lineNumber = O), (t.columnNumber = k), t);
}
var Ce, T, we, E, D, Te, O, k, A, Ee, j, De, M, N, Oe, P, F, ke, Ae, je;
function Me() {
  return (Me = e(() => {
    ((Ce = {
      Space_Separator: /[\u1680\u2000-\u200A\u202F\u205F\u3000]/,
      ID_Start:
        /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE83\uDE86-\uDE89\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/,
      ID_Continue:
        /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF9\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDE00-\uDE3E\uDE47\uDE50-\uDE83\uDE86-\uDE99\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/,
    }),
      (T = {
        isSpaceSeparator(e) {
          return typeof e == `string` && Ce.Space_Separator.test(e);
        },
        isIdStartChar(e) {
          return (
            typeof e == `string` &&
            ((e >= `a` && e <= `z`) ||
              (e >= `A` && e <= `Z`) ||
              e === `$` ||
              e === `_` ||
              Ce.ID_Start.test(e))
          );
        },
        isIdContinueChar(e) {
          return (
            typeof e == `string` &&
            ((e >= `a` && e <= `z`) ||
              (e >= `A` && e <= `Z`) ||
              (e >= `0` && e <= `9`) ||
              e === `$` ||
              e === `_` ||
              e === `‌` ||
              e === `‍` ||
              Ce.ID_Continue.test(e))
          );
        },
        isDigit(e) {
          return typeof e == `string` && /[0-9]/.test(e);
        },
        isHexDigit(e) {
          return typeof e == `string` && /[0-9A-Fa-f]/.test(e);
        },
      }),
      (De = function (e, t) {
        ((we = String(e)),
          (E = `start`),
          (D = []),
          (Te = 0),
          (O = 1),
          (k = 0),
          (A = void 0),
          (Ee = void 0),
          (j = void 0));
        do ((A = ve()), Ae[E]());
        while (A.type !== `eof`);
        return typeof t == `function` ? _e({ "": j }, ``, t) : j;
      }),
      (ke = {
        default() {
          switch (F) {
            case `	`:
            case `\v`:
            case `\f`:
            case ` `:
            case `\xA0`:
            case `﻿`:
            case `
`:
            case `\r`:
            case `\u2028`:
            case `\u2029`:
              h();
              return;
            case `/`:
              (h(), (M = `comment`));
              return;
            case void 0:
              return (h(), g(`eof`));
          }
          if (T.isSpaceSeparator(F)) {
            h();
            return;
          }
          return ke[E]();
        },
        comment() {
          switch (F) {
            case `*`:
              (h(), (M = `multiLineComment`));
              return;
            case `/`:
              (h(), (M = `singleLineComment`));
              return;
          }
          throw S(h());
        },
        multiLineComment() {
          switch (F) {
            case `*`:
              (h(), (M = `multiLineCommentAsterisk`));
              return;
            case void 0:
              throw S(h());
          }
          h();
        },
        multiLineCommentAsterisk() {
          switch (F) {
            case `*`:
              h();
              return;
            case `/`:
              (h(), (M = `default`));
              return;
            case void 0:
              throw S(h());
          }
          (h(), (M = `multiLineComment`));
        },
        singleLineComment() {
          switch (F) {
            case `
`:
            case `\r`:
            case `\u2028`:
            case `\u2029`:
              (h(), (M = `default`));
              return;
            case void 0:
              return (h(), g(`eof`));
          }
          h();
        },
        value() {
          switch (F) {
            case `{`:
            case `[`:
              return g(`punctuator`, h());
            case `n`:
              return (h(), _(`ull`), g(`null`, null));
            case `t`:
              return (h(), _(`rue`), g(`boolean`, !0));
            case `f`:
              return (h(), _(`alse`), g(`boolean`, !1));
            case `-`:
            case `+`:
              (h() === `-` && (P = -1), (M = `sign`));
              return;
            case `.`:
              ((N = h()), (M = `decimalPointLeading`));
              return;
            case `0`:
              ((N = h()), (M = `zero`));
              return;
            case `1`:
            case `2`:
            case `3`:
            case `4`:
            case `5`:
            case `6`:
            case `7`:
            case `8`:
            case `9`:
              ((N = h()), (M = `decimalInteger`));
              return;
            case `I`:
              return (h(), _(`nfinity`), g(`numeric`, 1 / 0));
            case `N`:
              return (h(), _(`aN`), g(`numeric`, NaN));
            case `"`:
            case `'`:
              ((Oe = h() === `"`), (N = ``), (M = `string`));
              return;
          }
          throw S(h());
        },
        identifierNameStartEscape() {
          if (F !== `u`) throw S(h());
          h();
          let e = y();
          switch (e) {
            case `$`:
            case `_`:
              break;
            default:
              if (!T.isIdStartChar(e)) throw be();
          }
          ((N += e), (M = `identifierName`));
        },
        identifierName() {
          switch (F) {
            case `$`:
            case `_`:
            case `‌`:
            case `‍`:
              N += h();
              return;
            case `\\`:
              (h(), (M = `identifierNameEscape`));
              return;
          }
          if (T.isIdContinueChar(F)) {
            N += h();
            return;
          }
          return g(`identifier`, N);
        },
        identifierNameEscape() {
          if (F !== `u`) throw S(h());
          h();
          let e = y();
          switch (e) {
            case `$`:
            case `_`:
            case `‌`:
            case `‍`:
              break;
            default:
              if (!T.isIdContinueChar(e)) throw be();
          }
          ((N += e), (M = `identifierName`));
        },
        sign() {
          switch (F) {
            case `.`:
              ((N = h()), (M = `decimalPointLeading`));
              return;
            case `0`:
              ((N = h()), (M = `zero`));
              return;
            case `1`:
            case `2`:
            case `3`:
            case `4`:
            case `5`:
            case `6`:
            case `7`:
            case `8`:
            case `9`:
              ((N = h()), (M = `decimalInteger`));
              return;
            case `I`:
              return (h(), _(`nfinity`), g(`numeric`, P * (1 / 0)));
            case `N`:
              return (h(), _(`aN`), g(`numeric`, NaN));
          }
          throw S(h());
        },
        zero() {
          switch (F) {
            case `.`:
              ((N += h()), (M = `decimalPoint`));
              return;
            case `e`:
            case `E`:
              ((N += h()), (M = `decimalExponent`));
              return;
            case `x`:
            case `X`:
              ((N += h()), (M = `hexadecimal`));
              return;
          }
          return g(`numeric`, P * 0);
        },
        decimalInteger() {
          switch (F) {
            case `.`:
              ((N += h()), (M = `decimalPoint`));
              return;
            case `e`:
            case `E`:
              ((N += h()), (M = `decimalExponent`));
              return;
          }
          if (T.isDigit(F)) {
            N += h();
            return;
          }
          return g(`numeric`, P * Number(N));
        },
        decimalPointLeading() {
          if (T.isDigit(F)) {
            ((N += h()), (M = `decimalFraction`));
            return;
          }
          throw S(h());
        },
        decimalPoint() {
          switch (F) {
            case `e`:
            case `E`:
              ((N += h()), (M = `decimalExponent`));
              return;
          }
          if (T.isDigit(F)) {
            ((N += h()), (M = `decimalFraction`));
            return;
          }
          return g(`numeric`, P * Number(N));
        },
        decimalFraction() {
          switch (F) {
            case `e`:
            case `E`:
              ((N += h()), (M = `decimalExponent`));
              return;
          }
          if (T.isDigit(F)) {
            N += h();
            return;
          }
          return g(`numeric`, P * Number(N));
        },
        decimalExponent() {
          switch (F) {
            case `+`:
            case `-`:
              ((N += h()), (M = `decimalExponentSign`));
              return;
          }
          if (T.isDigit(F)) {
            ((N += h()), (M = `decimalExponentInteger`));
            return;
          }
          throw S(h());
        },
        decimalExponentSign() {
          if (T.isDigit(F)) {
            ((N += h()), (M = `decimalExponentInteger`));
            return;
          }
          throw S(h());
        },
        decimalExponentInteger() {
          if (T.isDigit(F)) {
            N += h();
            return;
          }
          return g(`numeric`, P * Number(N));
        },
        hexadecimal() {
          if (T.isHexDigit(F)) {
            ((N += h()), (M = `hexadecimalInteger`));
            return;
          }
          throw S(h());
        },
        hexadecimalInteger() {
          if (T.isHexDigit(F)) {
            N += h();
            return;
          }
          return g(`numeric`, P * Number(N));
        },
        string() {
          switch (F) {
            case `\\`:
              (h(), (N += v()));
              return;
            case `"`:
              if (Oe) return (h(), g(`string`, N));
              N += h();
              return;
            case `'`:
              if (!Oe) return (h(), g(`string`, N));
              N += h();
              return;
            case `
`:
            case `\r`:
              throw S(h());
            case `\u2028`:
            case `\u2029`:
              xe(F);
              break;
            case void 0:
              throw S(h());
          }
          N += h();
        },
        start() {
          switch (F) {
            case `{`:
            case `[`:
              return g(`punctuator`, h());
          }
          M = `value`;
        },
        beforePropertyName() {
          switch (F) {
            case `$`:
            case `_`:
              ((N = h()), (M = `identifierName`));
              return;
            case `\\`:
              (h(), (M = `identifierNameStartEscape`));
              return;
            case `}`:
              return g(`punctuator`, h());
            case `"`:
            case `'`:
              ((Oe = h() === `"`), (M = `string`));
              return;
          }
          if (T.isIdStartChar(F)) {
            ((N += h()), (M = `identifierName`));
            return;
          }
          throw S(h());
        },
        afterPropertyName() {
          if (F === `:`) return g(`punctuator`, h());
          throw S(h());
        },
        beforePropertyValue() {
          M = `value`;
        },
        afterPropertyValue() {
          switch (F) {
            case `,`:
            case `}`:
              return g(`punctuator`, h());
          }
          throw S(h());
        },
        beforeArrayValue() {
          if (F === `]`) return g(`punctuator`, h());
          M = `value`;
        },
        afterArrayValue() {
          switch (F) {
            case `,`:
            case `]`:
              return g(`punctuator`, h());
          }
          throw S(h());
        },
        end() {
          throw S(h());
        },
      }),
      (Ae = {
        start() {
          if (A.type === `eof`) throw C();
          b();
        },
        beforePropertyName() {
          switch (A.type) {
            case `identifier`:
            case `string`:
              ((Ee = A.value), (E = `afterPropertyName`));
              return;
            case `punctuator`:
              x();
              return;
            case `eof`:
              throw C();
          }
        },
        afterPropertyName() {
          if (A.type === `eof`) throw C();
          E = `beforePropertyValue`;
        },
        beforePropertyValue() {
          if (A.type === `eof`) throw C();
          b();
        },
        beforeArrayValue() {
          if (A.type === `eof`) throw C();
          if (A.type === `punctuator` && A.value === `]`) {
            x();
            return;
          }
          b();
        },
        afterPropertyValue() {
          if (A.type === `eof`) throw C();
          switch (A.value) {
            case `,`:
              E = `beforePropertyName`;
              return;
            case `}`:
              x();
          }
        },
        afterArrayValue() {
          if (A.type === `eof`) throw C();
          switch (A.value) {
            case `,`:
              E = `beforeArrayValue`;
              return;
            case `]`:
              x();
          }
        },
        end() {},
      }),
      (je = {
        parse: De,
        stringify: function (e, t, n) {
          let r = [],
            i = ``,
            a,
            o,
            s = ``,
            c;
          if (
            (typeof t == `object` &&
              t &&
              !Array.isArray(t) &&
              ((n = t.space), (c = t.quote), (t = t.replacer)),
            typeof t == `function`)
          )
            o = t;
          else if (Array.isArray(t)) {
            a = [];
            for (let e of t) {
              let t;
              (typeof e == `string`
                ? (t = e)
                : (typeof e == `number` || e instanceof String || e instanceof Number) &&
                  (t = String(e)),
                t !== void 0 && a.indexOf(t) < 0 && a.push(t));
            }
          }
          return (
            n instanceof Number ? (n = Number(n)) : n instanceof String && (n = String(n)),
            typeof n == `number`
              ? n > 0 && ((n = Math.min(10, Math.floor(n))), (s = `          `.substr(0, n)))
              : typeof n == `string` && (s = n.substr(0, 10)),
            l(``, { "": e })
          );
          function l(e, t) {
            let n = t[e];
            switch (
              (n != null &&
                (typeof n.toJSON5 == `function`
                  ? (n = n.toJSON5(e))
                  : typeof n.toJSON == `function` && (n = n.toJSON(e))),
              o && (n = o.call(t, e, n)),
              n instanceof Number
                ? (n = Number(n))
                : n instanceof String
                  ? (n = String(n))
                  : n instanceof Boolean && (n = n.valueOf()),
              n)
            ) {
              case null:
                return `null`;
              case !0:
                return `true`;
              case !1:
                return `false`;
            }
            if (typeof n == `string`) return u(n, !1);
            if (typeof n == `number`) return String(n);
            if (typeof n == `object`) return Array.isArray(n) ? p(n) : d(n);
          }
          function u(e) {
            let t = { "'": 0.1, '"': 0.2 },
              n = {
                "'": `\\'`,
                '"': `\\"`,
                "\\": `\\\\`,
                "\b": `\\b`,
                "\f": `\\f`,
                "\n": `\\n`,
                "\r": `\\r`,
                "	": `\\t`,
                "\v": `\\v`,
                "\0": `\\0`,
                "\u2028": `\\u2028`,
                "\u2029": `\\u2029`,
              },
              r = ``;
            for (let i = 0; i < e.length; i++) {
              let a = e[i];
              switch (a) {
                case `'`:
                case `"`:
                  (t[a]++, (r += a));
                  continue;
                case `\0`:
                  if (T.isDigit(e[i + 1])) {
                    r += `\\x00`;
                    continue;
                  }
              }
              if (n[a]) {
                r += n[a];
                continue;
              }
              if (a < ` `) {
                let e = a.charCodeAt(0).toString(16);
                r += `\\x` + (`00` + e).substring(e.length);
                continue;
              }
              r += a;
            }
            let i = c || Object.keys(t).reduce((e, n) => (t[e] < t[n] ? e : n));
            return ((r = r.replace(new RegExp(i, `g`), n[i])), i + r + i);
          }
          function d(e) {
            if (r.indexOf(e) >= 0) throw TypeError(`Converting circular structure to JSON5`);
            r.push(e);
            let t = i;
            i += s;
            let n = a || Object.keys(e),
              o = [];
            for (let t of n) {
              let n = l(t, e);
              if (n !== void 0) {
                let e = f(t) + `:`;
                (s !== `` && (e += ` `), (e += n), o.push(e));
              }
            }
            let c;
            if (o.length === 0) c = `{}`;
            else {
              let e;
              if (s === ``) ((e = o.join(`,`)), (c = `{` + e + `}`));
              else {
                let n =
                  `,
` + i;
                ((e = o.join(n)),
                  (c =
                    `{
` +
                    i +
                    e +
                    `,
` +
                    t +
                    `}`));
              }
            }
            return (r.pop(), (i = t), c);
          }
          function f(e) {
            if (e.length === 0) return u(e, !0);
            let t = String.fromCodePoint(e.codePointAt(0));
            if (!T.isIdStartChar(t)) return u(e, !0);
            for (let n = t.length; n < e.length; n++)
              if (!T.isIdContinueChar(String.fromCodePoint(e.codePointAt(n)))) return u(e, !0);
            return e;
          }
          function p(e) {
            if (r.indexOf(e) >= 0) throw TypeError(`Converting circular structure to JSON5`);
            r.push(e);
            let t = i;
            i += s;
            let n = [];
            for (let t = 0; t < e.length; t++) {
              let r = l(String(t), e);
              n.push(r === void 0 ? `null` : r);
            }
            let a;
            if (n.length === 0) a = `[]`;
            else if (s === ``) a = `[` + n.join(`,`) + `]`;
            else {
              let e =
                  `,
` + i,
                r = n.join(e);
              a =
                `[
` +
                i +
                r +
                `,
` +
                t +
                `]`;
            }
            return (r.pop(), (i = t), a);
          }
        },
      }));
  }))();
}
function I(e, t, n) {
  function r(n, r) {
    if (
      (n._zod ||
        Object.defineProperty(n, "_zod", {
          value: { def: r, constr: o, traits: new Set() },
          enumerable: !1,
        }),
      n._zod.traits.has(e))
    )
      return;
    (n._zod.traits.add(e), t(n, r));
    let i = o.prototype,
      a = Object.keys(i);
    for (let e = 0; e < a.length; e++) {
      let t = a[e];
      t in n || (n[t] = i[t].bind(n));
    }
  }
  let i = n?.Parent ?? Object;
  class a extends i {}
  Object.defineProperty(a, "name", { value: e });
  function o(e) {
    var t;
    let i = n?.Parent ? new a() : this;
    (r(i, e), (t = i._zod).deferred ?? (t.deferred = []));
    for (let e of i._zod.deferred) e();
    return i;
  }
  return (
    Object.defineProperty(o, "init", { value: r }),
    Object.defineProperty(o, Symbol.hasInstance, {
      value: (t) => (n?.Parent && t instanceof n.Parent ? !0 : t?._zod?.traits?.has(e)),
    }),
    Object.defineProperty(o, "name", { value: e }),
    o
  );
}
function L(e) {
  return (e && Object.assign(Ie, e), Ie);
}
var Ne, Pe, Fe, Ie;
function R() {
  return (R = e(() => {
    ((Pe = class extends Error {
      constructor() {
        super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
      }
    }),
      (Fe = class extends Error {
        constructor(e) {
          (super(`Encountered unidirectional transform during encode: ${e}`),
            (this.name = `ZodEncodeError`));
        }
      }),
      (Ne = globalThis).__zod_globalConfig ?? (Ne.__zod_globalConfig = {}),
      (Ie = globalThis.__zod_globalConfig));
  }))();
}
function Le(e) {
  let t = Object.values(e).filter((e) => typeof e == `number`);
  return Object.entries(e)
    .filter(([e, n]) => t.indexOf(+e) === -1)
    .map(([e, t]) => t);
}
function Re(e, t) {
  return typeof t == `bigint` ? t.toString() : t;
}
function ze(e) {
  return {
    get value() {
      {
        let t = e();
        return (Object.defineProperty(this, "value", { value: t }), t);
      }
    },
  };
}
function Be(e) {
  return e == null;
}
function Ve(e) {
  let t = +!!e.startsWith(`^`),
    n = e.endsWith(`$`) ? e.length - 1 : e.length;
  return e.slice(t, n);
}
function He(e, t) {
  let n = e / t,
    r = Math.round(n),
    i = 2 ** -52 * Math.max(Math.abs(n), 1);
  return Math.abs(n - r) < i ? 0 : n - r;
}
function z(e, t, n) {
  let r;
  Object.defineProperty(e, t, {
    get() {
      if (r !== ft) return (r === void 0 && ((r = ft), (r = n())), r);
    },
    set(n) {
      Object.defineProperty(e, t, { value: n });
    },
    configurable: !0,
  });
}
function Ue(e, t, n) {
  Object.defineProperty(e, t, { value: n, writable: !0, enumerable: !0, configurable: !0 });
}
function We(...e) {
  let t = {};
  for (let n of e) {
    let e = Object.getOwnPropertyDescriptors(n);
    Object.assign(t, e);
  }
  return Object.defineProperties({}, t);
}
function Ge(e) {
  return JSON.stringify(e);
}
function Ke(e) {
  return e
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, ``)
    .replace(/[\s_-]+/g, `-`)
    .replace(/^-+|-+$/g, ``);
}
function qe(e) {
  return typeof e == `object` && !!e && !Array.isArray(e);
}
function Je(e) {
  if (qe(e) === !1) return !1;
  let t = e.constructor;
  if (t === void 0 || typeof t != `function`) return !0;
  let n = t.prototype;
  return qe(n) !== !1 && Object.prototype.hasOwnProperty.call(n, `isPrototypeOf`) !== !1;
}
function Ye(e) {
  return Je(e)
    ? { ...e }
    : Array.isArray(e)
      ? [...e]
      : e instanceof Map
        ? new Map(e)
        : e instanceof Set
          ? new Set(e)
          : e;
}
function Xe(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
}
function Ze(e, t, n) {
  let r = new e._zod.constr(t ?? e._zod.def);
  return ((!t || n?.parent) && (r._zod.parent = e), r);
}
function B(e) {
  let t = e;
  if (!t) return {};
  if (typeof t == `string`) return { error: () => t };
  if (t?.message !== void 0) {
    if (t?.error !== void 0) throw Error("Cannot specify both `message` and `error` params");
    t.error = t.message;
  }
  return (delete t.message, typeof t.error == `string` ? { ...t, error: () => t.error } : t);
}
function Qe(e) {
  return Object.keys(e).filter(
    (t) => e[t]._zod.optin === `optional` && e[t]._zod.optout === `optional`,
  );
}
function $e(e, t) {
  let n = e._zod.def,
    r = n.checks;
  if (r && r.length > 0)
    throw Error(`.pick() cannot be used on object schemas containing refinements`);
  return Ze(
    e,
    We(e._zod.def, {
      get shape() {
        let e = {};
        for (let r in t) {
          if (!(r in n.shape)) throw Error(`Unrecognized key: "${r}"`);
          t[r] && (e[r] = n.shape[r]);
        }
        return (Ue(this, `shape`, e), e);
      },
      checks: [],
    }),
  );
}
function et(e, t) {
  let n = e._zod.def,
    r = n.checks;
  if (r && r.length > 0)
    throw Error(`.omit() cannot be used on object schemas containing refinements`);
  return Ze(
    e,
    We(e._zod.def, {
      get shape() {
        let r = { ...e._zod.def.shape };
        for (let e in t) {
          if (!(e in n.shape)) throw Error(`Unrecognized key: "${e}"`);
          t[e] && delete r[e];
        }
        return (Ue(this, `shape`, r), r);
      },
      checks: [],
    }),
  );
}
function tt(e, t) {
  if (!Je(t)) throw Error(`Invalid input to extend: expected a plain object`);
  let n = e._zod.def.checks;
  if (n && n.length > 0) {
    let n = e._zod.def.shape;
    for (let e in t)
      if (Object.getOwnPropertyDescriptor(n, e) !== void 0)
        throw Error(
          "Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.",
        );
  }
  return Ze(
    e,
    We(e._zod.def, {
      get shape() {
        let n = { ...e._zod.def.shape, ...t };
        return (Ue(this, `shape`, n), n);
      },
    }),
  );
}
function nt(e, t) {
  if (!Je(t)) throw Error(`Invalid input to safeExtend: expected a plain object`);
  return Ze(
    e,
    We(e._zod.def, {
      get shape() {
        let n = { ...e._zod.def.shape, ...t };
        return (Ue(this, `shape`, n), n);
      },
    }),
  );
}
function rt(e, t) {
  if (e._zod.def.checks?.length)
    throw Error(
      `.merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.`,
    );
  return Ze(
    e,
    We(e._zod.def, {
      get shape() {
        let n = { ...e._zod.def.shape, ...t._zod.def.shape };
        return (Ue(this, `shape`, n), n);
      },
      get catchall() {
        return t._zod.def.catchall;
      },
      checks: t._zod.def.checks ?? [],
    }),
  );
}
function it(e, t, n) {
  let r = t._zod.def.checks;
  if (r && r.length > 0)
    throw Error(`.partial() cannot be used on object schemas containing refinements`);
  return Ze(
    t,
    We(t._zod.def, {
      get shape() {
        let r = t._zod.def.shape,
          i = { ...r };
        if (n)
          for (let t in n) {
            if (!(t in r)) throw Error(`Unrecognized key: "${t}"`);
            n[t] && (i[t] = e ? new e({ type: `optional`, innerType: r[t] }) : r[t]);
          }
        else for (let t in r) i[t] = e ? new e({ type: `optional`, innerType: r[t] }) : r[t];
        return (Ue(this, `shape`, i), i);
      },
      checks: [],
    }),
  );
}
function at(e, t, n) {
  return Ze(
    t,
    We(t._zod.def, {
      get shape() {
        let r = t._zod.def.shape,
          i = { ...r };
        if (n)
          for (let t in n) {
            if (!(t in i)) throw Error(`Unrecognized key: "${t}"`);
            n[t] && (i[t] = new e({ type: `nonoptional`, innerType: r[t] }));
          }
        else for (let t in r) i[t] = new e({ type: `nonoptional`, innerType: r[t] });
        return (Ue(this, `shape`, i), i);
      },
    }),
  );
}
function ot(e, t = 0) {
  if (e.aborted === !0) return !0;
  for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue !== !0) return !0;
  return !1;
}
function st(e, t = 0) {
  if (e.aborted === !0) return !0;
  for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue === !1) return !0;
  return !1;
}
function ct(e, t) {
  return t.map((t) => {
    var n;
    return ((n = t).path ?? (n.path = []), t.path.unshift(e), t);
  });
}
function lt(e) {
  return typeof e == `string` ? e : e?.message;
}
function V(e, t, n) {
  let r = e.message
      ? e.message
      : (lt(e.inst?._zod.def?.error?.(e)) ??
        lt(t?.error?.(e)) ??
        lt(n.customError?.(e)) ??
        lt(n.localeError?.(e)) ??
        `Invalid input`),
    { inst: i, continue: a, input: o, ...s } = e;
  return ((s.path ??= []), (s.message = r), t?.reportInput && (s.input = o), s);
}
function ut(e) {
  return Array.isArray(e) ? `array` : typeof e == `string` ? `string` : `unknown`;
}
function dt(...e) {
  let [t, n, r] = e;
  return typeof t == `string` ? { message: t, code: `custom`, input: n, inst: r } : { ...t };
}
var ft, pt, mt, ht, gt;
function _t() {
  return (_t = e(() => {
    (R(),
      (ft = Symbol(`evaluating`)),
      (pt = `captureStackTrace` in Error ? Error.captureStackTrace : (...e) => {}),
      (mt = ze(() => {
        if (Ie.jitless || (typeof navigator < `u` && navigator?.userAgent?.includes(`Cloudflare`)))
          return !1;
        try {
          return (Function(``), !0);
        } catch {
          return !1;
        }
      })),
      (ht = new Set([`string`, `number`, `symbol`])),
      (gt = {
        safeint: [-(2 ** 53 - 1), 2 ** 53 - 1],
        int32: [-2147483648, 2147483647],
        uint32: [0, 4294967295],
        float32: [-34028234663852886e22, 34028234663852886e22],
        float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
      }));
  }))();
}
function vt(e, t = (e) => e.message) {
  let n = {},
    r = [];
  for (let i of e.issues)
    i.path.length > 0
      ? ((n[i.path[0]] = n[i.path[0]] || []), n[i.path[0]].push(t(i)))
      : r.push(t(i));
  return { formErrors: r, fieldErrors: n };
}
function yt(e, t = (e) => e.message) {
  let n = { _errors: [] },
    r = (e, i = []) => {
      for (let a of e.issues)
        if (a.code === `invalid_union` && a.errors.length)
          a.errors.map((e) => r({ issues: e }, [...i, ...a.path]));
        else if (a.code === `invalid_key`) r({ issues: a.issues }, [...i, ...a.path]);
        else if (a.code === `invalid_element`) r({ issues: a.issues }, [...i, ...a.path]);
        else {
          let e = [...i, ...a.path];
          if (e.length === 0) n._errors.push(t(a));
          else {
            let r = n,
              i = 0;
            for (; i < e.length;) {
              let n = e[i];
              (i === e.length - 1
                ? ((r[n] = r[n] || { _errors: [] }), r[n]._errors.push(t(a)))
                : (r[n] = r[n] || { _errors: [] }),
                (r = r[n]),
                i++);
            }
          }
        }
    };
  return (r(e), n);
}
var bt, xt, St;
function Ct() {
  return (Ct = e(() => {
    (R(),
      _t(),
      (bt = (e, t) => {
        ((e.name = `$ZodError`),
          Object.defineProperty(e, "_zod", { value: e._zod, enumerable: !1 }),
          Object.defineProperty(e, "issues", { value: t, enumerable: !1 }),
          (e.message = JSON.stringify(t, Re, 2)),
          Object.defineProperty(e, "toString", { value: () => e.message, enumerable: !1 }));
      }),
      (xt = I(`$ZodError`, bt)),
      (St = I(`$ZodError`, bt, { Parent: Error })));
  }))();
}
var wt, Tt, Et, Dt, Ot, kt, At, jt, Mt, Nt, Pt, Ft, It, Lt;
function Rt() {
  return (Rt = e(() => {
    (R(),
      Ct(),
      _t(),
      (wt = (e) => (t, n, r, i) => {
        let a = r ? { ...r, async: !1 } : { async: !1 },
          o = t._zod.run({ value: n, issues: [] }, a);
        if (o instanceof Promise) throw new Pe();
        if (o.issues.length) {
          let t = new (i?.Err ?? e)(o.issues.map((e) => V(e, a, L())));
          throw (pt(t, i?.callee), t);
        }
        return o.value;
      }),
      (Tt = (e) => async (t, n, r, i) => {
        let a = r ? { ...r, async: !0 } : { async: !0 },
          o = t._zod.run({ value: n, issues: [] }, a);
        if ((o instanceof Promise && (o = await o), o.issues.length)) {
          let t = new (i?.Err ?? e)(o.issues.map((e) => V(e, a, L())));
          throw (pt(t, i?.callee), t);
        }
        return o.value;
      }),
      (Et = (e) => (t, n, r) => {
        let i = r ? { ...r, async: !1 } : { async: !1 },
          a = t._zod.run({ value: n, issues: [] }, i);
        if (a instanceof Promise) throw new Pe();
        return a.issues.length
          ? { success: !1, error: new (e ?? xt)(a.issues.map((e) => V(e, i, L()))) }
          : { success: !0, data: a.value };
      }),
      (Dt = Et(St)),
      (Ot = (e) => async (t, n, r) => {
        let i = r ? { ...r, async: !0 } : { async: !0 },
          a = t._zod.run({ value: n, issues: [] }, i);
        return (
          a instanceof Promise && (a = await a),
          a.issues.length
            ? { success: !1, error: new e(a.issues.map((e) => V(e, i, L()))) }
            : { success: !0, data: a.value }
        );
      }),
      (kt = Ot(St)),
      (At = (e) => (t, n, r) => {
        let i = r ? { ...r, direction: `backward` } : { direction: `backward` };
        return wt(e)(t, n, i);
      }),
      (jt = (e) => (t, n, r) => wt(e)(t, n, r)),
      (Mt = (e) => async (t, n, r) => {
        let i = r ? { ...r, direction: `backward` } : { direction: `backward` };
        return Tt(e)(t, n, i);
      }),
      (Nt = (e) => async (t, n, r) => Tt(e)(t, n, r)),
      (Pt = (e) => (t, n, r) => {
        let i = r ? { ...r, direction: `backward` } : { direction: `backward` };
        return Et(e)(t, n, i);
      }),
      (Ft = (e) => (t, n, r) => Et(e)(t, n, r)),
      (It = (e) => async (t, n, r) => {
        let i = r ? { ...r, direction: `backward` } : { direction: `backward` };
        return Ot(e)(t, n, i);
      }),
      (Lt = (e) => async (t, n, r) => Ot(e)(t, n, r)));
  }))();
}
function zt() {
  return new RegExp($t, `u`);
}
function Bt(e) {
  let t = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  return typeof e.precision == `number`
    ? e.precision === -1
      ? `${t}`
      : e.precision === 0
        ? `${t}:[0-5]\\d`
        : `${t}:[0-5]\\d\\.\\d{${e.precision}}`
    : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function Vt(e) {
  return RegExp(`^${Bt(e)}$`);
}
function Ht(e) {
  let t = Bt({ precision: e.precision }),
    n = [`Z`];
  (e.local && n.push(``), e.offset && n.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`));
  let r = `${t}(?:${n.join(`|`)})`;
  return RegExp(`^${ln}T(?:${r})$`);
}
var Ut,
  Wt,
  Gt,
  Kt,
  qt,
  Jt,
  Yt,
  Xt,
  Zt,
  Qt,
  $t,
  en,
  tn,
  nn,
  rn,
  an,
  on,
  sn,
  cn,
  ln,
  un,
  dn,
  fn,
  pn,
  mn,
  hn,
  gn,
  _n,
  vn;
function yn() {
  return (yn = e(() => {
    ((Ut = /^[cC][0-9a-z]{6,}$/),
      (Wt = /^[0-9a-z]+$/),
      (Gt = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/),
      (Kt = /^[0-9a-vA-V]{20}$/),
      (qt = /^[A-Za-z0-9]{27}$/),
      (Jt = /^[a-zA-Z0-9_-]{21}$/),
      (Yt =
        /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/),
      (Xt = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/),
      (Zt = (e) =>
        e
          ? RegExp(
              `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`,
            )
          : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/),
      (Qt =
        /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/),
      ($t = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`),
      (en =
        /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/),
      (tn =
        /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/),
      (nn =
        /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/),
      (rn =
        /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/),
      (an = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/),
      (on = /^[A-Za-z0-9_-]*$/),
      (sn = /^https?$/),
      (cn = /^\+[1-9]\d{6,14}$/),
      (ln = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`),
      (un = RegExp(`^${ln}$`)),
      (dn = (e) => {
        let t = e ? `[\\s\\S]{${e?.minimum ?? 0},${e?.maximum ?? ``}}` : `[\\s\\S]*`;
        return RegExp(`^${t}$`);
      }),
      (fn = /^-?\d+$/),
      (pn = /^-?\d+(?:\.\d+)?$/),
      (mn = /^(?:true|false)$/i),
      (hn = /^null$/i),
      (gn = /^undefined$/i),
      (_n = /^[^A-Z]*$/),
      (vn = /^[^a-z]*$/));
  }))();
}
var H, bn, xn, Sn, Cn, wn, Tn, En, Dn, On, kn, An, jn, Mn, Nn, Pn, Fn;
function In() {
  return (In = e(() => {
    (R(),
      yn(),
      _t(),
      (H = I(`$ZodCheck`, (e, t) => {
        var n;
        ((e._zod ??= {}), (e._zod.def = t), (n = e._zod).onattach ?? (n.onattach = []));
      })),
      (bn = { number: `number`, bigint: `bigint`, object: `date` }),
      (xn = I(`$ZodCheckLessThan`, (e, t) => {
        H.init(e, t);
        let n = bn[typeof t.value];
        (e._zod.onattach.push((e) => {
          let n = e._zod.bag,
            r = (t.inclusive ? n.maximum : n.exclusiveMaximum) ?? 1 / 0;
          t.value < r && (t.inclusive ? (n.maximum = t.value) : (n.exclusiveMaximum = t.value));
        }),
          (e._zod.check = (r) => {
            (t.inclusive ? r.value <= t.value : r.value < t.value) ||
              r.issues.push({
                origin: n,
                code: `too_big`,
                maximum: typeof t.value == `object` ? t.value.getTime() : t.value,
                input: r.value,
                inclusive: t.inclusive,
                inst: e,
                continue: !t.abort,
              });
          }));
      })),
      (Sn = I(`$ZodCheckGreaterThan`, (e, t) => {
        H.init(e, t);
        let n = bn[typeof t.value];
        (e._zod.onattach.push((e) => {
          let n = e._zod.bag,
            r = (t.inclusive ? n.minimum : n.exclusiveMinimum) ?? -1 / 0;
          t.value > r && (t.inclusive ? (n.minimum = t.value) : (n.exclusiveMinimum = t.value));
        }),
          (e._zod.check = (r) => {
            (t.inclusive ? r.value >= t.value : r.value > t.value) ||
              r.issues.push({
                origin: n,
                code: `too_small`,
                minimum: typeof t.value == `object` ? t.value.getTime() : t.value,
                input: r.value,
                inclusive: t.inclusive,
                inst: e,
                continue: !t.abort,
              });
          }));
      })),
      (Cn = I(`$ZodCheckMultipleOf`, (e, t) => {
        (H.init(e, t),
          e._zod.onattach.push((e) => {
            var n;
            (n = e._zod.bag).multipleOf ?? (n.multipleOf = t.value);
          }),
          (e._zod.check = (n) => {
            if (typeof n.value != typeof t.value)
              throw Error(`Cannot mix number and bigint in multiple_of check.`);
            (typeof n.value == `bigint`
              ? n.value % t.value === BigInt(0)
              : He(n.value, t.value) === 0) ||
              n.issues.push({
                origin: typeof n.value,
                code: `not_multiple_of`,
                divisor: t.value,
                input: n.value,
                inst: e,
                continue: !t.abort,
              });
          }));
      })),
      (wn = I(`$ZodCheckNumberFormat`, (e, t) => {
        (H.init(e, t), (t.format = t.format || `float64`));
        let n = t.format?.includes(`int`),
          r = n ? `int` : `number`,
          [i, a] = gt[t.format];
        (e._zod.onattach.push((e) => {
          let r = e._zod.bag;
          ((r.format = t.format), (r.minimum = i), (r.maximum = a), n && (r.pattern = fn));
        }),
          (e._zod.check = (o) => {
            let s = o.value;
            if (n) {
              if (!Number.isInteger(s)) {
                o.issues.push({
                  expected: r,
                  format: t.format,
                  code: `invalid_type`,
                  continue: !1,
                  input: s,
                  inst: e,
                });
                return;
              }
              if (!Number.isSafeInteger(s)) {
                s > 0
                  ? o.issues.push({
                      input: s,
                      code: `too_big`,
                      maximum: 2 ** 53 - 1,
                      note: `Integers must be within the safe integer range.`,
                      inst: e,
                      origin: r,
                      inclusive: !0,
                      continue: !t.abort,
                    })
                  : o.issues.push({
                      input: s,
                      code: `too_small`,
                      minimum: -(2 ** 53 - 1),
                      note: `Integers must be within the safe integer range.`,
                      inst: e,
                      origin: r,
                      inclusive: !0,
                      continue: !t.abort,
                    });
                return;
              }
            }
            (s < i &&
              o.issues.push({
                origin: `number`,
                input: s,
                code: `too_small`,
                minimum: i,
                inclusive: !0,
                inst: e,
                continue: !t.abort,
              }),
              s > a &&
                o.issues.push({
                  origin: `number`,
                  input: s,
                  code: `too_big`,
                  maximum: a,
                  inclusive: !0,
                  inst: e,
                  continue: !t.abort,
                }));
          }));
      })),
      (Tn = I(`$ZodCheckMaxLength`, (e, t) => {
        var n;
        (H.init(e, t),
          (n = e._zod.def).when ??
            (n.when = (e) => {
              let t = e.value;
              return !Be(t) && t.length !== void 0;
            }),
          e._zod.onattach.push((e) => {
            let n = e._zod.bag.maximum ?? 1 / 0;
            t.maximum < n && (e._zod.bag.maximum = t.maximum);
          }),
          (e._zod.check = (n) => {
            let r = n.value;
            if (r.length <= t.maximum) return;
            let i = ut(r);
            n.issues.push({
              origin: i,
              code: `too_big`,
              maximum: t.maximum,
              inclusive: !0,
              input: r,
              inst: e,
              continue: !t.abort,
            });
          }));
      })),
      (En = I(`$ZodCheckMinLength`, (e, t) => {
        var n;
        (H.init(e, t),
          (n = e._zod.def).when ??
            (n.when = (e) => {
              let t = e.value;
              return !Be(t) && t.length !== void 0;
            }),
          e._zod.onattach.push((e) => {
            let n = e._zod.bag.minimum ?? -1 / 0;
            t.minimum > n && (e._zod.bag.minimum = t.minimum);
          }),
          (e._zod.check = (n) => {
            let r = n.value;
            if (r.length >= t.minimum) return;
            let i = ut(r);
            n.issues.push({
              origin: i,
              code: `too_small`,
              minimum: t.minimum,
              inclusive: !0,
              input: r,
              inst: e,
              continue: !t.abort,
            });
          }));
      })),
      (Dn = I(`$ZodCheckLengthEquals`, (e, t) => {
        var n;
        (H.init(e, t),
          (n = e._zod.def).when ??
            (n.when = (e) => {
              let t = e.value;
              return !Be(t) && t.length !== void 0;
            }),
          e._zod.onattach.push((e) => {
            let n = e._zod.bag;
            ((n.minimum = t.length), (n.maximum = t.length), (n.length = t.length));
          }),
          (e._zod.check = (n) => {
            let r = n.value,
              i = r.length;
            if (i === t.length) return;
            let a = ut(r),
              o = i > t.length;
            n.issues.push({
              origin: a,
              ...(o
                ? { code: `too_big`, maximum: t.length }
                : { code: `too_small`, minimum: t.length }),
              inclusive: !0,
              exact: !0,
              input: n.value,
              inst: e,
              continue: !t.abort,
            });
          }));
      })),
      (On = I(`$ZodCheckStringFormat`, (e, t) => {
        var n, r;
        (H.init(e, t),
          e._zod.onattach.push((e) => {
            let n = e._zod.bag;
            ((n.format = t.format),
              t.pattern && ((n.patterns ??= new Set()), n.patterns.add(t.pattern)));
          }),
          t.pattern
            ? ((n = e._zod).check ??
              (n.check = (n) => {
                ((t.pattern.lastIndex = 0),
                  !t.pattern.test(n.value) &&
                    n.issues.push({
                      origin: `string`,
                      code: `invalid_format`,
                      format: t.format,
                      input: n.value,
                      ...(t.pattern ? { pattern: t.pattern.toString() } : {}),
                      inst: e,
                      continue: !t.abort,
                    }));
              }))
            : ((r = e._zod).check ?? (r.check = () => {})));
      })),
      (kn = I(`$ZodCheckRegex`, (e, t) => {
        (On.init(e, t),
          (e._zod.check = (n) => {
            ((t.pattern.lastIndex = 0),
              !t.pattern.test(n.value) &&
                n.issues.push({
                  origin: `string`,
                  code: `invalid_format`,
                  format: `regex`,
                  input: n.value,
                  pattern: t.pattern.toString(),
                  inst: e,
                  continue: !t.abort,
                }));
          }));
      })),
      (An = I(`$ZodCheckLowerCase`, (e, t) => {
        ((t.pattern ??= _n), On.init(e, t));
      })),
      (jn = I(`$ZodCheckUpperCase`, (e, t) => {
        ((t.pattern ??= vn), On.init(e, t));
      })),
      (Mn = I(`$ZodCheckIncludes`, (e, t) => {
        H.init(e, t);
        let n = Xe(t.includes),
          r = new RegExp(typeof t.position == `number` ? `^.{${t.position}}${n}` : n);
        ((t.pattern = r),
          e._zod.onattach.push((e) => {
            let t = e._zod.bag;
            ((t.patterns ??= new Set()), t.patterns.add(r));
          }),
          (e._zod.check = (n) => {
            n.value.includes(t.includes, t.position) ||
              n.issues.push({
                origin: `string`,
                code: `invalid_format`,
                format: `includes`,
                includes: t.includes,
                input: n.value,
                inst: e,
                continue: !t.abort,
              });
          }));
      })),
      (Nn = I(`$ZodCheckStartsWith`, (e, t) => {
        H.init(e, t);
        let n = RegExp(`^${Xe(t.prefix)}.*`);
        ((t.pattern ??= n),
          e._zod.onattach.push((e) => {
            let t = e._zod.bag;
            ((t.patterns ??= new Set()), t.patterns.add(n));
          }),
          (e._zod.check = (n) => {
            n.value.startsWith(t.prefix) ||
              n.issues.push({
                origin: `string`,
                code: `invalid_format`,
                format: `starts_with`,
                prefix: t.prefix,
                input: n.value,
                inst: e,
                continue: !t.abort,
              });
          }));
      })),
      (Pn = I(`$ZodCheckEndsWith`, (e, t) => {
        H.init(e, t);
        let n = RegExp(`.*${Xe(t.suffix)}$`);
        ((t.pattern ??= n),
          e._zod.onattach.push((e) => {
            let t = e._zod.bag;
            ((t.patterns ??= new Set()), t.patterns.add(n));
          }),
          (e._zod.check = (n) => {
            n.value.endsWith(t.suffix) ||
              n.issues.push({
                origin: `string`,
                code: `invalid_format`,
                format: `ends_with`,
                suffix: t.suffix,
                input: n.value,
                inst: e,
                continue: !t.abort,
              });
          }));
      })),
      (Fn = I(`$ZodCheckOverwrite`, (e, t) => {
        (H.init(e, t),
          (e._zod.check = (e) => {
            e.value = t.tx(e.value);
          }));
      })));
  }))();
}
var Ln;
function Rn() {
  return (Rn = e(() => {
    Ln = class {
      constructor(e = []) {
        ((this.content = []), (this.indent = 0), this && (this.args = e));
      }
      indented(e) {
        ((this.indent += 1), e(this), --this.indent);
      }
      write(e) {
        if (typeof e == `function`) {
          (e(this, { execution: `sync` }), e(this, { execution: `async` }));
          return;
        }
        let t = e
            .split(`
`)
            .filter((e) => e),
          n = Math.min(...t.map((e) => e.length - e.trimStart().length)),
          r = t.map((e) => e.slice(n)).map((e) => ` `.repeat(this.indent * 2) + e);
        for (let e of r) this.content.push(e);
      }
      compile() {
        let e = Function,
          t = this?.args,
          n = [...(this?.content ?? [``]).map((e) => `  ${e}`)];
        return new e(
          ...t,
          n.join(`
`),
        );
      }
    };
  }))();
}
var zn;
function Bn() {
  return (Bn = e(() => {
    zn = { major: 4, minor: 4, patch: 3 };
  }))();
}
function Vn(e) {
  if (e === ``) return !0;
  if (/\s/.test(e) || e.length % 4 != 0) return !1;
  try {
    return (atob(e), !0);
  } catch {
    return !1;
  }
}
function Hn(e) {
  if (!on.test(e)) return !1;
  let t = e.replace(/[-_]/g, (e) => (e === `-` ? `+` : `/`));
  return Vn(t.padEnd(Math.ceil(t.length / 4) * 4, `=`));
}
function Un(e, t = null) {
  try {
    let n = e.split(`.`);
    if (n.length !== 3) return !1;
    let [r] = n;
    if (!r) return !1;
    let i = JSON.parse(atob(r));
    return !((`typ` in i && i?.typ !== `JWT`) || !i.alg || (t && (!(`alg` in i) || i.alg !== t)));
  } catch {
    return !1;
  }
}
function Wn(e, t, n) {
  (e.issues.length && t.issues.push(...ct(n, e.issues)), (t.value[n] = e.value));
}
function Gn(e, t, n, r, i, a) {
  let o = n in r;
  if (e.issues.length) {
    if (i && a && !o) return;
    t.issues.push(...ct(n, e.issues));
  }
  if (!o && !i) {
    e.issues.length ||
      t.issues.push({ code: `invalid_type`, expected: `nonoptional`, input: void 0, path: [n] });
    return;
  }
  e.value === void 0 ? o && (t.value[n] = void 0) : (t.value[n] = e.value);
}
function Kn(e) {
  let t = Object.keys(e.shape);
  for (let n of t)
    if (!e.shape?.[n]?._zod?.traits?.has(`$ZodType`))
      throw Error(`Invalid element at key "${n}": expected a Zod schema`);
  let n = Qe(e.shape);
  return { ...e, keys: t, keySet: new Set(t), numKeys: t.length, optionalKeys: new Set(n) };
}
function qn(e, t, n, r, i, a) {
  let o = [],
    s = i.keySet,
    c = i.catchall._zod,
    l = c.def.type,
    u = c.optin === `optional`,
    d = c.optout === `optional`;
  for (let i in t) {
    if (i === `__proto__` || s.has(i)) continue;
    if (l === `never`) {
      o.push(i);
      continue;
    }
    let a = c.run({ value: t[i], issues: [] }, r);
    a instanceof Promise ? e.push(a.then((e) => Gn(e, n, i, t, u, d))) : Gn(a, n, i, t, u, d);
  }
  return (
    o.length && n.issues.push({ code: `unrecognized_keys`, keys: o, input: t, inst: a }),
    e.length ? Promise.all(e).then(() => n) : n
  );
}
function Jn(e, t, n, r) {
  for (let n of e) if (n.issues.length === 0) return ((t.value = n.value), t);
  let i = e.filter((e) => !ot(e));
  return i.length === 1
    ? ((t.value = i[0].value), i[0])
    : (t.issues.push({
        code: `invalid_union`,
        input: t.value,
        inst: n,
        errors: e.map((e) => e.issues.map((e) => V(e, r, L()))),
      }),
      t);
}
function Yn(e, t) {
  if (e === t || (e instanceof Date && t instanceof Date && +e == +t))
    return { valid: !0, data: e };
  if (Je(e) && Je(t)) {
    let n = Object.keys(t),
      r = Object.keys(e).filter((e) => n.indexOf(e) !== -1),
      i = { ...e, ...t };
    for (let n of r) {
      let r = Yn(e[n], t[n]);
      if (!r.valid) return { valid: !1, mergeErrorPath: [n, ...r.mergeErrorPath] };
      i[n] = r.data;
    }
    return { valid: !0, data: i };
  }
  if (Array.isArray(e) && Array.isArray(t)) {
    if (e.length !== t.length) return { valid: !1, mergeErrorPath: [] };
    let n = [];
    for (let r = 0; r < e.length; r++) {
      let i = e[r],
        a = t[r],
        o = Yn(i, a);
      if (!o.valid) return { valid: !1, mergeErrorPath: [r, ...o.mergeErrorPath] };
      n.push(o.data);
    }
    return { valid: !0, data: n };
  }
  return { valid: !1, mergeErrorPath: [] };
}
function Xn(e, t, n) {
  let r = new Map(),
    i;
  for (let n of t.issues)
    if (n.code === `unrecognized_keys`) {
      i ??= n;
      for (let e of n.keys) (r.has(e) || r.set(e, {}), (r.get(e).l = !0));
    } else e.issues.push(n);
  for (let t of n.issues)
    if (t.code === `unrecognized_keys`)
      for (let e of t.keys) (r.has(e) || r.set(e, {}), (r.get(e).r = !0));
    else e.issues.push(t);
  let a = [...r].filter(([, e]) => e.l && e.r).map(([e]) => e);
  if ((a.length && i && e.issues.push({ ...i, keys: a }), ot(e))) return e;
  let o = Yn(t.value, n.value);
  if (!o.valid)
    throw Error(`Unmergable intersection. Error path: ${JSON.stringify(o.mergeErrorPath)}`);
  return ((e.value = o.data), e);
}
function Zn(e, t) {
  return t === void 0 && (e.issues.length || e.fallback) ? { issues: [], value: void 0 } : e;
}
function Qn(e, t) {
  return (e.value === void 0 && (e.value = t.defaultValue), e);
}
function $n(e, t) {
  return (
    !e.issues.length &&
      e.value === void 0 &&
      e.issues.push({ code: `invalid_type`, expected: `nonoptional`, input: e.value, inst: t }),
    e
  );
}
function er(e, t, n) {
  return e.issues.length
    ? ((e.aborted = !0), e)
    : t._zod.run({ value: e.value, issues: e.issues, fallback: e.fallback }, n);
}
function tr(e) {
  return ((e.value = Object.freeze(e.value)), e);
}
function nr(e, t, n, r) {
  if (!e) {
    let e = {
      code: `custom`,
      input: n,
      inst: r,
      path: [...(r._zod.def.path ?? [])],
      continue: !r._zod.def.abort,
    };
    (r._zod.def.params && (e.params = r._zod.def.params), t.issues.push(dt(e)));
  }
}
var U,
  rr,
  W,
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
  Er,
  Dr,
  Or,
  kr,
  Ar,
  jr,
  Mr,
  Nr,
  Pr,
  Fr,
  Ir,
  Lr,
  Rr,
  zr,
  Br,
  Vr,
  Hr,
  Ur,
  Wr,
  Gr,
  Kr,
  qr,
  Jr,
  Yr,
  Xr,
  Zr,
  Qr,
  $r,
  ei,
  ti;
function ni() {
  return (ni = e(() => {
    (In(),
      R(),
      Rn(),
      Rt(),
      yn(),
      _t(),
      Bn(),
      (U = I(`$ZodType`, (e, t) => {
        var n;
        ((e ??= {}), (e._zod.def = t), (e._zod.bag = e._zod.bag || {}), (e._zod.version = zn));
        let r = [...(e._zod.def.checks ?? [])];
        e._zod.traits.has(`$ZodCheck`) && r.unshift(e);
        for (let t of r) for (let n of t._zod.onattach) n(e);
        if (r.length === 0)
          ((n = e._zod).deferred ?? (n.deferred = []),
            e._zod.deferred?.push(() => {
              e._zod.run = e._zod.parse;
            }));
        else {
          let t = (e, t, n) => {
              let r = ot(e),
                i;
              for (let a of t) {
                if (a._zod.def.when) {
                  if (st(e) || !a._zod.def.when(e)) continue;
                } else if (r) continue;
                let t = e.issues.length,
                  o = a._zod.check(e);
                if (o instanceof Promise && n?.async === !1) throw new Pe();
                if (i || o instanceof Promise)
                  i = (i ?? Promise.resolve()).then(async () => {
                    (await o, e.issues.length !== t && (r ||= ot(e, t)));
                  });
                else {
                  if (e.issues.length === t) continue;
                  r ||= ot(e, t);
                }
              }
              return i ? i.then(() => e) : e;
            },
            n = (n, i, a) => {
              if (ot(n)) return ((n.aborted = !0), n);
              let o = t(i, r, a);
              if (o instanceof Promise) {
                if (a.async === !1) throw new Pe();
                return o.then((t) => e._zod.parse(t, a));
              }
              return e._zod.parse(o, a);
            };
          e._zod.run = (i, a) => {
            if (a.skipChecks) return e._zod.parse(i, a);
            if (a.direction === `backward`) {
              let t = e._zod.parse({ value: i.value, issues: [] }, { ...a, skipChecks: !0 });
              return t instanceof Promise ? t.then((e) => n(e, i, a)) : n(t, i, a);
            }
            let o = e._zod.parse(i, a);
            if (o instanceof Promise) {
              if (a.async === !1) throw new Pe();
              return o.then((e) => t(e, r, a));
            }
            return t(o, r, a);
          };
        }
        z(e, `~standard`, () => ({
          validate: (t) => {
            try {
              let n = Dt(e, t);
              return n.success ? { value: n.data } : { issues: n.error?.issues };
            } catch {
              return kt(e, t).then((e) =>
                e.success ? { value: e.data } : { issues: e.error?.issues },
              );
            }
          },
          vendor: `zod`,
          version: 1,
        }));
      })),
      (rr = I(`$ZodString`, (e, t) => {
        (U.init(e, t),
          (e._zod.pattern = [...(e?._zod.bag?.patterns ?? [])].pop() ?? dn(e._zod.bag)),
          (e._zod.parse = (n, r) => {
            if (t.coerce)
              try {
                n.value = String(n.value);
              } catch {}
            return (
              typeof n.value == `string` ||
                n.issues.push({
                  expected: `string`,
                  code: `invalid_type`,
                  input: n.value,
                  inst: e,
                }),
              n
            );
          }));
      })),
      (W = I(`$ZodStringFormat`, (e, t) => {
        (On.init(e, t), rr.init(e, t));
      })),
      (ir = I(`$ZodGUID`, (e, t) => {
        ((t.pattern ??= Xt), W.init(e, t));
      })),
      (ar = I(`$ZodUUID`, (e, t) => {
        if (t.version) {
          let e = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[t.version];
          if (e === void 0) throw Error(`Invalid UUID version: "${t.version}"`);
          t.pattern ??= Zt(e);
        } else t.pattern ??= Zt();
        W.init(e, t);
      })),
      (or = I(`$ZodEmail`, (e, t) => {
        ((t.pattern ??= Qt), W.init(e, t));
      })),
      (sr = I(`$ZodURL`, (e, t) => {
        (W.init(e, t),
          (e._zod.check = (n) => {
            try {
              let r = n.value.trim();
              if (!t.normalize && t.protocol?.source === sn.source && !/^https?:\/\//i.test(r)) {
                n.issues.push({
                  code: `invalid_format`,
                  format: `url`,
                  note: `Invalid URL format`,
                  input: n.value,
                  inst: e,
                  continue: !t.abort,
                });
                return;
              }
              let i = new URL(r);
              (t.hostname &&
                ((t.hostname.lastIndex = 0),
                t.hostname.test(i.hostname) ||
                  n.issues.push({
                    code: `invalid_format`,
                    format: `url`,
                    note: `Invalid hostname`,
                    pattern: t.hostname.source,
                    input: n.value,
                    inst: e,
                    continue: !t.abort,
                  })),
                t.protocol &&
                  ((t.protocol.lastIndex = 0),
                  t.protocol.test(
                    i.protocol.endsWith(`:`) ? i.protocol.slice(0, -1) : i.protocol,
                  ) ||
                    n.issues.push({
                      code: `invalid_format`,
                      format: `url`,
                      note: `Invalid protocol`,
                      pattern: t.protocol.source,
                      input: n.value,
                      inst: e,
                      continue: !t.abort,
                    })),
                (n.value = t.normalize ? i.href : r));
              return;
            } catch {
              n.issues.push({
                code: `invalid_format`,
                format: `url`,
                input: n.value,
                inst: e,
                continue: !t.abort,
              });
            }
          }));
      })),
      (cr = I(`$ZodEmoji`, (e, t) => {
        ((t.pattern ??= zt()), W.init(e, t));
      })),
      (lr = I(`$ZodNanoID`, (e, t) => {
        ((t.pattern ??= Jt), W.init(e, t));
      })),
      (ur = I(`$ZodCUID`, (e, t) => {
        ((t.pattern ??= Ut), W.init(e, t));
      })),
      (dr = I(`$ZodCUID2`, (e, t) => {
        ((t.pattern ??= Wt), W.init(e, t));
      })),
      (fr = I(`$ZodULID`, (e, t) => {
        ((t.pattern ??= Gt), W.init(e, t));
      })),
      (pr = I(`$ZodXID`, (e, t) => {
        ((t.pattern ??= Kt), W.init(e, t));
      })),
      (mr = I(`$ZodKSUID`, (e, t) => {
        ((t.pattern ??= qt), W.init(e, t));
      })),
      (hr = I(`$ZodISODateTime`, (e, t) => {
        ((t.pattern ??= Ht(t)), W.init(e, t));
      })),
      (gr = I(`$ZodISODate`, (e, t) => {
        ((t.pattern ??= un), W.init(e, t));
      })),
      (_r = I(`$ZodISOTime`, (e, t) => {
        ((t.pattern ??= Vt(t)), W.init(e, t));
      })),
      (vr = I(`$ZodISODuration`, (e, t) => {
        ((t.pattern ??= Yt), W.init(e, t));
      })),
      (yr = I(`$ZodIPv4`, (e, t) => {
        ((t.pattern ??= en), W.init(e, t), (e._zod.bag.format = `ipv4`));
      })),
      (br = I(`$ZodIPv6`, (e, t) => {
        ((t.pattern ??= tn),
          W.init(e, t),
          (e._zod.bag.format = `ipv6`),
          (e._zod.check = (n) => {
            try {
              new URL(`http://[${n.value}]`);
            } catch {
              n.issues.push({
                code: `invalid_format`,
                format: `ipv6`,
                input: n.value,
                inst: e,
                continue: !t.abort,
              });
            }
          }));
      })),
      (xr = I(`$ZodCIDRv4`, (e, t) => {
        ((t.pattern ??= nn), W.init(e, t));
      })),
      (Sr = I(`$ZodCIDRv6`, (e, t) => {
        ((t.pattern ??= rn),
          W.init(e, t),
          (e._zod.check = (n) => {
            let r = n.value.split(`/`);
            try {
              if (r.length !== 2) throw Error();
              let [e, t] = r;
              if (!t) throw Error();
              let n = Number(t);
              if (`${n}` !== t || n < 0 || n > 128) throw Error();
              new URL(`http://[${e}]`);
            } catch {
              n.issues.push({
                code: `invalid_format`,
                format: `cidrv6`,
                input: n.value,
                inst: e,
                continue: !t.abort,
              });
            }
          }));
      })),
      (Cr = I(`$ZodBase64`, (e, t) => {
        ((t.pattern ??= an),
          W.init(e, t),
          (e._zod.bag.contentEncoding = `base64`),
          (e._zod.check = (n) => {
            Vn(n.value) ||
              n.issues.push({
                code: `invalid_format`,
                format: `base64`,
                input: n.value,
                inst: e,
                continue: !t.abort,
              });
          }));
      })),
      (wr = I(`$ZodBase64URL`, (e, t) => {
        ((t.pattern ??= on),
          W.init(e, t),
          (e._zod.bag.contentEncoding = `base64url`),
          (e._zod.check = (n) => {
            Hn(n.value) ||
              n.issues.push({
                code: `invalid_format`,
                format: `base64url`,
                input: n.value,
                inst: e,
                continue: !t.abort,
              });
          }));
      })),
      (Tr = I(`$ZodE164`, (e, t) => {
        ((t.pattern ??= cn), W.init(e, t));
      })),
      (Er = I(`$ZodJWT`, (e, t) => {
        (W.init(e, t),
          (e._zod.check = (n) => {
            Un(n.value, t.alg) ||
              n.issues.push({
                code: `invalid_format`,
                format: `jwt`,
                input: n.value,
                inst: e,
                continue: !t.abort,
              });
          }));
      })),
      (Dr = I(`$ZodNumber`, (e, t) => {
        (U.init(e, t),
          (e._zod.pattern = e._zod.bag.pattern ?? pn),
          (e._zod.parse = (n, r) => {
            if (t.coerce)
              try {
                n.value = Number(n.value);
              } catch {}
            let i = n.value;
            if (typeof i == `number` && !Number.isNaN(i) && Number.isFinite(i)) return n;
            let a =
              typeof i == `number`
                ? Number.isNaN(i)
                  ? `NaN`
                  : Number.isFinite(i)
                    ? void 0
                    : `Infinity`
                : void 0;
            return (
              n.issues.push({
                expected: `number`,
                code: `invalid_type`,
                input: i,
                inst: e,
                ...(a ? { received: a } : {}),
              }),
              n
            );
          }));
      })),
      (Or = I(`$ZodNumberFormat`, (e, t) => {
        (wn.init(e, t), Dr.init(e, t));
      })),
      (kr = I(`$ZodBoolean`, (e, t) => {
        (U.init(e, t),
          (e._zod.pattern = mn),
          (e._zod.parse = (n, r) => {
            if (t.coerce)
              try {
                n.value = !!n.value;
              } catch {}
            let i = n.value;
            return (
              typeof i == `boolean` ||
                n.issues.push({ expected: `boolean`, code: `invalid_type`, input: i, inst: e }),
              n
            );
          }));
      })),
      (Ar = I(`$ZodUndefined`, (e, t) => {
        (U.init(e, t),
          (e._zod.pattern = gn),
          (e._zod.values = new Set([void 0])),
          (e._zod.parse = (t, n) => {
            let r = t.value;
            return (
              r === void 0 ||
                t.issues.push({ expected: `undefined`, code: `invalid_type`, input: r, inst: e }),
              t
            );
          }));
      })),
      (jr = I(`$ZodNull`, (e, t) => {
        (U.init(e, t),
          (e._zod.pattern = hn),
          (e._zod.values = new Set([null])),
          (e._zod.parse = (t, n) => {
            let r = t.value;
            return (
              r === null ||
                t.issues.push({ expected: `null`, code: `invalid_type`, input: r, inst: e }),
              t
            );
          }));
      })),
      (Mr = I(`$ZodAny`, (e, t) => {
        (U.init(e, t), (e._zod.parse = (e) => e));
      })),
      (Nr = I(`$ZodUnknown`, (e, t) => {
        (U.init(e, t), (e._zod.parse = (e) => e));
      })),
      (Pr = I(`$ZodNever`, (e, t) => {
        (U.init(e, t),
          (e._zod.parse = (t, n) => (
            t.issues.push({ expected: `never`, code: `invalid_type`, input: t.value, inst: e }),
            t
          )));
      })),
      (Fr = I(`$ZodArray`, (e, t) => {
        (U.init(e, t),
          (e._zod.parse = (n, r) => {
            let i = n.value;
            if (!Array.isArray(i))
              return (
                n.issues.push({ expected: `array`, code: `invalid_type`, input: i, inst: e }), n
              );
            n.value = Array(i.length);
            let a = [];
            for (let e = 0; e < i.length; e++) {
              let o = i[e],
                s = t.element._zod.run({ value: o, issues: [] }, r);
              s instanceof Promise ? a.push(s.then((t) => Wn(t, n, e))) : Wn(s, n, e);
            }
            return a.length ? Promise.all(a).then(() => n) : n;
          }));
      })),
      (Ir = I(`$ZodObject`, (e, t) => {
        if ((U.init(e, t), !Object.getOwnPropertyDescriptor(t, `shape`)?.get)) {
          let e = t.shape;
          Object.defineProperty(t, "shape", {
            get: () => {
              let n = { ...e };
              return (Object.defineProperty(t, "shape", { value: n }), n);
            },
          });
        }
        let n = ze(() => Kn(t));
        z(e._zod, `propValues`, () => {
          let e = t.shape,
            n = {};
          for (let t in e) {
            let r = e[t]._zod;
            if (r.values) {
              n[t] ?? (n[t] = new Set());
              for (let e of r.values) n[t].add(e);
            }
          }
          return n;
        });
        let r = qe,
          i = t.catchall,
          a;
        e._zod.parse = (t, o) => {
          a ??= n.value;
          let s = t.value;
          if (!r(s))
            return (
              t.issues.push({ expected: `object`, code: `invalid_type`, input: s, inst: e }), t
            );
          t.value = {};
          let c = [],
            l = a.shape;
          for (let e of a.keys) {
            let n = l[e],
              r = n._zod.optin === `optional`,
              i = n._zod.optout === `optional`,
              a = n._zod.run({ value: s[e], issues: [] }, o);
            a instanceof Promise
              ? c.push(a.then((n) => Gn(n, t, e, s, r, i)))
              : Gn(a, t, e, s, r, i);
          }
          return i ? qn(c, s, t, o, n.value, e) : c.length ? Promise.all(c).then(() => t) : t;
        };
      })),
      (Lr = I(`$ZodObjectJIT`, (e, t) => {
        Ir.init(e, t);
        let n = e._zod.parse,
          r = ze(() => Kn(t)),
          i = (e) => {
            let t = new Ln([`shape`, `payload`, `ctx`]),
              n = r.value,
              i = (e) => {
                let t = Ge(e);
                return `shape[${t}]._zod.run({ value: input[${t}], issues: [] }, ctx)`;
              };
            t.write(`const input = payload.value;`);
            let a = Object.create(null),
              o = 0;
            for (let e of n.keys) a[e] = `key_${o++}`;
            t.write(`const newResult = {};`);
            for (let r of n.keys) {
              let n = a[r],
                o = Ge(r),
                s = e[r],
                c = s?._zod?.optin === `optional`,
                l = s?._zod?.optout === `optional`;
              (t.write(`const ${n} = ${i(r)};`),
                c && l
                  ? t.write(`
        if (${n}.issues.length) {
          if (${o} in input) {
            payload.issues = payload.issues.concat(${n}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${o}, ...iss.path] : [${o}]
            })));
          }
        }
        
        if (${n}.value === undefined) {
          if (${o} in input) {
            newResult[${o}] = undefined;
          }
        } else {
          newResult[${o}] = ${n}.value;
        }
        
      `)
                  : c
                    ? t.write(`
        if (${n}.issues.length) {
          payload.issues = payload.issues.concat(${n}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${o}, ...iss.path] : [${o}]
          })));
        }
        
        if (${n}.value === undefined) {
          if (${o} in input) {
            newResult[${o}] = undefined;
          }
        } else {
          newResult[${o}] = ${n}.value;
        }
        
      `)
                    : t.write(`
        const ${n}_present = ${o} in input;
        if (${n}.issues.length) {
          payload.issues = payload.issues.concat(${n}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${o}, ...iss.path] : [${o}]
          })));
        }
        if (!${n}_present && !${n}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${o}]
          });
        }

        if (${n}_present) {
          if (${n}.value === undefined) {
            newResult[${o}] = undefined;
          } else {
            newResult[${o}] = ${n}.value;
          }
        }

      `));
            }
            (t.write(`payload.value = newResult;`), t.write(`return payload;`));
            let s = t.compile();
            return (t, n) => s(e, t, n);
          },
          a,
          o = qe,
          s = !Ie.jitless,
          c = s && mt.value,
          l = t.catchall,
          u;
        e._zod.parse = (d, f) => {
          u ??= r.value;
          let p = d.value;
          return o(p)
            ? s && c && f?.async === !1 && f.jitless !== !0
              ? ((a ||= i(t.shape)), (d = a(d, f)), l ? qn([], p, d, f, u, e) : d)
              : n(d, f)
            : (d.issues.push({ expected: `object`, code: `invalid_type`, input: p, inst: e }), d);
        };
      })),
      (Rr = I(`$ZodUnion`, (e, t) => {
        (U.init(e, t),
          z(e._zod, `optin`, () =>
            t.options.some((e) => e._zod.optin === `optional`) ? `optional` : void 0,
          ),
          z(e._zod, `optout`, () =>
            t.options.some((e) => e._zod.optout === `optional`) ? `optional` : void 0,
          ),
          z(e._zod, `values`, () => {
            if (t.options.every((e) => e._zod.values))
              return new Set(t.options.flatMap((e) => Array.from(e._zod.values)));
          }),
          z(e._zod, `pattern`, () => {
            if (t.options.every((e) => e._zod.pattern)) {
              let e = t.options.map((e) => e._zod.pattern);
              return RegExp(`^(${e.map((e) => Ve(e.source)).join(`|`)})$`);
            }
          }));
        let n = t.options.length === 1 ? t.options[0]._zod.run : null;
        e._zod.parse = (r, i) => {
          if (n) return n(r, i);
          let a = !1,
            o = [];
          for (let e of t.options) {
            let t = e._zod.run({ value: r.value, issues: [] }, i);
            if (t instanceof Promise) (o.push(t), (a = !0));
            else {
              if (t.issues.length === 0) return t;
              o.push(t);
            }
          }
          return a ? Promise.all(o).then((t) => Jn(t, r, e, i)) : Jn(o, r, e, i);
        };
      })),
      (zr = I(`$ZodDiscriminatedUnion`, (e, t) => {
        ((t.inclusive = !1), Rr.init(e, t));
        let n = e._zod.parse;
        z(e._zod, `propValues`, () => {
          let e = {};
          for (let n of t.options) {
            let r = n._zod.propValues;
            if (!r || Object.keys(r).length === 0)
              throw Error(`Invalid discriminated union option at index "${t.options.indexOf(n)}"`);
            for (let [t, n] of Object.entries(r)) {
              e[t] || (e[t] = new Set());
              for (let r of n) e[t].add(r);
            }
          }
          return e;
        });
        let r = ze(() => {
          let e = t.options,
            n = new Map();
          for (let r of e) {
            let e = r._zod.propValues?.[t.discriminator];
            if (!e || e.size === 0)
              throw Error(`Invalid discriminated union option at index "${t.options.indexOf(r)}"`);
            for (let t of e) {
              if (n.has(t)) throw Error(`Duplicate discriminator value "${String(t)}"`);
              n.set(t, r);
            }
          }
          return n;
        });
        e._zod.parse = (i, a) => {
          let o = i.value;
          if (!qe(o))
            return (
              i.issues.push({ code: `invalid_type`, expected: `object`, input: o, inst: e }), i
            );
          let s = r.value.get(o?.[t.discriminator]);
          return s
            ? s._zod.run(i, a)
            : t.unionFallback || a.direction === `backward`
              ? n(i, a)
              : (i.issues.push({
                  code: `invalid_union`,
                  errors: [],
                  note: `No matching discriminator`,
                  discriminator: t.discriminator,
                  options: Array.from(r.value.keys()),
                  input: o,
                  path: [t.discriminator],
                  inst: e,
                }),
                i);
        };
      })),
      (Br = I(`$ZodIntersection`, (e, t) => {
        (U.init(e, t),
          (e._zod.parse = (e, n) => {
            let r = e.value,
              i = t.left._zod.run({ value: r, issues: [] }, n),
              a = t.right._zod.run({ value: r, issues: [] }, n);
            return i instanceof Promise || a instanceof Promise
              ? Promise.all([i, a]).then(([t, n]) => Xn(e, t, n))
              : Xn(e, i, a);
          }));
      })),
      (Vr = I(`$ZodRecord`, (e, t) => {
        (U.init(e, t),
          (e._zod.parse = (n, r) => {
            let i = n.value;
            if (!Je(i))
              return (
                n.issues.push({ expected: `record`, code: `invalid_type`, input: i, inst: e }), n
              );
            let a = [],
              o = t.keyType._zod.values;
            if (o) {
              n.value = {};
              let s = new Set();
              for (let c of o)
                if (typeof c == `string` || typeof c == `number` || typeof c == `symbol`) {
                  s.add(typeof c == `number` ? c.toString() : c);
                  let o = t.keyType._zod.run({ value: c, issues: [] }, r);
                  if (o instanceof Promise)
                    throw Error(`Async schemas not supported in object keys currently`);
                  if (o.issues.length) {
                    n.issues.push({
                      code: `invalid_key`,
                      origin: `record`,
                      issues: o.issues.map((e) => V(e, r, L())),
                      input: c,
                      path: [c],
                      inst: e,
                    });
                    continue;
                  }
                  let l = o.value,
                    u = t.valueType._zod.run({ value: i[c], issues: [] }, r);
                  u instanceof Promise
                    ? a.push(
                        u.then((e) => {
                          (e.issues.length && n.issues.push(...ct(c, e.issues)),
                            (n.value[l] = e.value));
                        }),
                      )
                    : (u.issues.length && n.issues.push(...ct(c, u.issues)),
                      (n.value[l] = u.value));
                }
              let c;
              for (let e in i) s.has(e) || ((c ??= []), c.push(e));
              c &&
                c.length > 0 &&
                n.issues.push({ code: `unrecognized_keys`, input: i, inst: e, keys: c });
            } else {
              n.value = {};
              for (let o of Reflect.ownKeys(i)) {
                if (o === `__proto__` || !Object.prototype.propertyIsEnumerable.call(i, o))
                  continue;
                let s = t.keyType._zod.run({ value: o, issues: [] }, r);
                if (s instanceof Promise)
                  throw Error(`Async schemas not supported in object keys currently`);
                if (typeof o == `string` && pn.test(o) && s.issues.length) {
                  let e = t.keyType._zod.run({ value: Number(o), issues: [] }, r);
                  if (e instanceof Promise)
                    throw Error(`Async schemas not supported in object keys currently`);
                  e.issues.length === 0 && (s = e);
                }
                if (s.issues.length) {
                  t.mode === `loose`
                    ? (n.value[o] = i[o])
                    : n.issues.push({
                        code: `invalid_key`,
                        origin: `record`,
                        issues: s.issues.map((e) => V(e, r, L())),
                        input: o,
                        path: [o],
                        inst: e,
                      });
                  continue;
                }
                let c = t.valueType._zod.run({ value: i[o], issues: [] }, r);
                c instanceof Promise
                  ? a.push(
                      c.then((e) => {
                        (e.issues.length && n.issues.push(...ct(o, e.issues)),
                          (n.value[s.value] = e.value));
                      }),
                    )
                  : (c.issues.length && n.issues.push(...ct(o, c.issues)),
                    (n.value[s.value] = c.value));
              }
            }
            return a.length ? Promise.all(a).then(() => n) : n;
          }));
      })),
      (Hr = I(`$ZodEnum`, (e, t) => {
        U.init(e, t);
        let n = Le(t.entries),
          r = new Set(n);
        ((e._zod.values = r),
          (e._zod.pattern = RegExp(
            `^(${n
              .filter((e) => ht.has(typeof e))
              .map((e) => (typeof e == `string` ? Xe(e) : e.toString()))
              .join(`|`)})$`,
          )),
          (e._zod.parse = (t, i) => {
            let a = t.value;
            return (
              r.has(a) || t.issues.push({ code: `invalid_value`, values: n, input: a, inst: e }), t
            );
          }));
      })),
      (Ur = I(`$ZodLiteral`, (e, t) => {
        if ((U.init(e, t), t.values.length === 0))
          throw Error(`Cannot create literal schema with no valid values`);
        let n = new Set(t.values);
        ((e._zod.values = n),
          (e._zod.pattern = RegExp(
            `^(${t.values.map((e) => (typeof e == `string` ? Xe(e) : e ? Xe(e.toString()) : String(e))).join(`|`)})$`,
          )),
          (e._zod.parse = (r, i) => {
            let a = r.value;
            return (
              n.has(a) ||
                r.issues.push({ code: `invalid_value`, values: t.values, input: a, inst: e }),
              r
            );
          }));
      })),
      (Wr = I(`$ZodTransform`, (e, t) => {
        (U.init(e, t),
          (e._zod.optin = `optional`),
          (e._zod.parse = (n, r) => {
            if (r.direction === `backward`) throw new Fe(e.constructor.name);
            let i = t.transform(n.value, n);
            if (r.async)
              return (i instanceof Promise ? i : Promise.resolve(i)).then(
                (e) => ((n.value = e), (n.fallback = !0), n),
              );
            if (i instanceof Promise) throw new Pe();
            return ((n.value = i), (n.fallback = !0), n);
          }));
      })),
      (Gr = I(`$ZodOptional`, (e, t) => {
        (U.init(e, t),
          (e._zod.optin = `optional`),
          (e._zod.optout = `optional`),
          z(e._zod, `values`, () =>
            t.innerType._zod.values ? new Set([...t.innerType._zod.values, void 0]) : void 0,
          ),
          z(e._zod, `pattern`, () => {
            let e = t.innerType._zod.pattern;
            return e ? RegExp(`^(${Ve(e.source)})?$`) : void 0;
          }),
          (e._zod.parse = (e, n) => {
            if (t.innerType._zod.optin === `optional`) {
              let r = e.value,
                i = t.innerType._zod.run(e, n);
              return i instanceof Promise ? i.then((e) => Zn(e, r)) : Zn(i, r);
            }
            return e.value === void 0 ? e : t.innerType._zod.run(e, n);
          }));
      })),
      (Kr = I(`$ZodExactOptional`, (e, t) => {
        (Gr.init(e, t),
          z(e._zod, `values`, () => t.innerType._zod.values),
          z(e._zod, `pattern`, () => t.innerType._zod.pattern),
          (e._zod.parse = (e, n) => t.innerType._zod.run(e, n)));
      })),
      (qr = I(`$ZodNullable`, (e, t) => {
        (U.init(e, t),
          z(e._zod, `optin`, () => t.innerType._zod.optin),
          z(e._zod, `optout`, () => t.innerType._zod.optout),
          z(e._zod, `pattern`, () => {
            let e = t.innerType._zod.pattern;
            return e ? RegExp(`^(${Ve(e.source)}|null)$`) : void 0;
          }),
          z(e._zod, `values`, () =>
            t.innerType._zod.values ? new Set([...t.innerType._zod.values, null]) : void 0,
          ),
          (e._zod.parse = (e, n) => (e.value === null ? e : t.innerType._zod.run(e, n))));
      })),
      (Jr = I(`$ZodDefault`, (e, t) => {
        (U.init(e, t),
          (e._zod.optin = `optional`),
          z(e._zod, `values`, () => t.innerType._zod.values),
          (e._zod.parse = (e, n) => {
            if (n.direction === `backward`) return t.innerType._zod.run(e, n);
            if (e.value === void 0) return ((e.value = t.defaultValue), e);
            let r = t.innerType._zod.run(e, n);
            return r instanceof Promise ? r.then((e) => Qn(e, t)) : Qn(r, t);
          }));
      })),
      (Yr = I(`$ZodPrefault`, (e, t) => {
        (U.init(e, t),
          (e._zod.optin = `optional`),
          z(e._zod, `values`, () => t.innerType._zod.values),
          (e._zod.parse = (e, n) => (
            n.direction === `backward` || (e.value === void 0 && (e.value = t.defaultValue)),
            t.innerType._zod.run(e, n)
          )));
      })),
      (Xr = I(`$ZodNonOptional`, (e, t) => {
        (U.init(e, t),
          z(e._zod, `values`, () => {
            let e = t.innerType._zod.values;
            return e ? new Set([...e].filter((e) => e !== void 0)) : void 0;
          }),
          (e._zod.parse = (n, r) => {
            let i = t.innerType._zod.run(n, r);
            return i instanceof Promise ? i.then((t) => $n(t, e)) : $n(i, e);
          }));
      })),
      (Zr = I(`$ZodCatch`, (e, t) => {
        (U.init(e, t),
          (e._zod.optin = `optional`),
          z(e._zod, `optout`, () => t.innerType._zod.optout),
          z(e._zod, `values`, () => t.innerType._zod.values),
          (e._zod.parse = (e, n) => {
            if (n.direction === `backward`) return t.innerType._zod.run(e, n);
            let r = t.innerType._zod.run(e, n);
            return r instanceof Promise
              ? r.then(
                  (r) => (
                    (e.value = r.value),
                    r.issues.length &&
                      ((e.value = t.catchValue({
                        ...e,
                        error: { issues: r.issues.map((e) => V(e, n, L())) },
                        input: e.value,
                      })),
                      (e.issues = []),
                      (e.fallback = !0)),
                    e
                  ),
                )
              : ((e.value = r.value),
                r.issues.length &&
                  ((e.value = t.catchValue({
                    ...e,
                    error: { issues: r.issues.map((e) => V(e, n, L())) },
                    input: e.value,
                  })),
                  (e.issues = []),
                  (e.fallback = !0)),
                e);
          }));
      })),
      (Qr = I(`$ZodPipe`, (e, t) => {
        (U.init(e, t),
          z(e._zod, `values`, () => t.in._zod.values),
          z(e._zod, `optin`, () => t.in._zod.optin),
          z(e._zod, `optout`, () => t.out._zod.optout),
          z(e._zod, `propValues`, () => t.in._zod.propValues),
          (e._zod.parse = (e, n) => {
            if (n.direction === `backward`) {
              let r = t.out._zod.run(e, n);
              return r instanceof Promise ? r.then((e) => er(e, t.in, n)) : er(r, t.in, n);
            }
            let r = t.in._zod.run(e, n);
            return r instanceof Promise ? r.then((e) => er(e, t.out, n)) : er(r, t.out, n);
          }));
      })),
      ($r = I(`$ZodPreprocess`, (e, t) => {
        Qr.init(e, t);
      })),
      (ei = I(`$ZodReadonly`, (e, t) => {
        (U.init(e, t),
          z(e._zod, `propValues`, () => t.innerType._zod.propValues),
          z(e._zod, `values`, () => t.innerType._zod.values),
          z(e._zod, `optin`, () => t.innerType?._zod?.optin),
          z(e._zod, `optout`, () => t.innerType?._zod?.optout),
          (e._zod.parse = (e, n) => {
            if (n.direction === `backward`) return t.innerType._zod.run(e, n);
            let r = t.innerType._zod.run(e, n);
            return r instanceof Promise ? r.then(tr) : tr(r);
          }));
      })),
      (ti = I(`$ZodCustom`, (e, t) => {
        (H.init(e, t),
          U.init(e, t),
          (e._zod.parse = (e, t) => e),
          (e._zod.check = (n) => {
            let r = n.value,
              i = t.fn(r);
            if (i instanceof Promise) return i.then((t) => nr(t, n, r, e));
            nr(i, n, r, e);
          }));
      })));
  }))();
}
function ri() {
  return new ai();
}
var ii, ai, oi;
function si() {
  return (si = e(() => {
    ((ai = class {
      constructor() {
        ((this._map = new WeakMap()), (this._idmap = new Map()));
      }
      add(e, ...t) {
        let n = t[0];
        return (
          this._map.set(e, n),
          n && typeof n == `object` && `id` in n && this._idmap.set(n.id, e),
          this
        );
      }
      clear() {
        return ((this._map = new WeakMap()), (this._idmap = new Map()), this);
      }
      remove(e) {
        let t = this._map.get(e);
        return (
          t && typeof t == `object` && `id` in t && this._idmap.delete(t.id),
          this._map.delete(e),
          this
        );
      }
      get(e) {
        let t = e._zod.parent;
        if (t) {
          let n = { ...(this.get(t) ?? {}) };
          delete n.id;
          let r = { ...n, ...this._map.get(e) };
          return Object.keys(r).length ? r : void 0;
        }
        return this._map.get(e);
      }
      has(e) {
        return this._map.has(e);
      }
    }),
      (ii = globalThis).__zod_globalRegistry ?? (ii.__zod_globalRegistry = ri()),
      (oi = globalThis.__zod_globalRegistry));
  }))();
}
function ci(e, t) {
  return new e({ type: `string`, ...B(t) });
}
function li(e, t) {
  return new e({ type: `string`, format: `email`, check: `string_format`, abort: !1, ...B(t) });
}
function ui(e, t) {
  return new e({ type: `string`, format: `guid`, check: `string_format`, abort: !1, ...B(t) });
}
function di(e, t) {
  return new e({ type: `string`, format: `uuid`, check: `string_format`, abort: !1, ...B(t) });
}
function fi(e, t) {
  return new e({
    type: `string`,
    format: `uuid`,
    check: `string_format`,
    abort: !1,
    version: `v4`,
    ...B(t),
  });
}
function pi(e, t) {
  return new e({
    type: `string`,
    format: `uuid`,
    check: `string_format`,
    abort: !1,
    version: `v6`,
    ...B(t),
  });
}
function mi(e, t) {
  return new e({
    type: `string`,
    format: `uuid`,
    check: `string_format`,
    abort: !1,
    version: `v7`,
    ...B(t),
  });
}
function hi(e, t) {
  return new e({ type: `string`, format: `url`, check: `string_format`, abort: !1, ...B(t) });
}
function gi(e, t) {
  return new e({ type: `string`, format: `emoji`, check: `string_format`, abort: !1, ...B(t) });
}
function _i(e, t) {
  return new e({ type: `string`, format: `nanoid`, check: `string_format`, abort: !1, ...B(t) });
}
function vi(e, t) {
  return new e({ type: `string`, format: `cuid`, check: `string_format`, abort: !1, ...B(t) });
}
function yi(e, t) {
  return new e({ type: `string`, format: `cuid2`, check: `string_format`, abort: !1, ...B(t) });
}
function bi(e, t) {
  return new e({ type: `string`, format: `ulid`, check: `string_format`, abort: !1, ...B(t) });
}
function xi(e, t) {
  return new e({ type: `string`, format: `xid`, check: `string_format`, abort: !1, ...B(t) });
}
function Si(e, t) {
  return new e({ type: `string`, format: `ksuid`, check: `string_format`, abort: !1, ...B(t) });
}
function Ci(e, t) {
  return new e({ type: `string`, format: `ipv4`, check: `string_format`, abort: !1, ...B(t) });
}
function wi(e, t) {
  return new e({ type: `string`, format: `ipv6`, check: `string_format`, abort: !1, ...B(t) });
}
function Ti(e, t) {
  return new e({ type: `string`, format: `cidrv4`, check: `string_format`, abort: !1, ...B(t) });
}
function Ei(e, t) {
  return new e({ type: `string`, format: `cidrv6`, check: `string_format`, abort: !1, ...B(t) });
}
function Di(e, t) {
  return new e({ type: `string`, format: `base64`, check: `string_format`, abort: !1, ...B(t) });
}
function Oi(e, t) {
  return new e({ type: `string`, format: `base64url`, check: `string_format`, abort: !1, ...B(t) });
}
function ki(e, t) {
  return new e({ type: `string`, format: `e164`, check: `string_format`, abort: !1, ...B(t) });
}
function Ai(e, t) {
  return new e({ type: `string`, format: `jwt`, check: `string_format`, abort: !1, ...B(t) });
}
function ji(e, t) {
  return new e({
    type: `string`,
    format: `datetime`,
    check: `string_format`,
    offset: !1,
    local: !1,
    precision: null,
    ...B(t),
  });
}
function Mi(e, t) {
  return new e({ type: `string`, format: `date`, check: `string_format`, ...B(t) });
}
function Ni(e, t) {
  return new e({
    type: `string`,
    format: `time`,
    check: `string_format`,
    precision: null,
    ...B(t),
  });
}
function Pi(e, t) {
  return new e({ type: `string`, format: `duration`, check: `string_format`, ...B(t) });
}
function Fi(e, t) {
  return new e({ type: `number`, checks: [], ...B(t) });
}
function Ii(e, t) {
  return new e({ type: `number`, check: `number_format`, abort: !1, format: `safeint`, ...B(t) });
}
function Li(e, t) {
  return new e({ type: `boolean`, ...B(t) });
}
function Ri(e, t) {
  return new e({ type: `undefined`, ...B(t) });
}
function zi(e, t) {
  return new e({ type: `null`, ...B(t) });
}
function Bi(e) {
  return new e({ type: `any` });
}
function Vi(e) {
  return new e({ type: `unknown` });
}
function Hi(e, t) {
  return new e({ type: `never`, ...B(t) });
}
function Ui(e, t) {
  return new xn({ check: `less_than`, ...B(t), value: e, inclusive: !1 });
}
function Wi(e, t) {
  return new xn({ check: `less_than`, ...B(t), value: e, inclusive: !0 });
}
function Gi(e, t) {
  return new Sn({ check: `greater_than`, ...B(t), value: e, inclusive: !1 });
}
function Ki(e, t) {
  return new Sn({ check: `greater_than`, ...B(t), value: e, inclusive: !0 });
}
function qi(e, t) {
  return new Cn({ check: `multiple_of`, ...B(t), value: e });
}
function Ji(e, t) {
  return new Tn({ check: `max_length`, ...B(t), maximum: e });
}
function Yi(e, t) {
  return new En({ check: `min_length`, ...B(t), minimum: e });
}
function Xi(e, t) {
  return new Dn({ check: `length_equals`, ...B(t), length: e });
}
function Zi(e, t) {
  return new kn({ check: `string_format`, format: `regex`, ...B(t), pattern: e });
}
function Qi(e) {
  return new An({ check: `string_format`, format: `lowercase`, ...B(e) });
}
function $i(e) {
  return new jn({ check: `string_format`, format: `uppercase`, ...B(e) });
}
function ea(e, t) {
  return new Mn({ check: `string_format`, format: `includes`, ...B(t), includes: e });
}
function ta(e, t) {
  return new Nn({ check: `string_format`, format: `starts_with`, ...B(t), prefix: e });
}
function na(e, t) {
  return new Pn({ check: `string_format`, format: `ends_with`, ...B(t), suffix: e });
}
function ra(e) {
  return new Fn({ check: `overwrite`, tx: e });
}
function ia(e) {
  return ra((t) => t.normalize(e));
}
function aa() {
  return ra((e) => e.trim());
}
function oa() {
  return ra((e) => e.toLowerCase());
}
function sa() {
  return ra((e) => e.toUpperCase());
}
function ca() {
  return ra((e) => Ke(e));
}
function la(e, t, n) {
  return new e({ type: `array`, element: t, ...B(n) });
}
function ua(e, t, n) {
  let r = B(n);
  return ((r.abort ??= !0), new e({ type: `custom`, check: `custom`, fn: t, ...r }));
}
function da(e, t, n) {
  return new e({ type: `custom`, check: `custom`, fn: t, ...B(n) });
}
function fa(e, t) {
  let n = pa(
    (t) => (
      (t.addIssue = (e) => {
        if (typeof e == `string`) t.issues.push(dt(e, t.value, n._zod.def));
        else {
          let r = e;
          (r.fatal && (r.continue = !1),
            (r.code ??= `custom`),
            (r.input ??= t.value),
            (r.inst ??= n),
            (r.continue ??= !n._zod.def.abort),
            t.issues.push(dt(r)));
        }
      }),
      e(t.value, t)
    ),
    t,
  );
  return n;
}
function pa(e, t) {
  let n = new H({ check: `custom`, ...B(t) });
  return ((n._zod.check = e), n);
}
function ma() {
  return (ma = e(() => {
    (In(), _t());
  }))();
}
function ha(e) {
  let t = e?.target ?? `draft-2020-12`;
  return (
    t === `draft-4` && (t = `draft-04`),
    t === `draft-7` && (t = `draft-07`),
    {
      processors: e.processors ?? {},
      metadataRegistry: e?.metadata ?? oi,
      target: t,
      unrepresentable: e?.unrepresentable ?? `throw`,
      override: e?.override ?? (() => {}),
      io: e?.io ?? `output`,
      counter: 0,
      seen: new Map(),
      cycles: e?.cycles ?? `ref`,
      reused: e?.reused ?? `inline`,
      external: e?.external ?? void 0,
    }
  );
}
function G(e, t, n = { path: [], schemaPath: [] }) {
  var r;
  let i = e._zod.def,
    a = t.seen.get(e);
  if (a) return (a.count++, n.schemaPath.includes(e) && (a.cycle = n.path), a.schema);
  let o = { schema: {}, count: 1, cycle: void 0, path: n.path };
  t.seen.set(e, o);
  let s = e._zod.toJSONSchema?.();
  if (s) o.schema = s;
  else {
    let r = { ...n, schemaPath: [...n.schemaPath, e], path: n.path };
    if (e._zod.processJSONSchema) e._zod.processJSONSchema(t, o.schema, r);
    else {
      let n = o.schema,
        a = t.processors[i.type];
      if (!a) throw Error(`[toJSONSchema]: Non-representable type encountered: ${i.type}`);
      a(e, t, n, r);
    }
    let a = e._zod.parent;
    a && ((o.ref ||= a), G(a, t, r), (t.seen.get(a).isParent = !0));
  }
  let c = t.metadataRegistry.get(e);
  return (
    c && Object.assign(o.schema, c),
    t.io === `input` && K(e) && (delete o.schema.examples, delete o.schema.default),
    t.io === `input` &&
      `_prefault` in o.schema &&
      ((r = o.schema).default ?? (r.default = o.schema._prefault)),
    delete o.schema._prefault,
    t.seen.get(e).schema
  );
}
function ga(e, t) {
  let n = e.seen.get(t);
  if (!n) throw Error(`Unprocessed schema. This is a bug in Zod.`);
  let r = new Map();
  for (let t of e.seen.entries()) {
    let n = e.metadataRegistry.get(t[0])?.id;
    if (n) {
      let e = r.get(n);
      if (e && e !== t[0])
        throw Error(
          `Duplicate schema id "${n}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`,
        );
      r.set(n, t[0]);
    }
  }
  let i = (t) => {
      let r = e.target === `draft-2020-12` ? `$defs` : `definitions`;
      if (e.external) {
        let n = e.external.registry.get(t[0])?.id,
          i = e.external.uri ?? ((e) => e);
        if (n) return { ref: i(n) };
        let a = t[1].defId ?? t[1].schema.id ?? `schema${e.counter++}`;
        return ((t[1].defId = a), { defId: a, ref: `${i(`__shared`)}#/${r}/${a}` });
      }
      if (t[1] === n) return { ref: `#` };
      let i = `#/${r}/`,
        a = t[1].schema.id ?? `__schema${e.counter++}`;
      return { defId: a, ref: i + a };
    },
    a = (e) => {
      if (e[1].schema.$ref) return;
      let t = e[1],
        { ref: n, defId: r } = i(e);
      ((t.def = { ...t.schema }), r && (t.defId = r));
      let a = t.schema;
      for (let e in a) delete a[e];
      a.$ref = n;
    };
  if (e.cycles === `throw`)
    for (let t of e.seen.entries()) {
      let e = t[1];
      if (e.cycle)
        throw Error(`Cycle detected: #/${e.cycle?.join(`/`)}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
    }
  for (let n of e.seen.entries()) {
    let r = n[1];
    if (t === n[0]) {
      a(n);
      continue;
    }
    if (e.external) {
      let r = e.external.registry.get(n[0])?.id;
      if (t !== n[0] && r) {
        a(n);
        continue;
      }
    }
    if (e.metadataRegistry.get(n[0])?.id) {
      a(n);
      continue;
    }
    if (r.cycle) {
      a(n);
      continue;
    }
    if (r.count > 1 && e.reused === `ref`) {
      a(n);
      continue;
    }
  }
}
function _a(e, t) {
  let n = e.seen.get(t);
  if (!n) throw Error(`Unprocessed schema. This is a bug in Zod.`);
  let r = (t) => {
    let n = e.seen.get(t);
    if (n.ref === null) return;
    let i = n.def ?? n.schema,
      a = { ...i },
      o = n.ref;
    if (((n.ref = null), o)) {
      r(o);
      let n = e.seen.get(o),
        s = n.schema;
      if (
        (s.$ref &&
        (e.target === `draft-07` || e.target === `draft-04` || e.target === `openapi-3.0`)
          ? ((i.allOf = i.allOf ?? []), i.allOf.push(s))
          : Object.assign(i, s),
        Object.assign(i, a),
        t._zod.parent === o)
      )
        for (let e in i) e !== `$ref` && e !== `allOf` && (e in a || delete i[e]);
      if (s.$ref && n.def)
        for (let e in i)
          e !== `$ref` &&
            e !== `allOf` &&
            e in n.def &&
            JSON.stringify(i[e]) === JSON.stringify(n.def[e]) &&
            delete i[e];
    }
    let s = t._zod.parent;
    if (s && s !== o) {
      r(s);
      let t = e.seen.get(s);
      if (t?.schema.$ref && ((i.$ref = t.schema.$ref), t.def))
        for (let e in i)
          e !== `$ref` &&
            e !== `allOf` &&
            e in t.def &&
            JSON.stringify(i[e]) === JSON.stringify(t.def[e]) &&
            delete i[e];
    }
    e.override({ zodSchema: t, jsonSchema: i, path: n.path ?? [] });
  };
  for (let t of [...e.seen.entries()].reverse()) r(t[0]);
  let i = {};
  if (
    (e.target === `draft-2020-12`
      ? (i.$schema = `https://json-schema.org/draft/2020-12/schema`)
      : e.target === `draft-07`
        ? (i.$schema = `http://json-schema.org/draft-07/schema#`)
        : e.target === `draft-04`
          ? (i.$schema = `http://json-schema.org/draft-04/schema#`)
          : e.target,
    e.external?.uri)
  ) {
    let n = e.external.registry.get(t)?.id;
    if (!n) throw Error("Schema is missing an `id` property");
    i.$id = e.external.uri(n);
  }
  Object.assign(i, n.def ?? n.schema);
  let a = e.metadataRegistry.get(t)?.id;
  a !== void 0 && i.id === a && delete i.id;
  let o = e.external?.defs ?? {};
  for (let t of e.seen.entries()) {
    let e = t[1];
    e.def && e.defId && (e.def.id === e.defId && delete e.def.id, (o[e.defId] = e.def));
  }
  e.external ||
    (Object.keys(o).length > 0 &&
      (e.target === `draft-2020-12` ? (i.$defs = o) : (i.definitions = o)));
  try {
    let n = JSON.parse(JSON.stringify(i));
    return (
      Object.defineProperty(n, "~standard", {
        value: {
          ...t[`~standard`],
          jsonSchema: {
            input: ya(t, `input`, e.processors),
            output: ya(t, `output`, e.processors),
          },
        },
        enumerable: !1,
        writable: !1,
      }),
      n
    );
  } catch {
    throw Error(`Error converting schema to JSON.`);
  }
}
function K(e, t) {
  let n = t ?? { seen: new Set() };
  if (n.seen.has(e)) return !1;
  n.seen.add(e);
  let r = e._zod.def;
  if (r.type === `transform`) return !0;
  if (r.type === `array`) return K(r.element, n);
  if (r.type === `set`) return K(r.valueType, n);
  if (r.type === `lazy`) return K(r.getter(), n);
  if (
    r.type === `promise` ||
    r.type === `optional` ||
    r.type === `nonoptional` ||
    r.type === `nullable` ||
    r.type === `readonly` ||
    r.type === "default" ||
    r.type === `prefault`
  )
    return K(r.innerType, n);
  if (r.type === `intersection`) return K(r.left, n) || K(r.right, n);
  if (r.type === `record` || r.type === `map`) return K(r.keyType, n) || K(r.valueType, n);
  if (r.type === `pipe`) return e._zod.traits.has(`$ZodCodec`) ? !0 : K(r.in, n) || K(r.out, n);
  if (r.type === `object`) {
    for (let e in r.shape) if (K(r.shape[e], n)) return !0;
    return !1;
  }
  if (r.type === `union`) {
    for (let e of r.options) if (K(e, n)) return !0;
    return !1;
  }
  if (r.type === `tuple`) {
    for (let e of r.items) if (K(e, n)) return !0;
    return !!(r.rest && K(r.rest, n));
  }
  return !1;
}
var va, ya;
function ba() {
  return (ba = e(() => {
    (si(),
      (va =
        (e, t = {}) =>
        (n) => {
          let r = ha({ ...n, processors: t });
          return (G(e, r), ga(r, e), _a(r, e));
        }),
      (ya =
        (e, t, n = {}) =>
        (r) => {
          let { libraryOptions: i, target: a } = r ?? {},
            o = ha({ ...(i ?? {}), target: a, io: t, processors: n });
          return (G(e, o), ga(o, e), _a(o, e));
        }));
  }))();
}
var xa,
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
  Ka;
function qa() {
  return (qa = e(() => {
    (ba(),
      _t(),
      (xa = {
        guid: `uuid`,
        url: `uri`,
        datetime: `date-time`,
        json_string: `json-string`,
        regex: ``,
      }),
      (Sa = (e, t, n, r) => {
        let i = n;
        i.type = `string`;
        let { minimum: a, maximum: o, format: s, patterns: c, contentEncoding: l } = e._zod.bag;
        if (
          (typeof a == `number` && (i.minLength = a),
          typeof o == `number` && (i.maxLength = o),
          s &&
            ((i.format = xa[s] ?? s),
            i.format === `` && delete i.format,
            s === `time` && delete i.format),
          l && (i.contentEncoding = l),
          c && c.size > 0)
        ) {
          let e = [...c];
          e.length === 1
            ? (i.pattern = e[0].source)
            : e.length > 1 &&
              (i.allOf = [
                ...e.map((e) => ({
                  ...(t.target === `draft-07` ||
                  t.target === `draft-04` ||
                  t.target === `openapi-3.0`
                    ? { type: `string` }
                    : {}),
                  pattern: e.source,
                })),
              ]);
        }
      }),
      (Ca = (e, t, n, r) => {
        let i = n,
          {
            minimum: a,
            maximum: o,
            format: s,
            multipleOf: c,
            exclusiveMaximum: l,
            exclusiveMinimum: u,
          } = e._zod.bag;
        i.type = typeof s == `string` && s.includes(`int`) ? `integer` : `number`;
        let d = typeof u == `number` && u >= (a ?? -1 / 0),
          f = typeof l == `number` && l <= (o ?? 1 / 0),
          p = t.target === `draft-04` || t.target === `openapi-3.0`;
        (d
          ? p
            ? ((i.minimum = u), (i.exclusiveMinimum = !0))
            : (i.exclusiveMinimum = u)
          : typeof a == `number` && (i.minimum = a),
          f
            ? p
              ? ((i.maximum = l), (i.exclusiveMaximum = !0))
              : (i.exclusiveMaximum = l)
            : typeof o == `number` && (i.maximum = o),
          typeof c == `number` && (i.multipleOf = c));
      }),
      (wa = (e, t, n, r) => {
        n.type = `boolean`;
      }),
      (Ta = (e, t, n, r) => {
        t.target === `openapi-3.0`
          ? ((n.type = `string`), (n.nullable = !0), (n.enum = [null]))
          : (n.type = `null`);
      }),
      (Ea = (e, t, n, r) => {
        if (t.unrepresentable === `throw`)
          throw Error(`Undefined cannot be represented in JSON Schema`);
      }),
      (Da = (e, t, n, r) => {
        n.not = {};
      }),
      (Oa = (e, t, n, r) => {}),
      (ka = (e, t, n, r) => {}),
      (Aa = (e, t, n, r) => {
        let i = e._zod.def,
          a = Le(i.entries);
        (a.every((e) => typeof e == `number`) && (n.type = `number`),
          a.every((e) => typeof e == `string`) && (n.type = `string`),
          (n.enum = a));
      }),
      (ja = (e, t, n, r) => {
        let i = e._zod.def,
          a = [];
        for (let e of i.values)
          if (e === void 0) {
            if (t.unrepresentable === `throw`)
              throw Error("Literal `undefined` cannot be represented in JSON Schema");
          } else if (typeof e == `bigint`) {
            if (t.unrepresentable === `throw`)
              throw Error(`BigInt literals cannot be represented in JSON Schema`);
            a.push(Number(e));
          } else a.push(e);
        if (a.length !== 0) {
          if (a.length === 1) {
            let e = a[0];
            ((n.type = e === null ? `null` : typeof e),
              t.target === `draft-04` || t.target === `openapi-3.0`
                ? (n.enum = [e])
                : (n.const = e));
          } else
            (a.every((e) => typeof e == `number`) && (n.type = `number`),
              a.every((e) => typeof e == `string`) && (n.type = `string`),
              a.every((e) => typeof e == `boolean`) && (n.type = `boolean`),
              a.every((e) => e === null) && (n.type = `null`),
              (n.enum = a));
        }
      }),
      (Ma = (e, t, n, r) => {
        if (t.unrepresentable === `throw`)
          throw Error(`Custom types cannot be represented in JSON Schema`);
      }),
      (Na = (e, t, n, r) => {
        if (t.unrepresentable === `throw`)
          throw Error(`Transforms cannot be represented in JSON Schema`);
      }),
      (Pa = (e, t, n, r) => {
        let i = n,
          a = e._zod.def,
          { minimum: o, maximum: s } = e._zod.bag;
        (typeof o == `number` && (i.minItems = o),
          typeof s == `number` && (i.maxItems = s),
          (i.type = `array`),
          (i.items = G(a.element, t, { ...r, path: [...r.path, `items`] })));
      }),
      (Fa = (e, t, n, r) => {
        let i = n,
          a = e._zod.def;
        ((i.type = `object`), (i.properties = {}));
        let o = a.shape;
        for (let e in o) i.properties[e] = G(o[e], t, { ...r, path: [...r.path, `properties`, e] });
        let s = new Set(Object.keys(o)),
          c = new Set(
            [...s].filter((e) => {
              let n = a.shape[e]._zod;
              return t.io === `input` ? n.optin === void 0 : n.optout === void 0;
            }),
          );
        (c.size > 0 && (i.required = Array.from(c)),
          a.catchall?._zod.def.type === `never`
            ? (i.additionalProperties = !1)
            : a.catchall
              ? a.catchall &&
                (i.additionalProperties = G(a.catchall, t, {
                  ...r,
                  path: [...r.path, `additionalProperties`],
                }))
              : t.io === `output` && (i.additionalProperties = !1));
      }),
      (Ia = (e, t, n, r) => {
        let i = e._zod.def,
          a = i.inclusive === !1,
          o = i.options.map((e, n) =>
            G(e, t, { ...r, path: [...r.path, a ? `oneOf` : `anyOf`, n] }),
          );
        a ? (n.oneOf = o) : (n.anyOf = o);
      }),
      (La = (e, t, n, r) => {
        let i = e._zod.def,
          a = G(i.left, t, { ...r, path: [...r.path, `allOf`, 0] }),
          o = G(i.right, t, { ...r, path: [...r.path, `allOf`, 1] }),
          s = (e) => `allOf` in e && Object.keys(e).length === 1;
        n.allOf = [...(s(a) ? a.allOf : [a]), ...(s(o) ? o.allOf : [o])];
      }),
      (Ra = (e, t, n, r) => {
        let i = n,
          a = e._zod.def;
        i.type = `object`;
        let o = a.keyType,
          s = o._zod.bag?.patterns;
        if (a.mode === `loose` && s && s.size > 0) {
          let e = G(a.valueType, t, { ...r, path: [...r.path, `patternProperties`, `*`] });
          i.patternProperties = {};
          for (let t of s) i.patternProperties[t.source] = e;
        } else
          ((t.target === `draft-07` || t.target === `draft-2020-12`) &&
            (i.propertyNames = G(a.keyType, t, { ...r, path: [...r.path, `propertyNames`] })),
            (i.additionalProperties = G(a.valueType, t, {
              ...r,
              path: [...r.path, `additionalProperties`],
            })));
        let c = o._zod.values;
        if (c) {
          let e = [...c].filter((e) => typeof e == `string` || typeof e == `number`);
          e.length > 0 && (i.required = e);
        }
      }),
      (za = (e, t, n, r) => {
        let i = e._zod.def,
          a = G(i.innerType, t, r),
          o = t.seen.get(e);
        t.target === `openapi-3.0`
          ? ((o.ref = i.innerType), (n.nullable = !0))
          : (n.anyOf = [a, { type: `null` }]);
      }),
      (Ba = (e, t, n, r) => {
        let i = e._zod.def;
        G(i.innerType, t, r);
        let a = t.seen.get(e);
        a.ref = i.innerType;
      }),
      (Va = (e, t, n, r) => {
        let i = e._zod.def;
        G(i.innerType, t, r);
        let a = t.seen.get(e);
        ((a.ref = i.innerType), (n.default = JSON.parse(JSON.stringify(i.defaultValue))));
      }),
      (Ha = (e, t, n, r) => {
        let i = e._zod.def;
        G(i.innerType, t, r);
        let a = t.seen.get(e);
        ((a.ref = i.innerType),
          t.io === `input` && (n._prefault = JSON.parse(JSON.stringify(i.defaultValue))));
      }),
      (Ua = (e, t, n, r) => {
        let i = e._zod.def;
        G(i.innerType, t, r);
        let a = t.seen.get(e);
        a.ref = i.innerType;
        let o;
        try {
          o = i.catchValue(void 0);
        } catch {
          throw Error(`Dynamic catch values are not supported in JSON Schema`);
        }
        n.default = o;
      }),
      (Wa = (e, t, n, r) => {
        let i = e._zod.def,
          a = i.in._zod.traits.has(`$ZodTransform`),
          o = t.io === `input` ? (a ? i.out : i.in) : i.out;
        G(o, t, r);
        let s = t.seen.get(e);
        s.ref = o;
      }),
      (Ga = (e, t, n, r) => {
        let i = e._zod.def;
        G(i.innerType, t, r);
        let a = t.seen.get(e);
        ((a.ref = i.innerType), (n.readOnly = !0));
      }),
      (Ka = (e, t, n, r) => {
        let i = e._zod.def;
        G(i.innerType, t, r);
        let a = t.seen.get(e);
        a.ref = i.innerType;
      }));
  }))();
}
function Ja(e) {
  return ji(Qa, e);
}
function Ya(e) {
  return Mi($a, e);
}
function Xa(e) {
  return Ni(eo, e);
}
function Za(e) {
  return Pi(to, e);
}
var Qa, $a, eo, to;
function no() {
  return (no = e(() => {
    (R(),
      ni(),
      ma(),
      Js(),
      (Qa = I(`ZodISODateTime`, (e, t) => {
        (hr.init(e, t), Y.init(e, t));
      })),
      ($a = I(`ZodISODate`, (e, t) => {
        (gr.init(e, t), Y.init(e, t));
      })),
      (eo = I(`ZodISOTime`, (e, t) => {
        (_r.init(e, t), Y.init(e, t));
      })),
      (to = I(`ZodISODuration`, (e, t) => {
        (vr.init(e, t), Y.init(e, t));
      })));
  }))();
}
var ro, q;
function io() {
  return (io = e(() => {
    (Ct(),
      R(),
      _t(),
      (ro = (e, t) => {
        (xt.init(e, t),
          (e.name = `ZodError`),
          Object.defineProperties(e, {
            format: { value: (t) => yt(e, t) },
            flatten: { value: (t) => vt(e, t) },
            addIssue: {
              value: (t) => {
                (e.issues.push(t), (e.message = JSON.stringify(e.issues, Re, 2)));
              },
            },
            addIssues: {
              value: (t) => {
                (e.issues.push(...t), (e.message = JSON.stringify(e.issues, Re, 2)));
              },
            },
            isEmpty: {
              get() {
                return e.issues.length === 0;
              },
            },
          }));
      }),
      (q = I(`ZodError`, ro, { Parent: Error })));
  }))();
}
var ao, oo, so, co, lo, uo, fo, po, mo, ho, go, _o;
function vo() {
  return (vo = e(() => {
    (Rt(),
      io(),
      (ao = wt(q)),
      (oo = Tt(q)),
      (so = Et(q)),
      (co = Ot(q)),
      (lo = At(q)),
      (uo = jt(q)),
      (fo = Mt(q)),
      (po = Nt(q)),
      (mo = Pt(q)),
      (ho = Ft(q)),
      (go = It(q)),
      (_o = Lt(q)));
  }))();
}
function yo(e, t, n) {
  let r = Object.getPrototypeOf(e),
    i = Qo.get(r);
  if ((i || ((i = new Set()), Qo.set(r, i)), !i.has(t))) {
    i.add(t);
    for (let e in n) {
      let t = n[e];
      Object.defineProperty(r, e, {
        configurable: !0,
        enumerable: !1,
        get() {
          let n = t.bind(this);
          return (
            Object.defineProperty(this, e, {
              configurable: !0,
              writable: !0,
              enumerable: !0,
              value: n,
            }),
            n
          );
        },
        set(t) {
          Object.defineProperty(this, e, {
            configurable: !0,
            writable: !0,
            enumerable: !0,
            value: t,
          });
        },
      });
    }
  }
}
function bo(e) {
  return ci(es, e);
}
function xo(e) {
  return Fi(bs, e);
}
function So(e) {
  return Ii(xs, e);
}
function Co(e) {
  return Li(Ss, e);
}
function wo(e) {
  return Ri(Cs, e);
}
function To(e) {
  return zi(ws, e);
}
function Eo() {
  return Bi(Ts);
}
function Do() {
  return Vi(Es);
}
function Oo(e) {
  return Hi(Ds, e);
}
function ko(e, t) {
  return la(Os, e, t);
}
function Ao(e, t) {
  let n = { type: `object`, shape: e ?? {}, ...B(t) };
  return new ks(n);
}
function jo(e, t) {
  return new ks({ type: `object`, shape: e, catchall: Do(), ...B(t) });
}
function Mo(e, t) {
  return new As({ type: `union`, options: e, ...B(t) });
}
function No(e, t, n) {
  return new js({ type: `union`, options: t, discriminator: e, ...B(n) });
}
function Po(e, t) {
  return new Ms({ type: `intersection`, left: e, right: t });
}
function Fo(e, t, n) {
  return !t || !t._zod
    ? new Ns({ type: `record`, keyType: bo(), valueType: e, ...B(t) })
    : new Ns({ type: `record`, keyType: e, valueType: t, ...B(n) });
}
function Io(e, t) {
  let n = Array.isArray(e) ? Object.fromEntries(e.map((e) => [e, e])) : e;
  return new Ps({ type: `enum`, entries: n, ...B(t) });
}
function Lo(e, t) {
  return new Fs({ type: `literal`, values: Array.isArray(e) ? e : [e], ...B(t) });
}
function Ro(e) {
  return new Is({ type: `transform`, transform: e });
}
function zo(e) {
  return new Ls({ type: `optional`, innerType: e });
}
function Bo(e) {
  return new Rs({ type: `optional`, innerType: e });
}
function Vo(e) {
  return new zs({ type: `nullable`, innerType: e });
}
function Ho(e, t) {
  return new Bs({
    type: `default`,
    innerType: e,
    get defaultValue() {
      return typeof t == `function` ? t() : Ye(t);
    },
  });
}
function Uo(e, t) {
  return new Vs({
    type: `prefault`,
    innerType: e,
    get defaultValue() {
      return typeof t == `function` ? t() : Ye(t);
    },
  });
}
function Wo(e, t) {
  return new Hs({ type: `nonoptional`, innerType: e, ...B(t) });
}
function Go(e, t) {
  return new Us({ type: `catch`, innerType: e, catchValue: typeof t == `function` ? t : () => t });
}
function Ko(e, t) {
  return new Ws({ type: `pipe`, in: e, out: t });
}
function qo(e) {
  return new Ks({ type: `readonly`, innerType: e });
}
function Jo(e, t) {
  return ua(qs, e ?? (() => !0), t);
}
function Yo(e, t = {}) {
  return da(qs, e, t);
}
function Xo(e, t) {
  return fa(e, t);
}
function Zo(e, t) {
  return new Gs({ type: `pipe`, in: Ro(e), out: t });
}
var Qo,
  J,
  $o,
  es,
  Y,
  ts,
  ns,
  rs,
  is,
  as,
  os,
  ss,
  cs,
  ls,
  us,
  ds,
  fs,
  ps,
  ms,
  hs,
  gs,
  _s,
  vs,
  ys,
  bs,
  xs,
  Ss,
  Cs,
  ws,
  Ts,
  Es,
  Ds,
  Os,
  ks,
  As,
  js,
  Ms,
  Ns,
  Ps,
  Fs,
  Is,
  Ls,
  Rs,
  zs,
  Bs,
  Vs,
  Hs,
  Us,
  Ws,
  Gs,
  Ks,
  qs;
function Js() {
  return (Js = e(() => {
    (R(),
      ni(),
      _t(),
      si(),
      ma(),
      qa(),
      ba(),
      no(),
      vo(),
      (Qo = new WeakMap()),
      (J = I(
        `ZodType`,
        (e, t) => (
          U.init(e, t),
          Object.assign(e[`~standard`], {
            jsonSchema: { input: ya(e, `input`), output: ya(e, `output`) },
          }),
          (e.toJSONSchema = va(e, {})),
          (e.def = t),
          (e.type = t.type),
          Object.defineProperty(e, "_def", { value: t }),
          (e.parse = (t, n) => ao(e, t, n, { callee: e.parse })),
          (e.safeParse = (t, n) => so(e, t, n)),
          (e.parseAsync = async (t, n) => oo(e, t, n, { callee: e.parseAsync })),
          (e.safeParseAsync = async (t, n) => co(e, t, n)),
          (e.spa = e.safeParseAsync),
          (e.encode = (t, n) => lo(e, t, n)),
          (e.decode = (t, n) => uo(e, t, n)),
          (e.encodeAsync = async (t, n) => fo(e, t, n)),
          (e.decodeAsync = async (t, n) => po(e, t, n)),
          (e.safeEncode = (t, n) => mo(e, t, n)),
          (e.safeDecode = (t, n) => ho(e, t, n)),
          (e.safeEncodeAsync = async (t, n) => go(e, t, n)),
          (e.safeDecodeAsync = async (t, n) => _o(e, t, n)),
          yo(e, `ZodType`, {
            check(...e) {
              let t = this.def;
              return this.clone(
                We(t, {
                  checks: [
                    ...(t.checks ?? []),
                    ...e.map((e) =>
                      typeof e == `function`
                        ? { _zod: { check: e, def: { check: `custom` }, onattach: [] } }
                        : e,
                    ),
                  ],
                }),
                { parent: !0 },
              );
            },
            with(...e) {
              return this.check(...e);
            },
            clone(e, t) {
              return Ze(this, e, t);
            },
            brand() {
              return this;
            },
            register(e, t) {
              return (e.add(this, t), this);
            },
            refine(e, t) {
              return this.check(Yo(e, t));
            },
            superRefine(e, t) {
              return this.check(Xo(e, t));
            },
            overwrite(e) {
              return this.check(ra(e));
            },
            optional() {
              return zo(this);
            },
            exactOptional() {
              return Bo(this);
            },
            nullable() {
              return Vo(this);
            },
            nullish() {
              return zo(Vo(this));
            },
            nonoptional(e) {
              return Wo(this, e);
            },
            array() {
              return ko(this);
            },
            or(e) {
              return Mo([this, e]);
            },
            and(e) {
              return Po(this, e);
            },
            transform(e) {
              return Ko(this, Ro(e));
            },
            default(e) {
              return Ho(this, e);
            },
            prefault(e) {
              return Uo(this, e);
            },
            catch(e) {
              return Go(this, e);
            },
            pipe(e) {
              return Ko(this, e);
            },
            readonly() {
              return qo(this);
            },
            describe(e) {
              let t = this.clone();
              return (oi.add(t, { description: e }), t);
            },
            meta(...e) {
              if (e.length === 0) return oi.get(this);
              let t = this.clone();
              return (oi.add(t, e[0]), t);
            },
            isOptional() {
              return this.safeParse(void 0).success;
            },
            isNullable() {
              return this.safeParse(null).success;
            },
            apply(e) {
              return e(this);
            },
          }),
          Object.defineProperty(e, "description", {
            get() {
              return oi.get(e)?.description;
            },
            configurable: !0,
          }),
          e
        ),
      )),
      ($o = I(`_ZodString`, (e, t) => {
        (rr.init(e, t), J.init(e, t), (e._zod.processJSONSchema = (t, n, r) => Sa(e, t, n, r)));
        let n = e._zod.bag;
        ((e.format = n.format ?? null),
          (e.minLength = n.minimum ?? null),
          (e.maxLength = n.maximum ?? null),
          yo(e, `_ZodString`, {
            regex(...e) {
              return this.check(Zi(...e));
            },
            includes(...e) {
              return this.check(ea(...e));
            },
            startsWith(...e) {
              return this.check(ta(...e));
            },
            endsWith(...e) {
              return this.check(na(...e));
            },
            min(...e) {
              return this.check(Yi(...e));
            },
            max(...e) {
              return this.check(Ji(...e));
            },
            length(...e) {
              return this.check(Xi(...e));
            },
            nonempty(...e) {
              return this.check(Yi(1, ...e));
            },
            lowercase(e) {
              return this.check(Qi(e));
            },
            uppercase(e) {
              return this.check($i(e));
            },
            trim() {
              return this.check(aa());
            },
            normalize(...e) {
              return this.check(ia(...e));
            },
            toLowerCase() {
              return this.check(oa());
            },
            toUpperCase() {
              return this.check(sa());
            },
            slugify() {
              return this.check(ca());
            },
          }));
      })),
      (es = I(`ZodString`, (e, t) => {
        (rr.init(e, t),
          $o.init(e, t),
          (e.email = (t) => e.check(li(ts, t))),
          (e.url = (t) => e.check(hi(is, t))),
          (e.jwt = (t) => e.check(Ai(ys, t))),
          (e.emoji = (t) => e.check(gi(as, t))),
          (e.guid = (t) => e.check(ui(ns, t))),
          (e.uuid = (t) => e.check(di(rs, t))),
          (e.uuidv4 = (t) => e.check(fi(rs, t))),
          (e.uuidv6 = (t) => e.check(pi(rs, t))),
          (e.uuidv7 = (t) => e.check(mi(rs, t))),
          (e.nanoid = (t) => e.check(_i(os, t))),
          (e.guid = (t) => e.check(ui(ns, t))),
          (e.cuid = (t) => e.check(vi(ss, t))),
          (e.cuid2 = (t) => e.check(yi(cs, t))),
          (e.ulid = (t) => e.check(bi(ls, t))),
          (e.base64 = (t) => e.check(Di(gs, t))),
          (e.base64url = (t) => e.check(Oi(_s, t))),
          (e.xid = (t) => e.check(xi(us, t))),
          (e.ksuid = (t) => e.check(Si(ds, t))),
          (e.ipv4 = (t) => e.check(Ci(fs, t))),
          (e.ipv6 = (t) => e.check(wi(ps, t))),
          (e.cidrv4 = (t) => e.check(Ti(ms, t))),
          (e.cidrv6 = (t) => e.check(Ei(hs, t))),
          (e.e164 = (t) => e.check(ki(vs, t))),
          (e.datetime = (t) => e.check(Ja(t))),
          (e.date = (t) => e.check(Ya(t))),
          (e.time = (t) => e.check(Xa(t))),
          (e.duration = (t) => e.check(Za(t))));
      })),
      (Y = I(`ZodStringFormat`, (e, t) => {
        (W.init(e, t), $o.init(e, t));
      })),
      (ts = I(`ZodEmail`, (e, t) => {
        (or.init(e, t), Y.init(e, t));
      })),
      (ns = I(`ZodGUID`, (e, t) => {
        (ir.init(e, t), Y.init(e, t));
      })),
      (rs = I(`ZodUUID`, (e, t) => {
        (ar.init(e, t), Y.init(e, t));
      })),
      (is = I(`ZodURL`, (e, t) => {
        (sr.init(e, t), Y.init(e, t));
      })),
      (as = I(`ZodEmoji`, (e, t) => {
        (cr.init(e, t), Y.init(e, t));
      })),
      (os = I(`ZodNanoID`, (e, t) => {
        (lr.init(e, t), Y.init(e, t));
      })),
      (ss = I(`ZodCUID`, (e, t) => {
        (ur.init(e, t), Y.init(e, t));
      })),
      (cs = I(`ZodCUID2`, (e, t) => {
        (dr.init(e, t), Y.init(e, t));
      })),
      (ls = I(`ZodULID`, (e, t) => {
        (fr.init(e, t), Y.init(e, t));
      })),
      (us = I(`ZodXID`, (e, t) => {
        (pr.init(e, t), Y.init(e, t));
      })),
      (ds = I(`ZodKSUID`, (e, t) => {
        (mr.init(e, t), Y.init(e, t));
      })),
      (fs = I(`ZodIPv4`, (e, t) => {
        (yr.init(e, t), Y.init(e, t));
      })),
      (ps = I(`ZodIPv6`, (e, t) => {
        (br.init(e, t), Y.init(e, t));
      })),
      (ms = I(`ZodCIDRv4`, (e, t) => {
        (xr.init(e, t), Y.init(e, t));
      })),
      (hs = I(`ZodCIDRv6`, (e, t) => {
        (Sr.init(e, t), Y.init(e, t));
      })),
      (gs = I(`ZodBase64`, (e, t) => {
        (Cr.init(e, t), Y.init(e, t));
      })),
      (_s = I(`ZodBase64URL`, (e, t) => {
        (wr.init(e, t), Y.init(e, t));
      })),
      (vs = I(`ZodE164`, (e, t) => {
        (Tr.init(e, t), Y.init(e, t));
      })),
      (ys = I(`ZodJWT`, (e, t) => {
        (Er.init(e, t), Y.init(e, t));
      })),
      (bs = I(`ZodNumber`, (e, t) => {
        (Dr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Ca(e, t, n, r)),
          yo(e, `ZodNumber`, {
            gt(e, t) {
              return this.check(Gi(e, t));
            },
            gte(e, t) {
              return this.check(Ki(e, t));
            },
            min(e, t) {
              return this.check(Ki(e, t));
            },
            lt(e, t) {
              return this.check(Ui(e, t));
            },
            lte(e, t) {
              return this.check(Wi(e, t));
            },
            max(e, t) {
              return this.check(Wi(e, t));
            },
            int(e) {
              return this.check(So(e));
            },
            safe(e) {
              return this.check(So(e));
            },
            positive(e) {
              return this.check(Gi(0, e));
            },
            nonnegative(e) {
              return this.check(Ki(0, e));
            },
            negative(e) {
              return this.check(Ui(0, e));
            },
            nonpositive(e) {
              return this.check(Wi(0, e));
            },
            multipleOf(e, t) {
              return this.check(qi(e, t));
            },
            step(e, t) {
              return this.check(qi(e, t));
            },
            finite() {
              return this;
            },
          }));
        let n = e._zod.bag;
        ((e.minValue = Math.max(n.minimum ?? -1 / 0, n.exclusiveMinimum ?? -1 / 0) ?? null),
          (e.maxValue = Math.min(n.maximum ?? 1 / 0, n.exclusiveMaximum ?? 1 / 0) ?? null),
          (e.isInt = (n.format ?? ``).includes(`int`) || Number.isSafeInteger(n.multipleOf ?? 0.5)),
          (e.isFinite = !0),
          (e.format = n.format ?? null));
      })),
      (xs = I(`ZodNumberFormat`, (e, t) => {
        (Or.init(e, t), bs.init(e, t));
      })),
      (Ss = I(`ZodBoolean`, (e, t) => {
        (kr.init(e, t), J.init(e, t), (e._zod.processJSONSchema = (t, n, r) => wa(e, t, n, r)));
      })),
      (Cs = I(`ZodUndefined`, (e, t) => {
        (Ar.init(e, t), J.init(e, t), (e._zod.processJSONSchema = (t, n, r) => Ea(e, t, n, r)));
      })),
      (ws = I(`ZodNull`, (e, t) => {
        (jr.init(e, t), J.init(e, t), (e._zod.processJSONSchema = (t, n, r) => Ta(e, t, n, r)));
      })),
      (Ts = I(`ZodAny`, (e, t) => {
        (Mr.init(e, t), J.init(e, t), (e._zod.processJSONSchema = (t, n, r) => Oa(e, t, n, r)));
      })),
      (Es = I(`ZodUnknown`, (e, t) => {
        (Nr.init(e, t), J.init(e, t), (e._zod.processJSONSchema = (t, n, r) => ka(e, t, n, r)));
      })),
      (Ds = I(`ZodNever`, (e, t) => {
        (Pr.init(e, t), J.init(e, t), (e._zod.processJSONSchema = (t, n, r) => Da(e, t, n, r)));
      })),
      (Os = I(`ZodArray`, (e, t) => {
        (Fr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Pa(e, t, n, r)),
          (e.element = t.element),
          yo(e, `ZodArray`, {
            min(e, t) {
              return this.check(Yi(e, t));
            },
            nonempty(e) {
              return this.check(Yi(1, e));
            },
            max(e, t) {
              return this.check(Ji(e, t));
            },
            length(e, t) {
              return this.check(Xi(e, t));
            },
            unwrap() {
              return this.element;
            },
          }));
      })),
      (ks = I(`ZodObject`, (e, t) => {
        (Lr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Fa(e, t, n, r)),
          z(e, `shape`, () => t.shape),
          yo(e, `ZodObject`, {
            keyof() {
              return Io(Object.keys(this._zod.def.shape));
            },
            catchall(e) {
              return this.clone({ ...this._zod.def, catchall: e });
            },
            passthrough() {
              return this.clone({ ...this._zod.def, catchall: Do() });
            },
            loose() {
              return this.clone({ ...this._zod.def, catchall: Do() });
            },
            strict() {
              return this.clone({ ...this._zod.def, catchall: Oo() });
            },
            strip() {
              return this.clone({ ...this._zod.def, catchall: void 0 });
            },
            extend(e) {
              return tt(this, e);
            },
            safeExtend(e) {
              return nt(this, e);
            },
            merge(e) {
              return rt(this, e);
            },
            pick(e) {
              return $e(this, e);
            },
            omit(e) {
              return et(this, e);
            },
            partial(...e) {
              return it(Ls, this, e[0]);
            },
            required(...e) {
              return at(Hs, this, e[0]);
            },
          }));
      })),
      (As = I(`ZodUnion`, (e, t) => {
        (Rr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Ia(e, t, n, r)),
          (e.options = t.options));
      })),
      (js = I(`ZodDiscriminatedUnion`, (e, t) => {
        (As.init(e, t), zr.init(e, t));
      })),
      (Ms = I(`ZodIntersection`, (e, t) => {
        (Br.init(e, t), J.init(e, t), (e._zod.processJSONSchema = (t, n, r) => La(e, t, n, r)));
      })),
      (Ns = I(`ZodRecord`, (e, t) => {
        (Vr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Ra(e, t, n, r)),
          (e.keyType = t.keyType),
          (e.valueType = t.valueType));
      })),
      (Ps = I(`ZodEnum`, (e, t) => {
        (Hr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Aa(e, t, n, r)),
          (e.enum = t.entries),
          (e.options = Object.values(t.entries)));
        let n = new Set(Object.keys(t.entries));
        ((e.extract = (e, r) => {
          let i = {};
          for (let r of e)
            if (n.has(r)) i[r] = t.entries[r];
            else throw Error(`Key ${r} not found in enum`);
          return new Ps({ ...t, checks: [], ...B(r), entries: i });
        }),
          (e.exclude = (e, r) => {
            let i = { ...t.entries };
            for (let t of e)
              if (n.has(t)) delete i[t];
              else throw Error(`Key ${t} not found in enum`);
            return new Ps({ ...t, checks: [], ...B(r), entries: i });
          }));
      })),
      (Fs = I(`ZodLiteral`, (e, t) => {
        (Ur.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => ja(e, t, n, r)),
          (e.values = new Set(t.values)),
          Object.defineProperty(e, "value", {
            get() {
              if (t.values.length > 1)
                throw Error(
                  "This schema contains multiple valid literal values. Use `.values` instead.",
                );
              return t.values[0];
            },
          }));
      })),
      (Is = I(`ZodTransform`, (e, t) => {
        (Wr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Na(e, t, n, r)),
          (e._zod.parse = (n, r) => {
            if (r.direction === `backward`) throw new Fe(e.constructor.name);
            n.addIssue = (r) => {
              if (typeof r == `string`) n.issues.push(dt(r, n.value, t));
              else {
                let t = r;
                (t.fatal && (t.continue = !1),
                  (t.code ??= `custom`),
                  (t.input ??= n.value),
                  (t.inst ??= e),
                  n.issues.push(dt(t)));
              }
            };
            let i = t.transform(n.value, n);
            return i instanceof Promise
              ? i.then((e) => ((n.value = e), (n.fallback = !0), n))
              : ((n.value = i), (n.fallback = !0), n);
          }));
      })),
      (Ls = I(`ZodOptional`, (e, t) => {
        (Gr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Ka(e, t, n, r)),
          (e.unwrap = () => e._zod.def.innerType));
      })),
      (Rs = I(`ZodExactOptional`, (e, t) => {
        (Kr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Ka(e, t, n, r)),
          (e.unwrap = () => e._zod.def.innerType));
      })),
      (zs = I(`ZodNullable`, (e, t) => {
        (qr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => za(e, t, n, r)),
          (e.unwrap = () => e._zod.def.innerType));
      })),
      (Bs = I(`ZodDefault`, (e, t) => {
        (Jr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Va(e, t, n, r)),
          (e.unwrap = () => e._zod.def.innerType),
          (e.removeDefault = e.unwrap));
      })),
      (Vs = I(`ZodPrefault`, (e, t) => {
        (Yr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Ha(e, t, n, r)),
          (e.unwrap = () => e._zod.def.innerType));
      })),
      (Hs = I(`ZodNonOptional`, (e, t) => {
        (Xr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Ba(e, t, n, r)),
          (e.unwrap = () => e._zod.def.innerType));
      })),
      (Us = I(`ZodCatch`, (e, t) => {
        (Zr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Ua(e, t, n, r)),
          (e.unwrap = () => e._zod.def.innerType),
          (e.removeCatch = e.unwrap));
      })),
      (Ws = I(`ZodPipe`, (e, t) => {
        (Qr.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Wa(e, t, n, r)),
          (e.in = t.in),
          (e.out = t.out));
      })),
      (Gs = I(`ZodPreprocess`, (e, t) => {
        (Ws.init(e, t), $r.init(e, t));
      })),
      (Ks = I(`ZodReadonly`, (e, t) => {
        (ei.init(e, t),
          J.init(e, t),
          (e._zod.processJSONSchema = (t, n, r) => Ga(e, t, n, r)),
          (e.unwrap = () => e._zod.def.innerType));
      })),
      (qs = I(`ZodCustom`, (e, t) => {
        (ti.init(e, t), J.init(e, t), (e._zod.processJSONSchema = (t, n, r) => Ma(e, t, n, r)));
      })));
  }))();
}
function Ys({
  autoLoadOnConnect: e,
  state: n,
  gateway: c,
  publish: f,
  run: le,
  mutate: fe,
  trackLoad: _e,
  resetLoads: ve,
  resetConfigLoad: m,
  refreshConnectionState: h,
  canCallConfigMethod: g,
  cancelAppliedRefresh: _,
  reconcileAppliedRefresh: v,
  disposeAppliedRefresh: ye,
  isDisposed: y,
}) {
  let b = null,
    x = null,
    S = !1,
    C = null,
    be = !1,
    xe = null,
    Se = null,
    w = null,
    Ce = !1,
    T = null,
    we = !1,
    E = null,
    D = Promise.resolve(),
    Te = () => {
      D = new Promise((e) => {
        E = e;
      });
    };
  Te();
  let O = !1,
    k = null,
    A = Promise.resolve(),
    Ee = null,
    j = (e) => {
      let t = g(e);
      return (!t && n.connected && ((n.lastError = d(`configView.adminRequired`)), f()), t);
    },
    De = () => {
      ((C = null),
        (be = !1),
        n.configAutoSaveStatus === `paused` && (n.configAutoSaveStatus = `idle`));
    },
    M = () => {
      be ||
        C ||
        !n.client ||
        !n.connected ||
        !n.configFormDirty ||
        n.configFormMode !== `form` ||
        (C = { client: n.client, epoch: a(n) });
    },
    N = () => {
      !n.client ||
        !n.connected ||
        n.configFormMode !== `form` ||
        ((C = { client: n.client, epoch: a(n) }),
        (be = !1),
        n.configAutoSaveStatus === `paused` && (n.configAutoSaveStatus = `idle`));
    },
    Oe = () => !be && C !== null && C.client === n.client && C.epoch === a(n),
    P = () => {
      n.configFormDirty && n.configFormMode === `form` ? M() : x === null && w === null && De();
    },
    F = () => {
      ((b &&= (clearTimeout(b), null)), (S = !1));
    },
    ke = () => {
      if (y() || we || O || !Oe() || !g(`config.set`)) return;
      if (x ?? w) {
        S = !0;
        return;
      }
      (_(), (xe = pe(n)), (Se = null));
      let e = le(() =>
        se(
          n,
          (e) => {
            Se = e;
          },
          () => g(`config.set`),
        ),
      )
        .catch(() => !1)
        .then((t) => {
          if (x !== e) return;
          ((x = null), P());
          let r = S || (t && n.configFormDirty && n.configFormMode === `form` && b === null);
          ((S = !1), r && !y() ? ke() : v());
        });
      x = e;
    },
    Ae = () => {
      b && (clearTimeout(b), (b = null), ke());
    },
    je = () => {
      y() ||
        O ||
        !Oe() ||
        !g(`config.set`) ||
        !n.configFormDirty ||
        n.configFormMode !== `form` ||
        (n.configAutoSaveStatus !== `conflict` &&
          (_(),
          b && clearTimeout(b),
          (b = setTimeout(() => {
            ((b = null), ke());
          }, Xs))));
    },
    Me = async (e = !1) => {
      for (;;) {
        e && Ae();
        let t = x ?? w;
        if (!t || (await Promise.race([t, D]), y())) return;
        e || F();
      }
    },
    I = async () => {
      if ((F(), x ?? w)) {
        we = !0;
        try {
          await Me();
        } finally {
          we = !1;
        }
      }
    },
    L = null,
    Ne = (e, t, r = {}) => {
      if (O) return Promise.resolve(t);
      let o = n.client,
        s = a(n);
      r.flushScheduledDraft ? Ae() : F();
      let c = () =>
          le(async () => {
            if (
              ((x ?? w) && (await Me(r.flushScheduledDraft)),
              O || y() || !o || !i(n, o, s) || (r.canDispatch && !r.canDispatch()))
            )
              return t;
            Ee = null;
            let a = e(),
              c = a
                .catch(() => t)
                .then(() => {
                  if (w !== c) return;
                  w = null;
                  let e = S;
                  ((S = !1), e && ke());
                });
            return ((w = c), await a);
          }),
        l = L ? L.then(c) : c(),
        u = l
          .catch(() => !1)
          .then(() => {
            L === u && (L = null);
          });
      return ((L = u), l);
    },
    Pe = c.subscribe((t) => {
      let r = n.client !== t.client,
        i = n.connected !== (t.phase === `connected`);
      if (
        ((n.client = t.client),
        (n.connected = t.phase === `connected`),
        (n.applySessionKey = t.sessionKey),
        r || i)
      ) {
        let t = n.configFormMode === `form` && (n.configFormDirty || x !== null || w !== null);
        (ve(),
          (L = null),
          l(n),
          F(),
          _(),
          t &&
            ((be = !0),
            n.configAutoSaveStatus !== `conflict` && (n.configAutoSaveStatus = `paused`)),
          (x !== null || w !== null) &&
            ((Ce = !0),
            (T = x === null ? (Ee?.raw ?? null) : xe),
            (x = null),
            (w = null),
            (S = !1)));
        let r = E;
        if (
          (Te(),
          r?.(),
          (n.configLoading = !1),
          (n.configSchemaLoading = !1),
          (n.configSaving = !1),
          (n.configApplying = !1),
          n.configAutoSaveStatus === `saving` && (n.configAutoSaveStatus = `idle`),
          n.connected && n.client)
        ) {
          if (Ce) {
            let e = T,
              t =
                n.configFormMode === `form` && !n.configFormDirty && n.configForm
                  ? u(n.configForm)
                  : null,
              r = t ? s(t) : null;
            h().then((i) => {
              if (!y()) {
                if (!i || !n.connected) {
                  v();
                  return;
                }
                if (((Ce = !1), (T = null), e !== null && n.configSnapshot?.raw === e)) {
                  let i = n.configSnapshot.hash ?? null;
                  (n.configSnapshot.appliedConfigHash === void 0 && (n.configNeedsApply = !0),
                    n.configFormDirty
                      ? pe(n) === e
                        ? (ee(n, n.configSnapshot, { discardPendingChanges: !0 }), De())
                        : (n.configDraftBaseHash = i ?? n.configDraftBaseHash)
                      : t &&
                        r !== null &&
                        r !== e &&
                        ((n.configForm = t),
                        (n.configRaw = r),
                        (n.configFormMode = `form`),
                        (n.configFormDirty = !0),
                        (n.configDraftBaseHash = i ?? n.configDraftBaseHash)));
                }
                (f(), v());
              }
            });
          } else e && oe(n, h, f, v);
        }
      }
      f();
    }),
    Fe = (e) => (
      _(),
      Ne(
        async () => {
          _();
          try {
            let r = e();
            return `error` in r
              ? ((n.lastError = r.error), !1)
              : await ie(n, r.options, async (e, r) => {
                  if ((m(), o(n, `config`), (n.configLoading = !1), t(e.config))) {
                    p(n, e, r);
                    return;
                  }
                  let i = le(() => te(n));
                  if ((_e(`config`, i), !(await i)))
                    throw Error(
                      n.lastError ??
                        `The configuration patch completed, but its authoritative refresh failed.`,
                    );
                });
          } finally {
            v();
          }
        },
        !1,
        { flushScheduledDraft: !0, canDispatch: () => j(`config.patch`) },
      ).finally(() => {
        je();
      })
    );
  return {
    prepareDiscard: I,
    patchForm: (e, t) => {
      (fe(() => ae(n, e, t)), P(), je());
    },
    removeFormValue: (e) => {
      (fe(() => re(n, e)), P(), je());
    },
    setRaw: (e) => fe(() => he(n, e)),
    resetDraft: () => {
      (F(), fe(() => de(n)), De(), v());
    },
    discardDraft: async () => {
      if ((await I(), n.connected && n.client)) {
        _();
        try {
          (await _e(
            `config`,
            le(() => te(n, { discardPendingChanges: !0 })),
          ),
            De());
        } finally {
          v();
        }
        return;
      }
      (fe(() => {
        (de(n),
          n.configAutoSaveStatus !== `conflict` &&
            ((n.configAutoSaveStatus = `idle`), (n.lastError = null)));
      }),
        De());
    },
    setWritesSuspended: (e) => {
      if (O !== e) {
        if (((O = e), e))
          (F(),
            (A = new Promise((e) => {
              k = e;
            })));
        else {
          let e = k;
          ((k = null), e?.(), je());
        }
      }
    },
    waitForPendingWrites: () => (Ae(), Me(!0)),
    save: (e = {}) => {
      let t = () => j(`config.set`) && (e.canDispatch?.() ?? !0);
      return t()
        ? Ne(
            async () => {
              (N(), _());
              try {
                let e = await ue(
                  n,
                  (e) => {
                    Ee = e;
                  },
                  t,
                );
                return (P(), e);
              } finally {
                v();
              }
            },
            !1,
            { canDispatch: t },
          )
        : Promise.resolve(!1);
    },
    apply: () =>
      j(`config.apply`)
        ? Ne(
            async () => {
              if ((N(), _(), n.configFormDirty && n.configFormMode === `raw`))
                return (
                  (n.configAutoSaveStatus = `error`),
                  (n.lastError = d(`configView.rawDraftBlocksApply`)),
                  v(),
                  !1
                );
              try {
                let e = await me(n, () => j(`config.apply`));
                return (P(), e);
              } finally {
                v();
              }
            },
            !1,
            { canDispatch: () => j(`config.apply`) },
          )
        : Promise.resolve(!1),
    stageDefaultAgent: (e) => {
      if (!j(`config.set`)) return !1;
      let t = ne(n, e);
      return (f(), P(), je(), t);
    },
    patch: (e) =>
      j(`config.patch`) && (e.canDispatch?.() ?? !0)
        ? Fe(() => ({ options: e }))
        : Promise.resolve(!1),
    patchFromSnapshot: (e) =>
      j(`config.patch`)
        ? Fe(() => {
            let t = r(n.configSnapshot);
            return t ? e(t) : { error: `Configuration is unavailable; refresh and try again.` };
          })
        : Promise.resolve(!1),
    runExternalMutation: async (e, t = {}) => {
      let r = n.client,
        o = a(n);
      for (;;) {
        t.waitForWritesResumed && O && !y() && (await A);
        let a = {
          ok: !1,
          reason: O ? `suspended` : `unavailable`,
          error: O
            ? `Configuration writes are temporarily suspended.`
            : `Configuration is unavailable; reconnect and try again.`,
        };
        if (!r || !i(n, r, o))
          return {
            ok: !1,
            reason: `unavailable`,
            error: `Connection changed before the configuration update started.`,
          };
        let s = await Ne(
          () =>
            ce(n, r, o, e, t, async () => {
              let e = le(() => te(n));
              return (_e(`config`, e), await e);
            }),
          a,
          { flushScheduledDraft: !0 },
        );
        if (!(t.waitForWritesResumed && !y() && !s.ok && (s.reason === `suspended` || O))) return s;
      }
    },
    dispose() {
      (k?.(), (k = null), E?.());
      let e = n.client,
        t =
          n.connected && e !== null && n.configFormMode === `form` && !O && Oe() && g(`config.set`),
        r = x,
        i = r ?? w;
      (F(),
        ye(),
        t && i
          ? i.then(() => {
              let t = r ? { raw: xe, ackHash: Se } : Ee,
                i = t?.ackHash ?? null,
                a = t?.raw ?? null;
              i && a !== null && pe(n) !== a && ge(n, e, i, () => g(`config.set`));
            })
          : t && n.configFormDirty && se(n, void 0, () => g(`config.set`)),
        l(n),
        (n.connected = !1),
        (n.configLoading = !1),
        (n.configSchemaLoading = !1),
        (n.configSaving = !1),
        (n.configApplying = !1),
        Pe());
    },
  };
}
var Xs;
function Zs() {
  return (Zs = e(() => {
    (f(), c(), fe(), le(), n(), (Xs = 800));
  }))();
}
var Qs;
function $s() {
  return ($s = e(() => {
    Qs = {
      version: 4,
      country_calling_codes: {
        1: [
          `US`,
          `AG`,
          `AI`,
          `AS`,
          `BB`,
          `BM`,
          `BS`,
          `CA`,
          `DM`,
          `DO`,
          `GD`,
          `GU`,
          `JM`,
          `KN`,
          `KY`,
          `LC`,
          `MP`,
          `MS`,
          `PR`,
          `SX`,
          `TC`,
          `TT`,
          `VC`,
          `VG`,
          `VI`,
        ],
        7: [`RU`, `KZ`],
        20: [`EG`],
        27: [`ZA`],
        30: [`GR`],
        31: [`NL`],
        32: [`BE`],
        33: [`FR`],
        34: [`ES`],
        36: [`HU`],
        39: [`IT`, `VA`],
        40: [`RO`],
        41: [`CH`],
        43: [`AT`],
        44: [`GB`, `GG`, `IM`, `JE`],
        45: [`DK`],
        46: [`SE`],
        47: [`NO`, `SJ`],
        48: [`PL`],
        49: [`DE`],
        51: [`PE`],
        52: [`MX`],
        53: [`CU`],
        54: [`AR`],
        55: [`BR`],
        56: [`CL`],
        57: [`CO`],
        58: [`VE`],
        60: [`MY`],
        61: [`AU`, `CC`, `CX`],
        62: [`ID`],
        63: [`PH`],
        64: [`NZ`],
        65: [`SG`],
        66: [`TH`],
        81: [`JP`],
        82: [`KR`],
        84: [`VN`],
        86: [`CN`],
        90: [`TR`],
        91: [`IN`],
        92: [`PK`],
        93: [`AF`],
        94: [`LK`],
        95: [`MM`],
        98: [`IR`],
        211: [`SS`],
        212: [`MA`, `EH`],
        213: [`DZ`],
        216: [`TN`],
        218: [`LY`],
        220: [`GM`],
        221: [`SN`],
        222: [`MR`],
        223: [`ML`],
        224: [`GN`],
        225: [`CI`],
        226: [`BF`],
        227: [`NE`],
        228: [`TG`],
        229: [`BJ`],
        230: [`MU`],
        231: [`LR`],
        232: [`SL`],
        233: [`GH`],
        234: [`NG`],
        235: [`TD`],
        236: [`CF`],
        237: [`CM`],
        238: [`CV`],
        239: [`ST`],
        240: [`GQ`],
        241: [`GA`],
        242: [`CG`],
        243: [`CD`],
        244: [`AO`],
        245: [`GW`],
        246: [`IO`],
        247: [`AC`],
        248: [`SC`],
        249: [`SD`],
        250: [`RW`],
        251: [`ET`],
        252: [`SO`],
        253: [`DJ`],
        254: [`KE`],
        255: [`TZ`],
        256: [`UG`],
        257: [`BI`],
        258: [`MZ`],
        260: [`ZM`],
        261: [`MG`],
        262: [`RE`, `YT`],
        263: [`ZW`],
        264: [`NA`],
        265: [`MW`],
        266: [`LS`],
        267: [`BW`],
        268: [`SZ`],
        269: [`KM`],
        290: [`SH`, `TA`],
        291: [`ER`],
        297: [`AW`],
        298: [`FO`],
        299: [`GL`],
        350: [`GI`],
        351: [`PT`],
        352: [`LU`],
        353: [`IE`],
        354: [`IS`],
        355: [`AL`],
        356: [`MT`],
        357: [`CY`],
        358: [`FI`, `AX`],
        359: [`BG`],
        370: [`LT`],
        371: [`LV`],
        372: [`EE`],
        373: [`MD`],
        374: [`AM`],
        375: [`BY`],
        376: [`AD`],
        377: [`MC`],
        378: [`SM`],
        380: [`UA`],
        381: [`RS`],
        382: [`ME`],
        383: [`XK`],
        385: [`HR`],
        386: [`SI`],
        387: [`BA`],
        389: [`MK`],
        420: [`CZ`],
        421: [`SK`],
        423: [`LI`],
        500: [`FK`],
        501: [`BZ`],
        502: [`GT`],
        503: [`SV`],
        504: [`HN`],
        505: [`NI`],
        506: [`CR`],
        507: [`PA`],
        508: [`PM`],
        509: [`HT`],
        590: [`GP`, `BL`, `MF`],
        591: [`BO`],
        592: [`GY`],
        593: [`EC`],
        594: [`GF`],
        595: [`PY`],
        596: [`MQ`],
        597: [`SR`],
        598: [`UY`],
        599: [`CW`, `BQ`],
        670: [`TL`],
        672: [`NF`],
        673: [`BN`],
        674: [`NR`],
        675: [`PG`],
        676: [`TO`],
        677: [`SB`],
        678: [`VU`],
        679: [`FJ`],
        680: [`PW`],
        681: [`WF`],
        682: [`CK`],
        683: [`NU`],
        685: [`WS`],
        686: [`KI`],
        687: [`NC`],
        688: [`TV`],
        689: [`PF`],
        690: [`TK`],
        691: [`FM`],
        692: [`MH`],
        850: [`KP`],
        852: [`HK`],
        853: [`MO`],
        855: [`KH`],
        856: [`LA`],
        880: [`BD`],
        886: [`TW`],
        960: [`MV`],
        961: [`LB`],
        962: [`JO`],
        963: [`SY`],
        964: [`IQ`],
        965: [`KW`],
        966: [`SA`],
        967: [`YE`],
        968: [`OM`],
        970: [`PS`],
        971: [`AE`],
        972: [`IL`],
        973: [`BH`],
        974: [`QA`],
        975: [`BT`],
        976: [`MN`],
        977: [`NP`],
        992: [`TJ`],
        993: [`TM`],
        994: [`AZ`],
        995: [`GE`],
        996: [`KG`],
        998: [`UZ`],
      },
      countries: {
        AC: [`247`, `00`, `(?:[01589]\\d|[2-467])\\d{4}`, [5, 6]],
        AD: [
          `376`,
          `00`,
          `(?:1|6\\d)\\d{7}|[135-9]\\d{5}`,
          [6, 8, 9],
          [
            [`(\\d{3})(\\d{3})`, `$1 $2`, [`[135-9]`]],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`1`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`6`]],
          ],
        ],
        AE: [
          `971`,
          `00`,
          `(?:[4-7]\\d|9[0-689])\\d{7}|800\\d{2,9}|[2-4679]\\d{7}`,
          [5, 6, 7, 8, 9, 10, 11, 12],
          [
            [`(\\d{3})(\\d{2,9})`, `$1 $2`, [`60|8`]],
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[236]|[479][2-8]`], `0$1`],
            [`(\\d{3})(\\d)(\\d{5})`, `$1 $2 $3`, [`[479]`]],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`5`], `0$1`],
          ],
          `0`,
        ],
        AF: [
          `93`,
          `00`,
          `[2-7]\\d{8}`,
          [9],
          [[`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[2-7]`], `0$1`]],
          `0`,
        ],
        AG: [
          `1`,
          `011`,
          `(?:268|[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([457]\\d{6})$|1`,
          `268$1`,
          0,
          `268`,
        ],
        AI: [
          `1`,
          `011`,
          `(?:264|[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2457]\\d{6})$|1`,
          `264$1`,
          0,
          `264`,
        ],
        AL: [
          `355`,
          `00`,
          `(?:700\\d\\d|900)\\d{3}|8\\d{5,7}|(?:[2-5]|6\\d)\\d{7}`,
          [6, 7, 8, 9],
          [
            [`(\\d{3})(\\d{3,4})`, `$1 $2`, [`80|9`], `0$1`],
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`4[2-6]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[2358][2-5]|4`], `0$1`],
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`[23578]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`6`], `0$1`],
          ],
          `0`,
        ],
        AM: [
          `374`,
          `00`,
          `(?:[1-489]\\d|55|60|77)\\d{6}`,
          [8],
          [
            [`(\\d{3})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`[89]0`], `0 $1`],
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`2|3[12]`], `(0$1)`],
            [`(\\d{2})(\\d{6})`, `$1 $2`, [`1|47`], `(0$1)`],
            [`(\\d{2})(\\d{6})`, `$1 $2`, [`[3-9]`], `0$1`],
          ],
          `0`,
        ],
        AO: [`244`, `00`, `[29]\\d{8}`, [9], [[`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[29]`]]]],
        AR: [
          `54`,
          `00`,
          `(?:11|[89]\\d\\d)\\d{8}|[2368]\\d{9}`,
          [10, 11],
          [
            [
              `(\\d{4})(\\d{2})(\\d{4})`,
              `$1 $2-$3`,
              [
                `2(?:2[024-9]|3[0-59]|47|6[245]|9[02-8])|3(?:3[28]|4[03-9]|5[2-46-8]|7[1-578]|8[2-9])`,
                `2(?:[23]02|6(?:[25]|4[6-8])|9(?:[02356]|4[02568]|72|8[23]))|3(?:3[28]|4(?:[04679]|3[5-8]|5[4-68]|8[2379])|5(?:[2467]|3[237]|8[2-5])|7[1-578]|8(?:[2469]|3[2578]|5[4-8]|7[36-8]|8[5-8]))|2(?:2[24-9]|3[1-59]|47)`,
                `2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3[78]|5(?:4[46]|8)|8[2379])|5(?:[2467]|3[237]|8[23])|7[1-578]|8(?:[2469]|3[278]|5[56][46]|86[3-6]))|2(?:2[24-9]|3[1-59]|47)|38(?:[58][78]|7[378])|3(?:4[35][56]|58[45]|8(?:[38]5|54|76))[4-6]`,
                `2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3(?:5(?:4[0-25689]|[56])|[78])|58|8[2379])|5(?:[2467]|3[237]|8(?:[23]|4(?:[45]|60)|5(?:4[0-39]|5|64)))|7[1-578]|8(?:[2469]|3[278]|54(?:4|5[13-7]|6[89])|86[3-6]))|2(?:2[24-9]|3[1-59]|47)|38(?:[58][78]|7[378])|3(?:454|85[56])[46]|3(?:4(?:36|5[56])|8(?:[38]5|76))[4-6]`,
              ],
              `0$1`,
              1,
            ],
            [`(\\d{2})(\\d{4})(\\d{4})`, `$1 $2-$3`, [`1`], `0$1`, 1],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1-$2-$3`, [`[68]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2-$3`, [`[23]`], `0$1`, 1],
            [
              `(\\d)(\\d{4})(\\d{2})(\\d{4})`,
              `$2 15-$3-$4`,
              [
                `9(?:2[2-469]|3[3-578])`,
                `9(?:2(?:2[024-9]|3[0-59]|47|6[245]|9[02-8])|3(?:3[28]|4[03-9]|5[2-46-8]|7[1-578]|8[2-9]))`,
                `9(?:2(?:[23]02|6(?:[25]|4[6-8])|9(?:[02356]|4[02568]|72|8[23]))|3(?:3[28]|4(?:[04679]|3[5-8]|5[4-68]|8[2379])|5(?:[2467]|3[237]|8[2-5])|7[1-578]|8(?:[2469]|3[2578]|5[4-8]|7[36-8]|8[5-8])))|92(?:2[24-9]|3[1-59]|47)`,
                `9(?:2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3[78]|5(?:4[46]|8)|8[2379])|5(?:[2467]|3[237]|8[23])|7[1-578]|8(?:[2469]|3[278]|5(?:[56][46]|[78])|7[378]|8(?:6[3-6]|[78]))))|92(?:2[24-9]|3[1-59]|47)|93(?:4[35][56]|58[45]|8(?:[38]5|54|76))[4-6]`,
                `9(?:2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3(?:5(?:4[0-25689]|[56])|[78])|5(?:4[46]|8)|8[2379])|5(?:[2467]|3[237]|8(?:[23]|4(?:[45]|60)|5(?:4[0-39]|5|64)))|7[1-578]|8(?:[2469]|3[278]|5(?:4(?:4|5[13-7]|6[89])|[56][46]|[78])|7[378]|8(?:6[3-6]|[78]))))|92(?:2[24-9]|3[1-59]|47)|93(?:4(?:36|5[56])|8(?:[38]5|76))[4-6]`,
              ],
              `0$1`,
              0,
              `$1 $2 $3-$4`,
            ],
            [`(\\d)(\\d{2})(\\d{4})(\\d{4})`, `$2 15-$3-$4`, [`91`], `0$1`, 0, `$1 $2 $3-$4`],
            [`(\\d{3})(\\d{3})(\\d{5})`, `$1-$2-$3`, [`8`], `0$1`],
            [`(\\d)(\\d{3})(\\d{3})(\\d{4})`, `$2 15-$3-$4`, [`9`], `0$1`, 0, `$1 $2 $3-$4`],
          ],
          `0`,
          0,
          `0?(?:(11|2(?:2(?:02?|[13]|2[13-79]|4[1-6]|5[2457]|6[124-8]|7[1-4]|8[13-6]|9[1267])|3(?:02?|1[467]|2[03-6]|3[13-8]|[49][2-6]|5[2-8]|[67])|4(?:7[3-578]|9)|6(?:[0136]|2[24-6]|4[6-8]?|5[15-8])|80|9(?:0[1-3]|[19]|2\\d|3[1-6]|4[02568]?|5[2-4]|6[2-46]|72?|8[23]?))|3(?:3(?:2[79]|6|8[2578])|4(?:0[0-24-9]|[12]|3[5-8]?|4[24-7]|5[4-68]?|6[02-9]|7[126]|8[2379]?|9[1-36-8])|5(?:1|2[1245]|3[237]?|4[1-46-9]|6[2-4]|7[1-6]|8[2-5]?)|6[24]|7(?:[069]|1[1568]|2[15]|3[145]|4[13]|5[14-8]|7[2-57]|8[126])|8(?:[01]|2[15-7]|3[2578]?|4[13-6]|5[4-8]?|6[1-357-9]|7[36-8]?|8[5-8]?|9[124])))15)?`,
          `9$1`,
        ],
        AS: [
          `1`,
          `011`,
          `(?:[58]\\d\\d|684|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([267]\\d{6})$|1`,
          `684$1`,
          0,
          `684`,
        ],
        AT: [
          `43`,
          `00`,
          `1\\d{3,12}|2\\d{6,12}|43(?:(?:0\\d|5[02-9])\\d{3,9}|2\\d{4,5}|[3467]\\d{4}|8\\d{4,6}|9\\d{4,7})|5\\d{4,12}|8\\d{7,12}|9\\d{8,12}|(?:[367]\\d|4[0-24-9])\\d{4,11}`,
          [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
          [
            [`(\\d)(\\d{3,12})`, `$1 $2`, [`1(?:11|[2-9])`], `0$1`],
            [`(\\d{3})(\\d{2})`, `$1 $2`, [`517`], `0$1`],
            [`(\\d{2})(\\d{3,5})`, `$1 $2`, [`5[079]`], `0$1`],
            [
              `(\\d{3})(\\d{3,10})`,
              `$1 $2`,
              [
                `(?:31|4)6|51|6(?:48|5[0-3579]|[6-9])|7(?:20|32|8)|[89]`,
                `(?:31|4)6|51|6(?:485|5[0-3579]|[6-9])|7(?:20|32|8)|[89]`,
              ],
              `0$1`,
            ],
            [`(\\d{4})(\\d{3,9})`, `$1 $2`, [`[2-467]|5[2-6]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`5`], `0$1`],
            [`(\\d{2})(\\d{4})(\\d{4,7})`, `$1 $2 $3`, [`5`], `0$1`],
          ],
          `0`,
        ],
        AU: [
          `61`,
          `001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011`,
          `1(?:[0-79]\\d{7}(?:\\d(?:\\d{2})?)?|8[0-24-9]\\d{7})|[2-478]\\d{8}|1\\d{4,7}`,
          [5, 6, 7, 8, 9, 10, 12],
          [
            [`(\\d{2})(\\d{3,4})`, `$1 $2`, [`16`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{2,4})`, `$1 $2 $3`, [`16`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`14|4`], `0$1`],
            [`(\\d)(\\d{4})(\\d{4})`, `$1 $2 $3`, [`[2378]`], `(0$1)`],
            [`(\\d{4})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`1(?:30|[89])`]],
          ],
          `0`,
          0,
          `(183[12])|0`,
          0,
          0,
          0,
          [
            [
              `(?:(?:241|349)0\\d\\d|8(?:51(?:0(?:0[03-9]|[12479]\\d|3[2-9]|5[0-8]|6[1-9]|8[0-7])|1(?:[0235689]\\d|1[0-69]|4[0-589]|7[0-47-9])|2(?:0[0-79]|[18][13579]|2[14-9]|3[0-46-9]|[4-6]\\d|7[89]|9[0-4])|[34]\\d\\d)|91(?:(?:[0-58]\\d|6[0135-9])\\d|7(?:0[0-24-9]|[1-9]\\d)|9(?:[0-46-9]\\d|5[0-79]))))\\d{3}|(?:2(?:[0-26-9]\\d|3[0-8]|4[02-9]|5[0135-9])|3(?:[0-3589]\\d|4[0-578]|6[1-9]|7[0-35-9])|7(?:[013-57-9]\\d|2[0-8])|8(?:55|6[0-8]|[78]\\d|9[02-9]))\\d{6}`,
              [9],
            ],
            [
              `4(?:79[01]|83[0-36-9]|95[0-3])\\d{5}|4(?:[0-36]\\d|4[047-9]|[58][0-24-9]|7[02-8]|9[0-47-9])\\d{6}`,
              [9],
            ],
            [`180(?:0\\d{3}|2)\\d{3}`, [7, 10]],
            [`190[0-26]\\d{6}`, [10]],
            0,
            0,
            0,
            [`163\\d{2,6}`, [5, 6, 7, 8, 9]],
            [`14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}`, [9]],
            [`13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}`, [6, 8, 10, 12]],
          ],
          `0011`,
        ],
        AW: [
          `297`,
          `00`,
          `(?:[25-79]\\d\\d|800)\\d{4}`,
          [7],
          [[`(\\d{3})(\\d{4})`, `$1 $2`, [`[25-9]`]]],
        ],
        AX: [
          `358`,
          `00|99(?:[01469]|5(?:[14]1|3[23]|5[59]|77|88|9[09]))`,
          `2\\d{4,9}|35\\d{4,5}|(?:60\\d\\d|800)\\d{4,6}|7\\d{5,11}|(?:[14]\\d|3[0-46-9]|50)\\d{4,8}`,
          [5, 6, 7, 8, 9, 10, 11, 12],
          0,
          `0`,
          0,
          0,
          0,
          0,
          `18`,
          0,
          `00`,
        ],
        AZ: [
          `994`,
          `00`,
          `365\\d{6}|(?:[124579]\\d|60|88)\\d{7}`,
          [9],
          [
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`90`], `0$1`],
            [
              `(\\d{2})(\\d{3})(\\d{2})(\\d{2})`,
              `$1 $2 $3 $4`,
              [`1[28]|2|365|46`, `1[28]|2|365[45]|46`, `1[28]|2|365(?:4|5[02])|46`],
              `(0$1)`,
            ],
            [`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[13-9]`], `0$1`],
          ],
          `0`,
        ],
        BA: [
          `387`,
          `00`,
          `6\\d{8}|(?:[35689]\\d|49|70)\\d{6}`,
          [8, 9],
          [
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`6[1-3]|[7-9]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2-$3`, [`[3-5]|6[56]`], `0$1`],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{3})`, `$1 $2 $3 $4`, [`6`], `0$1`],
          ],
          `0`,
        ],
        BB: [
          `1`,
          `011`,
          `(?:246|[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-9]\\d{6})$|1`,
          `246$1`,
          0,
          `246`,
        ],
        BD: [
          `880`,
          `00`,
          `[1-469]\\d{9}|8[0-79]\\d{7,8}|[2-79]\\d{8}|[2-9]\\d{7}|[3-9]\\d{6}|[57-9]\\d{5}`,
          [6, 7, 8, 9, 10],
          [
            [`(\\d{2})(\\d{4,6})`, `$1-$2`, [`31[5-8]|[459]1`], `0$1`],
            [
              `(\\d{3})(\\d{3,7})`,
              `$1-$2`,
              [
                `3(?:[67]|8[013-9])|4(?:6[168]|7|[89][18])|5(?:6[128]|9)|6(?:[15]|28|4[14])|7[2-589]|8(?:0[014-9]|[12])|9[358]|(?:3[2-5]|4[235]|5[2-578]|6[0389]|76|8[3-7]|9[24])1|(?:44|66)[01346-9]`,
              ],
              `0$1`,
            ],
            [`(\\d{4})(\\d{3,6})`, `$1-$2`, [`[13-9]|2[23]`], `0$1`],
            [`(\\d)(\\d{7,8})`, `$1-$2`, [`2`], `0$1`],
          ],
          `0`,
        ],
        BE: [
          `32`,
          `00`,
          `4\\d{8}|[1-9]\\d{7}`,
          [8, 9],
          [
            [`(\\d{3})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`(?:80|9)0`], `0$1`],
            [`(\\d)(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[239]|4[23]`], `0$1`],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[15-8]`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`4`], `0$1`],
          ],
          `0`,
        ],
        BF: [
          `226`,
          `00`,
          `[024-7]\\d{7}`,
          [8],
          [[`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[024-7]`]]],
        ],
        BG: [
          `359`,
          `00`,
          `00800\\d{7}|[2-7]\\d{6,7}|[89]\\d{6,8}|2\\d{5}`,
          [6, 7, 8, 9, 12],
          [
            [`(\\d)(\\d)(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`2`], `0$1`],
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`43[1-6]|70[1-9]`], `0$1`],
            [`(\\d)(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`2`], `0$1`],
            [
              `(\\d{2})(\\d{3})(\\d{2,3})`,
              `$1 $2 $3`,
              [`[356]|4[124-7]|7[1-9]|8[1-6]|9[1-7]`],
              `0$1`,
            ],
            [`(\\d{3})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`(?:70|8)0`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{2})`, `$1 $2 $3`, [`43[1-7]|7`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[48]|9[08]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`9`], `0$1`],
          ],
          `0`,
        ],
        BH: [
          `973`,
          `00`,
          `[136-9]\\d{7}`,
          [8],
          [[`(\\d{4})(\\d{4})`, `$1 $2`, [`[13679]|8[02-4679]`]]],
        ],
        BI: [
          `257`,
          `00`,
          `(?:[267]\\d|31)\\d{6}`,
          [8],
          [[`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[2367]`]]],
        ],
        BJ: [
          `229`,
          `00`,
          `(?:01\\d|8)\\d{7}`,
          [8, 10],
          [
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`8`]],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4 $5`, [`0`]],
          ],
        ],
        BL: [
          `590`,
          `00`,
          `7090\\d{5}|(?:[56]9|[89]\\d)\\d{7}`,
          [9],
          0,
          `0`,
          0,
          0,
          0,
          0,
          0,
          [
            [`(?:59(?:0(?:2[7-9]|3[3-7]|5[12]|87)|87\\d)|80[6-9]\\d\\d)\\d{4}`],
            [`(?:69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))|7090[0-4])\\d{4}`],
            [`80[0-5]\\d{6}`],
            [`8[129]\\d{7}`],
            0,
            0,
            0,
            0,
            [`9(?:(?:39[5-7]|76[018])\\d|475[0-6])\\d{4}`],
          ],
        ],
        BM: [
          `1`,
          `011`,
          `(?:441|[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-9]\\d{6})$|1`,
          `441$1`,
          0,
          `441`,
        ],
        BN: [`673`, `00`, `[2-578]\\d{6}`, [7], [[`(\\d{3})(\\d{4})`, `$1 $2`, [`[2-578]`]]]],
        BO: [
          `591`,
          `00(?:1\\d)?`,
          `(?:[2-7]\\d\\d|8001)\\d{5}`,
          [8, 9],
          [
            [`(\\d)(\\d{7})`, `$1 $2`, [`[23]|4[46]|50`]],
            [`(\\d{8})`, `$1`, [`[5-7]`]],
            [`(\\d{3})(\\d{2})(\\d{4})`, `$1 $2 $3`, [`8`]],
          ],
          `0`,
          0,
          `0(1\\d)?`,
        ],
        BQ: [`599`, `00`, `(?:[34]1|7\\d)\\d{5}`, [7], 0, 0, 0, 0, 0, 0, `[347]`],
        BR: [
          `55`,
          `00(?:1[245]|2[1-35]|31|4[13]|[56]5|99)`,
          `[1-467]\\d{9,10}|55[0-46-9]\\d{8}|[34]\\d{7}|55\\d{7,8}|(?:5[0-46-9]|[89]\\d)\\d{7,9}`,
          [8, 9, 10, 11],
          [
            [`(\\d{4})(\\d{4})`, `$1-$2`, [`300|4(?:0[02]|37|86)`, `300|4(?:0(?:0|20)|370|864)`]],
            [`(\\d{3})(\\d{2,3})(\\d{4})`, `$1 $2 $3`, [`(?:[358]|90)0`], `0$1`],
            [
              `(\\d{2})(\\d{4})(\\d{4})`,
              `$1 $2-$3`,
              [`(?:[14689][1-9]|2[12478]|3[1-578]|5[13-5]|7[13-579])[2-57]`],
              `($1)`,
            ],
            [`(\\d{2})(\\d{5})(\\d{4})`, `$1 $2-$3`, [`[16][1-9]|[2-57-9]`], `($1)`],
          ],
          `0`,
          0,
          `(?:0|90)(?:(1[245]|2[1-35]|31|4[13]|[56]5|99)(\\d{10,11}))?`,
          `$2`,
        ],
        BS: [
          `1`,
          `011`,
          `(?:242|[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([3-8]\\d{6})$|1`,
          `242$1`,
          0,
          `242`,
        ],
        BT: [
          `975`,
          `00`,
          `[178]\\d{7}|[2-8]\\d{6}`,
          [7, 8],
          [
            [`(\\d)(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[2-6]|7[246]|8[2-4]`]],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`1[67]|[78]`]],
          ],
        ],
        BW: [
          `267`,
          `00`,
          `(?:0800|(?:[37]|800)\\d)\\d{6}|(?:[2-6]\\d|90)\\d{5}`,
          [7, 8, 10],
          [
            [`(\\d{2})(\\d{5})`, `$1 $2`, [`90`]],
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`[24-6]|3[15-9]`]],
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[37]`]],
            [`(\\d{4})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`0`]],
            [`(\\d{3})(\\d{4})(\\d{3})`, `$1 $2 $3`, [`8`]],
          ],
        ],
        BY: [
          `375`,
          `810`,
          `(?:[12]\\d|33|44|902)\\d{7}|8(?:0[0-79]\\d{5,7}|[1-7]\\d{9})|8(?:1[0-489]|[5-79]\\d)\\d{7}|8[1-79]\\d{6,7}|8[0-79]\\d{5}|8\\d{5}`,
          [6, 7, 8, 9, 10, 11],
          [
            [`(\\d{3})(\\d{3})`, `$1 $2`, [`800`], `8 $1`],
            [`(\\d{3})(\\d{2})(\\d{2,4})`, `$1 $2 $3`, [`800`], `8 $1`],
            [
              `(\\d{4})(\\d{2})(\\d{3})`,
              `$1 $2-$3`,
              [
                `1(?:5[169]|6[3-5]|7[179])|2(?:1[35]|2[34]|3[3-5])`,
                `1(?:5[169]|6(?:3[1-3]|4|5[125])|7(?:1[3-9]|7[0-24-6]|9[2-7]))|2(?:1[35]|2[34]|3[3-5])`,
              ],
              `8 0$1`,
            ],
            [
              `(\\d{3})(\\d{2})(\\d{2})(\\d{2})`,
              `$1 $2-$3-$4`,
              [`1(?:[56]|7[467])|2[1-3]`],
              `8 0$1`,
            ],
            [`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2-$3-$4`, [`[1-4]`], `8 0$1`],
            [`(\\d{3})(\\d{3,4})(\\d{4})`, `$1 $2 $3`, [`[89]`], `8 $1`],
          ],
          `8`,
          0,
          `0|80?`,
          0,
          0,
          0,
          0,
          `8~10`,
        ],
        BZ: [
          `501`,
          `00`,
          `(?:0800\\d|[2-8])\\d{6}`,
          [7, 11],
          [
            [`(\\d{3})(\\d{4})`, `$1-$2`, [`[2-8]`]],
            [`(\\d)(\\d{3})(\\d{4})(\\d{3})`, `$1-$2-$3-$4`, [`0`]],
          ],
        ],
        CA: [
          `1`,
          `011`,
          `[2-9]\\d{9}|3\\d{6}`,
          [7, 10],
          0,
          `1`,
          0,
          0,
          0,
          0,
          0,
          [
            [
              `(?:2(?:04|[23]6|[48]9|5[07]|63)|3(?:06|43|54|6[578]|82)|4(?:03|1[68]|[26]8|3[178]|50|74)|5(?:06|1[49]|48|79|8[147])|6(?:04|[18]3|39|47|72)|7(?:0[59]|42|53|78|8[02])|8(?:[06]7|19|25|7[39])|9(?:0[25]|42))[2-9]\\d{6}`,
              [10],
            ],
            [``, [10]],
            [`8(?:00|33|44|55|66|77|88)[2-9]\\d{6}`, [10]],
            [`900[2-9]\\d{6}`, [10]],
            [
              `52(?:3(?:[2-46-9][02-9]\\d|5(?:[02-46-9]\\d|5[0-46-9]))|4(?:[2-478][02-9]\\d|5(?:[034]\\d|2[024-9]|5[0-46-9])|6(?:0[1-9]|[2-9]\\d)|9(?:[05-9]\\d|2[0-5]|49)))\\d{4}|52[34][2-9]1[02-9]\\d{4}|(?:5(?:2[125-9]|3[23]|44|66|77|88)|6(?:22|33))[2-9]\\d{6}`,
              [10],
            ],
            0,
            [`310\\d{4}`, [7]],
            0,
            [`600[2-9]\\d{6}`, [10]],
          ],
        ],
        CC: [
          `61`,
          `001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011`,
          `1(?:[0-79]\\d{8}(?:\\d{2})?|8[0-24-9]\\d{7})|[148]\\d{8}|1\\d{5,7}`,
          [6, 7, 8, 9, 10, 12],
          0,
          `0`,
          0,
          `([59]\\d{7})$|0`,
          `8$1`,
          0,
          0,
          [
            [
              `8(?:51(?:0(?:02|31|60|89)|1(?:18|76)|223)|91(?:0(?:1[0-2]|29)|1(?:[28]2|50|79)|2(?:10|64)|3(?:[06]8|22)|4[29]8|62\\d|70[23]|959))\\d{3}`,
              [9],
            ],
            [
              `4(?:79[01]|83[0-36-9]|95[0-3])\\d{5}|4(?:[0-36]\\d|4[047-9]|[58][0-24-9]|7[02-8]|9[0-47-9])\\d{6}`,
              [9],
            ],
            [`180(?:0\\d{3}|2)\\d{3}`, [7, 10]],
            [`190[0-26]\\d{6}`, [10]],
            0,
            0,
            0,
            0,
            [`14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}`, [9]],
            [`13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}`, [6, 8, 10, 12]],
          ],
          `0011`,
        ],
        CD: [
          `243`,
          `00`,
          `(?:(?:[189]|5\\d)\\d|2)\\d{7}|[1-68]\\d{6}`,
          [7, 8, 9, 10],
          [
            [`(\\d{2})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`88`], `0$1`],
            [`(\\d{2})(\\d{5})`, `$1 $2`, [`[1-6]`], `0$1`],
            [`(\\d{2})(\\d{2})(\\d{4})`, `$1 $2 $3`, [`2`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`1`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[89]`], `0$1`],
            [`(\\d{2})(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`5`], `0$1`],
          ],
          `0`,
        ],
        CF: [
          `236`,
          `00`,
          `8776\\d{4}|(?:[27]\\d|61)\\d{6}`,
          [8],
          [[`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[26-8]`]]],
        ],
        CG: [
          `242`,
          `00`,
          `222\\d{6}|(?:0\\d|80)\\d{7}`,
          [9],
          [
            [`(\\d)(\\d{4})(\\d{4})`, `$1 $2 $3`, [`8`]],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[02]`]],
          ],
        ],
        CH: [
          `41`,
          `00`,
          `8\\d{11}|[2-9]\\d{8}`,
          [9, 12],
          [
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`8[047]|90`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[2-79]|81`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4 $5`, [`8`], `0$1`],
          ],
          `0`,
        ],
        CI: [
          `225`,
          `00`,
          `[02]\\d{9}`,
          [10],
          [
            [`(\\d{2})(\\d{2})(\\d)(\\d{5})`, `$1 $2 $3 $4`, [`2`]],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{4})`, `$1 $2 $3 $4`, [`0`]],
          ],
        ],
        CK: [`682`, `00`, `[2-578]\\d{4}`, [5], [[`(\\d{2})(\\d{3})`, `$1 $2`, [`[2-578]`]]]],
        CL: [
          `56`,
          `(?:0|1(?:1[0-69]|2[02-5]|5[13-58]|69|7[0167]|8[018]))0`,
          `12300\\d{6}|6\\d{9,10}|[2-9]\\d{8}`,
          [9, 10, 11],
          [
            [`(\\d{5})(\\d{4})`, `$1 $2`, [`219`, `2196`], `($1)`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`60|809`]],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`44`]],
            [`(\\d)(\\d{4})(\\d{4})`, `$1 $2 $3`, [`2[1-36]`], `($1)`],
            [`(\\d)(\\d{4})(\\d{4})`, `$1 $2 $3`, [`9(?:10|[2-9])`]],
            [
              `(\\d{2})(\\d{3})(\\d{4})`,
              `$1 $2 $3`,
              [`3[2-5]|[47]|5[1-3578]|6[13-57]|8(?:0[1-8]|[1-9])`],
              `($1)`,
            ],
            [`(\\d{3})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`60|8`]],
            [`(\\d{4})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`1`]],
            [`(\\d{3})(\\d{3})(\\d{2})(\\d{3})`, `$1 $2 $3 $4`, [`60`]],
          ],
        ],
        CM: [
          `237`,
          `00`,
          `[26]\\d{8}|88\\d{6,7}`,
          [8, 9],
          [
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`88`]],
            [`(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4 $5`, [`[26]|88`]],
          ],
        ],
        CN: [
          `86`,
          `00|1(?:[12]\\d|79)\\d\\d00`,
          `(?:(?:1[03-689]|2\\d)\\d\\d|6)\\d{8}|1\\d{10}|[126]\\d{6}(?:\\d(?:\\d{2})?)?|86\\d{5,6}|(?:[3-579]\\d|8[0-57-9])\\d{5,9}`,
          [7, 8, 9, 10, 11, 12],
          [
            [
              `(\\d{2})(\\d{5,6})`,
              `$1 $2`,
              [
                `(?:10|2[0-57-9])[19]|3(?:[157]|35|49|9[1-68])|4(?:1[124-9]|2[179]|6[47-9]|7|8[23])|5(?:[1357]|2[37]|4[36]|6[1-46]|80)|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:07|1[236-8]|2[5-7]|[37]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|3|4[13]|5[1-5]|7[0-79]|9[0-35-9])|(?:4[35]|59|85)[1-9]`,
                `(?:10|2[0-57-9])(?:1[02]|9[56])|8078|(?:3(?:[157]\\d|35|49|9[1-68])|4(?:1[124-9]|2[179]|[35][1-9]|6[47-9]|7\\d|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[1-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|3\\d|4[13]|5[1-5]|7[0-79]|9[0-35-9]))1`,
                `10(?:1(?:0|23)|9[56])|2[0-57-9](?:1(?:00|23)|9[56])|80781|(?:3(?:[157]\\d|35|49|9[1-68])|4(?:1[124-9]|2[179]|[35][1-9]|6[47-9]|7\\d|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[1-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|3\\d|4[13]|5[1-5]|7[0-79]|9[0-35-9]))12`,
                `10(?:1(?:0|23)|9[56])|2[0-57-9](?:1(?:00|23)|9[56])|807812|(?:3(?:[157]\\d|35|49|9[1-68])|4(?:1[124-9]|2[179]|[35][1-9]|6[47-9]|7\\d|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[1-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|3\\d|4[13]|5[1-5]|7[0-79]|9[0-35-9]))123`,
                `10(?:1(?:0|23)|9[56])|2[0-57-9](?:1(?:00|23)|9[56])|(?:3(?:[157]\\d|35|49|9[1-68])|4(?:1[124-9]|2[179]|[35][1-9]|6[47-9]|7\\d|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:078|1[236-8]|2[5-7]|[37]\\d|5[1-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|3\\d|4[13]|5[1-5]|7[0-79]|9[0-35-9]))123`,
              ],
              `0$1`,
            ],
            [
              `(\\d{3})(\\d{5,6})`,
              `$1 $2`,
              [
                `3(?:[157]|35|49|9[1-68])|4(?:[17]|2[179]|6[47-9]|8[23])|5(?:[1357]|2[37]|4[36]|6[1-46]|80)|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]|4[13]|5[1-5])|(?:4[35]|59|85)[1-9]`,
                `(?:3(?:[157]\\d|35|49|9[1-68])|4(?:[17]\\d|2[179]|[35][1-9]|6[47-9]|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[1-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]\\d|4[13]|5[1-5]))[19]`,
                `85[23](?:10|95)|(?:3(?:[157]\\d|35|49|9[1-68])|4(?:[17]\\d|2[179]|[35][1-9]|6[47-9]|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[14-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]\\d|4[13]|5[1-5]))(?:10|9[56])`,
                `85[23](?:100|95)|(?:3(?:[157]\\d|35|49|9[1-68])|4(?:[17]\\d|2[179]|[35][1-9]|6[47-9]|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[14-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]\\d|4[13]|5[1-5]))(?:100|9[56])`,
              ],
              `0$1`,
            ],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`(?:4|80)0`]],
            [
              `(\\d{2})(\\d{4})(\\d{4})`,
              `$1 $2 $3`,
              [
                `10|2(?:[02-57-9]|1[1-9])`,
                `10|2(?:[02-57-9]|1[1-9])`,
                `10[0-79]|2(?:[02-57-9]|1[1-79])|(?:10|21)8(?:0[1-9]|[1-9])`,
              ],
              `0$1`,
              1,
            ],
            [
              `(\\d{3})(\\d{3})(\\d{4})`,
              `$1 $2 $3`,
              [
                `3(?:[3-59]|7[02-68])|4(?:[26-8]|3[3-9]|5[2-9])|5(?:3[03-9]|[468]|7[028]|9[2-46-9])|6|7(?:[0-247]|3[04-9]|5[0-4689]|6[2368])|8(?:[1-358]|9[1-7])|9(?:[013479]|5[1-5])|(?:[34]1|55|79|87)[02-9]`,
              ],
              `0$1`,
              1,
            ],
            [`(\\d{3})(\\d{7,8})`, `$1 $2`, [`9`]],
            [`(\\d{4})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`80`], `0$1`, 1],
            [`(\\d{3})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`[3-578]`], `0$1`, 1],
            [`(\\d{3})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`1[3-9]`]],
            [`(\\d{2})(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3 $4`, [`[12]`], `0$1`, 1],
          ],
          `0`,
          0,
          `(1(?:[12]\\d|79)\\d\\d)|0`,
          0,
          0,
          0,
          0,
          `00`,
        ],
        CO: [
          `57`,
          `00(?:4(?:[14]4|56)|[579])`,
          `(?:46|60\\d\\d)\\d{6}|(?:1\\d|[39])\\d{9}`,
          [8, 10, 11],
          [
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`46`]],
            [`(\\d{3})(\\d{7})`, `$1 $2`, [`6|90`], `($1)`],
            [`(\\d{3})(\\d{7})`, `$1 $2`, [`3[0-357]|9[14]`]],
            [`(\\d)(\\d{3})(\\d{7})`, `$1-$2-$3`, [`1`], `0$1`, 0, `$1 $2 $3`],
          ],
          `0`,
          0,
          `0([3579]|4(?:[14]4|56))?`,
        ],
        CR: [
          `506`,
          `00`,
          `(?:8\\d|90)\\d{8}|(?:[24-8]\\d{3}|3005)\\d{4}`,
          [8, 10],
          [
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[2-7]|8[3-9]`]],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1-$2-$3`, [`[89]`]],
          ],
          0,
          0,
          `(19(?:0[0-2468]|1[09]|20|66|77|99))`,
        ],
        CU: [
          `53`,
          `119`,
          `(?:[2-7]|8\\d\\d)\\d{7}|[2-47]\\d{6}|[34]\\d{5}`,
          [6, 7, 8, 10],
          [
            [`(\\d{2})(\\d{4,6})`, `$1 $2`, [`2[1-4]|[34]`], `(0$1)`],
            [`(\\d)(\\d{6,7})`, `$1 $2`, [`7`], `(0$1)`],
            [`(\\d)(\\d{7})`, `$1 $2`, [`[56]`], `0$1`],
            [`(\\d{3})(\\d{7})`, `$1 $2`, [`8`], `0$1`],
          ],
          `0`,
        ],
        CV: [
          `238`,
          `0`,
          `(?:[2-59]\\d\\d|800)\\d{4}`,
          [7],
          [[`(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3`, [`[2-589]`]]],
        ],
        CW: [
          `599`,
          `00`,
          `(?:[34]1|60|(?:7|9\\d)\\d)\\d{5}`,
          [7, 8],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`[3467]`]],
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`9[4-8]`]],
          ],
          0,
          0,
          0,
          0,
          0,
          `[69]`,
        ],
        CX: [
          `61`,
          `001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011`,
          `1(?:[0-79]\\d{8}(?:\\d{2})?|8[0-24-9]\\d{7})|[148]\\d{8}|1\\d{5,7}`,
          [6, 7, 8, 9, 10, 12],
          0,
          `0`,
          0,
          `([59]\\d{7})$|0`,
          `8$1`,
          0,
          0,
          [
            [
              `8(?:51(?:0(?:01|30|59|88)|1(?:17|46|75)|2(?:22|35))|91(?:00[6-9]|1(?:[28]1|49|78)|2(?:09|63)|3(?:12|26|75)|4(?:56|97)|64\\d|7(?:0[01]|1[0-2])|958))\\d{3}`,
              [9],
            ],
            [
              `4(?:79[01]|83[0-36-9]|95[0-3])\\d{5}|4(?:[0-36]\\d|4[047-9]|[58][0-24-9]|7[02-8]|9[0-47-9])\\d{6}`,
              [9],
            ],
            [`180(?:0\\d{3}|2)\\d{3}`, [7, 10]],
            [`190[0-26]\\d{6}`, [10]],
            0,
            0,
            0,
            0,
            [`14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}`, [9]],
            [`13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}`, [6, 8, 10, 12]],
          ],
          `0011`,
        ],
        CY: [
          `357`,
          `00`,
          `(?:[279]\\d|[58]0)\\d{6}`,
          [8],
          [[`(\\d{2})(\\d{6})`, `$1 $2`, [`[257-9]`]]],
        ],
        CZ: [
          `420`,
          `00`,
          `(?:[2-578]\\d|60)\\d{7}|9\\d{8,11}`,
          [9, 10, 11, 12],
          [
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[2-8]|9[015-7]`]],
            [`(\\d{2})(\\d{3})(\\d{3})(\\d{2})`, `$1 $2 $3 $4`, [`96`]],
            [`(\\d{2})(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`9`]],
            [`(\\d{3})(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`9`]],
          ],
        ],
        DE: [
          `49`,
          `00`,
          `[2579]\\d{5,14}|49(?:[34]0|69|8\\d)\\d\\d?|49(?:37|49|60|7[089]|9\\d)\\d{1,3}|49(?:2[024-9]|3[2-689]|7[1-7])\\d{1,8}|(?:1|[368]\\d|4[0-8])\\d{3,13}|49(?:[015]\\d|2[13]|31|[46][1-8])\\d{1,9}`,
          [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          [
            [`(\\d{2})(\\d{3,13})`, `$1 $2`, [`3[02]|40|[68]9`], `0$1`],
            [
              `(\\d{3})(\\d{3,12})`,
              `$1 $2`,
              [
                `2(?:0[1-389]|1[124]|2[18]|3[14])|3(?:[35-9][15]|4[015])|906|(?:2[4-9]|4[2-9]|[579][1-9]|[68][1-8])1`,
                `2(?:0[1-389]|12[0-8])|3(?:[35-9][15]|4[015])|906|2(?:[13][14]|2[18])|(?:2[4-9]|4[2-9]|[579][1-9]|[68][1-8])1`,
              ],
              `0$1`,
            ],
            [
              `(\\d{4})(\\d{2,11})`,
              `$1 $2`,
              [
                `[24-6]|3(?:[3569][02-46-9]|4[2-4679]|7[2-467]|8[2-46-8])|70[2-8]|8(?:0[2-9]|[1-8])|90[7-9]|[79][1-9]`,
                `[24-6]|3(?:3(?:0[1-467]|2[127-9]|3[124578]|7[1257-9]|8[1256]|9[145])|4(?:2[135]|4[13578]|9[1346])|5(?:0[14]|2[1-3589]|6[1-4]|7[13468]|8[13568])|6(?:2[1-489]|3[124-6]|6[13]|7[12579]|8[1-356]|9[135])|7(?:2[1-7]|4[145]|6[1-5]|7[1-4])|8(?:21|3[1468]|6|7[1467]|8[136])|9(?:0[12479]|2[1358]|4[134679]|6[1-9]|7[136]|8[147]|9[1468]))|70[2-8]|8(?:0[2-9]|[1-8])|90[7-9]|[79][1-9]|3[68]4[1347]|3(?:47|60)[1356]|3(?:3[46]|46|5[49])[1246]|3[4579]3[1357]`,
              ],
              `0$1`,
            ],
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`138`], `0$1`],
            [`(\\d{5})(\\d{2,10})`, `$1 $2`, [`3`], `0$1`],
            [`(\\d{3})(\\d{5,11})`, `$1 $2`, [`181`], `0$1`],
            [`(\\d{3})(\\d)(\\d{4,10})`, `$1 $2 $3`, [`1(?:3|80)|9`], `0$1`],
            [`(\\d{3})(\\d{7,8})`, `$1 $2`, [`1[67]`], `0$1`],
            [`(\\d{3})(\\d{7,12})`, `$1 $2`, [`8`], `0$1`],
            [`(\\d{5})(\\d{6})`, `$1 $2`, [`185`, `1850`, `18500`], `0$1`],
            [`(\\d{3})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`7`], `0$1`],
            [`(\\d{4})(\\d{7})`, `$1 $2`, [`18[68]`], `0$1`],
            [`(\\d{4})(\\d{7})`, `$1 $2`, [`15[1279]`], `0$1`],
            [`(\\d{5})(\\d{6})`, `$1 $2`, [`15[03568]`, `15(?:[0568]|3[13])`], `0$1`],
            [`(\\d{3})(\\d{8})`, `$1 $2`, [`18`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{7,8})`, `$1 $2 $3`, [`1(?:6[023]|7)`], `0$1`],
            [`(\\d{4})(\\d{2})(\\d{7})`, `$1 $2 $3`, [`15[279]`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{8})`, `$1 $2 $3`, [`15`], `0$1`],
          ],
          `0`,
        ],
        DJ: [
          `253`,
          `00`,
          `(?:2\\d|77)\\d{6}`,
          [8],
          [[`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[27]`]]],
        ],
        DK: [
          `45`,
          `00`,
          `[2-9]\\d{7}`,
          [8],
          [[`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[2-9]`]]],
        ],
        DM: [
          `1`,
          `011`,
          `(?:[58]\\d\\d|767|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-7]\\d{6})$|1`,
          `767$1`,
          0,
          `767`,
        ],
        DO: [`1`, `011`, `(?:[58]\\d\\d|900)\\d{7}`, [10], 0, `1`, 0, 0, 0, 0, `8001|8[024]9`],
        DZ: [
          `213`,
          `00`,
          `(?:[1-4]|[5-79]\\d|80)\\d{7}`,
          [8, 9],
          [
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[1-4]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`9`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[5-8]`], `0$1`],
          ],
          `0`,
        ],
        EC: [
          `593`,
          `00`,
          `1\\d{9,10}|(?:[2-7]|9\\d)\\d{7}`,
          [8, 9, 10, 11],
          [
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2-$3`, [`[2-7]`], `(0$1)`, 0, `$1-$2-$3`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`9`], `0$1`],
            [`(\\d{4})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`1`]],
          ],
          `0`,
        ],
        EE: [
          `372`,
          `00`,
          `8\\d{9}|[4578]\\d{7}|(?:[3-8]\\d|90)\\d{5}`,
          [7, 8, 10],
          [
            [
              `(\\d{3})(\\d{4})`,
              `$1 $2`,
              [
                `[369]|4[3-8]|5(?:[0-2]|5[0-478]|6[45])|7[1-9]|88`,
                `[369]|4[3-8]|5(?:[02]|1(?:[0-8]|95)|5[0-478]|6(?:4[0-4]|5[1-589]))|7[1-9]|88`,
              ],
            ],
            [`(\\d{4})(\\d{3,4})`, `$1 $2`, [`[45]|8(?:00|[1-49])`, `[45]|8(?:00[1-9]|[1-49])`]],
            [`(\\d{2})(\\d{2})(\\d{4})`, `$1 $2 $3`, [`7`]],
            [`(\\d{4})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`8`]],
          ],
        ],
        EG: [
          `20`,
          `00`,
          `[189]\\d{8,9}|[24-6]\\d{8}|[135]\\d{7}`,
          [8, 9, 10],
          [
            [`(\\d)(\\d{7,8})`, `$1 $2`, [`[23]`], `0$1`],
            [`(\\d{2})(\\d{6,7})`, `$1 $2`, [`1[35]|[4-6]|8[2468]|9[235-7]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[89]`], `0$1`],
            [`(\\d{2})(\\d{8})`, `$1 $2`, [`1`], `0$1`],
          ],
          `0`,
        ],
        EH: [
          `212`,
          `00`,
          `[5-8]\\d{8}`,
          [9],
          0,
          `0`,
          0,
          0,
          0,
          0,
          0,
          [
            [`528[89]\\d{5}`],
            [`(?:6(?:[0-79]\\d|8[0-247-9])|7(?:[016-8]\\d|2[0-8]|3[01]|5[0-5]))\\d{6}`],
            [`80[0-7]\\d{6}`],
            [`89\\d{7}`],
            0,
            0,
            0,
            0,
            [`(?:592(?:4[0-2]|93)|80[89]\\d\\d)\\d{4}`],
          ],
        ],
        ER: [
          `291`,
          `00`,
          `[178]\\d{6}`,
          [7],
          [[`(\\d)(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[178]`], `0$1`]],
          `0`,
        ],
        ES: [
          `34`,
          `00`,
          `(?:400|[5-9]\\d\\d)\\d{6}`,
          [9],
          [
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[89]00`]],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[4-9]`]],
          ],
        ],
        ET: [
          `251`,
          `00`,
          `(?:11|[2-57-9]\\d)\\d{7}`,
          [9],
          [[`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[1-57-9]`], `0$1`]],
          `0`,
        ],
        FI: [
          `358`,
          `00|99(?:[01469]|5(?:[14]1|3[23]|5[59]|77|88|9[09]))`,
          `[1-35689]\\d{4}|7\\d{10,11}|(?:[124-7]\\d|3[0-46-9])\\d{8}|[1-9]\\d{5,8}`,
          [5, 6, 7, 8, 9, 10, 11, 12],
          [
            [`(\\d{5})`, `$1`, [`20[2-59]`], `0$1`],
            [`(\\d{3})(\\d{3,7})`, `$1 $2`, [`(?:[1-3]0|[68])0|70[07-9]`], `0$1`],
            [`(\\d{2})(\\d{4,8})`, `$1 $2`, [`[14]|2[09]|50|7[135]`], `0$1`],
            [`(\\d{2})(\\d{6,10})`, `$1 $2`, [`7`], `0$1`],
            [`(\\d)(\\d{4,9})`, `$1 $2`, [`(?:19|[2568])[1-8]|3(?:0[1-9]|[1-9])|9`], `0$1`],
          ],
          `0`,
          0,
          0,
          0,
          0,
          `1[03-79]|[2-9]`,
          0,
          `00`,
        ],
        FJ: [
          `679`,
          `0(?:0|52)`,
          `45\\d{5}|(?:0800\\d|[235-9])\\d{6}`,
          [7, 11],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`[235-9]|45`]],
            [`(\\d{4})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`0`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
        ],
        FK: [`500`, `00`, `[2-7]\\d{4}`, [5]],
        FM: [
          `691`,
          `00`,
          `(?:[39]\\d\\d|820)\\d{4}`,
          [7],
          [[`(\\d{3})(\\d{4})`, `$1 $2`, [`[389]`]]],
        ],
        FO: [
          `298`,
          `00`,
          `[2-9]\\d{5}`,
          [6],
          [[`(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3`, [`[2-9]`]]],
          0,
          0,
          `(10(?:01|[12]0|88))`,
        ],
        FR: [
          `33`,
          `00`,
          `[1-9]\\d{8}`,
          [9],
          [
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`8`], `0 $1`],
            [`(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4 $5`, [`[1-79]`], `0$1`],
          ],
          `0`,
        ],
        GA: [
          `241`,
          `00`,
          `(?:[067]\\d|11)\\d{6}|[2-7]\\d{6}`,
          [7, 8],
          [
            [`(\\d)(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[2-7]`], `0$1`],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`0`]],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`11|[67]`], `0$1`],
          ],
          0,
          0,
          `0(11\\d{6}|60\\d{6}|61\\d{6}|6[256]\\d{6}|7[467]\\d{6})`,
          `$1`,
        ],
        GB: [
          `44`,
          `00`,
          `[1-357-9]\\d{9}|[18]\\d{8}|8\\d{6}`,
          [7, 9, 10],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`800`, `8001`, `80011`, `800111`, `8001111`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3`, [`845`, `8454`, `84546`, `845464`], `0$1`],
            [`(\\d{3})(\\d{6})`, `$1 $2`, [`800`], `0$1`],
            [
              `(\\d{5})(\\d{4,5})`,
              `$1 $2`,
              [
                `1(?:38|5[23]|69|76|94)`,
                `1(?:(?:38|69)7|5(?:24|39)|768|946)`,
                `1(?:3873|5(?:242|39[4-6])|(?:697|768)[347]|9467)`,
              ],
              `0$1`,
            ],
            [`(\\d{4})(\\d{5,6})`, `$1 $2`, [`1(?:[2-69][02-9]|[78])`], `0$1`],
            [
              `(\\d{2})(\\d{4})(\\d{4})`,
              `$1 $2 $3`,
              [`[25]|7(?:0|6[02-9])`, `[25]|7(?:0|6(?:[03-9]|2[356]))`],
              `0$1`,
            ],
            [`(\\d{4})(\\d{6})`, `$1 $2`, [`7`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[1389]`], `0$1`],
          ],
          `0`,
          0,
          `0|180020`,
          0,
          0,
          0,
          [
            [
              `(?:1(?:1(?:3(?:[0-58]\\d\\d|73[0-5])|4(?:(?:[0-5]\\d|70)\\d|69[7-9])|(?:(?:5[0-26-9]|[78][0-49])\\d|6(?:[0-4]\\d|5[01]))\\d)|(?:2(?:(?:0[024-9]|2[3-9]|3[3-79]|4[1-689]|[58][02-9]|6[0-47-9]|7[013-9]|9\\d)\\d|1(?:[0-7]\\d|8[0-3]))|(?:3(?:0\\d|1[0-8]|[25][02-9]|3[02-579]|[468][0-46-9]|7[1-35-79]|9[2-578])|4(?:0[03-9]|[137]\\d|[28][02-57-9]|4[02-69]|5[0-8]|[69][0-79])|5(?:0[1-35-9]|[16]\\d|2[024-9]|3[015689]|4[02-9]|5[03-9]|7[0-35-9]|8[0-468]|9[0-57-9])|6(?:0[034689]|1\\d|2[0-35689]|[38][013-9]|4[1-467]|5[0-69]|6[13-9]|7[0-8]|9[0-24578])|7(?:0[0246-9]|2\\d|3[0236-8]|4[03-9]|5[0-46-9]|6[013-9]|7[0-35-9]|8[024-9]|9[02-9])|8(?:0[35-9]|2[1-57-9]|3[02-578]|4[0-578]|5[124-9]|6[2-69]|7\\d|8[02-9]|9[02569])|9(?:0[02-589]|[18]\\d|2[02-689]|3[1-57-9]|4[2-9]|5[0-579]|6[2-47-9]|7[0-24578]|9[2-57]))\\d)\\d)|2(?:0[013478]|3[0189]|4[017]|8[0-46-9]|9[0-2])\\d{3})\\d{4}|1(?:2(?:0(?:46[1-4]|87[2-9])|545[1-79]|76(?:2\\d|3[1-8]|6[1-6])|9(?:7(?:2[0-4]|3[2-5])|8(?:2[2-8]|7[0-47-9]|8[3-5])))|3(?:6(?:38[2-5]|47[23])|8(?:47[04-9]|64[0157-9]))|4(?:044[1-7]|20(?:2[23]|8\\d)|6(?:0(?:30|5[2-57]|6[1-8]|7[2-8])|140)|8(?:052|87[1-3]))|5(?:2(?:4(?:3[2-79]|6\\d)|76\\d)|6(?:26[06-9]|686))|6(?:06(?:4\\d|7[4-79])|295[5-7]|35[34]\\d|47(?:24|61)|59(?:5[08]|6[67]|74)|9(?:55[0-4]|77[23]))|7(?:26(?:6[13-9]|7[0-7])|(?:442|688)\\d|50(?:2[0-3]|[3-68]2|76))|8(?:27[56]\\d|37(?:5[2-5]|8[239])|843[2-58])|9(?:0(?:0(?:6[1-8]|85)|52\\d)|3583|4(?:66[1-8]|9(?:2[01]|81))|63(?:23|3[1-4])|9561))\\d{3}`,
              [9, 10],
            ],
            [
              `7(?:457[0-57-9]|700[01]|911[028])\\d{5}|7(?:[1-3]\\d\\d|4(?:[0-46-9]\\d|5[0-689])|5(?:0[0-8]|[13-9]\\d|2[0-35-9])|7(?:0[1-9]|[1-7]\\d|8[02-9]|9[0-689])|8(?:[014-9]\\d|[23][0-8])|9(?:[024-9]\\d|1[02-9]|3[0-689]))\\d{6}`,
              [10],
            ],
            [`80[08]\\d{7}|800\\d{6}|8001111`],
            [`(?:8(?:4[2-5]|7[0-3])|9(?:[01]\\d|8[2-49]))\\d{7}|845464\\d`, [7, 10]],
            [`70\\d{8}`, [10]],
            0,
            [`(?:3[0347]|55)\\d{8}`, [10]],
            [
              `76(?:464|652)\\d{5}|76(?:0[0-28]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}`,
              [10],
            ],
            [`56\\d{8}`, [10]],
          ],
          0,
          ` x`,
        ],
        GD: [
          `1`,
          `011`,
          `(?:473|[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-9]\\d{6})$|1`,
          `473$1`,
          0,
          `473`,
        ],
        GE: [
          `995`,
          `00`,
          `(?:[3-57]\\d\\d|800)\\d{6}`,
          [9],
          [
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`70`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`32`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[57]`]],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[348]`], `0$1`],
          ],
          `0`,
        ],
        GF: [
          `594`,
          `00`,
          `(?:694\\d|7093)\\d{5}|(?:59|[89]\\d)\\d{7}`,
          [9],
          [
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[5-7]|80[6-9]|9[47]`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[89]`], `0$1`],
          ],
          `0`,
        ],
        GG: [
          `44`,
          `00`,
          `(?:1481|[357-9]\\d{3})\\d{6}|8\\d{6}(?:\\d{2})?`,
          [7, 9, 10],
          0,
          `0`,
          0,
          `([25-9]\\d{5})$|0|180020`,
          `1481$1`,
          0,
          0,
          [
            [`1481[25-9]\\d{5}`, [10]],
            [`7(?:(?:781|839)\\d|911[17])\\d{5}`, [10]],
            [`80[08]\\d{7}|800\\d{6}|8001111`],
            [`(?:8(?:4[2-5]|7[0-3])|9(?:[01]\\d|8[0-3]))\\d{7}|845464\\d`, [7, 10]],
            [`70\\d{8}`, [10]],
            0,
            [`(?:3[0347]|55)\\d{8}`, [10]],
            [
              `76(?:464|652)\\d{5}|76(?:0[0-28]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}`,
              [10],
            ],
            [`56\\d{8}`, [10]],
          ],
        ],
        GH: [
          `233`,
          `00`,
          `[235]\\d{8}|800\\d{5,6}`,
          [8, 9],
          [
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`8`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[2358]`], `0$1`],
          ],
          `0`,
        ],
        GI: [`350`, `00`, `(?:[25]\\d|60)\\d{6}`, [8], [[`(\\d{3})(\\d{5})`, `$1 $2`, [`2`]]]],
        GL: [
          `299`,
          `00`,
          `(?:19|[2-689]\\d|70)\\d{4}`,
          [6],
          [[`(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3`, [`19|[2-9]`]]],
        ],
        GM: [
          `220`,
          `00`,
          `[48]\\d{8}|[2-9]\\d{6}`,
          [7, 9],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`[235-9]|4(?:[0-35]|4[16-9])`]],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[48]`]],
          ],
        ],
        GN: [
          `224`,
          `00`,
          `722\\d{6}|(?:3|6\\d)\\d{7}`,
          [8, 9],
          [
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`3`]],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[67]`]],
          ],
        ],
        GP: [
          `590`,
          `00`,
          `7090\\d{5}|(?:[56]9|[89]\\d)\\d{7}`,
          [9],
          [
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[5-79]|80[6-9]`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`8`], `0$1`],
          ],
          `0`,
          0,
          0,
          0,
          0,
          0,
          [
            [
              `(?:59(?:0(?:0[1-68]|[14][0-24-9]|2[0-68]|3[1-9]|5[3-579]|[68][0-689]|7[08]|9\\d)|87\\d)|80[6-9]\\d\\d)\\d{4}`,
            ],
            [`(?:69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))|7090[0-4])\\d{4}`],
            [`80[0-5]\\d{6}`],
            [`8[129]\\d{7}`],
            0,
            0,
            0,
            0,
            [`9(?:(?:39[5-7]|76[018])\\d|475[0-6])\\d{4}`],
          ],
        ],
        GQ: [
          `240`,
          `00`,
          `222\\d{6}|(?:3\\d|55|[89]0)\\d{7}`,
          [9],
          [
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[235]`]],
            [`(\\d{3})(\\d{6})`, `$1 $2`, [`[89]`]],
          ],
        ],
        GR: [
          `30`,
          `00`,
          `5005000\\d{3}|8\\d{9,11}|(?:[269]\\d|70)\\d{8}`,
          [10, 11, 12],
          [
            [`(\\d{2})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`21|7`]],
            [
              `(\\d{4})(\\d{6})`,
              `$1 $2`,
              [`2(?:2|3[2-57-9]|4[2-469]|5[2-59]|6[2-9]|7[2-69]|8[2-49])|5`],
            ],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[2689]`]],
            [`(\\d{3})(\\d{3,4})(\\d{5})`, `$1 $2 $3`, [`8`]],
          ],
        ],
        GT: [
          `502`,
          `00`,
          `80\\d{6}|(?:1\\d{3}|[2-7])\\d{7}`,
          [8, 11],
          [
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[2-8]`]],
            [`(\\d{4})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`1`]],
          ],
        ],
        GU: [
          `1`,
          `011`,
          `(?:[58]\\d\\d|671|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-9]\\d{6})$|1`,
          `671$1`,
          0,
          `671`,
        ],
        GW: [
          `245`,
          `00`,
          `[49]\\d{8}|4\\d{6}`,
          [7, 9],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`40`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[49]`]],
          ],
        ],
        GY: [
          `592`,
          `001`,
          `(?:[2-8]\\d{3}|9008)\\d{3}`,
          [7],
          [[`(\\d{3})(\\d{4})`, `$1 $2`, [`[2-9]`]]],
        ],
        HK: [
          `852`,
          `00(?:30|5[09]|[126-9]?)`,
          `8[0-46-9]\\d{6,7}|9\\d{4,7}|(?:[2-7]|9\\d{3})\\d{7}`,
          [5, 6, 7, 8, 9, 11],
          [
            [`(\\d{3})(\\d{2,5})`, `$1 $2`, [`900`, `9003`]],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[2-7]|8[1-4]|9(?:0[1-9]|[1-8])`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`8`]],
            [`(\\d{3})(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`9`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
        ],
        HN: [
          `504`,
          `00`,
          `8\\d{10}|[237-9]\\d{7}`,
          [8, 11],
          [[`(\\d{4})(\\d{4})`, `$1-$2`, [`[237-9]`]]],
        ],
        HR: [
          `385`,
          `00`,
          `[2-69]\\d{8}|80\\d{5,7}|[1-79]\\d{7}|6\\d{6}`,
          [7, 8, 9],
          [
            [`(\\d{2})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`6[01]`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{2,3})`, `$1 $2 $3`, [`8`], `0$1`],
            [`(\\d)(\\d{4})(\\d{3})`, `$1 $2 $3`, [`1`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`6|7[245]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`9`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[2-57]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`8`], `0$1`],
          ],
          `0`,
        ],
        HT: [
          `509`,
          `00`,
          `[2-589]\\d{7}`,
          [8],
          [[`(\\d{2})(\\d{2})(\\d{4})`, `$1 $2 $3`, [`[2-589]`]]],
        ],
        HU: [
          `36`,
          `00`,
          `[235-7]\\d{8}|[1-9]\\d{7}`,
          [8, 9],
          [
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`1`], `(06 $1)`],
            [
              `(\\d{2})(\\d{3})(\\d{3})`,
              `$1 $2 $3`,
              [`[27][2-9]|3[2-7]|4[24-9]|5[2-79]|6|8[2-57-9]|9[2-69]`],
              `(06 $1)`,
            ],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[2-9]`], `06 $1`],
          ],
          `06`,
        ],
        ID: [
          `62`,
          `00[89]`,
          `00[1-9]\\d{9,14}|(?:[1-36]|8\\d{5})\\d{6}|00\\d{9}|[1-9]\\d{8,10}|[2-9]\\d{7}`,
          [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
          [
            [`(\\d)(\\d{3})(\\d{3})`, `$1 $2 $3`, [`15`]],
            [`(\\d{2})(\\d{5,9})`, `$1 $2`, [`2[124]|[36]1`], `(0$1)`],
            [`(\\d{3})(\\d{5,7})`, `$1 $2`, [`800`], `0$1`],
            [`(\\d{3})(\\d{5,8})`, `$1 $2`, [`[2-79]`], `(0$1)`],
            [`(\\d{3})(\\d{3,4})(\\d{3})`, `$1-$2-$3`, [`8[1-35-9]`], `0$1`],
            [`(\\d{3})(\\d{6,8})`, `$1 $2`, [`1`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`804`], `0$1`],
            [`(\\d{3})(\\d)(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`80`], `0$1`],
            [`(\\d{3})(\\d{4})(\\d{4,5})`, `$1-$2-$3`, [`8`], `0$1`],
          ],
          `0`,
        ],
        IE: [
          `353`,
          `00`,
          `(?:1\\d|[2569])\\d{6,8}|4\\d{6,9}|7\\d{8}|8\\d{8,9}`,
          [7, 8, 9, 10],
          [
            [`(\\d{2})(\\d{5})`, `$1 $2`, [`2[24-9]|47|58|6[237-9]|9[35-9]`], `(0$1)`],
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`[45]0`], `(0$1)`],
            [`(\\d)(\\d{3,4})(\\d{4})`, `$1 $2 $3`, [`1`], `(0$1)`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[2569]|4[1-69]|7[14]`], `(0$1)`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`70`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`81`], `(0$1)`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[78]`], `0$1`],
            [`(\\d{4})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`1`]],
            [`(\\d{2})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`4`], `(0$1)`],
            [`(\\d{2})(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3 $4`, [`8`], `0$1`],
          ],
          `0`,
        ],
        IL: [
          `972`,
          `0(?:0|1(?:05|[2-9]))`,
          `1\\d{6}(?:\\d{3,5})?|[57]\\d{8}|[1-489]\\d{7}`,
          [7, 8, 9, 10, 11, 12],
          [
            [`(\\d{4})(\\d{3})`, `$1-$2`, [`125`]],
            [`(\\d{4})(\\d{2})(\\d{2})`, `$1-$2-$3`, [`121`]],
            [`(\\d)(\\d{3})(\\d{4})`, `$1-$2-$3`, [`[2-489]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1-$2-$3`, [`[57]`], `0$1`],
            [`(\\d{4})(\\d{3})(\\d{3})`, `$1-$2-$3`, [`12`]],
            [`(\\d{4})(\\d{6})`, `$1-$2`, [`159`]],
            [`(\\d)(\\d{3})(\\d{3})(\\d{3})`, `$1-$2-$3-$4`, [`1[7-9]`]],
            [`(\\d{3})(\\d{1,2})(\\d{3})(\\d{4})`, `$1-$2 $3-$4`, [`15`]],
          ],
          `0`,
        ],
        IM: [
          `44`,
          `00`,
          `1624\\d{6}|(?:[3578]\\d|90)\\d{8}`,
          [10],
          0,
          `0`,
          0,
          `([25-8]\\d{5})$|0|180020`,
          `1624$1`,
          0,
          `74576|(?:16|7[56])24`,
        ],
        IN: [
          `91`,
          `00`,
          `(?:000800|[2-9]\\d\\d)\\d{7}|1\\d{7,12}`,
          [8, 9, 10, 11, 12, 13],
          [
            [
              `(\\d{8})`,
              `$1`,
              [
                `5(?:0|2[23]|3[03]|[67]1|88)`,
                `5(?:0|2(?:21|3)|3(?:0|3[23])|616|717|888)`,
                `5(?:0|2(?:21|3)|3(?:0|3[23])|616|717|8888)`,
              ],
              0,
              1,
            ],
            [`(\\d{4})(\\d{4,5})`, `$1 $2`, [`180`, `1800`], 0, 1],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`140`], 0, 1],
            [
              `(\\d{2})(\\d{4})(\\d{4})`,
              `$1 $2 $3`,
              [
                `11|2[02]|33|4[04]|79[1-7]|80[2-46]`,
                `11|2[02]|33|4[04]|79(?:[1-6]|7[19])|80(?:[2-4]|6[0-589])`,
                `11|2[02]|33|4[04]|79(?:[124-6]|3(?:[02-9]|1[0-24-9])|7(?:1|9[1-6]))|80(?:[2-4]|6[0-589])`,
              ],
              `0$1`,
              1,
            ],
            [
              `(\\d{3})(\\d{3})(\\d{4})`,
              `$1 $2 $3`,
              [
                `1(?:2[0-249]|3[0-25]|4[145]|[68]|7[1257])|2(?:1[257]|3[013]|4[01]|5[0137]|6[0158]|78|8[1568])|3(?:26|4[1-3]|5[34]|6[01489]|7[02-46]|8[159])|4(?:1[36]|2[1-47]|5[12]|6[0-26-9]|7[0-24-9]|8[013-57]|9[014-7])|5(?:1[025]|22|[36][25]|4[28]|5[12]|[78]1)|6(?:12|[2-4]1|5[17]|6[13]|80)|7(?:12|3[134]|61|88)|8(?:16|2[014]|3[126]|6[136]|7[078]|8[34]|91)|(?:43|59|75)[15]|(?:1[59]|29|67)[14]`,
                `1(?:2[0-24]|3[0-25]|4[145]|[59][14]|6[1-9]|7[1257]|8[1-57-9])|2(?:1[257]|3[013]|4[01]|5[0137]|6[058]|78|8[1568]|9[14])|3(?:26|4[1-3]|5[34]|6[01489]|7[02-46]|8[159])|4(?:1[36]|2[1-47]|3[15]|5[12]|6[0-26-9]|7[0-24-9]|8[013-57]|9[014-7])|5(?:1[025]|22|[36][25]|4[28]|[578]1|9[15])|674|7(?:(?:3[34]|5[15])[2-6]|61[346]|88[0-8])|8(?:70[2-6]|84[235-7]|91[3-7])|(?:1(?:29|60|8[06])|261|552|6(?:12|[2-47]1|5[17]|6[13]|80)|7(?:12|31)|8(?:16|2[014]|3[126]|6[136]|7[78]|83))[2-7]`,
                `1(?:2[0-24]|3[0-25]|4[145]|[59][14]|6[1-9]|7[1257]|8[1-57-9])|2(?:1[257]|3[013]|4[01]|5[0137]|6[058]|78|8[1568]|9[14])|3(?:26|4[1-3]|5[34]|6[01489]|7[02-46]|8[159])|4(?:1[36]|2[1-47]|3[15]|5[12]|6[0-26-9]|7[0-24-9]|8[013-57]|9[014-7])|5(?:1[025]|22|[36][25]|4[28]|[578]1|9[15])|6(?:12(?:[2-6]|7[0-8])|74[2-7])|7(?:3171|5[15][2-6]|61[346]|88(?:[2-7]|82))|8(?:70[2-6]|84(?:[2356]|7[19])|91(?:[3-6]|7[19]))|73[134][2-6]|8(?:16|2[014]|3[126]|6[136]|7[78]|83)(?:[2-6]|7[19])|(?:1(?:29|60|8[06])|261|552|6(?:[2-4]1|5[17]|6[13]|7(?:1|4[0189])|80)|7(?:12|88[01]))[2-7]`,
              ],
              `0$1`,
              1,
            ],
            [
              `(\\d{4})(\\d{3})(\\d{3})`,
              `$1 $2 $3`,
              [
                `1(?:[2-479]|5[0235-9])|[2-5]|6(?:1[1358]|2[2457-9]|3[2-5]|4[235-7]|5[2-689]|6[24578]|7[235689]|8[1-6])|7(?:1[013-9]|3[129]|5[29]|6[02-5]|70)|807`,
                `1(?:[2-479]|5[0235-9])|[2-5]|6(?:1[1358]|2(?:[2457]|84|95)|3(?:[2-4]|55)|4[235-7]|5[2-689]|6[24578]|7(?:[23569]|8[0-57-9])|8[1-6])|7(?:1(?:[013-8]|9[6-9])|3(?:17|2[0-49]|9[2-57])|5(?:2[1-3]|9[0-6])|6(?:0[5689]|2[5-9]|3[02-8]|4|5[0-367])|70[13-7])|807[19]`,
                `1(?:[2-479]|5(?:[0236-9]|5[013-9]))|[2-5]|6(?:2(?:84|95)|355|8(?:28[235-7]|3))|73179|807(?:1|9[1-3])|(?:1552|6(?:(?:1[1358]|2[2457]|3[2-4]|4[235-7]|5[2-689]|6[24578])\\d|7(?:[23569]\\d|8[0-57-9])|8(?:[14-6]\\d|2[0-79]))|7(?:1(?:[013-8]\\d|9[6-9])|3(?:2[0-49]|9[2-57])|5(?:2[1-3]|9[0-6])|6(?:0[5689]|2[5-9]|3[02-8]|4\\d|5[0-367])|70[13-7]))[2-7]`,
              ],
              `0$1`,
              1,
            ],
            [`(\\d{5})(\\d{5})`, `$1 $2`, [`16|[6-9]`], `0$1`, 1],
            [`(\\d{4})(\\d{2,4})(\\d{4})`, `$1 $2 $3`, [`18[06]`, `18[06]0`], 0, 1],
            [`(\\d{4})(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`18`], 0, 1],
          ],
          `0`,
        ],
        IO: [`246`, `00`, `3\\d{6}`, [7], [[`(\\d{3})(\\d{4})`, `$1 $2`, [`3`]]]],
        IQ: [
          `964`,
          `00`,
          `(?:1|7\\d\\d)\\d{7}|[2-6]\\d{7,8}`,
          [8, 9, 10],
          [
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`1`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[2-6]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`7`], `0$1`],
          ],
          `0`,
        ],
        IR: [
          `98`,
          `00`,
          `[1-9]\\d{9}|(?:[1-8]\\d\\d|9)\\d{3,4}`,
          [4, 5, 6, 7, 10],
          [
            [`(\\d{4,5})`, `$1`, [`96`], `0$1`],
            [
              `(\\d{2})(\\d{4,5})`,
              `$1 $2`,
              [`(?:1[137]|2[13-68]|3[1458]|4[145]|5[1468]|6[16]|7[1467]|8[13467])[12689]`],
              `0$1`,
            ],
            [`(\\d{3})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`9`], `0$1`],
            [`(\\d{2})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`[1-8]`], `0$1`],
          ],
          `0`,
        ],
        IS: [
          `354`,
          `00|1(?:0(?:01|[12]0)|100)`,
          `(?:38\\d|[4-9])\\d{6}`,
          [7, 9],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`[4-9]`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`3`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
        ],
        IT: [
          `39`,
          `00`,
          `0\\d{5,11}|1\\d{8,10}|3(?:[0-8]\\d{7,10}|9\\d{7,8})|(?:43|55|70)\\d{8}|8\\d{5}(?:\\d{2,4})?`,
          [6, 7, 8, 9, 10, 11, 12],
          [
            [`(\\d{2})(\\d{4,6})`, `$1 $2`, [`0[26]`]],
            [
              `(\\d{3})(\\d{3,6})`,
              `$1 $2`,
              [
                `0[13-57-9][0159]|8(?:03|4[17]|9[2-5])`,
                `0[13-57-9][0159]|8(?:03|4[17]|9(?:2|3[04]|[45][0-4]))`,
              ],
            ],
            [`(\\d{4})(\\d{2,6})`, `$1 $2`, [`0(?:[13-579][2-46-8]|8[236-8])`]],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`894`]],
            [`(\\d{2})(\\d{3,4})(\\d{4})`, `$1 $2 $3`, [`0[26]|5`]],
            [`(\\d{3})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`1(?:44|[679])|[378]|43`]],
            [`(\\d{3})(\\d{3,4})(\\d{4})`, `$1 $2 $3`, [`0[13-57-9][0159]|14`]],
            [`(\\d{2})(\\d{4})(\\d{5})`, `$1 $2 $3`, [`0[26]`]],
            [`(\\d{4})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`0`]],
            [`(\\d{3})(\\d{4})(\\d{4,5})`, `$1 $2 $3`, [`[03]`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          [
            [
              `0(?:669[0-79]\\d{1,6}|831\\d{2,8})|0(?:1(?:[0159]\\d|[27][1-5]|31|4[1-4]|6[1356]|8[2-57])|2\\d\\d|3(?:[0159]\\d|2[1-4]|3[12]|[48][1-6]|6[2-59]|7[1-7])|4(?:[0159]\\d|[23][1-9]|4[245]|6[1-5]|7[1-4]|81)|5(?:[0159]\\d|2[1-5]|3[2-6]|4[1-79]|6[4-6]|7[1-578]|8[3-8])|6(?:[0-57-9]\\d|6[0-8])|7(?:[0159]\\d|2[12]|3[1-7]|4[2-46]|6[13569]|7[13-6]|8[1-59])|8(?:[0159]\\d|2[3-578]|3[2356]|[6-8][1-5])|9(?:[0159]\\d|[238][1-5]|4[12]|6[1-8]|7[1-6]))\\d{2,7}`,
            ],
            [`3[2-9]\\d{7,8}|(?:31|43)\\d{8}`, [9, 10]],
            [`80(?:0\\d{3}|3)\\d{3}`, [6, 9]],
            [
              `(?:0878\\d{3}|89(?:2\\d|3[04]|4(?:[0-4]|[5-9]\\d\\d)|5[0-4]))\\d\\d|(?:1(?:44|6[346])|89(?:38|5[5-9]|9))\\d{6}`,
              [6, 8, 9, 10],
            ],
            [`1(?:78\\d|99)\\d{6}`, [9, 10]],
            [`3[2-8]\\d{9,10}`, [11, 12]],
            0,
            0,
            [`55\\d{8}`, [10]],
            [`84(?:[08]\\d{3}|[17])\\d{3}`, [6, 9]],
          ],
        ],
        JE: [
          `44`,
          `00`,
          `1534\\d{6}|(?:[3578]\\d|90)\\d{8}`,
          [10],
          0,
          `0`,
          0,
          `([0-24-8]\\d{5})$|0|180020`,
          `1534$1`,
          0,
          0,
          [
            [`1534[0-24-8]\\d{5}`],
            [`7(?:(?:(?:50|82)9|937)\\d|7(?:00[378]|97\\d))\\d{5}`],
            [`80(?:07(?:35|81)|8901)\\d{4}`],
            [
              `(?:8(?:4(?:4(?:4(?:05|42|69)|703)|5(?:041|800))|7(?:0002|1206))|90(?:066[59]|1810|71(?:07|55)))\\d{4}`,
            ],
            [`701511\\d{4}`],
            0,
            [
              `(?:3(?:0(?:07(?:35|81)|8901)|3\\d{4}|4(?:4(?:4(?:05|42|69)|703)|5(?:041|800))|7(?:0002|1206))|55\\d{4})\\d{4}`,
            ],
            [
              `76(?:464|652)\\d{5}|76(?:0[0-28]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}`,
            ],
            [`56\\d{8}`],
          ],
        ],
        JM: [`1`, `011`, `(?:[58]\\d\\d|658|900)\\d{7}`, [10], 0, `1`, 0, 0, 0, 0, `658|876`],
        JO: [
          `962`,
          `00`,
          `(?:(?:[2689]|7\\d)\\d|32|427|53)\\d{6}`,
          [8, 9],
          [
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[2356]|87`], `(0$1)`],
            [`(\\d{3})(\\d{5,6})`, `$1 $2`, [`[89]`], `0$1`],
            [`(\\d{2})(\\d{7})`, `$1 $2`, [`70`], `0$1`],
            [`(\\d)(\\d{4})(\\d{4})`, `$1 $2 $3`, [`[47]`], `0$1`],
          ],
          `0`,
        ],
        JP: [
          `81`,
          `010`,
          `00[1-9]\\d{6,14}|[25-9]\\d{9}|(?:00|[1-9]\\d\\d)\\d{6}`,
          [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
          [
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1-$2-$3`, [`(?:12|57|99)0`], `0$1`],
            [
              `(\\d{4})(\\d)(\\d{4})`,
              `$1-$2-$3`,
              [
                `1(?:26|3[79]|4[56]|5[4-68]|6[3-5])|499|5(?:76|97)|746|8(?:3[89]|47|51)|9(?:80|9[16])`,
                `1(?:267|3(?:7[247]|9[278])|466|5(?:47|58|64)|6(?:3[245]|48|5[4-68]))|499[2468]|5(?:76|97)9|7468|8(?:3(?:8[7-9]|96)|477|51[2-9])|9(?:802|9(?:1[23]|69))|1(?:45|58)[67]`,
                `1(?:267|3(?:7[247]|9[278])|466|5(?:47|58|64)|6(?:3[245]|48|5[4-68]))|499[2468]|5(?:769|979[2-69])|7468|8(?:3(?:8[7-9]|96[2457-9])|477|51[2-9])|9(?:802|9(?:1[23]|69))|1(?:45|58)[67]`,
              ],
              `0$1`,
            ],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1-$2-$3`, [`60`], `0$1`],
            [
              `(\\d)(\\d{4})(\\d{4})`,
              `$1-$2-$3`,
              [`3|4(?:2[09]|7[01])|6[1-9]`, `3|4(?:2(?:0|9[02-69])|7(?:0[019]|1))|6[1-9]`],
              `0$1`,
            ],
            [
              `(\\d{2})(\\d{3})(\\d{4})`,
              `$1-$2-$3`,
              [
                `1(?:1|5[45]|77|88|9[69])|2(?:2[1-37]|3[0-269]|4[59]|5|6[24]|7[1-358]|8[1369]|9[0-38])|4(?:[28][1-9]|3[0-57]|[45]|6[248]|7[2-579]|9[29])|5(?:2|3[0459]|4[0-369]|5[29]|8[02389]|9[0-389])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9[2-6])|8(?:2[124589]|3[26-9]|49|51|6|7[0-468]|8[68]|9[019])|9(?:[23][1-9]|4[15]|5[138]|6[1-3]|7[156]|8[189]|9[1-489])`,
                `1(?:1|5(?:4[018]|5[017])|77|88|9[69])|2(?:2(?:[127]|3[014-9])|3[0-269]|4[59]|5(?:[1-3]|5[0-69]|9[19])|62|7(?:[1-35]|8[0189])|8(?:[16]|3[0134]|9[0-5])|9(?:[028]|17))|4(?:2(?:[13-79]|8[014-6])|3[0-57]|[45]|6[248]|7[2-47]|8[1-9]|9[29])|5(?:2|3(?:[045]|9[0-8])|4[0-369]|5[29]|8[02389]|9[0-3])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9(?:[23]|4[0-59]|5[01569]|6[0167]))|8(?:2(?:[1258]|4[0-39]|9[0-2469])|3(?:[29]|60)|49|51|6(?:[0-24]|36|5[0-3589]|7[23]|9[01459])|7[0-468]|8[68])|9(?:[23][1-9]|4[15]|5[138]|6[1-3]|7[156]|8[189]|9(?:[1289]|3[34]|4[0178]))|(?:264|837)[016-9]|2(?:57|93)[015-9]|(?:25[0468]|422|838)[01]|(?:47[59]|59[89]|8(?:6[68]|9))[019]`,
                `1(?:1|5(?:4[018]|5[017])|77|88|9[69])|2(?:2[127]|3[0-269]|4[59]|5(?:[1-3]|5[0-69]|9(?:17|99))|6(?:2|4[016-9])|7(?:[1-35]|8[0189])|8(?:[16]|3[0134]|9[0-5])|9(?:[028]|17))|4(?:2(?:[13-79]|8[014-6])|3[0-57]|[45]|6[248]|7[2-47]|9[29])|5(?:2|3(?:[045]|9(?:[0-58]|6[4-9]|7[0-35689]))|4[0-369]|5[29]|8[02389]|9[0-3])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9(?:[23]|4[0-59]|5[01569]|6[0167]))|8(?:2(?:[1258]|4[0-39]|9[0169])|3(?:[29]|60|7(?:[017-9]|6[6-8]))|49|51|6(?:[0-24]|36[2-57-9]|5(?:[0-389]|5[23])|6(?:[01]|9[178])|7(?:2[2-468]|3[78])|9[0145])|7[0-468]|8[68])|9(?:4[15]|5[138]|7[156]|8[189]|9(?:[1289]|3(?:31|4[357])|4[0178]))|(?:8294|96)[1-3]|2(?:57|93)[015-9]|(?:223|8699)[014-9]|(?:25[0468]|422|838)[01]|(?:48|8292|9[23])[1-9]|(?:47[59]|59[89]|8(?:68|9))[019]`,
              ],
              `0$1`,
            ],
            [`(\\d{3})(\\d{2})(\\d{4})`, `$1-$2-$3`, [`[14]|[289][2-9]|5[3-9]|7[2-4679]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1-$2-$3`, [`800`], `0$1`],
            [`(\\d{2})(\\d{4})(\\d{4})`, `$1-$2-$3`, [`[25-9]`], `0$1`],
          ],
          `0`,
          0,
          `(000[2569]\\d{4,6})$|(?:(?:003768)0?)|0`,
          `$1`,
        ],
        KE: [
          `254`,
          `000`,
          `(?:[17]\\d\\d|900)\\d{6}|(?:2|80)0\\d{6,7}|[4-6]\\d{6,8}`,
          [7, 8, 9, 10],
          [
            [`(\\d{2})(\\d{5,7})`, `$1 $2`, [`[24-6]`], `0$1`],
            [`(\\d{3})(\\d{6})`, `$1 $2`, [`[17]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[89]`], `0$1`],
          ],
          `0`,
        ],
        KG: [
          `996`,
          `00`,
          `8\\d{9}|[235-9]\\d{8}`,
          [9, 10],
          [
            [`(\\d{4})(\\d{5})`, `$1 $2`, [`3(?:1[346]|[24-79])`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[235-79]|88`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d)(\\d{2,3})`, `$1 $2 $3 $4`, [`8`], `0$1`],
          ],
          `0`,
        ],
        KH: [
          `855`,
          `00[14-9]`,
          `1\\d{9}|[1-9]\\d{7,8}`,
          [8, 9, 10],
          [
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[1-9]`], `0$1`],
            [`(\\d{4})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`1`]],
          ],
          `0`,
        ],
        KI: [`686`, `00`, `(?:[37]\\d|6[0-79])\\d{6}|(?:[2-48]\\d|50)\\d{3}`, [5, 8], 0, `0`],
        KM: [
          `269`,
          `00`,
          `[3478]\\d{6}`,
          [7],
          [[`(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3`, [`[3478]`]]],
        ],
        KN: [
          `1`,
          `011`,
          `(?:[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-7]\\d{6})$|1`,
          `869$1`,
          0,
          `869`,
        ],
        KP: [
          `850`,
          `00|99`,
          `85\\d{6}|(?:19\\d|[2-7])\\d{7}`,
          [8, 10],
          [
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`8`], `0$1`],
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[2-7]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`1`], `0$1`],
          ],
          `0`,
        ],
        KR: [
          `82`,
          `00(?:[125689]|3(?:[46]5|91)|7(?:00|27|3|55|6[126]))`,
          `00[1-9]\\d{8,11}|(?:[12]|5\\d{3})\\d{7}|[13-6]\\d{9}|(?:[1-6]\\d|80)\\d{7}|[3-6]\\d{4,5}|(?:00|7)0\\d{8}`,
          [5, 6, 8, 9, 10, 11, 12, 13, 14],
          [
            [`(\\d{2})(\\d{3,4})`, `$1-$2`, [`(?:3[1-3]|[46][1-4]|5[1-5])1`], `0$1`],
            [`(\\d{4})(\\d{4})`, `$1-$2`, [`1`]],
            [`(\\d)(\\d{3,4})(\\d{4})`, `$1-$2-$3`, [`2`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1-$2-$3`, [`[36]0|8`], `0$1`],
            [`(\\d{2})(\\d{3,4})(\\d{4})`, `$1-$2-$3`, [`[1346]|5[1-5]`], `0$1`],
            [`(\\d{2})(\\d{4})(\\d{4})`, `$1-$2-$3`, [`[57]`], `0$1`],
            [`(\\d{2})(\\d{5})(\\d{4})`, `$1-$2-$3`, [`5`], `0$1`],
          ],
          `0`,
          0,
          `0(8(?:[1-46-8]|5\\d\\d))?`,
        ],
        KW: [
          `965`,
          `00`,
          `18\\d{5}|(?:[2569]\\d|41)\\d{6}`,
          [7, 8],
          [
            [`(\\d{4})(\\d{3,4})`, `$1 $2`, [`[169]|2(?:[235]|4[1-35-9])|52`]],
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`[245]`]],
          ],
        ],
        KY: [
          `1`,
          `011`,
          `(?:345|[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-9]\\d{6})$|1`,
          `345$1`,
          0,
          `345`,
        ],
        KZ: [`7`, `810`, `8\\d{13}|[78]\\d{9}`, [10, 14], 0, `8`, 0, 0, 0, 0, `7`, 0, `8~10`],
        LA: [
          `856`,
          `00`,
          `[23]\\d{9}|3\\d{8}|(?:[235-8]\\d|41)\\d{6}`,
          [8, 9, 10],
          [
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`2[13]|3[14]|[4-8]`], `0$1`],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{3})`, `$1 $2 $3 $4`, [`3`], `0$1`],
            [`(\\d{2})(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`[23]`], `0$1`],
          ],
          `0`,
        ],
        LB: [
          `961`,
          `00`,
          `[27-9]\\d{7}|[13-9]\\d{6}`,
          [7, 8],
          [
            [
              `(\\d)(\\d{3})(\\d{3})`,
              `$1 $2 $3`,
              [`[13-69]|7(?:[2-57]|62|8[0-6]|9[04-9])|8[02-9]`],
              `0$1`,
            ],
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[27-9]`]],
          ],
          `0`,
        ],
        LC: [
          `1`,
          `011`,
          `(?:[58]\\d\\d|758|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-8]\\d{6})$|1`,
          `758$1`,
          0,
          `758`,
        ],
        LI: [
          `423`,
          `00`,
          `[68]\\d{8}|(?:[2378]\\d|90)\\d{5}`,
          [7, 9],
          [
            [
              `(\\d{3})(\\d{2})(\\d{2})`,
              `$1 $2 $3`,
              [`[2379]|8(?:0[09]|7)`, `[2379]|8(?:0(?:02|9)|7)`],
            ],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`8`]],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`69`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`6`]],
          ],
          `0`,
          0,
          `(1001)|0`,
        ],
        LK: [
          `94`,
          `00`,
          `[1-9]\\d{8}`,
          [9],
          [
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`7`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[1-689]`], `0$1`],
          ],
          `0`,
        ],
        LR: [
          `231`,
          `00`,
          `(?:[2457]\\d|33|88)\\d{7}|(?:2\\d|[4-6])\\d{6}`,
          [7, 8, 9],
          [
            [`(\\d)(\\d{3})(\\d{3})`, `$1 $2 $3`, [`4[67]|[56]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`2`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[2-578]`], `0$1`],
          ],
          `0`,
        ],
        LS: [
          `266`,
          `00`,
          `(?:[256]\\d\\d|800)\\d{5}`,
          [8],
          [[`(\\d{4})(\\d{4})`, `$1 $2`, [`[2568]`]]],
        ],
        LT: [
          `370`,
          `00`,
          `(?:[3469]\\d|52|[78]0)\\d{6}`,
          [8],
          [
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`52[0-7]`], `(0-$1)`, 1],
            [`(\\d{3})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`[7-9]`], `0 $1`, 1],
            [`(\\d{2})(\\d{6})`, `$1 $2`, [`37|4(?:[15]|6[1-8])`], `(0-$1)`, 1],
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`[3-6]`], `(0-$1)`, 1],
          ],
          `0`,
          0,
          `[08]`,
        ],
        LU: [
          `352`,
          `00`,
          `35[013-9]\\d{4,8}|6\\d{8}|35\\d{2,4}|(?:[2457-9]\\d|3[0-46-9])\\d{2,9}`,
          [4, 5, 6, 7, 8, 9, 10, 11],
          [
            [
              `(\\d{2})(\\d{3})`,
              `$1 $2`,
              [`2(?:0[2-689]|[2-9])|[3-57]|8(?:0[2-9]|[13-9])|9(?:0[89]|[2-579])`],
            ],
            [
              `(\\d{2})(\\d{2})(\\d{2})`,
              `$1 $2 $3`,
              [`2(?:0[2-689]|[2-9])|[3-57]|8(?:0[2-9]|[13-9])|9(?:0[89]|[2-579])`],
            ],
            [`(\\d{2})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`20[2-689]`]],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{1,2})`, `$1 $2 $3 $4`, [`20`]],
            [
              `(\\d{2})(\\d{2})(\\d{2})(\\d{1,5})`,
              `$1 $2 $3 $4`,
              [`[3-57]|8[13-9]|9(?:0[89]|[2-579])|(?:2|80)[2-9]`],
            ],
            [`(\\d{3})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`80[01]|90[015]`]],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{3})`, `$1 $2 $3 $4`, [`20`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`6`]],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{1,2})`, `$1 $2 $3 $4 $5`, [`20`]],
          ],
          0,
          0,
          `(15(?:0[06]|1[12]|[35]5|4[04]|6[26]|77|88|99)\\d)`,
        ],
        LV: [
          `371`,
          `00`,
          `(?:[268]\\d|78|90)\\d{6}`,
          [8],
          [[`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[2679]|8[01]`]]],
        ],
        LY: [
          `218`,
          `00`,
          `[2-9]\\d{8}`,
          [9],
          [[`(\\d{2})(\\d{7})`, `$1-$2`, [`[2-9]`], `0$1`]],
          `0`,
        ],
        MA: [
          `212`,
          `00`,
          `[5-8]\\d{8}`,
          [9],
          [
            [`(\\d{4})(\\d{5})`, `$1-$2`, [`892`], `0$1`],
            [`(\\d{2})(\\d{7})`, `$1-$2`, [`8(?:0[0-7]|9)`], `0$1`],
            [`(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4 $5`, [`[5-8]`], `0$1`],
          ],
          `0`,
          0,
          0,
          0,
          0,
          `[5-8]`,
        ],
        MC: [
          `377`,
          `00`,
          `(?:[3489]|[67]\\d)\\d{7}`,
          [8, 9],
          [
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`4`], `0$1`],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[389]`]],
            [`(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4 $5`, [`[67]`], `0$1`],
          ],
          `0`,
        ],
        MD: [
          `373`,
          `00`,
          `(?:[235-7]\\d|[89]0)\\d{6}`,
          [8],
          [
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`[89]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`22|3`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`[25-7]`], `0$1`],
          ],
          `0`,
        ],
        ME: [
          `382`,
          `00`,
          `(?:20|[3-79]\\d)\\d{6}|80\\d{6,7}`,
          [8, 9],
          [[`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[2-9]`], `0$1`]],
          `0`,
        ],
        MF: [
          `590`,
          `00`,
          `7090\\d{5}|(?:[56]9|[89]\\d)\\d{7}`,
          [9],
          0,
          `0`,
          0,
          0,
          0,
          0,
          0,
          [
            [`(?:59(?:0(?:0[079]|[14]3|[27][79]|3[03-7]|5[0-268]|87)|87\\d)|80[6-9]\\d\\d)\\d{4}`],
            [`(?:69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))|7090[0-4])\\d{4}`],
            [`80[0-5]\\d{6}`],
            [`8[129]\\d{7}`],
            0,
            0,
            0,
            0,
            [`9(?:(?:39[5-7]|76[018])\\d|475[0-6])\\d{4}`],
          ],
        ],
        MG: [
          `261`,
          `00`,
          `[23]\\d{8}`,
          [9],
          [[`(\\d{2})(\\d{2})(\\d{3})(\\d{2})`, `$1 $2 $3 $4`, [`[23]`], `0$1`]],
          `0`,
          0,
          `([24-9]\\d{6})$|0`,
          `20$1`,
        ],
        MH: [
          `692`,
          `011`,
          `329\\d{4}|(?:[256]\\d|45)\\d{5}`,
          [7],
          [[`(\\d{3})(\\d{4})`, `$1-$2`, [`[2-6]`]]],
          `1`,
        ],
        MK: [
          `389`,
          `00`,
          `[2-578]\\d{7}`,
          [8],
          [
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`2|34[47]|4(?:[37]7|5[47]|64)`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[347]`], `0$1`],
            [`(\\d{3})(\\d)(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[58]`], `0$1`],
          ],
          `0`,
        ],
        ML: [
          `223`,
          `00`,
          `[24-9]\\d{7}`,
          [8],
          [[`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[24-9]`]]],
        ],
        MM: [
          `95`,
          `00`,
          `1\\d{5,7}|95\\d{6}|(?:[4-7]|9[0-46-9])\\d{6,8}|(?:2|8\\d)\\d{5,8}`,
          [6, 7, 8, 9, 10],
          [
            [`(\\d)(\\d{2})(\\d{3})`, `$1 $2 $3`, [`16|2`], `0$1`],
            [
              `(\\d{2})(\\d{2})(\\d{3})`,
              `$1 $2 $3`,
              [`4(?:[2-46]|5[3-5])|5|6(?:[1-689]|7[235-7])|7(?:[0-4]|5[2-7])|8[1-5]|(?:60|86)[23]`],
              `0$1`,
            ],
            [`(\\d)(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[12]|452|678|86`, `[12]|452|6788|86`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[4-7]|8[1-35]`], `0$1`],
            [`(\\d)(\\d{3})(\\d{4,6})`, `$1 $2 $3`, [`9(?:2[0-4]|[35-9]|4[137-9])`], `0$1`],
            [`(\\d)(\\d{4})(\\d{4})`, `$1 $2 $3`, [`2`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`8`], `0$1`],
            [`(\\d)(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`92`], `0$1`],
            [`(\\d)(\\d{5})(\\d{4})`, `$1 $2 $3`, [`9`], `0$1`],
          ],
          `0`,
        ],
        MN: [
          `976`,
          `001`,
          `[12]\\d{7,9}|[5-9]\\d{7}`,
          [8, 9, 10],
          [
            [`(\\d{2})(\\d{2})(\\d{4})`, `$1 $2 $3`, [`11|2[16]`], `0$1`],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[5-9]`]],
            [`(\\d{3})(\\d{5,6})`, `$1 $2`, [`[12]2[1-3]`], `0$1`],
            [
              `(\\d{4})(\\d{5,6})`,
              `$1 $2`,
              [`[12](?:27|3[2-8]|4[2-68]|5[1-4689])`, `[12](?:27|3[2-8]|4[2-68]|5[1-4689])[0-3]`],
              `0$1`,
            ],
            [`(\\d{5})(\\d{4,5})`, `$1 $2`, [`[12]`], `0$1`],
          ],
          `0`,
        ],
        MO: [
          `853`,
          `00`,
          `0800\\d{3}|(?:28|[68]\\d)\\d{6}`,
          [7, 8],
          [
            [`(\\d{4})(\\d{3})`, `$1 $2`, [`0`]],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[268]`]],
          ],
        ],
        MP: [
          `1`,
          `011`,
          `[58]\\d{9}|(?:67|90)0\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-9]\\d{6})$|1`,
          `670$1`,
          0,
          `670`,
        ],
        MQ: [
          `596`,
          `00`,
          `7091\\d{5}|(?:[56]9|[89]\\d)\\d{7}`,
          [9],
          [
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[5-79]|8(?:0[6-9]|[36])`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`8`], `0$1`],
          ],
          `0`,
        ],
        MR: [
          `222`,
          `00`,
          `(?:[2-4]\\d\\d|800)\\d{5}`,
          [8],
          [[`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[2-48]`]]],
        ],
        MS: [
          `1`,
          `011`,
          `(?:[58]\\d\\d|664|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([34]\\d{6})$|1`,
          `664$1`,
          0,
          `664`,
        ],
        MT: [
          `356`,
          `00`,
          `3550\\d{4}|(?:[2579]\\d\\d|800)\\d{5}`,
          [8],
          [[`(\\d{4})(\\d{4})`, `$1 $2`, [`[2357-9]`]]],
        ],
        MU: [
          `230`,
          `0(?:0|[24-7]0|3[03])`,
          `(?:[57]|8\\d\\d)\\d{7}|[2-468]\\d{6}`,
          [7, 8, 10],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`[2-46]|8[013]`]],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[57]`]],
            [`(\\d{5})(\\d{5})`, `$1 $2`, [`8`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `020`,
        ],
        MV: [
          `960`,
          `0(?:0|19)`,
          `(?:800|9[0-57-9]\\d)\\d{7}|[34679]\\d{6}`,
          [7, 10],
          [
            [`(\\d{3})(\\d{4})`, `$1-$2`, [`[34679]`]],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[89]`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
        ],
        MW: [
          `265`,
          `00`,
          `(?:[1289]\\d|31|77)\\d{7}|1\\d{6}`,
          [7, 9],
          [
            [`(\\d)(\\d{3})(\\d{3})`, `$1 $2 $3`, [`1[2-9]`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[1-37-9]`], `0$1`],
          ],
          `0`,
        ],
        MX: [
          `52`,
          `0[09]`,
          `[2-9]\\d{9}`,
          [10],
          [
            [`(\\d{2})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`33|5[56]|81`]],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[2-9]`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
        ],
        MY: [
          `60`,
          `00`,
          `1\\d{8,9}|(?:3\\d|[4-9])\\d{7}`,
          [8, 9, 10],
          [
            [`(\\d)(\\d{3})(\\d{4})`, `$1-$2 $3`, [`[4-79]`], `0$1`],
            [
              `(\\d{2})(\\d{3})(\\d{3,4})`,
              `$1-$2 $3`,
              [`1(?:[02469]|[378][1-9]|53)|8`, `1(?:[02469]|[37][1-9]|53|8(?:[1-46-9]|5[7-9]))|8`],
              `0$1`,
            ],
            [`(\\d)(\\d{4})(\\d{4})`, `$1-$2 $3`, [`3`], `0$1`],
            [`(\\d)(\\d{3})(\\d{2})(\\d{4})`, `$1-$2-$3-$4`, [`1(?:[367]|80)`]],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1-$2 $3`, [`15`], `0$1`],
            [`(\\d{2})(\\d{4})(\\d{4})`, `$1-$2 $3`, [`1`], `0$1`],
          ],
          `0`,
        ],
        MZ: [
          `258`,
          `00`,
          `(?:2|8\\d)\\d{7}`,
          [8, 9],
          [
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`2|8[2-9]`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`8`]],
          ],
        ],
        NA: [
          `264`,
          `00`,
          `[68]\\d{7,8}`,
          [8, 9],
          [
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`88`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`6`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`87`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`8`], `0$1`],
          ],
          `0`,
        ],
        NC: [
          `687`,
          `00`,
          `(?:050|[2-57-9]\\d\\d)\\d{3}`,
          [6],
          [[`(\\d{2})(\\d{2})(\\d{2})`, `$1.$2.$3`, [`[02-57-9]`]]],
        ],
        NE: [
          `227`,
          `00`,
          `[027-9]\\d{7}`,
          [8],
          [
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`08`]],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[089]|2[013]|7[0467]`]],
          ],
        ],
        NF: [
          `672`,
          `00`,
          `[13]\\d{5}`,
          [6],
          [
            [`(\\d{2})(\\d{4})`, `$1 $2`, [`1[0-3]`]],
            [`(\\d)(\\d{5})`, `$1 $2`, [`[13]`]],
          ],
          0,
          0,
          `([0-258]\\d{4})$`,
          `3$1`,
        ],
        NG: [
          `234`,
          `009`,
          `(?:20|9\\d)\\d{8}|[78]\\d{9,13}`,
          [10, 11, 12, 13, 14],
          [
            [`(\\d{3})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[7-9]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`20[129]`], `0$1`],
            [`(\\d{4})(\\d{2})(\\d{4})`, `$1 $2 $3`, [`2`], `0$1`],
            [`(\\d{3})(\\d{4})(\\d{4,5})`, `$1 $2 $3`, [`[78]`], `0$1`],
            [`(\\d{3})(\\d{5})(\\d{5,6})`, `$1 $2 $3`, [`[78]`], `0$1`],
          ],
          `0`,
        ],
        NI: [
          `505`,
          `00`,
          `(?:1800|[25-8]\\d{3})\\d{4}`,
          [8],
          [[`(\\d{4})(\\d{4})`, `$1 $2`, [`[125-8]`]]],
        ],
        NL: [
          `31`,
          `00`,
          `(?:[124-7]\\d\\d|3(?:[02-9]\\d|1[0-8]))\\d{6}|8\\d{6,9}|9\\d{6,10}|1\\d{4,5}`,
          [5, 6, 7, 8, 9, 10, 11],
          [
            [`(\\d{3})(\\d{4,7})`, `$1 $2`, [`[89]0`], `0$1`],
            [`(\\d{2})(\\d{7})`, `$1 $2`, [`66`], `0$1`],
            [`(\\d)(\\d{8})`, `$1 $2`, [`6`], `0$1`],
            [
              `(\\d{3})(\\d{3})(\\d{3})`,
              `$1 $2 $3`,
              [`1[16-8]|2[259]|3[124]|4[17-9]|5[124679]`],
              `0$1`,
            ],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[1-578]|91`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{5})`, `$1 $2 $3`, [`9`], `0$1`],
          ],
          `0`,
        ],
        NO: [
          `47`,
          `00`,
          `(?:0|[2-9]\\d{3})\\d{4}`,
          [5, 8],
          [
            [`(\\d{3})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`8`]],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[2-79]`]],
          ],
          0,
          0,
          0,
          0,
          0,
          `[02-689]|7[0-8]`,
        ],
        NP: [
          `977`,
          `00`,
          `(?:1\\d|9)\\d{9}|[1-9]\\d{7}`,
          [8, 10, 11],
          [
            [`(\\d)(\\d{7})`, `$1-$2`, [`1[2-6]`], `0$1`],
            [`(\\d{2})(\\d{6})`, `$1-$2`, [`1[01]|[2-8]|9(?:[1-59]|[67][2-6])`], `0$1`],
            [`(\\d{3})(\\d{7})`, `$1-$2`, [`9`]],
          ],
          `0`,
        ],
        NR: [
          `674`,
          `00`,
          `(?:222|444|(?:55|8\\d)\\d|666|777|999)\\d{4}`,
          [7],
          [[`(\\d{3})(\\d{4})`, `$1 $2`, [`[24-9]`]]],
        ],
        NU: [`683`, `00`, `(?:[4-7]|888\\d)\\d{3}`, [4, 7], [[`(\\d{3})(\\d{4})`, `$1 $2`, [`8`]]]],
        NZ: [
          `64`,
          `0(?:0|161)`,
          `[1289]\\d{9}|50\\d{5}(?:\\d{2,3})?|[27-9]\\d{7,8}|(?:[34]\\d|6[0-35-9])\\d{6}|8\\d{4,6}`,
          [5, 6, 7, 8, 9, 10],
          [
            [`(\\d{2})(\\d{3,8})`, `$1 $2`, [`8[1-79]`], `0$1`],
            [
              `(\\d{3})(\\d{2})(\\d{2,3})`,
              `$1 $2 $3`,
              [`50[036-8]|8|90`, `50(?:[0367]|88)|8|90`],
              `0$1`,
            ],
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`24|[346]|7[2-57-9]|9[2-9]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`2(?:10|74)|[589]`], `0$1`],
            [`(\\d{2})(\\d{3,4})(\\d{4})`, `$1 $2 $3`, [`1|2[028]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,5})`, `$1 $2 $3`, [`2(?:[169]|7[0-35-9])|7`], `0$1`],
          ],
          `0`,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
        ],
        OM: [
          `968`,
          `00`,
          `(?:1505|[279]\\d{3}|500)\\d{4}|800\\d{5,6}`,
          [7, 8, 9],
          [
            [`(\\d{3})(\\d{4,6})`, `$1 $2`, [`[58]`]],
            [`(\\d{2})(\\d{6})`, `$1 $2`, [`2`]],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[179]`]],
          ],
        ],
        PA: [
          `507`,
          `00`,
          `(?:00800|8\\d{3})\\d{6}|[68]\\d{7}|[1-57-9]\\d{6}`,
          [7, 8, 10, 11],
          [
            [`(\\d{3})(\\d{4})`, `$1-$2`, [`[1-57-9]`]],
            [`(\\d{4})(\\d{4})`, `$1-$2`, [`[68]`]],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`8`]],
          ],
        ],
        PE: [
          `51`,
          `00|19(?:1[124]|77|90)00`,
          `(?:[14-8]|9\\d)\\d{7}`,
          [8, 9],
          [
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`80`], `(0$1)`],
            [`(\\d)(\\d{7})`, `$1 $2`, [`1`], `(0$1)`],
            [`(\\d{2})(\\d{6})`, `$1 $2`, [`[4-8]`], `(0$1)`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`9`]],
          ],
          `0`,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
          ` Anexo `,
        ],
        PF: [
          `689`,
          `00`,
          `4\\d{5}(?:\\d{2})?|8\\d{7,8}`,
          [6, 8, 9],
          [
            [`(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3`, [`44`]],
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`4|8[7-9]`]],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`8`]],
          ],
        ],
        PG: [
          `675`,
          `00|140[1-3]`,
          `(?:180|[78]\\d{3})\\d{4}|(?:[2-589]\\d|64)\\d{5}`,
          [7, 8],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`18|[2-69]|85`]],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[78]`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
        ],
        PH: [
          `63`,
          `00`,
          `(?:[2-7]|9\\d)\\d{8}|2\\d{5}|(?:1800|8)\\d{7,9}`,
          [6, 8, 9, 10, 11, 12, 13],
          [
            [`(\\d)(\\d{5})`, `$1 $2`, [`2`], `(0$1)`],
            [
              `(\\d{4})(\\d{4,6})`,
              `$1 $2`,
              [
                `3(?:23|39|46)|4(?:2[3-6]|[35]9|4[26]|76)|544|88[245]|(?:52|64|86)2`,
                `3(?:230|397|461)|4(?:2(?:35|[46]4|51)|396|4(?:22|63)|59[347]|76[15])|5(?:221|446)|642[23]|8(?:622|8(?:[24]2|5[13]))`,
              ],
              `(0$1)`,
            ],
            [
              `(\\d{5})(\\d{4})`,
              `$1 $2`,
              [`346|4(?:27|9[35])|883`, `3469|4(?:279|9(?:30|56))|8834`],
              `(0$1)`,
            ],
            [`(\\d)(\\d{4})(\\d{4})`, `$1 $2 $3`, [`2`], `(0$1)`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[3-7]|8[2-8]`], `(0$1)`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[89]`], `0$1`],
            [`(\\d{4})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`1`]],
            [`(\\d{4})(\\d{1,2})(\\d{3})(\\d{4})`, `$1 $2 $3 $4`, [`1`]],
          ],
          `0`,
        ],
        PK: [
          `92`,
          `00`,
          `122\\d{6}|[24-8]\\d{10,11}|9(?:[013-9]\\d{8,10}|2(?:[01]\\d\\d|2(?:[06-8]\\d|1[01]))\\d{7})|(?:[2-8]\\d{3}|92(?:[0-7]\\d|8[1-9]))\\d{6}|[24-9]\\d{8}|[89]\\d{7}`,
          [8, 9, 10, 11, 12],
          [
            [`(\\d{3})(\\d{3})(\\d{2,7})`, `$1 $2 $3`, [`[89]0`], `0$1`],
            [`(\\d{4})(\\d{5})`, `$1 $2`, [`1`]],
            [
              `(\\d{3})(\\d{6,7})`,
              `$1 $2`,
              [
                `2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:2[2-8]|3[27-9]|4[2-6]|6[3569]|9[25-8])`,
                `9(?:2[3-8]|98)|(?:2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:22|3[27-9]|4[2-6]|6[3569]|9[25-7]))[2-9]`,
              ],
              `(0$1)`,
            ],
            [
              `(\\d{2})(\\d{7,8})`,
              `$1 $2`,
              [`(?:2[125]|4[0-246-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91)[2-9]`],
              `(0$1)`,
            ],
            [`(\\d{5})(\\d{5})`, `$1 $2`, [`58`], `(0$1)`],
            [`(\\d{3})(\\d{7})`, `$1 $2`, [`3`], `0$1`],
            [
              `(\\d{2})(\\d{3})(\\d{3})(\\d{3})`,
              `$1 $2 $3 $4`,
              [`2[125]|4[0-246-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91`],
              `(0$1)`,
            ],
            [`(\\d{3})(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`[24-9]`], `(0$1)`],
          ],
          `0`,
        ],
        PL: [
          `48`,
          `00`,
          `(?:6|8\\d\\d)\\d{7}|[1-9]\\d{6}(?:\\d{2})?|[26]\\d{5}`,
          [6, 7, 8, 9, 10],
          [
            [`(\\d{5})`, `$1`, [`19`]],
            [`(\\d{3})(\\d{3})`, `$1 $2`, [`11|20|64`]],
            [
              `(\\d{2})(\\d{2})(\\d{3})`,
              `$1 $2 $3`,
              [
                `30|(?:1[2-8]|2[2-69]|3[2-4]|4[1-468]|5[24-689]|6[1-3578]|7[14-7]|8[1-79]|9[145])1`,
                `30|(?:1[2-8]|2[2-69]|3[2-4]|4[1-468]|5[24-689]|6[1-3578]|7[14-7]|8[1-79]|9[145])19`,
              ],
            ],
            [`(\\d{3})(\\d{2})(\\d{2,3})`, `$1 $2 $3`, [`64`]],
            [
              `(\\d{3})(\\d{3})(\\d{3})`,
              `$1 $2 $3`,
              [`21|39|45|5[0137]|6[0469]|7[02389]|8(?:0[14]|8)`],
            ],
            [`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`1[2-8]|[2-7]|8[1-79]|9[145]`]],
            [`(\\d{3})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`8`]],
          ],
        ],
        PM: [
          `508`,
          `00`,
          `[78]\\d{8}|[2-9]\\d{5}`,
          [6, 9],
          [
            [`(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3`, [`[2-9]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`7`]],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`8`], `0$1`],
          ],
          `0`,
        ],
        PR: [`1`, `011`, `(?:[589]\\d\\d|787)\\d{7}`, [10], 0, `1`, 0, 0, 0, 0, `787|939`],
        PS: [
          `970`,
          `00`,
          `[2489]2\\d{6}|(?:1\\d|5)\\d{8}`,
          [8, 9, 10],
          [
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[2489]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`5`], `0$1`],
            [`(\\d{4})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`1`]],
          ],
          `0`,
        ],
        PT: [
          `351`,
          `00`,
          `1693\\d{5}|(?:[26-9]\\d|30)\\d{7}`,
          [9],
          [
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`2[12]`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`16|[236-9]`]],
          ],
        ],
        PW: [
          `680`,
          `01[12]`,
          `(?:[24-8]\\d\\d|345|900)\\d{4}`,
          [7],
          [[`(\\d{3})(\\d{4})`, `$1 $2`, [`[2-9]`]]],
        ],
        PY: [
          `595`,
          `00`,
          `[36-8]\\d{5,8}|4\\d{6,8}|59\\d{6}|9\\d{5,10}|(?:2\\d|5[0-8])\\d{6,7}`,
          [6, 7, 8, 9, 10, 11],
          [
            [`(\\d{3})(\\d{3,6})`, `$1 $2`, [`[2-9]0`], `0$1`],
            [`(\\d{2})(\\d{5})`, `$1 $2`, [`3[289]|4[246-8]|61|7[1-3]|8[1-36]`], `(0$1)`],
            [
              `(\\d{3})(\\d{4,5})`,
              `$1 $2`,
              [`2[279]|3[13-5]|4[359]|5|6(?:[34]|7[1-46-8])|7[46-8]|85`],
              `(0$1)`,
            ],
            [
              `(\\d{2})(\\d{3})(\\d{3,4})`,
              `$1 $2 $3`,
              [`2[14-68]|3[26-9]|4[1246-8]|6(?:1|75)|7[1-35]|8[1-36]`],
              `(0$1)`,
            ],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`87`]],
            [`(\\d{3})(\\d{6})`, `$1 $2`, [`9(?:[5-79]|8[1-7])`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[2-8]`], `0$1`],
            [`(\\d{4})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`9`]],
          ],
          `0`,
        ],
        QA: [
          `974`,
          `00`,
          `800\\d{4}|(?:2|800)\\d{6}|(?:0080|[3-7])\\d{7}`,
          [7, 8, 9, 11],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`2[136]|8`]],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[3-7]`]],
          ],
        ],
        RE: [
          `262`,
          `00`,
          `709\\d{6}|(?:26|[689]\\d)\\d{7}`,
          [9],
          [[`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[26-9]`], `0$1`]],
          `0`,
          0,
          0,
          0,
          0,
          0,
          [
            [`2631[0-6]\\d{4}|26(?:2\\d|30|88)\\d{5}`],
            [
              `(?:69(?:2\\d\\d|3(?:[06][0-6]|1[0-3]|2[0-2]|3[0-39]|4\\d|5[0-5]|7[0-37]|8[0-8]|9[0-479]))|7092[0-3])\\d{4}`,
            ],
            [`80\\d{7}`],
            [`89[1-37-9]\\d{6}`],
            0,
            0,
            0,
            0,
            [`9(?:399[0-3]|479[0-6]|76(?:2[278]|3[0-37]))\\d{4}`],
            [`8(?:1[019]|2[0156]|84|90)\\d{6}`],
          ],
        ],
        RO: [
          `40`,
          `00`,
          `(?:[236-8]\\d|90)\\d{7}|[23]\\d{5}`,
          [6, 9],
          [
            [`(\\d{3})(\\d{3})`, `$1 $2`, [`2[3-6]`, `2[3-6]\\d9`], `0$1`],
            [`(\\d{2})(\\d{4})`, `$1 $2`, [`219|31`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[23]1`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[236-9]`], `0$1`],
          ],
          `0`,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          ` int `,
        ],
        RS: [
          `381`,
          `00`,
          `38[02-9]\\d{6,9}|6\\d{7,9}|90\\d{4,8}|38\\d{5,6}|(?:7\\d\\d|800)\\d{3,9}|(?:[12]\\d|3[0-79])\\d{5,10}`,
          [6, 7, 8, 9, 10, 11, 12],
          [
            [`(\\d{3})(\\d{3,9})`, `$1 $2`, [`(?:2[389]|39)0|[7-9]`], `0$1`],
            [`(\\d{2})(\\d{5,10})`, `$1 $2`, [`[1-36]`], `0$1`],
          ],
          `0`,
        ],
        RU: [
          `7`,
          `810`,
          `8\\d{13}|[347-9]\\d{9}`,
          [10, 14],
          [
            [
              `(\\d{4})(\\d{2})(\\d{2})(\\d{2})`,
              `$1 $2 $3 $4`,
              [
                `7(?:1[0-8]|2[1-9])`,
                `7(?:1(?:[0-356]2|4[29]|7|8[27])|2(?:1[23]|[2-9]2))`,
                `7(?:1(?:[0-356]2|4[29]|7|8[27])|2(?:13[03-69]|62[013-9]))|72[1-57-9]2`,
              ],
              `8 ($1)`,
              1,
            ],
            [
              `(\\d{5})(\\d)(\\d{2})(\\d{2})`,
              `$1 $2 $3 $4`,
              [
                `7(?:1[0-68]|2[1-9])`,
                `7(?:1(?:[06][3-6]|[18]|2[35]|[3-5][3-5])|2(?:[13][3-5]|[24-689]|7[457]))`,
                `7(?:1(?:0(?:[356]|4[023])|[18]|2(?:3[013-9]|5)|3[45]|43[013-79]|5(?:3[1-8]|4[1-7]|5)|6(?:3[0-35-9]|[4-6]))|2(?:1(?:3[178]|[45])|[24-689]|3[35]|7[457]))|7(?:14|23)4[0-8]|71(?:33|45)[1-79]`,
              ],
              `8 ($1)`,
              1,
            ],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`7`], `8 ($1)`, 1],
            [
              `(\\d{3})(\\d{3})(\\d{2})(\\d{2})`,
              `$1 $2-$3-$4`,
              [`[349]|8(?:[02-7]|1[1-8])`],
              `8 ($1)`,
              1,
            ],
            [`(\\d{4})(\\d{4})(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`8`], `8 ($1)`],
          ],
          `8`,
          0,
          0,
          0,
          0,
          `[3489]`,
          0,
          `8~10`,
        ],
        RW: [
          `250`,
          `00`,
          `(?:06|[27]\\d\\d|[89]00)\\d{6}`,
          [8, 9],
          [
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`0`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`2`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[7-9]`], `0$1`],
          ],
          `0`,
        ],
        SA: [
          `966`,
          `00`,
          `(?:[15]\\d|800|92)\\d{7}`,
          [9, 10],
          [
            [`(\\d{4})(\\d{5})`, `$1 $2`, [`9`]],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`1`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`5`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`8`]],
          ],
          `0`,
        ],
        SB: [
          `677`,
          `0[01]`,
          `[6-9]\\d{6}|[1-6]\\d{4}`,
          [5, 7],
          [[`(\\d{2})(\\d{5})`, `$1 $2`, [`6[89]|7|8[4-9]|9(?:[1-8]|9[0-8])`]]],
        ],
        SC: [
          `248`,
          `010|0[0-2]`,
          `(?:[2489]\\d|64)\\d{5}`,
          [7],
          [[`(\\d)(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[246]|9[57]`]]],
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
        ],
        SD: [
          `249`,
          `00`,
          `[19]\\d{8}`,
          [9],
          [[`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[19]`], `0$1`]],
          `0`,
        ],
        SE: [
          `46`,
          `00`,
          `(?:[26]\\d\\d|9)\\d{9}|[1-9]\\d{8}|[1-689]\\d{7}|[1-4689]\\d{6}|2\\d{5}`,
          [6, 7, 8, 9, 10, 12],
          [
            [`(\\d{2})(\\d{2,3})(\\d{2})`, `$1-$2 $3`, [`20`], `0$1`, 0, `$1 $2 $3`],
            [`(\\d{3})(\\d{4})`, `$1-$2`, [`9(?:00|39|44|9)`], `0$1`, 0, `$1 $2`],
            [
              `(\\d{2})(\\d{3})(\\d{2})`,
              `$1-$2 $3`,
              [`[12][136]|3[356]|4[0246]|6[03]|90[1-9]`],
              `0$1`,
              0,
              `$1 $2 $3`,
            ],
            [`(\\d)(\\d{2,3})(\\d{2})(\\d{2})`, `$1-$2 $3 $4`, [`8`], `0$1`, 0, `$1 $2 $3 $4`],
            [
              `(\\d{3})(\\d{2,3})(\\d{2})`,
              `$1-$2 $3`,
              [
                `1[2457]|2(?:[247-9]|5[0138])|3[0247-9]|4[1357-9]|5[0-35-9]|6(?:[125689]|4[02-57]|7[0-2])|9(?:[125-8]|3[02-5]|4[0-3])`,
              ],
              `0$1`,
              0,
              `$1 $2 $3`,
            ],
            [`(\\d{3})(\\d{2,3})(\\d{3})`, `$1-$2 $3`, [`9(?:00|39|44)`], `0$1`, 0, `$1 $2 $3`],
            [
              `(\\d{2})(\\d{2,3})(\\d{2})(\\d{2})`,
              `$1-$2 $3 $4`,
              [`1[13689]|2[0136]|3[1356]|4[0246]|54|6[03]|90[1-9]`],
              `0$1`,
              0,
              `$1 $2 $3 $4`,
            ],
            [`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1-$2 $3 $4`, [`10|7`], `0$1`, 0, `$1 $2 $3 $4`],
            [`(\\d)(\\d{3})(\\d{3})(\\d{2})`, `$1-$2 $3 $4`, [`8`], `0$1`, 0, `$1 $2 $3 $4`],
            [
              `(\\d{3})(\\d{2})(\\d{2})(\\d{2})`,
              `$1-$2 $3 $4`,
              [`[13-5]|2(?:[247-9]|5[0138])|6(?:[124-689]|7[0-2])|9(?:[125-8]|3[02-5]|4[0-3])`],
              `0$1`,
              0,
              `$1 $2 $3 $4`,
            ],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{3})`, `$1-$2 $3 $4`, [`9`], `0$1`, 0, `$1 $2 $3 $4`],
            [
              `(\\d{3})(\\d{2})(\\d{3})(\\d{2})(\\d{2})`,
              `$1-$2 $3 $4 $5`,
              [`[26]`],
              `0$1`,
              0,
              `$1 $2 $3 $4 $5`,
            ],
          ],
          `0`,
        ],
        SG: [
          `65`,
          `0[0-3]\\d`,
          `(?:(?:1\\d|8)\\d\\d|7000)\\d{7}|[3689]\\d{7}`,
          [8, 10, 11],
          [
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[369]|8(?:0[1-9]|[1-9])`]],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`8`]],
            [`(\\d{4})(\\d{4})(\\d{3})`, `$1 $2 $3`, [`7`]],
            [`(\\d{4})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`1`]],
          ],
        ],
        SH: [`290`, `00`, `(?:[256]\\d|8)\\d{3}`, [4, 5], 0, 0, 0, 0, 0, 0, `[256]`],
        SI: [
          `386`,
          `00|10(?:22|66|88|99)`,
          `[1-7]\\d{7}|8\\d{4,7}|90\\d{4,6}`,
          [5, 6, 7, 8],
          [
            [`(\\d{2})(\\d{3,6})`, `$1 $2`, [`8[09]|9`], `0$1`],
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`59|8`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[37][01]|4[013]|51|6`], `0$1`],
            [`(\\d)(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[1-57]`], `(0$1)`],
          ],
          `0`,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
        ],
        SJ: [`47`, `00`, `0\\d{4}|(?:[489]\\d|79)\\d{6}`, [5, 8], 0, 0, 0, 0, 0, 0, `79`],
        SK: [
          `421`,
          `00`,
          `[2-689]\\d{8}|[2-59]\\d{6}|[2-5]\\d{5}`,
          [6, 7, 9],
          [
            [`(\\d)(\\d{2})(\\d{3,4})`, `$1 $2 $3`, [`21`], `0$1`],
            [`(\\d{2})(\\d{2})(\\d{2,3})`, `$1 $2 $3`, [`[3-5][1-8]1`, `[3-5][1-8]1[67]`], `0$1`],
            [`(\\d)(\\d{3})(\\d{3})(\\d{2})`, `$1 $2 $3 $4`, [`2`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[689]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[3-5]`], `0$1`],
          ],
          `0`,
        ],
        SL: [
          `232`,
          `00`,
          `(?:[237-9]\\d|66)\\d{6}`,
          [8],
          [[`(\\d{2})(\\d{6})`, `$1 $2`, [`[236-9]`], `(0$1)`]],
          `0`,
        ],
        SM: [
          `378`,
          `00`,
          `(?:0549|[5-7]\\d)\\d{6}`,
          [8, 10],
          [
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[5-7]`]],
            [`(\\d{4})(\\d{6})`, `$1 $2`, [`0`]],
          ],
          0,
          0,
          `([89]\\d{5})$`,
          `0549$1`,
        ],
        SN: [
          `221`,
          `00`,
          `(?:[378]\\d|93)\\d{7}`,
          [9],
          [
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`8`]],
            [`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[379]`]],
          ],
        ],
        SO: [
          `252`,
          `00`,
          `[346-9]\\d{8}|[12679]\\d{7}|[1-5]\\d{6}|[1348]\\d{5}`,
          [6, 7, 8, 9],
          [
            [`(\\d{2})(\\d{4})`, `$1 $2`, [`8[125]`]],
            [`(\\d{6})`, `$1`, [`[134]`]],
            [`(\\d)(\\d{6})`, `$1 $2`, [`[15]|2[0-79]|3[0-46-8]|4[0-7]`]],
            [`(\\d{2})(\\d{5,7})`, `$1 $2`, [`1|28|9[2-9]`]],
            [`(\\d)(\\d{7})`, `$1 $2`, [`[267]|904`]],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[346-9]`]],
          ],
          `0`,
        ],
        SR: [
          `597`,
          `00`,
          `(?:[2-5]|[6-9]\\d)\\d{5}`,
          [6, 7],
          [
            [`(\\d{2})(\\d{2})(\\d{2})`, `$1-$2-$3`, [`56`]],
            [`(\\d{3})(\\d{3})`, `$1-$2`, [`[2-5]`]],
            [`(\\d{3})(\\d{4})`, `$1-$2`, [`[6-9]`]],
          ],
        ],
        SS: [
          `211`,
          `00`,
          `[19]\\d{8}`,
          [9],
          [[`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[19]`], `0$1`]],
          `0`,
        ],
        ST: [`239`, `00`, `(?:22|9\\d)\\d{5}`, [7], [[`(\\d{3})(\\d{4})`, `$1 $2`, [`[29]`]]]],
        SV: [
          `503`,
          `00`,
          `[25-7]\\d{7}|(?:80\\d|900)\\d{4}(?:\\d{4})?`,
          [7, 8, 11],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`[89]`]],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[25-7]`]],
            [`(\\d{3})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`[89]`]],
          ],
        ],
        SX: [
          `1`,
          `011`,
          `7215\\d{6}|(?:[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `(5\\d{6})$|1`,
          `721$1`,
          0,
          `721`,
        ],
        SY: [
          `963`,
          `00`,
          `[1-359]\\d{8}|[1-5]\\d{7}`,
          [8, 9],
          [
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[1-4]|5[1-3]`], `0$1`, 1],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[59]`], `0$1`, 1],
          ],
          `0`,
        ],
        SZ: [
          `268`,
          `00`,
          `0800\\d{4}|(?:[237]\\d|900)\\d{6}`,
          [8, 9],
          [
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[0237]`]],
            [`(\\d{5})(\\d{4})`, `$1 $2`, [`9`]],
          ],
        ],
        TA: [`290`, `00`, `8\\d{3}`, [4], 0, 0, 0, 0, 0, 0, `8`],
        TC: [
          `1`,
          `011`,
          `(?:[58]\\d\\d|649|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-479]\\d{6})$|1`,
          `649$1`,
          0,
          `649`,
        ],
        TD: [
          `235`,
          `00|16`,
          `(?:22|[3689]\\d|77)\\d{6}`,
          [8],
          [[`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[236-9]`]]],
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
        ],
        TG: [
          `228`,
          `00`,
          `[279]\\d{7}`,
          [8],
          [[`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[279]`]]],
        ],
        TH: [
          `66`,
          `00[1-9]`,
          `(?:001800|[2-57]|[689]\\d)\\d{7}|1\\d{7,9}`,
          [8, 9, 10, 13],
          [
            [`(\\d)(\\d{3})(\\d{4})`, `$1 $2 $3`, [`2`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[13-9]`], `0$1`],
            [`(\\d{4})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`1`]],
          ],
          `0`,
        ],
        TJ: [
          `992`,
          `810`,
          `(?:[0-57-9]\\d|66)\\d{7}`,
          [9],
          [
            [`(\\d{6})(\\d)(\\d{2})`, `$1 $2 $3`, [`331`, `3317`]],
            [`(\\d{3})(\\d{2})(\\d{4})`, `$1 $2 $3`, [`44[02-479]|[34]7`]],
            [`(\\d{4})(\\d)(\\d{4})`, `$1 $2 $3`, [`3(?:[1245]|3[12])`]],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`\\d`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `8~10`,
        ],
        TK: [`690`, `00`, `[2-47]\\d{3,6}`, [4, 5, 6, 7]],
        TL: [
          `670`,
          `00`,
          `7\\d{7}|(?:[2-47]\\d|[89]0)\\d{5}`,
          [7, 8],
          [
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`[2-489]|70`]],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`7`]],
          ],
        ],
        TM: [
          `993`,
          `810`,
          `[1-7]\\d{7}`,
          [8],
          [
            [`(\\d{2})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2-$3-$4`, [`12`], `(8 $1)`],
            [`(\\d{3})(\\d)(\\d{2})(\\d{2})`, `$1 $2-$3-$4`, [`[1-5]`], `(8 $1)`],
            [`(\\d{2})(\\d{6})`, `$1 $2`, [`[67]`], `8 $1`],
          ],
          `8`,
          0,
          0,
          0,
          0,
          0,
          0,
          `8~10`,
        ],
        TN: [
          `216`,
          `00`,
          `[2-57-9]\\d{7}`,
          [8],
          [[`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[2-57-9]`]]],
        ],
        TO: [
          `676`,
          `00`,
          `(?:0800|(?:[5-8]\\d\\d|999)\\d)\\d{3}|[2-8]\\d{4}`,
          [5, 7],
          [
            [`(\\d{2})(\\d{3})`, `$1-$2`, [`[2-4]|50|6[09]|7[0-24-69]|8[05]`]],
            [`(\\d{4})(\\d{3})`, `$1 $2`, [`0`]],
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`[5-9]`]],
          ],
        ],
        TR: [
          `90`,
          `00`,
          `4\\d{6}|8\\d{11,12}|(?:[2-58]\\d\\d|900)\\d{7}`,
          [7, 10, 12, 13],
          [
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`512|8[01589]|90`], `0$1`, 1],
            [`(\\d{3})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`5`], `0$1`, 1],
            [`(\\d{3})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[24][1-8]|3[1-9]`], `(0$1)`, 1],
            [`(\\d{3})(\\d{3})(\\d{6,7})`, `$1 $2 $3`, [`80`], `0$1`, 1],
          ],
          `0`,
        ],
        TT: [
          `1`,
          `011`,
          `(?:[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-46-8]\\d{6})$|1`,
          `868$1`,
          0,
          `868`,
        ],
        TV: [
          `688`,
          `00`,
          `(?:2|7\\d\\d|90)\\d{4}`,
          [5, 6, 7],
          [
            [`(\\d{2})(\\d{3})`, `$1 $2`, [`2`]],
            [`(\\d{2})(\\d{4})`, `$1 $2`, [`90`]],
            [`(\\d{2})(\\d{5})`, `$1 $2`, [`7`]],
          ],
        ],
        TW: [
          `886`,
          `0(?:0[25-79]|19)`,
          `[2-689]\\d{8}|7\\d{9,10}|[2-8]\\d{7}|2\\d{6}`,
          [7, 8, 9, 10, 11],
          [
            [`(\\d{2})(\\d)(\\d{4})`, `$1 $2 $3`, [`202`], `0$1`],
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`826`], `0$1`],
            [`(\\d{3})(\\d{2})(\\d{3})`, `$1 $2 $3`, [`83`], `0$1`],
            [`(\\d{2})(\\d{2})(\\d{4})`, `$1 $2 $3`, [`82`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[25]0|37|49|8[09]`], `0$1`],
            [
              `(\\d)(\\d{3,4})(\\d{4})`,
              `$1 $2 $3`,
              [
                `[23568]|4(?:0[02-48]|[1-478])|7[1-9]`,
                `[23568]|4(?:0[2-48]|[1-478])|(?:400|7)[1-9]`,
              ],
              `0$1`,
            ],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[49]`], `0$1`],
            [`(\\d{2})(\\d{4})(\\d{4,5})`, `$1 $2 $3`, [`7`], `0$1`],
          ],
          `0`,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          `#`,
        ],
        TZ: [
          `255`,
          `00[056]`,
          `(?:[25-8]\\d|41|90)\\d{7}`,
          [9],
          [
            [`(\\d{3})(\\d{2})(\\d{4})`, `$1 $2 $3`, [`[89]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[24]`], `0$1`],
            [`(\\d{2})(\\d{7})`, `$1 $2`, [`5`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[67]`], `0$1`],
          ],
          `0`,
        ],
        UA: [
          `380`,
          `00`,
          `[89]\\d{9}|[3-9]\\d{8}`,
          [9, 10],
          [
            [
              `(\\d{3})(\\d{3})(\\d{3})`,
              `$1 $2 $3`,
              [
                `6[12][29]|(?:3[1-8]|4[136-8]|5[12457]|6[49])2|(?:56|65)[24]`,
                `6[12][29]|(?:35|4[1378]|5[12457]|6[49])2|(?:56|65)[24]|(?:3[1-46-8]|46)2[013-9]`,
              ],
              `0$1`,
            ],
            [
              `(\\d{4})(\\d{5})`,
              `$1 $2`,
              [
                `3[1-8]|4(?:[1367]|[45][6-9]|8[4-6])|5(?:[1-5]|6[0135689]|7[4-6])|6(?:[12][3-7]|[459])`,
                `3[1-8]|4(?:[1367]|[45][6-9]|8[4-6])|5(?:[1-5]|6(?:[015689]|3[02389])|7[4-6])|6(?:[12][3-7]|[459])`,
              ],
              `0$1`,
            ],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[3-7]|89|9[1-9]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[89]`], `0$1`],
          ],
          `0`,
          0,
          0,
          0,
          0,
          0,
          0,
          `0~0`,
        ],
        UG: [
          `256`,
          `00[057]`,
          `800\\d{6}|(?:[29]0|[347]\\d)\\d{7}`,
          [9],
          [
            [`(\\d{4})(\\d{5})`, `$1 $2`, [`202`, `2024`, `20240`], `0$1`],
            [
              `(\\d{3})(\\d{6})`,
              `$1 $2`,
              [`20[0-35-7]|4(?:6[45]|[7-9])|[7-9]`, `20(?:[0135-7]|2[5-9])|4(?:6[45]|[7-9])|[7-9]`],
              `0$1`,
            ],
            [`(\\d{2})(\\d{7})`, `$1 $2`, [`[2-4]`], `0$1`],
          ],
          `0`,
        ],
        US: [
          `1`,
          `011`,
          `[2-9]\\d{9}|3\\d{6}`,
          [10],
          [
            [`(\\d{3})(\\d{4})`, `$1-$2`, [`310`], 0, 1],
            [`(\\d{3})(\\d{3})(\\d{4})`, `($1) $2-$3`, [`[2-9]`], 0, 1, `$1-$2-$3`],
          ],
          `1`,
          0,
          0,
          0,
          0,
          0,
          [
            [
              `(?:472[2-47-9]|983[2-57-9])\\d{6}|(?:2(?:0[1-35-9]|1[02-9]|2[03-57-9]|3[1459]|4[08]|5[1-46]|6[0279]|7[02469]|8[13])|3(?:0[1-57-9]|1[02-9]|2[013-79]|3[0-24679]|4[167]|5[0-3]|6[01349]|8[056])|4(?:0[124-9]|1[02-579]|2[3-5]|3[0245]|4[023578]|58|6[349]|7[0589]|8[04])|5(?:0[1-57-9]|1[0235-8]|20|3[0149]|4[01]|5[179]|6[1-47]|7[0-5]|8[0256])|6(?:0[1-35-9]|1[024-9]|2[03689]|3[016]|4[0156]|5[01679]|6[0-279]|78|8[0-269])|7(?:0[1-46-8]|1[2-9]|2[04-8]|3[0-2478]|4[0378]|5[47]|6[02359]|7[0-59]|8[156])|8(?:0[1-68]|1[02-8]|2[0168]|3[0-2589]|4[03578]|5[046-9]|6[02-5]|7[028])|9(?:0[1346-9]|1[02-9]|2[0589]|3[0146-8]|4[01357-9]|5[12469]|7[0-3589]|8[04-69]))[2-9]\\d{6}`,
            ],
            [``],
            [`8(?:00|33|44|55|66|77|88)[2-9]\\d{6}`],
            [`900[2-9]\\d{6}`],
            [
              `52(?:3(?:[2-46-9][02-9]\\d|5(?:[02-46-9]\\d|5[0-46-9]))|4(?:[2-478][02-9]\\d|5(?:[034]\\d|2[024-9]|5[0-46-9])|6(?:0[1-9]|[2-9]\\d)|9(?:[05-9]\\d|2[0-5]|49)))\\d{4}|52[34][2-9]1[02-9]\\d{4}|5(?:00|2[125-9]|3[23]|44|66|77|88)[2-9]\\d{6}`,
            ],
          ],
        ],
        UY: [
          `598`,
          `0(?:0|1[3-9]\\d)`,
          `0004\\d{2,9}|[1249]\\d{7}|2\\d{3,4}|(?:[49]\\d|80)\\d{5}`,
          [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
          [
            [`(\\d{4,5})`, `$1`, [`21`]],
            [`(\\d{3})(\\d{3,4})`, `$1 $2`, [`0`]],
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`[49]0|8`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`9`], `0$1`],
            [`(\\d{4})(\\d{4})`, `$1 $2`, [`[124]`]],
            [`(\\d{3})(\\d{3})(\\d{2,4})`, `$1 $2 $3`, [`0`]],
            [`(\\d{3})(\\d{3})(\\d{3})(\\d{2,4})`, `$1 $2 $3 $4`, [`0`]],
          ],
          `0`,
          0,
          0,
          0,
          0,
          0,
          0,
          `00`,
          ` int. `,
        ],
        UZ: [
          `998`,
          `00`,
          `(?:20|33|[5-9]\\d)\\d{7}`,
          [9],
          [[`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`[235-9]`]]],
        ],
        VA: [
          `39`,
          `00`,
          `0\\d{5,10}|3[0-8]\\d{7,10}|55\\d{8}|8\\d{5}(?:\\d{2,4})?|(?:1\\d|39)\\d{7,8}`,
          [6, 7, 8, 9, 10, 11, 12],
          0,
          0,
          0,
          0,
          0,
          0,
          `06698`,
        ],
        VC: [
          `1`,
          `011`,
          `(?:[58]\\d\\d|784|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-7]\\d{6})$|1`,
          `784$1`,
          0,
          `784`,
        ],
        VE: [
          `58`,
          `00`,
          `[68]00\\d{7}|(?:[24]\\d|[59]0)\\d{8}`,
          [10],
          [[`(\\d{3})(\\d{7})`, `$1-$2`, [`[24-689]`], `0$1`]],
          `0`,
        ],
        VG: [
          `1`,
          `011`,
          `(?:284|[58]\\d\\d|900)\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-578]\\d{6})$|1`,
          `284$1`,
          0,
          `284`,
        ],
        VI: [
          `1`,
          `011`,
          `[58]\\d{9}|(?:34|90)0\\d{7}`,
          [10],
          0,
          `1`,
          0,
          `([2-9]\\d{6})$|1`,
          `340$1`,
          0,
          `340`,
        ],
        VN: [
          `84`,
          `00`,
          `[12]\\d{9}|[135-9]\\d{8}|[16]\\d{6,7}|7\\d{6}`,
          [7, 8, 9, 10],
          [
            [`(\\d{4})(\\d{4,6})`, `$1 $2`, [`1(?:2[02]|[89])`], 0, 1],
            [`(\\d{2})(\\d{3})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`1[26]|6`], `0$1`, 1],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[357-9]`], `0$1`, 1],
            [`(\\d{2})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`2[48]`], `0$1`, 1],
            [`(\\d{3})(\\d{4})(\\d{3})`, `$1 $2 $3`, [`2`], `0$1`, 1],
          ],
          `0`,
        ],
        VU: [
          `678`,
          `00`,
          `[57-9]\\d{6}|(?:[238]\\d|48)\\d{3}`,
          [5, 7],
          [[`(\\d{3})(\\d{4})`, `$1 $2`, [`[57-9]`]]],
        ],
        WF: [
          `681`,
          `00`,
          `(?:40|72|8\\d{4})\\d{4}|[89]\\d{5}`,
          [6, 9],
          [
            [`(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3`, [`[47-9]`]],
            [`(\\d{3})(\\d{2})(\\d{2})(\\d{2})`, `$1 $2 $3 $4`, [`8`]],
          ],
        ],
        WS: [
          `685`,
          `0`,
          `(?:[2-6]|8\\d{5})\\d{4}|[78]\\d{6}|[68]\\d{5}`,
          [5, 6, 7, 10],
          [
            [`(\\d{5})`, `$1`, [`[2-5]|6[1-9]`]],
            [`(\\d{3})(\\d{3,7})`, `$1 $2`, [`[68]`]],
            [`(\\d{2})(\\d{5})`, `$1 $2`, [`7`]],
          ],
        ],
        XK: [
          `383`,
          `00`,
          `2\\d{7,8}|3\\d{7,11}|(?:4\\d\\d|[89]00)\\d{5}`,
          [8, 9, 10, 11, 12],
          [
            [`(\\d{3})(\\d{5})`, `$1 $2`, [`[89]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[2-4]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`2|39`], `0$1`],
            [`(\\d{2})(\\d{7,10})`, `$1 $2`, [`3`], `0$1`],
          ],
          `0`,
        ],
        YE: [
          `967`,
          `00`,
          `(?:1|7\\d)\\d{7}|[1-7]\\d{6}`,
          [7, 8, 9],
          [
            [`(\\d)(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`[1-6]|7(?:[24-6]|8[0-7])`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`7`], `0$1`],
          ],
          `0`,
        ],
        YT: [
          `262`,
          `00`,
          `(?:639\\d|7093)\\d{5}|(?:26|80|9\\d)\\d{7}`,
          [9],
          0,
          `0`,
          0,
          0,
          0,
          0,
          0,
          [
            [`26(?:89\\d|9(?:0[0-467]|15|5[0-4]|6\\d|[78]0))\\d{4}`],
            [`(?:639(?:0[0-79]|1[019]|[267]\\d|3[09]|40|5[05-9]|9[04-79])|7093[5-7])\\d{4}`],
            [`80\\d{7}`],
            0,
            0,
            0,
            0,
            0,
            [`9(?:(?:39|47)8[01]|769\\d)\\d{4}`],
          ],
        ],
        ZA: [
          `27`,
          `00`,
          `[1-79]\\d{8}|8\\d{4,9}`,
          [5, 6, 7, 8, 9, 10],
          [
            [`(\\d{2})(\\d{3,4})`, `$1 $2`, [`8[1-4]`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{2,3})`, `$1 $2 $3`, [`8[1-4]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`860`], `0$1`],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`[1-9]`], `0$1`],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`8`], `0$1`],
          ],
          `0`,
        ],
        ZM: [
          `260`,
          `00`,
          `800\\d{6}|(?:21|[579]\\d|63)\\d{7}`,
          [9],
          [
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[28]`], `0$1`],
            [`(\\d{2})(\\d{7})`, `$1 $2`, [`[579]`], `0$1`],
          ],
          `0`,
        ],
        ZW: [
          `263`,
          `00`,
          `2(?:[0-57-9]\\d{6,8}|6[0-24-9]\\d{6,7})|[38]\\d{9}|[35-8]\\d{8}|[3-6]\\d{7}|[1-689]\\d{6}|[1-3569]\\d{5}|[1356]\\d{4}`,
          [5, 6, 7, 8, 9, 10],
          [
            [
              `(\\d{3})(\\d{3,5})`,
              `$1 $2`,
              [
                `2(?:0[45]|2[278]|[49]8)|3(?:[09]8|17)|6(?:[29]8|37|75)|[23][78]|(?:33|5[15]|6[68])[78]`,
              ],
              `0$1`,
            ],
            [`(\\d)(\\d{3})(\\d{2,4})`, `$1 $2 $3`, [`[49]`], `0$1`],
            [`(\\d{3})(\\d{4})`, `$1 $2`, [`80`], `0$1`],
            [
              `(\\d{2})(\\d{7})`,
              `$1 $2`,
              [
                `24|8[13-59]|(?:2[05-79]|39|5[45]|6[15-8])2`,
                `2(?:02[014]|4|[56]20|[79]2)|392|5(?:42|525)|6(?:[16-8]21|52[013])|8[13-59]`,
              ],
              `(0$1)`,
            ],
            [`(\\d{2})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`7`], `0$1`],
            [
              `(\\d{3})(\\d{3})(\\d{3,4})`,
              `$1 $2 $3`,
              [
                `2(?:1[39]|2[0157]|[378]|[56][14])|3(?:12|29)`,
                `2(?:1[39]|2[0157]|[378]|[56][14])|3(?:123|29)`,
              ],
              `0$1`,
            ],
            [`(\\d{4})(\\d{6})`, `$1 $2`, [`8`], `0$1`],
            [
              `(\\d{2})(\\d{3,5})`,
              `$1 $2`,
              [
                `1|2(?:0[0-36-9]|12|29|[56])|3(?:1[0-689]|[24-6])|5(?:[0236-9]|1[2-4])|6(?:[013-59]|7[0-46-9])|(?:33|55|6[68])[0-69]|(?:29|3[09]|62)[0-79]`,
              ],
              `0$1`,
            ],
            [`(\\d{2})(\\d{3})(\\d{3,4})`, `$1 $2 $3`, [`29[013-9]|39|54`], `0$1`],
            [`(\\d{4})(\\d{3,5})`, `$1 $2`, [`(?:25|54)8`, `258|5483`], `0$1`],
          ],
          `0`,
        ],
      },
      nonGeographic: {
        800: [
          `800`,
          0,
          `(?:00|[1-9]\\d)\\d{6}`,
          [8],
          [[`(\\d{4})(\\d{4})`, `$1 $2`, [`\\d`]]],
          0,
          0,
          0,
          0,
          0,
          0,
          [0, 0, [`(?:00|[1-9]\\d)\\d{6}`]],
        ],
        808: [
          `808`,
          0,
          `[1-9]\\d{7}`,
          [8],
          [[`(\\d{4})(\\d{4})`, `$1 $2`, [`[1-9]`]]],
          0,
          0,
          0,
          0,
          0,
          0,
          [0, 0, 0, 0, 0, 0, 0, 0, 0, [`[1-9]\\d{7}`]],
        ],
        870: [
          `870`,
          0,
          `7\\d{11}|[235-7]\\d{8}`,
          [9, 12],
          [[`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`[235-7]`]]],
          0,
          0,
          0,
          0,
          0,
          0,
          [0, [`(?:[356]|774[45])\\d{8}|7[6-8]\\d{7}`], 0, 0, 0, 0, 0, 0, [`2\\d{8}`, [9]]],
        ],
        878: [
          `878`,
          0,
          `10\\d{10}`,
          [12],
          [[`(\\d{2})(\\d{5})(\\d{5})`, `$1 $2 $3`, [`1`]]],
          0,
          0,
          0,
          0,
          0,
          0,
          [0, 0, 0, 0, 0, 0, 0, 0, [`10\\d{10}`]],
        ],
        881: [
          `881`,
          0,
          `6\\d{9}|[0-36-9]\\d{8}`,
          [9, 10],
          [
            [`(\\d)(\\d{3})(\\d{5})`, `$1 $2 $3`, [`[0-37-9]`]],
            [`(\\d)(\\d{3})(\\d{5,6})`, `$1 $2 $3`, [`6`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          [0, [`6\\d{9}|[0-36-9]\\d{8}`]],
        ],
        882: [
          `882`,
          0,
          `[13]\\d{6}(?:\\d{2,5})?|[19]\\d{7}|(?:[25]\\d\\d|4)\\d{7}(?:\\d{2})?`,
          [7, 8, 9, 10, 11, 12],
          [
            [`(\\d{2})(\\d{5})`, `$1 $2`, [`16|342`]],
            [`(\\d{2})(\\d{6})`, `$1 $2`, [`49`]],
            [`(\\d{2})(\\d{2})(\\d{4})`, `$1 $2 $3`, [`1[36]|9`]],
            [`(\\d{2})(\\d{4})(\\d{3})`, `$1 $2 $3`, [`3[23]`]],
            [`(\\d{2})(\\d{3,4})(\\d{4})`, `$1 $2 $3`, [`16`]],
            [`(\\d{2})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`10|23|3(?:[15]|4[57])|4|5[12]`]],
            [`(\\d{3})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`34`]],
            [`(\\d{2})(\\d{4,5})(\\d{5})`, `$1 $2 $3`, [`[1-35]`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          [
            0,
            [
              `342\\d{4}|(?:337|49)\\d{6}|(?:3(?:2|47|7\\d{3})|5(?:0\\d{3}|2[0-2]))\\d{7}`,
              [7, 8, 9, 10, 12],
            ],
            0,
            0,
            0,
            [`348[57]\\d{7}`, [11]],
            0,
            0,
            [
              `1(?:3(?:0[0347]|[13][0139]|2[035]|4[013568]|6[0459]|7[06]|8[15-8]|9[0689])\\d{4}|6\\d{5,10})|(?:345\\d|9[89])\\d{6}|(?:10|2(?:3|85\\d)|3(?:[15]|[69]\\d\\d)|4[15-8]|51)\\d{8}`,
            ],
          ],
        ],
        883: [
          `883`,
          0,
          `(?:[1-4]\\d|51)\\d{6,10}`,
          [8, 9, 10, 11, 12],
          [
            [`(\\d{3})(\\d{3})(\\d{2,8})`, `$1 $2 $3`, [`[14]|2[24-689]|3[02-689]|51[24-9]`]],
            [`(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3`, [`510`]],
            [`(\\d{3})(\\d{3})(\\d{4})`, `$1 $2 $3`, [`21`]],
            [`(\\d{4})(\\d{4})(\\d{4})`, `$1 $2 $3`, [`51[13]`]],
            [`(\\d{3})(\\d{3})(\\d{3})(\\d{3})`, `$1 $2 $3 $4`, [`[235]`]],
          ],
          0,
          0,
          0,
          0,
          0,
          0,
          [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            [
              `(?:2(?:00\\d\\d|10)|(?:370[1-9]|51\\d0)\\d)\\d{7}|51(?:00\\d{5}|[24-9]0\\d{4,7})|(?:1[0-79]|2[24-689]|3[02-689]|4[0-4])0\\d{5,9}`,
            ],
          ],
        ],
        888: [
          `888`,
          0,
          `\\d{11}`,
          [11],
          [[`(\\d{3})(\\d{3})(\\d{5})`, `$1 $2 $3`]],
          0,
          0,
          0,
          0,
          0,
          0,
          [0, 0, 0, 0, 0, 0, [`\\d{11}`]],
        ],
        979: [
          `979`,
          0,
          `[1359]\\d{8}`,
          [9],
          [[`(\\d)(\\d{4})(\\d{4})`, `$1 $2 $3`, [`[1359]`]]],
          0,
          0,
          0,
          0,
          0,
          0,
          [0, 0, 0, [`[1359]\\d{8}`]],
        ],
      },
    };
  }))();
}
function ec(e, t) {
  var n = Array.prototype.slice.call(t);
  return (n.push(Qs), e.apply(this, n));
}
function tc() {
  return (tc = e(() => {
    $s();
  }))();
}
function nc(e, t) {
  ((e = e.split(`-`)), (t = t.split(`-`)));
  for (var n = e[0].split(`.`), r = t[0].split(`.`), i = 0; i < 3; i++) {
    var a = Number(n[i]),
      o = Number(r[i]);
    if (a > o) return 1;
    if (o > a) return -1;
    if (!isNaN(a) && isNaN(o)) return 1;
    if (isNaN(a) && !isNaN(o)) return -1;
  }
  return e[1] && t[1]
    ? e[1] > t[1]
      ? 1
      : e[1] < t[1]
        ? -1
        : 0
    : !e[1] && t[1]
      ? 1
      : e[1] && !t[1]
        ? -1
        : 0;
}
function rc(e) {
  return e != null && e.constructor === ic;
}
var ic;
function ac() {
  return (ac = e(() => {
    ic = {}.constructor;
  }))();
}
function oc(e) {
  return sc.test(e);
}
var sc;
function cc() {
  return (cc = e(() => {
    sc = /^\d+$/;
  }))();
}
function lc(e) {
  "@babel/helpers - typeof";
  return (
    (lc =
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
    lc(e)
  );
}
function uc(e, t) {
  if (!(e instanceof t)) throw TypeError(`Cannot call a class as a function`);
}
function dc(e, t) {
  for (var n = 0; n < t.length; n++) {
    var r = t[n];
    ((r.enumerable = r.enumerable || !1),
      (r.configurable = !0),
      `value` in r && (r.writable = !0),
      Object.defineProperty(e, pc(r.key), r));
  }
}
function fc(e, t, n) {
  return (
    t && dc(e.prototype, t),
    n && dc(e, n),
    Object.defineProperty(e, "prototype", { writable: !1 }),
    e
  );
}
function pc(e) {
  var t = mc(e, `string`);
  return lc(t) == `symbol` ? t : t + ``;
}
function mc(e, t) {
  if (lc(e) != `object` || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || `default`);
    if (lc(r) != `object`) return r;
    throw TypeError(`@@toPrimitive must return a primitive value.`);
  }
  return (t === `string` ? String : Number)(e);
}
function hc(e, t) {
  switch (t) {
    case `FIXED_LINE`:
      return e[0];
    case `MOBILE`:
      return e[1];
    case `TOLL_FREE`:
      return e[2];
    case `PREMIUM_RATE`:
      return e[3];
    case `PERSONAL_NUMBER`:
      return e[4];
    case `VOICEMAIL`:
      return e[5];
    case `UAN`:
      return e[6];
    case `PAGER`:
      return e[7];
    case `VOIP`:
      return e[8];
    case `SHARED_COST`:
      return e[9];
  }
}
function gc(e) {
  if (!e) throw Error("[libphonenumber-js] `metadata` argument not passed. Check your arguments.");
  if (!rc(e) || !rc(e.countries))
    throw Error(
      `[libphonenumber-js] \`metadata\` argument was passed but it's not a valid metadata. Must be an object having \`.countries\` child object property. Got ${rc(e) ? `an object of shape: { ` + Object.keys(e).join(`, `) + ` }` : `a ` + Dc(e) + `: ` + e}.`,
    );
}
function _c(e, t) {
  var n = new X(t);
  if (n.hasCountry(e)) return n.selectNumberingPlan(e).countryCallingCode();
  throw Error(`Unknown country: ${e}`);
}
function vc(e, t) {
  return t.countries.hasOwnProperty(e);
}
function yc(e) {
  var t = e.version;
  typeof t == `number`
    ? ((this.v1 = t === 1), (this.v2 = t === 2), (this.v3 = t === 3), (this.v4 = t === 4))
    : t
      ? nc(t, bc) === -1
        ? (this.v2 = !0)
        : nc(t, xc) === -1
          ? (this.v3 = !0)
          : (this.v4 = !0)
      : (this.v1 = !0);
}
var bc, xc, Sc, X, Cc, wc, Tc, Ec, Dc;
function Z() {
  return (Z = e(() => {
    (ac(),
      cc(),
      (bc = `1.2.0`),
      (xc = `1.7.35`),
      (Sc = ` ext. `),
      (X = (function () {
        function e(t) {
          (uc(this, e), gc(t), (this.metadata = t), yc.call(this, t));
        }
        return fc(e, [
          {
            key: `getCountries`,
            value: function () {
              return Object.keys(this.metadata.countries).filter(function (e) {
                return e !== `001`;
              });
            },
          },
          {
            key: `getCountryMetadata`,
            value: function (e) {
              return this.metadata.countries[e];
            },
          },
          {
            key: `nonGeographic`,
            value: function () {
              if (!(this.v1 || this.v2 || this.v3))
                return this.metadata.nonGeographic || this.metadata.nonGeographical;
            },
          },
          {
            key: `hasCountry`,
            value: function (e) {
              return this.getCountryMetadata(e) !== void 0;
            },
          },
          {
            key: `hasCallingCode`,
            value: function (e) {
              if (this.getCountryCodesForCallingCode(e)) return !0;
              if (this.nonGeographic()) {
                if (this.nonGeographic()[e]) return !0;
              } else {
                var t = this.countryCallingCodes()[e];
                if (t && t.length === 1 && t[0] === `001`) return !0;
              }
            },
          },
          {
            key: `isNonGeographicCallingCode`,
            value: function (e) {
              return this.nonGeographic()
                ? !!this.nonGeographic()[e]
                : !this.getCountryCodesForCallingCode(e);
            },
          },
          {
            key: `country`,
            value: function (e) {
              return this.selectNumberingPlan(e);
            },
          },
          {
            key: `selectNumberingPlan`,
            value: function (e, t) {
              var n, r;
              if ((e && (oc(e) ? (r = e) : (n = e)), t && (r = t), n && n !== `001`)) {
                var i = this.getCountryMetadata(n);
                if (!i) throw Error(`Unknown country: ${n}`);
                this.numberingPlan = new Cc(i, this);
              } else if (r) {
                if (!this.hasCallingCode(r)) throw Error(`Unknown calling code: ${r}`);
                this.numberingPlan = new Cc(this.getNumberingPlanMetadata(r), this);
              } else this.numberingPlan = void 0;
              return this;
            },
          },
          {
            key: `getCountryCodesForCallingCode`,
            value: function (e) {
              var t = this.countryCallingCodes()[e];
              if (t) return t.length === 1 && t[0].length === 3 ? void 0 : t;
            },
          },
          {
            key: `getCountryCodeForCallingCode`,
            value: function (e) {
              var t = this.getCountryCodesForCallingCode(e);
              if (t) return t[0];
            },
          },
          {
            key: `getNumberingPlanMetadata`,
            value: function (e) {
              var t = this.getCountryCodeForCallingCode(e);
              if (t) return this.getCountryMetadata(t);
              if (this.nonGeographic()) {
                var n = this.nonGeographic()[e];
                if (n) return n;
              } else {
                var r = this.countryCallingCodes()[e];
                if (r && r.length === 1 && r[0] === `001`) return this.metadata.countries[`001`];
              }
            },
          },
          {
            key: `countryCallingCode`,
            value: function () {
              return this.numberingPlan.callingCode();
            },
          },
          {
            key: `IDDPrefix`,
            value: function () {
              return this.numberingPlan.IDDPrefix();
            },
          },
          {
            key: `defaultIDDPrefix`,
            value: function () {
              return this.numberingPlan.defaultIDDPrefix();
            },
          },
          {
            key: `nationalNumberPattern`,
            value: function () {
              return this.numberingPlan.nationalNumberPattern();
            },
          },
          {
            key: `possibleLengths`,
            value: function () {
              return this.numberingPlan.possibleLengths();
            },
          },
          {
            key: `formats`,
            value: function () {
              return this.numberingPlan.formats();
            },
          },
          {
            key: `nationalPrefixForParsing`,
            value: function () {
              return this.numberingPlan.nationalPrefixForParsing();
            },
          },
          {
            key: `nationalPrefixTransformRule`,
            value: function () {
              return this.numberingPlan.nationalPrefixTransformRule();
            },
          },
          {
            key: `leadingDigits`,
            value: function () {
              return this.numberingPlan.leadingDigits();
            },
          },
          {
            key: `hasTypes`,
            value: function () {
              return this.numberingPlan.hasTypes();
            },
          },
          {
            key: `type`,
            value: function (e) {
              return this.numberingPlan.type(e);
            },
          },
          {
            key: `ext`,
            value: function () {
              return this.numberingPlan.ext();
            },
          },
          {
            key: `countryCallingCodes`,
            value: function () {
              return this.v1
                ? this.metadata.country_phone_code_to_countries
                : this.metadata.country_calling_codes;
            },
          },
          {
            key: `chooseCountryByCountryCallingCode`,
            value: function (e) {
              return this.selectNumberingPlan(e);
            },
          },
          {
            key: `hasSelectedNumberingPlan`,
            value: function () {
              return this.numberingPlan !== void 0;
            },
          },
        ]);
      })()),
      (Cc = (function () {
        function e(t, n) {
          (uc(this, e),
            (this.globalMetadataObject = n),
            (this.metadata = t),
            yc.call(this, n.metadata));
        }
        return fc(e, [
          {
            key: `callingCode`,
            value: function () {
              return this.metadata[0];
            },
          },
          {
            key: `_getDefaultCountryMetadataForThisCallingCode`,
            value: function () {
              return this.globalMetadataObject.getNumberingPlanMetadata(this.callingCode());
            },
          },
          {
            key: `getDefaultCountryMetadataForRegion`,
            value: function () {
              return this._getDefaultCountryMetadataForThisCallingCode();
            },
          },
          {
            key: `IDDPrefix`,
            value: function () {
              if (!(this.v1 || this.v2)) return this.metadata[1];
            },
          },
          {
            key: `defaultIDDPrefix`,
            value: function () {
              if (!(this.v1 || this.v2)) return this.metadata[12];
            },
          },
          {
            key: `nationalNumberPattern`,
            value: function () {
              return this.v1 || this.v2 ? this.metadata[1] : this.metadata[2];
            },
          },
          {
            key: `possibleLengths`,
            value: function () {
              if (!this.v1) return this.metadata[this.v2 ? 2 : 3];
            },
          },
          {
            key: `_getFormats`,
            value: function (e) {
              return e[this.v1 ? 2 : this.v2 ? 3 : 4];
            },
          },
          {
            key: `formats`,
            value: function () {
              var e = this;
              return (
                this._getFormats(this.metadata) ||
                this._getFormats(this._getDefaultCountryMetadataForThisCallingCode()) ||
                []
              ).map(function (t) {
                return new wc(t, e);
              });
            },
          },
          {
            key: `nationalPrefix`,
            value: function () {
              return this.metadata[this.v1 ? 3 : this.v2 ? 4 : 5];
            },
          },
          {
            key: `_getNationalPrefixFormattingRule`,
            value: function (e) {
              return e[this.v1 ? 4 : this.v2 ? 5 : 6];
            },
          },
          {
            key: `nationalPrefixFormattingRule`,
            value: function () {
              return (
                this._getNationalPrefixFormattingRule(this.metadata) ||
                this._getNationalPrefixFormattingRule(
                  this._getDefaultCountryMetadataForThisCallingCode(),
                )
              );
            },
          },
          {
            key: `_nationalPrefixForParsing`,
            value: function () {
              return this.metadata[this.v1 ? 5 : this.v2 ? 6 : 7];
            },
          },
          {
            key: `nationalPrefixForParsing`,
            value: function () {
              return this._nationalPrefixForParsing() || this.nationalPrefix();
            },
          },
          {
            key: `nationalPrefixTransformRule`,
            value: function () {
              return this.metadata[this.v1 ? 6 : this.v2 ? 7 : 8];
            },
          },
          {
            key: `_getNationalPrefixIsOptionalWhenFormatting`,
            value: function () {
              return !!this.metadata[this.v1 ? 7 : this.v2 ? 8 : 9];
            },
          },
          {
            key: `nationalPrefixIsOptionalWhenFormattingInNationalFormat`,
            value: function () {
              return (
                this._getNationalPrefixIsOptionalWhenFormatting(this.metadata) ||
                this._getNationalPrefixIsOptionalWhenFormatting(
                  this._getDefaultCountryMetadataForThisCallingCode(),
                )
              );
            },
          },
          {
            key: `leadingDigits`,
            value: function () {
              return this.metadata[this.v1 ? 8 : this.v2 ? 9 : 10];
            },
          },
          {
            key: `types`,
            value: function () {
              return this.metadata[this.v1 ? 9 : this.v2 ? 10 : 11];
            },
          },
          {
            key: `hasTypes`,
            value: function () {
              return this.types() && this.types().length === 0 ? !1 : !!this.types();
            },
          },
          {
            key: `type`,
            value: function (e) {
              if (this.hasTypes() && hc(this.types(), e)) return new Ec(hc(this.types(), e), this);
            },
          },
          {
            key: `ext`,
            value: function () {
              return this.v1 || this.v2 ? Sc : this.metadata[13] || Sc;
            },
          },
        ]);
      })()),
      (wc = (function () {
        function e(t, n) {
          (uc(this, e), (this._format = t), (this.metadata = n));
        }
        return fc(e, [
          {
            key: `pattern`,
            value: function () {
              return this._format[0];
            },
          },
          {
            key: `format`,
            value: function () {
              return this._format[1];
            },
          },
          {
            key: `leadingDigitsPatterns`,
            value: function () {
              return this._format[2] || [];
            },
          },
          {
            key: `nationalPrefixFormattingRule`,
            value: function () {
              return this._format[3] || this.metadata.nationalPrefixFormattingRule();
            },
          },
          {
            key: `nationalPrefixIsOptionalWhenFormattingInNationalFormat`,
            value: function () {
              return (
                !!this._format[4] ||
                this.metadata.nationalPrefixIsOptionalWhenFormattingInNationalFormat()
              );
            },
          },
          {
            key: `nationalPrefixIsMandatoryWhenFormattingInNationalFormat`,
            value: function () {
              return (
                this.usesNationalPrefix() &&
                !this.nationalPrefixIsOptionalWhenFormattingInNationalFormat()
              );
            },
          },
          {
            key: `usesNationalPrefix`,
            value: function () {
              return !!(
                this.nationalPrefixFormattingRule() && !Tc.test(this.nationalPrefixFormattingRule())
              );
            },
          },
          {
            key: `internationalFormat`,
            value: function () {
              return this._format[5] || this.format();
            },
          },
        ]);
      })()),
      (Tc = /^\(?\$1\)?$/),
      (Ec = (function () {
        function e(t, n) {
          (uc(this, e), (this.type = t), (this.metadata = n));
        }
        return fc(e, [
          {
            key: `pattern`,
            value: function () {
              return this.metadata.v1 ? this.type : this.type[0];
            },
          },
          {
            key: `possibleLengths`,
            value: function () {
              if (!this.metadata.v1) return this.type[1] || this.metadata.possibleLengths();
            },
          },
        ]);
      })()),
      (Dc = function (e) {
        return lc(e);
      }));
  }))();
}
function Oc(e, t) {
  var n = (typeof Symbol < `u` && e[Symbol.iterator]) || e[`@@iterator`];
  if (n) return (n = n.call(e)).next.bind(n);
  if (Array.isArray(e) || (n = kc(e)) || (t && e && typeof e.length == `number`)) {
    n && (e = n);
    var r = 0;
    return function () {
      return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
    };
  }
  throw TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function kc(e, t) {
  if (e) {
    if (typeof e == `string`) return Ac(e, t);
    var n = {}.toString.call(e).slice(8, -1);
    return (
      n === `Object` && e.constructor && (n = e.constructor.name),
      n === `Map` || n === `Set`
        ? Array.from(e)
        : n === `Arguments` || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
          ? Ac(e, t)
          : void 0
    );
  }
}
function Ac(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
  return r;
}
function jc(e, t) {
  for (var n = e.slice(), r = Oc(t), i; !(i = r()).done;) {
    var a = i.value;
    e.indexOf(a) < 0 && n.push(a);
  }
  return n.sort(function (e, t) {
    return e - t;
  });
}
function Mc() {
  return (Mc = e(() => {}))();
}
function Nc(e, t, n) {
  return Pc(e, void 0, t, n);
}
function Pc(e, t, n, r) {
  n && ((r = new X(r.metadata)), r.selectNumberingPlan(n));
  var i = r.type(t),
    a = (i && i.possibleLengths()) || r.possibleLengths();
  if (!a) return `IS_POSSIBLE`;
  if (t === `FIXED_LINE_OR_MOBILE`) {
    if (!r.type(`FIXED_LINE`)) return Pc(e, `MOBILE`, n, r);
    var o = r.type(`MOBILE`);
    o && (a = jc(a, o.possibleLengths()));
  } else if (t && !i) return `INVALID_LENGTH`;
  var s = e.length,
    c = a[0];
  return c === s
    ? `IS_POSSIBLE`
    : c > s
      ? `TOO_SHORT`
      : a[a.length - 1] < s
        ? `TOO_LONG`
        : a.indexOf(s, 1) >= 0
          ? `IS_POSSIBLE`
          : `INVALID_LENGTH`;
}
function Fc() {
  return (Fc = e(() => {
    (Z(), Mc());
  }))();
}
function Ic(e, t, n) {
  t === void 0 && (t = {});
  var r = new X(n);
  if (t.v2) {
    if (!e.countryCallingCode) throw Error(`Invalid phone number object passed`);
    r.selectNumberingPlan(e.country || e.countryCallingCode);
  } else {
    if (!e.phone) return !1;
    if (e.country) {
      if (!r.hasCountry(e.country)) throw Error(`Unknown country: ${e.country}`);
      r.selectNumberingPlan(e.country);
    } else {
      if (!e.countryCallingCode) throw Error(`Invalid phone number object passed`);
      r.selectNumberingPlan(e.countryCallingCode);
    }
  }
  if (r.possibleLengths()) return Lc(e.phone || e.nationalNumber, r);
  if (e.countryCallingCode && r.isNonGeographicCallingCode(e.countryCallingCode)) return !0;
  throw Error(
    `Missing "possibleLengths" in metadata. Perhaps the metadata has been generated before v1.0.18.`,
  );
}
function Lc(e, t) {
  switch (Nc(e, void 0, t)) {
    case `IS_POSSIBLE`:
      return !0;
    default:
      return !1;
  }
}
function Rc() {
  return (Rc = e(() => {
    (Z(), Fc());
  }))();
}
function zc(e, t) {
  return ((e ||= ``), RegExp(`^(?:` + t + `)$`).test(e));
}
function Bc(e, t) {
  var n = (typeof Symbol < `u` && e[Symbol.iterator]) || e[`@@iterator`];
  if (n) return (n = n.call(e)).next.bind(n);
  if (Array.isArray(e) || (n = Vc(e)) || (t && e && typeof e.length == `number`)) {
    n && (e = n);
    var r = 0;
    return function () {
      return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
    };
  }
  throw TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function Vc(e, t) {
  if (e) {
    if (typeof e == `string`) return Hc(e, t);
    var n = {}.toString.call(e).slice(8, -1);
    return (
      n === `Object` && e.constructor && (n = e.constructor.name),
      n === `Map` || n === `Set`
        ? Array.from(e)
        : n === `Arguments` || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
          ? Hc(e, t)
          : void 0
    );
  }
}
function Hc(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
  return r;
}
function Uc(e, t, n) {
  if (((t ||= {}), !(!e.country && !e.countryCallingCode))) {
    var r = new X(n);
    r.selectNumberingPlan(e.country || e.countryCallingCode);
    var i = t.v2 ? e.nationalNumber : e.phone;
    if (zc(i, r.nationalNumberPattern())) {
      if (Wc(i, `FIXED_LINE`, r))
        return (r.type(`MOBILE`) && r.type(`MOBILE`).pattern() === ``) ||
          !r.type(`MOBILE`) ||
          Wc(i, `MOBILE`, r)
          ? `FIXED_LINE_OR_MOBILE`
          : `FIXED_LINE`;
      for (var a = Bc(Gc), o; !(o = a()).done;) {
        var s = o.value;
        if (Wc(i, s, r)) return s;
      }
    }
  }
}
function Wc(e, t, n) {
  var r = n.type(t);
  return !r || !r.pattern() || (r.possibleLengths() && r.possibleLengths().indexOf(e.length) < 0)
    ? !1
    : zc(e, r.pattern());
}
var Gc;
function Kc() {
  return (Kc = e(() => {
    (Z(),
      (Gc = [
        `MOBILE`,
        `PREMIUM_RATE`,
        `TOLL_FREE`,
        `SHARED_COST`,
        `VOIP`,
        `PERSONAL_NUMBER`,
        `PAGER`,
        `UAN`,
        `VOICEMAIL`,
      ]));
  }))();
}
function qc(e, t, n) {
  t ||= {};
  var r = new X(n);
  return (
    r.selectNumberingPlan(e.country || e.countryCallingCode),
    r.hasTypes()
      ? Uc(e, t, r.metadata) !== void 0
      : zc(t.v2 ? e.nationalNumber : e.phone, r.nationalNumberPattern())
  );
}
function Jc() {
  return (Jc = e(() => {
    (Z(), Kc());
  }))();
}
function Yc(e) {
  return Xc.test(e);
}
var Xc;
function Zc() {
  return (Zc = e(() => {
    Xc = /^[A-Z]{2}$/;
  }))();
}
function Qc(e, t) {
  var n,
    r,
    i = new X(t);
  return (
    Yc(e)
      ? ((n = e), i.selectNumberingPlan(n), (r = i.countryCallingCode()))
      : ((r = e), $c && i.isNonGeographicCallingCode(r) && (n = `001`)),
    { country: n, callingCode: r }
  );
}
var $c;
function el() {
  return (el = e(() => {
    (Z(), Zc(), ($c = !1));
  }))();
}
function tl(e, t, n) {
  var r = new X(n).getCountryCodesForCallingCode(e);
  return r
    ? r.filter(function (e) {
        return nl(t, e, n);
      })
    : [];
}
function nl(e, t, n) {
  var r = new X(n);
  return (r.selectNumberingPlan(t), r.numberingPlan.possibleLengths().indexOf(e.length) >= 0);
}
function rl() {
  return (rl = e(() => {
    Z();
  }))();
}
var Q, il, al, ol, sl, cl, ll, ul, dl;
function fl() {
  return (fl = e(() => {
    ((Q = `0-9０-９٠-٩۰-۹`),
      (il = `-‐-―−ー－`),
      (al = `／/`),
      (ol = `．.`),
      (sl = ` \xA0­​⁠　`),
      (cl = `()（）［］\\[\\]`),
      (ll = `~⁓∼～`),
      (ul = ``.concat(il, al, ol, sl, cl, ll)),
      (dl = `+＋`));
  }))();
}
function pl(e, t, n, r) {
  if (t) {
    var i = new X(r);
    i.selectNumberingPlan(t || n);
    var a = new RegExp(i.IDDPrefix());
    if (e.search(a) === 0) {
      e = e.slice(e.match(a)[0].length);
      var o = e.match(ml);
      if (!(o && o[1] != null && o[1].length > 0 && o[1] === `0`)) return e;
    }
  }
}
var ml;
function hl() {
  return (hl = e(() => {
    (Z(), fl(), (ml = RegExp(`([` + Q + `])`)));
  }))();
}
function gl(e, t) {
  if (e && t.numberingPlan.nationalPrefixForParsing()) {
    var n = RegExp(`^(?:` + t.numberingPlan.nationalPrefixForParsing() + `)`),
      r = n.exec(e);
    if (r) {
      var i,
        a,
        o = r.length - 1,
        s = o > 0 && r[o];
      if (t.nationalPrefixTransformRule() && s)
        ((i = e.replace(n, t.nationalPrefixTransformRule())), o > 1 && (a = r[1]));
      else {
        var c = r[0];
        ((i = e.slice(c.length)), s && (a = r[1]));
      }
      var l;
      if (s) {
        var u = e.indexOf(r[1]);
        e.slice(0, u) === t.numberingPlan.nationalPrefix() &&
          (l = t.numberingPlan.nationalPrefix());
      } else l = r[0];
      return { nationalNumber: i, nationalPrefix: l, carrierCode: a };
    }
  }
  return { nationalNumber: e };
}
function _l(e, t) {
  var n = (typeof Symbol < `u` && e[Symbol.iterator]) || e[`@@iterator`];
  if (n) return (n = n.call(e)).next.bind(n);
  if (Array.isArray(e) || (n = vl(e)) || (t && e && typeof e.length == `number`)) {
    n && (e = n);
    var r = 0;
    return function () {
      return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
    };
  }
  throw TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function vl(e, t) {
  if (e) {
    if (typeof e == `string`) return yl(e, t);
    var n = {}.toString.call(e).slice(8, -1);
    return (
      n === `Object` && e.constructor && (n = e.constructor.name),
      n === `Map` || n === `Set`
        ? Array.from(e)
        : n === `Arguments` || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
          ? yl(e, t)
          : void 0
    );
  }
}
function yl(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
  return r;
}
function bl(e, t, n) {
  for (var r = new X(n), i = _l(t), a; !(a = i()).done;) {
    var o = a.value;
    if ((r.selectNumberingPlan(o), r.leadingDigits())) {
      if (e && e.search(r.leadingDigits()) === 0) return o;
    } else if (Uc({ phone: e, country: o }, void 0, r.metadata)) return o;
  }
}
function xl() {
  return (xl = e(() => {
    (Z(), Kc());
  }))();
}
function Sl(e, t) {
  var n = t.nationalNumber,
    r = t.metadata;
  if (Cl && r.isNonGeographicCallingCode(e)) return `001`;
  var i = r.getCountryCodesForCallingCode(e);
  if (i) return i.length === 1 ? i[0] : bl(n, i, r.metadata);
}
var Cl;
function wl() {
  return (wl = e(() => {
    (xl(), (Cl = !1));
  }))();
}
function Tl(e, t, n) {
  var r = gl(e, n),
    i = r.carrierCode,
    a = r.nationalNumber;
  return a !== e &&
    (!El(e, a, n) ||
      (n.numberingPlan.possibleLengths() &&
        ((t ||= Sl(n.numberingPlan.callingCode(), { nationalNumber: a, metadata: n })),
        !Dl(a, t, n))))
    ? { nationalNumber: e }
    : { nationalNumber: a, carrierCode: i };
}
function El(e, t, n) {
  return !(zc(e, n.nationalNumberPattern()) && !zc(t, n.nationalNumberPattern()));
}
function Dl(e, t, n) {
  switch (Nc(e, t, n)) {
    case `TOO_SHORT`:
    case `INVALID_LENGTH`:
      return !1;
    default:
      return !0;
  }
}
function Ol() {
  return (Ol = e(() => {
    (Fc(), wl());
  }))();
}
function kl(e, t, n, r, i) {
  if (!(t || n || r)) return { number: e };
  var a = t || n ? _c(t || n, i) : r;
  if (e.indexOf(a) === 0) {
    var o = new X(i);
    o.selectNumberingPlan(t || n || r);
    var s = e.slice(a.length),
      c = Tl(s, void 0, o).nationalNumber,
      l = Tl(e, void 0, o).nationalNumber;
    if (
      (!zc(l, o.nationalNumberPattern()) && zc(c, o.nationalNumberPattern())) ||
      Nc(l, void 0, o) === `TOO_LONG`
    )
      return { countryCallingCode: a, number: s };
  }
  return { number: e };
}
function Al() {
  return (Al = e(() => {
    (Z(), Ol(), Fc());
  }))();
}
function jl(e, t, n, r, i) {
  if (!e) return {};
  var a;
  if (e[0] !== `+`) {
    var o = pl(e, t || n, r, i);
    if (o && o !== e) ((a = !0), (e = `+` + o));
    else {
      if (t || n || r) {
        var s = kl(e, t, n, r, i),
          c = s.countryCallingCode,
          l = s.number;
        if (c)
          return {
            countryCallingCodeSource: `FROM_NUMBER_WITHOUT_PLUS_SIGN`,
            countryCallingCode: c,
            number: l,
          };
      }
      return { number: e };
    }
  }
  if (e[1] === `0`) return {};
  for (var u = new X(i), d = 2; d - 1 <= 3 && d <= e.length;) {
    var f = e.slice(1, d);
    if (u.hasCallingCode(f))
      return (
        u.selectNumberingPlan(f),
        {
          countryCallingCodeSource: a ? `FROM_NUMBER_WITH_IDD` : `FROM_NUMBER_WITH_PLUS_SIGN`,
          countryCallingCode: f,
          number: e.slice(d),
        }
      );
    d++;
  }
  return {};
}
function Ml() {
  return (Ml = e(() => {
    (hl(), Al(), Z(), fl());
  }))();
}
function Nl(e) {
  return e.replace(RegExp(`[${ul}]+`, `g`), ` `).trim();
}
function Pl() {
  return (Pl = e(() => {
    fl();
  }))();
}
function Fl(e, t, n) {
  var r = n.useInternationalFormat,
    i = n.withNationalPrefix;
  (n.carrierCode, n.metadata);
  var a = e.replace(
    new RegExp(t.pattern()),
    r
      ? t.internationalFormat()
      : i && t.nationalPrefixFormattingRule()
        ? t.format().replace(Il, t.nationalPrefixFormattingRule())
        : t.format(),
  );
  return r ? Nl(a) : a;
}
var Il;
function Ll() {
  return (Ll = e(() => {
    (Pl(), (Il = /(\$\d)/));
  }))();
}
function Rl(e, t, n) {
  var r = new X(n);
  if ((r.selectNumberingPlan(e || t), r.defaultIDDPrefix())) return r.defaultIDDPrefix();
  if (zl.test(r.IDDPrefix())) return r.IDDPrefix();
}
var zl;
function Bl() {
  return (Bl = e(() => {
    (Z(), (zl = /^[\d]+(?:[~\u2053\u223C\uFF5E][\d]+)?$/));
  }))();
}
function Vl(e) {
  var t = `20`,
    n = `15`,
    r = `9`,
    i = `6`,
    a = `[ \xA0\\t,]*`,
    o = `[:\\.．]?[ \xA0\\t,-]*`,
    s = `#?`,
    c = `(?:e?xt(?:ensi(?:ó?|ó))?n?|ｅ?ｘｔｎ?|доб|anexo)`,
    l = `(?:[xｘ#＃~～]|int|ｉｎｔ)`,
    u = `[- ]+`,
    d = `[ \xA0\\t]*`,
    f = `(?:,{2}|;)`,
    p = Hl + Ul(t),
    ee = a + c + o + Ul(t) + s,
    te = a + l + o + Ul(r) + s,
    ne = u + Ul(i) + `#`,
    re = d + f + o + Ul(n) + s,
    ie = d + `(?:,)+` + o + Ul(r) + s;
  return p + `|` + ee + `|` + te + `|` + ne + `|` + re + `|` + ie;
}
var Hl, Ul;
function Wl() {
  return (Wl = e(() => {
    (fl(),
      (Hl = `;ext=`),
      (Ul = function (e) {
        return `([${Q}]{1,${e}})`;
      }));
  }))();
}
function Gl(e) {
  return e.length >= 2 && Zl.test(e);
}
function Kl(e) {
  return Yl.test(e);
}
var ql, Jl, Yl, Xl, Zl;
function Ql() {
  return (Ql = e(() => {
    (fl(),
      Wl(),
      (ql = `[` + Q + `]{2}`),
      (Jl = `[` + dl + `]{0,1}(?:[` + ul + `]*[` + Q + `]){3,}[` + ul + Q + `]*`),
      (Yl = RegExp(`^[` + dl + `]{0,1}(?:[` + ul + `]*[` + Q + `]){1,2}$`, `i`)),
      (Xl = Jl + `(?:` + Vl() + `)?`),
      (Zl = RegExp(`^` + ql + `$|^` + Xl + `$`, `i`)));
  }))();
}
function $l(e) {
  var t = e.number,
    n = e.ext;
  if (!t) return ``;
  if (t[0] !== `+`) throw Error(`"formatRFC3966()" expects "number" to be in E.164 format.`);
  return `tel:${t}${n ? `;ext=` + n : ``}`;
}
function eu(e, t, n, r) {
  n = n ? au({}, su, n) : su;
  var i = new X(r);
  if (e.country && e.country !== `001`) {
    if (!i.hasCountry(e.country)) throw Error(`Unknown country: ${e.country}`);
    i.selectNumberingPlan(e.country);
  } else if (e.countryCallingCode) i.selectNumberingPlan(e.countryCallingCode);
  else return e.phone || ``;
  var a = i.countryCallingCode(),
    o = n.v2 ? e.nationalNumber : e.phone,
    s;
  switch (t) {
    case `NATIONAL`:
      return o
        ? ((s = tu(o, e.carrierCode, `NATIONAL`, i, n)), ru(s, e.ext, i, n.formatExtension))
        : ``;
    case `INTERNATIONAL`:
      return o
        ? ((s = tu(o, null, `INTERNATIONAL`, i, n)),
          (s = `+${a} ${s}`),
          ru(s, e.ext, i, n.formatExtension))
        : `+${a}`;
    case `E.164`:
      return `+${a}${o}`;
    case `RFC3966`:
      return $l({ number: `+${a}${o}`, ext: e.ext });
    case `IDD`:
      if (!n.fromCountry) return;
      var c = iu(o, e.carrierCode, a, n.fromCountry, i);
      return c ? ru(c, e.ext, i, n.formatExtension) : void 0;
    default:
      throw Error(`Unknown "format" argument passed to "formatNumber()": "${t}"`);
  }
}
function tu(e, t, n, r, i) {
  var a = nu(r.formats(), e);
  return a
    ? Fl(e, a, {
        useInternationalFormat: n === `INTERNATIONAL`,
        withNationalPrefix: !(
          a.nationalPrefixIsOptionalWhenFormattingInNationalFormat() &&
          i &&
          i.nationalPrefix === !1
        ),
        carrierCode: t,
        metadata: r,
      })
    : e;
}
function nu(e, t) {
  return ou(e, function (e) {
    if (e.leadingDigitsPatterns().length > 0) {
      var n = e.leadingDigitsPatterns()[e.leadingDigitsPatterns().length - 1];
      if (t.search(n) !== 0) return !1;
    }
    return zc(t, e.pattern());
  });
}
function ru(e, t, n, r) {
  return t ? r(e, t, n) : e;
}
function iu(e, t, n, r, i) {
  if (_c(r, i.metadata) === n) {
    var a = tu(e, t, `NATIONAL`, i);
    return n === `1` ? n + ` ` + a : a;
  }
  var o = Rl(r, void 0, i.metadata);
  if (o) return `${o} ${n} ${tu(e, null, `INTERNATIONAL`, i)}`;
}
function au() {
  for (var e = 1, t = [...arguments]; e < t.length;) {
    if (t[e]) for (var n in t[e]) t[0][n] = t[e][n];
    e++;
  }
  return t[0];
}
function ou(e, t) {
  for (var n = 0; n < e.length;) {
    if (t(e[n])) return e[n];
    n++;
  }
}
var su;
function cu() {
  return (cu = e(() => {
    (Ll(),
      Z(),
      Bl(),
      (su = {
        formatExtension: function (e, t, n) {
          return `${e}${n.ext()}${t}`;
        },
      }));
  }))();
}
function lu(e) {
  "@babel/helpers - typeof";
  return (
    (lu =
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
    lu(e)
  );
}
function uu(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      n.push.apply(n, r));
  }
  return n;
}
function du(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] == null ? {} : arguments[t];
    t % 2
      ? uu(Object(n), !0).forEach(function (t) {
          fu(e, t, n[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
        : uu(Object(n)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
          });
  }
  return e;
}
function fu(e, t, n) {
  return (
    (t = gu(t)) in e
      ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 })
      : (e[t] = n),
    e
  );
}
function pu(e, t) {
  if (!(e instanceof t)) throw TypeError(`Cannot call a class as a function`);
}
function mu(e, t) {
  for (var n = 0; n < t.length; n++) {
    var r = t[n];
    ((r.enumerable = r.enumerable || !1),
      (r.configurable = !0),
      `value` in r && (r.writable = !0),
      Object.defineProperty(e, gu(r.key), r));
  }
}
function hu(e, t, n) {
  return (
    t && mu(e.prototype, t),
    n && mu(e, n),
    Object.defineProperty(e, "prototype", { writable: !1 }),
    e
  );
}
function gu(e) {
  var t = _u(e, `string`);
  return lu(t) == `symbol` ? t : t + ``;
}
function _u(e, t) {
  if (lu(e) != `object` || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || `default`);
    if (lu(r) != `object`) return r;
    throw TypeError(`@@toPrimitive must return a primitive value.`);
  }
  return (t === `string` ? String : Number)(e);
}
var vu, yu;
function bu() {
  return (bu = e(() => {
    (Z(),
      Rc(),
      Jc(),
      Kc(),
      el(),
      rl(),
      Ml(),
      ac(),
      cu(),
      (vu = (function () {
        function e(t, n, r) {
          if ((pu(this, e), !t)) throw TypeError(`First argument is required`);
          if (typeof t != `string`) throw TypeError(`First argument must be a string`);
          if (t[0] === `+` && !n) throw TypeError("`metadata` argument not passed");
          if (rc(n) && rc(n.countries)) {
            r = n;
            var i = t;
            if (!yu.test(i))
              throw Error(
                'Invalid `number` argument passed: must consist of a "+" followed by digits',
              );
            var a = jl(i, void 0, void 0, void 0, r),
              o = a.countryCallingCode;
            if (((n = a.number), (t = o), !n))
              throw Error("Invalid `number` argument passed: too short");
          }
          if (!n) throw TypeError("`nationalNumber` argument is required");
          if (typeof n != `string`) throw TypeError("`nationalNumber` argument must be a string");
          gc(r);
          var s = Qc(t, r),
            c = s.country,
            l = s.callingCode;
          ((this.country = c),
            (this.countryCallingCode = l),
            (this.nationalNumber = n),
            (this.number = `+` + this.countryCallingCode + this.nationalNumber),
            (this.getMetadata = function () {
              return r;
            }));
        }
        return hu(e, [
          {
            key: `setExt`,
            value: function (e) {
              this.ext = e;
            },
          },
          {
            key: `getPossibleCountries`,
            value: function () {
              return this.country
                ? [this.country]
                : tl(this.countryCallingCode, this.nationalNumber, this.getMetadata());
            },
          },
          {
            key: `isPossible`,
            value: function () {
              return Ic(this, { v2: !0 }, this.getMetadata());
            },
          },
          {
            key: `isValid`,
            value: function () {
              return qc(this, { v2: !0 }, this.getMetadata());
            },
          },
          {
            key: `isNonGeographic`,
            value: function () {
              return new X(this.getMetadata()).isNonGeographicCallingCode(this.countryCallingCode);
            },
          },
          {
            key: `isEqual`,
            value: function (e) {
              return this.number === e.number && this.ext === e.ext;
            },
          },
          {
            key: `getType`,
            value: function () {
              return Uc(this, { v2: !0 }, this.getMetadata());
            },
          },
          {
            key: `format`,
            value: function (e, t) {
              return eu(
                this,
                e,
                t ? du(du({}, t), {}, { v2: !0 }) : { v2: !0 },
                this.getMetadata(),
              );
            },
          },
          {
            key: `formatNational`,
            value: function (e) {
              return this.format(`NATIONAL`, e);
            },
          },
          {
            key: `formatInternational`,
            value: function (e) {
              return this.format(`INTERNATIONAL`, e);
            },
          },
          {
            key: `getURI`,
            value: function (e) {
              return this.format(`RFC3966`, e);
            },
          },
        ]);
      })()),
      (yu = /^\+\d+$/));
  }))();
}
function xu(e) {
  "@babel/helpers - typeof";
  return (
    (xu =
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
    xu(e)
  );
}
function Su(e, t) {
  for (var n = 0; n < t.length; n++) {
    var r = t[n];
    ((r.enumerable = r.enumerable || !1),
      (r.configurable = !0),
      `value` in r && (r.writable = !0),
      Object.defineProperty(e, wu(r.key), r));
  }
}
function Cu(e, t, n) {
  return (
    t && Su(e.prototype, t),
    n && Su(e, n),
    Object.defineProperty(e, "prototype", { writable: !1 }),
    e
  );
}
function wu(e) {
  var t = Tu(e, `string`);
  return xu(t) == `symbol` ? t : t + ``;
}
function Tu(e, t) {
  if (xu(e) != `object` || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || `default`);
    if (xu(r) != `object`) return r;
    throw TypeError(`@@toPrimitive must return a primitive value.`);
  }
  return (t === `string` ? String : Number)(e);
}
function Eu(e, t) {
  if (!(e instanceof t)) throw TypeError(`Cannot call a class as a function`);
}
function Du(e, t, n) {
  return (
    (t = Iu(t)), Ou(e, Nu() ? Reflect.construct(t, n || [], Iu(e).constructor) : t.apply(e, n))
  );
}
function Ou(e, t) {
  if (t && (xu(t) == `object` || typeof t == `function`)) return t;
  if (t !== void 0) throw TypeError(`Derived constructors may only return object or undefined`);
  return ku(e);
}
function ku(e) {
  if (e === void 0)
    throw ReferenceError(`this hasn't been initialised - super() hasn't been called`);
  return e;
}
function Au(e, t) {
  if (typeof t != `function` && t !== null)
    throw TypeError(`Super expression must either be null or a function`);
  ((e.prototype = Object.create(t && t.prototype, {
    constructor: { value: e, writable: !0, configurable: !0 },
  })),
    Object.defineProperty(e, "prototype", { writable: !1 }),
    t && Fu(e, t));
}
function ju(e) {
  var t = typeof Map == `function` ? new Map() : void 0;
  return (
    (ju = function (e) {
      if (e === null || !Pu(e)) return e;
      if (typeof e != `function`)
        throw TypeError(`Super expression must either be null or a function`);
      if (t !== void 0) {
        if (t.has(e)) return t.get(e);
        t.set(e, n);
      }
      function n() {
        return Mu(e, arguments, Iu(this).constructor);
      }
      return (
        (n.prototype = Object.create(e.prototype, {
          constructor: { value: n, enumerable: !1, writable: !0, configurable: !0 },
        })),
        Fu(n, e)
      );
    }),
    ju(e)
  );
}
function Mu(e, t, n) {
  if (Nu()) return Reflect.construct.apply(null, arguments);
  var r = [null];
  r.push.apply(r, t);
  var i = new (e.bind.apply(e, r))();
  return (n && Fu(i, n.prototype), i);
}
function Nu() {
  try {
    var e = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
  } catch {}
  return (Nu = function () {
    return !!e;
  })();
}
function Pu(e) {
  try {
    return Function.toString.call(e).indexOf(`[native code]`) !== -1;
  } catch {
    return typeof e == `function`;
  }
}
function Fu(e, t) {
  return (
    (Fu = Object.setPrototypeOf
      ? Object.setPrototypeOf.bind()
      : function (e, t) {
          return ((e.__proto__ = t), e);
        }),
    Fu(e, t)
  );
}
function Iu(e) {
  return (
    (Iu = Object.setPrototypeOf
      ? Object.getPrototypeOf.bind()
      : function (e) {
          return e.__proto__ || Object.getPrototypeOf(e);
        }),
    Iu(e)
  );
}
var $;
function Lu() {
  return (Lu = e(() => {
    $ = (function (e) {
      function t(e) {
        var n;
        return (
          Eu(this, t),
          (n = Du(this, t, [e])),
          Object.setPrototypeOf(n, t.prototype),
          (n.name = n.constructor.name),
          n
        );
      }
      return (Au(t, e), Cu(t));
    })(ju(Error));
  }))();
}
function Ru(e) {
  var t = e.search(zu);
  if (t < 0) return {};
  for (var n = e.slice(0, t), r = e.match(zu), i = 1; i < r.length;) {
    if (r[i]) return { number: n, ext: r[i] };
    i++;
  }
}
var zu;
function Bu() {
  return (Bu = e(() => {
    (Wl(), (zu = RegExp(`(?:` + Vl() + `)$`, `i`)));
  }))();
}
function Vu(e) {
  return Hu[e];
}
var Hu;
function Uu() {
  return (Uu = e(() => {
    Hu = {
      0: `0`,
      1: `1`,
      2: `2`,
      3: `3`,
      4: `4`,
      5: `5`,
      6: `6`,
      7: `7`,
      8: `8`,
      9: `9`,
      "０": `0`,
      "１": `1`,
      "２": `2`,
      "３": `3`,
      "４": `4`,
      "５": `5`,
      "６": `6`,
      "７": `7`,
      "８": `8`,
      "９": `9`,
      "٠": `0`,
      "١": `1`,
      "٢": `2`,
      "٣": `3`,
      "٤": `4`,
      "٥": `5`,
      "٦": `6`,
      "٧": `7`,
      "٨": `8`,
      "٩": `9`,
      "۰": `0`,
      "۱": `1`,
      "۲": `2`,
      "۳": `3`,
      "۴": `4`,
      "۵": `5`,
      "۶": `6`,
      "۷": `7`,
      "۸": `8`,
      "۹": `9`,
    };
  }))();
}
function Wu(e, t) {
  var n = (typeof Symbol < `u` && e[Symbol.iterator]) || e[`@@iterator`];
  if (n) return (n = n.call(e)).next.bind(n);
  if (Array.isArray(e) || (n = Gu(e)) || (t && e && typeof e.length == `number`)) {
    n && (e = n);
    var r = 0;
    return function () {
      return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
    };
  }
  throw TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function Gu(e, t) {
  if (e) {
    if (typeof e == `string`) return Ku(e, t);
    var n = {}.toString.call(e).slice(8, -1);
    return (
      n === `Object` && e.constructor && (n = e.constructor.name),
      n === `Map` || n === `Set`
        ? Array.from(e)
        : n === `Arguments` || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
          ? Ku(e, t)
          : void 0
    );
  }
}
function Ku(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
  return r;
}
function qu(e) {
  for (var t = ``, n = Wu(e.split(``)), r; !(r = n()).done;) {
    var i = r.value;
    t += Ju(i, t) || ``;
  }
  return t;
}
function Ju(e, t, n) {
  if (e === `+`) {
    if (t) {
      typeof n == `function` && n(`end`);
      return;
    }
    return `+`;
  }
  return Vu(e);
}
function Yu() {
  return (Yu = e(() => {
    Uu();
  }))();
}
function Xu(e) {
  var t = e.indexOf(sd);
  if (t < 0) return null;
  var n = t + sd.length;
  if (n >= e.length) return ``;
  var r = e.indexOf(`;`, n);
  return r >= 0 ? e.substring(n, r) : e.substring(n);
}
function Zu(e) {
  return e === null ? !0 : e.length === 0 ? !1 : ed.test(e) || ad.test(e);
}
var Qu, $u, ed, td, nd, rd, id, ad, od, sd, cd;
function ld() {
  return (ld = e(() => {
    (fl(),
      (Qu = `([` + Q + `]|[\\-\\.\\(\\)]?)`),
      ($u = `^\\+` + Qu + `*[` + Q + `]` + Qu + `*$`),
      (ed = new RegExp($u, `g`)),
      (td = Q),
      (nd = `[` + td + `]+((\\-)*[` + td + `])*`),
      (rd = `[a-zA-Z]+((\\-)*[` + td + `])*`),
      (id = `^(` + nd + `\\.)*` + rd + `\\.?$`),
      (ad = new RegExp(id, `g`)),
      (od = `tel:`),
      (sd = `;phone-context=`),
      (cd = `;isub=`));
  }))();
}
function ud(e, t) {
  var n = t.extractFormattedPhoneNumber,
    r = Xu(e);
  if (!Zu(r)) throw new $(`NOT_A_NUMBER`);
  var i;
  if (r === null) i = n(e) || ``;
  else {
    ((i = ``), r.charAt(0) === `+` && (i += r));
    var a = e.indexOf(od),
      o = a >= 0 ? a + od.length : 0,
      s = e.indexOf(sd);
    i += e.substring(o, s);
  }
  var c = i.indexOf(cd);
  if ((c > 0 && (i = i.substring(0, c)), i !== ``)) return i;
}
function dd() {
  return (dd = e(() => {
    (ld(), Lu());
  }))();
}
function fd(e, t, n) {
  t ||= {};
  var r = new X(n);
  if (t.defaultCountry && !r.hasCountry(t.defaultCountry))
    throw t.v2 ? new $(`INVALID_COUNTRY`) : Error(`Unknown country: ${t.defaultCountry}`);
  var i = md(e, t.v2, t.extract),
    a = i.number,
    o = i.ext,
    s = i.error;
  if (!a) {
    if (t.v2) throw s === `TOO_SHORT` ? new $(`TOO_SHORT`) : new $(`NOT_A_NUMBER`);
    return {};
  }
  var c = gd(a, t.defaultCountry, t.defaultCallingCode, r),
    l = c.country,
    u = c.nationalNumber,
    d = c.countryCallingCode,
    f = c.countryCallingCodeSource,
    p = c.carrierCode;
  if (!r.hasSelectedNumberingPlan()) {
    if (t.v2) throw new $(`INVALID_COUNTRY`);
    return {};
  }
  if (!u || u.length < 2) {
    if (t.v2) throw new $(`TOO_SHORT`);
    return {};
  }
  if (u.length > 17) {
    if (t.v2) throw new $(`TOO_LONG`);
    return {};
  }
  if (t.v2) {
    var ee = new vu(d, u, r.metadata);
    return (
      l && (ee.country = l),
      p && (ee.carrierCode = p),
      o && (ee.ext = o),
      (ee.__countryCallingCodeSource = f),
      ee
    );
  }
  var te = (t.extended ? r.hasSelectedNumberingPlan() : l) ? zc(u, r.nationalNumberPattern()) : !1;
  return t.extended
    ? {
        country: l,
        countryCallingCode: d,
        carrierCode: p,
        valid: te,
        possible: te ? !0 : !!(t.extended === !0 && r.possibleLengths() && Lc(u, r)),
        phone: u,
        ext: o,
      }
    : te
      ? hd(l, u, o)
      : {};
}
function pd(e, t, n) {
  if (e) {
    if (e.length > _d) {
      if (n) throw new $(`TOO_LONG`);
      return;
    }
    if (t === !1) return e;
    var r = e.search(vd);
    if (!(r < 0)) return e.slice(r).replace(yd, ``);
  }
}
function md(e, t, n) {
  var r = ud(e, {
    extractFormattedPhoneNumber: function (e) {
      return pd(e, n, t);
    },
  });
  if (!r) return {};
  if (!Gl(r)) return Kl(r) ? { error: `TOO_SHORT` } : {};
  var i = Ru(r);
  return i.ext ? i : { number: r };
}
function hd(e, t, n) {
  var r = { country: e, phone: t };
  return (n && (r.ext = n), r);
}
function gd(e, t, n, r) {
  var i = jl(qu(e), void 0, t, n, r.metadata),
    a = i.countryCallingCodeSource,
    o = i.countryCallingCode,
    s = i.number,
    c;
  if (o) r.selectNumberingPlan(o);
  else if (s && (t || n))
    t
      ? ((c = t), r.selectNumberingPlan(t), (o = r.numberingPlan.callingCode()))
      : (r.selectNumberingPlan(n), (o = n), bd && r.isNonGeographicCallingCode(o) && (c = `001`));
  else return {};
  if (!s) return { countryCallingCodeSource: a, countryCallingCode: o };
  var l = Tl(qu(s), void 0, r),
    u = l.nationalNumber,
    d = l.carrierCode,
    f = Sl(o, { nationalNumber: u, metadata: r });
  return (
    f && ((c = f), f === `001` || r.selectNumberingPlan(c)),
    {
      country: c,
      countryCallingCode: o,
      countryCallingCodeSource: a,
      nationalNumber: u,
      carrierCode: d,
    }
  );
}
var _d, vd, yd, bd;
function xd() {
  return (xd = e(() => {
    (fl(),
      Lu(),
      Z(),
      Ql(),
      Bu(),
      Yu(),
      Rc(),
      bu(),
      Ml(),
      Ol(),
      wl(),
      dd(),
      (_d = 250),
      (vd = RegExp(`[` + dl + Q + `]`)),
      (yd = RegExp(`[^` + Q + `#]+$`)),
      (bd = !1));
  }))();
}
function Sd(e) {
  "@babel/helpers - typeof";
  return (
    (Sd =
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
    Sd(e)
  );
}
function Cd(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      n.push.apply(n, r));
  }
  return n;
}
function wd(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] == null ? {} : arguments[t];
    t % 2
      ? Cd(Object(n), !0).forEach(function (t) {
          Td(e, t, n[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
        : Cd(Object(n)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
          });
  }
  return e;
}
function Td(e, t, n) {
  return (
    (t = Ed(t)) in e
      ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 })
      : (e[t] = n),
    e
  );
}
function Ed(e) {
  var t = Dd(e, `string`);
  return Sd(t) == `symbol` ? t : t + ``;
}
function Dd(e, t) {
  if (Sd(e) != `object` || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || `default`);
    if (Sd(r) != `object`) return r;
    throw TypeError(`@@toPrimitive must return a primitive value.`);
  }
  return (t === `string` ? String : Number)(e);
}
function Od(e, t, n) {
  return fd(e, wd(wd({}, t), {}, { v2: !0 }), n);
}
function kd() {
  return (kd = e(() => {
    xd();
  }))();
}
function Ad(e) {
  "@babel/helpers - typeof";
  return (
    (Ad =
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
    Ad(e)
  );
}
function jd(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      n.push.apply(n, r));
  }
  return n;
}
function Md(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] == null ? {} : arguments[t];
    t % 2
      ? jd(Object(n), !0).forEach(function (t) {
          Nd(e, t, n[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
        : jd(Object(n)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
          });
  }
  return e;
}
function Nd(e, t, n) {
  return (
    (t = Pd(t)) in e
      ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 })
      : (e[t] = n),
    e
  );
}
function Pd(e) {
  var t = Fd(e, `string`);
  return Ad(t) == `symbol` ? t : t + ``;
}
function Fd(e, t) {
  if (Ad(e) != `object` || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || `default`);
    if (Ad(r) != `object`) return r;
    throw TypeError(`@@toPrimitive must return a primitive value.`);
  }
  return (t === `string` ? String : Number)(e);
}
function Id(e, t) {
  return Vd(e) || Bd(e, t) || Rd(e, t) || Ld();
}
function Ld() {
  throw TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function Rd(e, t) {
  if (e) {
    if (typeof e == `string`) return zd(e, t);
    var n = {}.toString.call(e).slice(8, -1);
    return (
      n === `Object` && e.constructor && (n = e.constructor.name),
      n === `Map` || n === `Set`
        ? Array.from(e)
        : n === `Arguments` || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
          ? zd(e, t)
          : void 0
    );
  }
}
function zd(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
  return r;
}
function Bd(e, t) {
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
      if (((a = (n = n.call(e)).next), t === 0)) {
        if (Object(n) !== n) return;
        c = !1;
      } else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
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
function Vd(e) {
  if (Array.isArray(e)) return e;
}
function Hd(e) {
  var t = Id(Array.prototype.slice.call(e), 4),
    n = t[0],
    r = t[1],
    i = t[2],
    a = t[3],
    o,
    s,
    c;
  if (typeof n == `string`) o = n;
  else throw TypeError(`A text for parsing must be a string.`);
  if (!r || typeof r == `string`)
    (a ? ((s = i), (c = a)) : ((s = void 0), (c = i)), r && (s = Md({ defaultCountry: r }, s)));
  else if (rc(r)) i ? ((s = r), (c = i)) : (c = r);
  else throw Error(`Invalid second argument: ${r}`);
  return { text: o, options: s, metadata: c };
}
function Ud() {
  return (Ud = e(() => {
    ac();
  }))();
}
function Wd(e) {
  "@babel/helpers - typeof";
  return (
    (Wd =
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
    Wd(e)
  );
}
function Gd(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      n.push.apply(n, r));
  }
  return n;
}
function Kd(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] == null ? {} : arguments[t];
    t % 2
      ? Gd(Object(n), !0).forEach(function (t) {
          qd(e, t, n[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
        : Gd(Object(n)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
          });
  }
  return e;
}
function qd(e, t, n) {
  return (
    (t = Jd(t)) in e
      ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 })
      : (e[t] = n),
    e
  );
}
function Jd(e) {
  var t = Yd(e, `string`);
  return Wd(t) == `symbol` ? t : t + ``;
}
function Yd(e, t) {
  if (Wd(e) != `object` || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || `default`);
    if (Wd(r) != `object`) return r;
    throw TypeError(`@@toPrimitive must return a primitive value.`);
  }
  return (t === `string` ? String : Number)(e);
}
function Xd(e, t, n) {
  t &&
    t.defaultCountry &&
    !vc(t.defaultCountry, n) &&
    (t = Kd(Kd({}, t), {}, { defaultCountry: void 0 }));
  try {
    return Od(e, t, n);
  } catch (e) {
    if (!(e instanceof $)) throw e;
  }
}
function Zd() {
  return (Zd = e(() => {
    (kd(), Lu(), Z());
  }))();
}
function Qd() {
  var e = Hd(arguments),
    t = e.text,
    n = e.options,
    r = e.metadata;
  return Xd(t, n, r);
}
function $d() {
  return ($d = e(() => {
    (Ud(), Zd());
  }))();
}
function ef(e) {
  return new X(e).getCountries();
}
function tf() {
  return (tf = e(() => {
    Z();
  }))();
}
function nf() {
  return ec(Qd, arguments);
}
function rf() {
  return (rf = e(() => {
    (tc(), $d());
  }))();
}
function af() {
  return ec(ef, arguments);
}
function of() {
  return (of = e(() => {
    (tc(), tf());
  }))();
}
function sf() {
  return ec(_c, arguments);
}
function cf() {
  return (cf = e(() => {
    (tc(), Z());
  }))();
}
export {
  Ja as A,
  Ao as C,
  bo as D,
  Fo as E,
  je as F,
  Rt as M,
  Dt as N,
  Mo as O,
  Me as P,
  xo as S,
  Zo as T,
  Js as _,
  rf as a,
  jo as b,
  Zs as c,
  wo as d,
  Eo as f,
  No as g,
  Jo as h,
  of as i,
  no as j,
  Do as k,
  Io as l,
  Co as m,
  cf as n,
  nf as o,
  ko as p,
  af as r,
  Ys as s,
  sf as t,
  To as u,
  Po as v,
  zo as w,
  Oo as x,
  Lo as y,
};
//# sourceMappingURL=config-runtime-DfcY45Be.js.map
