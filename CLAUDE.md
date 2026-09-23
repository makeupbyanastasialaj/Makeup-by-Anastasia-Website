@AGENTS.md

# Makeup by Anastasia Laj — booking platform

Serverless booking site deployed on **Azure Static Web Apps**:
- **Frontend**: Next.js (App Router) **static export** (`output: "export"`) → `out/`. All pages are
  client components that fetch data from the API. No server components read data, no server actions,
  no API routes (they can't exist in a static export).
- **Backend**: **Azure Functions** app in `api/` (TypeScript, v4 programming model). Every endpoint is
  an `app.http(...)` registration under `api/src/functions/`.
- **Database**: **Azure Table Storage** via `@azure/data-tables` (see `api/src/lib/repo.ts`).

## How the two halves talk
- Frontend → backend through `lib/api.ts` (the only place `fetch("/api/...")` lives). Uses
  `credentials: "include"`; on Azure SWA the pages and `/api` share one origin so the admin session
  cookie flows automatically.
- Admin auth: cookie holding a signed JWT (`jose`), set by the login/setup functions. `isAdmin(request)`
  guards every admin endpoint. Password = bcrypt; 2FA = TOTP (`otplib` v12).

## Conventions
- Money is integer minor units (pence/cents) everywhere. Booking money fields are **snapshotted** at
  creation — never recompute from the live service.
- Times are stored as UTC; convert with `lib/time` / `api/src/lib/time` against the business timezone.
  Endpoints that return times also return `timezone` so the client can format correctly.
- SQLite-style enums are plain strings validated via `constants.ts` (both sides have a copy).
- Static export can't do dynamic route segments, so lookups use query params:
  `/booking?ref=`, `/admin/bookings/detail?id=`. Any component using `useSearchParams` must sit inside
  a `<Suspense>` boundary (see the small server `page.tsx` wrappers).
- Admin pages fetch on mount and pass a `reload`/`onChanged` callback to mutation components — there's
  no server round-trip to revalidate.

## Commands
- Frontend: `npm run build` (outputs static site to `out/`; also typechecks + lints)
- Backend: `cd api && npm run build` (tsc → `api/dist`)

## Deploy
See `AZURE_DEPLOY.md`. Build config for Azure Static Web Apps: App `/`, Api `api`, Output `out`.
Backend env (Azure app settings): `AZURE_STORAGE_CONNECTION_STRING`, `AUTH_SECRET`, `SITE_URL`,
optional `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`.

## Gotchas
- Tailwind v4 tree-shakes unused `@theme` tokens — custom CSS references concrete next/font vars
  (`--font-parisienne` etc.) directly, not theme aliases.
- Pinned for stability: `otplib@12` (v13 dropped the `authenticator` API), `@azure/data-tables@13`.
- Node 24 runs `.ts` directly; npm 11 has a shared-cache permission quirk in this sandbox (use a
  project-local `npm_config_cache`).
