export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export function isBookingStatus(value: unknown): value is BookingStatus {
  return BOOKING_STATUSES.includes(value as BookingStatus);
}

/** A booking as the Laravel API returns it. */
export type Booking = {
  id: number;
  customer_name: string;
  customer_email: string;
  rego: string;
  service_bay: number;
  /** ISO 8601 in dealer time, e.g. 2026-11-03T09:00:00+10:00 */
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Paginated<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};

export type ServiceBay = { id: number; name: string };

/** The active bookings that take up part of one dealer-time day (YYYY-MM-DD). */
export type DaySchedule = { date: string; bookings: Booking[] };

/** Form fields, named exactly as Laravel expects them and reports errors. */
export const BOOKING_FIELDS = [
  "customer_name",
  "customer_email",
  "rego",
  "service_bay",
  "starts_at",
  "ends_at",
  "status",
  "notes",
] as const;
export type BookingField = (typeof BOOKING_FIELDS)[number];

/** Form values as strings, the way FormData and inputs deal in them. */
export type BookingInput = Record<BookingField, string>;

/** Laravel's 422 `errors` object: field name => messages. */
export type FieldErrors = Partial<Record<BookingField, string[]>>;
