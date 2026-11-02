<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ShowScheduleRequest extends FormRequest
{
    /** Six weeks: the most a month calendar shows. The schedule isn't paginated. */
    public const MAX_DAYS = 42;

    public function rules(): array
    {
        return [
            // Calendar days at the dealership, e.g. 2026-11-03, both included.
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty() || $this->input('to') === null) {
                    return;
                }

                $days = CarbonImmutable::parse($this->input('from'))->diffInDays($this->input('to')) + 1;

                if ($days > self::MAX_DAYS) {
                    $validator->errors()->add('to', 'The schedule can cover at most '.self::MAX_DAYS.' days.');
                }
            },
        ];
    }
}
