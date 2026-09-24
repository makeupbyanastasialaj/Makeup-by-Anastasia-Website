"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

/**
 * Applies the artist's chosen brand colours (set in the manage panel) to the
 * public site by overriding the Tailwind theme CSS variables on :root.
 * Mounted in the public (site) layout only — the manage panel keeps its
 * default, always-readable palette.
 */
export default function BrandTheme() {
  useEffect(() => {
    let cancelled = false;
    api
      .getPublic()
      .then((d) => {
        if (cancelled) return;
        const { colorBackground: bg, colorText: ink, colorAccent: accent } = d.settings;
        const root = document.documentElement.style;
        const hex = /^#[0-9a-fA-F]{6}$/;
        if (hex.test(bg || "")) {
          root.setProperty("--color-cream", bg);
          root.setProperty("--color-cream-50", `color-mix(in srgb, ${bg} 88%, #ffffff)`);
          root.setProperty("--color-cream-100", `color-mix(in srgb, ${bg} 94%, #ffffff)`);
        }
        if (hex.test(ink || "")) {
          root.setProperty("--color-ink", ink);
        }
        if (hex.test(accent || "")) {
          root.setProperty("--color-taupe-dark", accent);
          root.setProperty("--color-taupe", `color-mix(in srgb, ${accent} 82%, #ffffff)`);
          root.setProperty("--color-gold", accent);
        }
      })
      .catch(() => {
        /* keep default palette on failure */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
