"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();
  const [totpEnabled, setTotpEnabled] = useState(true);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .session()
      .then((s) => {
        if (!s.setupComplete) {
          router.replace("/admin/setup");
          return;
        }
        if (s.authenticated) {
          router.replace("/admin");
          return;
        }
        setTotpEnabled(s.totpEnabled);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login({ password, token });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  if (!ready) return <p className="py-6 text-center text-sm text-ink-faint">Loading…</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus required />
      </div>
      {totpEnabled && (
        <div>
          <label className="label" htmlFor="token">Authenticator code</label>
          <input id="token" inputMode="numeric" className="field tracking-[0.4em]" value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required />
        </div>
      )}
      {error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
