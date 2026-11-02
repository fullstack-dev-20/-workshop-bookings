<?php

namespace App\Http\Requests;

use App\Enums\BookingStatus;
use Illuminate\Validation\Rule;

/**
 * Full replacement (PUT): the same fields as creating a booking.
 */
class UpdateBookingRequest extends StoreBookingRequest
{
    public function rules(): array
    {
        return [
            ...parent::rules(),
            // Past bookings stay editable, e.g. to cancel one or add notes.
            'starts_at' => ['required', 'date'],
            'status' => ['required', Rule::enum(BookingStatus::class)],
        ];
    }

    protected function ignoredBookingId(): ?int
    {
        return $this->route('booking')->id;
    }
}
