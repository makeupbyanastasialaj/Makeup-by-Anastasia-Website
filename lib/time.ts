import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

// The business operates in one timezone (Settings.timezone). Times are stored
// in the DB as UTC instants; these helpers convert to/from the business tz.

/** UTC instant for a wall-clock time in the given timezone. */
export function localToUtc(
  dateStr: string, // "yyyy-MM-dd"
  minutes: number, // minutes from midnight
  timezone: string,
): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${dateStr}T${hh}:${mm}:00`, timezone);
}

/** UTC instant of local midnight for a date in the given timezone. */
export function localDayStartUtc(dateStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00`, timezone);
}

export function formatTz(date: Date, fmt: string, timezone: string): string {
  return formatInTimeZone(date, timezone, fmt);
}

/** 0=Sunday .. 6=Saturday, evaluated in the business timezone. */
export function dayOfWeekInTz(date: Date, timezone: string): number {
  const iso = Number(formatInTimeZone(date, timezone, "i")); // 1=Mon..7=Sun
  return iso % 7;
}

/** "yyyy-MM-dd" for a UTC instant, in the business timezone. */
export function dateKeyInTz(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

/** Minutes from local midnight for a UTC instant, in the business timezone. */
export function minutesOfDayInTz(date: Date, timezone: string): number {
  const zoned = toZonedTime(date, timezone);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

/** 540 -> "9:00 am" */
export function minutesToLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** "09:00" (24h, for <input type=time>) */
export function minutesToInput(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** "09:00" -> 540 */
export function inputToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 120 -> "2 hr", 45 -> "45 min", 90 -> "1 hr 30 min" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
