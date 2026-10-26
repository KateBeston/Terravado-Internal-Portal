# Terravado — Internal Portal

The backend source of truth plus the internal management surface. Built backend-first:
a swappable data layer, the ported + verified modelling engine and assurance framework, and
a thin management surface for clients, contacts and properties. Client-facing surfaces come
later and read from the same backend.

## Stack
Next.js 14 (app router) · TypeScript · React 18 · Supabase (Auth + Postgres + RLS, via
`@supabase/ssr`) · Vercel (`syd1`).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

**Local dev mode (default):** with no Supabase keys set, the app runs in-memory (seeded, resets
on restart) and auth is bypassed, so you can build and work on the portal immediately.

**Connect Supabase (real auth + persistence):**
1. Create a Supabase project (a **separate free account for Terravado** keeps it apart from TGS).
2. Copy `.env.example` → `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
3. Run the schema: paste `supabase/migrations/0001_initial_schema.sql` into the Supabase SQL
   editor (multi-tenant tables + RLS).
4. Enable **Google** under Authentication → Providers, and add the redirect URL
   `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback` for dev) in
   both Supabase and the Google OAuth console.
5. Turn on MFA under Authentication → settings per your policy.

Restart `npm run dev`; the app now requires real sign-in and persists to Supabase.

## Checks

```bash
npm run assure        # typecheck + the engine assurance suite
npm run verify:engine # assurance checks only (20/20)
npm run build         # production build
```

## Architecture (see the project doc "Terravado — target architecture")

```
src/lib/engine      modelling engine (ported, verified)
src/lib/assurance   accuracy & assurance framework (ported)
src/lib/data        repository interface + local + Supabase implementations (swappable)
src/lib/domain      business operations — clients, contacts, properties
src/lib/integrations (Quickli, property data — provider seams, next increments)
src/lib/auth        session + tenant resolution + route guard
src/lib/supabase    browser/server clients + session middleware
src/app             the surfaces — (app) management portal, login, auth routes
supabase/migrations the multi-tenant schema + RLS
```

**Layering:** the UI is downstream of the backend. Business logic lives in the engine and domain
layers (one source of truth); the UI is a thin surface. Persistence is reached only through the
`Repository` interface, so Supabase can be swapped without touching domain or UI code.

## What's in increment one
- New repo scaffold + clean layered structure.
- TGS-style Supabase auth: email + Google OAuth + MFA policy, callback and sign-out, session
  middleware. Runs in local dev mode without Supabase.
- Multi-tenant data layer (repository interface, local + Supabase) and the schema + RLS.
- Engine + assurance ported and verified (20/20 checks).
- Internal management surface: dashboard, clients, contacts, properties (create / list / delete).

## Next increments
- Real tenant/membership resolution on sign-in; password reset + MFA enrolment UI.
- Integration seams: `FinanceProvider` (Quickli), `PropertyDataProvider` (VG / ABS / Geoscape /
  Google) with the per-source retention policy.
- Wire the engine modelling views (projection, serviceability, feasibility) onto client properties.
- Admin console (rate blocks, audit review) and the client-facing view.
