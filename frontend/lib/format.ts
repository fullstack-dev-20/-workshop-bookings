// Format in the dealer's timezone, not the server's or the viewer's, so
// "09:00" means 9am at the workshop wherever the page is rendered.
const timeZone = process.env.DEALER_TIMEZONE ?? "Australia/Brisbane";

const dayFormat = new Intl.DateTimeFormat("en-AU", {
  timeZone,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-AU", {
  timeZone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const wallClockFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The time at the dealership now, shaped like a datetime-local value: "2026-11-03T09:00" */
export function dealerNow(): string {
  const parts = Object.fromEntries(
    wallClockFormat.formatToParts(new Date()).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** e.g. "Tue, 3 Nov 2026, 09:00–11:00" */
export function formatSlot(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startDay = dayFormat.format(start);
  const endDay = dayFormat.format(end);

  return startDay === endDay
    ? `${startDay}, ${timeFormat.format(start)}–${timeFormat.format(end)}`
    : `${startDay}, ${timeFormat.format(start)} – ${endDay}, ${timeFormat.format(end)}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${dayFormat.format(date)}, ${timeFormat.format(date)}`;
}
