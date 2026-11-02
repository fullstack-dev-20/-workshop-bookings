<?php

use App\Models\Booking;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(function () {
        // Freeze "now" at Mon 2 Nov 2026, 08:00 dealer time, so the fixed
        // dates used in these tests are always in the future.
        $this->travelTo(CarbonImmutable::parse('2026-11-02 08:00', 'Australia/Brisbane')->utc());
    })
    ->in('Feature');

/**
 * A valid create payload, in dealer wall-clock time (what the form sends).
 */
function bookingPayload(array $overrides = []): array
{
    return [
        'customer_name' => 'Jo Citizen',
        'customer_email' => 'jo@example.com',
        'rego' => 'ABC123',
        'service_bay' => 1,
        'starts_at' => '2026-11-03T09:00',
        'ends_at' => '2026-11-03T11:00',
        'notes' => null,
        ...$overrides,
    ];
}

/**
 * Persist a booking in bay 1 between two dealer-time datetimes.
 */
function bookSlot(string $from, string $to, array $attributes = []): Booking
{
    $tz = config('bookings.timezone');

    return Booking::factory()->create([
        'service_bay' => 1,
        'starts_at' => CarbonImmutable::parse($from, $tz)->utc(),
        'ends_at' => CarbonImmutable::parse($to, $tz)->utc(),
        ...$attributes,
    ]);
}
