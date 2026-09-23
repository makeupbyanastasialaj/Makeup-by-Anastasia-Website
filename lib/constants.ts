// Shared status constants (SQLite has no native enums, so these are strings).

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const LocationType = {
  STUDIO: "STUDIO",
  MOBILE: "MOBILE",
} as const;
export type LocationType = (typeof LocationType)[keyof typeof LocationType];

export const DepositStatus = {
  NONE: "NONE",
  PENDING: "PENDING",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
} as const;
export type DepositStatus = (typeof DepositStatus)[keyof typeof DepositStatus];

export const DepositType = {
  FIXED: "FIXED",
  PERCENT: "PERCENT",
} as const;

// Statuses that occupy a time slot (so it can't be double-booked).
export const BLOCKING_STATUSES: string[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};
