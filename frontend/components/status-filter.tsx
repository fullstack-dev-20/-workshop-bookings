import Link from "next/link";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/types";

const options: { label: string; value?: BookingStatus }[] = [
  { label: "All" },
  ...BOOKING_STATUSES.map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })),
];

/**
 * Plain links, not client state: the URL is the source of truth, so a
 * filtered view can be shared, bookmarked and restored with Back. Changing
 * the filter drops ?page so you start from the first page of results.
 */
export function StatusFilter({ current }: { current?: BookingStatus }) {
  return (
    <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
      {options.map(({ label, value }) => {
        const active = value === current;

        return (
          <Link
            key={label}
            href={value ? { pathname: "/bookings/list", query: { status: value } } : "/bookings/list"}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${
              active ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-300 bg-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
