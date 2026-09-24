"use client";

import { useState, useTransition } from "react";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import { api, ApiError, type Service } from "@/lib/api";

const BLANK: Service = {
  id: "",
  name: "",
  description: "",
  durationMin: 60,
  priceCents: 0,
  depositCents: 0,
  active: true,
  sortOrder: 0,
};

export default function ServicesManager({
  services,
  currency,
  onReload,
}: {
  services: Service[];
  currency: string;
  onReload: () => void;
}) {
  const [editing, setEditing] = useState<Service | "new" | null>(null);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-ink-soft">{services.length} service{services.length === 1 ? "" : "s"}</p>
        <button onClick={() => setEditing("new")} className="btn btn-primary !py-2.5 text-xs">+ Add service</button>
      </div>

      {editing === "new" && (
        <ServiceForm currency={currency} initial={{ ...BLANK, sortOrder: services.length + 1 }} onClose={() => setEditing(null)} onReload={onReload} />
      )}

      <div className="space-y-2">
        {services.map((s) =>
          editing && editing !== "new" && editing.id === s.id ? (
            <ServiceForm key={s.id} currency={currency} initial={s} onClose={() => setEditing(null)} onReload={onReload} />
          ) : (
            <div key={s.id} className={`card flex items-center justify-between gap-4 p-4 ${s.active ? "" : "opacity-60"}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-serif text-lg text-ink">{s.name}</span>
                  {!s.active && <span className="rounded-full border border-sand px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-ink-faint">Hidden</span>}
                </div>
                <p className="text-sm text-ink-soft">
                  {formatDuration(s.durationMin)} · {formatMoney(s.priceCents, currency)}
                  {s.depositCents > 0 && ` · deposit ${formatMoney(s.depositCents, currency)}`}
                </p>
              </div>
              <button onClick={() => setEditing(s)} className="shrink-0 rounded-full border border-sand px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft hover:bg-cream-100">Edit</button>
            </div>
          ),
        )}
        {services.length === 0 && editing !== "new" && (
          <div className="card p-10 text-center text-ink-faint">No services yet. Add your first one.</div>
        )}
      </div>
    </div>
  );
}

function ServiceForm({ initial, currency, onClose, onReload }: { initial: Service; currency: string; onClose: () => void; onReload: () => void }) {
  const isNew = !initial.id;
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [durationMin, setDurationMin] = useState(String(initial.durationMin));
  const [price, setPrice] = useState(initial.priceCents ? (initial.priceCents / 100).toString() : "");
  const [deposit, setDeposit] = useState(initial.depositCents ? (initial.depositCents / 100).toString() : "");
  const [active, setActive] = useState(initial.active);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await api.saveService({
          id: initial.id || undefined,
          name,
          description,
          durationMin: Number(durationMin) || 0,
          priceCents: parseMoneyToCents(price) ?? 0,
          depositCents: parseMoneyToCents(deposit) ?? 0,
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
    if (!window.confirm(`Delete "${initial.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await api.deleteService(initial.id);
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
      <h3 className="mb-4 text-lg text-ink">{isNew ? "New service" : "Edit service"}</h3>
      <div className="grid gap-4">
        <div><label className="label">Name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bridal Makeup" /></div>
        <div><label className="label">Description</label><textarea className="field" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">Duration (mins)</label><input className="field" inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value.replace(/\D/g, ""))} /></div>
          <div><label className="label">Price ({currency})</label><input className="field" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></div>
          <div><label className="label">Deposit ({currency})</label><input className="field" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="default" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Sort order</label><input className="field" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/\D/g, ""))} /></div>
          <label className="flex items-center gap-2 pt-7 text-sm text-ink"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />Visible to customers</label>
        </div>
        <p className="text-xs text-ink-faint">Leave deposit blank to use your default deposit from Settings.</p>
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
