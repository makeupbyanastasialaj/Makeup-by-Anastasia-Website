import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat, Parisienne } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});
const parisienne = Parisienne({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-parisienne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Makeup by Anastasia Laj — Bridal & Occasion Makeup Artistry",
  description:
    "Luxury bridal and special-occasion makeup by Anastasia Laj. Book your appointment in-studio or mobile to your location.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${montserrat.variable} ${parisienne.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
