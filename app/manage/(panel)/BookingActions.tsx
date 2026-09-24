"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type Status = "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED" | "PENDING";

export function BookingActions({
  id,
  status,
  depositPaid,
  variant = "full",
  onChanged,
}: {
  id: string;
  status: string;
  depositPaid?: boolean;
  variant?: "full" | "compact";
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const refresh = () => (onChanged ? onChanged() : router.refresh());

  function act(next: Status, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      try {
        await api.setBookingStatus(id, next);
        refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Action failed.");
      }
    });
  }

  function refund() {
    if (!window.confirm("Refund the deposit for this booking?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await api.refundBooking(id);
        refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Refund failed.");
      }
    });
  }

  const declineMsg = depositPaid
    ? "Decline this request? The paid deposit will be refunded automatically."
    : "Decline this request?";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && (
          <>
            <button disabled={pending} onClick={() => act("CONFIRMED")} className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-black disabled:opacity-50">Confirm</button>
            <button disabled={pending} onClick={() => act("DECLINED", declineMsg)} className="rounded-full border border-red-300 bg-red-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100 disabled:opacity-50">Decline</button>
          </>
        )}
        {status === "CONFIRMED" && (
          <>
            <button disabled={pending} onClick={() => act("COMPLETED")} className="rounded-full border border-sand-dark bg-cream-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-taupe-dark transition hover:bg-cream-50 disabled:opacity-50">Mark completed</button>
            <button disabled={pending} onClick={() => act("CANCELLED", declineMsg)} className="rounded-full border border-red-300 bg-red-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100 disabled:opacity-50">Cancel</button>
          </>
        )}
        {variant === "full" && (status === "DECLINED" || status === "CANCELLED") && (
          <button disabled={pending} onClick={() => act("PENDING")} className="rounded-full border border-sand px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft transition hover:bg-cream-100 disabled:opacity-50">Reopen as pending</button>
        )}
        {variant === "full" && depositPaid && (
          <button disabled={pending} onClick={refund} className="rounded-full border border-sand px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft transition hover:bg-cream-100 disabled:opacity-50">Refund deposit</button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
