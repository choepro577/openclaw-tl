import { render } from "lit";
import { describe, expect, it } from "vitest";
import { computeNextRunAtMs } from "../../../../../../src/cron/schedule.ts";
import type { UserAutomationSchedule } from "../../contracts/user-automation.ts";
import { renderCalendarSchedule } from "./automation-schedule.ts";
import {
  automationScheduleValid,
  calendarExpression,
  parseCalendarSchedule,
} from "./automation-schedule.ts";

describe("calendar schedule matches gateway execution", () => {
  it.each([
    ["daily", "08:30", 1, "2026-09-08T00:00:00Z", "2026-09-08T01:30:00Z"],
    ["weekdays", "08:00", 1, "2026-09-11T02:00:00Z", "2026-09-14T01:00:00Z"],
    ["weekly", "09:00", 0, "2026-09-08T00:00:00Z", "2026-09-13T02:00:00Z"],
    ["monthly", "08:00", 31, "2026-04-01T00:00:00Z", "2026-05-31T01:00:00Z"],
  ] as const)("runs %s at the selected Vietnam wall time", (pattern, time, day, now, expected) => {
    const expr = calendarExpression({ pattern, time, day });
    expect(parseCalendarSchedule(expr)).toMatchObject({ pattern, time });
    const next = computeNextRunAtMs(
      { kind: "cron", expr, tz: "Asia/Ho_Chi_Minh" },
      Date.parse(now),
    );
    expect(next).toBe(Date.parse(expected));
  });
  it("updates the visible calendar controls while preserving timezone and advanced schedules", () => {
    const container = document.createElement("div");
    let schedule: Extract<UserAutomationSchedule, { kind: "cron" }> = {
      kind: "cron",
      expr: "0 3 * * *",
      tz: "Asia/Ho_Chi_Minh",
    };
    let advanced = false;
    const refresh = () =>
      render(
        renderCalendarSchedule(
          schedule,
          false,
          advanced,
          (value) => {
            advanced = value;
          },
          (value) => {
            schedule = value;
          },
        ),
        container,
      );
    refresh();
    const repeat = container.querySelector("select")!;
    repeat.value = "monthly";
    repeat.dispatchEvent(new Event("change"));
    refresh();
    const day = container.querySelectorAll("select")[1];
    day.value = "31";
    day.dispatchEvent(new Event("change"));
    refresh();
    const time = container.querySelector<HTMLInputElement>('input[type="time"]')!;
    time.value = "08:30";
    time.dispatchEvent(new Event("change"));
    expect(schedule).toEqual({ kind: "cron", expr: "30 8 31 * *", tz: "Asia/Ho_Chi_Minh" });
    refresh();
    const select = container.querySelector("select")!;
    select.value = "custom";
    select.dispatchEvent(new Event("change"));
    refresh();
    expect(container.querySelector('input[type="time"]')).toBeNull();
    expect(container.querySelector("input")!.value).toBe("30 8 31 * *");
    const expression = container.querySelector("input")!;
    expression.value = "*/15 * * * *";
    expression.dispatchEvent(new Event("input"));
    refresh();
    expect(schedule.expr).toBe("*/15 * * * *");
    expect(container.querySelector("select")!.value).toBe("custom");
  });

  it("preserves advanced expressions and rejects invalid schedules", () => {
    for (const expr of ["*/15 * * * *", "0 8 1 * 1", "0 0 8 * * *"])
      expect(parseCalendarSchedule(expr)).toBeNull();
    expect(automationScheduleValid({ kind: "cron", expr: "0 8 * * *", tz: "invalid/zone" })).toBe(
      false,
    );
    expect(automationScheduleValid({ kind: "cron", expr: "broken" })).toBe(false);
    expect(automationScheduleValid({ kind: "interval", everyMinutes: 1.5 })).toBe(false);
    expect(() => calendarExpression({ pattern: "daily", time: "25:00", day: 1 })).toThrow();
    expect(() => calendarExpression({ pattern: "monthly", time: "08:00", day: 32 })).toThrow();
  });
});
