import { app, HttpRequest } from "@azure/functions";
import { getSettings, updateSettings, Settings } from "../lib/repo";
import { hashPassword, verifyPassword } from "../lib/auth";
import { stripeEnabled } from "../lib/stripe";
import { ok, badRequest, unauthorized, isAdmin, parseBody } from "../lib/http";

// GET /api/manage/settings — editable settings (never returns password/secret).
app.http("adminSettingsGet", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "manage/settings",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const s = await getSettings();
    return ok({
      stripeEnabled: stripeEnabled(),
      settings: {
        businessName: s.businessName,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        instagram: s.instagram,
        studioAddress: s.studioAddress,
        currency: s.currency,
        timezone: s.timezone,
        slotIntervalMin: s.slotIntervalMin,
        bufferMin: s.bufferMin,
        minNoticeHours: s.minNoticeHours,
        maxAdvanceDays: s.maxAdvanceDays,
        depositType: s.depositType,
        depositValue: s.depositValue,
      },
    });
  },
});

// POST /api/manage/settings
app.http("adminSettingsSave", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/settings-save",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const s = await parseBody<Partial<Settings>>(request);
    await updateSettings({
      businessName: (s.businessName ?? "").trim() || "Makeup by Anastasia Laj",
      contactEmail: (s.contactEmail ?? "").trim(),
      contactPhone: (s.contactPhone ?? "").trim(),
      instagram: (s.instagram ?? "").trim(),
      studioAddress: (s.studioAddress ?? "").trim(),
      currency: (s.currency ?? "GBP").trim().toUpperCase().slice(0, 3) || "GBP",
      timezone: (s.timezone ?? "Europe/London").trim() || "Europe/London",
      slotIntervalMin: Math.max(5, Math.round(s.slotIntervalMin ?? 30)),
      bufferMin: Math.max(0, Math.round(s.bufferMin ?? 0)),
      minNoticeHours: Math.max(0, Math.round(s.minNoticeHours ?? 0)),
      maxAdvanceDays: Math.max(1, Math.round(s.maxAdvanceDays ?? 90)),
      depositType: s.depositType === "PERCENT" ? "PERCENT" : "FIXED",
      depositValue: Math.max(0, Math.round(s.depositValue ?? 0)),
    });
    return ok({ ok: true });
  },
});

// POST /api/manage/password  { current, next }
app.http("adminPasswordChange", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/password",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { current, next } = await parseBody<{ current?: string; next?: string }>(request);
    const settings = await getSettings();
    if (!(await verifyPassword(current ?? "", settings.adminPasswordHash))) {
      return badRequest("Current password is incorrect.");
    }
    if ((next ?? "").length < 8) return badRequest("New password must be at least 8 characters.");
    await updateSettings({ adminPasswordHash: await hashPassword(next!) });
    return ok({ ok: true });
  },
});
