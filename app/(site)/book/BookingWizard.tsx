"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import { api, ApiError } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────
type Service = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  depositCents: number;
};
type Zone = { id: string; name: string; feeCents: number };
type Slot = { minutes: number; label: string; startISO: string };

type Props = {
  services: Service[];
  zones: Zone[];
  currency: string;
  depositsEnabled: boolean;
  depositDefault: { type: string; value: number };
  bookableWeekdays: number[];
  todayStr: string;
  maxAdvanceDays: number;
  minNoticeHours: number;
  preselectServiceId: string | null;
};

const STEPS = ["Service", "Location", "Date & time", "Details", "Review"];

// ─── Date helpers (calendar-date math, timezone-agnostic) ───────────────────
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function weekdayOf(str: string) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function addDaysStr(str: string, days: number) {
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dateStr(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}
function prettyDate(str: string) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Main component ─────────────────────────────────────────────────────────
export default function BookingWizard(props: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [serviceId, setServiceId] = useState<string | null>(
    props.preselectServiceId &&
      props.services.some((s) => s.id === props.preselectServiceId)
      ? props.preselectServiceId
      : null,
  );
  const [locationType, setLocationType] = useState<"STUDIO" | "MOBILE" | null>(
    null,
  );
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(
    () => props.services.find((s) => s.id === serviceId) ?? null,
    [props.services, serviceId],
  );
  const zone = useMemo(
    () => props.zones.find((z) => z.id === zoneId) ?? null,
    [props.zones, zoneId],
  );

  const travelFee = locationType === "MOBILE" && zone ? zone.feeCents : 0;
  const total = (service?.priceCents ?? 0) + travelFee;
  const deposit = useMemo(() => {
    if (!props.depositsEnabled || !service) return 0;
    const raw =
      service.depositCents > 0
        ? service.depositCents
        : props.depositDefault.type === "PERCENT"
          ? Math.round((total * props.depositDefault.value) / 100)
          : props.depositDefault.value;
    return Math.max(0, Math.min(raw, total));
  }, [props.depositsEnabled, props.depositDefault, service, total]);

  // If mobile has no zones configured, treat mobile as unavailable.
  const mobileAvailable = props.zones.length > 0;

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return !!serviceId;
      case 1:
        if (!locationType) return false;
        if (locationType === "MOBILE") return !!zoneId && address.trim().length > 3;
        return true;
      case 2:
        return !!slot;
      case 3:
        return (
          name.trim().length > 0 &&
          /.+@.+\..+/.test(email) &&
          phone.trim().length >= 5
        );
      default:
        return true;
    }
  }

  async function handleSubmit() {
    if (!service || !slot || !locationType) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createBooking({
        serviceId: service.id,
        startISO: slot.startISO,
        locationType,
        zoneId: locationType === "MOBILE" ? zoneId : null,
        address: locationType === "MOBILE" ? address.trim() : "",
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        notes: notes.trim(),
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        router.push(`/book/success?ref=${res.publicId}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <StepIndicator step={step} />

      <div className="p-6 sm:p-8">
        {step === 0 && (
          <ServiceStep
            services={props.services}
            currency={props.currency}
            selected={serviceId}
            onSelect={setServiceId}
          />
        )}

        {step === 1 && (
          <LocationStep
            currency={props.currency}
            zones={props.zones}
            mobileAvailable={mobileAvailable}
            locationType={locationType}
            zoneId={zoneId}
            address={address}
            onLocation={(l) => {
              setLocationType(l);
              if (l === "STUDIO") {
                setZoneId(null);
                setAddress("");
              }
            }}
            onZone={setZoneId}
            onAddress={setAddress}
          />
        )}

        {step === 2 && service && (
          <DateTimeStep
            serviceId={service.id}
            durationMin={service.durationMin}
            todayStr={props.todayStr}
            maxAdvanceDays={props.maxAdvanceDays}
            bookableWeekdays={props.bookableWeekdays}
            selectedDate={selectedDate}
            slot={slot}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setSlot(null);
            }}
            onSelectSlot={setSlot}
          />
        )}

        {step === 3 && (
          <DetailsStep
            name={name}
            email={email}
            phone={phone}
            notes={notes}
            onName={setName}
            onEmail={setEmail}
            onPhone={setPhone}
            onNotes={setNotes}
          />
        )}

        {step === 4 && service && (
          <ReviewStep
            service={service}
            currency={props.currency}
            locationType={locationType}
            zone={zone}
            address={address}
            selectedDate={selectedDate}
            slot={slot}
            name={name}
            email={email}
            phone={phone}
            notes={notes}
            travelFee={travelFee}
            total={total}
            deposit={deposit}
            depositsEnabled={props.depositsEnabled}
          />
        )}

        {error && (
          <p className="mt-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep((s) => Math.max(0, s - 1));
            }}
            className={`text-sm font-medium tracking-wide text-ink-soft transition-colors hover:text-ink ${
              step === 0 ? "invisible" : ""
            }`}
          >
            ← Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canAdvance()}
              onClick={() => {
                setError(null);
                setStep((s) => s + 1);
              }}
              className="btn btn-primary"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="btn btn-primary"
            >
              {submitting
                ? "Submitting…"
                : deposit > 0
                  ? `Pay deposit ${formatMoney(deposit, props.currency)}`
                  : "Send booking request"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step indicator ─────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1 border-b border-sand bg-cream-50 px-4 py-3 sm:px-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-1">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold transition-colors ${
                i < step
                  ? "bg-ink text-white"
                  : i === step
                    ? "bg-taupe-dark text-white"
                    : "bg-sand text-ink-faint"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span
              className={`hidden text-xs font-medium tracking-wide md:inline ${
                i === step ? "text-ink" : "text-ink-faint"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <span className="mx-1 hidden h-px flex-1 bg-sand sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Service ────────────────────────────────────────────────────────
function ServiceStep({
  services,
  currency,
  selected,
  onSelect,
}: {
  services: Service[];
  currency: string;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl text-ink">Choose your service</h2>
      <p className="mt-1 text-sm text-ink-soft">Select the look you&apos;d like.</p>
      <div className="mt-5 space-y-3">
        {services.map((s) => {
          const active = selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition-all ${
                active
                  ? "border-taupe-dark bg-cream-100 ring-1 ring-taupe-dark"
                  : "border-sand bg-white hover:border-sand-dark"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      active ? "border-taupe-dark bg-taupe-dark" : "border-sand-dark"
                    }`}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="font-serif text-xl text-ink">{s.name}</span>
                </div>
                {s.description && (
                  <p className="mt-1 pl-6 text-sm leading-relaxed text-ink-soft">
                    {s.description}
                  </p>
                )}
                <p className="mt-1 pl-6 text-xs uppercase tracking-widest text-ink-faint">
                  {formatDuration(s.durationMin)}
                </p>
              </div>
              <span className="whitespace-nowrap font-serif text-lg text-taupe-dark">
                {formatMoney(s.priceCents, currency)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Location ───────────────────────────────────────────────────────
function LocationStep({
  currency,
  zones,
  mobileAvailable,
  locationType,
  zoneId,
  address,
  onLocation,
  onZone,
  onAddress,
}: {
  currency: string;
  zones: Zone[];
  mobileAvailable: boolean;
  locationType: "STUDIO" | "MOBILE" | null;
  zoneId: string | null;
  address: string;
  onLocation: (l: "STUDIO" | "MOBILE") => void;
  onZone: (id: string) => void;
  onAddress: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl text-ink">Where would you like your makeup done?</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onLocation("STUDIO")}
          className={`rounded-xl border p-5 text-left transition-all ${
            locationType === "STUDIO"
              ? "border-taupe-dark bg-cream-100 ring-1 ring-taupe-dark"
              : "border-sand bg-white hover:border-sand-dark"
          }`}
        >
          <span className="font-serif text-xl text-ink">In the studio</span>
          <p className="mt-1 text-sm text-ink-soft">Come to me — no travel fee.</p>
          <p className="mt-2 text-sm font-semibold text-taupe-dark">Included</p>
        </button>

        <button
          type="button"
          disabled={!mobileAvailable}
          onClick={() => onLocation("MOBILE")}
          className={`rounded-xl border p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            locationType === "MOBILE"
              ? "border-taupe-dark bg-cream-100 ring-1 ring-taupe-dark"
              : "border-sand bg-white hover:border-sand-dark"
          }`}
        >
          <span className="font-serif text-xl text-ink">Mobile — you</span>
          <p className="mt-1 text-sm text-ink-soft">
            I travel to your location. Fee by area.
          </p>
          <p className="mt-2 text-sm font-semibold text-taupe-dark">
            {mobileAvailable ? "+ travel fee" : "Unavailable"}
          </p>
        </button>
      </div>

      {locationType === "MOBILE" && (
        <div className="mt-6 space-y-4 rounded-xl border border-sand bg-cream-50 p-5">
          <div>
            <label className="label">Your area</label>
            <div className="space-y-2">
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => onZone(z.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                    zoneId === z.id
                      ? "border-taupe-dark bg-white ring-1 ring-taupe-dark"
                      : "border-sand bg-white hover:border-sand-dark"
                  }`}
                >
                  <span className="text-ink">{z.name}</span>
                  <span className="font-medium text-taupe-dark">
                    +{formatMoney(z.feeCents, currency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="address">
              Address we&apos;re travelling to
            </label>
            <textarea
              id="address"
              className="field"
              rows={2}
              placeholder="Street, city, postcode"
              value={address}
              onChange={(e) => onAddress(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Date & time ────────────────────────────────────────────────────
function DateTimeStep({
  serviceId,
  todayStr,
  maxAdvanceDays,
  bookableWeekdays,
  selectedDate,
  slot,
  onSelectDate,
  onSelectSlot,
}: {
  serviceId: string;
  durationMin: number;
  todayStr: string;
  maxAdvanceDays: number;
  bookableWeekdays: number[];
  selectedDate: string | null;
  slot: Slot | null;
  onSelectDate: (d: string) => void;
  onSelectSlot: (s: Slot) => void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const maxDateStr = addDaysStr(todayStr, maxAdvanceDays);

  const [viewY, setViewY] = useState(() => Number(todayStr.slice(0, 4)));
  const [viewM, setViewM] = useState(() => Number(todayStr.slice(5, 7)) - 1);

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/availability?serviceId=${serviceId}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, serviceId]);

  // Build the visible month grid.
  const firstWeekday = new Date(Date.UTC(viewY, viewM, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(viewY, viewM + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(dateStr(viewY, viewM, d));

  const monthKey = `${viewY}-${pad(viewM + 1)}`;
  const canPrev = monthKey > todayStr.slice(0, 7);
  const canNext = `${viewY}-${pad(viewM + 1)}-01` < maxDateStr;

  function shiftMonth(delta: number) {
    const m = viewM + delta;
    const y = viewY + Math.floor(m / 12);
    const nm = ((m % 12) + 12) % 12;
    setViewY(y);
    setViewM(nm);
  }

  return (
    <div>
      <h2 className="text-2xl text-ink">Choose a date &amp; time</h2>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {/* Calendar */}
        <div className="rounded-xl border border-sand bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={!canPrev}
              className="rounded-full px-2 py-1 text-lg text-ink-soft transition-colors hover:bg-cream-100 disabled:opacity-30"
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="font-serif text-lg text-ink">
              {MONTH_NAMES[viewM]} {viewY}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              disabled={!canNext}
              className="rounded-full px-2 py-1 text-lg text-ink-soft transition-colors hover:bg-cream-100 disabled:opacity-30"
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] uppercase tracking-wide text-ink-faint">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <span key={i} />;
              const dayNum = Number(c.slice(8, 10));
              const disabled =
                c < todayStr ||
                c > maxDateStr ||
                !bookableWeekdays.includes(weekdayOf(c));
              const active = selectedDate === c;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectDate(c)}
                  className={`aspect-square rounded-lg text-sm transition-all ${
                    active
                      ? "bg-ink text-white"
                      : disabled
                        ? "text-ink-faint/40"
                        : "text-ink hover:bg-cream-100"
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* Times */}
        <div>
          {!selectedDate && (
            <p className="flex h-full min-h-32 items-center justify-center rounded-xl border border-dashed border-sand-dark px-4 text-center text-sm text-ink-faint">
              Select a date to see available times.
            </p>
          )}
          {selectedDate && (
            <div>
              <p className="mb-3 text-sm font-medium text-ink-soft">
                {prettyDate(selectedDate)}
              </p>
              {loading ? (
                <p className="text-sm text-ink-faint">Loading times…</p>
              ) : slots.length === 0 ? (
                <p className="rounded-lg border border-sand bg-cream-50 px-4 py-6 text-center text-sm text-ink-soft">
                  No times available on this date. Please try another day.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.startISO}
                      type="button"
                      onClick={() => onSelectSlot(s)}
                      className={`rounded-lg border px-2 py-2.5 text-sm transition-all ${
                        slot?.startISO === s.startISO
                          ? "border-ink bg-ink text-white"
                          : "border-sand bg-white text-ink hover:border-sand-dark"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Details ────────────────────────────────────────────────────────
function DetailsStep({
  name,
  email,
  phone,
  notes,
  onName,
  onEmail,
  onPhone,
  onNotes,
}: {
  name: string;
  email: string;
  phone: string;
  notes: string;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onPhone: (v: string) => void;
  onNotes: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl text-ink">Your details</h2>
      <p className="mt-1 text-sm text-ink-soft">
        So I can confirm your appointment and stay in touch.
      </p>
      <div className="mt-5 grid gap-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="field" value={name} onChange={(e) => onName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="field" value={email} onChange={(e) => onEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" type="tel" className="field" value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="Mobile number" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Anything I should know? (optional)</label>
          <textarea id="notes" className="field" rows={3} value={notes} onChange={(e) => onNotes(e.target.value)} placeholder="Inspiration, skin sensitivities, the occasion…" />
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Review ─────────────────────────────────────────────────────────
function ReviewStep({
  service,
  currency,
  locationType,
  zone,
  address,
  selectedDate,
  slot,
  name,
  email,
  phone,
  notes,
  travelFee,
  total,
  deposit,
  depositsEnabled,
}: {
  service: Service;
  currency: string;
  locationType: "STUDIO" | "MOBILE" | null;
  zone: Zone | null;
  address: string;
  selectedDate: string | null;
  slot: Slot | null;
  name: string;
  email: string;
  phone: string;
  notes: string;
  travelFee: number;
  total: number;
  deposit: number;
  depositsEnabled: boolean;
}) {
  return (
    <div>
      <h2 className="text-2xl text-ink">Review &amp; confirm</h2>

      <div className="mt-5 space-y-4 rounded-xl border border-sand bg-cream-50 p-5 text-sm">
        <Row label="Service" value={`${service.name} · ${formatDuration(service.durationMin)}`} />
        <Row
          label="Location"
          value={
            locationType === "MOBILE"
              ? `Mobile — ${zone?.name ?? ""}`
              : "In the studio"
          }
        />
        {locationType === "MOBILE" && address && (
          <Row label="Address" value={address} />
        )}
        <Row
          label="When"
          value={selectedDate && slot ? `${prettyDate(selectedDate)} at ${slot.label}` : "—"}
        />
        <Row label="Name" value={name} />
        <Row label="Contact" value={`${email} · ${phone}`} />
        {notes && <Row label="Notes" value={notes} />}
      </div>

      {/* Pricing */}
      <div className="mt-4 space-y-2 rounded-xl border border-sand bg-white p-5 text-sm">
        <div className="flex justify-between text-ink-soft">
          <span>{service.name}</span>
          <span>{formatMoney(service.priceCents, currency)}</span>
        </div>
        {travelFee > 0 && (
          <div className="flex justify-between text-ink-soft">
            <span>Travel — {zone?.name}</span>
            <span>{formatMoney(travelFee, currency)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-sand pt-2 font-serif text-lg text-ink">
          <span>Total</span>
          <span>{formatMoney(total, currency)}</span>
        </div>
        {deposit > 0 ? (
          <div className="mt-2 rounded-lg bg-cream-100 p-3 text-ink">
            <div className="flex justify-between font-medium">
              <span>Deposit due now</span>
              <span>{formatMoney(deposit, currency)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-ink-soft">
              <span>Balance on the day</span>
              <span>{formatMoney(total - deposit, currency)}</span>
            </div>
          </div>
        ) : (
          <p className="mt-2 rounded-lg bg-cream-100 p-3 text-xs text-ink-soft">
            {depositsEnabled
              ? "No deposit required for this booking. Payment is due on the day."
              : "This is a booking request — no payment now. Anastasia will confirm your appointment shortly."}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-faint">
        Your appointment is a <strong>request</strong> until Anastasia confirms it.
        {deposit > 0
          ? " You'll be taken to secure checkout to pay your deposit; it's refunded if the booking can't be accommodated."
          : ""}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
