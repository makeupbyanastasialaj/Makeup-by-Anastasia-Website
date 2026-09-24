"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

const NAV = [
  { href: "/manage", label: "Dashboard", exact: true },
  { href: "/manage/bookings", label: "Bookings" },
  { href: "/manage/services", label: "Services" },
  { href: "/manage/zones", label: "Travel zones" },
  { href: "/manage/availability", label: "Availability" },
  { href: "/manage/settings", label: "Settings" },
];

export default function AdminNav({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function onLogout() {
    try {
      await api.logout();
    } catch {
      // ignore — clear client state regardless
    }
    router.replace("/manage/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-sand bg-card px-4 py-3 lg:hidden">
        <span className="script text-2xl text-ink">Anastasia&nbsp;Laj</span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-sand px-3 py-1.5 text-sm"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 w-64 transform border-r border-sand bg-card transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:block`}
      >
        <div className="flex h-full flex-col p-5">
          <div className="mb-8 pt-2">
            <p className="eyebrow">Makeup by</p>
            <p className="script text-3xl text-ink">Anastasia Laj</p>
            <p className="mt-1 text-xs text-ink-faint">Artist dashboard</p>
          </div>

          <nav className="flex-1 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.href, item.exact)
                    ? "bg-ink text-white"
                    : "text-ink-soft hover:bg-cream-100 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-sand pt-4">
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 text-xs text-ink-soft hover:text-ink"
            >
              View public site ↗
            </Link>
            <button
              onClick={onLogout}
              className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs text-ink-soft hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-10 bg-ink/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="h-14 lg:hidden" />
    </>
  );
}
