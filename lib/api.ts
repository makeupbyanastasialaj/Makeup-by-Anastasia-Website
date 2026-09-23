// Client-side wrapper around the Azure Functions API served at /api.
// Same-origin on Azure Static Web Apps, so cookies flow automatically.

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? "Something went wrong", res.status);
  }
  return data as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return req<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

// ─── Shared types ─────────────────────────────────────────────────────────
export type Service = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  depositCents: number;
  active: boolean;
  sortOrder: number;
};
export type Zone = { id: string; name: string; feeCents: number; active: boolean; sortOrder: number };
export type PublicSettings = {
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  instagram: string;
  currency: string;
  timezone: string;
  studioAddress: string;
  depositType: string;
  depositValue: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
};
export type PublicBundle = {
  settings: PublicSettings;
  services: Service[];
  zones: Zone[];
  depositsEnabled: boolean;
  bookableWeekdays: number[];
  todayStr: string;
};
export type Slot = { minutes: number; label: string; startISO: string };
export type BookingStatusView = {
  publicId: string;
  serviceName: string;
  startAt: string;
  locationType: string;
  zoneName: string;
  address: string;
  status: string;
  totalCents: number;
  depositCents: number;
  depositStatus: string;
  currency: string;
  timezone: string;
  contactPhone: string;
};
export type Booking = {
  id: string;
  publicId: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  locationType: string;
  zoneId: string;
  zoneName: string;
  address: string;
  startAt: string;
  endAt: string;
  status: string;
  notes: string;
  adminNotes: string;
  priceCents: number;
  travelFeeCents: number;
  depositCents: number;
  totalCents: number;
  currency: string;
  depositStatus: string;
  createdAt: string;
};

// ─── Public ────────────────────────────────────────────────────────────────
export const api = {
  getPublic: () => req<PublicBundle>("/public"),
  getAvailability: (serviceId: string, date: string) =>
    req<{ slots: Slot[] }>(`/availability?serviceId=${encodeURIComponent(serviceId)}&date=${date}`),
  createBooking: (input: unknown) =>
    post<{ ok: true; checkoutUrl: string | null; publicId: string }>("/bookings", input),
  getBookingStatus: (publicId: string) =>
    req<BookingStatusView>(`/bookings/${encodeURIComponent(publicId)}`),

  // Auth
  session: () =>
    req<{ setupComplete: boolean; authenticated: boolean; totpEnabled: boolean; businessName: string }>(
      "/admin/session",
    ),
  setupInfo: () => req<{ setupComplete: boolean; secret?: string; qr?: string }>("/admin/setup"),
  setupComplete: (body: { password: string; confirm: string; token: string; secret: string }) =>
    post<{ ok: true }>("/admin/setup-complete", body),
  login: (body: { password: string; token: string }) => post<{ ok: true }>("/admin/login", body),
  logout: () => post<{ ok: true }>("/admin/logout"),

  // Admin bookings
  calendar: () =>
    req<{ bookings: Booking[]; pending: Booking[]; upcomingConfirmed: number; timezone: string }>("/admin/calendar"),
  bookings: (filter: string) => req<{ bookings: Booking[]; timezone: string }>(`/admin/bookings?filter=${filter}`),
  booking: (id: string) => req<{ booking: Booking; timezone: string }>(`/admin/bookings/${id}`),
  setBookingStatus: (id: string, status: string) => post<{ ok: true }>("/admin/booking-status", { id, status }),
  refundBooking: (id: string) => post<{ ok: true }>("/admin/booking-refund", { id }),
  saveBookingNotes: (id: string, notes: string) => post<{ ok: true }>("/admin/booking-notes", { id, notes }),

  // Admin services / zones
  adminServices: () => req<{ services: Service[] }>("/admin/services"),
  saveService: (s: Partial<Service>) => post<{ ok: true; service: Service }>("/admin/service-save", s),
  deleteService: (id: string) => post<{ ok: true }>("/admin/service-delete", { id }),
  adminZones: () => req<{ zones: Zone[] }>("/admin/zones"),
  saveZone: (z: Partial<Zone>) => post<{ ok: true; zone: Zone }>("/admin/zone-save", z),
  deleteZone: (id: string) => post<{ ok: true }>("/admin/zone-delete", { id }),

  // Admin availability
  availability: () =>
    req<{
      timezone: string;
      rules: { dayOfWeek: number; startMin: number; endMin: number; active: boolean }[];
      blocked: { id: string; label: string; reason: string }[];
    }>("/admin/availability"),
  saveRules: (rules: { dayOfWeek: number; startMin: number; endMin: number }[]) =>
    post<{ ok: true }>("/admin/availability-rules", { rules }),
  addBlock: (body: { startISO: string; endISO: string; reason: string }) =>
    post<{ ok: true }>("/admin/availability-block", body),
  removeBlock: (id: string) => post<{ ok: true }>("/admin/availability-unblock", { id }),

  // Admin settings
  adminSettings: () =>
    req<{ stripeEnabled: boolean; settings: Record<string, unknown> }>("/admin/settings"),
  saveSettings: (s: Record<string, unknown>) => post<{ ok: true }>("/admin/settings-save", s),
  changePassword: (body: { current: string; next: string }) => post<{ ok: true }>("/admin/password", body),
};
