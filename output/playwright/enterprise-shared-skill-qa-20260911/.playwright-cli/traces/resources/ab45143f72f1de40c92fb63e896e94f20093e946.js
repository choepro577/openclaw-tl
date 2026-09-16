import { Et as n, _n as r, kt as i } from "./control-ui-boot-Bvc3ZZNG.js";
import { Rs as t } from "./control-ui-core-B5rJKETr.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function a() {
  try {
    return t()?.getItem(`openclaw.enterprise-user.thienly-attempt.v1`)?.trim() || null;
  } catch {
    return null;
  }
}
function o() {
  try {
    let e = Number(t()?.getItem(_));
    return Number.isFinite(e) && e > Date.now() ? e : null;
  } catch {
    return null;
  }
}
function s() {
  try {
    let e = t();
    (e?.removeItem(g), e?.removeItem(_));
  } catch {}
}
function c() {
  return r(`/api/auth/user/thienly/config`);
}
function l() {
  return r(`/api/auth/user/thienly/start`, { method: `POST`, body: `{}` });
}
function u(e) {
  return r(`/api/auth/user/thienly/attempts/${encodeURIComponent(e)}`);
}
function d(e, t) {
  return r(`/api/auth/user/thienly/attempts/${encodeURIComponent(e)}/link`, {
    method: `POST`,
    body: JSON.stringify({ password: t }),
  });
}
function f(e) {
  return r(`/api/auth/user/thienly/attempts/${encodeURIComponent(e)}/complete`, {
    method: `POST`,
    body: `{}`,
  });
}
function p(e) {
  return r(`/api/auth/user/thienly/attempts/${encodeURIComponent(e)}/cancel`, {
    method: `POST`,
    body: `{}`,
  });
}
function m(e) {
  return n(`/api/auth/user/thienly/attempts/${encodeURIComponent(e)}/events`);
}
function h(e) {
  return e === `completed` || e === `cancelled` || e === `failed` || e === `expired`;
}
var g, _;
function v() {
  return (v = e(() => {
    (i(),
      (g = `openclaw.enterprise-user.thienly-attempt.v1`),
      (_ = `openclaw.enterprise-user.thienly-success-deadline.v1`));
  }))();
}
export {
  f as a,
  d as c,
  l as d,
  a as f,
  s as i,
  u as l,
  m,
  _ as n,
  v as o,
  o as p,
  p as r,
  h as s,
  g as t,
  c as u,
};
//# sourceMappingURL=user-thienly-auth-BM6eyieS.js.map
