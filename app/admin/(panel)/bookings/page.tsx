"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Booking } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { formatTz } from "@/lib/time";
import StatusBadge from "@/components/StatusBadge";

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "pending", label: "Pending" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
];

export default function BookingsPage() {
  const [filter, setFilter] = useState("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tz, setTz] = useState("Europe/London");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.bookings(filter).then((d) => {
      setBookings(d.bookings);
      setTz(d.timezone);
      setLoading(false);
    });
  }, [filter]);

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">Manage</p>
        <h1 className="mt-1 text-3xl text-ink">Bookings</h1>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f.key ? "bg-ink text-white" : "border border-sand bg-card text-ink-soft hover:bg-cream-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink-faint">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="card p-10 text-center text-ink-faint">No bookings in this view yet.</div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <Link key={b.id} href={`/admin/bookings/detail?id=${b.id}`} className="card flex items-center justify-between gap-4 p-4 transition hover:border-sand-dark">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-serif text-lg text-ink">{b.customerName}</span>
                  <StatusBadge status={b.status} />
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-soft">
                  {b.serviceName} · {b.locationType === "MOBILE" ? `Mobile${b.zoneName ? ` (${b.zoneName})` : ""}` : "Studio"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-ink">{formatTz(new Date(b.startAt), "EEE d MMM", tz)}</p>
                <p className="text-xs text-ink-soft">{formatTz(new Date(b.startAt), "h:mm a", tz)} · {formatMoney(b.totalCents, b.currency)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
