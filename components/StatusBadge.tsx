import { STATUS_LABELS } from "@/lib/constants";

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  CONFIRMED: "bg-green-100 text-green-800 border-green-300",
  DECLINED: "bg-red-100 text-red-700 border-red-300",
  CANCELLED: "bg-stone-200 text-stone-600 border-stone-300",
  COMPLETED: "bg-cream-100 text-taupe-dark border-sand-dark",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide ${
        STYLES[status] ?? "bg-cream-100 text-ink-soft border-sand"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
