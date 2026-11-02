<?php

use App\Http\Controllers\BookingController;
use App\Http\Controllers\ScheduleController;
use Illuminate\Support\Facades\Route;

Route::apiResource('bookings', BookingController::class);

Route::get('schedule', ScheduleController::class);

Route::get('service-bays', fn () => [
    'data' => collect(config('bookings.service_bays'))
        ->map(fn (string $name, int $id) => ['id' => $id, 'name' => $name])
        ->values(),
]);
