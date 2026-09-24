import { app, HttpRequest } from "@azure/functions";
import { getSettings, updateSettings } from "../lib/repo";
import {
  generateTotpSecret,
  totpQrDataUrl,
  verifyTotp,
  hashPassword,
  verifyPassword,
  signSession,
} from "../lib/auth";
import { ok, badRequest, parseBody, isAdmin, sessionCookie, clearSessionCookie, safe } from "../lib/http";

// GET /api/admin/session — how the frontend decides where to route.
app.http("adminSession", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "admin/session",
  handler: safe(async (request: HttpRequest) => {
    const settings = await getSettings();
    return ok({
      setupComplete: settings.setupComplete,
      authenticated: await isAdmin(request),
      totpEnabled: settings.totpEnabled,
      businessName: settings.businessName,
    });
  }),
});

// GET /api/admin/setup — issue a fresh TOTP secret + QR for first-run setup.
app.http("adminSetupInfo", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "admin/setup",
  handler: safe(async () => {
    const settings = await getSettings();
    if (settings.setupComplete) return ok({ setupComplete: true });
    const secret = generateTotpSecret();
    const account = settings.contactEmail || "Anastasia Laj";
    const qr = await totpQrDataUrl(secret, account, settings.businessName);
    return ok({ setupComplete: false, secret, qr });
  }),
});

// POST /api/admin/setup — complete first-run setup.
app.http("adminSetupComplete", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "admin/setup-complete",
  handler: async (request: HttpRequest) => {
    const settings = await getSettings();
    if (settings.setupComplete) return badRequest("Setup has already been completed.");
    const body = await parseBody<{ password?: string; confirm?: string; token?: string; secret?: string }>(request);
    const { password = "", confirm = "", token = "", secret = "" } = body;

    if (password.length < 8) return badRequest("Password must be at least 8 characters.");
    if (password !== confirm) return badRequest("Passwords don't match.");
    if (!verifyTotp(token, secret)) {
      return badRequest("That 6-digit code isn't right. Scan the QR code and try again.");
    }
    await updateSettings({
      adminPasswordHash: await hashPassword(password),
      totpSecret: secret,
      totpEnabled: true,
      setupComplete: true,
    });
    const jwt = await signSession();
    return ok({ ok: true }, { cookies: [sessionCookie(jwt)] });
  },
});

// POST /api/admin/login
app.http("adminLogin", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "admin/login",
  handler: async (request: HttpRequest) => {
    const settings = await getSettings();
    if (!settings.setupComplete) return badRequest("Please complete first-time setup first.");
    const body = await parseBody<{ password?: string; token?: string }>(request);
    const passOk = await verifyPassword(body.password ?? "", settings.adminPasswordHash);
    if (!passOk) return badRequest("Incorrect password.");
    if (settings.totpEnabled && !verifyTotp(body.token ?? "", settings.totpSecret)) {
      return badRequest("Incorrect authenticator code.");
    }
    const jwt = await signSession();
    return ok({ ok: true }, { cookies: [sessionCookie(jwt)] });
  },
});

// POST /api/admin/logout
app.http("adminLogout", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "admin/logout",
  handler: async () => {
    return ok({ ok: true }, { cookies: [clearSessionCookie()] });
  },
});
