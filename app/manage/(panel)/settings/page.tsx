"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import SettingsManager from "./SettingsManager";

type SettingsShape = React.ComponentProps<typeof SettingsManager>["settings"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsShape | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  useEffect(() => {
    api.adminSettings().then((d) => {
      setSettings(d.settings as unknown as SettingsShape);
      setStripeEnabled(d.stripeEnabled);
    });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">Manage</p>
        <h1 className="mt-1 text-3xl text-ink">Settings</h1>
      </div>
      {settings === null ? (
        <p className="text-ink-faint">Loading…</p>
      ) : (
        <SettingsManager settings={settings} stripeEnabled={stripeEnabled} />
      )}
    </div>
  );
}
