import { html } from "lit";
import { i18n } from "./index.ts";

/** Shares the Control UI preference and locale loader across Enterprise portals. */
export function renderEnterpriseLanguagePicker(className = "") {
  const vietnamese = i18n.getLocale() === "vi";
  return html`<label>
    <span>${vietnamese ? "Ngôn ngữ" : "Language"}</span>
    <select
      class=${className}
      aria-label=${vietnamese ? "Ngôn ngữ" : "Language"}
      .value=${vietnamese ? "vi" : "en"}
      @change=${async (event: Event) => {
        const select = event.currentTarget as HTMLSelectElement;
        const locale = select.value;
        if (locale !== "vi" && locale !== "en") {
          return;
        }
        select.setCustomValidity("");
        select.disabled = true;
        await i18n.setLocale(locale);
        select.disabled = false;
        if (i18n.getLocale() !== locale && select.isConnected) {
          select.value = i18n.getLocale() === "vi" ? "vi" : "en";
          select.setCustomValidity(
            vietnamese
              ? "Không tải được ngôn ngữ. Kiểm tra kết nối và thử lại."
              : "Could not load the language. Check your connection and try again.",
          );
          select.reportValidity();
        }
      }}
    >
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  </label>`;
}
