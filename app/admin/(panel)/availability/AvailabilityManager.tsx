"use client";

import { useState, useTransition } from "react";
import { fromZonedTime } from "date-fns-tz";
import { DAY_NAMES, inputToMinutes, minutesToInput } from "@/lib/time";
import { api, ApiError } from "@/lib/api";

type Rule = { dayOfWeek: number; startMin: number; endMin: number; active: boolean };
type Blocked = { id: string; label: string; reason: string };
type DayState = { open: boolean; start: string; end: string };

export default function AvailabilityManager({
  rules,
  blocked,
  timezone,
  onReload,
}: {
  rules: Rule[];
  blocked: Blocked[];
  timezone: string;
  onReload: () => void;
}) {
  const initialDays: DayState[] = Array.from({ length: 7 }, (_, dow) => {
    const rule = rules.find((r) => r.dayOfWeek === dow);
    return rule
      ? { open: true, start: minutesToInput(rule.startMin), end: minutesToInput(rule.endMin) }
      : { open: false, start: "09:00", end: "17:00" };
  });

  const [days, setDays] = useState<DayState[]>(initialDays);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(dow: number, patch: Partial<DayState>) {
    setDays((prev) => prev.map((d, i) => (i === dow ? { ...d, ...patch } : d)));
    setSaved(false);
  }

  function saveHours() {
    setError(null);
    const payload: { dayOfWeek: number; startMin: number; endMin: number }[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const d = days[dow];
      if (!d.open) continue;
      const startMin = inputToMinutes(d.start);
      const endMin = inputToMinutes(d.end);
      if (endMin <= startMin) {
        setError(`${DAY_NAMES[dow]}: end time must be after start time.`);
        return;
      }
      payload.push({ dayOfWeek: dow, startMin, endMin });
    }
    startTransition(async () => {
      try {
        await api.saveRules(payload);
        setSaved(true);
        onReload();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Save failed.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="card p-5">
        <h2 className="mb-1 text-xl text-ink">Weekly hours</h2>
        <p className="mb-4 text-sm text-ink-soft">Customers can only book within these hours. Times are in {timezone}.</p>
        <div className="space-y-2">
          {days.map((d, dow) => (
            <div key={dow} className="flex flex-wrap items-center gap-3 rounded-lg border border-sand bg-cream-50 px-3 py-2">
              <label className="flex w-32 items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" checked={d.open} onChange={(e) => update(dow, { open: e.target.checked })} className="h-4 w-4" />
                {DAY_NAMES[dow]}
              </label>
              {d.open ? (
                <div className="flex items-center gap-2 text-sm">
                  <input type="time" value={d.start} onChange={(e) => update(dow, { start: e.target.value })} className="field !w-auto !py-1.5" />
                  <span className="text-ink-faint">to</span>
                  <input type="time" value={d.end} onChange={(e) => update(dow, { end: e.target.value })} className="field !w-auto !py-1.5" />
                </div>
              ) : (
                <span className="text-sm text-ink-faint">Closed</span>
              )}
            </div>
          ))}
        </div>

        {error && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveHours} disabled={pending} className="btn btn-primary !py-2.5 text-xs">{pending ? "Saving…" : "Save hours"}</button>
          {saved && <span className="text-xs text-green-700">Saved ✓</span>}
        </div>
      </section>

      <BlockedDates blocked={blocked} timezone={timezone} onReload={onReload} />
    </div>
  );
}

function BlockedDates({ blocked, timezone, onReload }: { blocked: Blocked[]; timezone: string; onReload: () => void }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setError(null);
    if (!start || !end) { setError("Please choose start and end dates."); return; }
    if (end < start) { setError("End date must be on or after the start date."); return; }
    const startISO = fromZonedTime(`${start}T00:00:00`, timezone).toISOString();
    const endBase = fromZonedTime(`${end}T00:00:00`, timezone);
    const endISO = new Date(endBase.getTime() + 24 * 3600 * 1000).toISOString();
    startTransition(async () => {
      try {
        await api.addBlock({ startISO, endISO, reason });
        setStart(""); setEnd(""); setReason("");
        onReload();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to block dates.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      try { await api.removeBlock(id); onReload(); } catch { /* ignore */ }
    });
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 text-xl text-ink">Time off &amp; blocked dates</h2>
      <p className="mb-4 text-sm text-ink-soft">Block holidays or personal days so no one can book them.</p>

      <div className="grid gap-3 sm:grid-cols-4">
        <div><label className="label">From</label><input type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="label">To</label><input type="date" className="field" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Reason (optional)</label><input className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Holiday" /></div>
      </div>
      {error && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button onClick={add} disabled={pending} className="btn btn-primary mt-4 !py-2.5 text-xs">{pending ? "Adding…" : "Block these dates"}</button>

      {blocked.length > 0 && (
        <div className="mt-6 space-y-2">
          {blocked.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-sand bg-cream-50 px-3 py-2 text-sm">
              <span className="text-ink">{b.label}{b.reason && <span className="text-ink-soft"> — {b.reason}</span>}</span>
              <button onClick={() => remove(b.id)} disabled={pending} className="text-xs font-semibold uppercase tracking-wide text-red-600 hover:underline">Remove</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
