"use client";

import { useActionState } from "react";
import { deleteBooking } from "@/app/bookings/actions";

export function DeleteBookingButton({ id }: { id: number }) {
  const [error, formAction, pending] = useActionState(deleteBooking.bind(null, id), undefined);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("Delete this booking? This can't be undone.")) event.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-red-300 px-3 py-1.5 text-red-700 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
