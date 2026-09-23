"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Service } from "@/lib/api";
import ServicesManager from "./ServicesManager";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [currency, setCurrency] = useState("GBP");

  const load = useCallback(() => {
    Promise.all([api.adminServices(), api.adminSettings()]).then(([s, cfg]) => {
      setServices(s.services);
      setCurrency((cfg.settings.currency as string) ?? "GBP");
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">Manage</p>
        <h1 className="mt-1 text-3xl text-ink">Services</h1>
        <p className="mt-1 text-sm text-ink-soft">These appear on your site and in the booking form.</p>
      </div>
      {services === null ? (
        <p className="text-ink-faint">Loading…</p>
      ) : (
        <ServicesManager services={services} currency={currency} onReload={load} />
      )}
    </div>
  );
}
