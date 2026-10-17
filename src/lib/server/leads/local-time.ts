import "../server-only.ts";
import { ServerError } from "../errors.ts";

// Calendar days in the business's time zone, turned into UTC instants so they
// can be compared with stored `created_at` text. Uses only the built-in Intl API.
// The zone is an IANA name such as "America/New_York"; the server's own zone
// never decides what "today" means.

export interface LocalDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone: string) => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    } catch {
      throw new ServerError("LEADS_TIME_ZONE", "The business time zone is not a valid IANA time zone name.");
    }
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

// Local wall-clock fields of an instant in a zone.
const localParts = (instant: number, timeZone: string) => {
  const parts: Record<string, number> = {};
  for (const { type, value } of formatterFor(timeZone).formatToParts(instant)) {
    if (type !== "literal") parts[type] = Number(value);
  }
  return parts as { year: number; month: number; day: number; hour: number; minute: number; second: number };
};

// How far the zone's wall clock is ahead of UTC at an instant, in milliseconds.
const offsetAt = (instant: number, timeZone: string) => {
  const seconds = Math.floor(instant / 1000) * 1000;
  const p = localParts(seconds, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - seconds;
};

export const localDateOf = (instant: Date, timeZone: string): LocalDate => {
  const { year, month, day } = localParts(instant.getTime(), timeZone);
  return { year, month, day };
};

// UTC time (ISO text) of local midnight at the start of `date` in `timeZone`.
// Two passes so a daylight-saving change between UTC midnight and local
// midnight is taken into account (23- and 25-hour days).
// Limit: in the rare zones that change clocks exactly at midnight, the start of
// that one day can be off by the size of the change.
export const localDayStartUtc = (date: LocalDate, timeZone: string): string => {
  const wallClock = Date.UTC(date.year, date.month - 1, date.day);
  let instant = wallClock - offsetAt(wallClock, timeZone);
  instant = wallClock - offsetAt(instant, timeZone);
  return new Date(instant).toISOString();
};

// The calendar day after `date` (plain calendar arithmetic, no time zone).
export const nextLocalDate = ({ year, month, day }: LocalDate): LocalDate => {
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
};

// "YYYY-MM-DD" that is a real calendar date, or undefined.
export const parseLocalDate = (text: unknown): LocalDate | undefined => {
  if (typeof text !== "string") return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;
  const [year, month, day] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return undefined;
  }
  return { year, month, day };
};

// Start of today and of this month in the business time zone, as UTC ISO text.
export const todayAndMonthStartUtc = (now: Date, timeZone: string) => {
  const today = localDateOf(now, timeZone);
  return {
    todayStart: localDayStartUtc(today, timeZone),
    monthStart: localDayStartUtc({ ...today, day: 1 }, timeZone),
  };
};
