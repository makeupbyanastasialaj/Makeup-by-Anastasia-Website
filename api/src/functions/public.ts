import { app, HttpRequest } from "@azure/functions";
import { getSettings, listServices, listZones, getBookingByPublicId, getBooking, updateBooking } from "../lib/repo";
import { getDaySlots, bookableWeekdays } from "../lib/availability";
import { createBookingRequest } from "../lib/bookingFlow";
import { stripeEnabled, getStripe } from "../lib/stripe";
import { dateKeyInTz } from "../lib/time";
import { DepositStatus } from "../lib/constants";
import { ok, badRequest, json, parseBody } from "../lib/http";
import type Stripe from "stripe";

function publicSettings(s: Awaited<ReturnType<typeof getSettings>>) {
  return {
    businessName: s.businessName,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    instagram: s.instagram,
    currency: s.currency,
    timezone: s.timezone,
    studioAddress: s.studioAddress,
    depositType: s.depositType,
    depositValue: s.depositValue,
    minNoticeHours: s.minNoticeHours,
    maxAdvanceDays: s.maxAdvanceDays,
  };
}

// GET /api/diag — temporary diagnostic to find why admin endpoints fail.
app.http("diag", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "diag",
  handler: async () => {
    const out: Record<string, unknown> = {
      node: process.version,
      hasStorage: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      authSecretLen: (process.env.AUTH_SECRET || "").length,
    };
    try {
      const s = await getSettings();
      out.setupComplete = s.setupComplete;
      out.totpEnabled = s.totpEnabled;
    } catch (e) {
      out.getSettingsError = e instanceof Error ? e.message : String(e);
    }
    try {
      const auth = await import("../lib/auth");
      const secret = auth.generateTotpSecret();
      const qr = await auth.totpQrDataUrl(secret, "test", "Makeup by Anastasia Laj");
      out.totpOk = true;
      out.qrLen = qr.length;
    } catch (e) {
      out.totpError = e instanceof Error ? e.message : String(e);
    }
    // Test-load each function module to see which one fails to register.
    const mods = ["auth", "adminBookings", "adminCatalog", "adminAvailability", "adminSettings"];
    const modStatus: Record<string, string> = {};
    for (const m of mods) {
      try {
        await import(`./${m}`);
        modStatus[m] = "ok";
      } catch (e) {
        modStatus[m] = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      }
    }
    out.modules = modStatus;
    return ok(out);
  },
});

// GET /api/public — everything the homepage & booking wizard need.
app.http("publicBundle", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "public",
  handler: async () => {
    const [settings, services, zones, weekdays] = await Promise.all([
      getSettings(),
      listServices(true),
      listZones(true),
      bookableWeekdays(),
    ]);
    return ok({
      settings: publicSettings(settings),
      services,
      zones,
      depositsEnabled: stripeEnabled(),
      bookableWeekdays: weekdays,
      todayStr: dateKeyInTz(new Date(), settings.timezone),
    });
  },
});

// GET /api/availability?serviceId=&date=YYYY-MM-DD
app.http("availability", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "availability",
  handler: async (request: HttpRequest) => {
    const serviceId = request.query.get("serviceId");
    const date = request.query.get("date");
    if (!serviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return badRequest("serviceId and date (YYYY-MM-DD) are required");
    }
    const slots = await getDaySlots(serviceId, date);
    return ok({ slots });
  },
});

// POST /api/bookings — create a booking request.
app.http("createBooking", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "bookings",
  handler: async (request: HttpRequest) => {
    const body = await parseBody<unknown>(request);
    const result = await createBookingRequest(body);
    if (!result.ok) return badRequest(result.error);
    return ok({ ok: true, checkoutUrl: result.checkoutUrl, publicId: result.booking.publicId });
  },
});

// GET /api/bookings/{publicId} — public status lookup.
app.http("bookingStatus", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "bookings/{publicId}",
  handler: async (request: HttpRequest) => {
    const publicId = request.params.publicId;
    const b = await getBookingByPublicId(publicId);
    if (!b) return json(404, { error: "Not found" });
    const settings = await getSettings();
    return ok({
      publicId: b.publicId,
      serviceName: b.serviceName,
      startAt: b.startAt,
      locationType: b.locationType,
      zoneName: b.zoneName,
      address: b.address,
      status: b.status,
      totalCents: b.totalCents,
      depositCents: b.depositCents,
      depositStatus: b.depositStatus,
      currency: b.currency,
      timezone: settings.timezone,
      contactPhone: settings.contactPhone,
    });
  },
});

// POST /api/stripe-webhook — mark deposits paid.
app.http("stripeWebhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "stripe-webhook",
  handler: async (request: HttpRequest) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !webhookSecret) return json(400, { error: "Stripe not configured" });

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");
    if (!sig) return json(400, { error: "Missing signature" });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return json(400, { error: "Invalid signature" });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      if (bookingId && session.payment_status === "paid") {
        const existing = await getBooking(bookingId);
        if (existing) {
          await updateBooking(bookingId, {
            depositStatus: DepositStatus.PAID,
            stripeSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent?.id ?? ""),
          });
        }
      }
    }
    return ok({ received: true });
  },
});
