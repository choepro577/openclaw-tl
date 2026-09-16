import { I as t, J as n, R as r, W as i } from "./lit-runtime-BZcFnh9F.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function a() {
  return (a = e(() => {}))();
}
function o(e, t = {}) {
  let i = t.fillHeight
    ? `settings-workspace settings-workspace--fill-height`
    : `settings-workspace`;
  return n`
    <section
      class=${i}
      id=${r(t.id)}
      role=${r(t.role)}
      aria-label=${r(t.ariaLabel)}
    >
      <div class="settings-workspace__body">${e}</div>
    </section>
  `;
}
function s() {
  return (s = e(() => {
    (i(), t());
  }))();
}
export { o as n, a as r, s as t };
//# sourceMappingURL=settings-workspace-Cbu1mPuU.js.map
