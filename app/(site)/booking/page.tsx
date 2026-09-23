import { Suspense } from "react";
import BookingClient from "./BookingClient";

export const metadata = { title: "Your booking — Makeup by Anastasia Laj" };

export default function BookingLookupPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-20 text-center text-ink-faint">Loading…</div>}>
      <BookingClient />
    </Suspense>
  );
}
