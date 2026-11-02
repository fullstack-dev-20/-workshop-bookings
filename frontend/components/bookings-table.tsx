import Link from "next/link";
import { LinkPending } from "@/components/link-pending";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { listBookings } from "@/lib/bookings";
import { formatSlot } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

export async function BookingsTable({ status, page }: { status?: BookingStatus; page: number }) {
  const { data: bookings, meta } = await listBookings({ status, page });

  if (meta.total === 0) {
    return <p className="rounded border bg-white p-6 text-zinc-600">No {status} bookings.</p>;
  }

  if (bookings.length === 0) {
    return (
      <p className="rounded border bg-white p-6 text-zinc-600">
        There&apos;s no page {page}.{" "}
        <Link href={{ pathname: "/bookings/list", query: status ? { status } : {} }} className="underline">
          Go to the first page
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Bay</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Rego</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <Link href={`/bookings/${booking.id}`} className="underline">
                    {formatSlot(booking.starts_at, booking.ends_at)}
                    <LinkPending />
                  </Link>
                </td>
                <td className="px-3 py-2">{booking.service_bay}</td>
                <td className="px-3 py-2">{booking.customer_name}</td>
                <td className="px-3 py-2 font-mono">{booking.rego}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={booking.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination status={status} meta={meta} />
    </div>
  );
}

export function BookingsTableSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading bookings" className="space-y-2 rounded border bg-white p-3">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="h-6 animate-pulse rounded bg-zinc-100" />
      ))}
    </div>
  );
}
