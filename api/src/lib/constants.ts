export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;

export const LocationType = { STUDIO: "STUDIO", MOBILE: "MOBILE" } as const;

export const DepositStatus = {
  NONE: "NONE",
  PENDING: "PENDING",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
} as const;

// Statuses that occupy a time slot (can't be double-booked).
export const BLOCKING_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
