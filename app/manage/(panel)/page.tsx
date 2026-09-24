"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type Booking } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { dateKeyInTz, dayOfWeekInTz, formatTz, localDayStartUtc, DAY_NAMES_SHORT } from "@/lib/time";
import { BookingActions } from "./BookingActions";
import StatusBadge from "@/components/StatusBadge";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
const CHIP_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-300",
  CONFIRMED: "bg-ink text-white border-ink",
  COMPLETED: "bg-cream-100 text-taupe-dark border-sand-dark",
};

export default function DashboardPage() {
  const [data, setData] = useState<{
    bookings: Booking[];
    pending: Booking[];
    upcomingConfirmed: number;
    timezone: string;
  } | null>(null);
  const [view, setView] = useState<{ y: number; m: number } | null>(null);

  const load = useCallback(() => {
    api.calendar().then((d) => {
      setData(d);
      if (!view) {
        const todayKey = dateKeyInTz(new Date(), d.timezone);
        setView({ y: Number(todayKey.slice(0, 4)), m: Number(todayKey.slice(5, 7)) });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data || !view) {
    return <p className="text-ink-faint">Loading…</p>;
  }

  const tz = data.timezone;
  const todayKey = dateKeyInTz(new Date(), tz);
  const { y: curY, m: curM } = view;

  const firstKey = `${curY}-${pad(curM)}-01`;
  const daysInMonth = new Date(Date.UTC(curY, curM, 0)).getUTCDate();
  const monthStartUtc = localDayStartUtc(firstKey, tz);
  const firstWeekday = dayOfWeekInTz(monthStartUtc, tz);

  const byDay = new Map<string, Booking[]>();
  for (const b of data.bookings) {
    const key = dateKeyInTz(new Date(b.startAt), tz);
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(b);
  }

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${curY}-${pad(curM)}-${pad(d)}`);

  const monthLabel = new Date(Date.UTC(curY, curM - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  function shift(delta: number) {
    setView((v) => {
      if (!v) return v;
      const m = v.m + delta;
      if (m < 1) return { y: v.y - 1, m: 12 };
      if (m > 12) return { y: v.y + 1, m: 1 };
      return { y: v.y, m };
    });
  }
  function goToday() {
    setView({ y: Number(todayKey.slice(0, 4)), m: Number(todayKey.slice(5, 7)) });
  }

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-1 text-3xl text-ink">Good {greeting()}, Anastasia</h1>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Pending requests" value={data.pending.length} highlight={data.pending.length > 0} />
        <Stat label="Upcoming confirmed" value={data.upcomingConfirmed} />
        <Stat label="This month" value={cells.filter((c) => c && (byDay.get(c)?.length ?? 0) > 0).reduce((n, c) => n + (byDay.get(c!)?.length ?? 0), 0)} suffix="bookings" />
      </div>

      {data.pending.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl text-ink">Requests awaiting your response</h2>
          <div className="space-y-3">
            {data.pending.map((b) => (
              <div key={b.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/manage/bookings/detail?id=${b.id}`} className="font-serif text-lg text-ink hover:underline">{b.customerName}</Link>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {b.serviceName} · {formatTz(new Date(b.startAt), "EEE d MMM, h:mm a", tz)} ·{" "}
                    {b.locationType === "MOBILE" ? `Mobile${b.zoneName ? ` (${b.zoneName})` : ""}` : "Studio"} ·{" "}
                    {formatMoney(b.totalCents, b.currency)}
                    {b.depositStatus === "PAID" && <span className="text-green-700"> · deposit paid</span>}
                  </p>
                </div>
                <BookingActions id={b.id} status={b.status} depositPaid={b.depositStatus === "PAID"} variant="compact" onChanged={load} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl text-ink">{monthLabel}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => shift(-1)} className="rounded-full border border-sand px-3 py-1.5 text-sm text-ink-soft hover:bg-cream-100">‹ Prev</button>
            <button onClick={goToday} className="rounded-full border border-sand px-3 py-1.5 text-sm text-ink-soft hover:bg-cream-100">Today</button>
            <button onClick={() => shift(1)} className="rounded-full border border-sand px-3 py-1.5 text-sm text-ink-soft hover:bg-cream-100">Next ›</button>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-sand bg-cream-50 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-ink-faint">
            {DAY_NAMES_SHORT.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((key, i) => {
              if (!key) return <div key={i} className="min-h-24 border-b border-r border-sand/50 bg-cream-50/40" />;
              const dayNum = Number(key.slice(8, 10));
              const items = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              return (
                <div key={i} className={`min-h-24 border-b border-r border-sand/50 p-1.5 ${isToday ? "bg-cream-100" : "bg-card"}`}>
                  <div className={`mb-1 text-right text-xs ${isToday ? "font-bold text-ink" : "text-ink-faint"}`}>{dayNum}</div>
                  <div className="space-y-1">
                    {items.slice(0, 4).map((b) => (
                      <Link key={b.id} href={`/manage/bookings/detail?id=${b.id}`} className={`block truncate rounded border px-1.5 py-0.5 text-[0.68rem] leading-tight ${CHIP_STYLES[b.status] ?? "bg-cream-100 border-sand"}`} title={`${formatTz(new Date(b.startAt), "h:mm a", tz)} — ${b.customerName}`}>
                        {formatTz(new Date(b.startAt), "h:mm", tz)} {b.customerName.split(" ")[0]}
                      </Link>
                    ))}
                    {items.length > 4 && <span className="block text-[0.65rem] text-ink-faint">+{items.length - 4} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-soft">
          <Legend className="bg-amber-100 border-amber-300" label="Pending" />
          <Legend className="bg-ink border-ink" label="Confirmed" />
          <Legend className="bg-cream-100 border-sand-dark" label="Completed" />
        </div>
      </section>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
function Stat({ label, value, suffix, highlight }: { label: string; value: number; suffix?: string; highlight?: boolean }) {
  return (
    <div className={`card p-4 ${highlight ? "ring-1 ring-amber-300" : ""}`}>
      <p className="text-xs uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 font-serif text-3xl text-ink">{value}{suffix && <span className="ml-1 text-sm text-ink-faint">{suffix}</span>}</p>
    </div>
  );
}
function Legend({ className, label }: { className: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded border ${className}`} />{label}</span>;
}
