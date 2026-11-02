<?php

it('requires the booking fields', function () {
    $this->postJson('/api/bookings', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'customer_name', 'customer_email', 'rego', 'service_bay', 'starts_at', 'ends_at',
        ])
        ->assertJsonMissingValidationErrors(['notes', 'status']);
});

it('rejects invalid values', function (array $overrides, string $field) {
    $this->postJson('/api/bookings', bookingPayload($overrides))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'malformed email' => [['customer_email' => 'not-an-email'], 'customer_email'],
    'rego with symbols' => [['rego' => 'AB#123'], 'rego'],
    'rego too long' => [['rego' => 'ABCDE12345'], 'rego'],
    'unknown bay' => [['service_bay' => 9], 'service_bay'],
    'unknown status' => [['status' => 'done'], 'status'],
    'not a date' => [['starts_at' => 'banana'], 'starts_at'],
    'start in the past' => [['starts_at' => '2026-11-01T09:00'], 'starts_at'],
    'end before start' => [['ends_at' => '2026-11-03T08:00'], 'ends_at'],
    'end equal to start' => [['ends_at' => '2026-11-03T09:00'], 'ends_at'],
    'notes too long' => [['notes' => str_repeat('a', 2001)], 'notes'],
]);

it('uses readable messages for the form', function () {
    $this->postJson('/api/bookings', bookingPayload(['ends_at' => '2026-11-03T08:00']))
        ->assertJsonValidationErrors(['ends_at' => 'The end time must be after the start time.']);
});
