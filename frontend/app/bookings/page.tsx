import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BookingsCalendar, BookingsCalendarSkeleton } from "@/components/bookings-calendar";
import { getSchedule, getServiceBays } from "@/lib/bookings";
import { isMonth, monthGrid } from "@/lib/calendar";
import { dealerNow } from "@/lib/format";

export const metadata: Metadata = { title: "Bookings" };

// Not async: everything here depends on the URL or the date, so it all
// streams in behind the fallback.
export default function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  return (
    <Suspense fallback={<BookingsCalendarSkeleton />}>
      <MonthCalendar searchParams={searchParams} />
    </Suspense>
  );
}

async function MonthCalendar({ searchParams }: Pick<PageProps<"/bookings">, "searchParams">) {
  const { month } = await searchParams;
  // "Today" has to be worked out per request, not when the page is prerendered.
  await connection();
  const today = dealerNow().slice(0, 10);
  // ?month=YYYY-MM, or this month when it's missing or junk.
  const shown = isMonth(month) ? month : today.slice(0, 7);
  // The whole grid, so the days from the months either side are filled in too.
  const days = monthGrid(shown);
  const [bays, bookings] = await Promise.all([getServiceBays(), getSchedule(days[0], days[days.length - 1])]);

  return <BookingsCalendar month={shown} today={today} bays={bays} bookings={bookings} />;
}
