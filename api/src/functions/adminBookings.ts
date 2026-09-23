import { app, HttpRequest } from "@azure/functions";
import { listBookings, getBooking, updateBooking, getSettings } from "../lib/repo";
import { refundDeposit } from "../lib/stripe";
import { BookingStatus, DepositStatus } from "../lib/constants";
import { ok, badRequest, json, unauthorized, isAdmin, parseBody } from "../lib/http";

const VALID_STATUSES = Object.values(BookingStatus) as string[];

// GET /api/admin/bookings?filter=upcoming|pending|past|all
app.http("adminBookingsList", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "admin/bookings",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const filter = request.query.get("filter") ?? "upcoming";
    const now = new Date();
    let bookings = await listBookings();

    if (filter === "pending") {
      bookings = bookings.filter((b) => b.status === "PENDING");
    } else if (filter === "past") {
      bookings = bookings.filter((b) => new Date(b.startAt) < now).reverse();
    } else if (filter === "all") {
      bookings = bookings.reverse();
    } else {
      bookings = bookings.filter(
        (b) => new Date(b.startAt) >= now && ["PENDING", "CONFIRMED"].includes(b.status),
      );
    }
    const settings = await getSettings();
    return ok({ bookings, timezone: settings.timezone });
  },
});

// GET /api/admin/calendar?month=YYYY-MM  (+ pending list + stats)
app.http("adminCalendar", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "admin/calendar",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const now = new Date();
    const all = await listBookings();
    const pending = all.filter((b) => b.status === "PENDING" && new Date(b.startAt) >= now);
    const upcomingConfirmed = all.filter(
      (b) => b.status === "CONFIRMED" && new Date(b.startAt) >= now,
    ).length;
    const calendarBookings = all.filter((b) =>
      ["PENDING", "CONFIRMED", "COMPLETED"].includes(b.status),
    );
    const settings = await getSettings();
    return ok({
      bookings: calendarBookings,
      pending,
      upcomingConfirmed,
      timezone: settings.timezone,
    });
  },
});

// GET /api/admin/bookings/{id}
app.http("adminBookingDetail", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "admin/bookings/{id}",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const b = await getBooking(request.params.id);
    if (!b) return json(404, { error: "Not found" });
    const settings = await getSettings();
    return ok({ booking: b, timezone: settings.timezone });
  },
});

// POST /api/admin/booking-status  { id, status }
app.http("adminBookingStatus", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "admin/booking-status",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { id, status } = await parseBody<{ id?: string; status?: string }>(request);
    if (!id || !status || !VALID_STATUSES.includes(status)) return badRequest("Invalid request.");
    const booking = await getBooking(id);
    if (!booking) return badRequest("Booking not found.");

    if (
      (status === "DECLINED" || status === "CANCELLED") &&
      booking.depositStatus === DepositStatus.PAID &&
      booking.stripePaymentIntentId
    ) {
      try {
        await refundDeposit(booking.stripePaymentIntentId);
        await updateBooking(id, { depositStatus: DepositStatus.REFUNDED });
      } catch (err) {
        console.error("Refund failed:", err);
        return badRequest(
          "Couldn't process the refund automatically. Refund manually in Stripe, then try again.",
        );
      }
    }
    await updateBooking(id, { status });
    return ok({ ok: true });
  },
});

// POST /api/admin/booking-refund  { id }
app.http("adminBookingRefund", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "admin/booking-refund",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { id } = await parseBody<{ id?: string }>(request);
    if (!id) return badRequest("Invalid request.");
    const booking = await getBooking(id);
    if (!booking) return badRequest("Booking not found.");
    if (booking.depositStatus !== DepositStatus.PAID || !booking.stripePaymentIntentId) {
      return badRequest("No paid deposit to refund.");
    }
    try {
      await refundDeposit(booking.stripePaymentIntentId);
      await updateBooking(id, { depositStatus: DepositStatus.REFUNDED });
    } catch (err) {
      console.error("Refund failed:", err);
      return badRequest("Refund failed. Check Stripe.");
    }
    return ok({ ok: true });
  },
});

// POST /api/admin/booking-notes  { id, notes }
app.http("adminBookingNotes", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "admin/booking-notes",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { id, notes } = await parseBody<{ id?: string; notes?: string }>(request);
    if (!id) return badRequest("Invalid request.");
    await updateBooking(id, { adminNotes: (notes ?? "").slice(0, 2000) });
    return ok({ ok: true });
  },
});
