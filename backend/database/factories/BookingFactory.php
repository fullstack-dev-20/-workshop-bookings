<?php

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    public function definition(): array
    {
        // A unique future day per booking, so factories never trip the overlap
        // trigger by accident. Tests that care about clashes set times explicitly.
        $startsAt = now()->startOfDay()
            ->addDays(fake()->unique()->numberBetween(30, 3000))
            ->setTime(fake()->numberBetween(8, 13), 0);

        return [
            'customer_name' => fake()->name(),
            'customer_email' => fake()->safeEmail(),
            'rego' => strtoupper(fake()->bothify('???###')),
            'service_bay' => fake()->numberBetween(1, count(config('bookings.service_bays'))),
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addHours(fake()->numberBetween(1, 3)),
            'status' => BookingStatus::Pending,
            'notes' => null,
        ];
    }

    public function confirmed(): static
    {
        return $this->state(['status' => BookingStatus::Confirmed]);
    }

    public function cancelled(): static
    {
        return $this->state(['status' => BookingStatus::Cancelled]);
    }
}
