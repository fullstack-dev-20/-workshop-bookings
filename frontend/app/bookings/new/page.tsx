import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { createBooking } from "@/app/bookings/actions";
import { BookingForm } from "@/components/booking-form";
import { getSchedule, getServiceBays } from "@/lib/bookings";
import { isDay } from "@/lib/calendar";
import { dealerNow } from "@/lib/format";
import type { BookingInput } from "@/lib/types";

export const metadata: Metadata = { title: "New booking" };

const EMPTY: BookingInput = {
  customer_name: "",
  customer_email: "",
  rego: "",
  service_bay: "",
  starts_at: "",
  ends_at: "",
  status: "pending",
  notes: "",
};

export default function NewBookingPage({ searchParams }: PageProps<"/bookings/new">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New booking</h1>
      <Suspense fallback={<p className="text-zinc-600">Loading form…</p>}>
        <NewBookingForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewBookingForm({ searchParams }: Pick<PageProps<"/bookings/new">, "searchParams">) {
  // Defer to request time so `next build` doesn't need the API running and
  // "today" is today. The bays still come from the "use cache" entry.
  await connection();
  const { date } = await searchParams;
  const now = dealerNow();
  const today = now.slice(0, 10);
  // Open on the day picked on the bookings calendar (?date=YYYY-MM-DD),
  // or on today when it's missing, junk or in the past.
  const day = isDay(date) && date > today ? date : today;
  const [bays, bookings] = await Promise.all([getServiceBays(), getSchedule(day)]);

  return (
    <BookingForm
      action={createBooking}
      defaults={EMPTY}
      bays={bays}
      // New bookings must start in the future, so earlier slots are greyed out.
      calendar={{ schedule: { date: day, bookings }, today, notBefore: now }}
      submitLabel="Create booking"
      cancelHref="/bookings"
    />
  );
}
