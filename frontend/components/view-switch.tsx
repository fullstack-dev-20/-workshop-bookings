import Link from "next/link";

const views = [
  { label: "Month", href: "/bookings" },
  { label: "List", href: "/bookings/list" },
] as const;

/** Two pages over the same bookings: the month calendar and the paginated list. */
export function ViewSwitch({ current }: { current: (typeof views)[number]["label"] }) {
  return (
    <nav aria-label="View" className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-sm">
      {views.map(({ label, href }) => (
        <Link
          key={label}
          href={href}
          aria-current={label === current ? "page" : undefined}
          className={`rounded-md px-3 py-1 font-medium ${
            label === current ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
