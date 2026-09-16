import { i as r, t as i } from "./control-ui-core-k5VGv3wu.js";
import { J as t, W as n } from "./lit-runtime-BZcFnh9F.js";
import { n as e } from "./rolldown-runtime-DkW27tQK.js";
function a(e = ``) {
  let n = r.getLocale() === `vi`;
  return t`<label>
    <span>${n ? `Ngôn ngữ` : `Language`}</span>
    <select
      class=${e}
      aria-label=${n ? `Ngôn ngữ` : `Language`}
      .value=${n ? `vi` : `en`}
      @change=${async (e) => {
        let t = e.currentTarget,
          i = t.value;
        (i === `vi` || i === `en`) &&
          (t.setCustomValidity(``),
          (t.disabled = !0),
          await r.setLocale(i),
          (t.disabled = !1),
          r.getLocale() !== i &&
            t.isConnected &&
            ((t.value = r.getLocale() === `vi` ? `vi` : `en`),
            t.setCustomValidity(
              n
                ? `Không tải được ngôn ngữ. Kiểm tra kết nối và thử lại.`
                : `Could not load the language. Check your connection and try again.`,
            ),
            t.reportValidity()));
      }}
    >
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  </label>`;
}
function o() {
  return (o = e(() => {
    (n(), i());
  }))();
}
export { a as n, o as t };
//# sourceMappingURL=enterprise-language-picker-DC2t90un.js.map
