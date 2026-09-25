"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getCachedPublic } from "@/lib/api";
import BrandMark from "./BrandMark";

export default function SiteHeader() {
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState("Makeup by Anastasia Laj");

  useEffect(() => {
    const apply = (s: { logoImageUrl: string; logoDataUrl: string; businessName: string }) => {
      setLogo(s.logoImageUrl || s.logoDataUrl || null);
      setName(s.businessName || "Makeup by Anastasia Laj");
    };
    const cached = getCachedPublic();
    if (cached) apply(cached.settings);
    api.getPublic().then((d) => apply(d.settings)).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-sand/70 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {logo ? (
          <Link href="/" aria-label={`${name} — home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={name} className="h-11 w-auto object-contain sm:h-12" />
          </Link>
        ) : (
          <BrandMark size="sm" />
        )}
        <nav className="flex items-center gap-6">
          <Link
            href="/#services"
            className="hidden text-sm tracking-wide text-ink-soft transition-colors hover:text-ink sm:inline"
          >
            Services
          </Link>
          <Link
            href="/#how"
            className="hidden text-sm tracking-wide text-ink-soft transition-colors hover:text-ink sm:inline"
          >
            How it works
          </Link>
          <Link href="/book" className="btn btn-primary !px-5 !py-2.5 text-xs">
            Book now
          </Link>
        </nav>
      </div>
    </header>
  );
}
