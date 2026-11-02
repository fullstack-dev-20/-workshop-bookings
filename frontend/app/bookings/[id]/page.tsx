import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteBookingButton } from "@/components/delete-booking-button";
import { LinkPending } from "@/components/link-pending";
import { StatusBadge } from "@/components/status-badge";
import { getBooking } from "@/lib/bookings";
import { formatMonth } from "@/lib/calendar";
import { formatDateTime, formatSlot } from "@/lib/format";

// Render fully before responding instead of streaming a shell first. Once a
// stream starts its 200 status is sent, so notFound() could only render the
// not-found UI; this way a missing booking is a real 404.
export const instant = false;

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();

  // Back to the calendar month the booking is in.
  const month = booking.starts_at.slice(0, 7);

  return (
    <div className="space-y-6">
      <Link href={{ pathname: "/bookings", query: { month } }} className="text-sm text-zinc-600 underline">
        ← {formatMonth(month)}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{booking.customer_name}</h1>
          <p className="text-zinc-600">{formatSlot(booking.starts_at, booking.ends_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/bookings/${booking.id}/edit`} className="rounded border px-3 py-1.5">
            Edit
            <LinkPending />
          </Link>
          <DeleteBookingButton id={booking.id} />
        </div>
      </div>

      <dl className="grid max-w-xl grid-cols-[10rem_1fr] gap-x-4 gap-y-3 rounded border bg-white p-4">
        <dt className="text-zinc-600">Status</dt>
        <dd>
          <StatusBadge status={booking.status} />
        </dd>
        <dt className="text-zinc-600">Service bay</dt>
        <dd>Bay {booking.service_bay}</dd>
        <dt className="text-zinc-600">Rego</dt>
        <dd className="font-mono">{booking.rego}</dd>
        <dt className="text-zinc-600">Email</dt>
        <dd>
          <a href={`mailto:${booking.customer_email}`} className="underline">
            {booking.customer_email}
          </a>
        </dd>
        <dt className="text-zinc-600">Notes</dt>
        <dd className="whitespace-pre-line">{booking.notes ?? "—"}</dd>
        <dt className="text-zinc-600">Last updated</dt>
        <dd>{formatDateTime(booking.updated_at)}</dd>
      </dl>
    </div>
  );
}
