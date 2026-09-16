import { qn as t } from "./control-ui-core-BOclcphE.js";
import { o, t as s } from "./control-ui-core-k5VGv3wu.js";
import { G as n, J as r, K as i, W as a } from "./lit-runtime-BZcFnh9F.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function c(e) {
  if (e.signal?.aborted) return Promise.resolve(!1);
  let t = document.createElement(`div`);
  return (
    document.body.append(t),
    new Promise((a) => {
      let s = !1,
        c = !1,
        l = (r) => {
          s || ((s = !0), e.signal?.removeEventListener(`abort`, u), i(n, t), t.remove(), a(r));
        },
        u = () => l(!1);
      e.signal?.addEventListener(`abort`, u, { once: !0 });
      let d = e.title ?? o(`common.confirm`);
      i(
        r`
        <openclaw-modal-dialog
          label=${d}
          description=${e.message}
          @modal-cancel=${() => l(!1)}
        >
          <div class="exec-approval-card">
            <div class="exec-approval-header">
              <div>
                <div class="exec-approval-title">${d}</div>
                <div class="exec-approval-sub" style="white-space: pre-line">
                  ${e.message}
                </div>
              </div>
            </div>
            ${e.details ? r`<div class="exec-approval-command mono">${e.details}</div>` : n}
            ${
              e.skipPreference
                ? r`<label class="field checkbox exec-approval-skip">
                  <input
                    type="checkbox"
                    @change=${(e) => {
                      c = e.target.checked;
                    }}
                  />
                  <span>${o(`common.dontAskAgain`)}</span>
                </label>`
                : n
            }
            <div class="exec-approval-actions">
              <button
                type="button"
                class="btn ${e.danger ? `danger` : `primary`}"
                @click=${() => {
                  (c && e.skipPreference?.remember(), l(!0));
                }}
              >
                ${e.confirmLabel ?? o(`common.confirm`)}
              </button>
              <button type="button" class="btn" autofocus @click=${() => l(!1)}>
                ${e.cancelLabel ?? o(`common.cancel`)}
              </button>
            </div>
          </div>
        </openclaw-modal-dialog>
      `,
        t,
      );
    })
  );
}
function l(e) {
  return e.skipPreference?.skipped
    ? Promise.resolve(!0)
    : u
      ? Promise.resolve(!1)
      : ((u = !0),
        c(e).finally(() => {
          u = !1;
        }));
}
var u;
function d() {
  return (d = e(() => {
    (a(), s(), t(), (u = !1));
  }))();
}
export { l as n, d as t };
//# sourceMappingURL=confirm-dialog-Cu2vXHyn.js.map
