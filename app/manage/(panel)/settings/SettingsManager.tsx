"use client";

import { useState, useTransition } from "react";
import { parseMoneyToCents } from "@/lib/money";
import { api, ApiError } from "@/lib/api";

type Settings = {
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  instagram: string;
  studioAddress: string;
  currency: string;
  timezone: string;
  slotIntervalMin: number;
  bufferMin: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  depositType: string;
  depositValue: number;
};

const CURRENCIES = ["GBP", "EUR", "USD", "AUD", "CAD", "NZD"];
const TIMEZONES = [
  "Europe/London", "Europe/Dublin", "Europe/Paris", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney",
];

export default function SettingsManager({ settings, stripeEnabled }: { settings: Settings; stripeEnabled: boolean }) {
  const [f, setF] = useState<Settings>(settings);
  const [depositValueInput, setDepositValueInput] = useState(
    settings.depositType === "PERCENT" ? String(settings.depositValue) : (settings.depositValue / 100).toString(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function save() {
    setError(null);
    const depositValue = f.depositType === "PERCENT"
      ? Math.min(100, Math.max(0, Math.round(Number(depositValueInput) || 0)))
      : (parseMoneyToCents(depositValueInput) ?? 0);
    startTransition(async () => {
      try {
        await api.saveSettings({ ...f, depositValue });
        setSaved(true);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Save failed.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="card p-5">
        <h2 className="mb-4 text-xl text-ink">Business details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" full><input className="field" value={f.businessName} onChange={(e) => set("businessName", e.target.value)} /></Field>
          <Field label="Contact email"><input className="field" type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="hello@example.com" /></Field>
          <Field label="Phone"><input className="field" value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} /></Field>
          <Field label="Instagram handle"><input className="field" value={f.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@yourhandle" /></Field>
          <Field label="Studio location (shown on site)"><input className="field" value={f.studioAddress} onChange={(e) => set("studioAddress", e.target.value)} placeholder="e.g. Central London" /></Field>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-xl text-ink">Booking rules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency">
            <select className="field" value={f.currency} onChange={(e) => set("currency", e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Timezone">
            <input className="field" list="tz-list" value={f.timezone} onChange={(e) => set("timezone", e.target.value)} />
            <datalist id="tz-list">{TIMEZONES.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
          <Field label="Time slot interval (mins)"><input className="field" inputMode="numeric" value={String(f.slotIntervalMin)} onChange={(e) => set("slotIntervalMin", Number(e.target.value.replace(/\D/g, "")) || 0)} /></Field>
          <Field label="Buffer between bookings (mins)"><input className="field" inputMode="numeric" value={String(f.bufferMin)} onChange={(e) => set("bufferMin", Number(e.target.value.replace(/\D/g, "")) || 0)} /></Field>
          <Field label="Minimum notice (hours)"><input className="field" inputMode="numeric" value={String(f.minNoticeHours)} onChange={(e) => set("minNoticeHours", Number(e.target.value.replace(/\D/g, "")) || 0)} /></Field>
          <Field label="How far ahead can they book? (days)"><input className="field" inputMode="numeric" value={String(f.maxAdvanceDays)} onChange={(e) => set("maxAdvanceDays", Number(e.target.value.replace(/\D/g, "")) || 0)} /></Field>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-xl text-ink">Default deposit</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Used when a service doesn&apos;t set its own deposit.{" "}
          {stripeEnabled ? (
            <span className="text-green-700">Stripe is connected — deposits are live.</span>
          ) : (
            <span className="text-amber-700">Stripe isn&apos;t connected yet, so bookings come through as requests with no payment. Add your Stripe keys to turn deposits on.</span>
          )}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deposit type">
            <select className="field" value={f.depositType} onChange={(e) => set("depositType", e.target.value)}>
              <option value="FIXED">Fixed amount</option>
              <option value="PERCENT">Percentage of total</option>
            </select>
          </Field>
          <Field label={f.depositType === "PERCENT" ? "Percent (%)" : `Amount (${f.currency})`}>
            <input className="field" inputMode="decimal" value={depositValueInput} onChange={(e) => { setDepositValueInput(e.target.value); setSaved(false); }} />
          </Field>
        </div>
      </section>

      {error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Save settings"}</button>
        {saved && <span className="text-sm text-green-700">Saved ✓</span>}
      </div>

      <PasswordChange />
    </div>
  );
}

function PasswordChange() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMsg(null);
    startTransition(async () => {
      try {
        await api.changePassword({ current, next });
        setMsg({ ok: true, text: "Password updated." });
        setCurrent(""); setNext("");
      } catch (err) {
        setMsg({ ok: false, text: err instanceof ApiError ? err.message : "Failed." });
      }
    });
  }

  return (
    <section className="card p-5">
      <h2 className="mb-4 text-xl text-ink">Change password</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password"><input className="field" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="New password"><input className="field" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
      <button onClick={submit} disabled={pending || !current || !next} className="mt-4 rounded-full border border-sand bg-card px-5 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft hover:bg-cream-100 disabled:opacity-50">
        {pending ? "Updating…" : "Update password"}
      </button>
    </section>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
