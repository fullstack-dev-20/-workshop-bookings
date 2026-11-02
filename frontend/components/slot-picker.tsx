"use client";

import { Fragment, useEffect, useState } from "react";
import {
  addMonths,
  formatDay,
  formatMonth,
  monthDays,
  toTime,
  wallClock,
  WEEKDAY_HEADINGS,
} from "@/lib/calendar";
import type { Booking, BookingInput, DaySchedule, FieldErrors, ServiceBay } from "@/lib/types";

// The part of the day the grid offers, in minutes after midnight, dealer
// time. Laravel doesn't restrict hours; this is only what staff can pick.
const OPENS = 7 * 60;
const CLOSES = 18 * 60;
const STEP = 30;
const SLOTS = Array.from({ length: (CLOSES - OPENS) / STEP }, (_, i) => OPENS + i * STEP);
const HOURS = SLOTS.filter((minutes) => minutes % 60 === 0);

/** The form fields this picker fills, as hidden inputs. */
const FIELDS = ["service_bay", "starts_at", "ends_at"] as const;

export type CalendarOptions = {
  /** Bookings on the day the calendar opens on, fetched by the page. */
  schedule: DaySchedule;
  /** The dealer's date today, YYYY-MM-DD. */
  today: string;
  /** Slots starting at or before this dealer time can't be picked. */
  notBefore?: string;
  /** The booking being edited, which mustn't block its own slot. */
  bookingId?: number;
};

type Props = CalendarOptions & {
  bays: ServiceBay[];
  /** The saved or just-submitted bay and times. */
  value: Pick<BookingInput, (typeof FIELDS)[number]>;
  errors: FieldErrors;
  /** A new value after every save attempt, since a failed save may mean the slot was just taken. */
  lastResult: unknown;
};

/** start and end are dealer wall-clock times, YYYY-MM-DDTHH:mm. */
type Selection = { bay: number; start: string; end: string };

/** One cell in a bay's row: a free slot, or a block of slots one booking takes. */
type RowItem = { start: string; end: string; span: number; booking?: Booking };

export function SlotPicker({ bays, value, errors, lastResult, ...options }: Props) {
  const { today, notBefore, bookingId } = options;
  const [selection, setSelection] = useState(() => toSelection(value));
  // After a click sets the start, the next click in that bay sets the end.
  const [choosingEnd, setChoosingEnd] = useState(false);
  const [day, setDay] = useState(options.schedule.date);
  const [month, setMonth] = useState(day.slice(0, 7));
  const [schedule, setSchedule] = useState(options.schedule);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Reloads whenever the day changes, after each save attempt, on "Try
  // again", and on mount, because the page holding the server's copy may come
  // from the client router cache. The old copy stays up until the new one lands.
  useEffect(() => {
    let ignore = false;
    fetchSchedule(day).then(
      (bookings) => {
        if (ignore) return;
        setSchedule({ date: day, bookings });
        setLoadFailed(false);
      },
      (error: unknown) => {
        if (ignore) return;
        console.error(error);
        setLoadFailed(true);
      },
    );
    return () => {
      ignore = true;
    };
  }, [day, lastResult, attempt]);

  const bookings =
    schedule.date === day ? schedule.bookings.filter((booking) => booking.id !== bookingId) : null;

  function pick(bay: number, start: string, end: string) {
    if (
      choosingEnd &&
      selection?.bay === bay &&
      selection.start.startsWith(day) &&
      start >= selection.start &&
      !bookings?.some((booking) => booking.service_bay === bay && takes(booking, selection.start, end))
    ) {
      setSelection({ bay, start: selection.start, end });
      setChoosingEnd(false);
    } else {
      setSelection({ bay, start, end });
      setChoosingEnd(true);
    }
  }

  function clear() {
    setSelection(null);
    setChoosingEnd(false);
  }

  const invalid = FIELDS.filter((field) => errors[field]);
  const bayName = (id: number) => bays.find((bay) => bay.id === id)?.name ?? `Bay ${id}`;

  return (
    <fieldset
      aria-describedby={invalid.map((field) => `${field}-error`).join(" ") || undefined}
      className="space-y-3"
    >
      <legend className="mb-1 text-sm font-medium">Service bay and time</legend>
      <input type="hidden" name="service_bay" value={selection ? String(selection.bay) : ""} />
      <input type="hidden" name="starts_at" value={selection?.start ?? ""} />
      <input type="hidden" name="ends_at" value={selection?.end ?? ""} />

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          day={day}
          onDayChange={setDay}
          today={today}
          firstDay={notBefore?.slice(0, 10)}
        />

        <div className="min-w-0 space-y-2">
          <p className="font-medium">{formatDay(day)}</p>
          {loadFailed && (
            <p role="alert" className="text-sm text-red-700">
              Couldn&apos;t load this day&apos;s bookings.{" "}
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="underline">
                Try again
              </button>
            </p>
          )}
          {bookings ? (
            <DayGrid
              day={day}
              bays={bays}
              bookings={bookings}
              selection={selection}
              notBefore={notBefore}
              onPick={pick}
            />
          ) : (
            <div
              aria-busy="true"
              aria-label="Loading the day's bookings"
              className="h-44 animate-pulse rounded border bg-zinc-100"
            />
          )}
          <Legend showPast={notBefore !== undefined} />
        </div>
      </div>

      <div aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {selection && (
          <>
            <p>
              <span className="font-medium">{bayName(selection.bay)}</span> · {formatRange(selection)}
            </p>
            <button type="button" onClick={clear} className="text-zinc-600 underline">
              Clear
            </button>
          </>
        )}
        {(!selection || choosingEnd) && (
          <p className="text-zinc-600">
            {choosingEnd
              ? "Now click the last slot of the booking, or pick a different start."
              : "Click a free slot to set the start, then click the last slot to set the end."}
          </p>
        )}
      </div>

      {invalid.map((field) => (
        <p key={field} id={`${field}-error`} className="text-sm text-red-700">
          {errors[field]?.join(" ")}
        </p>
      ))}
    </fieldset>
  );
}

function MonthCalendar({
  month,
  onMonthChange,
  day,
  onDayChange,
  today,
  firstDay,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  day: string;
  onDayChange: (day: string) => void;
  today: string;
  /** Days before this can't be picked. */
  firstDay?: string;
}) {
  return (
    <div className="w-full max-w-60 self-start rounded border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          disabled={firstDay !== undefined && month <= firstDay.slice(0, 7)}
          aria-label="Previous month"
          className="rounded px-2 py-0.5 hover:bg-zinc-100 disabled:opacity-30"
        >
          ‹
        </button>
        <p id="calendar-month" aria-live="polite" className="font-medium">
          {formatMonth(month)}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          aria-label="Next month"
          className="rounded px-2 py-0.5 hover:bg-zinc-100"
        >
          ›
        </button>
      </div>

      <div role="group" aria-labelledby="calendar-month" className="grid grid-cols-7 gap-1 text-center text-sm">
        {WEEKDAY_HEADINGS.map((heading) => (
          <span key={heading} aria-hidden className="text-xs text-zinc-500">
            {heading}
          </span>
        ))}
        {monthDays(month).map((date, i) =>
          date === null ? (
            <span key={`blank-${i}`} />
          ) : (
            <button
              key={date}
              type="button"
              onClick={() => onDayChange(date)}
              disabled={firstDay !== undefined && date < firstDay}
              aria-pressed={date === day}
              aria-current={date === today ? "date" : undefined}
              aria-label={formatDay(date)}
              className={`rounded py-1 ${
                date === day
                  ? "bg-violet-600 text-white"
                  : `hover:bg-zinc-100 disabled:text-zinc-300 disabled:hover:bg-transparent ${
                      date === today ? "font-semibold ring-1 ring-zinc-400" : ""
                    }`
              }`}
            >
              <time dateTime={date}>{Number(date.slice(8))}</time>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function DayGrid({
  day,
  bays,
  bookings,
  selection,
  notBefore,
  onPick,
}: {
  day: string;
  bays: ServiceBay[];
  bookings: Booking[];
  selection: Selection | null;
  notBefore?: string;
  onPick: (bay: number, start: string, end: string) => void;
}) {
  return (
    // relative: the blocks' sr-only labels are absolutely positioned, and
    // without a positioned ancestor here they'd widen the page, not this box.
    <div className="relative overflow-x-auto rounded border">
      <div
        className="grid gap-px bg-zinc-200 text-xs"
        style={{ gridTemplateColumns: `4.5rem repeat(${SLOTS.length}, minmax(1.75rem, 1fr))` }}
      >
        <span className="sticky left-0 bg-zinc-50" />
        {HOURS.map((minutes) => (
          <span
            key={minutes}
            style={{ gridColumn: `span ${60 / STEP}` }}
            className="bg-zinc-50 px-1 py-1 text-zinc-500"
          >
            {toTime(minutes)}
          </span>
        ))}

        {bays.map((bay) => (
          <Fragment key={bay.id}>
            <span className="sticky left-0 z-10 flex items-center bg-white px-2 font-medium">{bay.name}</span>
            {rowItems(
              day,
              bookings.filter((booking) => booking.service_bay === bay.id),
            ).map(({ start, end, span, booking }) => {
              if (booking) {
                const times = `${wallClock(booking.starts_at).slice(11)}–${wallClock(booking.ends_at).slice(11)}`;
                return (
                  <div
                    key={start}
                    style={{ gridColumn: `span ${span}` }}
                    title={`${booking.customer_name}, ${times}`}
                    className="flex h-9 items-center overflow-hidden bg-zinc-300 px-1.5 text-zinc-800"
                  >
                    <span className="truncate">
                      <span className="sr-only">Booked {times}: </span>
                      {booking.customer_name}
                    </span>
                  </div>
                );
              }

              const selected = selection?.bay === bay.id && selection.start < end && selection.end > start;
              const past = notBefore !== undefined && start <= notBefore;
              return (
                <button
                  key={start}
                  type="button"
                  onClick={() => onPick(bay.id, start, end)}
                  disabled={past}
                  aria-pressed={selected}
                  aria-label={`${bay.name}, ${start.slice(11)}–${end.slice(11)}`}
                  className={`h-9 ${
                    selected
                      ? "bg-violet-600 hover:bg-violet-700"
                      : past
                        ? "cursor-not-allowed bg-zinc-100"
                        : "bg-white hover:bg-zinc-100"
                  }`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function Legend({ showPast }: { showPast: boolean }) {
  const keys = [
    { label: "Free", swatch: "border bg-white" },
    { label: "Booked", swatch: "bg-zinc-300" },
    { label: "Selected", swatch: "bg-violet-600" },
    ...(showPast ? [{ label: "Past", swatch: "border bg-zinc-100" }] : []),
  ];

  return (
    <ul className="flex flex-wrap gap-4 text-xs text-zinc-600">
      {keys.map(({ label, swatch }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-3 rounded-sm border-zinc-300 ${swatch}`} />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** A bay's slots on the day, with neighbouring slots one booking takes merged into a block. */
function rowItems(day: string, bookings: Booking[]): RowItem[] {
  const items: RowItem[] = [];

  for (const minutes of SLOTS) {
    const start = `${day}T${toTime(minutes)}`;
    const end = `${day}T${toTime(minutes + STEP)}`;
    const booking = bookings.find((candidate) => takes(candidate, start, end));
    const last = items.at(-1);

    if (booking && last?.booking?.id === booking.id) {
      last.span += 1;
      last.end = end;
    } else {
      items.push({ start, end, span: 1, booking });
    }
  }

  return items;
}

/** Whether the booking takes up any of [from, to), both dealer wall-clock times. */
function takes(booking: Booking, from: string, to: string): boolean {
  return wallClock(booking.starts_at) < to && wallClock(booking.ends_at) > from;
}

function toSelection({ service_bay, starts_at, ends_at }: Props["value"]): Selection | null {
  const bay = Number(service_bay);
  return bay && starts_at && ends_at ? { bay, start: starts_at, end: ends_at } : null;
}

/** e.g. "Tue 3 Nov 2026, 09:00–11:00" */
function formatRange({ start, end }: Selection): string {
  const startDay = start.slice(0, 10);
  const endDay = end.slice(0, 10);

  return startDay === endDay
    ? `${formatDay(startDay)}, ${start.slice(11)}–${end.slice(11)}`
    : `${formatDay(startDay)}, ${start.slice(11)} – ${formatDay(endDay)}, ${end.slice(11)}`;
}

async function fetchSchedule(date: string): Promise<Booking[]> {
  const res = await fetch(`/api/schedule?${new URLSearchParams({ date })}`);
  if (!res.ok) throw new Error(`Schedule responded ${res.status} for ${date}`);

  return res.json();
}
