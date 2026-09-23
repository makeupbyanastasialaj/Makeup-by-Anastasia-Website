"use client";

import { useState, useTransition } from "react";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { api, ApiError, type Zone } from "@/lib/api";

export default function ZonesManager({
  zones,
  currency,
  onReload,
}: {
  zones: Zone[];
  currency: string;
  onReload: () => void;
}) {
  const [editing, setEditing] = useState<Zone | "new" | null>(null);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-ink-soft">{zones.length} area{zones.length === 1 ? "" : "s"}</p>
        <button onClick={() => setEditing("new")} className="btn btn-primary !py-2.5 text-xs">+ Add area</button>
      </div>

      {editing === "new" && (
        <ZoneForm currency={currency} initial={{ id: "", name: "", feeCents: 0, active: true, sortOrder: zones.length + 1 }} onClose={() => setEditing(null)} onReload={onReload} />
      )}

      <div className="space-y-2">
        {zones.map((z) =>
          editing && editing !== "new" && editing.id === z.id ? (
            <ZoneForm key={z.id} currency={currency} initial={z} onClose={() => setEditing(null)} onReload={onReload} />
          ) : (
            <div key={z.id} className={`card flex items-center justify-between gap-4 p-4 ${z.active ? "" : "opacity-60"}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg text-ink">{z.name}</span>
                  {!z.active && <span className="rounded-full border border-sand px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-ink-faint">Hidden</span>}
                </div>
                <p className="text-sm text-ink-soft">Travel fee {formatMoney(z.feeCents, currency)}</p>
              </div>
              <button onClick={() => setEditing(z)} className="rounded-full border border-sand px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft hover:bg-cream-100">Edit</button>
            </div>
          ),
        )}
        {zones.length === 0 && editing !== "new" && (
          <div className="card p-10 text-center text-ink-faint">No travel areas yet. Add areas so mobile customers can book.</div>
        )}
      </div>
    </div>
  );
}

function ZoneForm({ initial, currency, onClose, onReload }: { initial: Zone; currency: string; onClose: () => void; onReload: () => void }) {
  const isNew = !initial.id;
  const [name, setName] = useState(initial.name);
  const [fee, setFee] = useState(initial.feeCents ? (initial.feeCents / 100).toString() : "");
  const [active, setActive] = useState(initial.active);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await api.saveZone({
          id: initial.id || undefined,
          name,
          feeCents: parseMoneyToCents(fee) ?? 0,
          active,
          sortOrder: Number(sortOrder) || 0,
        });
        onReload();
        onClose();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Save failed.");
      }
    });
  }

  function onDelete() {
    if (!window.confirm(`Delete "${initial.name}"?`)) return;
    startTransition(async () => {
      try {
        await api.deleteZone(initial.id);
        onReload();
        onClose();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Delete failed.");
        onReload();
      }
    });
  }

  return (
    <div className="card border-taupe-dark p-5 ring-1 ring-taupe-dark">
      <h3 className="mb-4 text-lg text-ink">{isNew ? "New travel area" : "Edit travel area"}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">Area name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nearby (5–15 miles)" /></div>
        <div><label className="label">Travel fee ({currency})</label><input className="field" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0.00" /></div>
        <div><label className="label">Sort order</label><input className="field" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/\D/g, ""))} /></div>
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />Available to customers</label>
      </div>

      {error && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={submit} disabled={pending} className="btn btn-primary !py-2.5 text-xs">{pending ? "Saving…" : "Save"}</button>
          <button onClick={onClose} className="rounded-full border border-sand px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft hover:bg-cream-100">Cancel</button>
        </div>
        {!isNew && <button onClick={onDelete} disabled={pending} className="text-xs font-semibold uppercase tracking-wide text-red-600 hover:underline">Delete</button>}
      </div>
    </div>
  );
}
