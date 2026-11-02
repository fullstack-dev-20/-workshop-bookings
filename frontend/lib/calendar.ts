// Calendar maths on dealer wall-clock strings: "YYYY-MM" months,
// "YYYY-MM-DD" days and "YYYY-MM-DDTHH:mm" times (what datetime-local
// inputs and the API's offset-free prefix use). Strings in one of these
// shapes sort chronologically, so plain < and > compare them. Dates are
// only built in UTC, which keeps the browser's own timezone out of it.

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Column headings for a Monday-first month grid. */
export const WEEKDAY_HEADINGS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
export const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toUtcDate(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

/** Whether the value is a real "YYYY-MM-DD" day (so not 2026-02-30). */
export function isDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[12]\d{3}-\d{2}-\d{2}$/.test(value) &&
    toUtcDate(value).toISOString().startsWith(value)
  );
}

/** Whether the value is a "YYYY-MM" month. */
export function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^[12]\d{3}-(0[1-9]|1[0-2])$/.test(value);
}

/** "2026-11" -> "November 2026" */
export function formatMonth(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return `${MONTHS[index - 1]} ${year}`;
}

/** "2026-11-03" -> "Tue 3 Nov 2026" */
export function formatDay(day: string): string {
  const date = toUtcDate(day);
  return `${DAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()].slice(0, 3)} ${date.getUTCFullYear()}`;
}

/** "2026-11", 1 -> "2026-12" */
export function addMonths(month: string, count: number): string {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + count, 1)).toISOString().slice(0, 7);
}

/** "2026-11-30", 1 -> "2026-12-01" */
export function addDays(day: string, count: number): string {
  const date = toUtcDate(day);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/** The month's days, led by nulls so the 1st sits under its weekday. */
export function monthDays(month: string): (string | null)[] {
  const first = toUtcDate(`${month}-01`);
  const blanks = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();

  return [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
}

/**
 * Every day in a Monday-first month grid: whole weeks, from the Monday on or
 * before the 1st to the Sunday on or after the last day.
 */
export function monthGrid(month: string): string[] {
  const days = monthDays(month);
  const start = addDays(`${month}-01`, -days.indexOf(`${month}-01`));

  return Array.from({ length: Math.ceil(days.length / 7) * 7 }, (_, i) => addDays(start, i));
}

/** Minutes after midnight -> "HH:mm" */
export function toTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
}

/** An API timestamp in dealer time without its offset: "2026-11-03T09:00:00+10:00" -> "2026-11-03T09:00" */
export function wallClock(iso: string): string {
  return iso.slice(0, 16);
}
