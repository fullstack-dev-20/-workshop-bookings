import Link from "next/link";

export default function BookingNotFound() {
  return (
    <div className="space-y-3 rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">Booking not found</h1>
      <p className="text-zinc-600">It may have been deleted, or the link is wrong.</p>
      <Link href="/bookings" className="underline">
        Back to all bookings
      </Link>
    </div>
  );
}
