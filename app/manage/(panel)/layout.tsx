"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AdminNav from "./AdminNav";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok">("checking");
  const [businessName, setBusinessName] = useState("Makeup by Anastasia Laj");

  useEffect(() => {
    api
      .session()
      .then((s) => {
        if (!s.setupComplete) {
          router.replace("/manage/setup");
          return;
        }
        if (!s.authenticated) {
          router.replace("/manage/login");
          return;
        }
        setBusinessName(s.businessName);
        setState("ok");
      })
      .catch(() => router.replace("/manage/login"));
  }, [router]);

  if (state === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-faint">Loading…</div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <AdminNav businessName={businessName} />
      <div className="flex-1 lg:pl-64">
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
