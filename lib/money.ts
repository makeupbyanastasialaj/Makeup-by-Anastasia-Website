// All money is stored as integer minor units (cents/pence) to avoid float bugs.

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
  AUD: "$",
  CAD: "$",
  NZD: "$",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency + " ";
}

/** Format integer minor units as a display string, e.g. 2500 -> "£25.00". */
export function formatMoney(cents: number, currency = "GBP"): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  const body = `${currencySymbol(currency)}${whole.toLocaleString()}.${frac}`;
  return negative ? `-${body}` : body;
}

/** Parse a user-typed amount ("25", "25.50", "£25.50") into minor units. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "").trim();
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/**
 * Resolve the deposit for a booking. Uses the service's own deposit when set,
 * otherwise the business default (fixed amount or percent of the total).
 */
export function resolveDepositCents(args: {
  serviceDepositCents: number;
  totalCents: number;
  defaultType: string; // FIXED | PERCENT
  defaultValue: number; // cents if FIXED, 0-100 if PERCENT
}): number {
  if (args.serviceDepositCents > 0) {
    return Math.min(args.serviceDepositCents, args.totalCents);
  }
  const deposit =
    args.defaultType === "PERCENT"
      ? Math.round((args.totalCents * args.defaultValue) / 100)
      : args.defaultValue;
  return Math.max(0, Math.min(deposit, args.totalCents));
}
