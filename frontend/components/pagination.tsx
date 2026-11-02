import Link from "next/link";
import type { BookingStatus, Paginated } from "@/lib/types";

type Props = {
  status?: BookingStatus;
  meta: Paginated<unknown>["meta"];
};

export function Pagination({ status, meta }: Props) {
  const href = (page: number) => ({
    pathname: "/bookings/list",
    query: { ...(status && { status }), ...(page > 1 && { page }) },
  });

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
      <p className="text-zinc-600">
        {meta.from}–{meta.to} of {meta.total}
      </p>
      <div className="flex items-center gap-3">
        {meta.current_page > 1 ? (
          <Link href={href(meta.current_page - 1)} rel="prev" className="underline">
            Previous
          </Link>
        ) : (
          <span className="text-zinc-400">Previous</span>
        )}
        <span>
          Page {meta.current_page} of {meta.last_page}
        </span>
        {meta.current_page < meta.last_page ? (
          <Link href={href(meta.current_page + 1)} rel="next" className="underline">
            Next
          </Link>
        ) : (
          <span className="text-zinc-400">Next</span>
        )}
      </div>
    </nav>
  );
}
