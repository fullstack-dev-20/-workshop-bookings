"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destroyBooking, saveBooking } from "@/lib/bookings";
import { BOOKING_FIELDS, type BookingInput, type FieldErrors } from "@/lib/types";

export type BookingFormState = {
  /** What was submitted, so the form can be refilled after an error. */
  values?: BookingInput;
  /** Laravel's validation errors, keyed by field. */
  errors?: FieldErrors;
  message?: string;
};

export async function createBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  return submit(formData);
}

export async function updateBooking(
  id: number,
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  if (!Number.isInteger(id) || id < 1) return { message: "Unknown booking." };

  return submit(formData, id);
}

/** Returns an error message, or redirects to the list on success. */
export async function deleteBooking(id: number): Promise<string | undefined> {
  if (!Number.isInteger(id) || id < 1) return "Unknown booking.";

  try {
    await destroyBooking(id);
  } catch (error) {
    console.error(error);
    return "Couldn't delete the booking. Please try again.";
  }

  revalidatePath("/bookings", "layout");
  redirect("/bookings");
}

async function submit(formData: FormData, id?: number): Promise<BookingFormState> {
  // No validation here on purpose: Laravel's Form Requests are the single
  // source of truth, and their 422 errors come back keyed by these names.
  const values = Object.fromEntries(
    BOOKING_FIELDS.map((field) => [field, String(formData.get(field) ?? "")]),
  ) as BookingInput;

  const result = await saveBooking(values, id);
  if (!result.ok) return { values, errors: result.errors, message: result.message };

  // Bookings aren't cached on the server, so this is for the client: it
  // drops the router cache so the list and any visited booking re-render
  // with fresh data. redirect() sends the destination page back in this
  // same response, so there's no full page reload.
  revalidatePath("/bookings", "layout");
  redirect(`/bookings/${result.booking.id}`);
}
