import { Suspense } from "react";
import BookClient from "./BookClient";

export const metadata = { title: "Book an appointment — Makeup by Anastasia Laj" };

export default function BookPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-20 text-center text-ink-faint">Loading…</div>}>
      <BookClient />
    </Suspense>
  );
}
