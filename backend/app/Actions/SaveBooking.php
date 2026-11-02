<?php

namespace App\Actions;

use App\Models\Booking;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

class SaveBooking
{
    /**
     * Create or update a booking from validated input.
     *
     * @param  array<string, mixed>  $attributes
     *
     * @throws ValidationException when the slot was taken after validation passed
     */
    public function __invoke(Booking $booking, array $attributes): Booking
    {
        $booking->fill($attributes);

        try {
            $booking->save();
        } catch (QueryException $e) {
            if (! Booking::isOverlapViolation($e)) {
                throw $e;
            }

            // We lost a race: another request took the slot between our
            // Form Request check and this write, and the trigger refused it.
            // Report it exactly like the pre-check would have.
            $conflict = Booking::query()
                ->overlapping($booking->service_bay, $booking->starts_at, $booking->ends_at)
                ->when($booking->exists, fn ($query) => $query->whereKeyNot($booking->getKey()))
                ->first();

            throw ValidationException::withMessages([
                'starts_at' => $conflict?->overlapMessage() ?? 'This service bay is already booked for part of that time.',
            ]);
        }

        return $booking;
    }
}
