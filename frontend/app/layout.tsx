import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Workshop bookings", template: "%s · Workshop bookings" },
  description: "Book caravans into the workshop's service bays.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/bookings" className="flex items-center gap-2.5 font-semibold">
              <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white">
                <svg viewBox="0 0 20 20" className="size-5">
                  <rect x="3" y="4.5" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 8.5h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              Workshop bookings
            </Link>
            <Link
              href="/bookings/new"
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              <span aria-hidden className="text-base leading-none">
                +
              </span>
              New booking
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
