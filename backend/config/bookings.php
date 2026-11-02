<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Dealer timezone
    |--------------------------------------------------------------------------
    |
    | Times are stored in UTC. The API accepts and returns them as wall-clock
    | time at the dealership, because that's how staff and customers think
    | about a 9am service. Brisbane has no daylight saving, so there are no
    | ambiguous or skipped hours to worry about.
    |
    */

    'timezone' => env('DEALER_TIMEZONE', 'Australia/Brisbane'),

    /*
    |--------------------------------------------------------------------------
    | Service bays
    |--------------------------------------------------------------------------
    |
    | Bay number => display name. A single dealer's bays rarely change, so
    | config is enough here. In a multi-dealer platform this becomes a table.
    |
    */

    'service_bays' => [
        1 => 'Bay 1',
        2 => 'Bay 2',
        3 => 'Bay 3',
        4 => 'Bay 4',
    ],

];
