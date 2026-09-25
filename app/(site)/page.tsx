"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type PublicBundle } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { formatDuration } from "@/lib/time";

export default function HomePage() {
  const [data, setData] = useState<PublicBundle | null>(null);

  useEffect(() => {
    api.getPublic().then(setData).catch(() => setData(null));
  }, []);

  const currency = data?.settings.currency ?? "GBP";
  const depositsOn = data?.depositsEnabled ?? false;
  const services = data?.services ?? [];
  const zones = data?.zones ?? [];

  const s = data?.settings;
  const businessName = s?.businessName || "Makeup by Anastasia Laj";
  const logoUrl = s?.logoImageUrl || s?.logoDataUrl || "/logo.png";
  const heroEyebrow = s?.heroEyebrow || "Bridal & Occasion Makeup Artistry";
  const heroTitle = s?.heroTitle || "Effortless elegance,";
  const heroHighlight = s?.heroHighlight || "beautifully you";
  const heroSubtitle =
    s?.heroSubtitle ||
    "Timeless, long-wearing makeup for weddings, events and every occasion worth remembering — in my studio, or travelling to you.";

  const aboutTitle = s?.aboutTitle || "About me";
  const aboutText = s?.aboutText || "";
  const aboutImageUrl = s?.aboutImageUrl || "";
  const aboutParas = aboutText.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
  const showAbout = aboutParas.length > 0 || !!aboutImageUrl;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={businessName} width={340} height={340} className="mb-2 h-auto w-56 object-contain sm:w-72" />
          {heroEyebrow && <p className="eyebrow">{heroEyebrow}</p>}
          <h1 className="mt-4 text-4xl leading-tight text-ink sm:text-5xl md:text-6xl">
            {heroTitle}
            {heroHighlight && (
              <>
                <br />
                <span className="script text-taupe-dark">{heroHighlight}</span>
              </>
            )}
          </h1>
          {heroSubtitle && (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">{heroSubtitle}</p>
          )}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/book" className="btn btn-primary">Book your appointment</Link>
            <Link href="#services" className="btn btn-outline">View services</Link>
          </div>
          <p className="mt-5 text-xs tracking-wide text-ink-faint">
            {depositsOn
              ? "Secure your date with a small deposit · Balance due on the day"
              : "Request your date · Confirmation within 24 hours"}
          </p>
        </div>
      </section>

      {/* About */}
      {showAbout && (
        <section id="about" className="border-t border-sand/60 bg-cream-50">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:gap-14 md:py-20">
            <div className="order-2 md:order-1">
              <h2 className="text-4xl leading-tight text-ink sm:text-5xl">{aboutTitle}</h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-soft">
                {aboutParas.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
            {aboutImageUrl && (
              <div className="order-1 md:order-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aboutImageUrl}
                  alt={aboutTitle}
                  className="mx-auto aspect-[3/4] w-full max-w-sm rounded-2xl object-cover shadow-sm"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how" className="border-y border-sand/60 bg-cream-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <p className="eyebrow">Simple &amp; seamless</p>
            <h2 className="mt-2 text-3xl text-ink sm:text-4xl">How it works</h2>
          </div>
          <ol className="grid gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "Choose your look", d: "Pick your service and tell me whether you'd like to come to the studio or have me travel to you." },
              { n: "02", t: "Pick a time", d: "Choose from my live availability. You'll see everything that's open — no back-and-forth." },
              {
                n: "03",
                t: depositsOn ? "Secure with a deposit" : "Send your request",
                d: depositsOn
                  ? "Pay a small deposit to hold your slot. I'll confirm your booking, with the balance due on the day."
                  : "I'll review your request and confirm your appointment, usually within 24 hours.",
              },
            ].map((s) => (
              <li key={s.n} className="card p-7">
                <span className="script text-4xl text-taupe">{s.n}</span>
                <h3 className="mt-3 text-2xl text-ink">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <p className="eyebrow">The menu</p>
          <h2 className="mt-2 text-3xl text-ink sm:text-4xl">Services &amp; pricing</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-ink-soft">
            Every appointment includes a consultation to make sure your look is perfectly you.
            Lashes included where noted.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className="card flex flex-col p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-2xl text-ink">{s.name}</h3>
                <span className="whitespace-nowrap font-serif text-xl text-taupe-dark">
                  {formatMoney(s.priceCents, currency)}
                </span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-widest text-ink-faint">{formatDuration(s.durationMin)}</p>
              {s.description && <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{s.description}</p>}
              <Link href={`/book?service=${s.id}`} className="btn btn-outline mt-5 !py-2.5 text-xs">Book this</Link>
            </div>
          ))}
          {data && services.length === 0 && (
            <p className="col-span-full text-center text-ink-faint">Services will appear here soon.</p>
          )}
        </div>
      </section>

      {/* Location options */}
      <section className="border-t border-sand/60 bg-cream-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <p className="eyebrow">Two ways to be pampered</p>
            <h2 className="mt-2 text-3xl text-ink sm:text-4xl">Studio or mobile</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card p-8">
              <h3 className="text-2xl text-ink">In the studio</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Relax in a calm, dedicated space with professional lighting.
                {data?.settings.studioAddress ? ` Located in ${data.settings.studioAddress}.` : ""}
              </p>
              <p className="mt-4 text-sm font-semibold text-taupe-dark">No travel fee</p>
            </div>
            <div className="card p-8">
              <h3 className="text-2xl text-ink">Mobile — I come to you</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Perfect for wedding mornings and getting ready with your group. A travel fee
                applies based on your area:
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
                {zones.map((z) => (
                  <li key={z.id} className="flex justify-between border-b border-sand/50 pb-1.5">
                    <span>{z.name}</span>
                    <span className="font-medium text-taupe-dark">+{formatMoney(z.feeCents, currency)}</span>
                  </li>
                ))}
                {data && zones.length === 0 && <li className="text-ink-faint">Travel areas coming soon.</li>}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="script text-4xl text-taupe-dark sm:text-5xl">Ready to feel radiant?</p>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">
          Let&apos;s create a look you&apos;ll love. Booking takes about two minutes.
        </p>
        <Link href="/book" className="btn btn-primary mt-8">Book your appointment</Link>
      </section>
    </>
  );
}
