"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { getFontTheme } from "@/lib/fonts";

/**
 * Applies the artist's saved branding (colours + fonts) to the current page by
 * overriding the Tailwind theme CSS variables. Mounted in both the public
 * (site) layout and the manage panel so the whole product reflects the brand.
 *
 * Colours are set on <html>; fonts are set on <body> because next/font defines
 * the font variables on <body>, and an inline style there takes precedence.
 */
export default function BrandTheme() {
  useEffect(() => {
    let cancelled = false;
    api
      .getPublic()
      .then((d) => {
        if (cancelled) return;
        const s = d.settings;
        const hex = /^#[0-9a-fA-F]{6}$/;
        const root = document.documentElement.style;

        if (hex.test(s.colorBackground || "")) {
          const bg = s.colorBackground;
          root.setProperty("--color-cream", bg);
          root.setProperty("--color-cream-50", `color-mix(in srgb, ${bg} 88%, #ffffff)`);
          root.setProperty("--color-cream-100", `color-mix(in srgb, ${bg} 94%, #ffffff)`);
        }
        if (hex.test(s.colorText || "")) {
          root.setProperty("--color-ink", s.colorText);
        }
        if (hex.test(s.colorAccent || "")) {
          root.setProperty("--color-taupe-dark", s.colorAccent);
          root.setProperty("--color-taupe", `color-mix(in srgb, ${s.colorAccent} 82%, #ffffff)`);
          root.setProperty("--color-gold", s.colorAccent);
        }

        // Fonts
        const font = getFontTheme(s.fontTheme);
        if (font.url && !document.getElementById("brand-font")) {
          const link = document.createElement("link");
          link.id = "brand-font";
          link.rel = "stylesheet";
          link.href = font.url;
          document.head.appendChild(link);
        }
        const body = document.body.style;
        // Guard against self-reference (e.g. "classic" points a var back at itself).
        if (font.heading.includes("--font-cormorant")) body.removeProperty("--font-cormorant");
        else body.setProperty("--font-cormorant", font.heading);
        if (font.body.includes("--font-montserrat")) body.removeProperty("--font-montserrat");
        else body.setProperty("--font-montserrat", font.body);
      })
      .catch(() => {
        /* keep defaults on failure */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
