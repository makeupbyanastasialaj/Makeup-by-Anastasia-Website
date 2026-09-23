"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type BookingStatusView } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { formatTz } from "@/lib/time";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  CONFIRMED: "bg-green-100 text-green-800 border-green-300",
  DECLINED: "bg-red-100 text-red-700 border-red-300",
  CANCELLED: "bg-stone-200 text-stone-600 border-stone-300",
  COMPLETED: "bg-cream-100 text-taupe-dark border-sand-dark",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export default function BookingClient() {
  const ref = useSearchParams().get("ref");
  const [booking, setBooking] = useState<BookingStatusView | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ref) {
      setLoaded(true);
      return;
    }
    api.getBookingStatus(ref).then(setBooking).catch(() => setBooking(null)).finally(() => setLoaded(true));
  }, [ref]);

  if (!loaded) return <div className="mx-auto max-w-xl px-4 py-20 text-center text-ink-faint">Loading…</div>;

  if (!booking) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-3xl text-ink">Booking not found</h1>
        <p className="mt-4 text-ink-soft">Please check your reference and try again.</p>
        <Link href="/" className="btn btn-outline mt-8">Back home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <div className="mb-6 text-center">
        <p className="eyebrow">Your booking</p>
        <h1 className="mt-2 text-3xl text-ink">{booking.serviceName}</h1>
        <span className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[booking.status] ?? ""}`}>
          {STATUS_LABELS[booking.status] ?? booking.status}
        </span>
      </div>

      <div className="card space-y-3 p-6 text-sm">
        <Row label="Reference" value={booking.publicId} />
        <Row label="When" value={formatTz(new Date(booking.startAt), "EEEE d MMMM yyyy, h:mm a", booking.timezone)} />
        <Row label="Location" value={booking.locationType === "MOBILE" ? "Mobile (I travel to you)" : "In the studio"} />
        {booking.address && <Row label="Address" value={booking.address} />}
        <Row label="Total" value={formatMoney(booking.totalCents, booking.currency)} />
        {booking.depositCents > 0 && (
          <Row
            label="Deposit"
            value={`${formatMoney(booking.depositCents, booking.currency)}${
              booking.depositStatus === "PAID" ? " (paid)" : booking.depositStatus === "REFUNDED" ? " (refunded)" : ""
            }`}
          />
        )}
      </div>

      {booking.status === "PENDING" && (
        <p className="mt-4 text-center text-sm text-ink-soft">
          This appointment is awaiting confirmation. I&apos;ll be in touch soon
          {booking.contactPhone ? ` — or reach me on ${booking.contactPhone}` : ""}.
        </p>
      )}
      {booking.status === "CONFIRMED" && (
        <p className="mt-4 text-center text-sm text-green-700">You&apos;re confirmed — I can&apos;t wait to see you!</p>
      )}

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-ink-soft hover:text-ink">← Back home</Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-sand/60 pb-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-ink-faint">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}
