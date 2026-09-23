"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import { api, type PublicSettings } from "@/lib/api";

export default function SiteFooter() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    api
      .getPublic()
      .then((d) => setSettings(d.settings))
      .catch(() => {});
  }, []);

  const businessName = settings?.businessName ?? "Makeup by Anastasia Laj";
  const ig = settings?.instagram?.replace(/^@/, "");

  return (
    <footer className="mt-24 border-t border-sand/70 bg-cream-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <BrandMark size="sm" href="/" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
            Bridal &amp; special-occasion makeup artistry. In-studio or travelling to you.
          </p>
        </div>

        <div className="text-sm text-ink-soft">
          <h4 className="eyebrow mb-3 text-ink">Explore</h4>
          <ul className="space-y-2">
            <li><Link href="/#services" className="hover:text-ink">Services &amp; pricing</Link></li>
            <li><Link href="/book" className="hover:text-ink">Book an appointment</Link></li>
            <li><Link href="/admin" className="hover:text-ink">Artist login</Link></li>
          </ul>
        </div>

        <div className="text-sm text-ink-soft">
          <h4 className="eyebrow mb-3 text-ink">Get in touch</h4>
          <ul className="space-y-2">
            {settings?.contactEmail && (
              <li><a href={`mailto:${settings.contactEmail}`} className="hover:text-ink">{settings.contactEmail}</a></li>
            )}
            {settings?.contactPhone && (
              <li><a href={`tel:${settings.contactPhone}`} className="hover:text-ink">{settings.contactPhone}</a></li>
            )}
            {ig && (
              <li>
                <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                  @{ig}
                </a>
              </li>
            )}
            {!settings?.contactEmail && !settings?.contactPhone && !ig && (
              <li className="text-ink-faint">Contact details coming soon.</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-sand/60 py-5 text-center text-xs text-ink-faint">
        © {year} {businessName}. All rights reserved.
      </div>
    </footer>
  );
}
