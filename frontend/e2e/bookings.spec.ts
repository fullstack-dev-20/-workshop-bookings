import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { formatDay, formatMonth } from "../lib/calendar";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api";

/**
 * A random day one to four months out: past the seed data, and spread out
 * so runs don't collide, but only a few clicks away on the calendar.
 */
function freeDay(): string {
  const daysAhead = 30 + Math.floor(Math.random() * 90);
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}

/** "09:00", 30 -> "09:30" */
function shift(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

async function fillBookingForm(page: Page, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    const field = page.getByLabel(label, { exact: true });
    if ((await field.evaluate((el) => el.tagName)) === "SELECT") {
      await field.selectOption(value);
    } else {
      await field.fill(value);
    }
  }
}

/** Creates a booking through the API, skipping the form. Returns its id. */
async function book(request: APIRequestContext, data: Record<string, string | number>): Promise<number> {
  const res = await request.post(`${API_URL}/bookings`, {
    headers: { Accept: "application/json" },
    data: { customer_email: "e2e@example.com", rego: "E2E1", ...data },
  });
  expect(res.status()).toBe(201);

  return (await res.json()).data.id;
}

/** Picks a bay and time on the booking calendar: the first 30-minute slot, then the last. */
async function pickSlot(page: Page, { day, bay, from, to }: { day: string; bay: number; from: string; to: string }) {
  const month = page.locator("#calendar-month");
  for (let i = 0; i < 24 && (await page.locator(`time[datetime="${day}"]`).count()) === 0; i++) {
    const shown = await month.textContent();
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(month).not.toHaveText(shown ?? "");
  }

  await page.locator(`time[datetime="${day}"]`).click();
  await page.getByRole("button", { name: `Bay ${bay}, ${from}–${shift(from, 30)}`, exact: true }).click();
  await page.getByRole("button", { name: `Bay ${bay}, ${shift(to, -30)}–${to}`, exact: true }).click();
}

test("filters and paginates through the URL", async ({ page }) => {
  await page.goto("/bookings/list");
  await page.getByRole("link", { name: "Confirmed", exact: true }).click();

  await expect(page).toHaveURL(/\/bookings\/list\?status=confirmed/);
  await expect(page.getByRole("link", { name: "Confirmed", exact: true })).toHaveAttribute("aria-current", "page");
  for (const badge of await page.locator("tbody td:last-child").allTextContents()) {
    expect(badge).toBe("confirmed");
  }

  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/status=confirmed&page=2/);
  await expect(page.getByText(/^Page 2 of/)).toBeVisible();
});

test("shows Laravel's errors next to the right fields and keeps the input", async ({ page }) => {
  await page.goto("/bookings/new");
  await fillBookingForm(page, {
    "Customer name": "Sam Example",
    "Customer email": "not-an-email",
  });
  await pickSlot(page, { day: freeDay(), bay: 3, from: "09:00", to: "11:00" });
  await page.getByRole("button", { name: "Create booking" }).click();

  await expect(page.locator("#customer_email-error")).toHaveText("The email field must be a valid email address.");
  await expect(page.locator("#rego-error")).toHaveText("The rego field is required.");
  await expect(page.getByLabel("Customer email")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#customer_name-error")).toHaveCount(0);

  // The submitted values survive React's post-action form reset.
  await expect(page.getByLabel("Customer name")).toHaveValue("Sam Example");
  await expect(page.locator('input[name="service_bay"]')).toHaveValue("3");
  await expect(page.getByText(/^Bay 3 · .*, 09:00–11:00$/)).toBeVisible();
});

test("a slot taken while the form is open fails with Laravel's clash message", async ({ page, request }) => {
  const day = freeDay();

  await page.goto("/bookings/new");
  await fillBookingForm(page, {
    "Customer name": "Second Try",
    "Customer email": "second@example.com",
    "Caravan rego": "SEC0ND",
  });
  await pickSlot(page, { day, bay: 2, from: "09:00", to: "11:00" });

  // Someone else takes the slot before this form is submitted.
  const existing = await request.post(`${API_URL}/bookings`, {
    headers: { Accept: "application/json" },
    data: {
      customer_name: "First In",
      customer_email: "first@example.com",
      rego: "FIRST1",
      service_bay: 2,
      starts_at: `${day}T09:00`,
      ends_at: `${day}T11:00`,
    },
  });
  expect(existing.status()).toBe(201);

  await page.getByRole("button", { name: "Create booking" }).click();

  await expect(page.locator("#starts_at-error")).toContainText("Bay 2 is already booked from");
  // The calendar reloads the day after the failed save, so the slot now shows as taken.
  await expect(page.getByTitle("First In, 09:00–11:00")).toBeVisible();

  await request.delete(`${API_URL}/bookings/${(await existing.json()).data.id}`);
});

test("booked slots and earlier months can't be picked", async ({ page, request }) => {
  const day = freeDay();
  const existing = await request.post(`${API_URL}/bookings`, {
    headers: { Accept: "application/json" },
    data: {
      customer_name: "Already Here",
      customer_email: "here@example.com",
      rego: "HERE1",
      service_bay: 1,
      starts_at: `${day}T10:00`,
      ends_at: `${day}T12:00`,
    },
  });
  expect(existing.status()).toBe(201);

  await page.goto("/bookings/new");
  // The calendar opens on today; earlier days can't be chosen.
  await expect(page.getByRole("button", { name: "Previous month" })).toBeDisabled();

  await pickSlot(page, { day, bay: 1, from: "08:00", to: "09:00" });
  await expect(page.getByTitle("Already Here, 10:00–12:00")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bay 1, 10:00–10:30", exact: true })).toHaveCount(0);

  // An end past the booked block doesn't stretch over it: it starts a new selection instead.
  await page.getByRole("button", { name: "Bay 1, 08:00–08:30", exact: true }).click();
  await page.getByRole("button", { name: "Bay 1, 12:00–12:30", exact: true }).click();
  await expect(page.locator('input[name="starts_at"]')).toHaveValue(`${day}T12:00`);
  await expect(page.locator('input[name="ends_at"]')).toHaveValue(`${day}T12:30`);

  await request.delete(`${API_URL}/bookings/${(await existing.json()).data.id}`);
});

test("the calendar shows the month's bookings, filters them and opens a day", async ({ page, request }) => {
  const day = freeDay();
  const run = Date.now().toString(36);
  const ids = await Promise.all([
    book(request, { customer_name: `Pending ${run}`, service_bay: 1, starts_at: `${day}T09:00`, ends_at: `${day}T11:00` }),
    book(request, {
      customer_name: `Confirmed ${run}`,
      service_bay: 2,
      starts_at: `${day}T13:00`,
      ends_at: `${day}T15:00`,
      status: "confirmed",
    }),
  ]);

  await page.goto(`/bookings?month=${day.slice(0, 7)}`);
  const calendar = page.getByRole("region", { name: formatMonth(day.slice(0, 7)) });
  const pending = calendar.getByRole("link", { name: `Pending ${run}, Bay 1, 09:00–11:00, pending` });
  const confirmed = calendar.getByRole("link", { name: `Confirmed ${run}, Bay 2, 13:00–15:00, confirmed` });
  await expect(pending).toBeVisible();
  await expect(confirmed).toBeVisible();

  // The filters work on the loaded month, without a round trip.
  await page.getByRole("checkbox", { name: "Bay 1" }).uncheck();
  await expect(pending).toHaveCount(0);
  await expect(confirmed).toBeVisible();
  await page.getByRole("checkbox", { name: /^Confirmed/ }).uncheck();
  await expect(confirmed).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Bay 1" }).check();
  await page.getByRole("checkbox", { name: /^Confirmed/ }).check();

  // The day's number lists everything on it, and can start a booking there.
  await calendar.getByRole("button", { name: new RegExp(`^${formatDay(day)}, \\d+ bookings$`) }).click();
  const dayPanel = page.getByRole("dialog", { name: formatDay(day) });
  await expect(dayPanel.getByRole("link", { name: `Pending ${run}` })).toContainText("09:00–11:00 · Bay 1 · pending");
  await expect(dayPanel.getByRole("link", { name: `Confirmed ${run}` })).toContainText("13:00–15:00 · Bay 2 · confirmed");
  await dayPanel.getByRole("link", { name: "New booking on this day" }).click();

  await expect(page).toHaveURL(`/bookings/new?date=${day}`);
  await expect(dayPanel).toBeHidden();
  const picker = page.getByRole("group", { name: "Service bay and time" });
  await expect(picker.getByText(formatDay(day), { exact: true })).toBeVisible();
  await expect(picker.getByRole("button", { name: "Bay 1, 09:00–09:30", exact: true })).toHaveCount(0);

  await Promise.all(ids.map((id) => request.delete(`${API_URL}/bookings/${id}`)));
});

test("creating a booking updates the calendar without a full page reload", async ({ page }) => {
  const name = `E2E ${Date.now()}`;
  const day = freeDay();

  await page.goto("/bookings");
  await page.evaluate(() => ((window as unknown as { marker: string }).marker = "still here"));

  await page.getByRole("link", { name: "New booking", exact: true }).click();
  await fillBookingForm(page, {
    "Customer name": name,
    "Customer email": "e2e@example.com",
    "Caravan rego": "e2e 123",
  });
  await pickSlot(page, { day, bay: 4, from: "13:00", to: "15:00" });
  await page.getByRole("button", { name: "Create booking" }).click();

  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("E2E123")).toBeVisible();

  // Back to the booking's month on the calendar, which shows it.
  await page.getByRole("link", { name: `← ${formatMonth(day.slice(0, 7))}` }).click();
  const chip = page.getByRole("link", { name: `${name}, Bay 4, 13:00–15:00, pending` });
  await expect(chip).toBeVisible();

  // A full reload would have wiped this.
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe("still here");

  // Clean up so later runs don't find old test data.
  await chip.click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  await page.goto(`/bookings?month=${day.slice(0, 7)}`);
  await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
});

test("a missing booking is a real 404 with a helpful page", async ({ page }) => {
  const response = await page.goto("/bookings/999999");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Booking not found" })).toBeVisible();
});
