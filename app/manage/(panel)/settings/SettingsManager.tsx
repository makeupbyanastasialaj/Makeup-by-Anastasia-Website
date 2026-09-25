"use client";

import { useState, useTransition } from "react";
import { parseMoneyToCents } from "@/lib/money";
import { api, ApiError } from "@/lib/api";
import { FONT_THEMES } from "@/lib/fonts";

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
  logoDataUrl: string;
  colorBackground: string;
  colorText: string;
  colorAccent: string;
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  fontTheme: string;
  logoImageUrl: string;
  aboutImageUrl: string;
  aboutTitle: string;
  aboutText: string;
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
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const [aboutErr, setAboutErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"" | "logo" | "about">("");
  const [pending, startTransition] = useTransition();

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function uploadFile(kind: "logo" | "about", file: File) {
    const setErr = kind === "logo" ? setLogoErr : setAboutErr;
    setErr(null);
    setUploading(kind);
    try {
      const dataUrl = await resizeImage(file, kind === "logo" ? 900 : 1200);
      const { url } = await api.uploadImage(kind, dataUrl);
      set(kind === "logo" ? "logoImageUrl" : "aboutImageUrl", url);
    } catch {
      setErr("Couldn't upload that image — please try a different PNG or JPG.");
    } finally {
      setUploading("");
    }
  }

  async function removeImage(kind: "logo" | "about") {
    const setErr = kind === "logo" ? setLogoErr : setAboutErr;
    setErr(null);
    try {
      await api.uploadImage(kind, "");
      set(kind === "logo" ? "logoImageUrl" : "aboutImageUrl", "");
    } catch {
      setErr("Couldn't remove the image. Please try again.");
    }
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
        <h2 className="mb-1 text-xl text-ink">Branding &amp; homepage</h2>
        <p className="mb-4 text-sm text-ink-soft">Make the site your own — your logo, colours and the words on your homepage. Changes go live as soon as you save.</p>

        {/* Logo */}
        <div className="mb-6">
          <label className="label">Logo</label>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sand bg-white">
              {(f.logoImageUrl || f.logoDataUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.logoImageUrl || f.logoDataUrl} alt="Logo preview" className="h-full w-full object-contain" />
              ) : (
                <span className="px-1 text-center text-[0.65rem] text-ink-faint">No logo yet</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading === "logo"}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile("logo", file); e.target.value = ""; }}
                className="text-sm text-ink-soft file:mr-3 file:rounded-full file:border file:border-sand file:bg-cream-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-ink-soft"
              />
              {uploading === "logo" && <span className="text-xs text-ink-faint">Uploading…</span>}
              {(f.logoImageUrl || f.logoDataUrl) && uploading !== "logo" && (
                <button type="button" onClick={() => removeImage("logo")} className="self-start text-xs text-red-700 underline">Remove logo</button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-faint">Shown top-left and on your homepage. For a crisp result use a high-resolution PNG with a transparent background (it&apos;s stored at full quality).</p>
          {logoErr && <p className="mt-1 text-xs text-red-700">{logoErr}</p>}
        </div>

        {/* Colours */}
        <label className="label">Colours</label>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <ColorField label="Background" value={f.colorBackground} onChange={(v) => set("colorBackground", v)} />
          <ColorField label="Text" value={f.colorText} onChange={(v) => set("colorText", v)} />
          <ColorField label="Accent" value={f.colorAccent} onChange={(v) => set("colorAccent", v)} />
        </div>

        {/* Font */}
        <div className="mb-6">
          <Field label="Font style">
            <select className="field" value={f.fontTheme || "classic"} onChange={(e) => set("fontTheme", e.target.value)}>
              {FONT_THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <p className="mt-1 text-xs text-ink-faint">Changes the headings and body text across your whole site.</p>
        </div>

        {/* Homepage wording */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small heading (above the title)" full><input className="field" value={f.heroEyebrow} onChange={(e) => set("heroEyebrow", e.target.value)} /></Field>
          <Field label="Headline"><input className="field" value={f.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} /></Field>
          <Field label="Script line (under the headline)"><input className="field" value={f.heroHighlight} onChange={(e) => set("heroHighlight", e.target.value)} /></Field>
          <Field label="Intro paragraph" full><textarea className="field min-h-[5rem]" rows={3} value={f.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} /></Field>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-xl text-ink">About me</h2>
        <p className="mb-4 text-sm text-ink-soft">An introduction on your homepage with your photo — like a &ldquo;Meet the artist&rdquo; section. Leave the text empty to hide it.</p>

        <div className="mb-4">
          <label className="label">Your photo</label>
          <div className="flex items-center gap-4">
            <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg border border-sand bg-white">
              {f.aboutImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.aboutImageUrl} alt="About preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-1 text-center text-[0.65rem] text-ink-faint">No photo yet</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading === "about"}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile("about", file); e.target.value = ""; }}
                className="text-sm text-ink-soft file:mr-3 file:rounded-full file:border file:border-sand file:bg-cream-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-ink-soft"
              />
              {uploading === "about" && <span className="text-xs text-ink-faint">Uploading…</span>}
              {f.aboutImageUrl && uploading !== "about" && (
                <button type="button" onClick={() => removeImage("about")} className="self-start text-xs text-red-700 underline">Remove photo</button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-faint">A portrait photo works best — it&apos;s shown tall on the right of the section.</p>
          {aboutErr && <p className="mt-1 text-xs text-red-700">{aboutErr}</p>}
        </div>

        <div className="grid gap-4">
          <Field label="Heading"><input className="field" value={f.aboutTitle} onChange={(e) => set("aboutTitle", e.target.value)} placeholder="e.g. Meet Anastasia" /></Field>
          <Field label="About text"><textarea className="field min-h-[8rem]" rows={7} value={f.aboutText} onChange={(e) => set("aboutText", e.target.value)} placeholder="Tell your clients about yourself and your work. Leave a blank line between paragraphs." /></Field>
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded border border-sand bg-white p-1"
          aria-label={`${label} colour`}
        />
        <input className="field" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#rrggbb" />
      </div>
    </div>
  );
}

/**
 * Resize an image file in the browser to a crisp data URL for upload to blob
 * storage. Scales down to at most `maxWidth` px wide (never upscales) and keeps
 * quality high; only steps quality/size down if needed to stay under the cap.
 */
function resizeImage(file: File, maxWidth: number): Promise<string> {
  const MAX_CHARS = 1_400_000; // ~1 MB, comfortably under the upload limit
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const srcW = img.width || maxWidth;
        const srcH = img.height || maxWidth;
        for (const targetW of [maxWidth, Math.round(maxWidth * 0.8), Math.round(maxWidth * 0.6)]) {
          const scale = Math.min(1, targetW / srcW);
          const cw = Math.max(1, Math.round(srcW * scale));
          const ch = Math.max(1, Math.round(srcH * scale));
          const canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("no canvas"));
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          for (const q of [0.92, 0.85, 0.75, 0.65]) {
            let url = canvas.toDataURL("image/webp", q);
            if (!url.startsWith("data:image/webp")) url = canvas.toDataURL("image/png");
            if (url.length <= MAX_CHARS) return resolve(url);
            if (!url.startsWith("data:image/webp")) break; // png won't shrink with quality
          }
        }
        reject(new Error("too large"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
