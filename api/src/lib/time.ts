import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

// Times are stored as UTC instants; the business operates in Settings.timezone.

export function localToUtc(dateStr: string, minutes: number, timezone: string): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${dateStr}T${hh}:${mm}:00`, timezone);
}

export function localDayStartUtc(dateStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00`, timezone);
}

export function dayOfWeekInTz(date: Date, timezone: string): number {
  const iso = Number(formatInTimeZone(date, timezone, "i")); // 1=Mon..7=Sun
  return iso % 7; // 0=Sun..6=Sat
}

export function dateKeyInTz(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function minutesToLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatTz(date: Date, fmt: string, timezone: string): string {
  return formatInTimeZone(date, timezone, fmt);
}

export { toZonedTime };
