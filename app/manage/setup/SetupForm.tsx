"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function SetupForm() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .setupInfo()
      .then((info) => {
        if (info.setupComplete) {
          router.replace("/manage/login");
          return;
        }
        setSecret(info.secret ?? "");
        setQr(info.qr ?? "");
        setReady(true);
      })
      .catch(() => setError("Couldn't start setup. Please refresh."));
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.setupComplete({ password, confirm, token, secret });
      router.replace("/manage");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Setup failed. Please try again.");
      setBusy(false);
    }
  }

  if (!ready) return <p className="py-8 text-center text-sm text-ink-faint">Loading…</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirm password</label>
        <input id="confirm" type="password" className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      </div>

      <div className="rounded-xl border border-sand bg-cream-50 p-4">
        <p className="text-sm font-semibold text-ink">Two-factor authentication</p>
        <p className="mt-1 text-xs text-ink-soft">
          Scan this with Google Authenticator, Authy, or 1Password, then enter the 6-digit code it shows.
        </p>
        <div className="mt-3 flex justify-center">
          {qr && <Image src={qr} alt="Authenticator QR code" width={168} height={168} className="rounded-lg border border-sand bg-white p-2" unoptimized />}
        </div>
        <button type="button" onClick={() => setShowSecret((s) => !s)} className="mt-2 w-full text-center text-xs text-taupe-dark underline">
          {showSecret ? "Hide" : "Can't scan? Enter code manually"}
        </button>
        {showSecret && <p className="mt-1 break-all text-center font-mono text-xs text-ink-soft">{secret}</p>}
      </div>

      <div>
        <label className="label" htmlFor="token">6-digit code</label>
        <input id="token" inputMode="numeric" className="field tracking-[0.4em]" value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required />
      </div>

      {error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? "Setting up…" : "Complete setup"}
      </button>
    </form>
  );
}
