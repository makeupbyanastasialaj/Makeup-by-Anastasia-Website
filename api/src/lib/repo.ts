import { TableEntity } from "@azure/data-tables";
import { table, TABLES, odata } from "./tables";
import { newId, newPublicId } from "./ids";

// ─── Domain types ───────────────────────────────────────────────────────────
export interface Settings {
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  instagram: string;
  currency: string;
  timezone: string;
  studioAddress: string;
  slotIntervalMin: number;
  bufferMin: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  depositType: string; // FIXED | PERCENT
  depositValue: number;
  // Branding & homepage content — editable from the manage panel
  logoDataUrl: string; // small resized data URL, or "" to use the text wordmark
  colorBackground: string; // hex, e.g. #e2dbd0
  colorText: string; // hex
  colorAccent: string; // hex
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  fontTheme: string; // id of a curated font pairing (see lib/fonts on the frontend)
  logoImageUrl: string; // served path to the logo blob, or "" (falls back to logoDataUrl/default)
  aboutImageUrl: string; // served path to the about photo blob, or ""
  aboutTitle: string;
  aboutText: string;
  bandText: string; // single line shown in the coloured mid-page band ("" hides it)
  galleryUrls: string; // JSON array of served image paths for the Instagram showcase
  adminPasswordHash: string;
  totpSecret: string;
  totpEnabled: boolean;
  setupComplete: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  depositCents: number;
  active: boolean;
  sortOrder: number;
}

export interface Zone {
  id: string;
  name: string;
  feeCents: number;
  active: boolean;
  sortOrder: number;
}

export interface Booking {
  id: string;
  publicId: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  locationType: string;
  zoneId: string;
  zoneName: string;
  address: string;
  startAt: Date;
  endAt: Date;
  status: string;
  notes: string;
  adminNotes: string;
  priceCents: number;
  travelFeeCents: number;
  depositCents: number;
  totalCents: number;
  currency: string;
  depositStatus: string;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  createdAt: Date;
}

export interface AvailabilityRule {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  active: boolean;
}

export interface BlockedDate {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
}

function strip<T extends object>(e: T): Omit<T, "partitionKey" | "rowKey" | "etag" | "timestamp"> {
  const { partitionKey, rowKey, etag, timestamp, ...rest } = e as Record<string, unknown>;
  void partitionKey; void rowKey; void etag; void timestamp;
  return rest as Omit<T, "partitionKey" | "rowKey" | "etag" | "timestamp">;
}

// ─── Settings (singleton) ─────────────────────────────────────────────────────
const SETTINGS_PK = "settings";
const SETTINGS_RK = "singleton";

export const DEFAULT_SETTINGS: Settings = {
  businessName: "Makeup by Anastasia Laj",
  contactEmail: "",
  contactPhone: "",
  instagram: "",
  currency: "GBP",
  timezone: "Europe/London",
  studioAddress: "",
  slotIntervalMin: 30,
  bufferMin: 15,
  minNoticeHours: 24,
  maxAdvanceDays: 90,
  depositType: "FIXED",
  depositValue: 2000,
  logoDataUrl: "",
  colorBackground: "#e2dbd0",
  colorText: "#1c1a17",
  colorAccent: "#7c6c56",
  heroEyebrow: "Bridal & Occasion Makeup Artistry",
  heroTitle: "Effortless elegance,",
  heroHighlight: "beautifully you",
  heroSubtitle:
    "Timeless, long-wearing makeup for weddings, events and every occasion worth remembering — in my studio, or travelling to you.",
  fontTheme: "classic",
  logoImageUrl: "",
  aboutImageUrl: "",
  aboutTitle: "About me",
  aboutText: "",
  bandText: "Timeless, camera-ready makeup — thoughtfully designed around you.",
  galleryUrls: "[]",
  adminPasswordHash: "",
  totpSecret: "",
  totpEnabled: false,
  setupComplete: false,
};

export async function getSettings(): Promise<Settings> {
  const t = await table(TABLES.Settings);
  try {
    const e = await t.getEntity(SETTINGS_PK, SETTINGS_RK);
    return { ...DEFAULT_SETTINGS, ...strip(e) } as Settings;
  } catch (err: unknown) {
    if ((err as { statusCode?: number })?.statusCode === 404) {
      // The table or the singleton row is missing (e.g. deleted out-of-band).
      // Make sure the table exists before (re)creating the row, so the app
      // self-heals instead of returning 500s on every request.
      try {
        await t.createTable();
      } catch (createErr: unknown) {
        // 409 = table already exists or is mid-recreation; anything else is real.
        if ((createErr as { statusCode?: number })?.statusCode !== 409) throw createErr;
      }
      await t.createEntity({
        partitionKey: SETTINGS_PK,
        rowKey: SETTINGS_RK,
        ...DEFAULT_SETTINGS,
      });
      return { ...DEFAULT_SETTINGS };
    }
    throw err;
  }
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const t = await table(TABLES.Settings);
  await getSettings(); // ensure the entity exists
  await t.updateEntity(
    { partitionKey: SETTINGS_PK, rowKey: SETTINGS_RK, ...patch } as TableEntity,
    "Merge",
  );
}

// ─── Services ─────────────────────────────────────────────────────────────
const SERVICE_PK = "service";

export async function listServices(activeOnly = false): Promise<Service[]> {
  const t = await table(TABLES.Services);
  const all = await collect(t.listEntities());
  const items = all.map((e) => strip(e) as unknown as Service);
  const filtered = activeOnly ? items.filter((s) => s.active) : items;
  return filtered.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function getService(id: string): Promise<Service | null> {
  const t = await table(TABLES.Services);
  try {
    return strip(await t.getEntity(SERVICE_PK, id)) as unknown as Service;
  } catch {
    return null;
  }
}

export async function upsertService(s: Service): Promise<Service> {
  const t = await table(TABLES.Services);
  const id = s.id || newId();
  await t.upsertEntity({ partitionKey: SERVICE_PK, rowKey: id, ...s, id }, "Replace");
  return { ...s, id };
}

export async function deleteService(id: string): Promise<void> {
  const t = await table(TABLES.Services);
  await t.deleteEntity(SERVICE_PK, id);
}

// ─── Zones ────────────────────────────────────────────────────────────────
const ZONE_PK = "zone";

export async function listZones(activeOnly = false): Promise<Zone[]> {
  const t = await table(TABLES.Zones);
  const all = await collect(t.listEntities());
  const items = all.map((e) => strip(e) as unknown as Zone);
  const filtered = activeOnly ? items.filter((z) => z.active) : items;
  return filtered.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function getZone(id: string): Promise<Zone | null> {
  const t = await table(TABLES.Zones);
  try {
    return strip(await t.getEntity(ZONE_PK, id)) as unknown as Zone;
  } catch {
    return null;
  }
}

export async function upsertZone(z: Zone): Promise<Zone> {
  const t = await table(TABLES.Zones);
  const id = z.id || newId();
  await t.upsertEntity({ partitionKey: ZONE_PK, rowKey: id, ...z, id }, "Replace");
  return { ...z, id };
}

export async function deleteZone(id: string): Promise<void> {
  const t = await table(TABLES.Zones);
  await t.deleteEntity(ZONE_PK, id);
}

// ─── Bookings ─────────────────────────────────────────────────────────────
const BOOKING_PK = "booking";

export async function listBookings(opts?: {
  from?: Date;
  to?: Date;
  statuses?: string[];
}): Promise<Booking[]> {
  const t = await table(TABLES.Bookings);
  let filter: string | undefined;
  if (opts?.from && opts?.to) {
    filter = odata`PartitionKey eq ${BOOKING_PK} and startAt ge ${opts.from} and startAt lt ${opts.to}`;
  }
  const all = await collect(t.listEntities({ queryOptions: filter ? { filter } : undefined }));
  let items = all.map((e) => strip(e) as unknown as Booking);
  if (opts?.statuses) items = items.filter((b) => opts.statuses!.includes(b.status));
  return items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export async function getBooking(id: string): Promise<Booking | null> {
  const t = await table(TABLES.Bookings);
  try {
    return strip(await t.getEntity(BOOKING_PK, id)) as unknown as Booking;
  } catch {
    return null;
  }
}

export async function getBookingByPublicId(publicId: string): Promise<Booking | null> {
  const t = await table(TABLES.Bookings);
  const filter = odata`PartitionKey eq ${BOOKING_PK} and publicId eq ${publicId}`;
  const rows = await collect(t.listEntities({ queryOptions: { filter } }));
  if (rows.length === 0) return null;
  return strip(rows[0]) as unknown as Booking;
}

export async function createBooking(
  b: Omit<Booking, "id" | "publicId" | "createdAt">,
): Promise<Booking> {
  const t = await table(TABLES.Bookings);
  const id = newId();
  const publicId = newPublicId();
  const createdAt = new Date();
  const full: Booking = { ...b, id, publicId, createdAt };
  await t.createEntity({ partitionKey: BOOKING_PK, rowKey: id, ...full });
  return full;
}

export async function updateBooking(id: string, patch: Partial<Booking>): Promise<void> {
  const t = await table(TABLES.Bookings);
  await t.updateEntity(
    { partitionKey: BOOKING_PK, rowKey: id, ...patch } as TableEntity,
    "Merge",
  );
}

// ─── Availability rules ───────────────────────────────────────────────────────
const RULE_PK = "rule";

export async function listRules(): Promise<AvailabilityRule[]> {
  const t = await table(TABLES.AvailabilityRules);
  const all = await collect(t.listEntities());
  return all.map((e) => strip(e) as unknown as AvailabilityRule);
}

export async function replaceRules(rules: Omit<AvailabilityRule, "id">[]): Promise<void> {
  const t = await table(TABLES.AvailabilityRules);
  const existing = await collect(t.listEntities());
  await Promise.all(
    existing.map((e) =>
      t.deleteEntity((e as { partitionKey: string }).partitionKey, (e as { rowKey: string }).rowKey),
    ),
  );
  await Promise.all(
    rules.map((r) => {
      const id = newId();
      return t.createEntity({ partitionKey: RULE_PK, rowKey: id, id, ...r });
    }),
  );
}

// ─── Blocked dates ────────────────────────────────────────────────────────────
const BLOCK_PK = "block";

export async function listBlocked(): Promise<BlockedDate[]> {
  const t = await table(TABLES.BlockedDates);
  const all = await collect(t.listEntities());
  return all
    .map((e) => strip(e) as unknown as BlockedDate)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export async function addBlocked(b: Omit<BlockedDate, "id">): Promise<void> {
  const t = await table(TABLES.BlockedDates);
  const id = newId();
  await t.createEntity({ partitionKey: BLOCK_PK, rowKey: id, id, ...b });
}

export async function deleteBlocked(id: string): Promise<void> {
  const t = await table(TABLES.BlockedDates);
  await t.deleteEntity(BLOCK_PK, id);
}
