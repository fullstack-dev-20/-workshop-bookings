import "server-only";

// Only the Next.js server talks to Laravel (from Server Components and
// Server Actions), so the API URL never reaches the browser and there's
// no CORS to configure.
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api";

/** An API response the caller didn't expect. Surfaces in error.tsx. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`Bookings API responded ${status} for ${path}`);
    this.name = "ApiError";
  }
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  // No cache options: with Cache Components, fetch is uncached unless the
  // caller is inside "use cache", which is what live booking data needs.
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}
