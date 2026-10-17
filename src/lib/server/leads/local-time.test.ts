import { test } from "node:test";
import assert from "node:assert/strict";
import { ServerError } from "../errors.ts";
import { localDayStartUtc, nextLocalDate, parseLocalDate, todayAndMonthStartUtc } from "./local-time.ts";

const NY = "America/New_York";

test("local midnight in New York on normal winter and summer days", () => {
  assert.equal(localDayStartUtc({ year: 2026, month: 1, day: 15 }, NY), "2026-01-15T05:00:00.000Z"); // EST, UTC-5
  assert.equal(localDayStartUtc({ year: 2026, month: 7, day: 4 }, NY), "2026-07-04T04:00:00.000Z"); // EDT, UTC-4
});

test("daylight-saving change days in 2026 (23- and 25-hour days)", () => {
  // Clocks go forward on 8 March 2026 and back on 1 November 2026 (at 02:00 local).
  assert.equal(localDayStartUtc({ year: 2026, month: 3, day: 8 }, NY), "2026-03-08T05:00:00.000Z");
  assert.equal(localDayStartUtc({ year: 2026, month: 3, day: 9 }, NY), "2026-03-09T04:00:00.000Z");
  assert.equal(localDayStartUtc({ year: 2026, month: 11, day: 1 }, NY), "2026-11-01T04:00:00.000Z");
  assert.equal(localDayStartUtc({ year: 2026, month: 11, day: 2 }, NY), "2026-11-02T05:00:00.000Z");
});

test("UTC zone and a zone east of UTC", () => {
  assert.equal(localDayStartUtc({ year: 2026, month: 10, day: 16 }, "UTC"), "2026-10-16T00:00:00.000Z");
  assert.equal(localDayStartUtc({ year: 2026, month: 10, day: 16 }, "Asia/Tokyo"), "2026-10-15T15:00:00.000Z");
});

test("today and this month follow the business zone, not UTC", () => {
  // 03:30 UTC on 1 Nov is still 31 October (23:30) in New York.
  const now = new Date("2026-11-01T03:30:00.000Z");
  assert.deepEqual(todayAndMonthStartUtc(now, NY), {
    todayStart: "2026-10-31T04:00:00.000Z",
    monthStart: "2026-10-01T04:00:00.000Z",
  });
  assert.deepEqual(todayAndMonthStartUtc(now, "UTC"), {
    todayStart: "2026-11-01T00:00:00.000Z",
    monthStart: "2026-11-01T00:00:00.000Z",
  });
  // New Year: 1 January 00:30 in New York.
  assert.deepEqual(todayAndMonthStartUtc(new Date("2027-01-01T05:30:00.000Z"), NY), {
    todayStart: "2027-01-01T05:00:00.000Z",
    monthStart: "2027-01-01T05:00:00.000Z",
  });
});

test("calendar helpers: next day across month/year ends and strict date parsing", () => {
  assert.deepEqual(nextLocalDate({ year: 2026, month: 12, day: 31 }), { year: 2027, month: 1, day: 1 });
  assert.deepEqual(nextLocalDate({ year: 2028, month: 2, day: 28 }), { year: 2028, month: 2, day: 29 });
  assert.deepEqual(parseLocalDate("2026-10-16"), { year: 2026, month: 10, day: 16 });
  for (const bad of ["2026-02-30", "2026-13-01", "2026-1-5", "16/10/2026", "", 20261016, undefined]) {
    assert.equal(parseLocalDate(bad), undefined, String(bad));
  }
});

test("an unknown time zone is rejected with a constant code", () => {
  assert.throws(
    () => localDayStartUtc({ year: 2026, month: 1, day: 1 }, "Mars/Olympus"),
    (error) => error instanceof ServerError && error.code === "LEADS_TIME_ZONE",
  );
});
