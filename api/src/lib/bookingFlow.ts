import { z } from "zod";
import { getSettings, getService, getZone, createBooking, Booking } from "./repo";
import { isSlotAvailable } from "./availability";
import { resolveDepositCents } from "./money";
import { createDepositCheckoutSession, stripeEnabled } from "./stripe";
import { BookingStatus, DepositStatus, LocationType } from "./constants";
import { dateKeyInTz } from "./time";

export const bookingInputSchema = z.object({
  serviceId: z.string().min(1),
  startISO: z.string(),
  locationType: z.enum([LocationType.STUDIO, LocationType.MOBILE]),
  zoneId: z.string().optional().nullable(),
  address: z.string().max(500).optional().default(""),
  customerName: z.string().trim().min(1, "Please enter your name").max(120),
  customerEmail: z.string().trim().email("Please enter a valid email").max(200),
  customerPhone: z.string().trim().min(5, "Please enter a phone number").max(40),
  notes: z.string().max(1000).optional().default(""),
});

export type CreateResult =
  | { ok: true; booking: Booking; checkoutUrl: string | null }
  | { ok: false; error: string };

export async function createBookingRequest(raw: unknown): Promise<CreateResult> {
  const parsed = bookingInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }
  const input = parsed.data;
  const settings = await getSettings();

  const service = await getService(input.serviceId);
  if (!service || !service.active) {
    return { ok: false, error: "That service is no longer available." };
  }

  let travelFeeCents = 0;
  let zoneId = "";
  let zoneName = "";
  let address = "";
  if (input.locationType === LocationType.MOBILE) {
    if (!input.zoneId) return { ok: false, error: "Please choose your area for a mobile booking." };
    const zone = await getZone(input.zoneId);
    if (!zone || !zone.active) return { ok: false, error: "That travel area is no longer available." };
    travelFeeCents = zone.feeCents;
    zoneId = zone.id;
    zoneName = zone.name;
    address = (input.address ?? "").trim();
    if (!address) return { ok: false, error: "Please enter the address we're travelling to." };
  }

  const startAt = new Date(input.startISO);
  if (Number.isNaN(startAt.getTime())) return { ok: false, error: "Invalid time selected." };
  const dateStr = dateKeyInTz(startAt, settings.timezone);
  if (!(await isSlotAvailable(service.id, startAt, dateStr))) {
    return { ok: false, error: "Sorry, that time was just taken. Please pick another slot." };
  }
  const endAt = new Date(startAt.getTime() + service.durationMin * 60 * 1000);

  const priceCents = service.priceCents;
  const totalCents = priceCents + travelFeeCents;
  let depositCents = resolveDepositCents({
    serviceDepositCents: service.depositCents,
    totalCents,
    defaultType: settings.depositType,
    defaultValue: settings.depositValue,
  });
  const canCharge = stripeEnabled() && depositCents > 0;
  if (!canCharge) depositCents = 0;

  const booking = await createBooking({
    serviceId: service.id,
    serviceName: service.name,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail.trim(),
    customerPhone: input.customerPhone.trim(),
    locationType: input.locationType,
    zoneId,
    zoneName,
    address,
    startAt,
    endAt,
    status: BookingStatus.PENDING,
    notes: (input.notes ?? "").trim(),
    adminNotes: "",
    priceCents,
    travelFeeCents,
    depositCents,
    totalCents,
    currency: settings.currency,
    depositStatus: canCharge ? DepositStatus.PENDING : DepositStatus.NONE,
    stripeSessionId: "",
    stripePaymentIntentId: "",
  });

  let checkoutUrl: string | null = null;
  if (canCharge) {
    try {
      checkoutUrl = await createDepositCheckoutSession(booking);
    } catch (err) {
      console.error("Stripe checkout creation failed:", err);
      checkoutUrl = null;
    }
  }

  return { ok: true, booking, checkoutUrl };
}
