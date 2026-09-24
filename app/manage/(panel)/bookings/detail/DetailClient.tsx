"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Booking } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { formatTz } from "@/lib/time";
import StatusBadge from "@/components/StatusBadge";
import { BookingActions } from "../../BookingActions";
import AdminNotes from "../AdminNotes";

export default function DetailClient() {
  const id = useSearchParams().get("id");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tz, setTz] = useState("Europe/London");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    if (!id) {
      setLoaded(true);
      return;
    }
    api.booking(id).then((d) => {
      setBooking(d.booking);
      setTz(d.timezone);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!loaded) return <p className="text-ink-faint">Loading…</p>;
  if (!booking) {
    return (
      <div>
        <Link href="/manage/bookings" className="text-sm text-ink-soft hover:text-ink">← All bookings</Link>
        <p className="mt-6 text-ink-faint">Booking not found.</p>
      </div>
    );
  }

  const depositPaid = booking.depositStatus === "PAID";

  return (
    <div>
      <Link href="/manage/bookings" className="text-sm text-ink-soft hover:text-ink">← All bookings</Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl text-ink">{booking.customerName}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm text-ink-faint">
            Ref {booking.publicId} · requested {formatTz(new Date(booking.createdAt), "d MMM yyyy, h:mm a", tz)}
          </p>
        </div>
        <BookingActions id={booking.id} status={booking.status} depositPaid={depositPaid} variant="full" onChanged={load} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-lg text-ink">Appointment</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Service" value={booking.serviceName} />
            <Row label="When" value={formatTz(new Date(booking.startAt), "EEEE d MMMM yyyy", tz)} />
            <Row label="Time" value={`${formatTz(new Date(booking.startAt), "h:mm a", tz)} – ${formatTz(new Date(booking.endAt), "h:mm a", tz)}`} />
            <Row label="Location" value={booking.locationType === "MOBILE" ? `Mobile${booking.zoneName ? ` — ${booking.zoneName}` : ""}` : "In the studio"} />
            {booking.address && <Row label="Address" value={booking.address} />}
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-lg text-ink">Customer</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={booking.customerName} />
            <Row label="Email" value={<a href={`mailto:${booking.customerEmail}`} className="text-taupe-dark underline">{booking.customerEmail}</a>} />
            <Row label="Phone" value={<a href={`tel:${booking.customerPhone}`} className="text-taupe-dark underline">{booking.customerPhone}</a>} />
            {booking.notes && <Row label="Their notes" value={booking.notes} />}
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-lg text-ink">Payment</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Service" value={formatMoney(booking.priceCents, booking.currency)} />
            {booking.travelFeeCents > 0 && <Row label="Travel fee" value={formatMoney(booking.travelFeeCents, booking.currency)} />}
            <Row label="Total" value={<strong>{formatMoney(booking.totalCents, booking.currency)}</strong>} />
            <Row label="Deposit" value={booking.depositCents > 0 ? `${formatMoney(booking.depositCents, booking.currency)} — ${depositLabel(booking.depositStatus)}` : "None"} />
            <Row label="Balance on day" value={formatMoney(booking.totalCents - (depositPaid ? booking.depositCents : 0), booking.currency)} />
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-lg text-ink">Private notes</h2>
          <AdminNotes id={booking.id} initial={booking.adminNotes} />
        </div>
      </div>
    </div>
  );
}

function depositLabel(status: string) {
  return { NONE: "not required", PENDING: "awaiting payment", PAID: "paid", REFUNDED: "refunded" }[status] ?? status;
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-sand/50 pb-1.5 last:border-0">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
