import { app, HttpRequest } from "@azure/functions";
import { getSettings, listRules, replaceRules, listBlocked, addBlocked, deleteBlocked } from "../lib/repo";
import { formatTz } from "../lib/time";
import { ok, badRequest, unauthorized, isAdmin, parseBody } from "../lib/http";

// GET /api/manage/availability
app.http("adminAvailabilityGet", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "manage/availability",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const settings = await getSettings();
    const tz = settings.timezone;
    const [rules, blockedRaw] = await Promise.all([listRules(), listBlocked()]);
    const blocked = blockedRaw.map((b) => {
      const startLabel = formatTz(new Date(b.startAt), "d MMM yyyy", tz);
      const lastDay = new Date(new Date(b.endAt).getTime() - 24 * 3600 * 1000);
      const endLabel = formatTz(lastDay, "d MMM yyyy", tz);
      return {
        id: b.id,
        label: startLabel === endLabel ? startLabel : `${startLabel} → ${endLabel}`,
        reason: b.reason,
      };
    });
    return ok({
      timezone: tz,
      rules: rules.map((r) => ({ dayOfWeek: r.dayOfWeek, startMin: r.startMin, endMin: r.endMin, active: r.active })),
      blocked,
    });
  },
});

// POST /api/manage/availability-rules  { rules: [{dayOfWeek,startMin,endMin}] }
app.http("adminAvailabilityRules", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/availability-rules",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { rules } = await parseBody<{ rules?: { dayOfWeek: number; startMin: number; endMin: number }[] }>(request);
    if (!Array.isArray(rules)) return badRequest("Invalid request.");
    for (const r of rules) {
      if (r.endMin <= r.startMin) return badRequest("Each shift's end time must be after its start.");
    }
    await replaceRules(rules.map((r) => ({ ...r, active: true })));
    return ok({ ok: true });
  },
});

// POST /api/manage/availability-block  { startISO, endISO, reason }
app.http("adminAvailabilityBlock", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/availability-block",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { startISO, endISO, reason } = await parseBody<{ startISO?: string; endISO?: string; reason?: string }>(request);
    const start = new Date(startISO ?? "");
    const end = new Date(endISO ?? "");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return badRequest("Invalid dates.");
    if (end <= start) return badRequest("End must be after start.");
    await addBlocked({ startAt: start, endAt: end, reason: (reason ?? "").trim().slice(0, 200) });
    return ok({ ok: true });
  },
});

// POST /api/manage/availability-unblock  { id }
app.http("adminAvailabilityUnblock", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/availability-unblock",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { id } = await parseBody<{ id?: string }>(request);
    if (!id) return badRequest("Invalid request.");
    await deleteBlocked(id);
    return ok({ ok: true });
  },
});
