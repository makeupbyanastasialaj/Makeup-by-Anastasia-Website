# Makeup by Anastasia Laj — Booking Website

An elegant, brand-matched booking site for a makeup artistry business, with a private
admin dashboard and calendar. Customers choose a service, pick **in-studio** or **mobile
(travel to them, with a per-area fee)**, choose a time from live availability, and submit a
request — optionally secured by an online deposit. You review and confirm every booking from
your own calendar, protected by a password and two-factor authentication.

## 👉 To put it live, follow [AZURE_DEPLOY.md](AZURE_DEPLOY.md)
That's the simple, step-by-step Azure walkthrough.

---

## Architecture (built for Azure)

| Piece | What it is |
|---|---|
| **Web pages** | A static site (Next.js exported to plain HTML/CSS/JS) in `out/` |
| **Backend API** | **Azure Functions** app in `api/` — all bookings, admin, auth and Stripe logic |
| **Database** | **Azure Table Storage** (no server to manage) |
| **Hosting** | **Azure Static Web Apps** ties the pages + API together on one URL |

The frontend calls the backend at `/api/*`. On Azure Static Web Apps these share one domain,
so admin login cookies just work.

## What's included

**For your customers**
- Homepage with your services, pricing and travel areas
- 5-step booking flow: service → studio-or-mobile → live date/time → details → confirm
- Studio or mobile booking, with the travel fee added automatically by area
- Optional deposit payment via Stripe
- Confirmation page + a link to check booking status any time

**For you (admin, at `/admin`)**
- Password + authenticator-app (2FA) login
- Month **calendar view** of all bookings
- Pending requests to **approve or decline** (declining auto-refunds a paid deposit)
- Manage services, travel zones, weekly working hours, holidays, and all settings

---

## Project layout
```
app/           Next.js pages (the website) — static export to out/
components/     Shared UI (brand mark, header, footer, badges)
lib/            Client helpers: api.ts (calls the backend), money, time formatting
api/            Azure Functions backend (TypeScript)
  src/functions/  HTTP endpoints (public, auth, admin…)
  src/lib/        Table Storage access, availability engine, auth, Stripe
public/         Logo + staticwebapp.config.json (Azure routing)
AZURE_DEPLOY.md Simple deployment walkthrough
```

## Building locally (for developers)
```bash
# Frontend (produces the static site in out/)
npm install
npm run build

# Backend
cd api
npm install
npm run build
```
Running the backend locally needs the Azure Functions Core Tools and the Storage emulator
(Azurite); production doesn't. The app is designed to be tested on Azure — see AZURE_DEPLOY.md.

## Settings the backend needs (set in Azure, see AZURE_DEPLOY.md Step 4)
- `AZURE_STORAGE_CONNECTION_STRING` — your Table Storage connection string
- `AUTH_SECRET` — a long random string for signing admin logins
- `SITE_URL` — your live site URL (for Stripe redirects)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — only if taking deposits

## Tech
Next.js (static export) · TypeScript · Tailwind CSS v4 · Azure Functions · Azure Table Storage ·
Azure Static Web Apps · Stripe · TOTP 2FA.
