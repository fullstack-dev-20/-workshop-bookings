<?php

/*
 * One contender in tests/Feature/ConcurrentBookingTest.php.
 *
 * Boots the app, waits until every contender is ready, then POSTs the booking
 * through the HTTP kernel and prints {"status": ..., "errors": [...]}.
 *
 * Usage: php tests/Support/book-slot.php <ready-dir> <contenders> <json-payload>
 */

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

require __DIR__.'/../../vendor/autoload.php';

[, $readyDir, $contenders, $payload] = $argv;

$app = require __DIR__.'/../../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

// Barrier: nobody books until everyone has booted.
touch($readyDir.'/'.getmypid());
$deadline = microtime(true) + 10;
while (count(glob($readyDir.'/*')) < (int) $contenders && microtime(true) < $deadline) {
    usleep(500);
}

$response = $kernel->handle(Request::create('/api/bookings', 'POST', server: [
    'HTTP_ACCEPT' => 'application/json',
    'CONTENT_TYPE' => 'application/json',
], content: $payload));

echo json_encode([
    'status' => $response->getStatusCode(),
    'errors' => array_keys(json_decode($response->getContent(), true)['errors'] ?? []),
]);
