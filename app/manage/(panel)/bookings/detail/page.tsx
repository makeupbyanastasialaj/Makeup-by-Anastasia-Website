import { Suspense } from "react";
import DetailClient from "./DetailClient";

export const metadata = { title: "Booking — Admin" };

export default function BookingDetailPage() {
  return (
    <Suspense fallback={<p className="text-ink-faint">Loading…</p>}>
      <DetailClient />
    </Suspense>
  );
}
