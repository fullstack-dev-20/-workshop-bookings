import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ApiError, apiFetch } from "@/lib/api";
import type {
  Booking,
  BookingInput,
  BookingStatus,
  FieldErrors,
  Paginated,
  ServiceBay,
} from "@/lib/types";

export async function listBookings(params: {
  status?: BookingStatus;
  page: number;
}): Promise<Paginated<Booking>> {
  const query = new URLSearchParams({ page: String(params.page) });
  if (params.status) query.set("status", params.status);

  const path = `/bookings?${query}`;
  const res = await apiFetch(path);
  if (!res.ok) throw new ApiError(res.status, path);

  return res.json();
}

/** Returns null when there's no such booking, so pages can call notFound(). */
export async function getBooking(id: string): Promise<Booking | null> {
  if (!/^\d+$/.test(id)) return null;

  const path = `/bookings/${id}`;
  const res = await apiFetch(path);
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status, path);

  return (await res.json()).data;
}

/**
 * Active bookings in any bay that take up part of the dealer-time days from
 * `from` to `to` (YYYY-MM-DD, both included, at most six weeks), in start order.
 */
export async function getSchedule(from: string, to = from): Promise<Booking[]> {
  const path = `/schedule?${new URLSearchParams({ from, to })}`;
  const res = await apiFetch(path);
  if (!res.ok) throw new ApiError(res.status, path);

  return (await res.json()).data;
}

/**
 * Bays are near-static reference data, so unlike bookings they're cached.
 * Tagged so a future "edit bays" action could call updateTag("service-bays").
 */
export async function getServiceBays(): Promise<ServiceBay[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("service-bays");

  const res = await apiFetch("/service-bays");
  if (!res.ok) throw new ApiError(res.status, "/service-bays");

  return (await res.json()).data;
}

export type SaveResult =
  | { ok: true; booking: Booking }
  | { ok: false; errors: FieldErrors; message: string };

/**
 * Create (no id) or replace a booking. Validation errors and outages come
 * back as values, not exceptions, so the form can show them in place.
 */
export async function saveBooking(input: BookingInput, id?: number): Promise<SaveResult> {
  const path = id ? `/bookings/${id}` : "/bookings";

  let res: Response;
  try {
    res = await apiFetch(path, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(input),
    });
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      errors: {},
      message: "Couldn't reach the bookings service, so nothing was saved. Please try again.",
    };
  }

  if (res.status === 422) {
    const body: { errors: FieldErrors } = await res.json();
    return { ok: false, errors: body.errors, message: "Please fix the highlighted fields." };
  }

  if (res.status === 404) {
    return { ok: false, errors: {}, message: "This booking no longer exists." };
  }

  if (!res.ok) {
    console.error(new ApiError(res.status, path));
    return {
      ok: false,
      errors: {},
      message: `Something went wrong saving the booking (error ${res.status}). Please try again.`,
    };
  }

  return { ok: true, booking: (await res.json()).data };
}

export async function destroyBooking(id: number): Promise<void> {
  const path = `/bookings/${id}`;
  const res = await apiFetch(path, { method: "DELETE" });

  // 404 means it's already gone, which is what the user wanted.
  if (!res.ok && res.status !== 404) throw new ApiError(res.status, path);
}
