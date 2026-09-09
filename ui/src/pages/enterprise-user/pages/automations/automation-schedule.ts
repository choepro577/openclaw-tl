import { Cron } from "croner";
import { html, nothing } from "lit";
import { renderSettingsRow } from "../../../../components/settings-ui.ts";
import { eu, type EnterpriseUserCopyKey } from "../../../../i18n/enterprise-user.ts";
import type { UserAutomationSchedule } from "../../contracts/user-automation.ts";

type CronSchedule = Extract<UserAutomationSchedule, { kind: "cron" }>;
type Pattern = "daily" | "weekdays" | "weekly" | "monthly";
type CalendarSchedule = { pattern: Pattern; time: string; day: number };
const patterns: Record<Pattern, EnterpriseUserCopyKey> = {
  daily: "automationDaily",
  weekdays: "automationWeekdays",
  weekly: "automationWeekly",
  monthly: "automationMonthly",
};

export function automationScheduleValid(schedule: UserAutomationSchedule): boolean {
  if (schedule.kind === "once")
    return Number.isFinite(Date.parse(schedule.at)) && Date.parse(schedule.at) > Date.now();
  if (schedule.kind === "interval")
    return (
      Number.isSafeInteger(schedule.everyMinutes) &&
      schedule.everyMinutes >= 1 &&
      schedule.everyMinutes <= 525600
    );
  try {
    return Boolean(
      schedule.expr.trim() &&
      schedule.expr.length <= 256 &&
      new Cron(schedule.expr, { timezone: schedule.tz }).nextRun(),
    );
  } catch {
    return false;
  }
}

export function parseCalendarSchedule(expr: string): CalendarSchedule | null {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const [minute, hour, date, month, weekday] = fields;
  if (
    !/^\d{1,2}$/.test(minute) ||
    !/^\d{1,2}$/.test(hour) ||
    +minute > 59 ||
    +hour > 23 ||
    month !== "*"
  )
    return null;
  const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  if (date === "*" && weekday === "*") return { pattern: "daily", time, day: 1 };
  if (date === "*" && weekday === "1-5") return { pattern: "weekdays", time, day: 1 };
  if (date === "*" && /^[0-6]$/.test(weekday)) return { pattern: "weekly", time, day: +weekday };
  if (weekday === "*" && /^\d{1,2}$/.test(date) && +date >= 1 && +date <= 31)
    return { pattern: "monthly", time, day: +date };
  return null;
}

export function calendarExpression(value: CalendarSchedule): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) throw new Error("Invalid time");
  if (
    !Number.isInteger(value.day) ||
    (value.pattern === "weekly" && (value.day < 0 || value.day > 6)) ||
    (value.pattern === "monthly" && (value.day < 1 || value.day > 31))
  )
    throw new Error("Invalid day");
  const [hour, minute] = value.time.split(":").map(Number);
  return `${minute} ${hour} ${value.pattern === "monthly" ? value.day : "*"} * ${value.pattern === "weekdays" ? "1-5" : value.pattern === "weekly" ? value.day : "*"}`;
}

export function calendarScheduleLabel(schedule: CronSchedule): string {
  const value = parseCalendarSchedule(schedule.expr);
  if (!value) return eu("automationCron", { expression: schedule.expr });
  const day =
    value.pattern === "weekly"
      ? eu(`automationDay${value.day}` as EnterpriseUserCopyKey)
      : String(value.day);
  return `${eu(patterns[value.pattern])}${value.pattern === "weekly" || value.pattern === "monthly" ? ` · ${day}` : ""} · ${value.time}`;
}

export function renderCalendarSchedule(
  schedule: CronSchedule,
  disabled: boolean,
  advanced: boolean,
  onAdvanced: (value: boolean) => void,
  onChange: (value: CronSchedule) => void,
) {
  const parsed = parseCalendarSchedule(schedule.expr);
  const value = parsed ?? { pattern: "daily" as const, time: "08:00", day: 1 };
  const custom = advanced || !parsed;
  const update = (patch: Partial<CalendarSchedule>) =>
    onChange({ ...schedule, expr: calendarExpression({ ...value, ...patch }) });
  const row = (
    title: EnterpriseUserCopyKey,
    control: ReturnType<typeof html>,
    description?: string,
  ) => renderSettingsRow({ title: eu(title), stacked: true, control, description });
  return html`
    ${row(
      "automationRepeat",
      html`<select
        class="settings-select"
        aria-label=${eu("automationRepeat")}
        ?disabled=${disabled}
        .value=${custom ? "custom" : value.pattern}
        @change=${(event: Event) => {
          const selected = (event.currentTarget as HTMLSelectElement).value;
          onAdvanced(selected === "custom");
          if (selected !== "custom") update({ pattern: selected as Pattern, day: 1 });
        }}
      >
        ${Object.entries(patterns).map(
          ([key, label]) => html`<option value=${key}>${eu(label)}</option>`,
        )}
        <option value="custom">${eu("automationAdvancedSchedule")}</option>
      </select>`,
    )}
    ${custom
      ? row(
          "automationCronExpression",
          html`<input
            class="settings-input"
            aria-label=${eu("automationCronExpression")}
            maxlength="256"
            ?disabled=${disabled}
            .value=${schedule.expr}
            @input=${(event: Event) =>
              onChange({ ...schedule, expr: (event.currentTarget as HTMLInputElement).value })}
          />`,
        )
      : html`
          ${value.pattern === "weekly" || value.pattern === "monthly"
            ? row(
                value.pattern === "weekly" ? "automationWeekday" : "automationMonthDay",
                html`<select
                  class="settings-select"
                  aria-label=${eu(
                    value.pattern === "weekly" ? "automationWeekday" : "automationMonthDay",
                  )}
                  ?disabled=${disabled}
                  .value=${String(value.day)}
                  @change=${(event: Event) =>
                    update({ day: Number((event.currentTarget as HTMLSelectElement).value) })}
                >
                  ${Array.from({ length: value.pattern === "weekly" ? 7 : 31 }, (_, index) => {
                    const day = value.pattern === "weekly" ? index : index + 1;
                    return html`<option value=${String(day)}>
                      ${value.pattern === "weekly"
                        ? eu(`automationDay${day}` as EnterpriseUserCopyKey)
                        : day}
                    </option>`;
                  })}
                </select>`,
                value.pattern === "monthly" ? eu("automationMissingMonthDay") : undefined,
              )
            : nothing}
          ${row(
            "automationClockTime",
            html`<input
              class="settings-input"
              type="time"
              required
              aria-label=${eu("automationClockTime")}
              ?disabled=${disabled}
              .value=${value.time}
              @change=${(event: Event) => {
                const input = event.currentTarget as HTMLInputElement;
                if (input.value && input.validity.valid) update({ time: input.value });
              }}
            />`,
          )}
        `}
    ${row(
      "automationCronTimezone",
      html`<input
        class="settings-input"
        aria-label=${eu("automationCronTimezone")}
        placeholder=${eu("automationTimezonePlaceholder")}
        ?disabled=${disabled}
        .value=${schedule.tz ?? ""}
        @change=${(event: Event) => {
          const tz = (event.currentTarget as HTMLInputElement).value.trim();
          onChange({ kind: "cron", expr: schedule.expr, ...(tz ? { tz } : {}) });
        }}
      />`,
      eu("automationTimezoneHelp"),
    )}
    <div class="settings-row">
      <span class="settings-row__desc"
        >${calendarScheduleLabel(schedule)} · ${schedule.tz || eu("automationServerTimezone")}</span
      >
    </div>
  `;
}
