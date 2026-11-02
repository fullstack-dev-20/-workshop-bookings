<?php

namespace App\Http\Controllers;

use App\Actions\SaveBooking;
use App\Http\Requests\ListBookingsRequest;
use App\Http\Requests\StoreBookingRequest;
use App\Http\Requests\UpdateBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class BookingController extends Controller
{
    public function index(ListBookingsRequest $request): AnonymousResourceCollection
    {
        $bookings = Booking::query()
            ->when($request->validated('status'), fn ($query, $status) => $query->where('status', $status))
            ->orderByDesc('starts_at')
            ->orderByDesc('id')
            ->paginate((int) $request->validated('per_page', 10))
            ->withQueryString();

        return BookingResource::collection($bookings);
    }

    public function store(StoreBookingRequest $request, SaveBooking $save): JsonResponse
    {
        $booking = $save(new Booking, $request->validated());

        return BookingResource::make($booking)->response()->setStatusCode(201);
    }

    public function show(Booking $booking): BookingResource
    {
        return BookingResource::make($booking);
    }

    public function update(UpdateBookingRequest $request, Booking $booking, SaveBooking $save): BookingResource
    {
        return BookingResource::make($save($booking, $request->validated()));
    }

    public function destroy(Booking $booking): Response
    {
        $booking->delete();

        return response()->noContent();
    }
}
