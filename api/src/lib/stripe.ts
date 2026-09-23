import Stripe from "stripe";
import { Booking } from "./repo";
import { formatMoney } from "./money";

let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:4280").replace(/\/$/, "");
}

export async function createDepositCheckoutSession(booking: Booking): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe || booking.depositCents <= 0) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.customerEmail || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: booking.currency.toLowerCase(),
          unit_amount: booking.depositCents,
          product_data: {
            name: `Deposit — ${booking.serviceName}`,
            description: `Secures your appointment request. Balance of ${formatMoney(
              booking.totalCents - booking.depositCents,
              booking.currency,
            )} due on the day.`,
          },
        },
      },
    ],
    metadata: { bookingId: booking.id, publicId: booking.publicId },
    payment_intent_data: { metadata: { bookingId: booking.id, publicId: booking.publicId } },
    success_url: `${siteUrl()}/book/success?ref=${booking.publicId}`,
    cancel_url: `${siteUrl()}/book/cancelled?ref=${booking.publicId}`,
  });
  return session.url;
}

export async function refundDeposit(paymentIntentId: string): Promise<boolean> {
  const stripe = getStripe();
  if (!stripe || !paymentIntentId) return false;
  await stripe.refunds.create({ payment_intent: paymentIntentId });
  return true;
}
