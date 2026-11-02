<?php

namespace App\Http\Controllers;

use App\Http\Requests\ShowScheduleRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use Carbon\CarbonImmutable;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ScheduleController extends Controller
{
    /**
     * Every active booking that takes up part of the given dealer-time days,
     * in all bays: what the calendars need to show what's on and which slots
     * are free. Not paginated; the request caps the range at six weeks.
     */
    public function __invoke(ShowScheduleRequest $request): AnonymousResourceCollection
    {
        $from = $this->dealerMidnight($request->validated('from'));
        $to = $this->dealerMidnight($request->validated('to') ?? $request->validated('from'))->addDay();

        $bookings = Booking::query()
            ->activeDuring($from, $to)
            ->orderBy('starts_at')
            ->orderBy('service_bay')
            ->get();

        return BookingResource::collection($bookings);
    }

    private function dealerMidnight(string $day): CarbonImmutable
    {
        // "!" zeroes the time, so this is the start of the day at the dealership.
        return CarbonImmutable::createFromFormat('!Y-m-d', $day, config('bookings.timezone'));
    }
}
