import Link from "next/link";

export const metadata = { title: "Checkout cancelled — Makeup by Anastasia Laj" };

export default function CancelledPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl text-ink">Deposit not completed</h1>
      <p className="mt-4 text-ink-soft">
        No payment was taken, so your slot hasn&apos;t been held yet. You can pick up where you
        left off and try again.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/book" className="btn btn-primary">Try booking again</Link>
        <Link href="/" className="btn btn-outline">Back home</Link>
      </div>
    </div>
  );
}
