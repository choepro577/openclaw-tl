const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "./workboard-card-chip.runtime-By_jYqFW.js",
      "./rolldown-runtime-DkW27tQK.js",
      "./control-ui-foundation-CUUNgsy7.js",
      "./control-ui-core-B5rJKETr.js",
      "./control-ui-core-BOclcphE.js",
      "./lit-runtime-BZcFnh9F.js",
      "./control-ui-core-k5VGv3wu.js",
      "./gateway-runtime-CzCgK0eB.js",
      "./control-ui-core-CXVrgOlR.css",
      "./control-ui-boot-D1_QZILW.js",
      "./control-ui-boot-CIjwt-AI.js",
      "./control-ui-boot-gfE6fZcA.js",
      "./config-runtime-DfcY45Be.js",
      "./control-ui-boot-BkPDmfcr.js",
      "./control-ui-boot-adV0af1C.js",
      "./control-ui-boot-DJiLHUhu.js",
      "./control-ui-boot-BbQ-8EFH.js",
      "./control-ui-boot-DOOMhK8q.js",
      "./control-ui-boot-4F0V1byh.js",
      "./control-ui-boot-Bvc3ZZNG.js",
      "./control-ui-boot-DBYHHRMP.js",
      "./control-ui-boot-DkB48Nei.js",
      "./control-ui-boot-DPe_-ugS.css",
      "./control-ui-boot-D9vIvOo1.js",
      "./control-ui-boot-BDXl61AB.css",
      "./cron-runtime-_BjI8iKO.js",
      "./session-navigation-runtime-BnHifKSI.js",
      "./markdown-runtime-DmZBdNxi.js",
      "./normalization-70RJxsBB.js",
      "./board-view-placeholder-cGo37rIW.js",
      "./board-view-BRr_7xAA.js",
      "./board-view-Bu_jW48G.js",
      "./display-dialog-B_wzbWzm.js",
      "./board-view-Cufc5TOV.css",
    ]),
) => i.map((i) => d[i]);
import { D as _, L as v } from "./control-ui-boot-BkPDmfcr.js";
import { Ui as ee, Wi as te } from "./control-ui-boot-D1_QZILW.js";
import { Ii as i, Li as a, ct as o, st as s } from "./control-ui-core-B5rJKETr.js";
import { Jt as c, Xn as l, Yt as u, Zn as d } from "./control-ui-core-BOclcphE.js";
import { o as h, t as g } from "./control-ui-core-k5VGv3wu.js";
import { Nr as t, Pr as n, fn as r } from "./control-ui-foundation-CUUNgsy7.js";
import { G as f, J as p, W as m } from "./lit-runtime-BZcFnh9F.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function ne(e) {
  if (!(typeof URL > `u` || typeof URL.createObjectURL != `function`))
    return URL.createObjectURL(e);
}
function y(e) {
  !e || typeof URL > `u` || typeof URL.revokeObjectURL != `function` || URL.revokeObjectURL(e);
}
function b(e) {
  y(P.get(e.attachment.id)?.previewUrl);
  let t = ne(e.file) ?? e.attachment.previewUrl;
  return (
    P.set(e.attachment.id, { blob: e.file, dataUrl: e.dataUrl, ...(t ? { previewUrl: t } : {}) }),
    { ...e.attachment, ...(t ? { previewUrl: t } : {}) }
  );
}
function x(e) {
  return e.dataUrl ?? P.get(e.id)?.dataUrl ?? null;
}
function S(e) {
  let t = /^data:([^,]*),(.*)$/s.exec(e);
  if (!t) return null;
  let n = t[1] ?? ``,
    r = t[2] ?? ``;
  try {
    if (n.toLowerCase().includes(`;base64`)) {
      let e = atob(r.replace(/\s+/gu, ``)),
        t = Uint8Array.from(e, (e) => e.charCodeAt(0));
      return new Blob([t], { type: n.split(`;`, 1)[0] });
    }
    return new Blob([decodeURIComponent(r.replace(/\+/gu, `%20`))], { type: n.split(`;`, 1)[0] });
  } catch {
    return null;
  }
}
function C(e) {
  let t = P.get(e.id)?.blob;
  if (t) return t;
  let n = x(e);
  return n ? S(n) : null;
}
function w(e) {
  return new Promise((t, n) => {
    let r = new FileReader();
    (r.addEventListener(`error`, () => n(r.error ?? Error(`Blob read failed`)), { once: !0 }),
      r.addEventListener(
        `load`,
        () => (typeof r.result == `string` ? t(r.result) : n(Error(`Blob read returned no data`))),
        { once: !0 },
      ),
      r.readAsDataURL(e));
  });
}
async function T(e) {
  let t =
      e.blob.type === e.attachment.mimeType
        ? e.blob
        : e.blob.slice(0, e.blob.size, e.attachment.mimeType),
    n = await w(t),
    r = new File([t], e.attachment.fileName ?? `attachment`, { type: e.attachment.mimeType });
  return b({ attachment: e.attachment, dataUrl: n, file: r });
}
function E(e) {
  let t = P.get(e.id)?.previewUrl;
  return e.previewUrl ?? t ?? x(e);
}
function D(e) {
  let { dataUrl: t, ...n } = e;
  return n;
}
function O(e) {
  return e.map(D);
}
function k(e) {
  return e.map((e) => {
    let { id: t, previewUrl: n, ...r } = e,
      i = x(e);
    return { ...r, id: M(), ...(i ? { dataUrl: i } : {}) };
  });
}
function A(e) {
  let t = P.get(e);
  t && (y(t.previewUrl), P.delete(e));
}
function j(e = []) {
  for (let t of e) A(t.id);
}
function re(e, t) {
  let n = new Set(t.flat().map((e) => e.id));
  j(e.filter((e) => !n.has(e.id)));
}
function M() {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function ie(e, t = []) {
  return (
    j(e),
    t.flatMap(({ mimeType: e, data: t }) =>
      F.test(e) && t.length > 0 && t.length <= L && I.test(t)
        ? [{ id: M(), mimeType: e, dataUrl: `data:${e};base64,${t}` }]
        : [],
    )
  );
}
function ae(e) {
  let t = P.get(e);
  if (t) {
    if (t.previewUrl) {
      P.set(e, { previewUrl: t.previewUrl });
      return;
    }
    P.delete(e);
  }
}
function N(e = []) {
  for (let t of e) ae(t.id);
}
var P, F, I, L;
function R() {
  return (R = e(() => {
    ((P = new Map()),
      (F = /^image\/[\w.+-]+$/u),
      (I = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u),
      (L = 6990508));
  }))();
}
function z(e, t) {
  let n = 1,
    r = t.length;
  if (r > V) return !1;
  for (let t of e) {
    let e = t.browserAnnotation;
    if (e && ((n += 1), (r += e.modelContext.length), n > B || r > V)) return !1;
  }
  return !0;
}
var B, V;
function H() {
  return (H = e(() => {
    ((B = 4), (V = 8e3));
  }))();
}
function U(e, t, n, r = {}) {
  if (!t.browserAnnotation) return !1;
  let i = t.browserAnnotation.modelContext,
    a = e.getOwner(),
    s = e.getSessionKey(),
    c = e.getAttachments(),
    l = c.findIndex((e) => e.id === t.id);
  if (l < 0) return !1;
  (e.setAttachments(c.filter((e) => e.id !== t.id)), e.requestUpdate(), e.focusComposer());
  let u = r.releasePayload ?? A,
    d = !1,
    f = () => {
      d || ((d = !0), u(t.id));
    },
    p = r.presentToast ?? o;
  return (
    p({
      message: n.removed,
      actionLabel: n.undo,
      onAction: () => {
        if (d) return;
        if (e.getOwner() !== a || e.getSessionKey() !== s) {
          f();
          return;
        }
        let r = e.getAttachments();
        if (r.some((e) => e.id === t.id)) {
          d = !0;
          return;
        }
        if (!z(r, i)) {
          (f(), p({ message: n.undoUnavailable }));
          return;
        }
        d = !0;
        let o = Math.min(l, r.length);
        (e.setAttachments([...r.slice(0, o), t, ...r.slice(o)]),
          e.requestUpdate(),
          e.focusRestoredAnnotation(t.id));
      },
      onDismiss: (e) => {
        e !== `action` && f();
      },
    }) || f(),
    !0
  );
}
function W() {
  return (W = e(() => {
    (s(), R(), H());
  }))();
}
function G() {
  return c(`openclaw-workboard-card-chip`, () =>
    t(
      () => import(`./workboard-card-chip.runtime-By_jYqFW.js`),
      __vite__mapDeps([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
        25, 26, 27, 28,
      ]),
      import.meta.url,
    ),
  );
}
async function K() {
  return (
    !customElements.get(`openclaw-board-view`) &&
    ((J ??= te()
      ? t(
          () => import(`./board-view-placeholder-cGo37rIW.js`),
          __vite__mapDeps([29, 1, 2, 3, 4, 5, 6, 7, 8]),
          import.meta.url,
        )
      : t(
          () => import(`./board-view-BRr_7xAA.js`),
          __vite__mapDeps([
            30, 13, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 14, 9, 12, 16, 17, 18, 15, 19, 20, 21, 22, 23,
            24, 25, 26, 27, 31, 32, 33,
          ]),
          import.meta.url,
        )),
    await J,
    !0)
  );
}
function q(e) {
  return h(
    e === `left`
      ? `chat.board.dockLeft`
      : e === `bottom`
        ? `chat.board.dockBottom`
        : `chat.board.dockRight`,
  );
}
function oe(e) {
  if (!e.hasBoard) return f;
  let t = e.face === `chat` ? `chat` : e.dock === `hidden` ? `dashboard` : `split`,
    n = e.canChangeDock
      ? v({
          value: t,
          ariaLabel: h(`chat.board.faceLabel`),
          options: [
            { value: `chat`, label: h(`chat.board.chatFace`) },
            { value: `split`, label: h(`chat.board.splitFace`) },
            { value: `dashboard`, label: h(`chat.board.dashboardFace`) },
          ],
          onChange: (t) => e.onSelectMode(t),
        })
      : v({
          value: e.face,
          ariaLabel: h(`chat.board.faceLabel`),
          options: [
            { value: `chat`, label: h(`chat.board.chatFace`) },
            { value: `dashboard`, label: h(`chat.board.dashboardFace`) },
          ],
          onChange: (t) => e.onSelectMode(t),
        }),
    r = e.dock === `hidden` ? null : e.dock,
    i = t === `split` && e.canChangeDock && r !== null;
  return p`
    <div class="chat-pane__face-switch ${i ? `chat-pane__face-switch--split` : ``}">
      ${n}
      ${
        i && r
          ? p`
            <wa-dropdown
              class="chat-pane__dock-caret"
              placement="bottom-end"
              @wa-select=${(t) => {
                let n = t.detail.item.value;
                (n === `left` || n === `right` || n === `bottom`) && e.onDockSideChange(n);
              }}
            >
              <button
                slot="trigger"
                type="button"
                class="btn btn--ghost btn--icon chat-icon-btn chat-pane__dock-caret-trigger"
                title=${q(r)}
                aria-label=${h(`chat.board.dockMenu`, { dock: q(r) })}
              >
                ${l.chevronDown}
              </button>
              ${[`left`, `right`, `bottom`].map(
                (e) => p`
                  <wa-dropdown-item
                    value=${e}
                    type="checkbox"
                    ?checked=${e === r}
                  >
                    ${q(e)}
                  </wa-dropdown-item>
                `,
              )}
            </wa-dropdown>
          `
          : f
      }
      ${t === `chat` ? f : e.fullscreenControl}
    </div>
  `;
}
function se(e) {
  return p`
    <div class="board-session-surface__board">
      ${
        e.workboardCardChip
          ? p`
            <openclaw-workboard-card-chip
              .active=${e.workboardCardChip.active}
              .basePath=${e.workboardCardChip.basePath}
              .client=${e.workboardCardChip.client}
              .sessionKey=${e.workboardCardChip.sessionKey}
            ></openclaw-workboard-card-chip>
          `
          : f
      }
      <openclaw-board-view
        .active=${e.active}
        .snapshot=${e.snapshot}
        .activeTabId=${e.activeTabId}
        .widgetFrameUrl=${e.widgetFrameUrl}
        .callbacks=${e.callbacks}
        .canMutate=${e.canMutate}
        .canGrant=${e.canGrant}
      ></openclaw-board-view>
    </div>
  `;
}
function ce(e) {
  return p`<div class="board-session-surface__chat" style="height: ${e.dockSize.height}px">
    ${e.chat}
  </div>`;
}
function le(e) {
  return p`
    <div
      class="board-session-surface board-session-surface--dock-${e.dock}"
      ?hidden=${!e.active}
      ?inert=${!e.active}
    >
      ${se(e)}
      ${e.active && e.dock === `bottom` ? p`${e.divider}${ce(e)}` : f}
    </div>
  `;
}
var J;
function Y() {
  return (Y = e(() => {
    (m(), u(), d(), _(), g(), ee(), n(), (J = null));
  }))();
}
function X(e) {
  let t = r(e)?.messageId;
  return typeof t == `string` && t ? t : null;
}
function Z() {
  return (Z = e(() => {}))();
}
function ue(e) {
  let t = /^data:([^;]+);base64,(.+)$/.exec(e);
  if (!t) return null;
  let n = t[1],
    r = t[2];
  return n && r ? { mimeType: n, content: r } : null;
}
function de(e) {
  return e?.length
    ? e
        .map((e) => {
          let t = x(e),
            n = t ? ue(t) : null;
          return n
            ? {
                type: n.mimeType.startsWith(`image/`) ? `image` : `file`,
                mimeType: n.mimeType,
                fileName: e.fileName,
                content: n.content,
              }
            : null;
        })
        .filter((e) => e !== null)
    : void 0;
}
function fe(e) {
  return e?.length
    ? e.flatMap((e) => {
        if (!e || typeof e != `object`) return [];
        let t = e,
          n = typeof t.mimeType == `string` ? t.mimeType.trim() : ``,
          r = typeof t.content == `string` ? t.content : ``;
        return !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(n) ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(r)
          ? []
          : [
              {
                id: i(),
                dataUrl: `data:${n};base64,${r}`,
                mimeType: n,
                fileName: typeof t.fileName == `string` ? t.fileName : void 0,
              },
            ];
      })
    : [];
}
function Q() {
  return (Q = e(() => {
    (a(), R());
  }))();
}
function pe(e, t) {
  let n = t.flatMap((e) => {
    let t = e.browserAnnotation?.modelContext.trim();
    return t ? [t] : [];
  });
  if (n.length === 0) return e;
  let r = n.join(`

`);
  return e ? `${r}\n\n${e}` : r;
}
function $() {
  return ($ = e(() => {}))();
}
export {
  T as A,
  E as C,
  j as D,
  A as E,
  re as O,
  x as S,
  b as T,
  k as _,
  fe as a,
  M as b,
  K as c,
  le as d,
  oe as f,
  H as g,
  z as h,
  Q as i,
  ie as k,
  G as l,
  U as m,
  $ as n,
  X as o,
  W as p,
  de as r,
  Z as s,
  pe as t,
  Y as u,
  O as v,
  R as w,
  C as x,
  N as y,
};
//# sourceMappingURL=control-ui-boot-DWMwnn3C.js.map
