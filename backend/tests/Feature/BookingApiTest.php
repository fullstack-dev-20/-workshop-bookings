<?php

use App\Models\Booking;

it('creates a booking, storing UTC and returning dealer time', function () {
    $this->postJson('/api/bookings', bookingPayload(['rego' => 'abc 123']))
        ->assertCreated()
        ->assertJsonPath('data.rego', 'ABC123')
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.starts_at', '2026-11-03T09:00:00+10:00')
        ->assertJsonPath('data.ends_at', '2026-11-03T11:00:00+10:00');

    expect(Booking::sole()->getRawOriginal('starts_at'))->toBe('2026-11-02 23:00:00');
});

it('respects an explicit UTC offset on input', function () {
    $this->postJson('/api/bookings', bookingPayload([
        'starts_at' => '2026-11-02T23:00:00Z',
        'ends_at' => '2026-11-03T01:00:00Z',
    ]))
        ->assertCreated()
        ->assertJsonPath('data.starts_at', '2026-11-03T09:00:00+10:00');
});

it('shows a booking', function () {
    $booking = Booking::factory()->create();

    $this->getJson("/api/bookings/{$booking->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $booking->id)
        ->assertJsonPath('data.customer_email', $booking->customer_email);
});

it('returns 404 for a booking that does not exist', function () {
    $this->getJson('/api/bookings/999')->assertNotFound();
});

it('updates a booking', function () {
    $booking = bookSlot('2026-11-03 09:00', '2026-11-03 11:00');

    $this->putJson("/api/bookings/{$booking->id}", bookingPayload([
        'status' => 'confirmed',
        'notes' => 'Bring spare keys.',
    ]))
        ->assertOk()
        ->assertJsonPath('data.status', 'confirmed')
        ->assertJsonPath('data.notes', 'Bring spare keys.');

    expect($booking->fresh()->notes)->toBe('Bring spare keys.');
});

it('lets past bookings be edited', function () {
    $booking = bookSlot('2026-10-01 09:00', '2026-10-01 10:00');

    $this->putJson("/api/bookings/{$booking->id}", bookingPayload([
        'starts_at' => '2026-10-01T09:00',
        'ends_at' => '2026-10-01T10:00',
        'status' => 'cancelled',
    ]))->assertOk();
});

it('deletes a booking', function () {
    $booking = Booking::factory()->create();

    $this->deleteJson("/api/bookings/{$booking->id}")->assertNoContent();
    $this->getJson("/api/bookings/{$booking->id}")->assertNotFound();
});

it('paginates bookings, latest start first', function () {
    Booking::factory()->count(12)->create();

    $response = $this->getJson('/api/bookings?page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.current_page', 2)
        ->assertJsonPath('meta.last_page', 2)
        ->assertJsonPath('meta.total', 12);

    $starts = $this->getJson('/api/bookings')->json('data.*.starts_at');
    expect($starts)->toBe(collect($starts)->sortDesc()->values()->all());
});

it('filters bookings by status', function () {
    Booking::factory()->count(2)->confirmed()->create();
    Booking::factory()->count(3)->create();

    $response = $this->getJson('/api/bookings?status=confirmed')->assertOk();

    expect($response->json('data.*.status'))->toBe(['confirmed', 'confirmed'])
        ->and($response->json('meta.total'))->toBe(2);
});

it('rejects an unknown status filter', function () {
    $this->getJson('/api/bookings?status=archived')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');
});

it('lists the service bays', function () {
    $this->getJson('/api/service-bays')
        ->assertOk()
        ->assertJsonCount(count(config('bookings.service_bays')), 'data')
        ->assertJsonPath('data.0', ['id' => 1, 'name' => 'Bay 1']);
});
