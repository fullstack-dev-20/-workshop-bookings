<?php

namespace App\Models;

use App\Enums\BookingStatus;
use Carbon\CarbonInterface;
use Database\Factories\BookingFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;

class Booking extends Model
{
    /** @use HasFactory<BookingFactory> */
    use HasFactory;

    protected $fillable = [
        'customer_name',
        'customer_email',
        'rego',
        'service_bay',
        'starts_at',
        'ends_at',
        'status',
        'notes',
    ];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'service_bay' => 'integer',
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
            'status' => BookingStatus::class,
        ];
    }

    /**
     * Active bookings in the bay whose [starts_at, ends_at) intersects the given range.
     * Mirrors the bookings_no_overlap_* triggers.
     */
    #[Scope]
    protected function overlapping(Builder $query, int $bay, CarbonInterface $startsAt, CarbonInterface $endsAt): void
    {
        $query->where('service_bay', $bay)->activeDuring($startsAt, $endsAt);
    }

    /** Active bookings in any bay whose [starts_at, ends_at) intersects the given range. */
    #[Scope]
    protected function activeDuring(Builder $query, CarbonInterface $from, CarbonInterface $to): void
    {
        // Bindings are formatted without timezone conversion, so normalise to UTC like the stored values.
        $query->where('status', '!=', BookingStatus::Cancelled)
            ->where('starts_at', '<', $to->toImmutable()->utc())
            ->where('ends_at', '>', $from->toImmutable()->utc());
    }

    public static function isOverlapViolation(QueryException $e): bool
    {
        return str_contains($e->getMessage(), 'booking_overlap');
    }

    /** Human-readable clash message, in the dealer's timezone. */
    public function overlapMessage(): string
    {
        $tz = config('bookings.timezone');
        $start = $this->starts_at->setTimezone($tz);
        $end = $this->ends_at->setTimezone($tz);

        return sprintf(
            '%s is already booked from %s to %s.',
            config("bookings.service_bays.{$this->service_bay}", "Bay {$this->service_bay}"),
            $start->format('D j M, H:i'),
            $end->isSameDay($start) ? $end->format('H:i') : $end->format('D j M, H:i'),
        );
    }
}
