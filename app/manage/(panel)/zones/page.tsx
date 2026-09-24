"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Zone } from "@/lib/api";
import ZonesManager from "./ZonesManager";

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [currency, setCurrency] = useState("GBP");

  const load = useCallback(() => {
    Promise.all([api.adminZones(), api.adminSettings()]).then(([z, cfg]) => {
      setZones(z.zones);
      setCurrency((cfg.settings.currency as string) ?? "GBP");
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">Manage</p>
        <h1 className="mt-1 text-3xl text-ink">Travel zones</h1>
        <p className="mt-1 text-sm text-ink-soft">Areas you travel to for mobile bookings, each with its own call-out fee.</p>
      </div>
      {zones === null ? (
        <p className="text-ink-faint">Loading…</p>
      ) : (
        <ZonesManager zones={zones} currency={currency} onReload={load} />
      )}
    </div>
  );
}
