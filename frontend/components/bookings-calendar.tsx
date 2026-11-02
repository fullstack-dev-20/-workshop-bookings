"use client";

import Link, { useLinkStatus } from "next/link";
import { useState } from "react";
import { ViewSwitch } from "@/components/view-switch";
import {
  addDays,
  addMonths,
  formatDay,
  formatMonth,
  monthDays,
  monthGrid,
  wallClock,
  WEEKDAY_HEADINGS,
  WEEKDAY_NAMES,
} from "@/lib/calendar";
import type { Booking, BookingStatus, ServiceBay } from "@/lib/types";

/** How many bookings a day lists before "+N more". */
const MAX_CHIPS = 3;

// The schedule only has active bookings. A cancelled one frees its slot, so
// it's left to the list view.
const STATUSES = [
  {
    value: "confirmed",
    label: "Confirmed",
    chip: "bg-violet-600 text-white hover:bg-violet-700",
    swatch: "bg-violet-600",
  },
  {
    value: "pending",
    label: "Pending",
    chip: "bg-amber-300 text-amber-950 hover:bg-amber-400",
    swatch: "bg-amber-400",
  },
] as const satisfies readonly { value: BookingStatus; label: string; chip: string; swatch: string }[];

type Props = {
  /** The month shown, YYYY-MM. */
  month: string;
  /** The dealer's date today, YYYY-MM-DD. */
  today: string;
  bays: ServiceBay[];
  /** Active bookings on every day of the month's grid, in start order. */
  bookings: Booking[];
};

export function BookingsCalendar({ month, today, bays, bookings }: Props) {
  // Filters apply to the weeks already loaded, so ticking a box is instant.
  // Month links re-render this rather than remount it, so they're kept.
  const [hiddenBays, setHiddenBays] = useState<number[]>([]);
  const [hiddenStatuses, setHiddenStatuses] = useState<BookingStatus[]>([]);

  const inBays = bookings.filter((booking) => !hiddenBays.includes(booking.service_bay));
  const shown = inBays.filter((booking) => !hiddenStatuses.includes(booking.status));
  const days = monthGrid(month);
  const byDay = new Map(days.map((day) => [day, shown.filter((booking) => takes(booking, day, addDays(day, 1)))]));
  const thisMonth = inBays.filter((booking) => takes(booking, `${month}-01`, `${addMonths(month, 1)}-01`));
  const bayName = (id: number) => bays.find((bay) => bay.id === id)?.name ?? `Bay ${id}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside
        aria-label="Calendar filters"
        className="order-last space-y-6 self-start rounded-xl border bg-white p-4 shadow-sm lg:order-first"
      >
        <MiniMonth month={month} today={today} byDay={byDay} />

        <fieldset className="space-y-1">
          <legend className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Service bays</legend>
          {bays.map((bay) => (
            <label key={bay.id} className="flex items-center gap-2.5 rounded-md px-1 py-1 text-sm hover:bg-zinc-50">
              <input
                type="checkbox"
                checked={!hiddenBays.includes(bay.id)}
                onChange={() => setHiddenBays(toggle(hiddenBays, bay.id))}
                className="size-4 accent-violet-600"
              />
              {bay.name}
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-1">
          <legend className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Status</legend>
          {STATUSES.map(({ value, label, swatch }) => (
            <label key={value} className="flex items-center gap-2.5 rounded-md px-1 py-1 text-sm hover:bg-zinc-50">
              <input
                type="checkbox"
                checked={!hiddenStatuses.includes(value)}
                onChange={() => setHiddenStatuses(toggle(hiddenStatuses, value))}
                className="size-4 accent-violet-600"
              />
              <span aria-hidden className={`size-2.5 rounded-full ${swatch}`} />
              <span className="flex-1">{label}</span>
              <span className="rounded-full bg-zinc-100 px-2 text-xs text-zinc-600 tabular-nums">
                {thisMonth.filter((booking) => booking.status === value).length}
                <span className="sr-only"> this month</span>
              </span>
            </label>
          ))}
        </fieldset>

        <p className="text-xs text-zinc-500">
          Cancelled bookings free their slot, so they&apos;re only in the{" "}
          <Link href={{ pathname: "/bookings/list", query: { status: "cancelled" } }} className="underline">
            list
          </Link>
          .
        </p>
      </aside>

      <section
        aria-labelledby="calendar-title"
        className="min-w-0 overflow-hidden rounded-xl border bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 id="calendar-title" className="mr-2 text-xl font-semibold">
              {formatMonth(month)}
            </h1>
            <MonthLink className="border border-zinc-300 px-3 py-1 text-sm font-medium">Today</MonthLink>
            <MonthLink month={addMonths(month, -1)} label="Previous month" className="p-1">
              <Chevron />
            </MonthLink>
            <MonthLink month={addMonths(month, 1)} label="Next month" className="p-1">
              <Chevron className="rotate-180" />
            </MonthLink>
          </div>
          <ViewSwitch current="Month" />
        </div>

        <div aria-hidden className="grid grid-cols-7 border-b text-center text-xs font-medium text-zinc-500">
          {WEEKDAY_NAMES.map((name) => (
            <span key={name} className="py-2">
              {name}
            </span>
          ))}
        </div>

        <ol className="grid grid-cols-7 gap-px bg-zinc-200">
          {days.map((day) => (
            <DayCell
              key={day}
              day={day}
              outside={!day.startsWith(month)}
              today={today}
              bookings={byDay.get(day) ?? []}
              bayName={bayName}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}

function DayCell({
  day,
  outside,
  today,
  bookings,
  bayName,
}: {
  day: string;
  /** A day from the month before or after, filling out the first or last week. */
  outside: boolean;
  today: string;
  bookings: Booking[];
  bayName: (id: number) => string;
}) {
  const id = popoverId(day);
  const count = bookings.length;

  return (
    <li className={`min-h-16 p-1 sm:min-h-28 sm:p-1.5 ${outside ? "bg-zinc-50" : "bg-white"}`}>
      <button
        type="button"
        popoverTarget={id}
        aria-label={`${formatDay(day)}, ${count === 1 ? "1 booking" : `${count} bookings`}`}
        aria-current={day === today ? "date" : undefined}
        className={`flex size-7 items-center justify-center rounded-full text-sm ${
          day === today
            ? "bg-violet-600 font-semibold text-white hover:bg-violet-700"
            : `hover:bg-zinc-100 ${outside ? "text-zinc-400" : "text-zinc-700"}`
        }`}
      >
        {Number(day.slice(8))}
      </button>

      {/* Phones get dots; tapping the day lists them. */}
      <div aria-hidden className="mt-1 flex flex-wrap gap-0.5 px-0.5 sm:hidden">
        {bookings.map((booking) => (
          <span key={booking.id} className={`size-1.5 rounded-full ${style(booking).swatch}`} />
        ))}
      </div>

      <ul className="mt-1 hidden space-y-1 sm:block">
        {bookings.slice(0, MAX_CHIPS).map((booking) => (
          <li key={booking.id}>
            <Link
              href={`/bookings/${booking.id}`}
              title={`${booking.customer_name} · ${bayName(booking.service_bay)} · ${timeRange(booking)}`}
              aria-label={`${booking.customer_name}, ${bayName(booking.service_bay)}, ${timeRange(booking)}, ${booking.status}`}
              className={`block truncate rounded-md px-1.5 py-0.5 text-xs font-medium ${style(booking).chip}`}
            >
              <span className="tabular-nums opacity-80">
                {wallClock(booking.starts_at).startsWith(day) ? wallClock(booking.starts_at).slice(11) : "00:00"}
              </span>{" "}
              {booking.customer_name}
            </Link>
          </li>
        ))}
      </ul>
      {count > MAX_CHIPS && (
        <button
          type="button"
          popoverTarget={id}
          className="mt-1 hidden px-1.5 text-xs font-medium text-zinc-600 hover:text-violet-700 sm:block"
        >
          +{count - MAX_CHIPS} more<span className="sr-only"> on {formatDay(day)}</span>
        </button>
      )}

      <DayPopover id={id} day={day} today={today} bookings={bookings} bayName={bayName} />
    </li>
  );
}

/** Everything on one day, opened from the day's number or "+N more". */
function DayPopover({
  id,
  day,
  today,
  bookings,
  bayName,
}: {
  id: string;
  day: string;
  today: string;
  bookings: Booking[];
  bayName: (id: number) => string;
}) {
  // Visited pages stay mounted but hidden, so close it before leaving.
  const hide = () => document.getElementById(id)?.hidePopover();

  return (
    // No display class here: it would override the browser's hiding of a closed popover.
    <div
      id={id}
      popover="auto"
      role="dialog"
      aria-labelledby={`${id}-title`}
      className="m-auto w-88 max-w-[calc(100vw-2rem)] rounded-xl border bg-white text-zinc-900 shadow-xl backdrop:bg-zinc-900/20"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 id={`${id}-title`} className="font-semibold">
          {formatDay(day)}
        </h2>
        <button
          type="button"
          popoverTarget={id}
          popoverTargetAction="hide"
          aria-label="Close"
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="size-4">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {bookings.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-600">No bookings.</p>
      ) : (
        <ul className="max-h-[60vh] divide-y overflow-y-auto">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link
                href={`/bookings/${booking.id}`}
                onClick={hide}
                className="flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-50"
              >
                <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${style(booking).swatch}`} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{booking.customer_name}</span>
                  <span className="block text-sm text-zinc-600">
                    {timeRange(booking)} · {bayName(booking.service_bay)} ·{" "}
                    <span className="capitalize">{booking.status}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {day >= today && (
        <div className="border-t p-3">
          <Link
            href={{ pathname: "/bookings/new", query: { date: day } }}
            onClick={hide}
            className="block rounded-lg bg-violet-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-violet-700"
          >
            New booking on this day
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * The month at a glance, with a dot on busy days. A mouse shortcut to the
 * same day popovers as the main grid, so it's hidden from assistive tech
 * rather than repeating every day for keyboard and screen reader users.
 */
function MiniMonth({ month, today, byDay }: { month: string; today: string; byDay: Map<string, Booking[]> }) {
  return (
    <div aria-hidden className="hidden lg:block">
      <p className="mb-2 px-1 text-sm font-semibold">{formatMonth(month)}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {WEEKDAY_HEADINGS.map((heading) => (
          <span key={heading} className="py-1 text-zinc-400">
            {heading}
          </span>
        ))}
        {monthDays(month).map((day, i) =>
          day === null ? (
            <span key={`blank-${i}`} />
          ) : (
            <button
              key={day}
              type="button"
              tabIndex={-1}
              popoverTarget={popoverId(day)}
              className={`relative mx-auto flex size-7 items-center justify-center rounded-full ${
                day === today ? "bg-violet-600 font-semibold text-white" : "hover:bg-zinc-100"
              }`}
            >
              {Number(day.slice(8))}
              {day !== today && (byDay.get(day)?.length ?? 0) > 0 && (
                <span className="absolute bottom-0.5 size-1 rounded-full bg-violet-500" />
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

/** A link to another month (or, without one, to this one) that pulses while it loads. */
function MonthLink({
  month,
  label,
  className,
  children,
}: {
  month?: string;
  label?: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={month ? { pathname: "/bookings", query: { month } } : "/bookings"}
      aria-label={label}
      className={`relative rounded-md text-zinc-700 hover:bg-zinc-100 ${className}`}
    >
      {children}
      <Pending />
    </Link>
  );
}

function Pending() {
  const { pending } = useLinkStatus();

  return (
    <span aria-hidden className={pending ? "absolute inset-0 animate-pulse rounded-md bg-violet-500/20" : "hidden"} />
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={`size-5 ${className}`}>
      <path
        d="M12.5 15l-5-5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookingsCalendarSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading the calendar"
      className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <div className="order-last h-80 animate-pulse rounded-xl border bg-white lg:order-first" />
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="h-14 border-b" />
        <div className="grid grid-cols-7 gap-px bg-zinc-200">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="min-h-16 bg-white p-1.5 sm:min-h-28">
              <div className="size-6 animate-pulse rounded-full bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function style(booking: Booking) {
  return STATUSES.find(({ value }) => value === booking.status) ?? STATUSES[0];
}

function popoverId(day: string) {
  return `day-${day}`;
}

/** Whether the booking takes up any of the days from `from` up to (not including) `to`. */
function takes(booking: Booking, from: string, to: string): boolean {
  return wallClock(booking.starts_at) < `${to}T00:00` && wallClock(booking.ends_at) > `${from}T00:00`;
}

/** "09:00–11:00", or with the end day when it runs past midnight. */
function timeRange(booking: Booking): string {
  const start = wallClock(booking.starts_at);
  const end = wallClock(booking.ends_at);

  return start.slice(0, 10) === end.slice(0, 10)
    ? `${start.slice(11)}–${end.slice(11)}`
    : `${start.slice(11)} – ${formatDay(end.slice(0, 10))}, ${end.slice(11)}`;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
