"use client";

import { useEffect } from "react";
import { api, getCachedPublic, type PublicSettings } from "@/lib/api";
import { getFontTheme } from "@/lib/fonts";

/**
 * Applies the artist's saved branding (colours + fonts) by overriding the
 * Tailwind theme CSS variables. Applies the cached values instantly (no flash)
 * then refreshes from the network. Mounted in both the public site and the
 * manage panel.
 */
function applyTheme(s: PublicSettings) {
  const hex = /^#[0-9a-fA-F]{6}$/;
  const root = document.documentElement.style;

  if (hex.test(s.colorBackground || "")) {
    const bg = s.colorBackground;
    root.setProperty("--color-cream", bg);
    root.setProperty("--color-cream-50", `color-mix(in srgb, ${bg} 88%, #ffffff)`);
    root.setProperty("--color-cream-100", `color-mix(in srgb, ${bg} 94%, #ffffff)`);
  }
  if (hex.test(s.colorText || "")) root.setProperty("--color-ink", s.colorText);
  if (hex.test(s.colorAccent || "")) {
    root.setProperty("--color-taupe-dark", s.colorAccent);
    root.setProperty("--color-taupe", `color-mix(in srgb, ${s.colorAccent} 82%, #ffffff)`);
    root.setProperty("--color-gold", s.colorAccent);
  }

  const font = getFontTheme(s.fontTheme);
  if (font.url && !document.getElementById("brand-font")) {
    const link = document.createElement("link");
    link.id = "brand-font";
    link.rel = "stylesheet";
    link.href = font.url;
    document.head.appendChild(link);
  }
  const body = document.body.style;
  if (font.heading.includes("--font-cormorant")) body.removeProperty("--font-cormorant");
  else body.setProperty("--font-cormorant", font.heading);
  if (font.body.includes("--font-montserrat")) body.removeProperty("--font-montserrat");
  else body.setProperty("--font-montserrat", font.body);
}

export default function BrandTheme() {
  useEffect(() => {
    const cached = getCachedPublic();
    if (cached) applyTheme(cached.settings);
    api
      .getPublic()
      .then((d) => applyTheme(d.settings))
      .catch(() => {
        /* keep defaults on failure */
      });
  }, []);

  return null;
}
