import { app, HttpRequest } from "@azure/functions";
import {
  listServices,
  getService,
  upsertService,
  deleteService,
  listZones,
  getZone,
  upsertZone,
  deleteZone,
  listBookings,
  Service,
  Zone,
} from "../lib/repo";
import { ok, badRequest, unauthorized, isAdmin, parseBody } from "../lib/http";

// ─── Services ─────────────────────────────────────────────────────────────
app.http("adminServicesList", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "manage/services",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    return ok({ services: await listServices(false) });
  },
});

app.http("adminServiceSave", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/service-save",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const s = await parseBody<Partial<Service>>(request);
    if (!s.name?.trim()) return badRequest("Name is required.");
    if (!s.durationMin || s.durationMin <= 0) return badRequest("Duration must be greater than 0.");
    if ((s.priceCents ?? 0) < 0) return badRequest("Price can't be negative.");
    const saved = await upsertService({
      id: s.id ?? "",
      name: s.name.trim(),
      description: (s.description ?? "").trim(),
      durationMin: Math.round(s.durationMin),
      priceCents: Math.round(s.priceCents ?? 0),
      depositCents: Math.max(0, Math.round(s.depositCents ?? 0)),
      active: s.active ?? true,
      sortOrder: s.sortOrder ?? 0,
    });
    return ok({ ok: true, service: saved });
  },
});

app.http("adminServiceDelete", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/service-delete",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { id } = await parseBody<{ id?: string }>(request);
    if (!id) return badRequest("Invalid request.");
    const service = await getService(id);
    if (!service) return badRequest("Service not found.");
    const bookings = await listBookings();
    if (bookings.some((b) => b.serviceId === id)) {
      await upsertService({ ...service, active: false });
      return badRequest("This service has bookings, so it was archived (hidden) instead of deleted.");
    }
    await deleteService(id);
    return ok({ ok: true });
  },
});

// ─── Zones ────────────────────────────────────────────────────────────────
app.http("adminZonesList", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "manage/zones",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    return ok({ zones: await listZones(false) });
  },
});

app.http("adminZoneSave", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/zone-save",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const z = await parseBody<Partial<Zone>>(request);
    if (!z.name?.trim()) return badRequest("Name is required.");
    const saved = await upsertZone({
      id: z.id ?? "",
      name: z.name.trim(),
      feeCents: Math.max(0, Math.round(z.feeCents ?? 0)),
      active: z.active ?? true,
      sortOrder: z.sortOrder ?? 0,
    });
    return ok({ ok: true, zone: saved });
  },
});

app.http("adminZoneDelete", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/zone-delete",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { id } = await parseBody<{ id?: string }>(request);
    if (!id) return badRequest("Invalid request.");
    const zone = await getZone(id);
    if (!zone) return badRequest("Zone not found.");
    const bookings = await listBookings();
    if (bookings.some((b) => b.zoneId === id)) {
      await upsertZone({ ...zone, active: false });
      return badRequest("This zone has bookings, so it was archived instead of deleted.");
    }
    await deleteZone(id);
    return ok({ ok: true });
  },
});
