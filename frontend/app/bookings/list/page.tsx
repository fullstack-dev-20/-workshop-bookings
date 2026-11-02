import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingsTable, BookingsTableSkeleton } from "@/components/bookings-table";
import { StatusFilter } from "@/components/status-filter";
import { ViewSwitch } from "@/components/view-switch";
import { isBookingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "All bookings" };

// Not async: the heading is part of the prerendered static shell, and
// everything that depends on the URL streams in behind the fallback.
export default function BookingsListPage({ searchParams }: PageProps<"/bookings/list">) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">All bookings</h1>
        <ViewSwitch current="List" />
      </div>
      <Suspense fallback={<BookingsTableSkeleton />}>
        <FilteredBookings searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FilteredBookings({ searchParams }: Pick<PageProps<"/bookings/list">, "searchParams">) {
  const { status, page } = parseListParams(await searchParams);

  return (
    <>
      <StatusFilter current={status} />
      {/* A new key per filter/page gives a fresh boundary, so the skeleton
          shows while the next page loads instead of stale rows lingering. */}
      <Suspense key={`${status}:${page}`} fallback={<BookingsTableSkeleton />}>
        <BookingsTable status={status} page={page} />
      </Suspense>
    </>
  );
}

/** Junk in the URL falls back to "all statuses, page 1" rather than an error. */
function parseListParams(params: Record<string, string | string[] | undefined>) {
  const status = isBookingStatus(params.status) ? params.status : undefined;
  const page = Number(params.page);

  return { status, page: Number.isInteger(page) && page > 0 ? page : 1 };
}
