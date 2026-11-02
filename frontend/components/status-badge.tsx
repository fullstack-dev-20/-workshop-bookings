import type { BookingStatus } from "@/lib/types";

const styles: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-violet-100 text-violet-900",
  cancelled: "bg-zinc-200 text-zinc-600 line-through",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
