import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateBooking } from "@/app/bookings/actions";
import { BookingForm } from "@/components/booking-form";
import { getBooking, getSchedule, getServiceBays } from "@/lib/bookings";
import { wallClock } from "@/lib/calendar";
import { dealerNow } from "@/lib/format";
import type { Booking, BookingInput } from "@/lib/types";

// Same as the detail page: no streaming, so a missing booking is a real 404.
export const instant = false;

export const metadata: Metadata = { title: "Edit booking" };

export default async function EditBookingPage({ params }: PageProps<"/bookings/[id]/edit">) {
  const { id } = await params;
  const [booking, bays] = await Promise.all([getBooking(id), getServiceBays()]);
  if (!booking) notFound();

  // Open the calendar on the booking's own day. Past slots stay pickable,
  // like the API allows, so an old booking can still be corrected.
  const day = booking.starts_at.slice(0, 10);
  const bookings = await getSchedule(day);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit booking</h1>
      <BookingForm
        action={updateBooking.bind(null, booking.id)}
        defaults={toFormValues(booking)}
        bays={bays}
        calendar={{
          schedule: { date: day, bookings },
          today: dealerNow().slice(0, 10),
          bookingId: booking.id,
        }}
        submitLabel="Save changes"
        cancelHref={`/bookings/${booking.id}`}
      />
    </div>
  );
}

function toFormValues(booking: Booking): BookingInput {
  return {
    customer_name: booking.customer_name,
    customer_email: booking.customer_email,
    rego: booking.rego,
    service_bay: String(booking.service_bay),
    // The API sends dealer time with an offset; the form deals in the
    // wall-clock part only: 2026-11-03T09:00:00+10:00 -> 2026-11-03T09:00
    starts_at: wallClock(booking.starts_at),
    ends_at: wallClock(booking.ends_at),
    status: booking.status,
    notes: booking.notes ?? "",
  };
}
