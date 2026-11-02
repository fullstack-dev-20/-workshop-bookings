<?php

use App\Actions\SaveBooking;
use App\Enums\BookingStatus;
use App\Models\Booking;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->existing = bookSlot('2026-11-03 09:00', '2026-11-03 11:00');
});

it('rejects a booking that overlaps another in the same bay', function () {
    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-03T10:00',
        'ends_at' => '2026-11-03T12:00',
    ]))
        ->assertUnprocessable()
        ->assertOnlyJsonValidationErrors([
            'starts_at' => 'Bay 1 is already booked from Tue 3 Nov, 09:00 to 11:00.',
        ]);

    expect(Booking::count())->toBe(1);
});

it('catches every shape of overlap', function (string $from, string $to) {
    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => "2026-11-03T{$from}",
        'ends_at' => "2026-11-03T{$to}",
    ]))->assertJsonValidationErrors('starts_at');
})->with([
    'starts inside' => ['10:00', '12:00'],
    'ends inside' => ['08:00', '10:00'],
    'inside' => ['09:30', '10:30'],
    'surrounds' => ['08:00', '12:00'],
    'identical' => ['09:00', '11:00'],
]);

it('allows back-to-back bookings', function () {
    $this->postJson('/api/bookings', bookingPayload(['starts_at' => '2026-11-03T11:00', 'ends_at' => '2026-11-03T12:00']))
        ->assertCreated();
    $this->postJson('/api/bookings', bookingPayload(['starts_at' => '2026-11-03T08:00', 'ends_at' => '2026-11-03T09:00']))
        ->assertCreated();
});

it('allows the same time in a different bay', function () {
    $this->postJson('/api/bookings', bookingPayload(['service_bay' => 2]))->assertCreated();
});

it('ignores cancelled bookings', function () {
    $this->existing->update(['status' => BookingStatus::Cancelled]);

    $this->postJson('/api/bookings', bookingPayload())->assertCreated();
});

it('does not let a booking clash with itself when edited', function () {
    $this->putJson("/api/bookings/{$this->existing->id}", bookingPayload([
        'status' => 'confirmed',
        'notes' => 'Customer running 15 minutes late.',
    ]))->assertOk();
});

it('rejects moving a booking onto another one', function () {
    $other = bookSlot('2026-11-03 13:00', '2026-11-03 15:00');

    $this->putJson("/api/bookings/{$other->id}", bookingPayload(['status' => 'pending']))
        ->assertJsonValidationErrors('starts_at');
});

it('rejects reinstating a cancelled booking whose slot has been taken', function () {
    $this->existing->update(['status' => BookingStatus::Cancelled]);
    $this->postJson('/api/bookings', bookingPayload())->assertCreated();

    $this->putJson("/api/bookings/{$this->existing->id}", bookingPayload(['status' => 'confirmed']))
        ->assertJsonValidationErrors('starts_at');
});

it('enforces the rule in the database, not just in validation', function () {
    // The losing side of a race: validation has already passed, then another
    // request takes the slot before our write. The insert itself must fail.
    $save = fn () => app(SaveBooking::class)(new Booking, [
        'customer_name' => 'Late Larry',
        'customer_email' => 'larry@example.com',
        'rego' => 'XYZ789',
        'service_bay' => 1,
        'starts_at' => '2026-11-03 00:00:00', // 10:00 dealer time, in UTC
        'ends_at' => '2026-11-03 02:00:00',
    ]);

    expect($save)->toThrow(ValidationException::class, 'Bay 1 is already booked from Tue 3 Nov, 09:00 to 11:00.')
        ->and(Booking::count())->toBe(1);
});
