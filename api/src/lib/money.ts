// Money is stored as integer minor units (pence/cents).

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

export function formatMoney(cents: number, currency = "GBP"): string {
  const symbols: Record<string, string> = { GBP: "£", EUR: "€", USD: "$", AUD: "$", CAD: "$", NZD: "$" };
  const sym = symbols[currency] ?? currency + " ";
  const whole = Math.floor(Math.abs(cents) / 100);
  const frac = String(Math.abs(cents) % 100).padStart(2, "0");
  return `${cents < 0 ? "-" : ""}${sym}${whole}.${frac}`;
}
