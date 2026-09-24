"use client";

import { useState, useTransition } from "react";
import { api } from "@/lib/api";

export default function AdminNotes({
  id,
  initial,
}: {
  id: string;
  initial: string;
}) {
  const [notes, setNotes] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    startTransition(async () => {
      try {
        await api.saveBookingNotes(id, notes);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch {
        // ignore
      }
    });
  }

  return (
    <div>
      <textarea
        className="field"
        rows={4}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        placeholder="Private notes — kit, inspiration, parking, follow-ups…"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-full border border-sand bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft hover:bg-cream-100 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save notes"}
        </button>
        {saved && <span className="text-xs text-green-700">Saved ✓</span>}
      </div>
    </div>
  );
}
