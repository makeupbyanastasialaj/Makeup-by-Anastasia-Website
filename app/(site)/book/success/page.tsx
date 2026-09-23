import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export const metadata = { title: "Booking received — Makeup by Anastasia Laj" };

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-20 text-center text-ink-faint">Loading…</div>}>
      <SuccessClient />
    </Suspense>
  );
}
