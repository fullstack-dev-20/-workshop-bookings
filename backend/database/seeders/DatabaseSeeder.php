<?php

namespace Database\Seeders;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Two weeks either side of today: up to three non-overlapping slots per
     * bay per weekday, in dealer time. Past bookings are mostly confirmed.
     */
    public function run(): void
    {
        fake()->seed(42);

        $tz = config('bookings.timezone');
        $today = CarbonImmutable::now($tz)->startOfDay();
        $slots = [['08:00', '10:00'], ['10:30', '13:00'], ['13:30', '16:00']];

        foreach (range(-14, 14) as $offset) {
            $day = $today->addDays($offset);

            if ($day->isWeekend()) {
                continue;
            }

            foreach (array_keys(config('bookings.service_bays')) as $bay) {
                foreach ($slots as [$from, $to]) {
                    if (fake()->boolean(45)) {
                        continue;
                    }

                    Booking::factory()->create([
                        'service_bay' => $bay,
                        'starts_at' => $day->setTimeFromTimeString($from)->utc(),
                        'ends_at' => $day->setTimeFromTimeString($to)->utc(),
                        'status' => match (true) {
                            fake()->boolean(10) => BookingStatus::Cancelled,
                            $offset < 0 || fake()->boolean(60) => BookingStatus::Confirmed,
                            default => BookingStatus::Pending,
                        },
                        'notes' => fake()->optional(0.3)->randomElement([
                            'Annual service and brake check.',
                            'Water leak near the front window.',
                            'Check 12V battery and solar controller.',
                            'Wheel bearing repack before a long trip.',
                            'Customer will drop keys in the after-hours box.',
                        ]),
                    ]);
                }
            }
        }
    }
}
