<?php

namespace App\Http\Resources;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Booking
 */
class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $tz = config('bookings.timezone');

        return [
            'id' => $this->id,
            'customer_name' => $this->customer_name,
            'customer_email' => $this->customer_email,
            'rego' => $this->rego,
            'service_bay' => $this->service_bay,
            // ISO 8601 with the dealer's offset, e.g. 2026-11-03T09:00:00+10:00
            'starts_at' => $this->starts_at->setTimezone($tz)->toIso8601String(),
            'ends_at' => $this->ends_at->setTimezone($tz)->toIso8601String(),
            'status' => $this->status,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->setTimezone($tz)->toIso8601String(),
            'updated_at' => $this->updated_at?->setTimezone($tz)->toIso8601String(),
        ];
    }
}
