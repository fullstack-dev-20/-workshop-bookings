<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('rego', 9);
            $table->unsignedTinyInteger('service_bay');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('status', 16)->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            // Overlap lookups (per bay, by time) and the status-filtered list.
            $table->index(['service_bay', 'starts_at']);
            $table->index(['status', 'starts_at']);
        });

        // The no-overlap rule lives in the database so it holds no matter how
        // many requests race for the same slot. SQLite runs one write at a
        // time and these triggers run inside that write, so "check, then
        // insert" can't interleave with another writer. lockForUpdate() would
        // not help here: Laravel compiles it to nothing on SQLite.
        //
        // Intervals are half-open [starts_at, ends_at): a booking ending at
        // 10:00 doesn't clash with one starting at 10:00. Times are stored as
        // UTC 'Y-m-d H:i:s' strings, which compare correctly as text.
        //
        // On Postgres this would be an exclusion constraint instead (see README).
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER bookings_no_overlap_insert
            BEFORE INSERT ON bookings
            WHEN NEW.status <> 'cancelled'
            BEGIN
                SELECT RAISE(ABORT, 'booking_overlap')
                WHERE EXISTS (
                    SELECT 1 FROM bookings
                    WHERE service_bay = NEW.service_bay
                      AND status <> 'cancelled'
                      AND starts_at < NEW.ends_at
                      AND ends_at > NEW.starts_at
                );
            END;
            SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER bookings_no_overlap_update
            BEFORE UPDATE OF service_bay, starts_at, ends_at, status ON bookings
            WHEN NEW.status <> 'cancelled'
            BEGIN
                SELECT RAISE(ABORT, 'booking_overlap')
                WHERE EXISTS (
                    SELECT 1 FROM bookings
                    WHERE id <> NEW.id
                      AND service_bay = NEW.service_bay
                      AND status <> 'cancelled'
                      AND starts_at < NEW.ends_at
                      AND ends_at > NEW.starts_at
                );
            END;
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
