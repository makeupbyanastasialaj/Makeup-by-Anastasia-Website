import { TableClient, odata } from "@azure/data-tables";

// One Azure Storage account holds all our tables.
function connectionString(): string {
  const c = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!c) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  return c;
}

export const TABLES = {
  Settings: "Settings",
  Services: "Services",
  Zones: "Zones",
  Bookings: "Bookings",
  AvailabilityRules: "AvailabilityRules",
  BlockedDates: "BlockedDates",
} as const;

const clients = new Map<string, TableClient>();
const ensured = new Set<string>();

function client(name: string): TableClient {
  let c = clients.get(name);
  if (!c) {
    c = TableClient.fromConnectionString(connectionString(), name, {
      allowInsecureConnection: true, // needed for the local emulator; ignored over https
    });
    clients.set(name, c);
  }
  return c;
}

/** Get a table client, creating the table on first use (idempotent). */
export async function table(name: string): Promise<TableClient> {
  const c = client(name);
  if (!ensured.has(name)) {
    try {
      await c.createTable();
    } catch (err: unknown) {
      const code = (err as { statusCode?: number })?.statusCode;
      if (code !== 409) throw err; // 409 = already exists
    }
    ensured.add(name);
  }
  return c;
}

/** Ensure every table exists (used by the seed/setup path). */
export async function ensureAllTables(): Promise<void> {
  await Promise.all(Object.values(TABLES).map((t) => table(t)));
}

export { odata };
