"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type BookingStatusView } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { formatTz } from "@/lib/time";

export default function SuccessClient() {
  const ref = useSearchParams().get("ref");
  const [booking, setBooking] = useState<BookingStatusView | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ref) {
      setLoaded(true);
      return;
    }
    api
      .getBookingStatus(ref)
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setLoaded(true));
  }, [ref]);

  const paid = booking?.depositStatus === "PAID";

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink text-2xl text-white">✓</div>
      <p className="script mt-6 text-4xl text-taupe-dark">Thank you!</p>
      <h1 className="mt-2 text-3xl text-ink">Your request is in</h1>

      {!loaded ? (
        <p className="mt-6 text-ink-faint">Loading…</p>
      ) : booking ? (
        <>
          <p className="mt-4 text-ink-soft">
            {paid ? "Your deposit is received and your slot is held. " : ""}
            I&apos;ll review your request and confirm shortly. You&apos;ll hear from me at{" "}
            <span className="text-ink">{ref}</span>.
          </p>

          <div className="card mt-8 space-y-3 p-6 text-left text-sm">
            <Row label="Reference" value={booking.publicId} />
            <Row label="Service" value={booking.serviceName} />
            <Row label="When" value={formatTz(new Date(booking.startAt), "EEEE d MMMM, h:mm a", booking.timezone)} />
            <Row label="Location" value={booking.locationType === "MOBILE" ? "Mobile (I travel to you)" : "In the studio"} />
            <Row label="Total" value={formatMoney(booking.totalCents, booking.currency)} />
            {booking.depositCents > 0 && (
              <Row label={paid ? "Deposit paid" : "Deposit"} value={formatMoney(booking.depositCents, booking.currency)} />
            )}
            <Row label="Status" value="Awaiting confirmation" />
          </div>

          <p className="mt-4 text-xs text-ink-faint">
            Keep your reference <strong>{booking.publicId}</strong> to check your booking anytime.
          </p>
          <Link href={`/booking?ref=${booking.publicId}`} className="btn btn-outline mt-6">View my booking</Link>
        </>
      ) : (
        <p className="mt-4 text-ink-soft">Your request has been received. I&apos;ll be in touch soon.</p>
      )}

      <div className="mt-8">
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
