"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import AvailabilityManager from "./AvailabilityManager";

type Data = Awaited<ReturnType<typeof api.availability>>;

export default function AvailabilityPage() {
  const [data, setData] = useState<Data | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(() => {
    api.availability().then((d) => {
      setData(d);
      setVersion((v) => v + 1);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">Manage</p>
        <h1 className="mt-1 text-3xl text-ink">Availability</h1>
        <p className="mt-1 text-sm text-ink-soft">Set the hours customers can book, and block time off.</p>
      </div>
      {data === null ? (
        <p className="text-ink-faint">Loading…</p>
      ) : (
        <AvailabilityManager key={version} rules={data.rules} blocked={data.blocked} timezone={data.timezone} onReload={load} />
      )}
    </div>
  );
}
