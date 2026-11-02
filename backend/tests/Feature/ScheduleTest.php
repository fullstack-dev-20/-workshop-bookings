<?php

it('lists the active bookings on a day, across bays, in time then bay order', function () {
    $later = bookSlot('2026-11-03 13:00', '2026-11-03 15:00');
    $bay2 = bookSlot('2026-11-03 09:00', '2026-11-03 10:00', ['service_bay' => 2]);
    $earlier = bookSlot('2026-11-03 09:00', '2026-11-03 11:00');
    bookSlot('2026-11-03 11:00', '2026-11-03 12:00', ['status' => 'cancelled']);
    bookSlot('2026-11-04 09:00', '2026-11-04 11:00');

    $this->getJson('/api/schedule?from=2026-11-03')
        ->assertOk()
        ->assertJsonPath('data.*.id', [$earlier->id, $bay2->id, $later->id])
        ->assertJsonPath('data.0.starts_at', '2026-11-03T09:00:00+10:00');
});

it('uses the dealer day, not the UTC one', function () {
    // Brisbane is UTC+10: a UTC day would miss the 6am booking and include the last one.
    $overnight = bookSlot('2026-11-03 23:30', '2026-11-04 00:30');
    $early = bookSlot('2026-11-04 06:00', '2026-11-04 08:00', ['service_bay' => 2]);
    bookSlot('2026-11-03 22:00', '2026-11-04 00:00', ['service_bay' => 2]); // ends as the day starts
    bookSlot('2026-11-05 00:00', '2026-11-05 02:00'); // starts as the day ends

    $this->getJson('/api/schedule?from=2026-11-04')
        ->assertOk()
        ->assertJsonPath('data.*.id', [$overnight->id, $early->id]);
});

it('covers a range of days, both ends included', function () {
    bookSlot('2026-10-25 09:00', '2026-10-25 11:00');
    $first = bookSlot('2026-10-26 09:00', '2026-10-26 11:00');
    $last = bookSlot('2026-12-06 16:00', '2026-12-06 17:00');
    bookSlot('2026-12-07 09:00', '2026-12-07 11:00');

    $this->getJson('/api/schedule?from=2026-10-26&to=2026-12-06')
        ->assertOk()
        ->assertJsonPath('data.*.id', [$first->id, $last->id]);
});

it('rejects a missing or malformed day', function (string $query) {
    $this->getJson("/api/schedule{$query}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('from');
})->with([
    'missing' => [''],
    'wrong format' => ['?from=03-11-2026'],
    'not a real day' => ['?from=2026-02-30'],
]);

it('rejects a backwards or too long range', function (string $to) {
    $this->getJson("/api/schedule?from=2026-11-03&to={$to}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('to');
})->with([
    'ends before it starts' => ['2026-11-02'],
    '43 days' => ['2026-12-15'],
]);

it('allows six weeks', function () {
    $this->getJson('/api/schedule?from=2026-11-03&to=2026-12-14')->assertOk();
});
