# Workshop bookings

A small bookings module for a caravan dealer's service workshop: customers are booked into a service bay for a time slot, and no two active bookings may overlap in the same bay.

- `backend/`: Laravel 13 JSON API, SQLite, Pest
- `frontend/`: Next.js 16 (App Router, TypeScript, Cache Components), Tailwind for minimal styling

## How to run

You need PHP 8.3+ with `pdo_sqlite`, Composer, and Node 20.9+.

```bash
# API: http://127.0.0.1:8000/api
cd backend
composer setup      # install, .env, app key, SQLite file, migrate + seed (resets the database)
composer dev        # php artisan serve
composer test       # Pest, including a real multi-process race test

# Frontend: http://localhost:3000
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Optional checks in `frontend/`: `npm run lint`, `npm run typecheck`, and `npm run test:e2e` (Playwright; needs the API running and `npx playwright install chromium` first).

Times are entered and shown in the dealer's timezone (`DEALER_TIMEZONE`, default `Australia/Brisbane`) and stored in UTC.

## Senior write-up

**Caching and revalidation.** Booking reads are deliberately not cached in Next. Several staff edit them, and other API clients could too. A Next cache would only be invalidated by writes made through these Server Actions, so staff could see a taken slot as free. Each read is one indexed query, so caching buys little. Service bays are near-static, so they use `"use cache"` + `cacheLife("hours")` + a tag. Each mutation calls `revalidatePath("/bookings", "layout")` and then `redirect()`. Nothing is cached server-side, so that call mainly clears the client router cache (including pages kept alive by `<Activity>`), and the redirect target comes back in the same response, with no reload. The list streams behind `<Suspense>` keyed on `status:page`. Detail and edit opt out of streaming (`instant = false`) so a missing booking returns a real 404.

**Booking calendar.** `/bookings` is a month calendar: whole Monday-to-Sunday weeks, each day's active bookings as chips coloured by status (three, then "+N more"), and a day panel listing everything on that day with a "New booking on this day" link. The panel is a native `popover`, so it needs no JavaScript to open. The paginated list with the status filter moved to `/bookings/list`. Both calendars read Laravel's `GET /api/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD`: every active booking that overlaps those dealer-time days, unpaginated and capped at 42 days (one month grid). The month page loads its grid on the server. The bay and status checkboxes filter what's already loaded, in the browser, so they're instant and survive a month change, but unlike the list's filter they aren't in the URL. Cancelled bookings free their slot, so they only appear in the list.

On New and Edit, staff pick the bay and time on a month calendar plus a day grid (bays × 30-minute slots, 07:00–18:00), which blocks out taken and past slots. The page renders the first day on the server. Other days come from a Next Route Handler (`/api/schedule?date=`) that forwards the request, so the browser still never talks to Laravel. The picker reloads the day on mount, on every day change and after every save attempt, so a slot taken while the form was open shows up next to the 422. It's a convenience: the picker only fills the same `service_bay`, `starts_at` and `ends_at` fields, and Laravel's validation and trigger still decide. The 07:00–18:00 window is a frontend constant, and the API doesn't restrict hours.

**Simultaneous bookings.** The Form Request's overlap check is only for UX (both requests can pass it). The guarantee is a SQLite `BEFORE INSERT/UPDATE` trigger that aborts on an overlapping active booking in the same bay. SQLite runs one write at a time and the trigger runs inside it, so no request can get between the check and the insert. `SaveBooking` turns the abort into the same 422 on `starts_at`. (`lockForUpdate()` compiles to nothing on SQLite.) `ConcurrentBookingTest` releases eight PHP processes at once on one slot and gets one 201 and seven 422s. Without the trigger, it double-booked in 4 of 5 runs. On Postgres this would be an `EXCLUDE USING gist` constraint.

**For 200 dealers, first:** tenancy in the data layer. Add a `dealer_id` on bookings, a `service_bays` table, a dealer resolved from the authenticated user through a global scope and policies, and tests that one dealer can't reach another's data. The overlap constraint and indexes then include `dealer_id`. Move to Postgres too, because one SQLite writer would serialise every dealer's writes. After that come per-dealer timezones and, only if needed, per-dealer cache tags invalidated by Laravel.

## AI usage

> **TODO (candidate):** this section has to be your own account. Below is a factual starting point. Edit it to match what you actually did and reviewed.

- Tools: Claude Code (Claude Opus 5.5) for scaffolding, implementation and tests, plus the docs bundled with Next.js 16.4 (`node_modules/next/dist/docs`) to check APIs that changed recently.
- One place AI got something wrong, and how I fixed it: **TODO**

## What I'd do next

- Authentication and policies; the API is currently open.
- Optimistic locking on edits (an `updated_at` / `If-Match` check), so two staff editing the same booking don't silently overwrite each other.
- Suggest the next free slot in the overlap error.
- A week view, and the calendar's bay and status filters in the URL like the list's.
- Workshop hours from the API (per dealer), so the calendar's 07:00–18:00 window isn't hard-coded.
- CI running Pest, `tsc`, ESLint and Playwright.
