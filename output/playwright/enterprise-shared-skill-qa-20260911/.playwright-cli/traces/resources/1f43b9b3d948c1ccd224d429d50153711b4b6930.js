import { Sn as d, xn as f } from "./control-ui-boot-BkPDmfcr.js";
import { Ca as t, J as n, xa as r } from "./control-ui-core-B5rJKETr.js";
import { qn as i } from "./control-ui-core-BOclcphE.js";
import { o as l, t as u } from "./control-ui-core-k5VGv3wu.js";
import { G as a, J as o, K as s, W as c } from "./lit-runtime-BZcFnh9F.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function p(e) {
  if (e.signal?.aborted) return Promise.resolve(null);
  let t = document.createElement(`div`);
  return (
    document.body.append(t),
    new Promise((i) => {
      let c = !1,
        u = !1,
        f = !1,
        p = null,
        m = `idle`,
        h = (t) => (e.requireValue === !0 && e.sensitive !== !0 ? t.trim() : t),
        g = (t) => {
          let n = h(t);
          return (
            (e.requireValue === !0 && !t.trim()) ||
            (e.requireChange === !0 && n === (e.defaultValue ?? ``))
          );
        },
        _ = g(e.defaultValue ?? ``),
        v = (n) => {
          c || ((c = !0), e.signal?.removeEventListener(`abort`, y), s(a, t), t.remove(), i(n));
        },
        y = () => v(null),
        b = () => t.querySelector(`input[name="value"]`),
        x = (e) => {
          let t = g(e);
          t !== _ && ((_ = t), D());
        },
        S = (e) => x(e.target.value);
      async function C() {
        if (e.copyValue === void 0 || u || m === `copying`) return;
        ((m = `copying`), D());
        let t = await n(e.copyValue);
        c || ((m = t ? `copied` : `failed`), D());
      }
      async function w(t) {
        if ((t.preventDefault(), u)) return;
        let n = b()?.value;
        if (n === void 0 || g(n)) return;
        let i = h(n);
        if (!e.submit) {
          v(i);
          return;
        }
        ((u = !0), (p = null), D());
        let a;
        try {
          a = await e.submit(i);
        } catch (e) {
          a = r(e);
        }
        if (!c) {
          if (((u = !1), a === null)) {
            v(i);
            return;
          }
          ((p = a), D(), b()?.focus());
        }
      }
      function T(e) {
        if (u) {
          e.preventDefault();
          return;
        }
        v(null);
      }
      e.signal?.addEventListener(`abort`, y, { once: !0 });
      let E = e.label ?? e.title;
      function D() {
        s(
          o`
          <openclaw-modal-dialog
            label=${e.title}
            description=${E}
            @modal-cancel=${T}
          >
            <form class="exec-approval-card" @submit=${w}>
              <div class="exec-approval-header">
                <div class="exec-approval-title">${e.title}</div>
              </div>
              <label class="field input-dialog__field">
                <span>${E}</span>
                ${
                  e.sensitive
                    ? d({
                        id: `input-dialog-value`,
                        name: `value`,
                        value: e.defaultValue ?? ``,
                        revealed: f,
                        revealLabel: e.revealLabel ?? `Show value`,
                        hideLabel: e.hideLabel ?? `Hide value`,
                        autocomplete: `current-password`,
                        disabled: u,
                        autofocus: !0,
                        ariaInvalid: p ? `true` : `false`,
                        onInput: x,
                        onToggle: () => {
                          ((f = !f), D());
                        },
                      })
                    : o`<input
                      name="value"
                      type="text"
                      autocomplete="off"
                      spellcheck="false"
                      .value=${e.defaultValue ?? ``}
                      ?disabled=${u}
                      aria-invalid=${p ? `true` : a}
                      @input=${S}
                      autofocus
                    />`
                }
              </label>
              ${
                e.copyValue === void 0
                  ? a
                  : o`<button
                    type="button"
                    class="btn"
                    data-input-dialog-copy
                    ?disabled=${u || m === `copying`}
                    @click=${C}
                  >
                    ${m === `copied` || m === `failed` ? l(m === `copied` ? `common.copied` : `common.copyFailed`) : (e.copyLabel ?? l(`common.copy`))}
                  </button>`
              }
              ${p ? o`<div class="exec-approval-error" role="alert">${p}</div>` : a}
              <div class="exec-approval-actions">
                <button type="submit" class="btn primary" ?disabled=${u || _}>
                  ${e.submitLabel ?? l(`common.save`)}
                </button>
                <button
                  type="button"
                  class="btn"
                  ?disabled=${u}
                  @click=${() => v(null)}
                >
                  ${e.cancelLabel ?? l(`common.cancel`)}
                </button>
              </div>
            </form>
          </openclaw-modal-dialog>
        `,
          t,
        );
      }
      D();
    })
  );
}
function m(e) {
  return h
    ? Promise.resolve(null)
    : ((h = !0),
      p(e).finally(() => {
        h = !1;
      }));
}
var h;
function g() {
  return (g = e(() => {
    (c(), u(), t(), i(), f(), (h = !1));
  }))();
}
export { m as n, g as t };
//# sourceMappingURL=input-dialog-8_SMx5uN.js.map
