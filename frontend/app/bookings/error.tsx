"use client";

import { useEffect } from "react";

export default function BookingsError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // In production, Server Component errors arrive with a generic message and
  // a digest that matches the server log, never the original details.
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;

  return (
    <div role="alert" className="space-y-3 rounded border border-red-300 bg-red-50 p-6">
      <h2 className="text-lg font-semibold">We couldn&apos;t load the bookings</h2>
      <p>The bookings service may be unavailable. Please try again in a moment.</p>
      {digest && <p className="text-xs text-zinc-600">Reference: {digest}</p>}
      <button onClick={() => retry()} className="rounded-lg bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-700">
        Try again
      </button>
    </div>
  );
}
