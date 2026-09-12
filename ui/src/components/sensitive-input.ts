// Control UI adapter for Carapace's framework-neutral Sensitive Input pattern.
import { html, nothing, type TemplateResult } from "lit";
import { icons } from "./icons.ts";
import "./tooltip.ts";

type SensitiveInputProps = {
  id: string;
  name?: string;
  value: string;
  revealed: boolean;
  revealLabel: string;
  hideLabel: string;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  autocomplete?: string;
  required?: boolean;
  disabled?: boolean;
  autofocus?: boolean;
  ariaInvalid?: "true" | "false";
  onInput: (value: string) => void;
  onToggle: () => void;
};

export function renderSensitiveInput(props: SensitiveInputProps): TemplateResult {
  const visibilityLabel = props.revealed ? props.hideLabel : props.revealLabel;
  const className = props.className
    ? `oc-sensitive-input ${props.className}`
    : "oc-sensitive-input";
  const handleInput = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    props.onInput(input.value);
  };

  return html`
    <span class=${className}>
      <input
        id=${props.id}
        class=${props.inputClassName ?? nothing}
        name=${props.name ?? nothing}
        type=${props.revealed ? "text" : "password"}
        autocomplete=${props.autocomplete ?? "off"}
        spellcheck="false"
        placeholder=${props.placeholder ?? ""}
        .value=${props.value}
        ?required=${props.required}
        ?disabled=${props.disabled}
        ?autofocus=${props.autofocus}
        aria-invalid=${props.ariaInvalid ?? nothing}
        data-sensitive-value
        @input=${handleInput}
      />
      <openclaw-tooltip .content=${visibilityLabel}>
        <button
          type="button"
          class="oc-sensitive-toggle"
          aria-label=${visibilityLabel}
          aria-controls=${props.id}
          aria-pressed=${String(props.revealed)}
          data-sensitive-icon=${props.revealed ? "eye-off" : "eye"}
          ?disabled=${props.disabled}
          @click=${props.onToggle}
        >
          ${props.revealed ? icons.eyeOff : icons.eye}
        </button>
      </openclaw-tooltip>
    </span>
  `;
}
