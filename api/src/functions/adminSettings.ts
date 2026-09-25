import { app, HttpRequest } from "@azure/functions";
import { getSettings, updateSettings, Settings, DEFAULT_SETTINGS } from "../lib/repo";
import { hashPassword, verifyPassword } from "../lib/auth";
import { stripeEnabled } from "../lib/stripe";
import { ok, badRequest, unauthorized, isAdmin, parseBody } from "../lib/http";

const HEX = /^#[0-9a-fA-F]{6}$/;
function hex(v: unknown, fallback: string): string {
  return typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : fallback;
}
function text(v: unknown, max: number, fallback: string): string {
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t.slice(0, max) : fallback;
}

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
        logoDataUrl: s.logoDataUrl,
        colorBackground: s.colorBackground,
        colorText: s.colorText,
        colorAccent: s.colorAccent,
        heroEyebrow: s.heroEyebrow,
        heroTitle: s.heroTitle,
        heroHighlight: s.heroHighlight,
        heroSubtitle: s.heroSubtitle,
        fontTheme: s.fontTheme,
        logoImageUrl: s.logoImageUrl,
        aboutImageUrl: s.aboutImageUrl,
        aboutTitle: s.aboutTitle,
        aboutText: s.aboutText,
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

    // Logo: accept a small image data URL, an empty string (removes it), or
    // reject anything too large for Table Storage (the client resizes first).
    const rawLogo = typeof s.logoDataUrl === "string" ? s.logoDataUrl.trim() : "";
    let logoDataUrl = "";
    if (rawLogo !== "") {
      if (/^data:image\/(png|jpeg|webp|gif);base64,/.test(rawLogo) && rawLogo.length <= 30000) {
        logoDataUrl = rawLogo;
      } else {
        return badRequest(
          "That logo image is too large to store. Please choose a smaller or simpler image.",
        );
      }
    }

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
      logoDataUrl,
      colorBackground: hex(s.colorBackground, DEFAULT_SETTINGS.colorBackground),
      colorText: hex(s.colorText, DEFAULT_SETTINGS.colorText),
      colorAccent: hex(s.colorAccent, DEFAULT_SETTINGS.colorAccent),
      heroEyebrow: text(s.heroEyebrow, 80, DEFAULT_SETTINGS.heroEyebrow),
      heroTitle: text(s.heroTitle, 120, DEFAULT_SETTINGS.heroTitle),
      heroHighlight: text(s.heroHighlight, 120, DEFAULT_SETTINGS.heroHighlight),
      heroSubtitle: text(s.heroSubtitle, 400, DEFAULT_SETTINGS.heroSubtitle),
      fontTheme: typeof s.fontTheme === "string" && /^[a-z]{1,20}$/.test(s.fontTheme) ? s.fontTheme : "classic",
      aboutTitle: text(s.aboutTitle, 80, DEFAULT_SETTINGS.aboutTitle),
      aboutText: text(s.aboutText, 1500, ""),
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
