<?php

namespace App\Http\Requests;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreBookingRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'string', 'email', 'max:255'],
            'rego' => ['required', 'string', 'regex:/^[A-Z0-9]{1,9}$/'],
            'service_bay' => ['required', 'integer', Rule::in(array_keys(config('bookings.service_bays')))],
            'starts_at' => ['required', 'date', 'after:now'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'status' => ['sometimes', Rule::enum(BookingStatus::class)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'customer_name' => 'name',
            'customer_email' => 'email',
            'service_bay' => 'service bay',
            'starts_at' => 'start time',
            'ends_at' => 'end time',
        ];
    }

    public function messages(): array
    {
        return [
            'rego.regex' => 'The rego may only contain letters and numbers (up to 9).',
            'starts_at.after' => 'The start time must be in the future.',
            'ends_at.after' => 'The end time must be after the start time.',
        ];
    }

    /**
     * Overlap pre-check, so a clash is reported alongside any other field errors.
     * It can race with a concurrent request; the database trigger is the real
     * guarantee and SaveBooking turns its rejection into the same error.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->hasAny(['service_bay', 'starts_at', 'ends_at', 'status'])) {
                    return;
                }

                if ($this->input('status') === BookingStatus::Cancelled->value) {
                    return;
                }

                $conflict = Booking::query()
                    ->overlapping(
                        (int) $this->input('service_bay'),
                        CarbonImmutable::parse($this->input('starts_at')),
                        CarbonImmutable::parse($this->input('ends_at')),
                    )
                    ->when($this->ignoredBookingId(), fn ($query, $id) => $query->whereKeyNot($id))
                    ->first();

                if ($conflict) {
                    $validator->errors()->add('starts_at', $conflict->overlapMessage());
                }
            },
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($rego = $this->input('rego'))) {
            $this->merge(['rego' => strtoupper(preg_replace('/[\s-]+/', '', $rego))]);
        }

        foreach (['starts_at', 'ends_at'] as $key) {
            if (is_string($value = $this->input($key)) && $value !== '') {
                $this->merge([$key => $this->toUtc($value)]);
            }
        }
    }

    /** The booking being edited, which can't clash with itself. */
    protected function ignoredBookingId(): ?int
    {
        return null;
    }

    /**
     * Times without an offset (e.g. from <input type="datetime-local">) are
     * dealer wall-clock time. Unparseable values are left for the date rule.
     */
    private function toUtc(string $value): string
    {
        try {
            return CarbonImmutable::parse($value, config('bookings.timezone'))->utc()->format('Y-m-d H:i:s');
        } catch (InvalidFormatException) {
            return $value;
        }
    }
}
