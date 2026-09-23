"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type PublicBundle } from "@/lib/api";
import BookingWizard from "./BookingWizard";

export default function BookClient() {
  const searchParams = useSearchParams();
  const preselect = searchParams.get("service");
  const [data, setData] = useState<PublicBundle | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.getPublic().then(setData).catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-3xl text-ink">Something went wrong</h1>
        <p className="mt-4 text-ink-soft">Please refresh the page and try again.</p>
        <Link href="/" className="btn btn-outline mt-8">Back home</Link>
      </div>
    );
  }

  if (!data) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-ink-faint">Loading availability…</div>;
  }

  if (data.services.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-3xl text-ink">Booking coming soon</h1>
        <p className="mt-4 text-ink-soft">Services haven&apos;t been set up yet. Please check back shortly.</p>
        <Link href="/" className="btn btn-outline mt-8">Back home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 text-center">
        <p className="eyebrow">Book with Anastasia</p>
        <h1 className="mt-2 text-4xl text-ink">Reserve your appointment</h1>
      </div>
      <BookingWizard
        services={data.services}
        zones={data.zones}
        currency={data.settings.currency}
        depositsEnabled={data.depositsEnabled}
        depositDefault={{ type: data.settings.depositType, value: data.settings.depositValue }}
        bookableWeekdays={data.bookableWeekdays}
        todayStr={data.todayStr}
        maxAdvanceDays={data.settings.maxAdvanceDays}
        minNoticeHours={data.settings.minNoticeHours}
        preselectServiceId={preselect}
      />
    </div>
  );
}
