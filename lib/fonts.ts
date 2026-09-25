// Curated font pairings the artist can choose from in the manage panel.
// Each theme swaps the heading + body fonts site-wide by overriding the
// --font-cormorant (headings) and --font-montserrat (body) CSS variables.
// The signature script (--font-parisienne) is left untouched.
//
// "classic" is the built-in default already loaded via next/font, so it needs
// no Google Fonts stylesheet. The others are loaded on demand from Google Fonts.

export type FontTheme = {
  id: string;
  label: string;
  heading: string; // CSS font-family value for headings
  body: string; // CSS font-family value for body text
  /** Google Fonts stylesheet URL, or null for the built-in default. */
  url: string | null;
};

export const FONT_THEMES: FontTheme[] = [
  {
    id: "classic",
    label: "Classic — Cormorant & Montserrat (current)",
    heading: "var(--font-cormorant), ui-serif, Georgia, serif",
    body: "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
    url: null,
  },
  {
    id: "modern",
    label: "Modern — Playfair Display & Poppins",
    heading: "'Playfair Display', ui-serif, Georgia, serif",
    body: "'Poppins', ui-sans-serif, system-ui, sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap",
  },
  {
    id: "editorial",
    label: "Editorial — Libre Baskerville & Lato",
    heading: "'Libre Baskerville', ui-serif, Georgia, serif",
    body: "'Lato', ui-sans-serif, system-ui, sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Lato:wght@300;400;700&display=swap",
  },
  {
    id: "chic",
    label: "Chic — Marcellus & Nunito Sans",
    heading: "'Marcellus', ui-serif, Georgia, serif",
    body: "'Nunito Sans', ui-sans-serif, system-ui, sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Marcellus&family=Nunito+Sans:wght@300;400;600;700&display=swap",
  },
  {
    id: "minimal",
    label: "Minimal — Jost",
    heading: "'Jost', ui-sans-serif, system-ui, sans-serif",
    body: "'Jost', ui-sans-serif, system-ui, sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap",
  },
  {
    id: "romantic",
    label: "Romantic — Cormorant & Josefin Sans",
    heading: "var(--font-cormorant), ui-serif, Georgia, serif",
    body: "'Josefin Sans', ui-sans-serif, system-ui, sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;500;600&display=swap",
  },
];

export function getFontTheme(id: string | undefined | null): FontTheme {
  return FONT_THEMES.find((t) => t.id === id) ?? FONT_THEMES[0];
}
