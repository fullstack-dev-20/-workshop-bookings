"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import type { BookingFormState } from "@/app/bookings/actions";
import { type CalendarOptions, SlotPicker } from "@/components/slot-picker";
import {
  BOOKING_STATUSES,
  type BookingField,
  type BookingInput,
  type FieldErrors,
  type ServiceBay,
} from "@/lib/types";

type Props = {
  action: (state: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  defaults: BookingInput;
  bays: ServiceBay[];
  calendar: CalendarOptions;
  submitLabel: string;
  cancelHref: string;
};

export function BookingForm(props: Props) {
  // Cache Components keeps visited pages mounted (hidden by React
  // <Activity>), so without this, coming back to the form through a link
  // shows the old draft and stale validation errors. bfcacheId changes on
  // link (push/replace) navigations but not on Back/Forward: a new visit
  // gets a clean form, while Back still restores what the user typed.
  const { bfcacheId } = useRouter();

  return <Form key={bfcacheId} {...props} />;
}

function Form({ action, defaults, bays, calendar, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  // React resets the form after each action. Default to what was just
  // submitted so a failed save doesn't wipe the user's input.
  const values = state.values ?? defaults;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} noValidate className="space-y-6">
      {state.message && (
        <p role="alert" className="max-w-xl rounded border border-red-300 bg-red-50 px-3 py-2 text-red-800">
          {state.message}
        </p>
      )}

      {/* Fills the service_bay, starts_at and ends_at fields. */}
      <SlotPicker {...calendar} bays={bays} value={values} errors={errors} lastResult={state} />

      <div className="max-w-xl space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="customer_name" label="Customer name" errors={errors}>
            <input
              {...control("customer_name", errors)}
              type="text"
              autoComplete="name"
              defaultValue={values.customer_name}
            />
          </Field>

          <Field name="customer_email" label="Customer email" errors={errors}>
            <input
              {...control("customer_email", errors)}
              type="email"
              autoComplete="email"
              defaultValue={values.customer_email}
            />
          </Field>

          <Field name="rego" label="Caravan rego" errors={errors}>
            <input
              {...control("rego", errors)}
              type="text"
              autoCapitalize="characters"
              defaultValue={values.rego}
            />
          </Field>

          <Field name="status" label="Status" errors={errors}>
            {/* React won't apply a new defaultValue to a mounted <select>, so
                the post-action reset would snap back to the first choice.
                Keying on the value remounts it with the submitted one. */}
            <select key={values.status} {...control("status", errors)} defaultValue={values.status}>
              {BOOKING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status[0].toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field name="notes" label="Notes (optional)" errors={errors}>
          <textarea {...control("notes", errors)} rows={4} defaultValue={values.notes} />
        </Field>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : submitLabel}
          </button>
          <Link href={cancelHref} className="text-zinc-600 underline">
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  errors,
  children,
}: {
  name: BookingField;
  label: string;
  errors: FieldErrors;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {errors[name] && (
        <p id={`${name}-error`} className="text-sm text-red-700">
          {errors[name].join(" ")}
        </p>
      )}
    </div>
  );
}

function control(name: BookingField, errors: FieldErrors) {
  const invalid = Boolean(errors[name]);

  return {
    id: name,
    name,
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${name}-error` : undefined,
    className: `block w-full rounded border bg-white px-3 py-2 ${
      invalid ? "border-red-500" : "border-zinc-300"
    }`,
  };
}
