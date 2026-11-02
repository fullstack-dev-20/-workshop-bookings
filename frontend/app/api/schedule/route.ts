import type { NextRequest } from "next/server";
import { getSchedule } from "@/lib/bookings";
import { isDay } from "@/lib/calendar";

/**
 * The booking calendar's source when staff move to another day. The browser
 * can't call Laravel directly (see lib/api.ts), so this passes the request on.
 * Reading the query string keeps it dynamic, and getSchedule isn't cached.
 */
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!isDay(date)) {
    return Response.json({ message: "Expected ?date=YYYY-MM-DD." }, { status: 400 });
  }

  try {
    return Response.json(await getSchedule(date));
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Couldn't load the schedule." }, { status: 502 });
  }
}
