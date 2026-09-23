import { getSettings, getService, listRules, listBookings, listBlocked, Settings, Service } from "./repo";
import { BLOCKING_STATUSES } from "./constants";
import { dayOfWeekInTz, localDayStartUtc, localToUtc, minutesToLabel } from "./time";

export interface Slot {
  minutes: number;
  label: string;
  startISO: string;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

async function computeSlots(service: Service, dateStr: string, settings: Settings): Promise<Slot[]> {
  const tz = settings.timezone;
  const dayStartUtc = localDayStartUtc(dateStr, tz);
  const dow = dayOfWeekInTz(dayStartUtc, tz);

  const rules = (await listRules())
    .filter((r) => r.active && r.dayOfWeek === dow)
    .sort((a, b) => a.startMin - b.startMin);
  if (rules.length === 0) return [];

  const windowStart = new Date(dayStartUtc.getTime() - 24 * 3600 * 1000);
  const windowEnd = new Date(dayStartUtc.getTime() + 48 * 3600 * 1000);

  const [allBookings, blocks] = await Promise.all([
    listBookings({ from: windowStart, to: windowEnd, statuses: BLOCKING_STATUSES as unknown as string[] }),
    listBlocked(),
  ]);
  const bookings = allBookings.map((b) => ({
    start: new Date(b.startAt).getTime(),
    end: new Date(b.endAt).getTime(),
  }));
  const blocked = blocks.map((b) => ({
    start: new Date(b.startAt).getTime(),
    end: new Date(b.endAt).getTime(),
  }));

  const bufferMs = settings.bufferMin * 60 * 1000;
  const now = Date.now();
  const minStart = now + settings.minNoticeHours * 3600 * 1000;
  const maxStart = now + settings.maxAdvanceDays * 24 * 3600 * 1000;
  const durationMs = service.durationMin * 60 * 1000;

  const slots: Slot[] = [];
  const seen = new Set<number>();

  for (const rule of rules) {
    for (let m = rule.startMin; m + service.durationMin <= rule.endMin; m += settings.slotIntervalMin) {
      if (seen.has(m)) continue;
      const start = localToUtc(dateStr, m, tz);
      const startMs = start.getTime();
      const endMs = startMs + durationMs;
      if (startMs < minStart || startMs > maxStart) continue;
      if (blocked.some((b) => overlaps(startMs, endMs, b.start, b.end))) continue;
      if (bookings.some((b) => overlaps(startMs, endMs, b.start - bufferMs, b.end + bufferMs))) continue;
      seen.add(m);
      slots.push({ minutes: m, label: minutesToLabel(m), startISO: start.toISOString() });
    }
  }
  return slots.sort((a, b) => a.minutes - b.minutes);
}

export async function getDaySlots(serviceId: string, dateStr: string): Promise<Slot[]> {
  const service = await getService(serviceId);
  if (!service || !service.active) return [];
  const settings = await getSettings();
  return computeSlots(service, dateStr, settings);
}

export async function isSlotAvailable(serviceId: string, startAt: Date, dateStr: string): Promise<boolean> {
  const slots = await getDaySlots(serviceId, dateStr);
  const target = startAt.toISOString();
  return slots.some((s) => s.startISO === target);
}

export async function bookableWeekdays(): Promise<number[]> {
  const rules = await listRules();
  return [...new Set(rules.filter((r) => r.active).map((r) => r.dayOfWeek))];
}
