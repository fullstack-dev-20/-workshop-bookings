"use client";

import { useLinkStatus } from "next/link";

/**
 * Inline "loading" hint for links to pages that render before streaming
 * (booking detail and edit), which have no loading.tsx fallback to show.
 * Must be rendered inside a <Link>.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();

  return (
    <span aria-hidden className={`ml-2 text-xs text-zinc-500 ${pending ? "" : "invisible"}`}>
      Loading…
    </span>
  );
}
