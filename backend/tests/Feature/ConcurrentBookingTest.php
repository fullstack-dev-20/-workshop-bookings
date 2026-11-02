<?php

use Illuminate\Process\Pool;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

/*
 * Separate PHP processes against a shared SQLite file, released at the same
 * instant, all POSTing the same slot through the full HTTP stack. This is the
 * "two people book at the same moment" case for real, not simulated.
 */
it('lets exactly one of many simultaneous requests take a slot', function () {
    $contenders = 8;
    $dir = storage_path('framework/testing/race-'.uniqid());
    $database = "{$dir}/database.sqlite";
    File::ensureDirectoryExists("{$dir}/ready");
    touch($database);

    $env = ['DB_CONNECTION' => 'sqlite', 'DB_DATABASE' => $database];
    Process::path(base_path())->env($env)->run([PHP_BINARY, 'artisan', 'migrate', '--force'])->throw();

    // Real clock, not the frozen test one: the child processes don't share it.
    $day = date('Y-m-d', strtotime('+1 year'));
    $payload = json_encode(bookingPayload(['starts_at' => "{$day}T09:00", 'ends_at' => "{$day}T11:00"]));

    $results = Process::pool(function (Pool $pool) use ($contenders, $dir, $env, $payload) {
        foreach (range(1, $contenders) as $i) {
            $pool->path(base_path())->env($env)->command([
                PHP_BINARY, 'tests/Support/book-slot.php', "{$dir}/ready", (string) $contenders, $payload,
            ]);
        }
    })->start()->wait();

    $outcomes = $results->collect()
        ->map(fn ($result) => json_decode($result->throw()->output(), true))
        ->sortBy('status')
        ->values();

    $rows = (new PDO("sqlite:{$database}"))->query('select count(*) from bookings')->fetchColumn();
    File::deleteDirectory($dir);

    expect($outcomes->pluck('status')->all())->toBe([201, ...array_fill(0, $contenders - 1, 422)])
        ->and($outcomes->skip(1)->pluck('errors')->unique()->values()->all())->toBe([['starts_at']])
        ->and((int) $rows)->toBe(1);
});
